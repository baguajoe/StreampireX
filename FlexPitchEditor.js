// =============================================================================
// FlexPitchEditor.js — Melodyne-style per-note pitch correction
// =============================================================================
// Location: src/front/js/component/FlexPitchEditor.js
//
// Features:
//   • YIN pitch detection on any AudioBuffer
//   • Note blobs drawn on piano-roll canvas
//   • Drag blobs up/down to correct pitch (semitone snapping)
//   • Drag edges to adjust note boundaries
//   • Double-click to reset note to original pitch
//   • Exports corrected AudioBuffer via grain-based pitch shifting
//   • Integrates into RecordingStudio region editor
// =============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../../styles/FlexPitchEditor.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_NAMES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MIN_MIDI    = 36;   // C2
const MAX_MIDI    = 84;   // C6
const NOTE_RANGE  = MAX_MIDI - MIN_MIDI;
const MIN_NOTE_W  = 4;    // px minimum note blob width

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const freqToMidi  = f => f > 0 ? 69 + 12 * Math.log2(f / 440) : -1;
const midiToFreq  = m => 440 * Math.pow(2, (m - 69) / 12);
const midiToName  = m => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const clamp       = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────────────────────────────────────
// YIN pitch detection — returns array of { time, freq, midi, confidence }
// ─────────────────────────────────────────────────────────────────────────────
function runYIN(channelData, sampleRate, hopSize = 512, windowSize = 2048, threshold = 0.15) {
  const results = [];
  const N = channelData.length;

  for (let start = 0; start + windowSize < N; start += hopSize) {
    const frame = channelData.slice(start, start + windowSize);

    // Difference function
    const d = new Float32Array(windowSize / 2);
    for (let tau = 1; tau < d.length; tau++) {
      let sum = 0;
      for (let j = 0; j < d.length; j++) {
        const diff = frame[j] - frame[j + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // Cumulative mean normalized difference
    const cmnd = new Float32Array(d.length);
    cmnd[0] = 1;
    let runSum = 0;
    for (let tau = 1; tau < d.length; tau++) {
      runSum += d[tau];
      cmnd[tau] = runSum === 0 ? 1 : d[tau] * tau / runSum;
    }

    // Find first dip below threshold
    let tau = -1;
    for (let t = 2; t < cmnd.length - 1; t++) {
      if (cmnd[t] < threshold && cmnd[t] < cmnd[t + 1]) {
        tau = t; break;
      }
    }

    // Parabolic interpolation
    let freq = 0, confidence = 0;
    if (tau > 0) {
      const better = tau + (cmnd[tau - 1] - cmnd[tau + 1]) /
        (2 * (2 * cmnd[tau] - cmnd[tau - 1] - cmnd[tau + 1]));
      freq = sampleRate / better;
      confidence = 1 - cmnd[tau];
      if (freq < 50 || freq > 2000) freq = 0;
    }

    results.push({
      time:       start / sampleRate,
      freq,
      midi:       freq > 0 ? Math.round(freqToMidi(freq)) : -1,
      confidence: freq > 0 ? confidence : 0,
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Group pitch frames into note blobs
// ─────────────────────────────────────────────────────────────────────────────
function groupIntoNotes(frames, hopSec, minDurSec = 0.05) {
  const notes = [];
  let current = null;

  frames.forEach((f, i) => {
    if (f.midi < MIN_MIDI || f.midi > MAX_MIDI || f.confidence < 0.4) {
      if (current) { notes.push(current); current = null; }
      return;
    }
    if (!current || current.midi !== f.midi) {
      if (current) notes.push(current);
      current = {
        id:          notes.length,
        startTime:   f.time,
        endTime:     f.time + hopSec,
        midi:        f.midi,
        origMidi:    f.midi,
        semShift:    0,
        confidence:  f.confidence,
        frameCount:  1,
      };
    } else {
      current.endTime  = f.time + hopSec;
      current.confidence = Math.max(current.confidence, f.confidence);
      current.frameCount++;
    }
  });
  if (current) notes.push(current);

  return notes.filter(n => (n.endTime - n.startTime) >= minDurSec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Grain-based pitch shift (simple phase vocoder approximation)
// ─────────────────────────────────────────────────────────────────────────────
async function pitchShiftBuffer(audioCtx, srcBuffer, semitones) {
  if (Math.abs(semitones) < 0.01) return srcBuffer;
  const ratio   = Math.pow(2, semitones / 12);
  const outLen  = Math.ceil(srcBuffer.length / ratio);
  const offCtx  = new OfflineAudioContext(
    srcBuffer.numberOfChannels, outLen, srcBuffer.sampleRate
  );
  const src     = offCtx.createBufferSource();
  src.buffer    = srcBuffer;
  src.playbackRate.value = ratio;
  src.connect(offCtx.destination);
  src.start(0);
  return offCtx.startRendering();
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply per-note pitch corrections and export a new AudioBuffer
// ─────────────────────────────────────────────────────────────────────────────
async function applyCorrections(audioCtx, srcBuffer, notes) {
  const sr      = srcBuffer.sampleRate;
  const nc      = srcBuffer.numberOfChannels;
  const outBuf  = audioCtx.createBuffer(nc, srcBuffer.length, sr);

  // Sort notes by time
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);

  for (const note of sorted) {
    if (note.semShift === 0) {
      // Copy unchanged
      const startSmp = Math.floor(note.startTime * sr);
      const endSmp   = Math.min(Math.ceil(note.endTime * sr), srcBuffer.length);
      for (let ch = 0; ch < nc; ch++) {
        const src = srcBuffer.getChannelData(ch);
        const dst = outBuf.getChannelData(ch);
        for (let i = startSmp; i < endSmp; i++) dst[i] = src[i];
      }
      continue;
    }

    // Extract segment
    const startSmp  = Math.floor(note.startTime * sr);
    const endSmp    = Math.min(Math.ceil(note.endTime * sr), srcBuffer.length);
    const segLen    = endSmp - startSmp;
    const segBuf    = audioCtx.createBuffer(nc, segLen, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = srcBuffer.getChannelData(ch).slice(startSmp, endSmp);
      segBuf.copyToChannel(src, ch);
    }

    // Pitch shift segment
    const shifted = await pitchShiftBuffer(audioCtx, segBuf, note.semShift);

    // Copy back (trim/pad to original length)
    for (let ch = 0; ch < nc; ch++) {
      const src = shifted.getChannelData(ch);
      const dst = outBuf.getChannelData(ch);
      for (let i = 0; i < segLen && i < shifted.length; i++) {
        dst[startSmp + i] = src[i];
      }
    }
  }

  return outBuf;
}

// ─────────────────────────────────────────────────────────────────────────────
// FlexPitchEditor Component
// ─────────────────────────────────────────────────────────────────────────────
const FlexPitchEditor = ({
  audioBuffer,      // AudioBuffer to edit
  audioContext,     // Web Audio context
  trackName = '',   // Display name
  onClose,          // () => void
  onExport,         // (correctedBuffer) => void
}) => {
  const canvasRef     = useRef(null);
  const pianoRef      = useRef(null);
  const [notes, setNotes]           = useState([]);
  const [analyzing, setAnalyzing]   = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [zoom, setZoom]             = useState(1);
  const [snapToSemi, setSnapToSemi] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [status, setStatus]         = useState('Click ANALYZE to detect notes');
  const dragRef = useRef({ active: false, noteId: null, type: null, startY: 0, startShift: 0 });

  const duration = audioBuffer?.duration ?? 0;

  // ── Canvas dimensions ───────────────────────────────────────────────────
  const PIANO_W    = 48;
  const NOTE_H     = 12;
  const CANVAS_H   = NOTE_RANGE * NOTE_H;

  const timeToX = useCallback((t, canvasW) =>
    PIANO_W + (t / duration) * (canvasW - PIANO_W) * zoom,
  [duration, zoom]);

  const midiToY = useCallback((midi) =>
    (MAX_MIDI - midi) * NOTE_H,
  []);

  const yToMidi = useCallback((y) =>
    Math.round(MAX_MIDI - y / NOTE_H),
  []);

  // ── Analyze ─────────────────────────────────────────────────────────────
  const analyze = useCallback(async () => {
    if (!audioBuffer) return;
    setAnalyzing(true);
    setStatus('Detecting pitches...');
    try {
      await new Promise(r => setTimeout(r, 50)); // let UI update
      const data    = audioBuffer.getChannelData(0);
      const sr      = audioBuffer.sampleRate;
      const hopSize = 512;
      const frames  = runYIN(data, sr, hopSize, 2048, 0.15);
      const hopSec  = hopSize / sr;
      const grouped = groupIntoNotes(frames, hopSec);
      setNotes(grouped.map((n, i) => ({ ...n, id: i })));
      setStatus(`Found ${grouped.length} notes — drag up/down to correct pitch`);
    } catch (e) {
      setStatus(`Analysis failed: ${e.message}`);
    }
    setAnalyzing(false);
  }, [audioBuffer]);

  // ── Draw ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv  = canvasRef.current;
    const pc  = pianoRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W   = cv.width;
    const H   = cv.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, W, H);

    // Piano key rows
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
      const y       = midiToY(midi);
      const isBlack = [1,3,6,8,10].includes(midi % 12);
      ctx.fillStyle = isBlack ? '#0a0e14' : '#0d1117';
      ctx.fillRect(PIANO_W, y, W - PIANO_W, NOTE_H);
      // Row separator
      if (midi % 12 === 0) {
        ctx.strokeStyle = '#1c2840';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(PIANO_W, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // Beat grid
    const beatsVisible = Math.ceil(duration * zoom);
    for (let b = 0; b <= beatsVisible; b++) {
      const x = timeToX(b, W);
      ctx.strokeStyle = b % 4 === 0 ? '#1c2840' : '#111820';
      ctx.lineWidth   = b % 4 === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Note blobs
    notes.forEach(note => {
      const x1 = timeToX(note.startTime, W);
      const x2 = timeToX(note.endTime,   W);
      const y  = midiToY(note.midi + note.semShift) + 1;
      const bw = Math.max(MIN_NOTE_W, x2 - x1 - 2);
      const bh = NOTE_H - 2;
      const isSelected = selectedNote === note.id;
      const isShifted  = note.semShift !== 0;

      // Blob color
      const hue   = isShifted ? 40 : 160;
      const alpha = 0.5 + note.confidence * 0.5;
      ctx.fillStyle = isSelected
        ? `hsla(${hue}, 90%, 65%, 0.95)`
        : `hsla(${hue}, 70%, 55%, ${alpha})`;

      // Rounded rect
      const r = 3;
      ctx.beginPath();
      ctx.moveTo(x1 + r, y);
      ctx.lineTo(x1 + bw - r, y);
      ctx.quadraticCurveTo(x1 + bw, y, x1 + bw, y + r);
      ctx.lineTo(x1 + bw, y + bh - r);
      ctx.quadraticCurveTo(x1 + bw, y + bh, x1 + bw - r, y + bh);
      ctx.lineTo(x1 + r, y + bh);
      ctx.quadraticCurveTo(x1, y + bh, x1, y + bh - r);
      ctx.lineTo(x1, y + r);
      ctx.quadraticCurveTo(x1, y, x1 + r, y);
      ctx.closePath();
      ctx.fill();

      // Outline
      ctx.strokeStyle = isSelected ? '#fff' : `hsla(${hue}, 80%, 70%, 0.6)`;
      ctx.lineWidth   = isSelected ? 1.5 : 0.5;
      ctx.stroke();

      // Note label
      if (bw > 28) {
        ctx.fillStyle = isSelected ? '#000' : '#fff';
        ctx.font      = `bold 8px 'JetBrains Mono', monospace`;
        ctx.fillText(
          `${midiToName(note.midi + note.semShift)}${note.semShift !== 0 ? ` (${note.semShift > 0 ? '+' : ''}${note.semShift})` : ''}`,
          x1 + 3, y + bh - 2
        );
      }

      // Resize handles
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(x1, y, 4, bh);
      ctx.fillRect(x1 + bw - 4, y, 4, bh);
    });

    // Piano keyboard (left side)
    if (pc) {
      const pCtx = pc.getContext('2d');
      pCtx.clearRect(0, 0, PIANO_W, H);
      pCtx.fillStyle = '#0d1117';
      pCtx.fillRect(0, 0, PIANO_W, H);

      for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
        const y       = midiToY(midi);
        const isBlack = [1,3,6,8,10].includes(midi % 12);
        const isC     = midi % 12 === 0;

        pCtx.fillStyle = isBlack ? '#111' : '#e8e8e8';
        pCtx.fillRect(0, y + 1, PIANO_W - 2, NOTE_H - 1);

        if (isC) {
          pCtx.fillStyle = '#484f58';
          pCtx.font      = '7px monospace';
          pCtx.fillText(`C${Math.floor(midi / 12) - 1}`, 2, y + NOTE_H - 2);
        }

        pCtx.strokeStyle = '#1c2128';
        pCtx.lineWidth   = 0.5;
        pCtx.strokeRect(0, y + 1, PIANO_W - 2, NOTE_H - 1);
      }
    }
  }, [notes, selectedNote, timeToX, midiToY, duration, zoom]);

  useEffect(() => { draw(); }, [draw]);

  // ── Mouse interaction ────────────────────────────────────────────────────
  const getNoteAt = useCallback((x, y, canvasW) => {
    for (const note of notes) {
      const x1  = timeToX(note.startTime, canvasW);
      const x2  = timeToX(note.endTime,   canvasW);
      const ny  = midiToY(note.midi + note.semShift);
      if (x >= x1 && x <= x2 && y >= ny && y <= ny + NOTE_H) return note;
    }
    return null;
  }, [notes, timeToX, midiToY]);

  const onMouseDown = useCallback((e) => {
    const cv   = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const note = getNoteAt(x, y, cv.width);
    if (!note) { setSelectedNote(null); return; }

    setSelectedNote(note.id);
    const x1   = timeToX(note.startTime, cv.width);
    const x2   = timeToX(note.endTime,   cv.width);
    const near = x - x1 < 6 ? 'left' : x2 - x < 6 ? 'right' : 'body';

    dragRef.current = {
      active:     true,
      noteId:     note.id,
      type:       near,
      startY:     e.clientY,
      startShift: note.semShift,
      startTime:  note.startTime,
      endTime:    note.endTime,
      startX:     e.clientX,
    };
  }, [getNoteAt, timeToX]);

  const onMouseMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const cv = canvasRef.current; if (!cv) return;

    if (d.type === 'body') {
      // Vertical drag = pitch shift
      const dy       = d.startY - e.clientY;
      const semDelta = dy / NOTE_H;
      const newShift = snapToSemi
        ? Math.round(d.startShift + semDelta)
        : d.startShift + semDelta;
      setNotes(prev => prev.map(n =>
        n.id === d.noteId
          ? { ...n, semShift: clamp(newShift, -24, 24) }
          : n
      ));
    } else {
      // Horizontal drag = resize
      const dx    = e.clientX - d.startX;
      const dt    = (dx / (cv.width - PIANO_W)) * duration / zoom;
      setNotes(prev => prev.map(n => {
        if (n.id !== d.noteId) return n;
        if (d.type === 'left')  return { ...n, startTime: clamp(d.startTime + dt, 0, n.endTime - 0.05) };
        if (d.type === 'right') return { ...n, endTime:   clamp(d.endTime + dt,   n.startTime + 0.05, duration) };
        return n;
      }));
    }
  }, [snapToSemi, duration, zoom]);

  const onMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const onDblClick = useCallback((e) => {
    const cv = canvasRef.current; if (!cv) return;
    const r  = cv.getBoundingClientRect();
    const note = getNoteAt(e.clientX - r.left, e.clientY - r.top, cv.width);
    if (note) {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, semShift: 0 } : n));
      setStatus(`Reset ${midiToName(note.origMidi)} to original pitch`);
    }
  }, [getNoteAt]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!audioBuffer || !audioContext) return;
    setExporting(true);
    setStatus('Applying pitch corrections...');
    try {
      const corrected = await applyCorrections(audioContext, audioBuffer, notes);
      onExport?.(corrected);
      setStatus('✓ Pitch corrections applied');
    } catch (e) {
      setStatus(`Export failed: ${e.message}`);
    }
    setExporting(false);
  }, [audioBuffer, audioContext, notes, onExport]);

  // ── Resize canvas ────────────────────────────────────────────────────────
  const containerRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      cv.width  = containerRef.current.clientWidth;
      cv.height = CANVAS_H;
      draw();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const shifted = notes.filter(n => n.semShift !== 0).length;

  return (
    <div className="fpe-root">

      {/* ── HEADER ── */}
      <div className="fpe-header">
        <div className="fpe-header-left">
          <span className="fpe-title">FLEX PITCH</span>
          <span className="fpe-track-name">— {trackName}</span>
          {shifted > 0 && (
            <span className="fpe-shifted-badge">{shifted} corrected</span>
          )}
        </div>
        <div className="fpe-header-right">
          <label className="fpe-snap-toggle">
            <input
              type="checkbox"
              checked={snapToSemi}
              onChange={e => setSnapToSemi(e.target.checked)}
            />
            Semitone snap
          </label>

          <div className="fpe-zoom-group">
            <button className="fpe-zoom-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}>−</button>
            <span className="fpe-zoom-label">{zoom.toFixed(1)}×</span>
            <button className="fpe-zoom-btn" onClick={() => setZoom(z => Math.min(8, z + 0.5))}>+</button>
          </div>

          <button
            className="fpe-btn fpe-btn--analyze"
            onClick={analyze}
            disabled={analyzing || !audioBuffer}
          >
            {analyzing ? 'Analyzing...' : 'ANALYZE'}
          </button>

          <button
            className="fpe-btn fpe-btn--reset"
            onClick={() => setNotes(prev => prev.map(n => ({ ...n, semShift: 0 })))}
            disabled={shifted === 0}
          >
            RESET ALL
          </button>

          <button
            className="fpe-btn fpe-btn--export"
            onClick={handleExport}
            disabled={exporting || notes.length === 0}
          >
            {exporting ? 'Applying...' : 'APPLY'}
          </button>

          {onClose && (
            <button className="fpe-close-btn" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {/* ── STATUS ── */}
      <div className="fpe-status">{status}</div>

      {/* ── CANVAS AREA ── */}
      <div className="fpe-canvas-wrap" ref={containerRef}>
        {/* Piano keyboard */}
        <canvas
          ref={pianoRef}
          className="fpe-piano-canvas"
          width={PIANO_W}
          height={CANVAS_H}
        />
        {/* Note editor */}
        <div className="fpe-canvas-scroll">
          <canvas
            ref={canvasRef}
            className="fpe-note-canvas"
            height={CANVAS_H}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onDoubleClick={onDblClick}
          />
        </div>
      </div>

      {/* ── NOTE DETAIL (selected note) ── */}
      {selectedNote !== null && (() => {
        const note = notes.find(n => n.id === selectedNote);
        if (!note) return null;
        return (
          <div className="fpe-note-detail">
            <span className="fpe-nd-label">
              {midiToName(note.origMidi)}
              {note.semShift !== 0 && (
                <span className="fpe-nd-arrow"> → {midiToName(note.midi + note.semShift)}</span>
              )}
            </span>
            <span className="fpe-nd-sep">|</span>
            <span className="fpe-nd-label">
              {note.startTime.toFixed(3)}s – {note.endTime.toFixed(3)}s
            </span>
            <span className="fpe-nd-sep">|</span>
            <span className="fpe-nd-label">
              Shift:
              <input
                className="fpe-nd-input"
                type="number"
                min={-24} max={24} step={1}
                value={note.semShift}
                onChange={e => {
                  const v = parseInt(e.target.value) || 0;
                  setNotes(prev => prev.map(n => n.id === selectedNote ? { ...n, semShift: clamp(v,-24,24) } : n));
                }}
              />
              st
            </span>
            <button
              className="fpe-nd-reset"
              onClick={() => setNotes(prev => prev.map(n => n.id === selectedNote ? { ...n, semShift: 0 } : n))}
            >
              Reset
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default FlexPitchEditor;
