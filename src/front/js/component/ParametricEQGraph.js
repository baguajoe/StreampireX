// =============================================================================
// ParametricEQGraph.js — Visual Parametric EQ with Draggable Nodes
// =============================================================================
// Renders a professional-looking frequency response curve on an HTML5 Canvas.
// Draggable control nodes let users shape EQ bands visually.
//
// Integrates with RecordingStudio's existing EQ state:
//   { enabled, lowGain, midGain, midFreq, highGain }
//
// Usage:
//   <ParametricEQGraph
//     eq={track.effects.eq}
//     onChange={(updatedEQ) => updateTrackEffects(trackIndex, { eq: updatedEQ })}
//     width={480}
//     height={200}
//   />
// =============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

const FREQ_MIN = 20;
const FREQ_MAX = 20000;
const GAIN_MIN = -12;
const GAIN_MAX = 12;
const PADDING = { top: 20, right: 20, bottom: 30, left: 45 };

// Frequency labels for grid
const FREQ_LABELS = [20, 50, 100, 200, 500, '1k', '2k', '5k', '10k', '20k'];
const FREQ_VALUES = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

// Gain labels for grid
const GAIN_LABELS = [-12, -6, 0, 6, 12];

// Band colors
const BAND_COLORS = {
  low:  { fill: '#FF6B6B', stroke: '#FF4444', label: 'LOW' },
  mid:  { fill: '#00FFC8', stroke: '#00D4A8', label: 'MID' },
  high: { fill: '#4A9EFF', stroke: '#3A8EEF', label: 'HIGH' },
};

// =============================================================================
// HELPERS — Frequency ↔ Pixel conversion (logarithmic scale)
// =============================================================================

const freqToX = (freq, plotWidth) => {
  const logMin = Math.log10(FREQ_MIN);
  const logMax = Math.log10(FREQ_MAX);
  return PADDING.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * plotWidth;
};

const xToFreq = (x, plotWidth) => {
  const logMin = Math.log10(FREQ_MIN);
  const logMax = Math.log10(FREQ_MAX);
  const ratio = (x - PADDING.left) / plotWidth;
  return Math.pow(10, logMin + ratio * (logMax - logMin));
};

const gainToY = (gain, plotHeight) => {
  return PADDING.top + ((GAIN_MAX - gain) / (GAIN_MAX - GAIN_MIN)) * plotHeight;
};

const yToGain = (y, plotHeight) => {
  return GAIN_MAX - ((y - PADDING.top) / plotHeight) * (GAIN_MAX - GAIN_MIN);
};

// =============================================================================
// EQ CURVE CALCULATION — Compute frequency response from filter parameters
// =============================================================================

// Attempt to use Web Audio AnalyserNode for accurate curve, fallback to math
const computeEQCurve = (eq, numPoints, plotWidth) => {
  const points = [];

  for (let i = 0; i < numPoints; i++) {
    const x = PADDING.left + (i / (numPoints - 1)) * plotWidth;
    const freq = xToFreq(x, plotWidth);
    let totalGain = 0;

    // Low shelf at 320 Hz
    if (eq.enabled) {
      const f0 = 320;
      const gain = eq.lowGain || 0;
      const ratio = freq / f0;
      // Approximate low shelf response
      if (ratio < 1) {
        totalGain += gain;
      } else {
        const falloff = 1 / (1 + Math.pow(ratio, 2));
        totalGain += gain * falloff;
      }
    }

    // Mid peaking at midFreq
    if (eq.enabled) {
      const f0 = eq.midFreq || 1000;
      const gain = eq.midGain || 0;
      const Q = 1.5;
      const bandwidth = f0 / Q;
      const delta = Math.log2(freq / f0);
      const response = Math.exp(-0.5 * Math.pow(delta * Q * 2, 2));
      totalGain += gain * response;
    }

    // High shelf at 3200 Hz
    if (eq.enabled) {
      const f0 = 3200;
      const gain = eq.highGain || 0;
      const ratio = f0 / freq;
      if (ratio < 1) {
        totalGain += gain;
      } else {
        const falloff = 1 / (1 + Math.pow(ratio, 2));
        totalGain += gain * falloff;
      }
    }

    // Clamp
    totalGain = Math.max(GAIN_MIN, Math.min(GAIN_MAX, totalGain));
    points.push({ x, freq, gain: totalGain });
  }

  return points;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ParametricEQGraph = ({
  eq = {},
  onChange,
  width = 480,
  height = 200,
  compact = false,
  showLabels = true,
}) => {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'low' | 'mid' | 'high' | null
  const [hovering, setHovering] = useState(null);
  const [dpr, setDpr] = useState(1);

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  // Node positions derived from EQ state
  const getNodePositions = useCallback(() => {
    return {
      low: {
        x: freqToX(320, plotWidth),
        y: gainToY(eq.lowGain || 0, plotHeight),
        freq: 320,
        gain: eq.lowGain || 0,
      },
      mid: {
        x: freqToX(eq.midFreq || 1000, plotWidth),
        y: gainToY(eq.midGain || 0, plotHeight),
        freq: eq.midFreq || 1000,
        gain: eq.midGain || 0,
      },
      high: {
        x: freqToX(3200, plotWidth),
        y: gainToY(eq.highGain || 0, plotHeight),
        freq: 3200,
        gain: eq.highGain || 0,
      },
    };
  }, [eq, plotWidth, plotHeight]);

  // =========================================================================
  // DRAWING
  // =========================================================================

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const r = dpr;

    ctx.clearRect(0, 0, width * r, height * r);
    ctx.save();
    ctx.scale(r, r);

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#0d1f3c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // ── Grid lines — frequency (vertical) ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    FREQ_VALUES.forEach(freq => {
      const x = freqToX(freq, plotWidth);
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, PADDING.top + plotHeight);
      ctx.stroke();
    });

    // ── Grid lines — gain (horizontal) ──
    GAIN_LABELS.forEach(gain => {
      const y = gainToY(gain, plotHeight);
      ctx.strokeStyle = gain === 0 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = gain === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + plotWidth, y);
      ctx.stroke();
    });

    // ── Axis labels — frequency ──
    if (showLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = `${compact ? 8 : 9}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      FREQ_LABELS.forEach((label, i) => {
        const x = freqToX(FREQ_VALUES[i], plotWidth);
        ctx.fillText(label.toString(), x, height - 4);
      });

      // ── Axis labels — gain ──
      ctx.textAlign = 'right';
      GAIN_LABELS.forEach(gain => {
        const y = gainToY(gain, plotHeight);
        const label = gain > 0 ? `+${gain}` : gain.toString();
        ctx.fillText(label, PADDING.left - 6, y + 3);
      });

      // ── Hz / dB labels ──
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = `${compact ? 7 : 8}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Hz', width / 2, height - (compact ? -2 : -1));
      ctx.save();
      ctx.translate(8, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('dB', 0, 0);
      ctx.restore();
    }

    // ── EQ Response Curve ──
    const curve = computeEQCurve(eq, 256, plotWidth);

    // Filled area under curve
    ctx.beginPath();
    ctx.moveTo(curve[0].x, gainToY(0, plotHeight));
    curve.forEach(pt => ctx.lineTo(pt.x, gainToY(pt.gain, plotHeight)));
    ctx.lineTo(curve[curve.length - 1].x, gainToY(0, plotHeight));
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + plotHeight);
    fillGrad.addColorStop(0, 'rgba(0, 255, 200, 0.12)');
    fillGrad.addColorStop(0.5, 'rgba(0, 255, 200, 0.03)');
    fillGrad.addColorStop(1, 'rgba(0, 255, 200, 0.12)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Main curve line
    ctx.beginPath();
    curve.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, gainToY(pt.gain, plotHeight));
      else ctx.lineTo(pt.x, gainToY(pt.gain, plotHeight));
    });
    ctx.strokeStyle = '#00FFC8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 255, 200, 0.4)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Draggable Nodes ──
    const nodes = getNodePositions();
    Object.entries(nodes).forEach(([band, node]) => {
      const colors = BAND_COLORS[band];
      const isHover = hovering === band;
      const isDrag = dragging === band;
      const radius = isDrag ? 9 : isHover ? 8 : 6;

      // Glow
      if (isHover || isDrag) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = `${colors.fill}20`;
        ctx.fill();
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isDrag ? colors.stroke : colors.fill;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isDrag ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      if ((isHover || isDrag) && showLabels) {
        const labelY = node.y < PADDING.top + 30 ? node.y + 20 : node.y - 14;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        const gainStr = `${node.gain > 0 ? '+' : ''}${node.gain.toFixed(1)} dB`;
        const freqStr = node.freq >= 1000 ? `${(node.freq / 1000).toFixed(1)}k` : `${Math.round(node.freq)}`;
        const text = `${colors.label}: ${freqStr} Hz  ${gainStr}`;
        const tw = ctx.measureText(text).width + 10;
        const lx = Math.max(PADDING.left, Math.min(node.x - tw / 2, width - PADDING.right - tw));
        ctx.fillRect(lx, labelY - 10, tw, 16);
        ctx.fillStyle = colors.fill;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(text, lx + 5, labelY + 1);
      }
    });

    // ── Border ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING.left, PADDING.top, plotWidth, plotHeight);

    ctx.restore();
  }, [eq, width, height, plotWidth, plotHeight, hovering, dragging, dpr, compact, showLabels, getNodePositions]);

  // =========================================================================
  // CANVAS SETUP + DRAW LOOP
  // =========================================================================

  useEffect(() => {
    const r = window.devicePixelRatio || 1;
    setDpr(r);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width * r;
      canvas.height = height * r;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, [width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  // =========================================================================
  // MOUSE INTERACTION
  // =========================================================================

  const hitTest = useCallback((mx, my) => {
    const nodes = getNodePositions();
    const hitRadius = 14; // Generous hit target
    for (const band of ['mid', 'low', 'high']) { // mid first (most likely to move)
      const node = nodes[band];
      const dx = mx - node.x;
      const dy = my - node.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) return band;
    }
    return null;
  }, [getNodePositions]);

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    const pos = getMousePos(e);
    const hit = hitTest(pos.x, pos.y);
    if (hit) {
      setDragging(hit);
      e.preventDefault();
    }
  }, [getMousePos, hitTest]);

  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);

    if (dragging && onChange) {
      const gain = Math.round(yToGain(pos.y, plotHeight) * 2) / 2; // 0.5 dB steps
      const clampedGain = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gain));

      const updates = { ...eq };

      if (dragging === 'low') {
        updates.lowGain = clampedGain;
      } else if (dragging === 'mid') {
        updates.midGain = clampedGain;
        // Mid node can also move horizontally to change frequency
        const freq = xToFreq(pos.x, plotWidth);
        updates.midFreq = Math.max(200, Math.min(8000, Math.round(freq / 10) * 10));
      } else if (dragging === 'high') {
        updates.highGain = clampedGain;
      }

      onChange(updates);
    } else {
      const hit = hitTest(pos.x, pos.y);
      setHovering(hit);
    }
  }, [dragging, eq, onChange, plotWidth, plotHeight, getMousePos, hitTest]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDragging(null);
    setHovering(null);
  }, []);

  // Double-click to reset a band
  const handleDoubleClick = useCallback((e) => {
    const pos = getMousePos(e);
    const hit = hitTest(pos.x, pos.y);
    if (hit && onChange) {
      const updates = { ...eq };
      if (hit === 'low') updates.lowGain = 0;
      else if (hit === 'mid') { updates.midGain = 0; updates.midFreq = 1000; }
      else if (hit === 'high') updates.highGain = 0;
      onChange(updates);
    }
  }, [eq, onChange, getMousePos, hitTest]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div
      className="parametric-eq-graph"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: dragging ? 'grabbing' : hovering ? 'grab' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '6px',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />

      {/* Band legend — bottom right */}
      {showLabels && !compact && (
        <div style={{
          position: 'absolute',
          bottom: '32px',
          right: '24px',
          display: 'flex',
          gap: '10px',
          fontSize: '9px',
          fontFamily: '-apple-system, sans-serif',
          pointerEvents: 'none',
        }}>
          {Object.entries(BAND_COLORS).map(([band, c]) => (
            <div key={band} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: c.fill, border: '1px solid rgba(255,255,255,0.3)',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParametricEQGraph;