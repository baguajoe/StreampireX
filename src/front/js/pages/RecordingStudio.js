// =============================================================================
// RecordingStudio.js - Multi-Track DAW (Cubase-Inspired)
// =============================================================================
// Location: src/front/js/pages/RecordingStudio.js
// Route: /recording-studio
// Pure Web Audio API — zero external audio libraries
// Effects: EQ, Compressor, Reverb, Delay, Distortion, Filter per track
// Views: Record | Arrange | Console | Beat Maker | Piano Roll | Piano | Sounds | Split | Key Finder | AI Beats | Kits | Mic Sim | AI Mix | MIDI | Chords
// Track limits: Free=4, Starter=8, Creator=16, Pro=32
//
// NEW:
// - DAWMenuBar integrated (import + JSX)
// - onAction handler wired to RecordingStudio functions
// - selectedTrackIndex for Track/Edit actions
// - Simple MIDI export (pianoRollNotes -> .mid download)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ArrangerView from '../component/ArrangerView';
import AIMixAssistant from '../component/AIMixAssistant';
import SamplerBeatMaker from '../component/SamplerBeatMaker';
import SamplerInstrument from '../component/SamplerInstrument';
import MicSimulator from '../component/MicSimulator';
import VirtualPiano from '../component/VirtualPiano';
import FreesoundBrowser from '../component/FreesoundBrowser';
import KeyFinder from '../component/KeyFinder';
import AIBeatAssistant from '../component/AIBeatAssistant';
import PianoDrumSplit from '../component/PianoDrumSplit';
import SoundKitManager from '../component/SoundKitManager';
import ParametricEQGraph from '../component/ParametricEQGraph';
// ── NEW: Piano Roll / MIDI / Chord / Quantize imports ──
import PianoRoll from '../component/PianoRoll';
import MidiImporter from '../component/MidiImporter';
import MidiHardwareInput from '../component/MidiHardwareInput';
import ChordProgressionGenerator from '../component/ChordProgressionGenerator';
import { QuantizePanel } from '../component/QuantizeEngine';
// ── NEW: DAW Menu Bar ──
import DAWMenuBar from '../component/DAWMenuBar';
// ── NEW: Vocal Processor ──
import VocalProcessor from '../component/VocalProcessor';

import '../../styles/RecordingStudio.css';
import '../../styles/ArrangerView.css';
import '../../styles/AIMixAssistant.css';
import '../../styles/SamplerBeatMaker.css';
import '../../styles/SamplerInstrument.css';
import '../../styles/MicSimulator.css';
import '../../styles/VirtualPiano.css';
import '../../styles/FreesoundBrowser.css';
import '../../styles/KeyFinder.css';
import '../../styles/AIBeatAssistant.css';
import '../../styles/PianoDrumSplit.css';
import '../../styles/SoundKitManager.css';
// ── NEW: Piano Roll / Chord CSS ──
import '../../styles/PianoRoll.css';
import '../../styles/ChordProgressionGenerator.css';

import '../../styles/DAWMenuBar.css';
import '../../styles/VocalProcessor.css';
import '../../styles/VocalTools.css';

const TRACK_COLORS = [
  '#34c759', '#ff9500', '#007aff', '#af52de', '#ff3b30', '#5ac8fa', '#ff2d55', '#ffcc00',
  '#30d158', '#ff6b35', '#0a84ff', '#bf5af2', '#ff453a', '#64d2ff', '#ff375f', '#ffd60a',
  '#32d74b', '#ff8c00', '#0066cc', '#9b59b6', '#e74c3c', '#2ecc71', '#e91e63', '#f39c12',
  '#27ae60', '#d35400', '#2980b9', '#8e44ad', '#c0392b', '#16a085', '#e84393', '#fdcb6e'
];

const TIER_TRACK_LIMITS = { free: 4, starter: 8, creator: 16, pro: 32 };
const DEFAULT_MAX = 4;

const DEFAULT_EFFECTS = () => ({
  eq: { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: false },
  compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, enabled: false },
  reverb: { mix: 0.2, decay: 2.0, enabled: false },
  delay: { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion: { amount: 0, enabled: false },
  filter: { type: 'lowpass', frequency: 20000, Q: 1, enabled: false },
  limiter: { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05, enabled: false },
});

const DEFAULT_TRACK = (i, type = 'audio') => ({
  name: `${type === 'midi' ? 'MIDI' : type === 'bus' ? 'Bus' : type === 'aux' ? 'Aux' : 'Audio'} ${i + 1}`,
  trackType: type,
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

/**
 * Minimal MIDI writer (SMF format 0 / single track).
 * Notes expected: [{ note, velocity, startBeat, duration }]
 */
const midiFromNotes = ({ notes = [], bpm = 120, ppq = 480 }) => {
  const sorted = [...notes]
    .filter(n => Number.isFinite(n.note) && Number.isFinite(n.startBeat) && Number.isFinite(n.duration))
    .map(n => ({
      note: clamp(Math.round(n.note), 0, 127),
      vel: clamp(
        Math.round((n.velocity ?? 0.9) <= 1 ? (n.velocity ?? 0.9) * 127 : (n.velocity ?? 100)),
        1, 127
      ),
      startTick: Math.max(0, Math.round((n.startBeat || 0) * ppq)),
      endTick: Math.max(0, Math.round(((n.startBeat || 0) + (n.duration || 0)) * ppq)),
      channel: clamp(Math.round(n.channel ?? 0), 0, 15),
    }))
    .filter(n => n.endTick > n.startTick)
    .sort((a, b) => a.startTick - b.startTick);

  const events = [];
  const mpqn = Math.round(60000000 / (bpm || 120));
  events.push({ tick: 0, bytes: [0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF] });

  for (const n of sorted) {
    events.push({ tick: n.startTick, bytes: [0x90 | n.channel, n.note, n.vel] });
    events.push({ tick: n.endTick, bytes: [0x80 | n.channel, n.note, 0x00] });
  }

  const lastTick = events.reduce((m, e) => Math.max(m, e.tick), 0);
  events.push({ tick: lastTick + 1, bytes: [0xFF, 0x2F, 0x00] });
  events.sort((a, b) => a.tick - b.tick);

  const trackData = [];
  let prevTick = 0;

  const writeVarLen = (val) => {
    let v = val >>> 0;
    let buffer = v & 0x7F;
    while ((v >>= 7)) { buffer <<= 8; buffer |= ((v & 0x7F) | 0x80); }
    while (true) { trackData.push(buffer & 0xFF); if (buffer & 0x80) buffer >>= 8; else break; }
  };

  for (const e of events) {
    const delta = Math.max(0, e.tick - prevTick);
    writeVarLen(delta);
    trackData.push(...e.bytes);
    prevTick = e.tick;
  }

  const header = [];
  const pushStr = (s) => s.split('').forEach(ch => header.push(ch.charCodeAt(0)));
  const pushU16 = (n) => { header.push((n >> 8) & 0xFF, n & 0xFF); };
  const pushU32 = (n) => { header.push((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF); };

  pushStr('MThd'); pushU32(6); pushU16(0); pushU16(1); pushU16(ppq);

  const trackHeader = [];
  const pushStr3 = (s) => s.split('').forEach(ch => trackHeader.push(ch.charCodeAt(0)));
  const pushU32b = (n) => trackHeader.push((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
  pushStr3('MTrk'); pushU32b(trackData.length);

  return new Uint8Array([...header, ...trackHeader, ...trackData]);
};

const RecordingStudio = ({ user }) => {
  // ── Tier-based track limit ──
  const userTier = (user?.subscription_tier || user?.tier || 'free').toLowerCase();
  const maxTracks = TIER_TRACK_LIMITS[userTier] || DEFAULT_MAX;

  const [viewMode, setViewMode] = useState('record');
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showProjectList, setShowProjectList] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState([4, 4]);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [tracks, setTracks] = useState(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));

  // ── Selected track (for DAWMenuBar Track/Edit actions) ──
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [newTrackType, setNewTrackType] = useState('audio');

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [countIn, setCountIn] = useState(false);

  const [inputDevices, setInputDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('default');
  const [inputLevel, setInputLevel] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [saving, setSaving] = useState(false);
  const [mixingDown, setMixingDown] = useState(false);
  const [activeEffectsTrack, setActiveEffectsTrack] = useState(null);
  const [micSimStream, setMicSimStream] = useState(null);
  const [meterLevels, setMeterLevels] = useState([]);

  const [pianoRollNotes, setPianoRollNotes] = useState([]);
  const [pianoRollKey, setPianoRollKey] = useState('C');
  const [pianoRollScale, setPianoRollScale] = useState('major');

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

  // Tap tempo tracking
  const tapTimesRef = useRef([]);

  const playheadBeat = useMemo(() => secondsToBeat(currentTime, bpm), [currentTime, bpm]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(d => {
      setInputDevices(d.filter(x => x.kind === 'audioinput'));
    }).catch(console.error);
    return () => { stopEverything(); if (audioCtxRef.current) audioCtxRef.current.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [masterVolume]);

  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume; }, [masterVolume]);

  const getReverbBuf = useCallback((ctx, decay = 2) => {
    const len = ctx.sampleRate * decay;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }, []);

  const updateTrack = useCallback((i, u) => setTracks(p => p.map((t, idx) => idx === i ? { ...t, ...u } : t)), []);
  const updateEffect = (ti, fx, param, val) => setTracks(p => p.map((t, i) => i !== ti ? t : { ...t, effects: { ...t.effects, [fx]: { ...t.effects[fx], [param]: val } } }));
  const hasSolo = tracks.some(t => t.solo);
  const isAudible = (t) => !t.muted && (!hasSolo || t.solo);

  // ── Waveform drawing ──
  const drawWaveform = useCallback((el, buf, color) => {
    if (!el || !buf) return;
    const c = el.getContext('2d'), w = el.width, h = el.height, data = buf.getChannelData(0), step = Math.ceil(data.length / w), mid = h / 2;
    c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.03)'; c.lineWidth = 1;
    for (let x = 0; x < w; x += 50) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.moveTo(0, mid); c.lineTo(w, mid); c.stroke();
    c.fillStyle = color + '40'; c.beginPath(); c.moveTo(0, mid);
    for (let i = 0; i < w; i++) { let mx = -1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d > mx) mx = d; } c.lineTo(i, mid - (mx * mid * 0.9)); }
    for (let i = w - 1; i >= 0; i--) { let mn = 1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d < mn) mn = d; } c.lineTo(i, mid - (mn * mid * 0.9)); }
    c.closePath(); c.fill();
    c.strokeStyle = color; c.lineWidth = 0.8; c.beginPath();
    for (let i = 0; i < w; i++) { let mx = -1; for (let j = 0; j < step; j++) { const d = data[i * step + j]; if (d !== undefined && d > mx) mx = d; } const y = mid - (mx * mid * 0.9); i === 0 ? c.moveTo(i, y) : c.lineTo(i, y); }
    c.stroke();
  }, []);

  useEffect(() => { tracks.forEach((t, i) => { if (t.audioBuffer && canvasRefs.current[i]) drawWaveform(canvasRefs.current[i], t.audioBuffer, t.color); }); }, [tracks, drawWaveform]);

  const loadAudioBuffer = async (url, ti) => {
    try { const ctx = getCtx(); const r = await fetch(url); const ab = await r.arrayBuffer(); const buf = await ctx.decodeAudioData(ab); updateTrack(ti, { audioBuffer: buf, audio_url: url }); return buf; }
    catch (e) { console.error(e); return null; }
  };

  // ── Effects chain builder ──
  const buildFxChain = (ctx, track) => {
    const nodes = [], fx = track.effects;
    if (fx.eq.enabled) {
      const lo = ctx.createBiquadFilter(); lo.type = 'lowshelf'; lo.frequency.value = 320; lo.gain.value = fx.eq.lowGain;
      const mi = ctx.createBiquadFilter(); mi.type = 'peaking'; mi.frequency.value = fx.eq.midFreq; mi.Q.value = 1.5; mi.gain.value = fx.eq.midGain;
      const hi = ctx.createBiquadFilter(); hi.type = 'highshelf'; hi.frequency.value = 3200; hi.gain.value = fx.eq.highGain;
      nodes.push(lo, mi, hi);
    }
    if (fx.filter.enabled) { const f = ctx.createBiquadFilter(); f.type = fx.filter.type; f.frequency.value = fx.filter.frequency; f.Q.value = fx.filter.Q; nodes.push(f); }
    if (fx.compressor.enabled) { const c = ctx.createDynamicsCompressor(); c.threshold.value = fx.compressor.threshold; c.ratio.value = fx.compressor.ratio; c.attack.value = fx.compressor.attack; c.release.value = fx.compressor.release; nodes.push(c); }
    if (fx.distortion.enabled && fx.distortion.amount > 0) {
      const ws = ctx.createWaveShaper(); const amt = fx.distortion.amount; const s = 44100; const curve = new Float32Array(s);
      for (let i = 0; i < s; i++) { const x = i * 2 / s - 1; curve[i] = (3 + amt) * x * 20 * (Math.PI / 180) / (Math.PI + amt * Math.abs(x)); }
      ws.curve = curve; ws.oversample = '4x'; nodes.push(ws);
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
    if (fx.reverb.enabled && fx.reverb.mix > 0) { const conv = ctx.createConvolver(); conv.buffer = getReverbBuf(ctx, fx.reverb.decay); const g = ctx.createGain(); g.gain.value = fx.reverb.mix; dry.connect(conv); conv.connect(g); g.connect(master); }
    if (fx.delay.enabled && fx.delay.mix > 0) { const d = ctx.createDelay(5); d.delayTime.value = fx.delay.time; const fb = ctx.createGain(); fb.gain.value = fx.delay.feedback; const mx = ctx.createGain(); mx.gain.value = fx.delay.mix; dry.connect(d); d.connect(fb); fb.connect(d); d.connect(mx); mx.connect(master); }
  };

  // ── Real-time meter animation ──
  const startMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) cancelAnimationFrame(meterAnimRef.current);
    const animate = () => {
      const analysers = trackAnalysersRef.current;
      if (!analysers || analysers.length === 0) { setMeterLevels([]); return; }
      const levels = analysers.map(pair => {
        if (!pair || !pair.left || !pair.right) return { left: 0, right: 0, peak: 0 };
        const dataL = new Uint8Array(pair.left.frequencyBinCount); pair.left.getByteFrequencyData(dataL);
        let sumL = 0; for (let i = 0; i < dataL.length; i++) sumL += dataL[i];
        const left = sumL / (dataL.length * 255);
        const dataR = new Uint8Array(pair.right.frequencyBinCount); pair.right.getByteFrequencyData(dataR);
        let sumR = 0; for (let i = 0; i < dataR.length; i++) sumR += dataR[i];
        const right = sumR / (dataR.length * 255);
        return { left, right, peak: Math.max(left, right) };
      });
      setMeterLevels(levels);
      meterAnimRef.current = requestAnimationFrame(animate);
    };
    meterAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const stopMeterAnimation = useCallback(() => {
    if (meterAnimRef.current) { cancelAnimationFrame(meterAnimRef.current); meterAnimRef.current = null; }
    setMeterLevels([]);
  }, []);

  // ── Recording ──
  const startRecording = async () => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track'); return; }
    try {
      const ctx = getCtx();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDevice !== 'default' ? { exact: selectedDevice } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 } });
      mediaStreamRef.current = stream;
      setMicSimStream(stream);
      const src = ctx.createMediaStreamSource(stream); inputAnalyserRef.current = ctx.createAnalyser(); inputAnalyserRef.current.fftSize = 256; src.connect(inputAnalyserRef.current);
      const mon = () => { if (!inputAnalyserRef.current) return; const d = new Uint8Array(inputAnalyserRef.current.frequencyBinCount); inputAnalyserRef.current.getByteFrequencyData(d); setInputLevel(d.reduce((a, b) => a + b, 0) / d.length / 255); inputAnimRef.current = requestAnimationFrame(mon); }; mon();
      if (countIn) { setStatus('Count in...'); await playCountIn(ctx); }
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime }); chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const ab = await blob.arrayBuffer(); const buf = await ctx.decodeAudioData(ab);
        const audioUrl = URL.createObjectURL(blob);
        updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
        createRegionFromRecording(ai, buf, audioUrl);
        await uploadTrack(blob, ai); setStatus('✓ Recorded');
      };
      mediaRecorderRef.current = rec; rec.start(100); startPlayback(true); setIsRecording(true); setStatus(`● REC Track ${ai + 1}`);
    } catch (e) { setStatus(`✗ Mic: ${e.message}`); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    if (inputAnimRef.current) cancelAnimationFrame(inputAnimRef.current);
    setMicSimStream(null); setInputLevel(0); setIsRecording(false); stopPlayback();
  };

  const handleMicSimRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track first to receive Mic Sim recording'); return; }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks, getCtx, updateTrack]);

  const handlePianoRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track first to receive Piano recording'); return; }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Piano recorded → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks, getCtx, updateTrack]);

  const handleFreesoundSelect = useCallback((audioBuffer, name, audioUrl) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track first to load sound'); return; }
    updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || `Freesound Sample` });
    createRegionFromRecording(ai, audioBuffer, audioUrl);
    setStatus(`✓ "${name}" loaded → Track ${ai + 1}`);
  }, [tracks, updateTrack]);

  const handleSplitRecordingComplete = useCallback((blob) => {
    const ai = tracks.findIndex(t => t.armed);
    if (ai === -1) { setStatus('⚠ Arm a track first to receive Split recording'); return; }
    const ctx = getCtx();
    const audioUrl = URL.createObjectURL(blob);
    blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => {
      updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl });
      createRegionFromRecording(ai, buf, audioUrl);
      uploadTrack(blob, ai);
      setStatus(`✓ Split recording → Track ${ai + 1}`);
    }).catch(e => setStatus(`✗ ${e.message}`));
  }, [tracks, getCtx, updateTrack]);

  const handleAIBeatApply = useCallback((patternData) => {
    setStatus(`✓ AI Beat pattern generated: ${patternData.genre} @ ${patternData.bpm} BPM — Switch to Beat Maker to use`);
  }, []);

  const handleLoadKit = useCallback((samples) => {
    if (!samples || samples.length === 0) { setStatus('⚠ Kit has no samples'); return; }
    setStatus(`✓ Kit loaded — ${samples.length} samples available. Switch to Beat Maker to play.`);
  }, []);

  const handleLoadKitSample = useCallback((audioBuffer, name, url, padNum) => {
    setStatus(`✓ "${name}" loaded → Pad ${padNum >= 0 ? padNum + 1 : '(unassigned)'}`);
  }, []);

  const handlePianoRollNotesChange = useCallback((notes) => { setPianoRollNotes(notes); }, []);

  const handlePianoRollExport = useCallback((renderedBuffer, blob) => {
    let targetTrack = tracks.findIndex(t => !t.audioBuffer);
    if (targetTrack === -1 && tracks.length < maxTracks) { targetTrack = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(targetTrack)]); }
    if (targetTrack === -1) { setStatus('⚠ No empty tracks. Clear a track first.'); return; }
    if (renderedBuffer) {
      const audioUrl = URL.createObjectURL(blob);
      updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: 'Piano Roll Export' });
      createRegionFromImport(targetTrack, renderedBuffer, 'Piano Roll Export', audioUrl);
      setStatus(`✓ Piano Roll → Track ${targetTrack + 1}`); setViewMode('record');
    }
  }, [tracks, maxTracks, updateTrack]);

  const handleMidiImport = useCallback((midiData) => {
    if (midiData && midiData.notes) {
      setPianoRollNotes(midiData.notes);
      if (midiData.bpm) setBpm(midiData.bpm);
      if (midiData.key) setPianoRollKey(midiData.key);
      setStatus(`✓ MIDI imported — ${midiData.notes.length} notes loaded`); setViewMode('pianoroll');
    }
  }, []);

  const handleMidiNoteOn = useCallback((note) => {
    if (viewMode === 'pianoroll') {
      const newNote = { id: `midi_${Date.now()}_${note.note}`, note: note.note, velocity: note.velocity, startBeat: secondsToBeat(currentTime, bpm), duration: 0.25, channel: note.channel || 0 };
      setPianoRollNotes(prev => [...prev, newNote]);
    }
    setStatus(`MIDI In: ${note.noteName || note.note} vel:${note.velocity}`);
  }, [viewMode, currentTime, bpm]);

  const handleMidiNoteOff = useCallback((note) => {
    const currentBeat = secondsToBeat(currentTime, bpm);
    setPianoRollNotes(prev => prev.map(n => {
      if (n.note === note.note && n.id && n.id.startsWith('midi_')) { return { ...n, duration: Math.max(currentBeat - n.startBeat, 0.125) }; }
      return n;
    }));
  }, [currentTime, bpm]);

  const handleChordInsert = useCallback((chordNotes) => {
    if (chordNotes && chordNotes.length > 0) { setPianoRollNotes(prev => [...prev, ...chordNotes]); setStatus(`✓ ${chordNotes.length} chord notes inserted into Piano Roll`); }
  }, []);

  const handleChordKeyChange = useCallback((key, scale) => { setPianoRollKey(key); setPianoRollScale(scale); }, []);

  // ── Playback ──
  const startPlayback = (overdub = false) => {
    const ctx = getCtx();
    trackSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    trackSourcesRef.current = []; trackGainsRef.current = []; trackPansRef.current = []; trackAnalysersRef.current = [];
    let maxDur = 0;
    tracks.forEach((t, i) => {
      if (!t.audioBuffer) { trackAnalysersRef.current[i] = null; return; }
      const s = ctx.createBufferSource(); s.buffer = t.audioBuffer;
      const g = ctx.createGain(); g.gain.value = isAudible(t) ? t.volume : 0;
      const p = ctx.createStereoPanner(); p.pan.value = t.pan;
      const splitter = ctx.createChannelSplitter(2);
      const analyserL = ctx.createAnalyser(); analyserL.fftSize = 256; analyserL.smoothingTimeConstant = 0.7;
      const analyserR = ctx.createAnalyser(); analyserR.fftSize = 256; analyserR.smoothingTimeConstant = 0.7;
      const fxNodes = buildFxChain(ctx, t); let last = s; fxNodes.forEach(n => { last.connect(n); last = n; });
      last.connect(g); g.connect(p);
      p.connect(splitter); splitter.connect(analyserL, 0); splitter.connect(analyserR, 1);
      p.connect(masterGainRef.current); buildSends(ctx, t, p, masterGainRef.current);
      s.start(0, playOffsetRef.current); trackSourcesRef.current[i] = s; trackGainsRef.current[i] = g; trackPansRef.current[i] = p;
      trackAnalysersRef.current[i] = { left: analyserL, right: analyserR };
      if (t.audioBuffer.duration > maxDur) maxDur = t.audioBuffer.duration;
    });
    setDuration(maxDur); playStartRef.current = ctx.currentTime; setIsPlaying(true);
    if (metronomeOn) startMetronome(ctx);
    startMeterAnimation();
    timeRef.current = setInterval(() => { if (audioCtxRef.current) { const el = audioCtxRef.current.currentTime - playStartRef.current + playOffsetRef.current; setCurrentTime(el); if (el >= maxDur && maxDur > 0 && !overdub) stopPlayback(); } }, 50);
    if (!overdub) setStatus('▶ Playing');
  };

  const stopPlayback = () => {
    trackSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } }); trackSourcesRef.current = [];
    if (metroRef.current) clearInterval(metroRef.current); if (timeRef.current) clearInterval(timeRef.current);
    stopMeterAnimation(); trackAnalysersRef.current = [];
    setIsPlaying(false); if (!isRecording) { playOffsetRef.current = currentTime; setStatus('■ Stopped'); }
  };

  const stopEverything = () => { stopRecording(); stopPlayback(); playOffsetRef.current = 0; setCurrentTime(0); };
  const rewind = () => { if (isPlaying) stopPlayback(); playOffsetRef.current = 0; setCurrentTime(0); };

  const startMetronome = (ctx) => {
    const iv = (60 / bpm) * 1000; let beat = 0;
    const click = (down) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = down ? 1000 : 800; g.gain.value = 0.3; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.05); };
    click(true); metroRef.current = setInterval(() => { beat = (beat + 1) % 4; click(beat === 0); }, iv);
  };

  const playCountIn = (ctx) => new Promise(res => {
    const iv = (60 / bpm) * 1000; let c = 0;
    const click = () => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = c === 0 ? 1200 : 1000; g.gain.value = 0.5; g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06); };
    click(); const id = setInterval(() => { c++; if (c >= 4) { clearInterval(id); res(); } else click(); }, iv);
  });

  const handleImport = async (ti) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
    inp.onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; setStatus(`Importing...`);
      try {
        const ctx = getCtx(); const ab = await f.arrayBuffer(); const buf = await ctx.decodeAudioData(ab);
        const name = f.name.replace(/\.[^/.]+$/, '').substring(0, 20);
        const audioUrl = URL.createObjectURL(f);
        updateTrack(ti, { audioBuffer: buf, audio_url: audioUrl, name });
        createRegionFromImport(ti, buf, name, audioUrl);
        if (projectId) { const fd = new FormData(); fd.append('file', f); fd.append('project_id', projectId); fd.append('track_index', ti); const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || ''; await fetch(`${bu}/api/studio/tracks/import`, { method: 'POST', headers: { 'Authorization': `Bearer ${tok}` }, body: fd }); }
        setStatus(`✓ Track ${ti + 1}`);
      } catch (err) { setStatus(`✗ ${err.message}`); }
    }; inp.click();
  };

  const uploadTrack = async (blob, ti) => {
    if (!projectId) return;
    try { const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || ''; const fd = new FormData(); fd.append('file', blob, `track_${ti}.webm`); fd.append('project_id', projectId); fd.append('track_index', ti); await fetch(`${bu}/api/studio/tracks/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${tok}` }, body: fd }); }
    catch (e) { console.error(e); }
  };

  const clearTrack = (ti) => { updateTrack(ti, { audioBuffer: null, audio_url: null, armed: false, regions: [] }); setStatus(`Track ${ti + 1} cleared`); };

  const handleBeatExport = useCallback((renderedBuffer, blob) => {
    let targetTrack = tracks.findIndex(t => !t.audioBuffer);
    if (targetTrack === -1 && tracks.length < maxTracks) { targetTrack = tracks.length; setTracks(prev => [...prev, DEFAULT_TRACK(targetTrack)]); }
    if (targetTrack === -1) { setStatus('⚠ No empty tracks. Clear a track first.'); return; }
    if (renderedBuffer) {
      const audioUrl = URL.createObjectURL(blob);
      updateTrack(targetTrack, { audioBuffer: renderedBuffer, audio_url: audioUrl, name: 'Beat Export' });
      createRegionFromImport(targetTrack, renderedBuffer, 'Beat Export', audioUrl);
      setStatus(`✓ Beat → Track ${targetTrack + 1}`); setViewMode('record');
    }
  }, [tracks, maxTracks, updateTrack]);

  const handleMixdown = async () => {
    if (!tracks.some(t => t.audioBuffer)) { setStatus('No tracks'); return; }
    setMixingDown(true); setStatus('Bouncing...');
    try {
      const maxLen = Math.max(...tracks.map(t => t.audioBuffer ? t.audioBuffer.length : 0));
      const sr = tracks.find(t => t.audioBuffer).audioBuffer.sampleRate;
      const off = new OfflineAudioContext(2, maxLen, sr);
      tracks.forEach(t => {
        if (!t.audioBuffer || !isAudible(t)) return;
        const s = off.createBufferSource(); s.buffer = t.audioBuffer;
        const fxN = buildFxChain(off, t); const g = off.createGain(); g.gain.value = t.volume; const p = off.createStereoPanner(); p.pan.value = t.pan;
        let last = s; fxN.forEach(n => { last.connect(n); last = n; }); last.connect(g); g.connect(p); p.connect(off.destination);
        const fx = t.effects;
        if (fx.reverb.enabled && fx.reverb.mix > 0) { const cv = off.createConvolver(); cv.buffer = getReverbBuf(off, fx.reverb.decay); const rg = off.createGain(); rg.gain.value = fx.reverb.mix; p.connect(cv); cv.connect(rg); rg.connect(off.destination); }
        if (fx.delay.enabled && fx.delay.mix > 0) { const dl = off.createDelay(5); dl.delayTime.value = fx.delay.time; const fb = off.createGain(); fb.gain.value = fx.delay.feedback; const dm = off.createGain(); dm.gain.value = fx.delay.mix; p.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(dm); dm.connect(off.destination); }
        s.start(0);
      });
      const rendered = await off.startRendering(); const wav = bufToWav(rendered);
      const url = URL.createObjectURL(wav); const a = document.createElement('a'); a.href = url; a.download = `${projectName.replace(/\s+/g, '_')}_mixdown.wav`; a.click(); URL.revokeObjectURL(url);
      if (projectId) { const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || ''; const fd = new FormData(); fd.append('file', wav, 'mixdown.wav'); await fetch(`${bu}/api/studio/projects/${projectId}/mixdown`, { method: 'POST', headers: { 'Authorization': `Bearer ${tok}` }, body: fd }); }
      setStatus('✓ Bounced');
    } catch (e) { setStatus(`✗ ${e.message}`); } finally { setMixingDown(false); }
  };

  const bufToWav = (buf) => {
    const nc = buf.numberOfChannels, sr = buf.sampleRate, bps = 16, chs = []; for (let i = 0; i < nc; i++) chs.push(buf.getChannelData(i));
    const il = nc === 2 ? interleave(chs[0], chs[1]) : chs[0], dl = il.length * (bps / 8), ab = new ArrayBuffer(44 + dl), v = new DataView(ab);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + dl, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, nc, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nc * (bps / 8), true); v.setUint16(32, nc * (bps / 8), true);
    v.setUint16(34, bps, true); ws(36, 'data'); v.setUint32(40, dl, true);
    let off = 44; for (let i = 0; i < il.length; i++) { const s = Math.max(-1, Math.min(1, il[i])); v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2; }
    return new Blob([ab], { type: 'audio/wav' });
  };
  const interleave = (l, r) => { const res = new Float32Array(l.length + r.length); for (let i = 0, idx = 0; i < l.length; i++) { res[idx++] = l[i]; res[idx++] = r[i]; } return res; };

  const saveProject = async () => {
    setSaving(true); setStatus('Saving...');
    try {
      const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || '';
      const td = tracks.map(t => ({ name: t.name, volume: t.volume, pan: t.pan, muted: t.muted, solo: t.solo, effects: t.effects, color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })), audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null }));
      const method = projectId ? 'PUT' : 'POST'; const url = projectId ? `${bu}/api/studio/projects/${projectId}` : `${bu}/api/studio/projects`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` }, body: JSON.stringify({ name: projectName, bpm, time_signature: `${timeSignature[0]}/${timeSignature[1]}`, tracks: td, master_volume: masterVolume, piano_roll_notes: pianoRollNotes, piano_roll_key: pianoRollKey, piano_roll_scale: pianoRollScale }) });
      const data = await res.json(); if (data.success) { setProjectId(data.project.id); setStatus('✓ Saved'); } else { setStatus('✗ Save failed'); }
    } catch (e) { setStatus('✗ Save failed'); } finally { setSaving(false); }
  };

  const loadProject = async (pid) => {
    try {
      const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || '';
      const res = await fetch(`${bu}/api/studio/projects/${pid}`, { headers: { 'Authorization': `Bearer ${tok}` } }); const data = await res.json();
      if (data.success) {
        const p = data.project; setProjectId(p.id); setProjectName(p.name); setBpm(p.bpm); setMasterVolume(p.master_volume || 0.8);
        if (p.time_signature) { const ts = p.time_signature.split('/').map(Number); if (ts.length === 2) setTimeSignature(ts); }
        if (p.piano_roll_notes) setPianoRollNotes(p.piano_roll_notes);
        if (p.piano_roll_key) setPianoRollKey(p.piano_roll_key);
        if (p.piano_roll_scale) setPianoRollScale(p.piano_roll_scale);
        const trackCount = Math.min(Math.max(p.tracks?.length || 1, 1), maxTracks);
        const loaded = Array.from({ length: trackCount }, (_, i) => ({ ...DEFAULT_TRACK(i), ...(p.tracks[i] || {}), audioBuffer: null, effects: p.tracks[i]?.effects || DEFAULT_EFFECTS(), regions: p.tracks[i]?.regions || [] }));
        setTracks(loaded); setSelectedTrackIndex(0);
        for (let i = 0; i < loaded.length; i++) { if (loaded[i].audio_url) await loadAudioBuffer(loaded[i].audio_url, i); }
        setShowProjectList(false); setStatus(`Loaded: ${p.name}`);
      }
    } catch (e) { setStatus('✗ Load failed'); }
  };

  const loadProjectList = async () => {
    try { const tok = localStorage.getItem('token') || sessionStorage.getItem('token'); const bu = process.env.REACT_APP_BACKEND_URL || ''; const res = await fetch(`${bu}/api/studio/projects`, { headers: { 'Authorization': `Bearer ${tok}` } }); const data = await res.json(); if (data.success) { setProjects(data.projects); setShowProjectList(true); } }
    catch (e) { console.error(e); }
  };

  const newProject = () => {
    stopEverything(); setProjectId(null); setProjectName('Untitled Project'); setBpm(120);
    setMasterVolume(0.8); setActiveEffectsTrack(null); setTimeSignature([4, 4]);
    setTracks(Array.from({ length: 1 }, (_, i) => DEFAULT_TRACK(i)));
    setSelectedTrackIndex(0); setPianoRollNotes([]); setPianoRollKey('C'); setPianoRollScale('major'); setStatus('New project');
  };

  const addTrack = () => {
    if (tracks.length >= maxTracks) { setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks. Upgrade for more.`); return; }
    const i = tracks.length;
    const typeName = newTrackType === 'midi' ? 'MIDI' : newTrackType === 'bus' ? 'Bus' : newTrackType === 'aux' ? 'Aux' : 'Audio';
    setTracks(prev => [...prev, DEFAULT_TRACK(i, newTrackType)]);
    setSelectedTrackIndex(i);
    setStatus(`${typeName} Track ${i + 1} added (${tracks.length + 1}/${maxTracks})`);
  };

  const removeTrack = (idx) => {
    if (tracks.length <= 1) { setStatus('⚠ Must have at least 1 track'); return; }
    setTracks(prev => prev.filter((_, i) => i !== idx));
    if (activeEffectsTrack === idx) setActiveEffectsTrack(null);
    else if (activeEffectsTrack > idx) setActiveEffectsTrack(activeEffectsTrack - 1);
    if (selectedTrackIndex >= tracks.length - 1) setSelectedTrackIndex(Math.max(0, tracks.length - 2));
    setStatus(`Track ${idx + 1} removed`);
    setSelectedTrackIndex(prev => { if (prev === idx) return Math.max(0, idx - 1); if (prev > idx) return prev - 1; return prev; });
    setStatus(`Track ${idx + 1} removed`);
  };

  const seekToBeat = useCallback((beat) => { const secs = beatToSeconds(beat, bpm); if (isPlaying) stopPlayback(); playOffsetRef.current = secs; setCurrentTime(secs); }, [bpm, isPlaying]);

  const createRegionFromRecording = (trackIndex, audioBuffer, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startBeat = secondsToBeat(playOffsetRef.current, bpm);
    const duration = secondsToBeat(audioBuffer.duration, bpm);
    const newRegion = { id: regionId, name: tracks[trackIndex]?.name || `Track ${trackIndex + 1}`, startBeat, duration, audioUrl, color: tracks[trackIndex]?.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 };
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), newRegion] } : t));
  };

  const createRegionFromImport = (trackIndex, audioBuffer, name, audioUrl) => {
    const regionId = `rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const duration = secondsToBeat(audioBuffer.duration, bpm);
    setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, regions: [...(t.regions || []), { id: regionId, name: name || `Import ${trackIndex + 1}`, startBeat: 0, duration, audioUrl, color: t.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length], loopEnabled: false, loopCount: 1 }] } : t));
  };

  const fmt = (s) => { const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 100); return `${m}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`; };

  const handleAIApplyVolume = useCallback((trackIndex, value) => { updateTrack(trackIndex, { volume: value }); if (trackGainsRef.current[trackIndex]) trackGainsRef.current[trackIndex].gain.value = value; setStatus(`AI: Track ${trackIndex + 1} vol → ${Math.round(value * 100)}%`); }, [updateTrack]);
  const handleAIApplyPan = useCallback((trackIndex, value) => { updateTrack(trackIndex, { pan: value }); if (trackPansRef.current[trackIndex]) trackPansRef.current[trackIndex].pan.value = value; const label = value === 0 ? 'C' : value < 0 ? `L${Math.abs(Math.round(value * 50))}` : `R${Math.round(value * 50)}`; setStatus(`AI: Track ${trackIndex + 1} pan → ${label}`); }, [updateTrack]);
  const handleAIApplyEQ = useCallback((trackIndex, eqSuggestion) => { const updates = {}; if (eqSuggestion.frequency < 400) updates.lowGain = eqSuggestion.gain_db; else if (eqSuggestion.frequency < 3000) { updates.midGain = eqSuggestion.gain_db; updates.midFreq = eqSuggestion.frequency; } else updates.highGain = eqSuggestion.gain_db; setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updates, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} EQ adjusted`); }, []);
  const handleAIApplyCompression = useCallback((trackIndex, comp) => { setTracks(prev => prev.map((t, i) => i !== trackIndex ? t : { ...t, effects: { ...t.effects, compressor: { threshold: comp.suggested_threshold || -20, ratio: comp.suggested_ratio || 4, attack: (comp.suggested_attack_ms || 10) / 1000, release: (comp.suggested_release_ms || 100) / 1000, enabled: true } } })); setStatus(`AI: Track ${trackIndex + 1} compressor applied`); }, []);

  const handleArrangerPlay = useCallback(() => { if (!isPlaying) startPlayback(); }, [isPlaying]);
  const handleArrangerStop = useCallback(() => { if (isPlaying) stopPlayback(); }, [isPlaying]);
  const handleArrangerRecord = useCallback(() => { isRecording ? stopRecording() : startRecording(); }, [isRecording]);
  const handleBpmChange = useCallback((newBpm) => setBpm(newBpm), []);
  const handleTimeSignatureChange = useCallback((top, bottom) => setTimeSignature([top, bottom]), []);
  const handleToggleFx = useCallback((trackIndex) => setActiveEffectsTrack(prev => prev === trackIndex ? null : trackIndex), []);
  const handleEQGraphChange = useCallback((updatedEQ) => { if (activeEffectsTrack === null) return; setTracks(p => p.map((t, i) => i !== activeEffectsTrack ? t : { ...t, effects: { ...t.effects, eq: { ...t.effects.eq, ...updatedEQ } } })); }, [activeEffectsTrack]);

  // ── MIDI Export ──
  const exportMidiFile = useCallback(() => {
    if (!pianoRollNotes || pianoRollNotes.length === 0) { setStatus('⚠ No piano roll notes to export'); return; }
    try {
      const bytes = midiFromNotes({ notes: pianoRollNotes, bpm, ppq: 480 });
      const blob = new Blob([bytes], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_') || 'project'}_pianoroll.mid`; a.click(); URL.revokeObjectURL(url);
      setStatus('✓ MIDI exported');
    } catch (e) { console.error(e); setStatus('✗ MIDI export failed'); }
  }, [pianoRollNotes, bpm, projectName]);

  // ── Tap tempo ──
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-6);
    if (tapTimesRef.current.length < 2) { setStatus('Tap tempo…'); return; }
    const diffs = [];
    for (let i = 1; i < tapTimesRef.current.length; i++) diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
    const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const newBpm = clamp(Math.round(60000 / avgMs), 40, 240);
    setBpm(newBpm); setStatus(`✓ BPM set by tap: ${newBpm}`);
  }, []);

  // ── MenuBar action router ──
  // ── MenuBar action router (plain function — no useCallback to avoid stale closures) ──
  const handleMenuAction = async (action) => {
    const sel = clamp(selectedTrackIndex, 0, Math.max(0, tracks.length - 1));

    const toggleArmSelected = () => {
      setTracks(p => p.map((t, idx) => ({ ...t, armed: idx === sel ? !t.armed : false })));
      setSelectedTrackIndex(sel);
      setStatus(`Track ${sel + 1} ${tracks[sel]?.armed ? 'disarmed' : 'armed'}`);
    };

    const toggleMuteSelected = () => {
      const wasMuted = !!tracks[sel]?.muted;
      updateTrack(sel, { muted: !wasMuted });
      if (trackGainsRef.current[sel]) trackGainsRef.current[sel].gain.value = !wasMuted ? 0 : tracks[sel].volume;
      setStatus(`Track ${sel + 1} ${!wasMuted ? 'muted' : 'unmuted'}`);
    };

    const toggleSoloSelected = () => {
      updateTrack(sel, { solo: !tracks[sel]?.solo });
      setStatus(`Track ${sel + 1} solo ${tracks[sel]?.solo ? 'off' : 'on'}`);
    };

    const toggleFxPanel = () => {
      setActiveEffectsTrack(prev => (prev === sel ? null : sel));
      setStatus(`FX ${activeEffectsTrack === sel ? 'closed' : 'opened'} for Track ${sel + 1}`);
    };

    switch (action) {
      // File
      case 'file:new': newProject(); break;
      case 'file:open': loadProjectList(); break;
      case 'file:openLocal': {
        // Open From Desktop — import a .spx project file
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.spx,.json';
        inp.onchange = async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            const text = await f.text();
            const data = JSON.parse(text);
            if (data.format !== 'streampirex-daw') {
              setStatus('⚠ Not a valid StreamPireX project file');
              return;
            }
            stopEverything();
            setProjectId(null);
            setProjectName(data.name || 'Imported Project');
            setBpm(data.bpm || 120);
            setMasterVolume(data.master_volume || 0.8);
            if (data.time_signature) {
              const ts = data.time_signature.split('/').map(Number);
              if (ts.length === 2) setTimeSignature(ts);
            }
            if (data.piano_roll_notes) setPianoRollNotes(data.piano_roll_notes);
            if (data.piano_roll_key) setPianoRollKey(data.piano_roll_key);
            if (data.piano_roll_scale) setPianoRollScale(data.piano_roll_scale);
            const trackCount = Math.min(Math.max(data.tracks?.length || 1, 1), maxTracks);
            const loaded = Array.from({ length: trackCount }, (_, i) => ({
              ...DEFAULT_TRACK(i),
              ...(data.tracks[i] || {}),
              audioBuffer: null,
              effects: data.tracks[i]?.effects || DEFAULT_EFFECTS(),
              regions: data.tracks[i]?.regions || []
            }));
            setTracks(loaded);
            setSelectedTrackIndex(0);
            // Load audio buffers from URLs if they exist
            for (let i = 0; i < loaded.length; i++) {
              if (loaded[i].audio_url && !loaded[i].audio_url.startsWith('blob:')) {
                await loadAudioBuffer(loaded[i].audio_url, i);
              }
            }
            setStatus(`✓ Opened: ${data.name}`);
          } catch (err) {
            setStatus(`✗ Failed to open project: ${err.message}`);
          }
        };
        inp.click();
        break;
      }
      case 'file:save': saveProject(); break;
      case 'file:saveAs': {
        // Save As — native OS file picker dialog (name + location)
        const saveData = {
          name: projectName,
          bpm,
          time_signature: `${timeSignature[0]}/${timeSignature[1]}`,
          master_volume: masterVolume,
          tracks: tracks.map(t => ({
            name: t.name, volume: t.volume, pan: t.pan,
            muted: t.muted, solo: t.solo, effects: t.effects,
            color: t.color, regions: (t.regions || []).map(r => ({ ...r, audioUrl: null })),
            audio_url: typeof t.audio_url === 'string' && !t.audio_url.startsWith('blob:') ? t.audio_url : null
          })),
          piano_roll_notes: pianoRollNotes,
          piano_roll_key: pianoRollKey,
          piano_roll_scale: pianoRollScale,
          created_at: new Date().toISOString(),
          format: 'streampirex-daw',
          version: '1.0'
        };
        const jsonStr = JSON.stringify(saveData, null, 2);

        if (window.showSaveFilePicker) {
          // Modern browsers — native OS save dialog
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `${projectName.replace(/\s+/g, '_')}.spx`,
              types: [{
                description: 'StreamPireX Project',
                accept: { 'application/json': ['.spx'] }
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            setStatus(`✓ Saved: ${handle.name}`);
          } catch (err) {
            if (err.name !== 'AbortError') setStatus(`✗ Save failed: ${err.message}`);
          }
        } else {
          // Fallback for Firefox/Safari — prompt for name then download
          const fileName = window.prompt('Save project as:', `${projectName.replace(/\s+/g, '_')}.spx`);
          if (fileName && fileName.trim()) {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.trim().endsWith('.spx') ? fileName.trim() : `${fileName.trim()}.spx`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus(`✓ Saved: ${fileName.trim()}`);
          }
        }
        break;
      }
      case 'file:importAudio': setViewMode('record'); handleImport(sel); break;
      case 'file:importMidi': case 'midi:import': setViewMode('midi'); setStatus('MIDI: Use the MIDI Import panel to select a file'); break;
      case 'file:exportMidi': case 'midi:export': exportMidiFile(); break;
      case 'file:bounce': handleMixdown(); break;

      // View
      case 'view:record': setViewMode('record'); break;
      case 'view:arrange': setViewMode('arrange'); break;
      case 'view:console': setViewMode('console'); break;
      case 'view:beatmaker': setViewMode('beatmaker'); break;
      case 'view:pianoroll': setViewMode('pianoroll'); break;
      case 'view:piano': setViewMode('piano'); break;
      case 'view:sounds': setViewMode('sounds'); break;
      case 'view:split': setViewMode('split'); break;
      case 'view:keyfinder': setViewMode('keyfinder'); break;
      case 'view:aibeat': setViewMode('aibeat'); break;
      case 'view:kits': setViewMode('kits'); break;
      case 'view:micsim': setViewMode('micsim'); break;
      case 'view:aimix': setViewMode('aimix'); break;
      case 'view:midi': setViewMode('midi'); break;
      case 'view:chords': setViewMode('chords'); break;
      case 'view:toggleFx': toggleFxPanel(); break;

      // Transport
      case 'transport:playPause': if (isPlaying) stopPlayback(); else startPlayback(); break;
      case 'transport:stop': stopEverything(); break;
      case 'transport:record': isRecording ? stopRecording() : startRecording(); break;
      case 'transport:rewind': rewind(); break;
      case 'transport:goToEnd': {
        const maxDur = Math.max(duration, 30);
        if (isPlaying) stopPlayback();
        playOffsetRef.current = maxDur;
        setCurrentTime(maxDur);
        break;
      }
      case 'transport:forward': {
        const maxDur2 = Math.max(duration, 30);
        const t2 = Math.min(maxDur2, currentTime + 5);
        if (isPlaying) stopPlayback();
        playOffsetRef.current = t2;
        setCurrentTime(t2);
        break;
      }
      case 'transport:rewindSkip': {
        const t3 = Math.max(0, currentTime - 5);
        if (isPlaying) stopPlayback();
        playOffsetRef.current = t3;
        setCurrentTime(t3);
        break;
      }
      case 'transport:metronome': setMetronomeOn(v => !v); setStatus(`Metronome ${!metronomeOn ? 'ON' : 'OFF'}`); break;
      case 'transport:countIn': setCountIn(v => !v); setStatus(`Count-In ${!countIn ? 'ON' : 'OFF'}`); break;
      case 'transport:tapTempo': tapTempo(); break;
      case 'transport:setBpm': {
        const val = window.prompt('Set BPM:', String(bpm));
        const n = Number(val);
        if (Number.isFinite(n) && n >= 40 && n <= 300) { setBpm(Math.round(n)); setStatus(`✓ BPM → ${Math.round(n)}`); }
        else setStatus('⚠ Invalid BPM');
        break;
      }
      case 'transport:timeSignature': {
        const val = window.prompt('Time Signature (e.g. 4/4):', `${timeSignature[0]}/${timeSignature[1]}`);
        if (!val) break;
        const parts = val.split('/').map(x => parseInt(x, 10));
        if (parts.length === 2 && parts.every(Number.isFinite) && parts[0] > 0 && [1, 2, 4, 8, 16].includes(parts[1])) {
          setTimeSignature([parts[0], parts[1]]); setStatus(`✓ Time Signature → ${parts[0]}/${parts[1]}`);
        } else { setStatus('⚠ Invalid time signature'); }
        break;
      }

      // Track
      case 'track:add': addTrack(); break;
      case 'track:duplicate': {
        if (tracks.length >= maxTracks) { setStatus(`⚠ ${userTier} tier limit: ${maxTracks} tracks.`); break; }
        const src = tracks[sel];
        const copy = { ...DEFAULT_TRACK(tracks.length), ...src, name: `${src.name} Copy`, audioBuffer: src.audioBuffer, audio_url: src.audio_url, regions: [...(src.regions || [])].map(r => ({ ...r, id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })), armed: false, solo: false, muted: false, color: TRACK_COLORS[tracks.length % TRACK_COLORS.length] };
        setTracks(prev => [...prev, copy]); setSelectedTrackIndex(tracks.length); setStatus(`✓ Duplicated Track ${sel + 1}`);
        break;
      }
      case 'track:remove': removeTrack(sel); break;
      case 'track:arm': toggleArmSelected(); break;
      case 'track:mute': toggleMuteSelected(); break;
      case 'track:solo': toggleSoloSelected(); break;
      case 'track:clear': clearTrack(sel); break;
      case 'track:muteAll': setTracks(p => p.map(t => ({ ...t, muted: true }))); setStatus('✓ All muted'); break;
      case 'track:unmuteAll': setTracks(p => p.map(t => ({ ...t, muted: false }))); setStatus('✓ All unmuted'); break;
      case 'track:unsoloAll': setTracks(p => p.map(t => ({ ...t, solo: false }))); setStatus('✓ All unsoloed'); break;
      case 'track:rename': { const val = window.prompt(`Rename Track ${sel + 1}:`, tracks[sel]?.name || `Track ${sel + 1}`); if (val) updateTrack(sel, { name: val }); break; }

      // Edit
      case 'edit:undo': case 'edit:redo': case 'edit:cut': case 'edit:copy': case 'edit:paste': case 'edit:delete': case 'edit:selectAll': case 'edit:deselectAll':
        setStatus(`ℹ ${action} not wired yet (add Undo/Clipboard selection state)`); break;
      case 'edit:quantize': case 'midi:quantize': setViewMode('midi'); setStatus('Quantize: use the Quantize panel in MIDI view'); break;

      // MIDI tools
      case 'midi:chords': setViewMode('chords'); break;
      case 'midi:clearAll': setPianoRollNotes([]); setStatus('✓ Piano roll cleared'); break;

      default: setStatus(`ℹ Unhandled action: ${action}`); break;
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button className={`daw-icon-btn ${saving?'saving':''}`} onClick={saveProject} title="Save" disabled={saving}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </button>
          <div className="daw-divider"></div>
          <input className="daw-project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} />
        </div>

        {/* Transport — always visible */}
        <div className="daw-transport">
          <button className="daw-transport-btn" onClick={rewind} disabled={isRecording} title="Return to Zero">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
          </button>
          <button className="daw-transport-btn" onClick={() => { const t = Math.max(0, currentTime - 5); if (isPlaying) stopPlayback(); playOffsetRef.current = t; setCurrentTime(t); }} disabled={isRecording} title="Rewind 5s">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 18L10 12l8-6v12z"/><path d="M11 18L3 12l8-6v12z"/></svg>
          </button>
          <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
          </button>
          <button className={`daw-transport-btn daw-play-btn ${isPlaying&&!isRecording?'active':''}`} onClick={()=>isPlaying?stopPlayback():startPlayback()} disabled={isRecording} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying&&!isRecording
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
          </button>
          <button className="daw-transport-btn" onClick={() => { const maxDur = Math.max(duration, 30); const t = Math.min(maxDur, currentTime + 5); if (isPlaying) stopPlayback(); playOffsetRef.current = t; setCurrentTime(t); }} disabled={isRecording} title="Forward 5s">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6l8 6-8 6V6z"/><path d="M13 6l8 6-8 6V6z"/></svg>
          </button>
          <button className="daw-transport-btn" onClick={() => { const maxDur = Math.max(duration, 30); if (isPlaying) stopPlayback(); playOffsetRef.current = maxDur; setCurrentTime(maxDur); }} disabled={isRecording} title="Go to End">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zM17 5h2v14h-2z"/></svg>
          </button>
          <button className={`daw-transport-btn daw-rec-btn ${isRecording?'active':''}`} onClick={()=>isRecording?stopRecording():startRecording()} title={isRecording ? 'Stop Recording' : 'Record'}>
            <span className="daw-rec-dot"></span>
          </button>
          <div className="daw-lcd">
            <span className="daw-lcd-time">{fmt(currentTime)}</span>
            <span className="daw-lcd-sep">|</span>
            <span className="daw-lcd-bpm">{bpm} BPM</span>
          </div>
          <button className={`daw-transport-btn daw-metro-btn ${metronomeOn?'active':''}`} onClick={()=>setMetronomeOn(!metronomeOn)} title="Metronome">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 22h8L12 2z"/><line x1="12" y1="8" x2="18" y2="4"/></svg>
          </button>
          <button className={`daw-transport-btn ${countIn?'active':''}`} onClick={()=>setCountIn(!countIn)} title="Count-in" style={{fontSize:'0.7rem',fontWeight:800}}>1234</button>
        </div>

        {/* ═══ View Toggle ═══ */}
        <div className="daw-topbar-center-tabs">
          <button className={`daw-view-tab ${viewMode==='record'?'active':''}`} onClick={()=>setViewMode('record')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
            Record
          </button>
          <button className={`daw-view-tab ${viewMode==='arrange'?'active':''}`} onClick={()=>setViewMode('arrange')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Arrange
          </button>
          <button className={`daw-view-tab ${viewMode==='console'?'active':''}`} onClick={()=>setViewMode('console')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/></svg>
            Console
          </button>
          <button className={`daw-view-tab ${viewMode==='beatmaker'?'active':''}`} onClick={()=>setViewMode('beatmaker')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>
            Beat Maker
          </button>
          <button className={`daw-view-tab ${viewMode==='pianoroll'?'active':''}`} onClick={()=>setViewMode('pianoroll')} title="Piano Roll / MIDI Editor">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="18" rx="2"/><line x1="1" y1="9" x2="23" y2="9"/><line x1="1" y1="15" x2="23" y2="15"/><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/></svg>
            Piano Roll
          </button>
          <button className={`daw-view-tab ${viewMode==='piano'?'active':''}`} onClick={()=>setViewMode('piano')} title="Virtual Piano">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="4" x2="6" y2="14"/><line x1="10" y1="4" x2="10" y2="14"/><line x1="14" y1="4" x2="14" y2="14"/><line x1="18" y1="4" x2="18" y2="14"/></svg>
            Piano
          </button>
          <button className={`daw-view-tab ${viewMode==='sounds'?'active':''}`} onClick={()=>setViewMode('sounds')} title="Sound Browser (Freesound.org)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Sounds
          </button>
          <button className={`daw-view-tab ${viewMode==='split'?'active':''}`} onClick={()=>setViewMode('split')} title="Piano + Drums Split">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="9" rx="1"/><rect x="2" y="13" width="20" height="9" rx="1"/></svg>
            Split
          </button>
          <button className={`daw-view-tab ${viewMode==='keyfinder'?'active':''}`} onClick={()=>setViewMode('keyfinder')} title="Key & Scale Detector">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            Key Finder
          </button>
          <button className={`daw-view-tab ai-tab ${viewMode==='aibeat'?'active':''}`} onClick={()=>setViewMode('aibeat')} title="AI Beat Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 014 4v1h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2V6a4 4 0 014-4z"/></svg>
            AI Beats
          </button>
          <button className={`daw-view-tab ${viewMode==='kits'?'active':''}`} onClick={()=>setViewMode('kits')} title="Sound Kit Manager">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20"/><path d="M9 21V9"/></svg>
            Kits
          </button>
          <button className={`daw-view-tab ${viewMode==='midi'?'active':''}`} onClick={()=>setViewMode('midi')} title="MIDI Import & Hardware">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>
            MIDI
          </button>
          <button className={`daw-view-tab ai-tab ${viewMode==='chords'?'active':''}`} onClick={()=>setViewMode('chords')} title="AI Chord Progression Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 3l18 18" strokeWidth="1.5"/></svg>
            Chords
          </button>
          <button className={`daw-view-tab ${viewMode==='micsim'?'active':''}`} onClick={()=>setViewMode('micsim')} title="Mic Simulator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            Mic Sim
          </button>
          <button className={`daw-view-tab ai-tab ${viewMode==='aimix'?'active':''}`} onClick={()=>setViewMode('aimix')} title="AI Mix Assistant">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/></svg>
            AI Mix
          </button>
          <button className={`daw-view-tab ${viewMode==='sampler'?'active':''}`} onClick={()=>setViewMode('sampler')} title="Sampler Instrument">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="14" rx="2"/><line x1="6" y1="6" x2="6" y2="20"/><line x1="10" y1="6" x2="10" y2="20"/><line x1="14" y1="6" x2="14" y2="20"/><line x1="18" y1="6" x2="18" y2="20"/><rect x="7" y="6" width="2" height="9" fill="currentColor" rx="0.5"/><rect x="15" y="6" width="2" height="9" fill="currentColor" rx="0.5"/></svg>
            Sampler
          </button>
          <button className={`daw-view-tab ${viewMode==='vocal'?'active':''}`} onClick={()=>setViewMode('vocal')} title="Vocal Processor — FX chain, analyzer, AI coach">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            Vocal
          </button>
        </div>

        {/* I/O & Status */}
        <div className="daw-topbar-right">
          <select value={selectedDevice} onChange={e=>setSelectedDevice(e.target.value)} className="daw-input-select">
            <option value="default">Default Mic</option>
            {inputDevices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||`Mic ${d.deviceId.slice(0,6)}`}</option>)}
          </select>
          <div className="daw-input-meter"><div className="daw-input-meter-fill" style={{width:`${inputLevel*100}%`}}></div></div>
          <span className="daw-status">{status}</span>
        </div>
      </div>

      {/* ═══════════════════ PROJECT LIST MODAL ═══════════════════ */}
      {showProjectList && (
        <div className="daw-modal-overlay" onClick={()=>setShowProjectList(false)}>
          <div className="daw-modal" onClick={e=>e.stopPropagation()}>
            <h2>Open Project</h2>
            {projects.length===0
              ? <p className="daw-empty">No saved projects</p>
              : <div className="daw-project-list">{projects.map(p=>
                  <button key={p.id} className="daw-project-item" onClick={()=>loadProject(p.id)}>
                    <span>{p.name}</span>
                    <span className="daw-project-meta">{p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}</span>
                  </button>
                )}</div>
            }
            <button className="daw-btn" onClick={()=>setShowProjectList(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ═══════════════════ MAIN VIEW AREA ═══════════════════ */}
      <div className="daw-main">

        {/* ──────── RECORD VIEW ──────── */}
        {viewMode === 'record' && (
          <>
            <div className="daw-tracks-area">
              {/* ── Track Controls Toolbar ── */}
              <div className="daw-tracks-toolbar">
                <span className="daw-tracks-toolbar-label">TRACKS</span>
                <div className="daw-tracks-toolbar-controls">
                  <select className="daw-track-type-select" value={newTrackType} onChange={e => setNewTrackType(e.target.value)}>
                    <option value="audio">Audio</option>
                    <option value="midi">MIDI</option>
                    <option value="bus">Bus</option>
                    <option value="aux">Aux</option>
                  </select>
                  <button className="daw-tracks-toolbar-btn add" onClick={addTrack} disabled={tracks.length >= maxTracks} title="Add Track">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button className="daw-tracks-toolbar-btn remove" onClick={() => removeTrack(selectedTrackIndex)} disabled={tracks.length <= 1} title="Remove Selected Track">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <span className="daw-tracks-toolbar-count">{tracks.length}/{maxTracks}</span>
                </div>
              </div>
              <div className="daw-ruler">
                <div className="daw-ruler-header"></div>
                <div className="daw-ruler-timeline">
                  {Array.from({length:Math.max(Math.ceil(duration||30),30)},(_,s)=>
                    <div key={s} className="daw-ruler-mark" style={{left:`${(s/Math.max(duration||30,30))*100}%`}}>
                      {s%5===0&&<span>{Math.floor(s/60)}:{String(s%60).padStart(2,'0')}</span>}
                    </div>
                  )}
                  {duration>0&&<div className="daw-ruler-playhead" style={{left:`${(currentTime/Math.max(duration,1))*100}%`}}></div>}
                </div>
              </div>
              {tracks.map((track,i)=>(
                <div key={i} className={`daw-track-row ${track.armed?'armed':''} ${track.muted?'muted':''} ${track.solo?'soloed':''} ${activeEffectsTrack===i?'fx-open':''} ${selectedTrackIndex===i?'selected':''}`}
                  onClick={() => setSelectedTrackIndex(i)}>
                  <div className="daw-track-strip">
                    <div className="daw-track-color-bar" style={{background:track.color}}></div>
                    <input className="daw-track-name-input" value={track.name} onChange={e=>updateTrack(i,{name:e.target.value})} onClick={e=>e.stopPropagation()} />
                    <div className="daw-track-btns">
                      <button className={`daw-badge r ${track.armed?'on':''}`} onClick={(e)=>{e.stopPropagation();setTracks(p=>p.map((t,idx)=>({...t,armed:idx===i?!t.armed:false})))}}>R</button>
                      <button className={`daw-badge m ${track.muted?'on':''}`} onClick={(e)=>{e.stopPropagation();updateTrack(i,{muted:!track.muted});if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=!track.muted?0:track.volume;}}>M</button>
                      <button className={`daw-badge s ${track.solo?'on':''}`} onClick={(e)=>{e.stopPropagation();updateTrack(i,{solo:!track.solo})}}>S</button>
                    </div>
                    <div className="daw-track-vol">
                      <input type="range" min="0" max="1" step="0.01" value={track.volume} onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{volume:v});if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=v;}} className="daw-knob-slider" />
                      <span className="daw-vol-val">{Math.round(track.volume*100)}</span>
                    </div>
                    <div className="daw-track-pan">
                      <input type="range" min="-1" max="1" step="0.01" value={track.pan} onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{pan:v});if(trackPansRef.current[i])trackPansRef.current[i].pan.value=v;}} className="daw-pan-slider" />
                      <span className="daw-pan-val">{track.pan===0?'C':track.pan<0?`L${Math.abs(Math.round(track.pan*50))}`:`R${Math.round(track.pan*50)}`}</span>
                    </div>
                    <div className="daw-track-actions-strip">
                      <button className="daw-tiny-btn" onClick={()=>handleImport(i)} title="Import"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>clearTrack(i)} title="Clear"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>setActiveEffectsTrack(activeEffectsTrack===i?null:i)} title="FX"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></button>
                      <button className="daw-tiny-btn" onClick={()=>removeTrack(i)} title="Remove"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                  </div>
                  <div className="daw-track-region">
                    {track.audioBuffer
                      ? <div className="daw-region-block" style={{'--region-color':track.color}}><div className="daw-region-label">{track.name}</div><canvas ref={el=>{canvasRefs.current[i]=el;}} width={1200} height={96} className="daw-waveform-canvas" /></div>
                      : <div className="daw-region-empty">{track.armed?<span className="daw-armed-label">● Armed</span>:<span>Empty</span>}</div>}
                    {duration>0&&<div className="daw-track-playhead" style={{left:`${(currentTime/Math.max(duration,1))*100}%`}}></div>}
                  </div>
                </div>
              ))}
              {tracks.length >= maxTracks && (
                <div className="daw-tier-limit-notice">
                  <span>🔒 {userTier.charAt(0).toUpperCase() + userTier.slice(1)} plan: {maxTracks} tracks max</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ──────── ARRANGE VIEW ──────── */}
        {viewMode === 'arrange' && (
          <ArrangerView
            tracks={tracks} setTracks={setTracks} bpm={bpm}
            timeSignatureTop={timeSignature[0]} timeSignatureBottom={timeSignature[1]}
            masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume}
            projectName={projectName} userTier={userTier}
            playheadBeat={playheadBeat} isPlaying={isPlaying} isRecording={isRecording}
            onPlay={handleArrangerPlay} onStop={handleArrangerStop} onRecord={handleArrangerRecord}
            onSeek={seekToBeat} onBpmChange={handleBpmChange}
            onTimeSignatureChange={handleTimeSignatureChange} onToggleFx={handleToggleFx}
            onBounce={handleMixdown} onSave={saveProject} saving={saving}
          />
        )}

        {/* ──────── CONSOLE / MIXER VIEW ──────── */}
        {viewMode === 'console' && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((track, i) => {
                const fx = track.effects;
                const allInserts = [
                  { key: 'eq',         label: 'EQ',          on: fx.eq.enabled,         cls: 'eq' },
                  { key: 'compressor', label: 'Compressor',  on: fx.compressor.enabled, cls: 'comp' },
                  { key: 'reverb',     label: 'Reverb',      on: fx.reverb.enabled,     cls: 'reverb' },
                  { key: 'delay',      label: 'Delay',       on: fx.delay.enabled,      cls: 'delay' },
                  { key: 'distortion', label: 'Distortion',  on: fx.distortion.enabled, cls: 'distortion' },
                  { key: 'filter',     label: `Filter ${fx.filter.type === 'lowpass' ? 'LP' : fx.filter.type === 'highpass' ? 'HP' : fx.filter.type === 'bandpass' ? 'BP' : 'N'}`, on: fx.filter.enabled, cls: 'filter' },
                ];
                const activeInserts = allInserts.filter(s => s.on);
                const emptyCount = 6 - activeInserts.length;
                const insertSlots = [
                  ...activeInserts,
                  ...Array.from({ length: emptyCount }, (_, j) => ({ key: `empty-${j}`, label: '', on: false, cls: 'empty', isEmpty: true })),
                ];
                const panLabel = track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 50))}` : `R${Math.round(track.pan * 50)}`;
                const volDb = track.volume > 0 ? (20 * Math.log10(track.volume)).toFixed(1) : '-∞';
                const level = meterLevels[i] || { left: 0, right: 0, peak: 0 };
                const meterL = level.left * 100;
                const meterR = level.right * 100;

                return (
                  <div key={i} className={`daw-channel ${activeEffectsTrack === i ? 'selected' : ''} ${selectedTrackIndex === i ? 'selected-track' : ''}`}
                    onClick={() => setSelectedTrackIndex(i)}>
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-label">Routing</span>
                      <span className="daw-ch-routing-value">Mono In 2 (Mic)</span>
                      <span className="daw-ch-routing-value">{track.solo ? 'Solo Bus' : 'Stereo Out'}</span>
                    </div>
                    <div className="daw-ch-inserts">
                      <span className="daw-ch-inserts-label">Inserts</span>
                      {insertSlots.map(slot => (
                        <div
                          key={slot.key}
                          className={`daw-ch-insert-slot ${slot.on ? `active ${slot.cls}` : slot.isEmpty ? 'empty' : 'inactive'}`}
                          onClick={() => {
                            if (slot.isEmpty) {
                              setActiveEffectsTrack(i);
                            } else {
                              setActiveEffectsTrack(i);
                              updateEffect(i, slot.key, 'enabled', !slot.on);
                            }
                          }}
                          title={slot.isEmpty ? 'Empty slot — open FX panel to add' : `${slot.label} — click to toggle`}
                        >
                          {slot.isEmpty ? '—' : slot.label}
                        </div>
                      ))}
                    </div>
                    <div className="daw-ch-controls">
                      <div className={`daw-ch-badge ${track.muted ? 'm-on' : ''}`}
                        onClick={() => { updateTrack(i, { muted: !track.muted }); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = !track.muted ? 0 : track.volume; }}>M</div>
                      <div className={`daw-ch-badge ${track.solo ? 's-on' : ''}`}
                        onClick={() => updateTrack(i, { solo: !track.solo })}>S</div>
                      <div className="daw-ch-badge" onClick={() => { }}>L</div>
                      <div className={`daw-ch-badge ${activeEffectsTrack === i ? 'e-on' : ''}`}
                        onClick={() => setActiveEffectsTrack(activeEffectsTrack === i ? null : i)}>e</div>
                    </div>
                    <div className="daw-ch-pan">
                      <input
                        type="range" min="-1" max="1" step="0.02" value={track.pan}
                        className="daw-ch-pan-display"
                        style={{ background: 'transparent', cursor: 'pointer', border: 'none', WebkitAppearance: 'none', appearance: 'none', height: '18px', width: '100%' }}
                        onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { pan: v }); if (trackPansRef.current[i]) trackPansRef.current[i].pan.value = v; }}
                        title={panLabel}
                      />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#5a7088', fontFamily: "'JetBrains Mono', monospace", padding: '1px 0' }}>
                      {panLabel}
                    </div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-meter">
                        <div className="daw-ch-meter-bar">
                          <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max(meterL, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                        </div>
                        <div className="daw-ch-meter-bar">
                          <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max(meterR, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                        </div>
                      </div>
                      <div className="daw-ch-fader">
                        <input type="range" min="0" max="1" step="0.005" value={track.volume}
                          onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { volume: v }); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = v; }}
                          orient="vertical" />
                      </div>
                      <div className="daw-ch-vol-display">
                        <span className="daw-ch-vol-val">{volDb}</span>
                      </div>
                    </div>
                    <div className="daw-ch-automation">
                      <div className="daw-ch-rw">R</div>
                      <div className="daw-ch-rw">W</div>
                    </div>
                    <div className="daw-ch-rec">
                      <div className={`daw-ch-rec-btn ${track.armed ? 'armed' : ''}`}
                        onClick={() => setTracks(p => p.map((t, idx) => ({ ...t, armed: idx === i ? !t.armed : false })))} />
                    </div>
                    <div className="daw-ch-name">
                      <div className="daw-ch-number"><span className="daw-ch-type-icon">🎵</span> {i + 1}</div>
                      <input className="daw-ch-name-input" value={track.name} onChange={e => updateTrack(i, { name: e.target.value })} />
                    </div>
                  </div>
                );
              })}

              {/* ── Master Channel ── */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-label">Routing</span>
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>
                <div className="daw-ch-inserts">
                  <span className="daw-ch-inserts-label">Inserts</span>
                  {Array.from({ length: 6 }, (_, j) => (
                    <div key={`master-empty-${j}`} className="daw-ch-insert-slot empty" title="Empty slot">—</div>
                  ))}
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                </div>
                <div className="daw-ch-pan">
                  <div className="daw-ch-pan-display" style={{ textAlign: 'center' }}>C</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#5a7088', fontFamily: "'JetBrains Mono', monospace", padding: '1px 0' }}>C</div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-meter">
                    <div className="daw-ch-meter-bar">
                      <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max((meterLevels.reduce((a, l) => Math.max(a, l?.left || 0), 0)) * 90, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                    </div>
                    <div className="daw-ch-meter-bar">
                      <div className="daw-ch-meter-fill" style={{ height: `${isPlaying ? Math.max((meterLevels.reduce((a, l) => Math.max(a, l?.right || 0), 0)) * 90, 2) : 0}%`, transition: isPlaying ? 'height 0.06s linear' : 'height 0.4s ease-out' }}></div>
                    </div>
                  </div>
                  <div className="daw-ch-fader">
                    <input type="range" min="0" max="1" step="0.005" value={masterVolume}
                      onChange={e => setMasterVolume(parseFloat(e.target.value))} orient="vertical" />
                  </div>
                  <div className="daw-ch-vol-display">
                    <span className="daw-ch-vol-val">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : '-∞'}</span>
                  </div>
                </div>
                <div className="daw-ch-automation">
                  <div className="daw-ch-rw">R</div>
                  <div className="daw-ch-rw">W</div>
                </div>
                <div className="daw-ch-rec"></div>
                <div className="daw-ch-name">
                  <div className="daw-ch-number">🔊 M</div>
                  <input className="daw-ch-name-input" value="Master" readOnly style={{ cursor: 'default' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────── BEAT MAKER VIEW ──────── */}
        {viewMode === 'beatmaker' && (
          <SamplerBeatMaker
            onExport={handleBeatExport}
            onClose={() => setViewMode('record')}
            isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => {
              const idx = selectedTrackIndex;
              updateTrack(idx, { audioBuffer, name: name || tracks[idx].name });
              setViewMode('arrange');
              setStatus(`Beat bounced to Track ${idx + 1}`);
            }}
            onOpenSampler={() => setViewMode('sampler')}
            incomingSample={window.__spx_sampler_export || null}
          />
        )}

        {/* ──────── PIANO ROLL VIEW ──────── */}
        {viewMode === 'pianoroll' && (
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
              onClose={() => setViewMode('beatmaker')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── MIDI IMPORT & HARDWARE VIEW ──────── */}
        {viewMode === 'midi' && (
          <div className="daw-midi-view" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', height: '100%', overflow: 'auto' }}>
            <MidiImporter
              onImport={handleMidiImport}
              onClose={() => setViewMode('pianoroll')}
              isEmbedded={true}
            />
            <MidiHardwareInput
              onNoteOn={handleMidiNoteOn}
              onNoteOff={handleMidiNoteOff}
              isEmbedded={true}
            />
            {/* Quick-access Quantize panel for piano roll notes */}
            <QuantizePanel
              notes={pianoRollNotes}
              onQuantize={(quantizedNotes) => setPianoRollNotes(quantizedNotes)}
              bpm={bpm}
              timeSignature={timeSignature}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── CHORD PROGRESSION GENERATOR VIEW ──────── */}
        {viewMode === 'chords' && (
          <div className="daw-chords-view">
            <ChordProgressionGenerator
              musicalKey={pianoRollKey}
              scale={pianoRollScale}
              bpm={bpm}
              timeSignature={timeSignature}
              onInsertChords={handleChordInsert}
              onKeyChange={handleChordKeyChange}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode('pianoroll')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── VIRTUAL PIANO VIEW ──────── */}
        {viewMode === 'piano' && (
          <div className="daw-piano-view">
            <VirtualPiano
              audioContext={audioCtxRef.current}
              onRecordingComplete={handlePianoRecordingComplete}
              embedded={true}
            />
          </div>
        )}

        {/* ──────── FREESOUND BROWSER VIEW ──────── */}
        {viewMode === 'sounds' && (
          <div className="daw-freesound-view">
            <FreesoundBrowser
              audioContext={audioCtxRef.current}
              onSoundSelect={handleFreesoundSelect}
              onClose={() => setViewMode('record')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── PIANO + DRUMS SPLIT VIEW ──────── */}
        {viewMode === 'split' && (
          <div className="daw-split-view">
            <PianoDrumSplit
              audioContext={audioCtxRef.current}
              onRecordingComplete={handleSplitRecordingComplete}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── KEY FINDER VIEW ──────── */}
        {viewMode === 'keyfinder' && (
          <div className="daw-keyfinder-view">
            <KeyFinder
              tracks={tracks}
              audioContext={audioCtxRef.current}
              onClose={() => setViewMode('record')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── AI BEAT ASSISTANT VIEW ──────── */}
        {viewMode === 'aibeat' && (
          <div className="daw-aibeat-view">
            <AIBeatAssistant
              onApplyPattern={handleAIBeatApply}
              onClose={() => setViewMode('beatmaker')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── SOUND KIT MANAGER VIEW ──────── */}
        {viewMode === 'kits' && (
          <div className="daw-kits-view">
            <SoundKitManager
              audioContext={audioCtxRef.current}
              onLoadKit={handleLoadKit}
              onLoadSample={handleLoadKitSample}
              currentPads={null}
              onClose={() => setViewMode('beatmaker')}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ──────── MIC SIMULATOR VIEW ──────── */}
        {viewMode === 'micsim' && (
          <div className="daw-micsim-view">
            <MicSimulator
              audioContext={audioCtxRef.current}
              inputStream={micSimStream}
              onRecordingComplete={handleMicSimRecordingComplete}
              embedded={true}
              defaultMic="sm7b"
              showRecordButton={true}
            />
          </div>
        )}

        {/* ──────── AI MIX ASSISTANT VIEW ──────── */}
        {viewMode === 'aimix' && (
          <div className="daw-aimix-view">
            <AIMixAssistant
              tracks={tracks} projectId={projectId}
              onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan}
              onApplyEQ={handleAIApplyEQ} onApplyCompression={handleAIApplyCompression}
              onClose={() => setViewMode('record')}
            />
          </div>
        )}

        {viewMode === 'sampler' && (
          <div className="daw-sampler-view" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <SamplerInstrument
              track={tracks[selectedTrackIndex]}
              trackIndex={selectedTrackIndex}
              onUpdate={(idx, props) => updateTrack(idx, props)}
              audioCtx={audioCtxRef.current}
              onSendToBeatMaker={(buffer, name) => {
                window.__spx_sampler_export = { buffer, name, timestamp: Date.now() };
                setViewMode('beatmaker');
                setStatus(`Sample "${name}" sent to Beat Maker — load onto a pad`);
              }}
              onSendToTrack={(buffer, name) => {
                const idx = selectedTrackIndex;
                updateTrack(idx, { audioBuffer: buffer, name: name || tracks[idx].name });
                setViewMode('record');
                setStatus(`Sample "${name}" placed on Track ${idx + 1}`);
              }}
            />
          </div>
        )}

        {viewMode === 'vocal' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VocalProcessor
              audioContext={audioCtxRef.current}
              isEmbedded={true}
              tracks={tracks}
              selectedTrackIndex={selectedTrackIndex}
              bpm={bpm}
              onSendToTrack={(buffer, name) => {
                const idx = selectedTrackIndex;
                updateTrack(idx, { audioBuffer: buffer, name: name || tracks[idx].name });
                setViewMode('record');
                setStatus(`Vocal "${name}" placed on Track ${idx + 1}`);
              }}
              onRecordingComplete={(blob) => {
                setStatus('Vocal recording saved');
              }}
            />
          </div>
        )}

        {/* ──────── FX PANEL (with Parametric EQ Graph) ──────── */}
        {(viewMode === 'record' || viewMode === 'console') && afx && (
          <div className="daw-fx-panel">
            <div className="daw-fx-header">
              <span style={{color:afx.color}}>●</span>
              <span>{afx.name} — Effects</span>
              <button className="daw-fx-close" onClick={()=>setActiveEffectsTrack(null)}>✕</button>
            </div>
            {[
              {key:'eq',label:'EQ',params:[{p:'lowGain',l:'Low',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`},{p:'midGain',l:'Mid',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`},{p:'midFreq',l:'Mid Freq',min:200,max:8000,step:10,fmt:v=>v>=1000?(v/1000).toFixed(1)+'k':v},{p:'highGain',l:'High',min:-12,max:12,step:0.5,fmt:v=>`${v>0?'+':''}${v}dB`}]},
              {key:'compressor',label:'Compressor',params:[{p:'threshold',l:'Thresh',min:-60,max:0,step:1,fmt:v=>`${v}dB`},{p:'ratio',l:'Ratio',min:1,max:20,step:0.5,fmt:v=>`${v}:1`},{p:'attack',l:'Attack',min:0,max:1,step:0.001,fmt:v=>`${(v*1000).toFixed(0)}ms`},{p:'release',l:'Release',min:0.01,max:1,step:0.01,fmt:v=>`${(v*1000).toFixed(0)}ms`}]},
              {key:'reverb',label:'Reverb',params:[{p:'mix',l:'Mix',min:0,max:1,step:0.01,fmt:v=>`${Math.round(v*100)}%`},{p:'decay',l:'Decay',min:0.1,max:8,step:0.1,fmt:v=>`${v.toFixed(1)}s`}]},
              {key:'delay',label:'Delay',params:[{p:'time',l:'Time',min:0.01,max:2,step:0.01,fmt:v=>`${(v*1000).toFixed(0)}ms`},{p:'feedback',l:'Feedback',min:0,max:0.9,step:0.01,fmt:v=>`${Math.round(v*100)}%`},{p:'mix',l:'Mix',min:0,max:1,step:0.01,fmt:v=>`${Math.round(v*100)}%`}]},
              {key:'distortion',label:'Distortion',params:[{p:'amount',l:'Amount',min:0,max:100,step:1,fmt:v=>v}]},
              {key:'filter',label:'Filter',params:[{p:'frequency',l:'Freq',min:20,max:20000,step:1,fmt:v=>v>=1000?(v/1000).toFixed(1)+'k':v},{p:'Q',l:'Q',min:0.1,max:18,step:0.1,fmt:v=>v.toFixed(1)}],extra:(
                <div className="daw-fx-param"><label>Type</label><select value={afx.effects.filter.type} onChange={e=>updateEffect(activeEffectsTrack,'filter','type',e.target.value)} className="daw-fx-select"><option value="lowpass">Low Pass</option><option value="highpass">High Pass</option><option value="bandpass">Band Pass</option><option value="notch">Notch</option></select></div>
              )},
              {key:'limiter',label:'Limiter',params:[{p:'threshold',l:'Ceiling',min:-12,max:0,step:0.1,fmt:v=>`${v.toFixed(1)}dB`},{p:'release',l:'Release',min:0.001,max:0.5,step:0.001,fmt:v=>`${(v*1000).toFixed(0)}ms`}]},
            ].map(({key,label,params,extra})=>(
              <div key={key} className={`daw-fx-block ${afx.effects[key].enabled?'enabled':''}`}>
                <div className="daw-fx-block-header">
                  <button className="daw-fx-toggle" onClick={()=>updateEffect(activeEffectsTrack,key,'enabled',!afx.effects[key].enabled)}>{afx.effects[key].enabled?'◉':'○'}</button>
                  <span>{label}</span>
                </div>
                {key === 'eq' && afx.effects.eq.enabled && (
                  <div style={{ padding: '4px 6px 2px' }}>
                    <ParametricEQGraph
                      eq={afx.effects.eq}
                      onChange={handleEQGraphChange}
                      width={260}
                      height={140}
                      compact={true}
                      showLabels={true}
                    />
                  </div>
                )}
                <div className="daw-fx-controls">
                  {extra}
                  {params.map(({p,l,min,max,step,fmt})=>(
                    <div key={p} className="daw-fx-param"><label>{l}</label><input type="range" min={min} max={max} step={step} value={afx.effects[key][p]} onChange={e=>updateEffect(activeEffectsTrack,key,p,parseFloat(e.target.value))} /><span>{fmt(afx.effects[key][p])}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════ MASTER BAR ═══════════════════ */}
      <div className="daw-master-bar">
        <div className="daw-master-vol">
          <span>Master</span>
          <input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={e=>setMasterVolume(parseFloat(e.target.value))} className="daw-master-slider" />
          <span className="daw-master-val">{Math.round(masterVolume*100)}%</span>
        </div>
        <div className="daw-master-info">
          <span className="daw-tier-badge" data-tier={userTier}>{userTier.charAt(0).toUpperCase() + userTier.slice(1)}</span>
          <span className="daw-track-count">{tracks.length}/{maxTracks} tracks</span>
        </div>
        <button className="daw-bounce-btn" onClick={handleMixdown} disabled={mixingDown||!tracks.some(t=>t.audioBuffer)}>
          {mixingDown?'Bouncing...':'Bounce'}
        </button>
      </div>
    </div>
  );
};

export default RecordingStudio;