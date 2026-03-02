// =============================================================================
// EPKCollabHub.js — EPK Builder + Collab Marketplace (Unified)
// =============================================================================
// Three-tab interface:
//   1. MY EPK — Build/edit your Electronic Press Kit
//   2. COLLAB BOARD — Browse & post collaboration requests
//   3. FIND ARTISTS — Search EPKs for matching (skills, genre, location)
//
// The EPK is the artist's professional identity card. When you apply to a
// collab request, your EPK is automatically attached as your pitch/resume.
// When someone searches for collaborators, they browse EPKs.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/EPKCollabHub.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://streampirex-api.up.railway.app';
const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

const GENRES = [
  'Hip-Hop', 'R&B', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Country', 'Latin',
  'Afrobeats', 'Reggae', 'Soul', 'Gospel', 'Classical', 'Indie', 'Metal',
  'Punk', 'Lo-Fi', 'Trap', 'Drill', 'House', 'Techno', 'DnB', 'Dancehall',
  'K-Pop', 'Amapiano', 'Funk', 'Blues', 'Folk', 'Alternative', 'Other',
];

const SKILLS = [
  'Vocalist', 'Rapper', 'Producer', 'Beat Maker', 'Songwriter', 'Mix Engineer',
  'Mastering Engineer', 'Session Guitarist', 'Session Bassist', 'Session Drummer',
  'Session Keys', 'DJ', 'Violinist', 'Trumpet', 'Saxophone', 'Flute',
  'Sound Designer', 'Composer', 'Arranger', 'Vocal Coach', 'Topline Writer',
  'Ghost Producer', 'Music Video Director', 'Graphic Designer', 'Photographer',
];

