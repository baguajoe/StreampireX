// =============================================================================
// VirtualTheatreRoom.js — Virtual Screening Room for StreamPireX
// =============================================================================
// Location: src/front/js/pages/VirtualTheatreRoom.js
// Route:    /screening/:id
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders  = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const S = {
  page:       { minHeight: "100vh", background: "#050a12", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  layout:     { display: "grid", gridTemplateColumns: "1fr 340px", height: "100vh", overflow: "hidden" },
  mainCol:    { display: "flex", flexDirection: "column", overflow: "hidden" },
  sideCol:    { background: "#0d1117", borderLeft: "1px solid #1a2332", display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:     { background: "#0d1117", borderBottom: "1px solid #1a2332", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 },
  logoText:   { fontWeight: 800, color: "#00ffc8", fontSize: "0.9rem" },
  filmTitle:  { fontWeight: 700, color: "#e6edf3", fontSize: "1rem", flex: 1 },
  screenArea: { flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  video:      { width: "100%", height: "100%", objectFit: "contain" },
  overlay:    { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: "rgba(0,0,0,0.85)" },
  infoBar:    { background: "#0d1117", borderTop: "1px solid #1a2332", padding: "10px 20px", display: "flex", alignItems: "center", gap: 16 },
  badge:      (c) => ({ background: `${c}22`, color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700 }),
  sideHeader: { padding: "16px 16px 12px", borderBottom: "1px solid #1a2332" },
  sideTabs:   { display: "flex", borderBottom: "1px solid #1a2332" },
  sideTab:    (a) => ({ flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, border: "none", background: "none", color: a ? "#00ffc8" : "#8b949e", borderBottom: a ? "2px solid #00ffc8" : "2px solid transparent" }),
  chatArea:   { flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
  chatMsg:    { display: "flex", gap: 8, alignItems: "flex-start" },
  chatAvatar: { width: 28, height: 28, borderRadius: "50%", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 },
  chatName:   { fontSize: "0.72rem", fontWeight: 700, color: "#00ffc8", marginBottom: 2 },
  chatText:   { fontSize: "0.82rem", color: "#c9d1d9", lineHeight: 1.4 },
  chatInput:  { display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid #1a2332" },
  chatField:  { flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "8px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none" },
  sendBtn:    { background: "#00ffc8", color: "#000", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" },
  btnTeal:    { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" },
  btnGray:    { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "12px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.95rem" },
  card:       { background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 14, marginBottom: 10 },
  liveChip:   { background: "#ff4757", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 800, animation: "pulse 2s infinite" },
  countdown:  { fontSize: "2.5rem", fontWeight: 800, color: "#00ffc8", fontVariantNumeric: "tabular-nums" },
  qaChip:     { background: "rgba(167,139,250,0.2)", color: "#a78bfa", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 },
};

// ─────────────────────────────────────────────
// COUNTDOWN TIMER
// ─────────────────────────────────────────────
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ started: true });
      setTimeLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const VirtualTheatreRoom = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = getToken();
  const chatRef  = useRef();
  const videoRef = useRef();

  const [screening, setScreening] = useState(null);
  const [film, setFilm]           = useState(null);
  const [theatre, setTheatre]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [hasTicket, setHasTicket] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sideTab, setSideTab]     = useState("chat"); // chat | qa | info
  const [messages, setMessages]   = useState([]);
  const [questions, setQuestions] = useState([]);
  const [msgInput, setMsgInput]   = useState("");
  const [qaInput, setQaInput]     = useState("");
  const [viewers, setViewers]     = useState(0);
  const [isCreator, setIsCreator] = useState(false);

  const countdown = useCountdown(screening?.scheduled_at);

  useEffect(() => {
    fetchScreening();
  }, [id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Simulate live viewer count (replace with socket in production)
  useEffect(() => {
    if (!isPlaying) return;
    setViewers(Math.floor(Math.random() * 40) + 10);
    const t = setInterval(() => setViewers(v => Math.max(1, v + Math.floor(Math.random() * 5) - 2)), 15000);
    return () => clearInterval(t);
  }, [isPlaying]);

  const fetchScreening = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings/${id}`);
      const data = await res.json();
      setScreening(data);
      setFilm(data.film || null);

      // Check ticket
      if (token) {
        const tRes = await fetch(`${BACKEND_URL}/api/film/screenings/${id}/has-ticket`, { headers: getHeaders() });
        if (tRes.ok) setHasTicket((await tRes.json()).has_ticket);

        // Check if creator
        const me = JSON.parse(localStorage.getItem("user") || "{}");
        if (data.creator_id === me.id) setIsCreator(true);
      }

      // Pre-populate fake chat for demo feel
      setMessages([
        { id: 1, username: "FilmFan99",    text: "So excited for this premiere! 🎬", time: "8:01 PM" },
        { id: 2, username: "CinemaLover",  text: "Been waiting months for this one", time: "8:02 PM" },
        { id: 3, username: "IndieSupport", text: "Amazing work from this director 🙌", time: "8:03 PM" },
      ]);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleGetTicket = async () => {
    if (!token) { navigate("/login"); return; }
    if (screening?.ticket_price === 0) {
      // Free — just reserve
      setPurchasing(true);
      try {
        const res  = await fetch(`${BACKEND_URL}/api/film/screenings/${id}/ticket`, { method: "POST", headers: getJSONHeaders() });
        const data = await res.json();
        if (data.free) setHasTicket(true);
      } catch (e) {} finally {
        setPurchasing(false);
      }
    } else {
      setPurchasing(true);
      try {
        const res  = await fetch(`${BACKEND_URL}/api/film/screenings/${id}/ticket`, { method: "POST", headers: getJSONHeaders() });
        const data = await res.json();
        if (data.checkout_url) window.location.href = data.checkout_url;
      } catch (e) {} finally {
        setPurchasing(false);
      }
    }
  };

  const handleWatch = () => {
    if (!hasTicket && screening?.ticket_price > 0) return;
    setIsPlaying(true);
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    const me = JSON.parse(localStorage.getItem("user") || "{}");
    const msg = {
      id:       Date.now(),
      username: me.username || "Guest",
      text:     msgInput.trim(),
      time:     new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, msg]);
    setMsgInput("");
    // In production: emit via socket
  };

  const submitQuestion = () => {
    if (!qaInput.trim()) return;
    const me = JSON.parse(localStorage.getItem("user") || "{}");
    setQuestions(prev => [...prev, {
      id:       Date.now(),
      username: me.username || "Guest",
      text:     qaInput.trim(),
      votes:    0,
      answered: false,
    }]);
    setQaInput("");
  };

  const voteQuestion = (qId) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, votes: q.votes + 1 } : q));
  };

  if (loading) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#00ffc8" }}>Loading screening room...</div>
    </div>
  );

  if (!screening) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎟️</div>
        <div style={{ color: "#8b949e" }}>Screening not found</div>
        <button style={{ ...S.btnGray, marginTop: 16 }} onClick={() => navigate("/browse-films")}>Browse Films</button>
      </div>
    </div>
  );

  const screeningStarted = new Date(screening.scheduled_at) <= new Date();
  const canWatch         = hasTicket || screening.ticket_price === 0;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px }
      `}</style>

      <div style={S.layout}>
        {/* ── MAIN COLUMN ── */}
        <div style={S.mainCol}>
          {/* Top Bar */}
          <div style={S.topBar}>
            <span style={S.logoText}>StreamPireX</span>
            <span style={{ color: "#30363d" }}>|</span>
            <span style={S.filmTitle}>{screening.title || film?.title || "Screening"}</span>
            {screening.is_live && <span style={S.liveChip}>● LIVE</span>}
            {screening.has_qa && <span style={S.qaChip}>Q&A</span>}
            {isPlaying && <span style={{ color: "#8b949e", fontSize: "0.78rem" }}>👁 {viewers} watching</span>}
          </div>

          {/* Screen Area */}
          <div style={S.screenArea}>
            {isPlaying && canWatch && film?.film_url ? (
              <video
                ref={videoRef}
                controls
                autoPlay
                style={S.video}
                src={film.film_url}
              >
                {film.subtitle_url && <track kind="subtitles" src={film.subtitle_url} default />}
              </video>
            ) : (
              <div style={S.overlay}>
                {/* Poster */}
                {film?.poster_url && (
                  <img src={film.poster_url} alt={film.title} style={{ height: 180, borderRadius: 8, boxShadow: "0 4px 30px rgba(0,0,0,0.5)", opacity: 0.6 }} />
                )}

                {!screeningStarted ? (
                  <>
                    <div style={{ color: "#8b949e", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "2px" }}>Screening Starts In</div>
                    {countdown.started ? null : (
                      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                        {[
                          [countdown.days,    "Days"],
                          [countdown.hours,   "Hours"],
                          [countdown.minutes, "Min"],
                          [countdown.seconds, "Sec"],
                        ].map(([val, label]) => (
                          countdown.days === 0 && label === "Days" ? null :
                          <div key={label} style={{ textAlign: "center" }}>
                            <div style={S.countdown}>{String(val || 0).padStart(2, "0")}</div>
                            <div style={{ color: "#5a7088", fontSize: "0.7rem" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                      {new Date(screening.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {!hasTicket && screening.ticket_price > 0 && (
                      <button style={S.btnTeal} onClick={handleGetTicket} disabled={purchasing}>
                        {purchasing ? "Processing..." : `🎟️ Get Ticket — $${screening.ticket_price}`}
                      </button>
                    )}
                    {!hasTicket && screening.ticket_price === 0 && (
                      <button style={S.btnTeal} onClick={handleGetTicket} disabled={purchasing}>
                        {purchasing ? "Reserving..." : "🎟️ Reserve Free Seat"}
                      </button>
                    )}
                    {hasTicket && (
                      <div style={{ ...S.badge("#00ffc8"), fontSize: "0.85rem" }}>✅ You have a ticket — come back when the screening starts</div>
                    )}
                  </>
                ) : !canWatch ? (
                  <>
                    <div style={{ fontSize: "3rem" }}>🎟️</div>
                    <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: "1.1rem" }}>Get your ticket to watch</div>
                    <button style={S.btnTeal} onClick={handleGetTicket} disabled={purchasing}>
                      {purchasing ? "Processing..." : `Buy Ticket — $${screening.ticket_price}`}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ color: "#e6edf3", fontWeight: 700, fontSize: "1.2rem" }}>🎬 {film?.title}</div>
                    {isCreator ? (
                      <div style={{ display: "flex", gap: 12 }}>
                        <button style={S.btnTeal} onClick={handleWatch}>▶ Start Screening</button>
                      </div>
                    ) : (
                      <button style={S.btnTeal} onClick={handleWatch}>▶ Watch Now</button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info Bar */}
          <div style={S.infoBar}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem" }}>{film?.title}</span>
              {film?.genre && <span style={{ color: "#5a7088", marginLeft: 8, fontSize: "0.78rem" }}>{film.genre}</span>}
              {film?.runtime_minutes && <span style={{ color: "#5a7088", marginLeft: 8, fontSize: "0.78rem" }}>{film.runtime_minutes} min</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {screening.ticket_price === 0 ? <span style={S.badge("#00ffc8")}>FREE SCREENING</span> : <span style={S.badge("#ffa726")}>TICKETED</span>}
              {screening.has_qa && <span style={S.badge("#a78bfa")}>Q&A AFTER</span>}
              {screening.capacity && <span style={S.badge("#8b949e")}>{screening.sold_count}/{screening.capacity} seats</span>}
            </div>
            {film && (
              <button style={{ ...S.btnGray, padding: "6px 14px", fontSize: "0.78rem" }}
                onClick={() => navigate(`/film/${film.id}`)}>
                Film Details
              </button>
            )}
          </div>
        </div>

        {/* ── SIDE COLUMN ── */}
        <div style={S.sideCol}>
          {/* Side Header */}
          <div style={S.sideHeader}>
            <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.9rem", marginBottom: 2 }}>
              {screening.title || "Screening Room"}
            </div>
            <div style={{ color: "#5a7088", fontSize: "0.72rem" }}>
              {hasTicket ? "✅ You have a ticket" : screening.ticket_price === 0 ? "Free screening" : `$${screening.ticket_price} per ticket`}
            </div>
          </div>

          {/* Side Tabs */}
          <div style={S.sideTabs}>
            {["chat", "qa", "info"].map(tab => (
              <button key={tab} style={S.sideTab(sideTab === tab)} onClick={() => setSideTab(tab)}>
                {tab === "chat" ? "💬 Chat" : tab === "qa" ? "❓ Q&A" : "ℹ️ Info"}
              </button>
            ))}
          </div>

          {/* Chat Tab */}
          {sideTab === "chat" && (
            <>
              <div style={S.chatArea} ref={chatRef}>
                {messages.map(msg => (
                  <div key={msg.id} style={S.chatMsg}>
                    <div style={S.chatAvatar}>👤</div>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={S.chatName}>{msg.username}</span>
                        <span style={{ color: "#3d4f61", fontSize: "0.65rem" }}>{msg.time}</span>
                      </div>
                      <div style={S.chatText}>{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.chatInput}>
                <input
                  style={S.chatField}
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder={token ? "Say something..." : "Login to chat"}
                  disabled={!token}
                />
                <button style={S.sendBtn} onClick={sendMessage} disabled={!token}>→</button>
              </div>
            </>
          )}

          {/* Q&A Tab */}
          {sideTab === "qa" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                {!screening.has_qa ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#5a7088" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>❓</div>
                    No Q&A session for this screening
                  </div>
                ) : questions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#5a7088" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                    No questions yet. Be the first!
                  </div>
                ) : (
                  [...questions].sort((a, b) => b.votes - a.votes).map(q => (
                    <div key={q.id} style={{ ...S.card, opacity: q.answered ? 0.6 : 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <button onClick={() => voteQuestion(q.id)} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#00ffc8", padding: "4px 8px", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }}>
                          ▲ {q.votes}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.85rem", color: "#e6edf3", marginBottom: 4 }}>{q.text}</div>
                          <div style={{ fontSize: "0.72rem", color: "#5a7088" }}>Asked by {q.username}</div>
                          {q.answered && <div style={{ color: "#00ffc8", fontSize: "0.72rem", marginTop: 4 }}>✅ Answered</div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {screening.has_qa && token && (
                <div style={S.chatInput}>
                  <input style={S.chatField} value={qaInput} onChange={e => setQaInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitQuestion()}
                    placeholder="Ask the filmmaker..." />
                  <button style={S.sendBtn} onClick={submitQuestion}>Ask</button>
                </div>
              )}
            </>
          )}

          {/* Info Tab */}
          {sideTab === "info" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
              {film && (
                <>
                  {film.poster_url && (
                    <img src={film.poster_url} alt={film.title} style={{ width: "100%", borderRadius: 8, marginBottom: 14, objectFit: "cover", maxHeight: 180 }} />
                  )}
                  <div style={{ fontWeight: 800, color: "#e6edf3", fontSize: "1rem", marginBottom: 4 }}>{film.title}</div>
                  {film.tagline && <div style={{ color: "#8b949e", fontStyle: "italic", fontSize: "0.8rem", marginBottom: 12 }}>"{film.tagline}"</div>}
                  {film.synopsis && <p style={{ color: "#c9d1d9", fontSize: "0.8rem", lineHeight: 1.6, marginBottom: 14 }}>{film.synopsis}</p>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    {film.genre && <span style={{ background: "#21262d", color: "#c9d1d9", borderRadius: 4, padding: "2px 8px", fontSize: "0.72rem" }}>{film.genre}</span>}
                    {film.rating && <span style={{ background: "#21262d", color: "#c9d1d9", borderRadius: 4, padding: "2px 8px", fontSize: "0.72rem" }}>{film.rating}</span>}
                    {film.runtime_minutes && <span style={{ background: "#21262d", color: "#c9d1d9", borderRadius: 4, padding: "2px 8px", fontSize: "0.72rem" }}>{film.runtime_minutes} min</span>}
                    {film.is_sag && <span style={{ background: "rgba(255,167,38,0.15)", color: "#ffa726", borderRadius: 4, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>SAG</span>}
                  </div>
                  <button style={{ ...S.btnGray, width: "100%", justifyContent: "center", fontSize: "0.8rem", padding: "8px" }}
                    onClick={() => navigate(`/film/${film.id}`)}>
                    View Full Film Page →
                  </button>
                </>
              )}

              {/* Screening Details */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, color: "#e6edf3", marginBottom: 12, fontSize: "0.85rem" }}>📅 Screening Details</div>
                {[
                  ["Date", new Date(screening.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })],
                  ["Time", new Date(screening.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })],
                  ["Tickets", screening.ticket_price === 0 ? "Free" : `$${screening.ticket_price}`],
                  ["Seats", screening.capacity ? `${screening.sold_count}/${screening.capacity}` : "Unlimited"],
                  ["Q&A", screening.has_qa ? "Yes — after screening" : "No"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: "0.78rem" }}>
                    <span style={{ color: "#5a7088" }}>{label}</span>
                    <span style={{ color: "#e6edf3" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Get ticket CTA */}
              {!hasTicket && screeningStarted === false && (
                <button style={{ ...S.btnTeal, width: "100%", justifyContent: "center", marginTop: 20 }}
                  onClick={handleGetTicket} disabled={purchasing}>
                  {purchasing ? "Processing..." : screening.ticket_price === 0 ? "🎟️ Reserve Free Seat" : `🎟️ Get Ticket — $${screening.ticket_price}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTheatreRoom;
