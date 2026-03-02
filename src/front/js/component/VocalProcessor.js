// =============================================================================
// VocalProcessor.js — Vocal Production Suite for StreamPireX Recording Studio
// =============================================================================
// 10 tabs: FX Chain, Analyzer, Presets, AI Coach, Auto-Tune, Harmony Generator,
// Take Lanes (comping), Breath Remover, Vocal Rider, Vocal Alignment.
// Sub-components: VocalTuner, HarmonyGenerator, TakeLanes, BreathRemover,
//                 VocalRider, VocalAlignment
// =============================================================================
// KNOB UPDATE: FX Chain controls now use VocalKnob rotary components arranged
// in hardware-style rows instead of flat range sliders.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import VocalTuner from './VocalTuner';
import HarmonyGenerator from './HarmonyGenerator';
import TakeLanes from './TakeLanes';
import BreathRemover from './BreathRemover';
import VocalRider from './VocalRider';
import VocalAlignment from './VocalAlignment';
import VocalKnob from './VocalKnob';

// ── Constants ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteFromFreq = (freq) => {
  if (!freq || freq <= 0) return null;
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  return Math.round(noteNum);
};
const freqFromNote = (note) => 440 * Math.pow(2, (note - 69) / 12);
const noteName = (n) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
const centsOff = (freq, note) => {
  if (!freq || freq <= 0) return 0;
  return Math.round(1200 * Math.log2(freq / freqFromNote(note)));
};

// ── Vocal Range Labels ──
const VOCAL_RANGES = [
  { name: 'Bass',           low: 82,  high: 330, color: '#5b4fcc' },
  { name: 'Baritone',       low: 98,  high: 392, color: '#007aff' },
  { name: 'Tenor',          low: 131, high: 523, color: '#00c7be' },
  { name: 'Countertenor',   low: 165, high: 659, color: '#00ffc8' },
  { name: 'Contralto',      low: 175, high: 698, color: '#ff6b35' },
  { name: 'Mezzo-Soprano',  low: 220, high: 880, color: '#ff9500' },
  { name: 'Soprano',        low: 262, high: 1047, color: '#ff3b30' },
];

// ── Preset Chains ──
const VOCAL_PRESETS = {
  'radio-ready': {
    name: '📻 Radio Ready',
    desc: 'Broadcast-quality vocal chain',
    gate: { enabled: true, threshold: -45, attack: 0.5, release: 50, range: -80 },
    deesser: { enabled: true, frequency: 6500, threshold: -25, ratio: 4, reduction: 6 },
    comp: { threshold: -18, ratio: 3.5, attack: 8, release: 120 },
    eq: { highpass: 80, presence: { freq: 3500, gain: 3 }, air: { freq: 12000, gain: 2 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.12, decay: 1.4 },
    limiter: { threshold: -1, release: 50 },
  },
  'warm-intimate': {
    name: '🎙 Warm & Intimate',
    desc: 'Close-mic podcast / R&B feel',
    gate: { enabled: true, threshold: -50, attack: 0.3, release: 40, range: -60 },
    deesser: { enabled: true, frequency: 5800, threshold: -22, ratio: 3, reduction: 4 },
    comp: { threshold: -20, ratio: 2.5, attack: 15, release: 200 },
    eq: { highpass: 60, presence: { freq: 2500, gain: 2 }, air: { freq: 10000, gain: 1.5 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.08, decay: 1.0 },
    limiter: { threshold: -2, release: 80 },
  },
  'lofi-vocal': {
    name: '📼 Lo-Fi Vocal',
    desc: 'Filtered, saturated, vintage',
    gate: { enabled: false, threshold: -50, attack: 0.5, release: 50, range: -80 },
    deesser: { enabled: false, frequency: 6000, threshold: -20, ratio: 3, reduction: 4 },
    comp: { threshold: -15, ratio: 5, attack: 3, release: 80 },
    eq: { highpass: 200, lowpass: 6000, presence: { freq: 1200, gain: 4 }, air: { freq: 8000, gain: -6 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.25, decay: 2.0 },
    limiter: { threshold: -3, release: 100 },
    saturation: 30,
  },
  'ethereal': {
    name: '✨ Ethereal',
    desc: 'Dreamy doubled vocals with air',
    gate: { enabled: false, threshold: -50, attack: 0.5, release: 50, range: -80 },
    deesser: { enabled: true, frequency: 7000, threshold: -20, ratio: 3, reduction: 5 },
    comp: { threshold: -22, ratio: 2, attack: 20, release: 250 },
    eq: { highpass: 100, presence: { freq: 4000, gain: 2 }, air: { freq: 14000, gain: 4 } },
    doubler: { enabled: true, detune: 8, delay: 25, mix: 0.35 },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.35, decay: 3.5 },
    limiter: { threshold: -1.5, release: 60 },
  },
  'aggressive-rap': {
    name: '🔥 Aggressive Rap',
    desc: 'Hard compression, presence boost',
    gate: { enabled: true, threshold: -40, attack: 0.2, release: 30, range: -90 },
    deesser: { enabled: true, frequency: 6000, threshold: -18, ratio: 6, reduction: 8 },
    comp: { threshold: -12, ratio: 8, attack: 1, release: 50 },
    eq: { highpass: 100, presence: { freq: 4500, gain: 5 }, air: { freq: 10000, gain: 3 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.05, decay: 0.6 },
    limiter: { threshold: -0.5, release: 30 },
  },
  'podcast': {
    name: '🎧 Podcast Voice',
    desc: 'Clean, clear, professional speech',
    gate: { enabled: true, threshold: -42, attack: 0.5, release: 60, range: -70 },
    deesser: { enabled: true, frequency: 6200, threshold: -24, ratio: 3, reduction: 4 },
    comp: { threshold: -20, ratio: 3, attack: 10, release: 150 },
    eq: { highpass: 80, presence: { freq: 3000, gain: 2.5 }, air: { freq: 10000, gain: 1 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.03, decay: 0.5 },
    limiter: { threshold: -1, release: 60 },
  },
  'harmony-stack': {
    name: '🎶 Harmony Stack',
    desc: 'Pitch-shifted harmonies + doubler',
    gate: { enabled: true, threshold: -48, attack: 0.5, release: 50, range: -80 },
    deesser: { enabled: true, frequency: 6500, threshold: -22, ratio: 3, reduction: 5 },
    comp: { threshold: -18, ratio: 3, attack: 10, release: 120 },
    eq: { highpass: 90, presence: { freq: 3500, gain: 2 }, air: { freq: 12000, gain: 2 } },
    doubler: { enabled: true, detune: 12, delay: 30, mix: 0.4 },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0.20, decay: 2.0 },
    limiter: { threshold: -1, release: 50 },
  },
  'telephone': {
    name: '📞 Telephone',
    desc: 'Bandpass filtered retro phone effect',
    gate: { enabled: false, threshold: -50, attack: 0.5, release: 50, range: -80 },
    deesser: { enabled: false, frequency: 6000, threshold: -20, ratio: 3, reduction: 4 },
    comp: { threshold: -10, ratio: 10, attack: 1, release: 40 },
    eq: { highpass: 400, lowpass: 3500, presence: { freq: 1500, gain: 6 }, air: { freq: 8000, gain: -12 } },
    doubler: { enabled: false },
    pitchShift: { semitones: 0 },
    reverb: { mix: 0, decay: 0.5 },
    limiter: { threshold: -2, release: 50 },
    saturation: 40,
  },
};

// ── Autocorrelation pitch detection ──
const detectPitch = (buffer, sampleRate) => {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  const minPeriod = Math.floor(sampleRate / 1100);
  const maxPeriod = Math.floor(sampleRate / 60);

  for (let offset = minPeriod; offset < maxPeriod && offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    if (correlation > 0.9 && correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
    if (correlation > 0.9 && lastCorrelation < 0.9 && bestOffset !== -1) break;
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.9 && bestOffset > 0) {
    return sampleRate / bestOffset;
  }
  return -1;
};

// ── Knob row helper style ──
const knobRowStyle = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: 20,
  padding: '10px 0',
  flexWrap: 'wrap',
  width: '100%',
};

const VocalProcessor = ({
  audioContext: externalCtx,
  inputStream,
  isEmbedded = false,
  onRecordingComplete,
  onSendToTrack,
  onApplyToConsole,    // (fxSettings) => void — writes VP chain to Console track effects
  tracks,
  selectedTrackIndex,
  bpm = 120,
}) => {
  // ── FX State ──
  const [gateEnabled, setGateEnabled] = useState(true);
  const [gateThreshold, setGateThreshold] = useState(-45);
  const [gateAttack, setGateAttack] = useState(0.5);
  const [gateRelease, setGateRelease] = useState(50);
  const [gateRange, setGateRange] = useState(-80);

  const [deesserEnabled, setDeesserEnabled] = useState(true);
  const [deesserFreq, setDeesserFreq] = useState(6500);
  const [deesserThreshold, setDeesserThreshold] = useState(-25);
  const [deesserReduction, setDeesserReduction] = useState(6);

  const [compThreshold, setCompThreshold] = useState(-18);
  const [compRatio, setCompRatio] = useState(3.5);
  const [compAttack, setCompAttack] = useState(8);
  const [compRelease, setCompRelease] = useState(120);

  const [eqHighpass, setEqHighpass] = useState(80);
  const [eqLowpass, setEqLowpass] = useState(20000);
  const [eqPresenceFreq, setEqPresenceFreq] = useState(3500);
  const [eqPresenceGain, setEqPresenceGain] = useState(3);
  const [eqAirFreq, setEqAirFreq] = useState(12000);
  const [eqAirGain, setEqAirGain] = useState(2);

  const [doublerEnabled, setDoublerEnabled] = useState(false);
  const [doublerDetune, setDoublerDetune] = useState(8);
  const [doublerDelay, setDoublerDelay] = useState(25);
  const [doublerMix, setDoublerMix] = useState(0.3);

  const [pitchShift, setPitchShift] = useState(0);

  const [reverbMix, setReverbMix] = useState(0.12);
  const [reverbDecay, setReverbDecay] = useState(1.4);

  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [limiterThreshold, setLimiterThreshold] = useState(-1);
  const [limiterRelease, setLimiterRelease] = useState(50);

  const [saturation, setSaturation] = useState(0);

  // ── Monitoring ──
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(0.7);
  const [inputGain, setInputGain] = useState(1.0);

  // ── Analyzer State ──
  const [currentPitch, setCurrentPitch] = useState(-1);
  const [currentNote, setCurrentNote] = useState(null);
  const [currentCents, setCurrentCents] = useState(0);
  const [currentRMS, setCurrentRMS] = useState(0);
  const [peakRMS, setPeakRMS] = useState(0);
  const [pitchHistory, setPitchHistory] = useState([]);
  const [lowestNote, setLowestNote] = useState(null);
  const [highestNote, setHighestNote] = useState(null);
  const [detectedRange, setDetectedRange] = useState(null);
  const [sibilanceLevel, setSibilanceLevel] = useState(0);
  const [dynamicRange, setDynamicRange] = useState(0);
  const [gateReduction, setGateReduction] = useState(0);
  const [compGainReduction, setCompGainReduction] = useState(0);

  // ── AI Coach ──
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasStream, setHasStream] = useState(false);

  // ── UI ──
  const [activeTab, setActiveTab] = useState('chain');

  const selectedBuffer = tracks && tracks[selectedTrackIndex] ? tracks[selectedTrackIndex].audioBuffer : null;
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [expandedFx, setExpandedFx] = useState({
    gate: true, deesser: true, comp: true, eq: true,
    doubler: false, pitch: false, reverb: true, limiter: true, saturation: false,
  });

  // ── Refs ──
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserBufRef = useRef(null);
  const animRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const pitchCanvasRef = useRef(null);
  const meterCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const rmsHistoryRef = useRef([]);
  const monitorGainRef = useRef(null);
  const inputGainRef = useRef(null);

  // ── LIVE FX GRAPH refs ──
  const fxChainRef = useRef(null);       // { nodes: AudioNode[], cleanups: Function[] }
  const reverbIRRef = useRef(null);      // cached reverb impulse response buffer
  const compNodeRef = useRef(null);      // live compressor node for GR metering
  const fxInputRef = useRef(null);       // GainNode: entry point of FX chain
  const fxOutputRef = useRef(null);      // GainNode: exit point of FX chain

  // ── Audio Context ──
  const getCtx = useCallback(() => {
    if (externalCtx) return externalCtx;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [externalCtx]);

  // ═══════════════════════════════════════════════════════════════════════════
  // REVERB IR GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════
  const generateReverbIR = useCallback((ctx, decay = 2) => {
    const len = Math.floor(ctx.sampleRate * Math.max(0.1, decay));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE FX CHAIN BUILDER
  // Builds real Web Audio nodes from current knob state.
  // Signal: fxInput → [gate] → [deesser] → [comp] → [EQ] → [sat] →
  //         [doubler] → [limiter] → fxOutput
  //                              ↘ [reverb send] → fxOutput
  // ═══════════════════════════════════════════════════════════════════════════
  const buildLiveFxChain = useCallback(() => {
    const ctx = getCtx();
    const fxIn = fxInputRef.current;
    const fxOut = fxOutputRef.current;
    if (!ctx || !fxIn || !fxOut) return;

    // Tear down previous chain
    if (fxChainRef.current) {
      fxChainRef.current.cleanups.forEach(fn => { try { fn(); } catch {} });
    }
    try { fxIn.disconnect(); } catch {}

    const nodes = [];
    const cleanups = [];
    let last = fxIn;
    const chain = (node) => { last.connect(node); last = node; nodes.push(node); };

    // 1. NOISE GATE (DynamicsCompressor as expander approximation)
    if (gateEnabled) {
      const gate = ctx.createDynamicsCompressor();
      gate.threshold.value = gateThreshold;
      gate.ratio.value = 20;
      gate.knee.value = 0;
      gate.attack.value = Math.max(0.001, gateAttack / 1000);
      gate.release.value = Math.max(0.001, gateRelease / 1000);
      chain(gate);
    }

    // 2. DE-ESSER (narrow band attenuation)
    if (deesserEnabled) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = deesserFreq;
      bp.Q.value = 4;
      bp.gain.value = -deesserReduction;
      chain(bp);
    }

    // 3. COMPRESSOR
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = compThreshold;
    comp.ratio.value = compRatio;
    comp.attack.value = Math.max(0.001, compAttack / 1000);
    comp.release.value = Math.max(0.001, compRelease / 1000);
    comp.knee.value = 6;
    chain(comp);
    compNodeRef.current = comp;

    // 4a. EQ: High-pass
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = eqHighpass;
    hp.Q.value = 0.707;
    chain(hp);

    // 4b. EQ: Low-pass (only when < ~20kHz)
    if (eqLowpass < 19500) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = eqLowpass;
      lp.Q.value = 0.707;
      chain(lp);
    }

    // 4c. EQ: Presence peak
    if (eqPresenceGain !== 0) {
      const pres = ctx.createBiquadFilter();
      pres.type = 'peaking';
      pres.frequency.value = eqPresenceFreq;
      pres.Q.value = 1.5;
      pres.gain.value = eqPresenceGain;
      chain(pres);
    }

    // 4d. EQ: Air shelf
    if (eqAirGain !== 0) {
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = eqAirFreq;
      air.gain.value = eqAirGain;
      chain(air);
    }

    // 5. SATURATION (waveshaper)
    if (saturation > 0) {
      const ws = ctx.createWaveShaper();
      const drive = saturation / 100;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * (1 + drive * 5));
      }
      ws.curve = curve;
      ws.oversample = '4x';
      chain(ws);
    }

    // 6. VOCAL DOUBLER (detuned delayed copy)
    if (doublerEnabled) {
      const dryG = ctx.createGain();
      dryG.gain.value = 1.0;
      const wetG = ctx.createGain();
      wetG.gain.value = doublerMix;
      const del = ctx.createDelay(0.1);
      del.delayTime.value = doublerDelay / 1000;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.5;
      lfoG.gain.value = (doublerDetune / 1200) * 0.01;
      lfo.connect(lfoG);
      lfoG.connect(del.delayTime);
      lfo.start();
      cleanups.push(() => { try { lfo.stop(); } catch {} });
      const merge = ctx.createGain();
      last.connect(dryG); last.connect(del);
      del.connect(wetG);
      dryG.connect(merge); wetG.connect(merge);
      last = merge;
      nodes.push(dryG, del, wetG, merge);
    }

    // 7. REVERB (convolver send)
    if (reverbMix > 0) {
      if (!reverbIRRef.current || Math.abs((reverbIRRef.current._decay || 0) - reverbDecay) > 0.1) {
        reverbIRRef.current = generateReverbIR(ctx, reverbDecay);
        reverbIRRef.current._decay = reverbDecay;
      }
      const dryG = ctx.createGain();
      dryG.gain.value = 1 - reverbMix * 0.5;
      const conv = ctx.createConvolver();
      conv.buffer = reverbIRRef.current;
      const wetG = ctx.createGain();
      wetG.gain.value = reverbMix;
      const merge = ctx.createGain();
      last.connect(dryG); last.connect(conv);
      conv.connect(wetG);
      dryG.connect(merge); wetG.connect(merge);
      last = merge;
      nodes.push(dryG, conv, wetG, merge);
    }

    // 8. LIMITER
    if (limiterEnabled) {
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = limiterThreshold;
      lim.ratio.value = 20;
      lim.knee.value = 0;
      lim.attack.value = 0.001;
      lim.release.value = Math.max(0.01, limiterRelease / 1000);
      chain(lim);
    }

    // Connect to FX output
    last.connect(fxOut);
    fxChainRef.current = { nodes, cleanups };
  }, [
    getCtx, generateReverbIR,
    gateEnabled, gateThreshold, gateAttack, gateRelease,
    deesserEnabled, deesserFreq, deesserThreshold, deesserReduction,
    compThreshold, compRatio, compAttack, compRelease,
    eqHighpass, eqLowpass, eqPresenceFreq, eqPresenceGain, eqAirFreq, eqAirGain,
    saturation,
    doublerEnabled, doublerDetune, doublerDelay, doublerMix,
    reverbMix, reverbDecay,
    limiterEnabled, limiterThreshold, limiterRelease,
  ]);

  // ── Rebuild FX chain whenever any parameter changes ──
  useEffect(() => {
    if (hasStream && fxInputRef.current && fxOutputRef.current) {
      buildLiveFxChain();
    }
  }, [buildLiveFxChain, hasStream]);

  // ── Connect mic stream ──
  const connectStream = useCallback(async () => {
    const ctx = getCtx();
    let stream = inputStream;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      } catch (e) { console.error('Mic access denied:', e); return; }
    }
    streamRef.current = stream;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const inGain = ctx.createGain();
    inGain.gain.value = inputGain;
    inputGainRef.current = inGain;
    source.connect(inGain);

    // Pre-FX analyser (clean signal for pitch detection)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    analyserBufRef.current = new Float32Array(analyser.fftSize);
    inGain.connect(analyser);

    // FX chain entry/exit points
    const fxIn = ctx.createGain();
    fxIn.gain.value = 1.0;
    fxInputRef.current = fxIn;
    inGain.connect(fxIn);

    const fxOut = ctx.createGain();
    fxOut.gain.value = 1.0;
    fxOutputRef.current = fxOut;

    // Monitor output (receives processed signal from fxOut)
    const monGain = ctx.createGain();
    monGain.gain.value = monitorEnabled ? monitorVolume : 0;
    monitorGainRef.current = monGain;
    fxOut.connect(monGain);
    monGain.connect(ctx.destination);

    setHasStream(true);

    // Build the live FX chain between fxIn → fxOut
    setTimeout(() => buildLiveFxChain(), 0);

    startAnalysis();
  }, [getCtx, inputStream, inputGain, monitorEnabled, monitorVolume, buildLiveFxChain]);

  useEffect(() => {
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = monitorEnabled ? monitorVolume : 0;
    }
  }, [monitorEnabled, monitorVolume]);

  useEffect(() => {
    if (inputGainRef.current) inputGainRef.current.gain.value = inputGain;
  }, [inputGain]);

  useEffect(() => {
    if (inputStream) connectStream();
    return () => {
      stopAnalysis();
      // Clean up live FX chain
      if (fxChainRef.current) {
        fxChainRef.current.cleanups.forEach(fn => { try { fn(); } catch {} });
        fxChainRef.current = null;
      }
    };
  }, [inputStream]);

  // ── Analysis loop ──
  const startAnalysis = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const analyze = () => {
      const analyser = analyserRef.current;
      const buf = analyserBufRef.current;
      if (!analyser || !buf) return;

      analyser.getFloatTimeDomainData(buf);
      const ctx = getCtx();
      const freq = detectPitch(buf, ctx.sampleRate);

      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
      setCurrentRMS(rmsDb);

      rmsHistoryRef.current.push(rmsDb);
      if (rmsHistoryRef.current.length > 500) rmsHistoryRef.current.shift();

      const validRms = rmsHistoryRef.current.filter(v => v > -60);
      if (validRms.length > 10) {
        const sorted = [...validRms].sort((a, b) => a - b);
        const low = sorted[Math.floor(sorted.length * 0.1)];
        const high = sorted[Math.floor(sorted.length * 0.9)];
        setDynamicRange(Math.round(high - low));
      }

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      const binSize = ctx.sampleRate / analyser.fftSize;
      const sibilStart = Math.floor(4000 / binSize);
      const sibilEnd = Math.floor(10000 / binSize);
      let sibilEnergy = 0, totalEnergy = 0;
      for (let i = sibilStart; i < sibilEnd && i < freqData.length; i++) sibilEnergy += freqData[i];
      for (let i = 0; i < freqData.length; i++) totalEnergy += freqData[i];
      const sibilRatio = totalEnergy > 0 ? sibilEnergy / totalEnergy : 0;
      setSibilanceLevel(sibilRatio);

      if (rmsDb < gateThreshold) {
        setGateReduction(Math.min(0, gateRange - rmsDb));
      } else {
        setGateReduction(0);
      }

      // ── REAL compressor gain reduction from live node ──
      if (compNodeRef.current) {
        setCompGainReduction(compNodeRef.current.reduction || 0);
      }

      if (freq > 0) {
        setCurrentPitch(freq);
        const note = noteFromFreq(freq);
        setCurrentNote(note);
        setCurrentCents(centsOff(freq, note));

        historyRef.current.push(note);
        if (historyRef.current.length > 2000) historyRef.current.shift();

        if (lowestNote === null || note < lowestNote) setLowestNote(note);
        if (highestNote === null || note > highestNote) setHighestNote(note);

        if (lowestNote !== null && highestNote !== null) {
          const lowFreq = freqFromNote(lowestNote);
          const highFreq = freqFromNote(highestNote);
          for (const range of VOCAL_RANGES) {
            if (lowFreq >= range.low * 0.8 && highFreq <= range.high * 1.2) {
              setDetectedRange(range);
              break;
            }
          }
        }

        setPitchHistory(prev => {
          const next = [...prev, { freq, note, time: Date.now() }];
          if (next.length > 200) next.shift();
          return next;
        });
      } else {
        setCurrentPitch(-1);
        setCurrentNote(null);
      }

      drawPitchGraph();
      drawMeter(rmsDb, sibilRatio);

      animRef.current = requestAnimationFrame(analyze);
    };

    animRef.current = requestAnimationFrame(analyze);
  }, [getCtx, gateThreshold, gateRange, lowestNote, highestNote]);

  const stopAnalysis = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  // ── Draw pitch graph ──
  const drawPitchGraph = useCallback(() => {
    const cv = pitchCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const history = pitchHistory;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080e14';
    ctx.fillRect(0, 0, w, h);

    if (history.length > 0) {
      const notes = history.map(p => p.note);
      const minNote = Math.min(...notes) - 2;
      const maxNote = Math.max(...notes) + 2;
      const range = Math.max(maxNote - minNote, 12);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let n = minNote; n <= maxNote; n++) {
        const y = h - ((n - minNote) / range) * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        if (n % 12 === 0 || n % 12 === 4 || n % 12 === 7) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.font = '8px monospace';
          ctx.fillText(noteName(n), 2, y - 2);
        }
      }

      ctx.beginPath();
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffc8';
      ctx.shadowBlur = 4;
      history.forEach((p, i) => {
        const x = (i / Math.max(history.length - 1, 1)) * w;
        const y = h - ((p.note - minNote) / range) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (history.length > 0) {
        const last = history[history.length - 1];
        const x = w - 2;
        const y = h - ((last.note - minNote) / range) * h;
        ctx.fillStyle = '#00ffc8';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sing or speak to see pitch tracking', w / 2, h / 2);
      ctx.textAlign = 'left';
    }
  }, [pitchHistory]);

  // ── Draw level meter ──
  const drawMeter = useCallback((rmsDb, sibilRatio) => {
    const cv = meterCanvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080e14';
    ctx.fillRect(0, 0, w, h);

    const level = Math.max(0, Math.min(1, (rmsDb + 60) / 60));
    const barH = level * h;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#00ffc8');
    grad.addColorStop(0.6, '#00ffc8');
    grad.addColorStop(0.8, '#ffcc00');
    grad.addColorStop(0.95, '#ff3b30');
    ctx.fillStyle = grad;
    ctx.fillRect(2, h - barH, 14, barH);

    const gateY = h - ((gateThreshold + 60) / 60) * h;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(0, gateY); ctx.lineTo(18, gateY); ctx.stroke();
    ctx.setLineDash([]);

    const sibilH = sibilRatio * h * 3;
    ctx.fillStyle = sibilRatio > 0.3 ? '#ff3b30' : sibilRatio > 0.15 ? '#ffcc00' : 'rgba(0,255,200,0.3)';
    ctx.fillRect(22, h - sibilH, 10, sibilH);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '7px monospace';
    ctx.fillText('LVL', 1, 8);
    ctx.fillText('SIB', 20, 8);
  }, [gateThreshold]);

  // ── Recording ──
  const startRecording = useCallback(async () => {
    if (!hasStream) await connectStream();
    const ctx = getCtx();
    const stream = streamRef.current;
    if (!stream) return;

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      if (onRecordingComplete) onRecordingComplete(blob);
      if (onSendToTrack) {
        try {
          const ab = await blob.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          onSendToTrack(buf, `Vocal Take ${new Date().toLocaleTimeString()}`);
        } catch (e) { console.error(e); }
      }
    };

    recorderRef.current = rec;
    rec.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    recTimerRef.current = setInterval(() => setRecordingTime(t => t + 0.1), 100);
  }, [hasStream, connectStream, getCtx, onRecordingComplete, onSendToTrack]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setIsRecording(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE FX BRIDGE — exports VP settings to RecordingStudio track format
  // ═══════════════════════════════════════════════════════════════════════════
  const exportToConsoleFx = useCallback(() => ({
    eq: {
      lowGain: 0,
      midGain: eqPresenceGain,
      midFreq: eqPresenceFreq,
      highGain: eqAirGain,
      enabled: eqPresenceGain !== 0 || eqAirGain !== 0 || eqHighpass > 40,
    },
    compressor: {
      threshold: compThreshold,
      ratio: compRatio,
      attack: compAttack / 1000,
      release: compRelease / 1000,
      knee: 6,
      enabled: true,
    },
    reverb: {
      mix: reverbMix,
      decay: reverbDecay,
      enabled: reverbMix > 0,
    },
    gate: {
      threshold: gateThreshold,
      attack: gateAttack / 1000,
      release: gateRelease / 1000,
      enabled: gateEnabled,
    },
    deesser: {
      frequency: deesserFreq,
      threshold: deesserThreshold,
      ratio: 8,
      enabled: deesserEnabled,
    },
    limiter: {
      threshold: limiterThreshold,
      knee: 0,
      ratio: 20,
      attack: 0.001,
      release: limiterRelease / 1000,
      enabled: limiterEnabled,
    },
    filter: {
      type: 'highpass',
      frequency: eqHighpass,
      Q: 0.707,
      enabled: eqHighpass > 40,
    },
    distortion: {
      amount: saturation,
      enabled: saturation > 0,
    },
    chorus: {
      rate: 0.5,
      depth: doublerDelay / 1000,
      mix: doublerMix,
      enabled: doublerEnabled,
    },
  }), [
    eqPresenceGain, eqPresenceFreq, eqAirGain, eqHighpass,
    compThreshold, compRatio, compAttack, compRelease,
    reverbMix, reverbDecay,
    gateEnabled, gateThreshold, gateAttack, gateRelease,
    deesserEnabled, deesserFreq, deesserThreshold,
    limiterEnabled, limiterThreshold, limiterRelease,
    saturation,
    doublerEnabled, doublerDelay, doublerMix,
  ]);

  // ── Apply Preset ──
  const applyPreset = useCallback((key) => {
    const p = VOCAL_PRESETS[key];
    if (!p) return;
    setSelectedPreset(key);

    if (p.gate) {
      setGateEnabled(p.gate.enabled);
      setGateThreshold(p.gate.threshold);
      setGateAttack(p.gate.attack);
      setGateRelease(p.gate.release);
      setGateRange(p.gate.range);
    }
    if (p.deesser) {
      setDeesserEnabled(p.deesser.enabled);
      setDeesserFreq(p.deesser.frequency);
      setDeesserThreshold(p.deesser.threshold);
      setDeesserReduction(p.deesser.reduction);
    }
    if (p.comp) {
      setCompThreshold(p.comp.threshold);
      setCompRatio(p.comp.ratio);
      setCompAttack(p.comp.attack);
      setCompRelease(p.comp.release);
    }
    if (p.eq) {
      setEqHighpass(p.eq.highpass || 80);
      setEqLowpass(p.eq.lowpass || 20000);
      setEqPresenceFreq(p.eq.presence?.freq || 3500);
      setEqPresenceGain(p.eq.presence?.gain || 0);
      setEqAirFreq(p.eq.air?.freq || 12000);
      setEqAirGain(p.eq.air?.gain || 0);
    }
    if (p.doubler) {
      setDoublerEnabled(p.doubler.enabled);
      setDoublerDetune(p.doubler.detune || 8);
      setDoublerDelay(p.doubler.delay || 25);
      setDoublerMix(p.doubler.mix || 0.3);
    }
    if (p.pitchShift) setPitchShift(p.pitchShift.semitones || 0);
    if (p.reverb) { setReverbMix(p.reverb.mix); setReverbDecay(p.reverb.decay); }
    if (p.limiter) { setLimiterThreshold(p.limiter.threshold); setLimiterRelease(p.limiter.release); }
    if (p.saturation !== undefined) setSaturation(p.saturation);
  }, []);

  // ── AI Analysis ──
  const runAIAnalysis = useCallback(() => {
    const suggestions = [];

    if (dynamicRange > 20) {
      suggestions.push({
        icon: '🎚', title: 'Wide Dynamic Range',
        desc: `${dynamicRange}dB range detected. Increase compression ratio to ${Math.min(8, compRatio + 2).toFixed(1)}:1 or lower threshold by 4dB for more consistent levels.`,
        action: () => { setCompRatio(Math.min(8, compRatio + 2)); setCompThreshold(compThreshold - 4); },
        label: 'Apply',
      });
    } else if (dynamicRange < 6 && dynamicRange > 0) {
      suggestions.push({
        icon: '📊', title: 'Very Compressed',
        desc: `Only ${dynamicRange}dB range. Consider reducing compression ratio to preserve natural dynamics.`,
        action: () => { setCompRatio(Math.max(1.5, compRatio - 1.5)); },
        label: 'Reduce Comp',
      });
    }

    if (sibilanceLevel > 0.25) {
      suggestions.push({
        icon: '🐍', title: 'High Sibilance Detected',
        desc: `S/T sounds are prominent (${Math.round(sibilanceLevel * 100)}% energy). Enable de-esser or increase reduction.`,
        action: () => { setDeesserEnabled(true); setDeesserReduction(Math.min(12, deesserReduction + 3)); },
        label: 'Fix Sibilance',
      });
    }

    if (pitchHistory.length > 20) {
      const recentPitches = pitchHistory.slice(-50);
      const notes = recentPitches.map(p => p.note);
      const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
      const variance = notes.reduce((a, b) => a + (b - mean) ** 2, 0) / notes.length;
      if (variance > 4) {
        suggestions.push({
          icon: '🎯', title: 'Pitch Instability',
          desc: 'Noticeable pitch variation. Consider subtle pitch correction or doubler to mask wavering.',
          action: () => { setDoublerEnabled(true); setDoublerDetune(6); setDoublerMix(0.2); },
          label: 'Add Doubler',
        });
      }
    }

    const avgRms = rmsHistoryRef.current.length > 0
      ? rmsHistoryRef.current.reduce((a, b) => a + b, 0) / rmsHistoryRef.current.length
      : -60;
    if (avgRms < -35) {
      suggestions.push({
        icon: '🔊', title: 'Low Input Level',
        desc: `Average level is ${avgRms.toFixed(1)}dB. Increase input gain or move closer to the mic.`,
        action: () => setInputGain(Math.min(3, inputGain + 0.5)),
        label: 'Boost Gain',
      });
    } else if (avgRms > -6) {
      suggestions.push({
        icon: '⚠️', title: 'Signal Too Hot',
        desc: `Average level near ${avgRms.toFixed(1)}dB — risk of clipping. Reduce input gain.`,
        action: () => setInputGain(Math.max(0.1, inputGain - 0.3)),
        label: 'Reduce Gain',
      });
    }

    if (detectedRange) {
      suggestions.push({
        icon: '🎤', title: `Detected: ${detectedRange.name}`,
        desc: `Range: ${lowestNote !== null ? noteName(lowestNote) : '?'} – ${highestNote !== null ? noteName(highestNote) : '?'}. EQ presence at ${detectedRange.name === 'Bass' || detectedRange.name === 'Baritone' ? '2-4kHz' : '3-6kHz'} will add clarity.`,
        action: null, label: null,
      });
    }

    const quietSamples = rmsHistoryRef.current.filter(v => v < -50);
    if (quietSamples.length > rmsHistoryRef.current.length * 0.4 && !gateEnabled) {
      suggestions.push({
        icon: '🔇', title: 'Background Noise',
        desc: 'Significant silence with noise floor detected. Enable the noise gate to clean up quiet sections.',
        action: () => { setGateEnabled(true); setGateThreshold(-42); },
        label: 'Enable Gate',
      });
    }

    if (!limiterEnabled) {
      suggestions.push({
        icon: '🧱', title: 'No Limiter Active',
        desc: 'Enable the limiter as a safety net to prevent clipping on loud peaks.',
        action: () => { setLimiterEnabled(true); setLimiterThreshold(-1); },
        label: 'Enable Limiter',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        icon: '✅', title: 'Sounding Good!',
        desc: 'No major issues detected. Keep singing/speaking to get more detailed analysis.',
        action: null, label: null,
      });
    }

    setAiSuggestions(suggestions);
    setAnalysisComplete(true);
  }, [dynamicRange, sibilanceLevel, pitchHistory, compRatio, compThreshold, deesserReduction,
      detectedRange, lowestNote, highestNote, gateEnabled, limiterEnabled, inputGain]);

  const resetRange = useCallback(() => {
    setLowestNote(null);
    setHighestNote(null);
    setDetectedRange(null);
    historyRef.current = [];
    rmsHistoryRef.current = [];
    setPitchHistory([]);
    setAiSuggestions([]);
    setAnalysisComplete(false);
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      stopAnalysis();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (streamRef.current && !inputStream) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Format helpers ──
  const fmtDb = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;
  const fmtMs = (v) => `${v.toFixed(0)} ms`;
  const fmtHz = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const toggleFx = (key) => setExpandedFx(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className={`vocal-processor ${isEmbedded ? 'embedded' : ''}`}>
      {/* ── Header ── */}
      <div className="vp-header">
        <div className="vp-header-left">
          <span className="vp-logo">🎤</span>
          <span className="vp-title">VOCAL PROCESSOR</span>
          {isRecording && <span className="vp-rec-badge">● REC {fmtTime(recordingTime)}</span>}
        </div>
        <div className="vp-header-center">
          <div className="vp-pitch-display">
            {currentNote !== null ? (
              <>
                <span className="vp-pitch-note">{noteName(currentNote)}</span>
                <span className={`vp-pitch-cents ${Math.abs(currentCents) < 10 ? 'in-tune' : currentCents > 0 ? 'sharp' : 'flat'}`}>
                  {currentCents > 0 ? '+' : ''}{currentCents}¢
                </span>
                <span className="vp-pitch-freq">{currentPitch.toFixed(1)} Hz</span>
              </>
            ) : (
              <span className="vp-pitch-waiting">—</span>
            )}
          </div>
        </div>
        <div className="vp-header-right">
          {hasStream && fxChainRef.current && (
            <span style={{
              fontSize: '0.55rem', fontWeight: 800, color: '#00ffc8', background: 'rgba(0,255,200,0.1)',
              padding: '2px 8px', borderRadius: 4, marginRight: 8, letterSpacing: 1,
            }}>
              FX LIVE
            </span>
          )}
          <div className="vp-monitor-toggle">
            <button
              className={`vp-btn ${monitorEnabled ? 'active' : ''}`}
              onClick={() => setMonitorEnabled(!monitorEnabled)}
              title="Monitor (hear yourself with FX)"
            >
              🎧 {monitorEnabled ? 'ON' : 'OFF'}
            </button>
            {monitorEnabled && (
              <input type="range" min={0} max={100} value={monitorVolume * 100}
                onChange={e => setMonitorVolume(e.target.value / 100)}
                className="vp-mini-slider" title="Monitor Volume" />
            )}
          </div>
          {!hasStream ? (
            <button className="vp-btn vp-btn-connect" onClick={connectStream}>🎙 Connect Mic</button>
          ) : (
            <>
              <button
                className={`vp-btn ${isRecording ? 'vp-btn-recording' : 'vp-btn-record'}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '⏹ Stop' : '⏺ Record'}
              </button>
              {onApplyToConsole && (
                <button
                  className="vp-btn"
                  style={{ background: '#1a5c3a', color: '#00ffc8', fontSize: '0.65rem', padding: '4px 10px' }}
                  onClick={() => onApplyToConsole(exportToConsoleFx())}
                  title="Copy VP FX settings to Console track effects"
                >
                  ⤴ Apply to Console
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="vp-tabs">
        {[
          { id: 'chain', label: '🔗 FX Chain' },
          { id: 'analyzer', label: '📊 Analyzer' },
          { id: 'presets', label: '🎛 Presets' },
          { id: 'ai', label: '🤖 AI Coach' },
          { id: 'tuner', label: '🎯 Auto-Tune' },
          { id: 'harmony', label: '🎶 Harmony' },
          { id: 'takes', label: '🎙 Takes' },
          { id: 'breaths', label: '💨 Breaths' },
          { id: 'rider', label: '📈 Rider' },
          { id: 'align', label: '⏱ Align' },
        ].map(tab => (
          <button key={tab.id} className={`vp-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="vp-content">

        {/* ════════════════════════════════════════════════════════════════════
            FX CHAIN TAB — Now uses VocalKnob rotary controls
            ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'chain' && (
          <div className="vp-chain">
            {/* Signal Flow Strip */}
            <div className="vp-chain-flow">
              <span className="vp-chain-label">Signal Flow:</span>
              <span className="vp-chain-node">🎙 Input</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${gateEnabled ? 'active' : 'off'}`}>Gate</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${deesserEnabled ? 'active' : 'off'}`}>De-Ess</span>
              <span className="vp-chain-arrow">→</span>
              <span className="vp-chain-node active">Comp</span>
              <span className="vp-chain-arrow">→</span>
              <span className="vp-chain-node active">EQ</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${saturation > 0 ? 'active' : 'off'}`}>Sat</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${doublerEnabled ? 'active' : 'off'}`}>Double</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${pitchShift !== 0 ? 'active' : 'off'}`}>Pitch</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${reverbMix > 0 ? 'active' : 'off'}`}>Reverb</span>
              <span className="vp-chain-arrow">→</span>
              <span className={`vp-chain-node ${limiterEnabled ? 'active' : 'off'}`}>Limit</span>
              <span className="vp-chain-arrow">→</span>
              <span className="vp-chain-node">🔊 Out</span>
            </div>

            <div className="vp-chain-scroll">

              {/* ── Input Gain ── */}
              <div className="vp-fx-block">
                <div className="vp-fx-header">
                  <span className="vp-fx-icon">🎙</span>
                  <span className="vp-fx-name">Input Gain</span>
                  <span className="vp-fx-value">{(inputGain * 100).toFixed(0)}%</span>
                </div>
                <div className="vp-fx-controls">
                  <div style={knobRowStyle}>
                    <VocalKnob
                      label="Gain"
                      value={inputGain * 100}
                      min={0} max={300} step={1}
                      onChange={(v) => setInputGain(v / 100)}
                      formatValue={(v) => `${Math.round(v)}%`}
                      size="large"
                      color="#00d4ff"
                      showScale
                    />
                  </div>
                </div>
              </div>

              {/* ── Noise Gate ── */}
              <div className={`vp-fx-block ${gateEnabled ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('gate')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setGateEnabled(!gateEnabled); }}>
                    {gateEnabled ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🚪</span>
                  <span className="vp-fx-name">Noise Gate</span>
                  {gateReduction < -1 && <span className="vp-fx-reduction">GR: {gateReduction.toFixed(0)}dB</span>}
                </div>
                {expandedFx.gate && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Threshold"
                        value={gateThreshold}
                        min={-80} max={-10} step={1}
                        onChange={setGateThreshold}
                        formatValue={(v) => `${v.toFixed(0)} dB`}
                        size="medium"
                        color="#ff8c00"
                        showScale
                      />
                      <VocalKnob
                        label="Attack"
                        value={gateAttack}
                        min={0.1} max={10} step={0.1}
                        onChange={setGateAttack}
                        formatValue={(v) => `${v.toFixed(1)} ms`}
                        size="small"
                        color="#ff8c00"
                      />
                      <VocalKnob
                        label="Release"
                        value={gateRelease}
                        min={5} max={500} step={1}
                        onChange={setGateRelease}
                        formatValue={(v) => `${Math.round(v)} ms`}
                        size="small"
                        color="#ff8c00"
                      />
                      <VocalKnob
                        label="Range"
                        value={gateRange}
                        min={-100} max={0} step={1}
                        onChange={setGateRange}
                        formatValue={(v) => `${v.toFixed(0)} dB`}
                        size="small"
                        color="#ff8c00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── De-Esser ── */}
              <div className={`vp-fx-block ${deesserEnabled ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('deesser')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setDeesserEnabled(!deesserEnabled); }}>
                    {deesserEnabled ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🐍</span>
                  <span className="vp-fx-name">De-Esser</span>
                  {sibilanceLevel > 0.15 && <span className="vp-fx-warning">⚠ {Math.round(sibilanceLevel * 100)}%</span>}
                </div>
                {expandedFx.deesser && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Frequency"
                        value={deesserFreq}
                        min={3000} max={12000} step={100}
                        onChange={setDeesserFreq}
                        formatValue={(v) => `${fmtHz(v)} Hz`}
                        size="medium"
                        color="#ffaa00"
                        showScale
                      />
                      <VocalKnob
                        label="Threshold"
                        value={deesserThreshold}
                        min={-40} max={0} step={1}
                        onChange={setDeesserThreshold}
                        formatValue={(v) => `${v.toFixed(0)} dB`}
                        size="medium"
                        color="#ffaa00"
                        showScale
                      />
                      <VocalKnob
                        label="Reduction"
                        value={deesserReduction}
                        min={0} max={20} step={1}
                        onChange={setDeesserReduction}
                        formatValue={(v) => `${Math.round(v)} dB`}
                        size="medium"
                        color="#ffaa00"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Compressor ── */}
              <div className="vp-fx-block enabled">
                <div className="vp-fx-header" onClick={() => toggleFx('comp')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">🗜</span>
                  <span className="vp-fx-name">Compressor</span>
                  <span className="vp-fx-value">{compRatio}:1</span>
                  {compGainReduction < -0.5 && (
                    <span style={{ marginLeft: 8, fontSize: '0.6rem', color: '#ff8c00', fontFamily: 'monospace' }}>
                      GR: {compGainReduction.toFixed(1)} dB
                    </span>
                  )}
                </div>
                {expandedFx.comp && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Threshold"
                        value={compThreshold}
                        min={-60} max={0} step={1}
                        onChange={setCompThreshold}
                        formatValue={(v) => `${v.toFixed(0)} dB`}
                        size="medium"
                        color="#00d4ff"
                        showScale
                      />
                      <VocalKnob
                        label="Ratio"
                        value={compRatio}
                        min={1} max={20} step={0.5}
                        onChange={setCompRatio}
                        formatValue={(v) => `${v}:1`}
                        size="medium"
                        color="#00d4ff"
                        showScale
                      />
                      <VocalKnob
                        label="Attack"
                        value={compAttack}
                        min={0.1} max={100} step={0.1}
                        onChange={setCompAttack}
                        formatValue={(v) => `${v.toFixed(1)} ms`}
                        size="small"
                        color="#00d4ff"
                      />
                      <VocalKnob
                        label="Release"
                        value={compRelease}
                        min={10} max={1000} step={1}
                        onChange={setCompRelease}
                        formatValue={(v) => `${Math.round(v)} ms`}
                        size="small"
                        color="#00d4ff"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── EQ ── */}
              <div className="vp-fx-block enabled">
                <div className="vp-fx-header" onClick={() => toggleFx('eq')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">📊</span>
                  <span className="vp-fx-name">Vocal EQ</span>
                </div>
                {expandedFx.eq && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="High-Pass"
                        value={eqHighpass}
                        min={20} max={400} step={1}
                        onChange={setEqHighpass}
                        formatValue={(v) => `${Math.round(v)} Hz`}
                        size="medium"
                        color="#ff6b35"
                        showScale
                      />
                      {eqLowpass < 20000 && (
                        <VocalKnob
                          label="Low-Pass"
                          value={eqLowpass}
                          min={2000} max={20000} step={100}
                          onChange={setEqLowpass}
                          formatValue={(v) => `${fmtHz(v)} Hz`}
                          size="medium"
                          color="#ff6b35"
                          showScale
                        />
                      )}
                      <VocalKnob
                        label={`Presence`}
                        value={eqPresenceGain}
                        min={-12} max={12} step={0.5}
                        onChange={setEqPresenceGain}
                        formatValue={(v) => `${v > 0 ? '+' : ''}${v} dB`}
                        size="medium"
                        color="#33cc55"
                        showScale
                      />
                      <VocalKnob
                        label="Air"
                        value={eqAirGain}
                        min={-12} max={12} step={0.5}
                        onChange={setEqAirGain}
                        formatValue={(v) => `${v > 0 ? '+' : ''}${v} dB`}
                        size="medium"
                        color="#33cc55"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Saturation ── */}
              <div className={`vp-fx-block ${saturation > 0 ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('saturation')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setSaturation(saturation > 0 ? 0 : 15); }}>
                    {saturation > 0 ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🔥</span>
                  <span className="vp-fx-name">Saturation</span>
                  <span className="vp-fx-value">{saturation}%</span>
                </div>
                {expandedFx.saturation && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Amount"
                        value={saturation}
                        min={0} max={100} step={1}
                        onChange={setSaturation}
                        formatValue={(v) => `${Math.round(v)}%`}
                        size="large"
                        color="#ff3333"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Vocal Doubler ── */}
              <div className={`vp-fx-block ${doublerEnabled ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('doubler')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setDoublerEnabled(!doublerEnabled); }}>
                    {doublerEnabled ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">👥</span>
                  <span className="vp-fx-name">Vocal Doubler</span>
                </div>
                {expandedFx.doubler && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Detune"
                        value={doublerDetune}
                        min={1} max={30} step={1}
                        onChange={setDoublerDetune}
                        formatValue={(v) => `${Math.round(v)}¢`}
                        size="medium"
                        color="#aa55ff"
                        showScale
                      />
                      <VocalKnob
                        label="Delay"
                        value={doublerDelay}
                        min={5} max={80} step={1}
                        onChange={setDoublerDelay}
                        formatValue={(v) => `${Math.round(v)} ms`}
                        size="medium"
                        color="#aa55ff"
                        showScale
                      />
                      <VocalKnob
                        label="Mix"
                        value={doublerMix * 100}
                        min={0} max={100} step={1}
                        onChange={(v) => setDoublerMix(v / 100)}
                        formatValue={(v) => `${Math.round(v)}%`}
                        size="medium"
                        color="#aa55ff"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Pitch Shift ── */}
              <div className={`vp-fx-block ${pitchShift !== 0 ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('pitch')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setPitchShift(0); }}>
                    {pitchShift !== 0 ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🎵</span>
                  <span className="vp-fx-name">Pitch Shift</span>
                  {pitchShift !== 0 && <span className="vp-fx-value">{pitchShift > 0 ? '+' : ''}{pitchShift}st</span>}
                </div>
                {expandedFx.pitch && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Semitones"
                        value={pitchShift}
                        min={-12} max={12} step={1}
                        onChange={setPitchShift}
                        formatValue={(v) => `${v > 0 ? '+' : ''}${v}st`}
                        size="large"
                        color="#00ffc8"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Reverb ── */}
              <div className={`vp-fx-block ${reverbMix > 0 ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('reverb')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">🏛</span>
                  <span className="vp-fx-name">Reverb</span>
                  <span className="vp-fx-value">{Math.round(reverbMix * 100)}%</span>
                </div>
                {expandedFx.reverb && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Mix"
                        value={reverbMix * 100}
                        min={0} max={100} step={1}
                        onChange={(v) => setReverbMix(v / 100)}
                        formatValue={(v) => `${Math.round(v)}%`}
                        size="medium"
                        color="#00d4ff"
                        showScale
                      />
                      <VocalKnob
                        label="Decay"
                        value={reverbDecay}
                        min={0.1} max={8} step={0.1}
                        onChange={setReverbDecay}
                        formatValue={(v) => `${v.toFixed(1)}s`}
                        size="medium"
                        color="#00d4ff"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Limiter ── */}
              <div className={`vp-fx-block ${limiterEnabled ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('limiter')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setLimiterEnabled(!limiterEnabled); }}>
                    {limiterEnabled ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🧱</span>
                  <span className="vp-fx-name">Limiter</span>
                  <span className="vp-fx-value">{fmtDb(limiterThreshold)}</span>
                </div>
                {expandedFx.limiter && (
                  <div className="vp-fx-controls">
                    <div style={knobRowStyle}>
                      <VocalKnob
                        label="Ceiling"
                        value={limiterThreshold}
                        min={-12} max={0} step={0.1}
                        onChange={setLimiterThreshold}
                        formatValue={(v) => `${v.toFixed(1)} dB`}
                        size="medium"
                        color="#ff3333"
                        showScale
                      />
                      <VocalKnob
                        label="Release"
                        value={limiterRelease}
                        min={10} max={500} step={1}
                        onChange={setLimiterRelease}
                        formatValue={(v) => `${Math.round(v)} ms`}
                        size="medium"
                        color="#ff3333"
                        showScale
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ════ ANALYZER TAB ════ */}
        {activeTab === 'analyzer' && (
          <div className="vp-analyzer">
            <div className="vp-analyzer-row">
              <div className="vp-analyzer-pitch">
                <div className="vp-analyzer-section-label">Pitch Tracking</div>
                <canvas ref={pitchCanvasRef} className="vp-pitch-canvas" width={600} height={180} />
              </div>
              <div className="vp-analyzer-meter">
                <canvas ref={meterCanvasRef} className="vp-meter-canvas" width={36} height={180} />
              </div>
            </div>

            <div className="vp-analyzer-stats">
              <div className="vp-stat">
                <span className="vp-stat-label">Current</span>
                <span className="vp-stat-value">
                  {currentNote !== null ? `${noteName(currentNote)} (${currentPitch.toFixed(1)}Hz)` : '—'}
                </span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-label">Range</span>
                <span className="vp-stat-value">
                  {lowestNote !== null && highestNote !== null
                    ? `${noteName(lowestNote)} – ${noteName(highestNote)} (${highestNote - lowestNote} semitones)`
                    : '— Sing to detect —'}
                </span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-label">Voice Type</span>
                <span className="vp-stat-value" style={{ color: detectedRange?.color || '#888' }}>
                  {detectedRange?.name || 'Detecting...'}
                </span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-label">Level</span>
                <span className="vp-stat-value">{currentRMS.toFixed(1)} dB RMS</span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-label">Dynamic Range</span>
                <span className="vp-stat-value">{dynamicRange > 0 ? `${dynamicRange} dB` : '—'}</span>
              </div>
              <div className="vp-stat">
                <span className="vp-stat-label">Sibilance</span>
                <span className={`vp-stat-value ${sibilanceLevel > 0.25 ? 'vp-warn' : ''}`}>
                  {Math.round(sibilanceLevel * 100)}%
                  {sibilanceLevel > 0.25 ? ' ⚠ High' : sibilanceLevel > 0.15 ? ' ⚡ Moderate' : ' ✓ OK'}
                </span>
              </div>
            </div>

            <div className="vp-analyzer-actions">
              <button className="vp-btn" onClick={resetRange}>🔄 Reset Tracking</button>
              <button className="vp-btn" onClick={() => { setActiveTab('ai'); runAIAnalysis(); }}>🤖 Get AI Suggestions</button>
            </div>

            <div className="vp-range-chart">
              <div className="vp-analyzer-section-label">Vocal Range Reference</div>
              <div className="vp-range-bars">
                {VOCAL_RANGES.map(range => {
                  const isDetected = detectedRange?.name === range.name;
                  return (
                    <div key={range.name} className={`vp-range-bar ${isDetected ? 'detected' : ''}`}>
                      <span className="vp-range-name" style={{ color: range.color }}>{range.name}</span>
                      <div className="vp-range-line" style={{ background: range.color + '40', borderColor: isDetected ? range.color : 'transparent' }}>
                        <span className="vp-range-notes">
                          {noteName(noteFromFreq(range.low))} – {noteName(noteFromFreq(range.high))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ PRESETS TAB ════ */}
        {activeTab === 'presets' && (
          <div className="vp-presets">
            <div className="vp-presets-grid">
              {Object.entries(VOCAL_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`vp-preset-card ${selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => applyPreset(key)}
                >
                  <span className="vp-preset-name">{preset.name}</span>
                  <span className="vp-preset-desc">{preset.desc}</span>
                  <div className="vp-preset-chain">
                    {preset.gate?.enabled && <span className="vp-preset-tag">Gate</span>}
                    {preset.deesser?.enabled && <span className="vp-preset-tag">De-Ess</span>}
                    <span className="vp-preset-tag">Comp {preset.comp.ratio}:1</span>
                    <span className="vp-preset-tag">EQ HP{preset.eq.highpass}</span>
                    {preset.doubler?.enabled && <span className="vp-preset-tag">Double</span>}
                    {preset.reverb.mix > 0 && <span className="vp-preset-tag">Verb {Math.round(preset.reverb.mix * 100)}%</span>}
                    <span className="vp-preset-tag">Limit {preset.limiter.threshold}dB</span>
                    {preset.saturation > 0 && <span className="vp-preset-tag">Sat {preset.saturation}%</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ════ AI COACH TAB ════ */}
        {activeTab === 'ai' && (
          <div className="vp-ai">
            <div className="vp-ai-header">
              <span className="vp-ai-title">🤖 AI Vocal Coach</span>
              <button className="vp-btn" onClick={runAIAnalysis}>
                {analysisComplete ? '🔄 Re-Analyze' : '▶ Analyze My Voice'}
              </button>
            </div>
            <p className="vp-ai-hint">
              Sing or speak for 10-15 seconds, then click Analyze. The AI coach examines your pitch stability,
              dynamic range, sibilance levels, and noise floor to suggest processing adjustments.
            </p>

            {aiSuggestions.length > 0 && (
              <div className="vp-ai-suggestions">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="vp-ai-card">
                    <div className="vp-ai-card-header">
                      <span className="vp-ai-card-icon">{s.icon}</span>
                      <span className="vp-ai-card-title">{s.title}</span>
                    </div>
                    <p className="vp-ai-card-desc">{s.desc}</p>
                    {s.action && (
                      <button className="vp-btn vp-btn-apply" onClick={s.action}>{s.label}</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ AUTO-TUNE TAB ════ */}
        {activeTab === 'tuner' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VocalTuner
              audioContext={getCtx()}
              audioBuffer={selectedBuffer}
              onProcessed={(correctedBuf) => {
                if (onSendToTrack) onSendToTrack(correctedBuf, `Tuned Vocal`);
              }}
            />
          </div>
        )}

        {/* ════ HARMONY GENERATOR TAB ════ */}
        {activeTab === 'harmony' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <HarmonyGenerator
              audioContext={getCtx()}
              audioBuffer={selectedBuffer}
              onHarmonyCreated={(voices) => {
                voices.forEach((v, i) => {
                  if (onSendToTrack) onSendToTrack(v.buffer, v.name);
                });
              }}
            />
          </div>
        )}

        {/* ════ TAKE LANES TAB ════ */}
        {activeTab === 'takes' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <TakeLanes
              audioContext={getCtx()}
              bpm={bpm}
              onCompositeReady={(compBuffer, name) => {
                if (onSendToTrack) onSendToTrack(compBuffer, name);
              }}
            />
          </div>
        )}

        {/* ════ BREATH REMOVER TAB ════ */}
        {activeTab === 'breaths' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <BreathRemover
              audioContext={getCtx()}
              audioBuffer={selectedBuffer}
              onProcessed={(cleanBuf) => {
                if (onSendToTrack) onSendToTrack(cleanBuf, `Vocal (breaths removed)`);
              }}
            />
          </div>
        )}

        {/* ════ VOCAL RIDER TAB ════ */}
        {activeTab === 'rider' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VocalRider
              audioContext={getCtx()}
              audioBuffer={selectedBuffer}
              onProcessed={(riddenBuf) => {
                if (onSendToTrack) onSendToTrack(riddenBuf, `Vocal (leveled)`);
              }}
            />
          </div>
        )}

        {/* ════ VOCAL ALIGNMENT TAB ════ */}
        {activeTab === 'align' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VocalAlignment
              audioContext={getCtx()}
              audioBuffer={selectedBuffer}
              bpm={bpm}
              onProcessed={(alignedBuf) => {
                if (onSendToTrack) onSendToTrack(alignedBuf, `Vocal (aligned)`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default VocalProcessor;