import React, { useState } from "react";

export default function VideoExportToolPanel({ projectName = "Untitled", currentTime = 0, duration = 10 }) {
  const [format, setFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState(30);

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">Video Export</div>

      <div className="nc-tool-grid">
        <label className="nc-tool-field">
          <span>Project</span>
          <input value={projectName} readOnly />
        </label>

        <label className="nc-tool-field">
          <span>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="mp4">MP4</option>
            <option value="mov">MOV</option>
            <option value="webm">WEBM</option>
            <option value="gif">GIF</option>
          </select>
        </label>

        <label className="nc-tool-field">
          <span>Resolution</span>
          <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            <option value="1280x720">1280 × 720</option>
            <option value="1920x1080">1920 × 1080</option>
            <option value="2560x1440">2560 × 1440</option>
            <option value="3840x2160">3840 × 2160</option>
          </select>
        </label>

        <label className="nc-tool-field">
          <span>FPS</span>
          <select value={fps} onChange={(e) => setFps(parseInt(e.target.value, 10))}>
            <option value={24}>24</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </label>
      </div>

      <div className="nc-tool-note">
        Current playhead: {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
      </div>

      <div className="nc-tool-actions">
        <button className="nc-btn-primary" type="button">Render Current Frame</button>
        <button className="nc-btn-primary" type="button">Queue Full Export</button>
      </div>
    </div>
  );
}
