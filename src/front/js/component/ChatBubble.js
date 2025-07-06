import React from "react";

const ChatBubble = ({ username, content, timestamp, isCurrentUser }) => {
  return (
    <div className={`d-flex ${isCurrentUser ? "justify-content-end" : "justify-content-start"} mb-2`}>
      <div className={`p-2 rounded shadow-sm ${isCurrentUser ? "bg-primary text-white" : "bg-light text-dark"}`} style={{ maxWidth: "70%" }}>
        <div className="small fw-bold mb-1">{username}</div>
        <div>{content}</div>
        <div className="text-muted small text-end mt-1">{timestamp}</div>
      </div>
    </div>
  );
};

export default ChatBubble;
