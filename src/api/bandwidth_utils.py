# src/api/bandwidth_utils.py - Bandwidth & Streaming Cost Controls for StreamPireX
# =================================================================================

from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify, request
from datetime import datetime, timedelta
from collections import defaultdict
from src.api.models import BandwidthLog
import time

# =============================================================================
# BANDWIDTH TIER CONFIGURATION
# =============================================================================

BANDWIDTH_TIERS = {
    'free': {
        'name': 'Free',
        # Video Quality Limits
        'max_streaming_quality': '720p',
        'max_upload_quality': '720p',
        'available_qualities': ['360p', '480p', '720p'],
        
        # Monthly Bandwidth Limits
        'monthly_streaming_gb': 50,           # 50GB streaming/month
        'monthly_upload_gb': 5,               # 5GB uploads/month (matches storage)
        
        # Daily Limits (burst protection)
        'daily_streaming_gb': 5,              # 5GB/day max
        'daily_views': 500,                   # 500 video views/day
        
        # Rate Limits
        'concurrent_streams': 1,              # 1 stream at a time
        'requests_per_minute': 60,
        
        # Features
        'allow_download': False,
        'allow_4k': False,
        'allow_live_streaming': False,
        'live_stream_hours_monthly': 0,
        
        # Transcoding
        'transcode_priority': 'low',
        'max_transcode_resolutions': 2,       # Only 360p, 720p
    },
    'pro': {
        'name': 'Pro',
        'max_streaming_quality': '1080p',
        'max_upload_quality': '1080p',
        'available_qualities': ['360p', '480p', '720p', '1080p'],
        
        'monthly_streaming_gb': 500,          # 500GB streaming/month
        'monthly_upload_gb': 50,
        
        'daily_streaming_gb': 25,
        'daily_views': 5000,
        
        'concurrent_streams': 3,
        'requests_per_minute': 120,
        
        'allow_download': True,
        'allow_4k': False,
        'allow_live_streaming': True,
        'live_stream_hours_monthly': 20,
        
        'transcode_priority': 'normal',
        'max_transcode_resolutions': 3,
    },
    'premium': {
        'name': 'Premium',
        'max_streaming_quality': '4k',
        'max_upload_quality': '4k',
        'available_qualities': ['360p', '480p', '720p', '1080p', '4k'],
        
        'monthly_streaming_gb': 2000,         # 2TB streaming/month
        'monthly_upload_gb': 250,
        
        'daily_streaming_gb': 100,
        'daily_views': 50000,
        
        'concurrent_streams': 5,
        'requests_per_minute': 300,
        
        'allow_download': True,
        'allow_4k': True,
        'allow_live_streaming': True,
        'live_stream_hours_monthly': 100,
        
        'transcode_priority': 'high',
        'max_transcode_resolutions': 5,
    },
    'professional': {
        'name': 'Professional',
        'max_streaming_quality': '4k',
        'max_upload_quality': '4k',
        'available_qualities': ['360p', '480p', '720p', '1080p', '4k'],
        
        'monthly_streaming_gb': -1,           # Unlimited
        'monthly_upload_gb': 1000,
        
        'daily_streaming_gb': -1,             # Unlimited
        'daily_views': -1,                    # Unlimited
        
        'concurrent_streams': 10,
        'requests_per_minute': 600,
        
        'allow_download': True,
        'allow_4k': True,
        'allow_live_streaming': True,
        'live_stream_hours_monthly': -1,      # Unlimited
        
        'transcode_priority': 'highest',
        'max_transcode_resolutions': 5,
    }
}

# Quality to approximate bitrate mapping (for bandwidth calculation)
QUALITY_BITRATES = {
    '360p': 0.5,      # 0.5 Mbps = ~225MB/hour
    '480p': 1.0,      # 1 Mbps = ~450MB/hour
    '720p': 2.5,      # 2.5 Mbps = ~1.1GB/hour
    '1080p': 5.0,     # 5 Mbps = ~2.25GB/hour
    '4k': 15.0,       # 15 Mbps = ~6.75GB/hour
}

# Plan name to tier mapping
PLAN_TO_TIER = {
    'free': 'free',
    'basic': 'pro',
    'pro': 'pro',
    'premium': 'premium',
    'professional': 'professional',
    'artist distribution': 'pro',
    'label distribution': 'premium'
}


# =============================================================================
# BANDWIDTH TRACKING
# =============================================================================

def get_user_bandwidth_tier(user_id):
    """Get bandwidth tier for user based on subscription"""
    from .models import Subscription, UserSubscription
    
    subscription = Subscription.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()
    
    if subscription and subscription.plan:
        plan_name = subscription.plan.name.lower()
        return PLAN_TO_TIER.get(plan_name, 'free')
    
    user_sub = UserSubscription.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()
    
    if user_sub and user_sub.pricing_plan:
        plan_name = user_sub.pricing_plan.name.lower()
        return PLAN_TO_TIER.get(plan_name, 'free')
    
    return 'free'


def get_bandwidth_limits(user_id):
    """Get bandwidth limits for user"""
    tier = get_user_bandwidth_tier(user_id)
    return BANDWIDTH_TIERS.get(tier, BANDWIDTH_TIERS['free'])


def format_gb(bytes_val):
    """Format bytes to GB string"""
    if bytes_val < 0:
        return 'Unlimited'
    gb = bytes_val / (1024 * 1024 * 1024)
    if gb >= 1000:
        return f"{gb/1000:.1f} TB"
    return f"{gb:.2f} GB"


def get_monthly_bandwidth_usage(user_id):
    """Get user's bandwidth usage for current month"""
    from .models import BandwidthLog, db
    
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    try:
        result = db.session.query(
            db.func.sum(BandwidthLog.bytes_transferred)
        ).filter(
            BandwidthLog.user_id == user_id,
            BandwidthLog.timestamp >= month_start,
            BandwidthLog.transfer_type == 'stream'
        ).scalar()
        
        return result or 0
    except Exception as e:
        print(f"Error getting bandwidth usage: {e}")
        return 0


def get_daily_bandwidth_usage(user_id):
    """Get user's bandwidth usage for today"""
    from .models import BandwidthLog, db
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    try:
        result = db.session.query(
            db.func.sum(BandwidthLog.bytes_transferred)
        ).filter(
            BandwidthLog.user_id == user_id,
            BandwidthLog.timestamp >= today_start,
            BandwidthLog.transfer_type == 'stream'
        ).scalar()
        
        return result or 0
    except Exception as e:
        print(f"Error getting daily bandwidth: {e}")
        return 0


def get_daily_view_count(user_id):
    """Get user's view count for today"""
    from .models import BandwidthLog, db
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    try:
        count = BandwidthLog.query.filter(
            BandwidthLog.user_id == user_id,
            BandwidthLog.timestamp >= today_start,
            BandwidthLog.transfer_type == 'stream'
        ).count()
        
        return count
    except Exception as e:
        print(f"Error getting view count: {e}")
        return 0


def log_bandwidth_usage(user_id, bytes_transferred, transfer_type='stream', 
                        content_type='video', content_id=None, quality=None):
    """Log bandwidth usage"""
    from .models import BandwidthLog, db
    
    try:
        log = BandwidthLog(
            user_id=user_id,
            bytes_transferred=bytes_transferred,
            transfer_type=transfer_type,
            content_type=content_type,
            content_id=content_id,
            quality=quality,
            timestamp=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error logging bandwidth: {e}")
        db.session.rollback()
        return False


# =============================================================================
# BANDWIDTH STATUS & CHECKING
# =============================================================================

def get_bandwidth_status(user_id):
    """Get complete bandwidth status for user"""
    limits = get_bandwidth_limits(user_id)
    tier = get_user_bandwidth_tier(user_id)
    
    monthly_used = get_monthly_bandwidth_usage(user_id)
    daily_used = get_daily_bandwidth_usage(user_id)
    daily_views = get_daily_view_count(user_id)
    
    monthly_limit = limits['monthly_streaming_gb'] * 1024 * 1024 * 1024 if limits['monthly_streaming_gb'] > 0 else -1
    daily_limit = limits['daily_streaming_gb'] * 1024 * 1024 * 1024 if limits['daily_streaming_gb'] > 0 else -1
    
    # Calculate percentages
    monthly_pct = (monthly_used / monthly_limit * 100) if monthly_limit > 0 else 0
    daily_pct = (daily_used / daily_limit * 100) if daily_limit > 0 else 0
    views_pct = (daily_views / limits['daily_views'] * 100) if limits['daily_views'] > 0 else 0
    
    # Determine status
    if monthly_limit > 0 and monthly_pct >= 100:
        status_level = 'over_limit'
        status_message = '⛔ Monthly bandwidth limit reached'
    elif daily_limit > 0 and daily_pct >= 100:
        status_level = 'daily_limit'
        status_message = '⏳ Daily bandwidth limit reached (resets at midnight UTC)'
    elif limits['daily_views'] > 0 and daily_views >= limits['daily_views']:
        status_level = 'views_limit'
        status_message = '👀 Daily view limit reached'
    elif monthly_pct >= 90 or daily_pct >= 90:
        status_level = 'warning'
        status_message = '⚠️ Approaching bandwidth limit'
    else:
        status_level = 'ok'
        status_message = '✅ Bandwidth OK'
    
    return {
        'tier': tier,
        'tier_name': limits['name'],
        
        # Monthly usage
        'monthly_used_bytes': monthly_used,
        'monthly_used_display': format_gb(monthly_used),
        'monthly_limit_bytes': monthly_limit,
        'monthly_limit_display': format_gb(monthly_limit) if monthly_limit > 0 else 'Unlimited',
        'monthly_percentage': round(monthly_pct, 1) if monthly_limit > 0 else 0,
        'monthly_remaining_display': format_gb(monthly_limit - monthly_used) if monthly_limit > 0 else 'Unlimited',
        
        # Daily usage
        'daily_used_bytes': daily_used,
        'daily_used_display': format_gb(daily_used),
        'daily_limit_bytes': daily_limit,
        'daily_limit_display': format_gb(daily_limit) if daily_limit > 0 else 'Unlimited',
        'daily_percentage': round(daily_pct, 1) if daily_limit > 0 else 0,
        
        # Views
        'daily_views': daily_views,
        'daily_views_limit': limits['daily_views'] if limits['daily_views'] > 0 else 'Unlimited',
        'views_percentage': round(views_pct, 1) if limits['daily_views'] > 0 else 0,
        
        # Quality limits
        'max_quality': limits['max_streaming_quality'],
        'available_qualities': limits['available_qualities'],
        
        # Features
        'allow_download': limits['allow_download'],
        'allow_4k': limits['allow_4k'],
        'allow_live_streaming': limits['allow_live_streaming'],
        'concurrent_streams': limits['concurrent_streams'],
        
        # Status
        'status_level': status_level,
        'status_message': status_message,
        'can_stream': status_level in ['ok', 'warning']
    }


def check_streaming_allowed(user_id, quality='720p', estimated_duration_seconds=None):
    """Check if user can stream at requested quality"""
    limits = get_bandwidth_limits(user_id)
    status = get_bandwidth_status(user_id)
    
    errors = []
    warnings = []
    recommended_quality = quality
    
    # Check if already over limit
    if not status['can_stream']:
        errors.append(status['status_message'])
        return {
            'allowed': False,
            'errors': errors,
            'warnings': warnings,
            'recommended_quality': limits['available_qualities'][0]  # Lowest quality
        }
    
    # Check quality limit
    available = limits['available_qualities']
    if quality not in available:
        # Find highest available quality
        quality_order = ['360p', '480p', '720p', '1080p', '4k']
        for q in reversed(quality_order):
            if q in available:
                recommended_quality = q
                break
        warnings.append(f"{quality} not available on your plan. Using {recommended_quality}")
    
    # Estimate bandwidth if duration provided
    if estimated_duration_seconds:
        bitrate = QUALITY_BITRATES.get(recommended_quality, 2.5)
        estimated_bytes = (bitrate * estimated_duration_seconds * 1024 * 1024) / 8
        
        # Check if this would exceed daily limit
        if status['daily_limit_bytes'] > 0:
            if status['daily_used_bytes'] + estimated_bytes > status['daily_limit_bytes']:
                warnings.append("This video may use most of your remaining daily bandwidth")
        
        # Check monthly limit
        if status['monthly_limit_bytes'] > 0:
            if status['monthly_used_bytes'] + estimated_bytes > status['monthly_limit_bytes']:
                warnings.append("You're approaching your monthly bandwidth limit")
    
    return {
        'allowed': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'recommended_quality': recommended_quality,
        'available_qualities': available,
        'max_quality': limits['max_streaming_quality']
    }


# =============================================================================
# SMART QUALITY SELECTION (Cost Optimization)
# =============================================================================

def get_optimal_quality(user_id, video_id=None, client_bandwidth_mbps=None):
    """
    Determine optimal streaming quality based on:
    - User's tier limits
    - Remaining bandwidth
    - Client connection speed
    - Video popularity (popular = use CDN cache at standard quality)
    """
    limits = get_bandwidth_limits(user_id)
    status = get_bandwidth_status(user_id)
    
    max_quality = limits['max_streaming_quality']
    available = limits['available_qualities']
    
    # Start with max allowed quality
    optimal = max_quality
    reasons = []
    
    # If bandwidth is getting low, reduce quality
    if status['monthly_percentage'] > 80:
        # Drop one quality level
        quality_order = ['360p', '480p', '720p', '1080p', '4k']
        current_idx = quality_order.index(optimal) if optimal in quality_order else 2
        if current_idx > 0:
            optimal = quality_order[current_idx - 1]
            reasons.append("Reduced quality to conserve bandwidth")
    
    # If daily limit is close, be more aggressive
    if status['daily_percentage'] > 90:
        optimal = '480p' if '480p' in available else '360p'
        reasons.append("Low daily bandwidth remaining")
    
    # Respect client bandwidth if provided
    if client_bandwidth_mbps:
        max_for_client = '360p'
        if client_bandwidth_mbps >= 1.5:
            max_for_client = '480p'
        if client_bandwidth_mbps >= 4:
            max_for_client = '720p'
        if client_bandwidth_mbps >= 8:
            max_for_client = '1080p'
        if client_bandwidth_mbps >= 20:
            max_for_client = '4k'
        
        quality_order = ['360p', '480p', '720p', '1080p', '4k']
        optimal_idx = quality_order.index(optimal) if optimal in quality_order else 2
        client_idx = quality_order.index(max_for_client) if max_for_client in quality_order else 2
        
        if client_idx < optimal_idx:
            optimal = max_for_client
            reasons.append(f"Adjusted for connection speed ({client_bandwidth_mbps} Mbps)")
    
    # Ensure optimal is in available qualities
    if optimal not in available:
        quality_order = ['360p', '480p', '720p', '1080p', '4k']
        for q in reversed(quality_order):
            if q in available:
                optimal = q
                break
    
    return {
        'optimal_quality': optimal,
        'max_quality': max_quality,
        'available_qualities': available,
        'reasons': reasons,
        'bandwidth_status': {
            'monthly_percentage': status['monthly_percentage'],
            'daily_percentage': status['daily_percentage']
        }
    }


# =============================================================================
# TRANSCODING COST CONTROLS
# =============================================================================

def get_transcode_config(user_id, video_duration_seconds, original_quality='1080p'):
    """
    Determine which resolutions to transcode based on tier and cost optimization
    
    Cost optimization strategies:
    - Free tier: Only transcode to 360p and 720p
    - Don't transcode to 4K unless Premium+
    - Defer high-res transcoding for low-view videos
    """
    limits = get_bandwidth_limits(user_id)
    tier = get_user_bandwidth_tier(user_id)
    
    # Base resolutions to create
    all_resolutions = ['360p', '480p', '720p', '1080p', '4k']
    
    # Filter by tier's max quality
    max_quality_idx = all_resolutions.index(limits['max_upload_quality'])
    possible_resolutions = all_resolutions[:max_quality_idx + 1]
    
    # Apply max transcode resolution limit
    max_transcodes = limits['max_transcode_resolutions']
    
    # Strategy: Always include lowest and highest allowed
    if len(possible_resolutions) <= max_transcodes:
        transcode_resolutions = possible_resolutions
    else:
        # Pick strategically: lowest, highest, and fill middle
        transcode_resolutions = [possible_resolutions[0]]  # Always 360p
        
        # Add highest allowed
        if len(possible_resolutions) > 1:
            transcode_resolutions.append(possible_resolutions[-1])
        
        # Fill remaining slots with middle resolutions
        remaining_slots = max_transcodes - len(transcode_resolutions)
        middle_resolutions = possible_resolutions[1:-1]
        
        # Prioritize 720p for middle
        for res in ['720p', '480p', '1080p']:
            if remaining_slots <= 0:
                break
            if res in middle_resolutions and res not in transcode_resolutions:
                transcode_resolutions.append(res)
                remaining_slots -= 1
        
        # Sort by quality order
        transcode_resolutions = sorted(
            transcode_resolutions, 
            key=lambda x: all_resolutions.index(x)
        )
    
    # Estimate transcoding cost/time
    # Rough estimate: 1 minute of video = 30 seconds to transcode per resolution
    estimated_time_minutes = (video_duration_seconds / 60) * 0.5 * len(transcode_resolutions)
    
    return {
        'resolutions': transcode_resolutions,
        'priority': limits['transcode_priority'],
        'estimated_time_minutes': round(estimated_time_minutes, 1),
        'defer_high_res': tier == 'free',  # Free tier: defer 720p+ until first view
        'max_allowed_quality': limits['max_upload_quality']
    }


# =============================================================================
# LAZY TRANSCODING (Only transcode when needed)
# =============================================================================

def should_transcode_resolution(user_id, video_id, resolution, view_count=0):
    """
    Determine if a resolution should be transcoded
    
    Strategy:
    - Always transcode lowest resolution immediately
    - Transcode higher resolutions based on view count
    - Free tier: Only transcode 720p+ after 10 views
    """
    tier = get_user_bandwidth_tier(user_id)
    limits = get_bandwidth_limits(user_id)
    
    # Check if resolution is even allowed for tier
    if resolution not in limits['available_qualities']:
        return {
            'should_transcode': False,
            'reason': f'{resolution} not available for {limits["name"]} tier'
        }
    
    # Always transcode 360p immediately
    if resolution == '360p':
        return {
            'should_transcode': True,
            'reason': 'Base quality - always transcode',
            'priority': 'immediate'
        }
    
    # Tier-based lazy transcoding thresholds
    lazy_thresholds = {
        'free': {
            '480p': 5,      # After 5 views
            '720p': 10,     # After 10 views
            '1080p': 999999,  # Never (not allowed)
            '4k': 999999
        },
        'pro': {
            '480p': 0,      # Immediate
            '720p': 0,      # Immediate
            '1080p': 5,     # After 5 views
            '4k': 999999
        },
        'premium': {
            '480p': 0,
            '720p': 0,
            '1080p': 0,
            '4k': 3         # After 3 views
        },
        'professional': {
            '480p': 0,
            '720p': 0,
            '1080p': 0,
            '4k': 0         # Immediate
        }
    }
    
    threshold = lazy_thresholds.get(tier, lazy_thresholds['free']).get(resolution, 999999)
    
    if view_count >= threshold:
        return {
            'should_transcode': True,
            'reason': f'View threshold ({threshold}) reached',
            'priority': 'normal' if threshold == 0 else 'low'
        }
    else:
        return {
            'should_transcode': False,
            'reason': f'Waiting for {threshold - view_count} more views',
            'threshold': threshold,
            'current_views': view_count
        }


# =============================================================================
# RATE LIMITING
# =============================================================================

# In-memory rate limit tracking (use Redis in production)
_rate_limits = defaultdict(lambda: {'count': 0, 'reset_time': time.time()})

def check_rate_limit(user_id):
    """Check if user is within rate limits"""
    limits = get_bandwidth_limits(user_id)
    max_requests = limits['requests_per_minute']
    
    current_time = time.time()
    user_limits = _rate_limits[user_id]
    
    # Reset if minute has passed
    if current_time - user_limits['reset_time'] >= 60:
        user_limits['count'] = 0
        user_limits['reset_time'] = current_time
    
    if user_limits['count'] >= max_requests:
        return {
            'allowed': False,
            'retry_after': int(60 - (current_time - user_limits['reset_time'])),
            'message': 'Rate limit exceeded'
        }
    
    user_limits['count'] += 1
    return {
        'allowed': True,
        'remaining': max_requests - user_limits['count'],
        'reset_in': int(60 - (current_time - user_limits['reset_time']))
    }


# =============================================================================
# CONCURRENT STREAM TRACKING
# =============================================================================

# In-memory tracking (use Redis in production)
_active_streams = defaultdict(set)

def register_stream(user_id, stream_id):
    """Register a new active stream"""
    limits = get_bandwidth_limits(user_id)
    max_concurrent = limits['concurrent_streams']
    
    current_streams = _active_streams[user_id]
    
    if len(current_streams) >= max_concurrent:
        return {
            'allowed': False,
            'message': f'Maximum concurrent streams ({max_concurrent}) reached',
            'active_streams': len(current_streams)
        }
    
    current_streams.add(stream_id)
    return {
        'allowed': True,
        'stream_id': stream_id,
        'active_streams': len(current_streams),
        'max_streams': max_concurrent
    }


def unregister_stream(user_id, stream_id):
    """Remove a stream when finished"""
    _active_streams[user_id].discard(stream_id)
    return {'active_streams': len(_active_streams[user_id])}


def get_active_streams(user_id):
    """Get count of active streams"""
    return {
        'active': len(_active_streams[user_id]),
        'stream_ids': list(_active_streams[user_id])
    }


# =============================================================================
# DECORATOR FOR BANDWIDTH-CONTROLLED ENDPOINTS
# =============================================================================

def bandwidth_required(content_type='video'):
    """Decorator to check bandwidth before streaming"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            
            # Check rate limit
            rate_check = check_rate_limit(user_id)
            if not rate_check['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'retry_after': rate_check['retry_after']
                }), 429
            
            # Check bandwidth status
            status = get_bandwidth_status(user_id)
            if not status['can_stream']:
                return jsonify({
                    'error': status['status_message'],
                    'bandwidth_status': status,
                    'upgrade_url': '/pricing'
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator