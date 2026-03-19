import React, { useState } from "react";

export default function BeatSyncPanel({ nodes = [], currentTime = 0 }) {
  const [bpm, setBpm] = useState(120);
  const [offsetMs, setOffsetMs] = useState(0);
  const [snapStrength, setSnapStrength] = useState(0.8);

  const handleAnalyze = () => {
    console.log("🥁 Beat sync analyze", { bpm, offsetMs, snapStrength, nodes, currentTime });
    alert(`Beat sync ready • BPM ${bpm} • Offset ${offsetMs}ms`);
  };

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">Beat Sync</div>

      <div className="nc-field">
        <label>BPM</label>
        <input type="number" min="40" max="240" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value || 120, 10))} />
      </div>

      <div className="nc-field">
        <label>Offset (ms)</label>
        <input type="number" min="-2000" max="2000" value={offsetMs} onChange={(e) => setOffsetMs(parseInt(e.target.value || 0, 10))} />
      </div>

      <div className="nc-field">
        <label>Snap Strength</label>
        <input type="range" min="0" max="1" step="0.05" value={snapStrength} onChange={(e) => setSnapStrength(parseFloat(e.target.value))} />
        <div className="nc-dim">{Math.round(snapStrength * 100)}%</div>
      </div>

      <div className="nc-preview-meta">
        <div className="nc-dim">Current Time: {currentTime.toFixed(2)}s</div>
        <div className="nc-dim">Graph Nodes: {nodes.length}</div>
      </div>

      <button className="nc-primary-btn" onClick={handleAnalyze}>Analyze / Apply Beat Sync</button>
    </div>
  );
}
