# =============================================================================
# VIDEO_TIER_ROUTES.py - Flask Blueprint for Video Tier Features
# =============================================================================
# Uses 3 tiers: free, basic, premium
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

# Create Blueprint
video_tier_bp = Blueprint('video_tier', __name__)

# Import from your video_tiers.py
from .video_tiers import (
    get_video_editor_tier,
    get_streaming_tier,
    get_upload_tier,
    get_clips_tier,
    can_export_4k,
    has_watermark,
    can_stream,
    can_collaborate,
    has_priority_export,
    get_max_tracks,
    get_clips_per_day,
    validate_export,
    validate_upload,
    validate_stream_start,
    validate_clip_creation,
    VIDEO_EDITOR_TIERS,
    STREAMING_TIERS,
)

from .models import Subscription, VideoClip


# =============================================================================
# HELPER: Get User's Tier
# =============================================================================

def get_user_tier(user_id):
    """Get user's subscription tier from database"""
    # Check if user has an active subscription
    subscription = Subscription.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()
    
    if subscription and subscription.plan:
        # Return the plan name lowercase (free, basic, premium)
        return subscription.plan.name.lower()
    
    # Default to free tier
    return 'free'


# =============================================================================
# GET TIER INFO
# =============================================================================

@video_tier_bp.route('/video/tier-info', methods=['GET'])
@jwt_required()
def get_video_tier_info():
    """Get complete video tier info for current user"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    return jsonify({
        'success': True,
        'tier': user_tier,
        'video': get_video_editor_tier(user_tier),
        'streaming': get_streaming_tier(user_tier),
        'upload': get_upload_tier(user_tier),
        'clips': get_clips_tier(user_tier),
    }), 200


@video_tier_bp.route('/video/editor-limits', methods=['GET'])
@jwt_required()
def get_editor_limits():
    """Get video editor limits for UI"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    tier = get_video_editor_tier(user_tier)
    
    return jsonify({
        'success': True,
        'tier': user_tier,
        'tier_name': tier['name'],
        
        # What they can do - FREE GETS ALL TOOLS!
        'editor_access': tier.get('editor_access', True),
        'all_tools': tier.get('all_tools', True),
        'all_effects': tier.get('all_effects', True),
        'all_transitions': tier.get('all_transitions', True),
        'templates': tier.get('templates', True),
        
        # Export limits
        'max_export_quality': tier.get('max_export_quality', '1080p'),
        'watermark': tier.get('watermark', True),
        'priority_export': tier.get('priority_export', False),
        'max_export_length_minutes': tier.get('max_export_length_minutes'),
        'export_formats': tier.get('export_formats', ['mp4', 'webm']),
        
        # Project limits
        'max_projects': tier.get('max_projects', 5),
        'max_tracks': tier.get('max_tracks', 4),
        'max_project_duration_minutes': tier.get('max_project_duration_minutes', 30),
        
        # Features
        'collaboration': tier.get('collaboration', False),
        'max_collaborators': tier.get('max_collaborators', 0),
        'version_history': tier.get('version_history', False),
        'version_history_days': tier.get('version_history_days', 0),
        'custom_branding': tier.get('custom_branding', False),
        
        # Storage
        'storage_gb': tier.get('storage_gb', 5),
        'max_upload_gb': tier.get('max_upload_gb', 2),
        
        # Cross-posting
        'cross_posting': tier.get('cross_posting', False),
        'cross_post_platforms': tier.get('cross_post_platforms', []),
        'cross_posts_per_day': tier.get('cross_posts_per_day', 0),
        'scheduled_posts': tier.get('scheduled_posts', False),
        
        # Upgrade prompts
        'can_upgrade_to_4k': not can_export_4k(user_tier),
        'can_remove_watermark': has_watermark(user_tier),
        'can_unlock_collaboration': not can_collaborate(user_tier),
    }), 200


# =============================================================================
# FEATURE CHECKS
# =============================================================================

