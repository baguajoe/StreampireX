// =============================================================================
// TextToSongGenerator.js — Text Prompt to Generated Song
// =============================================================================
// Location: src/front/js/component/TextToSongGenerator.js
//
// Features:
//   - Text prompt → full produced song via /api/ai/text-to-song (MusicGen/Replicate)
//   - 12 genre presets with BPM suggestions
//   - Mood selector
//   - Duration control (4–30 seconds)
//   - Instrumentation tags (drums, bass, melody, chords, fx)
//   - Audio playback with waveform visualization
//   - Send to DAW / load into pad
//   - Generation history (last 10)
//   - Download as WAV/MP3
//   - Credits display (20 credits per generation)
//   - Cubase dark theme matching SPX Beat Lab
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────
const GENRES = [
  { id: 'trap',      label: 'Trap',       bpm: 140, icon: '🔫' },
  { id: 'boom_bap',  label: 'Boom Bap',   bpm: 90,  icon: '🎤' },
  { id: 'lofi',      label: 'Lo-Fi',      bpm: 75,  icon: '☕' },
  { id: 'house',     label: 'House',      bpm: 128, icon: '🏠' },
  { id: 'drill',     label: 'Drill',      bpm: 145, icon: '🌀' },
  { id: 'rnb',       label: 'R&B',        bpm: 85,  icon: '💜' },
  { id: 'afrobeats', label: 'Afrobeats',  bpm: 105, icon: '🌍' },
  { id: 'pop',       label: 'Pop',        bpm: 120, icon: '⭐' },
  { id: 'jazz',      label: 'Jazz',       bpm: 100, icon: '🎷' },
  { id: 'reggae',    label: 'Reggae',     bpm: 80,  icon: '🌿' },
  { id: 'phonk',     label: 'Phonk',      bpm: 135, icon: '🐎' },
  { id: 'ambient',   label: 'Ambient',    bpm: 70,  icon: '🌊' },
];

const MOODS = ['Dark', 'Uplifting', 'Aggressive', 'Chill', 'Emotional', 'Hype', 'Romantic', 'Mysterious', 'Nostalgic', 'Energetic'];

const INSTRUMENTS = [
  { id: 'drums',   label: '🥁 Drums' },
  { id: 'bass',    label: '🎸 Bass' },
  { id: 'melody',  label: '🎹 Melody' },
  { id: 'chords',  label: '🎼 Chords' },
  { id: 'strings', label: '🎻 Strings' },
  { id: 'brass',   label: '🎺 Brass' },
  { id: 'fx',      label: '⚡ FX' },
  { id: 'vocals',  label: '🎤 Vocals' },
];

const CREDITS_PER_GEN = 20;

