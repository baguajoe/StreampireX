import React, { useState, useEffect } from "react";
import "../../styles/InboxDrawer.css";

const InboxDrawer = ({ currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!currentUser?.id) return;

    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setConversations(data));
  }, [currentUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on("chat_message", (msg) => {
      if (msg.from === selectedUser?.id || msg.to === selectedUser?.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("chat_message");
  }, [socket, selectedUser]);

  const openChat = async (user) => {
    setSelectedUser(user);
    const room = [currentUser.id, user.id].sort().join("-");
    socket.emit("join_room", {
      roomId: room,
      userId: currentUser.id,
      username: currentUser.username,
    });

    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/messages/${user.id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const msgs = await res.json();
    setMessages(msgs);
  };

  const sendMessage = () => {
    if (!text.trim() || !selectedUser) return;
    const room = [currentUser.id, selectedUser.id].sort().join("-");
    socket.emit("chat_message", {
      room,
      from: currentUser.id,
      to: selectedUser.id,
      text,
    });
    setMessages((prev) => [...prev, { from: currentUser.id, to: selectedUser.id, text }]);
    setText("");
  };

  return (
    <div className="inbox-drawer">
      <div className="conversation-list">
        <h4>Inbox</h4>
        {conversations.map((c) => (
          <button key={c.conversation_id} onClick={() => openChat({ id: c.with_user_id, username: c.with_username })}>
            {c.with_username}
          </button>
        ))}
      </div>

      {selectedUser && (
        <div className="chat-box">
          <div className="chat-header">
            <strong>{selectedUser.username}</strong>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.from === currentUser.id ? "sent" : "received"}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message..." />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxDrawer;
