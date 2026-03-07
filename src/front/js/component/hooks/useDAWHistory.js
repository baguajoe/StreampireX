// =============================================================================
// useDAWHistory.js — Undo/Redo for RecordingStudio track state
// =============================================================================
// Location: src/front/js/component/hooks/useDAWHistory.js
//
// USAGE in RecordingStudio.js:
//   import { useDAWHistory } from '../component/hooks/useDAWHistory';
//
//   // Replace: const [tracks, setTracks] = useState([...]);
//   // With:
//   const {
//     tracks, setTracks,
//     undo, redo, canUndo, canRedo,
//     pushSnapshot, clearHistory,
//   } = useDAWHistory(initialTracks);
//
//   // Wire to DAWMenuBar:
//   case 'edit:undo': undo(); break;
//   case 'edit:redo': redo(); break;
//
//   // Wire Ctrl+Z / Ctrl+Y globally (add to existing keydown handler):
//   if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); undo(); }
//   if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.key==='z'&&e.shiftKey))) { e.preventDefault(); redo(); }
//
// NOTES:
//   - Snapshots are deep-cloned to prevent mutation bugs
//   - Audio buffers are reference-copied (not deep cloned) — they're immutable by nature
//   - Max 60 history entries to keep memory bounded
//   - setTracks() works exactly like useState's setter (supports functional updates)
//   - Call pushSnapshot() BEFORE a bulk destructive action if you want a named checkpoint
// =============================================================================

import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 60;

// Shallow-clone track array while deep-cloning everything EXCEPT AudioBuffer
// (AudioBuffer objects are not JSON-serializable and are effectively immutable)
function cloneTrackState(tracks) {
  return tracks.map(t => ({
    ...t,
    // Deep clone effects (plain object)
    effects: t.effects ? { ...t.effects,
      eq:         t.effects.eq         ? { ...t.effects.eq }         : undefined,
      filter:     t.effects.filter     ? { ...t.effects.filter }     : undefined,
      compressor: t.effects.compressor ? { ...t.effects.compressor } : undefined,
      distortion: t.effects.distortion ? { ...t.effects.distortion } : undefined,
      reverb:     t.effects.reverb     ? { ...t.effects.reverb }     : undefined,
      delay:      t.effects.delay      ? { ...t.effects.delay }      : undefined,
      limiter:    t.effects.limiter    ? { ...t.effects.limiter }    : undefined,
    } : t.effects,
    // Deep clone regions array (but audioBuffer reference stays)
    regions: t.regions
      ? t.regions.map(r => ({ ...r }))
      : [],
  }));
}

export function useDAWHistory(initialTracks) {
  const [tracks, setTracksInternal] = useState(initialTracks);

  // history[0] = oldest, history[historyIndex] = current
  const historyRef = useRef([cloneTrackState(initialTracks)]);
  const indexRef   = useRef(0);
  const skipPush   = useRef(false); // prevents push during undo/redo

  // Expose derived state for button enable/disable
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0);
    setCanRedo(indexRef.current < historyRef.current.length - 1);
  }, []);

  // Drop any "future" history ahead of current index, push new snapshot
  const pushToHistory = useCallback((snapshot) => {
    const hist = historyRef.current;
    // Trim future
    historyRef.current = hist.slice(0, indexRef.current + 1);
    // Enforce max
    if (historyRef.current.length >= MAX_HISTORY) {
      historyRef.current.shift();
      indexRef.current = Math.max(0, indexRef.current - 1);
    }
    historyRef.current.push(snapshot);
    indexRef.current = historyRef.current.length - 1;
    syncFlags();
  }, [syncFlags]);

  // Drop-in replacement for setTracks — works with value OR functional updater
  const setTracks = useCallback((updater) => {
    setTracksInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipPush.current) {
        pushToHistory(cloneTrackState(next));
      }
      return next;
    });
  }, [pushToHistory]);

  // Manually push a named checkpoint BEFORE a bulk change
  const pushSnapshot = useCallback(() => {
    setTracksInternal(current => {
      pushToHistory(cloneTrackState(current));
      return current;
    });
  }, [pushToHistory]);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    const snapshot = historyRef.current[indexRef.current];
    skipPush.current = true;
    setTracksInternal(cloneTrackState(snapshot));
    skipPush.current = false;
    syncFlags();
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    const snapshot = historyRef.current[indexRef.current];
    skipPush.current = true;
    setTracksInternal(cloneTrackState(snapshot));
    skipPush.current = false;
    syncFlags();
  }, [syncFlags]);

  const clearHistory = useCallback(() => {
    setTracksInternal(current => {
      historyRef.current = [cloneTrackState(current)];
      indexRef.current = 0;
      syncFlags();
      return current;
    });
  }, [syncFlags]);

  return {
    tracks,
    setTracks,
    undo,
    redo,
    canUndo,
    canRedo,
    pushSnapshot,
    clearHistory,
    historyLength: historyRef.current.length,
    historyIndex:  indexRef.current,
  };
}

export default useDAWHistory;