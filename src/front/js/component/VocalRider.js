// =============================================================================
// VocalRider.js — Auto-Level / Vocal Rider for StreamPireX DAW
// =============================================================================
// Analyzes audio level per window, generates a gain automation curve,
// rides volume up/down to hit a target RMS. More transparent than compression.
// Displays gain curve overlay on waveform.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

const VocalRider = ({
  audioContext,
  audioBuffer,
  onProcessed,       // (processedBuffer) => void
  isEmbedded = false,
}) => {
  const [targetRms, setTargetRms] = useState(-18);      // dB target
  const [maxBoost, setMaxBoost] = useState(12);          // max gain increase dB
  const [maxCut, setMaxCut] = useState(12);              // max gain decrease dB
  const [rideSpeed, setRideSpeed] = useState(50);        // 0=slow/smooth, 100=fast/responsive
  const [gateThreshold, setGateThreshold] = useState(-50); // below this = silence, don't boost
  const [lookahead, setLookahead] = useState(20);        // ms lookahead
  const [smoothing, setSmoothing] = useState(70);        // smoothing %
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState(null);
  const [gainCurve, setGainCurve] = useState([]);        // [{ time, gainDb }]
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [stats, setStats] = useState(null);

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

  // ── Analyze and process ──
  const processRider = useCallback(async () => {
    if (!audioBuffer) return;
    setIsProcessing(true);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const windowSize = Math.floor(sr * 0.03); // 30ms windows
    const hopSize = Math.floor(windowSize / 2);
    const lookaheadSamps = Math.floor((lookahead / 1000) * sr);

    // Step 1: Compute RMS per window
    const data = audioBuffer.getChannelData(0);
    const rmsValues = [];
    for (let i = 0; i + windowSize < len; i += hopSize) {
      let rms = 0;
      for (let j = 0; j < windowSize; j++) rms += data[i + j] * data[i + j];
      rms = Math.sqrt(rms / windowSize);
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -100;
      rmsValues.push({ pos: i, time: i / sr, rmsDb });
    }

    // Step 2: Compute gain curve
    const speedFactor = rideSpeed / 100;
    const smoothFactor = smoothing / 100;
    let prevGain = 0;
    const gains = rmsValues.map((v, idx) => {
      if (v.rmsDb < gateThreshold) {
        // Below gate — don't boost, let it be quiet
        return { time: v.time, pos: v.pos, gainDb: Math.max(-maxCut, prevGain * 0.9) };
      }

      // Target gain to reach target RMS
      let targetGain = targetRms - v.rmsDb;

      // Clamp
      targetGain = Math.max(-maxCut, Math.min(maxBoost, targetGain));

      // Smooth transition
      const alpha = 0.1 + speedFactor * 0.4; // faster speed = higher alpha
      const gain = prevGain + (targetGain - prevGain) * alpha;
      prevGain = gain;

      return { time: v.time, pos: v.pos, gainDb: gain };
    });

    // Step 3: Additional smoothing pass
    if (smoothFactor > 0) {
      const kernel = Math.floor(5 + smoothFactor * 20);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = kernel; i < gains.length - kernel; i++) {
          let sum = 0;
          for (let j = -kernel; j <= kernel; j++) sum += gains[i + j].gainDb;
          gains[i].gainDb = sum / (kernel * 2 + 1);
        }
      }
    }

    setGainCurve(gains);

    // Step 4: Apply gain curve to audio
    const output = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const out = output.getChannelData(ch);

      let gIdx = 0;
      for (let i = 0; i < len; i++) {
        // Find the nearest gain value with lookahead
        while (gIdx < gains.length - 1 && gains[gIdx + 1].pos <= i + lookaheadSamps) gIdx++;

        // Interpolate between gain points
        let gainDb = gains[gIdx].gainDb;
        if (gIdx < gains.length - 1) {
          const t = (i - gains[gIdx].pos) / (gains[gIdx + 1].pos - gains[gIdx].pos || 1);
          gainDb = gains[gIdx].gainDb + (gains[gIdx + 1].gainDb - gains[gIdx].gainDb) * Math.max(0, Math.min(1, t));
        }

        const gainLinear = Math.pow(10, gainDb / 20);
        out[i] = src[i] * gainLinear;
      }
    }

    // Stats
    const origRmsVals = rmsValues.filter(v => v.rmsDb > gateThreshold).map(v => v.rmsDb);
    const procData = output.getChannelData(0);
    const procRmsVals = [];
    for (let i = 0; i + windowSize < len; i += hopSize) {
      let rms = 0;
      for (let j = 0; j < windowSize; j++) rms += procData[i + j] * procData[i + j];
      rms = Math.sqrt(rms / windowSize);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      if (db > gateThreshold) procRmsVals.push(db);
    }

    if (origRmsVals.length > 0 && procRmsVals.length > 0) {
      const origRange = Math.max(...origRmsVals) - Math.min(...origRmsVals);
      const procRange = Math.max(...procRmsVals) - Math.min(...procRmsVals);
      const origAvg = origRmsVals.reduce((a,b)=>a+b,0)/origRmsVals.length;
      const procAvg = procRmsVals.reduce((a,b)=>a+b,0)/procRmsVals.length;
      setStats({
        origRange: origRange.toFixed(1),
        procRange: procRange.toFixed(1),
        origAvg: origAvg.toFixed(1),
        procAvg: procAvg.toFixed(1),
        reduction: (origRange - procRange).toFixed(1),
      });
    }

    setProcessedBuffer(output);
    setIsProcessing(false);
    if (onProcessed) onProcessed(output);
    drawWaveform(gains);
  }, [audioBuffer, targetRms, maxBoost, maxCut, rideSpeed, gateThreshold, lookahead,
      smoothing, getCtx, onProcessed]);

  // ── Draw waveform with gain curve ──
  const drawWaveform = useCallback((gains) => {
    const cv = canvasRef.current;
    if (!cv || !audioBuffer) return;
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = audioBuffer.getChannelData(0);

    c.clearRect(0, 0, w, h);
    c.fillStyle = '#060c12';
    c.fillRect(0, 0, w, h);

    // Center line
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, h/2); c.lineTo(w, h/2); c.stroke();

    // Target RMS line
    const targetLin = Math.pow(10, targetRms / 20);
    const targetY = h/2 - targetLin * h/2;
    const targetYb = h/2 + targetLin * h/2;
    c.strokeStyle = 'rgba(0,255,200,0.15)';
    c.setLineDash([4,4]);
    c.beginPath(); c.moveTo(0, targetY); c.lineTo(w, targetY); c.stroke();
    c.beginPath(); c.moveTo(0, targetYb); c.lineTo(w, targetYb); c.stroke();
    c.setLineDash([]);

    // Waveform
    const step = Math.floor(data.length / w);
    c.beginPath();
    c.strokeStyle = 'rgba(200,214,229,0.4)';
    c.lineWidth = 1;
    for (let px = 0; px < w; px++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[px * step + j] || 0;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      c.moveTo(px, ((1 + min) / 2) * h);
      c.lineTo(px, ((1 + max) / 2) * h);
    }
    c.stroke();

    // Gain curve overlay
    if (gains && gains.length > 0) {
      const dur = audioBuffer.duration;
      c.beginPath();
      c.strokeStyle = '#FF6600';
      c.lineWidth = 2;
      c.shadowColor = '#FF6600';
      c.shadowBlur = 3;
      gains.forEach((g, i) => {
        const x = (g.time / dur) * w;
        // Map gain: 0dB = center, +maxBoost = top, -maxCut = bottom
        const maxG = Math.max(maxBoost, maxCut);
        const y = h/2 - (g.gainDb / maxG) * (h/2 - 10);
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      });
      c.stroke();
      c.shadowBlur = 0;

      // 0dB reference
      c.strokeStyle = 'rgba(255,102,0,0.2)';
      c.setLineDash([2,4]);
      c.beginPath(); c.moveTo(0, h/2); c.lineTo(w, h/2); c.stroke();
      c.setLineDash([]);
    }
  }, [audioBuffer, targetRms, maxBoost, maxCut]);

  useEffect(() => {
    if (gainCurve.length > 0) drawWaveform(gainCurve);
  }, [gainCurve, drawWaveform]);

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

  return (
    <div className="vocal-rider">
      <div className="vr-header">
        <span className="vr-logo">📈</span>
        <span className="vr-title">VOCAL RIDER</span>
        <span className="vr-subtitle">Auto-level — smoother than compression</span>
      </div>

      <div className="vr-body">
        <div className="vr-controls">
          <div className="vr-section">
            <div className="vr-section-label">Target</div>
            <div className="vr-param">
              <label>Target RMS</label>
              <input type="range" min={-36} max={-6} value={targetRms}
                onChange={e => setTargetRms(+e.target.value)} className="vr-slider" />
              <span>{targetRms}dB</span>
            </div>
          </div>

          <div className="vr-section">
            <div className="vr-section-label">Range</div>
            <div className="vr-param">
              <label>Max Boost</label>
              <input type="range" min={0} max={24} value={maxBoost}
                onChange={e => setMaxBoost(+e.target.value)} className="vr-slider" />
              <span>+{maxBoost}dB</span>
            </div>
            <div className="vr-param">
              <label>Max Cut</label>
              <input type="range" min={0} max={24} value={maxCut}
                onChange={e => setMaxCut(+e.target.value)} className="vr-slider" />
              <span>-{maxCut}dB</span>
            </div>
          </div>

          <div className="vr-section">
            <div className="vr-section-label">Behavior</div>
            <div className="vr-param">
              <label>Speed</label>
              <input type="range" min={0} max={100} value={rideSpeed}
                onChange={e => setRideSpeed(+e.target.value)} className="vr-slider" />
              <span>{rideSpeed < 30 ? 'Slow' : rideSpeed < 70 ? 'Medium' : 'Fast'}</span>
            </div>
            <div className="vr-param">
              <label>Smoothing</label>
              <input type="range" min={0} max={100} value={smoothing}
                onChange={e => setSmoothing(+e.target.value)} className="vr-slider" />
              <span>{smoothing}%</span>
            </div>
            <div className="vr-param">
              <label>Gate</label>
              <input type="range" min={-80} max={-20} value={gateThreshold}
                onChange={e => setGateThreshold(+e.target.value)} className="vr-slider" />
              <span>{gateThreshold}dB</span>
            </div>
            <div className="vr-param">
              <label>Lookahead</label>
              <input type="range" min={0} max={100} value={lookahead}
                onChange={e => setLookahead(+e.target.value)} className="vr-slider" />
              <span>{lookahead}ms</span>
            </div>
          </div>

          <div className="vr-actions">
            <button className="vr-btn vr-btn-process" onClick={processRider}
              disabled={!audioBuffer || isProcessing}>
              {isProcessing ? '⏳ Riding...' : '📈 Ride Levels'}
            </button>
            <button className="vr-btn" onClick={() => preview(false)} disabled={!audioBuffer || previewPlaying}>
              ▶ Original
            </button>
            <button className="vr-btn" onClick={() => preview(true)} disabled={!processedBuffer || previewPlaying}>
              ▶ Processed
            </button>
            {previewPlaying && <button className="vr-btn" onClick={stopPreview}>⏹ Stop</button>}
          </div>

          {stats && (
            <div className="vr-stats">
              <div className="vr-stat-row">
                <span>Original Dynamic Range:</span>
                <span>{stats.origRange}dB</span>
              </div>
              <div className="vr-stat-row">
                <span>Processed Dynamic Range:</span>
                <span className="vr-stat-good">{stats.procRange}dB</span>
              </div>
              <div className="vr-stat-row">
                <span>Range Reduction:</span>
                <span className="vr-stat-good">{stats.reduction}dB tighter</span>
              </div>
              <div className="vr-stat-row">
                <span>Avg Level (orig → proc):</span>
                <span>{stats.origAvg}dB → {stats.procAvg}dB</span>
              </div>
            </div>
          )}
        </div>

        <div className="vr-display">
          <div className="vr-display-header">
            <span>Waveform + Gain Curve</span>
            <div className="vr-legend">
              <span className="vr-legend-item"><span className="vr-legend-dot" style={{background:'#c8d6e5'}}></span> Audio</span>
              <span className="vr-legend-item"><span className="vr-legend-dot" style={{background:'#FF6600'}}></span> Gain Ride</span>
              <span className="vr-legend-item"><span className="vr-legend-dot" style={{background:'#00ffc8'}}></span> Target</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="vr-canvas" width={800} height={200} />
          {!audioBuffer && (
            <div className="vr-empty-overlay">No audio loaded — record or select a track</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocalRider;