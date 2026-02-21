// =============================================================================
// FreesoundBrowser.js — Freesound.org Sample Browser
// =============================================================================
// Location: src/front/js/component/FreesoundBrowser.js
// Features:
//   - Search Freesound.org library (500k+ sounds)
//   - Category quick-browse (Drums, Bass, Synth, Vocals, FX, etc.)
//   - Audio preview with waveform display
//   - Download & load into Beat Maker pads or DAW tracks
//   - Filter by duration, rating, type
//   - Pagination
//   - License info display
//   - Cubase-inspired dark theme
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../styles/FreesoundBrowser.css';

const API_BASE = '/api/freesound';

// ── Duration formatter ──
const fmtDuration = (secs) => {
  if (secs < 1) return `${Math.round(secs * 1000)}ms`;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── File size formatter ──
const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
};

const FreesoundBrowser = ({
  onSoundSelect,      // (audioBuffer, name, url) => void — load sound into pad/track
  onClose,            // () => void — close browser
  audioContext,        // AudioContext for decoding previews
  isEmbedded = false,  // true if embedded in Beat Maker or Studio
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState('score');
  const [maxDuration, setMaxDuration] = useState(30);
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [previewBuffer, setPreviewBuffer] = useState(null);

  const audioRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Fetch categories on mount ──
  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(r => r.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  // ── Search function ──
  const doSearch = useCallback(async (query, pageNum = 1, sort = sortBy, duration = maxDuration) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setPage(pageNum);

    try {
      const params = new URLSearchParams({
        q: query,
        page: pageNum,
        page_size: 15,
        sort: sort,
        filter: `duration:[0 TO ${duration}]`,
      });

      const resp = await fetch(`${API_BASE}/search?${params}`);
      if (!resp.ok) throw new Error(`Search failed (${resp.status})`);
      const data = await resp.json();

      if (data.error) throw new Error(data.error);

      setResults(data.results || []);
      setTotalPages(data.num_pages || 0);
      setTotalCount(data.count || 0);
    } catch (e) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy, maxDuration]);

  // ── Handle search submit ──
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveCategory(null);
      doSearch(searchQuery, 1);
    }
  };

  // ── Category click ──
  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.name);
    setSearchQuery(cat.query);
    doSearch(cat.query, 1);
  };

  // ── Tag click ──
  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    setActiveCategory(null);
    doSearch(tag, 1);
  };

  // ── Pagination ──
  const handlePageChange = (newPage) => {
    doSearch(searchQuery, newPage);
    // Scroll to top of results
    document.querySelector('.fs-results')?.scrollTo(0, 0);
  };

  // ── Preview playback ──
  const handlePreview = (sound) => {
    // Stop current preview
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }

    const previewUrl = sound.preview_hq_mp3 || sound.preview_lq_mp3;
    if (!previewUrl) return;

    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { setPlayingId(null); setError('Preview failed'); };
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(sound.id);
  };

  // ── Load sound into pad/track ──
  const handleLoadSound = async (sound) => {
    if (!onSoundSelect) return;
    setLoadingId(sound.id);

    try {
      // Download through our proxy
      const resp = await fetch(`${API_BASE}/download/${sound.id}?quality=hq`);
      if (!resp.ok) throw new Error('Download failed');

      const arrayBuffer = await resp.arrayBuffer();
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const audioUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/mpeg' }));
      onSoundSelect(audioBuffer, sound.name, audioUrl);
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ── License badge color ──
  const getLicenseBadge = (license) => {
    if (!license) return { label: '?', cls: '' };
    const l = license.toLowerCase();
    if (l.includes('creative commons 0') || l.includes('cc0')) return { label: 'CC0', cls: 'cc0' };
    if (l.includes('attribution')) return { label: 'CC-BY', cls: 'ccby' };
    if (l.includes('noncommercial')) return { label: 'CC-NC', cls: 'ccnc' };
    return { label: 'CC', cls: '' };
  };

  return (
    <div className={`fs-browser ${isEmbedded ? 'fs-embedded' : ''}`}>
      {/* ── Header ── */}
      <div className="fs-header">
        <div className="fs-title-row">
          <h3 className="fs-title">
            <span className="fs-logo">🔊</span> Sound Browser
            <span className="fs-powered">powered by Freesound.org</span>
          </h3>
          {onClose && (
            <button className="fs-close-btn" onClick={onClose} title="Close">✕</button>
          )}
        </div>

        {/* Search bar */}
        <form className="fs-search-form" onSubmit={handleSearch}>
          <div className="fs-search-input-wrap">
            <svg className="fs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="fs-search-input"
              placeholder="Search 500k+ sounds... (kick, synth pad, guitar loop, rain...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="fs-clear-btn" onClick={() => { setSearchQuery(''); setResults([]); setActiveCategory(null); }}>✕</button>
            )}
          </div>
          <button type="submit" className="fs-search-btn" disabled={loading}>
            {loading ? '...' : 'Search'}
          </button>
        </form>

        {/* Filters row */}
        <div className="fs-filters">
          <div className="fs-filter-group">
            <label>Sort:</label>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); if (searchQuery) doSearch(searchQuery, 1, e.target.value); }}>
              <option value="score">Relevance</option>
              <option value="rating_desc">Top Rated</option>
              <option value="downloads_desc">Most Downloaded</option>
              <option value="duration_asc">Shortest First</option>
              <option value="duration_desc">Longest First</option>
              <option value="created_desc">Newest</option>
            </select>
          </div>
          <div className="fs-filter-group">
            <label>Max:</label>
            <select value={maxDuration} onChange={e => { setMaxDuration(parseInt(e.target.value)); if (searchQuery) doSearch(searchQuery, 1, sortBy, parseInt(e.target.value)); }}>
              <option value="2">2s</option>
              <option value="5">5s</option>
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">60s</option>
              <option value="300">5min</option>
            </select>
          </div>
          {totalCount > 0 && (
            <span className="fs-result-count">{totalCount.toLocaleString()} results</span>
          )}
        </div>
      </div>

      {/* ── Categories ── */}
      {results.length === 0 && !loading && categories.length > 0 && (
        <div className="fs-categories">
          <h4 className="fs-cat-title">Browse by Category</h4>
          <div className="fs-cat-grid">
            {categories.map(cat => (
              <button
                key={cat.name}
                className={`fs-cat-btn ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span className="fs-cat-emoji">{cat.emoji}</span>
                <span className="fs-cat-name">{cat.name}</span>
                <div className="fs-cat-tags">
                  {cat.tags.slice(0, 4).map(t => (
                    <span key={t} className="fs-cat-tag">{t}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && <div className="fs-error">⚠ {error}</div>}

      {/* ── Loading ── */}
      {loading && (
        <div className="fs-loading">
          <div className="fs-spinner"></div>
          <span>Searching Freesound...</span>
        </div>
      )}

      {/* ── Results ── */}
      {results.length > 0 && !loading && (
        <div className="fs-results">
          {results.map(sound => {
            const license = getLicenseBadge(sound.license);
            const isPlaying = playingId === sound.id;
            const isLoading = loadingId === sound.id;

            return (
              <div key={sound.id} className={`fs-sound-card ${isPlaying ? 'playing' : ''}`}>
                {/* Waveform thumbnail */}
                <div className="fs-sound-visual">
                  {sound.waveform_m ? (
                    <img src={sound.waveform_m} alt="" className="fs-waveform-img" loading="lazy" />
                  ) : (
                    <div className="fs-waveform-placeholder">〰️</div>
                  )}
                  <button
                    className={`fs-play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={() => handlePreview(sound)}
                    title={isPlaying ? 'Stop' : 'Preview'}
                  >
                    {isPlaying ? '■' : '▶'}
                  </button>
                </div>

                {/* Info */}
                <div className="fs-sound-info">
                  <div className="fs-sound-name" title={sound.name}>
                    {sound.name}
                  </div>
                  <div className="fs-sound-meta">
                    <span className="fs-meta-item" title="Duration">⏱ {fmtDuration(sound.duration)}</span>
                    <span className="fs-meta-item" title="Format">{sound.type?.toUpperCase()}</span>
                    {sound.samplerate > 0 && <span className="fs-meta-item">{sound.samplerate / 1000}kHz</span>}
                    <span className="fs-meta-item" title="Size">{fmtSize(sound.filesize)}</span>
                    {sound.rating > 0 && <span className="fs-meta-item fs-rating" title="Rating">★ {sound.rating}</span>}
                    <span className={`fs-license-badge ${license.cls}`} title={sound.license}>{license.label}</span>
                  </div>
                  <div className="fs-sound-user">
                    by <strong>{sound.username}</strong> · {sound.downloads} downloads
                  </div>
                  {/* Tags */}
                  {sound.tags && sound.tags.length > 0 && (
                    <div className="fs-sound-tags">
                      {sound.tags.slice(0, 6).map(tag => (
                        <button key={tag} className="fs-tag-btn" onClick={() => handleTagClick(tag)}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Load button */}
                <div className="fs-sound-actions">
                  <button
                    className={`fs-load-btn ${isLoading ? 'loading' : ''}`}
                    onClick={() => handleLoadSound(sound)}
                    disabled={isLoading}
                    title="Load into pad/track"
                  >
                    {isLoading ? (
                      <span className="fs-btn-spinner"></span>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Load
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="fs-pagination">
              <button
                className="fs-page-btn"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ← Prev
              </button>
              <span className="fs-page-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="fs-page-btn"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {results.length === 0 && !loading && searchQuery && !error && (
        <div className="fs-empty">
          <span className="fs-empty-icon">🔍</span>
          <p>No sounds found for "{searchQuery}"</p>
          <p className="fs-empty-hint">Try different keywords or adjust the duration filter</p>
        </div>
      )}
    </div>
  );
};

export default FreesoundBrowser;