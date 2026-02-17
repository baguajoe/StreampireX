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

REFERENCE_TRACKS_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', 'static', 'references'
)

REFERENCE_PROFILES = {
    "hip_hop": {
        "name": "Hip-Hop / Trap",
        "description": "Heavy 808s, punchy kicks, crisp hi-hats. Matched to modern trap production standards.",
        "icon": "🔥",
        "filename": "ref_hip_hop.wav",
        "fallback_preset": "hip_hop_trap",
    },
    "pop": {
        "name": "Pop / Top 40",
        "description": "Bright, polished, radio-friendly. Balanced across all frequencies with controlled dynamics.",
        "icon": "✨",
        "filename": "ref_pop.wav",
        "fallback_preset": "pop",
    },
    "rnb_soul": {
        "name": "R&B / Soul",
        "description": "Warm low-end, smooth mids, silky highs. Rich and full without harshness.",
        "icon": "💜",
        "filename": "ref_rnb.wav",
        "fallback_preset": "rnb_soul",
    },
    "edm": {
        "name": "EDM / Electronic",
        "description": "Maximum loudness, tight low-end, wide stereo field. Festival-ready.",
        "icon": "⚡",
        "filename": "ref_edm.wav",
        "fallback_preset": "edm",
    },
    "rock": {
        "name": "Rock / Alternative",
        "description": "Driving guitars, punchy drums, raw energy. Classic rock loudness with modern clarity.",
        "icon": "🎸",
        "filename": "ref_rock.wav",
        "fallback_preset": "rock",
    },
    "acoustic": {
        "name": "Acoustic / Folk",
        "description": "Natural dynamics, warm body, airy presence. Transparent mastering that preserves intimacy.",
        "icon": "🪕",
        "filename": "ref_acoustic.wav",
        "fallback_preset": "acoustic",
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
        "fallback_preset": "jazz",
    },
    "latin": {
        "name": "Latin / Reggaeton",
        "description": "Powerful low-end, rhythmic punch, bright and present vocals. Dancefloor energy.",
        "icon": "💃",
        "filename": "ref_latin.wav",
        "fallback_preset": "latin",
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
# MASTERING PRESETS — GENRE-BASED DSP CHAINS
# =====================================================

MASTERING_PRESETS = {

    # =============================================================
    #  HIP-HOP STYLES
    # =============================================================

    "hip_hop_trap": {
        "name": "Hip-Hop / Trap",
        "description": "Heavy 808s, punchy kicks, crisp hi-hats. Modern trap loudness.",
        "icon": "🔥",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -14.0,
            "compressor_ratio": 4.5,
            "compressor_attack": 5.0,
            "compressor_release": 50.0,
            "eq_low_freq": 55.0,
            "eq_low_gain": 5.0,
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": 1.5,
            "eq_mid_q": 0.8,
            "eq_high_freq": 9000.0,
            "eq_high_gain": 2.5,
            "limiter_threshold": -0.5,
            "limiter_release": 30.0,
            "output_gain": 2.0,
        }
    },
    "hip_hop_boom_bap": {
        "name": "Hip-Hop / Boom Bap",
        "description": "Gritty drums, warm samples, punchy snares. That 90s golden era sound.",
        "icon": "🥁",
        "chain": {
            "highpass_freq": 30.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 100.0,
            "compressor_threshold": -16.0,
            "compressor_ratio": 3.5,
            "compressor_attack": 8.0,
            "compressor_release": 80.0,
            "eq_low_freq": 90.0,
            "eq_low_gain": 3.5,
            "eq_mid_freq": 1800.0,
            "eq_mid_gain": 2.0,
            "eq_mid_q": 1.0,
            "eq_high_freq": 7000.0,
            "eq_high_gain": 0.5,
            "limiter_threshold": -1.5,
            "limiter_release": 50.0,
            "output_gain": 1.0,
        }
    },
    "hip_hop_drill": {
        "name": "Hip-Hop / Drill",
        "description": "Dark 808 slides, aggressive hi-hats, raw and gritty. UK/NY drill energy.",
        "icon": "🗡️",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 70.0,
            "compressor_threshold": -13.0,
            "compressor_ratio": 5.0,
            "compressor_attack": 3.0,
            "compressor_release": 45.0,
            "eq_low_freq": 50.0,
            "eq_low_gain": 5.5,
            "eq_mid_freq": 2000.0,
            "eq_mid_gain": -0.5,
            "eq_mid_q": 0.7,
            "eq_high_freq": 8500.0,
            "eq_high_gain": 3.0,
            "limiter_threshold": -0.3,
            "limiter_release": 25.0,
            "output_gain": 2.5,
        }
    },
    "hip_hop_lofi": {
        "name": "Hip-Hop / Lo-Fi",
        "description": "Dusty samples, vinyl crackle vibe, warm and mellow. Chill lo-fi hip-hop.",
        "icon": "📻",
        "chain": {
            "highpass_freq": 50.0,
            "noise_gate_threshold": -70.0,
            "noise_gate_release": 200.0,
            "compressor_threshold": -14.0,
            "compressor_ratio": 2.5,
            "compressor_attack": 25.0,
            "compressor_release": 180.0,
            "eq_low_freq": 150.0,
            "eq_low_gain": 2.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": -2.0,
            "eq_mid_q": 0.6,
            "eq_high_freq": 6000.0,
            "eq_high_gain": -3.5,
            "limiter_threshold": -2.5,
            "limiter_release": 90.0,
            "output_gain": 0.5,
        }
    },
    "hip_hop_conscious": {
        "name": "Hip-Hop / Conscious",
        "description": "Clear vocals, balanced mix, natural warmth. Lyrics-first with musical depth.",
        "icon": "🧠",
        "chain": {
            "highpass_freq": 35.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 100.0,
            "compressor_threshold": -17.0,
            "compressor_ratio": 3.0,
            "compressor_attack": 10.0,
            "compressor_release": 90.0,
            "eq_low_freq": 80.0,
            "eq_low_gain": 2.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 2.5,
            "eq_mid_q": 1.0,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.5,
            "limiter_threshold": -1.5,
            "limiter_release": 60.0,
            "output_gain": 1.0,
        }
    },
    "hip_hop_southern": {
        "name": "Hip-Hop / Southern",
        "description": "Trunk-rattling bass, bouncy drums, syrupy vibes. ATL and Houston sound.",
        "icon": "🍑",
        "chain": {
            "highpass_freq": 22.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -14.0,
            "compressor_ratio": 4.0,
            "compressor_attack": 5.0,
            "compressor_release": 55.0,
            "eq_low_freq": 45.0,
            "eq_low_gain": 6.0,
            "eq_mid_freq": 2200.0,
            "eq_mid_gain": 1.0,
            "eq_mid_q": 0.8,
            "eq_high_freq": 8000.0,
            "eq_high_gain": 1.5,
            "limiter_threshold": -0.5,
            "limiter_release": 30.0,
            "output_gain": 2.0,
        }
    },
    "hip_hop_phonk": {
        "name": "Hip-Hop / Phonk",
        "description": "Dark Memphis samples, distorted bass, cowbell hits. Underground phonk energy.",
        "icon": "👻",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -62.0,
            "noise_gate_release": 90.0,
            "compressor_threshold": -12.0,
            "compressor_ratio": 5.5,
            "compressor_attack": 3.0,
            "compressor_release": 40.0,
            "eq_low_freq": 55.0,
            "eq_low_gain": 5.5,
            "eq_mid_freq": 1500.0,
            "eq_mid_gain": -1.5,
            "eq_mid_q": 0.7,
            "eq_high_freq": 7000.0,
            "eq_high_gain": -1.0,
            "limiter_threshold": -0.3,
            "limiter_release": 20.0,
            "output_gain": 3.0,
        }
    },

    # =============================================================
    #  POP & R&B
    # =============================================================

    "pop": {
        "name": "Pop / Top 40",
        "description": "Bright, polished, radio-friendly. Balanced with controlled dynamics.",
        "icon": "✨",
        "chain": {
            "highpass_freq": 35.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 90.0,
            "compressor_threshold": -17.0,
            "compressor_ratio": 3.5,
            "compressor_attack": 8.0,
            "compressor_release": 90.0,
            "eq_low_freq": 80.0,
            "eq_low_gain": 2.0,
            "eq_mid_freq": 3500.0,
            "eq_mid_gain": 2.5,
            "eq_mid_q": 1.0,
            "eq_high_freq": 12000.0,
            "eq_high_gain": 2.5,
            "limiter_threshold": -0.8,
            "limiter_release": 40.0,
            "output_gain": 1.5,
        }
    },
    "rnb_soul": {
        "name": "R&B / Soul",
        "description": "Warm low-end, silky mids, smooth highs. Rich and full without harshness.",
        "icon": "💜",
        "chain": {
            "highpass_freq": 28.0,
            "noise_gate_threshold": -62.0,
            "noise_gate_release": 140.0,
            "compressor_threshold": -16.0,
            "compressor_ratio": 2.8,
            "compressor_attack": 15.0,
            "compressor_release": 120.0,
            "eq_low_freq": 100.0,
            "eq_low_gain": 3.0,
            "eq_mid_freq": 2200.0,
            "eq_mid_gain": -0.5,
            "eq_mid_q": 0.9,
            "eq_high_freq": 9000.0,
            "eq_high_gain": 1.0,
            "limiter_threshold": -1.5,
            "limiter_release": 70.0,
            "output_gain": 0.5,
        }
    },
    "afrobeats": {
        "name": "Afrobeats",
        "description": "Infectious rhythms, warm percussion, bright vocals. Lagos dancefloor energy.",
        "icon": "🌍",
        "chain": {
            "highpass_freq": 30.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 90.0,
            "compressor_threshold": -16.0,
            "compressor_ratio": 3.5,
            "compressor_attack": 7.0,
            "compressor_release": 70.0,
            "eq_low_freq": 70.0,
            "eq_low_gain": 3.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 2.0,
            "eq_mid_q": 0.9,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -1.0,
            "limiter_release": 40.0,
            "output_gain": 1.5,
        }
    },
    "reggae_dancehall": {
        "name": "Reggae / Dancehall",
        "description": "Deep bass, riddim-heavy, bright vocals. Sound system ready.",
        "icon": "🇯🇲",
        "chain": {
            "highpass_freq": 22.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 100.0,
            "compressor_threshold": -15.0,
            "compressor_ratio": 3.5,
            "compressor_attack": 10.0,
            "compressor_release": 80.0,
            "eq_low_freq": 60.0,
            "eq_low_gain": 5.0,
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": 1.5,
            "eq_mid_q": 0.8,
            "eq_high_freq": 9000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -1.0,
            "limiter_release": 40.0,
            "output_gain": 1.5,
        }
    },

    # =============================================================
    #  ROCK & ALTERNATIVE
    # =============================================================

    "rock": {
        "name": "Rock / Alternative",
        "description": "Driving guitars, punchy drums, raw energy. Classic rock loudness.",
        "icon": "🎸",
        "chain": {
            "highpass_freq": 30.0,
            "noise_gate_threshold": -55.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -15.0,
            "compressor_ratio": 4.0,
            "compressor_attack": 5.0,
            "compressor_release": 70.0,
            "eq_low_freq": 80.0,
            "eq_low_gain": 2.0,
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": 3.0,
            "eq_mid_q": 0.9,
            "eq_high_freq": 8000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -1.0,
            "limiter_release": 40.0,
            "output_gain": 1.5,
        }
    },

    # =============================================================
    #  ELECTRONIC
    # =============================================================

    "edm": {
        "name": "EDM / Electronic",
        "description": "Maximum loudness, tight bass, wide stereo. Festival-ready.",
        "icon": "⚡",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 70.0,
            "compressor_threshold": -13.0,
            "compressor_ratio": 5.0,
            "compressor_attack": 3.0,
            "compressor_release": 50.0,
            "eq_low_freq": 50.0,
            "eq_low_gain": 4.0,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 1.5,
            "eq_mid_q": 0.7,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 3.0,
            "limiter_threshold": -0.3,
            "limiter_release": 25.0,
            "output_gain": 2.5,
        }
    },

    # =============================================================
    #  LATIN
    # =============================================================

    "latin": {
        "name": "Latin / Reggaeton",
        "description": "Powerful low-end, rhythmic punch, bright vocals. Dancefloor energy.",
        "icon": "💃",
        "chain": {
            "highpass_freq": 28.0,
            "noise_gate_threshold": -58.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -15.0,
            "compressor_ratio": 4.0,
            "compressor_attack": 6.0,
            "compressor_release": 60.0,
            "eq_low_freq": 65.0,
            "eq_low_gain": 4.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 2.0,
            "eq_mid_q": 0.8,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -0.8,
            "limiter_release": 35.0,
            "output_gain": 1.5,
        }
    },

    # =============================================================
    #  ACOUSTIC & JAZZ
    # =============================================================

    "acoustic": {
        "name": "Acoustic / Folk",
        "description": "Natural dynamics, warm body, airy presence. Transparent and intimate.",
        "icon": "🪕",
        "chain": {
            "highpass_freq": 40.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 120.0,
            "compressor_threshold": -20.0,
            "compressor_ratio": 2.0,
            "compressor_attack": 20.0,
            "compressor_release": 150.0,
            "eq_low_freq": 120.0,
            "eq_low_gain": 1.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 1.5,
            "eq_mid_q": 1.2,
            "eq_high_freq": 12000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -3.0,
            "limiter_release": 80.0,
            "output_gain": 0.0,
        }
    },
    "jazz": {
        "name": "Jazz / Classical",
        "description": "Wide dynamic range, natural tone, spacious stereo. Minimal processing.",
        "icon": "🎷",
        "chain": {
            "highpass_freq": 30.0,
            "noise_gate_threshold": -68.0,
            "noise_gate_release": 180.0,
            "compressor_threshold": -22.0,
            "compressor_ratio": 1.8,
            "compressor_attack": 25.0,
            "compressor_release": 200.0,
            "eq_low_freq": 100.0,
            "eq_low_gain": 1.0,
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": 0.5,
            "eq_mid_q": 1.0,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.0,
            "limiter_threshold": -4.0,
            "limiter_release": 100.0,
            "output_gain": 0.0,
        }
    },

    # =============================================================
    #  LO-FI & CHILL
    # =============================================================

    "lo_fi": {
        "name": "Lo-Fi Chill",
        "description": "Relaxed, vintage vibe with gentle warmth. Ideal for lo-fi beats and ambient.",
        "icon": "🌙",
        "chain": {
            "highpass_freq": 60.0,
            "noise_gate_threshold": -70.0,
            "noise_gate_release": 200.0,
            "compressor_threshold": -12.0,
            "compressor_ratio": 2.0,
            "compressor_attack": 30.0,
            "compressor_release": 200.0,
            "eq_low_freq": 200.0,
            "eq_low_gain": 2.0,
            "eq_mid_freq": 3500.0,
            "eq_mid_gain": -2.0,
            "eq_mid_q": 0.6,
            "eq_high_freq": 6000.0,
            "eq_high_gain": -3.0,
            "limiter_threshold": -3.0,
            "limiter_release": 100.0,
            "output_gain": 0.0,
        }
    },

    # =============================================================
    #  SPOKEN WORD
    # =============================================================

    "podcast_pro": {
        "name": "Podcast Pro",
        "description": "Optimized for spoken word — clear vocals, reduced noise, broadcast loudness.",
        "icon": "🎙️",
        "chain": {
            "highpass_freq": 80.0,
            "noise_gate_threshold": -45.0,
            "noise_gate_release": 60.0,
            "compressor_threshold": -22.0,
            "compressor_ratio": 4.0,
            "compressor_attack": 3.0,
            "compressor_release": 60.0,
            "eq_low_freq": 150.0,
            "eq_low_gain": -1.0,
            "eq_mid_freq": 3500.0,
            "eq_mid_gain": 3.0,
            "eq_mid_q": 1.5,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.0,
            "limiter_threshold": -1.5,
            "limiter_release": 50.0,
            "output_gain": 1.0,
        }
    },

    # =============================================================
    #  GENERAL STYLES
    # =============================================================

    "radio_ready": {
        "name": "Radio Ready",
        "description": "Loud, punchy, and broadcast-ready. Ideal for singles and radio submissions.",
        "icon": "📡",
        "chain": {
            "highpass_freq": 30.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 100.0,
            "compressor_threshold": -18.0,
            "compressor_ratio": 3.5,
            "compressor_attack": 10.0,
            "compressor_release": 100.0,
            "eq_low_freq": 80.0,
            "eq_low_gain": 1.5,
            "eq_mid_freq": 3000.0,
            "eq_mid_gain": 2.0,
            "eq_mid_q": 1.0,
            "eq_high_freq": 10000.0,
            "eq_high_gain": 1.5,
            "limiter_threshold": -1.0,
            "limiter_release": 50.0,
            "output_gain": 1.0,
        }
    },
    "warm": {
        "name": "Warm & Analog",
        "description": "Smooth, warm character with rich low-end. Vintage feel with modern clarity.",
        "icon": "🔶",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -65.0,
            "noise_gate_release": 150.0,
            "compressor_threshold": -15.0,
            "compressor_ratio": 2.5,
            "compressor_attack": 20.0,
            "compressor_release": 150.0,
            "eq_low_freq": 120.0,
            "eq_low_gain": 3.0,
            "eq_mid_freq": 2500.0,
            "eq_mid_gain": -1.0,
            "eq_mid_q": 0.8,
            "eq_high_freq": 8000.0,
            "eq_high_gain": -0.5,
            "limiter_threshold": -2.0,
            "limiter_release": 80.0,
            "output_gain": 0.5,
        }
    },
    "crystal_clear": {
        "name": "Crystal Clear",
        "description": "Clean, detailed, and transparent. Perfect for vocals and acoustic tracks.",
        "icon": "💎",
        "chain": {
            "highpass_freq": 40.0,
            "noise_gate_threshold": -55.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -20.0,
            "compressor_ratio": 2.0,
            "compressor_attack": 5.0,
            "compressor_release": 80.0,
            "eq_low_freq": 100.0,
            "eq_low_gain": 0.5,
            "eq_mid_freq": 4000.0,
            "eq_mid_gain": 2.5,
            "eq_mid_q": 1.2,
            "eq_high_freq": 12000.0,
            "eq_high_gain": 3.0,
            "limiter_threshold": -2.5,
            "limiter_release": 60.0,
            "output_gain": 0.0,
        }
    },
    "club_banger": {
        "name": "Club Banger",
        "description": "Maximum impact with heavy bass and aggressive mastering. Hits hard.",
        "icon": "🔊",
        "chain": {
            "highpass_freq": 25.0,
            "noise_gate_threshold": -60.0,
            "noise_gate_release": 80.0,
            "compressor_threshold": -14.0,
            "compressor_ratio": 5.0,
            "compressor_attack": 5.0,
            "compressor_release": 60.0,
            "eq_low_freq": 60.0,
            "eq_low_gain": 4.0,
            "eq_mid_freq": 2000.0,
            "eq_mid_gain": 1.0,
            "eq_mid_q": 0.7,
            "eq_high_freq": 8000.0,
            "eq_high_gain": 2.0,
            "limiter_threshold": -0.5,
            "limiter_release": 30.0,
            "output_gain": 2.0,
        }
    },
}


