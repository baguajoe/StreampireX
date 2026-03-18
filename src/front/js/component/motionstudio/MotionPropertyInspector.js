import React from "react";

export default function MotionPropertyInspector({ selectedLayer, updateLayer }) {
  if (!selectedLayer) {
    return (
      <div className="motion-panel">
        <div className="motion-panel-title">Inspector</div>
        <div className="motion-dim">Select a layer</div>
      </div>
    );
  }

  const set = (key, value) => updateLayer(selectedLayer.id, { [key]: value });

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Inspector</div>

      <label>Text</label>
      <input value={selectedLayer.text || ""} onChange={(e) => set("text", e.target.value)} />

      <label>Subtitle</label>
      <input value={selectedLayer.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} />

      <div className="motion-grid-2">
        <div>
          <label>X %</label>
          <input type="number" value={selectedLayer.x} onChange={(e) => set("x", parseFloat(e.target.value || 0))} />
        </div>
        <div>
          <label>Y %</label>
          <input type="number" value={selectedLayer.y} onChange={(e) => set("y", parseFloat(e.target.value || 0))} />
        </div>
      </div>

      <div className="motion-grid-2">
        <div>
          <label>Start</label>
          <input type="number" step="0.1" value={selectedLayer.startTime} onChange={(e) => set("startTime", parseFloat(e.target.value || 0))} />
        </div>
        <div>
          <label>Duration</label>
          <input type="number" step="0.1" value={selectedLayer.duration} onChange={(e) => set("duration", parseFloat(e.target.value || 0))} />
        </div>
      </div>

      <div className="motion-grid-2">
        <div>
          <label>Font Size</label>
          <input type="number" value={selectedLayer.fontSize} onChange={(e) => set("fontSize", parseFloat(e.target.value || 16))} />
        </div>
        <div>
          <label>Rotation</label>
          <input type="number" value={selectedLayer.rotation || 0} onChange={(e) => set("rotation", parseFloat(e.target.value || 0))} />
        </div>
      </div>

      <div className="motion-grid-2">
        <div>
          <label>Color</label>
          <input type="color" value={selectedLayer.color || "#ffffff"} onChange={(e) => set("color", e.target.value)} />
        </div>
        <div>
          <label>Type</label>
          <select value={selectedLayer.type || "text"} onChange={(e) => set("type", e.target.value)}>
            <option value="text">Text</option>
            <option value="lower_third">Lower Third</option>
          </select>
        </div>
      </div>

      <label>Animation</label>
      <input value={selectedLayer.animation || ""} onChange={(e) => set("animation", e.target.value)} />

      <div className="motion-checks">
        <label><input type="checkbox" checked={!!selectedLayer.shadow} onChange={(e) => set("shadow", e.target.checked)} /> Shadow</label>
        <label><input type="checkbox" checked={!!selectedLayer.outline} onChange={(e) => set("outline", e.target.checked)} /> Outline</label>
      </div>
    </div>
  );
}
