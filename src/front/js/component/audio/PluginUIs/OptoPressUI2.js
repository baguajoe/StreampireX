// ============================================================
// OptoPressUI2.js — LA-2A-style opto compressor UI.
// Phase F4-A.7. Suffix `2` to avoid collision with the existing
// OptoPressUI; the orchestrator swaps the import after this lands.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     peakReduction (0..100), gainControl (0..40),
//     hfEmphasis (0..1), tubeSaturation (0..1), outputGain (-24..24),
//     // optional secondary set the factory accepts:
//     threshold, ratio, attack, release  (ms)
//   }
//   - Comp/Limit toggle: changes ratio in setParam.
//     Comp = ratio 3 (program-dependent, gentle).
//     Limit = ratio 10 (peak-style limiting).
//   - Programs: 4 factory presets persisted to localStorage as
//     "spx.optoPress.programs.v1", keyed by program id.
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import VUMeter from "../HardwareUI/VUMeter";
import ButtonBank from "../HardwareUI/ButtonBank";
import ProgramBank from "../HardwareUI/ProgramBank";

const GOLD = "#cc8844";
const GOLD_DIM = "#7a4a18";
const BROWN = "#3a2a18";
const CREAM = "#f0e6c8";

const STORAGE_KEY = "spx.optoPress.programs.v1";

// Factory program defaults — recall via the ProgramBank.
// "DEFAULT" matches the PLUGIN_DEFAULTS.
const FACTORY_PROGRAMS = {
  DEFAULT: {
    peakReduction: 17,
    gainControl: 0,
    hfEmphasis: 0,
    tubeSaturation: 0,
    outputGain: 0,
    ratio: 3,
    threshold: -10,
    attack: 10,
    release: 100,
    mode: "comp",
  },
  VOX: {
    peakReduction: 35,
    gainControl: 8,
    hfEmphasis: 0.4,
    tubeSaturation: 0.2,
    outputGain: 2,
    ratio: 3,
    threshold: -14,
    attack: 10,
    release: 80,
    mode: "comp",
  },
  BASS: {
    peakReduction: 55,
    gainControl: 14,
    hfEmphasis: 0.0,
    tubeSaturation: 0.35,
    outputGain: 3,
    ratio: 3,
    threshold: -16,
    attack: 12,
    release: 150,
    mode: "comp",
  },
  DRUMS: {
    peakReduction: 70,
    gainControl: 18,
    hfEmphasis: 0.15,
    tubeSaturation: 0.5,
    outputGain: 4,
    ratio: 10,
    threshold: -8,
    attack: 8,
    release: 60,
    mode: "limit",
  },
};

const loadUserPrograms = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
};

const saveUserPrograms = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* ignore quota */
  }
};

export default function OptoPressUI2({ params, onChange, onClose }) {
  const [s, setS] = useState({
    peakReduction: 17,
    gainControl: 0,
    hfEmphasis: 0,
    tubeSaturation: 0,
    outputGain: 0,
    threshold: -10,
    ratio: 3,
    attack: 10,
    release: 100,
    mode: "comp",
    ...(params || {}),
  });
  const [currentProgram, setCurrentProgram] = useState("DEFAULT");
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const recallProgram = useCallback((id) => {
    const userData = loadUserPrograms();
    const preset = (userData && userData[id]) || FACTORY_PROGRAMS[id];
    if (preset) {
      setS((p) => ({ ...p, ...preset }));
      setCurrentProgram(id);
    }
  }, []);

  const saveCurrentToProgram = useCallback(
    (id) => {
      const userData = loadUserPrograms();
      userData[id] = { ...s };
      saveUserPrograms(userData);
      setCurrentProgram(id);
    },
    [s]
  );

  // Mode toggle — Comp (ratio 3) vs Limit (ratio 10).
  const onModeChange = (newMode) => {
    setS((p) => ({
      ...p,
      mode: newMode,
      ratio: newMode === "limit" ? 10 : 3,
    }));
  };

  // VU value: peakReduction drives a "gain reduction" visual reading.
  // 0..100 PR → 0..1 VU
  const vuValue = Math.max(0, Math.min(1, s.peakReduction / 100));

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
      <HardwarePanel skin="vintage-cream" accentColor={GOLD} padding={14}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: `1px solid ${GOLD_DIM}55`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontWeight: 700,
                fontSize: 20,
                color: GOLD_DIM,
                letterSpacing: 4,
                textShadow: `0 1px 0 #fff8`,
              }}
            >
              LA-2A
            </span>
            <span
              style={{
                marginLeft: 10,
                fontSize: 11,
                color: BROWN,
                letterSpacing: 3,
                textTransform: "uppercase",
                fontFamily: "Georgia, serif",
              }}
            >
              Opto Press
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: BROWN,
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Large VU meter */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
            padding: "6px 10px",
            background: `linear-gradient(180deg, ${BROWN} 0%, #2a1a08 100%)`,
            borderRadius: 4,
            border: `2px solid ${GOLD}`,
            boxShadow: `inset 0 0 8px rgba(0,0,0,0.5), 0 0 6px ${GOLD}33`,
          }}
        >
          <VUMeter
            value={vuValue}
            min={-20}
            max={3}
            width={260}
            height={140}
            color="#1a1a1a"
            bezelColor={BROWN}
            faceColor={CREAM}
            label="GAIN REDUCTION"
          />
        </div>

        {/* Comp / Limit toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <ButtonBank
            options={[
              { value: "comp", label: "COMP" },
              { value: "limit", label: "LIMIT" },
            ]}
            value={s.mode}
            onChange={onModeChange}
            orientation="horizontal"
            style="hardware"
            size={28}
            accentColor={GOLD}
          />
        </div>

        {/* Two big knobs: Peak Reduction + Gain */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "12px 8px",
            marginBottom: 10,
            background: "rgba(58,42,24,0.18)",
            borderRadius: 4,
            border: `1px solid ${GOLD_DIM}`,
          }}
        >
          <AnalogKnob
            value={s.peakReduction}
            min={0}
            max={100}
            onChange={set("peakReduction")}
            style="vintage"
            size={80}
            color={BROWN}
            indicatorColor={GOLD}
            accentColor={GOLD}
            label="PEAK REDUCTION"
            valueLabel={`${Math.round(s.peakReduction)}`}
            step={1}
          />
          <AnalogKnob
            value={s.gainControl}
            min={0}
            max={40}
            onChange={set("gainControl")}
            style="vintage"
            size={80}
            color={BROWN}
            indicatorColor={GOLD}
            accentColor={GOLD}
            label="GAIN"
            valueLabel={`${Math.round(s.gainControl)}`}
            step={1}
          />
        </div>

        {/* Smaller trim knobs row: HF Emphasis / Tube Sat / Output */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "8px 6px",
            marginBottom: 10,
            background: "rgba(58,42,24,0.10)",
            borderRadius: 4,
            border: `1px solid ${GOLD_DIM}55`,
          }}
        >
          <AnalogKnob
            value={s.hfEmphasis}
            min={0}
            max={1}
            onChange={set("hfEmphasis")}
            style="vintage"
            size={44}
            color={BROWN}
            indicatorColor={GOLD}
            accentColor={GOLD}
            label="HF EMPH"
            valueLabel={`${Math.round(s.hfEmphasis * 100)}%`}
            step={0.01}
          />
          <AnalogKnob
            value={s.tubeSaturation}
            min={0}
            max={1}
            onChange={set("tubeSaturation")}
            style="vintage"
            size={44}
            color={BROWN}
            indicatorColor={GOLD}
            accentColor={GOLD}
            label="TUBE SAT"
            valueLabel={`${Math.round(s.tubeSaturation * 100)}%`}
            step={0.01}
          />
          <AnalogKnob
            value={s.outputGain}
            min={-24}
            max={24}
            onChange={set("outputGain")}
            style="vintage"
            size={44}
            color={BROWN}
            indicatorColor={GOLD}
            accentColor={GOLD}
            label="OUTPUT"
            valueLabel={`${s.outputGain >= 0 ? "+" : ""}${s.outputGain.toFixed(0)}`}
            step={0.5}
          />
        </div>

        {/* Program bank */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "6px 8px",
            background: "rgba(58,42,24,0.18)",
            borderRadius: 4,
            border: `1px solid ${GOLD_DIM}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontSize: 9,
                color: GOLD_DIM,
                letterSpacing: 2,
                fontFamily: "Georgia, serif",
                fontWeight: 700,
              }}
            >
              PROGRAM
            </span>
            <button
              type="button"
              onClick={() => saveCurrentToProgram(currentProgram)}
              style={{
                background: "transparent",
                color: GOLD,
                border: `1px solid ${GOLD_DIM}`,
                borderRadius: 3,
                padding: "2px 8px",
                fontSize: 8,
                fontFamily: "monospace",
                letterSpacing: 1,
                cursor: "pointer",
              }}
              title="Save current settings into the highlighted program slot"
            >
              SAVE
            </button>
          </div>
          <ProgramBank
            programs={[
              { id: "DEFAULT", name: "DEF" },
              { id: "VOX", name: "VOX" },
              { id: "BASS", name: "BASS" },
              { id: "DRUMS", name: "DRMS" },
            ]}
            currentId={currentProgram}
            onChange={recallProgram}
            orientation="horizontal"
            ledColor={GOLD}
            buttonColor={BROWN}
            accentColor={GOLD}
            size={36}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: GOLD_DIM,
            letterSpacing: 3,
            textAlign: "center",
            fontFamily: "Georgia, serif",
          }}
        >
          SPX · LA-2A OPTO PRESS · MK II
        </div>
      </HardwarePanel>
    </div>
  );
}
