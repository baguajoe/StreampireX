// ============================================================
// AnalogKnob.js — Vintage / chickenhead / modern style knob
// Shared hardware-aesthetic UI component for SPX plugins.
// ============================================================
//
// Props:
//   value           (number) current value
//                     - if min/max omitted, treated as 0..1 normalized
//   min             (number) minimum value (default 0)
//   max             (number) maximum value (default 1)
//   onChange        fn(newValue) — drag callback
//   style           "chickenhead" | "vintage" | "modern"
//                     (default "vintage")
//   size            (number) px outer diameter (default 60)
//   color           (string) knob body color (default "#1a1a1a")
//   indicatorColor  (string) pointer/notch color (default "#fff")
//   label           (string) label text below knob
//   valueLabel      (string) optional formatted value display
//   step            (number) snap increment, optional
//   accentColor     (string) optional accent ring color
//
// Drag UX:
//   - vertical drag, up = increase, down = decrease
//   - sensitivity ~200px = full range (matches existing <Knob>
//     in SPXPlugins.js convention which uses 150px; we use 200px
//     here to be slightly less twitchy on bigger hardware-style knobs)
//
// Sweep range: -140deg to +140deg (280deg total).
// ============================================================

import React, { useCallback, useRef } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function AnalogKnob({
  value = 0,
  min = 0,
  max = 1,
  onChange,
  style = "vintage",
  size = 60,
  color = "#1a1a1a",
  indicatorColor = "#fff",
  label = "",
  valueLabel,
  step,
  accentColor,
}) {
  const startY = useRef(null);
  const startVal = useRef(null);
  const dragging = useRef(false);

  const range = max - min;
  const pct = range > 0 ? clamp((value - min) / range, 0, 1) : 0;
  const angle = -140 + pct * 280;

  const onPointerMove = useCallback(
    (e) => {
      if (!dragging.current) return;
      const dy = (startY.current - e.clientY) / 200; // 200px = full range
      let next = startVal.current + dy * range;
      next = clamp(next, min, max);
      if (typeof step === "number" && step > 0) {
        next = Math.round(next / step) * step;
        next = clamp(next, min, max);
      }
      if (typeof onChange === "function") onChange(next);
    },
    [min, max, range, step, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [value, onPointerMove, onPointerUp]
  );

  // Render knob body per style
  const radius = size / 2;
  const bodyR = radius - 2;

  const renderVintage = () => (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer ring shadow */}
      <circle cx={radius} cy={radius} r={bodyR} fill="#0a0a0a" />
      {/* Bakelite body */}
      <defs>
        <radialGradient id={`vintageGrad-${size}-${color.replace("#", "")}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#5a5a5a" />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>
      <circle
        cx={radius}
        cy={radius}
        r={bodyR - 2}
        fill={`url(#vintageGrad-${size}-${color.replace("#", "")})`}
        stroke="#000"
        strokeWidth="0.5"
      />
      {/* Indicator: thin notch line from center to edge */}
      <g transform={`rotate(${angle} ${radius} ${radius})`}>
        <line
          x1={radius}
          y1={radius - bodyR + 6}
          x2={radius}
          y2={radius - bodyR + bodyR * 0.55}
          stroke={indicatorColor}
          strokeWidth={Math.max(1.5, size * 0.04)}
          strokeLinecap="round"
        />
      </g>
      {/* Center dot */}
      <circle cx={radius} cy={radius} r={Math.max(1.5, size * 0.05)} fill="#000" />
    </svg>
  );

  const renderChickenhead = () => {
    // Triangular pointer projecting beyond circle.
    const pointerLen = bodyR + size * 0.18;
    const half = size * 0.09;
    return (
      <svg width={size + size * 0.3} height={size + size * 0.3} viewBox={`0 0 ${size + size * 0.3} ${size + size * 0.3}`}>
        <g transform={`translate(${size * 0.15}, ${size * 0.15})`}>
          {/* Body shadow */}
          <circle cx={radius} cy={radius} r={bodyR} fill="#0a0a0a" />
          {/* Body */}
          <circle
            cx={radius}
            cy={radius}
            r={bodyR - 2}
            fill={color}
            stroke="#000"
            strokeWidth="0.5"
          />
          {/* Center hub */}
          <circle cx={radius} cy={radius} r={size * 0.12} fill="#0a0a0a" />
          {/* Pointer */}
          <g transform={`rotate(${angle} ${radius} ${radius})`}>
            <polygon
              points={`${radius - half},${radius} ${radius + half},${radius} ${radius},${radius - pointerLen}`}
              fill={indicatorColor}
              stroke="#000"
              strokeWidth="0.75"
              strokeLinejoin="round"
            />
          </g>
          {/* Center screw dot */}
          <circle cx={radius} cy={radius} r={size * 0.04} fill="#222" />
        </g>
      </svg>
    );
  };

  const renderModern = () => (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={radius} cy={radius} r={bodyR} fill={color} stroke={accentColor || "#444"} strokeWidth="1" />
      <g transform={`rotate(${angle} ${radius} ${radius})`}>
        <line
          x1={radius}
          y1={radius}
          x2={radius}
          y2={radius - bodyR * 0.85}
          stroke={indicatorColor}
          strokeWidth={Math.max(2, size * 0.05)}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );

  let knob;
  if (style === "chickenhead") knob = renderChickenhead();
  else if (style === "modern") knob = renderModern();
  else knob = renderVintage();

  const formattedValue =
    valueLabel != null
      ? valueLabel
      : typeof value === "number"
      ? Number.isInteger(value)
        ? value.toString()
        : value.toFixed(2)
      : String(value);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        userSelect: "none",
        cursor: "ns-resize",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        style={{ touchAction: "none", lineHeight: 0 }}
      >
        {knob}
      </div>
      {valueLabel !== false ? (
        <div
          style={{
            fontSize: 9,
            color: "#fff",
            fontFamily: "monospace",
            fontWeight: 700,
          }}
        >
          {formattedValue}
        </div>
      ) : null}
      {label ? (
        <div
          style={{
            fontSize: 9,
            color: "#aaa",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
