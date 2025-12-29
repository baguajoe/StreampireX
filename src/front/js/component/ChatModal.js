import React, { useEffect, useState, useRef, useCallback } from "react";
import io from "socket.io-client";
import WebRTCChat from "./WebRTCChat";
import "../../styles/ChatModal.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://streampirex-api.up.railway.app";

// Default avatar fallback
import lady1 from "../../img/lady1.png";

const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    withCredentials: true
});

const ChatModal = ({
    recipientId: initialRecipientId,
    recipientName: initialRecipientName,
    currentUserId,
    onClose,
    enableTypingIndicator = true,
    enableThreads = true,
    autoScroll = true,
    enableMediaUpload = true,
    enableGroupChat = true
}) => {
    // Recipient state - can be changed via user search
    const [recipientId, setRecipientId] = useState(initialRecipientId);
    const [recipientName, setRecipientName] = useState(initialRecipientName);
    const [recipientAvatar, setRecipientAvatar] = useState(null);
    
    // User selection state
    const [showUserSearch, setShowUserSearch] = useState(!initialRecipientId);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Chat state
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [typing, setTyping] = useState(false);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [mediaFile, setMediaFile] = useState(null);
    const [activeTab, setActiveTab] = useState("chat");
    const [loadingMessages, setLoadingMessages] = useState(false);
    
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const room = recipientId ? [currentUserId, recipientId].sort().join("-") : null;
    const currentUserName = localStorage.getItem("username") || `User${currentUserId}`;

    // Fetch recent conversations
    const fetchRecentChats = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${BACKEND_URL}/api/messages/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Handle both array response and {conversations: [...]} response
                const conversations = Array.isArray(data) ? data : (data.conversations || []);
                setRecentChats(conversations.map(conv => ({
                    id: conv.other_user?.id || conv.user_id || conv.id,
                    user_id: conv.other_user?.id || conv.user_id,
                    username: conv.other_user?.username || conv.username || conv.with_username,
                    display_name: conv.other_user?.display_name || conv.display_name,
                    profile_picture: conv.other_user?.profile_picture || conv.profile_picture || conv.avatar,
                    last_message: conv.last_message,
                    unread_count: conv.unread_count || conv.unread || 0
                })));
            }
        } catch (error) {
            console.error("Error fetching recent chats:", error);
        }
    }, []);

    // Search users
    const searchUsers = useCallback(async (query) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                // Handle both {users: [...]} and direct array response
                const userList = data.users || data || [];
                // Filter out current user
                const filtered = userList.filter(u => u.id !== currentUserId);
                setSearchResults(filtered);
            }
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setIsSearching(false);
        }
    }, [currentUserId]);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.length >= 2) {
            searchTimeoutRef.current = setTimeout(() => {
                searchUsers(searchQuery);
            }, 300);
        } else {
            setSearchResults([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchUsers]);

    // Fetch recent chats on mount
    useEffect(() => {
        fetchRecentChats();
    }, [fetchRecentChats]);

    // Select a user to chat with
    const selectRecipient = (user) => {
        setRecipientId(user.id);
        setRecipientName(user.display_name || user.username);
        setRecipientAvatar(user.profile_picture || user.avatar);
        setShowUserSearch(false);
        setSearchQuery("");
        setSearchResults([]);
        setMessages([]); // Clear messages for new chat
    };

    // Load chat history when recipient changes
    useEffect(() => {
        if (recipientId && room) {
            loadChatHistory();
        }
    }, [recipientId, room]);

    const loadChatHistory = async () => {
        setLoadingMessages(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${BACKEND_URL}/api/messages/history/${recipientId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                // Handle both {messages: [...]} and direct array response
                const messageList = data.messages || data || [];
                setMessages(messageList.map(msg => ({
                    ...msg,
                    senderId: msg.senderId || msg.sender_id,
                    message: msg.message || msg.text || msg.content,
                    timestamp: msg.timestamp || msg.created_at
                })));
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    // Socket connection
    useEffect(() => {
        if (!room) return;

        socket.emit("join_room", {
            roomId: room,
            userId: currentUserId,
            username: currentUserName
        });

        socket.on("receive_message", (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on("user_typing", ({ username }) => {
            if (enableTypingIndicator) setIsRecipientTyping(true);
        });

        socket.on("stop_typing", ({ username }) => {
            if (enableTypingIndicator) setIsRecipientTyping(false);
        });

        return () => {
            socket.emit("leave_room", room);
            socket.off("receive_message");
            socket.off("user_typing");
            socket.off("stop_typing");
        };
    }, [room, currentUserId, currentUserName, enableTypingIndicator]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, autoScroll]);

    const handleSend = () => {
        if (!newMessage.trim() && !mediaFile) return;
        if (!room) return;

        const msg = {
            roomId: room,
            senderId: currentUserId,
            message: newMessage,
            mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : null,
            timestamp: new Date().toISOString()
        };
        socket.emit("send_message", msg);
        setMessages((prev) => [...prev, msg]);
        setNewMessage("");
        setMediaFile(null);
        socket.emit("stop_typing", { roomId: room, username: currentUserName });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!typing && enableTypingIndicator && room) {
            setTyping(true);
            socket.emit("typing", { roomId: room, username: currentUserName });
        }
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            setTyping(false);
            if (room) {
                socket.emit("stop_typing", { roomId: room, username: currentUserName });
            }
        }, 1500);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMediaFile(file);
        }
    };

    // User Selection View
    const renderUserSelection = () => (
        <div className="chat-user-selection">
            <div className="user-search-section">
                <h3>💬 Start a Conversation</h3>
                <div className="search-input-container">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name or username..."
                        className="user-search-input"
                        autoFocus
                    />
                    {isSearching && <span className="search-spinner">🔄</span>}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <div className="search-results-list">
                        <h4>Search Results</h4>
                        {searchResults.map((user) => (
                            <div
                                key={user.id}
                                className="user-result-item"
                                onClick={() => selectRecipient(user)}
                            >
                                <img
                                    src={user.profile_picture || user.avatar || lady1}
                                    alt={user.display_name || user.username}
                                    className="user-result-avatar"
                                />
                                <div className="user-result-info">
                                    <span className="user-result-name">
                                        {user.display_name || user.username}
                                    </span>
                                    <span className="user-result-username">
                                        @{user.username}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="no-results">
                        <p>No users found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>

            {/* Recent Conversations */}
            {recentChats.length > 0 && (
                <div className="recent-chats-section">
                    <h4>Recent Conversations</h4>
                    <div className="recent-chats-list">
                        {recentChats.map((chat) => (
                            <div
                                key={chat.user_id || chat.id}
                                className="recent-chat-item"
                                onClick={() => selectRecipient({
                                    id: chat.user_id || chat.id,
                                    display_name: chat.display_name || chat.username,
                                    username: chat.username,
                                    profile_picture: chat.profile_picture || chat.avatar
                                })}
                            >
                                <img
                                    src={chat.profile_picture || chat.avatar || lady1}
                                    alt={chat.display_name || chat.username}
                                    className="recent-chat-avatar"
                                />
                                <div className="recent-chat-info">
                                    <span className="recent-chat-name">
                                        {chat.display_name || chat.username}
                                    </span>
                                    {chat.last_message && (
                                        <span className="recent-chat-preview">
                                            {chat.last_message.substring(0, 30)}...
                                        </span>
                                    )}
                                </div>
                                {chat.unread_count > 0 && (
                                    <span className="unread-badge">{chat.unread_count}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {recentChats.length === 0 && searchQuery.length < 2 && (
                <div className="empty-chats-state">
                    <span className="empty-icon">💬</span>
                    <p>Search for someone to start chatting!</p>
                    <small>Type a name or username above</small>
                </div>
            )}
        </div>
    );

    return (
        <div className="chat-modal-enhanced">
            {/* Modal Header */}
            <div className="chat-modal-header">
                <div className="chat-header-info">
                    {showUserSearch ? (
                        <h4>💬 New Conversation</h4>
                    ) : (
                        <>
                            <div className="chat-recipient-header">
                                {recipientAvatar && (
                                    <img 
                                        src={recipientAvatar} 
                                        alt={recipientName}
                                        className="chat-recipient-avatar"
                                    />
                                )}
                                <div>
                                    <h4>💬 {recipientName}</h4>
                                    <span className="chat-room-id">Room: {room}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="chat-header-controls">
                    {!showUserSearch && recipientId && (
                        <>
                            <div className="chat-tabs">
                                <button 
                                    className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('chat')}
                                >
                                    💬 Chat
                                </button>
                                <button 
                                    className={`chat-tab ${activeTab === 'video' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('video')}
                                >
                                    🎥 Video
                                </button>
                            </div>
                            <button 
                                className="new-chat-btn"
                                onClick={() => setShowUserSearch(true)}
                                title="New Conversation"
                            >
                                ➕
                            </button>
                        </>
                    )}
                    <button className="chat-close-btn" onClick={onClose}>✖</button>
                </div>
            </div>

            {/* Modal Content */}
            <div className="chat-modal-content">
                {showUserSearch ? (
                    renderUserSelection()
                ) : activeTab === 'chat' ? (
                    <>
                        {/* Chat Messages */}
                        <div className="chat-body-enhanced">
                            {loadingMessages ? (
                                <div className="chat-loading-state">
                                    <div className="loading-spinner-small"></div>
                                    <p>Loading messages...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="chat-empty-state">
                                    <span className="chat-empty-icon">💬</span>
                                    <p>No messages yet</p>
                                    <small>Start the conversation with {recipientName}!</small>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`chat-message-enhanced ${msg.senderId === currentUserId ? "sent" : "received"}`}
                                    >
                                        {msg.mediaUrl && (
                                            <img 
                                                src={msg.mediaUrl} 
                                                alt="attachment" 
                                                className="chat-media-enhanced" 
                                            />
                                        )}
                                        <div className="message-content">
                                            <p>{msg.message}</p>
                                            <small className="message-time">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </small>
                                        </div>
                                    </div>
                                ))
                            )}
                            
                            {isRecipientTyping && (
                                <div className="typing-indicator-enhanced">
                                    <div className="typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span>{recipientName} is typing...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="chat-input-enhanced">
                            {enableMediaUpload && (
                                <div className="media-upload-section">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={handleFileSelect}
                                        className="media-upload-input"
                                        id="chat-media-upload"
                                    />
                                    <label htmlFor="chat-media-upload" className="media-upload-btn">
                                        📎 Attach
                                    </label>
                                    {mediaFile && (
                                        <div className="media-preview">
                                            <span className="media-preview-name">{mediaFile.name}</span>
                                            <button 
                                                onClick={() => setMediaFile(null)}
                                                className="media-remove-btn"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="message-input-row">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={handleTyping}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    className="message-input-enhanced"
                                />
                                <button 
                                    onClick={handleSend}
                                    className="send-btn-enhanced"
                                    disabled={!newMessage.trim() && !mediaFile}
                                >
                                    📤 Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Video Chat Tab */
                    <div className="video-chat-section">
                        <WebRTCChat 
                            roomId={room}
                            userId={currentUserId}
                            userName={currentUserName}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatModal;