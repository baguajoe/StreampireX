# =============================================================================
# recording_studio_routes.py - Multi-Track DAW Backend
# =============================================================================
# Location: src/api/recording_studio_routes.py
# Register: app.register_blueprint(recording_studio_bp)
#
# Works with RecordingProject model (table: recording_projects)
# Uses time_signature_top / time_signature_bottom (integer columns)
# Frontend sends time_signature as "4/4" string — routes split/merge it
# Frontend sends master_volume as 0-1 — model stores as 0-100
# =============================================================================

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os
import json
import uuid
import tempfile

recording_studio_bp = Blueprint('recording_studio', __name__)

STUDIO_UPLOAD_DIR = "uploads/studio"


# =============================================================================
# HELPER: Serialize project for the frontend
# =============================================================================
# The frontend expects:
#   - "tracks" as parsed array (not raw "tracks_json" string)
#   - "master_volume" as 0-1 (not 0-100)
#   - "time_signature" as "4/4" string
#   - "piano_roll_notes" as parsed array
# =============================================================================

def _serialize_for_frontend(project):
    """Convert RecordingProject to the JSON the DAW frontend expects."""
    tracks = []
    try:
        tracks = json.loads(project.tracks_json or '[]')
    except Exception:
        tracks = []

    result = {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "genre": project.genre,
        "tags": project.tags,
        "bpm": project.bpm,
        "time_signature": f"{project.time_signature_top}/{project.time_signature_bottom}",
        "tracks": tracks,
        "master_volume": project.master_volume / 100.0 if project.master_volume > 1 else project.master_volume,
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
        result["piano_roll_notes"] = json.loads(project.piano_roll_notes_json or '[]')
        result["piano_roll_key"] = project.piano_roll_key or 'C'
        result["piano_roll_scale"] = project.piano_roll_scale or 'major'
    except (AttributeError, Exception):
        result["piano_roll_notes"] = []
        result["piano_roll_key"] = 'C'
        result["piano_roll_scale"] = 'major'

    return result


# =============================================================================
# HELPER: Parse time signature string → top, bottom
# =============================================================================

def _parse_time_signature(ts_string):
    """Parse '4/4' string into (top, bottom) integers."""
    try:
        if isinstance(ts_string, str) and '/' in ts_string:
            parts = ts_string.split('/')
            return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        pass
    return 4, 4


# =============================================================================
# HELPER: Convert frontend master_volume (0-1) to model (0-100)
# =============================================================================

def _normalize_master_volume(raw_vol):
    """Frontend sends 0-1, model stores 0-100."""
    if raw_vol is None:
        return 80.0
    raw_vol = float(raw_vol)
    if raw_vol <= 1.0:
        return raw_vol * 100.0
    return raw_vol


# =============================================================================
# HELPER: Upload audio file (R2 → Cloudinary → local fallback)
# =============================================================================

def _upload_audio_file(file, user_id, project_id, track_index, file_type='track'):
    """Upload audio file with R2 primary, Cloudinary secondary, local fallback."""
    ext = 'webm'
    if file.filename and '.' in file.filename:
        ext = file.filename.rsplit('.', 1)[-1].lower()
    unique_id = uuid.uuid4().hex[:8]
    
    # ── Try Cloudflare R2 first ──
    try:
        from src.api.r2_storage_setup import r2_client, R2_BUCKET, R2_PUBLIC_URL
        if r2_client and R2_BUCKET:
            r2_key = f"studio/{user_id}/{project_id}/{file_type}_{track_index}_{unique_id}.{ext}"
            r2_client.upload_fileobj(
                file,
                R2_BUCKET,
                r2_key,
                ExtraArgs={'ContentType': file.content_type or 'audio/webm'}
            )
            return f"{R2_PUBLIC_URL}/{r2_key}"
    except Exception as r2_err:
        print(f"R2 upload failed: {r2_err}")
        # Reset file position for next attempt
        try:
            file.seek(0)
        except Exception:
            pass

    # ── Try Cloudinary second ──
    try:
        import cloudinary.uploader
        # Save to temp file for Cloudinary
        os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
        temp_filename = f"{file_type}_{user_id}_{project_id}_{track_index}_{unique_id}.{ext}"
        temp_filepath = os.path.join(STUDIO_UPLOAD_DIR, temp_filename)
        file.save(temp_filepath)
        
        result = cloudinary.uploader.upload(
            temp_filepath,
            resource_type="video",  # Cloudinary uses "video" for audio
            folder=f"studio/{user_id}/{project_id}",
            public_id=f"{file_type}_{track_index}_{unique_id}"
        )
        audio_url = result.get('secure_url', temp_filepath)
        # Clean up local temp file after cloud upload
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        return audio_url
    except Exception as cloud_err:
        print(f"Cloudinary upload failed: {cloud_err}")

    # ── Fallback: local storage ──
    os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
    filename = f"{file_type}_{user_id}_{project_id}_{track_index}_{unique_id}.{ext}"
    filepath = os.path.join(STUDIO_UPLOAD_DIR, filename)
    try:
        file.seek(0)
    except Exception:
        pass
    file.save(filepath)
    return f"/{filepath}"


# =============================================================================
# HELPER: Try delete a file from R2 / Cloudinary / local
# =============================================================================

def _try_delete_file(url):
    """Best-effort delete from wherever the file lives."""
    if not url:
        return
    
    # Try R2
    try:
        from src.api.r2_storage_setup import r2_client, R2_BUCKET, R2_PUBLIC_URL
        if r2_client and R2_BUCKET and R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL):
            key = url.replace(R2_PUBLIC_URL + '/', '')
            r2_client.delete_object(Bucket=R2_BUCKET, Key=key)
            return
    except Exception:
        pass
    
    # Try Cloudinary
    try:
        if 'cloudinary' in url:
            import cloudinary.uploader
            # Extract public_id from URL
            parts = url.split('/')
            public_id = '/'.join(parts[-3:]).rsplit('.', 1)[0]  # folder/subfolder/filename
            cloudinary.uploader.destroy(public_id, resource_type="video")
            return
    except Exception:
        pass
    
    # Try local
    try:
        local_path = url.lstrip('/')
        if os.path.exists(local_path):
            os.remove(local_path)
    except Exception:
        pass


# =============================================================================
# PROJECTS - LIST ALL
# =============================================================================

@recording_studio_bp.route('/api/studio/projects', methods=['GET'])
@jwt_required()
def get_projects():
    """Get all recording projects for current user"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        projects = RecordingProject.query.filter_by(user_id=user_id) \
            .order_by(RecordingProject.updated_at.desc()).all()

        return jsonify({
            "success": True,
            "projects": [_serialize_for_frontend(p) for p in projects]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - CREATE
# =============================================================================

@recording_studio_bp.route('/api/studio/projects', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new recording project"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        data = request.get_json()

        ts_top, ts_bottom = _parse_time_signature(data.get('time_signature', '4/4'))
        master_vol = _normalize_master_volume(data.get('master_volume', 0.8))
        tracks_data = data.get('tracks', [])

        project = RecordingProject(
            user_id=user_id,
            name=data.get('name', 'Untitled Project'),
            bpm=data.get('bpm', 120),
            time_signature_top=ts_top,
            time_signature_bottom=ts_bottom,
            tracks_json=json.dumps(tracks_data),
            master_volume=master_vol,
            track_count=len(tracks_data),
        )

        # Piano roll fields (safe if columns not migrated yet)
        try:
            project.piano_roll_notes_json = json.dumps(data.get('piano_roll_notes', []))
            project.piano_roll_key = data.get('piano_roll_key', 'C')
            project.piano_roll_scale = data.get('piano_roll_scale', 'major')
        except Exception:
            pass

        db.session.add(project)
        db.session.commit()

        return jsonify({
            "success": True,
            "project": _serialize_for_frontend(project)
        }), 201
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

@recording_studio_bp.route('/api/studio/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get a single project with all track data"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        return jsonify({
            "success": True,
            "project": _serialize_for_frontend(project)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PROJECTS - UPDATE
# =============================================================================

@recording_studio_bp.route('/api/studio/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update project metadata and track state"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        data = request.get_json()

        if 'name' in data:
            project.name = data['name']
        if 'bpm' in data:
            project.bpm = data['bpm']
        if 'time_signature' in data:
            ts_top, ts_bottom = _parse_time_signature(data['time_signature'])
            project.time_signature_top = ts_top
            project.time_signature_bottom = ts_bottom
        if 'master_volume' in data:
            project.master_volume = _normalize_master_volume(data['master_volume'])
        if 'tracks' in data:
            project.tracks_json = json.dumps(data['tracks'])
            project.track_count = len(data['tracks'])

        # Piano roll fields (safe if columns not migrated yet)
        try:
            if 'piano_roll_notes' in data:
                project.piano_roll_notes_json = json.dumps(data['piano_roll_notes'])
            if 'piano_roll_key' in data:
                project.piano_roll_key = data['piano_roll_key']
            if 'piano_roll_scale' in data:
                project.piano_roll_scale = data['piano_roll_scale']
        except Exception:
            pass

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "project": _serialize_for_frontend(project)
        }), 200
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

@recording_studio_bp.route('/api/studio/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    """Delete a project and its tracks"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Clean up uploaded audio files
        tracks = json.loads(project.tracks_json or '[]')
        for track in tracks:
            audio_url = track.get('audio_url')
            if audio_url and not audio_url.startswith('blob:'):
                _try_delete_file(audio_url)

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

@recording_studio_bp.route('/api/studio/tracks/upload', methods=['POST'])
@jwt_required()
def upload_track_audio():
    """
    Upload a recorded audio blob for a specific track.
    Accepts multipart form data with:
      - file: audio blob (webm/wav)
      - project_id: project this belongs to
      - track_index: which track (0-31)
      - track_name: optional name
    """
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        file = request.files.get('file')
        project_id = request.form.get('project_id')
        track_index = int(request.form.get('track_index', 0))

        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        if not project_id:
            return jsonify({"error": "Project ID required"}), 400

        # Verify project ownership
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Upload via R2 → Cloudinary → local chain
        audio_url = _upload_audio_file(file, user_id, project_id, track_index, 'track')

        # Update tracks_json with the new audio URL
        tracks = json.loads(project.tracks_json or '[]')

        # Ensure tracks list is long enough
        while len(tracks) <= track_index:
            tracks.append({
                'name': f'Track {len(tracks) + 1}',
                'volume': 0.8,
                'pan': 0,
                'muted': False,
                'solo': False,
                'armed': False,
                'audio_url': None,
                'color': ['#e8652b', '#1a4d7c', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4', '#f43f5e', '#84cc16'][len(tracks) % 8]
            })

        tracks[track_index]['audio_url'] = audio_url
        project.tracks_json = json.dumps(tracks)
        project.track_count = len(tracks)
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "track_index": track_index
        }), 200

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

@recording_studio_bp.route('/api/studio/tracks/import', methods=['POST'])
@jwt_required()
def import_audio_to_track():
    """Import an existing audio file (mp3, wav, etc.) into a track"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        file = request.files.get('file')
        project_id = request.form.get('project_id')
        track_index = int(request.form.get('track_index', 0))

        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        allowed_ext = {'mp3', 'wav', 'flac', 'ogg', 'webm', 'aac', 'm4a'}
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext not in allowed_ext:
            return jsonify({"error": f"File type .{ext} not supported"}), 400

        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        # Upload via R2 → Cloudinary → local chain
        audio_url = _upload_audio_file(file, user_id, project_id, track_index, 'import')

        # Update track
        tracks = json.loads(project.tracks_json or '[]')
        while len(tracks) <= track_index:
            tracks.append({
                'name': f'Track {len(tracks) + 1}',
                'volume': 0.8, 'pan': 0, 'muted': False,
                'solo': False, 'armed': False, 'audio_url': None,
                'color': ['#e8652b', '#1a4d7c', '#10b981', '#f59e0b', '#7c3aed', '#06b6d4', '#f43f5e', '#84cc16'][len(tracks) % 8]
            })

        tracks[track_index]['audio_url'] = audio_url
        tracks[track_index]['name'] = file.filename.rsplit('.', 1)[0][:30] if file.filename else f'Import {track_index + 1}'
        project.tracks_json = json.dumps(tracks)
        project.track_count = len(tracks)
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "track_index": track_index,
            "filename": file.filename
        }), 200

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

@recording_studio_bp.route('/api/studio/projects/<int:project_id>/mixdown', methods=['POST'])
@jwt_required()
def mixdown_project(project_id):
    """
    Bounce/mixdown all tracks into a single audio file.
    Client does the actual mixing via Web Audio OfflineAudioContext,
    then uploads the mixed file here for storage.
    """
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No mixdown file provided"}), 400

        # Delete old mixdown if exists
        if project.mixdown_url:
            _try_delete_file(project.mixdown_url)

        # Upload via R2 → Cloudinary → local chain
        audio_url = _upload_audio_file(file, user_id, project_id, 0, 'mixdown')

        project.mixdown_url = audio_url
        project.mixdown_format = 'wav'
        project.mixdown_created_at = datetime.utcnow()
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "success": True,
            "mixdown_url": audio_url
        }), 200

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

@recording_studio_bp.route('/api/studio/tracks/delete', methods=['POST'])
@jwt_required()
def delete_track_audio():
    """Clear audio from a specific track"""
    try:
        from src.api.models import db, RecordingProject

        user_id = get_jwt_identity()
        data = request.get_json()
        project_id = data.get('project_id')
        track_index = data.get('track_index', 0)

        project = RecordingProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        tracks = json.loads(project.tracks_json or '[]')
        if track_index < len(tracks):
            # Clean up the file
            audio_url = tracks[track_index].get('audio_url')
            if audio_url and not audio_url.startswith('blob:'):
                _try_delete_file(audio_url)

            tracks[track_index]['audio_url'] = None
            project.tracks_json = json.dumps(tracks)
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