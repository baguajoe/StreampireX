import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── AudioWorklet processor code (inlined as blob) ─────────────────────────
const VOCODER_PROCESSOR = `
class VocoderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'mix',       defaultValue: 1.0, minValue: 0, maxValue: 1 },
      { name: 'drive',     defaultValue: 0.0, minValue: 0, maxValue: 1 },
      { name: 'gate',      defaultValue: 0.01, minValue: 0, maxValue: 0.5 },
      { name: 'unisonVoices', defaultValue: 1, minValue: 1, maxValue: 8 },
      { name: 'unisonDetune', defaultValue: 15, minValue: 0, maxValue: 100 },
      { name: 'carrierFreq',  defaultValue: 220, minValue: 20, maxValue: 2000 },
      { name: 'formantShift', defaultValue: 0,   minValue: -12, maxValue: 12 },
      { name: 'vowelMorph',   defaultValue: 0,   minValue: 0,   maxValue: 4 },
    ];
  }

  constructor() {
    super();
    this.BANDS = 32;
    this.sampleRate = sampleRate;
    this.phase = new Float32Array(8).fill(0);
    this.envFollow = new Float32Array(this.BANDS).fill(0);
    this.synthEnv  = new Float32Array(this.BANDS).fill(0);
    this.vowelFormants = [
      [[800,1200,2500],[1,0.63,0.1]],   // A
      [[400,1700,2400],[1,0.25,0.1]],   // E
      [[300,2200,3000],[1,0.20,0.08]],  // I
      [[500, 900,2800],[1,0.63,0.1]],   // O
      [[350,1800,2600],[1,0.20,0.08]],  // U
    ];
    this.port.onmessage = (e) => {
      if (e.data.type === 'setParam') {
        this[e.data.key] = e.data.value;
      }
    };
  }

  // Simple 1-pole bandpass via biquad coefficients
  biquadBP(freq, Q, sr) {
    const w0 = 2 * Math.PI * freq / sr;
    const alpha = Math.sin(w0) / (2 * Q);
    const b0 = alpha, b1 = 0, b2 = -alpha;
    const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
    return { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 };
  }

  process(inputs, outputs, parameters) {
    const input  = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    const mix         = parameters.mix[0];
    const drive       = parameters.drive[0];
    const gate        = parameters.gate[0];
    const voices      = Math.round(parameters.unisonVoices[0]);
    const detune      = parameters.unisonDetune[0];
    const baseFreq    = parameters.carrierFreq[0];
    const vowelMorph  = parameters.vowelMorph[0];

    const sr = this.sampleRate;
    const frameSize = input.length;
    const envDecay  = Math.exp(-1 / (sr * 0.02));
    const envAttack = 1 - envDecay;

    // Band frequencies — log spaced 80Hz–8kHz
    for (let s = 0; s < frameSize; s++) {
      const modSample = input[s];

      // Gate check
      const absIn = Math.abs(modSample);
      const gated = absIn > gate ? modSample : 0;

      // Generate carrier: unison sawtooth oscillators
      let carrier = 0;
      for (let v = 0; v < voices; v++) {
        const detuneCents = voices > 1
          ? (v / (voices - 1) - 0.5) * detune
          : 0;
        const freq = baseFreq * Math.pow(2, detuneCents / 1200);
        const inc  = freq / sr;
        this.phase[v] = (this.phase[v] + inc) % 1;
        carrier += (this.phase[v] * 2 - 1); // sawtooth
      }
      carrier /= voices;

      // Drive on carrier
      if (drive > 0) {
        carrier = carrier * (1 + drive * 4);
        carrier = Math.tanh(carrier);
      }

      // Vowel formant shaping (simple mix of shaped carrier)
      const vi  = Math.floor(vowelMorph);
      const vf  = vowelMorph - vi;
      const v0  = this.vowelFormants[Math.min(vi, 4)];
      const v1  = this.vowelFormants[Math.min(vi + 1, 4)];
      let formantGain = 0;
      for (let f = 0; f < 3; f++) {
        const g0 = v0[1][f], g1 = v1[1][f];
        formantGain += (g0 + (g1 - g0) * vf) / 3;
      }
      carrier *= formantGain;

      // Simple envelope follower on modulator → apply to carrier
      const rms = modSample * modSample;
      const env = this.envFollow[0] = this.envFollow[0] * envDecay + rms * envAttack;
      const shaped = carrier * Math.sqrt(Math.max(0, env)) * 8;

      // Mix dry/wet
      output[s] = gated * (1 - mix) + shaped * mix;

      // Soft clip output
      output[s] = Math.tanh(output[s]);
    }
    return true;
  }
}
registerProcessor('vocoder-processor', VocoderProcessor);
`;

