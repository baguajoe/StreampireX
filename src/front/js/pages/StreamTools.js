// src/pages/StreamTools.js
import React, { useState, useEffect } from "react";
import "../../styles/StreamTools.css";

const StreamTools = () => {
  const [streamKey] = useState("sk_live_xxx-xxxx-xxxx");
  const [isWebRTC, setIsWebRTC] = useState(true);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0.4);
  const [duration, setDuration] = useState("--:--");

  useEffect(() => {
    let interval;
    if (streamStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - streamStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const seconds = (elapsed % 60).toString().padStart(2, "0");
        setDuration(`${minutes}:${seconds}`);

        // Fake audio level pulse for now
        setAudioLevel(Math.random());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [streamStartTime]);

  const handleStartStream = () => setStreamStartTime(Date.now());
  const handleStopStream = () => {
    setStreamStartTime(null);
    setDuration("--:--");
  };

  return (
    <div className="stream-tools-container">
      <h1>🛠️ Stream Tools</h1>

      {streamStartTime && <p className="live-indicator">🔴 LIVE</p>}

      <div className="stream-section">
        <h2>⏱ Stream Time</h2>
        <p className="stream-timer">{duration}</p>
      </div>

      <div className="stream-section">
        <h2>🎚 Audio Level</h2>
        <div className="audio-meter">
          <div className="audio-bar" style={{ width: `${audioLevel * 100}%` }} />
        </div>
      </div>

      <div className="stream-section">
        <h2>🎥 Stream Mode</h2>
        <div className="stream-mode-toggle">
          <label className={isWebRTC ? "selected" : ""}>
            <input
              type="radio"
              name="streamMode"
              checked={isWebRTC}
              onChange={() => setIsWebRTC(true)}
            />
            WebRTC (Browser)
          </label>
          <label className={!isWebRTC ? "selected" : ""}>
            <input
              type="radio"
              name="streamMode"
              checked={!isWebRTC}
              onChange={() => setIsWebRTC(false)}
            />
            OBS / External
          </label>
        </div>

        {!isWebRTC && (
          <div className="stream-key-box">
            <h3>🔑 Stream Key</h3>
            <input
              type="text"
              value={streamKey}
              readOnly
              onClick={(e) => e.target.select()}
            />
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(streamKey)}
            >
              📋 Copy Key
            </button>
            <p>Paste this into OBS settings to stream live to StreampireX</p>
          </div>
        )}
      </div>

      <div className="stream-controls">
        <button className="start-btn" onClick={handleStartStream}>
          🎙 Start Stream
        </button>
        <button className="stop-btn" onClick={handleStopStream}>
          ⏹ Stop Stream
        </button>
      </div>
    </div>
  );
};

export default StreamTools;
