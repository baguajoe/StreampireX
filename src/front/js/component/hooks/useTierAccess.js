// =============================================================================
// useTierAccess.js - 3-Tier Version (Free, Basic, Premium)
// =============================================================================
// Hook to check user's tier and feature access
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

// Tier hierarchy for comparisons
const TIER_LEVELS = {
  'free': 0,
  'basic': 1,
  'premium': 2
};

// =============================================================================
// VIDEO EDITOR TIER LIMITS
// =============================================================================
const VIDEO_EDITOR_LIMITS = {
  free: {
    max_export_quality: '1080p',
    export_formats: ['mp4', 'webm'],
    watermark: true,
    priority_export: false,
    max_export_length_minutes: 10,
    max_projects: 5,
    max_tracks: 4,
    max_project_duration_minutes: 30,
    storage_gb: 5,
    max_upload_gb: 2,
    collaboration: false,
    version_history: false,
    cross_posting: true,
    cross_post_platforms: ['youtube'],
    cross_posts_per_day: 1,
    scheduled_posts: false,
  },
  basic: {
    max_export_quality: '4k',
    export_formats: ['mp4', 'webm', 'mov', 'gif'],
    watermark: false,
    priority_export: false,
    max_export_length_minutes: 60,
    max_projects: 25,
    max_tracks: 8,
    max_project_duration_minutes: 120,
    storage_gb: 25,
    max_upload_gb: 5,
    collaboration: false,
    version_history: true,
    cross_posting: true,
    cross_post_platforms: ['youtube', 'facebook', 'instagram'],
    cross_posts_per_day: 5,
    scheduled_posts: false,
  },
  premium: {
    max_export_quality: '4k',
    export_formats: ['mp4', 'webm', 'mov', 'gif', 'prores'],
    watermark: false,
    priority_export: true,
    max_export_length_minutes: null, // Unlimited
    max_projects: null, // Unlimited
    max_tracks: 24,
    max_project_duration_minutes: null, // Unlimited
    storage_gb: 150,
    max_upload_gb: 15,
    collaboration: true,
    max_collaborators: 5,
    version_history: true,
    cross_posting: true,
    cross_post_platforms: ['youtube', 'facebook', 'instagram', 'linkedin', 'pinterest', 'tiktok', 'vimeo'],
    cross_posts_per_day: null, // Unlimited
    scheduled_posts: true,
  },
};

// =============================================================================
// STREAMING TIER LIMITS
// =============================================================================
const STREAMING_LIMITS = {
  free: {
    enabled: false,
    max_quality: null,
    max_duration_hours: 0,
    simulcast: false,
    simulcast_destinations: 0,
  },
  basic: {
    enabled: true,
    max_quality: '1080p',
    max_duration_hours: 4,
    simulcast: false,
    simulcast_destinations: 0,
    tips_enabled: true,
  },
  premium: {
    enabled: true,
    max_quality: '4k',
    max_duration_hours: 12,
    simulcast: true,
    simulcast_destinations: 5,
    tips_enabled: true,
    subscriptions_enabled: true,
  },
};

// =============================================================================
// CLIPS TIER LIMITS
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
  basic: {
    clips_per_day: 20,
    max_duration_seconds: 180,
    max_file_size_mb: 500,
    effects: true,
    filters: true,
    music_library: true,
    premium_music: true,
    schedule_clips: false,
  },
  premium: {
    clips_per_day: null, // Unlimited
    max_duration_seconds: 600,
    max_file_size_mb: 2048,
    effects: true,
    filters: true,
    music_library: true,
    premium_music: true,
    schedule_clips: true,
    clip_analytics: true,
  },
};

// =============================================================================
// DISTRIBUTION TIER LIMITS
// =============================================================================
const DISTRIBUTION_LIMITS = {
  free: {
    enabled: false,
  },
  basic: {
    enabled: false,
  },
  premium: {
    enabled: true,
    releases_per_year: null, // Unlimited
    royalty_split: 0.90,
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
  const isBasic = userTier === 'basic';
  const isPremium = userTier === 'premium';
  const isPaid = isBasic || isPremium;

  // =============================================================================
  // VIDEO EDITOR ACCESS
  // =============================================================================
  
  const getVideoEditorLimits = useCallback(() => {
    return VIDEO_EDITOR_LIMITS[userTier] || VIDEO_EDITOR_LIMITS.free;
  }, [userTier]);

  const canExport4K = useCallback(() => {
    const limits = getVideoEditorLimits();
    return limits.max_export_quality === '4k';
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
  // FEATURE CHECK HELPER
  // =============================================================================
  
  const checkFeature = useCallback((feature) => {
    const featureMap = {
      // Video Editor
      'export_4k': canExport4K(),
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
      
      // Cross-posting
      'cross_posting': canCrossPost(),
      'scheduled_posts': canSchedulePosts(),
      
      // Distribution
      'music_distribution': canDistributeMusic(),
    };

    return featureMap[feature] ?? false;
  }, [
    canExport4K, canRemoveWatermark, hasPriorityExport, canCollaborate,
    canStream, canSimulcast, getMaxStreamQuality,
    hasPremiumMusic, canScheduleClips,
    canCrossPost, canSchedulePosts,
    canDistributeMusic
  ]);

  // =============================================================================
  // UPGRADE PROMPTS
  // =============================================================================
  
  const getUpgradeMessage = useCallback((feature) => {
    const messages = {
      'export_4k': 'Upgrade to Basic to export in 4K quality',
      'no_watermark': 'Upgrade to Basic to remove watermark',
      'streaming': 'Upgrade to Basic to start live streaming',
      'simulcast': 'Upgrade to Premium to stream to multiple platforms',
      'collaboration': 'Upgrade to Premium to collaborate with others',
      'music_distribution': 'Upgrade to Premium to distribute your music',
      'premium_music': 'Upgrade to Basic for premium music library',
      'scheduled_posts': 'Upgrade to Premium to schedule posts',
    };
    return messages[feature] || 'Upgrade your plan to unlock this feature';
  }, []);

  const getRequiredTier = useCallback((feature) => {
    const requirements = {
      'export_4k': 'basic',
      'no_watermark': 'basic',
      'streaming': 'basic',
      'simulcast': 'premium',
      'collaboration': 'premium',
      'music_distribution': 'premium',
      'premium_music': 'basic',
      'scheduled_posts': 'premium',
      'stream_4k': 'premium',
    };
    return requirements[feature] || 'premium';
  }, []);

  // =============================================================================
  // RETURN ALL HELPERS
  // =============================================================================
  
  return {
    // State
    userTier,
    loading,
    error,
    
    // Tier checks
    isFree,
    isBasic,
    isPremium,
    isPaid,
    isAtLeast,
    getTierLevel,
    
    // Video Editor
    getVideoEditorLimits,
    canExport4K,
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
    
    // Helpers
    checkFeature,
    getUpgradeMessage,
    getRequiredTier,
  };
};

export default useTierAccess;