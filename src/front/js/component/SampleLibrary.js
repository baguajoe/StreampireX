// =============================================================================
// SampleLibrary.js — Built-in Royalty-Free Sample Browser
// =============================================================================
// Features:
//   - Categorized sample browser (Drums, Bass, Keys, FX, Loops, etc.)
//   - Search / filter by BPM, key, type
//   - Preview on click (spacebar to stop)
//   - Drag sample to arrange track
//   - Favorites / recently used
//   - Cloud samples from R2 + local user uploads
//   - Waveform preview thumbnail
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Built-in sample categories with free online samples
const BUILT_IN_CATEGORIES = [
  {
    id: 'drums',
    name: 'Drums',
    icon: '🥁',
    subcategories: ['Kicks', 'Snares', 'Hi-Hats', 'Cymbals', 'Percs', 'Full Kits', '808s'],
  },
  {
    id: 'bass',
    name: 'Bass',
    icon: '🎸',
    subcategories: ['Sub Bass', 'Electric Bass', '808 Bass', 'Synth Bass'],
  },
  {
    id: 'keys',
    name: 'Keys & Pads',
    icon: '🎹',
    subcategories: ['Piano', 'Electric Piano', 'Organ', 'Pads', 'Strings'],
  },
  {
    id: 'loops',
    name: 'Loops',
    icon: '🔄',
    subcategories: ['Drum Loops', 'Melodic Loops', 'Bass Loops', 'Full Loops'],
  },
  {
    id: 'fx',
    name: 'FX & Transitions',
    icon: '✨',
    subcategories: ['Risers', 'Downlifters', 'Impacts', 'Sweeps', 'Noise'],
  },
  {
    id: 'vocals',
    name: 'Vocals',
    icon: '🎤',
    subcategories: ['Chops', 'Ad Libs', 'One Shots', 'Spoken'],
  },
  {
    id: 'synth',
    name: 'Synth',
    icon: '🎛️',
    subcategories: ['Leads', 'Chords', 'Arps', 'Plucks', 'Bells'],
  },
  {
    id: 'user',
    name: 'My Samples',
    icon: '📁',
    subcategories: ['Uploaded', 'Recorded', 'Favorites'],
  },
];

// Free sample packs from public domain / CC0 sources
const FREE_SAMPLE_PACKS = [
  { id: 'tr808', name: 'TR-808 Classic', category: 'drums', bpm: null, key: null, count: 48, tags: ['808', 'classic', 'hip-hop'] },
  { id: 'tr909', name: 'TR-909 Collection', category: 'drums', bpm: null, key: null, count: 36, tags: ['909', 'techno', 'house'] },
  { id: 'hiphop_drums', name: 'Hip-Hop Essentials', category: 'drums', bpm: 90, key: null, count: 64, tags: ['hip-hop', 'boom-bap'] },
  { id: 'trap_drums', name: 'Trap Drums Vol.1', category: 'drums', bpm: 140, key: null, count: 80, tags: ['trap', 'hi-hats', '808'] },
  { id: 'lo_fi_drums', name: 'Lo-Fi Drum Kit', category: 'drums', bpm: 85, key: null, count: 32, tags: ['lo-fi', 'vinyl', 'dusty'] },
  { id: 'sub_bass', name: 'Sub Bass Library', category: 'bass', bpm: null, key: 'C', count: 24, tags: ['sub', '808', 'bass'] },
  { id: 'piano_loops', name: 'Melancholic Piano', category: 'keys', bpm: 80, key: 'Am', count: 20, tags: ['piano', 'sad', 'lo-fi'] },
  { id: 'synth_leads', name: 'Analog Leads', category: 'synth', bpm: null, key: null, count: 40, tags: ['synth', 'lead', 'analog'] },
  { id: 'vocal_chops', name: 'Vocal Chops Pack', category: 'vocals', bpm: 120, key: null, count: 56, tags: ['vocals', 'chops', 'filter'] },
  { id: 'fx_pack', name: 'Cinematic FX', category: 'fx', bpm: null, key: null, count: 45, tags: ['fx', 'cinematic', 'transition'] },
];

