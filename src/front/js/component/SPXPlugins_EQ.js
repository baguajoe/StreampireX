// =============================================================================
// SPXPlugins_EQ.js — 5 Missing Professional EQ Plugins
// Add to SPXPlugins.js exports, add to ALL_FX_EXTENDED, add to picker
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Knob, Toggle, PluginWindow, KnobRow } from "./SPXPlugins";
// Part 17: live param-driven visualizations.
import { SpectrumAnalyzer } from "./audio/PluginVisualizer";

// ─── 1. PULTEC FORGE — Passive EQ: simultaneous boost+cut, musical curves ────
// Famous for the low-end "Pultec trick": boost and cut at same frequency
// creates a unique resonant shelf not achievable any other way
export function PultecForgeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    lowFreq: 60, lowBoost: 0, lowAtten: 0,
    highFreq: 10, highBoost: 0, highAtten: 0, highBW: 0.5,
    outputGain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#cc9933";
  const LOW_FREQS = [20, 30, 40, 50, 60, 100];
  const HIGH_FREQS = [3, 4, 5, 6, 8, 10, 12, 16];

  return (
    <PluginWindow name="PultecForge" tag="PASS-EQ" color={c} onClose={onClose}>
      <div style={{ color: c, fontSize: 9, textAlign: "center", marginBottom: 8, letterSpacing: 2 }}>
        PASSIVE EQ — SIMULTANEOUS BOOST + ATTENUATION
      </div>
      {/* LOW SECTION */}
      <div style={{ background: "#0d0d1a", borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: "#888", marginBottom: 6, textAlign: "center" }}>LOW FREQUENCY</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
          <Knob label="Boost" value={s.lowBoost} min={0} max={10} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, lowBoost: v }))} />
          <Knob label="Atten" value={s.lowAtten} min={0} max={10} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, lowAtten: v }))} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#666" }}>FREQ</div>
            {LOW_FREQS.map(f => (
              <button key={f} onClick={() => setS(p => ({ ...p, lowFreq: f }))}
                style={{
                  background: s.lowFreq === f ? c : "#1a1a2e",
                  color: s.lowFreq === f ? "#000" : "#666",
                  border: `1px solid ${c}33`, borderRadius: 3,
                  padding: "2px 8px", fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                }}>{f} Hz</button>
            ))}
          </div>
        </div>
      </div>
      {/* HIGH SECTION */}
      <div style={{ background: "#0d0d1a", borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: "#888", marginBottom: 6, textAlign: "center" }}>HIGH FREQUENCY</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
          <Knob label="Boost" value={s.highBoost} min={0} max={10} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, highBoost: v }))} />
          <Knob label="Atten" value={s.highAtten} min={0} max={10} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, highAtten: v }))} />
          <Knob label="BW" value={s.highBW} min={0} max={1} step={0.01}
            color={c} onChange={(v) => setS(p => ({ ...p, highBW: v }))} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#666" }}>kHz</div>
            {HIGH_FREQS.map(f => (
              <button key={f} onClick={() => setS(p => ({ ...p, highFreq: f }))}
                style={{
                  background: s.highFreq === f ? c : "#1a1a2e",
                  color: s.highFreq === f ? "#000" : "#666",
                  border: `1px solid ${c}33`, borderRadius: 3,
                  padding: "2px 8px", fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                }}>{f}k</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      {/* Part 17: cumulative frequency response of the lowshelf+highshelf chain. */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <SpectrumAnalyzer size="default" filters={[
          { type: "lowshelf",  frequency: s.lowFreq,         gain: s.lowBoost - s.lowAtten },
          { type: "highshelf", frequency: s.highFreq * 1000, gain: s.highBoost - s.highAtten, Q: 0.5 + s.highBW },
        ]} />
      </div>
    </PluginWindow>
  );
}

// ─── 2. DYNAMIC EQ — Threshold-triggered per-band gain (FabFilter Pro-Q killer)
export function DynamicEQUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    bands: [
      { freq: 80,   gain: 0, q: 1, threshold: -20, ratio: 4, attack: 10, release: 100, dynamic: true,  type: "highpass" },
      { freq: 250,  gain: 0, q: 1, threshold: -18, ratio: 3, attack: 10, release: 100, dynamic: false, type: "peak" },
      { freq: 1000, gain: 0, q: 1, threshold: -18, ratio: 3, attack: 10, release: 100, dynamic: false, type: "peak" },
      { freq: 4000, gain: 0, q: 1, threshold: -18, ratio: 3, attack: 5,  release: 80,  dynamic: true,  type: "peak" },
      { freq: 12000,gain: 0, q: 0.7,threshold:-18, ratio: 3, attack: 5,  release: 80,  dynamic: false, type: "highshelf" },
    ],
    selectedBand: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ccff";
  const sb = s.selectedBand;
  const band = s.bands[sb];

  const setBand = (key, val) => {
    const bands = s.bands.map((b, i) => i === sb ? { ...b, [key]: val } : b);
    setS(p => ({ ...p, bands }));
  };

  const BAND_COLORS = ["#ff6644", "#ffaa00", "#00ffc8", "#44aaff", "#cc88ff"];

  return (
    <PluginWindow name="DynamicEQ" tag="DYN-EQ" color={c} onClose={onClose}>
      {/* Band selector */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
        {s.bands.map((b, i) => (
          <button key={i} onClick={() => setS(p => ({ ...p, selectedBand: i }))}
            style={{
              background: s.selectedBand === i ? BAND_COLORS[i] : "#1a1a2e",
              color: s.selectedBand === i ? "#000" : BAND_COLORS[i],
              border: `2px solid ${BAND_COLORS[i]}`,
              borderRadius: 4, padding: "4px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>Band {i + 1}</button>
        ))}
      </div>

      {/* Band params */}
      <div style={{ background: "#0d0d1a", borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
          {["peak", "lowshelf", "highshelf", "highpass", "lowpass", "notch"].map(t => (
            <button key={t} onClick={() => setBand("type", t)}
              style={{
                background: band.type === t ? BAND_COLORS[sb] + "44" : "transparent",
                color: band.type === t ? BAND_COLORS[sb] : "#666",
                border: `1px solid ${band.type === t ? BAND_COLORS[sb] : "#333"}`,
                borderRadius: 3, padding: "2px 6px",
                fontSize: 8, cursor: "pointer", fontFamily: "inherit",
              }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Knob label="Freq" value={band.freq} min={20} max={20000} step={1} unit="Hz"
            color={BAND_COLORS[sb]} onChange={(v) => setBand("freq", v)} />
          <Knob label="Gain" value={band.gain} min={-18} max={18} step={0.1} unit="dB"
            color={BAND_COLORS[sb]} onChange={(v) => setBand("gain", v)} />
          <Knob label="Q" value={band.q} min={0.1} max={10} step={0.1}
            color={BAND_COLORS[sb]} onChange={(v) => setBand("q", v)} />
        </div>
      </div>

      {/* Dynamic section */}
      <div style={{ background: "#0d0d1a", borderRadius: 6, padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "#888" }}>DYNAMIC MODE</div>
          <Toggle label="Active" value={band.dynamic}
            onChange={(v) => setBand("dynamic", v)} color={BAND_COLORS[sb]} />
        </div>
        {band.dynamic && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Knob label="Threshold" value={band.threshold} min={-60} max={0} step={0.5} unit="dB"
              color={BAND_COLORS[sb]} onChange={(v) => setBand("threshold", v)} />
            <Knob label="Ratio" value={band.ratio} min={1} max={20} step={0.5} unit=":1"
              color={BAND_COLORS[sb]} onChange={(v) => setBand("ratio", v)} />
            <Knob label="Attack" value={band.attack} min={0.1} max={200} step={0.1} unit="ms"
              color={BAND_COLORS[sb]} onChange={(v) => setBand("attack", v)} />
            <Knob label="Release" value={band.release} min={10} max={1000} step={5} unit="ms"
              color={BAND_COLORS[sb]} onChange={(v) => setBand("release", v)} />
          </div>
        )}
      </div>
    </PluginWindow>
  );
}

// ─── 3. GRAPHIC EQ — 31-band ISO standard frequencies ────────────────────────
const ISO_BANDS = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
  200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
];

export function GraphicEQUI({ params, onChange, onClose }) {
  const defaultBands = ISO_BANDS.reduce((acc, f) => ({ ...acc, [f]: 0 }), {});
  const [s, setS] = useState({ bands: defaultBands, preAmp: 0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44ff88";

  const reset = () => setS(p => ({ ...p, bands: defaultBands }));
  const PRESETS = {
    "Flat": defaultBands,
    "Rock": { 20:4,25:3,31.5:2,40:1,50:0,63:-1,80:0,100:2,125:3,160:2,200:0,250:-1,315:-2,400:-2,500:-1,630:0,800:1,1000:2,1250:2,1600:3,2000:3,2500:2,3150:1,4000:1,5000:2,6300:3,8000:4,10000:3,12500:2,16000:2,20000:1 },
    "Hip-Hop": { 20:6,25:5,31.5:5,40:4,50:3,63:2,80:1,100:0,125:-1,160:-1,200:-2,250:-2,315:-1,400:0,500:0,630:0,800:0,1000:1,1250:1,1600:2,2000:2,2500:1,3150:0,4000:0,5000:1,6300:2,8000:3,10000:3,12500:2,16000:1,20000:0 },
    "Vocal": { 20:-6,25:-5,31.5:-4,40:-3,50:-2,63:-1,80:0,100:0,125:0,160:1,200:1,250:2,315:2,400:1,500:0,630:0,800:1,1000:2,1250:3,1600:4,2000:4,2500:3,3150:2,4000:3,5000:3,6300:2,8000:1,10000:2,12500:3,16000:2,20000:1 },
  };

  return (
    <PluginWindow name="GraphicEQ" tag="31-GEQ" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
        {Object.keys(PRESETS).map(name => (
          <button key={name} onClick={() => setS(p => ({ ...p, bands: PRESETS[name] }))}
            style={{
              background: "#1a1a2e", color: c, border: `1px solid ${c}44`,
              borderRadius: 4, padding: "3px 10px", fontSize: 9,
              cursor: "pointer", fontFamily: "inherit",
            }}>{name}</button>
        ))}
        <button onClick={reset} style={{
          background: "#1a1a2e", color: "#888", border: "1px solid #333",
          borderRadius: 4, padding: "3px 10px", fontSize: 9,
          cursor: "pointer", fontFamily: "inherit",
        }}>Reset</button>
      </div>
      {/* 31 vertical sliders */}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 140, padding: "0 4px" }}>
        {ISO_BANDS.map(freq => {
          const val = s.bands[freq] ?? 0;
          const pct = (val + 12) / 24;
          const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
          return (
            <div key={freq} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div
                style={{ height: 110, width: 14, position: "relative", cursor: "ns-resize" }}
                onPointerDown={(e) => {
                  const startY = e.clientY, startVal = val;
                  const onMove = (me) => {
                    const delta = (startY - me.clientY) / 110 * 24;
                    const newVal = Math.max(-12, Math.min(12, startVal + delta));
                    setS(p => ({ ...p, bands: { ...p.bands, [freq]: Math.round(newVal * 10) / 10 } }));
                  };
                  const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
              >
                {/* Track */}
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 2, height: "100%", background: "#222", borderRadius: 1 }} />
                {/* Zero line */}
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "#333" }} />
                {/* Thumb */}
                <div style={{
                  position: "absolute", left: "50%", transform: "translateX(-50%)",
                  width: 10, height: 10, borderRadius: "50%",
                  background: val > 0 ? c : val < 0 ? "#ff4444" : "#666",
                  top: `${(1 - pct) * 100}%`,
                  marginTop: -5,
                  boxShadow: `0 0 4px ${val !== 0 ? c : "transparent"}`,
                }} />
              </div>
              <div style={{ fontSize: 6, color: "#555", marginTop: 2, textAlign: "center" }}>{label}</div>
              <div style={{ fontSize: 7, color: val !== 0 ? c : "#444", textAlign: "center" }}>
                {val > 0 ? `+${val}` : val}
              </div>
            </div>
          );
        })}
      </div>
      {/* Part 17: cumulative response of all 31 ISO peaking filters. */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <SpectrumAnalyzer size="default" filters={
          ISO_BANDS.filter(f => (s.bands?.[f] || 0) !== 0).map(f => ({
            type: "peaking", frequency: f, Q: 4.3, gain: s.bands[f] || 0,
          }))
        } />
      </div>
    </PluginWindow>
  );
}

// ─── 4. TILT EQ — Single-knob tilt shelf + air presence control ──────────────
export function TiltEQUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    tilt: 0, tiltFreq: 1000, air: 0, airFreq: 12000,
    presence: 0, presenceFreq: 3000, outputGain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ffcc44";

  // Visual tilt display
  const tiltPct = (s.tilt + 12) / 24;

  return (
    <PluginWindow name="TiltEQ" tag="TILT" color={c} onClose={onClose}>
      <div style={{ color: c, fontSize: 9, textAlign: "center", marginBottom: 12, letterSpacing: 2 }}>
        TILT · AIR · PRESENCE
      </div>

      {/* Tilt visual */}
      <div style={{ position: "relative", height: 40, margin: "0 20px 16px", background: "#111", borderRadius: 4 }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "#333" }} />
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${s.tilt < 0 ? c : "#333"} 0%, #555 50%, ${s.tilt > 0 ? c : "#333"} 100%)`,
          transform: `rotate(${s.tilt * -1.5}deg)`,
          transformOrigin: "center",
          transition: "transform 0.1s",
        }} />
        <div style={{ position: "absolute", bottom: 4, left: 8, fontSize: 8, color: "#888" }}>WARM</div>
        <div style={{ position: "absolute", bottom: 4, right: 8, fontSize: 8, color: "#888" }}>BRIGHT</div>
      </div>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Tilt" value={s.tilt} min={-12} max={12} step={0.1} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, tilt: v }))} />
        <Knob label="Pivot" value={s.tiltFreq} min={200} max={8000} step={50} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, tiltFreq: v }))} />
        <Knob label="Air" value={s.air} min={-12} max={12} step={0.1} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, air: v }))} />
        <Knob label="Air Freq" value={s.airFreq} min={8000} max={20000} step={100} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, airFreq: v }))} />
        <Knob label="Presence" value={s.presence} min={-12} max={12} step={0.1} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, presence: v }))} />
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      {/* Part 17: tilt = mirrored shelves around pivot, plus presence/air. */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <SpectrumAnalyzer size="default" filters={[
          { type: "lowshelf",  frequency: s.tiltFreq,     gain: -s.tilt / 2 },
          { type: "highshelf", frequency: s.tiltFreq,     gain:  s.tilt / 2 },
          { type: "peaking",   frequency: s.presenceFreq, gain:  s.presence, Q: 1 },
          { type: "highshelf", frequency: s.airFreq,      gain:  s.air },
        ]} />
      </div>
    </PluginWindow>
  );
}

