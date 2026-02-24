// =============================================================================
// DrumKitConnector.js — Sound Kit ↔ Beat Maker Bridge
// =============================================================================
// Location: src/front/js/component/DrumKitConnector.js
//
// PURPOSE:
//   Connects the SoundKit API (sound_kit_routes.py) to the SamplerBeatMaker
//   so users can:
//     1. Browse their uploaded drum kits from the server
//     2. One-click load an entire kit into the 16 pads
//     3. Load individual samples from any kit to specific pads
//     4. Save current pad configuration as a new kit (uploads buffers)
//     5. Browse & load community kits
//     6. Remember which kit is loaded per project
//
// INTEGRATION:
//   Drop this into SamplerBeatMaker's library panel (replaces the static
//   SOUND_LIBRARY object). Uses the existing loadSample(padIndex, url) and
//   updatePad(padIndex, props) functions from the Beat Maker.
//
// API ENDPOINTS USED:
//   GET    /api/soundkits                — User's kits
//   GET    /api/soundkits/<id>           — Kit detail + samples
//   POST   /api/soundkits               — Create kit
//   POST   /api/soundkits/<id>/samples   — Upload sample
//   GET    /api/soundkits/community      — Public kits
//   POST   /api/soundkits/<id>/duplicate — Copy community kit
//   POST   /api/soundkits/<id>/like      — Toggle like
//   GET    /api/soundkits/categories     — Categories & genres
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = (process.env.REACT_APP_BACKEND_URL || '') + '/api/soundkits';

const getToken = () => {
  try { return localStorage.getItem('token') || sessionStorage.getItem('token') || ''; }
  catch { return ''; }
};

const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
});

// =============================================================================
// AUDIO BUFFER CACHE — Avoid re-downloading samples we already fetched
// =============================================================================
const bufferCache = new Map(); // url → AudioBuffer

async function fetchAudioBuffer(url, audioContext) {
  if (bufferCache.has(url)) return bufferCache.get(url);
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const ab = await resp.arrayBuffer();
    const buf = await audioContext.decodeAudioData(ab);
    bufferCache.set(url, buf);
    return buf;
  } catch (e) {
    console.error(`Failed to fetch audio: ${url}`, e);
    return null;
  }
}

// =============================================================================
// KIT LOADER — Core logic for loading a kit into Beat Maker pads
// =============================================================================

/**
 * Load an entire SoundKit into the Beat Maker pad array.
 *
 * @param {Object}   kit          — Full kit object from API (with .samples array)
 * @param {Function} loadSample   — Beat Maker's loadSample(padIndex, urlOrBuffer)
 * @param {Function} updatePad    — Beat Maker's updatePad(padIndex, props)
 * @param {Object}   audioContext  — Web Audio AudioContext
 * @param {Function} onProgress   — (loaded, total) => void
 * @returns {Promise<number>}     — Number of samples loaded
 */
async function loadKitIntoPads(kit, loadSample, updatePad, audioContext, onProgress) {
  if (!kit?.samples?.length) return 0;

  const samples = kit.samples
    .filter(s => s.audio_url && s.pad_number >= 0 && s.pad_number < 16)
    .sort((a, b) => a.pad_number - b.pad_number);

  let loaded = 0;
  const total = samples.length;

  for (const sample of samples) {
    try {
      // Fetch and decode audio
      const buf = await fetchAudioBuffer(sample.audio_url, audioContext);
      if (!buf) continue;

      const pi = sample.pad_number;

      // Load buffer into pad
      await loadSample(pi, buf);

      // Apply saved settings from the kit
      const padProps = {};
      if (sample.volume != null && sample.volume !== 1.0) padProps.volume = sample.volume;
      if (sample.pan != null && sample.pan !== 0) padProps.pan = sample.pan;
      if (sample.pitch != null && sample.pitch !== 0) padProps.pitch = sample.pitch;
      if (sample.start_time > 0) padProps.trimStart = sample.start_time;
      if (sample.end_time > 0) padProps.trimEnd = sample.end_time;
      if (sample.is_loop) padProps.playMode = 'loop';
      else if (sample.is_one_shot) padProps.playMode = 'oneshot';
      if (sample.color) padProps.color = sample.color;
      if (sample.name) padProps.name = sample.name;

      if (Object.keys(padProps).length > 0) updatePad(pi, padProps);

      loaded++;
      if (onProgress) onProgress(loaded, total);
    } catch (e) {
      console.warn(`Failed to load sample "${sample.name}" to pad ${sample.pad_number}:`, e);
    }
  }

  return loaded;
}

