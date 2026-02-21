// =============================================================================
// VirtualPiano.js — Browser-Based Piano / Synth
// =============================================================================
// Location: src/front/js/component/VirtualPiano.js
// Features:
//   - 2-octave visual keyboard (expandable)
//   - Computer keyboard mapping (Z-M white keys, S-D-G-H-J black keys)
//   - Multiple instruments: Piano, Organ, Synth Lead, Synth Pad, Bass, Strings
//   - ADSR envelope shaping per instrument
//   - Octave shift (C1–C7)
//   - Sustain pedal (spacebar)
//   - Volume control
//   - MIDI input support (Web MIDI API)
//   - Record to buffer → export to DAW track
//   - Cubase-inspired dark navy theme
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/VirtualPiano.css';

// ── Note frequency table (A4 = 440Hz) ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const getFrequency = (note, octave) => {
  const idx = NOTE_NAMES.indexOf(note);
  const midiNum = (octave + 1) * 12 + idx;
  return 440 * Math.pow(2, (midiNum - 69) / 12);
};

// ── Keyboard mapping: key → { note, octaveOffset } ──
// Lower row = lower octave, upper row for sharps/flats
const KEY_MAP = {
  // Lower octave — white keys
  'z': { note: 'C', octaveOffset: 0 },
  'x': { note: 'D', octaveOffset: 0 },
  'c': { note: 'E', octaveOffset: 0 },
  'v': { note: 'F', octaveOffset: 0 },
  'b': { note: 'G', octaveOffset: 0 },
  'n': { note: 'A', octaveOffset: 0 },
  'm': { note: 'B', octaveOffset: 0 },
  // Lower octave — black keys
  's': { note: 'C#', octaveOffset: 0 },
  'd': { note: 'D#', octaveOffset: 0 },
  'g': { note: 'F#', octaveOffset: 0 },
  'h': { note: 'G#', octaveOffset: 0 },
  'j': { note: 'A#', octaveOffset: 0 },
  // Upper octave — white keys
  'q': { note: 'C', octaveOffset: 1 },
  'w': { note: 'D', octaveOffset: 1 },
  'e': { note: 'E', octaveOffset: 1 },
  'r': { note: 'F', octaveOffset: 1 },
  't': { note: 'G', octaveOffset: 1 },
  'y': { note: 'A', octaveOffset: 1 },
  'u': { note: 'B', octaveOffset: 1 },
  // Upper octave — black keys
  '2': { note: 'C#', octaveOffset: 1 },
  '3': { note: 'D#', octaveOffset: 1 },
  '5': { note: 'F#', octaveOffset: 1 },
  '6': { note: 'G#', octaveOffset: 1 },
  '7': { note: 'A#', octaveOffset: 1 },
};

