# src/api/subscription_utils.py - COMPLETE FIXED VERSION

from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify
from datetime import datetime

def get_user_plan(user_id):
    """Get the user's current active plan"""
    from .models import Subscription, PricingPlan
    
    # ✅ FIXED: Use status="active" instead of active=True
    subscription = Subscription.query.filter_by(
        user_id=user_id, 
        status="active"
    ).first()
    
    if subscription:
        return subscription.plan
    else:
        # Return free plan if no active subscription
        return PricingPlan.query.filter_by(name="Free").first()

def plan_required(required_feature):
    """Decorator to check if user's plan includes the required feature"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            plan = get_user_plan(user_id)
            
            if not plan:
                return jsonify({"error": "No plan found"}), 403
            
            # Check if plan has the required feature
            if not hasattr(plan, required_feature) or not getattr(plan, required_feature):
                return jsonify({
                    "error": f"Your {plan.name} plan doesn't include {required_feature.replace('_', ' ')}",
                    "required_plan": "Pro or Premium",
                    "upgrade_url": "/pricing"
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_upload_limit(user_id, content_type):
    """Check if user has reached their monthly upload limit"""
    from .models import Music, Video, db
    
    user_plan = get_user_plan(user_id)
    
    if not user_plan:
        return {"allowed": False, "remaining": 0, "error": "No plan found"}
    
    # Get current month start
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    if content_type == "music":
        # Check if plan has music distribution
        if not hasattr(user_plan, 'includes_music_distribution') or not user_plan.includes_music_distribution:
            return {"allowed": False, "remaining": 0, "error": "Music distribution not included in your plan"}
        
        # Check for upload limit attribute
        if hasattr(user_plan, 'distribution_uploads_limit'):
            limit = user_plan.distribution_uploads_limit
        elif hasattr(user_plan, 'music_uploads_limit'):
            limit = user_plan.music_uploads_limit
        else:
            # Default limits based on plan
            if user_plan.name.lower() == "free":
                limit = 0
            elif user_plan.name.lower() == "pro":
                limit = 10  # 10 uploads per month
            elif user_plan.name.lower() == "premium":
                limit = -1  # Unlimited
            else:
                limit = 5  # Default limit
        
        if limit == -1:  # Unlimited
            return {"allowed": True, "remaining": "unlimited"}
        elif limit == 0:  # No uploads allowed
            return {"allowed": False, "remaining": 0, "error": "Music distribution not included in your plan"}
        
        # Count current month uploads (try both possible column names)
        try:
            current_uploads = db.session.query(Music).filter(
                Music.user_id == user_id,
                Music.created_at >= current_month_start
            ).count()
        except:
            # Fallback if created_at doesn't exist
            try:
                current_uploads = db.session.query(Music).filter(
                    Music.user_id == user_id,
                    Music.uploaded_at >= current_month_start
                ).count()
            except:
                current_uploads = 0
        
        remaining = limit - current_uploads
        
        return {
            "allowed": remaining > 0,
            "remaining": remaining,
            "limit": limit,
            "used": current_uploads
        }
    
    elif content_type == "video":
        # Check if plan has video distribution
        if not hasattr(user_plan, 'includes_video_distribution') or not user_plan.includes_video_distribution:
            return {"allowed": False, "remaining": 0, "error": "Video distribution not included in your plan"}
        
        # Check for upload limit attribute
        if hasattr(user_plan, 'video_uploads_limit'):
            limit = user_plan.video_uploads_limit
        else:
            # Default limits based on plan
            if user_plan.name.lower() == "free":
                limit = 0
            elif user_plan.name.lower() == "pro":
                limit = 5  # 5 uploads per month
            elif user_plan.name.lower() == "premium":
                limit = -1  # Unlimited
            else:
                limit = 2  # Default limit
        
        if limit == -1:  # Unlimited
            return {"allowed": True, "remaining": "unlimited"}
        elif limit == 0:  # No uploads allowed
            return {"allowed": False, "remaining": 0, "error": "Video uploads not included in your plan"}
        
        # Count current month uploads
        try:
            current_uploads = db.session.query(Video).filter(
                Video.user_id == user_id,
                Video.uploaded_at >= current_month_start
            ).count()
        except:
            # Fallback if uploaded_at doesn't exist
            try:
                current_uploads = db.session.query(Video).filter(
                    Video.user_id == user_id,
                    Video.created_at >= current_month_start
                ).count()
            except:
                current_uploads = 0
        
        remaining = limit - current_uploads
        
        return {
            "allowed": remaining > 0,
            "remaining": remaining,
            "limit": limit,
            "used": current_uploads
        }
    
    return {"allowed": False, "error": "Unknown content type"}

def get_monthly_upload_count(user_id, content_type):
    """Get count of uploads for current month"""
    from .models import Music, Video, db
    
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    if content_type == "music":
        try:
            count = db.session.query(Music).filter(
                Music.user_id == user_id,
                Music.created_at >= current_month_start
            ).count()
        except:
            # Fallback if created_at doesn't exist
            try:
                count = db.session.query(Music).filter(
                    Music.user_id == user_id,
                    Music.uploaded_at >= current_month_start
                ).count()
            except:
                count = 0
        return count
        
    elif content_type == "video":
        try:
            count = db.session.query(Video).filter(
                Video.user_id == user_id,
                Video.uploaded_at >= current_month_start
            ).count()
        except:
            # Fallback if uploaded_at doesn't exist
            try:
                count = db.session.query(Video).filter(
                    Video.user_id == user_id,
                    Video.created_at >= current_month_start
                ).count()
            except:
                count = 0
        return count
    
    return 0

def is_admin(user_id):
    """Check if user has admin privileges"""
    from .models import User
    
    user = User.query.get(user_id)
    if user and hasattr(user, 'is_admin'):
        return user.is_admin
    elif user and hasattr(user, 'role'):
        return user.role == 'admin'
    
    # Default: only user ID 1 is admin
    return user_id == 1