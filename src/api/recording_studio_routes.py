# =============================================================================
# recording_studio_routes.py - Multi-Track DAW Backend (FIXED + CONSISTENT)
# =============================================================================
# Location: src/api/recording_studio_routes.py
# Register: app.register_blueprint(recording_studio_bp)
#
# ✅ FIXES APPLIED
# -----------------------------------------------------------------------------
# 1) master_volume:
#    - Frontend sends 0..1
#    - Model SHOULD store 0..1 (recommended)
#    - Serializer returns 0..1 ALWAYS (handles legacy 0..100 rows gracefully)
#
# 2) tracks_json / piano_roll_notes_json / tags:
#    - Stored as JSON strings in Text columns
#    - Routes always read/write safely (no crashes on bad JSON)
#
# 3) track_count + duration_seconds:
#    - Uses project.sync_stats_from_tracks() if your model has it
#    - Otherwise falls back to basic count
#
# 4) project_id type:
#    - Always cast to int where needed (form strings -> int)
#
# 5) upload paths:
#    - Local fallback returns URL starting with /uploads/... (no double slashes)
#
# 6) delete cleanup:
#    - Best-effort delete for R2 / Cloudinary / local
#
# NOTE:
# If your DB still stores master_volume as 0..100, you can keep it that way,
# but then REMOVE the "store 0..1" conversion below and keep your old method.
# The code below is built for the cleaner 0..1 storage while supporting legacy.
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import json
import uuid

recording_studio_bp = Blueprint("recording_studio", __name__)

# If you serve static files from /uploads, keep this folder under your app root
STUDIO_UPLOAD_DIR = "uploads/studio"


# =============================================================================
# JSON SAFE HELPERS
# =============================================================================
def _json_loads_safe(value, default):
    if value is None or value == "":
        return default
    try:
        parsed = json.loads(value)
        return parsed if parsed is not None else default
    except Exception:
        return default


def _json_dumps_safe(value, default):
    if value is None:
        value = default
    try:
        return json.dumps(value)
    except Exception:
        return json.dumps(default)


# =============================================================================
# HELPER: Parse time signature string → top, bottom
# =============================================================================
def _parse_time_signature(ts_string):
    """Parse '4/4' into (top, bottom)."""
    try:
        if isinstance(ts_string, str) and "/" in ts_string:
            a, b = ts_string.split("/", 1)
            top = int(a.strip())
            bottom = int(b.strip())
            if top > 0 and bottom > 0:
                return top, bottom
    except Exception:
        pass
    return 4, 4


# =============================================================================
# HELPER: Normalize master_volume
# =============================================================================
def _normalize_master_volume_to_0_1(raw_vol, default=0.8):
    """
    Frontend sends 0..1 typically.
    If someone sends 0..100 (legacy UI), we convert to 0..1.
    Final stored value: 0..1 float.
    """
    if raw_vol is None:
        return float(default)
    try:
        v = float(raw_vol)
    except Exception:
        return float(default)

    # legacy percent style
    if v > 1.0:
        v = v / 100.0

    # clamp
    if v < 0:
        v = 0.0
    if v > 1.0:
        v = 1.0
    return float(v)


def _serialize_master_volume_0_1(project):
    """
    Always return 0..1 to frontend.
    Handles legacy DB rows stored as 0..100.
    """
    try:
        mv = float(project.master_volume or 0.8)
    except Exception:
        mv = 0.8

    # If legacy percent value stored:
    if mv > 1.0:
        mv = mv / 100.0

    # clamp
    mv = max(0.0, min(1.0, mv))
    return mv


