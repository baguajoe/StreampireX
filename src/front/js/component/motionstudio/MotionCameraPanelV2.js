import React from "react";

export default function MotionCameraPanelV2({ camera, updateCamera, resetCamera }) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">2.5D Camera</div>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          X
          <input
            type="number"
            value={camera.x}
            onChange={(e) => updateCamera({ x: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Y
          <input
            type="number"
            value={camera.y}
            onChange={(e) => updateCamera({ y: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Z
          <input
            type="number"
            value={camera.z}
            onChange={(e) => updateCamera({ z: parseFloat(e.target.value || 1000) })}
          />
        </label>

        <label>
          Zoom
          <input
            type="number"
            step="0.1"
            value={camera.zoom}
            onChange={(e) => updateCamera({ zoom: parseFloat(e.target.value || 1) })}
          />
        </label>

        <label>
          Rotation
          <input
            type="number"
            step="0.1"
            value={camera.rotation}
            onChange={(e) => updateCamera({ rotation: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Perspective
          <input
            type="number"
            value={camera.perspective}
            onChange={(e) => updateCamera({ perspective: parseFloat(e.target.value || 800) })}
          />
        </label>

        <button onClick={resetCamera}>Reset Camera</button>
      </div>
    </div>
  );
}
