/**
 * HumToSong.js
 * StreamPireX — Hum to Full Song (single-screen workflow)
 *
 * Stitches together QuickCapture + AddBeatToVocals into one clean UX:
 *   1. Record a hum (mic, 3–30 seconds)
 *   2. Pick genre + feel
 *   3. Hit Generate → AI builds a full produced song around your melody
 *   4. Play, download, send to DAW
 *
 * Uses: POST /api/ai/add-beat  (same backend as AddBeatToVocals)
 * Credits: 20 per generation (Replicate musicgen-melody)
 * Route: /hum-to-song
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

const GENRES = [
  { id:'hip_hop',   label:'Hip-Hop',    icon:'🎤' },
  { id:'rnb',       label:'R&B',        icon:'💜' },
  { id:'pop',       label:'Pop',        icon:'✨' },
  { id:'trap',      label:'Trap',       icon:'🔥' },
  { id:'afrobeats', label:'Afrobeats',  icon:'🌍' },
  { id:'lofi',      label:'Lo-Fi',      icon:'☕' },
  { id:'gospel',    label:'Gospel',     icon:'🙌' },
  { id:'soul',      label:'Soul',       icon:'🎷' },
  { id:'house',     label:'House',      icon:'🏠' },
  { id:'cinematic', label:'Cinematic',  icon:'🎬' },
];

const FEELS = [
  { id:'dark',      label:'Dark'       },
  { id:'uplifting', label:'Uplifting'  },
  { id:'chill',     label:'Chill'      },
  { id:'aggressive',label:'Hard'       },
  { id:'romantic',  label:'Romantic'   },
  { id:'epic',      label:'Epic'       },
];

const CREDIT_COST = 20;
const MAX_RECORD_SECONDS = 30;

// ── Waveform Canvas ────────────────────────────────────────────────────────
function LiveWaveform({ analyserRef, recording }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analyserRef.current || !recording) {
        // Flat line when not recording
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(buf);
      const sliceW = canvas.width / buf.length;

      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#00ffc8';
      ctx.shadowBlur  = 4;
      ctx.beginPath();

      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [recording, analyserRef]);

  return (
    <canvas ref={canvasRef} width={600} height={80}
      style={{ width:'100%', height:80, borderRadius:6 }} />
  );
}

// ── Result Player ──────────────────────────────────────────────────────────
function SongResult({ result, onToDaw, onRecordAgain }) {
  const mixRef  = useRef(null);
  const beatRef = useRef(null);
  const [playing, setPlaying]   = useState(false);
  const [prog, setProg]         = useState(0);
  const [showBeat, setShowBeat] = useState(false);

  const toggle = (ref, setter, otherRef) => {
    if (otherRef?.current && !otherRef.current.paused) {
      otherRef.current.pause();
      setShowBeat(s => !s && false);
    }
    if (!ref.current) return;
    if (ref.current.paused) { ref.current.play(); setter(true); }
    else                    { ref.current.pause(); setter(false); }
  };

  return (
    <div style={{
      background:'#161b22', border:'2px solid #00ffc8',
      borderRadius:14, overflow:'hidden', marginTop:20,
    }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#00ffc8,#FF6600,#7C3AED)' }} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ fontSize:15, fontWeight:900, color:'#00ffc8', fontFamily:'JetBrains Mono,monospace', marginBottom:2 }}>
          🎵 {result.title}
        </div>
        <div style={{ fontSize:10, color:'#8b949e', marginBottom:14 }}>
          {result.genre} · {result.feel} · {result.bpm} BPM · Built from your hum
        </div>

        {/* Progress bar */}
        <div style={{ height:2, background:'#21262d', borderRadius:1, marginBottom:12 }}>
          <div style={{ height:'100%', width:`${prog}%`, background:'#00ffc8', borderRadius:1, transition:'width 0.1s' }} />
        </div>

        <audio ref={mixRef} src={result.mixed_url}
          onTimeUpdate={e => setProg((e.target.currentTime / e.target.duration)*100||0)}
          onEnded={() => { setPlaying(false); setProg(0); }} />
        <audio ref={beatRef} src={result.beat_url} />

        {/* Player row */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
          <button onClick={() => toggle(mixRef, setPlaying, beatRef)} style={{
            background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
            borderRadius:'50%', width:40, height:40, fontSize:16, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{playing ? '⏸' : '▶'}</button>

          <span style={{ fontSize:11, color:'#e6edf3', fontFamily:'JetBrains Mono,monospace' }}>Full Song</span>

          <button onClick={() => toggle(beatRef, setShowBeat, mixRef)} style={{
            marginLeft:'auto', background: showBeat ? '#7C3AED22' : '#21262d',
            border:`1px solid ${showBeat ? '#7C3AED' : '#30363d'}`,
            color: showBeat ? '#a78bfa' : '#8b949e',
            borderRadius:5, padding:'4px 10px', cursor:'pointer',
            fontFamily:'JetBrains Mono,monospace', fontSize:10,
          }}>🥁 {showBeat ? 'Stop Beat' : 'Preview Beat'}</button>
        </div>

        {/* Action buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <button onClick={() => onToDaw(result)} style={{
            background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8',
            borderRadius:6, padding:'8px', cursor:'pointer',
            fontFamily:'JetBrains Mono,monospace', fontSize:11, fontWeight:700,
          }}>→ Send to DAW</button>
          <a href={result.mixed_url} download="my_song.mp3" style={{
            background:'#21262d', border:'1px solid #30363d', color:'#8b949e',
            borderRadius:6, padding:'8px', textDecoration:'none', textAlign:'center',
            fontFamily:'JetBrains Mono,monospace', fontSize:11,
          }}>⬇ Download</a>
          <button onClick={onRecordAgain} style={{
            background:'#FF660022', border:'1px solid #FF6600', color:'#FF6600',
            borderRadius:6, padding:'8px', cursor:'pointer',
            fontFamily:'JetBrains Mono,monospace', fontSize:11,
          }}>🎙 Hum Again</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function HumToSong() {
  // Recording state
  const [step, setStep]             = useState('idle'); // idle | recording | recorded | generating | done
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [humBlob, setHumBlob]       = useState(null);
  const [humUrl, setHumUrl]         = useState(null);

  // Config
  const [genre, setGenre]           = useState('hip_hop');
  const [feel, setFeel]             = useState('chill');

  // Generation
  const [genProgress, setGenProgress] = useState(0);
  const [genMsg, setGenMsg]           = useState('');
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
  const [credits, setCredits]         = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const streamRef        = useRef(null);
  const chunksRef        = useRef([]);
  const analyserRef      = useRef(null);
  const audioCtxRef      = useRef(null);
  const timerRef         = useRef(null);

  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch credits on mount
  useEffect(() => {
    fetch(`${BACKEND}/api/ai/credits`, {
      headers: { Authorization:`Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.json()).then(d => setCredits(d.credits?.balance ?? null)).catch(() => {});
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Start Recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    setError('');
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        setHumBlob(blob);
        setHumUrl(URL.createObjectURL(blob));
        setStep('recorded');
        streamRef.current?.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
      };
      mr.start(100);
      mediaRecorderRef.current = mr;

      setStep('recording');
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          if (s >= MAX_RECORD_SECONDS - 1) { stopRecording(); return MAX_RECORD_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError('Microphone access denied. Please allow mic access.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetToIdle = () => {
    setStep('idle');
    setHumBlob(null);
    setHumUrl(null);
    setRecordSeconds(0);
    setResult(null);
    setError('');
    setGenProgress(0);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!humBlob) { setError('Record your hum first.'); return; }
    if (credits !== null && credits < CREDIT_COST) {
      setError(`Not enough credits. Need ${CREDIT_COST}, have ${credits}. Buy more at /ai-credits.`);
      return;
    }

    setStep('generating');
    setError('');
    setGenProgress(5);
    setGenMsg('Deducting credits...');

    try {
      // 1. Deduct credits via existing credit system
      const cRes = await fetch(`${BACKEND}/api/ai/credits/use`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ feature:'hum_to_song' }),
      });
      if (!cRes.ok) throw new Error('Credit deduction failed — check your balance at /ai-credits');
      const cData = await cRes.json();
      if (!cData.success) throw new Error(cData.error || 'Not enough credits');
      setCredits(cData.balance);

      setGenProgress(20); setGenMsg('Uploading your hum...');

      const poll = setInterval(() => setGenProgress(p => Math.min(p + 2, 88)), 1800);

      // 2. Send to same backend as AddBeatToVocals
      const fd = new FormData();
      fd.append('vocal', humBlob, 'hum.webm');
      fd.append('genre', genre);
      fd.append('feel',  feel);
      fd.append('instruments', 'standard');
      fd.append('auto_tempo', 'true');

      const res = await fetch(`${BACKEND}/api/ai/add-beat`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
        body: fd,
      });
      clearInterval(poll);
      if (!res.ok) {
        // Refund on failure
        await fetch(`${BACKEND}/api/ai/credits/refund`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ feature:'hum_to_song' }),
        });
        const e = await res.json();
        throw new Error(e.error || 'Generation failed');
      }

      const data = await res.json();
      setGenProgress(100); setGenMsg('Your song is ready!');

      const GENRE_LABELS = { hip_hop:'Hip-Hop', rnb:'R&B', pop:'Pop', trap:'Trap', afrobeats:'Afrobeats', lofi:'Lo-Fi', gospel:'Gospel', soul:'Soul', house:'House', cinematic:'Cinematic' };
      const FEEL_LABELS  = { dark:'Dark', uplifting:'Uplifting', chill:'Chill', aggressive:'Hard', romantic:'Romantic', epic:'Epic' };

      setResult({
        title:     data.title || `My ${GENRE_LABELS[genre]} Song`,
        mixed_url: data.mixed_url,
        beat_url:  data.beat_url,
        genre:     GENRE_LABELS[genre],
        feel:      FEEL_LABELS[feel],
        bpm:       data.bpm || '?',
      });
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('recorded');
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    label: { fontSize:9, color:'#8b949e', letterSpacing:2, marginBottom:6, display:'block', fontFamily:'JetBrains Mono,monospace' },
  };

  const isRecording = step === 'recording';
  const isRecorded  = step === 'recorded';
  const isGenerating = step === 'generating';
  const isDone      = step === 'done';

  return (
    <div style={{ background:'#0d1117', color:'#e6edf3', minHeight:'100vh', fontFamily:'JetBrains Mono,monospace' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg, #161b22, #0d1117)', borderBottom:'1px solid #21262d', padding:'18px 20px' }}>
        <div style={{ maxWidth:640, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:36 }}>🎙</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:22, fontWeight:900, color:'#00ffc8', letterSpacing:1 }}>HUM TO SONG</div>
            <div style={{ fontSize:11, color:'#8b949e' }}>
              Hum a melody → AI builds a full song around it · {CREDIT_COST} credits
            </div>
          </div>
          {credits !== null && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:8, color:'#8b949e', letterSpacing:2 }}>CREDITS</div>
              <div style={{ fontSize:22, fontWeight:900, color: credits < CREDIT_COST ? '#ff4444' : '#00ffc8' }}>{credits}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 20px' }}>

        {/* ── Step 1: Record ─────────────────────────────────────────────── */}
        <div style={{ background:'#161b22', border:`1px solid ${isRecording ? '#00ffc8' : '#21262d'}`, borderRadius:12, padding:'20px', marginBottom:16, transition:'border-color 0.3s' }}>
          <span style={{ ...s.label, color: isRecording ? '#00ffc8' : '#8b949e' }}>
            {isRecording ? `● RECORDING — ${recordSeconds}s / ${MAX_RECORD_SECONDS}s` : isRecorded || isDone ? '✓ HUM RECORDED' : 'STEP 1 — HUM YOUR MELODY'}
          </span>

          {/* Waveform */}
          <div style={{ background:'#0d1117', borderRadius:8, padding:'8px', marginBottom:14 }}>
            <LiveWaveform analyserRef={analyserRef} recording={isRecording} />
          </div>

          {/* Record timer bar */}
          {isRecording && (
            <div style={{ height:2, background:'#21262d', borderRadius:1, marginBottom:12 }}>
              <div style={{
                height:'100%', borderRadius:1,
                width:`${(recordSeconds / MAX_RECORD_SECONDS) * 100}%`,
                background:'#00ffc8', transition:'width 1s linear',
              }} />
            </div>
          )}

          {/* Playback if recorded */}
          {(isRecorded || isDone) && humUrl && (
            <div style={{ marginBottom:12 }}>
              <span style={s.label}>YOUR HUM</span>
              <audio controls src={humUrl} style={{ width:'100%', height:32, accentColor:'#00ffc8' }} />
            </div>
          )}

          {/* Control buttons */}
          <div style={{ display:'flex', gap:8 }}>
            {!isRecording && !isGenerating && (
              <button
                onClick={isRecorded || isDone ? resetToIdle : startRecording}
                style={{
                  flex:1, padding:'12px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                  fontSize:13, fontWeight:900, letterSpacing:1,
                  background: isRecorded || isDone ? '#21262d' : '#00ffc822',
                  border:`2px solid ${isRecorded || isDone ? '#30363d' : '#00ffc8'}`,
                  color: isRecorded || isDone ? '#8b949e' : '#00ffc8',
                }}
              >
                {isRecorded || isDone ? '🔄 Record New Hum' : '🎙 Start Recording'}
              </button>
            )}
            {isRecording && (
              <button onClick={stopRecording} style={{
                flex:1, padding:'12px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                fontSize:13, fontWeight:900, letterSpacing:1,
                background:'#ff444422', border:'2px solid #ff4444', color:'#ff4444',
              }}>
                ⏹ Stop Recording
              </button>
            )}
          </div>

          {!isRecording && !isRecorded && !isDone && (
            <div style={{ marginTop:10, fontSize:10, color:'#8b949e', lineHeight:1.6 }}>
              💡 Tips: Hum the main melody or hook. Keep it 5–20 seconds. Any tune works — the AI will match your pitch and rhythm.
            </div>
          )}
        </div>

        {/* ── Step 2: Style ─────────────────────────────────────────────── */}
        <div style={{ background:'#161b22', border:'1px solid #21262d', borderRadius:12, padding:'16px', marginBottom:16, opacity: isRecorded || isDone ? 1 : 0.4, transition:'opacity 0.3s' }}>
          <span style={s.label}>STEP 2 — CHOOSE YOUR STYLE</span>

          {/* Genre */}
          <div style={{ marginBottom:12 }}>
            <span style={s.label}>GENRE</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {GENRES.map(g => (
                <button key={g.id} onClick={() => setGenre(g.id)} disabled={isGenerating} style={{
                  background: genre===g.id ? '#00ffc811' : '#0d1117',
                  border:`1px solid ${genre===g.id ? '#00ffc8' : '#21262d'}`,
                  color: genre===g.id ? '#00ffc8' : '#8b949e',
                  borderRadius:6, padding:'5px 10px', cursor:'pointer',
                  fontFamily:'inherit', fontSize:11, transition:'all 0.12s',
                }}>
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feel */}
          <div>
            <span style={s.label}>FEEL</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {FEELS.map(f => (
                <button key={f.id} onClick={() => setFeel(f.id)} disabled={isGenerating} style={{
                  background: feel===f.id ? '#FF660011' : '#0d1117',
                  border:`1px solid ${feel===f.id ? '#FF6600' : '#21262d'}`,
                  color: feel===f.id ? '#FF6600' : '#8b949e',
                  borderRadius:6, padding:'5px 12px', cursor:'pointer',
                  fontFamily:'inherit', fontSize:11, transition:'all 0.12s',
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background:'#ff444422', border:'1px solid #ff4444', borderRadius:8, padding:'10px 12px', color:'#ff8888', fontSize:11, marginBottom:12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Generate Button ────────────────────────────────────────────── */}
        {!isDone && (
          <button
            onClick={generate}
            disabled={!isRecorded || isGenerating}
            style={{
              width:'100%', padding:'14px', borderRadius:10, fontFamily:'inherit',
              fontSize:15, fontWeight:900, letterSpacing:1,
              background: isGenerating ? '#21262d' : (!isRecorded) ? '#21262d' : 'linear-gradient(135deg, #00ffc8, #00a896)',
              border:'none', color: (!isRecorded || isGenerating) ? '#8b949e' : '#0d1117',
              cursor: (!isRecorded || isGenerating) ? 'not-allowed' : 'pointer',
              transition:'all 0.2s',
            }}
          >
            {isGenerating ? genMsg || 'Building your song...' : `✨ Build My Song — ${CREDIT_COST} Credits`}
          </button>
        )}

        {/* Progress bar */}
        {isGenerating && genProgress > 0 && (
          <div style={{ marginTop:8, height:3, background:'#21262d', borderRadius:2 }}>
            <div style={{
              height:'100%', borderRadius:2, width:`${genProgress}%`,
              background:'linear-gradient(90deg, #00ffc8, #FF6600)',
              transition:'width 0.6s ease',
            }} />
          </div>
        )}

        {/* ── Result ────────────────────────────────────────────────────── */}
        {isDone && result && (
          <SongResult
            result={result}
            onToDaw={r => alert(`"${r.title}" → DAW\n\nIn production: opens RecordingStudio with your hum + generated beat on separate tracks.`)}
            onRecordAgain={resetToIdle}
          />
        )}

        {/* How it works */}
        {step === 'idle' && (
          <div style={{ marginTop:24, background:'#161b22', border:'1px solid #21262d', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:'#8b949e', letterSpacing:2, marginBottom:10 }}>HOW IT WORKS</div>
            {[
              ['🎙', 'Hum your melody', 'Sing, hum, or whistle any tune — even just a few notes'],
              ['🔍', 'AI detects your pitch', 'We analyze the key, tempo, and melodic shape of your hum'],
              ['🎸', 'Beat is built around you', 'MusicGen conditions on your melody to create matching instrumentation'],
              ['🎵', 'Full song ready', 'Download or send straight to your DAW to add your own vocals'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display:'flex', gap:10, marginBottom:10 }}>
                <div style={{ fontSize:20, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#e6edf3' }}>{title}</div>
                  <div style={{ fontSize:10, color:'#8b949e' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
