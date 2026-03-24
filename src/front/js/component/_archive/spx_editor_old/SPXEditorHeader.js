import React from "react";

const SPXEditorHeader = ({ editor, onOpenExport }) => {
  const {
    projectName,
    isPlaying,
    handlePlayPause,
    handlePause,
    handleFastForward,
    activeSequencePresetId,
    setActiveSequencePresetId,
    sequencePresets
  } = editor;

  return (
    <div className="spx-editor-header">
      <div className="spx-editor-header-left">
        <div className="spx-editor-brand">SPX Editor</div>
        <div className="spx-editor-project">{projectName}</div>
      </div>

      <div className="spx-editor-header-center">
        <select
          className="spx-sequence-select"
          value={activeSequencePresetId}
          onChange={(e) => setActiveSequencePresetId(e.target.value)}
        >
          {(sequencePresets || []).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        <button className="spx-header-btn" type="button" onClick={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="spx-header-btn" type="button" onClick={handlePause}>
          Pause
        </button>
        <button className="spx-header-btn spx-header-btn-accent" type="button" onClick={onOpenExport}>
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
