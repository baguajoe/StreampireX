// ============================================================
// VintageAirUI2.js — Tape-machine reverb (vintage 224-style)
// Hardware-styled reverb UI. Built on shared HardwareUI primitives.
// ============================================================
//
// Aesthetic: dark-wood / brass tape-machine bezel. Two spinning
// reels, large analog VU meter, chickenhead knobs.
//
// DSP keys (matching PLUGIN_DEFAULTS.vintageAir):
//   { preDelay, decay, diffusion, damping, earlyLevel, lateLevel,
//     hpf, lpf, mix, tapeWow, flutter, bias }
//
// "2" suffix: existing VintageAirUI lives in SPXPlugins.js.
// Orchestrator swaps the import after Batch B ships.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import VUMeter from "../HardwareUI/VUMeter";
import useAnalyserValue from "../HardwareUI/useAnalyserValue";

const ACCENT = "#cc6611"; // orange/amber
const DEFAULTS = {
  preDelay: 20,
  decay: 1.8,
  diffusion: 0.8,
  damping: 0.5,
  earlyLevel: 0.7,
  lateLevel: 0.8,
  hpf: 80,
  lpf: 8000,
  mix: 0,
  tapeWow: 0.3,
  flutter: 0.2,
  bias: 0.5,
};

// Spinning reel with brass center hub
function TapeReel({ speed = 1, size = 60, label = "" }) {
  const [angle, setAngle] = useState(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    let mounted = true;
    let last = performance.now();
    let raf = 0;
    const tick = (now) => {
      if (!mounted) return;
      const dt = now - last;
      last = now;
      // Speed range 0..1 -> rpm 6..120 (degrees per ms)
      const dps = 0.06 + speedRef.current * 0.6;
      setAngle((a) => (a + dps * dt) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const r = size / 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={`reel-${size}-${label}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3a2410" />
            <stop offset="80%" stopColor="#1a0e04" />
            <stop offset="100%" stopColor="#0a0500" />
          </radialGradient>
          <radialGradient id={`hub-${size}-${label}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#f0c060" />
            <stop offset="60%" stopColor="#cc8822" />
            <stop offset="100%" stopColor="#5a3a0a" />
          </radialGradient>
        </defs>

        {/* Outer rim */}
        <circle cx={r} cy={r} r={r - 1} fill="#0a0500" stroke="#5a3a0a" strokeWidth="1" />
        {/* Reel body */}
        <circle cx={r} cy={r} r={r - 3} fill={`url(#reel-${size}-${label})`} />

        {/* Spokes (rotating) */}
        <g transform={`rotate(${angle} ${r} ${r})`}>
          {Array.from({ length: 3 }).map((_, i) => {
            const a = (i * 120) * (Math.PI / 180);
            const x1 = r + Math.cos(a) * (r * 0.25);
            const y1 = r + Math.sin(a) * (r * 0.25);
            const x2 = r + Math.cos(a) * (r * 0.75);
            const y2 = r + Math.sin(a) * (r * 0.75);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#1a0a04"
                strokeWidth={Math.max(2, size * 0.05)}
                strokeLinecap="round"
              />
            );
          })}
          {/* Holes between spokes */}
          {Array.from({ length: 3 }).map((_, i) => {
            const a = ((i * 120) + 60) * (Math.PI / 180);
            const cx = r + Math.cos(a) * (r * 0.5);
            const cy = r + Math.sin(a) * (r * 0.5);
            return (
              <circle
                key={`h-${i}`}
                cx={cx}
                cy={cy}
                r={r * 0.1}
                fill="#0a0500"
                stroke="#3a2410"
                strokeWidth="0.5"
              />
            );
          })}
        </g>

        {/* Brass center hub */}
        <circle cx={r} cy={r} r={r * 0.22} fill={`url(#hub-${size}-${label})`} stroke="#3a2410" strokeWidth="0.8" />
        <circle cx={r} cy={r} r={r * 0.06} fill="#3a2410" />
      </svg>
      {label ? (
        <div
          style={{
            fontSize: 8,
            color: "#cc8822",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

export default function VintageAirUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(params || {}) });
  useEffect(() => {
    if (typeof onChange === "function") onChange(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const vu = useAnalyserValue(() => getInstance && getInstance()?.meters?.analyserOut);

  // Reel speed scales with tapeWow (1 = nominal speed)
  const reelSpeed = Math.max(0.05, Math.min(1, 0.2 + s.tapeWow * 0.8));

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
      <HardwarePanel skin="wood" accentColor={ACCENT} padding={14}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${ACCENT}66`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 4,
                color: "#f0d8a8",
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                textShadow:
                  "0 1px 0 rgba(0,0,0,0.6), 0 0 8px rgba(204,102,17,0.4)",
              }}
            >
              VINTAGE AIR
            </div>
            <div
              style={{
                fontSize: 8,
                color: ACCENT,
                letterSpacing: 3,
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
              }}
            >
              MODEL 224 — TAPE REVERB
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.4)",
              color: "#f0d8a8",
              border: `1px solid ${ACCENT}99`,
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

        {/* Top row: reel + VU + reel */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            padding: 10,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 100%)",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.6)",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          <TapeReel speed={reelSpeed} size={70} label="SUPPLY" />
          <VUMeter
            value={vu}
            min={-20}
            max={3}
            width={140}
            height={86}
            color="#222"
            bezelColor="#1a0a04"
            faceColor="#f0d8a8"
            label="OUTPUT"
          />
          <TapeReel speed={reelSpeed} size={70} label="TAKE-UP" />
        </div>

        {/* Tape character knobs (chickenhead) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
            marginBottom: 10,
            padding: 8,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.5)",
          }}
        >
          <AnalogKnob
            value={s.decay}
            min={0.2}
            max={6}
            step={0.1}
            onChange={set("decay")}
            style="chickenhead"
            size={42}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="Decay"
            valueLabel={`${s.decay.toFixed(1)}s`}
          />
          <AnalogKnob
            value={s.tapeWow}
            min={0}
            max={1}
            step={0.01}
            onChange={set("tapeWow")}
            style="chickenhead"
            size={42}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="Wow"
            valueLabel={s.tapeWow.toFixed(2)}
          />
          <AnalogKnob
            value={s.flutter}
            min={0}
            max={1}
            step={0.01}
            onChange={set("flutter")}
            style="chickenhead"
            size={42}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="Flutter"
            valueLabel={s.flutter.toFixed(2)}
          />
          <AnalogKnob
            value={s.bias}
            min={0}
            max={1}
            step={0.01}
            onChange={set("bias")}
            style="chickenhead"
            size={42}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="Bias"
            valueLabel={s.bias.toFixed(2)}
          />
        </div>

        {/* Reverb base knob row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 4,
            padding: 8,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
            border: "1px solid rgba(0,0,0,0.4)",
          }}
        >
          <AnalogKnob
            value={s.preDelay}
            min={0}
            max={200}
            step={1}
            onChange={set("preDelay")}
            style="chickenhead"
            size={44}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="PreDly"
            valueLabel={`${Math.round(s.preDelay)}ms`}
          />
          <AnalogKnob
            value={s.damping}
            min={0}
            max={1}
            step={0.01}
            onChange={set("damping")}
            style="chickenhead"
            size={44}
            color="#1a0a04"
            indicatorColor="#f0d8a8"
            accentColor={ACCENT}
            label="Damp"
            valueLabel={s.damping.toFixed(2)}
          />
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            step={1}
            onChange={set("mix")}
            style="chickenhead"
            size={44}
            color="#3a1a04"
            indicatorColor="#fff"
            accentColor={ACCENT}
            label="Mix"
            valueLabel={`${Math.round(s.mix)}%`}
          />
        </div>

        {/* Brass corner footer */}
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
            fontSize: 8,
            color: ACCENT,
            letterSpacing: 4,
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            opacity: 0.7,
          }}
        >
          STUDIO ELECTRONICS · MFG. USA
        </div>
      </HardwarePanel>
    </div>
  );
}
