import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000"); // update to your WebSocket server

const GroupChat = ({ groupId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    socket.emit("join_group", { groupId });

    socket.on("receive_group_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_group_message");
    };
  }, [groupId]);

  const sendMessage = () => {
    if (!text.trim()) return;
    socket.emit("send_group_message", {
      groupId,
      text,
      senderId: currentUser.id,
    });
    setText("");
  };

  return (
    <div className="group-chat">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.senderName || "User"}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default GroupChat;
