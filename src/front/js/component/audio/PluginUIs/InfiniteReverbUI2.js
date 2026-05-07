// ============================================================
// InfiniteReverbUI2.js — Cosmic infinity-tail reverb
// Hardware-styled reverb UI. Built on shared HardwareUI primitives.
// ============================================================
//
// Aesthetic: cosmic deep purple/black with scattered stars and a
// large pulsing infinity symbol (∞) that freezes solid when
// `freeze=true`.
//
// DSP keys (matching PLUGIN_DEFAULTS.infiniteReverb):
//   { freeze: false, roomSize: 0.9, damping: 0.3, mix: 0, shimmer: 0 }
//
// "2" suffix: existing InfiniteReverbUI may exist; orchestrator
// swaps the import after Batch B ships.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import ButtonBank from "../HardwareUI/ButtonBank";

const ACCENT = "#a040ff"; // deep purple
const DEFAULTS = {
  freeze: false,
  roomSize: 0.9,
  damping: 0.3,
  mix: 0,
  shimmer: 0,
};

// SVG star scatter — generated once
function StarField({ count = 30 }) {
  const stars = useRef(null);
  if (!stars.current) {
    stars.current = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 0.4 + Math.random() * 1.4,
      a: 0.3 + Math.random() * 0.7,
      // pre-randomize per-star phase so twinkle is desynchronized
      phase: Math.random() * Math.PI * 2,
      key: `s-${i}`,
    }));
  }
  return (
    <>
      {stars.current.map((st) => (
        <circle
          key={st.key}
          cx={`${st.x}%`}
          cy={`${st.y}%`}
          r={st.r}
          fill="#ffffff"
          opacity={st.a}
          style={{
            animation: `infTwinkle 3s ease-in-out infinite`,
            animationDelay: `${st.phase}s`,
          }}
        />
      ))}
    </>
  );
}

// Pulsing infinity symbol
function InfinityVis({ frozen = false, decayN = 0.5 }) {
  // decayN 0..1 controls pulse speed and brightness amplitude.
  const speed = 1.5 + (1 - decayN) * 2; // shorter = faster pulse
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: 6,
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(160,64,255,0.18) 0%, rgba(20,0,40,0.7) 70%, rgba(10,10,48,0.95) 100%)",
        border: "1px solid rgba(160,64,255,0.3)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 120"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Stars */}
        <StarField count={40} />

        {/* Infinity glyph (figure-8 path) */}
        <defs>
          <filter id="infiniteGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="infiniteStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c080ff" />
            <stop offset="50%" stopColor="#a040ff" />
            <stop offset="100%" stopColor="#6020a0" />
          </linearGradient>
        </defs>

        <g
          style={{
            animation: frozen
              ? "none"
              : `infPulse ${speed}s ease-in-out infinite`,
            transformOrigin: "100px 60px",
          }}
        >
          {/* Outer halo path */}
          <path
            d="M 60 60 C 60 30, 100 30, 100 60 C 100 90, 140 90, 140 60 C 140 30, 100 30, 100 60 C 100 90, 60 90, 60 60 Z"
            fill="none"
            stroke="url(#infiniteStroke)"
            strokeWidth={frozen ? 6 : 4}
            strokeLinecap="round"
            filter="url(#infiniteGlow)"
            opacity={frozen ? 1 : 0.85}
          />
          {/* Inner core path */}
          <path
            d="M 60 60 C 60 30, 100 30, 100 60 C 100 90, 140 90, 140 60 C 140 30, 100 30, 100 60 C 100 90, 60 90, 60 60 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth={frozen ? 2.5 : 1.5}
            strokeLinecap="round"
            opacity={frozen ? 1 : 0.7}
          />
        </g>

        {/* Frozen badge */}
        {frozen ? (
          <text
            x="100"
            y="110"
            fontSize="10"
            fontFamily="monospace"
            fill="#fff"
            textAnchor="middle"
            letterSpacing="3"
            style={{
              textShadow: `0 0 6px ${ACCENT}, 0 0 12px ${ACCENT}`,
            }}
          >
            * FROZEN *
          </text>
        ) : null}
      </svg>

      {/* Inline keyframes — defined once via style tag */}
      <style>
        {`
          @keyframes infPulse {
            0%, 100% { opacity: 0.7; transform: scale(0.97); }
            50% { opacity: 1; transform: scale(1.03); }
          }
          @keyframes infTwinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default function InfiniteReverbUI2({ params, onChange, onClose }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(params || {}) });
  useEffect(() => {
    if (typeof onChange === "function") onChange(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // decayN proxy: roomSize controls visual pulse rate (bigger = slower)
  const decayN = Math.max(0, Math.min(1, s.roomSize));

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
      <div
        style={{
          position: "relative",
          borderRadius: 6,
          background:
            "radial-gradient(ellipse at 50% 30%, #2a0040 0%, #150030 50%, #0a0a30 100%)",
          boxShadow: `0 6px 18px rgba(0,0,0,0.7), 0 0 20px ${ACCENT}33`,
        }}
      >
        <HardwarePanel skin="black-rack" accentColor={ACCENT} padding={14}>
          {/* Cosmic background overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 6,
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(160,64,255,0.18) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(96,32,160,0.22) 0%, transparent 50%), linear-gradient(180deg, rgba(10,0,30,0.6) 0%, rgba(10,10,48,0.85) 100%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 2 }}>
            {/* Header — INFINITE with stars */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: `1px solid ${ACCENT}55`,
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                {/* Tiny scattered dots behind label */}
                <svg
                  width="160"
                  height="36"
                  viewBox="0 0 160 36"
                  style={{
                    position: "absolute",
                    top: -2,
                    left: -4,
                    pointerEvents: "none",
                  }}
                >
                  <circle cx="8" cy="6" r="1" fill="#fff" opacity="0.6" />
                  <circle cx="22" cy="14" r="0.8" fill={ACCENT} opacity="0.8" />
                  <circle cx="120" cy="4" r="0.7" fill="#fff" opacity="0.5" />
                  <circle cx="140" cy="20" r="1" fill={ACCENT} opacity="0.7" />
                  <circle cx="155" cy="8" r="0.5" fill="#fff" opacity="0.6" />
                  <circle cx="60" cy="2" r="0.6" fill="#fff" opacity="0.5" />
                </svg>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 6,
                    color: "#fff",
                    textShadow: `0 0 8px ${ACCENT}, 0 0 16px ${ACCENT}99`,
                    fontFamily: "'Helvetica Neue', Arial, sans-serif",
                    position: "relative",
                  }}
                >
                  INFINITE
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "#c080ff",
                    letterSpacing: 4,
                    marginTop: -2,
                  }}
                >
                  COSMIC TAIL REVERB
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(0,0,0,0.4)",
                  color: "#fff",
                  border: `1px solid ${ACCENT}99`,
                  borderRadius: "50%",
                  fontSize: 14,
                  cursor: "pointer",
                  width: 24,
                  height: 24,
                  lineHeight: 0,
                  boxShadow: `0 0 6px ${ACCENT}66`,
                }}
              >
                ×
              </button>
            </div>

            {/* Infinity visualization */}
            <div style={{ marginBottom: 12 }}>
              <InfinityVis frozen={s.freeze} decayN={decayN} />
            </div>

            {/* Freeze toggle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <ButtonBank
                options={[
                  { value: false, label: "FREE" },
                  { value: true, label: "❄ FREEZE" },
                ]}
                value={s.freeze}
                onChange={set("freeze")}
                style="hardware"
                size={32}
                accentColor={s.freeze ? "#80c0ff" : ACCENT}
              />
            </div>

            {/* Knob row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
                padding: 10,
                background: "rgba(0,0,0,0.4)",
                borderRadius: 4,
                border: `1px solid ${ACCENT}33`,
              }}
            >
              <AnalogKnob
                value={s.roomSize}
                min={0}
                max={1}
                step={0.01}
                onChange={set("roomSize")}
                style="modern"
                size={52}
                color="#1a0a30"
                indicatorColor={ACCENT}
                accentColor={ACCENT}
                label="Size"
                valueLabel={s.roomSize.toFixed(2)}
              />
              <AnalogKnob
                value={s.damping}
                min={0}
                max={1}
                step={0.01}
                onChange={set("damping")}
                style="modern"
                size={52}
                color="#1a0a30"
                indicatorColor={ACCENT}
                accentColor={ACCENT}
                label="Damping"
                valueLabel={s.damping.toFixed(2)}
              />
              <AnalogKnob
                value={s.shimmer}
                min={0}
                max={1}
                step={0.01}
                onChange={set("shimmer")}
                style="modern"
                size={52}
                color="#2a0a4a"
                indicatorColor="#c080ff"
                accentColor={ACCENT}
                label="Shimmer"
                valueLabel={s.shimmer.toFixed(2)}
              />
              <AnalogKnob
                value={s.mix}
                min={0}
                max={100}
                step={1}
                onChange={set("mix")}
                style="modern"
                size={52}
                color="#2a0a4a"
                indicatorColor="#fff"
                accentColor={ACCENT}
                label="Mix"
                valueLabel={`${Math.round(s.mix)}%`}
              />
            </div>

            {/* Status footer */}
            <div
              style={{
                marginTop: 8,
                textAlign: "center",
                fontSize: 8,
                color: s.freeze ? "#80c0ff" : "#c080ff",
                letterSpacing: 5,
                opacity: 0.85,
                textShadow: s.freeze
                  ? "0 0 6px #80c0ff"
                  : `0 0 6px ${ACCENT}55`,
              }}
            >
              {s.freeze ? "◇ TAIL HELD ◇" : "✦ ETERNAL ECHO ✦"}
            </div>
          </div>
        </HardwarePanel>
      </div>
    </div>
  );
}
