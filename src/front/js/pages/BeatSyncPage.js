import React from "react";
import "../../styles/NodeCompositor.css";
import BeatSyncPanel from "../component/nodecompositor/BeatSyncPanel";

export default function BeatSyncPage() {
  return (
    <div className="nc-page">
      <div className="nc-topbar">
        <div>
          <div className="nc-title">Beat Sync</div>
          <div className="nc-subtitle">Analyze beats and drive motion timing</div>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 720 }}>
        <BeatSyncPanel />
      </div>
    </div>
  );
}
