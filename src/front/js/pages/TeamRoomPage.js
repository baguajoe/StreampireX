import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { getLiveSquadStreams } from "../utils/gamerAPI";
import { Context } from "../store/appContext";
import MultiStreamSection from "../component/MultiStreamSection";
import WebRTCChat from "../component/WebRTCChat";
import GamerGate from "../component/GamerGate";
import io from "socket.io-client";
import "../../styles/TeamRoom.css";

// =====================================================
// WEBRTC CONFIG
// =====================================================
const ICE_SERVERS = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "stun:stun3.l.google.com:19302" },
    // Add TURN servers for production:
    // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "pass" }
  ],
};

// Socket connection (module-level, single instance)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  auth: { token: localStorage.getItem("token") },
  withCredentials: true,
});

const TeamRoomPage = () => {
  const { store } = useContext(Context);
  const token = store.token;
  const userId = store.user?.id;
  const userName = store.user?.username || store.user?.display_name;

  // --- Core UI State ---
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState("video-chat");

  // --- Room State ---
  const [roomId, setRoomId] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // --- Media State ---
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  // --- Participants & Roles ---
  const [userRole, setUserRole] = useState("participant");
  const [isHost, setIsHost] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState([]);
  const [roomSettings, setRoomSettings] = useState({
    allowViewers: true,
    requirePermission: false,
    maxParticipants: 8,
  });

  // --- Available Rooms Discovery ---
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showRoomBrowser, setShowRoomBrowser] = useState(false);

  // --- Refs ---
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  // Map of peerId -> { pc: RTCPeerConnection, stream: MediaStream }
  const peerConnectionsRef = useRef({});
  // Map of peerId -> ref to remote <video> element (set via callback refs)
  const remoteVideoRefs = useRef({});

  // =====================================================
  // FETCH AVAILABLE ROOMS (for discovery)
  // =====================================================
  const fetchAvailableRooms = useCallback(() => {
    socket.emit("get_room_stats");
  }, []);

  // =====================================================
  // SOCKET LISTENERS
  // =====================================================
  useEffect(() => {
    // --- Connection ---
    socket.on("connect", () => {
      console.log("✅ TeamRoom socket connected:", socket.id);
    });
    socket.on("connect_error", (err) => {
      console.error("❌ TeamRoom socket error:", err.message);
      setConnectionStatus("error");
    });

    // --- Room Stats (for room discovery) ---
    socket.on("room_stats", (stats) => {
      console.log("📊 Room stats received:", stats);
      const rooms = (stats.team_rooms || []).map((r) => ({
        roomId: r.roomId,
        userCount: r.userCount,
        users: r.users || [],
      }));
      setAvailableRooms(rooms);
    });

    // --- When another user joins ---
    socket.on("user-joined", (data) => {
      console.log("👤 User joined room:", data);

      // Update participants list
      setRoomParticipants((prev) => {
        if (prev.some((p) => p.id === data.userId)) return prev;
        return [
          ...prev,
          {
            id: data.userId,
            name: data.userName,
            sid: data.sid,
            role: "participant",
            videoEnabled: true,
            audioEnabled: true,
            joinedAt: new Date().toISOString(),
          },
        ];
      });

      // ✅ Create a peer connection and send an OFFER to the new user
      if (localStreamRef.current && data.sid) {
        createPeerAndOffer(data.sid, data.userId, data.userName);
      }
    });

    // --- Existing peers in room (sent to joiner) ---
    socket.on("webrtc-existing-peers", (data) => {
      console.log("👥 Existing peers in room:", data.peers);
      // We don't create offers here — existing peers will create offers to us
      // via the "user-joined" event they received
    });

    // --- When a user leaves ---
    socket.on("user-left", (data) => {
      console.log("👋 User left room:", data);
      const leftSid = data.sid || data.userId;

      // Close peer connection for this user
      closePeerConnection(leftSid);

      setRoomParticipants((prev) =>
        prev.filter((p) => p.sid !== leftSid && p.id !== data.userId)
      );
    });

    // --- Team room participant roster ---
    socket.on("team_room_participants", (participants) => {
      console.log("👥 Participants update:", participants);
      setRoomParticipants(participants);
    });

    // --- Role updates ---
    socket.on("role-update", (data) => {
      console.log("🔄 Role update:", data);
      if (String(data.userId) === String(userId)) {
        setUserRole(data.newRole);
        setIsHost(data.newRole === "host");
      }
      setRoomParticipants((prev) =>
        prev.map((p) =>
          String(p.id) === String(data.userId) ? { ...p, role: data.newRole } : p
        )
      );
    });

    // --- Kicked ---
    socket.on("kicked", (data) => {
      if (String(data.userId) === String(userId)) {
        alert("You have been removed from the room by the host.");
        handleLeaveCleanup();
      }
    });

    // --- Host transfer ---
    socket.on("host-transferred", (data) => {
      console.log("👑 Host transferred to:", data.newHostId);
      if (String(data.newHostId) === String(userId)) {
        setUserRole("host");
        setIsHost(true);
      }
      setRoomParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          role:
            String(p.id) === String(data.newHostId)
              ? "host"
              : p.role === "host"
              ? "participant"
              : p.role,
        }))
      );
    });

    // --- User status updates (video/audio) ---
    socket.on("user_status_update", (data) => {
      setRoomParticipants((prev) =>
        prev.map((p) => (String(p.id) === String(data.userId) ? { ...p, ...data } : p))
      );
    });

    // --- Screen share notifications ---
    socket.on("screen-share-start", (data) => {
      console.log("🖥️ Screen share started by:", data.userName);
    });
    socket.on("screen-share-stop", (data) => {
      console.log("🖥️ Screen share stopped by:", data.userId);
    });

    // =====================================================
    // WEBRTC SIGNALING — the critical part for video
    // =====================================================

    socket.on("offer", async (data) => {
      console.log("📡 Received offer from:", data.from);
      await handleIncomingOffer(data);
    });

    socket.on("answer", async (data) => {
      console.log("📡 Received answer from:", data.from);
      await handleIncomingAnswer(data);
    });

    socket.on("ice-candidate", async (data) => {
      await handleIncomingIceCandidate(data);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("room_stats");
      socket.off("user-joined");
      socket.off("webrtc-existing-peers");
      socket.off("user-left");
      socket.off("team_room_participants");
      socket.off("role-update");
      socket.off("kicked");
      socket.off("host-transferred");
      socket.off("user_status_update");
      socket.off("screen-share-start");
      socket.off("screen-share-stop");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // =====================================================
  // LOAD SQUAD STREAMS + AUTO-SET ROOM ID
  // =====================================================
  useEffect(() => {
    if (token) {
      getLiveSquadStreams(token)
        .then((data) => {
          setStreams(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching squad streams:", err);
          setLoading(false);
        });
    }

    if (store.user?.squad_id) {
      setRoomId(`squad-${store.user.squad_id}`);
    } else if (userId) {
      setRoomId(`user-${userId}-room`);
    }
  }, [token, store.user, userId]);

  // Periodically fetch available rooms when browser is open
  useEffect(() => {
    if (showRoomBrowser) {
      fetchAvailableRooms();
      const interval = setInterval(fetchAvailableRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [showRoomBrowser, fetchAvailableRooms]);

  // =====================================================
  // PEER CONNECTION HELPERS (multi-peer mesh)
  // =====================================================

  /**
   * Create a new RTCPeerConnection for a remote peer.
   * Attaches local tracks, sets up ICE + track handlers.
   */
  const createPeerConnection = useCallback(
    (remoteSid) => {
      // Don't recreate if we already have one
      if (peerConnectionsRef.current[remoteSid]?.pc) {
        const existing = peerConnectionsRef.current[remoteSid].pc;
        if (existing.connectionState !== "closed" && existing.connectionState !== "failed") {
          return existing;
        }
      }

      console.log(`🔗 Creating peer connection for: ${remoteSid}`);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to the connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // ICE candidate → relay to remote via socket
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            roomId: roomId,
            targetSid: remoteSid,
          });
        }
      };

      // Remote track received → store stream and attach to video element
      pc.ontrack = (event) => {
        console.log(`🎬 Received remote track from: ${remoteSid}`);
        const [stream] = event.streams;

        // Store the stream
        if (!peerConnectionsRef.current[remoteSid]) {
          peerConnectionsRef.current[remoteSid] = {};
        }
        peerConnectionsRef.current[remoteSid].stream = stream;

        // Attach to video element if ref exists
        const videoEl = remoteVideoRefs.current[remoteSid];
        if (videoEl) {
          videoEl.srcObject = stream;
        }

        // Force re-render to show the video
        setRoomParticipants((prev) => [...prev]);
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log(`📊 Peer ${remoteSid} state: ${pc.connectionState}`);
        if (pc.connectionState === "failed") {
          console.warn(`⚠️ Peer connection failed for ${remoteSid}, attempting restart`);
          pc.restartIce();
        }
        if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          // Clean up after a delay (might reconnect)
          setTimeout(() => {
            if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
              closePeerConnection(remoteSid);
            }
          }, 5000);
        }
      };

      pc.onicecandidateerror = (event) => {
        console.warn(`🧊 ICE error for ${remoteSid}:`, event);
      };

      // Store the pc
      if (!peerConnectionsRef.current[remoteSid]) {
        peerConnectionsRef.current[remoteSid] = {};
      }
      peerConnectionsRef.current[remoteSid].pc = pc;

      return pc;
    },
    [roomId]
  );

  /**
   * Create a peer connection for a new joiner and send them an offer.
   */
  const createPeerAndOffer = useCallback(
    async (remoteSid, remoteUserId, remoteUserName) => {
      try {
        const pc = createPeerConnection(remoteSid);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit("offer", {
          offer: offer,
          roomId: roomId,
          targetSid: remoteSid,
        });

        console.log(`📤 Sent offer to ${remoteUserName} (${remoteSid})`);
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    },
    [createPeerConnection, roomId]
  );

  /**
   * Handle an incoming offer: create PC, set remote desc, create answer.
   */
  const handleIncomingOffer = useCallback(
    async (data) => {
      const { offer, from: remoteSid } = data;
      try {
        const pc = createPeerConnection(remoteSid);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          answer: answer,
          roomId: roomId,
          targetSid: remoteSid,
        });

        console.log(`📤 Sent answer to ${remoteSid}`);
      } catch (err) {
        console.error("Error handling offer from", remoteSid, err);
      }
    },
    [createPeerConnection, roomId]
  );

  /**
   * Handle an incoming answer: set remote description on the existing PC.
   */
  const handleIncomingAnswer = useCallback(async (data) => {
    const { answer, from: remoteSid } = data;
    try {
      const peerData = peerConnectionsRef.current[remoteSid];
      if (peerData?.pc) {
        await peerData.pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ Answer applied from ${remoteSid}`);
      }
    } catch (err) {
      console.error("Error handling answer from", remoteSid, err);
    }
  }, []);

  /**
   * Handle an incoming ICE candidate.
   */
  const handleIncomingIceCandidate = useCallback(async (data) => {
    const { candidate, from: remoteSid } = data;
    try {
      const peerData = peerConnectionsRef.current[remoteSid];
      if (peerData?.pc && candidate) {
        await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      // ICE candidates can arrive before remote description is set — usually safe to ignore
      console.warn("ICE candidate error (may be harmless):", err.message);
    }
  }, []);

  /**
   * Close and clean up a peer connection.
   */
  const closePeerConnection = useCallback((remoteSid) => {
    const peerData = peerConnectionsRef.current[remoteSid];
    if (peerData) {
      if (peerData.pc) {
        peerData.pc.close();
      }
      delete peerConnectionsRef.current[remoteSid];
    }
    if (remoteVideoRefs.current[remoteSid]) {
      remoteVideoRefs.current[remoteSid].srcObject = null;
      delete remoteVideoRefs.current[remoteSid];
    }
  }, []);

  /**
   * Close ALL peer connections (room leave/cleanup).
   */
  const closeAllPeerConnections = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach((sid) => {
      closePeerConnection(sid);
    });
    peerConnectionsRef.current = {};
    remoteVideoRefs.current = {};
  }, [closePeerConnection]);

  // =====================================================
  // INITIALIZE LOCAL MEDIA
  // =====================================================
  const initializeLocalMedia = async () => {
    try {
      setConnectionStatus("connecting");

      const constraints = {
        video: isVideoEnabled
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : false,
        audio: isAudioEnabled
          ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : false,
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (videoErr) {
        console.warn("Video failed, trying audio only:", videoErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsVideoEnabled(false);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      localStreamRef.current = stream;
      setConnectionStatus("connected");
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setConnectionStatus("error");

      if (error.name === "NotAllowedError") {
        alert("Camera/microphone access denied. Please allow permissions and try again.");
      } else if (error.name === "NotFoundError") {
        alert("No camera/microphone found. Please connect a device and try again.");
      } else {
        alert("Could not access camera/microphone. Please check your device settings.");
      }
    }
  };

  // =====================================================
  // JOIN ROOM
  // =====================================================
  const joinRoom = async (targetRoomId = null) => {
    const rid = targetRoomId || roomId;
    if (!rid.trim()) {
      alert("Please enter a room ID");
      return;
    }

    if (targetRoomId) setRoomId(targetRoomId);

    await initializeLocalMedia();
    setIsInRoom(true);

    // Join WebRTC signaling room
    socket.emit("join_webrtc_room", {
      roomId: rid,
      userId: userId,
      userName: userName,
    });

    // Join team room (presence/roles)
    socket.emit("join_team_room", {
      room_id: rid,
      user_id: userId,
      user_name: userName,
      video_enabled: isVideoEnabled,
      audio_enabled: isAudioEnabled,
    });

    // Add self locally
    setRoomParticipants((prev) => {
      if (prev.some((p) => String(p.id) === String(userId))) return prev;
      return [
        ...prev,
        {
          id: userId,
          name: userName,
          role: "participant",
          videoEnabled: isVideoEnabled,
          audioEnabled: isAudioEnabled,
          joinedAt: new Date().toISOString(),
        },
      ];
    });
  };

  // =====================================================
  // LEAVE ROOM
  // =====================================================
  const handleLeaveCleanup = useCallback(() => {
    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    // Close all peer connections
    closeAllPeerConnections();

    // Stop screen share
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }

    setIsInRoom(false);
    setRoomParticipants([]);
    setConnectionStatus("disconnected");
    setUserRole("participant");
    setIsHost(false);
  }, [closeAllPeerConnections, screenStream]);

  const leaveRoom = () => {
    socket.emit("leave_webrtc_room", { roomId });
    socket.emit("leave_team_room", {
      room_id: roomId,
      user_id: userId,
      user_name: userName,
    });

    // Transfer host if leaving as host
    if (isHost && roomParticipants.length > 1) {
      const nextHost = roomParticipants.find((p) => String(p.id) !== String(userId));
      if (nextHost) {
        socket.emit("transfer-host", {
          roomId,
          newHostId: nextHost.id,
          newHostName: nextHost.name,
        });
      }
    }

    handleLeaveCleanup();
  };

  // =====================================================
  // TOGGLE VIDEO / AUDIO — update tracks + broadcast
  // =====================================================
  const toggleVideo = () => {
    if (userRole === "viewer") {
      alert("Viewers cannot enable video. Ask the host for participant access.");
      return;
    }
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socket.emit("update_video_status", {
          room_id: roomId,
          user_id: userId,
          video_enabled: videoTrack.enabled,
          audio_enabled: isAudioEnabled,
        });
      }
    }
  };

  const toggleAudio = () => {
    if (userRole === "viewer") {
      alert("Viewers cannot enable audio. Ask the host for participant access.");
      return;
    }
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socket.emit("update_video_status", {
          room_id: roomId,
          user_id: userId,
          video_enabled: isVideoEnabled,
          audio_enabled: audioTrack.enabled,
        });
      }
    }
  };

  // =====================================================
  // SCREEN SHARING
  // =====================================================
  const startScreenShare = async () => {
    if (userRole === "viewer") {
      alert("Viewers cannot share screen.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 15 } },
        audio: true,
      });

      setScreenStream(stream);
      setIsScreenSharing(true);

      // Replace the video track in all peer connections with the screen track
      const screenVideoTrack = stream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(({ pc }) => {
        if (pc) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenVideoTrack);
          }
        }
      });

      socket.emit("screen-share-start", { roomId, userId, userName });

      // When user stops sharing via browser UI
      screenVideoTrack.addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (error) {
      console.error("Error starting screen share:", error);
      if (error.name === "NotAllowedError") {
        alert("Screen sharing permission denied.");
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Restore camera video track in all peer connections
      const cameraVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraVideoTrack) {
        Object.values(peerConnectionsRef.current).forEach(({ pc }) => {
          if (pc) {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(cameraVideoTrack);
            }
          }
        });
      }

      socket.emit("screen-share-stop", { roomId, userId, userName });
    }
  };

  // =====================================================
  // HOST CONTROLS
  // =====================================================
  const promoteToParticipant = (participantId) => {
    if (!isHost) return;
    socket.emit("role-update", { roomId, userId: participantId, newRole: "participant" });
    setRoomParticipants((prev) =>
      prev.map((p) => (String(p.id) === String(participantId) ? { ...p, role: "participant" } : p))
    );
  };

  const demoteToViewer = (participantId) => {
    if (!isHost) return;
    socket.emit("role-update", { roomId, userId: participantId, newRole: "viewer" });
    setRoomParticipants((prev) =>
      prev.map((p) => (String(p.id) === String(participantId) ? { ...p, role: "viewer" } : p))
    );
  };

  const kickUser = (participantId) => {
    if (!isHost) return;
    if (window.confirm("Are you sure you want to remove this user from the room?")) {
      socket.emit("kick-user", { roomId, userId: participantId });
      setRoomParticipants((prev) => prev.filter((p) => String(p.id) !== String(participantId)));
    }
  };

  const handleCustomRoom = () => {
    const customRoomId = prompt("Enter room ID to join:");
    if (customRoomId) setRoomId(customRoomId);
  };

  // =====================================================
  // DISPLAY HELPERS
  // =====================================================
  const getUserDisplayInfo = (participant) => {
    const isCurrentUser = String(participant.id) === String(userId);
    const roleEmoji = { host: "👑", participant: "🎤", viewer: "👁️" };
    return {
      displayName: isCurrentUser ? `You (${participant.name})` : participant.name,
      roleBadge: roleEmoji[participant.role] || "👤",
      statusIndicators: [
        !participant.videoEnabled && "📹❌",
        !participant.audioEnabled && "🎤❌",
      ].filter(Boolean),
    };
  };

  // Get remote participants (everyone except self)
  const remotePeers = roomParticipants.filter((p) => String(p.id) !== String(userId));

  // =====================================================
  // CLEANUP ON UNMOUNT
  // =====================================================
  useEffect(() => {
    return () => {
      if (isInRoom) {
        socket.emit("leave_webrtc_room", { roomId });
        socket.emit("leave_team_room", { room_id: roomId, user_id: userId, user_name: userName });
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      closeAllPeerConnections();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInRoom, roomId]);

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <GamerGate featureName="Team Rooms">
      <div className="team-room-container">
        {/* HEADER */}
        <div className="team-room-header">
          <h1>🧑‍🤝‍🧑 Team Room</h1>

          <div className={`connection-status ${connectionStatus}`}>
            <span className="status-indicator"></span>
            {connectionStatus === "connected" && "Connected"}
            {connectionStatus === "connecting" && "Connecting..."}
            {connectionStatus === "disconnected" && "Disconnected"}
            {connectionStatus === "error" && "Connection Error"}
          </div>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${activeMode === "video-chat" ? "active" : ""}`}
              onClick={() => setActiveMode("video-chat")}
            >
              📹 Video Chat
            </button>
            <button
              className={`mode-btn ${activeMode === "streams" ? "active" : ""}`}
              onClick={() => setActiveMode("streams")}
            >
              📺 Squad Streams
            </button>
          </div>
        </div>

        {activeMode === "video-chat" ? (
          <div className="video-chat-section">
            {/* ROOM CONTROLS */}
            <div className="room-controls">
              <div className="room-id-section">
                <label>Room ID:</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                  disabled={isInRoom}
                />
                <button onClick={handleCustomRoom} disabled={isInRoom}>
                  🔗 Custom Room
                </button>
                <button
                  className="browse-rooms-btn"
                  onClick={() => setShowRoomBrowser(!showRoomBrowser)}
                  disabled={isInRoom}
                >
                  🔍 Browse Rooms
                </button>
              </div>

              {isInRoom && (
                <div className="role-indicator">
                  <span className={`role-badge ${userRole}`}>
                    {userRole === "host" && "👑 Host"}
                    {userRole === "participant" && "🎤 Participant"}
                    {userRole === "viewer" && "👁️ Viewer"}
                  </span>
                </div>
              )}

              {!isInRoom ? (
                <button className="join-btn" onClick={() => joinRoom()}>
                  🚪 Join Room
                </button>
              ) : (
                <button className="leave-btn" onClick={leaveRoom}>
                  🚪 Leave Room
                </button>
              )}
            </div>

            {/* AVAILABLE ROOMS BROWSER */}
            {showRoomBrowser && !isInRoom && (
              <div className="available-rooms-panel">
                <h3>🌐 Available Team Rooms</h3>
                {availableRooms.length > 0 ? (
                  <div className="rooms-list">
                    {availableRooms.map((room) => (
                      <div key={room.roomId} className="available-room-item">
                        <div className="room-item-info">
                          <span className="room-item-name">{room.roomId}</span>
                          <span className="room-item-count">
                            👥 {room.userCount} user{room.userCount !== 1 ? "s" : ""}
                          </span>
                          <div className="room-item-users">
                            {room.users.slice(0, 3).map((u, i) => (
                              <span key={i} className="room-user-tag">
                                {u.name || u.userName}
                              </span>
                            ))}
                            {room.userCount > 3 && (
                              <span className="room-user-tag more">+{room.userCount - 3} more</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="join-room-btn"
                          onClick={() => {
                            setShowRoomBrowser(false);
                            joinRoom(room.roomId);
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-rooms">
                    <p>No active rooms right now. Create one by joining!</p>
                  </div>
                )}
              </div>
            )}

            {isInRoom && (
              <>
                {/* PARTICIPANTS PANEL */}
                <div className="participants-panel">
                  <h3>👥 Participants ({roomParticipants.length})</h3>
                  <div className="participants-list">
                    {roomParticipants.map((participant) => {
                      const displayInfo = getUserDisplayInfo(participant);
                      return (
                        <div key={participant.id || participant.sid} className="participant-item">
                          <div className="participant-info">
                            <span className="participant-role">{displayInfo.roleBadge}</span>
                            <span className="participant-name">{displayInfo.displayName}</span>
                            <div className="participant-status">
                              {displayInfo.statusIndicators.map((indicator, i) => (
                                <span key={i} className="status-icon">
                                  {indicator}
                                </span>
                              ))}
                            </div>
                          </div>
                          {isHost && String(participant.id) !== String(userId) && (
                            <div className="participant-controls">
                              {participant.role === "viewer" && (
                                <button
                                  className="promote-btn"
                                  onClick={() => promoteToParticipant(participant.id)}
                                  title="Promote to Participant"
                                >
                                  ⬆️
                                </button>
                              )}
                              {participant.role === "participant" && (
                                <button
                                  className="demote-btn"
                                  onClick={() => demoteToViewer(participant.id)}
                                  title="Demote to Viewer"
                                >
                                  ⬇️
                                </button>
                              )}
                              <button
                                className="kick-btn"
                                onClick={() => kickUser(participant.id)}
                                title="Remove from Room"
                              >
                                🚪
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VIDEO CONTROLS */}
                <div className="video-controls">
                  <button
                    className={`control-btn ${isVideoEnabled ? "enabled" : "disabled"}`}
                    onClick={toggleVideo}
                    disabled={userRole === "viewer"}
                  >
                    {isVideoEnabled ? "📹" : "📹❌"} Video
                    {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                  </button>
                  <button
                    className={`control-btn ${isAudioEnabled ? "enabled" : "disabled"}`}
                    onClick={toggleAudio}
                    disabled={userRole === "viewer"}
                  >
                    {isAudioEnabled ? "🎤" : "🎤❌"} Audio
                    {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                  </button>
                  <button
                    className={`control-btn ${isScreenSharing ? "enabled" : ""}`}
                    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    disabled={userRole === "viewer"}
                  >
                    {isScreenSharing ? "🖥️ Stop Share" : "🖥️ Share Screen"}
                    {userRole === "viewer" && <span className="disabled-text">(Viewer)</span>}
                  </button>
                </div>

                {/* ===== VIDEO GRID ===== */}
                <div className={`video-grid grid-${Math.min(remotePeers.length + 1, 6)}`}>
                  {/* Local Video */}
                  <div className="video-container local-video">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="video-element"
                    />
                    <div className="video-label">
                      <span className="user-role">
                        {userRole === "host" ? "👑" : userRole === "participant" ? "🎤" : "👁️"}
                      </span>
                      You ({userName})
                      {!isVideoEnabled && <span className="video-disabled"> 📹❌</span>}
                      {!isAudioEnabled && <span className="audio-disabled"> 🎤❌</span>}
                    </div>
                  </div>

                  {/* Screen Share (local) */}
                  {isScreenSharing && screenStream && (
                    <div className="video-container screen-share">
                      <video
                        autoPlay
                        playsInline
                        className="video-element"
                        ref={(video) => {
                          if (video) video.srcObject = screenStream;
                        }}
                      />
                      <div className="video-label">🖥️ Your Screen Share</div>
                    </div>
                  )}

                  {/* ===== REMOTE PEER VIDEOS ===== */}
                  {remotePeers.map((peer) => {
                    const peerSid = peer.sid;
                    const displayInfo = getUserDisplayInfo(peer);
                    const hasStream = peerSid && peerConnectionsRef.current[peerSid]?.stream;

                    return (
                      <div
                        key={peer.id || peerSid}
                        className={`video-container remote-video ${peer.role || ""}`}
                      >
                        <video
                          autoPlay
                          playsInline
                          className="video-element"
                          ref={(videoEl) => {
                            if (videoEl && peerSid) {
                              remoteVideoRefs.current[peerSid] = videoEl;
                              // Attach stream if available
                              const peerData = peerConnectionsRef.current[peerSid];
                              if (peerData?.stream && videoEl.srcObject !== peerData.stream) {
                                videoEl.srcObject = peerData.stream;
                              }
                            }
                          }}
                        />
                        <div className="video-label">
                          <span className="user-role">{displayInfo.roleBadge}</span>
                          {displayInfo.displayName}
                          {displayInfo.statusIndicators.map((indicator, i) => (
                            <span key={i} className="status-icon">
                              {" "}
                              {indicator}
                            </span>
                          ))}
                          {!hasStream && (
                            <span className="connecting-indicator"> ⏳ Connecting...</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state placeholder */}
                  {remotePeers.length === 0 && (
                    <div className="video-container placeholder">
                      <div className="placeholder-content">
                        <p>👥</p>
                        <p>Waiting for others to join...</p>
                        <p>
                          Share room ID: <strong>{roomId}</strong>
                        </p>
                        {isHost && (
                          <div className="host-tips">
                            <p>
                              💡 <strong>Host Tips:</strong>
                            </p>
                            <p>• Manage participants in the panel above</p>
                            <p>• Promote viewers to participants for video/audio</p>
                            <p>• Share your screen to present to the team</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* TEAM CHAT */}
                <div className="team-chat">
                  <h3>💬 Team Chat</h3>
                  <WebRTCChat
                    roomId={roomId}
                    userId={userId}
                    userName={userName}
                    userRole={userRole}
                    enableVideoCall={false}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          /* SQUAD STREAMS */
          <div className="streams-section">
            {loading ? (
              <div className="loading">
                <p>Loading squad streams...</p>
              </div>
            ) : streams.length > 0 ? (
              <>
                <h2>📺 Live Squad Streams</h2>
                <MultiStreamSection streams={streams} />
              </>
            ) : (
              <div className="no-streams">
                <p>No live streams from your squad members right now.</p>
                <button onClick={() => setActiveMode("video-chat")}>
                  📹 Start a video chat instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* ROOM INFO PANEL */}
        {isInRoom && (
          <div className="room-info">
            <h3>🏠 Room Info</h3>
            <p>
              <strong>Room ID:</strong> {roomId}
            </p>
            <p>
              <strong>Connected:</strong> {roomParticipants.length} people
            </p>
            <p>
              <strong>Your Role:</strong> {userRole}
            </p>
            <p>
              <strong>Your Status:</strong>
              {isVideoEnabled ? " 📹" : " 📹❌"}
              {isAudioEnabled ? " 🎤" : " 🎤❌"}
              {isScreenSharing ? " 🖥️" : ""}
            </p>
            {isHost && (
              <div className="host-controls">
                <p>
                  <strong>Host Controls:</strong>
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowViewers}
                    onChange={(e) =>
                      setRoomSettings((prev) => ({ ...prev, allowViewers: e.target.checked }))
                    }
                  />
                  Allow viewers
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={roomSettings.requirePermission}
                    onChange={(e) =>
                      setRoomSettings((prev) => ({
                        ...prev,
                        requirePermission: e.target.checked,
                      }))
                    }
                  />
                  Require permission to join
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </GamerGate>
  );
};

export default TeamRoomPage;