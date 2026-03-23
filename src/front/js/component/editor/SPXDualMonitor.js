import React from "react";

const Monitor = ({ title, children, onPlay, onPause, onBack, onForward, isPlaying, time }) => {
  return (
    <div className="spx-monitor-panel">
      <div className="spx-editor-panel-header">
        <span>{title}</span>
        <div className="spx-monitor-time">{time.toFixed(1)}s</div>
      </div>

      <div className="spx-monitor-stage">
        <div className="spx-monitor-frame">
          {children}
          <div className="spx-monitor-safe-area" />
        </div>
      </div>

      <div className="spx-monitor-controls">
        <button className="spx-header-btn" onClick={onBack}>⏮</button>
        <button className="spx-header-btn" onClick={isPlaying ? onPause : onPlay}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className="spx-header-btn" onClick={onForward}>⏭</button>
      </div>
    </div>
  );
};

const SPXDualMonitor = ({ canvasRef, currentTime, isPlaying, togglePlay, stepTime }) => {
  return (
    <div className="spx-editor-canvas-wrap">
      <Monitor
        title="Source Monitor"
        time={currentTime}
        isPlaying={isPlaying}
        onPlay={togglePlay}
        onPause={togglePlay}
        onBack={() => stepTime(-0.5)}
        onForward={() => stepTime(0.5)}
      >
        <div className="spx-editor-canvas-placeholder">Source</div>
      </Monitor>

      <Monitor
        title="Program Monitor"
        time={currentTime}
        isPlaying={isPlaying}
        onPlay={togglePlay}
        onPause={togglePlay}
        onBack={() => stepTime(-0.5)}
        onForward={() => stepTime(0.5)}
      >
        <canvas ref={canvasRef} className="spx-editor-canvas" />
        <div className="spx-editor-canvas-placeholder">Program</div>
      </Monitor>
    </div>
  );
};

export default SPXDualMonitor;
