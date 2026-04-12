// =============================================================================
// RadioLiveViewer.js — SPX Broadcast Studio — Viewer Page
// =============================================================================
// Route: /radio-live-viewer/:stationId
// What listeners see when a station is broadcasting live video
// Features:
//   - WebRTC video stream from broadcaster
//   - Live chat (real-time via Socket.IO)
//   - Tip jar
//   - Song requests
//   - Viewer count
//   - Station info
//   - Lower thirds / overlays passthrough
// =============================================================================

import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { Context } from "../store/appContext";
import { io } from "socket.io-client";
import "../../styles/RadioLiveViewer.css";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]
};

export default function RadioLiveViewer() {
  const { stationId } = useParams();
  const { store } = useContext(Context);

  // ── Refs ──
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const chatBottomRef = useRef(null);

  // ── State ──
  const [station, setStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipMessage, setTipMessage] = useState("");
  const [tipSent, setTipSent] = useState(false);
  const [requestSong, setRequestSong] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // chat | request | tip
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const backendUrl = process.env.BACKEND_URL || "";
  const wsUrl = backendUrl.replace("https://", "wss://").replace("http://", "ws://");

  // ── Load station info ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!stationId) return;
    const token = localStorage.getItem("token");
    fetch(`${backendUrl}/api/radio/stations/${stationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStation(data);
        setIsLive(data.is_live || false);
        setChatMessages([{
          type: "system",
          text: `🔴 Welcome to ${data.name || "the live show"}!`
        }]);
      })
      .catch(() => setStreamError("Could not load station info."))
      .finally(() => setLoading(false));
  }, [stationId]);

  // ── Connect to Socket.IO signaling ─────────────────────────────────────────
  useEffect(() => {
    if (!stationId || !isLive) return;

    const socket = io(`${wsUrl}/ws/radio`, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("viewer_join", { station_id: stationId });
    });

    // Broadcaster is live — initiate WebRTC
    socket.on("broadcaster_joined", async ({ mode }) => {
      setIsLive(true);
      if (mode === "video" || mode === "audio+video") {
        await createPeerConnection(socket);
      }
    });

    socket.on("no_broadcaster", () => {
      setIsLive(false);
      setStreamError("The broadcaster has not started yet. Waiting...");
    });

    socket.on("stream_ended", () => {
      setIsLive(false);
      if (videoRef.current) videoRef.current.srcObject = null;
      setChatMessages(p => [...p, { type: "system", text: "📴 The broadcast has ended." }]);
    });

    // WebRTC signaling
    socket.on("offer", async ({ sdp }) => {
      if (!pcRef.current) await createPeerConnection(socket);
      const pc = pcRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("viewer_answer", { station_id: stationId, sdp: answer.sdp });
    });

    socket.on("ice_candidate", ({ candidate }) => {
      if (pcRef.current && candidate) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });

    // Chat
    socket.on("chat", ({ from, message, time }) => {
      setChatMessages(p => [...p, { user: from, text: message, time }]);
    });

    // Viewer count
    socket.on("viewer_count", ({ count }) => setViewerCount(count));

    // Tips
    socket.on("tip_received", ({ from, amount, message }) => {
      setChatMessages(p => [...p, { type: "tip", user: from, amount, text: message }]);
    });

    // Requests
    socket.on("request_received", ({ from, song }) => {
      setChatMessages(p => [...p, { type: "request", user: from, text: song }]);
    });

    return () => {
      socket.disconnect();
      pcRef.current?.close();
    };
  }, [stationId, isLive, wsUrl]);

  // ── Create WebRTC peer connection ──────────────────────────────────────────
  const createPeerConnection = async (socket) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setIsLive(true);
        setStreamError("");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("viewer_ice", { station_id: stationId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStreamError("Connection lost. Reconnecting...");
      }
    };

    return pc;
  };

  // ── Auto scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendChat = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    const user = store.user?.username || store.user?.name || "Listener";
    socketRef.current.emit("chat_message", {
      station_id: stationId,
      message: chatInput.trim(),
      from: user
    });
    setChatMessages(p => [...p, { user, text: chatInput.trim(), isMe: true }]);
    setChatInput("");
  };

  const sendTip = async () => {
    if (!tipAmount || isNaN(tipAmount) || parseFloat(tipAmount) <= 0) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${backendUrl}/api/radio/${stationId}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(tipAmount), message: tipMessage })
      });
      socketRef.current?.emit("chat_message", {
        station_id: stationId,
        message: `💰 Tipped $${tipAmount}${tipMessage ? ` — ${tipMessage}` : ""}`,
        from: store.user?.username || "Listener"
      });
      setTipSent(true);
      setTipAmount("");
      setTipMessage("");
      setTimeout(() => setTipSent(false), 3000);
    } catch (e) { console.error(e); }
  };

  const sendRequest = () => {
    if (!requestSong.trim() || !socketRef.current) return;
    const user = store.user?.username || store.user?.name || "Listener";
    socketRef.current.emit("chat_message", {
      station_id: stationId,
      message: `🎵 Request: ${requestSong.trim()}`,
      from: user
    });
    setChatMessages(p => [...p, { type: "request", user, text: requestSong.trim() }]);
    setRequestSent(true);
    setRequestSong("");
    setTimeout(() => setRequestSent(false), 3000);
  };

  const toggleLike = () => {
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
  };

  const toggleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (!isFullscreen) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(p => !p);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rlv-loading">
        <div className="rlv-spinner" />
        <div>Loading broadcast...</div>
      </div>
    );
  }

  return (
    <div className="rlv-page">
      {/* Header */}
      <div className="rlv-header">
        <Link to={`/radio-station/${stationId}`} className="rlv-back">← Station</Link>
        <div className="rlv-header-info">
          {isLive && <span className="rlv-live-badge">🔴 LIVE</span>}
          <span className="rlv-title">{station?.name || "Live Broadcast"}</span>
          {station?.genre && <span className="rlv-genre">{station.genre}</span>}
        </div>
        <div className="rlv-header-stats">
          <span>👁 {viewerCount.toLocaleString()}</span>
          <span>❤️ {likeCount}</span>
        </div>
      </div>

      <div className="rlv-body">
        {/* Video stage */}
        <div className="rlv-stage">
          {!isLive && !streamError && (
            <div className="rlv-offline">
              <div className="rlv-offline-icon">📻</div>
              <div className="rlv-offline-title">{station?.name}</div>
              <div className="rlv-offline-msg">This station is not currently live on video.</div>
              <Link to={`/radio-station/${stationId}`} className="rlv-listen-btn">
                🎵 Listen to Station Audio
              </Link>
            </div>
          )}

          {streamError && !isLive && (
            <div className="rlv-offline">
              <div className="rlv-offline-icon">⏳</div>
              <div className="rlv-offline-msg">{streamError}</div>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`rlv-video ${isLive ? "active" : "hidden"}`}
          />

          {/* Video controls overlay */}
          {isLive && (
            <div className="rlv-video-controls">
              <button className="rlv-vid-btn" onClick={toggleLike} title="Like">
                {liked ? "❤️" : "🤍"} {likeCount}
              </button>
              <button className="rlv-vid-btn" onClick={toggleFullscreen} title="Fullscreen">
                ⛶
              </button>
              <button className="rlv-vid-btn" onClick={() => setActiveTab("tip")} title="Send tip">
                💰 Tip
              </button>
              <button className="rlv-vid-btn" onClick={() => setActiveTab("request")} title="Request a song">
                🎵 Request
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="rlv-side">
          {/* Tabs */}
          <div className="rlv-tabs">
            {[
              { id: "chat", label: "💬 Chat" },
              { id: "request", label: "🎵 Request" },
              { id: "tip", label: "💰 Tip" },
            ].map(tab => (
              <button
                key={tab.id}
                className={`rlv-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chat */}
          {activeTab === "chat" && (
            <div className="rlv-chat">
              <div className="rlv-chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`rlv-msg ${msg.type || ""} ${msg.isMe ? "me" : ""}`}>
                    {msg.type === "tip" ? (
                      <div className="rlv-tip-msg">
                        💰 <strong>{msg.user}</strong> tipped <span className="rlv-tip-amt">${msg.amount}</span>
                        {msg.text && <span> — {msg.text}</span>}
                      </div>
                    ) : msg.type === "request" ? (
                      <div className="rlv-req-msg">
                        🎵 <strong>{msg.user}</strong> requested: <em>{msg.text}</em>
                      </div>
                    ) : msg.type === "system" ? (
                      <div className="rlv-sys-msg">{msg.text}</div>
                    ) : (
                      <>
                        <span className="rlv-msg-user">{msg.user}</span>
                        <span className="rlv-msg-text">{msg.text}</span>
                        {msg.time && <span className="rlv-msg-time">{msg.time}</span>}
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              <div className="rlv-chat-input-row">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder={store.user ? "Say something..." : "Log in to chat"}
                  disabled={!store.user}
                  className="rlv-chat-input"
                />
                <button onClick={sendChat} disabled={!store.user} className="rlv-send-btn">Send</button>
              </div>
            </div>
          )}

          {/* Request */}
          {activeTab === "request" && (
            <div className="rlv-request-panel">
              <div className="rlv-panel-title">🎵 Request a Song</div>
              <p className="rlv-panel-desc">Ask the host to play a specific track.</p>
              <input
                value={requestSong}
                onChange={e => setRequestSong(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendRequest()}
                placeholder="Artist — Song title..."
                className="rlv-input"
              />
              <button
                onClick={sendRequest}
                disabled={!store.user || requestSent}
                className="rlv-action-btn"
              >
                {requestSent ? "✅ Request Sent!" : "Send Request"}
              </button>
              {!store.user && <div className="rlv-login-note">Log in to send requests</div>}
            </div>
          )}

          {/* Tip */}
          {activeTab === "tip" && (
            <div className="rlv-tip-panel">
              <div className="rlv-panel-title">💰 Send a Tip</div>
              <p className="rlv-panel-desc">Support {station?.name || "the host"} directly. 90% goes to them.</p>
              <div className="rlv-tip-amounts">
                {["2", "5", "10", "20", "50"].map(amt => (
                  <button
                    key={amt}
                    className={`rlv-tip-preset ${tipAmount === amt ? "active" : ""}`}
                    onClick={() => setTipAmount(amt)}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <input
                value={tipAmount}
                onChange={e => setTipAmount(e.target.value)}
                placeholder="Custom amount..."
                type="number"
                min="1"
                step="0.01"
                className="rlv-input"
              />
              <input
                value={tipMessage}
                onChange={e => setTipMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                className="rlv-input"
              />
              <button
                onClick={sendTip}
                disabled={!store.user || tipSent || !tipAmount}
                className="rlv-action-btn tip"
              >
                {tipSent ? "✅ Tip Sent! 🎉" : `Send $${tipAmount || "0"} Tip`}
              </button>
              {!store.user && <div className="rlv-login-note">Log in to send tips</div>}
            </div>
          )}

          {/* Station info */}
          {station && (
            <div className="rlv-station-info">
              <div className="rlv-station-name">📻 {station.name}</div>
              {station.description && <div className="rlv-station-desc">{station.description}</div>}
              <Link to={`/radio-station/${stationId}`} className="rlv-station-link">
                View Full Station →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