@video_tier_bp.route('/video/can-export-4k', methods=['GET'])
@jwt_required()
def check_4k_export():
    """Check if user can export in 4K"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    return jsonify({
        'can_export_4k': can_export_4k(user_tier),
        'current_max': get_video_editor_tier(user_tier).get('max_export_quality', '1080p'),
        'upgrade_tier': 'basic' if user_tier == 'free' else None,
    }), 200


@video_tier_bp.route('/video/has-watermark', methods=['GET'])
@jwt_required()
def check_watermark():
    """Check if exports will have watermark"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    return jsonify({
        'has_watermark': has_watermark(user_tier),
        'watermark_position': 'bottom-right' if has_watermark(user_tier) else None,
        'watermark_size': 'small' if has_watermark(user_tier) else None,
        'upgrade_tier': 'basic' if has_watermark(user_tier) else None,
    }), 200


@video_tier_bp.route('/streaming/can-stream', methods=['GET'])
@jwt_required()
def check_can_stream():
    """Check if user can live stream"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    tier = get_streaming_tier(user_tier)
    
    return jsonify({
        'can_stream': can_stream(user_tier),
        'max_quality': tier.get('max_quality'),
        'max_duration_hours': tier.get('max_duration_hours'),
        'max_bitrate_kbps': tier.get('max_bitrate_kbps'),
        'simulcast': tier.get('simulcast', False),
        'upgrade_tier': 'basic' if not can_stream(user_tier) else None,
    }), 200


@video_tier_bp.route('/video/can-collaborate', methods=['GET'])
@jwt_required()
def check_can_collaborate():
    """Check if user can invite collaborators"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    tier = get_video_editor_tier(user_tier)
    
    return jsonify({
        'can_collaborate': can_collaborate(user_tier),
        'max_collaborators': tier.get('max_collaborators', 0),
        'upgrade_tier': 'premium' if not can_collaborate(user_tier) else None,
    }), 200


# =============================================================================
# VALIDATION ENDPOINTS
# =============================================================================

@video_tier_bp.route('/video/validate-export', methods=['POST'])
@jwt_required()
def validate_export_request():
    """Validate if user can export with given settings"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    data = request.get_json()
    quality = data.get('quality', '1080p')
    duration_minutes = data.get('duration_minutes', 0)
    
    allowed, error = validate_export(user_tier, quality, duration_minutes)
    
    if allowed:
        return jsonify({
            'allowed': True,
            'watermark': has_watermark(user_tier),
            'priority': has_priority_export(user_tier),
        }), 200
    else:
        return jsonify({
            'allowed': False,
            'error': error,
            'current_tier': user_tier,
        }), 403


@video_tier_bp.route('/video/validate-upload', methods=['POST'])
@jwt_required()
def validate_upload_request():
    """Validate if user can upload a file"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    data = request.get_json()
    file_size_bytes = data.get('file_size', 0)
    duration_minutes = data.get('duration_minutes')
    
    allowed, error = validate_upload(user_tier, file_size_bytes, duration_minutes)
    
    if allowed:
        return jsonify({'allowed': True}), 200
    else:
        return jsonify({
            'allowed': False,
            'error': error,
            'current_tier': user_tier,
        }), 403


