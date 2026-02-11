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


# =============================================================================
# CONTENT LIMIT ENFORCEMENT
# =============================================================================
# Enforces tier limits for radio stations, podcasts, and podcast episodes.
#
# Tier Limits (from PricingPlans):
# | Content           | Free | Starter | Creator | Pro       |
# |-------------------|------|---------|---------|-----------|
# | Radio Stations    | 0    | 1       | 3       | Unlimited |
# | Podcast Shows     | 0    | 2       | 10      | Unlimited |
# | Podcast Episodes  | 0    | 5       | Unlimited| Unlimited|
#
# Usage in routes.py:
#   from .subscription_utils import check_content_limit
#
#   limit_check = check_content_limit(user_id, 'radio_station')
#   if not limit_check["allowed"]:
#       return jsonify({
#           "error": limit_check["upgrade_message"],
#           "limit_reached": True,
#           "current_count": limit_check["current_count"],
#           "max_allowed": limit_check["max_allowed"],
#           "plan": limit_check["plan_name"],
#           "upgrade_url": "/pricing"
#       }), 403
# =============================================================================

def check_content_limit(user_id, content_type):
    """
    Check if user can create more content based on their subscription tier.
    
    Args:
        user_id: The user's ID
        content_type: 'radio_station', 'podcast', or 'podcast_episode'
    
    Returns:
        dict: {
            "allowed": bool,
            "current_count": int,
            "max_allowed": int or "unlimited",
            "plan_name": str,
            "upgrade_message": str or None
        }
    """
    from .models import RadioStation, Podcast, PodcastEpisode

    plan = get_user_plan(user_id)

    if not plan:
        plan_name = "Free"
        max_radio = 0
        max_podcast_episodes = 0
        includes_podcasts = False
    else:
        plan_name = plan.name
        max_radio = getattr(plan, 'max_radio_stations', 0) or 0
        max_podcast_episodes = getattr(plan, 'max_podcast_episodes', 0) or 0
        includes_podcasts = getattr(plan, 'includes_podcasts', False)

    # ─────────────────────────────────────────────────────────
    # RADIO STATIONS
    # ─────────────────────────────────────────────────────────
    if content_type == 'radio_station':
        current_count = RadioStation.query.filter_by(user_id=user_id).count()

        # -1 means unlimited (Pro tier)
        if max_radio == -1:
            return {
                "allowed": True,
                "current_count": current_count,
                "max_allowed": "unlimited",
                "plan_name": plan_name,
                "upgrade_message": None
            }

        if current_count >= max_radio:
            if max_radio == 0:
                upgrade_msg = (
                    f"Your {plan_name} plan doesn't include radio stations. "
                    f"Upgrade to Starter ($9.99/mo) for 1 station, "
                    f"Creator ($19.99/mo) for 3 stations, "
                    f"or Pro ($29.99/mo) for unlimited stations."
                )
            elif max_radio == 1:
                upgrade_msg = (
                    f"Your {plan_name} plan allows 1 radio station and you already have {current_count}. "
                    f"Upgrade to Creator ($19.99/mo) for 3 stations "
                    f"or Pro ($29.99/mo) for unlimited stations."
                )
            elif max_radio == 3:
                upgrade_msg = (
                    f"Your {plan_name} plan allows 3 radio stations and you already have {current_count}. "
                    f"Upgrade to Pro ($29.99/mo) for unlimited stations."
                )
            else:
                upgrade_msg = (
                    f"You've reached your limit of {max_radio} radio stations on the {plan_name} plan. "
                    f"Upgrade your plan for more stations."
                )

            return {
                "allowed": False,
                "current_count": current_count,
                "max_allowed": max_radio,
                "plan_name": plan_name,
                "upgrade_message": upgrade_msg
            }

        return {
            "allowed": True,
            "current_count": current_count,
            "max_allowed": max_radio,
            "plan_name": plan_name,
            "upgrade_message": None
        }

    # ─────────────────────────────────────────────────────────
    # PODCASTS (the show itself)
    # ─────────────────────────────────────────────────────────
    elif content_type == 'podcast':
        # Count podcasts owned by user (try multiple FK column names)
        current_count = 0
        for fk_field in ['creator_id', 'host_id', 'user_id']:
            try:
                current_count = Podcast.query.filter_by(**{fk_field: user_id}).count()
                break
            except Exception:
                continue

        # Plan doesn't include podcasts at all
        if not includes_podcasts:
            return {
                "allowed": False,
                "current_count": current_count,
                "max_allowed": 0,
                "plan_name": plan_name,
                "upgrade_message": (
                    f"Your {plan_name} plan doesn't include podcasts. "
                    f"Upgrade to Starter ($9.99/mo) to create podcasts."
                )
            }

        # Check max_podcasts if the column exists on the plan
        max_podcasts = getattr(plan, 'max_podcasts', None) if plan else None

        # If column doesn't exist, derive from plan name
        if max_podcasts is None:
            podcast_limits = {
                "free": 0,
                "starter": 2,
                "creator": 10,
                "pro": -1
            }
            max_podcasts = podcast_limits.get(plan_name.lower(), 2)

        # Unlimited
        if max_podcasts == -1:
            return {
                "allowed": True,
                "current_count": current_count,
                "max_allowed": "unlimited",
                "plan_name": plan_name,
                "upgrade_message": None
            }

        # At or over limit
        if current_count >= max_podcasts:
            if max_podcasts <= 2:
                upgrade_msg = (
                    f"You've reached your limit of {max_podcasts} podcasts on the {plan_name} plan. "
                    f"Upgrade to Creator ($19.99/mo) for 10 podcasts "
                    f"or Pro ($29.99/mo) for unlimited."
                )
            else:
                upgrade_msg = (
                    f"You've reached your limit of {max_podcasts} podcasts on the {plan_name} plan. "
                    f"Upgrade to Pro ($29.99/mo) for unlimited podcasts."
                )

            return {
                "allowed": False,
                "current_count": current_count,
                "max_allowed": max_podcasts,
                "plan_name": plan_name,
                "upgrade_message": upgrade_msg
            }

        return {
            "allowed": True,
            "current_count": current_count,
            "max_allowed": max_podcasts,
            "plan_name": plan_name,
            "upgrade_message": None
        }

    # ─────────────────────────────────────────────────────────
    # PODCAST EPISODES
    # ─────────────────────────────────────────────────────────
    elif content_type == 'podcast_episode':
        # Count total episodes across all user's podcasts
        current_count = 0
        user_podcasts = []
        for fk_field in ['creator_id', 'host_id', 'user_id']:
            try:
                user_podcasts = Podcast.query.filter_by(**{fk_field: user_id}).all()
                if user_podcasts:
                    break
            except Exception:
                continue

        for podcast in user_podcasts:
            current_count += PodcastEpisode.query.filter_by(podcast_id=podcast.id).count()

        # Unlimited
        if max_podcast_episodes == -1:
            return {
                "allowed": True,
                "current_count": current_count,
                "max_allowed": "unlimited",
                "plan_name": plan_name,
                "upgrade_message": None
            }

        # At or over limit
        if current_count >= max_podcast_episodes:
            if max_podcast_episodes == 0:
                upgrade_msg = (
                    f"Your {plan_name} plan doesn't include podcast episodes. "
                    f"Upgrade to Starter ($9.99/mo) for 5 episodes."
                )
            elif max_podcast_episodes == 5:
                upgrade_msg = (
                    f"You've used all {max_podcast_episodes} episodes on your {plan_name} plan. "
                    f"Upgrade to Creator ($19.99/mo) for unlimited episodes."
                )
            else:
                upgrade_msg = (
                    f"You've reached your limit of {max_podcast_episodes} episodes on the {plan_name} plan. "
                    f"Upgrade for more."
                )

            return {
                "allowed": False,
                "current_count": current_count,
                "max_allowed": max_podcast_episodes,
                "plan_name": plan_name,
                "upgrade_message": upgrade_msg
            }

        return {
            "allowed": True,
            "current_count": current_count,
            "max_allowed": max_podcast_episodes,
            "plan_name": plan_name,
            "upgrade_message": None
        }

    # Unknown content type - allow by default
    return {
        "allowed": True,
        "current_count": 0,
        "max_allowed": "unknown",
        "plan_name": plan_name if plan else "Free",
        "upgrade_message": None
    }


# =============================================================================
# EXISTING UPLOAD LIMIT FUNCTIONS
# =============================================================================

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