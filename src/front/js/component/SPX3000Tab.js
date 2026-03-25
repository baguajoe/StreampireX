// =============================================================================
// SPX3000Tab.js — StreamPireX 3000 Engine
// Full MPC3000 emulation: 12-bit DAC, 4 banks, choke groups, 96 PPQN sequencer,
// song mode, velocity layers, Linn interpolation, drag & drop samples
// Shot 1: Engine + Pads + Banks + DAC + Choke + Sequencer + Song Mode
// =============================================================================

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import '../../styles/SamplerBeatMaker.css';
// =============================================================================
// CONSTANTS — faithful to MPC3000 spec
// =============================================================================

const SPX_BANKS       = ['A', 'B', 'C', 'D'];
const SPX_PADS        = 16;
const SPX_PPQN        = 96;          // MPC3000 resolution
const SPX_MAX_SEQS    = 64;          // MPC3000: 64 sequences
const SPX_MAX_BARS    = 999;         // MPC3000: 999 bars per sequence
const SPX_MAX_TRACKS  = 64;          // MPC3000: 64 tracks per sequence
const SPX_CHOKE_GROUPS = 8;
const SPX_SAMPLE_RATE  = 44100;
const SPX_BIT_DEPTH    = 12;         // DAC simulation target
const SPX_NOISE_FLOOR  = 0.0005;     // ~-66dB, authentic MPC3000 noise
const SPX_DAC_ROLLOFF  = 17500;      // Hz — Linn's anti-aliasing filter
const SPX_VEL_PITCH_AMT = 0.18;      // semitones added at max velocity
const SPX_INTERP_BLUR   = 0.42;      // Linn interpolation smear factor (0=clean, 1=blurry)

// MPC3000 timing correct values (in PPQN subdivisions)
const TIMING_CORRECT = {
  'OFF':  0,
  '1/8':  SPX_PPQN / 2,
  '1/8T': Math.round(SPX_PPQN / 3),
  '1/16': SPX_PPQN / 4,
  '1/16T':Math.round(SPX_PPQN / 6),
  '1/32': SPX_PPQN / 8,
  '1/32T':Math.round(SPX_PPQN / 12),
};

// Velocity curves — MPC3000 had 3 hardware curves
const VEL_CURVES = {
  soft:   (v) => Math.pow(v / 127, 1.6) * 127,
  medium: (v) => v,
  hard:   (v) => Math.pow(v / 127, 0.6) * 127,
};

// Pad layout — MPC3000 numbered bottom-left to top-right
const PAD_LAYOUT = [
  [12, 13, 14, 15],
  [ 8,  9, 10, 11],
  [ 4,  5,  6,  7],
  [ 0,  1,  2,  3],
];

// MPC3000 era pad colors (muted, industrial)
const SPX_PAD_COLORS = [
  '#c0392b','#e74c3c','#e67e22','#f39c12',
  '#27ae60','#2ecc71','#16a085','#1abc9c',
  '#2980b9','#3498db','#8e44ad','#9b59b6',
  '#d35400','#e74c3c','#c0392b','#7f8c8d',
];

// MIDI note mapping — MPC3000 default (pad 0 = A1 = MIDI 36)
const SPX_MIDI_NOTES = Array.from({ length: 64 }, (_, i) => 36 + i);

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Default pad state
const mkPad = (idx) => ({
  id:           idx,
  name:         `Pad ${idx + 1}`,
  buffer:       null,
  // Playback
  volume:       100,        // 0-100 (MPC3000 uses 0-100)
  tune:         0,          // ±50 cents fine tune
  semitone:     0,          // ±12 semitones
  pan:          0,          // -50 to +50
  // Loop
  loopMode:     'off',      // off | forward | pingpong
  loopStart:    0,
  loopEnd:      null,
  loopTune:     0,
  // Trim
  trimStart:    0,
  trimEnd:      null,
  // Envelope — MPC3000 had Attack + Release only (no sustain knob)
  attack:       0,
  release:      0,
  // Choke
  chokeGroup:   0,          // 0 = none, 1-8
  chokeRole:    'both',     // both | mute_only | self
  // Velocity
  velocityCurve:'medium',
  velToLevel:   true,       // velocity affects volume
  velToPitch:   true,       // SPX3000 quirk
  // Filter (basic MPC3000 lowpass)
  filterOn:     false,
  filterFreq:   8000,
  // Program
  midiNote:     36 + idx,
  // Layers (4 velocity zones)
  layers:       [],
  // State
  muted:        false,
  soloed:       false,
  // 12-bit DAC on this pad
  dacOn:        true,
  // Color
  color:        SPX_PAD_COLORS[idx % 16],
});

// Default sequence
const mkSequence = (idx) => ({
  id:       idx,
  name:     idx === 0 ? 'Sequence 01' : `Sequence ${String(idx + 1).padStart(2, '0')}`,
  bars:     2,
  timeNum:  4,
  timeDen:  4,
  bpm:      95,             // MPC3000 default was 95 BPM
  // tracks[trackIdx][tick] = [{ pad, bank, velocity }]
  tracks:   Array.from({ length: SPX_MAX_TRACKS }, () => ({})),
  // Which bank each track plays from
  trackBanks: Array(SPX_MAX_TRACKS).fill('A'),
  // Track mute/solo
  trackMuted:  Array(SPX_MAX_TRACKS).fill(false),
  trackSoloed: Array(SPX_MAX_TRACKS).fill(false),
});

// Default song block
const mkSongBlock = (seqIdx) => ({
  seqIdx,
  reps: 1,   // MPC3000: repeat count per song block
});

// =============================================================================
// 12-BIT DAC SIMULATION
// Truncates an AudioBuffer to 12-bit resolution + adds quantization noise
// =============================================================================
const applyDac12bit = (ctx, buffer) => {
  if (!buffer) return buffer;
  const steps    = Math.pow(2, SPX_BIT_DEPTH);       // 4096
  const halfStep = steps / 2;                         // 2048
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Quantize to 12-bit
      const quantized = Math.round(src[i] * halfStep) / halfStep;
      // Quantization noise (dithered)
      const noise = (Math.random() - 0.5) * SPX_NOISE_FLOOR;
      dst[i] = quantized + noise;
    }
  }
  return out;
};

// =============================================================================
// LINN INTERPOLATION — pitch shift via linear interpolation with blur
// Authentic MPC3000 pitch artifacts: slightly smeared transients
// =============================================================================
const linnInterpolate = (ctx, buffer, semitones, cents = 0) => {
  if (!buffer) return buffer;
  const ratio = Math.pow(2, (semitones + cents / 100) / 12);
  if (Math.abs(ratio - 1.0) < 0.001) return buffer;
  const nc = buffer.numberOfChannels;
  const origLen = buffer.length;
  const newLen = Math.round(origLen / ratio);
  if (newLen <= 0 || newLen > SPX_SAMPLE_RATE * 30) return buffer;
  const out = ctx.createBuffer(nc, newLen, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < newLen; i++) {
      const pos = i * ratio;
      const idx0 = Math.floor(pos);
      const frac = pos - idx0;
      const s0 = idx0 < origLen ? src[idx0] : 0;
      const s1 = (idx0 + 1) < origLen ? src[idx0 + 1] : s0;
      // Linn blur: blend with neighbour (authentic interpolation artifact)
      const s2 = (idx0 + 2) < origLen ? src[idx0 + 2] : s1;
      const clean = s0 + frac * (s1 - s0);
      const blurred = s0 * (1 - frac) * (1 - frac) + s1 * 2 * frac * (1 - frac) + s2 * frac * frac;
      dst[i] = clean * (1 - SPX_INTERP_BLUR) + blurred * SPX_INTERP_BLUR;
    }
  }
  return out;
};

// =============================================================================
// DAC ROLLOFF FILTER — baked into buffer (not real-time node)
// Simulates Linn's 17.5kHz anti-aliasing lowpass
// =============================================================================
const applyDacRolloff = (ctx, buffer) => {
  if (!buffer) return buffer;
  // Simple single-pole IIR lowpass: y[n] = a*x[n] + (1-a)*y[n-1]
  const rc = 1.0 / (2 * Math.PI * SPX_DAC_ROLLOFF);
  const dt = 1.0 / buffer.sampleRate;
  const a  = dt / (rc + dt);
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);
  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      prev = a * src[i] + (1 - a) * prev;
      dst[i] = prev;
    }
  }
  return out;
};

// =============================================================================
// ZERO-CROSSING SNAP (same as main SamplerBeatMaker)
// =============================================================================
const findZeroCrossing = (data, sampleIdx, range = 512) => {
  const start = Math.max(0, sampleIdx - range);
  const end   = Math.min(data.length - 1, sampleIdx + range);
  let closest = sampleIdx, minDist = range + 1;
  for (let i = start; i < end - 1; i++) {
    if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
      const dist = Math.abs(i - sampleIdx);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
  }
  return closest;
};

// =============================================================================
// QUANTIZE TICK to timing correct grid
// =============================================================================
const quantizeTick = (tick, tcPpqn, swing = 0) => {
  if (tcPpqn <= 0) return tick;
  const grid = Math.round(tick / tcPpqn) * tcPpqn;
  // Swing: push odd beats forward
  if (swing > 0) {
    const beat = Math.floor(grid / tcPpqn);
    if (beat % 2 === 1) return grid + Math.round(tcPpqn * (swing / 200));
  }
  return grid;
};

// =============================================================================
// COMPONENT
// =============================================================================

