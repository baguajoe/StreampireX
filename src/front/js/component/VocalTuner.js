// =============================================================================
// VocalTuner.js — Auto-Tune / Pitch Correction for StreamPireX DAW
// =============================================================================
// Uses PhaseVocoder for artifact-free pitch shifting per grain.
// Hard tune (instant snap) to Subtle (natural correction)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { correctPitch, detectPitch as pvDetectPitch } from './PhaseVocoder';

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
const noteName = (n) => `${NOTE_NAMES[Math.round(n) % 12]}${Math.floor(Math.round(n) / 12) - 1}`;

const VocalTuner = ({ audioContext, audioBuffer, onProcessed, isEmbedded = false }) => {
  const [rootNote, setRootNote] = useState(0);
  const [scaleName, setScaleName] = useState('chromatic');
  const [correctionSpeed, setCorrectionSpeed] = useState(25);
  const [humanize, setHumanize] = useState(10);
  const [preserveVibrato, setPreserveVibrato] = useState(true);
  const [vibratoThreshold, setVibratoThreshold] = useState(30);
  const [outputMix, setOutputMix] = useState(100);
  const [bypassNotes, setBypassNotes] = useState(new Set());
  const [pitchData, setPitchData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [processedAudio, setProcessedAudio] = useState(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);

  const scale = useMemo(() => SCALES[scaleName] || SCALES.chromatic, [scaleName]);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current || ctxRef.current.state === 'closed')
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext]);

  // ── Phase vocoder pitch correction ──
  const processCorrection = useCallback(async () => {
    if (!audioBuffer) return;
    setIsProcessing(true); setProgress(10);
    await new Promise(r => setTimeout(r, 0));

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;

    setProgress(20);
    const inputData = audioBuffer.getChannelData(0);
    const { correctedAudio, pitchData: pd } = correctPitch(inputData, sr, rootNote, scale, {
      correctionSpeed: correctionSpeed / 100,
      humanize: humanize / 100,
      preserveVibrato, vibratoThreshold, bypassNotes,
    });

    setProgress(80); setPitchData(pd);

    const wet = outputMix / 100;
    const output = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const out = output.getChannelData(ch);
      const corr = ch === 0 ? correctedAudio : correctPitch(src, sr, rootNote, scale, {
        correctionSpeed: correctionSpeed / 100, humanize: humanize / 100, preserveVibrato, vibratoThreshold, bypassNotes,
      }).correctedAudio;
      for (let i = 0; i < len; i++) {
        out[i] = src[i] * (1 - wet) + (i < corr.length ? corr[i] : 0) * wet;
      }
    }

    setProcessedAudio(output); setProgress(100); setIsProcessing(false);
    if (onProcessed) onProcessed(output);
    drawPitchGraph(pd);
  }, [audioBuffer, rootNote, scale, correctionSpeed, humanize, preserveVibrato, vibratoThreshold, outputMix, bypassNotes, getCtx, onProcessed]);

  // ── Quick analyze ──
  const analyzeOnly = useCallback(() => {
    if (!audioBuffer) return;
    setIsProcessing(true);
    const sr = audioBuffer.sampleRate; const data = audioBuffer.getChannelData(0);
    const results = [];
    for (let i = 0; i + 2048 < data.length; i += 512) {
      const freq = pvDetectPitch(data.slice(i, i + 2048), sr);
      const time = i / sr;
      if (freq > 0) { const n = noteFromFreq(freq); results.push({ time, origFreq: freq, origNote: n, corrNote: n, corrFreq: freq, cents: 0 }); }
      else results.push({ time, origFreq: -1, origNote: -1, corrNote: -1, corrFreq: -1, cents: 0 });
    }
    setPitchData(results); setIsProcessing(false); drawPitchGraph(results);
  }, [audioBuffer]);

  // ── Preview ──
  const previewAudio = useCallback((buf) => {
    if (!buf) return; const ctx = getCtx();
    if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){}
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start();
    sourceRef.current = s; setPreviewPlaying(true); s.onended = () => setPreviewPlaying(false);
  }, [getCtx]);
  const stopPreview = useCallback(() => { if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){} setPreviewPlaying(false); }, []);

  // ── Draw pitch graph ──
  const drawPitchGraph = useCallback((data) => {
    const cv = canvasRef.current;
    if (!cv || !data || data.length === 0) return;
    const c = cv.getContext('2d'); const w = cv.width, h = cv.height;
    c.clearRect(0, 0, w, h); c.fillStyle = '#060c12'; c.fillRect(0, 0, w, h);

    const valid = data.filter(d => d.origNote > 0);
    if (valid.length === 0) return;
    const minN = Math.min(...valid.map(d => Math.min(d.origNote, d.corrNote > 0 ? d.corrNote : d.origNote))) - 3;
    const maxN = Math.max(...valid.map(d => Math.max(d.origNote, d.corrNote > 0 ? d.corrNote : d.origNote))) + 3;
    const range = maxN - minN;

    for (let n = Math.ceil(minN); n <= Math.floor(maxN); n++) {
      const y = h - ((n - minN) / range) * h;
      const pc = ((n % 12) - rootNote + 12) % 12;
      if (scale[pc]) { c.fillStyle = 'rgba(0,255,200,0.03)'; c.fillRect(0, y - (h / range / 2), w, h / range); }
      c.strokeStyle = [1,3,6,8,10].includes(n % 12) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      c.lineWidth = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
      if (![1,3,6,8,10].includes(n % 12)) { c.fillStyle = 'rgba(255,255,255,0.12)'; c.font = '8px monospace'; c.fillText(NOTE_NAMES[n % 12], 2, y - 1); }
    }

    const totalTime = data[data.length - 1].time;
    // Original (orange)
    c.beginPath(); c.strokeStyle = 'rgba(255,102,0,0.6)'; c.lineWidth = 1.5;
    let started = false;
    data.forEach(d => { if (d.origNote <= 0) { started = false; return; } const x = (d.time / totalTime) * w; const y = h - ((d.origNote - minN) / range) * h; if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); });
    c.stroke();
    // Corrected (teal)
    c.beginPath(); c.strokeStyle = '#00ffc8'; c.lineWidth = 2; c.shadowColor = '#00ffc8'; c.shadowBlur = 3;
    started = false;
    data.forEach(d => { if (d.corrNote <= 0) { started = false; return; } const x = (d.time / totalTime) * w; const y = h - ((d.corrNote - minN) / range) * h; if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); });
    c.stroke(); c.shadowBlur = 0;
  }, [scale, rootNote]);

  useEffect(() => { if (pitchData.length > 0) drawPitchGraph(pitchData); }, [pitchData, drawPitchGraph]);
  const toggleBypass = (pc) => setBypassNotes(prev => { const n = new Set(prev); if (n.has(pc)) n.delete(pc); else n.add(pc); return n; });
  useEffect(() => () => { if (sourceRef.current) try { sourceRef.current.stop(); } catch(e){} }, []);

  return (
    <div className="vocal-tuner">
      <div className="vt-header">
        <span className="vt-logo">🎯</span>
        <span className="vt-title">PITCH CORRECTION</span>
        <span className="vt-subtitle">Phase Vocoder Engine</span>
      </div>
      <div className="vt-body">
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
          <div className="vt-section">
            <div className="vt-section-label">Active Notes <span className="vt-hint">(click to bypass)</span></div>
            <div className="vt-note-keys">
              {NOTE_NAMES.map((n, i) => {
                const pc = (i - rootNote + 12) % 12; const inScale = scale[pc]; const bypassed = bypassNotes.has(i);
                return (<button key={i} className={`vt-note-key ${[1,3,6,8,10].includes(i)?'black':'white'} ${inScale?'in-scale':'out-scale'} ${bypassed?'bypassed':''}`} onClick={() => toggleBypass(i)}>{n}</button>);
              })}
            </div>
          </div>
          <div className="vt-section">
            <div className="vt-section-label">Correction</div>
            <div className="vt-param"><label>Speed</label><input type="range" min={0} max={100} value={correctionSpeed} onChange={e => setCorrectionSpeed(+e.target.value)} className="vt-slider" /><span className="vt-param-val">{correctionSpeed === 0 ? 'HARD' : correctionSpeed < 30 ? 'Fast' : correctionSpeed < 70 ? 'Medium' : 'Subtle'}</span></div>
            <div className="vt-param"><label>Humanize</label><input type="range" min={0} max={50} value={humanize} onChange={e => setHumanize(+e.target.value)} className="vt-slider" /><span className="vt-param-val">{humanize}%</span></div>
            <div className="vt-param"><label>Wet/Dry</label><input type="range" min={0} max={100} value={outputMix} onChange={e => setOutputMix(+e.target.value)} className="vt-slider" /><span className="vt-param-val">{outputMix}%</span></div>
          </div>
          <div className="vt-section">
            <div className="vt-section-label">Vibrato</div>
            <div className="vt-param"><label>Preserve</label><button className={`vt-toggle ${preserveVibrato?'on':''}`} onClick={() => setPreserveVibrato(!preserveVibrato)}>{preserveVibrato?'ON':'OFF'}</button></div>
            {preserveVibrato && <div className="vt-param"><label>Threshold</label><input type="range" min={5} max={80} value={vibratoThreshold} onChange={e => setVibratoThreshold(+e.target.value)} className="vt-slider" /><span className="vt-param-val">{vibratoThreshold}¢</span></div>}
          </div>
          <div className="vt-actions">
            <button className="vt-btn vt-btn-analyze" onClick={analyzeOnly} disabled={!audioBuffer || isProcessing}>📊 Analyze Only</button>
            <button className="vt-btn vt-btn-process" onClick={processCorrection} disabled={!audioBuffer || isProcessing}>{isProcessing ? `⏳ ${progress}%` : '🎯 Correct Pitch'}</button>
            <button className="vt-btn" onClick={() => previewAudio(audioBuffer)} disabled={!audioBuffer || previewPlaying}>▶ Original</button>
            <button className="vt-btn" onClick={() => previewAudio(processedAudio)} disabled={!processedAudio || previewPlaying}>▶ Corrected</button>
            {previewPlaying && <button className="vt-btn" onClick={stopPreview}>⏹ Stop</button>}
          </div>
          {progress > 0 && progress < 100 && <div className="vt-progress"><div className="vt-progress-bar" style={{ width: `${progress}%` }} /><span className="vt-progress-text">{progress}%</span></div>}
        </div>
        <div className="vt-display">
          <div className="vt-display-header">
            <span className="vt-display-label">Pitch Graph</span>
            <div className="vt-legend">
              <span className="vt-legend-item"><span className="vt-legend-dot" style={{background:'#FF6600'}}></span> Original</span>
              <span className="vt-legend-item"><span className="vt-legend-dot" style={{background:'#00ffc8'}}></span> Corrected</span>
            </div>
          </div>
          <canvas ref={canvasRef} className="vt-canvas" width={800} height={300} />
          {pitchData.length === 0 && <div className="vt-empty-overlay"><span>Load audio and click "Analyze" or "Correct Pitch"</span></div>}
        </div>
      </div>
    </div>
  );
};

export default VocalTuner;