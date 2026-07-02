/**
 * buildExportPayload.js
 * Pure helpers that bridge the SPX Cut in-memory timeline to the backend
 * render contract (POST /api/video-editor/export).
 *
 * Backend reads, per video clip: public_id ‖ id (R2 key / dedup),
 * source_url (HTTP download), trim.{start,end}, audio.{volume,muted}.
 * It only renders tracks where track.type === 'video'.
 * settings: resolution ("480p"|"720p"|"1080p"|"4k"), frameRate (int),
 * format (default mp4), quality ("low"|"auto"|"high" → CRF).
 *
 * v1 scope: video clips, trimmed, concatenated in array order. No timeline-gap
 * positioning and no audio-track mixing (those are later milestones).
 */

/**
 * Convert state.tracks + chosen settings into the backend's expected body.
 * @param {Array} tracks  state.tracks from useEditorStore
 * @param {Object} opts    { resolution, frameRate, format, quality }
 * @returns {{ timeline: { tracks: Array }, settings: Object }}
 */
export function buildExportPayload(tracks, { resolution, frameRate, format, quality = 'auto' }) {
  const outTracks = (tracks || [])
    .filter(t => t.type === 'video')
    .map(t => ({
      id:   t.id,
      type: 'video',
      clips: (t.clips || []).map(c => ({
        id:         c.id,
        public_id:  c.public_id || null,
        source_url: c.source_url || null,
        // Backend trims only when end > start; inPoint/outPoint are source-relative seconds.
        trim:  { start: c.inPoint ?? 0, end: c.outPoint ?? c.duration },
        // No per-clip volume exists in the model → default 100. Mute falls back clip → track.
        audio: { volume: 100, muted: (c.muted ?? t.muted ?? false) },
      })),
    }));

  return {
    timeline: { tracks: outTracks },
    settings: { resolution, frameRate, format, quality },
  };
}

/**
 * Readiness gate: returns the display names of video clips that have no usable
 * backend source — null source_url AND a public_id that is not an R2 key
 * (does not start with "editor/"). Catches in-flight uploads and
 * INSERT_MEDIA source-monitor clips (which carry null source_url/public_id).
 * @param {Array} tracks  state.tracks
 * @returns {string[]} names/ids of not-yet-uploadable clips (empty = all ready)
 */
export function getUnreadyClips(tracks) {
  const unready = [];
  (tracks || [])
    .filter(t => t.type === 'video')
    .forEach(t => (t.clips || []).forEach(c => {
      const hasSource =
        !!c.source_url ||
        (typeof c.public_id === 'string' && c.public_id.startsWith('editor/'));
      if (!hasSource) unready.push(c.name || c.id);
    }));
  return unready;
}
