import React from "react";

export default function MotionPathPanel({
  pathPresets,
  selectedPathPreset,
  setSelectedPathPreset,
  applyPathPresetToSelected,
  clearPathFromSelected,
  selectedLayer
}) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Path Animation</div>

      <select value={selectedPathPreset} onChange={(e) => setSelectedPathPreset(e.target.value)}>
        {pathPresets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <div className="motion-mini-actions">
        <button onClick={applyPathPresetToSelected} disabled={!selectedLayer}>Apply Path</button>
        <button onClick={clearPathFromSelected} disabled={!selectedLayer}>Clear Path</button>
      </div>
    </div>
  );
}
