/**
 * SPXCutMonitors.js
 * Source monitor — always-visible transport, I/O marking, scrub bar.
 * Program monitor — transport row, safe frame, markers jump.
 * Monitor height resizable.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTimecode } from './hooks/usePlayback';

// ── Source Monitor ────────────────────────────────────────────
function SourceMonitor({ state, actions, selectors }) {
  const videoRef    = useRef(null);
  const inOutRef    = useRef(null);
  const [sourceFile, setSourceFile]     = useState(null);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [sourceTime, setSourceTime]     = useState(0);
  const [sourcePlaying, setSourcePlaying] = useState(false);
  const [srcIn,  setSrcIn]  = useState(null);
  const [srcOut, setSrcOut] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { file, src, duration } = e.detail;
      setSourceFile({ file, src, duration });
      setSourceDuration(duration || 0);
      setSrcIn(null); setSrcOut(null); setSourceTime(0);
    };
    window.addEventListener('spxcut:opensource', handler);
    return () => window.removeEventListener('spxcut:opensource', handler);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !sourceFile) return;
    v.src = sourceFile.src;
    v.onloadedmetadata = () => setSourceDuration(v.duration);
    v.ontimeupdate = () => setSourceTime(v.currentTime);
    v.onended = () => setSourcePlaying(false);
  }, [sourceFile]);

  const play  = useCallback(() => { videoRef.current?.play();  setSourcePlaying(true);  }, []);
  const pause = useCallback(() => { videoRef.current?.pause(); setSourcePlaying(false); }, []);
  const togglePlay = useCallback(() => sourcePlaying ? pause() : play(), [sourcePlaying, play, pause]);
  const stepBack   = useCallback(() => { if (videoRef.current) { videoRef.current.currentTime = Math.max(0, sourceTime - 1/30); } }, [sourceTime]);
  const stepFwd    = useCallback(() => { if (videoRef.current) { videoRef.current.currentTime = Math.min(sourceDuration, sourceTime + 1/30); } }, [sourceTime, sourceDuration]);
  const gotoStart  = useCallback(() => { if (videoRef.current) { videoRef.current.currentTime = srcIn || 0; setSourceTime(srcIn || 0); } }, [srcIn]);
  const gotoEnd    = useCallback(() => { if (videoRef.current) { videoRef.current.currentTime = srcOut || sourceDuration; } }, [srcOut, sourceDuration]);

  const setInPoint  = useCallback(() => setSrcIn(sourceTime),  [sourceTime]);
  const setOutPoint = useCallback(() => setSrcOut(sourceTime), [sourceTime]);
  const clearInOut  = useCallback(() => { setSrcIn(null); setSrcOut(null); }, []);

  const insertIntoTimeline = useCallback((mode) => {
    if (!sourceFile) return;
    actions.insertMedia({ file: sourceFile.file, mediaDuration: sourceDuration, mode, inPoint: srcIn || 0, outPoint: srcOut || sourceDuration });
  }, [sourceFile, sourceDuration, srcIn, srcOut, actions]);

  const onInOutBarClick = useCallback((e) => {
    if (!inOutRef.current || sourceDuration === 0) return;
    const rect = inOutRef.current.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * sourceDuration;
    if (videoRef.current) { videoRef.current.currentTime = t; setSourceTime(t); }
  }, [sourceDuration]);

  const inPct  = srcIn  !== null ? (srcIn  / Math.max(sourceDuration, 0.001)) * 100 : 0;
  const outPct = srcOut !== null ? (srcOut / Math.max(sourceDuration, 0.001)) * 100 : 100;

  return (
    <div className="spxcut-monitor">
      <div className="spxcut-monitor-header">
        <span className="spxcut-monitor-label">Source Monitor</span>
        <div className="spxcut-monitor-header-btns">
          <button className="spxcut-monitor-hbtn" onClick={() => document.getElementById('spxcut-source-input')?.click()} title="Open Media">📂</button>
          <input id="spxcut-source-input" type="file" accept="video/*,audio/*" className="spxcut-visually-hidden"
            onChange={e => { const f = e.target.files[0]; if (!f) return; setSourceFile({ file: f, src: URL.createObjectURL(f) }); e.target.value = ''; }} />
        </div>
      </div>

      <div className="spxcut-monitor-screen">
        {sourceFile ? (
          <video ref={videoRef} className="spxcut-monitor-video" onClick={togglePlay} />
        ) : (
          <div className="spxcut-monitor-empty">
            <span className="spxcut-monitor-empty-icon">🎬</span>
            <span className="spxcut-monitor-empty-text">Double-click clip or open media</span>
          </div>
        )}
      </div>

      {/* I/O scrub bar — always visible */}
      <div className="spxcut-monitor-inout-bar" ref={inOutRef} onClick={onInOutBarClick}>
        {sourceDuration > 0 && (
          <div className="spxcut-inout-region" style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }} />
        )}
      </div>

      {/* Transport — always visible */}
      <div className="spxcut-monitor-transport">
        <button className="spxcut-monitor-tbtn" onClick={gotoStart} title="Go to In">⏮</button>
        <button className="spxcut-monitor-tbtn" onClick={stepBack}  title="Step Back">◀</button>
        <button className="spxcut-monitor-tbtn mtbtn-play" onClick={togglePlay} title="Play/Pause">
          {sourcePlaying ? '⏸' : '▶'}
        </button>
        <button className="spxcut-monitor-tbtn" onClick={stepFwd}   title="Step Forward">▶</button>
        <button className="spxcut-monitor-tbtn" onClick={gotoEnd}   title="Go to Out">⏭</button>
        <span style={{ width: 8 }} />
        <button className="spxcut-monitor-hbtn" onClick={setInPoint}  title="Mark In (I)">I</button>
        <span style={{ fontSize: 10, color: 'var(--teal)', minWidth: 72, textAlign: 'center' }}>
          {srcIn !== null ? formatTimecode(srcIn) : '--:--:--:--'}
        </span>
        <button className="spxcut-monitor-hbtn" onClick={setOutPoint} title="Mark Out (O)">O</button>
        <span style={{ fontSize: 10, color: 'var(--orange)', minWidth: 72, textAlign: 'center' }}>
          {srcOut !== null ? formatTimecode(srcOut) : '--:--:--:--'}
        </span>
        {(srcIn !== null || srcOut !== null) && (
          <button className="spxcut-monitor-hbtn" onClick={clearInOut} title="Clear In/Out (X)">✕</button>
        )}
      </div>

      {/* Timecode */}
      <div className="spxcut-monitor-tc-row">
        <span className="spxcut-monitor-tc">{formatTimecode(sourceTime)}</span>
        <span style={{ opacity: 0.4, padding: '0 4px' }}>/</span>
        <span className="spxcut-monitor-tc">{formatTimecode(sourceDuration)}</span>
      </div>

      {/* Insert buttons */}
      <div className="spxcut-monitor-footer">
        <button className="spxcut-insert-btn" onClick={() => insertIntoTimeline('video')} disabled={!sourceFile}>Insert Video</button>
        <button className="spxcut-insert-btn" onClick={() => insertIntoTimeline('audio')} disabled={!sourceFile}>Insert Audio</button>
        <button className="spxcut-insert-btn ins-both" onClick={() => insertIntoTimeline('both')} disabled={!sourceFile}>Insert Both</button>
      </div>
    </div>
  );
}

