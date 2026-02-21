# src/api/playlist_routes.py
# =====================================================
# PLAYLIST API ROUTES - StreamPireX
# =====================================================
# Full CRUD for music playlists (uses existing PlaylistAudio model)
# Register: app.register_blueprint(playlist_bp)
# =====================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import desc

from src.api.models import db, User, Audio, PlaylistAudio

playlist_bp = Blueprint('playlists', __name__)


# =====================================================
# GET ALL PLAYLISTS FOR CURRENT USER
# =====================================================

@playlist_bp.route('/api/playlists', methods=['GET'])
@jwt_required()
def get_my_playlists():
    """Get all playlists for the current user"""
    try:
        user_id = get_jwt_identity()
        playlists = PlaylistAudio.query.filter_by(user_id=user_id) \
            .order_by(desc(PlaylistAudio.created_at)).all()

        result = []
        for pl in playlists:
            tracks = pl.audios if hasattr(pl, 'audios') else []
            total_duration = sum(
                (getattr(t, 'duration_seconds', 0) or 0) for t in tracks
            )
            result.append({
                "id": pl.id,
                "name": pl.name,
                "track_count": len(tracks),
                "duration": format_duration(total_duration),
                "duration_seconds": total_duration,
                "cover": get_playlist_cover(tracks),
                "created_at": pl.created_at.isoformat() if pl.created_at else None,
                "tracks": [serialize_track(t) for t in tracks]
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"Error getting playlists: {e}")
        return jsonify([]), 200


# =====================================================
# GET SINGLE PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists/<int:playlist_id>', methods=['GET'])
@jwt_required()
def get_playlist(playlist_id):
    """Get a single playlist with all tracks"""
    try:
        user_id = get_jwt_identity()
        playlist = PlaylistAudio.query.get(playlist_id)

        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404

        tracks = playlist.audios if hasattr(playlist, 'audios') else []
        total_duration = sum(
            (getattr(t, 'duration_seconds', 0) or 0) for t in tracks
        )

        return jsonify({
            "id": playlist.id,
            "name": playlist.name,
            "user_id": playlist.user_id,
            "is_owner": str(playlist.user_id) == str(user_id),
            "track_count": len(tracks),
            "duration": format_duration(total_duration),
            "cover": get_playlist_cover(tracks),
            "created_at": playlist.created_at.isoformat() if playlist.created_at else None,
            "tracks": [serialize_track(t, i) for i, t in enumerate(tracks)]
        }), 200

    except Exception as e:
        print(f"Error getting playlist: {e}")
        return jsonify({"error": str(e)}), 500


# =====================================================
# CREATE PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists', methods=['POST'])
@jwt_required()
def create_playlist():
    """Create a new playlist"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        name = data.get('name', '').strip()
        if not name:
            return jsonify({"error": "Playlist name is required"}), 400

        # Check for duplicate name
        existing = PlaylistAudio.query.filter_by(
            user_id=user_id, name=name
        ).first()
        if existing:
            return jsonify({"error": "You already have a playlist with this name"}), 400

        playlist = PlaylistAudio(
            user_id=user_id,
            name=name,
            created_at=datetime.utcnow()
        )
        db.session.add(playlist)
        db.session.flush()

        # Add initial tracks if provided
        track_ids = data.get('track_ids', [])
        if track_ids:
            tracks = Audio.query.filter(
                Audio.id.in_(track_ids),
                Audio.user_id == user_id
            ).all()
            for track in tracks:
                playlist.audios.append(track)

        db.session.commit()

        return jsonify({
            "message": "Playlist created",
            "playlist": {
                "id": playlist.id,
                "name": playlist.name,
                "track_count": len(track_ids),
                "created_at": playlist.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating playlist: {e}")
        return jsonify({"error": str(e)}), 500


# =====================================================
# UPDATE PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists/<int:playlist_id>', methods=['PUT'])
@jwt_required()
def update_playlist(playlist_id):
    """Update playlist name"""
    try:
        user_id = get_jwt_identity()
        playlist = PlaylistAudio.query.filter_by(
            id=playlist_id, user_id=user_id
        ).first()

        if not playlist:
            return jsonify({"error": "Playlist not found or unauthorized"}), 404

        data = request.get_json()
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({"error": "Playlist name cannot be empty"}), 400
            playlist.name = name

        db.session.commit()

        return jsonify({
            "message": "Playlist updated",
            "playlist": playlist.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =====================================================
# DELETE PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists/<int:playlist_id>', methods=['DELETE'])
@jwt_required()
def delete_playlist(playlist_id):
    """Delete a playlist (does not delete the tracks)"""
    try:
        user_id = get_jwt_identity()
        playlist = PlaylistAudio.query.filter_by(
            id=playlist_id, user_id=user_id
        ).first()

        if not playlist:
            return jsonify({"error": "Playlist not found or unauthorized"}), 404

        # Clear the association table entries
        playlist.audios = []
        db.session.delete(playlist)
        db.session.commit()

        return jsonify({"message": "Playlist deleted"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =====================================================
# ADD TRACK TO PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists/<int:playlist_id>/tracks', methods=['POST'])
@jwt_required()
def add_track_to_playlist(playlist_id):
    """Add a track to a playlist"""
    try:
        user_id = get_jwt_identity()
        playlist = PlaylistAudio.query.filter_by(
            id=playlist_id, user_id=user_id
        ).first()

        if not playlist:
            return jsonify({"error": "Playlist not found or unauthorized"}), 404

        data = request.get_json()
        track_id = data.get('track_id')

        if not track_id:
            return jsonify({"error": "track_id is required"}), 400

        track = Audio.query.get(track_id)
        if not track:
            return jsonify({"error": "Track not found"}), 404

        # Check if already in playlist
        if track in playlist.audios:
            return jsonify({"error": "Track already in playlist"}), 400

        playlist.audios.append(track)
        db.session.commit()

        return jsonify({
            "message": "Track added to playlist",
            "track_count": len(playlist.audios)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =====================================================
# REMOVE TRACK FROM PLAYLIST
# =====================================================

@playlist_bp.route('/api/playlists/<int:playlist_id>/tracks/<int:track_id>', methods=['DELETE'])
@jwt_required()
def remove_track_from_playlist(playlist_id, track_id):
    """Remove a track from a playlist"""
    try:
        user_id = get_jwt_identity()
        playlist = PlaylistAudio.query.filter_by(
            id=playlist_id, user_id=user_id
        ).first()

        if not playlist:
            return jsonify({"error": "Playlist not found or unauthorized"}), 404

        track = Audio.query.get(track_id)
        if not track:
            return jsonify({"error": "Track not found"}), 404

        if track in playlist.audios:
            playlist.audios.remove(track)
            db.session.commit()
            return jsonify({
                "message": "Track removed from playlist",
                "track_count": len(playlist.audios)
            }), 200
        else:
            return jsonify({"error": "Track not in playlist"}), 404

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =====================================================
# GET USER'S PLAYLISTS (PUBLIC - for artist profile)
# =====================================================

@playlist_bp.route('/api/users/<int:user_id>/playlists', methods=['GET'])
def get_user_playlists(user_id):
    """Get public playlists for a specific user (for artist profile page)"""
    try:
        playlists = PlaylistAudio.query.filter_by(user_id=user_id) \
            .order_by(desc(PlaylistAudio.created_at)).all()

        result = []
        for pl in playlists:
            tracks = pl.audios if hasattr(pl, 'audios') else []
            total_duration = sum(
                (getattr(t, 'duration_seconds', 0) or 0) for t in tracks
            )
            result.append({
                "id": pl.id,
                "name": pl.name,
                "track_count": len(tracks),
                "duration": format_duration(total_duration),
                "cover": get_playlist_cover(tracks),
                "created_at": pl.created_at.isoformat() if pl.created_at else None
            })

        return jsonify(result), 200

    except Exception as e:
        print(f"Error getting user playlists: {e}")
        return jsonify([]), 200


# =====================================================
# HELPERS
# =====================================================

def format_duration(total_seconds):
    """Format seconds into MM:SS or H:MM:SS"""
    if not total_seconds:
        return "0:00"
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def get_playlist_cover(tracks):
    """Get first track's artwork as playlist cover"""
    for track in tracks:
        artwork = getattr(track, 'artwork_url', None)
        if artwork:
            return artwork
    return None


def serialize_track(track, position=None):
    """Serialize a track for playlist response"""
    return {
        "id": track.id,
        "title": track.title,
        "artist_name": getattr(track, 'artist_name', None) or (
            track.user.username if track.user else 'Unknown'
        ),
        "file_url": track.file_url,
        "artwork_url": getattr(track, 'artwork_url', None),
        "duration": getattr(track, 'duration', None),
        "duration_seconds": getattr(track, 'duration_seconds', 0),
        "genre": getattr(track, 'genre', None),
        "position": position
    }