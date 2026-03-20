import React from "react";

export default function Camera25DPanel({ camera25D, setCamera25D }) {
  const set = (k, v) => setCamera25D((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">2.5D Camera</div>

      <label className="nc-field"><span>X</span>
        <input type="number" value={camera25D.x} onChange={(e) => set("x", parseFloat(e.target.value || 0))} />
      </label>

      <label className="nc-field"><span>Y</span>
        <input type="number" value={camera25D.y} onChange={(e) => set("y", parseFloat(e.target.value || 0))} />
      </label>

      <label className="nc-field"><span>Z</span>
        <input type="number" value={camera25D.z} onChange={(e) => set("z", parseFloat(e.target.value || 1000))} />
      </label>

      <label className="nc-field"><span>Zoom</span>
        <input type="number" step="0.1" value={camera25D.zoom} onChange={(e) => set("zoom", parseFloat(e.target.value || 1))} />
      </label>

      <label className="nc-field"><span>Rotation</span>
        <input type="number" step="0.1" value={camera25D.rotation} onChange={(e) => set("rotation", parseFloat(e.target.value || 0))} />
      </label>

      <label className="nc-field"><span>Perspective</span>
        <input type="number" step="1" value={camera25D.perspective} onChange={(e) => set("perspective", parseFloat(e.target.value || 800))} />
      </label>
    </div>
  );
}
