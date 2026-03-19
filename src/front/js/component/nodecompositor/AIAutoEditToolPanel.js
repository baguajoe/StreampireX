import React, { useState } from "react";

export default function AIAutoEditToolPanel() {
  const [style, setStyle] = useState("social");
  const [aggressiveness, setAggressiveness] = useState(0.5);
  const [captions, setCaptions] = useState(true);

  return (
    <div className="nc-tool-panel">
      <div className="nc-panel-title">AI Auto Edit</div>

      <div className="nc-tool-grid">
        <label className="nc-tool-field">
          <span>Style</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            <option value="social">Social Clip</option>
            <option value="cinematic">Cinematic</option>
            <option value="podcast">Podcast Promo</option>
            <option value="music">Music Visual</option>
          </select>
        </label>

        <label className="nc-tool-field nc-tool-field-wide">
          <span>Aggressiveness</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={aggressiveness}
            onChange={(e) => setAggressiveness(parseFloat(e.target.value))}
          />
          <small>{aggressiveness.toFixed(2)}</small>
        </label>

        <label className="nc-tool-check">
          <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />
          <span>Generate captions</span>
        </label>
      </div>

      <div className="nc-tool-actions">
        <button className="nc-btn-primary" type="button">Suggest Cuts</button>
        <button className="nc-btn-secondary" type="button">Build Edit Draft</button>
      </div>
    </div>
  );
}
