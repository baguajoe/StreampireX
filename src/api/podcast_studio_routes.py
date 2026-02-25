"""
=============================================================================
podcast_studio_routes.py — Backend API for Podcast Studio
=============================================================================
Location: src/api/podcast_studio_routes.py

Endpoints:
  POST /api/podcast-studio/upload-track     — Upload individual track stems
  POST /api/podcast-studio/publish-episode  — Publish episode to podcast feed
  GET  /api/podcast-studio/sessions         — List user's recording sessions
  GET  /api/podcast-studio/session/<id>     — Get session details + tracks

Publishing creates a PodcastEpisode linked to the user's podcast,
so the episode appears in:
  - PodcastDetailPage (their show page)
  - Browse Podcasts (discovery feed)
  - PodcastPlayer (playback)
=============================================================================
"""

import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

podcast_studio = Blueprint("podcast_studio", __name__)


def get_upload_service():
    """Get the appropriate upload service (Cloudflare R2 primary, Cloudinary fallback)."""
    try:
        import boto3
        r2_account_id = os.environ.get("R2_ACCOUNT_ID")
        r2_access_key = os.environ.get("R2_ACCESS_KEY_ID")
        r2_secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
        r2_bucket = os.environ.get("R2_BUCKET_NAME", "streampirex-media")

        if r2_account_id and r2_access_key and r2_secret_key:
            s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{r2_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=r2_access_key,
                aws_secret_access_key=r2_secret_key,
                region_name="auto",
            )
            return ("r2", s3, r2_bucket)
    except ImportError:
        pass

    # Fallback to Cloudinary
    try:
        import cloudinary
        import cloudinary.uploader
        return ("cloudinary", cloudinary.uploader, None)
    except ImportError:
        pass

    return ("local", None, None)


def upload_file(file_obj, filename, folder="podcast-studio"):
    """Upload file and return URL."""
    service_type, client, bucket = get_upload_service()

    if service_type == "r2":
        key = f"{folder}/{filename}"
        client.upload_fileobj(file_obj, bucket, key)
        r2_public_url = os.environ.get("R2_PUBLIC_URL", f"https://pub-{os.environ.get('R2_ACCOUNT_ID', '')}.r2.dev")
        return f"{r2_public_url}/{key}"

    elif service_type == "cloudinary":
        import cloudinary.uploader
        result = cloudinary.uploader.upload(
            file_obj,
            resource_type="auto",
            folder=folder,
            public_id=filename.rsplit(".", 1)[0],
        )
        return result.get("secure_url", result.get("url"))

    else:
        # Local fallback
        upload_dir = os.path.join("uploads", folder)
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file_obj.save(filepath)
        return f"/uploads/{folder}/{filename}"


# =============================================================================
# UPLOAD TRACK (stem or guest recording)
# =============================================================================
@podcast_studio.route("/api/podcast-studio/upload-track", methods=["POST"])
@jwt_required(optional=True)
def upload_track():
    """
    Upload an individual recording track (host, guest, or soundboard).
    These are stored as stems for optional multitrack editing.
    """
    from .models import db, PodcastRecordingSession, PodcastRecordingTrack

    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file provided"}), 400

        session_id = request.form.get("session_id", "")
        track_id = request.form.get("track_id", "unknown")
        track_type = request.form.get("type", "stem")  # stem | guest_recording
        guest_name = request.form.get("guest_name", "")

        # Generate unique filename
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
        unique_name = f"{session_id}_{track_id}_{uuid.uuid4().hex[:8]}.{ext}"

        # Upload file
        audio_url = upload_file(file, unique_name, folder="podcast-studio/tracks")

        # Get or create session record
        user_id = get_jwt_identity()
        session = PodcastRecordingSession.query.filter_by(session_id=session_id).first()

        if not session and user_id:
            session = PodcastRecordingSession(
                session_id=session_id,
                user_id=user_id,
                title=request.form.get("title", "Recording Session"),
                created_at=datetime.utcnow(),
            )
            db.session.add(session)
            db.session.flush()

        # Save track record
        if session:
            track_record = PodcastRecordingTrack(
                session_record_id=session.id,
                track_id=track_id,
                track_type=track_type,
                guest_name=guest_name,
                audio_url=audio_url,
                uploaded_at=datetime.utcnow(),
            )
            db.session.add(track_record)
            db.session.commit()

        return jsonify({
            "success": True,
            "audio_url": audio_url,
            "track_id": track_id,
        }), 200

    except Exception as e:
        print(f"[PodcastStudio] Upload error: {e}")
        return jsonify({"error": str(e)}), 500


# =============================================================================
# PUBLISH EPISODE — Creates PodcastEpisode so it appears everywhere
# =============================================================================
@podcast_studio.route("/api/podcast-studio/publish-episode", methods=["POST"])
@jwt_required()
def publish_episode():
    """
    Publish a recorded episode. This:
    1. Uploads the audio file
    2. Creates/finds the user's Podcast
    3. Creates a PodcastEpisode linked to that Podcast
    4. Saves chapters

    The episode then appears in:
    - PodcastDetailPage (the show's episode list)
    - Browse Podcasts page (discovery feed)
    - PodcastPlayer (playback with chapters)
    - User's profile podcast section
    """
    from .models import db, Podcast, PodcastEpisode, PodcastChapter, User
    from .models import PodcastRecordingSession

    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No audio file provided"}), 400

        title = request.form.get("title", "Untitled Episode")
        description = request.form.get("description", "")
        episode_number = request.form.get("episode_number", 1, type=int)
        show_notes = request.form.get("show_notes", "")
        duration = request.form.get("duration", 0, type=int)
        chapters_json = request.form.get("chapters", "[]")
        session_id = request.form.get("session_id", "")

        import json
        chapters_data = json.loads(chapters_json) if chapters_json else []

        # 1. Upload audio file
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "webm"
        unique_name = f"episode_{user_id}_{uuid.uuid4().hex[:8]}.{ext}"
        audio_url = upload_file(file, unique_name, folder="podcast-studio/episodes")

        # 2. Find or create user's podcast
        podcast = Podcast.query.filter_by(user_id=user_id).first()

        if not podcast:
            # Auto-create podcast for user
            podcast = Podcast(
                user_id=user_id,
                title=f"{user.username}'s Podcast",
                description=f"Podcast by {user.username}",
                category="General",
                language="en",
                is_published=True,
                created_at=datetime.utcnow(),
            )
            db.session.add(podcast)
            db.session.flush()

        # 3. Create PodcastEpisode
        episode = PodcastEpisode(
            podcast_id=podcast.id,
            title=title,
            description=description,
            audio_url=audio_url,
            episode_number=episode_number,
            duration=duration,
            show_notes=show_notes,
            is_published=True,
            release_date=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        db.session.add(episode)
        db.session.flush()

        # 4. Save chapters
        for ch in chapters_data:
            chapter = PodcastChapter(
                podcast_id=podcast.id,
                title=ch.get("title", "Chapter"),
                timestamp=int(ch.get("timestamp", 0)),
                manual_edit=True,
            )
            db.session.add(chapter)

        # 5. Link session to episode if exists
        if session_id:
            session_record = PodcastRecordingSession.query.filter_by(
                session_id=session_id
            ).first()
            if session_record:
                session_record.episode_id = episode.id
                session_record.status = "published"

        db.session.commit()

        return jsonify({
            "success": True,
            "episode_id": episode.id,
            "podcast_id": podcast.id,
            "audio_url": audio_url,
            "message": f'Episode "{title}" published to your podcast!',
            "links": {
                "podcast_detail": f"/podcast/{podcast.id}",
                "episode": f"/podcast/{podcast.id}/episode/{episode.id}",
                "browse": "/podcasts",
            },
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# =============================================================================
# LIST SESSIONS
# =============================================================================
@podcast_studio.route("/api/podcast-studio/sessions", methods=["GET"])
@jwt_required()
def list_sessions():
    """List user's recording sessions."""
    from .models import PodcastRecordingSession

    user_id = get_jwt_identity()
    sessions = PodcastRecordingSession.query.filter_by(user_id=user_id)\
        .order_by(PodcastRecordingSession.created_at.desc()).limit(50).all()

    return jsonify({
        "success": True,
        "sessions": [s.serialize() for s in sessions],
    })


# =============================================================================
# GET SESSION DETAIL
# =============================================================================
@podcast_studio.route("/api/podcast-studio/session/<session_id>", methods=["GET"])
@jwt_required()
def get_session(session_id):
    """Get session details with all tracks."""
    from .models import PodcastRecordingSession

    user_id = get_jwt_identity()
    session = PodcastRecordingSession.query.filter_by(
        session_id=session_id, user_id=user_id
    ).first()

    if not session:
        return jsonify({"error": "Session not found"}), 404

    return jsonify({
        "success": True,
        "session": session.serialize(),
    })