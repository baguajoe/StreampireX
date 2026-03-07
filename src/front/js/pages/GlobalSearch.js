// =============================================================================
// GlobalSearch.js — Platform-wide Search + Explore/Trending Page
// =============================================================================
// Location: src/front/js/pages/GlobalSearch.js
//
// Routes:
//   /search?q=...    → Search results (tracks, beats, creators, podcasts, videos)
//   /explore         → Trending/Discover page for new users
//
// Features:
//  - Global search bar (wire to header)
//  - 5 result tabs: All, Music, Creators, Beats, Podcasts
//  - Explore: trending tracks, featured creators, new beats, trending podcasts
//  - Genre filter pills
//  - "New this week" section
//  - Play preview inline
//  - Backend: single /api/search?q=&type= endpoint
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

const GENRES = ['All', 'Hip-Hop', 'R&B', 'Trap', 'Pop', 'Afrobeats', 'Electronic', 'Gospel', 'Jazz', 'Lo-Fi'];

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL SEARCH PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const SearchPage = () => {
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery]     = useState(params.get('q') || '');
  const [tab, setTab]         = useState('all');
  const [results, setResults] = useState({ tracks: [], beats: [], creators: [], podcasts: [], videos: [] });
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(null);
  const audioRef              = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(q)}&type=${tab}`, { headers: getHeaders() });
      if (res.ok) setResults(await res.json());
    } catch (e) {}
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (query) search(query);
  }, [query, tab]);

  const playPreview = (url, id) => {
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
    setPlaying(id);
  };

  const S = {
    page:    { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'JetBrains Mono, Inter, sans-serif', padding: '24px 32px', maxWidth: 960, margin: '0 auto' },
    searchBar: { width: '100%', background: '#21262d', border: '2px solid #30363d', borderRadius: 10, color: '#c9d1d9', padding: '12px 18px', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
    tab:     (active) => ({ padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600, color: active ? '#00ffc8' : '#8b949e', borderBottom: `2px solid ${active ? '#00ffc8' : 'transparent'}` }),
    card:    { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 },
    playBtn: { width: 36, height: 36, borderRadius: '50%', background: '#21262d', border: 'none', color: '#c9d1d9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.9rem' },
    avatar:  { width: 40, height: 40, borderRadius: '50%', background: '#21262d', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ffc8', fontWeight: 700 },
    tag:     { background: 'rgba(0,255,200,0.1)', color: '#00ffc8', borderRadius: 4, padding: '2px 6px', fontSize: '0.65rem' },
  };

  const TrackRow = ({ item }) => (
    <div style={S.card}>
      <button style={S.playBtn} onClick={() => item.audio_url && playPreview(item.audio_url, item.id)}>
        {playing === item.id ? '⏹' : '▶'}
      </button>
      {item.cover_art ? <img src={item.cover_art} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} /> :
        <div style={{ width: 40, height: 40, borderRadius: 4, background: '#21262d', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{item.artist_name || item.username}</div>
      </div>
      {item.genre && <span style={S.tag}>{item.genre}</span>}
      <div style={{ fontSize: '0.72rem', color: '#5a7088' }}>{item.plays || 0} plays</div>
    </div>
  );

  const CreatorCard = ({ item }) => (
    <a href={`/profile/${item.id}`} style={{ ...S.card, textDecoration: 'none' }}>
      <div style={S.avatar}>
        {item.profile_picture ? <img src={item.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
          item.username?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#e6edf3' }}>{item.display_name || item.username}</div>
        <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{item.bio?.slice(0, 60)}{item.bio?.length > 60 ? '...' : ''}</div>
      </div>
      <div style={{ fontSize: '0.72rem', color: '#5a7088' }}>{item.follower_count || 0} followers</div>
    </a>
  );

  const BeatRow = ({ item }) => (
    <div style={S.card}>
      <button style={S.playBtn} onClick={() => item.audio_url && playPreview(item.audio_url, `beat_${item.id}`)}>
        {playing === `beat_${item.id}` ? '⏹' : '▶'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#e6edf3' }}>{item.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>by {item.producer_name} · {item.bpm} BPM · {item.key}</div>
      </div>
      {item.genre && <span style={S.tag}>{item.genre}</span>}
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00ffc8' }}>${item.price_basic || 'Free'}</div>
    </div>
  );

  const PodcastRow = ({ item }) => (
    <a href={`/podcast/${item.id}`} style={{ ...S.card, textDecoration: 'none' }}>
      {item.cover_image ? <img src={item.cover_image} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} /> :
        <div style={{ width: 44, height: 44, borderRadius: 6, background: '#21262d', flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#e6edf3' }}>{item.title}</div>
        <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{item.description?.slice(0, 80)}...</div>
      </div>
      <div style={{ fontSize: '0.72rem', color: '#5a7088' }}>{item.episode_count || 0} eps</div>
    </a>
  );

  const allCount = Object.values(results).reduce((s, a) => s + a.length, 0);

  return (
    <div style={S.page}>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <input style={S.searchBar} placeholder="Search tracks, artists, beats, podcasts..."
          value={query} onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) search(e.target.value); }}
          onKeyDown={e => e.key === 'Enter' && search(query)}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #30363d', marginBottom: 20 }}>
        {[['all', `All (${allCount})`], ['music', `Music (${results.tracks?.length || 0})`], ['beats', `Beats (${results.beats?.length || 0})`], ['creators', `Creators (${results.creators?.length || 0})`], ['podcasts', `Podcasts (${results.podcasts?.length || 0})`]].map(([key, label]) => (
          <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>Searching...</div>}

      {!loading && query && allCount === 0 && (
        <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>
          No results for "{query}". Try a different search.
        </div>
      )}

      {!loading && (tab === 'all' || tab === 'music') && results.tracks?.map(t => <TrackRow key={t.id} item={t} />)}
      {!loading && (tab === 'all' || tab === 'beats') && results.beats?.map(b => <BeatRow key={b.id} item={b} />)}
      {!loading && (tab === 'all' || tab === 'creators') && results.creators?.map(c => <CreatorCard key={c.id} item={c} />)}
      {!loading && (tab === 'all' || tab === 'podcasts') && results.podcasts?.map(p => <PodcastRow key={p.id} item={p} />)}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE / TRENDING PAGE
// ─────────────────────────────────────────────────────────────────────────────
export const ExplorePage = () => {
  const [trending, setTrending]   = useState({});
  const [genre, setGenre]         = useState('All');
  const [loading, setLoading]     = useState(true);
  const [playing, setPlaying]     = useState(null);
  const audioRef                  = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/explore?genre=${genre}`, { headers: getHeaders() });
        if (res.ok) setTrending(await res.json());
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, [genre]);

  const playPreview = (url, id) => {
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); return; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.play(); }
    setPlaying(id);
  };

  const S = {
    page:    { minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'JetBrains Mono, Inter, sans-serif', padding: '24px 32px', maxWidth: 1100, margin: '0 auto' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#e6edf3', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
    grid3:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
    grid4:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 },
    trackCard: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 14, cursor: 'pointer', transition: 'border-color 0.2s' },
    creatorCard: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16, textAlign: 'center', textDecoration: 'none', display: 'block', color: 'inherit' },
    genrePill: (active) => ({ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, background: active ? '#00ffc8' : '#21262d', color: active ? '#000' : '#8b949e' }),
    tag:     { background: 'rgba(0,255,200,0.1)', color: '#00ffc8', borderRadius: 4, padding: '2px 6px', fontSize: '0.62rem' },
  };

  const TrackCard = ({ track, rank }) => (
    <div style={S.trackCard} onClick={() => track.audio_url && playPreview(track.audio_url, track.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#5a7088', minWidth: 20 }}>{rank}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '0.88rem', marginBottom: 2 }}>{track.title}</div>
          <div style={{ fontSize: '0.72rem', color: '#8b949e' }}>{track.artist_name || track.username}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {track.genre && <span style={S.tag}>{track.genre}</span>}
            <span style={{ fontSize: '0.65rem', color: '#5a7088' }}>🎵 {track.plays || 0}</span>
          </div>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: playing === track.id ? '#00ffc8' : '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: playing === track.id ? '#000' : '#c9d1d9', fontSize: '0.75rem', flexShrink: 0 }}>
          {playing === track.id ? '⏹' : '▶'}
        </div>
      </div>
    </div>
  );

  const BeatCard = ({ beat }) => (
    <div style={S.trackCard}>
      <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '0.88rem', marginBottom: 4 }}>{beat.title}</div>
      <div style={{ fontSize: '0.72rem', color: '#8b949e', marginBottom: 8 }}>
        {beat.producer_name} · {beat.bpm} BPM · {beat.key}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9d1d9', fontSize: '1rem' }}
          onClick={() => beat.audio_url && playPreview(beat.audio_url, `beat_${beat.id}`)}>
          {playing === `beat_${beat.id}` ? '⏹' : '▶'}
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00ffc8' }}>${beat.price_basic || '—'}</span>
      </div>
    </div>
  );

  const CreatorCard = ({ creator }) => (
    <a href={`/profile/${creator.id}`} style={S.creatorCard}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#21262d', margin: '0 auto 10px', overflow: 'hidden', border: '2px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ffc8', fontWeight: 700, fontSize: '1.2rem' }}>
        {creator.profile_picture
          ? <img src={creator.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : creator.username?.[0]?.toUpperCase()}
      </div>
      <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '0.85rem' }}>{creator.display_name || creator.username}</div>
      <div style={{ fontSize: '0.68rem', color: '#8b949e', marginTop: 3 }}>{creator.follower_count || 0} followers</div>
    </a>
  );

  return (
    <div style={S.page}>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e6edf3' }}>🔥 Explore</div>
        <div style={{ fontSize: '0.78rem', color: '#5a7088', marginTop: 2 }}>Discover trending music, beats, and creators</div>
      </div>

      {/* Genre filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {GENRES.map(g => (
          <button key={g} style={S.genrePill(genre === g)} onClick={() => setGenre(g)}>{g}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#5a7088', textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!loading && (
        <>
          {/* Trending Tracks */}
          {trending.trending_tracks?.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>🔥 Trending Tracks</div>
              <div style={S.grid3}>
                {trending.trending_tracks.slice(0, 9).map((t, i) => <TrackCard key={t.id} track={t} rank={i + 1} />)}
              </div>
            </div>
          )}

          {/* Featured Creators */}
          {trending.featured_creators?.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>⭐ Featured Creators</div>
              <div style={S.grid4}>
                {trending.featured_creators.slice(0, 8).map(c => <CreatorCard key={c.id} creator={c} />)}
              </div>
            </div>
          )}

          {/* New Beats */}
          {trending.new_beats?.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>🎹 New Beats</div>
              <div style={S.grid3}>
                {trending.new_beats.slice(0, 6).map(b => <BeatCard key={b.id} beat={b} />)}
              </div>
            </div>
          )}

          {/* New This Week */}
          {trending.new_this_week?.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>✨ New This Week</div>
              <div style={S.grid3}>
                {trending.new_this_week.slice(0, 9).map((t, i) => <TrackCard key={t.id} track={t} rank={i + 1} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExplorePage;

// =============================================================================
// BACKEND — copy to src/api/search_routes.py
// =============================================================================
/*
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime, timedelta
from sqlalchemy import desc, func, or_
from src.api.models import db, User, Audio, Podcast, Beat, Follow

search_bp = Blueprint('search', __name__)

@search_bp.route('/api/search', methods=['GET'])
def global_search():
    try: verify_jwt_in_request(); user_id = get_jwt_identity()
    except: user_id = None

    q = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')
    if len(q) < 2:
        return jsonify({'tracks': [], 'beats': [], 'creators': [], 'podcasts': [], 'videos': []}), 200

    like = f'%{q}%'
    result = {'tracks': [], 'beats': [], 'creators': [], 'podcasts': [], 'videos': []}

    if search_type in ('all', 'music'):
        tracks = Audio.query.filter(
            or_(Audio.title.ilike(like), Audio.genre.ilike(like))
        ).order_by(desc(Audio.plays)).limit(20).all()
        for t in tracks:
            u = User.query.get(t.user_id)
            result['tracks'].append({
                'id': t.id, 'title': t.title, 'genre': t.genre,
                'audio_url': t.file_url, 'cover_art': t.cover_art,
                'username': u.username if u else 'Unknown',
                'artist_name': getattr(u, 'artist_name', None),
                'plays': t.plays or 0,
            })

    if search_type in ('all', 'creators'):
        users = User.query.filter(
            or_(User.username.ilike(like), User.display_name.ilike(like))
        ).limit(20).all()
        for u in users:
            follower_count = Follow.query.filter_by(followed_id=u.id).count()
            result['creators'].append({
                'id': u.id, 'username': u.username,
                'display_name': getattr(u, 'display_name', u.username),
                'profile_picture': getattr(u, 'profile_picture', None),
                'bio': getattr(u, 'bio', ''),
                'follower_count': follower_count,
            })

    if search_type in ('all', 'beats'):
        try:
            from src.api.beat_store_models import Beat
            beats = Beat.query.filter(
                or_(Beat.title.ilike(like), Beat.genre.ilike(like))
            ).order_by(desc(Beat.created_at)).limit(20).all()
            for b in beats:
                u = User.query.get(b.producer_id)
                result['beats'].append({
                    'id': b.id, 'title': b.title, 'genre': b.genre,
                    'bpm': b.bpm, 'key': b.key,
                    'audio_url': b.audio_url,
                    'price_basic': b.price_basic,
                    'producer_name': u.username if u else 'Unknown',
                })
        except: pass

    if search_type in ('all', 'podcasts'):
        pods = Podcast.query.filter(
            or_(Podcast.title.ilike(like), Podcast.description.ilike(like))
        ).limit(20).all()
        for p in pods:
            result['podcasts'].append({
                'id': p.id, 'title': p.title,
                'description': getattr(p, 'description', ''),
                'cover_image': getattr(p, 'cover_image', None),
                'episode_count': 0,
            })

    return jsonify(result), 200


@search_bp.route('/api/explore', methods=['GET'])
def explore():
    try: verify_jwt_in_request(); user_id = get_jwt_identity()
    except: user_id = None

    genre = request.args.get('genre', '')
    week_ago = datetime.utcnow() - timedelta(days=7)

    def serialize_track(t):
        u = User.query.get(t.user_id)
        return {'id': t.id, 'title': t.title, 'genre': t.genre,
                'audio_url': t.file_url, 'cover_art': t.cover_art,
                'username': u.username if u else 'Unknown',
                'artist_name': getattr(u, 'artist_name', None),
                'plays': t.plays or 0}

    # Trending tracks (most plays)
    q = Audio.query
    if genre and genre != 'All': q = q.filter(Audio.genre == genre)
    trending = q.order_by(desc(Audio.plays)).limit(12).all()

    # New this week
    new_q = Audio.query.filter(Audio.created_at >= week_ago)
    if genre and genre != 'All': new_q = new_q.filter(Audio.genre == genre)
    new_tracks = new_q.order_by(desc(Audio.created_at)).limit(12).all()

    # Featured creators (most followers)
    creators_raw = db.session.query(
        User, func.count(Follow.id).label('fc')
    ).outerjoin(Follow, Follow.followed_id == User.id).group_by(User.id).order_by(desc('fc')).limit(12).all()

    creators = []
    for u, fc in creators_raw:
        creators.append({'id': u.id, 'username': u.username,
                          'display_name': getattr(u, 'display_name', u.username),
                          'profile_picture': getattr(u, 'profile_picture', None),
                          'follower_count': fc})

    # New beats
    new_beats = []
    try:
        from src.api.beat_store_models import Beat
        bq = Beat.query.order_by(desc(Beat.created_at)).limit(9)
        if genre and genre != 'All': bq = bq.filter(Beat.genre == genre)
        for b in bq.all():
            u = User.query.get(b.producer_id)
            new_beats.append({'id': b.id, 'title': b.title, 'genre': b.genre,
                               'bpm': b.bpm, 'key': b.key, 'audio_url': b.audio_url,
                               'price_basic': b.price_basic,
                               'producer_name': u.username if u else 'Unknown'})
    except: pass

    return jsonify({
        'trending_tracks': [serialize_track(t) for t in trending],
        'new_this_week': [serialize_track(t) for t in new_tracks],
        'featured_creators': creators,
        'new_beats': new_beats,
    }), 200

# Register in app.py:
# from .search_routes import search_bp
# app.register_blueprint(search_bp)
#
# Add routes in layout.js:
#   <Route path="/search" element={<SearchPage />} />
#   <Route path="/explore" element={<ExplorePage />} />
#
# Add search bar to your Navbar/Header component:
#   <input placeholder="Search..." onKeyDown={e => e.key === 'Enter' && navigate(`/search?q=${e.target.value}`)} />
#
# No migrations needed — uses existing Audio, User, Podcast, Beat, Follow models
*/