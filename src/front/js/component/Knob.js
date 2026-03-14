// =============================================================================
// Knob.js — Reusable rotary knob control
// =============================================================================
// Location: src/front/js/component/Knob.js
// =============================================================================

import React from 'react';

export const Knob = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  color = '#00ffc8',
  fmt = (v) => v.toFixed(1),
  size = 40,
}) => {
  const handleMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = value;
    const onMove = (me) => {
      const delta = (startY - me.clientY) * ((max - min) / 150);
      let newVal = startVal + delta;
      newVal = Math.min(max, Math.max(min, newVal));
      // snap to step
      newVal = Math.round(newVal / step) * step;
      onChange(parseFloat(newVal.toFixed(10)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Double-click resets to midpoint
  const handleDoubleClick = () => {
    const mid = Math.round(((min + max) / 2) / step) * step;
    onChange(mid);
  };

  const angle = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'ns-resize',
        userSelect: 'none',
        padding: '5px',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={`${label}: ${fmt(value)} (drag up/down · double-click to reset)`}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 40 40">
          {/* Track arc background */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#21262d"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 16 * 0.75} ${2 * Math.PI * 16 * 0.25}`}
            strokeDashoffset={`${2 * Math.PI * 16 * 0.125}`}
            strokeLinecap="round"
            style={{ transform: 'rotate(135deg)', transformOrigin: '20px 20px' }}
          />
          {/* Track arc fill */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 16 * 0.75 * ((value - min) / (max - min))} ${2 * Math.PI * 16}`}
            strokeDashoffset={`${2 * Math.PI * 16 * 0.125}`}
            strokeLinecap="round"
            style={{
              transform: 'rotate(135deg)',
              transformOrigin: '20px 20px',
              filter: `drop-shadow(0 0 3px ${color}88)`,
            }}
          />
          {/* Body */}
          <circle cx="20" cy="20" r="13" fill="#161b22" stroke="#30363d" strokeWidth="1.5" />
          {/* Pointer */}
          <g transform={`rotate(${angle} 20 20)`}>
            <line
              x1="20" y1="20" x2="20" y2="9"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="20" cy="9" r="1.5" fill={color} />
          </g>
        </svg>
      </div>
      <div style={{ fontSize: '10px', color, fontWeight: 'bold', marginTop: '2px' }}>{fmt(value)}</div>
      {label && (
        <div style={{ fontSize: '9px', color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>
          {label}
        </div>
      )}
    </div>
  );
};

export default Knob;