// ── Mini waveform display ──────────────────────────────────────────────────────
function MiniWaveform({ audioBuffer, currentTime, duration, onSeek }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const step = Math.floor(data.length / width);
    const mid = height / 2;

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Playhead progress
    const progress = duration > 0 ? (currentTime / duration) * width : 0;
    ctx.fillStyle = 'rgba(0,255,200,0.08)';
    ctx.fillRect(0, 0, progress, height);

    // Waveform
    for (let i = 0; i < width; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const val = data[i * step + j] || 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const isPlayed = i < progress;
      ctx.strokeStyle = isPlayed ? '#00ffc8' : '#2a4a6a';
      ctx.beginPath();
      ctx.moveTo(i, mid + min * mid);
      ctx.lineTo(i, mid + max * mid);
      ctx.stroke();
    }

    // Playhead line
    if (progress > 0) {
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progress, 0);
      ctx.lineTo(progress, height);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }, [audioBuffer, currentTime, duration]);

  const handleClick = (e) => {
    if (!canvasRef.current || !onSeek) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek((x / rect.width) * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      width={600} height={60}
      style={{ width: '100%', height: 60, borderRadius: 4, cursor: 'pointer', display: 'block' }}
      onClick={handleClick}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TextToSongGenerator({
  onLoadSample,
  onLoadToPad,
  credits = 120,
  onCreditsUpdate,
  isEmbedded = false,
}) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('trap');
  const [mood, setMood] = useState('Dark');
  const [duration, setDuration] = useState(8);
  const [instruments, setInstruments] = useState(['drums', 'bass', 'melody']);
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const decodedBufferRef = useRef(null);
  const playSourceRef = useRef(null);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef(null);

  const selectedGenre = GENRES.find(g => g.id === genre) || GENRES[0];

  const toggleInstrument = (id) => {
    setInstruments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const buildPrompt = () => {
    const instrStr = instruments.map(i => INSTRUMENTS.find(x => x.id === i)?.label.split(' ')[1]).filter(Boolean).join(', ');
    return `${mood.toLowerCase()} ${selectedGenre.label.toLowerCase()} beat at ${selectedGenre.bpm} BPM with ${instrStr}. ${prompt}`.trim();
  };

  const generate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe your beat first.');
      return;
    }
    if (credits < CREDITS_PER_GEN) {
      setError(`Not enough SPX Credits. Need ${CREDITS_PER_GEN}, have ${credits}.`);
      return;
    }

    setStatus('generating');
    setError('');
    stopAudio();

    const fullPrompt = buildPrompt();

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/text-to-song', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          genre,
          mood,
          duration,
          instruments,
          bpm: selectedGenre.bpm,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      const data = await res.json();

      const result = {
        id: Date.now(),
        prompt: fullPrompt,
        genre: selectedGenre.label,
        mood,
        duration,
        bpm: selectedGenre.bpm,
        audioUrl: data.audio_url || data.url || data.output,
        createdAt: new Date().toISOString(),
      };

      setHistory(prev => [result, ...prev].slice(0, 10));
      setSelectedResult(result);
      setStatus('done');
      onCreditsUpdate && onCreditsUpdate(credits - CREDITS_PER_GEN);

      // Auto-decode for waveform
      if (result.audioUrl) decodeAudio(result.audioUrl);

    } catch (e) {
      setError(e.message.includes('404') || e.message.includes('500')
        ? 'Wire /api/ai/text-to-song to MusicGen or Replicate musicgen-melody to activate.'
        : e.message
      );
      setStatus('error');
    }
  }, [prompt, genre, mood, duration, instruments, credits]);

  const decodeAudio = async (url) => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      decodedBufferRef.current = decoded;
    } catch (e) {
      console.warn('TextToSong: could not decode audio', e);
    }
  };

  const playAudio = () => {
    if (!decodedBufferRef.current) {
      if (selectedResult?.audioUrl && audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
        return;
      }
      return;
    }
    const ctx = audioCtxRef.current;
    if (playSourceRef.current) { try { playSourceRef.current.stop(); } catch (e) {} }
    const source = ctx.createBufferSource();
    source.buffer = decodedBufferRef.current;
    source.connect(ctx.destination);
    source.start(0, offsetRef.current);
    playSourceRef.current = source;
    startTimeRef.current = ctx.currentTime - offsetRef.current;
    setIsPlaying(true);
    source.onended = () => { setIsPlaying(false); setCurrentTime(0); offsetRef.current = 0; };

    const updateTime = () => {
      if (!playSourceRef.current) return;
      setCurrentTime(ctx.currentTime - startTimeRef.current);
      rafRef.current = requestAnimationFrame(updateTime);
    };
    updateTime();
  };

  const stopAudio = () => {
    cancelAnimationFrame(rafRef.current);
    if (playSourceRef.current) { try { playSourceRef.current.stop(); } catch (e) {} playSourceRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    setCurrentTime(0);
    offsetRef.current = 0;
  };

  const handleSeek = (time) => {
    offsetRef.current = time;
    if (isPlaying) { stopAudio(); setTimeout(playAudio, 50); }
    else setCurrentTime(time);
  };

  const downloadAudio = (result) => {
    if (!result?.audioUrl) return;
    const a = document.createElement('a');
    a.href = result.audioUrl;
    a.download = `spx_${result.genre}_${result.bpm}bpm.mp3`;
    a.click();
  };

  const sendToDAW = (result) => {
    if (!decodedBufferRef.current) { alert('Audio not decoded yet — play it first.'); return; }
    onLoadSample && onLoadSample(decodedBufferRef.current, result.prompt.slice(0, 24));
  };

  const sendToPad = (result) => {
    if (!decodedBufferRef.current) { alert('Audio not decoded yet — play it first.'); return; }
    onLoadToPad && onLoadToPad(decodedBufferRef.current, result.prompt.slice(0, 24));
  };

  useEffect(() => () => { stopAudio(); }, []);

  // ── Styles ──
  const S = {
    wrap: { padding: 24, background: '#0a0e1a', minHeight: 400, fontFamily: "'JetBrains Mono', monospace", color: '#dde0f0' },
    title: { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#5a7088', marginBottom: 20, textTransform: 'uppercase' },
    card: { background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 18, marginBottom: 12 },
    label: { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#5a7088', textTransform: 'uppercase', display: 'block', marginBottom: 6 },
    input: { width: '100%', background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.13)', color: '#dde0f0', padding: '8px 12px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
    select: { background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.13)', color: '#dde0f0', padding: '6px 8px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: 'none' },
    row: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    genBtn: (disabled) => ({
      width: '100%', padding: '11px', borderRadius: 5, border: 'none',
      background: disabled ? '#1a2535' : '#00ffc8',
      color: disabled ? '#5a7088' : '#000',
      fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 0.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }),
    chip: (sel) => ({
      padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
      border: `1px solid ${sel ? 'rgba(0,255,200,0.35)' : 'rgba(255,255,255,0.1)'}`,
      background: sel ? 'rgba(0,255,200,0.1)' : 'transparent',
      color: sel ? '#00ffc8' : '#8888aa',
      fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
      transition: 'all .1s',
    }),
    btnSm: { padding: '5px 12px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.13)', background: 'transparent', color: '#8888aa', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, transition: 'all .12s' },
  };

  const isGenerating = status === 'generating';

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={S.title}>✍️ Text → Song Generator</div>
        <div style={{ fontSize: 11, color: '#FF6600', fontWeight: 700, padding: '3px 10px', background: 'rgba(255,102,0,0.1)', borderRadius: 4, border: '1px solid rgba(255,102,0,0.25)' }}>
          ⬡ {credits} Credits
        </div>
      </div>

      {/* Prompt */}
      <div style={S.card}>
        <span style={S.label}>Describe your beat</span>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. Dark trap beat with heavy 808s, haunting piano melody, rolling hi-hats, aggressive energy..."
          rows={3}
          style={S.input}
        />
      </div>

      {/* Genre + Mood */}
      <div style={S.card}>
        <div style={S.row}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <span style={S.label}>Genre</span>
            <select style={{ ...S.select, width: '100%' }} value={genre} onChange={e => setGenre(e.target.value)}>
              {GENRES.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label} — {g.bpm} BPM</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <span style={S.label}>Mood</span>
            <select style={{ ...S.select, width: '100%' }} value={mood} onChange={e => setMood(e.target.value)}>
              {MOODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 140 }}>
            <span style={S.label}>Duration: {duration}s</span>
            <input type="range" min={4} max={30} value={duration} step={1}
              onChange={e => setDuration(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Instrumentation */}
      <div style={S.card}>
        <span style={S.label}>Instrumentation</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.id}
              style={S.chip(instruments.includes(inst.id))}
              onClick={() => toggleInstrument(inst.id)}
            >
              {inst.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button style={S.genBtn(isGenerating || !prompt.trim())} onClick={generate} disabled={isGenerating || !prompt.trim()}>
        {isGenerating ? (
          <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> GENERATING...</>
        ) : (
          <>✍️ GENERATE SONG — {CREDITS_PER_GEN} Credits</>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 4, fontSize: 11, color: '#ff8888' }}>
          {error}
        </div>
      )}

      {/* Result player */}
      {selectedResult && (
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dde0f0' }}>{selectedResult.genre} · {selectedResult.bpm} BPM · {selectedResult.mood}</div>
              <div style={{ fontSize: 10, color: '#5a7088', marginTop: 2 }}>{selectedResult.prompt.slice(0, 60)}...</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.btnSm} onClick={isPlaying ? stopAudio : playAudio}>{isPlaying ? '⏹' : '▶'}</button>
              <button style={S.btnSm} onClick={() => downloadAudio(selectedResult)}>↓</button>
              {onLoadSample && <button style={{ ...S.btnSm, color: '#00ffc8', borderColor: 'rgba(0,255,200,0.3)' }} onClick={() => sendToDAW(selectedResult)}>→ DAW</button>}
              {onLoadToPad && <button style={{ ...S.btnSm, color: '#FF6600', borderColor: 'rgba(255,102,0,0.3)' }} onClick={() => sendToPad(selectedResult)}>→ Pad</button>}
            </div>
          </div>
          <MiniWaveform
            audioBuffer={decodedBufferRef.current}
            currentTime={currentTime}
            duration={selectedResult.duration}
            onSeek={handleSeek}
          />
          {selectedResult.audioUrl && (
            <audio ref={audioRef} src={selectedResult.audioUrl} style={{ display: 'none' }} onEnded={() => setIsPlaying(false)} />
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div style={{ ...S.card, marginTop: 14 }}>
          <span style={S.label}>Generation History</span>
          {history.slice(1).map(r => (
            <div
              key={r.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
              onClick={() => { setSelectedResult(r); if (r.audioUrl) decodeAudio(r.audioUrl); }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#8888aa' }}>{r.genre} · {r.bpm} BPM · {r.mood}</div>
                <div style={{ fontSize: 10, color: '#5a7088' }}>{r.prompt.slice(0, 50)}...</div>
              </div>
              <button style={S.btnSm}>Load</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 10, color: '#2a3a4a', lineHeight: 1.8 }}>
        Wire <code style={{ color: '#00ffc8' }}>/api/ai/text-to-song</code> to Replicate musicgen-melody or MusicGen to activate generation.<br/>
        20 SPX Credits per generation. Audio loads directly into DAW or pad on completion.
      </div>
    </div>
  );
}
