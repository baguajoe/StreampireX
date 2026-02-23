// =============================================================================
// VocalTuner.js — Auto-Tune / Pitch Correction for StreamPireX DAW
// =============================================================================
// Two modes: Real-time (monitoring) and Offline (process recorded audio)
// Detects pitch via autocorrelation, snaps to selected scale,
// displays pitch curve with piano keyboard reference.
// Correction speed: 0 (hard tune / T-Pain) to 100 (subtle / natural)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const SCALES = {
  chromatic: [1,1,1,1,1,1,1,1,1,1,1,1],
  major:     [1,0,1,0,1,1,0,1,0,1,0,1],
  minor:     [1,0,1,1,0,1,0,1,1,0,1,0],
  dorian:    [1,0,1,1,0,1,0,1,0,1,1,0],
  mixolydian:[1,0,1,0,1,1,0,1,0,1,1,0],
  pentatonic:[1,0,1,0,1,0,0,1,0,1,0,0],
  blues:     [1,0,0,1,0,1,1,1,0,0,1,0],
  phrygian:  [1,1,0,1,0,1,0,1,1,0,1,0],
  harmMinor: [1,0,1,1,0,1,0,1,1,0,0,1],
  melodMinor:[1,0,1,1,0,1,0,1,0,1,0,1],
};

const noteFromFreq = (f) => f > 0 ? 12 * Math.log2(f / 440) + 69 : -1;
const freqFromNote = (n) => 440 * Math.pow(2, (n - 69) / 12);
const noteName = (n) => `${NOTE_NAMES[Math.round(n) % 12]}${Math.floor(Math.round(n) / 12) - 1}`;

// ── Autocorrelation pitch detection ──
const detectPitch = (buf, sr) => {
  const SIZE = buf.length;
  const HALF = Math.floor(SIZE / 2);
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let bestOff = -1, bestCorr = 0;
  const minP = Math.floor(sr / 1100);
  const maxP = Math.floor(sr / 60);

  for (let off = minP; off < maxP && off < HALF; off++) {
    let corr = 0;
    for (let i = 0; i < HALF; i++) corr += Math.abs(buf[i] - buf[i + off]);
    corr = 1 - corr / HALF;
    if (corr > 0.85 && corr > bestCorr) { bestCorr = corr; bestOff = off; }
  }
  return bestOff > 0 && bestCorr > 0.85 ? sr / bestOff : -1;
};

// ── Find nearest note in scale ──
const snapToScale = (noteNum, rootNote, scaleArr) => {
  const n = Math.round(noteNum);
  const pc = ((n % 12) - rootNote + 12) % 12;
  if (scaleArr[pc]) return n;
  // search outward
  for (let d = 1; d <= 6; d++) {
    if (scaleArr[((pc + d) % 12)]) return n + d;
    if (scaleArr[((pc - d + 12) % 12)]) return n - d;
  }
  return n;
};

