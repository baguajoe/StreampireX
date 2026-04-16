// ============================================================
// SPXPlugins.js  —  StreamPireX DSP Plugin Library
// All 57 plugins: Analog, Dynamics, EQ, Spatial, Vocal, Mastering
// Drop into: src/front/js/audio/plugins/SPXPlugins.js
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PultecForgeUI, DynamicEQUI, GraphicEQUI, TiltEQUI, BaxandallEQUI, EQ_FX_ADDITIONS } from './SPXPlugins_EQ';
import { VocoderSPXUI, GranularFreezeUI, NoiseReductionUI, RingModUI, FormantFilterUI, SpectrumAnalyzerUI, CREATIVE_FX_ADDITIONS } from './SPXPlugins_Creative';
import { TapeStopUI, TransientShaperUI, MultibandSatUI, StereoImagerUI, EnhancerSPX808UI, LoFiCrusherUI, InfiniteReverbUI, ReverseDelayUI, DeclickerUI, DehummmerUI, MidSideCompUI, SubOctaverUI, ChorusEnsembleUI, TempoDelayUI, PitchRandomizerUI, AutoWahUI, DrumEnhancerUI, VocalSaturatorUI, GainStagerUI, MultibandLimiterUI, GoniometerUI, PhaseScopeUI, DialogueIsolatorUI, CabinetSimUI, FreqShifterUI } from './SPXPlugins_SPX100';

// ─── UTILITY ────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dbToLin = (db) => Math.pow(10, db / 20);
const linToDb = (lin) => (lin <= 0 ? -Infinity : 20 * Math.log10(lin));

// ─── SHARED KNOB COMPONENT ──────────────────────────────────
export function Knob({ label, value, min, max, step = 0.01, unit = "", onChange, color = "#00ffc8" }) {
  const ref = useRef(null);
  const startY = useRef(null);
  const startVal = useRef(null);

  const pct = (value - min) / (max - min);
  const angle = -140 + pct * 280;

  const onPointerDown = (e) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const onPointerMove = (e) => {
    const delta = (startY.current - e.clientY) / 150;
    const next = clamp(startVal.current + delta * (max - min), min, max);
    onChange(Math.round(next / step) * step);
  };
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "ns-resize" }}>
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #2a2a3a, #0d0d18)",
          border: `2px solid ${color}44`,
          position: "relative", userSelect: "none",
        }}
      >
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 2, height: 18, background: color,
          transformOrigin: "bottom center",
          transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          borderRadius: 2,
        }} />
      </div>
      <div style={{ fontSize: 9, color: "#aaa", textAlign: "center", lineHeight: 1.2 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 10 }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}{unit}
        </div>
        <div>{label}</div>
      </div>
    </div>
  );
}

// ─── SHARED TOGGLE ──────────────────────────────────────────
export function Toggle({ label, value, onChange, color = "#00ffc8" }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, cursor: "pointer",
      }}
    >
      <div style={{
        width: 36, height: 18, borderRadius: 9,
        background: value ? color : "#333",
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: value ? 18 : 2,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
        }} />
      </div>
      <div style={{ fontSize: 9, color: "#aaa" }}>{label}</div>
    </div>
  );
}

// ─── PLUGIN WINDOW SHELL ────────────────────────────────────
export function PluginWindow({ name, color = "#00ffc8", tag, children, onClose }) {
  const [pos, setPos] = useState({ x: 200, y: 120 });
  const dragging = useRef(false);
  const dragStart = useRef({});

  const onDragStart = (e) => {
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", onDragEnd);
  };
  const onDrag = (e) => {
    if (!dragging.current) return;
    setPos({
      x: dragStart.current.px + e.clientX - dragStart.current.mx,
      y: dragStart.current.py + e.clientY - dragStart.current.my,
    });
  };
  const onDragEnd = () => {
    dragging.current = false;
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", onDragEnd);
  };

  return (
    <div style={{
      position: "fixed", left: pos.x, top: pos.y, zIndex: 9999,
      background: "#0d0d1a", border: `1px solid ${color}66`,
      borderRadius: 8, minWidth: 340, boxShadow: `0 8px 40px ${color}22, 0 2px 8px #000`,
      fontFamily: "JetBrains Mono, monospace",
    }}>
      {/* Title Bar */}
      <div
        onMouseDown={onDragStart}
        style={{
          background: `linear-gradient(90deg, ${color}22, transparent)`,
          borderBottom: `1px solid ${color}33`, borderRadius: "8px 8px 0 0",
          padding: "8px 12px", display: "flex", alignItems: "center",
          justifyContent: "space-between", cursor: "grab", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: color, color: "#000", fontSize: 9, fontWeight: 800,
            padding: "2px 6px", borderRadius: 3, letterSpacing: 1,
          }}>{tag}</div>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{name}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "#888",
            cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0,
          }}
        >✕</button>
      </div>
      {/* Content */}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

// ─── KNOB ROW HELPER ────────────────────────────────────────
function KnobRow({ knobs, state, setState, color }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", padding: "8px 0" }}>
      {knobs.map(({ key, label, min, max, step, unit }) => (
        <Knob
          key={key}
          label={label}
          value={state[key] ?? (min + max) / 2}
          min={min} max={max} step={step} unit={unit}
          color={color}
          onChange={(v) => setState((s) => ({ ...s, [key]: v }))}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 1 — ANALOG COLORING
// ═══════════════════════════════════════════════════════════════

// 1. TAPE FORGE — Jiles-Atherton magnetic hysteresis simulation
export function TapeForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    drive: 0.5, bias: 0.5, speed: 15, saturation: 0.6,
    hfLoss: 0.3, noise: 0.05, wow: 0.02, flutter: 0.015,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#FF6600";
  return (
    <PluginWindow name="TapeForge" tag="TAPE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
        { key: "bias", label: "Bias", min: 0, max: 1, step: 0.01 },
        { key: "saturation", label: "Saturation", min: 0, max: 1, step: 0.01 },
        { key: "hfLoss", label: "HF Loss", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "speed", label: "IPS", min: 3.75, max: 30, step: 0.25, unit: " ips" },
        { key: "noise", label: "Hiss", min: 0, max: 0.2, step: 0.001 },
        { key: "wow", label: "Wow", min: 0, max: 0.1, step: 0.001 },
        { key: "flutter", label: "Flutter", min: 0, max: 0.05, step: 0.001 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign: "center", fontSize: 9, color: "#666", marginTop: 8 }}>
        MAGNETIC HYSTERESIS · JILES-ATHERTON MODEL
      </div>
    </PluginWindow>
  );
}

// 2. VALVE GLOW — Even-order harmonic tube saturation
export function ValveGlowUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    drive: 0.4, warmth: 0.6, even2nd: 0.7, even4th: 0.3,
    bias: 0.5, outputGain: 0, dcBlock: true, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#FF8C00";
  return (
    <PluginWindow name="ValveGlow" tag="TUBE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
        { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
        { key: "even2nd", label: "2nd H", min: 0, max: 1, step: 0.01 },
        { key: "even4th", label: "4th H", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "bias", label: "Bias", min: 0, max: 1, step: 0.01 },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="DC Block" value={s.dcBlock} onChange={(v) => setS((p) => ({ ...p, dcBlock: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 3. IRON CORE — Transformer iron nonlinearity + slew limiting
export function IronCoreUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    slewRate: 0.5, coreSize: 0.6, dcMag: 0.2,
    resonance: 0.3, outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#8B6914";
  return (
    <PluginWindow name="IronCore" tag="XFMR" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "slewRate", label: "Slew", min: 0, max: 1, step: 0.01 },
        { key: "coreSize", label: "Core", min: 0, max: 1, step: 0.01 },
        { key: "dcMag", label: "DC Mag", min: 0, max: 1, step: 0.01 },
        { key: "resonance", label: "Reson", min: 0, max: 1, step: 0.01 },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 4. CONSOLE SOUL — Crosstalk, noise floor, component tolerance
export function ConsoleSoulUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    crosstalk: 0.3, noiseFloor: -90, tolerance: 0.02,
    channelColor: 0.5, sumSaturation: 0.4, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#5566aa";
  return (
    <PluginWindow name="ConsoleSoul" tag="CNSL" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "crosstalk", label: "Crosstalk", min: 0, max: 1, step: 0.01 },
        { key: "noiseFloor", label: "Noise", min: -120, max: -60, step: 1, unit: "dB" },
        { key: "tolerance", label: "Tolerance", min: 0, max: 0.1, step: 0.001 },
        { key: "channelColor", label: "Color", min: 0, max: 1, step: 0.01 },
        { key: "sumSaturation", label: "Sum Sat", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign: "center", fontSize: 9, color: "#666", marginTop: 8 }}>
        ANALOG SUMMING SIMULATION · COMPONENT VARIANCE
      </div>
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 2 — DYNAMICS
// ═══════════════════════════════════════════════════════════════

// 5. BRICK WALL — True peak brickwall limiter with ISP
export function BrickWallUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    ceiling: -0.3, lookahead: 3, release: 50,
    truePeak: true, ispDetect: true, outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff3355";
  return (
    <PluginWindow name="BrickWall" tag="LIM" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "ceiling", label: "Ceiling", min: -3, max: 0, step: 0.1, unit: "dB" },
        { key: "lookahead", label: "Lookahead", min: 0, max: 10, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 1000, step: 1, unit: "ms" },
        { key: "outputGain", label: "Output", min: -12, max: 0, step: 0.1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
        <Toggle label="True Peak" value={s.truePeak} onChange={(v) => setS((p) => ({ ...p, truePeak: v }))} color={c} />
        <Toggle label="ISP Detect" value={s.ispDetect} onChange={(v) => setS((p) => ({ ...p, ispDetect: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 6. WARM PRESS — Optical/VCA compressor, program-dependent release
export function WarmPressUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -18, ratio: 4, attack: 10, release: 100,
    knee: 6, makeupGain: 0, model: "optical", mix: 100, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  return (
    <PluginWindow name="WarmPress" tag="COMP" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["optical", "vca", "vari-mu"].map((m) => (
          <button key={m} onClick={() => setS((p) => ({ ...p, model: m }))}
            style={{
              background: s.model === m ? c : "#1a1a2e", color: s.model === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{m.toUpperCase()}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -40, max: 0, step: 0.5, unit: "dB" },
        { key: "ratio", label: "Ratio", min: 1, max: 20, step: 0.1, unit: ":1" },
        { key: "attack", label: "Attack", min: 0.1, max: 300, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 3000, step: 1, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "knee", label: "Knee", min: 0, max: 12, step: 0.5, unit: "dB" },
        { key: "makeupGain", label: "Makeup", min: -6, max: 24, step: 0.1, unit: "dB" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 7. GLUE BUS — SSL G-style VCA bus compressor
export function GlueBusUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -10, ratio: 4, attack: 3, release: 100,
    makeupGain: 2, mix: 100, sidechainHPF: 60, autoGain: true, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00cc88";
  return (
    <PluginWindow name="GlueBus" tag="BUS" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -30, max: 0, step: 0.5, unit: "dB" },
        { key: "ratio", label: "Ratio", min: 2, max: 10, step: 0.5, unit: ":1" },
        { key: "attack", label: "Attack", min: 0.1, max: 30, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 50, max: 1200, step: 10, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "makeupGain", label: "Makeup", min: 0, max: 12, step: 0.1, unit: "dB" },
        { key: "sidechainHPF", label: "SC HPF", min: 20, max: 300, step: 5, unit: "Hz" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Auto Gain" value={s.autoGain} onChange={(v) => setS((p) => ({ ...p, autoGain: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 8. FET STRIKE — Fast FET compressor with odd harmonic saturation
export function FETStrikeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -15, ratio: 8, attack: 0.5, release: 50,
    inputGain: 0, outputGain: 0, saturation: 0.3, allButtonRatio: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff9900";
  return (
    <PluginWindow name="FETStrike" tag="FET" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -40, max: 0, step: 0.5, unit: "dB" },
        { key: "ratio", label: "Ratio", min: 2, max: 20, step: 0.5, unit: ":1" },
        { key: "attack", label: "Attack", min: 0.1, max: 10, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 1200, step: 5, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "inputGain", label: "Input", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "saturation", label: "Sat", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="All Button (20:1)" value={s.allButtonRatio}
          onChange={(v) => setS((p) => ({ ...p, allButtonRatio: v, ratio: v ? 20 : 8 }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 9. OPTO PRESS — Photo-resistor optical leveler with program memory
export function OptoPressUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    peakReduction: 50, gainControl: 0, hfEmphasis: 0,
    tubeSaturation: 0.4, outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#88bbff";
  return (
    <PluginWindow name="OptoPress" tag="OPTO" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "peakReduction", label: "Peak Red", min: 0, max: 100, step: 1, unit: "%" },
        { key: "gainControl", label: "Gain", min: 0, max: 40, step: 0.5, unit: "dB" },
        { key: "hfEmphasis", label: "HF Emp", min: 0, max: 1, step: 0.01 },
        { key: "tubeSaturation", label: "Tube Sat", min: 0, max: 1, step: 0.01 },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign: "center", fontSize: 9, color: "#666", marginTop: 8 }}>
        PROGRAM-DEPENDENT RELEASE · ELECTRO-OPTICAL CELL SIMULATION
      </div>
    </PluginWindow>
  );
}

// 10. PARALLEL CRUSH — Parallel compression with independent wet/dry
export function ParallelCrushUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -25, ratio: 10, attack: 5, release: 80,
    wetGain: 0, dryGain: 0, mix: 50, crush: 0.7, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#cc44ff";
  return (
    <PluginWindow name="ParallelCrush" tag="PARA" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -40, max: 0, step: 0.5, unit: "dB" },
        { key: "ratio", label: "Ratio", min: 2, max: 40, step: 0.5, unit: ":1" },
        { key: "crush", label: "Crush", min: 0, max: 1, step: 0.01 },
        { key: "attack", label: "Attack", min: 0.1, max: 100, step: 0.1, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "wetGain", label: "Wet Gain", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "dryGain", label: "Dry Gain", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "mix", label: "Blend", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 11. MULTI PRESS — 4-band multiband compressor
export function MultiPressUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    xover1: 100, xover2: 1000, xover3: 8000,
    b1Thresh: -20, b1Ratio: 3, b1Gain: 0,
    b2Thresh: -18, b2Ratio: 3, b2Gain: 0,
    b3Thresh: -16, b3Ratio: 4, b3Gain: 0,
    b4Thresh: -14, b4Ratio: 4, b4Gain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff6644";
  const bands = [
    { n: "Sub/Low", k: "b1", range: "20-xover1 Hz" },
    { n: "Low-Mid", k: "b2", range: "xover1-xover2 Hz" },
    { n: "High-Mid", k: "b3", range: "xover2-xover3 Hz" },
    { n: "Air", k: "b4", range: "xover3-20k Hz" },
  ];
  return (
    <PluginWindow name="MultiPress" tag="MB" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "xover1", label: "X1", min: 40, max: 400, step: 5, unit: "Hz" },
        { key: "xover2", label: "X2", min: 400, max: 4000, step: 10, unit: "Hz" },
        { key: "xover3", label: "X3", min: 4000, max: 16000, step: 50, unit: "Hz" },
      ]} state={s} setState={setS} color={c} />
      {bands.map(({ n, k }) => (
        <div key={k} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 9, color: c, marginBottom: 4, textAlign: "center" }}>{n}</div>
          <KnobRow knobs={[
            { key: k + "Thresh", label: "Thresh", min: -40, max: 0, step: 0.5, unit: "dB" },
            { key: k + "Ratio", label: "Ratio", min: 1, max: 20, step: 0.5, unit: ":1" },
            { key: k + "Gain", label: "Gain", min: -12, max: 12, step: 0.1, unit: "dB" },
          ]} state={s} setState={setS} color={c} />
        </div>
      ))}
    </PluginWindow>
  );
}

// 12. TRANS GATE — Noise gate with frequency-selective sidechain
export function TransGateUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -40, attack: 1, hold: 50, release: 200,
    range: -80, hysteresis: 3, scHPF: 80, scLPF: 8000,
    lookahead: 1, flip: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#44ddaa";
  return (
    <PluginWindow name="TransGate" tag="GATE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -80, max: 0, step: 0.5, unit: "dB" },
        { key: "attack", label: "Attack", min: 0.1, max: 50, step: 0.1, unit: "ms" },
        { key: "hold", label: "Hold", min: 0, max: 2000, step: 1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 4000, step: 10, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "range", label: "Range", min: -80, max: 0, step: 1, unit: "dB" },
        { key: "hysteresis", label: "Hyster", min: 0, max: 12, step: 0.5, unit: "dB" },
        { key: "scHPF", label: "SC HPF", min: 20, max: 2000, step: 10, unit: "Hz" },
        { key: "lookahead", label: "Lookahead", min: 0, max: 10, step: 0.1, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Flip (Ducker)" value={s.flip} onChange={(v) => setS((p) => ({ ...p, flip: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 3 — EQ
// ═══════════════════════════════════════════════════════════════

// 13. IRON BAND — Proportional Q analog EQ (stepped frequencies)
export function IronBandUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    lowGain: 0, lowFreq: 100, lowMidGain: 0, lowMidFreq: 360,
    hiMidGain: 0, hiMidFreq: 3200, hiGain: 0, hiFreq: 10000,
    hpf: 0, lpf: 20000, inputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#44aaff";
  const LOW_FREQS = [50, 60, 80, 100, 120, 150, 200, 250];
  const LOMID_FREQS = [200, 240, 360, 500, 700, 1000, 1500, 2200];
  const HIMID_FREQS = [1500, 2000, 3200, 4000, 5000, 6000, 7000, 8000];
  const HI_FREQS = [5000, 6000, 8000, 10000, 12000, 14000, 16000, 20000];
  const stepFreq = (key, freqs) => {
    const cur = s[key];
    const i = freqs.indexOf(cur);
    setS((p) => ({ ...p, [key]: freqs[(i + 1) % freqs.length] }));
  };
  return (
    <PluginWindow name="IronBand" tag="EQ" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "inputGain", label: "Input", min: -12, max: 12, step: 0.5, unit: "dB" },
        { key: "hpf", label: "HPF", min: 0, max: 300, step: 5, unit: "Hz" },
        { key: "lpf", label: "LPF", min: 5000, max: 20000, step: 100, unit: "Hz" },
      ]} state={s} setState={setS} color={c} />
      {[
        { gain: "lowGain", freq: "lowFreq", label: "LOW", freqs: LOW_FREQS },
        { gain: "lowMidGain", freq: "lowMidFreq", label: "LO-MID", freqs: LOMID_FREQS },
        { gain: "hiMidGain", freq: "hiMidFreq", label: "HI-MID", freqs: HIMID_FREQS },
        { gain: "hiGain", freq: "hiFreq", label: "HIGH", freqs: HI_FREQS },
      ].map(({ gain, freq, label, freqs }) => (
        <div key={gain} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <div style={{ fontSize: 9, color: c, width: 50, textAlign: "right" }}>{label}</div>
          <Knob label="Gain" value={s[gain]} min={-12} max={12} step={0.5} unit="dB"
            color={c} onChange={(v) => setS((p) => ({ ...p, [gain]: v }))} />
          <button
            onClick={() => stepFreq(freq, freqs)}
            style={{
              background: "#1a1a2e", border: `1px solid ${c}44`, color: c,
              borderRadius: 4, padding: "3px 10px", fontSize: 10, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700,
            }}
          >{s[freq]} Hz</button>
        </div>
      ))}
    </PluginWindow>
  );
}

// 14. SPECTRA CURVE — Linear phase mastering EQ with Mid/Side
export function SpectraCurveUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    mode: "stereo", bands: [
      { freq: 80, gain: 0, q: 1, type: "highpass" },
      { freq: 250, gain: 0, q: 1, type: "peak" },
      { freq: 1000, gain: 0, q: 1, type: "peak" },
      { freq: 4000, gain: 0, q: 1, type: "peak" },
      { freq: 12000, gain: 0, q: 1, type: "peak" },
      { freq: 18000, gain: 0, q: 0.7, type: "lowpass" },
    ], ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const setBand = (i, key, val) => {
    const bands = [...s.bands];
    bands[i] = { ...bands[i], [key]: val };
    setS((p) => ({ ...p, bands }));
  };
  return (
    <PluginWindow name="SpectraCurve" tag="LP-EQ" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
        {["stereo", "mid", "side", "left", "right"].map((m) => (
          <button key={m} onClick={() => setS((p) => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "2px 8px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{m.toUpperCase()}</button>
        ))}
      </div>
      {s.bands.map((band, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: "#666", width: 14 }}>{i + 1}</div>
          <Knob label="Freq" value={band.freq} min={20} max={20000} step={1} unit="Hz"
            color={c} onChange={(v) => setBand(i, "freq", v)} />
          <Knob label="Gain" value={band.gain} min={-18} max={18} step={0.1} unit="dB"
            color={c} onChange={(v) => setBand(i, "gain", v)} />
          <Knob label="Q" value={band.q} min={0.1} max={10} step={0.1}
            color={c} onChange={(v) => setBand(i, "q", v)} />
          <select value={band.type} onChange={(e) => setBand(i, "type", e.target.value)}
            style={{
              background: "#1a1a2e", border: `1px solid ${c}33`, color: "#888",
              fontSize: 9, borderRadius: 3, padding: 2, fontFamily: "inherit",
            }}>
            {["peak", "lowshelf", "highshelf", "highpass", "lowpass", "notch"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 9, color: "#555", marginTop: 8 }}>
        LINEAR PHASE · 6-BAND · MID-SIDE MATRIX
      </div>
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 4 — SPATIAL / REVERB
// ═══════════════════════════════════════════════════════════════

// Base reverb component
function ReverbBase({ name, tag, color, params, onChange, onClose, extraKnobs = [] }) {
  const [s, setS] = useState({
    preDelay: 20, decay: 2.5, diffusion: 0.8, damping: 0.5,
    earlyLevel: 0.7, lateLevel: 0.8, mix: 30, hpf: 80, lpf: 8000,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  return (
    <PluginWindow name={name} tag={tag} color={color} onClose={onClose}>
      <KnobRow knobs={[
        { key: "preDelay", label: "Pre-Dly", min: 0, max: 150, step: 0.5, unit: "ms" },
        { key: "decay", label: "Decay", min: 0.1, max: 30, step: 0.1, unit: "s" },
        { key: "diffusion", label: "Diffuse", min: 0, max: 1, step: 0.01 },
        { key: "damping", label: "Damping", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={color} />
      <KnobRow knobs={[
        { key: "earlyLevel", label: "Early", min: 0, max: 1, step: 0.01 },
        { key: "lateLevel", label: "Late", min: 0, max: 1, step: 0.01 },
        { key: "hpf", label: "HPF", min: 20, max: 500, step: 5, unit: "Hz" },
        { key: "lpf", label: "LPF", min: 1000, max: 20000, step: 100, unit: "Hz" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={color} />
      {extraKnobs.length > 0 && (
        <KnobRow knobs={extraKnobs} state={s} setState={setS} color={color} />
      )}
    </PluginWindow>
  );
}

export const HallForgeSmallUI = (p) => <ReverbBase {...p} name="HallForge I" tag="HALL" color="#7744ff"
  extraKnobs={[{ key: "roomSize", label: "Room", min: 0, max: 1, step: 0.01 }]} />;

export const HallForgeLargeUI = (p) => <ReverbBase {...p} name="HallForge II" tag="HALL" color="#5533dd"
  extraKnobs={[{ key: "surroundWidth", label: "Surround", min: 0, max: 1, step: 0.01 }]} />;

export const GateVerbUI = (p) => <ReverbBase {...p} name="GateVerb" tag="GATE-R" color="#ff4488"
  extraKnobs={[
    { key: "gateThresh", label: "G.Thresh", min: -80, max: 0, step: 1, unit: "dB" },
    { key: "gateDecay", label: "G.Decay", min: 10, max: 500, step: 5, unit: "ms" },
  ]} />;

export const VintageAirUI = (p) => <ReverbBase {...p} name="VintageAir" tag="224" color="#aaaaff"
  extraKnobs={[{ key: "density", label: "Density", min: 0, max: 1, step: 0.01 }]} />;

export const StochasticHallUI = (p) => <ReverbBase {...p} name="StochasticHall" tag="RAND" color="#88ffcc"
  extraKnobs={[
    { key: "randomness", label: "Random", min: 0, max: 1, step: 0.01 },
    { key: "spread", label: "Spread", min: 0, max: 1, step: 0.01 },
  ]} />;

export const GreatHallUI = (p) => <ReverbBase {...p} name="GreatHall" tag="CONC" color="#6644aa" />;

// 21. PLATE FORGE — EMT-style plate reverb
export function PlateForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    decay: 3.5, damping: 0.4, diffusion: 0.9, mix: 25,
    bass: 0, treble: 0, width: 1, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#cc9944";
  return (
    <PluginWindow name="PlateForge" tag="PLATE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "decay", label: "Decay", min: 0.5, max: 10, step: 0.1, unit: "s" },
        { key: "damping", label: "Damping", min: 0, max: 1, step: 0.01 },
        { key: "diffusion", label: "Diffuse", min: 0, max: 1, step: 0.01 },
        { key: "bass", label: "Bass Bst", min: -6, max: 6, step: 0.1, unit: "dB" },
        { key: "treble", label: "Treble", min: -6, max: 6, step: 0.1, unit: "dB" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 22. SPRING BOX — Physical spring reverb with tank modeling
export function SpringBoxUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    tanks: 3, tension: 0.6, damping: 0.4, drip: 0.3,
    mix: 30, inputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#88aa44";
  return (
    <PluginWindow name="SpringBox" tag="SPRG" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[2, 3, 4].map((n) => (
          <button key={n} onClick={() => setS((p) => ({ ...p, tanks: n }))}
            style={{
              background: s.tanks === n ? c : "#1a1a2e", color: s.tanks === n ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{n} Tank{n > 1 ? "s" : ""}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "tension", label: "Tension", min: 0, max: 1, step: 0.01 },
        { key: "damping", label: "Damping", min: 0, max: 1, step: 0.01 },
        { key: "drip", label: "Drip", min: 0, max: 1, step: 0.01 },
        { key: "inputGain", label: "Input", min: -12, max: 12, step: 0.5, unit: "dB" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 23. ECHO FIELD — Modulated delay with chorus shimmer
export function EchoFieldUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    time: 250, feedback: 0.4, modRate: 0.3, modDepth: 0.2,
    hpf: 100, lpf: 8000, mix: 25, stereoSpread: 0.5, sync: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00aaff";
  return (
    <PluginWindow name="EchoField" tag="DLY" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "time", label: "Time", min: 10, max: 2000, step: 1, unit: "ms" },
        { key: "feedback", label: "Feedback", min: 0, max: 0.98, step: 0.01 },
        { key: "modRate", label: "Mod Rate", min: 0, max: 5, step: 0.01, unit: "Hz" },
        { key: "modDepth", label: "Mod Depth", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "hpf", label: "HPF", min: 20, max: 2000, step: 10, unit: "Hz" },
        { key: "lpf", label: "LPF", min: 1000, max: 20000, step: 100, unit: "Hz" },
        { key: "stereoSpread", label: "Spread", min: 0, max: 1, step: 0.01 },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Tempo Sync" value={s.sync} onChange={(v) => setS((p) => ({ ...p, sync: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 24. STEREO BLOOM — BBD-style stereo chorus/flanger
export function StereoBloomUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    mode: "chorus", rate: 0.5, depth: 0.6, feedback: 0.2,
    detuneL: -8, detuneR: 8, mix: 50, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff44aa";
  return (
    <PluginWindow name="StereoBloom" tag="CHOR" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["chorus", "flanger", "vibrato"].map((m) => (
          <button key={m} onClick={() => setS((p) => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "rate", label: "Rate", min: 0.01, max: 10, step: 0.01, unit: "Hz" },
        { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01 },
        { key: "feedback", label: "Feedback", min: -1, max: 1, step: 0.01 },
        { key: "detuneL", label: "Det L", min: -50, max: 0, step: 0.5, unit: "¢" },
        { key: "detuneR", label: "Det R", min: 0, max: 50, step: 0.5, unit: "¢" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 25. PITCH FORGE — Intelligent pitch shifting
export function PitchForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    shift: 0, formant: 0, grainSize: 80, crossfade: 0.5,
    mix: 100, pitchA: 0, pitchB: 7, harmony: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ffcc00";
  return (
    <PluginWindow name="PitchForge" tag="PTCH" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "shift", label: "Shift", min: -24, max: 24, step: 0.1, unit: "st" },
        { key: "formant", label: "Formant", min: -6, max: 6, step: 0.1, unit: "st" },
        { key: "grainSize", label: "Grain", min: 10, max: 500, step: 5, unit: "ms" },
        { key: "crossfade", label: "Xfade", min: 0, max: 1, step: 0.01 },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Harmony Mode" value={s.harmony} onChange={(v) => setS((p) => ({ ...p, harmony: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 26. DUAL DELAY — Stereo delay with independent L/R + modulation
export function DualDelayUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    timeL: 250, timeR: 375, feedbackL: 0.35, feedbackR: 0.35,
    crossfeedL: 0.1, crossfeedR: 0.1, modRate: 0.3, modDepth: 0.1,
    hpf: 80, lpf: 10000, mix: 30, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#0099ff";
  return (
    <PluginWindow name="DualDelay" tag="DDL" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <div style={{ fontSize: 9, color: c, textAlign: "center", marginBottom: 4 }}>LEFT</div>
          <KnobRow knobs={[
            { key: "timeL", label: "Time", min: 10, max: 2000, step: 1, unit: "ms" },
            { key: "feedbackL", label: "FB", min: 0, max: 0.98, step: 0.01 },
            { key: "crossfeedL", label: "Cross", min: 0, max: 1, step: 0.01 },
          ]} state={s} setState={setS} color={c} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: c, textAlign: "center", marginBottom: 4 }}>RIGHT</div>
          <KnobRow knobs={[
            { key: "timeR", label: "Time", min: 10, max: 2000, step: 1, unit: "ms" },
            { key: "feedbackR", label: "FB", min: 0, max: 0.98, step: 0.01 },
            { key: "crossfeedR", label: "Cross", min: 0, max: 1, step: 0.01 },
          ]} state={s} setState={setS} color={c} />
        </div>
      </div>
      <KnobRow knobs={[
        { key: "modRate", label: "Mod Rate", min: 0, max: 5, step: 0.01, unit: "Hz" },
        { key: "modDepth", label: "Mod Depth", min: 0, max: 1, step: 0.01 },
        { key: "hpf", label: "HPF", min: 20, max: 1000, step: 5, unit: "Hz" },
        { key: "lpf", label: "LPF", min: 1000, max: 20000, step: 100, unit: "Hz" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 5 — VOCAL SUITE
// ═══════════════════════════════════════════════════════════════

// 27. PITCH LOCK — Auto-tune style chromatic pitch correction
export function PitchLockUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    key: "C", scale: "major", speed: 0, retune: 0, humanize: 0.3,
    formant: 0, detune: 0, bypass: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const keys = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const scales = ["major", "minor", "pentatonic", "chromatic", "blues", "dorian", "mixolydian"];
  return (
    <PluginWindow name="PitchLock" tag="TUNE" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {keys.map((k) => (
          <button key={k} onClick={() => setS((p) => ({ ...p, key: k }))}
            style={{
              background: s.key === k ? c : "#1a1a2e", color: s.key === k ? "#000" : "#888",
              border: `1px solid ${c}33`, borderRadius: 3, padding: "2px 6px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
              minWidth: 28,
            }}>{k}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {scales.map((sc) => (
          <button key={sc} onClick={() => setS((p) => ({ ...p, scale: sc }))}
            style={{
              background: s.scale === sc ? c + "33" : "transparent", color: s.scale === sc ? c : "#666",
              border: `1px solid ${s.scale === sc ? c : "#333"}`, borderRadius: 3, padding: "2px 8px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{sc}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "speed", label: "Speed", min: 0, max: 1, step: 0.01 },
        { key: "retune", label: "Retune", min: 0, max: 1000, step: 5, unit: "ms" },
        { key: "humanize", label: "Humanize", min: 0, max: 1, step: 0.01 },
        { key: "formant", label: "Formant", min: -6, max: 6, step: 0.1, unit: "st" },
        { key: "detune", label: "Detune", min: -100, max: 100, step: 1, unit: "¢" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 28. VOICE FORGE — Vocal harmonizer with up to 4 voices
export function VoiceForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    voices: 2, key: "C", scale: "major",
    v1Shift: -5, v2Shift: 3, v3Shift: 7, v4Shift: 12,
    v1Vol: 0.8, v2Vol: 0.7, v3Vol: 0.6, v4Vol: 0.5,
    formant: 0, mix: 50, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff66cc";
  return (
    <PluginWindow name="VoiceForge" tag="HARM" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} onClick={() => setS((p) => ({ ...p, voices: n }))}
            style={{
              background: s.voices >= n ? c : "#1a1a2e", color: s.voices >= n ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{n} Voice{n > 1 ? "s" : ""}</button>
        ))}
      </div>
      {[1, 2, 3, 4].filter((n) => n <= s.voices).map((n) => (
        <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: c, width: 14 }}>V{n}</div>
          <Knob label="Interval" value={s[`v${n}Shift`]} min={-24} max={24} step={1} unit="st"
            color={c} onChange={(v) => setS((p) => ({ ...p, [`v${n}Shift`]: v }))} />
          <Knob label="Volume" value={s[`v${n}Vol`]} min={0} max={1} step={0.01}
            color={c} onChange={(v) => setS((p) => ({ ...p, [`v${n}Vol`]: v }))} />
        </div>
      ))}
      <KnobRow knobs={[
        { key: "formant", label: "Formant", min: -6, max: 6, step: 0.1, unit: "st" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 29. BREATH GATE — Breath and noise gating for vocals
export function BreathGateUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    threshold: -45, sensitivity: 0.7, attack: 2, release: 150,
    breathReduction: -12, noiseFloor: -60, learn: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#88ddff";
  return (
    <PluginWindow name="BreathGate" tag="BRTH" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "threshold", label: "Threshold", min: -80, max: 0, step: 0.5, unit: "dB" },
        { key: "sensitivity", label: "Sensitivity", min: 0, max: 1, step: 0.01 },
        { key: "breathReduction", label: "BR Reduce", min: -40, max: 0, step: 0.5, unit: "dB" },
        { key: "attack", label: "Attack", min: 0.1, max: 20, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 1000, step: 5, unit: "ms" },
        { key: "noiseFloor", label: "NF", min: -90, max: -40, step: 1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Auto Learn" value={s.learn} onChange={(v) => setS((p) => ({ ...p, learn: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 30. SIBILANT CUT — Frequency-selective de-esser
export function SibilantCutUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    freq: 7500, bandwidth: 0.5, threshold: -18, ratio: 6,
    attackSpeed: 0.3, mode: "dynamic", listenSC: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ffaa00";
  return (
    <PluginWindow name="SibilantCut" tag="D-ESS" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["dynamic", "broadband", "split"].map((m) => (
          <button key={m} onClick={() => setS((p) => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{m}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "freq", label: "Freq", min: 2000, max: 16000, step: 100, unit: "Hz" },
        { key: "bandwidth", label: "Width", min: 0, max: 1, step: 0.01 },
        { key: "threshold", label: "Threshold", min: -40, max: 0, step: 0.5, unit: "dB" },
        { key: "ratio", label: "Ratio", min: 1, max: 20, step: 0.5, unit: ":1" },
        { key: "attackSpeed", label: "Speed", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Listen SC" value={s.listenSC} onChange={(v) => setS((p) => ({ ...p, listenSC: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 31. PHANTOM DOUBLE — ADT automatic double tracking
export function PhantomDoubleUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    delay: 18, spread: 0.8, pitchVarL: -5, pitchVarR: 5,
    modRate: 0.3, modDepth: 3, mix: 50, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#cc88ff";
  return (
    <PluginWindow name="PhantomDouble" tag="ADT" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "delay", label: "Delay", min: 5, max: 50, step: 0.5, unit: "ms" },
        { key: "spread", label: "Spread", min: 0, max: 1, step: 0.01 },
        { key: "pitchVarL", label: "Pitch L", min: -20, max: 0, step: 0.5, unit: "¢" },
        { key: "pitchVarR", label: "Pitch R", min: 0, max: 20, step: 0.5, unit: "¢" },
        { key: "modRate", label: "Mod Rate", min: 0.1, max: 3, step: 0.01, unit: "Hz" },
        { key: "modDepth", label: "Mod Depth", min: 0, max: 20, step: 0.5, unit: "¢" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 32. VOCAL SPACE — Vocal-optimized reverb (plate + early reflections)
export function VocalSpaceUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    preDelay: 15, decay: 1.8, brightness: 0.6, warmth: 0.5,
    size: 0.4, earlyMix: 0.6, lateMix: 0.4, mix: 20, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff99cc";
  return (
    <PluginWindow name="VocalSpace" tag="VRV" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "preDelay", label: "Pre-Dly", min: 0, max: 60, step: 0.5, unit: "ms" },
        { key: "decay", label: "Decay", min: 0.2, max: 6, step: 0.05, unit: "s" },
        { key: "brightness", label: "Brightness", min: 0, max: 1, step: 0.01 },
        { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <KnobRow knobs={[
        { key: "size", label: "Size", min: 0, max: 1, step: 0.01 },
        { key: "earlyMix", label: "Early", min: 0, max: 1, step: 0.01 },
        { key: "lateMix", label: "Late", min: 0, max: 1, step: 0.01 },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCH 6 — MASTERING SUITE
// ═══════════════════════════════════════════════════════════════

// 33. MASTER WALL — True peak limiter with ISP and dithering
export function MasterWallUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    ceiling: -0.1, lookahead: 5, release: 100, threshold: -0.3,
    clipMargin: 0.1, truePeak: true, dither: "none", outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff2244";
  return (
    <PluginWindow name="MasterWall" tag="MLIM" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "ceiling", label: "Ceiling", min: -3, max: 0, step: 0.01, unit: "dBTP" },
        { key: "threshold", label: "Threshold", min: -6, max: 0, step: 0.1, unit: "dB" },
        { key: "lookahead", label: "Lookahead", min: 0, max: 20, step: 0.1, unit: "ms" },
        { key: "release", label: "Release", min: 10, max: 2000, step: 5, unit: "ms" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["none", "TPDF", "shaped"].map((d) => (
          <button key={d} onClick={() => setS((p) => ({ ...p, dither: d }))}
            style={{
              background: s.dither === d ? c : "#1a1a2e", color: s.dither === d ? "#fff" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{d}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Toggle label="True Peak" value={s.truePeak} onChange={(v) => setS((p) => ({ ...p, truePeak: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 34. STEREO FORGE — Width, M-S matrix, mono compatibility
export function StereoForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    width: 100, midGain: 0, sideGain: 0, balance: 0,
    monoBelow: 100, phase: false, mono: false, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#44ffaa";
  return (
    <PluginWindow name="StereoForge" tag="M-S" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "width", label: "Width", min: 0, max: 200, step: 1, unit: "%" },
        { key: "midGain", label: "Mid Gain", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "sideGain", label: "Side Gain", min: -12, max: 12, step: 0.1, unit: "dB" },
        { key: "balance", label: "Balance", min: -100, max: 100, step: 1 },
        { key: "monoBelow", label: "Mono <", min: 20, max: 300, step: 5, unit: "Hz" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Flip Phase" value={s.phase} onChange={(v) => setS((p) => ({ ...p, phase: v }))} color={c} />
        <Toggle label="Sum Mono" value={s.mono} onChange={(v) => setS((p) => ({ ...p, mono: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 35. LOUDNESS METER — LUFS / LRA / True Peak streaming targets
export function LoudnessMeterUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    target: "streaming", integrated: -14, lra: 8, truePeak: -1,
    momentary: -14, shortTerm: -14, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const targets = { streaming: -14, cd: -9, broadcast: -23, film: -24, game: -16 };
  const mkBar = (val, min, max, col) => {
    const pct = clamp((val - min) / (max - min), 0, 1) * 100;
    return (
      <div style={{ flex: 1, background: "#111", borderRadius: 2, height: 12, position: "relative" }}>
        <div style={{ width: pct + "%", background: col, height: "100%", borderRadius: 2, transition: "width 0.2s" }} />
      </div>
    );
  };
  return (
    <PluginWindow name="LoudnessMeter" tag="LUFS" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(targets).map(([t, v]) => (
          <button key={t} onClick={() => setS((p) => ({ ...p, target: t, integrated: v }))}
            style={{
              background: s.target === t ? c : "#1a1a2e", color: s.target === t ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 8px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{t.toUpperCase()} ({v})</button>
        ))}
      </div>
      {[
        { label: "Integrated", key: "integrated", min: -40, max: 0, col: c },
        { label: "Short Term", key: "shortTerm", min: -40, max: 0, col: "#ffaa00" },
        { label: "Momentary", key: "momentary", min: -40, max: 0, col: "#ff4444" },
        { label: "LRA", key: "lra", min: 0, max: 30, col: "#8888ff" },
        { label: "True Peak", key: "truePeak", min: -20, max: 0, col: "#ff6666" },
      ].map(({ label, key, min, max, col }) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: "#888", width: 72 }}>{label}</div>
          {mkBar(s[key], min, max, col)}
          <div style={{ fontSize: 10, color: col, width: 40, textAlign: "right", fontWeight: 700 }}>
            {s[key]} {key === "lra" ? "LU" : key === "truePeak" ? "dBTP" : "LUFS"}
          </div>
        </div>
      ))}
    </PluginWindow>
  );
}

// 36. HARMONIC EXCITE — Aural exciter with high frequency harmonic generation
export function HarmonicExciteUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    freq: 3000, drive: 0.5, even: 0.6, odd: 0.3,
    mix: 30, airBoost: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ffee44";
  return (
    <PluginWindow name="HarmonicExcite" tag="EXCITE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "freq", label: "Freq", min: 500, max: 12000, step: 100, unit: "Hz" },
        { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
        { key: "even", label: "Even H", min: 0, max: 1, step: 0.01 },
        { key: "odd", label: "Odd H", min: 0, max: 1, step: 0.01 },
        { key: "airBoost", label: "Air", min: -6, max: 12, step: 0.1, unit: "dB" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 37. VINYL PRESS — RIAA curve, crackle, vinyl simulation
export function VinylPressUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    warmth: 0.6, crackle: 0.2, dust: 0.15, warp: 0.1,
    riaa: true, rpm: 33, hpf: 20, outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#cc8844";
  return (
    <PluginWindow name="VinylPress" tag="VINYL" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[33, 45, 78].map((r) => (
          <button key={r} onClick={() => setS((p) => ({ ...p, rpm: r }))}
            style={{
              background: s.rpm === r ? c : "#1a1a2e", color: s.rpm === r ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 12px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{r} RPM</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
        { key: "crackle", label: "Crackle", min: 0, max: 1, step: 0.01 },
        { key: "dust", label: "Dust", min: 0, max: 1, step: 0.01 },
        { key: "warp", label: "Warp", min: 0, max: 1, step: 0.01 },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.5, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="RIAA EQ" value={s.riaa} onChange={(v) => setS((p) => ({ ...p, riaa: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 38. DITHER FORGE — Noise shaping dithering
export function DitherForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    bitDepth: 24, type: "shaped", noiseShaping: "F1",
    highPass: true, level: 0.5, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#aaaaaa";
  return (
    <PluginWindow name="DitherForge" tag="DITH" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[8, 16, 20, 24, 32].map((b) => (
          <button key={b} onClick={() => setS((p) => ({ ...p, bitDepth: b }))}
            style={{
              background: s.bitDepth === b ? c : "#1a1a2e", color: s.bitDepth === b ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{b}-bit</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["TPDF", "shaped", "flat"].map((t) => (
          <button key={t} onClick={() => setS((p) => ({ ...p, type: t }))}
            style={{
              background: s.type === t ? "#555" : "#1a1a2e", color: s.type === t ? "#fff" : "#888",
              border: "1px solid #444", borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "level", label: "Level", min: 0, max: 1, step: 0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="HP Filter" value={s.highPass} onChange={(v) => setS((p) => ({ ...p, highPass: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 39. DC BLOCK — DC offset removal + subsonic filter
export function DCBlockUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    hpfFreq: 5, hpfSlope: 12, dcRemove: true, subCut: 30, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#888888";
  return (
    <PluginWindow name="DCBlock" tag="DC" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "hpfFreq", label: "HPF Freq", min: 1, max: 30, step: 0.5, unit: "Hz" },
        { key: "hpfSlope", label: "Slope", min: 6, max: 48, step: 6, unit: "dB/oct" },
        { key: "subCut", label: "Sub Cut", min: 10, max: 80, step: 1, unit: "Hz" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="DC Remove" value={s.dcRemove} onChange={(v) => setS((p) => ({ ...p, dcRemove: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 40. SPACE FORGE — Convolution reverb engine
export function SpaceForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    ir: "concert_hall", preDelay: 10, stretch: 1.0,
    trim: 1.0, earlyGain: 0, lateGain: 0, mix: 25, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#9966ff";
  const irs = ["concert_hall", "cathedral", "small_room", "bathroom", "car", "plate_1", "spring_1", "outdoor_park"];
  return (
    <PluginWindow name="SpaceForge" tag="CONV" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
        {irs.map((ir) => (
          <button key={ir} onClick={() => setS((p) => ({ ...p, ir }))}
            style={{
              background: s.ir === ir ? c + "44" : "transparent",
              color: s.ir === ir ? c : "#666",
              border: `1px solid ${s.ir === ir ? c : "#333"}`,
              borderRadius: 4, padding: "2px 8px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{ir.replace(/_/g, " ")}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "preDelay", label: "Pre-Dly", min: 0, max: 200, step: 1, unit: "ms" },
        { key: "stretch", label: "Stretch", min: 0.25, max: 4, step: 0.01, unit: "x" },
        { key: "trim", label: "Trim", min: 0.1, max: 1, step: 0.01 },
        { key: "earlyGain", label: "Early", min: -12, max: 12, step: 0.5, unit: "dB" },
        { key: "lateGain", label: "Late", min: -12, max: 12, step: 0.5, unit: "dB" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 41. VORTEX MOD — Flanger / Chorus / Phaser unified modulator
export function VortexModUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    mode: "flanger", rate: 0.5, depth: 0.7, feedback: 0.4,
    stages: 4, center: 1000, mix: 50, stereo: true, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff44ff";
  return (
    <PluginWindow name="VortexMod" tag="MOD" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["flanger", "phaser", "tremolo"].map((m) => (
          <button key={m} onClick={() => setS((p) => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key: "rate", label: "Rate", min: 0.01, max: 20, step: 0.01, unit: "Hz" },
        { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01 },
        { key: "feedback", label: "Feedback", min: -1, max: 1, step: 0.01 },
        { key: "stages", label: "Stages", min: 2, max: 12, step: 2 },
        { key: "center", label: "Center", min: 100, max: 8000, step: 50, unit: "Hz" },
        { key: "mix", label: "Mix", min: 0, max: 100, step: 1, unit: "%" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Stereo" value={s.stereo} onChange={(v) => setS((p) => ({ ...p, stereo: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// 42. GAIN RIDER — Automatic gain riding for vocals
export function GainRiderUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    targetLevel: -18, speed: 0.5, maxGain: 12, minGain: -12,
    lookahead: 10, smooth: 0.7, gateThresh: -60, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#88ff88";
  return (
    <PluginWindow name="GainRider" tag="RIDE" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "targetLevel", label: "Target", min: -40, max: -6, step: 0.5, unit: "dB" },
        { key: "speed", label: "Speed", min: 0, max: 1, step: 0.01 },
        { key: "maxGain", label: "Max Gain", min: 0, max: 24, step: 0.5, unit: "dB" },
        { key: "minGain", label: "Min Gain", min: -24, max: 0, step: 0.5, unit: "dB" },
        { key: "lookahead", label: "Lookahead", min: 0, max: 50, step: 1, unit: "ms" },
        { key: "smooth", label: "Smooth", min: 0, max: 1, step: 0.01 },
        { key: "gateThresh", label: "Gate", min: -80, max: -20, step: 1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// 43. HARMONIC SUM — Analog summing saturation
export function HarmonicSumUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    drive: 0.4, even2nd: 0.5, odd3rd: 0.3, odd5th: 0.1,
    noiseFloor: -90, crosstalk: 0.2, outputGain: 0, ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ffaa55";
  return (
    <PluginWindow name="HarmonicSum" tag="SUM" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
        { key: "even2nd", label: "2nd", min: 0, max: 1, step: 0.01 },
        { key: "odd3rd", label: "3rd", min: 0, max: 1, step: 0.01 },
        { key: "odd5th", label: "5th", min: 0, max: 1, step: 0.01 },
        { key: "crosstalk", label: "Crosstalk", min: 0, max: 1, step: 0.01 },
        { key: "noiseFloor", label: "Noise", min: -120, max: -60, step: 1, unit: "dB" },
        { key: "outputGain", label: "Output", min: -12, max: 12, step: 0.1, unit: "dB" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN REGISTRY — paste ALL_FX_EXTENDED into RecordingStudio.js
// replacing the existing ALL_FX array in the console inserts section
// ═══════════════════════════════════════════════════════════════

export const ALL_FX_EXTENDED = [
  // ── EXISTING (keep these) ──
  { key: "eq",              name: "EQ",            type: "eq",         component: null },
  { key: "compressor",      name: "Compressor",    type: "comp",       component: null },
  { key: "gate",            name: "Gate",          type: "comp",       component: null },
  { key: "deesser",         name: "De-Esser",      type: "comp",       component: null },
  { key: "limiter",         name: "Limiter",       type: "limit",      component: null },
  { key: "reverb",          name: "Reverb",        type: "reverb",     component: null },
  { key: "delay",           name: "Delay",         type: "delay",      component: null },
  { key: "chorus",          name: "Chorus",        type: "reverb",     component: null },
  { key: "flanger",         name: "Flanger",       type: "reverb",     component: null },
  { key: "phaser",          name: "Phaser",        type: "filter",     component: null },
  { key: "tremolo",         name: "Tremolo",       type: "filter",     component: null },
  { key: "filter",          name: "Filter",        type: "filter",     component: null },
  { key: "distortion",      name: "Distortion",    type: "distortion", component: null },
  { key: "bitcrusher",      name: "Bit Crush",     type: "distortion", component: null },
  { key: "tapeSaturation",  name: "Tape Sat",      type: "distortion", component: null },
  { key: "exciter",         name: "Exciter",       type: "distortion", component: null },
  { key: "stereoWidener",   name: "Stereo W",      type: "reverb",     component: null },
  { key: "gainUtility",     name: "Gain",          type: "eq",         component: null },
  // ── SPX ANALOG SUITE ──
  { key: "tapeForge",       name: "TapeForge",     type: "distortion", component: "TapeForgeUI" },
  { key: "valveGlow",       name: "ValveGlow",     type: "distortion", component: "ValveGlowUI" },
  { key: "ironCore",        name: "IronCore",      type: "distortion", component: "IronCoreUI" },
  { key: "consoleSoul",     name: "ConsoleSoul",   type: "distortion", component: "ConsoleSoulUI" },
  // ── SPX DYNAMICS ──
  { key: "brickWall",       name: "BrickWall",     type: "limit",      component: "BrickWallUI" },
  { key: "warmPress",       name: "WarmPress",     type: "comp",       component: "WarmPressUI" },
  { key: "glueBus",         name: "GlueBus",       type: "comp",       component: "GlueBusUI" },
  { key: "fetStrike",       name: "FETStrike",     type: "comp",       component: "FETStrikeUI" },
  { key: "optoPress",       name: "OptoPress",     type: "comp",       component: "OptoPressUI" },
  { key: "parallelCrush",   name: "ParallelCrush", type: "comp",       component: "ParallelCrushUI" },
  { key: "multiPress",      name: "MultiPress",    type: "comp",       component: "MultiPressUI" },
  { key: "transGate",       name: "TransGate",     type: "comp",       component: "TransGateUI" },
  // ── SPX EQ ──
  { key: "ironBand",        name: "IronBand",      type: "eq",         component: "IronBandUI" },
  { key: "spectraCurve",    name: "SpectraCurve",  type: "eq",         component: "SpectraCurveUI" },
  // ── SPX SPATIAL ──
  { key: "hallForgeS",      name: "HallForge I",   type: "reverb",     component: "HallForgeSmallUI" },
  { key: "hallForgeL",      name: "HallForge II",  type: "reverb",     component: "HallForgeLargeUI" },
  { key: "gateVerb",        name: "GateVerb",      type: "reverb",     component: "GateVerbUI" },
  { key: "vintageAir",      name: "VintageAir",    type: "reverb",     component: "VintageAirUI" },
  { key: "stochasticHall",  name: "StochasticHall",type: "reverb",     component: "StochasticHallUI" },
  { key: "greatHall",       name: "GreatHall",     type: "reverb",     component: "GreatHallUI" },
  { key: "plateForge",      name: "PlateForge",    type: "reverb",     component: "PlateForgeUI" },
  { key: "springBox",       name: "SpringBox",     type: "reverb",     component: "SpringBoxUI" },
  { key: "echoField",       name: "EchoField",     type: "delay",      component: "EchoFieldUI" },
  { key: "stereoBloom",     name: "StereoBloom",   type: "reverb",     component: "StereoBloomUI" },
  { key: "pitchForge",      name: "PitchForge",    type: "filter",     component: "PitchForgeUI" },
  { key: "dualDelay",       name: "DualDelay",     type: "delay",      component: "DualDelayUI" },
  // ── SPX VOCAL SUITE ──
  { key: "pitchLock",       name: "PitchLock",     type: "filter",     component: "PitchLockUI" },
  { key: "voiceForge",      name: "VoiceForge",    type: "filter",     component: "VoiceForgeUI" },
  { key: "breathGate",      name: "BreathGate",    type: "comp",       component: "BreathGateUI" },
  { key: "sibilantCut",     name: "SibilantCut",   type: "comp",       component: "SibilantCutUI" },
  { key: "phantomDouble",   name: "PhantomDouble", type: "reverb",     component: "PhantomDoubleUI" },
  { key: "vocalSpace",      name: "VocalSpace",    type: "reverb",     component: "VocalSpaceUI" },
  // ── SPX MASTERING ──
  { key: "masterWall",      name: "MasterWall",    type: "limit",      component: "MasterWallUI" },
  { key: "stereoForge",     name: "StereoForge",   type: "eq",         component: "StereoForgeUI" },
  { key: "loudnessMeter",   name: "LoudnessMeter", type: "eq",         component: "LoudnessMeterUI" },
  { key: "harmonicExcite",  name: "HarmonicExcite",type: "distortion", component: "HarmonicExciteUI" },
  { key: "vinylPress",      name: "VinylPress",    type: "distortion", component: "VinylPressUI" },
  { key: "ditherForge",     name: "DitherForge",   type: "limit",      component: "DitherForgeUI" },
  { key: "dcBlock",         name: "DCBlock",       type: "filter",     component: "DCBlockUI" },
  { key: "spaceForge",      name: "SpaceForge",    type: "reverb",     component: "SpaceForgeUI" },
  { key: "vortexMod",       name: "VortexMod",     type: "filter",     component: "VortexModUI" },
  { key: "gainRider",       name: "GainRider",     type: "comp",       component: "GainRiderUI" },
  { key: "harmonicSum",     name: "HarmonicSum",   type: "distortion", component: "HarmonicSumUI" },
  { key: "pultecForge",    name: "PultecForge",    type: "eq",         component: "PultecForgeUI"    },
  { key: "dynamicEQ",      name: "DynamicEQ",      type: "eq",         component: "DynamicEQUI"      },
  { key: "graphicEQ",      name: "GraphicEQ",      type: "eq",         component: "GraphicEQUI"      },
  { key: "tiltEQ",         name: "TiltEQ",         type: "eq",         component: "TiltEQUI"         },
  { key: "baxandallEQ",    name: "BaxandallEQ",    type: "eq",         component: "BaxandallEQUI"    },
  { key: "vocoderSPX",     name: "VocoderSPX",     type: "filter",     component: "VocoderSPXUI"     },
  { key: "granularFreeze", name: "GranularFreeze", type: "reverb",     component: "GranularFreezeUI" },
  { key: "noiseReduction", name: "NoiseRedux",     type: "filter",     component: "NoiseReductionUI" },
  { key: "ringMod",        name: "RingMod",        type: "distortion", component: "RingModUI"        },
  { key: "formantFilter",  name: "FormantFilter",  type: "filter",     component: "FormantFilterUI"  },
  { key: "spectrumAnalyzer", name: "SpectrumAnalyzer", type: "eq",     component: "SpectrumAnalyzerUI" },
  { key:"tapeStop",name:"TapeStop",type:"creative",component:"TapeStopUI" },
  { key:"transientShaper",name:"TransientShaper",type:"comp",component:"TransientShaperUI" },
  { key:"multibandSat",name:"MultibandSat",type:"distortion",component:"MultibandSatUI" },
  { key:"stereoImager",name:"StereoImager",type:"reverb",component:"StereoImagerUI" },
  { key:"enhancer808",name:"808Enhancer",type:"distortion",component:"EnhancerSPX808UI" },
  { key:"loFiCrusher",name:"LoFiCrusher",type:"distortion",component:"LoFiCrusherUI" },
  { key:"infiniteReverb",name:"InfiniteReverb",type:"reverb",component:"InfiniteReverbUI" },
  { key:"reverseDelay",name:"ReverseDelay",type:"delay",component:"ReverseDelayUI" },
  { key:"declicker",name:"Declicker",type:"filter",component:"DeclickerUI" },
  { key:"dehummer",name:"Dehummer",type:"filter",component:"DehummmerUI" },
  { key:"midSideComp",name:"MidSideComp",type:"comp",component:"MidSideCompUI" },
  { key:"subOctaver",name:"SubOctaver",type:"filter",component:"SubOctaverUI" },
  { key:"chorusEnsemble",name:"ChorusEnsemble",type:"reverb",component:"ChorusEnsembleUI" },
  { key:"tempoDelay",name:"TempoDelay",type:"delay",component:"TempoDelayUI" },
  { key:"pitchRandomizer",name:"PitchRandomizer",type:"filter",component:"PitchRandomizerUI" },
  { key:"autoWah",name:"AutoWah",type:"filter",component:"AutoWahUI" },
  { key:"drumEnhancer",name:"DrumEnhancer",type:"comp",component:"DrumEnhancerUI" },
  { key:"vocalSaturator",name:"VocalSaturator",type:"distortion",component:"VocalSaturatorUI" },
  { key:"gainStager",name:"GainStager",type:"eq",component:"GainStagerUI" },

  // ── Missing plugins from COMPONENT_MAP ──
  { key:"ditherForge",    name:"DitherForge",     type:"mastering", component:"DitherForgeUI" },
  { key:"dcBlock",        name:"DC Block",         type:"mastering", component:"DCBlockUI" },
  { key:"spaceForge",     name:"SpaceForge",       type:"reverb",    component:"SpaceForgeUI" },
  { key:"vortexMod",      name:"VortexMod",        type:"filter",    component:"VortexModUI" },
  { key:"gainRider",      name:"GainRider",        type:"comp",      component:"GainRiderUI" },
  { key:"harmonicSum",    name:"HarmonicSum",      type:"distortion",component:"HarmonicSumUI" },
  { key:"transientShaper",name:"TransientShaper",  type:"comp",      component:"TransientShaperUI" },
  { key:"stereoImager",   name:"StereoImager",     type:"mastering", component:"StereoImagerUI" },
  { key:"midSideComp",    name:"Mid-Side Comp",    type:"comp",      component:"MidSideCompUI" },
  { key:"multibandLimiter",name:"MultibandLimiter",type:"mastering", component:"MultibandLimiterUI" },
  { key:"multibandSat",   name:"MultibandSat",     type:"distortion",component:"MultibandSatUI" },
  { key:"goniometer",     name:"Goniometer",       type:"mastering", component:"GoniometerUI" },
  { key:"phaseScope",     name:"PhaseScope",       type:"mastering", component:"PhaseScopeUI" },
  { key:"loudnessMeter2", name:"LoudnessMeter II", type:"mastering", component:"LoudnessMeter2UI" },
  { key:"tapeStop",       name:"TapeStop",         type:"creative",  component:"TapeStopUI" },
  { key:"reverseDelay",   name:"ReverseDelay",     type:"delay",     component:"ReverseDelayUI" },
  { key:"tempoDelay",     name:"TempoDelay",       type:"delay",     component:"TempoDelayUI" },
  { key:"dualDelay",      name:"DualDelay",        type:"delay",     component:"DualDelayUI" },
  { key:"echoField",      name:"EchoField",        type:"reverb",    component:"EchoFieldUI" },
  { key:"infiniteReverb", name:"InfiniteReverb",   type:"reverb",    component:"InfiniteReverbUI" },
  { key:"stereoBloom",    name:"StereoBloom",      type:"reverb",    component:"StereoBloomUI" },
  { key:"pitchForge",     name:"PitchForge",       type:"filter",    component:"PitchForgeUI" },
  { key:"pitchLock",      name:"PitchLock",        type:"filter",    component:"PitchLockUI" },
  { key:"pitchRandomizer",name:"PitchRandomizer",  type:"filter",    component:"PitchRandomizerUI" },
  { key:"subOctaver",     name:"SubOctaver",       type:"filter",    component:"SubOctaverUI" },
  { key:"autoWah",        name:"AutoWah",          type:"filter",    component:"AutoWahUI" },
  { key:"loFiCrusher",    name:"Lo-Fi Crusher",    type:"distortion",component:"LoFiCrusherUI" },
  { key:"chorusEnsemble", name:"ChorusEnsemble",   type:"filter",    component:"ChorusEnsembleUI" },
  { key:"voiceForge",     name:"VoiceForge",       type:"filter",    component:"VoiceForgeUI" },
  { key:"breathGate",     name:"BreathGate",       type:"comp",      component:"BreathGateUI" },
  { key:"sibilantCut",    name:"SibilantCut",      type:"comp",      component:"SibilantCutUI" },
  { key:"drumEnhancer",   name:"DrumEnhancer",     type:"comp",      component:"DrumEnhancerUI" },
  { key:"declicker",      name:"Declicker",        type:"mastering", component:"DeclickerUI" },
  { key:"dehummer",       name:"Dehummer",         type:"mastering", component:"DehummerUI" },
  { key:"dialogueIsolator",name:"DialogueIsolator",type:"mastering", component:"DialogueIsolatorUI" },
  { key:"cabinetSim",     name:"CabinetSim",       type:"distortion",component:"CabinetSimUI" },
  { key:"vinylPress",     name:"VinylPress",       type:"distortion",component:"VinylPressUI" },

  // ── New Ozone-level mastering plugins ──
  { key:"matchEQ",        name:"Match EQ",         type:"mastering", component:"MatchEQUI" },
  { key:"lowEndFocus",    name:"Low End Focus",     type:"mastering", component:"LowEndFocusUI" },
  { key:"codecPreview",   name:"Codec Preview",     type:"mastering", component:"CodecPreviewUI" },
  { key:"midSideEQ",      name:"Mid-Side EQ",       type:"mastering", component:"MidSideEQUI" },
  { key:"dynamicEQ",      name:"Dynamic EQ",        type:"mastering", component:"DynamicEQUI" },
  { key:"spectralRecovery",name:"Spectral Recovery",type:"mastering", component:"SpectralRecoveryUI" },
  { key:"loudnessTarget", name:"Loudness Target",   type:"mastering", component:"LoudnessTargetUI" },
  { key:"msImager",       name:"M/S Imager",        type:"mastering", component:"MSImagerUI" },
  { key:"multibandLimiter",name:"MultibandLimiter",type:"limit",component:"MultibandLimiterUI" },
  { key:"goniometer",name:"Goniometer",type:"eq",component:"GoniometerUI" },
  { key:"phaseScope",name:"PhaseScope",type:"eq",component:"PhaseScopeUI" },
  { key:"dialogueIsolator",name:"DialogueIsolator",type:"filter",component:"DialogueIsolatorUI" },
  { key:"cabinetSim",name:"CabinetSim",type:"distortion",component:"CabinetSimUI" },
  { key:"freqShifter",name:"FreqShifter",type:"filter",component:"FreqShifterUI" },
];

// ═══════════════════════════════════════════════════════════════
// PLUGIN HOST — renders the correct floating window by key
// Import this in RecordingStudio.js and use in the console
// ═══════════════════════════════════════════════════════════════

const COMPONENT_MAP = {
  TapeForgeUI, ValveGlowUI, IronCoreUI, ConsoleSoulUI,
  BrickWallUI, WarmPressUI, GlueBusUI, FETStrikeUI, OptoPressUI,
  ParallelCrushUI, MultiPressUI, TransGateUI,
  IronBandUI, SpectraCurveUI,
  HallForgeSmallUI, HallForgeLargeUI, GateVerbUI, VintageAirUI,
  StochasticHallUI, GreatHallUI, PlateForgeUI, SpringBoxUI,
  EchoFieldUI, StereoBloomUI, PitchForgeUI, DualDelayUI,
  PitchLockUI, VoiceForgeUI, BreathGateUI, SibilantCutUI,
  PhantomDoubleUI, VocalSpaceUI,
  MasterWallUI, StereoForgeUI, LoudnessMeterUI, HarmonicExciteUI,
  VinylPressUI, DitherForgeUI, DCBlockUI, SpaceForgeUI, VortexModUI,
  GainRiderUI, HarmonicSumUI,
};

export function SPXPluginHost({ pluginKey, params, onChange, onClose }) {
  const fxDef = ALL_FX_EXTENDED.find((f) => f.key === pluginKey);
  if (!fxDef?.component) return null;
  const Comp = COMPONENT_MAP[fxDef.component];
  if (!Comp) return null;
  return <Comp params={params} onChange={onChange} onClose={onClose} />;
}

export default SPXPluginHost;
