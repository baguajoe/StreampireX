from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime
from .models import db, User, Comment

comment_bp = Blueprint('comments', __name__)


# ── GET comments for any content ──────────────────────────────────────────

@comment_bp.route('/api/comments/<string:content_type>/<int:content_id>', methods=['GET'])
def get_comments(content_type, content_id):
    comments = Comment.query.filter_by(
        content_type=content_type,
        content_id=content_id,
        parent_id=None,  # top-level only
    ).order_by(Comment.timestamp.asc()).all()

    result = []
    for c in comments:
        c_data = _serialize_comment(c)
        # Attach replies
        replies = Comment.query.filter_by(parent_id=c.id).order_by(Comment.timestamp.asc()).all()
        c_data['replies'] = [_serialize_comment(r) for r in replies]
        result.append(c_data)

    return jsonify({'comments': result, 'count': len(result)})


# ── POST a new comment ────────────────────────────────────────────────────

@comment_bp.route('/api/comments', methods=['POST'])
@jwt_required()
def post_comment():
    user_id = get_jwt_identity()
    data = request.get_json()

    content_type = data.get('content_type')
    content_id = data.get('content_id')
    text = data.get('text', '').strip()
    timestamp = data.get('timestamp', 0.0)   # waveform position in seconds
    parent_id = data.get('parent_id', None)  # for replies

    if not content_type or not content_id:
        return jsonify({'error': 'content_type and content_id are required'}), 400
    if not text:
        return jsonify({'error': 'Comment text is required'}), 400

    comment = Comment(
        user_id=user_id,
        content_type=content_type,
        content_id=content_id,
        text=text,
        timestamp=float(timestamp),
        parent_id=parent_id,
        likes=0,
        created_at=datetime.utcnow() if hasattr(Comment, 'created_at') else None,
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(_serialize_comment(comment)), 201


# ── DELETE a comment ──────────────────────────────────────────────────────

@comment_bp.route('/api/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)

    if comment.user_id != user_id:
        return jsonify({'error': 'Not authorized'}), 403

    # Delete replies first
    Comment.query.filter_by(parent_id=comment_id).delete()
    db.session.delete(comment)
    db.session.commit()
    return jsonify({'message': 'Comment deleted'})


# ── LIKE a comment ────────────────────────────────────────────────────────

@comment_bp.route('/api/comments/<int:comment_id>/like', methods=['POST'])
@jwt_required()
def like_comment(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    comment.likes = (comment.likes or 0) + 1
    db.session.commit()
    return jsonify({'likes': comment.likes})


# ── Helper ────────────────────────────────────────────────────────────────

def _serialize_comment(c):
    user = User.query.get(c.user_id)
    return {
        'id': c.id,
        'user_id': c.user_id,
        'username': user.username if user else 'Unknown',
        'profile_photo': user.profile_photo if user else None,
        'text': c.text,
        'timestamp': float(c.timestamp) if c.timestamp else 0.0,
        'parent_id': c.parent_id if hasattr(c, 'parent_id') else None,
        'likes': c.likes if hasattr(c, 'likes') else 0,
        'created_at': c.created_at.isoformat() if hasattr(c, 'created_at') and c.created_at else None,
        'replies': [],
    }