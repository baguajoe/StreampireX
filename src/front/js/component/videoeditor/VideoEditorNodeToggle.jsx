import React from "react";

const VideoEditorNodeToggle = ({ showNodeEditor = false, setShowNodeEditor = () => {} }) => {
  return (
    <button
      type="button"
      className={`spx-node-toggle ${showNodeEditor ? "active" : ""}`}
      onClick={() => setShowNodeEditor(!showNodeEditor)}
      title="Toggle Node Editor"
    >
      <span>Node Editor</span>
    </button>
  );
};

export default VideoEditorNodeToggle;
