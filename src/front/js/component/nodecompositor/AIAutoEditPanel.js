import React, { useState } from "react";

export default function AIAutoEditPanel({ nodes = [], edges = [] }) {
  const [mode, setMode] = useState("social");
  const [aggressiveness, setAggressiveness] = useState(0.6);
  const [addTransitions, setAddTransitions] = useState(true);
  const [cutSilence, setCutSilence] = useState(true);

  const handleGenerate = () => {
    console.log("🤖 AI auto edit", { mode, aggressiveness, addTransitions, cutSilence, nodes, edges });
    alert(`AI Auto Edit prepared • ${mode} mode`);
  };

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">AI Auto Edit</div>

      <div className="nc-field">
        <label>Mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="social">Social Clips</option>
          <option value="music">Music Video</option>
          <option value="podcast">Podcast Highlights</option>
          <option value="cinematic">Cinematic</option>
        </select>
      </div>

      <div className="nc-field">
        <label>Aggressiveness</label>
        <input type="range" min="0" max="1" step="0.05" value={aggressiveness} onChange={(e) => setAggressiveness(parseFloat(e.target.value))} />
        <div className="nc-dim">{Math.round(aggressiveness * 100)}%</div>
      </div>

      <label className="nc-check">
        <input type="checkbox" checked={addTransitions} onChange={(e) => setAddTransitions(e.target.checked)} />
        <span>Add transitions</span>
      </label>

      <label className="nc-check">
        <input type="checkbox" checked={cutSilence} onChange={(e) => setCutSilence(e.target.checked)} />
        <span>Cut silence / dead space</span>
      </label>

      <div className="nc-preview-meta">
        <div className="nc-dim">Nodes: {nodes.length}</div>
        <div className="nc-dim">Edges: {edges.length}</div>
      </div>

      <button className="nc-primary-btn" onClick={handleGenerate}>Generate AI Edit Plan</button>
    </div>
  );
}
