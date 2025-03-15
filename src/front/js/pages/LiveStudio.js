import React, { useState } from "react";
import "./LiveStudio.css";

const LiveStudio = ({ isOpen, onClose }) => {
    const [isLive, setIsLive] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);

    const startLiveStream = () => {
        setIsLive(true);
        // API Call to start the live session
    };

    const endLiveStream = () => {
        setIsLive(false);
        // API Call to end the session
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="live-studio-modal">
            <div className="live-studio-content">
                <button className="close-btn" onClick={onClose}>❌</button>
                <h2>🎙️ Live Studio</h2>
                <div className="video-preview">
                    {cameraOn ? <p>📷 Camera ON</p> : <p>❌ Camera OFF</p>}
                </div>
                <div className="controls">
                    <button onClick={() => setMicOn(!micOn)}>
                        {micOn ? "🎤 Mute Mic" : "🎙️ Unmute Mic"}
                    </button>
                    <button onClick={() => setCameraOn(!cameraOn)}>
                        {cameraOn ? "📹 Turn Off Camera" : "📷 Turn On Camera"}
                    </button>
                    {!isLive ? (
                        <button className="go-live" onClick={startLiveStream}>
                            🚀 Go Live
                        </button>
                    ) : (
                        <button className="end-live" onClick={endLiveStream}>
                            ❌ End Live
                        </button>
                    )}
                </div>
                {isLive && <p>🔴 You are live! Listeners: 100</p>}
            </div>
        </div>
    );
};

export default LiveStudio;
