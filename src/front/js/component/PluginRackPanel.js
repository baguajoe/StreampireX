// =============================================================================
// PluginRackPanel.js — Plugin Rack UI for RecordingStudio Plugins view
// =============================================================================
// Location: src/front/js/component/audio/components/plugins/PluginRackPanel.js
//
// Works with TrackGraph's insertRackInput → insertRackOutput architecture.
// Plugin state is managed inside this component; audio nodes are wired
// between trackGraph.insertRackInput and trackGraph.insertRackOutput.
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from "react";

// ── Category colors ──
const CAT_COLORS = {
  EQ: "#5ac8fa",
  Dynamics: "#ff9500",
  Space: "#af52de",
  Modulation: "#30d158",
  Saturation: "#ff3b30",
  Utility: "#8e8e93",
};
const getCatColor = (cat) => CAT_COLORS[cat] || "#5ac8fa";

// ── Built-in plugin definitions ──
const PLUGIN_DEFS = {
  eq3: {
    id: "eq3", name: "3-Band EQ", category: "EQ", icon: "📊",
    defaultParams: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0 },
    createNodes: (ctx, p) => {
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf"; lo.frequency.value = 320; lo.gain.value = p.lowGain;
      const mi = ctx.createBiquadFilter(); mi.type = "peaking"; mi.frequency.value = p.midFreq; mi.Q.value = 1.5; mi.gain.value = p.midGain;
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf"; hi.frequency.value = 3200; hi.gain.value = p.highGain;
      lo.connect(mi); mi.connect(hi);
      return { input: lo, output: hi, update: (np) => { lo.gain.value = np.lowGain; mi.gain.value = np.midGain; mi.frequency.value = np.midFreq; hi.gain.value = np.highGain; } };
    },
  },
  compressor: {
    id: "compressor", name: "Compressor", category: "Dynamics", icon: "🔨",
    defaultParams: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30 },
    createNodes: (ctx, p) => {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = p.threshold; c.ratio.value = p.ratio; c.attack.value = p.attack; c.release.value = p.release; c.knee.value = p.knee;
      return { input: c, output: c, update: (np) => { c.threshold.value = np.threshold; c.ratio.value = np.ratio; c.attack.value = np.attack; c.release.value = np.release; c.knee.value = np.knee; } };
    },
  },
  gate: {
    id: "gate", name: "Gate", category: "Dynamics", icon: "🚪",
    defaultParams: { threshold: -40, attack: 0.001, release: 0.05 },
    createNodes: (ctx, p) => {
      const g = ctx.createDynamicsCompressor();
      g.threshold.value = p.threshold; g.ratio.value = 20; g.knee.value = 0; g.attack.value = p.attack; g.release.value = p.release;
      return { input: g, output: g, update: (np) => { g.threshold.value = np.threshold; g.attack.value = np.attack; g.release.value = np.release; } };
    },
  },
  limiter: {
    id: "limiter", name: "Limiter", category: "Dynamics", icon: "🧱",
    defaultParams: { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05 },
    createNodes: (ctx, p) => {
      const l = ctx.createDynamicsCompressor();
      l.threshold.value = p.threshold; l.knee.value = p.knee; l.ratio.value = p.ratio; l.attack.value = p.attack; l.release.value = p.release;
      return { input: l, output: l, update: (np) => { l.threshold.value = np.threshold; l.knee.value = np.knee; l.ratio.value = np.ratio; l.attack.value = np.attack; l.release.value = np.release; } };
    },
  },
  reverb: {
    id: "reverb", name: "Reverb", category: "Space", icon: "🏛️",
    defaultParams: { mix: 0.3, decay: 2.0 },
    createNodes: (ctx, p) => {
      const dry = ctx.createGain(); dry.gain.value = 1 - p.mix;
      const wet = ctx.createGain(); wet.gain.value = p.mix;
      const conv = ctx.createConvolver();
      const buildIR = (decay) => { const len = ctx.sampleRate * decay; const buf = ctx.createBuffer(2, len, ctx.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); } return buf; };
      conv.buffer = buildIR(p.decay);
      const input = ctx.createGain(); const merger = ctx.createGain();
      input.connect(dry); dry.connect(merger); input.connect(conv); conv.connect(wet); wet.connect(merger);
      return { input, output: merger, update: (np) => { dry.gain.value = 1 - np.mix; wet.gain.value = np.mix; } };
    },
  },
  delay: {
    id: "delay", name: "Delay", category: "Space", icon: "⏱️",
    defaultParams: { time: 0.3, feedback: 0.3, mix: 0.2 },
    createNodes: (ctx, p) => {
      const input = ctx.createGain(); const dry = ctx.createGain(); dry.gain.value = 1;
      const wet = ctx.createGain(); wet.gain.value = p.mix;
      const d = ctx.createDelay(5); d.delayTime.value = p.time;
      const fb = ctx.createGain(); fb.gain.value = p.feedback;
      const merger = ctx.createGain();
      input.connect(dry); dry.connect(merger); input.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(merger);
      return { input, output: merger, update: (np) => { d.delayTime.value = np.time; fb.gain.value = np.feedback; wet.gain.value = np.mix; } };
    },
  },
  chorus: {
    id: "chorus", name: "Chorus", category: "Modulation", icon: "🌊",
    defaultParams: { rate: 1.5, depth: 0.002, mix: 0.3 },
    createNodes: (ctx, p) => {
      const input = ctx.createGain(); const dry = ctx.createGain(); dry.gain.value = 1 - p.mix;
      const wet = ctx.createGain(); wet.gain.value = p.mix;
      const dl = ctx.createDelay(0.05); dl.delayTime.value = p.depth;
      const lfo = ctx.createOscillator(); lfo.frequency.value = p.rate;
      const lfoG = ctx.createGain(); lfoG.gain.value = p.depth * 0.5;
      lfo.connect(lfoG); lfoG.connect(dl.delayTime); lfo.start();
      const merger = ctx.createGain();
      input.connect(dry); dry.connect(merger); input.connect(dl); dl.connect(wet); wet.connect(merger);
      return { input, output: merger, update: (np) => { dry.gain.value = 1 - np.mix; wet.gain.value = np.mix; lfo.frequency.value = np.rate; lfoG.gain.value = np.depth * 0.5; } };
    },
  },
  filter: {
    id: "filter", name: "Filter", category: "EQ", icon: "🎛️",
    defaultParams: { type: "lowpass", frequency: 8000, Q: 1 },
    createNodes: (ctx, p) => {
      const f = ctx.createBiquadFilter(); f.type = p.type; f.frequency.value = p.frequency; f.Q.value = p.Q;
      return { input: f, output: f, update: (np) => { f.type = np.type; f.frequency.value = np.frequency; f.Q.value = np.Q; } };
    },
  },
  distortion: {
    id: "distortion", name: "Distortion", category: "Saturation", icon: "🔥",
    defaultParams: { amount: 20 },
    createNodes: (ctx, p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const makeCurve = (a) => { const c = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; c[i] = ((3 + a) * x * 20 * (Math.PI / 180)) / (Math.PI + a * Math.abs(x)); } return c; };
      ws.curve = makeCurve(p.amount);
      return { input: ws, output: ws, update: (np) => { ws.curve = makeCurve(np.amount); } };
    },
  },
  tapeSaturation: {
    id: "tapeSaturation", name: "Tape Saturation", category: "Saturation", icon: "📼",
    defaultParams: { drive: 0.3, warmth: 0.5 },
    createNodes: (ctx, p) => {
      const ws = ctx.createWaveShaper(); ws.oversample = "4x";
      const makeCurve = (drv) => { const c = new Float32Array(44100); for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; c[i] = Math.tanh(x * (1 + drv * 5)); } return c; };
      ws.curve = makeCurve(p.drive);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 12000 - p.warmth * 6000;
      ws.connect(lp);
      return { input: ws, output: lp, update: (np) => { ws.curve = makeCurve(np.drive); lp.frequency.value = 12000 - np.warmth * 6000; } };
    },
  },
  gain: {
    id: "gain", name: "Gain Utility", category: "Utility", icon: "📶",
    defaultParams: { gain: 0 },
    createNodes: (ctx, p) => {
      const g = ctx.createGain(); g.gain.value = Math.pow(10, (p.gain || 0) / 20);
      return { input: g, output: g, update: (np) => { g.gain.value = Math.pow(10, (np.gain || 0) / 20); } };
    },
  },
};