// ── Instrument presets with ADSR + oscillator config ──
const INSTRUMENTS = {
  piano: {
    name: 'Piano',
    emoji: '🎹',
    oscillators: [
      { type: 'triangle', detune: 0, gain: 0.6 },
      { type: 'sine', detune: 1, gain: 0.3 },
      { type: 'sawtooth', detune: -1, gain: 0.05 },
    ],
    envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.8 },
    filterFreq: 5000,
    filterQ: 1,
  },
  organ: {
    name: 'Organ',
    emoji: '🎵',
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.4 },
      { type: 'sine', detune: 1200, gain: 0.2 }, // octave up
      { type: 'sine', detune: 1902, gain: 0.1 }, // fifth up
    ],
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15 },
    filterFreq: 8000,
    filterQ: 0.5,
  },
  synthLead: {
    name: 'Synth Lead',
    emoji: '🎛️',
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.3 },
      { type: 'sawtooth', detune: 7, gain: 0.3 }, // slight detune for fatness
    ],
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
    filterFreq: 3000,
    filterQ: 4,
  },
  synthPad: {
    name: 'Synth Pad',
    emoji: '🌊',
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.15 },
      { type: 'sawtooth', detune: 5, gain: 0.15 },
      { type: 'triangle', detune: -5, gain: 0.2 },
    ],
    envelope: { attack: 0.4, decay: 0.5, sustain: 0.7, release: 1.5 },
    filterFreq: 2000,
    filterQ: 2,
  },
  bass: {
    name: 'Bass',
    emoji: '🎸',
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.4 },
      { type: 'square', detune: -1200, gain: 0.3 }, // sub octave
    ],
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.4, release: 0.2 },
    filterFreq: 1200,
    filterQ: 3,
  },
  strings: {
    name: 'Strings',
    emoji: '🎻',
    oscillators: [
      { type: 'sawtooth', detune: 0, gain: 0.12 },
      { type: 'sawtooth', detune: 3, gain: 0.12 },
      { type: 'sawtooth', detune: -3, gain: 0.12 },
      { type: 'sawtooth', detune: 7, gain: 0.1 },
    ],
    envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 1.0 },
    filterFreq: 4000,
    filterQ: 1,
  },
  electricPiano: {
    name: 'Electric Piano',
    emoji: '⚡',
    oscillators: [
      { type: 'sine', detune: 0, gain: 0.5 },
      { type: 'triangle', detune: 0.5, gain: 0.2 },
    ],
    envelope: { attack: 0.002, decay: 0.6, sustain: 0.15, release: 0.6 },
    filterFreq: 6000,
    filterQ: 1.5,
  },
  pluck: {
    name: 'Pluck',
    emoji: '🪕',
    oscillators: [
      { type: 'triangle', detune: 0, gain: 0.5 },
      { type: 'square', detune: 2, gain: 0.1 },
    ],
    envelope: { attack: 0.001, decay: 0.15, sustain: 0.05, release: 0.3 },
    filterFreq: 4000,
    filterQ: 2,
  },
};

// ── Build 2-octave keyboard layout ──
const buildKeyboardLayout = (baseOctave) => {
  const keys = [];
  for (let oct = 0; oct < 2; oct++) {
    const octave = baseOctave + oct;
    NOTE_NAMES.forEach((note, idx) => {
      const isBlack = note.includes('#');
      // Find keyboard shortcut
      let shortcut = '';
      Object.entries(KEY_MAP).forEach(([key, mapping]) => {
        if (mapping.note === note && mapping.octaveOffset === oct) {
          shortcut = key.toUpperCase();
        }
      });
      keys.push({
        note,
        octave,
        isBlack,
        frequency: getFrequency(note, octave),
        id: `${note}${octave}`,
        shortcut,
        noteIndex: idx,
        octaveGroup: oct,
      });
    });
  }
  // Add final C of next octave
  const finalOct = baseOctave + 2;
  keys.push({
    note: 'C',
    octave: finalOct,
    isBlack: false,
    frequency: getFrequency('C', finalOct),
    id: `C${finalOct}`,
    shortcut: '',
    noteIndex: 0,
    octaveGroup: 2,
  });
  return keys;
};

