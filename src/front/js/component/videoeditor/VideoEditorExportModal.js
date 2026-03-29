import React, { useState } from 'react';
import { Download, X, Loader } from 'lucide-react';

const RESOLUTIONS = [
  { group: 'YouTube',       options: [
    { value: 'youtube_4k',   label: 'YouTube 4K (3840x2160 / 60fps)' },
    { value: 'youtube_1080', label: 'YouTube 1080p (1920x1080 / 30fps)' },
    { value: 'youtube_720',  label: 'YouTube 720p (1280x720 / 30fps)' },
  ]},
  { group: 'Social Media',  options: [
    { value: 'instagram_reel',  label: 'Instagram Reel (1080x1920)' },
    { value: 'instagram_post',  label: 'Instagram Post (1080x1080)' },
    { value: 'tiktok',          label: 'TikTok (1080x1920 / 30fps)' },
    { value: 'twitter',         label: 'Twitter/X (1280x720)' },
    { value: 'facebook',        label: 'Facebook (1280x720)' },
  ]},
  { group: 'Broadcast',     options: [
    { value: '4k',    label: '4K Ultra HD (3840x2160)' },
    { value: '1080p', label: 'Full HD (1920x1080)' },
    { value: '720p',  label: 'HD (1280x720)' },
    { value: '480p',  label: 'SD (854x480)' },
  ]},
  { group: 'Film / ProRes', options: [
    { value: 'cinema_4k', label: 'Cinema 4K DCI (4096x2160)' },
    { value: 'cinema_2k', label: 'Cinema 2K DCI (2048x1080)' },
    { value: 'prores',    label: 'ProRes 422 (1920x1080)' },
  ]},
  { group: 'Podcast',       options: [
    { value: 'audio_only',    label: 'Audio Only (AAC/MP3)' },
    { value: 'podcast_video', label: 'Podcast Video (1920x1080 static bg)' },
  ]},
];

export default function VideoEditorExportModal({ tracks, project, frameRate, onClose, onComplete }) {
  const [resolution, setResolution] = useState('1080p');
  const [quality,    setQuality]    = useState('auto');
  const [format,     setFormat]     = useState('mp4');
  const [exporting,  setExporting]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [exportUrl,  setExportUrl]  = useState(null);
  const [error,      setError]      = useState(null);

  const totalClips    = tracks.reduce((s, t) => s + t.clips.length, 0);
  const cloudClips    = tracks.flatMap(t => t.clips).filter(c => c.cloudId || c.r2_key).length;

  const buildExportData = () => {
    const formattedTracks = tracks.map(tr => ({
      id: tr.id, name: tr.name, type: tr.type,
      clips: tr.clips.map(c => ({
        public_id: c.r2_key || c.cloudId || String(c.id),
        url: c.url || c.mediaUrl || null,
        trim: (c.inPoint != null && c.outPoint != null) ? { start: c.inPoint, end: c.outPoint } : null,
        effects: (c.effects || []).filter(e => e.enabled !== false).map(e => ({ id: e.id, value: e.value || 50 })),
        audio: { volume: c.volume ?? 100, muted: c.muted || false },
      })),
      transitions: tr.transitions || [],
    }));
    return {
      timeline: { tracks: formattedTracks },
      settings: { resolution, quality, format, frameRate },
    };
  };

  const handleExport = async () => {
    if (totalClips === 0) { setError('Add clips to the timeline before exporting.'); return; }
    if (cloudClips === 0) { setError('No uploaded clips found. Upload media files first — local files cannot be exported directly.'); return; }

    setExporting(true);
    setProgress(10);
    setError(null);

    try {
      const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const token = localStorage.getItem('jwt-token') || localStorage.getItem('token') || '';
      setProgress(30);

      const r = await fetch(`${BACKEND}/api/video-editor/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(buildExportData()),
      });

      setProgress(80);

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${r.status})`);
      }

      const data = await r.json();
      setProgress(100);

      if (data.export_url || data.url) {
        setExportUrl(data.export_url || data.url);
        onComplete?.(data);
      } else {
        throw new Error(data.error || 'No export URL returned');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `${project?.title || 'export'}.${format}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="spx-export-overlay" onClick={onClose}>
      <div className="spx-export-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="spx-export-header">
          <span className="spx-export-title">Export Video</span>
          <button className="spx-export-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="spx-export-body">
          {!exportUrl ? (
            <>
              {/* Stats */}
              <div style={{ padding:'8px 12px', background:'#0d1117', borderRadius:5, fontSize:11, color:'#8b949e', display:'flex', gap:16 }}>
                <span>Clips: <span style={{ color:'#e6edf3' }}>{totalClips}</span></span>
                <span>Cloud-ready: <span style={{ color: cloudClips > 0 ? '#00ffc8' : '#f85149' }}>{cloudClips}</span></span>
                <span>FPS: <span style={{ color:'#e6edf3' }}>{frameRate}</span></span>
              </div>

              {/* Resolution */}
              <div className="spx-export-row">
                <label className="spx-export-label">Resolution</label>
                <select className="spx-export-select" value={resolution} onChange={e => setResolution(e.target.value)}>
                  {RESOLUTIONS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Quality */}
              <div className="spx-export-row">
                <label className="spx-export-label">Quality</label>
                <select className="spx-export-select" value={quality} onChange={e => setQuality(e.target.value)}>
                  <option value="auto">Auto (Recommended)</option>
                  <option value="best">Best Quality</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Smaller file)</option>
                </select>
              </div>

              {/* Format */}
              <div className="spx-export-row">
                <label className="spx-export-label">Format</label>
                <select className="spx-export-select" value={format} onChange={e => setFormat(e.target.value)}>
                  <option value="mp4">MP4 (Most Compatible)</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV (QuickTime)</option>
                </select>
              </div>

              {/* Error */}
              {error && <div className="spx-export-error">⚠ {error}</div>}

              {/* Progress */}
              {exporting && (
                <div>
                  <div className="spx-export-progress">
                    <div className="spx-export-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div style={{ fontSize:10, color:'#8b949e', marginTop:4, textAlign:'center' }}>
                    {progress}% — Processing on server…
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="spx-export-actions">
                <button className="spx-btn-cancel" onClick={onClose} disabled={exporting}>Cancel</button>
                <button className="spx-btn-export" onClick={handleExport} disabled={exporting}>
                  {exporting ? <><Loader size={13} className="spin" /> Exporting…</> : <><Download size={13} /> Export</>}
                </button>
              </div>
            </>
          ) : (
            /* Success state */
            <div className="spx-export-success">
              <div style={{ fontSize:36 }}>✅</div>
              <h4>Export Complete!</h4>
              <p>Your video is ready to download.</p>
              <button className="spx-export-dl-btn" onClick={handleDownload}>
                <Download size={14} /> Download {format.toUpperCase()}
              </button>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button className="spx-btn-cancel"
                  onClick={() => window.open(exportUrl, '_blank')}>
                  Preview
                </button>
                <button className="spx-btn-cancel"
                  onClick={() => { navigator.clipboard.writeText(exportUrl); console.warn('URL copied!'); }}>
                  Copy URL
                </button>
                <button className="spx-btn-cancel" onClick={onClose}>Close</button>
              </div>
              <div style={{ marginTop:10, width:'100%' }}>
                <input readOnly value={exportUrl}
                  style={{ width:'100%', background:'#0d1117', border:'1px solid #21262d', borderRadius:4,
                    color:'#8b949e', fontSize:10, padding:'5px 8px', fontFamily:'JetBrains Mono,monospace' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
