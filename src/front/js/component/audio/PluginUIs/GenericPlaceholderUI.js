// GenericPlaceholderUI.js — fallback UI rendered when a plugin has no custom UI yet.
// Renders the plugin's PLUGIN_DEFAULTS as a vertical list of sliders. F4-A.7 replaces
// per-plugin stub references to this with real hardware-style UIs assembled from
// HardwareUI/ shared components.
import React, { useState, useEffect } from "react";

const PluginWindow = ({ name, tag, color, onClose, children }) => (
  <div style={{
    position: "fixed", top: 80, right: 24, width: 360, maxHeight: "80vh", overflowY: "auto",
    background: "#0f1318", border: `1px solid ${color || "#444"}`, borderRadius: 6,
    padding: 12, color: "#e0e0e0", fontFamily: "system-ui, sans-serif", zIndex: 1000,
    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${color || "#444"}33` }}>
      <div>
        <span style={{ color: color || "#888", fontWeight: 700, fontSize: 14 }}>{name}</span>
        {tag && <span style={{ marginLeft: 8, fontSize: 10, color: "#888", textTransform: "uppercase" }}>{tag}</span>}
      </div>
      <button onClick={onClose} style={{ background: "transparent", color: "#888", border: "none", fontSize: 18, cursor: "pointer" }}>×</button>
    </div>
    {children}
  </div>
);

const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.01, format }) => {
  const display = format ? format(value) : (typeof value === "number" ? value.toFixed(2) : String(value));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: "#aaa" }}>{label}</span>
        <span style={{ color: "#fff", fontFamily: "monospace" }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#00ffc8" }} />
    </div>
  );
};

// pluginKey + displayName props let multiple stubs share this component while
// surfacing a distinct title bar. params/onChange follow the SPXPluginHost contract.
export default function GenericPlaceholderUI({ pluginKey, displayName, params, onChange, onClose }) {
  const [s, setS] = useState({ ...(params || {}) });
  useEffect(() => { onChange && onChange(s); }, [s]);
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const entries = Object.entries(s).filter(([k]) => k !== "enabled");
  return (
    <PluginWindow name={displayName || pluginKey} tag="STUB" color="#00ffc8" onClose={onClose}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 10, fontStyle: "italic" }}>
        Custom UI ships in F4-A.7. DSP is active; tweak the params below.
      </div>
      {entries.length === 0 && (
        <div style={{ color: "#666", fontSize: 11 }}>No params declared.</div>
      )}
      {entries.map(([k, v]) => {
        if (typeof v === "boolean") {
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <input type="checkbox" checked={v} onChange={(e) => set(k, e.target.checked)} />
              <span style={{ color: "#aaa", fontSize: 11 }}>{k}</span>
            </div>
          );
        }
        if (typeof v === "string") {
          return (
            <div key={k} style={{ marginBottom: 6, fontSize: 11, color: "#aaa" }}>
              {k}: <span style={{ color: "#fff", fontFamily: "monospace" }}>{v}</span>
            </div>
          );
        }
        const num = Number.isFinite(v) ? v : 0;
        // crude range guess based on magnitude — user can replace with real ranges in the per-plugin UI
        const min = num < 0 ? num * 2 - 10 : 0;
        const max = num === 0 ? 1 : Math.max(num * 2, 1);
        return <Slider key={k} label={k} value={num} onChange={(nv) => set(k, nv)} min={min} max={max} />;
      })}
    </PluginWindow>
  );
}