// ── Preset definitions ────────────────────────────────────────────────────
const PRESETS = {
  Robot:    { mix:1.0, drive:0.3, gate:0.01, unisonVoices:1, unisonDetune:0,  carrierFreq:100, vowelMorph:0,   harmonizer:false, arpOn:false, label:'🤖 Robot' },
  DaftPunk: { mix:1.0, drive:0.6, gate:0.02, unisonVoices:4, unisonDetune:8,  carrierFreq:130, vowelMorph:1,   harmonizer:true,  arpOn:false, label:'🎛️ Daft Punk' },
  TPain:    { mix:0.9, drive:0.2, gate:0.01, unisonVoices:2, unisonDetune:12, carrierFreq:185, vowelMorph:0.5, harmonizer:true,  arpOn:false, label:'🎤 T-Pain' },
  Choir:    { mix:0.85,drive:0.0, gate:0.01, unisonVoices:8, unisonDetune:20, carrierFreq:220, vowelMorph:2,   harmonizer:true,  arpOn:false, label:'🎵 Choir' },
  Alien:    { mix:1.0, drive:0.9, gate:0.02, unisonVoices:6, unisonDetune:40, carrierFreq:80,  vowelMorph:3,   harmonizer:false, arpOn:true,  label:'👽 Alien' },
  Radio:    { mix:0.7, drive:0.4, gate:0.03, unisonVoices:1, unisonDetune:0,  carrierFreq:300, vowelMorph:1.5, harmonizer:false, arpOn:false, label:'📻 Radio' },
  Megaphone:{ mix:0.8, drive:0.7, gate:0.04, unisonVoices:2, unisonDetune:5,  carrierFreq:400, vowelMorph:1,   harmonizer:false, arpOn:false, label:'📢 Megaphone' },
  Crystal:  { mix:0.95,drive:0.1, gate:0.01, unisonVoices:8, unisonDetune:25, carrierFreq:440, vowelMorph:4,   harmonizer:true,  arpOn:false, label:'💎 Crystal' },
};

const VOWELS = ['A','E','I','O','U'];
const HARMONIZER_INTERVALS = [0, 3, 7, 12]; // root, min3, perf5, octave