const TEMPLATES = [
  { id: 'modern', name: 'Modern', desc: 'Clean lines, teal accents' },
  { id: 'bold', name: 'Bold', desc: 'High contrast, orange energy' },
  { id: 'minimal', name: 'Minimal', desc: 'White space, elegant' },
  { id: 'dark', name: 'Dark', desc: 'Deep blacks, neon glow' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const EPKCollabHub = () => {
  const [activeTab, setActiveTab] = useState('epk'); // epk | collab | find
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // ── EPK State ──
  const EMPTY_EPK = {
    artist_name: '', tagline: '', bio_short: '', bio_full: '',
    genre_primary: '', genre_secondary: '', location: '',
    booking_email: '', management_name: '', management_email: '',
    label_name: '', website: '', social_links: {},
    profile_photo: '', cover_photo: '', press_photos: [], logo_url: '',
    achievements: [], stats: {}, press_quotes: [],
    featured_tracks: [], featured_videos: [], featured_albums: [],
    rider: '', stage_plot_url: '', featured_media: [],
    skills: [], collab_open: true, collab_rate: '',
    preferred_genres: [], equipment: [],
    template: 'modern', accent_color: '#00ffc8',
    is_public: true, slug: '',
  };
  const [epk, setEpk] = useState(EMPTY_EPK);
  const [epkDirty, setEpkDirty] = useState(false);
  const [epkSection, setEpkSection] = useState('identity'); // identity | contact | media | achievements | collab | template

  // ── Collab Board State ──
  const [collabRequests, setCollabRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [collabView, setCollabView] = useState('browse'); // browse | my-posts | my-apps | new-post
  const [newRequest, setNewRequest] = useState({
    title: '', description: '', genre: '', roles_needed: [], budget: '',
    deadline: '', reference_track_url: '', reference_notes: '',
  });
  const [applyingTo, setApplyingTo] = useState(null);
  const [applyForm, setApplyForm] = useState({ message: '', proposed_rate: '', sample_url: '' });
  const [viewingApps, setViewingApps] = useState(null); // request id
  const [applications, setApplications] = useState([]);

  // ── Find Artists State ──
  const [searchResults, setSearchResults] = useState([]);
  const [searchGenre, setSearchGenre] = useState('');
  const [searchSkill, setSearchSkill] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCollabOnly, setSearchCollabOnly] = useState(true);
  const [viewingEpk, setViewingEpk] = useState(null);

  // ── Platform Content (auto-populated from existing data) ──
  const [platformContent, setPlatformContent] = useState(null); // { tracks, albums, videos, stats, profile }

  // ── Messaging ──
  const [msgModal, setMsgModal] = useState(null); // { recipientId, recipientName, contextType, contextId }
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);

  // ── Commercial Generator ──
  const [comStyle, setComStyle] = useState('cinematic');
  const [comQuality, setComQuality] = useState('standard');
  const [comCustomPrompt, setComCustomPrompt] = useState('');
  const [comUsePhoto, setComUsePhoto] = useState(true);
  const [comGenerating, setComGenerating] = useState(false);
  const [comResult, setComResult] = useState(null);

  const generateCommercial = async () => {
    setComGenerating(true); setComResult(null); setError('');
    try {
      const res = await fetch(`${BACKEND}/api/epk/generate-commercial`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          style: comStyle, quality: comQuality,
          custom_prompt: comCustomPrompt, use_photo: comUsePhoto,
          aspect_ratio: '16:9',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComResult(data);
        setStatus(`✓ Commercial generated! ${data.credits_used} credit${data.credits_used > 1 ? 's' : ''} used`);
        loadEpk(); // Refresh to show new video in featured_media
      } else {
        setError(data.error || 'Generation failed');
        if (data.credits_refunded) setStatus(`Credits refunded: ${data.credits_refunded}`);
      }
    } catch (e) { setError(e.message); }
    finally { setComGenerating(false); }
  };

  const sendCollabMessage = async () => {
    if (!msgModal || !msgText.trim()) return;
    setMsgSending(true);
    try {
      const res = await fetch(`${BACKEND}/api/collab/message`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          recipient_id: msgModal.recipientId,
          message: msgText.trim(),
          context_type: msgModal.contextType || '',
          context_id: msgModal.contextId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`✓ Message sent to ${msgModal.recipientName}`);
        setMsgModal(null); setMsgText('');
      } else { setError(data.error || 'Failed to send'); }
    } catch (e) { setError(e.message); }
    finally { setMsgSending(false); }
  };

  // ── Filter state for collab board ──
  const [filterGenre, setFilterGenre] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // ══════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════

  const loadEpk = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/epk`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEpk(prev => ({ ...prev, ...data }));
        setEpkDirty(false);
      }
      // If not ok (404, 500), keep the EMPTY_EPK defaults — builder still renders
    } catch (e) { console.error('Load EPK error:', e); }
  }, []);

  const loadPlatformContent = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/epk/auto-populate`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setPlatformContent(data); }
    } catch (e) { console.error('Auto-populate error:', e); }
  }, []);

  const saveEpk = useCallback(async () => {
    if (!epk) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/epk`, {
        method: epk.id ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(epk),
      });
      const data = await res.json();
      if (res.ok) {
        setEpk(data.epk);
        setEpkDirty(false);
        setStatus('✓ EPK saved');
      } else { setError(data.error || 'Save failed'); }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [epk]);

  const loadCollabRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'open' });
      if (filterGenre) params.set('genre', filterGenre);
      if (filterRole) params.set('role', filterRole);
      const res = await fetch(`${BACKEND}/api/collab/requests?${params}`);
      if (res.ok) { const data = await res.json(); setCollabRequests(data.requests || []); }
    } catch (e) { console.error('Load collabs error:', e); }
  }, [filterGenre, filterRole]);

  const loadMyRequests = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/collab/my-requests`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setMyRequests(data.requests || []); }
    } catch (e) {}
  }, []);

  const loadMyApplications = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/collab/my-applications`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setMyApplications(data.applications || []); }
    } catch (e) {}
  }, []);

  const searchEpks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchGenre) params.set('genre', searchGenre);
      if (searchSkill) params.set('skill', searchSkill);
      if (searchLocation) params.set('location', searchLocation);
      if (searchCollabOnly) params.set('collab_open', 'true');
      const res = await fetch(`${BACKEND}/api/epk/search?${params}`);
      if (res.ok) { const data = await res.json(); setSearchResults(data.results || []); }
    } catch (e) { console.error('Search EPKs error:', e); }
  }, [searchGenre, searchSkill, searchLocation, searchCollabOnly]);

  // Initial load
  useEffect(() => { loadEpk(); loadPlatformContent(); }, [loadEpk, loadPlatformContent]);
  useEffect(() => { if (activeTab === 'collab') { loadCollabRequests(); loadMyRequests(); loadMyApplications(); } }, [activeTab, loadCollabRequests, loadMyRequests, loadMyApplications]);
  useEffect(() => { if (activeTab === 'find') searchEpks(); }, [activeTab, searchEpks]);

  // Auto-clear status
  useEffect(() => { if (status) { const t = setTimeout(() => setStatus(''), 3000); return () => clearTimeout(t); } }, [status]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); } }, [error]);

  // ── EPK field updater ──
  const updateEpk = useCallback((field, value) => {
    setEpk(prev => ({ ...prev, [field]: value }));
    setEpkDirty(true);
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // COLLAB ACTIONS
  // ══════════════════════════════════════════════════════════════════

  const postCollabRequest = async () => {
    if (!newRequest.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/collab/requests`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(newRequest),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('✓ Collab request posted');
        setNewRequest({ title: '', description: '', genre: '', roles_needed: [], budget: '', deadline: '', reference_track_url: '', reference_notes: '' });
        setCollabView('browse');
        loadCollabRequests();
        loadMyRequests();
      } else { setError(data.error || 'Post failed'); }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submitApplication = async () => {
    if (!applyingTo) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/collab/requests/${applyingTo}/apply`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(applyForm),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('✓ Application sent — your EPK is attached');
        setApplyingTo(null);
        setApplyForm({ message: '', proposed_rate: '', sample_url: '' });
        loadMyApplications();
      } else { setError(data.error || 'Apply failed'); }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadApplicationsForRequest = async (reqId) => {
    try {
      const res = await fetch(`${BACKEND}/api/collab/requests/${reqId}/applications`, { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setApplications(data.applications || []); setViewingApps(reqId); }
    } catch (e) {}
  };

  const respondToApp = async (appId, responseStatus) => {
    try {
      const res = await fetch(`${BACKEND}/api/collab/applications/${appId}/respond`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: responseStatus }),
      });
      if (res.ok) {
        setStatus(`✓ Application ${responseStatus}`);
        if (viewingApps) loadApplicationsForRequest(viewingApps);
      }
    } catch (e) { setError(e.message); }
  };

  const deleteRequest = async (reqId) => {
    if (!window.confirm('Delete this collab request?')) return;
    try {
      await fetch(`${BACKEND}/api/collab/requests/${reqId}`, { method: 'DELETE', headers: authHeaders() });
      setStatus('✓ Deleted');
      loadMyRequests();
      loadCollabRequests();
    } catch (e) { setError(e.message); }
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="epk-collab-hub">
      {/* ── Status Bar ── */}
      {(status || error) && (
        <div className={`ech-status-bar ${error ? 'error' : 'success'}`}>
          {error || status}
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="ech-tabs">
        <button className={activeTab === 'epk' ? 'active' : ''} onClick={() => setActiveTab('epk')}>
          <span className="ech-tab-icon">📋</span> My EPK
          {epkDirty && <span className="ech-unsaved-dot">●</span>}
        </button>
        <button className={activeTab === 'collab' ? 'active' : ''} onClick={() => setActiveTab('collab')}>
          <span className="ech-tab-icon">🤝</span> Collab Board
        </button>
        <button className={activeTab === 'find' ? 'active' : ''} onClick={() => setActiveTab('find')}>
          <span className="ech-tab-icon">🔍</span> Find Artists
        </button>
        {epk?.slug && (
          <a href={`/epk/${epk.slug}`} target="_blank" rel="noopener noreferrer" className="ech-preview-link">
            👁 Preview EPK
          </a>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1: MY EPK BUILDER
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'epk' && epk && (
        <div className="ech-epk-builder">
          {/* EPK Switcher — multiple EPKs */}
          <div className="ech-epk-switcher">
            {(epk.all_epks || []).length > 0 && (
              <div className="ech-epk-list">
                {(epk.all_epks || []).map(e => (
                  <button key={e.id} className={`ech-epk-tab ${epk.id === e.id ? 'active' : ''}`}
                    onClick={async () => {
                      const res = await fetch(`${BACKEND}/api/epk?id=${e.id}`, { headers: authHeaders() });
                      if (res.ok) { const data = await res.json(); setEpk(prev => ({ ...prev, ...data })); }
                    }}>
                    {e.epk_name || e.artist_name}
                  </button>
                ))}
              </div>
            )}
            <button className="ech-new-epk-btn" onClick={() => {
              setEpk(prev => ({
                ...EMPTY_EPK,
                all_epks: prev.all_epks || [],
                epk_name: `New EPK ${(prev.all_epks || []).length + 1}`,
              }));
              setEpkSection('identity');
              setEpkDirty(true);
            }}>+ New EPK</button>
            {epk.id && (epk.all_epks || []).length > 1 && (
              <button className="ech-delete-epk-btn" onClick={async () => {
                if (!window.confirm(`Delete "${epk.epk_name || epk.artist_name}"?`)) return;
                const res = await fetch(`${BACKEND}/api/epk/${epk.id}`, { method: 'DELETE', headers: authHeaders() });
                if (res.ok) { loadEpk(); setStatus('EPK deleted'); }
              }}>🗑</button>
            )}
          </div>
          {/* Section nav */}
          <div className="ech-epk-sections">
            {[
              { id: 'identity', label: '🎤 Identity', desc: 'Name, bio, genre' },
              { id: 'contact', label: '📧 Contact', desc: 'Booking & management' },
              { id: 'media', label: '📸 Media', desc: 'Photos & press' },
              { id: 'achievements', label: '🏆 Achievements', desc: 'Stats & press quotes' },
              { id: 'collab', label: '🤝 Collab Profile', desc: 'Skills & availability' },
              { id: 'content', label: '🎵 Content', desc: 'Tracks, albums, videos' },
              { id: 'template', label: '🎨 Template', desc: 'Look & feel' },
              { id: 'commercial', label: '🎬 Commercial', desc: 'Auto-generate promo' },
            ].map(s => (
              <button key={s.id} className={`ech-section-btn ${epkSection === s.id ? 'active' : ''}`}
                onClick={() => setEpkSection(s.id)}>
                <span className="ech-section-label">{s.label}</span>
                <span className="ech-section-desc">{s.desc}</span>
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="ech-epk-form">

            {/* ── IDENTITY ── */}
            {epkSection === 'identity' && <>
              {/* EPK Label (internal name) */}
              <div className="ech-field">
                <label>EPK Name (internal label)</label>
                <input type="text" value={epk.epk_name || ''} onChange={(e) => updateEpk('epk_name', e.target.value)}
                  placeholder="e.g. Solo Artist, Producer, DJ Alias" />
                <span className="ech-hint">Only you see this — use it to tell your EPKs apart</span>
              </div>

              {/* Auto-populate banner for new EPKs */}
              {!epk.id && platformContent && (
                <div className="ech-auto-banner">
                  <span>🚀 We found your existing profile data!</span>
                  <button onClick={() => {
                    const p = platformContent.profile;
                    const stats = platformContent.stats || {};
                    setEpk(prev => ({
                      ...prev,
                      artist_name: prev.artist_name || p.artist_name,
                      bio_full: prev.bio_full || p.bio,
                      bio_short: prev.bio_short || (p.bio || '').slice(0, 200),
                      genre_primary: prev.genre_primary || p.genre,
                      location: prev.location || p.location,
                      website: prev.website || p.website,
                      booking_email: prev.booking_email || p.email,
                      profile_photo: prev.profile_photo || p.profile_photo,
                      cover_photo: prev.cover_photo || p.cover_photo,
                      social_links: Object.keys(prev.social_links || {}).length ? prev.social_links : p.social_links,
                      stats: Object.keys(prev.stats || {}).length ? prev.stats : stats,
                      featured_tracks: prev.featured_tracks?.length ? prev.featured_tracks : (platformContent.tracks || []).slice(0, 6).map(t => t.id),
                      featured_albums: prev.featured_albums?.length ? prev.featured_albums : (platformContent.albums || []).slice(0, 4).map(a => a.id),
                      featured_videos: prev.featured_videos?.length ? prev.featured_videos : (platformContent.videos || []).slice(0, 4).map(v => v.id),
                    }));
                    setEpkDirty(true);
                    setStatus('✓ Profile data imported — review and customize!');
                  }}>📥 Import All</button>
                </div>
              )}
              <div className="ech-field">
                <label>Artist / Stage Name</label>
                <input type="text" value={epk.artist_name || ''} onChange={(e) => updateEpk('artist_name', e.target.value)} placeholder="Your artist name" />
              </div>
              <div className="ech-field">
                <label>Tagline</label>
                <input type="text" value={epk.tagline || ''} onChange={(e) => updateEpk('tagline', e.target.value)} placeholder="Grammy-nominated R&B vocalist from Atlanta" maxLength={200} />
                <span className="ech-hint">{(epk.tagline || '').length}/200 — One-liner for quick impressions</span>
              </div>
              <div className="ech-field">
                <label>Short Bio</label>
                <textarea value={epk.bio_short || ''} onChange={(e) => updateEpk('bio_short', e.target.value)} placeholder="2-3 sentence elevator pitch..." rows={3} maxLength={500} />
                <span className="ech-hint">{(epk.bio_short || '').length}/500 — Used in search results & collab pitches</span>
              </div>
              <div className="ech-field">
                <label>Full Bio</label>
                <textarea value={epk.bio_full || ''} onChange={(e) => updateEpk('bio_full', e.target.value)} placeholder="Your full press bio..." rows={6} />
              </div>
              <div className="ech-field-row">
                <div className="ech-field">
                  <label>Primary Genre</label>
                  <select value={epk.genre_primary || ''} onChange={(e) => updateEpk('genre_primary', e.target.value)}>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="ech-field">
                  <label>Secondary Genre</label>
                  <select value={epk.genre_secondary || ''} onChange={(e) => updateEpk('genre_secondary', e.target.value)}>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="ech-field">
                <label>Location</label>
                <input type="text" value={epk.location || ''} onChange={(e) => updateEpk('location', e.target.value)} placeholder="City, State/Country" />
              </div>
              <div className="ech-field">
                <label>EPK URL Slug</label>
                <div className="ech-slug-preview">
                  <span className="ech-slug-base">streampirex.com/epk/</span>
                  <input type="text" value={epk.slug || ''} onChange={(e) => updateEpk('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                </div>
              </div>
            </>}

            {/* ── CONTACT ── */}
            {epkSection === 'contact' && <>
              <div className="ech-field">
                <label>Booking Email</label>
                <input type="email" value={epk.booking_email || ''} onChange={(e) => updateEpk('booking_email', e.target.value)} placeholder="booking@yourdomain.com" />
              </div>
              <div className="ech-field-row">
                <div className="ech-field">
                  <label>Management Name</label>
                  <input type="text" value={epk.management_name || ''} onChange={(e) => updateEpk('management_name', e.target.value)} />
                </div>
                <div className="ech-field">
                  <label>Management Email</label>
                  <input type="email" value={epk.management_email || ''} onChange={(e) => updateEpk('management_email', e.target.value)} />
                </div>
              </div>
              <div className="ech-field-row">
                <div className="ech-field">
                  <label>Label</label>
                  <input type="text" value={epk.label_name || ''} onChange={(e) => updateEpk('label_name', e.target.value)} placeholder="Independent" />
                </div>
                <div className="ech-field">
                  <label>Website</label>
                  <input type="url" value={epk.website || ''} onChange={(e) => updateEpk('website', e.target.value)} placeholder="https://" />
                </div>
              </div>
              <div className="ech-field">
                <label>Social Links</label>
                <div className="ech-social-grid">
                  {['spotify', 'apple_music', 'youtube', 'instagram', 'tiktok', 'twitter', 'soundcloud'].map(platform => (
                    <div key={platform} className="ech-social-row">
                      <span className="ech-social-label">{platform.replace('_', ' ')}</span>
                      <input type="url" value={epk.social_links?.[platform] || ''}
                        onChange={(e) => updateEpk('social_links', { ...(epk.social_links || {}), [platform]: e.target.value })}
                        placeholder={`https://${platform.replace('_', '')}.com/...`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="ech-field">
                <label>Technical Rider</label>
                <textarea value={epk.rider || ''} onChange={(e) => updateEpk('rider', e.target.value)}
                  placeholder="Sound requirements, stage setup, hospitality needs..." rows={5} />
                <span className="ech-hint">For venue bookings — list your sound and stage requirements</span>
              </div>
            </>}

            {/* ── MEDIA ── */}
            {epkSection === 'media' && <>
              <MediaUploadField label="Profile Photo" field="profile_photo" currentUrl={epk.profile_photo}
                onUploaded={(url) => updateEpk('profile_photo', url)} previewClass="ech-photo-preview" backend={BACKEND} />
              <MediaUploadField label="Cover Photo" field="cover_photo" currentUrl={epk.cover_photo}
                onUploaded={(url) => updateEpk('cover_photo', url)} previewClass="ech-cover-preview" backend={BACKEND} />
              <MediaUploadField label="Logo" field="logo_url" currentUrl={epk.logo_url}
                onUploaded={(url) => updateEpk('logo_url', url)} previewClass="ech-photo-preview" backend={BACKEND} />
              <MediaUploadField label="Stage Plot (PDF or Image)" field="stage_plot_url" currentUrl={epk.stage_plot_url}
                onUploaded={(url) => updateEpk('stage_plot_url', url)} previewClass="" backend={BACKEND} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" />

              <div className="ech-field">
                <label>Press Photos</label>
                <div className="ech-press-photos">
                  {(epk.press_photos || []).map((p, i) => (
                    <div key={i} className="ech-press-photo-item">
                      <img src={p.url} alt={p.caption || `Photo ${i + 1}`} />
                      <input type="text" value={p.caption || ''} placeholder="Caption"
                        onChange={(e) => {
                          const photos = [...(epk.press_photos || [])];
                          photos[i] = { ...photos[i], caption: e.target.value };
                          updateEpk('press_photos', photos);
                        }} />
                      <button className="ech-remove-btn" onClick={() => {
                        updateEpk('press_photos', (epk.press_photos || []).filter((_, j) => j !== i));
                      }}>✕</button>
                    </div>
                  ))}
                  <PressPhotoUploader backend={BACKEND} onUploaded={(url) => {
                    updateEpk('press_photos', [...(epk.press_photos || []), { url, caption: '' }]);
                  }} />
                </div>
              </div>

              {/* ── Featured Media (Audio Demos, Videos, Documents) ── */}
              <div className="ech-field">
                <label>Featured Media — Audio Demos, Music Videos, Press Releases</label>
                <p className="ech-hint" style={{ marginBottom: 10 }}>Upload MP3s, WAVs, MP4s, PDFs — anything that showcases your work</p>
                <div className="ech-featured-media-list">
                  {(epk.featured_media || []).map((m, i) => (
                    <div key={i} className={`ech-media-item ${m.type || 'other'}`}>
                      <span className="ech-media-icon">
                        {m.type === 'audio' ? '🎵' : m.type === 'video' ? '🎬' : m.type === 'document' ? '📄' : '📎'}
                      </span>
                      <div className="ech-media-info">
                        <input type="text" value={m.title || ''} placeholder="Title"
                          onChange={(e) => {
                            const media = [...(epk.featured_media || [])]; media[i] = { ...media[i], title: e.target.value };
                            updateEpk('featured_media', media);
                          }} />
                        <input type="text" value={m.description || ''} placeholder="Description (optional)"
                          onChange={(e) => {
                            const media = [...(epk.featured_media || [])]; media[i] = { ...media[i], description: e.target.value };
                            updateEpk('featured_media', media);
                          }} />
                      </div>
                      {m.type === 'audio' && m.url && (
                        <audio controls src={m.url} className="ech-media-player" preload="none" />
                      )}
                      {m.type === 'video' && m.url && (
                        <video controls src={m.url} className="ech-media-video" preload="none" />
                      )}
                      {(m.type === 'document' || m.type === 'image') && m.url && (
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="ech-file-link">
                          📎 View {m.ext || 'file'}
                        </a>
                      )}
                      <button className="ech-remove-btn" onClick={() => {
                        updateEpk('featured_media', (epk.featured_media || []).filter((_, j) => j !== i));
                      }}>✕</button>
                    </div>
                  ))}
                  <FeaturedMediaUploader backend={BACKEND} onUploaded={(mediaObj) => {
                    updateEpk('featured_media', [...(epk.featured_media || []), mediaObj]);
                  }} />
                </div>
              </div>
            </>}

            {/* ── ACHIEVEMENTS ── */}
            {epkSection === 'achievements' && <>
              <div className="ech-field">
                <label>Stats</label>
                <div className="ech-stats-grid">
                  {[
                    { key: 'monthly_listeners', label: 'Monthly Listeners', icon: '👂' },
                    { key: 'total_streams', label: 'Total Streams', icon: '🎵' },
                    { key: 'followers', label: 'Followers', icon: '👥' },
                    { key: 'shows_played', label: 'Shows Played', icon: '🎤' },
                  ].map(s => (
                    <div key={s.key} className="ech-stat-input">
                      <span>{s.icon}</span>
                      <input type="text" value={epk.stats?.[s.key] || ''} placeholder={s.label}
                        onChange={(e) => updateEpk('stats', { ...(epk.stats || {}), [s.key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="ech-field">
                <label>Achievements & Highlights</label>
                {(epk.achievements || []).map((a, i) => (
                  <div key={i} className="ech-achievement-row">
                    <input type="text" value={a.title || ''} placeholder="Achievement title"
                      onChange={(e) => {
                        const achs = [...(epk.achievements || [])];
                        achs[i] = { ...achs[i], title: e.target.value };
                        updateEpk('achievements', achs);
                      }} />
                    <input type="text" value={a.description || ''} placeholder="Details"
                      onChange={(e) => {
                        const achs = [...(epk.achievements || [])];
                        achs[i] = { ...achs[i], description: e.target.value };
                        updateEpk('achievements', achs);
                      }} />
                    <button className="ech-remove-btn" onClick={() => updateEpk('achievements', (epk.achievements || []).filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                <button className="ech-add-btn" onClick={() => updateEpk('achievements', [...(epk.achievements || []), { title: '', description: '', date: '', icon: '🏆' }])}>+ Add Achievement</button>
              </div>
              <div className="ech-field">
                <label>Press Quotes</label>
                {(epk.press_quotes || []).map((q, i) => (
                  <div key={i} className="ech-quote-row">
                    <textarea value={q.quote || ''} placeholder="Press quote..." rows={2}
                      onChange={(e) => {
                        const quotes = [...(epk.press_quotes || [])];
                        quotes[i] = { ...quotes[i], quote: e.target.value };
                        updateEpk('press_quotes', quotes);
                      }} />
                    <input type="text" value={q.source || ''} placeholder="Source (e.g. Rolling Stone)"
                      onChange={(e) => {
                        const quotes = [...(epk.press_quotes || [])];
                        quotes[i] = { ...quotes[i], source: e.target.value };
                        updateEpk('press_quotes', quotes);
                      }} />
                    <button className="ech-remove-btn" onClick={() => updateEpk('press_quotes', (epk.press_quotes || []).filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                <button className="ech-add-btn" onClick={() => updateEpk('press_quotes', [...(epk.press_quotes || []), { quote: '', source: '', url: '' }])}>+ Add Press Quote</button>
              </div>
            </>}

            {/* ── COLLAB PROFILE ── */}
            {epkSection === 'collab' && <>
              <div className="ech-field">
                <label>Open for Collaborations</label>
                <button className={`ech-toggle ${epk.collab_open ? 'on' : 'off'}`}
                  onClick={() => updateEpk('collab_open', !epk.collab_open)}>
                  {epk.collab_open ? '✅ Open for Collabs' : '⬜ Not Available'}
                </button>
              </div>
              <div className="ech-field">
                <label>Your Skills</label>
                <div className="ech-tag-selector">
                  {SKILLS.map(s => (
                    <button key={s} className={`ech-tag ${(epk.skills || []).includes(s) ? 'active' : ''}`}
                      onClick={() => {
                        const skills = epk.skills || [];
                        updateEpk('skills', skills.includes(s) ? skills.filter(x => x !== s) : [...skills, s]);
                      }}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="ech-field">
                <label>Preferred Collab Genres</label>
                <div className="ech-tag-selector">
                  {GENRES.slice(0, 20).map(g => (
                    <button key={g} className={`ech-tag ${(epk.preferred_genres || []).includes(g) ? 'active' : ''}`}
                      onClick={() => {
                        const genres = epk.preferred_genres || [];
                        updateEpk('preferred_genres', genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g]);
                      }}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="ech-field">
                <label>Rate / Compensation</label>
                <input type="text" value={epk.collab_rate || ''} onChange={(e) => updateEpk('collab_rate', e.target.value)}
                  placeholder="e.g. $500/verse, Points only, Negotiable" />
              </div>
              <div className="ech-field">
                <label>Equipment / DAW</label>
                <div className="ech-equipment-list">
                  {(epk.equipment || []).map((eq, i) => (
                    <div key={i} className="ech-equipment-item">
                      <input type="text" value={eq} onChange={(e) => {
                        const equip = [...(epk.equipment || [])]; equip[i] = e.target.value;
                        updateEpk('equipment', equip);
                      }} />
                      <button className="ech-remove-btn" onClick={() => updateEpk('equipment', (epk.equipment || []).filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  <button className="ech-add-btn" onClick={() => updateEpk('equipment', [...(epk.equipment || []), ''])}>+ Add Equipment</button>
                </div>
              </div>
            </>}

            {/* ── CONTENT — Pick tracks, albums, videos to feature ── */}
            {epkSection === 'content' && <>
              {!platformContent ? (
                <div className="ech-empty">Loading your content...</div>
              ) : (
                <>
                  {/* Tracks */}
                  <div className="ech-field">
                    <label>Featured Tracks ({(epk.featured_tracks || []).length} selected)</label>
                    {platformContent.tracks?.length > 0 ? (
                      <div className="ech-content-picker">
                        {platformContent.tracks.map(t => {
                          const selected = (epk.featured_tracks || []).includes(t.id);
                          return (
                            <div key={t.id} className={`ech-content-item ${selected ? 'selected' : ''}`}
                              onClick={() => {
                                const ids = epk.featured_tracks || [];
                                updateEpk('featured_tracks', selected ? ids.filter(x => x !== t.id) : [...ids, t.id]);
                              }}>
                              {t.artwork_url && <img src={t.artwork_url} alt="" className="ech-content-thumb" />}
                              <div className="ech-content-info">
                                <span className="ech-content-title">{t.title}</span>
                                <span className="ech-content-meta">{t.genre} · {t.plays || 0} plays</span>
                              </div>
                              <span className="ech-content-check">{selected ? '✅' : '○'}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="ech-empty-small">No tracks uploaded yet. <a href="/upload-music">Upload music</a> to feature it here.</div>
                    )}
                  </div>

                  {/* Albums */}
                  <div className="ech-field">
                    <label>Featured Albums ({(epk.featured_albums || []).length} selected)</label>
                    {platformContent.albums?.length > 0 ? (
                      <div className="ech-content-picker">
                        {platformContent.albums.map(a => {
                          const selected = (epk.featured_albums || []).includes(a.id);
                          return (
                            <div key={a.id} className={`ech-content-item ${selected ? 'selected' : ''}`}
                              onClick={() => {
                                const ids = epk.featured_albums || [];
                                updateEpk('featured_albums', selected ? ids.filter(x => x !== a.id) : [...ids, a.id]);
                              }}>
                              {a.cover_art_url && <img src={a.cover_art_url} alt="" className="ech-content-thumb" />}
                              <div className="ech-content-info">
                                <span className="ech-content-title">{a.title}</span>
                                <span className="ech-content-meta">{a.genre} · {a.release_date}</span>
                              </div>
                              <span className="ech-content-check">{selected ? '✅' : '○'}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="ech-empty-small">No albums yet. <a href="/profile/artist">Create an album</a> to feature it.</div>
                    )}
                  </div>

                  {/* Videos */}
                  <div className="ech-field">
                    <label>Featured Videos ({(epk.featured_videos || []).length} selected)</label>
                    {platformContent.videos?.length > 0 ? (
                      <div className="ech-content-picker">
                        {platformContent.videos.map(v => {
                          const selected = (epk.featured_videos || []).includes(v.id);
                          return (
                            <div key={v.id} className={`ech-content-item ${selected ? 'selected' : ''}`}
                              onClick={() => {
                                const ids = epk.featured_videos || [];
                                updateEpk('featured_videos', selected ? ids.filter(x => x !== v.id) : [...ids, v.id]);
                              }}>
                              {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="ech-content-thumb video" />}
                              <div className="ech-content-info">
                                <span className="ech-content-title">{v.title}</span>
                                <span className="ech-content-meta">🎬 Video</span>
                              </div>
                              <span className="ech-content-check">{selected ? '✅' : '○'}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="ech-empty-small">No videos yet. <a href="/upload-video">Upload a video</a> to feature it.</div>
                    )}
                  </div>

                  {/* Stats auto-pulled */}
                  {platformContent.stats && Object.keys(platformContent.stats).length > 0 && (
                    <div className="ech-auto-stats">
                      <label>Auto-Detected Stats</label>
                      <div className="ech-stats-preview">
                        {platformContent.stats.total_streams && <span>🎵 {platformContent.stats.total_streams} streams</span>}
                        {platformContent.stats.total_likes && <span>❤️ {platformContent.stats.total_likes} likes</span>}
                        {platformContent.stats.followers && <span>👥 {platformContent.stats.followers} followers</span>}
                      </div>
                      <button className="ech-add-btn" onClick={() => {
                        updateEpk('stats', { ...(epk.stats || {}), ...platformContent.stats });
                        setStatus('✓ Stats synced');
                      }}>🔄 Sync Stats to EPK</button>
                    </div>
                  )}
                </>
              )}
            </>}

            {/* ── TEMPLATE ── */}
            {epkSection === 'template' && <>
              {/* ── AI COMMERCIAL GENERATOR ── */}
              <div className="ech-commercial-section">
                <h3 className="ech-commercial-title">🎬 AI Commercial Generator</h3>
                <p className="ech-commercial-desc">
                  Your EPK is <strong className="ech-free-tag">100% free</strong> with your plan. Want a promo video too? The AI commercial generator uses your existing video credits — <strong>1 credit</strong> standard, <strong>2 credits</strong> premium.
                </p>

                <div className="ech-field">
                  <label>Visual Style</label>
                  <div className="ech-style-grid">
                    {[
                      { id: 'cinematic', icon: '🎥', name: 'Cinematic', desc: 'Dramatic lighting, slow motion, moody' },
                      { id: 'hype', icon: '🔥', name: 'Hype', desc: 'High energy, urban, concert vibes' },
                      { id: 'lyric_video', icon: '✨', name: 'Lyric Video', desc: 'Abstract visuals, typography' },
                      { id: 'minimal', icon: '◻️', name: 'Minimal', desc: 'Clean, elegant, gallery-like' },
                      { id: 'documentary', icon: '📹', name: 'Documentary', desc: 'Behind the scenes, intimate' },
                    ].map(s => (
                      <button key={s.id} className={`ech-style-card ${comStyle === s.id ? 'active' : ''}`}
                        onClick={() => setComStyle(s.id)}>
                        <span className="ech-style-icon">{s.icon}</span>
                        <span className="ech-style-name">{s.name}</span>
                        <span className="ech-style-desc">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ech-field-row">
                  <div className="ech-field">
                    <label>Quality</label>
                    <select value={comQuality} onChange={(e) => setComQuality(e.target.value)}>
                      <option value="standard">Standard (1 credit)</option>
                      <option value="premium">Premium (2 credits)</option>
                    </select>
                  </div>
                  <div className="ech-field">
                    <label>Use Profile Photo</label>
                    <button className={`ech-toggle ${comUsePhoto ? 'on' : 'off'}`}
                      onClick={() => setComUsePhoto(!comUsePhoto)}>
                      {comUsePhoto ? '📸 Image-to-Video (your photo)' : '✍️ Text-to-Video only'}
                    </button>
                  </div>
                </div>

                <div className="ech-field">
                  <label>Custom Direction (optional)</label>
                  <input type="text" value={comCustomPrompt} onChange={(e) => setComCustomPrompt(e.target.value)}
                    placeholder="e.g. Focus on live performance energy, include crowd shots..." maxLength={200} />
                  <span className="ech-hint">Added to the auto-generated prompt from your EPK data</span>
                </div>

                <button className="ech-generate-commercial-btn" onClick={generateCommercial}
                  disabled={comGenerating || !epk.artist_name}>
                  {comGenerating ? '⏳ Generating... This may take 1-3 minutes' : '🎬 Generate Commercial (uses credits)'}
                </button>

                {comResult && (
                  <div className="ech-commercial-result">
                    <video controls src={comResult.video_url} className="ech-commercial-video" />
                    <div className="ech-commercial-meta">
                      <span>✓ Saved to your Featured Media</span>
                      <span>Credits remaining: {comResult.credits_remaining}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="ech-divider" />
              <div className="ech-field">
                <label>EPK Template</label>
                <div className="ech-template-grid">
                  {TEMPLATES.map(t => (
                    <button key={t.id} className={`ech-template-card ${epk.template === t.id ? 'active' : ''}`}
                      onClick={() => updateEpk('template', t.id)}>
                      <span className="ech-template-name">{t.name}</span>
                      <span className="ech-template-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="ech-field">
                <label>Accent Color</label>
                <div className="ech-color-picker">
                  <input type="color" value={epk.accent_color || '#00ffc8'} onChange={(e) => updateEpk('accent_color', e.target.value)} />
                  <span>{epk.accent_color || '#00ffc8'}</span>
                  <div className="ech-preset-colors">
                    {['#00ffc8', '#FF6600', '#ff4444', '#ffd700', '#4a9eff', '#c840e9', '#ff69b4', '#32cd32'].map(c => (
                      <button key={c} className="ech-color-swatch" style={{ background: c }}
                        onClick={() => updateEpk('accent_color', c)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="ech-field">
                <label>Public Visibility</label>
                <button className={`ech-toggle ${epk.is_public ? 'on' : 'off'}`}
                  onClick={() => updateEpk('is_public', !epk.is_public)}>
                  {epk.is_public ? '🌐 Public — Anyone with link can view' : '🔒 Private — Only you can see'}
                </button>
              </div>
            </>}

            {/* Save bar */}
            <div className="ech-save-bar">
              <button className="ech-save-btn" onClick={saveEpk} disabled={loading || !epkDirty}>
                {loading ? '⏳ Saving...' : epkDirty ? '💾 Save EPK' : '✓ Saved'}
              </button>
              {epk.slug && (
                <span className="ech-share-url">Share: streampirex.com/epk/{epk.slug}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2: COLLAB BOARD
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'collab' && (
        <div className="ech-collab-board">
          <div className="ech-collab-nav">
            <button className={collabView === 'browse' ? 'active' : ''} onClick={() => setCollabView('browse')}>🔍 Browse</button>
            <button className={collabView === 'new-post' ? 'active' : ''} onClick={() => setCollabView('new-post')}>➕ Post Request</button>
            <button className={collabView === 'my-posts' ? 'active' : ''} onClick={() => setCollabView('my-posts')}>📋 My Posts ({myRequests.length})</button>
            <button className={collabView === 'my-apps' ? 'active' : ''} onClick={() => setCollabView('my-apps')}>📨 My Applications ({myApplications.length})</button>
          </div>

          {/* ── BROWSE ── */}
          {collabView === 'browse' && <>
            <div className="ech-collab-filters">
              <select value={filterGenre} onChange={(e) => { setFilterGenre(e.target.value); }}>
                <option value="">All Genres</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); }}>
                <option value="">All Roles</option>
                {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={loadCollabRequests}>🔄 Refresh</button>
            </div>

            {collabRequests.length === 0 ? (
              <div className="ech-empty">No open collab requests yet. Be the first to post one!</div>
            ) : (
              <div className="ech-request-list">
                {collabRequests.map(req => (
                  <div key={req.id} className="ech-request-card">
                    <div className="ech-request-header">
                      <div className="ech-request-author">
                        {req.profile_photo && <img src={req.profile_photo} alt="" className="ech-avatar" />}
                        <span className="ech-author-name">{req.artist_name}</span>
                      </div>
                      <span className="ech-request-date">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="ech-request-title">{req.title}</h3>
                    {req.description && <p className="ech-request-desc">{req.description}</p>}
                    <div className="ech-request-meta">
                      {req.genre && <span className="ech-meta-tag genre">{req.genre}</span>}
                      {(req.roles_needed || []).map(r => <span key={r} className="ech-meta-tag role">{r}</span>)}
                      {req.budget && <span className="ech-meta-tag budget">💰 {req.budget}</span>}
                      {req.deadline && <span className="ech-meta-tag deadline">📅 {new Date(req.deadline).toLocaleDateString()}</span>}
                    </div>
                    <div className="ech-request-actions">
                      <button className="ech-apply-btn" onClick={() => setApplyingTo(applyingTo === req.id ? null : req.id)}>
                        {applyingTo === req.id ? '✕ Cancel' : '🤝 Apply with EPK'}
                      </button>
                      <button className="ech-dm-btn" onClick={() => setMsgModal({
                        recipientId: req.user_id, recipientName: req.artist_name,
                        contextType: 'collab_request', contextId: req.id,
                      })}>💬 Message</button>
                      <span className="ech-app-count">{req.application_count || 0} applications</span>
                    </div>
                    {applyingTo === req.id && (
                      <div className="ech-apply-form">
                        <textarea value={applyForm.message} onChange={(e) => setApplyForm(p => ({ ...p, message: e.target.value }))}
                          placeholder="Pitch message — why you're the right fit..." rows={3} />
                        <div className="ech-apply-row">
                          <input type="text" value={applyForm.proposed_rate}
                            onChange={(e) => setApplyForm(p => ({ ...p, proposed_rate: e.target.value }))}
                            placeholder="Your rate (optional)" />
                          <input type="url" value={applyForm.sample_url}
                            onChange={(e) => setApplyForm(p => ({ ...p, sample_url: e.target.value }))}
                            placeholder="Link to relevant work sample" />
                        </div>
                        <div className="ech-apply-footer">
                          <span className="ech-epk-attached">📋 Your EPK will be attached automatically</span>
                          <button className="ech-submit-apply" onClick={submitApplication} disabled={loading}>
                            {loading ? '⏳' : '🚀 Send Application'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>}

          {/* ── NEW POST ── */}
          {collabView === 'new-post' && (
            <div className="ech-new-request">
              <h3>Post a Collaboration Request</h3>
              <div className="ech-field">
                <label>Title *</label>
                <input type="text" value={newRequest.title} onChange={(e) => setNewRequest(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Need R&B vocalist for upcoming single" />
              </div>
              <div className="ech-field">
                <label>Description</label>
                <textarea value={newRequest.description} onChange={(e) => setNewRequest(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the project, vibe, and what you're looking for..." rows={4} />
              </div>
              <div className="ech-field-row">
                <div className="ech-field">
                  <label>Genre</label>
                  <select value={newRequest.genre} onChange={(e) => setNewRequest(p => ({ ...p, genre: e.target.value }))}>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="ech-field">
                  <label>Budget</label>
                  <input type="text" value={newRequest.budget} onChange={(e) => setNewRequest(p => ({ ...p, budget: e.target.value }))}
                    placeholder="e.g. $200-500 / Points split / TBD" />
                </div>
              </div>
              <div className="ech-field">
                <label>Roles Needed</label>
                <div className="ech-tag-selector compact">
                  {SKILLS.map(s => (
                    <button key={s} className={`ech-tag ${newRequest.roles_needed.includes(s) ? 'active' : ''}`}
                      onClick={() => setNewRequest(p => ({
                        ...p,
                        roles_needed: p.roles_needed.includes(s) ? p.roles_needed.filter(x => x !== s) : [...p.roles_needed, s],
                      }))}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="ech-field-row">
                <div className="ech-field">
                  <label>Deadline</label>
                  <input type="date" value={newRequest.deadline} onChange={(e) => setNewRequest(p => ({ ...p, deadline: e.target.value }))} />
                </div>
                <div className="ech-field">
                  <label>Reference Track URL</label>
                  <input type="url" value={newRequest.reference_track_url} onChange={(e) => setNewRequest(p => ({ ...p, reference_track_url: e.target.value }))}
                    placeholder="SoundCloud / YouTube link for vibe reference" />
                </div>
              </div>
              <button className="ech-post-btn" onClick={postCollabRequest} disabled={loading}>
                {loading ? '⏳ Posting...' : '🚀 Post Collab Request'}
              </button>
            </div>
          )}

          {/* ── MY POSTS ── */}
          {collabView === 'my-posts' && (
            <div className="ech-my-posts">
              {myRequests.length === 0 ? (
                <div className="ech-empty">You haven't posted any collab requests yet.</div>
              ) : myRequests.map(req => (
                <div key={req.id} className="ech-request-card owned">
                  <h3>{req.title}</h3>
                  <div className="ech-request-meta">
                    <span className={`ech-status-badge ${req.status}`}>{req.status}</span>
                    {req.genre && <span className="ech-meta-tag genre">{req.genre}</span>}
                    {(req.roles_needed || []).map(r => <span key={r} className="ech-meta-tag role">{r}</span>)}
                  </div>
                  <div className="ech-request-actions">
                    <button onClick={() => loadApplicationsForRequest(req.id)}>
                      📨 View Applications ({req.application_count || 0})
                    </button>
                    <button className="ech-close-btn" onClick={() => deleteRequest(req.id)}>🗑 Delete</button>
                  </div>
                  {viewingApps === req.id && (
                    <div className="ech-applications-list">
                      {applications.length === 0 ? (
                        <div className="ech-empty">No applications yet.</div>
                      ) : applications.map(app => (
                        <div key={app.id} className={`ech-application-card ${app.status}`}>
                          <div className="ech-app-header">
                            {app.profile_photo && <img src={app.profile_photo} alt="" className="ech-avatar" />}
                            <div>
                              <span className="ech-app-name">{app.artist_name}</span>
                              {app.skills?.length > 0 && <span className="ech-app-skills">{app.skills.slice(0, 3).join(', ')}</span>}
                            </div>
                            {app.epk_slug && (
                              <a href={`/epk/${app.epk_slug}`} target="_blank" rel="noopener noreferrer" className="ech-view-epk-link">📋 View EPK</a>
                            )}
                          </div>
                          {app.message && <p className="ech-app-message">{app.message}</p>}
                          {app.proposed_rate && <span className="ech-meta-tag budget">💰 {app.proposed_rate}</span>}
                          {app.sample_url && <a href={app.sample_url} target="_blank" rel="noopener noreferrer" className="ech-sample-link">🎵 Work Sample</a>}
                          {app.status === 'pending' && (
                            <div className="ech-app-response-btns">
                              <button className="ech-accept" onClick={() => respondToApp(app.id, 'accepted')}>✅ Accept</button>
                              <button className="ech-decline" onClick={() => respondToApp(app.id, 'declined')}>✕ Decline</button>
                              <button className="ech-dm-btn" onClick={() => setMsgModal({
                                recipientId: app.user_id, recipientName: app.artist_name,
                                contextType: 'collab_application', contextId: app.id,
                              })}>💬 Message</button>
                            </div>
                          )}
                          {app.status !== 'pending' && <span className={`ech-status-badge ${app.status}`}>{app.status}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MY APPLICATIONS ── */}
          {collabView === 'my-apps' && (
            <div className="ech-my-apps">
              {myApplications.length === 0 ? (
                <div className="ech-empty">You haven't applied to any collabs yet. Browse the board!</div>
              ) : myApplications.map(app => (
                <div key={app.id} className={`ech-application-card ${app.status}`}>
                  <span className="ech-app-message">{app.message || '(No message)'}</span>
                  <div className="ech-request-meta">
                    <span className={`ech-status-badge ${app.status}`}>{app.status}</span>
                    {app.proposed_rate && <span className="ech-meta-tag budget">💰 {app.proposed_rate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 3: FIND ARTISTS (EPK Search)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'find' && (
        <div className="ech-find-artists">
          <div className="ech-search-bar">
            <select value={searchGenre} onChange={(e) => setSearchGenre(e.target.value)}>
              <option value="">All Genres</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={searchSkill} onChange={(e) => setSearchSkill(e.target.value)}>
              <option value="">All Skills</option>
              {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} placeholder="Location..." />
            <label className="ech-collab-filter">
              <input type="checkbox" checked={searchCollabOnly} onChange={(e) => setSearchCollabOnly(e.target.checked)} />
              Open for collab only
            </label>
            <button onClick={searchEpks}>🔍 Search</button>
          </div>

          {searchResults.length === 0 ? (
            <div className="ech-empty">No artists found. Try broadening your search.</div>
          ) : (
            <div className="ech-artist-grid">
              {searchResults.map(epkResult => (
                <div key={epkResult.id} className="ech-artist-card" style={{ '--card-accent': epkResult.accent_color || '#00ffc8' }}>
                  <div className="ech-artist-card-header">
                    {epkResult.profile_photo && <img src={epkResult.profile_photo} alt="" className="ech-artist-photo" />}
                    <div>
                      <h3 className="ech-artist-name">{epkResult.artist_name}</h3>
                      {epkResult.tagline && <p className="ech-artist-tagline">{epkResult.tagline}</p>}
                    </div>
                  </div>
                  <div className="ech-artist-meta">
                    {epkResult.genre_primary && <span className="ech-meta-tag genre">{epkResult.genre_primary}</span>}
                    {epkResult.genre_secondary && <span className="ech-meta-tag genre">{epkResult.genre_secondary}</span>}
                    {epkResult.location && <span className="ech-meta-tag location">📍 {epkResult.location}</span>}
                    {epkResult.collab_open && <span className="ech-meta-tag collab">🤝 Open</span>}
                  </div>
                  {epkResult.skills?.length > 0 && (
                    <div className="ech-artist-skills">
                      {epkResult.skills.slice(0, 5).map(s => <span key={s} className="ech-skill-chip">{s}</span>)}
                      {epkResult.skills.length > 5 && <span className="ech-more">+{epkResult.skills.length - 5}</span>}
                    </div>
                  )}
                  {epkResult.bio_short && <p className="ech-artist-bio">{epkResult.bio_short.slice(0, 120)}...</p>}
                  <div className="ech-artist-actions">
                    {epkResult.slug && (
                      <a href={`/epk/${epkResult.slug}`} target="_blank" rel="noopener noreferrer" className="ech-view-epk-btn">📋 View Full EPK</a>
                    )}
                    <button className="ech-dm-btn" onClick={() => setMsgModal({
                      recipientId: epkResult.user_id, recipientName: epkResult.artist_name,
                      contextType: 'epk_contact', contextId: null,
                    })}>💬 Message</button>
                    {epkResult.collab_rate && <span className="ech-rate">💰 {epkResult.collab_rate}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MESSAGE MODAL — Quick DM with collab context
          ═══════════════════════════════════════════════════════════════ */}
      {msgModal && (
        <div className="ech-msg-overlay" onClick={() => setMsgModal(null)}>
          <div className="ech-msg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ech-msg-header">
              <h3>💬 Message {msgModal.recipientName}</h3>
              <button className="ech-msg-close" onClick={() => setMsgModal(null)}>✕</button>
            </div>
            {msgModal.contextType && (
              <div className="ech-msg-context">
                {msgModal.contextType === 'collab_request' && '📋 Re: Collab Request'}
                {msgModal.contextType === 'collab_application' && '📨 Re: Application'}
                {msgModal.contextType === 'epk_contact' && '📋 Via EPK'}
              </div>
            )}
            <textarea className="ech-msg-input" value={msgText} onChange={(e) => setMsgText(e.target.value)}
              placeholder={`Message ${msgModal.recipientName}...`} rows={4} autoFocus />
            <div className="ech-msg-actions">
              <span className="ech-msg-hint">Message will appear in their DM inbox</span>
              <button className="ech-msg-send" onClick={sendCollabMessage} disabled={msgSending || !msgText.trim()}>
                {msgSending ? '⏳' : '🚀 Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: Media Upload Field (upload + URL fallback)
// =============================================================================
const MediaUploadField = ({ label, field, currentUrl, onUploaded, previewClass, backend, accept }) => {
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [manualUrl, setManualUrl] = useState(currentUrl || '');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`${backend}/api/epk/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) { onUploaded(data.url); }
      else { alert(data.error || 'Upload failed'); }
    } catch (err) { alert('Upload error: ' + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="ech-field">
      <label>{label}</label>
      <div className="ech-upload-zone">
        {!urlMode ? (
          <>
            <input ref={fileRef} type="file" accept={accept || "image/*"} onChange={handleUpload}
              style={{ display: 'none' }} id={`epk-upload-${field}`} />
            <button className="ech-upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '⏳ Uploading...' : currentUrl ? '🔄 Replace File' : '📤 Upload File'}
            </button>
            <button className="ech-url-toggle" onClick={() => { setUrlMode(true); setManualUrl(currentUrl || ''); }}>
              or paste URL
            </button>
          </>
        ) : (
          <div className="ech-url-input-row">
            <input type="url" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..." />
            <button className="ech-url-apply" onClick={() => { onUploaded(manualUrl); setUrlMode(false); }}>✓</button>
            <button className="ech-url-cancel" onClick={() => setUrlMode(false)}>✕</button>
          </div>
        )}
      </div>
      {currentUrl && previewClass && (
        <img src={currentUrl} alt={label} className={previewClass} />
      )}
      {currentUrl && !previewClass && field === 'stage_plot_url' && (
        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="ech-file-link">📄 View uploaded file</a>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: Press Photo Uploader (multi-upload for press gallery)
// =============================================================================
const PressPhotoUploader = ({ backend, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('field', 'press_photos');
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`${backend}/api/epk/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) { onUploaded(data.url); }
      } catch (err) { console.error('Press photo upload error:', err); }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
      <button className="ech-add-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? '⏳ Uploading...' : '+ Upload Press Photos'}
      </button>
    </>
  );
};

// =============================================================================
// SUB-COMPONENT: Featured Media Uploader (audio, video, docs — any file type)
// =============================================================================
const FeaturedMediaUploader = ({ backend, onUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', 'featured_media');
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`${backend}/api/epk/upload`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onUploaded({
          url: data.url,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          type: data.file_type || 'other',
          ext: data.ext || '',
        });
      } else { alert(data.error || 'Upload failed'); }
    } catch (err) { alert('Upload error: ' + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <>
      <input ref={fileRef} type="file"
        accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
        onChange={handleUpload} style={{ display: 'none' }} />
      <button className="ech-add-media-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? '⏳ Uploading...' : '+ Upload Audio, Video, or Document'}
      </button>
    </>
  );
};

export default EPKCollabHub;