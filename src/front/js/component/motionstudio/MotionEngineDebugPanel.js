import React from "react";

export default function MotionEngineDebugPanel({ evaluatedLayers = [], currentTime = 0 }) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Engine Debug</div>
      <div className="motion-dim" style={{ marginBottom: 8 }}>
        Evaluated at {currentTime.toFixed(2)}s
      </div>
      <div style={{ maxHeight: 220, overflow: "auto", fontSize: 12 }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(evaluatedLayers, null, 2)}
        </pre>
      </div>
    </div>
  );
}
