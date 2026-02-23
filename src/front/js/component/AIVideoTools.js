// =============================================================================
// AIVideoTools.js — Free AI Video Editing Tools UI
// =============================================================================
// Location: src/front/js/component/AIVideoTools.js
// Connects to /api/video-tools/* endpoints
// Tools: Silence Detection/Removal, Thumbnail Generator, Auto-Captions
// =============================================================================

import React, { useState, useCallback, useContext } from 'react';
import { Context } from '../store/appContext';
import '../../styles/AIVideoTools.css';

const AIVideoTools = ({ videoUrl, onVideoUpdate, onCaptionsGenerated }) => {
  const { store } = useContext(Context);
  const [activeTool, setActiveTool] = useState(null);

  // Silence Detection
  const [silenceSegments, setSilenceSegments] = useState([]);
  const [silenceStats, setSilenceStats] = useState(null);
  const [threshold, setThreshold] = useState(-30);
  const [minDuration, setMinDuration] = useState(0.5);
  const [removePadding, setRemovePadding] = useState(0.1);

  // Thumbnails
  const [thumbnails, setThumbnails] = useState([]);
  const [thumbCount, setThumbCount] = useState(6);

  // Captions
  const [captions, setCaptions] = useState(null);
  const [captionFormat, setCaptionFormat] = useState('json');
  const [captionLang, setCaptionLang] = useState('en');

  // Shared
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const getHeaders = useCallback(() => {
    const token = store.token || localStorage.getItem('token');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, [store.token]);

  // ==========================================================================
  // SILENCE DETECTION
  // ==========================================================================

  const detectSilence = useCallback(async () => {
    if (!videoUrl) { setError('No video selected'); return; }
    setLoading(true); setError(''); setStatus('Analyzing audio for silence...');

    try {
      const res = await fetch('/api/video-tools/detect-silence', {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ media_url: videoUrl, threshold, min_duration: minDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSilenceSegments(data.segments);
      setSilenceStats({
        total: data.total_silence_seconds,
        pct: data.silence_percentage,
        duration: data.media_duration,
        count: data.segments.length,
      });
      setStatus(data.message);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [videoUrl, threshold, minDuration, getHeaders]);

  const removeSilence = useCallback(async () => {
    if (!videoUrl || silenceSegments.length === 0) return;
    setLoading(true); setError(''); setStatus('Removing silent segments...');

    try {
      const res = await fetch('/api/video-tools/remove-silence', {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ media_url: videoUrl, segments: silenceSegments, padding: removePadding }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatus(`${data.message} — Saved ${data.time_saved}s`);
      if (onVideoUpdate) onVideoUpdate(data.trimmed_url);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [videoUrl, silenceSegments, removePadding, getHeaders, onVideoUpdate]);

  const toggleSegment = useCallback((index) => {
    setSilenceSegments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ==========================================================================
  // THUMBNAIL GENERATOR
  // ==========================================================================

  const generateThumbnails = useCallback(async () => {
    if (!videoUrl) { setError('No video selected'); return; }
    setLoading(true); setError(''); setStatus('Extracting best frames...');

    try {
      const res = await fetch('/api/video-tools/generate-thumbnails', {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ video_url: videoUrl, count: thumbCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setThumbnails(data.thumbnails);
      setStatus(data.message);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [videoUrl, thumbCount, getHeaders]);

  // ==========================================================================
  // AUTO-CAPTIONS
  // ==========================================================================

  const generateCaptions = useCallback(async () => {
    if (!videoUrl) { setError('No video selected'); return; }
    setLoading(true); setError(''); setStatus('Transcribing audio...');

    try {
      const res = await fetch('/api/video-tools/generate-captions', {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ media_url: videoUrl, format: captionFormat, language: captionLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCaptions(data);
      setStatus(data.message);
      if (onCaptionsGenerated) onCaptionsGenerated(data);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [videoUrl, captionFormat, captionLang, getHeaders, onCaptionsGenerated]);

  const downloadCaptions = useCallback(() => {
    if (!captions?.content && !captions?.segments) return;
    const content = captions.content || JSON.stringify(captions.segments, null, 2);
    const ext = captionFormat === 'srt' ? 'srt' : captionFormat === 'vtt' ? 'vtt' : 'json';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `captions.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }, [captions, captionFormat]);

  // ==========================================================================
  // FORMAT HELPERS
  // ==========================================================================

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="ai-video-tools">
      <div className="avt-header">
        <h3 className="avt-title">🎬 AI Video Tools</h3>
        {!videoUrl && <span className="avt-no-video">Select a video to use AI tools</span>}
      </div>

      {/* Tool Tabs */}
      <div className="avt-tabs">
        <button className={`avt-tab ${activeTool === 'silence' ? 'active' : ''}`}
          onClick={() => setActiveTool('silence')}>
          🔇 Silence Removal<span className="avt-tab-badge free">FREE</span>
        </button>
        <button className={`avt-tab ${activeTool === 'thumbnails' ? 'active' : ''}`}
          onClick={() => setActiveTool('thumbnails')}>
          🖼️ Thumbnails<span className="avt-tab-badge free">FREE</span>
        </button>
        <button className={`avt-tab ${activeTool === 'captions' ? 'active' : ''}`}
          onClick={() => setActiveTool('captions')}>
          📝 Auto-Captions
        </button>
      </div>

      {/* Status / Error */}
      {status && <div className="avt-status">{status}</div>}
      {error && <div className="avt-error">⚠️ {error}</div>}

      {/* ================================================================ */}
      {/* SILENCE DETECTION & REMOVAL */}
      {/* ================================================================ */}
      {activeTool === 'silence' && (
        <div className="avt-panel">
          <div className="avt-panel-desc">
            Detect and remove silent segments, dead air, and awkward pauses.
            Perfect for podcasts and talking-head videos.
          </div>

          <div className="avt-settings-row">
            <div className="avt-field">
              <label>Silence Threshold</label>
              <select value={threshold} onChange={e => setThreshold(Number(e.target.value))}>
                <option value={-20}>-20 dB (strict)</option>
                <option value={-25}>-25 dB</option>
                <option value={-30}>-30 dB (default)</option>
                <option value={-35}>-35 dB</option>
                <option value={-40}>-40 dB (lenient)</option>
              </select>
            </div>
            <div className="avt-field">
              <label>Min Duration</label>
              <select value={minDuration} onChange={e => setMinDuration(Number(e.target.value))}>
                <option value={0.3}>0.3s</option>
                <option value={0.5}>0.5s (default)</option>
                <option value={1.0}>1.0s</option>
                <option value={2.0}>2.0s</option>
              </select>
            </div>
            <div className="avt-field">
              <label>Cut Padding</label>
              <select value={removePadding} onChange={e => setRemovePadding(Number(e.target.value))}>
                <option value={0}>0s (tight)</option>
                <option value={0.05}>0.05s</option>
                <option value={0.1}>0.1s (default)</option>
                <option value={0.2}>0.2s (breathing room)</option>
              </select>
            </div>
          </div>

          <div className="avt-actions">
            <button className="avt-btn primary" onClick={detectSilence} disabled={loading || !videoUrl}>
              {loading ? '⏳ Analyzing...' : '🔍 Detect Silence'}
            </button>
            {silenceSegments.length > 0 && (
              <button className="avt-btn danger" onClick={removeSilence} disabled={loading}>
                ✂️ Remove {silenceSegments.length} Silent Segments
              </button>
            )}
          </div>

          {/* Stats */}
          {silenceStats && (
            <div className="avt-silence-stats">
              <div className="avt-stat"><span className="avt-stat-val">{silenceStats.count}</span><span className="avt-stat-label">segments</span></div>
              <div className="avt-stat"><span className="avt-stat-val">{silenceStats.total}s</span><span className="avt-stat-label">total silence</span></div>
              <div className="avt-stat"><span className="avt-stat-val">{silenceStats.pct}%</span><span className="avt-stat-label">of video</span></div>
              <div className="avt-stat"><span className="avt-stat-val">{silenceStats.duration}s</span><span className="avt-stat-label">total duration</span></div>
            </div>
          )}

          {/* Segment List */}
          {silenceSegments.length > 0 && (
            <div className="avt-segments">
              <div className="avt-segments-header">
                <span>Silent segments (click ✕ to keep):</span>
              </div>
              <div className="avt-segment-list">
                {silenceSegments.map((seg, i) => (
                  <div key={i} className="avt-segment-item">
                    <span className="avt-seg-time">{formatTime(seg.start)} → {formatTime(seg.end)}</span>
                    <span className="avt-seg-dur">{seg.duration.toFixed(1)}s</span>
                    <button className="avt-seg-remove" onClick={() => toggleSegment(i)} title="Keep this segment">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* THUMBNAIL GENERATOR */}
      {/* ================================================================ */}
      {activeTool === 'thumbnails' && (
        <div className="avt-panel">
          <div className="avt-panel-desc">
            Automatically extract the sharpest, most detailed frames from your video.
            Pick the best one for your thumbnail.
          </div>

          <div className="avt-settings-row">
            <div className="avt-field">
              <label>Candidates</label>
              <select value={thumbCount} onChange={e => setThumbCount(Number(e.target.value))}>
                <option value={4}>4 thumbnails</option>
                <option value={6}>6 thumbnails</option>
                <option value={8}>8 thumbnails</option>
                <option value={12}>12 thumbnails</option>
              </select>
            </div>
          </div>

          <button className="avt-btn primary" onClick={generateThumbnails} disabled={loading || !videoUrl}>
            {loading ? '⏳ Extracting frames...' : '🖼️ Generate Thumbnails'}
          </button>

          {thumbnails.length > 0 && (
            <div className="avt-thumb-grid">
              {thumbnails.map((thumb, i) => (
                <div key={i} className="avt-thumb-card">
                  <img src={thumb.url} alt={`Thumbnail ${i + 1}`} className="avt-thumb-img" />
                  <div className="avt-thumb-info">
                    <span>{formatTime(thumb.timestamp)}</span>
                    <a href={thumb.url} download={`thumbnail_${i + 1}.jpg`} className="avt-thumb-dl">⬇️</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* AUTO-CAPTIONS */}
      {/* ================================================================ */}
      {activeTool === 'captions' && (
        <div className="avt-panel">
          <div className="avt-panel-desc">
            Transcribe your video and generate styled captions with word-level timing.
            Export as SRT, VTT, or JSON for your video editor.
          </div>

          <div className="avt-settings-row">
            <div className="avt-field">
              <label>Format</label>
              <select value={captionFormat} onChange={e => setCaptionFormat(e.target.value)}>
                <option value="json">JSON (for editor)</option>
                <option value="srt">SRT (subtitle file)</option>
                <option value="vtt">VTT (web captions)</option>
              </select>
            </div>
            <div className="avt-field">
              <label>Language</label>
              <select value={captionLang} onChange={e => setCaptionLang(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>

          <button className="avt-btn primary" onClick={generateCaptions} disabled={loading || !videoUrl}>
            {loading ? '⏳ Transcribing...' : '📝 Generate Captions'}
          </button>

          {captions && (
            <div className="avt-captions-result">
              <div className="avt-captions-header">
                <span>{captions.total_segments} segments transcribed</span>
                <button className="avt-btn small" onClick={downloadCaptions}>
                  ⬇️ Download .{captionFormat}
                </button>
              </div>

              {captions.full_text && (
                <div className="avt-full-text">{captions.full_text}</div>
              )}

              <div className="avt-caption-segments">
                {(captions.segments || []).slice(0, 20).map((seg, i) => (
                  <div key={i} className="avt-caption-seg">
                    <span className="avt-cap-time">{formatTime(seg.start)}</span>
                    <span className="avt-cap-text">{seg.text}</span>
                  </div>
                ))}
                {(captions.segments || []).length > 20 && (
                  <div className="avt-caption-more">
                    ...and {captions.segments.length - 20} more segments
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIVideoTools;