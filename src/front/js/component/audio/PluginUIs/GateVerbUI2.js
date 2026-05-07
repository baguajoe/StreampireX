// ============================================================
// GateVerbUI2.js — 80s rack-mount gated reverb
// Hardware-styled reverb UI. Built on shared HardwareUI primitives.
// ============================================================
//
// Aesthetic: black 1U rack with red LED accents, square corners,
// digital-display look. "READY" indicator + threshold LED ladder.
//
// DSP keys (matching PLUGIN_DEFAULTS.gateVerb, REVERB_BASE + gate):
//   { preDelay, decay, diffusion, damping, earlyLevel, lateLevel,
//     hpf, lpf, mix, gateThresh, gateDecay }
//
// "2" suffix: there is an existing GateVerbUI exported from
// SPXPlugins.js. The orchestrator swaps the import after Batch B ships.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";

const ACCENT = "#ff3030"; // red LED
const DEFAULTS = {
  preDelay: 20,
  decay: 2.0,
  diffusion: 0.8,
  damping: 0.5,
  earlyLevel: 0.7,
  lateLevel: 0.8,
  hpf: 80,
  lpf: 8000,
  mix: 0,
  gateThresh: 0,
  gateDecay: 0,
};

// Dot-matrix style segmented digital display
function DigitalReadout({ value, label }) {
  return (
    <div
      style={{
        background: "#0a0000",
        border: `1px solid ${ACCENT}55`,
        borderRadius: 2,
        padding: "4px 8px",
        boxShadow: "inset 0 0 6px rgba(0,0,0,0.8), inset 0 0 4px #ff303033",
        textAlign: "center",
        minWidth: 56,
      }}
    >
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 14,
          fontWeight: 700,
          color: ACCENT,
          textShadow: `0 0 4px ${ACCENT}, 0 0 8px ${ACCENT}88`,
          letterSpacing: 1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 7, color: "#aa4040", letterSpacing: 1, marginTop: 1 }}>
        {label}
      </div>
    </div>
  );
}

