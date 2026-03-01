# =============================================================================
# sampler_storage_routes.py — Sampler/Beat Maker Cloud Storage & Sharing
# =============================================================================
# Location: src/api/sampler_storage_routes.py
# Register: app.register_blueprint(sampler_storage_bp)
#
# Uses SAME R2 pattern as recording_studio_routes.py:
#   r2_client.upload_fileobj() → Cloudinary fallback → local fallback
#
# MODELS: SamplerProject & SamplerKit live in src/api/models.py
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime
import os
import json
import uuid
import secrets

sampler_storage_bp = Blueprint("sampler_storage", __name__)

SAMPLER_UPLOAD_DIR = "uploads/sampler"


# =============================================================================
# JSON SAFE HELPERS  (same as recording_studio_routes)
# =============================================================================
def _json_loads_safe(value, default):
    if value is None or value == "":
        return default
    try:
        parsed = json.loads(value)
        return parsed if parsed is not None else default
    except Exception:
        return default


def _json_dumps_safe(value, default=None):
    if value is None:
        value = default or []
    try:
        return json.dumps(value)
    except Exception:
        return json.dumps(default or [])


# =============================================================================
# UPLOAD: R2 → Cloudinary → Local  (mirrors recording_studio_routes exactly)
# =============================================================================
def _upload_sampler_file(file, user_id, project_id, file_type="sample", pad_index=0):
    """
    Upload audio file with R2 primary, Cloudinary secondary, local fallback.
    Returns a URL string.
    """
    ext = "webm"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()

    unique_id = uuid.uuid4().hex[:8]

    # ── Try Cloudflare R2 first ──────────────────────────────────────────────
    try:
        from src.api.r2_storage_setup import r2_client, R2_BUCKET, R2_PUBLIC_URL
        if r2_client and R2_BUCKET and R2_PUBLIC_URL:
            r2_key = f"sampler/{user_id}/{project_id}/{file_type}_{pad_index}_{unique_id}.{ext}"
            r2_client.upload_fileobj(
                file,
                R2_BUCKET,
                r2_key,
                ExtraArgs={"ContentType": file.content_type or "audio/webm"},
            )
            return f"{R2_PUBLIC_URL}/{r2_key}"
    except Exception as r2_err:
        print(f"R2 sampler upload failed: {r2_err}")
        try:
            file.seek(0)
        except Exception:
            pass

    # ── Try R2 via uploadFile helper (alternate import path) ─────────────────
    try:
        from src.api.r2_storage_setup import uploadFile as r2_upload
        file.seek(0)
        url = r2_upload(file, f"sampler_{file_type}_{pad_index}_{unique_id}.{ext}")
        if url:
            return url
    except Exception as e2:
        print(f"R2 uploadFile helper failed: {e2}")
        try:
            file.seek(0)
        except Exception:
            pass

    # ── Try Cloudinary second ────────────────────────────────────────────────
    try:
        import cloudinary.uploader

        os.makedirs(SAMPLER_UPLOAD_DIR, exist_ok=True)
        temp_filename = f"{file_type}_{user_id}_{project_id}_{pad_index}_{unique_id}.{ext}"
        temp_filepath = os.path.join(SAMPLER_UPLOAD_DIR, temp_filename)
        file.save(temp_filepath)

        result = cloudinary.uploader.upload(
            temp_filepath,
            resource_type="video",  # Cloudinary uses "video" for audio
            folder=f"sampler/{user_id}/{project_id}",
            public_id=f"{file_type}_{pad_index}_{unique_id}",
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
        print(f"Cloudinary sampler upload failed: {cloud_err}")
        try:
            file.seek(0)
        except Exception:
            pass

    # ── Local fallback ───────────────────────────────────────────────────────
    os.makedirs(SAMPLER_UPLOAD_DIR, exist_ok=True)
    filename = f"{file_type}_{user_id}_{project_id}_{pad_index}_{unique_id}.{ext}"
    filepath = os.path.join(SAMPLER_UPLOAD_DIR, filename)

    try:
        file.seek(0)
    except Exception:
        pass

    file.save(filepath)
    return "/" + filepath.replace("\\", "/")


# =============================================================================
# DELETE: R2 → Cloudinary → Local  (mirrors recording_studio_routes exactly)
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

    # ── Try R2 deleteFile helper ─────────────────────────────────────────────
    try:
        from src.api.r2_storage_setup import deleteFile as r2_delete
        if r2_delete(url):
            return
    except Exception:
        pass

    # ── Try Cloudinary ───────────────────────────────────────────────────────
    try:
        if "cloudinary" in str(url):
            import cloudinary.uploader
            parts = url.split("/")
            last = parts[-1]
            public_id = last.rsplit(".", 1)[0]
            folder = "/".join(parts[-3:-1])
            if "sampler" in folder:
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
# SERIALIZE
# =============================================================================
def _serialize_project(project, include_pads=True):
    result = {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description or "",
        "bpm": project.bpm,
        "swing": project.swing or 0,
        "key": project.key_note or "C",
        "scale": project.scale or "major",
        "master_volume": float(project.master_volume or 0.8),
        "step_count": project.step_count or 16,
        "is_public": project.is_public or False,
        "share_token": project.share_token,
        "share_permissions": project.share_permissions or "view",
        "genre": project.genre or "",
        "tags": _json_loads_safe(project.tags_json, default=[]),
        "fork_count": project.fork_count or 0,
        "play_count": project.play_count or 0,
        "like_count": project.like_count or 0,
        "bounce_url": project.bounce_url,
        "forked_from_id": project.forked_from_id,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }
    if include_pads:
        result["pads"] = _json_loads_safe(project.pads_json, default=[])
        result["patterns"] = _json_loads_safe(project.patterns_json, default=[])
        result["song_sequence"] = _json_loads_safe(project.song_sequence_json, default=[])
        result["scenes"] = _json_loads_safe(project.scenes_json, default=[])
    try:
        if project.user:
            result["creator"] = {
                "id": project.user.id,
                "username": project.user.username,
                "display_name": getattr(project.user, "display_name", None) or project.user.username,
                "avatar_url": getattr(project.user, "profile_image_url", None),
            }
    except Exception:
        pass
    return result


def _serialize_kit(kit):
    return {
        "id": kit.id,
        "user_id": kit.user_id,
        "name": kit.name,
        "description": kit.description or "",
        "genre": kit.genre or "",
        "tags": _json_loads_safe(kit.tags_json, default=[]),
        "pads": _json_loads_safe(kit.pads_json, default=[]),
        "is_public": kit.is_public or False,
        "download_count": kit.download_count or 0,
        "created_at": kit.created_at.isoformat() if kit.created_at else None,
    }


# =============================================================================
# PROJECTS — CRUD
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects", methods=["POST"])
@jwt_required()
def create_sampler_project():
    """Create a new sampler project"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        data = request.get_json() or {}

        project = SamplerProject(
            user_id=user_id,
            name=data.get("name", "Untitled Beat"),
            description=data.get("description", ""),
            bpm=int(data.get("bpm", 120)),
            swing=int(data.get("swing", 0)),
            key_note=data.get("key", "C"),
            scale=data.get("scale", "major"),
            master_volume=float(data.get("master_volume", 0.8)),
            step_count=int(data.get("step_count", 16)),
            genre=data.get("genre", ""),
            tags_json=_json_dumps_safe(data.get("tags", []), default=[]),
            pads_json=_json_dumps_safe(data.get("pads", []), default=[]),
            patterns_json=_json_dumps_safe(data.get("patterns", []), default=[]),
            song_sequence_json=_json_dumps_safe(data.get("song_sequence", []), default=[]),
            scenes_json=_json_dumps_safe(data.get("scenes", []), default=[]),
            share_token=secrets.token_urlsafe(16),
        )
        db.session.add(project)
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_project(project)}), 201

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/projects", methods=["GET"])
@jwt_required()
def list_sampler_projects():
    """List all sampler projects for current user"""
    try:
        from src.api.models import SamplerProject

        user_id = get_jwt_identity()
        projects = (
            SamplerProject.query.filter_by(user_id=user_id)
            .order_by(SamplerProject.updated_at.desc())
            .all()
        )

        return jsonify({
            "success": True,
            "projects": [_serialize_project(p, include_pads=False) for p in projects],
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>", methods=["GET"])
@jwt_required()
def get_sampler_project(project_id):
    """Get a single sampler project with full pad/pattern data"""
    try:
        from src.api.models import SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        return jsonify({"success": True, "project": _serialize_project(project)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>", methods=["PUT"])
@jwt_required()
def update_sampler_project(project_id):
    """Update sampler project (manual save or auto-save)"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        data = request.get_json() or {}

        # String fields
        for field in ["name", "description", "scale", "genre"]:
            if field in data:
                setattr(project, field, data[field])
        if "key" in data:
            project.key_note = data["key"]

        # Integer fields
        for field in ["bpm", "swing", "step_count"]:
            if field in data:
                setattr(project, field, int(data[field]))

        # Float fields
        if "master_volume" in data:
            project.master_volume = float(data["master_volume"])

        # Boolean fields
        if "is_public" in data:
            project.is_public = bool(data["is_public"])
        if "share_permissions" in data:
            project.share_permissions = data["share_permissions"]

        # JSON fields
        if "tags" in data:
            project.tags_json = _json_dumps_safe(data["tags"], default=[])
        for field in ["pads", "patterns", "song_sequence", "scenes"]:
            if field in data:
                setattr(project, f"{field}_json", _json_dumps_safe(data[field], default=[]))

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_project(project)}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>", methods=["DELETE"])
@jwt_required()
def delete_sampler_project(project_id):
    """Delete sampler project and clean up R2/Cloudinary/local files"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Clean up sample files from R2
        pads = _json_loads_safe(project.pads_json, default=[])
        for pad in pads:
            url = (pad or {}).get("sampleUrl") or (pad or {}).get("sample_url")
            if url:
                _try_delete_file(url)

        if project.bounce_url:
            _try_delete_file(project.bounce_url)

        db.session.delete(project)
        db.session.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# SAMPLE UPLOAD / DELETE (per-pad audio → R2)
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/samples", methods=["POST"])
@jwt_required()
def upload_sample(project_id):
    """Upload a sample audio file for a specific pad → R2"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        file = request.files.get("file")
        pad_index = int(request.form.get("pad_index", 0))
        if not file:
            return jsonify({"error": "No file provided"}), 400

        allowed = {"mp3", "wav", "flac", "ogg", "webm", "aac", "m4a", "aiff"}
        ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
        if ext not in allowed:
            return jsonify({"error": f".{ext} not supported. Use: {', '.join(sorted(allowed))}"}), 400

        # Upload to R2/Cloudinary/local
        sample_url = _upload_sampler_file(file, user_id, project_id, "sample", pad_index)

        # Update pad JSON
        pads = _json_loads_safe(project.pads_json, default=[])
        while len(pads) <= pad_index:
            pads.append({})

        # Delete old sample if replacing
        old_url = (pads[pad_index] or {}).get("sampleUrl")
        if old_url:
            _try_delete_file(old_url)

        pads[pad_index] = pads[pad_index] or {}
        pads[pad_index]["sampleUrl"] = sample_url
        pads[pad_index]["sampleName"] = file.filename or f"Sample {pad_index + 1}"

        project.pads_json = _json_dumps_safe(pads, default=[])
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "sample_url": sample_url, "pad_index": pad_index}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/samples", methods=["DELETE"])
@jwt_required()
def delete_sample(project_id):
    """Delete a sample from a specific pad"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        data = request.get_json() or {}
        pad_index = int(data.get("pad_index", 0))
        pads = _json_loads_safe(project.pads_json, default=[])

        if pad_index < len(pads) and pads[pad_index]:
            url = pads[pad_index].get("sampleUrl")
            if url:
                _try_delete_file(url)
            pads[pad_index]["sampleUrl"] = None
            pads[pad_index]["sampleName"] = None

        project.pads_json = _json_dumps_safe(pads, default=[])
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


# =============================================================================
# BOUNCE — Upload rendered beat (WAV/MP3 → R2)
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/bounce", methods=["POST"])
@jwt_required()
def upload_bounce(project_id):
    """Upload the rendered beat export to R2"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file"}), 400

        # Delete old bounce
        if project.bounce_url:
            _try_delete_file(project.bounce_url)

        project.bounce_url = _upload_sampler_file(file, user_id, project_id, "bounce", 0)
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "bounce_url": project.bounce_url}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# DRUM KITS — Save/Load reusable kits
# =============================================================================

@sampler_storage_bp.route("/api/sampler/kits", methods=["POST"])
@jwt_required()
def save_kit():
    """Save current pad configuration as a reusable drum kit"""
    try:
        from src.api.models import db, SamplerKit

        user_id = get_jwt_identity()
        data = request.get_json() or {}

        kit = SamplerKit(
            user_id=user_id,
            name=data.get("name", "My Kit"),
            description=data.get("description", ""),
            genre=data.get("genre", ""),
            tags_json=_json_dumps_safe(data.get("tags", []), default=[]),
            pads_json=_json_dumps_safe(data.get("pads", []), default=[]),
            is_public=bool(data.get("is_public", False)),
        )
        db.session.add(kit)
        db.session.commit()

        return jsonify({"success": True, "kit": _serialize_kit(kit)}), 201

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/kits", methods=["GET"])
@jwt_required()
def list_kits():
    """List user's kits + optionally public kits"""
    try:
        from src.api.models import SamplerKit
        from sqlalchemy import or_

        user_id = get_jwt_identity()
        include_public = request.args.get("include_public", "false").lower() == "true"

        if include_public:
            kits = SamplerKit.query.filter(
                or_(SamplerKit.user_id == user_id, SamplerKit.is_public == True)
            ).order_by(SamplerKit.created_at.desc()).all()
        else:
            kits = SamplerKit.query.filter_by(user_id=user_id).order_by(SamplerKit.created_at.desc()).all()

        return jsonify({"success": True, "kits": [_serialize_kit(k) for k in kits]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/kits/<int:kit_id>", methods=["GET"])
@jwt_required()
def get_kit(kit_id):
    """Load a specific drum kit"""
    try:
        from src.api.models import db, SamplerKit

        user_id = get_jwt_identity()
        kit = SamplerKit.query.filter_by(id=kit_id).first()
        if not kit:
            return jsonify({"error": "Kit not found"}), 404
        if kit.user_id != int(user_id) and not kit.is_public:
            return jsonify({"error": "Not authorized"}), 403

        kit.download_count = (kit.download_count or 0) + 1
        db.session.commit()

        return jsonify({"success": True, "kit": _serialize_kit(kit)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/kits/<int:kit_id>", methods=["DELETE"])
@jwt_required()
def delete_kit(kit_id):
    """Delete a drum kit"""
    try:
        from src.api.models import db, SamplerKit

        user_id = get_jwt_identity()
        kit = SamplerKit.query.filter_by(id=kit_id, user_id=user_id).first()
        if not kit:
            return jsonify({"error": "Kit not found"}), 404

        db.session.delete(kit)
        db.session.commit()

        return jsonify({"success": True}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# SHARING — Public links, collaboration, community
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/share", methods=["POST"])
@jwt_required()
def share_project(project_id):
    """Generate or update share settings for a project"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        data = request.get_json() or {}

        if not project.share_token:
            project.share_token = secrets.token_urlsafe(16)

        project.share_permissions = data.get("permissions", "view")
        project.is_public = bool(data.get("is_public", False))
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "share_token": project.share_token,
            "share_url": f"/sampler/shared/{project.share_token}",
            "permissions": project.share_permissions,
            "is_public": project.is_public,
        }), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/shared/<share_token>", methods=["GET"])
def load_shared_project(share_token):
    """Load a shared project by token (no auth required for view)"""
    try:
        from src.api.models import db, SamplerProject

        project = SamplerProject.query.filter_by(share_token=share_token).first()
        if not project:
            return jsonify({"error": "Shared project not found"}), 404

        project.play_count = (project.play_count or 0) + 1
        db.session.commit()

        result = _serialize_project(project)
        result["share_permissions"] = project.share_permissions or "view"

        try:
            verify_jwt_in_request(optional=True)
            current_user = get_jwt_identity()
            result["is_owner"] = (str(current_user) == str(project.user_id))
        except Exception:
            result["is_owner"] = False

        return jsonify({"success": True, "project": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@sampler_storage_bp.route("/api/sampler/shared/<share_token>", methods=["PUT"])
@jwt_required()
def save_shared_project(share_token):
    """Collaborator save — requires edit permission"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        project = SamplerProject.query.filter_by(share_token=share_token).first()
        if not project:
            return jsonify({"error": "Shared project not found"}), 404

        is_owner = str(user_id) == str(project.user_id)
        if not is_owner and project.share_permissions != "edit":
            return jsonify({"error": "No edit permission"}), 403

        data = request.get_json() or {}

        for field in ["name", "description", "scale", "genre"]:
            if field in data:
                setattr(project, field, data[field])
        if "key" in data:
            project.key_note = data["key"]
        for field in ["bpm", "swing", "step_count"]:
            if field in data:
                setattr(project, field, int(data[field]))
        if "master_volume" in data:
            project.master_volume = float(data["master_volume"])
        for field in ["pads", "patterns", "song_sequence", "scenes"]:
            if field in data:
                setattr(project, f"{field}_json", _json_dumps_safe(data[field], default=[]))

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_project(project)}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# COMMUNITY — Browse public beats
# =============================================================================

@sampler_storage_bp.route("/api/sampler/community", methods=["GET"])
def browse_community():
    """Browse public beats — no auth required"""
    try:
        from src.api.models import SamplerProject

        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 20)), 50)
        genre = request.args.get("genre")
        sort = request.args.get("sort", "recent")

        query = SamplerProject.query.filter_by(is_public=True)

        if genre:
            query = query.filter(SamplerProject.genre.ilike(f"%{genre}%"))

        if sort == "popular":
            query = query.order_by(SamplerProject.play_count.desc())
        elif sort == "likes":
            query = query.order_by(SamplerProject.like_count.desc())
        elif sort == "forks":
            query = query.order_by(SamplerProject.fork_count.desc())
        else:
            query = query.order_by(SamplerProject.created_at.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "success": True,
            "beats": [_serialize_project(p, include_pads=False) for p in paginated.items],
            "total": paginated.total,
            "page": paginated.page,
            "pages": paginated.pages,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# FORK — Copy shared project to your account
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/fork", methods=["POST"])
@jwt_required()
def fork_project(project_id):
    """Fork a public/shared project into current user's account"""
    try:
        from src.api.models import db, SamplerProject

        user_id = get_jwt_identity()
        original = SamplerProject.query.filter_by(id=project_id).first()
        if not original:
            return jsonify({"error": "Project not found"}), 404

        is_owner = str(user_id) == str(original.user_id)
        if not is_owner and not original.is_public and original.share_permissions not in ("edit", "remix"):
            return jsonify({"error": "Cannot fork this project"}), 403

        fork = SamplerProject(
            user_id=user_id,
            name=f"{original.name} (Fork)",
            description=original.description,
            bpm=original.bpm,
            swing=original.swing,
            key_note=original.key_note,
            scale=original.scale,
            master_volume=original.master_volume,
            step_count=original.step_count,
            genre=original.genre,
            tags_json=original.tags_json,
            pads_json=original.pads_json,
            patterns_json=original.patterns_json,
            song_sequence_json=original.song_sequence_json,
            scenes_json=original.scenes_json,
            forked_from_id=original.id,
            share_token=secrets.token_urlsafe(16),
        )
        db.session.add(fork)

        original.fork_count = (original.fork_count or 0) + 1
        db.session.commit()

        return jsonify({"success": True, "project": _serialize_project(fork)}), 201

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500


# =============================================================================
# LIKE — Toggle like on a public beat
# =============================================================================

@sampler_storage_bp.route("/api/sampler/projects/<int:project_id>/like", methods=["POST"])
@jwt_required()
def toggle_like(project_id):
    """Toggle like on a beat (simple increment/decrement)"""
    try:
        from src.api.models import db, SamplerProject

        project = SamplerProject.query.filter_by(id=project_id).first()
        if not project:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json() or {}
        if data.get("unlike"):
            project.like_count = max(0, (project.like_count or 0) - 1)
        else:
            project.like_count = (project.like_count or 0) + 1

        db.session.commit()

        return jsonify({"success": True, "like_count": project.like_count}), 200

    except Exception as e:
        try:
            from src.api.models import db
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": str(e)}), 500