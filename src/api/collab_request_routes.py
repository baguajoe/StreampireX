from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from .models import db, User, CollabRequest, CollabApplication

collab_bp = Blueprint('collab_requests', __name__)


def req_to_dict(r, include_apps=False):
    user = User.query.get(r.user_id)
    d = {
        'id': r.id,
        'user': {'id': user.id, 'username': user.username,
                 'profile_picture': getattr(user, 'profile_picture', None)} if user else {},
        'role': r.role, 'looking_for': r.looking_for,
        'title': r.title, 'description': r.description,
        'genre': r.genre, 'sample_url': r.sample_url,
        'status': r.status, 'created_at': r.created_at.isoformat(),
    }
    if include_apps:
        apps = CollabApplication.query.filter_by(request_id=r.id).all()
        d['application_count'] = len(apps)
    return d

# GET /api/collab/feed?role=producer&genre=hip-hop
@collab_bp.route('/api/collab/feed', methods=['GET'])
def get_feed():
    role  = request.args.get('role')
    genre = request.args.get('genre')
    q = CollabRequest.query.filter_by(status='open')
    if role:
        q = q.filter(CollabRequest.looking_for == role)
    if genre:
        q = q.filter(CollabRequest.genre.ilike(f'%{genre}%'))
    reqs = q.order_by(CollabRequest.created_at.desc()).limit(50).all()
    return jsonify([req_to_dict(r, include_apps=True) for r in reqs]), 200

# POST /api/collab/post
@collab_bp.route('/api/collab/post', methods=['POST'])
@jwt_required()
def post_request():
    user_id = get_jwt_identity()
    data    = request.get_json()
    req = CollabRequest(
        user_id=user_id,
        role=data.get('role', 'producer'),
        looking_for=data.get('looking_for', 'vocalist'),
        title=data.get('title', ''),
        description=data.get('description', ''),
        genre=data.get('genre', ''),
        sample_url=data.get('sample_url', ''),
    )
    db.session.add(req)
    db.session.commit()
    return jsonify({'success': True, 'request': req_to_dict(req)}), 201

# POST /api/collab/<request_id>/apply
@collab_bp.route('/api/collab/<int:request_id>/apply', methods=['POST'])
@jwt_required()
def apply(request_id):
    applicant_id = get_jwt_identity()
    data = request.get_json()
    existing = CollabApplication.query.filter_by(
        request_id=request_id, applicant_id=applicant_id).first()
    if existing:
        return jsonify({'error': 'Already applied'}), 400
    app = CollabApplication(
        request_id=request_id, applicant_id=applicant_id,
        message=data.get('message', ''),
        sample_url=data.get('sample_url', ''),
    )
    db.session.add(app)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Application sent!'}), 201

# GET /api/collab/my-posts
@collab_bp.route('/api/collab/my-posts', methods=['GET'])
@jwt_required()
def my_posts():
    user_id = get_jwt_identity()
    reqs = CollabRequest.query.filter_by(user_id=user_id).order_by(
        CollabRequest.created_at.desc()).all()
    return jsonify([req_to_dict(r, include_apps=True) for r in reqs]), 200

# PATCH /api/collab/<request_id>/close
@collab_bp.route('/api/collab/<int:request_id>/close', methods=['PATCH'])
@jwt_required()
def close_request(request_id):
    user_id = get_jwt_identity()
    req = CollabRequest.query.get_or_404(request_id)
    if req.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    req.status = 'closed'
    db.session.commit()
    return jsonify({'success': True}), 200

# PATCH /api/collab/application/<app_id>/respond
@collab_bp.route('/api/collab/application/<int:app_id>/respond', methods=['PATCH'])
@jwt_required()
def respond_application(app_id):
    user_id = get_jwt_identity()
    data    = request.get_json()
    app     = CollabApplication.query.get_or_404(app_id)
    req     = CollabRequest.query.get(app.request_id)
    if req.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    app.status = data.get('status', 'pending')  # accepted | rejected
    db.session.commit()
    return jsonify({'success': True}), 200
