// ============================================================
// FETStrikeUI2.js — 1176-style FET compressor UI.
// Phase F4-A.7. Suffix `2` to avoid collision with the existing
// FETStrikeUI; the orchestrator swaps the import after this lands.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release,
//     inputGain, outputGain, saturation, allButtonRatio
//   }
//   - attack/release are in MILLISECONDS (SPX comp convention).
//   - 1176 attack/release knobs are stepped 1..7 (slowest..fastest);
//     we expose the integer step on the knob and derive the ms value
//     internally by lookup. Position is stored in `attack`/`release`
//     directly, but as ms: 7→0.4ms (fastest), 1→8ms.
//     For Release: 1→1100ms, 7→50ms.
//   - "All Buttons In" is a famous mod where all 4 ratio buttons are
//     simultaneously depressed for an aggressive flat curve. We treat
//     it as a boolean flag `allButtonRatio`; when true, the visual
//     ratio bank shows all 4 buttons depressed and the DSP locks to
//     ratio=20. Toggling it off restores prior ratio.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import VUMeter from "../HardwareUI/VUMeter";
import ButtonBank from "../HardwareUI/ButtonBank";
import useGRMeter from "../HardwareUI/useGRMeter";

const SILVER = "#c0c0c0";
const SILVER_DEEP = "#7a7a8a";
const BLUE_BEZEL = "#1a3580";

// 1176-style stepped attack/release tables.
// Position 1 = slowest, 7 = fastest. Ms values approximate hardware.
const ATTACK_STEPS = [8, 4, 2, 1, 0.8, 0.5, 0.4]; // ms
const RELEASE_STEPS = [1100, 800, 500, 300, 200, 100, 50]; // ms

const findClosestStep = (table, ms) => {
  let bestIdx = 0;
  let bestDiff = Infinity;
  table.forEach((v, i) => {
    const d = Math.abs(v - ms);
    if (d < bestDiff) {
      bestDiff = d;
      bestIdx = i;
    }
  });
  return bestIdx + 1; // 1..7
};

