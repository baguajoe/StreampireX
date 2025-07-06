import React, { useState, useEffect, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import ChatBubble from "../component/ChatBubble";
import io from "socket.io-client";

const socket = io(process.env.BACKEND_URL || "http://localhost:3001", {
  transports: ["websocket"],
  auth: { token: localStorage.getItem("token") },
  withCredentials: true,
});

const GamersChatroomPage = () => {
  const { store } = useContext(Context);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatRef = useRef(null);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("🟢 Connected to gamers-global");
      socket.emit("joinRoom", { stream_id: "gamers-global" });
    });

    socket.on("receive_message", (msg) => {
      console.log(msg)
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit("leaveRoom", { stream_id: "gamers-global" });
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;

    const payload = {
      stream_id: "gamers-global",
      message: newMessage.trim(),
    };

    socket.emit("send_message", payload);
    setNewMessage("");
  };

  return (
    <div className="page-container">
      <h1>💬 Gamers Global Chatroom</h1>

      <div
        className="chat-box bg-dark text-white p-3 mb-3 rounded"
        style={{ maxHeight: "400px", overflowY: "scroll" }}
      >
        {messages.map((msg, index) => (
          <ChatBubble
            key={index}
            username={msg.username || "Anonymous"}
            content={msg.message}
            timestamp={msg.timestamp || ""}
            isCurrentUser={msg.user_id === store.user?.id}
          />
        ))}
        <div ref={chatRef} />
      </div>

      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default GamersChatroomPage;
