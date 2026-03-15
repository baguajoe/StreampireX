// =============================================================================
// FilmTheatrePage.js — Virtual Theatre Profile for StreamPireX
// =============================================================================
// Location: src/front/js/pages/FilmTheatrePage.js
// Route:    /theatre/:id        (public view)
//           /my-theatre         (creator view)
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders  = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const S = {
  page:       { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  banner:     (url) => ({
    width: "100%", height: 280, objectFit: "cover", display: "block",
    background: url ? undefined : "linear-gradient(135deg, #1f2937, #0a1628)",
  }),
  bannerPH:   { height: 280, background: "linear-gradient(135deg, #1f2937, #0a1628)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", position: "relative" },
  profileRow: { maxWidth: 1100, margin: "-50px auto 0", padding: "0 24px", display: "flex", alignItems: "flex-end", gap: 20, position: "relative", zIndex: 2 },
  logo:       { width: 100, height: 100, borderRadius: "50%", border: "4px solid #0d1117", objectFit: "cover", background: "#161b22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", flexShrink: 0 },
  infoRow:    { flex: 1, paddingBottom: 8 },
  name:       { fontSize: "1.6rem", fontWeight: 800, color: "#e6edf3", marginBottom: 4 },
  tagline:    { color: "#8b949e", fontSize: "0.85rem", fontStyle: "italic" },
  actions:    { display: "flex", gap: 10, paddingBottom: 8 },
  wrap:       { maxWidth: 1100, margin: "24px auto", padding: "0 24px 60px" },
  tabs:       { display: "flex", borderBottom: "1px solid #30363d", marginBottom: 28 },
  tab:        (a) => ({ padding: "10px 20px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, background: "none", border: "none", borderBottom: a ? "2px solid #00ffc8" : "2px solid transparent", color: a ? "#00ffc8" : "#8b949e" }),
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 18 },
  card:       { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s" },
  poster:     { width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" },
  posterPH:   { width: "100%", aspectRatio: "2/3", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" },
  cardBody:   { padding: "12px 14px" },
  badge:      (c) => ({ background: `${c}22`, color: c, borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }),
  editCard:   { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 22, marginBottom: 20 },
  label:      { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#8b949e", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" },
  input:      { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  textarea:   { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 100, resize: "vertical" },
  grid2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  btnTeal:    { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" },
  btnGray:    { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  btnOutline: { background: "transparent", color: "#00ffc8", border: "1px solid #00ffc8", borderRadius: 8, padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" },
  stat:       { textAlign: "center", padding: "16px 20px", background: "#161b22", border: "1px solid #30363d", borderRadius: 8 },
  statNum:    { fontSize: "1.6rem", fontWeight: 800, color: "#00ffc8" },
  statLabel:  { fontSize: "0.72rem", color: "#8b949e", marginTop: 2 },
  screenCard: { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 18, marginBottom: 14 },
  emptyState: { textAlign: "center", padding: "60px 20px", color: "#5a7088" },
};

const FilmTheatrePage = () => {
  const { id }   = useParams(); // undefined = /my-theatre
  const navigate = useNavigate();
  const token    = getToken();

  const [theatre, setTheatre]     = useState(null);
  const [films, setFilms]         = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isOwner, setIsOwner]     = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("films");
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState("");

  // Edit form
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({});
  const logoRef   = useRef();
  const bannerRef = useRef();

  useEffect(() => {
    if (id) {
      fetchTheatreById(id);
    } else {
      fetchMyTheatre();
    }
  }, [id]);

  const fetchMyTheatre = async () => {
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/theatre/my`, { headers: getHeaders() });
      const data = await res.json();
      if (data.theatre === null) {
        // No theatre yet — show create form
        setTheatre(null);
        setIsOwner(true);
        setEditMode(true);
        setForm({ name: "", tagline: "", bio: "", website: "", instagram: "", twitter: "", imdb_url: "", is_sag: false });
      } else {
        setTheatre(data);
        setIsOwner(true);
        setForm(data);
        fetchTheatreFilms(data.id);
        fetchTheatreScreenings(data.id);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const fetchTheatreById = async (theatreId) => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/theatre/${theatreId}`);
      const data = await res.json();
      setTheatre(data);
      setFilms(data.films || []);
      setScreenings(data.upcoming_screenings || []);

      // Check follow status
      if (token) {
        const fRes = await fetch(`${BACKEND_URL}/api/film/theatre/${theatreId}/follow-status`, { headers: getHeaders() });
        if (fRes.ok) setFollowing((await fRes.json()).following);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const fetchTheatreFilms = async (theatreId) => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films?theatre_id=${theatreId}`);
      const data = await res.json();
      setFilms(Array.isArray(data) ? data : data.films || []);
    } catch (e) {}
  };

  const fetchTheatreScreenings = async (theatreId) => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings?theatre_id=${theatreId}`);
      const data = await res.json();
      setScreenings(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { setStatus("⚠ Theatre name is required"); return; }
    setSaving(true);
    try {
      let res, data;
      if (!theatre) {
        res  = await fetch(`${BACKEND_URL}/api/film/theatre`, { method: "POST", headers: getJSONHeaders(), body: JSON.stringify(form) });
      } else {
        res  = await fetch(`${BACKEND_URL}/api/film/theatre/${theatre.id}`, { method: "PUT", headers: getJSONHeaders(), body: JSON.stringify(form) });
      }
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setTheatre(data);
      setEditMode(false);
      setStatus("✅ Theatre saved!");
      if (!theatre) {
        fetchTheatreFilms(data.id);
        fetchTheatreScreenings(data.id);
      }
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!theatre?.id || !file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${BACKEND_URL}/api/film/theatre/${theatre.id}/upload-logo`, { method: "POST", headers: getHeaders(), body: fd });
    const data = await res.json();
    if (data.url) setTheatre(prev => ({ ...prev, logo_url: data.url }));
  };

  const handleBannerUpload = async (file) => {
    if (!theatre?.id || !file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${BACKEND_URL}/api/film/theatre/${theatre.id}/upload-banner`, { method: "POST", headers: getHeaders(), body: fd });
    const data = await res.json();
    if (data.url) setTheatre(prev => ({ ...prev, banner_url: data.url }));
  };

  const handleFollow = async () => {
    if (!token) { navigate("/login"); return; }
    const res  = await fetch(`${BACKEND_URL}/api/film/theatre/${theatre.id}/follow`, { method: "POST", headers: getJSONHeaders() });
    const data = await res.json();
    setFollowing(data.following);
    setTheatre(prev => ({ ...prev, follower_count: data.follower_count }));
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ color: "#00ffc8" }}>Loading theatre...</div>
    </div>
  );

  // ── CREATE THEATRE FORM ──────────────────────────────────────────────────
  if (!theatre && isOwner) return (
    <div style={S.page}>
      <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#e6edf3", marginBottom: 8 }}>🎭 Create Your Theatre</h1>
        <p style={{ color: "#8b949e", marginBottom: 32 }}>Your virtual theatre is your filmmaker brand on StreamPireX</p>

        {["name", "tagline", "bio", "website", "instagram", "twitter", "imdb_url"].map(field => (
          <div key={field} style={S.editCard}>
            <label style={S.label}>{field.replace(/_/g, " ").toUpperCase()}{field === "name" ? " *" : ""}</label>
            {field === "bio"
              ? <textarea style={S.textarea} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={field === "bio" ? "Tell filmmakers and fans about your theatre..." : ""} />
              : <input style={S.input} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={field === "name" ? "e.g. Midnight Cinema" : `Your ${field}`} />
            }
          </div>
        ))}

        <div style={S.editCard}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_sag || false} onChange={e => setForm(p => ({ ...p, is_sag: e.target.checked }))} />
            <span style={{ fontSize: "0.88rem" }}><strong style={{ color: "#ffa726" }}>SAG-AFTRA Signatory</strong> — My productions use SAG-AFTRA union talent</span>
          </label>
        </div>

        {status && <div style={{ color: status.startsWith("⚠") ? "#ff9500" : "#00ffc8", marginBottom: 16, fontSize: "0.85rem" }}>{status}</div>}
        <button style={S.btnTeal} onClick={handleSave} disabled={saving}>
          {saving ? "Creating..." : "🎭 Create Theatre"}
        </button>
      </div>
    </div>
  );

  if (!theatre) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎭</div>
        <div style={{ color: "#8b949e" }}>Theatre not found</div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Banner */}
      <div style={{ position: "relative" }}>
        {theatre.banner_url
          ? <img src={theatre.banner_url} alt="banner" style={{ ...S.banner(), objectFit: "cover", height: 280 }} />
          : <div style={S.bannerPH}>🎭</div>
        }
        {isOwner && (
          <button onClick={() => bannerRef.current?.click()} style={{ position: "absolute", bottom: 12, right: 16, background: "rgba(0,0,0,0.7)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: "0.78rem" }}>
            📷 Change Banner
          </button>
        )}
        <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleBannerUpload(e.target.files[0])} />
      </div>

      {/* Profile Row */}
      <div style={S.profileRow}>
        <div style={{ ...S.logo, overflow: "hidden" }} onClick={() => isOwner && logoRef.current?.click()}>
          {theatre.logo_url
            ? <img src={theatre.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : "🎭"
          }
        </div>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoUpload(e.target.files[0])} />

        <div style={S.infoRow}>
          <div style={S.name}>
            {theatre.name}
            {theatre.is_verified && <span style={{ marginLeft: 8, color: "#00ffc8", fontSize: "1rem" }}>✓</span>}
            {theatre.is_sag && <span style={{ marginLeft: 8, background: "rgba(255,167,38,0.15)", color: "#ffa726", fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>SAG-AFTRA</span>}
          </div>
          {theatre.tagline && <div style={S.tagline}>"{theatre.tagline}"</div>}
          <div style={{ color: "#8b949e", fontSize: "0.78rem", marginTop: 4 }}>
            {theatre.follower_count?.toLocaleString() || 0} followers · {films.length} films
          </div>
        </div>

        <div style={S.actions}>
          {isOwner ? (
            <>
              <button style={S.btnGray} onClick={() => setEditMode(e => !e)}>{editMode ? "✕ Cancel" : "✏️ Edit Theatre"}</button>
              <button style={S.btnTeal} onClick={() => navigate("/film-upload")}>+ Upload Film</button>
              <button style={S.btnGray} onClick={() => navigate("/screening-scheduler")}>🎟️ Schedule Screening</button>
            </>
          ) : (
            <>
              <button style={following ? S.btnGray : S.btnOutline} onClick={handleFollow}>
                {following ? "✓ Following" : "+ Follow Theatre"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={S.wrap}>
        {/* Edit Mode */}
        {editMode && isOwner && (
          <div style={{ marginBottom: 32 }}>
            <div style={S.editCard}>
              <h3 style={{ color: "#e6edf3", marginTop: 0 }}>✏️ Edit Theatre</h3>
              <div style={S.grid2}>
                {["name", "tagline", "website", "instagram", "twitter", "imdb_url"].map(field => (
                  <div key={field}>
                    <label style={S.label}>{field.replace(/_/g, " ")}</label>
                    <input style={S.input} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={S.label}>Bio</label>
                <textarea style={S.textarea} value={form.bio || ""} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem" }}>
                  <input type="checkbox" checked={form.is_sag || false} onChange={e => setForm(p => ({ ...p, is_sag: e.target.checked }))} />
                  SAG-AFTRA Signatory
                </label>
              </div>
              {status && <div style={{ color: status.startsWith("⚠") ? "#ff9500" : "#00ffc8", marginTop: 12, fontSize: "0.82rem" }}>{status}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button style={S.btnTeal} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                <button style={S.btnGray} onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            ["Films", films.length],
            ["Followers", (theatre.follower_count || 0).toLocaleString()],
            ["Total Views", (theatre.total_views || 0).toLocaleString()],
            ["Screenings", screenings.length],
          ].map(([label, value]) => (
            <div key={label} style={S.stat}>
              <div style={S.statNum}>{value}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {theatre.bio && (
          <div style={{ ...S.editCard, marginBottom: 28 }}>
            <p style={{ color: "#c9d1d9", lineHeight: 1.7, margin: 0 }}>{theatre.bio}</p>
            <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
              {theatre.website && <a href={theatre.website} target="_blank" rel="noreferrer" style={{ color: "#00ffc8", fontSize: "0.8rem" }}>🌐 Website</a>}
              {theatre.instagram && <a href={`https://instagram.com/${theatre.instagram}`} target="_blank" rel="noreferrer" style={{ color: "#00ffc8", fontSize: "0.8rem" }}>📷 Instagram</a>}
              {theatre.twitter && <a href={`https://twitter.com/${theatre.twitter}`} target="_blank" rel="noreferrer" style={{ color: "#00ffc8", fontSize: "0.8rem" }}>🐦 Twitter</a>}
              {theatre.imdb_url && <a href={theatre.imdb_url} target="_blank" rel="noreferrer" style={{ color: "#f5c518", fontSize: "0.8rem" }}>🎬 IMDb</a>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={S.tabs}>
          {["films", "screenings", "about"].map(tab => (
            <button key={tab} style={S.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab === "films" ? "🎬 Films" : tab === "screenings" ? "🎟️ Screenings" : "ℹ️ About"}
            </button>
          ))}
        </div>

        {/* Films Tab */}
        {activeTab === "films" && (
          <>
            {films.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>📽️</div>
                <div>{isOwner ? "Upload your first film to get started" : "No films published yet"}</div>
                {isOwner && <button style={{ ...S.btnTeal, marginTop: 16 }} onClick={() => navigate("/film-upload")}>+ Upload Film</button>}
              </div>
            ) : (
              <div style={S.grid}>
                {films.map(f => (
                  <div key={f.id} style={S.card}
                    onClick={() => navigate(`/film/${f.id}`)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#00ffc8"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#30363d"}>
                    {f.poster_url
                      ? <img src={f.poster_url} alt={f.title} style={S.poster} />
                      : <div style={S.posterPH}>📽️</div>
                    }
                    <div style={S.cardBody}>
                      <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                      <div style={{ color: "#8b949e", fontSize: "0.72rem" }}>{f.genre} · {f.runtime_minutes ? `${f.runtime_minutes}m` : f.film_type}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {f.pricing_model === "free" && <span style={S.badge("#00ffc8")}>FREE</span>}
                        {f.pricing_model === "rent" && <span style={S.badge("#ffa726")}>RENT ${f.rent_price}</span>}
                        {!f.is_published && isOwner && <span style={S.badge("#ff9500")}>DRAFT</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Screenings Tab */}
        {activeTab === "screenings" && (
          <>
            {isOwner && (
              <div style={{ marginBottom: 20 }}>
                <button style={S.btnTeal} onClick={() => navigate("/screening-scheduler")}>
                  🎟️ Schedule a Screening
                </button>
              </div>
            )}
            {screenings.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎟️</div>
                <div>No upcoming screenings</div>
              </div>
            ) : (
              screenings.map(s => (
                <div key={s.id} style={S.screenCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#e6edf3", marginBottom: 4 }}>{s.title}</div>
                      <div style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                        {new Date(s.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ color: "#8b949e", fontSize: "0.78rem", marginTop: 4 }}>
                        {s.ticket_price === 0 ? "Free" : `$${s.ticket_price} per ticket`}
                        {s.capacity && ` · ${s.spots_remaining} spots remaining`}
                        {s.has_qa && " · Q&A after screening"}
                      </div>
                    </div>
                    <button style={S.btnTeal} onClick={() => navigate(`/screening/${s.id}`)}>
                      {s.ticket_price === 0 ? "Free — RSVP" : `Get Tickets $${s.ticket_price}`}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div style={{ maxWidth: 700 }}>
            {theatre.bio && (
              <div style={S.editCard}>
                <h3 style={{ color: "#e6edf3", margin: "0 0 12px" }}>About {theatre.name}</h3>
                <p style={{ color: "#c9d1d9", lineHeight: 1.7, margin: 0 }}>{theatre.bio}</p>
              </div>
            )}
            {theatre.awards?.length > 0 && (
              <div style={S.editCard}>
                <h3 style={{ color: "#ffd700", margin: "0 0 16px" }}>🏆 Awards & Recognition</h3>
                {theatre.awards.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #21262d" }}>
                    <span>🏆</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "#e6edf3", fontSize: "0.85rem" }}>{a.festival} {a.year}</div>
                      {a.award && <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>{a.award}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilmTheatrePage;
