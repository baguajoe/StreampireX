// =============================================================================
// FilmUploadForm.js — Film Upload Form for StreamPireX
// =============================================================================
// Location: src/front/js/pages/FilmUploadForm.js
// Route:    /film-upload
// =============================================================================

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const FILM_TYPES = [
  { id: "short",         label: "🎬 Short Film",       desc: "Under 40 minutes" },
  { id: "feature",       label: "🎥 Feature Film",      desc: "40+ minutes" },
  { id: "documentary",   label: "📽️ Documentary",       desc: "Non-fiction storytelling" },
  { id: "animation",     label: "🎨 Animation",         desc: "Animated content" },
  { id: "experimental",  label: "🌀 Experimental",      desc: "Art house / avant-garde" },
  { id: "student",       label: "🎓 Student Film",      desc: "Academic productions" },
];

const GENRES = [
  "Drama", "Comedy", "Horror", "Thriller", "Sci-Fi", "Action",
  "Romance", "Mystery", "Documentary", "Animation", "Fantasy",
  "Crime", "Biography", "History", "Musical", "Western", "Other",
];

const RATINGS = ["G", "PG", "PG-13", "R", "NR"];

const PRICING_MODELS = [
  { id: "free",            label: "🆓 Free",             desc: "Anyone can watch" },
  { id: "rent",            label: "⏱️ Rent",              desc: "48hr access" },
  { id: "buy",             label: "💳 Buy",               desc: "Permanent access" },
  { id: "fan_membership",  label: "⭐ Fan Members Only",  desc: "Requires fan membership" },
  { id: "screening_only",  label: "🎟️ Screening Only",    desc: "Live events only" },
];

const CREDIT_ROLES = [
  "Director", "Writer", "Producer", "Executive Producer",
  "Actor", "Actress", "Cinematographer", "Editor",
  "Composer", "Production Designer", "Costume Designer",
  "VFX Supervisor", "Sound Designer", "Other",
];

