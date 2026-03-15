// =============================================================================
// ShortFilmHub.js — Short Film Discovery Hub for StreamPireX
// =============================================================================
// Location: src/front/js/pages/ShortFilmHub.js
// Route:    /short-films
// =============================================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const GENRES = ["All", "Drama", "Comedy", "Horror", "Thriller", "Sci-Fi", "Animation", "Experimental", "Documentary"];

const S = {
  page:      { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  hero:      { background: "linear-gradient(135deg, #0a1628 0%, #1a0a2e 50%, #0a1628 100%)", padding: "60px 24px", textAlign: "center", borderBottom: "1px solid #1a2332", position: "relative", overflow: "hidden" },
  heroTitle: { fontSize: "2.5rem", fontWeight: 900, color: "#e6edf3", margin: "0 0 12px" },
  heroSub:   { color: "#8b949e", fontSize: "1rem", maxWidth: 600, margin: "0 auto 28px" },
  wrap:      { maxWidth: 1200, margin: "0 auto", padding: "40px 24px" },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 },
  wideGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 },
  card:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "all 0.15s" },
  poster:    { width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" },
  posterPH:  { width: "100%", aspectRatio: "2/3", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" },
  wideCard:  { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", cursor: "pointer", display: "flex", transition: "border-color 0.15s" },
  wideImg:   { width: 130, flexShrink: 0, objectFit: "cover" },
  wideImgPH: { width: 130, flexShrink: 0, background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" },
  cardBody:  { padding: "12px 14px" },
  cardTitle: { fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardMeta:  { color: "#8b949e", fontSize: "0.72rem" },
  section:   { marginBottom: 48 },
  secHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  secTitle:  { fontSize: "1.15rem", fontWeight: 700, color: "#e6edf3", display: "flex", alignItems: "center", gap: 8 },
  seeAll:    { color: "#00ffc8", fontSize: "0.8rem", cursor: "pointer", background: "none", border: "none", fontWeight: 600 },
  badge:     (c) => ({ background: `${c}22`, color: c, borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }),
  tabRow:    { display: "flex", gap: 8, flexWrap: "wrap" },
  tab:       (a) => ({ padding: "7px 16px", borderRadius: 20, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, border: "none", background: a ? "rgba(0,255,200,0.15)" : "#161b22", color: a ? "#00ffc8" : "#8b949e" }),
  filters:   { display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
  search:    { flex: 1, minWidth: 200, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "10px 14px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" },
  select:    { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none" },
  btnTeal:   { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" },
  btnGray:   { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" },
  festCard:  { background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(0,255,200,0.04))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 12, padding: 22, marginBottom: 20 },
  festTitle: { fontWeight: 800, color: "#a78bfa", fontSize: "1.1rem", marginBottom: 6 },
  statRow:   { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 },
  stat:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16, textAlign: "center" },
  statNum:   { fontSize: "1.8rem", fontWeight: 800, color: "#00ffc8" },
  statLabel: { color: "#5a7088", fontSize: "0.72rem", marginTop: 2 },
  emptyState:{ textAlign: "center", padding: "60px 20px", color: "#5a7088" },
  loadMore:  { display: "block", margin: "24px auto 0", background: "#21262d", border: "1px solid #30363d", borderRadius: 8, color: "#c9d1d9", padding: "10px 28px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" },
  dirCard:   { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 16, display: "flex", gap: 12, alignItems: "center", cursor: "pointer", transition: "border-color 0.15s" },
};

const FilmCard = ({ film, onClick }) => (
  <div style={S.card} onClick={onClick}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#00ffc8"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = "#30363d"; }}>
    {film.poster_url
      ? <img src={film.poster_url} alt={film.title} style={S.poster} />
      : <div style={S.posterPH}>🎬</div>
    }
    <div style={S.cardBody}>
      <div style={S.cardTitle}>{film.title}</div>
      <div style={S.cardMeta}>
        {film.genre && <span>{film.genre}</span>}
        {film.runtime_minutes && <span> · {film.runtime_minutes}m</span>}
        {film.avg_rating > 0 && <span> · ⭐ {film.avg_rating.toFixed(1)}</span>}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
        {film.pricing_model === "free" && <span style={S.badge("#00ffc8")}>FREE</span>}
        {film.pricing_model === "rent" && <span style={S.badge("#ffa726")}>RENT</span>}
        {film.is_sag && <span style={S.badge("#ffa726")}>SAG</span>}
        {film.is_featured && <span style={S.badge("#a78bfa")}>⭐ FEATURED</span>}
      </div>
    </div>
  </div>
);

const WideCard = ({ film, onClick, rank }) => (
  <div style={S.wideCard} onClick={onClick}
    onMouseEnter={e => e.currentTarget.style.borderColor = "#00ffc8"}
    onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}>
    {film.poster_url
      ? <img src={film.poster_url} alt={film.title} style={S.wideImg} />
      : <div style={S.wideImgPH}>🎬</div>
    }
    <div style={{ ...S.cardBody, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        {rank && <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#30363d", marginBottom: 4 }}>#{rank}</div>}
        <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.9rem", marginBottom: 4 }}>{film.title}</div>
        {film.tagline && <div style={{ color: "#8b949e", fontSize: "0.75rem", fontStyle: "italic", marginBottom: 8 }}>"{film.tagline}"</div>}
        <div style={{ color: "#8b949e", fontSize: "0.72rem" }}>
          {film.genre} · {film.runtime_minutes ? `${film.runtime_minutes}m` : "Short"}
          {film.release_year && ` · ${film.release_year}`}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {film.pricing_model === "free" && <span style={S.badge("#00ffc8")}>FREE</span>}
        {film.avg_rating > 0 && <span style={S.badge("#ffd700")}>⭐ {film.avg_rating.toFixed(1)}</span>}
        <span style={S.badge("#8b949e")}>{film.views?.toLocaleString() || 0} views</span>
      </div>
    </div>
  </div>
);

const ShortFilmHub = () => {
  const navigate = useNavigate();
  const token    = getToken();

  const [films, setFilms]           = useState([]);
  const [trending, setTrending]     = useState([]);
  const [festival, setFestival]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activeGenre, setActiveGenre] = useState("All");
  const [sort, setSort]             = useState("newest");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [stats, setStats]           = useState({ total: 0, free: 0, countries: 0 });

  useEffect(() => {
    fetchTrending();
    fetchFestival();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchFilms(1, true);
  }, [activeGenre, sort, search]);

  const fetchFilms = async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, per_page: 20, sort, type: "short" });
      if (search) params.set("q", search);
      if (activeGenre !== "All") params.set("genre", activeGenre);
      const res  = await fetch(`${BACKEND_URL}/api/film/films/shorts?${params}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.films || [];
      setFilms(reset ? list : prev => [...prev, ...list]);
      setHasMore(p < (data.pages || 1));
      if (reset) {
        setStats({
          total:     data.total || list.length,
          free:      list.filter(f => f.pricing_model === "free").length,
          countries: [...new Set(list.map(f => f.country).filter(Boolean))].length,
        });
      }
    } catch (e) {
      setFilms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/trending?type=short`);
      const data = await res.json();
      setTrending(Array.isArray(data) ? data.filter(f => f.film_type === "short").slice(0, 6) : []);
    } catch (e) {}
  };

  const fetchFestival = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/festival/current`);
      const data = await res.json();
      setFestival(data);
    } catch (e) {}
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchFilms(next, false);
  };

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "repeating-linear-gradient(45deg, #00ffc8 0, #00ffc8 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        <div style={{ position: "relative" }}>
          <h1 style={S.heroTitle}>⚡ Short Films</h1>
          <p style={S.heroSub}>
            Discover independent short films from filmmakers worldwide. Under 40 minutes. Full stories.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={S.btnTeal} onClick={() => navigate("/film-upload")}>
              🎬 Submit Your Short Film
            </button>
            <button style={S.btnGray} onClick={() => navigate("/film-festival")}>
              🏆 Monthly Festival
            </button>
          </div>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Stats */}
        <div style={S.statRow}>
          {[
            [films.length || "—", "Short Films"],
            [trending.filter(f => f.pricing_model === "free").length || "—", "Free to Watch"],
            [festival?.total_submissions || "—", "Festival Entries"],
          ].map(([num, label]) => (
            <div key={label} style={S.stat}>
              <div style={S.statNum}>{num}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Monthly Festival Banner */}
        {festival && (
          <div style={S.festCard}>
            <div style={S.festTitle}>🏆 {currentMonth} Short Film Festival</div>
            <p style={{ color: "#c9d1d9", fontSize: "0.85rem", marginBottom: 16 }}>
              Community votes for the best short films each month. Winners get featured on the homepage and promoted across the platform.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btnTeal} onClick={() => navigate("/film-festival")}>
                Vote Now
              </button>
              {token && (
                <button style={S.btnGray} onClick={() => navigate("/film-festival")}>
                  Submit Your Film
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trending Shorts */}
        {trending.length > 0 && (
          <div style={S.section}>
            <div style={S.secHeader}>
              <div style={S.secTitle}>🔥 Trending This Week</div>
            </div>
            <div style={S.wideGrid}>
              {trending.map((f, i) => (
                <WideCard key={f.id} film={f} rank={i + 1} onClick={() => navigate(`/film/${f.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Genre Filter */}
        <div style={{ marginBottom: 16 }}>
          <div style={S.tabRow}>
            {GENRES.map(g => (
              <button key={g} style={S.tab(activeGenre === g)} onClick={() => setActiveGenre(g)}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Sort */}
        <div style={S.filters}>
          <input style={S.search} placeholder="🔍 Search short films..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.select} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="popular">Most Viewed</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Browse Section */}
        <div style={S.section}>
          <div style={S.secHeader}>
            <div style={S.secTitle}>
              🎬 {activeGenre === "All" ? "All Short Films" : activeGenre}
            </div>
            <div style={{ color: "#5a7088", fontSize: "0.78rem" }}>
              {films.length} film{films.length !== 1 ? "s" : ""}
            </div>
          </div>

          {loading && films.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>🎬</div>
              Loading short films...
            </div>
          ) : films.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>📽️</div>
              <div style={{ fontSize: "1rem", color: "#8b949e", marginBottom: 8 }}>No short films found</div>
              <div style={{ fontSize: "0.82rem", marginBottom: 20 }}>Try a different genre or search term</div>
              <button style={S.btnTeal} onClick={() => navigate("/film-upload")}>Be the first to upload</button>
            </div>
          ) : (
            <>
              <div style={S.grid}>
                {films.map(f => (
                  <FilmCard key={f.id} film={f} onClick={() => navigate(`/film/${f.id}`)} />
                ))}
              </div>
              {hasMore && (
                <button style={S.loadMore} onClick={loadMore} disabled={loading}>
                  {loading ? "Loading..." : "Load More"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Submit CTA */}
        <div style={{ background: "linear-gradient(135deg, rgba(0,255,200,0.06), rgba(74,158,255,0.06))", border: "1px solid rgba(0,255,200,0.2)", borderRadius: 12, padding: "32px 28px", textAlign: "center" }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>
            📽️ Share Your Short Film
          </div>
          <p style={{ color: "#8b949e", marginBottom: 20, fontSize: "0.88rem" }}>
            Independent filmmakers — upload your short film, reach a global audience,
            and submit to our monthly festival for a chance to be featured.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={S.btnTeal} onClick={() => navigate("/film-upload")}>Upload Short Film</button>
            <button style={S.btnGray} onClick={() => navigate("/my-theatre")}>Set Up Your Theatre</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortFilmHub;
