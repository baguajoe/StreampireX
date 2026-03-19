import React from "react";
import { NODE_TYPES } from "./nodeTypes";

export default function NodeLibraryPanel({ addNode }) {
  return (
    <div className="nc-panel">
      <div className="nc-panel-title">Node Library</div>
      <div className="nc-node-library">
        {Object.values(NODE_TYPES).map((node) => (
          <button
            key={node.type}
            className="nc-library-btn"
            onClick={() => addNode(node.type)}
          >
            <span
              className="nc-library-dot"
              style={{ background: node.color }}
            />
            {node.label}
          </button>
        ))}
      </div>
    </div>
  );
}
