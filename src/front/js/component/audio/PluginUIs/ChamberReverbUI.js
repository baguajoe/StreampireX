// ============================================================
// ChamberReverbUI.js — Echo Chamber reverb, dark slate/silver
// Hardware-styled reverb UI. Built on shared HardwareUI primitives.
// ============================================================
//
// Aesthetic: dark slate rack with brushed silver accents.
// Visual: small SVG room geometry whose dimensions scale with `decay`
// — concrete walls + tiny speaker icons positioned at room corners.
// Knobs: Decay, Damping, Color (modern style); Mix is the bigger
// silver hero knob center-front.
//
// DSP keys (matching PLUGIN_DEFAULTS.chamber):
//   { decay: 1.6, damping: 0.45, color: 0.5, mix: 25 }
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";

const ACCENT = "#a0aab0"; // silver/slate
const BG = "#101418";

const DEFAULTS = { decay: 1.6, damping: 0.45, color: 0.5, mix: 25 };

function RoomDiagram({ decay = 1.6, damping = 0.45 }) {
  // Map decay 0.2..6s to room width 60..150 px and height 40..90 px.
  const dN = Math.max(0, Math.min(1, (decay - 0.2) / (6 - 0.2)));
  const w = 60 + dN * 90;
  const h = 40 + dN * 50;
  const cx = 100;
  const cy = 50;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Damping affects the dotted "absorption" hatching density on walls.
  const hatchOpacity = 0.15 + damping * 0.65;

  // Speaker positions (left-front, right-front)
  const sx1 = x + 8;
  const sx2 = x + w - 12;
  const sy = y + h - 6;

  return (
    <svg
      width={200}
      height={100}
      viewBox="0 0 200 100"
      style={{ display: "block" }}
    >
      <defs>
        <pattern
          id="concretePattern"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
        >
          <rect width="6" height="6" fill="#222" />
          <circle cx="2" cy="3" r="0.6" fill="#3a3a3a" />
          <circle cx="5" cy="1" r="0.4" fill="#444" />
        </pattern>
      </defs>

      {/* Outer subtle frame */}
      <rect
        x="2"
        y="2"
        width="196"
        height="96"
        rx="3"
        fill="none"
        stroke="#2a2e32"
        strokeWidth="1"
      />

      {/* Concrete chamber walls (filled rect = inside) */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="url(#concretePattern)"
        stroke={ACCENT}
        strokeWidth="1.5"
        rx="2"
      />

      {/* Echo lines bouncing inside (damping reduces opacity) */}
      <g
        stroke={ACCENT}
        strokeWidth="0.5"
        strokeDasharray="2,2"
        opacity={1 - damping * 0.7}
      >
        <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + h - 4} />
        <line x1={x + w - 4} y1={y + 4} x2={x + 4} y2={y + h - 4} />
        <line x1={x + w / 2} y1={y + 2} x2={x + w / 2} y2={y + h - 2} />
      </g>

      {/* Absorption hatching on walls (denser with more damping) */}
      <g stroke="#666" strokeWidth="0.3" opacity={hatchOpacity}>
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`top-${i}`}
            x1={x + 4 + i * (w - 8) / 5}
            y1={y}
            x2={x + 4 + i * (w - 8) / 5}
            y2={y + 4}
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`bot-${i}`}
            x1={x + 4 + i * (w - 8) / 5}
            y1={y + h}
            x2={x + 4 + i * (w - 8) / 5}
            y2={y + h - 4}
          />
        ))}
      </g>

      {/* Two speaker icons */}
      <g>
        <rect x={sx1 - 3} y={sy - 8} width="6" height="10" fill="#0a0a0a" stroke={ACCENT} strokeWidth="0.5" rx="1" />
        <circle cx={sx1} cy={sy - 5} r="2" fill="#333" stroke={ACCENT} strokeWidth="0.4" />
        <rect x={sx2 - 3} y={sy - 8} width="6" height="10" fill="#0a0a0a" stroke={ACCENT} strokeWidth="0.5" rx="1" />
        <circle cx={sx2} cy={sy - 5} r="2" fill="#333" stroke={ACCENT} strokeWidth="0.4" />
      </g>

      {/* Dimensions caption */}
      <text
        x={cx}
        y={y - 4}
        fontSize="7"
        fontFamily="monospace"
        fill={ACCENT}
        textAnchor="middle"
      >
        {`${Math.round(w)} x ${Math.round(h)} cm`}
      </text>
    </svg>
  );
}

export default function ChamberReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(params || {}) });
  useEffect(() => {
    if (typeof onChange === "function") onChange(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 360,
        zIndex: 1000,
        fontFamily: "monospace",
      }}
    >
      <HardwarePanel skin="black-rack" accentColor={ACCENT} padding={14}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${ACCENT}33`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                color: ACCENT,
                textShadow: "0 1px 0 rgba(0,0,0,0.6)",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
              }}
            >
              CHAMBER
            </div>
            <div style={{ fontSize: 9, color: "#888", letterSpacing: 1 }}>
              ECHO CHAMBER REVERB
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#888",
              border: `1px solid ${ACCENT}55`,
              borderRadius: 3,
              fontSize: 14,
              cursor: "pointer",
              width: 24,
              height: 24,
              lineHeight: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Room diagram */}
        <div
          style={{
            background: BG,
            border: `1px solid ${ACCENT}33`,
            borderRadius: 4,
            padding: 6,
            marginBottom: 10,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <RoomDiagram decay={s.decay} damping={s.damping} />
        </div>

        {/* Top knob row: Decay / Damping / Color */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            marginBottom: 12,
            padding: "8px 4px",
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
          }}
        >
          <AnalogKnob
            value={s.decay}
            min={0.2}
            max={6}
            step={0.1}
            onChange={set("decay")}
            style="modern"
            size={56}
            color="#1a1e22"
            indicatorColor={ACCENT}
            accentColor={ACCENT}
            label="Decay"
            valueLabel={`${s.decay.toFixed(1)}s`}
          />
          <AnalogKnob
            value={s.damping}
            min={0}
            max={1}
            step={0.01}
            onChange={set("damping")}
            style="modern"
            size={56}
            color="#1a1e22"
            indicatorColor={ACCENT}
            accentColor={ACCENT}
            label="Damping"
            valueLabel={s.damping.toFixed(2)}
          />
          <AnalogKnob
            value={s.color}
            min={0}
            max={1}
            step={0.01}
            onChange={set("color")}
            style="modern"
            size={56}
            color="#1a1e22"
            indicatorColor={ACCENT}
            accentColor={ACCENT}
            label="Color"
            valueLabel={s.color.toFixed(2)}
          />
        </div>

        {/* Hero MIX knob */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 0",
            background:
              "linear-gradient(180deg, rgba(160,170,176,0.06), rgba(0,0,0,0.25))",
            borderRadius: 4,
            border: `1px solid ${ACCENT}33`,
          }}
        >
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            step={1}
            onChange={set("mix")}
            style="modern"
            size={84}
            color="#2a3036"
            indicatorColor="#fff"
            accentColor={ACCENT}
            label="Mix"
            valueLabel={`${Math.round(s.mix)}%`}
          />
          <div
            style={{
              marginTop: 4,
              fontSize: 8,
              letterSpacing: 2,
              color: "#888",
              textTransform: "uppercase",
            }}
          >
            Dry / Wet
          </div>
        </div>
      </HardwarePanel>
    </div>
  );
}
