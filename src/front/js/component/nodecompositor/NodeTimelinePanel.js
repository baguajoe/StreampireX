import React from "react";

export default function NodeTimelinePanel({
  currentTime,
  duration = 10,
  isPlaying,
  setCurrentTime,
  setIsPlaying
}) {
  const handleScrub = (e) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  return (
    <div className="nc-timeline">
      <div className="nc-timeline-controls">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button onClick={() => setCurrentTime(0)}>
          ⏮ Reset
        </button>

        <span>
          {currentTime.toFixed(2)}s / {duration}s
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={currentTime}
        onChange={handleScrub}
        className="nc-timeline-slider"
      />
    </div>
  );
}
