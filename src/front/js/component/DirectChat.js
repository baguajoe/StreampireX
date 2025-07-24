import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("https://www.streampirex.com"); // ✅ Match your deployed socket server

const DirectChat = ({ currentUser, partnerUser }) => {
  const roomId = [currentUser.id, partnerUser.id].sort().join("-"); // Ensures same room for both
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    socket.emit("join_room", {
      roomId,
      userId: currentUser.id,
      username: currentUser.display_name || currentUser.username,
    });

    fetch(`/api/messages/room/${roomId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then(setMessages);

    socket.on("chat_message", (msg) => {
      if (msg.room === roomId) setMessages((prev) => [...prev, msg]);
    });

    socket.on("typing", ({ from }) => setTypingUser(from));
    socket.on("stop_typing", () => setTypingUser(null));

    return () => {
      socket.emit("stop_typing", { room: roomId, from: currentUser.id });
      socket.off("chat_message");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [roomId]);

  const handleSend = () => {
    socket.emit("chat_message", {
      room: roomId,
      from: currentUser.id,
      to: partnerUser.id,
      text,
    });
    setText("");
  };

  const handleTyping = () => {
    socket.emit("typing", { room: roomId, from: currentUser.id });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit("stop_typing", { room: roomId, from: currentUser.id });
    }, 1500);
  };

  return (
    <div className="direct-chat">
      <h4>Chat with {partnerUser.display_name || partnerUser.username}</h4>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.from === currentUser.id ? "sent" : "received"}>
            {msg.text}
          </div>
        ))}
      </div>
      {typingUser && <div className="typing-indicator">{typingUser} is typing...</div>}
      <div className="input-row">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};

export default DirectChat;
