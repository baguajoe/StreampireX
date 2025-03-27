// src/component/StartStopLiveStream.js
import React, { useEffect, useState } from "react";

const StartStopLiveStream = ({ isLive, stationId, onStart, onStop }) => {
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  // Start timer on live stream start
  useEffect(() => {
    if (isLive && !startTime) {
      const now = new Date();
      setStartTime(now);
    }
    if (!isLive) {
      setStartTime(null);
      setElapsed("00:00:00");
    }
  }, [isLive]);

  useEffect(() => {
    let timer;
    if (startTime) {
      timer = setInterval(() => {
        const diff = Math.floor((new Date() - startTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, "0");
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
        const secs = String(diff % 60).padStart(2, "0");
        setElapsed(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <div className="live-stream-controls">
      {isLive ? (
        <>
          <p>🟢 Your station is live!</p>
          <p>⏱ Time Elapsed: {elapsed}</p>
          <div className="audio-meter">🎚 Audio Level: [placeholder]</div>
          <button className="btn-stop" onClick={() => onStop(stationId)}>
            ⏹ Stop Live Stream
          </button>
        </>
      ) : (
        <>
          <p>🔴 Your station is offline.</p>
          <button className="btn-start" onClick={() => onStart(stationId)}>
            🎙 Start Live Stream
          </button>
        </>
      )}
    </div>
  );
};

export default StartStopLiveStream;
