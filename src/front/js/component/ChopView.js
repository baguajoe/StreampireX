// =============================================================================
// ChopView.js — Sample Chop Overlay Component
// Drop-in replacement for the inline chop section in SamplerBeatMaker.js
// =============================================================================
//
// USAGE: Import and use in SamplerBeatMaker.js:
//
//   import ChopView from './ChopView';
//
// Then replace the entire {/* Chop View */} block with:
//
//   {engine.showChop && engine.chopIdx !== null && (
//     <ChopView engine={engine} />
//   )}
//
// Also add this import at top of SamplerBeatMaker.js:
//   import { CHOP_MODES } from './useSamplerEngine';  // already imported
//
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
} from './ChopEngine';
import { CHOP_MODES } from './useSamplerEngine';

const ChopView = ({ engine }) => {
  const pi = engine.chopIdx;
  const pad = engine.pads[pi];
  const buffer = pad?.buffer;

  const canvasRef = useRef(null);
  const [hoveredSlice, setHoveredSlice] = useState(-1);
  const [status, setStatus] = useState('');

  // ── Generate chop points when settings change ──
  const detectChops = useCallback(() => {
    if (!buffer) return;
    setStatus('Analyzing...');
    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      try {
        const points = generateChopPoints(buffer, engine.chopMode, {
          sensitivity: engine.chopSens,
          slices: engine.chopSlices,
          bpm: engine.bpm,
          subdivision: 1,
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
  }, [buffer, engine]);

  // ── Auto-detect on first open ──
  useEffect(() => {
    if (buffer && engine.chopPts.length === 0) {
      detectChops();
    }
  }, [buffer]);

  // ── Draw waveform whenever chop points or active slice changes ──
  useEffect(() => {
    if (!canvasRef.current || !buffer) return;
    // Set canvas to actual display size for crisp rendering
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    drawChopWaveform(canvas, buffer, engine.chopPts, engine.activeSlice, {
      bgColor: '#0a0e14',
      waveColor: '#00ffc8',
      sliceColor: '#ff6600',
      activeSliceColor: '#ffaa00',
    });
  }, [buffer, engine.chopPts, engine.activeSlice]);

  // ── Preview a slice ──
  const previewSlice = useCallback((sliceIdx) => {
    if (!buffer || sliceIdx < 0) return;
    const range = getSliceRange(engine.chopPts, sliceIdx, buffer.duration);
    if (!range) return;

    const ctx = engine.initCtx();
    // Stop previous preview
    if (engine.activeSrc.current['chop_preview']) {
      try { engine.activeSrc.current['chop_preview'].source.stop(); } catch (e) {}
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = pad.volume * engine.masterVol;
    src.connect(gain);
    gain.connect(engine.masterRef.current);
    src.start(0, range.start, range.duration);
    engine.activeSrc.current['chop_preview'] = { source: src, gain };
    src.onended = () => { delete engine.activeSrc.current['chop_preview']; };
  }, [buffer, engine, pad]);

  // ── Canvas click: select/preview slice, or add manual point ──
  const handleCanvasClick = useCallback((e) => {
    if (!canvasRef.current || !buffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const canvasDisplayWidth = rect.width;

    if (engine.chopMode === 'manual' && e.shiftKey) {
      // Shift+click = add manual chop point
      const time = (x / canvasDisplayWidth) * buffer.duration;
      const newPts = addManualChopPoint(engine.chopPts, time, buffer, engine.zeroCrossSnap);
      engine.setChopPts(newPts);
      setStatus(`Added point at ${time.toFixed(3)}s — ${newPts.length} slices`);
      return;
    }

    // Regular click: select and preview slice
    const sliceIdx = getSliceAtPosition(x, canvasDisplayWidth, engine.chopPts, buffer.duration);
    engine.setActiveSlice(sliceIdx);
    previewSlice(sliceIdx);
  }, [buffer, engine, previewSlice]);

  // ── Canvas right-click: remove manual point ──
  const handleCanvasRightClick = useCallback((e) => {
    e.preventDefault();
    if (!canvasRef.current || !buffer || engine.chopMode !== 'manual') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sliceIdx = getSliceAtPosition(x, rect.width, engine.chopPts, buffer.duration);
    if (sliceIdx > 0) { // Don't remove first point
      const newPts = removeChopPoint(engine.chopPts, sliceIdx);
      engine.setChopPts(newPts);
      engine.setActiveSlice(-1);
      setStatus(`Removed slice ${sliceIdx + 1} — ${newPts.length} slices`);
    }
  }, [buffer, engine]);

  // ── Canvas hover: show which slice would be selected ──
  const handleCanvasMove = useCallback((e) => {
    if (!canvasRef.current || !buffer || engine.chopPts.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = getSliceAtPosition(x, rect.width, engine.chopPts, buffer.duration);
    setHoveredSlice(idx);
  }, [buffer, engine.chopPts]);

  // ── Assign all slices to pads ──
  const assignToPads = useCallback(() => {
    if (!buffer || engine.chopPts.length === 0) return;
    const ctx = engine.initCtx();
    const results = assignSlicesToPads(ctx, buffer, engine.chopPts, {
      startPad: 0,
      maxPads: 16,
      namePrefix: `${pad.name || 'Chop'}`,
      sourceName: pad.name,
    });

    results.forEach(({ padIndex, buffer: sliceBuf, name, trimEnd }) => {
      engine.updatePad(padIndex, {
        buffer: sliceBuf,
        name,
        trimStart: 0,
        trimEnd,
        playMode: 'oneshot',
      });
    });

    setStatus(`✓ Assigned ${results.length} slices to Pads 1-${results.length}`);
    // Auto-close after a moment
    setTimeout(() => engine.setShowChop(false), 1500);
  }, [buffer, engine, pad]);

  // ── Assign single slice to specific pad ──
  const assignSliceToPad = useCallback((sliceIdx, targetPad) => {
    if (!buffer) return;
    const range = getSliceRange(engine.chopPts, sliceIdx, buffer.duration);
    if (!range) return;
    const ctx = engine.initCtx();
    const sliceBuf = extractSlice(ctx, buffer, range.start, range.end);
    if (!sliceBuf) return;
    engine.updatePad(targetPad, {
      buffer: sliceBuf,
      name: `${pad.name || 'Chop'} ${sliceIdx + 1}`,
      trimStart: 0,
      trimEnd: sliceBuf.duration,
      playMode: 'oneshot',
    });
    setStatus(`✓ Slice ${sliceIdx + 1} → Pad ${targetPad + 1}`);
  }, [buffer, engine, pad]);

  if (!buffer) {
    return (
      <div className="sbm-overlay" onClick={() => engine.setShowChop(false)}>
        <div className="sbm-panel sbm-chop-panel" onClick={(e) => e.stopPropagation()}>
          <div className="sbm-panel-header">
            <span>Chop</span>
            <button onClick={() => engine.setShowChop(false)}>✕</button>
          </div>
          <div className="sbm-empty-msg" style={{ padding: 20 }}>No sample loaded on this pad</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sbm-overlay" onClick={() => engine.setShowChop(false)}>
      <div className="sbm-panel sbm-chop-panel" onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 650, maxWidth: 800 }}>

        {/* Header */}
        <div className="sbm-panel-header">
          <span>✂️ Chop: {pad.name || `Pad ${pi + 1}`}
            <span style={{ color: '#5a7088', fontSize: 11, marginLeft: 8 }}>
              {buffer.duration.toFixed(2)}s · {buffer.numberOfChannels}ch · {buffer.sampleRate}Hz
            </span>
          </span>
          <button onClick={() => engine.setShowChop(false)}>✕</button>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
          borderBottom: '1px solid #1a2636', flexWrap: 'wrap',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#889' }}>
            Mode:
            <select value={engine.chopMode}
              onChange={(e) => engine.setChopMode(e.target.value)}
              style={{
                background: '#0e1218', color: '#ddeeff', border: '1px solid #2a3646',
                borderRadius: 4, padding: '3px 6px', fontSize: 11,
              }}>
              {CHOP_MODES.map(m => (
                <option key={m} value={m}>
                  {m === 'transient' ? '⚡ Transient' :
                   m === 'bpmgrid' ? '🎵 BPM Grid' :
                   m === 'equal' ? '📏 Equal' :
                   m === 'manual' ? '✏️ Manual' : m}
                </option>
              ))}
            </select>
          </label>

          {engine.chopMode === 'transient' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#889' }}>
              Sensitivity:
              <input type="range" min="0.1" max="1" step="0.05"
                value={engine.chopSens}
                onChange={(e) => engine.setChopSens(+e.target.value)}
                style={{ width: 80, accentColor: '#00ffc8' }} />
              <span style={{ color: '#aab', minWidth: 28 }}>{Math.round(engine.chopSens * 100)}%</span>
            </label>
          )}

          {(engine.chopMode === 'equal' || engine.chopMode === 'bpmgrid') && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#889' }}>
              Slices:
              <input type="number" min="2" max="32"
                value={engine.chopSlices}
                onChange={(e) => engine.setChopSlices(Math.max(2, Math.min(32, +e.target.value)))}
                style={{
                  width: 48, background: '#0e1218', color: '#ddeeff', border: '1px solid #2a3646',
                  borderRadius: 4, padding: '2px 4px', fontSize: 11, textAlign: 'center',
                }} />
            </label>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#889' }}>
            <input type="checkbox" checked={engine.zeroCrossSnap}
              onChange={(e) => engine.setZeroCrossSnap(e.target.checked)}
              style={{ accentColor: '#00ffc8' }} />
            Zero-X Snap
          </label>

          <button onClick={detectChops}
            style={{
              background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.3)',
              color: '#00ffc8', padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
            }}>
            ⚡ Detect
          </button>

          {status && (
            <span style={{ fontSize: 10, color: status.startsWith('✓') ? '#00ffc8' : '#5a7088' }}>
              {status}
            </span>
          )}
        </div>

        {/* Waveform Canvas */}
        <div style={{ padding: '8px 14px' }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasRightClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredSlice(-1)}
            style={{
              width: '100%', height: 140, borderRadius: 6,
              border: '1px solid #1a2636', cursor: 'crosshair',
              display: 'block',
            }}
          />
          {engine.chopMode === 'manual' && (
            <div style={{ fontSize: 10, color: '#556', marginTop: 4 }}>
              Shift+click to add slice point · Right-click to remove · Click to preview
            </div>
          )}
        </div>

        {/* Slice Buttons */}
        {engine.chopPts.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, padding: '4px 14px 8px', flexWrap: 'wrap',
            maxHeight: 100, overflowY: 'auto',
          }}>
            {engine.chopPts.map((pt, i) => {
              const range = getSliceRange(engine.chopPts, i, buffer.duration);
              const isActive = i === engine.activeSlice;
              const isHovered = i === hoveredSlice;
              return (
                <button key={i}
                  onClick={() => {
                    engine.setActiveSlice(i);
                    previewSlice(i);
                  }}
                  style={{
                    background: isActive ? 'rgba(255,170,0,0.15)' :
                                isHovered ? 'rgba(0,255,200,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? '#ffaa00' : isHovered ? 'rgba(0,255,200,0.3)' : '#1a2636'}`,
                    color: isActive ? '#ffaa00' : '#aab',
                    padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 10, fontFamily: 'monospace',
                    transition: 'all 0.15s',
                  }}>
                  {i + 1} · {pt.toFixed(2)}s
                  {range && <span style={{ color: '#556', marginLeft: 4 }}>({range.duration.toFixed(2)}s)</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex', gap: 8, padding: '8px 14px 12px',
          borderTop: '1px solid #1a2636', alignItems: 'center',
        }}>
          <button onClick={assignToPads}
            disabled={engine.chopPts.length === 0}
            style={{
              background: engine.chopPts.length > 0 ? 'rgba(0,255,200,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${engine.chopPts.length > 0 ? 'rgba(0,255,200,0.4)' : '#1a2636'}`,
              color: engine.chopPts.length > 0 ? '#00ffc8' : '#445',
              padding: '6px 16px', borderRadius: 8, cursor: engine.chopPts.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 700,
            }}>
            🎯 Assign All to Pads (1-{Math.min(engine.chopPts.length, 16)})
          </button>

          {engine.activeSlice >= 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#889' }}>Assign Slice {engine.activeSlice + 1} to:</span>
              <select
                onChange={(e) => {
                  const targetPad = +e.target.value;
                  if (targetPad >= 0) assignSliceToPad(engine.activeSlice, targetPad);
                }}
                defaultValue="-1"
                style={{
                  background: '#0e1218', color: '#ddeeff', border: '1px solid #2a3646',
                  borderRadius: 4, padding: '3px 6px', fontSize: 11,
                }}>
                <option value="-1">Select pad...</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>Pad {i + 1} {engine.pads[i]?.name !== `Pad ${i + 1}` ? `(${engine.pads[i]?.name})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <button onClick={() => engine.setShowChop(false)}
            style={{
              background: 'transparent', border: '1px solid #2a3646',
              color: '#889', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
            }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChopView;