import React from "react";

export default function MotionCameraPanel({
  cameraPresets,
  cameraPreset,
  setCameraPreset
}) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">2.5D Camera</div>
      <select value={cameraPreset} onChange={(e) => setCameraPreset(e.target.value)}>
        {cameraPresets.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <div className="motion-dim" style={{ marginTop: 8 }}>
        Camera preset is selected and ready for later timeline hookup.
      </div>
    </div>
  );
}
