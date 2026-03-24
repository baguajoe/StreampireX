import React, { useMemo, useState } from "react";
import SPXDualMonitor from "./SPXDualMonitor";
import SPXBinTree from "./SPXBinTree";
import SPXBinContentPanel from "./SPXBinContentPanel";
import SPXInspectorPanel from "./SPXInspectorPanel";
import SPXWorkspaceBar from "./SPXWorkspaceBar";
import { buildDockLayout } from "./SPXDockLayout";
import {
  ALL_VIDEO_PRESETS,
  ALL_NODE_TEMPLATES,
  ALL_LUTS
} from "./spxAllPresets.js";
import { SPX_ADVANCED_BIN_DATA } from "./SPXAdvancedBins";

const SPXPanelLayout = ({ editor }) => {
  const [activeNodeId, setActiveNodeId] = useState("effects_video");
  const [activeWorkspace, setActiveWorkspace] = useState("editing");
  const [activeMonitorPreset, setActiveMonitorPreset] = useState("source_program");

  const saveLayout = () => {
    const payload = {
      workspace: activeWorkspace,
      monitorPreset: activeMonitorPreset,
      activeNodeId
    };
    localStorage.setItem("spx_saved_layout", JSON.stringify(payload));
  };

  const dockLayout = buildDockLayout(activeWorkspace, activeMonitorPreset);

  const tree = useMemo(() => [
    {
      id: "root_smart",
      name: "Smart Folders",
      count: SPX_ADVANCED_BIN_DATA.smartFolders.length,
      children: [
        { id: "smart_favorites", name: "Favorites", count: 0 },
        { id: "smart_cinematic", name: "Cinematic", count: 0 },
        { id: "smart_social", name: "Social", count: 0 },
        { id: "smart_glitch", name: "Glitch / Stylized", count: 0 },
        { id: "smart_audio", name: "Audio Essentials", count: 0 }
      ]
    },
    {
      id: "root_project",
      name: "Project",
      count: 4,
      children: [
        { id: "project_media", name: "Media", count: (editor.assets || []).length },
        { id: "project_sequences", name: "Sequences", count: 0 },
        { id: "project_titles", name: "Titles", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Titles").length },
        { id: "project_adjustments", name: "Adjustment Layers", count: 0 }
      ]
    },
    {
      id: "root_effects",
      name: "Effects",
      count: 4,
      children: [
        { id: "effects_video", name: "Video FX", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Video FX").length },
        { id: "effects_audio", name: "Audio FX", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Audio").length },
        { id: "effects_transitions", name: "Transitions", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Transitions").length },
        { id: "effects_generators", name: "Generators", count: 0 }
      ]
    },
    {
      id: "root_presets",
      name: "Presets",
      count: 5,
      children: [
        { id: "presets_motion", name: "Motion", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Motion").length },
        { id: "presets_color", name: "Color", count: ALL_LUTS.length },
        { id: "presets_text", name: "Text", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Titles").length },
        { id: "presets_audio", name: "Audio", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Audio").length },
        { id: "presets_export", name: "Export", count: 0 }
      ]
    },
    {
      id: "root_assets",
      name: "Assets",
      count: 5,
      children: [
        { id: "assets_templates", name: "Templates", count: 0 },
        { id: "assets_luts", name: "LUTs", count: ALL_LUTS.length },
        { id: "assets_overlays", name: "Overlays", count: 0 },
        { id: "assets_lowerthirds", name: "Lower Thirds", count: ALL_VIDEO_PRESETS.filter((p) => p.category === "Titles").length },
        { id: "assets_logos", name: "Logos", count: 0 }
      ]
    },
    {
      id: "root_nodes",
      name: "Nodes",
      count: 5,
      children: [
        { id: "nodes_compositing", name: "Compositing", count: ALL_NODE_TEMPLATES.filter((n) => n.category === "Compositing" || n.category === "Layout").length },
        { id: "nodes_color", name: "Color Pipelines", count: ALL_NODE_TEMPLATES.filter((n) => n.category === "Color").length },
        { id: "nodes_keying", name: "Keying", count: ALL_NODE_TEMPLATES.filter((n) => /key/i.test(n.name)).length },
        { id: "nodes_stylized", name: "Stylized", count: ALL_NODE_TEMPLATES.filter((n) => n.category === "Stylized").length },
        { id: "nodes_social", name: "Social Templates", count: ALL_NODE_TEMPLATES.filter((n) => n.category === "Social" || n.category === "Podcast").length }
      ]
    }
  ], [editor.assets]);

  return (
    <div className="spx-editor-layout-shell">
      <SPXWorkspaceBar
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        activeMonitorPreset={activeMonitorPreset}
        setActiveMonitorPreset={setActiveMonitorPreset}
        saveLayout={saveLayout}
        saveVersion={editor.saveVersion}
        autosaveProject={editor.autosaveProject}
        addCommentAtPlayhead={editor.addCommentAtPlayhead}
        createBrandKit={editor.createBrandKit}
        performance={editor.performance}
      />

      <div className={`spx-editor-premiere-grid ${dockLayout.monitorClass}`}>
        <div className="spx-editor-left-stack spx-dock-panel">
          <SPXBinTree
            tree={tree}
            activeNodeId={activeNodeId}
            setActiveNodeId={setActiveNodeId}
          />

          <SPXBinContentPanel
            activeNodeId={activeNodeId}
            onDragPresetStart={editor.onDragPresetStart}
            onDragMediaStart={editor.onDragMediaStart}
            handleUploadMedia={editor.handleUploadMedia}
            assets={editor.assets || []}
          />
        </div>

        <div className="spx-editor-center-stack spx-dock-panel">
          <SPXDualMonitor
            canvasRef={editor.canvasRef}
            currentTime={editor.currentTime}
            isPlaying={editor.isPlaying}
            togglePlay={editor.togglePlay}
            stepTime={editor.stepTime}
          />
        </div>

        <div className="spx-dock-panel">
          <SPXInspectorPanel editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default SPXPanelLayout;
