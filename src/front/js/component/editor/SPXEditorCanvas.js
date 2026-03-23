import React from "react";

const Monitor = ({ title, children }) => {
  return (
    <div className="spx-monitor-panel">
      <div className="spx-editor-panel-header">
        <span>{title}</span>
        <div className="spx-monitor-header-actions">
          <button className="spx-monitor-dot" />
          <button className="spx-monitor-dot" />
          <button className="spx-monitor-dot" />
        </div>
      </div>

      <div className="spx-monitor-stage">
        <div className="spx-monitor-frame">
          {children}
        </div>
      </div>

      <div className="spx-monitor-controls">
        <button className="spx-header-btn">⏮</button>
        <button className="spx-header-btn">▶</button>
        <button className="spx-header-btn">⏸</button>
        <button className="spx-header-btn">⏭</button>
      </div>
    </div>
  );
};

const SPXEditorCanvas = ({ editor }) => {
  const { canvasRef } = editor;

  return (
    <div className="spx-editor-canvas-wrap">
      <Monitor title="Source Monitor">
        <div className="spx-editor-canvas-placeholder">Source</div>
      </Monitor>

      <Monitor title="Program Monitor">
        <canvas ref={canvasRef} className="spx-editor-canvas" />
        <div className="spx-editor-canvas-placeholder">Program</div>
      </Monitor>
    </div>
  );
};

export default SPXEditorCanvas;