/**
 * Load a single sample from a kit into a specific pad.
 */
async function loadSampleToPad(sample, padIndex, loadSample, updatePad, audioContext) {
  if (!sample?.audio_url) return false;
  try {
    const buf = await fetchAudioBuffer(sample.audio_url, audioContext);
    if (!buf) return false;
    await loadSample(padIndex, buf);
    const props = { name: sample.name || `Sample` };
    if (sample.volume != null) props.volume = sample.volume;
    if (sample.pan != null) props.pan = sample.pan;
    if (sample.pitch != null) props.pitch = sample.pitch;
    if (sample.start_time > 0) props.trimStart = sample.start_time;
    if (sample.end_time > 0) props.trimEnd = sample.end_time;
    if (sample.is_loop) props.playMode = 'loop';
    if (sample.color) props.color = sample.color;
    updatePad(padIndex, props);
    return true;
  } catch (e) {
    console.error('Failed to load sample:', e);
    return false;
  }
}

// =============================================================================
// KIT SAVER — Save current Beat Maker state as a new SoundKit
// =============================================================================

/**
 * Save current pad state as a new SoundKit on the server.
 * Converts AudioBuffers to WAV blobs and uploads each.
 *
 * @param {string}   kitName      — Name for the new kit
 * @param {Object}   kitMeta      — { category, genre, description, tags, is_public }
 * @param {Array}    pads         — Current pads array from Beat Maker
 * @param {Object}   audioContext  — AudioContext for buffer access
 * @param {Function} onProgress   — (uploaded, total, currentName) => void
 * @returns {Promise<Object>}     — Created kit object
 */
async function saveKitFromPads(kitName, kitMeta, pads, audioContext, onProgress) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  // 1. Create the kit
  const createResp = await fetch(API_BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: kitName,
      category: kitMeta.category || 'Drums',
      genre: kitMeta.genre || '',
      description: kitMeta.description || '',
      tags: kitMeta.tags || [],
      is_public: kitMeta.is_public || false,
    }),
  });
  const createData = await createResp.json();
  if (!createResp.ok) throw new Error(createData.error || 'Failed to create kit');
  const kitId = createData.kit.id;

  // 2. Upload each pad that has an audio buffer
  const padsWithAudio = pads
    .map((p, i) => ({ ...p, index: i }))
    .filter(p => p.buffer);
  const total = padsWithAudio.length;
  let uploaded = 0;

  for (const pad of padsWithAudio) {
    try {
      // Convert AudioBuffer → WAV Blob
      const wavBlob = audioBufferToWav(pad.buffer);

      const formData = new FormData();
      formData.append('audio', wavBlob, `${pad.name || 'pad_' + pad.index}.wav`);
      formData.append('pad_number', pad.index);
      formData.append('name', pad.name || `Pad ${pad.index + 1}`);
      formData.append('volume', pad.volume || 1.0);
      formData.append('pan', pad.pan || 0);
      formData.append('pitch', pad.pitch || 0);
      formData.append('is_one_shot', pad.playMode === 'oneshot' || pad.playMode === 'hold' ? 'true' : 'false');
      formData.append('is_loop', pad.playMode === 'loop' ? 'true' : 'false');
      formData.append('color', pad.color || '#FF6600');
      if (pad.trimStart > 0) formData.append('start_time', pad.trimStart);
      if (pad.trimEnd) formData.append('end_time', pad.trimEnd);

      await fetch(`${API_BASE}/${kitId}/samples`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      uploaded++;
      if (onProgress) onProgress(uploaded, total, pad.name);
    } catch (e) {
      console.warn(`Failed to upload pad ${pad.index}:`, e);
    }
  }

  return { ...createData.kit, uploadedCount: uploaded };
}

