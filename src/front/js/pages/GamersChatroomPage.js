// src/front/js/pages/GamersChatroomPage.js
// COMPLETE: Screen sharing, Recording, Voice Chat, Game Invite
import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { Context } from "../store/appContext";
import ChatBubble from "../component/ChatBubble";
import GamerGate from "../component/GamerGate";
import io from "socket.io-client";
import "../../styles/GamersChatroom.css";

const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:3001", {
  transports: ["websocket"],
  auth: { token: localStorage.getItem("token") },
  withCredentials: true,
});

// ICE servers for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const GamersChatroomPage = () => {
  const { store } = useContext(Context);

  // ========================
  // EXISTING CHAT STATE
  // ========================
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("general");
  const [userTyping, setUserTyping] = useState([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [gameStatus, setGameStatus] = useState("");

  const chatRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ========================
  // SCREEN SHARE STATE
  // ========================
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [screenShareUser, setScreenShareUser] = useState(null);
  const [screenShareError, setScreenShareError] = useState(null);
  const [isFullscreenShare, setIsFullscreenShare] = useState(false);

  const screenVideoRef = useRef(null);
  const localScreenRef = useRef(null);
  const screenPcRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ========================
  // SCREEN RECORDING STATE
  // ========================
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // ========================
  // VOICE CHAT STATE
  // ========================
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [voiceUsers, setVoiceUsers] = useState([]); // users with voice active
  const [voiceError, setVoiceError] = useState(null);

  const voiceStreamRef = useRef(null);
  const voicePcRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // ========================
  // GAME INVITE STATE
  // ========================
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    gameName: "",
    platform: "PC",
    inviteCode: "",
    inviteLink: "",
  });

  // Gaming emojis
  const gamingEmojis = ["🎮", "🏆", "⚡", "🔥", "💯", "👍", "👎", "😎", "😤", "💀", "🎯", "⭐"];

  // Chat rooms
  const chatRooms = [
    { id: "general", name: "🎮 General Gaming", icon: "🎮" },
    { id: "lfg", name: "👥 Looking for Group", icon: "👥" },
    { id: "competitive", name: "🏆 Competitive", icon: "🏆" },
    { id: "casual", name: "😌 Casual Gaming", icon: "😌" },
    { id: "tech-support", name: "🔧 Tech Support", icon: "🔧" },
    { id: "streaming", name: "📺 Streaming", icon: "📺" },
  ];

  // Platform options for game invite
  const platforms = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile", "Cross-Platform"];

  // ========================
  // ROOM ID HELPER
  // ========================
  const getRoomId = useCallback(() => `gamers-${selectedRoom}`, [selectedRoom]);

  // ========================
  // FORMAT RECORDING TIME
  // ========================
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ========================
  // CHAT SOCKET SETUP
  // ========================
  useEffect(() => {
    socket.on("connect", () => {
      console.log(`🟢 Connected to ${getRoomId()}`);
      socket.emit("joinRoom", {
        stream_id: getRoomId(),
        user_info: {
          id: store.user?.id,
          username: store.user?.username,
          gamertag: store.user?.gamertag,
          current_game: gameStatus || store.user?.current_game_activity,
        },
      });

      socket.emit("join_webrtc_room", {
        roomId: getRoomId(),
        userId: store.user?.id,
        userName: store.user?.gamertag || store.user?.username,
      });
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("users_update", (users) => {
      setOnlineUsers(users);
    });

    socket.on("games_update", (games) => {
      setActiveGames(games);
    });

    socket.on("user_typing", (data) => {
      setUserTyping((prev) => {
        if (!prev.includes(data.username)) return [...prev, data.username];
        return prev;
      });
      setTimeout(() => {
        setUserTyping((prev) => prev.filter((user) => user !== data.username));
      }, 3000);
    });

    socket.on("user_status_update", (data) => {
      console.log("👤 User status update:", data);
    });

    // ========================
    // SCREEN SHARE LISTENERS
    // ========================
    socket.on("screen-share-start", (data) => {
      console.log("🖥️ Remote screen share started:", data);
      setScreenShareUser({
        userId: data.userId,
        userName: data.userName,
        sid: data.sid,
      });
    });

    socket.on("screen-share-stop", (data) => {
      console.log("🖥️ Remote screen share stopped:", data);
      setScreenShareUser(null);
      setRemoteScreenStream(null);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      if (screenPcRef.current) {
        screenPcRef.current.close();
        screenPcRef.current = null;
      }
    });

    socket.on("screen-share-offer", async (data) => {
      console.log("📡 Received screen share offer from:", data.from);
      try {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        screenPcRef.current = pc;

        pc.ontrack = (event) => {
          console.log("🎥 Received screen share track");
          setRemoteScreenStream(event.streams[0]);
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("screen-share-ice", {
              roomId: getRoomId(),
              candidate: event.candidate,
              targetSid: data.from,
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("screen-share-answer", {
          roomId: getRoomId(),
          answer: answer,
          targetSid: data.from,
        });
      } catch (err) {
        console.error("Error handling screen share offer:", err);
      }
    });

    socket.on("screen-share-answer", async (data) => {
      try {
        if (screenPcRef.current && screenPcRef.current.signalingState !== "stable") {
          await screenPcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.error("Error handling screen share answer:", err);
      }
    });

    socket.on("screen-share-ice", async (data) => {
      try {
        if (screenPcRef.current) {
          await screenPcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("Error adding screen share ICE candidate:", err);
      }
    });

    // ========================
    // VOICE CHAT LISTENERS
    // ========================
    socket.on("voice-user-joined", (data) => {
      console.log("🎤 Voice user joined:", data);
      setVoiceUsers((prev) => {
        if (!prev.find((u) => u.oderId === data.userId)) {
          return [...prev, { oderId: data.userId, userName: data.userName }];
        }
        return prev;
      });
    });

    socket.on("voice-user-left", (data) => {
      console.log("🎤 Voice user left:", data);
      setVoiceUsers((prev) => prev.filter((u) => u.oderId !== data.userId));
    });

    socket.on("voice-offer", async (data) => {
      console.log("📡 Received voice offer from:", data.from);
      try {
        if (!voicePcRef.current) {
          await setupVoiceConnection();
        }
        if (voicePcRef.current) {
          await voicePcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await voicePcRef.current.createAnswer();
          await voicePcRef.current.setLocalDescription(answer);
          socket.emit("voice-answer", {
            roomId: getRoomId(),
            answer: answer,
            targetSid: data.from,
          });
        }
      } catch (err) {
        console.error("Error handling voice offer:", err);
      }
    });

    socket.on("voice-answer", async (data) => {
      try {
        if (voicePcRef.current && voicePcRef.current.signalingState !== "stable") {
          await voicePcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.error("Error handling voice answer:", err);
      }
    });

    socket.on("voice-ice", async (data) => {
      try {
        if (voicePcRef.current) {
          await voicePcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("Error adding voice ICE candidate:", err);
      }
    });

    return () => {
      socket.emit("leaveRoom", { stream_id: getRoomId() });
      socket.emit("leave_webrtc_room", { roomId: getRoomId() });
      socket.off("receive_message");
      socket.off("users_update");
      socket.off("games_update");
      socket.off("user_typing");
      socket.off("user_status_update");
      socket.off("screen-share-start");
      socket.off("screen-share-stop");
      socket.off("screen-share-offer");
      socket.off("screen-share-answer");
      socket.off("screen-share-ice");
      socket.off("voice-user-joined");
      socket.off("voice-user-left");
      socket.off("voice-offer");
      socket.off("voice-answer");
      socket.off("voice-ice");
    };
  }, [selectedRoom, store.user]);

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Attach remote screen stream
  useEffect(() => {
    if (screenVideoRef.current && remoteScreenStream) {
      screenVideoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ========================
  // SCREEN SHARE FUNCTIONS
  // ========================
  const startScreenShare = async () => {
    setScreenShareError(null);

    if (screenShareUser) {
      setScreenShareError(`${screenShareUser.userName} is already sharing their screen.`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } },
        audio: true,
      });

      setScreenStream(stream);
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (localScreenRef.current) {
        localScreenRef.current.srcObject = stream;
      }

      socket.emit("screen-share-start", {
        roomId: getRoomId(),
        userId: store.user?.id,
        userName: store.user?.gamertag || store.user?.username,
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      screenPcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screen-share-ice", { roomId: getRoomId(), candidate: event.candidate });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("screen-share-offer", { roomId: getRoomId(), offer: offer });

      stream.getVideoTracks()[0].addEventListener("ended", () => stopScreenShare());
    } catch (err) {
      console.error("Screen share failed:", err);
      if (err.name === "NotAllowedError") {
        setScreenShareError("Screen sharing permission denied.");
      } else {
        setScreenShareError("Failed to start screen share. Please try again.");
      }
    }
  };

  const stopScreenShare = () => {
    if (isRecording) stopRecording();

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    if (localScreenRef.current) localScreenRef.current.srcObject = null;
    if (screenPcRef.current) {
      screenPcRef.current.close();
      screenPcRef.current = null;
    }

    socket.emit("screen-share-stop", { roomId: getRoomId(), userId: store.user?.id });
  };

  const toggleFullscreenShare = () => {
    const container = document.querySelector(".screen-share-display");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
      setIsFullscreenShare(true);
    } else {
      document.exitFullscreen();
      setIsFullscreenShare(false);
    }
  };

  // ========================
  // SCREEN RECORDING FUNCTIONS
  // ========================
  const startRecording = () => {
    setRecordingError(null);
    const streamToRecord = screenStreamRef.current;

    if (!streamToRecord) {
      setRecordingError("No screen share active to record.");
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(streamToRecord, { mimeType, videoBitsPerSecond: 2500000 });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `screen-recording-${timestamp}.webm`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
      };

      mediaRecorder.onerror = () => {
        setRecordingError("Recording failed. Please try again.");
        stopRecording();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setRecordingError("Failed to start recording. Your browser may not support this feature.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  // ========================
  // VOICE CHAT FUNCTIONS
  // ========================
  const setupVoiceConnection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      voiceStreamRef.current = stream;

      // Start muted
      stream.getAudioTracks().forEach((track) => (track.enabled = false));

      const pc = new RTCPeerConnection(ICE_SERVERS);
      voicePcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        // Play remote audio
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.play().catch(console.error);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("voice-ice", { roomId: getRoomId(), candidate: event.candidate });
        }
      };

      return pc;
    } catch (err) {
      console.error("Voice setup failed:", err);
      throw err;
    }
  };

  const toggleVoiceChat = async () => {
    setVoiceError(null);

    if (!isVoiceActive) {
      // Join voice
      try {
        const pc = await setupVoiceConnection();

        socket.emit("voice-user-joined", {
          roomId: getRoomId(),
          oderId: store.user?.id,
          userName: store.user?.gamertag || store.user?.username,
        });

        // Create and send offer to room
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("voice-offer", { roomId: getRoomId(), offer: offer });

        setIsVoiceActive(true);
        setIsMuted(true); // Start muted
      } catch (err) {
        if (err.name === "NotAllowedError") {
          setVoiceError("Microphone permission denied.");
        } else {
          setVoiceError("Failed to join voice chat.");
        }
      }
    } else {
      // Leave voice
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
      }
      if (voicePcRef.current) {
        voicePcRef.current.close();
        voicePcRef.current = null;
      }

      socket.emit("voice-user-left", {
        roomId: getRoomId(),
        oderId: store.user?.id,
      });

      setIsVoiceActive(false);
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    if (voiceStreamRef.current) {
      const enabled = !isMuted;
      voiceStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = enabled));
      setIsMuted(!enabled);
    }
  };

  // ========================
  // GAME INVITE FUNCTIONS
  // ========================
  const openInviteModal = () => {
    setInviteData({
      gameName: gameStatus || "",
      platform: "PC",
      inviteCode: "",
      inviteLink: "",
    });
    setShowInviteModal(true);
  };

  const sendGameInvite = () => {
    if (!inviteData.gameName.trim()) {
      alert("Please enter a game name");
      return;
    }

    if (!inviteData.inviteCode.trim() && !inviteData.inviteLink.trim()) {
      alert("Please enter an invite code or link");
      return;
    }

    // Format the invite message
    const inviteMessage = `🎯 GAME INVITE\n━━━━━━━━━━━━━━━\n🎮 ${inviteData.gameName}\n🖥️ ${inviteData.platform}${
      inviteData.inviteCode ? `\n🔑 Code: ${inviteData.inviteCode}` : ""
    }${inviteData.inviteLink ? `\n🔗 ${inviteData.inviteLink}` : ""}\n━━━━━━━━━━━━━━━`;

    const payload = {
      stream_id: getRoomId(),
      message: inviteMessage,
      user_info: {
        gamertag: store.user?.gamertag,
        current_game: inviteData.gameName,
        gamer_rank: store.user?.gamer_rank,
        isGameInvite: true,
      },
    };

    socket.emit("send_message", payload);
    setShowInviteModal(false);
    setInviteData({ gameName: "", platform: "PC", inviteCode: "", inviteLink: "" });
  };

  // ========================
  // CHAT FUNCTIONS
  // ========================
  const switchRoom = (roomId) => {
    if (isScreenSharing) stopScreenShare();
    if (isVoiceActive) toggleVoiceChat();

    socket.emit("leaveRoom", { stream_id: getRoomId() });
    socket.emit("leave_webrtc_room", { roomId: getRoomId() });

    setMessages([]);
    setScreenShareUser(null);
    setRemoteScreenStream(null);
    setVoiceUsers([]);

    setSelectedRoom(roomId);

    socket.emit("joinRoom", {
      stream_id: `gamers-${roomId}`,
      user_info: {
        id: store.user?.id,
        username: store.user?.username,
        gamertag: store.user?.gamertag,
        current_game: gameStatus,
      },
    });

    socket.emit("join_webrtc_room", {
      roomId: `gamers-${roomId}`,
      userId: store.user?.id,
      userName: store.user?.gamertag || store.user?.username,
    });
  };

  const handleTyping = () => {
    socket.emit("typing", {
      stream_id: getRoomId(),
      username: store.user?.username || store.user?.gamertag,
    });
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const payload = {
      stream_id: getRoomId(),
      message: newMessage.trim(),
      user_info: {
        gamertag: store.user?.gamertag,
        current_game: gameStatus,
        gamer_rank: store.user?.gamer_rank,
      },
    };

    socket.emit("send_message", payload);
    setNewMessage("");
    setShowEmojis(false);
  };

  const addEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojis(false);
  };

  const updateGameStatus = () => {
    const status = prompt("What game are you playing?", gameStatus);
    if (status !== null) {
      setGameStatus(status);
      socket.emit("update_game_status", { stream_id: getRoomId(), game_status: status });
    }
  };

  const sendQuickMessage = (message) => {
    const payload = {
      stream_id: getRoomId(),
      message: message,
      user_info: {
        gamertag: store.user?.gamertag,
        current_game: gameStatus,
        gamer_rank: store.user?.gamer_rank,
      },
    };
    socket.emit("send_message", payload);
  };

  const currentRoom = chatRooms.find((room) => room.id === selectedRoom);

  // ========================
  // RENDER
  // ========================
  return (
    <GamerGate featureName="Gamer Chatrooms">
      <div className="gamers-chatroom-container">
        {/* Header */}
        <div className="chatroom-header">
          <h1>💬 Gamers Global Chatroom</h1>
          <div className="user-status">
            <span className="online-indicator">🟢</span>
            <span>{store.user?.gamertag || store.user?.username}</span>
            {gameStatus && <span className="game-status">🎮 {gameStatus}</span>}
            <button onClick={updateGameStatus} className="status-btn">
              {gameStatus ? "🎮 Change Game" : "🎮 Set Game"}
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="chatroom-layout">
          {/* Sidebar */}
          <div className="chatroom-sidebar">
            <div className="rooms-section">
              <h3>💬 Rooms</h3>
              <div className="rooms-list">
                {chatRooms.map((room) => (
                  <button
                    key={room.id}
                    className={`room-btn ${selectedRoom === room.id ? "active" : ""}`}
                    onClick={() => switchRoom(room.id)}
                  >
                    <span className="room-icon">{room.icon}</span>
                    <span className="room-name">{room.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="online-section">
              <h3>👥 Online ({onlineUsers.length})</h3>
              <div className="users-list">
                {onlineUsers.map((user, index) => (
                  <div key={index} className="user-item">
                    <span className="user-status">🟢</span>
                    <span className="user-name">{user.gamertag || user.username}</span>
                    {user.current_game && <span className="user-game">🎮 {user.current_game}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Chat Users */}
            {voiceUsers.length > 0 && (
              <div className="voice-section">
                <h3>🎤 In Voice ({voiceUsers.length})</h3>
                <div className="users-list">
                  {voiceUsers.map((user, index) => (
                    <div key={index} className="user-item voice-user">
                      <span className="voice-indicator">🔊</span>
                      <span className="user-name">{user.userName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeGames.length > 0 && (
              <div className="games-section">
                <h3>🎮 Active Games</h3>
                <div className="games-list">
                  {activeGames.map((game, index) => (
                    <div key={index} className="game-item">
                      <span className="game-name">{game.name}</span>
                      <span className="game-count">{game.players} players</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="chat-main">
            {/* Room Header */}
            <div className="room-header">
              <h2>
                {currentRoom?.icon} {currentRoom?.name}
              </h2>
              <div className="room-actions">
                {/* Voice Chat Button */}
                <div className="voice-controls">
                  <button
                    className={`action-btn ${isVoiceActive ? "active-voice" : ""}`}
                    title={isVoiceActive ? "Leave Voice" : "Join Voice"}
                    onClick={toggleVoiceChat}
                  >
                    {isVoiceActive ? "🎤" : "🎤"}
                  </button>
                  {isVoiceActive && (
                    <button
                      className={`action-btn mute-btn ${isMuted ? "muted" : "unmuted"}`}
                      title={isMuted ? "Unmute" : "Mute"}
                      onClick={toggleMute}
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                  )}
                </div>

                {/* Screen Share Button */}
                <button
                  className={`action-btn ${isScreenSharing ? "active-share" : ""}`}
                  title={isScreenSharing ? "Stop Screen Share" : "Screen Share"}
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                >
                  🖥️
                </button>

                {/* Game Invite Button */}
                <button className="action-btn" title="Send Game Invite" onClick={openInviteModal}>
                  🎯
                </button>
              </div>
            </div>

            {/* Error Messages */}
            {screenShareError && (
              <div className="screen-share-error">
                <span>⚠️ {screenShareError}</span>
                <button onClick={() => setScreenShareError(null)}>✕</button>
              </div>
            )}
            {recordingError && (
              <div className="screen-share-error">
                <span>⚠️ {recordingError}</span>
                <button onClick={() => setRecordingError(null)}>✕</button>
              </div>
            )}
            {voiceError && (
              <div className="screen-share-error">
                <span>⚠️ {voiceError}</span>
                <button onClick={() => setVoiceError(null)}>✕</button>
              </div>
            )}

            {/* Voice Active Indicator */}
            {isVoiceActive && (
              <div className="voice-active-banner">
                <span>🎤 Voice chat active</span>
                <span className={`mic-status ${isMuted ? "muted" : "live"}`}>
                  {isMuted ? "🔇 Muted" : "🔊 Live"}
                </span>
              </div>
            )}

            {/* Local screen share preview */}
            {isScreenSharing && (
              <div className="screen-share-panel local-share">
                <div className="screen-share-header">
                  <span className="share-badge">
                    🖥️ You are sharing your screen
                    {isRecording && <span className="recording-indicator">🔴 REC {formatTime(recordingTime)}</span>}
                  </span>
                  <div className="share-controls">
                    {!isRecording ? (
                      <button className="share-control-btn record" onClick={startRecording} title="Start Recording">
                        🔴 Record
                      </button>
                    ) : (
                      <button
                        className="share-control-btn stop-record"
                        onClick={stopRecording}
                        title="Stop Recording & Save"
                      >
                        ⏹ Stop ({formatTime(recordingTime)})
                      </button>
                    )}
                    <button className="share-control-btn stop" onClick={stopScreenShare}>
                      ⏹ Stop Sharing
                    </button>
                  </div>
                </div>
                <div className="screen-share-display">
                  <video ref={localScreenRef} autoPlay muted playsInline className="screen-video local" />
                  {isRecording && (
                    <div className="recording-overlay">
                      <span className="rec-dot"></span>
                      <span>REC {formatTime(recordingTime)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Remote screen share */}
            {screenShareUser && screenShareUser.userId !== store.user?.id && (
              <div className="screen-share-panel remote-share">
                <div className="screen-share-header">
                  <span className="share-badge">🖥️ {screenShareUser.userName} is sharing their screen</span>
                  <div className="share-controls">
                    <button
                      className="share-control-btn fullscreen"
                      onClick={toggleFullscreenShare}
                      title="Toggle fullscreen"
                    >
                      {isFullscreenShare ? "⬜" : "⛶"} Fullscreen
                    </button>
                  </div>
                </div>
                <div className="screen-share-display">
                  <video ref={screenVideoRef} autoPlay playsInline className="screen-video remote" />
                  {!remoteScreenStream && (
                    <div className="screen-share-connecting">
                      <div className="share-spinner"></div>
                      <p>Connecting to screen share...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className={`chat-messages ${isScreenSharing || screenShareUser ? "with-screen-share" : ""}`}>
              {messages.map((msg, index) => (
                <ChatBubble
                  key={index}
                  username={msg.username || msg.gamertag || "Anonymous"}
                  content={msg.message}
                  timestamp={msg.timestamp || ""}
                  isCurrentUser={msg.user_id === store.user?.id}
                  gameInfo={msg.user_info?.current_game}
                  gamerRank={msg.user_info?.gamer_rank}
                  isGameInvite={msg.user_info?.isGameInvite}
                />
              ))}

              {userTyping.length > 0 && (
                <div className="typing-indicator">
                  <span>
                    {userTyping.join(", ")} {userTyping.length === 1 ? "is" : "are"} typing...
                  </span>
                </div>
              )}

              <div ref={chatRef} />
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <button onClick={() => sendQuickMessage("LFG! 🎮")} className="quick-btn">
                👥 Looking for Group
              </button>
              <button onClick={() => sendQuickMessage("GG! 🏆")} className="quick-btn">
                🏆 Good Game
              </button>
              <button onClick={() => sendQuickMessage("Need help! 🆘")} className="quick-btn">
                🆘 Need Help
              </button>
              <button onClick={() => sendQuickMessage("Anyone up for a match? ⚔️")} className="quick-btn">
                ⚔️ Match Request
              </button>
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              {showEmojis && (
                <div className="emoji-picker">
                  {gamingEmojis.map((emoji) => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="emoji-btn">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <div className="input-group">
                <button className="emoji-toggle-btn" onClick={() => setShowEmojis(!showEmojis)}>
                  😎
                </button>

                <input
                  type="text"
                  className="message-input"
                  placeholder={`Message ${currentRoom?.name}...`}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  maxLength={500}
                />

                <button className="send-btn" onClick={handleSend}>
                  🚀 Send
                </button>
              </div>

              <div className="input-footer">
                <span className="char-count">{newMessage.length}/500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Invite Modal */}
        {showInviteModal && (
          <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="game-invite-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🎯 Send Game Invite</h3>
                <button className="modal-close" onClick={() => setShowInviteModal(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Game Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Fortnite, Valorant, Apex Legends"
                    value={inviteData.gameName}
                    onChange={(e) => setInviteData({ ...inviteData, gameName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Platform</label>
                  <select
                    value={inviteData.platform}
                    onChange={(e) => setInviteData({ ...inviteData, platform: e.target.value })}
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Invite Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC123"
                    value={inviteData.inviteCode}
                    onChange={(e) => setInviteData({ ...inviteData, inviteCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Invite Link (optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={inviteData.inviteLink}
                    onChange={(e) => setInviteData({ ...inviteData, inviteLink: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button className="send-invite-btn" onClick={sendGameInvite}>
                  🎯 Send Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GamerGate>
  );
};

export default GamersChatroomPage;