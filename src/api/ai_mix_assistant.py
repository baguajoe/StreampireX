# =============================================================================
# ai_mix_assistant.py - AI Mix Assistant for Recording Studio
# =============================================================================
# Location: src/api/ai_mix_assistant.py
# Register: app.register_blueprint(ai_mix_assistant_bp)
#
# Analyzes multi-track projects and returns intelligent mixing suggestions:
#   • Per-track volume levels (LUFS/RMS normalization)
#   • Panning recommendations (frequency-based stereo placement)
#   • EQ suggestions (frequency conflict detection + genre curves)
#   • Compression recommendations (dynamic range analysis)
#   • Frequency conflict warnings between tracks
#   • Overall mix health score
#
# Dependencies (all free):
#   pip install librosa numpy scipy soundfile
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import json
import tempfile
import traceback
import numpy as np

ai_mix_assistant_bp = Blueprint('ai_mix_assistant', __name__)


# =============================================================================
# GENRE MIX PROFILES — target frequency balances
# =============================================================================

GENRE_PROFILES = {
    "hip_hop": {
        "name": "Hip-Hop / Trap",
        "bass_emphasis": 1.3, "mid_cut": 0.9, "high_presence": 1.1,
        "target_dynamic_range_db": 8,
        "description": "Heavy low-end, scooped mids, crisp highs"
    },
    "pop": {
        "name": "Pop / Top 40",
        "bass_emphasis": 1.0, "mid_cut": 1.0, "high_presence": 1.15,
        "target_dynamic_range_db": 10,
        "description": "Balanced, bright, radio-friendly"
    },
    "rock": {
        "name": "Rock / Alt",
        "bass_emphasis": 1.1, "mid_cut": 1.15, "high_presence": 1.0,
        "target_dynamic_range_db": 12,
        "description": "Guitar-forward mids, punchy drums"
    },
    "rnb": {
        "name": "R&B / Soul",
        "bass_emphasis": 1.15, "mid_cut": 0.95, "high_presence": 1.05,
        "target_dynamic_range_db": 11,
        "description": "Warm low-end, smooth mids, silky highs"
    },
    "edm": {
        "name": "EDM / Electronic",
        "bass_emphasis": 1.25, "mid_cut": 0.95, "high_presence": 1.2,
        "target_dynamic_range_db": 6,
        "description": "Maximum loudness, tight bass, wide stereo"
    },
    "jazz": {
        "name": "Jazz / Acoustic",
        "bass_emphasis": 1.0, "mid_cut": 1.1, "high_presence": 0.95,
        "target_dynamic_range_db": 18,
        "description": "Natural dynamics, warm mids, organic feel"
    },
    "lo_fi": {
        "name": "Lo-Fi / Chill",
        "bass_emphasis": 1.1, "mid_cut": 0.9, "high_presence": 0.85,
        "target_dynamic_range_db": 14,
        "description": "Mellow highs, warm bass, relaxed dynamics"
    },
    "podcast": {
        "name": "Podcast / Spoken Word",
        "bass_emphasis": 0.9, "mid_cut": 1.2, "high_presence": 1.1,
        "target_dynamic_range_db": 8,
        "description": "Voice clarity priority, tight dynamics"
    },
}


# =============================================================================
# TRACK ANALYZER — Per-track spectral + dynamic analysis
# =============================================================================

def analyze_single_track(file_path, sr=22050):
    """
    Deep analysis of a single audio track.
    Returns dict with all metrics needed for mix suggestions.
    """
    import librosa
    import soundfile as sf

    try:
        y, sr = librosa.load(file_path, sr=sr, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        if len(y) < sr:  # Less than 1 second
            return {"error": "Track too short", "duration": duration}

        # ── RMS / Loudness ──
        rms = np.sqrt(np.mean(y ** 2))
        rms_db = 20 * np.log10(max(rms, 1e-10))
        peak = np.max(np.abs(y))
        peak_db = 20 * np.log10(max(peak, 1e-10))

        # Dynamic range (difference between peak and RMS)
        dynamic_range_db = peak_db - rms_db

        # ── Frequency Analysis ──
        S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
        mag_avg = np.mean(S, axis=1)

        # Band energy (sub, bass, low-mid, mid, upper-mid, presence, brilliance)
        bands = {
            "sub":        (20, 60),
            "bass":       (60, 250),
            "low_mid":    (250, 500),
            "mid":        (500, 2000),
            "upper_mid":  (2000, 4000),
            "presence":   (4000, 8000),
            "brilliance": (8000, 16000),
        }

        band_energy = {}
        total_energy = np.sum(mag_avg ** 2)
        for band_name, (lo, hi) in bands.items():
            mask = (freqs >= lo) & (freqs < hi)
            band_e = np.sum(mag_avg[mask] ** 2)
            band_energy[band_name] = {
                "energy": float(band_e),
                "percentage": round(float(band_e / max(total_energy, 1e-10)) * 100, 1),
                "db": round(float(10 * np.log10(max(band_e, 1e-10))), 1),
            }

        # ── Dominant frequency ──
        dominant_idx = np.argmax(mag_avg)
        dominant_freq = float(freqs[dominant_idx])

        # ── Spectral centroid (brightness indicator) ──
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        avg_centroid = float(np.mean(centroid))

        # ── Spectral rolloff (where high energy drops off) ──
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
        avg_rolloff = float(np.mean(rolloff))

        # ── Zero crossing rate (noisy vs tonal) ──
        zcr = librosa.feature.zero_crossing_rate(y)
        avg_zcr = float(np.mean(zcr))

        # ── Classify track type by frequency content ──
        bass_pct = band_energy["sub"]["percentage"] + band_energy["bass"]["percentage"]
        mid_pct = band_energy["low_mid"]["percentage"] + band_energy["mid"]["percentage"]
        high_pct = band_energy["upper_mid"]["percentage"] + band_energy["presence"]["percentage"] + band_energy["brilliance"]["percentage"]

        if bass_pct > 50:
            track_type = "bass"
        elif avg_centroid > 3000:
            track_type = "bright"  # hi-hats, cymbals, synths
        elif avg_centroid < 800:
            track_type = "warm"  # bass, pads, low vocals
        elif mid_pct > 45:
            track_type = "midrange"  # vocals, guitars, keys
        else:
            track_type = "full_range"

        # ── Is it clipping? ──
        clipping_samples = np.sum(np.abs(y) > 0.99)
        is_clipping = clipping_samples > (sr * 0.001)  # More than 1ms of clipping

        return {
            "duration": round(duration, 2),
            "rms_db": round(rms_db, 1),
            "peak_db": round(peak_db, 1),
            "dynamic_range_db": round(dynamic_range_db, 1),
            "dominant_freq": round(dominant_freq, 1),
            "spectral_centroid": round(avg_centroid, 1),
            "spectral_rolloff": round(avg_rolloff, 1),
            "zcr": round(avg_zcr, 4),
            "track_type": track_type,
            "is_clipping": is_clipping,
            "band_energy": band_energy,
            "bass_pct": round(bass_pct, 1),
            "mid_pct": round(mid_pct, 1),
            "high_pct": round(high_pct, 1),
        }

    except Exception as e:
        print(f"❌ Track analysis error: {e}")
        traceback.print_exc()
        return {"error": str(e)}


# =============================================================================
# MIX SUGGESTION ENGINE — Generates actionable recommendations
# =============================================================================

def generate_mix_suggestions(track_analyses, genre="pop"):
    """
    Takes array of per-track analyses and generates mix suggestions.
    Returns suggestions for volume, pan, EQ, compression per track,
    plus cross-track conflict warnings and overall mix health.
    """
    profile = GENRE_PROFILES.get(genre, GENRE_PROFILES["pop"])
    suggestions = []
    conflicts = []
    valid_tracks = [(i, a) for i, a in enumerate(track_analyses) if "error" not in a]

    if not valid_tracks:
        return {"suggestions": [], "conflicts": [], "health_score": 0, "summary": "No valid tracks to analyze"}

    # ── Step 1: Volume balancing ──
    # Find average RMS across all tracks, suggest levels relative to that
    rms_values = [a["rms_db"] for _, a in valid_tracks]
    avg_rms = np.mean(rms_values)
    target_rms = -18.0  # Industry standard mix target

    for i, analysis in valid_tracks:
        s = {
            "track_index": i,
            "analysis": analysis,
            "volume": {},
            "pan": {},
            "eq": [],
            "compression": {},
            "warnings": [],
        }

        # ── Volume suggestion ──
        rms_diff = analysis["rms_db"] - avg_rms
        if abs(rms_diff) > 3:
            direction = "down" if rms_diff > 0 else "up"
            suggested_volume = max(0, min(1, 0.8 + (-rms_diff / 40)))
            s["volume"] = {
                "action": f"Turn {direction} ~{abs(round(rms_diff, 1))}dB",
                "suggested_value": round(suggested_volume, 2),
                "reason": f"Track is {abs(round(rms_diff,1))}dB {'louder' if rms_diff > 0 else 'quieter'} than mix average",
                "priority": "high" if abs(rms_diff) > 6 else "medium",
            }
        else:
            s["volume"] = {
                "action": "Level OK",
                "suggested_value": 0.8,
                "reason": "Track level is well-balanced with the mix",
                "priority": "low",
            }

        # ── Panning suggestion ──
        track_type = analysis["track_type"]
        bass_pct = analysis["bass_pct"]

        if track_type == "bass" or bass_pct > 40:
            s["pan"] = {
                "action": "Keep center",
                "suggested_value": 0.0,
                "reason": "Bass frequencies should stay centered for mono compatibility",
                "priority": "high",
            }
        elif track_type == "bright":
            # Alternate bright elements L/R
            bright_tracks = [j for j, a in valid_tracks if a["track_type"] == "bright"]
            pos_in_group = bright_tracks.index(i) if i in bright_tracks else 0
            pan_val = 0.4 if pos_in_group % 2 == 0 else -0.4
            s["pan"] = {
                "action": f"Pan {'right' if pan_val > 0 else 'left'} {abs(int(pan_val*100))}%",
                "suggested_value": round(pan_val, 2),
                "reason": "Spread bright elements across stereo field",
                "priority": "medium",
            }
        elif track_type == "midrange":
            mid_tracks = [j for j, a in valid_tracks if a["track_type"] == "midrange"]
            if len(mid_tracks) > 1:
                pos = mid_tracks.index(i) if i in mid_tracks else 0
                spread = [-0.3, 0.3, -0.5, 0.5, -0.15, 0.15]
                pan_val = spread[pos % len(spread)]
                s["pan"] = {
                    "action": f"Pan {'right' if pan_val > 0 else 'left'} {abs(int(pan_val*100))}%",
                    "suggested_value": round(pan_val, 2),
                    "reason": "Separate midrange elements for clarity",
                    "priority": "medium",
                }
            else:
                s["pan"] = {
                    "action": "Keep center or slight offset",
                    "suggested_value": 0.0,
                    "reason": "Single midrange element — center is fine",
                    "priority": "low",
                }
        else:
            s["pan"] = {
                "action": "Center",
                "suggested_value": 0.0,
                "reason": "Full-range track — center placement recommended",
                "priority": "low",
            }

        # ── EQ suggestions ──
        eq_suggestions = []

        # Sub rumble check
        if analysis["band_energy"]["sub"]["percentage"] > 15 and track_type != "bass":
            eq_suggestions.append({
                "band": "sub",
                "action": "High-pass filter at 80Hz",
                "type": "cut",
                "frequency": 80,
                "gain_db": -12,
                "reason": "Excessive sub-bass muddying the mix",
                "priority": "high",
            })

        # Muddy low-mids
        if analysis["band_energy"]["low_mid"]["percentage"] > 25:
            eq_suggestions.append({
                "band": "low_mid",
                "action": "Cut 2-3dB at 250-500Hz",
                "type": "cut",
                "frequency": 350,
                "gain_db": -2.5,
                "reason": "Low-mid buildup causing muddiness",
                "priority": "medium",
            })

        # Harsh upper-mids
        if analysis["band_energy"]["upper_mid"]["percentage"] > 20 and analysis["spectral_centroid"] > 3500:
            eq_suggestions.append({
                "band": "upper_mid",
                "action": "Cut 2dB at 2-4kHz",
                "type": "cut",
                "frequency": 3000,
                "gain_db": -2.0,
                "reason": "Harsh upper-midrange frequencies",
                "priority": "medium",
            })

        # Needs brightness (per genre)
        if profile["high_presence"] > 1.1 and analysis["high_pct"] < 15:
            eq_suggestions.append({
                "band": "presence",
                "action": "Boost 2dB at 5-8kHz",
                "type": "boost",
                "frequency": 6000,
                "gain_db": 2.0,
                "reason": f"Add air/brightness for {profile['name']} style",
                "priority": "low",
            })

        # Needs bass (per genre)
        if profile["bass_emphasis"] > 1.1 and analysis["bass_pct"] < 20 and track_type == "bass":
            eq_suggestions.append({
                "band": "bass",
                "action": "Boost 3dB at 60-100Hz",
                "type": "boost",
                "frequency": 80,
                "gain_db": 3.0,
                "reason": f"More low-end needed for {profile['name']} style",
                "priority": "medium",
            })

        s["eq"] = eq_suggestions

        # ── Compression suggestion ──
        dr = analysis["dynamic_range_db"]
        target_dr = profile["target_dynamic_range_db"]

        if dr > target_dr + 4:
            ratio = min(8, 2 + (dr - target_dr) / 4)
            s["compression"] = {
                "action": f"Add compression (ratio {ratio:.1f}:1)",
                "needed": True,
                "suggested_ratio": round(ratio, 1),
                "suggested_threshold": -20,
                "suggested_attack_ms": 10 if track_type in ["bright", "bass"] else 5,
                "suggested_release_ms": 100 if track_type == "bass" else 60,
                "reason": f"Dynamic range ({dr:.0f}dB) exceeds target ({target_dr}dB) for {profile['name']}",
                "priority": "high",
            }
        elif dr < target_dr - 4:
            s["compression"] = {
                "action": "Reduce compression / increase dynamics",
                "needed": False,
                "reason": f"Track is over-compressed ({dr:.0f}dB range vs {target_dr}dB target)",
                "priority": "medium",
            }
        else:
            s["compression"] = {
                "action": "Dynamics OK",
                "needed": False,
                "reason": f"Dynamic range ({dr:.0f}dB) is appropriate",
                "priority": "low",
            }

        # ── Clipping warning ──
        if analysis["is_clipping"]:
            s["warnings"].append({
                "type": "clipping",
                "message": f"Track is clipping (peak {analysis['peak_db']:.1f}dB). Reduce gain.",
                "priority": "critical",
            })

        suggestions.append(s)

    # ── Step 2: Cross-track frequency conflicts ──
    for i in range(len(valid_tracks)):
        for j in range(i + 1, len(valid_tracks)):
            idx_i, a_i = valid_tracks[i]
            idx_j, a_j = valid_tracks[j]

            # Check for bass conflict
            if a_i["bass_pct"] > 30 and a_j["bass_pct"] > 30:
                conflicts.append({
                    "tracks": [idx_i, idx_j],
                    "band": "bass",
                    "message": f"Track {idx_i+1} and Track {idx_j+1} both have heavy bass — EQ one to avoid muddiness",
                    "suggestion": f"High-pass Track {idx_j+1} at 100Hz or sidechain compress",
                    "priority": "high",
                })

            # Check for midrange masking
            if (a_i["track_type"] == "midrange" and a_j["track_type"] == "midrange"
                    and abs(a_i["spectral_centroid"] - a_j["spectral_centroid"]) < 400):
                conflicts.append({
                    "tracks": [idx_i, idx_j],
                    "band": "midrange",
                    "message": f"Track {idx_i+1} and Track {idx_j+1} are masking each other in the mids",
                    "suggestion": "Pan apart or EQ complementary cuts (boost one at 1kHz, cut the other)",
                    "priority": "medium",
                })

            # Check for brightness clash
            if a_i["track_type"] == "bright" and a_j["track_type"] == "bright":
                conflicts.append({
                    "tracks": [idx_i, idx_j],
                    "band": "highs",
                    "message": f"Track {idx_i+1} and Track {idx_j+1} are both bright — may sound harsh together",
                    "suggestion": "Pan to opposite sides or cut one at 6-8kHz",
                    "priority": "medium",
                })

    # ── Step 3: Overall mix health score ──
    score = 100
    for s in suggestions:
        for w in s["warnings"]:
            if w["priority"] == "critical": score -= 15
        if s["volume"].get("priority") == "high": score -= 8
        if s["compression"].get("priority") == "high": score -= 5
        for eq in s["eq"]:
            if eq["priority"] == "high": score -= 5
    for c in conflicts:
        if c["priority"] == "high": score -= 10
        elif c["priority"] == "medium": score -= 5

    score = max(0, min(100, score))

    # Summary
    high_issues = sum(1 for s in suggestions for w in s["warnings"] if w.get("priority") == "critical")
    high_issues += sum(1 for c in conflicts if c["priority"] == "high")

    if score >= 85:
        summary = "Mix is sounding great! Minor tweaks suggested."
    elif score >= 65:
        summary = f"Good foundation — {high_issues} issue(s) need attention."
    elif score >= 40:
        summary = f"Mix needs work — {high_issues} significant issue(s) found."
    else:
        summary = f"Major issues detected. Address {high_issues} critical problem(s) first."

    return {
        "suggestions": suggestions,
        "conflicts": conflicts,
        "health_score": score,
        "summary": summary,
        "genre_profile": profile["name"],
        "total_tracks_analyzed": len(valid_tracks),
    }


# =============================================================================
# HELPER: Download audio from URL to local temp file
# =============================================================================

def download_audio(url, dest_path):
    """Download audio from URL (Cloudinary or local) to a temp file."""
    import requests as req

    if url.startswith(('http://', 'https://')):
        r = req.get(url, timeout=30)
        r.raise_for_status()
        with open(dest_path, 'wb') as f:
            f.write(r.content)
    elif os.path.exists(url):
        import shutil
        shutil.copy2(url, dest_path)
    else:
        raise FileNotFoundError(f"Cannot access audio: {url}")


# =============================================================================
# API ROUTES
# =============================================================================

@ai_mix_assistant_bp.route('/api/ai/mix-assistant/analyze', methods=['POST'])
@jwt_required()
def analyze_mix():
    """
    Analyze a recording project and return AI mix suggestions.

    JSON body:
    {
        "project_id": 123,        // Analyze saved project tracks
        "genre": "hip_hop",       // Optional genre for profile-aware suggestions
    }

    OR multipart form with multiple audio files:
    - files[]: audio files
    - genre: optional genre string
    """
    user_id = get_jwt_identity()
    temp_dir = None

    try:
        genre = "pop"  # default
        track_files = []

        if request.is_json:
            # ── Mode A: Analyze from saved project ──
            data = request.get_json()
            project_id = data.get('project_id')
            genre = data.get('genre', 'pop')

            if not project_id:
                return jsonify({"error": "project_id is required"}), 400

            from src.api.models import RecordingProject
            project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
            if not project:
                return jsonify({"error": "Project not found"}), 404

            tracks = json.loads(project.tracks_json or '[]')
            temp_dir = tempfile.mkdtemp()

            for i, track in enumerate(tracks):
                url = track.get('audio_url')
                if not url:
                    continue
                ext = url.rsplit('.', 1)[-1] if '.' in url else 'wav'
                local_path = os.path.join(temp_dir, f"track_{i}.{ext}")
                try:
                    download_audio(url, local_path)
                    track_files.append({
                        "index": i,
                        "name": track.get('name', f'Track {i+1}'),
                        "path": local_path,
                    })
                except Exception as e:
                    print(f"⚠️ Could not download track {i}: {e}")

        else:
            # ── Mode B: Analyze uploaded files directly ──
            genre = request.form.get('genre', 'pop')
            files = request.files.getlist('files[]')
            if not files:
                files = request.files.getlist('files')
            if not files:
                return jsonify({"error": "No audio files provided"}), 400

            temp_dir = tempfile.mkdtemp()
            for i, f in enumerate(files):
                ext = f.filename.rsplit('.', 1)[-1] if '.' in f.filename else 'wav'
                local_path = os.path.join(temp_dir, f"track_{i}.{ext}")
                f.save(local_path)
                track_files.append({
                    "index": i,
                    "name": f.filename.rsplit('.', 1)[0][:30],
                    "path": local_path,
                })

        if not track_files:
            return jsonify({"error": "No audio tracks to analyze"}), 400

        # ── Analyze each track ──
        print(f"🎛️ AI Mix Assistant: Analyzing {len(track_files)} tracks (genre: {genre})")
        analyses = [None] * (max(t["index"] for t in track_files) + 1)

        for tf in track_files:
            print(f"  📊 Analyzing Track {tf['index']+1}: {tf['name']}")
            result = analyze_single_track(tf["path"])
            result["name"] = tf["name"]
            analyses[tf["index"]] = result

        # Fill gaps with empty
        analyses = [a if a else {"error": "No audio"} for a in analyses]

        # ── Generate suggestions ──
        result = generate_mix_suggestions(analyses, genre)
        result["analyzed_at"] = datetime.utcnow().isoformat()

        return jsonify({"success": True, **result}), 200

    except Exception as e:
        print(f"❌ Mix analysis error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

    finally:
        if temp_dir:
            try:
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass


@ai_mix_assistant_bp.route('/api/ai/mix-assistant/genres', methods=['GET'])
def get_mix_genres():
    """Get available genre profiles for mix analysis."""
    genres = []
    for key, profile in GENRE_PROFILES.items():
        genres.append({
            "id": key,
            "name": profile["name"],
            "description": profile["description"],
        })
    return jsonify({"genres": genres}), 200


@ai_mix_assistant_bp.route('/api/ai/mix-assistant/quick-analyze', methods=['POST'])
@jwt_required()
def quick_analyze_track():
    """
    Analyze a single track file. Returns raw analysis without mix context.
    Useful for real-time feedback when importing a track.

    Multipart form: file (audio file)
    """
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        temp_dir = tempfile.mkdtemp()
        ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'wav'
        path = os.path.join(temp_dir, f"track.{ext}")
        file.save(path)

        analysis = analyze_single_track(path)

        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

        return jsonify({"success": True, "analysis": analysis}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500