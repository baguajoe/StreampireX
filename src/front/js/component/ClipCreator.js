import React, { useState } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function ClipCreator({ sourceUrl, sourceTitle, contentType = 'track', sourceId, onClipCreated }) {
  const [start, setStart]       = useState(0);
  const [duration, setDuration] = useState(30);
  const [title, setTitle]       = useState(sourceTitle ? `${sourceTitle} (clip)` : 'My Clip');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [copied, setCopied]     = useState(false);

  const createClip = async () => {
    if (!sourceUrl) return alert('No source audio URL');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/clips/create`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ source_url: sourceUrl, start_time: start, duration, title, content_type: contentType, source_id: sourceId })
      });
      const d = await res.json();
      if (d.success) {
        setResult(d.clip);
        onClipCreated && onClipCreated(d.clip);
      } else {
        alert(d.error || 'Clip creation failed');
      }
    } catch (e) {
      alert('Error creating clip');
    }
    setLoading(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${result.share_url}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const S = {
    wrap:   { background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: 20 },
    title:  { fontWeight: 700, color: '#e6edf3', marginBottom: 16, fontSize: '0.95rem' },
    row:    { display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
    label:  { color: '#8b949e', fontSize: '0.72rem', marginBottom: 4, display: 'block' },
    input:  { background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '8px 12px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
    btn:    { background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, padding: '9px 20px', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' },
    success:{ background: '#0d2818', border: '1px solid #00ffc840', borderRadius: 10, padding: 16, marginTop: 12 },
  };

  return (
    <div style={S.wrap}>
      <div style={S.title}>✂️ Create Shareable Clip</div>

      <div style={S.row}>
        <div style={{ flex: 2 }}>
          <label style={S.label}>Clip Title</label>
          <input style={S.input} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>

      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Start Time (seconds)</label>
          <input style={S.input} type="number" min="0" value={start} onChange={e => setStart(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Duration (max 60s)</label>
          <input style={S.input} type="number" min="5" max="60" value={duration} onChange={e => setDuration(Math.min(60, Number(e.target.value)))} />
        </div>
        <button style={{ ...S.btn, alignSelf: 'flex-end' }} onClick={createClip} disabled={loading}>
          {loading ? '⏳ Creating...' : '✂️ Create Clip'}
        </button>
      </div>

      {result && (
        <div style={S.success}>
          <div style={{ color: '#00ffc8', fontWeight: 700, marginBottom: 8 }}>✅ Clip ready!</div>
          {result.clip_url && (
            <audio controls style={{ width: '100%', marginBottom: 10, height: 32 }}>
              <source src={result.clip_url} type="audio/mpeg" />
            </audio>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btn} onClick={copyLink}>
              {copied ? '✅ Copied!' : '🔗 Copy Share Link'}
            </button>
            <a href={result.share_url} target="_blank" rel="noreferrer"
              style={{ ...S.btn, background: '#21262d', color: '#e6edf3', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              👁 Preview
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
