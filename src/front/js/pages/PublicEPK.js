// =============================================================================
// PublicEPK.js — Public-facing EPK Viewer
// =============================================================================
// Used by: /epk/:slug route (standalone page)
//          ArtistProfilePage (embedded section)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../../styles/PublicEPK.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

// ── Standalone page wrapper (for /epk/:slug route) ──
const PublicEPKPage = () => {
  const { slug } = useParams();
  const [epk, setEpk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/epk/${slug}`);
        if (res.ok) { setEpk(await res.json()); }
        else { setError('EPK not found'); }
      } catch (e) { setError('Failed to load EPK'); }
      finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return <div className="pepk-loading">Loading EPK...</div>;
  if (error) return <div className="pepk-error">{error}</div>;
  if (!epk) return <div className="pepk-error">EPK not found</div>;

  return (
    <div className="pepk-page">
      <EPKView epk={epk} />
    </div>
  );
};

// ── Reusable EPK View (used standalone and embedded in profiles) ──
const EPKView = ({ epk, compact = false }) => {
  if (!epk) return null;

  const socials = epk.social_links || {};
  const hasSocials = Object.values(socials).some(v => v);

  return (
    <div className={`pepk-card ${compact ? 'pepk-compact' : ''} pepk-template-${epk.template || 'modern'}`}
      style={{ '--accent': epk.accent_color || '#00ffc8' }}>

      {/* Cover */}
      {epk.cover_photo && !compact && (
        <div className="pepk-cover">
          <img src={epk.cover_photo} alt="Cover" />
        </div>
      )}

      {/* Header */}
      <div className="pepk-header">
        {epk.profile_photo && (
          <img src={epk.profile_photo} alt={epk.artist_name} className="pepk-avatar" />
        )}
        <div className="pepk-header-info">
          <h1 className="pepk-name">{epk.artist_name}</h1>
          {epk.tagline && <p className="pepk-tagline">{epk.tagline}</p>}
          <div className="pepk-meta">
            {epk.genre_primary && <span className="pepk-genre">{epk.genre_primary}</span>}
            {epk.genre_secondary && <span className="pepk-genre">{epk.genre_secondary}</span>}
            {epk.location && <span className="pepk-location">📍 {epk.location}</span>}
          </div>
          {epk.collab_open && <span className="pepk-collab-badge">🤝 Open for Collabs</span>}
        </div>
      </div>

      {/* Bio */}
      {(epk.bio_full || epk.bio_short) && !compact && (
        <div className="pepk-section">
          <h3>About</h3>
          <p className="pepk-bio">{epk.bio_full || epk.bio_short}</p>
        </div>
      )}
      {compact && epk.bio_short && (
        <p className="pepk-bio-compact">{epk.bio_short}</p>
      )}

      {/* Stats */}
      {epk.stats && Object.keys(epk.stats).length > 0 && (
        <div className="pepk-stats-bar">
          {epk.stats.total_streams > 0 && (
            <div className="pepk-stat"><span className="pepk-stat-num">{formatNum(epk.stats.total_streams)}</span><span className="pepk-stat-label">Streams</span></div>
          )}
          {epk.stats.total_likes > 0 && (
            <div className="pepk-stat"><span className="pepk-stat-num">{formatNum(epk.stats.total_likes)}</span><span className="pepk-stat-label">Likes</span></div>
          )}
          {epk.stats.followers > 0 && (
            <div className="pepk-stat"><span className="pepk-stat-num">{formatNum(epk.stats.followers)}</span><span className="pepk-stat-label">Followers</span></div>
          )}
          {epk.stats.monthly_listeners > 0 && (
            <div className="pepk-stat"><span className="pepk-stat-num">{formatNum(epk.stats.monthly_listeners)}</span><span className="pepk-stat-label">Monthly Listeners</span></div>
          )}
        </div>
      )}

      {/* Skills */}
      {epk.skills && epk.skills.length > 0 && (
        <div className="pepk-section">
          <h3>Skills</h3>
          <div className="pepk-tags">
            {epk.skills.map((s, i) => <span key={i} className="pepk-tag">{s}</span>)}
          </div>
        </div>
      )}

      {/* Press Quotes */}
      {!compact && epk.press_quotes && epk.press_quotes.length > 0 && (
        <div className="pepk-section">
          <h3>Press</h3>
          <div className="pepk-quotes">
            {epk.press_quotes.map((q, i) => (
              <blockquote key={i} className="pepk-quote">
                <p>"{q.quote}"</p>
                {q.source && <cite>— {q.source}</cite>}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {!compact && epk.achievements && epk.achievements.length > 0 && (
        <div className="pepk-section">
          <h3>Achievements</h3>
          <div className="pepk-achievements">
            {epk.achievements.map((a, i) => (
              <div key={i} className="pepk-achievement">
                <span className="pepk-achievement-title">{a.title}</span>
                {a.year && <span className="pepk-achievement-year">{a.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Media */}
      {!compact && epk.featured_media && epk.featured_media.length > 0 && (
        <div className="pepk-section">
          <h3>Featured Media</h3>
          <div className="pepk-media-grid">
            {epk.featured_media.map((m, i) => (
              <div key={i} className="pepk-media-item">
                {m.type === 'video' || m.ext === 'mp4' ? (
                  <video controls src={m.url} className="pepk-media-video" />
                ) : m.type === 'audio' || ['mp3','wav','flac'].includes(m.ext) ? (
                  <div className="pepk-media-audio">
                    <span>🎵 {m.title || 'Audio'}</span>
                    <audio controls src={m.url} />
                  </div>
                ) : (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="pepk-media-link">
                    📄 {m.title || 'Document'}
                  </a>
                )}
                {m.title && <span className="pepk-media-title">{m.title}</span>}
                {m.description && <span className="pepk-media-desc">{m.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Press Photos */}
      {!compact && epk.press_photos && epk.press_photos.length > 0 && (
        <div className="pepk-section">
          <h3>Press Photos</h3>
          <div className="pepk-photo-grid">
            {epk.press_photos.map((p, i) => (
              <div key={i} className="pepk-photo-item">
                <img src={p.url || p} alt={p.caption || `Press photo ${i + 1}`} />
                {p.caption && <span className="pepk-photo-caption">{p.caption}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact / Socials */}
      {!compact && (
        <div className="pepk-section pepk-contact">
          {epk.website && (
            <a href={epk.website} target="_blank" rel="noopener noreferrer" className="pepk-link">🌐 Website</a>
          )}
          {hasSocials && (
            <div className="pepk-socials">
              {socials.spotify && <a href={socials.spotify} target="_blank" rel="noopener noreferrer">Spotify</a>}
              {socials.apple_music && <a href={socials.apple_music} target="_blank" rel="noopener noreferrer">Apple Music</a>}
              {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>}
              {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
              {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer">Twitter/X</a>}
              {socials.tiktok && <a href={socials.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}
              {socials.soundcloud && <a href={socials.soundcloud} target="_blank" rel="noopener noreferrer">SoundCloud</a>}
            </div>
          )}
          {epk.booking_email && (
            <a href={`mailto:${epk.booking_email}`} className="pepk-booking-btn">✉️ Contact for Booking</a>
          )}
        </div>
      )}

      {/* Collab Info */}
      {!compact && epk.collab_open && (
        <div className="pepk-section pepk-collab-info">
          {epk.collab_rate && <p><strong>Rate:</strong> {epk.collab_rate}</p>}
          {epk.preferred_genres && epk.preferred_genres.length > 0 && (
            <div className="pepk-tags">
              {epk.preferred_genres.map((g, i) => <span key={i} className="pepk-tag">{g}</span>)}
            </div>
          )}
          {epk.equipment && epk.equipment.length > 0 && (
            <div>
              <strong>Equipment:</strong>
              <div className="pepk-tags">
                {epk.equipment.map((e, i) => <span key={i} className="pepk-tag pepk-tag-dim">{e}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!compact && (
        <div className="pepk-footer">
          <span>Powered by StreamPireX</span>
          {epk.slug && <Link to={`/epk-hub`} className="pepk-create-link">Create your own EPK →</Link>}
        </div>
      )}
    </div>
  );
};

// ── EPK Cards for Profile Page (multiple EPKs) ──
const ProfileEPKSection = ({ userId }) => {
  const [epks, setEpks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/epk/by-user?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setEpks(data.epks || []);
        }
      } catch (e) { console.error('EPK fetch error:', e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div className="pepk-loading-small">Loading EPKs...</div>;
  if (epks.length === 0) return null; // Don't show section if no EPKs

  return (
    <div className="pepk-profile-section">
      <h2>📋 Electronic Press Kits</h2>
      <div className="pepk-cards-grid">
        {epks.map(epk => (
          <Link key={epk.id || epk.slug} to={`/epk/${epk.slug}`} className="pepk-card-link">
            <EPKView epk={epk} compact={true} />
          </Link>
        ))}
      </div>
    </div>
  );
};

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default PublicEPKPage;
export { EPKView, ProfileEPKSection };