const FESTIVAL_CATEGORIES = [
  "Best Short", "Best Drama", "Best Comedy",
  "Best Documentary", "Best Animation", "Best Student Film",
];

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const S = {
  page:      { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif", padding: "24px" },
  header:    { maxWidth: 900, margin: "0 auto 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:     { fontSize: "1.6rem", fontWeight: 800, color: "#e6edf3", margin: 0 },
  subtitle:  { color: "#8b949e", fontSize: "0.85rem", marginTop: 4 },
  wrap:      { maxWidth: 900, margin: "0 auto" },
  card:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: "1rem", fontWeight: 700, color: "#e6edf3", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 },
  label:     { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#8b949e", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" },
  input:     { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  textarea:  { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 100, resize: "vertical" },
  select:    { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3:     { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  btnTeal:   { background: "#00ffc8", color: "#000", border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" },
  btnGray:   { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 6, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  btnRed:    { background: "transparent", color: "#ff3b30", border: "1px solid #ff3b30", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: "0.75rem" },
  btnSmall:  { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 6, padding: "7px 14px", fontWeight: 600, cursor: "pointer", fontSize: "0.8rem" },
  tag:       { background: "rgba(0,255,200,0.1)", color: "#00ffc8", border: "1px solid rgba(0,255,200,0.3)", borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 },
  uploadBox: { border: "2px dashed #30363d", borderRadius: 8, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "border 0.2s" },
  progress:  { height: 4, background: "#21262d", borderRadius: 2, overflow: "hidden", marginTop: 8 },
  progressBar: (pct) => ({ height: "100%", width: `${pct}%`, background: "#00ffc8", transition: "width 0.3s" }),
  stepTab:   (active) => ({
    padding: "10px 20px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
    borderBottom: active ? "2px solid #00ffc8" : "2px solid transparent",
    color: active ? "#00ffc8" : "#8b949e", background: "none", border: "none",
    borderBottom: active ? "2px solid #00ffc8" : "2px solid transparent",
  }),
};

// ─────────────────────────────────────────────
// UPLOAD HELPER
// ─────────────────────────────────────────────
const uploadFileToR2 = async (filmId, endpoint, file, setProgress) => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BACKEND_URL}/api/film/films/${filmId}/${endpoint}`, {
    method: "POST",
    headers: getHeaders(),
    body: fd,
  });
  const data = await res.json();
  return data.url || null;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const FilmUploadForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=Info 1=Media 2=Credits 3=Pricing 4=Publish
  const [saving, setSaving] = useState(false);
  const [filmId, setFilmId] = useState(null);
  const [status, setStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState({});

  // Form state
  const [form, setForm] = useState({
    title: "",
    tagline: "",
    synopsis: "",
    film_type: "short",
    genre: "",
    rating: "NR",
    runtime_minutes: "",
    language: "English",
    country: "",
    release_year: new Date().getFullYear(),
    is_sag: false,
    production_company: "",
    distribution_rights: "",
    pricing_model: "free",
    rent_price: "",
    buy_price: "",
    is_published: false,
    tags: [],
    laurels: [],
  });

  // Media state
  const [poster, setPoster]     = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [banner, setBanner]     = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [trailer, setTrailer]   = useState(null);
  const [filmFile, setFilmFile] = useState(null);
  const [subtitles, setSubtitles] = useState(null);

  // Credits state
  const [credits, setCredits] = useState([]);
  const [creditForm, setCreditForm] = useState({
    role: "Director", name: "", character_name: "",
    is_lead: false, is_sag_member: false,
  });

  // Tags & Laurels
  const [tagInput, setTagInput] = useState("");
  const [laurelForm, setLaurelForm] = useState({ festival: "", year: new Date().getFullYear(), award: "" });

  // Submit to festival
  const [submitFestival, setSubmitFestival] = useState(false);
  const [festivalCategory, setFestivalCategory] = useState("Best Short");

  const posterRef   = useRef();
  const bannerRef   = useRef();
  const trailerRef  = useRef();
  const filmRef     = useRef();
  const subRef      = useRef();

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // ── Step 0: Save basic info (creates the film record) ──
  const saveBasicInfo = async () => {
    if (!form.title.trim()) { setStatus("⚠ Title is required"); return false; }
    setSaving(true);
    setStatus("");
    try {
      const method = filmId ? "PUT" : "POST";
      const url    = filmId
        ? `${BACKEND_URL}/api/film/films/${filmId}`
        : `${BACKEND_URL}/api/film/films`;
      const res  = await fetch(url, { method, headers: getJSONHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (!filmId) setFilmId(data.id);
      setStatus("✅ Saved!");
      return data.id || filmId;
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      const id = await saveBasicInfo();
      if (!id) return;
    }
    setStep(s => Math.min(s + 1, 4));
    setStatus("");
  };

  // ── Upload media files ──
  const handleUpload = async (file, endpoint, label) => {
    if (!filmId) { setStatus("⚠ Save basic info first"); return; }
    if (!file) return;
    setUploadProgress(p => ({ ...p, [label]: 0 }));
    setStatus(`Uploading ${label}...`);
    try {
      const url = await uploadFileToR2(filmId, endpoint, file, (pct) =>
        setUploadProgress(p => ({ ...p, [label]: pct }))
      );
      if (url) {
        setStatus(`✅ ${label} uploaded!`);
        setUploadProgress(p => ({ ...p, [label]: 100 }));
      }
    } catch (e) {
      setStatus(`⚠ ${label} upload failed`);
    }
  };

  // ── Add credit ──
  const addCredit = async () => {
    if (!creditForm.name.trim()) { setStatus("⚠ Name required"); return; }
    if (!filmId) { setStatus("⚠ Save basic info first"); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/film/films/${filmId}/credits`, {
        method: "POST", headers: getJSONHeaders(),
        body: JSON.stringify({ ...creditForm, order: credits.length }),
      });
      const data = await res.json();
      setCredits(prev => [...prev, data]);
      setCreditForm({ role: "Director", name: "", character_name: "", is_lead: false, is_sag_member: false });
      setStatus("✅ Credit added");
    } catch (e) {
      setStatus("⚠ Failed to add credit");
    }
  };

  const removeCredit = async (creditId) => {
    try {
      await fetch(`${BACKEND_URL}/api/film/films/${filmId}/credits/${creditId}`, {
        method: "DELETE", headers: getHeaders(),
      });
      setCredits(prev => prev.filter(c => c.id !== creditId));
    } catch (e) {}
  };

  // ── Tags ──
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || form.tags.includes(tag)) return;
    update("tags", [...form.tags, tag]);
    setTagInput("");
  };

  // ── Laurels ──
  const addLaurel = () => {
    if (!laurelForm.festival.trim()) return;
    update("laurels", [...form.laurels, { ...laurelForm }]);
    setLaurelForm({ festival: "", year: new Date().getFullYear(), award: "" });
  };

  // ── Publish ──
  const handlePublish = async () => {
    setSaving(true);
    setStatus("");
    try {
      // Save latest form state
      await fetch(`${BACKEND_URL}/api/film/films/${filmId}`, {
        method: "PUT", headers: getJSONHeaders(),
        body: JSON.stringify({ ...form, is_published: true }),
      });

      // Submit to festival if checked
      if (submitFestival && ["short", "animation", "experimental"].includes(form.film_type)) {
        await fetch(`${BACKEND_URL}/api/film/festival/submit`, {
          method: "POST", headers: getJSONHeaders(),
          body: JSON.stringify({ film_id: filmId, category: festivalCategory }),
        });
      }

      setStatus("✅ Film published!");
      setTimeout(() => navigate(`/film/${filmId}`), 1500);
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const steps = ["📝 Info", "🎬 Media", "👥 Credits", "💰 Pricing", "🚀 Publish"];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📽️ Upload Film</h1>
          <p style={S.subtitle}>Share your film with the StreamPireX community</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {status && (
            <span style={{ color: status.startsWith("⚠") ? "#ff9500" : "#00ffc8", fontSize: "0.85rem" }}>
              {status}
            </span>
          )}
          <button style={S.btnGray} onClick={() => navigate("/my-theatre")}>Cancel</button>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Step Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #30363d", marginBottom: 24 }}>
          {steps.map((s, i) => (
            <button key={i} style={S.stepTab(step === i)} onClick={() => filmId || i === 0 ? setStep(i) : null}>
              {s}
            </button>
          ))}
        </div>

        {/* ── STEP 0: Basic Info ── */}
        {step === 0 && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>📝 Film Information</div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Film Title *</label>
                <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)}
                  placeholder="e.g. The Last Frame" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Tagline</label>
                <input style={S.input} value={form.tagline} onChange={e => update("tagline", e.target.value)}
                  placeholder="One sentence that captures the essence of your film" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Synopsis</label>
                <textarea style={S.textarea} value={form.synopsis} onChange={e => update("synopsis", e.target.value)}
                  placeholder="Tell the world what your film is about..." />
              </div>

              {/* Film Type */}
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Film Type *</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {FILM_TYPES.map(t => (
                    <div key={t.id} onClick={() => update("film_type", t.id)} style={{
                      padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                      background: form.film_type === t.id ? "rgba(0,255,200,0.1)" : "#21262d",
                      border: `2px solid ${form.film_type === t.id ? "#00ffc8" : "#30363d"}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: form.film_type === t.id ? "#00ffc8" : "#e6edf3" }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#8b949e", marginTop: 2 }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={S.grid3}>
                <div>
                  <label style={S.label}>Genre</label>
                  <select style={S.select} value={form.genre} onChange={e => update("genre", e.target.value)}>
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Rating</label>
                  <select style={S.select} value={form.rating} onChange={e => update("rating", e.target.value)}>
                    {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Runtime (minutes)</label>
                  <input type="number" style={S.input} value={form.runtime_minutes}
                    onChange={e => update("runtime_minutes", e.target.value)} placeholder="e.g. 12" />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>🌍 Origin & Industry</div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Language</label>
                  <input style={S.input} value={form.language} onChange={e => update("language", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Country of Origin</label>
                  <input style={S.input} value={form.country} onChange={e => update("country", e.target.value)}
                    placeholder="e.g. United States" />
                </div>
                <div>
                  <label style={S.label}>Release Year</label>
                  <input type="number" style={S.input} value={form.release_year}
                    onChange={e => update("release_year", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Production Company</label>
                  <input style={S.input} value={form.production_company}
                    onChange={e => update("production_company", e.target.value)}
                    placeholder="e.g. Indie Films LLC" />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.is_sag} onChange={e => update("is_sag", e.target.checked)} />
                  <span style={{ fontSize: "0.88rem" }}>
                    <strong style={{ color: "#00ffc8" }}>SAG-AFTRA Production</strong>
                    <span style={{ color: "#8b949e", marginLeft: 6 }}>— This production used SAG-AFTRA union actors</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div style={S.card}>
              <div style={S.cardTitle}>🏷️ Tags</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input style={{ ...S.input, flex: 1 }} value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTag()}
                  placeholder="Add a tag (press Enter)" />
                <button style={S.btnSmall} onClick={addTag}>Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {form.tags.map(tag => (
                  <div key={tag} style={S.tag}>
                    #{tag}
                    <span style={{ cursor: "pointer" }} onClick={() => update("tags", form.tags.filter(t => t !== tag))}>×</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Festival Laurels */}
            <div style={S.card}>
              <div style={S.cardTitle}>🏆 Festival Laurels</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <input style={{ ...S.input, flex: 2 }} placeholder="Festival name (e.g. Sundance)"
                  value={laurelForm.festival} onChange={e => setLaurelForm(p => ({ ...p, festival: e.target.value }))} />
                <input style={{ ...S.input, width: 90 }} placeholder="Year" type="number"
                  value={laurelForm.year} onChange={e => setLaurelForm(p => ({ ...p, year: e.target.value }))} />
                <input style={{ ...S.input, flex: 2 }} placeholder="Award (e.g. Jury Prize)"
                  value={laurelForm.award} onChange={e => setLaurelForm(p => ({ ...p, award: e.target.value }))} />
                <button style={S.btnSmall} onClick={addLaurel}>+ Add</button>
              </div>
              {form.laurels.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#21262d", borderRadius: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: "1.2rem" }}>🏆</span>
                  <span style={{ color: "#e6edf3", flex: 1 }}>{l.festival} {l.year} — {l.award || "Official Selection"}</span>
                  <button style={S.btnRed} onClick={() => update("laurels", form.laurels.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 1: Media Uploads ── */}
        {step === 1 && (
          <>
            {!filmId && (
              <div style={{ ...S.card, borderColor: "#ff9500" }}>
                <p style={{ color: "#ff9500", margin: 0 }}>⚠ Please complete Step 1 first to create the film record before uploading media.</p>
              </div>
            )}

            {/* Poster */}
            <div style={S.card}>
              <div style={S.cardTitle}>🖼️ Film Poster</div>
              <div style={S.uploadBox} onClick={() => posterRef.current?.click()}>
                {posterPreview
                  ? <img src={posterPreview} alt="poster" style={{ maxHeight: 200, borderRadius: 6 }} />
                  : <><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🖼️</div>
                     <div style={{ color: "#8b949e" }}>Click to upload poster (JPG, PNG)</div>
                     <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>Recommended: 2:3 ratio (e.g. 800×1200)</div></>
                }
              </div>
              <input ref={posterRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setPoster(f);
                  setPosterPreview(URL.createObjectURL(f));
                }} />
              {poster && (
                <button style={{ ...S.btnTeal, marginTop: 10 }}
                  onClick={() => handleUpload(poster, "upload-poster", "Poster")}>
                  ⬆️ Upload Poster
                </button>
              )}
              {uploadProgress.Poster > 0 && (
                <div style={S.progress}><div style={S.progressBar(uploadProgress.Poster)} /></div>
              )}
            </div>

            {/* Banner */}
            <div style={S.card}>
              <div style={S.cardTitle}>🎞️ Banner Image</div>
              <div style={S.uploadBox} onClick={() => bannerRef.current?.click()}>
                {bannerPreview
                  ? <img src={bannerPreview} alt="banner" style={{ maxHeight: 160, width: "100%", objectFit: "cover", borderRadius: 6 }} />
                  : <><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎞️</div>
                     <div style={{ color: "#8b949e" }}>Click to upload banner (wide format)</div>
                     <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>Recommended: 16:9 ratio (e.g. 1920×1080)</div></>
                }
              </div>
              <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setBanner(f);
                  setBannerPreview(URL.createObjectURL(f));
                }} />
              {banner && (
                <button style={{ ...S.btnTeal, marginTop: 10 }}
                  onClick={() => handleUpload(banner, "upload-banner", "Banner")}>
                  ⬆️ Upload Banner
                </button>
              )}
            </div>

            {/* Trailer */}
            <div style={S.card}>
              <div style={S.cardTitle}>🎬 Trailer</div>
              <div style={S.uploadBox} onClick={() => trailerRef.current?.click()}>
                {trailer
                  ? <div style={{ color: "#00ffc8" }}>✅ {trailer.name} selected</div>
                  : <><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎬</div>
                     <div style={{ color: "#8b949e" }}>Click to upload trailer (MP4, MOV)</div>
                     <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>Max 2 minutes recommended</div></>
                }
              </div>
              <input ref={trailerRef} type="file" accept="video/*" style={{ display: "none" }}
                onChange={e => setTrailer(e.target.files[0])} />
              {trailer && (
                <button style={{ ...S.btnTeal, marginTop: 10 }}
                  onClick={() => handleUpload(trailer, "upload-trailer", "Trailer")}>
                  ⬆️ Upload Trailer
                </button>
              )}
              {uploadProgress.Trailer > 0 && (
                <div style={S.progress}><div style={S.progressBar(uploadProgress.Trailer)} /></div>
              )}
            </div>

            {/* Full Film */}
            <div style={S.card}>
              <div style={S.cardTitle}>📽️ Full Film File</div>
              <div style={{ ...S.uploadBox, borderColor: filmFile ? "#00ffc8" : "#30363d" }}
                onClick={() => filmRef.current?.click()}>
                {filmFile
                  ? <div style={{ color: "#00ffc8" }}>✅ {filmFile.name} ({(filmFile.size / 1024 / 1024).toFixed(1)} MB)</div>
                  : <><div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📽️</div>
                     <div style={{ color: "#8b949e" }}>Click to upload your film (MP4, MOV, MKV)</div>
                     <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>Stored securely on Cloudflare R2</div></>
                }
              </div>
              <input ref={filmRef} type="file" accept="video/*" style={{ display: "none" }}
                onChange={e => setFilmFile(e.target.files[0])} />
              {filmFile && (
                <button style={{ ...S.btnTeal, marginTop: 10 }}
                  onClick={() => handleUpload(filmFile, "upload-film", "Film")}>
                  ⬆️ Upload Full Film
                </button>
              )}
              {uploadProgress.Film !== undefined && (
                <div style={S.progress}><div style={S.progressBar(uploadProgress.Film)} /></div>
              )}
            </div>

            {/* Subtitles */}
            <div style={S.card}>
              <div style={S.cardTitle}>💬 Subtitles / Captions</div>
              <div style={S.uploadBox} onClick={() => subRef.current?.click()}>
                {subtitles
                  ? <div style={{ color: "#00ffc8" }}>✅ {subtitles.name}</div>
                  : <><div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                     <div style={{ color: "#8b949e" }}>Upload .vtt or .srt subtitle file (optional)</div></>
                }
              </div>
              <input ref={subRef} type="file" accept=".vtt,.srt" style={{ display: "none" }}
                onChange={e => setSubtitles(e.target.files[0])} />
              {subtitles && (
                <button style={{ ...S.btnTeal, marginTop: 10 }}
                  onClick={() => handleUpload(subtitles, "upload-subtitles", "Subtitles")}>
                  ⬆️ Upload Subtitles
                </button>
              )}
            </div>
          </>
        )}

        {/* ── STEP 2: Credits ── */}
        {step === 2 && (
          <div style={S.card}>
            <div style={S.cardTitle}>👥 Cast & Crew Credits</div>

            {/* Add credit form */}
            <div style={{ background: "#0d1117", borderRadius: 8, padding: 16, marginBottom: 20, border: "1px solid #30363d" }}>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Role</label>
                  <select style={S.select} value={creditForm.role}
                    onChange={e => setCreditForm(p => ({ ...p, role: e.target.value }))}>
                    {CREDIT_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Full Name *</label>
                  <input style={S.input} value={creditForm.name}
                    onChange={e => setCreditForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Jane Smith" />
                </div>
                <div>
                  <label style={S.label}>Character Name (actors only)</label>
                  <input style={S.input} value={creditForm.character_name}
                    onChange={e => setCreditForm(p => ({ ...p, character_name: e.target.value }))}
                    placeholder="e.g. Detective Monroe" />
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center", paddingTop: 24 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.82rem" }}>
                    <input type="checkbox" checked={creditForm.is_lead}
                      onChange={e => setCreditForm(p => ({ ...p, is_lead: e.target.checked }))} />
                    Lead Role
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.82rem" }}>
                    <input type="checkbox" checked={creditForm.is_sag_member}
                      onChange={e => setCreditForm(p => ({ ...p, is_sag_member: e.target.checked }))} />
                    SAG Member
                  </label>
                </div>
              </div>
              <button style={{ ...S.btnTeal, marginTop: 14 }} onClick={addCredit}>+ Add Credit</button>
            </div>

            {/* Credits list */}
            {credits.length === 0 && (
              <div style={{ textAlign: "center", color: "#5a7088", padding: "20px 0" }}>
                No credits added yet. Add your cast and crew above.
              </div>
            )}
            {credits.map(credit => (
              <div key={credit.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#21262d", borderRadius: 6, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#30363d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                  {credit.role === "Director" ? "🎬" : credit.role === "Actor" || credit.role === "Actress" ? "🎭" : "👤"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#e6edf3", fontSize: "0.88rem" }}>
                    {credit.name}
                    {credit.is_lead && <span style={{ marginLeft: 6, background: "rgba(0,255,200,0.15)", color: "#00ffc8", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 3 }}>LEAD</span>}
                    {credit.is_sag_member && <span style={{ marginLeft: 6, background: "rgba(255,167,38,0.15)", color: "#ffa726", fontSize: "0.65rem", padding: "1px 6px", borderRadius: 3 }}>SAG</span>}
                  </div>
                  <div style={{ color: "#8b949e", fontSize: "0.75rem" }}>
                    {credit.role}{credit.character_name ? ` — as ${credit.character_name}` : ""}
                  </div>
                </div>
                <button style={S.btnRed} onClick={() => removeCredit(credit.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 3: Pricing ── */}
        {step === 3 && (
          <div style={S.card}>
            <div style={S.cardTitle}>💰 Pricing & Access</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {PRICING_MODELS.map(p => (
                <div key={p.id} onClick={() => update("pricing_model", p.id)} style={{
                  padding: "14px 16px", borderRadius: 8, cursor: "pointer",
                  background: form.pricing_model === p.id ? "rgba(0,255,200,0.08)" : "#21262d",
                  border: `2px solid ${form.pricing_model === p.id ? "#00ffc8" : "#30363d"}`,
                }}>
                  <div style={{ fontWeight: 700, color: form.pricing_model === p.id ? "#00ffc8" : "#e6edf3" }}>{p.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8b949e", marginTop: 3 }}>{p.desc}</div>
                </div>
              ))}
            </div>

            {form.pricing_model === "rent" && (
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Rental Price (USD) — 48 hour access</label>
                <input type="number" step="0.01" min="0.99" style={{ ...S.input, maxWidth: 200 }}
                  value={form.rent_price} onChange={e => update("rent_price", e.target.value)}
                  placeholder="3.99" />
                <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>
                  You earn ${((parseFloat(form.rent_price) || 0) * 0.9).toFixed(2)} per rental (90%)
                </div>
              </div>
            )}

            {form.pricing_model === "buy" && (
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Purchase Price (USD) — permanent access</label>
                <input type="number" step="0.01" min="0.99" style={{ ...S.input, maxWidth: 200 }}
                  value={form.buy_price} onChange={e => update("buy_price", e.target.value)}
                  placeholder="9.99" />
                <div style={{ color: "#5a7088", fontSize: "0.75rem", marginTop: 4 }}>
                  You earn ${((parseFloat(form.buy_price) || 0) * 0.9).toFixed(2)} per purchase (90%)
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <label style={S.label}>Distribution Rights</label>
              <input style={S.input} value={form.distribution_rights}
                onChange={e => update("distribution_rights", e.target.value)}
                placeholder="e.g. Worldwide, North America Only, etc." />
            </div>
          </div>
        )}

        {/* ── STEP 4: Publish ── */}
        {step === 4 && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>🚀 Ready to Publish?</div>

              {/* Summary */}
              <div style={{ background: "#0d1117", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 80, height: 110, background: "#21262d", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>📽️</div>
                  <div>
                    <div style={{ fontWeight: 800, color: "#e6edf3", fontSize: "1.1rem" }}>{form.title || "Untitled"}</div>
                    <div style={{ color: "#8b949e", fontSize: "0.82rem", marginTop: 4 }}>{form.tagline}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ background: "#21262d", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", color: "#c9d1d9" }}>{form.film_type}</span>
                      <span style={{ background: "#21262d", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", color: "#c9d1d9" }}>{form.genre}</span>
                      <span style={{ background: "#21262d", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", color: "#c9d1d9" }}>{form.rating}</span>
                      {form.runtime_minutes && <span style={{ background: "#21262d", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", color: "#c9d1d9" }}>{form.runtime_minutes} min</span>}
                      <span style={{ background: "rgba(0,255,200,0.1)", color: "#00ffc8", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem" }}>{form.pricing_model}</span>
                    </div>
                    <div style={{ color: "#8b949e", fontSize: "0.75rem", marginTop: 8 }}>
                      {credits.length} credits · {form.tags.length} tags · {form.laurels.length} laurels
                    </div>
                  </div>
                </div>
              </div>

              {/* Festival submission for short films */}
              {["short", "animation", "experimental"].includes(form.film_type) && (
                <div style={{ background: "rgba(255,167,38,0.08)", border: "1px solid rgba(255,167,38,0.3)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={submitFestival} onChange={e => setSubmitFestival(e.target.checked)} />
                    <span style={{ fontWeight: 700, color: "#ffa726" }}>🏆 Submit to this month's Film Festival</span>
                  </label>
                  {submitFestival && (
                    <div style={{ marginTop: 12 }}>
                      <label style={S.label}>Category</label>
                      <select style={S.select} value={festivalCategory} onChange={e => setFestivalCategory(e.target.value)}>
                        {FESTIVAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  )}
                  <p style={{ color: "#8b949e", fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>
                    Community votes each month. Winners get featured on the homepage.
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <button style={S.btnGray} onClick={() => {
                  update("is_published", false);
                  saveBasicInfo();
                  setStatus("✅ Saved as draft");
                }} disabled={saving}>
                  💾 Save as Draft
                </button>
                <button style={S.btnTeal} onClick={handlePublish} disabled={saving || !filmId}>
                  {saving ? "Publishing..." : "🚀 Publish Film"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <button style={S.btnGray} onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}>
            ← Back
          </button>
          {step < 4 && (
            <button style={S.btnTeal} onClick={handleNext} disabled={saving}>
              {saving ? "Saving..." : "Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilmUploadForm;
