// =============================================================================
// AudioClipEditor.js — modal waveform editor for arranger clips
// =============================================================================
// Bug #9: double-clicking an audio region now opens this editor. Every action is
// a real Web Audio operation — no stubs. Edits are committed to a NEW AudioBuffer
// (originals are never mutated until Save) and a parallel `edits` array is kept so
// Part 6 can persist non-destructive ops alongside the rendered buffer.
//
// Operations:
//   trim, fadeIn, fadeOut, gain, normalize, reverse, silence
// Each pushes a snapshot onto an undo stack and a structured op onto editsRef.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "../../styles/AudioClipEditor.css";

const FONT = "JetBrains Mono, ui-monospace, monospace";
const TEAL = "#00ffc8";

// Lazy module-level decode/render context so re-opens don't leak AudioContexts.
let _editorCtx = null;
const getEditorCtx = () => {
  if (!_editorCtx) _editorCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _editorCtx;
};

// Compute mono peak summary for fast canvas redraw at any zoom level.
const computePeaks = (buffer, samples = 2048) => {
  if (!buffer) return new Float32Array(samples);
  const len = buffer.length;
  const nch = buffer.numberOfChannels;
  const peaks = new Float32Array(samples);
  const block = Math.max(1, Math.floor(len / samples));
  for (let i = 0; i < samples; i++) {
    const a = i * block, b = Math.min(len, a + block);
    let peak = 0;
    for (let c = 0; c < nch; c++) {
      const ch = buffer.getChannelData(c);
      for (let k = a; k < b; k++) {
        const v = Math.abs(ch[k]);
        if (v > peak) peak = v;
      }
    }
    peaks[i] = peak;
  }
  return peaks;
};

// Clone an AudioBuffer (Float32Array.slice on every channel).
const cloneBuffer = (ctx, src) => {
  const dst = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let c = 0; c < src.numberOfChannels; c++) {
    dst.copyToChannel(src.getChannelData(c).slice(), c);
  }
  return dst;
};

// Render an AudioBuffer to a 16-bit PCM WAV blob for re-export.
const bufferToWavBlob = (buffer) => {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const interleaved = new Float32Array(len * numCh);
  for (let c = 0; c < numCh; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) interleaved[i * numCh + c] = ch[i];
  }
  const bytesPerSample = 2;
  const dataSize = interleaved.length * bytesPerSample;
  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);
  const wr = (off, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i)); };
  wr(0, "RIFF"); dv.setUint32(4, 36 + dataSize, true); wr(8, "WAVE");
  wr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * numCh * bytesPerSample, true);
  dv.setUint16(32, numCh * bytesPerSample, true); dv.setUint16(34, 16, true);
  wr(36, "data"); dv.setUint32(40, dataSize, true);
  let off = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
};

const fmtSec = (s) => {
  if (!isFinite(s)) return "0:00.000";
  const m = Math.floor(s / 60);
  const sec = (s - m * 60);
  return `${m}:${sec.toFixed(3).padStart(6, "0")}`;
};
const fmtDb = (db) => `${db >= 0 ? "+" : ""}${db.toFixed(1)} dB`;