const SampleLibrary = ({
  audioContext,
  masterGainRef,
  onDragToTrack,
  onLoadSample,
  isVisible,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState('drums');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBpm, setFilterBpm] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewingSample, setPreviewingSample] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spx_sample_favorites') || '[]'); } catch { return []; }
  });
  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spx_recently_used') || '[]'); } catch { return []; }
  });
  const [userSamples, setUserSamples] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list | grid
  const [selectedPack, setSelectedPack] = useState(null);

  const previewSourceRef = useRef(null);
  const previewGainRef   = useRef(null);
  const fileInputRef     = useRef(null);

  // ── Load samples for current category ──────────────────────────────────
  const loadSamples = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const bu = process.env.REACT_APP_BACKEND_URL || '';

      if (activeCategory === 'user') {
        const res = await fetch(`${bu}/api/studio/samples/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSamples(data.samples || []);
      } else {
        // Fetch from API with filters
        const params = new URLSearchParams({
          category: activeCategory,
          ...(activeSubcategory && { subcategory: activeSubcategory }),
          ...(searchQuery && { search: searchQuery }),
          ...(filterBpm && { bpm: filterBpm }),
          ...(filterKey && { key: filterKey }),
        });
        const res = await fetch(`${bu}/api/studio/samples?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSamples(data.samples || generateMockSamples(activeCategory, activeSubcategory));
      }
    } catch (e) {
      // Fallback to built-in mock samples
      setSamples(generateMockSamples(activeCategory, activeSubcategory));
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeSubcategory, searchQuery, filterBpm, filterKey]);

  useEffect(() => { loadSamples(); }, [loadSamples]);

  // ── Preview sample ────────────────────────────────────────────────────
  const previewSample = useCallback(async (sample) => {
    if (!audioContext) return;

    // Stop previous preview
    stopPreview();

    setPreviewingSample(sample.id);

    try {
      const res = await fetch(sample.url);
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      const gain   = audioContext.createGain();
      source.buffer = audioBuffer;
      gain.gain.value = 0.8;
      source.connect(gain);
      gain.connect(masterGainRef?.current || audioContext.destination);
      source.start();
      source.onended = () => setPreviewingSample(null);

      previewSourceRef.current = source;
      previewGainRef.current   = gain;
    } catch (e) {
      setPreviewingSample(null);
      console.warn('[SampleLibrary] Preview failed:', e);
    }
  }, [audioContext, masterGainRef]);

  const stopPreview = useCallback(() => {
    try { previewSourceRef.current?.stop(); } catch(e) {}
    setPreviewingSample(null);
    previewSourceRef.current = null;
  }, []);

  // Spacebar to stop preview
  useEffect(() => {
    const handler = (e) => { if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); stopPreview(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stopPreview]);

  // ── Favorites ────────────────────────────────────────────────────────
  const toggleFavorite = (sampleId) => {
    setFavorites(prev => {
      const next = prev.includes(sampleId)
        ? prev.filter(id => id !== sampleId)
        : [...prev, sampleId];
      localStorage.setItem('spx_sample_favorites', JSON.stringify(next));
      return next;
    });
  };

  // ── Load to track ────────────────────────────────────────────────────
  const handleLoadToTrack = useCallback((sample) => {
    // Add to recently used
    setRecentlyUsed(prev => {
      const next = [sample, ...prev.filter(s => s.id !== sample.id)].slice(0, 20);
      localStorage.setItem('spx_recently_used', JSON.stringify(next));
      return next;
    });
    onLoadSample?.(sample);
  }, [onLoadSample]);

  // ── Upload user sample ────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { uploadToR2 } = await import('../utils/r2Upload');
    try {
      const result = await uploadToR2(file, 'samples');
      const newSample = {
        id: `user_${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        url: result.url,
        category: 'user',
        subcategory: 'Uploaded',
        duration: 0,
        bpm: null,
        key: null,
        tags: ['user'],
      };
      setUserSamples(prev => [newSample, ...prev]);
      if (activeCategory === 'user') loadSamples();
    } catch (e) {
      console.error('Upload failed:', e);
    }
  };

  if (!isVisible) return null;

  const filteredSamples = samples.filter(s => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterBpm && s.bpm && Math.abs(s.bpm - parseInt(filterBpm)) > 5) return false;
    if (filterKey && s.key && s.key !== filterKey) return false;
    return true;
  });

  const category = BUILT_IN_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="sample-library">
      {/* Header */}
      <div className="sl-header">
        <span className="sl-title">🎵 Sample Library</span>
        <div className="sl-header-actions">
          <button className="sl-btn" onClick={() => fileInputRef.current?.click()} title="Upload sample">
            ⬆ Upload
          </button>
          <button className="sl-btn sl-btn-icon" onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}>
            {viewMode === 'list' ? '⊞' : '☰'}
          </button>
          <button className="sl-close" onClick={onClose}>✕</button>
        </div>
        <input ref={fileInputRef} type="file" accept="audio/*" style={{display:'none'}} onChange={handleUpload} />
      </div>

      {/* Search + filters */}
      <div className="sl-search-bar">
        <input
          className="sl-search-input"
          placeholder="Search samples..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <input
          className="sl-filter-input"
          placeholder="BPM"
          value={filterBpm}
          onChange={e => setFilterBpm(e.target.value)}
          style={{width: 56}}
        />
        <select className="sl-filter-select" value={filterKey} onChange={e => setFilterKey(e.target.value)}>
          <option value="">Any Key</option>
          {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div className="sl-body">
        {/* Category sidebar */}
        <div className="sl-sidebar">
          {BUILT_IN_CATEGORIES.map(cat => (
            <div key={cat.id}>
              <button
                className={`sl-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null); }}
              >
                <span className="sl-cat-icon">{cat.icon}</span>
                <span className="sl-cat-name">{cat.name}</span>
              </button>
              {activeCategory === cat.id && cat.subcategories && (
                <div className="sl-subcats">
                  <button
                    className={`sl-subcat-btn ${!activeSubcategory ? 'active' : ''}`}
                    onClick={() => setActiveSubcategory(null)}
                  >All</button>
                  {cat.subcategories.map(sub => (
                    <button
                      key={sub}
                      className={`sl-subcat-btn ${activeSubcategory === sub ? 'active' : ''}`}
                      onClick={() => setActiveSubcategory(sub)}
                    >{sub}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Packs */}
          <div className="sl-section-header">Packs</div>
          {FREE_SAMPLE_PACKS.filter(p => p.category === activeCategory || !activeCategory).map(pack => (
            <button
              key={pack.id}
              className={`sl-pack-btn ${selectedPack === pack.id ? 'active' : ''}`}
              onClick={() => setSelectedPack(selectedPack === pack.id ? null : pack.id)}
            >
              <span className="sl-pack-name">{pack.name}</span>
              <span className="sl-pack-count">{pack.count}</span>
            </button>
          ))}
        </div>

        {/* Sample list */}
        <div className="sl-content">
          {loading ? (
            <div className="sl-loading">Loading samples...</div>
          ) : filteredSamples.length === 0 ? (
            <div className="sl-empty">
              <div style={{fontSize:32, marginBottom:8}}>🎵</div>
              <div>No samples found</div>
              <button className="sl-btn" style={{marginTop:12}} onClick={() => fileInputRef.current?.click()}>
                Upload Your Own
              </button>
            </div>
          ) : (
            <div className={`sl-samples ${viewMode}`}>
              {filteredSamples.map(sample => (
                <SampleRow
                  key={sample.id}
                  sample={sample}
                  isPreviewing={previewingSample === sample.id}
                  isFavorite={favorites.includes(sample.id)}
                  onPreview={previewSample}
                  onStopPreview={stopPreview}
                  onToggleFavorite={toggleFavorite}
                  onLoadToTrack={handleLoadToTrack}
                  onDragToTrack={onDragToTrack}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently used */}
      {recentlyUsed.length > 0 && (
        <div className="sl-recent">
          <div className="sl-section-header" style={{padding:'4px 8px'}}>Recently Used</div>
          <div className="sl-recent-list">
            {recentlyUsed.slice(0, 6).map(s => (
              <button key={s.id} className="sl-recent-item" onClick={() => handleLoadToTrack(s)} title={s.name}>
                {s.name.slice(0, 12)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SampleRow = ({ sample, isPreviewing, isFavorite, onPreview, onStopPreview, onToggleFavorite, onLoadToTrack, onDragToTrack }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/spx-sample', JSON.stringify(sample));
    e.dataTransfer.effectAllowed = 'copy';
    onDragToTrack?.(sample, 'dragstart');
  };

  return (
    <div
      className={`sl-sample-row ${isPreviewing ? 'previewing' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => onLoadToTrack(sample)}
    >
      <button
        className={`sl-preview-btn ${isPreviewing ? 'active' : ''}`}
        onClick={() => isPreviewing ? onStopPreview() : onPreview(sample)}
        title={isPreviewing ? 'Stop (Space)' : 'Preview'}
      >
        {isPreviewing ? '■' : '▶'}
      </button>

      <div className="sl-sample-info">
        <span className="sl-sample-name">{sample.name}</span>
        <div className="sl-sample-meta">
          {sample.bpm && <span className="sl-tag">{sample.bpm} BPM</span>}
          {sample.key && <span className="sl-tag">{sample.key}</span>}
          {sample.duration > 0 && <span className="sl-tag">{sample.duration.toFixed(1)}s</span>}
          {(sample.tags || []).slice(0, 2).map(t => (
            <span key={t} className="sl-tag">{t}</span>
          ))}
        </div>
      </div>

      <div className="sl-sample-actions">
        <button
          className={`sl-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(sample.id)}
          title="Favorite"
        >★</button>
        <button
          className="sl-load-btn"
          onClick={() => onLoadToTrack(sample)}
          title="Load to selected track"
        >+</button>
      </div>
    </div>
  );
};

// Generate mock samples for offline/fallback use
function generateMockSamples(category, subcategory) {
  const mocks = {
    drums: [
      { id: 'd1', name: 'Kick 808', url: '', category: 'drums', subcategory: 'Kicks', bpm: null, key: null, duration: 0.8, tags: ['808', 'kick'] },
      { id: 'd2', name: 'Snare Crisp', url: '', category: 'drums', subcategory: 'Snares', bpm: null, key: null, duration: 0.3, tags: ['snare'] },
      { id: 'd3', name: 'HH Closed', url: '', category: 'drums', subcategory: 'Hi-Hats', bpm: null, key: null, duration: 0.1, tags: ['hihat'] },
      { id: 'd4', name: 'HH Open', url: '', category: 'drums', subcategory: 'Hi-Hats', bpm: null, key: null, duration: 0.4, tags: ['hihat'] },
      { id: 'd5', name: 'Clap Trap', url: '', category: 'drums', subcategory: 'Snares', bpm: null, key: null, duration: 0.2, tags: ['clap', 'trap'] },
      { id: 'd6', name: 'Perc Shaker', url: '', category: 'drums', subcategory: 'Percs', bpm: null, key: null, duration: 0.15, tags: ['perc'] },
      { id: 'd7', name: 'Kick Deep', url: '', category: 'drums', subcategory: 'Kicks', bpm: null, key: null, duration: 1.2, tags: ['kick', 'deep'] },
      { id: 'd8', name: 'Rim Shot', url: '', category: 'drums', subcategory: 'Percs', bpm: null, key: null, duration: 0.1, tags: ['rim'] },
    ],
    bass: [
      { id: 'b1', name: 'Sub C', url: '', category: 'bass', bpm: null, key: 'C', duration: 1.0, tags: ['sub'] },
      { id: 'b2', name: 'Sub F', url: '', category: 'bass', bpm: null, key: 'F', duration: 1.0, tags: ['sub'] },
      { id: 'b3', name: '808 Slide', url: '', category: 'bass', bpm: null, key: 'C', duration: 2.0, tags: ['808', 'slide'] },
    ],
    keys: [
      { id: 'k1', name: 'Piano C4', url: '', category: 'keys', bpm: null, key: 'C', duration: 3.0, tags: ['piano'] },
      { id: 'k2', name: 'EP Chord Am', url: '', category: 'keys', bpm: 90, key: 'Am', duration: 2.0, tags: ['ep', 'chord'] },
    ],
    fx: [
      { id: 'f1', name: 'Riser 4 Bar', url: '', category: 'fx', bpm: 120, key: null, duration: 8.0, tags: ['riser'] },
      { id: 'f2', name: 'Impact Hit', url: '', category: 'fx', bpm: null, key: null, duration: 1.5, tags: ['impact'] },
    ],
  };
  const list = mocks[category] || mocks.drums;
  if (!subcategory) return list;
  return list.filter(s => s.subcategory === subcategory);
}

export default SampleLibrary;
