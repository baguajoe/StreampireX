// =============================================================================
// LoopermanBrowser.js — Looperman.com Loop & Acapella Browser
// =============================================================================
// Location: src/front/js/component/LoopermanBrowser.js
//
// Integrates Looperman's free public API to browse, preview, and import
// royalty-free loops and acapellas directly into the DAW.
//
// API docs: https://www.looperman.com/api
// All loops on Looperman are free for commercial use under Creative Commons.
//
// Props:
//   audioContext     — shared Web Audio context
//   onSendToTrack    — (buffer, name) => void — sends to selected track
//   onLoadToPad      — (buffer, name, padNum) => void — sends to beat maker pad
//   onClose          — handler
//   isEmbedded       — boolean
//   bpm              — current project BPM (for BPM matching filter)
//
// Backend route needed (CORS proxy):
//   GET /api/looperman/search?term=&bpm=&genre=&type=loops|acapellas&page=0
//   → proxies to https://www.looperman.com/api?...
//   (Looperman API requires server-side call due to CORS)
//
// Backend Flask route (add to a new looperman_routes.py):
// =============================================================================
// from flask import Blueprint, request, jsonify
// import requests
// looperman_bp = Blueprint('looperman', __name__)
//
// LOOPERMAN_BASE = 'https://www.looperman.com/api'
//
// @looperman_bp.route('/api/looperman/search')
// def looperman_search():
//     params = {
//         'term':    request.args.get('term', ''),
//         'bpm':     request.args.get('bpm', ''),
//         'genre':   request.args.get('genre', ''),
//         'type':    request.args.get('type', 'loops'),
//         'page':    request.args.get('page', '0'),
//         'limit':   20,
//         'key':     request.args.get('key', ''),
//     }
//     r = requests.get(LOOPERMAN_BASE, params=params, timeout=8)
//     return jsonify(r.json())
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';

