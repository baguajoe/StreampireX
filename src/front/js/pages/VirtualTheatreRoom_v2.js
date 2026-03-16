// =============================================================================
// VirtualTheatreRoom.js — Virtual Screening Room with Synchronized Playback
// =============================================================================
// Location: src/front/js/pages/VirtualTheatreRoom.js
// Route:    /screening/:id
//
// HOW IT WORKS:
//   - Filmmaker (host) controls playback — play, pause, seek
//   - All viewers are synced in real-time via socket events
//   - Viewers CANNOT control the video (locked controls)
//   - Live chat for everyone
//   - Q&A mode after film ends
//   - Late joiners sync to current timestamp automatically
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const getToken    = () => localStorage.getItem("token") || sessionStorage.getItem("token");
const getHeaders  = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const S = {
  page:       { minHeight: "100vh", background: "#050a12", color: "#c9d1d9", fontFamily: "Inter, sans-serif" },
  layout:     { display: "grid", gridTemplateColumns: "1fr 340px", height: "100vh", overflow: "hidden" },
  mainCol:    { display: "flex", flexDirection: "column", overflow: "hidden" },
  sideCol:    { background: "#0d1117", borderLeft: "1px solid #1a2332", display: "flex", flexDirection: "column", overflow: "hidden" },
  topBar:     { background: "#0d1117", borderBottom: "1px solid #1a2332", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 },
  screenArea: { flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  video:      { width: "100%", height: "100%", objectFit: "contain" },
  overlay:    { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, background: "rgba(0,0,0,0.85)", zIndex: 2 },
  controls:   { background: "#0d1117", borderTop: "1px solid #1a2332", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 },
  sideHeader: { padding: "14px 16px", borderBottom: "1px solid #1a2332", flexShrink: 0 },
  sideTabs:   { display: "flex", borderBottom: "1px solid #1a2332", flexShrink: 0 },
  sideTab:    (a) => ({ flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, border: "none", background: "none", color: a ? "#00ffc8" : "#8b949e", borderBottom: a ? "2px solid #00ffc8" : "2px solid transparent" }),
  chatArea:   { flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 },
  chatMsg:    { display: "flex", gap: 8, alignItems: "flex-start" },
  chatAvatar: { width: 28, height: 28, borderRadius: "50%", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", flexShrink: 0 },
  chatName:   { fontSize: "0.72rem", fontWeight: 700, color: "#00ffc8", marginBottom: 2 },
  chatNameHost: { fontSize: "0.72rem", fontWeight: 700, color: "#ffd700", marginBottom: 2 },
  chatText:   { fontSize: "0.82rem", color: "#c9d1d9", lineHeight: 1.4 },
  chatInput:  { display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid #1a2332", flexShrink: 0 },
  chatField:  { flex: 1, background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "8px 12px", fontSize: "0.82rem", fontFamily: "inherit", outline: "none" },
  sendBtn:    { background: "#00ffc8", color: "#000", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" },
  btnTeal:    { background: "#00ffc8", color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" },
  btnGray:    { background: "#21262d", color: "#c9d1d9", border: "1px solid #30363d", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" },
  btnRed:     { background: "#ff4757", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" },
  controlBtn: (active) => ({ background: active ? "#00ffc8" : "#21262d", color: active ? "#000" : "#c9d1d9", border: "1px solid #30363d", borderRadius: 6, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" }),
  liveChip:   { background: "#ff4757", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 800 },
  syncChip:   { background: "rgba(0,255,200,0.15)", color: "#00ffc8", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 },
  qaChip:     { background: "rgba(167,139,250,0.2)", color: "#a78bfa", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 },
  countdown:  { fontSize: "2.5rem", fontWeight: 800, color: "#00ffc8", fontVariantNumeric: "tabular-nums" },
  qaCard:     { background: "#21262d", borderRadius: 8, padding: 12, marginBottom: 8 },
  announce:   { background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 6, padding: "8px 12px", fontSize: "0.8rem", color: "#ffd700", marginBottom: 8 },
  progressBar:{ height: 4, background: "#21262d", cursor: "pointer", position: "relative" },
  progress:   (pct) => ({ height: "100%", width: `${pct}%`, background: "#00ffc8", transition: "width 0.5s linear" }),
  viewerChip: { background: "#21262d", color: "#8b949e", borderRadius: 4, padding: "2px 8px", fontSize: "0.72rem" },
};

// Countdown hook
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ started: true });
      setTimeLeft({ days: Math.floor(diff/86400000), hours: Math.floor((diff%86400000)/3600000), minutes: Math.floor((diff%3600000)/60000), seconds: Math.floor((diff%60000)/1000) });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
};

const VirtualTheatreRoom = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = getToken();

  // Refs
  const videoRef   = useRef();
  const socketRef  = useRef();
  const chatRef    = useRef();
  const isSeeking  = useRef(false);

  // Screening data
  const [screening, setScreening]   = useState(null);
  const [film, setFilm]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [hasTicket, setHasTicket]   = useState(false);
  const [isHost, setIsHost]         = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isFilmStarted, setIsFilmStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]     = useState(0);
  const [isQAMode, setIsQAMode]     = useState(false);
  const [syncStatus, setSyncStatus] = useState(""); // "synced" | "syncing"

  // Room state
  const [viewerCount, setViewerCount] = useState(0);
  const [hostOnline, setHostOnline]   = useState(false);
  const [sideTab, setSideTab]         = useState("chat");

  // Chat
  const [messages, setMessages]     = useState([]);
  const [msgInput, setMsgInput]     = useState("");

  // Q&A
  const [questions, setQuestions]   = useState([]);
  const [qaInput, setQaInput]       = useState("");

  // Announcements
  const [announcement, setAnnouncement] = useState("");

  // User info
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const countdown = useCountdown(screening?.scheduled_at);

  // ── FETCH SCREENING DATA ────────────────────────────────────────────────────
  useEffect(() => {
    fetchScreening();
  }, [id]);

  const fetchScreening = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings/${id}`);
      const data = await res.json();
      setScreening(data);
      setFilm(data.film || null);

      // Check if current user is the creator/host
      if (me.id && data.creator_id === me.id) setIsHost(true);

      // Check ticket
      if (token) {
        const tRes = await fetch(`${BACKEND_URL}/api/film/screenings/${id}/has-ticket`, { headers: getHeaders() });
        if (tRes.ok) setHasTicket((await tRes.json()).has_ticket);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  // ── SOCKET CONNECTION ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!screening) return;

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    socketRef.current = socket;

    // Join the screening room
    socket.emit("join_screening", {
      screening_id: id,
      user_id:      me.id,
      username:     me.username || "Guest",
      is_host:      isHost,
    });

    // ── RECEIVE EVENTS ──────────────────────────────────────────────────────

    // Current state (on join or sync request)
    socket.on("screening_state", (data) => {
      setViewerCount(data.viewer_count || 0);
      setHostOnline(data.host_online);
      if (data.playing && videoRef.current) {
        videoRef.current.currentTime = data.timestamp;
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        setIsFilmStarted(true);
        setSyncStatus("synced");
      }
    });

    // Host pressed play
    socket.on("screening_sync_play", (data) => {
      if (!videoRef.current) return;
      setSyncStatus("syncing");
      videoRef.current.currentTime = data.timestamp;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setIsFilmStarted(true);
      setTimeout(() => setSyncStatus("synced"), 800);
    });

    // Host pressed pause
    socket.on("screening_sync_pause", (data) => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = data.timestamp;
      setIsPlaying(false);
      setSyncStatus("");
    });

    // Host seeked
    socket.on("screening_sync_seek", (data) => {
      if (!videoRef.current) return;
      isSeeking.current = true;
      videoRef.current.currentTime = data.timestamp;
      setSyncStatus("syncing");
      setTimeout(() => {
        isSeeking.current = false;
        setSyncStatus("synced");
      }, 500);
    });

    // Film ended
    socket.on("screening_film_ended", () => {
      setIsQAMode(true);
      setIsPlaying(false);
      setSideTab("qa");
      setMessages(prev => [...prev, {
        id: Date.now(), username: "🎬 System",
        text: "The film has ended. Q&A is now open!", isSystem: true,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }]);
    });

    // Host left
    socket.on("screening_host_left", () => {
      setHostOnline(false);
      setMessages(prev => [...prev, {
        id: Date.now(), username: "🎬 System",
        text: "The filmmaker has left the room.", isSystem: true,
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      }]);
    });

    // Viewer count update
    socket.on("screening_viewers_update", (data) => {
      setViewerCount(data.viewer_count || 0);
    });

    // Chat message
    socket.on("screening_chat_message", (data) => {
      setMessages(prev => [...prev, { id: Date.now(), ...data }]);
    });

    // New Q&A question
    socket.on("screening_new_question", (data) => {
      setQuestions(prev => [...prev, data]);
    });

    // Question voted
    socket.on("screening_question_voted", (data) => {
      setQuestions(prev => prev.map(q =>
        q.id === data.question_id ? { ...q, votes: q.votes + 1 } : q
      ));
    });

    // Question answered
    socket.on("screening_question_answered", (data) => {
      setQuestions(prev => prev.map(q =>
        q.id === data.question_id ? { ...q, answered: true } : q
      ));
    });

    // Announcement from host
    socket.on("screening_announcement", (data) => {
      setAnnouncement(data.message);
      setTimeout(() => setAnnouncement(""), 8000);
    });

    return () => {
      socket.emit("leave_screening", { screening_id: id });
      socket.disconnect();
    };
  }, [screening, isHost]);

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Track video time for progress bar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onLoad = () => setDuration(video.duration);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoad);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoad);
    };
  }, [isFilmStarted]);

  // ── HOST CONTROLS ───────────────────────────────────────────────────────────
  const hostPlay = () => {
    if (!videoRef.current || !isHost) return;
    const ts = videoRef.current.currentTime;
    videoRef.current.play();
    setIsPlaying(true);
    setIsFilmStarted(true);
    socketRef.current?.emit("screening_play", { screening_id: id, timestamp: ts });
    setSyncStatus("synced");
  };

  const hostPause = () => {
    if (!videoRef.current || !isHost) return;
    const ts = videoRef.current.currentTime;
    videoRef.current.pause();
    setIsPlaying(false);
    socketRef.current?.emit("screening_pause", { screening_id: id, timestamp: ts });
    setSyncStatus("");
  };

  const hostSeek = (e) => {
    if (!videoRef.current || !isHost || !duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const pct   = (e.clientX - rect.left) / rect.width;
    const ts    = pct * duration;
    videoRef.current.currentTime = ts;
    socketRef.current?.emit("screening_seek", { screening_id: id, timestamp: ts });
  };

  const hostEndFilm = () => {
    if (!isHost) return;
    videoRef.current?.pause();
    setIsPlaying(false);
    setIsQAMode(true);
    socketRef.current?.emit("screening_end", { screening_id: id });
  };

  const hostAnnounce = (msg) => {
    if (!isHost || !msg.trim()) return;
    socketRef.current?.emit("screening_announce", { screening_id: id, message: msg });
  };

  // ── CHAT ────────────────────────────────────────────────────────────────────
  const sendChat = () => {
    if (!msgInput.trim()) return;
    socketRef.current?.emit("screening_chat", {
      screening_id: id,
      username:     me.username || "Guest",
      user_id:      me.id,
      message:      msgInput.trim(),
    });
    setMsgInput("");
  };

  // ── Q&A ─────────────────────────────────────────────────────────────────────
  const submitQuestion = () => {
    if (!qaInput.trim()) return;
    socketRef.current?.emit("screening_question", {
      screening_id: id,
      username:     me.username || "Guest",
      user_id:      me.id,
      question:     qaInput.trim(),
    });
    setQaInput("");
  };

  const voteQuestion = (qId) => {
    socketRef.current?.emit("screening_vote_question", { screening_id: id, question_id: qId });
  };

  const answerQuestion = (qId) => {
    if (!isHost) return;
    socketRef.current?.emit("screening_answer_question", { screening_id: id, question_id: qId });
  };

  // ── GET TICKET ──────────────────────────────────────────────────────────────
  const handleGetTicket = async () => {
    if (!token) { navigate("/login"); return; }
    try {
      const res  = await fetch(`${BACKEND_URL}/api/film/screenings/${id}/ticket`, { method: "POST", headers: getJSONHeaders() });
      const data = await res.json();
      if (data.free) setHasTicket(true);
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {}
  };

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const screeningStarted = screening && new Date(screening.scheduled_at) <= new Date();
  const canEnter         = isHost || hasTicket || (screening && screening.ticket_price === 0);
  const progressPct      = duration ? (currentTime / duration) * 100 : 0;

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
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px }
        video::-webkit-media-controls { display: none !important; }
        video::-webkit-media-controls-enclosure { display: none !important; }
      `}</style>

      <div style={S.layout}>

        {/* ── MAIN COLUMN ── */}
        <div style={S.mainCol}>

          {/* Top Bar */}
          <div style={S.topBar}>
            <span style={{ fontWeight: 800, color: "#00ffc8", fontSize: "0.88rem" }}>🎭 StreamPireX</span>
            <span style={{ color: "#30363d" }}>|</span>
            <span style={{ fontWeight: 700, color: "#e6edf3", flex: 1, fontSize: "0.95rem" }}>
              {screening.title || film?.title || "Screening"}
            </span>
            {isFilmStarted && <span style={S.liveChip}>● LIVE</span>}
            {syncStatus === "synced" && <span style={S.syncChip}>⚡ Synced</span>}
            {syncStatus === "syncing" && <span style={{ ...S.syncChip, color: "#ffa726" }}>↻ Syncing...</span>}
            {isQAMode && <span style={S.qaChip}>Q&A OPEN</span>}
            <span style={S.viewerChip}>👁 {viewerCount} watching</span>
            {isHost && <span style={{ background: "rgba(255,215,0,0.15)", color: "#ffd700", borderRadius: 4, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 800 }}>🎬 DIRECTOR</span>}
          </div>

          {/* Announcement Banner */}
          {announcement && (
            <div style={{ background: "rgba(255,215,0,0.1)", borderBottom: "1px solid rgba(255,215,0,0.3)", padding: "8px 20px", color: "#ffd700", fontSize: "0.85rem", fontWeight: 600 }}>
              📢 {announcement}
            </div>
          )}

          {/* Screen Area */}
          <div style={S.screenArea}>
            {/* Hidden video element — always rendered so ref works */}
            <video
              ref={videoRef}
              style={{ ...S.video, display: isFilmStarted && canEnter ? "block" : "none" }}
              src={film?.film_url}
              playsInline
            >
              {film?.subtitle_url && <track kind="subtitles" src={film.subtitle_url} default />}
            </video>

            {/* Overlay — shown when not playing */}
            {(!isFilmStarted || !canEnter) && (
              <div style={S.overlay}>
                {film?.poster_url && (
                  <img src={film.poster_url} alt={film.title}
                    style={{ height: 160, borderRadius: 8, opacity: 0.5, boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }} />
                )}

                {/* Not started yet — countdown */}
                {!screeningStarted ? (
                  <>
                    <div style={{ color: "#8b949e", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: 2 }}>Screening Starts In</div>
                    {!countdown.started && (
                      <div style={{ display: "flex", gap: 20 }}>
                        {[["days", "Days"], ["hours", "Hours"], ["minutes", "Min"], ["seconds", "Sec"]].map(([key, label]) => (
                          (key === "days" && countdown.days === 0) ? null :
                          <div key={key} style={{ textAlign: "center" }}>
                            <div style={S.countdown}>{String(countdown[key] || 0).padStart(2, "0")}</div>
                            <div style={{ color: "#5a7088", fontSize: "0.7rem" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                      {new Date(screening.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {!canEnter && (
                      <button style={S.btnTeal} onClick={handleGetTicket}>
                        {screening.ticket_price === 0 ? "🎟️ Reserve Free Seat" : `🎟️ Get Ticket — $${screening.ticket_price}`}
                      </button>
                    )}
                    {canEnter && !isHost && (
                      <div style={{ color: "#00ffc8", fontWeight: 700 }}>✅ You have a ticket — waiting for the filmmaker to start</div>
                    )}
                    {isHost && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: "#ffd700", fontWeight: 700, marginBottom: 12 }}>🎬 You are the director — start when ready</div>
                        <button style={S.btnTeal} onClick={hostPlay}>▶ Start Screening for Everyone</button>
                      </div>
                    )}
                  </>
                ) : !canEnter ? (
                  <>
                    <div style={{ fontSize: "2.5rem" }}>🎟️</div>
                    <div style={{ color: "#e6edf3", fontWeight: 700 }}>Get a ticket to watch</div>
                    <button style={S.btnTeal} onClick={handleGetTicket}>
                      {screening.ticket_price === 0 ? "Reserve Free Seat" : `Buy Ticket — $${screening.ticket_price}`}
                    </button>
                  </>
                ) : !isHost ? (
                  <>
                    <div style={{ fontSize: "2.5rem" }}>⏳</div>
                    <div style={{ color: "#e6edf3", fontWeight: 700 }}>Waiting for the filmmaker to start...</div>
                    {!hostOnline && <div style={{ color: "#8b949e", fontSize: "0.82rem" }}>The director hasn't joined yet</div>}
                  </>
                ) : (
                  <>
                    <div style={{ color: "#ffd700", fontWeight: 800, fontSize: "1.1rem" }}>🎬 Ready to screen</div>
                    <div style={{ color: "#8b949e", fontSize: "0.82rem" }}>{viewerCount} viewers are waiting</div>
                    <button style={S.btnTeal} onClick={hostPlay}>▶ Start Screening for Everyone</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar (host only — clickable to seek) */}
          {isFilmStarted && (
            <div
              style={{ ...S.progressBar, cursor: isHost ? "pointer" : "default" }}
              onClick={isHost ? hostSeek : undefined}
              title={isHost ? "Click to seek" : ""}
            >
              <div style={S.progress(progressPct)} />
            </div>
          )}

          {/* Controls Bar */}
          {isFilmStarted && canEnter && (
            <div style={S.controls}>
              {/* Host controls */}
              {isHost ? (
                <>
                  <button style={S.controlBtn(isPlaying)} onClick={isPlaying ? hostPause : hostPlay}>
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                  </button>
                  <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                    {fmtTime(currentTime)} / {fmtTime(duration)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <input
                    placeholder="📢 Send announcement..."
                    style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "6px 12px", fontSize: "0.78rem", fontFamily: "inherit", outline: "none", width: 220 }}
                    onKeyDown={e => { if (e.key === "Enter") { hostAnnounce(e.target.value); e.target.value = ""; } }}
                  />
                  {!isQAMode && (
                    <button style={S.btnRed} onClick={hostEndFilm}>
                      🎬 End Film / Start Q&A
                    </button>
                  )}
                </>
              ) : (
                /* Viewer — no controls, just info */
                <>
                  <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                    {fmtTime(currentTime)} / {fmtTime(duration)}
                  </span>
                  <div style={{ flex: 1 }} />
                  {syncStatus === "synced" && <span style={S.syncChip}>⚡ Synced with screening</span>}
                  {syncStatus === "syncing" && <span style={{ ...S.syncChip, color: "#ffa726" }}>↻ Syncing...</span>}
                  <span style={{ color: "#5a7088", fontSize: "0.75rem" }}>
                    Playback controlled by the filmmaker
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── SIDE COLUMN ── */}
        <div style={S.sideCol}>
          {/* Side Header */}
          <div style={S.sideHeader}>
            <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: "0.88rem", marginBottom: 2 }}>
              {screening.title || "Screening Room"}
            </div>
            <div style={{ color: "#5a7088", fontSize: "0.72rem" }}>
              {viewerCount} watching · {hostOnline ? "🟢 Filmmaker online" : "⚫ Filmmaker offline"}
            </div>
          </div>

          {/* Side Tabs */}
          <div style={S.sideTabs}>
            {["chat", "qa", "info"].map(tab => (
              <button key={tab} style={S.sideTab(sideTab === tab)} onClick={() => setSideTab(tab)}>
                {tab === "chat" ? "💬 Chat" : tab === "qa" ? `❓ Q&A${questions.length ? ` (${questions.length})` : ""}` : "ℹ️ Info"}
              </button>
            ))}
          </div>

          {/* ── CHAT TAB ── */}
          {sideTab === "chat" && (
            <>
              <div style={S.chatArea} ref={chatRef}>
                {messages.map(msg => (
                  <div key={msg.id} style={S.chatMsg}>
                    <div style={S.chatAvatar}>
                      {msg.is_host ? "🎬" : msg.isSystem ? "⚙️" : "👤"}
                    </div>
                    <div>
                      <div style={msg.is_host ? S.chatNameHost : msg.isSystem ? { ...S.chatName, color: "#8b949e" } : S.chatName}>
                        {msg.username} {msg.is_host && "🎬"}
                        <span style={{ color: "#3d4f61", fontSize: "0.65rem", fontWeight: 400, marginLeft: 6 }}>{msg.time || msg.timestamp}</span>
                      </div>
                      <div style={msg.isSystem ? { ...S.chatText, color: "#8b949e", fontStyle: "italic" } : S.chatText}>
                        {msg.message || msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.chatInput}>
                <input style={S.chatField} value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder={token ? "Say something..." : "Login to chat"} disabled={!token} />
                <button style={S.sendBtn} onClick={sendChat} disabled={!token}>→</button>
              </div>
            </>
          )}

          {/* ── Q&A TAB ── */}
          {sideTab === "qa" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                {!screening.has_qa && !isQAMode ? (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "#5a7088" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>❓</div>
                    No Q&A for this screening
                  </div>
                ) : questions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "#5a7088" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>💬</div>
                    {isQAMode ? "Q&A is open! Ask the filmmaker anything." : "Q&A opens after the film ends."}
                  </div>
                ) : (
                  [...questions].sort((a, b) => b.votes - a.votes).map(q => (
                    <div key={q.id} style={{ ...S.qaCard, opacity: q.answered ? 0.6 : 1 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => voteQuestion(q.id)} style={{ background: "#30363d", border: "none", borderRadius: 4, color: "#00ffc8", padding: "4px 8px", cursor: "pointer", fontSize: "0.78rem", flexShrink: 0 }}>
                          ▲ {q.votes}
                        </button>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", color: "#e6edf3", marginBottom: 4 }}>{q.question}</div>
                          <div style={{ fontSize: "0.7rem", color: "#5a7088" }}>— {q.username}</div>
                          {q.answered && <div style={{ color: "#00ffc8", fontSize: "0.7rem", marginTop: 4 }}>✅ Answered</div>}
                        </div>
                        {isHost && !q.answered && (
                          <button onClick={() => answerQuestion(q.id)} style={{ background: "rgba(0,255,200,0.1)", border: "1px solid #00ffc8", borderRadius: 4, color: "#00ffc8", padding: "4px 8px", cursor: "pointer", fontSize: "0.7rem", flexShrink: 0 }}>
                            Mark Answered
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {(screening.has_qa || isQAMode) && token && (
                <div style={S.chatInput}>
                  <input style={S.chatField} value={qaInput} onChange={e => setQaInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitQuestion()}
                    placeholder="Ask the filmmaker..." />
                  <button style={S.sendBtn} onClick={submitQuestion}>Ask</button>
                </div>
              )}
            </>
          )}

          {/* ── INFO TAB ── */}
          {sideTab === "info" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
              {film && (
                <>
                  {film.poster_url && (
                    <img src={film.poster_url} alt={film.title}
                      style={{ width: "100%", borderRadius: 8, marginBottom: 14, objectFit: "cover", maxHeight: 180 }} />
                  )}
                  <div style={{ fontWeight: 800, color: "#e6edf3", fontSize: "1rem", marginBottom: 4 }}>{film.title}</div>
                  {film.tagline && <div style={{ color: "#8b949e", fontStyle: "italic", fontSize: "0.78rem", marginBottom: 10 }}>"{film.tagline}"</div>}
                  {film.synopsis && <p style={{ color: "#c9d1d9", fontSize: "0.78rem", lineHeight: 1.6, marginBottom: 14 }}>{film.synopsis.slice(0, 200)}{film.synopsis.length > 200 ? "..." : ""}</p>}
                  <button style={{ ...S.btnGray, width: "100%", fontSize: "0.78rem", padding: "8px" }}
                    onClick={() => navigate(`/film/${film.id}`)}>
                    View Full Film Page →
                  </button>
                </>
              )}

              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, color: "#e6edf3", marginBottom: 12, fontSize: "0.82rem" }}>📅 Screening Info</div>
                {[
                  ["Date",    new Date(screening.scheduled_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })],
                  ["Time",    new Date(screening.scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })],
                  ["Tickets", screening.ticket_price === 0 ? "Free" : `$${screening.ticket_price}`],
                  ["Seats",   screening.capacity ? `${screening.sold_count}/${screening.capacity}` : "Unlimited"],
                  ["Q&A",     screening.has_qa ? "Yes — after screening" : "No"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #21262d", fontSize: "0.75rem" }}>
                    <span style={{ color: "#5a7088" }}>{label}</span>
                    <span style={{ color: "#e6edf3" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualTheatreRoom;
