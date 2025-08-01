import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import WebRTCChat from "./WebRTCChat";

const BACKEND_URL = "https://streampirex-api.up.railway.app"; // Or your actual API base


const socket = io(BACKEND_URL, {
    transports: ["websocket"],
    withCredentials: true
});

const ChatModal = ({
    recipientId,
    recipientName,
    currentUserId,
    onClose,
    enableTypingIndicator = true,
    enableThreads = true,
    autoScroll = true,
    enableMediaUpload = true,
    enableGroupChat = true
}) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [typing, setTyping] = useState(false);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [mediaFile, setMediaFile] = useState(null);
    const [activeTab, setActiveTab] = useState("chat"); // "chat" or "video"
    const chatEndRef = useRef(null);

    const room = [currentUserId, recipientId].sort().join("-");
    const currentUserName = localStorage.getItem("username") || `User${currentUserId}`;

    useEffect(() => {
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
    }, [room, recipientId, enableTypingIndicator, currentUserName]);

    useEffect(() => {
        if (autoScroll) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, autoScroll]);

    const handleSend = () => {
        if (!newMessage.trim() && !mediaFile) return;
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
        if (!typing && enableTypingIndicator) {
            setTyping(true);
            socket.emit("typing", { roomId: room, username: currentUserName });
        }
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            setTyping(false);
            socket.emit("stop_typing", { roomId: room, username: currentUserName });
        }, 1500);
    };

    return (
        <div className="chat-modal-enhanced">
            {/* Modal Header */}
            <div className="chat-modal-header">
                <div className="chat-header-info">
                    <h4>💬 Chat with {recipientName}</h4>
                    <span className="chat-room-id">Room: {room}</span>
                </div>
                <div className="chat-header-controls">
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
                    <button className="chat-close-btn" onClick={onClose}>✖</button>
                </div>
            </div>

            {/* Modal Content */}
            <div className="chat-modal-content">
                {activeTab === 'chat' ? (
                    <>
                        {/* Chat Messages */}
                        <div className="chat-body-enhanced">
                            {messages.map((msg, index) => (
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
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </small>
                                    </div>
                                </div>
                            ))}
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
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={(e) => setMediaFile(e.target.files[0])}
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
                                                ❌
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