// =============================================================================
// VoiceToMIDI.js v2.1 — Dubler-Style Voice-to-MIDI Controller (Upgraded)
// =============================================================================
// Location: src/front/js/component/VoiceToMIDI.js
//
// UPGRADES / FIXES INCLUDED:
// ✅ Fix C) Polyphonic mode realism:
//    - Replaces "true polyphonic pitch detection from voice" with a *realistic*
//      "Voice → Root Note → Chord Generator" model (Dubler-style chord mode).
//    - Poly mode now uses YIN for a single stable pitch and generates diatonic
//      chords (or selected chord types) from that root.
// ✅ Smoothing + hysteresis for stable note behavior (Dubler “feel”)
// ✅ Key detection histogram decay + silence reset
// ✅ Expression CC math fix (was mixing 0..1 with 0..127)
// ✅ Trigger training status uses fresh sample count
// ✅ Drum channel routing is controllable (default: GM Ch 10 / channel 9)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  YINDetector,
  VibratoAnalyzer,
  SpectralAnalyzer,
  DynamicsAnalyzer,
  SpectralFingerprint,
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  freqToNoteName,
} from "./YINPitchDetector";

// ── Scales ──
const SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  minor_pent: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  harmonic_min: [0, 2, 3, 5, 7, 8, 11],
  melodic_min: [0, 2, 3, 5, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  whole_tone: [0, 2, 4, 6, 8, 10],
};

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// ── Chord types ──
const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
};

// ── Krumhansl-Kessler key profiles ──
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ── Default MIDI CC mappings ──
const DEFAULT_CC_MAP = {
  volume: { cc: 7, label: "Volume", enabled: true, min: 0, max: 127 },
  modWheel: { cc: 1, label: "Mod Wheel", enabled: true, min: 0, max: 127 },
  expression: { cc: 11, label: "Expression", enabled: true, min: 0, max: 127 },
  brightness: { cc: 74, label: "Brightness", enabled: true, min: 0, max: 127 },
  filterCut: { cc: 71, label: "Filter Cutoff", enabled: false, min: 0, max: 127 },
  resonance: { cc: 72, label: "Resonance", enabled: false, min: 0, max: 127 },
  attack: { cc: 73, label: "Attack", enabled: false, min: 0, max: 127 },
  release: { cc: 75, label: "Release", enabled: false, min: 0, max: 127 },
};

// ── Default vowel-to-CC mapping ──
const DEFAULT_VOWEL_CC = {
  a: { cc: 74, value: 100, label: "Bright / Open" },
  e: { cc: 74, value: 80, label: "Mid-Bright" },
  i: { cc: 74, value: 127, label: "Highest" },
  o: { cc: 74, value: 50, label: "Warm" },
  u: { cc: 74, value: 20, label: "Dark / Closed" },
};

// ── Default trigger slots (8) ──
const DEFAULT_TRIGGERS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: ["Kick", "Snare", "Closed HH", "Open HH", "Clap", "Tom High", "Tom Low", "Perc"][i],
  midiNote: [36, 38, 42, 46, 39, 48, 45, 37][i],
  fingerprint: null,
  samples: [],
  threshold: 0.65,
  color: ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#007aff", "#af52de", "#ff2d55", "#5ac8fa"][i],
  trained: false,
}));

// ── MIDI File writer ──
const writeMidiFile = (events, bpm = 120, ppq = 480) => {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const mpqn = Math.round(60000000 / bpm);
  const trackEvents = [];

  trackEvents.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff] });

  const secToTick = (sec) => Math.round((sec / 60) * bpm * ppq);

  for (const evt of sorted) {
    const tick = secToTick(evt.time);
    if (evt.type === "noteOn") {
      trackEvents.push({ tick, bytes: [0x90 | (evt.channel || 0), evt.note & 0x7f, (evt.velocity || 100) & 0x7f] });
    } else if (evt.type === "noteOff") {
      trackEvents.push({ tick, bytes: [0x80 | (evt.channel || 0), evt.note & 0x7f, 0] });
    } else if (evt.type === "cc") {
      trackEvents.push({ tick, bytes: [0xb0 | (evt.channel || 0), evt.cc & 0x7f, evt.value & 0x7f] });
    } else if (evt.type === "pitchBend") {
      const val = Math.max(0, Math.min(16383, evt.value + 8192));
      trackEvents.push({ tick, bytes: [0xe0 | (evt.channel || 0), val & 0x7f, (val >> 7) & 0x7f] });
    }
  }

  const lastTick = trackEvents.reduce((m, e) => Math.max(m, e.tick), 0);
  trackEvents.push({ tick: lastTick + 1, bytes: [0xff, 0x2f, 0x00] });
  trackEvents.sort((a, b) => a.tick - b.tick);

  const trackData = [];
  let prevTick = 0;
  const writeVarLen = (val) => {
    let v = val >>> 0;
    let buf = v & 0x7f;
    while ((v >>= 7)) {
      buf <<= 8;
      buf |= (v & 0x7f) | 0x80;
    }
    while (true) {
      trackData.push(buf & 0xff);
      if (buf & 0x80) buf >>= 8;
      else break;
    }
  };

  for (const e of trackEvents) {
    writeVarLen(Math.max(0, e.tick - prevTick));
    trackData.push(...e.bytes);
    prevTick = e.tick;
  }

  const header = [];
  const ps = (s) => s.split("").forEach((c) => header.push(c.charCodeAt(0)));
  const p16 = (n) => header.push((n >> 8) & 0xff, n & 0xff);
  const p32 = (n) => header.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  ps("MThd");
  p32(6);
  p16(0);
  p16(1);
  p16(ppq);

  const th = [];
  "MTrk".split("").forEach((c) => th.push(c.charCodeAt(0)));
  th.push((trackData.length >> 24) & 0xff, (trackData.length >> 16) & 0xff, (trackData.length >> 8) & 0xff, trackData.length & 0xff);

  return new Uint8Array([...header, ...th, ...trackData]);
};

// ── Quantize MIDI note to scale ──
const quantizeToScale = (midiNote, key, scaleIntervals) => {
  const midiRounded = Math.round(midiNote);
  const noteInOctave = ((midiRounded % 12) - key + 12) % 12;
  const octave = Math.floor(midiRounded / 12);

  let closest = scaleIntervals[0];
  let minDist = 999;
  for (const interval of scaleIntervals) {
    const dist = Math.abs(noteInOctave - interval);
    const distWrap = Math.abs(noteInOctave - interval - 12);
    const d = Math.min(dist, distWrap);
    if (d < minDist) {
      minDist = d;
      closest = interval;
    }
  }

  return octave * 12 + ((key + closest) % 12);
};

