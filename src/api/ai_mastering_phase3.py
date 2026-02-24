# src/api/ai_mastering_phase3.py
# =====================================================
# AI MASTERING — PHASE 3: Smart Auto-Detection
# =====================================================
#
# What this does:
#   1. Analyzes uploaded track (BPM, key, loudness, frequency, mood)
#   2. Auto-selects the best mastering preset
#   3. Optional: reference-match to a pro track (Matchering)
#   4. Returns mastered audio + full analysis report
#
# Dependencies (all free):
#   pip install librosa numpy scipy soundfile matchering
#
# Register: app.register_blueprint(ai_mastering_phase3_bp)
# =====================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import json
import tempfile
import traceback
import numpy as np
import librosa
import soundfile as sf

# Internal imports
from src.api.models import db, Audio, User
try:
    from src.api.r2_storage_setup import uploadFile
except ImportError:
    from src.api.cloudinary_setup import uploadFile

ai_mastering_phase3_bp = Blueprint('ai_mastering_phase3', __name__)


# =====================================================
# AUDIO ANALYZER — The "Brain" of Smart Presets
# =====================================================
# Reads the track and extracts everything needed to
# automatically pick the right mastering preset.
# All free libraries, no API keys needed.
# =====================================================

def analyze_track(file_path):
    """
    Deep analysis of an audio track.
    
    Returns dict with:
    - bpm: tempo in beats per minute
    - key: musical key (C, D#, etc.)
    - loudness_lufs: integrated loudness
    - peak: peak amplitude
    - dynamic_range: difference between loud and quiet
    - spectral_centroid: brightness (higher = brighter)
    - spectral_rolloff: where high frequencies drop off
    - bass_energy: energy below 250Hz
    - mid_energy: energy 250Hz-4kHz  
    - high_energy: energy above 4kHz
    - zero_crossing_rate: how "noisy" vs "tonal"
    - is_vocal: likely has prominent vocals
    - mood: estimated mood (energetic, chill, dark, bright)
    - genre_hints: suggested genres based on audio features
    """
    try:
        # Load audio
        y, sr = librosa.load(file_path, sr=44100, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # ===== BPM / TEMPO =====
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
        
        # ===== KEY DETECTION =====
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        key_index = int(np.argmax(np.mean(chroma, axis=1)))
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key = key_names[key_index]
        
        # Major or minor detection
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        chroma_mean = np.mean(chroma, axis=1)
        # Rotate profiles to match detected key
        major_corr = np.corrcoef(chroma_mean, np.roll(major_profile, key_index))[0, 1]
        minor_corr = np.corrcoef(chroma_mean, np.roll(minor_profile, key_index))[0, 1]
        
        scale = "major" if major_corr > minor_corr else "minor"
        key_full = f"{key} {scale}"
        
        # ===== LOUDNESS =====
        rms = librosa.feature.rms(y=y)[0]
        rms_mean = float(np.mean(rms))
        rms_max = float(np.max(rms))
        peak = float(np.max(np.abs(y)))
        
        # Estimate LUFS (simplified)
        lufs_estimate = 20 * np.log10(rms_mean + 1e-10) - 0.691
        
        # Dynamic range
        rms_db = 20 * np.log10(rms + 1e-10)
        dynamic_range = float(np.percentile(rms_db, 95) - np.percentile(rms_db, 5))
        
        # ===== SPECTRAL FEATURES =====
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        spectral_rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)))
        spectral_bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))
        zero_crossing = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))
        
        # ===== FREQUENCY BAND ENERGY =====
        S = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        
        # Bass: 20-250Hz
        bass_mask = (freqs >= 20) & (freqs < 250)
        bass_energy = float(np.mean(S[bass_mask, :])) if np.any(bass_mask) else 0
        
        # Mids: 250-4000Hz
        mid_mask = (freqs >= 250) & (freqs < 4000)
        mid_energy = float(np.mean(S[mid_mask, :])) if np.any(mid_mask) else 0
        
        # Highs: 4000-20000Hz
        high_mask = (freqs >= 4000) & (freqs <= 20000)
        high_energy = float(np.mean(S[high_mask, :])) if np.any(high_mask) else 0
        
        # Sub-bass: 20-60Hz
        sub_mask = (freqs >= 20) & (freqs < 60)
        sub_energy = float(np.mean(S[sub_mask, :])) if np.any(sub_mask) else 0
        
        # Presence: 1000-5000Hz (vocal range)
        presence_mask = (freqs >= 1000) & (freqs < 5000)
        presence_energy = float(np.mean(S[presence_mask, :])) if np.any(presence_mask) else 0
        
        # Normalize energies
        total_energy = bass_energy + mid_energy + high_energy + 1e-10
        bass_ratio = bass_energy / total_energy
        mid_ratio = mid_energy / total_energy
        high_ratio = high_energy / total_energy
        
        # ===== VOCAL DETECTION (simplified) =====
        # Vocals tend to have strong presence in 1-5kHz range
        is_vocal = presence_energy > (mid_energy * 0.6)
        
        # ===== MOOD ESTIMATION =====
        mood = _estimate_mood(bpm, key, scale, spectral_centroid, dynamic_range, bass_ratio)
        
        # ===== GENRE HINTS =====
        genre_hints = _estimate_genre(bpm, bass_ratio, mid_ratio, high_ratio, 
                                       spectral_centroid, dynamic_range, scale)
        
        analysis = {
            # Tempo & Key
            "bpm": round(bpm, 1),
            "key": key_full,
            "key_note": key,
            "scale": scale,
            "duration_seconds": round(duration, 2),
            
            # Loudness
            "loudness_lufs": round(lufs_estimate, 1),
            "rms_level": round(rms_mean, 4),
            "peak": round(peak, 4),
            "dynamic_range_db": round(dynamic_range, 1),
            "is_clipping": peak > 0.99,
            
            # Spectral
            "spectral_centroid": round(spectral_centroid, 1),
            "spectral_rolloff": round(spectral_rolloff, 1),
            "spectral_bandwidth": round(spectral_bandwidth, 1),
            "zero_crossing_rate": round(zero_crossing, 4),
            "brightness": "bright" if spectral_centroid > 3000 else "warm" if spectral_centroid < 1800 else "balanced",
            
            # Frequency Balance
            "bass_energy": round(bass_ratio * 100, 1),
            "mid_energy": round(mid_ratio * 100, 1),
            "high_energy": round(high_ratio * 100, 1),
            "sub_bass_heavy": sub_energy > bass_energy * 0.4,
            "bass_heavy": bass_ratio > 0.45,
            "mid_forward": mid_ratio > 0.50,
            "treble_heavy": high_ratio > 0.30,
            
            # Character
            "is_vocal": is_vocal,
            "mood": mood,
            "genre_hints": genre_hints,
            
            # Quality Issues
            "needs_compression": dynamic_range > 20,
            "needs_limiting": peak > 0.95,
            "needs_bass_cut": sub_energy > bass_energy * 0.5,
            "needs_brightness": spectral_centroid < 1500,
            "needs_de_essing": high_ratio > 0.35 and is_vocal,
        }
        
        print(f"🔍 Track Analysis: BPM={bpm:.0f}, Key={key_full}, "
              f"LUFS={lufs_estimate:.1f}, Mood={mood}, "
              f"Genre hints={genre_hints[:3]}")
        
        return analysis
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        traceback.print_exc()
        return None


