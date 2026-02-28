// =============================================================================
// SamplerBeatMaker.js — Complete Beat Maker / Sampler (Phase 1 + 2 + 3)
// =============================================================================
// 16-pad MPC-style sampler with step sequencer, live recording, chop view,
// pattern management, mixer, per-pad effects, song mode/sequence builder,
// mic/line-in sampling, MIDI controller support, sound library, export
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SamplerInstrument from './SamplerInstrument';
import DrumKitConnector from './DrumKitConnector';
import { detectBPM, detectKey, analyzeAudio } from './AudioAnalysis';
import '../../styles/SamplerBeatMaker.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const KEY_TO_PAD = {
  '1': 0, '2': 1, '3': 2, '4': 3,
  'q': 4, 'w': 5, 'e': 6, 'r': 7,
  'a': 8, 's': 9, 'd': 10, 'f': 11,
  'z': 12, 'x': 13, 'c': 14, 'v': 15,
};

const PAD_KEY_LABELS = [
  '1', '2', '3', '4', 'Q', 'W', 'E', 'R',
  'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V',
];

const PAD_COLORS = [
  '#ff4444', '#ff6b35', '#ffa500', '#ffd700',
  '#00ffc8', '#00d4ff', '#4a9eff', '#7b68ee',
  '#ff69b4', '#ff1493', '#c840e9', '#9370db',
  '#32cd32', '#00fa9a', '#40e0d0', '#87ceeb',
];

const DEFAULT_PAD = {
  name: 'Empty', buffer: null,
  volume: 0.8, pitch: 0, pan: 0,
  trimStart: 0, trimEnd: null,
  playMode: 'oneshot', reverse: false,
  muted: false, soloed: false,
  // Program type: drum | keygroup | clip
  programType: 'drum',
  // Effects
  filterOn: false, filterType: 'lowpass', filterFreq: 2000, filterQ: 1,
  reverbOn: false, reverbMix: 0.3,
  delayOn: false, delayTime: 0.25, delayFeedback: 0.3, delayMix: 0.2,
  distortionOn: false, distortionAmt: 20,
  // Full ADSR envelope
  attack: 0, decay: 0, sustain: 1.0, release: 0,
  // Phase 2: Velocity layers (up to 4)
  layers: [], roundRobin: false, roundRobinIdx: 0,
  // Phase 3: Keygroup
  rootNote: 60, keyRangeLow: 36, keyRangeHigh: 84,
  // Phase 4: Time stretch
  originalBpm: 0, timeStretch: false, stretchMode: 'repitch', pitchShift: 0,
  // Phase 5: Clip launcher
  clipPlaying: false, clipQueued: false, clipLoopStart: 0, clipLoopEnd: null,
  clipColor: null, clipName: '',
  normalized: false,
};

const STEP_COUNTS = [16, 32, 64];

const SOUND_LIBRARY = {
  'Trap Kit': [
    '808 Deep', '808 Distorted', 'Kick Hard', 'Snare Tight',
    'HH Closed', 'HH Open', 'HH Roll', 'Clap',
    'Rim', 'Perc 1', 'Crash', 'Vox Chop',
  ],
  'Boom Bap Kit': [
    'Kick Dusty', 'Snare Vinyl', 'HH Tight', 'Open Hat',
    'Shaker', 'Kick Alt', 'Snare Ghost', 'Ride',
  ],
  'R&B Kit': [
    'Kick Soft', 'Snare Brush', 'HH Light', 'Rim Click',
    'Fingersnap', 'Shaker', 'Tambourine', 'Clap Soft',
  ],
  'Lo-Fi Kit': [
    'Kick Muffled', 'Snare Tape', 'HH Dusty', 'Vinyl Crackle',
    'Perc Warm', 'Rim Soft',
  ],
  'EDM Kit': [
    'Kick Big', 'Clap Layer', 'HH Sharp', 'Open Hat',
    'Crash', 'Snare Build', 'Riser', 'Impact',
  ],
  'Afrobeats Kit': [
    'Kick Log', 'Snare Wire', 'Shaker', 'Bell',
    'Conga High', 'Conga Low', 'Guiro', 'Perc',
  ],
};

const mkPattern = (n, sc) => ({
  name: n || 'Pattern 1',
  steps: Array.from({ length: 16 }, () => Array(sc || 16).fill(false)),
  velocities: Array.from({ length: 16 }, () => Array(sc || 16).fill(0.8)),
  stepCount: sc || 16,
});

// ── Zero-crossing snap helper (prevents clicks on chop points) ──
const findZeroCrossing = (data, sampleIdx, range = 512) => {
  const start = Math.max(0, sampleIdx - range);
  const end = Math.min(data.length - 1, sampleIdx + range);
  let closest = sampleIdx, minDist = range + 1;
  for (let i = start; i < end - 1; i++) {
    if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
      const dist = Math.abs(i - sampleIdx);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
  }
  return closest;
};

// ── RMS level calculation (Fix #4: proper loudness metering) ──
const calcRMS = (analyser) => {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
};

const CHROMATIC_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHOP_MODES = ['transient', 'bpmgrid', 'equal', 'manual'];

// =============================================================================
// COMPONENT
// =============================================================================

const SamplerBeatMaker = ({
  onExport, onClose, isEmbedded = false, stemSeparatorOutput = null,
  // ── SPX Flow Integration ──
  onSendToArrange,
  onOpenSampler,       // DEPRECATED: Sampler is now built-in
  incomingSample,
  incomingSlices,
  // ── NEW: Project Context (from RecordingStudio) ──
  projectBpm,          // number — project tempo from RecordingStudio
  projectKey,          // string — detected/set key (e.g. 'C', 'D#')
  projectScale,        // string — 'major' | 'minor'
  onBpmSync,           // (bpm) => void — sync detected BPM back to project
  onKeySync,           // (key, scale) => void — sync detected key back to project
  projectId,           // string — for drum kit persistence
  // ── NEW: Export to Arrange with MIDI ──
  onExportToArrange,   // (midiNotes) => void — send MIDI pattern to Arrange
}) => {

  // ==== AUDIO ENGINE REFS ====
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const metGainRef = useRef(null);
  const activeSrc = useRef({});
  const reverbBuf = useRef(null);
  const mediaStream = useRef(null);
  const mediaRec = useRef(null);
  const recChunks = useRef([]);
  const blobUrls = useRef([]); // Fix #3: track blob URLs for cleanup
  const reverbBufCache = useRef({}); // Fix #10: cache reverb IR per decay

  // ==== PADS ====
  const [pads, setPads] = useState(
    Array.from({ length: 16 }, (_, i) => ({ ...DEFAULT_PAD, id: i, color: PAD_COLORS[i] }))
  );
  const [activePads, setActivePads] = useState(new Set());
  const [selectedPad, setSelectedPad] = useState(null);
  const [padBank, setPadBank] = useState('A');
  const [padBanks] = useState({ A: null, B: null, C: null, D: null });

  // ==== PATTERNS (Phase 2) ====
  const [patterns, setPatterns] = useState([mkPattern('Pattern 1', 16)]);
  const [curPatIdx, setCurPatIdx] = useState(0);
  const [steps, setSteps] = useState(patterns[0].steps);
  const [stepVel, setStepVel] = useState(patterns[0].velocities);
  const [stepCount, setStepCount] = useState(16);

  // ==== SONG MODE (Phase 3) ====
  const [songMode, setSongMode] = useState(false);
  const [songSeq, setSongSeq] = useState([]);
  const [songPos, setSongPos] = useState(-1);
  const [songPlaying, setSongPlaying] = useState(false);

  // ==== SAMPLE EDITOR (SamplerInstrument integration) ====
  const [showSampleEditor, setShowSampleEditor] = useState(false);
  const [sampleEditorPad, setSampleEditorPad] = useState(null);

  // ==== DRUM KIT BROWSER (DrumKitConnector integration) ====
  const [showKitBrowser, setShowKitBrowser] = useState(false);

  // ==== AUDIO ANALYSIS (BPM + Key detection) ====
  const [detectedBpm, setDetectedBpm] = useState(null);
  const [detectedKey, setDetectedKey] = useState(null);
  const [bpmConfidence, setBpmConfidence] = useState(0);
  const [keyConfidence, setKeyConfidence] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [bpmCandidates, setBpmCandidates] = useState([]);
  const [keyCandidates, setKeyCandidates] = useState([]);
  const [autoSyncBpm, setAutoSyncBpm] = useState(false); // auto-sync detected BPM to sequencer


  // ==== TRANSPORT ====
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(140);
  const [swing, setSwing] = useState(0);
  const [metOn, setMetOn] = useState(false);
  const [masterVol, setMasterVol] = useState(0.8);
  const [looping, setLooping] = useState(true);
  const [curStep, setCurStep] = useState(-1);

  // ==== LOOP RANGE (bar selection for partial loop) ====
  const [loopStartStep, setLoopStartStep] = useState(0);
  const [loopEndStep, setLoopEndStep] = useState(null); // null = loop entire pattern

  // ==== LIVE RECORDING (Phase 2) ====
  const [liveRec, setLiveRec] = useState(false);
  const [overdub, setOverdub] = useState(false);
  const [recHits, setRecHits] = useState([]);
  const [quantVal, setQuantVal] = useState('1/16');
  const recStartT = useRef(0);

  // ==== MIC RECORDING ====
  const [micRec, setMicRec] = useState(false);
  const [micPad, setMicPad] = useState(null);
  const [micCount, setMicCount] = useState(0);

  // ==== CHOP VIEW (Phase 2) ====
  const [showChop, setShowChop] = useState(false);
  const [chopIdx, setChopIdx] = useState(null);
  const [chopPts, setChopPts] = useState([]);
  const [chopSens, setChopSens] = useState(0.3);
  const chopCanvas = useRef(null);
  const [chopMode, setChopMode] = useState('transient');
  const [chopSlices, setChopSlices] = useState(8);
  const [zeroCrossSnap, setZeroCrossSnap] = useState(true);

  // ==== MIXER (Phase 2) ====
  const [showMixer, setShowMixer] = useState(false);
  const [padLvls, setPadLvls] = useState(Array(16).fill(0));

  // ==== AUDIO DEVICES ====
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [selOut, setSelOut] = useState('default');
  const [selIn, setSelIn] = useState('default');
  const [showDevices, setShowDevices] = useState(false);

  // ==== SOUND LIBRARY (Phase 2) ====
  const [showLib, setShowLib] = useState(false);
  const [selKit, setSelKit] = useState(null);

  // ==== PHASE 2-5 STATE ====
  const [keygroupMode, setKeygroupMode] = useState(false);
  const [exportBitDepth, setExportBitDepth] = useState(16);
  const [activeKgNotes, setActiveKgNotes] = useState(new Set()); // Phase 3: active keygroup notes
  const [showKeyboard, setShowKeyboard] = useState(false); // Phase 3: visual keyboard

  // ==== PHASE 5: Clip Launcher STATE ====
  const [showClipLauncher, setShowClipLauncher] = useState(false);
  const [scenes, setScenes] = useState(() => Array.from({ length: 4 }, (_, i) => ({
    name: `Scene ${i + 1}`, clips: Array(16).fill(null), // null = empty slot
  })));
  const [clipStates, setClipStates] = useState({}); // key: `${sceneIdx}_${padIdx}` → 'stopped'|'playing'|'queued'
  const [activeScene, setActiveScene] = useState(-1);
  const clipSources = useRef({}); // active clip audio sources

  // ==== MIDI (Phase 3) ====
  const [midiInputs, setMidiInputs] = useState([]);
  const [selMidi, setSelMidi] = useState(null);
  const [midiLearn, setMidiLearn] = useState(false);
  const [midiLearnPad, setMidiLearnPad] = useState(null);
  const [midiMap, setMidiMap] = useState({});

  // ==== CUSTOM KITS (Phase 3) ====
  const [savedKits, setSavedKits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spx_kits') || '[]'); } catch { return []; }
  });

  // ==== UI ====
  const [view, setView] = useState('split');
  const [showPadSet, setShowPadSet] = useState(false);
  const [settingsTab, setSettingsTab] = useState('main');
  const [dragPad, setDragPad] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('wav');
  const [exportQuality, setExportQuality] = useState(192); // kbps for mp3
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const lameRef = useRef(null);
  const tapTimes = useRef([]);

  // ==== SEQUENCER REFS ====
  const seqTimer = useRef(null);
  const nextStepT = useRef(0);
  const curStepRef = useRef(-1);
  const playingRef = useRef(false);
  const stepsRef = useRef(steps);
  const padsRef = useRef(pads);
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  const scRef = useRef(stepCount);
  const metRef = useRef(metOn);
  const loopRef = useRef(looping);
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(null);
  const liveRef = useRef(liveRec);
  const songRef = useRef(songMode);
  const songSeqRef = useRef(songSeq);
  const patsRef = useRef(patterns);
  const patIdxRef = useRef(curPatIdx);

  useEffect(() => { stepsRef.current = steps; }, [steps]);
  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { scRef.current = stepCount; }, [stepCount]);
  useEffect(() => { metRef.current = metOn; }, [metOn]);
  useEffect(() => { loopRef.current = looping; }, [looping]);
  useEffect(() => { loopStartRef.current = loopStartStep; }, [loopStartStep]);
  useEffect(() => { loopEndRef.current = loopEndStep; }, [loopEndStep]);
  // Reset loop range when step count changes
  useEffect(() => { setLoopStartStep(0); setLoopEndStep(null); }, [stepCount]);
  useEffect(() => { liveRef.current = liveRec; }, [liveRec]);
  useEffect(() => { songRef.current = songMode; }, [songMode]);
  useEffect(() => { songSeqRef.current = songSeq; }, [songSeq]);
  useEffect(() => { patsRef.current = patterns; }, [patterns]);
  useEffect(() => { patIdxRef.current = curPatIdx; }, [curPatIdx]);

  // Sync pattern ↔ steps
  useEffect(() => {
    if (patterns[curPatIdx]) {
      setSteps(patterns[curPatIdx].steps);
      setStepVel(patterns[curPatIdx].velocities);
      setStepCount(patterns[curPatIdx].stepCount);
    }
  }, [curPatIdx, patterns]);

  useEffect(() => {
    setPatterns(prev => {
      const u = [...prev];
      if (u[curPatIdx]) u[curPatIdx] = { ...u[curPatIdx], steps, velocities: stepVel, stepCount };
      return u;
    });
  }, [steps, stepVel, stepCount]);

  // =========================================================================
  // AUDIO INIT
  // =========================================================================

  // Fix #10: Cache reverb IR per decay value (deterministic bounce)
  const getReverbIR = useCallback((ctx, decay = 2.0) => {
    const key = decay.toFixed(1);
    if (reverbBufCache.current[key]) return reverbBufCache.current[key];
    const len = ctx.sampleRate * decay;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    reverbBufCache.current[key] = ir;
    return ir;
  }, []);

  const initCtx = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') return ctxRef.current;
    const c = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive', sampleRate: 44100 });
    const mg = c.createGain(); mg.gain.value = masterVol; mg.connect(c.destination); masterRef.current = mg;
    const met = c.createGain(); met.gain.value = 0.3; met.connect(c.destination); metGainRef.current = met;
    ctxRef.current = c;
    return c;
  }, [masterVol]);

  // =========================================================================
  // DEVICE DETECTION
  // =========================================================================

  useEffect(() => {
    const detect = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => { });
        const d = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          inputs: d.filter(x => x.kind === 'audioinput').map(x => ({ id: x.deviceId, label: x.label || `Input ${x.deviceId.slice(0, 8)}` })),
          outputs: d.filter(x => x.kind === 'audiooutput').map(x => ({ id: x.deviceId, label: x.label || `Output ${x.deviceId.slice(0, 8)}` })),
        });
      } catch (e) { console.error('Device error:', e); }
    };
    detect();
    navigator.mediaDevices?.addEventListener('devicechange', detect);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', detect);
  }, []);

  useEffect(() => { const c = ctxRef.current; if (c && selOut !== 'default' && c.setSinkId) c.setSinkId(selOut).catch(() => { }); }, [selOut]);
  useEffect(() => { if (masterRef.current) masterRef.current.gain.value = masterVol; }, [masterVol]);

  // =========================================================================
  // MIDI (Phase 3)
  // =========================================================================

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false }).then(acc => {
      const ins = []; acc.inputs.forEach(i => ins.push(i)); setMidiInputs(ins);
      acc.onstatechange = () => { const n = []; acc.inputs.forEach(i => n.push(i)); setMidiInputs(n); };
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!selMidi) return;
    const handle = (msg) => {
      const [st, note, vel] = msg.data;
      const noteOn = (st & 0xF0) === 0x90 && vel > 0;
      const noteOff = (st & 0xF0) === 0x80 || ((st & 0xF0) === 0x90 && vel === 0);
      if (midiLearn && midiLearnPad !== null && noteOn) {
        setMidiMap(p => ({ ...p, [note]: midiLearnPad }));
        setMidiLearn(false); setMidiLearnPad(null); return;
      }

      // Phase 3: Check if any pad is set to keygroup and note is in its range
      const kgPads = padsRef.current
        .map((p, i) => ({ pad: p, idx: i }))
        .filter(({ pad }) => pad.programType === 'keygroup' && pad.buffer &&
          note >= (pad.keyRangeLow || 0) && note <= (pad.keyRangeHigh || 127));

      if (kgPads.length > 0) {
        if (noteOn) {
          const v = vel / 127;
          kgPads.forEach(({ idx }) => playPadKeygroup(idx, note, v));
          if (liveRef.current && ctxRef.current)
            setRecHits(p => [...p, { pad: kgPads[0].idx, time: ctxRef.current.currentTime - recStartT.current, velocity: vel / 127, midiNote: note }]);
        } else if (noteOff) {
          kgPads.forEach(({ idx }) => stopPadKeygroup(idx, note));
        }
        return; // keygroup handled, don't fall through to drum mode
      }

      // Drum mode: standard pad mapping
      const pi = midiMap[note]; if (pi === undefined) return;
      if (noteOn) {
        const v = vel / 127; playPad(pi, v);
        if (liveRef.current && ctxRef.current) setRecHits(p => [...p, { pad: pi, time: ctxRef.current.currentTime - recStartT.current, velocity: v }]);
      } else if (noteOff && padsRef.current[pi]?.playMode === 'hold') stopPad(pi);
    };
    selMidi.onmidimessage = handle;
    return () => { selMidi.onmidimessage = null; };
  }, [selMidi, midiMap, midiLearn, midiLearnPad, playPad, stopPad, playPadKeygroup, stopPadKeygroup]);

  // =========================================================================
  // SAMPLE LOADING
  // =========================================================================

  const loadSample = useCallback(async (pi, file) => {
    const c = initCtx();
    try {
      let ab;
      if (file instanceof File || file instanceof Blob) ab = await file.arrayBuffer();
      else if (typeof file === 'string') { const r = await fetch(file); ab = await r.arrayBuffer(); }
      else if (file instanceof AudioBuffer) {
        setPads(p => { const u = [...p]; u[pi] = { ...u[pi], name: `Sample ${pi + 1}`, buffer: file, trimEnd: file.duration }; return u; });
        analyzeOnLoad(pi, file);
        return;
      }
      const buf = await c.decodeAudioData(ab);
      const name = file.name ? file.name.replace(/\.[^/.]+$/, '') : typeof file === 'string' ? file.split('/').pop().replace(/\.[^/.]+$/, '') : `Sample ${pi + 1}`;
      setPads(p => { const u = [...p]; u[pi] = { ...u[pi], name, buffer: buf, trimEnd: buf.duration }; return u; });
      analyzeOnLoad(pi, buf);
    } catch (e) { console.error(`Load pad ${pi} failed:`, e); }
  }, [initCtx, analyzeOnLoad]);

  // Load stem separator output
  useEffect(() => {
    if (stemSeparatorOutput?.length > 0) stemSeparatorOutput.forEach((s, i) => { if (i < 16 && s.url) loadSample(i, s.url); });
  }, [stemSeparatorOutput, loadSample]);

  // ── SPX Flow: Receive sample from Sampler ──
  const lastIncomingRef = useRef(null);
  useEffect(() => {
    if (incomingSample && incomingSample.timestamp !== lastIncomingRef.current) {
      lastIncomingRef.current = incomingSample.timestamp;
      const pi = selectedPad ?? 0;
      if (incomingSample.buffer) {
        setPads(p => {
          const u = [...p];
          u[pi] = { ...u[pi], buffer: incomingSample.buffer, name: incomingSample.name || `Sample ${pi + 1}`, trimEnd: incomingSample.buffer.duration };
          return u;
        });
      }
    }
  }, [incomingSample, selectedPad]);

  // ── SPX Flow: Receive slices from Sampler chop ──
  const lastSlicesRef = useRef(null);
  useEffect(() => {
    // Check window global for slices from Sampler
    const slices = window.__spx_sampler_slices;
    if (slices && slices !== lastSlicesRef.current) {
      lastSlicesRef.current = slices;
      setPads(p => {
        const u = [...p];
        slices.forEach((slice, i) => {
          if (i < 16 && slice.buffer) {
            u[i] = { ...u[i], buffer: slice.buffer, name: slice.name || `Slice ${i + 1}`, trimEnd: slice.buffer.duration };
          }
        });
        return u;
      });
      window.__spx_sampler_slices = null; // clear
    }
  });

  // ── SPX Flow: Bounce to Arrange track ──
  const bounceToArrange = useCallback(async () => {
    if (!onSendToArrange) return;
    try {
      let rendered;
      if (songMode && songSeq.length > 0) { rendered = await renderSong(); }
      else { rendered = await renderPat(steps, stepVel, stepCount); }
      if (!rendered) return;
      const name = songMode && songSeq.length > 0
        ? `Beat (Song ${songSeq.length} patterns)`
        : `Beat (${patterns[curPatIdx]?.name || 'Pattern'})`;
      onSendToArrange(rendered, name);
    } catch (e) { console.error('Bounce to arrange failed:', e); }
  }, [onSendToArrange, songMode, songSeq, steps, stepVel, stepCount, renderPat, renderSong, patterns, curPatIdx]);
  // AUDIO ANALYSIS — BPM + Key Detection
  // =========================================================================

  const analyzePadSample = useCallback(async (padIndex) => {
    const pad = pads[padIndex];
    if (!pad?.buffer) return;
    setAnalyzing(true);
    try {
      const result = await new Promise(resolve => {
        setTimeout(() => resolve(analyzeAudio(pad.buffer)), 10);
      });
      if (result.bpm.bpm > 0) {
        setDetectedBpm(result.bpm.bpm);
        setBpmConfidence(result.bpm.confidence);
        setBpmCandidates(result.bpm.candidates);
        if (autoSyncBpm) setBpm(result.bpm.bpm);
        updatePad(padIndex, { originalBpm: result.bpm.bpm });
      }
      if (result.key.confidence > 0.3) {
        setDetectedKey(result.key);
        setKeyConfidence(result.key.confidence);
        setKeyCandidates(result.key.allKeys);
      }
    } catch (err) {
      console.error('Audio analysis failed:', err);
    }
    setAnalyzing(false);
  }, [pads, autoSyncBpm, updatePad]);

  const analyzeOnLoad = useCallback((padIndex, buffer) => {
    if (!buffer || buffer.duration < 1) return;
    setTimeout(() => analyzePadSample(padIndex), 100);
  }, [analyzePadSample]);

  const syncBpmToProject = useCallback(() => {
    if (detectedBpm && onBpmSync) onBpmSync(detectedBpm);
  }, [detectedBpm, onBpmSync]);

  const syncKeyToProject = useCallback(() => {
    if (detectedKey && onKeySync) onKeySync(detectedKey.key, detectedKey.scale);
  }, [detectedKey, onKeySync]);

  // =========================================================================
  // SAMPLE EDITOR (SamplerInstrument integration)
  // =========================================================================

  const openSampleEditor = useCallback((padIndex) => {
    if (padIndex == null || !pads[padIndex]?.buffer) return;
    setSampleEditorPad(padIndex);
    setShowSampleEditor(true);
  }, [pads]);

  const handleSampleEditorSend = useCallback((editedBuffer, name) => {
    if (sampleEditorPad != null && editedBuffer) {
      setPads(prev => {
        const u = [...prev];
        u[sampleEditorPad] = {
          ...u[sampleEditorPad],
          buffer: editedBuffer,
          name: name || u[sampleEditorPad].name,
          trimEnd: editedBuffer.duration,
        };
        return u;
      });
      analyzeOnLoad(sampleEditorPad, editedBuffer);
    }
    setShowSampleEditor(false);
    setSampleEditorPad(null);
  }, [sampleEditorPad, analyzeOnLoad]);

  // =========================================================================
  // MIC / LINE-IN RECORDING
  // =========================================================================

  const startMicRec = useCallback(async (pi) => {
    const c = initCtx(); if (c.state === 'suspended') await c.resume();
    try {
      const constraints = { audio: selIn !== 'default' ? { deviceId: { exact: selIn } } : true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStream.current = stream;
      setMicPad(pi);
      // Countdown 3-2-1
      for (let i = 3; i > 0; i--) { setMicCount(i); await new Promise(r => setTimeout(r, 700)); }
      setMicCount(0);
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      mediaRec.current = rec; recChunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recChunks.current, { type: 'audio/webm' });
        await loadSample(pi, blob);
        setMicRec(false); setMicPad(null);
      };
      rec.start(); setMicRec(true);
    } catch (e) {
      console.error('Mic error:', e);
      alert('Could not access microphone. Check browser permissions.');
      setMicRec(false); setMicPad(null); setMicCount(0);
    }
  }, [initCtx, selIn, loadSample]);

  const stopMicRec = useCallback(() => {
    if (mediaRec.current?.state === 'recording') mediaRec.current.stop();
  }, []);

  // =========================================================================
  // SAMPLE PROCESSING (Normalize, Reverse, Fade)
  // =========================================================================

  const normalizeSample = useCallback((pi) => {
    const pad = padsRef.current[pi]; if (!pad?.buffer) return;
    const c = initCtx(); const buf = pad.buffer;
    const newBuf = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    let peak = 0;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < data.length; i++) { const abs = Math.abs(data[i]); if (abs > peak) peak = abs; }
    }
    if (peak === 0) return;
    const gain = 1.0 / peak;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = newBuf.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[i] * gain;
    }
    setPads(p => { const u = [...p]; u[pi] = { ...u[pi], buffer: newBuf, normalized: true }; return u; });
  }, [initCtx]);

  const reverseSampleDestructive = useCallback((pi) => {
    const pad = padsRef.current[pi]; if (!pad?.buffer) return;
    const c = initCtx(); const buf = pad.buffer;
    const rev = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const s = buf.getChannelData(ch), d = rev.getChannelData(ch);
      for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
    }
    setPads(p => { const u = [...p]; u[pi] = { ...u[pi], buffer: rev, reverse: !u[pi].reverse }; return u; });
  }, [initCtx]);

  // Phase 1: Fade in (destructive, writes curve into buffer)
  const fadeInSample = useCallback((pi, durSec = 0.05) => {
    const pad = padsRef.current[pi]; if (!pad?.buffer) return;
    const c = initCtx(); const buf = pad.buffer;
    const newBuf = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const fadeSamples = Math.min(Math.floor(durSec * buf.sampleRate), buf.length);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = newBuf.getChannelData(ch);
      for (let i = 0; i < buf.length; i++) {
        dst[i] = i < fadeSamples ? src[i] * (i / fadeSamples) : src[i];
      }
    }
    setPads(p => { const u = [...p]; u[pi] = { ...u[pi], buffer: newBuf }; return u; });
  }, [initCtx]);

  // Phase 1: Fade out (destructive)
  const fadeOutSample = useCallback((pi, durSec = 0.05) => {
    const pad = padsRef.current[pi]; if (!pad?.buffer) return;
    const c = initCtx(); const buf = pad.buffer;
    const newBuf = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    const fadeSamples = Math.min(Math.floor(durSec * buf.sampleRate), buf.length);
    const fadeStart = buf.length - fadeSamples;
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const src = buf.getChannelData(ch), dst = newBuf.getChannelData(ch);
      for (let i = 0; i < buf.length; i++) {
        dst[i] = i >= fadeStart ? src[i] * ((buf.length - 1 - i) / fadeSamples) : src[i];
      }
    }
    setPads(p => { const u = [...p]; u[pi] = { ...u[pi], buffer: newBuf }; return u; });
  }, [initCtx]);

  const previewSrcRef = useRef(null);
  const chopPlayheadRef = useRef(null); // animation frame ID
  const [activeSlice, setActiveSlice] = useState(-1);

  const stopPreview = useCallback(() => {
    if (previewSrcRef.current) { try { previewSrcRef.current.stop(); } catch (e) { } previewSrcRef.current = null; }
    if (chopPlayheadRef.current) { cancelAnimationFrame(chopPlayheadRef.current); chopPlayheadRef.current = null; }
    setActiveSlice(-1);
  }, []);

  const previewSlice = useCallback((sliceIdx) => {
    if (chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const c = initCtx();
    stopPreview(); // kill any playing preview

    const all = [0, ...chopPts, pad.buffer.duration];
    const start = all[sliceIdx] || 0, end = all[sliceIdx + 1] || pad.buffer.duration;
    const dur = end - start;

    const src = c.createBufferSource();
    src.buffer = pad.buffer; src.connect(masterRef.current);
    src.start(0, start, dur);
    previewSrcRef.current = src;
    setActiveSlice(sliceIdx);

    // Animate playhead on chop canvas
    const startTime = c.currentTime;
    const cv = chopCanvas.current;
    const animate = () => {
      if (!previewSrcRef.current) return;
      const elapsed = c.currentTime - startTime;
      if (elapsed >= dur) { stopPreview(); return; }
      if (cv) {
        const ctx2 = cv.getContext('2d');
        drawWave(); // redraw base
        const x = ((start + elapsed) / pad.buffer.duration) * cv.width;
        ctx2.strokeStyle = '#fff'; ctx2.lineWidth = 2; ctx2.setLineDash([]);
        ctx2.beginPath(); ctx2.moveTo(x, 0); ctx2.lineTo(x, cv.height); ctx2.stroke();
      }
      chopPlayheadRef.current = requestAnimationFrame(animate);
    };
    chopPlayheadRef.current = requestAnimationFrame(animate);

    src.onended = () => { stopPreview(); };
  }, [chopIdx, pads, chopPts, initCtx, stopPreview, drawWave]);

  // Phase 1: Undo last chop point
  const chopUndoStack = useRef([]);
  const undoChop = useCallback(() => {
    setChopPts(prev => {
      if (prev.length === 0) return prev;
      chopUndoStack.current.push(prev[prev.length - 1]);
      return prev.slice(0, -1);
    });
  }, []);
  const redoChop = useCallback(() => {
    if (chopUndoStack.current.length === 0) return;
    const pt = chopUndoStack.current.pop();
    setChopPts(prev => [...prev, pt].sort((a, b) => a - b));
  }, []);

  // Phase 4: BPM detection from sample
  const detectBpm = useCallback((pi) => {
    const pad = padsRef.current[pi]; if (!pad?.buffer) return 0;
    const data = pad.buffer.getChannelData(0), sr = pad.buffer.sampleRate;
    const dsRate = 4000, dsFactor = Math.floor(sr / dsRate);
    const ds = []; for (let i = 0; i < data.length; i += dsFactor) ds.push(Math.abs(data[i]));
    const frameSize = 128, energy = [];
    for (let i = 0; i < ds.length - frameSize; i += frameSize) {
      let e = 0; for (let j = 0; j < frameSize; j++) e += ds[i + j] * ds[i + j]; energy.push(e / frameSize);
    }
    const diff = [0]; for (let i = 1; i < energy.length; i++) diff.push(Math.max(0, energy[i] - energy[i - 1]));
    const minLag = Math.floor(dsRate * 60 / (200 * frameSize));
    const maxLag = Math.floor(dsRate * 60 / (50 * frameSize));
    let bestLag = minLag, bestCorr = -1;
    for (let lag = minLag; lag <= Math.min(maxLag, diff.length / 2); lag++) {
      let corr = 0; for (let i = 0; i < diff.length - lag; i++) corr += diff[i] * diff[i + lag];
      if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }
    const detected = Math.round(60 / (bestLag * frameSize / dsRate));
    return (detected >= 50 && detected <= 200) ? detected : 0;
  }, []);

  const setBpmFromSample = useCallback((pi) => {
    const detected = detectBpm(pi);
    if (detected > 0) setPads(p => { const u = [...p]; u[pi] = { ...u[pi], originalBpm: detected }; return u; });
  }, [detectBpm]);

  // Phase 4: Granular time stretch — overlap-add grain synthesis
  // Creates a new AudioBuffer that is time-stretched without changing pitch
  const grainStretch = useCallback((buffer, stretchRatio, pitchSemitones = 0) => {
    if (!buffer || stretchRatio <= 0) return buffer;
    const c = ctxRef.current || initCtx();
    const sr = buffer.sampleRate;
    const nc = buffer.numberOfChannels;
    const origLen = buffer.length;
    const newLen = Math.round(origLen * stretchRatio);
    if (newLen <= 0 || newLen > sr * 120) return buffer; // sanity: max 120s

    const grainSize = Math.round(sr * 0.04); // 40ms grains
    const hopOut = Math.round(grainSize * 0.5); // 50% overlap
    const hopIn = Math.round(hopOut / stretchRatio);

    const outBuf = c.createBuffer(nc, newLen, sr);

    // Hann window
    const window = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grainSize - 1)));

    for (let ch = 0; ch < nc; ch++) {
      const input = buffer.getChannelData(ch);
      const output = outBuf.getChannelData(ch);

      let inPos = 0;
      let outPos = 0;
      while (outPos < newLen) {
        const readStart = Math.round(inPos);
        for (let i = 0; i < grainSize && outPos + i < newLen; i++) {
          const readIdx = readStart + i;
          const sample = readIdx < origLen ? input[readIdx] : 0;
          output[outPos + i] += sample * window[i];
        }
        inPos += hopIn;
        outPos += hopOut;
      }
    }

    // Apply pitch shift if needed (resample the stretched buffer)
    if (pitchSemitones !== 0) {
      const pitchRatio = Math.pow(2, pitchSemitones / 12);
      const pitchedLen = Math.round(newLen / pitchRatio);
      if (pitchedLen <= 0 || pitchedLen > sr * 120) return outBuf;
      const pitched = c.createBuffer(nc, pitchedLen, sr);
      for (let ch = 0; ch < nc; ch++) {
        const src = outBuf.getChannelData(ch);
        const dst = pitched.getChannelData(ch);
        for (let i = 0; i < pitchedLen; i++) {
          const srcIdx = i * pitchRatio;
          const idx0 = Math.floor(srcIdx);
          const frac = srcIdx - idx0;
          const s0 = idx0 < newLen ? src[idx0] : 0;
          const s1 = idx0 + 1 < newLen ? src[idx0 + 1] : s0;
          dst[i] = s0 + frac * (s1 - s0); // linear interpolation
        }
      }
      return pitched;
    }
    return outBuf;
  }, [initCtx]);

  // Phase 4: Pre-stretch a pad's buffer for granular/slice modes
  const stretchPadBuffer = useCallback((pi) => {
    const pad = padsRef.current[pi];
    if (!pad?.buffer || !pad.originalBpm || pad.originalBpm <= 0) return;
    const ratio = bpmRef.current / pad.originalBpm;
    if (Math.abs(ratio - 1.0) < 0.01) return; // no stretch needed
    const stretched = grainStretch(pad.buffer, 1.0 / ratio, pad.pitchShift || 0);
    if (stretched) {
      setPads(p => {
        const u = [...p];
        u[pi] = { ...u[pi], _stretchedBuffer: stretched, _stretchedBpm: bpmRef.current };
        return u;
      });
    }
  }, [grainStretch]);

  // Phase 2: Velocity layer management
  const addLayer = useCallback((pi) => {
    setPads(p => {
      const u = [...p]; if (u[pi].layers.length >= 4) return u;
      const count = u[pi].layers.length + 1;
      const zoneSize = Math.floor(128 / count);
      const layers = [...u[pi].layers, { buffer: null, name: '', velocityMin: 0, velocityMax: 127, volume: 1 }];
      layers.forEach((l, i) => { l.velocityMin = i * zoneSize; l.velocityMax = i === count - 1 ? 127 : (i + 1) * zoneSize - 1; });
      u[pi] = { ...u[pi], layers }; return u;
    });
  }, []);

  const removeLayer = useCallback((pi, li) => {
    setPads(p => {
      const u = [...p]; const layers = u[pi].layers.filter((_, i) => i !== li);
      const count = layers.length;
      if (count > 0) { const z = Math.floor(128 / count); layers.forEach((l, i) => { l.velocityMin = i * z; l.velocityMax = i === count - 1 ? 127 : (i + 1) * z - 1; }); }
      u[pi] = { ...u[pi], layers }; return u;
    });
  }, []);

  const loadLayerSample = useCallback(async (pi, li, file) => {
    const c = initCtx();
    try {
      let ab; if (file instanceof File || file instanceof Blob) ab = await file.arrayBuffer();
      else if (typeof file === 'string') { const r = await fetch(file); ab = await r.arrayBuffer(); } else return;
      const buf = await c.decodeAudioData(ab);
      const name = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Layer ' + (li + 1);
      setPads(p => { const u = [...p]; const layers = [...u[pi].layers]; layers[li] = { ...layers[li], buffer: buf, name }; u[pi] = { ...u[pi], layers }; return u; });
    } catch (e) { console.error('Load layer failed:', e); }
  }, [initCtx]);

  // =========================================================================
  // PAD PLAYBACK WITH EFFECTS
  // =========================================================================

  const playPad = useCallback((pi, vel = 0.8, time = null) => {
    const c = initCtx();
    const pad = padsRef.current[pi];
    if (!pad?.buffer || pad.muted) return;
    const anySolo = padsRef.current.some(p => p.soloed);
    if (anySolo && !pad.soloed) return;

    // Stop prev
    if (activeSrc.current[pi]) { try { activeSrc.current[pi].source.stop(); } catch (e) { } }

    // Phase 2: Velocity layer selection
    let sampleBuffer = pad.buffer;
    let layerVol = 1.0; // per-layer volume multiplier
    let layerIdx = -1;  // which layer triggered (-1 = base)
    if (pad.layers && pad.layers.length > 0) {
      const velMidi = Math.round(vel * 127);
      if (pad.roundRobin && pad.layers.length > 1) {
        // Round robin: cycle through layers regardless of velocity
        const validLayers = pad.layers.map((l, i) => ({ ...l, _i: i })).filter(l => l.buffer);
        if (validLayers.length > 0) {
          const rr = (pad.roundRobinIdx || 0) % validLayers.length;
          sampleBuffer = validLayers[rr].buffer;
          layerVol = validLayers[rr].volume ?? 1;
          layerIdx = validLayers[rr]._i;
          padsRef.current[pi] = { ...padsRef.current[pi], roundRobinIdx: (pad.roundRobinIdx || 0) + 1 };
        }
      } else {
        // Velocity zone: find matching layer
        for (let li = 0; li < pad.layers.length; li++) {
          const l = pad.layers[li];
          if (l.buffer && velMidi >= l.velocityMin && velMidi <= l.velocityMax) {
            sampleBuffer = l.buffer;
            layerVol = l.volume ?? 1;
            layerIdx = li;
            break;
          }
        }
      }
    }

    const src = c.createBufferSource();
    const gain = c.createGain();
    const pan = c.createStereoPanner();

    // Reverse
    if (pad.reverse) {
      const rev = c.createBuffer(sampleBuffer.numberOfChannels, sampleBuffer.length, sampleBuffer.sampleRate);
      for (let ch = 0; ch < sampleBuffer.numberOfChannels; ch++) {
        const s = sampleBuffer.getChannelData(ch), d = rev.getChannelData(ch);
        for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
      }
      src.buffer = rev;
    } else src.buffer = sampleBuffer;

    src.playbackRate.value = Math.pow(2, pad.pitch / 12);

    // Phase 1: Crossfade loop - build buffer with crossfaded loop boundaries
    if (pad.playMode === 'loop') {
      const loopStart = pad.trimStart || 0;
      const loopEnd = pad.trimEnd || sampleBuffer.duration;
      const loopDur = loopEnd - loopStart;
      const xfadeDur = Math.min(0.01, loopDur * 0.05); // 10ms or 5% of loop, whichever is smaller
      const xfadeSamples = Math.floor(xfadeDur * sampleBuffer.sampleRate);
      if (xfadeSamples > 0 && loopDur > xfadeDur * 2) {
        const startSamp = Math.floor(loopStart * sampleBuffer.sampleRate);
        const endSamp = Math.floor(loopEnd * sampleBuffer.sampleRate);
        const loopLen = endSamp - startSamp;
        const nc = sampleBuffer.numberOfChannels;
        const xfBuf = c.createBuffer(nc, loopLen, sampleBuffer.sampleRate);
        for (let ch = 0; ch < nc; ch++) {
          const orig = sampleBuffer.getChannelData(ch);
          const dst = xfBuf.getChannelData(ch);
          for (let i = 0; i < loopLen; i++) dst[i] = orig[startSamp + i];
          // Crossfade: blend end into start
          for (let i = 0; i < xfadeSamples; i++) {
            const fadeOut = (xfadeSamples - i) / xfadeSamples;
            const fadeIn = i / xfadeSamples;
            const endVal = dst[loopLen - xfadeSamples + i]; // sample near loop end
            const startVal = dst[i]; // sample near loop start
            dst[i] = startVal * fadeIn + endVal * fadeOut;
          }
        }
        src.buffer = xfBuf;
        src.loop = true; src.loopStart = 0; src.loopEnd = xfBuf.duration;
      } else {
        src.loop = true; src.loopStart = loopStart; src.loopEnd = loopEnd;
      }
    }

    // Phase 4: Time stretch
    if (pad.timeStretch && pad.originalBpm > 0) {
      if (pad.stretchMode === 'repitch') {
        // Repitch: changes tempo AND pitch via playbackRate
        src.playbackRate.value *= bpmRef.current / pad.originalBpm;
        // Apply additional pitch shift
        if (pad.pitchShift) src.playbackRate.value *= Math.pow(2, pad.pitchShift / 12);
      } else if (pad.stretchMode === 'granular' || pad.stretchMode === 'slice') {
        // Granular/Slice: use pre-stretched buffer (preserves pitch)
        if (pad._stretchedBuffer && pad._stretchedBpm === bpmRef.current) {
          src.buffer = pad._stretchedBuffer;
        } else {
          // Fallback to repitch if no pre-stretched buffer available
          src.playbackRate.value *= bpmRef.current / pad.originalBpm;
        }
        // Pitch shift is baked into granular buffer, no additional rate change
      }
    } else if (pad.pitchShift && pad.pitchShift !== 0) {
      // Independent pitch shift without time stretch
      src.playbackRate.value *= Math.pow(2, pad.pitchShift / 12);
    }

    const st = time || c.currentTime;
    const peakVol = pad.volume * vel * layerVol;
    // Full ADSR envelope
    if (pad.attack > 0) {
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(peakVol, st + pad.attack);
      if (pad.decay > 0) gain.gain.linearRampToValueAtTime(peakVol * (pad.sustain ?? 1), st + pad.attack + pad.decay);
    } else {
      gain.gain.setValueAtTime(peakVol * (pad.decay > 0 ? 1 : (pad.sustain ?? 1)), st);
      if (pad.decay > 0) gain.gain.linearRampToValueAtTime(peakVol * (pad.sustain ?? 1), st + pad.decay);
    }
    pan.pan.value = pad.pan;

    // Effects chain: src → [filter] → [distortion] → gain → pan → master + [delay wet] + [reverb wet]
    let last = src;
    if (pad.filterOn) {
      const f = c.createBiquadFilter(); f.type = pad.filterType; f.frequency.value = pad.filterFreq; f.Q.value = pad.filterQ;
      last.connect(f); last = f;
    }
    if (pad.distortionOn) {
      const ws = c.createWaveShaper(); const amt = pad.distortionAmt;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x)); }
      ws.curve = curve; ws.oversample = '2x'; last.connect(ws); last = ws;
    }
    last.connect(gain); gain.connect(pan); pan.connect(masterRef.current);

    if (pad.delayOn) {
      const dl = c.createDelay(2), dg = c.createGain(), fb = c.createGain();
      dl.delayTime.value = pad.delayTime; dg.gain.value = pad.delayMix; fb.gain.value = pad.delayFeedback;
      pan.connect(dl); dl.connect(dg); dl.connect(fb); fb.connect(dl); dg.connect(masterRef.current);
    }
    if (pad.reverbOn) {
      const ir = getReverbIR(c, 2.0);
      const conv = c.createConvolver(), rg = c.createGain();
      conv.buffer = ir; rg.gain.value = pad.reverbMix;
      pan.connect(conv); conv.connect(rg); rg.connect(masterRef.current);
    }

    const off = pad.trimStart || 0;
    const dur = (pad.trimEnd || sampleBuffer.duration) - off;
    if (pad.playMode === 'loop') src.start(st, off);
    else src.start(st, off, dur + (pad.release || 0));

    if (pad.release > 0 && pad.playMode !== 'loop') {
      const rs = st + dur; gain.gain.setValueAtTime(peakVol * (pad.sustain ?? 1), rs); gain.gain.linearRampToValueAtTime(0, rs + pad.release);
    }

    activeSrc.current[pi] = { source: src, gain, layerIdx };
    setActivePads(p => new Set([...p, pi]));
    src.onended = () => { setActivePads(p => { const n = new Set(p); n.delete(pi); return n; }); delete activeSrc.current[pi]; };

    setPadLvls(p => { const u = [...p]; u[pi] = vel; return u; });
    setTimeout(() => setPadLvls(p => { const u = [...p]; u[pi] = Math.max(0, u[pi] - 0.3); return u; }), 150);
  }, [initCtx]);

  const stopPad = useCallback((pi) => {
    if (activeSrc.current[pi]) { try { activeSrc.current[pi].source.stop(); } catch (e) { } delete activeSrc.current[pi]; }
    setActivePads(p => { const n = new Set(p); n.delete(pi); return n; });
  }, []);

  // Phase 3: Keygroup playback (chromatic pitch from root note with full effects chain)
  const playPadKeygroup = useCallback((pi, midiNote, vel = 0.8) => {
    const c = initCtx();
    const pad = padsRef.current[pi];
    if (!pad?.buffer || pad.muted) return;
    if (midiNote < (pad.keyRangeLow || 0) || midiNote > (pad.keyRangeHigh || 127)) return;

    const key = `kg_${pi}_${midiNote}`;
    // Stop previous note on same key (retrigger)
    if (activeSrc.current[key]) { try { activeSrc.current[key].source.stop(); } catch (e) { } delete activeSrc.current[key]; }

    // Velocity layer selection (same as drum mode)
    let sampleBuffer = pad.buffer;
    let layerVol = 1.0;
    if (pad.layers && pad.layers.length > 0) {
      const velMidi = Math.round(vel * 127);
      if (pad.roundRobin && pad.layers.length > 1) {
        const valid = pad.layers.filter(l => l.buffer);
        if (valid.length > 0) {
          const rr = (pad.roundRobinIdx || 0) % valid.length;
          sampleBuffer = valid[rr].buffer; layerVol = valid[rr].volume ?? 1;
          padsRef.current[pi] = { ...padsRef.current[pi], roundRobinIdx: (pad.roundRobinIdx || 0) + 1 };
        }
      } else {
        const match = pad.layers.find(l => l.buffer && velMidi >= l.velocityMin && velMidi <= l.velocityMax);
        if (match) { sampleBuffer = match.buffer; layerVol = match.volume ?? 1; }
      }
    }

    const src = c.createBufferSource();
    const gain = c.createGain();
    const pan = c.createStereoPanner();

    // Reverse
    if (pad.reverse) {
      const rev = c.createBuffer(sampleBuffer.numberOfChannels, sampleBuffer.length, sampleBuffer.sampleRate);
      for (let ch = 0; ch < sampleBuffer.numberOfChannels; ch++) {
        const s = sampleBuffer.getChannelData(ch), d = rev.getChannelData(ch);
        for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
      }
      src.buffer = rev;
    } else src.buffer = sampleBuffer;

    // Chromatic pitch: semitones from root note
    const semitones = midiNote - (pad.rootNote || 60);
    src.playbackRate.value = Math.pow(2, (semitones + (pad.pitch || 0)) / 12);

    // ADSR envelope
    const st = c.currentTime;
    const peakVol = pad.volume * vel * layerVol;
    if (pad.attack > 0) {
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(peakVol, st + pad.attack);
      if (pad.decay > 0) gain.gain.linearRampToValueAtTime(peakVol * (pad.sustain ?? 1), st + pad.attack + pad.decay);
    } else {
      gain.gain.setValueAtTime(peakVol * (pad.decay > 0 ? 1 : (pad.sustain ?? 1)), st);
      if (pad.decay > 0) gain.gain.linearRampToValueAtTime(peakVol * (pad.sustain ?? 1), st + pad.decay);
    }
    pan.pan.value = pad.pan;

    // Effects chain
    let last = src;
    if (pad.filterOn) {
      const f = c.createBiquadFilter(); f.type = pad.filterType; f.frequency.value = pad.filterFreq; f.Q.value = pad.filterQ;
      last.connect(f); last = f;
    }
    if (pad.distortionOn) {
      const ws = c.createWaveShaper(); const amt = pad.distortionAmt;
      const curve = new Float32Array(44100);
      for (let i = 0; i < 44100; i++) { const x = (i * 2) / 44100 - 1; curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x)); }
      ws.curve = curve; ws.oversample = '2x'; last.connect(ws); last = ws;
    }
    last.connect(gain); gain.connect(pan); pan.connect(masterRef.current);

    if (pad.delayOn) {
      const dl = c.createDelay(2), dg = c.createGain(), fb = c.createGain();
      dl.delayTime.value = pad.delayTime; dg.gain.value = pad.delayMix; fb.gain.value = pad.delayFeedback;
      pan.connect(dl); dl.connect(dg); dl.connect(fb); fb.connect(dl); dg.connect(masterRef.current);
    }
    if (pad.reverbOn) {
      const ir = getReverbIR(c, 2.0);
      const conv = c.createConvolver(), rg = c.createGain();
      conv.buffer = ir; rg.gain.value = pad.reverbMix;
      pan.connect(conv); conv.connect(rg); rg.connect(masterRef.current);
    }

    // Playback — loop for sustained keygroup, oneshot otherwise
    const off = pad.trimStart || 0;
    const dur = (pad.trimEnd || sampleBuffer.duration) - off;
    if (pad.playMode === 'loop') {
      src.loop = true; src.loopStart = off; src.loopEnd = pad.trimEnd || sampleBuffer.duration;
      src.start(st, off);
    } else {
      src.start(st, off, dur + (pad.release || 0));
      if (pad.release > 0) {
        const rs = st + dur;
        gain.gain.setValueAtTime(peakVol * (pad.sustain ?? 1), rs);
        gain.gain.linearRampToValueAtTime(0, rs + pad.release);
      }
    }

    activeSrc.current[key] = { source: src, gain, midiNote, padIdx: pi };
    setActivePads(p => new Set([...p, pi]));
    setActiveKgNotes(p => new Set([...p, midiNote]));
    src.onended = () => {
      delete activeSrc.current[key];
      setActiveKgNotes(p => { const n = new Set(p); n.delete(midiNote); return n; });
    };
  }, [initCtx, getReverbIR]);

  // Phase 3: Stop keygroup note (for noteOff / key release)
  const stopPadKeygroup = useCallback((pi, midiNote) => {
    const key = `kg_${pi}_${midiNote}`;
    const entry = activeSrc.current[key];
    if (!entry) return;
    const pad = padsRef.current[pi];
    const rel = pad?.release || 0.02;
    const c = ctxRef.current;
    if (c && entry.gain) {
      // Release envelope on noteOff
      const now = c.currentTime;
      entry.gain.gain.cancelScheduledValues(now);
      entry.gain.gain.setValueAtTime(entry.gain.gain.value, now);
      entry.gain.gain.linearRampToValueAtTime(0, now + rel);
      try { entry.source.stop(now + rel + 0.01); } catch (e) { }
    } else {
      try { entry.source.stop(); } catch (e) { }
    }
    delete activeSrc.current[key];
    setActiveKgNotes(p => { const n = new Set(p); n.delete(midiNote); return n; });
  }, []);

  const stopAll = useCallback(() => {
    Object.keys(activeSrc.current).forEach(k => { try { activeSrc.current[k].source.stop(); } catch (e) { } });
    activeSrc.current = {}; setActivePads(new Set());
    // Phase 5: also stop clip launcher sources
    Object.keys(clipSources.current).forEach(k => { try { clipSources.current[k].source.stop(); } catch (e) { } });
    clipSources.current = {}; setClipStates({}); setActiveScene(-1);
  }, []);

  // =========================================================================
  // METRONOME
  // =========================================================================

  const metClick = useCallback((t, down) => {
    const c = ctxRef.current; if (!c || !metGainRef.current) return;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = down ? 1000 : 800;
    g.gain.setValueAtTime(down ? 0.3 : 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(metGainRef.current); o.start(t); o.stop(t + 0.05);
  }, []);

  // =========================================================================
  // SEQUENCER ENGINE
  // =========================================================================

  const schedStep = useCallback((si, t) => {
    const cs = stepsRef.current;
    for (let pi = 0; pi < 16; pi++) { if (cs[pi]?.[si]) playPad(pi, stepVel[pi]?.[si] ?? 0.8, t); }
    if (metRef.current) { const spb = scRef.current / 4; metClick(t, si % spb === 0); } // Fix #5: spb based on step count / beats
    const d = (t - ctxRef.current.currentTime) * 1000;
    setTimeout(() => setCurStep(si), Math.max(0, d));
  }, [playPad, metClick, stepVel]);

  const startSeq = useCallback(() => {
    const c = initCtx(); if (c.state === 'suspended') c.resume();
    playingRef.current = true; setIsPlaying(true);
    curStepRef.current = -1; nextStepT.current = c.currentTime + 0.05;
    if (liveRec) recStartT.current = c.currentTime;

    const scheduler = () => {
      if (!playingRef.current) return;
      const sd = 60.0 / bpmRef.current / 4;
      while (nextStepT.current < c.currentTime + 0.1) {
        // Loop range boundaries
        const loopS = loopStartRef.current || 0;
        const loopE = loopEndRef.current != null ? loopEndRef.current : scRef.current;
        let ns;
        if (curStepRef.current < loopS || curStepRef.current >= loopE - 1) {
          ns = loopS; // wrap to loop start
        } else {
          ns = curStepRef.current + 1;
        }
        let so = 0;
        if (ns % 2 === 1 && swingRef.current > 0) so = sd * (swingRef.current / 100) * 0.5;
        schedStep(ns, nextStepT.current + so);
        curStepRef.current = ns; nextStepT.current += sd;

        // Song mode: advance pattern at end of loop range
        if (ns === loopE - 1 && songRef.current && songSeqRef.current.length > 0) {
          const curSongIdx = songSeqRef.current.findIndex(b => b.patternIndex === patIdxRef.current);
          const nextSongIdx = curSongIdx + 1;
          if (nextSongIdx < songSeqRef.current.length) {
            const nextPat = songSeqRef.current[nextSongIdx].patternIndex;
            setTimeout(() => { setCurPatIdx(nextPat); setSongPos(nextSongIdx); }, 0);
          } else if (loopRef.current) {
            const firstPat = songSeqRef.current[0].patternIndex;
            setTimeout(() => { setCurPatIdx(firstPat); setSongPos(0); }, 0);
          } else {
            playingRef.current = false; setIsPlaying(false); setCurStep(-1); return;
          }
        }

        if (ns === loopE - 1 && !loopRef.current && !songRef.current) {
          playingRef.current = false; setIsPlaying(false); setCurStep(-1); return;
        }
      }
      seqTimer.current = setTimeout(scheduler, 25);
    };
    scheduler();
  }, [initCtx, schedStep, liveRec]);

  const stopSeq = useCallback(() => {
    playingRef.current = false; setIsPlaying(false); setCurStep(-1); curStepRef.current = -1;
    if (seqTimer.current) clearTimeout(seqTimer.current); seqTimer.current = null;
    stopAll(); setSongPlaying(false); setSongPos(-1);
  }, [stopAll]);

  const togglePlay = useCallback(() => { playingRef.current ? stopSeq() : startSeq(); }, [startSeq, stopSeq]);

  // =========================================================================
  // SONG MODE (Phase 3)
  // =========================================================================

  const startSong = useCallback(() => {
    if (songSeq.length === 0) return;
    setSongPlaying(true); setSongPos(0); setCurPatIdx(songSeq[0].patternIndex);
    startSeq();
  }, [songSeq, startSeq]);

  const addToSong = useCallback((pi) => {
    setSongSeq(p => [...p, { patternIndex: pi, name: patterns[pi]?.name || `Pat ${pi + 1}` }]);
  }, [patterns]);
  const rmFromSong = useCallback((i) => setSongSeq(p => p.filter((_, j) => j !== i)), []);
  const moveSongBlock = useCallback((from, to) => {
    setSongSeq(p => { const u = [...p]; const [item] = u.splice(from, 1); u.splice(to, 0, item); return u; });
  }, []);

  // =========================================================================
  // PHASE 5: CLIP LAUNCHER (Ableton-style)
  // =========================================================================

  const CLIP_COLORS = ['#ff4444', '#ff8800', '#ffd700', '#00ff88', '#00ffc8', '#4a9eff', '#8844ff', '#ff44aa'];

  // Assign a pad's current buffer to a clip slot
  const assignClip = useCallback((sceneIdx, padIdx) => {
    const pad = padsRef.current[padIdx];
    if (!pad?.buffer) return;
    setScenes(prev => {
      const u = prev.map(s => ({ ...s, clips: [...s.clips] }));
      u[sceneIdx].clips[padIdx] = {
        padIdx,
        name: pad.name || `Clip ${padIdx + 1}`,
        loopStart: pad.trimStart || 0,
        loopEnd: pad.trimEnd || pad.buffer.duration,
        color: CLIP_COLORS[(sceneIdx + padIdx) % CLIP_COLORS.length],
        volume: pad.volume,
        pitch: pad.pitch,
      };
      return u;
    });
  }, []);

  // Remove clip from slot
  const removeClip = useCallback((sceneIdx, padIdx) => {
    const key = `${sceneIdx}_${padIdx}`;
    // Stop if playing
    if (clipSources.current[key]) {
      try { clipSources.current[key].source.stop(); } catch (e) { }
      delete clipSources.current[key];
    }
    setClipStates(prev => { const u = { ...prev }; delete u[key]; return u; });
    setScenes(prev => {
      const u = prev.map(s => ({ ...s, clips: [...s.clips] }));
      u[sceneIdx].clips[padIdx] = null;
      return u;
    });
  }, []);

  // Launch a single clip — loops the pad's buffer
  const launchClip = useCallback((sceneIdx, padIdx) => {
    const clip = scenes[sceneIdx]?.clips[padIdx];
    if (!clip) return;
    const pad = padsRef.current[padIdx];
    if (!pad?.buffer) return;
    const c = initCtx();
    const key = `${sceneIdx}_${padIdx}`;

    // Stop any currently playing clip on this pad (across all scenes)
    Object.keys(clipSources.current).forEach(k => {
      if (k.endsWith(`_${padIdx}`)) {
        try { clipSources.current[k].source.stop(); } catch (e) { }
        delete clipSources.current[k];
        setClipStates(prev => { const u = { ...prev }; u[k] = 'stopped'; return u; });
      }
    });

    const src = c.createBufferSource();
    const gain = c.createGain();
    const pan = c.createStereoPanner();

    src.buffer = pad.buffer;
    src.loop = true;
    src.loopStart = clip.loopStart || 0;
    src.loopEnd = clip.loopEnd || pad.buffer.duration;
    src.playbackRate.value = Math.pow(2, (clip.pitch || 0) / 12);

    // Time stretch sync if enabled
    if (pad.timeStretch && pad.originalBpm > 0 && pad.stretchMode === 'repitch') {
      src.playbackRate.value *= bpmRef.current / pad.originalBpm;
    }

    gain.gain.value = clip.volume ?? pad.volume;
    pan.pan.value = pad.pan;
    src.connect(gain); gain.connect(pan); pan.connect(masterRef.current);
    src.start(0, clip.loopStart || 0);

    clipSources.current[key] = { source: src, gain, pan };
    setClipStates(prev => ({ ...prev, [key]: 'playing' }));
    setActivePads(p => new Set([...p, padIdx]));

    src.onended = () => {
      delete clipSources.current[key];
      setClipStates(prev => { const u = { ...prev }; if (u[key] === 'playing') u[key] = 'stopped'; return u; });
      setActivePads(p => { const n = new Set(p); n.delete(padIdx); return n; });
    };
  }, [scenes, initCtx]);

  // Stop a single clip
  const stopClip = useCallback((sceneIdx, padIdx) => {
    const key = `${sceneIdx}_${padIdx}`;
    if (clipSources.current[key]) {
      const entry = clipSources.current[key];
      const c = ctxRef.current;
      // Fade out over 20ms to prevent click
      if (c && entry.gain) {
        entry.gain.gain.setValueAtTime(entry.gain.gain.value, c.currentTime);
        entry.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.02);
        try { entry.source.stop(c.currentTime + 0.025); } catch (e) { }
      } else {
        try { entry.source.stop(); } catch (e) { }
      }
      delete clipSources.current[key];
    }
    setClipStates(prev => ({ ...prev, [key]: 'stopped' }));
  }, []);

  // Toggle clip — play if stopped, stop if playing; queue if sequencer is running
  const toggleClip = useCallback((sceneIdx, padIdx) => {
    const key = `${sceneIdx}_${padIdx}`;
    const state = clipStates[key];
    if (state === 'playing') {
      stopClip(sceneIdx, padIdx);
    } else if (state === 'queued') {
      // Cancel queue
      setClipStates(prev => ({ ...prev, [key]: 'stopped' }));
    } else {
      // If sequencer is playing, queue to next bar boundary
      if (playingRef.current) {
        setClipStates(prev => ({ ...prev, [key]: 'queued' }));
        // Calculate time to next bar
        const c = ctxRef.current;
        if (c) {
          const beatDur = 60.0 / bpmRef.current;
          const barDur = beatDur * 4;
          const elapsed = c.currentTime - (nextStepT.current || c.currentTime);
          const nextBar = barDur - (elapsed % barDur);
          const launchTime = c.currentTime + nextBar;
          setTimeout(() => {
            // Check still queued before launching
            const currentState = clipStates[key];
            if (currentState === 'queued' || !clipSources.current[key]) {
              launchClip(sceneIdx, padIdx);
            }
          }, nextBar * 1000);
        } else {
          launchClip(sceneIdx, padIdx);
        }
      } else {
        launchClip(sceneIdx, padIdx);
      }
    }
  }, [clipStates, launchClip, stopClip]);

  // Launch entire scene — launch all clips in a scene, stop everything else
  const launchScene = useCallback((sceneIdx) => {
    const scene = scenes[sceneIdx];
    if (!scene) return;

    // Stop all currently playing clips with fade
    Object.keys(clipSources.current).forEach(k => {
      const entry = clipSources.current[k];
      const c = ctxRef.current;
      if (c && entry?.gain) {
        entry.gain.gain.setValueAtTime(entry.gain.gain.value, c.currentTime);
        entry.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.02);
        try { entry.source.stop(c.currentTime + 0.025); } catch (e) { }
      } else {
        try { entry.source.stop(); } catch (e) { }
      }
      delete clipSources.current[k];
    });
    setClipStates(prev => {
      const u = {};
      Object.keys(prev).forEach(k => { u[k] = 'stopped'; });
      return u;
    });

    // Launch all non-null clips in this scene
    scene.clips.forEach((clip, padIdx) => {
      if (clip) launchClip(sceneIdx, padIdx);
    });
    setActiveScene(sceneIdx);
  }, [scenes, launchClip]);

  // Stop all clips with fade
  const stopAllClips = useCallback(() => {
    const c = ctxRef.current;
    Object.keys(clipSources.current).forEach(k => {
      const entry = clipSources.current[k];
      if (c && entry?.gain) {
        entry.gain.gain.setValueAtTime(entry.gain.gain.value, c.currentTime);
        entry.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.02);
        try { entry.source.stop(c.currentTime + 0.025); } catch (e) { }
      } else {
        try { entry.source.stop(); } catch (e) { }
      }
      delete clipSources.current[k];
    });
    setClipStates({});
    setActiveScene(-1);
  }, []);

  // Add a new scene
  const addScene = useCallback(() => {
    setScenes(prev => [...prev, {
      name: `Scene ${prev.length + 1}`,
      clips: Array(16).fill(null),
    }]);
  }, []);

  // Duplicate a scene
  const duplicateScene = useCallback((idx) => {
    setScenes(prev => {
      const src = prev[idx];
      if (!src) return prev;
      const dup = { name: `${src.name} (copy)`, clips: src.clips.map(c => c ? { ...c } : null) };
      const u = [...prev]; u.splice(idx + 1, 0, dup); return u;
    });
  }, []);

  // Remove a scene
  const removeScene = useCallback((idx) => {
    // Stop any clips in this scene first
    scenes[idx]?.clips.forEach((clip, padIdx) => {
      if (clip) stopClip(idx, padIdx);
    });
    setScenes(prev => prev.filter((_, i) => i !== idx));
    if (activeScene === idx) setActiveScene(-1);
  }, [scenes, stopClip, activeScene]);

  // Rename scene
  const renameScene = useCallback((idx, name) => {
    setScenes(prev => { const u = [...prev]; u[idx] = { ...u[idx], name }; return u; });
  }, []);

  // Update clip properties
  const updateClip = useCallback((sceneIdx, padIdx, props) => {
    setScenes(prev => {
      const u = prev.map(s => ({ ...s, clips: [...s.clips] }));
      if (u[sceneIdx].clips[padIdx]) u[sceneIdx].clips[padIdx] = { ...u[sceneIdx].clips[padIdx], ...props };
      return u;
    });
    // If clip is playing, update gain/rate live
    const key = `${sceneIdx}_${padIdx}`;
    const entry = clipSources.current[key];
    if (entry) {
      if (props.volume !== undefined && entry.gain) entry.gain.gain.value = props.volume;
      if (props.pitch !== undefined && entry.source) entry.source.playbackRate.value = Math.pow(2, props.pitch / 12);
    }
  }, []);

  // Auto-fill scene from current pad states
  const fillSceneFromPads = useCallback((sceneIdx) => {
    padsRef.current.forEach((pad, pi) => {
      if (pad.buffer) assignClip(sceneIdx, pi);
    });
  }, [assignClip]);

  // Clip editing state
  const [editingClip, setEditingClip] = useState(null); // { sceneIdx, padIdx }

  // =========================================================================
  // LIVE RECORDING + QUANTIZE (Phase 2)
  // =========================================================================

  const startLiveRec = useCallback(() => {
    if (!overdub) setSteps(Array.from({ length: 16 }, () => Array(stepCount).fill(false)));
    setRecHits([]); setLiveRec(true);
    if (!playingRef.current) startSeq();
  }, [overdub, stepCount, startSeq]);

  const stopLiveRec = useCallback(() => {
    setLiveRec(false);
    if (recHits.length > 0) {
      const sd = 60.0 / bpm / 4;
      const qm = { '1/4': 4, '1/8': 2, '1/16': 1, '1/32': 0.5 };
      const qs = qm[quantVal] || 1;
      setSteps(prev => {
        const u = prev.map(r => [...r]);
        recHits.forEach(h => { const si = Math.round(Math.round(h.time / sd / qs) * qs) % stepCount; if (si >= 0 && si < stepCount) u[h.pad][si] = true; });
        return u;
      });
      setStepVel(prev => {
        const u = prev.map(r => [...r]);
        recHits.forEach(h => { const si = Math.round(Math.round(h.time / (60.0 / bpm / 4) / (qm[quantVal] || 1)) * (qm[quantVal] || 1)) % stepCount; if (si >= 0 && si < stepCount) u[h.pad][si] = h.velocity; });
        return u;
      });
    }
  }, [recHits, bpm, quantVal, stepCount]);

  const handleLiveHit = useCallback((pi, vel = 0.8) => {
    if (!liveRef.current || !ctxRef.current) return;
    setRecHits(p => [...p, { pad: pi, time: ctxRef.current.currentTime - recStartT.current, velocity: vel }]);
  }, []);

  // =========================================================================
  // WAVEFORM CHOP (Phase 2)
  // =========================================================================

  const openChop = useCallback((pi) => { if (!pads[pi]?.buffer) return; setChopIdx(pi); setChopPts([]); setShowChop(true); }, [pads]);

  const drawWave = useCallback(() => {
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
    const data = pad.buffer.getChannelData(0), step = Math.ceil(data.length / w);
    const dur = pad.buffer.duration;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, w, h);

    // Alternating slice background shading
    const allPts = [0, ...chopPts, dur];
    for (let i = 0; i < allPts.length - 1; i++) {
      const x1 = (allPts[i] / dur) * w, x2 = (allPts[i + 1] / dur) * w;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,255,200,0.03)' : 'rgba(255,102,0,0.03)';
      ctx.fillRect(x1, 0, x2 - x1, h);
      // Slice number centered
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, (x1 + x2) / 2, h / 2 + 8);
    }
    ctx.textAlign = 'start';

    // Waveform
    ctx.strokeStyle = '#00ffc8'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const s = i * step; let mn = 1, mx = -1;
      for (let j = 0; j < step; j++) { const v = data[s + j] || 0; if (v < mn) mn = v; if (v > mx) mx = v; }
      ctx.moveTo(i, ((1 + mn) / 2) * h); ctx.lineTo(i, ((1 + mx) / 2) * h);
    }
    ctx.stroke();

    // Chop lines with drag handles
    chopPts.forEach((pt, idx) => {
      const x = (pt / dur) * w;
      // Line
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]);
      // Top handle (triangle)
      ctx.fillStyle = '#ff6600'; ctx.beginPath();
      ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x, 12); ctx.fill();
      // Bottom handle
      ctx.beginPath(); ctx.moveTo(x - 6, h); ctx.lineTo(x + 6, h); ctx.lineTo(x, h - 12); ctx.fill();
      // Time label
      ctx.fillStyle = '#fff'; ctx.font = '9px monospace';
      ctx.fillText(`${pt.toFixed(3)}s`, x + 3, h - 3);
    });

    // Trim region highlight
    const ts = ((pad.trimStart || 0) / dur) * w;
    const te = ((pad.trimEnd || dur) / dur) * w;
    if (pad.trimStart > 0) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, ts, h); }
    if ((pad.trimEnd || dur) < dur) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(te, 0, w - te, h); }
  }, [chopIdx, pads, chopPts]);

  useEffect(() => { if (showChop) drawWave(); }, [showChop, drawWave, chopPts]);

  // Phase 1: Drag state for chop points
  const chopDragRef = useRef({ dragging: false, idx: -1 });

  const chopCanvasClick = useCallback((e) => {
    if (e.button !== 0 || chopDragRef.current.dragging) return;
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const r = cv.getBoundingClientRect();
    const clickX = e.clientX - r.left;
    const dur = pad.buffer.duration;
    // Don't add if clicking near an existing handle (drag takes priority)
    const nearExisting = chopPts.findIndex(pt => Math.abs((pt / dur) * cv.width - clickX) < 8);
    if (nearExisting !== -1) return;
    let t = (clickX / cv.width) * dur;
    if (zeroCrossSnap) {
      const sampleIdx = Math.floor(t * pad.buffer.sampleRate);
      const data = pad.buffer.getChannelData(0);
      t = findZeroCrossing(data, sampleIdx) / pad.buffer.sampleRate;
    }
    setChopPts(p => [...p, t].sort((a, b) => a - b));
  }, [chopIdx, pads, zeroCrossSnap, chopPts]);

  // Phase 1: Mousedown on chop handle starts drag
  const chopMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const r = cv.getBoundingClientRect();
    const clickX = e.clientX - r.left;
    const dur = pad.buffer.duration;
    const nearIdx = chopPts.findIndex(pt => Math.abs((pt / dur) * cv.width - clickX) < 8);
    if (nearIdx !== -1) { e.preventDefault(); chopDragRef.current = { dragging: true, idx: nearIdx }; }
  }, [chopIdx, pads, chopPts]);

  const chopMouseMove = useCallback((e) => {
    if (!chopDragRef.current.dragging) return;
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const r = cv.getBoundingClientRect();
    const dur = pad.buffer.duration;
    let t = Math.max(0.001, Math.min(dur - 0.001, ((e.clientX - r.left) / cv.width) * dur));
    if (zeroCrossSnap) {
      const data = pad.buffer.getChannelData(0);
      t = findZeroCrossing(data, Math.floor(t * pad.buffer.sampleRate)) / pad.buffer.sampleRate;
    }
    setChopPts(prev => {
      const u = [...prev]; u[chopDragRef.current.idx] = t; return u.sort((a, b) => a - b);
    });
  }, [chopIdx, pads, zeroCrossSnap]);

  const chopMouseUp = useCallback(() => { chopDragRef.current = { dragging: false, idx: -1 }; }, []);

  // Phase 1: Right-click to delete chop point
  const chopContextMenu = useCallback((e) => {
    e.preventDefault();
    const cv = chopCanvas.current; if (!cv || chopIdx === null) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const r = cv.getBoundingClientRect();
    const clickX = e.clientX - r.left;
    const dur = pad.buffer.duration;
    const nearIdx = chopPts.findIndex(pt => Math.abs((pt / dur) * cv.width - clickX) < 12);
    if (nearIdx !== -1) setChopPts(prev => prev.filter((_, i) => i !== nearIdx));
  }, [chopIdx, pads, chopPts]);

  const autoChop = useCallback(() => {
    if (chopIdx === null) return; const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const data = pad.buffer.getChannelData(0), sr = pad.buffer.sampleRate, dur = pad.buffer.duration;
    let pts = [];
    if (chopMode === 'transient') {
      const ws = Math.floor(sr * 0.01); let prevE = 0;
      for (let i = 0; i < data.length; i += ws) {
        let e = 0; for (let j = i; j < Math.min(i + ws, data.length); j++) e += data[j] * data[j]; e /= ws;
        if (e > chopSens * 0.1 && e > prevE * 3 && i > 0) {
          let t = i / sr;
          if (zeroCrossSnap) { const zc = findZeroCrossing(data, i); t = zc / sr; }
          if (pts.length === 0 || t - pts[pts.length - 1] > 0.05) pts.push(t);
        }
        prevE = e;
      }
    } else if (chopMode === 'bpmgrid') {
      const beatDur = 60.0 / bpm;
      const sliceDur = beatDur / 4; // 16th note grid
      for (let t = sliceDur; t < dur - 0.01; t += sliceDur) {
        let snapT = t;
        if (zeroCrossSnap) { const zc = findZeroCrossing(data, Math.floor(t * sr)); snapT = zc / sr; }
        pts.push(snapT);
      }
    } else if (chopMode === 'equal') {
      const sliceDur = dur / chopSlices;
      for (let i = 1; i < chopSlices; i++) {
        let t = sliceDur * i;
        if (zeroCrossSnap) { const zc = findZeroCrossing(data, Math.floor(t * sr)); t = zc / sr; }
        pts.push(t);
      }
    }
    setChopPts(pts);
  }, [chopIdx, pads, chopSens, chopMode, zeroCrossSnap, bpm, chopSlices]);

  const distributeToPads = useCallback(() => {
    if (chopIdx === null || chopPts.length === 0) return;
    const pad = pads[chopIdx]; if (!pad?.buffer) return;
    const c = initCtx();
    const buf = pad.buffer;
    const sr = buf.sampleRate;
    const nc = buf.numberOfChannels;
    const all = [0, ...chopPts, buf.duration];
    const crossfadeSamples = Math.floor(sr * 0.002); // 2ms crossfade to prevent clicks

    const count = Math.min(all.length - 1, 16);
    for (let i = 0; i < count; i++) {
      const startSec = all[i];
      const endSec = all[i + 1];
      const startSample = Math.floor(startSec * sr);
      const endSample = Math.min(Math.ceil(endSec * sr), buf.length);
      const len = endSample - startSample;
      if (len <= 0) continue;

      // Extract into its own buffer
      const sliceBuf = c.createBuffer(nc, len, sr);
      for (let ch = 0; ch < nc; ch++) {
        const src = buf.getChannelData(ch);
        const dst = sliceBuf.getChannelData(ch);
        for (let s = 0; s < len; s++) dst[s] = src[startSample + s];
        // Crossfade edges to prevent clicks
        const fi = Math.min(crossfadeSamples, Math.floor(len / 4));
        for (let s = 0; s < fi; s++) dst[s] *= s / fi; // fade in
        for (let s = 0; s < fi; s++) dst[len - 1 - s] *= s / fi; // fade out
      }

      setPads(p => {
        const u = [...p];
        u[i] = { ...u[i], buffer: sliceBuf, name: `Chop ${i + 1}`, trimStart: 0, trimEnd: sliceBuf.duration };
        return u;
      });
    }
    setShowChop(false);
  }, [chopIdx, chopPts, pads, initCtx]);

  // =========================================================================
  // PATTERN MANAGEMENT (Phase 2)
  // =========================================================================

  const addPattern = useCallback(() => {
    setPatterns(p => [...p, mkPattern(`Pattern ${p.length + 1}`, stepCount)]);
  }, [stepCount]);
  const dupPattern = useCallback((i) => {
    setPatterns(p => { const s = p[i]; return [...p, { ...s, name: `${s.name} (copy)`, steps: s.steps.map(r => [...r]), velocities: s.velocities.map(r => [...r]) }]; });
  }, []);
  const delPattern = useCallback((i) => {
    if (patterns.length <= 1) return;
    setPatterns(p => p.filter((_, j) => j !== i));
    if (curPatIdx >= patterns.length - 1) setCurPatIdx(Math.max(0, patterns.length - 2));
  }, [patterns.length, curPatIdx]);
  const renamePattern = useCallback((i, n) => { setPatterns(p => { const u = [...p]; u[i] = { ...u[i], name: n }; return u; }); }, []);

  // =========================================================================
  // SAVE KIT (Phase 3)
  // =========================================================================

  const saveKit = useCallback((name) => {
    const kit = { name, date: new Date().toISOString(), pads: pads.map(p => ({ name: p.name, volume: p.volume, pitch: p.pitch, pan: p.pan, playMode: p.playMode, reverse: p.reverse, trimStart: p.trimStart, trimEnd: p.trimEnd, filterOn: p.filterOn, filterType: p.filterType, filterFreq: p.filterFreq, filterQ: p.filterQ, reverbOn: p.reverbOn, reverbMix: p.reverbMix, delayOn: p.delayOn, delayTime: p.delayTime, delayFeedback: p.delayFeedback, delayMix: p.delayMix, distortionOn: p.distortionOn, distortionAmt: p.distortionAmt, attack: p.attack, release: p.release, hasBuffer: !!p.buffer })) };
    const u = [...savedKits, kit]; setSavedKits(u);
    try { localStorage.setItem('spx_kits', JSON.stringify(u)); } catch (e) { }
  }, [pads, savedKits]);

  // =========================================================================
  // TAP TEMPO
  // =========================================================================

  const tapTempo = useCallback(() => {
    const now = performance.now(), ts = tapTimes.current;
    if (ts.length > 0 && now - ts[ts.length - 1] > 2000) tapTimes.current = [];
    ts.push(now); if (ts.length > 8) ts.shift();
    if (ts.length >= 2) {
      let t = 0; for (let i = 1; i < ts.length; i++) t += ts[i] - ts[i - 1];
      const nb = Math.round(60000 / (t / (ts.length - 1)));
      if (nb >= 40 && nb <= 300) setBpm(nb);
    }
  }, []);

  // =========================================================================
  // KEYBOARD
  // =========================================================================

  // Phase 3: QWERTY → chromatic note mapping (2 octaves centered on root)
  const KG_KEY_MAP = useMemo(() => ({
    'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11, // Lower octave
    'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23, 'i': 24, // Upper octave
  }), []);

  const kgActiveKeys = useRef(new Set()); // prevent key repeat

  useEffect(() => {
    const kd = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); togglePlay(); return; }

      // Phase 3: If selected pad is keygroup, use chromatic keyboard
      if (selectedPad !== null && padsRef.current[selectedPad]?.programType === 'keygroup' && KG_KEY_MAP.hasOwnProperty(k)) {
        if (kgActiveKeys.current.has(k)) return; // prevent repeat
        kgActiveKeys.current.add(k);
        e.preventDefault();
        const pad = padsRef.current[selectedPad];
        const rootOctaveBase = Math.floor((pad.rootNote || 60) / 12) * 12; // C of root's octave
        const midiNote = rootOctaveBase + KG_KEY_MAP[k];
        initCtx(); playPadKeygroup(selectedPad, midiNote);
        return;
      }

      // Standard drum pad keys
      if (KEY_TO_PAD.hasOwnProperty(k)) { e.preventDefault(); initCtx(); playPad(KEY_TO_PAD[k]); if (liveRef.current) handleLiveHit(KEY_TO_PAD[k]); if (midiLearn) { setMidiLearnPad(KEY_TO_PAD[k]); } }
    };
    const ku = (e) => {
      const k = e.key.toLowerCase();

      // Phase 3: Keygroup noteOff on key release
      if (selectedPad !== null && padsRef.current[selectedPad]?.programType === 'keygroup' && KG_KEY_MAP.hasOwnProperty(k)) {
        kgActiveKeys.current.delete(k);
        const pad = padsRef.current[selectedPad];
        const rootOctaveBase = Math.floor((pad.rootNote || 60) / 12) * 12;
        const midiNote = rootOctaveBase + KG_KEY_MAP[k];
        stopPadKeygroup(selectedPad, midiNote);
        return;
      }

      if (KEY_TO_PAD.hasOwnProperty(k) && padsRef.current[KEY_TO_PAD[k]]?.playMode === 'hold') stopPad(KEY_TO_PAD[k]);
    };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [playPad, stopPad, togglePlay, handleLiveHit, initCtx, midiLearn, selectedPad, playPadKeygroup, stopPadKeygroup, KG_KEY_MAP]);

  // =========================================================================
  // DRAG & DROP / FILE SELECT
  // =========================================================================

  const onDragOver = useCallback((e, pi) => { e.preventDefault(); e.stopPropagation(); setDragPad(pi); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDragPad(null); }, []);
  const onDrop = useCallback((e, pi) => {
    e.preventDefault(); e.stopPropagation(); setDragPad(null);
    const f = e.dataTransfer.files;
    if (f.length > 0 && (f[0].type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff|m4a)$/i.test(f[0].name))) loadSample(pi, f[0]);
  }, [loadSample]);
  const fileSelect = useCallback((pi) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a';
    inp.onchange = (e) => { if (e.target.files[0]) loadSample(pi, e.target.files[0]); }; inp.click();
  }, [loadSample]);

  // =========================================================================
  // STEP TOGGLE
  // =========================================================================

  const toggleStep = useCallback((pi, si, e) => {
    setSteps(p => { const u = p.map(r => [...r]); u[pi][si] = !u[pi][si]; return u; });
    if (e) {
      let v = 0.8; if (e.shiftKey) v = 0.4; if (e.ctrlKey || e.metaKey) v = 1.0;
      setStepVel(p => { const u = p.map(r => [...r]); u[pi][si] = v; return u; });
    }
  }, []);
  const clearPat = useCallback(() => {
    setSteps(Array.from({ length: 16 }, () => Array(stepCount).fill(false)));
    setStepVel(Array.from({ length: 16 }, () => Array(stepCount).fill(0.8)));
    setCurStep(-1);
  }, [stepCount]);
  const updatePad = useCallback((pi, u) => { setPads(p => { const a = [...p]; a[pi] = { ...a[pi], ...u }; return a; }); }, []);
  const clearPad = useCallback((pi) => {
    setPads(p => { const a = [...p]; a[pi] = { ...DEFAULT_PAD, id: pi, color: PAD_COLORS[pi] }; return a; });
    setSteps(p => { const u = p.map(r => [...r]); u[pi] = Array(stepCount).fill(false); return u; });
  }, [stepCount]);

  // =========================================================================
  // EXPORT — WAV / MP3 / OGG / WEBM / Stems / MIDI
  // =========================================================================

  // ── WAV encoder (lossless, direct from AudioBuffer) ──
  // WAV encoder: supports 16-bit PCM, 24-bit PCM, 32-bit float
  const toWav = useCallback((buf, bitDepth) => {
    const bd = bitDepth || exportBitDepth || 16;
    const nc = buf.numberOfChannels, sr = buf.sampleRate;
    const bytesPerSample = bd === 32 ? 4 : bd === 24 ? 3 : 2;
    const ba = nc * bytesPerSample, dl = buf.length * ba;
    const fmt = bd === 32 ? 3 : 1; // 3=IEEE float, 1=PCM
    const ab = new ArrayBuffer(44 + dl), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + dl, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, fmt, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * ba, true); v.setUint16(32, ba, true); v.setUint16(34, bd, true);
    ws(36, 'data'); v.setUint32(40, dl, true);
    const chs = []; for (let c = 0; c < nc; c++) chs.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < buf.length; i++) {
      for (let c = 0; c < nc; c++) {
        const s = Math.max(-1, Math.min(1, chs[c][i]));
        if (bd === 32) { v.setFloat32(o, s, true); o += 4; }
        else if (bd === 24) {
          const int24 = s < 0 ? Math.max(-8388608, Math.round(s * 8388608)) : Math.min(8388607, Math.round(s * 8388607));
          v.setUint8(o, int24 & 0xFF); v.setUint8(o + 1, (int24 >> 8) & 0xFF); v.setUint8(o + 2, (int24 >> 16) & 0xFF); o += 3;
        } else { v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2; }
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }, [exportBitDepth]);

  // ── MP3 encoder (loads lamejs dynamically) ──
  const loadLame = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (lameRef.current) { resolve(lameRef.current); return; }
      if (window.lamejs) { lameRef.current = window.lamejs; resolve(window.lamejs); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
      s.onload = () => { lameRef.current = window.lamejs; resolve(window.lamejs); };
      s.onerror = () => reject(new Error('Failed to load MP3 encoder. Check internet connection.'));
      document.head.appendChild(s);
    });
  }, []);

  const toMp3 = useCallback(async (buf, kbps = 192) => {
    const lamejs = await loadLame();
    const nc = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
    const mp3enc = new lamejs.Mp3Encoder(nc, sr, kbps);
    const blockSize = 1152;
    const mp3Buf = [];
    const left = new Int16Array(len);
    const right = nc > 1 ? new Int16Array(len) : null;
    const ld = buf.getChannelData(0);
    for (let i = 0; i < len; i++) left[i] = Math.max(-32768, Math.min(32767, Math.round(ld[i] * 32767)));
    if (right) {
      const rd = buf.getChannelData(1);
      for (let i = 0; i < len; i++) right[i] = Math.max(-32768, Math.min(32767, Math.round(rd[i] * 32767)));
    }
    for (let i = 0; i < len; i += blockSize) {
      const lc = left.subarray(i, i + blockSize);
      const rc = right ? right.subarray(i, i + blockSize) : lc;
      const chunk = nc > 1 ? mp3enc.encodeBuffer(lc, rc) : mp3enc.encodeBuffer(lc);
      if (chunk.length > 0) mp3Buf.push(chunk);
    }
    const end = mp3enc.flush();
    if (end.length > 0) mp3Buf.push(end);
    return new Blob(mp3Buf, { type: 'audio/mp3' });
  }, [loadLame]);

  // ── OGG / WEBM encoder (MediaRecorder re-encode from AudioBuffer) ──
  const toMediaRecorderFormat = useCallback(async (buf, mimeType) => {
    return new Promise((resolve, reject) => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      const supported = MediaRecorder.isTypeSupported(mimeType);
      if (!supported) { reject(new Error(`${mimeType} not supported in this browser`)); ctx.close(); return; }
      const rec = new MediaRecorder(dest.stream, { mimeType });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        ctx.close();
        resolve(new Blob(chunks, { type: mimeType }));
      };
      rec.onerror = (e) => { ctx.close(); reject(e.error || new Error('MediaRecorder error')); };
      rec.start();
      src.onended = () => { setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 100); };
      src.start(0);
    });
  }, []);

  const toOgg = useCallback(async (buf) => {
    const types = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return toMediaRecorderFormat(buf, t); }
    throw new Error('OGG encoding not supported in this browser. Use WAV or MP3.');
  }, [toMediaRecorderFormat]);

  const toWebm = useCallback(async (buf) => {
    const types = ['audio/webm;codecs=opus', 'audio/webm'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return toMediaRecorderFormat(buf, t); }
    throw new Error('WebM encoding not supported in this browser. Use WAV or MP3.');
  }, [toMediaRecorderFormat]);

  // ── Universal format converter ──
  const FORMAT_INFO = { wav: { ext: 'wav', label: 'WAV (Lossless)' }, wav24: { ext: 'wav', label: 'WAV 24-bit' }, wav32: { ext: 'wav', label: 'WAV 32-bit Float' }, mp3: { ext: 'mp3', label: 'MP3' }, ogg: { ext: 'ogg', label: 'OGG Opus' }, webm: { ext: 'webm', label: 'WebM Opus' } };

  const convertToFormat = useCallback(async (audioBuffer, format, quality) => {
    switch (format) {
      case 'mp3': return toMp3(audioBuffer, quality || exportQuality);
      case 'ogg': return toOgg(audioBuffer);
      case 'webm': return toWebm(audioBuffer);
      case 'wav': default: return toWav(audioBuffer);
    }
  }, [toWav, toMp3, toOgg, toWebm, exportQuality]);

  // ── File download helper ──
  const downloadBlob = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    // Fix #3: Revoke after delay to ensure download completes
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, []);

  // ── Render single pattern ──
  const renderPat = useCallback(async (patSteps, patVel, patSC) => {
    const sd = 60.0 / bpm / 4, dur = patSC * sd, sr = 44100;
    const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const mg = oc.createGain(); mg.gain.value = masterVol; mg.connect(oc.destination);
    for (let si = 0; si < patSC; si++) {
      const st = si * sd; let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
      for (let pi = 0; pi < 16; pi++) {
        if (patSteps[pi]?.[si] && pads[pi].buffer) {
          const pad = pads[pi], vel = patVel[pi]?.[si] ?? 0.8;
          const s = oc.createBufferSource(), g = oc.createGain(), pn = oc.createStereoPanner();
          s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
          g.gain.value = pad.volume * vel; pn.pan.value = pad.pan;
          s.connect(g); g.connect(pn); pn.connect(mg);
          const off = pad.trimStart || 0; s.start(st + so, off, (pad.trimEnd || pad.buffer.duration) - off);
        }
      }
    }
    return await oc.startRendering();
  }, [bpm, swing, pads, masterVol]);

  // ── Render full song (chain all patterns in songSeq) ──
  const renderSong = useCallback(async () => {
    const bufs = [];
    for (const b of songSeq) {
      const p = patterns[b.patternIndex];
      if (p) bufs.push(await renderPat(p.steps, p.velocities, p.stepCount));
    }
    if (bufs.length === 0) return null;
    const totalLen = bufs.reduce((s, b) => s + b.length, 0);
    const oc = new OfflineAudioContext(2, totalLen, 44100);
    let off = 0;
    for (const b of bufs) {
      const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(off / 44100); off += b.length;
    }
    return await oc.startRendering();
  }, [songSeq, patterns, renderPat]);

  // ── Render single pad stem (works for pattern or full song) ──
  const renderStemForPad = useCallback(async (padIndex, useSongMode) => {
    const pad = pads[padIndex];
    if (!pad.buffer) return null;

    if (useSongMode && songSeq.length > 0) {
      // Render pad across all song patterns
      const segBufs = [];
      for (const b of songSeq) {
        const p = patterns[b.patternIndex];
        if (!p) continue;
        const sc = p.stepCount, sd = 60.0 / bpm / 4, dur = sc * sd;
        const oc = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
        const g = oc.createGain(); g.gain.value = pad.volume; g.connect(oc.destination);
        for (let si = 0; si < sc; si++) {
          if (!p.steps[padIndex]?.[si]) continue;
          let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
          const s = oc.createBufferSource(), sg = oc.createGain();
          s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
          sg.gain.value = p.velocities[padIndex]?.[si] ?? 0.8; s.connect(sg); sg.connect(g);
          const off = pad.trimStart || 0; s.start(si * sd + so, off, (pad.trimEnd || pad.buffer.duration) - off);
        }
        segBufs.push(await oc.startRendering());
      }
      if (segBufs.length === 0) return null;
      const totalLen = segBufs.reduce((s, b) => s + b.length, 0);
      const oc = new OfflineAudioContext(2, totalLen, 44100);
      let off = 0;
      for (const b of segBufs) { const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start(off / 44100); off += b.length; }
      return await oc.startRendering();
    } else {
      // Render pad for current pattern only
      const sd = 60.0 / bpm / 4, dur = stepCount * sd;
      const oc = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100);
      const g = oc.createGain(); g.gain.value = pad.volume; g.connect(oc.destination);
      for (let si = 0; si < stepCount; si++) {
        if (!steps[padIndex]?.[si]) continue;
        let so = 0; if (si % 2 === 1 && swing > 0) so = sd * (swing / 100) * 0.5;
        const s = oc.createBufferSource(), sg = oc.createGain();
        s.buffer = pad.buffer; s.playbackRate.value = Math.pow(2, pad.pitch / 12);
        sg.gain.value = stepVel[padIndex]?.[si] ?? 0.8; s.connect(sg); sg.connect(g);
        const off = pad.trimStart || 0; s.start(si * sd + so, off, (pad.trimEnd || pad.buffer.duration) - off);
      }
      return await oc.startRendering();
    }
  }, [pads, steps, stepVel, stepCount, bpm, swing, songSeq, patterns]);

  // ── Export full beat (desktop download + optional DAW send) ──
  const exportBeat = useCallback(async (fmt, sendToDaw = false) => {
    const format = fmt || exportFormat;
    setExporting(true);
    setExportProgress('Rendering audio...');
    try {
      let rendered;
      if (songMode && songSeq.length > 0) {
        setExportProgress('Rendering song arrangement...');
        rendered = await renderSong();
        if (!rendered) throw new Error('No patterns in song sequence');
      } else {
        rendered = await renderPat(steps, stepVel, stepCount);
      }

      setExportProgress(`Encoding ${format.toUpperCase()}...`);
      const blob = await convertToFormat(rendered, format, exportQuality);
      const ext = FORMAT_INFO[format]?.ext || format;
      const dateStr = new Date().toISOString().slice(0, 10);
      const songLabel = songMode && songSeq.length > 0 ? 'song' : 'beat';
      downloadBlob(blob, `${songLabel}_${bpm}bpm_${dateStr}.${ext}`);

      // Also send WAV to DAW if requested (always WAV for DAW quality)
      if (sendToDaw && onExport) {
        const wavBlob = format === 'wav' ? blob : toWav(rendered);
        onExport(rendered, wavBlob);
      }

      setExportProgress('');
      setExportStatus(`✓ Exported ${format.toUpperCase()}`);
    } catch (e) {
      console.error('Export fail:', e);
      setExportProgress('');
      setExportStatus(`✗ Export failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [songMode, songSeq, patterns, steps, stepVel, stepCount, bpm, exportFormat, exportQuality, renderPat, renderSong, convertToFormat, downloadBlob, toWav, onExport]);

  // ── Export multi-track stems (each pad as separate file) ──
  const exportStems = useCallback(async (fmt) => {
    const format = fmt || exportFormat;
    const useSong = songMode && songSeq.length > 0;
    setExporting(true);
    let exported = 0;
    try {
      const activePads = [];
      for (let pi = 0; pi < 16; pi++) {
        if (!pads[pi].buffer) continue;
        // Check if pad has any active steps in current pattern or song patterns
        if (useSong) {
          const hasSteps = songSeq.some(b => { const p = patterns[b.patternIndex]; return p?.steps[pi]?.some(s => s); });
          if (hasSteps) activePads.push(pi);
        } else {
          if (steps[pi]?.some(s => s)) activePads.push(pi);
        }
      }
      if (activePads.length === 0) { setExportStatus('⚠ No active pads to export'); setExporting(false); return; }

      for (const pi of activePads) {
        setExportProgress(`Rendering stem ${++exported}/${activePads.length}: ${pads[pi].name}...`);
        const stemBuf = await renderStemForPad(pi, useSong);
        if (!stemBuf) continue;

        setExportProgress(`Encoding ${pads[pi].name} → ${format.toUpperCase()}...`);
        const blob = await convertToFormat(stemBuf, format, exportQuality);
        const ext = FORMAT_INFO[format]?.ext || format;
        const safeName = pads[pi].name.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadBlob(blob, `stem_${safeName}_${bpm}bpm.${ext}`);
        await new Promise(r => setTimeout(r, 350)); // Browser download spacing
      }
      setExportProgress('');
      setExportStatus(`✓ ${exported} stems exported as ${format.toUpperCase()}`);
    } catch (e) {
      console.error('Stem export fail:', e);
      setExportProgress('');
      setExportStatus(`✗ Stem export failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [pads, steps, stepVel, stepCount, bpm, swing, songMode, songSeq, patterns, exportFormat, exportQuality, convertToFormat, downloadBlob, renderStemForPad]);

  // ── Export bounce (full mix + all stems together) ──
  const exportBounceAll = useCallback(async (fmt) => {
    const format = fmt || exportFormat;
    setExporting(true);
    try {
      // 1) Export the full mix
      setExportProgress('Bouncing full mix...');
      await exportBeat(format, false);
      await new Promise(r => setTimeout(r, 500));
      // 2) Export all stems
      await exportStems(format);
      setExportStatus(`✓ Bounce complete (mix + stems) as ${format.toUpperCase()}`);
    } catch (e) {
      setExportProgress('');
      setExportStatus(`✗ Bounce failed: ${e.message}`);
    } finally { setExporting(false); }
  }, [exportFormat, exportBeat, exportStems]);

  // ── Quick export to DAW (always WAV for quality) ──
  const exportToDaw = useCallback(async () => {
    if (!onExport) { setExportStatus('⚠ DAW export only available inside Recording Studio'); return; }
    setExporting(true);
    setExportProgress('Rendering for DAW...');
    try {
      let rendered;
      if (songMode && songSeq.length > 0) { rendered = await renderSong(); }
      else { rendered = await renderPat(steps, stepVel, stepCount); }
      if (!rendered) { setExportStatus('⚠ Nothing to export'); return; }
      const blob = toWav(rendered);
      onExport(rendered, blob);
      setExportProgress('');
      setExportStatus('✓ Sent to DAW track');
    } catch (e) { setExportProgress(''); setExportStatus(`✗ ${e.message}`); }
    finally { setExporting(false); }
  }, [songMode, songSeq, steps, stepVel, stepCount, renderPat, renderSong, toWav, onExport]);

  // ── MIDI export ──
  const exportMIDI = useCallback(() => {
    const useSong = songMode && songSeq.length > 0;
    const tpb = 480, tps = tpb / 4;
    const hdr = [0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (tpb >> 8) & 0xFF, tpb & 0xFF];
    const evts = [];
    const usPerBeat = Math.round(60000000 / bpm);
    evts.push({ d: 0, data: [0xFF, 0x51, 0x03, (usPerBeat >> 16) & 0xFF, (usPerBeat >> 8) & 0xFF, usPerBeat & 0xFF] });

    if (useSong) {
      let tickOff = 0;
      for (const b of songSeq) {
        const p = patterns[b.patternIndex];
        if (!p) continue;
        for (let si = 0; si < p.stepCount; si++) for (let pi = 0; pi < 16; pi++) {
          if (!p.steps[pi]?.[si]) continue;
          const v = Math.round((p.velocities[pi]?.[si] ?? 0.8) * 127), n = 36 + pi, tick = tickOff + si * tps;
          evts.push({ d: tick, data: [0x90, n, v] }); evts.push({ d: tick + tps - 1, data: [0x80, n, 0] });
        }
        tickOff += p.stepCount * tps;
      }
    } else {
      for (let si = 0; si < stepCount; si++) for (let pi = 0; pi < 16; pi++) {
        if (!steps[pi]?.[si]) continue;
        const v = Math.round((stepVel[pi]?.[si] ?? 0.8) * 127), n = 36 + pi, tick = si * tps;
        evts.push({ d: tick, data: [0x90, n, v] }); evts.push({ d: tick + tps - 1, data: [0x80, n, 0] });
      }
    }

    evts.sort((a, b) => a.d - b.d);
    const tb = []; let lt = 0;
    evts.forEach(e => {
      let rd = e.d - lt; lt = e.d;
      const db = []; db.push(rd & 0x7F); while (rd > 0x7F) { rd >>= 7; db.push((rd & 0x7F) | 0x80); }
      db.reverse().forEach(b => tb.push(b)); e.data.forEach(b => tb.push(b));
    });
    tb.push(0x00, 0xFF, 0x2F, 0x00);
    const th = [0x4D, 0x54, 0x72, 0x6B, (tb.length >> 24) & 0xFF, (tb.length >> 16) & 0xFF, (tb.length >> 8) & 0xFF, tb.length & 0xFF];
    const blob = new Blob([new Uint8Array([...hdr, ...th, ...tb])], { type: 'audio/midi' });
    const label = useSong ? 'song' : 'beat';
    downloadBlob(blob, `${label}_${bpm}bpm.mid`);
    setExportStatus('✓ MIDI exported');
  }, [steps, stepVel, stepCount, bpm, songMode, songSeq, patterns, downloadBlob]);

  // ── Auto-clear export status ──
  useEffect(() => {
    if (!exportStatus) return;
    const t = setTimeout(() => setExportStatus(''), 4000);
    return () => clearTimeout(t);
  }, [exportStatus]);

  // =========================================================================
  // CLEANUP
  // =========================================================================
  useEffect(() => { return () => { stopSeq(); if (ctxRef.current) ctxRef.current.close(); if (mediaStream.current) mediaStream.current.getTracks().forEach(t => t.stop()); blobUrls.current.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { } }); Object.keys(clipSources.current).forEach(k => { try { clipSources.current[k].source.stop(); } catch (e) { } }); }; }, [stopSeq]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className={`sampler-beat-maker ${isEmbedded ? 'embedded' : ''}`}>

      {/* TOP BAR */}
      <div className="sampler-topbar">
        <div className="sampler-topbar-left">
          <h2 className="sampler-title"><span className="sampler-title-icon">🥁</span>Beat Maker</h2>
          <div className="pattern-selector">
            {patterns.map((p, i) => (
              <button key={i} className={`pattern-btn ${i === curPatIdx ? 'active' : ''}`} onClick={() => setCurPatIdx(i)}
                onDoubleClick={() => { const n = prompt('Rename:', p.name); if (n) renamePattern(i, n); }}
                onContextMenu={(e) => { e.preventDefault(); if (confirm(`Delete "${p.name}"?`)) delPattern(i); }}>
                {p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name}
              </button>
            ))}
            <button className="pattern-btn add" onClick={addPattern}>+</button>
            <button className="pattern-btn dup" onClick={() => dupPattern(curPatIdx)} title="Duplicate">⧉</button>
          </div>
        </div>

        <div className="sampler-transport">
          <button className={`transport-btn ${isPlaying ? 'active stop' : 'play'}`} onClick={togglePlay} title="Space">{isPlaying ? '⏹' : '▶'}</button>
          <button className={`transport-btn rec ${liveRec ? 'recording' : ''}`} onClick={() => liveRec ? stopLiveRec() : startLiveRec()} title="Live Record">⏺</button>
          <button className={`transport-btn ${overdub ? 'active' : ''}`} onClick={() => setOverdub(p => !p)} title="Overdub">OVR</button>

          <div className="bpm-control">
            <button className="bpm-nudge" onClick={() => setBpm(p => Math.max(40, p - 1))}>−</button>
            <input type="number" className="bpm-input" value={bpm} min={40} max={300} onChange={(e) => setBpm(Math.min(300, Math.max(40, parseInt(e.target.value) || 140)))} />
            <span className="bpm-label">BPM</span>
            <button className="bpm-nudge" onClick={() => setBpm(p => Math.min(300, p + 1))}>+</button>
          </div>

          <button className="transport-btn tap" onClick={tapTempo}>TAP</button>
          <button className={`transport-btn met ${metOn ? 'active' : ''}`} onClick={() => setMetOn(p => !p)}>🔔</button>
          <button className={`transport-btn loop ${looping ? 'active' : ''}`} onClick={() => setLooping(p => !p)}>🔁</button>

          <div className="swing-control"><label>Swing</label><input type="range" min={0} max={100} value={swing} onChange={(e) => setSwing(+e.target.value)} /><span className="swing-value">{swing}%</span></div>
          <div className="quantize-control"><label>Q:</label>
            <select value={quantVal} onChange={(e) => setQuantVal(e.target.value)}><option value="1/4">1/4</option><option value="1/8">1/8</option><option value="1/16">1/16</option><option value="1/32">1/32</option></select>
          </div>
          <div className="master-vol-control"><span className="vol-icon">🔊</span><input type="range" min={0} max={100} value={Math.round(masterVol * 100)} onChange={(e) => setMasterVol(+e.target.value / 100)} /></div>
        </div>

        <div className="sampler-topbar-right">
          <button className={`transport-btn ${showDevices ? 'active' : ''}`} onClick={() => setShowDevices(p => !p)} title="Devices">🎛️</button>
          <button className={`transport-btn ${showMixer ? 'active' : ''}`} onClick={() => setShowMixer(p => !p)} title="Mixer">🎚️</button>
          <button className={`transport-btn ${showLib ? 'active' : ''}`} onClick={() => setShowLib(p => !p)} title="Library">📚</button>
          <button className={`transport-btn ${songMode ? 'active' : ''}`} onClick={() => setSongMode(p => !p)} title="Song Mode">🎼</button>
          <button className={`transport-btn ${showClipLauncher ? 'active' : ''}`} onClick={() => setShowClipLauncher(p => !p)} title="Clip Launcher">🚀</button>



          <button
            className={`transport-btn ${showKitBrowser ? 'active' : ''}`}
            onClick={() => setShowKitBrowser(p => !p)}
            title="Browse & load drum kits"
          >🥁 Kits</button>

          <button
            className="transport-btn"
            onClick={() => selectedPad != null && analyzePadSample(selectedPad)}
            disabled={selectedPad == null || !pads[selectedPad]?.buffer || analyzing}
            title="Detect BPM & key"
          >{analyzing ? '⏳' : '🔍'} Detect</button>

          {detectedBpm > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#0a1420', borderRadius: 4, padding: '2px 8px', border: '1px solid #1e2d3d', fontSize: '0.65rem' }}>
              <span style={{ color: '#FF6600' }}>{detectedBpm} BPM <span style={{ color: '#5a7088', fontSize: '0.55rem' }}>({Math.round(bpmConfidence * 100)}%)</span></span>
              <button onClick={() => setBpm(detectedBpm)} style={{ background: 'none', border: '1px solid #FF6600', color: '#FF6600', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', fontSize: '0.55rem' }}>Use</button>
              {onBpmSync && <button onClick={syncBpmToProject} style={{ background: 'none', border: '1px solid #00ffc8', color: '#00ffc8', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', fontSize: '0.55rem' }}>→ Project</button>}
            </div>
          )}

          {detectedKey && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#0a1420', borderRadius: 4, padding: '2px 8px', border: '1px solid #1e2d3d', fontSize: '0.65rem' }}>
              <span style={{ color: '#ff6b9d' }}>{detectedKey.key} {detectedKey.scale} <span style={{ color: '#5a7088', fontSize: '0.55rem' }}>({Math.round(keyConfidence * 100)}%)</span></span>
              {onKeySync && <button onClick={syncKeyToProject} style={{ background: 'none', border: '1px solid #ff6b9d', color: '#ff6b9d', borderRadius: 3, padding: '1px 4px', cursor: 'pointer', fontSize: '0.55rem' }}>→ Project</button>}
            </div>
          )}

          {projectBpm && projectBpm !== bpm && (
            <div style={{ fontSize: '0.55rem', color: '#5a7088', background: '#0a1420', borderRadius: 3, padding: '2px 6px', border: '1px solid #1e2d3d' }}>
              Project: {projectBpm} BPM
              <button onClick={() => setBpm(projectBpm)} style={{ background: 'none', border: 'none', color: '#00ffc8', cursor: 'pointer', fontSize: '0.55rem', marginLeft: 4 }}>Sync ↓</button>
            </div>
          )}

          {onSendToArrange && <button className="transport-btn" onClick={bounceToArrange} title="Bounce to Arrange track">→🎚 Arrange</button>}

          <div className="view-toggle">
            <button className={view === 'pads' ? 'active' : ''} onClick={() => setView('pads')}>Pads</button>
            <button className={view === 'sequencer' ? 'active' : ''} onClick={() => setView('sequencer')}>Seq</button>
            <button className={view === 'split' ? 'active' : ''} onClick={() => setView('split')}>Split</button>
          </div>

          <div className="export-dropdown">
            <button className="export-btn" onClick={() => setShowExportPanel(!showExportPanel)} disabled={exporting}>{exporting ? '⏳...' : '⬇ Export'}</button>
            <div className="export-menu">
              <button onClick={() => exportBeat('wav')}>WAV {exportBitDepth}b</button>
              <button onClick={() => exportBeat('mp3')}>MP3</button>
              <button onClick={() => exportBeat('ogg')}>OGG</button>
              <button onClick={() => exportStems()}>Stems</button>
              <button onClick={() => exportMIDI()}>MIDI</button>
              {onExport && <button onClick={exportToDaw}>→ DAW</button>}
              <button onClick={() => setShowExportPanel(true)}>More...</button>
            </div>
          </div>
          {(exportStatus || exportProgress) && (
            <span className={`export-status-badge ${exportStatus.startsWith('✗') ? 'error' : exportStatus.startsWith('✓') ? 'success' : 'info'}`}>
              {exportProgress || exportStatus}
            </span>
          )}
          {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* DEVICE PANEL */}
      {showDevices && (
        <div className="device-settings-panel">
          <div className="device-select"><label>🔊 Output</label>
            <select value={selOut} onChange={(e) => setSelOut(e.target.value)}><option value="default">System Default</option>{devices.outputs.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
          <div className="device-select"><label>🎙️ Input</label>
            <select value={selIn} onChange={(e) => setSelIn(e.target.value)}><option value="default">System Default</option>{devices.inputs.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></div>
          {midiInputs.length > 0 && (
            <div className="device-select"><label>🎹 MIDI</label>
              <select value={selMidi?.id || ''} onChange={(e) => setSelMidi(midiInputs.find(m => m.id === e.target.value) || null)}>
                <option value="">None</option>{midiInputs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button className={`midi-learn-btn ${midiLearn ? 'active' : ''}`} onClick={() => { setMidiLearn(p => !p); setMidiLearnPad(null); }}>{midiLearn ? '🔴 Learning...' : 'MIDI Learn'}</button>
            </div>
          )}
          {devices.outputs.length > 1 && <div className="device-hint">✅ External audio interface detected</div>}
        </div>
      )}

      {/* LIVE REC BAR */}
      {liveRec && <div className="live-record-bar"><span className="rec-dot">⏺</span> RECORDING — Play pads to record <span className="rec-hits">{recHits.length} hits</span><button onClick={stopLiveRec}>⏹ Stop & Quantize</button></div>}

      {/* MIC COUNTDOWN */}
      {micCount > 0 && <div className="mic-countdown-overlay"><div className="countdown-number">{micCount}</div></div>}
      {micRec && micCount === 0 && <div className="mic-record-bar"><span className="rec-dot pulse">🎙️</span> Recording to Pad {(micPad || 0) + 1}...<button onClick={stopMicRec}>⏹ Stop</button></div>}

      {/* Phase 3: Keygroup mode indicator */}
      {selectedPad !== null && pads[selectedPad]?.programType === 'keygroup' && (
        <div className="keygroup-bar">
          🎹 Keygroup Mode — Pad {selectedPad + 1} · Root: {CHROMATIC_KEYS[(pads[selectedPad].rootNote || 60) % 12]}{Math.floor((pads[selectedPad].rootNote || 60) / 12) - 1} · Use QWERTY or MIDI keyboard to play chromatically
          {activeKgNotes.size > 0 && <span className="kg-active-notes"> · Playing: {[...activeKgNotes].map(n => CHROMATIC_KEYS[n % 12] + (Math.floor(n / 12) - 1)).join(', ')}</span>}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className={`sampler-content view-${view}`}>

        {/* PAD GRID */}
        {(view === 'pads' || view === 'split') && (
          <div className="pad-grid-section">
            <div className="pad-grid">
              {pads.map((pad, i) => (
                <div key={i}
                  className={`pad ${activePads.has(i) ? 'active' : ''} ${selectedPad === i ? 'selected' : ''} ${dragPad === i ? 'drag-over' : ''} ${pad.buffer ? 'loaded' : 'empty'} ${pad.muted ? 'muted' : ''} ${midiLearn ? 'midi-learn' : ''}`}
                  style={{ '--pad-color': pad.color, '--pad-glow': activePads.has(i) ? pad.color : 'transparent' }}
                  onMouseDown={(e) => { e.preventDefault(); initCtx(); playPad(i); setSelectedPad(i); setShowPadSet(true); if (liveRef.current) handleLiveHit(i); if (midiLearn) setMidiLearnPad(i); }}
                  onMouseUp={() => { if (pads[i].playMode === 'hold') stopPad(i); }}
                  onTouchStart={(e) => { e.preventDefault(); initCtx(); playPad(i); setSelectedPad(i); if (liveRef.current) handleLiveHit(i); }}
                  onTouchEnd={(e) => { e.preventDefault(); if (pads[i].playMode === 'hold') stopPad(i); }}
                  onDragOver={(e) => onDragOver(e, i)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, i)}
                  onDoubleClick={() => fileSelect(i)}>
                  <div className="pad-key">{PAD_KEY_LABELS[i]}</div>
                  <div className="pad-name">{pad.name}</div>
                  {!pad.buffer && <div className="pad-hint">Drop audio or double-click</div>}
                  {pad.layers?.length > 0 && <div className="pad-layer-badge">L{pad.layers.length}</div>}
                  {pad.programType === 'keygroup' && <div className="pad-kg-badge">KG</div>}
                  {pad.timeStretch && <div className="pad-ts-badge">TS</div>}
                  {pad.muted && <div className="pad-mute-badge">M</div>}
                  {pad.filterOn && <div className="pad-fx-badge">FX</div>}
                  {midiLearn && <div className="pad-midi-badge">MIDI?</div>}
                  {Object.values(midiMap).includes(i) && <div className="pad-midi-note">{Object.entries(midiMap).find(([, v]) => v === i)?.[0]}</div>}
                </div>
              ))}
            </div>
            <div className="pad-quick-actions">
              <button onClick={clearPat}>🗑️ Clear</button>
              <button onClick={stopAll}>⏹ Stop All</button>
              <button onClick={() => selectedPad !== null && openChop(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer}>✂️ Chop</button>
              <button onClick={() => selectedPad !== null && startMicRec(selectedPad)} disabled={selectedPad === null || micRec}>🎙️ Sample</button>
              <button onClick={() => selectedPad !== null && normalizeSample(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer}>📊 Norm</button>
              <button onClick={() => selectedPad !== null && reverseSampleDestructive(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer}>◀ Rev</button>
              <button onClick={() => selectedPad !== null && fadeInSample(selectedPad, 0.05)} disabled={selectedPad === null || !pads[selectedPad]?.buffer} title="Fade In (50ms)">⤴ In</button>
              <button onClick={() => selectedPad !== null && fadeOutSample(selectedPad, 0.05)} disabled={selectedPad === null || !pads[selectedPad]?.buffer} title="Fade Out (50ms)">⤵ Out</button>
              <button onClick={() => { const n = prompt('Kit name:'); if (n) saveKit(n); }}>💾 Save Kit</button>
              <button onClick={() => selectedPad !== null && openSampleEditor(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer}>✎ Edit</button>
              <button onClick={() => selectedPad !== null && analyzePadSample(selectedPad)} disabled={selectedPad === null || !pads[selectedPad]?.buffer || analyzing}>{analyzing ? '⏳' : '🔍'} Detect</button>

              <div className="step-count-selector"><label>Steps:</label>
                {STEP_COUNTS.map(c => (
                  <button key={c} className={stepCount === c ? 'active' : ''} onClick={() => {
                    setStepCount(c);
                    setSteps(p => p.map(r => r.length < c ? [...r, ...Array(c - r.length).fill(false)] : r.slice(0, c)));
                    setStepVel(p => p.map(r => r.length < c ? [...r, ...Array(c - r.length).fill(0.8)] : r.slice(0, c)));
                  }}>{c}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP SEQUENCER */}
        {(view === 'sequencer' || view === 'split') && (
          <div className="sequencer-section">
            {/* ── Bar Ruler ── */}
            <div className="seq-bar-ruler">
              <div className="seq-label-cell" style={{ minWidth: 100, fontSize: '0.6rem', color: '#5a7088', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {loopEndStep != null ? `Loop ${Math.floor(loopStartStep / 4) + 1}–${Math.floor((loopEndStep - 1) / 4) + 1}` : 'All'}
              </div>
              {Array.from({ length: Math.ceil(stepCount / 4) }, (_, bar) => {
                const barStart = bar * 4;
                const barEnd = Math.min(barStart + 4, stepCount);
                const barWidth = barEnd - barStart;
                const isInLoop = loopEndStep == null || (barStart < loopEndStep && barEnd > loopStartStep);
                const isLoopStart = barStart === loopStartStep && loopEndStep != null;
                const isLoopEnd = barEnd === loopEndStep;
                const currentBar = curStep >= barStart && curStep < barEnd;
                return (
                  <div
                    key={bar}
                    className={`seq-bar-marker ${currentBar ? 'current' : ''} ${isInLoop ? 'in-loop' : 'out-loop'} ${isLoopStart ? 'loop-start' : ''} ${isLoopEnd ? 'loop-end' : ''}`}
                    style={{ flex: `0 0 ${barWidth * (100 / stepCount)}%`, minWidth: 0 }}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        setLoopEndStep(barEnd);
                      } else if (e.altKey || e.ctrlKey) {
                        setLoopStartStep(0);
                        setLoopEndStep(null);
                      } else {
                        setLoopStartStep(barStart);
                        if (loopEndStep != null && barStart >= loopEndStep) {
                          setLoopEndStep(null);
                        }
                      }
                    }}
                    title={`Bar ${bar + 1} | Click = loop start | Shift+Click = loop end | Ctrl+Click = clear`}
                  >
                    <span className="bar-number">{bar + 1}</span>
                  </div>
                );
              })}
            </div>

            <div className="sequencer-grid">
              <div className="seq-header-row">
                <div className="seq-label-cell"></div>
                {Array.from({ length: stepCount }, (_, i) => {
                  const inLoop = loopEndStep == null || (i >= loopStartStep && i < loopEndStep);
                  return (
                    <div key={i} className={`seq-header-cell ${curStep === i ? 'current' : ''} ${i % 4 === 0 ? 'downbeat' : ''} ${!inLoop ? 'out-of-loop' : ''}`}>
                      {i % 4 === 0 ? `${Math.floor(i / 4) + 1}.1` : `.${(i % 4) + 1}`}
                    </div>
                  );
                })}
              </div>
              {pads.map((pad, pi) => (
                <div key={pi} className={`seq-row ${!pad.buffer ? 'empty-row' : ''}`}>
                  <div className={`seq-label-cell ${selectedPad === pi ? 'selected' : ''}`} onClick={() => { setSelectedPad(pi); setShowPadSet(true); }}>
                    <span className="seq-pad-color" style={{ background: pad.color }}></span>
                    <span className="seq-pad-name">{pad.name}</span>
                    <span className="seq-pad-key">{PAD_KEY_LABELS[pi]}</span>
                  </div>
                  {Array.from({ length: stepCount }, (_, si) => {
                    const inLoop = loopEndStep == null || (si >= loopStartStep && si < loopEndStep);
                    return (
                      <div key={si}
                        className={`seq-cell ${steps[pi]?.[si] ? 'on' : ''} ${curStep === si ? 'current' : ''} ${si % 4 === 0 ? 'downbeat' : ''} ${si % 8 < 4 ? 'even-group' : 'odd-group'} ${!inLoop ? 'out-of-loop' : ''}`}
                        style={{ '--cell-color': pad.color, '--cell-opacity': steps[pi]?.[si] ? (stepVel[pi]?.[si] ?? 0.8) : 0 }}
                        onClick={(e) => toggleStep(pi, si, e)} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="sequencer-hint">Click = normal | Shift = soft | Ctrl = hard · Bar ruler: Click = loop start | Shift+Click = loop end | Ctrl+Click = clear</div>
          </div>
        )}
      </div>

      {/* MIXER (Phase 2) */}
      {showMixer && (
        <div className="mixer-panel">
          <div className="mixer-header"><h3>🎚️ Mixer</h3><button onClick={() => setShowMixer(false)}>✕</button></div>
          <div className="mixer-channels">
            {pads.map((pad, i) => (
              <div key={i} className={`mixer-channel ${!pad.buffer ? 'empty' : ''}`}>
                <div className="mixer-meter"><div className="meter-fill" style={{ height: `${(padLvls[i] || 0) * 100}%` }}></div></div>
                <input type="range" className="mixer-fader" min={0} max={100} value={Math.round(pad.volume * 100)} onChange={(e) => updatePad(i, { volume: +e.target.value / 100 })} />
                <input type="range" className="mixer-pan" min={-100} max={100} value={Math.round(pad.pan * 100)} onChange={(e) => updatePad(i, { pan: +e.target.value / 100 })} />
                <div className="mixer-btns">
                  <button className={`m-btn ${pad.muted ? 'active' : ''}`} onClick={() => updatePad(i, { muted: !pad.muted })}>M</button>
                  <button className={`s-btn ${pad.soloed ? 'active' : ''}`} onClick={() => updatePad(i, { soloed: !pad.soloed })}>S</button>
                </div>
                <div className="mixer-label" style={{ color: pad.color }}>{PAD_KEY_LABELS[i]}</div>
              </div>
            ))}
            <div className="mixer-channel master">
              <div className="mixer-meter"><div className="meter-fill master" style={{ height: `${masterVol * 100}%` }}></div></div>
              <input type="range" className="mixer-fader" min={0} max={100} value={Math.round(masterVol * 100)} onChange={(e) => setMasterVol(+e.target.value / 100)} />
              <div className="mixer-label master-label">MST</div>
            </div>
          </div>
        </div>
      )}

      {/* SOUND LIBRARY + KIT BROWSER */}
      {showLib && (
        <div className="library-panel">
          <div className="library-header"><h3>📚 Kit Browser</h3><button onClick={() => setShowLib(false)}>✕</button></div>
          <DrumKitConnector
            loadSample={loadSample}
            updatePad={updatePad}
            pads={pads}
            audioContext={ctxRef.current}
            selectedPad={selectedPad}
            projectId={projectId}
            onClose={() => setShowLib(false)}
            isEmbedded={true}
          />
        </div>
      )}

      {/* KIT BROWSER (🥁 button) */}
      {showKitBrowser && !showLib && (
        <div className="library-panel">
          <div className="library-header"><h3>🥁 Drum Kits</h3><button onClick={() => setShowKitBrowser(false)}>✕</button></div>
          <DrumKitConnector
            loadSample={loadSample}
            updatePad={updatePad}
            pads={pads}
            audioContext={ctxRef.current}
            selectedPad={selectedPad}
            projectId={projectId}
            onClose={() => setShowKitBrowser(false)}
            isEmbedded={true}
          />
        </div>
      )}


      {/* SONG MODE (Phase 3) */}
      {songMode && (
        <div className="song-mode-panel">
          <div className="song-header">
            <h3>🎼 Song Arranger</h3>
            <span className="song-info">{songSeq.length} blocks • {bpm} BPM • {(() => {
              const sd = 60.0 / bpm / 4; const t = songSeq.reduce((s, b) => { const p = patterns[b.patternIndex]; return s + (p ? p.stepCount * sd : 0); }, 0);
              return `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
            })()}</span>
            <button onClick={() => setSongMode(false)}>✕</button>
          </div>
          <div className="song-patterns"><label>Add:</label>
            {patterns.map((p, i) => <button key={i} className="song-add-btn" onClick={() => addToSong(i)}>+ {p.name}</button>)}
          </div>
          <div className="song-sequence">
            {songSeq.length === 0 ? <div className="song-empty">Click patterns above to build arrangement</div> :
              songSeq.map((b, i) => (
                <div key={i} className={`song-block ${songPos === i ? 'playing' : ''}`}>
                  <span className="block-number">{i + 1}</span><span className="block-name">{b.name}</span>
                  <div className="block-actions">
                    {i > 0 && <button onClick={() => moveSongBlock(i, i - 1)}>◀</button>}
                    {i < songSeq.length - 1 && <button onClick={() => moveSongBlock(i, i + 1)}>▶</button>}
                    <button className="block-remove" onClick={() => rmFromSong(i)}>✕</button>
                  </div>
                </div>
              ))
            }
          </div>
          <div className="song-actions">
            <button className="song-play-btn" onClick={startSong} disabled={songSeq.length === 0}>▶ Play Song</button>
            <button onClick={() => exportBeat(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Export Song ({exportFormat.toUpperCase()})</button>
            <button onClick={() => exportStems(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Song Stems</button>
            <button onClick={() => exportBounceAll(exportFormat)} disabled={songSeq.length === 0 || exporting}>⬇ Bounce All</button>
            <button onClick={() => setSongSeq([])}>🗑️ Clear</button>
          </div>
        </div>
      )}

      {/* PHASE 5: CLIP LAUNCHER */}
      {showClipLauncher && (
        <div className="clip-launcher-panel">
          <div className="clip-launcher-header">
            <h3>🚀 Clip Launcher</h3>
            <div className="clip-launcher-actions">
              <button onClick={addScene}>+ Scene</button>
              <button onClick={stopAllClips} className="clip-stop-all">⏹ Stop All</button>
              {editingClip && <button onClick={() => setEditingClip(null)} className="clip-edit-close">✕ Close Editor</button>}
              <button onClick={() => setShowClipLauncher(false)}>✕</button>
            </div>
          </div>

          <div className="clip-grid-wrapper">
            {/* Column headers — pad names */}
            <div className="clip-grid-header">
              <div className="clip-scene-label-cell"></div>
              {pads.map((pad, pi) => (
                <div key={pi} className={`clip-pad-header ${pad.buffer ? '' : 'empty'}`}>
                  <span className="clip-pad-color" style={{ background: pad.color }}></span>
                  <span className="clip-pad-name">{pi + 1}</span>
                </div>
              ))}
              <div className="clip-scene-launch-cell">Scene</div>
            </div>

            {/* Scene rows */}
            {scenes.map((scene, si) => (
              <div key={si} className={`clip-scene-row ${activeScene === si ? 'active-scene' : ''}`}>
                <div className="clip-scene-label">
                  <input className="clip-scene-name" value={scene.name} onChange={(e) => renameScene(si, e.target.value)} />
                  <div className="clip-scene-btns">
                    <button onClick={() => fillSceneFromPads(si)} title="Fill from pads">📥</button>
                    <button onClick={() => duplicateScene(si)} title="Duplicate scene">📋</button>
                    <button onClick={() => removeScene(si)} title="Remove scene" className="clip-scene-rm">✕</button>
                  </div>
                </div>

                {/* Clip cells for each pad */}
                {pads.map((pad, pi) => {
                  const clip = scene.clips[pi];
                  const key = `${si}_${pi}`;
                  const state = clipStates[key] || 'stopped';
                  const isEditing = editingClip?.sceneIdx === si && editingClip?.padIdx === pi;
                  return (
                    <div key={pi}
                      className={`clip-cell ${clip ? 'has-clip' : 'empty-cell'} ${state} ${isEditing ? 'editing' : ''}`}
                      style={clip ? { '--clip-color': clip.color } : {}}
                      onContextMenu={(e) => { e.preventDefault(); if (clip) removeClip(si, pi); }}
                      onDoubleClick={() => { if (clip) setEditingClip({ sceneIdx: si, padIdx: pi }); }}
                    >
                      {clip ? (
                        <button className="clip-trigger" onClick={() => toggleClip(si, pi)}>
                          <span className="clip-state-icon">
                            {state === 'playing' ? '▶' : state === 'queued' ? '◉' : '■'}
                          </span>
                          <span className="clip-name">{clip.name}</span>
                        </button>
                      ) : (
                        pad.buffer ? (
                          <button className="clip-assign" onClick={() => assignClip(si, pi)} title={`Assign ${pad.name}`}>+</button>
                        ) : (
                          <div className="clip-empty-slot"></div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Scene launch button */}
                <div className="clip-scene-launch-cell">
                  <button className={`clip-scene-launch ${activeScene === si ? 'active' : ''}`}
                    onClick={() => launchScene(si)} title={`Launch ${scene.name}`}>
                    ▶
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Clip Editor Panel — shown when double-clicking a clip */}
          {editingClip && (() => {
            const { sceneIdx, padIdx } = editingClip;
            const clip = scenes[sceneIdx]?.clips[padIdx];
            const pad = pads[padIdx];
            if (!clip || !pad?.buffer) return null;
            const dur = pad.buffer.duration;
            return (
              <div className="clip-editor">
                <div className="clip-editor-header">
                  <span className="clip-editor-dot" style={{ background: clip.color }}></span>
                  <span>Editing: {clip.name}</span>
                  <span className="clip-editor-info">Scene {sceneIdx + 1} · Pad {padIdx + 1}</span>
                </div>
                <div className="clip-editor-controls">
                  <div className="clip-edit-row">
                    <label>Volume</label>
                    <input type="range" min={0} max={150} value={Math.round((clip.volume ?? 1) * 100)}
                      onChange={(e) => updateClip(sceneIdx, padIdx, { volume: +e.target.value / 100 })} />
                    <span>{Math.round((clip.volume ?? 1) * 100)}%</span>
                  </div>
                  <div className="clip-edit-row">
                    <label>Pitch</label>
                    <input type="range" min={-12} max={12} value={clip.pitch || 0}
                      onChange={(e) => updateClip(sceneIdx, padIdx, { pitch: +e.target.value })} />
                    <span>{(clip.pitch || 0) > 0 ? '+' : ''}{clip.pitch || 0}st</span>
                  </div>
                  <div className="clip-edit-row">
                    <label>Loop Start</label>
                    <input type="range" min={0} max={Math.round(dur * 1000)} value={Math.round((clip.loopStart || 0) * 1000)}
                      onChange={(e) => updateClip(sceneIdx, padIdx, { loopStart: +e.target.value / 1000 })} />
                    <span>{(clip.loopStart || 0).toFixed(2)}s</span>
                  </div>
                  <div className="clip-edit-row">
                    <label>Loop End</label>
                    <input type="range" min={0} max={Math.round(dur * 1000)} value={Math.round((clip.loopEnd || dur) * 1000)}
                      onChange={(e) => updateClip(sceneIdx, padIdx, { loopEnd: +e.target.value / 1000 })} />
                    <span>{(clip.loopEnd || dur).toFixed(2)}s</span>
                  </div>
                  <div className="clip-edit-row">
                    <label>Color</label>
                    <div className="clip-color-picker">
                      {CLIP_COLORS.map(c => (
                        <button key={c} className={`clip-color-swatch ${clip.color === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => updateClip(sceneIdx, padIdx, { color: c })} />
                      ))}
                    </div>
                  </div>
                  <div className="clip-edit-row">
                    <label>Name</label>
                    <input type="text" className="clip-edit-name" value={clip.name}
                      onChange={(e) => updateClip(sceneIdx, padIdx, { name: e.target.value })} />
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="clip-launcher-hint">
            Click to play/stop (queues to bar if sequencer running) · <strong>Double-click</strong> to edit clip · <strong>+</strong> assigns pad · Right-click removes · <strong>📋</strong> duplicates scene
          </div>
        </div>
      )}

      {/* EXPORT PANEL (Phase 3 Enhanced) */}
      {showExportPanel && (
        <div className="export-panel-overlay" onClick={() => setShowExportPanel(false)}>
          <div className="export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="export-panel-header">
              <h3>⬇ Export</h3>
              <button className="export-panel-close" onClick={() => setShowExportPanel(false)}>✕</button>
            </div>

            {exportProgress && <div className="export-progress-bar"><span className="export-progress-text">{exportProgress}</span><div className="export-progress-fill"></div></div>}

            <div className="export-section">
              <label className="export-label">Format</label>
              <div className="export-format-grid">
                <div className="export-opt"><label>Bit Depth</label><select value={exportBitDepth} onChange={(e) => setExportBitDepth(+e.target.value)}><option value={16}>16-bit CD</option><option value={24}>24-bit Studio</option><option value={32}>32-bit Float</option></select></div>
                {Object.entries(FORMAT_INFO).map(([key, info]) => (
                  <button key={key} className={`export-format-btn ${exportFormat === key ? 'active' : ''}`} onClick={() => setExportFormat(key)}>
                    <span className="format-ext">.{info.ext}</span>
                    <span className="format-label">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {exportFormat === 'mp3' && (
              <div className="export-section">
                <label className="export-label">MP3 Quality</label>
                <div className="export-quality-row">
                  {[128, 192, 256, 320].map(q => (
                    <button key={q} className={`export-quality-btn ${exportQuality === q ? 'active' : ''}`} onClick={() => setExportQuality(q)}>
                      {q} kbps{q === 320 ? ' (Best)' : q === 128 ? ' (Small)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="export-section">
              <label className="export-label">Download to Desktop</label>
              <div className="export-actions-grid">
                <button className="export-action-btn" onClick={() => exportBeat(exportFormat)} disabled={exporting}>
                  <span className="action-icon">🎵</span>
                  <span className="action-label">Full Mix</span>
                  <span className="action-desc">{songMode && songSeq.length > 0 ? 'Song arrangement' : 'Current pattern'} as .{FORMAT_INFO[exportFormat]?.ext}</span>
                </button>
                <button className="export-action-btn" onClick={() => exportStems(exportFormat)} disabled={exporting}>
                  <span className="action-icon">🎚️</span>
                  <span className="action-label">Multi-Track Stems</span>
                  <span className="action-desc">Each pad as separate .{FORMAT_INFO[exportFormat]?.ext}{songMode && songSeq.length > 0 ? ' (full song)' : ''}</span>
                </button>
                <button className="export-action-btn" onClick={() => exportBounceAll(exportFormat)} disabled={exporting}>
                  <span className="action-icon">📦</span>
                  <span className="action-label">Bounce All</span>
                  <span className="action-desc">Full mix + all stems together</span>
                </button>
                <button className="export-action-btn" onClick={exportMIDI} disabled={exporting}>
                  <span className="action-icon">🎹</span>
                  <span className="action-label">MIDI</span>
                  <span className="action-desc">{songMode && songSeq.length > 0 ? 'Full song' : 'Pattern'} note data (.mid)</span>
                </button>
              </div>
            </div>

            {onExport && (
              <div className="export-section">
                <label className="export-label">Send to Recording Studio</label>
                <div className="export-actions-grid">
                  <button className="export-action-btn daw-send-btn" onClick={exportToDaw} disabled={exporting}>
                    <span className="action-icon">🎛️</span>
                    <span className="action-label">Send to DAW Track</span>
                    <span className="action-desc">Load into next empty track (always WAV quality)</span>
                  </button>
                  <button className="export-action-btn daw-send-btn" onClick={() => exportBeat(exportFormat, true)} disabled={exporting}>
                    <span className="action-icon">⬇🎛️</span>
                    <span className="action-label">Download + Send to DAW</span>
                    <span className="action-desc">.{FORMAT_INFO[exportFormat]?.ext} to desktop AND WAV to DAW track</span>
                  </button>
                </div>
              </div>
            )}

            <div className="export-info">
              <span>📋 {songMode && songSeq.length > 0 ? `Song: ${songSeq.length} patterns` : `Pattern: ${stepCount} steps`} · {bpm} BPM</span>
            </div>
          </div>
        </div>
      )}

      {/* CHOP VIEW (Phase 2) */}
      {showChop && chopIdx !== null && (
        <div className="chop-view-overlay">
          <div className="chop-view">
            <div className="chop-header"><h3>✂️ Chop — {pads[chopIdx]?.name}</h3><button onClick={() => setShowChop(false)}>✕</button></div>
            <canvas ref={chopCanvas} className="chop-canvas" width={800} height={200}
              onClick={chopCanvasClick}
              onMouseDown={chopMouseDown}
              onMouseMove={chopMouseMove}
              onMouseUp={chopMouseUp}
              onMouseLeave={chopMouseUp}
              onContextMenu={chopContextMenu}
              style={{ cursor: chopDragRef.current?.dragging ? 'ew-resize' : 'crosshair' }} />
            <div className="chop-controls">
              <div className="chop-mode-selector">
                {CHOP_MODES.map(m => (
                  <button key={m} className={chopMode === m ? 'active' : ''} onClick={() => setChopMode(m)}>
                    {m === 'transient' ? '🎯 Transient' : m === 'bpmgrid' ? '🎵 BPM Grid' : m === 'equal' ? '📏 Equal' : '✋ Manual'}
                  </button>
                ))}
              </div>
              <button onClick={autoChop} disabled={chopMode === 'manual'}>🤖 Auto-Chop</button>
              {chopMode === 'transient' && <div className="chop-sensitivity"><label>Sensitivity</label><input type="range" min={1} max={100} value={Math.round(chopSens * 100)} onChange={(e) => setChopSens(+e.target.value / 100)} /></div>}
              {chopMode === 'equal' && <div className="chop-sensitivity"><label>Slices</label><input type="range" min={2} max={32} value={chopSlices} onChange={(e) => setChopSlices(+e.target.value)} /><span>{chopSlices}</span></div>}
              <label className="chop-zc-toggle"><input type="checkbox" checked={zeroCrossSnap} onChange={(e) => setZeroCrossSnap(e.target.checked)} /> Zero-Cross Snap</label>
              <button onClick={() => setChopPts([])}>Clear</button>
              <button onClick={undoChop} disabled={chopPts.length === 0} title="Undo last chop">↩</button>
              <button onClick={redoChop} title="Redo chop">↪</button>
              <button onClick={stopPreview} disabled={activeSlice < 0} title="Stop preview">⏹</button>
              <span className="chop-count">{chopPts.length} chops → {chopPts.length + 1} slices</span>
              <button className="distribute-btn" onClick={distributeToPads} disabled={chopPts.length === 0}>📤 Distribute to Pads</button>
            </div>
            <div className="chop-slices-preview">
              {(() => {
                const all = [0, ...chopPts, pads[chopIdx]?.buffer?.duration || 0];
                return all.slice(0, -1).map((_, si) => (
                  <button key={si} className={`chop-slice-btn ${activeSlice === si ? 'playing' : ''}`} onClick={() => previewSlice(si)}>▶ {si + 1} ({((all[si + 1] - all[si]) * 1000).toFixed(0)}ms)</button>
                ));
              })()}
            </div>
            <div className="chop-hint">Click = add point · Drag handle = move · Right-click = delete point · Slices get 2ms crossfade</div>
          </div>
        </div>
      )}

      {/* PAD SETTINGS */}
      {showPadSet && selectedPad !== null && (
        <div className="pad-settings-panel">
          <div className="pad-settings-header">
            <h3><span className="pad-settings-color" style={{ background: pads[selectedPad].color }}></span>Pad {selectedPad + 1} — {pads[selectedPad].name}</h3>
            <button className="pad-settings-close" onClick={() => setShowPadSet(false)}>✕</button>
          </div>
          <div className="settings-tabs">
            <button className={settingsTab === 'main' ? 'active' : ''} onClick={() => setSettingsTab('main')}>Main</button>
            <button className={settingsTab === 'effects' ? 'active' : ''} onClick={() => setSettingsTab('effects')}>Effects</button>
            <button className={settingsTab === 'layers' ? 'active' : ''} onClick={() => setSettingsTab('layers')}>Layers</button>
            <button className={settingsTab === 'stretch' ? 'active' : ''} onClick={() => setSettingsTab('stretch')}>Stretch</button>
          </div>
          <div className="pad-settings-actions">
            <button onClick={() => fileSelect(selectedPad)}>📂 Load</button>
            <button onClick={() => startMicRec(selectedPad)} disabled={micRec}>🎙️</button>
            <button onClick={() => openChop(selectedPad)} disabled={!pads[selectedPad]?.buffer}>✂️</button>
            <button onClick={() => clearPad(selectedPad)}>🗑️</button>
          </div>

          {pads[selectedPad].buffer && settingsTab === 'main' && (<>
            <div className="pad-setting"><label>Volume</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].volume * 100)} onChange={(e) => updatePad(selectedPad, { volume: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].volume * 100)}%</span></div>
            <div className="pad-setting"><label>Pitch</label><input type="range" min={-12} max={12} value={pads[selectedPad].pitch} onChange={(e) => updatePad(selectedPad, { pitch: +e.target.value })} /><span className="setting-value">{pads[selectedPad].pitch > 0 ? '+' : ''}{pads[selectedPad].pitch}st</span></div>
            <div className="pad-setting"><label>Pan</label><input type="range" min={-100} max={100} value={Math.round(pads[selectedPad].pan * 100)} onChange={(e) => updatePad(selectedPad, { pan: +e.target.value / 100 })} /><span className="setting-value">{pads[selectedPad].pan < 0 ? `L${Math.abs(Math.round(pads[selectedPad].pan * 100))}` : pads[selectedPad].pan > 0 ? `R${Math.round(pads[selectedPad].pan * 100)}` : 'C'}</span></div>
            <div className="pad-setting"><label>Trim Start</label><input type="range" min={0} max={Math.round((pads[selectedPad].buffer?.duration || 1) * 1000)} value={Math.round((pads[selectedPad].trimStart || 0) * 1000)} onChange={(e) => updatePad(selectedPad, { trimStart: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].trimStart || 0).toFixed(2)}s</span></div>
            <div className="pad-setting"><label>Trim End</label><input type="range" min={0} max={Math.round((pads[selectedPad].buffer?.duration || 1) * 1000)} value={Math.round((pads[selectedPad].trimEnd || pads[selectedPad].buffer?.duration || 0) * 1000)} onChange={(e) => updatePad(selectedPad, { trimEnd: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].trimEnd || pads[selectedPad].buffer?.duration || 0).toFixed(2)}s</span></div>
            <div className="pad-setting"><label>Mode</label><div className="play-mode-btns">{['oneshot', 'hold', 'loop'].map(m => <button key={m} className={pads[selectedPad].playMode === m ? 'active' : ''} onClick={() => updatePad(selectedPad, { playMode: m })}>{m === 'oneshot' ? '▶ One' : m === 'hold' ? '✊ Hold' : '🔁 Loop'}</button>)}</div></div>
            <div className="pad-setting"><label>Reverse</label><button className={`toggle-btn ${pads[selectedPad].reverse ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { reverse: !pads[selectedPad].reverse })}>{pads[selectedPad].reverse ? '◀ Rev' : '▶ Norm'}</button></div>
            <div className="pad-setting"><label>Attack</label><input type="range" min={0} max={1000} value={Math.round(pads[selectedPad].attack * 1000)} onChange={(e) => updatePad(selectedPad, { attack: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].attack * 1000).toFixed(0)}ms</span></div>
            <div className="pad-setting"><label>Decay</label><input type="range" min={0} max={2000} value={Math.round((pads[selectedPad].decay || 0) * 1000)} onChange={(e) => updatePad(selectedPad, { decay: +e.target.value / 1000 })} /><span className="setting-value">{((pads[selectedPad].decay || 0) * 1000).toFixed(0)}ms</span></div>
            <div className="pad-setting"><label>Sustain</label><input type="range" min={0} max={100} value={Math.round((pads[selectedPad].sustain ?? 1) * 100)} onChange={(e) => updatePad(selectedPad, { sustain: +e.target.value / 100 })} /><span className="setting-value">{Math.round((pads[selectedPad].sustain ?? 1) * 100)}%</span></div>
            <div className="pad-setting"><label>Release</label><input type="range" min={0} max={2000} value={Math.round(pads[selectedPad].release * 1000)} onChange={(e) => updatePad(selectedPad, { release: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].release * 1000).toFixed(0)}ms</span></div>
            <div className="pad-setting"><label>Program</label><select value={pads[selectedPad].programType || 'drum'} onChange={(e) => updatePad(selectedPad, { programType: e.target.value })}><option value="drum">🥁 Drum</option><option value="keygroup">🎹 Keygroup</option><option value="clip">🔁 Clip</option></select></div>
            {(pads[selectedPad].programType === 'keygroup') && <>
              <div className="pad-setting"><label>Root Note</label><input type="range" min={24} max={96} value={pads[selectedPad].rootNote || 60} onChange={(e) => updatePad(selectedPad, { rootNote: +e.target.value })} /><span className="setting-value">{CHROMATIC_KEYS[(pads[selectedPad].rootNote || 60) % 12]}{Math.floor((pads[selectedPad].rootNote || 60) / 12) - 1}</span></div>
              <div className="pad-setting"><label>Key Low</label><input type="range" min={0} max={127} value={pads[selectedPad].keyRangeLow || 36} onChange={(e) => updatePad(selectedPad, { keyRangeLow: +e.target.value })} /><span className="setting-value">{CHROMATIC_KEYS[(pads[selectedPad].keyRangeLow || 36) % 12]}{Math.floor((pads[selectedPad].keyRangeLow || 36) / 12) - 1}</span></div>
              <div className="pad-setting"><label>Key High</label><input type="range" min={0} max={127} value={pads[selectedPad].keyRangeHigh || 84} onChange={(e) => updatePad(selectedPad, { keyRangeHigh: +e.target.value })} /><span className="setting-value">{CHROMATIC_KEYS[(pads[selectedPad].keyRangeHigh || 84) % 12]}{Math.floor((pads[selectedPad].keyRangeHigh || 84) / 12) - 1}</span></div>
              <div className="pad-setting"><button className="toggle-btn" onClick={() => setShowKeyboard(p => !p)}>{showKeyboard ? '⌨️ Hide Keyboard' : '🎹 Show Keyboard'}</button></div>
            </>}
            <div className="pad-setting mute-solo">
              <button className={`mute-btn ${pads[selectedPad].muted ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { muted: !pads[selectedPad].muted })}>{pads[selectedPad].muted ? '🔇 M' : 'M'}</button>
              <button className={`solo-btn ${pads[selectedPad].soloed ? 'active' : ''}`} onClick={() => updatePad(selectedPad, { soloed: !pads[selectedPad].soloed })}>{pads[selectedPad].soloed ? '🎯 S' : 'S'}</button>
            </div>
          </>)}

          {/* EFFECTS TAB (Phase 3) */}
          {pads[selectedPad].buffer && settingsTab === 'effects' && (<>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].filterOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { filterOn: !pads[selectedPad].filterOn })}>{pads[selectedPad].filterOn ? '✅' : '⬜'}</button><span>Filter</span></div>
              {pads[selectedPad].filterOn && <>
                <div className="pad-setting"><label>Type</label><select value={pads[selectedPad].filterType} onChange={(e) => updatePad(selectedPad, { filterType: e.target.value })}><option value="lowpass">Low Pass</option><option value="highpass">High Pass</option><option value="bandpass">Band Pass</option><option value="notch">Notch</option></select></div>
                <div className="pad-setting"><label>Freq</label><input type="range" min={20} max={20000} value={pads[selectedPad].filterFreq} onChange={(e) => updatePad(selectedPad, { filterFreq: +e.target.value })} /><span className="setting-value">{pads[selectedPad].filterFreq}Hz</span></div>
                <div className="pad-setting"><label>Q</label><input type="range" min={0} max={200} value={Math.round(pads[selectedPad].filterQ * 10)} onChange={(e) => updatePad(selectedPad, { filterQ: +e.target.value / 10 })} /><span className="setting-value">{pads[selectedPad].filterQ.toFixed(1)}</span></div>
              </>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].distortionOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { distortionOn: !pads[selectedPad].distortionOn })}>{pads[selectedPad].distortionOn ? '✅' : '⬜'}</button><span>Distortion</span></div>
              {pads[selectedPad].distortionOn && <div className="pad-setting"><label>Amount</label><input type="range" min={0} max={100} value={pads[selectedPad].distortionAmt} onChange={(e) => updatePad(selectedPad, { distortionAmt: +e.target.value })} /><span className="setting-value">{pads[selectedPad].distortionAmt}%</span></div>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].delayOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { delayOn: !pads[selectedPad].delayOn })}>{pads[selectedPad].delayOn ? '✅' : '⬜'}</button><span>Delay</span></div>
              {pads[selectedPad].delayOn && <>
                <div className="pad-setting"><label>Time</label><input type="range" min={10} max={2000} value={Math.round(pads[selectedPad].delayTime * 1000)} onChange={(e) => updatePad(selectedPad, { delayTime: +e.target.value / 1000 })} /><span className="setting-value">{(pads[selectedPad].delayTime * 1000).toFixed(0)}ms</span></div>
                <div className="pad-setting"><label>Feedback</label><input type="range" min={0} max={90} value={Math.round(pads[selectedPad].delayFeedback * 100)} onChange={(e) => updatePad(selectedPad, { delayFeedback: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].delayFeedback * 100)}%</span></div>
                <div className="pad-setting"><label>Mix</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].delayMix * 100)} onChange={(e) => updatePad(selectedPad, { delayMix: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].delayMix * 100)}%</span></div>
              </>}
            </div>
            <div className="effect-section">
              <div className="effect-header"><button className={`effect-toggle ${pads[selectedPad].reverbOn ? 'on' : ''}`} onClick={() => updatePad(selectedPad, { reverbOn: !pads[selectedPad].reverbOn })}>{pads[selectedPad].reverbOn ? '✅' : '⬜'}</button><span>Reverb</span></div>
              {pads[selectedPad].reverbOn && <div className="pad-setting"><label>Mix</label><input type="range" min={0} max={100} value={Math.round(pads[selectedPad].reverbMix * 100)} onChange={(e) => updatePad(selectedPad, { reverbMix: +e.target.value / 100 })} /><span className="setting-value">{Math.round(pads[selectedPad].reverbMix * 100)}%</span></div>}
            </div>
          </>)}

          {/* LAYERS TAB (Phase 2 — Velocity Layers) */}
          {pads[selectedPad].buffer && settingsTab === 'layers' && (
            <div className="layers-section">
              <div className="layers-header">
                <span>Velocity Layers ({pads[selectedPad].layers.length}/4)</span>
                <button onClick={() => addLayer(selectedPad)} disabled={pads[selectedPad].layers.length >= 4}>+ Add Layer</button>
                <label className="rr-toggle"><input type="checkbox" checked={pads[selectedPad].roundRobin || false} onChange={(e) => updatePad(selectedPad, { roundRobin: e.target.checked })} /> Round Robin</label>
              </div>

              {/* Velocity zone visualization bar */}
              {pads[selectedPad].layers.length > 0 && (
                <div className="velocity-zone-bar">
                  <div className="vz-labels"><span>0</span><span>pp</span><span>mp</span><span>f</span><span>ff</span><span>127</span></div>
                  <div className="vz-track">
                    {pads[selectedPad].layers.map((layer, li) => {
                      const left = (layer.velocityMin / 127) * 100;
                      const width = ((layer.velocityMax - layer.velocityMin) / 127) * 100;
                      const colors = ['#ff4444', '#ffa500', '#00ffc8', '#4a9eff'];
                      return (
                        <div key={li} className="vz-zone" style={{
                          left: `${left}%`, width: `${Math.max(width, 2)}%`,
                          background: colors[li % colors.length], opacity: layer.buffer ? 0.8 : 0.3,
                        }}>
                          <span className="vz-zone-label">{li + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pads[selectedPad].layers.map((layer, li) => {
                const isActive = activePads.has(selectedPad) && activeSrc.current[selectedPad]?.layerIdx === li;
                const colors = ['#ff4444', '#ffa500', '#00ffc8', '#4a9eff'];
                return (
                  <div key={li} className={`layer-row ${layer.buffer ? 'loaded' : 'empty'} ${isActive ? 'layer-active' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('layer-dragover'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('layer-dragover'); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.currentTarget.classList.remove('layer-dragover');
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('audio/')) loadLayerSample(selectedPad, li, file);
                    }}
                  >
                    <div className="layer-row-top">
                      <span className="layer-num" style={{ color: colors[li] }}>{li + 1}</span>
                      <span className="layer-name">{layer.buffer ? (layer.name || `Layer ${li + 1}`) : '(drop audio here)'}</span>
                      <button className="layer-load-btn" onClick={() => {
                        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
                        inp.onchange = (e) => { if (e.target.files[0]) loadLayerSample(selectedPad, li, e.target.files[0]); }; inp.click();
                      }}>{layer.buffer ? '🔄' : '📂'}</button>
                      {layer.buffer && <button className="layer-preview-btn" onClick={() => {
                        const c = initCtx(); const src = c.createBufferSource();
                        const g = c.createGain(); g.gain.value = layer.volume ?? 1;
                        src.buffer = layer.buffer; src.connect(g); g.connect(masterRef.current); src.start(0);
                      }}>▶</button>}
                      <button className="layer-remove-btn" onClick={() => removeLayer(selectedPad, li)}>✕</button>
                    </div>
                    <div className="layer-row-vel">
                      <label>Vel:</label>
                      <input type="range" min={0} max={127} value={layer.velocityMin} onChange={(e) => {
                        const val = +e.target.value;
                        setPads(p => {
                          const u = [...p]; const layers = [...u[selectedPad].layers];
                          layers[li] = { ...layers[li], velocityMin: Math.min(val, layers[li].velocityMax - 1) };
                          u[selectedPad] = { ...u[selectedPad], layers }; return u;
                        });
                      }} />
                      <span className="vel-range-display">{layer.velocityMin}–{layer.velocityMax}</span>
                      <input type="range" min={0} max={127} value={layer.velocityMax} onChange={(e) => {
                        const val = +e.target.value;
                        setPads(p => {
                          const u = [...p]; const layers = [...u[selectedPad].layers];
                          layers[li] = { ...layers[li], velocityMax: Math.max(val, layers[li].velocityMin + 1) };
                          u[selectedPad] = { ...u[selectedPad], layers }; return u;
                        });
                      }} />
                    </div>
                    <div className="layer-row-vol">
                      <label>Vol:</label>
                      <input type="range" min={0} max={150} value={Math.round((layer.volume ?? 1) * 100)} onChange={(e) => {
                        const val = +e.target.value / 100;
                        setPads(p => {
                          const u = [...p]; const layers = [...u[selectedPad].layers];
                          layers[li] = { ...layers[li], volume: val };
                          u[selectedPad] = { ...u[selectedPad], layers }; return u;
                        });
                      }} />
                      <span className="layer-vol-display">{Math.round((layer.volume ?? 1) * 100)}%</span>
                    </div>
                  </div>
                );
              })}
              {pads[selectedPad].layers.length === 0 && (
                <div className="layers-empty">
                  <p>No velocity layers — base sample plays at all velocities.</p>
                  <p className="layers-hint">Add layers to assign different samples per hit strength (pp → ff).</p>
                </div>
              )}
            </div>
          )}

          {/* STRETCH TAB (Phase 4 — Time Stretch & BPM Sync) */}
          {pads[selectedPad].buffer && settingsTab === 'stretch' && (
            <div className="stretch-section">
              <div className="pad-setting">
                <label>Time Stretch</label>
                <button className={`toggle-btn ${pads[selectedPad].timeStretch ? 'active' : ''}`}
                  onClick={() => updatePad(selectedPad, { timeStretch: !pads[selectedPad].timeStretch })}>
                  {pads[selectedPad].timeStretch ? '✅ On' : '⬜ Off'}
                </button>
              </div>

              <div className="pad-setting">
                <label>Original BPM</label>
                <input type="number" min={40} max={300} value={pads[selectedPad].originalBpm || ''}
                  placeholder="Auto" onChange={(e) => updatePad(selectedPad, { originalBpm: +e.target.value || 0 })}
                  className="stretch-bpm-input" />
                <button className="stretch-detect-btn" onClick={() => setBpmFromSample(selectedPad)}>🔍 Detect</button>
                <button className="stretch-half-btn" onClick={() => updatePad(selectedPad, { originalBpm: Math.round((pads[selectedPad].originalBpm || 120) / 2) })} title="Half-time">½×</button>
                <button className="stretch-double-btn" onClick={() => updatePad(selectedPad, { originalBpm: Math.round((pads[selectedPad].originalBpm || 120) * 2) })} title="Double-time">2×</button>
              </div>

              {pads[selectedPad].originalBpm > 0 && (
                <div className="stretch-info">
                  <span className="stretch-ratio">
                    {pads[selectedPad].originalBpm} → {bpm} BPM
                    ({((bpm / pads[selectedPad].originalBpm) * 100).toFixed(0)}%)
                  </span>
                </div>
              )}

              <div className="pad-setting">
                <label>Stretch Mode</label>
                <div className="stretch-mode-btns">
                  {['repitch', 'granular', 'slice'].map(m => (
                    <button key={m} className={pads[selectedPad].stretchMode === m ? 'active' : ''}
                      onClick={() => updatePad(selectedPad, { stretchMode: m })}>
                      {m === 'repitch' ? '🔄 Repitch' : m === 'granular' ? '🌊 Granular' : '✂️ Slice'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stretch-mode-desc">
                {pads[selectedPad].stretchMode === 'repitch' && '⚡ Fast — tempo + pitch change together (like vinyl speed)'}
                {pads[selectedPad].stretchMode === 'granular' && '🎵 Overlap-add granular — preserves pitch, best for tonal material'}
                {pads[selectedPad].stretchMode === 'slice' && '🥁 Grain slicing — preserves pitch, good for drums & loops'}
              </div>

              {(pads[selectedPad].stretchMode === 'granular' || pads[selectedPad].stretchMode === 'slice') && (
                <div className="pad-setting">
                  <button className="stretch-prebake-btn" onClick={() => stretchPadBuffer(selectedPad)}
                    disabled={!pads[selectedPad].originalBpm || pads[selectedPad].originalBpm <= 0}>
                    {pads[selectedPad]._stretchedBuffer ? '🔄 Re-stretch' : '⚙️ Pre-stretch Buffer'}
                  </button>
                  {pads[selectedPad]._stretchedBuffer && <span className="stretch-status">✅ Stretched to {pads[selectedPad]._stretchedBpm} BPM</span>}
                </div>
              )}

              <div className="pad-setting">
                <label>Pitch Shift</label>
                <input type="range" min={-24} max={24} value={pads[selectedPad].pitchShift || 0}
                  onChange={(e) => updatePad(selectedPad, { pitchShift: +e.target.value })} />
                <span className="setting-value">
                  {(pads[selectedPad].pitchShift || 0) > 0 ? '+' : ''}{pads[selectedPad].pitchShift || 0}st
                </span>
              </div>

              {(pads[selectedPad].pitchShift || 0) !== 0 && (
                <div className="stretch-pitch-info">
                  Pitch: {CHROMATIC_KEYS[((pads[selectedPad].rootNote || 60) + (pads[selectedPad].pitchShift || 0) + 120) % 12]}
                  {pads[selectedPad].stretchMode !== 'repitch' && ' (independent of tempo)'}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* PHASE 3: KEYGROUP VISUAL KEYBOARD */}
      {showKeyboard && selectedPad !== null && pads[selectedPad]?.programType === 'keygroup' && (
        <div className="kg-keyboard-panel">
          <div className="kg-keyboard-header">
            <span>🎹 Keygroup Keyboard — Pad {selectedPad + 1} ({pads[selectedPad].name})</span>
            <span className="kg-root-display">Root: {CHROMATIC_KEYS[(pads[selectedPad].rootNote || 60) % 12]}{Math.floor((pads[selectedPad].rootNote || 60) / 12) - 1}</span>
            <span className="kg-range-display">Range: {CHROMATIC_KEYS[(pads[selectedPad].keyRangeLow || 36) % 12]}{Math.floor((pads[selectedPad].keyRangeLow || 36) / 12) - 1} – {CHROMATIC_KEYS[(pads[selectedPad].keyRangeHigh || 84) % 12]}{Math.floor((pads[selectedPad].keyRangeHigh || 84) / 12) - 1}</span>
            <button onClick={() => setShowKeyboard(false)}>✕</button>
          </div>
          <div className="kg-keyboard">
            {(() => {
              const low = pads[selectedPad].keyRangeLow || 36;
              const high = pads[selectedPad].keyRangeHigh || 84;
              const root = pads[selectedPad].rootNote || 60;
              const keys = [];
              for (let n = low; n <= high; n++) {
                const noteName = CHROMATIC_KEYS[n % 12];
                const octave = Math.floor(n / 12) - 1;
                const isBlack = noteName.includes('#');
                const isRoot = n === root;
                const isActive = activeKgNotes.has(n);
                keys.push(
                  <div key={n}
                    className={`kg-key ${isBlack ? 'black' : 'white'} ${isRoot ? 'root' : ''} ${isActive ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); initCtx(); playPadKeygroup(selectedPad, n, 0.8); }}
                    onMouseUp={() => stopPadKeygroup(selectedPad, n)}
                    onMouseLeave={() => { if (activeKgNotes.has(n)) stopPadKeygroup(selectedPad, n); }}
                  >
                    {(!isBlack || isRoot) && <span className="kg-key-label">{noteName}{isRoot ? octave : ''}</span>}
                  </div>
                );
              }
              return keys;
            })()}
          </div>
          <div className="kg-keyboard-hint">Click keys or use QWERTY keyboard (Z=C, S=C#, X=D... Q=C+1 octave)</div>
        </div>
      )}
      {/* ── SAMPLE EDITOR OVERLAY (SamplerInstrument) ── */}
      {showSampleEditor && sampleEditorPad != null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', padding: 20,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 10, padding: '0 10px',
          }}>
            <span style={{ color: '#00ffc8', fontSize: '0.85rem', fontWeight: 700 }}>
              ✎ Editing Pad {sampleEditorPad + 1}: {pads[sampleEditorPad]?.name || 'Sample'}
            </span>
            <button
              onClick={() => { setShowSampleEditor(false); setSampleEditorPad(null); }}
              style={{ background: 'none', border: '1px solid #3a5570', color: '#8899aa', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}
            >✕ Close</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid #1e2d3d' }}>
            <SamplerInstrument
              audioCtx={ctxRef.current}
              onSendToBeatMaker={(buffer, name) => handleSampleEditorSend(buffer, name)}
              onSendToTrack={(buffer, name) => handleSampleEditorSend(buffer, name)}
              track={null}
              trackIndex={sampleEditorPad}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SamplerBeatMaker;