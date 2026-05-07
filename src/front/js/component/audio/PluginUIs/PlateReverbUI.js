// ============================================================
// PlateReverbUI.js — Studio-plate aesthetic reverb UI.
// Phase F4-A.7. Replaces the GenericPlaceholderUI wrapper that
// SPXPlugins.js currently aliases for the "plate" plugin.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: { decay, preDelay, diffusion, damping, brightness, mix }
//   - SPXPluginHost diffs the merged object pushed via onChange
//     and dispatches per-param updates to AudioParams.
//   - onClose() hides the panel.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";

const SILVER = "#bbbbbb";
const SILVER_DARK = "#666";
const CHROME_HI = "#e8e8e8";

// Plate vibration: a steel-plate rectangle with a faint shimmer overlay.
// Intensity is driven by `mix * decay` (more wet + longer tail = more
// visible vibration). Uses requestAnimationFrame at ~60Hz, capped to
// minimal CSS work (translate + opacity).
const PlateShimmer = ({ mix, decay }) => {
  const ref = useRef(null);
  const overlayRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const intensity = Math.min(1, (mix / 100) * Math.min(1, decay / 4));
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      // Two phase oscillators for shimmer + drift
      const sx = Math.sin(t * 18.7) * 0.6 + Math.sin(t * 7.3) * 0.4;
      const sy = Math.cos(t * 22.1) * 0.6 + Math.cos(t * 5.1) * 0.4;
      const dx = sx * intensity * 1.4;
      const dy = sy * intensity * 1.4;
      const op = 0.45 + Math.abs(sx) * 0.35 * intensity;
      if (ref.current) {
        ref.current.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      }
      if (overlayRef.current) {
        overlayRef.current.style.opacity = op.toFixed(3);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [mix, decay]);

  const W = 320;
  const H = 56;
  return (
    <div style={{ position: "relative", width: W, height: H, overflow: "hidden",
                   borderRadius: 3, background: "#1a1a1a",
                   boxShadow: "inset 0 1px 4px rgba(0,0,0,0.7)" }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="plateBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9a9a9a" />
              <stop offset="50%" stopColor="#d8d8d8" />
              <stop offset="100%" stopColor="#5a5a5a" />
            </linearGradient>
            <pattern id="plateBrush" width="3" height="56" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="56" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              <line x1="1.5" y1="0" x2="1.5" y2="56" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="6" y="4" width={W - 12} height={H - 8} fill="url(#plateBody)" stroke="#2a2a2a" strokeWidth="1" />
          <rect x="6" y="4" width={W - 12} height={H - 8} fill="url(#plateBrush)" />
          {/* corner mounts */}
          <circle cx="14" cy="12" r="2" fill="#2a2a2a" />
          <circle cx={W - 14} cy="12" r="2" fill="#2a2a2a" />
          <circle cx="14" cy={H - 12} r="2" fill="#2a2a2a" />
          <circle cx={W - 14} cy={H - 12} r="2" fill="#2a2a2a" />
        </svg>
      </div>
      {/* Shimmer overlay: a low-opacity radial highlight that pulses */}
      <div ref={overlayRef} style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.55) 0%, transparent 55%)",
        pointerEvents: "none", mixBlendMode: "screen",
      }} />
    </div>
  );
};

export default function PlateReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    decay: 1.8, preDelay: 12, diffusion: 0.85, damping: 0.4, brightness: 0.6, mix: 25,
    ...(params || {}),
  });
  useEffect(() => { onChange && onChange(s); }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ position: "fixed", top: 80, right: 24, width: 360, zIndex: 1000,
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.55))" }}>
      <HardwarePanel skin="brushed-metal" accentColor={SILVER_DARK} padding={14}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
          <div>
            <span style={{
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              fontWeight: 200, fontSize: 24, letterSpacing: 8,
              color: "#1a1a1a",
              background: `linear-gradient(180deg, ${CHROME_HI} 0%, #888 50%, #2a2a2a 51%, #888 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "0 1px 0 rgba(255,255,255,0.4)",
            }}>
              PLATE
            </span>
            <span style={{ marginLeft: 10, fontSize: 9, color: "#444",
                           letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              studio
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: "#222",
            border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1, fontWeight: 700 }}>×</button>
        </div>

        {/* Plate vibration animation */}
        <div style={{ marginBottom: 6 }}>
          <PlateShimmer mix={s.mix} decay={s.decay} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9,
                       color: "#222", marginBottom: 12, fontFamily: "monospace",
                       letterSpacing: 1, fontWeight: 600 }}>
          <span>STEEL PLATE · 0.5mm</span>
          <span>{s.decay.toFixed(2)}s · {Math.round(s.mix)}%</span>
        </div>

        {/* 5-knob row: modern silver knobs */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                       padding: "10px 4px", marginBottom: 12,
                       background: "rgba(0,0,0,0.15)", borderRadius: 3,
                       border: "1px solid rgba(0,0,0,0.3)",
                       boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
          <AnalogKnob value={s.decay} min={0.2} max={6} onChange={set("decay")} style="modern"
            size={52} color="#2a2a2a" indicatorColor={CHROME_HI} label="DECAY"
            valueLabel={`${s.decay.toFixed(2)}s`} step={0.01} accentColor={SILVER} />
          <AnalogKnob value={s.preDelay} min={0} max={120} onChange={set("preDelay")} style="modern"
            size={52} color="#2a2a2a" indicatorColor={CHROME_HI} label="PRE-DLY"
            valueLabel={`${Math.round(s.preDelay)}ms`} step={1} accentColor={SILVER} />
          <AnalogKnob value={s.diffusion} min={0} max={1} onChange={set("diffusion")} style="modern"
            size={52} color="#2a2a2a" indicatorColor={CHROME_HI} label="DIFFUSE"
            valueLabel={`${Math.round(s.diffusion * 100)}%`} step={0.01} accentColor={SILVER} />
          <AnalogKnob value={s.damping} min={0} max={1} onChange={set("damping")} style="modern"
            size={52} color="#2a2a2a" indicatorColor={CHROME_HI} label="DAMP"
            valueLabel={`${Math.round(s.damping * 100)}%`} step={0.01} accentColor={SILVER} />
          <AnalogKnob value={s.brightness} min={0} max={1} onChange={set("brightness")} style="modern"
            size={52} color="#2a2a2a" indicatorColor={CHROME_HI} label="BRIGHT"
            valueLabel={`${Math.round(s.brightness * 100)}%`} step={0.01} accentColor={SILVER} />
        </div>

        {/* Mix knob — large, chrome */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                       padding: "10px 0 4px",
                       background: "linear-gradient(180deg, #555 0%, #888 50%, #555 100%)",
                       borderRadius: 4,
                       border: "1px solid #2a2a2a",
                       boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 9, color: "#1a1a1a", letterSpacing: 2, marginBottom: 6,
                         textTransform: "uppercase", fontWeight: 700, fontFamily: "monospace" }}>
            DRY · WET
          </div>
          <AnalogKnob value={s.mix} min={0} max={100} onChange={set("mix")} style="modern"
            size={72} color="#1a1a1a" indicatorColor={CHROME_HI} label="MIX"
            valueLabel={`${Math.round(s.mix)}%`} step={1} accentColor={CHROME_HI} />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 10, fontSize: 8, color: "#444",
                       letterSpacing: 3, textAlign: "center", fontFamily: "monospace",
                       fontWeight: 600 }}>
          SPX · PLATE REVERB · STUDIO SERIES
        </div>
      </HardwarePanel>
    </div>
  );
}
