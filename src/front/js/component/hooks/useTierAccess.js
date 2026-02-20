// =============================================================================
// useTierAccess.js - 4-Tier Version (Free, Starter, Creator, Pro)
// =============================================================================
// Hook to check user's tier and feature access
// Tiers: Free → Starter ($12.99) → Creator ($22.99) → Pro ($31.99)
// Matches video_tiers.py, seed_pricing_plans.py, and PricingPlans.js
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

// Tier hierarchy for comparisons — 4 tiers
const TIER_LEVELS = {
  'free': 0,
  'starter': 1,
  'creator': 2,
  'pro': 3,
};

// =============================================================================
// VIDEO EDITOR TIER LIMITS — Matches video_tiers.py VIDEO_EDITOR_TIERS
// =============================================================================
const VIDEO_EDITOR_LIMITS = {
  free: {
    max_export_quality: '1080p',
    export_formats: ['mp4', 'webm'],
    watermark: true,
    watermark_position: 'bottom-right',
    watermark_size: 'small',
    priority_export: false,
    max_export_length_minutes: 10,
    max_projects: 5,
    max_tracks: 4,
    max_project_duration_minutes: 30,
    storage_gb: 5,
    max_upload_gb: 2,
    collaboration: false,
    version_history: false,
    custom_branding: false,
    cross_posting: true,
    cross_post_platforms: ['youtube'],
    cross_posts_per_day: 1,
    scheduled_posts: false,
  },
  starter: {
    max_export_quality: '1080p',
    export_formats: ['mp4', 'mov'],
    watermark: false,
    priority_export: false,
    max_export_length_minutes: 60,
    max_projects: 15,
    max_tracks: 8,
    max_project_duration_minutes: 120,
    storage_gb: 25,
    max_upload_gb: 5,
    collaboration: false,
    version_history: true,
    version_history_days: 7,
    custom_branding: false,
    cross_posting: true,
    cross_post_platforms: ['youtube', 'instagram', 'tiktok'],
    cross_posts_per_day: 5,
    scheduled_posts: false,
  },
  creator: {
    max_export_quality: '4k',
    export_formats: ['mp4', 'mov', 'webm', 'avi'],
    watermark: false,
    priority_export: true,
    max_export_length_minutes: null, // Unlimited
    max_projects: null, // Unlimited
    max_tracks: 24,
    max_project_duration_minutes: null, // Unlimited
    storage_gb: 100,
    max_upload_gb: 10,
    collaboration: true,
    max_collaborators: 8,
    version_history: true,
    version_history_days: 60,
    custom_branding: true,
    cross_posting: true,
    cross_post_platforms: ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads'],
    cross_posts_per_day: 10,
    scheduled_posts: true,
    scheduled_queue: 50,
    auto_thumbnails: true,
    bulk_cross_post: true,
    best_time_posting: true,
  },
  pro: {
    max_export_quality: '8k',
    export_formats: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'prores'],
    watermark: false,
    priority_export: true,
    max_export_length_minutes: null, // Unlimited
    max_projects: null, // Unlimited
    max_tracks: 50,
    max_project_duration_minutes: null, // Unlimited
    storage_gb: null, // Unlimited
    max_upload_gb: null, // Unlimited
    collaboration: true,
    max_collaborators: null, // Unlimited
    version_history: true,
    version_history_days: null, // Unlimited
    custom_branding: true,
    cross_posting: true,
    cross_post_platforms: ['youtube', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest', 'threads', 'snapchat', 'reddit', 'tumblr'],
    cross_posts_per_day: null, // Unlimited
    scheduled_posts: true,
    scheduled_queue: null, // Unlimited
    auto_thumbnails: true,
    bulk_cross_post: true,
    best_time_posting: true,
  },
};

