import React, { useRef, useCallback } from "react";

const PanKnob = ({ value = 0, onChange, size = 32, disabled = false }) => {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const angle = value * 135;
  const r = size / 2;
  const cx = r;
  const cy = r;

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;

    const handleMouseMove = (e2) => {
      if (!dragging.current) return;
      const dy = startY.current - e2.clientY;
      const newVal = Math.max(-1, Math.min(1, startVal.current + dy * 0.01));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [value, onChange, disabled]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (!disabled) onChange(0);
  };

  const label = value === 0 ? "C" : value > 0 ? "R" + Math.round(value * 100) : "L" + Math.round(Math.abs(value) * 100);

  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcR = r - 4;
  const pointerR = r - 6;
  const px = cx + Math.sin(toRad(angle)) * pointerR;
  const py = cy - Math.cos(toRad(angle)) * pointerR;

  return (
    <div
      className="pan-knob-wrap"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={disabled ? "Pan" : "Pan — drag up/down, double-click to center"}
    >
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        {/* Track arc */}
        <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="#1a2838" strokeWidth={3}
          strokeDasharray={arcR * Math.PI * 1.5 + " " + arcR * Math.PI * 0.5}
          transform={"rotate(-225 " + cx + " " + cy + ")"}
        />
        {/* Active arc */}
        <circle cx={cx} cy={cy} r={arcR} fill="none"
          stroke={value === 0 ? "#00ffc8" : value > 0 ? "#ff6600" : "#00aaff"}
          strokeWidth={3} strokeLinecap="round"
          strokeDasharray={Math.abs(value) * arcR * Math.PI * 0.75 + " " + (arcR * Math.PI * 2)}
          transform={"rotate(" + (value < 0 ? (-225 + value * 135) : -225) + " " + cx + " " + cy + ")"}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={r - 8} fill="#0d1520" stroke="#243048" strokeWidth={1}/>
        {/* Pointer line */}
        <line x1={cx} y1={cy} x2={px} y2={py}
          stroke={disabled ? "#5a7088" : "#e0eeff"} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <span className="pan-knob-label" style={{fontSize:"9px",color:value===0?"#00ffc8":value>0?"#ff6600":"#00aaff",fontWeight:700}}>{label}</span>
    </div>
  );
};

export default PanKnob;
