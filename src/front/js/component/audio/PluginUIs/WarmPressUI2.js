// ============================================================
// WarmPressUI2.js — Hybrid (FET + Tube) compressor aesthetic
// Phase F4-A.7. Mode-switchable engine (optical/vca/vari-mu),
// warm-cool gradient, dual meters (GR + sat).
//
// Suffix `2` to avoid collision with existing WarmPressUI.
// Orchestrator swaps the import after this batch.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release, knee,
//     makeupGain, model, mix
//   }
//   model: "optical" | "vca" | "vari-mu"
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";
import ButtonBank from "../HardwareUI/ButtonBank";
import useGRMeter from "../HardwareUI/useGRMeter";
import useAnalyserValue from "../HardwareUI/useAnalyserValue";

const CYAN = "#00ffc8";
const ORANGE = "#ff7711";
const WARM = "#cc6611";

export default function WarmPressUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({
    threshold: -10,
    ratio: 2,
    attack: 10,
    release: 100,
    knee: 6,
    makeupGain: 0,
    model: "optical",
    mix: 100,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const grTarget = useGRMeter(() => getInstance && getInstance()?.meters?.comp, { targetDb: 12 });
  // SAT meter from post-makeup analyser RMS — heavier saturation pushes the
  // wet path hotter, so peak RMS is a usable proxy for "how saturated".
  const satTarget = useAnalyserValue(() => getInstance && getInstance()?.meters?.analyserOut);

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 420,
        zIndex: 1000,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
      }}
    >
      <HardwarePanel skin="brushed-metal" accentColor={CYAN} padding={14}>
        {/* Warm-cool gradient overlay (8% opacity) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(135deg, ${WARM}33 0%, ${CYAN}33 100%)`,
            opacity: 0.5,
            zIndex: 0,
            borderRadius: 6,
          }}
        />

        {/* Header — gradient text */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${CYAN}55`,
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 3,
              background: `linear-gradient(90deg, ${ORANGE}, ${CYAN})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: `0 0 8px ${CYAN}33`,
            }}
          >
            WARM PRESS
            <span
              style={{
                marginLeft: 8,
                fontSize: 10,
                color: CYAN,
                letterSpacing: 2,
                WebkitTextFillColor: CYAN,
              }}
            >
              — HYBRID
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#ddd",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Mode selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
            position: "relative",
          }}
        >
          <ButtonBank
            options={[
              { value: "optical", label: "OPTICAL" },
              { value: "vca", label: "VCA" },
              { value: "vari-mu", label: "VARI-MU" },
            ]}
            value={s.model}
            onChange={set("model")}
            style="hardware"
            size={28}
            accentColor={CYAN}
          />
        </div>

        {/* Meters row: GR + SAT */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginBottom: 12,
            padding: 10,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 4,
            border: `1px solid ${CYAN}33`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <LEDLadder
              value={grTarget}
              orientation="vertical"
              segments={14}
              color={CYAN}
              dimColor="#103030"
              width={26}
              height={120}
              reverse={true}
            />
            <div style={{ fontSize: 8, color: CYAN, letterSpacing: 2, fontFamily: "monospace" }}>
              GR
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <LEDLadder
              value={satTarget}
              orientation="vertical"
              segments={10}
              color={ORANGE}
              dimColor="#3a1a0a"
              width={20}
              height={120}
            />
            <div style={{ fontSize: 8, color: ORANGE, letterSpacing: 2, fontFamily: "monospace" }}>
              SAT
            </div>
          </div>
        </div>

        {/* Knob row 1: Threshold / Ratio / Attack / Release */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 10,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 3,
            border: `1px solid ${CYAN}33`,
            position: "relative",
          }}
        >
          <AnalogKnob
            value={s.threshold}
            min={-40}
            max={0}
            onChange={set("threshold")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={CYAN}
            label="THRESH"
            valueLabel={`${s.threshold.toFixed(1)} dB`}
            step={0.1}
            accentColor={CYAN}
          />
          <AnalogKnob
            value={s.ratio}
            min={1}
            max={20}
            onChange={set("ratio")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={CYAN}
            label="RATIO"
            valueLabel={`${s.ratio.toFixed(1)}:1`}
            step={0.1}
            accentColor={CYAN}
          />
          <AnalogKnob
            value={s.attack}
            min={0.1}
            max={100}
            onChange={set("attack")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={CYAN}
            label="ATTACK"
            valueLabel={`${s.attack.toFixed(1)} ms`}
            step={0.1}
            accentColor={CYAN}
          />
          <AnalogKnob
            value={s.release}
            min={10}
            max={2000}
            onChange={set("release")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={CYAN}
            label="RELEASE"
            valueLabel={`${Math.round(s.release)} ms`}
            step={1}
            accentColor={CYAN}
          />
        </div>

        {/* Knob row 2: Knee / Makeup / Mix */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 10,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 3,
            border: `1px solid ${ORANGE}33`,
            position: "relative",
          }}
        >
          <AnalogKnob
            value={s.knee}
            min={0}
            max={24}
            onChange={set("knee")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={ORANGE}
            label="KNEE"
            valueLabel={`${s.knee.toFixed(1)} dB`}
            step={0.1}
            accentColor={ORANGE}
          />
          <AnalogKnob
            value={s.makeupGain}
            min={-12}
            max={24}
            onChange={set("makeupGain")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={ORANGE}
            label="MAKEUP"
            valueLabel={`${s.makeupGain >= 0 ? "+" : ""}${s.makeupGain.toFixed(1)} dB`}
            step={0.1}
            accentColor={ORANGE}
          />
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            onChange={set("mix")}
            style="vintage"
            size={52}
            color="#1a1a1a"
            indicatorColor={CYAN}
            label="MIX"
            valueLabel={`${Math.round(s.mix)}%`}
            step={1}
            accentColor={CYAN}
          />
        </div>

        {/* Footer ID strip */}
        <div
          style={{
            marginTop: 8,
            fontSize: 8,
            color: "#888",
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "monospace",
            position: "relative",
          }}
        >
          SPX · WARM PRESS · HYBRID FET+TUBE
        </div>
      </HardwarePanel>
    </div>
  );
}
