import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

export default function ClipView() {
  const { token } = useParams();
  const [clip, setClip]     = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading]   = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/clips/${token}`)
      .then(r => r.json())
      .then(d => { setClip(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  const onTime = () => {
    if (!audioRef.current) return;
    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
  };

  const seek = (e) => {
    if (!audioRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * audioRef.current.duration;
  };

  const shareUrl = window.location.href;
  const copyShare = () => navigator.clipboard.writeText(shareUrl);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a7088', fontFamily: 'system-ui' }}>
      Loading...
    </div>
  );

  if (!clip) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e53935', fontFamily: 'system-ui' }}>
      Clip not found.
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0d2818 0%, #0d1117 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        {/* Logo */}
        <Link to="/" style={{ color: '#00ffc8', fontWeight: 900, fontSize: '1.2rem', textDecoration: 'none', letterSpacing: 2 }}>
          STREAM<span style={{ color: '#FF6600' }}>PIREX</span>
        </Link>

        {/* Player Card */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 20, padding: 32, marginTop: 24, boxShadow: '0 20px 60px rgba(0,255,200,0.08)' }}>
          {/* Big play button */}
          <button onClick={toggle} style={{ width: 80, height: 80, borderRadius: '50%', background: playing ? '#21262d' : 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', cursor: 'pointer', fontSize: '1.8rem', marginBottom: 20, boxShadow: '0 0 30px rgba(0,255,200,0.3)' }}>
            {playing ? '⏸' : '▶'}
          </button>

          <div style={{ fontWeight: 800, color: '#e6edf3', fontSize: '1.2rem', marginBottom: 4 }}>{clip.title}</div>
          <div style={{ color: '#5a7088', fontSize: '0.85rem', marginBottom: 20 }}>
            by @{clip.creator?.username} · {Math.round(clip.duration)}s · {clip.play_count} plays
          </div>

          {/* Progress bar */}
          <div style={{ background: '#21262d', borderRadius: 6, height: 6, cursor: 'pointer', marginBottom: 24 }} onClick={seek}>
            <div style={{ background: 'linear-gradient(90deg,#00ffc8,#00a896)', height: '100%', borderRadius: 6, width: `${progress}%`, transition: 'width 0.1s' }} />
          </div>

          {clip.clip_url && (
            <audio ref={audioRef} src={clip.clip_url} onTimeUpdate={onTime} onEnded={() => setPlaying(false)} />
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={copyShare}
              style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              🔗 Copy Link
            </button>
            <Link to="/" style={{ background: 'linear-gradient(135deg,#00ffc8,#00a896)', border: 'none', borderRadius: 8, color: '#000', padding: '9px 18px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
              🎵 Open in StreamPireX
            </Link>
          </div>
        </div>

        <div style={{ color: '#30363d', fontSize: '0.72rem', marginTop: 20 }}>
          Shared via StreamPireX · The creator's platform
        </div>
      </div>
    </div>
  );
}