# =====================================================
# AUDIO PROCESSING ENGINE
# =====================================================

def build_mastering_chain(preset_key):
    """Build a pedalboard mastering chain from a preset configuration."""
    if preset_key not in MASTERING_PRESETS:
        raise ValueError(f"Unknown preset: {preset_key}")

    config = MASTERING_PRESETS[preset_key]["chain"]

    board = Pedalboard([
        HighpassFilter(cutoff_frequency_hz=config["highpass_freq"]),
        NoiseGate(
            threshold_db=config["noise_gate_threshold"],
            release_ms=config["noise_gate_release"]
        ),
        Compressor(
            threshold_db=config["compressor_threshold"],
            ratio=config["compressor_ratio"],
            attack_ms=config["compressor_attack"],
            release_ms=config["compressor_release"]
        ),
        LowShelfFilter(
            cutoff_frequency_hz=config["eq_low_freq"],
            gain_db=config["eq_low_gain"]
        ),
        PeakFilter(
            cutoff_frequency_hz=config["eq_mid_freq"],
            gain_db=config["eq_mid_gain"],
            q=config["eq_mid_q"]
        ),
        HighShelfFilter(
            cutoff_frequency_hz=config["eq_high_freq"],
            gain_db=config["eq_high_gain"]
        ),
        Limiter(
            threshold_db=config["limiter_threshold"],
            release_ms=config["limiter_release"]
        ),
        Gain(gain_db=config["output_gain"]),
    ])

    return board


def process_audio_file(input_path, output_path, preset_key):
    """Process an audio file through the mastering chain."""
    audio_data, sample_rate = librosa.load(input_path, sr=None, mono=False)

    if audio_data.ndim == 1:
        audio_data = audio_data.reshape(1, -1)

    audio_data = audio_data.astype(np.float32)

    peak_before = float(np.max(np.abs(audio_data)))
    rms_before = float(np.sqrt(np.mean(audio_data ** 2)))
    duration = audio_data.shape[1] / sample_rate

    board = build_mastering_chain(preset_key)
    mastered_audio = board(audio_data, sample_rate)

    peak_after = float(np.max(np.abs(mastered_audio)))
    rms_after = float(np.sqrt(np.mean(mastered_audio ** 2)))

    if peak_after > 1.0:
        mastered_audio = mastered_audio / peak_after * 0.99
        peak_after = 0.99

    mastered_audio_transposed = mastered_audio.T
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

def ensure_wav_format(input_path, temp_dir):
    """Matchering requires WAV input. Convert if necessary."""
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.wav':
        return input_path

    wav_path = os.path.join(temp_dir, "converted_input.wav")
    audio_data, sr = librosa.load(input_path, sr=None, mono=False)
    if audio_data.ndim == 1:
        audio_data = audio_data.reshape(1, -1)
    sf.write(wav_path, audio_data.T, sr, subtype='PCM_24')
    return wav_path


def process_with_matchering(input_path, reference_path, output_path):
    """Process audio using Matchering's adaptive algorithm."""
    if not MATCHERING_AVAILABLE:
        raise RuntimeError("Matchering is not installed. Run: pip install matchering")

    audio_before, sr = librosa.load(input_path, sr=None, mono=False)
    if audio_before.ndim == 1:
        audio_before = audio_before.reshape(1, -1)

    peak_before = float(np.max(np.abs(audio_before)))
    rms_before = float(np.sqrt(np.mean(audio_before ** 2)))
    duration = audio_before.shape[1] / sr
    channels = audio_before.shape[0]

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
    """HYBRID MODE: Matchering first → DSP polish after."""
    temp_dir = os.path.dirname(output_path)
    intermediate_path = os.path.join(temp_dir, "matchered_intermediate.wav")

    print("🧠 Stage 1/2: Matchering adaptive processing...")
    matchering_stats = process_with_matchering(input_path, reference_path, intermediate_path)

    print(f"🎚️ Stage 2/2: DSP polish with '{polish_preset}' preset...")
    dsp_stats = process_audio_file(intermediate_path, output_path, polish_preset)

    try:
        os.remove(intermediate_path)
    except Exception:
        pass

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
    """Smart processing: uses Matchering if available, falls back to DSP."""
    if reference_path and MATCHERING_AVAILABLE:
        if polish_preset:
            return process_hybrid(input_path, reference_path, output_path, polish_preset)
        else:
            return process_with_matchering(input_path, reference_path, output_path)
    elif polish_preset:
        return process_audio_file(input_path, output_path, polish_preset)
    else:
        return process_audio_file(input_path, output_path, "radio_ready")


