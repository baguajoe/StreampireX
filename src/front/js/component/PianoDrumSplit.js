// =============================================================================
// PianoDrumSplit.js — Combined Piano + Drum Pad View
// =============================================================================
// Location: src/front/js/component/PianoDrumSplit.js
// Features:
//   - Top half: Virtual Piano (melodic instruments)
//   - Bottom half: 16 drum pads with GM drum sounds
//   - Both play simultaneously through same AudioContext
//   - Keyboard split: Z-M / Q-U = piano, numpad/F-keys = drums
//   - Independent volume for each section
//   - Combined recording → exports single audio blob
//   - MIDI: channel 1 = piano, channel 10 = drums
//   - Cubase dark theme
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/PianoDrumSplit.css';

// ── Note helpers ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const getFrequency = (note, octave) => {
  const idx = NOTE_NAMES.indexOf(note);
  return 440 * Math.pow(2, (((octave + 1) * 12 + idx) - 69) / 12);
};

// ── Piano key mapping (same as VirtualPiano) ──
const PIANO_KEYS = {
  'z': { note: 'C', off: 0 }, 'x': { note: 'D', off: 0 }, 'c': { note: 'E', off: 0 },
  'v': { note: 'F', off: 0 }, 'b': { note: 'G', off: 0 }, 'n': { note: 'A', off: 0 },
  'm': { note: 'B', off: 0 }, 's': { note: 'C#', off: 0 }, 'd': { note: 'D#', off: 0 },
  'g': { note: 'F#', off: 0 }, 'h': { note: 'G#', off: 0 }, 'j': { note: 'A#', off: 0 },
  'q': { note: 'C', off: 1 }, 'w': { note: 'D', off: 1 }, 'e': { note: 'E', off: 1 },
  'r': { note: 'F', off: 1 }, 't': { note: 'G', off: 1 }, 'y': { note: 'A', off: 1 },
  'u': { note: 'B', off: 1 }, '2': { note: 'C#', off: 1 }, '3': { note: 'D#', off: 1 },
  '5': { note: 'F#', off: 1 }, '6': { note: 'G#', off: 1 }, '7': { note: 'A#', off: 1 },
};

// ── Drum pad mapping ──
const DRUM_PADS = [
  { id: 0,  name: 'Kick',        key: '1',           type: 'kick',   freq: 60,   decay: 0.35, noiseDecay: 0.04, noiseGain: 0.2 },
  { id: 1,  name: 'Snare',       key: '4',           type: 'snare',  freq: 180,  decay: 0.12, noiseDecay: 0.15, noiseGain: 0.5 },
  { id: 2,  name: 'Clap',        key: '8',           type: 'clap',   freq: 1000, decay: 0.01, noiseDecay: 0.12, noiseGain: 0.8 },
  { id: 3,  name: 'Closed HH',   key: '9',           type: 'hihat',  freq: 6000, decay: 0.02, noiseDecay: 0.04, noiseGain: 0.7 },
  { id: 4,  name: 'Open HH',     key: '0',           type: 'hihat',  freq: 6000, decay: 0.02, noiseDecay: 0.3,  noiseGain: 0.65 },
  { id: 5,  name: 'Low Tom',     key: 'F1',          type: 'tom',    freq: 80,   decay: 0.25, noiseDecay: 0.04, noiseGain: 0.15 },
  { id: 6,  name: 'Mid Tom',     key: 'F2',          type: 'tom',    freq: 140,  decay: 0.2,  noiseDecay: 0.04, noiseGain: 0.15 },
  { id: 7,  name: 'Hi Tom',      key: 'F3',          type: 'tom',    freq: 220,  decay: 0.15, noiseDecay: 0.03, noiseGain: 0.12 },
  { id: 8,  name: 'Crash',       key: 'F4',          type: 'cymbal', freq: 5500, decay: 0.01, noiseDecay: 1.2,  noiseGain: 0.5 },
  { id: 9,  name: 'Ride',        key: 'F5',          type: 'cymbal', freq: 7000, decay: 0.01, noiseDecay: 0.8,  noiseGain: 0.35 },
  { id: 10, name: 'Rim',         key: 'F6',          type: 'click',  freq: 800,  decay: 0.03, noiseDecay: 0.02, noiseGain: 0.6 },
  { id: 11, name: 'Cowbell',     key: 'F7',          type: 'bell',   freq: 560,  decay: 0.15, noiseDecay: 0.01, noiseGain: 0.05 },
  { id: 12, name: 'Tambourine',  key: 'F8',          type: 'hihat',  freq: 8000, decay: 0.01, noiseDecay: 0.15, noiseGain: 0.7 },
  { id: 13, name: 'Shaker',      key: 'F9',          type: 'hihat',  freq: 9000, decay: 0.01, noiseDecay: 0.08, noiseGain: 0.5 },
  { id: 14, name: 'Sub Kick',    key: 'F10',         type: 'kick',   freq: 40,   decay: 0.5,  noiseDecay: 0.03, noiseGain: 0.1 },
  { id: 15, name: 'Snap',        key: 'F11',         type: 'click',  freq: 2000, decay: 0.02, noiseDecay: 0.03, noiseGain: 0.7 },
];