/**
 * Minimal WAV encoder for AudioBuffer → Blob (16-bit PCM)
 */
function audioBufferToWav(buffer) {
  const nc = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const dl = len * nc * 2;
  const ab = new ArrayBuffer(44 + dl);
  const v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + dl, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * nc * 2, true);
  v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, dl, true);
  const chs = [];
  for (let c = 0; c < nc; c++) chs.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < nc; c++) {
      const s = Math.max(-1, Math.min(1, chs[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      o += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// =============================================================================
// PROJECT KIT PERSISTENCE — Remember loaded kit per project
// =============================================================================

const PROJECT_KIT_KEY = 'spx_project_kit_';

function saveProjectKit(projectId, kitId) {
  if (!projectId) return;
  try { localStorage.setItem(PROJECT_KIT_KEY + projectId, kitId); } catch {}
}

function getProjectKit(projectId) {
  if (!projectId) return null;
  try { return localStorage.getItem(PROJECT_KIT_KEY + projectId); } catch { return null; }
}

// =============================================================================
// React Component — Drop-in replacement for SOUND_LIBRARY panel
// =============================================================================

const DrumKitConnector = ({
  // Beat Maker integration
  loadSample,       // (padIndex, urlOrBuffer) => Promise
  updatePad,        // (padIndex, props) => void
  pads,             // Current pads array
  audioContext,      // Shared AudioContext or null
  selectedPad,      // Currently selected pad index (for single-sample load)

  // Project context
  projectId,        // Optional: for per-project kit persistence

  // UI
  onClose,
  isEmbedded = true,
}) => {

  // ── State ──
  const [view, setView] = useState('my'); // my | community | save | detail
  const [myKits, setMyKits] = useState([]);
  const [communityKits, setCommunityKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [categories, setCategories] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingKit, setLoadingKit] = useState(null); // kit id being loaded
  const [progress, setProgress] = useState({ loaded: 0, total: 0, label: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeKitId, setActiveKitId] = useState(null);

  // Community filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Save form
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('Drums');
  const [saveGenre, setSaveGenre] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [savePublic, setSavePublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const ctxRef = useRef(null);
  const getCtx = useCallback(() => {
    if (audioContext) return audioContext;
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, [audioContext]);

  // ── Auto-clear messages ──
  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => { setSuccess(''); setError(''); }, 4000);
    return () => clearTimeout(t);
  }, [success, error]);

  // ── Fetch categories ──
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(d => { setCategories(d.categories || []); setGenres(d.genres || []); })
      .catch(() => {});
  }, []);

  // ── Fetch user's kits ──
  const fetchMyKits = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const resp = await fetch(API_BASE, { headers: authHeaders() });
      const data = await resp.json();
      if (resp.ok) setMyKits(data.kits || []);
    } catch (e) {
      console.error('Fetch kits error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMyKits(); }, [fetchMyKits]);

  // ── Restore project kit on mount ──
  useEffect(() => {
    if (!projectId) return;
    const savedKitId = getProjectKit(projectId);
    if (savedKitId) setActiveKitId(parseInt(savedKitId));
  }, [projectId]);

  // ── Fetch community kits ──
  const fetchCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (filterGenre) params.set('genre', filterGenre);
      if (searchQuery) params.set('q', searchQuery);
      params.set('sort', sortBy);

      const resp = await fetch(`${API_BASE}/community?${params}`, { headers: authHeaders() });
      const data = await resp.json();
      if (resp.ok) setCommunityKits(data.kits || []);
    } catch (e) {
      console.error('Fetch community error:', e);
    }
    setLoading(false);
  }, [filterCategory, filterGenre, searchQuery, sortBy]);

  useEffect(() => { if (view === 'community') fetchCommunity(); }, [view, fetchCommunity]);

  // ── Fetch kit detail (with samples) ──
  const fetchKitDetail = useCallback(async (kitId) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/${kitId}`, { headers: authHeaders() });
      const data = await resp.json();
      if (resp.ok) {
        setSelectedKit(data.kit);
        setView('detail');
      } else {
        setError(data.error || 'Failed to load kit');
      }
    } catch (e) {
      setError('Network error');
    }
    setLoading(false);
  }, []);

  // ── LOAD ENTIRE KIT → PADS ──
  const handleLoadKit = useCallback(async (kit) => {
    if (!kit?.samples?.length) {
      // Need to fetch full detail first
      setLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/${kit.id}`, { headers: authHeaders() });
        const data = await resp.json();
        if (!resp.ok) { setError('Failed to fetch kit'); setLoading(false); return; }
        kit = data.kit;
      } catch { setError('Network error'); setLoading(false); return; }
      setLoading(false);
    }

    const ctx = getCtx();
    setLoadingKit(kit.id);
    setProgress({ loaded: 0, total: kit.samples.length, label: '' });

    try {
      const count = await loadKitIntoPads(
        kit, loadSample, updatePad, ctx,
        (loaded, total) => setProgress({ loaded, total, label: `Loading ${loaded}/${total}...` })
      );

      setActiveKitId(kit.id);
      if (projectId) saveProjectKit(projectId, kit.id);
      setSuccess(`Loaded "${kit.name}" — ${count} samples`);
      setProgress({ loaded: 0, total: 0, label: '' });
    } catch (e) {
      setError(`Load failed: ${e.message}`);
    }
    setLoadingKit(null);
  }, [loadSample, updatePad, getCtx, projectId]);

  // ── LOAD SINGLE SAMPLE → SELECTED PAD ──
  const handleLoadSingleSample = useCallback(async (sample, targetPad) => {
    const pi = targetPad ?? selectedPad ?? 0;
    const ctx = getCtx();
    setProgress({ loaded: 0, total: 1, label: `Loading "${sample.name}"...` });

    const ok = await loadSampleToPad(sample, pi, loadSample, updatePad, ctx);
    if (ok) {
      setSuccess(`"${sample.name}" → Pad ${pi + 1}`);
    } else {
      setError('Failed to load sample');
    }
    setProgress({ loaded: 0, total: 0, label: '' });
  }, [selectedPad, loadSample, updatePad, getCtx]);

  // ── SAVE CURRENT PADS AS KIT ──
  const handleSaveKit = useCallback(async () => {
    if (!saveName.trim()) { setError('Enter a kit name'); return; }
    const ctx = getCtx();
    setSaving(true);
    setProgress({ loaded: 0, total: 0, label: 'Creating kit...' });

    try {
      const kit = await saveKitFromPads(
        saveName, {
          category: saveCategory, genre: saveGenre,
          description: saveDesc,
          tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
          is_public: savePublic,
        },
        pads, ctx,
        (uploaded, total, name) => setProgress({ loaded: uploaded, total, label: `Uploading ${name}...` })
      );

      setSuccess(`Saved "${saveName}" with ${kit.uploadedCount} samples!`);
      setSaveName(''); setSaveDesc(''); setSaveTags('');
      setProgress({ loaded: 0, total: 0, label: '' });
      fetchMyKits();
      setView('my');
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }, [saveName, saveCategory, saveGenre, saveDesc, saveTags, savePublic, pads, getCtx, fetchMyKits]);

  // ── DUPLICATE COMMUNITY KIT ──
  const handleDuplicate = useCallback(async (kitId) => {
    try {
      const resp = await fetch(`${API_BASE}/${kitId}/duplicate`, {
        method: 'POST', headers: authHeaders(),
      });
      const data = await resp.json();
      if (resp.ok) { setSuccess('Kit copied to your library!'); fetchMyKits(); }
      else setError(data.error || 'Duplicate failed');
    } catch { setError('Network error'); }
  }, [fetchMyKits]);

  // ── LIKE KIT ──
  const handleLike = useCallback(async (kitId) => {
    try {
      await fetch(`${API_BASE}/${kitId}/like`, { method: 'POST', headers: authHeaders() });
      fetchCommunity();
    } catch {}
  }, [fetchCommunity]);

  // ── DELETE KIT ──
  const handleDelete = useCallback(async (kitId) => {
    if (!window.confirm('Delete this kit and all its samples?')) return;
    try {
      const resp = await fetch(`${API_BASE}/${kitId}`, { method: 'DELETE', headers: authHeaders() });
      if (resp.ok) { setSuccess('Kit deleted'); fetchMyKits(); if (selectedKit?.id === kitId) setSelectedKit(null); }
      else setError('Delete failed');
    } catch { setError('Network error'); }
  }, [fetchMyKits, selectedKit]);

  // ── Preview sample (play directly) ──
  const previewSample = useCallback(async (sample) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const buf = await fetchAudioBuffer(sample.audio_url, ctx);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  }, [getCtx]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <h3 style={S.title}>🥁 Sound Kits</h3>
        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(view === 'my' ? S.tabActive : {}) }} onClick={() => setView('my')}>My Kits</button>
          <button style={{ ...S.tab, ...(view === 'community' ? S.tabActive : {}) }} onClick={() => setView('community')}>Community</button>
          <button style={{ ...S.tab, ...(view === 'save' ? S.tabActive : {}) }} onClick={() => setView('save')}>Save Kit</button>
        </div>
        {onClose && <button style={S.closeBtn} onClick={onClose}>✕</button>}
      </div>

      {/* Status messages */}
      {(error || success || progress.label) && (
        <div style={{ ...S.statusBar, background: error ? '#ff3b3020' : success ? '#34c75920' : '#00ffc810' }}>
          {progress.label && <span style={{ color: '#00ffc8' }}>{progress.label}</span>}
          {progress.total > 0 && (
            <div style={S.progressBar}>
              <div style={{ ...S.progressFill, width: `${(progress.loaded / progress.total) * 100}%` }} />
            </div>
          )}
          {error && <span style={{ color: '#ff3b30' }}>⚠ {error}</span>}
          {success && <span style={{ color: '#34c759' }}>✓ {success}</span>}
        </div>
      )}

      {/* Loading spinner */}
      {loading && <div style={S.loader}>Loading...</div>}

      {/* ── MY KITS VIEW ── */}
      {view === 'my' && !loading && (
        <div style={S.kitList}>
          {myKits.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
              <div>No kits yet. Save your current pads or browse community kits.</div>
            </div>
          ) : (
            myKits.map(kit => (
              <div key={kit.id} style={{ ...S.kitCard, borderColor: activeKitId === kit.id ? '#00ffc8' : '#1e2d3d' }}>
                <div style={S.kitInfo}>
                  <div style={S.kitName}>
                    {activeKitId === kit.id && <span style={S.activeDot}>●</span>}
                    {kit.name}
                  </div>
                  <div style={S.kitMeta}>
                    {kit.category && <span style={S.kitBadge}>{kit.category}</span>}
                    {kit.genre && <span style={S.kitBadge}>{kit.genre}</span>}
                    <span style={S.kitSamples}>{kit.sample_count} samples</span>
                    {kit.is_public && <span style={{ ...S.kitBadge, background: '#34c75920', color: '#34c759' }}>Public</span>}
                  </div>
                </div>
                <div style={S.kitActions}>
                  <button
                    style={{ ...S.loadBtn, opacity: loadingKit === kit.id ? 0.5 : 1 }}
                    onClick={() => handleLoadKit(kit)}
                    disabled={loadingKit === kit.id}
                  >
                    {loadingKit === kit.id ? '⏳' : '📥'} Load
                  </button>
                  <button style={S.detailBtn} onClick={() => fetchKitDetail(kit.id)}>👁</button>
                  <button style={S.deleteBtn} onClick={() => handleDelete(kit.id)}>🗑</button>
                </div>
              </div>
            ))
          )}
          <button style={S.refreshBtn} onClick={fetchMyKits}>🔄 Refresh</button>
        </div>
      )}

      {/* ── COMMUNITY VIEW ── */}
      {view === 'community' && !loading && (
        <div style={S.communityView}>
          <div style={S.filterBar}>
            <input
              style={S.searchInput}
              placeholder="Search kits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCommunity()}
            />
            <select style={S.filterSelect} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
            </select>
            <select style={S.filterSelect} value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)}>
              <option value="">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select style={S.filterSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="popular">Most Liked</option>
              <option value="downloads">Most Downloaded</option>
            </select>
          </div>

          <div style={S.kitList}>
            {communityKits.length === 0 ? (
              <div style={S.empty}>No community kits found. Try different filters.</div>
            ) : (
              communityKits.map(kit => (
                <div key={kit.id} style={S.kitCard}>
                  <div style={S.kitInfo}>
                    <div style={S.kitName}>{kit.name}</div>
                    <div style={S.kitMeta}>
                      <span style={S.kitAuthor}>by {kit.username || 'Unknown'}</span>
                      {kit.category && <span style={S.kitBadge}>{kit.category}</span>}
                      {kit.genre && <span style={S.kitBadge}>{kit.genre}</span>}
                      <span style={S.kitSamples}>{kit.sample_count} samples</span>
                      <span style={S.kitLikes}>❤ {kit.like_count || 0}</span>
                    </div>
                  </div>
                  <div style={S.kitActions}>
                    <button style={S.loadBtn} onClick={() => handleLoadKit(kit)}>📥 Load</button>
                    <button style={S.detailBtn} onClick={() => fetchKitDetail(kit.id)}>👁</button>
                    <button style={S.likeBtn} onClick={() => handleLike(kit.id)}>❤</button>
                    <button style={S.dupBtn} onClick={() => handleDuplicate(kit.id)}>📋 Copy</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── KIT DETAIL VIEW ── */}
      {view === 'detail' && selectedKit && (
        <div style={S.detailView}>
          <button style={S.backBtn} onClick={() => { setView('my'); setSelectedKit(null); }}>← Back</button>
          <div style={S.detailHeader}>
            <h3 style={S.detailName}>{selectedKit.name}</h3>
            {selectedKit.description && <div style={S.detailDesc}>{selectedKit.description}</div>}
            <div style={S.kitMeta}>
              {selectedKit.category && <span style={S.kitBadge}>{selectedKit.category}</span>}
              {selectedKit.genre && <span style={S.kitBadge}>{selectedKit.genre}</span>}
              <span style={S.kitSamples}>{selectedKit.samples?.length || 0} samples</span>
              {selectedKit.tags?.length > 0 && selectedKit.tags.map(t => (
                <span key={t} style={{ ...S.kitBadge, background: '#4a9eff20', color: '#4a9eff' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Load all button */}
          <button
            style={{ ...S.loadAllBtn, opacity: loadingKit === selectedKit.id ? 0.5 : 1 }}
            onClick={() => handleLoadKit(selectedKit)}
            disabled={loadingKit === selectedKit.id}
          >
            {loadingKit === selectedKit.id ? '⏳ Loading...' : '📥 Load Entire Kit to Pads'}
          </button>

          {/* Sample list */}
          <div style={S.sampleList}>
            {selectedKit.samples?.sort((a, b) => a.pad_number - b.pad_number).map(sample => (
              <div key={sample.id} style={S.sampleRow}>
                <span style={{ ...S.samplePad, borderColor: sample.color || '#FF6600' }}>
                  {sample.pad_number >= 0 ? `P${sample.pad_number + 1}` : '—'}
                </span>
                <span style={S.sampleName}>{sample.name}</span>
                <span style={S.sampleDur}>
                  {sample.duration ? `${sample.duration.toFixed(1)}s` : ''}
                </span>
                <span style={S.sampleType}>{sample.file_type?.toUpperCase()}</span>
                <button style={S.previewBtn} onClick={() => previewSample(sample)} title="Preview">▶</button>
                <button
                  style={S.loadSampleBtn}
                  onClick={() => handleLoadSingleSample(sample)}
                  title={`Load to Pad ${(selectedPad ?? 0) + 1}`}
                >
                  → P{(selectedPad ?? 0) + 1}
                </button>
                {/* Load to specific pad via dropdown */}
                <select
                  style={S.padSelect}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleLoadSingleSample(sample, parseInt(e.target.value));
                  }}
                >
                  <option value="">Pad...</option>
                  {Array.from({ length: 16 }, (_, i) => (
                    <option key={i} value={i}>P{i + 1}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVE KIT VIEW ── */}
      {view === 'save' && (
        <div style={S.saveView}>
          <h3 style={S.saveTitle}>💾 Save Current Pads as Kit</h3>
          <div style={S.saveInfo}>
            {pads.filter(p => p.buffer).length} pads with audio will be uploaded
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Kit Name *</label>
            <input
              style={S.formInput}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="My Drum Kit"
            />
          </div>

          <div style={S.formRow}>
            <div style={S.formGroup}>
              <label style={S.formLabel}>Category</label>
              <select style={S.formSelect} value={saveCategory} onChange={(e) => setSaveCategory(e.target.value)}>
                {categories.map(c => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.formLabel}>Genre</label>
              <select style={S.formSelect} value={saveGenre} onChange={(e) => setSaveGenre(e.target.value)}>
                <option value="">None</option>
                {genres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Description</label>
            <textarea
              style={S.formTextarea}
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Tags (comma-separated)</label>
            <input
              style={S.formInput}
              value={saveTags}
              onChange={(e) => setSaveTags(e.target.value)}
              placeholder="trap, 808, dark"
            />
          </div>

          <label style={S.checkboxLabel}>
            <input type="checkbox" checked={savePublic} onChange={(e) => setSavePublic(e.target.checked)} />
            Make public (share with community)
          </label>

          <button
            style={{ ...S.saveBtn, opacity: saving ? 0.5 : 1 }}
            onClick={handleSaveKit}
            disabled={saving || !saveName.trim()}
          >
            {saving ? '⏳ Uploading...' : '💾 Save Kit'}
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Styles — Dark theme matching SamplerBeatMaker
// =============================================================================
const S = {
  container: { background: '#0d1520', borderRadius: 8, border: '1px solid #1e2d3d', fontFamily: "'Inter', -apple-system, sans-serif", maxHeight: '70vh', overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #1e2d3d', position: 'sticky', top: 0, background: '#0d1520', zIndex: 5 },
  title: { margin: 0, fontSize: 14, color: '#e0e8f0', fontWeight: 700, whiteSpace: 'nowrap' },
  tabs: { display: 'flex', gap: 4, marginLeft: 8, flex: 1 },
  tab: { background: 'none', border: '1px solid #1e2d3d', borderRadius: 4, padding: '4px 10px', color: '#5a7088', fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  tabActive: { background: '#00ffc815', borderColor: '#00ffc840', color: '#00ffc8' },
  closeBtn: { background: 'none', border: 'none', color: '#5a7088', fontSize: 16, cursor: 'pointer', marginLeft: 'auto' },

  statusBar: { padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, borderBottom: '1px solid #1e2d3d' },
  progressBar: { flex: 1, height: 4, background: '#1a2332', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#00ffc8', borderRadius: 2, transition: 'width 0.2s' },

  loader: { padding: 20, textAlign: 'center', color: '#5a7088', fontSize: 12 },
  empty: { padding: 24, textAlign: 'center', color: '#3a5068', fontSize: 12, lineHeight: 1.5 },

  // Kit list
  kitList: { padding: 8, display: 'flex', flexDirection: 'column', gap: 6 },
  kitCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0a1018', border: '1px solid #1e2d3d', borderRadius: 6, transition: 'border-color 0.15s' },
  kitInfo: { flex: 1, minWidth: 0 },
  kitName: { fontSize: 13, color: '#e0e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 },
  kitMeta: { display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' },
  kitBadge: { fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#ff660020', color: '#ff6600', fontWeight: 600 },
  kitSamples: { fontSize: 10, color: '#3a5068' },
  kitLikes: { fontSize: 10, color: '#ff6b85' },
  kitAuthor: { fontSize: 10, color: '#5a7088', fontStyle: 'italic' },
  activeDot: { color: '#00ffc8', fontSize: 10 },

  kitActions: { display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 },
  loadBtn: { background: '#00ffc815', border: '1px solid #00ffc840', borderRadius: 4, padding: '4px 10px', color: '#00ffc8', fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  detailBtn: { background: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 4, padding: '4px 8px', color: '#8899aa', fontSize: 11, cursor: 'pointer' },
  deleteBtn: { background: '#ff3b3010', border: '1px solid #ff3b3030', borderRadius: 4, padding: '4px 8px', color: '#ff3b30', fontSize: 11, cursor: 'pointer' },
  likeBtn: { background: '#ff6b8510', border: '1px solid #ff6b8530', borderRadius: 4, padding: '4px 8px', color: '#ff6b85', fontSize: 11, cursor: 'pointer' },
  dupBtn: { background: '#4a9eff10', border: '1px solid #4a9eff30', borderRadius: 4, padding: '4px 8px', color: '#4a9eff', fontSize: 11, cursor: 'pointer' },
  refreshBtn: { background: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 4, padding: '6px 12px', color: '#5a7088', fontSize: 11, cursor: 'pointer', alignSelf: 'center', marginTop: 4 },

  // Community
  communityView: { display: 'flex', flexDirection: 'column' },
  filterBar: { display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid #1e2d3d', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: 120, background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 4, padding: '5px 8px', color: '#e0e8f0', fontSize: 11, outline: 'none' },
  filterSelect: { background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 4, padding: '4px 6px', color: '#8899aa', fontSize: 10, outline: 'none' },

  // Detail
  detailView: { padding: 12 },
  backBtn: { background: 'none', border: 'none', color: '#00ffc8', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 8 },
  detailHeader: { marginBottom: 12 },
  detailName: { margin: 0, fontSize: 16, color: '#e0e8f0', fontWeight: 700 },
  detailDesc: { fontSize: 12, color: '#5a7088', marginTop: 4 },
  loadAllBtn: { width: '100%', background: 'linear-gradient(135deg, #00ffc8, #00b894)', border: 'none', borderRadius: 6, padding: '10px', color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginBottom: 12 },

  sampleList: { display: 'flex', flexDirection: 'column', gap: 4 },
  sampleRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#0a1018', borderRadius: 4, border: '1px solid #1a2332' },
  samplePad: { width: 28, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, border: '2px solid', fontSize: 9, fontWeight: 700, color: '#e0e8f0', flexShrink: 0 },
  sampleName: { flex: 1, fontSize: 11, color: '#c8d8e8', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sampleDur: { fontSize: 10, color: '#3a5068', flexShrink: 0 },
  sampleType: { fontSize: 9, color: '#3a5068', flexShrink: 0 },
  previewBtn: { background: '#1a2332', border: '1px solid #2a3a4a', borderRadius: 3, padding: '2px 6px', color: '#00ffc8', fontSize: 10, cursor: 'pointer' },
  loadSampleBtn: { background: '#ff660015', border: '1px solid #ff660040', borderRadius: 3, padding: '2px 8px', color: '#ff6600', fontSize: 10, cursor: 'pointer', fontWeight: 600 },
  padSelect: { background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 3, padding: '2px 4px', color: '#8899aa', fontSize: 9, outline: 'none', width: 48 },

  // Save view
  saveView: { padding: 14 },
  saveTitle: { margin: '0 0 8px', fontSize: 14, color: '#e0e8f0', fontWeight: 700 },
  saveInfo: { fontSize: 11, color: '#5a7088', marginBottom: 12, padding: '6px 10px', background: '#1a233240', borderRadius: 4 },
  formGroup: { marginBottom: 10, flex: 1 },
  formRow: { display: 'flex', gap: 10 },
  formLabel: { display: 'block', fontSize: 10, color: '#5a7088', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { width: '100%', background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 4, padding: '6px 8px', color: '#e0e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  formSelect: { width: '100%', background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 4, padding: '6px 8px', color: '#e0e8f0', fontSize: 12, outline: 'none' },
  formTextarea: { width: '100%', background: '#0a1018', border: '1px solid #2a3a4a', borderRadius: 4, padding: '6px 8px', color: '#e0e8f0', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8899aa', marginBottom: 12, cursor: 'pointer' },
  saveBtn: { width: '100%', background: 'linear-gradient(135deg, #ff6600, #ff8800)', border: 'none', borderRadius: 6, padding: '10px', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
};

// =============================================================================
// Exports
// =============================================================================
export {
  loadKitIntoPads,
  loadSampleToPad,
  saveKitFromPads,
  audioBufferToWav,
  fetchAudioBuffer,
  saveProjectKit,
  getProjectKit,
};
export default DrumKitConnector;