# =============================================================================
# HELPER: Serialize project for the frontend
# =============================================================================
def _serialize_for_frontend(project):
    """Convert RecordingProject to the JSON the DAW frontend expects."""
    tracks = _json_loads_safe(getattr(project, "tracks_json", "[]"), default=[])

    # tags: your model uses Text; could be raw string or json string
    raw_tags = getattr(project, "tags", "[]")
    tags = _json_loads_safe(raw_tags, default=raw_tags if isinstance(raw_tags, str) else [])

    result = {
        "id": project.id,
        "user_id": project.user_id,

        "name": project.name,
        "description": project.description,
        "status": project.status,
        "genre": project.genre,

        "tags": tags,

        "bpm": project.bpm,
        "time_signature": f"{project.time_signature_top}/{project.time_signature_bottom}",
        "tracks": tracks,

        # ✅ always 0..1
        "master_volume": _serialize_master_volume_0_1(project),

        "metronome_enabled": project.metronome_enabled,
        "count_in_enabled": project.count_in_enabled,
        "duration_seconds": project.duration_seconds,
        "sample_rate": project.sample_rate,
        "track_count": project.track_count,

        "mixdown_url": project.mixdown_url,
        "mixdown_format": project.mixdown_format,
        "cover_art_url": project.cover_art_url,
        "is_published": project.is_published,
        "total_size_bytes": project.total_size_bytes,

        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }

    # Piano roll fields (graceful if columns don't exist yet)
    try:
        result["piano_roll_notes"] = _json_loads_safe(project.piano_roll_notes_json, default=[])
        result["piano_roll_key"] = project.piano_roll_key or "C"
        result["piano_roll_scale"] = project.piano_roll_scale or "major"
    except Exception:
        result["piano_roll_notes"] = []
        result["piano_roll_key"] = "C"
        result["piano_roll_scale"] = "major"

    return result


# =============================================================================
# HELPER: Upload audio file (R2 → Cloudinary → local fallback)
# =============================================================================
def _upload_audio_file(file, user_id, project_id, track_index, file_type="track"):
    """
    Upload audio file with R2 primary, Cloudinary secondary, local fallback.
    Returns a URL string.
    """
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()

    unique_id = uuid.uuid4().hex[:8]

    # ── Try Cloudflare R2 first ───────────────────────────────────────────────
    try:
        from src.api.r2_storage_setup import r2_client, R2_BUCKET, R2_PUBLIC_URL
        if r2_client and R2_BUCKET and R2_PUBLIC_URL:
            r2_key = f"studio/{user_id}/{project_id}/{file_type}_{track_index}_{unique_id}.{ext}"
            r2_client.upload_fileobj(
                file,
                R2_BUCKET,
                r2_key,
                ExtraArgs={"ContentType": file.content_type or "audio/webm"},
            )
            return f"{R2_PUBLIC_URL}/{r2_key}"
    except Exception as r2_err:
        print(f"R2 upload failed: {r2_err}")
        try:
            file.seek(0)
        except Exception:
            pass

    # ── Try Cloudinary second ────────────────────────────────────────────────
    try:
        import cloudinary.uploader

        os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
        temp_filename = f"{file_type}_{user_id}_{project_id}_{track_index}_{unique_id}.{ext}"
        temp_filepath = os.path.join(STUDIO_UPLOAD_DIR, temp_filename)
        file.save(temp_filepath)

        result = cloudinary.uploader.upload(
            temp_filepath,
            resource_type="video",  # Cloudinary uses "video" for audio
            folder=f"studio/{user_id}/{project_id}",
            public_id=f"{file_type}_{track_index}_{unique_id}",
            overwrite=True,
        )

        audio_url = result.get("secure_url")
        try:
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
        except Exception:
            pass

        if audio_url:
            return audio_url

    except Exception as cloud_err:
        print(f"Cloudinary upload failed: {cloud_err}")
        try:
            # ensure local fallback has file data
            file.seek(0)
        except Exception:
            pass

    # ── Local fallback ───────────────────────────────────────────────────────
    os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
    filename = f"{file_type}_{user_id}_{project_id}_{track_index}_{unique_id}.{ext}"
    filepath = os.path.join(STUDIO_UPLOAD_DIR, filename)

    try:
        file.seek(0)
    except Exception:
        pass

    file.save(filepath)

    # IMPORTANT: return URL style path for frontend
    # e.g. "/uploads/studio/track_1_2_...webm"
    return "/" + filepath.replace("\\", "/")


# =============================================================================
# HELPER: Try delete a file from R2 / Cloudinary / local
# =============================================================================
def _try_delete_file(url):
    """Best-effort delete from wherever the file lives."""
    if not url:
        return

    # ── Try R2 ───────────────────────────────────────────────────────────────
    try:
        from src.api.r2_storage_setup import r2_client, R2_BUCKET, R2_PUBLIC_URL
        if r2_client and R2_BUCKET and R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL):
            key = url.replace(R2_PUBLIC_URL.rstrip("/") + "/", "")
            r2_client.delete_object(Bucket=R2_BUCKET, Key=key)
            return
    except Exception:
        pass

    # ── Try Cloudinary ───────────────────────────────────────────────────────
    try:
        if "cloudinary" in url:
            import cloudinary.uploader

            # If you stored secure_url only, extracting public_id can be tricky.
            # Best practice: store public_id separately. This is a best-effort fallback.
            # Attempt: find ".../studio/{user}/{project}/<public_id>.<ext>"
            parts = url.split("/")
            last = parts[-1]
            public_id = last.rsplit(".", 1)[0]
            # folder is typically the two segments before filename:
            folder = "/".join(parts[-3:-1])
            # if folder contains "studio/...", this becomes "studio/.../<public_id>"
            if "studio" in folder:
                public_id_full = f"{folder}/{public_id}"
            else:
                public_id_full = public_id

            cloudinary.uploader.destroy(public_id_full, resource_type="video")
            return
    except Exception:
        pass

    # ── Try local ────────────────────────────────────────────────────────────
    try:
        local_path = url.lstrip("/")
        if os.path.exists(local_path):
            os.remove(local_path)
    except Exception:
        pass


# =============================================================================
# PROJECTS - LIST ALL
# =============================================================================
@recording_studio_bp.route("/api/studio/projects", methods=["GET"])
@jwt_required()
def get_projects():
    """Get all recording projects for current user"""
    try:
        from src.api.models import RecordingProject

        user_id = get_jwt_identity()
        projects = (
            RecordingProject.query.filter_by(user_id=user_id)
            .order_by(RecordingProject.updated_at.desc())
            .all()
        )

        return jsonify({"success": True, "projects": [_serialize_for_frontend(p) for p in projects]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - CREATE
# =============================================================================
@recording_studio_bp.route("/api/studio/projects", methods=["POST"])
@jwt_required()
def create_project():
    """Create a new recording project"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        data = request.get_json() or {}

        ts_top, ts_bottom = _parse_time_signature(data.get("time_signature", "4/4"))
        master_vol = _normalize_master_volume_to_0_1(data.get("master_volume", 0.8))
        tracks_data = data.get("tracks", []) or []

        # tags can be list or string
        tags = data.get("tags", [])
        tags_json = _json_dumps_safe(tags, default=[])

        project = RecordingProject(
            user_id=user_id,
            name=data.get("name", "Untitled Project"),
            description=data.get("description"),
            status=data.get("status", "draft"),
            genre=data.get("genre"),
            tags=tags_json,
            bpm=int(data.get("bpm", 120) or 120),
            time_signature_top=ts_top,
            time_signature_bottom=ts_bottom,
            tracks_json=_json_dumps_safe(tracks_data, default=[]),
            master_volume=master_vol,  # ✅ store 0..1
            track_count=len(tracks_data),
        )

        # Piano roll fields (safe if columns not migrated yet)
        try:
            project.piano_roll_notes_json = _json_dumps_safe(data.get("piano_roll_notes", []), default=[])
            project.piano_roll_key = data.get("piano_roll_key", "C")
            project.piano_roll_scale = data.get("piano_roll_scale", "major")
        except Exception:
            pass

        # ✅ keep derived stats in sync if your model has this method
        try:
            project.sync_stats_from_tracks()
        except Exception:
            # fallback: at least keep track_count correct
            project.track_count = len(tracks_data)

        db.session.add(project)
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_for_frontend(project)}), 201

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - GET ONE
# =============================================================================
@recording_studio_bp.route("/api/studio/projects/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project(project_id):
    """Get a single project with all track data"""
    try:
        from src.api.models import RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        return jsonify({"success": True, "project": _serialize_for_frontend(project)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - UPDATE
# =============================================================================
@recording_studio_bp.route("/api/studio/projects/<int:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    """Update project metadata and track state"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        data = request.get_json() or {}

        if "name" in data:
            project.name = data["name"]

        if "description" in data:
            project.description = data["description"]

        if "status" in data:
            project.status = data["status"]

        if "genre" in data:
            project.genre = data["genre"]

        if "tags" in data:
            project.tags = _json_dumps_safe(data.get("tags"), default=[])

        if "bpm" in data:
            project.bpm = int(data.get("bpm") or 120)

        if "time_signature" in data:
            ts_top, ts_bottom = _parse_time_signature(data["time_signature"])
            project.time_signature_top = ts_top
            project.time_signature_bottom = ts_bottom

        if "master_volume" in data:
            project.master_volume = _normalize_master_volume_to_0_1(data["master_volume"])

        if "tracks" in data:
            tracks_data = data.get("tracks", []) or []
            project.tracks_json = _json_dumps_safe(tracks_data, default=[])
            project.track_count = len(tracks_data)
            try:
                project.sync_stats_from_tracks()
            except Exception:
                pass

        # Piano roll fields (safe if columns not migrated yet)
        try:
            if "piano_roll_notes" in data:
                project.piano_roll_notes_json = _json_dumps_safe(data.get("piano_roll_notes"), default=[])
            if "piano_roll_key" in data:
                project.piano_roll_key = data["piano_roll_key"]
            if "piano_roll_scale" in data:
                project.piano_roll_scale = data["piano_roll_scale"]
        except Exception:
            pass

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_for_frontend(project)}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - DELETE
# =============================================================================
@recording_studio_bp.route("/api/studio/projects/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_project(project_id):
    """Delete a project and its tracks"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Clean up uploaded audio files referenced on tracks
        tracks = _json_loads_safe(project.tracks_json, default=[])

        for track in tracks:
            # Your track schema uses audio_url (underscore)
            audio_url = (track or {}).get("audio_url")
            if audio_url and not str(audio_url).startswith("blob:"):
                _try_delete_file(audio_url)

            # If you later store region-level audio URLs in regions:
            regions = (track or {}).get("regions", []) or []
            for region in regions:
                reg_url = (region or {}).get("audioUrl") or (region or {}).get("audio_url")
                if reg_url and not str(reg_url).startswith("blob:"):
                    _try_delete_file(reg_url)

        if project.mixdown_url:
            _try_delete_file(project.mixdown_url)

        db.session.delete(project)
        db.session.commit()

        return jsonify({"success": True, "message": "Project deleted"}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# TRACK AUDIO UPLOAD (from recording)
# =============================================================================
@recording_studio_bp.route("/api/studio/tracks/upload", methods=["POST"])
@jwt_required()
def upload_track_audio():
    """
    Upload a recorded audio blob for a specific track.
    multipart form-data:
      - file
      - project_id
      - track_index
      - track_name (optional)
    """
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        file = request.files.get("file")
        project_id_raw = request.form.get("project_id")
        track_index = int(request.form.get("track_index", 0))

        if not file:
            return jsonify({"error": "No audio file provided"}), 400
        if not project_id_raw:
            return jsonify({"error": "Project ID required"}), 400

        try:
            project_id = int(project_id_raw)
        except Exception:
            return jsonify({"error": "Invalid project_id"}), 400

        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        audio_url = _upload_audio_file(file, user_id, project_id, track_index, "track")

        tracks = _json_loads_safe(project.tracks_json, default=[])

        # Ensure tracks list is long enough
        palette = ["#e8652b", "#1a4d7c", "#10b981", "#f59e0b", "#7c3aed", "#06b6d4", "#f43f5e", "#84cc16"]
        while len(tracks) <= track_index:
            tracks.append({
                "name": f"Track {len(tracks) + 1}",
                "volume": 0.8,
                "pan": 0,
                "muted": False,
                "solo": False,
                "armed": False,
                "audio_url": None,
                "color": palette[len(tracks) % len(palette)],
                "regions": [],
                "fx": {"eq": False, "comp": False, "reverb": False, "delay": False},
            })

        tracks[track_index]["audio_url"] = audio_url

        # optional rename
        track_name = request.form.get("track_name")
        if track_name:
            tracks[track_index]["name"] = str(track_name)[:40]

        project.tracks_json = _json_dumps_safe(tracks, default=[])
        project.track_count = len(tracks)

        try:
            project.sync_stats_from_tracks()
        except Exception:
            pass

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "audio_url": audio_url, "track_index": track_index}), 200

    except Exception as e:
        print(f"Track upload error: {e}")
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# IMPORT EXISTING AUDIO FILE TO TRACK
# =============================================================================
@recording_studio_bp.route("/api/studio/tracks/import", methods=["POST"])
@jwt_required()
def import_audio_to_track():
    """Import an existing audio file (mp3, wav, etc.) into a track"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        file = request.files.get("file")
        project_id_raw = request.form.get("project_id")
        track_index = int(request.form.get("track_index", 0))

        if not file:
            return jsonify({"error": "No audio file provided"}), 400
        if not project_id_raw:
            return jsonify({"error": "Project ID required"}), 400

        try:
            project_id = int(project_id_raw)
        except Exception:
            return jsonify({"error": "Invalid project_id"}), 400

        allowed_ext = {"mp3", "wav", "flac", "ogg", "webm", "aac", "m4a"}
        ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
        if ext not in allowed_ext:
            return jsonify({"error": f"File type .{ext} not supported"}), 400

        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        audio_url = _upload_audio_file(file, user_id, project_id, track_index, "import")

        tracks = _json_loads_safe(project.tracks_json, default=[])
        palette = ["#e8652b", "#1a4d7c", "#10b981", "#f59e0b", "#7c3aed", "#06b6d4", "#f43f5e", "#84cc16"]

        while len(tracks) <= track_index:
            tracks.append({
                "name": f"Track {len(tracks) + 1}",
                "volume": 0.8, "pan": 0, "muted": False,
                "solo": False, "armed": False, "audio_url": None,
                "color": palette[len(tracks) % len(palette)],
                "regions": [],
                "fx": {"eq": False, "comp": False, "reverb": False, "delay": False},
            })

        tracks[track_index]["audio_url"] = audio_url
        if file.filename:
            tracks[track_index]["name"] = file.filename.rsplit(".", 1)[0][:30]

        project.tracks_json = _json_dumps_safe(tracks, default=[])
        project.track_count = len(tracks)

        try:
            project.sync_stats_from_tracks()
        except Exception:
            pass

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "audio_url": audio_url, "track_index": track_index, "filename": file.filename}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# MIXDOWN - Bounce upload
# =============================================================================
@recording_studio_bp.route("/api/studio/projects/<int:project_id>/mixdown", methods=["POST"])
@jwt_required()
def mixdown_project(project_id):
    """
    Client mixes offline (OfflineAudioContext) then uploads the mixed file here.
    """
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No mixdown file provided"}), 400

        # Delete old mixdown if exists
        if project.mixdown_url:
            _try_delete_file(project.mixdown_url)

        audio_url = _upload_audio_file(file, user_id, project_id, 0, "mixdown")

        project.mixdown_url = audio_url
        project.mixdown_format = "wav"
        project.mixdown_created_at = datetime.utcnow()
        project.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "mixdown_url": audio_url}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# DELETE TRACK AUDIO
# =============================================================================
@recording_studio_bp.route("/api/studio/tracks/delete", methods=["POST"])
@jwt_required()
def delete_track_audio():
    """Clear audio from a specific track"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        data = request.get_json() or {}
        project_id = data.get("project_id")
        track_index = int(data.get("track_index", 0))

        try:
            project_id = int(project_id)
        except Exception:
            return jsonify({"error": "Invalid project_id"}), 400

        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        tracks = _json_loads_safe(project.tracks_json, default=[])

        if 0 <= track_index < len(tracks):
            audio_url = (tracks[track_index] or {}).get("audio_url")
            if audio_url and not str(audio_url).startswith("blob:"):
                _try_delete_file(audio_url)

            tracks[track_index]["audio_url"] = None
            project.tracks_json = _json_dumps_safe(tracks, default=[])

            try:
                project.sync_stats_from_tracks()
            except Exception:
                pass

            project.updated_at = datetime.utcnow()
            db.session.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500