// =============================================================================
// STREAMING TIER LIMITS — Matches video_tiers.py STREAMING_TIERS
// =============================================================================
const STREAMING_LIMITS = {
  free: {
    enabled: false,
    max_quality: null,
    max_duration_hours: 0,
    max_bitrate_kbps: 0,
    simulcast: false,
    simulcast_destinations: 0,
    chat_enabled: false,
    monetization: false,
  },
  starter: {
    enabled: true,
    max_quality: '720p',
    max_duration_hours: 4,
    max_bitrate_kbps: 4500,
    simulcast: false,
    simulcast_destinations: 0,
    chat_enabled: true,
    monetization: true,
    tips_enabled: true,
  },
  creator: {
    enabled: true,
    max_quality: '4k',
    max_duration_hours: 12,
    max_bitrate_kbps: 15000,
    simulcast: false,
    simulcast_destinations: 0,
    chat_enabled: true,
    monetization: true,
    tips_enabled: true,
    subscriptions_enabled: true,
    priority_transcoding: true,
  },
  pro: {
    enabled: true,
    max_quality: '4k',
    max_duration_hours: null, // Unlimited
    max_bitrate_kbps: 20000,
    simulcast: true,
    simulcast_destinations: 5,
    chat_enabled: true,
    monetization: true,
    tips_enabled: true,
    subscriptions_enabled: true,
    priority_transcoding: true,
  },
};

// =============================================================================
// CLIPS TIER LIMITS — Matches video_tiers.py CLIPS_TIERS
// =============================================================================
const CLIPS_LIMITS = {
  free: {
    clips_per_day: 3,
    max_duration_seconds: 60,
    max_file_size_mb: 100,
    effects: true,
    filters: true,
    music_library: true,
    premium_music: false,
  },
  starter: {
    clips_per_day: 20,
    max_duration_seconds: 180,
    max_file_size_mb: 500,
    effects: true,
    filters: true,
    music_library: true,
    premium_music: true,
    schedule_clips: false,
  },
  creator: {
    clips_per_day: null, // Unlimited
    max_duration_seconds: 600, // 10 minutes
    max_file_size_mb: 2048, // 2GB
    effects: true,
    filters: true,
    music_library: true,
    premium_music: true,
    schedule_clips: true,
    clip_analytics: true,
    viral_boost: true,
  },
  pro: {
    clips_per_day: null, // Unlimited
    max_duration_seconds: null, // Unlimited
    max_file_size_mb: null, // Unlimited
    effects: true,
    filters: true,
    music_library: true,
    premium_music: true,
    schedule_clips: true,
    clip_analytics: true,
    viral_boost: true,
  },
};

// =============================================================================
// DISTRIBUTION TIER LIMITS — Matches video_tiers.py DISTRIBUTION_TIERS
// =============================================================================
const DISTRIBUTION_LIMITS = {
  free: {
    enabled: false,
  },
  starter: {
    enabled: false,
  },
  creator: {
    enabled: false,
  },
  pro: {
    enabled: true,
    releases_per_year: null, // Unlimited
    royalty_split: 0.90,
    pre_save: true,
    smart_links: true,
    release_scheduling: true,
    analytics: true,
  },
};

// =============================================================================
// AI FEATURES TIER LIMITS
// =============================================================================
const AI_LIMITS = {
  free: {
    ai_mastering: false,
    ai_mastering_limit: 0,
    ai_radio_dj: false,
    ai_voice_clone: false,
    ai_dj_personas: 0,
    ai_mix_assistant: false,
    recording_studio_tracks: 4,
  },
  starter: {
    ai_mastering: true,
    ai_mastering_limit: 3,
    ai_radio_dj: false,
    ai_voice_clone: false,
    ai_dj_personas: 0,
    ai_mix_assistant: true,
    ai_mix_assistant_mode: 'browser',
    recording_studio_tracks: 8,
  },
  creator: {
    ai_mastering: true,
    ai_mastering_limit: 15,
    ai_radio_dj: true,
    ai_voice_clone: false,
    ai_dj_personas: 7,
    ai_mix_assistant: true,
    ai_mix_assistant_mode: 'browser',
    recording_studio_tracks: 16,
  },
  pro: {
    ai_mastering: true,
    ai_mastering_limit: null, // Unlimited
    ai_radio_dj: true,
    ai_voice_clone: true,
    ai_dj_personas: null, // Unlimited + custom
    ai_mix_assistant: true,
    ai_mix_assistant_mode: 'browser+server',
    recording_studio_tracks: 32,
  },
};

// =============================================================================
// MAIN HOOK
// =============================================================================
const useTierAccess = () => {
  const [userTier, setUserTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's current tier
  useEffect(() => {
    const fetchTier = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setUserTier('free');
          setLoading(false);
          return;
        }

        const API_URL = process.env.REACT_APP_API_URL || '';
        const response = await fetch(`${API_URL}/api/user/subscription`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle different response formats
          const tier = data.tier || data.plan_name || data.subscription?.plan_name || 'free';
          setUserTier(tier.toLowerCase());
        } else {
          setUserTier('free');
        }
      } catch (err) {
        console.error('Error fetching tier:', err);
        setError(err.message);
        setUserTier('free');
      } finally {
        setLoading(false);
      }
    };

    fetchTier();
  }, []);

  // =============================================================================
  // TIER COMPARISON HELPERS
  // =============================================================================

  const getTierLevel = useCallback((tier) => {
    return TIER_LEVELS[tier?.toLowerCase()] ?? 0;
  }, []);

  const isAtLeast = useCallback((requiredTier) => {
    return getTierLevel(userTier) >= getTierLevel(requiredTier);
  }, [userTier, getTierLevel]);

  const isFree = userTier === 'free';
  const isStarter = userTier === 'starter';
  const isCreator = userTier === 'creator';
  const isPro = userTier === 'pro';
  const isPaid = isStarter || isCreator || isPro;

  // =============================================================================
  // VIDEO EDITOR ACCESS
  // =============================================================================

  const getVideoEditorLimits = useCallback(() => {
    return VIDEO_EDITOR_LIMITS[userTier] || VIDEO_EDITOR_LIMITS.free;
  }, [userTier]);

  const canExport4K = useCallback(() => {
    const limits = getVideoEditorLimits();
    return ['4k', '8k'].includes(limits.max_export_quality);
  }, [getVideoEditorLimits]);

  const canExport8K = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_export_quality === '8k';
  }, [getVideoEditorLimits]);

  const hasWatermark = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.watermark === true;
  }, [getVideoEditorLimits]);

  const canRemoveWatermark = useCallback(() => {
    return !hasWatermark();
  }, [hasWatermark]);

  const getMaxTracks = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_tracks;
  }, [getVideoEditorLimits]);

  const getMaxProjects = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_projects;
  }, [getVideoEditorLimits]);

  const getMaxExportLength = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_export_length_minutes;
  }, [getVideoEditorLimits]);

  const hasPriorityExport = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.priority_export === true;
  }, [getVideoEditorLimits]);

  const canCollaborate = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.collaboration === true;
  }, [getVideoEditorLimits]);

  const getMaxCollaborators = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_collaborators || 0;
  }, [getVideoEditorLimits]);

  // =============================================================================
  // STREAMING ACCESS
  // =============================================================================

  const getStreamingLimits = useCallback(() => {
    return STREAMING_LIMITS[userTier] || STREAMING_LIMITS.free;
  }, [userTier]);

  const canStream = useCallback(() => {
    const limits = getStreamingLimits();
    return limits.enabled === true;
  }, [getStreamingLimits]);

  const getMaxStreamDuration = useCallback(() => {
    const limits = getStreamingLimits();
    return limits.max_duration_hours;
  }, [getStreamingLimits]);

  const getMaxStreamQuality = useCallback(() => {
    const limits = getStreamingLimits();
    return limits.max_quality;
  }, [getStreamingLimits]);

  const canSimulcast = useCallback(() => {
    const limits = getStreamingLimits();
    return limits.simulcast === true;
  }, [getStreamingLimits]);

  const getSimulcastDestinations = useCallback(() => {
    const limits = getStreamingLimits();
    return limits.simulcast_destinations || 0;
  }, [getStreamingLimits]);

  // =============================================================================
  // CLIPS ACCESS
  // =============================================================================

  const getClipsLimits = useCallback(() => {
    return CLIPS_LIMITS[userTier] || CLIPS_LIMITS.free;
  }, [userTier]);

  const getClipsPerDay = useCallback(() => {
    const limits = getClipsLimits();
    return limits.clips_per_day;
  }, [getClipsLimits]);

  const getMaxClipDuration = useCallback(() => {
    const limits = getClipsLimits();
    return limits.max_duration_seconds;
  }, [getClipsLimits]);

  const hasPremiumMusic = useCallback(() => {
    const limits = getClipsLimits();
    return limits.premium_music === true;
  }, [getClipsLimits]);

  const canScheduleClips = useCallback(() => {
    const limits = getClipsLimits();
    return limits.schedule_clips === true;
  }, [getClipsLimits]);

  // =============================================================================
  // CROSS-POSTING ACCESS
  // =============================================================================

  const canCrossPost = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.cross_posting === true;
  }, [getVideoEditorLimits]);

  const getCrossPostPlatforms = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.cross_post_platforms || [];
  }, [getVideoEditorLimits]);

  const canCrossPostTo = useCallback((platform) => {
    const platforms = getCrossPostPlatforms();
    return platforms.includes(platform.toLowerCase());
  }, [getCrossPostPlatforms]);

  const getCrossPostsPerDay = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.cross_posts_per_day;
  }, [getVideoEditorLimits]);

  const canSchedulePosts = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.scheduled_posts === true;
  }, [getVideoEditorLimits]);

  // =============================================================================
  // DISTRIBUTION ACCESS
  // =============================================================================

  const getDistributionLimits = useCallback(() => {
    return DISTRIBUTION_LIMITS[userTier] || DISTRIBUTION_LIMITS.free;
  }, [userTier]);

  const canDistributeMusic = useCallback(() => {
    const limits = getDistributionLimits();
    return limits.enabled === true;
  }, [getDistributionLimits]);

  // =============================================================================
  // AI FEATURES ACCESS
  // =============================================================================

  const getAILimits = useCallback(() => {
    return AI_LIMITS[userTier] || AI_LIMITS.free;
  }, [userTier]);

  const hasAIMastering = useCallback(() => {
    const limits = getAILimits();
    return limits.ai_mastering === true;
  }, [getAILimits]);

  const getAIMasteringLimit = useCallback(() => {
    const limits = getAILimits();
    return limits.ai_mastering_limit;
  }, [getAILimits]);

  const hasAIRadioDJ = useCallback(() => {
    const limits = getAILimits();
    return limits.ai_radio_dj === true;
  }, [getAILimits]);

  const hasAIVoiceClone = useCallback(() => {
    const limits = getAILimits();
    return limits.ai_voice_clone === true;
  }, [getAILimits]);

  const hasAIMixAssistant = useCallback(() => {
    const limits = getAILimits();
    return limits.ai_mix_assistant === true;
  }, [getAILimits]);

  const getRecordingStudioTracks = useCallback(() => {
    const limits = getAILimits();
    return limits.recording_studio_tracks || 4;
  }, [getAILimits]);

  // =============================================================================
  // FEATURE CHECK HELPER
  // =============================================================================

  const checkFeature = useCallback((feature) => {
    const featureMap = {
      // Video Editor
      'export_4k': canExport4K(),
      'export_8k': canExport8K(),
      'no_watermark': canRemoveWatermark(),
      'priority_export': hasPriorityExport(),
      'collaboration': canCollaborate(),

      // Streaming
      'streaming': canStream(),
      'simulcast': canSimulcast(),
      'stream_4k': getMaxStreamQuality() === '4k',

      // Clips
      'premium_music': hasPremiumMusic(),
      'schedule_clips': canScheduleClips(),
      'unlimited_clips': getClipsPerDay() === null,

      // Cross-posting
      'cross_posting': canCrossPost(),
      'scheduled_posts': canSchedulePosts(),

      // Distribution
      'music_distribution': canDistributeMusic(),

      // AI Features
      'ai_mastering': hasAIMastering(),
      'ai_radio_dj': hasAIRadioDJ(),
      'ai_voice_clone': hasAIVoiceClone(),
      'ai_mix_assistant': hasAIMixAssistant(),

      // Gaming
      'team_rooms': isAtLeast('starter'),
      'gaming_analytics': isAtLeast('starter'),
      'game_streaming': isAtLeast('creator'),
      'gaming_monetization': isAtLeast('creator'),
      'cloud_gaming': isPro,
    };

    return featureMap[feature] ?? false;
  }, [
    canExport4K, canExport8K, canRemoveWatermark, hasPriorityExport, canCollaborate,
    canStream, canSimulcast, getMaxStreamQuality,
    hasPremiumMusic, canScheduleClips, getClipsPerDay,
    canCrossPost, canSchedulePosts,
    canDistributeMusic,
    hasAIMastering, hasAIRadioDJ, hasAIVoiceClone, hasAIMixAssistant,
    isAtLeast, isPro,
  ]);

  // =============================================================================
  // UPGRADE PROMPTS — 4-tier system
  // =============================================================================

  const getUpgradeMessage = useCallback((feature) => {
    const messages = {
      // Starter unlocks
      'no_watermark': 'Upgrade to Starter to remove watermark',
      'streaming': 'Upgrade to Starter to start live streaming',
      'premium_music': 'Upgrade to Starter for premium music library',
      'ai_mastering': 'Upgrade to Starter to unlock AI Mastering',
      'ai_mix_assistant': 'Upgrade to Starter to unlock AI Mix Assistant',
      'team_rooms': 'Upgrade to Starter for Team Rooms',

      // Creator unlocks
      'export_4k': 'Upgrade to Creator to export in 4K quality',
      'collaboration': 'Upgrade to Creator to collaborate with others',
      'scheduled_posts': 'Upgrade to Creator to schedule posts',
      'schedule_clips': 'Upgrade to Creator to schedule clips',
      'unlimited_clips': 'Upgrade to Creator for unlimited clips',
      'ai_radio_dj': 'Upgrade to Creator to unlock AI Radio DJ',
      'stream_4k': 'Upgrade to Creator for 4K streaming',
      'game_streaming': 'Upgrade to Creator for game streaming',
      'gaming_monetization': 'Upgrade to Creator for gaming monetization',
      'priority_export': 'Upgrade to Creator for priority exports',

      // Pro unlocks
      'export_8k': 'Upgrade to Pro to export in 8K quality',
      'simulcast': 'Upgrade to Pro to stream to multiple platforms',
      'music_distribution': 'Upgrade to Pro to distribute your music',
      'ai_voice_clone': 'Upgrade to Pro to clone your voice as DJ',
      'cloud_gaming': 'Upgrade to Pro for cloud gaming',
    };
    return messages[feature] || 'Upgrade your plan to unlock this feature';
  }, []);

  const getRequiredTier = useCallback((feature) => {
    const requirements = {
      // Starter features
      'no_watermark': 'starter',
      'streaming': 'starter',
      'premium_music': 'starter',
      'ai_mastering': 'starter',
      'ai_mix_assistant': 'starter',
      'team_rooms': 'starter',

      // Creator features
      'export_4k': 'creator',
      'collaboration': 'creator',
      'scheduled_posts': 'creator',
      'schedule_clips': 'creator',
      'unlimited_clips': 'creator',
      'ai_radio_dj': 'creator',
      'stream_4k': 'creator',
      'game_streaming': 'creator',
      'gaming_monetization': 'creator',
      'priority_export': 'creator',

      // Pro features
      'export_8k': 'pro',
      'simulcast': 'pro',
      'music_distribution': 'pro',
      'ai_voice_clone': 'pro',
      'cloud_gaming': 'pro',
    };
    return requirements[feature] || 'pro';
  }, []);

  // =============================================================================
  // RETURN ALL HELPERS
  // =============================================================================

  return {
    // State
    userTier,
    loading,
    error,

    // Tier checks — 4 tiers
    isFree,
    isStarter,
    isCreator,
    isPro,
    isPaid,
    isAtLeast,
    getTierLevel,

    // Video Editor
    getVideoEditorLimits,
    canExport4K,
    canExport8K,
    hasWatermark,
    canRemoveWatermark,
    getMaxTracks,
    getMaxProjects,
    getMaxExportLength,
    hasPriorityExport,
    canCollaborate,
    getMaxCollaborators,

    // Streaming
    getStreamingLimits,
    canStream,
    getMaxStreamDuration,
    getMaxStreamQuality,
    canSimulcast,
    getSimulcastDestinations,

    // Clips
    getClipsLimits,
    getClipsPerDay,
    getMaxClipDuration,
    hasPremiumMusic,
    canScheduleClips,

    // Cross-posting
    canCrossPost,
    getCrossPostPlatforms,
    canCrossPostTo,
    getCrossPostsPerDay,
    canSchedulePosts,

    // Distribution
    getDistributionLimits,
    canDistributeMusic,

    // AI Features
    getAILimits,
    hasAIMastering,
    getAIMasteringLimit,
    hasAIRadioDJ,
    hasAIVoiceClone,
    hasAIMixAssistant,
    getRecordingStudioTracks,

    // Helpers
    checkFeature,
    getUpgradeMessage,
    getRequiredTier,
  };
};

export default useTierAccess;