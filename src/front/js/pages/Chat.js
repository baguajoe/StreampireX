import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messageEndRef = useRef(null); // Reference for auto-scrolling

  useEffect(() => {
    // Listen for incoming chat messages from the server
    socket.on("chat_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Cleanup on component unmount
    return () => {
      socket.off("chat_message");
    };
  }, []);

  useEffect(() => {
    // Scroll to the bottom when new messages are added
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim() !== "") {  // Prevent sending empty messages
      socket.emit("chat_message", message);
      setMessage("");
    }
  };

  return (
    <div>
      <h2>💬 Live Chat</h2>
      <div style={{ height: "300px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
        {messages.map((msg, idx) => (
          <p key={idx}>{msg}</p>
        ))}
        <div ref={messageEndRef} /> {/* Auto-scroll reference */}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Chat;
