// ============================================================
// CompressorUI.js — Basic compressor UI (modern flat aesthetic).
// Phase F4-A.7. Replaces the GenericPlaceholderUI wrapper used
// by the native "compressor" plugin (DEFAULT_EFFECTS).
//
// Contract:
//   props: { params, onChange, onClose }
//   params: { threshold, ratio, attack, release, knee }
//   - attack/release are stored in SECONDS (native DynamicsCompressor
//     convention) but DISPLAYED in ms. Internal state mirrors `params`
//     in seconds; valueLabel multiplies by 1000 for display.
//   - SPXPluginHost diffs the merged object pushed via onChange and
//     dispatches per-param updates to AudioParams.
//   - onClose() hides the panel.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";

const TEAL = "#00ffc8";
const TEAL_DIM = "#1a4a44";

export default function CompressorUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -24,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    knee: 30,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Approx GR estimate for the meter — purely visual, derived from
  // threshold/ratio. Real GR would come from a sidechain analyzer.
  // Map threshold -60..0dB toward a fake "drive" level then divide
  // by ratio for the visual GR depth (clamped 0..1 normalized to 12dB).
  const fakeDrive = -10; // assume program at -10dB RMS
  const overshoot = Math.max(0, fakeDrive - s.threshold);
  const grDB = overshoot - overshoot / Math.max(1, s.ratio);
  const grNorm = Math.max(0, Math.min(1, grDB / 12));

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 400,
        zIndex: 1000,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
      }}
    >
      <HardwarePanel skin="brushed-metal" accentColor={TEAL} padding={14} screws={false}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${TEAL}33`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 300,
                fontSize: 18,
                color: "#1a1a1a",
                letterSpacing: 6,
              }}
            >
              COMPRESSOR
            </span>
            <span
              style={{
                marginLeft: 10,
                fontSize: 9,
                color: TEAL_DIM,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              dynamics
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#1a1a1a",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body: knobs grid + GR ladder */}
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          {/* Knob grid 2x3 (last cell empty) */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gridTemplateRows: "auto auto",
              gap: 10,
              padding: "10px 6px",
              background: "rgba(0,0,0,0.18)",
              borderRadius: 4,
              border: `1px solid ${TEAL_DIM}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnalogKnob
                value={s.threshold}
                min={-60}
                max={0}
                onChange={set("threshold")}
                style="modern"
                size={48}
                color="#222"
                indicatorColor={TEAL}
                accentColor={TEAL}
                label="THRESH"
                valueLabel={`${s.threshold.toFixed(1)}dB`}
                step={0.1}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnalogKnob
                value={s.ratio}
                min={1}
                max={20}
                onChange={set("ratio")}
                style="modern"
                size={48}
                color="#222"
                indicatorColor={TEAL}
                accentColor={TEAL}
                label="RATIO"
                valueLabel={`${s.ratio.toFixed(1)}:1`}
                step={0.1}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnalogKnob
                value={s.knee}
                min={0}
                max={40}
                onChange={set("knee")}
                style="modern"
                size={48}
                color="#222"
                indicatorColor={TEAL}
                accentColor={TEAL}
                label="KNEE"
                valueLabel={`${s.knee.toFixed(0)}dB`}
                step={1}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnalogKnob
                value={s.attack}
                min={0.0001}
                max={1}
                onChange={set("attack")}
                style="modern"
                size={48}
                color="#222"
                indicatorColor={TEAL}
                accentColor={TEAL}
                label="ATTACK"
                valueLabel={`${(s.attack * 1000).toFixed(0)}ms`}
                step={0.0001}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <AnalogKnob
                value={s.release}
                min={0.005}
                max={2}
                onChange={set("release")}
                style="modern"
                size={48}
                color="#222"
                indicatorColor={TEAL}
                accentColor={TEAL}
                label="RELEASE"
                valueLabel={`${(s.release * 1000).toFixed(0)}ms`}
                step={0.001}
              />
            </div>
            <div /> {/* empty grid cell to balance */}
          </div>

          {/* GR Ladder column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "8px 4px",
              background: "rgba(0,0,0,0.25)",
              borderRadius: 4,
              border: `1px solid ${TEAL_DIM}`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: TEAL,
                letterSpacing: 2,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              GR
            </div>
            <LEDLadder
              value={grNorm}
              orientation="vertical"
              segments={14}
              color={TEAL}
              dimColor="#0a2a26"
              width={20}
              height={150}
              reverse={true}
            />
            <div
              style={{
                fontSize: 8,
                color: "#888",
                letterSpacing: 1,
                fontFamily: "monospace",
              }}
            >
              -dB
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: TEAL_DIM,
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          SPX · COMPRESSOR · NATIVE
        </div>
      </HardwarePanel>
    </div>
  );
}