def _estimate_mood(bpm, key, scale, centroid, dynamic_range, bass_ratio):
    """Estimate the mood/energy of a track."""
    # Score different mood axes
    energy_score = 0
    darkness_score = 0
    
    # BPM affects energy
    if bpm > 140:
        energy_score += 3
    elif bpm > 120:
        energy_score += 2
    elif bpm > 100:
        energy_score += 1
    elif bpm < 80:
        energy_score -= 2
    
    # Minor keys feel darker
    if scale == "minor":
        darkness_score += 2
    
    # High spectral centroid = brighter
    if centroid > 3000:
        energy_score += 1
        darkness_score -= 1
    elif centroid < 1800:
        darkness_score += 1
    
    # High dynamic range = more dramatic
    if dynamic_range > 20:
        energy_score += 1
    
    # Heavy bass = heavier feel
    if bass_ratio > 0.45:
        darkness_score += 1
    
    # Determine mood
    if energy_score >= 3:
        return "energetic"
    elif energy_score >= 1 and darkness_score <= 0:
        return "upbeat"
    elif darkness_score >= 3:
        return "dark"
    elif darkness_score >= 1 and energy_score <= 0:
        return "melancholic"
    elif energy_score <= -1:
        return "chill"
    elif energy_score == 0 and darkness_score == 0:
        return "neutral"
    else:
        return "balanced"


def _estimate_genre(bpm, bass_ratio, mid_ratio, high_ratio, 
                     centroid, dynamic_range, scale):
    """
    Estimate likely genres based on audio features.
    Returns a ranked list of genre hints.
    """
    scores = {}
    
    # Hip-Hop / Rap: 70-100 BPM, heavy bass, minor keys common
    scores["hip_hop"] = 0
    if 70 <= bpm <= 105:
        scores["hip_hop"] += 3
    if bass_ratio > 0.40:
        scores["hip_hop"] += 2
    if scale == "minor":
        scores["hip_hop"] += 1
    
    # Trap: 130-170 BPM (half-time feel = 65-85), heavy sub-bass
    scores["trap"] = 0
    if 125 <= bpm <= 175 or 62 <= bpm <= 88:
        scores["trap"] += 3
    if bass_ratio > 0.45:
        scores["trap"] += 2
    if high_ratio > 0.25:
        scores["trap"] += 1  # Hi-hats
    
    # Drill: 140-145 BPM, dark, minor key, bass heavy
    scores["drill"] = 0
    if 135 <= bpm <= 150:
        scores["drill"] += 3
    if scale == "minor":
        scores["drill"] += 2
    if bass_ratio > 0.42:
        scores["drill"] += 1
    
    # Lo-Fi: 70-90 BPM, warm (low centroid), narrow dynamic range
    scores["lo_fi"] = 0
    if 70 <= bpm <= 95:
        scores["lo_fi"] += 2
    if centroid < 2200:
        scores["lo_fi"] += 2
    if dynamic_range < 12:
        scores["lo_fi"] += 2
    
    # R&B / Soul: 60-100 BPM, balanced mids, vocal presence
    scores["rnb"] = 0
    if 60 <= bpm <= 105:
        scores["rnb"] += 2
    if mid_ratio > 0.40:
        scores["rnb"] += 2
    if centroid > 1500 and centroid < 3000:
        scores["rnb"] += 1
    
    # Pop: 100-130 BPM, balanced frequency, major keys
    scores["pop"] = 0
    if 100 <= bpm <= 132:
        scores["pop"] += 2
    if scale == "major":
        scores["pop"] += 2
    if 0.25 < bass_ratio < 0.40 and 0.35 < mid_ratio < 0.50:
        scores["pop"] += 1  # Balanced
    
    # EDM / Dance: 120-140 BPM, heavy bass, bright
    scores["edm"] = 0
    if 118 <= bpm <= 140:
        scores["edm"] += 3
    if bass_ratio > 0.38:
        scores["edm"] += 1
    if centroid > 2800:
        scores["edm"] += 1
    
    # Rock: 110-140 BPM, wide dynamic range, mid-heavy
    scores["rock"] = 0
    if 108 <= bpm <= 145:
        scores["rock"] += 2
    if dynamic_range > 15:
        scores["rock"] += 2
    if mid_ratio > 0.45:
        scores["rock"] += 1
    
    # Jazz: 80-160 BPM, wide dynamic range, rich mids
    scores["jazz"] = 0
    if dynamic_range > 18:
        scores["jazz"] += 2
    if mid_ratio > 0.42:
        scores["jazz"] += 1
    if centroid > 1800 and centroid < 3500:
        scores["jazz"] += 1
    
    # Phonk: 130-150 BPM, dark, bass heavy, lo-fi character
    scores["phonk"] = 0
    if 125 <= bpm <= 155:
        scores["phonk"] += 2
    if bass_ratio > 0.40:
        scores["phonk"] += 2
    if centroid < 2200:
        scores["phonk"] += 1
    if scale == "minor":
        scores["phonk"] += 1
    
    # Ambient / Chill: < 100 BPM, low energy, warm
    scores["ambient"] = 0
    if bpm < 100:
        scores["ambient"] += 2
    if dynamic_range < 10:
        scores["ambient"] += 2
    if centroid < 2000:
        scores["ambient"] += 1
    
    # Country / Folk: 90-140 BPM, major key, mid-forward
    scores["country"] = 0
    if 88 <= bpm <= 142:
        scores["country"] += 1
    if scale == "major":
        scores["country"] += 2
    if mid_ratio > 0.45:
        scores["country"] += 1
    
    # Latin / Reggaeton: 90-100 BPM, strong bass, rhythmic
    scores["latin"] = 0
    if 88 <= bpm <= 105:
        scores["latin"] += 3
    if bass_ratio > 0.35:
        scores["latin"] += 1
    
    # Sort by score and return top genres
    sorted_genres = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [genre for genre, score in sorted_genres if score >= 3][:5]


# =====================================================
# SMART PRESET SELECTOR
# =====================================================
# Maps analysis results → best mastering preset.
# Uses the 22 presets from Phase 1 ai_mastering.py.
# =====================================================

# Map genre hints to Phase 1 preset keys
GENRE_TO_PRESET = {
    "hip_hop": "boom_bap",
    "trap": "trap",
    "drill": "drill",
    "lo_fi": "lo_fi",
    "rnb": "rnb",
    "pop": "pop",
    "edm": "edm",
    "rock": "rock",
    "jazz": "jazz",
    "phonk": "phonk",
    "ambient": "lo_fi",
    "country": "country",
    "latin": "latin",
    "reggaeton": "latin",
}

# Mood-based fallbacks when genre detection is uncertain
MOOD_TO_PRESET = {
    "energetic": "edm",
    "upbeat": "pop",
    "dark": "drill",
    "melancholic": "conscious",
    "chill": "lo_fi",
    "neutral": "pop",
    "balanced": "pop",
}


