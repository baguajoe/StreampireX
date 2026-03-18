import React from "react";

export default function MotionToolbar({
  addTextLayer,
  addLowerThirdLayer,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  duration
}) {
  return (
    <div className="motion-toolbar">
      <div className="motion-toolbar-left">
        <button onClick={addTextLayer}>+ Text</button>
        <button onClick={addLowerThirdLayer}>+ Lower Third</button>
      </div>

      <div className="motion-toolbar-center">
        <button onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
        />
        <span>{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
      </div>
    </div>
  );
}
