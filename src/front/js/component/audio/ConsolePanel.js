// ============================================================
// ConsolePanel.js — Phase F4-A.7B
// Live-tweak panel for the 21 console-character boards in
// RecordingStudio. Renders 11 knobs across 6 rows (HPF, Sat-In,
// LowShelf, HighShelf, Sat-Out, Output) with family-themed
// HardwareUI skin + accent colors. Save/Load presets to
// localStorage key "spx-console-presets-v1".
//
// Props
//   consoleId         (string) board id, e.g. "ssl4ke"
//   consoleName       (string) display name from CONSOLE_BOARDS[].name
//   consoleColor      (string) accent color from CONSOLE_BOARDS[].color
//   family            "ssl" | "neve" | "api" | "trident" | "vintage"
//   params            current 11-param object (live state slot)
//   onParamChange     fn(name, value) — called on every knob tweak
//   onAB              fn() — toggle A/B compare snapshot
//   onReset           fn() — restore factory baseline
//   onSavePreset      fn(name) — persist current params to localStorage
//   onLoadPreset      fn(name) — apply named preset to current params
//   onClose           fn() — hide panel (does NOT change dropdown)
//   target            "track" | "master"
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from "react";
import HardwarePanel from "./HardwareUI/HardwarePanel.js";
import AnalogKnob from "./HardwareUI/AnalogKnob.js";
import VUMeter from "./HardwareUI/VUMeter.js";
import LEDLadder from "./HardwareUI/LEDLadder.js";
import ButtonBank from "./HardwareUI/ButtonBank.js";

const PRESETS_KEY = "spx-console-presets-v1";

// ── Param ranges for the 11 knobs ──
const PARAM_SPECS = {
  hpfFreq:     { min: 5,    max: 500,   label: "FREQ", unit: "Hz", log: true },
  hpfQ:        { min: 0.1,  max: 2,     label: "Q",    unit: "" },
  satInDrive:  { min: 0,    max: 3,     label: "DRIVE",unit: "" },
  lowFreq:     { min: 40,   max: 600,   label: "FREQ", unit: "Hz", log: true },
  lowGain:     { min: -9,   max: 9,     label: "GAIN", unit: "dB" },
  highFreq:    { min: 3000, max: 18000, label: "FREQ", unit: "Hz", log: true },
  highGain:    { min: -9,   max: 9,     label: "GAIN", unit: "dB" },
  satOutDrive: { min: 0,    max: 3,     label: "DRIVE",unit: "" },
  outputGain:  { min: 0.5,  max: 1.2,   label: "TRIM", unit: "" },
};

// Per-family aesthetic mapping. Values feed HardwarePanel.skin and
// AnalogKnob.style; accentColor is used for active borders & badge highlights.
const FAMILY_THEMES = {
  ssl: {
    skin: "black-rack",
    knobStyle: "modern",
    knobBody: "#1f1f1f",
    rowAccent: { hpf: "#5cc8ff", satIn: "#ffd24a", low: "#4cc26b", high: "#ff5544", satOut: "#ffd24a", out: "#cccccc" },
    meter: "led",
    needleColor: "#ff5544",
    fontColor: "#e8e8e8",
    showScrews: true,
  },
  neve: {
    skin: "vintage-cream",
    knobStyle: "vintage",
    knobBody: "#3a1f10",
    rowAccent: { hpf: "#8a4a20", satIn: "#a02020", low: "#a02020", high: "#a02020", satOut: "#a02020", out: "#3a1f10" },
    meter: "vu",
    needleColor: "#222",
    fontColor: "#3a2a18",
    showScrews: true,
  },
  api: {
    skin: "blue-bezel",
    knobStyle: "modern",
    knobBody: "#888",
    rowAccent: { hpf: "#cfe0ff", satIn: "#cfe0ff", low: "#cfe0ff", high: "#cfe0ff", satOut: "#cfe0ff", out: "#cfe0ff" },
    meter: "led",
    needleColor: "#cfe0ff",
    fontColor: "#cfe0ff",
    showScrews: true,
  },
  trident: {
    skin: "vintage-cream",
    knobStyle: "vintage",
    knobBody: "#1f3a20",
    rowAccent: { hpf: "#5a8c4e", satIn: "#5a8c4e", low: "#5a8c4e", high: "#5a8c4e", satOut: "#5a8c4e", out: "#3a2a18" },
    meter: "vu",
    needleColor: "#222",
    fontColor: "#2a3a18",
    showScrews: true,
  },
  vintage: {
    skin: "wood",
    knobStyle: "chickenhead",
    knobBody: "#3a2a18",
    rowAccent: { hpf: "#f0d8a8", satIn: "#e8a020", low: "#e8a020", high: "#e8a020", satOut: "#e8a020", out: "#f0d8a8" },
    meter: "vu",
    needleColor: "#222",
    fontColor: "#f0d8a8",
    showScrews: true,
  },
};

// ── localStorage preset helpers ──
function loadAllPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_e) {
    return {};
  }
}
function saveAllPresets(all) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(all));
  } catch (_e) { /* noop */ }
}

function PresetMenu({ consoleId, currentParams, onLoadPreset, onSavePreset }) {
  const [name, setName] = useState("");
  const [tick, setTick] = useState(0); // re-read storage after save/delete
  const all = useMemo(() => loadAllPresets(), [tick]);
  const userPresets = all[consoleId] || {};
  const presetNames = Object.keys(userPresets);

  const onSave = () => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    const cur = loadAllPresets();
    cur[consoleId] = { ...(cur[consoleId] || {}), [trimmed]: { ...currentParams } };
    saveAllPresets(cur);
    setName("");
    setTick(t => t + 1);
    if (typeof onSavePreset === "function") onSavePreset(trimmed);
  };
  const onDelete = (n) => {
    const cur = loadAllPresets();
    if (cur[consoleId]) { delete cur[consoleId][n]; saveAllPresets(cur); }
    setTick(t => t + 1);
  };
  const onLoad = (n) => {
    const p = userPresets[n];
    if (p && typeof onLoadPreset === "function") onLoadPreset(n, p);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 10, fontFamily: "monospace" }}>
      <input
        type="text"
        placeholder="preset name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: 100, padding: "2px 4px", fontSize: 10, background: "#0d1117", color: "#cdd9e5", border: "1px solid #444", borderRadius: 3, fontFamily: "monospace" }}
      />
      <button type="button" onClick={onSave} style={presetBtnStyle}>SAVE</button>
      {presetNames.length > 0 && (
        <select
          onChange={e => { if (e.target.value) onLoad(e.target.value); }}
          defaultValue=""
          style={{ fontSize: 10, padding: "2px 4px", background: "#0d1117", color: "#cdd9e5", border: "1px solid #444", borderRadius: 3, fontFamily: "monospace" }}
        >
          <option value="">— load —</option>
          {presetNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      )}
      {presetNames.length > 0 && (
        <select
          onChange={e => { if (e.target.value) { if (window.confirm(`Delete preset "${e.target.value}"?`)) onDelete(e.target.value); e.target.value = ""; } }}
          defaultValue=""
          style={{ fontSize: 10, padding: "2px 4px", background: "#0d1117", color: "#ff8a3d", border: "1px solid #555", borderRadius: 3, fontFamily: "monospace" }}
        >
          <option value="">— delete —</option>
          {presetNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      )}
    </div>
  );
}

const presetBtnStyle = {
  padding: "2px 8px",
  fontSize: 10,
  fontFamily: "monospace",
  fontWeight: 700,
  background: "#21262d",
  color: "#cdd9e5",
  border: "1px solid #444",
  borderRadius: 3,
  cursor: "pointer",
};