// ── Auto key detection ──
const detectKey = (noteHistogram) => {
  let bestKey = 0,
    bestMode = "major",
    bestCorr = -Infinity;

  for (let key = 0; key < 12; key++) {
    for (const [mode, profile] of [
      ["major", KK_MAJOR],
      ["minor", KK_MINOR],
    ]) {
      let corr = 0;
      for (let i = 0; i < 12; i++) corr += noteHistogram[(i + key) % 12] * profile[i];
      if (corr > bestCorr) {
        bestCorr = corr;
        bestKey = key;
        bestMode = mode;
      }
    }
  }
  return { key: bestKey, keyName: KEY_NAMES[bestKey], mode: bestMode, confidence: bestCorr };
};

// ─────────────────────────────────────────────────────────────
// Poly (Realistic) chord generation helpers
// ─────────────────────────────────────────────────────────────

const pc = (midi) => ((midi % 12) + 12) % 12;

const sortUnique = (arr) => [...new Set(arr)].sort((a, b) => a - b);

// Build diatonic triad or 7th chord by stacking scale degrees:
// degree +2 (third), +4 (fifth), (+6 for 7th) within the chosen scale.
const buildDiatonicChord = (rootMidi, key, scaleIntervals, chordSize = 3) => {
  // Create a scale note list across a couple octaves around root to find nearest degree steps.
  // We’ll work in pitch classes, then lift to MIDI near root.
  const rootPc = pc(rootMidi);
  // Convert scale intervals to pitch classes in this key
  const scalePcs = scaleIntervals.map((i) => (key + i) % 12);

  // Find root degree index in scale (closest match)
  let bestIdx = 0;
  let bestDist = 999;
  for (let i = 0; i < scalePcs.length; i++) {
    const d = Math.min(Math.abs(rootPc - scalePcs[i]), Math.abs(rootPc - scalePcs[i] - 12), Math.abs(rootPc - scalePcs[i] + 12));
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  // Degree stacking (0, +2, +4, (+6))
  const degreeSteps = chordSize === 4 ? [0, 2, 4, 6] : [0, 2, 4];
  const chordPcs = degreeSteps.map((s) => scalePcs[(bestIdx + s) % scalePcs.length]);

  // Now map chord PCs to MIDI notes close to root.
  const baseOct = Math.floor(rootMidi / 12) * 12;
  const candidates = chordPcs.map((p) => {
    // Choose the closest MIDI note of pitch class p to rootMidi.
    const options = [baseOct + p, baseOct + p + 12, baseOct + p - 12];
    options.sort((a, b) => Math.abs(a - rootMidi) - Math.abs(b - rootMidi));
    return options[0];
  });

  // Ensure ascending voicing (basic “closed” voicing)
  const voiced = [];
  for (const n of candidates) {
    if (voiced.length === 0) voiced.push(n);
    else {
      let nn = n;
      while (nn <= voiced[voiced.length - 1]) nn += 12;
      voiced.push(nn);
    }
  }

  return sortUnique(voiced);
};

// Build “fixed chord type” (major/minor/maj7/etc) from root
const buildFixedChord = (rootMidi, chordType = "major") => {
  const ints = CHORD_INTERVALS[chordType] || CHORD_INTERVALS.major;
  return sortUnique(ints.map((i) => rootMidi + i));
};

// =============================================================================
// COMPONENT
// =============================================================================

const VoiceToMIDI = ({
  audioContext: externalCtx,
  bpm = 120,
  musicalKey = "C",
  scale = "major",
  isEmbedded = false,
  onNoteOn,
  onNoteOff,
  onNotesGenerated,
  onMidiCC,
  onPitchBend,
}) => {
  // ── State ──
  const [mode, setMode] = useState("pitch"); // pitch | trigger | poly
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [currentKey, setCurrentKey] = useState(KEY_NAMES.indexOf(musicalKey) >= 0 ? KEY_NAMES.indexOf(musicalKey) : 0);
  const [currentScale, setCurrentScale] = useState(scale);

  const [octaveOffset, setOctaveOffset] = useState(0);
  const [midiChannel, setMidiChannel] = useState(0);

  const [velocitySensitivity, setVelocitySensitivity] = useState(0.8);

  const [pitchBendEnabled, setPitchBendEnabled] = useState(true);
  const [vibratoToPitchBend, setVibratoToPitchBend] = useState(true);

  const [chordMode, setChordMode] = useState("off"); // off | major | minor | auto | maj7 | min7 | dom7 ...
  const [ccMappings, setCcMappings] = useState(DEFAULT_CC_MAP);

  const [vowelCcEnabled, setVowelCcEnabled] = useState(false);
  const [vowelMappings, setVowelMappings] = useState(DEFAULT_VOWEL_CC);

  const [triggers, setTriggers] = useState(DEFAULT_TRIGGERS);
  const [trainingSlot, setTrainingSlot] = useState(null);

  const [autoKeyDetect, setAutoKeyDetect] = useState(true);
  const [detectedKey, setDetectedKey] = useState(null);

  const [latencyMode, setLatencyMode] = useState("low"); // low | balanced | quality

  // ── “Dubler Feel” additions ──
  const [noteStabilityMs, setNoteStabilityMs] = useState(60); // require stable pitch this long before changing note
  const [noteOnConf, setNoteOnConf] = useState(0.6);
  const [noteOffConf, setNoteOffConf] = useState(0.45);
  const [minRmsGate, setMinRmsGate] = useState(0.008);

  // ── Poly (realistic) behavior ──
  const [polyChordStyle, setPolyChordStyle] = useState("diatonicTriad"); // diatonicTriad | diatonic7 | fixed
  const [polyFixedType, setPolyFixedType] = useState("maj7"); // used if style=fixed

  // Trigger drum routing
  const [useGMDrumChannel, setUseGMDrumChannel] = useState(true); // if true → channel 10 (9) for triggers

  // ── Display state ──
  const [currentNote, setCurrentNote] = useState(null);
  const [currentFreq, setCurrentFreq] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [spectralBrightness, setSpectralBrightness] = useState(0);
  const [vibratoInfo, setVibratoInfo] = useState(null);
  const [formantInfo, setFormantInfo] = useState(null);

  // In “poly” mode, we display generated chord notes here
  const [polyNotes, setPolyNotes] = useState([]);

  const [triggerHits, setTriggerHits] = useState(Array(8).fill(0));
  const [lastCC, setLastCC] = useState({});
  const [recordedEvents, setRecordedEvents] = useState([]);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [noteHistogram, setNoteHistogram] = useState(new Float32Array(12));
  const [status, setStatus] = useState("Ready — click Start to begin");

  // ── Web MIDI ──
  const [midiOutputs, setMidiOutputs] = useState([]);
  const [selectedMidiOutput, setSelectedMidiOutput] = useState(null);
  const [webMidiEnabled, setWebMidiEnabled] = useState(false);

  // ── Refs ──
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserFreqRef = useRef(null);
  const animRef = useRef(null);

  const yinRef = useRef(null);
  const vibratoRef = useRef(null);
  const spectralRef = useRef(null);
  const dynamicsRef = useRef(null);
  const fingerprintRef = useRef(null);

  const activeNotesRef = useRef(new Set());
  const recordStartRef = useRef(0);
  const recordedRef = useRef([]);
  const histogramRef = useRef(new Float32Array(12));
  const lastCCRef = useRef({});
  const midiOutputRef = useRef(null);

  // Note stability refs
  const lastCandidateNoteRef = useRef(null);
  const candidateSinceRef = useRef(0);
  const lastStableNoteRef = useRef(null);
  const lastAudioActiveAtRef = useRef(0);

  // ── Buffer sizes by latency mode ──
  const BUFFER_SIZES = { low: 1024, balanced: 2048, quality: 4096 };
  const FFT_SIZES = { low: 2048, balanced: 4096, quality: 8192 };

  // ── Initialize Web MIDI ──
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        const outputs = [];
        access.outputs.forEach((output) => outputs.push({ id: output.id, name: output.name, port: output }));
        setMidiOutputs(outputs);
        if (outputs.length > 0) setWebMidiEnabled(true);

        access.onstatechange = () => {
          const updated = [];
          access.outputs.forEach((output) => updated.push({ id: output.id, name: output.name, port: output }));
          setMidiOutputs(updated);
        };
      })
      .catch(() => setWebMidiEnabled(false));
  }, []);

  // ── Send MIDI to external output ──
  const sendWebMidi = useCallback((bytes) => {
    if (!midiOutputRef.current) return;
    try {
      midiOutputRef.current.send(bytes);
    } catch {
      // ignore
    }
  }, []);

  // ── Note On ──
  const fireNoteOn = useCallback(
    (note, velocity = 100, channel = 0) => {
      const n = Math.max(0, Math.min(127, Math.round(note)));
      const v = Math.max(1, Math.min(127, Math.round(velocity)));
      const ch = channel & 0xf;

      activeNotesRef.current.add(n);
      setActiveNotes(new Set(activeNotesRef.current));

      if (onNoteOn) onNoteOn({ note: n, velocity: v, channel: ch, noteName: midiToNoteName(n) });
      sendWebMidi([0x90 | ch, n, v]);

      if (isRecording) {
        const time = (performance.now() - recordStartRef.current) / 1000;
        recordedRef.current.push({ type: "noteOn", note: n, velocity: v, channel: ch, time });
      }
    },
    [onNoteOn, sendWebMidi, isRecording]
  );

  // ── Note Off ──
  const fireNoteOff = useCallback(
    (note, channel = 0) => {
      const n = Math.max(0, Math.min(127, Math.round(note)));
      const ch = channel & 0xf;

      activeNotesRef.current.delete(n);
      setActiveNotes(new Set(activeNotesRef.current));

      if (onNoteOff) onNoteOff({ note: n, channel: ch, noteName: midiToNoteName(n) });
      sendWebMidi([0x80 | ch, n, 0]);

      if (isRecording) {
        const time = (performance.now() - recordStartRef.current) / 1000;
        recordedRef.current.push({ type: "noteOff", note: n, channel: ch, time });
      }
    },
    [onNoteOff, sendWebMidi, isRecording]
  );

  // ── MIDI CC ──
  const fireMidiCC = useCallback(
    (cc, value, channel = 0) => {
      const ccNum = cc & 0x7f;
      const val = Math.max(0, Math.min(127, Math.round(value)));
      const ch = channel & 0xf;

      const k = `${ch}-${ccNum}`;
      if (lastCCRef.current[k] === val) return;

      lastCCRef.current[k] = val;
      setLastCC({ ...lastCCRef.current });

      if (onMidiCC) onMidiCC({ cc: ccNum, value: val, channel: ch });
      sendWebMidi([0xb0 | ch, ccNum, val]);

      if (isRecording) {
        const time = (performance.now() - recordStartRef.current) / 1000;
        recordedRef.current.push({ type: "cc", cc: ccNum, value: val, channel: ch, time });
      }
    },
    [onMidiCC, sendWebMidi, isRecording]
  );

  // ── Pitch Bend ──
  const firePitchBend = useCallback(
    (value, channel = 0) => {
      const val = Math.max(-8192, Math.min(8191, Math.round(value)));
      const ch = channel & 0xf;
      const mapped = val + 8192;

      if (onPitchBend) onPitchBend({ value: val, channel: ch });
      sendWebMidi([0xe0 | ch, mapped & 0x7f, (mapped >> 7) & 0x7f]);

      if (isRecording) {
        const time = (performance.now() - recordStartRef.current) / 1000;
        recordedRef.current.push({ type: "pitchBend", value: val, channel: ch, time });
      }
    },
    [onPitchBend, sendWebMidi, isRecording]
  );

  // ── All Notes Off ──
  const allNotesOff = useCallback(() => {
    for (const n of activeNotesRef.current) {
      if (onNoteOff) onNoteOff({ note: n, channel: midiChannel, noteName: midiToNoteName(n) });
      sendWebMidi([0x80 | midiChannel, n, 0]);
    }
    activeNotesRef.current.clear();
    setActiveNotes(new Set());
  }, [onNoteOff, sendWebMidi, midiChannel]);

  // ── Start listening ──
  const startListening = useCallback(async () => {
    try {
      const bufSize = BUFFER_SIZES[latencyMode];
      const fftSize = FFT_SIZES[latencyMode];

      const ctx =
        externalCtx ||
        new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: latencyMode === "low" ? "interactive" : "balanced",
          sampleRate: 48000,
        });

      if (ctx.state === "suspended") await ctx.resume();
      audioCtxRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 },
      });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = bufSize;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;

      const analyserFreq = ctx.createAnalyser();
      analyserFreq.fftSize = fftSize;
      analyserFreq.smoothingTimeConstant = 0.3;
      analyserFreqRef.current = analyserFreq;

      source.connect(analyser);
      source.connect(analyserFreq);

      yinRef.current = new YINDetector(ctx.sampleRate, bufSize);
      vibratoRef.current = new VibratoAnalyzer();
      spectralRef.current = new SpectralAnalyzer(ctx.sampleRate, fftSize);
      dynamicsRef.current = new DynamicsAnalyzer();
      fingerprintRef.current = new SpectralFingerprint();

      // Reset feel-state
      lastCandidateNoteRef.current = null;
      candidateSinceRef.current = performance.now();
      lastStableNoteRef.current = null;
      lastAudioActiveAtRef.current = performance.now();

      // Reset key detection histogram
      histogramRef.current = new Float32Array(12);
      setNoteHistogram(new Float32Array(12));
      setDetectedKey(null);

      setIsListening(true);
      setStatus("Listening...");
      processLoop();
    } catch (e) {
      setStatus(`✗ Mic error: ${e?.message || "Unknown error"}`);
    }
  }, [externalCtx, latencyMode]);

  // ── Stop listening ──
  const stopListening = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    allNotesOff();
    setIsListening(false);
    setStatus("Stopped");

    setCurrentNote(null);
    setCurrentFreq(0);
    setConfidence(0);
    setRmsLevel(0);
    setPolyNotes([]);
  }, [allNotesOff]);

  // ─────────────────────────────────────────────────────────────
  // Stability / hysteresis: accept a new note only if it remains
  // the candidate for noteStabilityMs and confidence is high enough.
  // ─────────────────────────────────────────────────────────────
  const maybeStabilizeNote = useCallback(
    (candidateMidi, conf) => {
      const now = performance.now();

      // If confidence too low, don't change anything; let silence logic release notes.
      if (conf < noteOnConf) return null;

      // Start candidate timer if changed
      if (lastCandidateNoteRef.current === null || lastCandidateNoteRef.current !== candidateMidi) {
        lastCandidateNoteRef.current = candidateMidi;
        candidateSinceRef.current = now;
        return null;
      }

      // Candidate is same—has it been stable long enough?
      if (now - candidateSinceRef.current >= noteStabilityMs) {
        // If stable differs from last stable, accept change
        if (lastStableNoteRef.current !== candidateMidi) {
          lastStableNoteRef.current = candidateMidi;
          return candidateMidi;
        }
      }

      return null;
    },
    [noteStabilityMs, noteOnConf]
  );

  // ── Main processing loop ──
  const processLoop = useCallback(() => {
    const analyze = () => {
      if (!analyserRef.current || !analyserFreqRef.current || !audioCtxRef.current) return;

      const analyser = analyserRef.current;
      const analyserFreq = analyserFreqRef.current;
      const bufSize = analyser.fftSize;
      const freqBins = analyserFreq.frequencyBinCount;

      // Time-domain
      const timeBuf = new Float32Array(bufSize);
      analyser.getFloatTimeDomainData(timeBuf);

      // Freq-domain
      const freqData = new Float32Array(freqBins);
      analyserFreq.getFloatFrequencyData(freqData);
      const magnitudes = new Float32Array(freqBins);
      for (let i = 0; i < freqBins; i++) magnitudes[i] = Math.pow(10, freqData[i] / 20);

      // Dynamics
      const dynamics = dynamicsRef.current.track(timeBuf);
      setRmsLevel(dynamics.rms);

      // Key histogram decay (keeps key detection “fresh”)
      for (let i = 0; i < 12; i++) histogramRef.current[i] *= 0.995;

      // If quiet: release and maybe reset histogram if long silence
      const now = performance.now();
      if (dynamics.rms >= minRmsGate) lastAudioActiveAtRef.current = now;

      if (dynamics.rms < minRmsGate) {
        setConfidence(0);

        // If confidence previously low and notes active → release
        if (activeNotesRef.current.size > 0 && mode !== "trigger") {
          allNotesOff();
          setCurrentNote(null);
          setPolyNotes([]);
          firePitchBend(0, midiChannel);
        }

        // If silent for a while, gently reset histogram (prevents old key lock)
        if (now - lastAudioActiveAtRef.current > 2500) {
          histogramRef.current = new Float32Array(12);
          setNoteHistogram(new Float32Array(12));
          setDetectedKey(null);
        }

        animRef.current = requestAnimationFrame(analyze);
        return;
      }

      // Send Volume CC (0..127)
      if (ccMappings.volume.enabled) {
        const volCC = Math.round(dynamics.dynamics * velocitySensitivity * 127);
        fireMidiCC(ccMappings.volume.cc, volCC, midiChannel);
      }

      // Spectral brightness
      const brightness = spectralRef.current.centroid(magnitudes);
      setSpectralBrightness(brightness);

      if (ccMappings.brightness.enabled) {
        const bCC = Math.round(Math.min(1, brightness / 4000) * 127);
        fireMidiCC(ccMappings.brightness.cc, bCC, midiChannel);
      }

      // ✅ FIX: Expression CC math (normalize then scale)
      if (ccMappings.expression.enabled) {
        const vNorm = Math.min(1, Math.max(0, dynamics.dynamics * velocitySensitivity));
        const bNorm = Math.min(1, Math.max(0, brightness / 4000));
        const expr = Math.round((vNorm * 0.7 + bNorm * 0.3) * 127);
        fireMidiCC(ccMappings.expression.cc, expr, midiChannel);
      }

      // Formant/Vowel
      if (vowelCcEnabled && dynamics.rms > minRmsGate) {
        const formants = spectralRef.current.detectFormants(magnitudes);
        setFormantInfo(formants);
        if (formants?.vowel && vowelMappings[formants.vowel]) {
          const mapping = vowelMappings[formants.vowel];
          fireMidiCC(mapping.cc, mapping.value, midiChannel);
        }
      }

      // ── PITCH DETECTION (shared by pitch + poly)
      const yin = yinRef.current.detect(timeBuf);
      const conf = yin?.confidence || 0;
      setConfidence(conf);

      if (yin && conf >= noteOffConf) {
        setCurrentFreq(yin.freq);

        // Vibrato analysis
        vibratoRef.current.push(yin.freq, now / 1000);
        const vib = vibratoRef.current.analyze();
        setVibratoInfo(vib);

        // Pitch bend
        if (vibratoToPitchBend && vib?.detected) {
          firePitchBend(vib.pitchBend, midiChannel);
          if (ccMappings.modWheel.enabled) fireMidiCC(ccMappings.modWheel.cc, Math.min(127, Math.round(vib.depthCents * 2)), midiChannel);
        } else if (pitchBendEnabled) {
          const cents = yin.cents || 0;
          const bend = Math.round((cents / 200) * 8192);
          firePitchBend(bend, midiChannel);
        }

        // Quantize
        const rawMidi = (yin.midi || freqToMidi(yin.freq)) + octaveOffset * 12;
        const scaleIntervals = SCALES[currentScale] || SCALES.chromatic;
        const quantized = currentScale === "chromatic" ? Math.round(rawMidi) : quantizeToScale(rawMidi, currentKey, scaleIntervals);

        // Update histogram
        histogramRef.current[quantized % 12] += conf;
        setNoteHistogram(new Float32Array(histogramRef.current));

        // Auto key detection
        if (autoKeyDetect) {
          const total = histogramRef.current.reduce((a, b) => a + b, 0);
          if (total > 20) setDetectedKey(detectKey(histogramRef.current));
        }

        // Velocity
        const vel = Math.round(Math.min(127, Math.max(1, dynamics.dynamics * velocitySensitivity * 127)));

        // ── MODE: PITCH ──
        if (mode === "pitch") {
          const stable = maybeStabilizeNote(quantized, conf);
          if (stable !== null) {
            allNotesOff();

            if (chordMode !== "off") {
              const chordType =
                chordMode === "auto"
                  ? // minor-ish if scale contains minor third (rough heuristic)
                    (scaleIntervals.includes(3) ? "minor" : "major")
                  : chordMode;

              const notes = buildFixedChord(stable, chordType);
              for (const n of notes) fireNoteOn(n, vel, midiChannel);

              setCurrentNote({
                midi: stable,
                noteName: `${midiToNoteName(stable)} (${chordType})`,
                velocity: vel,
              });
            } else {
              fireNoteOn(stable, vel, midiChannel);
              setCurrentNote({ midi: stable, noteName: midiToNoteName(stable), velocity: vel });
            }
          }
        }

        // ── MODE: POLY (Realistic) ──
        else if (mode === "poly") {
          // In reality, voice is monophonic. So we treat the detected pitch as a root,
          // then generate a chord from it (diatonic stacking or fixed type).
          const stable = maybeStabilizeNote(quantized, conf);
          if (stable !== null) {
            allNotesOff();

            let chordNotes = [];
            if (polyChordStyle === "diatonicTriad") {
              chordNotes = buildDiatonicChord(stable, currentKey, scaleIntervals, 3);
            } else if (polyChordStyle === "diatonic7") {
              chordNotes = buildDiatonicChord(stable, currentKey, scaleIntervals, 4);
            } else {
              chordNotes = buildFixedChord(stable, polyFixedType);
            }

            // Optional: tighten to MIDI range
            chordNotes = chordNotes.map((n) => Math.max(0, Math.min(127, n)));

            for (const n of chordNotes) fireNoteOn(n, vel, midiChannel);

            setPolyNotes(
              chordNotes.map((n) => ({
                midi: n,
                noteName: midiToNoteName(n),
                freq: midiToFreq(n),
                amplitude: 1,
              }))
            );

            setCurrentNote({
              midi: stable,
              noteName: `Chord: ${chordNotes.map((n) => midiToNoteName(n)).join(" + ")}`,
              velocity: vel,
            });
          }
        }
      } else {
        // Confidence too low: release notes (hysteresis)
        if (activeNotesRef.current.size > 0 && conf < noteOffConf && mode !== "trigger") {
          allNotesOff();
          setCurrentNote(null);
          setPolyNotes([]);
          firePitchBend(0, midiChannel);
          lastCandidateNoteRef.current = null;
          lastStableNoteRef.current = null;
        }
      }

      // ── MODE: TRIGGER ──
      if (mode === "trigger") {
        if (dynamics.onset) {
          const fp = fingerprintRef.current.create(magnitudes, audioCtxRef.current.sampleRate);

          if (trainingSlot !== null) {
            // Training mode: capture fingerprint
            setTriggers((prev) =>
              prev.map((t, i) => {
                if (i !== trainingSlot) return t;
                const newSamples = [...t.samples, fp].slice(-5);

                // Average fingerprint
                const avgFp = new Float32Array(fp.length);
                for (const s of newSamples) for (let j = 0; j < avgFp.length; j++) avgFp[j] += s[j];
                for (let j = 0; j < avgFp.length; j++) avgFp[j] /= newSamples.length;

                // ✅ status should use newSamples length (not stale triggers state)
                setStatus(`Training "${t.name}" — ${newSamples.length}/5 samples`);

                return { ...t, fingerprint: avgFp, samples: newSamples, trained: true };
              })
            );
          } else {
            // Match
            let bestMatch = -1;
            let bestScore = 0;

            for (let i = 0; i < triggers.length; i++) {
              if (!triggers[i].trained || !triggers[i].fingerprint) continue;
              const score = fingerprintRef.current.compare(fp, triggers[i].fingerprint);
              if (score > triggers[i].threshold && score > bestScore) {
                bestScore = score;
                bestMatch = i;
              }
            }

            if (bestMatch >= 0) {
              const trig = triggers[bestMatch];
              const vel = Math.round(Math.min(127, Math.max(1, dynamics.rms * velocitySensitivity * 400)));

              // ✅ Realistic: triggers typically go to GM Drum Channel 10 (index 9) OR user-selected channel
              const drumCh = useGMDrumChannel ? 9 : midiChannel;
              fireNoteOn(trig.midiNote, vel, drumCh);

              setTimeout(() => fireNoteOff(trig.midiNote, drumCh), 100);

              setTriggerHits((prev) => {
                const copy = [...prev];
                copy[bestMatch] = 1;
                return copy;
              });
              setTimeout(() => {
                setTriggerHits((prev) => {
                  const copy = [...prev];
                  copy[bestMatch] = 0;
                  return copy;
                });
              }, 150);

              setStatus(`${trig.name} (${Math.round(bestScore * 100)}%)`);
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(analyze);
    };

    animRef.current = requestAnimationFrame(analyze);
  }, [
    mode,
    currentKey,
    currentScale,
    octaveOffset,
    midiChannel,
    velocitySensitivity,
    pitchBendEnabled,
    vibratoToPitchBend,
    chordMode,
    ccMappings,
    vowelCcEnabled,
    vowelMappings,
    triggers,
    trainingSlot,
    autoKeyDetect,
    latencyMode,
    noteStabilityMs,
    noteOnConf,
    noteOffConf,
    minRmsGate,
    polyChordStyle,
    polyFixedType,
    useGMDrumChannel,
    fireNoteOn,
    fireNoteOff,
    fireMidiCC,
    firePitchBend,
    allNotesOff,
    maybeStabilizeNote,
  ]);

  // Restart loop when settings change
  useEffect(() => {
    if (isListening && animRef.current) {
      cancelAnimationFrame(animRef.current);
      processLoop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    currentKey,
    currentScale,
    octaveOffset,
    chordMode,
    ccMappings,
    vowelCcEnabled,
    triggers,
    trainingSlot,
    isListening,
    noteStabilityMs,
    noteOnConf,
    noteOffConf,
    minRmsGate,
    polyChordStyle,
    polyFixedType,
    useGMDrumChannel,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      allNotesOff();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recording controls ──
  const startRecording = () => {
    recordedRef.current = [];
    recordStartRef.current = performance.now();
    setIsRecording(true);
    setRecordedEvents([]);
    setStatus("● Recording MIDI...");
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordedEvents([...recordedRef.current]);
    setStatus(`✓ Recorded ${recordedRef.current.length} events`);

    if (onNotesGenerated && recordedRef.current.length > 0) {
      const notes = [];
      const noteStarts = {};
      for (const evt of recordedRef.current) {
        if (evt.type === "noteOn") {
          noteStarts[`${evt.channel}-${evt.note}`] = evt;
        } else if (evt.type === "noteOff") {
          const k = `${evt.channel}-${evt.note}`;
          if (noteStarts[k]) {
            const start = noteStarts[k];
            notes.push({
              id: `vmidi_${Date.now()}_${evt.note}_${Math.random().toString(36).slice(2, 6)}`,
              note: evt.note,
              velocity: start.velocity / 127,
              startBeat: (start.time / 60) * bpm,
              duration: Math.max(0.125, ((evt.time - start.time) / 60) * bpm),
              channel: evt.channel || 0,
            });
            delete noteStarts[k];
          }
        }
      }
      if (notes.length > 0) onNotesGenerated(notes);
    }
  };

  const exportMidi = () => {
    if (recordedRef.current.length === 0) {
      setStatus("⚠ Nothing to export");
      return;
    }
    const bytes = writeMidiFile(recordedRef.current, bpm);
    const blob = new Blob([bytes], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice_midi_${Date.now()}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✓ MIDI exported");
  };

  // ── Select Web MIDI output ──
  const selectMidiOutput = (id) => {
    const out = midiOutputs.find((o) => o.id === id);
    midiOutputRef.current = out?.port || null;
    setSelectedMidiOutput(id);
    setStatus(out ? `MIDI output: ${out.name}` : "MIDI output: None");
  };

  // ── Toggle CC mapping ──
  const toggleCC = (key) => {
    setCcMappings((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const updateCCNumber = (key, cc) => {
    setCcMappings((prev) => ({ ...prev, [key]: { ...prev[key], cc: parseInt(cc, 10) || 0 } }));
  };

  // ── Trigger training ──
  const startTraining = (slotIndex) => {
    setTrainingSlot(slotIndex);
    setStatus(`Training: Make the "${triggers[slotIndex].name}" sound 3-5 times`);
  };

  const stopTraining = () => {
    setTrainingSlot(null);
    setStatus("Training complete");
  };

  const clearTrigger = (idx) => {
    setTriggers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, fingerprint: null, samples: [], trained: false } : t))
    );
  };

  const updateTrigger = (idx, updates) => {
    setTriggers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...updates } : t)));
  };

  // ── Meter component ──
  const Meter = ({ value, color = "#00ffc8", label, max = 1, height = 80 }) => (
    <div className="vtm-meter">
      <div className="vtm-meter-bar">
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            borderRadius: 4,
            height: `${Math.min(100, (value / max) * 100)}%`,
            background: `linear-gradient(to top, ${color}, ${color}88)`,
            transition: "height 0.06s linear",
          }}
        />
      </div>
      {label && <span className="vtm-meter-label">{label}</span>}
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="vtm-root"
    >
      {/* ══════ HEADER ══════ */}
      <div className="vtm-header"
      >
        <div className="vtm-header-left">
          <span className="vtm-title">🎤 Voice → MIDI</span>
          <span className="vtm-subtitle">v2.1 — Dubler-Style (Realistic Poly)</span>
        </div>
        <div className="vtm-header-right">
          <button
            onClick={isListening ? stopListening : startListening}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: isListening ? "#ff3b30" : "#00ffc8",
              color: isListening ? "#fff" : "#000",
              fontWeight: 700,
              fontSize: "0.75rem",
            }}
          >
            {isListening ? "■ Stop" : "▶ Start"}
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isListening}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: isRecording ? "#ff3b30" : "#21262d",
              color: isRecording ? "#fff" : "#c9d1d9",
              fontWeight: 600,
              fontSize: "0.75rem",
              opacity: isListening ? 1 : 0.4,
            }}
          >
            {isRecording ? "● REC" : "⏺ Record"}
          </button>

          <button
            onClick={exportMidi}
            disabled={recordedEvents.length === 0}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #30363d",
              cursor: "pointer",
              background: "transparent",
              color: "#c9d1d9",
              fontSize: "0.7rem",
              opacity: recordedEvents.length > 0 ? 1 : 0.4,
            }}
          >
            Export .mid
          </button>
        </div>
      </div>

      {/* ══════ MODE TABS ══════ */}
      <div className="vtm-tabs">
        {[
          { id: "pitch", label: "🎵 Pitch", desc: "Sing → Notes" },
          { id: "poly", label: "🎹 Poly", desc: "Sing → Chords (Realistic)" },
          { id: "trigger", label: "🥁 Trigger", desc: "Beatbox → Drums" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              allNotesOff();
              setPolyNotes([]);
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: mode === m.id ? "#00ffc8" : "#30363d",
              background: mode === m.id ? "#00ffc820" : "transparent",
              color: mode === m.id ? "#00ffc8" : "#8b949e",
              cursor: "pointer",
              fontSize: "0.7rem",
              fontWeight: mode === m.id ? 700 : 400,
            }}
          >
            {m.label}
          </button>
        ))}
        <span className="vtm-status">{status}</span>
      </div>

      {/* ══════ MAIN AREA ══════ */}
      <div className="vtm-body">
        {/* ── LEFT: Live Display ── */}
        <div className="vtm-main">
          {/* Current Note Display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 12,
              background: "#21262d",
              borderRadius: 8,
              border: "1px solid #30363d",
            }}
          >
            <div className="vtm-pitch-center">
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: currentNote ? "#00ffc8" : "#30363d",
                }}
              >
                {currentNote ? currentNote.noteName : "---"}
              </div>
              <div className="vtm-freq-label">{currentFreq > 0 ? `${currentFreq.toFixed(1)} Hz` : "No pitch"}</div>
            </div>

            {/* Meters */}
            <div className="vtm-meter-row">
              <Meter value={rmsLevel} max={0.3} color="#00ffc8" label="Vol" />
              <Meter value={confidence} max={1} color="#007aff" label="Conf" />
              <Meter value={spectralBrightness} max={5000} color="#ff9500" label="Bright" />
            </div>

            {/* Vibrato indicator */}
            {vibratoInfo?.detected && (
              <div className="vtm-chord-badge">
                Vibrato: {vibratoInfo.rate}Hz ±{vibratoInfo.depthCents}¢
              </div>
            )}

            {/* Formant/Vowel */}
            {formantInfo?.vowel && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ff950030",
                  border: "1px solid #ff9500",
                  fontSize: "1rem",
                  fontWeight: 800,
                }}
              >
                {formantInfo.vowel.toUpperCase()}
              </div>
            )}

            {/* Active notes */}
            <div className="vtm-knob-row">
              {[...activeNotes].map((n) => (
                <span
                  key={n}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#00ffc830",
                    border: "1px solid #00ffc8",
                    fontSize: "0.6rem",
                    fontFamily: "monospace",
                  }}
                >
                  {midiToNoteName(n)}
                </span>
              ))}
            </div>
          </div>

          {/* Poly chord display */}
          {mode === "poly" && polyNotes.length > 0 && (
            <div className="vtm-pad-grid">
              {polyNotes.map((p, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "#007aff20",
                    border: "1px solid #007aff",
                    textAlign: "center",
                  }}
                >
                  <div className="vtm-pad-note">{p.noteName}</div>
                  <div className="vtm-meter-label">{p.freq.toFixed(0)}Hz</div>
                </div>
              ))}
            </div>
          )}

          {/* Trigger pads */}
          {mode === "trigger" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {triggers.map((trig, i) => (
                <div
                  key={i}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    textAlign: "center",
                    cursor: "pointer",
                    background: triggerHits[i] ? `${trig.color}40` : "#21262d",
                    border: `2px solid ${trainingSlot === i ? "#ff9500" : trig.trained ? trig.color : "#30363d"}`,
                    transition: "all 0.08s ease",
                    transform: triggerHits[i] ? "scale(0.95)" : "scale(1)",
                  }}
                  onClick={() => (trainingSlot === i ? stopTraining() : startTraining(i))}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: trig.trained ? trig.color : "#5a7088" }}>{trig.name}</div>
                  <div style={{ fontSize: "0.55rem", color: "#5a7088", marginTop: 2 }}>
                    Note: {trig.midiNote} {trig.trained ? `(${trig.samples.length} samples)` : "(untrained)"}
                  </div>

                  {trainingSlot === i && <div style={{ fontSize: "0.55rem", color: "#ff9500", marginTop: 4 }}>● Listening...</div>}

                  {trig.trained && trainingSlot !== i && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearTrigger(i);
                      }}
                      style={{
                        marginTop: 4,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "#ff3b3020",
                        border: "1px solid #ff3b30",
                        color: "#ff3b30",
                        fontSize: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Key detection display */}
          {autoKeyDetect && detectedKey && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#21262d", borderRadius: 6, border: "1px solid #30363d", fontSize: "0.65rem" }}>
              <span style={{ color: "#5a7088" }}>Detected Key:</span>
              <span style={{ color: "#00ffc8", fontWeight: 700 }}>
                {detectedKey.keyName} {detectedKey.mode}
              </span>
              <button
                onClick={() => {
                  setCurrentKey(detectedKey.key);
                  setCurrentScale(detectedKey.mode);
                }}
                style={{ padding: "2px 8px", borderRadius: 4, background: "#00ffc820", border: "1px solid #00ffc8", color: "#00ffc8", fontSize: "0.6rem", cursor: "pointer" }}
              >
                Apply
              </button>
            </div>
          )}

          {/* Recording info */}
          {recordedEvents.length > 0 && (
            <div style={{ padding: "6px 10px", background: "#21262d", borderRadius: 6, border: "1px solid #30363d", fontSize: "0.65rem" }}>
              <span style={{ color: "#5a7088" }}>Recorded: </span>
              <span style={{ color: "#00ffc8" }}>{recordedEvents.length} events</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Settings Panel ── */}
        <div style={{ width: 280, borderLeft: "1px solid #21262d", padding: 10, overflow: "auto", fontSize: "0.7rem" }}>
          {/* Musical Settings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#00ffc8", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Musical</div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Key</label>
              <select
                value={currentKey}
                onChange={(e) => setCurrentKey(parseInt(e.target.value, 10))}
                style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
              >
                {KEY_NAMES.map((k, i) => (
                  <option key={i} value={i}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Scale</label>
              <select
                value={currentScale}
                onChange={(e) => setCurrentScale(e.target.value)}
                style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
              >
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Octave</label>
              <input type="range" min={-3} max={3} value={octaveOffset} onChange={(e) => setOctaveOffset(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
              <span style={{ width: 26, textAlign: "center" }}>{octaveOffset >= 0 ? "+" : ""}{octaveOffset}</span>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Chord</label>
              <select
                value={chordMode}
                onChange={(e) => setChordMode(e.target.value)}
                style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
              >
                <option value="off">Off</option>
                <option value="major">Major triad</option>
                <option value="minor">Minor triad</option>
                <option value="auto">Auto (scale)</option>
                <option value="maj7">Major 7</option>
                <option value="min7">Minor 7</option>
                <option value="dom7">Dom 7</option>
                <option value="sus2">Sus2</option>
                <option value="sus4">Sus4</option>
                <option value="dim">Dim</option>
                <option value="aug">Aug</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Channel</label>
              <select
                value={midiChannel}
                onChange={(e) => setMidiChannel(parseInt(e.target.value, 10))}
                style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
              >
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>
                    Ch {i + 1} {i === 9 ? "(GM Drums)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 60, color: "#5a7088" }}>Velocity</label>
              <input type="range" min={0.1} max={1} step={0.05} value={velocitySensitivity} onChange={(e) => setVelocitySensitivity(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ width: 34, textAlign: "center" }}>{Math.round(velocitySensitivity * 100)}%</span>
            </div>
          </div>

          {/* Poly settings */}
          {mode === "poly" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "#007aff", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Poly Mode (Realistic)</div>

              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                <label style={{ width: 90, color: "#5a7088" }}>Chord Style</label>
                <select
                  value={polyChordStyle}
                  onChange={(e) => setPolyChordStyle(e.target.value)}
                  style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
                >
                  <option value="diatonicTriad">Diatonic Triad</option>
                  <option value="diatonic7">Diatonic 7th</option>
                  <option value="fixed">Fixed Type</option>
                </select>
              </div>

              {polyChordStyle === "fixed" && (
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  <label style={{ width: 90, color: "#5a7088" }}>Fixed Type</label>
                  <select
                    value={polyFixedType}
                    onChange={(e) => setPolyFixedType(e.target.value)}
                    style={{ flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "2px 4px", fontSize: "0.65rem" }}
                  >
                    {Object.keys(CHORD_INTERVALS).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* “Dubler feel” settings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#5ac8fa", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Feel / Stability</div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 110, color: "#5a7088" }}>Stability (ms)</label>
              <input type="range" min={20} max={140} step={5} value={noteStabilityMs} onChange={(e) => setNoteStabilityMs(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
              <span style={{ width: 34, textAlign: "center" }}>{noteStabilityMs}</span>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 110, color: "#5a7088" }}>NoteOn conf</label>
              <input type="range" min={0.3} max={0.9} step={0.05} value={noteOnConf} onChange={(e) => setNoteOnConf(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ width: 34, textAlign: "center" }}>{noteOnConf.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 110, color: "#5a7088" }}>NoteOff conf</label>
              <input type="range" min={0.2} max={0.8} step={0.05} value={noteOffConf} onChange={(e) => setNoteOffConf(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ width: 34, textAlign: "center" }}>{noteOffConf.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              <label style={{ width: 110, color: "#5a7088" }}>RMS gate</label>
              <input type="range" min={0.002} max={0.03} step={0.001} value={minRmsGate} onChange={(e) => setMinRmsGate(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span style={{ width: 34, textAlign: "center" }}>{minRmsGate.toFixed(3)}</span>
            </div>
          </div>

          {/* Pitch Bend & Vibrato */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#af52de", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Pitch Bend</div>

            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={pitchBendEnabled} onChange={(e) => setPitchBendEnabled(e.target.checked)} />
              <span>Continuous pitch bend</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={vibratoToPitchBend} onChange={(e) => setVibratoToPitchBend(e.target.checked)} />
              <span>Vibrato → pitch bend</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, cursor: "pointer" }}>
              <input type="checkbox" checked={autoKeyDetect} onChange={(e) => setAutoKeyDetect(e.target.checked)} />
              <span>Auto key detection</span>
            </label>
          </div>

          {/* MIDI CC Mappings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#ff9500", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>MIDI CC Controls</div>

            {Object.entries(ccMappings).map(([key, mapping]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, opacity: mapping.enabled ? 1 : 0.5 }}>
                <input type="checkbox" checked={mapping.enabled} onChange={() => toggleCC(key)} style={{ width: 14, height: 14 }} />
                <span style={{ width: 84, fontSize: "0.6rem" }}>{mapping.label}</span>
                <span className="vtm-meter-label">CC</span>
                <input
                  type="number"
                  value={mapping.cc}
                  min={0}
                  max={127}
                  onChange={(e) => updateCCNumber(key, e.target.value)}
                  style={{ width: 40, background: "#21262d", border: "1px solid #30363d", borderRadius: 3, color: "#c9d1d9", padding: "1px 3px", fontSize: "0.6rem" }}
                />
              </div>
            ))}
          </div>

          {/* Vowel-to-CC */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#ff2d55", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={vowelCcEnabled} onChange={(e) => setVowelCcEnabled(e.target.checked)} />
                Vowel → CC
              </label>
            </div>

            {vowelCcEnabled &&
              Object.entries(vowelMappings).map(([vowel, mapping]) => (
                <div key={vowel} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <span style={{ width: 16, fontWeight: 800, color: "#ff2d55" }}>{vowel.toUpperCase()}</span>
                  <span style={{ fontSize: "0.55rem", color: "#5a7088", width: 20 }}>CC</span>
                  <input
                    type="number"
                    value={mapping.cc}
                    min={0}
                    max={127}
                    onChange={(e) =>
                      setVowelMappings((prev) => ({
                        ...prev,
                        [vowel]: { ...prev[vowel], cc: parseInt(e.target.value, 10) || 0 },
                      }))
                    }
                    style={{ width: 36, background: "#21262d", border: "1px solid #30363d", borderRadius: 3, color: "#c9d1d9", padding: "1px 3px", fontSize: "0.6rem" }}
                  />
                  <span style={{ fontSize: "0.55rem", color: "#5a7088", width: 24 }}>Val</span>
                  <input
                    type="number"
                    value={mapping.value}
                    min={0}
                    max={127}
                    onChange={(e) =>
                      setVowelMappings((prev) => ({
                        ...prev,
                        [vowel]: { ...prev[vowel], value: parseInt(e.target.value, 10) || 0 },
                      }))
                    }
                    style={{ width: 40, background: "#21262d", border: "1px solid #30363d", borderRadius: 3, color: "#c9d1d9", padding: "1px 3px", fontSize: "0.6rem" }}
                  />
                  <span style={{ fontSize: "0.5rem", color: "#5a7088" }}>{mapping.label}</span>
                </div>
              ))}
          </div>

          {/* Web MIDI Output */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#007aff", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>MIDI Output</div>

            {midiOutputs.length > 0 ? (
              <select
                value={selectedMidiOutput || ""}
                onChange={(e) => selectMidiOutput(e.target.value)}
                style={{ width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 4, color: "#c9d1d9", padding: "3px 4px", fontSize: "0.65rem" }}
              >
                <option value="">Internal only</option>
                {midiOutputs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="vtm-freq-label">{webMidiEnabled ? "No MIDI devices found" : "Web MIDI not available"}</span>
            )}
          </div>

          {/* Trigger routing */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#ff3b30", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Trigger Routing</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={useGMDrumChannel} onChange={(e) => setUseGMDrumChannel(e.target.checked)} />
              Use GM Drum Channel (Ch 10)
            </label>
          </div>

          {/* Latency */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: "#5ac8fa", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Latency</div>
            <div style={{ display: "flex", gap: 4 }}>
              {["low", "balanced", "quality"].map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLatencyMode(l);
                    if (isListening) {
                      stopListening();
                      setTimeout(startListening, 100);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "3px 6px",
                    borderRadius: 4,
                    cursor: "pointer",
                    border: `1px solid ${latencyMode === l ? "#5ac8fa" : "#30363d"}`,
                    background: latencyMode === l ? "#5ac8fa20" : "transparent",
                    color: latencyMode === l ? "#5ac8fa" : "#5a7088",
                    fontSize: "0.6rem",
                  }}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "0.55rem", color: "#5a7088", marginTop: 3 }}>
              Buffer: {BUFFER_SIZES[latencyMode]} samples (~{Math.round(BUFFER_SIZES[latencyMode] / 48)}ms)
            </div>
          </div>

          {/* Trigger Settings (when in trigger mode) */}
          {mode === "trigger" && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "#ff3b30", marginBottom: 6, fontSize: "0.65rem", textTransform: "uppercase" }}>Trigger Settings</div>
              {triggers.map((trig, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginBottom: 3,
                    padding: "2px 4px",
                    borderRadius: 4,
                    background: trainingSlot === i ? "#ff950020" : "transparent",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: trig.color }} />
                  <input
                    value={trig.name}
                    onChange={(e) => updateTrigger(i, { name: e.target.value })}
                    style={{ width: 64, background: "#21262d", border: "1px solid #30363d", borderRadius: 3, color: "#c9d1d9", padding: "1px 3px", fontSize: "0.6rem" }}
                  />
                  <span style={{ fontSize: "0.5rem", color: "#5a7088" }}>N:</span>
                  <input
                    type="number"
                    value={trig.midiNote}
                    min={0}
                    max={127}
                    onChange={(e) => updateTrigger(i, { midiNote: parseInt(e.target.value, 10) || 36 })}
                    style={{ width: 36, background: "#21262d", border: "1px solid #30363d", borderRadius: 3, color: "#c9d1d9", padding: "1px 3px", fontSize: "0.6rem" }}
                  />
                  <span style={{ fontSize: "0.5rem", color: "#5a7088" }}>Th:</span>
                  <input type="range" min={0.3} max={0.95} step={0.05} value={trig.threshold} onChange={(e) => updateTrigger(i, { threshold: parseFloat(e.target.value) })} style={{ width: 60 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceToMIDI;