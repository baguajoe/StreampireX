from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime
from .models import db, User, Comment, CommentLike

comment_bp = Blueprint('comments', __name__)


# ── GET comments for any content ──────────────────────────────────────────

@comment_bp.route('/api/comments/<string:content_type>/<int:content_id>', methods=['GET'])
def get_comments(content_type, content_id):
    # SOC-4 (MED-A): paginate to prevent app freeze on viral threads
    page = max(1, int(request.args.get('page', 1) or 1))
    per_page = max(1, min(int(request.args.get('per_page', 50) or 50), 100))

    base = Comment.query.filter_by(
        content_type=content_type,
        content_id=content_id,
        parent_id=None,  # top-level only
    ).order_by(Comment.timestamp.asc())
    pagination = base.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for c in pagination.items:
        c_data = _serialize_comment(c)
        # Attach replies (cap per-comment at 50 to prevent runaway expansion)
        replies = Comment.query.filter_by(parent_id=c.id).order_by(Comment.timestamp.asc()).limit(50).all()
        c_data['replies'] = [_serialize_comment(r) for r in replies]
        result.append(c_data)

    return jsonify({
        'comments': result,
        'count': len(result),
        'page': pagination.page,
        'per_page': pagination.per_page,
        'total': pagination.total,
        'pages': pagination.pages,
    })


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

    # SOC-1 (HIGH-C1): validate content_type, content_id, and text length
    VALID_CONTENT_TYPES = {'song', 'podcast', 'video', 'radio', 'livestream', 'post', 'episode', 'track'}
    MAX_COMMENT_LENGTH = 5000

    if not content_type or not content_id:
        return jsonify({'error': 'content_type and content_id are required'}), 400
    if content_type not in VALID_CONTENT_TYPES:
        return jsonify({'error': f'Invalid content_type. Must be one of: {sorted(VALID_CONTENT_TYPES)}'}), 400
    try:
        content_id = int(content_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'content_id must be an integer'}), 400
    if not text:
        return jsonify({'error': 'Comment text is required'}), 400
    if len(text) > MAX_COMMENT_LENGTH:
        return jsonify({'error': f'Comment exceeds max length of {MAX_COMMENT_LENGTH} characters'}), 400

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
    """SOC-2 (HIGH-C2): per-user toggle backed by CommentLike uniqueness.

    Previously this just incremented Comment.likes unbounded. Now each
    user can like a comment exactly once; second POST removes the like.
    Comment.likes is kept as a denormalized counter for read-side
    performance.
    """
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)

    existing = CommentLike.query.filter_by(
        comment_id=comment_id, user_id=user_id
    ).first()

    if existing:
        db.session.delete(existing)
        comment.likes = max(0, (comment.likes or 0) - 1)
        db.session.commit()
        return jsonify({'liked': False, 'likes': comment.likes}), 200

    db.session.add(CommentLike(comment_id=comment_id, user_id=user_id))
    comment.likes = (comment.likes or 0) + 1
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        # Race: another request inserted the like between query and commit.
        # Treat as already-liked, no-op.
        return jsonify({'liked': True, 'likes': comment.likes}), 200
    return jsonify({'liked': True, 'likes': comment.likes}), 201


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