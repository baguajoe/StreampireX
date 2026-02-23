// =============================================================================
// BreathRemover.js — Breath Detection & Removal for StreamPireX DAW
// =============================================================================
// Analyzes audio to find breaths (short broadband noise bursts between phrases).
// Options: Remove (silence), Reduce (lower volume), or Keep with markers.
// Displays waveform with breath regions highlighted, click to toggle.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const BreathRemover = ({
  audioContext,
  audioBuffer,         // input audio to process
  onProcessed,         // (processedBuffer) => void
  isEmbedded = false,
}) => {
  const [breaths, setBreaths] = useState([]);         // [{ startSec, endSec, confidence, enabled }]
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState('reduce');          // remove | reduce | keep
  const [reduction, setReduction] = useState(-24);     // dB reduction in 'reduce' mode
  const [sensitivity, setSensitivity] = useState(60);  // 0-100 detection sensitivity
  const [minBreathMs, setMinBreathMs] = useState(100); // minimum breath duration ms
  const [maxBreathMs, setMaxBreathMs] = useState(1500);// max breath duration ms
  const [fadeMs, setFadeMs] = useState(5);             // crossfade at edges ms
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState(null);

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

  // ── Detect breaths ──
  const detectBreaths = useCallback(async () => {
    if (!audioBuffer) return;
    setIsAnalyzing(true);
    setBreaths([]);

    const sr = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const windowSize = 1024;
    const hopSize = 256;
    const frames = [];

    // Step 1: Compute per-frame features
    for (let i = 0; i + windowSize < data.length; i += hopSize) {
      const chunk = data.slice(i, i + windowSize);

      // RMS energy
      let rms = 0;
      for (let j = 0; j < chunk.length; j++) rms += chunk[j] * chunk[j];
      rms = Math.sqrt(rms / chunk.length);

      // Zero-crossing rate (breaths have high ZCR)
      let zcr = 0;
      for (let j = 1; j < chunk.length; j++) {
        if ((chunk[j] >= 0 && chunk[j-1] < 0) || (chunk[j] < 0 && chunk[j-1] >= 0)) zcr++;
      }
      zcr /= chunk.length;

      // Spectral centroid (breaths = higher centroid, more noise-like)
      // Simple approximation using energy in upper vs lower half
      let loEnergy = 0, hiEnergy = 0;
      const mid = Math.floor(chunk.length / 2);
      for (let j = 0; j < mid; j++) loEnergy += chunk[j] * chunk[j];
      for (let j = mid; j < chunk.length; j++) hiEnergy += chunk[j] * chunk[j];
      const spectralBalance = hiEnergy / (loEnergy + hiEnergy + 0.0001);

      frames.push({
        time: i / sr,
        rms,
        zcr,
        spectralBalance,
        rmsDb: rms > 0 ? 20 * Math.log10(rms) : -100,
      });
    }

    // Step 2: Compute overall stats
    const rmsVals = frames.map(f => f.rmsDb).filter(v => v > -60);
    const avgRms = rmsVals.length > 0 ? rmsVals.reduce((a,b) => a + b, 0) / rmsVals.length : -30;
    const zcrVals = frames.map(f => f.zcr);
    const avgZcr = zcrVals.reduce((a,b) => a + b, 0) / zcrVals.length;

    // Step 3: Identify breath candidates
    // Breaths are: lower energy than voice, higher ZCR than silence, higher spectral balance
    const sensThresh = 1.0 - (sensitivity / 100) * 0.8; // lower = more sensitive
    const energyThresh = avgRms - 6 - (sensitivity / 100) * 12;
    const zcrThresh = avgZcr * (0.8 + sensThresh * 0.5);
    const specThresh = 0.3 + sensThresh * 0.2;

    let breathRegions = [];
    let inBreath = false;
    let breathStart = 0;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const isBreath = f.rmsDb > -55 && f.rmsDb < energyThresh && f.zcr > zcrThresh && f.spectralBalance > specThresh;

      if (isBreath && !inBreath) {
        inBreath = true;
        breathStart = f.time;
      } else if (!isBreath && inBreath) {
        inBreath = false;
        const duration = (f.time - breathStart) * 1000;
        if (duration >= minBreathMs && duration <= maxBreathMs) {
          breathRegions.push({
            startSec: breathStart,
            endSec: f.time,
            confidence: Math.min(1, (f.time - breathStart) / 0.3),
            enabled: true,
          });
        }
      }
    }

    setBreaths(breathRegions);
    setIsAnalyzing(false);
    drawWaveform(breathRegions);
  }, [audioBuffer, sensitivity, minBreathMs, maxBreathMs]);

  // ── Process: remove or reduce breaths ──
  const processBreaths = useCallback(async () => {
    if (!audioBuffer || breaths.length === 0) return;
    setIsProcessing(true);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const output = ctx.createBuffer(nc, len, sr);
    const fadeSamps = Math.floor((fadeMs / 1000) * sr);

    for (let ch = 0; ch < nc; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const out = output.getChannelData(ch);

      // Copy source
      for (let i = 0; i < len; i++) out[i] = src[i];

      // Process each enabled breath
      breaths.filter(b => b.enabled).forEach(b => {
        const startSamp = Math.floor(b.startSec * sr);
        const endSamp = Math.floor(b.endSec * sr);

        if (mode === 'remove') {
          // Silence the breath region with crossfade
          for (let i = startSamp; i < endSamp && i < len; i++) {
            let fade = 1;
            if (i - startSamp < fadeSamps) fade = (i - startSamp) / fadeSamps;
            if (endSamp - i < fadeSamps) fade = Math.min(fade, (endSamp - i) / fadeSamps);
            out[i] = src[i] * (1 - fade); // fade to silence
          }
        } else if (mode === 'reduce') {
          // Reduce volume with crossfade
          const gain = Math.pow(10, reduction / 20);
          for (let i = startSamp; i < endSamp && i < len; i++) {
            let fade = 1;
            if (i - startSamp < fadeSamps) fade = (i - startSamp) / fadeSamps;
            if (endSamp - i < fadeSamps) fade = Math.min(fade, (endSamp - i) / fadeSamps);
            const g = 1 - fade * (1 - gain);
            out[i] = src[i] * g;
          }
        }
        // mode === 'keep' does nothing
      });
    }

    setProcessedBuffer(output);
    setIsProcessing(false);
    if (onProcessed) onProcessed(output);
  }, [audioBuffer, breaths, mode, reduction, fadeMs, getCtx, onProcessed]);

  // ── Draw waveform with breath regions ──
  const drawWaveform = useCallback((breathList) => {
    const cv = canvasRef.current;
    if (!cv || !audioBuffer) return;
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = audioBuffer.getChannelData(0);

    c.clearRect(0, 0, w, h);
    c.fillStyle = '#060c12';
    c.fillRect(0, 0, w, h);

    // Breath regions
    const bList = breathList || breaths;
    bList.forEach(b => {
      const x1 = (b.startSec / audioBuffer.duration) * w;
      const x2 = (b.endSec / audioBuffer.duration) * w;
      c.fillStyle = b.enabled ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.03)';
      c.fillRect(x1, 0, x2 - x1, h);
      if (b.enabled) {
        c.strokeStyle = 'rgba(255,59,48,0.4)';
        c.lineWidth = 1;
        c.strokeRect(x1, 0, x2 - x1, h);
      }
    });

    // Waveform
    const step = Math.floor(data.length / w);
    c.beginPath();
    c.strokeStyle = '#c8d6e5';
    c.lineWidth = 1;
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j] || 0;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      c.moveTo(i, ((1 + min) / 2) * h);
      c.lineTo(i, ((1 + max) / 2) * h);
    }
    c.stroke();

    // Breath labels
    bList.forEach((b, i) => {
      if (!b.enabled) return;
      const x = ((b.startSec + b.endSec) / 2 / audioBuffer.duration) * w;
      c.fillStyle = 'rgba(255,59,48,0.8)';
      c.font = '8px monospace';
      c.textAlign = 'center';
      c.fillText(`B${i+1}`, x, 10);
    });
    c.textAlign = 'left';
  }, [audioBuffer, breaths]);

  // Redraw on state change
  useEffect(() => {
    drawWaveform();
  }, [breaths, drawWaveform]);

  // ── Click on canvas to toggle breath ──
  const handleCanvasClick = useCallback((e) => {
    if (!audioBuffer || breaths.length === 0) return;
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sec = (x / cv.width) * audioBuffer.duration;

    setBreaths(prev => prev.map(b => {
      if (sec >= b.startSec && sec <= b.endSec) {
        return { ...b, enabled: !b.enabled };
      }
      return b;
    }));
  }, [audioBuffer, breaths]);

  // ── Preview ──
  const preview = useCallback((useProcessed) => {
    const buf = useProcessed ? processedBuffer : audioBuffer;
    if (!buf) return;
    const ctx = getCtx();
    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    sourceRef.current = src;
    setPreviewPlaying(true);
    src.onended = () => setPreviewPlaying(false);
  }, [audioBuffer, processedBuffer, getCtx]);

  const stopPreview = useCallback(() => {
    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
    setPreviewPlaying(false);
  }, []);

  const enabledCount = breaths.filter(b => b.enabled).length;

  return (
    <div className="breath-remover">
      <div className="br-header">
        <span className="br-logo">💨</span>
        <span className="br-title">BREATH REMOVER</span>
        <span className="br-count">
          {breaths.length > 0 ? `${enabledCount}/${breaths.length} breaths selected` : 'No breaths detected'}
        </span>
      </div>

      <div className="br-body">
        <div className="br-controls">
          <div className="br-section">
            <div className="br-section-label">Detection</div>
            <div className="br-param">
              <label>Sensitivity</label>
              <input type="range" min={10} max={100} value={sensitivity}
                onChange={e => setSensitivity(+e.target.value)} className="br-slider" />
              <span>{sensitivity}%</span>
            </div>
            <div className="br-param">
              <label>Min Length</label>
              <input type="range" min={30} max={500} value={minBreathMs}
                onChange={e => setMinBreathMs(+e.target.value)} className="br-slider" />
              <span>{minBreathMs}ms</span>
            </div>
            <div className="br-param">
              <label>Max Length</label>
              <input type="range" min={500} max={3000} value={maxBreathMs}
                onChange={e => setMaxBreathMs(+e.target.value)} className="br-slider" />
              <span>{maxBreathMs}ms</span>
            </div>
            <button className="br-btn br-btn-detect" onClick={detectBreaths}
              disabled={!audioBuffer || isAnalyzing}>
              {isAnalyzing ? '⏳ Detecting...' : '🔍 Detect Breaths'}
            </button>
          </div>

          <div className="br-section">
            <div className="br-section-label">Processing</div>
            <div className="br-mode-row">
              {[
                { val: 'remove', label: '🚫 Remove', desc: 'Silence breaths' },
                { val: 'reduce', label: '🔉 Reduce', desc: 'Lower volume' },
                { val: 'keep', label: '✓ Keep', desc: 'Mark only' },
              ].map(m => (
                <button key={m.val} className={`br-mode-btn ${mode === m.val ? 'active' : ''}`}
                  onClick={() => setMode(m.val)}>
                  <span>{m.label}</span>
                  <span className="br-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
            {mode === 'reduce' && (
              <div className="br-param">
                <label>Reduction</label>
                <input type="range" min={-48} max={-3} value={reduction}
                  onChange={e => setReduction(+e.target.value)} className="br-slider" />
                <span>{reduction}dB</span>
              </div>
            )}
            <div className="br-param">
              <label>Crossfade</label>
              <input type="range" min={1} max={50} value={fadeMs}
                onChange={e => setFadeMs(+e.target.value)} className="br-slider" />
              <span>{fadeMs}ms</span>
            </div>
          </div>

          <div className="br-actions">
            <button className="br-btn br-btn-process" onClick={processBreaths}
              disabled={enabledCount === 0 || isProcessing || mode === 'keep'}>
              {isProcessing ? '⏳ Processing...' : `💨 Process ${enabledCount} Breaths`}
            </button>
            <button className="br-btn" onClick={() => preview(false)} disabled={!audioBuffer || previewPlaying}>
              ▶ Original
            </button>
            <button className="br-btn" onClick={() => preview(true)} disabled={!processedBuffer || previewPlaying}>
              ▶ Processed
            </button>
            {previewPlaying && (
              <button className="br-btn" onClick={stopPreview}>⏹ Stop</button>
            )}
          </div>

          <div className="br-section">
            <div className="br-section-label">Batch</div>
            <button className="br-btn" onClick={() => setBreaths(prev => prev.map(b => ({...b, enabled: true})))}>
              Select All
            </button>
            <button className="br-btn" onClick={() => setBreaths(prev => prev.map(b => ({...b, enabled: false})))}>
              Deselect All
            </button>
          </div>
        </div>

        <div className="br-display">
          <div className="br-display-header">
            <span>Waveform — click red regions to toggle</span>
          </div>
          <canvas ref={canvasRef} className="br-canvas" width={800} height={160}
            onClick={handleCanvasClick} />
          {breaths.length === 0 && audioBuffer && (
            <div className="br-empty-overlay">Click "Detect Breaths" to analyze</div>
          )}
          {!audioBuffer && (
            <div className="br-empty-overlay">No audio loaded — record or select a track first</div>
          )}

          {/* Breath list */}
          {breaths.length > 0 && (
            <div className="br-breath-list">
              {breaths.map((b, i) => (
                <button key={i} className={`br-breath-tag ${b.enabled ? 'active' : ''}`}
                  onClick={() => setBreaths(prev => prev.map((x, j) => j === i ? {...x, enabled: !x.enabled} : x))}>
                  B{i+1} ({((b.endSec - b.startSec) * 1000).toFixed(0)}ms)
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BreathRemover;