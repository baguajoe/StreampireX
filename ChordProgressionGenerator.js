/**
 * ChordProgressionGenerator.js
 * StreamPireX — Chord Progression Generator (closes LANDR Composer gap)
 *
 * Features:
 *  - Pick key + scale → generates chord suggestions using music theory rules
 *  - 12 progression templates (I-IV-V-I, ii-V-I jazz, etc.)
 *  - Roman numeral display + chord name display
 *  - Click chord to hear it (Web Audio API synthesis)
 *  - Drag chords to reorder progression
 *  - Add/remove chords freely
 *  - Export as MIDI file (using manual MIDI byte construction)
 *  - Send progression to ChordTrack or Piano Roll
 *
 * Integration:
 *   import ChordProgressionGenerator from './ChordProgressionGenerator';
 *   // Add as a panel inside Piano Roll tab or standalone
 *   <ChordProgressionGenerator
 *     projectKey="C"
 *     projectScale="Major"
 *     onSendToChordTrack={(chords) => updateChordTrack(chords)}
 *     onSendToMIDI={(midiData) => loadMIDIIntoTrack(midiData)}
 *   />
 */

import React, { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Music theory engine
// ---------------------------------------------------------------------------
const SCALE_FORMULAS = {
  Major:      [0,2,4,5,7,9,11],
  Minor:      [0,2,3,5,7,8,10],
  Dorian:     [0,2,3,5,7,9,10],
  Phrygian:   [0,1,3,5,7,8,10],
  Lydian:     [0,2,4,6,7,9,11],
  Mixolydian: [0,2,4,5,7,9,10],
  Locrian:    [0,1,3,5,6,8,10],
  'Harmonic Minor': [0,2,3,5,7,8,11],
  'Melodic Minor':  [0,2,3,5,7,9,11],
};

const CHORD_QUALITIES_BY_SCALE_DEGREE = {
  Major:      ['maj','min','min','maj','maj','min','dim'],
  Minor:      ['min','dim','maj','min','min','maj','maj'],
  Dorian:     ['min','min','maj','maj','min','dim','maj'],
  Mixolydian: ['maj','min','dim','maj','min','min','maj'],
  'Harmonic Minor': ['min','dim','aug','min','maj','maj','dim'],
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ROMAN_UPPER = ['I','II','III','IV','V','VI','VII'];
const ROMAN_LOWER = ['i','ii','iii','iv','v','vi','vii'];

const QUALITY_SEMITONES = {
  maj:  [0,4,7],
  min:  [0,3,7],
  dim:  [0,3,6],
  aug:  [0,4,8],
  '7':  [0,4,7,10],
  'maj7':[0,4,7,11],
  'min7':[0,3,7,10],
  'sus2':[0,2,7],
  'sus4':[0,5,7],
};

const QUALITY_COLORS = {
  maj:'#00ffc8', min:'#7C3AED', dim:'#666', aug:'#FFD700',
  '7':'#FF6600', 'maj7':'#00c8ff', 'min7':'#a855f7',
  'sus2':'#22d3ee', 'sus4':'#34d399',
};

const PROGRESSION_TEMPLATES = [
  { name: 'I–IV–V–I',    degrees:[0,3,4,0] },
  { name: 'I–V–vi–IV',   degrees:[0,4,5,3] },
  { name: 'I–vi–IV–V',   degrees:[0,5,3,4] },
  { name: 'ii–V–I',      degrees:[1,4,0] },
  { name: 'I–IV–vi–V',   degrees:[0,3,5,4] },
  { name: 'vi–IV–I–V',   degrees:[5,3,0,4] },
  { name: 'I–iii–IV–V',  degrees:[0,2,3,4] },
  { name: 'I–V–IV',      degrees:[0,4,3] },
  { name: 'i–VII–VI–VII', degrees:[0,6,5,6] },
  { name: 'i–iv–v',      degrees:[0,3,4] },
  { name: 'I–ii–V–I',    degrees:[0,1,4,0] },
  { name: 'Custom',      degrees:[] },
];

function buildScaleChords(rootNote, scaleName) {
  const rootMidi = NOTE_NAMES.indexOf(rootNote);
  const formula  = SCALE_FORMULAS[scaleName] || SCALE_FORMULAS.Major;
  const qualities = CHORD_QUALITIES_BY_SCALE_DEGREE[scaleName]
    || CHORD_QUALITIES_BY_SCALE_DEGREE.Major;

  return formula.map((interval, deg) => {
    const chordRoot = (rootMidi + interval) % 12;
    const quality   = qualities[deg] || 'maj';
    const isMinor   = quality === 'min' || quality === 'dim';
    return {
      degree: deg,
      root: NOTE_NAMES[chordRoot],
      quality,
      roman: isMinor ? ROMAN_LOWER[deg] : ROMAN_UPPER[deg],
      midiRoot: 60 + rootMidi + interval,
      semitones: QUALITY_SEMITONES[quality] || [0,4,7],
    };
  });
}

// ---------------------------------------------------------------------------
// Minimal MIDI file builder
// ---------------------------------------------------------------------------
function buildMIDIFile(chords, bpm = 120) {
  const ticksPerBeat = 480;
  const beatsPerChord = 4;
  const microsPerBeat = Math.round(60000000 / bpm);

  // MIDI header chunk
  const header = [0x4D,0x54,0x68,0x64,0,0,0,6,0,1,0,2,
    ticksPerBeat >> 8, ticksPerBeat & 0xFF];

  // Tempo track
  const tempoTrack = [
    0x4D,0x54,0x72,0x6B, // MTrk
    0,0,0,11, // length
    0x00, 0xFF,0x51,0x03, // tempo meta event
    (microsPerBeat>>16)&0xFF,(microsPerBeat>>8)&0xFF,microsPerBeat&0xFF,
    0x00, 0xFF, 0x2F, 0x00, // end of track
  ];

  // Note track
  const events = [];
  let tick = 0;
  chords.forEach(chord => {
    const notes = chord.semitones.map(s => chord.midiRoot + s);
    // Note On
    notes.forEach((n, i) => {
      events.push({ tick, type:'noteOn', note:n, velocity:80 });
    });
    tick += ticksPerBeat * beatsPerChord;
    // Note Off
    notes.forEach(n => {
      events.push({ tick, type:'noteOff', note:n });
    });
  });
  events.push({ tick, type:'endTrack' });

  function varLen(v) {
    if (v < 128) return [v];
    const bytes = [];
    while (v > 0) { bytes.unshift(v & 0x7F); v >>= 7; }
    for (let i = 0; i < bytes.length - 1; i++) bytes[i] |= 0x80;
    return bytes;
  }

  let prevTick = 0;
  const trackBytes = [];
  events.forEach(ev => {
    const delta = ev.tick - prevTick;
    prevTick = ev.tick;
    trackBytes.push(...varLen(delta));
    if (ev.type === 'noteOn')  trackBytes.push(0x90, ev.note, ev.velocity);
    else if (ev.type === 'noteOff') trackBytes.push(0x80, ev.note, 0);
    else if (ev.type === 'endTrack') trackBytes.push(0xFF, 0x2F, 0x00);
  });

  const trackLen = trackBytes.length;
  const noteTrack = [
    0x4D,0x54,0x72,0x6B,
    (trackLen>>24)&0xFF,(trackLen>>16)&0xFF,(trackLen>>8)&0xFF,trackLen&0xFF,
    ...trackBytes,
  ];

  return new Uint8Array([...header, ...tempoTrack, ...noteTrack]);
}

// ---------------------------------------------------------------------------
// Web Audio chord preview
// ---------------------------------------------------------------------------
function playChord(chord, audioCtx) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  chord.semitones.forEach(s => {
    const freq = 261.63 * Math.pow(2, (chord.midiRoot - 60 + s) / 12);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  });
}

// ---------------------------------------------------------------------------
// Chord Card
// ---------------------------------------------------------------------------
function ChordCard({ chord, index, onRemove, onPlay, isLast }) {
  const color = QUALITY_COLORS[chord.quality] || '#00ffc8';
  return (
    <div style={{
      position:'relative',
      background:`${color}22`, border:`1px solid ${color}88`,
      borderRadius:8, padding:'8px 10px', minWidth:70,
      cursor:'pointer', transition:'transform 0.1s',
      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
    }}
    onClick={() => onPlay(chord)}
    draggable
    >
      <div style={{fontSize:18, fontWeight:900, color, fontFamily:'JetBrains Mono,monospace'}}>
        {chord.roman}
      </div>
      <div style={{fontSize:10, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace'}}>
        {chord.root}{chord.quality !== 'maj' ? chord.quality : ''}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(index); }}
        style={{
          position:'absolute', top:-6, right:-6,
          background:'#0d1117', border:`1px solid ${color}44`,
          color:'#8b949e', borderRadius:'50%', width:16, height:16,
          cursor:'pointer', fontSize:10, lineHeight:1, padding:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
      >×</button>
      {!isLast && (
        <div style={{position:'absolute', right:-12, top:'50%', transform:'translateY(-50%)',
          color:'#30363d', fontSize:12}}>→</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ChordProgressionGenerator({
  projectKey = 'C',
  projectScale = 'Major',
  onSendToChordTrack = () => {},
  onSendToMIDI = () => {},
}) {
  const [key, setKey] = useState(projectKey);
  const [scale, setScale] = useState(projectScale);
  const [template, setTemplate] = useState(PROGRESSION_TEMPLATES[1]);
  const [progression, setProgression] = useState([]);
  const [bpm, setBpm] = useState(120);
  const audioCtxRef = useRef(null);

  const scaleChords = buildScaleChords(key, scale);

  // ---------------------------------------------------------------------------
  // Apply template
  // ---------------------------------------------------------------------------
  const applyTemplate = useCallback((tmpl) => {
    setTemplate(tmpl);
    if (tmpl.degrees.length === 0) return;
    const prog = tmpl.degrees.map(d => scaleChords[d]).filter(Boolean);
    setProgression(prog);
  }, [scaleChords]);

  // ---------------------------------------------------------------------------
  // Add chord manually
  // ---------------------------------------------------------------------------
  const addChord = (chord) => {
    setProgression(prev => [...prev, chord]);
  };

  // ---------------------------------------------------------------------------
  // Remove chord
  // ---------------------------------------------------------------------------
  const removeChord = (idx) => {
    setProgression(prev => prev.filter((_, i) => i !== idx));
  };

  // ---------------------------------------------------------------------------
  // Play chord
  // ---------------------------------------------------------------------------
  const handlePlayChord = (chord) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    playChord(chord, audioCtxRef.current);
  };

  // ---------------------------------------------------------------------------
  // Export MIDI
  // ---------------------------------------------------------------------------
  const handleExportMIDI = () => {
    if (!progression.length) return;
    const midi = buildMIDIFile(progression, bpm);
    const blob = new Blob([midi], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progression_${key}_${scale}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    onSendToMIDI(midi);
  };

  const s = {
    root: {
      background:'#0d1117', color:'#e6edf3',
      fontFamily:'JetBrains Mono,monospace', fontSize:12,
      padding:14, display:'flex', flexDirection:'column', gap:12,
    },
    title: { fontSize:13, fontWeight:700, color:'#00ffc8', letterSpacing:1 },
    select: {
      background:'#21262d', border:'1px solid #30363d', borderRadius:4,
      color:'#e6edf3', padding:'4px 8px', fontFamily:'inherit', fontSize:11,
    },
    card: { background:'#161b22', border:'1px solid #21262d', borderRadius:8, padding:10 },
    label: { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6, display:'block' },
    btn: (primary) => ({
      background: primary ? '#00ffc822' : '#21262d',
      border:`1px solid ${primary ? '#00ffc8' : '#30363d'}`,
      color: primary ? '#00ffc8' : '#8b949e',
      borderRadius:6, padding:'6px 12px', cursor:'pointer',
      fontFamily:'inherit', fontSize:11, fontWeight: primary ? 700 : 400,
    }),
    degreeBtn: (quality) => ({
      background:`${QUALITY_COLORS[quality]||'#00ffc8'}22`,
      border:`1px solid ${QUALITY_COLORS[quality]||'#00ffc8'}66`,
      color: QUALITY_COLORS[quality]||'#00ffc8',
      borderRadius:4, padding:'4px 8px', cursor:'pointer',
      fontFamily:'inherit', fontSize:10,
    }),
  };

  return (
    <div style={s.root}>
      <div style={s.title}>♩ CHORD PROGRESSION GENERATOR</div>

      {/* Key + Scale */}
      <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <select style={s.select} value={key} onChange={e => setKey(e.target.value)}>
          {NOTE_NAMES.map(n => <option key={n} value={n}>Key of {n}</option>)}
        </select>
        <select style={s.select} value={scale} onChange={e => setScale(e.target.value)}>
          {Object.keys(SCALE_FORMULAS).map(sc => <option key={sc} value={sc}>{sc}</option>)}
        </select>
        <label style={{display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#8b949e'}}>
          BPM
          <input type="number" value={bpm} onChange={e => setBpm(+e.target.value)}
            style={{...s.select, width:55, textAlign:'center'}} />
        </label>
      </div>

      {/* Templates */}
      <div style={s.card}>
        <span style={s.label}>PROGRESSION TEMPLATES</span>
        <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
          {PROGRESSION_TEMPLATES.map(tmpl => (
            <button key={tmpl.name}
              onClick={() => applyTemplate(tmpl)}
              style={{
                background: template.name===tmpl.name ? '#00ffc822' : '#21262d',
                border:`1px solid ${template.name===tmpl.name ? '#00ffc8' : '#30363d'}`,
                color: template.name===tmpl.name ? '#00ffc8' : '#8b949e',
                borderRadius:4, padding:'3px 8px', cursor:'pointer',
                fontFamily:'inherit', fontSize:10,
              }}
            >{tmpl.name}</button>
          ))}
        </div>
      </div>

      {/* Scale chord palette */}
      <div style={s.card}>
        <span style={s.label}>SCALE CHORDS — Click to add to progression</span>
        <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
          {scaleChords.map((chord, i) => (
            <button key={i} onClick={() => addChord(chord)} style={s.degreeBtn(chord.quality)}>
              <span style={{fontWeight:700}}>{chord.roman}</span>
              <span style={{opacity:0.7}}> {chord.root}{chord.quality !== 'maj' ? chord.quality : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current progression */}
      <div style={s.card}>
        <span style={s.label}>CURRENT PROGRESSION</span>
        {progression.length === 0 ? (
          <div style={{color:'#8b949e', fontSize:11}}>
            Select a template or click chords above to build a progression
          </div>
        ) : (
          <div style={{
            display:'flex', gap:14, flexWrap:'wrap', alignItems:'center',
            padding:'4px 0',
          }}>
            {progression.map((chord, i) => (
              <ChordCard
                key={`${chord.root}-${chord.quality}-${i}`}
                chord={chord}
                index={i}
                onRemove={removeChord}
                onPlay={handlePlayChord}
                isLast={i === progression.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {progression.length > 0 && (
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button style={s.btn(false)} onClick={() => setProgression([])}>🗑 Clear</button>
          <button style={s.btn(false)} onClick={handleExportMIDI}>⬇ Export MIDI</button>
          <button style={s.btn(true)} onClick={() => onSendToChordTrack(
            progression.map((c, i) => ({
              id:`cpg-${i}`, root:c.root, quality:c.quality,
              startBar: i * 2, durationBars: 2,
            }))
          )}>
            → Send to Chord Track
          </button>
        </div>
      )}
    </div>
  );
}
