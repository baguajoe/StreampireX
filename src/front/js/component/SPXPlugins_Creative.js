// =============================================================================
// SPXPlugins_Creative.js — Vocoder, Granular, Noise Reduction, Ring Mod,
//                          Formant Filter, Spectrum Analyzer
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Knob, Toggle, PluginWindow } from "./SPXPlugins";

// ─── 1. VOCODER SPX — 32-band carrier+modulator vocoder (robot voice) ─────────
// Carrier: synth oscillator built-in or external input
// Modulator: mic/voice input analyzed into 32 band envelopes
// applied to carrier → classic robot/talk-box effect
export function VocoderSPXUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    bands: 32, carrierType: "sawtooth", carrierFreq: 110,
    attack: 5, release: 50, formantShift: 0,
    mix: 100, unvoiced: 0.3, breathiness: 0.2,
    outputGain: 0, freeze: false,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const canvasRef = useRef(null);

  // Draw band visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, W, H);
    const bw = W / s.bands;
    for (let i = 0; i < s.bands; i++) {
      const h = Math.random() * H * 0.8;
      const hue = (i / s.bands) * 120;
      ctx.fillStyle = `hsla(${160 + hue}, 100%, 60%, 0.8)`;
      ctx.fillRect(i * bw + 1, H - h, bw - 2, h);
    }
  }, [s.bands]);

  return (
    <PluginWindow name="VocoderSPX" tag="VCDR" color={c} onClose={onClose}>
      <canvas ref={canvasRef} width={320} height={60}
        style={{ width: "100%", borderRadius: 4, marginBottom: 8 }} />

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {[8, 16, 32, 64].map(n => (
          <button key={n} onClick={() => setS(p => ({ ...p, bands: n }))}
            style={{
              background: s.bands === n ? c : "#1a1a2e", color: s.bands === n ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{n} Bands</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["sawtooth", "square", "triangle", "sine"].map(t => (
          <button key={t} onClick={() => setS(p => ({ ...p, carrierType: t }))}
            style={{
              background: s.carrierType === t ? c + "33" : "transparent",
              color: s.carrierType === t ? c : "#666",
              border: `1px solid ${s.carrierType === t ? c : "#333"}`,
              borderRadius: 3, padding: "2px 8px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Carrier Hz" value={s.carrierFreq} min={40} max={500} step={1} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, carrierFreq: v }))} />
        <Knob label="Attack" value={s.attack} min={1} max={200} step={1} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, attack: v }))} />
        <Knob label="Release" value={s.release} min={10} max={1000} step={5} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, release: v }))} />
        <Knob label="Formant" value={s.formantShift} min={-12} max={12} step={0.5} unit="st"
          color={c} onChange={(v) => setS(p => ({ ...p, formantShift: v }))} />
        <Knob label="Unvoiced" value={s.unvoiced} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, unvoiced: v }))} />
        <Knob label="Breath" value={s.breathiness} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, breathiness: v }))} />
        <Knob label="Mix" value={s.mix} min={0} max={100} step={1} unit="%"
          color={c} onChange={(v) => setS(p => ({ ...p, mix: v }))} />
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Freeze" value={s.freeze} onChange={(v) => setS(p => ({ ...p, freeze: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── 2. GRANULAR FREEZE — Granular synthesis freeze/texture generator ──────────
export function GranularFreezeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    freeze: false, grainSize: 80, density: 0.7, pitch: 0,
    spread: 0.5, position: 0.5, randomize: 0.3,
    attack: 20, release: 50, mix: 80, outputGain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#aa44ff";

  return (
    <PluginWindow name="GranularFreeze" tag="GRAN" color={c} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <button
          onClick={() => setS(p => ({ ...p, freeze: !p.freeze }))}
          style={{
            background: s.freeze ? c : "#1a1a2e",
            color: s.freeze ? "#000" : c,
            border: `2px solid ${c}`,
            borderRadius: 8, padding: "10px 30px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 2,
            boxShadow: s.freeze ? `0 0 20px ${c}66` : "none",
            transition: "all 0.2s",
          }}
        >{s.freeze ? "❄ FROZEN" : "FREEZE"}</button>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Grain" value={s.grainSize} min={10} max={500} step={5} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, grainSize: v }))} />
        <Knob label="Density" value={s.density} min={0.1} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, density: v }))} />
        <Knob label="Position" value={s.position} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, position: v }))} />
        <Knob label="Pitch" value={s.pitch} min={-24} max={24} step={0.5} unit="st"
          color={c} onChange={(v) => setS(p => ({ ...p, pitch: v }))} />
        <Knob label="Spread" value={s.spread} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, spread: v }))} />
        <Knob label="Random" value={s.randomize} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, randomize: v }))} />
        <Knob label="Attack" value={s.attack} min={1} max={500} step={1} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, attack: v }))} />
        <Knob label="Mix" value={s.mix} min={0} max={100} step={1} unit="%"
          color={c} onChange={(v) => setS(p => ({ ...p, mix: v }))} />
      </div>
    </PluginWindow>
  );
}

// ─── 3. NOISE REDUCTION — Spectral subtraction noise reduction ────────────────
export function NoiseReductionUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    reduction: 0.6, threshold: -40, attack: 10, release: 200,
    smoothing: 0.8, learn: false, learnDone: false,
    preserveTransients: true, outputGain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#44ddff";

  return (
    <PluginWindow name="NoiseRedux" tag="NR" color={c} onClose={onClose}>
      <div style={{ background: "#0d0d1a", borderRadius: 6, padding: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: "#888", marginBottom: 8, textAlign: "center" }}>
          NOISE PROFILE LEARNING
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={() => setS(p => ({ ...p, learn: !p.learn, learnDone: false }))}
            style={{
              background: s.learn ? "#ff4444" : "#1a1a2e",
              color: s.learn ? "#fff" : "#888",
              border: `1px solid ${s.learn ? "#ff4444" : "#333"}`,
              borderRadius: 4, padding: "6px 16px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit",
              animation: s.learn ? "pulse 1s infinite" : "none",
            }}
          >{s.learn ? "⏺ LEARNING..." : "Learn Noise"}</button>
          {s.learnDone && (
            <div style={{ fontSize: 9, color: c, display: "flex", alignItems: "center" }}>
              ✓ Profile captured
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Reduction" value={s.reduction} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, reduction: v }))} />
        <Knob label="Threshold" value={s.threshold} min={-80} max={0} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, threshold: v }))} />
        <Knob label="Smoothing" value={s.smoothing} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, smoothing: v }))} />
        <Knob label="Attack" value={s.attack} min={1} max={200} step={1} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, attack: v }))} />
        <Knob label="Release" value={s.release} min={10} max={2000} step={10} unit="ms"
          color={c} onChange={(v) => setS(p => ({ ...p, release: v }))} />
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Keep Transients" value={s.preserveTransients}
          onChange={(v) => setS(p => ({ ...p, preserveTransients: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── 4. RING MOD — Ring modulator + frequency shifter ─────────────────────────
export function RingModUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    mode: "ringmod", carrierFreq: 440, carrierType: "sine",
    mix: 50, lfoRate: 0, lfoDepth: 0,
    sidebandBalance: 0, outputGain: 0,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff4488";

  return (
    <PluginWindow name="RingMod" tag="RING" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["ringmod", "freqshift", "am"].map(m => (
          <button key={m} onClick={() => setS(p => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}>{m === "ringmod" ? "Ring Mod" : m === "freqshift" ? "Freq Shift" : "AM"}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        {["sine", "square", "sawtooth", "triangle"].map(t => (
          <button key={t} onClick={() => setS(p => ({ ...p, carrierType: t }))}
            style={{
              background: s.carrierType === t ? c + "33" : "transparent",
              color: s.carrierType === t ? c : "#666",
              border: `1px solid ${s.carrierType === t ? c : "#333"}`,
              borderRadius: 3, padding: "2px 6px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Carrier Hz" value={s.carrierFreq} min={1} max={8000} step={0.5} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, carrierFreq: v }))} />
        <Knob label="LFO Rate" value={s.lfoRate} min={0} max={20} step={0.01} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, lfoRate: v }))} />
        <Knob label="LFO Depth" value={s.lfoDepth} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, lfoDepth: v }))} />
        <Knob label="Sideband" value={s.sidebandBalance} min={-1} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, sidebandBalance: v }))} />
        <Knob label="Mix" value={s.mix} min={0} max={100} step={1} unit="%"
          color={c} onChange={(v) => setS(p => ({ ...p, mix: v }))} />
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
    </PluginWindow>
  );
}

// ─── 5. FORMANT FILTER — Vowel filter with morphing and auto-wah ──────────────
const VOWELS = {
  A: { f1: 800,  f2: 1200, f3: 2500 },
  E: { f1: 400,  f2: 2000, f3: 2800 },
  I: { f1: 300,  f2: 2500, f3: 3000 },
  O: { f1: 500,  f2: 900,  f3: 2500 },
  U: { f1: 300,  f2: 700,  f3: 2200 },
};

export function FormantFilterUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    vowelA: "A", vowelB: "E", morph: 0.5,
    autoWah: false, wahRate: 1, wahDepth: 0.5,
    q: 8, outputGain: 0, mix: 100,
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const c = "#ff8844";

  return (
    <PluginWindow name="FormantFilter" tag="FMNT" color={c} onClose={onClose}>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 12 }}>
        {["A", "E", "I", "O", "U"].map(v => (
          <div key={v} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
            <button onClick={() => setS(p => ({ ...p, vowelA: v }))}
              style={{
                background: s.vowelA === v ? c : "#1a1a2e", color: s.vowelA === v ? "#000" : "#888",
                border: `2px solid ${c}44`, borderRadius: 4, padding: "4px 10px",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{v}</button>
            <button onClick={() => setS(p => ({ ...p, vowelB: v }))}
              style={{
                background: s.vowelB === v ? "#ff4488" : "#1a1a2e", color: s.vowelB === v ? "#fff" : "#666",
                border: "2px solid #ff448844", borderRadius: 4, padding: "4px 10px",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>{v}</button>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px", marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: "#888", marginBottom: 4, textAlign: "center" }}>
          MORPH: {s.vowelA} → {s.vowelB}
        </div>
        <input type="range" min={0} max={1} step={0.01} value={s.morph}
          onChange={e => setS(p => ({ ...p, morph: parseFloat(e.target.value) }))}
          style={{ width: "100%", accentColor: c }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#666" }}>
          <span>{s.vowelA}</span><span>{s.vowelB}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Knob label="Q" value={s.q} min={1} max={20} step={0.5}
          color={c} onChange={(v) => setS(p => ({ ...p, q: v }))} />
        <Knob label="Wah Rate" value={s.wahRate} min={0.1} max={10} step={0.1} unit="Hz"
          color={c} onChange={(v) => setS(p => ({ ...p, wahRate: v }))} />
        <Knob label="Wah Depth" value={s.wahDepth} min={0} max={1} step={0.01}
          color={c} onChange={(v) => setS(p => ({ ...p, wahDepth: v }))} />
        <Knob label="Mix" value={s.mix} min={0} max={100} step={1} unit="%"
          color={c} onChange={(v) => setS(p => ({ ...p, mix: v }))} />
        <Knob label="Output" value={s.outputGain} min={-12} max={12} step={0.5} unit="dB"
          color={c} onChange={(v) => setS(p => ({ ...p, outputGain: v }))} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <Toggle label="Auto-Wah" value={s.autoWah}
          onChange={(v) => setS(p => ({ ...p, autoWah: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── 6. SPECTRUM ANALYZER — Real-time FFT with peak hold ──────────────────────
export function SpectrumAnalyzerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    mode: "bars", scale: "log", peakHold: true, decay: 0.95,
    resolution: 1024, range: [-90, 0],
    ...params,
  });
  useEffect(() => onChange(s), [s]);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const peaksRef = useRef(new Float32Array(256).fill(-100));
  const c = "#00ffc8";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    let frame = 0;

    const draw = () => {
      ctx.fillStyle = "#06060f";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 1;
      for (let db = -80; db <= 0; db += 20) {
        const y = H - ((db - (-90)) / 90) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = "#444";
        ctx.font = "9px monospace";
        ctx.fillText(`${db}`, 2, y - 2);
      }

      // Frequency labels
      [100, 1000, 10000].forEach(f => {
        const x = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * W;
        ctx.strokeStyle = "#2a2a3a";
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillStyle = "#555";
        ctx.fillText(f >= 1000 ? `${f/1000}k` : `${f}`, x + 2, H - 4);
      });

      const bins = 128;
      for (let i = 0; i < bins; i++) {
        // Simulate spectrum (in real use, connect AnalyserNode)
        const freq = 20 * Math.pow(20000/20, i/bins);
        const x = s.scale === "log"
          ? (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * W
          : (i / bins) * W;
        const bw = s.scale === "log" ? Math.max(1, W / bins * 0.8) : W / bins - 1;

        // Animated demo spectrum
        const noise = Math.random() * 10;
        const pink = -20 - i * 0.3 + noise;
        const level = Math.max(-90, pink);
        const y = H - ((level - (-90)) / 90) * H;

        if (peaksRef.current[i] < level) peaksRef.current[i] = level;
        else peaksRef.current[i] = peaksRef.current[i] * s.decay + level * (1 - s.decay);

        // Bar
        const grad = ctx.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, level > -6 ? "#ff4444" : level > -18 ? "#ffaa00" : c);
        grad.addColorStop(1, `${c}22`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, bw, H - y);

        // Peak hold
        if (s.peakHold) {
          const py = H - ((peaksRef.current[i] - (-90)) / 90) * H;
          ctx.fillStyle = c;
          ctx.fillRect(x, py, bw, 2);
        }
      }
      frame++;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [s]);

  return (
    <PluginWindow name="SpectrumAnalyzer" tag="FFT" color={c} onClose={onClose}>
      <canvas ref={canvasRef} width={400} height={180}
        style={{ width: "100%", borderRadius: 4, marginBottom: 8, cursor: "crosshair" }} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {["bars", "line", "filled"].map(m => (
          <button key={m} onClick={() => setS(p => ({ ...p, mode: m }))}
            style={{
              background: s.mode === m ? c : "#1a1a2e", color: s.mode === m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius: 4, padding: "3px 10px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{m}</button>
        ))}
        {["log", "linear"].map(m => (
          <button key={m} onClick={() => setS(p => ({ ...p, scale: m }))}
            style={{
              background: s.scale === m ? "#ff660044" : "transparent", color: s.scale === m ? "#ff6600" : "#666",
              border: `1px solid ${s.scale === m ? "#ff6600" : "#333"}`,
              borderRadius: 4, padding: "3px 10px",
              fontSize: 9, cursor: "pointer", fontFamily: "inherit",
            }}>{m}</button>
        ))}
        <Toggle label="Peak Hold" value={s.peakHold}
          onChange={(v) => setS(p => ({ ...p, peakHold: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── CREATIVE REGISTRY ADDITIONS ─────────────────────────────────────────────
export const CREATIVE_FX_ADDITIONS = [
  { key: "vocoderSPX",      name: "VocoderSPX",      type: "filter",     component: "VocoderSPXUI"      },
  { key: "granularFreeze",  name: "GranularFreeze",  type: "reverb",     component: "GranularFreezeUI"  },
  { key: "noiseReduction",  name: "NoiseRedux",      type: "filter",     component: "NoiseReductionUI"  },
  { key: "ringMod",         name: "RingMod",         type: "distortion", component: "RingModUI"         },
  { key: "formantFilter",   name: "FormantFilter",   type: "filter",     component: "FormantFilterUI"   },
  { key: "spectrumAnalyzer",name: "SpectrumAnalyzer",type: "eq",         component: "SpectrumAnalyzerUI"},
];
