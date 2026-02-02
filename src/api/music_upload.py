# ✅ music_upload.py – Upload + Filter + Save Logic
# FIX #6: Corrected import path and renamed blueprint to avoid collision with main routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from src.api.models import db, TrackRelease  # ✅ FIX: was "from models import db, TrackRelease"
from api.utils.audio_filters import validate_uploaded_audio, get_file_hash

# ✅ FIX: Renamed from 'api' to 'music_upload_bp' to avoid blueprint name collision
music_upload_bp = Blueprint('music_upload', __name__)

UPLOAD_FOLDER = "static/uploads/music"
ALLOWED_EXTENSIONS = {"mp3", "wav", "flac"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@music_upload_bp.route("/api/upload-track", methods=["POST"])
@jwt_required()
def upload_track():
    user_id = get_jwt_identity()
    file = request.files.get("file")
    title = request.form.get("title")
    genre = request.form.get("genre")
    is_explicit = request.form.get("explicit", "false").lower() == "true"

    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid or missing audio file"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)

    # Pull all known hashes
    known_hashes = [t.audio_hash for t in TrackRelease.query.with_entities(TrackRelease.audio_hash).all() if t.audio_hash]

    # Run filters
    is_valid, reason = validate_uploaded_audio(filepath, known_hashes)
    if not is_valid:
        os.remove(filepath)
        return jsonify({"error": reason}), 400

    # Hash it for future deduplication
    audio_hash = get_file_hash(filepath)

    # Save to DB
    new_track = TrackRelease(
        user_id=user_id,
        title=title,
        genre=genre,
        is_explicit=is_explicit,
        audio_url=filepath,
        audio_hash=audio_hash,
        status="pending"
    )
    db.session.add(new_track)
    db.session.commit()

    return jsonify({"message": "Track uploaded successfully", "track_id": new_track.id}), 201