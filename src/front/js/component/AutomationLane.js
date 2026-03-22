// =============================================================================
// AutomationLane.js — Drawable automation curves for StreamPireX ArrangerView
// =============================================================================
// Location: src/front/js/component/AutomationLane.js
//
// Features:
//   • Draw automation curves below each arrange track
//   • Modes: Draw (pencil), Line, Curve, Step
//   • Parameters: Volume, Pan, FX Send, Filter Cutoff, Mute
//   • Real-time playback reads automation and applies to audio nodes
//   • Write mode: records live parameter changes while playing
//   • Thin lane collapses to just the label row
// =============================================================================

import React, {
  useRef, useCallback, useEffect, useState
} from 'react';
import '../../styles/AutomationLane.css';

// ─────────────────────────────────────────────────────────────────────────────
// Automation parameter definitions
// ─────────────────────────────────────────────────────────────────────────────
export const AUTO_PARAMS = [
  { key: 'volume',    label: 'Volume',       min: 0,    max: 1,    default: 0.8,  color: '#00ffc8', fmt: v => `${Math.round(v * 100)}%`      },
  { key: 'pan',       label: 'Pan',          min: -1,   max: 1,    default: 0,    color: '#4a9eff', fmt: v => v === 0 ? 'C' : v > 0 ? `R${Math.round(v*100)}` : `L${Math.round(-v*100)}` },
  { key: 'sendFX',    label: 'FX Send',      min: 0,    max: 1,    default: 0,    color: '#bf5af2', fmt: v => `${Math.round(v * 100)}%`      },
  { key: 'filterCut', label: 'Filter Cutoff',min: 20,   max: 20000,default: 20000,color: '#ffd60a', fmt: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${Math.round(v)}Hz` },
  { key: 'mute',      label: 'Mute',         min: 0,    max: 1,    default: 0,    color: '#ff3b5c', fmt: v => v > 0.5 ? 'MUTED' : 'ON'       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Point interpolation
// ─────────────────────────────────────────────────────────────────────────────
export function getValueAtTime(points, time, param) {
  if (!points || points.length === 0) return param.default;
  if (points.length === 1) return points[0].value;
  if (time <= points[0].time)   return points[0].value;
  if (time >= points[points.length - 1].time) return points[points.length - 1].value;

  // Find surrounding points
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].time <= time) lo = mid; else hi = mid;
  }

  const p0 = points[lo], p1 = points[hi];
  const t  = (time - p0.time) / (p1.time - p0.time);

  // Mode: linear / curve / step
  if (p0.mode === 'step')  return p0.value;
  if (p0.mode === 'curve') {
    // Smooth S-curve
    const s = t * t * (3 - 2 * t);
    return p0.value + s * (p1.value - p0.value);
  }
  // Linear (default)
  return p0.value + t * (p1.value - p0.value);
};

// ─────────────────────────────────────────────────────────────────────────────
// AutomationLane component
// ─────────────────────────────────────────────────────────────────────────────
const AutomationLane = ({
  trackIndex,
  trackColor   = '#00ffc8',
  trackName    = '',
  duration     = 30,          // total timeline duration in seconds
  zoom         = 1,           // horizontal zoom (1 = 1px per (duration/width) sec)
  currentTime  = 0,           // playhead position in seconds
  isPlaying    = false,
  readMode     = false,        // apply automation to audio
  writeMode    = false,        // record parameter changes
  points       = [],           // array of { time, value, mode }
  paramKey     = 'volume',
  onChange,                    // (newPoints) => void
  onParamChange,               // (paramKey) => void
  onReadToggle,                // () => void
  onWriteToggle,               // () => void
  collapsed    = false,
  onCollapse,                  // () => void
}) => {
  const canvasRef  = useRef(null);
  const [drawMode, setDrawMode] = useState('draw'); // draw | line | curve | step
  const [hovering, setHovering] = useState(false);
  const dragging   = useRef(false);
  const lastPt     = useRef(null);

  const param = AUTO_PARAMS.find(p => p.key === paramKey) ?? AUTO_PARAMS[0];
  const LANE_H = 64;

  // ── Coordinate helpers ──────────────────────────────────────────────────
  const timeToX = useCallback((t, W) =>
    (t / duration) * W * zoom,
  [duration, zoom]);

  const xToTime = useCallback((x, W) =>
    Math.max(0, Math.min(duration, (x / (W * zoom)) * duration)),
  [duration, zoom]);

  const valueToY = useCallback((v) => {
    const norm = (v - param.min) / (param.max - param.min);
    return LANE_H - 2 - norm * (LANE_H - 4);
  }, [param]);

  const yToValue = useCallback((y) => {
    const norm = 1 - (y - 2) / (LANE_H - 4);
    return param.min + Math.max(0, Math.min(1, norm)) * (param.max - param.min);
  }, [param]);

  // ── Draw ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const W   = cv.width;
    const H   = LANE_H;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = 2 + (i / steps) * (H - 4);
      ctx.strokeStyle = '#1c2128';
      ctx.lineWidth   = 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Default value line
    const defY = valueToY(param.default);
    ctx.strokeStyle = '#2d333b';
    ctx.lineWidth   = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, defY); ctx.lineTo(W, defY); ctx.stroke();
    ctx.setLineDash([]);

    if (points.length === 0) {
      // Draw default value line
      ctx.strokeStyle = `${param.color}66`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(0, defY); ctx.lineTo(W, defY); ctx.stroke();
    } else {
      // Draw filled area under curve
      const sorted = [...points].sort((a, b) => a.time - b.time);

      ctx.beginPath();
      ctx.moveTo(0, defY);

      if (sorted[0].time > 0) {
        ctx.lineTo(timeToX(0, W), defY);
        ctx.lineTo(timeToX(sorted[0].time, W), valueToY(sorted[0].value));
      } else {
        ctx.lineTo(timeToX(sorted[0].time, W), valueToY(sorted[0].value));
      }

      for (let i = 1; i < sorted.length; i++) {
        const p0 = sorted[i - 1], p1 = sorted[i];
        const x0 = timeToX(p0.time, W), y0 = valueToY(p0.value);
        const x1 = timeToX(p1.time, W), y1 = valueToY(p1.value);

        if (p0.mode === 'step') {
          ctx.lineTo(x1, y0);
          ctx.lineTo(x1, y1);
        } else if (p0.mode === 'curve') {
          const cx = (x0 + x1) / 2;
          ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
        } else {
          ctx.lineTo(x1, y1);
        }
      }

      // Close area
      const last = sorted[sorted.length - 1];
      ctx.lineTo(timeToX(last.time, W), defY);
      ctx.lineTo(0, defY);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `${param.color}30`);
      grad.addColorStop(1, `${param.color}08`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Draw curve line
      ctx.beginPath();
      if (sorted[0].time > 0) {
        ctx.moveTo(0, valueToY(param.default));
        ctx.lineTo(timeToX(sorted[0].time, W), valueToY(sorted[0].value));
      } else {
        ctx.moveTo(timeToX(sorted[0].time, W), valueToY(sorted[0].value));
      }

      for (let i = 1; i < sorted.length; i++) {
        const p0 = sorted[i - 1], p1 = sorted[i];
        const x0 = timeToX(p0.time, W), y0 = valueToY(p0.value);
        const x1 = timeToX(p1.time, W), y1 = valueToY(p1.value);
        if (p0.mode === 'step') { ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); }
        else if (p0.mode === 'curve') { const cx=(x0+x1)/2; ctx.bezierCurveTo(cx,y0,cx,y1,x1,y1); }
        else ctx.lineTo(x1, y1);
      }

      ctx.lineTo(W, valueToY(param.default));
      ctx.strokeStyle = param.color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Control points
      sorted.forEach(pt => {
        const x = timeToX(pt.time, W);
        const y = valueToY(pt.value);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle   = param.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = 1;
        ctx.stroke();
      });
    }

    // Playhead
    const phX = timeToX(currentTime, W);
    ctx.strokeStyle = '#ff3b5c';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, H); ctx.stroke();

    // Current value indicator
    const curVal = getValueAtTime(points.length > 0 ? [...points].sort((a,b)=>a.time-b.time) : [], currentTime, param);
    const curY   = valueToY(curVal);
    ctx.beginPath();
    ctx.arc(phX, curY, 5, 0, Math.PI * 2);
    ctx.fillStyle   = '#ff3b5c';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1;
    ctx.stroke();

  }, [points, param, currentTime, timeToX, valueToY]);

  useEffect(() => { draw(); }, [draw]);

  // ── Resize canvas ────────────────────────────────────────────────────────
  const wrapRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current; if (!cv || !wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      cv.width = wrapRef.current.clientWidth;
      draw();
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  // ── Mouse interaction ────────────────────────────────────────────────────
  const addOrMovePoint = useCallback((e) => {
    const cv = canvasRef.current; if (!cv) return;
    const r  = cv.getBoundingClientRect();
    const x  = e.clientX - r.left;
    const y  = e.clientY - r.top;
    const t  = xToTime(x, cv.width);
    const v  = yToValue(y);

    const newPt = { time: t, value: v, mode: drawMode === 'draw' ? 'linear' : drawMode };

    // Check if near existing point (within 8px)
    const sorted  = [...points].sort((a, b) => a.time - b.time);
    const nearIdx = sorted.findIndex(p =>
      Math.abs(timeToX(p.time, cv.width) - x) < 8
    );

    let newPoints;
    if (nearIdx !== -1) {
      newPoints = sorted.map((p, i) => i === nearIdx ? { ...p, value: v } : p);
    } else {
      newPoints = [...sorted, newPt].sort((a, b) => a.time - b.time);
    }

    onChange?.(newPoints);
  }, [points, drawMode, xToTime, yToValue, timeToX, onChange]);

  const onMouseDown = useCallback((e) => {
    if (e.button === 2) {
      // Right-click: delete nearest point
      const cv = canvasRef.current; if (!cv) return;
      const r  = cv.getBoundingClientRect();
      const x  = e.clientX - r.left;
      const sorted = [...points].sort((a, b) => a.time - b.time);
      const filtered = sorted.filter(p =>
        Math.abs(timeToX(p.time, cv.width) - x) > 8
      );
      onChange?.(filtered);
      return;
    }
    dragging.current = true;
    addOrMovePoint(e);
  }, [addOrMovePoint, points, timeToX, onChange]);

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    addOrMovePoint(e);
  }, [addOrMovePoint]);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  if (collapsed) {
    return (
      <div className="al-collapsed" style={{ '--track-color': trackColor }}>
        <button className="al-expand-btn" onClick={onCollapse}>▸</button>
        <span className="al-collapsed-label">{param.label}</span>
        <div className="al-collapsed-mini">
          {points.length > 0
            ? `${points.length} pts`
            : param.fmt(param.default)}
        </div>
      </div>
    );
  }

  return (
    <div className="al-root" style={{ '--track-color': trackColor }}>

      {/* ── Lane header ── */}
      <div className="al-header">
        <button className="al-collapse-btn" onClick={onCollapse} title="Collapse">▾</button>

        <select
          className="al-param-select"
          value={paramKey}
          onChange={e => onParamChange?.(e.target.value)}
        >
          {AUTO_PARAMS.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>

        <div className="al-mode-group">
          {['draw','line','curve','step'].map(m => (
            <button
              key={m}
              className={`al-mode-btn ${drawMode === m ? 'active' : ''}`}
              onClick={() => setDrawMode(m)}
              title={m.charAt(0).toUpperCase() + m.slice(1)}
            >
              {m === 'draw' ? '✏️' : m === 'line' ? '╱' : m === 'curve' ? '∿' : '⌐'}
            </button>
          ))}
        </div>

        <button
          className={`al-rw-btn ${readMode ? 'active' : ''}`}
          onClick={onReadToggle}
          title="Read automation"
        >R</button>
        <button
          className={`al-rw-btn write ${writeMode ? 'active' : ''}`}
          onClick={onWriteToggle}
          title="Write automation (records while playing)"
        >W</button>

        <button
          className="al-clear-btn"
          onClick={() => onChange?.([])}
          disabled={points.length === 0}
          title="Clear all automation"
        >
          Clear
        </button>

        <span className="al-value-display" style={{ color: param.color }}>
          {param.fmt(getValueAtTime(
            [...points].sort((a,b)=>a.time-b.time),
            currentTime,
            param
          ))}
        </span>
      </div>

      {/* ── Canvas ── */}
      <div className="al-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="al-canvas"
          height={LANE_H}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={e => e.preventDefault()}
        />
      </div>
    </div>
  );
};

export default AutomationLane;
