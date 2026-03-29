import '../../styles/VideoEditorComponent.css';
import "../../styles/VideoEditor.css";
// =============================================================================
// VideoEditor.js - Video Editor Page
// =============================================================================
// Location: src/front/js/pages/VideoEditor.js
// Route: /video-editor
// Now includes AI Video Tools (Auto-Captions, Silence Removal, Thumbnail Gen)
// =============================================================================

import React from "react";
import VideoEditorComponent from "../component/VideoEditorComponent";
import AIVideoTools from "../component/AIVideoTools";
import '../../styles/AIVideoTools.css';

const VideoEditor = () => {
  return (
    <div className="video-editor-page">
      <VideoEditorComponent />
      {/* ── AI Video Tools: Auto-Captions, Silence Removal, AI Thumbnails ── */}
      <AIVideoTools
        isEmbedded={true}
        videoUrl={undefined}
        onVideoUpdate={(url) => console.log('AI video update:', url)}
        onCaptionsGenerated={(captions) => console.log('Captions:', captions)}
      />
    </div>
  );
};

export default VideoEditor;