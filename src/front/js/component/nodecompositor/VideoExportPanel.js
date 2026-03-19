import React, { useState } from "react";

export default function VideoExportPanel({ nodes = [], edges = [], currentTime = 0 }) {
  const [format, setFormat] = useState("mp4");
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState(30);

  const handleExport = () => {
    console.log("🎬 Export requested", { format, resolution, fps, nodes, edges, currentTime });
    alert(`Export queued: ${format.toUpperCase()} • ${resolution} • ${fps}fps`);
  };

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">Video Export</div>

      <div className="nc-field">
        <label>Format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="mov">MOV</option>
          <option value="gif">GIF</option>
        </select>
      </div>

      <div className="nc-field">
        <label>Resolution</label>
        <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
          <option value="1280x720">1280×720</option>
          <option value="1920x1080">1920×1080</option>
          <option value="2560x1440">2560×1440</option>
          <option value="3840x2160">3840×2160</option>
        </select>
      </div>

      <div className="nc-field">
        <label>FPS</label>
        <input type="number" min="12" max="120" value={fps} onChange={(e) => setFps(parseInt(e.target.value || 30, 10))} />
      </div>

      <div className="nc-preview-meta">
        <div className="nc-dim">Nodes: {nodes.length}</div>
        <div className="nc-dim">Edges: {edges.length}</div>
        <div className="nc-dim">Current Time: {currentTime.toFixed(2)}s</div>
      </div>

      <button className="nc-primary-btn" onClick={handleExport}>Render Export</button>
    </div>
  );
}
