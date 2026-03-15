// =============================================================================
// FilmFestivalBoard.js — Monthly Short Film Festival for StreamPireX
// =============================================================================
// Location: src/front/js/pages/FilmFestivalBoard.js
// Route:    /film-festival
// =============================================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders  = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const CATEGORIES = [
  "All",
  "Best Short",
  "Best Drama",
  "Best Comedy",
  "Best Documentary",
  "Best Animation",
  "Best Student Film",
];

const CATEGORY_EMOJIS = {
  "Best Short":       "🎬",
  "Best Drama":       "🎭",
  "Best Comedy":      "😂",
  "Best Documentary": "📽️",
  "Best Animation":   "🎨",
  "Best Student Film":"🎓",
};

const S = {
  page:      { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  hero:      { background: "linear-gradient(135deg, #1a0a2e 0%, #0a1628 50%, #1a1a0a 100%)", padding: "60px 24px 48px", textAlign: "center", borderBottom: "1px solid #1a2332", position: "relative", overflow: "hidden" },
  heroTitle: { fontSize: "2.4rem", fontWeight: 900, color: "#ffd700", margin: "0 0 10px", textShadow: "0 0 30px rgba(255,215,0,0.3)" },
  heroSub:   { color: "#8b949e", fontSize: "0.95rem", maxWidth: 600, margin: "0 auto 24px" },
  wrap:      { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 60px" },
  grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 },
  card:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, overflow: "hidden", transition: "all 0.15s" },
  cardWinner:{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,167,38,0.04))", border: "2px solid rgba(255,215,0,0.4)" },
  cardImg:   { width: "100%", height: 180, objectFit: "cover", display: "block" },
  cardImgPH: { width: "100%", height: 180, background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem" },
  cardBody:  { padding: "16px" },
  filmTitle: { fontWeight: 800, color: "#e6edf3", fontSize: "0.95rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  director:  { color: "#8b949e", fontSize: "0.75rem", marginBottom: 12 },
  voteRow:   { display: "flex", alignItems: "center", gap: 10 },
  voteBtn:   (voted) => ({ background: voted ? "rgba(0,255,200,0.15)" : "#21262d", color: voted ? "#00ffc8" : "#c9d1d9", border: `1px solid ${voted ? "#00ffc8" : "#30363d"}`, borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }),
  voteCount: { fontSize: "1.3rem", fontWeight: 800, color: "#e6edf3" },
  voteLabel: { fontSize: "0.7rem", color: "#5a7088" },
  tabRow:    { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 },
  tab:       (a) => ({ padding: "8px 18px", borderRadius: 20, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, border: "none", background: a ? "rgba(255,215,0,0.15)" : "#161b22", color: a ? "#ffd700" : "#8b949e" }),
  section:   { marginBottom: 40 },
  secTitle:  { fontSize: "1.1rem", fontWeight: 700, color: "#e6edf3", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 },
  badge:     (c) => ({ background: `${c}22`, color: c, borderRadius: 3, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }),
  winnerBadge:{ background: "rgba(255,215,0,0.15)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.4)", borderRadius: 4, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 800 },
  submitCard:{ background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(0,255,200,0.04))", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 12, padding: 28, marginBottom: 32 },
  btnTeal:   { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "11px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" },
  btnGray:   { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "11px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  select:    { background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.85rem", fontFamily: "inherit", outline: "none" },
  modal:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modalCard: { background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500 },
  label:     { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#8b949e", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" },
  input:     { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  emptyState:{ textAlign: "center", padding: "60px 20px", color: "#5a7088" },
};

const FilmFestivalBoard = () => {
  const navigate = useNavigate();
  const token    = getToken();

  const [festival, setFestival]       = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading]         = useState(true);
  const [votedIds, setVotedIds]       = useState(new Set());
  const [showSubmit, setShowSubmit]   = useState(false);
  const [myFilms, setMyFilms]         = useState([]);
  const [submitForm, setSubmitForm]   = useState({ film_id: "", category: "Best Short" });
  const [submitting, setSubmitting]   = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  useEffect(() => {
    fetchFestival();
    if (token) fetchMyFilms();
  }, []);

  const fetchFestival = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/festival/current`);
      const data = await res.json();
      setFestival(data);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const fetchMyFilms = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/my`, { headers: getHeaders() });
      const data = await res.json();
      setMyFilms(Array.isArray(data) ? data.filter(f => f.is_published && ["short", "animation", "experimental"].includes(f.film_type)) : []);
    } catch (e) {}
  };

  const handleVote = async (submissionId) => {
    if (!token) { navigate("/login"); return; }
    if (votedIds.has(submissionId)) return;

    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/festival/vote/${submissionId}`, { method: "POST", headers: getJSONHeaders() });
      const data = await res.json();
      if (res.ok) {
        setVotedIds(prev => new Set([...prev, submissionId]));
        // Update votes in state
        setFestival(prev => {
          const updated = { ...prev };
          Object.keys(updated.categories || {}).forEach(cat => {
            updated.categories[cat] = updated.categories[cat].map(s =>
              s.id === submissionId ? { ...s, votes: data.votes } : s
            );
          });
          return updated;
        });
      }
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (!submitForm.film_id) { setSubmitStatus("⚠ Select a film"); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/festival/submit`, {
        method: "POST", headers: getJSONHeaders(),
        body: JSON.stringify({ film_id: parseInt(submitForm.film_id), category: submitForm.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setSubmitStatus("✅ Film submitted to the festival!");
      setTimeout(() => { setShowSubmit(false); setSubmitStatus(""); fetchFestival(); }, 1500);
    } catch (e) {
      setSubmitStatus(`⚠ ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get submissions for current category
  const getSubmissions = () => {
    if (!festival?.categories) return [];
    if (activeCategory === "All") {
      return Object.values(festival.categories).flat().sort((a, b) => b.votes - a.votes);
    }
    return (festival.categories[activeCategory] || []).sort((a, b) => b.votes - a.votes);
  };

  const submissions = getSubmissions();
  const topFilm     = submissions[0];

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle, #ffd700 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "3rem", marginBottom: 10 }}>🏆</div>
          <h1 style={S.heroTitle}>StreamPireX Film Festival</h1>
          <p style={S.heroSub}>
            {currentMonth} — Community votes for the best independent short films.
            Winners get featured on the homepage and promoted across the platform.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {token && myFilms.length > 0 && (
              <button style={S.btnTeal} onClick={() => setShowSubmit(true)}>
                🎬 Submit My Film
              </button>
            )}
            {!token && (
              <button style={S.btnTeal} onClick={() => navigate("/login")}>
                Login to Vote & Submit
              </button>
            )}
            <button style={S.btnGray} onClick={() => navigate("/short-films")}>
              Browse Short Films
            </button>
          </div>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Stats */}
        {festival && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
            {[
              ["🎬", festival.total_submissions || 0, "Films Submitted"],
              ["🏆", Object.keys(festival.categories || {}).length, "Categories"],
              ["🗓️", currentMonth, "Current Month"],
            ].map(([emoji, val, label]) => (
              <div key={label} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{emoji}</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffd700" }}>{val}</div>
                <div style={{ fontSize: "0.72rem", color: "#5a7088" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* How it works */}
        <div style={{ ...S.submitCard, marginBottom: 32 }}>
          <div style={{ fontWeight: 800, color: "#a78bfa", fontSize: "1rem", marginBottom: 14 }}>⚡ How It Works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              ["1️⃣", "Submit", "Upload a short film and submit it to any category"],
              ["2️⃣", "Vote", "Community members vote for their favorites"],
              ["3️⃣", "Win", "Monthly winners get featured and promoted"],
            ].map(([num, step, desc]) => (
              <div key={step} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{num}</div>
                <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 4 }}>{step}</div>
                <div style={{ color: "#5a7088", fontSize: "0.75rem" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div style={S.tabRow}>
          {CATEGORIES.map(cat => (
            <button key={cat} style={S.tab(activeCategory === cat)} onClick={() => setActiveCategory(cat)}>
              {CATEGORY_EMOJIS[cat] || "🎬"} {cat}
            </button>
          ))}
        </div>

        {/* Submissions */}
        {loading ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🏆</div>
            Loading festival entries...
          </div>
        ) : submissions.length === 0 ? (
          <div style={S.emptyState}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: "1rem", color: "#8b949e", marginBottom: 8 }}>
              No films submitted {activeCategory !== "All" ? `in ${activeCategory}` : "yet"}
            </div>
            <div style={{ fontSize: "0.82rem", marginBottom: 20 }}>Be the first to submit a short film this month!</div>
            {token && myFilms.length > 0 && (
              <button style={S.btnTeal} onClick={() => setShowSubmit(true)}>Submit My Film</button>
            )}
          </div>
        ) : (
          <>
            {/* Leader / Top Film */}
            {topFilm && activeCategory === "All" && (
              <div style={{ ...S.section }}>
                <div style={S.secTitle}>👑 Current Leader</div>
                <div style={{ ...S.card, ...S.cardWinner, display: "flex", gap: 0, overflow: "hidden", maxWidth: 600 }}>
                  {topFilm.film?.poster_url
                    ? <img src={topFilm.film.poster_url} alt={topFilm.film.title} style={{ width: 140, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 140, background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", flexShrink: 0 }}>🎬</div>
                  }
                  <div style={{ padding: "20px 20px", flex: 1 }}>
                    <div style={S.winnerBadge}>👑 Leading — {topFilm.votes} votes</div>
                    <div style={{ fontWeight: 800, color: "#e6edf3", fontSize: "1.1rem", marginTop: 10, marginBottom: 4 }}>{topFilm.film?.title}</div>
                    <div style={{ color: "#8b949e", fontSize: "0.78rem", marginBottom: 12 }}>
                      {topFilm.category} · {topFilm.film?.genre} · {topFilm.film?.runtime_minutes ? `${topFilm.film.runtime_minutes}m` : "Short"}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={S.voteBtn(votedIds.has(topFilm.id))} onClick={() => handleVote(topFilm.id)} disabled={votedIds.has(topFilm.id)}>
                        {votedIds.has(topFilm.id) ? "✓ Voted" : "▲ Vote"}
                      </button>
                      <button style={S.btnGray} onClick={() => navigate(`/film/${topFilm.film_id}`)}>
                        Watch Film
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Submissions Grid */}
            <div style={S.section}>
              <div style={S.secTitle}>
                {CATEGORY_EMOJIS[activeCategory] || "🎬"} {activeCategory === "All" ? "All Submissions" : activeCategory}
                <span style={{ color: "#5a7088", fontSize: "0.8rem", fontWeight: 400 }}>({submissions.length})</span>
              </div>
              <div style={S.grid}>
                {submissions.map((sub, i) => (
                  <div key={sub.id} style={{ ...S.card, ...(sub.is_winner ? S.cardWinner : {}) }}
                    onMouseEnter={e => { if (!sub.is_winner) e.currentTarget.style.borderColor = "#ffd70066"; }}
                    onMouseLeave={e => { if (!sub.is_winner) e.currentTarget.style.borderColor = "#30363d"; }}>
                    {/* Rank badge */}
                    <div style={{ position: "relative" }}>
                      {sub.film?.poster_url
                        ? <img src={sub.film.poster_url} alt={sub.film.title} style={S.cardImg} />
                        : <div style={S.cardImgPH}>🎬</div>
                      }
                      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.8)", color: i === 0 ? "#ffd700" : "#e6edf3", fontWeight: 800, fontSize: "0.8rem", padding: "2px 8px", borderRadius: 4 }}>
                        #{i + 1}
                      </div>
                      {sub.is_winner && (
                        <div style={{ position: "absolute", top: 8, right: 8 }}>
                          <span style={S.winnerBadge}>🏆 Winner</span>
                        </div>
                      )}
                    </div>

                    <div style={S.cardBody}>
                      <div style={S.filmTitle}>{sub.film?.title || "Unknown Film"}</div>
                      <div style={S.director}>
                        {sub.category}
                        {sub.film?.genre && ` · ${sub.film.genre}`}
                        {sub.film?.runtime_minutes && ` · ${sub.film.runtime_minutes}m`}
                      </div>

                      <div style={S.voteRow}>
                        <button
                          style={S.voteBtn(votedIds.has(sub.id))}
                          onClick={() => handleVote(sub.id)}
                          disabled={votedIds.has(sub.id)}
                        >
                          {votedIds.has(sub.id) ? "✓ Voted" : "▲ Vote"}
                        </button>
                        <div>
                          <div style={S.voteCount}>{sub.votes}</div>
                          <div style={S.voteLabel}>votes</div>
                        </div>
                        <button
                          style={{ ...S.btnGray, padding: "7px 12px", fontSize: "0.75rem", marginLeft: "auto" }}
                          onClick={() => navigate(`/film/${sub.film_id}`)}
                        >
                          Watch
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Upload CTA */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12, padding: "28px", textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>🎬 Enter the Festival</div>
          <p style={{ color: "#8b949e", fontSize: "0.85rem", marginBottom: 20 }}>
            Short films, animations, and experimental works are eligible.
            Submit before the end of the month for your chance to win.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {token && myFilms.length > 0 && (
              <button style={S.btnTeal} onClick={() => setShowSubmit(true)}>🏆 Submit My Film</button>
            )}
            <button style={S.btnGray} onClick={() => navigate("/film-upload")}>Upload a Short Film</button>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmit && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setShowSubmit(false)}>
          <div style={S.modalCard}>
            <div style={{ fontWeight: 800, color: "#ffd700", fontSize: "1.1rem", marginBottom: 20 }}>
              🏆 Submit to {currentMonth} Festival
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Select Film *</label>
              <select style={{ ...S.select, width: "100%" }} value={submitForm.film_id}
                onChange={e => setSubmitForm(p => ({ ...p, film_id: e.target.value }))}>
                <option value="">Choose a film...</option>
                {myFilms.map(f => <option key={f.id} value={f.id}>{f.title} ({f.film_type})</option>)}
              </select>
              {myFilms.length === 0 && (
                <div style={{ color: "#ff9500", fontSize: "0.75rem", marginTop: 6 }}>
                  You need a published short film to submit. <button style={{ color: "#00ffc8", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }} onClick={() => navigate("/film-upload")}>Upload one →</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Category *</label>
              <select style={{ ...S.select, width: "100%" }} value={submitForm.category}
                onChange={e => setSubmitForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>)}
              </select>
            </div>

            {submitStatus && (
              <div style={{ color: submitStatus.startsWith("⚠") ? "#ff9500" : "#00ffc8", fontSize: "0.82rem", marginBottom: 14 }}>
                {submitStatus}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={S.btnGray} onClick={() => setShowSubmit(false)}>Cancel</button>
              <button style={S.btnTeal} onClick={handleSubmit} disabled={submitting || myFilms.length === 0}>
                {submitting ? "Submitting..." : "🏆 Submit Film"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilmFestivalBoard;
