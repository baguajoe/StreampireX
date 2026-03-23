import React from "react";
import VideoEditorBottomTabs from "./VideoEditorBottomTabs";

const VideoEditorTimeline = ({ showNodeEditor, activeBottomTab, setActiveBottomTab }) => {
  return (
    <div className="timeline-container">
      {showNodeEditor && (
        <div className="spx-node-editor-panel">
          <div className="spx-node-editor-header">Node Editor</div>
          <div className="spx-node-editor-body">
            Node graph canvas / compositing pipeline / effect routing goes here.
          </div>
        </div>
      )}

      <VideoEditorBottomTabs
        activeTab={activeBottomTab}
        setActiveTab={setActiveBottomTab}
      />

      <div className="timeline-shell">
        <div className="timeline-header">
          <span>Timeline</span>
        </div>
        <div className="timeline-track-area" />
      </div>
    </div>
  );
};

export default VideoEditorTimeline;
