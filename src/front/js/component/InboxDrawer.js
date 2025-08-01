import React, { useState, useEffect, useRef } from "react";
import "../../styles/InboxDrawer.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';

const InboxDrawer = ({ isOpen, onClose, currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Sample conversations for fallback
  const sampleConversations = [
    { id: 1, username: "john_doe", last_message: "Hey there!", unread: 2 },
    { id: 2, username: "jane_smith", last_message: "How's it going?", unread: 0 },
    { id: 3, username: "musiclover", last_message: "Great track!", unread: 1 },
    { id: 4, username: "zenmaster", last_message: "Peace and love!", unread: 0 },
    { id: 5, username: "fitjay", last_message: "Ready for the workout?", unread: 1 }
  ];

  // Initialize socket listeners
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on("chat_message", (message) => {
      console.log("Received message:", message);
      setMessages(prev => [...prev, message]);
    });

    socket.on("new_conversation", (conversation) => {
      setConversations(prev => [...prev, conversation]);
    });

    return () => {
      socket.off("chat_message");
      socket.off("new_conversation");
    };
  }, [socket, currentUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!currentUser?.id) {
      console.log("No current user, using sample conversations");
      setConversations(sampleConversations);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log("No token found, using sample conversations");
        setConversations(sampleConversations);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.length > 0 ? data : sampleConversations);
      } else {
        console.log("API failed, using sample conversations");
        setConversations(sampleConversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations(sampleConversations);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // Open conversation
  const openConversation = async (user) => {
    setSelectedUser(user);
    setMessages([]);
    setError(null);

    // Sample messages for demo
    const sampleMessages = [
      { 
        id: 1, 
        from: user.id, 
        to: currentUser?.id || 1, 
        text: `Hey ${currentUser?.username || 'there'}! How are you doing?`, 
        timestamp: new Date(Date.now() - 3600000).toISOString() 
      },
      { 
        id: 2, 
        from: currentUser?.id || 1, 
        to: user.id, 
        text: "Hi! I'm doing great, thanks for asking! 😊", 
        timestamp: new Date(Date.now() - 1800000).toISOString() 
      },
      { 
        id: 3, 
        from: user.id, 
        to: currentUser?.id || 1, 
        text: "That's awesome! What have you been up to lately?", 
        timestamp: new Date(Date.now() - 900000).toISOString() 
      }
    ];
    
    setMessages(sampleMessages);

    // Join socket room if available
    if (socket && currentUser) {
      const roomId = [currentUser.id, user.id].sort().join("-");
      socket.emit("join_room", {
        roomId,
        userId: currentUser.id,
        username: currentUser.username || currentUser.display_name
      });
    }

    // Try to fetch real message history
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/messages/${user.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const messageHistory = await response.json();
        if (messageHistory.length > 0) {
          setMessages(messageHistory);
        }
      }
    } catch (error) {
      console.log("Using sample messages, API error:", error);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    const message = {
      id: Date.now(),
      from: currentUser?.id || 1,
      to: selectedUser.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    // Add to local state immediately
    setMessages(prev => [...prev, message]);

    // Send via socket if available
    if (socket && currentUser) {
      const roomId = [currentUser.id, selectedUser.id].sort().join("-");
      socket.emit("chat_message", {
        room: roomId,
        from: currentUser.id,
        to: selectedUser.id,
        text: newMessage.trim(),
        timestamp: message.timestamp
      });
    }

    // Clear input
    setNewMessage("");

    // Save to backend (optional, can fail silently)
    try {
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`${BACKEND_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(message)
        }).catch(err => console.log("Message save failed:", err));
      }
    } catch (error) {
      console.log("Backend save failed:", error);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Load conversations when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <div className="inbox-drawer">
      <div className="drawer-header">
        <h4>💬 Messages</h4>
        <button 
          className="close-btn" 
          onClick={() => {
            onClose();
            setSelectedUser(null);
            setMessages([]);
          }}
        >
          ✕
        </button>
      </div>

      {!selectedUser ? (
        // Conversation List View
        <div className="conversation-list">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading conversations...</p>
            </div>
          )}
          
          {error && (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button onClick={fetchConversations}>Retry</button>
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="empty-state">
              <p>No conversations yet</p>
              <small>Start chatting with someone to see conversations here</small>
            </div>
          )}

          {conversations.map((conversation) => (
            <div
              key={conversation.id || conversation.conversation_id}
              className="conversation-item"
              onClick={() => openConversation({
                id: conversation.id || conversation.with_user_id,
                username: conversation.username || conversation.with_username
              })}
            >
              <div className="conversation-avatar">
                {(conversation.username || conversation.with_username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="conversation-info">
                <div className="conversation-name">
                  {conversation.username || conversation.with_username}
                </div>
                <div className="conversation-preview">
                  {conversation.last_message || "No messages yet"}
                </div>
              </div>
              {conversation.unread > 0 && (
                <span className="unread-count">{conversation.unread}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Chat View
        <div className="chat-view">
          <div className="chat-header">
            <button 
              className="back-btn"
              onClick={() => setSelectedUser(null)}
            >
              ← Back
            </button>
            <div className="chat-user-info">
              <div className="chat-avatar">
                {selectedUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="chat-username">{selectedUser.username}</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="empty-chat">
                <p>No messages yet</p>
                <small>Start the conversation!</small>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id || `${message.from}-${message.timestamp}`}
                className={`message ${
                  message.from === (currentUser?.id || 1) ? "sent" : "received"
                }`}
              >
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <div className="chat-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="message-input"
              />
              <button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="send-btn"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxDrawer;