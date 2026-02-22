// =============================================================================
// videoDurationCheck.js — Shared utility for checking video duration caps
// =============================================================================
// Location: src/front/js/utils/videoDurationCheck.js
// Used by: StoryUpload.js, CreateStoryModal.js
// =============================================================================

export const MAX_STORY_DURATION = 60;  // 60 seconds for stories
export const MAX_REEL_DURATION = 180;  // 3 minutes for reels (future use)

/**
 * Check if a video file exceeds the given max duration.
 * Returns { valid: boolean, duration: number }
 * Uses HTML5 video element to read metadata without uploading.
 */
export const checkVideoDuration = (file, maxDuration = MAX_STORY_DURATION) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const duration = Math.ceil(video.duration);
      resolve({
        valid: duration <= maxDuration,
        duration,
        maxDuration,
        message: duration > maxDuration
          ? `Video is ${duration}s — max allowed is ${maxDuration} seconds. Please trim your video.`
          : null
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      // If we can't read metadata, allow upload — backend will catch it
      resolve({ valid: true, duration: null, maxDuration, message: null });
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Format seconds into mm:ss display
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};