// =============================================================================
// VocalProcessor.js — Vocal Production Suite for StreamPireX Recording Studio
// =============================================================================
// 10 tabs: FX Chain, Analyzer, Presets, AI Coach, Auto-Tune, Harmony Generator,
// Take Lanes (comping), Breath Remover, Vocal Rider, Vocal Alignment.
// Sub-components: VocalTuner, HarmonyGenerator, TakeLanes, BreathRemover,
//                 VocalRider, VocalAlignment
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import VocalTuner from './VocalTuner';
import HarmonyGenerator from './HarmonyGenerator';
import TakeLanes from './TakeLanes';
import BreathRemover from './BreathRemover';
import VocalRider from './VocalRider';
import VocalAlignment from './VocalAlignment';

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
  if (rms < 0.01) return -1; // too quiet

  let lastCorrelation = 1;
  const minPeriod = Math.floor(sampleRate / 1100); // ~1100Hz max
  const maxPeriod = Math.floor(sampleRate / 60);    // ~60Hz min

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

const VocalProcessor = ({
  audioContext: externalCtx,
  inputStream,           // MediaStream from mic
  isEmbedded = false,
  onRecordingComplete,   // (blob) => void
  onSendToTrack,         // (audioBuffer, name) => void
  tracks,                // current DAW tracks for reference
  selectedTrackIndex,
  bpm = 120,             // project BPM for alignment
}) => {
  // ── FX State ──
  const [gateEnabled, setGateEnabled] = useState(true);
  const [gateThreshold, setGateThreshold] = useState(-45);  // dB
  const [gateAttack, setGateAttack] = useState(0.5);        // ms
  const [gateRelease, setGateRelease] = useState(50);       // ms
  const [gateRange, setGateRange] = useState(-80);           // dB

  const [deesserEnabled, setDeesserEnabled] = useState(true);
  const [deesserFreq, setDeesserFreq] = useState(6500);     // Hz
  const [deesserThreshold, setDeesserThreshold] = useState(-25); // dB
  const [deesserReduction, setDeesserReduction] = useState(6);   // dB

  const [compThreshold, setCompThreshold] = useState(-18);
  const [compRatio, setCompRatio] = useState(3.5);
  const [compAttack, setCompAttack] = useState(8);           // ms
  const [compRelease, setCompRelease] = useState(120);       // ms

  const [eqHighpass, setEqHighpass] = useState(80);          // Hz
  const [eqLowpass, setEqLowpass] = useState(20000);
  const [eqPresenceFreq, setEqPresenceFreq] = useState(3500);
  const [eqPresenceGain, setEqPresenceGain] = useState(3);
  const [eqAirFreq, setEqAirFreq] = useState(12000);
  const [eqAirGain, setEqAirGain] = useState(2);

  const [doublerEnabled, setDoublerEnabled] = useState(false);
  const [doublerDetune, setDoublerDetune] = useState(8);     // cents
  const [doublerDelay, setDoublerDelay] = useState(25);      // ms
  const [doublerMix, setDoublerMix] = useState(0.3);

  const [pitchShift, setPitchShift] = useState(0);           // semitones

  const [reverbMix, setReverbMix] = useState(0.12);
  const [reverbDecay, setReverbDecay] = useState(1.4);

  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [limiterThreshold, setLimiterThreshold] = useState(-1); // dB
  const [limiterRelease, setLimiterRelease] = useState(50);     // ms

  const [saturation, setSaturation] = useState(0);           // 0-100

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
  const [activeTab, setActiveTab] = useState('chain');       // chain | analyzer | presets | ai | tuner | harmony | takes | breaths | rider | align

  // ── Selected track audio buffer (for offline processing tools) ──
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

  // ── Audio Context ──
  const getCtx = useCallback(() => {
    if (externalCtx) return externalCtx;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [externalCtx]);

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

    // Input gain
    const inGain = ctx.createGain();
    inGain.gain.value = inputGain;
    inputGainRef.current = inGain;
    source.connect(inGain);

    // Analyser for pitch/level detection
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;
    analyserBufRef.current = new Float32Array(analyser.fftSize);
    inGain.connect(analyser);

    // Monitor output (dry or with FX — simplified for now as dry)
    const monGain = ctx.createGain();
    monGain.gain.value = monitorEnabled ? monitorVolume : 0;
    monitorGainRef.current = monGain;
    inGain.connect(monGain);
    monGain.connect(ctx.destination);

    setHasStream(true);
    startAnalysis();
  }, [getCtx, inputStream, inputGain, monitorEnabled, monitorVolume]);

  // ── Update monitor gain in real-time ──
  useEffect(() => {
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = monitorEnabled ? monitorVolume : 0;
    }
  }, [monitorEnabled, monitorVolume]);

  useEffect(() => {
    if (inputGainRef.current) inputGainRef.current.gain.value = inputGain;
  }, [inputGain]);

  // ── Auto-connect when stream prop changes ──
  useEffect(() => {
    if (inputStream) connectStream();
    return () => stopAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputStream]);

  // ── Analysis loop ──
  const startAnalysis = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const analyze = () => {
      const analyser = analyserRef.current;
      const buf = analyserBufRef.current;
      if (!analyser || !buf) return;

      // Time domain for pitch
      analyser.getFloatTimeDomainData(buf);
      const ctx = getCtx();
      const freq = detectPitch(buf, ctx.sampleRate);

      // RMS level
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
      setCurrentRMS(rmsDb);

      rmsHistoryRef.current.push(rmsDb);
      if (rmsHistoryRef.current.length > 500) rmsHistoryRef.current.shift();

      // Dynamic range calculation
      const validRms = rmsHistoryRef.current.filter(v => v > -60);
      if (validRms.length > 10) {
        const sorted = [...validRms].sort((a, b) => a - b);
        const low = sorted[Math.floor(sorted.length * 0.1)];
        const high = sorted[Math.floor(sorted.length * 0.9)];
        setDynamicRange(Math.round(high - low));
      }

      // Sibilance detection (energy in 4-10kHz band)
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

      // Gate simulation — check if signal is below threshold
      if (rmsDb < gateThreshold) {
        setGateReduction(Math.min(0, gateRange - rmsDb));
      } else {
        setGateReduction(0);
      }

      // Pitch tracking
      if (freq > 0) {
        setCurrentPitch(freq);
        const note = noteFromFreq(freq);
        setCurrentNote(note);
        setCurrentCents(centsOff(freq, note));

        // Track range
        historyRef.current.push(note);
        if (historyRef.current.length > 2000) historyRef.current.shift();

        if (lowestNote === null || note < lowestNote) setLowestNote(note);
        if (highestNote === null || note > highestNote) setHighestNote(note);

        // Detect vocal range
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

        // Pitch history for graph
        setPitchHistory(prev => {
          const next = [...prev, { freq, note, time: Date.now() }];
          if (next.length > 200) next.shift();
          return next;
        });
      } else {
        setCurrentPitch(-1);
        setCurrentNote(null);
      }

      // Draw pitch canvas
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

    // Background
    ctx.fillStyle = '#080e14';
    ctx.fillRect(0, 0, w, h);

    // Note grid lines
    if (history.length > 0) {
      const notes = history.map(p => p.note);
      const minNote = Math.min(...notes) - 2;
      const maxNote = Math.max(...notes) + 2;
      const range = Math.max(maxNote - minNote, 12);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let n = minNote; n <= maxNote; n++) {
        const y = h - ((n - minNote) / range) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        // Note label
        if (n % 12 === 0 || n % 12 === 4 || n % 12 === 7) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.font = '8px monospace';
          ctx.fillText(noteName(n), 2, y - 2);
        }
      }

      // Pitch line
      ctx.beginPath();
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffc8';
      ctx.shadowBlur = 4;
      history.forEach((p, i) => {
        const x = (i / Math.max(history.length - 1, 1)) * w;
        const y = h - ((p.note - minNote) / range) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current position dot
      if (history.length > 0) {
        const last = history[history.length - 1];
        const x = w - 2;
        const y = h - ((last.note - minNote) / range) * h;
        ctx.fillStyle = '#00ffc8';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
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

    // Level bar
    const level = Math.max(0, Math.min(1, (rmsDb + 60) / 60));
    const barH = level * h;
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#00ffc8');
    grad.addColorStop(0.6, '#00ffc8');
    grad.addColorStop(0.8, '#ffcc00');
    grad.addColorStop(0.95, '#ff3b30');
    ctx.fillStyle = grad;
    ctx.fillRect(2, h - barH, 14, barH);

    // Gate threshold marker
    const gateY = h - ((gateThreshold + 60) / 60) * h;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, gateY);
    ctx.lineTo(18, gateY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sibilance bar
    const sibilH = sibilRatio * h * 3;
    ctx.fillStyle = sibilRatio > 0.3 ? '#ff3b30' : sibilRatio > 0.15 ? '#ffcc00' : 'rgba(0,255,200,0.3)';
    ctx.fillRect(22, h - sibilH, 10, sibilH);

    // Labels
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

    // Dynamic range
    if (dynamicRange > 20) {
      suggestions.push({
        icon: '🎚',
        title: 'Wide Dynamic Range',
        desc: `${dynamicRange}dB range detected. Increase compression ratio to ${Math.min(8, compRatio + 2).toFixed(1)}:1 or lower threshold by 4dB for more consistent levels.`,
        action: () => { setCompRatio(Math.min(8, compRatio + 2)); setCompThreshold(compThreshold - 4); },
        label: 'Apply',
      });
    } else if (dynamicRange < 6 && dynamicRange > 0) {
      suggestions.push({
        icon: '📊',
        title: 'Very Compressed',
        desc: `Only ${dynamicRange}dB range. Consider reducing compression ratio to preserve natural dynamics.`,
        action: () => { setCompRatio(Math.max(1.5, compRatio - 1.5)); },
        label: 'Reduce Comp',
      });
    }

    // Sibilance
    if (sibilanceLevel > 0.25) {
      suggestions.push({
        icon: '🐍',
        title: 'High Sibilance Detected',
        desc: `S/T sounds are prominent (${Math.round(sibilanceLevel * 100)}% energy). Enable de-esser or increase reduction.`,
        action: () => { setDeesserEnabled(true); setDeesserReduction(Math.min(12, deesserReduction + 3)); },
        label: 'Fix Sibilance',
      });
    }

    // Pitch stability
    if (pitchHistory.length > 20) {
      const recentPitches = pitchHistory.slice(-50);
      const notes = recentPitches.map(p => p.note);
      const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
      const variance = notes.reduce((a, b) => a + (b - mean) ** 2, 0) / notes.length;
      if (variance > 4) {
        suggestions.push({
          icon: '🎯',
          title: 'Pitch Instability',
          desc: 'Noticeable pitch variation. Consider subtle pitch correction or doubler to mask wavering.',
          action: () => { setDoublerEnabled(true); setDoublerDetune(6); setDoublerMix(0.2); },
          label: 'Add Doubler',
        });
      }
    }

    // Level
    const avgRms = rmsHistoryRef.current.length > 0
      ? rmsHistoryRef.current.reduce((a, b) => a + b, 0) / rmsHistoryRef.current.length
      : -60;
    if (avgRms < -35) {
      suggestions.push({
        icon: '🔊',
        title: 'Low Input Level',
        desc: `Average level is ${avgRms.toFixed(1)}dB. Increase input gain or move closer to the mic.`,
        action: () => setInputGain(Math.min(3, inputGain + 0.5)),
        label: 'Boost Gain',
      });
    } else if (avgRms > -6) {
      suggestions.push({
        icon: '⚠️',
        title: 'Signal Too Hot',
        desc: `Average level near ${avgRms.toFixed(1)}dB — risk of clipping. Reduce input gain.`,
        action: () => setInputGain(Math.max(0.1, inputGain - 0.3)),
        label: 'Reduce Gain',
      });
    }

    // Vocal range suggestion
    if (detectedRange) {
      suggestions.push({
        icon: '🎤',
        title: `Detected: ${detectedRange.name}`,
        desc: `Range: ${lowestNote !== null ? noteName(lowestNote) : '?'} – ${highestNote !== null ? noteName(highestNote) : '?'}. EQ presence at ${detectedRange.name === 'Bass' || detectedRange.name === 'Baritone' ? '2-4kHz' : '3-6kHz'} will add clarity.`,
        action: null,
        label: null,
      });
    }

    // Noise floor
    const quietSamples = rmsHistoryRef.current.filter(v => v < -50);
    if (quietSamples.length > rmsHistoryRef.current.length * 0.4 && !gateEnabled) {
      suggestions.push({
        icon: '🔇',
        title: 'Background Noise',
        desc: 'Significant silence with noise floor detected. Enable the noise gate to clean up quiet sections.',
        action: () => { setGateEnabled(true); setGateThreshold(-42); },
        label: 'Enable Gate',
      });
    }

    // Limiter check
    if (!limiterEnabled) {
      suggestions.push({
        icon: '🧱',
        title: 'No Limiter Active',
        desc: 'Enable the limiter as a safety net to prevent clipping on loud peaks.',
        action: () => { setLimiterEnabled(true); setLimiterThreshold(-1); },
        label: 'Enable Limiter',
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        icon: '✅',
        title: 'Sounding Good!',
        desc: 'No major issues detected. Keep singing/speaking to get more detailed analysis.',
        action: null,
        label: null,
      });
    }

    setAiSuggestions(suggestions);
    setAnalysisComplete(true);
  }, [dynamicRange, sibilanceLevel, pitchHistory, compRatio, compThreshold, deesserReduction,
      detectedRange, lowestNote, highestNote, gateEnabled, limiterEnabled, inputGain]);

  // ── Reset range tracking ──
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

  // ── FX block toggle helper ──
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
          {/* Pitch Display */}
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
            <button
              className={`vp-btn ${isRecording ? 'vp-btn-recording' : 'vp-btn-record'}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? '⏹ Stop' : '⏺ Record'}
            </button>
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

        {/* ════ FX CHAIN TAB ════ */}
        {activeTab === 'chain' && (
          <div className="vp-chain">
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
              {/* Input Gain */}
              <div className="vp-fx-block">
                <div className="vp-fx-header" onClick={() => toggleFx('input')}>
                  <span className="vp-fx-icon">🎙</span>
                  <span className="vp-fx-name">Input Gain</span>
                  <span className="vp-fx-value">{(inputGain * 100).toFixed(0)}%</span>
                </div>
                <div className="vp-fx-controls">
                  <div className="vp-param">
                    <label>Gain</label>
                    <input type="range" min={0} max={300} value={inputGain * 100}
                      onChange={e => setInputGain(e.target.value / 100)} className="vp-slider" />
                    <span>{(inputGain * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Noise Gate */}
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
                    <div className="vp-param">
                      <label>Threshold</label>
                      <input type="range" min={-80} max={-10} value={gateThreshold}
                        onChange={e => setGateThreshold(+e.target.value)} className="vp-slider" />
                      <span>{fmtDb(gateThreshold)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Attack</label>
                      <input type="range" min={0.1} max={10} step={0.1} value={gateAttack}
                        onChange={e => setGateAttack(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(gateAttack)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Release</label>
                      <input type="range" min={5} max={500} value={gateRelease}
                        onChange={e => setGateRelease(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(gateRelease)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Range</label>
                      <input type="range" min={-100} max={0} value={gateRange}
                        onChange={e => setGateRange(+e.target.value)} className="vp-slider" />
                      <span>{fmtDb(gateRange)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* De-Esser */}
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
                    <div className="vp-param">
                      <label>Frequency</label>
                      <input type="range" min={3000} max={12000} value={deesserFreq}
                        onChange={e => setDeesserFreq(+e.target.value)} className="vp-slider" />
                      <span>{fmtHz(deesserFreq)} Hz</span>
                    </div>
                    <div className="vp-param">
                      <label>Threshold</label>
                      <input type="range" min={-40} max={0} value={deesserThreshold}
                        onChange={e => setDeesserThreshold(+e.target.value)} className="vp-slider" />
                      <span>{fmtDb(deesserThreshold)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Reduction</label>
                      <input type="range" min={0} max={20} value={deesserReduction}
                        onChange={e => setDeesserReduction(+e.target.value)} className="vp-slider" />
                      <span>{deesserReduction} dB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Compressor */}
              <div className="vp-fx-block enabled">
                <div className="vp-fx-header" onClick={() => toggleFx('comp')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">🗜</span>
                  <span className="vp-fx-name">Compressor</span>
                  <span className="vp-fx-value">{compRatio}:1</span>
                </div>
                {expandedFx.comp && (
                  <div className="vp-fx-controls">
                    <div className="vp-param">
                      <label>Threshold</label>
                      <input type="range" min={-60} max={0} value={compThreshold}
                        onChange={e => setCompThreshold(+e.target.value)} className="vp-slider" />
                      <span>{fmtDb(compThreshold)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Ratio</label>
                      <input type="range" min={1} max={20} step={0.5} value={compRatio}
                        onChange={e => setCompRatio(+e.target.value)} className="vp-slider" />
                      <span>{compRatio}:1</span>
                    </div>
                    <div className="vp-param">
                      <label>Attack</label>
                      <input type="range" min={0.1} max={100} step={0.1} value={compAttack}
                        onChange={e => setCompAttack(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(compAttack)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Release</label>
                      <input type="range" min={10} max={1000} value={compRelease}
                        onChange={e => setCompRelease(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(compRelease)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* EQ */}
              <div className="vp-fx-block enabled">
                <div className="vp-fx-header" onClick={() => toggleFx('eq')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">📊</span>
                  <span className="vp-fx-name">Vocal EQ</span>
                </div>
                {expandedFx.eq && (
                  <div className="vp-fx-controls">
                    <div className="vp-param">
                      <label>High-Pass</label>
                      <input type="range" min={20} max={400} value={eqHighpass}
                        onChange={e => setEqHighpass(+e.target.value)} className="vp-slider vp-slider-orange" />
                      <span>{eqHighpass} Hz</span>
                    </div>
                    {eqLowpass < 20000 && (
                      <div className="vp-param">
                        <label>Low-Pass</label>
                        <input type="range" min={2000} max={20000} value={eqLowpass}
                          onChange={e => setEqLowpass(+e.target.value)} className="vp-slider vp-slider-orange" />
                        <span>{fmtHz(eqLowpass)} Hz</span>
                      </div>
                    )}
                    <div className="vp-param">
                      <label>Presence ({fmtHz(eqPresenceFreq)})</label>
                      <input type="range" min={-12} max={12} step={0.5} value={eqPresenceGain}
                        onChange={e => setEqPresenceGain(+e.target.value)} className="vp-slider" />
                      <span>{eqPresenceGain > 0 ? '+' : ''}{eqPresenceGain} dB</span>
                    </div>
                    <div className="vp-param">
                      <label>Air ({fmtHz(eqAirFreq)})</label>
                      <input type="range" min={-12} max={12} step={0.5} value={eqAirGain}
                        onChange={e => setEqAirGain(+e.target.value)} className="vp-slider" />
                      <span>{eqAirGain > 0 ? '+' : ''}{eqAirGain} dB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Saturation */}
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
                    <div className="vp-param">
                      <label>Amount</label>
                      <input type="range" min={0} max={100} value={saturation}
                        onChange={e => setSaturation(+e.target.value)} className="vp-slider" />
                      <span>{saturation}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Vocal Doubler */}
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
                    <div className="vp-param">
                      <label>Detune</label>
                      <input type="range" min={1} max={30} value={doublerDetune}
                        onChange={e => setDoublerDetune(+e.target.value)} className="vp-slider" />
                      <span>{doublerDetune}¢</span>
                    </div>
                    <div className="vp-param">
                      <label>Delay</label>
                      <input type="range" min={5} max={80} value={doublerDelay}
                        onChange={e => setDoublerDelay(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(doublerDelay)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Mix</label>
                      <input type="range" min={0} max={100} value={doublerMix * 100}
                        onChange={e => setDoublerMix(e.target.value / 100)} className="vp-slider" />
                      <span>{Math.round(doublerMix * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pitch Shift */}
              <div className={`vp-fx-block ${pitchShift !== 0 ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('pitch')}>
                  <button className="vp-fx-toggle" onClick={e => { e.stopPropagation(); setPitchShift(pitchShift !== 0 ? 0 : 0); }}>
                    {pitchShift !== 0 ? '◉' : '○'}
                  </button>
                  <span className="vp-fx-icon">🎵</span>
                  <span className="vp-fx-name">Pitch Shift</span>
                  {pitchShift !== 0 && <span className="vp-fx-value">{pitchShift > 0 ? '+' : ''}{pitchShift}st</span>}
                </div>
                {expandedFx.pitch && (
                  <div className="vp-fx-controls">
                    <div className="vp-param">
                      <label>Semitones</label>
                      <input type="range" min={-12} max={12} value={pitchShift}
                        onChange={e => setPitchShift(+e.target.value)} className="vp-slider" />
                      <span>{pitchShift > 0 ? '+' : ''}{pitchShift}st</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reverb */}
              <div className={`vp-fx-block ${reverbMix > 0 ? 'enabled' : 'bypassed'}`}>
                <div className="vp-fx-header" onClick={() => toggleFx('reverb')}>
                  <span className="vp-fx-toggle always-on">◉</span>
                  <span className="vp-fx-icon">🏛</span>
                  <span className="vp-fx-name">Reverb</span>
                  <span className="vp-fx-value">{Math.round(reverbMix * 100)}%</span>
                </div>
                {expandedFx.reverb && (
                  <div className="vp-fx-controls">
                    <div className="vp-param">
                      <label>Mix</label>
                      <input type="range" min={0} max={100} value={reverbMix * 100}
                        onChange={e => setReverbMix(e.target.value / 100)} className="vp-slider" />
                      <span>{Math.round(reverbMix * 100)}%</span>
                    </div>
                    <div className="vp-param">
                      <label>Decay</label>
                      <input type="range" min={0.1} max={8} step={0.1} value={reverbDecay}
                        onChange={e => setReverbDecay(+e.target.value)} className="vp-slider" />
                      <span>{reverbDecay.toFixed(1)}s</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Limiter */}
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
                    <div className="vp-param">
                      <label>Ceiling</label>
                      <input type="range" min={-12} max={0} step={0.1} value={limiterThreshold}
                        onChange={e => setLimiterThreshold(+e.target.value)} className="vp-slider" />
                      <span>{fmtDb(limiterThreshold)}</span>
                    </div>
                    <div className="vp-param">
                      <label>Release</label>
                      <input type="range" min={10} max={500} value={limiterRelease}
                        onChange={e => setLimiterRelease(+e.target.value)} className="vp-slider" />
                      <span>{fmtMs(limiterRelease)}</span>
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

            {/* Vocal Range Reference */}
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
                // Send each harmony voice to a new track
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