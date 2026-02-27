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
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", cursor: disabled ? "default" : "ns-resize", userSelect: "none" }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={disabled ? "Pan" : "Pan — drag up/down, double-click to center"}
    >
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="#1a2838" strokeWidth={2.5}
          strokeDasharray={arcR * Math.PI * 1.5 + " " + arcR * Math.PI * 0.5}
          transform={"rotate(-225 " + cx + " " + cy + ")"}
        />
        <circle cx={cx} cy={cy} r={2} fill="#5a7088" />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={disabled ? "#5a7088" : "#ddeeff"} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: "0.55rem", color: "#5a7088", fontFamily: "monospace", marginTop: -2 }}>{label}</span>
    </div>
  );
};

export default PanKnob;
