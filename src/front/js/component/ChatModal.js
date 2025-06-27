import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "../../styles/ChatModal.css";

const socket = io(process.env.BACKEND_URL || "https://your-backend-url", {
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
    const chatEndRef = useRef(null);

    const room = [currentUserId, recipientId].sort().join("-");

    useEffect(() => {
        socket.emit("join_room", {
            roomId: room,
            userId: currentUserId,
            username: `User${currentUserId}`
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
    }, [room, recipientId, enableTypingIndicator]);

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
        socket.emit("stop_typing", { roomId: room, username: `User${currentUserId}` });
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!typing && enableTypingIndicator) {
            setTyping(true);
            socket.emit("typing", { roomId: room, username: `User${currentUserId}` });
        }
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            setTyping(false);
            socket.emit("stop_typing", { roomId: room, username: `User${currentUserId}` });
        }, 1500);
    };

    return (
        <div className="chat-modal">
            <div className="chat-header">
                <h4>Chat with {recipientName}</h4>
                <button onClick={onClose}>✖</button>
            </div>
            <div className="chat-body">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`chat-message ${msg.senderId === currentUserId ? "sent" : "received"}`}
                    >
                        {msg.mediaUrl && <img src={msg.mediaUrl} alt="attachment" className="chat-media" />}
                        <p>{msg.message}</p>
                        <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
                    </div>
                ))}
                {isRecipientTyping && <p className="typing-indicator">Typing...</p>}
                <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
                {enableMediaUpload && (
                    <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => setMediaFile(e.target.files[0])}
                    />
                )}
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default ChatModal;
