// ============================================================
// VUMeter.js — Analog VU needle with backplate
// Shared hardware-aesthetic UI component for SPX plugins.
// ============================================================
//
// Props:
//   value        (number) animation target 0..1
//                  (0 maps to `min` dB, 1 maps to `max` dB)
//   min          (number) lower dB on scale (default -20)
//   max          (number) upper dB on scale (default +3)
//   width        (number) px width (default 200)
//   height       (number) px height (default 120)
//   color        (string) needle color (default "#222")
//   bezelColor   (string) outer bezel color (default "#1a1a1a")
//   faceColor    (string) meter face color (default "#f7e9c8" cream)
//   label        (string) text under scale (default "")
//
// Caller computes RMS / peak in dBFS and normalizes to 0..1
// where 0 = `min` dB (default -20) and 1 = `max` dB (default +3).
// Needle uses requestAnimationFrame with target-spring damping
// (~30% per frame) for smooth analog response.
// ============================================================

import React, { useEffect, useRef, useState } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function VUMeter({
  value = 0,
  min = -20,
  max = 3,
  width = 200,
  height = 120,
  color = "#222",
  bezelColor = "#1a1a1a",
  faceColor = "#f7e9c8",
  label = "",
}) {
  const target = clamp(typeof value === "number" ? value : 0, 0, 1);
  const [smoothed, setSmoothed] = useState(target);
  const rafRef = useRef(null);
  const targetRef = useRef(target);
  const currentRef = useRef(target);

  // Update target ref each render
  targetRef.current = target;

  // requestAnimationFrame loop with 30% per-frame spring damping
  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const delta = targetRef.current - currentRef.current;
      // ~30% per frame approach toward target
      currentRef.current = currentRef.current + delta * 0.3;
      // Snap when very close to avoid endless tiny updates
      if (Math.abs(delta) < 0.0005) {
        currentRef.current = targetRef.current;
      }
      setSmoothed(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Geometry
  const cx = width / 2;
  const cy = height - 8; // pivot near bottom, leave slight margin
  const radius = Math.min(width * 0.45, height - 20);

  // Sweep from -60deg (left) to +60deg (right) around vertical
  const sweepDeg = 60;
  const angleFromValue = (v) => -sweepDeg + v * (sweepDeg * 2);

  const ticks = [-20, -10, -5, -3, -1, 0, 1, 3];
  const valueToNorm = (db) => clamp((db - min) / (max - min), 0, 1);

  // Red-zone arc (above 0 dB)
  const redStart = valueToNorm(0);
  const redEnd = 1;
  const startAngle = angleFromValue(redStart);
  const endAngle = angleFromValue(redEnd);
  const polar = (angleDeg, r) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [rsX, rsY] = polar(startAngle, radius - 6);
  const [reX, reY] = polar(endAngle, radius - 6);
  const redArc = `M ${rsX} ${rsY} A ${radius - 6} ${radius - 6} 0 0 1 ${reX} ${reY}`;

  const needleAngle = angleFromValue(smoothed);
  // Needle endpoint
  const needleLen = radius - 4;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div
      style={{
        display: "inline-block",
        background: bezelColor,
        padding: 6,
        borderRadius: 6,
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.5)",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${faceColor} 0%, ${faceColor} 70%, #d8c89a 100%)`,
          borderRadius: 4,
          display: "block",
        }}
      >
        {/* Subtle inner shadow ring */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
          rx="4"
        />

        {/* Red zone arc */}
        <path d={redArc} stroke="#c12a1f" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Tick marks + labels */}
        {ticks.map((db) => {
          const norm = valueToNorm(db);
          const a = angleFromValue(norm);
          const isMajor = db === 0 || db === -20 || db === 3;
          const tickInner = radius - (isMajor ? 14 : 10);
          const tickOuter = radius - 2;
          const [ix, iy] = polar(a, tickInner);
          const [ox, oy] = polar(a, tickOuter);
          const [lx, ly] = polar(a, tickInner - 8);
          const isRed = db > 0;
          return (
            <g key={db}>
              <line
                x1={ix}
                y1={iy}
                x2={ox}
                y2={oy}
                stroke={isRed ? "#c12a1f" : "#222"}
                strokeWidth={isMajor ? 1.5 : 1}
              />
              <text
                x={lx}
                y={ly}
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
                fill={isRed ? "#c12a1f" : "#333"}
                dominantBaseline="middle"
              >
                {db > 0 ? `+${db}` : db}
              </text>
            </g>
          );
        })}

        {/* "VU" big label */}
        <text
          x={cx}
          y={cy - radius * 0.45}
          fontSize="14"
          fontFamily="serif"
          fontWeight="700"
          textAnchor="middle"
          fill="#222"
          fontStyle="italic"
        >
          VU
        </text>

        {/* Optional bottom label */}
        {label ? (
          <text
            x={cx}
            y={height - 4}
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
            fill="#333"
          >
            {label}
          </text>
        ) : null}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Pivot screw */}
        <circle cx={cx} cy={cy} r="4" fill="#1a1a1a" />
        <circle cx={cx} cy={cy} r="1.2" fill="#888" />
      </svg>
    </div>
  );
}
