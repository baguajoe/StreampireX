from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User, VideoSeries
import json

series_bp = Blueprint('series', __name__)


@series_bp.route('/api/series', methods=['GET'])
def browse_series():
    genre = request.args.get('genre')
    creator_id = request.args.get('creator_id')
    query = VideoSeries.query.filter_by(is_public=True)
    if genre:
        query = query.filter_by(genre=genre)
    if creator_id:
        query = query.filter_by(creator_id=creator_id)
    series = query.order_by(VideoSeries.created_at.desc()).limit(50).all()
    return jsonify([s.serialize() for s in series])


@series_bp.route('/api/series/my', methods=['GET'])
@jwt_required()
def my_series():
    user_id = get_jwt_identity()
    series = VideoSeries.query.filter_by(creator_id=user_id).order_by(VideoSeries.created_at.desc()).all()
    return jsonify([s.serialize() for s in series])


@series_bp.route('/api/series/<int:series_id>', methods=['GET'])
def get_series(series_id):
    s = VideoSeries.query.get_or_404(series_id)
    if not s.is_public:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(s.serialize())


@series_bp.route('/api/series', methods=['POST'])
@jwt_required()
def create_series():
    user_id = get_jwt_identity()
    data = request.get_json()
    s = VideoSeries(
        creator_id=user_id,
        title=data.get('title', 'Untitled Series'),
        description=data.get('description', ''),
        thumbnail_url=data.get('thumbnail_url', ''),
        genre=data.get('genre', ''),
        tags=json.dumps(data.get('tags', [])),
        episodes_json=json.dumps(data.get('episodes', [])),
        is_public=data.get('is_public', True),
        is_complete=data.get('is_complete', False),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.serialize()), 201


@series_bp.route('/api/series/<int:series_id>', methods=['PUT'])
@jwt_required()
def update_series(series_id):
    user_id = get_jwt_identity()
    s = VideoSeries.query.filter_by(id=series_id, creator_id=user_id).first_or_404()
    data = request.get_json()
    s.title = data.get('title', s.title)
    s.description = data.get('description', s.description)
    s.thumbnail_url = data.get('thumbnail_url', s.thumbnail_url)
    s.genre = data.get('genre', s.genre)
    s.tags = json.dumps(data.get('tags', json.loads(s.tags or '[]')))
    s.episodes_json = json.dumps(data.get('episodes', json.loads(s.episodes_json or '[]')))
    s.is_public = data.get('is_public', s.is_public)
    s.is_complete = data.get('is_complete', s.is_complete)
    s.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(s.serialize())


@series_bp.route('/api/series/<int:series_id>', methods=['DELETE'])
@jwt_required()
def delete_series(series_id):
    user_id = get_jwt_identity()
    s = VideoSeries.query.filter_by(id=series_id, creator_id=user_id).first_or_404()
    db.session.delete(s)
    db.session.commit()
    return jsonify({'message': 'Series deleted'})


@series_bp.route('/api/series/<int:series_id>/episodes', methods=['POST'])
@jwt_required()
def add_episode(series_id):
    user_id = get_jwt_identity()
    s = VideoSeries.query.filter_by(id=series_id, creator_id=user_id).first_or_404()
    data = request.get_json()
    episodes = json.loads(s.episodes_json or '[]')
    episodes.append({
        'video_id': data.get('video_id'),
        'title': data.get('title', f'Episode {len(episodes) + 1}'),
        'description': data.get('description', ''),
        'thumbnail_url': data.get('thumbnail_url', ''),
        'order': len(episodes) + 1,
    })
    s.episodes_json = json.dumps(episodes)
    s.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(s.serialize())


@series_bp.route('/api/series/<int:series_id>/episodes/reorder', methods=['PUT'])
@jwt_required()
def reorder_episodes(series_id):
    user_id = get_jwt_identity()
    s = VideoSeries.query.filter_by(id=series_id, creator_id=user_id).first_or_404()
    data = request.get_json()
    s.episodes_json = json.dumps(data.get('episodes', []))
    s.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(s.serialize())