/**
 * QuickCaptureMode.js
 * StreamPireX — One-Tap Quick Capture (closes Fender Studio gap)
 *
 * Features:
 *  - Single large record button — press and record instantly, no setup
 *  - Auto-creates a track + clip in the current session
 *  - Live waveform visualization during recording
 *  - BPM metronome click (optional)
 *  - Count-in (1, 2, 3, 4...)
 *  - Export as WAV/MP3 or send straight to DAW
 *  - Mobile-optimized layout
 *
 * Integration:
 *   import QuickCaptureMode from './QuickCaptureMode';
 *   // Add as route: <Route path="/quick-record" element={<QuickCaptureMode />} />
 *   // Or as a modal/overlay in the DAW
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SAMPLE_RATE = 44100;
const COUNT_IN_BEATS = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
}

// ---------------------------------------------------------------------------
// WaveformVisualizer
// ---------------------------------------------------------------------------
function WaveformVisualizer({ analyzerNode, isRecording }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!analyzerNode || !isRecording) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyzerNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyzerNode.getByteTimeDomainData(dataArray);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ffc8';
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [analyzerNode, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      style={{
        width: '100%', height: 120,
        borderRadius: 8,
        background: '#0d1117',
        border: isRecording ? '1px solid #00ffc844' : '1px solid #21262d',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function QuickCaptureMode({
  onCaptureDone = (blob, duration) => {},
  onSendToDAW = (blob) => {},
  defaultBPM = 120,
}) {
  const [phase, setPhase] = useState('idle'); // idle | countIn | recording | done
  const [countInBeat, setCountInBeat] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bpm, setBpm] = useState(defaultBPM);
  const [useMetronome, setUseMetronome] = useState(false);
  const [useCountIn, setUseCountIn] = useState(true);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyzerRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const levelTimerRef = useRef(null);
  const metronomeRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, []);

  const stopEverything = () => {
    clearInterval(timerRef.current);
    clearInterval(levelTimerRef.current);
    clearInterval(metronomeRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close();
    }
  };

  // ---------------------------------------------------------------------------
  // Metronome click
  // ---------------------------------------------------------------------------
  const scheduleClick = useCallback((ctx, time, isDownbeat) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = isDownbeat ? 880 : 660;
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  // ---------------------------------------------------------------------------
  // Count-in
  // ---------------------------------------------------------------------------
  const startCountIn = useCallback(async () => {
    setError('');
    setPhase('countIn');
    setCountInBeat(1);

    const beatMs = (60 / bpm) * 1000;
    let beat = 1;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Schedule all count-in clicks
    for (let i = 0; i < COUNT_IN_BEATS; i++) {
      scheduleClick(ctx, ctx.currentTime + (i * beatMs / 1000), i === 0);
    }

    const interval = setInterval(() => {
      beat++;
      setCountInBeat(beat);
      if (beat > COUNT_IN_BEATS) {
        clearInterval(interval);
        startRecording(ctx);
      }
    }, beatMs);
  }, [bpm, scheduleClick]);

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------
  const startRecording = useCallback(async (existingCtx) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = existingCtx || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 2048;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Level meter
      const levelAnalyzer = ctx.createAnalyser();
      levelAnalyzer.fftSize = 256;
      source.connect(levelAnalyzer);
      const levelData = new Uint8Array(levelAnalyzer.frequencyBinCount);
      levelTimerRef.current = setInterval(() => {
        levelAnalyzer.getByteFrequencyData(levelData);
        const avg = levelData.reduce((a, b) => a + b, 0) / levelData.length;
        setInputLevel(avg / 128);
      }, 50);

      // Metronome during recording
      if (useMetronome) {
        const beatMs = (60 / bpm) * 1000;
        let beatCount = 0;
        metronomeRef.current = setInterval(() => {
          scheduleClick(ctx, ctx.currentTime, beatCount % 4 === 0);
          beatCount++;
        }, beatMs);
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setPhase('done');
        onCaptureDone(blob, elapsed);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      startTimeRef.current = Date.now();
      setPhase('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
      }, 50);

    } catch (e) {
      setError('Microphone access denied. Please allow microphone permissions.');
      setPhase('idle');
    }
  }, [bpm, useMetronome, elapsed, onCaptureDone, scheduleClick]);

  // ---------------------------------------------------------------------------
  // Stop recording
  // ---------------------------------------------------------------------------
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(levelTimerRef.current);
    clearInterval(metronomeRef.current);
    setRecordedDuration(elapsed);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, [elapsed]);

  // ---------------------------------------------------------------------------
  // Discard
  // ---------------------------------------------------------------------------
  const handleDiscard = () => {
    setRecordedBlob(null);
    setElapsed(0);
    setPhase('idle');
    stopEverything();
  };

  // ---------------------------------------------------------------------------
  // Download
  // ---------------------------------------------------------------------------
  const handleDownload = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick-capture-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Main action button handler
  // ---------------------------------------------------------------------------
  const handleMainButton = () => {
    if (phase === 'idle') {
      if (useCountIn) startCountIn();
      else startRecording(null);
    } else if (phase === 'recording') {
      stopRecording();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isRecording = phase === 'recording';
  const isCountIn = phase === 'countIn';
  const isDone = phase === 'done';

  return (
    <div style={{
      background: '#0d1117', color: '#e6edf3',
      fontFamily: 'JetBrains Mono, monospace',
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Title */}
      <div style={{fontSize: 11, letterSpacing: 3, color: '#8b949e', marginBottom: 8}}>
        STREAMPIREX
      </div>
      <div style={{fontSize: 22, fontWeight: 700, color: '#00ffc8', marginBottom: 32, letterSpacing: 1}}>
        QUICK CAPTURE
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#ff444422', border: '1px solid #ff4444',
          color: '#ff4444', borderRadius: 6, padding: '8px 16px',
          marginBottom: 20, fontSize: 12,
        }}>{error}</div>
      )}

      {/* Count-in display */}
      {isCountIn && (
        <div style={{
          fontSize: 96, fontWeight: 900, color: '#FF6600',
          marginBottom: 24, letterSpacing: -4,
          animation: 'pulse 0.1s',
        }}>{countInBeat}</div>
      )}

      {/* Timer */}
      {(isRecording || isDone) && (
        <div style={{
          fontSize: 48, fontWeight: 700,
          color: isRecording ? '#ff4444' : '#e6edf3',
          marginBottom: 16, fontVariantNumeric: 'tabular-nums',
        }}>
          {formatTime(isDone ? recordedDuration : elapsed)}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 16, color: '#ff4444',
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#ff4444',
            animation: 'blink 1s infinite',
          }} />
          <span style={{fontSize: 12, letterSpacing: 2}}>RECORDING</span>
        </div>
      )}

      {/* Waveform */}
      <div style={{width: '100%', maxWidth: 600, marginBottom: 24}}>
        <WaveformVisualizer
          analyzerNode={analyzerRef.current}
          isRecording={isRecording}
        />
        {/* Level meter */}
        <div style={{marginTop: 4, height: 4, background: '#21262d', borderRadius: 2}}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${inputLevel * 100}%`,
            background: inputLevel > 0.8 ? '#ff4444' : inputLevel > 0.5 ? '#FFD700' : '#00ffc8',
            transition: 'width 0.05s',
          }} />
        </div>
      </div>

      {/* Settings (idle only) */}
      {phase === 'idle' && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 32,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12}}>
            <input
              type="checkbox"
              checked={useCountIn}
              onChange={e => setUseCountIn(e.target.checked)}
              style={{accentColor:'#00ffc8'}}
            />
            Count-in ({COUNT_IN_BEATS} beats)
          </label>
          <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12}}>
            <input
              type="checkbox"
              checked={useMetronome}
              onChange={e => setUseMetronome(e.target.checked)}
              style={{accentColor:'#00ffc8'}}
            />
            Metronome
          </label>
          <label style={{display:'flex', alignItems:'center', gap:6, fontSize:12}}>
            BPM:
            <input
              type="number"
              value={bpm}
              onChange={e => setBpm(Math.max(40, Math.min(300, parseInt(e.target.value) || 120)))}
              style={{
                width:55, background:'#21262d', border:'1px solid #30363d',
                borderRadius:4, color:'#e6edf3', padding:'3px 6px',
                fontFamily:'inherit', fontSize:12, textAlign:'center',
              }}
            />
          </label>
        </div>
      )}

      {/* Main Record Button */}
      {!isDone && (
        <button
          onClick={handleMainButton}
          disabled={isCountIn}
          style={{
            width: 120, height: 120, borderRadius: '50%',
            border: `4px solid ${isRecording ? '#ff4444' : isCountIn ? '#FF6600' : '#00ffc8'}`,
            background: isRecording
              ? '#ff444422'
              : isCountIn ? '#FF660022' : '#00ffc822',
            color: isRecording ? '#ff4444' : isCountIn ? '#FF6600' : '#00ffc8',
            fontSize: isRecording ? 36 : 40,
            cursor: isCountIn ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: isRecording
              ? '0 0 40px #ff444466'
              : isCountIn ? '0 0 40px #FF660066' : '0 0 20px #00ffc833',
          }}
        >
          {isRecording ? '⏹' : isCountIn ? '...' : '⏺'}
        </button>
      )}

      {/* Done actions */}
      {isDone && (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:12, width:'100%', maxWidth:400}}>
          {/* Playback */}
          {recordedBlob && (
            <audio
              controls
              src={URL.createObjectURL(recordedBlob)}
              style={{width:'100%', filter:'invert(1)'}}
            />
          )}
          <div style={{display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center'}}>
            <button
              onClick={() => onSendToDAW(recordedBlob)}
              style={{
                background:'#00ffc822', border:'1px solid #00ffc8',
                color:'#00ffc8', borderRadius:6, padding:'10px 20px',
                cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:700,
              }}
            >
              → Send to DAW
            </button>
            <button
              onClick={handleDownload}
              style={{
                background:'#21262d', border:'1px solid #30363d',
                color:'#e6edf3', borderRadius:6, padding:'10px 20px',
                cursor:'pointer', fontFamily:'inherit', fontSize:12,
              }}
            >
              ⬇ Download
            </button>
            <button
              onClick={handleDiscard}
              style={{
                background:'#21262d', border:'1px solid #ff444433',
                color:'#ff6666', borderRadius:6, padding:'10px 20px',
                cursor:'pointer', fontFamily:'inherit', fontSize:12,
              }}
            >
              🗑 Discard
            </button>
          </div>
          <button
            onClick={handleDiscard}
            style={{
              background:'none', border:'none', color:'#8b949e',
              cursor:'pointer', fontFamily:'inherit', fontSize:11,
              marginTop:4,
            }}
          >
            + Record another
          </button>
        </div>
      )}

      {/* Hint */}
      {phase === 'idle' && (
        <div style={{marginTop:24, color:'#8b949e', fontSize:11, textAlign:'center'}}>
          Press ⏺ to start recording instantly<br/>
          {useCountIn && `${COUNT_IN_BEATS}-beat count-in at ${bpm} BPM`}
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
