/**
 * useEditorStore.js
 * Single source of truth for all SPX Cut editor state.
 * useReducer replaces 60+ useState calls.
 * Handles: tracks, clips, playhead, zoom, selection, undo/redo history.
 */
import { useReducer, useCallback, useRef } from 'react';

// ── Blob URL tracking (revoke on delete to prevent memory leaks) ──
const ownedBlobUrls = new Set();
function trackBlobUrl(url) { if (url && url.startsWith('blob:')) ownedBlobUrls.add(url); return url; }
function revokeIfOwned(url) {
  if (url && ownedBlobUrls.has(url)) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    ownedBlobUrls.delete(url);
  }
}

// ── Initial State ─────────────────────────────────────────────
const INITIAL_TRACKS = [
  { id: 1, name: 'Overlay 1', type: 'video', zIndex: 3, muted: true,  locked: false, solo: false, color: '#ff6b6b', clips: [], transitions: [] },
  { id: 2, name: 'Video 1',   type: 'video', zIndex: 2, muted: false, locked: false, solo: false, color: '#4a9eff', clips: [], transitions: [] },
  { id: 3, name: 'Audio 1',   type: 'audio', zIndex: 1, muted: false, locked: false, solo: false, color: '#00d4aa', clips: [], transitions: [] },
];

const INITIAL_STATE = {
  // Project
  projectName: 'Untitled Project',
  projectId:   null,
  isDirty:     false,

  // Tracks
  tracks: INITIAL_TRACKS,
  nextTrackId: 4,

  // Playback
  playhead:    0,        // seconds
  isPlaying:   false,
  isRecording: false,
  inPoint:     null,     // seconds or null
  outPoint:    null,     // seconds or null
  duration:    0,        // total project duration in seconds

  // View
  zoom:        1,        // px per second
  scrollLeft:  0,
  snapEnabled: true,
  linkedEdit:  true,

  // Selection
  selectedClipIds:   [],
  selectedTrackId:   null,

  // Active clip for right panel
  activeClipId: null,

  // Tool
  activeTool: 'select', // select | blade | slip | slide | ripple | roll | zoom | hand

  // UI state
  showExportModal:   false,
  showColorGrade:    false,
  showQuickApply:    false,
  activeRightTab:    'effects', // effects | transform | presets

  // Undo/Redo (stored as snapshots of tracks)
  undoStack: [],
  redoStack: [],
};

// ── Helpers ───────────────────────────────────────────────────
function clampTime(t) { return Math.max(0, t); }

function generateClipId() {
  return `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function computeDuration(tracks) {
  let max = 0;
  tracks.forEach(track => {
    track.clips.forEach(clip => {
      const end = clip.startTime + clip.duration;
      if (end > max) max = end;
    });
  });
  return max;
}

/** Find the lowest zIndex non-muted non-locked video track */
function getDefaultVideoTrack(tracks) {
  const candidates = tracks.filter(
    t => t.type === 'video' && !t.muted && !t.locked
  );
  if (!candidates.length) return tracks.find(t => t.type === 'video') || null;
  return candidates.reduce((prev, cur) => (cur.zIndex < prev.zIndex ? cur : prev));
}

/** Find lowest non-muted non-locked audio track */
function getDefaultAudioTrack(tracks) {
  const candidates = tracks.filter(t => t.type === 'audio' && !t.muted && !t.locked);
  if (!candidates.length) return null;
  return candidates.reduce((prev, cur) => (cur.zIndex < prev.zIndex ? cur : prev));
}

/** Snap value to nearby clip edges or playhead if snap enabled */
function snapValue(value, pps, snapEnabled, tracks, excludeId) {
  if (!snapEnabled) return value;
  const SNAP_PX = 8;
  const SNAP_SEC = SNAP_PX / pps;
  let closest = value;
  let minDist = SNAP_SEC;
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

/** Produce a deep-cloned tracks snapshot for undo */
function cloneTracks(tracks) {
  return tracks.map(t => ({
    ...t,
    clips: t.clips.map(c => ({
      ...c,
      effects: (c.effects || []).map(e => ({ ...e, params: { ...(e.params || {}) } })),
      transform: { ...(c.transform || {}) },
    })),
    transitions: [...(t.transitions || [])],
  }));
}

// ── Reducer ───────────────────────────────────────────────────
function editorReducer(state, action) {
  switch (action.type) {

    /* ─── Project ───────────────────────────────────────────── */
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload, isDirty: true };

    case 'LOAD_PROJECT':
      return {
        ...state,
        ...action.payload,
        undoStack: [],
        redoStack: [],
        isDirty: false,
      };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    /* ─── Playback ──────────────────────────────────────────── */
    case 'SET_PLAYHEAD':
      return { ...state, playhead: clampTime(action.payload) };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_RECORDING':
      return { ...state, isRecording: action.payload };

    case 'SET_IN_POINT':
      return { ...state, inPoint: action.payload };

    case 'SET_OUT_POINT':
      return { ...state, outPoint: action.payload };

    case 'CLEAR_INOUT':
      return { ...state, inPoint: null, outPoint: null };

    case 'STEP_FRAME': {
      const fps = 30;
      const delta = (action.payload === 'forward' ? 1 : -1) / fps;
      return { ...state, playhead: clampTime(state.playhead + delta) };
    }

    case 'GOTO_START':
      return { ...state, playhead: 0, isPlaying: false };

    case 'GOTO_END':
      return { ...state, playhead: state.duration, isPlaying: false };

    /* ─── View ──────────────────────────────────────────────── */
    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(500, Math.max(10, action.payload)) };

    case 'SET_SCROLL_LEFT':
      return { ...state, scrollLeft: Math.max(0, action.payload) };

    case 'SET_SNAP':
      return { ...state, snapEnabled: action.payload };

    case 'SET_LINKED_EDIT':
      return { ...state, linkedEdit: action.payload };

    /* ─── Tool ──────────────────────────────────────────────── */
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload };

    /* ─── Selection ─────────────────────────────────────────── */
    case 'SELECT_CLIP': {
      const { clipId, multi } = action.payload;
      if (!clipId) return { ...state, selectedClipIds: [], activeClipId: null };
      const already = state.selectedClipIds.includes(clipId);
      let next;
      if (multi) {
        next = already
          ? state.selectedClipIds.filter(id => id !== clipId)
          : [...state.selectedClipIds, clipId];
      } else {
        next = already && state.selectedClipIds.length === 1 ? [] : [clipId];
      }
      return { ...state, selectedClipIds: next, activeClipId: next.length ? next[next.length - 1] : null };
    }

    case 'SELECT_TRACK':
      return { ...state, selectedTrackId: action.payload };

    case 'CLEAR_SELECTION':
      return { ...state, selectedClipIds: [], activeClipId: null };

    /* ─── UI ────────────────────────────────────────────────── */
    case 'SET_EXPORT_MODAL':
      return { ...state, showExportModal: action.payload };

    case 'SET_COLOR_GRADE':
      return { ...state, showColorGrade: action.payload };

    case 'SET_QUICK_APPLY':
      return { ...state, showQuickApply: action.payload };

    case 'SET_RIGHT_TAB':
      return { ...state, activeRightTab: action.payload };

    /* ─── Track Ops ─────────────────────────────────────────── */
    case 'ADD_TRACK': {
      const { trackType, name } = action.payload;
      const colorMap = { video: '#4a9eff', audio: '#00d4aa', image: '#ffcc00' };
      const newTrack = {
        id:      state.nextTrackId,
        name:    name || `${trackType === 'video' ? 'Video' : 'Audio'} ${state.nextTrackId}`,
        type:    trackType,
        zIndex:  state.nextTrackId,
        muted:   false,
        locked:  false,
        solo:    false,
        color:   colorMap[trackType] || '#9090b0',
        clips:   [],
        transitions: [],
      };
      return {
        ...state,
        tracks: [...state.tracks, newTrack],
        nextTrackId: state.nextTrackId + 1,
        isDirty: true,
      };
    }

    case 'REMOVE_TRACK': {
      // Revoke blob URLs of clips on the removed track (memory leak fix)
      const removedTrack = state.tracks.find(t => t.id === action.payload);
      if (removedTrack) removedTrack.clips.forEach(c => revokeIfOwned(c.src));
      const tracks = state.tracks.filter(t => t.id !== action.payload);
      return { ...state, tracks, duration: computeDuration(tracks), isDirty: true };
    }

    case 'UPDATE_TRACK': {
      const tracks = state.tracks.map(t =>
        t.id === action.payload.id ? { ...t, ...action.payload.changes } : t
      );
      return { ...state, tracks, isDirty: true };
    }

    case 'REORDER_TRACKS': {
      return { ...state, tracks: action.payload, isDirty: true };
    }

    /* ─── Clip Ops ──────────────────────────────────────────── */
    case 'ADD_CLIP': {
      const prevTracks = cloneTracks(state.tracks);
      const {
        trackId, file, startTime, duration, inPoint: clipIn = 0,
        outPoint: clipOut = null, name, mediaType, src,
        linkGroup = null, waveformData = null,
      } = action.payload;

      const clip = {
        id:          generateClipId(),
        trackId,
        name:        name || (file ? file.name : 'Clip'),
        mediaType:   mediaType || 'video',
        src:         src || (file ? trackBlobUrl(URL.createObjectURL(file)) : ''),
        startTime:   clampTime(startTime),
        duration:    duration || 5,
        inPoint:     clipIn,
        outPoint:    clipOut !== null ? clipOut : (duration || 5),
        linkGroup,
        waveformData,
        effects:     [],
        transform: {
          x: 0, y: 0,
          scaleX: 1, scaleY: 1,
          rotation: 0,
          opacity: 1,
          blendMode: 'normal',
        },
        color: null,
      };

      const tracks = state.tracks.map(t =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
      );
      const newDuration = computeDuration(tracks);

      return {
        ...state,
        tracks,
        duration: newDuration,
        isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks],
        redoStack: [],
      };
    }

    case 'INSERT_MEDIA': {
      // Insert video+audio pair from source monitor into timeline at playhead
      const prevTracks = cloneTracks(state.tracks);
      const { file, mediaDuration, mode, inPoint: mIn = 0, outPoint: mOut } = action.payload;
      const clipDuration = (mOut !== undefined ? mOut : mediaDuration) - mIn;
      const startTime = state.playhead;
      const linkGroup = `link_${Date.now()}`;

      let tracks = cloneTracks(state.tracks);

      if (mode === 'video' || mode === 'both') {
        const vTrack = getDefaultVideoTrack(tracks);
        if (vTrack) {
          const clip = {
            id: generateClipId(), trackId: vTrack.id,
            name: file.name, mediaType: 'video', src: trackBlobUrl(URL.createObjectURL(file)),
            startTime, duration: clipDuration, inPoint: mIn, outPoint: mIn + clipDuration,
            linkGroup: mode === 'both' ? linkGroup : null,
            effects: [], waveformData: null,
            transform: { x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:1,blendMode:'normal' }, color: null,
          };
          tracks = tracks.map(t => t.id === vTrack.id ? { ...t, clips: [...t.clips, clip] } : t);
        }
      }
      if (mode === 'audio' || mode === 'both') {
        const aTrack = getDefaultAudioTrack(tracks);
        if (aTrack) {
          const clip = {
            id: generateClipId(), trackId: aTrack.id,
            name: file.name, mediaType: 'audio', src: trackBlobUrl(URL.createObjectURL(file)),
            startTime, duration: clipDuration, inPoint: mIn, outPoint: mIn + clipDuration,
            linkGroup: mode === 'both' ? linkGroup : null,
            effects: [], waveformData: null,
            transform: { x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:1,blendMode:'normal' }, color: null,
          };
          tracks = tracks.map(t => t.id === aTrack.id ? { ...t, clips: [...t.clips, clip] } : t);
        }
      }

      const newDuration = computeDuration(tracks);
      return {
        ...state, tracks, duration: newDuration, isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    case 'MOVE_CLIP': {
      // Move clip (and linked clips) to new startTime/trackId
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, newStartTime, newTrackId, deltaTime } = action.payload;

      // Find the clip
      let movingClip = null;
      state.tracks.forEach(t => { const c = t.clips.find(cl => cl.id === clipId); if (c) movingClip = c; });
      if (!movingClip) return state;

      const linkGroup = movingClip.linkGroup;

      let tracks = cloneTracks(state.tracks);

      // Remove clips from old tracks
      const clipIdsToMove = new Set();
      const clipsToMove = [];
      if (linkGroup && state.linkedEdit) {
        tracks.forEach(t => {
          t.clips.forEach(c => { if (c.linkGroup === linkGroup) { clipIdsToMove.add(c.id); clipsToMove.push({ ...c }); } });
        });
      } else {
        clipIdsToMove.add(clipId);
        clipsToMove.push({ ...movingClip });
      }

      tracks = tracks.map(t => ({ ...t, clips: t.clips.filter(c => !clipIdsToMove.has(c.id)) }));

      // Re-insert at new positions
      clipsToMove.forEach(c => {
        const isMover = c.id === clipId;
        const targetTrackId = isMover ? (newTrackId || c.trackId) : c.trackId;
        const dt = deltaTime !== undefined ? deltaTime : (newStartTime - movingClip.startTime);
        const updatedClip = {
          ...c,
          trackId:   targetTrackId,
          startTime: clampTime(c.startTime + dt),
        };
        tracks = tracks.map(t =>
          t.id === targetTrackId ? { ...t, clips: [...t.clips, updatedClip] } : t
        );
      });

      return {
        ...state, tracks, duration: computeDuration(tracks), isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    case 'RESIZE_CLIP': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, newDuration, newStartTime, edge } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
          if (c.id !== clipId) return c;
          if (edge === 'right') return { ...c, duration: Math.max(0.1, newDuration) };
          if (edge === 'left') {
            const clampedStart = clampTime(newStartTime);
            const diff = c.startTime - clampedStart;
            return { ...c, startTime: clampedStart, duration: Math.max(0.1, c.duration + diff), inPoint: Math.max(0, c.inPoint - diff) };
          }
          return c;
        }),
      }));
      return {
        ...state, tracks, duration: computeDuration(tracks), isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    case 'DELETE_CLIPS': {
      const prevTracks = cloneTracks(state.tracks);
      const ids = new Set(action.payload);
      // Revoke blob URLs of deleted clips (memory leak fix)
      state.tracks.forEach(t => t.clips.forEach(c => { if (ids.has(c.id)) revokeIfOwned(c.src); }));
      const tracks = state.tracks.map(t => ({ ...t, clips: t.clips.filter(c => !ids.has(c.id)) }));
      return {
        ...state, tracks,
        selectedClipIds: state.selectedClipIds.filter(id => !ids.has(id)),
        activeClipId: ids.has(state.activeClipId) ? null : state.activeClipId,
        duration: computeDuration(tracks),
        isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    case 'SPLIT_CLIP': {
      // Blade cut at playhead or given time
      const prevTracks = cloneTracks(state.tracks);
      const splitTime = action.payload !== undefined ? action.payload : state.playhead;
      let tracks = cloneTracks(state.tracks);

      tracks = tracks.map(track => {
        const newClips = [];
        track.clips.forEach(clip => {
          if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
            newClips.push(clip);
            return;
          }
          const leftDuration = splitTime - clip.startTime;
          const rightDuration = clip.duration - leftDuration;
          const leftInPoint = clip.inPoint;
          const rightInPoint = clip.inPoint + leftDuration;
          // Preserve linkGroup on split — left half keeps original, right half gets matched new link
          const splitLinkLeft  = clip.linkGroup;
          const splitLinkRight = clip.linkGroup ? `${clip.linkGroup}_split_${Date.now()}` : null;
          newClips.push({ ...clip, id: generateClipId(), duration: leftDuration, outPoint: leftInPoint + leftDuration, linkGroup: splitLinkLeft });
          newClips.push({ ...clip, id: generateClipId(), startTime: splitTime, duration: rightDuration, inPoint: rightInPoint, outPoint: rightInPoint + rightDuration, linkGroup: splitLinkRight });
        });
        return { ...track, clips: newClips };
      });

      return {
        ...state, tracks, isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    case 'DUPLICATE_CLIPS': {
      const prevTracks = cloneTracks(state.tracks);
      const ids = new Set(action.payload || state.selectedClipIds);
      let tracks = cloneTracks(state.tracks);
      const newIds = [];

      tracks = tracks.map(track => {
        const dupes = [];
        track.clips.forEach(clip => {
          if (!ids.has(clip.id)) return;
          const dupe = { ...clip, id: generateClipId(), startTime: clip.startTime + clip.duration, linkGroup: null };
          dupes.push(dupe);
          newIds.push(dupe.id);
        });
        return { ...track, clips: [...track.clips, ...dupes] };
      });

      return {
        ...state, tracks, selectedClipIds: newIds,
        activeClipId: newIds.length ? newIds[0] : state.activeClipId,
        duration: computeDuration(tracks), isDirty: true,
        undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [],
      };
    }

    /* ─── Effects on Clips ──────────────────────────────────── */
    case 'ADD_EFFECT_TO_CLIP': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, effect } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId
            ? { ...c, effects: [...c.effects, { ...effect, id: `fx_${Date.now()}`, enabled: true, params: { ...effect.defaultParams } }] }
            : c
        ),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    case 'REMOVE_EFFECT_FROM_CLIP': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, effectId } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, effects: c.effects.filter(e => e.id !== effectId) } : c
        ),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    case 'TOGGLE_EFFECT': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, effectId } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId
            ? { ...c, effects: c.effects.map(e => e.id === effectId ? { ...e, enabled: !e.enabled } : e) }
            : c
        ),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    case 'UPDATE_EFFECT_PARAM': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, effectId, paramKey, value } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId
            ? { ...c, effects: c.effects.map(e => e.id === effectId ? { ...e, params: { ...e.params, [paramKey]: value } } : e) }
            : c
        ),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    case 'REORDER_EFFECTS': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, effects } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => c.id === clipId ? { ...c, effects } : c),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    case 'UPDATE_CLIP_TRANSFORM': {
      const prevTracks = cloneTracks(state.tracks);
      const { clipId, transform } = action.payload;
      const tracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c =>
          c.id === clipId ? { ...c, transform: { ...c.transform, ...transform } } : c
        ),
      }));
      return { ...state, tracks, isDirty: true, undoStack: [...state.undoStack.slice(-49), prevTracks], redoStack: [] };
    }

    /* ─── Undo / Redo ───────────────────────────────────────── */
    case 'UNDO': {
      if (!state.undoStack.length) return state;
      const prevTracks = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        tracks:    prevTracks,
        duration:  computeDuration(prevTracks),
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [cloneTracks(state.tracks), ...state.redoStack.slice(0, 49)],
        isDirty:   true,
      };
    }

    case 'REDO': {
      if (!state.redoStack.length) return state;
      const nextTracks = state.redoStack[0];
      return {
        ...state,
        tracks:    nextTracks,
        duration:  computeDuration(nextTracks),
        redoStack: state.redoStack.slice(1),
        undoStack: [...state.undoStack.slice(-49), cloneTracks(state.tracks)],
        isDirty:   true,
      };
    }

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────
export function useEditorStore() {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);

  // ── Action Creators ────────────────────────────────────────
  const actions = {
    // Project
    setProjectName:   useCallback(name => dispatch({ type: 'SET_PROJECT_NAME', payload: name }), []),
    loadProject:      useCallback(data => dispatch({ type: 'LOAD_PROJECT', payload: data }), []),
    markClean:        useCallback(() => dispatch({ type: 'MARK_CLEAN' }), []),

    // Playback
    setPlayhead:      useCallback(t => dispatch({ type: 'SET_PLAYHEAD', payload: t }), []),
    setPlaying:       useCallback(v => dispatch({ type: 'SET_PLAYING', payload: v }), []),
    setRecording:     useCallback(v => dispatch({ type: 'SET_RECORDING', payload: v }), []),
    setInPoint:       useCallback(t => dispatch({ type: 'SET_IN_POINT', payload: t }), []),
    setOutPoint:      useCallback(t => dispatch({ type: 'SET_OUT_POINT', payload: t }), []),
    clearInOut:       useCallback(() => dispatch({ type: 'CLEAR_INOUT' }), []),
    stepFrame:        useCallback(dir => dispatch({ type: 'STEP_FRAME', payload: dir }), []),
    gotoStart:        useCallback(() => dispatch({ type: 'GOTO_START' }), []),
    gotoEnd:          useCallback(() => dispatch({ type: 'GOTO_END' }), []),

    // View
    setZoom:          useCallback(z => dispatch({ type: 'SET_ZOOM', payload: z }), []),
    setScrollLeft:    useCallback(s => dispatch({ type: 'SET_SCROLL_LEFT', payload: s }), []),
    setSnap:          useCallback(v => dispatch({ type: 'SET_SNAP', payload: v }), []),
    setLinkedEdit:    useCallback(v => dispatch({ type: 'SET_LINKED_EDIT', payload: v }), []),

    // Tool
    setTool:          useCallback(t => dispatch({ type: 'SET_TOOL', payload: t }), []),

    // Selection
    selectClip:       useCallback((id, multi = false) => dispatch({ type: 'SELECT_CLIP', payload: { clipId: id, multi } }), []),
    selectTrack:      useCallback(id => dispatch({ type: 'SELECT_TRACK', payload: id }), []),
    clearSelection:   useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []),

    // UI
    setExportModal:   useCallback(v => dispatch({ type: 'SET_EXPORT_MODAL', payload: v }), []),
    setColorGrade:    useCallback(v => dispatch({ type: 'SET_COLOR_GRADE', payload: v }), []),
    setQuickApply:    useCallback(v => dispatch({ type: 'SET_QUICK_APPLY', payload: v }), []),
    setRightTab:      useCallback(t => dispatch({ type: 'SET_RIGHT_TAB', payload: t }), []),

    // Tracks
    addTrack:         useCallback((trackType, name) => dispatch({ type: 'ADD_TRACK', payload: { trackType, name } }), []),
    removeTrack:      useCallback(id => dispatch({ type: 'REMOVE_TRACK', payload: id }), []),
    updateTrack:      useCallback((id, changes) => dispatch({ type: 'UPDATE_TRACK', payload: { id, changes } }), []),
    reorderTracks:    useCallback(tracks => dispatch({ type: 'REORDER_TRACKS', payload: tracks }), []),

    // Clips
    addClip:          useCallback(payload => dispatch({ type: 'ADD_CLIP', payload }), []),
    insertMedia:      useCallback(payload => dispatch({ type: 'INSERT_MEDIA', payload }), []),
    moveClip:         useCallback(payload => dispatch({ type: 'MOVE_CLIP', payload }), []),
    resizeClip:       useCallback(payload => dispatch({ type: 'RESIZE_CLIP', payload }), []),
    deleteClips:      useCallback(ids => dispatch({ type: 'DELETE_CLIPS', payload: ids }), []),
    deleteSelected:   useCallback(() => dispatch({ type: 'DELETE_CLIPS', payload: null }), []),
    splitClip:        useCallback(time => dispatch({ type: 'SPLIT_CLIP', payload: time }), []),
    duplicateClips:   useCallback(ids => dispatch({ type: 'DUPLICATE_CLIPS', payload: ids }), []),

    // Effects
    addEffect:        useCallback((clipId, effect) => dispatch({ type: 'ADD_EFFECT_TO_CLIP', payload: { clipId, effect } }), []),
    removeEffect:     useCallback((clipId, effectId) => dispatch({ type: 'REMOVE_EFFECT_FROM_CLIP', payload: { clipId, effectId } }), []),
    toggleEffect:     useCallback((clipId, effectId) => dispatch({ type: 'TOGGLE_EFFECT', payload: { clipId, effectId } }), []),
    updateEffectParam:useCallback((clipId, effectId, paramKey, value) => dispatch({ type: 'UPDATE_EFFECT_PARAM', payload: { clipId, effectId, paramKey, value } }), []),
    reorderEffects:   useCallback((clipId, effects) => dispatch({ type: 'REORDER_EFFECTS', payload: { clipId, effects } }), []),
    updateTransform:  useCallback((clipId, transform) => dispatch({ type: 'UPDATE_CLIP_TRANSFORM', payload: { clipId, transform } }), []),

    // Undo/Redo
    undo:             useCallback(() => dispatch({ type: 'UNDO' }), []),
    redo:             useCallback(() => dispatch({ type: 'REDO' }), []),
  };

  // ── Computed Selectors ─────────────────────────────────────
  const selectors = {
    getTrackById:     useCallback(id => state.tracks.find(t => t.id === id), [state.tracks]),
    getClipById:      useCallback(id => { for (const t of state.tracks) { const c = t.clips.find(cl => cl.id === id); if (c) return c; } return null; }, [state.tracks]),
    getActiveClip:    useCallback(() => { if (!state.activeClipId) return null; for (const t of state.tracks) { const c = t.clips.find(cl => cl.id === state.activeClipId); if (c) return c; } return null; }, [state.tracks, state.activeClipId]),
    canUndo:          state.undoStack.length > 0,
    canRedo:          state.redoStack.length > 0,
    pxPerSecond:      state.zoom,
    timeToPx:         useCallback(t => t * state.zoom, [state.zoom]),
    pxToTime:         useCallback(px => px / state.zoom, [state.zoom]),
    snapValue:        useCallback((v, excludeId) => snapValue(v, state.zoom, state.snapEnabled, state.tracks, excludeId), [state.zoom, state.snapEnabled, state.tracks]),
  };

  return { state, actions, selectors };
}

export default useEditorStore;
