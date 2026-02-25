// =============================================================================
// InstrumentTrackEngine.js — Software Instrument Track System v2
// =============================================================================
// Location: src/front/js/component/InstrumentTrackEngine.js
//
// Three sound sources per instrument track:
//   1. GM Synth — MidiSoundEngine's 128 built-in instruments
//   2. Sampler  — User samples loaded from Sound Browser, Freesound, file upload
//   3. External — Akai MPK, Novation Launchpad, any USB MIDI controller
//
// Logic Pro-style workflow:
//   • Each MIDI track has an assigned sound source + instrument
//   • Arm a track → play keyboard/Akai/any controller → hear that instrument
//   • Place MIDI regions on timeline → playback triggers instruments
//   • Double-click MIDI region → opens Piano Roll scoped to that region
//   • Load any sample from Sound tab → it becomes the instrument on that track
//
// =============================================================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import MidiSoundEngine, { GM_FAMILIES, DRUM_MAP } from './MidiSoundEngine';

// =============================================================================
// CONSTANTS
// =============================================================================

// Computer keyboard → MIDI note mapping (2 octaves, matches SamplerInstrument)
const KEYBOARD_MAP = {
  'z': 0,  's': 1,  'x': 2,  'd': 3,  'c': 4,  'v': 5,
  'g': 6,  'b': 7,  'h': 8,  'n': 9,  'j': 10, 'm': 11,
  'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17,
  '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23,
  'i': 24,
};

// Sound source types
export const SOURCE_TYPES = {
  GM_SYNTH: 'gm_synth',      // Built-in MidiSoundEngine GM instruments
  SAMPLER: 'sampler',         // User-loaded audio sample (repitched across keyboard)
  DRUM_KIT: 'drum_kit',      // GM Channel 10 drums
  SAMPLE_KIT: 'sample_kit',  // Multiple samples mapped to pads/notes (like MPC)
};

// Default instrument presets for quick assignment
const DEFAULT_INSTRUMENTS = {
  keys:    { source: SOURCE_TYPES.GM_SYNTH, program: 0,  name: 'Acoustic Grand Piano' },
  bass:    { source: SOURCE_TYPES.GM_SYNTH, program: 33, name: 'Electric Bass (finger)' },
  drums:   { source: SOURCE_TYPES.DRUM_KIT, program: -1, name: 'Drum Kit' },
  synth:   { source: SOURCE_TYPES.GM_SYNTH, program: 80, name: 'Square Lead' },
  pad:     { source: SOURCE_TYPES.GM_SYNTH, program: 89, name: 'Warm Pad' },
  strings: { source: SOURCE_TYPES.GM_SYNTH, program: 48, name: 'String Ensemble' },
  guitar:  { source: SOURCE_TYPES.GM_SYNTH, program: 25, name: 'Steel Guitar' },
  organ:   { source: SOURCE_TYPES.GM_SYNTH, program: 16, name: 'Drawbar Organ' },
};


// =============================================================================
// MIDI REGION HELPERS
// =============================================================================

export const createMidiRegion = (startBeat, duration = 4, name = 'MIDI Region') => ({
  id: `midi_rgn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  type: 'midi',
  name,
  startBeat,
  duration,
  color: '#7c3aed',
  notes: [],
  loopEnabled: false,
  loopCount: 1,
});

export const createMidiRegionFromNotes = (notes, name = 'MIDI Region') => {
  if (!notes?.length) return createMidiRegion(0, 4, name);
  const minBeat = Math.min(...notes.map(n => n.startBeat));
  const maxEnd = Math.max(...notes.map(n => n.startBeat + n.duration));
  const duration = Math.max(maxEnd - minBeat, 1);
  const relativeNotes = notes.map(n => ({
    ...n,
    startBeat: n.startBeat - minBeat,
  }));
  return { ...createMidiRegion(minBeat, duration, name), notes: relativeNotes };
};

export const getAbsoluteNotes = (region) => {
  if (!region?.notes?.length) return [];
  return region.notes.map(n => ({
    ...n,
    startBeat: n.startBeat + region.startBeat,
  }));
};


// =============================================================================
// SAMPLER VOICE — plays a loaded AudioBuffer pitched across the keyboard
// =============================================================================
// Lightweight version of SamplerInstrument's playNote for use as track instrument.

class SamplerVoice {
  constructor(audioCtx, outputNode) {
    this.ctx = audioCtx;
    this.output = outputNode;
    this.voices = {};

    this.rootNote = 60;
    this.attack = 0.005;
    this.decay = 0.1;
    this.sustain = 0.8;
    this.release = 0.2;
    this.buffer = null;
    this.name = '';

    this.filterEnabled = false;
    this.filterType = 'lowpass';
    this.filterFreq = 20000;
    this.filterQ = 1;
  }

  loadSample(buffer, name = '', rootNote = 60) {
    this.buffer = buffer;
    this.name = name;
    this.rootNote = rootNote;
  }

  async loadFromUrl(url, name = '', rootNote = 60) {
    try {
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuf);
      this.name = name;
      this.rootNote = rootNote;
      return true;
    } catch (e) {
      console.error('SamplerVoice: Failed to load sample:', e);
      return false;
    }
  }

  async loadFromFile(file, rootNote = 60) {
    try {
      const arrayBuf = await file.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuf);
      this.name = file.name.replace(/\.[^/.]+$/, '');
      this.rootNote = rootNote;
      return true;
    } catch (e) {
      console.error('SamplerVoice: Failed to load file:', e);
      return false;
    }
  }

  setEnvelope(attack, decay, sustain, release) {
    this.attack = attack ?? this.attack;
    this.decay = decay ?? this.decay;
    this.sustain = sustain ?? this.sustain;
    this.release = release ?? this.release;
  }

  noteOn(noteNum, velocity = 100) {
    if (!this.buffer) return;
    this.noteOff(noteNum);

    const vel = velocity / 127;
    const semitones = noteNum - this.rootNote;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = Math.pow(2, semitones / 12);

    const gain = this.ctx.createGain();
    const peakVol = vel;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + this.attack);
    gain.gain.linearRampToValueAtTime(peakVol * this.sustain, now + this.attack + this.decay);

    let lastNode = src;
    if (this.filterEnabled) {
      const filt = this.ctx.createBiquadFilter();
      filt.type = this.filterType;
      filt.frequency.value = this.filterFreq;
      filt.Q.value = this.filterQ;
      src.connect(filt);
      lastNode = filt;
    }

    lastNode.connect(gain);
    gain.connect(this.output);
    src.start(now);
    this.voices[noteNum] = { src, gain, startTime: now };
    src.onended = () => { delete this.voices[noteNum]; };
  }

  noteOff(noteNum) {
    const voice = this.voices[noteNum];
    if (!voice) return;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + this.release);
    try { voice.src.stop(now + this.release + 0.05); } catch (e) {}
    delete this.voices[noteNum];
  }

  allNotesOff() {
    Object.keys(this.voices).forEach(n => this.noteOff(parseInt(n)));
  }

  destroy() {
    this.allNotesOff();
    this.buffer = null;
  }
}


// =============================================================================
// SAMPLE KIT — Multiple samples mapped to individual notes (MPC/Maschine style)
// =============================================================================

class SampleKitVoice {
  constructor(audioCtx, outputNode) {
    this.ctx = audioCtx;
    this.output = outputNode;
    this.pads = {};
    this.voices = {};
    this.name = 'Sample Kit';
  }

  loadPad(noteNum, buffer, name = '', settings = {}) {
    this.pads[noteNum] = {
      buffer,
      name: name || `Pad ${noteNum}`,
      volume: settings.volume ?? 1.0,
      attack: settings.attack ?? 0.001,
      decay: settings.decay ?? 0.1,
      sustain: settings.sustain ?? 1.0,
      release: settings.release ?? 0.15,
      pitch: settings.pitch ?? 0,
      reverse: settings.reverse ?? false,
    };
  }

  async loadPadFromUrl(noteNum, url, name = '', settings = {}) {
    try {
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuf);
      this.loadPad(noteNum, buffer, name, settings);
      return true;
    } catch (e) {
      console.error(`SampleKit: Failed to load pad ${noteNum}:`, e);
      return false;
    }
  }

  async loadPadFromFile(noteNum, file, settings = {}) {
    try {
      const arrayBuf = await file.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuf);
      this.loadPad(noteNum, buffer, file.name.replace(/\.[^/.]+$/, ''), settings);
      return true;
    } catch (e) {
      console.error(`SampleKit: Failed to load pad file:`, e);
      return false;
    }
  }

  noteOn(noteNum, velocity = 100) {
    const pad = this.pads[noteNum];
    if (!pad?.buffer) return;
    this.noteOff(noteNum);

    const vel = velocity / 127;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();

    if (pad.reverse) {
      const rev = this.ctx.createBuffer(
        pad.buffer.numberOfChannels, pad.buffer.length, pad.buffer.sampleRate
      );
      for (let ch = 0; ch < pad.buffer.numberOfChannels; ch++) {
        const s = pad.buffer.getChannelData(ch);
        const d = rev.getChannelData(ch);
        for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i];
      }
      src.buffer = rev;
    } else {
      src.buffer = pad.buffer;
    }

    if (pad.pitch) src.playbackRate.value = Math.pow(2, pad.pitch / 12);

    const gain = this.ctx.createGain();
    const peakVol = pad.volume * vel;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + pad.attack);
    gain.gain.linearRampToValueAtTime(peakVol * pad.sustain, now + pad.attack + pad.decay);

    src.connect(gain);
    gain.connect(this.output);
    src.start(now);

    this.voices[noteNum] = { src, gain };
    src.onended = () => delete this.voices[noteNum];
  }

  noteOff(noteNum) {
    const voice = this.voices[noteNum];
    if (!voice) return;
    const pad = this.pads[noteNum];
    const release = pad?.release ?? 0.15;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + release);
    try { voice.src.stop(now + release + 0.05); } catch (e) {}
    delete this.voices[noteNum];
  }

  allNotesOff() {
    Object.keys(this.voices).forEach(n => this.noteOff(parseInt(n)));
  }

  getPadInfo() {
    return Object.entries(this.pads).map(([note, pad]) => ({
      note: parseInt(note), name: pad.name, hasBuffer: !!pad.buffer,
    }));
  }

  destroy() {
    this.allNotesOff();
    this.pads = {};
  }
}


// =============================================================================
// HOOK: useInstrumentTrackEngine
// =============================================================================

export function useInstrumentTrackEngine(audioCtxRef, tracks, options = {}) {
  const {
    bpm = 120,
    isPlaying = false,
    isRecording = false,
    playheadBeat = 0,
    onNotesRecorded,
    masterGainRef,
  } = options;

  const gmEngineRef = useRef(null);
  const samplerVoicesRef = useRef({});
  const sampleKitVoicesRef = useRef({});
  const schedulerRef = useRef(null);
  const activeNotesRef = useRef(new Set());
  const recordingNotesRef = useRef({});
  const recordedNotesRef = useRef([]);
  const keyboardOctaveRef = useRef(4);
  const activeKeysRef = useRef(new Set());
  const midiAccessRef = useRef(null);

  const [trackInstruments, setTrackInstruments] = useState({});
  const [keyboardOctave, setKeyboardOctave] = useState(4);
  const [midiDevices, setMidiDevices] = useState([]);
  const [activeMidiDevice, setActiveMidiDevice] = useState(null);
  const [midiActivity, setMidiActivity] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // SOUND ENGINE INITIALIZATION
  // ═══════════════════════════════════════════════════════════

  const getGmEngine = useCallback(() => {
    if (!audioCtxRef?.current) return null;
    if (!gmEngineRef.current) {
      gmEngineRef.current = new MidiSoundEngine(audioCtxRef.current);
      if (masterGainRef?.current) {
        try {
          gmEngineRef.current.masterGain.disconnect();
          gmEngineRef.current.masterGain.connect(masterGainRef.current);
        } catch (e) {}
      }
    }
    return gmEngineRef.current;
  }, [audioCtxRef, masterGainRef]);

  const getOutputNode = useCallback(() => {
    return masterGainRef?.current || audioCtxRef?.current?.destination;
  }, [audioCtxRef, masterGainRef]);

  const getSamplerVoice = useCallback((trackIndex) => {
    if (!audioCtxRef?.current) return null;
    if (!samplerVoicesRef.current[trackIndex]) {
      samplerVoicesRef.current[trackIndex] = new SamplerVoice(
        audioCtxRef.current, getOutputNode()
      );
    }
    return samplerVoicesRef.current[trackIndex];
  }, [audioCtxRef, getOutputNode]);

  const getSampleKitVoice = useCallback((trackIndex) => {
    if (!audioCtxRef?.current) return null;
    if (!sampleKitVoicesRef.current[trackIndex]) {
      sampleKitVoicesRef.current[trackIndex] = new SampleKitVoice(
        audioCtxRef.current, getOutputNode()
      );
    }
    return sampleKitVoicesRef.current[trackIndex];
  }, [audioCtxRef, getOutputNode]);


  // ═══════════════════════════════════════════════════════════
  // INSTRUMENT ASSIGNMENT
  // ═══════════════════════════════════════════════════════════

  const setTrackInstrument = useCallback((trackIndex, config) => {
    const source = config.source || SOURCE_TYPES.GM_SYNTH;
    let channel = trackIndex;
    if (channel >= 9) channel += 1;
    if (channel > 15) channel = channel % 15;
    let name = config.name || '';

    switch (source) {
      case SOURCE_TYPES.GM_SYNTH: {
        const engine = getGmEngine();
        if (engine) engine.programChange(channel, config.program || 0);
        name = name || MidiSoundEngine.getInstrumentName(config.program || 0);
        break;
      }
      case SOURCE_TYPES.SAMPLER: {
        const sampler = getSamplerVoice(trackIndex);
        if (sampler) {
          if (config.buffer) sampler.loadSample(config.buffer, config.name || '', config.rootNote || 60);
          else if (config.url) sampler.loadFromUrl(config.url, config.name || '', config.rootNote || 60);
          if (config.envelope) sampler.setEnvelope(config.envelope.attack, config.envelope.decay, config.envelope.sustain, config.envelope.release);
          name = name || sampler.name || 'Sample';
        }
        break;
      }
      case SOURCE_TYPES.DRUM_KIT: {
        channel = 9;
        name = 'Drum Kit';
        break;
      }
      case SOURCE_TYPES.SAMPLE_KIT: {
        const kit = getSampleKitVoice(trackIndex);
        if (kit && config.pads) {
          config.pads.forEach(pad => {
            if (pad.buffer) kit.loadPad(pad.note, pad.buffer, pad.name, pad.settings);
          });
        }
        name = name || 'Sample Kit';
        break;
      }
    }

    setTrackInstruments(prev => ({
      ...prev,
      [trackIndex]: {
        source, program: config.program ?? 0, channel, name,
        isDrum: source === SOURCE_TYPES.DRUM_KIT,
        isSampler: source === SOURCE_TYPES.SAMPLER,
        isSampleKit: source === SOURCE_TYPES.SAMPLE_KIT,
        rootNote: config.rootNote || 60,
      },
    }));
  }, [getGmEngine, getSamplerVoice, getSampleKitVoice]);

  const getTrackInstrument = useCallback((trackIndex) => {
    return trackInstruments[trackIndex] || null;
  }, [trackInstruments]);


  // ═══════════════════════════════════════════════════════════
  // SAMPLE LOADING — From Sound Browser / Freesound / Drag-Drop
  // ═══════════════════════════════════════════════════════════

  const loadSampleOntoTrack = useCallback((trackIndex, buffer, name = '', rootNote = 60) => {
    setTrackInstrument(trackIndex, { source: SOURCE_TYPES.SAMPLER, buffer, name, rootNote });
  }, [setTrackInstrument]);

  const loadSampleFromUrl = useCallback(async (trackIndex, url, name = '', rootNote = 60) => {
    const sampler = getSamplerVoice(trackIndex);
    if (!sampler) return false;
    const ok = await sampler.loadFromUrl(url, name, rootNote);
    if (ok) setTrackInstrument(trackIndex, { source: SOURCE_TYPES.SAMPLER, name: sampler.name, rootNote });
    return ok;
  }, [getSamplerVoice, setTrackInstrument]);

  const loadSampleFromFile = useCallback(async (trackIndex, file, rootNote = 60) => {
    const sampler = getSamplerVoice(trackIndex);
    if (!sampler) return false;
    const ok = await sampler.loadFromFile(file, rootNote);
    if (ok) setTrackInstrument(trackIndex, { source: SOURCE_TYPES.SAMPLER, name: sampler.name, rootNote });
    return ok;
  }, [getSamplerVoice, setTrackInstrument]);

  const loadSampleKitPad = useCallback((trackIndex, noteNum, buffer, name = '', settings = {}) => {
    const kit = getSampleKitVoice(trackIndex);
    if (!kit) return;
    kit.loadPad(noteNum, buffer, name, settings);
    const existing = trackInstruments[trackIndex];
    if (!existing || existing.source !== SOURCE_TYPES.SAMPLE_KIT) {
      setTrackInstrument(trackIndex, { source: SOURCE_TYPES.SAMPLE_KIT, name: 'Sample Kit' });
    }
  }, [getSampleKitVoice, trackInstruments, setTrackInstrument]);


  // ═══════════════════════════════════════════════════════════
  // NOTE PLAYBACK — Routes to correct engine per track
  // ═══════════════════════════════════════════════════════════

  const playNoteOnTrack = useCallback((trackIndex, noteNum, velocity = 100) => {
    const inst = trackInstruments[trackIndex];
    if (!inst) return;

    switch (inst.source) {
      case SOURCE_TYPES.GM_SYNTH: {
        const engine = getGmEngine();
        if (engine) engine.noteOn(inst.channel, noteNum, velocity);
        break;
      }
      case SOURCE_TYPES.DRUM_KIT: {
        const engine = getGmEngine();
        if (engine) engine.noteOn(9, noteNum, velocity);
        break;
      }
      case SOURCE_TYPES.SAMPLER: {
        const sampler = samplerVoicesRef.current[trackIndex];
        if (sampler) sampler.noteOn(noteNum, velocity);
        break;
      }
      case SOURCE_TYPES.SAMPLE_KIT: {
        const kit = sampleKitVoicesRef.current[trackIndex];
        if (kit) kit.noteOn(noteNum, velocity);
        break;
      }
    }

    if (isRecording && tracks[trackIndex]?.armed) {
      recordingNotesRef.current[noteNum] = { startBeat: playheadBeat, velocity, channel: inst.channel };
    }
  }, [trackInstruments, getGmEngine, isRecording, tracks, playheadBeat]);

  const stopNoteOnTrack = useCallback((trackIndex, noteNum) => {
    const inst = trackInstruments[trackIndex];
    if (!inst) return;

    switch (inst.source) {
      case SOURCE_TYPES.GM_SYNTH: {
        const engine = getGmEngine();
        if (engine) engine.noteOff(inst.channel, noteNum);
        break;
      }
      case SOURCE_TYPES.DRUM_KIT: {
        const engine = getGmEngine();
        if (engine) engine.noteOff(9, noteNum);
        break;
      }
      case SOURCE_TYPES.SAMPLER: {
        const sampler = samplerVoicesRef.current[trackIndex];
        if (sampler) sampler.noteOff(noteNum);
        break;
      }
      case SOURCE_TYPES.SAMPLE_KIT: {
        const kit = sampleKitVoicesRef.current[trackIndex];
        if (kit) kit.noteOff(noteNum);
        break;
      }
    }

    if (isRecording && recordingNotesRef.current[noteNum]) {
      const start = recordingNotesRef.current[noteNum];
      const duration = Math.max(playheadBeat - start.startBeat, 0.125);
      recordedNotesRef.current.push({
        id: `rec_${Date.now()}_${noteNum}`,
        note: noteNum, velocity: start.velocity, startBeat: start.startBeat, duration,
      });
      delete recordingNotesRef.current[noteNum];
    }
  }, [trackInstruments, getGmEngine, isRecording, playheadBeat]);

  const allNotesOffTrack = useCallback((trackIndex) => {
    const inst = trackInstruments[trackIndex];
    if (!inst) return;
    switch (inst.source) {
      case SOURCE_TYPES.GM_SYNTH:
      case SOURCE_TYPES.DRUM_KIT: {
        const engine = getGmEngine();
        if (engine) engine.allNotesOff(inst.channel);
        break;
      }
      case SOURCE_TYPES.SAMPLER: {
        const sampler = samplerVoicesRef.current[trackIndex];
        if (sampler) sampler.allNotesOff();
        break;
      }
      case SOURCE_TYPES.SAMPLE_KIT: {
        const kit = sampleKitVoicesRef.current[trackIndex];
        if (kit) kit.allNotesOff();
        break;
      }
    }
  }, [trackInstruments, getGmEngine]);


  // ═══════════════════════════════════════════════════════════
  // ARMED TRACK FINDER
  // ═══════════════════════════════════════════════════════════

  const getArmedMidiTrack = useCallback(() => {
    return tracks.findIndex(t =>
      t.armed && (t.trackType === 'midi' || t.trackType === 'instrument')
    );
  }, [tracks]);


  // ═══════════════════════════════════════════════════════════
  // COMPUTER KEYBOARD INPUT
  // ═══════════════════════════════════════════════════════════

  const handleKeyDown = useCallback((e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();

    if (key === '[') {
      setKeyboardOctave(prev => Math.max(0, prev - 1));
      keyboardOctaveRef.current = Math.max(0, keyboardOctaveRef.current - 1);
      return;
    }
    if (key === ']') {
      setKeyboardOctave(prev => Math.min(8, prev + 1));
      keyboardOctaveRef.current = Math.min(8, keyboardOctaveRef.current + 1);
      return;
    }

    const semitone = KEYBOARD_MAP[key];
    if (semitone === undefined) return;
    if (activeKeysRef.current.has(key)) return;

    e.preventDefault();
    activeKeysRef.current.add(key);

    const armedTrack = getArmedMidiTrack();
    if (armedTrack === -1) return;

    const midiNote = (keyboardOctaveRef.current * 12) + semitone;
    if (midiNote < 0 || midiNote > 127) return;
    playNoteOnTrack(armedTrack, midiNote, 100);
  }, [getArmedMidiTrack, playNoteOnTrack]);

  const handleKeyUp = useCallback((e) => {
    const key = e.key.toLowerCase();
    const semitone = KEYBOARD_MAP[key];
    if (semitone === undefined) return;
    activeKeysRef.current.delete(key);

    const armedTrack = getArmedMidiTrack();
    if (armedTrack === -1) return;

    const midiNote = (keyboardOctaveRef.current * 12) + semitone;
    stopNoteOnTrack(armedTrack, midiNote);
  }, [getArmedMidiTrack, stopNoteOnTrack]);


  // ═══════════════════════════════════════════════════════════
  // EXTERNAL MIDI HARDWARE (Akai MPK, Novation, etc.)
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false })
      .then(access => {
        midiAccessRef.current = access;
        updateMidiDevices(access);
        access.onstatechange = () => updateMidiDevices(access);
      })
      .catch(err => console.warn('MIDI access denied:', err.message));

    return () => {
      if (midiAccessRef.current) {
        midiAccessRef.current.inputs.forEach(input => { input.onmidimessage = null; });
      }
    };
  }, []);

  const updateMidiDevices = useCallback((access) => {
    const inputs = [];
    access.inputs.forEach((input, id) => {
      inputs.push({ id, name: input.name, manufacturer: input.manufacturer });
    });
    setMidiDevices(inputs);
    if (inputs.length > 0 && !activeMidiDevice) {
      connectMidiDevice(inputs[0].id);
    }
  }, [activeMidiDevice]);

  const connectMidiDevice = useCallback((deviceId) => {
    const access = midiAccessRef.current;
    if (!access) return;
    access.inputs.forEach(input => { input.onmidimessage = null; });
    const input = access.inputs.get(deviceId);
    if (!input) return;
    input.onmidimessage = handleExternalMidi;
    setActiveMidiDevice({ id: deviceId, name: input.name });
  }, []);

  const disconnectMidiDevice = useCallback(() => {
    if (midiAccessRef.current) {
      midiAccessRef.current.inputs.forEach(input => { input.onmidimessage = null; });
    }
    setActiveMidiDevice(null);
  }, []);

  const handleExternalMidi = useCallback((event) => {
    const [status, data1, data2] = event.data;
    const type = status & 0xF0;

    setMidiActivity(true);
    setTimeout(() => setMidiActivity(false), 100);

    const armedTrack = getArmedMidiTrack();
    if (armedTrack === -1) return;

    if (type === 0x90 && data2 > 0) {
      playNoteOnTrack(armedTrack, data1, data2);
    } else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      stopNoteOnTrack(armedTrack, data1);
    } else if (type === 0xE0) {
      const engine = getGmEngine();
      const inst = trackInstruments[armedTrack];
      if (engine && inst) {
        const bend = ((data2 << 7) | data1) - 8192;
        engine.pitchBend(inst.channel, bend);
      }
    }
  }, [getArmedMidiTrack, playNoteOnTrack, stopNoteOnTrack, getGmEngine, trackInstruments]);

  useEffect(() => {
    if (activeMidiDevice && midiAccessRef.current) {
      const input = midiAccessRef.current.inputs.get(activeMidiDevice.id);
      if (input) input.onmidimessage = handleExternalMidi;
    }
  }, [handleExternalMidi, activeMidiDevice]);


  // ═══════════════════════════════════════════════════════════
  // MIDI REGION PLAYBACK SCHEDULER
  // ═══════════════════════════════════════════════════════════

  const scheduleMidiPlayback = useCallback(() => {
    if (!isPlaying) return;
    const lookAheadBeats = 0.5;
    const startBeat = playheadBeat;
    const endBeat = playheadBeat + lookAheadBeats;

    tracks.forEach((track, trackIndex) => {
      if (track.muted) return;
      if (track.trackType !== 'midi' && track.trackType !== 'instrument') return;
      const inst = trackInstruments[trackIndex];
      if (!inst) return;

      (track.regions || []).forEach(region => {
        if (region.type !== 'midi' || !region.notes?.length) return;

        region.notes.forEach(note => {
          const absStart = note.startBeat + region.startBeat;
          if (absStart >= startBeat && absStart < endBeat) {
            const noteKey = `${trackIndex}_${region.id}_${note.note}_${absStart}`;
            if (activeNotesRef.current.has(noteKey)) return;
            activeNotesRef.current.add(noteKey);

            const delaySec = ((absStart - playheadBeat) / bpm) * 60;
            setTimeout(() => {
              playNoteOnTrack(trackIndex, note.note, Math.round((note.velocity || 0.8) * 127));
            }, Math.max(0, delaySec * 1000));

            const durationSec = (note.duration / bpm) * 60;
            setTimeout(() => {
              stopNoteOnTrack(trackIndex, note.note);
              activeNotesRef.current.delete(noteKey);
            }, Math.max(0, (delaySec + durationSec) * 1000));
          }
        });
      });
    });
  }, [isPlaying, playheadBeat, tracks, trackInstruments, bpm, playNoteOnTrack, stopNoteOnTrack]);

  useEffect(() => {
    if (isPlaying) {
      activeNotesRef.current.clear();
      const interval = setInterval(scheduleMidiPlayback, 50);
      schedulerRef.current = interval;
      return () => clearInterval(interval);
    } else {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      activeNotesRef.current.clear();
      Object.keys(trackInstruments).forEach(idx => allNotesOffTrack(parseInt(idx)));
    }
  }, [isPlaying, scheduleMidiPlayback, trackInstruments, allNotesOffTrack]);


  // ═══════════════════════════════════════════════════════════
  // RECORDING FINALIZE
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isRecording && recordedNotesRef.current.length > 0) {
      const notes = [...recordedNotesRef.current];
      recordedNotesRef.current = [];
      recordingNotesRef.current = {};
      if (onNotesRecorded) onNotesRecorded(notes);
    }
  }, [isRecording, onNotesRecorded]);


  // ═══════════════════════════════════════════════════════════
  // KEYBOARD EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);


  // ═══════════════════════════════════════════════════════════
  // AUTO-ASSIGN INSTRUMENTS TO NEW MIDI TRACKS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    tracks.forEach((track, i) => {
      if ((track.trackType === 'midi' || track.trackType === 'instrument') && !trackInstruments[i]) {
        const name = (track.name || '').toLowerCase();
        if (name.includes('drum') || name.includes('beat') || name.includes('perc')) {
          setTrackInstrument(i, { source: SOURCE_TYPES.DRUM_KIT });
        } else if (name.includes('bass')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.bass);
        } else if (name.includes('synth') || name.includes('lead')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.synth);
        } else if (name.includes('pad')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.pad);
        } else if (name.includes('string')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.strings);
        } else if (name.includes('guitar')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.guitar);
        } else if (name.includes('organ')) {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.organ);
        } else {
          setTrackInstrument(i, DEFAULT_INSTRUMENTS.keys);
        }
      }
    });
  }, [tracks, trackInstruments, setTrackInstrument]);


  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      if (gmEngineRef.current) {
        gmEngineRef.current.allNotesOff();
        gmEngineRef.current.destroy();
        gmEngineRef.current = null;
      }
      Object.values(samplerVoicesRef.current).forEach(s => s.destroy());
      Object.values(sampleKitVoicesRef.current).forEach(k => k.destroy());
      samplerVoicesRef.current = {};
      sampleKitVoicesRef.current = {};
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      disconnectMidiDevice();
    };
  }, []);


  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  return {
    // Instrument management
    setTrackInstrument,
    getTrackInstrument,
    trackInstruments,
    SOURCE_TYPES,

    // Sample loading (Sound tab / Freesound / drag-drop)
    loadSampleOntoTrack,
    loadSampleFromUrl,
    loadSampleFromFile,
    loadSampleKitPad,

    // Note playback
    playNoteOnTrack,
    stopNoteOnTrack,
    allNotesOffTrack,

    // Computer keyboard
    handleKeyDown,
    handleKeyUp,
    keyboardOctave,
    setKeyboardOctave,

    // External MIDI hardware (Akai, Novation, etc.)
    midiDevices,
    activeMidiDevice,
    connectMidiDevice,
    disconnectMidiDevice,
    midiActivity,

    // Recording
    getRecordedNotes: () => [...recordedNotesRef.current],
    clearRecordedNotes: () => { recordedNotesRef.current = []; },

    // Engine access
    getGmEngine,
    getSamplerVoice,
    getSampleKitVoice,

    // Static helpers
    getInstrumentList: MidiSoundEngine.getInstrumentList,
    getDrumMap: MidiSoundEngine.getDrumMap,
    getInstrumentName: MidiSoundEngine.getInstrumentName,

    // MIDI region helpers
    createMidiRegion,
    createMidiRegionFromNotes,
    getAbsoluteNotes,
  };
}


// =============================================================================
// INSTRUMENT SELECTOR — Tabbed dropdown with GM / Sample / Kit
// =============================================================================

export const InstrumentSelector = ({
  trackIndex,
  currentInstrument,
  onSelectGM,
  onSelectDrumKit,
  onSelectSampler,
  onSelectSampleKit,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('gm');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const instrumentList = useMemo(() => MidiSoundEngine.getInstrumentList(), []);
  const inst = currentInstrument || {};
  const displayName = inst.isSampler ? `🎵 ${inst.name || 'Sample'}`
    : inst.isSampleKit ? `🥁 ${inst.name || 'Sample Kit'}`
    : inst.isDrum ? '🥁 Drum Kit'
    : inst.name || 'Acoustic Grand Piano';
  const currentProgram = inst.program ?? 0;

  const accentColor = inst.isSampler ? '#00ffc8' : inst.isSampleKit ? '#ff6600' : '#c4b5fd';

  return (
    <div className="inst-selector" ref={ref} style={{ position: 'relative' }}>
      <button className="inst-selector-btn" onClick={() => setOpen(!open)}
        style={{
          background: `${accentColor}22`, border: `1px solid ${accentColor}55`,
          color: accentColor, padding: compact ? '2px 6px' : '4px 8px',
          borderRadius: '4px', fontSize: compact ? '0.65rem' : '0.7rem',
          cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis', maxWidth: compact ? '100px' : '160px', textAlign: 'left',
        }}
        title={displayName}
      >{displayName}</button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 1000,
          background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.4)',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: '350px', minWidth: '240px', overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { key: 'gm', label: '🎹 Instruments', color: '#c4b5fd' },
              { key: 'sample', label: '🎵 Sample', color: '#00ffc8' },
              { key: 'kit', label: '🥁 Kits', color: '#ff6600' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
                background: tab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: tab === t.key ? t.color : '#888',
                fontSize: '0.7rem', fontWeight: tab === t.key ? 600 : 400,
                borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ maxHeight: '290px', overflowY: 'auto', padding: '4px' }}>
            {tab === 'gm' && (
              <>
                <div onClick={() => { onSelectDrumKit?.(trackIndex); setOpen(false); }}
                  style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: '4px',
                    color: inst.isDrum ? '#a78bfa' : '#ccc',
                    background: inst.isDrum ? 'rgba(124,58,237,0.2)' : 'transparent',
                    fontSize: '0.75rem', fontWeight: inst.isDrum ? 700 : 400 }}
                  onMouseEnter={e => e.target.style.background = 'rgba(124,58,237,0.15)'}
                  onMouseLeave={e => e.target.style.background = inst.isDrum ? 'rgba(124,58,237,0.2)' : 'transparent'}
                >🥁 GM Drum Kit (Ch 10)</div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                {instrumentList.map(family => (
                  <div key={family.family}>
                    <div style={{ padding: '4px 10px', fontSize: '0.6rem', color: '#888',
                      textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                      {family.family.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    {family.instruments.map(i => (
                      <div key={i.program}
                        onClick={() => { onSelectGM?.(trackIndex, i.program, i.name); setOpen(false); }}
                        style={{
                          padding: '5px 10px 5px 20px', cursor: 'pointer', borderRadius: '4px',
                          color: currentProgram === i.program && !inst.isDrum && !inst.isSampler ? '#a78bfa' : '#ccc',
                          background: currentProgram === i.program && !inst.isDrum && !inst.isSampler ? 'rgba(124,58,237,0.2)' : 'transparent',
                          fontSize: '0.72rem' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(124,58,237,0.15)'}
                        onMouseLeave={e => e.target.style.background =
                          currentProgram === i.program && !inst.isDrum && !inst.isSampler ? 'rgba(124,58,237,0.2)' : 'transparent'}
                      >{i.name}</div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {tab === 'sample' && (
              <div style={{ padding: '12px' }}>
                <p style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '12px' }}>
                  Load a single sample — plays chromatically across the keyboard.
                  Great for one-shots, bass hits, pads, textures.
                </p>
                <button onClick={() => { onSelectSampler?.(trackIndex); setOpen(false); }}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px',
                    border: '1px solid rgba(0,255,200,0.3)', background: 'rgba(0,255,200,0.1)',
                    color: '#00ffc8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  🔊 Open Sound Browser
                </button>
                <p style={{ color: '#666', fontSize: '0.65rem', marginTop: '8px', textAlign: 'center' }}>
                  Or drag & drop an audio file onto the track
                </p>
              </div>
            )}

            {tab === 'kit' && (
              <div style={{ padding: '12px' }}>
                <p style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '12px' }}>
                  Map different samples to individual keys/pads — MPC / Maschine style.
                </p>
                <button onClick={() => { onSelectDrumKit?.(trackIndex); setOpen(false); }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px',
                    border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)',
                    color: '#c4b5fd', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>
                  🥁 GM Drum Kit (built-in sounds)
                </button>
                <button onClick={() => { onSelectSampleKit?.(trackIndex); setOpen(false); }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px',
                    border: '1px solid rgba(255,102,0,0.3)', background: 'rgba(255,102,0,0.1)',
                    color: '#ff6600', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  🎯 Custom Sample Kit (load your own)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// =============================================================================
// MIDI DEVICE INDICATOR — Shows Akai / Novation connection status
// =============================================================================

export const MidiDeviceIndicator = ({ devices = [], activeDevice, midiActivity, onConnect, onDisconnect }) => {
  if (devices.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: 'rgba(124,58,237,0.1)', padding: '3px 8px',
      borderRadius: '4px', border: '1px solid rgba(124,58,237,0.2)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: midiActivity ? '#00ffc8' : activeDevice ? '#7c3aed' : '#444',
        transition: 'background 0.1s',
      }} />
      {activeDevice ? (
        <>
          <span style={{ fontSize: '0.65rem', color: '#c4b5fd' }}>🎹 {activeDevice.name}</span>
          <button onClick={onDisconnect} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.6rem' }}>✕</button>
        </>
      ) : (
        <select onChange={e => onConnect(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: '#c4b5fd', fontSize: '0.65rem', cursor: 'pointer' }}
          defaultValue="">
          <option value="" disabled>Connect MIDI...</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
    </div>
  );
};


// =============================================================================
// KEYBOARD OCTAVE INDICATOR
// =============================================================================

export const KeyboardOctaveIndicator = ({ octave, onOctaveChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '4px',
    fontSize: '0.65rem', color: '#a78bfa',
    background: 'rgba(124,58,237,0.1)', padding: '2px 6px',
    borderRadius: '4px', border: '1px solid rgba(124,58,237,0.2)',
  }}>
    <button onClick={() => onOctaveChange(Math.max(0, octave - 1))}
      style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: '0 2px' }}>◀</button>
    <span>C{octave}</span>
    <button onClick={() => onOctaveChange(Math.min(8, octave + 1))}
      style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: '0 2px' }}>▶</button>
    <span style={{ color: '#666', marginLeft: '4px' }}>[ / ]</span>
  </div>
);


export default useInstrumentTrackEngine;