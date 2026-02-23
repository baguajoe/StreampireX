// =============================================================================
// VocalAlignment.js — Vocal Timing Alignment for StreamPireX DAW
// =============================================================================
// Uses PhaseVocoder timeStretch for artifact-free segment stretching.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { alignTiming, detectPitch } from './PhaseVocoder';

const VocalAlignment = ({ audioContext, audioBuffer, referenceBuffer, bpm = 120, onProcessed, isEmbedded = false }) => {
  const [onsets, setOnsets] = useState([]);
  const [refOnsets, setRefOnsets] = useState([]);
  const [alignedOnsets, setAlignedOnsets] = useState([]);
  const [mode, setMode] = useState('grid');
  const [gridResolution, setGridResolution] = useState(4);
  const [strength, setStrength] = useState(75);
  const [sensitivity, setSensitivity] = useState(50);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const ctxRef = useRef(null);
  const canvasRef = useRef(null);
  const sourceRef = useRef(null);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current || ctxRef.current.state === 'closed')
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext]);

  const beatDuration = 60 / bpm;
  const gridSize = beatDuration / (gridResolution / 4);

  // ── Onset detection via spectral flux ──
  const detectOnsets = useCallback((buffer) => {
    if (!buffer) return [];
    const sr = buffer.sampleRate; const data = buffer.getChannelData(0);
    const windowSize = 1024; const hopSize = 256;
    let prevEnergy = 0; const flux = [];
    for (let i = 0; i + windowSize < data.length; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) energy += data[i + j] * data[i + j];
      energy /= windowSize;
      flux.push({ time: i / sr, value: Math.max(0, energy - prevEnergy) });
      prevEnergy = energy;
    }
    const threshold = sensitivity / 100;
    const maxFlux = Math.max(...flux.map(f => f.value));
    const adaptiveThresh = maxFlux * threshold * 0.3;
    const minGap = 0.05; const results = []; let lastOnset = -1;
    for (let i = 1; i < flux.length - 1; i++) {
      if (flux[i].value > flux[i-1].value && flux[i].value > flux[i+1].value && flux[i].value > adaptiveThresh) {
        if (flux[i].time - lastOnset > minGap) {
          results.push({ time: flux[i].time, strength: flux[i].value / maxFlux });
          lastOnset = flux[i].time;
        }
      }
    }
    return results;
  }, [sensitivity]);

  // ── Analyze ──
  const analyze = useCallback(() => {
    setIsAnalyzing(true);
    const detected = detectOnsets(audioBuffer);
    setOnsets(detected);
    let refDet = [];
    if (referenceBuffer && mode === 'reference') { refDet = detectOnsets(referenceBuffer); setRefOnsets(refDet); }

    const aligned = detected.map(onset => {
      let targetTime = onset.time;
      if (mode === 'grid') {
        const nearest = Math.round(onset.time / gridSize) * gridSize;
        targetTime = onset.time + (nearest - onset.time) * (strength / 100);
      } else if (mode === 'reference' && refDet.length > 0) {
        let nearestRef = refDet[0].time, minDist = Math.abs(onset.time - nearestRef);
        for (const ro of refDet) { const d = Math.abs(onset.time - ro.time); if (d < minDist) { minDist = d; nearestRef = ro.time; } }
        if (minDist < beatDuration) targetTime = onset.time + (nearestRef - onset.time) * (strength / 100);
      }
      return { original: onset.time, target: targetTime, strength: onset.strength };
    });

    setAlignedOnsets(aligned); setIsAnalyzing(false);
    drawAlignment(detected, aligned);
  }, [audioBuffer, referenceBuffer, mode, gridSize, strength, beatDuration, detectOnsets]);

  // ── Process using phase vocoder time stretching ──
  const processAlignment = useCallback(async () => {
    if (!audioBuffer || alignedOnsets.length === 0) return;
    setIsProcessing(true);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const output = ctx.createBuffer(nc, len, sr);

    // Build alignment map
    const alignments = alignedOnsets.map(a => ({ originalTime: a.original, targetTime: a.target }));

    for (let ch = 0; ch < nc; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const aligned = alignTiming(src, sr, alignments);
      const out = output.getChannelData(ch);
      for (let i = 0; i < len && i < aligned.length; i++) out[i] = aligned[i];
    }

    setProcessedBuffer(output); setIsProcessing(false);
    if (onProcessed) onProcessed(output);
  }, [audioBuffer, alignedOnsets, getCtx, onProcessed]);

  // ── Draw ──
  const drawAlignment = useCallback((detectedOnsets, aligned) => {
    const cv = canvasRef.current;
    if (!cv || !audioBuffer) return;
    const c = cv.getContext('2d'); const w = cv.width, h = cv.height;
    const dur = audioBuffer.duration; const data = audioBuffer.getChannelData(0);
    c.clearRect(0, 0, w, h); c.fillStyle = '#060c12'; c.fillRect(0, 0, w, h);

    // Beat grid
    const totalBeats = Math.ceil(dur / gridSize);
    for (let b = 0; b <= totalBeats; b++) {
      const x = (b * gridSize / dur) * w;
      const isDown = (b * gridResolution / 4) % 4 === 0;
      c.strokeStyle = isDown ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
      c.lineWidth = 1; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }

    // Waveform (top half)
    const step = Math.floor(data.length / w); const halfH = h / 2;
    c.beginPath(); c.strokeStyle = 'rgba(200,214,229,0.35)'; c.lineWidth = 1;
    for (let px = 0; px < w; px++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) { const d = data[px * step + j] || 0; if (d < min) min = d; if (d > max) max = d; }
      c.moveTo(px, halfH * 0.1 + ((1 + min) / 2) * halfH * 0.8); c.lineTo(px, halfH * 0.1 + ((1 + max) / 2) * halfH * 0.8);
    }
    c.stroke();

    // Alignment arrows
    if (aligned && aligned.length > 0) {
      aligned.forEach(a => {
        const origX = (a.original / dur) * w; const targX = (a.target / dur) * w;
        c.strokeStyle = 'rgba(255,102,0,0.5)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(origX, 0); c.lineTo(origX, halfH); c.stroke();
        c.strokeStyle = '#00ffc8'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(targX, halfH); c.lineTo(targX, h); c.stroke();
        if (Math.abs(origX - targX) > 2) {
          c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(origX, halfH - 5); c.lineTo(targX, halfH + 5); c.stroke();
          const dir = targX > origX ? 1 : -1; c.fillStyle = 'rgba(255,255,255,0.3)';
          c.beginPath(); c.moveTo(targX, halfH + 5); c.lineTo(targX - dir * 4, halfH + 1); c.lineTo(targX - dir * 4, halfH + 9); c.fill();
        }
        c.fillStyle = `rgba(${a.strength > 0.5 ? '0,255,200' : '200,214,229'},0.6)`;
        c.beginPath(); c.arc(origX, halfH, 3, 0, Math.PI * 2); c.fill();
      });
    }
    c.fillStyle = 'rgba(255,255,255,0.15)'; c.font = '8px monospace';
    c.fillText('ORIGINAL', 4, 10); c.fillText('ALIGNED', 4, halfH + 10);
  }, [audioBuffer, gridSize, gridResolution]);

  useEffect(() => { if (onsets.length > 0) drawAlignment(onsets, alignedOnsets); }, [onsets, alignedOnsets, drawAlignment]);

  // ── Preview ──
  const preview = useCallback((useProcesed) => {
    const buf = useProcesed ? processedBuffer : audioBuffer; if (!buf) return;
    const ctx = getCtx();
    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start();
    sourceRef.current = s; setPreviewPlaying(true); s.onended = () => setPreviewPlaying(false);
  }, [audioBuffer, processedBuffer, getCtx]);
  const stopPreview = useCallback(() => { if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){} setPreviewPlaying(false); }, []);

  useEffect(() => () => { if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){} }, []);

  return (
    <div className="vocal-align">
      <div className="va-header">
        <span className="va-logo">⏱</span>
        <span className="va-title">VOCAL ALIGNMENT</span>
        <span className="va-bpm">{bpm} BPM — Phase Vocoder Engine</span>
      </div>
      <div className="va-body">
        <div className="va-controls">
          <div className="va-section">
            <div className="va-section-label">Mode</div>
            <div className="va-mode-row">
              <button className={`va-mode-btn ${mode === 'grid' ? 'active' : ''}`} onClick={() => setMode('grid')}>
                <span>📐 Grid</span><span className="va-mode-desc">Snap to beat grid</span>
              </button>
              <button className={`va-mode-btn ${mode === 'reference' ? 'active' : ''}`} onClick={() => setMode('reference')} disabled={!referenceBuffer}>
                <span>🎯 Reference</span><span className="va-mode-desc">{referenceBuffer ? 'Align to ref track' : 'No ref loaded'}</span>
              </button>
            </div>
          </div>
          {mode === 'grid' && (
            <div className="va-section">
              <div className="va-section-label">Grid Resolution</div>
              <div className="va-grid-btns">
                {[{v:1,l:'1/16'},{v:2,l:'1/8'},{v:4,l:'1/4'},{v:8,l:'1/2'},{v:16,l:'1 bar'}].map(g => (
                  <button key={g.v} className={`va-grid-btn ${gridResolution === g.v ? 'active' : ''}`} onClick={() => setGridResolution(g.v)}>{g.l}</button>
                ))}
              </div>
            </div>
          )}
          <div className="va-section">
            <div className="va-section-label">Settings</div>
            <div className="va-param"><label>Strength</label><input type="range" min={0} max={100} value={strength} onChange={e => setStrength(+e.target.value)} className="va-slider" /><span>{strength}%</span></div>
            <div className="va-param"><label>Sensitivity</label><input type="range" min={10} max={100} value={sensitivity} onChange={e => setSensitivity(+e.target.value)} className="va-slider" /><span>{sensitivity}%</span></div>
          </div>
          <div className="va-actions">
            <button className="va-btn va-btn-analyze" onClick={analyze} disabled={!audioBuffer || isAnalyzing}>{isAnalyzing ? '⏳ Analyzing...' : `📊 Detect Onsets (${onsets.length})`}</button>
            <button className="va-btn va-btn-process" onClick={processAlignment} disabled={alignedOnsets.length === 0 || isProcessing}>{isProcessing ? '⏳ Aligning...' : '⏱ Align Timing'}</button>
            <button className="va-btn" onClick={() => preview(false)} disabled={!audioBuffer || previewPlaying}>▶ Original</button>
            <button className="va-btn" onClick={() => preview(true)} disabled={!processedBuffer || previewPlaying}>▶ Aligned</button>
            {previewPlaying && <button className="va-btn" onClick={stopPreview}>⏹ Stop</button>}
          </div>
        </div>
        <div className="va-display">
          <div className="va-display-header">
            <span>Timing Analysis</span>
            <div className="va-legend">
              <span className="va-legend-item"><span className="va-dot" style={{background:'#FF6600'}}></span> Original</span>
              <span className="va-legend-item"><span className="va-dot" style={{background:'#00ffc8'}}></span> Aligned</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="va-canvas" width={800} height={250} />
          {!audioBuffer && <div className="va-empty-overlay">No audio loaded</div>}
          {onsets.length > 0 && (
            <div className="va-onset-info">
              {onsets.length} onsets detected — max shift: {alignedOnsets.length > 0 ? `${(Math.max(...alignedOnsets.map(a => Math.abs(a.target - a.original))) * 1000).toFixed(0)}ms` : '—'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocalAlignment;