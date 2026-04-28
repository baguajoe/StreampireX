/**
 * SPXCutExportModal.js
 * Resolution presets, codec selector, bitrate, format selects.
 * FFmpeg progress bar, R2 upload, local download.
 * Zero inline CSS.
 */
import React, { useState, useCallback, useRef } from 'react';

const EXPORT_PRESETS = [
  { label: '4K UHD',      w: 3840, h: 2160, fps: 24, codec: 'h264',  bitrate: 40000 },
  { label: '4K DCI',      w: 4096, h: 2160, fps: 24, codec: 'h264',  bitrate: 50000 },
  { label: '1080p 60',    w: 1920, h: 1080, fps: 60, codec: 'h264',  bitrate: 16000 },
  { label: '1080p 30',    w: 1920, h: 1080, fps: 30, codec: 'h264',  bitrate: 8000  },
  { label: '1080p 24',    w: 1920, h: 1080, fps: 24, codec: 'h264',  bitrate: 6000  },
  { label: '720p 60',     w: 1280, h: 720,  fps: 60, codec: 'h264',  bitrate: 8000  },
  { label: '720p 30',     w: 1280, h: 720,  fps: 30, codec: 'h264',  bitrate: 5000  },
  { label: 'Instagram',   w: 1080, h: 1080, fps: 30, codec: 'h264',  bitrate: 3500  },
  { label: 'TikTok/9:16', w: 1080, h: 1920, fps: 30, codec: 'h264',  bitrate: 4000  },
  { label: 'Twitter',     w: 1280, h: 720,  fps: 30, codec: 'h264',  bitrate: 5000  },
  { label: 'YouTube 4K',  w: 3840, h: 2160, fps: 30, codec: 'h265',  bitrate: 35000 },
  { label: 'ProRes 422',  w: 1920, h: 1080, fps: 24, codec: 'prores',bitrate: 147000},
  { label: 'ProRes 4444', w: 1920, h: 1080, fps: 24, codec: 'prores4444', bitrate: 330000 },
  { label: 'DNxHD 145',   w: 1920, h: 1080, fps: 24, codec: 'dnxhd', bitrate: 145000 },
  { label: 'GIF (512px)', w: 512,  h: 288,  fps: 15, codec: 'gif',   bitrate: 0 },
];

const CODECS   = ['h264', 'h265', 'vp9', 'av1', 'prores', 'prores4444', 'dnxhd', 'gif'];
const FORMATS  = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'mxf', 'gif'];
const PROFILES = ['baseline', 'main', 'high', 'high10'];

function SPXCutExportModal({ state, actions, selectors }) {
  const [activePreset, setActivePreset] = useState(4); // 1080p 24 default
  const [settings, setSettings] = useState({ ...EXPORT_PRESETS[4] });
  const [format,   setFormat]   = useState('mp4');
  const [profile,  setProfile]  = useState('high');
  const [twoPass,  setTwoPass]  = useState(false);
  const [audioCodec, setAudioCodec] = useState('aac');
  const [audioBitrate, setAudioBitrate] = useState(192);
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
    setStatus('rendering');
    setProgress(0);
    setLog('');
    appendLog(`[SPX Cut] Starting export — ${filename}.${format}`);
    appendLog(`[SPX Cut] Resolution: ${settings.w}x${settings.h} @ ${settings.fps}fps`);
    appendLog(`[SPX Cut] Codec: ${settings.codec} | Bitrate: ${settings.bitrate}k`);
    appendLog(`[SPX Cut] Audio: ${audioCodec} @ ${audioBitrate}k`);

    try {
      // Build export data
      const exportData = {
        tracks:    state.tracks,
        duration:  state.duration,
        inPoint:   state.inPoint,
        outPoint:  state.outPoint,
        settings:  { ...settings, format, profile, twoPass, audioCodec, audioBitrate },
        filename:  `${filename}.${format}`,
      };

      appendLog('[FFmpeg] Initializing encoder...');
      setProgress(5);

      // Simulate FFmpeg progress (real integration via useFFmpeg.js)
      const steps = [
        '[FFmpeg] Loading media files...',
        '[FFmpeg] Applying color grade...',
        '[FFmpeg] Applying effects...',
        '[FFmpeg] Encoding video stream...',
        '[FFmpeg] Encoding audio stream...',
        '[FFmpeg] Muxing streams...',
        '[FFmpeg] Writing output file...',
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
        appendLog(steps[i]);
        setProgress(Math.round(10 + (i / (steps.length - 1)) * 80));
      }

      setProgress(90);

      if (exportTo === 'r2') {
        appendLog('[R2] Uploading to Cloudflare R2...');
        setStatus('uploading');
        // POST to Flask backend: /api/video/upload_r2
        const formData = new FormData();
        formData.append('filename', `${filename}.${format}`);
        formData.append('project_id', state.projectId || 'unknown');
        const resp = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/video/upload_r2`, {
          method: 'POST',
          body: formData,
          headers: localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
        });
        if (!resp.ok) throw new Error(`R2 upload failed: ${resp.statusText}`);
        const data = await resp.json();
        appendLog(`[R2] Upload complete: ${data.url}`);
        setProgress(100);
        setStatus('done');
      } else {
        // Local download — in browser context trigger a blob download
        appendLog('[Export] Preparing download...');
        // Real: get blob from FFmpeg.wasm output; here we create a placeholder
        const dummyBlob = new Blob(['SPX Cut Export Placeholder'], { type: 'video/mp4' });
        const url = URL.createObjectURL(dummyBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Delay revoke so download has time to complete
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        appendLog(`[Export] Download started: ${filename}.${format}`);
        setProgress(100);
        setStatus('done');
      }
    } catch (err) {
      appendLog(`[ERROR] ${err.message}`);
      setStatus('error');
    }
  }, [status, filename, format, settings, profile, twoPass, audioCodec, audioBitrate, exportTo, state, appendLog]);

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

          {/* Beta warning */}
          <div className="spxcut-beta-warning">
            <div className="spxcut-beta-warning-title">⚠ Export is in beta</div>
            <div className="spxcut-beta-warning-msg">
              Output is currently a placeholder file. Server-side rendering coming soon.
            </div>
          </div>

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
              <input
                className="spxcut-form-input input-w70"
                type="number" value={settings.w}
                onChange={e => updateSetting('w', parseInt(e.target.value))}
              />
              <span className="spxcut-form-unit-x">×</span>
              <input
                className="spxcut-form-input input-w70"
                type="number" value={settings.h}
                onChange={e => updateSetting('h', parseInt(e.target.value))}
              />
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
              <span className="spxcut-form-label">Codec</span>
              <select className="spxcut-form-select" value={settings.codec} onChange={e => updateSetting('codec', e.target.value)}>
                {CODECS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Bitrate</span>
              <input
                className="spxcut-form-input"
                type="number" value={settings.bitrate}
                onChange={e => updateSetting('bitrate', parseInt(e.target.value))}
              />
              <span className="spxcut-form-unit-suffix">kbps</span>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Profile</span>
              <select className="spxcut-form-select" value={profile} onChange={e => setProfile(e.target.value)}>
                {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Format</span>
              <select className="spxcut-form-select" value={format} onChange={e => setFormat(e.target.value)}>
                {FORMATS.map(f => <option key={f} value={f}>.{f.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="spxcut-form-row">
              <label className="spxcut-form-checkbox">
                <input type="checkbox" checked={twoPass} onChange={e => setTwoPass(e.target.checked)} />
                2-Pass Encoding (slower, better quality)
              </label>
            </div>
          </div>

          {/* Audio settings */}
          <div className="spxcut-export-section">
            <div className="spxcut-export-section-title">Audio</div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Codec</span>
              <select className="spxcut-form-select" value={audioCodec} onChange={e => setAudioCodec(e.target.value)}>
                {['aac','mp3','opus','flac','pcm'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="spxcut-form-row">
              <span className="spxcut-form-label">Bitrate</span>
              <select className="spxcut-form-select" value={audioBitrate} onChange={e => setAudioBitrate(parseInt(e.target.value))}>
                {[96,128,160,192,256,320].map(b => <option key={b} value={b}>{b} kbps</option>)}
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
          <button
            className="spxcut-modal-btn mbtn-export"
            onClick={startExport}
            disabled={isExporting || state.duration === 0}
            title={state.duration === 0 ? 'Add clips to timeline first' : 'Start export'}
          >
            {isExporting ? (status === 'uploading' ? '⬆ Uploading...' : '⏳ Rendering...') : '▶ Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SPXCutExportModal;
