// ============================================================
// VocalCompUI.js — Vocal-strip aesthetic
// Phase F4-A.7. Mic graphic, sibilance meter, dedicated De-Ess /
// Presence / Air knobs.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release,
//     deEss, presence, air, mix
//   }
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";

const PINK = "#aa4488";
const PINK_BRIGHT = "#cc66aa";
const SIBILANCE = "#ff8844";
const CREAM_DARK = "#3a2a18";

// Decorative SVG of a U87/SM7-style microphone. Stylized with grille + body.
const MicGraphic = ({ accent }) => {
  return (
    <svg width={80} height={150} viewBox="0 0 80 150" style={{ display: "block" }}>
      <defs>
        <linearGradient id="micBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#666" />
          <stop offset="50%" stopColor="#ccc" />
          <stop offset="100%" stopColor="#444" />
        </linearGradient>
        <radialGradient id="micGrille" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#888" />
          <stop offset="80%" stopColor="#3a3a3a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>
      </defs>

      {/* Top grille (capsule) — round mesh */}
      <ellipse cx="40" cy="42" rx="28" ry="34" fill="url(#micGrille)" stroke={accent} strokeWidth="1.5" />
      {/* Mesh pattern */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line
          key={`hl-${i}`}
          x1={14}
          y1={20 + i * 8}
          x2={66}
          y2={20 + i * 8}
          stroke="#1a1a1a"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={`vl-${i}`}
          x1={16 + i * 10}
          y1={12}
          x2={16 + i * 10}
          y2={72}
          stroke="#1a1a1a"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}

      {/* Logo plate on grille */}
      <rect x="32" y="38" width="16" height="8" fill="#0a0a0a" stroke={accent} strokeWidth="0.5" rx="1" />
      <text x="40" y="44" fontSize="5" fill={accent} textAnchor="middle" fontFamily="monospace" fontWeight="700">
        SPX
      </text>

      {/* Yoke */}
      <path
        d="M 12 60 L 12 80 L 68 80 L 68 60"
        stroke="#444"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Body */}
      <rect x="28" y="78" width="24" height="55" fill="url(#micBody)" stroke="#222" strokeWidth="1" rx="3" />
      {/* Body bands */}
      <line x1="28" y1="92" x2="52" y2="92" stroke="#1a1a1a" strokeWidth="0.5" />
      <line x1="28" y1="102" x2="52" y2="102" stroke="#1a1a1a" strokeWidth="0.5" />
      <line x1="28" y1="118" x2="52" y2="118" stroke="#1a1a1a" strokeWidth="0.5" />

      {/* XLR base */}
      <rect x="32" y="133" width="16" height="6" fill="#1a1a1a" rx="1" />
      <circle cx="40" cy="142" r="3" fill="#0a0a0a" stroke="#444" strokeWidth="0.5" />
    </svg>
  );
};

export default function VocalCompUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -16,
    ratio: 3,
    attack: 5,
    release: 80,
    deEss: 0.4,
    presence: 0.3,
    air: 0.2,
    mix: 100,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Sibilance reduction display (decorative). Higher de-ess = more reduction shown.
  const sibilanceTarget = Math.max(0, Math.min(1, s.deEss));

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 420,
        zIndex: 1000,
        filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 12px ${PINK}33)`,
      }}
    >
      <HardwarePanel skin="vintage-cream" accentColor={PINK} padding={14}>
        {/* Header — rounded sans-serif */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${PINK}55`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'Trebuchet MS', 'Helvetica', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                color: PINK,
                letterSpacing: 3,
                textShadow: `0 1px 0 #fff, 0 0 8px ${PINK}33`,
              }}
            >
              VOCAL COMP
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: CREAM_DARK,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body — split: mic on left (30%), knobs on right (70%) */}
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          {/* Left: mic graphic + sibilance meter */}
          <div
            style={{
              width: 110,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 10,
              padding: 8,
              background: "rgba(180,140,170,0.15)",
              border: `1px solid ${PINK}33`,
              borderRadius: 4,
            }}
          >
            <MicGraphic accent={PINK} />
            {/* Sibilance meter — small horizontal */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <LEDLadder
                value={sibilanceTarget}
                orientation="horizontal"
                segments={10}
                color={SIBILANCE}
                dimColor="#3a2010"
                width={90}
                height={14}
              />
              <div
                style={{
                  fontSize: 8,
                  color: CREAM_DARK,
                  letterSpacing: 1.5,
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                SIBILANCE
              </div>
            </div>
          </div>

          {/* Right: knob grid */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 8,
              padding: 8,
              background: "rgba(255,255,255,0.25)",
              border: `1px solid ${PINK}33`,
              borderRadius: 4,
            }}
          >
            <AnalogKnob
              value={s.threshold}
              min={-40}
              max={0}
              onChange={set("threshold")}
              style="vintage"
              size={52}
              color={CREAM_DARK}
              indicatorColor={PINK_BRIGHT}
              label="THRESH"
              valueLabel={`${s.threshold.toFixed(1)} dB`}
              step={0.1}
              accentColor={PINK}
            />
            <AnalogKnob
              value={s.ratio}
              min={1}
              max={20}
              onChange={set("ratio")}
              style="vintage"
              size={52}
              color={CREAM_DARK}
              indicatorColor={PINK_BRIGHT}
              label="RATIO"
              valueLabel={`${s.ratio.toFixed(1)}:1`}
              step={0.1}
              accentColor={PINK}
            />
            <AnalogKnob
              value={s.attack}
              min={0.1}
              max={100}
              onChange={set("attack")}
              style="vintage"
              size={52}
              color={CREAM_DARK}
              indicatorColor={PINK_BRIGHT}
              label="ATTACK"
              valueLabel={`${s.attack.toFixed(1)} ms`}
              step={0.1}
              accentColor={PINK}
            />
            <AnalogKnob
              value={s.release}
              min={10}
              max={2000}
              onChange={set("release")}
              style="vintage"
              size={52}
              color={CREAM_DARK}
              indicatorColor={PINK_BRIGHT}
              label="RELEASE"
              valueLabel={`${Math.round(s.release)} ms`}
              step={1}
              accentColor={PINK}
            />
            {/* Vocal-strip dedicated knobs */}
            <AnalogKnob
              value={s.deEss}
              min={0}
              max={1}
              onChange={set("deEss")}
              style="vintage"
              size={52}
              color={SIBILANCE}
              indicatorColor="#fff"
              label="DE-ESS"
              valueLabel={`${Math.round(s.deEss * 100)}%`}
              step={0.01}
              accentColor={SIBILANCE}
            />
            <AnalogKnob
              value={s.presence}
              min={0}
              max={1}
              onChange={set("presence")}
              style="vintage"
              size={52}
              color={PINK}
              indicatorColor="#fff"
              label="PRESENCE"
              valueLabel={`${Math.round(s.presence * 100)}%`}
              step={0.01}
              accentColor={PINK_BRIGHT}
            />
            <AnalogKnob
              value={s.air}
              min={0}
              max={1}
              onChange={set("air")}
              style="vintage"
              size={52}
              color={PINK_BRIGHT}
              indicatorColor="#fff"
              label="AIR"
              valueLabel={`${Math.round(s.air * 100)}%`}
              step={0.01}
              accentColor={PINK_BRIGHT}
            />
            <AnalogKnob
              value={s.mix}
              min={0}
              max={100}
              onChange={set("mix")}
              style="vintage"
              size={52}
              color={CREAM_DARK}
              indicatorColor={PINK_BRIGHT}
              label="MIX"
              valueLabel={`${Math.round(s.mix)}%`}
              step={1}
              accentColor={PINK}
            />
          </div>
        </div>

        {/* Footer ID strip */}
        <div
          style={{
            marginTop: 4,
            fontSize: 8,
            color: PINK,
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "monospace",
            opacity: 0.8,
          }}
        >
          SPX · VOCAL STRIP · COMP+DE-ESS+TONE
        </div>
      </HardwarePanel>
    </div>
  );
}
