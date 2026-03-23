import React from "react";
import VideoEditorNodeToggle from "./VideoEditorNodeToggle";

const ToolbarBtn = ({ label, onClick = () => {}, className = "" }) => (
  <button
    type="button"
    className={`spx-toolbar-btn ${className}`.trim()}
    onClick={onClick}
  >
    <span>{label}</span>
  </button>
);

const VideoEditorUnifiedToolbar = ({
  activeTool = "select",
  setActiveTool = () => {},
  showNodeEditor = false,
  setShowNodeEditor = () => {},
  onSave = () => {},
  onExport = () => {},
}) => {
  return (
    <div className="spx-unified-toolbar">
      <div className="spx-toolbar-group">
        <ToolbarBtn label="Select" onClick={() => setActiveTool("select")} className={activeTool === "select" ? "active" : ""} />
        <ToolbarBtn label="Cut" onClick={() => setActiveTool("cut")} className={activeTool === "cut" ? "active" : ""} />
        <ToolbarBtn label="Text" onClick={() => setActiveTool("text")} className={activeTool === "text" ? "active" : ""} />
        <ToolbarBtn label="FX" onClick={() => setActiveTool("fx")} className={activeTool === "fx" ? "active" : ""} />
        <ToolbarBtn label="Motion" onClick={() => setActiveTool("motion")} className={activeTool === "motion" ? "active" : ""} />
        <ToolbarBtn label="Captions" onClick={() => setActiveTool("captions")} className={activeTool === "captions" ? "active" : ""} />
      </div>

      <div className="spx-toolbar-divider" />

      <div className="spx-toolbar-group">
        <VideoEditorNodeToggle
          showNodeEditor={showNodeEditor}
          setShowNodeEditor={setShowNodeEditor}
        />
      </div>

      <div className="spx-toolbar-spacer" />

      <div className="spx-toolbar-group">
        <ToolbarBtn label="Save" onClick={onSave} />
        <ToolbarBtn label="Export" onClick={onExport} className="accent" />
      </div>
    </div>
  );
};

export default VideoEditorUnifiedToolbar;
