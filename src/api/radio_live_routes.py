# =============================================================================
# radio_live_routes.py — Live Radio Backend Routes
# Handles: WebSocket signaling, stream keys, recording upload, PlayMix submission
# Add to app.py: from api.radio_live_routes import radio_live_bp; app.register_blueprint(radio_live_bp)
# =============================================================================

import os, uuid, json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import SocketIO, emit, join_room, leave_room
from api.models import db, RadioStation, User
from api.utils.cloudflare_r2 import upload_to_r2
import jwt as pyjwt

radio_live_bp = Blueprint("radio_live", __name__)

# ── Helper: get user from JWT ─────────────────────────────────────────────────
def get_user_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ")[1]
    try:
        data = pyjwt.decode(token, os.environ.get("FLASK_APP_KEY", "secret"), algorithms=["HS256"])
        return User.query.get(data.get("sub") or data.get("id"))
    except:
        return None

# ── Stream Key ────────────────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/stream-key", methods=["GET"])
def get_stream_key(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404

    # Generate deterministic stream key (regeneratable)
    stream_key = f"spx_{station_id}_{user.id}_{station.name[:8].replace(' ','_').lower()}"
    return jsonify({"stream_key": stream_key, "rtmp_url": "rtmp://stream.streampirex.com/live"})

@radio_live_bp.route("/api/radio/<int:station_id>/stream-key/regenerate", methods=["POST"])
def regenerate_stream_key(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404
    new_key = f"spx_{station_id}_{user.id}_{uuid.uuid4().hex[:8]}"
    return jsonify({"stream_key": new_key})

# ── Toggle Live (enhanced) ────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/toggle-live", methods=["POST"])
def toggle_live(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404

    data = request.get_json() or {}
    is_live = data.get("is_live", not station.is_live)
    mode = data.get("mode", "audio")  # audio | video
    stream_key = data.get("stream_key")

    station.is_live = is_live
    if is_live:
        station.stream_url = station.stream_url  # keep existing
        station.is_webrtc_enabled = True
        # Store mode in metadata if needed
    else:
        station.is_webrtc_enabled = False

    db.session.commit()

    return jsonify({
        "success": True,
        "is_live": station.is_live,
        "mode": mode,
        "stream_key": stream_key,
        "station": station.serialize()
    })

# ── Upload Recording to R2 ────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/upload-recording", methods=["POST"])
def upload_recording(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["file"]
    filename = f"radio/{station_id}/recordings/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

    try:
        url = upload_to_r2(file, filename, content_type=file.content_type or "audio/webm")
        return jsonify({"success": True, "url": url, "filename": filename})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── PlayMix Submission ────────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/playmix/submit", methods=["POST"])
def submit_to_playmix(station_id):
    """
    Submit a track to station's PlayMix rotation with full PRO/BMI/ASCAP data.
    Requires multipart form with audio file + metadata.
    """
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id).first()
    if not station:
        return jsonify({"error": "Station not found"}), 404

    # Validate required fields
    title = request.form.get("title", "").strip()
    artist = request.form.get("artist", "").strip()
    genre = request.form.get("genre", "").strip()
    release_date = request.form.get("release_date", "").strip()

    if not all([title, artist, genre, release_date]):
        return jsonify({"error": "Missing required fields: title, artist, genre, release_date"}), 400

    # Parse songwriters JSON
    try:
        songwriters = json.loads(request.form.get("songwriters", "[]"))
    except:
        songwriters = []

    # Validate songwriter splits add up to 100
    total_share = sum(float(s.get("share", 0)) for s in songwriters)
    if songwriters and abs(total_share - 100) > 0.1:
        return jsonify({"error": f"Songwriter splits must total 100% (currently {total_share:.1f}%)"}), 400

    # Upload audio file to R2
    if "audio" not in request.files:
        return jsonify({"error": "Audio file required"}), 400

    audio_file = request.files["audio"]
    audio_ext = audio_file.filename.rsplit(".", 1)[-1].lower() if "." in audio_file.filename else "webm"
    audio_filename = f"radio/{station_id}/playmix/{uuid.uuid4().hex}.{audio_ext}"

    cover_url = None
    if "cover" in request.files:
        cover_file = request.files["cover"]
        cover_ext = cover_file.filename.rsplit(".", 1)[-1].lower() if "." in cover_file.filename else "jpg"
        cover_filename = f"radio/{station_id}/covers/{uuid.uuid4().hex}.{cover_ext}"
        try:
            cover_url = upload_to_r2(cover_file, cover_filename, content_type=cover_file.content_type or "image/jpeg")
        except:
            pass

    try:
        audio_url = upload_to_r2(audio_file, audio_filename, content_type=audio_file.content_type or "audio/mpeg")
    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

    # Build track record for playlist_schedule
    track = {
        "id": str(uuid.uuid4()),
        "title": title,
        "artist": artist,
        "album": request.form.get("album", ""),
        "label": request.form.get("label", ""),
        "genre": genre,
        "bpm": request.form.get("bpm", ""),
        "key": request.form.get("key", ""),
        "duration": request.form.get("duration", ""),
        "release_date": release_date,
        "language": request.form.get("language", "English"),
        "is_explicit": request.form.get("is_explicit", "false").lower() == "true",
        "audio_url": audio_url,
        "cover_url": cover_url,
        "submitted_by": user.id,
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "pending",  # pending | approved | rejected

        # PRO / BMI / ASCAP fields
        "isrc": request.form.get("isrc", "").strip().upper(),
        "iswc": request.form.get("iswc", "").strip().upper(),
        "songwriters": songwriters,
        "publisher": request.form.get("publisher", ""),
        "publisher_pro": request.form.get("publisher_pro", ""),
        "publisher_ipi": request.form.get("publisher_ipi", ""),
        "master_owner": request.form.get("master_owner", ""),
        "sync_rights": request.form.get("sync_rights", "true").lower() == "true",
        "performance_rights": request.form.get("performance_rights", "true").lower() == "true",
        "mechanical_rights": request.form.get("mechanical_rights", "true").lower() == "true",
        "exclusive_to_station": request.form.get("exclusive_to_station", "false").lower() == "true",
        "license": request.form.get("license", "all_rights_reserved"),
        "notes": request.form.get("notes", ""),

        # Play tracking (for PRO reporting)
        "play_count": 0,
        "last_played": None,
        "total_duration_played": 0,  # in seconds — for performance royalty calculation
    }

    # Add to station's playlist_schedule
    schedule = station.playlist_schedule or {"tracks": []}
    if "tracks" not in schedule:
        schedule["tracks"] = []
    schedule["tracks"].append(track)
    station.playlist_schedule = schedule

    # Update song count
    # station.song_count = len(schedule["tracks"])  # if column exists

    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"'{title}' submitted to PlayMix rotation",
        "track_id": track["id"],
        "track": track
    }), 201


# ── PlayMix: Get tracks ───────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/playmix/tracks", methods=["GET"])
def get_playmix_tracks(station_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id).first()
    if not station:
        return jsonify({"error": "Not found"}), 404

    # Only owner sees pending tracks; public sees approved
    tracks = (station.playlist_schedule or {}).get("tracks", [])
    if station.user_id != user.id:
        tracks = [t for t in tracks if t.get("status") == "approved"]

    return jsonify({"tracks": tracks, "count": len(tracks)})


# ── PlayMix: Approve / Reject track (station owner only) ────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/playmix/tracks/<track_id>/status", methods=["PATCH"])
def update_track_status(station_id, track_id):
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Not found or not owner"}), 404

    data = request.get_json() or {}
    new_status = data.get("status")  # approved | rejected | pending
    if new_status not in ["approved", "rejected", "pending"]:
        return jsonify({"error": "Invalid status"}), 400

    schedule = station.playlist_schedule or {"tracks": []}
    for track in schedule.get("tracks", []):
        if track.get("id") == track_id:
            track["status"] = new_status
            track["reviewed_at"] = datetime.utcnow().isoformat()
            track["reviewed_by"] = user.id
            break

    station.playlist_schedule = schedule
    db.session.commit()

    return jsonify({"success": True, "track_id": track_id, "status": new_status})


# ── PlayMix: Log a play (for PRO reporting) ──────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/playmix/log-play", methods=["POST"])
def log_play(station_id):
    """
    Called by the player every time a track finishes playing.
    Records play data for BMI/ASCAP/SESAC performance royalty reporting.
    """
    data = request.get_json() or {}
    track_id = data.get("track_id")
    duration_played = data.get("duration_played", 0)  # seconds actually played
    listener_count = data.get("listener_count", 1)

    station = RadioStation.query.get(station_id)
    if not station:
        return jsonify({"error": "Not found"}), 404

    schedule = station.playlist_schedule or {"tracks": []}
    for track in schedule.get("tracks", []):
        if track.get("id") == track_id:
            track["play_count"] = track.get("play_count", 0) + 1
            track["last_played"] = datetime.utcnow().isoformat()
            track["total_duration_played"] = track.get("total_duration_played", 0) + duration_played

            # Build play log entry for PRO reporting
            play_log = track.get("play_log", [])
            play_log.append({
                "timestamp": datetime.utcnow().isoformat(),
                "duration_played": duration_played,
                "listener_count": listener_count,
                "station_id": station_id,
                "station_name": station.name,
                "isrc": track.get("isrc", ""),
                "songwriters": track.get("songwriters", []),
                "publisher": track.get("publisher", ""),
            })
            # Keep last 1000 play log entries per track
            track["play_log"] = play_log[-1000:]
            break

    # Update total plays
    station.total_plays = (station.total_plays or 0) + 1
    station.playlist_schedule = schedule
    db.session.commit()

    return jsonify({"success": True})


# ── PRO Report Export ────────────────────────────────────────────────────────
@radio_live_bp.route("/api/radio/<int:station_id>/playmix/pro-report", methods=["GET"])
def export_pro_report(station_id):
    """
    Export play data in format suitable for BMI/ASCAP/SESAC reporting.
    Returns JSON; can be formatted as CSV on the frontend.
    """
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    station = RadioStation.query.filter_by(id=station_id, user_id=user.id).first()
    if not station:
        return jsonify({"error": "Not found"}), 404

    tracks = (station.playlist_schedule or {}).get("tracks", [])
    report = []
    for track in tracks:
        if track.get("play_count", 0) > 0:
            for sw in (track.get("songwriters") or [{"name": "Unknown", "pro": "Unknown", "ipi": "", "share": 100}]):
                report.append({
                    "title": track.get("title", ""),
                    "artist": track.get("artist", ""),
                    "isrc": track.get("isrc", ""),
                    "iswc": track.get("iswc", ""),
                    "songwriter": sw.get("name", ""),
                    "songwriter_pro": sw.get("pro", ""),
                    "songwriter_ipi": sw.get("ipi", ""),
                    "songwriter_share_pct": sw.get("share", ""),
                    "publisher": track.get("publisher", ""),
                    "publisher_pro": track.get("publisher_pro", ""),
                    "publisher_ipi": track.get("publisher_ipi", ""),
                    "play_count": track.get("play_count", 0),
                    "total_duration_played_sec": track.get("total_duration_played", 0),
                    "last_played": track.get("last_played", ""),
                    "station_name": station.name,
                    "station_id": station_id,
                    "report_generated": datetime.utcnow().isoformat(),
                })

    return jsonify({
        "station": station.name,
        "period": request.args.get("period", "all"),
        "total_tracks": len(tracks),
        "total_plays": sum(t.get("play_count", 0) for t in tracks),
        "report": report
    })