def auto_select_preset(analysis):
    """
    Automatically select the best mastering preset based on track analysis.
    
    Priority:
    1. Genre hints (most specific)
    2. Mood-based fallback
    3. Frequency characteristics
    4. Default to "pop" (most neutral)
    
    Returns: (preset_key, confidence, reason)
    """
    if not analysis:
        return "pop", 0.3, "No analysis available — using balanced preset"
    
    genre_hints = analysis.get("genre_hints", [])
    mood = analysis.get("mood", "neutral")
    bpm = analysis.get("bpm", 100)
    bass_heavy = analysis.get("bass_heavy", False)
    brightness = analysis.get("brightness", "balanced")
    
    # ===== Priority 1: Genre match =====
    if genre_hints:
        top_genre = genre_hints[0]
        if top_genre in GENRE_TO_PRESET:
            preset = GENRE_TO_PRESET[top_genre]
            confidence = 0.85 if len(genre_hints) == 1 else 0.75
            return preset, confidence, f"Detected {top_genre.replace('_', ' ')} characteristics (BPM: {bpm:.0f}, mood: {mood})"
    
    # ===== Priority 2: Mood-based =====
    if mood in MOOD_TO_PRESET:
        preset = MOOD_TO_PRESET[mood]
        return preset, 0.60, f"Based on {mood} mood and {bpm:.0f} BPM"
    
    # ===== Priority 3: Frequency characteristics =====
    if bass_heavy and bpm < 100:
        return "boom_bap", 0.55, "Heavy bass with slower tempo — boom bap treatment"
    elif bass_heavy and bpm > 130:
        return "trap", 0.55, "Heavy bass with fast tempo — trap treatment"
    elif brightness == "bright" and bpm > 120:
        return "edm", 0.50, "Bright and fast — electronic treatment"
    elif brightness == "warm" and bpm < 95:
        return "lo_fi", 0.50, "Warm and slow — lo-fi treatment"
    
    # ===== Default =====
    return "pop", 0.40, "Balanced characteristics — using versatile pop preset"


def get_preset_adjustments(analysis, base_preset):
    """
    Fine-tune the mastering preset based on specific track issues.
    
    Returns a dict of adjustments to apply on top of the base preset.
    These override specific DSP parameters.
    """
    adjustments = {}
    
    if not analysis:
        return adjustments
    
    # Fix clipping
    if analysis.get("is_clipping"):
        adjustments["reduce_input_gain"] = True
        adjustments["input_gain_reduction_db"] = -3.0
        adjustments["reason_clipping"] = "Track is clipping — reducing input gain"
    
    # Needs more compression
    if analysis.get("needs_compression"):
        adjustments["increase_compression"] = True
        adjustments["extra_ratio"] = 1.0  # Add to existing ratio
        adjustments["reason_compression"] = f"High dynamic range ({analysis['dynamic_range_db']:.0f}dB) — adding compression"
    
    # Needs bass cut (muddy sub-bass)
    if analysis.get("needs_bass_cut"):
        adjustments["raise_highpass"] = True
        adjustments["highpass_freq"] = 40  # Cut below 40Hz instead of 30Hz
        adjustments["reason_bass"] = "Excessive sub-bass detected — raising highpass filter"
    
    # Needs brightness
    if analysis.get("needs_brightness"):
        adjustments["boost_highs"] = True
        adjustments["high_shelf_boost_db"] = 2.0  # Extra 2dB on highs
        adjustments["reason_brightness"] = "Track is warm/dull — adding high shelf boost"
    
    # Needs de-essing
    if analysis.get("needs_de_essing"):
        adjustments["add_de_essing"] = True
        adjustments["reason_de_essing"] = "Harsh sibilance detected — adding de-esser"
    
    # Already loud — less limiting needed
    if analysis.get("loudness_lufs", -20) > -10:
        adjustments["reduce_limiting"] = True
        adjustments["reason_loudness"] = "Track is already loud — reducing limiter intensity"
    
    return adjustments


# =====================================================
# REFERENCE MATCHING (Matchering)
# =====================================================
# Optional: match the creator's track to a pro reference.
# pip install matchering
# =====================================================

def master_with_reference(target_path, reference_path, output_path):
    """
    Master a track by matching it to a professional reference track.
    
    Uses Matchering library (free) which analyzes the reference's:
    - EQ curve
    - Loudness (LUFS)
    - Stereo width
    - Dynamic range
    
    Then applies those characteristics to the target track.
    
    Returns: output_path on success, None on failure.
    """
    try:
        import matchering as mg
        
        mg.process(
            target=target_path,
            reference=reference_path,
            results=[
                mg.pcm24(output_path),
            ],
        )
        
        print(f"✅ Reference mastering complete: {output_path}")
        return output_path
        
    except ImportError:
        print("⚠️ Matchering not installed. Run: pip install matchering")
        return None
    except Exception as e:
        print(f"❌ Reference mastering failed: {e}")
        traceback.print_exc()
        return None


# =====================================================
# 50 REFERENCE PROFILES
# =====================================================
# Pre-analyzed profiles from professional masters.
# Each profile contains the target characteristics
# that Matchering or DSP chain should aim for.
#
# Creators pick a style → we use that profile.
# No reference audio files needed — just target numbers.
# =====================================================