// ── Param slider ranges per plugin ──
const PARAM_DEFS = {
  eq3: [
    { key: "lowGain", label: "Low", min: -12, max: 12, step: 0.5, unit: "dB" },
    { key: "midGain", label: "Mid", min: -12, max: 12, step: 0.5, unit: "dB" },
    { key: "midFreq", label: "Mid Freq", min: 200, max: 8000, step: 10, unit: "Hz" },
    { key: "highGain", label: "High", min: -12, max: 12, step: 0.5, unit: "dB" },
  ],
  compressor: [
    { key: "threshold", label: "Threshold", min: -60, max: 0, step: 0.5, unit: "dB" },
    { key: "ratio", label: "Ratio", min: 1, max: 20, step: 0.5, unit: ":1" },
    { key: "attack", label: "Attack", min: 0.001, max: 0.1, step: 0.001, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 1, step: 0.01, unit: "s" },
    { key: "knee", label: "Knee", min: 0, max: 40, step: 1, unit: "dB" },
  ],
  gate: [
    { key: "threshold", label: "Threshold", min: -80, max: 0, step: 1, unit: "dB" },
    { key: "attack", label: "Attack", min: 0.001, max: 0.05, step: 0.001, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 0.5, step: 0.01, unit: "s" },
  ],
  limiter: [
    { key: "threshold", label: "Threshold", min: -20, max: 0, step: 0.5, unit: "dB" },
    { key: "knee", label: "Knee", min: 0, max: 10, step: 0.5, unit: "dB" },
    { key: "ratio", label: "Ratio", min: 1, max: 20, step: 1, unit: ":1" },
    { key: "attack", label: "Attack", min: 0.001, max: 0.05, step: 0.001, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 0.3, step: 0.01, unit: "s" },
  ],
  reverb: [
    { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01 },
    { key: "decay", label: "Decay", min: 0.1, max: 8, step: 0.1, unit: "s" },
  ],
  delay: [
    { key: "time", label: "Time", min: 0.01, max: 2, step: 0.01, unit: "s" },
    { key: "feedback", label: "Feedback", min: 0, max: 0.9, step: 0.01 },
    { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01 },
  ],
  chorus: [
    { key: "rate", label: "Rate", min: 0.1, max: 10, step: 0.1, unit: "Hz" },
    { key: "depth", label: "Depth", min: 0.001, max: 0.01, step: 0.001 },
    { key: "mix", label: "Mix", min: 0, max: 1, step: 0.01 },
  ],
  filter: [
    { key: "frequency", label: "Frequency", min: 20, max: 20000, step: 10, unit: "Hz" },
    { key: "Q", label: "Q", min: 0.1, max: 20, step: 0.1 },
  ],
  distortion: [
    { key: "amount", label: "Amount", min: 0, max: 100, step: 1 },
  ],
  tapeSaturation: [
    { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
    { key: "warmth", label: "Warmth", min: 0, max: 1, step: 0.01 },
  ],
  gain: [
    { key: "gain", label: "Gain", min: -24, max: 24, step: 0.5, unit: "dB" },
  ],
};

// ── Param slider component ──
const ParamSlider = ({ label, value, min, max, step, unit, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "#8899aa", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color: "#ddeeff", fontFamily: "monospace" }}>
          {step < 0.01 ? value.toFixed(4) : step < 1 ? value.toFixed(2) : value.toFixed(1)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: "#0a1420", borderRadius: 3 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #5ac8fa, #007aff)", borderRadius: 3, transition: "width 0.05s" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: "absolute", top: -4, left: 0, width: "100%", height: 14, opacity: 0, cursor: "pointer" }} />
      </div>
    </div>
  );
};

// ── Single Plugin Card ──
const PluginCard = ({ plugin, index, total, onUpdate, onRemove, onMove, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const catColor = getCatColor(plugin.category);
  const paramDefs = PARAM_DEFS[plugin.pluginId] || [];

  return (
    <div style={{
      background: plugin.enabled ? "#0f1a28" : "#0a1018",
      border: `1px solid ${plugin.enabled ? catColor + "40" : "#1a2636"}`,
      borderRadius: 8, marginBottom: 6,
      opacity: plugin.enabled ? 1 : 0.5, transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: "0.55rem", color: "#3a5570", fontFamily: "monospace", minWidth: 16, textAlign: "center" }}>{index + 1}</span>
        <span style={{ fontSize: "1rem" }}>{plugin.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.7rem", color: "#ddeeff", fontWeight: 600 }}>{plugin.name}</div>
          <div style={{ fontSize: "0.5rem", color: catColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{plugin.category}</div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onMove(index, index - 1)} disabled={index === 0}
            style={{ background: "none", border: "none", color: index === 0 ? "#1a2636" : "#5a7088", cursor: index === 0 ? "default" : "pointer", fontSize: "0.7rem", padding: "2px 4px" }} title="Move up">▲</button>
          <button onClick={() => onMove(index, index + 1)} disabled={index >= total - 1}
            style={{ background: "none", border: "none", color: index >= total - 1 ? "#1a2636" : "#5a7088", cursor: index >= total - 1 ? "default" : "pointer", fontSize: "0.7rem", padding: "2px 4px" }} title="Move down">▼</button>
          <button onClick={() => onToggle(index)}
            style={{ background: plugin.enabled ? catColor + "20" : "transparent", border: `1px solid ${plugin.enabled ? catColor : "#1a2636"}`, borderRadius: 4, color: plugin.enabled ? catColor : "#3a5570", fontSize: "0.55rem", fontWeight: 700, padding: "2px 6px", cursor: "pointer", transition: "all 0.15s" }}
            title={plugin.enabled ? "Bypass" : "Enable"}>{plugin.enabled ? "ON" : "OFF"}</button>
          <button onClick={() => onRemove(index)}
            style={{ background: "none", border: "1px solid rgba(229,57,53,0.3)", borderRadius: 4, color: "#e53935", fontSize: "0.6rem", padding: "2px 6px", cursor: "pointer" }} title="Remove">✕</button>
        </div>
        <span style={{ fontSize: "0.5rem", color: "#3a5570", marginLeft: 2 }}>{expanded ? "▾" : "▸"}</span>
      </div>

      {expanded && paramDefs.length > 0 && (
        <div style={{ padding: "4px 14px 12px 40px", borderTop: "1px solid #1a2636" }}>
          {paramDefs.map((pd) => (
            <ParamSlider key={pd.key} label={pd.label} value={plugin.params[pd.key] ?? pd.min}
              min={pd.min} max={pd.max} step={pd.step} unit={pd.unit}
              onChange={(val) => onUpdate(index, { [pd.key]: val })} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Add Plugin Browser ──
const PluginBrowser = ({ onAdd, onClose }) => {
  const [filter, setFilter] = useState("");
  const available = Object.values(PLUGIN_DEFS).map(({ id, name, category, icon }) => ({ id, name, category, icon }));
  const filtered = filter
    ? available.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase()))
    : available;

  const grouped = {};
  filtered.forEach((p) => { if (!grouped[p.category]) grouped[p.category] = []; grouped[p.category].push(p); });

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(5,10,18,0.95)", zIndex: 10, display: "flex", flexDirection: "column", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1a2636" }}>
        <span style={{ fontSize: "0.75rem", color: "#ddeeff", fontWeight: 700 }}>Add Plugin</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#5a7088", cursor: "pointer", fontSize: "1rem" }}>✕</button>
      </div>
      <div style={{ padding: "8px 16px" }}>
        <input type="text" placeholder="Search plugins..." value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus
          style={{ width: "100%", background: "#0a1420", border: "1px solid #1a2636", borderRadius: 6, padding: "6px 10px", color: "#ddeeff", fontSize: "0.7rem", outline: "none" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {Object.entries(grouped).map(([cat, plugins]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: "0.55rem", color: getCatColor(cat), fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, padding: "4px 0" }}>{cat}</div>
            {plugins.map((p) => (
              <div key={p.id} onClick={() => { onAdd(p.id); onClose(); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", transition: "background 0.1s", border: "1px solid transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = getCatColor(cat) + "10"; e.currentTarget.style.borderColor = getCatColor(cat) + "30"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                <span style={{ fontSize: "1.1rem" }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#ddeeff", fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: "0.5rem", color: "#5a7088" }}>{p.category}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#3a5570", fontSize: "0.7rem", padding: 20 }}>No plugins match "{filter}"</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// rewireInsertChain — wires plugin nodes between insertRackInput → insertRackOutput
// =============================================================================
function rewireInsertChain(trackGraph, plugins) {
  if (!trackGraph?.context) return;

  // Disconnect existing chain
  try { trackGraph.insertRackInput.disconnect(); } catch (e) { /* ok */ }

  const enabledPlugins = plugins.filter((p) => p.enabled && p._chain);

  if (enabledPlugins.length === 0) {
    // Direct passthrough: insertRackInput → insertRackOutput
    trackGraph.insertRackInput.connect(trackGraph.insertRackOutput);
    return;
  }

  // Wire: insertRackInput → plugin1.input → plugin1.output → ... → insertRackOutput
  let prev = trackGraph.insertRackInput;
  for (const p of enabledPlugins) {
    prev.connect(p._chain.input);
    prev = p._chain.output;
  }
  prev.connect(trackGraph.insertRackOutput);
}

// =============================================================================
// PluginRackPanel — Main exported component
// =============================================================================
const PluginRackPanel = ({ trackGraph, trackName, trackColor, onClose }) => {
  const [plugins, setPlugins] = useState([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const nextIdRef = useRef(1);
  const prevTrackIdRef = useRef(null);

  // Reset plugins when track changes
  useEffect(() => {
    if (trackGraph?.id !== prevTrackIdRef.current) {
      prevTrackIdRef.current = trackGraph?.id || null;
      setPlugins([]);
      nextIdRef.current = 1;
      if (trackGraph) {
        try { trackGraph.reconnectInsertPassthrough(); } catch (e) { /* ok */ }
      }
    }
  }, [trackGraph]);

  // Re-wire audio graph whenever plugins change
  useEffect(() => {
    if (trackGraph) rewireInsertChain(trackGraph, plugins);
  }, [trackGraph, plugins]);

  const handleAdd = useCallback((pluginId) => {
    const def = PLUGIN_DEFS[pluginId];
    if (!def) return;
    const instanceId = nextIdRef.current++;
    let chain = null;
    if (trackGraph?.context) {
      try { chain = def.createNodes(trackGraph.context, def.defaultParams); } catch (e) { console.warn("[PluginRack] createNodes failed:", e); }
    }
    setPlugins((prev) => [...prev, {
      instanceId, pluginId, name: def.name, icon: def.icon, category: def.category,
      params: { ...def.defaultParams }, enabled: true, _chain: chain,
    }]);
  }, [trackGraph]);

  const handleRemove = useCallback((idx) => {
    setPlugins((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleMove = useCallback((fromIdx, toIdx) => {
    if (toIdx < 0) return;
    setPlugins((prev) => {
      const next = [...prev];
      if (toIdx >= next.length) return next;
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  const handleToggle = useCallback((idx) => {
    setPlugins((prev) => prev.map((p, i) => i === idx ? { ...p, enabled: !p.enabled } : p));
  }, []);

  const handleUpdateParams = useCallback((idx, newParams) => {
    setPlugins((prev) => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p.params, ...newParams };
      if (p._chain?.update) { try { p._chain.update(updated); } catch (e) { /* ok */ } }
      return { ...p, params: updated };
    }));
  }, []);

  // ── No track selected ──
  if (!trackGraph) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#5a7088", fontSize: "0.85rem" }}>
        Select a track to view its plugin rack
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#080e14", borderRadius: 8, border: "1px solid #1a2636", position: "relative", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid #1a2636", background: "#0a1420" }}>
        <div style={{ width: 4, height: 28, borderRadius: 2, background: trackColor || "#5ac8fa" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.8rem", color: "#ddeeff", fontWeight: 700 }}>Plugin Rack</div>
          <div style={{ fontSize: "0.55rem", color: "#5a7088" }}>
            {trackName || "Track"} — {plugins.length} plugin{plugins.length !== 1 ? "s" : ""} loaded
          </div>
        </div>
        <button onClick={() => setShowBrowser(true)}
          style={{ background: "linear-gradient(135deg, #007aff, #5ac8fa)", border: "none", borderRadius: 6, color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "6px 14px", cursor: "pointer", transition: "opacity 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
          + Add Plugin
        </button>
        {onClose && (
          <button onClick={onClose}
            style={{ background: "none", border: "1px solid #1a2636", borderRadius: 6, color: "#5a7088", fontSize: "0.65rem", padding: "6px 10px", cursor: "pointer" }}>
            Close
          </button>
        )}
      </div>

      {/* ── Signal Flow ── */}
      {plugins.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", fontSize: "0.5rem", color: "#3a5570", borderBottom: "1px solid #0f1820" }}>
          <span style={{ color: "#30d158" }}>● IN</span><span>→</span>
          {plugins.map((p, i) => (
            <React.Fragment key={p.instanceId}>
              <span style={{ color: p.enabled ? getCatColor(p.category) : "#1a2636" }}>{p.icon}</span>
              {i < plugins.length - 1 && <span>→</span>}
            </React.Fragment>
          ))}
          <span>→</span><span style={{ color: "#ff9500" }}>● OUT</span>
        </div>
      )}

      {/* ── Plugin Chain ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px" }}>
        {plugins.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
            <div style={{ fontSize: "2rem", opacity: 0.3 }}>🔌</div>
            <div style={{ color: "#3a5570", fontSize: "0.75rem" }}>No plugins loaded</div>
            <div style={{ color: "#2a3848", fontSize: "0.6rem" }}>Click "+ Add Plugin" to build your chain</div>
            <button onClick={() => setShowBrowser(true)}
              style={{ background: "rgba(90,200,250,0.1)", border: "1px solid rgba(90,200,250,0.3)", borderRadius: 6, color: "#5ac8fa", fontSize: "0.65rem", padding: "8px 20px", cursor: "pointer", marginTop: 8 }}>
              Browse Plugins
            </button>
          </div>
        ) : (
          plugins.map((p, i) => (
            <PluginCard key={p.instanceId} plugin={p} index={i} total={plugins.length}
              onUpdate={handleUpdateParams} onRemove={handleRemove} onMove={handleMove} onToggle={handleToggle} />
          ))
        )}
      </div>

      {/* ── Footer ── */}
      {plugins.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "8px 16px", borderTop: "1px solid #1a2636", background: "#0a1420" }}>
          <button onClick={() => setPlugins([])}
            style={{ background: "none", border: "1px solid rgba(229,57,53,0.3)", borderRadius: 4, color: "#e53935", fontSize: "0.55rem", padding: "4px 10px", cursor: "pointer" }}>
            Clear All
          </button>
          <button onClick={() => setPlugins((prev) => prev.map((p) => ({ ...p, enabled: false })))}
            style={{ background: "none", border: "1px solid rgba(90,200,250,0.3)", borderRadius: 4, color: "#5ac8fa", fontSize: "0.55rem", padding: "4px 10px", cursor: "pointer" }}>
            Bypass All
          </button>
        </div>
      )}

      {/* ── Plugin Browser overlay ── */}
      {showBrowser && <PluginBrowser onAdd={handleAdd} onClose={() => setShowBrowser(false)} />}
    </div>
  );
};

export default PluginRackPanel;