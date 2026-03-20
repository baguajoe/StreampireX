import React from "react";

export default function MotionExportPanel({ settings, setSettings, exportFrame, exportProject }) {
  const set = (k, v) => setSettings((p) => ({ ...p, [k]: v }));

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Export</div>

      <input value={settings.name} onChange={(e) => set("name", e.target.value)} />

      <button onClick={exportFrame}>Export Frame</button>
      <button onClick={exportProject}>Export JSON</button>
    </div>
  );
}
