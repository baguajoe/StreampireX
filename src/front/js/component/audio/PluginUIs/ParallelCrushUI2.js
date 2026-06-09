// ============================================================
// ParallelCrushUI2.js — NY-style parallel-bus crush compressor
// Phase F4-A.7. Dry/wet split visualization, prominent CRUSH knob.
//
// Suffix `2` to avoid collision with existing ParallelCrushUI.
// Orchestrator swaps the import after this batch.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     threshold, ratio, attack, release,
//     wetGain, dryGain, mix, crush
//   }
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";
import useAnalyserValue from "../HardwareUI/useAnalyserValue";

const RED = "#ff3030";
const RED_BRIGHT = "#ff6060";
const RED_DEEP = "#990808";
const GREEN = "#33cc66";
const GREEN_BRIGHT = "#66ee99";

export default function ParallelCrushUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({
    threshold: -10,
    ratio: 2,
    attack: 10,
    release: 100,
    wetGain: 0,
    dryGain: 0,
    mix: 100,
    crush: 0,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const dryTarget = useAnalyserValue(() => getInstance && getInstance()?.meters?.analyserDry);
  const wetTarget = useAnalyserValue(() => getInstance && getInstance()?.meters?.analyserWet);

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 440,
        zIndex: 1000,
        filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 16px ${RED}33)`,
      }}
    >
      <HardwarePanel skin="black-rack" accentColor={RED} padding={14}>
        {/* Parallel-path background stripes (dry left, wet right) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            pointerEvents: "none",
            zIndex: 0,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              background: `linear-gradient(180deg, ${GREEN}11 0%, transparent 100%)`,
            }}
          />
          <div
            style={{
              flex: 1,
              background: `linear-gradient(180deg, ${RED}22 0%, transparent 100%)`,
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${RED}66`,
            position: "relative",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                fontWeight: 900,
                fontSize: 22,
                color: RED_BRIGHT,
                letterSpacing: 4,
                textShadow: `0 0 8px ${RED}aa, 0 1px 0 #000`,
              }}
            >
              PARALLEL CRUSH
            </div>
            <div
              style={{
                fontSize: 9,
                color: RED,
                letterSpacing: 4,
                fontFamily: "monospace",
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              // NY-STYLE //
            </div>
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

        {/* Dry/Wet split visualization centerpiece */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 14,
            padding: 12,
            background: "rgba(0,0,0,0.45)",
            borderRadius: 4,
            border: `1px solid ${RED_DEEP}`,
            position: "relative",
          }}
        >
          {/* DRY column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                fontSize: 10,
                color: GREEN_BRIGHT,
                letterSpacing: 3,
                fontFamily: "monospace",
                fontWeight: 700,
                textShadow: `0 0 4px ${GREEN}66`,
              }}
            >
              DRY
            </div>
            <LEDLadder
              value={dryTarget}
              orientation="vertical"
              segments={14}
              color={GREEN}
              dimColor="#0a2010"
              width={26}
              height={130}
            />
            <div
              style={{
                fontSize: 9,
                color: GREEN_BRIGHT,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              {s.dryGain >= 0 ? "+" : ""}
              {s.dryGain.toFixed(1)} dB
            </div>
          </div>

          {/* Center divider line + arrow */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: RED,
            }}
          >
            <div
              style={{
                width: 1,
                height: 40,
                background: `linear-gradient(180deg, transparent, ${RED}, transparent)`,
              }}
            />
            <div
              style={{
                fontSize: 16,
                color: RED_BRIGHT,
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              ⇄
            </div>
            <div
              style={{
                width: 1,
                height: 40,
                background: `linear-gradient(180deg, transparent, ${RED}, transparent)`,
              }}
            />
          </div>

          {/* WET column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                fontSize: 10,
                color: RED_BRIGHT,
                letterSpacing: 3,
                fontFamily: "monospace",
                fontWeight: 700,
                textShadow: `0 0 4px ${RED}66`,
              }}
            >
              WET
            </div>
            <LEDLadder
              value={wetTarget}
              orientation="vertical"
              segments={14}
              color={RED}
              dimColor="#3a0808"
              width={26}
              height={130}
            />
            <div
              style={{
                fontSize: 9,
                color: RED_BRIGHT,
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              {s.wetGain >= 0 ? "+" : ""}
              {s.wetGain.toFixed(1)} dB
            </div>
          </div>
        </div>

        {/* CRUSH — large highlighted knob */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px 0 8px",
            marginBottom: 10,
            background: `radial-gradient(ellipse at 50% 50%, ${RED}22 0%, transparent 70%)`,
            border: `2px solid ${RED}`,
            borderRadius: 4,
            boxShadow: `inset 0 0 12px ${RED}33, 0 0 8px ${RED}55`,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: RED_BRIGHT,
              letterSpacing: 4,
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              fontWeight: 900,
              marginBottom: 4,
              textShadow: `0 0 6px ${RED}aa`,
            }}
          >
            ★ CRUSH ★
          </div>
          <AnalogKnob
            value={s.crush}
            min={0}
            max={1}
            onChange={set("crush")}
            style="modern"
            size={64}
            color="#2a0808"
            indicatorColor={RED_BRIGHT}
            label=""
            valueLabel={`${Math.round(s.crush * 100)}%`}
            step={0.01}
            accentColor={RED}
          />
        </div>

        {/* Knob row 1: Threshold / Ratio / Attack / Release */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            padding: "10px 4px",
            marginBottom: 10,
            background: "rgba(0,0,0,0.4)",
            borderRadius: 3,
            border: `1px solid ${RED_DEEP}`,
            position: "relative",
          }}
        >
          <AnalogKnob
            value={s.threshold}
            min={-40}
            max={0}
            onChange={set("threshold")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="THRESH"
            valueLabel={`${s.threshold.toFixed(1)} dB`}
            step={0.1}
            accentColor={RED}
          />
          <AnalogKnob
            value={s.ratio}
            min={1}
            max={20}
            onChange={set("ratio")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="RATIO"
            valueLabel={`${s.ratio.toFixed(1)}:1`}
            step={0.1}
            accentColor={RED}
          />
          <AnalogKnob
            value={s.attack}
            min={0.1}
            max={100}
            onChange={set("attack")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="ATTACK"
            valueLabel={`${s.attack.toFixed(1)} ms`}
            step={0.1}
            accentColor={RED}
          />
          <AnalogKnob
            value={s.release}
            min={10}
            max={2000}
            onChange={set("release")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="RELEASE"
            valueLabel={`${Math.round(s.release)} ms`}
            step={1}
            accentColor={RED}
          />
        </div>

        {/* Knob row 2: Wet Gain / Dry Gain / Mix */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "10px 4px",
            background: "rgba(0,0,0,0.4)",
            borderRadius: 3,
            border: `1px solid ${RED_DEEP}`,
            position: "relative",
          }}
        >
          <AnalogKnob
            value={s.dryGain}
            min={-24}
            max={24}
            onChange={set("dryGain")}
            style="modern"
            size={48}
            color="#0a2010"
            indicatorColor={GREEN_BRIGHT}
            label="DRY GAIN"
            valueLabel={`${s.dryGain >= 0 ? "+" : ""}${s.dryGain.toFixed(1)}`}
            step={0.1}
            accentColor={GREEN}
          />
          <AnalogKnob
            value={s.wetGain}
            min={-24}
            max={24}
            onChange={set("wetGain")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="WET GAIN"
            valueLabel={`${s.wetGain >= 0 ? "+" : ""}${s.wetGain.toFixed(1)}`}
            step={0.1}
            accentColor={RED}
          />
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            onChange={set("mix")}
            style="modern"
            size={48}
            color="#1a0808"
            indicatorColor={RED_BRIGHT}
            label="MIX"
            valueLabel={`${Math.round(s.mix)}%`}
            step={1}
            accentColor={RED}
          />
        </div>

        {/* Footer ID strip */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: RED,
            letterSpacing: 4,
            textAlign: "center",
            fontFamily: "monospace",
            fontWeight: 700,
            position: "relative",
          }}
        >
          SPX · PARALLEL CRUSH · NY DRUM-BUS
        </div>
      </HardwarePanel>
    </div>
  );
}