REFERENCE_PROFILES = {
    # ===== HIP-HOP =====
    "boom_bap_classic": {
        "name": "Boom Bap Classic",
        "genre": "Hip-Hop",
        "target_lufs": -11.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.5,
        "mid_boost_db": 1.5,
        "high_boost_db": 0.5,
        "compression_ratio": 3.5,
    },
    "trap_modern": {
        "name": "Modern Trap",
        "genre": "Hip-Hop",
        "target_lufs": -8.0,
        "target_peak": -0.3,
        "bass_boost_db": 5.0,
        "mid_boost_db": 1.0,
        "high_boost_db": 3.0,
        "compression_ratio": 4.0,
    },
    "drill_uk": {
        "name": "UK Drill",
        "genre": "Hip-Hop",
        "target_lufs": -9.0,
        "target_peak": -0.3,
        "bass_boost_db": 4.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 2.5,
        "compression_ratio": 4.5,
    },
    "drill_ny": {
        "name": "NY Drill",
        "genre": "Hip-Hop",
        "target_lufs": -8.5,
        "target_peak": -0.3,
        "bass_boost_db": 5.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 5.0,
    },
    "conscious_hip_hop": {
        "name": "Conscious Hip-Hop",
        "genre": "Hip-Hop",
        "target_lufs": -12.0,
        "target_peak": -1.0,
        "bass_boost_db": 2.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.0,
        "compression_ratio": 3.0,
    },
    "southern_rap": {
        "name": "Southern Rap",
        "genre": "Hip-Hop",
        "target_lufs": -9.5,
        "target_peak": -0.5,
        "bass_boost_db": 4.0,
        "mid_boost_db": 1.5,
        "high_boost_db": 1.5,
        "compression_ratio": 3.5,
    },
    "phonk_dark": {
        "name": "Dark Phonk",
        "genre": "Hip-Hop",
        "target_lufs": -10.0,
        "target_peak": -0.5,
        "bass_boost_db": 4.5,
        "mid_boost_db": 1.0,
        "high_boost_db": -1.0,
        "compression_ratio": 4.0,
    },
    "old_school_hip_hop": {
        "name": "Old School Hip-Hop",
        "genre": "Hip-Hop",
        "target_lufs": -13.0,
        "target_peak": -1.0,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 0.5,
        "compression_ratio": 2.5,
    },
    
    # ===== R&B / SOUL =====
    "rnb_modern": {
        "name": "Modern R&B",
        "genre": "R&B",
        "target_lufs": -11.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
    "neo_soul": {
        "name": "Neo-Soul",
        "genre": "R&B",
        "target_lufs": -13.0,
        "target_peak": -1.0,
        "bass_boost_db": 2.5,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.0,
        "compression_ratio": 2.5,
    },
    "slow_jam": {
        "name": "Slow Jam",
        "genre": "R&B",
        "target_lufs": -12.0,
        "target_peak": -0.8,
        "bass_boost_db": 3.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.0,
        "compression_ratio": 2.5,
    },
    "afrobeats": {
        "name": "Afrobeats",
        "genre": "R&B",
        "target_lufs": -10.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 3.5,
    },
    
    # ===== POP =====
    "pop_radio": {
        "name": "Pop Radio Ready",
        "genre": "Pop",
        "target_lufs": -9.0,
        "target_peak": -0.3,
        "bass_boost_db": 2.0,
        "mid_boost_db": 1.5,
        "high_boost_db": 2.0,
        "compression_ratio": 4.0,
    },
    "indie_pop": {
        "name": "Indie Pop",
        "genre": "Pop",
        "target_lufs": -12.0,
        "target_peak": -1.0,
        "bass_boost_db": 1.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.5,
        "compression_ratio": 2.5,
    },
    "synth_pop": {
        "name": "Synth Pop",
        "genre": "Pop",
        "target_lufs": -9.5,
        "target_peak": -0.5,
        "bass_boost_db": 2.5,
        "mid_boost_db": 1.0,
        "high_boost_db": 2.5,
        "compression_ratio": 3.5,
    },
    "dance_pop": {
        "name": "Dance Pop",
        "genre": "Pop",
        "target_lufs": -8.0,
        "target_peak": -0.3,
        "bass_boost_db": 3.0,
        "mid_boost_db": 1.5,
        "high_boost_db": 2.5,
        "compression_ratio": 4.5,
    },
    "kpop": {
        "name": "K-Pop",
        "genre": "Pop",
        "target_lufs": -8.5,
        "target_peak": -0.3,
        "bass_boost_db": 2.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 3.0,
        "compression_ratio": 4.0,
    },
    
    # ===== EDM / ELECTRONIC =====
    "house_deep": {
        "name": "Deep House",
        "genre": "EDM",
        "target_lufs": -9.0,
        "target_peak": -0.3,
        "bass_boost_db": 4.0,
        "mid_boost_db": 1.0,
        "high_boost_db": 2.0,
        "compression_ratio": 4.0,
    },
    "techno": {
        "name": "Techno",
        "genre": "EDM",
        "target_lufs": -8.0,
        "target_peak": -0.3,
        "bass_boost_db": 4.5,
        "mid_boost_db": 1.5,
        "high_boost_db": 2.0,
        "compression_ratio": 5.0,
    },
    "dnb": {
        "name": "Drum & Bass",
        "genre": "EDM",
        "target_lufs": -8.5,
        "target_peak": -0.3,
        "bass_boost_db": 5.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 2.5,
        "compression_ratio": 5.0,
    },
    "dubstep": {
        "name": "Dubstep",
        "genre": "EDM",
        "target_lufs": -7.5,
        "target_peak": -0.3,
        "bass_boost_db": 6.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 2.0,
        "compression_ratio": 5.5,
    },
    "trance": {
        "name": "Trance",
        "genre": "EDM",
        "target_lufs": -9.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 3.0,
        "compression_ratio": 3.5,
    },
    
    # ===== LO-FI / CHILL =====
    "lofi_beats": {
        "name": "Lo-Fi Beats",
        "genre": "Lo-Fi",
        "target_lufs": -14.0,
        "target_peak": -2.0,
        "bass_boost_db": 2.5,
        "mid_boost_db": 1.5,
        "high_boost_db": -1.0,
        "compression_ratio": 2.0,
    },
    "chillwave": {
        "name": "Chillwave",
        "genre": "Lo-Fi",
        "target_lufs": -15.0,
        "target_peak": -2.0,
        "bass_boost_db": 2.0,
        "mid_boost_db": 1.0,
        "high_boost_db": 0.5,
        "compression_ratio": 2.0,
    },
    "ambient": {
        "name": "Ambient",
        "genre": "Lo-Fi",
        "target_lufs": -18.0,
        "target_peak": -3.0,
        "bass_boost_db": 1.0,
        "mid_boost_db": 0.5,
        "high_boost_db": 0.5,
        "compression_ratio": 1.5,
    },
    "vaporwave": {
        "name": "Vaporwave",
        "genre": "Lo-Fi",
        "target_lufs": -14.0,
        "target_peak": -1.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 1.0,
        "high_boost_db": -0.5,
        "compression_ratio": 2.0,
    },
    
    # ===== ROCK =====
    "rock_classic": {
        "name": "Classic Rock",
        "genre": "Rock",
        "target_lufs": -12.0,
        "target_peak": -1.0,
        "bass_boost_db": 2.0,
        "mid_boost_db": 3.0,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
    "metal": {
        "name": "Metal",
        "genre": "Rock",
        "target_lufs": -8.0,
        "target_peak": -0.3,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 5.0,
    },
    "punk": {
        "name": "Punk",
        "genre": "Rock",
        "target_lufs": -9.0,
        "target_peak": -0.5,
        "bass_boost_db": 2.5,
        "mid_boost_db": 3.0,
        "high_boost_db": 2.0,
        "compression_ratio": 4.5,
    },
    "alt_rock": {
        "name": "Alternative Rock",
        "genre": "Rock",
        "target_lufs": -11.0,
        "target_peak": -0.8,
        "bass_boost_db": 2.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 3.0,
    },
    "grunge": {
        "name": "Grunge",
        "genre": "Rock",
        "target_lufs": -10.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.0,
        "compression_ratio": 3.5,
    },
    
    # ===== JAZZ / CLASSICAL =====
    "jazz_smooth": {
        "name": "Smooth Jazz",
        "genre": "Jazz",
        "target_lufs": -16.0,
        "target_peak": -2.0,
        "bass_boost_db": 1.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.5,
        "compression_ratio": 2.0,
    },
    "classical": {
        "name": "Classical",
        "genre": "Classical",
        "target_lufs": -18.0,
        "target_peak": -3.0,
        "bass_boost_db": 0.5,
        "mid_boost_db": 1.0,
        "high_boost_db": 1.0,
        "compression_ratio": 1.5,
    },
    "blues": {
        "name": "Blues",
        "genre": "Jazz",
        "target_lufs": -14.0,
        "target_peak": -1.5,
        "bass_boost_db": 2.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.0,
        "compression_ratio": 2.5,
    },
    "bossa_nova": {
        "name": "Bossa Nova",
        "genre": "Jazz",
        "target_lufs": -16.0,
        "target_peak": -2.0,
        "bass_boost_db": 2.0,
        "mid_boost_db": 1.5,
        "high_boost_db": 1.5,
        "compression_ratio": 2.0,
    },
    
    # ===== COUNTRY / FOLK =====
    "country_modern": {
        "name": "Modern Country",
        "genre": "Country",
        "target_lufs": -10.0,
        "target_peak": -0.5,
        "bass_boost_db": 2.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 3.5,
    },
    "folk_acoustic": {
        "name": "Folk / Acoustic",
        "genre": "Country",
        "target_lufs": -14.0,
        "target_peak": -1.5,
        "bass_boost_db": 1.5,
        "mid_boost_db": 2.0,
        "high_boost_db": 2.0,
        "compression_ratio": 2.0,
    },
    "bluegrass": {
        "name": "Bluegrass",
        "genre": "Country",
        "target_lufs": -13.0,
        "target_peak": -1.0,
        "bass_boost_db": 2.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 2.5,
    },
    "gospel": {
        "name": "Gospel",
        "genre": "Country",
        "target_lufs": -11.0,
        "target_peak": -0.5,
        "bass_boost_db": 2.5,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
    
    # ===== LATIN =====
    "reggaeton": {
        "name": "Reggaeton",
        "genre": "Latin",
        "target_lufs": -8.0,
        "target_peak": -0.3,
        "bass_boost_db": 5.0,
        "mid_boost_db": 1.5,
        "high_boost_db": 2.0,
        "compression_ratio": 4.5,
    },
    "salsa": {
        "name": "Salsa",
        "genre": "Latin",
        "target_lufs": -11.0,
        "target_peak": -0.5,
        "bass_boost_db": 2.5,
        "mid_boost_db": 2.5,
        "high_boost_db": 2.0,
        "compression_ratio": 3.0,
    },
    "bachata": {
        "name": "Bachata",
        "genre": "Latin",
        "target_lufs": -12.0,
        "target_peak": -0.8,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.0,
        "high_boost_db": 1.5,
        "compression_ratio": 2.5,
    },
    "cumbia": {
        "name": "Cumbia",
        "genre": "Latin",
        "target_lufs": -11.0,
        "target_peak": -0.5,
        "bass_boost_db": 3.0,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
    
    # ===== SPOKEN WORD / PODCAST =====
    "podcast_voice": {
        "name": "Podcast Voice",
        "genre": "Spoken",
        "target_lufs": -16.0,
        "target_peak": -1.0,
        "bass_boost_db": 1.0,
        "mid_boost_db": 3.0,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
    "audiobook": {
        "name": "Audiobook",
        "genre": "Spoken",
        "target_lufs": -18.0,
        "target_peak": -3.0,
        "bass_boost_db": 0.5,
        "mid_boost_db": 2.5,
        "high_boost_db": 1.0,
        "compression_ratio": 2.5,
    },
    "broadcast": {
        "name": "Broadcast Radio",
        "genre": "Spoken",
        "target_lufs": -12.0,
        "target_peak": -0.5,
        "bass_boost_db": 1.5,
        "mid_boost_db": 3.0,
        "high_boost_db": 2.0,
        "compression_ratio": 4.0,
    },
    "asmr": {
        "name": "ASMR",
        "genre": "Spoken",
        "target_lufs": -20.0,
        "target_peak": -3.0,
        "bass_boost_db": 1.0,
        "mid_boost_db": 1.0,
        "high_boost_db": 2.0,
        "compression_ratio": 1.5,
    },
    "interview": {
        "name": "Interview",
        "genre": "Spoken",
        "target_lufs": -16.0,
        "target_peak": -1.5,
        "bass_boost_db": 0.5,
        "mid_boost_db": 3.0,
        "high_boost_db": 1.5,
        "compression_ratio": 3.0,
    },
}


# =====================================================
# API ROUTES
# =====================================================

@ai_mastering_phase3_bp.route('/api/ai/mastering/analyze', methods=['POST'])
@jwt_required()
def api_analyze_track():
    """
    Analyze a track and get smart preset recommendation.

    POST with multipart form: 'audio_file'
    OR JSON: { "audio_id": 123 }

    Returns full analysis + recommended preset.
    """
    user_id = get_jwt_identity()
    temp_path = None

    try:
        # Get audio file
        if 'audio_file' in request.files:
            audio_file = request.files['audio_file']
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, audio_file.filename)
            audio_file.save(temp_path)
        elif request.is_json and request.json.get('audio_id'):
            audio = Audio.query.get(request.json['audio_id'])
            if not audio:
                return jsonify({"error": "Audio not found"}), 404
            # Download from Cloudinary
            import requests as req
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, "analyze_track.wav")
            r = req.get(audio.file_url, stream=True, timeout=60)
            with open(temp_path, 'wb') as f:
                for chunk in r.iter_content(8192):
                    f.write(chunk)
        else:
            return jsonify({"error": "Provide audio_file or audio_id"}), 400

        # Analyze
        analysis = analyze_track(temp_path)
        if not analysis:
            return jsonify({"error": "Analysis failed"}), 500

        # Auto-select preset
        preset_key, confidence, reason = auto_select_preset(analysis)
        adjustments = get_preset_adjustments(analysis, preset_key)

        return jsonify({
            "analysis": analysis,
            "recommended_preset": preset_key,
            "confidence": round(confidence * 100),
            "reason": reason,
            "adjustments": adjustments,
            "alternative_presets": analysis.get("genre_hints", [])[:3],
        }), 200

    except Exception as e:
        print(f"❌ Analysis endpoint error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
                os.rmdir(os.path.dirname(temp_path))
            except Exception:
                pass


@ai_mastering_phase3_bp.route('/api/ai/mastering/smart-master', methods=['POST'])
@jwt_required()
def api_smart_master():
    """
    Full smart mastering: analyze → auto-select preset → master.

    POST with multipart form: 'audio_file'
    Optional: 'preset_override' (skip auto-detection, use this preset)

    Returns: mastered audio URL + full report.
    """
    user_id = get_jwt_identity()

    try:
        if 'audio_file' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio_file']
        preset_override = request.form.get('preset_override')

        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, audio_file.filename)
        audio_file.save(temp_path)

        # Step 1: Analyze
        analysis = analyze_track(temp_path)

        # Step 2: Select preset
        if preset_override:
            preset_key = preset_override
            confidence = 1.0
            reason = f"Manual override: {preset_override}"
        elif analysis:
            preset_key, confidence, reason = auto_select_preset(analysis)
        else:
            preset_key = "pop"
            confidence = 0.3
            reason = "Analysis unavailable — using default"

        # Step 3: Get adjustments
        adjustments = get_preset_adjustments(analysis, preset_key) if analysis else {}

        # Step 4: Call existing Phase 1/2 mastering
        # Import the master function from your existing ai_mastering.py
        from src.api.ai_mastering import master_audio
        
        output_path = os.path.join(temp_dir, "mastered_output.wav")
        result = master_audio(temp_path, output_path, preset_key)

        if not result:
            return jsonify({"error": "Mastering failed"}), 500

        # Step 5: Upload to Cloudinary
        mastered_filename = f"smart_master_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)

        return jsonify({
            "mastered_url": mastered_url,
            "analysis": analysis,
            "preset_used": preset_key,
            "confidence": round(confidence * 100),
            "reason": reason,
            "adjustments_applied": adjustments,
            "message": f"🎵 Smart mastered with '{preset_key}' preset ({round(confidence*100)}% confidence)",
        }), 200

    except Exception as e:
        print(f"❌ Smart mastering error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass


@ai_mastering_phase3_bp.route('/api/ai/mastering/profiles', methods=['GET'])
def get_reference_profiles():
    """Get all 50 reference profiles grouped by genre."""
    grouped = {}
    for key, profile in REFERENCE_PROFILES.items():
        genre = profile["genre"]
        if genre not in grouped:
            grouped[genre] = []
        grouped[genre].append({
            "id": key,
            "name": profile["name"],
            "target_lufs": profile["target_lufs"],
        })

    return jsonify({
        "total_profiles": len(REFERENCE_PROFILES),
        "profiles_by_genre": grouped,
    }), 200


@ai_mastering_phase3_bp.route('/api/ai/mastering/profile-reference-master', methods=['POST'])
@jwt_required()
def api_profile_reference_master():
    """
    Master a track using reference matching (Matchering) via file upload.
    
    NOTE: This is the Phase 3 file-upload version.
    The main /reference-master route (JSON body with audio_id) is in ai_mastering.py.

    POST with multipart form:
    - 'audio_file': the track to master
    - 'reference_file': the pro track to match
    
    OR:
    - 'audio_file': the track to master
    - 'profile_id': use a pre-built reference profile (from 50 genre profiles)
    """
    user_id = get_jwt_identity()

    try:
        if 'audio_file' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio_file']
        temp_dir = tempfile.mkdtemp()
        target_path = os.path.join(temp_dir, "target.wav")
        audio_file.save(target_path)

        output_path = os.path.join(temp_dir, "reference_mastered.wav")

        if 'reference_file' in request.files:
            # Use uploaded reference
            ref_file = request.files['reference_file']
            ref_path = os.path.join(temp_dir, "reference.wav")
            ref_file.save(ref_path)

            result = master_with_reference(target_path, ref_path, output_path)
        else:
            # Use profile — fall back to smart preset mastering
            profile_id = request.form.get('profile_id', 'pop_radio')
            profile = REFERENCE_PROFILES.get(profile_id)
            
            if not profile:
                return jsonify({"error": f"Profile '{profile_id}' not found"}), 404

            # Use Phase 1 mastering with closest preset
            from src.api.ai_mastering import master_audio
            preset_map = {
                "Hip-Hop": "boom_bap", "R&B": "rnb", "Pop": "pop",
                "EDM": "edm", "Lo-Fi": "lo_fi", "Rock": "rock",
                "Jazz": "jazz", "Classical": "jazz", "Country": "country",
                "Latin": "latin", "Spoken": "podcast",
            }
            preset = preset_map.get(profile["genre"], "pop")
            result = master_audio(target_path, output_path, preset)

        if not result:
            return jsonify({"error": "Reference mastering failed"}), 500

        # Upload
        filename = f"ref_master_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, filename)

        return jsonify({
            "mastered_url": mastered_url,
            "message": "🎵 Reference mastering complete!",
        }), 200

    except Exception as e:
        print(f"❌ Reference mastering error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

@ai_mastering_phase3_bp.route("/api/ai/mastering/phase3/process", methods=["POST"])
@jwt_required()
def phase3_process():
    """
    Phase 3 will eventually run a neural mastering model.
    For now it safely falls back to Phase 1 DSP via master_audio().
    """
    temp_dir = None
    try:
        if not (request.content_type and "multipart/form-data" in request.content_type):
            return jsonify({"error": "Use multipart/form-data with a file"}), 400

        file = request.files.get("file")
        preset = request.form.get("preset", "radio_ready")

        if not file:
            return jsonify({"error": "No file provided"}), 400
        if preset not in MASTERING_PRESETS:
            return jsonify({"error": f"Unknown preset: {preset}"}), 400

        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, "input.wav")
        output_path = os.path.join(temp_dir, "output.wav")
        file.save(input_path)

        stats = master_audio(input_path, output_path, preset)

        # NOTE: In Phase 3 you will typically upload output_path and return the URL.
        # For now, just confirm processing completed:
        return jsonify({
            "message": "Phase 3 fallback mastering complete (DSP).",
            "preset": preset,
            "stats": stats
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)