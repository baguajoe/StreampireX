"""
Follow, Unfollow, and Block Routes for StreamPireX
Add this to your Flask backend (e.g., follow_routes.py)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.api.models import db, User, Follow, Block
from datetime import datetime

# Assuming you have these models - adjust imports as needed
# from models import db, User, Follow, Block

follow_bp = Blueprint('follow', __name__)

# ============================================
# FOLLOW ROUTES
# ============================================

@follow_bp.route('/api/follow/<int:user_id>', methods=['POST'])
@jwt_required()
def follow_user(user_id):
    """Follow a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Can't follow yourself
        if int(current_user_id) == user_id:
            return jsonify({"error": "You cannot follow yourself"}), 400
        
        # Check if target user exists
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if blocked (either direction)
        block_exists = Block.query.filter(
            ((Block.blocker_id == current_user_id) & (Block.blocked_id == user_id)) |
            ((Block.blocker_id == user_id) & (Block.blocked_id == current_user_id))
        ).first()
        
        if block_exists:
            return jsonify({"error": "Cannot follow this user"}), 403
        
        # Check if already following
        existing_follow = Follow.query.filter_by(
            follower_id=current_user_id,
            following_id=user_id
        ).first()
        
        if existing_follow:
            return jsonify({"error": "Already following this user"}), 400
        
        # Create follow relationship
        new_follow = Follow(
            follower_id=current_user_id,
            following_id=user_id,
            created_at=datetime.utcnow()
        )
        db.session.add(new_follow)
        
        # Update follower/following counts
        current_user = User.query.get(current_user_id)
        current_user.following_count = (current_user.following_count or 0) + 1
        target_user.follower_count = (target_user.follower_count or 0) + 1
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Now following {target_user.username}",
            "is_following": True,
            "follower_count": target_user.follower_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Follow error: {str(e)}")
        return jsonify({"error": "Failed to follow user"}), 500


@follow_bp.route('/api/unfollow/<int:user_id>', methods=['POST'])
@jwt_required()
def unfollow_user(user_id):
    """Unfollow a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Can't unfollow yourself
        if int(current_user_id) == user_id:
            return jsonify({"error": "You cannot unfollow yourself"}), 400
        
        # Check if target user exists
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if following
        existing_follow = Follow.query.filter_by(
            follower_id=current_user_id,
            following_id=user_id
        ).first()
        
        if not existing_follow:
            return jsonify({"error": "You are not following this user"}), 400
        
        # Remove follow relationship
        db.session.delete(existing_follow)
        
        # Update follower/following counts
        current_user = User.query.get(current_user_id)
        current_user.following_count = max((current_user.following_count or 1) - 1, 0)
        target_user.follower_count = max((target_user.follower_count or 1) - 1, 0)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Unfollowed {target_user.username}",
            "is_following": False,
            "follower_count": target_user.follower_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Unfollow error: {str(e)}")
        return jsonify({"error": "Failed to unfollow user"}), 500


@follow_bp.route('/api/follow/status/<int:user_id>', methods=['GET'])
@jwt_required()
def get_follow_status(user_id):
    """Check if current user is following target user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if following
        is_following = Follow.query.filter_by(
            follower_id=current_user_id,
            following_id=user_id
        ).first() is not None
        
        # Check if blocked (either direction)
        is_blocked = Block.query.filter(
            ((Block.blocker_id == current_user_id) & (Block.blocked_id == user_id)) |
            ((Block.blocker_id == user_id) & (Block.blocked_id == current_user_id))
        ).first() is not None
        
        # Check if they follow you back
        follows_you = Follow.query.filter_by(
            follower_id=user_id,
            following_id=current_user_id
        ).first() is not None
        
        return jsonify({
            "is_following": is_following,
            "is_blocked": is_blocked,
            "follows_you": follows_you
        }), 200
        
    except Exception as e:
        print(f"Follow status error: {str(e)}")
        return jsonify({"error": "Failed to get follow status"}), 500


