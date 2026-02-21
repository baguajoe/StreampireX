// =============================================================================
// KeyFinder.js — Audio Key & Scale Detection
// =============================================================================
// Location: src/front/js/component/KeyFinder.js
// Features:
//   - Analyzes any AudioBuffer to detect musical key
//   - FFT-based pitch class profiling (chromagram)
//   - Krumhansl-Schmuckler key-finding algorithm
//   - Shows chromatic note histogram with relative strengths
//   - Displays detected key, scale, confidence %, BPM estimate
//   - Supports drag-drop audio files or analyze from DAW tracks
//   - Cubase dark theme
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';
import '../../styles/KeyFinder.css';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Krumhansl-Kessler key profiles ──
// Major and minor profiles for correlation-based key detection
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// ── Correlation function ──
function correlate(chromagram, profile, rotation) {
  const n = 12;
  let sumXY = 0, sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const x = chromagram[(i + rotation) % n];
    const y = profile[i];
    sumXY += x * y;
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumY2 += y * y;
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

// ── BPM detection using onset autocorrelation ──
function detectBPM(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const len = data.length;

  // Downsample to ~4kHz for speed
  const factor = Math.max(1, Math.floor(sr / 4000));
  const ds = [];
  for (let i = 0; i < len; i += factor) ds.push(Math.abs(data[i]));

  // Onset detection: energy difference
  const frameSize = 128;
  const energies = [];
  for (let i = 0; i < ds.length - frameSize; i += frameSize) {
    let sum = 0;
    for (let j = 0; j < frameSize; j++) sum += ds[i + j] * ds[i + j];
    energies.push(sum / frameSize);
  }

  const onsets = [0];
  for (let i = 1; i < energies.length; i++) {
    onsets.push(Math.max(0, energies[i] - energies[i - 1]));
  }

  // Autocorrelation on onset signal
  const effectiveSR = sr / factor / frameSize;
  const minLag = Math.floor(effectiveSR * 60 / 200); // 200 BPM
  const maxLag = Math.floor(effectiveSR * 60 / 50);  // 50 BPM
  let bestLag = minLag;
  let bestCorr = -1;

  for (let lag = minLag; lag <= Math.min(maxLag, onsets.length / 2); lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < onsets.length - lag; i++) {
      corr += onsets[i] * onsets[i + lag];
      count++;
    }
    corr = count > 0 ? corr / count : 0;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = Math.round(effectiveSR * 60 / bestLag);
  return Math.max(50, Math.min(200, bpm));
}

// ── Main key detection from AudioBuffer ──
function analyzeKey(audioBuffer) {
  const data = audioBuffer.numberOfChannels > 1
    ? mixToMono(audioBuffer)
    : audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;

  // FFT setup
  const fftSize = 8192;
  const hopSize = 4096;
  const chromagram = new Float64Array(12);
  let frameCount = 0;

  // Hann window
  const window = new Float64Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
  }

  // Process frames
  for (let start = 0; start + fftSize <= data.length; start += hopSize) {
    // Apply window
    const frame = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      frame[i] = data[start + i] * window[i];
    }

    // Simple DFT magnitude spectrum (using real FFT approximation)
    // For each pitch class, sum energy in harmonic bins
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      // Check octaves 2-7 for this pitch class
      for (let octave = 2; octave <= 7; octave++) {
        const freq = 440 * Math.pow(2, ((pitchClass - 9) + (octave - 4) * 12) / 12);
        const bin = Math.round(freq * fftSize / sr);
        if (bin >= 1 && bin < fftSize / 2) {
          // Goertzel-like: get magnitude at this bin
          let real = 0, imag = 0;
          const w = 2 * Math.PI * bin / fftSize;
          for (let i = 0; i < fftSize; i++) {
            real += frame[i] * Math.cos(w * i);
            imag -= frame[i] * Math.sin(w * i);
          }
          const mag = Math.sqrt(real * real + imag * imag) / fftSize;
          chromagram[pitchClass] += mag;
        }
      }
    }
    frameCount++;
  }

  // Normalize chromagram
  if (frameCount > 0) {
    for (let i = 0; i < 12; i++) chromagram[i] /= frameCount;
  }
  const maxVal = Math.max(...chromagram);
  const normalizedChroma = Array.from(chromagram).map(v => maxVal > 0 ? v / maxVal : 0);

  // Krumhansl-Schmuckler: correlate with all 24 key profiles
  const results = [];
  for (let root = 0; root < 12; root++) {
    const majCorr = correlate(chromagram, MAJOR_PROFILE, root);
    const minCorr = correlate(chromagram, MINOR_PROFILE, root);
    results.push({ root, mode: 'Major', correlation: majCorr, name: `${NOTE_NAMES[root]} Major` });
    results.push({ root, mode: 'Minor', correlation: minCorr, name: `${NOTE_NAMES[root]} Minor` });
  }

  results.sort((a, b) => b.correlation - a.correlation);
  const best = results[0];
  const secondBest = results[1];

  // Confidence: gap between best and second best
  const confidence = Math.min(99, Math.max(10,
    Math.round(((best.correlation - secondBest.correlation) / Math.abs(best.correlation || 1)) * 200 + 50)
  ));

  // Scale notes
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
  const intervals = best.mode === 'Major' ? majorIntervals : minorIntervals;
  const scaleNotes = intervals.map(i => NOTE_NAMES[(best.root + i) % 12]);

  // BPM
  let bpm = 120;
  try { bpm = detectBPM(audioBuffer); } catch (e) {}

  // Top 5 key candidates
  const candidates = results.slice(0, 5).map(r => ({
    name: r.name,
    correlation: r.correlation,
    confidence: Math.round(Math.max(0, r.correlation * 100)),
  }));

  return {
    key: best.name,
    root: NOTE_NAMES[best.root],
    mode: best.mode,
    confidence,
    scaleNotes,
    chromagram: normalizedChroma,
    bpm,
    candidates,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
}

// Mix stereo to mono
function mixToMono(audioBuffer) {
  const len = audioBuffer.length;
  const mono = new Float32Array(len);
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
  for (let i = 0; i < len; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;
  return mono;
}

// =============================================================================
// KeyFinder React Component
// =============================================================================
const KeyFinder = ({ tracks = [], audioContext, onClose, isEmbedded = false }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(-1);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // ── Analyze an AudioBuffer ──
  const runAnalysis = useCallback((audioBuffer, sourceName = 'Audio') => {
    setAnalyzing(true);
    setError('');
    setResult(null);

    // Run in a timeout to not block UI
    setTimeout(() => {
      try {
        const res = analyzeKey(audioBuffer);
        res.sourceName = sourceName;
        setResult(res);
      } catch (e) {
        setError(`Analysis failed: ${e.message}`);
      } finally {
        setAnalyzing(false);
      }
    }, 50);
  }, []);

  // ── Analyze DAW track ──
  const analyzeTrack = useCallback(() => {
    if (selectedTrack < 0 || !tracks[selectedTrack]) return;
    const track = tracks[selectedTrack];
    if (!track.audioBuffer) {
      setError('Track has no audio loaded');
      return;
    }
    runAnalysis(track.audioBuffer, track.name || `Track ${selectedTrack + 1}`);
  }, [selectedTrack, tracks, runAnalysis]);

  // ── File drop / upload ──
  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('audio/')) {
      setError('Please drop an audio file');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const ab = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(ab);
      runAnalysis(audioBuffer, file.name);
    } catch (e) {
      setError(`Could not decode: ${e.message}`);
      setAnalyzing(false);
    }
  }, [audioContext, runAnalysis]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  };

  // ── Note color mapping ──
  const getNoteColor = (noteName, chromaVal) => {
    const isSharp = noteName.includes('#');
    const alpha = 0.3 + chromaVal * 0.7;
    if (result && result.scaleNotes.includes(noteName)) {
      return `rgba(0, 255, 200, ${alpha})`;
    }
    return `rgba(139, 148, 158, ${alpha * 0.5})`;
  };

  // Available tracks with audio
  const tracksWithAudio = tracks.filter(t => t.audioBuffer).map((t, i) => ({
    index: tracks.indexOf(t),
    name: t.name || `Track ${tracks.indexOf(t) + 1}`,
    color: t.color,
  }));

  return (
    <div className={`keyfinder ${isEmbedded ? 'kf-embedded' : ''}`}>
      {/* ── Header ── */}
      <div className="kf-header">
        <div className="kf-title-row">
          <h3 className="kf-title">
            <span className="kf-icon">🎵</span> Key Finder
          </h3>
          {onClose && (
            <button className="kf-close-btn" onClick={onClose}>✕</button>
          )}
        </div>
        <p className="kf-subtitle">Detect the musical key, scale, and BPM of any audio</p>
      </div>

      <div className="kf-body">
        {/* ── Source Selection ── */}
        <div className="kf-source-panel">
          {/* From DAW tracks */}
          {tracksWithAudio.length > 0 && (
            <div className="kf-source-group">
              <label className="kf-label">Analyze DAW Track</label>
              <div className="kf-track-select-row">
                <select
                  className="kf-select"
                  value={selectedTrack}
                  onChange={e => setSelectedTrack(parseInt(e.target.value))}
                >
                  <option value={-1}>— Select a track —</option>
                  {tracksWithAudio.map(t => (
                    <option key={t.index} value={t.index}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  className="kf-analyze-btn"
                  onClick={analyzeTrack}
                  disabled={selectedTrack < 0 || analyzing}
                >
                  {analyzing ? '⏳ Analyzing...' : '🔍 Detect Key'}
                </button>
              </div>
            </div>
          )}

          {/* File upload / drag-drop */}
          <div className="kf-source-group">
            <label className="kf-label">Or Upload / Drop Audio File</label>
            <div
              className={`kf-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="kf-drop-icon">{dragOver ? '📂' : '🎧'}</span>
              <span className="kf-drop-text">
                {dragOver ? 'Drop audio here...' : 'Click or drag an audio file (MP3, WAV, OGG)'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && <div className="kf-error">⚠ {error}</div>}

        {/* ── Analyzing indicator ── */}
        {analyzing && (
          <div className="kf-analyzing">
            <div className="kf-spinner"></div>
            <span>Analyzing audio frequencies...</span>
          </div>
        )}

        {/* ── Results ── */}
        {result && !analyzing && (
          <div className="kf-results">
            {/* Main result */}
            <div className="kf-main-result">
              <div className="kf-key-display">
                <div className="kf-key-circle">
                  <span className="kf-key-root">{result.root}</span>
                  <span className="kf-key-mode">{result.mode}</span>
                </div>
              </div>
              <div className="kf-key-details">
                <div className="kf-key-name">{result.key}</div>
                <div className="kf-confidence-row">
                  <div className="kf-confidence-bar-bg">
                    <div
                      className="kf-confidence-bar-fill"
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                  <span className="kf-confidence-val">{result.confidence}% confidence</span>
                </div>
                <div className="kf-meta-row">
                  <span className="kf-meta-item">🎵 Scale: {result.scaleNotes.join(' – ')}</span>
                </div>
                <div className="kf-meta-row">
                  <span className="kf-meta-item">🥁 ~{result.bpm} BPM</span>
                  <span className="kf-meta-item">⏱ {result.duration.toFixed(1)}s</span>
                  <span className="kf-meta-item">📄 {result.sourceName}</span>
                </div>
              </div>
            </div>

            {/* Chromagram / Note Histogram */}
            <div className="kf-chromagram">
              <h4 className="kf-section-title">Note Distribution</h4>
              <div className="kf-chroma-bars">
                {NOTE_NAMES.map((note, i) => {
                  const val = result.chromagram[i];
                  const inScale = result.scaleNotes.includes(note);
                  const isRoot = note === result.root;
                  return (
                    <div key={note} className={`kf-chroma-col ${inScale ? 'in-scale' : ''} ${isRoot ? 'is-root' : ''}`}>
                      <div className="kf-chroma-bar-wrap">
                        <div
                          className="kf-chroma-bar"
                          style={{
                            height: `${Math.max(3, val * 100)}%`,
                            background: getNoteColor(note, val),
                          }}
                        ></div>
                      </div>
                      <span className="kf-chroma-label">{note}</span>
                      <span className="kf-chroma-val">{Math.round(val * 100)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alternative keys */}
            <div className="kf-candidates">
              <h4 className="kf-section-title">Top Key Matches</h4>
              <div className="kf-candidate-list">
                {result.candidates.map((c, i) => (
                  <div key={i} className={`kf-candidate ${i === 0 ? 'best' : ''}`}>
                    <span className="kf-cand-rank">#{i + 1}</span>
                    <span className="kf-cand-name">{c.name}</span>
                    <div className="kf-cand-bar-bg">
                      <div
                        className="kf-cand-bar"
                        style={{ width: `${Math.max(5, Math.abs(c.correlation) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="kf-cand-corr">{(c.correlation * 100).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scale reference */}
            <div className="kf-scale-ref">
              <h4 className="kf-section-title">Scale Notes on Keyboard</h4>
              <div className="kf-mini-keyboard">
                {NOTE_NAMES.map((note, i) => {
                  const isBlack = note.includes('#');
                  const inScale = result.scaleNotes.includes(note);
                  const isRoot = note === result.root;
                  return (
                    <div
                      key={note}
                      className={`kf-mini-key ${isBlack ? 'black' : 'white'} ${inScale ? 'in-scale' : ''} ${isRoot ? 'is-root' : ''}`}
                      title={`${note} ${inScale ? '(in scale)' : ''} ${isRoot ? '(root)' : ''}`}
                    >
                      <span className="kf-mini-key-label">{note}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyFinder;
export { analyzeKey, detectBPM };