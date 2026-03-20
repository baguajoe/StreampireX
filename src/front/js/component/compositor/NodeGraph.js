import React from "react";

export default function NodeGraph({ nodes = [], selectedId = null, onSelect = () => {} }) {
  return (
    <div className="spx-node-graph">
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`spx-node ${selectedId === node.id ? "active" : ""}`}
          style={{ left: node.x ?? 100, top: node.y ?? 100 }}
          onClick={() => onSelect(node.id)}
        >
          <div className="spx-node-title">{node.type}</div>
          <div className="spx-node-sub">{node.id}</div>
        </button>
      ))}
    </div>
  );
}
