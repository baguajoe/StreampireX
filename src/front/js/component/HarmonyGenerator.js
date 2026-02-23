// =============================================================================
// HarmonyGenerator.js — Auto-Harmony for StreamPireX DAW
// =============================================================================
// Uses PhaseVocoder for clean pitch shifting — no chipmunk artifacts.
// Scale-aware: 3rd above a minor note stays minor.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateHarmonyVoice, generateScaleHarmony, pitchShiftSemitones } from './PhaseVocoder';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const SCALES = {
  major:      [0,2,4,5,7,9,11],
  minor:      [0,2,3,5,7,8,10],
  dorian:     [0,2,3,5,7,9,10],
  mixolydian: [0,2,4,5,7,9,10],
  pentatonic: [0,2,4,7,9],
  blues:      [0,3,5,6,7,10],
  harmMinor:  [0,2,3,5,7,8,11],
};

const HARMONY_PRESETS = [
  { name: '3rd Above', intervals: [2], scaleAware: true, desc: 'Major/minor third up', icon: '🎵' },
  { name: '3rd Below', intervals: [-2], scaleAware: true, desc: 'Third below the melody', icon: '🎶' },
  { name: '5th Above', intervals: [4], scaleAware: true, desc: 'Perfect fifth up', icon: '⚡' },
  { name: 'Octave Up', intervals: [12], scaleAware: false, desc: 'One octave above', icon: '⬆' },
  { name: 'Octave Down', intervals: [-12], scaleAware: false, desc: 'One octave below', icon: '⬇' },
  { name: '3rd + 5th', intervals: [2, 4], scaleAware: true, desc: 'Full triad harmony', icon: '🎹' },
  { name: '3rd + 5th + Oct', intervals: [2, 4, 12], scaleAware: true, desc: 'Four-part choir', icon: '👥' },
  { name: 'Stack', intervals: [-12, 2, 4, 6, 12], scaleAware: true, desc: 'Full stack — huge sound', icon: '✨' },
  { name: 'Custom', intervals: [], scaleAware: false, desc: 'Set your own intervals', icon: '🔧' },
];

const VoiceWaveform = ({ buffer }) => {
  const cvRef = useRef(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv || !buffer) return;
    const c = cv.getContext('2d'); const w = cv.width, h = cv.height;
    const data = buffer.getChannelData(0); const step = Math.floor(data.length / w);
    c.clearRect(0, 0, w, h); c.fillStyle = '#0a1018'; c.fillRect(0, 0, w, h);
    c.beginPath(); c.strokeStyle = '#00ffc8'; c.lineWidth = 1;
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) { const d = data[i * step + j] || 0; if (d < min) min = d; if (d > max) max = d; }
      c.moveTo(i, ((1 + min) / 2) * h); c.lineTo(i, ((1 + max) / 2) * h);
    }
    c.stroke();
  }, [buffer]);
  return <canvas ref={cvRef} width={200} height={40} className="hg-mini-wave" />;
};

