import React from "react";

export default function MotionLayerPanel({
  layers,
  selectedLayerId,
  setSelectedLayerId,
  removeLayer
}) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Layers</div>
      <div className="motion-list">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`motion-list-item ${selectedLayerId === layer.id ? "active" : ""}`}
            onClick={() => setSelectedLayerId(layer.id)}
          >
            <div>
              <strong>{layer.name}</strong>
              <div className="motion-dim">{layer.type}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeLayer(layer.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
