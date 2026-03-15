// =============================================================================
// BrowseFilmsPage.js — Browse & Discover Films for StreamPireX
// =============================================================================
// Location: src/front/js/pages/BrowseFilmsPage.js
// Route:    /browse-films
// =============================================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const GENRES = [
  "All", "Drama", "Comedy", "Horror", "Thriller", "Sci-Fi", "Action",
  "Romance", "Mystery", "Documentary", "Animation", "Fantasy",
  "Crime", "Biography", "Musical", "Western",
];

const FILM_TYPES = [
  { id: "",            label: "All Types" },
  { id: "short",       label: "🎬 Short Films" },
  { id: "feature",     label: "🎥 Features" },
  { id: "documentary", label: "📽️ Documentaries" },
  { id: "animation",   label: "🎨 Animation" },
  { id: "experimental",label: "🌀 Experimental" },
  { id: "student",     label: "🎓 Student Films" },
];

const SORT_OPTIONS = [
  { id: "newest",  label: "Newest" },
  { id: "popular", label: "Most Viewed" },
  { id: "rating",  label: "Top Rated" },
];

const S = {
  page:      { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif", padding: "32px 24px" },
  wrap:      { maxWidth: 1200, margin: "0 auto" },
  header:    { marginBottom: 32 },
  title:     { fontSize: "1.8rem", fontWeight: 800, color: "#e6edf3", margin: "0 0 6px" },
  subtitle:  { color: "#8b949e", fontSize: "0.9rem" },
  filters:   { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28, alignItems: "center" },
  searchBox: { flex: 1, minWidth: 220, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "10px 16px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" },
  select:    { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "10px 14px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" },
  tabRow:    { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 },
  tab:       (active) => ({ padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, border: "none", background: active ? "rgba(0,255,200,0.15)" : "#161b22", color: active ? "#00ffc8" : "#8b949e", transition: "all 0.15s" }),
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 },
  card:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, border-color 0.15s" },
  poster:    { width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" },
  posterPH:  { width: "100%", aspectRatio: "2/3", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" },
  cardBody:  { padding: "12px 14px" },
  cardTitle: { fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardMeta:  { color: "#8b949e", fontSize: "0.72rem", display: "flex", gap: 6, flexWrap: "wrap" },
  badge:     (color) => ({ background: `${color}22`, color, borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }),
  section:   { marginBottom: 40 },
  secTitle:  { fontSize: "1.1rem", fontWeight: 700, color: "#e6edf3", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
  hGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 },
  hCard:     { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", cursor: "pointer", display: "flex", gap: 0, transition: "border-color 0.15s" },
  hPoster:   { width: 90, flexShrink: 0 },
  hPosterImg:{ width: "100%", height: "100%", objectFit: "cover" },
  hBody:     { padding: 14, flex: 1, minWidth: 0 },
  emptyState:{ textAlign: "center", padding: "60px 20px", color: "#5a7088" },
  loadMore:  { display: "block", margin: "32px auto 0", background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "12px 32px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
};

// ─────────────────────────────────────────────
// FILM CARD (vertical — poster format)
// ─────────────────────────────────────────────
const FilmCard = ({ film, onClick }) => (
  <div style={S.card} onClick={onClick}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#00ffc8"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "#30363d"; }}>
    {film.poster_url
      ? <img src={film.poster_url} alt={film.title} style={S.poster} />
      : <div style={S.posterPH}>📽️</div>
    }
    <div style={S.cardBody}>
      <div style={S.cardTitle}>{film.title}</div>
      <div style={S.cardMeta}>
        {film.genre && <span>{film.genre}</span>}
        {film.runtime_minutes && <span>· {film.runtime_minutes}m</span>}
        {film.avg_rating > 0 && <span>· ⭐ {film.avg_rating.toFixed(1)}</span>}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {film.rating && <span style={S.badge("#8b949e")}>{film.rating}</span>}
        {film.pricing_model === "free" && <span style={S.badge("#00ffc8")}>FREE</span>}
        {film.pricing_model === "rent" && <span style={S.badge("#ffa726")}>RENT ${film.rent_price}</span>}
        {film.pricing_model === "buy" && <span style={S.badge("#4a9eff")}>BUY ${film.buy_price}</span>}
        {film.is_sag && <span style={S.badge("#ffa726")}>SAG</span>}
        {film.is_featured && <span style={S.badge("#a78bfa")}>⭐ STAFF PICK</span>}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// HORIZONTAL CARD (for featured/trending)
// ─────────────────────────────────────────────
const FilmHCard = ({ film, onClick }) => (
  <div style={S.hCard} onClick={onClick}
    onMouseEnter={e => e.currentTarget.style.borderColor = "#00ffc8"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}>
    <div style={S.hPoster}>
      {film.poster_url
        ? <img src={film.poster_url} alt={film.title} style={S.hPosterImg} />
        : <div style={{ ...S.hPosterImg, background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📽️</div>
      }
    </div>
    <div style={S.hBody}>
      <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{film.title}</div>
      <div style={{ color: "#8b949e", fontSize: "0.72rem", marginBottom: 8 }}>
        {film.genre} · {film.runtime_minutes ? `${film.runtime_minutes}m` : film.film_type}
      </div>
      {film.tagline && (
        <div style={{ color: "#c9d1d9", fontSize: "0.75rem", fontStyle: "italic", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
          "{film.tagline}"
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {film.pricing_model === "free" && <span style={S.badge("#00ffc8")}>FREE</span>}
        {film.pricing_model === "rent" && <span style={S.badge("#ffa726")}>RENT</span>}
        {film.avg_rating > 0 && <span style={S.badge("#ffd700")}>⭐ {film.avg_rating.toFixed(1)}</span>}
        {film.is_featured && <span style={S.badge("#a78bfa")}>STAFF PICK</span>}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const BrowseFilmsPage = () => {
  const navigate = useNavigate();

  const [films, setFilms]         = useState([]);
  const [featured, setFeatured]   = useState([]);
  const [trending, setTrending]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore]     = useState(false);

  // Filters
  const [search, setSearch]       = useState("");
  const [genre, setGenre]         = useState("");
  const [filmType, setFilmType]   = useState("");
  const [sort, setSort]           = useState("newest");
  const [activeView, setActiveView] = useState("all"); // all | shorts | featured | trending

  useEffect(() => {
    fetchFeatured();
    fetchTrending();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFilms(1, true);
  }, [search, genre, filmType, sort, activeView]);

  const fetchFeatured = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/featured`);
      const data = await res.json();
      setFeatured(data);
    } catch (e) {}
  };

  const fetchTrending = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/trending`);
      const data = await res.json();
      setTrending(data.slice(0, 8));
    } catch (e) {}
  };

  const fetchFilms = async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, per_page: 20, sort });
      if (search)   params.set("q", search);
      if (genre && genre !== "All") params.set("genre", genre);

      let endpoint = "/api/film/films";
      if (activeView === "shorts") endpoint = "/api/film/films/shorts";
      else if (activeView === "featured") { endpoint = "/api/film/films/featured"; }
      else if (activeView === "trending") { endpoint = "/api/film/films/trending"; }
      else if (filmType) params.set("type", filmType);

      const res  = await fetch(`${BACKEND_URL}${endpoint}?${params}`);
      const data = await res.json();

      const list = Array.isArray(data) ? data : data.films || [];
      setFilms(reset ? list : prev => [...prev, ...list]);
      setTotalPages(data.pages || 1);
      setHasMore(p < (data.pages || 1));
    } catch (e) {
      setFilms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchFilms(next, false);
  };

  const goToFilm = (id) => navigate(`/film/${id}`);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={S.header}>
          <h1 style={S.title}>🎬 Browse Films</h1>
          <p style={S.subtitle}>Independent films, short films & documentaries from creators worldwide</p>
        </div>

        {/* Featured / Staff Picks */}
        {featured.length > 0 && activeView === "all" && (
          <div style={S.section}>
            <div style={S.secTitle}>⭐ Staff Picks</div>
            <div style={S.hGrid}>
              {featured.slice(0, 4).map(f => (
                <FilmHCard key={f.id} film={f} onClick={() => goToFilm(f.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Trending */}
        {trending.length > 0 && activeView === "all" && (
          <div style={S.section}>
            <div style={S.secTitle}>🔥 Trending</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
              {trending.map(f => (
                <FilmCard key={f.id} film={f} onClick={() => goToFilm(f.id)} />
              ))}
            </div>
          </div>
        )}

        {/* View Tabs */}
        <div style={S.tabRow}>
          {[
            { id: "all",      label: "🎬 All Films" },
            { id: "shorts",   label: "⚡ Short Films" },
            { id: "featured", label: "⭐ Staff Picks" },
            { id: "trending", label: "🔥 Trending" },
          ].map(v => (
            <button key={v.id} style={S.tab(activeView === v.id)}
              onClick={() => setActiveView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <input
            style={S.searchBox}
            placeholder="🔍 Search films..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select style={S.select} value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g} value={g === "All" ? "" : g}>{g}</option>)}
          </select>
          {activeView === "all" && (
            <select style={S.select} value={filmType} onChange={e => setFilmType(e.target.value)}>
              {FILM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
          <select style={S.select} value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>

        {/* Genre Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {GENRES.map(g => (
            <button key={g} style={S.tab(genre === (g === "All" ? "" : g))}
              onClick={() => setGenre(g === "All" ? "" : g)}>
              {g}
            </button>
          ))}
        </div>

        {/* Films Grid */}
        {loading && films.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#5a7088" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎬</div>
            Loading films...
          </div>
        ) : films.length === 0 ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>📽️</div>
            <div style={{ fontSize: "1.1rem", color: "#8b949e", marginBottom: 8 }}>No films found</div>
            <div style={{ fontSize: "0.85rem" }}>Try adjusting your filters or search terms</div>
          </div>
        ) : (
          <>
            <div style={S.grid}>
              {films.map(f => (
                <FilmCard key={f.id} film={f} onClick={() => goToFilm(f.id)} />
              ))}
            </div>
            {hasMore && (
              <button style={S.loadMore} onClick={loadMore} disabled={loading}>
                {loading ? "Loading..." : "Load More Films"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrowseFilmsPage;
