import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/profilevideocallbutton.css";

const ProfileVideoCallButton = ({ targetUser }) => {
  const navigate = useNavigate();

  const startVideoCall = () => {
    const roomId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    navigate(`/webrtc/${roomId}`, {
      state: {
        targetUserId: targetUser.id,
        targetUserName: targetUser.username || targetUser.display_name
      }
    });
  };

  return (
    <button 
      className="quick-action-btn video-call"
      onClick={startVideoCall}
      title="Start Video Call"
    >
      📹 Video
    </button>
  );
};

export default ProfileVideoCallButton;