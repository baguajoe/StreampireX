// =============================================================================
// FilmDetailPage.js — Film Detail Page (IMDB-style) for StreamPireX
// =============================================================================
// Location: src/front/js/pages/FilmDetailPage.js
// Route:    /film/:id
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken  = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const RATING_COLORS = { G: "#00ffc8", PG: "#4a9eff", "PG-13": "#ffa726", R: "#ff4757", NR: "#8b949e" };

const S = {
  page:     { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  hero:     { position: "relative", width: "100%", minHeight: 480, overflow: "hidden" },
  heroBg:   (url) => ({
    position: "absolute", inset: 0,
    backgroundImage: url ? `url(${url})` : "linear-gradient(135deg,#1f2937,#0d1117)",
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "brightness(0.3)",
  }),
  heroGrad: { position: "absolute", inset: 0, background: "linear-gradient(to top, #0d1117 0%, transparent 60%)" },
  heroContent: { position: "relative", maxWidth: 1100, margin: "0 auto", padding: "60px 24px 40px", display: "flex", gap: 32, alignItems: "flex-end" },
  poster:   { width: 180, height: 270, objectFit: "cover", borderRadius: 10, flexShrink: 0, boxShadow: "0 8px 30px rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.1)" },
  posterPlaceholder: { width: 180, height: 270, background: "#161b22", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", border: "2px solid #30363d" },
  wrap:     { maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" },
  grid:     { display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, marginTop: 32 },
  card:     { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 22, marginBottom: 20 },
  cardTitle:{ fontSize: "0.95rem", fontWeight: 700, color: "#e6edf3", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
  badge:    (color) => ({ background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700 }),
  btnTeal:  { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 },
  btnGray:  { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "12px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 },
  btnOutline:{ background: "transparent", color: "#00ffc8", border: "1px solid #00ffc8", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  star:     (filled) => ({ color: filled ? "#ffd700" : "#30363d", fontSize: "1.2rem", cursor: "pointer" }),
  creditRow:{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #21262d" },
  reviewCard:{ background: "#21262d", borderRadius: 8, padding: 14, marginBottom: 12 },
};

// ─────────────────────────────────────────────
// STAR RATING
// ─────────────────────────────────────────────
const StarRating = ({ value, onChange, readonly }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map(n => (
      <span key={n} style={S.star(n <= value)}
        onClick={() => !readonly && onChange && onChange(n)}>★</span>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const FilmDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef();

  const [film, setFilm]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Review state
  const [myRating, setMyRating]   = useState(0);
  const [myReview, setMyReview]   = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("");

  // Theatre follow
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const token = getToken();

  useEffect(() => {
    fetchFilm();
  }, [id]);

  const fetchFilm = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/${id}`, {
        headers: token ? getHeaders() : {},
      });
      if (!res.ok) throw new Error("Film not found");
      const data = await res.json();
      setFilm(data);
      setHasAccess(data.has_access || false);

      // Check theatre follow status
      if (token && data.theatre?.id) {
        const fRes = await fetch(`${BACKEND_URL}/api/film/theatre/${data.theatre.id}/follow-status`, {
          headers: getHeaders(),
        });
        if (fRes.ok) {
          const fData = await fRes.json();
          setFollowing(fData.following);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (type) => {
    if (!token) { navigate("/login"); return; }
    setPurchasing(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/${id}/purchase`, {
        method: "POST", headers: getJSONHeaders(),
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleWatch = () => {
    if (!token) { navigate("/login"); return; }
    if (!hasAccess) return;
    setIsPlaying(true);
    setTimeout(() => videoRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleFollow = async () => {
    if (!token) { navigate("/login"); return; }
    if (!film?.theatre?.id) return;
    setFollowLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/theatre/${film.theatre.id}/follow`, {
        method: "POST", headers: getJSONHeaders(),
      });
      const data = await res.json();
      setFollowing(data.following);
      setFilm(prev => ({
        ...prev,
        theatre: { ...prev.theatre, follower_count: data.follower_count },
      }));
    } catch (e) {} finally {
      setFollowLoading(false);
    }
  };

  const submitReview = async () => {
    if (!token) { navigate("/login"); return; }
    if (!myRating) { setReviewStatus("⚠ Please select a star rating"); return; }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/film/films/${id}/reviews`, {
        method: "POST", headers: getJSONHeaders(),
        body: JSON.stringify({ rating: myRating, review_text: myReview }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setReviewStatus("✅ Review submitted!");
      setMyRating(0);
      setMyReview("");
      fetchFilm(); // refresh reviews
    } catch (e) {
      setReviewStatus(`⚠ ${e.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: "#00ffc8", fontSize: "1.1rem" }}>Loading film...</div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎬</div>
        <div style={{ color: "#ff4757", fontSize: "1.1rem" }}>{error}</div>
        <button style={{ ...S.btnGray, marginTop: 16 }} onClick={() => navigate("/browse-films")}>Browse Films</button>
      </div>
    </div>
  );

  const { credits = [], reviews = [], theatre } = film;
  const directors = credits.filter(c => c.role === "Director");
  const cast      = credits.filter(c => ["Actor", "Actress"].includes(c.role));
  const crew      = credits.filter(c => !["Actor", "Actress", "Director"].includes(c.role));

  return (
    <div style={S.page}>
      {/* Hero Banner */}
      <div style={S.hero}>
        <div style={S.heroBg(film.banner_url || film.poster_url)} />
        <div style={S.heroGrad} />
        <div style={S.heroContent}>
          {/* Poster */}
          {film.poster_url
            ? <img src={film.poster_url} alt={film.title} style={S.poster} />
            : <div style={S.posterPlaceholder}>📽️</div>
          }

          {/* Title block */}
          <div style={{ flex: 1 }}>
            {/* Laurels */}
            {film.laurels?.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {film.laurels.map((l, i) => (
                  <div key={i} style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", color: "#ffd700", fontWeight: 700 }}>
                    🏆 {l.festival} {l.year}{l.award ? ` — ${l.award}` : ""}
                  </div>
                ))}
              </div>
            )}

            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", margin: "0 0 8px" }}>{film.title}</h1>
            {film.tagline && <p style={{ color: "#c9d1d9", fontStyle: "italic", margin: "0 0 14px", fontSize: "1rem" }}>"{film.tagline}"</p>}

            {/* Metadata badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {film.release_year && <span style={S.badge("#8b949e")}>{film.release_year}</span>}
              {film.rating && <span style={S.badge(RATING_COLORS[film.rating] || "#8b949e")}>{film.rating}</span>}
              {film.runtime_minutes && <span style={S.badge("#8b949e")}>{film.runtime_minutes} min</span>}
              {film.genre && <span style={S.badge("#4a9eff")}>{film.genre}</span>}
              {film.film_type && <span style={S.badge("#a78bfa")}>{film.film_type}</span>}
              {film.is_sag && <span style={S.badge("#ffa726")}>SAG-AFTRA</span>}
              {film.language && film.language !== "English" && <span style={S.badge("#8b949e")}>{film.language}</span>}
            </div>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <StarRating value={Math.round(film.avg_rating)} readonly />
              <span style={{ color: "#ffd700", fontWeight: 700 }}>{film.avg_rating?.toFixed(1) || "–"}</span>
              <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>({film.review_count} reviews)</span>
              <span style={{ color: "#5a7088", fontSize: "0.8rem" }}>·</span>
              <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>{film.views?.toLocaleString() || 0} views</span>
            </div>

            {/* Directors */}
            {directors.length > 0 && (
              <div style={{ color: "#8b949e", fontSize: "0.82rem", marginBottom: 16 }}>
                Directed by <span style={{ color: "#e6edf3", fontWeight: 600 }}>{directors.map(d => d.name).join(", ")}</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {film.pricing_model === "free" || hasAccess ? (
                <button style={S.btnTeal} onClick={handleWatch}>
                  ▶ Watch Now
                </button>
              ) : (
                <>
                  {film.pricing_model === "rent" && (
                    <button style={S.btnTeal} onClick={() => handlePurchase("rent")} disabled={purchasing}>
                      ⏱️ Rent ${film.rent_price} (48hr)
                    </button>
                  )}
                  {film.pricing_model === "buy" && (
                    <button style={S.btnTeal} onClick={() => handlePurchase("buy")} disabled={purchasing}>
                      💳 Buy ${film.buy_price}
                    </button>
                  )}
                  {film.pricing_model === "fan_membership" && (
                    <button style={S.btnTeal} onClick={() => navigate(`/fan-membership/${film.creator_id}`)}>
                      ⭐ Join Fan Membership
                    </button>
                  )}
                  {film.pricing_model === "screening_only" && (
                    <button style={S.btnGray} onClick={() => navigate("/browse-films")}>
                      🎟️ Available at Screenings Only
                    </button>
                  )}
                </>
              )}

              {film.trailer_url && !isPlaying && (
                <button style={S.btnGray} onClick={() => setShowTrailer(t => !t)}>
                  {showTrailer ? "▼ Hide Trailer" : "▶ Watch Trailer"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Player */}
      {showTrailer && film.trailer_url && (
        <div style={{ background: "#000", padding: "20px 0" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
            <video controls autoPlay style={{ width: "100%", borderRadius: 8, maxHeight: 480 }} src={film.trailer_url} />
          </div>
        </div>
      )}

      {/* Full Film Player */}
      {isPlaying && hasAccess && film.film_url && (
        <div style={{ background: "#000", padding: "20px 0" }} ref={videoRef}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
            <video
              controls
              autoPlay
              style={{ width: "100%", borderRadius: 8, maxHeight: 600 }}
              src={film.film_url}
            >
              {film.subtitle_url && <track kind="subtitles" src={film.subtitle_url} default />}
            </video>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={S.wrap}>
        <div style={S.grid}>

          {/* LEFT COLUMN */}
          <div>
            {/* Synopsis */}
            <div style={S.card}>
              <div style={S.cardTitle}>📖 Synopsis</div>
              <p style={{ color: "#c9d1d9", lineHeight: 1.7, margin: 0 }}>
                {film.synopsis || "No synopsis provided."}
              </p>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>🎭 Cast</div>
                {cast.map((c, i) => (
                  <div key={i} style={S.creditRow}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                      {c.headshot_url ? <img src={c.headshot_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : "🎭"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#e6edf3", fontSize: "0.88rem" }}>
                        {c.name}
                        {c.is_lead && <span style={{ marginLeft: 6, ...S.badge("#00ffc8"), fontSize: "0.6rem" }}>LEAD</span>}
                        {c.is_sag_member && <span style={{ marginLeft: 6, ...S.badge("#ffa726"), fontSize: "0.6rem" }}>SAG</span>}
                      </div>
                      {c.character_name && <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>as {c.character_name}</div>}
                    </div>
                    {c.imdb_url && (
                      <a href={c.imdb_url} target="_blank" rel="noreferrer"
                        style={{ color: "#f5c518", fontSize: "0.7rem", textDecoration: "none", fontWeight: 700 }}>
                        IMDb
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Crew */}
            {crew.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>🎬 Crew</div>
                {crew.map((c, i) => (
                  <div key={i} style={S.creditRow}>
                    <div style={{ width: 80, color: "#8b949e", fontSize: "0.78rem" }}>{c.role}</div>
                    <div style={{ fontWeight: 600, color: "#e6edf3", fontSize: "0.88rem", flex: 1 }}>{c.name}</div>
                    {c.is_sag_member && <span style={S.badge("#ffa726")}>SAG</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {film.tags?.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>🏷️ Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {film.tags.map(tag => (
                    <span key={tag} style={{ background: "#21262d", color: "#c9d1d9", borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div style={S.card}>
              <div style={S.cardTitle}>⭐ Reviews</div>

              {/* Submit review */}
              {token && (
                <div style={{ background: "#0d1117", borderRadius: 8, padding: 14, marginBottom: 20, border: "1px solid #30363d" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e6edf3", marginBottom: 10 }}>Write a Review</div>
                  <StarRating value={myRating} onChange={setMyRating} />
                  <textarea
                    style={{ ...{ width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" }, marginTop: 10 }}
                    value={myReview}
                    onChange={e => setMyReview(e.target.value)}
                    placeholder="Share your thoughts about this film..."
                  />
                  {reviewStatus && (
                    <div style={{ color: reviewStatus.startsWith("⚠") ? "#ff9500" : "#00ffc8", fontSize: "0.8rem", marginTop: 6 }}>
                      {reviewStatus}
                    </div>
                  )}
                  <button style={{ ...S.btnTeal, marginTop: 10, fontSize: "0.82rem", padding: "8px 16px" }}
                    onClick={submitReview} disabled={submittingReview}>
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}

              {/* Reviews list */}
              {reviews.length === 0 && (
                <div style={{ color: "#5a7088", textAlign: "center", padding: "20px 0" }}>
                  No reviews yet. Be the first to review this film!
                </div>
              )}
              {reviews.map(r => (
                <div key={r.id} style={S.reviewCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#30363d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>
                      {r.avatar_url ? <img src={r.avatar_url} alt="" style={{ width: "100%", borderRadius: "50%" }} /> : "👤"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e6edf3", fontSize: "0.82rem" }}>{r.username}</div>
                      <StarRating value={r.rating} readonly />
                    </div>
                    <div style={{ marginLeft: "auto", color: "#5a7088", fontSize: "0.72rem" }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {r.review_text && <p style={{ color: "#c9d1d9", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>{r.review_text}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* Theatre Card */}
            {theatre && (
              <div style={S.card}>
                <div style={S.cardTitle}>🎭 Theatre</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0, overflow: "hidden" }}>
                    {theatre.logo_url ? <img src={theatre.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🎭"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#e6edf3" }}>{theatre.name}</div>
                    <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>
                      {theatre.follower_count?.toLocaleString() || 0} followers
                      {theatre.is_verified && <span style={{ marginLeft: 6, color: "#00ffc8" }}>✓ Verified</span>}
                      {theatre.is_sag && <span style={{ marginLeft: 6, color: "#ffa726" }}>SAG</span>}
                    </div>
                  </div>
                </div>
                {theatre.bio && <p style={{ color: "#8b949e", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: 14 }}>{theatre.bio}</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ ...S.btnOutline, flex: 1 }} onClick={handleFollow} disabled={followLoading}>
                    {following ? "✓ Following" : "+ Follow"}
                  </button>
                  <button style={S.btnGray} onClick={() => navigate(`/theatre/${theatre.id}`)}>
                    View Theatre
                  </button>
                </div>
              </div>
            )}

            {/* Film Details */}
            <div style={S.card}>
              <div style={S.cardTitle}>📋 Film Details</div>
              {[
                ["Type",        film.film_type],
                ["Genre",       film.genre],
                ["Rating",      film.rating],
                ["Runtime",     film.runtime_minutes ? `${film.runtime_minutes} min` : null],
                ["Language",    film.language],
                ["Country",     film.country],
                ["Year",        film.release_year],
                ["Production",  film.production_company],
                ["Rights",      film.distribution_rights],
                ["SAG",         film.is_sag ? "Yes — SAG-AFTRA Production" : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: "0.82rem" }}>
                  <span style={{ color: "#8b949e" }}>{label}</span>
                  <span style={{ color: "#e6edf3", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Laurels sidebar */}
            {film.laurels?.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>🏆 Festival Laurels</div>
                {film.laurels.map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #21262d" }}>
                    <span style={{ fontSize: "1.3rem" }}>🏆</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "#ffd700", fontSize: "0.82rem" }}>{l.festival} {l.year}</div>
                      {l.award && <div style={{ color: "#8b949e", fontSize: "0.72rem" }}>{l.award}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Access Info */}
            <div style={{ ...S.card, border: "1px solid rgba(0,255,200,0.3)" }}>
              <div style={S.cardTitle}>🔐 Access</div>
              {film.pricing_model === "free" && (
                <div style={{ color: "#00ffc8", fontWeight: 700 }}>🆓 Free to watch</div>
              )}
              {film.pricing_model === "rent" && (
                <>
                  <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: "1.1rem", marginBottom: 4 }}>
                    ${film.rent_price} <span style={{ color: "#8b949e", fontWeight: 400, fontSize: "0.8rem" }}>/ 48 hours</span>
                  </div>
                  <div style={{ color: "#8b949e", fontSize: "0.75rem", marginBottom: 14 }}>Or buy for ${film.buy_price} for permanent access</div>
                  {!hasAccess && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button style={S.btnTeal} onClick={() => handlePurchase("rent")} disabled={purchasing}>
                        ⏱️ Rent — ${film.rent_price}
                      </button>
                      <button style={S.btnGray} onClick={() => handlePurchase("buy")} disabled={purchasing}>
                        💳 Buy — ${film.buy_price}
                      </button>
                    </div>
                  )}
                </>
              )}
              {film.pricing_model === "buy" && !hasAccess && (
                <button style={S.btnTeal} onClick={() => handlePurchase("buy")} disabled={purchasing}>
                  💳 Buy — ${film.buy_price}
                </button>
              )}
              {film.pricing_model === "fan_membership" && (
                <button style={S.btnTeal} onClick={() => navigate(`/fan-membership/${film.creator_id}`)}>
                  ⭐ Join Fan Membership to Watch
                </button>
              )}
              {hasAccess && film.pricing_model !== "free" && (
                <div style={{ color: "#00ffc8", fontWeight: 700 }}>✅ You have access</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilmDetailPage;
