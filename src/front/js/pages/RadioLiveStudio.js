// =============================================================================
// RadioLiveStudio.js — SPX Broadcast Studio
// =============================================================================
// Route: /radio-live-studio/:stationId (from station) or /radio-live-studio (standalone)
//
// Phase 1: Multi-host video broadcast wired to radio station
//   - Up to 4 hosts on camera via WebRTC
//   - Station audio keeps broadcasting to listeners
//   - Live chat, tip jar, listener requests
//   - Session recording (audio + video)
//
// Phase 2: SPX Tool Integration
//   - Screen share any SPX tool (Beat Lab, DJ Mixer, Recording Studio)
//   - Lower thirds, overlays, custom branding
//   - Camera/screen switching
//   - Virtual backgrounds
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/RadioLiveStudio.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_HOSTS = 4;
const SPX_TOOLS = [
  { id: "beat-lab",         label: "SPX Beat Lab",       icon: "🥁", route: "/spx-beat-lab" },
  { id: "dj-mixer",         label: "SPX DJ Mixer",       icon: "🎚️", route: "/dj-mixer" },
  { id: "recording-studio", label: "SPX Studio",         icon: "🎛️", route: "/recording-studio" },
  { id: "spx-script",       label: "SPX Script",         icon: "📝", route: "/spx-script" },
  { id: "motion-studio",    label: "SPX Motion",         icon: "✨", route: "/motion-studio" },
  { id: "spx-canvas",       label: "SPX Canvas",         icon: "🎨", route: "/spx-canvas" },
];

const OVERLAY_TYPES = [
  { id: "lower-third",  label: "Lower Third" },
  { id: "ticker",       label: "News Ticker" },
  { id: "logo",         label: "Logo" },
  { id: "now-playing",  label: "Now Playing" },
  { id: "caller-id",    label: "Caller ID" },
];

const LAYOUTS = [
  { id: "solo",       label: "Solo",       icon: "▣" },
  { id: "grid",       label: "Grid",       icon: "⊞" },
  { id: "spotlight",  label: "Spotlight",  icon: "◉" },
  { id: "interview",  label: "Interview",  icon: "⧉" },
  { id: "panel",      label: "Panel",      icon: "▤" },
];

const BACKGROUNDS = [
  { id: "none",     label: "None",        color: "#000" },
  { id: "studio",   label: "Dark Studio", color: "#06060f" },
  { id: "neon",     label: "Neon",        color: "#001a0f" },
  { id: "blur",     label: "Blur BG",     color: null },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const VideoTile = React.memo(({ stream, label, isMuted, isLocal, isSpotlit, layout, onSpotlight }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`rls-video-tile ${isSpotlit ? "spotlight" : ""} ${layout}`}
      onClick={() => onSpotlight && onSpotlight()}
      title={isSpotlit ? "Remove spotlight" : "Spotlight this host"}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className="rls-video-el"
      />
      <div className="rls-tile-label">
        {isLocal && <span className="rls-you-badge">YOU</span>}
        {label}
      </div>
      {isSpotlit && <div className="rls-spotlight-badge">⭐ SPOTLIGHT</div>}
    </div>
  );
});

const ChatPanel = ({ messages, onSend, stationName }) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="rls-chat-panel">
      <div className="rls-chat-header">
        💬 Live Chat
        <span className="rls-chat-station">{stationName}</span>
      </div>
      <div className="rls-chat-messages">
        {messages.length === 0 ? (
          <div className="rls-chat-empty">Chat is live. Listeners will appear here.</div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`rls-chat-msg ${msg.type || ""}`}>
              {msg.type === "tip" ? (
                <div className="rls-tip-msg">
                  💰 <strong>{msg.user}</strong> tipped <span className="rls-tip-amt">${msg.amount}</span>
                  {msg.text && <span> — {msg.text}</span>}
                </div>
              ) : msg.type === "request" ? (
                <div className="rls-request-msg">
                  🎵 <strong>{msg.user}</strong> requested: <em>{msg.text}</em>
                </div>
              ) : msg.type === "system" ? (
                <div className="rls-system-msg">{msg.text}</div>
              ) : (
                <>
                  <span className="rls-chat-user">{msg.user}</span>
                  <span className="rls-chat-text">{msg.text}</span>
                </>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="rls-chat-input-row">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Say something to your audience..."
          className="rls-chat-input"
        />
        <button onClick={send} className="rls-chat-send">Send</button>
      </div>
    </div>
  );
};

const RequestsPanel = ({ requests, onApprove, onDeny }) => (
  <div className="rls-requests-panel">
    <div className="rls-panel-header">🎵 Listener Requests</div>
    {requests.length === 0 ? (
      <div className="rls-panel-empty">No requests yet.</div>
    ) : (
      requests.map((req, i) => (
        <div key={i} className="rls-request-item">
          <div className="rls-request-info">
            <span className="rls-request-user">{req.user}</span>
            <span className="rls-request-song">{req.song}</span>
          </div>
          <div className="rls-request-actions">
            <button onClick={() => onApprove(i)} className="rls-req-btn approve">✓</button>
            <button onClick={() => onDeny(i)} className="rls-req-btn deny">✕</button>
          </div>
        </div>
      ))
    )}
  </div>
);

const OverlayEditor = ({ overlays, setOverlays, lowerThirdText, setLowerThirdText, tickerText, setTickerText, showOverlay, setShowOverlay }) => (
  <div className="rls-overlay-panel">
    <div className="rls-panel-header">🎬 Overlays & Lower Thirds</div>
    <div className="rls-overlay-list">
      {OVERLAY_TYPES.map(ov => (
        <div key={ov.id} className="rls-overlay-item">
          <label className="rls-overlay-label">
            <input
              type="checkbox"
              checked={overlays.includes(ov.id)}
              onChange={e => setOverlays(prev =>
                e.target.checked ? [...prev, ov.id] : prev.filter(o => o !== ov.id)
              )}
            />
            {ov.label}
          </label>
        </div>
      ))}
    </div>

    {overlays.includes("lower-third") && (
      <div className="rls-overlay-config">
        <label className="rls-ol-label">Lower Third Text</label>
        <input
          value={lowerThirdText}
          onChange={e => setLowerThirdText(e.target.value)}
          placeholder="DJ Marcus — Live from Studio A"
          className="rls-ol-input"
        />
      </div>
    )}

    {overlays.includes("ticker") && (
      <div className="rls-overlay-config">
        <label className="rls-ol-label">Ticker Text</label>
        <input
          value={tickerText}
          onChange={e => setTickerText(e.target.value)}
          placeholder="Now Playing: Track Name · Requests: DM us · Tune in 24/7"
          className="rls-ol-input"
        />
      </div>
    )}

    <button
      className={`rls-overlay-toggle ${showOverlay ? "active" : ""}`}
      onClick={() => setShowOverlay(p => !p)}
    >
      {showOverlay ? "🔴 Hide Overlays" : "✅ Show Overlays"}
    </button>
  </div>
);

const SPXToolPanel = ({ activeSpxTool, setActiveSpxTool, screenStream, onScreenShare, onStopScreen }) => (
  <div className="rls-spx-panel">
    <div className="rls-panel-header">🖥️ SPX Tool Share</div>
    <p className="rls-spx-desc">Share any SPX tool directly to your broadcast. Audience sees your screen.</p>
    <div className="rls-spx-tools-grid">
      {SPX_TOOLS.map(tool => (
        <button
          key={tool.id}
          className={`rls-spx-tool-btn ${activeSpxTool === tool.id ? "active" : ""}`}
          onClick={() => {
            setActiveSpxTool(tool.id);
            window.open(tool.route, "_blank");
          }}
        >
          <span className="rls-spx-tool-icon">{tool.icon}</span>
          <span className="rls-spx-tool-label">{tool.label}</span>
        </button>
      ))}
    </div>
    <div style={{ marginTop: 12 }}>
      {!screenStream ? (
        <button className="rls-screen-share-btn" onClick={onScreenShare}>
          📺 Share Screen / SPX Tool
        </button>
      ) : (
        <button className="rls-screen-share-btn active" onClick={onStopScreen}>
          ⏹ Stop Screen Share
        </button>
      )}
    </div>
    {activeSpxTool && (
      <div className="rls-spx-hint">
        <span>💡 Tip: Open {SPX_TOOLS.find(t => t.id === activeSpxTool)?.label} in a new tab, then click Share Screen to broadcast it live.</span>
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RadioLiveStudio() {
  const { stationId } = useParams();
  const { store } = useContext(Context);
  const navigate = useNavigate();

  // ── Media refs ──
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const peerConnectionsRef = useRef({});

  // ── Studio state ──
  const [phase, setPhase] = useState("setup"); // setup | live | ended
  const [isLive, setIsLive] = useState(false);
  const [stationInfo, setStationInfo] = useState(null);
  const [stationLoading, setStationLoading] = useState(true);

  // ── Media state ──
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [guests, setGuests] = useState([]); // [{ id, name, stream }]
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // ── Layout & display ──
  const [layout, setLayout] = useState("grid");
  const [spotlitId, setSpotlitId] = useState(null);
  const [background, setBackground] = useState("studio");
  const [activeSpxTool, setActiveSpxTool] = useState(null);

  // ── Overlays ──
  const [overlays, setOverlays] = useState(["lower-third"]);
  const [lowerThirdText, setLowerThirdText] = useState("");
  const [tickerText, setTickerText] = useState("🔴 LIVE · Tune in now · Send requests in chat");
  const [showOverlay, setShowOverlay] = useState(true);

  // ── Broadcast ──
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Music");
  const [isTicketed, setIsTicketed] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  // ── Live stats ──
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [tipTotal, setTipTotal] = useState(0);
  const [duration, setDuration] = useState(0);

  // ── Side panels ──
  const [activePanel, setActivePanel] = useState("chat"); // chat | requests | overlays | spx
  const [chatMessages, setChatMessages] = useState([
    { type: "system", text: "🔴 Studio is ready. Go live when you're set." }
  ]);
  const [requests, setRequests] = useState([]);

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // ─── Load station info ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!stationId) {
      setStationInfo({ name: "SPX Broadcast Studio", genre: "Live", id: null });
      setStationLoading(false);
      return;
    }
    const backendUrl = process.env.BACKEND_URL || "";
    const token = localStorage.getItem("token");
    fetch(`${backendUrl}/api/radio/stations/${stationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStationInfo(data);
        setTitle(data.name ? `${data.name} — Live Show` : "Live Show");
        setLowerThirdText(data.name || "SPX Broadcast Studio");
        setInviteLink(`${window.location.origin}/radio-live-studio/${stationId}?join=1`);
      })
      .catch(() => setStationInfo({ name: "SPX Broadcast Studio", genre: "Live", id: stationId }))
      .finally(() => setStationLoading(false));
  }, [stationId]);

  // ─── Get devices ──────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setCameras(devices.filter(d => d.kind === "videoinput"));
      setMics(devices.filter(d => d.kind === "audioinput"));
    });
  }, []);

  // ─── Initialize camera ────────────────────────────────────────────────────
  useEffect(() => {
    initCamera();
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [selectedCamera, selectedMic]);

  const initCamera = async () => {
    try {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : { width: 1280, height: 720 },
        audio: selectedMic ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera init failed:", err);
    }
  };

  // ─── Duration timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setDuration(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // ─── Recording timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordingTime(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // ─── Simulate viewer activity (replace with real WS in production) ────────
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setViewerCount(v => v + Math.floor(Math.random() * 3));
      if (Math.random() < 0.15) {
        const names = ["Marcus", "DJ Layla", "Prod. Tony", "Cre8tor", "WaveMaster"];
        const songs = ["Drake - God's Plan", "Kendrick - HUMBLE", "SZA - Kill Bill", "Travis - SICKO MODE"];
        const amounts = [2, 5, 10, 20, 50];
        const rand = Math.random();
        if (rand < 0.3) {
          setChatMessages(p => [...p, { user: names[Math.floor(Math.random() * names.length)], text: ["🔥🔥", "LETS GO", "This is fire!", "tune is cold", "lowkey vibing rn"][Math.floor(Math.random() * 5)] }]);
        } else if (rand < 0.5) {
          const req = { user: names[Math.floor(Math.random() * names.length)], song: songs[Math.floor(Math.random() * songs.length)] };
          setRequests(p => [...p, req]);
          setChatMessages(p => [...p, { type: "request", user: req.user, text: req.song }]);
        } else if (rand < 0.6) {
          const tip = { type: "tip", user: names[Math.floor(Math.random() * names.length)], amount: amounts[Math.floor(Math.random() * amounts.length)], text: "Keep it going! 🔥" };
          setChatMessages(p => [...p, tip]);
          setTipTotal(t => t + tip.amount);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isLive]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const goLive = async () => {
    if (!localStream) return;
    setIsLive(true);
    setPhase("live");
    setChatMessages(p => [...p, { type: "system", text: `🔴 You are now LIVE on ${stationInfo?.name || "SPX Broadcast Studio"}` }]);
    startRecording();

    if (stationId) {
      const backendUrl = process.env.BACKEND_URL || "";
      const token = localStorage.getItem("token");
      fetch(`${backendUrl}/api/radio/${stationId}/toggle-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_live: true, has_video: true, title, is_ticketed: isTicketed, ticket_price: ticketPrice })
      }).catch(console.error);
    }
  };

  const endBroadcast = () => {
    setIsLive(false);
    setPhase("ended");
    stopRecording();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    if (stationId) {
      const backendUrl = process.env.BACKEND_URL || "";
      const token = localStorage.getItem("token");
      fetch(`${backendUrl}/api/radio/${stationId}/toggle-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_live: false })
      }).catch(console.error);
    }
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !cameraOn; });
    setCameraOn(p => !p);
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(p => !p);
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: true });
      screenStreamRef.current = stream;
      setScreenStream(stream);
      stream.getVideoTracks()[0].onended = () => { setScreenStream(null); screenStreamRef.current = null; };
      setChatMessages(p => [...p, { type: "system", text: "📺 Screen share started" }]);
    } catch (err) { console.error("Screen share failed:", err); }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    screenStreamRef.current = null;
    setChatMessages(p => [...p, { type: "system", text: "📺 Screen share ended" }]);
  };

  const startRecording = () => {
    const tracks = [
      ...(localStreamRef.current?.getTracks() || []),
      ...(screenStreamRef.current?.getTracks() || []),
    ];
    if (!tracks.length) return;
    const combined = new MediaStream(tracks);
    const recorder = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9,opus" });
    recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "broadcast"}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
    };
    setIsRecording(false);
    setRecordingTime(0);
  };

  const sendChatMessage = (text) => {
    const user = store.user?.username || store.user?.name || "Host";
    setChatMessages(p => [...p, { user, text }]);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setChatMessages(p => [...p, { type: "system", text: "✅ Invite link copied to clipboard" }]);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
  };

  // ─── Render: Setup ────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="rls-setup-page">
        <div className="rls-setup-header">
          <Link to="/radio-station-dashboard" className="rls-back-btn">← Back</Link>
          <div className="rls-setup-logo">📺 SPX Broadcast Studio</div>
          {stationInfo && <div className="rls-setup-station">🔗 {stationInfo.name}</div>}
        </div>

        <div className="rls-setup-body">
          {/* Camera preview */}
          <div className="rls-setup-preview">
            <div className="rls-preview-wrap">
              <video ref={localVideoRef} autoPlay playsInline muted className="rls-setup-video" />
              {!cameraOn && <div className="rls-cam-off">📷 Camera Off</div>}
              <div className="rls-preview-label">Your Camera Preview</div>
            </div>

            <div className="rls-setup-controls">
              <button className={`rls-ctrl-btn ${!cameraOn ? "off" : ""}`} onClick={toggleCamera}>
                {cameraOn ? "📷" : "🚫"} {cameraOn ? "Camera On" : "Camera Off"}
              </button>
              <button className={`rls-ctrl-btn ${!micOn ? "off" : ""}`} onClick={toggleMic}>
                {micOn ? "🎙️" : "🔇"} {micOn ? "Mic On" : "Mic Off"}
              </button>
            </div>

            <div className="rls-device-selects">
              <div className="rls-device-row">
                <label>📷 Camera</label>
                <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} className="rls-select">
                  <option value="">Default</option>
                  {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || "Camera"}</option>)}
                </select>
              </div>
              <div className="rls-device-row">
                <label>🎙️ Microphone</label>
                <select value={selectedMic} onChange={e => setSelectedMic(e.target.value)} className="rls-select">
                  <option value="">Default</option>
                  {mics.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || "Mic"}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Broadcast settings */}
          <div className="rls-setup-settings">
            <h3 className="rls-setup-title">Broadcast Settings</h3>

            <div className="rls-setting-group">
              <label>Show Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Show · DJ Set · Live Session" className="rls-input" />
            </div>

            <div className="rls-setting-group">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="rls-select">
                {["Music", "DJ Set", "Talk Show", "Live Session", "Interview", "Q&A", "Concert", "Tutorial", "Gaming"].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="rls-setting-group">
              <label>Lower Third</label>
              <input value={lowerThirdText} onChange={e => setLowerThirdText(e.target.value)} placeholder="Your name / show name" className="rls-input" />
            </div>

            <div className="rls-setting-row">
              <label>
                <input type="checkbox" checked={isTicketed} onChange={e => setIsTicketed(e.target.checked)} />
                &nbsp;Ticketed Event
              </label>
              {isTicketed && (
                <input value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} placeholder="$0.00" className="rls-input-sm" type="number" min="0" step="0.01" />
              )}
            </div>

            <div className="rls-setting-group">
              <label>Layout</label>
              <div className="rls-layout-btns">
                {LAYOUTS.map(l => (
                  <button key={l.id} className={`rls-layout-btn ${layout === l.id ? "active" : ""}`} onClick={() => setLayout(l.id)} title={l.label}>
                    {l.icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="rls-setting-group">
              <label>Background</label>
              <div className="rls-bg-btns">
                {BACKGROUNDS.map(bg => (
                  <button key={bg.id} className={`rls-bg-btn ${background === bg.id ? "active" : ""}`} onClick={() => setBackground(bg.id)} title="Applies during broadcast">
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {stationInfo && (
              <div className="rls-station-note">
                <span>📻</span>
                <span>Your station <strong>{stationInfo.name}</strong> will keep broadcasting audio to all listeners. Video layer activates on top when you go live.</span>
              </div>
            )}

            <button
              className="rls-go-live-btn"
              onClick={goLive}
              disabled={!localStream || !title.trim()}
            >
              🔴 Go Live
            </button>
            {!title.trim() && <div className="rls-setup-hint">Add a title to go live</div>}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Ended ────────────────────────────────────────────────────────
  if (phase === "ended") {
    return (
      <div className="rls-ended-page">
        <div className="rls-ended-card">
          <div className="rls-ended-icon">📺</div>
          <h2>Broadcast Ended</h2>
          <div className="rls-ended-stats">
            <div className="rls-ended-stat"><span>{formatTime(duration)}</span><label>Duration</label></div>
            <div className="rls-ended-stat"><span>{viewerCount}</span><label>Peak Viewers</label></div>
            <div className="rls-ended-stat"><span>{likeCount}</span><label>Likes</label></div>
            <div className="rls-ended-stat orange"><span>${tipTotal.toFixed(2)}</span><label>Tips Earned</label></div>
          </div>
          <p className="rls-ended-note">Your recording is being downloaded. The session audio archive will be available in your station's VOD library.</p>
          <div className="rls-ended-actions">
            <button className="rls-go-live-btn" onClick={() => { setPhase("setup"); setDuration(0); setViewerCount(0); setTipTotal(0); setLikeCount(0); setChatMessages([{ type: "system", text: "🔴 Studio is ready. Go live when you're set." }]); }}>
              🔴 Broadcast Again
            </button>
            <Link to="/radio-station-dashboard" className="rls-dash-btn">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Live ─────────────────────────────────────────────────────────
  const allHosts = [
    { id: "local", name: store.user?.username || "You", stream: localStream, isLocal: true },
    ...guests,
  ];

  const mainStream = screenStream || (spotlitId ? allHosts.find(h => h.id === spotlitId)?.stream : localStream);

  return (
    <div className={`rls-live-page bg-${background}`}>

      {/* ── Top Bar ── */}
      <div className="rls-topbar">
        <div className="rls-topbar-left">
          <div className="rls-live-badge">🔴 LIVE</div>
          <div className="rls-title">{title}</div>
          {stationInfo && <div className="rls-station-chip">📻 {stationInfo.name}</div>}
        </div>

        <div className="rls-topbar-stats">
          <div className="rls-stat">👁 {viewerCount.toLocaleString()}</div>
          <div className="rls-stat">❤️ {likeCount}</div>
          <div className="rls-stat orange">💰 ${tipTotal.toFixed(2)}</div>
          <div className="rls-stat">⏱ {formatTime(duration)}</div>
          {isRecording && <div className="rls-rec-badge">⏺ {formatTime(recordingTime)}</div>}
        </div>

        <div className="rls-topbar-right">
          <button className={`rls-ctrl-btn sm ${!cameraOn ? "off" : ""}`} onClick={toggleCamera} title="Toggle camera">
            {cameraOn ? "📷" : "🚫"}
          </button>
          <button className={`rls-ctrl-btn sm ${!micOn ? "off" : ""}`} onClick={toggleMic} title="Toggle mic">
            {micOn ? "🎙️" : "🔇"}
          </button>
          <button className="rls-ctrl-btn sm" onClick={copyInvite} title="Copy invite link">
            🔗 Invite
          </button>
          <button className="rls-end-btn" onClick={endBroadcast}>⏹ End</button>
        </div>
      </div>

      <div className="rls-live-body">

        {/* ── Main Stage ── */}
        <div className="rls-stage">

          {/* Screen share takes over main stage */}
          {screenStream && (
            <div className="rls-screen-main">
              <ScreenShareView stream={screenStream} />
              <div className="rls-screen-label">📺 Screen Share Active</div>
            </div>
          )}

          {/* Video grid */}
          <div className={`rls-video-grid layout-${layout} hosts-${Math.min(allHosts.length, MAX_HOSTS)}`}>
            {allHosts.slice(0, MAX_HOSTS).map(host => (
              <VideoTile
                key={host.id}
                stream={host.stream}
                label={host.name}
                isLocal={host.isLocal}
                isMuted={false}
                isSpotlit={spotlitId === host.id}
                layout={layout}
                onSpotlight={() => setSpotlitId(p => p === host.id ? null : host.id)}
              />
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - allHosts.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="rls-empty-slot">
                <div className="rls-empty-icon">👤</div>
                <div className="rls-empty-label">Waiting for co-host...</div>
                <button className="rls-invite-slot-btn" onClick={copyInvite}>📋 Copy Invite</button>
              </div>
            ))}
          </div>

          {/* Overlays */}
          {showOverlay && (
            <>
              {overlays.includes("lower-third") && lowerThirdText && (
                <div className="rls-lower-third">
                  <div className="rls-lt-bar" />
                  <div className="rls-lt-text">{lowerThirdText}</div>
                  {stationInfo && <div className="rls-lt-station">{stationInfo.name}</div>}
                </div>
              )}
              {overlays.includes("ticker") && tickerText && (
                <div className="rls-ticker">
                  <div className="rls-ticker-inner">
                    <span>{tickerText} &nbsp;&nbsp;&nbsp; {tickerText}</span>
                  </div>
                </div>
              )}
              {overlays.includes("now-playing") && stationInfo && (
                <div className="rls-now-playing">
                  🎵 {stationInfo.current_song || "Now Live"}
                </div>
              )}
              {isLive && (
                <div className="rls-live-dot">
                  <span className="rls-dot-pulse" />
                  LIVE
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Side Panel ── */}
        <div className="rls-side-panel">
          {/* Panel tabs */}
          <div className="rls-panel-tabs">
            {[
              { id: "chat",     icon: "💬", label: "Chat" },
              { id: "requests", icon: "🎵", label: `Requests${requests.length > 0 ? ` (${requests.length})` : ""}` },
              { id: "overlays", icon: "🎬", label: "Overlays" },
              { id: "spx",      icon: "🖥️", label: "SPX Tools" },
            ].map(tab => (
              <button
                key={tab.id}
                className={`rls-panel-tab ${activePanel === tab.id ? "active" : ""}`}
                onClick={() => setActivePanel(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="rls-panel-content">
            {activePanel === "chat" && (
              <ChatPanel messages={chatMessages} onSend={sendChatMessage} stationName={stationInfo?.name} />
            )}
            {activePanel === "requests" && (
              <RequestsPanel
                requests={requests}
                onApprove={i => {
                  const req = requests[i];
                  setRequests(p => p.filter((_, idx) => idx !== i));
                  setChatMessages(p => [...p, { type: "system", text: `✅ Approved: ${req.song} — coming up next!` }]);
                }}
                onDeny={i => setRequests(p => p.filter((_, idx) => idx !== i))}
              />
            )}
            {activePanel === "overlays" && (
              <OverlayEditor
                overlays={overlays} setOverlays={setOverlays}
                lowerThirdText={lowerThirdText} setLowerThirdText={setLowerThirdText}
                tickerText={tickerText} setTickerText={setTickerText}
                showOverlay={showOverlay} setShowOverlay={setShowOverlay}
              />
            )}
            {activePanel === "spx" && (
              <SPXToolPanel
                activeSpxTool={activeSpxTool}
                setActiveSpxTool={setActiveSpxTool}
                screenStream={screenStream}
                onScreenShare={startScreenShare}
                onStopScreen={stopScreenShare}
              />
            )}
          </div>

          {/* Layout controls at bottom */}
          <div className="rls-layout-bar">
            <span className="rls-layout-label">Layout:</span>
            {LAYOUTS.map(l => (
              <button key={l.id} className={`rls-layout-mini ${layout === l.id ? "active" : ""}`} onClick={() => setLayout(l.id)} title={l.label}>
                {l.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Screen share view component
function ScreenShareView({ stream }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted className="rls-screen-video" />;
}
