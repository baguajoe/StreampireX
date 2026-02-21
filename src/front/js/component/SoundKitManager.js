// =============================================================================
// SoundKitManager.js — Sound Kit Save/Load/Browse UI
// =============================================================================
// Location: src/front/js/component/SoundKitManager.js
// Features:
//   - Save current Beat Maker pad config as a named kit
//   - Load kit → populates Beat Maker pads with samples
//   - Upload individual samples with drag-drop
//   - Browse & search community kits
//   - Like, duplicate, delete kits
//   - Category/genre filtering
//   - Per-sample settings (volume, pan, pitch, pad assignment)
//   - Cubase dark theme
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/SoundKitManager.css';

const API_BASE = '/api/soundkits';

const SoundKitManager = ({
  audioContext,
  onLoadKit,       // (samples[]) => load samples into Beat Maker pads
  onLoadSample,    // (audioBuffer, name, url, padNum) => load single sample
  currentPads,     // Current pad data from Beat Maker for saving
  isEmbedded = false,
  onClose,
}) => {
  // ── State ──
  const [view, setView] = useState('my');  // my | community | create | detail
  const [myKits, setMyKits] = useState([]);
  const [communityKits, setCommunityKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [genres, setGenres] = useState([]);

  // Create kit form
  const [kitName, setKitName] = useState('');
  const [kitCategory, setKitCategory] = useState('General');
  const [kitGenre, setKitGenre] = useState('');
  const [kitDescription, setKitDescription] = useState('');
  const [kitTags, setKitTags] = useState('');
  const [kitIsPublic, setKitIsPublic] = useState(false);

  // Community filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Fetch categories ──
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || []);
        setGenres(data.genres || []);
      })
      .catch(() => {});
  }, []);

  // ── Fetch my kits ──
  const fetchMyKits = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(API_BASE, { headers });
      const data = await resp.json();
      setMyKits(data.kits || []);
    } catch (e) {
      setError('Failed to load kits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyKits(); }, []);

  // ── Fetch community kits ──
  const fetchCommunity = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p, per_page: 12, sort: sortBy,
        ...(searchQuery && { q: searchQuery }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterGenre && { genre: filterGenre }),
      });
      const resp = await fetch(`${API_BASE}/community?${params}`, { headers });
      const data = await resp.json();
      setCommunityKits(data.kits || []);
      setTotalPages(data.pages || 1);
      setPage(p);
    } catch (e) {
      setError('Failed to load community kits');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterGenre, sortBy]);

  useEffect(() => { if (view === 'community') fetchCommunity(1); }, [view, fetchCommunity]);

  // ── Fetch kit detail ──
  const fetchKitDetail = async (kitId) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${kitId}`, { headers });
      const data = await resp.json();
      setSelectedKit(data.kit);
      setView('detail');
    } catch (e) {
      setError('Failed to load kit');
    } finally {
      setLoading(false);
    }
  };

  // ── Create kit ──
  const handleCreateKit = async () => {
    if (!kitName.trim()) { setError('Kit name required'); return; }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(API_BASE, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: kitName, category: kitCategory, genre: kitGenre,
          description: kitDescription,
          tags: kitTags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: kitIsPublic,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      setSuccess(`Kit "${kitName}" created!`);
      setKitName(''); setKitDescription(''); setKitTags('');
      fetchMyKits();
      setSelectedKit(data.kit);
      setView('detail');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Save current pads as kit ──
  const handleSaveCurrentPads = async () => {
    if (!kitName.trim()) { setError('Enter a kit name first'); return; }
    if (!currentPads || currentPads.length === 0) { setError('No pads to save'); return; }
    setLoading(true);
    try {
      // Create the kit
      const resp = await fetch(API_BASE, {
        method: 'POST', headers,
        body: JSON.stringify({
          name: kitName, category: kitCategory, genre: kitGenre,
          description: kitDescription, tags: kitTags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: kitIsPublic,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed');
      const kitId = data.kit.id;

      // Upload each pad that has audio
      let uploaded = 0;
      for (let i = 0; i < currentPads.length; i++) {
        const pad = currentPads[i];
        if (pad && pad.audioUrl) {
          try {
            // Fetch audio blob from URL
            const audioResp = await fetch(pad.audioUrl);
            const blob = await audioResp.blob();
            const formData = new FormData();
            formData.append('audio', blob, pad.name || `pad_${i}.wav`);
            formData.append('pad_number', i);
            formData.append('name', pad.name || `Pad ${i + 1}`);
            formData.append('volume', pad.volume || 1.0);
            formData.append('pan', pad.pan || 0.0);

            await fetch(`${API_BASE}/${kitId}/samples`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            });
            uploaded++;
          } catch (e) {
            console.warn(`Failed to upload pad ${i}:`, e);
          }
        }
      }

      setSuccess(`Kit "${kitName}" saved with ${uploaded} samples!`);
      fetchMyKits();
      setKitName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Upload sample to existing kit ──
  const handleSampleUpload = async (kitId, files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    let count = 0;

    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      try {
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, '').slice(0, 120));
        formData.append('pad_number', -1);

        const resp = await fetch(`${API_BASE}/${kitId}/samples`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        if (resp.ok) count++;
      } catch (e) {
        console.warn('Upload failed:', e);
      }
    }

    setSuccess(`${count} sample(s) uploaded`);
    setUploading(false);
    if (selectedKit && selectedKit.id === kitId) fetchKitDetail(kitId);
  };

  // ── Load kit into Beat Maker ──
  const handleLoadKit = async (kit) => {
    if (!onLoadKit && !onLoadSample) return;
    setLoading(true);
    try {
      // Ensure we have full kit with samples
      let fullKit = kit;
      if (!kit.samples || kit.samples.length === 0) {
        const resp = await fetch(`${API_BASE}/${kit.id}`, { headers });
        const data = await resp.json();
        fullKit = data.kit;
      }

      if (onLoadKit) {
        onLoadKit(fullKit.samples);
        setSuccess(`"${fullKit.name}" loaded — ${fullKit.samples.length} samples`);
      }
    } catch (e) {
      setError('Failed to load kit');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete kit ──
  const handleDeleteKit = async (kitId) => {
    if (!window.confirm('Delete this kit and all samples?')) return;
    try {
      await fetch(`${API_BASE}/${kitId}`, { method: 'DELETE', headers });
      setSuccess('Kit deleted');
      fetchMyKits();
      if (selectedKit && selectedKit.id === kitId) { setSelectedKit(null); setView('my'); }
    } catch (e) {
      setError('Failed to delete');
    }
  };

  // ── Like kit ──
  const handleLike = async (kitId) => {
    try {
      const resp = await fetch(`${API_BASE}/${kitId}/like`, { method: 'POST', headers });
      const data = await resp.json();
      if (view === 'community') fetchCommunity(page);
      if (selectedKit && selectedKit.id === kitId) {
        setSelectedKit(prev => ({ ...prev, like_count: data.like_count }));
      }
    } catch (e) {}
  };

  // ── Duplicate kit ──
  const handleDuplicate = async (kitId) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${kitId}/duplicate`, { method: 'POST', headers });
      const data = await resp.json();
      setSuccess(`Kit duplicated to your library!`);
      fetchMyKits();
    } catch (e) {
      setError('Failed to duplicate');
    } finally {
      setLoading(false);
    }
  };

  // ── Clear messages after 3s ──
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  return (
    <div className={`skm ${isEmbedded ? 'skm-embedded' : ''}`}>
      {/* ── Header ── */}
      <div className="skm-header">
        <div className="skm-title-row">
          <h3 className="skm-title">
            <span>🎛️</span> Sound Kits
          </h3>
          {onClose && <button className="skm-close-btn" onClick={onClose}>✕</button>}
        </div>
        {/* Tab bar */}
        <div className="skm-tabs">
          <button className={`skm-tab ${view === 'my' ? 'active' : ''}`} onClick={() => setView('my')}>My Kits</button>
          <button className={`skm-tab ${view === 'community' ? 'active' : ''}`} onClick={() => setView('community')}>Community</button>
          <button className={`skm-tab ${view === 'create' ? 'active' : ''}`} onClick={() => setView('create')}>+ New Kit</button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="skm-msg skm-error">⚠ {error}</div>}
      {success && <div className="skm-msg skm-success">✓ {success}</div>}

      <div className="skm-body">

        {/* ════════ MY KITS VIEW ════════ */}
        {view === 'my' && (
          <div className="skm-list">
            {loading && <div className="skm-loading"><div className="skm-spinner"></div></div>}
            {!loading && myKits.length === 0 && (
              <div className="skm-empty">
                <span className="skm-empty-icon">📦</span>
                <p>No kits yet</p>
                <button className="skm-link-btn" onClick={() => setView('create')}>Create your first kit →</button>
              </div>
            )}
            <div className="skm-kit-grid">
              {myKits.map(kit => (
                <div key={kit.id} className="skm-kit-card" onClick={() => fetchKitDetail(kit.id)}>
                  <div className="skm-kit-cat-badge">{categories.find(c => c.name === kit.category)?.emoji || '📦'}</div>
                  <div className="skm-kit-info">
                    <div className="skm-kit-name">{kit.name}</div>
                    <div className="skm-kit-meta">
                      <span>{kit.sample_count} samples</span>
                      <span>{kit.category}</span>
                      {kit.genre && <span>{kit.genre}</span>}
                      {kit.is_public && <span className="skm-public-badge">Public</span>}
                    </div>
                  </div>
                  <div className="skm-kit-actions" onClick={e => e.stopPropagation()}>
                    <button className="skm-action-btn load" onClick={() => handleLoadKit(kit)} title="Load into Beat Maker">▶</button>
                    <button className="skm-action-btn del" onClick={() => handleDeleteKit(kit.id)} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ COMMUNITY VIEW ════════ */}
        {view === 'community' && (
          <div className="skm-community">
            {/* Filters */}
            <div className="skm-filters">
              <input className="skm-search" placeholder="Search kits..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchCommunity(1)} />
              <select className="skm-filter-sel" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); }}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
              </select>
              <select className="skm-filter-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="popular">Most Liked</option>
                <option value="downloads">Most Downloaded</option>
              </select>
              <button className="skm-filter-btn" onClick={() => fetchCommunity(1)}>Search</button>
            </div>

            {loading && <div className="skm-loading"><div className="skm-spinner"></div></div>}

            <div className="skm-kit-grid">
              {communityKits.map(kit => (
                <div key={kit.id} className="skm-kit-card" onClick={() => fetchKitDetail(kit.id)}>
                  <div className="skm-kit-cat-badge">{categories.find(c => c.name === kit.category)?.emoji || '📦'}</div>
                  <div className="skm-kit-info">
                    <div className="skm-kit-name">{kit.name}</div>
                    <div className="skm-kit-meta">
                      <span>{kit.sample_count} samples</span>
                      <span>by {kit.username}</span>
                      <span>❤ {kit.like_count}</span>
                      <span>↓ {kit.download_count}</span>
                    </div>
                    {kit.tags && kit.tags.length > 0 && (
                      <div className="skm-kit-tags">
                        {kit.tags.slice(0, 4).map(t => <span key={t} className="skm-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="skm-kit-actions" onClick={e => e.stopPropagation()}>
                    <button className="skm-action-btn load" onClick={() => handleLoadKit(kit)} title="Load">▶</button>
                    <button className="skm-action-btn" onClick={() => handleLike(kit.id)} title="Like">❤</button>
                    <button className="skm-action-btn" onClick={() => handleDuplicate(kit.id)} title="Copy to my kits">📋</button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="skm-pagination">
                <button disabled={page <= 1} onClick={() => fetchCommunity(page - 1)}>← Prev</button>
                <span>Page {page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => fetchCommunity(page + 1)}>Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ════════ CREATE VIEW ════════ */}
        {view === 'create' && (
          <div className="skm-create">
            <h4 className="skm-section-title">Create New Kit</h4>
            <div className="skm-form">
              <div className="skm-field">
                <label>Kit Name *</label>
                <input value={kitName} onChange={e => setKitName(e.target.value)} placeholder="My Trap Kit" />
              </div>
              <div className="skm-field-row">
                <div className="skm-field">
                  <label>Category</label>
                  <select value={kitCategory} onChange={e => setKitCategory(e.target.value)}>
                    {categories.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                    {categories.length === 0 && <option value="General">General</option>}
                  </select>
                </div>
                <div className="skm-field">
                  <label>Genre</label>
                  <select value={kitGenre} onChange={e => setKitGenre(e.target.value)}>
                    <option value="">None</option>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="skm-field">
                <label>Description</label>
                <textarea value={kitDescription} onChange={e => setKitDescription(e.target.value)} placeholder="What's in this kit?" rows={2} />
              </div>
              <div className="skm-field">
                <label>Tags (comma separated)</label>
                <input value={kitTags} onChange={e => setKitTags(e.target.value)} placeholder="hard, 808, dark" />
              </div>
              <label className="skm-checkbox">
                <input type="checkbox" checked={kitIsPublic} onChange={e => setKitIsPublic(e.target.checked)} />
                Share with community (public)
              </label>
              <div className="skm-form-actions">
                <button className="skm-primary-btn" onClick={handleCreateKit} disabled={loading}>
                  {loading ? '...' : '✓ Create Empty Kit'}
                </button>
                {currentPads && currentPads.some(p => p && p.audioUrl) && (
                  <button className="skm-accent-btn" onClick={handleSaveCurrentPads} disabled={loading}>
                    {loading ? '...' : '💾 Save Current Pads as Kit'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ KIT DETAIL VIEW ════════ */}
        {view === 'detail' && selectedKit && (
          <div className="skm-detail">
            <button className="skm-back-btn" onClick={() => setView('my')}>← Back</button>

            <div className="skm-detail-header">
              <span className="skm-detail-emoji">{categories.find(c => c.name === selectedKit.category)?.emoji || '📦'}</span>
              <div>
                <h4 className="skm-detail-name">{selectedKit.name}</h4>
                <div className="skm-detail-meta">
                  <span>{selectedKit.category}</span>
                  {selectedKit.genre && <span>{selectedKit.genre}</span>}
                  <span>{selectedKit.sample_count || selectedKit.samples?.length || 0} samples</span>
                  {selectedKit.is_public && <span className="skm-public-badge">Public</span>}
                </div>
                {selectedKit.description && <p className="skm-detail-desc">{selectedKit.description}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="skm-detail-actions">
              <button className="skm-primary-btn" onClick={() => handleLoadKit(selectedKit)}>
                ▶ Load into Beat Maker
              </button>
              <button className="skm-action-btn" onClick={() => handleLike(selectedKit.id)}>
                ❤ {selectedKit.like_count || 0}
              </button>
              <button className="skm-action-btn" onClick={() => handleDuplicate(selectedKit.id)}>
                📋 Duplicate
              </button>
            </div>

            {/* Upload samples */}
            <div className="skm-upload-area">
              <button className="skm-upload-btn" onClick={() => fileInputRef.current?.click()}>
                {uploading ? '⏳ Uploading...' : '+ Add Samples'}
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*" multiple style={{ display: 'none' }}
                onChange={e => handleSampleUpload(selectedKit.id, e.target.files)} />
              <span className="skm-upload-hint">Drop audio files or click to browse</span>
            </div>

            {/* Sample list */}
            <div className="skm-samples">
              <h4 className="skm-section-title">Samples ({selectedKit.samples?.length || 0})</h4>
              {selectedKit.samples && selectedKit.samples.length > 0 ? (
                <div className="skm-sample-list">
                  {selectedKit.samples.map((sample, i) => (
                    <div key={sample.id} className="skm-sample-row">
                      <span className="skm-sample-pad" style={{ borderColor: sample.color }}>
                        {sample.pad_number >= 0 ? `P${sample.pad_number + 1}` : '—'}
                      </span>
                      <span className="skm-sample-name">{sample.name}</span>
                      <span className="skm-sample-dur">{sample.duration ? `${sample.duration.toFixed(1)}s` : ''}</span>
                      <span className="skm-sample-type">{sample.file_type?.toUpperCase()}</span>
                      {onLoadSample && (
                        <button className="skm-sample-load" onClick={async () => {
                          try {
                            const resp = await fetch(sample.audio_url);
                            const ab = await resp.arrayBuffer();
                            const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
                            const buf = await ctx.decodeAudioData(ab);
                            onLoadSample(buf, sample.name, sample.audio_url, sample.pad_number);
                            setSuccess(`"${sample.name}" loaded to pad ${sample.pad_number + 1}`);
                          } catch (e) {
                            setError('Failed to load sample');
                          }
                        }}>Load</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="skm-empty-samples">No samples yet — upload some above!</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundKitManager;