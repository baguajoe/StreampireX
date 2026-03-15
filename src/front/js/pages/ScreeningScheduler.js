// =============================================================================
// ScreeningScheduler.js — Schedule a Film Screening for StreamPireX
// =============================================================================
// Location: src/front/js/pages/ScreeningScheduler.js
// Route:    /screening-scheduler
// =============================================================================

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders  = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const S = {
  page:      { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "Inter, sans-serif", padding: "32px 24px" },
  wrap:      { maxWidth: 800, margin: "0 auto" },
  header:    { marginBottom: 32 },
  title:     { fontSize: "1.6rem", fontWeight: 800, color: "#e6edf3", margin: "0 0 6px" },
  subtitle:  { color: "#8b949e", fontSize: "0.88rem" },
  card:      { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: "0.95rem", fontWeight: 700, color: "#e6edf3", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 },
  label:     { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#8b949e", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" },
  input:     { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  textarea:  { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 80, resize: "vertical" },
  select:    { width: "100%", background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "10px 12px", fontSize: "0.88rem", fontFamily: "inherit", outline: "none" },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  btnTeal:   { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" },
  btnGray:   { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "12px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  filmPick:  { background: "#21262d", border: "1px solid #30363d", borderRadius: 8, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 8, transition: "border-color 0.15s" },
  badge:     (c) => ({ background: `${c}22`, color: c, borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }),
  previewCard:{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 10, padding: 20, position: "sticky", top: 20 },
  tip:       { background: "rgba(0,255,200,0.05)", border: "1px solid rgba(0,255,200,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.78rem", color: "#8b949e", marginTop: 12 },
  screenItem:{ background: "#21262d", borderRadius: 8, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
};

const ScreeningScheduler = () => {
  const navigate = useNavigate();
  const token    = getToken();

  const [myFilms, setMyFilms]         = useState([]);
  const [myScreenings, setMyScreenings] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [status, setStatus]           = useState("");
  const [showForm, setShowForm]       = useState(false);

  const [form, setForm] = useState({
    film_id:          "",
    title:            "",
    description:      "",
    scheduled_at:     "",
    duration_minutes: "",
    ticket_price:     "0",
    capacity:         "",
    has_qa:           false,
  });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchMyFilms();
    fetchMyScreenings();
  }, []);

  const fetchMyFilms = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/films/my`, { headers: getHeaders() });
      const data = await res.json();
      setMyFilms(Array.isArray(data) ? data.filter(f => f.is_published) : []);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const fetchMyScreenings = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings/my`, { headers: getHeaders() });
      const data = await res.json();
      setMyScreenings(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSubmit = async () => {
    if (!form.film_id) { setStatus("⚠ Please select a film"); return; }
    if (!form.scheduled_at) { setStatus("⚠ Please set a date and time"); return; }

    const scheduledDate = new Date(form.scheduled_at);
    if (scheduledDate <= new Date()) { setStatus("⚠ Screening must be in the future"); return; }

    setSaving(true);
    setStatus("");
    try {
      const payload = {
        ...form,
        film_id:          parseInt(form.film_id),
        ticket_price:     parseFloat(form.ticket_price) || 0,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        capacity:         form.capacity ? parseInt(form.capacity) : null,
      };
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings`, { method: "POST", headers: getJSONHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      setStatus("✅ Screening scheduled!");
      setShowForm(false);
      setForm({ film_id: "", title: "", description: "", scheduled_at: "", duration_minutes: "", ticket_price: "0", capacity: "", has_qa: false });
      fetchMyScreenings();
    } catch (e) {
      setStatus(`⚠ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedFilm = myFilms.find(f => f.id === parseInt(form.film_id));

  // Min datetime (now + 1 hour)
  const minDateTime = new Date(Date.now() + 3600000).toISOString().slice(0, 16);

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={S.title}>🎟️ Screening Scheduler</h1>
              <p style={S.subtitle}>Schedule virtual premiere events for your films</p>
            </div>
            <button style={S.btnTeal} onClick={() => setShowForm(s => !s)}>
              {showForm ? "✕ Cancel" : "+ Schedule Screening"}
            </button>
          </div>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <>
            {/* Film Selection */}
            <div style={S.card}>
              <div style={S.cardTitle}>📽️ Select Film</div>
              {loading ? (
                <div style={{ color: "#5a7088" }}>Loading your films...</div>
              ) : myFilms.length === 0 ? (
                <div>
                  <div style={{ color: "#8b949e", marginBottom: 14 }}>You need a published film to schedule a screening.</div>
                  <button style={S.btnTeal} onClick={() => navigate("/film-upload")}>+ Upload Film</button>
                </div>
              ) : (
                myFilms.map(f => (
                  <div key={f.id} style={{ ...S.filmPick, borderColor: form.film_id === String(f.id) ? "#00ffc8" : "#30363d" }}
                    onClick={() => {
                      update("film_id", String(f.id));
                      if (!form.title) update("title", `${f.title} — Premiere`);
                      if (!form.duration_minutes && f.runtime_minutes) update("duration_minutes", String(f.runtime_minutes));
                    }}>
                    {f.poster_url
                      ? <img src={f.poster_url} alt={f.title} style={{ width: 44, height: 60, objectFit: "cover", borderRadius: 4 }} />
                      : <div style={{ width: 44, height: 60, background: "#30363d", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>📽️</div>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem" }}>{f.title}</div>
                      <div style={{ color: "#8b949e", fontSize: "0.72rem" }}>
                        {f.genre} · {f.runtime_minutes ? `${f.runtime_minutes}m` : f.film_type}
                      </div>
                    </div>
                    {form.film_id === String(f.id) && <span style={{ color: "#00ffc8", fontSize: "1.2rem" }}>✓</span>}
                  </div>
                ))
              )}
            </div>

            {/* Screening Details */}
            <div style={S.card}>
              <div style={S.cardTitle}>📅 Screening Details</div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Screening Title</label>
                <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)}
                  placeholder="e.g. World Premiere, Director's Cut Screening" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Description</label>
                <textarea style={S.textarea} value={form.description} onChange={e => update("description", e.target.value)}
                  placeholder="Tell fans what makes this screening special..." />
              </div>

              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Date & Time *</label>
                  <input type="datetime-local" style={S.input} value={form.scheduled_at}
                    min={minDateTime} onChange={e => update("scheduled_at", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Duration (minutes)</label>
                  <input type="number" style={S.input} value={form.duration_minutes}
                    onChange={e => update("duration_minutes", e.target.value)}
                    placeholder={selectedFilm?.runtime_minutes || "e.g. 90"} />
                </div>
              </div>
            </div>

            {/* Ticketing */}
            <div style={S.card}>
              <div style={S.cardTitle}>💰 Ticketing</div>

              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Ticket Price (USD) — 0 = Free</label>
                  <input type="number" step="0.01" min="0" style={S.input}
                    value={form.ticket_price} onChange={e => update("ticket_price", e.target.value)}
                    placeholder="0.00" />
                  {parseFloat(form.ticket_price) > 0 && (
                    <div style={{ color: "#5a7088", fontSize: "0.72rem", marginTop: 4 }}>
                      You earn ${(parseFloat(form.ticket_price) * 0.9).toFixed(2)} per ticket (90%)
                    </div>
                  )}
                </div>
                <div>
                  <label style={S.label}>Capacity (blank = unlimited)</label>
                  <input type="number" min="1" style={S.input} value={form.capacity}
                    onChange={e => update("capacity", e.target.value)} placeholder="e.g. 100" />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.has_qa} onChange={e => update("has_qa", e.target.checked)} />
                  <span style={{ fontSize: "0.88rem" }}>
                    <strong style={{ color: "#a78bfa" }}>Include Q&A session</strong>
                    <span style={{ color: "#8b949e", marginLeft: 6 }}>— Fans can submit questions during/after screening</span>
                  </span>
                </label>
              </div>

              <div style={S.tip}>
                💡 <strong>Tip:</strong> Free screenings are great for building your audience. Ticketed screenings work best for premieres and exclusive content.
              </div>
            </div>

            {/* Preview */}
            {selectedFilm && form.scheduled_at && (
              <div style={S.card}>
                <div style={S.cardTitle}>👁️ Preview</div>
                <div style={{ background: "#0d1117", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: "#e6edf3", marginBottom: 4 }}>{form.title || `${selectedFilm.title} Screening`}</div>
                  <div style={{ color: "#8b949e", fontSize: "0.82rem", marginBottom: 8 }}>
                    {new Date(form.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    {" at "}
                    {new Date(form.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={S.badge(parseFloat(form.ticket_price) > 0 ? "#ffa726" : "#00ffc8")}>
                      {parseFloat(form.ticket_price) > 0 ? `$${form.ticket_price}` : "FREE"}
                    </span>
                    {form.capacity && <span style={S.badge("#8b949e")}>{form.capacity} seats</span>}
                    {form.has_qa && <span style={S.badge("#a78bfa")}>Q&A</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {status && (
                <span style={{ color: status.startsWith("⚠") ? "#ff9500" : "#00ffc8", fontSize: "0.85rem" }}>
                  {status}
                </span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <button style={S.btnGray} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={S.btnTeal} onClick={handleSubmit} disabled={saving || myFilms.length === 0}>
                  {saving ? "Scheduling..." : "🎟️ Schedule Screening"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* My Screenings */}
        <div style={{ marginTop: showForm ? 40 : 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e6edf3", marginBottom: 16 }}>
            📅 My Screenings ({myScreenings.length})
          </div>

          {myScreenings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#5a7088", background: "#161b22", borderRadius: 10, border: "1px solid #30363d" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎟️</div>
              <div>No screenings scheduled yet.</div>
              <button style={{ ...S.btnTeal, marginTop: 16 }} onClick={() => setShowForm(true)}>
                + Schedule Your First Screening
              </button>
            </div>
          ) : (
            myScreenings.map(s => {
              const isPast     = new Date(s.scheduled_at) < new Date();
              const isUpcoming = !isPast && !s.is_live;
              return (
                <div key={s.id} style={S.screenItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.9rem", marginBottom: 4 }}>
                      {s.title}
                      {s.is_live && <span style={{ marginLeft: 8, background: "#ff4757", color: "#fff", borderRadius: 3, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 800 }}>● LIVE</span>}
                    </div>
                    <div style={{ color: "#8b949e", fontSize: "0.78rem" }}>
                      {new Date(s.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {s.ticket_price === 0 ? "Free" : `$${s.ticket_price}`}
                      {s.capacity && ` · ${s.sold_count}/${s.capacity} tickets sold`}
                      {s.has_qa && " · Q&A"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={S.badge(isPast ? "#8b949e" : s.is_live ? "#ff4757" : "#00ffc8")}>
                      {isPast ? "Completed" : s.is_live ? "LIVE" : "Upcoming"}
                    </span>
                    <button style={{ ...S.btnGray, padding: "6px 12px", fontSize: "0.78rem" }}
                      onClick={() => navigate(`/screening/${s.id}`)}>
                      View Room
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreeningScheduler;
