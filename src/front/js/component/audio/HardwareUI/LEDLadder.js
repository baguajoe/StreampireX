// ============================================================
// LEDLadder.js — Vertical or horizontal LED strip
// Shared hardware-aesthetic UI component for SPX plugins.
// Useful for gain reduction (GR) meters, level meters, etc.
// ============================================================
//
// Props:
//   value        (number)  0..1 normalized fill level
//   orientation  ("vertical" | "horizontal", default "vertical")
//   segments     (number)  number of LED segments (default 12)
//   color        (string)  LED on color (default "#ff5544" — GR red)
//   dimColor     (string)  LED off color (default "#3a1a1a")
//   width        (number)  px width
//                 default 24 vertical / 120 horizontal
//   height       (number)  px height
//                 default 120 vertical / 24 horizontal
//   reverse      (boolean) if true, fill from opposite end
//                 (default false). For GR meters set reverse=true so
//                 the strip "fills DOWN" from top.
//
// Smooths value via spring damping (~30% per frame).
// Top segments (or bottom 3 in reverse mode) glow brighter to act
// as a "danger zone" indicator.
// ============================================================

import React, { useEffect, useRef, useState } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Lighten a hex color by mixing with white, factor 0..1
function lighten(hex, factor) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * factor);
  const toHex = (c) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export default function LEDLadder({
  value = 0,
  orientation = "vertical",
  segments = 12,
  color = "#ff5544",
  dimColor = "#3a1a1a",
  width,
  height,
  reverse = false,
}) {
  const isVertical = orientation === "vertical";
  const w = width ?? (isVertical ? 24 : 120);
  const h = height ?? (isVertical ? 120 : 24);

  const target = clamp(typeof value === "number" ? value : 0, 0, 1);
  const [smoothed, setSmoothed] = useState(target);
  const targetRef = useRef(target);
  const currentRef = useRef(target);
  const rafRef = useRef(null);
  targetRef.current = target;

  useEffect(() => {
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const delta = targetRef.current - currentRef.current;
      currentRef.current = currentRef.current + delta * 0.3;
      if (Math.abs(delta) < 0.0005) currentRef.current = targetRef.current;
      setSmoothed(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const lit = Math.ceil(smoothed * segments);

  // Generate segment list. Index 0 = "first" segment from the
  // start side. In normal mode, "danger zone" = top segments
  // (i.e. last indices, near peak end). In reverse mode, the
  // strip fills from the opposite end and danger zone is "bottom 3".
  const items = [];
  const gap = 2;
  const segLen = isVertical
    ? (h - gap * (segments + 1)) / segments
    : (w - gap * (segments + 1)) / segments;
  const segThick = (isVertical ? w : h) - 6;

  for (let i = 0; i < segments; i++) {
    // Visual ordering: vertical = i=0 at bottom, i=N-1 at top.
    // Horizontal = i=0 at left, i=N-1 at right.
    const visualIndex = i;

    // Determine which segments should be lit:
    // normal: lowest `lit` segments (fills up/right)
    // reverse: highest `lit` segments (fills down/left from opposite end)
    let isOn;
    if (reverse) {
      isOn = visualIndex >= segments - lit;
    } else {
      isOn = visualIndex < lit;
    }

    // Danger zone indices.
    // In reverse mode (GR style): danger = "bottom 3" segments
    //   meaning the first 3 to light up as GR grows = topmost segments.
    //   visualIndex N-1, N-2, N-3.
    // In normal mode: danger = top segments (peak end), last 3.
    const isDanger = reverse
      ? visualIndex >= segments - 3
      : visualIndex >= segments - 3;

    const onColor = isDanger ? lighten(color, 0.25) : color;
    const offColor = dimColor;

    let x, y, segW, segH;
    if (isVertical) {
      // i=0 at bottom -> y from bottom
      const idxFromTop = segments - 1 - visualIndex;
      x = 3;
      y = gap + idxFromTop * (segLen + gap);
      segW = segThick;
      segH = segLen;
    } else {
      x = gap + visualIndex * (segLen + gap);
      y = 3;
      segW = segLen;
      segH = segThick;
    }

    items.push(
      <rect
        key={i}
        x={x}
        y={y}
        width={segW}
        height={segH}
        rx={2}
        ry={2}
        fill={isOn ? onColor : offColor}
        style={{
          filter: isOn
            ? `drop-shadow(0 0 ${isDanger ? 4 : 2}px ${onColor})`
            : "none",
          transition: "fill 50ms linear",
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "inline-block",
        background: "#0a0a0a",
        border: "1px solid #222",
        borderRadius: 4,
        padding: 0,
        boxShadow: "inset 0 0 4px rgba(0,0,0,0.8)",
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block" }}
      >
        {items}
      </svg>
    </div>
  );
}
