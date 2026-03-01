// =============================================================================
// WaveformEditor.js — Phase 1: Waveform Editor View for Sampler
// =============================================================================
// Canvas-based audio waveform display with:
//   - Zoom / scroll (mouse wheel + drag)
//   - Draggable trim start/end markers
//   - Loop region highlighting
//   - ADSR envelope overlay
//   - Real-time playhead tracking
//   - Zero-crossing snap for marker placement
//   - Minimap for navigation
// =============================================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';

// ── Helpers ──
const findZeroCrossing = (data, sampleIdx, range = 512) => {
  const start = Math.max(0, sampleIdx - range);
  const end = Math.min(data.length - 1, sampleIdx + range);
  let closest = sampleIdx, minDist = range + 1;
  for (let i = start; i < end - 1; i++) {
    if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
      const dist = Math.abs(i - sampleIdx);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
  }
  return closest;
};

const formatTime = (sec) => {
  if (sec < 0) return '0ms';
  if (sec < 1) return `${(sec * 1000).toFixed(0)}ms`;
  if (sec < 60) return `${sec.toFixed(2)}s`;
  return `${Math.floor(sec / 60)}:${(sec % 60).toFixed(1).padStart(4, '0')}`;
};

const btnStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#8899aa',
  borderRadius: 4,
  padding: '2px 8px',
  cursor: 'pointer',
  fontSize: '0.65rem',
};

// =============================================================================
// COMPONENT
// =============================================================================

const WaveformEditor = ({
  pad, padIndex, onUpdatePad, audioContext, masterGain,
  isPlaying, activePads, onPlayPad, onStopPad,
}) => {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const previewSrcRef = useRef(null);
  const previewGainRef = useRef(null);
  const playStartTimeRef = useRef(0);
  const playOffsetRef = useRef(0);
  const dragStartRef = useRef({ x: 0, scrollX: 0 });

  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [dragging, setDragging] = useState(null);
  const [hoverX, setHoverX] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [playheadTime, setPlayheadTime] = useState(0);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [snapToZero, setSnapToZero] = useState(true);
  const [waveformCache, setWaveformCache] = useState(null);

  const buffer = pad?.buffer;
  const duration = buffer?.duration || 1;
  const sampleRate = buffer?.sampleRate || 44100;
  const trimStart = pad?.trimStart || 0;
  const trimEnd = pad?.trimEnd || duration;
  const attack = pad?.attack || 0;
  const decay = pad?.decay || 0;
  const sustain = pad?.sustain ?? 1;
  const release = pad?.release || 0;
  const isLoop = pad?.playMode === 'loop';

  const viewDur = duration / zoom;
  const viewStart = scrollX * Math.max(0, duration - viewDur);
  const viewEnd = viewStart + viewDur;

  // Build peak cache
  useEffect(() => {
    if (!buffer) { setWaveformCache(null); return; }
    const data = buffer.getChannelData(0);
    const targetPts = 4000;
    const step = Math.max(1, Math.floor(data.length / targetPts));
    const peaks = [];
    for (let i = 0; i < data.length; i += step) {
      let mn = 1, mx = -1;
      const end = Math.min(i + step, data.length);
      for (let j = i; j < end; j++) {
        if (data[j] < mn) mn = data[j];
        if (data[j] > mx) mx = data[j];
      }
      peaks.push({ min: mn, max: mx });
    }
    setWaveformCache(peaks);
  }, [buffer]);

  // Time ↔ Pixel
  const t2px = useCallback((t) => {
    const cv = canvasRef.current;
    if (!cv) return 0;
    return ((t - viewStart) / viewDur) * cv.width;
  }, [viewStart, viewDur]);

  const px2t = useCallback((px) => {
    const cv = canvasRef.current;
    if (!cv) return 0;
    return viewStart + (px / cv.width) * viewDur;
  }, [viewStart, viewDur]);

  const snapTime = useCallback((t) => {
    if (!snapToZero || !buffer) return Math.max(0, Math.min(duration, t));
    const data = buffer.getChannelData(0);
    const idx = Math.floor(t * sampleRate);
    return findZeroCrossing(data, idx) / sampleRate;
  }, [snapToZero, buffer, sampleRate, duration]);

  // ══════════════════════════════════════════
  // DRAW MAIN CANVAS
  // ══════════════════════════════════════════
  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !buffer || !waveformCache) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height, mid = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#060d17';
    ctx.fillRect(0, 0, w, h);

    // Grid
    const gi = viewDur < 0.5 ? 0.01 : viewDur < 2 ? 0.1 : viewDur < 10 ? 0.5 : viewDur < 30 ? 1 : 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gs = Math.ceil(viewStart / gi) * gi;
    for (let t = gs; t < viewEnd; t += gi) {
      const x = t2px(t);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatTime(t), x, h - 3);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    // Trim dimming
    const tsX = t2px(trimStart), teX = t2px(trimEnd);
    if (trimStart > viewStart) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, Math.max(0, tsX), h); }
    if (trimEnd < viewEnd) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(teX, 0, w - teX, h); }

    // Loop highlight
    if (isLoop) {
      ctx.fillStyle = 'rgba(0,255,200,0.04)';
      ctx.fillRect(t2px(trimStart), 0, t2px(trimEnd) - t2px(trimStart), h);
    }

    // Waveform peaks
    const totalPeaks = waveformCache.length;
    const sampPerPeak = buffer.length / totalPeaks;
    ctx.beginPath();
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1;
    for (let px = 0; px < w; px++) {
      const t0 = px2t(px), t1 = px2t(px + 1);
      const s0 = Math.floor(t0 * sampleRate / sampPerPeak);
      const s1 = Math.ceil(t1 * sampleRate / sampPerPeak);
      let mn = 1, mx = -1;
      for (let i = Math.max(0, s0); i < Math.min(totalPeaks, s1); i++) {
        if (waveformCache[i].min < mn) mn = waveformCache[i].min;
        if (waveformCache[i].max > mx) mx = waveformCache[i].max;
      }
      if (mn > mx) { mn = 0; mx = 0; }
      ctx.moveTo(px, mid - mx * mid * 0.9);
      ctx.lineTo(px, mid - mn * mid * 0.9);
    }
    ctx.stroke();

    // ADSR Envelope overlay
    if (showEnvelope && (attack > 0 || decay > 0 || sustain < 1 || release > 0)) {
      const envY = (level) => mid - level * mid * 0.85;
      const aEnd = trimStart + attack;
      const dEnd = aEnd + decay;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,200,0,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.moveTo(t2px(trimStart), envY(0));
      ctx.lineTo(t2px(Math.min(aEnd, duration)), envY(1));
      if (decay > 0) ctx.lineTo(t2px(Math.min(dEnd, duration)), envY(sustain));
      ctx.lineTo(t2px(Math.min(trimEnd, duration)), envY(sustain));
      if (release > 0) ctx.lineTo(t2px(Math.min(trimEnd + release, duration)), envY(0));
      ctx.stroke();
      ctx.setLineDash([]);
      // Fill
      ctx.fillStyle = 'rgba(255,200,0,0.04)';
      ctx.beginPath();
      ctx.moveTo(t2px(trimStart), envY(0));
      ctx.lineTo(t2px(Math.min(aEnd, duration)), envY(1));
      if (decay > 0) ctx.lineTo(t2px(Math.min(dEnd, duration)), envY(sustain));
      ctx.lineTo(t2px(Math.min(trimEnd, duration)), envY(sustain));
      if (release > 0) ctx.lineTo(t2px(Math.min(trimEnd + release, duration)), envY(0));
      else ctx.lineTo(t2px(Math.min(trimEnd, duration)), envY(0));
      ctx.lineTo(t2px(Math.min(trimEnd + release, duration)), mid);
      ctx.lineTo(t2px(trimStart), mid);
      ctx.closePath();
      ctx.fill();
    }

    // Markers
    const drawMarker = (time, color, label, side) => {
      const x = t2px(time);
      if (x < -10 || x > w + 10) return;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath();
      if (side === 'left') { ctx.moveTo(x, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x, 14); }
      else { ctx.moveTo(x, 0); ctx.lineTo(x - 10, 0); ctx.lineTo(x, 14); }
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
      ctx.textAlign = side === 'left' ? 'left' : 'right';
      ctx.fillText(label, side === 'left' ? x + 3 : x - 3, 24);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '8px monospace';
      ctx.fillText(formatTime(time), side === 'left' ? x + 3 : x - 3, 34);
    };
    drawMarker(trimStart, '#4a9eff', 'S', 'left');
    drawMarker(trimEnd, '#ff4444', 'E', 'right');
    if (isLoop) {
      ctx.fillStyle = '#00ffc8'; ctx.font = 'bold 9px monospace';
      const lsX = t2px(trimStart), leX = t2px(trimEnd);
      ctx.textAlign = 'left';
      if (lsX > -10 && lsX < w + 10) ctx.fillText('↻L', lsX + 3, h - 14);
      ctx.textAlign = 'right';
      if (leX > -10 && leX < w + 10) ctx.fillText('L↺', leX - 3, h - 14);
    }

    // Playhead
    if (isPreviewPlaying || (activePads && activePads.has(padIndex))) {
      const px = t2px(playheadTime);
      if (px >= 0 && px <= w) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.moveTo(px - 5, 0); ctx.lineTo(px + 5, 0); ctx.lineTo(px, 8); ctx.fill();
      }
    }

    // Hover
    if (hoverX !== null && !dragging) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(hoverX, 0); ctx.lineTo(hoverX, h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(formatTime(px2t(hoverX)), hoverX, 50);
    }
  }, [buffer, waveformCache, viewStart, viewEnd, viewDur, t2px, px2t,
    trimStart, trimEnd, attack, decay, sustain, release, isLoop,
    showEnvelope, hoverX, dragging, isPreviewPlaying, playheadTime,
    activePads, padIndex, sampleRate, duration]);

  // ══════════════════════════════════════════
  // DRAW MINIMAP
  // ══════════════════════════════════════════
  const drawMinimap = useCallback(() => {
    const cv = minimapRef.current;
    if (!cv || !buffer || !waveformCache) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height, mid = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, w, h);
    const totalPeaks = waveformCache.length;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0,255,200,0.4)';
    ctx.lineWidth = 1;
    for (let px = 0; px < w; px++) {
      const i = Math.floor((px / w) * totalPeaks);
      if (i >= totalPeaks) break;
      ctx.moveTo(px, mid - waveformCache[i].max * mid * 0.8);
      ctx.lineTo(px, mid - waveformCache[i].min * mid * 0.8);
    }
    ctx.stroke();
    const tsX = (trimStart / duration) * w, teX = (trimEnd / duration) * w;
    if (trimStart > 0) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, tsX, h); }
    if (trimEnd < duration) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(teX, 0, w - teX, h); }
    const vpLeft = (viewStart / duration) * w;
    const vpWidth = (viewDur / duration) * w;
    ctx.strokeStyle = '#4a9eff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(vpLeft, 0, vpWidth, h);
    ctx.fillStyle = 'rgba(74,158,255,0.08)';
    ctx.fillRect(vpLeft, 0, vpWidth, h);
    if (isPreviewPlaying || (activePads && activePads.has(padIndex))) {
      const phX = (playheadTime / duration) * w;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, h); ctx.stroke();
    }
  }, [buffer, waveformCache, duration, trimStart, trimEnd, viewStart, viewDur,
    isPreviewPlaying, playheadTime, activePads, padIndex]);

  useEffect(() => { draw(); drawMinimap(); }, [draw, drawMinimap]);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const cv = canvasRef.current, mm = minimapRef.current;
      if (cv) { cv.width = container.clientWidth; cv.height = 220; }
      if (mm) { mm.width = container.clientWidth; mm.height = 40; }
      draw(); drawMinimap();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw, drawMinimap]);

  // ══════════════════════════════════════════
  // MOUSE HANDLERS
  // ══════════════════════════════════════════
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseTime = px2t(mouseX);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(1, Math.min(200, zoom * factor));
    const newViewDur = duration / newZoom;
    const newViewStart = mouseTime - (mouseX / cv.width) * newViewDur;
    const maxScroll = Math.max(0, duration - newViewDur);
    setZoom(newZoom);
    setScrollX(maxScroll > 0 ? Math.max(0, Math.min(1, newViewStart / maxScroll)) : 0);
  }, [zoom, duration, px2t]);

  const getMarkerAt = useCallback((px) => {
    const threshold = 10;
    if (Math.abs(px - t2px(trimStart)) < threshold) return 'trimStart';
    if (Math.abs(px - t2px(trimEnd)) < threshold) return 'trimEnd';
    return null;
  }, [t2px, trimStart, trimEnd]);

  const handleMouseDown = useCallback((e) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const marker = getMarkerAt(mx);
    if (marker) { e.preventDefault(); setDragging(marker); return; }
    if (e.button === 1 || e.altKey) {
      e.preventDefault(); setDragging('pan');
      dragStartRef.current = { x: e.clientX, scrollX }; return;
    }
    if (e.button === 0) setPlayheadTime(px2t(mx));
  }, [getMarkerAt, scrollX, px2t]);

  const handleMouseMove = useCallback((e) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    setHoverX(mx);
    if (!dragging) { cv.style.cursor = getMarkerAt(mx) ? 'ew-resize' : 'crosshair'; return; }
    if (dragging === 'pan') {
      const dx = e.clientX - dragStartRef.current.x;
      const pxPerSec = cv.width / viewDur;
      const timeDelta = dx / pxPerSec;
      const maxScroll = Math.max(0, duration - viewDur);
      if (maxScroll > 0) {
        const newStart = Math.max(0, Math.min(maxScroll, dragStartRef.current.scrollX * maxScroll - timeDelta));
        setScrollX(newStart / maxScroll);
      }
      return;
    }
    let time = snapTime(px2t(mx));
    time = Math.max(0, Math.min(duration, time));
    if (dragging === 'trimStart') onUpdatePad(padIndex, { trimStart: Math.min(time, trimEnd - 0.001) });
    else if (dragging === 'trimEnd') onUpdatePad(padIndex, { trimEnd: Math.max(time, trimStart + 0.001) });
  }, [dragging, getMarkerAt, px2t, snapTime, duration, viewDur, trimStart, trimEnd, padIndex, onUpdatePad]);

  const handleMouseUp = useCallback(() => setDragging(null), []);
  const handleMouseLeave = useCallback(() => { setHoverX(null); if (dragging) setDragging(null); }, [dragging]);

  const handleDoubleClick = useCallback((e) => {
    const cv = canvasRef.current;
    if (!cv || !buffer || !audioContext) return;
    const rect = cv.getBoundingClientRect();
    startPreview(px2t(e.clientX - rect.left));
  }, [px2t, buffer, audioContext]);

  const handleMinimapClick = useCallback((e) => {
    const cv = minimapRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const clickTime = ((e.clientX - rect.left) / cv.width) * duration;
    const maxScroll = Math.max(0, duration - viewDur);
    if (maxScroll > 0) setScrollX(Math.max(0, Math.min(1, (clickTime - viewDur / 2) / maxScroll)));
  }, [duration, viewDur]);

  // ══════════════════════════════════════════
  // PREVIEW PLAYBACK
  // ══════════════════════════════════════════
  const stopPreview = useCallback(() => {
    if (previewSrcRef.current) { try { previewSrcRef.current.stop(); } catch (e) { } previewSrcRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setIsPreviewPlaying(false);
  }, []);

  const startPreview = useCallback((fromTime) => {
    if (!buffer || !audioContext) return;
    stopPreview();
    const ctx = audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    gain.gain.value = pad?.volume || 0.8;
    src.connect(gain);
    gain.connect(masterGain || ctx.destination);
    const offset = Math.max(0, fromTime || trimStart);
    const dur = trimEnd - offset;
    src.start(0, offset, dur + (release || 0));
    previewSrcRef.current = src;
    previewGainRef.current = gain;
    playStartTimeRef.current = ctx.currentTime;
    playOffsetRef.current = offset;
    setIsPreviewPlaying(true);
    const animate = () => {
      if (!previewSrcRef.current) return;
      const elapsed = ctx.currentTime - playStartTimeRef.current;
      const currentTime = playOffsetRef.current + elapsed;
      setPlayheadTime(currentTime);
      if (currentTime < trimEnd + release) animFrameRef.current = requestAnimationFrame(animate);
      else stopPreview();
    };
    animFrameRef.current = requestAnimationFrame(animate);
    src.onended = () => stopPreview();
  }, [buffer, audioContext, masterGain, pad, trimStart, trimEnd, release, stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);
  // ── Track playhead during external pad playback ──
  useEffect(() => {
    if (isPreviewPlaying) return;
    const isActive = activePads && activePads.has(padIndex);
    if (!isActive || !audioContext) {
      setPlayheadTime(trimStart);
      return;
    }

    let raf;
    const startWall = audioContext.currentTime;
    const animate = () => {
      const elapsed = audioContext.currentTime - startWall;
      const t = trimStart + elapsed;
      if (t >= trimEnd) {
        setPlayheadTime(trimStart);
        return;
      }
      setPlayheadTime(t);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [activePads, padIndex, audioContext, isPreviewPlaying, trimStart, trimEnd]);

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  if (!buffer) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 300, background: '#060d17', borderRadius: 8,
        color: '#3a5570', fontSize: '0.85rem', fontStyle: 'italic',
      }}>
        Select a pad with audio loaded to view waveform
      </div>
    );
  }

  return (
    <div className="waveform-editor" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px',
        background: '#0c1a2a', borderRadius: '6px 6px 0 0', fontSize: '0.7rem', color: '#8899aa',
        flexWrap: 'wrap',
      }}>
        <span style={{ color: '#00ffc8', fontWeight: 700 }}>〰 Waveform</span>
        <span style={{ color: '#556677' }}>|</span>
        <span>Zoom: {zoom.toFixed(1)}x</span>
        <button onClick={() => { setZoom(1); setScrollX(0); }} style={btnStyle}>Fit</button>
        <button onClick={() => setZoom(z => Math.min(200, z * 1.5))} style={btnStyle}>+</button>
        <button onClick={() => setZoom(z => Math.max(1, z / 1.5))} style={btnStyle}>−</button>
        <span style={{ color: '#556677' }}>|</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <input type="checkbox" checked={showEnvelope} onChange={(e) => setShowEnvelope(e.target.checked)} /> ADSR
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <input type="checkbox" checked={snapToZero} onChange={(e) => setSnapToZero(e.target.checked)} /> Zero-X
        </label>
        <span style={{ color: '#556677' }}>|</span>
        <button onClick={() => startPreview(trimStart)} style={btnStyle}>▶ Preview</button>
        <button onClick={stopPreview} disabled={!isPreviewPlaying} style={btnStyle}>⏹</button>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#5a7088' }}>
          {formatTime(trimStart)} → {formatTime(trimEnd)} ({formatTime(trimEnd - trimStart)}){isLoop && ' 🔁'}
        </span>
        <span style={{ color: '#3a5570' }}>
          {buffer.numberOfChannels}ch · {sampleRate}Hz · {formatTime(duration)}
        </span>
      </div>
      <canvas ref={canvasRef} width={800} height={220}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onDoubleClick={handleDoubleClick}
        style={{ width: '100%', height: 220, border: '1px solid #1a2a3a', cursor: 'crosshair' }} />
      <canvas ref={minimapRef} width={800} height={40}
        onClick={handleMinimapClick}
        style={{
          width: '100%', height: 40, borderRadius: '0 0 6px 6px',
          border: '1px solid #1a2a3a', borderTop: 'none', cursor: 'pointer'
        }} />
      <div style={{ display: 'flex', gap: 12, fontSize: '0.65rem', color: '#5a7088', padding: '2px 8px' }}>
        <span>Scroll: mousewheel zoom · Alt+drag pan · Drag markers to trim · Double-click to preview</span>
      </div>
    </div>
  );
};

export default WaveformEditor;