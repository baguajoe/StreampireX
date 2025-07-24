import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "../../styles/TextChatPopup.css";

const socket = io("https://www.streampirex.com");

const TextChatPopup = ({ currentUser }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const roomId = "text-room"; // Static or dynamic group/DM
  const userId = currentUser?.id || "guest";
  const username = currentUser?.display_name || currentUser?.username || "Anonymous";

  useEffect(() => {
    if (open) {
      socket.emit("join_room", { roomId, userId, username });

      socket.on("chat_message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        socket.off("chat_message");
      };
    }
  }, [open, roomId, userId, username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = {
      room: roomId,
      from: username,
      text: input.trim(),
    };
    socket.emit("chat_message", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="text-chat-popup-wrapper">
      {!open && (
        <button className="open-chat-btn" onClick={() => setOpen(true)}>
          💬 Chat
        </button>
      )}

      {open && (
        <div className="text-chat-panel">
          <div className="text-chat-header">
            <span>💬 Text Chat</span>
            <button className="close-chat-btn" onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="text-chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.from === username ? "own" : ""}`}
              >
                <strong>{msg.from}:</strong> {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="text-chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextChatPopup;
