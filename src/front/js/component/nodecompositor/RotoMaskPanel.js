import React from "react";
import { createBezierMaskPoint } from "../../utils/compositor/maskUtils";

export default function RotoMaskPanel({ rotoMasks, setRotoMasks }) {
  const active = rotoMasks?.[0];

  const update = (patch) => {
    setRotoMasks((prev) => [{ ...prev[0], ...patch }, ...(prev.slice(1) || [])]);
  };

  const addPoint = () => {
    const next = createBezierMaskPoint(50, 50);
    update({ points: [...(active?.points || []), next] });
  };

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">Roto / Mask</div>

      <label className="nc-field">
        <span>Shape</span>
        <select value={active?.shape || "rectangle"} onChange={(e) => update({ shape: e.target.value })}>
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="bezier">Bezier</option>
        </select>
      </label>

      <label className="nc-field"><span>Center X</span>
        <input type="number" value={active?.x ?? 50} onChange={(e) => update({ x: parseFloat(e.target.value || 0) })} />
      </label>

      <label className="nc-field"><span>Center Y</span>
        <input type="number" value={active?.y ?? 50} onChange={(e) => update({ y: parseFloat(e.target.value || 0) })} />
      </label>

      <label className="nc-field"><span>Width</span>
        <input type="number" value={active?.width ?? 40} onChange={(e) => update({ width: parseFloat(e.target.value || 0) })} />
      </label>

      <label className="nc-field"><span>Height</span>
        <input type="number" value={active?.height ?? 40} onChange={(e) => update({ height: parseFloat(e.target.value || 0) })} />
      </label>

      <label className="nc-field"><span>Feather</span>
        <input type="range" min="0" max="100" step="1" value={active?.feather ?? 0} onChange={(e) => update({ feather: parseFloat(e.target.value || 0) })} />
      </label>

      <label className="nc-row">
        <input type="checkbox" checked={!!active?.invert} onChange={(e) => update({ invert: e.target.checked })} />
        <span>Invert</span>
      </label>

      <button className="nc-btn-primary" type="button" onClick={addPoint}>
        Add Bezier Point
      </button>

      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
        Points: {(active?.points || []).length}
      </div>
    </div>
  );
}
