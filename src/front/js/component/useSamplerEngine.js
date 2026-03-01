// =============================================================================
// useSamplerEngine.js — Core audio engine hook for SamplerBeatMaker
// All state, audio context, pad management, sequencer, transport, effects,
// recording, export logic in one reusable hook
// =============================================================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { detectBPM, detectKey } from './AudioAnalysis';

// ── Constants ──
export const PAD_COUNT = 16;
export const STEP_COUNTS = [8, 16, 32, 64];
export const DEFAULT_BPM = 140;
export const PAD_KEY_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'];
export const CHROMATIC_KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const PAD_COLORS = [
  '#ff4444','#ff6b35','#ffaa00','#ffdd00',
  '#aaff00','#00ff88','#00ddff','#0088ff',
  '#4444ff','#8844ff','#cc44ff','#ff44cc',
  '#ff4488','#ff8888','#88ffaa','#88ddff',
];

export const FORMAT_INFO = {
  wav: { ext: 'wav', label: 'WAV (Lossless)', mime: 'audio/wav' },
  mp3: { ext: 'mp3', label: 'MP3 (Compressed)', mime: 'audio/mpeg' },
  webm: { ext: 'webm', label: 'WebM', mime: 'audio/webm' },
};

export const CHOP_MODES = ['transient', 'bpmgrid', 'equal', 'manual'];

const uid = () => crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const createDefaultPad = (i) => ({
  name: `Pad ${i + 1}`,
  buffer: null,
  volume: 0.8,
  pitch: 0,
  pan: 0,
  attack: 0.005,
  decay: 0.1,
  sustain: 1,
  release: 0.1,
  trimStart: 0,
  trimEnd: 0,
  playMode: 'oneshot',
  programType: 'drum',
  rootNote: 60,
  keyRangeLow: 36,
  keyRangeHigh: 84,
  color: PAD_COLORS[i % PAD_COLORS.length],
  muted: false,
  soloed: false,
  filterOn: false,
  filterType: 'lowpass',
  filterFreq: 2000,
  filterQ: 1,
  distortionOn: false,
  distortionAmt: 0,
  delayOn: false,
  delayTime: 0.3,
  delayFeedback: 0.3,
  delayMix: 0.2,
  reverbOn: false,
  reverbMix: 0.2,
  timeStretch: false,
  originalBpm: 0,
  stretchMode: 'repitch',
  pitchShift: 0,
  layers: [],
  roundRobin: false,
});

const createDefaultPattern = (name = 'Pattern 1', stepCount = 16) => ({
  id: uid(),
  name,
  steps: Array.from({ length: PAD_COUNT }, () => Array(stepCount).fill(false)),
  velocities: Array.from({ length: PAD_COUNT }, () => Array(stepCount).fill(0.8)),
});

// =============================================================================
// Hook
// =============================================================================
export default function useSamplerEngine(options = {}) {
  const {
    projectBpm = DEFAULT_BPM,
    projectKey = 'C',
    projectScale = 'major',
    onExport,
    onSendToArrange,
    onExportToArrange,
    onBpmSync,
    onKeySync,
  } = options;

  // ── Audio Context ──
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const activeSrc = useRef({});
  const mediaRec = useRef(null);

  // ── Effect node caches (per-pad, created on demand) ──
  const reverbBufRef = useRef(null); // shared impulse response buffer
  const midiAccessRef = useRef(null);
  const midiMapRef = useRef({}); // { noteOrCC: padIndex }
  const roundRobinIdx = useRef({}); // { padIndex: currentLayerIndex }

  const initCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // ── Generate reverb impulse response (synthetic room) ──
  const getReverbImpulse = useCallback((duration = 2, decay = 2) => {
    if (reverbBufRef.current) return reverbBufRef.current;
    const ctx = initCtx();
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    reverbBufRef.current = buf;
    return buf;
  }, [initCtx]);

  // ── Select buffer for velocity layers ──
  const selectLayerBuffer = useCallback((pad, pi, vel) => {
    // If pad has velocity layers, pick the right one
    if (pad.layers && pad.layers.length > 0) {
      if (pad.roundRobin) {
        // Round-robin: cycle through layers regardless of velocity
        const idx = (roundRobinIdx.current[pi] || 0) % pad.layers.length;
        roundRobinIdx.current[pi] = idx + 1;
        return pad.layers[idx].buffer || pad.buffer;
      }
      // Velocity switching: layers sorted by velocity threshold
      // Each layer: { buffer, velLow, velHigh, name }
      const sorted = [...pad.layers].sort((a, b) => (a.velLow || 0) - (b.velLow || 0));
      for (const layer of sorted) {
        if (vel >= (layer.velLow || 0) && vel <= (layer.velHigh || 1)) {
          return layer.buffer || pad.buffer;
        }
      }
      // Fallback: closest layer
      let best = pad.layers[0];
      let bestDist = 999;
      for (const layer of pad.layers) {
        const mid = ((layer.velLow || 0) + (layer.velHigh || 1)) / 2;
        const dist = Math.abs(vel - mid);
        if (dist < bestDist) { bestDist = dist; best = layer; }
      }
      return best.buffer || pad.buffer;
    }
    return pad.buffer;
  }, []);

  // ── State ──
  const [pads, setPads] = useState(() => Array.from({ length: PAD_COUNT }, (_, i) => createDefaultPad(i)));
  const [selectedPad, setSelectedPad] = useState(null);
  const [activePads, setActivePads] = useState(new Set());

  // Transport
  const [bpm, setBpm] = useState(projectBpm);
  const bpmRef = useRef(projectBpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const [curStep, setCurStep] = useState(-1);
  const [looping, setLooping] = useState(true);
  const [metOn, setMetOn] = useState(false);
  const [swing, setSwing] = useState(0);
  const [masterVol, setMasterVol] = useState(0.8);

  // Sequencer
  const [stepCount, setStepCount] = useState(16);
  const [patterns, setPatterns] = useState([createDefaultPattern()]);
  const [curPatIdx, setCurPatIdx] = useState(0);
  const [loopStartStep, setLoopStartStep] = useState(0);
  const [loopEndStep, setLoopEndStep] = useState(null);
  const [overdub, setOverdub] = useState(false);
  const [quantVal, setQuantVal] = useState('1/16');

  // Recording
  const [liveRec, setLiveRec] = useState(false);
  const liveRef = useRef(false);
  const recStartT = useRef(0);
  const [recHits, setRecHits] = useState([]);

  // Mic recording
  const [micRec, setMicRec] = useState(false);
  const [micPad, setMicPad] = useState(null);
  const [micCount, setMicCount] = useState(0);

  // Song mode
  const [songMode, setSongMode] = useState(false);
  const [songSeq, setSongSeq] = useState([]);
  const [songPos, setSongPos] = useState(0);

  // Clip launcher
  const [showClipLauncher, setShowClipLauncher] = useState(false);
  const [scenes, setScenes] = useState([{ id: uid(), name: 'Scene 1', clips: {} }]);
  const [activeScene, setActiveScene] = useState(0);
  const [clipStates, setClipStates] = useState({});
  const [editingClip, setEditingClip] = useState(null);

  // Devices
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selIn, setSelIn] = useState('default');
  const [selOut, setSelOut] = useState('default');
  const [midiInputs, setMidiInputs] = useState([]);
  const [selMidi, setSelMidi] = useState(null);
  const [midiLearn, setMidiLearn] = useState(false);
  const [midiLearnPad, setMidiLearnPad] = useState(null);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportProgress, setExportProgress] = useState('');
  const [exportFormat, setExportFormat] = useState('wav');
  const [showExportPanel, setShowExportPanel] = useState(false);

  // Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState(0);
  const [detectedKey, setDetectedKey] = useState(null);

  // UI
  const [view, setView] = useState('split');
  const [showMixer, setShowMixer] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [showKitBrowser, setShowKitBrowser] = useState(false);
  const [showPadSet, setShowPadSet] = useState(false);
  const [settingsTab, setSettingsTab] = useState('main');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showSampleEditor, setShowSampleEditor] = useState(false);
  const [sampleEditorPad, setSampleEditorPad] = useState(null);
  const [showChop, setShowChop] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragPad, setDragPad] = useState(null);
  const [padLvls, setPadLvls] = useState({});
  const [activeKgNotes, setActiveKgNotes] = useState(new Set());

  // Chop state
  const [chopIdx, setChopIdx] = useState(null);
  const [chopPts, setChopPts] = useState([]);
  const [chopMode, setChopMode] = useState('transient');
  const [chopSens, setChopSens] = useState(0.3);
  const [chopSlices, setChopSlices] = useState(8);
  const [zeroCrossSnap, setZeroCrossSnap] = useState(true);
  const [activeSlice, setActiveSlice] = useState(-1);
  const chopCanvas = useRef(null);

  // Tap tempo
  const tapTimes = useRef([]);

  // Sequencer refs
  const seqRef = useRef(null);
  const stepRef = useRef(-1);

  // Shortcuts
  const steps = patterns[curPatIdx]?.steps || [];
  const stepVel = patterns[curPatIdx]?.velocities || [];

  // ═══════════════════════════════════════════════════════════
  // PAD MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  const updatePad = useCallback((i, updates) => {
    setPads(p => p.map((pad, idx) => idx === i ? { ...pad, ...updates } : pad));
  }, []);

  const clearPad = useCallback((i) => {
    setPads(p => p.map((pad, idx) => idx === i ? createDefaultPad(i) : pad));
  }, []);

  const loadSample = useCallback(async (padIndex, fileOrUrl) => {
    const ctx = initCtx();
    try {
      let ab;
      if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
        ab = await fileOrUrl.arrayBuffer();
      } else if (typeof fileOrUrl === 'string') {
        const res = await fetch(fileOrUrl);
        ab = await res.arrayBuffer();
      } else if (fileOrUrl instanceof ArrayBuffer) {
        ab = fileOrUrl;
      } else {
        return;
      }
      const buf = await ctx.decodeAudioData(ab);
      const name = fileOrUrl instanceof File ? fileOrUrl.name.replace(/\.[^.]+$/, '').slice(0, 20) : `Sample ${padIndex + 1}`;
      updatePad(padIndex, { buffer: buf, name, trimEnd: buf.duration });
    } catch (e) {
      console.error('Load failed:', e);
    }
  }, [initCtx, updatePad]);

  // ═══════════════════════════════════════════════════════════
  // PLAYBACK
  // ═══════════════════════════════════════════════════════════

  const playPad = useCallback((pi, vel = 0.8) => {
    const pad = pads[pi];
    if (!pad?.buffer && (!pad?.layers || pad.layers.length === 0)) return;
    if (pad.muted) return;
    const ctx = initCtx();

    // Stop previous voice for this pad
    if (activeSrc.current[pi]) {
      try { activeSrc.current[pi].source.stop(); } catch (e) {}
      // Disconnect old effect nodes
      try { activeSrc.current[pi].chain?.forEach(n => n.disconnect()); } catch (e) {}
    }

    // ── Select buffer (velocity layers / round-robin) ──
    const buffer = selectLayerBuffer(pad, pi, vel);
    if (!buffer) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // ── Pitch / Time-stretch ──
    if (pad.timeStretch && pad.stretchMode === 'stretch' && pad.originalBpm > 0) {
      // Real time-stretch: adjust playback rate to match project BPM, then pitch-shift to compensate
      // Rate = targetBPM / originalBPM (speeds up/slows down to match tempo)
      // Then we apply pitch compensation via a separate detune
      const stretchRate = bpm / pad.originalBpm;
      src.playbackRate.value = stretchRate;
      // Compensate pitch: detune in cents to cancel the pitch change from rate adjustment
      // Plus any user pitch offset
      const pitchCompCents = -Math.log2(stretchRate) * 1200;
      src.detune.value = pitchCompCents + (pad.pitch * 100);
    } else {
      // Standard repitch mode
      src.playbackRate.value = Math.pow(2, pad.pitch / 12);
    }

    if (pad.playMode === 'loop') {
      src.loop = true;
      src.loopStart = pad.trimStart || 0;
      src.loopEnd = pad.trimEnd || buffer.duration;
    }

    // ── Build signal chain: src → [filter] → gain → pan → [delay] → [reverb] → master ──
    const chain = []; // track nodes for cleanup
    const now = ctx.currentTime;
    const peakVol = pad.volume * vel * masterVol;

    // ADSR gain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + pad.attack);
    gain.gain.linearRampToValueAtTime(peakVol * pad.sustain, now + pad.attack + pad.decay);
    chain.push(gain);

    // Pan
    const pan = ctx.createStereoPanner();
    pan.pan.value = pad.pan || 0;
    chain.push(pan);

    // Filter (optional)
    let lastNode = src;
    if (pad.filterOn) {
      const f = ctx.createBiquadFilter();
      f.type = pad.filterType || 'lowpass';
      f.frequency.value = pad.filterFreq || 2000;
      f.Q.value = pad.filterQ || 1;
      lastNode.connect(f);
      lastNode = f;
      chain.push(f);
    }

    // Connect: source chain → gain → pan
    lastNode.connect(gain);
    gain.connect(pan);

    // ── Delay send (real feedback delay) ──
    let dryNode = pan; // will connect to master
    if (pad.delayOn && pad.delayMix > 0) {
      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = pad.delayTime || 0.3;

      const feedbackGain = ctx.createGain();
      feedbackGain.gain.value = Math.min(0.95, pad.delayFeedback || 0.3);

      const delayWet = ctx.createGain();
      delayWet.gain.value = pad.delayMix || 0.2;

      const delayDry = ctx.createGain();
      delayDry.gain.value = 1.0;

      // Feedback loop: delay → feedback → delay
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);

      // Wet path: pan → delay → wetGain → master
      pan.connect(delayNode);
      delayNode.connect(delayWet);
      delayWet.connect(masterRef.current);

      // Dry path: pan → dryGain → (continues to reverb or master)
      pan.connect(delayDry);
      dryNode = delayDry;

      chain.push(delayNode, feedbackGain, delayWet, delayDry);
    }

    // ── Reverb send (real convolver) ──
    if (pad.reverbOn && pad.reverbMix > 0) {
      const impulse = getReverbImpulse(2, 2.5);
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;

      const reverbWet = ctx.createGain();
      reverbWet.gain.value = pad.reverbMix || 0.2;

      const reverbDry = ctx.createGain();
      reverbDry.gain.value = 1 - (pad.reverbMix * 0.5); // keep dry present

      // Wet path: dryNode → convolver → wetGain → master
      dryNode.connect(convolver);
      convolver.connect(reverbWet);
      reverbWet.connect(masterRef.current);

      // Dry path: dryNode → dryGain → master
      dryNode.connect(reverbDry);
      reverbDry.connect(masterRef.current);

      chain.push(convolver, reverbWet, reverbDry);
    } else {
      // No reverb: connect dry straight to master
      dryNode.connect(masterRef.current);
    }

    // ── Start playback ──
    const start = pad.trimStart || 0;
    const dur = (pad.trimEnd || buffer.duration) - start;
    src.start(0, start, pad.playMode === 'loop' ? undefined : dur + pad.release);

    if (pad.playMode === 'oneshot') {
      gain.gain.setValueAtTime(peakVol * pad.sustain, now + dur);
      gain.gain.linearRampToValueAtTime(0, now + dur + pad.release);
    }

    activeSrc.current[pi] = { source: src, gain, chain };

    // Visual feedback
    setActivePads(p => new Set(p).add(pi));
    src.onended = () => {
      // Cleanup effect nodes
      try { chain.forEach(n => n.disconnect()); } catch (e) {}
      delete activeSrc.current[pi];
      setActivePads(p => { const n = new Set(p); n.delete(pi); return n; });
    };
  }, [pads, masterVol, bpm, initCtx, selectLayerBuffer, getReverbImpulse]);

  const stopPad = useCallback((pi) => {
    if (activeSrc.current[pi]) {
      const ctx = ctxRef.current;
      const { source, gain } = activeSrc.current[pi];
      if (ctx && gain) {
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (pads[pi]?.release || 0.1));
        try { source.stop(ctx.currentTime + (pads[pi]?.release || 0.1) + 0.05); } catch (e) {}
      }
    }
  }, [pads]);

  const stopAll = useCallback(() => {
    Object.keys(activeSrc.current).forEach(k => {
      try { activeSrc.current[k].source.stop(); } catch (e) {}
    });
    activeSrc.current = {};
    setActivePads(new Set());
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SEQUENCER
  // ═══════════════════════════════════════════════════════════

  const toggleStep = useCallback((pi, si, e) => {
    setPatterns(prev => {
      const next = [...prev];
      const pat = { ...next[curPatIdx] };
      pat.steps = pat.steps.map(r => [...r]);
      pat.velocities = pat.velocities.map(r => [...r]);
      pat.steps[pi][si] = !pat.steps[pi][si];
      if (pat.steps[pi][si]) {
        pat.velocities[pi][si] = e?.shiftKey ? 0.4 : e?.ctrlKey ? 1.0 : 0.8;
      }
      next[curPatIdx] = pat;
      return next;
    });
  }, [curPatIdx]);

  const startSeq = useCallback(() => {
    const ctx = initCtx();
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    stepRef.current = (loopStartStep || 0) - 1;

    const tick = () => {
      if (!playingRef.current) return;
      let next = stepRef.current + 1;
      const end = loopEndStep ?? stepCount;
      const start = loopStartStep || 0;
      if (next >= end) {
        if (looping) next = start;
        else { stopSeq(); return; }
      }
      stepRef.current = next;
      setCurStep(next);

      // Play active steps
      const pat = patterns[curPatIdx];
      if (pat) {
        for (let pi = 0; pi < PAD_COUNT; pi++) {
          if (pat.steps[pi]?.[next]) {
            playPad(pi, pat.velocities[pi]?.[next] ?? 0.8);
          }
        }
      }

      // Metronome
      if (metOn && next % 4 === 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = next % 16 === 0 ? 1000 : 800;
        g.gain.value = 0.15;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.04);
      }

      // Swing
      const baseInterval = (60 / bpmRef.current) / 4 * 1000;
      const swingOffset = next % 2 === 1 ? baseInterval * (swing / 200) : 0;
      seqRef.current = setTimeout(tick, baseInterval + swingOffset);
    };

    tick();
  }, [initCtx, loopStartStep, loopEndStep, stepCount, looping, patterns, curPatIdx, playPad, metOn, swing]);

  const stopSeq = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurStep(-1);
    stepRef.current = -1;
    if (seqRef.current) clearTimeout(seqRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) stopSeq(); else startSeq();
  }, [isPlaying, startSeq, stopSeq]);

  // ═══════════════════════════════════════════════════════════
  // PATTERN MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  const addPattern = useCallback(() => {
    setPatterns(p => [...p, createDefaultPattern(`Pattern ${p.length + 1}`, stepCount)]);
  }, [stepCount]);

  const dupPattern = useCallback((idx) => {
    setPatterns(p => {
      const src = p[idx];
      const dup = {
        ...src,
        id: uid(),
        name: `${src.name} Copy`,
        steps: src.steps.map(r => [...r]),
        velocities: src.velocities.map(r => [...r]),
      };
      return [...p, dup];
    });
  }, []);

  const delPattern = useCallback((idx) => {
    if (patterns.length <= 1) return;
    setPatterns(p => p.filter((_, i) => i !== idx));
    if (curPatIdx >= patterns.length - 1) setCurPatIdx(Math.max(0, patterns.length - 2));
  }, [patterns.length, curPatIdx]);

  const renamePattern = useCallback((idx, name) => {
    setPatterns(p => p.map((pat, i) => i === idx ? { ...pat, name } : pat));
  }, []);

  const clearPat = useCallback(() => {
    setPatterns(prev => {
      const next = [...prev];
      next[curPatIdx] = {
        ...next[curPatIdx],
        steps: Array.from({ length: PAD_COUNT }, () => Array(stepCount).fill(false)),
        velocities: Array.from({ length: PAD_COUNT }, () => Array(stepCount).fill(0.8)),
      };
      return next;
    });
  }, [curPatIdx, stepCount]);

  // ═══════════════════════════════════════════════════════════
  // LIVE RECORDING
  // ═══════════════════════════════════════════════════════════

  const startLiveRec = useCallback(() => {
    const ctx = initCtx();
    recStartT.current = ctx.currentTime;
    setRecHits([]);
    setLiveRec(true);
    liveRef.current = true;
    if (!isPlaying) startSeq();
  }, [initCtx, isPlaying, startSeq]);

  const handleLiveHit = useCallback((pi) => {
    if (!liveRef.current || !ctxRef.current) return;
    setRecHits(prev => [...prev, {
      pad: pi,
      time: ctxRef.current.currentTime - recStartT.current,
      velocity: 0.8,
    }]);
  }, []);

  const stopLiveRec = useCallback(() => {
    setLiveRec(false);
    liveRef.current = false;

    // Quantize hits into pattern
    if (recHits.length > 0) {
      const stepDur = 60 / bpmRef.current / 4;
      setPatterns(prev => {
        const next = [...prev];
        const pat = { ...next[curPatIdx] };
        pat.steps = pat.steps.map(r => [...r]);
        pat.velocities = pat.velocities.map(r => [...r]);
        recHits.forEach(hit => {
          const si = Math.round(hit.time / stepDur) % stepCount;
          if (si >= 0 && si < stepCount) {
            pat.steps[hit.pad][si] = true;
            pat.velocities[hit.pad][si] = hit.velocity;
          }
        });
        next[curPatIdx] = pat;
        return next;
      });
    }
    setRecHits([]);
  }, [recHits, curPatIdx, stepCount]);

  // ═══════════════════════════════════════════════════════════
  // MIC RECORDING
  // ═══════════════════════════════════════════════════════════

  const startMicRec = useCallback(async (padIndex) => {
    const ctx = initCtx();
    setMicPad(padIndex);
    setMicCount(3);

    // Countdown
    for (let c = 3; c > 0; c--) {
      setMicCount(c);
      await new Promise(r => setTimeout(r, 800));
    }
    setMicCount(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mime });
        const ab = await blob.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        updatePad(padIndex, { buffer: buf, name: `Rec ${padIndex + 1}`, trimEnd: buf.duration });
        setMicRec(false);
      };
      rec.start(100);
      mediaRec.current = rec;
      setMicRec(true);
    } catch (e) {
      console.error('Mic error:', e);
      setMicRec(false);
    }
  }, [initCtx, updatePad]);

  const stopMicRec = useCallback(() => {
    if (mediaRec.current?.state === 'recording') mediaRec.current.stop();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // TAP TEMPO
  // ═══════════════════════════════════════════════════════════

  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimes.current = [...tapTimes.current, now].slice(-6);
    if (tapTimes.current.length < 2) return;
    const diffs = [];
    for (let i = 1; i < tapTimes.current.length; i++) {
      diffs.push(tapTimes.current[i] - tapTimes.current[i - 1]);
    }
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const newBpm = Math.round(Math.max(40, Math.min(300, 60000 / avg)));
    setBpm(newBpm);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // NORMALIZE / REVERSE / FADE
  // ═══════════════════════════════════════════════════════════

  const normalizeSample = useCallback((pi) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    const ctx = initCtx();
    const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
    }
    if (peak === 0) return;
    const gain = 1 / peak;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[i] * gain;
    }
    updatePad(pi, { buffer: out });
  }, [pads, initCtx, updatePad]);

  const reverseSampleDestructive = useCallback((pi) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    const ctx = initCtx();
    const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    }
    updatePad(pi, { buffer: out });
  }, [pads, initCtx, updatePad]);

  const fadeInSample = useCallback((pi, fadeTime = 0.05) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    const ctx = initCtx();
    const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const fadeSamps = Math.floor(fadeTime * buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        dst[i] = i < fadeSamps ? src[i] * (i / fadeSamps) : src[i];
      }
    }
    updatePad(pi, { buffer: out });
  }, [pads, initCtx, updatePad]);

  const fadeOutSample = useCallback((pi, fadeTime = 0.05) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    const ctx = initCtx();
    const out = ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const fadeSamps = Math.floor(fadeTime * buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        const fromEnd = src.length - 1 - i;
        dst[i] = fromEnd < fadeSamps ? src[i] * (fromEnd / fadeSamps) : src[i];
      }
    }
    updatePad(pi, { buffer: out });
  }, [pads, initCtx, updatePad]);

  // ═══════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════

  const exportBeat = useCallback(async (format = 'wav') => {
    if (exporting) return;
    setExporting(true);
    setExportStatus('Rendering...');
    try {
      const pat = patterns[curPatIdx];
      const stepDur = 60 / bpm / 4;
      const totalDur = stepCount * stepDur;
      const sr = 44100;
      const offCtx = new OfflineAudioContext(2, Math.ceil(totalDur * sr), sr);

      for (let pi = 0; pi < PAD_COUNT; pi++) {
        const pad = pads[pi];
        if (!pad?.buffer) continue;
        for (let si = 0; si < stepCount; si++) {
          if (!pat.steps[pi]?.[si]) continue;
          const src = offCtx.createBufferSource();
          src.buffer = pad.buffer;
          src.playbackRate.value = Math.pow(2, pad.pitch / 12);
          const g = offCtx.createGain();
          g.gain.value = pad.volume * (pat.velocities[pi]?.[si] ?? 0.8);
          src.connect(g); g.connect(offCtx.destination);
          src.start(si * stepDur, pad.trimStart || 0);
        }
      }

      const rendered = await offCtx.startRendering();

      // Download
      const length = rendered.length;
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);
      const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sr, true);
      view.setUint32(28, sr * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, length * 2, true);

      const mono = rendered.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const s = Math.max(-1, Math.min(1, mono[i]));
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beat_${bpm}bpm.wav`;
      a.click();
      URL.revokeObjectURL(url);

      if (onExport) onExport(rendered, blob);
      setExportStatus('✓ Exported');
    } catch (e) {
      console.error('Export failed:', e);
      setExportStatus('✗ Failed');
    } finally {
      setExporting(false);
    }
  }, [exporting, patterns, curPatIdx, stepCount, bpm, pads, onExport]);

  const exportMIDI = useCallback(() => {
    setExportStatus('MIDI export placeholder');
  }, []);

  const exportStems = useCallback(() => {
    setExportStatus('Stems export placeholder');
  }, []);

  // ═══════════════════════════════════════════════════════════
  // DRAG & DROP
  // ═══════════════════════════════════════════════════════════

  const onDragOver = useCallback((e, pi) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragPad(pi);
  }, []);

  const onDragLeave = useCallback(() => setDragPad(null), []);

  const onDrop = useCallback((e, pi) => {
    e.preventDefault();
    setDragPad(null);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff)$/i.test(f.name))) {
      initCtx();
      loadSample(pi, f);
    }
  }, [initCtx, loadSample]);

  // ═══════════════════════════════════════════════════════════
  // FILE SELECT
  // ═══════════════════════════════════════════════════════════

  const fileSelect = useCallback((pi) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'audio/*';
    inp.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) { initCtx(); loadSample(pi, f); }
    };
    inp.click();
  }, [initCtx, loadSample]);

  // ═══════════════════════════════════════════════════════════
  // CHOP
  // ═══════════════════════════════════════════════════════════

  const openChop = useCallback((pi) => {
    setChopIdx(pi);
    setShowChop(true);
    setChopPts([]);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SAMPLE EDITOR
  // ═══════════════════════════════════════════════════════════

  const openSampleEditor = useCallback((pi) => {
    setSampleEditorPad(pi);
    setShowSampleEditor(true);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // MASTER VOLUME
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = masterVol;
  }, [masterVol]);

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      stopSeq();
      stopAll();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // KIT SAVE/LOAD (placeholder)
  // ═══════════════════════════════════════════════════════════

  const saveKit = useCallback((name) => {
    setExportStatus(`Kit "${name}" saved (placeholder)`);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SONG MODE
  // ═══════════════════════════════════════════════════════════

  const addToSong = useCallback((patIdx) => {
    setSongSeq(p => [...p, { ...patterns[patIdx], songId: uid() }]);
  }, [patterns]);

  const rmFromSong = useCallback((idx) => {
    setSongSeq(p => p.filter((_, i) => i !== idx));
  }, []);

  const moveSongBlock = useCallback((from, to) => {
    setSongSeq(p => {
      const n = [...p];
      const [item] = n.splice(from, 1);
      n.splice(to, 0, item);
      return n;
    });
  }, []);

  const startSong = useCallback(() => {
    // Placeholder
    setExportStatus('Song mode: coming soon');
  }, []);

  // ═══════════════════════════════════════════════════════════
  // CLIP LAUNCHER (placeholder stubs)
  // ═══════════════════════════════════════════════════════════

  const addScene = useCallback(() => {
    setScenes(p => [...p, { id: uid(), name: `Scene ${p.length + 1}`, clips: {} }]);
  }, []);

  const removeScene = useCallback((idx) => {
    if (scenes.length <= 1) return;
    setScenes(p => p.filter((_, i) => i !== idx));
  }, [scenes.length]);

  const renameScene = useCallback((idx, name) => {
    setScenes(p => p.map((s, i) => i === idx ? { ...s, name } : s));
  }, []);

  const duplicateScene = useCallback((idx) => {
    setScenes(p => [...p, { ...p[idx], id: uid(), name: `${p[idx].name} Copy` }]);
  }, []);

  const assignClip = useCallback((si, pi) => {
    if (!pads[pi]?.buffer) return;
    setScenes(p => p.map((s, i) => {
      if (i !== si) return s;
      return { ...s, clips: { ...s.clips, [pi]: { name: pads[pi].name, color: pads[pi].color, volume: 1, pitch: 0 } } };
    }));
  }, [pads]);

  const removeClip = useCallback((si, pi) => {
    setScenes(p => p.map((s, i) => {
      if (i !== si) return s;
      const clips = { ...s.clips };
      delete clips[pi];
      return { ...s, clips };
    }));
  }, []);

  const toggleClip = useCallback((si, pi) => {
    const key = `${si}_${pi}`;
    setClipStates(p => {
      const cur = p[key] || 'stopped';
      return { ...p, [key]: cur === 'playing' ? 'stopped' : 'playing' };
    });
  }, []);

  const updateClip = useCallback((si, pi, updates) => {
    setScenes(p => p.map((s, i) => {
      if (i !== si || !s.clips[pi]) return s;
      return { ...s, clips: { ...s.clips, [pi]: { ...s.clips[pi], ...updates } } };
    }));
  }, []);

  const launchScene = useCallback((si) => { setActiveScene(si); }, []);
  const stopAllClips = useCallback(() => { setClipStates({}); }, []);
  const fillSceneFromPads = useCallback((si) => {
    setScenes(p => p.map((s, i) => {
      if (i !== si) return s;
      const clips = {};
      pads.forEach((pad, pi) => {
        if (pad.buffer) clips[pi] = { name: pad.name, color: pad.color, volume: 1, pitch: 0 };
      });
      return { ...s, clips };
    }));
  }, [pads]);

  // ═══════════════════════════════════════════════════════════
  // KEYGROUP
  // ═══════════════════════════════════════════════════════════

  const playPadKeygroup = useCallback((pi, note, vel = 0.8) => {
    const pad = pads[pi];
    if (!pad?.buffer) return;
    const ctx = initCtx();
    const semitones = note - (pad.rootNote || 60) + pad.pitch;
    const src = ctx.createBufferSource();
    src.buffer = pad.buffer;
    src.playbackRate.value = Math.pow(2, semitones / 12);
    const g = ctx.createGain();
    g.gain.value = pad.volume * vel * masterVol;
    src.connect(g);
    g.connect(masterRef.current);
    src.start(0, pad.trimStart || 0);
    setActiveKgNotes(p => new Set(p).add(note));
    activeSrc.current[`kg_${note}`] = { source: src, gain: g };
    src.onended = () => {
      delete activeSrc.current[`kg_${note}`];
      setActiveKgNotes(p => { const n = new Set(p); n.delete(note); return n; });
    };
  }, [pads, masterVol, initCtx]);

  const stopPadKeygroup = useCallback((pi, note) => {
    const key = `kg_${note}`;
    if (activeSrc.current[key]) {
      try { activeSrc.current[key].source.stop(); } catch (e) {}
      delete activeSrc.current[key];
      setActiveKgNotes(p => { const n = new Set(p); n.delete(note); return n; });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // BPM / KEY ANALYSIS (real — AudioAnalysis.js)
  // ═══════════════════════════════════════════════════════════

  const analyzePadSample = useCallback((pi) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    setAnalyzing(true);
    // Run in a timeout to avoid blocking UI
    setTimeout(() => {
      try {
        const bpmResult = detectBPM(buf);
        const keyResult = detectKey(buf);
        if (bpmResult.bpm > 0) setDetectedBpm(bpmResult.bpm);
        if (keyResult.key) setDetectedKey({ key: keyResult.key, scale: keyResult.scale, confidence: keyResult.confidence });
      } catch (e) {
        console.error('Analysis failed:', e);
      }
      setAnalyzing(false);
    }, 50);
  }, [pads]);

  // ═══════════════════════════════════════════════════════════
  // BOUNCE TO ARRANGE
  // ═══════════════════════════════════════════════════════════

  const bounceToArrange = useCallback(async () => {
    if (!onSendToArrange) return;
    setExportStatus('Bouncing...');
    try {
      const pat = patterns[curPatIdx];
      const stepDur = 60 / bpm / 4;
      const totalDur = stepCount * stepDur;
      const sr = 44100;
      const offCtx = new OfflineAudioContext(2, Math.ceil(totalDur * sr), sr);

      for (let pi = 0; pi < PAD_COUNT; pi++) {
        const pad = pads[pi];
        if (!pad?.buffer) continue;
        for (let si = 0; si < stepCount; si++) {
          if (!pat.steps[pi]?.[si]) continue;
          const src = offCtx.createBufferSource();
          src.buffer = pad.buffer;
          src.playbackRate.value = Math.pow(2, pad.pitch / 12);
          const g = offCtx.createGain();
          g.gain.value = pad.volume * (pat.velocities[pi]?.[si] ?? 0.8);
          src.connect(g); g.connect(offCtx.destination);
          src.start(si * stepDur, pad.trimStart || 0);
        }
      }

      const rendered = await offCtx.startRendering();
      onSendToArrange(rendered, `Beat ${bpm}bpm`);
      setExportStatus('✓ Bounced to Arrange');
    } catch (e) {
      setExportStatus('✗ Bounce failed');
    }
  }, [patterns, curPatIdx, stepCount, bpm, pads, onSendToArrange]);

  // ═══════════════════════════════════════════════════════════
  // REAL MIDI LEARN — Web MIDI API
  // ═══════════════════════════════════════════════════════════

  const initMidi = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI not supported');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      midiAccessRef.current = access;
      const inputs = [];
      access.inputs.forEach(input => inputs.push(input));
      setMidiInputs(inputs.map(i => ({ id: i.id, name: i.name || i.manufacturer || 'MIDI Device' })));

      // Listen on all inputs
      access.inputs.forEach(input => {
        input.onmidimessage = (e) => handleMidiMessage(e);
      });

      // React to device changes
      access.onstatechange = () => {
        const updated = [];
        access.inputs.forEach(input => updated.push(input));
        setMidiInputs(updated.map(i => ({ id: i.id, name: i.name || 'MIDI Device' })));
        // Re-bind listeners
        access.inputs.forEach(input => {
          input.onmidimessage = (e) => handleMidiMessage(e);
        });
      };
    } catch (e) {
      console.warn('MIDI access denied:', e);
    }
  }, []);

  const handleMidiMessage = useCallback((event) => {
    const [status, data1, data2] = event.data;
    const msgType = status & 0xF0;
    const channel = status & 0x0F;

    // Note On
    if (msgType === 0x90 && data2 > 0) {
      const vel = data2 / 127;
      const noteKey = `note_${data1}`;

      // MIDI Learn mode: assign this note to the selected pad
      if (midiLearn && midiLearnPad !== null) {
        midiMapRef.current[noteKey] = midiLearnPad;
        setMidiLearn(false);
        setMidiLearnPad(null);
        return;
      }

      // Check MIDI map
      const mappedPad = midiMapRef.current[noteKey];
      if (mappedPad !== undefined && mappedPad < PAD_COUNT) {
        // Use external playPad — but we can't call it directly in this callback
        // because it may not be the latest reference. So we use pads ref approach:
        const pad = pads[mappedPad];
        if (pad?.buffer) {
          const ctx = initCtx();
          // Trigger via the same mechanism
          playPad(mappedPad, vel);
        }
      } else {
        // Default: notes 36-51 (GM drum map) → pads 0-15
        const padIdx = data1 - 36;
        if (padIdx >= 0 && padIdx < PAD_COUNT) {
          playPad(padIdx, vel);
        }
      }
    }

    // Note Off
    if (msgType === 0x80 || (msgType === 0x90 && data2 === 0)) {
      const noteKey = `note_${data1}`;
      const mappedPad = midiMapRef.current[noteKey];
      const padIdx = mappedPad !== undefined ? mappedPad : data1 - 36;
      if (padIdx >= 0 && padIdx < PAD_COUNT && pads[padIdx]?.playMode === 'hold') {
        stopPad(padIdx);
      }
    }

    // CC (Control Change) — map to pad parameters
    if (msgType === 0xB0) {
      const ccKey = `cc_${data1}`;
      if (midiLearn && midiLearnPad !== null) {
        midiMapRef.current[ccKey] = midiLearnPad;
        setMidiLearn(false);
        setMidiLearnPad(null);
        return;
      }
    }
  }, [pads, midiLearn, midiLearnPad, initCtx, playPad, stopPad]);

  // Auto-init MIDI on mount
  useEffect(() => {
    initMidi();
    return () => {
      if (midiAccessRef.current) {
        midiAccessRef.current.inputs.forEach(input => {
          input.onmidimessage = null;
        });
      }
    };
  }, [initMidi]);

  // Start MIDI Learn for a specific pad
  const startMidiLearn = useCallback((padIdx) => {
    setMidiLearn(true);
    setMidiLearnPad(padIdx);
  }, []);

  const cancelMidiLearn = useCallback(() => {
    setMidiLearn(false);
    setMidiLearnPad(null);
  }, []);

  const clearMidiMap = useCallback((padIdx) => {
    const newMap = { ...midiMapRef.current };
    Object.keys(newMap).forEach(key => {
      if (newMap[key] === padIdx) delete newMap[key];
    });
    midiMapRef.current = newMap;
  }, []);

  const getMidiMapping = useCallback((padIdx) => {
    const mappings = [];
    Object.entries(midiMapRef.current).forEach(([key, pi]) => {
      if (pi === padIdx) mappings.push(key);
    });
    return mappings;
  }, []);

  // ═══════════════════════════════════════════════════════════
  // VELOCITY LAYER MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  const addVelocityLayer = useCallback(async (pi, file, velLow = 0, velHigh = 1) => {
    const ctx = initCtx();
    try {
      const ab = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(ab);
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 20);
      setPads(prev => prev.map((pad, i) => {
        if (i !== pi) return pad;
        const layers = [...(pad.layers || []), { buffer, name, velLow, velHigh }];
        return { ...pad, layers };
      }));
    } catch (e) {
      console.error('Layer load failed:', e);
    }
  }, [initCtx]);

  const removeVelocityLayer = useCallback((pi, layerIdx) => {
    setPads(prev => prev.map((pad, i) => {
      if (i !== pi) return pad;
      const layers = [...(pad.layers || [])];
      layers.splice(layerIdx, 1);
      return { ...pad, layers };
    }));
  }, []);

  const updateVelocityLayer = useCallback((pi, layerIdx, updates) => {
    setPads(prev => prev.map((pad, i) => {
      if (i !== pi) return pad;
      const layers = [...(pad.layers || [])];
      if (layers[layerIdx]) layers[layerIdx] = { ...layers[layerIdx], ...updates };
      return { ...pad, layers };
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════
  // Return everything
  // ═══════════════════════════════════════════════════════════

  return {
    // Audio
    ctxRef, masterRef, initCtx, activeSrc,

    // Pads
    pads, setPads, selectedPad, setSelectedPad, activePads, updatePad, clearPad,
    loadSample, playPad, stopPad, stopAll, fileSelect,

    // Transport
    bpm, setBpm, bpmRef, isPlaying, togglePlay, startSeq, stopSeq,
    curStep, looping, setLooping, metOn, setMetOn, swing, setSwing,
    masterVol, setMasterVol, tapTempo, overdub, setOverdub,

    // Sequencer
    stepCount, setStepCount, patterns, setPatterns, curPatIdx, setCurPatIdx,
    steps, stepVel, toggleStep, loopStartStep, setLoopStartStep,
    loopEndStep, setLoopEndStep, quantVal, setQuantVal,

    // Pattern management
    addPattern, dupPattern, delPattern, renamePattern, clearPat,

    // Live recording
    liveRec, startLiveRec, stopLiveRec, handleLiveHit, recHits,

    // Mic recording
    micRec, micPad, micCount, startMicRec, stopMicRec,

    // Sample processing
    normalizeSample, reverseSampleDestructive, fadeInSample, fadeOutSample,

    // Chop
    showChop, setShowChop, chopIdx, setChopIdx, chopPts, setChopPts,
    chopMode, setChopMode, chopSens, setChopSens, chopSlices, setChopSlices,
    zeroCrossSnap, setZeroCrossSnap, activeSlice, setActiveSlice,
    chopCanvas, openChop,

    // Sample editor
    showSampleEditor, setShowSampleEditor, sampleEditorPad, setSampleEditorPad,
    openSampleEditor,

    // Analysis
    analyzing, analyzePadSample, detectedBpm, setDetectedBpm,
    detectedKey, setDetectedKey,

    // Export
    exporting, exportStatus, setExportStatus, exportProgress, setExportProgress,
    exportFormat, setExportFormat, showExportPanel, setShowExportPanel,
    exportBeat, exportMIDI, exportStems, bounceToArrange,

    // Song mode
    songMode, setSongMode, songSeq, setSongSeq, songPos, setSongPos,
    addToSong, rmFromSong, moveSongBlock, startSong,

    // Clip launcher
    showClipLauncher, setShowClipLauncher, scenes, setScenes,
    activeScene, setActiveScene, clipStates, setClipStates,
    editingClip, setEditingClip, addScene, removeScene, renameScene,
    duplicateScene, assignClip, removeClip, toggleClip, updateClip,
    launchScene, stopAllClips, fillSceneFromPads,

    // UI
    view, setView, showMixer, setShowMixer, showDevices, setShowDevices,
    showLib, setShowLib, showKitBrowser, setShowKitBrowser,
    showPadSet, setShowPadSet, settingsTab, setSettingsTab,
    showKeyboard, setShowKeyboard, padLvls, setPadLvls,
    activeKgNotes, dragActive, setDragActive, dragPad, setDragPad,
    onDragOver, onDragLeave, onDrop,

    // Keygroup
    playPadKeygroup, stopPadKeygroup,

    // Devices
    devices, setDevices, selIn, setSelIn, selOut, setSelOut,
    midiInputs, setMidiInputs, selMidi, setSelMidi,
    midiLearn, setMidiLearn, midiLearnPad, setMidiLearnPad,
    initMidi, startMidiLearn, cancelMidiLearn, clearMidiMap, getMidiMapping,

    // Velocity layers
    addVelocityLayer, removeVelocityLayer, updateVelocityLayer,

    // Kit
    saveKit,

    // Constants
    PAD_COUNT, PAD_KEY_LABELS, CHROMATIC_KEYS, PAD_COLORS,
    STEP_COUNTS, FORMAT_INFO, CHOP_MODES,
  };
}