@follow_bp.route('/api/followers/<int:user_id>', methods=['GET'])
@jwt_required()
def get_followers(user_id):
    """Get list of followers for a user"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        followers_query = Follow.query.filter_by(following_id=user_id)\
            .order_by(Follow.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        followers = []
        for follow in followers_query.items:
            user = User.query.get(follow.follower_id)
            if user:
                followers.append({
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "profile_picture": user.profile_picture,
                    "bio": user.bio,
                    "follower_count": user.follower_count or 0,
                    "followed_at": follow.created_at.isoformat() if follow.created_at else None
                })
        
        return jsonify({
            "followers": followers,
            "total": followers_query.total,
            "page": page,
            "pages": followers_query.pages,
            "has_next": followers_query.has_next,
            "has_prev": followers_query.has_prev
        }), 200
        
    except Exception as e:
        print(f"Get followers error: {str(e)}")
        return jsonify({"error": "Failed to get followers"}), 500


@follow_bp.route('/api/following/<int:user_id>', methods=['GET'])
@jwt_required()
def get_following(user_id):
    """Get list of users that a user is following"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        following_query = Follow.query.filter_by(follower_id=user_id)\
            .order_by(Follow.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        following = []
        for follow in following_query.items:
            user = User.query.get(follow.following_id)
            if user:
                following.append({
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "profile_picture": user.profile_picture,
                    "bio": user.bio,
                    "follower_count": user.follower_count or 0,
                    "followed_at": follow.created_at.isoformat() if follow.created_at else None
                })
        
        return jsonify({
            "following": following,
            "total": following_query.total,
            "page": page,
            "pages": following_query.pages,
            "has_next": following_query.has_next,
            "has_prev": following_query.has_prev
        }), 200
        
    except Exception as e:
        print(f"Get following error: {str(e)}")
        return jsonify({"error": "Failed to get following"}), 500


# ============================================
# BLOCK ROUTES
# ============================================

@follow_bp.route('/api/block/<int:user_id>', methods=['POST'])
@jwt_required()
def block_user(user_id):
    """Block a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Can't block yourself
        if int(current_user_id) == user_id:
            return jsonify({"error": "You cannot block yourself"}), 400
        
        # Check if target user exists
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if already blocked
        existing_block = Block.query.filter_by(
            blocker_id=current_user_id,
            blocked_id=user_id
        ).first()
        
        if existing_block:
            return jsonify({"error": "User is already blocked"}), 400
        
        # Create block
        new_block = Block(
            blocker_id=current_user_id,
            blocked_id=user_id,
            created_at=datetime.utcnow()
        )
        db.session.add(new_block)
        
        # Remove any follow relationships (both directions)
        Follow.query.filter_by(follower_id=current_user_id, following_id=user_id).delete()
        Follow.query.filter_by(follower_id=user_id, following_id=current_user_id).delete()
        
        # Update counts
        current_user = User.query.get(current_user_id)
        
        # Recalculate counts (safer approach)
        current_user.following_count = Follow.query.filter_by(follower_id=current_user_id).count()
        current_user.follower_count = Follow.query.filter_by(following_id=current_user_id).count()
        target_user.following_count = Follow.query.filter_by(follower_id=user_id).count()
        target_user.follower_count = Follow.query.filter_by(following_id=user_id).count()
        
        # Remove from inner circle (if you have this feature)
        try:
            from models import InnerCircle
            InnerCircle.query.filter_by(user_id=current_user_id, friend_user_id=user_id).delete()
            InnerCircle.query.filter_by(user_id=user_id, friend_user_id=current_user_id).delete()
        except:
            pass  # InnerCircle model may not exist
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Blocked {target_user.username}",
            "is_blocked": True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Block error: {str(e)}")
        return jsonify({"error": "Failed to block user"}), 500


@follow_bp.route('/api/unblock/<int:user_id>', methods=['POST'])
@jwt_required()
def unblock_user(user_id):
    """Unblock a user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if target user exists
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if blocked
        existing_block = Block.query.filter_by(
            blocker_id=current_user_id,
            blocked_id=user_id
        ).first()
        
        if not existing_block:
            return jsonify({"error": "User is not blocked"}), 400
        
        # Remove block
        db.session.delete(existing_block)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Unblocked {target_user.username}",
            "is_blocked": False
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Unblock error: {str(e)}")
        return jsonify({"error": "Failed to unblock user"}), 500


@follow_bp.route('/api/block/status/<int:user_id>', methods=['GET'])
@jwt_required()
def get_block_status(user_id):
    """Check block status between current user and target user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Check if you blocked them
        you_blocked_them = Block.query.filter_by(
            blocker_id=current_user_id,
            blocked_id=user_id
        ).first() is not None
        
        # Check if they blocked you
        they_blocked_you = Block.query.filter_by(
            blocker_id=user_id,
            blocked_id=current_user_id
        ).first() is not None
        
        return jsonify({
            "you_blocked_them": you_blocked_them,
            "they_blocked_you": they_blocked_you,
            "is_blocked": you_blocked_them or they_blocked_you
        }), 200
        
    except Exception as e:
        print(f"Block status error: {str(e)}")
        return jsonify({"error": "Failed to get block status"}), 500


@follow_bp.route('/api/blocked-users', methods=['GET'])
@jwt_required()
def get_blocked_users():
    """Get list of users you have blocked"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        blocks_query = Block.query.filter_by(blocker_id=current_user_id)\
            .order_by(Block.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        blocked_users = []
        for block in blocks_query.items:
            user = User.query.get(block.blocked_id)
            if user:
                blocked_users.append({
                    "id": user.id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "profile_picture": user.profile_picture,
                    "blocked_at": block.created_at.isoformat() if block.created_at else None
                })
        
        return jsonify({
            "blocked_users": blocked_users,
            "total": blocks_query.total,
            "page": page,
            "pages": blocks_query.pages,
            "has_next": blocks_query.has_next
        }), 200
        
    except Exception as e:
        print(f"Get blocked users error: {str(e)}")
        return jsonify({"error": "Failed to get blocked users"}), 500


# ============================================
# SUGGESTED USERS (excludes blocked/following)
# ============================================

@follow_bp.route('/api/suggested-users', methods=['GET'])
@jwt_required()
def get_suggested_users():
    """Get suggested users to follow (excludes blocked and already following)"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        # Get IDs of users you're following
        following_ids = [f.following_id for f in Follow.query.filter_by(follower_id=current_user_id).all()]
        
        # Get IDs of blocked users (both directions)
        blocked_ids = [b.blocked_id for b in Block.query.filter_by(blocker_id=current_user_id).all()]
        blocked_by_ids = [b.blocker_id for b in Block.query.filter_by(blocked_id=current_user_id).all()]
        
        # Combine all excluded IDs
        excluded_ids = set(following_ids + blocked_ids + blocked_by_ids + [int(current_user_id)])
        
        # Get suggested users
        suggested_query = User.query.filter(
            User.id.notin_(excluded_ids),
            User.is_active == True  # Only active users
        ).order_by(
            User.follower_count.desc()  # Most popular first
        ).limit(limit)
        
        suggestions = []
        for user in suggested_query.all():
            suggestions.append({
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "profile_picture": user.profile_picture,
                "bio": user.bio,
                "follower_count": user.follower_count or 0,
                "is_verified": user.is_verified if hasattr(user, 'is_verified') else False
            })
        
        return jsonify({
            "suggestions": suggestions,
            "count": len(suggestions)
        }), 200
        
    except Exception as e:
        print(f"Get suggested users error: {str(e)}")
        return jsonify({"error": "Failed to get suggested users"}), 500