// ── Format helpers for knob value labels ──
const fmt = (name, value) => {
  if (!Number.isFinite(value)) return "—";
  const spec = PARAM_SPECS[name];
  if (!spec) return value.toFixed(2);
  if (name === "hpfFreq" || name === "lowFreq") return `${Math.round(value)} Hz`;
  if (name === "highFreq") return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)} Hz`;
  if (name === "lowGain" || name === "highGain") return `${value >= 0 ? "+" : ""}${value.toFixed(1)} dB`;
  if (name === "satInDrive" || name === "satOutDrive") return value.toFixed(2);
  if (name === "hpfQ") return value.toFixed(2);
  if (name === "outputGain") {
    const db = 20 * Math.log10(value);
    return `${db >= 0 ? "+" : ""}${db.toFixed(1)} dB`;
  }
  return value.toFixed(2);
};

// ── Knob widget — small wrapper that pulls range from PARAM_SPECS ──
function ParamKnob({ name, value, onChange, theme, accent, size = 48 }) {
  const spec = PARAM_SPECS[name];
  if (!spec) return null;
  return (
    <AnalogKnob
      value={value ?? spec.min}
      min={spec.min}
      max={spec.max}
      onChange={(v) => onChange(name, v)}
      style={theme.knobStyle}
      size={size}
      color={theme.knobBody}
      indicatorColor="#fff"
      accentColor={accent}
      label={spec.label}
      valueLabel={fmt(name, value)}
    />
  );
}

// ── Asym toggle (sat-in / sat-out) ──
function AsymToggle({ value, onChange, accent }) {
  return (
    <ButtonBank
      options={[
        { value: 0, label: "LIN" },
        { value: 1, label: "ASYM" },
      ]}
      value={value ? 1 : 0}
      onChange={(v) => onChange(v ? 1 : 0)}
      style={"hardware"}
      size={22}
      accentColor={accent}
    />
  );
}

// ── A row of label + 1–3 controls. Vertical accent bar on the left ──
function Row({ accent, label, children, fontColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderLeft: `3px solid ${accent}`, paddingLeft: 8, marginBottom: 2 }}>
      <div style={{ width: 64, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: fontColor, fontFamily: "monospace" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flex: 1, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

export default function ConsolePanel({
  consoleId,
  consoleName,
  consoleColor,
  family,
  params,
  onParamChange,
  onAB,
  onReset,
  onSavePreset,
  onLoadPreset,
  onClose,
  target = "track",
  postOutputAnalyser, // optional AnalyserNode for VU meter
}) {
  const theme = FAMILY_THEMES[family] || FAMILY_THEMES.vintage;
  const safeParams = params || {};

  // ── Output VU level (post-output) ──
  // If the parent passes an AnalyserNode, sample its time-domain data on rAF
  // and feed normalized RMS into the VUMeter.
  const [meterValue, setMeterValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!postOutputAnalyser) return;
    const an = postOutputAnalyser;
    let mounted = true;
    const buf = new Float32Array(an.fftSize || 2048);
    const tick = () => {
      if (!mounted) return;
      try {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -60;
        // VUMeter default scale: -20..+3 dB. Normalize to 0..1.
        const norm = Math.max(0, Math.min(1, (db + 20) / 23));
        setMeterValue(norm);
      } catch (_e) { /* noop */ }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { mounted = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [postOutputAnalyser]);

  // ── Header ──
  const familyTag = (family || "vintage").toUpperCase();
  const subtitle = target === "master" ? "MASTER BUS" : "TRACK";

  // ── A/B button — caller manages slot state. We just pass-through onAB().
  const onABClick = () => { if (typeof onAB === "function") onAB(); };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ width: 520, fontFamily: "monospace", color: theme.fontColor }}
    >
      <HardwarePanel
        skin={theme.skin}
        screws={theme.showScrews}
        accentColor={consoleColor}
        padding={12}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${consoleColor}88` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: consoleColor, display: "inline-block", boxShadow: `0 0 6px ${consoleColor}` }} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{consoleName || consoleId}</span>
            <span style={{ fontSize: 9, opacity: 0.7, letterSpacing: 1 }}>{familyTag}</span>
            <span style={{ fontSize: 9, opacity: 0.5, letterSpacing: 1 }}>· {subtitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              title="A/B compare — store current as B, swap"
              onClick={onABClick}
              style={{ ...miniBtnStyle, color: theme.fontColor, borderColor: consoleColor }}
            >A/B</button>
            <button
              type="button"
              title="Reset to factory"
              onClick={() => { if (typeof onReset === "function") onReset(); }}
              style={{ ...miniBtnStyle, color: theme.fontColor, borderColor: consoleColor }}
            >RESET</button>
            <button
              type="button"
              title="Close panel"
              onClick={() => { if (typeof onClose === "function") onClose(); }}
              style={{ ...miniBtnStyle, color: theme.fontColor, borderColor: consoleColor, padding: "1px 8px" }}
            >×</button>
          </div>
        </div>

        {/* Body — 6 rows */}
        <Row accent={theme.rowAccent.hpf} label="HPF" fontColor={theme.fontColor}>
          <ParamKnob name="hpfFreq" value={safeParams.hpfFreq} onChange={onParamChange} theme={theme} accent={theme.rowAccent.hpf} />
          <ParamKnob name="hpfQ" value={safeParams.hpfQ} onChange={onParamChange} theme={theme} accent={theme.rowAccent.hpf} />
        </Row>
        <Row accent={theme.rowAccent.satIn} label="SAT IN" fontColor={theme.fontColor}>
          <ParamKnob name="satInDrive" value={safeParams.satInDrive} onChange={onParamChange} theme={theme} accent={theme.rowAccent.satIn} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <AsymToggle value={safeParams.satInAsym} onChange={(v) => onParamChange("satInAsym", v)} accent={theme.rowAccent.satIn} />
            <span style={{ fontSize: 8, color: theme.fontColor, opacity: 0.6, letterSpacing: 1 }}>MODE</span>
          </div>
        </Row>
        <Row accent={theme.rowAccent.low} label="LOW SHELF" fontColor={theme.fontColor}>
          <ParamKnob name="lowFreq" value={safeParams.lowFreq} onChange={onParamChange} theme={theme} accent={theme.rowAccent.low} />
          <ParamKnob name="lowGain" value={safeParams.lowGain} onChange={onParamChange} theme={theme} accent={theme.rowAccent.low} />
        </Row>
        <Row accent={theme.rowAccent.high} label="HI SHELF" fontColor={theme.fontColor}>
          <ParamKnob name="highFreq" value={safeParams.highFreq} onChange={onParamChange} theme={theme} accent={theme.rowAccent.high} />
          <ParamKnob name="highGain" value={safeParams.highGain} onChange={onParamChange} theme={theme} accent={theme.rowAccent.high} />
        </Row>
        <Row accent={theme.rowAccent.satOut} label="SAT OUT" fontColor={theme.fontColor}>
          <ParamKnob name="satOutDrive" value={safeParams.satOutDrive} onChange={onParamChange} theme={theme} accent={theme.rowAccent.satOut} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <AsymToggle value={safeParams.satOutAsym} onChange={(v) => onParamChange("satOutAsym", v)} accent={theme.rowAccent.satOut} />
            <span style={{ fontSize: 8, color: theme.fontColor, opacity: 0.6, letterSpacing: 1 }}>MODE</span>
          </div>
        </Row>
        <Row accent={theme.rowAccent.out} label="OUTPUT" fontColor={theme.fontColor}>
          <ParamKnob name="outputGain" value={safeParams.outputGain} onChange={onParamChange} theme={theme} accent={theme.rowAccent.out} />
          {theme.meter === "vu" ? (
            <VUMeter value={meterValue} width={140} height={80} color={theme.needleColor} />
          ) : (
            <LEDLadder value={meterValue} orientation="horizontal" segments={16} color={consoleColor} width={160} height={20} />
          )}
        </Row>

        {/* Footer — preset row */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${consoleColor}55`, display: "flex", flexDirection: "column", gap: 4 }}>
          <PresetMenu
            consoleId={consoleId}
            currentParams={safeParams}
            onSavePreset={onSavePreset}
            onLoadPreset={(name, presetParams) => { if (typeof onLoadPreset === "function") onLoadPreset(name, presetParams); }}
          />
          <div style={{ fontSize: 8, opacity: 0.5, letterSpacing: 1 }}>
            FACTORY · {familyTag} · {consoleId}
          </div>
        </div>
      </HardwarePanel>
    </div>
  );
}

const miniBtnStyle = {
  fontSize: 9,
  fontWeight: 700,
  fontFamily: "monospace",
  letterSpacing: 1,
  padding: "1px 6px",
  background: "transparent",
  color: "#cdd9e5",
  border: "1px solid #444",
  borderRadius: 3,
  cursor: "pointer",
};
