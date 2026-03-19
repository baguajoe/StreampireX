import React from "react";
import "../../styles/NodeCompositor.css";
import VideoExportPanel from "../component/nodecompositor/VideoExportPanel";

export default function VideoExportPage() {
  return (
    <div className="nc-page">
      <div className="nc-topbar">
        <div>
          <div className="nc-title">Video Export</div>
          <div className="nc-subtitle">Render node animation to MP4</div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 720 }}>
        <VideoExportPanel duration={5} />
      </div>
    </div>
  );
}
