import React, { useState, useEffect } from "react";
import WebRTCChat from "./WebRTCChat";
import { v4 as uuidv4 } from "uuid";
import "../../styles/VideoChatPopup.css";

const VideoChatPopup = ({ currentUser }) => {
  const [open, setOpen] = useState(false);

  // 👤 User info fallback
  const userId = currentUser?.id || uuidv4();
  const userName = currentUser?.display_name || currentUser?.username || "Anonymous";

  // 🆔 Static or dynamic room — update this logic as needed
  const roomId = "stream-room";

  // ⎋ Escape key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="video-chat-middle-wrapper">
      {!open && (
        <button className="open-video-btn" onClick={() => setOpen(true)}>
          🎥 Open Video Chat
        </button>
      )}

      {open && (
        <div className="video-chat-panel">
          <div className="video-chat-header">
            <span>🎥 Video Chat</span>
            <button className="close-video-btn" onClick={() => setOpen(false)}>
              ✖
            </button>
          </div>

          <div className="video-chat-room-id">
            <small>Room: <strong>{roomId}</strong></small>
          </div>

          <WebRTCChat 
            roomId={roomId}
            userId={userId}
            userName={userName}
          />
        </div>
      )}
    </div>
  );
};

export default VideoChatPopup;
