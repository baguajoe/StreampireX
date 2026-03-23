import React from "react";

const SPXEditorInspector = () => {
  return (
    <aside className="spx-editor-inspector">
      <div className="spx-editor-panel-header">
        <span>Effect Controls</span>
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Transform</div>

        <div className="spx-inspector-group">
          <label>Position X</label>
          <input className="spx-input" type="number" defaultValue="0" />
        </div>

        <div className="spx-inspector-group">
          <label>Position Y</label>
          <input className="spx-input" type="number" defaultValue="0" />
        </div>

        <div className="spx-inspector-group">
          <label>Scale</label>
          <input className="spx-input" type="number" defaultValue="100" />
        </div>

        <div className="spx-inspector-group">
          <label>Rotation</label>
          <input className="spx-input" type="number" defaultValue="0" />
        </div>
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Effects Stack</div>
        <div className="spx-effect-chip">Motion</div>
        <div className="spx-effect-chip">Opacity</div>
        <div className="spx-effect-chip">Lumetri Color</div>
        <div className="spx-effect-chip">Gaussian Blur</div>
      </div>
    </aside>
  );
};

export default SPXEditorInspector;
