// ============================================================
// SpringReverbUI.js — Vintage-amp spring reverb UI.
// Phase F4-A.7. Replaces the GenericPlaceholderUI wrapper that
// SPXPlugins.js currently aliases for the "spring" plugin.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: { decay, springs, tone, boing, mix }
//   - SPXPluginHost diffs the merged object pushed via onChange
//     and dispatches per-param updates to AudioParams.
//   - onClose() hides the panel.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import ButtonBank from "../HardwareUI/ButtonBank";

const ORANGE = "#cc6622";
const ORANGE_HI = "#e88a44";
const BROWN = "#3a1f10";

// Animated spring graphic: 3 horizontal coiled springs that vibrate
// based on `boing` (amplitude) and current `springs` count (fades the
// extras out). Path is a sine-modulated polyline; phase advances on rAF.
const SpringTank = ({ boing, springsCount }) => {
  const pathsRef = useRef([null, null, null]);
  const rafRef = useRef(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const tick = () => {
      const t = (performance.now() - startRef.current) / 1000;
      const W = 320;
      const segments = 60;
      // Per-spring base parameters: count of coils + frequency drift
      const baseFreqs = [11, 13, 9];
      const phaseOffsets = [0, 1.7, 3.3];
      for (let s = 0; s < 3; s++) {
        const el = pathsRef.current[s];
        if (!el) continue;
        const visible = s < springsCount;
        if (!visible) {
          el.setAttribute("opacity", "0.15");
          continue;
        }
        el.setAttribute("opacity", "1");
        const amp = 3.5 + boing * 7.5;
        const f = baseFreqs[s];
        const phase = t * 6 + phaseOffsets[s];
        let d = "";
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * W;
          // coil envelope: amplitude tapers slightly at ends
          const envEnds = Math.sin(Math.PI * (i / segments));
          // primary coil oscillation (fast) + slow vibration (slow)
          const coil = Math.sin((i / segments) * Math.PI * 2 * f);
          const vib = Math.sin((i / segments) * 4 + phase) * 0.6;
          const y = (coil * envEnds + vib) * amp;
          d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(2)} `;
        }
        el.setAttribute("d", d);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [boing, springsCount]);

  const W = 320;
  const H = 90;
  const yPositions = [22, 45, 68];
  return (
    <div style={{ width: W, height: H, background: "#1a0a04",
                   border: `1px solid ${BROWN}`, borderRadius: 3,
                   boxShadow: "inset 0 1px 4px rgba(0,0,0,0.7)",
                   overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="springWire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE_HI} />
            <stop offset="50%" stopColor={ORANGE} />
            <stop offset="100%" stopColor="#7a3010" />
          </linearGradient>
        </defs>
        {/* End-mount brackets */}
        <rect x="0" y="0" width="6" height={H} fill="#2a1408" />
        <rect x={W - 6} y="0" width="6" height={H} fill="#2a1408" />
        {/* Each spring rendered inside its own translated group; the
            <path> inside is animated via setAttribute. */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(0 ${yPositions[i]})`}>
            <path
              ref={(el) => { pathsRef.current[i] = el; }}
              stroke="url(#springWire)"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              opacity="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default function SpringReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    decay: 1.4, springs: 3, tone: 0.55, boing: 0.35, mix: 25,
    ...(params || {}),
  });
  useEffect(() => { onChange && onChange(s); }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ position: "fixed", top: 80, right: 24, width: 360, zIndex: 1000,
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.65))" }}>
      <HardwarePanel skin="vintage-cream" accentColor={BROWN} padding={14}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${ORANGE}55` }}>
          <div>
            <span style={{
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              fontWeight: 900, fontSize: 24, letterSpacing: 4,
              color: ORANGE,
              textShadow: `1px 1px 0 #2a1408, 2px 2px 0 rgba(0,0,0,0.4)`,
            }}>
              SPRING
            </span>
            <span style={{ marginLeft: 10, fontSize: 9, color: BROWN,
                           letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
              tube · tank
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: BROWN,
            border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1, fontWeight: 700 }}>×</button>
        </div>

        {/* Spring tank animation */}
        <div style={{ marginBottom: 6 }}>
          <SpringTank boing={s.boing} springsCount={s.springs} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9,
                       color: BROWN, marginBottom: 12, fontFamily: "monospace",
                       letterSpacing: 1, fontWeight: 700 }}>
          <span>TANK · {s.springs} SPRING{s.springs > 1 ? "S" : ""}</span>
          <span>BOING {Math.round(s.boing * 100)}%</span>
        </div>

        {/* Springs ButtonBank */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <ButtonBank
            options={[
              { value: 1, label: "1" },
              { value: 2, label: "2" },
              { value: 3, label: "3" },
            ]}
            value={s.springs}
            onChange={set("springs")}
            style="hardware"
            size={28}
            accentColor={ORANGE_HI}
          />
        </div>

        {/* 4-knob row: chickenhead orange knobs */}
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end",
                       padding: "12px 4px", marginBottom: 8,
                       background: "rgba(0,0,0,0.08)", borderRadius: 4,
                       border: `1px solid ${BROWN}55` }}>
          <AnalogKnob value={s.decay} min={0.2} max={5} onChange={set("decay")} style="chickenhead"
            size={56} color="#1a0a04" indicatorColor={ORANGE_HI} label="DECAY"
            valueLabel={`${s.decay.toFixed(2)}s`} step={0.01} />
          <AnalogKnob value={s.tone} min={0} max={1} onChange={set("tone")} style="chickenhead"
            size={56} color="#1a0a04" indicatorColor={ORANGE_HI} label="TONE"
            valueLabel={`${Math.round(s.tone * 100)}%`} step={0.01} />
          <AnalogKnob value={s.boing} min={0} max={1} onChange={set("boing")} style="chickenhead"
            size={56} color="#1a0a04" indicatorColor={ORANGE_HI} label="BOING"
            valueLabel={`${Math.round(s.boing * 100)}%`} step={0.01} />
          <AnalogKnob value={s.mix} min={0} max={100} onChange={set("mix")} style="chickenhead"
            size={56} color="#1a0a04" indicatorColor={ORANGE_HI} label="MIX"
            valueLabel={`${Math.round(s.mix)}%`} step={1} />
        </div>

        {/* Footer ID strip — vintage amp tag */}
        <div style={{ marginTop: 10, fontSize: 8, color: BROWN,
                       letterSpacing: 3, textAlign: "center", fontFamily: "monospace",
                       fontWeight: 700 }}>
          SPX · SPRING REVERB · MODEL S-3
        </div>
      </HardwarePanel>
    </div>
  );
}