// ─── 5. BAXANDALL EQ — Vintage bass/treble tone stack, musical shelves ────────
export function BaxandallEQUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    bass: 0, bassFreq: 100, treble: 0, trebleFreq: 10000,
    mid: 0, midFreq: 1000, midQ: 0.7,
    outputGain: 0, monoBelow: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff8844";

  return (
    <PluginWindow name="BaxandallEQ" tag="TONE" color={c} onClose={onClose}>
      <div style={{ color: c, fontSize: 9, textAlign: "center", marginBottom: 12, letterSpacing: 2 }}>
        BAXANDALL TONE STACK — MUSICAL SHELVING
      </div>

      {/* Big tone knobs */}
      <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#888", marginBottom: 8 }}>BASS</div>
          <Knob label="Gain" value={s.bass} min={-15} max={15} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, bass: v }))} />
          <Knob label="Freq" value={s.bassFreq} min={40} max={400} step={5} unit="Hz"
            color={c} onChange={(v) => setS(p => ({ ...p, bassFreq: v }))} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#888", marginBottom: 8 }}>MID</div>
          <Knob label="Gain" value={s.mid} min={-12} max={12} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, mid: v }))} />
          <Knob label="Freq" value={s.midFreq} min={200} max={8000} step={50} unit="Hz"
            color={c} onChange={(v) => setS(p => ({ ...p, midFreq: v }))} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#888", marginBottom: 8 }}>TREBLE</div>
          <Knob label="Gain" value={s.treble} min={-15} max={15} step={0.5} unit="dB"
            color={c} onChange={(v) => setS(p => ({ ...p, treble: v }))} />
          <Knob label="Freq" value={s.trebleFreq} min={2000} max={20000} step={100} unit="Hz"
            color={c} onChange={(v) => setS(p => ({ ...p, trebleFreq: v }))} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      {/* Part 17: bass/mid/treble shelf+peaking response. */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
        <SpectrumAnalyzer size="default" filters={[
          { type: "lowshelf",  frequency: s.bassFreq,   gain: s.bass },
          { type: "peaking",   frequency: s.midFreq,    gain: s.mid, Q: s.midQ || 0.7 },
          { type: "highshelf", frequency: s.trebleFreq, gain: s.treble },
        ]} />
      </div>
    </PluginWindow>
  );
}

// ─── EQ REGISTRY ADDITIONS ───────────────────────────────────────────────────
// Add these to ALL_FX_EXTENDED in SPXPlugins.js:
export const EQ_FX_ADDITIONS = [
  { key: "pultecForge",  name: "PultecForge",  type: "eq", component: "PultecForgeUI"  },
  { key: "dynamicEQ",    name: "DynamicEQ",    type: "eq", component: "DynamicEQUI"    },
  { key: "graphicEQ",    name: "GraphicEQ",    type: "eq", component: "GraphicEQUI"    },
  { key: "tiltEQ",       name: "TiltEQ",       type: "eq", component: "TiltEQUI"       },
  { key: "baxandallEQ",  name: "BaxandallEQ",  type: "eq", component: "BaxandallEQUI"  },
];
