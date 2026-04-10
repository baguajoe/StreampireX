// =============================================================================
// VoiceMidiConverter.js — Voice / Hum to MIDI Note Detector
// =============================================================================
// Location: src/front/js/component/VoiceMidiConverter.js
//
// Features:
//   - Real-time pitch detection via autocorrelation (no external lib)
//   - Detects note name, octave, MIDI number, frequency
//   - Note history grid (last 32 notes)
//   - Transpose control (-12 to +12 semitones)
//   - Sensitivity threshold control
//   - Quantize to scale (Chromatic, Major, Minor, Pentatonic)
//   - One-click assign detected note to selected pad
//   - Piano keyboard display highlighting detected note
//   - Export note sequence as MIDI file
//   - Cubase dark theme matching SPX Beat Lab
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS = [
  '#00ffc8','#ff6600','#44aaff','#ff4488','#ffcc00','#aa44ff',
  '#44ffaa','#ff8844','#00d4ff','#ff6644','#88ff44','#ff44cc',
];

const SCALES = {
  Chromatic:   [0,1,2,3,4,5,6,7,8,9,10,11],
  Major:       [0,2,4,5,7,9,11],
  Minor:       [0,2,3,5,7,8,10],
  Pentatonic:  [0,2,4,7,9],
  Blues:       [0,3,5,6,7,10],
  Dorian:      [0,2,3,5,7,9,10],
};

// ── Pitch detection ────────────────────────────────────────────────────────────
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buffer[i]) < threshold) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; } }

  const buf2 = buffer.slice(r1, r2);
  const len = buf2.length;
  const c = new Float32Array(len).fill(0);
  for (let i = 0; i < len; i++)
    for (let j = 0; j < len - i; j++)
      c[i] += buf2[j] * buf2[j + i];

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < len; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  let T0 = maxpos;
  const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 -= b / (2 * a);
  return sampleRate / T0;
}

function freqToMidi(freq) {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

function midiToNote(midi) {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { midi, note, octave, label: `${note}${octave}`, freq: 440 * Math.pow(2, (midi - 69) / 12) };
}

function quantizeToScale(midi, scaleIntervals, rootNote = 0) {
  const pc = ((midi - rootNote) % 12 + 12) % 12;
  let closest = scaleIntervals[0];
  let minDist = 12;
  for (const interval of scaleIntervals) {
    const dist = Math.min(Math.abs(pc - interval), 12 - Math.abs(pc - interval));
    if (dist < minDist) { minDist = dist; closest = interval; }
  }
  return midi + (closest - pc);
}

// ── MIDI file export ────────────────────────────────────────────────────────
function buildMidiFile(notes) {
  const tempo = 500000; // 120 BPM
  const ticksPerBeat = 96;

  const writeVarLen = (val) => {
    const buf = [];
    buf.unshift(val & 0x7F);
    val >>= 7;
    while (val > 0) { buf.unshift((val & 0x7F) | 0x80); val >>= 7; }
    return buf;
  };

  const events = [];
  notes.forEach((n, i) => {
    events.push([...writeVarLen(i === 0 ? 0 : ticksPerBeat), 0x90, n.midi, 100]);
    events.push([...writeVarLen(ticksPerBeat / 2), 0x80, n.midi, 0]);
  });
  events.push([0x00, 0xFF, 0x2F, 0x00]); // end of track

  const trackData = events.flat();
  const trackLen = trackData.length;

  const header = [
    0x4D,0x54,0x68,0x64, 0,0,0,6, 0,0, 0,1,
    (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF,
  ];
  const tempoEvent = [0x00, 0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF];
  const trackHeader = [
    0x4D,0x54,0x72,0x6B,
    (trackLen >> 24) & 0xFF, (trackLen >> 16) & 0xFF, (trackLen >> 8) & 0xFF, trackLen & 0xFF,
  ];

  const bytes = new Uint8Array([...header, ...trackHeader, ...tempoEvent, ...trackData]);
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'voice_midi.mid'; a.click();
  URL.revokeObjectURL(url);
}

// ── Piano keyboard component ──────────────────────────────────────────────────
function MiniPiano({ highlightMidi }) {
  const startNote = 48; // C3
  const keys = [];
  for (let i = 0; i < 25; i++) {
    const midi = startNote + i;
    const pc = midi % 12;
    const isBlack = [1,3,6,8,10].includes(pc);
    const isHighlit = midi === highlightMidi;
    keys.push({ midi, isBlack, isHighlit });
  }
  const whites = keys.filter(k => !k.isBlack);
  const wWidth = 20;
  const totalW = whites.length * wWidth;

  return (
    <div style={{ position: 'relative', height: 60, width: totalW, margin: '0 auto' }}>
      {whites.map((k, i) => (
        <div key={k.midi} style={{
          position: 'absolute', left: i * wWidth, width: wWidth - 1, height: 56,
          background: k.isHighlit ? '#00ffc8' : '#e8e8e0',
          border: '1px solid #333', borderRadius: '0 0 3px 3px',
          zIndex: 1, boxSizing: 'border-box',
        }} />
      ))}
      {keys.filter(k => k.isBlack).map((k) => {
        const whiteIdx = whites.findIndex(w => w.midi > k.midi) - 1;
        return (
          <div key={k.midi} style={{
            position: 'absolute',
            left: (whiteIdx + 0.65) * wWidth,
            width: wWidth * 0.6, height: 36,
            background: k.isHighlit ? '#00ffc8' : '#111',
            border: '1px solid #000', borderRadius: '0 0 2px 2px',
            zIndex: 2, boxSizing: 'border-box',
          }} />
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VoiceMidiConverter({
  audioContext,
  onNote,
  onAssignToPad,
  isEmbedded = false,
}) {
  const [listening, setListening] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [noteHistory, setNoteHistory] = useState([]);
  const [transpose, setTranspose] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.015);
  const [scale, setScale] = useState('Chromatic');
  const [rootNote, setRootNote] = useState(0);
  const [quantize, setQuantize] = useState(false);

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const lastMidiRef = useRef(null);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);

      const buf = new Float32Array(analyser.fftSize);
      const detect = () => {
        analyser.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, ctx.sampleRate);
        if (freq > 60 && freq < 1200) {
          let midi = freqToMidi(freq) + transpose;
          if (quantize) midi = quantizeToScale(midi, SCALES[scale], rootNote);
          midi = Math.max(0, Math.min(127, midi));
          if (midi !== lastMidiRef.current) {
            lastMidiRef.current = midi;
            const noteObj = midiToNote(midi);
            setCurrentNote(noteObj);
            setNoteHistory(prev => [noteObj, ...prev].slice(0, 32));
            onNote && onNote(noteObj);
          }
        } else {
          if (lastMidiRef.current !== null) {
            lastMidiRef.current = null;
            setCurrentNote(null);
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (e) {
      alert('Microphone access required for Voice MIDI. Please allow mic access.');
    }
  }, [audioContext, onNote, transpose, quantize, scale, rootNote]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setListening(false);
    setCurrentNote(null);
    lastMidiRef.current = null;
  }, []);

  useEffect(() => () => stopListening(), []);

  const clearHistory = () => setNoteHistory([]);

  // ── Styles ──
  const S = {
    wrap: { padding: 24, background: '#0a0e1a', minHeight: 400, fontFamily: "'JetBrains Mono', monospace", color: '#dde0f0' },
    title: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a7088', marginBottom: 20, textTransform: 'uppercase' },
    card: { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 20, marginBottom: 14 },
    label: { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#5a7088', textTransform: 'uppercase', display: 'block', marginBottom: 6 },
    row: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    btn: (active) => ({
      padding: '8px 20px', borderRadius: 4, border: 'none',
      background: active ? '#FF6600' : '#00ffc8',
      color: '#000', fontWeight: 700, cursor: 'pointer',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
      transition: 'all .15s',
    }),
    btnSm: { padding: '5px 12px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: '#8888aa', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600 },
    select: { background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.13)', color: '#dde0f0', padding: '5px 8px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: 'none' },
  };

  const noteColor = currentNote ? NOTE_COLORS[currentNote.midi % 12] : '#1a2535';

  return (
    <div style={S.wrap}>
      <div style={S.title}>🎤 Voice → MIDI Converter</div>

      {/* Big note display */}
      <div style={{ ...S.card, textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontSize: 80, fontWeight: 700, color: noteColor, lineHeight: 1, marginBottom: 8, transition: 'color .1s' }}>
          {currentNote ? currentNote.label : '—'}
        </div>
        <div style={{ fontSize: 12, color: '#5a7088', marginBottom: 20 }}>
          {currentNote
            ? `MIDI ${currentNote.midi} · ${Math.round(currentNote.freq)} Hz`
            : listening ? 'Sing or hum into your mic...' : 'Press Start to begin'}
        </div>
        <MiniPiano highlightMidi={currentNote?.midi} />
      </div>

      {/* Controls */}
      <div style={S.card}>
        <div style={S.row}>
          <button style={S.btn(listening)} onClick={listening ? stopListening : startListening}>
            {listening ? '⏹ Stop' : '🎤 Start Listening'}
          </button>
          {currentNote && onAssignToPad && (
            <button style={{ ...S.btn(false), background: '#FF6600' }} onClick={() => onAssignToPad(currentNote)}>
              → Assign to Pad
            </button>
          )}
          {noteHistory.length > 0 && (
            <button style={S.btnSm} onClick={() => buildMidiFile(noteHistory)}>↓ Export MIDI</button>
          )}
          {noteHistory.length > 0 && (
            <button style={S.btnSm} onClick={clearHistory}>✕ Clear</button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div style={S.card}>
        <div style={S.row}>
          <div>
            <span style={S.label}>Transpose</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min={-12} max={12} value={transpose} onChange={e => setTranspose(Number(e.target.value))} style={{ width: 100 }} />
              <span style={{ fontSize: 12, color: '#00ffc8', minWidth: 28 }}>{transpose > 0 ? `+${transpose}` : transpose}</span>
            </div>
          </div>
          <div>
            <span style={S.label}>Quantize</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={quantize} onChange={e => setQuantize(e.target.checked)} />
              <select style={S.select} value={scale} onChange={e => setScale(e.target.value)} disabled={!quantize}>
                {Object.keys(SCALES).map(s => <option key={s}>{s}</option>)}
              </select>
              <span style={{ fontSize: 11, color: '#5a7088' }}>Root</span>
              <select style={S.select} value={rootNote} onChange={e => setRootNote(Number(e.target.value))} disabled={!quantize}>
                {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Note history */}
      {noteHistory.length > 0 && (
        <div style={S.card}>
          <span style={S.label}>Detected Notes ({noteHistory.length})</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {noteHistory.map((n, i) => (
              <div key={i} style={{
                padding: '4px 10px', borderRadius: 4,
                background: `${NOTE_COLORS[n.midi % 12]}1a`,
                border: `1px solid ${NOTE_COLORS[n.midi % 12]}44`,
                fontSize: 12, color: NOTE_COLORS[n.midi % 12], fontWeight: 700,
              }}>
                {n.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#2a3a4a', lineHeight: 1.8, marginTop: 8 }}>
        Tip: Sing clearly, one note at a time. Works best with pure tones (whistle, hum, sing vowels).<br/>
        Wire <code style={{ color: '#00ffc8' }}>onAssignToPad</code> to load detected notes directly into pads.
      </div>
    </div>
  );
}
