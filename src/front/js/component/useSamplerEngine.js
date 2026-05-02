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

export const PAD_MODES = ['retrigger', 'polyphonic', 'choke'];

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
  // Per-pad persistent gain → pan → master chain (Bug #14)
  const padGainRef = useRef([]);   // GainNode[PAD_COUNT]
  const padPanRef  = useRef([]);   // StereoPannerNode[PAD_COUNT]
  // Source-tracking Map<key, Set<voice>> (Bug #8/#17)
  // key: padIndex (number) for pad voices, `kg_${note}` (string) for keygroup voices
  // voice: { source, gain, chain }
  const activeSourcesRef = useRef(new Map());
  const mediaRec = useRef(null);

  // ── Effect node caches (per-pad, created on demand) ──
  const reverbBufRef = useRef(null); // shared impulse response buffer
  const midiAccessRef = useRef(null);
  const midiMapRef = useRef({}); // { noteOrCC: padIndex }
  const roundRobinIdx = useRef({}); // { padIndex: currentLayerIndex }

  const initCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      masterRef.current = ctx.createGain();
      masterRef.current.connect(ctx.destination);

      // Build the persistent per-pad chain: gain → pan → master
      padGainRef.current = [];
      padPanRef.current = [];
      for (let i = 0; i < PAD_COUNT; i++) {
        const g = ctx.createGain();
        const p = ctx.createStereoPanner();
        g.gain.value = 0.8;
        p.pan.value = 0;
        g.connect(p);
        p.connect(masterRef.current);
        padGainRef.current.push(g);
        padPanRef.current.push(p);
      }
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
    if (pad.layers && pad.layers.length > 0) {
      if (pad.roundRobin) {
        const idx = (roundRobinIdx.current[pi] || 0) % pad.layers.length;
        roundRobinIdx.current[pi] = idx + 1;
        return pad.layers[idx].buffer || pad.buffer;
      }
      const sorted = [...pad.layers].sort((a, b) => (a.velLow || 0) - (b.velLow || 0));
      for (const layer of sorted) {
        if (vel >= (layer.velLow || 0) && vel <= (layer.velHigh || 1)) {
          return layer.buffer || pad.buffer;
        }
      }
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

  // ── Mixer state arrays (Bug #14) ──
  // Source of truth for the per-pad audio chain. Mute/solo are derived (effective gain),
  // not stored on the GainNode directly.
  const [padVolumes, setPadVolumes] = useState(() => Array(PAD_COUNT).fill(0.8));
  const [padPans, setPadPans]       = useState(() => Array(PAD_COUNT).fill(0));
  const [padMutes, setPadMutes]     = useState(() => Array(PAD_COUNT).fill(false));
  const [padSolos, setPadSolos]     = useState(() => Array(PAD_COUNT).fill(false));
  // Voice-mode per pad (Bug #13): retrigger | polyphonic | choke
  const [padModes, setPadModes]     = useState(() => Array(PAD_COUNT).fill('retrigger'));
  // Choke group per pad (1-8, or null) — only used when padMode === 'choke'
  const [padChokeGroups, setPadChokeGroups] = useState(() => Array(PAD_COUNT).fill(null));

  const setPadVolume = useCallback((i, v) => {
    setPadVolumes(prev => prev.map((x, idx) => idx === i ? v : x));
  }, []);
  const setPadPan = useCallback((i, v) => {
    setPadPans(prev => prev.map((x, idx) => idx === i ? v : x));
  }, []);
  const setPadMute = useCallback((i, b) => {
    setPadMutes(prev => prev.map((x, idx) => idx === i ? !!b : x));
  }, []);
  const setPadSolo = useCallback((i, b) => {
    setPadSolos(prev => prev.map((x, idx) => idx === i ? !!b : x));
  }, []);
  const setPadMode = useCallback((i, m) => {
    setPadModes(prev => prev.map((x, idx) => idx === i ? m : x));
  }, []);
  const setPadChokeGroup = useCallback((i, g) => {
    setPadChokeGroups(prev => prev.map((x, idx) => idx === i ? g : x));
  }, []);

  // ── Effective gain/pan → write to per-pad nodes (Bug #14) ──
  useEffect(() => {
    if (!padGainRef.current.length) return;
    const anySoloed = padSolos.some(Boolean);
    for (let i = 0; i < PAD_COUNT; i++) {
      const muted = padMutes[i];
      const soloed = padSolos[i];
      const eff = muted ? 0 : (anySoloed && !soloed) ? 0 : padVolumes[i];
      if (padGainRef.current[i]) padGainRef.current[i].gain.value = eff;
      if (padPanRef.current[i])  padPanRef.current[i].pan.value  = padPans[i];
    }
  }, [padVolumes, padPans, padMutes, padSolos]);

  // ── AudioContext unlock on first user interaction (Bug #6) ──
  // The browser starts AudioContext in "suspended" state until a user gesture.
  // Resume globally on the first mousedown / keydown / touchstart anywhere on the
  // document, so the very first pad-trigger has zero latency.
  useEffect(() => {
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try { initCtx(); } catch (e) { /* ignore */ }
      document.removeEventListener('mousedown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
    document.addEventListener('mousedown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    return () => {
      document.removeEventListener('mousedown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
  }, [initCtx]);

  // Transport
  const [bpm, setBpm] = useState(projectBpm);
  const bpmRef = useRef(projectBpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const [curStep, setCurStep] = useState(-1);
  const [looping, setLooping] = useState(true);
  const loopingRef = useRef(true);
  useEffect(() => { loopingRef.current = looping; }, [looping]);
  const [metOn, setMetOn] = useState(false);
  const metOnRef = useRef(false);
  useEffect(() => { metOnRef.current = metOn; }, [metOn]);
  const [swing, setSwing] = useState(0);
  const swingRef = useRef(0);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  const [masterVol, setMasterVol] = useState(0.8);

  // Sequencer
  const [stepCount, setStepCount] = useState(16);
  const stepCountRef = useRef(16);
  useEffect(() => { stepCountRef.current = stepCount; }, [stepCount]);
  const [patterns, setPatterns] = useState([createDefaultPattern()]);
  const patternsRef = useRef(null);
  useEffect(() => { patternsRef.current = patterns; }, [patterns]);
  const [curPatIdx, setCurPatIdx] = useState(0);
  const curPatIdxRef = useRef(0);
  useEffect(() => { curPatIdxRef.current = curPatIdx; }, [curPatIdx]);
  const [loopStartStep, setLoopStartStep] = useState(0);
  const loopStartRef = useRef(0);
  useEffect(() => { loopStartRef.current = loopStartStep; }, [loopStartStep]);
  const [loopEndStep, setLoopEndStep] = useState(null);
  const loopEndRef = useRef(null);
  useEffect(() => { loopEndRef.current = loopEndStep; }, [loopEndStep]);
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
  // Ref for playPad so tick() always calls the latest version
  const playPadRef = useRef(null);

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
  // (stopPad/stopAll are defined first because playPad needs them
  //  for retrigger / choke logic — Bug #13)
  // ═══════════════════════════════════════════════════════════

  const stopPad = useCallback((pi, immediate = false) => {
    const set = activeSourcesRef.current.get(pi);
    if (!set || set.size === 0) return;
    const ctx = ctxRef.current;
    const release = immediate ? 0.005 : (pads[pi]?.release || 0.1);
    set.forEach(v => {
      try {
        if (ctx) {
          const t = ctx.currentTime;
          if (v.gain) {
            v.gain.gain.cancelScheduledValues(t);
            v.gain.gain.setValueAtTime(v.gain.gain.value, t);
            v.gain.gain.linearRampToValueAtTime(0, t + release);
          }
          v.source.stop(t + release + 0.02);
        } else {
          v.source.stop();
        }
      } catch (e) {}
    });
  }, [pads]);

  const stopAll = useCallback(() => {
    activeSourcesRef.current.forEach((set) => {
      set.forEach(v => {
        try { v.source.stop(); } catch (e) {}
      });
    });
    activeSourcesRef.current.clear();
    setActivePads(new Set());
    setActiveKgNotes(new Set());
  }, []);

  const playPad = useCallback((pi, vel = 0.8) => {
    const pad = pads[pi];
    if (!pad?.buffer && (!pad?.layers || pad.layers.length === 0)) return;
    if (padMutes[pi]) return;
    const anySoloed = padSolos.some(Boolean);
    if (anySoloed && !padSolos[pi]) return;

    const ctx = initCtx();

    // ── Voice mode (Bug #13) ──
    const mode = padModes[pi] || 'retrigger';
    if (mode === 'retrigger') {
      stopPad(pi, true);
    } else if (mode === 'choke') {
      const grp = padChokeGroups[pi];
      if (grp != null) {
        for (let i = 0; i < PAD_COUNT; i++) {
          if (padChokeGroups[i] === grp) stopPad(i, true);
        }
      } else {
        // Choke mode without group → behaves like retrigger
        stopPad(pi, true);
      }
    }
    // 'polyphonic': do nothing — let voices stack

    const buffer = selectLayerBuffer(pad, pi, vel);
    if (!buffer) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Pitch / Time-stretch
    if (pad.timeStretch && pad.stretchMode === 'stretch' && pad.originalBpm > 0) {
      const stretchRate = bpm / pad.originalBpm;
      src.playbackRate.value = stretchRate;
      const pitchCompCents = -Math.log2(stretchRate) * 1200;
      src.detune.value = pitchCompCents + (pad.pitch * 100);
    } else {
      src.playbackRate.value = Math.pow(2, pad.pitch / 12);
    }

    if (pad.playMode === 'loop') {
      src.loop = true;
      src.loopStart = pad.trimStart || 0;
      src.loopEnd = pad.trimEnd || buffer.duration;
    }

    // ── Per-voice signal chain ──
    // src → [filter] → adsrGain → padGainRef[pi] → padPanRef[pi] → master → destination
    // Wet sends (delay/reverb) tap padPanRef[pi] so they ride per-pad volume + pan.
    const chain = [];
    const now = ctx.currentTime;
    // ADSR peak = velocity only — per-pad GainNode owns the mix volume.
    const peakVol = vel;

    const adsrGain = ctx.createGain();
    adsrGain.gain.setValueAtTime(0, now);
    adsrGain.gain.linearRampToValueAtTime(peakVol, now + pad.attack);
    adsrGain.gain.linearRampToValueAtTime(peakVol * pad.sustain, now + pad.attack + pad.decay);
    chain.push(adsrGain);

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

    lastNode.connect(adsrGain);
    adsrGain.connect(padGainRef.current[pi]);
    // padGainRef[pi] → padPanRef[pi] → master is wired in initCtx

    const padOut = padPanRef.current[pi];

    // Delay send
    if (pad.delayOn && pad.delayMix > 0) {
      const delayNode = ctx.createDelay(2.0);
      delayNode.delayTime.value = pad.delayTime || 0.3;
      const fb = ctx.createGain();
      fb.gain.value = Math.min(0.95, pad.delayFeedback || 0.3);
      const wet = ctx.createGain();
      wet.gain.value = pad.delayMix || 0.2;
      delayNode.connect(fb);
      fb.connect(delayNode);
      padOut.connect(delayNode);
      delayNode.connect(wet);
      wet.connect(masterRef.current);
      chain.push(delayNode, fb, wet);
    }

    // Reverb send
    if (pad.reverbOn && pad.reverbMix > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = getReverbImpulse(2, 2.5);
      const wet = ctx.createGain();
      wet.gain.value = pad.reverbMix || 0.2;
      padOut.connect(conv);
      conv.connect(wet);
      wet.connect(masterRef.current);
      chain.push(conv, wet);
    }

    // ── Start playback (Bug #7: explicit currentTime) ──
    const start = pad.trimStart || 0;
    const dur = (pad.trimEnd || buffer.duration) - start;
    src.start(ctx.currentTime, start, pad.playMode === 'loop' ? undefined : dur + pad.release);

    if (pad.playMode === 'oneshot') {
      adsrGain.gain.setValueAtTime(peakVol * pad.sustain, now + dur);
      adsrGain.gain.linearRampToValueAtTime(0, now + dur + pad.release);
    }

    // ── Track voice (Bug #8 / #17) ──
    const voice = { source: src, gain: adsrGain, chain };
    if (!activeSourcesRef.current.has(pi)) activeSourcesRef.current.set(pi, new Set());
    activeSourcesRef.current.get(pi).add(voice);

    setActivePads(p => new Set(p).add(pi));
    src.onended = () => {
      try { chain.forEach(n => n.disconnect()); } catch (e) {}
      try { src.disconnect(); } catch (e) {}
      const set = activeSourcesRef.current.get(pi);
      if (set) {
        set.delete(voice);
        if (set.size === 0) {
          activeSourcesRef.current.delete(pi);
          setActivePads(p => { const n = new Set(p); n.delete(pi); return n; });
        }
      }
    };
  }, [pads, padMutes, padSolos, padModes, padChokeGroups, bpm, initCtx, stopPad, selectLayerBuffer, getReverbImpulse]);

  // ── Keep playPadRef in sync so tick() always calls latest playPad ──
  useEffect(() => { playPadRef.current = playPad; }, [playPad]);

  // ═══════════════════════════════════════════════════════════
  // SEQUENCER — All reads inside tick() use refs, never closures
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

  const stopSeq = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurStep(-1);
    stepRef.current = -1;
    if (seqRef.current) {
      clearTimeout(seqRef.current);
      seqRef.current = null;
    }
    // Stop all currently playing samples (Bug #17)
    activeSourcesRef.current.forEach((set) => {
      set.forEach(v => {
        try { v.source.stop(); } catch (e) {}
      });
    });
    activeSourcesRef.current.clear();
    setActivePads(new Set());
  }, []);

  const startSeq = useCallback(() => {
    const ctx = initCtx();

    // ── CRITICAL FIX: Clean up any stale state from previous runs ──
    if (seqRef.current) {
      clearTimeout(seqRef.current);
      seqRef.current = null;
    }
    if (playingRef.current) {
      playingRef.current = false;
    }

    playingRef.current = true;
    setIsPlaying(true);
    stepRef.current = (loopStartRef.current || 0) - 1;

    const tick = () => {
      if (!playingRef.current) return;

      const sc = stepCountRef.current;
      const end = loopEndRef.current ?? sc;
      const start = loopStartRef.current || 0;

      let next = stepRef.current + 1;
      if (next >= end) {
        if (loopingRef.current) {
          next = start;
        } else {
          playingRef.current = false;
          setIsPlaying(false);
          setCurStep(-1);
          stepRef.current = -1;
          return;
        }
      }
      stepRef.current = next;
      setCurStep(next);

      const pat = patternsRef.current?.[curPatIdxRef.current];
      if (pat) {
        for (let pi = 0; pi < PAD_COUNT; pi++) {
          if (pat.steps[pi]?.[next]) {
            playPadRef.current?.(pi, pat.velocities[pi]?.[next] ?? 0.8);
          }
        }
      }

      if (metOnRef.current && next % 4 === 0) {
        try {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = next % 16 === 0 ? 1000 : 800;
          g.gain.value = 0.15;
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          o.connect(g); g.connect(ctx.destination);
          o.start(); o.stop(ctx.currentTime + 0.04);
        } catch (e) {}
      }

      const baseInterval = (60 / bpmRef.current) / 4 * 1000;
      const sw = swingRef.current || 0;
      const swingOffset = next % 2 === 1 ? baseInterval * (sw / 200) : 0;
      seqRef.current = setTimeout(tick, baseInterval + swingOffset);
    };

    seqRef.current = setTimeout(tick, 10);
  }, [initCtx]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      stopSeq();
    } else {
      startSeq();
    }
  }, [startSeq, stopSeq]);

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
    if (!playingRef.current) startSeq();
  }, [initCtx, startSeq]);

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

      // Compute effective per-pad mix from mixer state
      const anySoloed = padSolos.some(Boolean);
      for (let pi = 0; pi < PAD_COUNT; pi++) {
        const pad = pads[pi];
        if (!pad?.buffer) continue;
        const muted = padMutes[pi];
        const soloed = padSolos[pi];
        const eff = muted ? 0 : (anySoloed && !soloed) ? 0 : padVolumes[pi];
        if (eff === 0) continue;
        for (let si = 0; si < stepCount; si++) {
          if (!pat.steps[pi]?.[si]) continue;
          const src = offCtx.createBufferSource();
          src.buffer = pad.buffer;
          src.playbackRate.value = Math.pow(2, pad.pitch / 12);
          const g = offCtx.createGain();
          g.gain.value = eff * (pat.velocities[pi]?.[si] ?? 0.8);
          const p = offCtx.createStereoPanner();
          p.pan.value = padPans[pi];
          src.connect(g); g.connect(p); p.connect(offCtx.destination);
          src.start(si * stepDur, pad.trimStart || 0);
        }
      }

      const rendered = await offCtx.startRendering();

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
  }, [exporting, patterns, curPatIdx, stepCount, bpm, pads, padVolumes, padPans, padMutes, padSolos, onExport]);

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
    if (!songSeq || !songSeq.length) {
      setExportStatus('No song sequence defined');
      return;
    }
    let seqIdx = 0;
    setExportStatus('Song mode: playing');
    const playNext = () => {
      if (seqIdx >= songSeq.length) {
        setExportStatus('Song complete');
        return;
      }
      const entry = songSeq[seqIdx];
      const patIdx = typeof entry === 'number' ? entry : entry.patternIndex ?? 0;
      const reps   = typeof entry === 'object' ? (entry.repeats ?? 1) : 1;
      let rep = 0;
      const playRep = () => {
        if (rep >= reps) { seqIdx++; playNext(); return; }
        rep++;
        if (setCurPatIdx) setCurPatIdx(patIdx);
        const pat = patterns[patIdx];
        if (!pat) { seqIdx++; playNext(); return; }
        const stepsCount = pat.steps?.length || steps;
        const durMs = (60000 / bpm) / 4 * stepsCount;
        setTimeout(playRep, durMs);
      };
      playRep();
    };
    playNext();
  }, [songSeq, patterns, steps, bpm, setCurPatIdx]);

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
    if (padMutes[pi]) return;
    const ctx = initCtx();
    const semitones = note - (pad.rootNote || 60) + pad.pitch;
    const src = ctx.createBufferSource();
    src.buffer = pad.buffer;
    src.playbackRate.value = Math.pow(2, semitones / 12);
    const g = ctx.createGain();
    g.gain.value = vel; // padGainRef supplies the pad-mix volume
    src.connect(g);
    g.connect(padGainRef.current[pi]);
    src.start(ctx.currentTime, pad.trimStart || 0);
    setActiveKgNotes(p => new Set(p).add(note));

    const key = `kg_${note}`;
    const voice = { source: src, gain: g, chain: [g] };
    if (!activeSourcesRef.current.has(key)) activeSourcesRef.current.set(key, new Set());
    activeSourcesRef.current.get(key).add(voice);

    src.onended = () => {
      try { g.disconnect(); src.disconnect(); } catch (e) {}
      const set = activeSourcesRef.current.get(key);
      if (set) {
        set.delete(voice);
        if (set.size === 0) activeSourcesRef.current.delete(key);
      }
      setActiveKgNotes(p => { const n = new Set(p); n.delete(note); return n; });
    };
  }, [pads, padMutes, initCtx]);

  const stopPadKeygroup = useCallback((pi, note) => {
    const key = `kg_${note}`;
    const set = activeSourcesRef.current.get(key);
    if (!set) return;
    set.forEach(v => {
      try { v.source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.delete(key);
    setActiveKgNotes(p => { const n = new Set(p); n.delete(note); return n; });
  }, []);

  // ═══════════════════════════════════════════════════════════
  // BPM / KEY ANALYSIS (real — AudioAnalysis.js)
  // ═══════════════════════════════════════════════════════════

  const analyzePadSample = useCallback((pi) => {
    const buf = pads[pi]?.buffer;
    if (!buf) return;
    setAnalyzing(true);
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

      const anySoloed = padSolos.some(Boolean);
      for (let pi = 0; pi < PAD_COUNT; pi++) {
        const pad = pads[pi];
        if (!pad?.buffer) continue;
        const muted = padMutes[pi];
        const soloed = padSolos[pi];
        const eff = muted ? 0 : (anySoloed && !soloed) ? 0 : padVolumes[pi];
        if (eff === 0) continue;
        for (let si = 0; si < stepCount; si++) {
          if (!pat.steps[pi]?.[si]) continue;
          const src = offCtx.createBufferSource();
          src.buffer = pad.buffer;
          src.playbackRate.value = Math.pow(2, pad.pitch / 12);
          const g = offCtx.createGain();
          g.gain.value = eff * (pat.velocities[pi]?.[si] ?? 0.8);
          const p = offCtx.createStereoPanner();
          p.pan.value = padPans[pi];
          src.connect(g); g.connect(p); p.connect(offCtx.destination);
          src.start(si * stepDur, pad.trimStart || 0);
        }
      }

      const rendered = await offCtx.startRendering();
      onSendToArrange(rendered, `Beat ${bpm}bpm`);
      setExportStatus('✓ Bounced to Arrange');
    } catch (e) {
      setExportStatus('✗ Bounce failed');
    }
  }, [patterns, curPatIdx, stepCount, bpm, pads, padVolumes, padPans, padMutes, padSolos, onSendToArrange]);

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

      access.inputs.forEach(input => {
        input.onmidimessage = (e) => handleMidiMessage(e);
      });

      access.onstatechange = () => {
        const updated = [];
        access.inputs.forEach(input => updated.push(input));
        setMidiInputs(updated.map(i => ({ id: i.id, name: i.name || 'MIDI Device' })));
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

    if (msgType === 0x90 && data2 > 0) {
      const vel = data2 / 127;
      const noteKey = `note_${data1}`;

      if (midiLearn && midiLearnPad !== null) {
        midiMapRef.current[noteKey] = midiLearnPad;
        setMidiLearn(false);
        setMidiLearnPad(null);
        return;
      }

      const mappedPad = midiMapRef.current[noteKey];
      if (mappedPad !== undefined && mappedPad < PAD_COUNT) {
        const pad = pads[mappedPad];
        if (pad?.buffer) {
          initCtx();
          playPad(mappedPad, vel);
        }
      } else {
        const padIdx = data1 - 36;
        if (padIdx >= 0 && padIdx < PAD_COUNT) {
          playPad(padIdx, vel);
        }
      }
    }

    if (msgType === 0x80 || (msgType === 0x90 && data2 === 0)) {
      const noteKey = `note_${data1}`;
      const mappedPad = midiMapRef.current[noteKey];
      const padIdx = mappedPad !== undefined ? mappedPad : data1 - 36;
      if (padIdx >= 0 && padIdx < PAD_COUNT && pads[padIdx]?.playMode === 'hold') {
        stopPad(padIdx);
      }
    }

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
    ctxRef, masterRef, initCtx,
    // Per-pad audio nodes (Bug #14)
    padGainRef, padPanRef,
    // Source tracker (Bug #8 / #17). Backwards-compat alias `activeSrc` for older callers.
    activeSourcesRef,
    activeSrc: activeSourcesRef,

    // Pads
    pads, setPads, selectedPad, setSelectedPad, activePads, updatePad, clearPad,
    loadSample, playPad, stopPad, stopAll, fileSelect,

    // Mixer state arrays + setters (Bug #14)
    padVolumes, padPans, padMutes, padSolos,
    setPadVolumes, setPadPans, setPadMutes, setPadSolos,
    setPadVolume, setPadPan, setPadMute, setPadSolo,

    // Voice mode + choke groups (Bug #13)
    padModes, padChokeGroups,
    setPadModes, setPadChokeGroups,
    setPadMode, setPadChokeGroup,

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
    STEP_COUNTS, FORMAT_INFO, CHOP_MODES, PAD_MODES,
  };
}
