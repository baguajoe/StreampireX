// =============================================================================
// TakeLanes.js — Vocal Comping / Take Lanes for StreamPireX DAW
// =============================================================================
// Record multiple takes on the same track, display stacked waveforms,
// click/drag to select regions from each take, build a composite.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const TakeLanes = ({
  audioContext,
  bpm = 120,
  onCompositeReady,  // (compositBuffer, name) => void
  isEmbedded = false,
}) => {
  const [takes, setTakes] = useState([]);            // [{ id, name, buffer, timestamp }]
  const [selections, setSelections] = useState([]);   // [{ takeId, startSec, endSec }]
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);              // pixels per second
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragState, setDragState] = useState(null);   // { takeId, startX, startSec }
  const [hoveredTake, setHoveredTake] = useState(null);
  const [compositeBuffer, setCompositeBuffer] = useState(null);
  const [soloTake, setSoloTake] = useState(null);

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimerRef = useRef(null);
  const containerRef = useRef(null);
  const playbackRef = useRef(null);
  const sourceRef = useRef(null);
  const canvasRefs = useRef({});
  const animRef = useRef(null);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current || ctxRef.current.state === 'closed')
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext]);

  // ── Duration of longest take ──
  const maxDuration = takes.reduce((max, t) => Math.max(max, t.buffer.duration), 0);
  const totalWidth = Math.max(maxDuration * zoom, 400);

  // ── Recording ──
  const startRecording = useCallback(async () => {
    const ctx = getCtx();
    if (!streamRef.current) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
      } catch(e) { console.error(e); return; }
    }

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      try {
        const ab = await blob.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        const take = {
          id: Date.now(),
          name: `Take ${takes.length + 1}`,
          buffer: buf,
          timestamp: Date.now(),
        };
        setTakes(prev => [...prev, take]);
      } catch(e) { console.error(e); }
    };

    recorderRef.current = rec;
    rec.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    recTimerRef.current = setInterval(() => setRecordingTime(t => t + 0.1), 100);
  }, [getCtx, takes.length]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setIsRecording(false);
  }, []);

  // ── Draw waveform on canvas ──
  const drawWaveform = useCallback((takeId) => {
    const cv = canvasRefs.current[takeId];
    const take = takes.find(t => t.id === takeId);
    if (!cv || !take) return;

    const c = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    const data = take.buffer.getChannelData(0);

    c.clearRect(0, 0, w, h);

    // Background
    c.fillStyle = hoveredTake === takeId ? '#111e2e' : '#0c1520';
    c.fillRect(0, 0, w, h);

    // Draw selected regions for this take
    selections.filter(s => s.takeId === takeId).forEach(sel => {
      const x1 = sel.startSec * zoom;
      const x2 = sel.endSec * zoom;
      c.fillStyle = 'rgba(0, 255, 200, 0.12)';
      c.fillRect(x1, 0, x2 - x1, h);
      c.strokeStyle = '#00ffc8';
      c.lineWidth = 1;
      c.strokeRect(x1, 0, x2 - x1, h);
    });

    // Waveform
    const samplesPerPx = data.length / w;
    c.beginPath();
    c.strokeStyle = soloTake && soloTake !== takeId ? 'rgba(200,214,229,0.15)' : '#c8d6e5';
    c.lineWidth = 1;
    for (let px = 0; px < w; px++) {
      const start = Math.floor(px * samplesPerPx);
      const end = Math.floor((px + 1) * samplesPerPx);
      let min = 1, max = -1;
      for (let j = start; j < end && j < data.length; j++) {
        if (data[j] < min) min = data[j];
        if (data[j] > max) max = data[j];
      }
      const yMin = ((1 + min) / 2) * h;
      const yMax = ((1 + max) / 2) * h;
      c.moveTo(px, yMin);
      c.lineTo(px, yMax);
    }
    c.stroke();

    // Playback cursor
    if (playbackPos > 0) {
      const px = playbackPos * zoom;
      c.strokeStyle = '#FF6600';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(px, 0);
      c.lineTo(px, h);
      c.stroke();
    }
  }, [takes, selections, zoom, hoveredTake, soloTake, playbackPos]);

  // Redraw all waveforms when state changes
  useEffect(() => {
    takes.forEach(t => drawWaveform(t.id));
  }, [takes, selections, drawWaveform, playbackPos]);

  // ── Mouse handlers for swipe selection ──
  const handleMouseDown = useCallback((takeId, e) => {
    const cv = canvasRefs.current[takeId];
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = x / zoom;
    setDragState({ takeId, startX: x, startSec: sec });
  }, [zoom]);

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    const cv = canvasRefs.current[dragState.takeId];
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = x / zoom;

    // Update temporary selection
    const startSec = Math.min(dragState.startSec, sec);
    const endSec = Math.max(dragState.startSec, sec);

    setSelections(prev => {
      // Remove any existing selection for this take that overlaps
      const filtered = prev.filter(s => s.takeId !== dragState.takeId || s.endSec <= startSec || s.startSec >= endSec);
      return [...filtered, { takeId: dragState.takeId, startSec, endSec }];
    });
  }, [dragState, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Global mouse up listener
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  // ── Build composite from selections ──
  const buildComposite = useCallback(() => {
    if (takes.length === 0 || selections.length === 0) return;
    const ctx = getCtx();
    const sr = takes[0].buffer.sampleRate;
    const nc = takes[0].buffer.numberOfChannels;
    const dur = maxDuration;
    const len = Math.ceil(dur * sr);
    const comp = ctx.createBuffer(nc, len, sr);

    // Sort selections by time
    const sorted = [...selections].sort((a, b) => a.startSec - b.startSec);

    for (let ch = 0; ch < nc; ch++) {
      const out = comp.getChannelData(ch);

      sorted.forEach(sel => {
        const take = takes.find(t => t.id === sel.takeId);
        if (!take) return;
        const src = take.buffer.numberOfChannels > ch ? take.buffer.getChannelData(ch) : take.buffer.getChannelData(0);
        const startSamp = Math.floor(sel.startSec * sr);
        const endSamp = Math.floor(sel.endSec * sr);
        const fadeLen = Math.min(256, Math.floor((endSamp - startSamp) / 4));

        for (let i = startSamp; i < endSamp && i < len && i < src.length; i++) {
          // Crossfade at boundaries
          let fade = 1;
          if (i - startSamp < fadeLen) fade = (i - startSamp) / fadeLen;
          if (endSamp - i < fadeLen) fade = (endSamp - i) / fadeLen;
          out[i] = src[i] * fade;
        }
      });
    }

    setCompositeBuffer(comp);
    return comp;
  }, [takes, selections, maxDuration, getCtx]);

  // ── Playback ──
  const playComposite = useCallback(() => {
    const comp = compositeBuffer || buildComposite();
    if (!comp) return;
    const ctx = getCtx();

    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}

    const src = ctx.createBufferSource();
    src.buffer = comp;
    src.connect(ctx.destination);
    const startTime = ctx.currentTime;
    src.start();
    sourceRef.current = src;
    setIsPlaying(true);

    const updatePos = () => {
      setPlaybackPos(ctx.currentTime - startTime);
      if (ctx.currentTime - startTime < comp.duration) {
        animRef.current = requestAnimationFrame(updatePos);
      } else {
        setIsPlaying(false);
        setPlaybackPos(0);
      }
    };
    animRef.current = requestAnimationFrame(updatePos);
    src.onended = () => { setIsPlaying(false); setPlaybackPos(0); };
  }, [compositeBuffer, buildComposite, getCtx]);

  const playTake = useCallback((takeId) => {
    const take = takes.find(t => t.id === takeId);
    if (!take) return;
    const ctx = getCtx();

    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}

    const src = ctx.createBufferSource();
    src.buffer = take.buffer;
    src.connect(ctx.destination);
    const startTime = ctx.currentTime;
    src.start();
    sourceRef.current = src;
    setIsPlaying(true);

    const updatePos = () => {
      setPlaybackPos(ctx.currentTime - startTime);
      if (ctx.currentTime - startTime < take.buffer.duration) {
        animRef.current = requestAnimationFrame(updatePos);
      } else {
        setIsPlaying(false);
        setPlaybackPos(0);
      }
    };
    animRef.current = requestAnimationFrame(updatePos);
    src.onended = () => { setIsPlaying(false); setPlaybackPos(0); };
  }, [takes, getCtx]);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsPlaying(false);
    setPlaybackPos(0);
  }, []);

  // ── Send composite to DAW ──
  const sendComposite = useCallback(() => {
    const comp = compositeBuffer || buildComposite();
    if (comp && onCompositeReady) {
      onCompositeReady(comp, `Comp (${takes.length} takes)`);
    }
  }, [compositeBuffer, buildComposite, onCompositeReady, takes.length]);

  // ── Delete take ──
  const deleteTake = (id) => {
    setTakes(prev => prev.filter(t => t.id !== id));
    setSelections(prev => prev.filter(s => s.takeId !== id));
    if (soloTake === id) setSoloTake(null);
  };

  // ── Clear all selections ──
  const clearSelections = () => setSelections([]);

  // ── Select entire take ──
  const selectEntireTake = (takeId) => {
    const take = takes.find(t => t.id === takeId);
    if (!take) return;
    // Remove other selections that overlap, add full take
    setSelections(prev => {
      const filtered = prev.filter(s => s.takeId !== takeId);
      return [...filtered, { takeId, startSec: 0, endSec: take.buffer.duration }];
    });
  };

  // ── Auto-comp: pick loudest take per region ──
  const autoComp = useCallback(() => {
    if (takes.length < 2) return;
    const regionSize = 2; // seconds
    const newSels = [];

    for (let t = 0; t < maxDuration; t += regionSize) {
      let bestTake = takes[0];
      let bestRms = 0;

      takes.forEach(take => {
        const data = take.buffer.getChannelData(0);
        const sr = take.buffer.sampleRate;
        const start = Math.floor(t * sr);
        const end = Math.floor(Math.min(t + regionSize, take.buffer.duration) * sr);
        let rms = 0;
        for (let i = start; i < end && i < data.length; i++) rms += data[i] * data[i];
        rms = Math.sqrt(rms / (end - start || 1));
        if (rms > bestRms) { bestRms = rms; bestTake = take; }
      });

      newSels.push({ takeId: bestTake.id, startSec: t, endSec: Math.min(t + regionSize, maxDuration) });
    }

    setSelections(newSels);
  }, [takes, maxDuration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
      if (streamRef.current && !audioContext) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`;

  return (
    <div className="take-lanes">
      <div className="tl-header">
        <div className="tl-header-left">
          <span className="tl-logo">🎙</span>
          <span className="tl-title">TAKE LANES</span>
          <span className="tl-take-count">{takes.length} takes</span>
          {isRecording && <span className="tl-rec-badge">● REC {fmtTime(recordingTime)}</span>}
        </div>
        <div className="tl-header-center">
          <button className="tl-btn" onClick={isPlaying ? stopPlayback : playComposite}
            disabled={takes.length === 0}>
            {isPlaying ? '⏹ Stop' : '▶ Play Comp'}
          </button>
          <button className={`tl-btn ${isRecording ? 'tl-btn-recording' : 'tl-btn-record'}`}
            onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? '⏹ Stop Rec' : '⏺ Record Take'}
          </button>
        </div>
        <div className="tl-header-right">
          <button className="tl-btn" onClick={autoComp} disabled={takes.length < 2}
            title="Auto-select loudest take per region">
            🤖 Auto-Comp
          </button>
          <button className="tl-btn" onClick={clearSelections} disabled={selections.length === 0}>
            Clear
          </button>
          <button className="tl-btn tl-btn-send" onClick={sendComposite}
            disabled={selections.length === 0}>
            🎚 → Track
          </button>
          <div className="tl-zoom">
            <span>🔍</span>
            <input type="range" min={30} max={300} value={zoom}
              onChange={e => setZoom(+e.target.value)} className="tl-zoom-slider" />
          </div>
        </div>
      </div>

      {/* ── Ruler ── */}
      <div className="tl-ruler-wrap" style={{ paddingLeft: 120 }}>
        <div className="tl-ruler" style={{ width: totalWidth }}>
          {Array.from({ length: Math.ceil(maxDuration) + 1 }, (_, i) => (
            <div key={i} className="tl-ruler-mark" style={{ left: i * zoom }}>
              <span className="tl-ruler-label">{i}s</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Take lanes ── */}
      <div className="tl-lanes" ref={containerRef}>
        {takes.length === 0 ? (
          <div className="tl-empty">
            <span className="tl-empty-icon">🎤</span>
            <p>Click <strong>Record Take</strong> to capture your first take.</p>
            <p>Record multiple takes and swipe to select the best parts from each.</p>
          </div>
        ) : (
          takes.map((take, idx) => (
            <div key={take.id} className={`tl-lane ${soloTake === take.id ? 'soloed' : ''}`}
              onMouseEnter={() => setHoveredTake(take.id)}
              onMouseLeave={() => setHoveredTake(null)}>
              <div className="tl-lane-header">
                <span className="tl-lane-num">{idx + 1}</span>
                <span className="tl-lane-name">{take.name}</span>
                <span className="tl-lane-dur">{take.buffer.duration.toFixed(1)}s</span>
                <div className="tl-lane-actions">
                  <button className="tl-lane-btn" onClick={() => playTake(take.id)} title="Play this take">▶</button>
                  <button className={`tl-lane-btn ${soloTake === take.id ? 'active' : ''}`}
                    onClick={() => setSoloTake(soloTake === take.id ? null : take.id)} title="Solo">S</button>
                  <button className="tl-lane-btn" onClick={() => selectEntireTake(take.id)} title="Select entire take">✓</button>
                  <button className="tl-lane-btn tl-lane-del" onClick={() => deleteTake(take.id)} title="Delete">✕</button>
                </div>
              </div>
              <div className="tl-lane-canvas-wrap">
                <canvas
                  ref={el => { if (el) canvasRefs.current[take.id] = el; }}
                  width={Math.ceil(take.buffer.duration * zoom)}
                  height={64}
                  className="tl-lane-canvas"
                  onMouseDown={(e) => handleMouseDown(take.id, e)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Composite Preview ── */}
      {selections.length > 0 && (
        <div className="tl-composite">
          <div className="tl-comp-label">
            Composite — {selections.length} regions from {new Set(selections.map(s => s.takeId)).size} takes
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeLanes;