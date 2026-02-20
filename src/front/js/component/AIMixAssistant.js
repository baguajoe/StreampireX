// =============================================================================
// AIMixAssistant.js — AI Mix Assistant Panel for Recording Studio
// =============================================================================
// Location: src/front/js/component/AIMixAssistant.js
// Renders as a slide-out panel in RecordingStudio
// Analyzes tracks client-side (via Web Audio API) OR server-side (via backend)
// Shows per-track suggestions with one-click apply buttons
// =============================================================================

import React, { useState, useCallback } from 'react';
import '../../styles/AIMixAssistant.css';

const GENRES = [
  { id: 'hip_hop', name: 'Hip-Hop / Trap', icon: '🔥' },
  { id: 'pop', name: 'Pop / Top 40', icon: '✨' },
  { id: 'rock', name: 'Rock / Alt', icon: '🎸' },
  { id: 'rnb', name: 'R&B / Soul', icon: '💜' },
  { id: 'edm', name: 'EDM / Electronic', icon: '🎧' },
  { id: 'jazz', name: 'Jazz / Acoustic', icon: '🎷' },
  { id: 'lo_fi', name: 'Lo-Fi / Chill', icon: '🌙' },
  { id: 'podcast', name: 'Podcast / Spoken', icon: '🎙️' },
];

const PRIORITY_COLORS = {
  critical: '#ff3b30',
  high: '#ff9500',
  medium: '#ffcc00',
  low: '#34c759',
};

// ── Client-side analysis via Web Audio API (no backend needed) ──
const analyzeTrackClientSide = async (audioBuffer) => {
  if (!audioBuffer) return null;
  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const len = data.length;

  // RMS
  let sumSq = 0;
  for (let i = 0; i < len; i++) sumSq += data[i] * data[i];
  const rms = Math.sqrt(sumSq / len);
  const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10));

  // Peak
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
  const peakDb = 20 * Math.log10(Math.max(peak, 1e-10));
  const dynamicRangeDb = peakDb - rmsDb;
  const isClipping = peak > 0.99;

  // FFT for frequency bands
  const fftSize = 2048;
  const ctx = new OfflineAudioContext(1, len, sr);
  const src = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, len, sr);
  buf.getChannelData(0).set(data);
  src.buffer = buf;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  src.connect(analyser);
  analyser.connect(ctx.destination);
  src.start(0);

  try { await ctx.startRendering(); } catch(e) {}

  const freqData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqData);

  // Band energy estimation
  const binHz = sr / fftSize;
  const bandRanges = { sub:[20,60], bass:[60,250], low_mid:[250,500], mid:[500,2000], upper_mid:[2000,4000], presence:[4000,8000], brilliance:[8000,16000] };
  const bandEnergy = {};
  let totalE = 0;
  for (const [name, [lo, hi]] of Object.entries(bandRanges)) {
    const loB = Math.floor(lo / binHz), hiB = Math.min(Math.ceil(hi / binHz), freqData.length - 1);
    let e = 0;
    for (let b = loB; b <= hiB; b++) { const v = Math.pow(10, freqData[b] / 10); e += v; }
    bandEnergy[name] = { energy: e, db: Math.round(10 * Math.log10(Math.max(e, 1e-10))) };
    totalE += e;
  }
  for (const name of Object.keys(bandEnergy)) {
    bandEnergy[name].percentage = Math.round((bandEnergy[name].energy / Math.max(totalE, 1e-10)) * 100);
  }

  const bassPct = (bandEnergy.sub?.percentage || 0) + (bandEnergy.bass?.percentage || 0);
  const midPct = (bandEnergy.low_mid?.percentage || 0) + (bandEnergy.mid?.percentage || 0);
  const highPct = (bandEnergy.upper_mid?.percentage || 0) + (bandEnergy.presence?.percentage || 0) + (bandEnergy.brilliance?.percentage || 0);

  // Spectral centroid approximation
  let centNum = 0, centDen = 0;
  for (let b = 0; b < freqData.length; b++) {
    const mag = Math.pow(10, freqData[b] / 20);
    centNum += (b * binHz) * mag;
    centDen += mag;
  }
  const centroid = centDen > 0 ? centNum / centDen : 1000;

  let trackType = 'full_range';
  if (bassPct > 50) trackType = 'bass';
  else if (centroid > 3000) trackType = 'bright';
  else if (centroid < 800) trackType = 'warm';
  else if (midPct > 45) trackType = 'midrange';

  return {
    rms_db: Math.round(rmsDb * 10) / 10,
    peak_db: Math.round(peakDb * 10) / 10,
    dynamic_range_db: Math.round(dynamicRangeDb * 10) / 10,
    spectral_centroid: Math.round(centroid),
    track_type: trackType,
    is_clipping: isClipping,
    band_energy: bandEnergy,
    bass_pct: Math.round(bassPct),
    mid_pct: Math.round(midPct),
    high_pct: Math.round(highPct),
  };
};

// ── Client-side suggestion generator ──
const generateClientSuggestions = (analyses, genre = 'pop') => {
  const PROFILES = {
    hip_hop: { name: 'Hip-Hop', target_dr: 8, bass_emp: 1.3, high_pres: 1.1 },
    pop: { name: 'Pop', target_dr: 10, bass_emp: 1.0, high_pres: 1.15 },
    rock: { name: 'Rock', target_dr: 12, bass_emp: 1.1, high_pres: 1.0 },
    rnb: { name: 'R&B', target_dr: 11, bass_emp: 1.15, high_pres: 1.05 },
    edm: { name: 'EDM', target_dr: 6, bass_emp: 1.25, high_pres: 1.2 },
    jazz: { name: 'Jazz', target_dr: 18, bass_emp: 1.0, high_pres: 0.95 },
    lo_fi: { name: 'Lo-Fi', target_dr: 14, bass_emp: 1.1, high_pres: 0.85 },
    podcast: { name: 'Podcast', target_dr: 8, bass_emp: 0.9, high_pres: 1.1 },
  };
  const profile = PROFILES[genre] || PROFILES.pop;
  const valid = analyses.filter(a => a !== null);
  if (!valid.length) return { suggestions: [], conflicts: [], health_score: 0, summary: 'No tracks to analyze' };

  const avgRms = valid.reduce((s, a) => s + a.rms_db, 0) / valid.length;
  const suggestions = [];
  const conflicts = [];
  let score = 100;

  analyses.forEach((a, i) => {
    if (!a) return;
    const s = { track_index: i, analysis: a, volume: {}, pan: {}, eq: [], compression: {}, warnings: [] };

    // Volume
    const diff = a.rms_db - avgRms;
    if (Math.abs(diff) > 3) {
      const dir = diff > 0 ? 'down' : 'up';
      s.volume = { action: `Turn ${dir} ~${Math.abs(Math.round(diff))}dB`, suggested_value: Math.max(0, Math.min(1, 0.8 + (-diff / 40))), reason: `Track is ${Math.abs(Math.round(diff))}dB ${diff > 0 ? 'louder' : 'quieter'} than average`, priority: Math.abs(diff) > 6 ? 'high' : 'medium' };
      if (Math.abs(diff) > 6) score -= 8;
    } else {
      s.volume = { action: 'Level OK', suggested_value: 0.8, priority: 'low' };
    }

    // Pan
    if (a.track_type === 'bass' || a.bass_pct > 40) {
      s.pan = { action: 'Keep center', suggested_value: 0, reason: 'Bass should stay centered', priority: 'high' };
    } else if (a.track_type === 'bright') {
      const brights = analyses.filter(x => x && x.track_type === 'bright');
      const pos = brights.indexOf(a);
      const pv = pos % 2 === 0 ? 0.4 : -0.4;
      s.pan = { action: `Pan ${pv > 0 ? 'right' : 'left'} ${Math.abs(Math.round(pv * 100))}%`, suggested_value: pv, reason: 'Spread bright elements', priority: 'medium' };
    } else if (a.track_type === 'midrange') {
      const mids = analyses.filter(x => x && x.track_type === 'midrange');
      if (mids.length > 1) {
        const pos = mids.indexOf(a);
        const spread = [-0.3, 0.3, -0.5, 0.5];
        s.pan = { action: `Pan ${spread[pos % 4] > 0 ? 'right' : 'left'}`, suggested_value: spread[pos % 4], reason: 'Separate mid elements', priority: 'medium' };
      } else { s.pan = { action: 'Center', suggested_value: 0, priority: 'low' }; }
    } else { s.pan = { action: 'Center', suggested_value: 0, priority: 'low' }; }

    // EQ
    if (a.band_energy?.sub?.percentage > 15 && a.track_type !== 'bass') {
      s.eq.push({ band: 'sub', action: 'High-pass at 80Hz', frequency: 80, gain_db: -12, priority: 'high' });
      score -= 5;
    }
    if (a.band_energy?.low_mid?.percentage > 25) {
      s.eq.push({ band: 'low_mid', action: 'Cut 2-3dB at 300Hz', frequency: 350, gain_db: -2.5, priority: 'medium' });
    }
    if (a.band_energy?.upper_mid?.percentage > 20 && a.spectral_centroid > 3500) {
      s.eq.push({ band: 'upper_mid', action: 'Cut 2dB at 3kHz', frequency: 3000, gain_db: -2, priority: 'medium' });
    }

    // Compression
    const dr = a.dynamic_range_db;
    if (dr > profile.target_dr + 4) {
      const ratio = Math.min(8, 2 + (dr - profile.target_dr) / 4);
      s.compression = { action: `Add compression (${ratio.toFixed(1)}:1)`, needed: true, suggested_ratio: ratio, suggested_threshold: -20, priority: 'high' };
      score -= 5;
    } else {
      s.compression = { action: 'Dynamics OK', needed: false, priority: 'low' };
    }

    // Clipping
    if (a.is_clipping) {
      s.warnings.push({ type: 'clipping', message: `Clipping detected (peak ${a.peak_db}dB)`, priority: 'critical' });
      score -= 15;
    }

    suggestions.push(s);
  });

  // Conflicts
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const ai = valid[i], aj = valid[j];
      const ii = analyses.indexOf(ai), ij = analyses.indexOf(aj);
      if (ai.bass_pct > 30 && aj.bass_pct > 30) {
        conflicts.push({ tracks: [ii, ij], band: 'bass', message: `Track ${ii+1} & ${ij+1} bass conflict`, suggestion: 'High-pass one at 100Hz', priority: 'high' });
        score -= 10;
      }
      if (ai.track_type === 'midrange' && aj.track_type === 'midrange' && Math.abs(ai.spectral_centroid - aj.spectral_centroid) < 400) {
        conflicts.push({ tracks: [ii, ij], band: 'midrange', message: `Track ${ii+1} & ${ij+1} mid masking`, suggestion: 'Pan apart or EQ complementary', priority: 'medium' });
        score -= 5;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  const highIssues = suggestions.reduce((n, s) => n + s.warnings.filter(w => w.priority === 'critical').length, 0) + conflicts.filter(c => c.priority === 'high').length;
  const summary = score >= 85 ? 'Mix sounds great! Minor tweaks suggested.' : score >= 65 ? `Good foundation — ${highIssues} issue(s) need attention.` : `Mix needs work — ${highIssues} significant issue(s) found.`;

  return { suggestions, conflicts, health_score: score, summary, genre_profile: profile.name, total_tracks_analyzed: valid.length };
};


// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AIMixAssistant = ({
  tracks = [],
  projectId = null,
  onApplyVolume,     // (trackIndex, value) => {}
  onApplyPan,        // (trackIndex, value) => {}
  onApplyEQ,         // (trackIndex, eqSettings) => {}
  onApplyCompression,// (trackIndex, compSettings) => {}
  onClose,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [genre, setGenre] = useState('pop');
  const [expandedTrack, setExpandedTrack] = useState(null);
  const [appliedItems, setAppliedItems] = useState(new Set());
  const [useServer, setUseServer] = useState(false);
  const [error, setError] = useState('');

  const markApplied = (key) => setAppliedItems(prev => new Set([...prev, key]));

  // ── Analyze (client-side or server-side) ──
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError('');
    setResults(null);
    setAppliedItems(new Set());

    try {
      if (useServer && projectId) {
        // Server-side analysis
        const tok = localStorage.getItem('token') || sessionStorage.getItem('token');
        const bu = process.env.REACT_APP_BACKEND_URL || '';
        const res = await fetch(`${bu}/api/ai/mix-assistant/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({ project_id: projectId, genre }),
        });
        const data = await res.json();
        if (data.success) {
          setResults(data);
        } else {
          throw new Error(data.error || 'Analysis failed');
        }
      } else {
        // Client-side analysis via Web Audio API
        const tracksWithAudio = tracks.filter(t => t.audioBuffer);
        if (!tracksWithAudio.length) {
          setError('No tracks with audio to analyze. Record or import audio first.');
          setAnalyzing(false);
          return;
        }

        const analyses = await Promise.all(
          tracks.map(async (t) => {
            if (!t.audioBuffer) return null;
            return await analyzeTrackClientSide(t.audioBuffer);
          })
        );

        const result = generateClientSuggestions(analyses, genre);
        setResults(result);
      }
    } catch (e) {
      setError(e.message || 'Analysis failed');
    }
    setAnalyzing(false);
  }, [tracks, genre, projectId, useServer]);

  // ── Apply handlers ──
  const applyVolume = (trackIdx, value) => {
    onApplyVolume?.(trackIdx, value);
    markApplied(`vol-${trackIdx}`);
  };

  const applyPan = (trackIdx, value) => {
    onApplyPan?.(trackIdx, value);
    markApplied(`pan-${trackIdx}`);
  };

  const applyEQ = (trackIdx, eq) => {
    onApplyEQ?.(trackIdx, eq);
    markApplied(`eq-${trackIdx}-${eq.band}`);
  };

  const applyCompression = (trackIdx, comp) => {
    onApplyCompression?.(trackIdx, comp);
    markApplied(`comp-${trackIdx}`);
  };

  const applyAll = () => {
    if (!results?.suggestions) return;
    results.suggestions.forEach(s => {
      const i = s.track_index;
      if (s.volume?.suggested_value != null && s.volume.priority !== 'low') applyVolume(i, s.volume.suggested_value);
      if (s.pan?.suggested_value != null && s.pan.priority !== 'low') applyPan(i, s.pan.suggested_value);
      if (s.compression?.needed) applyCompression(i, s.compression);
    });
  };

  // ── Health score color ──
  const scoreColor = (score) => {
    if (score >= 85) return '#34c759';
    if (score >= 65) return '#ffcc00';
    if (score >= 40) return '#ff9500';
    return '#ff3b30';
  };

  const priorityIcon = (p) => {
    if (p === 'critical') return '🔴';
    if (p === 'high') return '🟠';
    if (p === 'medium') return '🟡';
    return '🟢';
  };

  return (
    <div className="ai-mix-panel">
      {/* Header */}
      <div className="ai-mix-header">
        <div className="ai-mix-title">
          <span className="ai-mix-icon">🤖</span>
          <span>AI Mix Assistant</span>
        </div>
        <button className="ai-mix-close" onClick={onClose}>✕</button>
      </div>

      {/* Genre Selection */}
      <div className="ai-mix-section">
        <label className="ai-mix-label">Genre Profile</label>
        <div className="ai-mix-genres">
          {GENRES.map(g => (
            <button
              key={g.id}
              className={`ai-mix-genre-btn ${genre === g.id ? 'active' : ''}`}
              onClick={() => setGenre(g.id)}
            >
              <span>{g.icon}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Mode Toggle */}
      {projectId && (
        <div className="ai-mix-section ai-mix-mode">
          <button
            className={`ai-mix-mode-btn ${!useServer ? 'active' : ''}`}
            onClick={() => setUseServer(false)}
          >⚡ Instant (Browser)</button>
          <button
            className={`ai-mix-mode-btn ${useServer ? 'active' : ''}`}
            onClick={() => setUseServer(true)}
          >🧠 Deep (Server)</button>
        </div>
      )}

      {/* Analyze Button */}
      <div className="ai-mix-section">
        <button
          className="ai-mix-analyze-btn"
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <><span className="ai-mix-spinner"></span> Analyzing {tracks.filter(t=>t.audioBuffer).length} tracks...</>
          ) : (
            <><span>🎛️</span> Analyze Mix</>
          )}
        </button>
      </div>

      {error && <div className="ai-mix-error">{error}</div>}

      {/* Results */}
      {results && (
        <div className="ai-mix-results">
          {/* Health Score */}
          <div className="ai-mix-health">
            <div className="ai-mix-health-ring" style={{ '--score-color': scoreColor(results.health_score) }}>
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor(results.health_score)} strokeWidth="8"
                  strokeDasharray={`${results.health_score * 3.14} 314`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
              </svg>
              <div className="ai-mix-health-value">{results.health_score}</div>
            </div>
            <div className="ai-mix-health-info">
              <div className="ai-mix-health-label">Mix Health</div>
              <div className="ai-mix-health-summary">{results.summary}</div>
              <div className="ai-mix-health-meta">
                {results.total_tracks_analyzed} tracks · {results.genre_profile}
              </div>
            </div>
          </div>

          {/* Apply All */}
          <button className="ai-mix-apply-all" onClick={applyAll}>
            ✨ Apply All Suggestions
          </button>

          {/* Conflicts */}
          {results.conflicts?.length > 0 && (
            <div className="ai-mix-conflicts">
              <div className="ai-mix-section-title">⚠️ Frequency Conflicts</div>
              {results.conflicts.map((c, ci) => (
                <div key={ci} className="ai-mix-conflict" data-priority={c.priority}>
                  <div className="ai-mix-conflict-header">
                    {priorityIcon(c.priority)} {c.message}
                  </div>
                  <div className="ai-mix-conflict-fix">💡 {c.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Per-Track Suggestions */}
          <div className="ai-mix-section-title">🎚️ Per-Track Suggestions</div>
          {results.suggestions?.map((s, si) => {
            const track = tracks[s.track_index];
            if (!track) return null;
            const isExpanded = expandedTrack === s.track_index;
            const hasIssues = s.warnings.length > 0 || s.volume.priority === 'high' || s.compression?.needed || s.eq.length > 0;

            return (
              <div key={si} className={`ai-mix-track ${isExpanded ? 'expanded' : ''} ${hasIssues ? 'has-issues' : ''}`}>
                <div className="ai-mix-track-header" onClick={() => setExpandedTrack(isExpanded ? null : s.track_index)}>
                  <div className="ai-mix-track-color" style={{ background: track.color }}></div>
                  <span className="ai-mix-track-name">{track.name}</span>
                  <span className="ai-mix-track-type">{s.analysis?.track_type || 'unknown'}</span>
                  {s.warnings.length > 0 && <span className="ai-mix-track-warn">⚠ {s.warnings.length}</span>}
                  <span className="ai-mix-track-chevron">{isExpanded ? '▾' : '▸'}</span>
                </div>

                {isExpanded && (
                  <div className="ai-mix-track-body">
                    {/* Warnings */}
                    {s.warnings.map((w, wi) => (
                      <div key={wi} className="ai-mix-item critical">
                        <span className="ai-mix-item-icon">🔴</span>
                        <span className="ai-mix-item-text">{w.message}</span>
                      </div>
                    ))}

                    {/* Volume */}
                    {s.volume.priority !== 'low' && (
                      <div className="ai-mix-item" data-priority={s.volume.priority}>
                        <span className="ai-mix-item-icon">{priorityIcon(s.volume.priority)}</span>
                        <div className="ai-mix-item-content">
                          <div className="ai-mix-item-action">📊 Volume: {s.volume.action}</div>
                          <div className="ai-mix-item-reason">{s.volume.reason}</div>
                        </div>
                        <button
                          className={`ai-mix-apply-btn ${appliedItems.has(`vol-${s.track_index}`) ? 'applied' : ''}`}
                          onClick={() => applyVolume(s.track_index, s.volume.suggested_value)}
                        >
                          {appliedItems.has(`vol-${s.track_index}`) ? '✓' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Pan */}
                    {s.pan.priority !== 'low' && (
                      <div className="ai-mix-item" data-priority={s.pan.priority}>
                        <span className="ai-mix-item-icon">{priorityIcon(s.pan.priority)}</span>
                        <div className="ai-mix-item-content">
                          <div className="ai-mix-item-action">🔊 Pan: {s.pan.action}</div>
                          <div className="ai-mix-item-reason">{s.pan.reason}</div>
                        </div>
                        <button
                          className={`ai-mix-apply-btn ${appliedItems.has(`pan-${s.track_index}`) ? 'applied' : ''}`}
                          onClick={() => applyPan(s.track_index, s.pan.suggested_value)}
                        >
                          {appliedItems.has(`pan-${s.track_index}`) ? '✓' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* EQ */}
                    {s.eq.map((eq, ei) => (
                      <div key={ei} className="ai-mix-item" data-priority={eq.priority}>
                        <span className="ai-mix-item-icon">{priorityIcon(eq.priority)}</span>
                        <div className="ai-mix-item-content">
                          <div className="ai-mix-item-action">🎛️ EQ: {eq.action}</div>
                          <div className="ai-mix-item-reason">{eq.band} band · {eq.gain_db > 0 ? '+' : ''}{eq.gain_db}dB at {eq.frequency}Hz</div>
                        </div>
                        <button
                          className={`ai-mix-apply-btn ${appliedItems.has(`eq-${s.track_index}-${eq.band}`) ? 'applied' : ''}`}
                          onClick={() => applyEQ(s.track_index, eq)}
                        >
                          {appliedItems.has(`eq-${s.track_index}-${eq.band}`) ? '✓' : 'Apply'}
                        </button>
                      </div>
                    ))}

                    {/* Compression */}
                    {s.compression?.needed && (
                      <div className="ai-mix-item" data-priority={s.compression.priority}>
                        <span className="ai-mix-item-icon">{priorityIcon(s.compression.priority)}</span>
                        <div className="ai-mix-item-content">
                          <div className="ai-mix-item-action">🗜️ {s.compression.action}</div>
                          <div className="ai-mix-item-reason">{s.compression.reason}</div>
                        </div>
                        <button
                          className={`ai-mix-apply-btn ${appliedItems.has(`comp-${s.track_index}`) ? 'applied' : ''}`}
                          onClick={() => applyCompression(s.track_index, s.compression)}
                        >
                          {appliedItems.has(`comp-${s.track_index}`) ? '✓' : 'Apply'}
                        </button>
                      </div>
                    )}

                    {/* Frequency breakdown mini bar */}
                    {s.analysis && (
                      <div className="ai-mix-freq-bar">
                        <div className="ai-mix-freq-segment bass" style={{ width: `${s.analysis.bass_pct}%` }} title={`Bass: ${s.analysis.bass_pct}%`}></div>
                        <div className="ai-mix-freq-segment mid" style={{ width: `${s.analysis.mid_pct}%` }} title={`Mid: ${s.analysis.mid_pct}%`}></div>
                        <div className="ai-mix-freq-segment high" style={{ width: `${s.analysis.high_pct}%` }} title={`High: ${s.analysis.high_pct}%`}></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIMixAssistant;