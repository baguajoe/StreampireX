/**
 * SmartBackingTrack.js
 * StreamPireX — Smart Backing Track Session Builder (closes Tonalic gap)
 *
 * Features:
 *  - Pick key, BPM, genre, mood → auto-assembles a layered arrangement
 *  - Instrument slots: Drums, Bass, Chords, Melody, Strings, FX
 *  - Each slot shows best-matching loops from library (R2 or Looperman)
 *  - Preview individual slots or the full mix
 *  - Mute/solo each instrument layer
 *  - Send the full backing arrangement to DAW tracks
 *  - Swap any slot with a different sample
 *
 * Integration:
 *   import SmartBackingTrack from './SmartBackingTrack';
 *   // Add as a tab in SamplerBeatMaker or Recording Studio
 *   <SmartBackingTrack
 *     projectBPM={bpm}
 *     projectKey={key}
 *     onSendToDAW={(arrangement) => loadArrangementIntoTracks(arrangement)}
 *   />
 */

import React, { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const GENRES = ['Hip-Hop','Trap','R&B','Lo-Fi','House','Afrobeats','Pop','Jazz','Rock','Drill'];
const MOODS  = ['Dark','Chill','Energetic','Melancholic','Bright','Aggressive','Dreamy'];
const SLOTS  = [
  { id:'drums',   label:'🥁 Drums',    color:'#FF6600' },
  { id:'bass',    label:'🎸 Bass',     color:'#7C3AED' },
  { id:'chords',  label:'🎹 Chords',   color:'#00ffc8' },
  { id:'melody',  label:'🎵 Melody',   color:'#FFD700' },
  { id:'strings', label:'🎻 Strings',  color:'#00c8ff' },
  { id:'fx',      label:'✨ FX/Atm',   color:'#f97316' },
];

// ---------------------------------------------------------------------------
// Mock sample generator — replace with real API call to /api/samples/smart-match
// ---------------------------------------------------------------------------
function findBestSamples(key, bpm, genre, mood, slot, count = 3) {
  const sampleNames = {
    drums:   ['Kit Loop','Drum Pattern','Break Beat','Trap Drums','808 Pattern'],
    bass:    ['Bass Line','808 Sub','Slap Bass','Deep Bass','Synth Bass'],
    chords:  ['Chord Stab','Piano Chords','Guitar Strum','Synth Chord','Key Hit'],
    melody:  ['Synth Lead','Flute Melody','Guitar Riff','Piano Melody','Violin Lead'],
    strings: ['String Pad','Violin Section','Cello Loop','Orchestral Swell','String Hit'],
    fx:      ['Riser','Impact','Atmosphere','Texture','Transition'],
  };
  return Array.from({length: count}, (_, i) => ({
    id: `${slot}-${key}-${bpm}-${i}`,
    name: `${genre} ${sampleNames[slot][i % sampleNames[slot].length]} in ${key}`,
    key, bpm,
    genre, mood,
    instrument: slot,
    duration: 4 + (i % 4),
    url: null,
    waveform: Array.from({length:30}, () => 0.1 + Math.random() * 0.9),
  }));
}

// ---------------------------------------------------------------------------
// WaveformMini
// ---------------------------------------------------------------------------
function WaveformMini({ heights, color, isPlaying }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:1, height:20}}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width:2, borderRadius:1,
          height: `${h*100}%`,
          background: isPlaying ? color : `${color}66`,
          transition:'height 0.1s',
        }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotRow
// ---------------------------------------------------------------------------
function SlotRow({ slot, sample, alternatives, muted, soloed, anysoloed,
  onMute, onSolo, onSwap, onPreview, isPlaying }) {

  const [showAlts, setShowAlts] = useState(false);
  const inactive = anysoloed ? !soloed : muted;
  const color = slot.color;

  return (
    <div style={{
      background: inactive ? '#0d111788' : '#161b22',
      border: `1px solid ${soloed ? color : '#21262d'}`,
      borderRadius:6, marginBottom:6, overflow:'hidden',
      opacity: inactive ? 0.4 : 1, transition:'all 0.2s',
    }}>
      {/* Main row */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'120px 1fr 80px 32px 32px 32px',
        gap:6, alignItems:'center', padding:'6px 10px',
      }}>
        {/* Slot label */}
        <div style={{
          fontSize:11, fontWeight:700, color,
          fontFamily:'JetBrains Mono,monospace',
        }}>{slot.label}</div>

        {/* Sample info + waveform */}
        <div>
          {sample ? (
            <>
              <div style={{fontSize:10, color:'#e6edf3', marginBottom:2,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                {sample.name}
              </div>
              <WaveformMini heights={sample.waveform} color={color} isPlaying={isPlaying} />
            </>
          ) : (
            <div style={{fontSize:10, color:'#8b949e'}}>No sample loaded</div>
          )}
        </div>

        {/* Swap button */}
        <button
          onClick={() => setShowAlts(v => !v)}
          style={{
            background: showAlts ? `${color}22` : '#21262d',
            border:`1px solid ${showAlts ? color : '#30363d'}`,
            color: showAlts ? color : '#8b949e',
            borderRadius:4, padding:'3px 6px', cursor:'pointer',
            fontFamily:'JetBrains Mono,monospace', fontSize:10,
          }}
        >⇄ Swap</button>

        {/* Preview */}
        <button
          onClick={() => sample && onPreview(slot.id, sample)}
          style={{
            background: isPlaying ? `${color}22` : 'none',
            border:`1px solid ${isPlaying ? color : '#30363d'}`,
            color: isPlaying ? color : '#8b949e',
            borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:13,
          }}
        >{isPlaying ? '⏹' : '▶'}</button>

        {/* Mute */}
        <button
          onClick={() => onMute(slot.id)}
          style={{
            background: muted ? '#ff444422' : 'none',
            border:`1px solid ${muted ? '#ff4444' : '#30363d'}`,
            color: muted ? '#ff4444' : '#8b949e',
            borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:10,
          }}
          title="Mute"
        >M</button>

        {/* Solo */}
        <button
          onClick={() => onSolo(slot.id)}
          style={{
            background: soloed ? '#FFD70022' : 'none',
            border:`1px solid ${soloed ? '#FFD700' : '#30363d'}`,
            color: soloed ? '#FFD700' : '#8b949e',
            borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:10,
          }}
          title="Solo"
        >S</button>
      </div>

      {/* Alternatives */}
      {showAlts && (
        <div style={{
          borderTop:'1px solid #21262d',
          padding:'6px 10px',
          display:'flex', gap:6, flexWrap:'wrap',
        }}>
          {alternatives.map(alt => (
            <button
              key={alt.id}
              onClick={() => { onSwap(slot.id, alt); setShowAlts(false); }}
              style={{
                background: sample?.id === alt.id ? `${color}22` : '#21262d',
                border:`1px solid ${sample?.id === alt.id ? color : '#30363d'}`,
                color: sample?.id === alt.id ? color : '#8b949e',
                borderRadius:4, padding:'4px 8px', cursor:'pointer',
                fontFamily:'JetBrains Mono,monospace', fontSize:10,
              }}
            >
              {alt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SmartBackingTrack({
  projectBPM = 120,
  projectKey = 'C',
  onSendToDAW = () => {},
}) {
  const [key, setKey] = useState(projectKey);
  const [bpm, setBpm] = useState(projectBPM);
  const [genre, setGenre] = useState('Hip-Hop');
  const [mood, setMood] = useState('Chill');
  const [arrangement, setArrangement] = useState({});
  const [alternatives, setAlternatives] = useState({});
  const [muted, setMuted] = useState({});
  const [soloed, setSoloed] = useState({});
  const [playingSlot, setPlayingSlot] = useState(null);
  const [fullPlaying, setFullPlaying] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const progressRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Generate arrangement
  // ---------------------------------------------------------------------------
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerated(false);
    // Simulate API call — replace with: POST /api/samples/smart-match
    await new Promise(r => setTimeout(r, 800));
    const newArr = {};
    const newAlts = {};
    SLOTS.forEach(slot => {
      const samples = findBestSamples(key, bpm, genre, mood, slot.id, 4);
      newArr[slot.id] = samples[0];
      newAlts[slot.id] = samples;
    });
    setArrangement(newArr);
    setAlternatives(newAlts);
    setMuted({});
    setSoloed({});
    setGenerated(true);
    setGenerating(false);
  }, [key, bpm, genre, mood]);

  // ---------------------------------------------------------------------------
  // Mute / Solo
  // ---------------------------------------------------------------------------
  const toggleMute = (slotId) => setMuted(m => ({...m, [slotId]: !m[slotId]}));
  const toggleSolo = (slotId) => setSoloed(s => {
    const isSoloed = s[slotId];
    if (isSoloed) return {...s, [slotId]: false};
    return SLOTS.reduce((acc, sl) => ({...acc, [sl.id]: sl.id === slotId}), {});
  });
  const anySoloed = Object.values(soloed).some(Boolean);

  // ---------------------------------------------------------------------------
  // Swap sample in slot
  // ---------------------------------------------------------------------------
  const handleSwap = (slotId, newSample) => {
    setArrangement(a => ({...a, [slotId]: newSample}));
  };

  // ---------------------------------------------------------------------------
  // Preview a slot
  // ---------------------------------------------------------------------------
  const handlePreview = (slotId) => {
    setPlayingSlot(p => p === slotId ? null : slotId);
  };

  // ---------------------------------------------------------------------------
  // Randomize all slots
  // ---------------------------------------------------------------------------
  const handleRandomize = () => {
    const newArr = {};
    SLOTS.forEach(slot => {
      const alts = alternatives[slot.id] || [];
      const r = alts[Math.floor(Math.random() * alts.length)];
      if (r) newArr[slot.id] = r;
    });
    setArrangement(prev => ({...prev, ...newArr}));
  };

  // ---------------------------------------------------------------------------
  // Send to DAW
  // ---------------------------------------------------------------------------
  const handleSendToDAW = () => {
    const trackData = SLOTS
      .filter(slot => arrangement[slot.id] && !muted[slot.id])
      .map(slot => ({
        slotId: slot.id,
        label: slot.label,
        sample: arrangement[slot.id],
        color: slot.color,
      }));
    onSendToDAW({ tracks: trackData, bpm, key, genre, mood });
  };

  const s = {
    root: {
      background:'#0d1117', color:'#e6edf3',
      fontFamily:'JetBrains Mono,monospace', fontSize:12,
      display:'flex', flexDirection:'column', height:'100%',
    },
    header: {
      padding:'10px 12px 8px',
      borderBottom:'1px solid #21262d',
      background:'#161b22',
    },
    title: { fontSize:13, fontWeight:700, color:'#00ffc8', marginBottom:8, letterSpacing:1 },
    row: { display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 },
    select: {
      background:'#21262d', border:'1px solid #30363d', borderRadius:4,
      color:'#e6edf3', padding:'4px 8px', fontFamily:'inherit', fontSize:11,
    },
    numInput: {
      background:'#21262d', border:'1px solid #30363d', borderRadius:4,
      color:'#e6edf3', padding:'4px 6px', fontFamily:'inherit', fontSize:11,
      width:60, textAlign:'center',
    },
    genBtn: {
      background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
      borderRadius:6, padding:'6px 16px', cursor:'pointer',
      fontFamily:'inherit', fontSize:12, fontWeight:700,
    },
    body: { flex:1, overflowY:'auto', padding:10 },
    footer: {
      padding:'8px 12px',
      borderTop:'1px solid #21262d',
      background:'#161b22',
      display:'flex', gap:8,
    },
    footBtn: (primary) => ({
      flex: primary ? 2 : 1,
      background: primary ? '#00ffc822' : '#21262d',
      border:`1px solid ${primary ? '#00ffc8' : '#30363d'}`,
      color: primary ? '#00ffc8' : '#8b949e',
      borderRadius:6, padding:'8px', cursor:'pointer',
      fontFamily:'inherit', fontSize:11, fontWeight: primary ? 700 : 400,
    }),
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>🎼 SMART BACKING TRACK</div>
        <div style={s.row}>
          <select style={s.select} value={key} onChange={e => setKey(e.target.value)}>
            {KEYS.map(k => <option key={k} value={k}>Key: {k}</option>)}
          </select>
          <input
            type="number" style={s.numInput}
            value={bpm} onChange={e => setBpm(Math.max(40, Math.min(250, +e.target.value)))}
            title="BPM"
          />
          <span style={{fontSize:10, color:'#8b949e', alignSelf:'center'}}>BPM</span>
          <select style={s.select} value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={s.select} value={mood} onChange={e => setMood(e.target.value)}>
            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button style={s.genBtn} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Building...' : '⚡ Generate'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>
        {!generated && !generating && (
          <div style={{textAlign:'center', padding:'40px 20px', color:'#8b949e'}}>
            <div style={{fontSize:32, marginBottom:8}}>🎼</div>
            <div>Set your key, BPM, genre and mood above,</div>
            <div>then press <span style={{color:'#00ffc8'}}>⚡ Generate</span> to build a backing arrangement.</div>
          </div>
        )}
        {generating && (
          <div style={{textAlign:'center', padding:'40px 20px', color:'#00ffc8'}}>
            <div style={{fontSize:24, marginBottom:8}}>⚡</div>
            <div>Finding the best samples for {key} {genre} at {bpm} BPM...</div>
          </div>
        )}
        {generated && SLOTS.map(slot => (
          <SlotRow
            key={slot.id}
            slot={slot}
            sample={arrangement[slot.id]}
            alternatives={alternatives[slot.id] || []}
            muted={!!muted[slot.id]}
            soloed={!!soloed[slot.id]}
            anysoloed={anySoloed}
            onMute={toggleMute}
            onSolo={toggleSolo}
            onSwap={handleSwap}
            onPreview={handlePreview}
            isPlaying={playingSlot === slot.id}
          />
        ))}
      </div>

      {/* Footer */}
      {generated && (
        <div style={s.footer}>
          <button style={s.footBtn(false)} onClick={handleRandomize}>🎲 Randomize</button>
          <button
            style={s.footBtn(false)}
            onClick={() => setFullPlaying(v => !v)}
          >{fullPlaying ? '⏹ Stop' : '▶ Preview All'}</button>
          <button style={s.footBtn(true)} onClick={handleSendToDAW}>
            → Send {Object.keys(arrangement).length} tracks to DAW
          </button>
        </div>
      )}
    </div>
  );
}
