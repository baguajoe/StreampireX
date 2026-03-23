import React from "react";
import { BOTTOM_TABS } from "./videoEditorToolbarConfig";

const VideoEditorBottomTabs = ({ activeTab = "timeline", setActiveTab = () => {} }) => {
  return (
    <div className="spx-bottom-tabs">
      {BOTTOM_TABS.map((tab) => (
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

export default VideoEditorBottomTabs;
