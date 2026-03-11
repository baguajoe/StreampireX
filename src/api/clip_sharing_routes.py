import os, uuid, subprocess, tempfile, boto3
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User

clip_bp = Blueprint('clip_sharing', __name__)

R2_ENDPOINT   = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_BUCKET     = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', 'https://pub-3a956be9429449469ec53b73495e.r2.dev')

class Clip(db.Model):
    __tablename__ = 'content_clips'
    id           = db.Column(db.Integer, primary_key=True)
    creator_id   = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    source_url   = db.Column(db.String(500), nullable=False)
    clip_url     = db.Column(db.String(500))
    r2_key       = db.Column(db.String(300))
    title        = db.Column(db.String(200))
    start_time   = db.Column(db.Float, default=0)
    duration     = db.Column(db.Float, default=30)
    content_type = db.Column(db.String(50), default='track')  # track | podcast | stream
    source_id    = db.Column(db.Integer)
    play_count   = db.Column(db.Integer, default=0)
    share_token  = db.Column(db.String(64), unique=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

def get_r2():
    return boto3.client('s3', endpoint_url=R2_ENDPOINT,
                        aws_access_key_id=R2_ACCESS_KEY,
                        aws_secret_access_key=R2_SECRET_KEY,
                        region_name='auto')

# POST /api/clips/create  — clip audio from source_url
@clip_bp.route('/api/clips/create', methods=['POST'])
@jwt_required()
def create_clip():
    creator_id = get_jwt_identity()
    data       = request.get_json()
    source_url = data.get('source_url', '')
    start      = float(data.get('start_time', 0))
    duration   = min(float(data.get('duration', 30)), 60)  # max 60s
    title      = data.get('title', 'Clip')
    content_type = data.get('content_type', 'track')
    source_id  = data.get('source_id')

    if not source_url:
        return jsonify({'error': 'source_url required'}), 400

    uid = uuid.uuid4().hex[:12]
    share_token = uuid.uuid4().hex[:32]

    with tempfile.TemporaryDirectory() as tmpdir:
        input_path  = os.path.join(tmpdir, f'input_{uid}.mp3')
        output_path = os.path.join(tmpdir, f'clip_{uid}.mp3')

        # Download source
        try:
            import requests as req
            r = req.get(source_url, timeout=60)
            with open(input_path, 'wb') as f:
                f.write(r.content)
        except Exception as e:
            return jsonify({'error': f'Could not fetch source: {e}'}), 500

        # FFmpeg clip
        result = subprocess.run([
            'ffmpeg', '-y', '-ss', str(start), '-i', input_path,
            '-t', str(duration), '-c:a', 'libmp3lame', '-q:a', '4',
            output_path
        ], capture_output=True, timeout=60)

        if result.returncode != 0:
            return jsonify({'error': 'Clip generation failed'}), 500

        # Upload to R2
        r2_key = f'clips/{creator_id}/{uid}.mp3'
        clip_url = None
        try:
            client = get_r2()
            with open(output_path, 'rb') as f:
                client.put_object(Bucket=R2_BUCKET, Key=r2_key,
                                  Body=f, ContentType='audio/mpeg')
            clip_url = f"{R2_PUBLIC_URL}/{r2_key}"
        except Exception as e:
            pass

        clip = Clip(
            creator_id=creator_id, source_url=source_url,
            clip_url=clip_url, r2_key=r2_key, title=title,
            start_time=start, duration=duration,
            content_type=content_type, source_id=source_id,
            share_token=share_token,
        )
        db.session.add(clip)
        db.session.commit()

        return jsonify({
            'success': True,
            'clip': {
                'id': clip.id, 'clip_url': clip_url,
                'share_url': f"/clip/{share_token}",
                'title': title, 'duration': duration,
                'share_token': share_token,
            }
        }), 201

# GET /api/clips/<share_token>  — public clip view (no auth)
@clip_bp.route('/api/clips/<share_token>', methods=['GET'])
def get_clip(share_token):
    clip = Clip.query.filter_by(share_token=share_token).first_or_404()
    clip.play_count += 1
    db.session.commit()
    creator = User.query.get(clip.creator_id)
    return jsonify({
        'id': clip.id, 'title': clip.title,
        'clip_url': clip.clip_url, 'duration': clip.duration,
        'content_type': clip.content_type,
        'play_count': clip.play_count,
        'creator': {'username': creator.username,
                    'profile_picture': getattr(creator, 'profile_picture', None)} if creator else {},
        'created_at': clip.created_at.isoformat(),
    }), 200

# GET /api/clips/my-clips
@clip_bp.route('/api/clips/my-clips', methods=['GET'])
@jwt_required()
def my_clips():
    creator_id = get_jwt_identity()
    clips = Clip.query.filter_by(creator_id=creator_id).order_by(
        Clip.created_at.desc()).limit(50).all()
    return jsonify([{
        'id': c.id, 'title': c.title, 'clip_url': c.clip_url,
        'duration': c.duration, 'play_count': c.play_count,
        'share_token': c.share_token,
        'share_url': f"/clip/{c.share_token}",
        'created_at': c.created_at.isoformat(),
    } for c in clips]), 200