// ── Piano instrument presets ──
const PIANO_INSTRUMENTS = {
  piano:   { name: 'Piano',   emoji: '🎹', oscs: [{ type: 'triangle', det: 0, g: 0.5 }, { type: 'sine', det: 1, g: 0.3 }], env: { a: 0.005, d: 0.3, s: 0.2, r: 0.8 }, fFreq: 5000 },
  organ:   { name: 'Organ',   emoji: '🎵', oscs: [{ type: 'sine', det: 0, g: 0.35 }, { type: 'sine', det: 1200, g: 0.18 }], env: { a: 0.01, d: 0.1, s: 0.8, r: 0.12 }, fFreq: 7000 },
  synth:   { name: 'Synth',   emoji: '🎛️', oscs: [{ type: 'sawtooth', det: 0, g: 0.25 }, { type: 'sawtooth', det: 7, g: 0.25 }], env: { a: 0.01, d: 0.2, s: 0.6, r: 0.3 }, fFreq: 3500 },
  pad:     { name: 'Pad',     emoji: '🌊', oscs: [{ type: 'sawtooth', det: 0, g: 0.12 }, { type: 'sawtooth', det: 5, g: 0.12 }, { type: 'triangle', det: -5, g: 0.15 }], env: { a: 0.4, d: 0.5, s: 0.7, r: 1.5 }, fFreq: 2500 },
  bass:    { name: 'Bass',    emoji: '🎸', oscs: [{ type: 'sawtooth', det: 0, g: 0.35 }, { type: 'square', det: -1200, g: 0.25 }], env: { a: 0.003, d: 0.15, s: 0.4, r: 0.2 }, fFreq: 1500 },
  strings: { name: 'Strings', emoji: '🎻', oscs: [{ type: 'sawtooth', det: 0, g: 0.1 }, { type: 'sawtooth', det: 3, g: 0.1 }, { type: 'sawtooth', det: -3, g: 0.1 }], env: { a: 0.25, d: 0.3, s: 0.75, r: 0.8 }, fFreq: 4500 },
  ePiano:  { name: 'E.Piano', emoji: '⚡', oscs: [{ type: 'sine', det: 0, g: 0.5 }, { type: 'triangle', det: 0.5, g: 0.2 }], env: { a: 0.002, d: 0.6, s: 0.15, r: 0.6 }, fFreq: 6000 },
  pluck:   { name: 'Pluck',   emoji: '🪕', oscs: [{ type: 'triangle', det: 0, g: 0.5 }, { type: 'square', det: 2, g: 0.1 }], env: { a: 0.001, d: 0.15, s: 0.05, r: 0.3 }, fFreq: 4000 },
};

// Shared noise buffer
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

const PianoDrumSplit = ({ audioContext, onRecordingComplete, isEmbedded = false }) => {
  const [pianoInstrument, setPianoInstrument] = useState('piano');
  const [baseOctave, setBaseOctave] = useState(4);
  const [pianoVolume, setPianoVolume] = useState(0.7);
  const [drumVolume, setDrumVolume] = useState(0.8);
  const [activeNotes, setActiveNotes] = useState(new Set());
  const [activePads, setActivePads] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [sustain, setSustain] = useState(false);

  const ctxRef = useRef(null);
  const pianoGainRef = useRef(null);
  const drumGainRef = useRef(null);
  const masterGainRef = useRef(null);
  const voicesRef = useRef({});
  const sustainedRef = useRef(new Set());
  const recorderRef = useRef(null);
  const recDestRef = useRef(null);
  const recChunksRef = useRef([]);

  // ── Audio init ──
  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = 1.0;
      masterGainRef.current.connect(ctx.destination);
      pianoGainRef.current = ctx.createGain();
      pianoGainRef.current.gain.value = pianoVolume;
      pianoGainRef.current.connect(masterGainRef.current);
      drumGainRef.current = ctx.createGain();
      drumGainRef.current.gain.value = drumVolume;
      drumGainRef.current.connect(masterGainRef.current);
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext, pianoVolume, drumVolume]);

  useEffect(() => { if (pianoGainRef.current) pianoGainRef.current.gain.value = pianoVolume; }, [pianoVolume]);
  useEffect(() => { if (drumGainRef.current) drumGainRef.current.gain.value = drumVolume; }, [drumVolume]);

  // ── Piano note on ──
  const pianoNoteOn = useCallback((noteId, freq, vel = 0.8) => {
    if (voicesRef.current[noteId]) return;
    const ctx = getCtx();
    const preset = PIANO_INSTRUMENTS[pianoInstrument];
    const now = ctx.currentTime;
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = preset.fFreq; filter.Q.value = 1;
    const oscs = preset.oscs.map(o => {
      const osc = ctx.createOscillator(); osc.type = o.type; osc.frequency.value = freq; osc.detune.value = o.det;
      const og = ctx.createGain(); og.gain.value = o.g * vel;
      osc.connect(og); og.connect(filter); osc.start(now);
      return { osc, og };
    });
    const e = preset.env;
    voiceGain.gain.linearRampToValueAtTime(vel, now + e.a);
    voiceGain.gain.linearRampToValueAtTime(vel * e.s, now + e.a + e.d);
    filter.connect(voiceGain); voiceGain.connect(pianoGainRef.current);
    voicesRef.current[noteId] = { oscs, voiceGain, filter, env: e };
    setActiveNotes(p => new Set([...p, noteId]));
  }, [pianoInstrument, getCtx]);

  // ── Piano note off ──
  const pianoNoteOff = useCallback((noteId) => {
    if (sustain) { sustainedRef.current.add(noteId); return; }
    const v = voicesRef.current[noteId];
    if (!v) return;
    const ctx = ctxRef.current; if (!ctx) return;
    const now = ctx.currentTime;
    v.voiceGain.gain.cancelScheduledValues(now);
    v.voiceGain.gain.setValueAtTime(v.voiceGain.gain.value, now);
    v.voiceGain.gain.linearRampToValueAtTime(0, now + v.env.r);
    v.oscs.forEach(({ osc }) => { try { osc.stop(now + v.env.r + 0.05); } catch (e) {} });
    setTimeout(() => { try { v.voiceGain.disconnect(); v.filter.disconnect(); } catch (e) {} delete voicesRef.current[noteId]; }, (v.env.r + 0.1) * 1000);
    setActiveNotes(p => { const n = new Set(p); n.delete(noteId); return n; });
  }, [sustain]);

  // ── Release sustained ──
  useEffect(() => {
    if (!sustain && sustainedRef.current.size > 0) {
      sustainedRef.current.forEach(id => {
        const v = voicesRef.current[id];
        if (v && ctxRef.current) {
          const now = ctxRef.current.currentTime;
          v.voiceGain.gain.cancelScheduledValues(now);
          v.voiceGain.gain.setValueAtTime(v.voiceGain.gain.value, now);
          v.voiceGain.gain.linearRampToValueAtTime(0, now + v.env.r);
          v.oscs.forEach(({ osc }) => { try { osc.stop(now + v.env.r + 0.05); } catch (e) {} });
          setTimeout(() => { try { v.voiceGain.disconnect(); } catch (e) {} delete voicesRef.current[id]; }, (v.env.r + 0.1) * 1000);
        }
      });
      sustainedRef.current.clear();
      setActiveNotes(new Set(Object.keys(voicesRef.current)));
    }
  }, [sustain]);

  // ── Drum trigger ──
  const triggerDrum = useCallback((pad) => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const mg = ctx.createGain(); mg.gain.value = 0.8; mg.connect(drumGainRef.current);

    if (pad.type === 'kick' || pad.type === 'tom' || pad.type === 'bell') {
      const osc = ctx.createOscillator();
      osc.type = pad.type === 'bell' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(pad.freq * 2, now);
      osc.frequency.exponentialRampToValueAtTime(pad.freq, now + 0.03);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.8, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);
      osc.connect(g); g.connect(mg); osc.start(now); osc.stop(now + pad.decay + 0.05);
    }
    if (pad.noiseGain > 0) {
      const ns = ctx.createBufferSource(); ns.buffer = getNoiseBuffer(ctx);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(pad.noiseGain, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + pad.noiseDecay);
      if (pad.type === 'hihat' || pad.type === 'cymbal') {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = pad.freq; bp.Q.value = pad.type === 'hihat' ? 3 : 1;
        ns.connect(bp); bp.connect(ng);
      } else {
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = pad.type === 'snare' ? 2000 : 1000;
        ns.connect(hp); hp.connect(ng);
      }
      ng.connect(mg); ns.start(now); ns.stop(now + pad.noiseDecay + 0.05);
    }

    setActivePads(p => new Set([...p, pad.id]));
    setTimeout(() => setActivePads(p => { const n = new Set(p); n.delete(pad.id); return n; }), 120);
  }, [getCtx]);

  // ── Keyboard events ──
  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      // Sustain
      if (key === ' ') { e.preventDefault(); setSustain(true); return; }
      // Octave
      if (key === '-') { setBaseOctave(p => Math.max(1, p - 1)); return; }
      if (key === '=') { setBaseOctave(p => Math.min(7, p + 1)); return; }
      // Piano keys
      const pm = PIANO_KEYS[key];
      if (pm) { e.preventDefault(); const oct = baseOctave + pm.off; pianoNoteOn(`${pm.note}${oct}`, getFrequency(pm.note, oct)); return; }
      // Drum keys - F-keys and number keys not used by piano
      const drumPad = DRUM_PADS.find(p => p.key.toLowerCase() === e.key.toLowerCase() || p.key === e.key);
      if (drumPad) { e.preventDefault(); triggerDrum(drumPad); }
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      if (key === ' ') { setSustain(false); return; }
      const pm = PIANO_KEYS[key];
      if (pm) { const oct = baseOctave + pm.off; pianoNoteOff(`${pm.note}${oct}`); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [baseOctave, pianoNoteOn, pianoNoteOff, triggerDrum]);

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
      try { masterGainRef.current.disconnect(recDestRef.current); } catch (e) {}
    };
    recorderRef.current = rec; rec.start(100); setIsRecording(true);
  };
  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setIsRecording(false);
  };

  // Build piano keyboard layout
  const buildKeys = () => {
    const keys = [];
    for (let oct = 0; oct < 2; oct++) {
      NOTE_NAMES.forEach(note => {
        const octave = baseOctave + oct;
        let shortcut = '';
        Object.entries(PIANO_KEYS).forEach(([k, m]) => { if (m.note === note && m.off === oct) shortcut = k.toUpperCase(); });
        keys.push({ note, octave, isBlack: note.includes('#'), id: `${note}${octave}`, shortcut, octGroup: oct });
      });
    }
    keys.push({ note: 'C', octave: baseOctave + 2, isBlack: false, id: `C${baseOctave + 2}`, shortcut: '', octGroup: 2 });
    return keys;
  };
  const pianoKeys = buildKeys();
  const whiteKeys = pianoKeys.filter(k => !k.isBlack);
  const blackKeys = pianoKeys.filter(k => k.isBlack);

  const getBlackPos = (bk) => {
    const pos = { 'C#': 0.65, 'D#': 1.75, 'F#': 3.6, 'G#': 4.65, 'A#': 5.7 };
    return (pos[bk.note] || 0) + bk.octGroup * 7;
  };

  // Cleanup
  useEffect(() => { return () => {
    Object.values(voicesRef.current).forEach(v => { v.oscs.forEach(({ osc }) => { try { osc.stop(); } catch(e){} }); });
  }; }, []);

  return (
    <div className="pds">
      {/* ── Top Bar ── */}
      <div className="pds-topbar">
        <div className="pds-topbar-left">
          <span className="pds-badge">🎹 + 🥁 Split Mode</span>
          <div className="pds-inst-row">
            {Object.entries(PIANO_INSTRUMENTS).map(([key, inst]) => (
              <button key={key} className={`pds-inst-btn ${pianoInstrument === key ? 'active' : ''}`} onClick={() => setPianoInstrument(key)} title={inst.name}>
                <span>{inst.emoji}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="pds-topbar-mid">
          <div className="pds-ctrl-mini">
            <span className="pds-ctrl-label">Oct</span>
            <button className="pds-sm-btn" onClick={() => setBaseOctave(p => Math.max(1, p - 1))}>−</button>
            <span className="pds-oct-val">C{baseOctave}</span>
            <button className="pds-sm-btn" onClick={() => setBaseOctave(p => Math.min(7, p + 1))}>+</button>
          </div>
          <div className="pds-ctrl-mini">
            <span className="pds-ctrl-label">Piano</span>
            <input type="range" min="0" max="1" step="0.01" value={pianoVolume} onChange={e => setPianoVolume(parseFloat(e.target.value))} className="pds-slider" />
          </div>
          <div className="pds-ctrl-mini">
            <span className="pds-ctrl-label">Drums</span>
            <input type="range" min="0" max="1" step="0.01" value={drumVolume} onChange={e => setDrumVolume(parseFloat(e.target.value))} className="pds-slider" />
          </div>
          <button className={`pds-sustain-btn ${sustain ? 'active' : ''}`} onClick={() => setSustain(!sustain)}>Sus</button>
        </div>
        <div className="pds-topbar-right">
          {onRecordingComplete && (
            <button className={`pds-rec-btn ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? '■ Stop' : '● Rec'}
            </button>
          )}
        </div>
      </div>

      {/* ── Piano Section (Top) ── */}
      <div className="pds-piano-section">
        <div className="pds-piano-keyboard" style={{ '--white-count': whiteKeys.length }}>
          {whiteKeys.map((k, i) => (
            <div key={k.id} className={`pds-pkey white ${activeNotes.has(k.id) ? 'active' : ''}`}
              onMouseDown={() => pianoNoteOn(k.id, getFrequency(k.note, k.octave))}
              onMouseUp={() => pianoNoteOff(k.id)} onMouseLeave={() => pianoNoteOff(k.id)}>
              <div className="pds-pkey-labels">
                <span className="pds-pkey-note">{k.note}{k.octave}</span>
                {k.shortcut && <span className="pds-pkey-sc">{k.shortcut}</span>}
              </div>
            </div>
          ))}
          {blackKeys.map(k => {
            const left = (getBlackPos(k) + 0.5) * (100 / whiteKeys.length);
            return (
              <div key={k.id} className={`pds-pkey black ${activeNotes.has(k.id) ? 'active' : ''}`} style={{ left: `${left}%` }}
                onMouseDown={() => pianoNoteOn(k.id, getFrequency(k.note, k.octave))}
                onMouseUp={() => pianoNoteOff(k.id)} onMouseLeave={() => pianoNoteOff(k.id)}>
                {k.shortcut && <span className="pds-pkey-sc bsc">{k.shortcut}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Drum Section (Bottom) ── */}
      <div className="pds-drum-section">
        <div className="pds-drum-grid">
          {DRUM_PADS.map(pad => (
            <button key={pad.id} className={`pds-drum-pad ${activePads.has(pad.id) ? 'hit' : ''}`}
              onMouseDown={() => triggerDrum(pad)}>
              <span className="pds-pad-name">{pad.name}</span>
              <span className="pds-pad-key">{pad.key}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PianoDrumSplit;