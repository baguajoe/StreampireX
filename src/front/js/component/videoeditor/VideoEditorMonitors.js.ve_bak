import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Monitor, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward, Plus, Video, AudioWaveform, Image } from 'lucide-react';

// ── Build CSS filter string from clip effects ─────────────
function buildFilter(effects) {
  if (!effects || !effects.length) return '';
  const parts = [];
  for (const e of effects) {
    if (!e.enabled) continue;
    const v = e.value || 50;
    switch (e.id) {
      case 'brightness':        parts.push(`brightness(${0.5 + v/100})`); break;
      case 'contrast':          parts.push(`contrast(${0.5 + v/100})`); break;
      case 'saturation':        parts.push(`saturate(${v/50})`); break;
      case 'hue':               parts.push(`hue-rotate(${v/100*360}deg)`); break;
      case 'blur':              parts.push(`blur(${v/10}px)`); break;
      case 'grayscale':         parts.push(`grayscale(${v}%)`); break;
      case 'sepia':             parts.push(`sepia(${v}%)`); break;
      case 'invert':            parts.push(`invert(${v}%)`); break;
      case 'low_light_restore': parts.push(`brightness(${1+v/140}) contrast(${1+v/300}) saturate(${1+v/500})`); break;
      case 'shadow_recovery':   parts.push(`brightness(${1+v/180}) contrast(${1+v/500})`); break;
      case 'denoise':           parts.push(`contrast(${1+v/800}) saturate(${1-v/1200})`); break;
      case 'detail_boost':      parts.push(`contrast(${1+v/250}) saturate(${1+v/900})`); break;
      case 'cinematic_relight': parts.push(`brightness(${1+v/160}) contrast(${1+v/260}) saturate(${1+v/700})`); break;
      default: break;
    }
  }
  return parts.join(' ');
}

// ── Fade overlay calc ─────────────────────────────────────
function getFade(effects, progress) {
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
}

// ═══════════════════════════════════════════════════════════
// SOURCE MONITOR POPUP
// ═══════════════════════════════════════════════════════════
export function SourceMonitorPopup({ media, onClose, onAddToTimeline }) {
  const [inPoint,    setInPoint]    = useState(0);
  const [outPoint,   setOutPoint]   = useState(0);
  const [curTime,    setCurTime]    = useState(0);
  const [dur,        setDur]        = useState(0);
  const [playing,    setPlaying]    = useState(false);
  const vidRef = useRef(null);
  const audRef = useRef(null);
  const getEl  = () => vidRef.current || audRef.current;

  useEffect(() => { setInPoint(0); setOutPoint(0); setCurTime(0); setDur(0); setPlaying(false); }, [media]);

  const onMeta   = () => { const el = getEl(); if (el) { setDur(el.duration); setOutPoint(el.duration); } };
  const onUpdate = () => { const el = getEl(); if (el) setCurTime(el.currentTime); };
  const toggle   = () => { const el = getEl(); if (!el) return; playing ? el.pause() : el.play(); setPlaying(p => !p); };
  const goIn     = () => { const el = getEl(); if (el) { el.currentTime = inPoint; setCurTime(inPoint); } };
  const goOut    = () => { const el = getEl(); if (el) { el.currentTime = outPoint; setCurTime(outPoint); } };
  const markIn   = () => setInPoint(curTime);
  const markOut  = () => setOutPoint(curTime);

  const fmt = (s) => {
    if (isNaN(s)) return '00:00:00';
    const m = Math.floor(s/60), sec = Math.floor(s%60), fr = Math.floor((s%1)*30);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(fr).padStart(2,'0')}`;
  };

  const scrub = (e) => {
    const pct = parseFloat(e.target.value) / 100;
    const t = pct * dur;
    const el = getEl();
    if (el) el.currentTime = t;
    setCurTime(t);
  };

  return (
    <div className="spx-export-overlay" onClick={onClose}>
      <div className="spx-source-monitor-popup" onClick={e => e.stopPropagation()}>
        <div className="spx-source-monitor-header">
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Monitor size={14} style={{ color:'#00ffc8' }} />
            <span style={{ fontSize:12, fontWeight:700, color:'#e6edf3' }}>Source Monitor</span>
            <span style={{ fontSize:11, color:'#4e6a82' }}>— {media?.name}</span>
          </div>
          <button className="spx-panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="spx-source-monitor-screen" style={{ minHeight:280 }}>
          {media?.type === 'video' && (
            <video ref={vidRef} src={media.url} style={{ maxWidth:'100%', maxHeight:300 }}
              onTimeUpdate={onUpdate} onLoadedMetadata={onMeta}
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          )}
          {media?.type === 'audio' && (
            <div style={{ textAlign:'center', padding:40 }}>
              <AudioWaveform size={56} style={{ color:'#ff6b6b', marginBottom:12 }} />
              <p style={{ color:'#8b949e', marginBottom:12 }}>{media.name}</p>
              <audio ref={audRef} src={media.url}
                onTimeUpdate={onUpdate} onLoadedMetadata={onMeta}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
            </div>
          )}
          {media?.type === 'image' && (
            <img src={media.url} alt="preview" style={{ maxWidth:'100%', maxHeight:300, objectFit:'contain' }} />
          )}
        </div>

        {(media?.type === 'video' || media?.type === 'audio') && (
          <div className="spx-source-monitor-footer">
            {/* Scrub bar */}
            <div className="spx-inout-bar" style={{ position:'relative', height:20, marginBottom:8 }}>
              <div className="spx-inout-range" style={{ left:`${dur>0?(inPoint/dur)*100:0}%`, width:`${dur>0?((outPoint-inPoint)/dur)*100:100}%` }} />
              <div className="spx-inout-pos"   style={{ left:`${dur>0?(curTime/dur)*100:0}%` }} />
              <div className="spx-inout-in"    style={{ left:`${dur>0?(inPoint/dur)*100:0}%` }} />
              <div className="spx-inout-out"   style={{ left:`${dur>0?(outPoint/dur)*100:0}%` }} />
              <input type="range" className="spx-inout-scrub" min="0" max="100"
                value={dur > 0 ? (curTime/dur)*100 : 0} onChange={scrub} />
            </div>
            <div className="spx-source-controls">
              <div style={{ display:'flex', gap:3 }}>
                <button className="spx-ctrl-btn" onClick={goIn} title="Go to In"><SkipBack size={12} /></button>
                <button className="spx-ctrl-btn" onClick={toggle} style={{ background: playing ? '#f85149' : '#00ffc8', color:'#000' }}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="spx-ctrl-btn" onClick={goOut} title="Go to Out"><SkipForward size={12} /></button>
              </div>
              <div className="spx-source-tc">{fmt(curTime)} / {fmt(dur)}</div>
              <div style={{ display:'flex', gap:3 }}>
                <button className="spx-ctrl-btn" onClick={markIn}  title="Mark In (I)"  style={{ fontWeight:700, fontSize:10 }}>I</button>
                <button className="spx-ctrl-btn" onClick={markOut} title="Mark Out (O)" style={{ fontWeight:700, fontSize:10 }}>O</button>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#4e6a82', marginTop:6 }}>
              <span>In: <span style={{ color:'#4a9eff' }}>{fmt(inPoint)}</span></span>
              <span>Dur: <span style={{ color:'#00ffc8' }}>{fmt(Math.max(0, outPoint-inPoint))}</span></span>
              <span>Out: <span style={{ color:'#f85149' }}>{fmt(outPoint)}</span></span>
            </div>
          </div>
        )}

        <div className="spx-source-insert-btns">
          {media?.type === 'video' && (
            <button className="spx-insert-btn" onClick={() => onAddToTimeline(media, inPoint, outPoint, 'video')}
              style={{ background:'#4a9eff', color:'#fff' }}>
              <Video size={12} style={{ marginRight:4 }} />Insert Video
            </button>
          )}
          {(media?.type === 'video' || media?.type === 'audio') && (
            <button className="spx-insert-btn" onClick={() => onAddToTimeline(media, inPoint, outPoint, 'audio')}
              style={{ background:'#ff6b6b', color:'#fff' }}>
              <AudioWaveform size={12} style={{ marginRight:4 }} />Insert Audio
            </button>
          )}
          {media?.type === 'video' && (
            <button className="spx-insert-btn" onClick={() => onAddToTimeline(media, inPoint, outPoint, 'both')}
              style={{ background:'linear-gradient(135deg,#00ffc8,#00b894)', color:'#000', fontWeight:700 }}>
              <Plus size={12} style={{ marginRight:4 }} />Insert Both
            </button>
          )}
          {media?.type === 'image' && (
            <button className="spx-insert-btn" onClick={() => onAddToTimeline(media, 0, 5, 'video')}
              style={{ background:'linear-gradient(135deg,#00ffc8,#00b894)', color:'#000', fontWeight:700 }}>
              <Image size={12} style={{ marginRight:4 }} />Add Image
            </button>
          )}
          {media?.type === 'audio' && (
            <button className="spx-insert-btn" onClick={() => onAddToTimeline(media, 0, dur || 30, 'audio')}
              style={{ background:'linear-gradient(135deg,#ff6b6b,#ee5a24)', color:'#fff', fontWeight:700 }}>
              <AudioWaveform size={12} style={{ marginRight:4 }} />Add Audio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DUAL MONITORS (Source + Program)
// ═══════════════════════════════════════════════════════════
// Broadcast safe zone overlay
function BroadcastSafeOverlay({ show, type = 'both' }) {
  if (!show) return null;
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10 }}>
      {/* Action safe — 90% */}
      {(type === 'both' || type === 'action') && (
        <div style={{
          position:'absolute',
          top:'5%', left:'5%', right:'5%', bottom:'5%',
          border:'1px solid rgba(255,165,0,0.6)',
          boxShadow:'inset 0 0 0 1px rgba(255,165,0,0.3)',
        }}>
          <span style={{position:'absolute',top:2,left:4,fontSize:8,color:'rgba(255,165,0,0.8)',
            fontFamily:'monospace',background:'rgba(0,0,0,0.5)',padding:'0 3px'}}>ACTION SAFE</span>
        </div>
      )}
      {/* Title safe — 80% */}
      {(type === 'both' || type === 'title') && (
        <div style={{
          position:'absolute',
          top:'10%', left:'10%', right:'10%', bottom:'10%',
          border:'1px solid rgba(0,255,200,0.6)',
          boxShadow:'inset 0 0 0 1px rgba(0,255,200,0.3)',
        }}>
          <span style={{position:'absolute',top:2,left:4,fontSize:8,color:'rgba(0,255,200,0.8)',
            fontFamily:'monospace',background:'rgba(0,0,0,0.5)',padding:'0 3px'}}>TITLE SAFE</span>
        </div>
      )}
      {/* Center crosshair */}
      <div style={{position:'absolute',top:'50%',left:0,right:0,height:'1px',
        background:'rgba(255,255,255,0.15)',transform:'translateY(-0.5px)'}}/>
      <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:'1px',
        background:'rgba(255,255,255,0.15)',transform:'translateX(-0.5px)'}}/>
    </div>
  );
}

export default function VideoEditorMonitors({
  tracks, currentTime, isPlaying, programMuted, setProgramMuted,
  sourceMedia, setSourceMedia, showSourceMon, setShowSourceMon,
  addClipToTrack, formatTime,
}) {
  const programVideoRef = useRef(null);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [safeZoneType, setSafeZoneType] = useState('both');

  // Find active clip at current playhead
  const activeClip = tracks
    .flatMap(tr => tr.clips.map(c => ({ ...c, trackMuted: tr.muted })))
    .find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration) || null;

  // Find active transition
  const activeTransition = tracks
    .flatMap(tr => (tr.transitions||[]).map(t => ({ ...t, clips: tr.clips })))
    .find(t => currentTime >= t.startTime && currentTime < t.startTime + t.duration) || null;

  // Sync program monitor video element
  useEffect(() => {
    const el = programVideoRef.current;
    if (!el || !activeClip || activeClip.type !== 'video') return;
    const clipOffset = currentTime - activeClip.startTime;
    if (Math.abs(el.currentTime - clipOffset) > 0.5) el.currentTime = clipOffset;
    if (isPlaying && el.paused)  el.play().catch(() => {});
    if (!isPlaying && !el.paused) el.pause();
  }, [isPlaying, currentTime, activeClip]);

  const handleAddToTimeline = useCallback((media, inPt, outPt, mode) => {
    const dur = Math.max(1, outPt - inPt);
    const videoTrack = tracks.find(t => t.type === 'video' && !t.locked);
    const audioTrack = tracks.find(t => t.type === 'audio' && !t.locked);
    const getEnd = (tr) => tr ? Math.max(0, ...tr.clips.map(c => c.startTime + c.duration)) : 0;

    if ((mode === 'video' || mode === 'both') && media.type !== 'audio' && videoTrack) {
      addClipToTrack(videoTrack.id, {
        id: Date.now(), title: media.name, type: 'video',
        startTime: getEnd(videoTrack), duration: dur,
        mediaUrl: media.url, r2_key: media.r2_key, cloudId: media.cloudId,
        thumbnail: media.thumbnail, inPoint: inPt, outPoint: outPt,
        effects: [], compositing: { opacity:100, blendMode:'normal', position:{x:0,y:0}, scale:{x:100,y:100}, rotation:0 }
      });
    }
    if ((mode === 'audio' || mode === 'both') && (media.type === 'video' || media.type === 'audio') && audioTrack) {
      addClipToTrack(audioTrack.id, {
        id: Date.now()+1, title: media.name + ' (audio)', type: 'audio',
        startTime: getEnd(audioTrack), duration: dur,
        mediaUrl: media.url, r2_key: media.r2_key, cloudId: media.cloudId,
        inPoint: inPt, outPoint: outPt, effects: [], compositing: { opacity:100 }
      });
    }
    setShowSourceMon(false);
  }, [tracks, addClipToTrack, setShowSourceMon]);

  // Program monitor content
  const renderProgram = () => {
    // Transition crossfade
    if (activeTransition) {
      const prog = (currentTime - activeTransition.startTime) / activeTransition.duration;
      const fromClip = activeTransition.clips.find(c => c.id === activeTransition.fromClip);
      const toClip   = activeTransition.clips.find(c => c.id === activeTransition.toClip);
      return (
        <div style={{ position:'relative', width:'100%', height:'100%', background:'#000' }}>
          {fromClip?.mediaUrl && fromClip.type === 'video' && (
            <video src={fromClip.mediaUrl} muted={programMuted}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', opacity: 1-prog }} />
          )}
          {toClip?.mediaUrl && toClip.type === 'video' && (
            <video src={toClip.mediaUrl} muted={programMuted}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', opacity: prog }} />
          )}
          <div style={{ position:'absolute', top:8, left:8, background:'rgba(248,81,73,.85)', padding:'3px 8px', borderRadius:4, fontSize:10, color:'#fff', fontWeight:700 }}>
            ⟳ {activeTransition.type} {Math.round(prog*100)}%
          </div>
        </div>
      );
    }

    if (!activeClip) {
      return (
        <div className="spx-monitor-placeholder">
          <Monitor size={40} />
          <p>Program Monitor</p>
          <p style={{ fontSize:10 }}>No clip at playhead</p>
        </div>
      );
    }

    const clipOffset = currentTime - activeClip.startTime;
    const progress   = activeClip.duration > 0 ? clipOffset / activeClip.duration : 0;
    const cssFilter  = buildFilter(activeClip.effects);
    const fade       = getFade(activeClip.effects, progress);

    return (
      <div style={{ position:'relative', width:'100%', height:'100%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {activeClip.type === 'video' && activeClip.mediaUrl && (
          <video key={activeClip.id} ref={programVideoRef}
            src={activeClip.previewUrl || activeClip.mediaUrl}
            muted={programMuted || activeClip.trackMuted}
            style={{ maxWidth:'100%', maxHeight:'100%', display:'block', filter: cssFilter }}
            onEnded={() => {}} />
        )}
        {activeClip.type === 'image' && activeClip.mediaUrl && (
          <img src={activeClip.previewUrl || activeClip.mediaUrl} alt={activeClip.title}
            style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', filter: cssFilter }} />
        )}
        {activeClip.type === 'audio' && (
          <div style={{ textAlign:'center', color:'#4e6a82' }}>
            <AudioWaveform size={48} style={{ marginBottom:8 }} />
            <p style={{ fontSize:11 }}>{activeClip.title}</p>
            {activeClip.mediaUrl && (
              <audio key={activeClip.id} src={activeClip.mediaUrl}
                autoPlay={isPlaying && !programMuted} muted={programMuted} />
            )}
          </div>
        )}
        {/* Fade overlay */}
        {fade && (
          <div className="spx-fade-overlay"
            style={{ backgroundColor: fade.color, opacity: fade.opacity }} />
        )}
        {/* Clip info */}
        <div className="spx-clip-info-overlay">
          <div className="spx-clip-info-name">
            {activeClip.title}
            {activeClip.cloudId && <span style={{ color:'#00ffc8', marginLeft:4 }}>☁</span>}
          </div>
          <div className="spx-clip-info-time">
            {formatTime(clipOffset)} / {formatTime(activeClip.duration)}
          </div>
          {activeClip.effects && activeClip.effects.length > 0 && (
            <div className="spx-clip-info-fx">
              FX: {activeClip.effects.filter(e=>e.enabled).map(e=>e.id).join(', ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="spx-monitors">
        {/* Source Monitor */}
        <div className="spx-monitor">
          <div className="spx-monitor-header">
            <span className="spx-monitor-label">Source Monitor</span>
            {sourceMedia && (
              <button className="spx-tbtn active" style={{ fontSize:10, padding:'2px 8px' }}
                onClick={() => setShowSourceMon(true)}>Open</button>
            )}
          </div>
          <div className="spx-monitor-screen">
            {sourceMedia ? (
              <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {sourceMedia.type === 'video' && (
                  <video src={sourceMedia.url} controls style={{ maxWidth:'100%', maxHeight:'100%' }} />
                )}
                {sourceMedia.type === 'audio' && (
                  <div style={{ textAlign:'center', color:'#4e6a82', padding:20 }}>
                    <AudioWaveform size={40} style={{ marginBottom:8 }} />
                    <p style={{ fontSize:11, marginBottom:8 }}>{sourceMedia.name}</p>
                    <audio src={sourceMedia.url} controls />
                  </div>
                )}
                {sourceMedia.type === 'image' && (
                  <img src={sourceMedia.url} alt={sourceMedia.name}
                    style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                )}
              </div>
            ) : (
              <div className="spx-monitor-placeholder">
                <Monitor size={32} />
                <p>Click media to preview</p>
              </div>
            )}
          </div>
          <div className="spx-monitor-footer">
            <span className="spx-monitor-timecode">{formatTime(currentTime)}</span>
            {sourceMedia && (
              <button className="spx-tbtn active" style={{ marginLeft:'auto', fontSize:10, padding:'2px 8px' }}
                onClick={() => setShowSourceMon(true)}>
                Edit In/Out
              </button>
            )}
          </div>
        </div>

        {/* Program Monitor */}
        <div className="spx-monitor">
          <div className="spx-monitor-header">
            <span className="spx-monitor-label" style={{ color:'#e6edf3' }}>Program Monitor</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button className={`spx-tbtn ${programMuted ? 'danger' : 'active'}`}
                style={{ fontSize:10, padding:'2px 8px' }}
                onClick={() => setProgramMuted(m => !m)}>
                {programMuted ? <><VolumeX size={11} /> Muted</> : <><Volume2 size={11} /> Sound</>}
              </button>
              <span className="spx-monitor-timecode">{formatTime(currentTime)}</span>
            </div>
          </div>
          <div className="spx-monitor-screen">
            {renderProgram()}
          </div>
          <div className="spx-monitor-footer">
            <span style={{ fontSize:10, color:'#4e6a82' }}>1920×1080 •</span>
            <span className="spx-monitor-timecode" style={{ marginLeft:4 }}>{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* Source Monitor Popup */}
      {showSourceMon && sourceMedia && (
        <SourceMonitorPopup
          media={sourceMedia}
          onClose={() => setShowSourceMon(false)}
          onAddToTimeline={handleAddToTimeline}
        />
      )}
    </>
  );
}
