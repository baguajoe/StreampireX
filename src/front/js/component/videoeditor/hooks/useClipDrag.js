/**
 * useClipDrag.js
 * All drag logic via useRef ONLY. Zero useState. Zero stale closures.
 * Handles: clip move, clip resize (left/right), timeline scrub.
 */
import { useRef, useCallback, useEffect } from 'react';

export function useClipDrag({ actions, selectors, state }) {
  // All drag state in a single ref — no re-renders during drag
  const dragRef = useRef({
    active: false,
    type: null,           // 'move' | 'resize-left' | 'resize-right' | 'scrub'
    clipId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    startDuration: 0,
    startTrackId: null,
    trackHeight: 52,
    tracks: [],           // snapshot at drag start — no stale ref issues
    pxPerSecond: 1,
    snapEnabled: true,
    linkedEdit: true,
    moved: false,
    rafId: null,
    pendingX: 0,
    pendingTrackId: null,
  });

  // Called by timeline to give us current layout info each render
  const updateDragContext = useCallback((pxPerSecond, snapEnabled, linkedEdit, tracks) => {
    dragRef.current.pxPerSecond = pxPerSecond;
    dragRef.current.snapEnabled = snapEnabled;
    dragRef.current.linkedEdit = linkedEdit;
    dragRef.current.tracks = tracks;
  }, []);

  // ── Snap helper ───────────────────────────────────────────
  function snapTo(value, excludeId) {
    const { snapEnabled, tracks, pxPerSecond } = dragRef.current;
    if (!snapEnabled) return value;
    const SNAP_PX = 8;
    const snapSec = SNAP_PX / pxPerSecond;
    let closest = value;
    let minDist = snapSec;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.id === excludeId) return;
        [clip.startTime, clip.startTime + clip.duration].forEach(edge => {
          const d = Math.abs(edge - value);
          if (d < minDist) { minDist = d; closest = edge; }
        });
      });
    });
    return closest;
  }

  // ── Get track index from Y offset ─────────────────────────
  function getTrackIdFromY(clientY, timelineRect) {
    const { tracks, trackHeight } = dragRef.current;
    const relY = clientY - timelineRect.top;
    const idx = Math.floor(relY / trackHeight);
    if (idx < 0 || idx >= tracks.length) return null;
    return tracks[idx].id;
  }

  // ── Start Clip Move ───────────────────────────────────────
  const startClipMove = useCallback((e, clipId, timelineRef) => {
    e.preventDefault();
    e.stopPropagation();

    const d = dragRef.current;
    // Find clip across tracks
    let clip = null;
    let trackId = null;
    d.tracks.forEach(t => { const c = t.clips.find(cl => cl.id === clipId); if (c) { clip = c; trackId = t.id; } });
    if (!clip) return;

    d.active = true;
    d.type = 'move';
    d.clipId = clipId;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startTime = clip.startTime;
    d.startTrackId = trackId;
    d.moved = false;
    d.pendingX = e.clientX;
    d.pendingTrackId = trackId;

    actions.selectClip(clipId, e.shiftKey || e.metaKey || e.ctrlKey);

    const onMouseMove = (ev) => {
      if (!d.active) return;
      d.pendingX = ev.clientX;
      if (timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        d.pendingTrackId = getTrackIdFromY(ev.clientY, rect) || d.pendingTrackId;
      }
      if (d.rafId) cancelAnimationFrame(d.rafId);
      d.rafId = requestAnimationFrame(() => {
        if (!d.active) return;
        const dxPx = d.pendingX - d.startX;
        const dt = dxPx / d.pxPerSecond;
        let newStart = Math.max(0, d.startTime + dt);
        newStart = snapTo(newStart, d.clipId);
        d.moved = true;
        actions.moveClip({ clipId: d.clipId, newStartTime: newStart, newTrackId: d.pendingTrackId });
      });
    };

    const onMouseUp = () => {
      if (d.rafId) { cancelAnimationFrame(d.rafId); d.rafId = null; }
      d.active = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'grabbing';
  }, [actions]);

  // ── Start Clip Resize ─────────────────────────────────────
  const startClipResize = useCallback((e, clipId, edge) => {
    e.preventDefault();
    e.stopPropagation();

    const d = dragRef.current;
    let clip = null;
    d.tracks.forEach(t => { const c = t.clips.find(cl => cl.id === clipId); if (c) clip = c; });
    if (!clip) return;

    d.active = true;
    d.type = edge === 'left' ? 'resize-left' : 'resize-right';
    d.clipId = clipId;
    d.startX = e.clientX;
    d.startTime = clip.startTime;
    d.startDuration = clip.duration;
    d.pendingX = e.clientX;

    const onMouseMove = (ev) => {
      if (!d.active) return;
      d.pendingX = ev.clientX;
      if (d.rafId) cancelAnimationFrame(d.rafId);
      d.rafId = requestAnimationFrame(() => {
        if (!d.active) return;
        const dxPx = d.pendingX - d.startX;
        const dt = dxPx / d.pxPerSecond;

        if (d.type === 'resize-right') {
          let newDuration = Math.max(0.1, d.startDuration + dt);
          const snapEnd = snapTo(d.startTime + newDuration, d.clipId);
          newDuration = snapEnd - d.startTime;
          actions.resizeClip({ clipId: d.clipId, newDuration, edge: 'right' });
        } else {
          let newStart = Math.max(0, d.startTime + dt);
          newStart = snapTo(newStart, d.clipId);
          actions.resizeClip({ clipId: d.clipId, newStartTime: newStart, edge: 'left' });
        }
      });
    };

    const onMouseUp = () => {
      if (d.rafId) { cancelAnimationFrame(d.rafId); d.rafId = null; }
      d.active = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'ew-resize';
  }, [actions]);

  // ── Ruler Scrub ──────────────────────────────────────────
  const startRulerScrub = useCallback((e, rulerRef, trackHeaderWidth) => {
    e.preventDefault();
    const d = dragRef.current;
    d.active = true;
    d.type = 'scrub';

    const seek = (ev) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const relX = ev.clientX - rect.left - trackHeaderWidth;
      const t = Math.max(0, relX / d.pxPerSecond);
      actions.setPlayhead(t);
    };

    seek(e);

    const onMouseMove = (ev) => { if (d.active) seek(ev); };
    const onMouseUp = () => {
      d.active = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [actions]);

  // ── Media Bin Drag to Timeline ────────────────────────────
  const startMediaDrag = useCallback((e, mediaItem, getLiveMediaItem) => {
    // Use HTML5 drag API for media bin → timeline drops
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/spxcut-media', JSON.stringify({
      mediaItemId: mediaItem.id,   // stable join key for reconcile (blob src is unreliable)
      name:       mediaItem.name,
      src:        mediaItem.src,
      mediaType:  mediaItem.mediaType,
      duration:   mediaItem.duration,
      source_url: mediaItem.source_url || null,
      public_id:  mediaItem.public_id || null,
      file:       null, // File objects aren't serializable; handle via ref
    }));
    // Store the dragstart snapshot + a getter that reads the LIVE bin item at
    // drop time. If an upload's 200 resolves between dragstart and drop, the bin
    // item object is replaced (setItems), so the snapshot's source_url stays null
    // forever — the getter re-reads the current object so the drop sees cloud refs.
    dragRef.current.draggedMediaItem = mediaItem;
    dragRef.current.getLiveMediaItem = getLiveMediaItem || (() => mediaItem);
  }, []);

  const handleTimelineDropRef = useRef(null);
  handleTimelineDropRef.current = (e, trackId, timelineScrollLeft, trackHeaderWidth) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/spxcut-media');
    if (!raw) return;
    const snapshot = dragRef.current.draggedMediaItem;
    if (!snapshot) return;
    // Prefer the LIVE bin item (may have been patched to ready post-200); fall
    // back to the dragstart snapshot. Merge per-field so a null on either object
    // never clobbers a populated value — whichever has the resolved cloud ref wins,
    // regardless of timing. Same defensive spirit as RESOLVE_CLIP_MEDIA's ?? guards.
    const live = dragRef.current.getLiveMediaItem ? dragRef.current.getLiveMediaItem() : null;
    const mediaData = live || snapshot;

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left + timelineScrollLeft - trackHeaderWidth;
    const startTime = Math.max(0, relX / dragRef.current.pxPerSecond);

    actions.addClip({
      trackId,
      mediaItemId: (live && live.id) || snapshot.id || null,  // stable join key for reconcile
      name:       mediaData.name       || snapshot.name,
      src:        mediaData.src         || snapshot.src,
      mediaType:  mediaData.mediaType   || snapshot.mediaType,
      duration:   mediaData.duration    || snapshot.duration || 5,
      startTime,
      file:       mediaData.file        || snapshot.file,
      source_url: (live && live.source_url) || snapshot.source_url || null,
      public_id:  (live && live.public_id)  || snapshot.public_id  || null,
    });

    dragRef.current.draggedMediaItem = null;
    dragRef.current.getLiveMediaItem = null;
  };

  const handleTimelineDrop = useCallback((e, trackId, timelineScrollLeft, trackHeaderWidth) => {
    handleTimelineDropRef.current(e, trackId, timelineScrollLeft, trackHeaderWidth);
  }, []);

  // ── FX Drag from Panel to Clip ────────────────────────────
  const startFxDrag = useCallback((e, effect) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/spxcut-effect', JSON.stringify(effect));
  }, []);

  const handleClipFxDrop = useCallback((e, clipId) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData('application/spxcut-effect');
    if (!raw) return;
    const effect = JSON.parse(raw);
    actions.addEffect(clipId, effect);
  }, [actions]);

  // ── Quick Apply floating drag ─────────────────────────────
  const startWindowDrag = useCallback((e, windowRef) => {
    e.preventDefault();
    const rect = windowRef.current.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;

    const onMove = (ev) => {
      if (!windowRef.current) return;
      windowRef.current.style.left = `${ev.clientX - offX}px`;
      windowRef.current.style.top  = `${ev.clientY - offY}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return {
    updateDragContext,
    startClipMove,
    startClipResize,
    startRulerScrub,
    startMediaDrag,
    handleTimelineDrop,
    startFxDrag,
    handleClipFxDrop,
    startWindowDrag,
    isDragging: () => dragRef.current.active,
  };
}

export default useClipDrag;
