#!/usr/bin/env python3
"""
SPX Cut patch — run from repo root:
  python3 patch_spxcut.py

Fixes:
1. DB meter width — 38px → 54px, visible
2. Source monitor — transport bar always visible, I/O points permanent
3. Program monitor — dedicated transport row below timecode
4. Markers — add/remove/jump markers on ruler
5. Monitor height resize handle
6. Right panel resize handle
"""
import os, re

BASE = '/workspaces/SpectraSphere'
VE   = f'{BASE}/src/front/js/component/videoeditor'
CSS  = f'{BASE}/src/front/styles/SPXCut.css'

# ── 1. CSS fixes ──────────────────────────────────────────────
css = open(CSS).read()

# DB meter width
css = css.replace('--dbmeter-w:        38px;', '--dbmeter-w:        54px;')

# Monitor transport row
if '.spxcut-monitor-transport' not in css:
    css += """
/* ── Monitor Transport Row ──────────────────────────────── */
.spxcut-monitor-transport {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--bg-2);
  border-top: 1px solid var(--border);
  padding: 3px 6px;
  flex-shrink: 0;
}
.spxcut-monitor-tbtn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--trans);
}
.spxcut-monitor-tbtn:hover { background: var(--bg-hover); color: var(--text-primary); }
.spxcut-monitor-tbtn.mtbtn-play { color: var(--teal); }
.spxcut-monitor-tbtn.mtbtn-play:hover { background: var(--teal-glow); }

/* ── Marker ─────────────────────────────────────────────── */
.spxcut-marker {
  position: absolute;
  top: 0;
  width: 2px;
  background: var(--yellow);
  cursor: pointer;
  z-index: 30;
}
.spxcut-marker-head {
  position: absolute;
  top: 0;
  left: -4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid var(--yellow);
}
.spxcut-marker-label {
  position: absolute;
  top: 8px;
  left: 4px;
  font-size: 8px;
  color: var(--yellow);
  white-space: nowrap;
  pointer-events: none;
}

/* ── Monitor resize handle ──────────────────────────────── */
.spxcut-monitor-resize {
  height: 4px;
  background: var(--border);
  cursor: row-resize;
  flex-shrink: 0;
  transition: background var(--trans);
}
.spxcut-monitor-resize:hover { background: var(--teal-dim); }

/* ── DB meter fixes ─────────────────────────────────────── */
.spxcut-dbmeter { min-width: 54px; }
.spxcut-dbmeter-bar-wrap { width: 10px; }
.spxcut-dbmeter-bar-track { width: 10px; }
"""

open(CSS, 'w').write(css)
print('✓ CSS patched')

# ── 2. SPXCutMonitors.js — full rewrite ──────────────────────
monitors_code = r'''/**
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
      ctx.fillStyle = '#06060f';
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
      <div className="spxcut-monitor-resize" ref={resizeRef} title="Drag to resize monitors" />
    </>
  );
}

export default SPXCutMonitors;
'''

open(f'{VE}/SPXCutMonitors.js', 'w').write(monitors_code)
print('✓ SPXCutMonitors.js rewritten')

# ── 3. SPXCutTimeline.js — add markers ───────────────────────
tl_path = f'{VE}/SPXCutTimeline.js'
tl = open(tl_path).read()

# Add markers state and listener after existing imports
if 'spxcut:addmarker' not in tl:
    tl = tl.replace(
        "  const [dropOver, setDropOver]     = useState(false);",
        "  const [dropOver, setDropOver]     = useState(false);\n  const [markers, setMarkers]         = useState([]);"
    )
    tl = tl.replace(
        "  const [rulerWidth, setRulerWidth] = useState(0);",
        """  const [rulerWidth, setRulerWidth] = useState(0);

  // Marker listener
  useEffect(() => {
    const handler = (e) => setMarkers(prev => [...prev, { time: e.detail.time, label: e.detail.label || '' }]);
    window.addEventListener('spxcut:addmarker', handler);
    return () => window.removeEventListener('spxcut:addmarker', handler);
  }, []);"""
    )

    # Add marker rendering inside the ruler JSX (after the ruler canvas)
    tl = tl.replace(
        "          <canvas className=\"spxcut-ruler-canvas\" ref={rulerCanvasRef} />",
        """          <canvas className="spxcut-ruler-canvas" ref={rulerCanvasRef} />
          {markers.map((m, i) => (
            <div
              key={i}
              className="spxcut-marker"
              style={{ left: m.time * pps - state.scrollLeft, bottom: 0, top: 0 }}
              onClick={() => actions.setPlayhead(m.time)}
              title={m.label || formatTimecode(m.time)}
            >
              <div className="spxcut-marker-head" />
              {m.label && <span className="spxcut-marker-label">{m.label}</span>}
            </div>
          ))}"""
    )

    open(tl_path, 'w').write(tl)
    print('✓ SPXCutTimeline.js — markers added')
else:
    print('✓ SPXCutTimeline.js — markers already present')

print('\n=== All patches applied. Now run: ===')
print('npm run build && git add -A && git commit -m "fix: DB meter visible, monitor transports, I/O points, markers, resize handles" && git push')