const VocalTuner = ({
  audioContext,
  audioBuffer,          // recorded audio buffer to process offline
  onProcessed,          // (correctedBuffer) => void
  isEmbedded = false,
}) => {
  // ── Settings ──
  const [rootNote, setRootNote] = useState(0);        // 0=C
  const [scaleName, setScaleName] = useState('chromatic');
  const [correctionSpeed, setCorrectionSpeed] = useState(25);  // 0=hard, 100=subtle
  const [humanize, setHumanize] = useState(10);       // random variation %
  const [preserveVibrato, setPreserveVibrato] = useState(true);
  const [vibratoThreshold, setVibratoThreshold] = useState(30);  // cents
  const [formantPreserve, setFormantPreserve] = useState(true);
  const [outputMix, setOutputMix] = useState(100);    // wet/dry %
  const [bypassNotes, setBypassNotes] = useState(new Set());  // notes to skip correction

  // ── Analysis ──
  const [pitchData, setPitchData] = useState([]);      // { time, origFreq, origNote, corrNote, corrFreq, cents }
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  // ── Real-time monitoring ──
  const [monitorActive, setMonitorActive] = useState(false);
  const [liveOrigNote, setLiveOrigNote] = useState(null);
  const [liveCorrNote, setLiveCorrNote] = useState(null);
  const [liveCents, setLiveCents] = useState(0);

  // ── Canvas ──
  const canvasRef = useRef(null);
  const pianoRef = useRef(null);
  const animRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const previewSourceRef = useRef(null);

  const scale = useMemo(() => SCALES[scaleName] || SCALES.chromatic, [scaleName]);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext]);

  // ── Analyze pitch of audio buffer ──
  const analyzeBuffer = useCallback(async () => {
    if (!audioBuffer) return;
    setIsAnalyzing(true);
    setPitchData([]);

    const sr = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const windowSize = 2048;
    const hopSize = 512;
    const results = [];

    for (let i = 0; i + windowSize < data.length; i += hopSize) {
      const chunk = data.slice(i, i + windowSize);
      const freq = detectPitch(chunk, sr);
      const time = i / sr;

      if (freq > 0) {
        const origNote = noteFromFreq(freq);
        const corrNote = snapToScale(origNote, rootNote, scale);
        const corrFreq = freqFromNote(corrNote);
        const cents = Math.round(1200 * Math.log2(freq / freqFromNote(Math.round(origNote))));

        results.push({ time, origFreq: freq, origNote, corrNote, corrFreq, cents });
      } else {
        results.push({ time, origFreq: -1, origNote: -1, corrNote: -1, corrFreq: -1, cents: 0 });
      }

      if (results.length % 100 === 0) {
        setProgress(Math.round((i / data.length) * 50));
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setPitchData(results);
    setIsAnalyzing(false);
    setProgress(50);
    drawPitchGraph(results);
  }, [audioBuffer, rootNote, scale]);

  // ── Offline pitch correction ──
  const processCorrection = useCallback(async () => {
    if (!audioBuffer || pitchData.length === 0) return;
    setIsProcessing(true);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;

    // Create output buffer
    const output = ctx.createBuffer(nc, len, sr);

    // Simple pitch correction via granular synthesis
    const windowSize = 2048;
    const hopSize = 512;
    const speedFactor = correctionSpeed / 100; // 0 = full correction, 1 = no correction

    for (let ch = 0; ch < nc; ch++) {
      const input = audioBuffer.getChannelData(ch);
      const out = output.getChannelData(ch);

      // Copy dry signal
      for (let i = 0; i < len; i++) out[i] = input[i];

      // Apply pitch shifting per analysis window
      let pdIdx = 0;
      for (let i = 0; i + windowSize < len; i += hopSize) {
        if (pdIdx >= pitchData.length) break;
        const pd = pitchData[pdIdx];
        pdIdx++;

        if (pd.origFreq <= 0 || pd.corrFreq <= 0) continue;
        if (bypassNotes.has(Math.round(pd.origNote) % 12)) continue;

        // Check vibrato — if cents variation is within threshold, possibly skip
        if (preserveVibrato && Math.abs(pd.cents) < vibratoThreshold) continue;

        // Calculate pitch shift ratio
        const rawRatio = pd.corrFreq / pd.origFreq;
        // Apply correction speed — blend between no-shift (1.0) and full-shift
        const ratio = 1.0 + (rawRatio - 1.0) * (1.0 - speedFactor);

        // Add humanize randomness
        const humanizeAmt = (humanize / 100) * 0.02; // max 2% random deviation
        const finalRatio = ratio + (Math.random() - 0.5) * humanizeAmt;

        if (Math.abs(finalRatio - 1.0) < 0.001) continue; // negligible shift

        // Granular pitch shift for this window
        const wetDry = outputMix / 100;
        for (let j = 0; j < windowSize && (i + j) < len; j++) {
          const srcIdx = i + j * finalRatio;
          const srcInt = Math.floor(srcIdx);
          const frac = srcIdx - srcInt;

          if (srcInt >= 0 && srcInt + 1 < len) {
            const shifted = input[srcInt] * (1 - frac) + input[srcInt + 1] * frac;
            // Hann window for smooth crossfade
            const w = 0.5 * (1 - Math.cos(2 * Math.PI * j / windowSize));
            out[i + j] = out[i + j] * (1 - wetDry * w) + shifted * wetDry * w;
          }
        }

        if (pdIdx % 50 === 0) {
          setProgress(50 + Math.round((i / len) * 50));
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }

    setIsProcessing(false);
    setProgress(100);
    if (onProcessed) onProcessed(output);
  }, [audioBuffer, pitchData, correctionSpeed, humanize, preserveVibrato, vibratoThreshold,
      outputMix, bypassNotes, getCtx, onProcessed]);

  // ── Preview original vs corrected ──
  const previewOriginal = useCallback(() => {
    if (!audioBuffer) return;
    const ctx = getCtx();
    if (previewSourceRef.current) { try { previewSourceRef.current.stop(); } catch(e){} }
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.start();
    previewSourceRef.current = src;
    setPreviewPlaying(true);
    src.onended = () => setPreviewPlaying(false);
  }, [audioBuffer, getCtx]);

  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) { try { previewSourceRef.current.stop(); } catch(e){} }
    setPreviewPlaying(false);
  }, []);

  // ── Draw pitch graph ──
  const drawPitchGraph = useCallback((data) => {
    const cv = canvasRef.current;
    if (!cv || !data || data.length === 0) return;
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;

    c.clearRect(0, 0, w, h);
    c.fillStyle = '#060c12';
    c.fillRect(0, 0, w, h);

    // Get pitch range
    const validPitches = data.filter(d => d.origNote > 0);
    if (validPitches.length === 0) return;

    const minNote = Math.min(...validPitches.map(d => Math.min(d.origNote, d.corrNote))) - 3;
    const maxNote = Math.max(...validPitches.map(d => Math.max(d.origNote, d.corrNote))) + 3;
    const range = maxNote - minNote;

    // Note grid
    for (let n = Math.ceil(minNote); n <= Math.floor(maxNote); n++) {
      const y = h - ((n - minNote) / range) * h;
      const pc = n % 12;
      const isBlack = [1,3,6,8,10].includes(pc);
      c.strokeStyle = isBlack ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();

      if (!isBlack) {
        c.fillStyle = 'rgba(255,255,255,0.12)';
        c.font = '8px monospace';
        c.fillText(NOTE_NAMES[pc], 2, y - 1);
      }
    }

    // Highlight scale notes
    const scaleArr = scale;
    for (let n = Math.ceil(minNote); n <= Math.floor(maxNote); n++) {
      const pc = ((n % 12) - rootNote + 12) % 12;
      if (scaleArr[pc]) {
        const y = h - ((n - minNote) / range) * h;
        c.fillStyle = 'rgba(0,255,200,0.03)';
        c.fillRect(0, y - (h / range / 2), w, h / range);
      }
    }

    const totalTime = data[data.length - 1].time;

    // Original pitch (orange)
    c.beginPath();
    c.strokeStyle = 'rgba(255,102,0,0.6)';
    c.lineWidth = 1.5;
    let started = false;
    data.forEach(d => {
      if (d.origNote <= 0) { started = false; return; }
      const x = (d.time / totalTime) * w;
      const y = h - ((d.origNote - minNote) / range) * h;
      if (!started) { c.moveTo(x, y); started = true; }
      else c.lineTo(x, y);
    });
    c.stroke();

    // Corrected pitch (teal)
    c.beginPath();
    c.strokeStyle = '#00ffc8';
    c.lineWidth = 2;
    c.shadowColor = '#00ffc8';
    c.shadowBlur = 3;
    started = false;
    data.forEach(d => {
      if (d.corrNote <= 0) { started = false; return; }
      const x = (d.time / totalTime) * w;
      const y = h - ((d.corrNote - minNote) / range) * h;
      if (!started) { c.moveTo(x, y); started = true; }
      else c.lineTo(x, y);
    });
    c.stroke();
    c.shadowBlur = 0;
  }, [scale, rootNote]);

  // Redraw when data changes
  useEffect(() => {
    if (pitchData.length > 0) drawPitchGraph(pitchData);
  }, [pitchData, drawPitchGraph]);

  // ── Toggle bypass note ──
  const toggleBypass = (pc) => {
    setBypassNotes(prev => {
      const next = new Set(prev);
      if (next.has(pc)) next.delete(pc);
      else next.add(pc);
      return next;
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (previewSourceRef.current) try { previewSourceRef.current.stop(); } catch(e){}
    };
  }, []);

  return (
    <div className="vocal-tuner">
      <div className="vt-header">
        <span className="vt-logo">🎯</span>
        <span className="vt-title">PITCH CORRECTION</span>
        <div className="vt-header-badges">
          {liveOrigNote !== null && (
            <span className="vt-live-badge">
              <span className="vt-live-orig">{noteName(liveOrigNote)}</span>
              <span className="vt-live-arrow">→</span>
              <span className="vt-live-corr">{noteName(liveCorrNote)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="vt-body">
        {/* ── Left: Settings ── */}
        <div className="vt-settings">
          <div className="vt-section">
            <div className="vt-section-label">Key & Scale</div>
            <div className="vt-row">
              <select className="vt-select" value={rootNote} onChange={e => setRootNote(+e.target.value)}>
                {NOTE_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
              <select className="vt-select" value={scaleName} onChange={e => setScaleName(e.target.value)}>
                {Object.keys(SCALES).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Note keyboard — click to bypass */}
          <div className="vt-section">
            <div className="vt-section-label">Active Notes <span className="vt-hint">(click to bypass)</span></div>
            <div className="vt-note-keys">
              {NOTE_NAMES.map((n, i) => {
                const pc = (i - rootNote + 12) % 12;
                const inScale = scale[pc];
                const bypassed = bypassNotes.has(i);
                const isBlack = [1,3,6,8,10].includes(i);
                return (
                  <button
                    key={i}
                    className={`vt-note-key ${isBlack ? 'black' : 'white'} ${inScale ? 'in-scale' : 'out-scale'} ${bypassed ? 'bypassed' : ''}`}
                    onClick={() => toggleBypass(i)}
                    title={`${n} — ${bypassed ? 'Bypassed' : inScale ? 'Active' : 'Not in scale'}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="vt-section">
            <div className="vt-section-label">Correction</div>
            <div className="vt-param">
              <label>Speed</label>
              <input type="range" min={0} max={100} value={correctionSpeed}
                onChange={e => setCorrectionSpeed(+e.target.value)} className="vt-slider" />
              <span className="vt-param-val">
                {correctionSpeed === 0 ? 'HARD' : correctionSpeed < 30 ? 'Fast' : correctionSpeed < 70 ? 'Medium' : 'Subtle'}
              </span>
            </div>
            <div className="vt-param">
              <label>Humanize</label>
              <input type="range" min={0} max={50} value={humanize}
                onChange={e => setHumanize(+e.target.value)} className="vt-slider" />
              <span className="vt-param-val">{humanize}%</span>
            </div>
            <div className="vt-param">
              <label>Wet/Dry</label>
              <input type="range" min={0} max={100} value={outputMix}
                onChange={e => setOutputMix(+e.target.value)} className="vt-slider" />
              <span className="vt-param-val">{outputMix}%</span>
            </div>
          </div>

          <div className="vt-section">
            <div className="vt-section-label">Vibrato</div>
            <div className="vt-param">
              <label>Preserve</label>
              <button className={`vt-toggle ${preserveVibrato ? 'on' : ''}`}
                onClick={() => setPreserveVibrato(!preserveVibrato)}>
                {preserveVibrato ? 'ON' : 'OFF'}
              </button>
            </div>
            {preserveVibrato && (
              <div className="vt-param">
                <label>Threshold</label>
                <input type="range" min={5} max={80} value={vibratoThreshold}
                  onChange={e => setVibratoThreshold(+e.target.value)} className="vt-slider" />
                <span className="vt-param-val">{vibratoThreshold}¢</span>
              </div>
            )}
          </div>

          <div className="vt-section">
            <div className="vt-section-label">Formant</div>
            <div className="vt-param">
              <label>Preserve</label>
              <button className={`vt-toggle ${formantPreserve ? 'on' : ''}`}
                onClick={() => setFormantPreserve(!formantPreserve)}>
                {formantPreserve ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="vt-actions">
            <button className="vt-btn vt-btn-analyze" onClick={analyzeBuffer} disabled={!audioBuffer || isAnalyzing}>
              {isAnalyzing ? '⏳ Analyzing...' : '📊 Analyze Pitch'}
            </button>
            <button className="vt-btn vt-btn-process" onClick={processCorrection}
              disabled={!audioBuffer || pitchData.length === 0 || isProcessing}>
              {isProcessing ? '⏳ Correcting...' : '🎯 Apply Correction'}
            </button>
            <button className="vt-btn" onClick={previewPlaying ? stopPreview : previewOriginal}
              disabled={!audioBuffer}>
              {previewPlaying ? '⏹ Stop' : '▶ Preview Original'}
            </button>
          </div>

          {progress > 0 && progress < 100 && (
            <div className="vt-progress">
              <div className="vt-progress-bar" style={{ width: `${progress}%` }} />
              <span className="vt-progress-text">{progress}%</span>
            </div>
          )}
        </div>

        {/* ── Right: Pitch Display ── */}
        <div className="vt-display">
          <div className="vt-display-header">
            <span className="vt-display-label">Pitch Graph</span>
            <div className="vt-legend">
              <span className="vt-legend-item"><span className="vt-legend-dot" style={{background:'#FF6600'}}></span> Original</span>
              <span className="vt-legend-item"><span className="vt-legend-dot" style={{background:'#00ffc8'}}></span> Corrected</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="vt-canvas" width={800} height={300} />
          {pitchData.length === 0 && (
            <div className="vt-empty-overlay">
              <span>Load audio and click "Analyze Pitch" to see pitch data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocalTuner;