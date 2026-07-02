/**
 * usePlayback.js
 * Handles play/pause, seek, frame stepping, loop, timecode formatting.
 * Drives the playhead via requestAnimationFrame — no setInterval drift.
 */
import { useEffect, useRef, useCallback } from 'react';

/** Format seconds → HH:MM:SS:FF (30fps) */
export function formatTimecode(seconds, fps = 30) {
  const s = Math.max(0, seconds);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.floor((s % 1) * fps);
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    ss.toString().padStart(2, '0'),
    ff.toString().padStart(2, '0'),
  ].join(':');
}

/** Parse timecode string HH:MM:SS:FF → seconds */
export function parseTimecode(tc, fps = 30) {
  const parts = tc.split(':').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [h, m, s, f] = parts;
  return h * 3600 + m * 60 + s + f / fps;
}

export function usePlayback({ state, actions }) {
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);
  const videoRefs   = useRef({});  // clipId → <video> element
  // Refs to avoid stale closure in RAF loop
  const stateRef    = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Register/unregister video elements for sync
  const registerVideoRef = useCallback((clipId, el) => {
    if (el) videoRefs.current[clipId] = el;
    else delete videoRefs.current[clipId];
  }, []);

  // ── RAF loop — reads from stateRef to avoid stale closure ──
  const tick = useCallback((timestamp) => {
    const s = stateRef.current;
    if (!s.isPlaying) return;
    if (lastTimeRef.current === null) { lastTimeRef.current = timestamp; }
    const elapsed = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    let nextPlayhead = s.playhead + elapsed;

    // Loop at outPoint or duration
    const loopEnd = s.outPoint !== null ? s.outPoint : s.duration;
    const loopStart = s.inPoint !== null ? s.inPoint : 0;

    if (loopEnd > 0 && nextPlayhead >= loopEnd) {
      nextPlayhead = loopStart;
    }

    actions.setPlayhead(nextPlayhead);
    rafRef.current = requestAnimationFrame(tick);
  }, [actions.setPlayhead]);

  useEffect(() => {
    if (state.isPlaying) {
      lastTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state.isPlaying, tick]);

  // ── Sync video elements to playhead ──────────────────────
  useEffect(() => {
    const ph = state.playhead;
    Object.entries(videoRefs.current).forEach(([clipId, el]) => {
      if (!el) return;
      // Find clip to get its offset
      let clip = null;
      state.tracks.forEach(t => { const c = t.clips.find(cl => cl.id === clipId); if (c) clip = c; });
      if (!clip) return;
      const videoTime = clip.inPoint + (ph - clip.startTime);
      if (videoTime >= 0 && videoTime <= clip.duration) {
        if (Math.abs(el.currentTime - videoTime) > 0.05) el.currentTime = videoTime;
        if (state.isPlaying && el.paused) el.play().catch(() => {});
        if (!state.isPlaying && !el.paused) el.pause();
      } else {
        if (!el.paused) el.pause();
      }
    });
  }, [state.playhead, state.isPlaying, state.tracks]);

  // ── Hard-stop every media element when playback stops ─────
  // The play path calls el.play() on in-range elements; the sync effect above
  // only pauses elements it successfully maps back to a clip (it returns early
  // on a clip-lookup miss), so an element can be left running on its own media
  // clock — audio keeps playing after pause. Pause the exact set the play path
  // started (videoRefs.current), unconditionally, whenever isPlaying is false.
  useEffect(() => {
    if (state.isPlaying) return;
    Object.values(videoRefs.current).forEach(el => { if (el && !el.paused) el.pause(); });
  }, [state.isPlaying]);

  // ── Play/Pause toggle ─────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!state.isPlaying && state.duration === 0) return;
    actions.setPlaying(!state.isPlaying);
  }, [state.isPlaying, state.duration, actions]);

  // ── Seek ──────────────────────────────────────────────────
  const seekTo = useCallback((seconds) => {
    actions.setPlayhead(Math.max(0, Math.min(state.duration, seconds)));
  }, [state.duration, actions]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.shiftKey ? actions.setPlayhead(0) : actions.stepFrame('back');
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.shiftKey ? actions.setPlayhead(state.duration) : actions.stepFrame('forward');
          break;
        case 'KeyI':
          if (!e.ctrlKey && !e.metaKey) actions.setInPoint(state.playhead);
          break;
        case 'KeyO':
          if (!e.ctrlKey && !e.metaKey) actions.setOutPoint(state.playhead);
          break;
        case 'KeyX':
          if (!e.ctrlKey && !e.metaKey) actions.clearInOut();
          break;
        case 'Home':
          e.preventDefault();
          actions.gotoStart();
          break;
        case 'End':
          e.preventDefault();
          actions.gotoEnd();
          break;
        case 'KeyB':
          if (!e.ctrlKey && !e.metaKey) {
            actions.setTool('blade');
          }
          break;
        case 'KeyV':
          if (!e.ctrlKey && !e.metaKey) actions.setTool('select');
          break;
        case 'KeyH':
          if (!e.ctrlKey && !e.metaKey) actions.setTool('hand');
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            e.shiftKey ? actions.redo() : actions.undo();
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            actions.deleteSelected();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, actions, state.playhead, state.duration]);

  return {
    togglePlay,
    seekTo,
    registerVideoRef,
    formatTimecode,
    parseTimecode,
    timecode: formatTimecode(state.playhead),
    durationTimecode: formatTimecode(state.duration),
  };
}

export default usePlayback;
