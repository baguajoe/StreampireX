// =============================================================================
// VocalKnob.js — Rotary Knob Component for VocalProcessor
// =============================================================================
// Self-contained with inline styles — no external CSS required.
// Pure React rotary knob with:
//   - Drag-to-rotate interaction (vertical drag)
//   - Machined metal appearance with specular highlight
//   - Orange pointer indicator line
//   - Optional scale arc (SVG)
//   - Silk-screen label + LED value readout
// =============================================================================

import React, { useRef, useCallback, useEffect } from 'react';

const VocalKnob = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  unit = '',
  formatValue,
  size = 'medium',   // 'small' | 'medium' | 'large'
  color,             // optional accent color override
  showScale = true,
}) => {
  const knobRef = useRef(null);
  const dragRef = useRef({ active: false, startY: 0, startValue: 0 });

  // Normalize value to 0-1 range
  const range = max - min || 1;
  const normalized = Math.max(0, Math.min(1, (value - min) / range));

  // Rotation: -135° to +135° (270° sweep)
  const rotation = -135 + normalized * 270;

  // Display value
  const displayValue = formatValue
    ? formatValue(value)
    : `${Number.isInteger(step) ? Math.round(value) : value.toFixed(1)}${unit}`;

  // Size configs
  const sizes = {
    small:  { outer: 40, inner: 30, ptr: 7,  fontSize: 9,  valSize: 9  },
    medium: { outer: 50, inner: 38, ptr: 9,  fontSize: 10, valSize: 10 },
    large:  { outer: 62, inner: 48, ptr: 11, fontSize: 11, valSize: 11 },
  };
  const s = sizes[size] || sizes.medium;
  const accentColor = color || '#ff8c00';

  // ── Drag handlers ──
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { active: true, startY: e.clientY, startValue: value };
    const onMove = (ev) => {
      if (!dragRef.current.active) return;
      const dy = dragRef.current.startY - ev.clientY;
      const sensitivity = range / 150;
      let newVal = dragRef.current.startValue + dy * sensitivity;
      newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      if (onChange) onChange(newVal);
    };
    const onUp = () => {
      dragRef.current.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [value, min, max, step, range, onChange]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    dragRef.current = { active: true, startY: touch.clientY, startValue: value };
  }, [value]);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dy = dragRef.current.startY - touch.clientY;
    const sensitivity = range / 150;
    let newVal = dragRef.current.startValue + dy * sensitivity;
    newVal = Math.round(newVal / step) * step;
    newVal = Math.max(min, Math.min(max, newVal));
    if (onChange) onChange(newVal);
  }, [min, max, step, range, onChange]);

  const handleTouchEnd = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    const center = Math.round(((min + max) / 2) / step) * step;
    if (onChange) onChange(center);
  }, [min, max, step, onChange]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    let newVal = value + direction * step;
    newVal = Math.max(min, Math.min(max, newVal));
    if (onChange) onChange(newVal);
  }, [value, min, max, step, onChange]);

  // ── Inline Styles ──
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      userSelect: 'none',
      WebkitUserSelect: 'none',
    },
    label: {
      fontSize: s.fontSize,
      fontWeight: 800,
      color: '#8a8a95',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      textAlign: 'center',
      textShadow: '0 1px 1px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
      fontFamily: "'Outfit', -apple-system, sans-serif",
    },
    assembly: {
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: s.outer + (showScale ? 10 : 0),
      height: s.outer + (showScale ? 10 : 0),
      touchAction: 'none',
    },
    scaleSvg: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      width: s.outer + 10,
      height: s.outer + 10,
    },
    bezel: {
      width: s.outer,
      height: s.outer,
      borderRadius: '50%',
      background: '#1a1a20',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `
        0 2px 8px rgba(0,0,0,0.6),
        inset 0 1px 2px rgba(0,0,0,0.4),
        inset 0 -1px 1px rgba(255,255,255,0.02)
      `,
      position: 'relative',
    },
    body: {
      width: s.inner,
      height: s.inner,
      borderRadius: '50%',
      background: `radial-gradient(circle at 38% 32%,
        #6a6a72,
        #4a4a54 25%,
        #3a3a44 50%,
        #2e2e36 75%,
        #28282e
      )`,
      border: '1px solid #1a1a20',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: 3,
      boxShadow: `
        inset 0 2px 3px rgba(255,255,255,0.08),
        inset 0 -2px 3px rgba(0,0,0,0.3)
      `,
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.05s ease-out',
    },
    pointer: {
      width: 2,
      height: s.ptr,
      borderRadius: 1,
      background: accentColor,
      boxShadow: `0 0 4px ${accentColor}66`,
    },
    value: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: s.valSize,
      fontWeight: 700,
      color: '#00d4ff',
      textAlign: 'center',
      textShadow: '0 0 4px rgba(0,212,255,0.2)',
      whiteSpace: 'nowrap',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.label}>{label}</div>

      <div
        ref={knobRef}
        style={styles.assembly}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {/* Scale arc */}
        {showScale && (
          <svg style={styles.scaleSvg} viewBox="0 0 100 100">
            {/* Background track */}
            <path
              d={describeArc(50, 50, 46, -135, 135)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Active arc */}
            <path
              d={describeArc(50, 50, 46, -135, -135 + normalized * 270)}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Tick marks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
              const angle = (-135 + t * 270) * (Math.PI / 180);
              const r1 = 42, r2 = 48;
              return (
                <line
                  key={i}
                  x1={50 + r1 * Math.cos(angle)}
                  y1={50 + r1 * Math.sin(angle)}
                  x2={50 + r2 * Math.cos(angle)}
                  y2={50 + r2 * Math.sin(angle)}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        )}

        {/* Bezel + Body */}
        <div style={styles.bezel}>
          <div style={styles.body}>
            <div style={styles.pointer} />
          </div>
        </div>
      </div>

      <div style={styles.value}>{displayValue}</div>
    </div>
  );
};

// ── SVG arc helpers ──
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default VocalKnob;