import React, { useRef, useCallback } from "react";

const PanKnob = ({ value = 0, onChange, size = 44, disabled = false }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault(); e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    const onMove = (e2) => {
      if (!dragging.current) return;
      onChange(Math.max(-1, Math.min(1, startVal.current + (startY.current - e2.clientY) * 0.012)));
    };
    const onUp = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [value, onChange, disabled]);

  const label = value === 0 ? "C" : value > 0 ? "R" + Math.round(value * 100) : "L" + Math.round(Math.abs(value) * 100);
  const labelColor = value === 0 ? "#00ffc8" : value > 0 ? "#ff6600" : "#00aaff";
  const cx = size / 2, cy = size / 2, r = size / 2 - 3;
  const toRad = deg => deg * Math.PI / 180;
  const startDeg = -225, totalArc = 270;
  const valueDeg = startDeg + (value + 1) / 2 * totalArc;
  const centerDeg = startDeg + totalArc / 2;
  const arcPath = (startD, endD) => {
    const s = toRad(startD), e = toRad(endD);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = Math.abs(endD - startD) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const px = cx + (r - 5) * Math.cos(toRad(valueDeg));
  const py = cy + (r - 5) * Math.sin(toRad(valueDeg));

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"ns-resize",userSelect:"none",padding:"2px 0"}}
      onMouseDown={handleMouseDown}
      onDoubleClick={e => { e.stopPropagation(); if (!disabled) onChange(0); }}
      title="Pan — drag up/down, double-click to center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="#0d1520" stroke="#1e3050" strokeWidth={1.5}/>
        <path d={arcPath(startDeg, startDeg + totalArc)} fill="none" stroke="#1a2840" strokeWidth={4} strokeLinecap="round"/>
        {Math.abs(value) > 0.01 && (
          <path d={value >= 0 ? arcPath(centerDeg, valueDeg) : arcPath(valueDeg, centerDeg)}
            fill="none" stroke={labelColor} strokeWidth={4} strokeLinecap="round"/>
        )}
        <circle cx={cx} cy={cy} r={r - 7} fill="#141c2e" stroke="#243048" strokeWidth={1}/>
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#e8f0ff" strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={px} cy={py} r={1.5} fill={labelColor}/>
      </svg>
      <span style={{fontSize:"10px",color:labelColor,fontFamily:"JetBrains Mono,monospace",fontWeight:700,marginTop:"-1px"}}>{label}</span>
    </div>
  );
};

export default PanKnob;
