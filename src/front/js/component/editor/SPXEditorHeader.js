import React from "react";

const SPXEditorHeader = ({ editor }) => {
  const {
    projectName,
    isPlaying,
    handlePlayPause,
    handlePause,
    handleFastForward,
    handleExport
  } = editor;

  return (
    <div className="spx-editor-header">
      <div className="spx-editor-header-left">
        <div className="spx-editor-brand">SPX Editor</div>
        <div className="spx-editor-project">{projectName}</div>
      </div>

      <div className="spx-editor-header-center">
        <button className="spx-header-btn" type="button" onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="spx-header-btn" type="button" onClick={handlePause}>
          Pause
        </button>
        <button className="spx-header-btn spx-header-btn-accent" type="button" onClick={handleExport}>
          Export
        </button>
        <button className="spx-header-btn" type="button" onClick={handleFastForward}>
          +1s
        </button>
      </div>
    </div>
  );
};

export default SPXEditorHeader;
