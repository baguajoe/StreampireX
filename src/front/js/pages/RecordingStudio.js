// =============================================================================
// RecordingStudio.js - Multi-Track DAW (Cubase-Inspired)
// =============================================================================
// Location: src/front/js/pages/RecordingStudio.js
// Route: /recording-studio
// Pure Web Audio API — zero external audio libraries
// Effects: EQ, Compressor, Reverb, Delay, Distortion, Filter per track
// Views: Arrange | Console | Beat Maker | Drum Kits | Piano Roll | Piano | Sounds | Split | Key Finder | AI Beats | Mic Sim | AI Mix | MIDI | Chords | Sampler | Vocal | Plugins | Voice MIDI
// Track limits: Free=4, Starter=8, Creator=16, Pro=32
//
// NEW:
// - DAWMenuBar integrated (import + JSX)
// - onAction handler wired to RecordingStudio functions
// - selectedTrackIndex for Track/Edit actions
// - Simple MIDI export (pianoRollNotes -> .mid download)
// - InstrumentTrackEngine integration (GM Synth, Samples, External MIDI, Beat Maker → Arrange)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ArrangerView from "../component/ArrangerView";
import AIMixAssistant from "../component/AIMixAssistant";
import SamplerBeatMaker from "../component/SamplerBeatMaker";
import SamplerInstrument from "../component/SamplerInstrument";
import MicSimulator from "../component/MicSimulator";
import VirtualPiano from "../component/VirtualPiano";
import FreesoundBrowser from "../component/FreesoundBrowser";
import KeyFinder from "../component/KeyFinder";
import AIBeatAssistant from "../component/AIBeatAssistant";
import PianoDrumSplit from "../component/PianoDrumSplit";
import ParametricEQGraph from "../component/ParametricEQGraph";
import { InlineStemSeparation, AudioToMIDIPanel, PitchCorrectionPanel } from "../component/DAWAdvancedFeatures";

// ── Piano Roll / MIDI / Chord / Quantize imports ──
import PianoRoll from "../component/PianoRoll";
import MidiImporter from "../component/MidiImporter";
import MidiHardwareInput from "../component/MidiHardwareInput";
import ChordProgressionGenerator from "../component/ChordProgressionGenerator";
import { QuantizePanel } from "../component/QuantizeEngine";

// ── DAW Menu Bar ──
import DAWMenuBar from "../component/DAWMenuBar";

// ── Vocal Processor ──
import VocalProcessor from "../component/VocalProcessor";

// ── Plugin Rack System ──
import { getEngine } from "../component/audio/engine/AudioEngine";
import TrackGraph from "../component/audio/engine/TrackGraph";
import PluginRackPanel from "../component/audio/components/plugins/PluginRackPanel";

// ── Voice-to-MIDI (Dubler-style) ──
import VoiceToMIDI from "../component/VoiceToMIDI";

// ── Drum Kit Connector ──
import DrumKitConnector from "../component/DrumKitConnector";

// ── Instrument Track Engine (STEP 1) ──
import useInstrumentTrackEngine, {
  InstrumentSelector, KeyboardOctaveIndicator, MidiDeviceIndicator,
  createMidiRegion, createMidiRegionFromNotes, SOURCE_TYPES,
} from '../component/InstrumentTrackEngine';

import "../../styles/RecordingStudio.css";
import "../../styles/ArrangerView.css";
import "../../styles/AIMixAssistant.css";
import "../../styles/SamplerBeatMaker.css";
import "../../styles/SamplerInstrument.css";
import "../../styles/MicSimulator.css";
import "../../styles/VirtualPiano.css";
import "../../styles/FreesoundBrowser.css";
import "../../styles/KeyFinder.css";
import "../../styles/AIBeatAssistant.css";
import "../../styles/PianoDrumSplit.css";
import "../../styles/SoundKitManager.css";
import "../../styles/PianoRoll.css";
import "../../styles/ChordProgressionGenerator.css";
import "../../styles/DAWMenuBar.css";
import "../../styles/VocalTools.css";

const TRACK_COLORS = [
  "#34c759",
  "#ff9500",
  "#007aff",
  "#af52de",
  "#ff3b30",
  "#5ac8fa",
  "#ff2d55",
  "#ffcc00",
  "#30d158",
  "#ff6b35",
  "#0a84ff",
  "#bf5af2",
  "#ff453a",
  "#64d2ff",
  "#ff375f",
  "#ffd60a",
  "#32d74b",
  "#ff8c00",
  "#0066cc",
  "#9b59b6",
  "#e74c3c",
  "#2ecc71",
  "#e91e63",
  "#f39c12",
  "#27ae60",
  "#d35400",
  "#2980b9",
  "#8e44ad",
  "#c0392b",
  "#16a085",
  "#e84393",
  "#fdcb6e",
];

const TIER_TRACK_LIMITS = { free: 4, starter: 8, creator: 16, pro: 32 };
const DEFAULT_MAX = 4;

const DEFAULT_EFFECTS = () => ({
  eq: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: false },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, enabled: false },
  reverb: { mix: 0.2, decay: 2.0, enabled: false },
  delay: { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion: { amount: 0, enabled: false },
  filter: { type: "lowpass", frequency: 20000, Q: 1, enabled: false },
  limiter: { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05, enabled: false },
});

// =============================================================================
// Stable ID Generator (for tracks)
// =============================================================================
const uid = () =>
  globalThis.crypto?.randomUUID?.()
    ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── STEP 10: DEFAULT_TRACK updated for instrument support ──
const DEFAULT_TRACK = (i, type = "audio") => ({
  id: uid(),
  name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
  trackType: type,
  instrument: type === "midi" ? { program: 0, name: 'Acoustic Grand' } : null,
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
  armed: false,
  audio_url: null,
  color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null,
  effects: DEFAULT_EFFECTS(),
  regions: [],
});

// ── Beat ↔ Seconds helpers ──
const secondsToBeat = (seconds, bpm) => (seconds / 60) * bpm;
const beatToSeconds = (beat, bpm) => (beat / bpm) * 60;

// ── Small helpers ──
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// ── STEP 8: MidiRegionPreview — mini piano-roll inside region ──
const MidiRegionPreview = React.memo(({ notes = [], duration, height, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !notes.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const noteNums = notes.map(n => n.note);
    const minNote = Math.min(...noteNums) - 1;
    const maxNote = Math.max(...noteNums) + 1;
    const range = Math.max(maxNote - minNote, 12);

    ctx.fillStyle = color || '#7c3aed';
    ctx.globalAlpha = 0.8;
    notes.forEach(n => {
      const x = (n.startBeat / duration) * w;
      const noteW = Math.max((n.duration / duration) * w, 2);
      const y = h - ((n.note - minNote) / range) * h;
      const noteH = Math.max(h / range, 2);
      ctx.fillRect(x, y - noteH, noteW, noteH);
    });
  }, [notes, duration, height, color]);

  return <canvas ref={canvasRef} width={300} height={height}
    style={{ width: '100%', height, display: 'block', opacity: 0.9 }} />;
});

/**
 * Minimal MIDI writer (SMF format 0 / single track).
 * Notes expected: [{ note, velocity, startBeat, duration, channel }]
 */
const midiFromNotes = ({ notes = [], bpm = 120, ppq = 480 }) => {
  const sorted = [...notes]
    .filter((n) => Number.isFinite(n.note) && Number.isFinite(n.startBeat) && Number.isFinite(n.duration))
    .map((n) => ({
      note: clamp(Math.round(n.note), 0, 127),
      vel: clamp(Math.round((n.velocity ?? 0.9) <= 1 ? (n.velocity ?? 0.9) * 127 : n.velocity ?? 100), 1, 127),
      startTick: Math.max(0, Math.round((n.startBeat || 0) * ppq)),
      endTick: Math.max(0, Math.round(((n.startBeat || 0) + (n.duration || 0)) * ppq)),
      channel: clamp(Math.round(n.channel ?? 0), 0, 15),
    }))
    .filter((n) => n.endTick > n.startTick)
    .sort((a, b) => a.startTick - b.startTick);

  const events = [];
  const mpqn = Math.round(60000000 / (bpm || 120));
  events.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff] });

  for (const n of sorted) {
    events.push({ tick: n.startTick, bytes: [0x90 | n.channel, n.note, n.vel] });
    events.push({ tick: n.endTick, bytes: [0x80 | n.channel, n.note, 0x00] });
  }

  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick + 1, bytes: [0xff, 0x2f, 0x00] });
  events.sort((a, b) => a.tick - b.tick);

  const trackData = [];
  let prevTick = 0;

  const writeVarLen = (val) => {
    let v = val >>> 0;
    let buffer = v & 0x7f;
    while ((v >>= 7)) {
      buffer <<= 8;
      buffer |= (v & 0x7f) | 0x80;
    }
    while (true) {
      trackData.push(buffer & 0xff);
      if (buffer & 0x80) buffer >>= 8;
      else break;
    }
  };

  for (const e of events) {
    const delta = Math.max(0, e.tick - prevTick);
    writeVarLen(delta);
    trackData.push(...e.bytes);
    prevTick = e.tick;
  }

  const header = [];
  const pushStr = (s) => s.split("").forEach((ch) => header.push(ch.charCodeAt(0)));
  const pushU16 = (n) => header.push((n >> 8) & 0xff, n & 0xff);
  const pushU32 = (n) => header.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  pushStr("MThd");
  pushU32(6);
  pushU16(0);
  pushU16(1);
  pushU16(ppq);

  const trackHeader = [];
  const pushStr3 = (s) => s.split("").forEach((ch) => trackHeader.push(ch.charCodeAt(0)));
  const pushU32b = (n) => trackHeader.push((n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);

  pushStr3("MTrk");
  pushU32b(trackData.length);

  return new Uint8Array([...header, ...trackHeader, ...trackData]);
};

const RecordingStudio = ({ user }) => {
  // ── Tier-based track limit ──
  const userTier = (user?.subscription_tier || user?.tier || "free").toLowerCase();
  const maxTracks = TIER_TRACK_LIMITS[userTier] || DEFAULT_MAX;

  // ✅ Default view is Arrange (NOT record)
  const [viewMode, setViewMode] = useState("arrange");

  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));

  // ── Selected track (for DAWMenuBar Track/Edit actions) ──
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [newTrackType, setNewTrackType] = useState("audio");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountIn] = useState(false);

  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("default");
  const [inputLevel, setInputLevel] = useState(0);
  const [status, setStatus] = useState("Ready");
  const [saving, setSaving] = useState(false);
  const [mixingDown, setMixingDown] = useState(false);
  const [activeEffectsTrack, setActiveEffectsTrack] = useState(null);
  const [micSimStream, setMicSimStream] = useState(null);
  const [meterLevels, setMeterLevels] = useState([]);

  const [pianoRollNotes, setPianoRollNotes] = useState([]);
  const [pianoRollKey, setPianoRollKey] = useState("C");
  const [pianoRollScale, setPianoRollScale] = useState("major");
  const [selectedTrack, setSelectedTrack] = useState(0);

  // ── STEP 13: Track active region being edited in Piano Roll ──
  const [editingRegion, setEditingRegion] = useState(null);
  // { trackIndex: number, regionId: string }

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const trackSourcesRef = useRef([]);
  const trackGainsRef = useRef([]);
  const trackPansRef = useRef([]);
  const trackAnalysersRef = useRef([]);
  const meterAnimRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const playStartRef = useRef(0);
  const playOffsetRef = useRef(0);
  const metroRef = useRef(null);
  const timeRef = useRef(null);
  const canvasRefs = useRef([]);
  const inputAnalyserRef = useRef(null);
  const inputAnimRef = useRef(null);
  // =============================================================================
  // Cubase-Style Per-Track Audio Graph System
  // =============================================================================

  const trackNodesRef = useRef(new Map()); // trackId -> audio nodes

  const dbToGain = (db) => Math.pow(10, db / 20);

  const setStereoPan = (panNode, pan) => {
    if (!audioCtxRef.current) return;
    try {
      panNode.pan.setTargetAtTime(
        pan,
        audioCtxRef.current.currentTime,
        0.01
      );
    } catch {
      panNode.pan.value = pan;
    }
  };

  const ensureTrackGraph = (track) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return null;

    if (trackNodesRef.current.has(track.id)) {
      return trackNodesRef.current.get(track.id);
    }

    // Create nodes
    const input = ctx.createGain();
    const preGain = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    const fader = ctx.createGain();
    const meter = ctx.createAnalyser();
    meter.fftSize = 2048;

    // Routing
    input.connect(preGain);
    preGain.connect(panNode);
    panNode.connect(fader);
    fader.connect(meter);
    meter.connect(masterGainRef.current);

    const nodes = { input, preGain, panNode, fader, meter };
    trackNodesRef.current.set(track.id, nodes);

    applyTrackToNodes(track, nodes);

    return nodes;
  };

  const applyTrackToNodes = (track, nodes) => {
    if (!audioCtxRef.current) return;

    const volDb = track.volumeDb ?? 0;
    const pan = track.pan ?? 0;

    // Mute logic
    nodes.preGain.gain.setTargetAtTime(
      track.muted ? 0 : 1,
      audioCtxRef.current.currentTime,
      0.01
    );

    // Fader
    nodes.fader.gain.setTargetAtTime(
      dbToGain(volDb),
      audioCtxRef.current.currentTime,
      0.01
    );

    // Pan
    setStereoPan(nodes.panNode, pan);
  };

  // Tap tempo tracking
  const tapTimesRef = useRef([]);

  const playheadBeat = useMemo(() => secondsToBeat(currentTime, bpm), [currentTime, bpm]);

  // ── STEP 1: Instrument Track Engine ──
  const instrumentEngine = useInstrumentTrackEngine(audioCtxRef, tracks, {
    bpm, isPlaying, isRecording, playheadBeat, masterGainRef,
    onNotesRecorded: (notes) => {
      const armedIdx = tracks.findIndex(t =>
        t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
      );
      if (armedIdx === -1 || !notes.length) return;
      const region = createMidiRegionFromNotes(notes, 'MIDI Recording');
      setTracks(prev => prev.map((t, i) =>
        i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t
      ));
      setStatus(`✓ Recorded ${notes.length} MIDI notes → Track ${armedIdx + 1}`);
    },
  });

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((d) => setInputDevices(d.filter((x) => x.kind === "audioinput")))
      .catch(console.error);

    return () => {
      stopEverything();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [masterVolume]);

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  // Initialize per-track audio graphs
  useEffect(() => {
    if (!audioCtxRef.current || !masterGainRef.current) return;

    tracks.forEach((t) => {
      ensureTrackGraph(t);
    });
  }, [tracks]);
  const getReverbBuf = useCallback((ctx, decay = 2) => {
    const len = ctx.sampleRate * decay;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }, []);

  const masterMeter = { peak: 0 };
  const updateTrack = useCallback((i, u) => setTracks((p) => p.map((t, idx) => (idx === i ? { ...t, ...u } : t))), []);
  const updateEffect = (ti, fx, param, val) =>
    setTracks((p) =>
      p.map((t, i) => (i !== ti ? t : { ...t, effects: { ...t.effects, [fx]: { ...t.effects[fx], [param]: val } } }))
    );

  const hasSolo = tracks.some((t) => t.solo);
  const isAudible = (t) => !t.muted && (!hasSolo || t.solo);
  const applyAudibilityToAllGains = useCallback((overrideTracks = null) => {
    const list = overrideTracks || tracks;
    const anySolo = list.some(t => t.solo);

    list.forEach((t, idx) => {
      const gainNode = trackGainsRef.current[idx];
      if (!gainNode) return;

      const audible = !t.muted && (!anySolo || t.solo);
      gainNode.gain.value = audible ? (t.volume ?? 0.8) : 0;
    });
  }, [tracks]);

  // ── STEP 13: Save Piano Roll edits back to region ──
  const savePianoRollToRegion = useCallback(() => {
    if (!editingRegion) return;
    const { trackIndex, regionId } = editingRegion;

    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return {
        ...t,
        regions: (t.regions || []).map(r => {
          if (r.id !== regionId) return r;
          // Convert absolute beats back to relative
          const relativeNotes = pianoRollNotes.map(n => ({
            ...n,
            startBeat: n.startBeat - r.startBeat,
          }));
          // Recalculate duration
          const maxEnd = Math.max(...relativeNotes.map(n => n.startBeat + n.duration), 0);
          return { ...r, notes: relativeNotes, duration: Math.max(maxEnd, r.duration) };
        }),
      };
    }));

    setEditingRegion(null);
    setStatus('✓ Piano Roll edits saved to region');
  }, [editingRegion, pianoRollNotes]);

  // Auto-save piano roll edits when switching away from pianoroll view (STEP 13)
  useEffect(() => {
    if (viewMode !== 'pianoroll' && editingRegion) {
      savePianoRollToRegion();
    }
  }, [viewMode, editingRegion, savePianoRollToRegion]);

  // ── STEP 7 / STEP 13: Open Piano Roll from a MIDI region ──
  const onOpenPianoRoll = useCallback((trackIdx, regionId) => {
    const track = tracks[trackIdx];
    const region = (track?.regions || []).find(r => r.id === regionId);
    if (!region) return;

    setEditingRegion({ trackIndex: trackIdx, regionId });
    setPianoRollNotes(region.notes.map(n => ({
      ...n, startBeat: n.startBeat + region.startBeat,
    })));
    setViewMode('pianoroll');
  }, [tracks]);

  // ── Waveform drawing ──
  const drawWaveform = useCallback((el, buf, color) => {
    if (!el || !buf) return;
    const c = el.getContext("2d"),
      w = el.width,
      h = el.height,
      data = buf.getChannelData(0),
      step = Math.ceil(data.length / w),
      mid = h / 2;

    c.clearRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,255,255,0.03)";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    c.strokeStyle = "rgba(255,255,255,0.06)";
    c.beginPath();
    c.moveTo(0, mid);
    c.lineTo(w, mid);
    c.stroke();

    c.fillStyle = color + "40";
    c.beginPath();
    c.moveTo(0, mid);
    for (let i = 0; i < w; i++) {
      let mx = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d > mx) mx = d;
      }
      c.lineTo(i, mid - mx * mid * 0.9);
    }
    for (let i = w - 1; i >= 0; i--) {
      let mn = 1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d < mn) mn = d;
      }
      c.lineTo(i, mid - mn * mid * 0.9);
    }
    c.closePath();
    c.fill();

    c.strokeStyle = color;
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < w; i++) {
      let mx = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d !== undefined && d > mx) mx = d;
      }
      const y = mid - mx * mid * 0.9;
      i === 0 ? c.moveTo(i, y) : c.lineTo(i, y);
    }
    c.stroke();
  }, []);

  useEffect(() => {
    tracks.forEach((t, i) => {
      if (t.audioBuffer && canvasRefs.current[i]) drawWaveform(canvasRefs.current[i], t.audioBuffer, t.color);
    });
  }, [tracks, drawWaveform]);

  const loadAudioBuffer = async (url, ti) => {
    try {
      const ctx = getCtx();
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      updateTrack(ti, { audioBuffer: buf, audio_url: url });
      return buf;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // ── Effects chain builder ──
  const buildFxChain = (ctx, track) => {
    const nodes = [];
    const fx = track.effects;

    if (fx.eq.enabled) {
      const lo = ctx.createBiquadFilter();
      lo.type = "lowshelf";
      lo.frequency.value = 320;
      lo.gain.value = fx.eq.lowGain;

      const mi = ctx.createBiquadFilter();
      mi.type = "peaking";
      mi.frequency.value = fx.eq.midFreq;
      mi.Q.value = 1.5;
      mi.gain.value = fx.eq.midGain;

      const hi = ctx.createBiquadFilter();
      hi.type = "highshelf";
      hi.frequency.value = 3200;
      hi.gain.value = fx.eq.highGain;

      nodes.push(lo, mi, hi);
    }

    if (fx.filter.enabled) {
      const f = ctx.createBiquadFilter();
      f.type = fx.filter.type;
      f.frequency.value = fx.filter.frequency;
      f.Q.value = fx.filter.Q;
      nodes.push(f);
    }

    if (fx.compressor.enabled) {
      const c = ctx.createDynamicsCompressor();
      c.threshold.value = fx.compressor.threshold;
      c.ratio.value = fx.compressor.ratio;
      c.attack.value = fx.compressor.attack;
      c.release.value = fx.compressor.release;
      nodes.push(c);
    }

    if (fx.distortion.enabled && fx.distortion.amount > 0) {
      const ws = ctx.createWaveShaper();
      const amt = fx.distortion.amount;
      const s = 44100;
      const curve = new Float32Array(s);
      for (let i = 0; i < s; i++) {
        const x = (i * 2) / s - 1;
        curve[i] = ((3 + amt) * x * 20 * (Math.PI / 180)) / (Math.PI + amt * Math.abs(x));
      }
      ws.curve = curve;
      ws.oversample = "4x";
      nodes.push(ws);
    }

    if (fx.limiter?.enabled) {
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = fx.limiter.threshold;
      lim.knee.value = fx.limiter.knee;
      lim.ratio.value = fx.limiter.ratio;
      lim.attack.value = fx.limiter.attack;
      lim.release.value = fx.limiter.release;
      nodes.push(lim);
    }

    return nodes;
  };

  const buildSends = (ctx, track, dry, master) => {
    const fx = track.effects;

    if (fx.reverb.enabled && fx.reverb.mix > 0) {
      const conv = ctx.createConvolver();
      conv.buffer = getReverbBuf(ctx, fx.reverb.decay);
      const g = ctx.createGain();
      g.gain.value = fx.reverb.mix;
      dry.connect(conv);
      conv.connect(g);
      g.connect(master);
    }

    if (fx.delay.enabled && fx.delay.mix > 0) {
      const d = ctx.createDelay(5);
      d.delayTime.value = fx.delay.time;
      const fb = ctx.createGain();
      fb.gain.value = fx.delay.feedback;
      const mx = ctx.createGain();
      mx.gain.value = fx.delay.mix;
      dry.connect(d);
      d.connect(fb);
      fb.connect(d);
      d.connect(mx);
      mx.connect(master);
    }
  };

  // ── Real-time meter animation ──
  const startMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);

    const animate = () => {
      const analysers = trackAnalysersRef.current;
      if (!analysers || analysers.length === 0) {
        setMeterLevels([]);
        return;
      }

      const levels = analysers.map((pair) => {
        if (!pair || !pair.left || !pair.right) return { left: 0, right: 0, peak: 0 };

        const dataL = new Uint8Array(pair.left.frequencyBinCount);
        pair.left.getByteFrequencyData(dataL);
        let sumL = 0;
        for (let i = 0; i < dataL.length; i++) sumL += dataL[i];
        const left = sumL / (dataL.length * 255);

        const dataR = new Uint8Array(pair.right.frequencyBinCount);
        pair.right.getByteFrequencyData(dataR);
        let sumR = 0;
        for (let i = 0; i < dataR.length; i++) sumR += dataR[i];
        const right = sumR / (dataR.length * 255);

        return { left, right, peak: Math.max(left, right) };
      });

      setMeterLevels(levels);
      meterAnimRef.current = requestAnimationFrame(animate);
    };

    meterAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    setMeterLevels([]);
  }, []);

  // ── Playback ──
  const startMetronome = (ctx) => {
    const iv = (60 / bpm) * 1000;
    let beat = 0;
    const click = (down) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = down ? 1000 : 800;
      g.gain.value = 0.3;
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.05);
    };
    click(true);
    metroRef.current = setInterval(() => {
      beat = (beat + 1) % 4;
      click(beat === 0);
    }, iv);
  };

  const playCountIn = (ctx) =>
    new Promise((res) => {
      const iv = (60 / bpm) * 1000;
      let c = 0;
      const click = () => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = c === 0 ? 1200 : 1000;
        g.gain.value = 0.5;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime);
        o.stop(ctx.currentTime + 0.06);
      };
      click();
      const id = setInterval(() => {
        c++;
        if (c >= 4) {
          clearInterval(id);
          res();
        } else click();
      }, iv);
    });

  const startPlayback = (overdub = false) => {
    const ctx = getCtx();

    trackSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch { }
    });
    trackSourcesRef.current = [];
    trackGainsRef.current = [];
    trackPansRef.current = [];
    trackAnalysersRef.current = [];

    let maxDur = 0;

    tracks.forEach((t, i) => {
      if (!t.audioBuffer) {
        trackAnalysersRef.current[i] = null;
        return;
      }

      const s = ctx.createBufferSource();
      s.buffer = t.audioBuffer;

      const g = ctx.createGain();
      g.gain.value = isAudible(t) ? t.volume : 0;

      const p = ctx.createStereoPanner();
      p.pan.value = t.pan;

      const splitter = ctx.createChannelSplitter(2);
      const analyserL = ctx.createAnalyser();
      analyserL.fftSize = 256;
      analyserL.smoothingTimeConstant = 0.7;

      const analyserR = ctx.createAnalyser();
      analyserR.fftSize = 256;
      analyserR.smoothingTimeConstant = 0.7;

      const fxNodes = buildFxChain(ctx, t);
      let last = s;
      fxNodes.forEach((n) => {
        last.connect(n);
        last = n;
      });

      last.connect(g);
      g.connect(p);

      p.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);

      p.connect(masterGainRef.current);
      buildSends(ctx, t, p, masterGainRef.current);

      s.start(0, playOffsetRef.current);

      trackSourcesRef.current[i] = s;
      trackGainsRef.current[i] = g;
      trackPansRef.current[i] = p;
      trackAnalysersRef.current[i] = { left: analyserL, right: analyserR };

      if (t.audioBuffer.duration > maxDur) maxDur = t.audioBuffer.duration;
    });

    setDuration(maxDur);
    playStartRef.current = ctx.currentTime;
    setIsPlaying(true);

    if (metronomeOn) startMetronome(ctx);
    startMeterAnimation();

    timeRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const el = audioCtxRef.current.currentTime - playStartRef.current + playOffsetRef.current;
      setCurrentTime(el);
      if (el >= maxDur && maxDur > 0 && !overdub) stopPlayback();
    }, 50);

    if (!overdub) setStatus("▶ Playing");
  };

  const stopPlayback = () => {
    trackSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch { }
    });
    trackSourcesRef.current = [];

    if (metroRef.current) clearInterval(metroRef.current);
    if (timeRef.current) clearInterval(timeRef.current);

    stopMeterAnimation();
    trackAnalysersRef.current = [];
    setIsPlaying(false);

    if (!isRecording) {
      playOffsetRef.current = currentTime;
      setStatus("■ Stopped");
    }
  };

  // ── Recording ──
  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);

    const newRegion = {
      id: regionId,
      name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`,
      startBeat,
      duration: durationBeat,
      audioUrl,
      color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
      loopEnabled: false,
      loopCount: 1,
    };

    setTracks((prev) => prev.map((t, i) => (i === trackIndex ? { ...t, regions: [...(t.regions || []), newRegion] } : t)));
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const durationBeat = secondsToBeat(audioBuffer.duration, bpm);

    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
            ...t,
            regions: [
              ...(t.regions || []),
              {
                id: regionId,
                name: name || `Import ${trackIndex + 1}`,
                startBeat: 0,
                duration: durationBeat,
                audioUrl,
                color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length],
                loopEnabled: false,
                loopCount: 1,
              },
            ],
          }
          : t
      )
    );
  };

  const uploadTrack = async (blob, ti) => {
    if (!projectId) return;
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const fd = new FormData();
      fd.append("file", blob, `track_${ti}.webm`);
      fd.append("project_id", projectId);
      fd.append("track_index", ti);

      await fetch(`${bu}/api/studio/tracks/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
        body: fd,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const startRecording = async () => {
    const ai = tracks.findIndex((t) => t.armed);
    if (ai === -1) {
      setStatus("⚠ Arm a track");
      return;
    }

    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice !== "default" ? { exact: selectedDevice } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
        },
      });

      mediaStreamRef.current = stream;
      setMicSimStream(stream);

      const src = ctx.createMediaStreamSource(stream);
      inputAnalyserRef.current = ctx.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      src.connect(inputAnalyserRef.current);

      const mon = () => {
        if (!inputAnalyserRef.current) return;
        const d = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
        inputAnalyserRef.current.getByteFrequencyData(d);
        setInputLevel(d.reduce((a, b) => a + b, 0) / d.length / 255);
        inputAnimRef.current = requestAnimationFrame(mon);
      };
      mon();

      if (countIn) {
        setStatus("Count in...");
        await playCountIn(ctx);
      }

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ab = await blob.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        const audioUrl = URL.createObjectURL(blob);

        updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
        createRegionFromRecording(ai, buf, audioUrl);

        await uploadTrack(blob, ai);
        setStatus("✓ Recorded");
      };

      mediaRecorderRef.current = rec;
      rec.start(100);
      startPlayback(true);
      setIsRecording(true);
      setStatus(`● REC Track ${ai + 1}`);
    } catch (e) {
      setStatus(`✗ Mic: ${e.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);

    setMicSimStream(null);
    setInputLevel(0);
    setIsRecording(false);
    stopPlayback();
  };

  const stopEverything = () => {
    stopRecording();
    stopPlayback();
    playOffsetRef.current = 0;
    setCurrentTime(0);
  };

  const rewind = () => {
    if (isPlaying) stopPlayback();
    playOffsetRef.current = 0;
    setCurrentTime(0);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${String(sec).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  // ── Import audio ──
  const handleImport = async (ti) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "audio/*";

    inp.onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;

      setStatus("Importing...");
      try {
        const ctx = getCtx();
        const ab = await f.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);

        const name = f.name.replace(/\.[^/.]+$/, "").substring(0, 20);
        const audioUrl = URL.createObjectURL(f);

        updateTrack(ti, { audioBuffer: buf, audio_url: audioUrl, name });
        createRegionFromImport(ti, buf, name, audioUrl);

        if (projectId) {
          const fd = new FormData();
          fd.append("file", f);
          fd.append("project_id", projectId);
          fd.append("track_index", ti);
          const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
          const bu = process.env.REACT_APP_BACKEND_URL || "";
          await fetch(`${bu}/api/studio/tracks/import`, { method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd });
        }

        setStatus(`✓ Track ${ti + 1}`);
      } catch (err) {
        setStatus(`✗ ${err.message}`);
      }
    };

    inp.click();
  };

  const clearTrack = (ti) => {
    updateTrack(ti, { audioBuffer: null, audio_url: null, armed: false, regions: [] });
    setStatus(`Track ${ti + 1} cleared`);
  };

  // ── Beat export to track ──
  const handleBeatExport = useCallback(
    (renderedBuffer, blob) => {
      let targetTrack = tracks.findIndex((t) => !t.audioBuffer);
      if (targetTrack === -1 && tracks.length < maxTracks) {
        targetTrack = tracks.length;
        setTracks((prev) => [...prev, DEFAULT_TRACK(targetTrack)]);
      }
      if (targetTrack === -1) {
        setStatus("⚠ No empty tracks. Clear a track first.");
        return;
      }
      if (renderedBuffer) {
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Beat Export" });
        createRegionFromImport(targetTrack, renderedBuffer, "Beat Export", audioUrl);
        setStatus(`✓ Beat → Track ${targetTrack + 1}`);
        setViewMode("arrange"); // ✅ was record
      }
    },
    [tracks, maxTracks, updateTrack]
  );

  const handlePianoRollExport = useCallback(
    (renderedBuffer, blob) => {
      let targetTrack = tracks.findIndex((t) => !t.audioBuffer);
      if (targetTrack === -1 && tracks.length < maxTracks) {
        targetTrack = tracks.length;
        setTracks((prev) => [...prev, DEFAULT_TRACK(targetTrack)]);
      }
      if (targetTrack === -1) {
        setStatus("⚠ No empty tracks. Clear a track first.");
        return;
      }
      if (renderedBuffer) {
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: "Piano Roll Export" });
        createRegionFromImport(targetTrack, renderedBuffer, "Piano Roll Export", audioUrl);
        setStatus(`✓ Piano Roll → Track ${targetTrack + 1}`);
        setViewMode("arrange"); // ✅ was record
      }
    },
    [tracks, maxTracks, updateTrack]
  );

  const handleMidiImport = useCallback((midiData) => {
    if (midiData?.notes) {
      setPianoRollNotes(midiData.notes);
      if (midiData.bpm) setBpm(midiData.bpm);
      if (midiData.key) setPianoRollKey(midiData.key);
      setStatus(`✓ MIDI imported — ${midiData.notes.length} notes loaded`);
      setViewMode("pianoroll");
    }
  }, []);

  const handlePianoRollNotesChange = useCallback((notes) => setPianoRollNotes(notes), []);

  const handleMidiNoteOn = useCallback(
    (note) => {
      if (viewMode === "pianoroll") {
        const newNote = {
          id: `midi_${Date.now()}_${note.note}`,
          note: note.note,
          velocity: note.velocity,
          startBeat: secondsToBeat(currentTime, bpm),
          duration: 0.25,
          channel: note.channel || 0,
        };
        setPianoRollNotes((prev) => [...prev, newNote]);
      }
      setStatus(`MIDI In: ${note.noteName || note.note} vel:${note.velocity}`);
    },
    [viewMode, currentTime, bpm]
  );

  const handleMidiNoteOff = useCallback(
    (note) => {
      const currentBeat = secondsToBeat(currentTime, bpm);
      setPianoRollNotes((prev) =>
        prev.map((n) => {
          if (n.note === note.note && n.id?.startsWith("midi_")) return { ...n, duration: Math.max(currentBeat - n.startBeat, 0.125) };
          return n;
        })
      );
    },
    [currentTime, bpm]
  );

  const handleChordInsert = useCallback((chordNotes) => {
    if (chordNotes?.length) {
      setPianoRollNotes((prev) => [...prev, ...chordNotes]);
      setStatus(`✓ ${chordNotes.length} chord notes inserted into Piano Roll`);
    }
  }, []);

  const handleChordKeyChange = useCallback((key, scale) => {
    setPianoRollKey(key);
    setPianoRollScale(scale);
  }, []);

  // ── MIDI export ──
  const exportMidiFile = useCallback(() => {
    if (!pianoRollNotes?.length) {
      setStatus("⚠ No piano roll notes to export");
      return;
    }
    try {
      const bytes = midiFromNotes({ notes: pianoRollNotes, bpm, ppq: 480 });
      const blob = new Blob([bytes], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_") || "project"}_pianoroll.mid`;
      a.click();

      URL.revokeObjectURL(url);
      setStatus("✓ MIDI exported");
    } catch (e) {
      console.error(e);
      setStatus("✗ MIDI export failed");
    }
  }, [pianoRollNotes, bpm, projectName]);

  // ── Tap tempo ──
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-6);
    if (tapTimesRef.current.length < 2) {
      setStatus("Tap tempo…");
      return;
    }
    const diffs = [];
    for (let i = 1; i < tapTimesRef.current.length; i++) diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const newBpm = clamp(Math.round(60000 / avgMs), 40, 240);
    setBpm(newBpm);
    setStatus(`✓ BPM set by tap: ${newBpm}`);
  }, []);

  // ── Seek helpers ──
  const seekToBeat = useCallback(
    (beat) => {
      const secs = beatToSeconds(beat, bpm);
      if (isPlaying) stopPlayback();
      playOffsetRef.current = secs;
      setCurrentTime(secs);
    },
    [bpm, isPlaying]
  );

  // ── STEP 6: Double-click Arrange lane → create MIDI region ──
  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const track = tracks[trackIndex];

    if (track.trackType === 'midi' || track.trackType === 'instrument') {
      const newRegion = createMidiRegion(playheadBeat, timeSignature[0], `MIDI ${trackIndex + 1}`);
      const next = [...tracks];
      next[trackIndex] = {
        ...next[trackIndex],
        regions: [...(next[trackIndex].regions || []), newRegion],
      };
      setTracks(next);
    }
  }, [tracks, playheadBeat, timeSignature, setTracks]);

  // ── Project save/load stubs (keep your existing endpoints if already working) ──
  const saveProject = async () => {
    setSaving(true);
    setStatus("Saving...");
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";

      const td = tracks.map((t) => ({
        name: t.name,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        solo: t.solo,
        effects: t.effects,
        color: t.color,
        trackType: t.trackType,
        instrument: t.instrument,
        regions: (t.regions || []).map((r) => ({ ...r, audioUrl: null })),
        audio_url: typeof t.audio_url === "string" && !t.audio_url.startsWith("blob:") ? t.audio_url : null,
      }));

      const method = projectId ? "PUT" : "POST";
      const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          name: projectName,
          bpm,
          time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
          tracks: td,
          master_volume: masterVolume,
          piano_roll_notes: pianoRollNotes,
          piano_roll_key: pianoRollKey,
          piano_roll_scale: pianoRollScale,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        setProjectId(data.project.id);
        setStatus("✓ Saved");
      } else {
        setStatus("✗ Save failed");
      }
    } catch (e) {
      setStatus("✗ Save failed");
    } finally {
      setSaving(false);
    }
  };

  const loadProject = async (pid) => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects/${pid}`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();

      if (data?.success) {
        const p = data.project;

        setProjectId(p.id);
        setProjectName(p.name);
        setBpm(p.bpm);
        setMasterVolume(p.master_volume || 0.8);

        if (p.time_signature) {
          const ts = p.time_signature.split("/").map(Number);
          if (ts.length === 2) setTimeSignature(ts);
        }

        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);

        const trackCount = Math.min(Math.max(p.tracks?.length || 1, 1), maxTracks);
        const loaded = Array.from({ length: trackCount }, (_, i) => ({
          ...DEFAULT_TRACK(i),
          ...(p.tracks[i] || {}),
          audioBuffer: null,
          effects: p.tracks[i]?.effects || DEFAULT_EFFECTS(),
          regions: p.tracks[i]?.regions || [],
        }));

        setTracks(loaded);
        setSelectedTrackIndex(0);

        for (let i = 0; i < loaded.length; i++) if (loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url, i);

        setShowProjectList(false);
        setStatus(`Loaded: ${p.name}`);
      }
    } catch (e) {
      setStatus("✗ Load failed");
    }
  };

  const loadProjectList = async () => {
    try {
      const tok = localStorage.getItem("token") || sessionStorage.getItem("token");
      const bu = process.env.REACT_APP_BACKEND_URL || "";
      const res = await fetch(`${bu}/api/studio/projects`, { headers: { Authorization: `Bearer ${tok}` } });
      const data = await res.json();
      if (data?.success) {
        setProjects(data.projects || []);
        setShowProjectList(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const newProject = () => {
    stopEverything();
    setProjectId(null);
    setProjectName("Untitled Project");
    setBpm(120);
    setMasterVolume(0.8);
    setActiveEffectsTrack(null);
    setTimeSignature([4, 4]);
    setTracks(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0);
    setPianoRollNotes([]);
    setPianoRollKey("C");
    setPianoRollScale("major");
    setEditingRegion(null);
    setStatus("New project");
    setViewMode("arrange");
  };

  const addTrack = () => {
    if (tracks.length >= maxTracks) {
      setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks. Upgrade for more.`);
      return;
    }
    const i = tracks.length;
    const typeName = newTrackType === "midi" ? "MIDI" : newTrackType === "bus" ? "Bus" : newTrackType === "aux" ? "Aux" : "Audio";
    setTracks((prev) => [...prev, DEFAULT_TRACK(i, newTrackType)]);
    setSelectedTrackIndex(i);
    setStatus(`${typeName} Track ${i + 1} added (${tracks.length + 1}/${maxTracks})`);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) {
      setStatus("⚠ Must have at least 1 track");
      return;
    }
    setTracks((prev) => prev.filter((_, i) => i !== idx));
    if (activeEffectsTrack === idx) setActiveEffectsTrack(null);
    else if (activeEffectsTrack > idx) setActiveEffectsTrack(activeEffectsTrack - 1);

    setSelectedTrackIndex((prev) => {
      const nextLen = tracks.length - 1;
      if (prev === idx) return Math.max(0, idx - 1);
      if (prev > idx) return prev - 1;
      return Math.min(prev, nextLen - 1);
    });

    setStatus(`Track ${idx + 1} removed`);
  };

  // ── AI callbacks used by AIMixAssistant (keep if your component calls them) ──
  const handleAIApplyVolume = useCallback(
    (trackIndex, value) => {
      updateTrack(trackIndex, { volume: value });
      if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value;
      setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`);
    },
    [updateTrack]
  );

  const handleAIApplyPan = useCallback(
    (trackIndex, value) => {
      updateTrack(trackIndex, { pan: value });
      if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value;
      const label = value === 0 ? "C" : value < 0 ? `L${Math.abs(Math.round(value * 50))}` : `R${Math.round(value * 50)}`;
      setStatus(`AI: Track ${trackIndex + 1} pan → ${label}`);
    },
    [updateTrack]
  );

  const handleAIApplyEQ = useCallback((trackIndex, eqSuggestion) => {
    const updates = {};
    if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db;
    else if (eqSuggestion.frequency < 3000) {
      updates.midGain = eqSuggestion.gain_db;
      updates.midFreq = eqSuggestion.frequency;
    } else updates.highGain = eqSuggestion.gain_db;

    setTracks((prev) =>
      prev.map((t, i) => (i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } }))
    );
    setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`);
  }, []);

  const handleAIApplyCompression = useCallback((trackIndex, comp) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i !== trackIndex
          ? t
          : {
            ...t,
            effects: {
              ...t.effects,
              compressor: {
                threshold: comp.suggested_threshold || -20,
                ratio: comp.suggested_ratio || 4,
                attack: (comp.suggested_attack_ms || 10) / 1000,
                release: (comp.suggested_release_ms || 100) / 1000,
                enabled: true,
              },
            },
          }
      )
    );
    setStatus(`AI: Track ${trackIndex + 1} compressor applied`);
  }, []);

  const handleAIBeatApply = useCallback((patternData) => {
    setStatus(`✓ AI Beat pattern generated: ${patternData.genre} @ ${patternData.bpm} BPM — Switch to Beat Maker to use`);
  }, []);

  const handleArrangerPlay = useCallback(() => {
    if (!isPlaying) startPlayback();
  }, [isPlaying]);

  const handleArrangerStop = useCallback(() => {
    if (isPlaying) stopPlayback();
  }, [isPlaying]);

  const handleArrangerRecord = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording]);

  const handleBpmChange = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx = useCallback((trackIndex) => setActiveEffectsTrack((prev) => (prev === trackIndex ? null : trackIndex)), []);
  const handleEQGraphChange = useCallback(
    (updatedEQ) => {
      if (activeEffectsTrack === null) return;
      setTracks((p) =>
        p.map((t, i) => (i !== activeEffectsTrack ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updatedEQ } } }))
      );
    },
    [activeEffectsTrack]
  );

  // ── MenuBar action router ──
  const handleMenuAction = async (action) => {
    const sel = clamp(selectedTrackIndex, 0, Math.max(0, tracks.length - 1));

    const toggleArmSelected = () => {
      setTracks((p) => p.map((t, idx) => ({ ...t, armed: idx === sel ? !t.armed : false })));
      setSelectedTrackIndex(sel);
      setStatus(`Track ${sel + 1} ${tracks[sel]?.armed ? "disarmed" : "armed"}`);
    };

    const toggleMuteSelected = () => {
      const wasMuted = !!tracks[sel]?.muted;
      updateTrack(sel, { muted: !wasMuted });
      if (trackGainsRef.current[sel]) trackGainsRef.current[sel].gain.value = !wasMuted ? 0 : tracks[sel].volume;
      setStatus(`Track ${sel + 1} ${!wasMuted ? "muted" : "unmuted"}`);
    };

    const toggleSoloSelected = () => {
      updateTrack(sel, { solo: !tracks[sel]?.solo });
      setStatus(`Track ${sel + 1} solo ${tracks[sel]?.solo ? "off" : "on"}`);
    };

    const toggleFxPanel = () => {
      setActiveEffectsTrack((prev) => (prev === sel ? null : sel));
      setStatus(`FX ${activeEffectsTrack === sel ? "closed" : "opened"} for Track ${sel + 1}`);
    };

    switch (action) {
      // File
      case "file:new":
        newProject();
        break;
      case "file:open":
        loadProjectList();
        break;
      case "file:save":
        saveProject();
        break;

      // ✅ Import Audio should go to Arrange
      case "file:importAudio":
        setViewMode("arrange");
        handleImport(sel);
        break;

      case "file:importMidi":
      case "midi:import":
        setViewMode("midi");
        setStatus("MIDI: Use the MIDI Import panel to select a file");
        break;

      case "file:exportMidi":
      case "midi:export":
        exportMidiFile();
        break;

      // View
      case "view:arrange":
        setViewMode("arrange");
        break;
      case "view:console":
        setViewMode("console");
        break;
      case "view:beatmaker":
        setViewMode("beatmaker");
        break;
      case "view:drumkits":
        setViewMode("drumkits");
        break;
      case "view:pianoroll":
        setViewMode("pianoroll");
        break;
      case "view:piano":
        setViewMode("piano");
        break;
      case "view:sounds":
        setViewMode("sounds");
        break;
      case "view:split":
        setViewMode("split");
        break;
      case "view:keyfinder":
        setViewMode("keyfinder");
        break;
      case "view:aibeat":
        setViewMode("aibeat");
        break;

      // ✅ view:kits maps to drumkits now (no Kits view)
      case "view:kits":
        setViewMode("drumkits");
        break;

      case "view:micsim":
        setViewMode("micsim");
        break;
      case "view:aimix":
        setViewMode("aimix");
        break;
      case "view:midi":
        setViewMode("midi");
        break;
      case "view:chords":
        setViewMode("chords");
        break;
      case "view:sampler":
        setViewMode("sampler");
        break;
      case "view:vocal":
        setViewMode("vocal");
        break;
      case "view:plugins":
        setViewMode("plugins");
        break;
      case "view:voicemidi":
        setViewMode("voicemidi");
        break;

      case "view:toggleFx":
        toggleFxPanel();
        break;

      // Transport
      case "transport:playPause":
        if (isPlaying) stopPlayback();
        else startPlayback();
        break;
      case "transport:stop":
        stopEverything();
        break;
      case "transport:record":
        isRecording ? stopRecording() : startRecording();
        break;
      case "transport:rewind":
        rewind();
        break;
      case "transport:tapTempo":
        tapTempo();
        break;

      // Track
      case "track:add":
        addTrack();
        break;
      case "track:remove":
        removeTrack(sel);
        break;
      case "track:arm":
        toggleArmSelected();
        break;
      case "track:mute":
        toggleMuteSelected();
        break;
      case "track:solo":
        toggleSoloSelected();
        break;
      case "track:clear":
        clearTrack(sel);
        break;

      default:
        setStatus(`ℹ Unhandled action: ${action}`);
        break;
    }
  };

  // ===================== RENDER =====================
  const afx = activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null;

  return (
    <div className="daw">
      {/* ═══════════════════ DAW MENU BAR ═══════════════════ */}
      <DAWMenuBar
        viewMode={viewMode}
        isPlaying={isPlaying}
        isRecording={isRecording}
        metronomeOn={metronomeOn}
        countIn={countIn}
        tracks={tracks}
        maxTracks={maxTracks}
        saving={saving}
        mixingDown={mixingDown}
        pianoRollNotes={pianoRollNotes}
        bpm={bpm}
        projectName={projectName}
        onAction={handleMenuAction}
      />

      {/* ═══════════════════ TOP BAR ═══════════════════ */}
      <div className="daw-topbar">
        <div className="daw-topbar-left">
          <button className="daw-icon-btn" onClick={newProject} title="New">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          <button className={`daw-icon-btn ${saving ? "saving" : ""}`} onClick={saveProject} title="Save" disabled={saving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>

          <div className="daw-divider" />
          <input className="daw-project-name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </div>

        {/* Transport — always visible */}
        <div className="daw-transport">
          <button className="daw-transport-btn" onClick={rewind} disabled={isRecording} title="Return to Zero">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z" />
            </svg>
          </button>

          <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>

          <button
            className={`daw-transport-btn daw-play-btn ${isPlaying && !isRecording ? "active" : ""}`}
            onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
            disabled={isRecording}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying && !isRecording ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <button className={`daw-transport-btn daw-rec-btn ${isRecording ? "active" : ""}`} onClick={() => (isRecording ? stopRecording() : startRecording())} title={isRecording ? "Stop Recording" : "Record"}>
            <span className="daw-rec-dot" />
          </button>

          <div className="daw-lcd">
            <span className="daw-lcd-time">{fmt(currentTime)}</span>
            <span className="daw-lcd-sep">|</span>
            <span className="daw-lcd-bpm">{bpm} BPM</span>
          </div>

          <button className={`daw-transport-btn daw-metro-btn ${metronomeOn ? "active" : ""}`} onClick={() => setMetronomeOn(!metronomeOn)} title="Metronome">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L8 22h8L12 2z" />
              <line x1="12" y1="8" x2="18" y2="4" />
            </svg>
          </button>

          <button className={`daw-transport-btn ${countIn ? "active" : ""}`} onClick={() => setCountIn(!countIn)} title="Count-in" style={{ fontSize: "0.7rem", fontWeight: 800 }}>
            1234
          </button>

          {/* ── STEP 5: MIDI device + keyboard octave in toolbar ── */}
          <MidiDeviceIndicator
            devices={instrumentEngine.midiDevices}
            activeDevice={instrumentEngine.activeMidiDevice}
            midiActivity={instrumentEngine.midiActivity}
            onConnect={instrumentEngine.connectMidiDevice}
            onDisconnect={instrumentEngine.disconnectMidiDevice}
          />
          <KeyboardOctaveIndicator
            octave={instrumentEngine.keyboardOctave}
            onOctaveChange={instrumentEngine.setKeyboardOctave}
          />
        </div>

        {/* ═══ View Tabs (✅ Record removed, ✅ Kits removed, ✅ Drum Kits after Beat Maker) ═══ */}
        <div className="daw-topbar-center-tabs">
          <button className={`daw-view-tab ${viewMode === "arrange" ? "active" : ""}`} onClick={() => setViewMode("arrange")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Arrange
          </button>

          <button className={`daw-view-tab ${viewMode === "console" ? "active" : ""}`} onClick={() => setViewMode("console")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="10" r="2" />
              <circle cx="20" cy="14" r="2" />
            </svg>
            Console
          </button>

          <button className={`daw-view-tab ${viewMode === "beatmaker" ? "active" : ""}`} onClick={() => setViewMode("beatmaker")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="2" y="14" width="8" height="8" rx="1" />
              <rect x="14" y="14" width="8" height="8" rx="1" />
            </svg>
            Beat Maker
          </button>

          {/* ✅ Drum Kits directly after Beat Maker */}
          <button className={`daw-view-tab ${viewMode === "drumkits" ? "active" : ""}`} onClick={() => setViewMode("drumkits")} title="Drum Kit Connector — Load kits into Beat Maker pads">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="8" />
              <line x1="12" y1="16" x2="12" y2="22" />
            </svg>
            Drum Kits
          </button>

          <button className={`daw-view-tab ${viewMode === "pianoroll" ? "active" : ""}`} onClick={() => setViewMode("pianoroll")} title="Piano Roll / MIDI Editor">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="22" height="18" rx="2" />
              <line x1="1" y1="9" x2="23" y2="9" />
              <line x1="1" y1="15" x2="23" y2="15" />
              <line x1="8" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="16" y2="21" />
            </svg>
            Piano Roll
          </button>

          <button className={`daw-view-tab ${viewMode === "piano" ? "active" : ""}`} onClick={() => setViewMode("piano")} title="Virtual Piano">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="6" y1="4" x2="6" y2="14" />
              <line x1="10" y1="4" x2="10" y2="14" />
              <line x1="14" y1="4" x2="14" y2="14" />
              <line x1="18" y1="4" x2="18" y2="14" />
            </svg>
            Piano
          </button>

          <button className={`daw-view-tab ${viewMode === "sounds" ? "active" : ""}`} onClick={() => setViewMode("sounds")} title="Sound Browser (Freesound.org)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            Sounds
          </button>

          <button className={`daw-view-tab ${viewMode === "split" ? "active" : ""}`} onClick={() => setViewMode("split")} title="Piano + Drums Split">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="9" rx="1" />
              <rect x="2" y="13" width="20" height="9" rx="1" />
            </svg>
            Split
          </button>

          <button className={`daw-view-tab ${viewMode === "keyfinder" ? "active" : ""}`} onClick={() => setViewMode("keyfinder")} title="Key & Scale Detector">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Key Finder
          </button>

          <button className={`daw-view-tab ai-tab ${viewMode === "aibeat" ? "active" : ""}`} onClick={() => setViewMode("aibeat")} title="AI Beat Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z" />
            </svg>
            AI Beats
          </button>

          <button className={`daw-view-tab ${viewMode === "midi" ? "active" : ""}`} onClick={() => setViewMode("midi")} title="MIDI Import & Hardware">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="8" cy="10" r="1.5" fill="currentColor" />
              <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" />
              <circle cx="8" cy="16" r="1" fill="currentColor" />
              <circle cx="16" cy="16" r="1" fill="currentColor" />
            </svg>
            MIDI
          </button>

          <button className={`daw-view-tab ai-tab ${viewMode === "chords" ? "active" : ""}`} onClick={() => setViewMode("chords")} title="AI Chord Progression Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
              <path d="M3 3l18 18" strokeWidth="1.5" />
            </svg>
            Chords
          </button>

          <button className={`daw-view-tab ${viewMode === "micsim" ? "active" : ""}`} onClick={() => setViewMode("micsim")} title="Mic Simulator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Mic Sim
          </button>

          <button className={`daw-view-tab ai-tab ${viewMode === "aimix" ? "active" : ""}`} onClick={() => setViewMode("aimix")} title="AI Mix Assistant">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="16" cy="8" r="1.5" fill="currentColor" />
            </svg>
            AI Mix
          </button>

          <button className={`daw-view-tab ${viewMode === "sampler" ? "active" : ""}`} onClick={() => setViewMode("sampler")} title="Sampler Instrument">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <line x1="6" y1="6" x2="6" y2="20" />
              <line x1="10" y1="6" x2="10" y2="20" />
              <line x1="14" y1="6" x2="14" y2="20" />
              <line x1="18" y1="6" x2="18" y2="20" />
              <rect x="7" y="6" width="2" height="9" fill="currentColor" rx="0.5" />
              <rect x="15" y="6" width="2" height="9" fill="currentColor" rx="0.5" />
            </svg>
            Sampler
          </button>

          <button className={`daw-view-tab ${viewMode === "vocal" ? "active" : ""}`} onClick={() => setViewMode("vocal")} title="Vocal Processor — FX chain, analyzer, AI coach">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Vocal
          </button>

          <button className={`daw-view-tab ${viewMode === "plugins" ? "active" : ""}`} onClick={() => setViewMode("plugins")} title="Plugin Rack — VST-style effects chain">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <path d="M2 9h20" />
              <path d="M9 21V9" />
            </svg>
            Plugins
          </button>

          <button className={`daw-view-tab ${viewMode === "voicemidi" ? "active" : ""}`} onClick={() => setViewMode("voicemidi")} title="Voice-to-MIDI — Sing or beatbox to control instruments">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <circle cx="12" cy="21" r="2" />
            </svg>
            Voice MIDI
          </button>
        </div>

        {/* I/O & Status */}
        <div className="daw-topbar-right">
          <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} className="daw-input-select">
            <option value="default">Default Mic</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
          <div className="daw-input-meter">
            <div className="daw-input-meter-fill" style={{ width: `${inputLevel * 100}%` }} />
          </div>
          <span className="daw-status">{status}</span>
        </div>
      </div>

      {/* ═══════════════════ PROJECT LIST MODAL ═══════════════════ */}
      {showProjectList && (
        <div className="daw-modal-overlay" onClick={() => setShowProjectList(false)}>
          <div className="daw-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Open Project</h2>
            {projects.length === 0 ? (
              <p className="daw-empty">No saved projects</p>
            ) : (
              <div className="daw-project-list">
                {projects.map((p) => (
                  <button key={p.id} className="daw-project-item" onClick={() => loadProject(p.id)}>
                    <span>{p.name}</span>
                    <span className="daw-project-meta">
                      {p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button className="daw-btn" onClick={() => setShowProjectList(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MAIN VIEW AREA ═══════════════════ */}
      <div className="daw-main">
        {/* ──────── ARRANGE VIEW (STEP 11: pass instrumentEngine + onOpenPianoRoll) ──────── */}
        {viewMode === "arrange" && (
          <ArrangerView
            tracks={tracks}
            setTracks={setTracks}
            bpm={bpm}
            timeSignatureTop={timeSignature[0]}
            timeSignatureBottom={timeSignature[1]}
            masterVolume={masterVolume}
            onMasterVolumeChange={setMasterVolume}
            projectName={projectName}
            userTier={userTier}
            playheadBeat={playheadBeat}
            isPlaying={isPlaying}
            isRecording={isRecording}
            onPlay={handleArrangerPlay}
            onStop={handleArrangerStop}
            onRecord={handleArrangerRecord}
            onSeek={seekToBeat}
            onBpmChange={handleBpmChange}
            onTimeSignatureChange={handleTimeSignatureChange}
            onToggleFx={handleToggleFx}
            onBounce={() => setStatus("ℹ Bounce handler not included in this paste")}
            onSave={saveProject}
            saving={saving}
            instrumentEngine={instrumentEngine}
            onOpenPianoRoll={onOpenPianoRoll}
            onTimelineDoubleClick={handleTimelineDoubleClick}
            MidiRegionPreview={MidiRegionPreview}
          />
        )}

        {/* ──────── RECORD VIEW (kept, but no tab button) ──────── */}
        {viewMode === "record" && (
          <div className="daw-tracks-area">
            <div className="daw-tracks-toolbar">
              <span className="daw-tracks-toolbar-label">TRACKS</span>
              <div className="daw-tracks-toolbar-controls">
                <select className="daw-track-type-select" value={newTrackType} onChange={(e) => setNewTrackType(e.target.value)}>
                  <option value="audio">Audio</option>
                  <option value="midi">MIDI</option>
                  <option value="bus">Bus</option>
                  <option value="aux">Aux</option>
                </select>

                <button className="daw-tracks-toolbar-btn add" onClick={addTrack} disabled={tracks.length >= maxTracks} title="Add Track">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <button className="daw-tracks-toolbar-btn remove" onClick={() => removeTrack(selectedTrackIndex)} disabled={tracks.length <= 1} title="Remove Selected Track">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                <span className="daw-tracks-toolbar-count">
                  {tracks.length}/{maxTracks}
                </span>
              </div>
            </div>

            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={`daw-track-row ${track.armed ? "armed" : ""} ${track.muted ? "muted" : ""} ${track.solo ? "soloed" : ""} ${activeEffectsTrack === i ? "fx-open" : ""
                  } ${selectedTrackIndex === i ? "selected" : ""}`}
                onClick={() => setSelectedTrackIndex(i)}
              >
                <div className="daw-track-strip">
                  <div className="daw-track-color-bar" style={{ background: track.color }} />
                  <input className="daw-track-name-input" value={track.name} onChange={(e) => updateTrack(i, { name: e.target.value })} onClick={(e) => e.stopPropagation()} />

                  {/* ── STEP 4: Instrument selector on MIDI track headers ── */}
                  {(track.trackType === 'midi' || track.trackType === 'instrument') && (
                    <InstrumentSelector
                      trackIndex={i}
                      currentInstrument={instrumentEngine.getTrackInstrument(i)}
                      onSelectGM={(idx, program, name) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.GM_SYNTH, program, name })
                      }
                      onSelectDrumKit={(idx) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.DRUM_KIT })
                      }
                      onSelectSampler={(idx) => {
                        updateTrack(idx, { armed: true });
                        setViewMode('sounds');   // opens Sound Browser
                      }}
                      onSelectSampleKit={(idx) =>
                        instrumentEngine.setTrackInstrument(idx, { source: SOURCE_TYPES.SAMPLE_KIT })
                      }
                      compact
                    />
                  )}

                  <div className="daw-track-btns">
                    <button
                      className={`daw-badge r ${track.armed ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTracks((p) => p.map((t, idx) => ({ ...t, armed: idx === i ? !t.armed : false })));
                      }}
                    >
                      R
                    </button>

                    <button
                      className={`daw-badge m ${track.muted ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(i, { muted: !track.muted });
                        if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = !track.muted ? 0 : track.volume;
                      }}
                    >
                      M
                    </button>

                    <button
                      className={`daw-badge s ${track.solo ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTrack(i, { solo: !track.solo });
                      }}
                    >
                      S
                    </button>
                  </div>

                  <div className="daw-track-vol">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateTrack(i, { volume: v });
                        if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = v;
                      }}
                      className="daw-knob-slider"
                    />
                    <span className="daw-vol-val">{Math.round(track.volume * 100)}</span>
                  </div>

                  <div className="daw-track-pan">
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={track.pan}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        updateTrack(i, { pan: v });
                        if (trackPansRef.current[i]) trackPansRef.current[i].pan.value = v;
                      }}
                      className="daw-pan-slider"
                    />
                    <span className="daw-pan-val">{track.pan === 0 ? "C" : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 50))}` : `R${Math.round(track.pan * 50)}`}</span>
                  </div>

                  <div className="daw-track-actions-strip">
                    <button className="daw-tiny-btn" onClick={() => handleImport(i)} title="Import">
                      Import
                    </button>
                    <button className="daw-tiny-btn" onClick={() => clearTrack(i)} title="Clear">
                      Clear
                    </button>
                    <button className="daw-tiny-btn" onClick={() => setActiveEffectsTrack(activeEffectsTrack === i ? null : i)} title="FX">
                      FX
                    </button>
                    <button className="daw-tiny-btn" onClick={() => removeTrack(i)} title="Remove">
                      Remove
                    </button>
                  </div>
                </div>

                <div className="daw-track-region">
                  {track.audioBuffer ? (
                    <div className="daw-region-block" style={{ "--region-color": track.color }}>
                      <div className="daw-region-label">{track.name}</div>
                      <canvas ref={(el) => (canvasRefs.current[i] = el)} width={1200} height={96} className="daw-waveform-canvas" />
                    </div>
                  ) : (
                    <div className="daw-region-empty">{track.armed ? <span className="daw-armed-label">● Armed</span> : <span>Empty</span>}</div>
                  )}
                  {duration > 0 && <div className="daw-track-playhead" style={{ left: `${(currentTime / Math.max(duration, 1)) * 100}%` }} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "console" && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t, i) => {
                const meter = meterLevels[i] || { peak: 0 };
                const isAudible = !t.muted && (!hasSolo || t.solo);

                return (
                  <div
                    key={track.id}
                    className={`daw-channel ${selectedTrack === i ? "selected" : ""}`}
                    onClick={() => setSelectedTrack(i)}
                  >
                    {/* Routing */}
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-label">Routing</span>
                      <span className="daw-ch-routing-value">
                        {t.input || "Default In"} → {t.output || "Stereo Out"}
                      </span>
                    </div>

                    {/* Inserts */}
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">Inserts</div>

                      {Array.from({ length: 5 }).map((_, idx) => {
                        const ins = (t.inserts || [])[idx] || null;

                        return (
                          <div
                            key={idx}
                            className={`daw-ch-insert-slot ${ins?.enabled ? "active" : "inactive"} ${ins?.type || ""} ${!ins ? "empty" : ""}`}
                            title={ins?.name ? ins.name : `Insert ${idx + 1} (click to add)`}
                            onClick={(e) => {
                              e.stopPropagation();

                              // Select this track in console + globally
                              setSelectedTrack(i);
                              setSelectedTrackIndex(i);

                              // Option A (quick): open your FX panel for that track
                              setActiveEffectsTrack(i);

                              // Option B (recommended): jump to the Plugin Rack view
                              // setViewMode("plugins");

                              setStatus(ins ? `Insert ${idx + 1}: ${ins.name}` : `Add plugin to Insert ${idx + 1} on Track ${i + 1}`);
                            }}
                          >
                            {ins?.name || "empty"}
                          </div>
                        );
                      })}
                    </div>

                    {/* M / S / e */}
                    <div className="daw-ch-controls">
                      <div
                        className={`daw-ch-badge ${t.muted ? "m-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextMuted = !t.muted;
                          updateTrack(i, { muted: nextMuted });

                          const audible = !nextMuted && (!hasSolo || t.solo);
                          if (trackGainsRef.current[i]) {
                            trackGainsRef.current[i].gain.value = audible ? t.volume : 0;
                          }
                        }}
                      >
                        M
                      </div>

                      <div
                        className={`daw-ch-badge ${t.solo ? "s-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextSolo = !t.solo;
                          updateTrack(i, { solo: nextSolo });

                          // recompute solo state after toggle
                          const willHaveSolo = tracks.some((x, idx) => (idx === i ? nextSolo : x.solo));

                          // apply solo/mute gains to ALL tracks
                          tracks.forEach((x, idx) => {
                            const gainNode = trackGainsRef.current[idx];
                            if (!gainNode) return;

                            const muted = idx === i ? x.muted : x.muted; // same
                            const solo = idx === i ? nextSolo : x.solo;

                            const audible = !muted && (!willHaveSolo || solo);
                            gainNode.gain.value = audible ? x.volume : 0;
                          });
                        }}
                      >
                        S
                      </div>

                      <div
                        className={`daw-ch-badge ${selectedTrack === i ? "e-on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          // optional: toggle FX panel for this track
                          setSelectedTrack(i);
                        }}
                      >
                        e
                      </div>
                    </div>

                    {/* Pan */}
                    <div className="daw-ch-pan">
                      <div
                        className="daw-ch-pan-display"
                        onClick={(e) => {
                          e.stopPropagation();
                          // optional: could open a pan knob modal
                        }}
                        title="Pan"
                      >
                        {t.pan >= 0 ? `R ${(t.pan * 100).toFixed(0)}` : `L ${Math.abs(t.pan * 100).toFixed(0)}`}
                      </div>
                    </div>

                    {/* Meter + Fader */}
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-meter" title="Level">
                        <div className="daw-ch-meter-bar">
                          <div
                            className="daw-ch-meter-fill"
                            style={{ height: `${Math.max(0, Math.min(1, meter.peak)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="daw-ch-fader">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={t.volume}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateTrack(i, { volume: v });

                            // only write to gain if track is audible in solo/mute logic
                            const audible = !t.muted && (!hasSolo || t.solo);
                            if (trackGainsRef.current[i]) {
                              trackGainsRef.current[i].gain.value = audible ? v : 0;
                            }
                          }}
                        />
                      </div>

                      <div className="daw-ch-vol-display">
                        <div className="daw-ch-vol-val">{(t.volume * 100).toFixed(0)}</div>
                      </div>
                    </div>

                    {/* Automation */}
                    <div className="daw-ch-automation">
                      <div className={`daw-ch-rw ${t.readAutomation ? "active" : ""}`}>R</div>
                      <div className={`daw-ch-rw ${t.writeAutomation ? "active" : ""}`}>W</div>
                    </div>

                    {/* Record arm */}
                    <div className="daw-ch-rec">
                      <button
                        className={`daw-ch-rec-btn ${t.armed ? "armed" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTrack(i, { armed: !t.armed });
                        }}
                        title="Record Enable"
                      />
                    </div>

                    {/* Name */}
                    <div className="daw-ch-name">
                      <input
                        className="daw-ch-name-input"
                        value={t.name}
                        onChange={(e) => updateTrack(i, { name: e.target.value })}
                      />
                      <div className="daw-ch-number">
                        <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙️"}</span>
                        <span>{i + 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-label">Routing</span>
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>

                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">Inserts</div>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <div key={k} className="daw-ch-insert-slot empty">
                      empty
                    </div>
                  ))}
                </div>

                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                </div>

                <div className="daw-ch-pan">
                  <div className="daw-ch-pan-display">C</div>
                </div>

                <div className="daw-ch-fader-area">
                  <div className="daw-ch-meter">
                    <div className="daw-ch-meter-bar">
                      <div
                        className="daw-ch-meter-fill"
                        style={{ height: `${Math.max(0, Math.min(1, masterMeter?.peak || 0)) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="daw-ch-fader">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={masterVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setMasterVolume(v);
                        if (masterGainRef.current) masterGainRef.current.gain.value = v;
                      }}
                    />
                  </div>

                  <div className="daw-ch-vol-display">
                    <div className="daw-ch-vol-val">{(masterVolume * 100).toFixed(0)}</div>
                  </div>
                </div>

                <div className="daw-ch-name">
                  <div style={{ fontWeight: 700, fontSize: "0.62rem", color: "#ddeeff" }}>MASTER</div>
                  <div className="daw-ch-number">Stereo Out</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ──────── BEAT MAKER VIEW (STEP 9: onExportToArrange) ──────── */}
        {viewMode === "beatmaker" && (
          <SamplerBeatMaker
            onExport={handleBeatExport}
            onClose={() => setViewMode("arrange")} // ✅ was record
            isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => {
              const idx = selectedTrackIndex;
              updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
              setViewMode("arrange");
              setStatus(`Beat bounced to Track ${idx + 1}`);
            }}
            onOpenSampler={() => setViewMode("sampler")}
            incomingSample={window.__spx_sampler_export || null}
            onExportToArrange={(midiNotes) => {
              // STEP 9B: Beat Maker → Arrange (export patterns as MIDI regions)
              // Find or create a drum kit track
              let drumTrackIdx = tracks.findIndex((t, idx) =>
                (t.trackType === "midi" || t.trackType === "instrument") &&
                instrumentEngine.getTrackInstrument(idx)?.isDrum
              );

              if (drumTrackIdx === -1) {
                // Auto-create a drum track
                const newTrack = {
                  name: 'Drums',
                  trackType: 'midi',
                  instrument: { program: 0, name: 'Drum Kit' },
                  volume: 0.8, pan: 0, muted: false, solo: false, armed: false,
                  color: '#e8652b', regions: [],
                  effects: DEFAULT_EFFECTS(),
                };
                setTracks(prev => {
                  drumTrackIdx = prev.length;
                  return [...prev, newTrack];
                });
                // Assign drum kit instrument
                setTimeout(() => {
                  instrumentEngine.setTrackInstrument(drumTrackIdx, { source: SOURCE_TYPES.DRUM_KIT });
                }, 100);
              }

              // Create MIDI region from beat pattern (1 bar in 4/4 = 4 beats)
              const region = createMidiRegionFromNotes(midiNotes, 'Beat Pattern');

              // Place at playhead position (or start if stopped)
              region.startBeat = isPlaying ? playheadBeat : 0;

              setTracks(prev => prev.map((t, i) =>
                i === drumTrackIdx
                  ? { ...t, regions: [...(t.regions || []), region] }
                  : t
              ));

              setStatus(`🥁 Beat pattern exported to Arrange → Track ${drumTrackIdx + 1}`);
              setViewMode('arrange');
            }}
          />
        )}

        {/* ──────── DRUM KITS VIEW ──────── */}
        {viewMode === "drumkits" && (
          <div className="daw-drumkits-view">
            <DrumKitConnector
              onClose={() => setViewMode("beatmaker")}
              isEmbedded={true}
              onSendToBeatMaker={(kit) => {
                setStatus(`✓ Drum kit ready — open Beat Maker to load pads`);
                setViewMode("beatmaker");
              }}
            />
          </div>
        )}

        {/* ──────── PIANO ROLL VIEW ──────── */}
        {viewMode === "pianoroll" && (
          <div className="daw-pianoroll-view">
            <PianoRoll
              notes={pianoRollNotes}
              onNotesChange={handlePianoRollNotesChange}
              bpm={bpm}
              timeSignature={timeSignature}
              musicalKey={pianoRollKey}
              scale={pianoRollScale}
              isPlaying={isPlaying}
              currentBeat={playheadBeat}
              audioContext={audioCtxRef.current}
              onExport={handlePianoRollExport}
              onClose={() => setViewMode("beatmaker")}
              isEmbedded={true}
              editingRegion={editingRegion}
              onSaveToRegion={savePianoRollToRegion}
            />
          </div>
        )}

        {/* ──────── MIDI VIEW ──────── */}
        {viewMode === "midi" && (
          <div className="daw-midi-view" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", height: "100%", overflow: "auto" }}>
            <MidiImporter onImport={handleMidiImport} onClose={() => setViewMode("pianoroll")} isEmbedded={true} />
            <MidiHardwareInput onNoteOn={handleMidiNoteOn} onNoteOff={handleMidiNoteOff} isEmbedded={true} />
            <QuantizePanel notes={pianoRollNotes} onQuantize={(q) => setPianoRollNotes(q)} bpm={bpm} timeSignature={timeSignature} isEmbedded={true} />
          </div>
        )}

        {/* ──────── CHORDS VIEW ──────── */}
        {viewMode === "chords" && (
          <div className="daw-chords-view">
            <ChordProgressionGenerator
              musicalKey={pianoRollKey}
              scale={pianoRollScale}
              bpm={bpm}
              timeSignature={timeSignature}
              onInsertChords={handleChordInsert}
              onKeyChange={handleChordKeyChange}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode("pianoroll")}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── PIANO VIEW ──────── */}
        {viewMode === "piano" && (
          <div className="daw-piano-view">
            <VirtualPiano audioContext={audioCtxRef.current} onRecordingComplete={() => { }} embedded={true} />
          </div>
        )}

        {/* ──────── SOUNDS VIEW (STEP 2: Sound Browser → instrument track) ──────── */}
        {viewMode === "sounds" && (
          <div className="daw-freesound-view">
            <FreesoundBrowser
              audioContext={audioCtxRef.current}
              onSoundSelect={(audioBuffer, name, audioUrl) => {
                // STEP 2: Check if an armed MIDI/instrument track exists
                const armedMidi = tracks.findIndex(t =>
                  t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
                );
                if (armedMidi !== -1) {
                  // Load as instrument sample onto the armed MIDI track
                  instrumentEngine.loadSampleOntoTrack(armedMidi, audioBuffer, name, 60);
                  setStatus(`🎵 "${name}" → Track ${armedMidi + 1} — play keys to hear`);
                } else {
                  // Fallback: original behavior — load onto armed audio track or send to Beat Maker
                  const ai = tracks.findIndex((t) => t.armed);
                  if (ai !== -1) {
                    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" });
                    createRegionFromImport(ai, audioBuffer, name || "Freesound Sample", audioUrl);
                    setStatus(`✓ "${name}" loaded → Track ${ai + 1}`);
                  } else {
                    // Send to Beat Maker
                    window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() };
                    setViewMode('beatmaker');
                    setStatus(`Sample "${name}" sent to Beat Maker`);
                  }
                }
              }}
              onClose={() => setViewMode("arrange")} // ✅ was record
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── SPLIT VIEW ──────── */}
        {viewMode === "split" && (
          <div className="daw-split-view">
            <PianoDrumSplit audioContext={audioCtxRef.current} onRecordingComplete={() => { }} isEmbedded={true} />
          </div>
        )}

        {/* ──────── KEYFINDER VIEW ──────── */}
        {viewMode === "keyfinder" && (
          <div className="daw-keyfinder-view">
            <KeyFinder tracks={tracks} audioContext={audioCtxRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true} />
          </div>
        )}

        {/* ──────── AI BEATS VIEW ──────── */}
        {viewMode === "aibeat" && (
          <div className="daw-aibeat-view">
            <AIBeatAssistant onApplyPattern={handleAIBeatApply} onClose={() => setViewMode("beatmaker")} isEmbedded={true} />
          </div>
        )}

        {/* ──────── MIC SIM VIEW ──────── */}
        {viewMode === "micsim" && (
          <div className="daw-micsim-view">
            <MicSimulator
              audioContext={audioCtxRef.current}
              liveStream={micSimStream}
              onRecordingComplete={(blob) => {
                const ai = tracks.findIndex((t) => t.armed);
                if (ai === -1) {
                  setStatus("⚠ Arm a track first to receive Mic Sim recording");
                  return;
                }
                const ctx = getCtx();
                const audioUrl = URL.createObjectURL(blob);
                blob
                  .arrayBuffer()
                  .then((ab) => ctx.decodeAudioData(ab))
                  .then((buf) => {
                    updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
                    createRegionFromRecording(ai, buf, audioUrl);
                    uploadTrack(blob, ai);
                    setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`);
                    setViewMode("arrange"); // ✅ was record
                  })
                  .catch((e) => setStatus(`✗ ${e.message}`));
              }}
              onClose={() => setViewMode("arrange")} // ✅ was record
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── AI MIX VIEW ──────── */}
        {viewMode === "aimix" && (
          <div className="daw-aimix-view">
            <AIMixAssistant
              tracks={tracks}
              bpm={bpm}
              timeSignature={timeSignature}
              onApplyVolume={handleAIApplyVolume}
              onApplyPan={handleAIApplyPan}
              onApplyEQ={handleAIApplyEQ}
              onApplyCompression={handleAIApplyCompression}
              onClose={() => setViewMode("arrange")} // ✅ was record
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── SAMPLER VIEW ──────── */}
        {viewMode === "sampler" && (
          <div className="daw-sampler-view">
            <SamplerInstrument
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode("beatmaker")}
              onSendToTrack={(audioBuffer, name) => {
                const idx = selectedTrackIndex;
                updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
                setViewMode("arrange"); // ✅ was record
                setStatus(`Sample sent → Track ${idx + 1}`);
              }}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── VOCAL VIEW ──────── */}
        {viewMode === "vocal" && (
          <div className="daw-vocal-view">
            <VocalProcessor audioContext={audioCtxRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true} />
          </div>
        )}

        {/* ──────── PLUGINS VIEW ──────── */}
        {viewMode === "plugins" && (
          <div className="daw-plugins-view" style={{ height: "100%" }}>
            <PluginRackPanel engine={getEngine?.()} TrackGraph={TrackGraph} onClose={() => setViewMode("arrange")} isEmbedded={true} />
          </div>
        )}

        {/* ──────── VOICE MIDI VIEW (STEP 12: Voice → MIDI → Arrange) ──────── */}
        {viewMode === "voicemidi" && (
          <div className="daw-voicemidi-view">
            <VoiceToMIDI
              audioContext={audioCtxRef.current}
              bpm={bpm}
              isEmbedded={true}

              // STEP 12A: Route live notes through instrumentEngine for real-time monitoring
              onNoteOn={({ note, velocity, channel }) => {
                const armedIdx = tracks.findIndex(t =>
                  t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
                );
                if (armedIdx !== -1) {
                  instrumentEngine.playNoteOnTrack(armedIdx, note, velocity);
                }
              }}
              onNoteOff={({ note, channel }) => {
                const armedIdx = tracks.findIndex(t =>
                  t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
                );
                if (armedIdx !== -1) {
                  instrumentEngine.stopNoteOnTrack(armedIdx, note);
                }
              }}

              // STEP 12: When recording stops, convert recorded events → MIDI region
              onNotesGenerated={(notes) => {
                if (!notes?.length) return;

                const armedIdx = tracks.findIndex(t =>
                  t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
                );
                if (armedIdx === -1) return;

                // VoiceToMIDI gives us notes with time in seconds.
                // Convert to beats: beat = time * (bpm / 60)
                const beatsPerSec = bpm / 60;
                const midiNotes = notes.map((n, i) => ({
                  id: `voice_${Date.now()}_${i}`,
                  note: n.note,
                  velocity: n.velocity || 80,
                  startBeat: (n.startTime || n.time || 0) * beatsPerSec,
                  duration: Math.max((n.duration || 0.25) * beatsPerSec, 0.125),
                }));

                // Determine region name from voice mode
                const inst = instrumentEngine.getTrackInstrument(armedIdx);
                const regionName = inst?.isDrum ? 'Beatbox Pattern' : 'Voice Melody';

                const region = createMidiRegionFromNotes(midiNotes, regionName);
                // Place at playhead or start
                if (playheadBeat > 0) {
                  const offset = region.startBeat;
                  region.startBeat = playheadBeat;
                  region.notes = region.notes.map(n => ({
                    ...n,
                    startBeat: n.startBeat - offset,
                  }));
                }

                setTracks(prev => prev.map((t, i) =>
                  i === armedIdx
                    ? { ...t, regions: [...(t.regions || []), region] }
                    : t
                ));

                setStatus(`🎤 ${midiNotes.length} notes from voice → Track ${armedIdx + 1}`);
              }}

              onSendToTrack={(audioBuffer, name) => {
                const idx = selectedTrackIndex;
                updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
                setViewMode("arrange"); // ✅ was record
                setStatus(`Vocal MIDI render → Track ${idx + 1}`);
              }}
              onClose={() => setViewMode("arrange")}
            />
          </div>
        )}
      </div>

      {/* Optional FX Graph Panel */}
      {afx && (
        <div className="daw-fx-panel">
          <ParametricEQGraph eq={afx.effects?.eq} onChange={handleEQGraphChange} />
          <button className="daw-btn" onClick={() => setActiveEffectsTrack(null)}>
            Close FX
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordingStudio;