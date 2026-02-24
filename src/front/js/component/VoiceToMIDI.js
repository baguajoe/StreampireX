// =============================================================================
// VoiceToMIDI.js v2 — Dubler-Style Voice-to-MIDI Controller
// =============================================================================
// Location: src/front/js/component/VoiceToMIDI.js
// Features:
//   - Pitch Mode: sing/hum → MIDI notes (14 scales, auto key detection)
//   - Trigger Mode: beatbox → trainable drum triggers (8 slots)
//   - Polyphonic Mode: sing chords → multiple MIDI notes
//   - MIDI CC from voice dynamics (volume, breath, expression)
//   - Pitch bend from vibrato detection
//   - Vowel-to-CC mapping (mouth shape → filter cutoff, etc.)
//   - Web MIDI API output to external DAWs/hardware
//   - Enhanced training UI with confidence meters
//   - Chord triggering from single notes
//   - MIDI recording & export (.mid)
//   - Low-latency optimized processing
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  YINDetector,
  PolyphonicDetector,
  VibratoAnalyzer,
  SpectralAnalyzer,
  DynamicsAnalyzer,
  SpectralFingerprint,
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  freqToNoteName,
} from './YINPitchDetector';

// ── Scales ──
const SCALES = {
  chromatic:    [0,1,2,3,4,5,6,7,8,9,10,11],
  major:        [0,2,4,5,7,9,11],
  minor:        [0,2,3,5,7,8,10],
  dorian:       [0,2,3,5,7,9,10],
  mixolydian:   [0,2,4,5,7,9,10],
  pentatonic:   [0,2,4,7,9],
  minor_pent:   [0,3,5,7,10],
  blues:        [0,3,5,6,7,10],
  harmonic_min: [0,2,3,5,7,8,11],
  melodic_min:  [0,2,3,5,7,9,11],
  phrygian:     [0,1,3,5,7,8,10],
  lydian:       [0,2,4,6,7,9,11],
  locrian:      [0,1,3,5,6,8,10],
  whole_tone:   [0,2,4,6,8,10],
};

const KEY_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Chord types ──
const CHORD_INTERVALS = {
  major:  [0, 4, 7],
  minor:  [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  dom7:   [0, 4, 7, 10],
};

// ── Krumhansl-Kessler key profiles ──
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ── Default MIDI CC mappings ──
const DEFAULT_CC_MAP = {
  volume:     { cc: 7,   label: 'Volume',      enabled: true,  min: 0, max: 127 },
  modWheel:   { cc: 1,   label: 'Mod Wheel',   enabled: true,  min: 0, max: 127 },
  expression: { cc: 11,  label: 'Expression',   enabled: true,  min: 0, max: 127 },
  brightness: { cc: 74,  label: 'Brightness',   enabled: true,  min: 0, max: 127 },
  filterCut:  { cc: 71,  label: 'Filter Cutoff', enabled: false, min: 0, max: 127 },
  resonance:  { cc: 72,  label: 'Resonance',    enabled: false, min: 0, max: 127 },
  attack:     { cc: 73,  label: 'Attack',       enabled: false, min: 0, max: 127 },
  release:    { cc: 75,  label: 'Release',      enabled: false, min: 0, max: 127 },
};

// ── Default vowel-to-CC mapping ──
const DEFAULT_VOWEL_CC = {
  a: { cc: 74, value: 100, label: 'Bright / Open' },
  e: { cc: 74, value: 80,  label: 'Mid-Bright' },
  i: { cc: 74, value: 127, label: 'Highest' },
  o: { cc: 74, value: 50,  label: 'Warm' },
  u: { cc: 74, value: 20,  label: 'Dark / Closed' },
};

// ── Default trigger slots (8) ──
const DEFAULT_TRIGGERS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: ['Kick', 'Snare', 'Closed HH', 'Open HH', 'Clap', 'Tom High', 'Tom Low', 'Perc'][i],
  midiNote: [36, 38, 42, 46, 39, 48, 45, 37][i],
  fingerprint: null,
  samples: [],       // multiple training samples for better matching
  threshold: 0.65,
  color: ['#ff3b30','#ff9500','#ffcc00','#34c759','#007aff','#af52de','#ff2d55','#5ac8fa'][i],
  trained: false,
}));

// ── MIDI File writer ──
const writeMidiFile = (events, bpm = 120, ppq = 480) => {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const mpqn = Math.round(60000000 / bpm);
  const trackEvents = [];

  // Tempo
  trackEvents.push({ tick: 0, bytes: [0xFF, 0x51, 0x03, (mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF] });

  // Convert time (seconds) to ticks
  const secToTick = (sec) => Math.round((sec / 60) * bpm * ppq);

  for (const evt of sorted) {
    const tick = secToTick(evt.time);
    if (evt.type === 'noteOn') {
      trackEvents.push({ tick, bytes: [0x90 | (evt.channel || 0), evt.note & 0x7F, (evt.velocity || 100) & 0x7F] });
    } else if (evt.type === 'noteOff') {
      trackEvents.push({ tick, bytes: [0x80 | (evt.channel || 0), evt.note & 0x7F, 0] });
    } else if (evt.type === 'cc') {
      trackEvents.push({ tick, bytes: [0xB0 | (evt.channel || 0), evt.cc & 0x7F, evt.value & 0x7F] });
    } else if (evt.type === 'pitchBend') {
      const val = Math.max(0, Math.min(16383, evt.value + 8192));
      trackEvents.push({ tick, bytes: [0xE0 | (evt.channel || 0), val & 0x7F, (val >> 7) & 0x7F] });
    }
  }

  // End of track
  const lastTick = trackEvents.reduce((m, e) => Math.max(m, e.tick), 0);
  trackEvents.push({ tick: lastTick + 1, bytes: [0xFF, 0x2F, 0x00] });
  trackEvents.sort((a, b) => a.tick - b.tick);

  const trackData = [];
  let prevTick = 0;
  const writeVarLen = (val) => {
    let v = val >>> 0;
    let buf = v & 0x7F;
    while ((v >>= 7)) { buf <<= 8; buf |= ((v & 0x7F) | 0x80); }
    while (true) { trackData.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break; }
  };
  for (const e of trackEvents) {
    writeVarLen(Math.max(0, e.tick - prevTick));
    trackData.push(...e.bytes);
    prevTick = e.tick;
  }

  // Header
  const header = [];
  const ps = (s) => s.split('').forEach(c => header.push(c.charCodeAt(0)));
  const p16 = (n) => header.push((n >> 8) & 0xFF, n & 0xFF);
  const p32 = (n) => header.push((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF);
  ps('MThd'); p32(6); p16(0); p16(1); p16(ppq);

  const th = [];
  'MTrk'.split('').forEach(c => th.push(c.charCodeAt(0)));
  th.push((trackData.length >> 24) & 0xFF, (trackData.length >> 16) & 0xFF, (trackData.length >> 8) & 0xFF, trackData.length & 0xFF);

  return new Uint8Array([...header, ...th, ...trackData]);
};

// ── Quantize MIDI note to scale ──
const quantizeToScale = (midiNote, key, scaleIntervals) => {
  const noteInOctave = ((Math.round(midiNote) % 12) - key + 12) % 12;
  const octave = Math.floor(Math.round(midiNote) / 12);

  let closest = scaleIntervals[0];
  let minDist = 999;
  for (const interval of scaleIntervals) {
    const dist = Math.abs(noteInOctave - interval);
    const distWrap = Math.abs(noteInOctave - interval - 12);
    const d = Math.min(dist, distWrap);
    if (d < minDist) { minDist = d; closest = interval; }
  }

  return octave * 12 + ((key + closest) % 12);
};

// ── Auto key detection ──
const detectKey = (noteHistogram) => {
  let bestKey = 0, bestMode = 'major', bestCorr = -Infinity;
  for (let key = 0; key < 12; key++) {
    for (const [mode, profile] of [['major', KK_MAJOR], ['minor', KK_MINOR]]) {
      let corr = 0;
      for (let i = 0; i < 12; i++) {
        corr += noteHistogram[(i + key) % 12] * profile[i];
      }
      if (corr > bestCorr) { bestCorr = corr; bestKey = key; bestMode = mode; }
    }
  }
  return { key: bestKey, keyName: KEY_NAMES[bestKey], mode: bestMode, confidence: bestCorr };
};

// =============================================================================
// COMPONENT
// =============================================================================

const VoiceToMIDI = ({
  audioContext: externalCtx,
  bpm = 120,
  musicalKey = 'C',
  scale = 'major',
  isEmbedded = false,
  onNoteOn,
  onNoteOff,
  onNotesGenerated,
  onMidiCC,
  onPitchBend,
}) => {
  // ── State ──
  const [mode, setMode] = useState('pitch'); // pitch | trigger | poly
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentKey, setCurrentKey] = useState(KEY_NAMES.indexOf(musicalKey) >= 0 ? KEY_NAMES.indexOf(musicalKey) : 0);
  const [currentScale, setCurrentScale] = useState(scale);
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [midiChannel, setMidiChannel] = useState(0);
  const [velocitySensitivity, setVelocitySensitivity] = useState(0.8);
  const [pitchBendEnabled, setPitchBendEnabled] = useState(true);
  const [vibratoToPitchBend, setVibratoToPitchBend] = useState(true);
  const [chordMode, setChordMode] = useState('off'); // off | major | minor | auto
  const [ccMappings, setCcMappings] = useState(DEFAULT_CC_MAP);
  const [vowelCcEnabled, setVowelCcEnabled] = useState(false);
  const [vowelMappings, setVowelMappings] = useState(DEFAULT_VOWEL_CC);
  const [triggers, setTriggers] = useState(DEFAULT_TRIGGERS);
  const [trainingSlot, setTrainingSlot] = useState(null); // which trigger slot is being trained
  const [autoKeyDetect, setAutoKeyDetect] = useState(true);
  const [detectedKey, setDetectedKey] = useState(null);
  const [latencyMode, setLatencyMode] = useState('low'); // low | balanced | quality

  // ── Display state ──
  const [currentNote, setCurrentNote] = useState(null);
  const [currentFreq, setCurrentFreq] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [spectralBrightness, setSpectralBrightness] = useState(0);
  const [vibratoInfo, setVibratoInfo] = useState(null);
  const [formantInfo, setFormantInfo] = useState(null);
  const [polyNotes, setPolyNotes] = useState([]);
  const [triggerHits, setTriggerHits] = useState(Array(8).fill(0)); // animation
  const [lastCC, setLastCC] = useState({});
  const [recordedEvents, setRecordedEvents] = useState([]);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [noteHistogram, setNoteHistogram] = useState(new Float32Array(12));
  const [status, setStatus] = useState('Ready — click Start to begin');

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
  const processorRef = useRef(null);
  const animRef = useRef(null);

  const yinRef = useRef(null);
  const polyRef = useRef(null);
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

  // ── Buffer sizes by latency mode ──
  const BUFFER_SIZES = { low: 1024, balanced: 2048, quality: 4096 };
  const FFT_SIZES = { low: 2048, balanced: 4096, quality: 8192 };

  // ── Initialize Web MIDI ──
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: false }).then(access => {
        const outputs = [];
        access.outputs.forEach(output => {
          outputs.push({ id: output.id, name: output.name, port: output });
        });
        setMidiOutputs(outputs);
        if (outputs.length > 0) setWebMidiEnabled(true);

        access.onstatechange = () => {
          const updated = [];
          access.outputs.forEach(output => {
            updated.push({ id: output.id, name: output.name, port: output });
          });
          setMidiOutputs(updated);
        };
      }).catch(() => {
        setWebMidiEnabled(false);
      });
    }
  }, []);

  // ── Send MIDI to external output ──
  const sendWebMidi = useCallback((bytes) => {
    if (midiOutputRef.current) {
      try { midiOutputRef.current.send(bytes); } catch (e) { /* silent */ }
    }
  }, []);

  // ── Note On ──
  const fireNoteOn = useCallback((note, velocity = 100, channel = 0) => {
    const n = Math.max(0, Math.min(127, Math.round(note)));
    const v = Math.max(1, Math.min(127, Math.round(velocity)));
    const ch = channel & 0xF;

    activeNotesRef.current.add(n);
    setActiveNotes(new Set(activeNotesRef.current));

    // Callback
    if (onNoteOn) onNoteOn({ note: n, velocity: v, channel: ch, noteName: midiToNoteName(n) });

    // Web MIDI
    sendWebMidi([0x90 | ch, n, v]);

    // Record
    if (isRecording) {
      const time = (performance.now() - recordStartRef.current) / 1000;
      recordedRef.current.push({ type: 'noteOn', note: n, velocity: v, channel: ch, time });
    }
  }, [onNoteOn, sendWebMidi, isRecording]);

  // ── Note Off ──
  const fireNoteOff = useCallback((note, channel = 0) => {
    const n = Math.max(0, Math.min(127, Math.round(note)));
    const ch = channel & 0xF;

    activeNotesRef.current.delete(n);
    setActiveNotes(new Set(activeNotesRef.current));

    if (onNoteOff) onNoteOff({ note: n, channel: ch, noteName: midiToNoteName(n) });
    sendWebMidi([0x80 | ch, n, 0]);

    if (isRecording) {
      const time = (performance.now() - recordStartRef.current) / 1000;
      recordedRef.current.push({ type: 'noteOff', note: n, channel: ch, time });
    }
  }, [onNoteOff, sendWebMidi, isRecording]);

  // ── MIDI CC ──
  const fireMidiCC = useCallback((cc, value, channel = 0) => {
    const ccNum = cc & 0x7F;
    const val = Math.max(0, Math.min(127, Math.round(value)));
    const ch = channel & 0xF;

    // Throttle: don't send same CC value twice in a row
    const key = `${ch}-${ccNum}`;
    if (lastCCRef.current[key] === val) return;
    lastCCRef.current[key] = val;
    setLastCC({ ...lastCCRef.current });

    if (onMidiCC) onMidiCC({ cc: ccNum, value: val, channel: ch });
    sendWebMidi([0xB0 | ch, ccNum, val]);

    if (isRecording) {
      const time = (performance.now() - recordStartRef.current) / 1000;
      recordedRef.current.push({ type: 'cc', cc: ccNum, value: val, channel: ch, time });
    }
  }, [onMidiCC, sendWebMidi, isRecording]);

  // ── Pitch Bend ──
  const firePitchBend = useCallback((value, channel = 0) => {
    const val = Math.max(-8192, Math.min(8191, Math.round(value)));
    const ch = channel & 0xF;
    const mapped = val + 8192;

    if (onPitchBend) onPitchBend({ value: val, channel: ch });
    sendWebMidi([0xE0 | ch, mapped & 0x7F, (mapped >> 7) & 0x7F]);

    if (isRecording) {
      const time = (performance.now() - recordStartRef.current) / 1000;
      recordedRef.current.push({ type: 'pitchBend', value: val, channel: ch, time });
    }
  }, [onPitchBend, sendWebMidi, isRecording]);

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

      const ctx = externalCtx || new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: latencyMode === 'low' ? 'interactive' : 'balanced',
        sampleRate: 48000,
      });
      if (ctx.state === 'suspended') await ctx.resume();
      audioCtxRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 48000 },
      });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Time-domain analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = bufSize;
      analyser.smoothingTimeConstant = 0;
      analyserRef.current = analyser;

      // Frequency-domain analyser
      const analyserFreq = ctx.createAnalyser();
      analyserFreq.fftSize = fftSize;
      analyserFreq.smoothingTimeConstant = 0.3;
      analyserFreqRef.current = analyserFreq;

      source.connect(analyser);
      source.connect(analyserFreq);

      // Initialize analyzers
      yinRef.current = new YINDetector(ctx.sampleRate, bufSize);
      polyRef.current = new PolyphonicDetector(ctx.sampleRate, fftSize);
      vibratoRef.current = new VibratoAnalyzer();
      spectralRef.current = new SpectralAnalyzer(ctx.sampleRate, fftSize);
      dynamicsRef.current = new DynamicsAnalyzer();
      fingerprintRef.current = new SpectralFingerprint();

      setIsListening(true);
      setStatus('Listening...');

      // Start processing loop
      processLoop();
    } catch (e) {
      setStatus(`✗ Mic error: ${e.message}`);
    }
  }, [externalCtx, latencyMode]);

  // ── Stop listening ──
  const stopListening = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    allNotesOff();
    setIsListening(false);
    setStatus('Stopped');
    setCurrentNote(null);
    setCurrentFreq(0);
    setConfidence(0);
    setRmsLevel(0);
  }, [allNotesOff]);

  // ── Main processing loop ──
  const processLoop = useCallback(() => {
    const analyze = () => {
      if (!analyserRef.current || !analyserFreqRef.current) return;

      const analyser = analyserRef.current;
      const analyserFreq = analyserFreqRef.current;
      const bufSize = analyser.fftSize;
      const freqBins = analyserFreq.frequencyBinCount;

      // Get time-domain data
      const timeBuf = new Float32Array(bufSize);
      analyser.getFloatTimeDomainData(timeBuf);

      // Get frequency-domain data
      const freqData = new Float32Array(freqBins);
      analyserFreq.getFloatFrequencyData(freqData);
      // Convert dB to linear magnitude
      const magnitudes = new Float32Array(freqBins);
      for (let i = 0; i < freqBins; i++) {
        magnitudes[i] = Math.pow(10, freqData[i] / 20);
      }

      // Dynamics
      const dynamics = dynamicsRef.current.track(timeBuf);
      setRmsLevel(dynamics.rms);

      // Send volume CC
      if (ccMappings.volume.enabled) {
        const volCC = Math.round(dynamics.dynamics * velocitySensitivity * 127);
        fireMidiCC(ccMappings.volume.cc, volCC, midiChannel);
      }

      // Spectral analysis
      const brightness = spectralRef.current.centroid(magnitudes);
      setSpectralBrightness(brightness);

      // Send brightness CC
      if (ccMappings.brightness.enabled) {
        const bCC = Math.round(Math.min(1, brightness / 4000) * 127);
        fireMidiCC(ccMappings.brightness.cc, bCC, midiChannel);
      }

      // Expression CC (combination of volume + brightness)
      if (ccMappings.expression.enabled) {
        const expr = Math.round(dynamics.dynamics * 0.7 + Math.min(1, brightness / 4000) * 0.3 * 127);
        fireMidiCC(ccMappings.expression.cc, Math.min(127, expr), midiChannel);
      }

      // Formant / Vowel detection
      if (vowelCcEnabled && dynamics.rms > 0.01) {
        const formants = spectralRef.current.detectFormants(magnitudes);
        setFormantInfo(formants);
        if (formants.vowel && vowelMappings[formants.vowel]) {
          const mapping = vowelMappings[formants.vowel];
          fireMidiCC(mapping.cc, mapping.value, midiChannel);
        }
      }

      // Gate: skip pitch detection if too quiet
      if (dynamics.rms < 0.008) {
        // Release any active notes
        if (activeNotesRef.current.size > 0 && mode !== 'trigger') {
          allNotesOff();
          setCurrentNote(null);
          firePitchBend(0, midiChannel);
        }
        animRef.current = requestAnimationFrame(analyze);
        return;
      }

      // ── MODE: PITCH ──
      if (mode === 'pitch') {
        const result = yinRef.current.detect(timeBuf);
        if (result && result.confidence > 0.5) {
          setCurrentFreq(result.freq);
          setConfidence(result.confidence);

          // Vibrato
          vibratoRef.current.push(result.freq, performance.now() / 1000);
          const vib = vibratoRef.current.analyze();
          setVibratoInfo(vib);

          // Pitch bend from vibrato
          if (vibratoToPitchBend && vib && vib.detected) {
            firePitchBend(vib.pitchBend, midiChannel);
            if (ccMappings.modWheel.enabled) {
              fireMidiCC(ccMappings.modWheel.cc, Math.min(127, Math.round(vib.depthCents * 2)), midiChannel);
            }
          } else if (pitchBendEnabled) {
            // Continuous pitch bend from pitch deviation
            const cents = result.cents;
            const bend = Math.round((cents / 200) * 8192);
            firePitchBend(bend, midiChannel);
          }

          // Quantize to scale
          const rawMidi = result.midi + (octaveOffset * 12);
          const scaleIntervals = SCALES[currentScale] || SCALES.chromatic;
          const quantized = currentScale === 'chromatic'
            ? Math.round(rawMidi)
            : quantizeToScale(rawMidi, currentKey, scaleIntervals);

          // Note histogram for key detection
          histogramRef.current[quantized % 12] += result.confidence;
          setNoteHistogram(new Float32Array(histogramRef.current));

          // Velocity from dynamics
          const vel = Math.round(Math.min(127, Math.max(1, dynamics.dynamics * velocitySensitivity * 127)));

          // Check if note changed
          const prevNotes = [...activeNotesRef.current];
          const isNewNote = prevNotes.length === 0 || !prevNotes.includes(quantized);

          if (isNewNote) {
            allNotesOff();

            if (chordMode !== 'off') {
              // Chord triggering
              const chordType = chordMode === 'auto'
                ? (scaleIntervals.includes(3) ? 'minor' : 'major')
                : chordMode;
              const intervals = CHORD_INTERVALS[chordType] || CHORD_INTERVALS.major;
              for (const interval of intervals) {
                fireNoteOn(quantized + interval, vel, midiChannel);
              }
            } else {
              fireNoteOn(quantized, vel, midiChannel);
            }

            setCurrentNote({ midi: quantized, noteName: midiToNoteName(quantized), velocity: vel });
          }
        } else {
          setConfidence(result ? result.confidence : 0);
          if (activeNotesRef.current.size > 0) {
            allNotesOff();
            setCurrentNote(null);
            firePitchBend(0, midiChannel);
          }
        }
      }

      // ── MODE: POLYPHONIC ──
      else if (mode === 'poly') {
        const pitches = polyRef.current.detect(magnitudes);
        setPolyNotes(pitches);

        if (pitches.length > 0) {
          const scaleIntervals = SCALES[currentScale] || SCALES.chromatic;
          const newNotes = new Set();

          for (const p of pitches) {
            const rawMidi = p.midi + (octaveOffset * 12);
            const quantized = currentScale === 'chromatic'
              ? Math.round(rawMidi)
              : quantizeToScale(rawMidi, currentKey, scaleIntervals);
            newNotes.add(quantized);
          }

          // Note off for notes no longer detected
          for (const n of activeNotesRef.current) {
            if (!newNotes.has(n)) fireNoteOff(n, midiChannel);
          }

          // Note on for new notes
          const vel = Math.round(Math.min(127, Math.max(1, dynamics.dynamics * velocitySensitivity * 127)));
          for (const n of newNotes) {
            if (!activeNotesRef.current.has(n)) {
              fireNoteOn(n, vel, midiChannel);
            }
          }

          setCurrentNote({ midi: [...newNotes][0], noteName: pitches.map(p => p.noteName).join(' + '), velocity: vel });
        } else {
          if (activeNotesRef.current.size > 0) allNotesOff();
          setCurrentNote(null);
        }
      }

      // ── MODE: TRIGGER ──
      else if (mode === 'trigger') {
        if (dynamics.onset) {
          const fp = fingerprintRef.current.create(magnitudes, audioCtxRef.current.sampleRate);

          if (trainingSlot !== null) {
            // Training mode: capture fingerprint
            setTriggers(prev => prev.map((t, i) => {
              if (i !== trainingSlot) return t;
              const newSamples = [...t.samples, fp].slice(-5); // keep last 5 samples
              // Average fingerprint from all samples
              const avgFp = new Float32Array(fp.length);
              for (const s of newSamples) {
                for (let j = 0; j < avgFp.length; j++) avgFp[j] += s[j];
              }
              for (let j = 0; j < avgFp.length; j++) avgFp[j] /= newSamples.length;
              return { ...t, fingerprint: avgFp, samples: newSamples, trained: true };
            }));
            setStatus(`Training slot ${trainingSlot + 1}: ${triggers[trainingSlot]?.name} — ${triggers[trainingSlot]?.samples?.length + 1 || 1}/5 samples`);
          } else {
            // Match against trained triggers
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

              fireNoteOn(trig.midiNote, vel, midiChannel === 0 ? 9 : midiChannel); // ch 10 for drums
              // Auto note-off after 100ms
              setTimeout(() => {
                fireNoteOff(trig.midiNote, midiChannel === 0 ? 9 : midiChannel);
              }, 100);

              // Animate hit
              setTriggerHits(prev => {
                const copy = [...prev];
                copy[bestMatch] = 1;
                return copy;
              });
              setTimeout(() => {
                setTriggerHits(prev => {
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

      // Auto key detection
      if (autoKeyDetect) {
        const total = histogramRef.current.reduce((a, b) => a + b, 0);
        if (total > 20) {
          const detected = detectKey(histogramRef.current);
          setDetectedKey(detected);
        }
      }

      animRef.current = requestAnimationFrame(analyze);
    };

    animRef.current = requestAnimationFrame(analyze);
  }, [
    mode, currentKey, currentScale, octaveOffset, midiChannel, velocitySensitivity,
    pitchBendEnabled, vibratoToPitchBend, chordMode, ccMappings, vowelCcEnabled,
    vowelMappings, triggers, trainingSlot, autoKeyDetect, latencyMode,
    fireNoteOn, fireNoteOff, fireMidiCC, firePitchBend, allNotesOff,
  ]);

  // Restart loop when settings change
  useEffect(() => {
    if (isListening && animRef.current) {
      cancelAnimationFrame(animRef.current);
      processLoop();
    }
  }, [mode, currentKey, currentScale, octaveOffset, chordMode, ccMappings, vowelCcEnabled, triggers, trainingSlot, isListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      allNotesOff();
    };
  }, []);

  // ── Recording controls ──
  const startRecording = () => {
    recordedRef.current = [];
    recordStartRef.current = performance.now();
    setIsRecording(true);
    setRecordedEvents([]);
    setStatus('● Recording MIDI...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordedEvents([...recordedRef.current]);
    setStatus(`✓ Recorded ${recordedRef.current.length} events`);

    // Send to parent
    if (onNotesGenerated && recordedRef.current.length > 0) {
      const notes = [];
      const noteStarts = {};
      for (const evt of recordedRef.current) {
        if (evt.type === 'noteOn') {
          noteStarts[evt.note] = evt;
        } else if (evt.type === 'noteOff' && noteStarts[evt.note]) {
          const start = noteStarts[evt.note];
          notes.push({
            id: `vmidi_${Date.now()}_${evt.note}_${Math.random().toString(36).slice(2, 6)}`,
            note: evt.note,
            velocity: start.velocity / 127,
            startBeat: (start.time / 60) * bpm,
            duration: Math.max(0.125, ((evt.time - start.time) / 60) * bpm),
            channel: evt.channel || 0,
          });
          delete noteStarts[evt.note];
        }
      }
      if (notes.length > 0) onNotesGenerated(notes);
    }
  };

  const exportMidi = () => {
    if (recordedRef.current.length === 0) { setStatus('⚠ Nothing to export'); return; }
    const bytes = writeMidiFile(recordedRef.current, bpm);
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_midi_${Date.now()}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('✓ MIDI exported');
  };

  // ── Select Web MIDI output ──
  const selectMidiOutput = (id) => {
    const out = midiOutputs.find(o => o.id === id);
    midiOutputRef.current = out?.port || null;
    setSelectedMidiOutput(id);
    setStatus(out ? `MIDI output: ${out.name}` : 'MIDI output: None');
  };

  // ── Toggle CC mapping ──
  const toggleCC = (key) => {
    setCcMappings(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  const updateCCNumber = (key, cc) => {
    setCcMappings(prev => ({ ...prev, [key]: { ...prev[key], cc: parseInt(cc) || 0 } }));
  };

  // ── Trigger training ──
  const startTraining = (slotIndex) => {
    setTrainingSlot(slotIndex);
    setStatus(`Training: Make the "${triggers[slotIndex].name}" sound 3-5 times`);
  };

  const stopTraining = () => {
    setTrainingSlot(null);
    setStatus('Training complete');
  };

  const clearTrigger = (idx) => {
    setTriggers(prev => prev.map((t, i) => i === idx
      ? { ...t, fingerprint: null, samples: [], trained: false }
      : t
    ));
  };

  const updateTrigger = (idx, updates) => {
    setTriggers(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  // ── Meter component ──
  const Meter = ({ value, color = '#00ffc8', label, max = 1, height = 80 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ width: 8, height, background: '#1a2332', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', bottom: 0, width: '100%', borderRadius: 4,
          height: `${Math.min(100, (value / max) * 100)}%`,
          background: `linear-gradient(to top, ${color}, ${color}88)`,
          transition: 'height 0.06s linear',
        }} />
      </div>
      {label && <span style={{ fontSize: '0.55rem', color: '#5a7088' }}>{label}</span>}
    </div>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      color: '#c9d1d9', fontFamily: "'Inter', -apple-system, sans-serif", overflow: 'auto',
    }}>

      {/* ══════ HEADER ══════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #21262d', background: '#161b2266',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00ffc8' }}>🎤 Voice → MIDI</span>
          <span style={{ fontSize: '0.65rem', color: '#5a7088' }}>v2 — Dubler-Style</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={isListening ? stopListening : startListening}
            style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: isListening ? '#ff3b30' : '#00ffc8', color: isListening ? '#fff' : '#000',
              fontWeight: 700, fontSize: '0.75rem',
            }}>
            {isListening ? '■ Stop' : '▶ Start'}
          </button>
          <button onClick={isRecording ? stopRecording : startRecording} disabled={!isListening}
            style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: isRecording ? '#ff3b30' : '#21262d', color: isRecording ? '#fff' : '#c9d1d9',
              fontWeight: 600, fontSize: '0.75rem', opacity: isListening ? 1 : 0.4,
            }}>
            {isRecording ? '● REC' : '⏺ Record'}
          </button>
          <button onClick={exportMidi} disabled={recordedEvents.length === 0}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid #30363d', cursor: 'pointer',
              background: 'transparent', color: '#c9d1d9', fontSize: '0.7rem',
              opacity: recordedEvents.length > 0 ? 1 : 0.4,
            }}>
            Export .mid
          </button>
        </div>
      </div>

      {/* ══════ MODE TABS ══════ */}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 12px', borderBottom: '1px solid #21262d',
      }}>
        {[
          { id: 'pitch', label: '🎵 Pitch', desc: 'Sing → Notes' },
          { id: 'poly', label: '🎹 Poly', desc: 'Sing → Chords' },
          { id: 'trigger', label: '🥁 Trigger', desc: 'Beatbox → Drums' },
        ].map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); allNotesOff(); }}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid',
              borderColor: mode === m.id ? '#00ffc8' : '#30363d',
              background: mode === m.id ? '#00ffc820' : 'transparent',
              color: mode === m.id ? '#00ffc8' : '#8b949e', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: mode === m.id ? 700 : 400,
            }}>
            {m.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#5a7088' }}>{status}</span>
      </div>

      {/* ══════ MAIN AREA ══════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Live Display ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflow: 'auto' }}>

          {/* Current Note Display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 12,
            background: '#21262d', borderRadius: 8, border: '1px solid #30363d',
          }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                fontSize: '2rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                color: currentNote ? '#00ffc8' : '#30363d',
              }}>
                {currentNote ? currentNote.noteName : '---'}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#5a7088' }}>
                {currentFreq > 0 ? `${currentFreq.toFixed(1)} Hz` : 'No pitch'}
              </div>
            </div>

            {/* Meters */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Meter value={rmsLevel} max={0.3} color="#00ffc8" label="Vol" />
              <Meter value={confidence} max={1} color="#007aff" label="Conf" />
              <Meter value={spectralBrightness} max={5000} color="#ff9500" label="Bright" />
            </div>

            {/* Vibrato indicator */}
            {vibratoInfo && vibratoInfo.detected && (
              <div style={{
                padding: '4px 8px', borderRadius: 6, background: '#af52de30',
                border: '1px solid #af52de', fontSize: '0.65rem',
              }}>
                Vibrato: {vibratoInfo.rate}Hz ±{vibratoInfo.depthCents}¢
              </div>
            )}

            {/* Formant/Vowel */}
            {formantInfo && formantInfo.vowel && (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: '#ff950030', border: '1px solid #ff9500',
                fontSize: '1rem', fontWeight: 800,
              }}>
                {formantInfo.vowel.toUpperCase()}
              </div>
            )}

            {/* Active notes */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {[...activeNotes].map(n => (
                <span key={n} style={{
                  padding: '2px 6px', borderRadius: 4, background: '#00ffc830',
                  border: '1px solid #00ffc8', fontSize: '0.6rem', fontFamily: 'monospace',
                }}>
                  {midiToNoteName(n)}
                </span>
              ))}
            </div>
          </div>

          {/* Polyphonic notes display */}
          {mode === 'poly' && polyNotes.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, padding: 8, background: '#21262d',
              borderRadius: 8, border: '1px solid #30363d',
            }}>
              {polyNotes.map((p, i) => (
                <div key={i} style={{
                  padding: '6px 10px', borderRadius: 6, background: '#007aff20',
                  border: '1px solid #007aff', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{p.noteName}</div>
                  <div style={{ fontSize: '0.55rem', color: '#5a7088' }}>
                    {p.freq.toFixed(0)}Hz ({Math.round(p.amplitude * 100)}%)
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trigger pads */}
          {mode === 'trigger' && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
            }}>
              {triggers.map((trig, i) => (
                <div key={i} style={{
                  padding: 8, borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                  background: triggerHits[i] ? `${trig.color}40` : '#21262d',
                  border: `2px solid ${trainingSlot === i ? '#ff9500' : trig.trained ? trig.color : '#30363d'}`,
                  transition: 'all 0.08s ease',
                  transform: triggerHits[i] ? 'scale(0.95)' : 'scale(1)',
                }}
                onClick={() => trainingSlot === i ? stopTraining() : startTraining(i)}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: trig.trained ? trig.color : '#5a7088' }}>
                    {trig.name}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: '#5a7088', marginTop: 2 }}>
                    Note: {trig.midiNote} {trig.trained ? `(${trig.samples.length} samples)` : '(untrained)'}
                  </div>
                  {trainingSlot === i && (
                    <div style={{
                      fontSize: '0.55rem', color: '#ff9500', marginTop: 4,
                      animation: 'pulse 1s infinite',
                    }}>
                      ● Listening...
                    </div>
                  )}
                  {trig.trained && trainingSlot !== i && (
                    <button onClick={(e) => { e.stopPropagation(); clearTrigger(i); }}
                      style={{
                        marginTop: 4, padding: '1px 6px', borderRadius: 4,
                        background: '#ff3b3020', border: '1px solid #ff3b30',
                        color: '#ff3b30', fontSize: '0.5rem', cursor: 'pointer',
                      }}>
                      Clear
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Key detection display */}
          {autoKeyDetect && detectedKey && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: '#21262d', borderRadius: 6, border: '1px solid #30363d', fontSize: '0.65rem',
            }}>
              <span style={{ color: '#5a7088' }}>Detected Key:</span>
              <span style={{ color: '#00ffc8', fontWeight: 700 }}>{detectedKey.keyName} {detectedKey.mode}</span>
              <button onClick={() => { setCurrentKey(detectedKey.key); setCurrentScale(detectedKey.mode); }}
                style={{
                  padding: '2px 8px', borderRadius: 4, background: '#00ffc820',
                  border: '1px solid #00ffc8', color: '#00ffc8', fontSize: '0.6rem', cursor: 'pointer',
                }}>
                Apply
              </button>
            </div>
          )}

          {/* MIDI CC Monitor */}
          {Object.keys(lastCC).length > 0 && (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 10px',
              background: '#21262d', borderRadius: 6, border: '1px solid #30363d',
            }}>
              <span style={{ fontSize: '0.6rem', color: '#5a7088', width: '100%' }}>MIDI CC Output:</span>
              {Object.entries(lastCC).map(([key, val]) => (
                <span key={key} style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#ff9500' }}>
                  CC{key.split('-')[1]}:{val}
                </span>
              ))}
            </div>
          )}

          {/* Recording info */}
          {recordedEvents.length > 0 && (
            <div style={{
              padding: '6px 10px', background: '#21262d', borderRadius: 6,
              border: '1px solid #30363d', fontSize: '0.65rem',
            }}>
              <span style={{ color: '#5a7088' }}>Recorded: </span>
              <span style={{ color: '#00ffc8' }}>{recordedEvents.length} events</span>
              <span style={{ color: '#5a7088' }}> — </span>
              <span style={{ color: '#c9d1d9' }}>
                {recordedEvents.filter(e => e.type === 'noteOn').length} notes,{' '}
                {recordedEvents.filter(e => e.type === 'cc').length} CC,{' '}
                {recordedEvents.filter(e => e.type === 'pitchBend').length} PB
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Settings Panel ── */}
        <div style={{
          width: 260, borderLeft: '1px solid #21262d', padding: 10,
          overflow: 'auto', fontSize: '0.7rem',
        }}>
          {/* Musical Settings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#00ffc8', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Musical</div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Key</label>
              <select value={currentKey} onChange={e => setCurrentKey(parseInt(e.target.value))}
                style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', padding: '2px 4px', fontSize: '0.65rem' }}>
                {KEY_NAMES.map((k, i) => <option key={i} value={i}>{k}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Scale</label>
              <select value={currentScale} onChange={e => setCurrentScale(e.target.value)}
                style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', padding: '2px 4px', fontSize: '0.65rem' }}>
                {Object.keys(SCALES).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Octave</label>
              <input type="range" min={-3} max={3} value={octaveOffset}
                onChange={e => setOctaveOffset(parseInt(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ width: 20, textAlign: 'center' }}>{octaveOffset >= 0 ? '+' : ''}{octaveOffset}</span>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Chord</label>
              <select value={chordMode} onChange={e => setChordMode(e.target.value)}
                style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', padding: '2px 4px', fontSize: '0.65rem' }}>
                <option value="off">Off (single notes)</option>
                <option value="major">Major triads</option>
                <option value="minor">Minor triads</option>
                <option value="auto">Auto (from scale)</option>
                <option value="maj7">Major 7th</option>
                <option value="min7">Minor 7th</option>
                <option value="dom7">Dominant 7th</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Channel</label>
              <select value={midiChannel} onChange={e => setMidiChannel(parseInt(e.target.value))}
                style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', padding: '2px 4px', fontSize: '0.65rem' }}>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>Ch {i + 1}{i === 9 ? ' (Drums)' : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <label style={{ width: 50, color: '#5a7088' }}>Velocity</label>
              <input type="range" min={0.1} max={1} step={0.05} value={velocitySensitivity}
                onChange={e => setVelocitySensitivity(parseFloat(e.target.value))}
                style={{ flex: 1 }} />
              <span style={{ width: 30, textAlign: 'center' }}>{Math.round(velocitySensitivity * 100)}%</span>
            </div>
          </div>

          {/* Pitch Bend & Vibrato */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#af52de', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Pitch Bend</div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={pitchBendEnabled} onChange={e => setPitchBendEnabled(e.target.checked)} />
              <span>Continuous pitch bend</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={vibratoToPitchBend} onChange={e => setVibratoToPitchBend(e.target.checked)} />
              <span>Vibrato → pitch bend</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoKeyDetect} onChange={e => setAutoKeyDetect(e.target.checked)} />
              <span>Auto key detection</span>
            </label>
          </div>

          {/* MIDI CC Mappings */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#ff9500', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>MIDI CC Controls</div>
            {Object.entries(ccMappings).map(([key, mapping]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3,
                opacity: mapping.enabled ? 1 : 0.5,
              }}>
                <input type="checkbox" checked={mapping.enabled} onChange={() => toggleCC(key)}
                  style={{ width: 14, height: 14 }} />
                <span style={{ width: 60, fontSize: '0.6rem' }}>{mapping.label}</span>
                <span style={{ fontSize: '0.55rem', color: '#5a7088' }}>CC</span>
                <input type="number" value={mapping.cc} min={0} max={127}
                  onChange={e => updateCCNumber(key, e.target.value)}
                  style={{
                    width: 36, background: '#21262d', border: '1px solid #30363d',
                    borderRadius: 3, color: '#c9d1d9', padding: '1px 3px', fontSize: '0.6rem',
                  }} />
              </div>
            ))}
          </div>

          {/* Vowel-to-CC */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#ff2d55', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={vowelCcEnabled} onChange={e => setVowelCcEnabled(e.target.checked)} />
                Vowel → CC
              </label>
            </div>
            {vowelCcEnabled && Object.entries(vowelMappings).map(([vowel, mapping]) => (
              <div key={vowel} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span style={{ width: 16, fontWeight: 800, color: '#ff2d55' }}>{vowel.toUpperCase()}</span>
                <span style={{ fontSize: '0.55rem', color: '#5a7088', width: 20 }}>CC</span>
                <input type="number" value={mapping.cc} min={0} max={127}
                  onChange={e => setVowelMappings(prev => ({
                    ...prev, [vowel]: { ...prev[vowel], cc: parseInt(e.target.value) || 0 }
                  }))}
                  style={{
                    width: 32, background: '#21262d', border: '1px solid #30363d',
                    borderRadius: 3, color: '#c9d1d9', padding: '1px 3px', fontSize: '0.6rem',
                  }} />
                <span style={{ fontSize: '0.55rem', color: '#5a7088', width: 20 }}>Val</span>
                <input type="number" value={mapping.value} min={0} max={127}
                  onChange={e => setVowelMappings(prev => ({
                    ...prev, [vowel]: { ...prev[vowel], value: parseInt(e.target.value) || 0 }
                  }))}
                  style={{
                    width: 32, background: '#21262d', border: '1px solid #30363d',
                    borderRadius: 3, color: '#c9d1d9', padding: '1px 3px', fontSize: '0.6rem',
                  }} />
                <span style={{ fontSize: '0.5rem', color: '#5a7088' }}>{mapping.label}</span>
              </div>
            ))}
          </div>

          {/* Web MIDI Output */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#007aff', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>MIDI Output</div>
            {midiOutputs.length > 0 ? (
              <select value={selectedMidiOutput || ''} onChange={e => selectMidiOutput(e.target.value)}
                style={{ width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 4, color: '#c9d1d9', padding: '3px 4px', fontSize: '0.65rem' }}>
                <option value="">Internal only</option>
                {midiOutputs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: '0.6rem', color: '#5a7088' }}>
                {webMidiEnabled ? 'No MIDI devices found' : 'Web MIDI not available'}
              </span>
            )}
          </div>

          {/* Latency */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#5ac8fa', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Latency</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['low', 'balanced', 'quality'].map(l => (
                <button key={l} onClick={() => { setLatencyMode(l); if (isListening) { stopListening(); setTimeout(startListening, 100); } }}
                  style={{
                    flex: 1, padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                    border: `1px solid ${latencyMode === l ? '#5ac8fa' : '#30363d'}`,
                    background: latencyMode === l ? '#5ac8fa20' : 'transparent',
                    color: latencyMode === l ? '#5ac8fa' : '#5a7088', fontSize: '0.6rem',
                  }}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '0.55rem', color: '#5a7088', marginTop: 3 }}>
              Buffer: {BUFFER_SIZES[latencyMode]} samples (~{Math.round(BUFFER_SIZES[latencyMode] / 48)}ms)
            </div>
          </div>

          {/* Trigger Settings (when in trigger mode) */}
          {mode === 'trigger' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: '#ff3b30', marginBottom: 6, fontSize: '0.65rem', textTransform: 'uppercase' }}>Trigger Settings</div>
              {triggers.map((trig, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3,
                  padding: '2px 4px', borderRadius: 4,
                  background: trainingSlot === i ? '#ff950020' : 'transparent',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: trig.color }} />
                  <input value={trig.name}
                    onChange={e => updateTrigger(i, { name: e.target.value })}
                    style={{
                      width: 55, background: '#21262d', border: '1px solid #30363d',
                      borderRadius: 3, color: '#c9d1d9', padding: '1px 3px', fontSize: '0.6rem',
                    }} />
                  <span style={{ fontSize: '0.5rem', color: '#5a7088' }}>N:</span>
                  <input type="number" value={trig.midiNote} min={0} max={127}
                    onChange={e => updateTrigger(i, { midiNote: parseInt(e.target.value) || 36 })}
                    style={{
                      width: 30, background: '#21262d', border: '1px solid #30363d',
                      borderRadius: 3, color: '#c9d1d9', padding: '1px 3px', fontSize: '0.6rem',
                    }} />
                  <span style={{ fontSize: '0.5rem', color: '#5a7088' }}>Th:</span>
                  <input type="range" min={0.3} max={0.95} step={0.05} value={trig.threshold}
                    onChange={e => updateTrigger(i, { threshold: parseFloat(e.target.value) })}
                    style={{ width: 40 }} />
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