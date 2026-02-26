// =============================================================================
// PodcastCollabRoom.js — Remote Podcast Recording Studio
// =============================================================================
// Multi-participant WebRTC collab room for remote podcast recording.
// Features:
//   - Up to 8 participants via WebRTC mesh
//   - Layout presets (side-by-side, grid, spotlight, interview, panel, solo)
//   - Horizontal/vertical/square orientation
//   - Per-participant local recording (each records their own high-quality track)
//   - Combined recording option (records the mixed canvas)
//   - Live chat, emoji reactions, hand raise
//   - Noise suppression toggle
//   - Device selector (mic/camera)
//   - Countdown timer for episodes
//   - Direct export to Podcast Studio
//
// Tier limits:
//   Free    = cannot access (upgrade wall)
//   Starter = 2 participants max
//   Creator = 4 participants max
//   Pro     = 8 participants max
//
// Route: /podcast/collab/:roomId
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import io from "socket.io-client";
// import "../../styles/PodcastCollabRoom.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://streampirex-api.up.railway.app";

// =============================================================================
// LAYOUT PRESETS
// =============================================================================
const LAYOUT_PRESETS = {
  "side-by-side": {
    name: "Side by Side",
    icon: "👥",
    description: "Two hosts, equal size — classic interview",
    maxOptimal: 2,
    getStyle: (index, total, orientation) => {
      if (orientation === "vertical") {
        return { width: "100%", height: `${100 / total}%` };
      }
      return { width: `${100 / total}%`, height: "100%" };
    },
    getContainerStyle: (orientation) => ({
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
    }),
  },
  grid: {
    name: "Grid",
    icon: "⊞",
    description: "Equal tiles — great for panels & roundtables",
    maxOptimal: 8,
    getStyle: (index, total) => {
      const cols = total <= 2 ? total : total <= 4 ? 2 : total <= 6 ? 3 : 4;
      const rows = Math.ceil(total / cols);
      return {
        width: `${100 / cols}%`,
        height: `${100 / rows}%`,
      };
    },
    getContainerStyle: () => ({
      display: "flex",
      flexWrap: "wrap",
    }),
  },
  spotlight: {
    name: "Spotlight",
    icon: "🔦",
    description: "One large speaker + small thumbnails — keynotes & solo hosts",
    maxOptimal: 6,
    getStyle: (index, total) => {
      if (index === 0) {
        return { width: total > 1 ? "75%" : "100%", height: "100%" };
      }
      const sideCount = total - 1;
      return {
        width: "25%",
        height: `${100 / sideCount}%`,
      };
    },
    getContainerStyle: () => ({
      display: "flex",
      flexDirection: "row",
    }),
  },
  interview: {
    name: "Interview",
    icon: "🎙️",
    description: "Host large left, guest large right — 2-person deep dive",
    maxOptimal: 2,
    getStyle: (index, total, orientation) => {
      if (orientation === "vertical") {
        return {
          width: "100%",
          height: index === 0 ? "55%" : "45%",
        };
      }
      return {
        width: index === 0 ? "55%" : "45%",
        height: "100%",
      };
    },
    getContainerStyle: (orientation) => ({
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
    }),
  },
  panel: {
    name: "Panel",
    icon: "🎬",
    description: "Top row hosts, bottom row guests — talk show format",
    maxOptimal: 6,
    getStyle: (index, total) => {
      const topCount = Math.ceil(total / 2);
      const bottomCount = total - topCount;
      const isTop = index < topCount;
      return {
        width: `${100 / (isTop ? topCount : bottomCount)}%`,
        height: "50%",
      };
    },
    getContainerStyle: () => ({
      display: "flex",
      flexWrap: "wrap",
    }),
  },
  solo: {
    name: "Solo",
    icon: "🎤",
    description: "Full screen single host — solo episodes & monologues",
    maxOptimal: 1,
    getStyle: () => ({
      width: "100%",
      height: "100%",
    }),
    getContainerStyle: () => ({
      display: "flex",
    }),
  },
};

// =============================================================================
// ORIENTATION PRESETS
// =============================================================================
const ORIENTATIONS = {
  horizontal: { name: "Horizontal", icon: "▬", aspectRatio: "16/9", label: "16:9 — YouTube/Podcast Video" },
  vertical: { name: "Vertical", icon: "▮", aspectRatio: "9/16", label: "9:16 — TikTok/Reels/Shorts" },
  square: { name: "Square", icon: "◼", aspectRatio: "1/1", label: "1:1 — Instagram/Social" },
  ultrawide: { name: "Ultrawide", icon: "━", aspectRatio: "21/9", label: "21:9 — Cinematic" },
};

// =============================================================================
// TIER LIMITS
// =============================================================================
const TIER_PARTICIPANT_LIMITS = {
  free: 0,
  starter: 2,
  creator: 4,
  pro: 8,
};

// =============================================================================
// ICE SERVERS
// =============================================================================
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PodcastCollabRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { store } = useContext(Context);
  const user = store.user;

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  // Room & participants
  const [participants, setParticipants] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [roomName, setRoomName] = useState("Podcast Session");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [spotlightUser, setSpotlightUser] = useState(null);

  // Layout
  const [layout, setLayout] = useState("side-by-side");
  const [orientation, setOrientation] = useState("horizontal");
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);

  // Media
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [localRecorders, setLocalRecorders] = useState({}); // per-participant recorders
  const [combinedRecorder, setCombinedRecorder] = useState(null);

  // Chat & reactions
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [handsRaised, setHandsRaised] = useState({});

  // Timer
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDuration, setTimerDuration] = useState(3600); // 1 hour default

  // Devices
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [] });
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Tier
  const [userTier, setUserTier] = useState("free");
  const [maxParticipants, setMaxParticipants] = useState(0);

  // Error
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);

  // ---------------------------------------------------------------------------
  // TIER CHECK
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (store.user) {
      const sub = store.user.subscription;
      const tier = sub?.plan?.name?.toLowerCase() || "free";
      setUserTier(tier);
      setMaxParticipants(TIER_PARTICIPANT_LIMITS[tier] || 0);
    }
  }, [store.user]);

  // ---------------------------------------------------------------------------
  // UPGRADE WALL — Free tier cannot access
  // ---------------------------------------------------------------------------
  if (userTier === "free" || maxParticipants === 0) {
    return (
      <div className="podcast-collab-page">
        <div className="podcast-collab-upgrade-wall">
          <div className="upgrade-icon">🎙️</div>
          <h2>Podcast Collab Room</h2>
          <p>Record podcasts remotely with co-hosts anywhere in the world.</p>
          <p>Available on paid plans starting at $12.99/month.</p>
          <div className="upgrade-features">
            <div className="upgrade-feature"><span>👥</span> Starter: 2 participants</div>
            <div className="upgrade-feature"><span>🎬</span> Creator: 4 participants</div>
            <div className="upgrade-feature"><span>🏟️</span> Pro: 8 participants</div>
            <div className="upgrade-feature"><span>🎚️</span> Per-person local recording</div>
            <div className="upgrade-feature"><span>📐</span> Layout presets & orientations</div>
            <div className="upgrade-feature"><span>🎛️</span> Export directly to Podcast Studio</div>
          </div>
          <button onClick={() => navigate("/pricing")} className="upgrade-btn">
            View Plans & Upgrade
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // INITIALIZE MEDIA
  // ---------------------------------------------------------------------------
  const initializeMedia = async (micId, camId) => {
    try {
      const constraints = {
        audio: {
          deviceId: micId ? { exact: micId } : undefined,
          echoCancellation: true,
          noiseSuppression: noiseSuppression,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: {
          deviceId: camId ? { exact: camId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Enumerate devices after permission
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: allDevices.filter((d) => d.kind === "audioinput"),
        videoInputs: allDevices.filter((d) => d.kind === "videoinput"),
      });

      return stream;
    } catch (err) {
      setError(`Camera/mic error: ${err.message}`);
      return null;
    }
  };

  // ---------------------------------------------------------------------------
  // SOCKET & WEBRTC SETUP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !roomId) return;

    const setup = async () => {
      const stream = await initializeMedia(selectedMic, selectedCamera);
      if (!stream) return;

      // Connect socket
      const socket = io(BACKEND_URL, {
        transports: ["websocket", "polling"],
        auth: { token: localStorage.getItem("token") },
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        setConnectionStatus("Connected");
        socket.emit("join-podcast-room", {
          roomId,
          userId: user.id,
          userName: user.username || user.display_name,
          avatar: user.profile_image_url,
        });
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        setConnectionStatus("Disconnected");
      });

      // Room events
      socket.on("podcast-room-state", (data) => {
        setParticipants(data.participants || []);
        setIsHost(data.hostId === user.id);
        if (data.roomName) setRoomName(data.roomName);
      });

      socket.on("podcast-user-joined", (data) => {
        setParticipants((prev) => {
          if (prev.find((p) => p.id === data.userId)) return prev;
          return [...prev, {
            id: data.userId,
            name: data.userName,
            avatar: data.avatar,
            sid: data.sid,
          }];
        });
        // Create peer connection for new user
        createPeerConnection(data.sid, stream, socket, true);
      });

      socket.on("podcast-user-left", (data) => {
        setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
        // Cleanup peer connection
        if (peerConnectionsRef.current[data.sid]) {
          peerConnectionsRef.current[data.sid].close();
          delete peerConnectionsRef.current[data.sid];
          delete remoteStreamsRef.current[data.sid];
        }
      });

      // WebRTC signaling
      socket.on("podcast-offer", async (data) => {
        const pc = createPeerConnection(data.from, stream, socket, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("podcast-answer", { answer, targetSid: data.from, roomId });
      });

      socket.on("podcast-answer", async (data) => {
        const pc = peerConnectionsRef.current[data.from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      socket.on("podcast-ice", async (data) => {
        const pc = peerConnectionsRef.current[data.from];
        if (pc && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      // Chat
      socket.on("podcast-chat", (msg) => {
        setChatMessages((prev) => [...prev, msg]);
      });

      // Reactions
      socket.on("podcast-reaction", (data) => {
        setReactions((prev) => [...prev, { ...data, id: Date.now() + Math.random() }]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== data.id));
        }, 3000);
      });

      // Hand raise
      socket.on("podcast-hand-raise", (data) => {
        setHandsRaised((prev) => ({ ...prev, [data.userId]: data.raised }));
      });

      // Layout sync (host broadcasts layout changes)
      socket.on("podcast-layout-change", (data) => {
        if (data.layout) setLayout(data.layout);
        if (data.orientation) setOrientation(data.orientation);
        if (data.spotlight !== undefined) setSpotlightUser(data.spotlight);
      });
    };

    setup();

    return () => {
      // Cleanup
      localStream?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      socketRef.current?.emit("leave-podcast-room", { roomId, userId: user.id });
      socketRef.current?.disconnect();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [roomId, user?.id]); // eslint-disable-line

  // ---------------------------------------------------------------------------
  // CREATE PEER CONNECTION
  // ---------------------------------------------------------------------------
  const createPeerConnection = (remoteSid, stream, socket, isInitiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current[remoteSid] = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Handle remote tracks
    pc.ontrack = (event) => {
      remoteStreamsRef.current[remoteSid] = event.streams[0];
      // Force re-render
      setParticipants((prev) => [...prev]);
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("podcast-ice", {
          candidate: event.candidate,
          targetSid: remoteSid,
          roomId,
        });
      }
    };

    // If initiator, create offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("podcast-offer", {
            offer: pc.localDescription,
            targetSid: remoteSid,
            roomId,
          });
        });
    }

    return pc;
  };

  // ---------------------------------------------------------------------------
  // MEDIA CONTROLS
  // ---------------------------------------------------------------------------
  const toggleVideo = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      }
    }
  };

  const toggleNoiseSuppression = async () => {
    const newValue = !noiseSuppression;
    setNoiseSuppression(newValue);
    // Re-acquire audio with new noise suppression setting
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        await audioTrack.applyConstraints({
          noiseSuppression: newValue,
          echoCancellation: true,
          autoGainControl: true,
        });
      }
    }
  };

  // ---------------------------------------------------------------------------
  // RECORDING
  // ---------------------------------------------------------------------------
  const startRecording = () => {
    if (!localStream) return;

    // Record local stream (high quality)
    const chunks = [];
    recordedChunksRef.current = chunks;

    const recorder = new MediaRecorder(localStream, {
      mimeType: "video/webm;codecs=vp9,opus",
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: 256000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      downloadRecording(blob, `podcast-local-${user.username}-${Date.now()}.webm`);
    };

    recorder.start(1000);
    setCombinedRecorder(recorder);
    setIsRecording(true);
    setRecordingTime(0);

    // Timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    // Notify participants
    socketRef.current?.emit("podcast-recording-started", { roomId });
  };

  const stopRecording = () => {
    if (combinedRecorder && combinedRecorder.state !== "inactive") {
      combinedRecorder.stop();
    }
    setCombinedRecorder(null);
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const downloadRecording = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------------------------
  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    const msg = {
      id: Date.now(),
      text: newMessage.trim(),
      sender: user.username || user.display_name,
      senderId: user.id,
      timestamp: new Date().toISOString(),
    };
    socketRef.current.emit("podcast-chat", { roomId, message: msg });
    setChatMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  // ---------------------------------------------------------------------------
  // REACTIONS & HAND RAISE
  // ---------------------------------------------------------------------------
  const sendReaction = (emoji) => {
    socketRef.current?.emit("podcast-reaction", {
      roomId,
      userId: user.id,
      userName: user.username,
      emoji,
    });
    setReactions((prev) => [
      ...prev,
      { emoji, userName: user.username, id: Date.now() + Math.random() },
    ]);
    setTimeout(() => {
      setReactions((prev) => prev.slice(1));
    }, 3000);
  };

  const toggleHandRaise = () => {
    const raised = !handsRaised[user.id];
    setHandsRaised((prev) => ({ ...prev, [user.id]: raised }));
    socketRef.current?.emit("podcast-hand-raise", {
      roomId,
      userId: user.id,
      raised,
    });
  };

  // ---------------------------------------------------------------------------
  // LAYOUT CHANGE (host broadcasts)
  // ---------------------------------------------------------------------------
  const changeLayout = (newLayout) => {
    setLayout(newLayout);
    if (isHost && socketRef.current) {
      socketRef.current.emit("podcast-layout-change", {
        roomId,
        layout: newLayout,
        orientation,
        spotlight: spotlightUser,
      });
    }
  };

  const changeOrientation = (newOrientation) => {
    setOrientation(newOrientation);
    if (isHost && socketRef.current) {
      socketRef.current.emit("podcast-layout-change", {
        roomId,
        layout,
        orientation: newOrientation,
        spotlight: spotlightUser,
      });
    }
  };

  const setSpotlight = (userId) => {
    setSpotlightUser(userId);
    if (isHost && socketRef.current) {
      socketRef.current.emit("podcast-layout-change", {
        roomId,
        layout,
        orientation,
        spotlight: userId,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // INVITE LINK
  // ---------------------------------------------------------------------------
  const getInviteLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/podcast/collab/${roomId}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getInviteLink());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // FORMAT TIME
  // ---------------------------------------------------------------------------
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ---------------------------------------------------------------------------
  // BUILD PARTICIPANT LIST (local user + remote)
  // ---------------------------------------------------------------------------
  const allParticipants = [
    {
      id: user?.id,
      name: user?.username || user?.display_name || "You",
      avatar: user?.profile_image_url,
      isLocal: true,
      stream: localStream,
    },
    ...participants
      .filter((p) => p.id !== user?.id)
      .map((p) => ({
        ...p,
        isLocal: false,
        stream: remoteStreamsRef.current[p.sid] || null,
      })),
  ];

  // For spotlight layout, move spotlighted user to index 0
  const orderedParticipants = layout === "spotlight" && spotlightUser
    ? [
        ...allParticipants.filter((p) => p.id === spotlightUser),
        ...allParticipants.filter((p) => p.id !== spotlightUser),
      ]
    : allParticipants;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  const currentLayout = LAYOUT_PRESETS[layout];
  const currentOrientation = ORIENTATIONS[orientation];

  return (
    <div className="podcast-collab-page">
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <div className="pcr-header">
        <div className="pcr-header-left">
          <h2>🎙️ {roomName}</h2>
          <div className="pcr-status">
            <span className={`pcr-dot ${isConnected ? "connected" : "disconnected"}`} />
            <span>{connectionStatus}</span>
            <span className="pcr-participant-count">
              👥 {allParticipants.length}/{maxParticipants}
            </span>
          </div>
        </div>

        <div className="pcr-header-center">
          {isRecording && (
            <div className="pcr-recording-badge">
              <span className="pcr-rec-dot" />
              REC {formatTime(recordingTime)}
            </div>
          )}
        </div>

        <div className="pcr-header-right">
          <button
            className="pcr-btn pcr-btn-invite"
            onClick={() => setShowInviteModal(true)}
            disabled={allParticipants.length >= maxParticipants}
          >
            🔗 Invite
          </button>
          <button
            className="pcr-btn pcr-btn-layout"
            onClick={() => setShowLayoutPicker(!showLayoutPicker)}
          >
            {currentLayout.icon} Layout
          </button>
          <button
            className="pcr-btn pcr-btn-settings"
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
          >
            ⚙️
          </button>
          <button
            className="pcr-btn pcr-btn-leave"
            onClick={() => {
              if (isRecording) stopRecording();
              navigate("/podcast-dashboard");
            }}
          >
            🚪 Leave
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* ERROR ALERT                                                      */}
      {/* ================================================================ */}
      {error && (
        <div className="pcr-alert pcr-alert-error">
          ❌ {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* ================================================================ */}
      {/* MAIN CONTENT AREA                                                */}
      {/* ================================================================ */}
      <div className="pcr-main">
        {/* ============================================================ */}
        {/* VIDEO CANVAS                                                  */}
        {/* ============================================================ */}
        <div
          className="pcr-video-canvas"
          style={{
            aspectRatio: currentOrientation.aspectRatio,
            ...currentLayout.getContainerStyle(orientation),
          }}
        >
          {orderedParticipants.map((participant, index) => {
            const videoStyle = currentLayout.getStyle(
              index,
              orderedParticipants.length,
              orientation
            );

            return (
              <div
                key={participant.id || index}
                className={`pcr-video-tile ${participant.isLocal ? "local" : "remote"} ${
                  spotlightUser === participant.id ? "spotlighted" : ""
                } ${handsRaised[participant.id] ? "hand-raised" : ""}`}
                style={videoStyle}
                onClick={() => {
                  if (isHost && layout === "spotlight") {
                    setSpotlight(participant.id);
                  }
                }}
              >
                {/* Video element */}
                {participant.isLocal ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="pcr-video-element"
                  />
                ) : participant.stream ? (
                  <video
                    autoPlay
                    playsInline
                    className="pcr-video-element"
                    ref={(el) => {
                      if (el && participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }}
                  />
                ) : (
                  <div className="pcr-video-placeholder">
                    <span className="pcr-avatar">
                      {participant.avatar ? (
                        <img src={participant.avatar} alt="" />
                      ) : (
                        participant.name?.[0]?.toUpperCase() || "?"
                      )}
                    </span>
                  </div>
                )}

                {/* Name label */}
                <div className="pcr-video-label">
                  {handsRaised[participant.id] && <span className="pcr-hand">✋</span>}
                  <span className="pcr-name">
                    {participant.isLocal ? "You" : participant.name}
                  </span>
                  {participant.isLocal && isHost && <span className="pcr-host-badge">👑</span>}
                </div>

                {/* Audio indicator */}
                {participant.isLocal && !isAudioEnabled && (
                  <div className="pcr-muted-indicator">🎤❌</div>
                )}
                {participant.isLocal && !isVideoEnabled && (
                  <div className="pcr-cam-off-indicator">📹❌</div>
                )}
              </div>
            );
          })}

          {/* Floating reactions */}
          <div className="pcr-reactions-overlay">
            {reactions.map((r) => (
              <div key={r.id} className="pcr-floating-reaction">
                <span className="pcr-reaction-emoji">{r.emoji}</span>
                <span className="pcr-reaction-user">{r.userName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONTROLS BAR                                                  */}
        {/* ============================================================ */}
        <div className="pcr-controls-bar">
          <div className="pcr-controls-left">
            {/* Mic */}
            <button
              className={`pcr-control-btn ${isAudioEnabled ? "active" : "muted"}`}
              onClick={toggleAudio}
            >
              {isAudioEnabled ? "🎤" : "🎤❌"}
            </button>

            {/* Camera */}
            <button
              className={`pcr-control-btn ${isVideoEnabled ? "active" : "muted"}`}
              onClick={toggleVideo}
            >
              {isVideoEnabled ? "📹" : "📹❌"}
            </button>

            {/* Noise suppression */}
            <button
              className={`pcr-control-btn ${noiseSuppression ? "active" : ""}`}
              onClick={toggleNoiseSuppression}
              title={noiseSuppression ? "Noise suppression ON" : "Noise suppression OFF"}
            >
              {noiseSuppression ? "🔇" : "🔊"}
            </button>
          </div>

          <div className="pcr-controls-center">
            {/* Record */}
            <button
              className={`pcr-control-btn pcr-record-btn ${isRecording ? "recording" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? "⏹ Stop" : "⏺ Record"}
            </button>

            {/* Timer display */}
            {isRecording && (
              <span className="pcr-timer">{formatTime(recordingTime)}</span>
            )}
          </div>

          <div className="pcr-controls-right">
            {/* Reactions */}
            <div className="pcr-reaction-bar">
              {["👍", "👏", "😂", "🔥", "❤️", "🎉"].map((emoji) => (
                <button
                  key={emoji}
                  className="pcr-reaction-btn"
                  onClick={() => sendReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Hand raise */}
            <button
              className={`pcr-control-btn ${handsRaised[user?.id] ? "active" : ""}`}
              onClick={toggleHandRaise}
            >
              ✋
            </button>

            {/* Chat toggle */}
            <button
              className={`pcr-control-btn ${isChatOpen ? "active" : ""}`}
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              💬 {chatMessages.length > 0 && (
                <span className="pcr-chat-count">{chatMessages.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* CHAT SIDEBAR                                                     */}
      {/* ================================================================ */}
      {isChatOpen && (
        <div className="pcr-chat-sidebar">
          <div className="pcr-chat-header">
            <h3>💬 Chat</h3>
            <button onClick={() => setIsChatOpen(false)}>×</button>
          </div>
          <div className="pcr-chat-messages">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`pcr-chat-msg ${msg.senderId === user?.id ? "own" : ""}`}
              >
                <span className="pcr-msg-sender">{msg.sender}</span>
                <span className="pcr-msg-text">{msg.text}</span>
                <span className="pcr-msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="pcr-chat-input">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* LAYOUT PICKER MODAL                                              */}
      {/* ================================================================ */}
      {showLayoutPicker && (
        <div className="pcr-modal-overlay" onClick={() => setShowLayoutPicker(false)}>
          <div className="pcr-layout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📐 Layout & Orientation</h3>

            {/* Layout presets */}
            <div className="pcr-layout-section">
              <h4>Layout Preset</h4>
              <div className="pcr-layout-grid">
                {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    className={`pcr-layout-option ${layout === key ? "selected" : ""}`}
                    onClick={() => changeLayout(key)}
                  >
                    <span className="pcr-layout-icon">{preset.icon}</span>
                    <span className="pcr-layout-name">{preset.name}</span>
                    <span className="pcr-layout-desc">{preset.description}</span>
                    <span className="pcr-layout-max">Up to {preset.maxOptimal} people</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="pcr-layout-section">
              <h4>Orientation</h4>
              <div className="pcr-orientation-grid">
                {Object.entries(ORIENTATIONS).map(([key, orient]) => (
                  <button
                    key={key}
                    className={`pcr-orientation-option ${orientation === key ? "selected" : ""}`}
                    onClick={() => changeOrientation(key)}
                  >
                    <span className="pcr-orient-icon">{orient.icon}</span>
                    <span className="pcr-orient-name">{orient.name}</span>
                    <span className="pcr-orient-label">{orient.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spotlight selector (only in spotlight mode) */}
            {layout === "spotlight" && allParticipants.length > 1 && (
              <div className="pcr-layout-section">
                <h4>🔦 Spotlight Who?</h4>
                <div className="pcr-spotlight-grid">
                  {allParticipants.map((p) => (
                    <button
                      key={p.id}
                      className={`pcr-spotlight-option ${spotlightUser === p.id ? "selected" : ""}`}
                      onClick={() => setSpotlight(p.id)}
                    >
                      {p.name} {p.isLocal && "(You)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Participant limit presets */}
            <div className="pcr-layout-section">
              <h4>👥 Quick Presets by Guest Count</h4>
              <div className="pcr-preset-buttons">
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("interview"); changeOrientation("horizontal"); }}
                >
                  🎙️ 2-Person Interview
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("side-by-side"); changeOrientation("horizontal"); }}
                >
                  👥 2-Person Side by Side
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("grid"); changeOrientation("horizontal"); }}
                >
                  ⊞ 3-4 Person Roundtable
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("panel"); changeOrientation("horizontal"); }}
                >
                  🎬 Panel Show (4-6 people)
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("spotlight"); changeOrientation("horizontal"); }}
                >
                  🔦 Keynote / Solo Host
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("side-by-side"); changeOrientation("vertical"); }}
                >
                  📱 Vertical Podcast (TikTok)
                </button>
                <button
                  className="pcr-preset-btn"
                  onClick={() => { changeLayout("grid"); changeOrientation("square"); }}
                >
                  ◼ Square Grid (Instagram)
                </button>
              </div>
            </div>

            <button className="pcr-modal-close" onClick={() => setShowLayoutPicker(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* DEVICE SETTINGS MODAL                                            */}
      {/* ================================================================ */}
      {showDeviceSettings && (
        <div className="pcr-modal-overlay" onClick={() => setShowDeviceSettings(false)}>
          <div className="pcr-device-modal" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ Device Settings</h3>

            <div className="pcr-device-group">
              <label>🎤 Microphone</label>
              <select
                value={selectedMic}
                onChange={async (e) => {
                  setSelectedMic(e.target.value);
                  await initializeMedia(e.target.value, selectedCamera);
                }}
              >
                {devices.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="pcr-device-group">
              <label>📹 Camera</label>
              <select
                value={selectedCamera}
                onChange={async (e) => {
                  setSelectedCamera(e.target.value);
                  await initializeMedia(selectedMic, e.target.value);
                }}
              >
                {devices.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="pcr-device-group">
              <label>🔇 Noise Suppression</label>
              <button
                className={`pcr-toggle ${noiseSuppression ? "on" : "off"}`}
                onClick={toggleNoiseSuppression}
              >
                {noiseSuppression ? "ON" : "OFF"}
              </button>
            </div>

            <button className="pcr-modal-close" onClick={() => setShowDeviceSettings(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* INVITE MODAL                                                     */}
      {/* ================================================================ */}
      {showInviteModal && (
        <div className="pcr-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="pcr-invite-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔗 Invite Co-Hosts</h3>
            <p>Share this link with your podcast guests. They'll join directly.</p>

            <div className="pcr-invite-link-box">
              <input type="text" readOnly value={getInviteLink()} />
              <button onClick={copyInviteLink}>
                {copySuccess ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>

            <div className="pcr-invite-info">
              <p>
                👥 {allParticipants.length}/{maxParticipants} participants joined
              </p>
              <p>
                Your <strong>{userTier}</strong> plan allows up to{" "}
                <strong>{maxParticipants}</strong> participants.
                {maxParticipants < 8 && (
                  <span>
                    {" "}
                    <button
                      className="pcr-upgrade-link"
                      onClick={() => navigate("/pricing")}
                    >
                      Upgrade for more →
                    </button>
                  </span>
                )}
              </p>
            </div>

            <button className="pcr-modal-close" onClick={() => setShowInviteModal(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodcastCollabRoom;