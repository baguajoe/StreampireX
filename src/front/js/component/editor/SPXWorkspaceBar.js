import React from "react";
import { SPX_WORKSPACES, SPX_DUAL_MONITOR_PRESETS } from "./SPXWorkspaces";
import * as Platform from "./SPXPlatformTools.step3patch.js";

const SPXWorkspaceBar = ({
  activeWorkspace,
  setActiveWorkspace,
  activeMonitorPreset,
  setActiveMonitorPreset,
  saveLayout,
  saveVersion,
  autosaveProject,
  addCommentAtPlayhead,
  createBrandKit,
  performance
}) => {
  return (
    <div className="spx-workspace-bar">
      <div className="spx-workspace-group">
        {SPX_WORKSPACES.map((ws) => (
          <button
            key={ws.id}
            className={`spx-workspace-btn ${activeWorkspace === ws.id ? "is-active" : ""}`}
            onClick={() => setActiveWorkspace(ws.id)}
          >
            {ws.name}
          </button>
        ))}
      </div>

      <div className="spx-workspace-group">
        <select
          className="spx-workspace-select"
          value={activeMonitorPreset}
          onChange={(e) => setActiveMonitorPreset(e.target.value)}
        >
          {SPX_DUAL_MONITOR_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>

        <button className="spx-workspace-btn" onClick={saveLayout}>Save Layout</button>
        <button className="spx-workspace-btn" onClick={saveVersion}>Snapshot</button>
        <button className="spx-workspace-btn" onClick={autosaveProject}>Autosave</button>
        <button className="spx-workspace-btn" onClick={() => addCommentAtPlayhead("Timeline note")}>Comment</button>
        <button className="spx-workspace-btn" onClick={createBrandKit}>Brand Kit</button>
        <span className="spx-workspace-metric">FPS {performance?.previewQuality || "half"}</span>
      </div>
    </div>
  );
};

export default SPXWorkspaceBar;