export default function FETStrikeUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({
    threshold: -10,
    ratio: 2,
    attack: 10,
    release: 100,
    inputGain: 0,
    outputGain: 0,
    saturation: 0,
    allButtonRatio: false,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Derive stepped positions from current ms values.
  const attackPos = findClosestStep(ATTACK_STEPS, s.attack);
  const releasePos = findClosestStep(RELEASE_STEPS, s.release);

  const setAttackStep = (pos) => {
    const ms = ATTACK_STEPS[Math.max(0, Math.min(6, Math.round(pos) - 1))];
    set("attack")(ms);
  };
  const setReleaseStep = (pos) => {
    const ms = RELEASE_STEPS[Math.max(0, Math.min(6, Math.round(pos) - 1))];
    set("release")(ms);
  };

  // 1176 maxes around 15 dB GR.
  const vuValue = useGRMeter(() => getInstance && getInstance()?.meters?.comp, { targetDb: 15 });

  // Ratio bank: when allButtonRatio is true, every option is "active"
  // (all depressed). We emulate this by rendering a custom row instead
  // of using ButtonBank's single-select highlight semantics.
  const ratioOptions = [
    { value: 4, label: "4" },
    { value: 8, label: "8" },
    { value: 12, label: "12" },
    { value: 20, label: "20" },
  ];

  const onRatioClick = (v) => {
    if (s.allButtonRatio) return; // locked while all-buttons-in
    set("ratio")(v);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 440,
        zIndex: 1000,
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
      }}
    >
      <HardwarePanel skin="blue-bezel" accentColor={SILVER} padding={14}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: `1px solid ${SILVER_DEEP}55`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: SILVER,
                letterSpacing: 4,
                textShadow: `0 1px 0 #000, 0 0 4px ${SILVER}66`,
              }}
            >
              1176
            </span>
            <span
              style={{
                marginLeft: 10,
                fontSize: 11,
                color: "#cfe0ff",
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              FET STRIKE
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: SILVER,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* VU meter centered */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <VUMeter
            value={vuValue}
            min={-20}
            max={3}
            width={240}
            height={120}
            color="#1a1a1a"
            bezelColor="#0a0a14"
            faceColor="#f0e8c8"
            label="GR"
          />
        </div>

        {/* Ratio bank — custom row to support all-buttons-in mode */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: SILVER,
              letterSpacing: 2,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            RATIO
          </span>
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              background: "#0a0a14",
              padding: 4,
              borderRadius: 4,
              boxShadow:
                "inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {ratioOptions.map((opt) => {
              const active = s.allButtonRatio || opt.value === s.ratio;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onRatioClick(opt.value)}
                  style={{
                    height: 28,
                    minWidth: 36,
                    padding: "0 10px",
                    fontFamily: "monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: active ? "#fff" : "#bbb",
                    background: active
                      ? "linear-gradient(180deg, #1a1a1a, #2a2a2a)"
                      : "linear-gradient(180deg, #5a6a8a, #2a3a5a)",
                    border: `1px solid ${active ? SILVER : "#0a0a14"}`,
                    borderRadius: 3,
                    cursor: s.allButtonRatio ? "default" : "pointer",
                    boxShadow: active
                      ? `inset 0 2px 3px rgba(0,0,0,0.7), 0 0 4px ${SILVER}55`
                      : "inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 1px rgba(0,0,0,0.5)",
                    textShadow: active
                      ? `0 0 4px ${SILVER}`
                      : "0 1px 0 rgba(0,0,0,0.5)",
                    outline: "none",
                    userSelect: "none",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* All Buttons In toggle */}
          <ButtonBank
            options={[{ value: true, label: "ALL IN" }]}
            value={s.allButtonRatio ? true : null}
            onChange={() => set("allButtonRatio")(!s.allButtonRatio)}
            orientation="horizontal"
            style="hardware"
            size={28}
            accentColor="#ff5544"
          />
        </div>

        {/* 5-knob row: input/attack/release/output/saturation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
            border: `1px solid ${BLUE_BEZEL}`,
          }}
        >
          <AnalogKnob
            value={s.inputGain}
            min={-24}
            max={24}
            onChange={set("inputGain")}
            style="vintage"
            size={56}
            color="#1a1a1a"
            indicatorColor={SILVER}
            accentColor={SILVER}
            label="INPUT"
            valueLabel={`${s.inputGain >= 0 ? "+" : ""}${s.inputGain.toFixed(0)}`}
            step={0.5}
          />
          <AnalogKnob
            value={attackPos}
            min={1}
            max={7}
            onChange={setAttackStep}
            style="vintage"
            size={56}
            color="#1a1a1a"
            indicatorColor={SILVER}
            accentColor={SILVER}
            label="ATTACK"
            valueLabel={`${attackPos}`}
            step={1}
          />
          <AnalogKnob
            value={releasePos}
            min={1}
            max={7}
            onChange={setReleaseStep}
            style="vintage"
            size={56}
            color="#1a1a1a"
            indicatorColor={SILVER}
            accentColor={SILVER}
            label="RELEASE"
            valueLabel={`${releasePos}`}
            step={1}
          />
          <AnalogKnob
            value={s.outputGain}
            min={-24}
            max={24}
            onChange={set("outputGain")}
            style="vintage"
            size={56}
            color="#1a1a1a"
            indicatorColor={SILVER}
            accentColor={SILVER}
            label="OUTPUT"
            valueLabel={`${s.outputGain >= 0 ? "+" : ""}${s.outputGain.toFixed(0)}`}
            step={0.5}
          />
          <AnalogKnob
            value={s.saturation}
            min={0}
            max={1}
            onChange={set("saturation")}
            style="vintage"
            size={56}
            color="#1a1a1a"
            indicatorColor={SILVER}
            accentColor={SILVER}
            label="SAT"
            valueLabel={`${Math.round(s.saturation * 100)}%`}
            step={0.01}
          />
        </div>

        {/* Threshold row (separate, smaller — 1176 traditionally derives
            threshold from input gain, but we expose it here for users) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "6px 10px",
            background: "rgba(0,0,0,0.18)",
            borderRadius: 4,
            border: `1px solid ${BLUE_BEZEL}`,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: SILVER,
              letterSpacing: 2,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            THRESHOLD
          </span>
          <input
            type="range"
            min={-60}
            max={0}
            step={0.5}
            value={s.threshold}
            onChange={(e) => set("threshold")(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: SILVER, maxWidth: 220 }}
          />
          <span
            style={{
              fontSize: 10,
              color: "#fff",
              fontFamily: "monospace",
              fontWeight: 700,
              minWidth: 50,
              textAlign: "right",
            }}
          >
            {s.threshold.toFixed(1)}dB
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: SILVER_DEEP,
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          SPX · 1176 FET STRIKE · MK II
        </div>
      </HardwarePanel>
    </div>
  );
}
