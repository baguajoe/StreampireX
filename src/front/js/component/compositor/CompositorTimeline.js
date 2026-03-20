import React from "react";

export default function CompositorTimeline({
  currentTime = 0,
  duration = 10,
  setCurrentTime = () => {},
  playing = false,
  onTogglePlay = () => {},
}) {
  return (
    <div className="spx-comp-timeline">
      <div className="spx-comp-timeline-top">
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={onTogglePlay}>
          {playing ? "Pause" : "Play"}
        </button>
        <button className="spx-comp-btn" onClick={() => setCurrentTime(0)}>
          Rewind
        </button>
        <div className="spx-comp-time-readout">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      </div>

      <input
        className="spx-comp-range"
        type="range"
        min="0"
        max={duration}
        step="0.01"
        value={currentTime}
        onChange={(e) => setCurrentTime(Number(e.target.value))}
      />

      <div className="spx-comp-ruler">
        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
          <div key={i} className="spx-comp-ruler-mark">
            <span>{i}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