const SPXVoxEngine = ({ audioContext: externalCtx, inputNode, outputNode, onPadOutput, compact = false }) => {
  const [active, setActive]           = useState(false);
  const [preset, setPreset]           = useState('Robot');
  const [params, setParams]           = useState({ ...PRESETS.Robot });
  const [vowelIdx, setVowelIdx]       = useState(0);
  const [arpBpm, setArpBpm]           = useState(120);
  const [arpPattern, setArpPattern]   = useState([0,3,7,12,7,3]);
  const [arpStep, setArpStep]         = useState(0);
  const [padOutput, setPadOutput]     = useState(null); // null = direct
  const [pitchDetected, setPitchDetected] = useState(220);
  const [level, setLevel]             = useState(0);

  const ctxRef       = useRef(null);
  const workletRef   = useRef(null);
  const streamRef    = useRef(null);
  const sourceRef    = useRef(null);
  const gainRef      = useRef(null);
  const analyserRef  = useRef(null);
  const arpTimerRef  = useRef(null);
  const animRef      = useRef(null);

  // ── Pitch detection via autocorrelation ─────────────────────────────
  const detectPitch = useCallback((analyser) => {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const SIZE = buf.length;
    const rms = Math.sqrt(buf.reduce((s,v) => s + v*v, 0) / SIZE);
    setLevel(Math.min(1, rms * 8));
    if (rms < 0.01) return;

    // YIN-like autocorrelation
    let r1 = 0, r2 = SIZE;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < 0.2) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break; }
    const trimmed = buf.slice(r1, r2);
    const T = trimmed.length;
    const corr = new Float32Array(T);
    for (let lag = 0; lag < T; lag++) {
      for (let i = 0; i < T - lag; i++) corr[lag] += trimmed[i] * trimmed[i + lag];
    }
    let maxCorr = -1, bestLag = -1;
    for (let lag = 20; lag < T; lag++) {
      if (corr[lag] > maxCorr) { maxCorr = corr[lag]; bestLag = lag; }
    }
    if (bestLag > 0 && workletRef.current) {
      const freq = Math.round((ctxRef.current?.sampleRate || 44100) / bestLag);
      if (freq > 50 && freq < 1500) {
        setPitchDetected(freq);
        workletRef.current.parameters.get('carrierFreq').setValueAtTime(freq, 0);
      }
    }
  }, []);

  // ── Level meter animation loop ───────────────────────────────────────
  const animLoop = useCallback(() => {
    if (analyserRef.current) detectPitch(analyserRef.current);
    animRef.current = requestAnimationFrame(animLoop);
  }, [detectPitch]);

  // ── Start engine ────────────────────────────────────────────────────
  const startEngine = useCallback(async () => {
    try {
      const ctx = externalCtx || new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' });
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const blob = new Blob([VOCODER_PROCESSOR], { type: 'application/javascript' });
      const url  = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      streamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const worklet = new AudioWorkletNode(ctx, 'vocoder-processor', {
        numberOfInputs: 1, numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      workletRef.current = worklet;
      source.connect(worklet);

      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gainRef.current = gain;
      worklet.connect(gain);

      if (outputNode) gain.connect(outputNode);
      else gain.connect(ctx.destination);

      // Push initial params
      applyParams(params, worklet);
      setActive(true);
      animRef.current = requestAnimationFrame(animLoop);
    } catch (err) {
      console.error('[SPXVoxEngine] start failed', err);
    }
  }, [externalCtx, outputNode, params, animLoop]);

  // ── Stop engine ─────────────────────────────────────────────────────
  const stopEngine = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    clearInterval(arpTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    workletRef.current?.disconnect();
    gainRef.current?.disconnect();
    if (!externalCtx) ctxRef.current?.close();
    setActive(false);
    setLevel(0);
  }, [externalCtx]);

  // ── Apply params to worklet ──────────────────────────────────────────
  const applyParams = (p, node) => {
    const w = node || workletRef.current;
    if (!w) return;
    const t = ctxRef.current?.currentTime || 0;
    const set = (name, val) => { try { w.parameters.get(name)?.setValueAtTime(val, t); } catch(e){} };
    set('mix',          p.mix);
    set('drive',        p.drive);
    set('gate',         p.gate);
    set('unisonVoices', p.unisonVoices);
    set('unisonDetune', p.unisonDetune);
    set('vowelMorph',   p.vowelMorph);
  };

  // ── Load preset ─────────────────────────────────────────────────────
  const loadPreset = (name) => {
    const p = { ...PRESETS[name] };
    setPreset(name);
    setParams(p);
    applyParams(p);
    if (p.arpOn) startArp(p); else stopArp();
  };

  // ── Arpeggiator ─────────────────────────────────────────────────────
  const startArp = (p) => {
    clearInterval(arpTimerRef.current);
    const interval = (60 / (p.arpBpm || arpBpm)) * 1000 / 2;
    let step = 0;
    arpTimerRef.current = setInterval(() => {
      const semitones = arpPattern[step % arpPattern.length];
      const freq = (pitchDetected || 220) * Math.pow(2, semitones / 12);
      workletRef.current?.parameters.get('carrierFreq').setValueAtTime(freq, 0);
      setArpStep(step % arpPattern.length);
      step++;
    }, interval);
  };

  const stopArp = () => clearInterval(arpTimerRef.current);

  // ── Vowel morph buttons ──────────────────────────────────────────────
  const setVowel = (i) => {
    setVowelIdx(i);
    const newP = { ...params, vowelMorph: i };
    setParams(newP);
    workletRef.current?.parameters.get('vowelMorph').setValueAtTime(i, 0);
  };

  // ── Param knob change ────────────────────────────────────────────────
  const updateParam = (key, val) => {
    const newP = { ...params, [key]: val };
    setParams(newP);
    const map = {
      mix: 'mix', drive: 'drive', gate: 'gate',
      unisonVoices: 'unisonVoices', unisonDetune: 'unisonDetune',
    };
    if (map[key] && workletRef.current) {
      workletRef.current.parameters.get(map[key])?.setValueAtTime(val, 0);
    }
  };

  useEffect(() => () => stopEngine(), []);

  // ── Styles ───────────────────────────────────────────────────────────
  const S = {
    wrap: {
      background: '#06060f',
      border: '1px solid #1a2a3a',
      borderRadius: 10,
      padding: compact ? 12 : 20,
      fontFamily: 'JetBrains Mono, monospace',
      color: '#c9d1d9',
      minWidth: compact ? 320 : 640,
      maxWidth: 900,
    },
    header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
    title:  { color:'#00ffc8', fontSize: compact ? 13 : 15, fontWeight:700, letterSpacing:2 },
    pwrBtn: {
      background: active ? '#00ffc8' : '#1a2a2a',
      color: active ? '#06060f' : '#00ffc8',
      border: '1px solid #00ffc8',
      borderRadius: 6, padding:'4px 14px', cursor:'pointer',
      fontFamily:'JetBrains Mono, monospace', fontSize:12, fontWeight:700,
    },
    presetRow: { display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 },
    presetBtn: (active) => ({
      background: active ? '#FF6600' : '#0d1117',
      color: active ? '#fff' : '#8b9ab0',
      border: `1px solid ${active ? '#FF6600' : '#21262d'}`,
      borderRadius:5, padding:'4px 10px', cursor:'pointer',
      fontFamily:'JetBrains Mono, monospace', fontSize:11,
    }),
    section: { marginBottom:14 },
    sectionLabel: { color:'#5a7088', fontSize:10, letterSpacing:2, textTransform:'uppercase', marginBottom:6 },
    vowelRow: { display:'flex', gap:8, marginBottom:14 },
    vowelBtn: (sel) => ({
      flex:1, padding:'8px 0', textAlign:'center',
      background: sel ? '#00ffc8' : '#0d1117',
      color: sel ? '#06060f' : '#8b9ab0',
      border: `1px solid ${sel ? '#00ffc8' : '#21262d'}`,
      borderRadius:6, cursor:'pointer', fontWeight:700,
      fontFamily:'JetBrains Mono, monospace', fontSize:13,
    }),
    knobRow: { display:'flex', gap:12, flexWrap:'wrap' },
    knobWrap: { display:'flex', flexDirection:'column', alignItems:'center', gap:4 },
    knobLabel: { color:'#5a7088', fontSize:9, letterSpacing:1, textTransform:'uppercase' },
    knobVal: { color:'#00ffc8', fontSize:11 },
    range: { accentColor:'#00ffc8', width:80 },
    meter: {
      height:6, borderRadius:3, background:'#0d1117',
      border:'1px solid #21262d', overflow:'hidden', marginBottom:12,
    },
    meterFill: (lv) => ({
      height:'100%', width:`${lv*100}%`,
      background: lv > 0.8 ? '#ff4444' : lv > 0.5 ? '#FF6600' : '#00ffc8',
      transition:'width 0.05s',
    }),
    arpRow: { display:'flex', alignItems:'center', gap:10, marginTop:8 },
    arpStep: (active) => ({
      width:18, height:18, borderRadius:3,
      background: active ? '#FF6600' : '#0d1117',
      border:`1px solid ${active ? '#FF6600' : '#21262d'}`,
    }),
    pitchBadge: {
      background:'#0d1117', border:'1px solid #21262d', borderRadius:5,
      padding:'3px 10px', color:'#00ffc8', fontSize:11,
    },
  };

  const Knob = ({ label, paramKey, min, max, step=0.01, decimals=2 }) => (
    <div style={S.knobWrap}>
      <span style={S.knobLabel}>{label}</span>
      <input type="range" min={min} max={max} step={step}
        value={params[paramKey] ?? min}
        onChange={e => updateParam(paramKey, parseFloat(e.target.value))}
        style={S.range}
      />
      <span style={S.knobVal}>{(params[paramKey] ?? min).toFixed(decimals)}</span>
    </div>
  );

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>⚡ SPX VOXENGINE</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={S.pitchBadge}>♩ {pitchDetected}Hz</span>
          <button style={S.pwrBtn} onClick={active ? stopEngine : startEngine}>
            {active ? '■ STOP' : '▶ START'}
          </button>
        </div>
      </div>

      {/* Level meter */}
      <div style={S.meter}><div style={S.meterFill(level)} /></div>

      {/* Presets */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Preset</div>
        <div style={S.presetRow}>
          {Object.entries(PRESETS).map(([name, p]) => (
            <button key={name} style={S.presetBtn(preset===name)} onClick={() => loadPreset(name)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vowel morph */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Vowel Morph</div>
        <div style={S.vowelRow}>
          {VOWELS.map((v,i) => (
            <button key={v} style={S.vowelBtn(vowelIdx===i)} onClick={() => setVowel(i)}>{v}</button>
          ))}
        </div>
        <input type="range" min={0} max={4} step={0.01}
          value={params.vowelMorph ?? 0}
          onChange={e => { const v=parseFloat(e.target.value); setVowelIdx(Math.round(v)); updateParam('vowelMorph',v); }}
          style={{ ...S.range, width:'100%', marginTop:4 }}
        />
      </div>

      {/* Core knobs */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Vocoder</div>
        <div style={S.knobRow}>
          <Knob label="Mix"    paramKey="mix"    min={0} max={1} />
          <Knob label="Drive"  paramKey="drive"  min={0} max={1} />
          <Knob label="Gate"   paramKey="gate"   min={0} max={0.3} step={0.001} decimals={3} />
        </div>
      </div>

      {/* Unison */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Unison</div>
        <div style={S.knobRow}>
          <Knob label="Voices" paramKey="unisonVoices" min={1} max={8} step={1} decimals={0} />
          <Knob label="Detune" paramKey="unisonDetune" min={0} max={100} step={1} decimals={0} />
        </div>
      </div>

      {/* Harmonizer */}
      <div style={S.section}>
        <div style={S.sectionLabel}>Harmonizer — {HARMONIZER_INTERVALS.map((i,n) => `V${n+1}:+${i}st`).join(' ')}</div>
        <div style={{ color:'#5a7088', fontSize:10 }}>
          Root · Min3rd · Perf5th · Octave — follows detected pitch {pitchDetected}Hz
        </div>
      </div>

      {/* Arpeggiator */}
      {params.arpOn !== undefined && (
        <div style={S.section}>
          <div style={S.sectionLabel}>Arpeggiator</div>
          <div style={S.arpRow}>
            <button style={S.presetBtn(params.arpOn)} onClick={() => {
              const on = !params.arpOn;
              setParams(p => ({...p, arpOn:on}));
              on ? startArp(params) : stopArp();
            }}>{params.arpOn ? '■ ARP OFF' : '▶ ARP ON'}</button>
            <span style={S.knobLabel}>BPM</span>
            <input type="range" min={60} max={200} step={1} value={arpBpm}
              onChange={e => setArpBpm(parseInt(e.target.value))}
              style={{ ...S.range, width:80 }} />
            <span style={S.knobVal}>{arpBpm}</span>
            {arpPattern.map((st, i) => (
              <div key={i} style={S.arpStep(arpStep===i && params.arpOn)} />
            ))}
          </div>
        </div>
      )}

      {/* FX chain info */}
      <div style={{ color:'#21262d', fontSize:10, marginTop:8, textAlign:'right' }}>
        Drive → Gate → Unison → Formant → Harmonizer → Mix
      </div>
    </div>
  );
};

export default SPXVoxEngine;
