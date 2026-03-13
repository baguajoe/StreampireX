// =============================================================================
// PodcastRSSPanel.js — RSS Feed Links Panel
// =============================================================================
// Location: src/front/js/component/PodcastRSSPanel.js
//
// Drop into PodcastDashboard or PodcastDetailPage:
//   import PodcastRSSPanel from '../component/PodcastRSSPanel';
//   <PodcastRSSPanel podcastId={podcast.id} isCreator={true} />
//
// Shows:
//   - Public RSS feed URL with copy button + directory submission links
//   - Private member RSS URL (if fan has active subscription)
//   - Creator view: shows both, plus instructions
// =============================================================================

import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const headers  = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

// Directory icons + labels
const DIRECTORIES = [
  { key: 'apple_podcasts',  label: 'Apple Podcasts',  emoji: '🎵', color: '#fc3c44' },
  { key: 'spotify',         label: 'Spotify',          emoji: '🟢', color: '#1db954' },
  { key: 'google_podcasts', label: 'Google',           emoji: '🔵', color: '#4285f4' },
  { key: 'pocket_casts',    label: 'Pocket Casts',     emoji: '🎧', color: '#f43e37' },
  { key: 'overcast',        label: 'Overcast',         emoji: '🟠', color: '#fc7e0f' },
  { key: 'castro',          label: 'Castro',           emoji: '🔴', color: '#00b265' },
];

const S = {
  wrap:    { background: '#0d1520', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, marginTop: 16, fontFamily: 'Inter, system-ui, sans-serif' },
  heading: { fontFamily: 'Orbitron, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', color: '#4a7a90', textTransform: 'uppercase', marginBottom: 14 },
  section: { marginBottom: 20 },
  label:   { fontSize: '0.7rem', fontWeight: 700, color: '#7a9ab0', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' },
  urlRow:  { display: 'flex', alignItems: 'center', gap: 8, background: '#04060c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px' },
  url:     { flex: 1, fontSize: '0.72rem', color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  copyBtn: { flexShrink: 0, padding: '5px 12px', background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.25)', borderRadius: 6, color: '#00ffc8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  dirGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 10 },
  dirBtn:  { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#c0cdd8', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s' },
  note:    { fontSize: '0.7rem', color: '#3a5870', marginTop: 6, lineHeight: 1.5 },
  memberBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(0,255,200,0.08)', border: '1px solid rgba(0,255,200,0.18)', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, color: '#00ffc8', marginLeft: 8 },
  getBtn:  { padding: '9px 18px', background: 'linear-gradient(135deg, #00ffc8, #00d9aa)', color: '#021410', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 4px 14px rgba(0,255,200,0.18)' },
  spinner: { display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(0,255,200,0.3)', borderTopColor: '#00ffc8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6 },
};

export default function PodcastRSSPanel({ podcastId, isCreator = false }) {
  const [publicFeed,  setPublicFeed]  = useState(null);
  const [directories, setDirectories] = useState({});
  const [memberFeed,  setMemberFeed]  = useState(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [copied, setCopied]           = useState('');
  const [error,  setError]            = useState('');

  // Load public RSS link info on mount
  useEffect(() => {
    if (!podcastId) return;
    fetch(`${BACKEND_URL}/api/rss/podcast/${podcastId}/link`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPublicFeed(data.feed_url);
          setDirectories(data.directories || {});
        }
      })
      .catch(() => {});
  }, [podcastId]);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const getMemberFeed = async () => {
    setLoadingMember(true);
    setError('');
    try {
      const res  = await fetch(`${BACKEND_URL}/api/rss/podcast/${podcastId}/member-token`, {
        method: 'POST', headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not get member feed');
      setMemberFeed(data.feed_url);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMember(false);
    }
  };

  if (!publicFeed) return null;

  return (
    <div style={S.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={S.heading}>📡 RSS & Distribution</div>

      {/* ── Public Feed ── */}
      <div style={S.section}>
        <span style={S.label}>Public RSS Feed</span>
        <div style={S.urlRow}>
          <span style={S.url}>{publicFeed}</span>
          <button
            style={{ ...S.copyBtn, ...(copied === 'public' ? { background: 'rgba(0,255,200,0.2)', borderColor: '#00ffc8' } : {}) }}
            onClick={() => copy(publicFeed, 'public')}
          >
            {copied === 'public' ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p style={S.note}>
          Submit this URL to podcast directories to distribute your show worldwide.
        </p>

        {/* Directory links */}
        <div style={S.dirGrid}>
          {DIRECTORIES.map(dir => {
            const url = directories[dir.key];
            if (!url) return null;
            const isSubmitUrl = url.includes('podcastsconnect') || url.includes('podcasters.spotify') || url.includes('podcastsmanager');
            return (
              <a
                key={dir.key}
                href={isSubmitUrl ? url : undefined}
                target={isSubmitUrl ? '_blank' : undefined}
                rel="noopener noreferrer"
                style={{ ...S.dirBtn, textDecoration: 'none' }}
                onClick={!isSubmitUrl ? () => copy(url, dir.key) : undefined}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                <span>{dir.emoji}</span>
                <span>{copied === dir.key ? '✓ Copied' : (isSubmitUrl ? `Submit to ${dir.label}` : dir.label)}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Private Member Feed ── */}
      <div style={{ ...S.section, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={S.label}>
          🌟 Private Member Feed
          <span style={S.memberBadge}>Members Only</span>
        </span>

        {!memberFeed ? (
          <>
            <p style={{ ...S.note, marginBottom: 10, color: '#7a9ab0' }}>
              {isCreator
                ? 'Your paid members get a private RSS URL that includes exclusive episodes. They paste it into any podcast app — Apple Podcasts, Pocket Casts, Overcast, etc.'
                : 'Get your private RSS link to listen to all episodes (including members-only) directly in Apple Podcasts, Spotify, or any podcast app.'}
            </p>
            <button
              style={S.getBtn}
              onClick={getMemberFeed}
              disabled={loadingMember}
            >
              {loadingMember && <span style={S.spinner} />}
              {isCreator ? '🔗 Preview My Member Feed URL' : '🔗 Get My Private RSS Link'}
            </button>
            {error && <p style={{ color: '#ff8090', fontSize: '0.75rem', marginTop: 8 }}>⚠ {error}</p>}
          </>
        ) : (
          <>
            <div style={S.urlRow}>
              <span style={S.url}>{memberFeed}</span>
              <button
                style={{ ...S.copyBtn, ...(copied === 'member' ? { background: 'rgba(0,255,200,0.2)', borderColor: '#00ffc8' } : {}) }}
                onClick={() => copy(memberFeed, 'member')}
              >
                {copied === 'member' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{ ...S.note, color: '#3a7060' }}>
              🔒 This URL is unique to your account. Do not share it — anyone with this link can access your member episodes.
              To add to Apple Podcasts: tap the share icon → "Copy Link" → paste in Apple Podcasts → Add a podcast by URL.
            </p>
          </>
        )}
      </div>
    </div>
  );
}