const VirtualPiano = ({ audioContext, onRecordingComplete, embedded = false }) => {
  const [instrument, setInstrument] = useState('piano');
  const [baseOctave, setBaseOctave] = useState(4);
  const [volume, setVolume] = useState(0.7);
  const [sustain, setSustain] = useState(false);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);
  const [midiDeviceName, setMidiDeviceName] = useState('');
  const [showKeyLabels, setShowKeyLabels] = useState(true);
  const [reverbMix, setReverbMix] = useState(0.15);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const reverbGainRef = useRef(null);
  const reverbBufRef = useRef(null);
  const convolverRef = useRef(null);
  const activeVoicesRef = useRef({}); // noteId → { oscs, gain, filter }
  const sustainedNotesRef = useRef(new Set());
  const recorderRef = useRef(null);
  const recDestRef = useRef(null);
  const recChunksRef = useRef([]);
  const midiAccessRef = useRef(null);

  const keyboard = buildKeyboardLayout(baseOctave);

  // ── Audio context init ──
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = volume;
      masterGainRef.current.connect(ctx.destination);

      // Reverb send
      const convolver = ctx.createConvolver();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      }
      convolver.buffer = buf;
      reverbBufRef.current = buf;
      convolverRef.current = convolver;
      reverbGainRef.current = ctx.createGain();
      reverbGainRef.current.gain.value = reverbMix;
      convolver.connect(reverbGainRef.current);
      reverbGainRef.current.connect(masterGainRef.current);
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, [audioContext, volume, reverbMix]);

  // Update volume
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume;
  }, [volume]);

  // Update reverb
  useEffect(() => {
    if (reverbGainRef.current) reverbGainRef.current.gain.value = reverbMix;
  }, [reverbMix]);

  // ── Note On ──
  const noteOn = useCallback((noteId, freq, velocity = 0.8) => {
    if (activeVoicesRef.current[noteId]) return; // already playing

    const ctx = getCtx();
    const preset = INSTRUMENTS[instrument];
    const now = ctx.currentTime;

    // Voice gain (per-note)
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.filterFreq;
    filter.Q.value = preset.filterQ;

    // Oscillators
    const oscs = preset.oscillators.map(oscDef => {
      const osc = ctx.createOscillator();
      osc.type = oscDef.type;
      osc.frequency.value = freq;
      osc.detune.value = oscDef.detune;
      const oscGain = ctx.createGain();
      oscGain.gain.value = oscDef.gain * velocity;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(now);
      return { osc, oscGain };
    });

    // ADSR envelope
    const env = preset.envelope;
    const peakGain = velocity;
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(peakGain, now + env.attack);
    voiceGain.gain.linearRampToValueAtTime(peakGain * env.sustain, now + env.attack + env.decay);

    filter.connect(voiceGain);
    voiceGain.connect(masterGainRef.current);
    // Reverb send
    if (convolverRef.current && reverbMix > 0) {
      voiceGain.connect(convolverRef.current);
    }

    activeVoicesRef.current[noteId] = { oscs, voiceGain, filter, envelope: env };

    setActiveNotes(prev => new Set([...prev, noteId]));
  }, [instrument, getCtx, reverbMix]);

  // ── Note Off ──
  const noteOff = useCallback((noteId) => {
    if (sustain) {
      sustainedNotesRef.current.add(noteId);
      return;
    }

    const voice = activeVoicesRef.current[noteId];
    if (!voice) return;

    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const env = voice.envelope;

    // Release
    voice.voiceGain.gain.cancelScheduledValues(now);
    voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
    voice.voiceGain.gain.linearRampToValueAtTime(0, now + env.release);

    // Stop oscillators after release
    voice.oscs.forEach(({ osc }) => {
      try { osc.stop(now + env.release + 0.05); } catch (e) {}
    });

    // Cleanup after release
    setTimeout(() => {
      try {
        voice.voiceGain.disconnect();
        voice.filter.disconnect();
      } catch (e) {}
      delete activeVoicesRef.current[noteId];
    }, (env.release + 0.1) * 1000);

    setActiveNotes(prev => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  }, [sustain]);

  // ── Release all sustained notes when sustain pedal released ──
  useEffect(() => {
    if (!sustain && sustainedNotesRef.current.size > 0) {
      sustainedNotesRef.current.forEach(noteId => {
        const voice = activeVoicesRef.current[noteId];
        if (voice) {
          const ctx = audioCtxRef.current;
          if (ctx) {
            const now = ctx.currentTime;
            const env = voice.envelope;
            voice.voiceGain.gain.cancelScheduledValues(now);
            voice.voiceGain.gain.setValueAtTime(voice.voiceGain.gain.value, now);
            voice.voiceGain.gain.linearRampToValueAtTime(0, now + env.release);
            voice.oscs.forEach(({ osc }) => {
              try { osc.stop(now + env.release + 0.05); } catch (e) {}
            });
            setTimeout(() => {
              try { voice.voiceGain.disconnect(); voice.filter.disconnect(); } catch (e) {}
              delete activeVoicesRef.current[noteId];
            }, (env.release + 0.1) * 1000);
          }
        }
      });
      sustainedNotesRef.current.clear();
      setActiveNotes(new Set(Object.keys(activeVoicesRef.current)));
    }
  }, [sustain]);

  // ── Keyboard event handlers ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      // Sustain pedal
      if (key === ' ') {
        e.preventDefault();
        setSustain(true);
        return;
      }

      // Octave shift
      if (key === '-' || key === '_') { setBaseOctave(prev => Math.max(1, prev - 1)); return; }
      if (key === '=' || key === '+') { setBaseOctave(prev => Math.min(7, prev + 1)); return; }

      const mapping = KEY_MAP[key];
      if (!mapping) return;
      e.preventDefault();

      const octave = baseOctave + mapping.octaveOffset;
      const noteId = `${mapping.note}${octave}`;
      const freq = getFrequency(mapping.note, octave);
      noteOn(noteId, freq);
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === ' ') { setSustain(false); return; }

      const mapping = KEY_MAP[key];
      if (!mapping) return;

      const octave = baseOctave + mapping.octaveOffset;
      const noteId = `${mapping.note}${octave}`;
      noteOff(noteId);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseOctave, noteOn, noteOff]);

  // ── MIDI Input ──
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then(access => {
      midiAccessRef.current = access;
      const inputs = Array.from(access.inputs.values());
      if (inputs.length > 0) {
        setMidiConnected(true);
        setMidiDeviceName(inputs[0].name || 'MIDI Device');
        inputs.forEach(input => {
          input.onmidimessage = (e) => {
            const [status, midiNote, velocity] = e.data;
            const noteIdx = midiNote % 12;
            const octave = Math.floor(midiNote / 12) - 1;
            const noteName = NOTE_NAMES[noteIdx];
            const noteId = `${noteName}${octave}`;
            const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

            if ((status & 0xF0) === 0x90 && velocity > 0) {
              // Note on
              noteOn(noteId, freq, velocity / 127);
            } else if ((status & 0xF0) === 0x80 || ((status & 0xF0) === 0x90 && velocity === 0)) {
              // Note off
              noteOff(noteId);
            } else if ((status & 0xF0) === 0xB0 && midiNote === 64) {
              // Sustain pedal
              setSustain(velocity >= 64);
            }
          };
        });
      }
    }).catch(() => {});

    return () => {
      if (midiAccessRef.current) {
        Array.from(midiAccessRef.current.inputs.values()).forEach(input => {
          input.onmidimessage = null;
        });
      }
    };
  }, [noteOn, noteOff]);

  // ── Recording ──
  const startRecording = () => {
    const ctx = getCtx();
    recDestRef.current = ctx.createMediaStreamDestination();
    masterGainRef.current.connect(recDestRef.current);
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(recDestRef.current.stream, { mimeType: mime });
    recChunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: mime });
      if (onRecordingComplete) onRecordingComplete(blob);
      if (recDestRef.current) {
        try { masterGainRef.current.disconnect(recDestRef.current); } catch (e) {}
      }
    };
    recorderRef.current = rec;
    rec.start(100);
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ── Mouse handlers for piano keys ──
  const handleMouseDown = (key) => {
    noteOn(key.id, key.frequency);
  };

  const handleMouseUp = (key) => {
    noteOff(key.id);
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      Object.values(activeVoicesRef.current).forEach(voice => {
        voice.oscs.forEach(({ osc }) => { try { osc.stop(); } catch (e) {} });
        try { voice.voiceGain.disconnect(); } catch (e) {}
      });
      activeVoicesRef.current = {};
    };
  }, []);

  // ── Separate white and black keys for rendering ──
  const whiteKeys = keyboard.filter(k => !k.isBlack);
  const blackKeys = keyboard.filter(k => k.isBlack);

  // ── Black key position offsets relative to white keys ──
  const getBlackKeyPosition = (blackKey) => {
    const notePositions = {
      'C#': 0.65, 'D#': 1.75,
      'F#': 3.6, 'G#': 4.65, 'A#': 5.7,
    };
    const octaveOffset = blackKey.octaveGroup * 7;
    return (notePositions[blackKey.note] || 0) + octaveOffset;
  };

  return (
    <div className="vpiano">
      {/* ── Top Controls ── */}
      <div className="vpiano-controls">
        <div className="vpiano-ctrl-group">
          <label className="vpiano-label">Instrument</label>
          <div className="vpiano-instrument-grid">
            {Object.entries(INSTRUMENTS).map(([key, inst]) => (
              <button
                key={key}
                className={`vpiano-inst-btn ${instrument === key ? 'active' : ''}`}
                onClick={() => setInstrument(key)}
                title={inst.name}
              >
                <span className="vpiano-inst-emoji">{inst.emoji}</span>
                <span className="vpiano-inst-name">{inst.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="vpiano-ctrl-row">
          <div className="vpiano-ctrl-group compact">
            <label className="vpiano-label">Octave</label>
            <div className="vpiano-octave-ctrl">
              <button className="vpiano-sm-btn" onClick={() => setBaseOctave(prev => Math.max(1, prev - 1))}>−</button>
              <span className="vpiano-octave-display">C{baseOctave}</span>
              <button className="vpiano-sm-btn" onClick={() => setBaseOctave(prev => Math.min(7, prev + 1))}>+</button>
            </div>
          </div>

          <div className="vpiano-ctrl-group compact">
            <label className="vpiano-label">Volume</label>
            <div className="vpiano-slider-row">
              <input type="range" min="0" max="1" step="0.01" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="vpiano-slider" />
              <span className="vpiano-val">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          <div className="vpiano-ctrl-group compact">
            <label className="vpiano-label">Reverb</label>
            <div className="vpiano-slider-row">
              <input type="range" min="0" max="0.6" step="0.01" value={reverbMix}
                onChange={e => setReverbMix(parseFloat(e.target.value))}
                className="vpiano-slider" />
              <span className="vpiano-val">{Math.round(reverbMix * 100)}%</span>
            </div>
          </div>

          <div className="vpiano-ctrl-group compact">
            <button
              className={`vpiano-toggle-btn ${sustain ? 'active' : ''}`}
              onClick={() => setSustain(!sustain)}
              title="Sustain pedal (hold Spacebar)"
            >
              <span>🦶</span> Sustain
            </button>
          </div>

          <div className="vpiano-ctrl-group compact">
            <button
              className={`vpiano-toggle-btn ${showKeyLabels ? 'active' : ''}`}
              onClick={() => setShowKeyLabels(!showKeyLabels)}
            >
              Labels
            </button>
          </div>

          {onRecordingComplete && (
            <div className="vpiano-ctrl-group compact">
              <button
                className={`vpiano-rec-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? '■ Stop' : '● Rec'}
              </button>
            </div>
          )}
        </div>

        {/* MIDI & Keyboard hints */}
        <div className="vpiano-hints">
          {midiConnected && (
            <span className="vpiano-midi-badge">🎹 MIDI: {midiDeviceName}</span>
          )}
          <span className="vpiano-hint">Keys: Z–M / Q–U · Sharps: S,D,G,H,J / 2,3,5,6,7 · Space: Sustain · −/+: Octave</span>
        </div>
      </div>

      {/* ── Piano Keyboard ── */}
      <div className="vpiano-keyboard-wrapper">
        <div className="vpiano-keyboard" style={{ '--white-count': whiteKeys.length }}>
          {/* White keys */}
          {whiteKeys.map((key, i) => (
            <div
              key={key.id}
              className={`vpiano-key white ${activeNotes.has(key.id) ? 'active' : ''}`}
              onMouseDown={() => handleMouseDown(key)}
              onMouseUp={() => handleMouseUp(key)}
              onMouseLeave={() => handleMouseUp(key)}
              style={{ '--key-idx': i }}
            >
              {showKeyLabels && (
                <div className="vpiano-key-labels">
                  <span className="vpiano-note-name">{key.note}{key.octave}</span>
                  {key.shortcut && <span className="vpiano-shortcut">{key.shortcut}</span>}
                </div>
              )}
            </div>
          ))}

          {/* Black keys (positioned absolutely) */}
          {blackKeys.map(key => {
            const pos = getBlackKeyPosition(key);
            const whiteKeyWidth = 100 / whiteKeys.length;
            const leftPercent = (pos + 0.5) * whiteKeyWidth;
            return (
              <div
                key={key.id}
                className={`vpiano-key black ${activeNotes.has(key.id) ? 'active' : ''}`}
                style={{ left: `${leftPercent}%` }}
                onMouseDown={() => handleMouseDown(key)}
                onMouseUp={() => handleMouseUp(key)}
                onMouseLeave={() => handleMouseUp(key)}
              >
                {showKeyLabels && key.shortcut && (
                  <span className="vpiano-shortcut black-shortcut">{key.shortcut}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualPiano;