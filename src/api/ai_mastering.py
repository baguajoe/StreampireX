# src/api/ai_mastering.py
# =====================================================
# AI MASTERING API ROUTES - StreamPireX
# =====================================================
# Phase 1: DSP mastering chain (pedalboard) with genre presets
# Phase 2: Adaptive reference-based mastering (Matchering)
#          Analyzes a reference track's spectral profile, RMS,
#          stereo width, and peak amplitude, then intelligently
#          transforms the creator's audio to match that target.
# Hybrid:  Matchering first (match sonic character) → then DSP
#          polish (noise gate, surgical EQ, limiting) for best results.
#
# Install: pip install matchering --break-system-packages
# Register: app.register_blueprint(ai_mastering_bp)
# =====================================================

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import tempfile
import traceback
import requests
import numpy as np
import shutil

# Audio processing
import librosa
import soundfile as sf
from pedalboard import (
    Pedalboard, NoiseGate, Compressor, Limiter, Gain,
    HighpassFilter, LowpassFilter, HighShelfFilter, LowShelfFilter,
    PeakFilter
)

# Phase 2: Matchering — adaptive reference-based mastering
try:
    import matchering as mg
    MATCHERING_AVAILABLE = True
    print("✅ Matchering loaded — Phase 2 AI mastering enabled")
except ImportError:
    MATCHERING_AVAILABLE = False
    print("⚠️ Matchering not installed — Phase 2 disabled. Run: pip install matchering")

# Internal imports
from src.api.models import db, Audio
from src.api.cloudinary_setup import uploadFile

ai_mastering_bp = Blueprint('ai_mastering', __name__)

# =====================================================
# REFERENCE TRACKS SYSTEM (Phase 2)
# =====================================================
# Curated reference tracks that define the "target sound"
# for each genre. Matchering analyzes these and adapts the
# creator's track to match their sonic profile.
#
# HOW IT WORKS:
# 1. Creator selects a genre/style reference
# 2. Matchering analyzes the reference track's:
#    - Frequency response (EQ curve)
#    - RMS level (perceived loudness)
#    - Peak amplitude (dynamic range)
#    - Stereo width (spatial character)
# 3. Matchering transforms the creator's track to match
# 4. Optional: DSP polish chain applied on top
#
# REFERENCE TRACKS LOCATION:
# Store reference WAV files in: static/references/
# These should be professionally mastered tracks that
# represent the ideal sound for each genre.
# =====================================================

REFERENCE_TRACKS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 
    '..', 'static', 'references'
)

# Reference profiles — each maps to a .wav file in the references directory
# When you don't have the actual files yet, the system falls back to DSP-only mode
REFERENCE_PROFILES = {
    "hip_hop": {
        "name": "Hip-Hop / Trap",
        "description": "Heavy 808s, punchy kicks, crisp hi-hats. Matched to modern trap production standards.",
        "icon": "🔥",
        "filename": "ref_hip_hop.wav",
        "fallback_preset": "club_banger",
    },
    "pop": {
        "name": "Pop / Top 40",
        "description": "Bright, polished, radio-friendly. Balanced across all frequencies with controlled dynamics.",
        "icon": "✨",
        "filename": "ref_pop.wav",
        "fallback_preset": "radio_ready",
    },
    "rnb_soul": {
        "name": "R&B / Soul",
        "description": "Warm low-end, smooth mids, silky highs. Rich and full without harshness.",
        "icon": "💜",
        "filename": "ref_rnb.wav",
        "fallback_preset": "warm",
    },
    "edm": {
        "name": "EDM / Electronic",
        "description": "Maximum loudness, tight low-end, wide stereo field. Festival-ready.",
        "icon": "⚡",
        "filename": "ref_edm.wav",
        "fallback_preset": "club_banger",
    },
    "rock": {
        "name": "Rock / Alternative",
        "description": "Driving guitars, punchy drums, raw energy. Classic rock loudness with modern clarity.",
        "icon": "🎸",
        "filename": "ref_rock.wav",
        "fallback_preset": "radio_ready",
    },
    "acoustic": {
        "name": "Acoustic / Folk",
        "description": "Natural dynamics, warm body, airy presence. Transparent mastering that preserves intimacy.",
        "icon": "🪕",
        "filename": "ref_acoustic.wav",
        "fallback_preset": "crystal_clear",
    },
    "lofi": {
        "name": "Lo-Fi / Chill",
        "description": "Vintage warmth, gentle saturation, rolled-off highs. That cozy lo-fi aesthetic.",
        "icon": "🌙",
        "filename": "ref_lofi.wav",
        "fallback_preset": "lo_fi",
    },
    "podcast": {
        "name": "Podcast / Voice",
        "description": "Clear speech, consistent levels, broadcast loudness. Optimized for spoken word.",
        "icon": "🎙️",
        "filename": "ref_podcast.wav",
        "fallback_preset": "podcast_pro",
    },
    "jazz": {
        "name": "Jazz / Classical",
        "description": "Wide dynamic range, natural tone, spacious stereo image. Minimal processing, maximum fidelity.",
        "icon": "🎷",
        "filename": "ref_jazz.wav",
        "fallback_preset": "crystal_clear",
    },
    "latin": {
        "name": "Latin / Reggaeton",
        "description": "Powerful low-end, rhythmic punch, bright and present vocals. Dancefloor energy.",
        "icon": "💃",
        "filename": "ref_latin.wav",
        "fallback_preset": "club_banger",
    },
}


def get_reference_path(profile_key):
    """Get the full path to a reference track file."""
    if profile_key not in REFERENCE_PROFILES:
        return None
    filename = REFERENCE_PROFILES[profile_key]["filename"]
    path = os.path.join(REFERENCE_TRACKS_DIR, filename)
    if os.path.exists(path):
        return path
    return None


def is_reference_available(profile_key):
    """Check if a reference track file exists for this profile."""
    return get_reference_path(profile_key) is not None

# =====================================================
# MASTERING PRESETS
# =====================================================
# Each preset defines a complete mastering signal chain.
# Parameters are tuned for typical indie creator audio.

MASTERING_PRESETS = {
    "radio_ready": {
        "name": "Radio Ready",
        "description": "Loud, punchy, and broadcast-ready. Ideal for singles and radio submissions.",
        "icon": "📻",
        "chain": {
            "highpass_freq": 30.0,           # Cut sub-bass rumble
            "noise_gate_threshold": -60.0,    # Light noise gate
            "noise_gate_release": 100.0,      # ms
            "compressor_threshold": -18.0,    # Moderate compression
            "compressor_ratio": 3.5,
            "compressor_attack": 10.0,        # ms
            "compressor_release": 100.0,      # ms
            "eq_low_freq": 80.0,
            "eq_low_gain": 1.5,               # Slight bass boost (dB)
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 2.0,               # Presence boost (dB)
            "eq_mid_q": 1.0,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.5,              # Air/brightness (dB)
            "limiter_threshold": -1.0,        # Hard limit near 0dB
            "limiter_release": 50.0,          # ms
            "output_gain": 1.0,               # dB
        }
    },
    "warm": {
        "name": "Warm & Analog",
        "description": "Smooth, warm character with rich low-end. Great for R&B, soul, and acoustic.",
        "icon": "🔥",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -65.0,
            "noise_gate_release": 150.0,
            "compressor_threshold": -15.0,    # Gentler compression
            "compressor_ratio": 2.5,
            "compressor_attack": 20.0,        # Slower attack preserves transients
            "compressor_release": 150.0,
            "eq_low_freq": 120.0,
            "eq_low_gain": 3.0,               # Warm bass boost
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": -1.0,              # Slight mid scoop for warmth
            "eq_mid_q": 0.8,
            "eq_high_freq": 8000.0,
            "eq_high_gain": -0.5,             # Slight high roll-off
            "limiter_threshold": -2.0,
            "limiter_release": 80.0,
            "output_gain": 0.5,
        }
    },
    "crystal_clear": {
        "name": "Crystal Clear",
        "description": "Clean, detailed, and transparent. Perfect for podcasts, acoustic, and vocal tracks.",
        "icon": "💎",
        "chain": {
            "highpass_freq": 40.0,
            "noise_gate_threshold": -55.0,    # Tighter noise gate
            "noise_gate_release": 80.0,
            "compressor_threshold": -20.0,
            "compressor_ratio": 2.0,          # Light compression
            "compressor_attack": 5.0,
            "compressor_release": 80.0,
            "eq_low_freq": 100.0,
            "eq_low_gain": 0.5,
            "eq_mid_freq": 4000.0,
            "eq_mid_gain": 2.5,               # Clarity boost
            "eq_mid_q": 1.2,
            "eq_high_freq": 12000.0,
            "eq_high_gain": 3.0,              # Bright, airy top end
            "limiter_threshold": -2.5,
            "limiter_release": 60.0,
            "output_gain": 0.0,
        }
    },
    "club_banger": {
        "name": "Club Banger",
        "description": "Maximum impact with heavy bass and loud, aggressive mastering. For hip-hop, EDM, and trap.",
        "icon": "🔊",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -14.0,    # Aggressive compression
            "compressor_ratio": 5.0,
            "compressor_attack": 5.0,         # Fast attack
            "compressor_release": 60.0,
            "eq_low_freq": 60.0,
            "eq_low_gain": 4.0,               # Heavy bass boost
            "eq_mid_freq": 2000.0,
            "eq_mid_gain": 1.0,
            "eq_mid_q": 0.7,
            "eq_high_freq": 8000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -0.5,        # Slammed to ceiling
            "limiter_release": 30.0,          # Fast release
            "output_gain": 2.0,               # Extra loud
        }
    },
    "lo_fi": {
        "name": "Lo-Fi Chill",
        "description": "Relaxed, vintage vibe with gentle warmth. Ideal for lo-fi beats, chill-hop, and ambient.",
        "icon": "🌙",
        "chain": {
            "highpass_freq": 60.0,            # More bass roll-off
            "noise_gate_threshold": -70.0,    # Very light gate
            "noise_gate_release": 200.0,
            "compressor_threshold": -12.0,
            "compressor_ratio": 2.0,
            "compressor_attack": 30.0,        # Very slow attack
            "compressor_release": 200.0,      # Slow release for pumping
            "eq_low_freq": 200.0,
            "eq_low_gain": 2.0,               # Mid-bass warmth
            "eq_mid_freq": 3500.0,
            "eq_mid_gain": -2.0,              # Reduce harshness
            "eq_mid_q": 0.6,
            "eq_high_freq": 6000.0,
            "eq_high_gain": -3.0,             # Roll off highs for vintage feel
            "limiter_threshold": -3.0,
            "limiter_release": 100.0,
            "output_gain": 0.0,
        }
    },
    "podcast_pro": {
        "name": "Podcast Pro",
        "description": "Optimized for spoken word — clear vocals, reduced noise, broadcast loudness standards.",
        "icon": "🎙️",
        "chain": {
            "highpass_freq": 80.0,            # Cut rumble below voice range
            "noise_gate_threshold": -45.0,    # Aggressive gate for clean silence
            "noise_gate_release": 60.0,
            "compressor_threshold": -22.0,
            "compressor_ratio": 4.0,          # Heavy compression for consistent levels
            "compressor_attack": 3.0,
            "compressor_release": 60.0,
            "eq_low_freq": 150.0,
            "eq_low_gain": -1.0,              # Reduce muddiness
            "eq_mid_freq": 3500.0,
            "eq_mid_gain": 3.0,               # Voice presence boost
            "eq_mid_q": 1.5,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.0,              # Slight air
            "limiter_threshold": -1.5,
            "limiter_release": 50.0,
            "output_gain": 1.0,
        }
    }
}


# =====================================================
# AUDIO PROCESSING ENGINE
# =====================================================

def build_mastering_chain(preset_key):
    """
    Build a pedalboard mastering chain from a preset configuration.
    Returns a Pedalboard instance ready to process audio.
    """
    if preset_key not in MASTERING_PRESETS:
        raise ValueError(f"Unknown preset: {preset_key}")
    
    config = MASTERING_PRESETS[preset_key]["chain"]
    
    board = Pedalboard([
        # Stage 1: Clean up — remove sub-bass rumble
        HighpassFilter(cutoff_frequency_hz=config["highpass_freq"]),
        
        # Stage 2: Noise gate — clean up silence between phrases
        NoiseGate(
            threshold_db=config["noise_gate_threshold"],
            release_ms=config["noise_gate_release"]
        ),
        
        # Stage 3: Compression — control dynamics
        Compressor(
            threshold_db=config["compressor_threshold"],
            ratio=config["compressor_ratio"],
            attack_ms=config["compressor_attack"],
            release_ms=config["compressor_release"]
        ),
        
        # Stage 4: EQ — shape the tone
        # Low shelf
        LowShelfFilter(
            cutoff_frequency_hz=config["eq_low_freq"],
            gain_db=config["eq_low_gain"]
        ),
        # Mid peak
        PeakFilter(
            cutoff_frequency_hz=config["eq_mid_freq"],
            gain_db=config["eq_mid_gain"],
            q=config["eq_mid_q"]
        ),
        # High shelf
        HighShelfFilter(
            cutoff_frequency_hz=config["eq_high_freq"],
            gain_db=config["eq_high_gain"]
        ),
        
        # Stage 5: Limiter — prevent clipping and maximize loudness
        Limiter(
            threshold_db=config["limiter_threshold"],
            release_ms=config["limiter_release"]
        ),
        
        # Stage 6: Output gain
        Gain(gain_db=config["output_gain"]),
    ])
    
    return board


def process_audio_file(input_path, output_path, preset_key):
    """
    Process an audio file through the mastering chain.
    
    Args:
        input_path: Path to the input audio file
        output_path: Path to save the mastered output
        preset_key: Which mastering preset to use
    
    Returns:
        dict with processing stats (duration, peak_before, peak_after, etc.)
    """
    # Load audio with librosa (handles mp3, wav, flac, etc.)
    audio_data, sample_rate = librosa.load(input_path, sr=None, mono=False)
    
    # If mono, reshape to 2D array (1 channel)
    if audio_data.ndim == 1:
        audio_data = audio_data.reshape(1, -1)
    
    # Convert to float32 for pedalboard
    audio_data = audio_data.astype(np.float32)
    
    # Calculate stats before processing
    peak_before = float(np.max(np.abs(audio_data)))
    rms_before = float(np.sqrt(np.mean(audio_data ** 2)))
    duration = audio_data.shape[1] / sample_rate
    
    # Build and apply the mastering chain
    board = build_mastering_chain(preset_key)
    mastered_audio = board(audio_data, sample_rate)
    
    # Calculate stats after processing
    peak_after = float(np.max(np.abs(mastered_audio)))
    rms_after = float(np.sqrt(np.mean(mastered_audio ** 2)))
    
    # Ensure we don't clip (safety limiter)
    if peak_after > 1.0:
        mastered_audio = mastered_audio / peak_after * 0.99
        peak_after = 0.99
    
    # Transpose for soundfile (expects samples x channels)
    mastered_audio_transposed = mastered_audio.T
    
    # Save as WAV (high quality)
    sf.write(output_path, mastered_audio_transposed, sample_rate, subtype='PCM_24')
    
    return {
        "duration_seconds": round(duration, 2),
        "sample_rate": sample_rate,
        "channels": audio_data.shape[0],
        "peak_before": round(peak_before, 4),
        "peak_after": round(peak_after, 4),
        "rms_before": round(rms_before, 6),
        "rms_after": round(rms_after, 6),
        "loudness_increase_db": round(20 * np.log10(rms_after / max(rms_before, 1e-10)), 2),
    }


def download_audio_from_url(url, output_path):
    """Download an audio file from a URL (e.g., Cloudinary) to a local path."""
    response = requests.get(url, stream=True, timeout=120)
    response.raise_for_status()
    
    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    return output_path


# =====================================================
# PHASE 2: MATCHERING ENGINE
# =====================================================
# Adaptive reference-based mastering. Unlike the DSP presets
# which apply fixed parameters, Matchering ANALYZES a reference
# track and ADAPTS the processing to match its sonic character.
# This is genuinely adaptive — different input tracks get
# different processing even with the same reference.
# =====================================================

def ensure_wav_format(input_path, temp_dir):
    """
    Matchering requires WAV input. Convert if necessary.
    Returns path to a WAV file.
    """
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.wav':
        return input_path
    
    # Convert to WAV using librosa
    wav_path = os.path.join(temp_dir, "converted_input.wav")
    audio_data, sr = librosa.load(input_path, sr=None, mono=False)
    if audio_data.ndim == 1:
        audio_data = audio_data.reshape(1, -1)
    sf.write(wav_path, audio_data.T, sr, subtype='PCM_24')
    return wav_path


def process_with_matchering(input_path, reference_path, output_path):
    """
    Process audio using Matchering's adaptive algorithm.
    
    Matchering analyzes the reference track and matches:
    - Frequency response (full spectral EQ matching)
    - RMS level (perceived loudness matching)
    - Peak amplitude (dynamic range matching)
    - Stereo width (spatial character matching)
    
    Args:
        input_path: Path to the creator's audio (WAV)
        reference_path: Path to the reference track (WAV)
        output_path: Path to save the mastered output
    
    Returns:
        dict with processing stats
    """
    if not MATCHERING_AVAILABLE:
        raise RuntimeError("Matchering is not installed. Run: pip install matchering")
    
    # Get stats before processing
    audio_before, sr = librosa.load(input_path, sr=None, mono=False)
    if audio_before.ndim == 1:
        audio_before = audio_before.reshape(1, -1)
    
    peak_before = float(np.max(np.abs(audio_before)))
    rms_before = float(np.sqrt(np.mean(audio_before ** 2)))
    duration = audio_before.shape[1] / sr
    channels = audio_before.shape[0]
    
    # Run Matchering
    print(f"🧠 Matchering: Analyzing reference track...")
    print(f"🎯 Target: {input_path}")
    print(f"📀 Reference: {reference_path}")
    
    mg.process(
        target=input_path,
        reference=reference_path,
        results=[
            mg.pcm24(output_path),
        ]
    )
    
    # Get stats after processing
    audio_after, sr_after = librosa.load(output_path, sr=None, mono=False)
    if audio_after.ndim == 1:
        audio_after = audio_after.reshape(1, -1)
    
    peak_after = float(np.max(np.abs(audio_after)))
    rms_after = float(np.sqrt(np.mean(audio_after ** 2)))
    
    return {
        "duration_seconds": round(duration, 2),
        "sample_rate": sr,
        "channels": channels,
        "peak_before": round(peak_before, 4),
        "peak_after": round(peak_after, 4),
        "rms_before": round(rms_before, 6),
        "rms_after": round(rms_after, 6),
        "loudness_increase_db": round(20 * np.log10(rms_after / max(rms_before, 1e-10)), 2),
        "method": "matchering",
    }


def process_hybrid(input_path, reference_path, output_path, polish_preset="radio_ready"):
    """
    HYBRID MODE: Matchering first (adapt sonic character) → DSP polish after.
    
    This gives the best results:
    1. Matchering matches the frequency response, loudness, and stereo width
       to the reference track (the "big picture" sound)
    2. DSP chain adds surgical polish — noise gate cleanup, final limiting,
       and any preset-specific tweaks (the "finishing touches")
    
    Args:
        input_path: Creator's audio file
        reference_path: Reference track to match
        output_path: Final output path
        polish_preset: Which DSP preset to use for the polish stage
    """
    temp_dir = os.path.dirname(output_path)
    intermediate_path = os.path.join(temp_dir, "matchered_intermediate.wav")
    
    # Stage 1: Matchering — adapt to reference
    print("🧠 Stage 1/2: Matchering adaptive processing...")
    matchering_stats = process_with_matchering(input_path, reference_path, intermediate_path)
    
    # Stage 2: DSP polish — surgical cleanup and final limiting
    print(f"🎚️ Stage 2/2: DSP polish with '{polish_preset}' preset...")
    dsp_stats = process_audio_file(intermediate_path, output_path, polish_preset)
    
    # Clean up intermediate
    try:
        os.remove(intermediate_path)
    except Exception:
        pass
    
    # Merge stats (use matchering's before + dsp's after for full picture)
    return {
        "duration_seconds": matchering_stats["duration_seconds"],
        "sample_rate": matchering_stats["sample_rate"],
        "channels": matchering_stats["channels"],
        "peak_before": matchering_stats["peak_before"],
        "peak_after": dsp_stats["peak_after"],
        "rms_before": matchering_stats["rms_before"],
        "rms_after": dsp_stats["rms_after"],
        "loudness_increase_db": round(
            20 * np.log10(dsp_stats["rms_after"] / max(matchering_stats["rms_before"], 1e-10)), 2
        ),
        "method": "hybrid",
        "stages": ["matchering_adaptive", f"dsp_polish_{polish_preset}"],
    }


def process_with_custom_reference(input_path, reference_path, output_path, polish_preset=None):
    """
    Smart processing: uses Matchering if available, falls back to DSP.
    Optionally applies DSP polish after Matchering (hybrid mode).
    
    Args:
        input_path: Creator's audio
        reference_path: Reference track (or None for DSP-only)
        output_path: Output path
        polish_preset: Optional DSP preset to apply after Matchering
    
    Returns:
        dict with processing stats
    """
    if reference_path and MATCHERING_AVAILABLE:
        if polish_preset:
            # Hybrid mode: Matchering + DSP polish
            return process_hybrid(input_path, reference_path, output_path, polish_preset)
        else:
            # Pure Matchering mode
            return process_with_matchering(input_path, reference_path, output_path)
    elif polish_preset:
        # DSP-only mode (Phase 1 fallback)
        return process_audio_file(input_path, output_path, polish_preset)
    else:
        # Default DSP
        return process_audio_file(input_path, output_path, "radio_ready")


# =====================================================
# API ROUTES
# =====================================================

@ai_mastering_bp.route('/api/ai/mastering/presets', methods=['GET'])
def get_mastering_presets():
    """
    Get all available mastering presets.
    Public endpoint — no auth required.
    """
    presets = []
    for key, preset in MASTERING_PRESETS.items():
        presets.append({
            "id": key,
            "name": preset["name"],
            "description": preset["description"],
            "icon": preset["icon"],
        })
    
    return jsonify({"presets": presets}), 200


@ai_mastering_bp.route('/api/ai/mastering/process', methods=['POST'])
@jwt_required()
def master_track():
    """
    Master an audio track using AI-powered processing.
    
    Expects JSON body:
    {
        "audio_id": 123,          // ID of the Audio record to master
        "preset": "radio_ready"   // Mastering preset key
    }
    
    Or file upload:
    - file: audio file (mp3, wav, flac)
    - preset: mastering preset key
    
    Returns the mastered audio URL and processing stats.
    """
    user_id = get_jwt_identity()
    
    try:
        # Determine if this is a file upload or existing track
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Direct file upload mastering
            file = request.files.get('file')
            preset_key = request.form.get('preset', 'radio_ready')
            audio_id = request.form.get('audio_id')
            
            if not file:
                return jsonify({"error": "No audio file provided"}), 400
            
            # Save uploaded file to temp
            temp_dir = tempfile.mkdtemp()
            input_ext = os.path.splitext(file.filename)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            file.save(input_path)
            
        else:
            # JSON request — master an existing track
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            audio_id = data.get('audio_id')
            preset_key = data.get('preset', 'radio_ready')
            
            if not audio_id:
                return jsonify({"error": "audio_id is required"}), 400
            
            # Fetch the audio record
            audio = Audio.query.get(audio_id)
            if not audio:
                return jsonify({"error": "Track not found"}), 404
            
            if audio.user_id != user_id:
                return jsonify({"error": "Unauthorized — you can only master your own tracks"}), 403
            
            # Download the audio file from Cloudinary
            if not audio.file_url:
                return jsonify({"error": "No audio file URL found for this track"}), 400
            
            temp_dir = tempfile.mkdtemp()
            # Determine extension from URL
            url_path = audio.file_url.split('?')[0]
            input_ext = os.path.splitext(url_path)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            
            # Update status to processing
            audio.processing_status = 'processing'
            db.session.commit()
            
            print(f"🎚️ Downloading audio from: {audio.file_url}")
            download_audio_from_url(audio.file_url, input_path)
        
        # Validate preset
        if preset_key not in MASTERING_PRESETS:
            return jsonify({
                "error": f"Unknown preset: {preset_key}",
                "available_presets": list(MASTERING_PRESETS.keys())
            }), 400
        
        # Process the audio
        output_path = os.path.join(temp_dir, "mastered_output.wav")
        
        print(f"🎚️ Processing with preset: {preset_key}")
        stats = process_audio_file(input_path, output_path, preset_key)
        print(f"✅ Mastering complete! Stats: {stats}")
        
        # Upload mastered file to Cloudinary
        mastered_filename = f"mastered_{preset_key}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)
        
        print(f"☁️ Uploaded mastered file: {mastered_url}")
        
        # Update the Audio record if we have one
        if audio_id:
            audio = Audio.query.get(audio_id)
            if audio:
                audio.processed_file_url = mastered_url
                audio.processing_status = 'mastered'
                audio.last_processed_at = datetime.utcnow()
                db.session.commit()
        
        # Clean up temp files
        try:
            os.remove(input_path)
            os.remove(output_path)
            os.rmdir(temp_dir)
        except Exception:
            pass  # Non-critical cleanup
        
        return jsonify({
            "message": "🎚️ Track mastered successfully!",
            "mastered_url": mastered_url,
            "preset": {
                "id": preset_key,
                "name": MASTERING_PRESETS[preset_key]["name"],
            },
            "stats": stats,
            "audio_id": audio_id
        }), 200
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"❌ Mastering error: {str(e)}")
        traceback.print_exc()
        
        # Reset processing status on error
        if audio_id:
            try:
                audio = Audio.query.get(audio_id)
                if audio:
                    audio.processing_status = 'error'
                    db.session.commit()
            except Exception:
                pass
        
        return jsonify({"error": f"Mastering failed: {str(e)}"}), 500


@ai_mastering_bp.route('/api/ai/mastering/status/<int:audio_id>', methods=['GET'])
@jwt_required()
def get_mastering_status(audio_id):
    """
    Check the mastering status of a track.
    """
    user_id = get_jwt_identity()
    audio = Audio.query.get(audio_id)
    
    if not audio:
        return jsonify({"error": "Track not found"}), 404
    
    if audio.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify({
        "audio_id": audio.id,
        "title": audio.title,
        "status": audio.processing_status or 'original',
        "original_url": audio.file_url,
        "mastered_url": audio.processed_file_url,
        "last_processed_at": audio.last_processed_at.isoformat() if audio.last_processed_at else None
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/tracks', methods=['GET'])
@jwt_required()
def get_user_tracks_for_mastering():
    """
    Get all of the current user's audio tracks, showing mastering status for each.
    """
    user_id = get_jwt_identity()
    
    tracks = Audio.query.filter_by(user_id=user_id).order_by(Audio.uploaded_at.desc()).all()
    
    return jsonify({
        "tracks": [{
            "id": track.id,
            "title": track.title,
            "file_url": track.file_url,
            "mastered_url": track.processed_file_url,
            "status": track.processing_status or 'original',
            "duration": track.duration,
            "genre": track.genre,
            "uploaded_at": track.uploaded_at.isoformat() if track.uploaded_at else None,
            "last_mastered_at": track.last_processed_at.isoformat() if track.last_processed_at else None,
        } for track in tracks]
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/compare/<int:audio_id>', methods=['GET'])
@jwt_required()
def get_comparison_urls(audio_id):
    """
    Get both original and mastered URLs for A/B comparison.
    """
    user_id = get_jwt_identity()
    audio = Audio.query.get(audio_id)
    
    if not audio:
        return jsonify({"error": "Track not found"}), 404
    
    if audio.user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify({
        "audio_id": audio.id,
        "title": audio.title,
        "original_url": audio.file_url,
        "mastered_url": audio.processed_file_url,
        "has_mastered": audio.processed_file_url is not None,
        "preset_used": audio.processing_status if audio.processing_status not in ['original', 'processing', 'error'] else None
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/upload-and-master', methods=['POST'])
@jwt_required()
def upload_and_master():
    """
    One-stop endpoint: upload a new track AND master it in one request.
    
    Form data:
    - file: audio file
    - title: track title
    - preset: mastering preset key
    - genre: (optional) track genre
    """
    user_id = get_jwt_identity()
    
    try:
        file = request.files.get('file')
        title = request.form.get('title', 'Untitled')
        preset_key = request.form.get('preset', 'radio_ready')
        genre = request.form.get('genre', '')
        
        if not file:
            return jsonify({"error": "No audio file provided"}), 400
        
        if preset_key not in MASTERING_PRESETS:
            return jsonify({"error": f"Unknown preset: {preset_key}"}), 400
        
        # Step 1: Upload original to Cloudinary
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        original_url = uploadFile(file, filename)
        
        # Step 2: Save temp file for processing
        file.seek(0)  # Reset file pointer after upload
        temp_dir = tempfile.mkdtemp()
        input_ext = os.path.splitext(filename)[1] or '.wav'
        input_path = os.path.join(temp_dir, f"input{input_ext}")
        file.save(input_path)
        
        # Step 3: Create Audio record
        new_audio = Audio(
            user_id=user_id,
            title=title,
            file_url=original_url,
            genre=genre,
            processing_status='processing',
            uploaded_at=datetime.utcnow()
        )
        db.session.add(new_audio)
        db.session.commit()
        
        # Step 4: Process with mastering chain
        output_path = os.path.join(temp_dir, "mastered_output.wav")
        stats = process_audio_file(input_path, output_path, preset_key)
        
        # Step 5: Upload mastered version
        mastered_filename = f"mastered_{preset_key}_{new_audio.id}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)
        
        # Step 6: Update record
        new_audio.processed_file_url = mastered_url
        new_audio.processing_status = 'mastered'
        new_audio.last_processed_at = datetime.utcnow()
        db.session.commit()
        
        # Cleanup
        try:
            os.remove(input_path)
            os.remove(output_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
        
        return jsonify({
            "message": "🎚️ Track uploaded and mastered!",
            "audio_id": new_audio.id,
            "original_url": original_url,
            "mastered_url": mastered_url,
            "preset": {
                "id": preset_key,
                "name": MASTERING_PRESETS[preset_key]["name"],
            },
            "stats": stats
        }), 201
    
    except Exception as e:
        print(f"❌ Upload & master error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed: {str(e)}"}), 500


# =====================================================
# PHASE 2 API ROUTES: REFERENCE-BASED MASTERING
# =====================================================

@ai_mastering_bp.route('/api/ai/mastering/capabilities', methods=['GET'])
def get_mastering_capabilities():
    """
    Returns what mastering capabilities are currently available.
    Useful for the frontend to show/hide features.
    """
    # Check which reference tracks are actually present
    available_references = {}
    for key, profile in REFERENCE_PROFILES.items():
        available_references[key] = {
            "name": profile["name"],
            "has_reference_file": is_reference_available(key),
            "fallback_preset": profile["fallback_preset"],
        }
    
    return jsonify({
        "phase_1_dsp": True,  # Always available
        "phase_2_matchering": MATCHERING_AVAILABLE,
        "hybrid_mode": MATCHERING_AVAILABLE,
        "total_presets": len(MASTERING_PRESETS),
        "total_references": len(REFERENCE_PROFILES),
        "references_with_files": sum(1 for k in REFERENCE_PROFILES if is_reference_available(k)),
        "reference_profiles": available_references,
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/references', methods=['GET'])
def get_reference_profiles():
    """
    Get all available reference profiles for adaptive mastering.
    Shows which ones have actual reference files vs fallback-only.
    """
    profiles = []
    for key, profile in REFERENCE_PROFILES.items():
        has_file = is_reference_available(key)
        profiles.append({
            "id": key,
            "name": profile["name"],
            "description": profile["description"],
            "icon": profile["icon"],
            "available": has_file or True,  # Always available (fallback to DSP)
            "method": "adaptive" if has_file and MATCHERING_AVAILABLE else "dsp_preset",
            "fallback_preset": profile["fallback_preset"],
        })
    
    return jsonify({
        "references": profiles,
        "matchering_available": MATCHERING_AVAILABLE,
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/reference-master', methods=['POST'])
@jwt_required()
def reference_master_track():
    """
    Master a track using a reference profile (Phase 2).
    
    Expects JSON:
    {
        "audio_id": 123,
        "reference": "hip_hop",          // Reference profile key
        "mode": "hybrid",                // "adaptive", "hybrid", or "dsp_only"
        "polish_preset": "club_banger"   // Optional: DSP preset for hybrid polish
    }
    
    Processing modes:
    - "adaptive": Pure Matchering — matches reference track's sonic profile
    - "hybrid": Matchering first, then DSP polish (best quality)
    - "dsp_only": Falls back to DSP preset associated with the reference genre
    """
    user_id = get_jwt_identity()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        audio_id = data.get('audio_id')
        reference_key = data.get('reference', 'pop')
        mode = data.get('mode', 'hybrid')
        polish_preset = data.get('polish_preset')
        
        if not audio_id:
            return jsonify({"error": "audio_id is required"}), 400
        
        if reference_key not in REFERENCE_PROFILES:
            return jsonify({
                "error": f"Unknown reference: {reference_key}",
                "available_references": list(REFERENCE_PROFILES.keys())
            }), 400
        
        # Fetch audio record
        audio = Audio.query.get(audio_id)
        if not audio:
            return jsonify({"error": "Track not found"}), 404
        if audio.user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        if not audio.file_url:
            return jsonify({"error": "No audio file URL"}), 400
        
        # Update status
        audio.processing_status = 'processing'
        db.session.commit()
        
        # Setup temp directory
        temp_dir = tempfile.mkdtemp()
        
        # Download creator's audio
        url_path = audio.file_url.split('?')[0]
        input_ext = os.path.splitext(url_path)[1] or '.wav'
        input_path = os.path.join(temp_dir, f"input{input_ext}")
        
        print(f"🎚️ Downloading audio from: {audio.file_url}")
        download_audio_from_url(audio.file_url, input_path)
        
        # Ensure WAV format for Matchering
        wav_input_path = ensure_wav_format(input_path, temp_dir)
        
        output_path = os.path.join(temp_dir, "mastered_output.wav")
        reference_profile = REFERENCE_PROFILES[reference_key]
        reference_path = get_reference_path(reference_key)
        
        # Determine the DSP preset to use
        if not polish_preset:
            polish_preset = reference_profile["fallback_preset"]
        
        # Choose processing path based on mode and availability
        actual_method = mode
        
        if mode == "adaptive" and reference_path and MATCHERING_AVAILABLE:
            # Pure Matchering
            print(f"🧠 Mode: Adaptive (pure Matchering) → Reference: {reference_key}")
            stats = process_with_matchering(wav_input_path, reference_path, output_path)
            
        elif mode == "hybrid" and reference_path and MATCHERING_AVAILABLE:
            # Hybrid: Matchering + DSP polish
            print(f"🧠 Mode: Hybrid (Matchering + DSP) → Reference: {reference_key}, Polish: {polish_preset}")
            stats = process_hybrid(wav_input_path, reference_path, output_path, polish_preset)
            
        else:
            # Fallback: DSP-only with the genre's associated preset
            print(f"🎚️ Mode: DSP Fallback → Preset: {polish_preset}")
            stats = process_audio_file(wav_input_path, output_path, polish_preset)
            actual_method = "dsp_fallback"
        
        # Upload mastered file to Cloudinary
        mastered_filename = f"mastered_{reference_key}_{mode}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)
        
        print(f"☁️ Uploaded: {mastered_url}")
        
        # Update Audio record
        audio.processed_file_url = mastered_url
        audio.processing_status = 'mastered'
        audio.last_processed_at = datetime.utcnow()
        db.session.commit()
        
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
        
        return jsonify({
            "message": f"🧠 Track mastered with {reference_profile['name']} reference!",
            "mastered_url": mastered_url,
            "reference": {
                "id": reference_key,
                "name": reference_profile["name"],
                "icon": reference_profile["icon"],
            },
            "mode": actual_method,
            "stats": stats,
            "audio_id": audio_id,
        }), 200
    
    except Exception as e:
        print(f"❌ Reference mastering error: {str(e)}")
        traceback.print_exc()
        
        if audio_id:
            try:
                audio = Audio.query.get(audio_id)
                if audio:
                    audio.processing_status = 'error'
                    db.session.commit()
            except Exception:
                pass
        
        return jsonify({"error": f"Mastering failed: {str(e)}"}), 500


@ai_mastering_bp.route('/api/ai/mastering/custom-reference', methods=['POST'])
@jwt_required()
def custom_reference_master():
    """
    Master a track using a CUSTOM reference track uploaded by the creator.
    
    "Make my track sound like THIS song."
    
    Form data:
    - audio_id: ID of the track to master (OR file: the track to master)
    - reference: the reference audio file to match
    - mode: "adaptive" or "hybrid"
    - polish_preset: optional DSP preset for hybrid mode
    """
    user_id = get_jwt_identity()
    
    if not MATCHERING_AVAILABLE:
        return jsonify({
            "error": "Custom reference mastering requires Matchering. Please install it.",
            "install": "pip install matchering"
        }), 503
    
    try:
        reference_file = request.files.get('reference')
        if not reference_file:
            return jsonify({"error": "Reference audio file is required"}), 400
        
        audio_id = request.form.get('audio_id')
        track_file = request.files.get('file')
        mode = request.form.get('mode', 'hybrid')
        polish_preset = request.form.get('polish_preset', 'radio_ready')
        
        if not audio_id and not track_file:
            return jsonify({"error": "Provide either audio_id or upload a track file"}), 400
        
        temp_dir = tempfile.mkdtemp()
        
        # Save reference file
        ref_ext = os.path.splitext(reference_file.filename)[1] or '.wav'
        ref_path = os.path.join(temp_dir, f"reference{ref_ext}")
        reference_file.save(ref_path)
        
        # Ensure reference is WAV
        ref_wav_path = ensure_wav_format(ref_path, temp_dir)
        
        # Get the input track
        if track_file:
            # Direct upload
            input_ext = os.path.splitext(track_file.filename)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            track_file.save(input_path)
        else:
            # From existing audio record
            audio = Audio.query.get(audio_id)
            if not audio:
                return jsonify({"error": "Track not found"}), 404
            if audio.user_id != user_id:
                return jsonify({"error": "Unauthorized"}), 403
            
            audio.processing_status = 'processing'
            db.session.commit()
            
            url_path = audio.file_url.split('?')[0]
            input_ext = os.path.splitext(url_path)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            download_audio_from_url(audio.file_url, input_path)
        
        # Ensure input is WAV
        wav_input_path = ensure_wav_format(input_path, temp_dir)
        output_path = os.path.join(temp_dir, "mastered_output.wav")
        
        # Process
        if mode == "hybrid" and polish_preset:
            stats = process_hybrid(wav_input_path, ref_wav_path, output_path, polish_preset)
        else:
            stats = process_with_matchering(wav_input_path, ref_wav_path, output_path)
        
        # Upload mastered file
        mastered_filename = f"mastered_custom_ref_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)
        
        # Update DB if we have an audio_id
        if audio_id:
            audio = Audio.query.get(audio_id)
            if audio:
                audio.processed_file_url = mastered_url
                audio.processing_status = 'mastered'
                audio.last_processed_at = datetime.utcnow()
                db.session.commit()
        
        # Cleanup
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
        
        return jsonify({
            "message": "🧠 Track mastered with your custom reference!",
            "mastered_url": mastered_url,
            "mode": mode,
            "stats": stats,
            "audio_id": audio_id,
        }), 200
    
    except Exception as e:
        print(f"❌ Custom reference mastering error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Mastering failed: {str(e)}"}), 500


@ai_mastering_bp.route('/api/ai/mastering/upload-reference', methods=['POST'])
@jwt_required()
def upload_reference_track():
    """
    Admin/creator endpoint to upload a reference track for a genre profile.
    This populates the references directory so Matchering can use it.
    
    Form data:
    - file: WAV audio file
    - profile: reference profile key (e.g., "hip_hop")
    """
    user_id = get_jwt_identity()
    
    try:
        file = request.files.get('file')
        profile_key = request.form.get('profile')
        
        if not file:
            return jsonify({"error": "No file provided"}), 400
        if not profile_key or profile_key not in REFERENCE_PROFILES:
            return jsonify({"error": "Invalid profile key"}), 400
        
        # Create references directory
        os.makedirs(REFERENCE_TRACKS_DIR, exist_ok=True)
        
        # Save the reference file
        filename = REFERENCE_PROFILES[profile_key]["filename"]
        filepath = os.path.join(REFERENCE_TRACKS_DIR, filename)
        
        # If not WAV, convert
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)
        
        ext = os.path.splitext(file.filename)[1].lower()
        if ext != '.wav':
            wav_path = ensure_wav_format(temp_path, temp_dir)
            shutil.copy2(wav_path, filepath)
        else:
            shutil.copy2(temp_path, filepath)
        
        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return jsonify({
            "message": f"✅ Reference track uploaded for {REFERENCE_PROFILES[profile_key]['name']}",
            "profile": profile_key,
            "filename": filename,
            "path": filepath,
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Phase 3 (Neural Network) can be added later.
# See ai_mastering_nn.py for the trained model integration.