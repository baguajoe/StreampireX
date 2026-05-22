// ============================================================
// GlueBusUI2.js — SSL G-Bus / 4000-bus compressor UI.
// Phase F4-A.7. Suffix `2` to avoid collision with the existing
// GlueBusUI; the orchestrator swaps the import after this lands.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release,
//     makeupGain, mix, sidechainHPF, autoGain
//   }
//   - attack/release are in MILLISECONDS.
//   - autoGain — Auto Release toggle. (Per Batch 3, autoGain is wired
//     in setParam.)
//   - 4 colored EQ-section bands at top edge mimic the SSL channel
//     strip ribbon (red HF / yellow HMF / green LMF / blue LF). They
//     are decorative — bus-comp module doesn't have an EQ section.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";
import ButtonBank from "../HardwareUI/ButtonBank";
import useGRMeter from "../HardwareUI/useGRMeter";

const SILVER = "#888888";
const SILVER_BRIGHT = "#cfcfcf";
const RED_GR = "#ff3030";

// SSL EQ-section reference colours (decorative)
const BAND_RED = "#cc3333";
const BAND_YELLOW = "#cccc33";
const BAND_GREEN = "#33cc33";
const BAND_BLUE = "#3366cc";

const BANDS = [BAND_RED, BAND_YELLOW, BAND_GREEN, BAND_BLUE];

// SSL ratio is a stepped switch in hardware: 2, 4, 10. We expose the
// continuous knob from PLUGIN_DEFAULTS but offer a quick ratio bank.
const RATIO_OPTIONS = [
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 10, label: "10" },
];

// SSL attack switch positions (0.1, 0.3, 1, 3, 10, 30 ms) — we expose
// continuous via the knob but suggest these milestones.
// SSL release: 0.1, 0.3, 0.6, 1.2 s (= 100, 300, 600, 1200 ms) and "AUTO".

export default function GlueBusUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({
    threshold: -10,
    ratio: 2,
    attack: 10,
    release: 100,
    makeupGain: 0,
    mix: 100,
    sidechainHPF: 60,
    autoGain: true,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const grNorm = useGRMeter(() => getInstance && getInstance()?.meters?.comp, { targetDb: 12 });
  const grDB = grNorm * 12;

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
      <HardwarePanel skin="black-rack" accentColor={SILVER} padding={14}>
        {/* SSL channel-strip rainbow band (decorative) */}
        <div
          style={{
            display: "flex",
            gap: 0,
            height: 6,
            marginBottom: 10,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid #0a0a0a",
            boxShadow: "inset 0 0 4px rgba(0,0,0,0.6)",
          }}
        >
          {BANDS.map((c, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: `linear-gradient(180deg, ${c} 0%, #00000044 100%)`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: `1px solid ${SILVER}33`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: SILVER_BRIGHT,
                letterSpacing: 4,
                textShadow: `0 1px 0 #000, 0 0 4px ${SILVER}66`,
              }}
            >
              SSL G-BUS
            </span>
            <span
              style={{
                marginLeft: 10,
                fontSize: 11,
                color: SILVER,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Glue
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: SILVER_BRIGHT,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* GR ladder — horizontal, red, large segments */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "8px 6px",
            marginBottom: 10,
            background: "rgba(0,0,0,0.35)",
            borderRadius: 4,
            border: `1px solid ${SILVER}33`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontSize: 9,
              color: SILVER,
              letterSpacing: 2,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            <span>GAIN REDUCTION</span>
            <span>{grDB.toFixed(1)} dB</span>
          </div>
          <LEDLadder
            value={grNorm}
            orientation="horizontal"
            segments={16}
            color={RED_GR}
            dimColor="#3a0a0a"
            width={400}
            height={20}
            reverse={true}
          />
        </div>

        {/* Ratio bank */}
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
          <ButtonBank
            options={RATIO_OPTIONS}
            value={s.ratio}
            onChange={set("ratio")}
            orientation="horizontal"
            style="hardware"
            size={28}
            accentColor={SILVER_BRIGHT}
          />
          <span style={{ width: 24 }} />
          <ButtonBank
            options={[{ value: true, label: "AUTO REL" }]}
            value={s.autoGain ? true : null}
            onChange={() => set("autoGain")(!s.autoGain)}
            orientation="horizontal"
            style="hardware"
            size={28}
            accentColor={BAND_GREEN}
          />
        </div>

        {/* Knob row 1: Threshold / Ratio (continuous) / Attack / Release */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
            border: `1px solid ${SILVER}33`,
          }}
        >
          <AnalogKnob
            value={s.threshold}
            min={-30}
            max={10}
            onChange={set("threshold")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="THRESH"
            valueLabel={`${s.threshold.toFixed(1)}dB`}
            step={0.5}
          />
          <AnalogKnob
            value={s.ratio}
            min={1}
            max={20}
            onChange={set("ratio")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="RATIO"
            valueLabel={`${s.ratio.toFixed(1)}:1`}
            step={0.5}
          />
          <AnalogKnob
            value={s.attack}
            min={0.1}
            max={30}
            onChange={set("attack")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="ATTACK"
            valueLabel={`${s.attack.toFixed(1)}ms`}
            step={0.1}
          />
          <AnalogKnob
            value={s.release}
            min={50}
            max={1200}
            onChange={set("release")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="RELEASE"
            valueLabel={`${Math.round(s.release)}ms`}
            step={5}
          />
        </div>

        {/* Knob row 2: Makeup / Mix / Sidechain HPF */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 8,
            background: "rgba(0,0,0,0.25)",
            borderRadius: 4,
            border: `1px solid ${SILVER}33`,
          }}
        >
          <AnalogKnob
            value={s.makeupGain}
            min={-12}
            max={20}
            onChange={set("makeupGain")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="MAKEUP"
            valueLabel={`${s.makeupGain >= 0 ? "+" : ""}${s.makeupGain.toFixed(1)}`}
            step={0.5}
          />
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            onChange={set("mix")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={SILVER_BRIGHT}
            accentColor={SILVER}
            label="MIX"
            valueLabel={`${Math.round(s.mix)}%`}
            step={1}
          />
          <AnalogKnob
            value={s.sidechainHPF}
            min={20}
            max={300}
            onChange={set("sidechainHPF")}
            style="modern"
            size={44}
            color="#1a1a1a"
            indicatorColor={BAND_BLUE}
            accentColor={BAND_BLUE}
            label="SC HPF"
            valueLabel={`${Math.round(s.sidechainHPF)}Hz`}
            step={1}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: SILVER,
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          SPX · SSL G-BUS GLUE · MK II
        </div>
      </HardwarePanel>
    </div>
  );
}
