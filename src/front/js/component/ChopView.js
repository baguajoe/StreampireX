// =============================================================================
// ChopView.js — Enhanced Sample Chop Overlay Component
// =============================================================================
//
// FEATURES:
//   ✂️ 4 chop modes: Transient, BPM Grid, Equal, Manual
//   🎯 Click to preview slices, click (manual) to add points
//   ↩️ Undo / Redo chop point history
//   🗑️ Clear all chop points
//   🔄 Reverse slices before assigning
//   📊 Normalize slices before assigning
//   🔊 Audition All — play slices sequentially
//   ⏹ Stop preview
//   ⬅➡ Drag chop point handles to reposition
//   ½× / 2× Quick slice count buttons
//   🎚 Fade edges toggle (anti-click crossfade on assigned slices)
//   🎵 BPM subdivision selector (1/4, 1/8, 1/16, 1/32)
//   📤 Assign all or individual slices to pads
//   🔀 Shuffle slice order on pads
//
// USAGE in SamplerBeatMaker.js:
//   import ChopView from './ChopView';
//   {showChop && chopIdx !== null && (
//     <ChopView engine={{
//       pads, chopIdx, chopPts, setChopPts, chopMode, setChopMode,
//       chopSens, setChopSens, chopSlices, setChopSlices,
//       zeroCrossSnap, setZeroCrossSnap, activeSlice, setActiveSlice,
//       bpm, masterVol, initCtx, masterRef, activeSrc,
//       updatePad, setShowChop, showChop,
//     }} />
//   )}
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  generateChopPoints,
  drawChopWaveform,
  getSliceRange,
  extractSlice,
  assignSlicesToPads,
  getSliceAtPosition,
  addManualChopPoint,
  removeChopPoint,
  snapToZeroCrossing,
} from './ChopEngine';

// Fallback CHOP_MODES if useSamplerEngine doesn't export it
let CHOP_MODES = ['transient', 'bpmgrid', 'equal', 'manual'];
try {
  const mod = require('./useSamplerEngine');
  if (mod.CHOP_MODES) CHOP_MODES = mod.CHOP_MODES;
} catch (e) { /* use fallback */ }

// ── Inline style helpers (LARGE / HIGH CONTRAST) ──
const S = {
  btn: (active, color = '#00ffc8') => ({
    background: active ? `rgba(${color === '#ff6600' ? '255,102,0' : color === '#ffaa00' ? '255,170,0' : '0,255,200'},0.2)` : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? color : '#2a3d50'}`,
    color: active ? color : '#aabbcc',
    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 700 : 500, transition: 'all 0.15s',
    lineHeight: '20px', whiteSpace: 'nowrap',
  }),
  btnSmall: (disabled) => ({
    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
    border: '1px solid #2a3d50',
    color: disabled ? '#445566' : '#aabbcc',
    padding: '5px 10px', borderRadius: 5, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, lineHeight: '18px',
  }),
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#aabbcc', fontWeight: 500 },
  select: {
    background: '#0e1218', color: '#eef4ff', border: '1px solid #3a4d60',
    borderRadius: 5, padding: '5px 8px', fontSize: 13,
  },
  numInput: {
    width: 52, background: '#0e1218', color: '#eef4ff', border: '1px solid #3a4d60',
    borderRadius: 5, padding: '5px 6px', fontSize: 14, textAlign: 'center', fontWeight: 600,
  },
  divider: { width: 1, height: 24, background: '#2a3d50', flexShrink: 0 },
};

const ChopView = ({ engine }) => {
  const pi = engine.chopIdx;
  const pad = engine.pads[pi];
  const buffer = pad?.buffer;

  const canvasRef = useRef(null);
  const [hoveredSlice, setHoveredSlice] = useState(-1);
  const [status, setStatus] = useState('');

  // ── New feature state ──
  const [fadeEdges, setFadeEdges] = useState(true);
  const [subdivision, setSubdivision] = useState(4);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const dragRef = useRef({ dragging: false, idx: -1 });
  const auditionTimer = useRef(null);
  const [auditionIdx, setAuditionIdx] = useState(-1);
  const [reverseOnAssign, setReverseOnAssign] = useState(false);
  const [normalizeOnAssign, setNormalizeOnAssign] = useState(false);
  const [maxTransientSlices, setMaxTransientSlices] = useState(16);

  // ── Undo / Redo helpers ──
  const pushUndo = useCallback((pts) => {
    undoStack.current.push([...pts]);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    redoStack.current.push([...engine.chopPts]);
    const prev = undoStack.current.pop();
    engine.setChopPts(prev);
    setStatus(`↩ Undo (${prev.length} slices)`);
  }, [engine]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    undoStack.current.push([...engine.chopPts]);
    const next = redoStack.current.pop();
    engine.setChopPts(next);
    setStatus(`↪ Redo (${next.length} slices)`);
  }, [engine]);

  // ── Generate chop points ──
  const detectChops = useCallback(() => {
    if (!buffer) return;
    pushUndo(engine.chopPts);
    setStatus('Analyzing...');
    requestAnimationFrame(() => {
      try {
        const points = generateChopPoints(buffer, engine.chopMode, {
          sensitivity: engine.chopSens,
          slices: engine.chopSlices,
          bpm: engine.bpm,
          subdivision: engine.chopMode === 'bpmgrid' ? subdivision : 1,
          zeroCrossSnap: engine.zeroCrossSnap,
          maxSlices: 32,
        });
        engine.setChopPts(points);
        engine.setActiveSlice(-1);
        setStatus(`Found ${points.length} slices`);
      } catch (e) {
        console.error('Chop detection failed:', e);
        setStatus('Detection failed');
      }
    });
  }, [buffer, engine, subdivision, pushUndo]);

  // ── Auto-detect on first open ──
  useEffect(() => {
    if (buffer && engine.chopPts.length === 0) detectChops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer]);

  // ── Clear all chop points ──
  const clearChops = useCallback(() => {
    pushUndo(engine.chopPts);
    engine.setChopPts([]);
    engine.setActiveSlice(-1);
    setStatus('Cleared');
  }, [engine, pushUndo]);

  // ── Draw waveform ──
  useEffect(() => {
    if (!canvasRef.current || !buffer) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    }
    drawChopWaveform(canvas, buffer, engine.chopPts, engine.activeSlice, {
      bgColor: '#0a0e14',
      waveColor: '#00ffc8',
      sliceColor: '#ff6600',
      activeSliceColor: '#ffaa00',
    });
  }, [buffer, engine.chopPts, engine.activeSlice]);

  // ── Stop any playing preview ──
  const stopPreview = useCallback(() => {
    if (engine.activeSrc.current['chop_preview']) {
      try { engine.activeSrc.current['chop_preview'].source.stop(); } catch (e) {}
      delete engine.activeSrc.current['chop_preview'];
    }
    if (auditionTimer.current) {
      clearTimeout(auditionTimer.current);
      auditionTimer.current = null;
    }
    setAuditionIdx(-1);
    engine.setActiveSlice(-1);
  }, [engine]);

  // ── Preview a single slice ──
  const previewSlice = useCallback((sliceIdx) => {
    if (!buffer || sliceIdx < 0) return;
    const range = getSliceRange(engine.chopPts, sliceIdx, buffer.duration);
    if (!range) return;
    stopPreview();

    const ctx = engine.initCtx();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = (pad.volume || 0.8) * engine.masterVol;
    src.connect(gain);
    gain.connect(engine.masterRef.current);
    src.start(0, range.start, range.duration);
    engine.activeSrc.current['chop_preview'] = { source: src, gain };
    engine.setActiveSlice(sliceIdx);
    src.onended = () => {
      delete engine.activeSrc.current['chop_preview'];
      engine.setActiveSlice(-1);
    };
  }, [buffer, engine, pad, stopPreview]);

  // ── Audition All — play slices sequentially ──
  const auditionAll = useCallback(() => {
    if (!buffer || engine.chopPts.length === 0) return;
    stopPreview();
    let idx = 0;
    const total = engine.chopPts.length;

    const playNext = () => {
      if (idx >= total) { setAuditionIdx(-1); engine.setActiveSlice(-1); return; }
      setAuditionIdx(idx);
      engine.setActiveSlice(idx);
      const range = getSliceRange(engine.chopPts, idx, buffer.duration);
      if (!range) { idx++; playNext(); return; }

      const ctx = engine.initCtx();
      if (engine.activeSrc.current['chop_preview']) {
        try { engine.activeSrc.current['chop_preview'].source.stop(); } catch (e) {}
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = (pad.volume || 0.8) * engine.masterVol;
      src.connect(gain);
      gain.connect(engine.masterRef.current);
      src.start(0, range.start, range.duration);
      engine.activeSrc.current['chop_preview'] = { source: src, gain };

      idx++;
      auditionTimer.current = setTimeout(playNext, range.duration * 1000 + 50);
    };
    playNext();
  }, [buffer, engine, pad, stopPreview]);

  // ── Canvas click: preview / add manual point ──
  const handleCanvasClick = useCallback((e) => {
    if (!canvasRef.current || !buffer) return;
    if (dragRef.current.dragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (engine.chopMode === 'manual') {
      // In manual mode, click adds point unless near existing
      const time = (x / w) * buffer.duration;
      const nearIdx = engine.chopPts.findIndex(pt => Math.abs((pt / buffer.duration) * w - x) < 8);
      if (nearIdx !== -1) {
        engine.setActiveSlice(nearIdx);
        previewSlice(nearIdx);
        return;
      }
      pushUndo(engine.chopPts);
      const newPts = addManualChopPoint(engine.chopPts, time, buffer, engine.zeroCrossSnap);
      engine.setChopPts(newPts);
      setStatus(`Added point at ${time.toFixed(3)}s — ${newPts.length} slices`);
      return;
    }

    // Non-manual: click to select and preview
    const sliceIdx = getSliceAtPosition(x, w, engine.chopPts, buffer.duration);
    engine.setActiveSlice(sliceIdx);
    previewSlice(sliceIdx);
  }, [buffer, engine, previewSlice, pushUndo]);

  // ── Canvas right-click: remove point ──
  const handleCanvasRightClick = useCallback((e) => {
    e.preventDefault();
    if (!canvasRef.current || !buffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    const nearIdx = engine.chopPts.findIndex(pt =>
      Math.abs((pt / buffer.duration) * w - x) < 10
    );
    if (nearIdx > 0) {
      pushUndo(engine.chopPts);
      const newPts = removeChopPoint(engine.chopPts, nearIdx);
      engine.setChopPts(newPts);
      engine.setActiveSlice(-1);
      setStatus(`Removed point ${nearIdx + 1} — ${newPts.length} slices`);
    }
  }, [buffer, engine, pushUndo]);

  // ── Drag handle: mousedown ──
  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button !== 0 || !canvasRef.current || !buffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    const nearIdx = engine.chopPts.findIndex((pt, i) =>
      i > 0 && Math.abs((pt / buffer.duration) * w - x) < 8
    );
    if (nearIdx > 0) {
      e.preventDefault();
      pushUndo(engine.chopPts);
      dragRef.current = { dragging: true, idx: nearIdx };
    }
  }, [buffer, engine, pushUndo]);

  // ── Drag handle: mousemove ──
  const handleCanvasMouseMove = useCallback((e) => {
    if (!canvasRef.current || !buffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (dragRef.current.dragging) {
      let t = Math.max(0.001, Math.min(buffer.duration - 0.001, (x / w) * buffer.duration));
      if (engine.zeroCrossSnap) {
        t = snapToZeroCrossing(buffer, t);
      }
      const newPts = [...engine.chopPts];
      newPts[dragRef.current.idx] = t;
      newPts.sort((a, b) => a - b);
      engine.setChopPts(newPts);
      return;
    }

    // Hover detection
    if (engine.chopPts.length > 0) {
      const idx = getSliceAtPosition(x, w, engine.chopPts, buffer.duration);
      setHoveredSlice(idx);
    }

    // Cursor change near handles
    const nearHandle = engine.chopPts.findIndex((pt, i) =>
      i > 0 && Math.abs((pt / buffer.duration) * w - x) < 8
    );
    canvasRef.current.style.cursor = nearHandle > 0 ? 'ew-resize' :
      engine.chopMode === 'manual' ? 'crosshair' : 'pointer';
  }, [buffer, engine]);

  // ── Drag handle: mouseup ──
  const handleCanvasMouseUp = useCallback(() => {
    if (dragRef.current.dragging) {
      setTimeout(() => { dragRef.current = { dragging: false, idx: -1 }; }, 50);
    }
  }, []);

  // ── Quick slice count buttons ──
  const halfSlices = useCallback(() => {
    engine.setChopSlices(Math.max(2, Math.floor(engine.chopSlices / 2)));
  }, [engine]);

  const doubleSlices = useCallback(() => {
    engine.setChopSlices(Math.min(32, engine.chopSlices * 2));
  }, [engine]);

  // ── Reverse a buffer ──
  const reverseBuffer = useCallback((buf) => {
    if (!buf) return buf;
    const ctx = engine.initCtx();
    const rev = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const s = buf.getChannelData(ch), d = rev.getChannelData(ch);
      for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
    }
    return rev;
  }, [engine]);

  // ── Normalize a buffer ──
  const normalizeBuffer = useCallback((buf) => {
    if (!buf) return buf;
    const ctx = engine.initCtx();
    const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
    }
    if (peak === 0) return buf;
    const gain = 1.0 / peak;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = newBuf.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[i] * gain;
    }
    return newBuf;
  }, [engine]);

  // ── Apply fade edges to a buffer ──
  const applyFadeEdges = useCallback((buf, fadeSamples = 88) => {
    if (!buf) return buf;
    const ctx = engine.initCtx();
    const newBuf = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const fi = Math.min(fadeSamples, Math.floor(buf.length / 4));
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = newBuf.getChannelData(ch);
      for (let i = 0; i < buf.length; i++) dst[i] = src[i];
      for (let i = 0; i < fi; i++) { dst[i] *= i / fi; dst[buf.length - 1 - i] *= i / fi; }
    }
    return newBuf;
  }, [engine]);

  // ── Process a slice buffer (reverse, normalize, fade) ──
  const processSlice = useCallback((buf) => {
    let result = buf;
    if (reverseOnAssign) result = reverseBuffer(result);
    if (normalizeOnAssign) result = normalizeBuffer(result);
    if (fadeEdges) result = applyFadeEdges(result);
    return result;
  }, [reverseOnAssign, normalizeOnAssign, fadeEdges, reverseBuffer, normalizeBuffer, applyFadeEdges]);

  // ── Assign all slices to pads ──
  const assignToPads = useCallback(() => {
    if (!buffer || engine.chopPts.length === 0) return;
    const ctx = engine.initCtx();
    const results = assignSlicesToPads(ctx, buffer, engine.chopPts, {
      startPad: 0, maxPads: 16,
      namePrefix: `${pad.name || 'Chop'}`,
      sourceName: pad.name,
    });

    results.forEach(({ padIndex, buffer: sliceBuf, name, trimEnd }) => {
      const processed = processSlice(sliceBuf);
      engine.updatePad(padIndex, {
        buffer: processed, name,
        trimStart: 0, trimEnd: processed.duration,
        playMode: 'oneshot',
        reverse: false,
      });
    });

    setStatus(`✓ Assigned ${results.length} slices to Pads 1-${results.length}`);
    setTimeout(() => engine.setShowChop(false), 1200);
  }, [buffer, engine, pad, processSlice]);

  // ── Assign single slice to specific pad ──
  const assignSliceToPad = useCallback((sliceIdx, targetPad) => {
    if (!buffer) return;
    const range = getSliceRange(engine.chopPts, sliceIdx, buffer.duration);
    if (!range) return;
    const ctx = engine.initCtx();
    let sliceBuf = extractSlice(ctx, buffer, range.start, range.end);
    if (!sliceBuf) return;
    sliceBuf = processSlice(sliceBuf);
    engine.updatePad(targetPad, {
      buffer: sliceBuf,
      name: `${pad.name || 'Chop'} ${sliceIdx + 1}`,
      trimStart: 0, trimEnd: sliceBuf.duration,
      playMode: 'oneshot',
    });
    setStatus(`✓ Slice ${sliceIdx + 1} → Pad ${targetPad + 1}`);
  }, [buffer, engine, pad, processSlice]);

  // ── Shuffle assign: random order to pads ──
  const shuffleAssign = useCallback(() => {
    if (!buffer || engine.chopPts.length === 0) return;
    const ctx = engine.initCtx();
    const results = assignSlicesToPads(ctx, buffer, engine.chopPts, {
      startPad: 0, maxPads: 16,
      namePrefix: `${pad.name || 'Chop'}`,
    });
    // Fisher-Yates shuffle
    const shuffled = [...results];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.forEach((item, idx) => {
      const processed = processSlice(item.buffer);
      engine.updatePad(idx, {
        buffer: processed, name: item.name,
        trimStart: 0, trimEnd: processed.duration,
        playMode: 'oneshot',
      });
    });
    setStatus(`🔀 Shuffled ${shuffled.length} slices to pads`);
    setTimeout(() => engine.setShowChop(false), 1200);
  }, [buffer, engine, pad, processSlice]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (auditionTimer.current) clearTimeout(auditionTimer.current);
      if (engine.activeSrc.current?.['chop_preview']) {
        try { engine.activeSrc.current['chop_preview'].source.stop(); } catch (e) {}
        delete engine.activeSrc.current['chop_preview'];
      }
    };
  }, [engine]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key === 'Escape') { stopPreview(); engine.setShowChop(false); }
      if (e.key === ' ') { e.preventDefault(); auditionIdx >= 0 ? stopPreview() : auditionAll(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, stopPreview, auditionAll, auditionIdx, engine]);

  // ── Empty state ──
  if (!buffer) {
    return (
      <div className="sbm-overlay" onClick={() => engine.setShowChop(false)}>
        <div className="sbm-panel sbm-chop-panel" onClick={(e) => e.stopPropagation()}>
          <div className="sbm-panel-header">
            <span>Chop</span>
            <button onClick={() => engine.setShowChop(false)}>✕</button>
          </div>
          <div style={{ padding: 20, color: '#556', textAlign: 'center' }}>No sample loaded on this pad</div>
        </div>
      </div>
    );
  }

  const sliceCount = engine.chopPts.length;
  const hasSlices = sliceCount > 0;
  const isAuditioning = auditionIdx >= 0;

  return (
    <div className="sbm-overlay" onClick={() => { stopPreview(); engine.setShowChop(false); }}>
      <div className="sbm-panel sbm-chop-panel" onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 720, maxWidth: 950, width: '90vw' }}>

        {/* ═══ HEADER ═══ */}
        <div className="sbm-panel-header" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>✂️ Chop: {pad.name || `Pad ${pi + 1}`}
            <span style={{ color: '#7a90a8', fontSize: 13, marginLeft: 10, fontWeight: 400 }}>
              {buffer.duration.toFixed(2)}s · {buffer.numberOfChannels}ch · {buffer.sampleRate}Hz
            </span>
          </span>
          <button onClick={() => { stopPreview(); engine.setShowChop(false); }}
            style={{ fontSize: 18, padding: '4px 10px' }}>✕</button>
        </div>

        {/* ═══ TOP CONTROLS ROW — Mode + Detection settings ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          borderBottom: '1px solid #1a2636', flexWrap: 'wrap',
        }}>
          {/* Mode selector */}
          <label style={S.label}>
            Mode:
            <select value={engine.chopMode} onChange={(e) => engine.setChopMode(e.target.value)} style={S.select}>
              {(CHOP_MODES || CHOP_MODES_LOCAL).map(m => (
                <option key={m} value={m}>
                  {m === 'transient' ? '⚡ Transient' : m === 'bpmgrid' ? '🎵 BPM Grid' : m === 'equal' ? '📏 Equal' : '✏️ Manual'}
                </option>
              ))}
            </select>
          </label>

          {/* Transient: sensitivity slider + max slices */}
          {engine.chopMode === 'transient' && (<>
            <label style={{ ...S.label, background: 'rgba(0,255,200,0.05)', padding: '3px 8px', borderRadius: 6 }}>
              Sensitivity:
              <input type="range" min="5" max="100" step="5"
                value={Math.round(engine.chopSens * 100)}
                onChange={(e) => engine.setChopSens(+e.target.value / 100)}
                style={{ width: 130, accentColor: '#00ffc8', height: 8 }} />
              <span style={{ color: '#00ffc8', minWidth: 32, fontWeight: 700, fontSize: 12 }}>{Math.round(engine.chopSens * 100)}%</span>
            </label>
            <label style={{ ...S.label, background: 'rgba(255,102,0,0.05)', padding: '3px 8px', borderRadius: 6 }}>
              Max:
              <input type="number" min="2" max="32" value={maxTransientSlices}
                onChange={(e) => setMaxTransientSlices(Math.max(2, Math.min(32, +e.target.value)))}
                style={{ ...S.numInput, width: 40 }} />
              <span style={{ color: '#889', fontSize: 13 }}>slices</span>
            </label>
          </>)}

          {/* Equal / BPM Grid: slice count + half/double */}
          {(engine.chopMode === 'equal' || engine.chopMode === 'bpmgrid') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label style={S.label}>
                Slices:
                <input type="number" min="2" max="32" value={engine.chopSlices}
                  onChange={(e) => engine.setChopSlices(Math.max(2, Math.min(32, +e.target.value)))}
                  style={S.numInput} />
              </label>
              <button onClick={halfSlices} style={S.btnSmall(engine.chopSlices <= 2)} disabled={engine.chopSlices <= 2} title="Halve slices">½×</button>
              <button onClick={doubleSlices} style={S.btnSmall(engine.chopSlices >= 32)} disabled={engine.chopSlices >= 32} title="Double slices">2×</button>
            </div>
          )}

          {/* BPM Grid: subdivision */}
          {engine.chopMode === 'bpmgrid' && (
            <label style={S.label}>
              Grid:
              <select value={subdivision} onChange={(e) => setSubdivision(+e.target.value)} style={S.select}>
                <option value={1}>1/4 note</option>
                <option value={2}>1/8 note</option>
                <option value={4}>1/16 note</option>
                <option value={8}>1/32 note</option>
              </select>
              <span style={{ color: '#556', fontSize: 13 }}>@ {engine.bpm} BPM</span>
            </label>
          )}

          {/* Zero-cross snap */}
          <label style={{ ...S.label, cursor: 'pointer' }}>
            <input type="checkbox" checked={engine.zeroCrossSnap}
              onChange={(e) => engine.setZeroCrossSnap(e.target.checked)}
              style={{ accentColor: '#00ffc8' }} />
            Zero-X Snap
          </label>

          <div style={S.divider} />

          {/* Detect button */}
          <button onClick={detectChops} disabled={engine.chopMode === 'manual'}
            style={{
              ...S.btn(false, '#00ffc8'),
              opacity: engine.chopMode === 'manual' ? 0.4 : 1,
              cursor: engine.chopMode === 'manual' ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}>
            ⚡ Detect
          </button>

          {/* Status */}
          {status && (
            <span style={{
              fontSize: 13, fontStyle: 'italic',
              color: status.startsWith('✓') || status.startsWith('🔀') ? '#00ffc8' : '#5a7088',
            }}>
              {status}
            </span>
          )}
        </div>

        {/* ═══ TOOLBAR ROW — Actions + Processing ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          borderBottom: '1px solid #1a2636', flexWrap: 'wrap',
        }}>
          {/* Undo / Redo / Clear */}
          <button onClick={undo} style={S.btnSmall(undoStack.current.length === 0)}
            disabled={undoStack.current.length === 0} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button onClick={redo} style={S.btnSmall(redoStack.current.length === 0)}
            disabled={redoStack.current.length === 0} title="Redo (Ctrl+Shift+Z)">↪ Redo</button>
          <button onClick={clearChops} style={S.btnSmall(!hasSlices)}
            disabled={!hasSlices} title="Clear all chop points">🗑 Clear</button>

          <div style={S.divider} />

          {/* Audition / Stop */}
          <button onClick={isAuditioning ? stopPreview : auditionAll}
            style={S.btn(isAuditioning, '#ffaa00')}
            disabled={!hasSlices} title="Play all slices in sequence (Space)">
            {isAuditioning ? `🔊 Playing ${auditionIdx + 1}/${sliceCount}` : '🔊 Audition All'}
          </button>
          <button onClick={stopPreview} style={S.btnSmall(false)} title="Stop preview (Esc)">⏹ Stop</button>

          <div style={S.divider} />

          {/* Slice processing toggles */}
          <button onClick={() => setReverseOnAssign(p => !p)}
            style={S.btn(reverseOnAssign, '#ff6600')} title="Reverse slices when assigning to pads">
            🔄 Reverse
          </button>
          <button onClick={() => setNormalizeOnAssign(p => !p)}
            style={S.btn(normalizeOnAssign, '#00ffc8')} title="Normalize slices when assigning to pads">
            📊 Normalize
          </button>
          <button onClick={() => setFadeEdges(p => !p)}
            style={S.btn(fadeEdges, '#00ffc8')} title="Apply anti-click fade to slice edges">
            🎚 Fade Edges
          </button>

          <div style={{ flex: 1 }} />

          {/* Slice count badge */}
          <span style={{
            fontSize: 14, color: '#00ffc8', fontWeight: 700,
            background: 'rgba(0,255,200,0.08)', padding: '2px 8px', borderRadius: 10,
          }}>
            {sliceCount} slice{sliceCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ═══ WAVEFORM CANVAS ═══ */}
        <div style={{ padding: '10px 16px' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasRightClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => { handleCanvasMouseUp(); setHoveredSlice(-1); }}
            style={{
              width: '100%', height: 200, borderRadius: 6,
              border: '1px solid #1a2636', cursor: 'crosshair',
              display: 'block',
            }}
          />
          <div style={{ fontSize: 12, color: '#667788', marginTop: 6 }}>
            {engine.chopMode === 'manual'
              ? 'Click to add chop point · Right-click line to remove · Drag handles to reposition'
              : 'Click slice to preview · Right-click line to remove · Drag handles to reposition · Space to audition all'}
          </div>
        </div>

        {/* ═══ SLICE BUTTONS ═══ */}
        {hasSlices && (
          <div style={{
            display: 'flex', gap: 4, padding: '6px 16px 10px', flexWrap: 'wrap',
            maxHeight: 120, overflowY: 'auto',
          }}>
            {engine.chopPts.map((pt, i) => {
              const range = getSliceRange(engine.chopPts, i, buffer.duration);
              const isActive = i === engine.activeSlice;
              const isHovered = i === hoveredSlice;
              const isAud = i === auditionIdx;
              return (
                <button key={i}
                  onClick={() => { engine.setActiveSlice(i); previewSlice(i); }}
                  style={{
                    background: isAud ? 'rgba(255,170,0,0.2)' :
                                isActive ? 'rgba(255,170,0,0.12)' :
                                isHovered ? 'rgba(0,255,200,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isAud || isActive ? '#ffaa00' : isHovered ? 'rgba(0,255,200,0.3)' : '#1a2636'}`,
                    color: isAud || isActive ? '#ffaa00' : '#aab',
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'monospace', transition: 'all 0.12s',
                    outline: isAud ? '1px solid #ffaa00' : 'none',
                  }}>
                  {i + 1} · {pt.toFixed(2)}s
                  {range && <span style={{ color: '#667788', marginLeft: 4 }}>({(range.duration * 1000).toFixed(0)}ms)</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ ACTION BUTTONS ═══ */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 16px 14px',
          borderTop: '1px solid #1a2636', alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* Assign All */}
          <button onClick={assignToPads} disabled={!hasSlices}
            style={{
              background: hasSlices ? 'rgba(0,255,200,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${hasSlices ? 'rgba(0,255,200,0.4)' : '#1a2636'}`,
              color: hasSlices ? '#00ffc8' : '#334',
              padding: '10px 20px', borderRadius: 8,
              cursor: hasSlices ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700,
            }}>
            🎯 Assign All to Pads (1-{Math.min(sliceCount, 16)})
          </button>

          {/* Shuffle assign */}
          <button onClick={shuffleAssign} disabled={!hasSlices}
            style={{
              ...S.btn(false),
              opacity: hasSlices ? 1 : 0.4,
              cursor: hasSlices ? 'pointer' : 'not-allowed',
            }}
            title="Randomize which slice goes to which pad">
            🔀 Shuffle
          </button>

          {/* Assign single slice */}
          {engine.activeSlice >= 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, color: '#889' }}>Slice {engine.activeSlice + 1} →</span>
              <select
                onChange={(e) => { const t = +e.target.value; if (t >= 0) assignSliceToPad(engine.activeSlice, t); }}
                defaultValue="-1" style={S.select}>
                <option value="-1">Pad...</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1} {engine.pads[i]?.buffer ? `(${engine.pads[i].name})` : '(empty)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Processing indicators */}
          {(reverseOnAssign || normalizeOnAssign || fadeEdges) && (
            <span style={{ fontSize: 12, color: '#556', fontStyle: 'italic' }}>
              Processing: {[
                reverseOnAssign && '🔄Rev',
                normalizeOnAssign && '📊Norm',
                fadeEdges && '🎚Fade',
              ].filter(Boolean).join(' + ')}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={() => { stopPreview(); engine.setShowChop(false); }}
            style={{
              background: 'transparent', border: '1px solid #2a3646',
              color: '#889', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
            }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChopView;