# src/api/messages_routes.py
# =====================================================
# MESSAGING & USER SEARCH API ROUTES
# =====================================================
# Add to your Flask app with: app.register_blueprint(messages_bp)

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import or_, and_, desc, func

# Import your models - adjust path if needed
from src.api.models import db, User, Message, Conversation

messages_bp = Blueprint('messages', __name__)


# =====================================================
# CONVERSATIONS
# =====================================================

@messages_bp.route('/api/messages/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """
    Get all conversations for the current user.
    Returns list of conversations with other user info and last message.
    """
    try:
        user_id = get_jwt_identity()
        
        # Try to get conversations from Conversation model first
        try:
            conversations = Conversation.query.filter(
                or_(
                    Conversation.user1_id == user_id,
                    Conversation.user2_id == user_id
                )
            ).order_by(desc(Conversation.updated_at)).all()
            
            result = []
            for conv in conversations:
                # Determine the other user
                other_user_id = conv.user2_id if conv.user1_id == user_id else conv.user1_id
                other_user = User.query.get(other_user_id)
                
                if other_user:
                    # Get last message
                    last_msg = Message.query.filter(
                        or_(
                            and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                            and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
                        )
                    ).order_by(desc(Message.created_at)).first()
                    
                    # Count unread messages
                    unread_count = Message.query.filter(
                        Message.sender_id == other_user_id,
                        Message.recipient_id == user_id,
                        Message.is_read == False
                    ).count() if hasattr(Message, 'is_read') else 0
                    
                    result.append({
                        'conversation_id': conv.id,
                        'other_user': {
                            'id': other_user.id,
                            'username': other_user.username,
                            'display_name': getattr(other_user, 'display_name', other_user.username),
                            'profile_picture': getattr(other_user, 'profile_picture', None) or getattr(other_user, 'avatar_url', None)
                        },
                        'last_message': last_msg.message if last_msg else None,
                        'last_message_at': last_msg.created_at.isoformat() if last_msg else conv.updated_at.isoformat(),
                        'unread_count': unread_count
                    })
            
            return jsonify(result), 200
            
        except Exception as conv_error:
            # Fallback: Build conversations from messages directly
            print(f"Conversation model error, using messages fallback: {conv_error}")
            
            # Get unique users we've messaged with
            sent_to = db.session.query(Message.recipient_id.distinct()).filter(
                Message.sender_id == user_id
            ).all()
            received_from = db.session.query(Message.sender_id.distinct()).filter(
                Message.recipient_id == user_id
            ).all()
            
            # Combine unique user IDs
            other_user_ids = set([r[0] for r in sent_to] + [r[0] for r in received_from])
            
            result = []
            for other_id in other_user_ids:
                other_user = User.query.get(other_id)
                if not other_user:
                    continue
                    
                # Get last message
                last_msg = Message.query.filter(
                    or_(
                        and_(Message.sender_id == user_id, Message.recipient_id == other_id),
                        and_(Message.sender_id == other_id, Message.recipient_id == user_id)
                    )
                ).order_by(desc(Message.created_at)).first()
                
                # Count unread
                unread_count = 0
                if hasattr(Message, 'is_read'):
                    unread_count = Message.query.filter(
                        Message.sender_id == other_id,
                        Message.recipient_id == user_id,
                        Message.is_read == False
                    ).count()
                
                result.append({
                    'conversation_id': f"{min(user_id, other_id)}-{max(user_id, other_id)}",
                    'other_user': {
                        'id': other_user.id,
                        'username': other_user.username,
                        'display_name': getattr(other_user, 'display_name', other_user.username),
                        'profile_picture': getattr(other_user, 'profile_picture', None)
                    },
                    'last_message': last_msg.message if last_msg else None,
                    'last_message_at': last_msg.created_at.isoformat() if last_msg else None,
                    'unread_count': unread_count
                })
            
            # Sort by last message time
            result.sort(key=lambda x: x['last_message_at'] or '', reverse=True)
            return jsonify(result), 200
            
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return jsonify({'error': str(e)}), 500


@messages_bp.route('/api/conversations', methods=['GET'])
@jwt_required()
def get_conversations_alt():
    """Alternative endpoint used by InboxDrawer"""
    return get_conversations()


# =====================================================
# MESSAGES
# =====================================================

@messages_bp.route('/api/messages/conversation/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_conversation_messages(other_user_id):
    """
    Get all messages between current user and another user.
    """
    try:
        user_id = get_jwt_identity()
        
        # Get messages between the two users
        messages = Message.query.filter(
            or_(
                and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
            )
        ).order_by(Message.created_at.asc()).all()
        
        # Mark messages as read
        if hasattr(Message, 'is_read'):
            unread_messages = Message.query.filter(
                Message.sender_id == other_user_id,
                Message.recipient_id == user_id,
                Message.is_read == False
            ).all()
            for msg in unread_messages:
                msg.is_read = True
            db.session.commit()
        
        result = []
        for msg in messages:
            result.append({
                'id': msg.id,
                'sender_id': msg.sender_id,
                'recipient_id': msg.recipient_id,
                'message': msg.message if hasattr(msg, 'message') else msg.content,
                'text': msg.message if hasattr(msg, 'message') else msg.content,  # Alias for frontend compatibility
                'created_at': msg.created_at.isoformat(),
                'timestamp': msg.created_at.isoformat(),  # Alias
                'is_read': getattr(msg, 'is_read', True),
                'media_url': getattr(msg, 'media_url', None)
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error getting messages: {e}")
        return jsonify({'error': str(e)}), 500


@messages_bp.route('/api/messages/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_messages_alt(other_user_id):
    """Alternative endpoint used by InboxDrawer"""
    return get_conversation_messages(other_user_id)


@messages_bp.route('/api/messages/history/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_message_history(other_user_id):
    """Alternative endpoint for ChatModal"""
    try:
        user_id = get_jwt_identity()
        
        messages = Message.query.filter(
            or_(
                and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
            )
        ).order_by(Message.created_at.asc()).limit(100).all()
        
        result = []
        for msg in messages:
            result.append({
                'id': msg.id,
                'senderId': msg.sender_id,  # camelCase for frontend
                'sender_id': msg.sender_id,
                'recipientId': msg.recipient_id,
                'recipient_id': msg.recipient_id,
                'message': msg.message if hasattr(msg, 'message') else msg.content,
                'timestamp': msg.created_at.isoformat(),
                'mediaUrl': getattr(msg, 'media_url', None)
            })
        
        return jsonify({'messages': result}), 200
        
    except Exception as e:
        print(f"Error getting message history: {e}")
        return jsonify({'messages': [], 'error': str(e)}), 200


@messages_bp.route('/api/messages/send', methods=['POST'])
@jwt_required()
def send_message():
    """
    Send a message to another user.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        recipient_id = data.get('recipient_id')
        message_text = data.get('message') or data.get('text')
        media_url = data.get('media_url')
        
        if not recipient_id:
            return jsonify({'error': 'Recipient ID is required'}), 400
        if not message_text and not media_url:
            return jsonify({'error': 'Message or media is required'}), 400
        
        # Verify recipient exists
        recipient = User.query.get(recipient_id)
        if not recipient:
            return jsonify({'error': 'Recipient not found'}), 404
        
        # Create message
        new_message = Message(
            sender_id=user_id,
            recipient_id=recipient_id,
            message=message_text,
            created_at=datetime.utcnow()
        )
        
        # Add optional fields if they exist on the model
        if hasattr(Message, 'media_url') and media_url:
            new_message.media_url = media_url
        if hasattr(Message, 'is_read'):
            new_message.is_read = False
            
        db.session.add(new_message)
        
        # Update or create conversation
        try:
            conversation = Conversation.query.filter(
                or_(
                    and_(Conversation.user1_id == user_id, Conversation.user2_id == recipient_id),
                    and_(Conversation.user1_id == recipient_id, Conversation.user2_id == user_id)
                )
            ).first()
            
            if conversation:
                conversation.updated_at = datetime.utcnow()
            else:
                conversation = Conversation(
                    user1_id=min(user_id, recipient_id),
                    user2_id=max(user_id, recipient_id),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(conversation)
        except Exception as conv_error:
            print(f"Conversation update skipped: {conv_error}")
        
        db.session.commit()
        
        return jsonify({
            'id': new_message.id,
            'sender_id': new_message.sender_id,
            'recipient_id': new_message.recipient_id,
            'message': message_text,
            'created_at': new_message.created_at.isoformat(),
            'media_url': media_url
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {e}")
        return jsonify({'error': str(e)}), 500


@messages_bp.route('/api/messages', methods=['POST'])
@jwt_required()
def send_message_alt():
    """Alternative endpoint for InboxDrawer"""
    return send_message()


# =====================================================
# USER SEARCH
# =====================================================

@messages_bp.route('/api/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """
    Search users by username, display name, or email.
    Query param: ?q=searchterm
    """
    try:
        user_id = get_jwt_identity()
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 20, type=int)
        
        if len(query) < 2:
            return jsonify({'users': [], 'message': 'Search query must be at least 2 characters'}), 200
        
        search_term = f"%{query}%"
        
        # Search users
        users = User.query.filter(
            User.id != user_id,  # Exclude current user
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                # Try display_name if it exists
                User.display_name.ilike(search_term) if hasattr(User, 'display_name') else False,
                # Try artist_name if it exists  
                User.artist_name.ilike(search_term) if hasattr(User, 'artist_name') else False
            )
        ).limit(limit).all()
        
        result = []
        for user in users:
            result.append({
                'id': user.id,
                'username': user.username,
                'display_name': getattr(user, 'display_name', None) or user.username,
                'profile_picture': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
                'avatar': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
                'bio': getattr(user, 'bio', None),
                'artist_name': getattr(user, 'artist_name', None),
                'profile_type': getattr(user, 'profile_type', 'user')
            })
        
        return jsonify({'users': result}), 200
        
    except Exception as e:
        print(f"Error searching users: {e}")
        return jsonify({'users': [], 'error': str(e)}), 200


@messages_bp.route('/api/profile/inner-circle/search-users', methods=['GET'])
@jwt_required()
def search_users_for_circle():
    """Alternative search endpoint used by InnerCircle component"""
    return search_users()


# =====================================================
# TOP USERS
# =====================================================

@messages_bp.route('/api/users/top-10', methods=['GET'])
@jwt_required()
def get_top_users():
    """
    Get top 10 users based on followers, streams, or engagement.
    """
    try:
        user_id = get_jwt_identity()
        
        # Try to get users with most followers/streams
        try:
            if hasattr(User, 'follower_count'):
                users = User.query.filter(
                    User.id != user_id,
                    User.is_active == True if hasattr(User, 'is_active') else True
                ).order_by(desc(User.follower_count)).limit(10).all()
            else:
                # Fallback: just get recent active users
                users = User.query.filter(
                    User.id != user_id
                ).order_by(desc(User.id)).limit(10).all()
                
        except Exception:
            users = User.query.filter(User.id != user_id).limit(10).all()
        
        result = []
        for idx, user in enumerate(users):
            result.append({
                'id': user.id,
                'username': user.username,
                'display_name': getattr(user, 'display_name', None) or user.username,
                'profile_picture': getattr(user, 'profile_picture', None) or getattr(user, 'avatar_url', None),
                'avatar': getattr(user, 'profile_picture', None),
                'bio': getattr(user, 'bio', None),
                'follower_count': getattr(user, 'follower_count', 0),
                'total_streams': getattr(user, 'total_streams', 0),
                'total_likes': getattr(user, 'total_likes', 0),
                'rank': idx + 1,
                'primary_achievement': get_user_achievement(user)
            })
        
        return jsonify({'users': result}), 200
        
    except Exception as e:
        print(f"Error getting top users: {e}")
        return jsonify({'users': [], 'error': str(e)}), 200


def get_user_achievement(user):
    """Helper to generate achievement text for a user"""
    follower_count = getattr(user, 'follower_count', 0)
    
    if follower_count >= 10000:
        return "🌟 Top Creator"
    elif follower_count >= 5000:
        return "🔥 Rising Star"
    elif follower_count >= 1000:
        return "⭐ Popular Creator"
    elif follower_count >= 100:
        return "🎵 Active Creator"
    else:
        return "🎤 Creator"


# =====================================================
# MARK MESSAGES AS READ
# =====================================================

@messages_bp.route('/api/messages/read/<int:other_user_id>', methods=['POST'])
@jwt_required()
def mark_messages_read(other_user_id):
    """Mark all messages from a user as read"""
    try:
        user_id = get_jwt_identity()
        
        if hasattr(Message, 'is_read'):
            updated = Message.query.filter(
                Message.sender_id == other_user_id,
                Message.recipient_id == user_id,
                Message.is_read == False
            ).update({'is_read': True})
            
            db.session.commit()
            return jsonify({'marked_read': updated}), 200
        
        return jsonify({'marked_read': 0, 'message': 'Read tracking not enabled'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# =====================================================
# UNREAD COUNT
# =====================================================

@messages_bp.route('/api/messages/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get total unread message count for current user"""
    try:
        user_id = get_jwt_identity()
        
        if hasattr(Message, 'is_read'):
            count = Message.query.filter(
                Message.recipient_id == user_id,
                Message.is_read == False
            ).count()
        else:
            count = 0
        
        return jsonify({'unread_count': count}), 200
        
    except Exception as e:
        return jsonify({'unread_count': 0, 'error': str(e)}), 200


# =====================================================
# DELETE CONVERSATION
# =====================================================

@messages_bp.route('/api/messages/conversation/<int:other_user_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(other_user_id):
    """Delete all messages in a conversation"""
    try:
        user_id = get_jwt_identity()
        
        # Delete messages
        deleted = Message.query.filter(
            or_(
                and_(Message.sender_id == user_id, Message.recipient_id == other_user_id),
                and_(Message.sender_id == other_user_id, Message.recipient_id == user_id)
            )
        ).delete()
        
        # Try to delete conversation record
        try:
            Conversation.query.filter(
                or_(
                    and_(Conversation.user1_id == user_id, Conversation.user2_id == other_user_id),
                    and_(Conversation.user1_id == other_user_id, Conversation.user2_id == user_id)
                )
            ).delete()
        except:
            pass
        
        db.session.commit()
        return jsonify({'deleted': deleted}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500