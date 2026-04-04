import { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const authHeaders = () => {
  const t = localStorage.getItem('jwt-token') || localStorage.getItem('token') || '';
  return t ? { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};



const INITIAL_TRACKS = [
  { id: 1, name: 'Video 1',   type: 'video', visible: true, muted: false, locked: false, color: '#4a9eff', zIndex: 3, clips: [], transitions: [] },
  { id: 2, name: 'Overlay 1', type: 'video', visible: true, muted: false, locked: false, color: '#ff6b6b', zIndex: 2, clips: [], transitions: [] },
  { id: 3, name: 'Audio 1',   type: 'audio', visible: true, muted: false, locked: false, color: '#00d4aa', zIndex: 1, clips: [], transitions: [] },
];

function useUndoRedo(initial) {
  const [stack, setStack] = useState([initial]);
  const [idx, setIdx]     = useState(0);
  const set = useCallback((newVal) => {
    setStack(s => [...s.slice(0, idx + 1), newVal]);
    setIdx(i => i + 1);
  }, [idx]);
  const undo = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const redo = useCallback(() => setStack(s => { setIdx(i => Math.min(s.length - 1, i + 1)); return s; }), []);
  return { state: stack[idx], setState: set, undo, redo, canUndo: idx > 0, canRedo: idx < stack.length - 1 };
}

export function useEditorState() {
  const { state: tracks, setState: setTracks, undo: undoTracks, redo: redoTracks, canUndo, canRedo } = useUndoRedo(INITIAL_TRACKS);

  // ── Playback ────────────────────────────────────────────
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration]                      = useState(300);
  const [frameRate,    setFrameRate]     = useState(24);
  const isPlayingRef                    = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf, last = performance.now();
    const tick = (now) => {
      if (!isPlayingRef.current) return;
      const delta = (now - last) / 1000;
      last = now;
      setCurrentTime(t => {
        const next = t + delta;
        if (next >= duration) { setIsPlaying(false); return duration; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, duration]);

  const play      = useCallback(() => setIsPlaying(true),  []);
  const pause     = useCallback(() => setIsPlaying(false), []);
  const stop      = useCallback(() => { setIsPlaying(false); setCurrentTime(0); }, []);
  const playPause = useCallback(() => setIsPlaying(p => !p), []);
  const seek      = useCallback((t) => setCurrentTime(Math.max(0, Math.min(duration, t))), [duration]);
  const frameBack = useCallback(() => seek(currentTime - 1 / frameRate), [currentTime, frameRate, seek]);
  const frameFwd  = useCallback(() => seek(currentTime + 1 / frameRate), [currentTime, frameRate, seek]);

  // ── Tools / UI ───────────────────────────────────────────
  const [selectedTool,       setSelectedTool]       = useState('select');
  const [selectedClip,       setSelectedClip]       = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [selectedTransType,  setSelectedTransType]  = useState('crossDissolve');
  const [zoom,               setZoom]               = useState(1);
  const [snapOn,             setSnapOn]              = useState(true);
  const [snapSize,           setSnapSize]            = useState(1);
  const [showWaveforms,      setShowWaveforms]       = useState(true);
  const [showKeyframes,      setShowKeyframes]       = useState(false);
  const [mediaLibrary,       setMediaLibrary]        = useState([]);
  const [uploading,          setUploading]           = useState(false);
  const [markers,            setMarkers]             = useState([]);
  const [showExport,         setShowExport]          = useState(false);
  const [showColor,          setShowColor]           = useState(false);
  const [showMixer,          setShowMixer]           = useState(false);
  const [showScopes,         setShowScopes]          = useState(false);
  const [sourceMedia,        setSourceMedia]         = useState(null);
  const [showSourceMon,      setShowSourceMon]       = useState(false);
  const [activeMenu,         setActiveMenu]          = useState(null);
  const [projectTitle,       setProjectTitle]        = useState('Untitled Project');
  const [draggedMedia,       setDraggedMedia]        = useState(null);
  const [draggedEffect,      setDraggedEffect]       = useState(null);
  const [draggedTransition,  setDraggedTransition]   = useState(null);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);
  const programVideoRef = useRef(null);

  // ── Snap helper ─────────────────────────────────────────
  const snap = useCallback((t) => {
    if (!snapOn) return Math.max(0, t);
    return Math.max(0, Math.round(t / snapSize) * snapSize);
  }, [snapOn, snapSize]);

  // ── Clip at playhead ────────────────────────────────────
  const activeClip = tracks
    .flatMap(tr => tr.clips.map(c => ({ ...c, trackColor: tr.color, trackMuted: tr.muted })))
    .find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration) || null;

  // ── Clip CRUD ────────────────────────────────────────────
  const addClipToTrack = useCallback((trackId, clip) => {
    setTracks(prev => prev.map(tr =>
      tr.id === trackId ? { ...tr, clips: [...tr.clips, { ...clip, effects: clip.effects || [], compositing: clip.compositing || { opacity: 100, blendMode: 'normal', position: { x: 0, y: 0 }, scale: { x: 100, y: 100 }, rotation: 0 } }] } : tr
    ));
  }, [setTracks]);

  const updateClip = useCallback((clipId, patch) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => c.id === clipId ? { ...c, ...patch } : c)
    })));
    setSelectedClip(sc => sc && sc.id === clipId ? { ...sc, ...patch } : sc);
  }, [setTracks]);

  const deleteClip = useCallback((clipId) => {
    setTracks(prev => prev.map(tr => ({ ...tr, clips: tr.clips.filter(c => c.id !== clipId) })));
    setSelectedClip(sc => sc && sc.id === clipId ? null : sc);
  }, [setTracks]);

  const splitClip = useCallback((clipId) => {
    const allClips = tracks.flatMap(tr => tr.clips.map(c => ({ ...c, _trackId: tr.id })));
    const clip = allClips.find(c => c.id === clipId) || allClips.find(c => currentTime > c.startTime && currentTime < c.startTime + c.duration);
    if (!clip) return;
    if (currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    const dur1 = currentTime - clip.startTime;
    const dur2 = clip.duration - dur1;
    const c1 = { ...clip, id: Date.now(),     duration: dur1 };
    const c2 = { ...clip, id: Date.now() + 1, duration: dur2, startTime: currentTime };
    setTracks(prev => prev.map(tr =>
      tr.id === clip._trackId
        ? { ...tr, clips: [...tr.clips.filter(c => c.id !== clip.id), c1, c2] }
        : tr
    ));
  }, [tracks, currentTime, setTracks]);

  const trimClipIn = useCallback((clipId) => {
    const clip = tracks.flatMap(tr => tr.clips).find(c => c.id === clipId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    const newDur = clip.duration - (currentTime - clip.startTime);
    updateClip(clipId, { startTime: currentTime, duration: newDur });
  }, [tracks, currentTime, updateClip]);

  const trimClipOut = useCallback((clipId) => {
    const clip = tracks.flatMap(tr => tr.clips).find(c => c.id === clipId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    updateClip(clipId, { duration: currentTime - clip.startTime });
  }, [tracks, currentTime, updateClip]);

  // ── Effect helpers ───────────────────────────────────────
  const applyEffectToClip = useCallback((clipId, effectId, value = 50) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => {
        if (c.id !== clipId) return c;
        const effects = (c.effects || []).filter(e => e.id !== effectId);
        return { ...c, effects: [...effects, { id: effectId, value, enabled: true }] };
      })
    })));
    setSelectedClip(sc => {
      if (!sc || sc.id !== clipId) return sc;
      const effects = (sc.effects || []).filter(e => e.id !== effectId);
      return { ...sc, effects: [...effects, { id: effectId, value, enabled: true }] };
    });
  }, [setTracks]);

  const removeEffectFromClip = useCallback((clipId, effectId) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => c.id === clipId ? { ...c, effects: (c.effects||[]).filter(e => e.id !== effectId) } : c)
    })));
    setSelectedClip(sc => sc && sc.id === clipId ? { ...sc, effects: (sc.effects||[]).filter(e => e.id !== effectId) } : sc);
  }, [setTracks]);

  const toggleEffect = useCallback((clipId, effectId) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => c.id === clipId
        ? { ...c, effects: (c.effects||[]).map(e => e.id === effectId ? { ...e, enabled: !e.enabled } : e) }
        : c)
    })));
  }, [setTracks]);

  const updateEffectValue = useCallback((clipId, effectId, value) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => c.id === clipId
        ? { ...c, effects: (c.effects||[]).map(e => e.id === effectId ? { ...e, value } : e) }
        : c)
    })));
    setSelectedClip(sc => sc && sc.id === clipId
      ? { ...sc, effects: (sc.effects||[]).map(e => e.id === effectId ? { ...e, value } : e) }
      : sc);
  }, [setTracks]);

  const updateCompositing = useCallback((clipId, prop, val) => {
    setTracks(prev => prev.map(tr => ({
      ...tr,
      clips: tr.clips.map(c => c.id === clipId
        ? { ...c, compositing: { ...(c.compositing||{}), [prop]: typeof val === 'object' ? { ...(c.compositing||{})[prop], ...val } : val } }
        : c)
    })));
    setSelectedClip(sc => sc && sc.id === clipId
      ? { ...sc, compositing: { ...(sc.compositing||{}), [prop]: typeof val === 'object' ? { ...(sc.compositing||{})[prop], ...val } : val } }
      : sc);
  }, [setTracks]);

  // ── Transitions ──────────────────────────────────────────
  const addTransition = useCallback((trackId, clip1, clip2, type) => {
    const dur = 1;
    const t = { id: Date.now(), type, startTime: clip1.startTime + clip1.duration - dur / 2, duration: dur, fromClip: clip1.id, toClip: clip2.id };
    setTracks(prev => prev.map(tr => tr.id === trackId ? { ...tr, transitions: [...(tr.transitions||[]), t] } : tr));
  }, [setTracks]);

  const removeTransition = useCallback((trackId, transId) => {
    setTracks(prev => prev.map(tr => tr.id === trackId ? { ...tr, transitions: (tr.transitions||[]).filter(t => t.id !== transId) } : tr));
    setSelectedTransition(null);
  }, [setTracks]);

  // ── Track management ─────────────────────────────────────
  const toggleTrackMute    = useCallback((id) => setTracks(p => p.map(tr => tr.id === id ? { ...tr, muted:   !tr.muted   } : tr)), [setTracks]);
  const toggleTrackVisible = useCallback((id) => setTracks(p => p.map(tr => tr.id === id ? { ...tr, visible: !tr.visible } : tr)), [setTracks]);
  const toggleTrackLock    = useCallback((id) => setTracks(p => p.map(tr => tr.id === id ? { ...tr, locked:  !tr.locked  } : tr)), [setTracks]);
  const addTrack           = useCallback((type) => {
    const count = tracks.filter(tr => tr.type === type).length + 1;
    const t = { id: Date.now(), name: `${type === 'video' ? 'Video' : 'Audio'} ${count}`, type, visible: true, muted: false, locked: false, color: type === 'video' ? '#4a9eff' : '#00d4aa', zIndex: tracks.length + 1, clips: [], transitions: [] };
    setTracks(p => [...p, t]);
  }, [tracks, setTracks]);

  // ── Markers ──────────────────────────────────────────────
  const addMarker    = useCallback((label = '') => setMarkers(m => [...m, { id: Date.now(), time: currentTime, label, color: '#FF6600' }]), [currentTime]);
  const removeMarker = useCallback((id) => setMarkers(m => m.filter(mk => mk.id !== id)), []);
  const nextMarker   = useCallback(() => {
    const nxt = markers.filter(m => m.time > currentTime + 0.05).sort((a,b) => a.time - b.time)[0];
    if (nxt) seek(nxt.time);
  }, [markers, currentTime, seek]);
  const prevMarker   = useCallback(() => {
    const prv = markers.filter(m => m.time < currentTime - 0.05).sort((a,b) => b.time - a.time)[0];
    if (prv) seek(prv.time);
  }, [markers, currentTime, seek]);

  // ── File upload ──────────────────────────────────────────
  const importFiles = useCallback(async (files) => {
    setUploading(true);
    for (const file of files) {
      const tempId = Date.now() + Math.random();
      const localUrl = URL.createObjectURL(file);
      const fileType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
      const item = { id: tempId, name: file.name, type: fileType, url: localUrl, uploading: true, duration: fileType === 'image' ? '0:05' : '0:30' };
      setMediaLibrary(prev => [...prev, item]);
      try {
        const fd = new FormData(); fd.append('file', file);
        const tok = localStorage.getItem('jwt-token') || localStorage.getItem('token') || '';
        const r = await fetch(`${BACKEND}/api/video-editor/upload`, { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: fd });
        if (r.ok) {
          const { asset } = await r.json();
          setMediaLibrary(prev => prev.map(m => m.id === tempId ? {
            ...m, id: asset.public_id || tempId, r2_key: asset.r2_key, url: asset.url || localUrl,
            cloudId: asset.public_id || asset.r2_key, thumbnail: asset.thumbnail,
            duration: asset.duration ? `${Math.floor(asset.duration/60)}:${String(Math.floor(asset.duration%60)).padStart(2,'0')}` : m.duration,
            uploading: false
          } : m));
        } else { throw new Error('Upload failed'); }
      } catch { setMediaLibrary(prev => prev.map(m => m.id === tempId ? { ...m, uploading: false, failed: true } : m)); }
    }
    setUploading(false);
  }, []);

  // ── Save project ─────────────────────────────────────────
  const saveProject = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/video-editor/save-project`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ title: projectTitle, timeline: { tracks }, settings: { frameRate } })
      });
      if (r.ok) console.warn('✅ Project saved!');
      else console.warn('Save failed');
    } catch (e) { console.error('Save failed: ' + e.message); }
  }, [tracks, projectTitle, frameRate]);

  // ── Export ───────────────────────────────────────────────
  const exportVideo = useCallback(async (settings) => {
    const formattedTracks = tracks.map(tr => ({
      id: tr.id, name: tr.name, type: tr.type,
      clips: tr.clips.map(c => ({
        public_id: c.r2_key || c.cloudId || c.id,
        url: c.url, trim: c.inPoint != null ? { start: c.inPoint, end: c.outPoint } : null,
        effects: (c.effects||[]).filter(e => e.enabled !== false),
        audio: { volume: c.volume ?? 100, muted: c.muted || false }
      })),
      transitions: tr.transitions || []
    }));
    const r = await fetch(`${BACKEND}/api/video-editor/export`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ timeline: { tracks: formattedTracks }, settings })
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Export failed'); }
    return r.json();
  }, [tracks]);

  // ── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoTracks(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redoTracks(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveProject(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); setShowExport(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); fileInputRef.current?.click(); }
      if (e.key === ' ') { e.preventDefault(); playPause(); }
      if (e.key === 'Home') { e.preventDefault(); seek(0); }
      if (e.key === 'End')  { e.preventDefault(); seek(duration); }
      if (e.key === 'ArrowLeft'  && !e.shiftKey) { e.preventDefault(); frameBack(); }
      if (e.key === 'ArrowRight' && !e.shiftKey) { e.preventDefault(); frameFwd(); }
      if (e.key === 'ArrowLeft'  &&  e.shiftKey) { e.preventDefault(); seek(currentTime - 1); }
      if (e.key === 'ArrowRight' &&  e.shiftKey) { e.preventDefault(); seek(currentTime + 1); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClip) { e.preventDefault(); deleteClip(selectedClip.id); }
      if (e.key === 'Escape') { setSelectedClip(null); setSelectedTransition(null); setActiveMenu(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); if (selectedClip) splitClip(selectedClip.id); }
      if (e.key === 'm') addMarker();
      if (e.key === 'v') setSelectedTool('select');
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) setSelectedTool('razor');
      if (e.key === 'h') setSelectedTool('hand');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playPause, seek, frameBack, frameFwd, selectedClip, deleteClip, splitClip, addMarker, undoTracks, redoTracks, saveProject, duration, currentTime]);

  // ── Format timecode ──────────────────────────────────────
  const formatTime = useCallback((s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), fr = Math.floor((s % 1) * frameRate);
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
  }, [frameRate]);


  // ── Copy / Paste ─────────────────────────────────────────
  const clipboardRef = useRef(null);
  const copyClip = useCallback(() => {
    if (selectedClip) clipboardRef.current = { ...selectedClip };
  }, [selectedClip]);
  const pasteClip = useCallback(() => {
    const cb = clipboardRef.current;
    if (!cb || !tracks.length) return;
    addClipToTrack(tracks[0].id, { ...cb, id: Date.now(), startTime: cb.startTime + cb.duration + 0.1 });
  }, [tracks, addClipToTrack]);

  // ── Reverse clip ──────────────────────────────────────────
  const reverseClip = useCallback(() => {
    if (!selectedClip) return;
    updateClip(selectedClip.id, { reversed: !selectedClip.reversed });
  }, [selectedClip, updateClip]);

  // ── Speed dialog ──────────────────────────────────────────
  const [showSpeedDialog, setShowSpeedDialog] = useState(false);
  const openSpeedDialog = useCallback(() => {
    if (selectedClip) setShowSpeedDialog(true);
  }, [selectedClip]);

  // ── Load project ──────────────────────────────────────────
  const loadProject = useCallback((projectData) => {
    if (!projectData) return;
    if (projectData.tracks) setTracks(projectData.tracks);
    if (projectData.markers) setMarkers(projectData.markers || []);
  }, [setTracks]);

  return {
    // playback
    isPlaying, currentTime, duration, frameRate, setFrameRate,
    play, pause, stop, playPause, seek, frameBack, frameFwd, formatTime,
    // tracks
    tracks, setTracks, canUndo, canRedo, undoTracks, redoTracks,
    toggleTrackMute, toggleTrackVisible, toggleTrackLock, addTrack,
    // clips
    activeClip, selectedClip, setSelectedClip,
    addClipToTrack, updateClip, deleteClip, splitClip, trimClipIn, trimClipOut,
    // effects
    applyEffectToClip, removeEffectFromClip, toggleEffect, updateEffectValue, updateCompositing,
    // transitions
    selectedTransition, setSelectedTransition, selectedTransType, setSelectedTransType,
    addTransition, removeTransition,
    // markers
    markers, addMarker, removeMarker, nextMarker, prevMarker,
    // ui
    selectedTool, setSelectedTool, zoom, setZoom, snapOn, setSnapOn, snapSize, setSnapSize,
    showWaveforms, setShowWaveforms, showKeyframes, setShowKeyframes,
    mediaLibrary, setMediaLibrary, uploading, importFiles,
    showExport, setShowExport, showColor, setShowColor,
    showMixer, setShowMixer, showScopes, setShowScopes,
    sourceMedia, setSourceMedia, showSourceMon, setShowSourceMon,
    activeMenu, setActiveMenu, projectTitle, setProjectTitle,
    draggedMedia, setDraggedMedia, draggedEffect, setDraggedEffect,
    draggedTransition, setDraggedTransition,
    // refs
    timelineRef, fileInputRef, programVideoRef,
    // api
    saveProject, exportVideo, snap, BACKEND, authHeaders,
    // new actions
    copyClip, pasteClip, reverseClip, openSpeedDialog, loadProject,
    showSpeedDialog, setShowSpeedDialog,
  };
}
