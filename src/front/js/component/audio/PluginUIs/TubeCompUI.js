// ============================================================
// TubeCompUI.js — Manley / Fairchild Vari-Mu aesthetic
// Phase F4-A.7. Twin VU needles (Input + GR), warm orange glow,
// chickenhead AnalogKnobs, cream/wood face panel.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release,
//     drive, warmth, makeup, stereoLink
//   }
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import VUMeter from "../HardwareUI/VUMeter";
import ButtonBank from "../HardwareUI/ButtonBank";

const ORANGE = "#cc7711";
const ORANGE_BRIGHT = "#ff9933";
const CREAM = "#f0d8a8";
const BRASS = "#b08840";

// Decorative tube-warmth indicator. Brighter glow as `drive` increases.
const TubeGlow = ({ drive }) => {
  const intensity = Math.max(0, Math.min(1, drive));
  const alpha = 0.25 + intensity * 0.65;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 14,
        borderRadius: 3,
        background: "#1a0a04",
        border: `1px solid ${BRASS}`,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${intensity * 100}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${ORANGE} 0%, ${ORANGE_BRIGHT} 100%)`,
          boxShadow: `0 0 ${4 + intensity * 8}px rgba(255, 153, 51, ${alpha})`,
          transition: "width 80ms linear",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 6,
          transform: "translateY(-50%)",
          fontSize: 8,
          color: CREAM,
          letterSpacing: 2,
          fontFamily: "Georgia, serif",
          textShadow: "0 1px 0 #000",
          mixBlendMode: "difference",
        }}
      >
        TUBE WARMTH
      </div>
    </div>
  );
};

export default function TubeCompUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -14,
    ratio: 3,
    attack: 20,
    release: 300,
    drive: 0.4,
    warmth: 0.5,
    makeup: 0,
    stereoLink: true,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Synthesize VU meter values from params (decorative, no live audio).
  // Input meter: roughly suggests current "input level" by mapping
  // threshold (closer to 0 = hotter signal = higher reading).
  const inputLevel = Math.max(0, Math.min(1, (s.threshold + 30) / 30));
  // GR meter: maps from 0 (no GR) to ~1 (heavy compression). Driven
  // by drive + ratio / threshold proximity.
  const grTarget =
    Math.min(1, (Math.max(0, -s.threshold) / 30) * (s.ratio / 10) + s.drive * 0.2);

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 420,
        zIndex: 1000,
        filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 24px ${ORANGE}33)`,
      }}
    >
      <HardwarePanel skin="wood" accentColor={ORANGE} padding={14}>
        {/* Warm orange radial overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 110%, ${ORANGE}33 0%, transparent 60%)`,
            zIndex: 0,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `2px solid ${BRASS}`,
            position: "relative",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 700,
                fontSize: 22,
                color: CREAM,
                letterSpacing: 4,
                fontStyle: "italic",
                textShadow: `0 0 8px ${ORANGE}66, 0 1px 0 #000`,
              }}
            >
              TUBE
            </span>
            <span
              style={{
                marginLeft: 12,
                fontSize: 10,
                color: ORANGE_BRIGHT,
                letterSpacing: 3,
                fontFamily: "Georgia, serif",
              }}
            >
              VARI-MU
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: CREAM,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Twin VU meters: INPUT + GAIN REDUCTION */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 12,
            padding: 8,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
            border: `1px solid ${BRASS}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <VUMeter value={inputLevel} width={180} height={100} faceColor={CREAM} label="INPUT" />
            <div style={{ fontSize: 9, color: CREAM, letterSpacing: 2, fontFamily: "Georgia, serif" }}>
              INPUT
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <VUMeter
              value={1 - grTarget}
              min={-20}
              max={3}
              width={180}
              height={100}
              faceColor={CREAM}
              color="#9c1a10"
              label="G/R"
            />
            <div style={{ fontSize: 9, color: ORANGE_BRIGHT, letterSpacing: 2, fontFamily: "Georgia, serif" }}>
              GAIN REDUCTION
            </div>
          </div>
        </div>

        {/* Tube warmth glow indicator */}
        <div style={{ marginBottom: 12 }}>
          <TubeGlow drive={s.drive} />
        </div>

        {/* Knob row 1: Threshold / Ratio / Attack / Release */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 10,
            background: "rgba(40,20,10,0.4)",
            borderRadius: 3,
            border: `1px solid ${BRASS}`,
          }}
        >
          <AnalogKnob
            value={s.threshold}
            min={-40}
            max={0}
            onChange={set("threshold")}
            style="chickenhead"
            size={64}
            color={CREAM}
            indicatorColor="#1a0a04"
            label="THRESH"
            valueLabel={`${s.threshold.toFixed(1)} dB`}
            step={0.1}
            accentColor={ORANGE}
          />
          <AnalogKnob
            value={s.ratio}
            min={1}
            max={20}
            onChange={set("ratio")}
            style="chickenhead"
            size={64}
            color={CREAM}
            indicatorColor="#1a0a04"
            label="RATIO"
            valueLabel={`${s.ratio.toFixed(1)}:1`}
            step={0.1}
            accentColor={ORANGE}
          />
          <AnalogKnob
            value={s.attack}
            min={0.1}
            max={100}
            onChange={set("attack")}
            style="chickenhead"
            size={64}
            color={CREAM}
            indicatorColor="#1a0a04"
            label="ATTACK"
            valueLabel={`${s.attack.toFixed(1)} ms`}
            step={0.1}
            accentColor={ORANGE}
          />
          <AnalogKnob
            value={s.release}
            min={10}
            max={2000}
            onChange={set("release")}
            style="chickenhead"
            size={64}
            color={CREAM}
            indicatorColor="#1a0a04"
            label="RELEASE"
            valueLabel={`${Math.round(s.release)} ms`}
            step={1}
            accentColor={ORANGE}
          />
        </div>

        {/* Knob row 2: Drive / Warmth / Makeup */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 10,
            background: "rgba(40,20,10,0.4)",
            borderRadius: 3,
            border: `1px solid ${BRASS}`,
          }}
        >
          <AnalogKnob
            value={s.drive}
            min={0}
            max={1}
            onChange={set("drive")}
            style="chickenhead"
            size={64}
            color={ORANGE}
            indicatorColor={CREAM}
            label="DRIVE"
            valueLabel={`${Math.round(s.drive * 100)}%`}
            step={0.01}
            accentColor={ORANGE_BRIGHT}
          />
          <AnalogKnob
            value={s.warmth}
            min={0}
            max={1}
            onChange={set("warmth")}
            style="chickenhead"
            size={64}
            color={ORANGE}
            indicatorColor={CREAM}
            label="WARMTH"
            valueLabel={`${Math.round(s.warmth * 100)}%`}
            step={0.01}
            accentColor={ORANGE_BRIGHT}
          />
          <AnalogKnob
            value={s.makeup}
            min={-12}
            max={24}
            onChange={set("makeup")}
            style="chickenhead"
            size={64}
            color={CREAM}
            indicatorColor="#1a0a04"
            label="MAKEUP"
            valueLabel={`${s.makeup >= 0 ? "+" : ""}${s.makeup.toFixed(1)} dB`}
            step={0.1}
            accentColor={ORANGE}
          />
        </div>

        {/* Stereo Link button */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            padding: "8px 4px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 3,
            border: `1px solid ${BRASS}`,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: CREAM,
              letterSpacing: 2,
              fontFamily: "Georgia, serif",
            }}
          >
            STEREO
          </span>
          <ButtonBank
            options={[
              { value: false, label: "DUAL MONO" },
              { value: true, label: "LINK" },
            ]}
            value={s.stereoLink}
            onChange={set("stereoLink")}
            style="hardware"
            size={26}
            accentColor={ORANGE_BRIGHT}
          />
        </div>

        {/* Footer ID strip */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: BRASS,
            letterSpacing: 4,
            textAlign: "center",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
          }}
        >
          SPX · TUBE COMP · VARI-MU MK I
        </div>
      </HardwarePanel>
    </div>
  );
}