@video_tier_bp.route('/streaming/validate-start', methods=['POST'])
@jwt_required()
def validate_stream_start_request():
    """Validate if user can start a stream"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    allowed, error, settings = validate_stream_start(user_tier)
    
    if allowed:
        return jsonify({
            'allowed': True,
            'settings': settings,
        }), 200
    else:
        return jsonify({
            'allowed': False,
            'error': error,
            'upgrade_tier': 'basic',
        }), 403


@video_tier_bp.route('/clips/validate-create', methods=['POST'])
@jwt_required()
def validate_clip_creation_request():
    """Validate if user can create a clip"""
    user_id = get_jwt_identity()
    user_tier = get_user_tier(user_id)
    
    data = request.get_json()
    
    # Count clips created today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    clips_today = VideoClip.query.filter(
        VideoClip.user_id == user_id,
        VideoClip.created_at >= today_start
    ).count()
    
    duration_seconds = data.get('duration_seconds', 0)
    file_size_mb = data.get('file_size_mb', 0)
    
    allowed, error = validate_clip_creation(
        user_tier,
        clips_today=clips_today,
        duration_seconds=duration_seconds,
        file_size_mb=file_size_mb
    )
    
    if allowed:
        tier = get_clips_tier(user_tier)
        return jsonify({
            'allowed': True,
            'clips_today': clips_today,
            'clips_remaining': (tier.get('clips_per_day') or 999) - clips_today,
        }), 200
    else:
        return jsonify({
            'allowed': False,
            'error': error,
            'current_tier': user_tier,
        }), 403


# =============================================================================
# TIER COMPARISON (For upgrade prompts)
# =============================================================================

@video_tier_bp.route('/video/tier-comparison', methods=['GET'])
def get_tier_comparison():
    """Get all tiers for comparison (public endpoint)"""
    
    comparison = []
    # 3 tiers only: free, basic, premium
    for tier_id in ['free', 'basic', 'premium']:
        video = VIDEO_EDITOR_TIERS[tier_id]
        streaming = STREAMING_TIERS[tier_id]
        
        comparison.append({
            'id': tier_id,
            'name': video['name'],
            'video': {
                'editor_access': video.get('editor_access', True),
                'all_tools': video.get('all_tools', True),
                'export_quality': video.get('max_export_quality', '1080p'),
                'watermark': video.get('watermark', True),
                'max_tracks': video.get('max_tracks', 4),
                'max_projects': video.get('max_projects', 5),
                'collaboration': video.get('collaboration', False),
                'priority_export': video.get('priority_export', False),
                'max_export_length_minutes': video.get('max_export_length_minutes'),
            },
            'streaming': {
                'enabled': streaming.get('enabled', False),
                'max_quality': streaming.get('max_quality'),
                'max_duration_hours': streaming.get('max_duration_hours'),
                'simulcast': streaming.get('simulcast', False),
            },
            'cross_posting': {
                'enabled': video.get('cross_posting', False),
                'platforms': video.get('cross_post_platforms', []),
                'per_day': video.get('cross_posts_per_day'),
            },
            'storage_gb': video.get('storage_gb', 5),
        })
    
    return jsonify({'tiers': comparison}), 200


# =============================================================================
# FREE TIER FEATURE HIGHLIGHTS (For marketing/onboarding)
# =============================================================================

@video_tier_bp.route('/video/free-features', methods=['GET'])
def get_free_features():
    """Highlight what free users get (for onboarding)"""
    free = VIDEO_EDITOR_TIERS['free']
    
    return jsonify({
        'title': 'Free Tier - More Than You\'d Expect!',
        'highlights': [
            {
                'icon': '🎬',
                'title': 'Full Video Editor',
                'description': 'All tools, effects, and transitions included!'
            },
            {
                'icon': '📹',
                'title': '1080p Export',
                'description': 'Export in Full HD quality'
            },
            {
                'icon': '🎞️',
                'title': '5 Projects',
                'description': f'Work on up to {free["max_projects"]} projects'
            },
            {
                'icon': '🎵',
                'title': '4 Tracks',
                'description': 'Multi-track timeline for pro editing'
            },
            {
                'icon': '📤',
                'title': 'YouTube Cross-Post',
                'description': 'Share directly to YouTube'
            },
            {
                'icon': '💾',
                'title': '5GB Storage',
                'description': 'Cloud storage for your projects'
            },
        ],
        'limitations': [
            {
                'feature': 'Watermark',
                'description': 'Small StreamPireX watermark on exports',
                'upgrade_removes': True
            },
            {
                'feature': 'Export Length',
                'description': f'Up to {free["max_export_length_minutes"]} minute exports',
                'upgrade_removes': True
            },
            {
                'feature': 'Live Streaming',
                'description': 'Available on Basic plan',
                'upgrade_removes': True
            },
        ],
        'upgrade_cta': {
            'text': 'Remove watermark & unlock more →',
            'tier': 'basic',
            'price': '$12.99/mo'
        }
    }), 200