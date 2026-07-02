/**
 * SPXCutExportModal.js
 * Resolution presets, codec selector, bitrate, format selects.
 * FFmpeg progress bar, R2 upload, local download.
 * Zero inline CSS.
 */
import React, { useState, useCallback, useRef } from 'react';
import { buildExportPayload, getUnreadyClips } from './hooks/buildExportPayload';

// v1 export resolutions — only the four the backend renderer supports.
// `res` is the exact string the backend's res_map expects.
const EXPORT_PRESETS = [
  { label: '480p',  res: '480p',  w: 854,  h: 480,  fps: 30 },
  { label: '720p',  res: '720p',  w: 1280, h: 720,  fps: 30 },
  { label: '1080p', res: '1080p', w: 1920, h: 1080, fps: 30 },
  { label: '4K',    res: '4k',    w: 3840, h: 2160, fps: 30 },
];

// Backend remuxes to mp4 by default; these are the container choices it accepts via settings.format.
const FORMATS  = ['mp4', 'mov', 'mkv', 'webm'];

function SPXCutExportModal({ state, actions, selectors }) {
  const [activePreset, setActivePreset] = useState(2); // 1080p default
  const [settings, setSettings] = useState({ ...EXPORT_PRESETS[2] });
  const [format,   setFormat]   = useState('mp4');
  const [filename, setFilename] = useState(state.projectName || 'export');
  const [exportTo, setExportTo] = useState('local'); // local | r2
  const [progress, setProgress] = useState(0);
  const [status,   setStatus]   = useState('idle'); // idle | rendering | uploading | done | error
  const [log,      setLog]      = useState('');
  const logRef = useRef(null);

  const appendLog = useCallback((line) => {
    setLog(prev => prev + line + '\n');
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 0);
  }, []);

  const applyPreset = useCallback((i) => {
    setActivePreset(i);
    setSettings({ ...EXPORT_PRESETS[i] });
  }, []);

  const updateSetting = useCallback((key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  }, []);

  const startExport = useCallback(async () => {
    if (status === 'rendering' || status === 'uploading') return;

    const preset = EXPORT_PRESETS[activePreset] || EXPORT_PRESETS[2];

    // ── Readiness gate ──────────────────────────────────────────
    // Block until every video clip has a backend-fetchable source.
    const payload = buildExportPayload(state.tracks, {
      resolution: preset.res,
      frameRate:  settings.fps,
      format,
    });
    const videoClipCount = payload.timeline.tracks.reduce((n, t) => n + t.clips.length, 0);
    if (videoClipCount === 0) {
      setStatus('error');
      setProgress(0);
      setLog('');
      appendLog('[ERROR] No video clips to export — add clips to a video track first.');
      return;
    }
    const unready = getUnreadyClips(state.tracks);
    if (unready.length) {
      setStatus('error');
      setProgress(0);
      setLog('');
      appendLog(`[ERROR] ${unready.length} clip(s) still uploading — wait for upload to finish: ${unready.join(', ')}`);
      return;
    }

    setStatus('rendering');
    setProgress(0);
    setLog('');
    appendLog(`[SPX Cut] Starting export — ${filename}.${format}`);
    appendLog(`[SPX Cut] Resolution: ${preset.res} (${preset.w}x${preset.h}) @ ${settings.fps}fps`);
    appendLog(`[SPX Cut] ${videoClipCount} video clip(s) → rendering on server...`);

    try {
      setProgress(20);
      appendLog('[Server] Uploading timeline & rendering (FFmpeg concat)...');

      const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/video-editor/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success) {
        throw new Error(data.error || `Export failed (${resp.status})`);
      }

      setProgress(100);
      setStatus('done');
      appendLog(`[Server] ${data.message || 'Export complete!'}`);
      if (data.file_size) appendLog(`[Server] Output: ${(data.file_size / 1048576).toFixed(1)} MB · ${data.resolution} · .${data.format}`);
      appendLog(`[Server] URL: ${data.export_url}`);

      if (exportTo === 'local') {
        // Download the real rendered file from R2.
        appendLog('[Export] Starting download...');
        const a = document.createElement('a');
        a.href = data.export_url;
        a.download = `${filename}.${data.format || format}`;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      appendLog(`[ERROR] ${err.message}`);
      setStatus('error');
    }
  }, [status, activePreset, filename, format, settings, exportTo, state, appendLog]);

  const close = useCallback(() => {
    actions.setExportModal(false);
    setStatus('idle');
    setProgress(0);
    setLog('');
  }, [actions]);

  const isExporting = status === 'rendering' || status === 'uploading';

  return (
    <div className="spxcut-modal-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="spxcut-modal">

        <div className="spxcut-modal-header">
          <span className="spxcut-modal-title">Export — {state.projectName}</span>
          <button className="spxcut-modal-close" onClick={close}>✕</button>
        </div>

        <div className="spxcut-modal-body">

          {/* Preset buttons */}
          <div className="spxcut-export-section">
            <div className="spxcut-export-section-title">Quick Presets</div>
            <div className="spxcut-export-presets">
              {EXPORT_PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={`spxcut-export-preset-btn${activePreset === i ? ' preset-active' : ''}`}
                  onClick={() => applyPreset(i)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video settings */}
          <div className="spxcut-export-section">
            <div className="spxcut-export-section-title">Video</div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Resolution</span>
              <span className="spxcut-range-hint">{settings.w} × {settings.h} ({settings.res})</span>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Frame Rate</span>
              <select className="spxcut-form-select" value={settings.fps} onChange={e => updateSetting('fps', parseInt(e.target.value))}>
                {[12,15,23.976,24,25,29.97,30,48,50,59.94,60,120].map(fps => (
                  <option key={fps} value={fps}>{fps} fps</option>
                ))}
              </select>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Format</span>
              <select className="spxcut-form-select" value={format} onChange={e => setFormat(e.target.value)}>
                {FORMATS.map(f => <option key={f} value={f}>.{f.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          {/* Output settings */}
          <div className="spxcut-export-section">
            <div className="spxcut-export-section-title">Output</div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Filename</span>
              <input
                className="spxcut-form-input"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="export"
              />
              <span className="spxcut-form-unit-suffix">.{format}</span>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Destination</span>
              <select className="spxcut-form-select" value={exportTo} onChange={e => setExportTo(e.target.value)}>
                <option value="local">Download Locally</option>
                <option value="r2">Upload to Cloudflare R2</option>
              </select>
            </div>
            {state.inPoint !== null && state.outPoint !== null && (
              <div className="spxcut-form-row">
                <span className="spxcut-form-label">Range</span>
                <span className="spxcut-range-hint">
                  In/Out only ({(state.outPoint - state.inPoint).toFixed(2)}s)
                </span>
              </div>
            )}
          </div>

          {/* Progress */}
          {(isExporting || status === 'done' || status === 'error') && (
            <div className="spxcut-export-section">
              <div className="spxcut-progress-wrap">
                <div className="spxcut-progress-label">
                  <span>{status === 'done' ? '✅ Export Complete' : status === 'error' ? '❌ Export Failed' : status === 'uploading' ? 'Uploading to R2...' : 'Rendering...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="spxcut-progress-bar">
                  <div className="spxcut-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="spxcut-progress-log" ref={logRef}>{log}</div>
            </div>
          )}

        </div>

        <div className="spxcut-modal-footer">
          <button className="spxcut-modal-btn" onClick={close} disabled={isExporting}>
            Cancel
          </button>
          {status === 'done' ? (
            <button className="spxcut-modal-btn mbtn-export" onClick={close}>
              ✓ Done
            </button>
          ) : (
            <button
              className="spxcut-modal-btn mbtn-export"
              onClick={startExport}
              disabled={isExporting || state.duration === 0}
              title={state.duration === 0 ? 'Add clips to timeline first' : 'Start export'}
            >
              {isExporting ? (status === 'uploading' ? '⬆ Uploading...' : '⏳ Rendering...') : '▶ Export'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SPXCutExportModal;
