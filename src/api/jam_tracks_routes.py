"""
jam_tracks_routes.py
StreamPireX — Jam Track Library API Routes

Endpoints:
  GET  /api/jam-tracks                  — list all tracks with filter/search
  GET  /api/jam-tracks/<id>             — track detail + presigned stem URLs
  GET  /api/jam-tracks/<id>/stems       — presigned URLs for each stem
  GET  /api/jam-tracks/<id>/download    — presigned full-mix download URL
  POST /api/jam-tracks/<id>/record      — save a user's recording over a jam track

Storage layout in R2:
  jam-tracks/<track_id>/mix.mp3
  jam-tracks/<track_id>/stems/drums.wav
  jam-tracks/<track_id>/stems/bass.wav
  jam-tracks/<track_id>/stems/keys.wav
  jam-tracks/<track_id>/stems/guitar.wav
  jam-tracks/<track_id>/stems/horns.wav
  jam-tracks/recordings/<user_id>/<track_id>/<recording_id>.webm
"""

import os
import uuid
from datetime import datetime

import boto3
from botocore.client import Config
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

jam_tracks_bp = Blueprint('jam_tracks', __name__)

R2_ENDPOINT = os.environ.get('R2_ENDPOINT_URL', '')
R2_KEY      = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET   = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET   = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')

s3 = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_KEY,
    aws_secret_access_key=R2_SECRET,
    config=Config(signature_version='s3v4'),
    region_name='auto',
)

def presign(key, expiry=3600, method='get_object'):
    try:
        return s3.generate_presigned_url(
            method,
            Params={'Bucket': R2_BUCKET, 'Key': key},
            ExpiresIn=expiry,
        )
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Track metadata — in production replace with DB model
# ---------------------------------------------------------------------------
# class JamTrack(db.Model):
#     __tablename__ = 'jam_tracks'
#     id         = db.Column(db.String(36), primary_key=True)
#     title      = db.Column(db.String(128), nullable=False)
#     genre      = db.Column(db.String(64))
#     key        = db.Column(db.String(8))
#     bpm        = db.Column(db.Integer)
#     difficulty = db.Column(db.String(32))
#     duration   = db.Column(db.Integer)   # seconds
#     stems      = db.Column(db.JSON)      # list of stem names
#     description= db.Column(db.Text)
#     active     = db.Column(db.Boolean, default=True)

MOCK_TRACKS = [
    {'id':'j1',  'title':'Minor Blues Shuffle',    'genre':'Blues',    'key':'Am','bpm':76,  'difficulty':'Beginner',    'duration':240, 'stems':['drums','bass','keys','guitar']},
    {'id':'j2',  'title':'Jazz Swing Standard',    'genre':'Jazz',     'key':'F', 'bpm':120, 'difficulty':'Intermediate','duration':300, 'stems':['drums','bass','keys','guitar']},
    {'id':'j3',  'title':'Hard Rock Power Groove', 'genre':'Rock',     'key':'E', 'bpm':120, 'difficulty':'Intermediate','duration':210, 'stems':['drums','bass','guitar']},
    {'id':'j4',  'title':'Funky Chicken',          'genre':'Funk',     'key':'Gm','bpm':98,  'difficulty':'Intermediate','duration':240, 'stems':['drums','bass','keys','guitar','horns']},
    {'id':'j5',  'title':'Neo-Soul Groove',        'genre':'R&B',      'key':'Dm','bpm':88,  'difficulty':'Beginner',    'duration':270, 'stems':['drums','bass','keys','guitar']},
]


# ---------------------------------------------------------------------------
# GET /api/jam-tracks
# ---------------------------------------------------------------------------
@jam_tracks_bp.route('/api/jam-tracks', methods=['GET'])
def list_tracks():
    genre  = request.args.get('genre')
    key    = request.args.get('key')
    diff   = request.args.get('difficulty')
    search = request.args.get('q', '').lower()

    tracks = MOCK_TRACKS  # replace with JamTrack.query.filter_by(active=True).all()

    if genre:  tracks = [t for t in tracks if t['genre'] == genre]
    if key:    tracks = [t for t in tracks if t['key'] == key]
    if diff:   tracks = [t for t in tracks if t['difficulty'] == diff]
    if search: tracks = [t for t in tracks if search in t['title'].lower()]

    return jsonify({'tracks': tracks, 'total': len(tracks)}), 200


# ---------------------------------------------------------------------------
# GET /api/jam-tracks/<track_id>
# ---------------------------------------------------------------------------
@jam_tracks_bp.route('/api/jam-tracks/<track_id>', methods=['GET'])
def get_track(track_id):
    track = next((t for t in MOCK_TRACKS if t['id'] == track_id), None)
    if not track:
        return jsonify({'error': 'Track not found'}), 404

    mix_url = presign(f'jam-tracks/{track_id}/mix.mp3')
    return jsonify({**track, 'mix_url': mix_url}), 200


# ---------------------------------------------------------------------------
# GET /api/jam-tracks/<track_id>/stems
# ---------------------------------------------------------------------------
@jam_tracks_bp.route('/api/jam-tracks/<track_id>/stems', methods=['GET'])
def get_stems(track_id):
    track = next((t for t in MOCK_TRACKS if t['id'] == track_id), None)
    if not track:
        return jsonify({'error': 'Track not found'}), 404

    stem_urls = {}
    for stem in track.get('stems', []):
        key = f'jam-tracks/{track_id}/stems/{stem}.wav'
        stem_urls[stem] = presign(key)

    return jsonify({'track_id': track_id, 'stems': stem_urls}), 200


# ---------------------------------------------------------------------------
# GET /api/jam-tracks/<track_id>/download
# ---------------------------------------------------------------------------
@jam_tracks_bp.route('/api/jam-tracks/<track_id>/download', methods=['GET'])
@jwt_required()
def download_track(track_id):
    download_url = presign(f'jam-tracks/{track_id}/mix.mp3', expiry=300)
    if not download_url:
        return jsonify({'error': 'Could not generate download URL'}), 500
    return jsonify({'download_url': download_url}), 200


# ---------------------------------------------------------------------------
# POST /api/jam-tracks/<track_id>/record
# Upload a user's recording made over this jam track
# ---------------------------------------------------------------------------
@jam_tracks_bp.route('/api/jam-tracks/<track_id>/record', methods=['POST'])
@jwt_required()
def save_recording(track_id):
    user_id = get_jwt_identity()
    audio_file = request.files.get('file')
    if not audio_file:
        return jsonify({'error': 'No audio file provided'}), 400

    rec_id  = str(uuid.uuid4())
    r2_key  = f'jam-tracks/recordings/{user_id}/{track_id}/{rec_id}.webm'

    try:
        s3.upload_fileobj(
            audio_file,
            R2_BUCKET,
            r2_key,
            ExtraArgs={'ContentType': 'audio/webm'},
        )
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

    playback_url = presign(r2_key, expiry=86400)

    return jsonify({
        'message': 'Recording saved',
        'recording_id': rec_id,
        'track_id': track_id,
        'playback_url': playback_url,
        'r2_key': r2_key,
    }), 201