const SPX3000Tab = ({
  // Integration props (mirrors SamplerBeatMaker pattern)
  onExport,
  onSendToArrange,
  isEmbedded = false,
}) => {

  // ── Audio Engine ──────────────────────────────────────────────────────────
  const ctxRef     = useRef(null);
  const masterRef  = useRef(null);
  const activeSrc  = useRef({});       // key: `${bank}_${padIdx}` → { source, gain }
  const dacCache   = useRef({});       // bank_pad → processed AudioBuffer

  // ── Pads — 4 banks × 16 pads ─────────────────────────────────────────────
  const [banks, setBanks] = useState(() => ({
    A: Array.from({ length: SPX_PADS }, (_, i) => mkPad(i)),
    B: Array.from({ length: SPX_PADS }, (_, i) => mkPad(i)),
    C: Array.from({ length: SPX_PADS }, (_, i) => mkPad(i)),
    D: Array.from({ length: SPX_PADS }, (_, i) => mkPad(i)),
  }));
  const [activeBank, setActiveBank]   = useState('A');
  const [selectedPad, setSelectedPad] = useState(null);
  const [activePads, setActivePads]   = useState(new Set());
  const [dragPad, setDragPad]         = useState(null);

  // ── DAC / Character ───────────────────────────────────────────────────────
  const [dacEnabled, setDacEnabled]     = useState(true);   // global 12-bit on/off
  const [rolloffEnabled, setRolloffEnabled] = useState(true);
  const [linnEnabled, setLinnEnabled]   = useState(true);
  const [velPitchEnabled, setVelPitchEnabled] = useState(true);
  const [noiseAmt, setNoiseAmt]         = useState(100);    // 0-200% noise floor

  // ── Sequences ─────────────────────────────────────────────────────────────
  const [sequences, setSequences]       = useState(() => [mkSequence(0)]);
  const [curSeqIdx, setCurSeqIdx]       = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(0);

  // ── Transport ─────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying]       = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [overdub, setOverdub]           = useState(false);
  const [bpm, setBpm]                   = useState(95);
  const [masterVol, setMasterVol]       = useState(0.85);
  const [curTick, setCurTick]           = useState(0);
  const [curBar, setCurBar]             = useState(0);
  const [curBeat, setCurBeat]           = useState(0);

  // ── Timing Correct ────────────────────────────────────────────────────────
  const [timingCorrect, setTimingCorrect] = useState('1/16');
  const [swing, setSwing]               = useState(0);

  // ── Song Mode ─────────────────────────────────────────────────────────────
  const [songMode, setSongMode]         = useState(false);
  const [songBlocks, setSongBlocks]     = useState([]);
  const [songPos, setSongPos]           = useState(0);

  // ── Erase Mode ────────────────────────────────────────────────────────────
  const [eraseMode, setEraseMode]       = useState(false);

  // ── Tap Tempo ─────────────────────────────────────────────────────────────
  const tapTimesRef = useRef([]);

  // ── MIDI ──────────────────────────────────────────────────────────────────
  const [midiInputs, setMidiInputs]     = useState([]);
  const [selMidi, setSelMidi]           = useState(null);
  const [midiLearn, setMidiLearn]       = useState(false);
  const [midiLearnPad, setMidiLearnPad] = useState(null);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [view, setView]                 = useState('pads');   // pads | sequencer | song | mixer
  const [padSettingsOpen, setPadSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab]   = useState('main');
  const [statusMsg, setStatusMsg]       = useState('SPX3000 Ready');
  const [seqGridMode, setSeqGridMode]   = useState('steps'); // steps | piano
  const [stepResolution, setStepResolution] = useState('1/16');
  const [exporting, setExporting]       = useState(false);

  // ── Sequencer Engine Refs ─────────────────────────────────────────────────
  const seqTimer      = useRef(null);
  const nextTickTime  = useRef(0);
  const curTickRef    = useRef(0);
  const playingRef    = useRef(false);
  const recordingRef  = useRef(false);
  const bpmRef        = useRef(bpm);
  const banksRef      = useRef(banks);
  const seqRef        = useRef(sequences[0]);
  const activeBankRef = useRef(activeBank);
  const dacRef        = useRef(dacEnabled);
  const recStartTick  = useRef(0);
  const recHits       = useRef([]);   // { padIdx, bank, tick, velocity }
  const songPosRef    = useRef(0);
  const songBlocksRef = useRef(songBlocks);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { banksRef.current = banks; }, [banks]);
  useEffect(() => { seqRef.current = sequences[curSeqIdx]; }, [sequences, curSeqIdx]);
  useEffect(() => { activeBankRef.current = activeBank; }, [activeBank]);
  useEffect(() => { dacRef.current = dacEnabled; }, [dacEnabled]);
  useEffect(() => { songBlocksRef.current = songBlocks; }, [songBlocks]);
  useEffect(() => { if (masterRef.current) masterRef.current.gain.value = masterVol; }, [masterVol]);

  // ── Status auto-clear ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg || statusMsg === 'SPX3000 Ready') return;
    const t = setTimeout(() => setStatusMsg('SPX3000 Ready'), 3000);
    return () => clearTimeout(t);
  }, [statusMsg]);

  // =============================================================================
  // AUDIO INIT
  // =============================================================================

  const initCtx = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') return ctxRef.current;
    const c = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate:  SPX_SAMPLE_RATE,
    });
    const mg = c.createGain();
    mg.gain.value = masterVol;
    mg.connect(c.destination);
    masterRef.current = mg;
    ctxRef.current = c;
    return c;
  }, [masterVol]);

  // =============================================================================
  // SAMPLE LOADING (drag & drop + file picker)
  // =============================================================================

  const getProcessedBuffer = useCallback(async (bank, padIdx) => {
    const cacheKey = `${bank}_${padIdx}_${dacEnabled ? 1 : 0}_${rolloffEnabled ? 1 : 0}`;
    if (dacCache.current[cacheKey]) return dacCache.current[cacheKey];
    const pad = banksRef.current[bank][padIdx];
    if (!pad?.buffer) return null;
    const c = initCtx();
    let buf = pad.buffer;
    // Apply rolloff first (before bit crush)
    if (rolloffEnabled) buf = applyDacRolloff(c, buf);
    // Apply 12-bit DAC
    if (dacEnabled && pad.dacOn) buf = applyDac12bit(c, buf);
    dacCache.current[cacheKey] = buf;
    return buf;
  }, [dacEnabled, rolloffEnabled, initCtx]);

  // Invalidate DAC cache for a pad when buffer changes
  const invalidateDacCache = useCallback((bank, padIdx) => {
    Object.keys(dacCache.current).forEach(k => {
      if (k.startsWith(`${bank}_${padIdx}_`)) delete dacCache.current[k];
    });
  }, []);

  const loadSample = useCallback(async (bank, padIdx, source) => {
    const c = initCtx();
    try {
      let ab;
      if (source instanceof File || source instanceof Blob) {
        ab = await source.arrayBuffer();
      } else if (typeof source === 'string') {
        const r = await fetch(source);
        ab = await r.arrayBuffer();
      } else if (source instanceof AudioBuffer) {
        setBanks(prev => {
          const u = { ...prev };
          const pads = [...u[bank]];
          pads[padIdx] = {
            ...pads[padIdx],
            buffer:  source,
            name:    `Pad ${padIdx + 1}`,
            trimEnd: source.duration,
            loopEnd: source.duration,
          };
          u[bank] = pads;
          return u;
        });
        invalidateDacCache(bank, padIdx);
        setStatusMsg(`Pad ${padIdx + 1} loaded`);
        return;
      } else return;

      const buf = await c.decodeAudioData(ab);
      const name = source instanceof File
        ? source.name.replace(/\.[^/.]+$/, '')
        : `Pad ${padIdx + 1}`;

      setBanks(prev => {
        const u = { ...prev };
        const pads = [...u[bank]];
        pads[padIdx] = {
          ...pads[padIdx],
          buffer:  buf,
          name:    name.slice(0, 24),
          trimEnd: buf.duration,
          loopEnd: buf.duration,
        };
        u[bank] = pads;
        return u;
      });
      invalidateDacCache(bank, padIdx);
      setStatusMsg(`${name.slice(0, 20)} → Bank ${bank} Pad ${padIdx + 1}`);
    } catch (e) {
      console.error('[SPX3000] loadSample failed:', e);
      setStatusMsg('Load failed: ' + e.message.slice(0, 30));
    }
  }, [initCtx, invalidateDacCache]);

  // =============================================================================
  // PAD PLAYBACK — SPX3000 engine
  // =============================================================================

  const stopChokeGroup = useCallback((group, exemptKey = null) => {
    if (group === 0) return;
    // Stop all pads in same choke group (instant cut — MPC3000 behavior)
    Object.entries(activeSrc.current).forEach(([key, entry]) => {
      if (key === exemptKey) return;
      if (entry.chokeGroup === group) {
        try { entry.source.stop(); } catch (e) {}
        delete activeSrc.current[key];
        const [b, pi] = key.split('_');
        setActivePads(prev => { const n = new Set(prev); n.delete(`${b}_${pi}`); return n; });
      }
    });
  }, []);

  const playPad = useCallback(async (padIdx, velocity = 100, bank = null, schedTime = null) => {
    const b   = bank || activeBankRef.current;
    const pad = banksRef.current[b]?.[padIdx];
    if (!pad?.buffer || pad.muted) return;

    // Check solo
    const anySolo = Object.values(banksRef.current).some(pads => pads.some(p => p.soloed));
    if (anySolo && !pad.soloed) return;

    const c = initCtx();
    if (c.state === 'suspended') c.resume();

    // Apply velocity curve
    const curvedVel = VEL_CURVES[pad.velocityCurve](velocity);
    const velNorm   = curvedVel / 127;

    // Velocity-to-pitch quirk (MPC3000 hardware characteristic)
    const velPitchShift = velPitchEnabled && pad.velToPitch
      ? SPX_VEL_PITCH_AMT * (velNorm - 0.5) * 2   // -0.18 to +0.18 semitones
      : 0;

    // Get (possibly cached) processed buffer
    let buf = await getProcessedBuffer(b, padIdx);
    if (!buf) buf = pad.buffer;

    // Apply Linn interpolation for pitch if needed
    const totalSemitones = (pad.semitone || 0) + velPitchShift;
    const totalCents     = pad.tune || 0;
    if (linnEnabled && (Math.abs(totalSemitones) > 0.01 || Math.abs(totalCents) > 0.5)) {
      buf = linnInterpolate(c, buf, totalSemitones, totalCents);
    }

    // Stop previous if oneshot (choke self)
    const key = `${b}_${padIdx}`;
    if (activeSrc.current[key]) {
      try { activeSrc.current[key].source.stop(); } catch (e) {}
      delete activeSrc.current[key];
    }

    // Choke group — instant cut
    if (pad.chokeGroup > 0) stopChokeGroup(pad.chokeGroup, key);

    // Build audio graph
    const src  = c.createBufferSource();
    const gain = c.createGain();
    const pan  = c.createStereoPanner();

    src.buffer = buf;
    src.playbackRate.value = 1.0;  // Pitch baked via linnInterpolate

    // Volume — MPC3000 uses 0-100 scale
    const vol = (pad.volume / 100) * (pad.velToLevel ? velNorm : 1.0);
    gain.gain.value = vol;

    // Pan — MPC3000 -50 to +50
    pan.pan.value = (pad.pan || 0) / 50;

    // Per-pad lowpass filter
    let lastNode = src;
    if (pad.filterOn) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = pad.filterFreq;
      filter.Q.value = 0.5;
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(gain);
    gain.connect(pan);
    pan.connect(masterRef.current);

    // Attack envelope (MPC3000: 0-50ms attack)
    const st = schedTime || c.currentTime;
    if (pad.attack > 0) {
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(vol, st + pad.attack / 1000);
    }

    // Trim
    const trimStart = pad.trimStart || 0;
    const trimEnd   = pad.trimEnd   || buf.duration;
    const duration  = trimEnd - trimStart;

    // Loop mode
    if (pad.loopMode === 'forward') {
      src.loop      = true;
      src.loopStart = pad.loopStart || trimStart;
      src.loopEnd   = pad.loopEnd   || trimEnd;
      src.start(st, trimStart);
    } else {
      src.start(st, trimStart, duration);
    }

    // Release
    if (pad.release > 0) {
      const rs = st + duration;
      gain.gain.setValueAtTime(vol, rs);
      gain.gain.linearRampToValueAtTime(0, rs + pad.release / 1000);
    }

    activeSrc.current[key] = { source: src, gain, chokeGroup: pad.chokeGroup };
    setActivePads(prev => new Set([...prev, key]));

    src.onended = () => {
      delete activeSrc.current[key];
      setActivePads(prev => { const n = new Set(prev); n.delete(key); return n; });
    };
  }, [initCtx, getProcessedBuffer, stopChokeGroup, linnEnabled, velPitchEnabled]);

  const stopPad = useCallback((padIdx, bank = null) => {
    const b   = bank || activeBankRef.current;
    const key = `${b}_${padIdx}`;
    if (activeSrc.current[key]) {
      try { activeSrc.current[key].source.stop(); } catch (e) {}
      delete activeSrc.current[key];
    }
    setActivePads(prev => { const n = new Set(prev); n.delete(key); return n; });
  }, []);

  const stopAll = useCallback(() => {
    Object.keys(activeSrc.current).forEach(k => {
      try { activeSrc.current[k].source.stop(); } catch (e) {}
    });
    activeSrc.current = {};
    setActivePads(new Set());
  }, []);

  // =============================================================================
  // SEQUENCER — 96 PPQN engine
  // MPC3000 spec: tick-accurate scheduling, bar/beat/tick display
  // =============================================================================

  const getTicksPerBar = useCallback((seq) => {
    return SPX_PPQN * (seq?.timeNum || 4);
  }, []);

  const schedTick = useCallback((tick, time) => {
    const seq = seqRef.current;
    if (!seq) return;
    const tracks = seq.tracks;
    for (let ti = 0; ti < SPX_MAX_TRACKS; ti++) {
      if (seq.trackMuted[ti]) continue;
      const events = tracks[ti][tick];
      if (!events) continue;
      events.forEach(evt => {
        playPad(evt.pad, evt.velocity, evt.bank, time);
      });
    }
  }, [playPad]);

  const startSeq = useCallback(() => {
    const c = initCtx();
    if (c.state === 'suspended') c.resume();
    playingRef.current  = true;
    recordingRef.current = isRecording;
    setIsPlaying(true);
    curTickRef.current  = 0;
    nextTickTime.current = c.currentTime + 0.05;
    recHits.current     = [];
    recStartTick.current = 0;

    const seq = seqRef.current;
    const ticksPerBar = getTicksPerBar(seq);
    const totalTicks  = ticksPerBar * (seq?.bars || 2);

    const scheduler = () => {
      if (!playingRef.current) return;
      const c2 = ctxRef.current;
      const spb = 60.0 / bpmRef.current;           // seconds per beat
      const spt = spb / SPX_PPQN;                   // seconds per tick

      while (nextTickTime.current < c2.currentTime + 0.12) {
        const tick = curTickRef.current;
        schedTick(tick, nextTickTime.current);

        // UI position update
        const bar  = Math.floor(tick / ticksPerBar);
        const beat = Math.floor((tick % ticksPerBar) / SPX_PPQN);
        const t    = tick % SPX_PPQN;
        const dt   = (nextTickTime.current - c2.currentTime) * 1000;
        setTimeout(() => {
          setCurTick(t);
          setCurBar(bar);
          setCurBeat(beat);
        }, Math.max(0, dt));

        // Advance
        curTickRef.current = (tick + 1) % totalTicks;
        nextTickTime.current += spt;

        // Song mode: advance to next block at end of sequence
        if (curTickRef.current === 0 && songMode) {
          const blocks = songBlocksRef.current;
          if (blocks.length > 0) {
            const nextPos = (songPosRef.current + 1) % blocks.length;
            songPosRef.current = nextPos;
            setSongPos(nextPos);
            const nextSeqIdx = blocks[nextPos].seqIdx;
            setTimeout(() => setCurSeqIdx(nextSeqIdx), 0);
          }
        }
      }
      seqTimer.current = setTimeout(scheduler, 20);
    };
    scheduler();
  }, [initCtx, isRecording, schedTick, getTicksPerBar, songMode]);

  const stopSeq = useCallback(() => {
    playingRef.current   = false;
    recordingRef.current = false;
    setIsPlaying(false);
    setIsRecording(false);
    setCurTick(0); setCurBar(0); setCurBeat(0);
    curTickRef.current = 0;
    if (seqTimer.current) clearTimeout(seqTimer.current);
    seqTimer.current = null;
    stopAll();

    // Flush recorded hits
    if (recHits.current.length > 0) {
      const tcPpqn = TIMING_CORRECT[timingCorrect] || 0;
      setSequences(prev => {
        const u = [...prev];
        const seq = { ...u[curSeqIdx], tracks: u[curSeqIdx].tracks.map(t => ({ ...t })) };
        recHits.current.forEach(hit => {
          const qTick = tcPpqn > 0 ? quantizeTick(hit.tick, tcPpqn, swing) : hit.tick;
          const track = selectedTrack;
          if (!seq.tracks[track][qTick]) seq.tracks[track][qTick] = [];
          // Avoid duplicate if overdub adds same pad at same tick
          const existing = seq.tracks[track][qTick];
          const dup = existing.find(e => e.pad === hit.pad && e.bank === hit.bank);
          if (!dup) existing.push({ pad: hit.pad, bank: hit.bank, velocity: hit.velocity });
        });
        u[curSeqIdx] = seq;
        return u;
      });
      recHits.current = [];
      setStatusMsg('Recording quantized & saved');
    }
  }, [stopAll, timingCorrect, swing, curSeqIdx, selectedTrack]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) stopSeq();
    else startSeq();
  }, [startSeq, stopSeq]);

  const toggleRecord = useCallback(() => {
    setIsRecording(prev => {
      recordingRef.current = !prev;
      if (!prev && !playingRef.current) startSeq();
      return !prev;
    });
  }, [startSeq]);

  // Record a live hit
  const recordHit = useCallback((padIdx, velocity) => {
    if (!recordingRef.current) return;
    const spb  = 60.0 / bpmRef.current;
    const spt  = spb / SPX_PPQN;
    const c    = ctxRef.current;
    const elapsed = c ? c.currentTime - (nextTickTime.current - spt * curTickRef.current) : 0;
    const tick = curTickRef.current;
    recHits.current.push({
      pad:      padIdx,
      bank:     activeBankRef.current,
      tick,
      velocity,
    });
  }, []);

  // =============================================================================
  // PAD HIT — unified handler (live play + record + erase)
  // =============================================================================

  const handlePadHit = useCallback((padIdx, velocity = 100) => {
    if (eraseMode) {
      // Erase all events for this pad on current track
      setSequences(prev => {
        const u = [...prev];
        const seq = { ...u[curSeqIdx] };
        const track = { ...seq.tracks[selectedTrack] };
        Object.keys(track).forEach(tick => {
          track[tick] = track[tick].filter(e =>
            !(e.pad === padIdx && e.bank === activeBankRef.current)
          );
          if (track[tick].length === 0) delete track[tick];
        });
        seq.tracks = [...seq.tracks];
        seq.tracks[selectedTrack] = track;
        u[curSeqIdx] = seq;
        return u;
      });
      setStatusMsg(`Erased pad ${padIdx + 1} from track ${selectedTrack + 1}`);
      return;
    }
    playPad(padIdx, velocity);
    recordHit(padIdx, velocity);
    setSelectedPad(padIdx);
  }, [eraseMode, playPad, recordHit, curSeqIdx, selectedTrack]);

  // =============================================================================
  // SEQUENCE MANAGEMENT
  // =============================================================================

  const addSequence = useCallback(() => {
    setSequences(prev => {
      if (prev.length >= SPX_MAX_SEQS) return prev;
      return [...prev, mkSequence(prev.length)];
    });
  }, []);

  const deleteSequence = useCallback((idx) => {
    if (sequences.length <= 1) return;
    setSequences(prev => prev.filter((_, i) => i !== idx));
    if (curSeqIdx >= idx && curSeqIdx > 0) setCurSeqIdx(c => c - 1);
  }, [sequences.length, curSeqIdx]);

  const renameSequence = useCallback((idx, name) => {
    setSequences(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], name };
      return u;
    });
  }, []);

  const updateSequence = useCallback((idx, updates) => {
    setSequences(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], ...updates };
      return u;
    });
  }, []);

  const clearSequence = useCallback((idx) => {
    setSequences(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], tracks: Array.from({ length: SPX_MAX_TRACKS }, () => ({})) };
      return u;
    });
    setStatusMsg('Sequence cleared');
  }, []);

  // Copy sequence
  const copySequence = useCallback((fromIdx, toIdx) => {
    setSequences(prev => {
      const u = [...prev];
      const src = u[fromIdx];
      u[toIdx] = {
        ...src,
        name: `${src.name} (copy)`,
        tracks: src.tracks.map(t => ({ ...t })),
      };
      return u;
    });
  }, []);

  // Step toggle (in step grid view)
  const toggleStep = useCallback((trackIdx, tick) => {
    setSequences(prev => {
      const u = [...prev];
      const seq = { ...u[curSeqIdx] };
      const tracks = [...seq.tracks];
      const track  = { ...tracks[trackIdx] };
      if (track[tick]) {
        delete track[tick];
      } else {
        track[tick] = [{
          pad:      trackIdx % SPX_PADS,
          bank:     activeBankRef.current,
          velocity: 100,
        }];
      }
      tracks[trackIdx] = track;
      seq.tracks = tracks;
      u[curSeqIdx] = seq;
      return u;
    });
  }, [curSeqIdx]);

  // =============================================================================
  // SONG MODE
  // =============================================================================

  const addSongBlock = useCallback((seqIdx) => {
    setSongBlocks(prev => [...prev, mkSongBlock(seqIdx)]);
  }, []);

  const removeSongBlock = useCallback((idx) => {
    setSongBlocks(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateSongBlock = useCallback((idx, updates) => {
    setSongBlocks(prev => {
      const u = [...prev];
      u[idx] = { ...u[idx], ...updates };
      return u;
    });
  }, []);

  const moveSongBlock = useCallback((from, to) => {
    setSongBlocks(prev => {
      const u = [...prev];
      const [item] = u.splice(from, 1);
      u.splice(to, 0, item);
      return u;
    });
  }, []);

  // =============================================================================
  // PAD MANAGEMENT
  // =============================================================================

  const updatePad = useCallback((bank, padIdx, updates) => {
    setBanks(prev => {
      const u = { ...prev };
      const pads = [...u[bank]];
      pads[padIdx] = { ...pads[padIdx], ...updates };
      u[bank] = pads;
      return u;
    });
    if ('dacOn' in updates || 'filterOn' in updates || 'filterFreq' in updates) {
      invalidateDacCache(bank, padIdx);
    }
  }, [invalidateDacCache]);

  const clearPad = useCallback((bank, padIdx) => {
    setBanks(prev => {
      const u = { ...prev };
      const pads = [...u[bank]];
      pads[padIdx] = mkPad(padIdx);
      u[bank] = pads;
      return u;
    });
    invalidateDacCache(bank, padIdx);
    setStatusMsg(`Pad ${padIdx + 1} cleared`);
  }, [invalidateDacCache]);

  // Copy pad between banks
  const copyPadToBank = useCallback((srcBank, padIdx, destBank) => {
    setBanks(prev => {
      const u = { ...prev };
      const srcPad = { ...u[srcBank][padIdx] };
      const destPads = [...u[destBank]];
      destPads[padIdx] = { ...srcPad };
      u[destBank] = destPads;
      return u;
    });
    invalidateDacCache(destBank, padIdx);
    setStatusMsg(`Copied pad ${padIdx + 1} to bank ${destBank}`);
  }, [invalidateDacCache]);

  // =============================================================================
  // DRAG & DROP
  // =============================================================================

  const onDragOver = useCallback((e, padIdx) => {
    e.preventDefault(); e.stopPropagation();
    setDragPad(padIdx);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragPad(null);
  }, []);

  const onDrop = useCallback((e, padIdx) => {
    e.preventDefault(); e.stopPropagation();
    setDragPad(null);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff|m4a)$/i.test(file.name))) {
      loadSample(activeBank, padIdx, file);
    }
  }, [activeBank, loadSample]);

  const fileSelect = useCallback((bank, padIdx) => {
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = 'audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a';
    inp.onchange = (e) => {
      if (e.target.files[0]) loadSample(bank, padIdx, e.target.files[0]);
    };
    inp.click();
  }, [loadSample]);

  // =============================================================================
  // MIDI
  // =============================================================================

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false }).then(acc => {
      const ins = [];
      acc.inputs.forEach(i => ins.push(i));
      setMidiInputs(ins);
      acc.onstatechange = () => {
        const n = [];
        acc.inputs.forEach(i => n.push(i));
        setMidiInputs(n);
      };
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selMidi) return;
    const handle = (msg) => {
      const [st, note, vel] = msg.data;
      const noteOn = (st & 0xF0) === 0x90 && vel > 0;
      if (!noteOn) return;
      // Find pad by MIDI note
      const bank = banksRef.current[activeBankRef.current];
      const padIdx = bank.findIndex(p => p.midiNote === note);
      if (padIdx !== -1) handlePadHit(padIdx, vel);
    };
    selMidi.onmidimessage = handle;
    return () => { selMidi.onmidimessage = null; };
  }, [selMidi, handlePadHit]);

  // =============================================================================
  // TAP TEMPO
  // =============================================================================

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const ts  = tapTimesRef.current;
    if (ts.length > 0 && now - ts[ts.length - 1] > 2000) tapTimesRef.current = [];
    ts.push(now);
    if (ts.length > 8) ts.shift();
    if (ts.length >= 2) {
      let total = 0;
      for (let i = 1; i < ts.length; i++) total += ts[i] - ts[i - 1];
      const nb = Math.round(60000 / (total / (ts.length - 1)));
      if (nb >= 20 && nb <= 300) {
        setBpm(nb);
        updateSequence(curSeqIdx, { bpm: nb });
        setStatusMsg(`Tempo: ${nb} BPM`);
      }
    }
  }, [curSeqIdx, updateSequence]);

  // =============================================================================
  // KEYBOARD
  // =============================================================================

  const KEY_TO_PAD = useMemo(() => ({
    '1':0,'2':1,'3':2,'4':3,
    'q':4,'w':5,'e':6,'r':7,
    'a':8,'s':9,'d':10,'f':11,
    'z':12,'x':13,'c':14,'v':15,
  }), []);

  useEffect(() => {
    const kd = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); togglePlay(); return; }
      if (k === 'escape') { stopSeq(); return; }
      if (KEY_TO_PAD.hasOwnProperty(k)) {
        e.preventDefault();
        initCtx();
        handlePadHit(KEY_TO_PAD[k], 100);
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [togglePlay, stopSeq, handlePadHit, initCtx, KEY_TO_PAD]);

  // =============================================================================
  // EXPORT
  // =============================================================================

  const toWav = useCallback((buf) => {
    const nc = buf.numberOfChannels, sr = buf.sampleRate;
    const dl = buf.length * nc * 2;
    const ab = new ArrayBuffer(44 + dl), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0,'RIFF'); v.setUint32(4,36+dl,true); ws(8,'WAVE'); ws(12,'fmt ');
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,nc,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*nc*2,true);
    v.setUint16(32,nc*2,true); v.setUint16(34,16,true);
    ws(36,'data'); v.setUint32(40,dl,true);
    const chs = [];
    for (let c = 0; c < nc; c++) chs.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < buf.length; i++) {
      for (let c2 = 0; c2 < nc; c2++) {
        const s = Math.max(-1, Math.min(1, chs[c2][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2;
      }
    }
    return new Blob([ab], { type: 'audio/wav' });
  }, []);

  const renderSequence = useCallback(async (seqIdx) => {
    const seq = sequences[seqIdx];
    if (!seq) return null;
    const spb      = 60.0 / (seq.bpm || bpm);
    const spt      = spb / SPX_PPQN;
    const ticksPer = getTicksPerBar(seq);
    const totalT   = ticksPer * seq.bars * spt;
    const sr       = SPX_SAMPLE_RATE;
    const oc       = new OfflineAudioContext(2, Math.ceil(totalT * sr), sr);
    const mg       = oc.createGain(); mg.gain.value = masterVol; mg.connect(oc.destination);

    for (let ti = 0; ti < SPX_MAX_TRACKS; ti++) {
      if (seq.trackMuted[ti]) continue;
      const track = seq.tracks[ti];
      for (const [tickStr, events] of Object.entries(track)) {
        const tick = parseInt(tickStr, 10);
        const time = tick * spt;
        events.forEach(async (evt) => {
          const pad = banksRef.current[evt.bank]?.[evt.pad];
          if (!pad?.buffer) return;
          const velNorm = evt.velocity / 127;
          const src  = oc.createBufferSource();
          const gain = oc.createGain();
          let buf = pad.buffer;
          if (rolloffEnabled) buf = applyDacRolloff(oc, buf);
          if (dacEnabled && pad.dacOn) buf = applyDac12bit(oc, buf);
          src.buffer = buf;
          gain.gain.value = (pad.volume / 100) * velNorm;
          src.connect(gain); gain.connect(mg);
          const off = pad.trimStart || 0;
          const dur = (pad.trimEnd || buf.duration) - off;
          src.start(time, off, dur);
        });
      }
    }
    return await oc.startRendering();
  }, [sequences, bpm, getTicksPerBar, masterVol, dacEnabled, rolloffEnabled]);

  const exportSequence = useCallback(async () => {
    setExporting(true);
    setStatusMsg('Rendering...');
    try {
      const rendered = await renderSequence(curSeqIdx);
      if (!rendered) { setStatusMsg('Nothing to export'); return; }
      const blob = toWav(rendered);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `SPX3000_${sequences[curSeqIdx].name}_${bpm}bpm.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatusMsg('Exported WAV');
    } catch (e) {
      setStatusMsg('Export failed: ' + e.message.slice(0, 30));
    } finally { setExporting(false); }
  }, [renderSequence, curSeqIdx, sequences, bpm, toWav]);

  // Send rendered buffer to Arrange
  const sendToArrange = useCallback(async () => {
    if (!onSendToArrange) return;
    setStatusMsg('Rendering for Arrange...');
    try {
      const rendered = await renderSequence(curSeqIdx);
      if (rendered) {
        onSendToArrange(rendered, `SPX3000 — ${sequences[curSeqIdx].name}`);
        setStatusMsg('Sent to Arrange');
      }
    } catch (e) {
      setStatusMsg('Bounce failed');
    }
  }, [onSendToArrange, renderSequence, curSeqIdx, sequences]);

  // =============================================================================
  // CLEANUP
  // =============================================================================

  useEffect(() => {
    return () => {
      stopSeq();
      if (ctxRef.current) ctxRef.current.close();
    };
  }, [stopSeq]);

  // =============================================================================
  // COMPUTED
  // =============================================================================

  const curPads  = banks[activeBank];
  const curSeq   = sequences[curSeqIdx];
  const ticksPerBar = getTicksPerBar(curSeq);
  const totalTicks  = ticksPerBar * (curSeq?.bars || 2);

  // Step resolution in ticks
  const STEP_RES_TICKS = {
    '1/8':  SPX_PPQN / 2,
    '1/16': SPX_PPQN / 4,
    '1/32': SPX_PPQN / 8,
  };
  const stepTicks = STEP_RES_TICKS[stepResolution] || (SPX_PPQN / 4);
  const totalSteps = Math.floor(totalTicks / stepTicks);

  // Which steps are active for a given track
  const getTrackSteps = useCallback((trackIdx) => {
    const track = curSeq?.tracks[trackIdx];
    if (!track) return new Set();
    const active = new Set();
    Object.keys(track).forEach(tick => {
      const stepIdx = Math.floor(parseInt(tick, 10) / stepTicks);
      active.add(stepIdx);
    });
    return active;
  }, [curSeq, stepTicks]);

  const curStepIdx = Math.floor(
    (curBar * ticksPerBar + curBeat * SPX_PPQN + curTick) / stepTicks
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="spx3000-root">

      {/* ── TOP STATUS BAR ── */}
      <div className="spx3000-status-bar">
        <span className="spx3000-logo">SPX<span className="spx3000-logo-num">3000</span></span>
        <div className="spx3000-counter">
          <span className="spx3000-counter-seg">{String(curBar + 1).padStart(3, '0')}</span>
          <span className="spx3000-counter-dot">:</span>
          <span className="spx3000-counter-seg">{String(curBeat + 1).padStart(2, '0')}</span>
          <span className="spx3000-counter-dot">:</span>
          <span className="spx3000-counter-seg">{String(curTick).padStart(2, '0')}</span>
        </div>
        <div className="spx3000-status-msg">{statusMsg}</div>
        <div className="spx3000-dac-badges">
          <button
            className={`spx3000-dac-badge ${dacEnabled ? 'on' : 'off'}`}
            onClick={() => { setDacEnabled(p => !p); dacCache.current = {}; setStatusMsg(dacEnabled ? '24-bit mode' : '12-bit DAC on'); }}
          >
            {dacEnabled ? '12-BIT' : '24-BIT'}
          </button>
          <button
            className={`spx3000-dac-badge ${linnEnabled ? 'on' : 'off'}`}
            onClick={() => setLinnEnabled(p => !p)}
            title="Linn interpolation"
          >LINN</button>
          <button
            className={`spx3000-dac-badge ${velPitchEnabled ? 'on' : 'off'}`}
            onClick={() => setVelPitchEnabled(p => !p)}
            title="Velocity to pitch quirk"
          >V→P</button>
        </div>
      </div>

      {/* ── TRANSPORT ── */}
      <div className="spx3000-transport">
        <div className="spx3000-transport-left">
          {/* BPM */}
          <div className="spx3000-bpm-block">
            <button className="spx3000-bpm-nudge" onClick={() => setBpm(p => Math.max(20, p - 1))}>−</button>
            <div className="spx3000-bpm-display">
              <input
                className="spx3000-bpm-input"
                type="number" min={20} max={300}
                value={bpm}
                onChange={e => setBpm(Math.min(300, Math.max(20, parseInt(e.target.value) || 95)))}
              />
              <span className="spx3000-bpm-label">BPM</span>
            </div>
            <button className="spx3000-bpm-nudge" onClick={() => setBpm(p => Math.min(300, p + 1))}>+</button>
          </div>
          <button className="spx3000-btn tap" onClick={tapTempo}>TAP</button>

          {/* Time sig */}
          <div className="spx3000-timesig">
            <select value={curSeq?.timeNum || 4} onChange={e => updateSequence(curSeqIdx, { timeNum: +e.target.value })}>
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>/</span>
            <select value={curSeq?.timeDen || 4} onChange={e => updateSequence(curSeqIdx, { timeDen: +e.target.value })}>
              {[4,8,16].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Bars */}
          <div className="spx3000-bars-ctrl">
            <label>Bars</label>
            <button onClick={() => updateSequence(curSeqIdx, { bars: Math.max(1, (curSeq?.bars||2) - 1) })}>−</button>
            <span className="spx3000-bars-val">{curSeq?.bars || 2}</span>
            <button onClick={() => updateSequence(curSeqIdx, { bars: Math.min(SPX_MAX_BARS, (curSeq?.bars||2) + 1) })}>+</button>
          </div>
        </div>

        <div className="spx3000-transport-center">
          <button
            className={`spx3000-transport-btn stop ${!isPlaying ? 'active' : ''}`}
            onClick={stopSeq}
            title="Stop (Esc)"
          >■</button>
          <button
            className={`spx3000-transport-btn play ${isPlaying && !isRecording ? 'active' : ''}`}
            onClick={() => { if (!isPlaying) startSeq(); }}
            title="Play (Space)"
          >▶</button>
          <button
            className={`spx3000-transport-btn rec ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecord}
            title="Record"
          >●</button>
          <button
            className={`spx3000-transport-btn overdub ${overdub ? 'active' : ''}`}
            onClick={() => setOverdub(p => !p)}
            title="Overdub"
          >OVR</button>
          <button
            className={`spx3000-transport-btn erase ${eraseMode ? 'active' : ''}`}
            onClick={() => setEraseMode(p => !p)}
            title="Erase mode — hit a pad to erase its steps"
          >ERASE</button>
        </div>

        <div className="spx3000-transport-right">
          {/* Timing Correct */}
          <div className="spx3000-tc">
            <label>T.C.</label>
            <select value={timingCorrect} onChange={e => setTimingCorrect(e.target.value)}>
              {Object.keys(TIMING_CORRECT).map(tc => <option key={tc} value={tc}>{tc}</option>)}
            </select>
          </div>
          {/* Swing */}
          <div className="spx3000-swing">
            <label>Swing</label>
            <input type="range" min={0} max={75} value={swing} onChange={e => setSwing(+e.target.value)} />
            <span>{swing}%</span>
          </div>
          {/* Master vol */}
          <div className="spx3000-mvol">
            <label>🔊</label>
            <input type="range" min={0} max={100} value={Math.round(masterVol * 100)} onChange={e => setMasterVol(+e.target.value / 100)} />
          </div>
          {/* Song mode */}
          <button
            className={`spx3000-btn ${songMode ? 'active' : ''}`}
            onClick={() => setSongMode(p => !p)}
          >SONG</button>
          {/* Export */}
          <button className="spx3000-btn export" onClick={exportSequence} disabled={exporting}>
            {exporting ? '...' : '⬇ WAV'}
          </button>
          {onSendToArrange && (
            <button className="spx3000-btn export" onClick={sendToArrange}>→ ARR</button>
          )}
        </div>
      </div>

      {/* ── VIEW TABS ── */}
      <div className="spx3000-view-tabs">
        {['pads','sequencer','song','mixer'].map(v => (
          <button
            key={v}
            className={`spx3000-view-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >{v.toUpperCase()}</button>
        ))}
        {/* Sequence selector */}
        <div className="spx3000-seq-selector">
          <label>SEQ:</label>
          <select value={curSeqIdx} onChange={e => setCurSeqIdx(+e.target.value)}>
            {sequences.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
          </select>
          <button onClick={addSequence} title="New sequence" disabled={sequences.length >= SPX_MAX_SEQS}>+</button>
          <button onClick={() => copySequence(curSeqIdx, sequences.length < SPX_MAX_SEQS ? sequences.length : sequences.length - 1)} title="Copy sequence">⧉</button>
          <button onClick={() => deleteSequence(curSeqIdx)} title="Delete sequence" disabled={sequences.length <= 1}>✕</button>
          <button onClick={() => clearSequence(curSeqIdx)} title="Clear sequence">CLR</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PADS VIEW
          ══════════════════════════════════════════════════════════════ */}
      {view === 'pads' && (
        <div className="spx3000-pads-view">

          {/* Bank selector */}
          <div className="spx3000-bank-row">
            {SPX_BANKS.map(b => (
              <button
                key={b}
                className={`spx3000-bank-btn ${activeBank === b ? 'active' : ''}`}
                onClick={() => setActiveBank(b)}
              >
                <span className="bank-letter">BANK {b}</span>
                <span className="bank-loaded">
                  {banks[b].filter(p => p.buffer).length}/16
                </span>
              </button>
            ))}
          </div>

          {/* 4×4 Pad Grid — MPC3000 layout */}
          <div className="spx3000-pad-grid">
            {PAD_LAYOUT.map((row, rowIdx) =>
              row.map((padIdx) => {
                const pad = curPads[padIdx];
                const key = `${activeBank}_${padIdx}`;
                const isActive = activePads.has(key);
                const isSelected = selectedPad === padIdx;
                const isDragging = dragPad === padIdx;
                return (
                  <div
                    key={padIdx}
                    className={`spx3000-pad ${pad.buffer ? 'loaded' : 'empty'} ${isActive ? 'hitting' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'drag-over' : ''} ${pad.muted ? 'muted' : ''} ${eraseMode ? 'erase-mode' : ''}`}
                    style={{ '--pad-color': pad.color }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      initCtx();
                      const vel = e.shiftKey ? 64 : e.ctrlKey ? 127 : 100;
                      handlePadHit(padIdx, vel);
                    }}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedPad(padIdx); setPadSettingsOpen(true); }}
                    onDragOver={(e) => onDragOver(e, padIdx)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, padIdx)}
                  >
                    {/* Pad number */}
                    <span className="spx-pad-num">{padIdx + 1}</span>

                    {/* Choke group indicator */}
                    {pad.chokeGroup > 0 && (
                      <span className="spx-pad-choke">{pad.chokeGroup}</span>
                    )}

                    {/* Waveform mini-preview */}
                    {pad.buffer && (
                      <div className="spx-pad-wave">
                        <SpxMiniWave buffer={pad.buffer} color={pad.color} />
                      </div>
                    )}

                    {/* Sample name */}
                    <span className="spx-pad-name">
                      {pad.buffer ? pad.name : '—'}
                    </span>

                    {/* Load button */}
                    <button
                      className="spx-pad-load"
                      onClick={(e) => { e.stopPropagation(); fileSelect(activeBank, padIdx); }}
                      title="Load sample"
                    >📂</button>

                    {/* Level bar */}
                    {isActive && <div className="spx-pad-level" />}
                  </div>
                );
              })
            )}
          </div>

          {/* DAC character controls */}
          <div className="spx3000-character-row">
            <span className="char-label">SPX3000 CHARACTER</span>
            <label className="char-ctrl">
              <input type="checkbox" checked={dacEnabled} onChange={e => { setDacEnabled(e.target.checked); dacCache.current = {}; }} />
              12-bit DAC
            </label>
            <label className="char-ctrl">
              <input type="checkbox" checked={rolloffEnabled} onChange={e => { setRolloffEnabled(e.target.checked); dacCache.current = {}; }} />
              DAC Rolloff
            </label>
            <label className="char-ctrl">
              <input type="checkbox" checked={linnEnabled} onChange={e => setLinnEnabled(e.target.checked)} />
              Linn Interp
            </label>
            <label className="char-ctrl">
              <input type="checkbox" checked={velPitchEnabled} onChange={e => setVelPitchEnabled(e.target.checked)} />
              Vel→Pitch
            </label>
            <div className="char-noise">
              <label>Noise</label>
              <input type="range" min={0} max={300} value={noiseAmt} onChange={e => setNoiseAmt(+e.target.value)} />
              <span>{noiseAmt}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SEQUENCER VIEW — 96 PPQN step grid
          ══════════════════════════════════════════════════════════════ */}
      {view === 'sequencer' && (
        <div className="spx3000-seq-view">

          {/* Seq controls */}
          <div className="spx3000-seq-controls">
            <div className="spx3000-seq-info">
              <input
                className="spx3000-seq-name-input"
                value={curSeq?.name || ''}
                onChange={e => renameSequence(curSeqIdx, e.target.value)}
              />
              <span className="spx3000-seq-detail">
                {curSeq?.bars || 2} bars · {curSeq?.timeNum || 4}/{curSeq?.timeDen || 4} · {bpm} BPM
              </span>
            </div>
            <div className="spx3000-seq-res">
              <label>Resolution</label>
              {['1/8','1/16','1/32'].map(r => (
                <button key={r} className={stepResolution === r ? 'active' : ''} onClick={() => setStepResolution(r)}>{r}</button>
              ))}
            </div>
            <div className="spx3000-grid-mode">
              <button className={seqGridMode === 'steps' ? 'active' : ''} onClick={() => setSeqGridMode('steps')}>Steps</button>
              <button className={seqGridMode === 'piano' ? 'active' : ''} onClick={() => setSeqGridMode('piano')}>Piano Roll</button>
            </div>
          </div>

          {/* Track list + step grid */}
          <div className="spx3000-seq-grid-wrapper">

            {/* Track headers */}
            <div className="spx3000-track-list">
              <div className="spx3000-track-header-cell">TRACK</div>
              {Array.from({ length: Math.min(16, SPX_MAX_TRACKS) }, (_, ti) => {
                const padIdx = ti % SPX_PADS;
                const bank   = curSeq?.trackBanks[ti] || 'A';
                const pad    = banks[bank][padIdx];
                const isSel  = selectedTrack === ti;
                return (
                  <div
                    key={ti}
                    className={`spx3000-track-row-header ${isSel ? 'selected' : ''} ${curSeq?.trackMuted[ti] ? 'muted' : ''}`}
                    onClick={() => setSelectedTrack(ti)}
                  >
                    <span className="trk-num">{ti + 1}</span>
                    <span className="trk-bank" style={{ color: pad?.color || '#888' }}>{bank}{padIdx + 1}</span>
                    <span className="trk-name">{pad?.name || '—'}</span>
                    <button
                      className={`trk-mute ${curSeq?.trackMuted[ti] ? 'on' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSequence(curSeqIdx, {
                          trackMuted: curSeq.trackMuted.map((m, i) => i === ti ? !m : m),
                        });
                      }}
                    >M</button>
                    {/* Bank selector per track */}
                    <select
                      className="trk-bank-sel"
                      value={curSeq?.trackBanks[ti] || 'A'}
                      onChange={e => {
                        e.stopPropagation();
                        updateSequence(curSeqIdx, {
                          trackBanks: curSeq.trackBanks.map((b, i) => i === ti ? e.target.value : b),
                        });
                      }}
                    >
                      {SPX_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Step grid */}
            <div className="spx3000-step-grid-scroll">
              {/* Bar markers */}
              <div className="spx3000-bar-markers">
                {Array.from({ length: curSeq?.bars || 2 }, (_, bar) => (
                  <div
                    key={bar}
                    className="spx3000-bar-marker"
                    style={{ width: `${(ticksPerBar / totalTicks) * 100}%` }}
                  >
                    Bar {bar + 1}
                  </div>
                ))}
              </div>

              {/* Steps per track */}
              {Array.from({ length: Math.min(16, SPX_MAX_TRACKS) }, (_, ti) => {
                const activeSteps = getTrackSteps(ti);
                return (
                  <div key={ti} className={`spx3000-step-row ${selectedTrack === ti ? 'selected' : ''}`}>
                    {Array.from({ length: totalSteps }, (_, si) => {
                      const isFilled   = activeSteps.has(si);
                      const isCurrent  = isPlaying && si === curStepIdx;
                      const isDownbeat = si % (SPX_PPQN / stepTicks) === 0;
                      const isBeat     = si % (stepTicks === SPX_PPQN / 8 ? 4 : stepTicks === SPX_PPQN / 4 ? 2 : 1) === 0;
                      return (
                        <div
                          key={si}
                          className={`spx3000-step ${isFilled ? 'on' : 'off'} ${isCurrent ? 'current' : ''} ${isDownbeat ? 'downbeat' : isBeat ? 'beat' : ''}`}
                          onClick={() => {
                            const tick = si * stepTicks;
                            toggleStep(ti, tick);
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Playhead */}
              {isPlaying && (
                <div
                  className="spx3000-playhead"
                  style={{ left: `${(curStepIdx / totalSteps) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Selected track detail */}
          <div className="spx3000-track-detail">
            <span>Track {selectedTrack + 1} · Bank {curSeq?.trackBanks[selectedTrack] || 'A'} · Pad {(selectedTrack % SPX_PADS) + 1}</span>
            <button onClick={() => {
              // Clear selected track
              updateSequence(curSeqIdx, {
                tracks: curSeq.tracks.map((t, i) => i === selectedTrack ? {} : t),
              });
              setStatusMsg(`Track ${selectedTrack + 1} cleared`);
            }}>Clear Track</button>
            <button onClick={() => {
              // Copy current track to next
              const nextTrack = (selectedTrack + 1) % SPX_MAX_TRACKS;
              updateSequence(curSeqIdx, {
                tracks: curSeq.tracks.map((t, i) => i === nextTrack ? { ...curSeq.tracks[selectedTrack] } : t),
              });
              setStatusMsg(`Track ${selectedTrack + 1} → ${nextTrack + 1}`);
            }}>Copy →</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SONG VIEW — chain sequences with repeat counts
          ══════════════════════════════════════════════════════════════ */}
      {view === 'song' && (
        <div className="spx3000-song-view">
          <div className="spx3000-song-header">
            <h3>SONG MODE</h3>
            <span className="song-info">
              {songBlocks.length} blocks ·{' '}
              {(() => {
                const totalSec = songBlocks.reduce((acc, b) => {
                  const s = sequences[b.seqIdx];
                  if (!s) return acc;
                  const spb = 60.0 / (s.bpm || bpm);
                  return acc + spb * (s.timeNum || 4) * s.bars * b.reps;
                }, 0);
                return `${Math.floor(totalSec / 60)}:${String(Math.round(totalSec % 60)).padStart(2,'0')}`;
              })()}
            </span>
            <button
              className={`spx3000-btn ${songMode ? 'active' : ''}`}
              onClick={() => setSongMode(p => !p)}
            >{songMode ? '● SONG ON' : 'SONG OFF'}</button>
          </div>

          {/* Add sequences */}
          <div className="spx3000-song-add">
            <label>Add sequence:</label>
            {sequences.map((s, i) => (
              <button key={i} className="spx3000-song-add-btn" onClick={() => addSongBlock(i)}>
                + {s.name}
              </button>
            ))}
          </div>

          {/* Song block list */}
          <div className="spx3000-song-blocks">
            {songBlocks.length === 0 ? (
              <div className="spx3000-song-empty">
                Add sequences above to build your song arrangement
              </div>
            ) : (
              songBlocks.map((block, bi) => {
                const seq = sequences[block.seqIdx];
                const isPlaying2 = songMode && isPlaying && songPos === bi;
                return (
                  <div key={bi} className={`spx3000-song-block ${isPlaying2 ? 'playing' : ''}`}>
                    <span className="song-block-num">{bi + 1}</span>
                    <span className="song-block-name">{seq?.name || `Seq ${block.seqIdx + 1}`}</span>
                    <span className="song-block-detail">
                      {seq?.bars || '?'}b · {seq?.bpm || bpm}bpm
                    </span>
                    {/* Repeat count — MPC3000 feature */}
                    <div className="song-block-reps">
                      <label>×</label>
                      <button onClick={() => updateSongBlock(bi, { reps: Math.max(1, block.reps - 1) })}>−</button>
                      <span>{block.reps}</span>
                      <button onClick={() => updateSongBlock(bi, { reps: Math.min(99, block.reps + 1) })}>+</button>
                    </div>
                    <div className="song-block-actions">
                      {bi > 0 && <button onClick={() => moveSongBlock(bi, bi - 1)}>↑</button>}
                      {bi < songBlocks.length - 1 && <button onClick={() => moveSongBlock(bi, bi + 1)}>↓</button>}
                      <button onClick={() => removeSongBlock(bi)}>✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Song actions */}
          <div className="spx3000-song-actions">
            <button
              className="spx3000-btn play"
              onClick={() => { setSongMode(true); startSeq(); }}
              disabled={songBlocks.length === 0}
            >▶ Play Song</button>
            <button onClick={exportSequence} disabled={exporting || songBlocks.length === 0}>
              ⬇ Export Song
            </button>
            <button onClick={() => setSongBlocks([])}>🗑️ Clear Song</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MIXER VIEW — per-pad volume/pan/choke/filter
          ══════════════════════════════════════════════════════════════ */}
      {view === 'mixer' && (
        <div className="spx3000-mixer-view">
          <div className="spx3000-mixer-grid">
            {curPads.map((pad, pi) => (
              <div key={pi} className={`spx3000-mixer-channel ${!pad.buffer ? 'empty' : ''}`}>
                {/* Level meter */}
                <div className="spx3000-mixer-meter">
                  <div
                    className="spx3000-mixer-meter-fill"
                    style={{ height: `${activePads.has(`${activeBank}_${pi}`) ? 80 : 0}%` }}
                  />
                </div>

                {/* Volume fader */}
                <input
                  type="range"
                  className="spx3000-mixer-fader"
                  min={0} max={100}
                  value={pad.volume}
                  onChange={e => updatePad(activeBank, pi, { volume: +e.target.value })}
                  orient="vertical"
                />
                <span className="spx3000-mixer-vol">{pad.volume}</span>

                {/* Pan */}
                <input
                  type="range"
                  className="spx3000-mixer-pan"
                  min={-50} max={50}
                  value={pad.pan || 0}
                  onChange={e => updatePad(activeBank, pi, { pan: +e.target.value })}
                />
                <span className="spx3000-mixer-pan-val">
                  {pad.pan === 0 ? 'C' : pad.pan < 0 ? `L${Math.abs(pad.pan)}` : `R${pad.pan}`}
                </span>

                {/* Choke group */}
                <select
                  className="spx3000-mixer-choke"
                  value={pad.chokeGroup}
                  onChange={e => updatePad(activeBank, pi, { chokeGroup: +e.target.value })}
                  title="Choke group"
                >
                  <option value={0}>—</option>
                  {Array.from({ length: SPX_CHOKE_GROUPS }, (_, i) => (
                    <option key={i + 1} value={i + 1}>CH{i + 1}</option>
                  ))}
                </select>

                {/* Mute */}
                <button
                  className={`spx3000-mixer-mute ${pad.muted ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, pi, { muted: !pad.muted })}
                >M</button>

                {/* Label */}
                <div className="spx3000-mixer-label" style={{ color: pad.color }}>
                  {pi + 1}
                </div>
              </div>
            ))}

            {/* Master channel */}
            <div className="spx3000-mixer-channel master">
              <div className="spx3000-mixer-meter master-meter">
                <div className="spx3000-mixer-meter-fill master" style={{ height: `${masterVol * 100}%` }} />
              </div>
              <input
                type="range"
                className="spx3000-mixer-fader"
                min={0} max={100}
                value={Math.round(masterVol * 100)}
                onChange={e => setMasterVol(+e.target.value / 100)}
                orient="vertical"
              />
              <span className="spx3000-mixer-vol">{Math.round(masterVol * 100)}</span>
              <div className="spx3000-mixer-label master-label">MST</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAD SETTINGS PANEL
          ══════════════════════════════════════════════════════════════ */}
      {padSettingsOpen && selectedPad !== null && (
        <div className="spx3000-pad-settings">
          <div className="spx3000-pad-settings-header">
            <span
              className="spx-settings-color"
              style={{ background: curPads[selectedPad].color }}
            />
            <span>BANK {activeBank} · PAD {selectedPad + 1} — {curPads[selectedPad].name}</span>
            <button className="spx-settings-close" onClick={() => setPadSettingsOpen(false)}>✕</button>
          </div>

          {/* Settings tabs */}
          <div className="spx3000-settings-tabs">
            {['main','envelope','filter','choke','character','copy'].map(t => (
              <button key={t} className={settingsTab === t ? 'active' : ''} onClick={() => setSettingsTab(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="spx3000-pad-actions">
            <button onClick={() => fileSelect(activeBank, selectedPad)}>📂 Load</button>
            <button onClick={() => clearPad(activeBank, selectedPad)}>🗑️ Clear</button>
            <button onClick={() => updatePad(activeBank, selectedPad, { dacOn: !curPads[selectedPad].dacOn })}>
              {curPads[selectedPad].dacOn ? '12-bit ON' : '12-bit OFF'}
            </button>
          </div>

          {/* MAIN TAB */}
          {settingsTab === 'main' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-setting">
                <label>Volume</label>
                <input type="range" min={0} max={100} value={curPads[selectedPad].volume}
                  onChange={e => updatePad(activeBank, selectedPad, { volume: +e.target.value })} />
                <span>{curPads[selectedPad].volume}</span>
              </div>
              <div className="spx3000-setting">
                <label>Tune (cents)</label>
                <input type="range" min={-50} max={50} value={curPads[selectedPad].tune}
                  onChange={e => { updatePad(activeBank, selectedPad, { tune: +e.target.value }); invalidateDacCache(activeBank, selectedPad); }} />
                <span>{curPads[selectedPad].tune > 0 ? '+' : ''}{curPads[selectedPad].tune}¢</span>
              </div>
              <div className="spx3000-setting">
                <label>Semitone</label>
                <input type="range" min={-12} max={12} value={curPads[selectedPad].semitone || 0}
                  onChange={e => { updatePad(activeBank, selectedPad, { semitone: +e.target.value }); invalidateDacCache(activeBank, selectedPad); }} />
                <span>{(curPads[selectedPad].semitone || 0) > 0 ? '+' : ''}{curPads[selectedPad].semitone || 0}st</span>
              </div>
              <div className="spx3000-setting">
                <label>Pan</label>
                <input type="range" min={-50} max={50} value={curPads[selectedPad].pan || 0}
                  onChange={e => updatePad(activeBank, selectedPad, { pan: +e.target.value })} />
                <span>{curPads[selectedPad].pan === 0 ? 'C' : curPads[selectedPad].pan < 0 ? `L${Math.abs(curPads[selectedPad].pan)}` : `R${curPads[selectedPad].pan}`}</span>
              </div>
              <div className="spx3000-setting">
                <label>Loop Mode</label>
                <div className="spx3000-setting-btns">
                  {['off','forward','pingpong'].map(m => (
                    <button key={m} className={curPads[selectedPad].loopMode === m ? 'active' : ''}
                      onClick={() => updatePad(activeBank, selectedPad, { loopMode: m })}>
                      {m === 'off' ? 'Off' : m === 'forward' ? '→ Fwd' : '↔ PP'}
                    </button>
                  ))}
                </div>
              </div>
              {curPads[selectedPad].buffer && <>
                <div className="spx3000-setting">
                  <label>Trim Start</label>
                  <input type="range" min={0} max={Math.round((curPads[selectedPad].buffer?.duration || 1) * 1000)}
                    value={Math.round((curPads[selectedPad].trimStart || 0) * 1000)}
                    onChange={e => updatePad(activeBank, selectedPad, { trimStart: +e.target.value / 1000 })} />
                  <span>{((curPads[selectedPad].trimStart || 0) * 1000).toFixed(0)}ms</span>
                </div>
                <div className="spx3000-setting">
                  <label>Trim End</label>
                  <input type="range" min={0} max={Math.round((curPads[selectedPad].buffer?.duration || 1) * 1000)}
                    value={Math.round((curPads[selectedPad].trimEnd || curPads[selectedPad].buffer?.duration || 0) * 1000)}
                    onChange={e => updatePad(activeBank, selectedPad, { trimEnd: +e.target.value / 1000 })} />
                  <span>{((curPads[selectedPad].trimEnd || curPads[selectedPad].buffer?.duration || 0) * 1000).toFixed(0)}ms</span>
                </div>
                <div className="spx3000-setting">
                  <label>Loop Start</label>
                  <input type="range" min={0} max={Math.round((curPads[selectedPad].buffer?.duration || 1) * 1000)}
                    value={Math.round((curPads[selectedPad].loopStart || 0) * 1000)}
                    onChange={e => updatePad(activeBank, selectedPad, { loopStart: +e.target.value / 1000 })} />
                  <span>{((curPads[selectedPad].loopStart || 0) * 1000).toFixed(0)}ms</span>
                </div>
                <div className="spx3000-setting">
                  <label>Loop End</label>
                  <input type="range" min={0} max={Math.round((curPads[selectedPad].buffer?.duration || 1) * 1000)}
                    value={Math.round((curPads[selectedPad].loopEnd || curPads[selectedPad].buffer?.duration || 0) * 1000)}
                    onChange={e => updatePad(activeBank, selectedPad, { loopEnd: +e.target.value / 1000 })} />
                  <span>{((curPads[selectedPad].loopEnd || curPads[selectedPad].buffer?.duration || 0) * 1000).toFixed(0)}ms</span>
                </div>
              </>}
              <div className="spx3000-setting">
                <label>MIDI Note</label>
                <input type="number" min={0} max={127} value={curPads[selectedPad].midiNote}
                  onChange={e => updatePad(activeBank, selectedPad, { midiNote: +e.target.value })} />
                <span>{NOTE_NAMES[curPads[selectedPad].midiNote % 12]}{Math.floor(curPads[selectedPad].midiNote / 12) - 1}</span>
              </div>
              <div className="spx3000-setting mute-solo">
                <button className={`spx3000-mute-btn ${curPads[selectedPad].muted ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, selectedPad, { muted: !curPads[selectedPad].muted })}>
                  {curPads[selectedPad].muted ? 'MUTED' : 'MUTE'}
                </button>
                <button className={`spx3000-solo-btn ${curPads[selectedPad].soloed ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, selectedPad, { soloed: !curPads[selectedPad].soloed })}>
                  {curPads[selectedPad].soloed ? 'SOLOED' : 'SOLO'}
                </button>
              </div>
            </div>
          )}

          {/* ENVELOPE TAB — MPC3000: Attack + Release only */}
          {settingsTab === 'envelope' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-envelope-note">
                MPC3000 envelope: Attack + Release only. No sustain knob.
              </div>
              <div className="spx3000-setting">
                <label>Attack (ms)</label>
                <input type="range" min={0} max={500} value={curPads[selectedPad].attack || 0}
                  onChange={e => updatePad(activeBank, selectedPad, { attack: +e.target.value })} />
                <span>{curPads[selectedPad].attack || 0}ms</span>
              </div>
              <div className="spx3000-setting">
                <label>Release (ms)</label>
                <input type="range" min={0} max={5000} value={curPads[selectedPad].release || 0}
                  onChange={e => updatePad(activeBank, selectedPad, { release: +e.target.value })} />
                <span>{curPads[selectedPad].release || 0}ms</span>
              </div>
              <div className="spx3000-setting">
                <label>Vel Curve</label>
                <div className="spx3000-setting-btns">
                  {['soft','medium','hard'].map(c => (
                    <button key={c} className={curPads[selectedPad].velocityCurve === c ? 'active' : ''}
                      onClick={() => updatePad(activeBank, selectedPad, { velocityCurve: c })}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="spx3000-setting">
                <label>Vel → Level</label>
                <button className={`toggle-btn ${curPads[selectedPad].velToLevel ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, selectedPad, { velToLevel: !curPads[selectedPad].velToLevel })}>
                  {curPads[selectedPad].velToLevel ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="spx3000-setting">
                <label>Vel → Pitch</label>
                <button className={`toggle-btn ${curPads[selectedPad].velToPitch ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, selectedPad, { velToPitch: !curPads[selectedPad].velToPitch })}>
                  {curPads[selectedPad].velToPitch ? 'ON' : 'OFF'}
                </button>
                <span className="spx3000-hint">±{SPX_VEL_PITCH_AMT}st at extremes</span>
              </div>
            </div>
          )}

          {/* FILTER TAB */}
          {settingsTab === 'filter' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-envelope-note">
                MPC3000 filter: basic lowpass per pad (no resonance control).
              </div>
              <div className="spx3000-setting">
                <label>Filter</label>
                <button className={`toggle-btn ${curPads[selectedPad].filterOn ? 'on' : ''}`}
                  onClick={() => updatePad(activeBank, selectedPad, { filterOn: !curPads[selectedPad].filterOn })}>
                  {curPads[selectedPad].filterOn ? 'ON' : 'OFF'}
                </button>
              </div>
              {curPads[selectedPad].filterOn && (
                <div className="spx3000-setting">
                  <label>Cutoff (Hz)</label>
                  <input type="range" min={200} max={20000} value={curPads[selectedPad].filterFreq}
                    onChange={e => updatePad(activeBank, selectedPad, { filterFreq: +e.target.value })} />
                  <span>{curPads[selectedPad].filterFreq}Hz</span>
                </div>
              )}
            </div>
          )}

          {/* CHOKE TAB */}
          {settingsTab === 'choke' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-envelope-note">
                Choke groups: pads in the same group instantly cut each other (open/closed hi-hat).
              </div>
              <div className="spx3000-setting">
                <label>Choke Group</label>
                <div className="spx3000-setting-btns">
                  <button className={curPads[selectedPad].chokeGroup === 0 ? 'active' : ''}
                    onClick={() => updatePad(activeBank, selectedPad, { chokeGroup: 0 })}>NONE</button>
                  {Array.from({ length: SPX_CHOKE_GROUPS }, (_, i) => (
                    <button key={i + 1}
                      className={curPads[selectedPad].chokeGroup === i + 1 ? 'active' : ''}
                      onClick={() => updatePad(activeBank, selectedPad, { chokeGroup: i + 1 })}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="spx3000-setting">
                <label>Choke Role</label>
                <div className="spx3000-setting-btns">
                  {['both','mute_only','self'].map(r => (
                    <button key={r} className={curPads[selectedPad].chokeRole === r ? 'active' : ''}
                      onClick={() => updatePad(activeBank, selectedPad, { chokeRole: r })}>
                      {r === 'both' ? 'Both' : r === 'mute_only' ? 'Mute Only' : 'Self'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Show other pads in same choke group */}
              {curPads[selectedPad].chokeGroup > 0 && (
                <div className="spx3000-choke-group-members">
                  <label>Group {curPads[selectedPad].chokeGroup} members:</label>
                  <div className="choke-members-list">
                    {curPads.map((p, pi) => p.chokeGroup === curPads[selectedPad].chokeGroup ? (
                      <span key={pi} className="choke-member" style={{ color: p.color }}>
                        Pad {pi + 1}
                      </span>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHARACTER TAB — per-pad DAC settings */}
          {settingsTab === 'character' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-envelope-note">
                Per-pad SPX3000 character override.
              </div>
              <div className="spx3000-setting">
                <label>12-bit DAC</label>
                <button className={`toggle-btn ${curPads[selectedPad].dacOn ? 'on' : ''}`}
                  onClick={() => { updatePad(activeBank, selectedPad, { dacOn: !curPads[selectedPad].dacOn }); invalidateDacCache(activeBank, selectedPad); }}>
                  {curPads[selectedPad].dacOn ? 'ON' : 'OFF'}
                </button>
                <span className="spx3000-hint">Bypass for 24-bit fidelity on this pad</span>
              </div>
            </div>
          )}

          {/* COPY TAB */}
          {settingsTab === 'copy' && (
            <div className="spx3000-settings-body">
              <div className="spx3000-envelope-note">
                Copy this pad's sample to another bank.
              </div>
              <div className="spx3000-copy-grid">
                {SPX_BANKS.filter(b => b !== activeBank).map(destBank => (
                  <button key={destBank} className="spx3000-copy-btn"
                    onClick={() => copyPadToBank(activeBank, selectedPad, destBank)}>
                    Copy → Bank {destBank}
                  </button>
                ))}
              </div>
              {/* Pad rename */}
              <div className="spx3000-setting">
                <label>Name</label>
                <input type="text" maxLength={24}
                  value={curPads[selectedPad].name}
                  onChange={e => updatePad(activeBank, selectedPad, { name: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MINI WAVEFORM — renders a tiny waveform preview in the pad
// =============================================================================
const SpxMiniWave = React.memo(({ buffer, color }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !buffer) return;
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color || '#00ffc8';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      let mn = 1, mx = -1;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] || 0;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      ctx.moveTo(i, ((1 + mn) / 2) * h);
      ctx.lineTo(i, ((1 + mx) / 2) * h);
    }
    ctx.stroke();
  }, [buffer, color]);
  return <canvas ref={canvasRef} width={80} height={24} style={{ display: 'block' }} />;
});

export default SPX3000Tab;