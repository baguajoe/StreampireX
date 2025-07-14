import React, { useState } from "react";
import WebRTCChat from "./WebRTCChat";

const VideoChatPopup = () => {
  const [open, setOpen] = useState(false);

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
          <WebRTCChat />
        </div>
      )}
    </div>
  );
};

export default VideoChatPopup;