// ── Program Monitor ───────────────────────────────────────────
function ProgramMonitor({ state, actions, selectors, playback }) {
  const canvasRef  = useRef(null);
  const [showSafe, setShowSafe] = useState(false);
  const [fitMode,  setFitMode]  = useState('fit');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth  || 1;
    const H = canvas.height = canvas.offsetHeight || 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const ph = state.playhead;
    let drew = false;
    state.tracks.forEach(track => {
      if (track.muted || track.type !== 'video') return;
      track.clips.forEach(clip => {
        if (ph >= clip.startTime && ph < clip.startTime + clip.duration) {
          const el = document.getElementById(`spxcut-video-${clip.id}`);
          if (el && el.readyState >= 2) {
            const t = clip.transform;
            ctx.save();
            ctx.translate(W/2 + t.x, H/2 + t.y);
            ctx.rotate((t.rotation * Math.PI) / 180);
            ctx.scale(t.scaleX, t.scaleY);
            ctx.globalAlpha = t.opacity;
            ctx.globalCompositeOperation = t.blendMode || 'source-over';
            const aspect = el.videoWidth / el.videoHeight || 16/9;
            const dw = fitMode === '1:1' ? el.videoWidth  : W;
            const dh = fitMode === '1:1' ? el.videoHeight : (fitMode === 'fill' ? W/aspect : H);
            ctx.drawImage(el, -dw/2, -dh/2, dw, dh);
            ctx.restore();
            drew = true;
          }
        }
      });
    });
    if (!drew) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }
  }, [state.playhead, state.tracks, fitMode]);

  // Add marker at playhead
  const addMarker = useCallback(() => {
    const label = window.prompt('Marker name (optional):', `M${(state.markers||[]).length+1}`) ?? '';
    window.dispatchEvent(new CustomEvent('spxcut:addmarker', { detail: { time: state.playhead, label } }));
  }, [state.playhead, state.markers]);

  return (
    <div className="spxcut-monitor">
      <div className="spxcut-monitor-header">
        <span className="spxcut-monitor-label lbl-program">Program Monitor</span>
        <div className="spxcut-monitor-header-btns">
          <button className={`spxcut-monitor-hbtn${showSafe ? ' mhbtn-active' : ''}`} onClick={() => setShowSafe(!showSafe)} title="Safe Frame">⊞</button>
          <button className="spxcut-monitor-hbtn" onClick={addMarker} title="Add Marker (M)">🚩</button>
          <button className={`spxcut-monitor-hbtn${fitMode==='fit'  ? ' mhbtn-active':''}`} onClick={() => setFitMode('fit')} >Fit</button>
          <button className={`spxcut-monitor-hbtn${fitMode==='fill' ? ' mhbtn-active':''}`} onClick={() => setFitMode('fill')}>Fill</button>
          <button className={`spxcut-monitor-hbtn${fitMode==='1:1'  ? ' mhbtn-active':''}`} onClick={() => setFitMode('1:1')} >1:1</button>
        </div>
      </div>

      <div className="spxcut-monitor-screen">
        <canvas className="spxcut-monitor-canvas" ref={canvasRef} />
        {showSafe && (
          <div className="spxcut-monitor-safe-frame">
            <div className="spxcut-safe-outer" />
            <div className="spxcut-safe-inner" />
          </div>
        )}
        {state.tracks.flatMap(track =>
          track.clips.filter(c => c.mediaType === 'video' && c.src).map(c => (
            <video key={c.id} id={`spxcut-video-${c.id}`} src={c.src}
              className="spxcut-visually-hidden" preload="auto"
              ref={el => playback.registerVideoRef(c.id, el)} muted={track.muted} />
          ))
        )}
      </div>

      {/* Program transport — always visible */}
      <div className="spxcut-monitor-transport">
        <button className="spxcut-monitor-tbtn" onClick={actions.gotoStart} title="Go to Start">⏮</button>
        <button className="spxcut-monitor-tbtn" onClick={() => actions.stepFrame('back')} title="Step Back">◀</button>
        <button className="spxcut-monitor-tbtn mtbtn-play" onClick={playback.togglePlay} title="Play/Pause">
          {state.isPlaying ? '⏸' : '▶'}
        </button>
        <button className="spxcut-monitor-tbtn" onClick={() => actions.stepFrame('forward')} title="Step Forward">▶</button>
        <button className="spxcut-monitor-tbtn" onClick={actions.gotoEnd} title="Go to End">⏭</button>
        <span style={{ width: 8 }} />
        <button className="spxcut-monitor-hbtn" onClick={() => actions.setInPoint(state.playhead)}  title="Mark In (I)">I</button>
        <span style={{ fontSize: 10, color: 'var(--teal)', minWidth: 72, textAlign: 'center' }}>
          {state.inPoint !== null ? formatTimecode(state.inPoint) : '--:--:--:--'}
        </span>
        <button className="spxcut-monitor-hbtn" onClick={() => actions.setOutPoint(state.playhead)} title="Mark Out (O)">O</button>
        <span style={{ fontSize: 10, color: 'var(--orange)', minWidth: 72, textAlign: 'center' }}>
          {state.outPoint !== null ? formatTimecode(state.outPoint) : '--:--:--:--'}
        </span>
        {(state.inPoint !== null || state.outPoint !== null) && (
          <button className="spxcut-monitor-hbtn" onClick={actions.clearInOut} title="Clear In/Out (X)">✕</button>
        )}
      </div>

      {/* Timecode */}
      <div className="spxcut-monitor-tc-row">
        <span className="spxcut-monitor-tc">{playback.timecode}</span>
        <span style={{ opacity: 0.4, padding: '0 4px' }}>/</span>
        <span className="spxcut-monitor-tc">{playback.durationTimecode}</span>
      </div>
    </div>
  );
}

// ── Monitors Container with resize handle ─────────────────────
function SPXCutMonitors({ state, actions, selectors, playback }) {
  const containerRef = useRef(null);
  const resizeRef    = useRef(null);

  useEffect(() => {
    const rz = resizeRef.current;
    if (!rz) return;
    let startY, startH;
    const onDown = (e) => {
      startY = e.clientY;
      startH = containerRef.current?.offsetHeight || 300;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'row-resize';
    };
    const onMove = (e) => {
      if (!containerRef.current) return;
      const h = Math.max(120, Math.min(600, startH + (e.clientY - startY)));
      containerRef.current.style.height = `${h}px`;
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
    rz.addEventListener('mousedown', onDown);
    return () => rz.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <>
      <div className="spxcut-monitors" ref={containerRef}>
        <SourceMonitor  state={state} actions={actions} selectors={selectors} />
        <ProgramMonitor state={state} actions={actions} selectors={selectors} playback={playback} />
      </div>

    </>
  );
}

export default SPXCutMonitors;
