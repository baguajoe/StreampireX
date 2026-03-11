import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

export default function EmbeddablePlayer() {
  const { type, id } = useParams();
  const [track, setTrack]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading]   = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const ep = type === 'beat' ? `/api/beats/${id}` : `/api/tracks/${id}`;
    fetch(`${BACKEND}${ep}`)
      .then(r => r.json())
      .then(d => { setTrack(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type, id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct || 0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  if (loading) return (
    <div style={{ background: '#0d1117', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a7088', fontFamily: 'system-ui', fontSize: '0.8rem' }}>
      Loading...
    </div>
  );

  if (!track) return (
    <div style={{ background: '#0d1117', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53935', fontFamily: 'system-ui', fontSize: '0.8rem' }}>
      Track not found
    </div>
  );

  const audio_url = track.audio_url || track.file_url || track.preview_url || '';
  const title     = track.title || 'Untitled';
  const artist    = track.artist_name || track.producer_name || track.username || 'StreamPireX';
  const cover     = track.cover_art || track.artwork_url || track.image_url;

  return (
    <div style={{ background: 'linear-gradient(135deg,#0d1117,#161b22)', border: '1px solid #21262d', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'system-ui', maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {audio_url && (
        <audio ref={audioRef} src={audio_url} onTimeUpdate={handleTimeUpdate} onEnded={() => setPlaying(false)} />
      )}

      {/* Cover */}
      <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#21262d' }}>
        {cover ? <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🎵</div>}
      </div>

      {/* Info + Progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#e6edf3', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ color: '#5a7088', fontSize: '0.75rem', marginBottom: 8 }}>{artist}</div>
        <div style={{ background: '#21262d', borderRadius: 4, height: 4, cursor: 'pointer', position: 'relative' }} onClick={handleSeek}>
          <div style={{ background: '#00ffc8', height: '100%', borderRadius: 4, width: `${progress}%`, transition: 'width 0.1s' }} />
        </div>
      </div>

      {/* Play button */}
      <button onClick={togglePlay} disabled={!audio_url}
        style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', cursor: audio_url ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: audio_url ? 1 : 0.4 }}>
        <span style={{ color: '#000', fontWeight: 900, fontSize: '1rem', marginLeft: playing ? 0 : 2 }}>
          {playing ? '⏸' : '▶'}
        </span>
      </button>

      {/* Branding */}
      <a href="https://streampirex.com" target="_blank" rel="noreferrer"
        style={{ color: '#00ffc8', fontSize: '0.6rem', fontWeight: 700, textDecoration: 'none', flexShrink: 0, opacity: 0.7 }}>
        SPX
      </a>
    </div>
  );
}

// Embed code generator component
export function EmbedCodeGenerator({ type, id }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = `https://streampirex.com/embed/${type}/${id}`;
  const iframeCode = `<iframe src="${embedUrl}" width="480" height="90" frameborder="0" allowtransparency="true" allow="autoplay"></iframe>`;

  const copy = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '0.85rem', marginBottom: 8 }}>🔗 Embed this track</div>
      <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#8b949e', wordBreak: 'break-all', marginBottom: 10 }}>
        {iframeCode}
      </div>
      <button onClick={copy}
        style={{ background: copied ? '#21262d' : 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 6, color: copied ? '#00ffc8' : '#000', fontWeight: 700, padding: '7px 16px', cursor: 'pointer', fontSize: '0.8rem' }}>
        {copied ? '✅ Copied!' : 'Copy Embed Code'}
      </button>
    </div>
  );
}
