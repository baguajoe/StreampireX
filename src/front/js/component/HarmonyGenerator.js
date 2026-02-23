// =============================================================================
// HarmonyGenerator.js — Auto-Harmony Generator for StreamPireX DAW
// =============================================================================
// Takes a recorded vocal, detects pitch, generates harmonies at scale intervals.
// Harmony types: Third above, Third below, Fifth, Octave, Custom interval.
// Creates separate audio buffers for each harmony voice.
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

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
  { name: '3rd Above', intervals: [3], desc: 'Classic harmony — major/minor third up', icon: '🎵' },
  { name: '3rd Below', intervals: [-3], desc: 'Third below the melody', icon: '🎶' },
  { name: '5th Above', intervals: [5], desc: 'Power harmony — perfect fifth up', icon: '⚡' },
  { name: 'Octave Up', intervals: [12], desc: 'One octave above', icon: '⬆' },
  { name: 'Octave Down', intervals: [-12], desc: 'One octave below — adds depth', icon: '⬇' },
  { name: '3rd + 5th', intervals: [3, 5], desc: 'Full triad harmony', icon: '🎹' },
  { name: '3rd + 5th + Oct', intervals: [3, 5, 12], desc: 'Choir-style four-part', icon: '👥' },
  { name: 'Bon Iver Stack', intervals: [-12, 3, 5, 7, 12], desc: 'Full stack — huge sound', icon: '✨' },
  { name: 'Custom', intervals: [], desc: 'Set your own intervals', icon: '🔧' },
];

const noteFromFreq = (f) => f > 0 ? 12 * Math.log2(f / 440) + 69 : -1;
const freqFromNote = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ── Autocorrelation pitch ──
const detectPitch = (buf, sr) => {
  const SIZE = buf.length;
  const HALF = Math.floor(SIZE / 2);
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;
  let bestOff = -1, bestCorr = 0;
  for (let off = Math.floor(sr / 1100); off < Math.floor(sr / 60) && off < HALF; off++) {
    let corr = 0;
    for (let i = 0; i < HALF; i++) corr += Math.abs(buf[i] - buf[i + off]);
    corr = 1 - corr / HALF;
    if (corr > 0.85 && corr > bestCorr) { bestCorr = corr; bestOff = off; }
  }
  return bestOff > 0 && bestCorr > 0.85 ? sr / bestOff : -1;
};

// ── Scale-aware interval ──
const getScaleInterval = (noteNum, interval, rootNote, scaleDegrees) => {
  if (!scaleDegrees || scaleDegrees.length === 0) return noteNum + interval;

  const pc = ((Math.round(noteNum) % 12) - rootNote + 12) % 12;
  // Find current scale degree
  let currentDegree = 0;
  let minDist = 12;
  for (let i = 0; i < scaleDegrees.length; i++) {
    const dist = Math.abs(scaleDegrees[i] - pc);
    if (dist < minDist) { minDist = dist; currentDegree = i; }
  }

  // Move by interval (in scale degrees)
  const targetDegree = currentDegree + interval;
  const octaveShift = Math.floor(targetDegree / scaleDegrees.length);
  const degInScale = ((targetDegree % scaleDegrees.length) + scaleDegrees.length) % scaleDegrees.length;
  const targetPc = scaleDegrees[degInScale];
  const targetNote = Math.round(noteNum) - pc + targetPc + octaveShift * 12;
  return targetNote;
};

const HarmonyGenerator = ({
  audioContext,
  audioBuffer,        // source vocal buffer
  onHarmonyCreated,   // (harmonyBuffers: [{buffer, name, interval}]) => void
  isEmbedded = false,
}) => {
  const [rootNote, setRootNote] = useState(0);
  const [scaleName, setScaleName] = useState('major');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customIntervals, setCustomIntervals] = useState([3]);
  const [harmonyVolumes, setHarmonyVolumes] = useState({});  // interval -> 0-100
  const [panPositions, setPanPositions] = useState({});       // interval -> -100 to 100
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVoices, setGeneratedVoices] = useState([]);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [dryWet, setDryWet] = useState(50);
  const [detune, setDetune] = useState(5);   // cents of random detune for natural feel
  const [delayMs, setDelayMs] = useState(10);  // ms offset for thickness

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

  const activeIntervals = useMemo(() => {
    const preset = HARMONY_PRESETS[selectedPreset];
    return preset.name === 'Custom' ? customIntervals : preset.intervals;
  }, [selectedPreset, customIntervals]);

  // ── Generate harmony voices ──
  const generateHarmonies = useCallback(async () => {
    if (!audioBuffer || activeIntervals.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setGeneratedVoices([]);

    const ctx = getCtx();
    const sr = audioBuffer.sampleRate;
    const nc = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const windowSize = 2048;
    const hopSize = 512;

    // First: analyze pitch of source
    const sourceData = audioBuffer.getChannelData(0);
    const pitchMap = [];
    for (let i = 0; i + windowSize < sourceData.length; i += hopSize) {
      const chunk = sourceData.slice(i, i + windowSize);
      const freq = detectPitch(chunk, sr);
      pitchMap.push({ pos: i, freq, note: freq > 0 ? noteFromFreq(freq) : -1 });
    }
    setProgress(20);

    const voices = [];

    for (let vi = 0; vi < activeIntervals.length; vi++) {
      const interval = activeIntervals[vi];
      const vol = (harmonyVolumes[interval] ?? 80) / 100;
      const pan = (panPositions[interval] ?? 0) / 100;
      const buf = ctx.createBuffer(nc, len, sr);

      for (let ch = 0; ch < nc; ch++) {
        const input = audioBuffer.getChannelData(ch);
        const out = buf.getChannelData(ch);

        let pmIdx = 0;
        for (let i = 0; i + windowSize < len; i += hopSize) {
          if (pmIdx >= pitchMap.length) break;
          const pm = pitchMap[pmIdx++];

          if (pm.freq <= 0) {
            // Silence — copy with low gain
            for (let j = 0; j < hopSize && (i + j) < len; j++) {
              out[i + j] += input[i + j] * 0.01;
            }
            continue;
          }

          // Calculate target frequency
          const targetNote = getScaleInterval(pm.note, interval, rootNote, scaleDegrees);
          const targetFreq = freqFromNote(targetNote);
          const ratio = targetFreq / pm.freq;

          // Add slight detune and delay for natural feel
          const detuneRatio = 1.0 + (Math.random() - 0.5) * (detune / 100) * 0.02;
          const finalRatio = ratio * detuneRatio;

          // Delay offset in samples
          const delaySamples = Math.round((delayMs / 1000) * sr * (Math.random() * 0.5 + 0.5));

          // Granular pitch shift
          for (let j = 0; j < windowSize && (i + j) < len; j++) {
            const srcIdx = i + j * finalRatio;
            const srcInt = Math.floor(srcIdx);
            const frac = srcIdx - srcInt;
            const outIdx = i + j + delaySamples;

            if (srcInt >= 0 && srcInt + 1 < len && outIdx < len) {
              const shifted = input[srcInt] * (1 - frac) + input[srcInt + 1] * frac;
              const w = 0.5 * (1 - Math.cos(2 * Math.PI * j / windowSize));
              out[outIdx] += shifted * w * vol;
            }
          }
        }
      }

      const intervalLabel = interval > 0 ? `+${interval}` : `${interval}`;
      voices.push({
        buffer: buf,
        name: `Harmony ${intervalLabel}${interval === 12 ? ' (Oct Up)' : interval === -12 ? ' (Oct Down)' : interval === 3 ? ' (3rd)' : interval === 5 ? ' (5th)' : interval === 7 ? ' (7th)' : ''}`,
        interval,
        volume: vol,
        pan,
      });

      setProgress(20 + Math.round(((vi + 1) / activeIntervals.length) * 70));
      await new Promise(r => setTimeout(r, 0));
    }

    setGeneratedVoices(voices);
    setProgress(100);
    setIsProcessing(false);
  }, [audioBuffer, activeIntervals, rootNote, scaleDegrees, harmonyVolumes, panPositions,
      detune, delayMs, getCtx]);

  // ── Preview all voices together ──
  const previewMix = useCallback(() => {
    if (generatedVoices.length === 0 && !audioBuffer) return;
    const ctx = getCtx();

    // Stop any existing preview
    previewNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
    previewNodes.current = [];

    // Play dry vocal
    if (audioBuffer) {
      const dry = ctx.createBufferSource();
      const dryGain = ctx.createGain();
      dryGain.gain.value = dryWet < 100 ? (100 - dryWet) / 100 : 0;
      dry.buffer = audioBuffer;
      dry.connect(dryGain).connect(ctx.destination);
      dry.start();
      previewNodes.current.push(dry);
    }

    // Play each harmony voice
    generatedVoices.forEach(v => {
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      gain.gain.value = v.volume * (dryWet / 100);
      panner.pan.value = v.pan;
      src.buffer = v.buffer;
      src.connect(gain).connect(panner).connect(ctx.destination);
      src.start();
      previewNodes.current.push(src);
    });

    setPreviewPlaying(true);
    const longest = previewNodes.current[0];
    if (longest) longest.onended = () => setPreviewPlaying(false);
  }, [audioBuffer, generatedVoices, dryWet, getCtx]);

  const stopPreview = useCallback(() => {
    previewNodes.current.forEach(n => { try { n.stop(); } catch(e){} });
    previewNodes.current = [];
    setPreviewPlaying(false);
  }, []);

  // ── Send to DAW ──
  const sendToDAW = useCallback(() => {
    if (onHarmonyCreated && generatedVoices.length > 0) {
      onHarmonyCreated(generatedVoices);
    }
  }, [onHarmonyCreated, generatedVoices]);

  // ── Add/remove custom interval ──
  const addCustomInterval = () => setCustomIntervals(prev => [...prev, 3]);
  const removeCustomInterval = (idx) => setCustomIntervals(prev => prev.filter((_, i) => i !== idx));
  const updateCustomInterval = (idx, val) => setCustomIntervals(prev => prev.map((v, i) => i === idx ? val : v));

  // Update volume for an interval
  const setVol = (interval, val) => setHarmonyVolumes(prev => ({ ...prev, [interval]: val }));
  const setPan = (interval, val) => setPanPositions(prev => ({ ...prev, [interval]: val }));

  return (
    <div className="harmony-gen">
      <div className="hg-header">
        <span className="hg-logo">🎶</span>
        <span className="hg-title">HARMONY GENERATOR</span>
        <span className="hg-subtitle">
          {audioBuffer
            ? `${(audioBuffer.duration).toFixed(1)}s vocal loaded`
            : 'No audio — record or select a track first'}
        </span>
      </div>

      <div className="hg-body">
        {/* ── Left: Controls ── */}
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
                <button key={i} className={`hg-preset ${selectedPreset === i ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(i)}>
                  <span className="hg-preset-icon">{p.icon}</span>
                  <span className="hg-preset-name">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {HARMONY_PRESETS[selectedPreset].name === 'Custom' && (
            <div className="hg-section">
              <div className="hg-section-label">Custom Intervals
                <button className="hg-add-btn" onClick={addCustomInterval}>+ Add</button>
              </div>
              {customIntervals.map((iv, idx) => (
                <div key={idx} className="hg-custom-row">
                  <input type="range" min={-24} max={24} value={iv}
                    onChange={e => updateCustomInterval(idx, +e.target.value)} className="hg-slider" />
                  <span className="hg-custom-val">{iv > 0 ? '+' : ''}{iv} st</span>
                  <button className="hg-remove-btn" onClick={() => removeCustomInterval(idx)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Per-voice controls */}
          {activeIntervals.length > 0 && (
            <div className="hg-section">
              <div className="hg-section-label">Voice Levels</div>
              {activeIntervals.map((iv, i) => (
                <div key={i} className="hg-voice-ctrl">
                  <span className="hg-voice-label">{iv > 0 ? '+' : ''}{iv}st</span>
                  <div className="hg-voice-sliders">
                    <div className="hg-mini-param">
                      <span>Vol</span>
                      <input type="range" min={0} max={100} value={harmonyVolumes[iv] ?? 80}
                        onChange={e => setVol(iv, +e.target.value)} className="hg-slider-sm" />
                      <span>{harmonyVolumes[iv] ?? 80}%</span>
                    </div>
                    <div className="hg-mini-param">
                      <span>Pan</span>
                      <input type="range" min={-100} max={100} value={panPositions[iv] ?? 0}
                        onChange={e => setPan(iv, +e.target.value)} className="hg-slider-sm" />
                      <span>{(panPositions[iv] ?? 0) > 0 ? 'R' : (panPositions[iv] ?? 0) < 0 ? 'L' : 'C'}{Math.abs(panPositions[iv] ?? 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="hg-section">
            <div className="hg-section-label">Feel</div>
            <div className="hg-param">
              <label>Detune</label>
              <input type="range" min={0} max={30} value={detune}
                onChange={e => setDetune(+e.target.value)} className="hg-slider" />
              <span>{detune}¢</span>
            </div>
            <div className="hg-param">
              <label>Delay</label>
              <input type="range" min={0} max={50} value={delayMs}
                onChange={e => setDelayMs(+e.target.value)} className="hg-slider" />
              <span>{delayMs}ms</span>
            </div>
            <div className="hg-param">
              <label>Dry/Wet</label>
              <input type="range" min={0} max={100} value={dryWet}
                onChange={e => setDryWet(+e.target.value)} className="hg-slider" />
              <span>{dryWet}%</span>
            </div>
          </div>

          <div className="hg-actions">
            <button className="hg-btn hg-btn-generate" onClick={generateHarmonies}
              disabled={!audioBuffer || isProcessing || activeIntervals.length === 0}>
              {isProcessing ? `⏳ Generating ${progress}%` : '🎶 Generate Harmonies'}
            </button>
            <button className="hg-btn" onClick={previewPlaying ? stopPreview : previewMix}
              disabled={generatedVoices.length === 0}>
              {previewPlaying ? '⏹ Stop' : '▶ Preview Mix'}
            </button>
            <button className="hg-btn hg-btn-send" onClick={sendToDAW}
              disabled={generatedVoices.length === 0}>
              🎚 Send to Tracks
            </button>
          </div>

          {progress > 0 && progress < 100 && (
            <div className="hg-progress">
              <div className="hg-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {/* ── Right: Voice visualization ── */}
        <div className="hg-voices">
          <div className="hg-section-label">Generated Voices ({generatedVoices.length})</div>
          {generatedVoices.length === 0 ? (
            <div className="hg-empty">
              <span>🎤</span>
              <p>Select a harmony type and click Generate to create harmony voices from your vocal.</p>
            </div>
          ) : (
            <div className="hg-voice-list">
              {generatedVoices.map((v, i) => (
                <div key={i} className="hg-voice-card">
                  <div className="hg-voice-info">
                    <span className="hg-voice-name">{v.name}</span>
                    <span className="hg-voice-meta">
                      Vol: {Math.round(v.volume * 100)}% | Pan: {v.pan > 0 ? `R${Math.round(v.pan*100)}` : v.pan < 0 ? `L${Math.round(Math.abs(v.pan)*100)}` : 'C'}
                    </span>
                  </div>
                  <div className="hg-voice-wave">
                    <VoiceWaveform buffer={v.buffer} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Mini waveform display for each voice ──
const VoiceWaveform = ({ buffer }) => {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv || !buffer) return;
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / w);

    c.clearRect(0, 0, w, h);
    c.fillStyle = '#0a1018';
    c.fillRect(0, 0, w, h);

    c.beginPath();
    c.strokeStyle = '#00ffc8';
    c.lineWidth = 1;
    for (let i = 0; i < w; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j] || 0;
        if (d < min) min = d;
        if (d > max) max = d;
      }
      const yMin = ((1 + min) / 2) * h;
      const yMax = ((1 + max) / 2) * h;
      c.moveTo(i, yMin);
      c.lineTo(i, yMax);
    }
    c.stroke();
  }, [buffer]);

  return <canvas ref={cvRef} width={200} height={40} className="hg-mini-wave" />;
};

export default HarmonyGenerator;