import React from "react";

const SPXNodeGraphPanel = ({ templates = [] }) => {
  return (
    <div className="spx-panel spx-node-panel">
      <div className="spx-section-title">Node Templates</div>

      <div className="spx-scroll-list">
        {templates.map((tpl) => (
          <div key={tpl.id} className="spx-node-template-card">
            <div className="spx-node-template-name">{tpl.name}</div>
            <div className="spx-node-template-category">{tpl.category}</div>
            <div className="spx-node-template-nodes">
              {(tpl.nodes || []).join(" • ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SPXNodeGraphPanel;