const AudioClipEditor = ({ region, audioBuffer, onSave, onCancel }) => {
  // Working buffer is a clone — original on the track stays untouched until Save.
  const [workBuffer, setWorkBuffer] = useState(null);
  const [peaks, setPeaks] = useState(null);
  // View: pan offset (samples) and zoom (samples per pixel).
  const [viewOffset, setViewOffset] = useState(0);
  const [samplesPerPx, setSamplesPerPx] = useState(0);
  // Selection: [startSample, endSample] or null.
  const [selection, setSelection] = useState(null);
  const [gainDb, setGainDb] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Ready");
  const [previewing, setPreviewing] = useState(false);
  const [, forceTick] = useState(0);

  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  // History stacks hold cloned buffers (memory cost: typical clip ~5 sec stereo @ 44.1k = ~440KB).
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  // Parallel structured op log for Part 6 persistence.
  const editsRef = useRef([]);
  const sourceNodeRef = useRef(null);
  const playStartCtxTimeRef = useRef(0);
  const playStartSampleRef = useRef(0);

  // ── Initialize working buffer from the region's source ──
  useEffect(() => {
    if (!audioBuffer) {
      setStatusMsg("⚠ No audio buffer — cannot edit");
      return;
    }
    const ctx = getEditorCtx();
    const cloned = cloneBuffer(ctx, audioBuffer);
    setWorkBuffer(cloned);
    setSamplesPerPx(Math.max(1, Math.floor(cloned.length / 1000))); // initial fit
    undoStackRef.current = [];
    redoStackRef.current = [];
    editsRef.current = [];
    setStatusMsg(`Loaded ${cloned.numberOfChannels}ch · ${cloned.sampleRate}Hz · ${fmtSec(cloned.duration)}`);
  }, [audioBuffer]);

  // Recompute peaks when buffer changes.
  useEffect(() => {
    if (!workBuffer) { setPeaks(null); return; }
    setPeaks(computePeaks(workBuffer, 4096));
  }, [workBuffer]);

  // Push snapshot onto undo stack before mutating.
  const pushUndo = useCallback((opMeta) => {
    if (!workBuffer) return;
    const ctx = getEditorCtx();
    undoStackRef.current.push(cloneBuffer(ctx, workBuffer));
    if (undoStackRef.current.length > 30) undoStackRef.current.shift();
    redoStackRef.current = [];
    if (opMeta) editsRef.current.push(opMeta);
  }, [workBuffer]);

  // ── Drawing ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !workBuffer || !peaks) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(1, Math.floor(rect.width));
    const H = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr; canvas.height = H * dpr;
    }
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#06060f";
    c.fillRect(0, 0, W, H);

    // Center axis
    c.strokeStyle = "rgba(255,255,255,0.08)";
    c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();

    const totalSamples = workBuffer.length;
    const spp = samplesPerPx || 1;
    const visStart = Math.max(0, viewOffset);
    const visEnd = Math.min(totalSamples, viewOffset + W * spp);
    // Map view → peaks index range.
    const peaksLen = peaks.length;
    const sToPeak = (s) => Math.floor((s / totalSamples) * peaksLen);
    const peakStart = sToPeak(visStart);
    const peakEnd = Math.min(peaksLen, sToPeak(visEnd) + 1);

    c.fillStyle = TEAL;
    c.globalAlpha = 0.85;
    const mid = H / 2;
    for (let x = 0; x < W; x++) {
      const sa = visStart + x * spp;
      const sb = sa + spp;
      const pa = sToPeak(sa);
      const pb = Math.max(pa + 1, sToPeak(sb));
      let peak = 0;
      for (let i = pa; i < pb && i < peaksLen; i++) if (peaks[i] > peak) peak = peaks[i];
      const h = peak * (mid - 4);
      c.fillRect(x, mid - h, 1, h * 2);
    }
    c.globalAlpha = 1;

    // Selection overlay
    if (selection) {
      const [s0, s1] = selection;
      const x0 = Math.max(0, (s0 - viewOffset) / spp);
      const x1 = Math.min(W, (s1 - viewOffset) / spp);
      if (x1 > x0) {
        c.fillStyle = "rgba(0,255,200,0.18)";
        c.fillRect(x0, 0, x1 - x0, H);
        c.strokeStyle = TEAL;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, H);
        c.moveTo(x1, 0); c.lineTo(x1, H); c.stroke();
      }
    }

    // Time ruler (top)
    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = `10px ${FONT}`;
    const secPerPx = spp / workBuffer.sampleRate;
    const tickStep = secPerPx > 0.1 ? 1 : secPerPx > 0.02 ? 0.25 : 0.05;
    const startSec = visStart / workBuffer.sampleRate;
    const endSec = visEnd / workBuffer.sampleRate;
    for (let t = Math.ceil(startSec / tickStep) * tickStep; t < endSec; t += tickStep) {
      const x = (t * workBuffer.sampleRate - viewOffset) / spp;
      c.fillRect(x, 0, 1, 4);
      c.fillText(fmtSec(t), x + 2, 12);
    }
  }, [workBuffer, peaks, viewOffset, samplesPerPx, selection]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Resize observer for responsive canvas.
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(() => drawCanvas());
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [drawCanvas]);

  // ── Mouse interaction (selection / pan / zoom) ──
  const pxToSample = useCallback((px) => Math.max(0, Math.min(workBuffer ? workBuffer.length : 0, viewOffset + px * (samplesPerPx || 1))), [viewOffset, samplesPerPx, workBuffer]);

  const handleCanvasMouseDown = useCallback((e) => {
    if (!workBuffer) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (e.shiftKey || e.button === 1) {
      // pan
      const startX = e.clientX;
      const startOffset = viewOffset;
      const onMove = (m) => {
        const dx = m.clientX - startX;
        const next = Math.max(0, Math.min(workBuffer.length - rect.width * samplesPerPx, startOffset - dx * samplesPerPx));
        setViewOffset(next);
      };
      const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
      window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
      return;
    }
    // select
    const startSample = pxToSample(x);
    const onMove = (m) => {
      const x2 = m.clientX - rect.left;
      const endSample = pxToSample(x2);
      const lo = Math.min(startSample, endSample);
      const hi = Math.max(startSample, endSample);
      setSelection(hi - lo > 1 ? [lo, hi] : null);
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  }, [workBuffer, pxToSample, viewOffset, samplesPerPx]);

  const handleWheel = useCallback((e) => {
    if (!workBuffer) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const focusPx = e.clientX - rect.left;
    const focusSample = viewOffset + focusPx * samplesPerPx;
    const zoomFactor = e.deltaY > 0 ? 1.25 : 0.8;
    const minSpp = 1;
    const maxSpp = Math.max(1, Math.floor(workBuffer.length / Math.max(80, rect.width)));
    const nextSpp = Math.max(minSpp, Math.min(maxSpp, samplesPerPx * zoomFactor));
    const nextOffset = Math.max(0, Math.min(workBuffer.length - rect.width * nextSpp, focusSample - focusPx * nextSpp));
    setSamplesPerPx(nextSpp);
    setViewOffset(nextOffset);
  }, [workBuffer, viewOffset, samplesPerPx]);

  // ── Operations ──
  const opTrim = useCallback(() => {
    if (!workBuffer || !selection) return;
    const [s0, s1] = selection;
    if (s1 - s0 < 2) return;
    const ctx = getEditorCtx();
    pushUndo({ type: "trim", startSec: s0 / workBuffer.sampleRate, endSec: s1 / workBuffer.sampleRate });
    const out = ctx.createBuffer(workBuffer.numberOfChannels, s1 - s0, workBuffer.sampleRate);
    for (let c = 0; c < workBuffer.numberOfChannels; c++) {
      out.copyToChannel(workBuffer.getChannelData(c).slice(s0, s1), c);
    }
    setWorkBuffer(out);
    setSelection(null);
    setViewOffset(0);
    setStatusMsg(`Trimmed to ${fmtSec(out.duration)}`);
  }, [workBuffer, selection, pushUndo]);

  const opFade = useCallback((side) => {
    if (!workBuffer) return;
    const sr = workBuffer.sampleRate;
    // Use selection length if present, else 0.5s default at the chosen edge.
    let s0, s1;
    if (selection) { [s0, s1] = selection; }
    else if (side === "in") { s0 = 0; s1 = Math.min(workBuffer.length, Math.floor(sr * 0.5)); }
    else { s1 = workBuffer.length; s0 = Math.max(0, s1 - Math.floor(sr * 0.5)); }
    const len = s1 - s0;
    if (len < 2) return;
    pushUndo({ type: "fade", side, durationSec: len / sr, startSec: s0 / sr });
    const ctx = getEditorCtx();
    const out = cloneBuffer(ctx, workBuffer);
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const g = side === "in" ? t : 1 - t;
        ch[s0 + i] *= g;
      }
    }
    setWorkBuffer(out);
    setStatusMsg(`Fade ${side} · ${(len / sr).toFixed(3)}s`);
  }, [workBuffer, selection, pushUndo]);

  const opGain = useCallback(() => {
    if (!workBuffer) return;
    if (Math.abs(gainDb) < 0.01) return;
    pushUndo({ type: "gain", dB: gainDb });
    const ctx = getEditorCtx();
    const out = cloneBuffer(ctx, workBuffer);
    const lin = Math.pow(10, gainDb / 20);
    const range = selection || [0, out.length];
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      for (let i = range[0]; i < range[1]; i++) ch[i] *= lin;
    }
    setWorkBuffer(out);
    setStatusMsg(`Gain ${fmtDb(gainDb)}${selection ? " (selection)" : ""}`);
  }, [workBuffer, gainDb, selection, pushUndo]);

  const opNormalize = useCallback(() => {
    if (!workBuffer) return;
    const range = selection || [0, workBuffer.length];
    let peak = 0;
    for (let c = 0; c < workBuffer.numberOfChannels; c++) {
      const ch = workBuffer.getChannelData(c);
      for (let i = range[0]; i < range[1]; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; }
    }
    if (peak < 1e-6) { setStatusMsg("⚠ Silent — nothing to normalize"); return; }
    const targetPeak = Math.pow(10, -0.1 / 20); // -0.1 dBFS
    const scale = targetPeak / peak;
    pushUndo({ type: "normalize", peakDb: -0.1, range: selection ? [range[0] / workBuffer.sampleRate, range[1] / workBuffer.sampleRate] : null });
    const ctx = getEditorCtx();
    const out = cloneBuffer(ctx, workBuffer);
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      for (let i = range[0]; i < range[1]; i++) ch[i] *= scale;
    }
    setWorkBuffer(out);
    setStatusMsg(`Normalized · scale × ${scale.toFixed(2)}`);
  }, [workBuffer, selection, pushUndo]);

  const opReverse = useCallback(() => {
    if (!workBuffer) return;
    pushUndo({ type: "reverse", range: selection ? [selection[0] / workBuffer.sampleRate, selection[1] / workBuffer.sampleRate] : null });
    const ctx = getEditorCtx();
    const out = cloneBuffer(ctx, workBuffer);
    const range = selection || [0, out.length];
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      const slice = ch.slice(range[0], range[1]);
      slice.reverse();
      ch.set(slice, range[0]);
    }
    setWorkBuffer(out);
    setStatusMsg(selection ? "Reversed selection" : "Reversed clip");
  }, [workBuffer, selection, pushUndo]);

  const opSilence = useCallback(() => {
    if (!workBuffer || !selection) return;
    pushUndo({ type: "silence", startSec: selection[0] / workBuffer.sampleRate, endSec: selection[1] / workBuffer.sampleRate });
    const ctx = getEditorCtx();
    const out = cloneBuffer(ctx, workBuffer);
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      ch.fill(0, selection[0], selection[1]);
    }
    setWorkBuffer(out);
    setStatusMsg(`Silenced ${fmtSec((selection[1] - selection[0]) / workBuffer.sampleRate)}`);
  }, [workBuffer, selection, pushUndo]);

  // ── Undo / Redo ──
  const undo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    const ctx = getEditorCtx();
    redoStackRef.current.push(cloneBuffer(ctx, workBuffer));
    const prev = undoStackRef.current.pop();
    editsRef.current.pop();
    setWorkBuffer(prev);
    setStatusMsg("Undo");
    forceTick(t => t + 1);
  }, [workBuffer]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    const ctx = getEditorCtx();
    undoStackRef.current.push(cloneBuffer(ctx, workBuffer));
    const next = redoStackRef.current.pop();
    setWorkBuffer(next);
    setStatusMsg("Redo");
    forceTick(t => t + 1);
  }, [workBuffer]);

  // ── Preview ──
  const stopPreview = useCallback(() => {
    if (sourceNodeRef.current) { try { sourceNodeRef.current.stop(); } catch (_) {} }
    sourceNodeRef.current = null;
    setPreviewing(false);
  }, []);

  const playPreview = useCallback(() => {
    if (!workBuffer) return;
    stopPreview();
    const ctx = getEditorCtx();
    const src = ctx.createBufferSource();
    src.buffer = workBuffer;
    src.connect(ctx.destination);
    const range = selection;
    const offsetSec = range ? range[0] / workBuffer.sampleRate : 0;
    const durSec = range ? (range[1] - range[0]) / workBuffer.sampleRate : workBuffer.duration - offsetSec;
    src.start(0, offsetSec, durSec);
    src.onended = () => { sourceNodeRef.current = null; setPreviewing(false); };
    sourceNodeRef.current = src;
    playStartCtxTimeRef.current = ctx.currentTime;
    playStartSampleRef.current = range ? range[0] : 0;
    setPreviewing(true);
  }, [workBuffer, selection, stopPreview]);

  // ── Save / Cancel ──
  const handleSave = useCallback(() => {
    if (!workBuffer) return;
    stopPreview();
    const blob = bufferToWavBlob(workBuffer);
    const url = URL.createObjectURL(blob);
    onSave && onSave(workBuffer, url, [...editsRef.current]);
  }, [workBuffer, onSave, stopPreview]);

  const handleCancel = useCallback(() => {
    stopPreview();
    onCancel && onCancel();
  }, [onCancel, stopPreview]);

  // ── Keyboard shortcuts: Esc/Ctrl+Z/Ctrl+Y ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { handleCancel(); return; }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((meta && e.key.toLowerCase() === "y") || (meta && e.shiftKey && e.key.toLowerCase() === "z")) { e.preventDefault(); redo(); }
      else if (e.key === " " && !e.target.matches("input,textarea,select")) {
        e.preventDefault();
        previewing ? stopPreview() : playPreview();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCancel, undo, redo, previewing, playPreview, stopPreview]);

  const selDur = selection && workBuffer ? (selection[1] - selection[0]) / workBuffer.sampleRate : 0;
  const selStart = selection && workBuffer ? selection[0] / workBuffer.sampleRate : 0;
  const selEnd = selection && workBuffer ? selection[1] / workBuffer.sampleRate : 0;
  const totalDur = workBuffer ? workBuffer.duration : 0;

  return (
    <div className="ace-overlay" onMouseDown={(e) => { if (e.target.classList.contains("ace-overlay")) handleCancel(); }}>
      <div className="ace-modal" role="dialog" aria-label="Audio Clip Editor">
        <header className="ace-header">
          <span className="ace-title">CLIP EDITOR <span className="ace-region-name">— {region?.name || "Region"}</span></span>
          <span className="ace-status">{statusMsg}</span>
          <button className="ace-btn ace-btn-icon" onClick={handleCancel} title="Cancel (Esc)">✕</button>
        </header>

        <div ref={wrapperRef} className="ace-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="ace-canvas"
            onMouseDown={handleCanvasMouseDown}
            onWheel={handleWheel}
          />
        </div>

        <div className="ace-readout">
          <span><strong>Total:</strong> {fmtSec(totalDur)}</span>
          <span><strong>Sel:</strong> {selection ? `${fmtSec(selStart)} → ${fmtSec(selEnd)} (${fmtSec(selDur)})` : "—"}</span>
          <span><strong>Zoom:</strong> {samplesPerPx ? `${samplesPerPx.toFixed(0)} smpl/px` : "—"}</span>
          <span className="ace-hint">drag = select · shift+drag = pan · wheel = zoom · space = preview</span>
        </div>

        <div className="ace-toolbar">
          <div className="ace-group">
            <button className="ace-btn" onClick={previewing ? stopPreview : playPreview} disabled={!workBuffer}>
              {previewing ? "■ Stop" : "▶ Preview"}
            </button>
            <button className="ace-btn" onClick={() => setSelection(null)} disabled={!selection}>Clear sel</button>
            <button className="ace-btn" onClick={() => { if (workBuffer) setSelection([0, workBuffer.length]); }} disabled={!workBuffer}>Select all</button>
          </div>

          <div className="ace-group">
            <button className="ace-btn ace-btn-primary" onClick={opTrim} disabled={!selection} title="Trim to selection">Trim</button>
            <button className="ace-btn" onClick={opSilence} disabled={!selection} title="Silence selection">Silence</button>
            <button className="ace-btn" onClick={opReverse} disabled={!workBuffer} title="Reverse (clip or selection)">Reverse</button>
          </div>

          <div className="ace-group">
            <button className="ace-btn" onClick={() => opFade("in")} disabled={!workBuffer} title="Fade in (selection or 0.5s from start)">Fade in</button>
            <button className="ace-btn" onClick={() => opFade("out")} disabled={!workBuffer} title="Fade out (selection or 0.5s from end)">Fade out</button>
          </div>

          <div className="ace-group ace-gain-group">
            <label className="ace-label">Gain</label>
            <input
              type="range"
              min={-24} max={12} step={0.1}
              value={gainDb}
              onChange={(e) => setGainDb(Number(e.target.value))}
              className="ace-slider"
              aria-label="Gain dB"
            />
            <span className="ace-gain-readout">{fmtDb(gainDb)}</span>
            <button className="ace-btn" onClick={opGain} disabled={!workBuffer || Math.abs(gainDb) < 0.01}>Apply</button>
            <button className="ace-btn" onClick={opNormalize} disabled={!workBuffer} title="Normalize to -0.1 dBFS peak">Normalize</button>
          </div>

          <div className="ace-group ace-spacer"/>

          <div className="ace-group">
            <button className="ace-btn" onClick={undo} disabled={!undoStackRef.current.length} title="Undo (Ctrl+Z)">↶ Undo</button>
            <button className="ace-btn" onClick={redo} disabled={!redoStackRef.current.length} title="Redo (Ctrl+Y)">↷ Redo</button>
          </div>

          <div className="ace-group ace-actions">
            <button className="ace-btn ace-btn-cancel" onClick={handleCancel}>Cancel</button>
            <button className="ace-btn ace-btn-save" onClick={handleSave} disabled={!workBuffer}>Save Edits</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioClipEditor;
