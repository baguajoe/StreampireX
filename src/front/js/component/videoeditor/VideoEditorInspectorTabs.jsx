import React from "react";
import { INSPECTOR_TABS } from "./videoEditorToolbarConfig";

const VideoEditorInspectorTabs = ({ activeTab = "transform", setActiveTab = () => {} }) => {
  return (
    <div className="spx-inspector-tabs">
      {INSPECTOR_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`spx-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default VideoEditorInspectorTabs;
