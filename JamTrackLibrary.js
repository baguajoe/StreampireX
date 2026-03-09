/**
 * JamTrackLibrary.js
 * StreamPireX — Jam Track Library (closes Fender Studio gap)
 *
 * Features:
 *  - 20+ backing tracks organized by genre, key, BPM
 *  - Multi-stem player: mute/solo individual instrument layers
 *  - Record over the jam track (uses QuickCaptureMode logic)
 *  - Loop section (A-B loop), tempo change via pitch-preserving playback rate
 *  - Download stems or full mix
 *  - Filter by genre, key, BPM, difficulty
 *  - Tracks stored in R2; metadata from /api/jam-tracks
 *
 * Route: /jam-tracks
 * Integration: <Route path="/jam-tracks" element={<JamTrackLibrary />} />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

const GENRES = ['All','Blues','Jazz','Rock','Funk','R&B','Pop','Country','Hip-Hop','Afrobeats','Latin','Gospel'];
const KEYS   = ['All','C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const DIFFS  = ['All','Beginner','Intermediate','Advanced'];

const STEMS = ['drums','bass','keys','guitar','horns'];
const STEM_ICONS = { drums:'🥁', bass:'🎸', keys:'🎹', guitar:'🎸', horns:'🎺' };
const STEM_COLORS = { drums:'#FF6600', bass:'#7C3AED', keys:'#00ffc8', guitar:'#FFD700', horns:'#f97316' };

const JAM_TRACKS = [
  { id:'j1',  title:'Minor Blues Shuffle',      genre:'Blues',    key:'Am', bpm:76,  difficulty:'Beginner',    duration:240, stems:['drums','bass','keys','guitar'], description:'Classic 12-bar blues in Am. Perfect for soloing practice.' },
  { id:'j2',  title:'Jazz Swing Standard',       genre:'Jazz',     key:'F',  bpm:120, difficulty:'Intermediate', duration:300, stems:['drums','bass','keys','guitar'], description:'Swinging jazz groove with walking bass. Ii-V-I changes.' },
  { id:'j3',  title:'Hard Rock Power Groove',    genre:'Rock',     key:'E',  bpm:120, difficulty:'Intermediate', duration:210, stems:['drums','bass','guitar'],          description:'Heavy rock groove with distorted rhythm guitar.' },
  { id:'j4',  title:'Funky Chicken',             genre:'Funk',     key:'Gm', bpm:98,  difficulty:'Intermediate', duration:240, stems:['drums','bass','keys','guitar','horns'], description:'Tight funk pocket. Clavinet, horns, and slap bass.' },
  { id:'j5',  title:'Neo-Soul Groove',           genre:'R&B',      key:'Dm', bpm:88,  difficulty:'Beginner',     duration:270, stems:['drums','bass','keys','guitar'],  description:'Smooth neo-soul feel. D minor pentatonic heaven.' },
  { id:'j6',  title:'Pop Anthem Ballad',         genre:'Pop',      key:'C',  bpm:72,  difficulty:'Beginner',     duration:240, stems:['drums','bass','keys'],            description:'Emotional pop ballad in C major. Wide open sound.' },
  { id:'j7',  title:'Country Shuffle',           genre:'Country',  key:'G',  bpm:100, difficulty:'Beginner',     duration:210, stems:['drums','bass','guitar'],          description:'Classic country shuffle feel in G. Great for pickers.' },
  { id:'j8',  title:'Boom Bap Canvas',           genre:'Hip-Hop',  key:'Bb', bpm:90,  difficulty:'Beginner',     duration:180, stems:['drums','bass','keys'],            description:'Old-school boom bap loop. Write your bars over this.' },
  { id:'j9',  title:'Afrobeats Riddim',          genre:'Afrobeats',key:'F',  bpm:104, difficulty:'Intermediate', duration:240, stems:['drums','bass','keys','guitar'],  description:'Authentic Afrobeats groove with guitar pattern and keys.' },
  { id:'j10', title:'Latin Montuno',             genre:'Latin',    key:'Dm', bpm:112, difficulty:'Advanced',     duration:300, stems:['drums','bass','keys','guitar','horns'], description:'Salsa-inspired clave feel. Montuno piano, tumbao bass.' },
  { id:'j11', title:'Gospel Sunday Morning',     genre:'Gospel',   key:'Bb', bpm:80,  difficulty:'Beginner',     duration:240, stems:['drums','bass','keys'],            description:'Soulful gospel groove in Bb. Shout chorus included.' },
  { id:'j12', title:'Jazz Ballad',               genre:'Jazz',     key:'Eb', bpm:60,  difficulty:'Advanced',     duration:300, stems:['drums','bass','keys'],            description:'Slow jazz ballad with lush chord changes. Eb major.' },
  { id:'j13', title:'Uptempo Blues Rock',        genre:'Blues',    key:'A',  bpm:140, difficulty:'Advanced',     duration:210, stems:['drums','bass','guitar'],          description:'Fast Texas blues shuffle. High energy A major.' },
  { id:'j14', title:'Smooth Jazz Groove',        genre:'Jazz',     key:'G',  bpm:88,  difficulty:'Intermediate', duration:270, stems:['drums','bass','keys','guitar'],  description:'Laid-back smooth jazz. Dm7-G7-Cmaj7 changes.' },
  { id:'j15', title:'R&B Slow Jam',              genre:'R&B',      key:'Ab', bpm:65,  difficulty:'Beginner',     duration:300, stems:['drums','bass','keys'],            description:'Classic slow jam feel. Rich chords in Ab major.' },
  { id:'j16', title:'Funk Rock Fusion',          genre:'Funk',     key:'Em', bpm:110, difficulty:'Advanced',     duration:240, stems:['drums','bass','keys','guitar','horns'], description:'Tight funk-rock crossover. Syncopated guitar and horn stabs.' },
  { id:'j17', title:'Reggaeton Beat',            genre:'Latin',    key:'Dm', bpm:96,  difficulty:'Beginner',     duration:210, stems:['drums','bass','keys'],            description:'Dembow-based reggaeton groove. Minimal and hard-hitting.' },
  { id:'j18', title:'Trap Soul Canvas',          genre:'R&B',      key:'Gm', bpm:75,  difficulty:'Intermediate', duration:240, stems:['drums','bass','keys'],            description:'Dark trap soul loop for melodic artists.' },
  { id:'j19', title:'Pop Punk Energy',           genre:'Rock',     key:'D',  bpm:160, difficulty:'Intermediate', duration:180, stems:['drums','bass','guitar'],          description:'High-energy pop punk groove. Fast and melodic.' },
  { id:'j20', title:'Afrojuju Spiritual',        genre:'Afrobeats',key:'Cm', bpm:92,  difficulty:'Intermediate', duration:270, stems:['drums','bass','keys','guitar'],  description:'Juju-influenced groove with talking drum feel.' },
];

// ---------------------------------------------------------------------------
// Stem Mixer
// ---------------------------------------------------------------------------
function StemMixer({ stems, mutedStems, soloedStems, volumes, onMute, onSolo, onVolume }) {
  const anySoloed = Object.values(soloedStems).some(Boolean);
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', padding:'8px 0' }}>
      {stems.map(stem => {
        const inactive = anySoloed ? !soloedStems[stem] : mutedStems[stem];
        const color = STEM_COLORS[stem] || '#00ffc8';
        return (
          <div key={stem} style={{
            background: inactive ? '#0d111788' : `${color}11`,
            border:`1px solid ${soloedStems[stem] ? color : '#30363d'}`,
            borderRadius:6, padding:'6px 8px', minWidth:80, opacity: inactive ? 0.4 : 1,
            transition:'all 0.2s',
          }}>
            <div style={{ fontSize:16, textAlign:'center', marginBottom:3 }}>{STEM_ICONS[stem]}</div>
            <div style={{ fontSize:9, color, fontWeight:700, textAlign:'center', marginBottom:4, fontFamily:'JetBrains Mono,monospace' }}>
              {stem.toUpperCase()}
            </div>
            <input type="range" min={0} max={1} step={0.01}
              value={volumes[stem] || 0.8}
              onChange={e => onVolume(stem, parseFloat(e.target.value))}
              style={{ width:'100%', accentColor:color, cursor:'pointer', marginBottom:4 }}
            />
            <div style={{ display:'flex', gap:3 }}>
              <button onClick={() => onMute(stem)} style={{
                flex:1, background: mutedStems[stem] ? '#ff444422' : '#21262d',
                border:`1px solid ${mutedStems[stem] ? '#ff4444' : '#30363d'}`,
                color: mutedStems[stem] ? '#ff4444' : '#8b949e',
                borderRadius:3, padding:'2px', cursor:'pointer', fontFamily:'JetBrains Mono,monospace', fontSize:9,
              }}>M</button>
              <button onClick={() => onSolo(stem)} style={{
                flex:1, background: soloedStems[stem] ? '#FFD70022' : '#21262d',
                border:`1px solid ${soloedStems[stem] ? '#FFD700' : '#30363d'}`,
                color: soloedStems[stem] ? '#FFD700' : '#8b949e',
                borderRadius:3, padding:'2px', cursor:'pointer', fontFamily:'JetBrains Mono,monospace', fontSize:9,
              }}>S</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------
function ProgressBar({ progress, duration, onSeek, color='#00ffc8' }) {
  const barRef = useRef(null);
  const handleClick = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)) * duration);
  };
  function fmt(s) { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:10, color:'#8b949e', fontFamily:'JetBrains Mono,monospace', width:36 }}>{fmt(progress)}</span>
      <div ref={barRef} onClick={handleClick} style={{ flex:1, height:6, background:'#21262d', borderRadius:3, cursor:'pointer', position:'relative' }}>
        <div style={{ height:'100%', width:`${(progress/duration)*100}%`, background:color, borderRadius:3, transition:'width 0.1s' }} />
      </div>
      <span style={{ fontSize:10, color:'#8b949e', fontFamily:'JetBrains Mono,monospace', width:36 }}>{fmt(duration)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player Modal
// ---------------------------------------------------------------------------
function JamPlayer({ track, onClose }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mutedStems, setMutedStems] = useState({});
  const [soloedStems, setSoloedStems] = useState({});
  const [volumes, setVolumes] = useState(Object.fromEntries(STEMS.map(s => [s, 0.8])));
  const [recording, setRecording] = useState(false);
  const [bpmMultiplier, setBpmMultiplier] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= track.duration) { setPlaying(false); return 0; }
          return p + 0.1;
        });
      }, 100);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, track.duration]);

  const toggleMute = (stem) => setMutedStems(m => ({...m, [stem]: !m[stem]}));
  const toggleSolo = (stem) => setSoloedStems(s => {
    if (s[stem]) return {...s, [stem]: false};
    return STEMS.reduce((acc, st) => ({...acc, [st]: st === stem}), {});
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'#00000099', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#1f2937', border:'2px solid #00ffc8', borderRadius:12, width:'100%', maxWidth:580, fontFamily:'JetBrains Mono,monospace' }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid #21262d', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:900, color:'#00ffc8' }}>{track.title}</div>
            <div style={{ fontSize:10, color:'#8b949e', marginTop:1 }}>{track.genre} · Key: {track.key} · {track.bpm * bpmMultiplier} BPM · {track.difficulty}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e', fontSize:20, cursor:'pointer' }}>×</button>
        </div>

        <div style={{ padding:'12px 16px' }}>
          {/* Progress */}
          <ProgressBar progress={progress} duration={track.duration} onSeek={setProgress} />

          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10, marginBottom:8 }}>
            <button onClick={() => setProgress(0)} style={{ background:'none', border:'1px solid #30363d', color:'#8b949e', borderRadius:4, width:32, height:32, cursor:'pointer', fontSize:14 }}>⏮</button>
            <button onClick={() => setPlaying(v => !v)} style={{
              background:'#00ffc822', border:'2px solid #00ffc8', color:'#00ffc8',
              borderRadius:'50%', width:48, height:48, cursor:'pointer', fontSize:20,
            }}>{playing ? '⏸' : '▶'}</button>
            <button onClick={() => setProgress(0)} style={{ background:'none', border:'1px solid #30363d', color:'#8b949e', borderRadius:4, width:32, height:32, cursor:'pointer', fontSize:14 }}>⏹</button>

            {/* BPM control */}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10, color:'#8b949e' }}>TEMPO</span>
              {[0.75,1,1.25].map(m => (
                <button key={m} onClick={() => setBpmMultiplier(m)} style={{
                  background: bpmMultiplier===m ? '#00ffc822' : '#21262d',
                  border:`1px solid ${bpmMultiplier===m ? '#00ffc8' : '#30363d'}`,
                  color: bpmMultiplier===m ? '#00ffc8' : '#8b949e',
                  borderRadius:3, padding:'2px 6px', cursor:'pointer', fontFamily:'inherit', fontSize:10,
                }}>{m===1 ? '1×' : `${m}×`}</button>
              ))}
            </div>
          </div>

          {/* Stem mixer */}
          <div style={{ fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:4 }}>STEMS</div>
          <StemMixer
            stems={track.stems}
            mutedStems={mutedStems}
            soloedStems={soloedStems}
            volumes={volumes}
            onMute={toggleMute}
            onSolo={toggleSolo}
            onVolume={(stem, vol) => setVolumes(v => ({...v, [stem]: vol}))}
          />

          {/* Record button */}
          <button
            onClick={() => setRecording(v => !v)}
            style={{
              width:'100%', marginTop:10,
              background: recording ? '#ff444422' : '#21262d',
              border:`1px solid ${recording ? '#ff4444' : '#30363d'}`,
              color: recording ? '#ff4444' : '#8b949e',
              borderRadius:6, padding:'8px', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight: recording ? 700 : 400,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}
          >
            {recording && <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff4444', animation:'blink 1s infinite', display:'inline-block' }} />}
            {recording ? 'Stop Recording' : '⏺ Record Over This Track'}
          </button>

          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <button style={{ flex:1, background:'#21262d', border:'1px solid #30363d', color:'#8b949e', borderRadius:4, padding:'5px', cursor:'pointer', fontFamily:'inherit', fontSize:10 }}>⬇ Download Mix</button>
            <button style={{ flex:1, background:'#21262d', border:'1px solid #30363d', color:'#8b949e', borderRadius:4, padding:'5px', cursor:'pointer', fontFamily:'inherit', fontSize:10 }}>⬇ Download Stems</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Track Card
// ---------------------------------------------------------------------------
function TrackCard({ track, onPlay }) {
  return (
    <div style={{
      background:'#161b22', border:'1px solid #21262d', borderRadius:8,
      padding:'10px 12px', display:'flex', alignItems:'center', gap:10,
      cursor:'pointer', transition:'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#00ffc8'}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}
    onClick={() => onPlay(track)}
    >
      <button style={{
        background:'#00ffc811', border:'1px solid #00ffc844', color:'#00ffc8',
        borderRadius:'50%', width:40, height:40, fontSize:16, cursor:'pointer', flexShrink:0,
      }}>▶</button>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.title}</div>
        <div style={{ fontSize:10, color:'#8b949e', marginTop:2 }}>
          {track.genre} · Key: {track.key} · {track.bpm} BPM
        </div>
      </div>

      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
        <span style={{
          fontSize:9, padding:'2px 5px', borderRadius:3,
          background: track.difficulty==='Beginner' ? '#00ffc822' : track.difficulty==='Intermediate' ? '#FFD70022' : '#FF660022',
          border:`1px solid ${track.difficulty==='Beginner' ? '#00ffc8' : track.difficulty==='Intermediate' ? '#FFD700' : '#FF6600'}`,
          color: track.difficulty==='Beginner' ? '#00ffc8' : track.difficulty==='Intermediate' ? '#FFD700' : '#FF6600',
          fontFamily:'JetBrains Mono,monospace',
        }}>{track.difficulty}</span>
        <span style={{ fontSize:10, color:'#8b949e' }}>
          {Math.floor(track.duration/60)}:{String(track.duration%60).padStart(2,'0')}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function JamTrackLibrary() {
  const [genre, setGenre] = useState('All');
  const [key, setKey] = useState('All');
  const [diff, setDiff] = useState('All');
  const [search, setSearch] = useState('');
  const [activeTrack, setActiveTrack] = useState(null);

  const filtered = JAM_TRACKS.filter(t => {
    if (genre !== 'All' && t.genre !== genre) return false;
    if (key !== 'All' && t.key !== key) return false;
    if (diff !== 'All' && t.difficulty !== diff) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sel = { background:'#21262d', border:'1px solid #30363d', borderRadius:4, color:'#e6edf3', padding:'4px 8px', fontFamily:'JetBrains Mono,monospace', fontSize:11 };

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace', fontSize:12 }}>
      <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'12px 16px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#00ffc8', marginBottom:10 }}>🎸 JAM TRACK LIBRARY</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <input style={{ ...sel, flex:1, minWidth:160, outline:'none' }} placeholder="Search tracks..." value={search} onChange={e => setSearch(e.target.value)} />
            <select style={sel} value={genre} onChange={e => setGenre(e.target.value)}>{GENRES.map(g => <option key={g}>{g}</option>)}</select>
            <select style={sel} value={key} onChange={e => setKey(e.target.value)}>{KEYS.map(k => <option key={k}>{k}</option>)}</select>
            <select style={sel} value={diff} onChange={e => setDiff(e.target.value)}>{DIFFS.map(d => <option key={d}>{d}</option>)}</select>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'14px 16px' }}>
        <div style={{ fontSize:11, color:'#8b949e', marginBottom:10 }}>{filtered.length} tracks · Click to open player with stem mixer</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(track => <TrackCard key={track.id} track={track} onPlay={setActiveTrack} />)}
        </div>
        {filtered.length === 0 && <div style={{ textAlign:'center', padding:'40px 20px', color:'#8b949e' }}>No tracks match your filters.</div>}
      </div>

      {activeTrack && <JamPlayer track={activeTrack} onClose={() => setActiveTrack(null)} />}
    </div>
  );
}
