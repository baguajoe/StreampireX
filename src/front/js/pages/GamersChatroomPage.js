// src/front/js/pages/GamersChatroomPage.js
// UPDATED: Screen sharing via WebRTC + existing text chat
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

// ICE servers for WebRTC (free STUN, add your own TURN for production)
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

  // ========================
  // ROOM ID HELPER
  // ========================
  const getRoomId = useCallback(() => `gamers-${selectedRoom}`, [selectedRoom]);

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

      // Also join the WebRTC signaling room for screen share
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

    // Someone started sharing
    socket.on("screen-share-start", (data) => {
      console.log("🖥️ Remote screen share started:", data);
      setScreenShareUser({
        userId: data.userId,
        userName: data.userName,
        sid: data.sid,
      });
    });

    // Someone stopped sharing
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

    // Receive screen share offer (viewer side)
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

        pc.onconnectionstatechange = () => {
          console.log("Screen share connection:", pc.connectionState);
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

    // Receive answer (sharer side)
    socket.on("screen-share-answer", async (data) => {
      console.log("📡 Received screen share answer from:", data.from);
      try {
        if (screenPcRef.current && screenPcRef.current.signalingState !== "stable") {
          await screenPcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      } catch (err) {
        console.error("Error handling screen share answer:", err);
      }
    });

    // Receive ICE candidate
    socket.on("screen-share-ice", async (data) => {
      try {
        if (screenPcRef.current) {
          await screenPcRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (err) {
        console.error("Error adding screen share ICE candidate:", err);
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
    };
  }, [selectedRoom, store.user]);

  // Auto-scroll
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Attach remote screen stream to video element when it changes
  useEffect(() => {
    if (screenVideoRef.current && remoteScreenStream) {
      screenVideoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

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
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: true,
      });

      setScreenStream(stream);
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (localScreenRef.current) {
        localScreenRef.current.srcObject = stream;
      }

      // Notify room
      socket.emit("screen-share-start", {
        roomId: getRoomId(),
        userId: store.user?.id,
        userName: store.user?.gamertag || store.user?.username,
      });

      // Create peer connection and add screen tracks
      const pc = new RTCPeerConnection(ICE_SERVERS);
      screenPcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("screen-share-ice", {
            roomId: getRoomId(),
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Sharer connection state:", pc.connectionState);
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("screen-share-offer", {
        roomId: getRoomId(),
        offer: offer,
      });

      // Handle browser "Stop sharing" button
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
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
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    if (localScreenRef.current) {
      localScreenRef.current.srcObject = null;
    }

    if (screenPcRef.current) {
      screenPcRef.current.close();
      screenPcRef.current = null;
    }

    socket.emit("screen-share-stop", {
      roomId: getRoomId(),
      userId: store.user?.id,
    });
  };

  const toggleFullscreenShare = () => {
    const container = document.querySelector(".screen-share-display");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error("Fullscreen failed:", err);
      });
      setIsFullscreenShare(true);
    } else {
      document.exitFullscreen();
      setIsFullscreenShare(false);
    }
  };

  // ========================
  // CHAT FUNCTIONS
  // ========================

  const switchRoom = (roomId) => {
    if (isScreenSharing) {
      stopScreenShare();
    }

    socket.emit("leaveRoom", { stream_id: getRoomId() });
    socket.emit("leave_webrtc_room", { roomId: getRoomId() });

    setMessages([]);
    setScreenShareUser(null);
    setRemoteScreenStream(null);

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
      socket.emit("update_game_status", {
        stream_id: getRoomId(),
        game_status: status,
      });
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
                    {user.current_game && (
                      <span className="user-game">🎮 {user.current_game}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                <button className="action-btn" title="Voice Chat">
                  🎤
                </button>
                <button
                  className={`action-btn ${isScreenSharing ? "active-share" : ""}`}
                  title={isScreenSharing ? "Stop Screen Share" : "Screen Share"}
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                >
                  🖥️
                </button>
                <button className="action-btn" title="Game Invite">
                  🎯
                </button>
              </div>
            </div>

            {/* Screen Share Error */}
            {screenShareError && (
              <div className="screen-share-error">
                <span>⚠️ {screenShareError}</span>
                <button onClick={() => setScreenShareError(null)}>✕</button>
              </div>
            )}

            {/* Local screen share preview (you are sharing) */}
            {isScreenSharing && (
              <div className="screen-share-panel local-share">
                <div className="screen-share-header">
                  <span className="share-badge">🖥️ You are sharing your screen</span>
                  <div className="share-controls">
                    <button className="share-control-btn stop" onClick={stopScreenShare}>
                      ⏹ Stop Sharing
                    </button>
                  </div>
                </div>
                <div className="screen-share-display">
                  <video
                    ref={localScreenRef}
                    autoPlay
                    muted
                    playsInline
                    className="screen-video local"
                  />
                </div>
              </div>
            )}

            {/* Remote screen share (someone else is sharing) */}
            {screenShareUser && screenShareUser.userId !== store.user?.id && (
              <div className="screen-share-panel remote-share">
                <div className="screen-share-header">
                  <span className="share-badge">
                    🖥️ {screenShareUser.userName} is sharing their screen
                  </span>
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
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="screen-video remote"
                  />
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
      </div>
    </GamerGate>
  );
};

export default GamersChatroomPage;