# =============================================================================
# recording_studio_routes.py - 8-Track Audio Recorder Backend
# =============================================================================
# Location: src/api/recording_studio_routes.py
# Register: app.register_blueprint(recording_studio_bp)
#
# Model to add to models.py (see bottom of file for schema)
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
# PROJECTS - CRUD
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
            "projects": [p.serialize() for p in projects]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@recording_studio_bp.route('/api/studio/projects', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new recording project"""
    try:
        from src.api.models import db, RecordingProject
        
        user_id = get_jwt_identity()
        data = request.get_json()
        
        project = RecordingProject(
            user_id=user_id,
            name=data.get('name', 'Untitled Project'),
            bpm=data.get('bpm', 120),
            time_signature=data.get('time_signature', '4/4'),
            tracks_json=json.dumps(data.get('tracks', [])),
            master_volume=data.get('master_volume', 0.8)
        )
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "project": project.serialize()
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
            "project": project.serialize()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
            project.time_signature = data['time_signature']
        if 'tracks' in data:
            project.tracks_json = json.dumps(data['tracks'])
        if 'master_volume' in data:
            project.master_volume = data['master_volume']
        
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "project": project.serialize()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Project deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# TRACK AUDIO UPLOAD
# =============================================================================

@recording_studio_bp.route('/api/studio/tracks/upload', methods=['POST'])
@jwt_required()
def upload_track_audio():
    """
    Upload a recorded audio blob for a specific track.
    Accepts multipart form data with:
      - file: audio blob (webm/wav)
      - project_id: project this belongs to
      - track_index: which track (0-7)
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
        
        # Save file
        os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
        ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'webm'
        filename = f"studio_{user_id}_{project_id}_track{track_index}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(STUDIO_UPLOAD_DIR, filename)
        file.save(filepath)
        
        # Try uploading to Cloudinary if available
        audio_url = filepath  # Local fallback
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                filepath,
                resource_type="video",  # Cloudinary uses "video" for audio
                folder=f"studio/{user_id}/{project_id}",
                public_id=f"track_{track_index}_{uuid.uuid4().hex[:8]}"
            )
            audio_url = result.get('secure_url', filepath)
            # Clean up local file after cloud upload
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as cloud_err:
            print(f"Cloudinary upload failed, using local: {cloud_err}")
        
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
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "track_index": track_index
        }), 200
        
    except Exception as e:
        print(f"Track upload error: {e}")
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
        
        # Save and upload
        os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
        filename = f"import_{user_id}_{project_id}_track{track_index}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(STUDIO_UPLOAD_DIR, filename)
        file.save(filepath)
        
        audio_url = filepath
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                filepath,
                resource_type="video",
                folder=f"studio/{user_id}/{project_id}",
                public_id=f"import_track_{track_index}_{uuid.uuid4().hex[:8]}"
            )
            audio_url = result.get('secure_url', filepath)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass
        
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
        tracks[track_index]['name'] = file.filename.rsplit('.', 1)[0][:30]
        project.tracks_json = json.dumps(tracks)
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "track_index": track_index,
            "filename": file.filename
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# MIXDOWN - Bounce all tracks to single file (server-side)
# =============================================================================

@recording_studio_bp.route('/api/studio/projects/<int:project_id>/mixdown', methods=['POST'])
@jwt_required()
def mixdown_project(project_id):
    """
    Bounce/mixdown all tracks into a single audio file.
    This is done client-side via Web Audio API OfflineAudioContext,
    then the mixed file is uploaded here for storage.
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
        
        # Save mixdown
        os.makedirs(STUDIO_UPLOAD_DIR, exist_ok=True)
        filename = f"mixdown_{user_id}_{project_id}_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(STUDIO_UPLOAD_DIR, filename)
        file.save(filepath)
        
        audio_url = filepath
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                filepath,
                resource_type="video",
                folder=f"studio/{user_id}/mixdowns",
                public_id=f"mix_{project_id}_{uuid.uuid4().hex[:8]}"
            )
            audio_url = result.get('secure_url', filepath)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass
        
        project.mixdown_url = audio_url
        project.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "mixdown_url": audio_url
        }), 200
        
    except Exception as e:
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
            tracks[track_index]['audio_url'] = None
            project.tracks_json = json.dumps(tracks)
            project.updated_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# MODEL - Add to models.py
# =============================================================================
#
# class RecordingProject(db.Model):
#     __tablename__ = 'recording_project'
#     __table_args__ = {'extend_existing': True}
#
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     name = db.Column(db.String(255), default='Untitled Project')
#     bpm = db.Column(db.Integer, default=120)
#     time_signature = db.Column(db.String(10), default='4/4')
#     tracks_json = db.Column(db.Text, default='[]')
#     master_volume = db.Column(db.Float, default=0.8)
#     mixdown_url = db.Column(db.String(500), nullable=True)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)
#     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
#
#     def serialize(self):
#         import json
#         return {
#             'id': self.id,
#             'user_id': self.user_id,
#             'name': self.name,
#             'bpm': self.bpm,
#             'time_signature': self.time_signature,
#             'tracks': json.loads(self.tracks_json or '[]'),
#             'master_volume': self.master_volume,
#             'mixdown_url': self.mixdown_url,
#             'created_at': self.created_at.isoformat() if self.created_at else None,
#             'updated_at': self.updated_at.isoformat() if self.updated_at else None
#         }
#
# =============================================================================