# =====================================================
# API ROUTES
# =====================================================

@ai_mastering_bp.route('/api/ai/mastering/presets', methods=['GET'])
def get_mastering_presets():
    """Get all available mastering presets. Public endpoint."""
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
    Master an audio track using DSP processing.
    
    JSON body: { "audio_id": 123, "preset": "hip_hop_boom_bap" }
    Or multipart form with file upload.
    """
    user_id = get_jwt_identity()
    audio_id = None

    try:
        if request.content_type and 'multipart/form-data' in request.content_type:
            file = request.files.get('file')
            preset_key = request.form.get('preset', 'radio_ready')
            audio_id = request.form.get('audio_id')

            if not file:
                return jsonify({"error": "No audio file provided"}), 400

            temp_dir = tempfile.mkdtemp()
            input_ext = os.path.splitext(file.filename)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            file.save(input_path)

        else:
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

            # ✅ FIX: str() comparison to avoid int/string mismatch
            if str(audio.user_id) != str(user_id):
                return jsonify({"error": "Unauthorized — you can only master your own tracks"}), 403

            if not audio.file_url:
                return jsonify({"error": "No audio file URL found for this track"}), 400

            temp_dir = tempfile.mkdtemp()
            url_path = audio.file_url.split('?')[0]
            input_ext = os.path.splitext(url_path)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")

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

        output_path = os.path.join(temp_dir, "mastered_output.wav")

        print(f"🎚️ Processing with preset: {preset_key}")
        stats = process_audio_file(input_path, output_path, preset_key)
        print(f"✅ Mastering complete! Stats: {stats}")

        # Upload mastered file to Cloudinary
        mastered_filename = f"mastered_{preset_key}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"

        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)

        print(f"☁️ Uploaded mastered file: {mastered_url}")

        # Update the Audio record
        if audio_id:
            audio = Audio.query.get(audio_id)
            if audio:
                audio.processed_file_url = mastered_url
                audio.processing_status = 'mastered'
                audio.last_processed_at = datetime.utcnow()
                db.session.commit()

        # Clean up temp files
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

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
    """Check the mastering status of a track."""
    user_id = get_jwt_identity()
    audio = Audio.query.get(audio_id)

    if not audio:
        return jsonify({"error": "Track not found"}), 404

    # ✅ FIX: str() comparison
    if str(audio.user_id) != str(user_id):
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
    """Get all of the current user's audio tracks with mastering status."""
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
    """Get both original and mastered URLs for A/B comparison."""
    user_id = get_jwt_identity()
    audio = Audio.query.get(audio_id)

    if not audio:
        return jsonify({"error": "Track not found"}), 404

    # ✅ FIX: str() comparison
    if str(audio.user_id) != str(user_id):
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
    """One-stop endpoint: upload a new track AND master it in one request."""
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

        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        original_url = uploadFile(file, filename)

        file.seek(0)
        temp_dir = tempfile.mkdtemp()
        input_ext = os.path.splitext(filename)[1] or '.wav'
        input_path = os.path.join(temp_dir, f"input{input_ext}")
        file.save(input_path)

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

        output_path = os.path.join(temp_dir, "mastered_output.wav")
        stats = process_audio_file(input_path, output_path, preset_key)

        mastered_filename = f"mastered_{preset_key}_{new_audio.id}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)

        new_audio.processed_file_url = mastered_url
        new_audio.processing_status = 'mastered'
        new_audio.last_processed_at = datetime.utcnow()
        db.session.commit()

        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
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
    """Returns what mastering capabilities are currently available."""
    available_references = {}
    for key, profile in REFERENCE_PROFILES.items():
        available_references[key] = {
            "name": profile["name"],
            "has_reference_file": is_reference_available(key),
            "fallback_preset": profile["fallback_preset"],
        }

    return jsonify({
        "phase_1_dsp": True,
        "phase_2_matchering": MATCHERING_AVAILABLE,
        "hybrid_mode": MATCHERING_AVAILABLE,
        "total_presets": len(MASTERING_PRESETS),
        "total_references": len(REFERENCE_PROFILES),
        "references_with_files": sum(1 for k in REFERENCE_PROFILES if is_reference_available(k)),
        "reference_profiles": available_references,
    }), 200


