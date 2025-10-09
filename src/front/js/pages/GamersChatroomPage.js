import React, { useState, useEffect, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import ChatBubble from "../component/ChatBubble";
import io from "socket.io-client";
import "../../styles/GamersChatroom.css";

const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:3001", {
  transports: ["websocket"],
  auth: { token: localStorage.getItem("token") },
  withCredentials: true,
});

const GamersChatroomPage = () => {
  const { store } = useContext(Context);
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

  // Gaming-specific emoji reactions
  const gamingEmojis = ["🎮", "🏆", "⚡", "🔥", "💯", "👍", "👎", "😎", "😤", "💀", "🎯", "⭐"];

  // Different chat rooms for different gaming topics
  const chatRooms = [
    { id: "general", name: "🎮 General Gaming", icon: "🎮" },
    { id: "lfg", name: "👥 Looking for Group", icon: "👥" },
    { id: "competitive", name: "🏆 Competitive", icon: "🏆" },
    { id: "casual", name: "😌 Casual Gaming", icon: "😌" },
    { id: "tech-support", name: "🔧 Tech Support", icon: "🔧" },
    { id: "streaming", name: "📺 Streaming", icon: "📺" }
  ];

  useEffect(() => {
    // Connect to initial room
    socket.on("connect", () => {
      console.log(`🟢 Connected to gamers-${selectedRoom}`);
      socket.emit("joinRoom", {
        stream_id: `gamers-${selectedRoom}`,
        user_info: {
          id: store.user?.id,
          username: store.user?.username,
          gamertag: store.user?.gamertag,
          current_game: gameStatus || store.user?.current_game_activity
        }
      });
    });

    // Receive messages
    socket.on("receive_message", (msg) => {
      console.log("📨 Received message:", msg);
      setMessages((prev) => [...prev, msg]);
    });

    // Online users update
    socket.on("users_update", (users) => {
      setOnlineUsers(users);
    });

    // Active games update
    socket.on("games_update", (games) => {
      setActiveGames(games);
    });

    // Typing indicators
    socket.on("user_typing", (data) => {
      setUserTyping(prev => {
        if (!prev.includes(data.username)) {
          return [...prev, data.username];
        }
        return prev;
      });

      // Clear typing after 3 seconds
      setTimeout(() => {
        setUserTyping(prev => prev.filter(user => user !== data.username));
      }, 3000);
    });

    // User status updates
    socket.on("user_status_update", (data) => {
      console.log("👤 User status update:", data);
    });

    return () => {
      socket.emit("leaveRoom", { stream_id: `gamers-${selectedRoom}` });
      socket.off("receive_message");
      socket.off("users_update");
      socket.off("games_update");
      socket.off("user_typing");
      socket.off("user_status_update");
    };
  }, [selectedRoom, store.user]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle room switching
  const switchRoom = (roomId) => {
    // Leave current room
    socket.emit("leaveRoom", { stream_id: `gamers-${selectedRoom}` });

    // Clear messages for new room
    setMessages([]);

    // Join new room
    setSelectedRoom(roomId);
    socket.emit("joinRoom", {
      stream_id: `gamers-${roomId}`,
      user_info: {
        id: store.user?.id,
        username: store.user?.username,
        gamertag: store.user?.gamertag,
        current_game: gameStatus
      }
    });
  };

  // Handle typing indicators
  const handleTyping = () => {
    socket.emit("typing", {
      stream_id: `gamers-${selectedRoom}`,
      username: store.user?.username || store.user?.gamertag
    });
  };

  // Handle message sending
  const handleSend = () => {
    if (!newMessage.trim()) return;

    const payload = {
      stream_id: `gamers-${selectedRoom}`,
      message: newMessage.trim(),
      user_info: {
        gamertag: store.user?.gamertag,
        current_game: gameStatus,
        gamer_rank: store.user?.gamer_rank
      }
    };

    socket.emit("send_message", payload);
    setNewMessage("");
    setShowEmojis(false);
  };

  // Add emoji to message
  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
  };

  // Update game status
  const updateGameStatus = () => {
    const status = prompt("What game are you playing?", gameStatus);
    if (status !== null) {
      setGameStatus(status);
      socket.emit("update_game_status", {
        stream_id: `gamers-${selectedRoom}`,
        game_status: status
      });
    }
  };

  // Send quick gaming messages
  const sendQuickMessage = (message) => {
    const payload = {
      stream_id: `gamers-${selectedRoom}`,
      message: message,
      user_info: {
        gamertag: store.user?.gamertag,
        current_game: gameStatus,
        gamer_rank: store.user?.gamer_rank
      }
    };
    socket.emit("send_message", payload);
  };

  const currentRoom = chatRooms.find(room => room.id === selectedRoom);

  return (
    <div className="gamers-chatroom-container">
      <div className="chatroom-header">
        <h1>💬 Gamers Global Chatroom</h1>
        <div className="user-status">
          <span className="online-indicator">🟢</span>
          <span>{store.user?.gamertag || store.user?.username}</span>
          {gameStatus && <span className="game-status">🎮 {gameStatus}</span>}
          <button onClick={updateGameStatus} className="status-btn">
            {gameStatus ? "🎮 Change Game" : "🎮 Set Game Status"}
          </button>
        </div>
      </div>

      <div className="chatroom-layout">
        {/* Sidebar */}
        <div className="chatroom-sidebar">
          {/* Room Selection */}
          <div className="rooms-section">
            <h3>🏠 Chat Rooms</h3>
            <div className="rooms-list">
              {chatRooms.map(room => (
                <button
                  key={room.id}
                  className={`room-btn ${selectedRoom === room.id ? 'active' : ''}`}
                  onClick={() => switchRoom(room.id)}
                >
                  <span className="room-icon">{room.icon}</span>
                  <span className="room-name">{room.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Online Users */}
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

          {/* Active Games */}
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
          {/* Current Room Header */}
          <div className="room-header">
            <h2>{currentRoom?.icon} {currentRoom?.name}</h2>
            <div className="room-actions">
              <button className="action-btn" title="Voice Chat">🎤</button>
              <button className="action-btn" title="Screen Share">🖥️</button>
              <button className="action-btn" title="Game Invite">🎯</button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chat-messages">
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

            {/* Typing Indicators */}
            {userTyping.length > 0 && (
              <div className="typing-indicator">
                <span>{userTyping.join(", ")} {userTyping.length === 1 ? 'is' : 'are'} typing...</span>
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
                {gamingEmojis.map(emoji => (
                  <button key={emoji} onClick={() => addEmoji(emoji)} className="emoji-btn">
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="input-group">
              <button
                className="emoji-toggle-btn"
                onClick={() => setShowEmojis(!showEmojis)}
              >
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
  );
};

export default GamersChatroomPage;