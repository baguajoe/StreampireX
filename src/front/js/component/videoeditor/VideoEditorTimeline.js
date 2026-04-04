import React, { useRef, useCallback } from 'react';
import { Plus, Video, AudioWaveform, Lock, Unlock, Volume2, VolumeX, Eye, EyeOff, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';

export default function VideoEditorTimeline({
  tracks, currentTime, duration, zoom, snap, snapOn, snapSize,
  selectedClip, setSelectedClip, selectedTransition, setSelectedTransition,
  selectedTransType, draggedMedia, setDraggedMedia, draggedTransition,
  draggedEffect, showWaveforms, showKeyframes, markers,
  addClipToTrack, updateClip, deleteClip, splitClip,
  addTransition, removeTransition, toggleTrackMute, toggleTrackVisible,
  toggleTrackLock, addTrack, setCurrentTime, selectedTool,
  applyEffectToClip, timelineRef, formatTime,
}) {
  const draggingClip = useRef(null);
  const dragOffset   = useRef(0);

  const PX = 2 * zoom; // pixels per second

  // ── Click on ruler → seek ──────────────────────────────
  const handleRulerClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setCurrentTime(Math.max(0, Math.min(duration, x / PX)));
  }, [PX, duration, setCurrentTime]);

  // ── Click on track lane → seek (select tool) ───────────
  const handleLaneClick = useCallback((e) => {
    if (selectedTool !== 'select') return;
    if (e.target.classList.contains('spx-drop-zone') || e.target.classList.contains('spx-empty-track')) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCurrentTime(Math.max(0, Math.min(duration, (e.clientX - rect.left) / PX)));
    }
  }, [selectedTool, PX, duration, setCurrentTime]);

  // ── Clip mousedown → start drag ────────────────────────
  const handleClipMouseDown = useCallback((e, clip, trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.locked) return;

    if (selectedTool === 'razor') {
      e.stopPropagation();
      splitClip(clip.id);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setSelectedClip(clip);
    setSelectedTransition(null);

    const rect = timelineRef.current.getBoundingClientRect();
    const clipLeftPx = clip.startTime * PX;
    dragOffset.current = (e.clientX - rect.left) - clipLeftPx;
    draggingClip.current = { ...clip, trackId };

    const onMove = (mv) => {
      if (!draggingClip.current || !timelineRef.current) return;
      const r = timelineRef.current.getBoundingClientRect();
      const rawTime = (mv.clientX - r.left - dragOffset.current) / PX;
      const newStart = snap(rawTime);

      // collision check
      const tr = tracks.find(t => t.id === draggingClip.current.trackId);
      const others = tr ? tr.clips.filter(c => c.id !== clip.id) : [];
      let safeStart = newStart;
      for (const other of others) {
        if (safeStart < other.startTime + other.duration && safeStart + clip.duration > other.startTime) {
          safeStart = safeStart < other.startTime ? other.startTime - clip.duration : other.startTime + other.duration;
        }
      }
      updateClip(clip.id, { startTime: Math.max(0, safeStart) });
    };

    const onUp = () => {
      draggingClip.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [tracks, selectedTool, PX, snap, splitClip, setSelectedClip, setSelectedTransition, updateClip, timelineRef]);

  // ── Drop media onto lane ───────────────────────────────
  const handleDrop = useCallback((e, trackId) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    console.log('🎯 DROP on track', trackId, 'dataTransfer types:', [...e.dataTransfer.types]);
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.locked) return;
    console.log('🎯 track found:', track.name, 'locked:', track.locked);

    // Effect drop — check dataTransfer first, then state
    let effectData = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) { const p = JSON.parse(raw); if (p.type === 'effect') effectData = p; }
    } catch {}
    const eff = effectData || draggedEffect;
    if (eff && eff.id) {
      const rect = timelineRef.current?.getBoundingClientRect();
      const dropX = rect ? e.clientX - rect.left : 0;
      const clipUnder = track.clips.find(c => {
        const cs = c.startTime * PX;
        return dropX >= cs && dropX <= cs + c.duration * PX;
      });
      if (clipUnder) applyEffectToClip(clipUnder.id, eff.id, 50);
      return;
    }

    // Transition drop — check dataTransfer first, then state
    let transData = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) { const p = JSON.parse(raw); if (p.type === 'transition') transData = p; }
    } catch {}
    const trans = transData || draggedTransition;
    if (trans && trans.id) {
      const rect = timelineRef.current?.getBoundingClientRect();
      const dropX = rect ? e.clientX - rect.left : 0;
      const dropTime = dropX / PX;
      const sorted = [...track.clips].sort((a,b) => a.startTime - b.startTime);
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i+1].startTime - (sorted[i].startTime + sorted[i].duration);
        if (Math.abs(dropTime - (sorted[i].startTime + sorted[i].duration)) < 2 && gap < 1) {
          addTransition(trackId, sorted[i], sorted[i+1], trans.id);
          break;
        }
      }
      return;
    }

    // Media drop — ALWAYS read from dataTransfer, state is unreliable during drag
    let media = null;
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (raw) { const p = JSON.parse(raw); if (p.name || p.url || p.type) media = p; }
    } catch {}
    // fallback to state if dataTransfer empty
    if (!media) media = draggedMedia;
    if (!media) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    const dropX = rect ? e.clientX - rect.left : 0;
    const dropTime = snap(dropX / PX);

    let durSecs = 30;
    if (media.duration) {
      const parts = media.duration.split(':');
      durSecs = parts.length === 2
        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
        : parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    if (media.type === 'image') durSecs = 5;

    const newClip = {
      id: Date.now(),
      title: media.name,
      type: media.type,
      startTime: dropTime,
      duration: durSecs,
      mediaUrl: media.url,
      r2_key: media.r2_key,
      cloudId: media.cloudId,
      thumbnail: media.thumbnail,
      effects: [],
      compositing: { opacity: 100, blendMode: 'normal', position: { x:0,y:0 }, scale: { x:100,y:100 }, rotation: 0 },
    };
    addClipToTrack(trackId, newClip);
    setSelectedClip(newClip);
    setDraggedMedia(null);
  }, [tracks, draggedMedia, draggedEffect, draggedTransition, PX, snap, addClipToTrack, addTransition, applyEffectToClip, setSelectedClip, setDraggedMedia, timelineRef]);

  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };

  // ── Adjacent clip pairs for transition buttons ─────────
  const getAdjacentPairs = (track) => {
    const sorted = [...track.clips].sort((a,b) => a.startTime - b.startTime);
    const pairs = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i+1].startTime - (sorted[i].startTime + sorted[i].duration);
      if (gap < 1) pairs.push({ c1: sorted[i], c2: sorted[i+1] });
    }
    return pairs;
  };

  // ── CSS filter string from clip effects ────────────────
  const buildFilter = (effects) => {
    if (!effects || !effects.length) return '';
    const parts = [];
    for (const e of effects) {
      if (!e.enabled) continue;
      const v = e.value || 50;
      switch (e.id) {
        case 'brightness':      parts.push(`brightness(${0.5 + v/100})`); break;
        case 'contrast':        parts.push(`contrast(${0.5 + v/100})`); break;
        case 'saturation':      parts.push(`saturate(${v/50})`); break;
        case 'hue':             parts.push(`hue-rotate(${v/100*360}deg)`); break;
        case 'blur':            parts.push(`blur(${v/10}px)`); break;
        case 'grayscale':       parts.push(`grayscale(${v}%)`); break;
        case 'sepia':           parts.push(`sepia(${v}%)`); break;
        case 'invert':          parts.push(`invert(${v}%)`); break;
        case 'low_light_restore': parts.push(`brightness(${1+v/140}) contrast(${1+v/300}) saturate(${1+v/500})`); break;
        case 'shadow_recovery': parts.push(`brightness(${1+v/180}) contrast(${1+v/500})`); break;
        case 'denoise':         parts.push(`contrast(${1+v/800}) saturate(${1-v/1200})`); break;
        case 'detail_boost':    parts.push(`contrast(${1+v/250}) saturate(${1+v/900})`); break;
        case 'cinematic_relight': parts.push(`brightness(${1+v/160}) contrast(${1+v/260}) saturate(${1+v/700})`); break;
        case 'fadeIn': case 'fadeOut': case 'crossDissolve': break; // handled in overlay
        default: break;
      }
    }
    return parts.join(' ');
  };

  // ── Fade overlay for program monitor (exported for use) ─
  const getFadeOverlay = (effects, progress) => {
    if (!effects || !effects.length) return null;
    const fd = 0.3;
    for (const e of effects) {
      if (!e.enabled) continue;
      if (e.id === 'crossDissolve') {
        if (progress < fd) return { color: '#000', opacity: 1 - progress/fd };
        if (progress > 1-fd) return { color: '#000', opacity: (progress-(1-fd))/fd };
      }
      if (e.id === 'fadeIn'       && progress < fd) return { color: '#000', opacity: 1 - progress/fd };
      if (e.id === 'fadeOut'      && progress > 1-fd) return { color: '#000', opacity: (progress-(1-fd))/fd };
      if (e.id === 'fadeInWhite'  && progress < fd) return { color: '#fff', opacity: 1 - progress/fd };
      if (e.id === 'fadeOutWhite' && progress > 1-fd) return { color: '#fff', opacity: (progress-(1-fd))/fd };
    }
    return null;
  };

  const totalWidth = Math.max(duration * PX, 800);

  // ── Ruler marks ────────────────────────────────────────
  const buildRuler = () => {
    const marks = [];
    const interval = zoom < 0.3 ? 60 : zoom < 0.6 ? 30 : zoom < 1.2 ? 10 : zoom < 2.5 ? 5 : 1;
    for (let t = 0; t <= duration; t += interval) {
      marks.push(
        <div key={t} className="spx-ruler-mark" style={{ left: t * PX }}>
          <div className="spx-ruler-line" />
          <div className="spx-ruler-text">{formatTime(t)}</div>
        </div>
      );
    }
    return marks;
  };

  const sortedTracks = [...tracks].sort((a,b) => b.zIndex - a.zIndex);

  return (
    <div className="spx-timeline-area">
      {/* ── Controls bar ───────────────────────────────── */}
      <div className="spx-timeline-controls">
        <button className="spx-zoom-btn" onClick={() => onZoom && onZoom(-0.25)}>−</button>
        <span className="spx-zoom-label">{Math.round(zoom*100)}%</span>
        <button className="spx-zoom-btn" onClick={() => onZoom && onZoom(0.25)}>+</button>
        <div className="spx-toolbar-sep" />
        <button className={`spx-tl-opt-btn ${snapOn ? 'active' : ''}`} onClick={() => onToggleSnap && onToggleSnap()}>
          Snap {snapOn ? 'ON' : 'OFF'}
        </button>
        <button className={`spx-tl-opt-btn ${showWaveforms ? 'active' : ''}`} onClick={() => onToggleWaveforms && onToggleWaveforms()}>
          Waveforms
        </button>
        <button className="spx-tl-opt-btn" onClick={() => addTrack('video')}>+ Video</button>
        <button className="spx-tl-opt-btn" onClick={() => addTrack('audio')}>+ Audio</button>
      </div>

      {/* ── Timeline scroll area ────────────────────────── */}
      <div className="spx-timeline-scroll" ref={timelineRef}>
        <div className="spx-timeline-inner" style={{ width: totalWidth + 200 }}>

          {/* Track headers column */}
          <div className="spx-track-headers">
            <div className="spx-track-header-spacer" />
            {sortedTracks.map(track => (
              <div key={track.id} className="spx-track-header">
                <div className="spx-track-icon">
                  {track.type === 'video' ? <Video size={12} /> : <AudioWaveform size={12} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="spx-track-name">{track.name}</div>
                  <div className="spx-track-layer">Layer {track.zIndex}</div>
                </div>
                <div className="spx-track-btns">
                  <button className={`spx-track-btn ${track.muted ? 'muted' : ''}`}
                    onClick={() => toggleTrackMute(track.id)} title={track.muted ? 'Unmute' : 'Mute'}>
                    {track.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  </button>
                  <button className={`spx-track-btn ${track.visible ? 'visible' : ''}`}
                    onClick={() => toggleTrackVisible(track.id)} title={track.visible ? 'Hide' : 'Show'}>
                    {track.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  </button>
                  <button className={`spx-track-btn ${track.locked ? 'locked' : ''}`}
                    onClick={() => toggleTrackLock(track.id)} title={track.locked ? 'Unlock' : 'Lock'}>
                    {track.locked ? <Lock size={10} /> : <Unlock size={10} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline canvas */}
          <div className="spx-timeline-canvas" style={{ width: totalWidth, position: 'relative' }}>
            {/* Ruler */}
            <div className="spx-ruler" style={{ width: totalWidth }} onClick={handleRulerClick}>
              {buildRuler()}
            </div>

            {/* Playhead */}
            <div className="spx-playhead" style={{ left: currentTime * PX, height: `${sortedTracks.length * 52 + 28}px` }}>
              <div className="spx-playhead-top" />
            </div>

            {/* Markers */}
            {markers.map(mk => (
              <div key={mk.id} className="spx-marker"
                style={{ left: mk.time * PX, height: `${sortedTracks.length * 52 + 28}px`, top: 0 }}
                onClick={() => setCurrentTime(mk.time)}>
                {mk.label && <div className="spx-marker-flag">{mk.label}</div>}
              </div>
            ))}

            {/* Track rows */}
            {sortedTracks.map(track => (
              <div key={track.id} className="spx-track-row" style={{ width: totalWidth }}>
                <div className="spx-drop-zone"
                  onClick={handleLaneClick}
                  onDrop={(e) => handleDrop(e, track.id)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}>

                  {track.clips.length === 0 && (
                    <div className="spx-empty-track">Drop media here</div>
                  )}

                  {/* Clips */}
                  {track.clips.map(clip => {
                    const left  = clip.startTime * PX;
                    const width = Math.max(clip.duration * PX, 4);
                    const isSelected = selectedClip?.id === clip.id;
                    const cssFilter = buildFilter(clip.effects);
                    return (
                      <div key={clip.id}
                        className={`spx-clip${isSelected ? ' selected' : ''}${track.locked ? ' locked' : ''}`}
                        style={{
                          left, width,
                          background: clip.thumbnail
                            ? `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.55)), url(${clip.thumbnail}) center/cover no-repeat`
                            : track.color,
                          filter: cssFilter
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, track.id)}
                        onClick={(e) => { e.stopPropagation(); setSelectedClip(clip); setSelectedTransition(null); }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.outline = '2px solid #00ffc8'; }}
                        onDragLeave={(e) => { e.currentTarget.style.outline = 'none'; }}
                        onDrop={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          e.currentTarget.style.outline = 'none';
                          if (draggedEffect) { applyEffectToClip(clip.id, draggedEffect.id, 50); }
                        }}>
                        {clip.thumbnail && (
                          <img src={clip.thumbnail} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.35,pointerEvents:'none',borderRadius:4}} />
                        )}
                        <div className="spx-clip-label" style={{position:'relative',zIndex:1}}>{clip.title}</div>
                        {clip.effects && clip.effects.length > 0 && (
                          <div className="spx-clip-fx-badge">
                            <Sparkles size={8} />{clip.effects.length}
                          </div>
                        )}
                        {clip.cloudId && <span className="spx-clip-cloud">☁</span>}
                      </div>
                    );
                  })}

                  {/* Transition blocks */}
                  {(track.transitions || []).map(tr => {
                    const left  = tr.startTime * PX;
                    const width = Math.max(tr.duration * PX, 8);
                    return (
                      <div key={tr.id}
                        className={`spx-transition-block${selectedTransition?.id === tr.id ? ' selected' : ''}`}
                        style={{ left, width }}
                        onClick={(e) => { e.stopPropagation(); setSelectedTransition(tr); setSelectedClip(null); }}>
                        {tr.type}
                      </div>
                    );
                  })}

                  {/* + Transition buttons between adjacent clips */}
                  {getAdjacentPairs(track).map(({ c1, c2 }, i) => {
                    const pos = (c1.startTime + c1.duration) * PX;
                    const alreadyHas = (track.transitions||[]).some(t =>
                      Math.abs(t.startTime - (c1.startTime + c1.duration - 0.5)) < 1.2
                    );
                    if (alreadyHas) return null;
                    return (
                      <div key={i} className="spx-add-transition-btn"
                        style={{ left: pos - 11 }}
                        title={`Add ${selectedTransType} transition`}
                        onClick={(e) => { e.stopPropagation(); addTransition(track.id, c1, c2, selectedTransType); }}>
                        <Plus size={12} color="#fff" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helpers for use in monitors
export { };