@ai_mastering_bp.route('/api/ai/mastering/references', methods=['GET'])
def get_reference_profiles():
    """Get all available reference profiles for adaptive mastering."""
    profiles = []
    for key, profile in REFERENCE_PROFILES.items():
        has_file = is_reference_available(key)
        profiles.append({
            "id": key,
            "name": profile["name"],
            "description": profile["description"],
            "icon": profile["icon"],
            "available": has_file or True,
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
    """Master a track using a reference profile (Phase 2)."""
    user_id = get_jwt_identity()
    audio_id = None

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

        audio = Audio.query.get(audio_id)
        if not audio:
            return jsonify({"error": "Track not found"}), 404

        # ✅ FIX: str() comparison
        if str(audio.user_id) != str(user_id):
            return jsonify({"error": "Unauthorized"}), 403

        if not audio.file_url:
            return jsonify({"error": "No audio file URL"}), 400

        audio.processing_status = 'processing'
        db.session.commit()

        temp_dir = tempfile.mkdtemp()

        url_path = audio.file_url.split('?')[0]
        input_ext = os.path.splitext(url_path)[1] or '.wav'
        input_path = os.path.join(temp_dir, f"input{input_ext}")

        print(f"🎚️ Downloading audio from: {audio.file_url}")
        download_audio_from_url(audio.file_url, input_path)

        wav_input_path = ensure_wav_format(input_path, temp_dir)

        output_path = os.path.join(temp_dir, "mastered_output.wav")
        reference_profile = REFERENCE_PROFILES[reference_key]
        reference_path = get_reference_path(reference_key)

        if not polish_preset:
            polish_preset = reference_profile["fallback_preset"]

        actual_method = mode

        if mode == "adaptive" and reference_path and MATCHERING_AVAILABLE:
            print(f"🧠 Mode: Adaptive (pure Matchering) → Reference: {reference_key}")
            stats = process_with_matchering(wav_input_path, reference_path, output_path)

        elif mode == "hybrid" and reference_path and MATCHERING_AVAILABLE:
            print(f"🧠 Mode: Hybrid (Matchering + DSP) → Reference: {reference_key}, Polish: {polish_preset}")
            stats = process_hybrid(wav_input_path, reference_path, output_path, polish_preset)

        else:
            print(f"🎚️ Mode: DSP Fallback → Preset: {polish_preset}")
            stats = process_audio_file(wav_input_path, output_path, polish_preset)
            actual_method = "dsp_fallback"

        mastered_filename = f"mastered_{reference_key}_{mode}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)

        print(f"☁️ Uploaded: {mastered_url}")

        audio.processed_file_url = mastered_url
        audio.processing_status = 'mastered'
        audio.last_processed_at = datetime.utcnow()
        db.session.commit()

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
    """Master a track using a CUSTOM reference track uploaded by the creator."""
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

        ref_ext = os.path.splitext(reference_file.filename)[1] or '.wav'
        ref_path = os.path.join(temp_dir, f"reference{ref_ext}")
        reference_file.save(ref_path)

        ref_wav_path = ensure_wav_format(ref_path, temp_dir)

        if track_file:
            input_ext = os.path.splitext(track_file.filename)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            track_file.save(input_path)
        else:
            audio = Audio.query.get(audio_id)
            if not audio:
                return jsonify({"error": "Track not found"}), 404

            # ✅ FIX: str() comparison
            if str(audio.user_id) != str(user_id):
                return jsonify({"error": "Unauthorized"}), 403

            audio.processing_status = 'processing'
            db.session.commit()

            url_path = audio.file_url.split('?')[0]
            input_ext = os.path.splitext(url_path)[1] or '.wav'
            input_path = os.path.join(temp_dir, f"input{input_ext}")
            download_audio_from_url(audio.file_url, input_path)

        wav_input_path = ensure_wav_format(input_path, temp_dir)
        output_path = os.path.join(temp_dir, "mastered_output.wav")

        if mode == "hybrid" and polish_preset:
            stats = process_hybrid(wav_input_path, ref_wav_path, output_path, polish_preset)
        else:
            stats = process_with_matchering(wav_input_path, ref_wav_path, output_path)

        mastered_filename = f"mastered_custom_ref_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.wav"
        with open(output_path, 'rb') as f:
            mastered_url = uploadFile(f, mastered_filename)

        if audio_id:
            audio = Audio.query.get(audio_id)
            if audio:
                audio.processed_file_url = mastered_url
                audio.processing_status = 'mastered'
                audio.last_processed_at = datetime.utcnow()
                db.session.commit()

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
    """Admin/creator endpoint to upload a reference track for a genre profile."""
    user_id = get_jwt_identity()

    try:
        file = request.files.get('file')
        profile_key = request.form.get('profile')

        if not file:
            return jsonify({"error": "No file provided"}), 400
        if not profile_key or profile_key not in REFERENCE_PROFILES:
            return jsonify({"error": "Invalid profile key"}), 400

        os.makedirs(REFERENCE_TRACKS_DIR, exist_ok=True)

        filename = REFERENCE_PROFILES[profile_key]["filename"]
        filepath = os.path.join(REFERENCE_TRACKS_DIR, filename)

        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)

        ext = os.path.splitext(file.filename)[1].lower()
        if ext != '.wav':
            wav_path = ensure_wav_format(temp_path, temp_dir)
            shutil.copy2(wav_path, filepath)
        else:
            shutil.copy2(temp_path, filepath)

        shutil.rmtree(temp_dir, ignore_errors=True)

        return jsonify({
            "message": f"✅ Reference track uploaded for {REFERENCE_PROFILES[profile_key]['name']}",
            "profile": profile_key,
            "filename": filename,
            "path": filepath,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Phase 3 (Neural Network) — coming soon.
# See ai_mastering_nn.py for the trained model integration.