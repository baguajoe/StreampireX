// ============================================================
// HallReverbUI.js — Cathedral-aesthetic hall reverb UI.
// Phase F4-A.7. Replaces the GenericPlaceholderUI wrapper that
// SPXPlugins.js currently aliases for the "hall" plugin.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: { decay, preDelay, damping, hfDamping, width, mix }
//   - SPXPluginHost diffs the merged object pushed via onChange
//     and dispatches per-param updates to AudioParams.
//   - onClose() hides the panel.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";

const GOLD = "#d4a64a";
const GOLD_DEEP = "#a07820";
const BLUE = "#3a78ff";
const BLUE_DEEP = "#1a3580";

// IR decay-tail visualizer. Renders an exponential envelope sampled
// with a sparse random noise floor, scaled by `decay` (longer = wider
// envelope) and `damping` (more damping = faster early roll-off).
// Decorative — no audio analysis path.
const IRWaveform = ({ decay, damping }) => {
  const W = 320;
  const H = 60;
  const samples = 96;
  // RT60-ish: envelope = exp(-3*ln10 * t / decay), t normalized 0..1 over visual width.
  // We then add damping-driven extra HF roll-off via an additional decay term.
  const ln10x3 = 6.9077;
  const baseDecay = Math.max(0.6, decay) / 4.0; // visual scale
  const dampingTerm = 0.5 + damping * 1.5;
  const points = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const env = Math.exp(-ln10x3 * t * dampingTerm / baseDecay);
    // pseudo-random "tail" texture seeded by index so it doesn't reflow
    const seed = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    const noise = (seed - Math.floor(seed)) * 2 - 1; // -1..+1
    const a = noise * env;
    const y = H / 2 - a * (H / 2 - 4);
    points.push([i * (W / (samples - 1)), y]);
  }
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  // Top envelope curve (smooth)
  const envPoints = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const env = Math.exp(-ln10x3 * t * dampingTerm / baseDecay);
    envPoints.push([i * (W / (samples - 1)), H / 2 - env * (H / 2 - 4)]);
  }
  const envPath = envPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="hallIRBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1430" />
          <stop offset="100%" stopColor="#04081a" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#hallIRBg)" stroke={GOLD_DEEP} strokeWidth="1" />
      {/* Center axis */}
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#1a2860" strokeWidth="0.5" />
      {/* Tail texture */}
      <path d={path} stroke={BLUE} strokeWidth="0.75" fill="none" opacity="0.7" />
      {/* Envelope outline (gold) */}
      <path d={envPath} stroke={GOLD} strokeWidth="1.25" fill="none" />
    </svg>
  );
};

export default function HallReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    decay: 2.4, preDelay: 20, damping: 0.4, hfDamping: 0.5, width: 1.0, mix: 25,
    ...(params || {}),
  });
  useEffect(() => { onChange && onChange(s); }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ position: "fixed", top: 80, right: 24, width: 360, zIndex: 1000,
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))" }}>
      <HardwarePanel skin="black-rack" accentColor={BLUE_DEEP} padding={14}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${GOLD_DEEP}55` }}>
          <div>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700,
                           fontSize: 22, color: GOLD, letterSpacing: 4,
                           textShadow: `0 0 6px ${GOLD}55, 0 1px 0 #000` }}>
              HALL
            </span>
            <span style={{ marginLeft: 10, fontSize: 9, color: "#6a8aff",
                           letterSpacing: 2, textTransform: "uppercase" }}>
              cathedral
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "#aaa",
            border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* IR decay tail display */}
        <div style={{ marginBottom: 10, borderRadius: 3, overflow: "hidden",
                      boxShadow: "inset 0 1px 4px rgba(0,0,0,0.7)" }}>
          <IRWaveform decay={s.decay} damping={s.damping} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9,
                       color: "#88a0d8", marginBottom: 12, fontFamily: "monospace",
                       letterSpacing: 1 }}>
          <span>IR · DECAY TAIL</span>
          <span>{s.decay.toFixed(2)}s</span>
        </div>

        {/* 5-knob row: small vintage knobs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                       padding: "8px 4px", marginBottom: 12,
                       background: "rgba(0,0,0,0.25)", borderRadius: 3,
                       border: `1px solid ${BLUE_DEEP}` }}>
          <AnalogKnob value={s.decay} min={0.2} max={8} onChange={set("decay")} style="vintage"
            size={56} color="#1a2240" indicatorColor={GOLD} label="DECAY"
            valueLabel={`${s.decay.toFixed(2)}s`} step={0.01} accentColor={BLUE} />
          <AnalogKnob value={s.preDelay} min={0} max={150} onChange={set("preDelay")} style="vintage"
            size={56} color="#1a2240" indicatorColor={GOLD} label="PRE-DLY"
            valueLabel={`${Math.round(s.preDelay)}ms`} step={1} accentColor={BLUE} />
          <AnalogKnob value={s.damping} min={0} max={1} onChange={set("damping")} style="vintage"
            size={56} color="#1a2240" indicatorColor={GOLD} label="DAMP"
            valueLabel={`${Math.round(s.damping * 100)}%`} step={0.01} accentColor={BLUE} />
          <AnalogKnob value={s.hfDamping} min={0} max={1} onChange={set("hfDamping")} style="vintage"
            size={56} color="#1a2240" indicatorColor={GOLD} label="HF DAMP"
            valueLabel={`${Math.round(s.hfDamping * 100)}%`} step={0.01} accentColor={BLUE} />
          <AnalogKnob value={s.width} min={0} max={1.5} onChange={set("width")} style="vintage"
            size={56} color="#1a2240" indicatorColor={GOLD} label="WIDTH"
            valueLabel={`${Math.round(s.width * 100)}%`} step={0.01} accentColor={BLUE} />
        </div>

        {/* Mix knob — large, gold center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                       padding: "10px 0 4px",
                       background: "rgba(0,0,0,0.35)", borderRadius: 4,
                       border: `1px solid ${GOLD_DEEP}` }}>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 2, marginBottom: 6,
                         textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
            DRY · WET MIX
          </div>
          <AnalogKnob value={s.mix} min={0} max={100} onChange={set("mix")} style="vintage"
            size={72} color="#2a1a08" indicatorColor={GOLD} label="MIX"
            valueLabel={`${Math.round(s.mix)}%`} step={1} accentColor={GOLD} />
        </div>

        {/* Footer ID strip */}
        <div style={{ marginTop: 10, fontSize: 8, color: "#6a8aff",
                       letterSpacing: 3, textAlign: "center", fontFamily: "monospace" }}>
          SPX · HALL REVERB · MK I
        </div>
      </HardwarePanel>
    </div>
  );
}
