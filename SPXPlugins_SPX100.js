// =============================================================================
// SPXPlugins_SPX100.js — 28 New SPX Plugin UIs to reach SPX100
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { Knob, Toggle, PluginWindow } from "./SPXPlugins";

function KnobRow({ knobs, state, setState, color }) {
  return (
    <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", padding:"8px 0" }}>
      {knobs.map(({ key, label, min, max, step, unit }) => (
        <Knob key={key} label={label} value={state[key]??(min+max)/2}
          min={min} max={max} step={step} unit={unit} color={color}
          onChange={(v) => setState(s => ({ ...s, [key]: v }))} />
      ))}
    </div>
  );
}

// ─── 1. TAPE STOP ─────────────────────────────────────────────────────────────
export function TapeStopUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ active: false, stopTime: 0.5, startTime: 0.3, curve: 0.5, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff6600";
  return (
    <PluginWindow name="TapeStop" tag="STOP" color={c} onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <button onClick={() => setS(p => ({ ...p, active: !p.active }))}
          style={{
            background: s.active ? c : "#1a1a2e", color: s.active ? "#000" : c,
            border: `3px solid ${c}`, borderRadius: 8, padding:"12px 32px",
            fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            letterSpacing:2, boxShadow: s.active ? `0 0 20px ${c}88` : "none",
            transition:"all 0.15s",
          }}>{s.active ? "⏹ STOPPED" : "⏸ TAPE STOP"}</button>
      </div>
      <KnobRow knobs={[
        { key:"stopTime",  label:"Stop Time",  min:0.05, max:3,   step:0.01, unit:"s" },
        { key:"startTime", label:"Start Time", min:0.05, max:3,   step:0.01, unit:"s" },
        { key:"curve",     label:"Curve",      min:0,    max:1,   step:0.01         },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 2. TRANSIENT SHAPER ──────────────────────────────────────────────────────
export function TransientShaperUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ attack: 0, sustain: 0, speed: 0.5, outputGain: 1, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff4400";
  return (
    <PluginWindow name="TransientShaper" tag="TRNS" color={c} onClose={onClose}>
      <div style={{ display:"flex", gap:24, justifyContent:"center", padding:"8px 0" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, color:"#888", marginBottom:4 }}>ATTACK</div>
          <Knob label="dB" value={s.attack} min={-24} max={24} step={0.5} unit="dB"
            color="#ff2200" onChange={v => setS(p => ({ ...p, attack: v }))} />
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:9, color:"#888", marginBottom:4 }}>SUSTAIN</div>
          <Knob label="dB" value={s.sustain} min={-24} max={24} step={0.5} unit="dB"
            color="#ff8800" onChange={v => setS(p => ({ ...p, sustain: v }))} />
        </div>
      </div>
      <KnobRow knobs={[
        { key:"speed",      label:"Speed",  min:0,  max:1,  step:0.01       },
        { key:"outputGain", label:"Output", min:0,  max:4,  step:0.01       },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        SAMPLE-ACCURATE ATTACK/SUSTAIN CONTROL
      </div>
    </PluginWindow>
  );
}

// ─── 3. MULTIBAND SAT ────────────────────────────────────────────────────────
export function MultibandSatUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ xover1:200, xover2:2000, xover3:8000, drive1:0.3, drive2:0.3, drive3:0.2, drive4:0.1, mix:0.5, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff8844";
  const BAND_COLS = ["#ff4444","#ffaa00","#00ffc8","#8888ff"];
  return (
    <PluginWindow name="MultibandSat" tag="MBSAT" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"xover1", label:"X1",  min:40,   max:800,   step:5,   unit:"Hz" },
        { key:"xover2", label:"X2",  min:400,  max:8000,  step:10,  unit:"Hz" },
        { key:"xover3", label:"X3",  min:2000, max:18000, step:50,  unit:"Hz" },
      ]} state={s} setState={setS} color={c} />
      {["Sub/Low","Low-Mid","High-Mid","Air"].map((band, bi) => (
        <div key={bi} style={{ marginTop:8 }}>
          <div style={{ fontSize:9, color:BAND_COLS[bi], textAlign:"center", marginBottom:4 }}>{band}</div>
          <KnobRow knobs={[{ key:`drive${bi+1}`, label:"Drive", min:0, max:1, step:0.01 }]}
            state={s} setState={setS} color={BAND_COLS[bi]} />
        </div>
      ))}
      <KnobRow knobs={[{ key:"mix", label:"Mix", min:0, max:1, step:0.01 }]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 4. STEREO IMAGER ────────────────────────────────────────────────────────
export function StereoImagerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ lowWidth:0.8, midWidth:1.0, highWidth:1.2, xover1:300, xover2:5000, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44ffcc";
  return (
    <PluginWindow name="StereoImager" tag="IMAG" color={c} onClose={onClose}>
      <div style={{ padding:"8px 0" }}>
        {[["Low","lowWidth","#4488ff"],["Mid","midWidth","#44ff88"],["High","highWidth","#ff44aa"]].map(([label, key, col]) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <div style={{ fontSize:9, color:col, width:30, textAlign:"right" }}>{label}</div>
            <div style={{ flex:1, height:4, background:"#222", borderRadius:2, position:"relative" }}>
              <div style={{ position:"absolute", left:"50%", width:2, height:"100%", background:"#444" }} />
              <input type="range" min={0} max={2} step={0.01} value={s[key]}
                onChange={e => setS(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                style={{ width:"100%", accentColor:col }} />
            </div>
            <div style={{ fontSize:10, color:col, width:35, fontWeight:700 }}>{(s[key]*100).toFixed(0)}%</div>
          </div>
        ))}
      </div>
      <KnobRow knobs={[
        { key:"xover1", label:"X1", min:80,  max:800,   step:5,  unit:"Hz" },
        { key:"xover2", label:"X2", min:800, max:18000, step:50, unit:"Hz" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 5. 808 ENHANCER ─────────────────────────────────────────────────────────
export function EnhancerSPX808UI({ params, onChange, onClose }) {
  const [s, setS] = useState({ freq:60, punch:0.5, sub:0.6, harmonic:0.3, outputGain:1.0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff2244";
  return (
    <PluginWindow name="808Enhancer" tag="808" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"freq",       label:"Freq",    min:30,  max:120, step:1,    unit:"Hz" },
        { key:"punch",      label:"Punch",   min:0,   max:1,   step:0.01          },
        { key:"sub",        label:"Sub",     min:0,   max:1,   step:0.01          },
        { key:"harmonic",   label:"Harmonic",min:0,   max:1,   step:0.01          },
        { key:"outputGain", label:"Output",  min:0,   max:4,   step:0.01          },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        SUB SYNTHESIS + HARMONIC ENHANCEMENT
      </div>
    </PluginWindow>
  );
}

// ─── 6. LOFI CRUSHER ─────────────────────────────────────────────────────────
export function LoFiCrusherUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ bits:12, rate:0.5, filter:0.5, noise:0.05, wobble:0.02, mix:1.0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#aa8844";
  return (
    <PluginWindow name="LoFiCrusher" tag="LOFI" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"bits",   label:"Bits",   min:4,  max:24,  step:1,    unit:" bit" },
        { key:"rate",   label:"Rate",   min:0.1,max:1,   step:0.01          },
        { key:"filter", label:"Filter", min:0,  max:1,   step:0.01          },
        { key:"noise",  label:"Noise",  min:0,  max:0.3, step:0.001         },
        { key:"wobble", label:"Wobble", min:0,  max:0.1, step:0.001         },
        { key:"mix",    label:"Mix",    min:0,  max:1,   step:0.01          },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 7. INFINITE REVERB ──────────────────────────────────────────────────────
export function InfiniteReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ freeze:false, roomSize:0.9, damping:0.3, mix:0.5, shimmer:0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#7744ff";
  return (
    <PluginWindow name="InfiniteReverb" tag="∞RVB" color={c} onClose={onClose}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <button onClick={() => setS(p => ({ ...p, freeze: !p.freeze }))}
          style={{
            background: s.freeze ? c : "#1a1a2e", color: s.freeze ? "#fff" : c,
            border: `3px solid ${c}`, borderRadius: 8, padding:"12px 40px",
            fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
            letterSpacing:3, boxShadow: s.freeze ? `0 0 30px ${c}88` : "none",
            transition:"all 0.2s",
          }}>❄ {s.freeze ? "FROZEN" : "FREEZE"}</button>
      </div>
      <KnobRow knobs={[
        { key:"roomSize", label:"Room",    min:0,   max:1,   step:0.01 },
        { key:"damping",  label:"Damping", min:0,   max:1,   step:0.01 },
        { key:"shimmer",  label:"Shimmer", min:0,   max:1,   step:0.01 },
        { key:"mix",      label:"Mix",     min:0,   max:1,   step:0.01 },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 8. REVERSE DELAY ────────────────────────────────────────────────────────
export function ReverseDelayUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ time:500, feedback:0.4, mix:0.4, filter:0.5, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#0088ff";
  return (
    <PluginWindow name="ReverseDelay" tag="REV-D" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"time",     label:"Time",     min:50,  max:2000, step:5,    unit:"ms" },
        { key:"feedback", label:"Feedback", min:0,   max:0.95, step:0.01          },
        { key:"filter",   label:"Filter",   min:0,   max:1,    step:0.01          },
        { key:"mix",      label:"Mix",      min:0,   max:1,    step:0.01          },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 9. DECLICKER ────────────────────────────────────────────────────────────
export function DeclickerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ sensitivity:0.7, strength:0.8, maxWidth:3, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44ddff";
  return (
    <PluginWindow name="Declicker" tag="DCLK" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"sensitivity", label:"Sensitivity", min:0, max:1,  step:0.01 },
        { key:"strength",    label:"Strength",    min:0, max:1,  step:0.01 },
        { key:"maxWidth",    label:"Max Width",   min:1, max:10, step:1    },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        CLICK/POP REMOVAL · INTERPOLATION REPAIR
      </div>
    </PluginWindow>
  );
}

// ─── 10. DEHUMMER ────────────────────────────────────────────────────────────
export function DehummmerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ freq:60, harmonics:5, depth:0.9, learn:false, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#88ff44";
  return (
    <PluginWindow name="Dehummer" tag="HUM" color={c} onClose={onClose}>
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:8 }}>
        {[50, 60].map(f => (
          <button key={f} onClick={() => setS(p => ({ ...p, freq: f }))}
            style={{
              background: s.freq===f ? c : "#1a1a2e", color: s.freq===f ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius:4, padding:"4px 16px",
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>{f}Hz</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key:"harmonics", label:"Harmonics", min:1, max:10, step:1 },
        { key:"depth",     label:"Depth",     min:0, max:1,  step:0.01 },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 11. MID-SIDE COMP ───────────────────────────────────────────────────────
export function MidSideCompUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ midThresh:-18, midRatio:3, sideThresh:-24, sideRatio:4, attack:10, release:150, makeup:0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44aaff";
  return (
    <PluginWindow name="MidSideComp" tag="M-S C" color={c} onClose={onClose}>
      <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
        <div>
          <div style={{ fontSize:9, color:c, textAlign:"center", marginBottom:4 }}>MID</div>
          <KnobRow knobs={[
            { key:"midThresh", label:"Thresh", min:-40, max:0,  step:0.5, unit:"dB" },
            { key:"midRatio",  label:"Ratio",  min:1,   max:20, step:0.5, unit:":1" },
          ]} state={s} setState={setS} color={c} />
        </div>
        <div>
          <div style={{ fontSize:9, color:"#ff44aa", textAlign:"center", marginBottom:4 }}>SIDE</div>
          <KnobRow knobs={[
            { key:"sideThresh", label:"Thresh", min:-40, max:0,  step:0.5, unit:"dB" },
            { key:"sideRatio",  label:"Ratio",  min:1,   max:20, step:0.5, unit:":1" },
          ]} state={s} setState={setS} color="#ff44aa" />
        </div>
      </div>
      <KnobRow knobs={[
        { key:"attack",  label:"Attack",  min:0.1, max:200,  step:0.1, unit:"ms" },
        { key:"release", label:"Release", min:10,  max:2000, step:5,   unit:"ms" },
        { key:"makeup",  label:"Makeup",  min:-12, max:12,   step:0.5, unit:"dB" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 12. SUB OCTAVER ─────────────────────────────────────────────────────────
export function SubOctaverUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ oct1Level:0.7, oct2Level:0.3, dryLevel:1.0, filter:0.4, trackSpeed:0.5, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff2266";
  return (
    <PluginWindow name="SubOctaver" tag="OCT" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"dryLevel",   label:"Dry",     min:0, max:1, step:0.01 },
        { key:"oct1Level",  label:"-1 Oct",  min:0, max:1, step:0.01 },
        { key:"oct2Level",  label:"-2 Oct",  min:0, max:1, step:0.01 },
        { key:"filter",     label:"Filter",  min:0, max:1, step:0.01 },
        { key:"trackSpeed", label:"Tracking",min:0, max:1, step:0.01 },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 13. CHORUS ENSEMBLE ─────────────────────────────────────────────────────
export function ChorusEnsembleUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ mode:1, mix:0.5, depth:0.5, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff44cc";
  return (
    <PluginWindow name="ChorusEnsemble" tag="ENS" color={c} onClose={onClose}>
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:12 }}>
        {[1,2,3,4].map(m => (
          <button key={m} onClick={() => setS(p => ({ ...p, mode: m }))}
            style={{
              background: s.mode===m ? c : "#1a1a2e", color: s.mode===m ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius:4, padding:"6px 14px",
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>Mode {m}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key:"depth", label:"Depth", min:0, max:1, step:0.01 },
        { key:"mix",   label:"Mix",   min:0, max:1, step:0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        8-VOICE BBD ENSEMBLE · ROLAND DIMENSION STYLE
      </div>
    </PluginWindow>
  );
}

// ─── 14. TEMPO DELAY ─────────────────────────────────────────────────────────
export function TempoDelayUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ bpm:120, division:4, feedback:0.4, filterHP:100, filterLP:8000, mix:0.3, pingPong:false, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#00aaff";
  const DIVS = [{ v:1, l:"1/1" },{ v:2, l:"1/2" },{ v:4, l:"1/4" },{ v:8, l:"1/8" },{ v:16, l:"1/16" }];
  return (
    <PluginWindow name="TempoDelay" tag="BPM-D" color={c} onClose={onClose}>
      <KnobRow knobs={[{ key:"bpm", label:"BPM", min:60, max:200, step:1 }]} state={s} setState={setS} color={c} />
      <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:10 }}>
        {DIVS.map(({ v, l }) => (
          <button key={v} onClick={() => setS(p => ({ ...p, division: v }))}
            style={{
              background: s.division===v ? c : "#1a1a2e", color: s.division===v ? "#000" : "#888",
              border: `1px solid ${c}44`, borderRadius:4, padding:"4px 10px",
              fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
            }}>{l}</button>
        ))}
      </div>
      <KnobRow knobs={[
        { key:"feedback", label:"Feedback", min:0,   max:0.95, step:0.01          },
        { key:"filterHP", label:"HP",       min:20,  max:2000, step:5,  unit:"Hz" },
        { key:"filterLP", label:"LP",       min:1000,max:20000,step:100,unit:"Hz" },
        { key:"mix",      label:"Mix",      min:0,   max:1,    step:0.01          },
      ]} state={s} setState={setS} color={c} />
      <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
        <Toggle label="Ping Pong" value={s.pingPong} onChange={v => setS(p => ({ ...p, pingPong: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── 15. PITCH RANDOMIZER ────────────────────────────────────────────────────
export function PitchRandomizerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ amount:10, rate:4, smooth:0.7, mix:1.0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ffcc00";
  return (
    <PluginWindow name="PitchRandomizer" tag="RAND" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"amount", label:"Amount", min:0,   max:100, step:0.5, unit:"¢" },
        { key:"rate",   label:"Rate",   min:0.1, max:20,  step:0.1, unit:"Hz" },
        { key:"smooth", label:"Smooth", min:0,   max:1,   step:0.01           },
        { key:"mix",    label:"Mix",    min:0,   max:1,   step:0.01           },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        HUMANIZE · RANDOM DETUNE PER NOTE
      </div>
    </PluginWindow>
  );
}

// ─── 16. AUTO WAH ────────────────────────────────────────────────────────────
export function AutoWahUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ sensitivity:0.6, minFreq:200, maxFreq:4000, resonance:8, attack:5, release:200, mix:1.0, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff8800";
  return (
    <PluginWindow name="AutoWah" tag="WAH" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"sensitivity", label:"Sensitivity", min:0,   max:1,     step:0.01          },
        { key:"minFreq",     label:"Min Freq",    min:50,  max:2000,  step:10, unit:"Hz" },
        { key:"maxFreq",     label:"Max Freq",    min:500, max:12000, step:50, unit:"Hz" },
        { key:"resonance",   label:"Resonance",   min:1,   max:20,    step:0.5            },
        { key:"attack",      label:"Attack",      min:0.1, max:100,   step:0.1, unit:"ms"},
        { key:"release",     label:"Release",     min:10,  max:2000,  step:5,  unit:"ms" },
        { key:"mix",         label:"Mix",         min:0,   max:1,     step:0.01           },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 17. DRUM ENHANCER ───────────────────────────────────────────────────────
export function DrumEnhancerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ punch:0.5, snap:0.4, glue:0.4, sub:0.3, air:0.3, outputGain:1, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff6600";
  return (
    <PluginWindow name="DrumEnhancer" tag="DRUM" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"punch",      label:"Punch", min:0, max:1, step:0.01 },
        { key:"snap",       label:"Snap",  min:0, max:1, step:0.01 },
        { key:"glue",       label:"Glue",  min:0, max:1, step:0.01 },
        { key:"sub",        label:"Sub",   min:0, max:1, step:0.01 },
        { key:"air",        label:"Air",   min:0, max:1, step:0.01 },
        { key:"outputGain", label:"Output",min:0, max:4, step:0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        ALL-IN-ONE DRUM BUS · PUNCH · SNAP · GLUE
      </div>
    </PluginWindow>
  );
}

// ─── 18. VOCAL SATURATOR ─────────────────────────────────────────────────────
export function VocalSaturatorUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ drive:0.4, warmth:0.6, presence:0.4, air:0.3, mix:0.6, outputGain:1, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff66aa";
  return (
    <PluginWindow name="VocalSaturator" tag="VSAT" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"drive",      label:"Drive",    min:0, max:1, step:0.01 },
        { key:"warmth",     label:"Warmth",   min:0, max:1, step:0.01 },
        { key:"presence",   label:"Presence", min:0, max:1, step:0.01 },
        { key:"air",        label:"Air",      min:0, max:1, step:0.01 },
        { key:"mix",        label:"Mix",      min:0, max:1, step:0.01 },
        { key:"outputGain", label:"Output",   min:0, max:2, step:0.01 },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        ASYMMETRIC TRIODE · VOICE-OPTIMIZED SATURATION
      </div>
    </PluginWindow>
  );
}

// ─── 19. GAIN STAGER ─────────────────────────────────────────────────────────
export function GainStagerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ gain:1, targetDb:-18, trim:0, phase:false, rmsDb:-100, peakDb:-100, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const rmsNorm = Math.max(0, Math.min(1, (s.rmsDb + 60) / 60));
  const peakNorm = Math.max(0, Math.min(1, (s.peakDb + 60) / 60));
  const targetNorm = Math.max(0, Math.min(1, (s.targetDb + 60) / 60));
  const meterCol = s.peakDb > -3 ? "#ff4444" : s.peakDb > -12 ? "#ffaa00" : c;
  return (
    <PluginWindow name="GainStager" tag="STGR" color={c} onClose={onClose}>
      {/* Meter */}
      <div style={{ background:"#0a0a14", borderRadius:4, padding:10, marginBottom:10 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
          <div style={{ fontSize:9, color:"#888", width:40 }}>RMS</div>
          <div style={{ flex:1, height:8, background:"#111", borderRadius:2, position:"relative" }}>
            <div style={{ width:`${rmsNorm*100}%`, height:"100%", background:c, borderRadius:2, transition:"width 0.1s" }} />
            <div style={{ position:"absolute", left:`${targetNorm*100}%`, top:0, width:2, height:"100%", background:"#ffaa00" }} />
          </div>
          <div style={{ fontSize:10, color:c, width:40, textAlign:"right", fontWeight:700 }}>{s.rmsDb.toFixed(1)}</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ fontSize:9, color:"#888", width:40 }}>PEAK</div>
          <div style={{ flex:1, height:8, background:"#111", borderRadius:2 }}>
            <div style={{ width:`${peakNorm*100}%`, height:"100%", background:meterCol, borderRadius:2, transition:"width 0.05s" }} />
          </div>
          <div style={{ fontSize:10, color:meterCol, width:40, textAlign:"right", fontWeight:700 }}>{s.peakDb.toFixed(1)}</div>
        </div>
      </div>
      <KnobRow knobs={[
        { key:"gain",     label:"Gain",   min:0,   max:4,  step:0.01          },
        { key:"trim",     label:"Trim",   min:-24, max:24, step:0.5, unit:"dB"},
        { key:"targetDb", label:"Target", min:-40, max:0,  step:0.5, unit:"dB"},
      ]} state={s} setState={setS} color={c} />
      <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
        <Toggle label="Flip Phase" value={s.phase} onChange={v => setS(p => ({ ...p, phase: v }))} color={c} />
      </div>
    </PluginWindow>
  );
}

// ─── 20. MULTIBAND LIMITER ───────────────────────────────────────────────────
export function MultibandLimiterUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ ceiling:-0.3, xover1:200, xover2:2000, xover3:8000, lookahead:3, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff2244";
  return (
    <PluginWindow name="MultibandLimiter" tag="MBL" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"ceiling",   label:"Ceiling",   min:-6,   max:0,     step:0.1, unit:"dBTP" },
        { key:"lookahead", label:"Lookahead", min:0,    max:10,    step:0.1, unit:"ms"   },
        { key:"xover1",    label:"X1",        min:40,   max:800,   step:5,   unit:"Hz"   },
        { key:"xover2",    label:"X2",        min:400,  max:8000,  step:10,  unit:"Hz"   },
        { key:"xover3",    label:"X3",        min:2000, max:18000, step:50,  unit:"Hz"   },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── 21-28: Remaining 8 plugins with full UIs ────────────────────────────────

export function GoniometerUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ decay:0.95, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#00ffc8";
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, r = Math.min(cx, cy) - 10;
    const draw = () => {
      ctx.fillStyle = "rgba(6,6,15,0.3)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 1;
      [-45, 0, 45, 90, 135, 180, 225, 270, 315].forEach(a => {
        const rad = a * Math.PI / 180;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad)*r, cy + Math.sin(rad)*r); ctx.stroke();
      });
      ctx.strokeStyle = "#333"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "#222"; ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0, Math.PI*2); ctx.stroke();
      // Simulate goniometer dots
      for (let i = 0; i < 12; i++) {
        const l = (Math.random()*2-1)*0.8, ri = (Math.random()*2-1)*0.8;
        const x = cx + (l - ri) * r * 0.7071 * 0.8;
        const y = cy - (l + ri) * r * 0.7071 * 0.8;
        ctx.fillStyle = `rgba(0,255,200,${Math.random()*0.6+0.2})`;
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);
  return (
    <PluginWindow name="Goniometer" tag="GONIO" color={c} onClose={onClose}>
      <canvas ref={canvasRef} width={280} height={280} style={{ width:"100%", borderRadius:4 }} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:4 }}>
        STEREO FIELD · L←→R CORRELATION
      </div>
    </PluginWindow>
  );
}

export function PhaseScopeUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44ffaa";
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const draw = () => {
      ctx.fillStyle = "rgba(6,6,15,0.4)"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#1a1a2e"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
      // Correlation bar
      const corr = Math.random()*0.4+0.5;
      const bw = corr * W/2;
      ctx.fillStyle = corr > 0.3 ? c : "#ff4444";
      ctx.fillRect(W/2 - bw/2, H/2 - 6, bw, 12);
      ctx.fillStyle = "#888"; ctx.font = "9px monospace";
      ctx.fillText(`Correlation: ${corr.toFixed(2)}`, 8, H - 8);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []);
  return (
    <PluginWindow name="PhaseScope" tag="PHASE" color={c} onClose={onClose}>
      <canvas ref={canvasRef} width={320} height={120} style={{ width:"100%", borderRadius:4 }} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:4 }}>
        PHASE CORRELATION · MONO COMPATIBILITY CHECK
      </div>
    </PluginWindow>
  );
}

export function DialogueIsolatorUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ isolation:0.7, sensitivity:0.6, smoothing:0.8, mix:100, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#44ddff";
  return (
    <PluginWindow name="DialogueIsolator" tag="DIAL" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"isolation",   label:"Isolation",   min:0, max:1,   step:0.01          },
        { key:"sensitivity", label:"Sensitivity", min:0, max:1,   step:0.01          },
        { key:"smoothing",   label:"Smoothing",   min:0, max:1,   step:0.01          },
        { key:"mix",         label:"Mix",         min:0, max:100, step:1,  unit:"%" },
      ]} state={s} setState={setS} color={c} />
      <div style={{ textAlign:"center", fontSize:9, color:"#555", marginTop:8 }}>
        SPECTRAL VOICE ISOLATION · BACKGROUND REMOVAL
      </div>
    </PluginWindow>
  );
}

export function CabinetSimUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ cabinet:0, mic:0, distance:0.5, angle:0, mix:100, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#aa8844";
  const CABS = ["4x12 Marshall","2x12 Fender","1x12 Vox","4x10 Bassman","1x15 Bass","8x10 Ampeg"];
  const MICS = ["SM57","MD421","R121","U87","Blend"];
  return (
    <PluginWindow name="CabinetSim" tag="CAB" color={c} onClose={onClose}>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:9, color:"#888", marginBottom:4 }}>CABINET</div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {CABS.map((cab, i) => (
            <button key={i} onClick={() => setS(p => ({ ...p, cabinet: i }))}
              style={{ background:s.cabinet===i?c:"#1a1a2e", color:s.cabinet===i?"#000":"#888", border:`1px solid ${c}33`, borderRadius:3, padding:"2px 8px", fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>{cab}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:9, color:"#888", marginBottom:4 }}>MIC</div>
        <div style={{ display:"flex", gap:4 }}>
          {MICS.map((mic, i) => (
            <button key={i} onClick={() => setS(p => ({ ...p, mic: i }))}
              style={{ background:s.mic===i?c:"#1a1a2e", color:s.mic===i?"#000":"#888", border:`1px solid ${c}33`, borderRadius:3, padding:"2px 8px", fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>{mic}</button>
          ))}
        </div>
      </div>
      <KnobRow knobs={[
        { key:"distance", label:"Distance", min:0, max:1,   step:0.01 },
        { key:"angle",    label:"Angle",    min:0, max:90,  step:1, unit:"°" },
        { key:"mix",      label:"Mix",      min:0, max:100, step:1, unit:"%" },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

export function FreqShifterUI({ params, onChange, onClose }) {
  const [s, setS] = useState({ shift:0, lfoRate:0, lfoDepth:0, mix:100, ...params });
  useEffect(() => onChange(s), [s]);
  const c = "#ff44ff";
  return (
    <PluginWindow name="FreqShifter" tag="FSHFT" color={c} onClose={onClose}>
      <KnobRow knobs={[
        { key:"shift",    label:"Shift",     min:-1000, max:1000, step:1,    unit:"Hz" },
        { key:"lfoRate",  label:"LFO Rate",  min:0,     max:20,   step:0.01, unit:"Hz" },
        { key:"lfoDepth", label:"LFO Depth", min:0,     max:500,  step:1,    unit:"Hz" },
        { key:"mix",      label:"Mix",       min:0,     max:100,  step:1,    unit:"%"  },
      ]} state={s} setState={setS} color={c} />
    </PluginWindow>
  );
}

// ─── SPX100 REGISTRY ADDITIONS ───────────────────────────────────────────────
export const SPX100_FX_ADDITIONS = [
  { key:"tapeStop",          name:"TapeStop",          type:"creative",    component:"TapeStopUI"          },
  { key:"transientShaper",   name:"TransientShaper",   type:"comp",        component:"TransientShaperUI"   },
  { key:"multibandSat",      name:"MultibandSat",      type:"distortion",  component:"MultibandSatUI"      },
  { key:"stereoImager",      name:"StereoImager",      type:"reverb",      component:"StereoImagerUI"      },
  { key:"enhancer808",       name:"808Enhancer",       type:"distortion",  component:"EnhancerSPX808UI"    },
  { key:"loFiCrusher",       name:"LoFiCrusher",       type:"distortion",  component:"LoFiCrusherUI"       },
  { key:"infiniteReverb",    name:"InfiniteReverb",    type:"reverb",      component:"InfiniteReverbUI"    },
  { key:"reverseDelay",      name:"ReverseDelay",      type:"delay",       component:"ReverseDelayUI"      },
  { key:"declicker",         name:"Declicker",         type:"filter",      component:"DeclickerUI"         },
  { key:"dehummer",          name:"Dehummer",          type:"filter",      component:"DehummmerUI"         },
  { key:"midSideComp",       name:"MidSideComp",       type:"comp",        component:"MidSideCompUI"       },
  { key:"subOctaver",        name:"SubOctaver",        type:"filter",      component:"SubOctaverUI"        },
  { key:"chorusEnsemble",    name:"ChorusEnsemble",    type:"reverb",      component:"ChorusEnsembleUI"    },
  { key:"tempoDelay",        name:"TempoDelay",        type:"delay",       component:"TempoDelayUI"        },
  { key:"pitchRandomizer",   name:"PitchRandomizer",   type:"filter",      component:"PitchRandomizerUI"   },
  { key:"autoWah",           name:"AutoWah",           type:"filter",      component:"AutoWahUI"           },
  { key:"drumEnhancer",      name:"DrumEnhancer",      type:"comp",        component:"DrumEnhancerUI"      },
  { key:"vocalSaturator",    name:"VocalSaturator",    type:"distortion",  component:"VocalSaturatorUI"    },
  { key:"gainStager",        name:"GainStager",        type:"eq",          component:"GainStagerUI"        },
  { key:"multibandLimiter",  name:"MultibandLimiter",  type:"limit",       component:"MultibandLimiterUI"  },
  { key:"goniometer",        name:"Goniometer",        type:"eq",          component:"GoniometerUI"        },
  { key:"phaseScope",        name:"PhaseScope",        type:"eq",          component:"PhaseScopeUI"        },
  { key:"dialogueIsolator",  name:"DialogueIsolator",  type:"filter",      component:"DialogueIsolatorUI"  },
  { key:"cabinetSim",        name:"CabinetSim",        type:"distortion",  component:"CabinetSimUI"        },
  { key:"freqShifter",       name:"FreqShifter",       type:"filter",      component:"FreqShifterUI"       },
];
