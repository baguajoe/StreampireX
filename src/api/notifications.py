# =============================================================================
# notifications.py - StreamPireX Notification Routes
# Location: /src/api/notifications.py
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import desc
from src.api.models import db, Notification, User

notifications_bp = Blueprint('notifications', __name__)


# =============================================================================
# GET NOTIFICATIONS
# =============================================================================
@notifications_bp.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        query = Notification.query.filter_by(user_id=current_user_id)
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        unread_count = Notification.query.filter_by(
            user_id=current_user_id, 
            is_read=False
        ).count()
        
        notifications = query.order_by(desc(Notification.created_at)) \
                            .limit(limit) \
                            .offset(offset) \
                            .all()
        
        return jsonify({
            'notifications': [n.serialize() for n in notifications],
            'unread_count': unread_count,
            'has_more': len(notifications) == limit
        }), 200
        
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# MARK NOTIFICATION AS READ
# =============================================================================
@notifications_bp.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark a single notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# MARK ALL NOTIFICATIONS AS READ
# =============================================================================
@notifications_bp.route('/api/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        updated = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).update({'is_read': True})
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Marked {updated} notifications as read'
        }), 200
        
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# DELETE NOTIFICATION
# =============================================================================
@notifications_bp.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        current_user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification deleted'
        }), 200
        
    except Exception as e:
        print(f"Error deleting notification: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# CLEAR ALL NOTIFICATIONS
# =============================================================================
@notifications_bp.route('/api/notifications/clear-all', methods=['DELETE'])
@jwt_required()
def clear_all_notifications():
    """Clear all notifications for current user"""
    try:
        current_user_id = get_jwt_identity()
        
        deleted = Notification.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Deleted {deleted} notifications'
        }), 200
        
    except Exception as e:
        print(f"Error clearing notifications: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# GET UNREAD COUNT ONLY
# =============================================================================
@notifications_bp.route('/api/notifications/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get just the unread notification count"""
    try:
        current_user_id = get_jwt_identity()
        
        count = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).count()
        
        return jsonify({'unread_count': count}), 200
        
    except Exception as e:
        print(f"Error getting unread count: {e}")
        return jsonify({'error': str(e)}), 500