function StatusLED({ on, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: on ? ACCENT : "#2a0a0a",
          boxShadow: on
            ? `0 0 4px ${ACCENT}, 0 0 8px ${ACCENT}88`
            : "inset 0 1px 1px rgba(0,0,0,0.7)",
        }}
      />
      <span
        style={{
          fontSize: 8,
          color: on ? "#fff" : "#666",
          letterSpacing: 1,
          fontFamily: "monospace",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function GateVerbUI2({ params, onChange, onClose }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(params || {}) });
  useEffect(() => {
    if (typeof onChange === "function") onChange(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Threshold meter: gateThresh ranges -80..0 dB. Higher (closer to 0)
  // means more "open" — we map to LEDLadder normalized 0..1.
  const threshNorm = Math.max(0, Math.min(1, (s.gateThresh + 80) / 80));

  // Knob common props
  const knobCommon = {
    style: "modern",
    size: 44,
    color: "#1a1a1a",
    indicatorColor: ACCENT,
    accentColor: ACCENT,
  };

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
      <HardwarePanel skin="black-rack" accentColor={ACCENT} padding={12}>
        {/* Header — 80s LED-style */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            padding: "4px 6px",
            background: "linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)",
            border: `1px solid ${ACCENT}33`,
            borderRadius: 0, // square 80s corners
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 5,
                color: ACCENT,
                textShadow: `0 0 6px ${ACCENT}, 0 0 12px ${ACCENT}99`,
                fontFamily: "'Courier New', monospace",
              }}
            >
              GATE VERB
            </div>
            <div style={{ fontSize: 8, color: "#aa4040", letterSpacing: 2 }}>
              SPX 80 SERIES — DIGITAL REVERB GATE
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#0a0a0a",
              color: ACCENT,
              border: `1px solid ${ACCENT}55`,
              borderRadius: 0,
              fontSize: 14,
              cursor: "pointer",
              width: 22,
              height: 22,
              lineHeight: 0,
              fontFamily: "monospace",
            }}
          >
            ×
          </button>
        </div>

        {/* Status row: READY indicator + threshold LED + GATE label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            padding: 6,
            background: "#080808",
            border: `1px solid ${ACCENT}22`,
            borderRadius: 0,
          }}
        >
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <StatusLED on={true} label="READY" />
            <StatusLED on={s.gateThresh > -80} label="GATE" />
            <StatusLED on={s.mix > 0} label="WET" />
          </div>

          {/* Big "GATE" digital label */}
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontFamily: "'Courier New', monospace",
              fontSize: 28,
              fontWeight: 900,
              color: ACCENT,
              letterSpacing: 6,
              textShadow: `0 0 6px ${ACCENT}, 0 0 14px ${ACCENT}aa`,
              padding: "4px 0",
              background:
                "repeating-linear-gradient(0deg, rgba(255,48,48,0.04), rgba(255,48,48,0.04) 1px, transparent 1px, transparent 3px)",
            }}
          >
            GATE
          </div>

          {/* Threshold LED ladder (vertical, reverse=true, GR-style) */}
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <LEDLadder
              value={threshNorm}
              orientation="vertical"
              segments={10}
              color={ACCENT}
              dimColor="#2a0808"
              width={16}
              height={64}
              reverse={true}
            />
            <div style={{ fontSize: 7, color: "#aa4040", letterSpacing: 1 }}>
              THR
            </div>
          </div>
        </div>

        {/* Gate-specific row: gateThresh / gateDecay digital readouts */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            marginBottom: 10,
            padding: 6,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 0,
            border: `1px solid ${ACCENT}22`,
            gap: 10,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <AnalogKnob
              value={s.gateThresh}
              min={-80}
              max={0}
              step={1}
              onChange={set("gateThresh")}
              {...knobCommon}
              size={48}
              label="G.THRESH"
              valueLabel={`${Math.round(s.gateThresh)}`}
            />
            <DigitalReadout
              value={`${Math.round(s.gateThresh)}dB`}
              label="THRESH"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <AnalogKnob
              value={s.gateDecay}
              min={10}
              max={500}
              step={5}
              onChange={set("gateDecay")}
              {...knobCommon}
              size={48}
              label="G.DECAY"
              valueLabel={`${Math.round(s.gateDecay)}`}
            />
            <DigitalReadout
              value={`${Math.round(s.gateDecay)}ms`}
              label="DECAY"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <AnalogKnob
              value={s.decay}
              min={0.2}
              max={6}
              step={0.1}
              onChange={set("decay")}
              {...knobCommon}
              size={48}
              label="DECAY"
              valueLabel={s.decay.toFixed(1)}
            />
            <DigitalReadout
              value={`${s.decay.toFixed(1)}s`}
              label="REVERB"
            />
          </div>
        </div>

        {/* Reverb base knob row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            marginBottom: 8,
            padding: 6,
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${ACCENT}22`,
          }}
        >
          <AnalogKnob
            value={s.preDelay}
            min={0}
            max={200}
            step={1}
            onChange={set("preDelay")}
            {...knobCommon}
            label="PRE"
            valueLabel={`${Math.round(s.preDelay)}ms`}
          />
          <AnalogKnob
            value={s.damping}
            min={0}
            max={1}
            step={0.01}
            onChange={set("damping")}
            {...knobCommon}
            label="DAMP"
            valueLabel={s.damping.toFixed(2)}
          />
          <AnalogKnob
            value={s.diffusion}
            min={0}
            max={1}
            step={0.01}
            onChange={set("diffusion")}
            {...knobCommon}
            label="DIFF"
            valueLabel={s.diffusion.toFixed(2)}
          />
          <AnalogKnob
            value={s.earlyLevel}
            min={0}
            max={1}
            step={0.01}
            onChange={set("earlyLevel")}
            {...knobCommon}
            label="EARLY"
            valueLabel={s.earlyLevel.toFixed(2)}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            padding: 6,
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${ACCENT}22`,
          }}
        >
          <AnalogKnob
            value={s.lateLevel}
            min={0}
            max={1}
            step={0.01}
            onChange={set("lateLevel")}
            {...knobCommon}
            label="LATE"
            valueLabel={s.lateLevel.toFixed(2)}
          />
          <AnalogKnob
            value={s.hpf}
            min={20}
            max={2000}
            step={1}
            onChange={set("hpf")}
            {...knobCommon}
            label="HPF"
            valueLabel={`${Math.round(s.hpf)}`}
          />
          <AnalogKnob
            value={s.lpf}
            min={1000}
            max={20000}
            step={10}
            onChange={set("lpf")}
            {...knobCommon}
            label="LPF"
            valueLabel={`${Math.round(s.lpf)}`}
          />
          <AnalogKnob
            value={s.mix}
            min={0}
            max={100}
            step={1}
            onChange={set("mix")}
            {...knobCommon}
            color="#2a0a0a"
            label="MIX"
            valueLabel={`${Math.round(s.mix)}%`}
          />
        </div>
      </HardwarePanel>
    </div>
  );
}