const GENRES = ['All','Hip Hop','Trap','R&B','Electronic','House','Techno','Drum & Bass','Reggae','Jazz','Soul','Rock','Pop','Ambient','Lo-Fi','Gospel','Latin','Afrobeats','Drill','Dancehall'];
const KEYS   = ['All','C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TYPES  = ['loops','acapellas'];

// ─────────────────────────────────────────────────────────────────────────────
const LoopermanBrowser = ({
  audioContext, onSendToTrack, onLoadToPad, onClose, isEmbedded, bpm = 120,
}) => {
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [query,       setQuery]       = useState('');
  const [genre,       setGenre]       = useState('All');
  const [key,         setKey]         = useState('All');
  const [type,        setType]        = useState('loops');
  const [bpmMatch,    setBpmMatch]    = useState(false);
  const [bpmTolerance,setBpmTolerance]= useState(10);
  const [playingId,   setPlayingId]   = useState(null);
  const [loadingId,   setLoadingId]   = useState(null);
  const [bufferCache, setBufferCache] = useState({});
  const [sentId,      setSentId]      = useState(null);

  const audioSrcRef = useRef(null);
  const gainRef     = useRef(null);

  // Setup preview gain node
  useEffect(() => {
    if (!audioContext) return;
    const g = audioContext.createGain();
    g.gain.value = 0.85;
    g.connect(audioContext.destination);
    gainRef.current = g;
    return () => { try { g.disconnect(); } catch (_) {} };
  }, [audioContext]);

  // ── Search ──────────────────────────────────────────────────────────────
  const search = useCallback(async (pg = 0) => {
    setLoading(true); setError(null);
    if (pg === 0) setResults([]);

    try {
      const params = new URLSearchParams({
        term:  query,
        genre: genre === 'All' ? '' : genre.toLowerCase().replace(/ /g, '-'),
        type,
        page:  pg,
        ...(bpmMatch ? { bpm, bpmTolerance } : {}),
        ...(key !== 'All' ? { key } : {}),
      });

      const res = await fetch(`/api/looperman/search?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      const items = data.loops ?? data.acapellas ?? data.results ?? [];
      if (pg === 0) setResults(items);
      else setResults(prev => [...prev, ...items]);
      setHasMore(items.length === 20);
      setPage(pg);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [query, genre, key, type, bpmMatch, bpm, bpmTolerance]);

  // ── Preview ──────────────────────────────────────────────────────────────
  const stopPreview = useCallback(() => {
    if (audioSrcRef.current) {
      try { audioSrcRef.current.stop(); } catch (_) {}
      audioSrcRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const fetchBuffer = useCallback(async (url) => {
    if (bufferCache[url]) return bufferCache[url];
    const res = await fetch(url);
    const ab  = await res.arrayBuffer();
    const buf = await audioContext.decodeAudioData(ab);
    setBufferCache(prev => ({ ...prev, [url]: buf }));
    return buf;
  }, [audioContext, bufferCache]);

  const togglePreview = useCallback(async (item) => {
    if (playingId === item.id) { stopPreview(); return; }
    stopPreview();

    if (!audioContext || !gainRef.current) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setLoadingId(item.id);
    try {
      const url = item.loopurl ?? item.acapellaurl ?? item.url ?? item.download;
      const buf = await fetchBuffer(url);
      const src = audioContext.createBufferSource();
      src.buffer = buf;
      src.loop   = type === 'loops';
      src.connect(gainRef.current);
      src.start(0);
      src.onended = () => { if (audioSrcRef.current === src) { setPlayingId(null); audioSrcRef.current = null; } };
      audioSrcRef.current = src;
      setPlayingId(item.id);
    } catch (e) {
      setError(`Preview failed: ${e.message}`);
    } finally {
      setLoadingId(null);
    }
  }, [playingId, audioContext, fetchBuffer, stopPreview, type]);

  // ── Send to track ────────────────────────────────────────────────────────
  const sendToTrack = useCallback(async (item) => {
    if (!audioContext) return;
    setSentId(item.id);
    try {
      const url = item.loopurl ?? item.acapellaurl ?? item.url ?? item.download;
      const buf = await fetchBuffer(url);
      onSendToTrack?.(buf, item.loopname ?? item.acapellaname ?? item.title ?? 'Looperman Sample');
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setTimeout(() => setSentId(null), 1500);
    }
  }, [audioContext, fetchBuffer, onSendToTrack]);

  const sendToPad = useCallback(async (item, padNum) => {
    if (!audioContext) return;
    try {
      const url = item.loopurl ?? item.acapellaurl ?? item.url ?? item.download;
      const buf = await fetchBuffer(url);
      onLoadToPad?.(buf, item.loopname ?? item.title ?? 'Sample', padNum);
    } catch (e) { setError(`Failed: ${e.message}`); }
  }, [audioContext, fetchBuffer, onLoadToPad]);

  // Cleanup on unmount
  useEffect(() => () => stopPreview(), [stopPreview]);

  // ── Format helpers ───────────────────────────────────────────────────────
  const fmt = (item) => ({
    id:     item.id ?? item.loopid,
    name:   item.loopname ?? item.acapellaname ?? item.title ?? 'Untitled',
    bpm:    item.bpm,
    key:    item.loopkey ?? item.key,
    genre:  item.genre ?? item.genrename,
    tags:   item.tags ?? '',
    user:   item.username ?? item.artist,
    url:    item.loopurl ?? item.acapellaurl ?? item.url,
    length: item.length ?? item.duration,
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d1117', color: '#cdd9e5',
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      fontSize: '11px', overflow: 'hidden',
    }}>
      {/* ═══ HEADER ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px', borderBottom: '1px solid #1c2128',
        background: 'linear-gradient(90deg,#161b22,#0d1117)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px' }}>🎵</span>
          <span style={{ color: '#e6edf3', fontWeight: 800, fontSize: '12px', letterSpacing: '0.12em' }}>LOOPERMAN</span>
          <span style={{ color: '#2d333b', fontSize: '9px' }}>FREE ROYALTY-FREE LOOPS & ACAPELLAS</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Type toggle */}
        <div style={{ display: 'flex', gap: '2px', background: '#0a0e14', border: '1px solid #21262d', borderRadius: '5px', padding: '2px' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              background: type === t ? '#21262d' : 'none', border: 'none',
              color: type === t ? '#00ffc8' : '#484f58', borderRadius: '4px',
              padding: '3px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: type === t ? 800 : 400, textTransform: 'uppercase',
            }}>{t}</button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', color: '#6e7681', borderRadius: '4px', padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        )}
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        padding: '8px 14px', borderBottom: '1px solid #1c2128',
        background: '#0a0e14', flexShrink: 0,
      }}>
        {/* Search input */}
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(0)}
          placeholder="Search loops... (trap hi hats, bass, vocals...)"
          style={{
            flex: 2, minWidth: '180px', background: '#161b22', border: '1px solid #30363d',
            color: '#cdd9e5', borderRadius: '6px', padding: '6px 10px',
            fontFamily: 'inherit', fontSize: '11px',
            outline: 'none',
          }}
        />

        {/* Genre */}
        <select value={genre} onChange={e => setGenre(e.target.value)} style={{
          background: '#161b22', border: '1px solid #30363d', color: '#cdd9e5',
          borderRadius: '5px', padding: '5px 8px', fontFamily: 'inherit', fontSize: '9px', flex: 1, minWidth: '100px',
        }}>
          {GENRES.map(g => <option key={g}>{g}</option>)}
        </select>

        {/* Key */}
        <select value={key} onChange={e => setKey(e.target.value)} style={{
          background: '#161b22', border: '1px solid #30363d', color: '#cdd9e5',
          borderRadius: '5px', padding: '5px 8px', fontFamily: 'inherit', fontSize: '9px',
        }}>
          {KEYS.map(k => <option key={k}>{k}</option>)}
        </select>

        {/* BPM match */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <button onClick={() => setBpmMatch(p => !p)} style={{
            background: bpmMatch ? '#00ffc822' : 'none',
            border: `1px solid ${bpmMatch ? '#00ffc8' : '#30363d'}`,
            color: bpmMatch ? '#00ffc8' : '#484f58',
            borderRadius: '5px', padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: 800,
          }}>BPM MATCH</button>
          {bpmMatch && (
            <>
              <span style={{ color: '#ffd60a', fontSize: '9px', fontWeight: 800 }}>{bpm}bpm</span>
              <span style={{ color: '#484f58', fontSize: '9px' }}>±</span>
              <select value={bpmTolerance} onChange={e => setBpmTolerance(parseInt(e.target.value))} style={{
                background: '#161b22', border: '1px solid #30363d', color: '#cdd9e5',
                borderRadius: '4px', padding: '3px 5px', fontFamily: 'inherit', fontSize: '9px',
              }}>
                {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Search button */}
        <button onClick={() => search(0)} disabled={loading} style={{
          background: '#00ffc8', color: '#0d1117', border: 'none', borderRadius: '6px',
          padding: '6px 16px', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', fontSize: '10px', fontWeight: 800, opacity: loading ? 0.6 : 1,
          boxShadow: '0 0 12px rgba(0,255,200,0.3)',
        }}>{loading ? 'Searching...' : '⌕ SEARCH'}</button>
      </div>

      {/* ═══ RESULTS ═══ */}
      {error && (
        <div style={{ padding: '8px 14px', background: '#ff6b6b11', borderBottom: '1px solid #ff6b6b33', color: '#ff6b6b', fontSize: '10px', flexShrink: 0 }}>
          ⚠ {error} — make sure the /api/looperman/search backend route is wired up.
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
        {results.length === 0 && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#2d333b' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎵</div>
            <div style={{ fontWeight: 800, marginBottom: '4px' }}>Search Looperman</div>
            <div style={{ fontSize: '9px', color: '#1c2128', lineHeight: 1.8 }}>
              Thousands of free royalty-free loops & acapellas<br />
              All CC licensed — free for commercial use
            </div>
          </div>
        )}

        {results.map(raw => {
          const item = fmt(raw);
          const isPlaying = playingId === item.id;
          const isLoading = loadingId === item.id;
          const isSent    = sentId    === item.id;

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px', marginBottom: '3px', borderRadius: '7px',
              background: isPlaying ? '#00ffc808' : '#0a0e14',
              border: `1px solid ${isPlaying ? '#00ffc844' : '#1c2128'}`,
              transition: 'all 0.1s',
            }}>
              {/* Play button */}
              <button onClick={() => togglePreview(raw)} style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: isPlaying ? '#00ffc8' : '#21262d',
                border: `1px solid ${isPlaying ? '#00ffc8' : '#30363d'}`,
                color: isPlaying ? '#0d1117' : '#6e7681',
                cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isPlaying ? '0 0 12px rgba(0,255,200,0.5)' : 'none',
                transition: 'all 0.1s',
              }}>
                {isLoading ? '⟳' : isPlaying ? '■' : '▶'}
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isPlaying ? '#00ffc8' : '#cdd9e5', fontWeight: isPlaying ? 700 : 400, fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  {item.bpm && <Tag label={`${item.bpm} BPM`} color="#ffd60a" />}
                  {item.key && <Tag label={item.key} color="#bf5af2" />}
                  {item.genre && <Tag label={item.genre} color="#4a9eff" />}
                  {item.user && <span style={{ color: '#2d333b', fontSize: '8px' }}>by {item.user}</span>}
                </div>
              </div>

              {/* Duration */}
              {item.length && <span style={{ color: '#3d444d', fontSize: '9px', flexShrink: 0 }}>{item.length}s</span>}

              {/* Send to track */}
              <button onClick={() => sendToTrack(raw)} style={{
                background: isSent ? '#00ffc822' : 'none',
                border: `1px solid ${isSent ? '#00ffc8' : '#30363d'}`,
                color: isSent ? '#00ffc8' : '#6e7681',
                borderRadius: '5px', padding: '3px 9px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '9px', fontWeight: 700, flexShrink: 0,
                transition: 'all 0.1s',
              }}>
                {isSent ? '✓ SENT' : '→ TRACK'}
              </button>

              {/* Send to pad */}
              {onLoadToPad && (
                <button onClick={() => sendToPad(raw, undefined)} style={{
                  background: 'none', border: '1px solid #30363d', color: '#6e7681',
                  borderRadius: '5px', padding: '3px 9px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '9px', fontWeight: 700, flexShrink: 0,
                }}>→ PAD</button>
              )}
            </div>
          );
        })}

        {/* Load more */}
        {hasMore && !loading && (
          <button onClick={() => search(page + 1)} style={{
            width: '100%', margin: '8px 0', padding: '8px', background: 'none',
            border: '1px dashed #21262d', color: '#484f58', borderRadius: '6px',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: 800,
          }}>LOAD MORE</button>
        )}

        {loading && results.length > 0 && (
          <div style={{ textAlign: 'center', padding: '12px', color: '#484f58', fontSize: '9px' }}>Loading...</div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #1c2128', padding: '5px 14px',
        display: 'flex', gap: '12px', color: '#2d333b', fontSize: '9px',
        background: '#0a0e14', flexShrink: 0, alignItems: 'center',
      }}>
        <span>LOOPERMAN.COM</span>
        <span>•</span>
        <span style={{ color: '#30d158' }}>✓ FREE COMMERCIAL USE (CC LICENSE)</span>
        <div style={{ flex: 1 }} />
        {results.length > 0 && <span>{results.length} results</span>}
        {playingId && <span style={{ color: '#00ffc8' }}>● PREVIEWING</span>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Tag = ({ label, color }) => (
  <span style={{
    background: `${color}15`, border: `1px solid ${color}33`,
    color, borderRadius: '3px', padding: '1px 5px', fontSize: '8px', fontWeight: 700,
  }}>{label}</span>
);

export default LoopermanBrowser;