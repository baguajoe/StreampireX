# =============================================================================
# VIDEO_TIERS.py - 4-Tier Configuration (Free, Starter, Creator, Pro)
# =============================================================================
# Tiers: Free → Starter ($10.99) → Creator ($20.99) → Pro ($29.99)
# Matches seed_pricing_plans.py and PricingPlans.js
# =============================================================================

# =============================================================================
# VIDEO EDITOR TIERS
# =============================================================================

VIDEO_EDITOR_TIERS = {
    'free': {
        'name': 'Free',
        
        # ✅ FULL Editor Access
        'editor_access': True,
        'all_tools': True,
        'all_effects': True,
        'all_transitions': True,
        'templates': True,
        
        # Export Limits
        'max_export_quality': '1080p',
        'export_formats': ['mp4', 'webm'],
        'watermark': True,
        'watermark_position': 'bottom-right',
        'watermark_size': 'small',
        'priority_export': False,
        'max_export_length_minutes': 10,
        
        # Project Limits
        'max_projects': 5,
        'max_tracks': 4,
        'max_project_duration_minutes': 30,
        
        # Storage
        'storage_gb': 5,
        'max_upload_gb': 2,
        
        # Features NOT included
        'collaboration': False,
        'version_history': False,
        'custom_branding': False,
        'remove_watermark': False,
        
        # Cross-Posting
        'cross_posting': True,
        'cross_post_platforms': ['youtube'],
        'cross_posts_per_day': 1,
        'scheduled_posts': False,
    },
    
    'starter': {
        'name': 'Starter',
        
        # Full Editor Access
        'editor_access': True,
        'all_tools': True,
        'all_effects': True,
        'all_transitions': True,
        'templates': True,
        'premium_templates': True,
        
        # Export Limits
        'max_export_quality': '1080p',
        'export_formats': ['mp4', 'mov'],
        'watermark': False,
        'priority_export': False,
        'max_export_length_minutes': 60,
        
        # Project Limits
        'max_projects': 15,
        'max_tracks': 8,
        'max_project_duration_minutes': 120,
        
        # Storage
        'storage_gb': 25,
        'max_upload_gb': 5,
        
        # Features
        'collaboration': False,
        'version_history': True,
        'version_history_days': 7,
        'custom_branding': False,
        'remove_watermark': True,
        
        # Cross-Posting
        'cross_posting': True,
        'cross_post_platforms': ['youtube', 'instagram', 'tiktok'],
        'cross_posts_per_day': 5,
        'scheduled_posts': False,
    },
    
    'creator': {
        'name': 'Creator',
        
        # Full Editor Access
        'editor_access': True,
        'all_tools': True,
        'all_effects': True,
        'all_transitions': True,
        'templates': True,
        'premium_templates': True,
        'pro_templates': True,
        
        # Export Limits
        'max_export_quality': '4k',
        'export_formats': ['mp4', 'mov', 'webm', 'avi'],
        'watermark': False,
        'priority_export': True,
        'max_export_length_minutes': None,  # Unlimited
        
        # Project Limits
        'max_projects': None,  # Unlimited
        'max_tracks': 24,
        'max_project_duration_minutes': None,  # Unlimited
        
        # Storage
        'storage_gb': 100,
        'max_upload_gb': 10,
        
        # Features
        'collaboration': True,
        'max_collaborators': 8,
        'version_history': True,
        'version_history_days': 60,
        'custom_branding': True,
        'remove_watermark': True,
        'priority_support': True,
        
        # Cross-Posting
        'cross_posting': True,
        'cross_post_platforms': ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads'],
        'cross_posts_per_day': 10,
        'scheduled_posts': True,
        'scheduled_queue': 50,
        'auto_thumbnails': True,
        'bulk_cross_post': True,
        'best_time_posting': True,
    },

    'pro': {
        'name': 'Pro',
        
        # Full Editor Access
        'editor_access': True,
        'all_tools': True,
        'all_effects': True,
        'all_transitions': True,
        'templates': True,
        'premium_templates': True,
        'pro_templates': True,
        
        # Export Limits (ULTIMATE)
        'max_export_quality': '8k',
        'export_formats': ['mp4', 'mov', 'webm', 'avi', 'mkv', 'prores'],
        'watermark': False,
        'priority_export': True,
        'max_export_length_minutes': None,  # Unlimited
        
        # Project Limits (UNLIMITED)
        'max_projects': None,  # Unlimited
        'max_tracks': 50,
        'max_project_duration_minutes': None,  # Unlimited
        
        # Storage (UNLIMITED)
        'storage_gb': None,  # Unlimited
        'max_upload_gb': None,  # Unlimited
        
        # Features (ALL)
        'collaboration': True,
        'max_collaborators': None,  # Unlimited
        'version_history': True,
        'version_history_days': None,  # Unlimited
        'custom_branding': True,
        'remove_watermark': True,
        'priority_support': True,
        
        # Cross-Posting (UNLIMITED)
        'cross_posting': True,
        'cross_post_platforms': ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads', 'snapchat', 'reddit', 'tumblr'],
        'cross_posts_per_day': None,  # Unlimited
        'scheduled_posts': True,
        'scheduled_queue': None,  # Unlimited
        'auto_thumbnails': True,
        'bulk_cross_post': True,
        'best_time_posting': True,
    },
}


# =============================================================================
# LIVE STREAMING TIERS
# =============================================================================

STREAMING_TIERS = {
    'free': {
        'name': 'Free',
        'enabled': False,
        'max_quality': None,
        'max_duration_hours': 0,
        'max_bitrate_kbps': 0,
        'vod_storage_gb': 0,
        'simulcast': False,
        'simulcast_destinations': 0,
        'stream_overlay': False,
        'chat_enabled': False,
        'monetization': False,
    },
    
    'starter': {
        'name': 'Starter',
        'enabled': True,
        'max_quality': '720p',
        'max_duration_hours': 4,
        'max_bitrate_kbps': 4500,
        'vod_storage_gb': 10,
        'vod_retention_days': 7,
        'simulcast': False,
        'simulcast_destinations': 0,
        'stream_overlay': True,
        'chat_enabled': True,
        'monetization': True,
        'tips_enabled': True,
    },
    
    'creator': {
        'name': 'Creator',
        'enabled': True,
        'max_quality': '4k',
        'max_duration_hours': 12,
        'max_bitrate_kbps': 15000,
        'vod_storage_gb': 100,
        'vod_retention_days': 90,
        'simulcast': False,
        'simulcast_destinations': 0,
        'stream_overlay': True,
        'chat_enabled': True,
        'monetization': True,
        'tips_enabled': True,
        'subscriptions_enabled': True,
        'priority_transcoding': True,
    },

    'pro': {
        'name': 'Pro',
        'enabled': True,
        'max_quality': '4k',
        'max_duration_hours': None,  # Unlimited
        'max_bitrate_kbps': 20000,
        'vod_storage_gb': None,  # Unlimited
        'vod_retention_days': None,  # Unlimited
        'simulcast': True,
        'simulcast_destinations': 5,
        'stream_overlay': True,
        'chat_enabled': True,
        'monetization': True,
        'tips_enabled': True,
        'subscriptions_enabled': True,
        'priority_transcoding': True,
    },
}


# =============================================================================
# UPLOAD TIERS
# =============================================================================

UPLOAD_TIERS = {
    'free': {
        'name': 'Free',
        'max_file_size_gb': 2,
        'max_duration_minutes': 30,
        'allowed_formats': ['mp4', 'mov', 'avi', 'webm'],
        'max_uploads_per_day': 5,
    },
    'starter': {
        'name': 'Starter',
        'max_file_size_gb': 5,
        'max_duration_minutes': 120,
        'allowed_formats': ['mp4', 'mov', 'avi', 'webm', 'mkv'],
        'max_uploads_per_day': 20,
    },
    'creator': {
        'name': 'Creator',
        'max_file_size_gb': 10,
        'max_duration_minutes': None,  # Unlimited
        'allowed_formats': ['mp4', 'mov', 'avi', 'webm', 'mkv', 'prores'],
        'max_uploads_per_day': None,  # Unlimited
    },
    'pro': {
        'name': 'Pro',
        'max_file_size_gb': None,  # Unlimited
        'max_duration_minutes': None,  # Unlimited
        'allowed_formats': ['mp4', 'mov', 'avi', 'webm', 'mkv', 'prores'],
        'max_uploads_per_day': None,  # Unlimited
    },
}


# =============================================================================
# CLIPS TIERS (TikTok-style short videos)
# =============================================================================

CLIPS_TIERS = {
    'free': {
        'name': 'Free',
        'clips_per_day': 3,
        'max_duration_seconds': 60,
        'max_file_size_mb': 100,
        'effects': True,
        'filters': True,
        'music_library': True,
        'premium_music': False,
    },
    'starter': {
        'name': 'Starter',
        'clips_per_day': 20,
        'max_duration_seconds': 180,
        'max_file_size_mb': 500,
        'effects': True,
        'filters': True,
        'music_library': True,
        'premium_music': True,
        'schedule_clips': False,
    },
    'creator': {
        'name': 'Creator',
        'clips_per_day': None,  # Unlimited
        'max_duration_seconds': 600,  # 10 minutes
        'max_file_size_mb': 2048,  # 2GB
        'effects': True,
        'filters': True,
        'music_library': True,
        'premium_music': True,
        'schedule_clips': True,
        'clip_analytics': True,
        'viral_boost': True,
    },
    'pro': {
        'name': 'Pro',
        'clips_per_day': None,  # Unlimited
        'max_duration_seconds': None,  # Unlimited
        'max_file_size_mb': None,  # Unlimited
        'effects': True,
        'filters': True,
        'music_library': True,
        'premium_music': True,
        'schedule_clips': True,
        'clip_analytics': True,
        'viral_boost': True,
    },
}


# =============================================================================
# MUSIC DISTRIBUTION TIERS
# =============================================================================

DISTRIBUTION_TIERS = {
    'free': {
        'name': 'Free',
        'enabled': False,
        'releases_per_year': 0,
        'platforms': [],
        'royalty_split': 0,
    },
    'starter': {
        'name': 'Starter',
        'enabled': False,
        'releases_per_year': 0,
        'platforms': [],
        'royalty_split': 0,
    },
    'creator': {
        'name': 'Creator',
        'enabled': False,
        'releases_per_year': 0,
        'platforms': [],
        'royalty_split': 0,
    },
    'pro': {
        'name': 'Pro',
        'enabled': True,
        'releases_per_year': None,  # Unlimited
        'platforms': ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'tidal', 'deezer'],
        'royalty_split': 0.90,  # 90% to creator
        'pre_save': True,
        'smart_links': True,
        'release_scheduling': True,
        'analytics': True,
    },
}


# =============================================================================
# CROSS-POST PLATFORM SPECS
# =============================================================================

VIDEO_PLATFORM_SPECS = {
    'youtube': {
        'name': 'YouTube',
        'max_duration_minutes': 720,
        'max_file_size_gb': 256,
        'aspect_ratios': ['16:9', '4:3', '9:16'],
        'supports_premiere': True,
        'supports_chapters': True,
    },
    'facebook': {
        'name': 'Facebook',
        'max_duration_minutes': 240,
        'max_file_size_gb': 10,
        'aspect_ratios': ['16:9', '9:16', '1:1'],
        'supports_premiere': True,
        'supports_chapters': False,
    },
    'instagram': {
        'name': 'Instagram Video',
        'max_duration_minutes': 60,
        'max_file_size_gb': 3.6,
        'aspect_ratios': ['16:9', '1:1', '4:5'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'tiktok': {
        'name': 'TikTok',
        'max_duration_minutes': 10,
        'max_file_size_gb': 2,
        'aspect_ratios': ['9:16'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'twitter': {
        'name': 'Twitter/X',
        'max_duration_minutes': 140,
        'max_file_size_gb': 1,
        'aspect_ratios': ['16:9', '1:1'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'linkedin': {
        'name': 'LinkedIn',
        'max_duration_minutes': 10,
        'max_file_size_gb': 5,
        'aspect_ratios': ['16:9', '1:1', '9:16'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'pinterest': {
        'name': 'Pinterest',
        'max_duration_minutes': 15,
        'max_file_size_gb': 2,
        'aspect_ratios': ['9:16', '1:1', '2:3'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'threads': {
        'name': 'Threads',
        'max_duration_minutes': 5,
        'max_file_size_gb': 1,
        'aspect_ratios': ['16:9', '1:1', '9:16'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'vimeo': {
        'name': 'Vimeo',
        'max_duration_minutes': None,
        'max_file_size_gb': 8,
        'aspect_ratios': ['16:9', '4:3'],
        'supports_premiere': True,
        'supports_chapters': True,
    },
    'snapchat': {
        'name': 'Snapchat',
        'max_duration_minutes': 3,
        'max_file_size_gb': 1,
        'aspect_ratios': ['9:16'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'reddit': {
        'name': 'Reddit',
        'max_duration_minutes': 15,
        'max_file_size_gb': 1,
        'aspect_ratios': ['16:9', '1:1'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
    'tumblr': {
        'name': 'Tumblr',
        'max_duration_minutes': 10,
        'max_file_size_gb': 1,
        'aspect_ratios': ['16:9', '1:1'],
        'supports_premiere': False,
        'supports_chapters': False,
    },
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_video_editor_tier(user_tier):
    """Get video editor config for a tier"""
    return VIDEO_EDITOR_TIERS.get(user_tier, VIDEO_EDITOR_TIERS['free'])


def get_streaming_tier(user_tier):
    """Get streaming config for a tier"""
    return STREAMING_TIERS.get(user_tier, STREAMING_TIERS['free'])


def get_upload_tier(user_tier):
    """Get upload config for a tier"""
    return UPLOAD_TIERS.get(user_tier, UPLOAD_TIERS['free'])


def get_clips_tier(user_tier):
    """Get clips config for a tier"""
    return CLIPS_TIERS.get(user_tier, CLIPS_TIERS['free'])


def get_distribution_tier(user_tier):
    """Get music distribution config for a tier"""
    return DISTRIBUTION_TIERS.get(user_tier, DISTRIBUTION_TIERS['free'])


def can_export_4k(user_tier):
    """Check if user can export in 4K"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_export_quality') in ('4k', '8k')


def can_export_8k(user_tier):
    """Check if user can export in 8K"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_export_quality') == '8k'


def has_watermark(user_tier):
    """Check if exports will have watermark"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('watermark', True)


def can_stream(user_tier):
    """Check if user can live stream"""
    tier = get_streaming_tier(user_tier)
    return tier.get('enabled', False)


def get_max_stream_quality(user_tier):
    """Get max streaming quality for user"""
    tier = get_streaming_tier(user_tier)
    return tier.get('max_quality')


def get_max_stream_duration(user_tier):
    """Get max stream duration in hours (None = unlimited)"""
    tier = get_streaming_tier(user_tier)
    return tier.get('max_duration_hours', 0)


def can_collaborate(user_tier):
    """Check if user can invite collaborators"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('collaboration', False)


def get_max_collaborators(user_tier):
    """Get max number of collaborators (None = unlimited)"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_collaborators', 0)


def has_priority_export(user_tier):
    """Check if user has priority export queue"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('priority_export', False)


def get_max_tracks(user_tier):
    """Get max timeline tracks for user"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_tracks', 4)


def get_max_export_length(user_tier):
    """Get max export length in minutes (None = unlimited)"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_export_length_minutes')


def get_editor_storage_limit(user_tier):
    """Get storage limit in GB for video editor (None = unlimited)"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('storage_gb', 5)


def get_upload_limit(user_tier):
    """Get per-file upload limit in GB (None = unlimited)"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('max_upload_gb', 2)


def get_clips_per_day(user_tier):
    """Get daily clip creation limit (None = unlimited)"""
    tier = get_clips_tier(user_tier)
    return tier.get('clips_per_day', 3)


def get_max_clip_duration(user_tier):
    """Get max clip duration in seconds (None = unlimited)"""
    tier = get_clips_tier(user_tier)
    return tier.get('max_duration_seconds', 60)


def can_distribute_music(user_tier):
    """Check if user can distribute music"""
    tier = get_distribution_tier(user_tier)
    return tier.get('enabled', False)


def can_simulcast(user_tier):
    """Check if user can simulcast to multiple destinations"""
    tier = get_streaming_tier(user_tier)
    return tier.get('simulcast', False)


def get_simulcast_destinations(user_tier):
    """Get max simulcast destinations"""
    tier = get_streaming_tier(user_tier)
    return tier.get('simulcast_destinations', 0)


# =============================================================================
# CROSS-POSTING HELPERS
# =============================================================================

def can_cross_post_video(user_tier):
    """Check if user can cross-post videos"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('cross_posting', False)


def get_video_cross_post_platforms(user_tier):
    """Get list of platforms user can cross-post videos to"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('cross_post_platforms', [])


def can_cross_post_video_to(user_tier, platform):
    """Check if user can cross-post video to specific platform"""
    platforms = get_video_cross_post_platforms(user_tier)
    return platform in platforms


def get_video_cross_posts_per_day(user_tier):
    """Get daily video cross-post limit (None = unlimited)"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('cross_posts_per_day')


def can_schedule_video_posts(user_tier):
    """Check if user can schedule video cross-posts"""
    tier = get_video_editor_tier(user_tier)
    return tier.get('scheduled_posts', False)


def get_video_platform_spec(platform):
    """Get platform specifications for video requirements"""
    return VIDEO_PLATFORM_SPECS.get(platform, {})


# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

def validate_export(user_tier, quality, duration_minutes):
    """Validate if user can export with given settings."""
    tier = get_video_editor_tier(user_tier)
    
    quality_levels = ['480p', '720p', '1080p', '4k', '8k']
    max_quality = tier.get('max_export_quality', '1080p')
    
    try:
        if quality_levels.index(quality) > quality_levels.index(max_quality):
            return False, f'Your plan supports up to {max_quality}. Upgrade to export in {quality}.'
    except ValueError:
        pass
    
    max_duration = tier.get('max_export_length_minutes')
    if max_duration and duration_minutes > max_duration:
        return False, f'Your plan supports exports up to {max_duration} minutes. Upgrade for longer exports.'
    
    return True, None


def validate_upload(user_tier, file_size_bytes, duration_minutes=None):
    """Validate if user can upload a file."""
    tier = get_upload_tier(user_tier)
    
    max_size_gb = tier.get('max_file_size_gb')
    if max_size_gb is not None:
        max_size_bytes = max_size_gb * (1024 ** 3)
        if file_size_bytes > max_size_bytes:
            return False, f'File exceeds your {max_size_gb}GB limit. Upgrade for larger uploads.'
    
    if duration_minutes:
        max_duration = tier.get('max_duration_minutes')
        if max_duration and duration_minutes > max_duration:
            return False, f'Video exceeds your {max_duration} minute limit. Upgrade for longer videos.'
    
    return True, None


def validate_stream_start(user_tier):
    """Validate if user can start a stream."""
    tier = get_streaming_tier(user_tier)
    
    if not tier.get('enabled'):
        return False, 'Live streaming requires Starter plan or higher.', None
    
    settings = {
        'max_quality': tier.get('max_quality'),
        'max_duration_hours': tier.get('max_duration_hours'),
        'max_bitrate_kbps': tier.get('max_bitrate_kbps'),
    }
    
    return True, None, settings


def validate_clip_creation(user_tier, clips_today=0, duration_seconds=0, file_size_mb=0):
    """Validate if user can create a clip."""
    tier = get_clips_tier(user_tier)
    
    daily_limit = tier.get('clips_per_day')
    if daily_limit and clips_today >= daily_limit:
        return False, f'You\'ve reached your daily clip limit of {daily_limit}. Upgrade for more!'
    
    max_duration = tier.get('max_duration_seconds')
    if max_duration and duration_seconds > max_duration:
        return False, f'Clip exceeds {max_duration} second limit. Upgrade for longer clips!'
    
    max_size = tier.get('max_file_size_mb')
    if max_size and file_size_mb > max_size:
        return False, f'File exceeds {max_size}MB limit. Upgrade for larger files!'
    
    return True, None


def validate_video_cross_post(user_tier, platform, cross_posts_today=0):
    """Validate if user can cross-post a video to a platform."""
    tier = get_video_editor_tier(user_tier)
    
    if not tier.get('cross_posting'):
        return False, 'Cross-posting not available on your plan. Upgrade to share everywhere!'
    
    allowed_platforms = tier.get('cross_post_platforms', [])
    if platform not in allowed_platforms:
        return False, f'{platform.title()} not available on your plan. Upgrade to unlock!'
    
    daily_limit = tier.get('cross_posts_per_day')
    if daily_limit and cross_posts_today >= daily_limit:
        return False, f'You\'ve reached your daily cross-post limit of {daily_limit}. Upgrade for more!'
    
    return True, None