const HarmonyGenerator = ({ audioContext, audioBuffer, onHarmonyCreated, isEmbedded = false }) => {
  const [rootNote, setRootNote] = useState(0);
  const [scaleName, setScaleName] = useState('major');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customIntervals, setCustomIntervals] = useState([4]);
  const [harmonyVolumes, setHarmonyVolumes] = useState({});
  const [panPositions, setPanPositions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVoices, setGeneratedVoices] = useState([]);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [dryWet, setDryWet] = useState(50);
  const [detune, setDetune] = useState(5);
  const [delayMs, setDelayMs] = useState(10);

  const ctxRef = useRef(null);
  const previewNodes = useRef([]);
  const scaleDegrees = useMemo(() => SCALES[scaleName] || SCALES.major, [scaleName]);

  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current || ctxRef.current.state === 'closed')
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [audioContext]);

  const preset = HARMONY_PRESETS[selectedPreset];
  const activeIntervals = useMemo(() => {
    return preset.name === 'Custom' ? customIntervals : preset.intervals;
  }, [selectedPreset, customIntervals, preset.name]);

  // ── Generate harmonies using phase vocoder ──
  const generateHarmonies = useCallback(async () => {
    if (!audioBuffer || activeIntervals.length === 0) return;
    setIsProcessing(true); setProgress(0); setGeneratedVoices([]);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const mono = audioBuffer.getChannelData(0);
    const voices = [];

    for (let vi = 0; vi < activeIntervals.length; vi++) {
      const interval = activeIntervals[vi];
      const vol = (harmonyVolumes[interval] ?? 80) / 100;
      const pan = (panPositions[interval] ?? 0) / 100;
      const isScaleAware = preset.scaleAware && Math.abs(interval) <= 7;

      let shiftedMono;
      if (isScaleAware) {
        // Scale-aware: different shift per grain based on detected pitch
        shiftedMono = generateScaleHarmony(mono, sr, interval, rootNote, scaleDegrees, {
          detuneCents: detune, delayMs, volume: vol,
        });
      } else {
        // Fixed semitone shift (octaves, custom)
        shiftedMono = generateHarmonyVoice(mono, sr, interval, {
          detuneCents: detune, delayMs, volume: vol,
        });
      }

      // Create stereo buffer
      const buf = ctx.createBuffer(nc, len, sr);
      for (let ch = 0; ch < nc; ch++) {
        const out = buf.getChannelData(ch);
        for (let i = 0; i < len && i < shiftedMono.length; i++) out[i] = shiftedMono[i];
      }

      const label = interval > 0 ? `+${interval}` : `${interval}`;
      voices.push({ buffer: buf, name: `Harmony ${label}${isScaleAware ? ' (scale)' : ' st'}`, interval, volume: vol, pan });

      setProgress(Math.round(((vi + 1) / activeIntervals.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }

    setGeneratedVoices(voices); setProgress(100); setIsProcessing(false);
  }, [audioBuffer, activeIntervals, rootNote, scaleDegrees, harmonyVolumes, panPositions, detune, delayMs, preset, getCtx]);

  // ── Preview ──
  const previewMix = useCallback(() => {
    if (generatedVoices.length === 0 && !audioBuffer) return;
    const ctx = getCtx();
    previewNodes.current.forEach(n => { try { n.stop(); } catch(e){} }); previewNodes.current = [];

    if (audioBuffer) {
      const dry = ctx.createBufferSource(); const g = ctx.createGain();
      g.gain.value = dryWet < 100 ? (100 - dryWet) / 100 : 0;
      dry.buffer = audioBuffer; dry.connect(g).connect(ctx.destination); dry.start();
      previewNodes.current.push(dry);
    }
    generatedVoices.forEach(v => {
      const s = ctx.createBufferSource(); const g = ctx.createGain(); const p = ctx.createStereoPanner();
      g.gain.value = v.volume * (dryWet / 100); p.pan.value = v.pan;
      s.buffer = v.buffer; s.connect(g).connect(p).connect(ctx.destination); s.start();
      previewNodes.current.push(s);
    });
    setPreviewPlaying(true);
    if (previewNodes.current[0]) previewNodes.current[0].onended = () => setPreviewPlaying(false);
  }, [audioBuffer, generatedVoices, dryWet, getCtx]);

  const stopPreview = useCallback(() => {
    previewNodes.current.forEach(n => { try { n.stop(); } catch(e){} }); previewNodes.current = []; setPreviewPlaying(false);
  }, []);

  const sendToDAW = useCallback(() => {
    if (onHarmonyCreated && generatedVoices.length > 0) onHarmonyCreated(generatedVoices);
  }, [onHarmonyCreated, generatedVoices]);

  const addCustom = () => setCustomIntervals(prev => [...prev, 4]);
  const removeCustom = (idx) => setCustomIntervals(prev => prev.filter((_, i) => i !== idx));
  const updateCustom = (idx, val) => setCustomIntervals(prev => prev.map((v, i) => i === idx ? val : v));
  const setVol = (iv, val) => setHarmonyVolumes(prev => ({ ...prev, [iv]: val }));
  const setPan = (iv, val) => setPanPositions(prev => ({ ...prev, [iv]: val }));

  return (
    <div className="harmony-gen">
      <div className="hg-header">
        <span className="hg-logo">🎶</span>
        <span className="hg-title">HARMONY GENERATOR</span>
        <span className="hg-subtitle">{audioBuffer ? `${audioBuffer.duration.toFixed(1)}s vocal loaded` : 'No audio — record or select a track'}</span>
      </div>
      <div className="hg-body">
        <div className="hg-controls">
          <div className="hg-section">
            <div className="hg-section-label">Key</div>
            <div className="hg-row">
              <select className="hg-select" value={rootNote} onChange={e => setRootNote(+e.target.value)}>
                {NOTE_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
              </select>
              <select className="hg-select" value={scaleName} onChange={e => setScaleName(e.target.value)}>
                {Object.keys(SCALES).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="hg-section">
            <div className="hg-section-label">Harmony Type</div>
            <div className="hg-presets">
              {HARMONY_PRESETS.map((p, i) => (
                <button key={i} className={`hg-preset ${selectedPreset === i ? 'selected' : ''}`} onClick={() => setSelectedPreset(i)}>
                  <span className="hg-preset-icon">{p.icon}</span><span className="hg-preset-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          {preset.name === 'Custom' && (
            <div className="hg-section">
              <div className="hg-section-label">Custom Intervals (semitones) <button className="hg-add-btn" onClick={addCustom}>+ Add</button></div>
              {customIntervals.map((iv, idx) => (
                <div key={idx} className="hg-custom-row">
                  <input type="range" min={-24} max={24} value={iv} onChange={e => updateCustom(idx, +e.target.value)} className="hg-slider" />
                  <span className="hg-custom-val">{iv > 0 ? '+' : ''}{iv}st</span>
                  <button className="hg-remove-btn" onClick={() => removeCustom(idx)}>✕</button>
                </div>
              ))}
            </div>
          )}
          {activeIntervals.length > 0 && (
            <div className="hg-section">
              <div className="hg-section-label">Voice Levels</div>
              {activeIntervals.map((iv, i) => (
                <div key={i} className="hg-voice-ctrl">
                  <span className="hg-voice-label">{iv > 0 ? '+' : ''}{iv}</span>
                  <div className="hg-voice-sliders">
                    <div className="hg-mini-param"><span>Vol</span><input type="range" min={0} max={100} value={harmonyVolumes[iv] ?? 80} onChange={e => setVol(iv, +e.target.value)} className="hg-slider-sm" /><span>{harmonyVolumes[iv] ?? 80}%</span></div>
                    <div className="hg-mini-param"><span>Pan</span><input type="range" min={-100} max={100} value={panPositions[iv] ?? 0} onChange={e => setPan(iv, +e.target.value)} className="hg-slider-sm" /><span>{(panPositions[iv] ?? 0) > 0 ? 'R' : (panPositions[iv] ?? 0) < 0 ? 'L' : 'C'}{Math.abs(panPositions[iv] ?? 0)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="hg-section">
            <div className="hg-section-label">Feel</div>
            <div className="hg-param"><label>Detune</label><input type="range" min={0} max={30} value={detune} onChange={e => setDetune(+e.target.value)} className="hg-slider" /><span>{detune}¢</span></div>
            <div className="hg-param"><label>Delay</label><input type="range" min={0} max={50} value={delayMs} onChange={e => setDelayMs(+e.target.value)} className="hg-slider" /><span>{delayMs}ms</span></div>
            <div className="hg-param"><label>Dry/Wet</label><input type="range" min={0} max={100} value={dryWet} onChange={e => setDryWet(+e.target.value)} className="hg-slider" /><span>{dryWet}%</span></div>
          </div>
          <div className="hg-actions">
            <button className="hg-btn hg-btn-generate" onClick={generateHarmonies} disabled={!audioBuffer || isProcessing || activeIntervals.length === 0}>
              {isProcessing ? `⏳ ${progress}%` : '🎶 Generate Harmonies'}
            </button>
            <button className="hg-btn" onClick={previewPlaying ? stopPreview : previewMix} disabled={generatedVoices.length === 0}>
              {previewPlaying ? '⏹ Stop' : '▶ Preview Mix'}
            </button>
            <button className="hg-btn hg-btn-send" onClick={sendToDAW} disabled={generatedVoices.length === 0}>🎚 Send to Tracks</button>
          </div>
          {progress > 0 && progress < 100 && <div className="hg-progress"><div className="hg-progress-bar" style={{ width: `${progress}%` }} /></div>}
        </div>
        <div className="hg-voices">
          <div className="hg-section-label">Generated Voices ({generatedVoices.length})</div>
          {generatedVoices.length === 0 ? (
            <div className="hg-empty"><span>🎤</span><p>Select a harmony type and click Generate.</p></div>
          ) : (
            <div className="hg-voice-list">
              {generatedVoices.map((v, i) => (
                <div key={i} className="hg-voice-card">
                  <div className="hg-voice-info">
                    <span className="hg-voice-name">{v.name}</span>
                    <span className="hg-voice-meta">Vol: {Math.round(v.volume * 100)}% | Pan: {v.pan > 0 ? `R${Math.round(v.pan*100)}` : v.pan < 0 ? `L${Math.round(Math.abs(v.pan)*100)}` : 'C'}</span>
                  </div>
                  <div className="hg-voice-wave"><VoiceWaveform buffer={v.buffer} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HarmonyGenerator;