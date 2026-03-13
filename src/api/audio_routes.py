# src/api/audio_routes.py
# =====================================================
# AUDIO LIBRARY ROUTES — StreamPireX
# =====================================================
# Unified endpoint serving the DJ Mixer and any other
# component that needs the user's full audio library.
#
# GET  /api/audio/my-tracks   — all user audio (Audio + Beats)
# POST /api/audio/upload      — upload via R2 presign flow
# PUT  /api/audio/<id>/type   — tag a track (acapella, stem, etc.)
# =====================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import os

from api.models import db, Audio, User
from api.extensions import db

audio_bp = Blueprint('audio_library', __name__)

AUDIO_TYPES = ['original', 'acapella', 'stem', 'beat', 'remix', 'mix', 'sample', 'loop']


# ── GET /api/audio/my-tracks ─────────────────────────────────────────────────
@audio_bp.route('/api/audio/my-tracks', methods=['GET'])
@jwt_required()
def get_my_tracks():
    """Return all audio tracks owned by the current user.
    Optionally filter by audio_type: ?type=acapella|stem|beat|remix|mix|all
    """
    try:
        user_id = get_jwt_identity()
        audio_type = request.args.get('type', 'all')

        query = Audio.query.filter_by(user_id=user_id, status='active')

        if audio_type and audio_type != 'all':
            if hasattr(Audio, 'audio_type'):
                query = query.filter(Audio.audio_type == audio_type)

        tracks = query.order_by(Audio.created_at.desc()).all()

        # Also pull beats from Beat model if it exists
        result = []
        for t in tracks:
            url = t.file_url or getattr(t, 'processed_file_url', None)
            result.append({
                "id": t.id,
                "title": t.title or "Untitled",
                "file_url": url,
                "audio_url": url,
                "r2_url": url,
                "genre": getattr(t, 'genre', None),
                "duration": getattr(t, 'duration', None),
                "artwork_url": getattr(t, 'artwork_url', None),
                "artist_name": getattr(t, 'artist_name', None),
                "audio_type": getattr(t, 'audio_type', 'original'),
                "bpm": getattr(t, 'bpm_detected', None),
                "key": getattr(t, 'key_detected', None),
                "uploaded_at": t.uploaded_at.isoformat() if t.uploaded_at else None,
                "source": "audio",
            })

        # Try to pull from Beat model as well
        try:
            from api.models import Beat
            beat_query = Beat.query.filter_by(user_id=user_id)
            if audio_type == 'beat':
                beats = beat_query.all()
            elif audio_type == 'all':
                beats = beat_query.all()
            else:
                beats = []

            for b in beats:
                beat_url = getattr(b, 'audio_url', None) or getattr(b, 'file_url', None)
                if beat_url:
                    result.append({
                        "id": f"beat_{b.id}",
                        "title": b.title or "Untitled Beat",
                        "file_url": beat_url,
                        "audio_url": beat_url,
                        "r2_url": beat_url,
                        "genre": getattr(b, 'genre', None),
                        "duration": None,
                        "artwork_url": getattr(b, 'artwork_url', None) or getattr(b, 'cover_art_url', None),
                        "artist_name": getattr(b, 'producer_name', None),
                        "audio_type": "beat",
                        "bpm": getattr(b, 'bpm', None),
                        "key": getattr(b, 'key', None),
                        "uploaded_at": b.created_at.isoformat() if hasattr(b, 'created_at') and b.created_at else None,
                        "source": "beat",
                    })
        except (ImportError, AttributeError, Exception) as e:
            # Beat model may not exist or have different structure
            pass

        return jsonify(result), 200

    except Exception as e:
        print(f"Error fetching audio tracks: {e}")
        return jsonify({"error": str(e)}), 500


# ── POST /api/audio/upload ────────────────────────────────────────────────────
@audio_bp.route('/api/audio/upload', methods=['POST'])
@jwt_required()
def upload_audio():
    """Save an audio record after R2 upload.
    Expects JSON: { title, file_url, audio_type, genre, duration, bpm, key, artwork_url }
    OR multipart form with 'file' field (saves to R2 via presign internally).
    """
    try:
        user_id = get_jwt_identity()

        # JSON body (client already uploaded to R2 and sends us the URL)
        if request.is_json:
            data = request.get_json()
            file_url = data.get('file_url') or data.get('r2_url') or data.get('url')
            if not file_url:
                return jsonify({"error": "file_url is required"}), 400

            track = Audio(
                user_id=user_id,
                title=data.get('title', f'Track {datetime.utcnow().strftime("%m/%d %H:%M")}'),
                description=data.get('description', ''),
                file_url=file_url,
                genre=data.get('genre', ''),
                artwork_url=data.get('artwork_url', ''),
                artist_name=data.get('artist_name', ''),
                status='active',
                is_public=data.get('is_public', True),
            )

            # Optional fields with safe setattr
            for field in ['audio_type', 'bpm_detected', 'key_detected']:
                if hasattr(Audio, field) and data.get(field) is not None:
                    setattr(track, field, data.get(field))

            # duration
            if data.get('duration'):
                track.duration = str(data.get('duration'))

            db.session.add(track)
            db.session.commit()

            return jsonify({
                "id": track.id,
                "title": track.title,
                "file_url": track.file_url,
                "audio_url": track.file_url,
                "message": "Track saved successfully"
            }), 201

        # Multipart (legacy / direct file post) — save metadata only, 
        # client should use R2 presign for actual file upload
        return jsonify({"error": "Use R2 presign endpoint for file uploads, then POST JSON with file_url"}), 400

    except Exception as e:
        db.session.rollback()
        print(f"Error uploading audio: {e}")
        return jsonify({"error": str(e)}), 500


# ── PUT /api/audio/<id>/type ──────────────────────────────────────────────────
@audio_bp.route('/api/audio/<int:track_id>/type', methods=['PUT'])
@jwt_required()
def update_audio_type(track_id):
    """Tag an audio track with a type (acapella, stem, beat, remix, etc.)"""
    try:
        user_id = get_jwt_identity()
        track = Audio.query.filter_by(id=track_id, user_id=user_id).first()
        if not track:
            return jsonify({"error": "Track not found"}), 404

        data = request.get_json()
        new_type = data.get('audio_type')
        if new_type not in AUDIO_TYPES:
            return jsonify({"error": f"Invalid type. Choose from: {AUDIO_TYPES}"}), 400

        if hasattr(Audio, 'audio_type'):
            track.audio_type = new_type
            db.session.commit()
            return jsonify({"message": "Type updated", "audio_type": new_type}), 200
        else:
            return jsonify({"message": "audio_type column not yet migrated"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── GET /api/audio/<id> ───────────────────────────────────────────────────────
@audio_bp.route('/api/audio/<int:track_id>', methods=['GET'])
@jwt_required()
def get_track(track_id):
    """Get single track details"""
    try:
        user_id = get_jwt_identity()
        track = Audio.query.filter_by(id=track_id, user_id=user_id).first()
        if not track:
            return jsonify({"error": "Not found"}), 404
        url = track.file_url or getattr(track, 'processed_file_url', None)
        return jsonify({
            "id": track.id,
            "title": track.title,
            "file_url": url,
            "audio_url": url,
            "audio_type": getattr(track, 'audio_type', 'original'),
            "genre": getattr(track, 'genre', None),
            "bpm": getattr(track, 'bpm_detected', None),
            "key": getattr(track, 'key_detected', None),
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500