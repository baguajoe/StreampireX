import React, { useState, useEffect, useRef } from "react";
import "../../styles/InboxDrawer.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const InboxDrawer = ({ isOpen, onClose, currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize socket listeners
  useEffect(() => {
    if (!socket || !currentUser) return;

    socket.on("chat_message", (message) => {
      console.log("Received message:", message);
      setMessages((prev) => [...prev, message]);
    });

    socket.on("new_conversation", (conversation) => {
      setConversations((prev) => [...prev, conversation]);
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

  // Fetch conversations when drawer opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      fetchConversations();
    }
  }, [isOpen, currentUser]);

  // Fetch conversations from API
  const fetchConversations = async () => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view messages");
        setConversations([]);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(Array.isArray(data) ? data : data.conversations || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load conversations");
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Open conversation and fetch messages
  const openConversation = async (user) => {
    setSelectedUser(user);
    setMessages([]);
    setError(null);

    // Join socket room if available
    if (socket && currentUser) {
      const roomId = [currentUser.id, user.id].sort().join("-");
      socket.emit("join_room", {
        roomId,
        userId: currentUser.id,
        username: currentUser.username || currentUser.display_name,
      });
    }

    // Fetch message history
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/messages/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const messageHistory = await response.json();
        setMessages(Array.isArray(messageHistory) ? messageHistory : messageHistory.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistically add message to UI
    const tempMessage = {
      id: Date.now(),
      sender_id: currentUser?.id,
      recipient_id: selectedUser.id,
      message: messageText,
      text: messageText,
      created_at: new Date().toISOString(),
      sending: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send via socket if available
    if (socket && currentUser) {
      const roomId = [currentUser.id, selectedUser.id].sort().join("-");
      socket.emit("chat_message", {
        roomId,
        from: currentUser.id,
        to: selectedUser.id,
        text: messageText,
        timestamp: new Date().toISOString(),
      });
    }

    // Send via API
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: selectedUser.id,
          message: messageText,
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? { ...sentMessage, sending: false } : msg))
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Mark message as failed
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempMessage.id ? { ...msg, sending: false, failed: true } : msg))
      );
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  // Handle search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Start new conversation
  const startConversation = (user) => {
    setSearchQuery("");
    setSearchResults([]);
    openConversation(user);
  };

  // Handle key press in message input
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="inbox-drawer-overlay" onClick={onClose}>
      <div className="inbox-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="inbox-header">
          <h2>💬 Messages</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="inbox-content">
          {/* Conversations List */}
          {!selectedUser ? (
            <div className="conversations-panel">
              {/* Search */}
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="search-results">
                  {searching ? (
                    <div className="loading-text">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="user-item"
                        onClick={() => startConversation(user)}
                      >
                        <div className="user-avatar">
                          {user.profile_picture ? (
                            <img src={user.profile_picture} alt={user.username} />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="user-info">
                          <strong>@{user.username}</strong>
                          <span>{user.display_name}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No users found</div>
                  )}
                </div>
              )}

              {/* Conversations */}
              {!searchQuery && (
                <>
                  {loading ? (
                    <div className="loading-container">
                      <div className="loading-spinner">💬</div>
                      <p>Loading conversations...</p>
                    </div>
                  ) : error ? (
                    <div className="error-container">
                      <p>{error}</p>
                      <button onClick={fetchConversations}>Retry</button>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="empty-conversations">
                      <div className="empty-icon">💬</div>
                      <h3>No conversations yet</h3>
                      <p>Search for users to start a conversation</p>
                    </div>
                  ) : (
                    <div className="conversations-list">
                      {conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="conversation-item"
                          onClick={() => openConversation(conv)}
                        >
                          <div className="conversation-avatar">
                            {conv.profile_picture || conv.avatar ? (
                              <img src={conv.profile_picture || conv.avatar} alt={conv.username} />
                            ) : (
                              <span>👤</span>
                            )}
                          </div>
                          <div className="conversation-info">
                            <div className="conversation-name">
                              @{conv.username}
                              {conv.unread > 0 && (
                                <span className="unread-badge">{conv.unread}</span>
                              )}
                            </div>
                            <div className="conversation-preview">
                              {conv.last_message || "No messages yet"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Chat View */
            <div className="chat-panel">
              {/* Chat Header */}
              <div className="chat-header">
                <button className="back-btn" onClick={() => setSelectedUser(null)}>
                  ← Back
                </button>
                <div className="chat-user-info">
                  <div className="chat-avatar">
                    {selectedUser.profile_picture || selectedUser.avatar ? (
                      <img
                        src={selectedUser.profile_picture || selectedUser.avatar}
                        alt={selectedUser.username}
                      />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <span>@{selectedUser.username}</span>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Say hi! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`message ${
                        msg.sender_id === currentUser?.id || msg.from === currentUser?.id
                          ? "sent"
                          : "received"
                      } ${msg.sending ? "sending" : ""} ${msg.failed ? "failed" : ""}`}
                    >
                      <div className="message-content">
                        {msg.message || msg.text}
                      </div>
                      <div className="message-time">
                        {msg.sending ? "Sending..." : msg.failed ? "Failed" : formatTime(msg.created_at || msg.timestamp)}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="send-btn"
                >
                  📤
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxDrawer;