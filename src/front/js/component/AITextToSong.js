/**
 * AITextToSong.js
 * StreamPireX — AI Text-to-Song Generator (closes Suno gap)
 *
 * Flow:
 *   1. User types a song description + optional custom lyrics
 *   2. Credits deducted FIRST (15 credits per generation)
 *   3. POST /api/ai/text-to-song → backend calls Replicate (musicgen-stereo)
 *      + optional ElevenLabs vocal layer
 *   4. Returns R2 URL, plays in-page, saveable to DAW / library
 *
 * Features:
 *   - Simple mode (just a prompt)
 *   - Custom mode (genre, mood, BPM, key, instruments, custom lyrics)
 *   - Personas: save a style fingerprint and reuse it
 *   - Instrumental only OR with AI vocals
 *   - Extend existing song
 *   - History of generations (last 10)
 *   - Save to DAW / Download
 *
 * Route:  /ai-song
 * Credits: 15 per generation (instrumental), 25 with vocals
 * Backend: POST /api/ai/text-to-song
 */

import React, { useState, useRef, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const GENRES = [
  'Hip-Hop','Trap','R&B','Pop','House','Techno','Afrobeats','Reggae',
  'Rock','Metal','Jazz','Blues','Country','Gospel','Lo-Fi','Cinematic',
  'Drill','Dancehall','Latin','Bossa Nova','Soul','Funk','Ambient',
];
const MOODS = [
  'Energetic','Dark','Melancholic','Uplifting','Aggressive','Romantic',
  'Chill','Mysterious','Epic','Playful','Nostalgic','Spiritual',
];
const KEYS   = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const SCALES = ['Major','Minor','Dorian','Mixolydian','Pentatonic'];
const DURATIONS = [
  { label:'30s',  value:30  },
  { label:'1 min',value:60  },
  { label:'2 min',value:120 },
  { label:'4 min',value:240 },
  { label:'8 min',value:480 },
];
const VOICE_STYLES = [
  'Male rap','Female rap','Male singing','Female singing',
  'Auto-tune','Choir','Spoken word','No vocals',
];
const CREDIT_COSTS = { instrumental:15, vocals:25 };

const EXAMPLE_PROMPTS = [
  'A dark trap banger with heavy 808s and a haunting piano melody',
  'Uplifting Afrobeats summer anthem with female vocals and talking drum',
  'Smooth lo-fi jazz for late night studying, mellow and chill',
  'Epic cinematic orchestral score building to a massive drop',
  'Old-school boom bap with vinyl crackle and soulful samples',
];

// ─── WaveformVisualizer ───────────────────────────────────────────────────────
function WaveformVisualizer({ audioRef, isPlaying, color = '#00ffc8' }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    if (!audioRef?.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    return () => { ctx.close(); cancelAnimationFrame(animRef.current); };
  }, []);

  useEffect(() => {
    const canvas  = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const cctx    = canvas.getContext('2d');
    const buf     = new Uint8Array(analyserRef.current.frequencyBinCount);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(buf);
      cctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = canvas.width / buf.length;
      buf.forEach((v, i) => {
        const h = (v / 255) * canvas.height;
        const g = cctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        g.addColorStop(0, color);
        g.addColorStop(1, color + '33');
        cctx.fillStyle = g;
        cctx.fillRect(i * bw, canvas.height - h, bw - 1, h);
      });
    };
    if (isPlaying) draw();
    else cancelAnimationFrame(animRef.current);
  }, [isPlaying, color]);

  return (
    <canvas ref={canvasRef} width={600} height={60}
      style={{ width:'100%', height:60, borderRadius:4 }} />
  );
}

// ─── PersonaCard ─────────────────────────────────────────────────────────────
function PersonaCard({ persona, onSelect, selected, onDelete }) {
  return (
    <div onClick={() => onSelect(persona)} style={{
      background: selected ? '#00ffc811' : '#161b22',
      border:`1px solid ${selected ? '#00ffc8' : '#21262d'}`,
      borderRadius:8, padding:'8px 10px', cursor:'pointer', position:'relative',
      transition:'all 0.15s',
    }}>
      <div style={{ fontSize:18, marginBottom:3 }}>{persona.emoji}</div>
      <div style={{ fontSize:11, fontWeight:700, color: selected ? '#00ffc8' : '#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{persona.name}</div>
      <div style={{ fontSize:9, color:'#8b949e', marginTop:2 }}>{persona.genre} · {persona.mood}</div>
      <button onClick={e => { e.stopPropagation(); onDelete(persona.id); }} style={{
        position:'absolute', top:4, right:4, background:'none', border:'none',
        color:'#8b949e', fontSize:12, cursor:'pointer', padding:0, lineHeight:1,
      }}>×</button>
    </div>
  );
}

// ─── GeneratedSong ────────────────────────────────────────────────────────────
function GeneratedSong({ song, onSaveToDaw, onExtend }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else          { audioRef.current.play();  setPlaying(true);  }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress((a.currentTime / a.duration) * 100 || 0);
    const onEnd  = () => { setPlaying(false); setProgress(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  }, []);

  return (
    <div style={{
      background:'#161b22', border:'1px solid #21262d', borderRadius:10,
      overflow:'hidden', marginBottom:10,
    }}>
      {/* Color accent bar */}
      <div style={{ height:3, background:'linear-gradient(90deg, #00ffc8, #7C3AED)' }} />

      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>{song.title}</div>
            <div style={{ fontSize:10, color:'#8b949e', marginTop:2 }}>
              {song.genre} · {song.mood} · {song.bpm} BPM · Key: {song.key} · {song.hasVocals ? '🎤 w/ Vocals' : '🎵 Instrumental'}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => onExtend(song)} style={{
              background:'#7C3AED22', border:'1px solid #7C3AED66',
              color:'#a78bfa', borderRadius:4, padding:'3px 8px', cursor:'pointer',
              fontFamily:'JetBrains Mono,monospace', fontSize:10,
            }}>⟳ Extend</button>
            <button onClick={() => onSaveToDaw(song)} style={{
              background:'#00ffc822', border:'1px solid #00ffc8',
              color:'#00ffc8', borderRadius:4, padding:'3px 8px', cursor:'pointer',
              fontFamily:'JetBrains Mono,monospace', fontSize:10,
            }}>→ DAW</button>
          </div>
        </div>

        {/* Waveform placeholder */}
        <div style={{ height:40, background:'#0d1117', borderRadius:4, marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          {/* Fake waveform bars */}
          {Array.from({length:80}).map((_,i) => (
            <div key={i} style={{
              width:3, marginRight:1,
              height:`${20 + Math.sin(i * 0.4) * 15 + Math.random() * 10}px`,
              background: (progress/100) * 80 > i ? '#00ffc8' : '#21262d',
              borderRadius:2, transition:'background 0.1s',
            }} />
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ height:2, background:'#21262d', borderRadius:1, marginBottom:8 }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'#00ffc8', borderRadius:1, transition:'width 0.1s' }} />
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={togglePlay} style={{
            background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
            borderRadius:'50%', width:34, height:34, cursor:'pointer', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{playing ? '⏸' : '▶'}</button>
          <span style={{ fontSize:10, color:'#8b949e', fontFamily:'JetBrains Mono,monospace' }}>
            {song.duration}s
          </span>
          <a href={song.url} download={`${song.title}.mp3`} style={{
            marginLeft:'auto', background:'#21262d', border:'1px solid #30363d',
            color:'#8b949e', borderRadius:4, padding:'3px 8px', cursor:'pointer',
            fontFamily:'JetBrains Mono,monospace', fontSize:10, textDecoration:'none',
          }}>⬇ Download</a>
        </div>
        <audio ref={audioRef} src={song.url} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AITextToSong() {
  const [mode, setMode] = useState('simple');        // 'simple' | 'custom'
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Hip-Hop');
  const [mood, setMood] = useState('Dark');
  const [bpm, setBpm] = useState(90);
  const [key, setKey] = useState('C');
  const [scale, setScale] = useState('Minor');
  const [duration, setDuration] = useState(60);
  const [voiceStyle, setVoiceStyle] = useState('No vocals');
  const [lyrics, setLyrics] = useState('');
  const [withVocals, setWithVocals] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [songs, setSongs] = useState([]);
  const [credits, setCredits] = useState(null);
  const [error, setError] = useState('');
  const [personas, setPersonas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spx_personas') || '[]'); } catch { return []; }
  });
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [showSavePersona, setShowSavePersona] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaEmoji, setPersonaEmoji] = useState('🎵');

  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch credits
  useEffect(() => {
    fetch(`${BACKEND}/api/credits/balance`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.json()).then(d => setCredits(d.credits)).catch(() => {});
  }, []);

  const costForGeneration = withVocals ? CREDIT_COSTS.vocals : CREDIT_COSTS.instrumental;

  const buildPrompt = () => {
    if (mode === 'simple') return prompt;
    let p = prompt || '';
    const parts = [];
    if (genre)       parts.push(genre);
    if (mood)        parts.push(mood.toLowerCase());
    if (bpm)         parts.push(`${bpm} BPM`);
    if (key && scale)parts.push(`${key} ${scale}`);
    if (withVocals && voiceStyle !== 'No vocals') parts.push(voiceStyle.toLowerCase() + ' vocals');
    if (lyrics)      parts.push('custom lyrics provided');
    return parts.join(', ') + (p ? '. ' + p : '');
  };

  const generate = async () => {
    const finalPrompt = buildPrompt().trim();
    if (!finalPrompt) { setError('Please describe your song first.'); return; }
    if (credits !== null && credits < costForGeneration) {
      setError(`Not enough credits. Need ${costForGeneration}, have ${credits}.`); return;
    }

    setGenerating(true);
    setError('');
    setProgress(5);
    setProgressMsg('Deducting credits...');

    try {
      // 1. Deduct credits first
      const creditRes = await fetch(`${BACKEND}/api/credits/deduct`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ amount: costForGeneration, feature: 'text_to_song' }),
      });
      if (!creditRes.ok) throw new Error('Credit deduction failed');
      const { remaining } = await creditRes.json();
      setCredits(remaining);

      setProgress(15);
      setProgressMsg('Composing music...');

      // Poll for progress
      const pollInterval = setInterval(() => {
        setProgress(p => Math.min(p + 3, 85));
      }, 2000);

      // 2. Generate song
      const genRes = await fetch(`${BACKEND}/api/ai/text-to-song`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          prompt:      finalPrompt,
          genre, mood, bpm, key, scale, duration,
          with_vocals: withVocals,
          voice_style: withVocals ? voiceStyle : null,
          lyrics:      lyrics || null,
          persona_id:  selectedPersona?.id || null,
        }),
      });

      clearInterval(pollInterval);

      if (!genRes.ok) {
        const err = await genRes.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await genRes.json();
      setProgress(100);
      setProgressMsg('Done!');

      setSongs(prev => [{
        id:        data.song_id || Date.now(),
        title:     data.title || `${genre} — ${new Date().toLocaleTimeString()}`,
        url:       data.url,
        genre, mood, bpm, key,
        hasVocals: withVocals,
        duration:  data.duration || duration,
        prompt:    finalPrompt,
      }, ...prev.slice(0, 9)]);

    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
      setTimeout(() => { setProgress(0); setProgressMsg(''); }, 1000);
    }
  };

  const savePersona = () => {
    if (!personaName.trim()) return;
    const p = {
      id: Date.now(), name: personaName, emoji: personaEmoji,
      genre, mood, bpm, key, scale, voiceStyle,
    };
    const updated = [...personas, p];
    setPersonas(updated);
    localStorage.setItem('spx_personas', JSON.stringify(updated));
    setShowSavePersona(false);
    setPersonaName('');
  };

  const loadPersona = (persona) => {
    setSelectedPersona(persona);
    setGenre(persona.genre);
    setMood(persona.mood);
    setBpm(persona.bpm);
    setKey(persona.key);
    setScale(persona.scale);
    setVoiceStyle(persona.voiceStyle);
    setMode('custom');
  };

  const deletePersona = (id) => {
    const updated = personas.filter(p => p.id !== id);
    setPersonas(updated);
    localStorage.setItem('spx_personas', JSON.stringify(updated));
    if (selectedPersona?.id === id) setSelectedPersona(null);
  };

  const saveToDaw = (song) => {
    // In production: POST to /api/projects/import-audio or open in DAW
    alert(`"${song.title}" added to your DAW library.\n\nIn production, this opens RecordingStudio with the track pre-loaded.`);
  };

  const extendSong = (song) => {
    setPrompt(`Continue and extend this song: ${song.prompt}`);
    setGenre(song.genre);
    setMood(song.mood);
    setBpm(song.bpm);
    setKey(song.key);
    setMode('custom');
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const s = {
    label:  { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:5, display:'block', fontFamily:'JetBrains Mono,monospace' },
    input:  { width:'100%', background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'6px 10px', fontFamily:'JetBrains Mono,monospace', fontSize:11, outline:'none', boxSizing:'border-box' },
    select: { background:'#21262d', border:'1px solid #30363d', borderRadius:5, color:'#e6edf3', padding:'5px 8px', fontFamily:'JetBrains Mono,monospace', fontSize:11 },
    group:  { marginBottom:12 },
  };

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' }}>
      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(135deg, #161b22 0%, #0d1117 100%)', borderBottom:'1px solid #21262d', padding:'16px 20px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
            <div style={{ fontSize:28 }}>✨</div>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:'#00ffc8', letterSpacing:1 }}>AI TEXT TO SONG</div>
              <div style={{ fontSize:11, color:'#8b949e' }}>Describe your vision → get a full song. {CREDIT_COSTS.instrumental} credits (instrumental) · {CREDIT_COSTS.vocals} credits (with vocals)</div>
            </div>
            {credits !== null && (
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontSize:9, color:'#8b949e', letterSpacing:2 }}>CREDITS</div>
                <div style={{ fontSize:20, fontWeight:900, color: credits < 25 ? '#ff4444' : '#00ffc8' }}>{credits}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>

        {/* ── Left: Generator ── */}
        <div>
          {/* Mode tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:14, background:'#161b22', borderRadius:8, padding:4 }}>
            {['simple','custom'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex:1, background: mode===m ? '#00ffc822' : 'transparent',
                border:`1px solid ${mode===m ? '#00ffc8' : 'transparent'}`,
                color: mode===m ? '#00ffc8' : '#8b949e',
                borderRadius:5, padding:'6px', cursor:'pointer',
                fontFamily:'inherit', fontSize:11, fontWeight: mode===m ? 700 : 400,
                textTransform:'uppercase', letterSpacing:1,
              }}>
                {m === 'simple' ? '⚡ Simple' : '🎛 Custom'}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div style={s.group}>
            <span style={s.label}>DESCRIBE YOUR SONG</span>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]}
              style={{ ...s.input, minHeight:80, resize:'vertical', lineHeight:1.6 }}
            />
            <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
              {EXAMPLE_PROMPTS.slice(0,3).map((ex,i) => (
                <button key={i} onClick={() => setPrompt(ex)} style={{
                  fontSize:9, padding:'2px 7px', borderRadius:3,
                  background:'#21262d', border:'1px solid #30363d',
                  color:'#8b949e', cursor:'pointer', fontFamily:'inherit',
                }}>💡 Example {i+1}</button>
              ))}
            </div>
          </div>

          {/* Custom mode controls */}
          {mode === 'custom' && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                <div>
                  <span style={s.label}>GENRE</span>
                  <select style={s.select} value={genre} onChange={e => setGenre(e.target.value)}>
                    {GENRES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <span style={s.label}>MOOD</span>
                  <select style={s.select} value={mood} onChange={e => setMood(e.target.value)}>
                    {MOODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <span style={s.label}>BPM</span>
                  <input type="number" min={60} max={200} value={bpm} onChange={e => setBpm(Number(e.target.value))}
                    style={s.input} />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                <div>
                  <span style={s.label}>KEY</span>
                  <select style={s.select} value={key} onChange={e => setKey(e.target.value)}>
                    {KEYS.map(k => <option key={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <span style={s.label}>SCALE</span>
                  <select style={s.select} value={scale} onChange={e => setScale(e.target.value)}>
                    {SCALES.map(sc => <option key={sc}>{sc}</option>)}
                  </select>
                </div>
                <div>
                  <span style={s.label}>DURATION</span>
                  <select style={s.select} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                    {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Vocals toggle */}
              <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={withVocals} onChange={e => setWithVocals(e.target.checked)} style={{ accentColor:'#00ffc8', width:14, height:14 }} />
                  <span style={{ fontSize:12, color:'#e6edf3', fontWeight:700 }}>🎤 Add AI Vocals (+{CREDIT_COSTS.vocals - CREDIT_COSTS.instrumental} credits)</span>
                </label>
                {withVocals && (
                  <div style={{ marginTop:8 }}>
                    <span style={s.label}>VOICE STYLE</span>
                    <select style={s.select} value={voiceStyle} onChange={e => setVoiceStyle(e.target.value)}>
                      {VOICE_STYLES.filter(v => v !== 'No vocals').map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Custom lyrics */}
              <div style={s.group}>
                <span style={s.label}>CUSTOM LYRICS (OPTIONAL)</span>
                <textarea
                  value={lyrics}
                  onChange={e => setLyrics(e.target.value)}
                  placeholder={'[Verse 1]\nWrite your lyrics here...\n\n[Chorus]\nOr leave blank for AI-generated lyrics'}
                  style={{ ...s.input, minHeight:100, resize:'vertical', lineHeight:1.7 }}
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ background:'#ff444422', border:'1px solid #ff4444', borderRadius:6, padding:'8px 10px', color:'#ff8888', fontSize:11, marginBottom:10 }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            style={{
              width:'100%', padding:'12px', borderRadius:8, cursor: generating ? 'wait' : 'pointer',
              background: generating ? '#21262d' : 'linear-gradient(135deg, #00ffc8 0%, #00a896 100%)',
              border:'none', color: generating ? '#8b949e' : '#0d1117',
              fontFamily:'inherit', fontSize:14, fontWeight:900, letterSpacing:1,
              opacity: (!prompt.trim() && !generating) ? 0.4 : 1,
              transition:'all 0.2s',
            }}
          >
            {generating ? progressMsg || 'Generating...' : `✨ Generate Song — ${costForGeneration} credits`}
          </button>

          {/* Progress bar */}
          {generating && progress > 0 && (
            <div style={{ marginTop:8, height:3, background:'#21262d', borderRadius:2 }}>
              <div style={{
                height:'100%', borderRadius:2, width:`${progress}%`,
                background:'linear-gradient(90deg, #00ffc8, #7C3AED)',
                transition:'width 0.5s ease',
              }} />
            </div>
          )}

          {/* Persona save button */}
          {mode === 'custom' && (
            <button onClick={() => setShowSavePersona(true)} style={{
              marginTop:8, width:'100%', background:'transparent',
              border:'1px dashed #30363d', color:'#8b949e', borderRadius:6,
              padding:'6px', cursor:'pointer', fontFamily:'inherit', fontSize:11,
            }}>💾 Save as Persona</button>
          )}

          {/* Save persona modal */}
          {showSavePersona && (
            <div style={{ background:'#161b22', border:'1px solid #00ffc8', borderRadius:8, padding:'12px', marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#00ffc8', marginBottom:8 }}>Save Style Persona</div>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                <input value={personaEmoji} onChange={e => setPersonaEmoji(e.target.value)}
                  style={{ ...s.input, width:40, textAlign:'center', fontSize:16 }} maxLength={2} />
                <input value={personaName} onChange={e => setPersonaName(e.target.value)}
                  placeholder="Persona name..." style={{ ...s.input, flex:1 }} />
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={savePersona} style={{ flex:1, background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8', borderRadius:4, padding:'5px', cursor:'pointer', fontFamily:'inherit', fontSize:11 }}>Save</button>
                <button onClick={() => setShowSavePersona(false)} style={{ flex:1, background:'#21262d', border:'1px solid #30363d', color:'#8b949e', borderRadius:4, padding:'5px', cursor:'pointer', fontFamily:'inherit', fontSize:11 }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Generated songs */}
          {songs.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:10 }}>GENERATED SONGS</div>
              {songs.map(song => (
                <GeneratedSong key={song.id} song={song} onSaveToDaw={saveToDaw} onExtend={extendSong} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Personas ── */}
        <div>
          <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'12px', position:'sticky', top:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#e6edf3', marginBottom:4 }}>🎭 Personas</div>
            <div style={{ fontSize:10, color:'#8b949e', marginBottom:12, lineHeight:1.5 }}>
              Save your favorite style combos and reuse them for a consistent sound across songs.
            </div>

            {personas.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 10px', color:'#8b949e', fontSize:11 }}>
                No personas yet.<br/>Create one by setting Custom mode + Save as Persona.
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {personas.map(p => (
                  <PersonaCard
                    key={p.id} persona={p}
                    selected={selectedPersona?.id === p.id}
                    onSelect={loadPersona}
                    onDelete={deletePersona}
                  />
                ))}
              </div>
            )}

            {selectedPersona && (
              <button onClick={() => setSelectedPersona(null)} style={{
                marginTop:10, width:'100%', background:'transparent',
                border:'1px solid #30363d', color:'#8b949e', borderRadius:4,
                padding:'4px', cursor:'pointer', fontFamily:'inherit', fontSize:10,
              }}>Clear Persona</button>
            )}

            {/* Tips */}
            <div style={{ marginTop:16, borderTop:'1px solid #21262d', paddingTop:12 }}>
              <div style={{ fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:8 }}>TIPS</div>
              {[
                '🎯 Be specific about instruments, mood, and sub-genre',
                '🎤 Custom lyrics give AI a structural guide',
                '⟳ Use Extend on a song you like to make it longer',
                '🎭 Personas keep your AI artist identity consistent',
                '💿 Send to DAW to layer with your own recordings',
              ].map((tip, i) => (
                <div key={i} style={{ fontSize:10, color:'#8b949e', padding:'4px 0', lineHeight:1.5 }}>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
