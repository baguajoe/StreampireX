import React, {useRef, useContext, useEffect, useState} from "react";
import "../../styles/NodeCompositor.css";
import VideoExportPanel from "../component/nodecompositor/VideoExportPanel";
import BeatSyncPanel from "../component/nodecompositor/BeatSyncPanel";
import AIAutoEditPanel from "../component/nodecompositor/AIAutoEditPanel";

import { Context } from "../store/appContext";
import useNodeCompositorState from "../component/nodecompositor/useNodeCompositorState";
import NodeLibraryPanel from "../component/nodecompositor/NodeLibraryPanel";
import NodeInspectorPanel from "../component/nodecompositor/NodeInspectorPanel";
import NodePreviewPanel from "../component/nodecompositor/NodePreviewPanel";
import NodeGraphCanvas from "../component/nodecompositor/NodeGraphCanvas";
import MinimapPanel from "../component/nodecompositor/MinimapPanel";
import useKeyboardShortcuts from "../component/nodecompositor/KeyboardShortcuts";
import NodeTimelinePanel from "../component/nodecompositor/NodeTimelinePanel";
import { downloadGraphJSON } from "../component/nodecompositor/graphSerializer";
import { createNodeFromType } from "../component/nodecompositor/nodeTypes";

export default function NodeCompositorPage() {
  const [activeTool, setActiveTool] = useState("export");
  const state = useNodeCompositorState();
  const { store, actions } = useContext(Context);
  const fileInputRef = useRef(null);
  const importedTimestampRef = useRef(null);

  useKeyboardShortcuts({
    undo: state.undo,
    redo: state.redo,
    duplicateSelectedNode: state.duplicateSelectedNode,
    removeSelectedNode: () => {
      if (state.selectedNode) state.removeNode(state.selectedNode.id);
    },
    togglePlay: () => state.setIsPlaying(!state.isPlaying)
  });

  const handleExport = () => {
    const json = state.exportGraph();
    downloadGraphJSON("node-compositor-graph.json", json);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    state.importGraph(text);
    e.target.value = "";
  };

  // SAFELY SUPPORT BOTH STORE SHAPES:
  // 1) store.motionTransfer
  // 2) store.motion
  const incomingMotion =
    (store?.motionTransfer && store.motionTransfer.url ? store.motionTransfer : null) ||
    (store?.motion && store.motion.url ? store.motion : null) ||
    null;

  useEffect(() => {
    if (!incomingMotion?.url) return;

    const timestamp = incomingMotion.timestamp || Date.now();

    // Prevent duplicate re-imports
    if (importedTimestampRef.current === timestamp) return;
    importedTimestampRef.current = timestamp;

    const mediaNode = createNodeFromType("mediaIn", 120, 140);
    const outputNode = createNodeFromType("output", 700, 140);

    if (!mediaNode || !outputNode) return;

    mediaNode.properties = {
      ...mediaNode.properties,
      mediaUrl: incomingMotion.url,
      name: incomingMotion.name || "Imported Media"
    };

    let nodes = [];
    let edges = [];

    // Video gets a path node by default so it's ready for motion
    if (incomingMotion.type === "video") {
      const pathNode = createNodeFromType("path", 400, 140);

      if (pathNode) {
        pathNode.properties = {
          ...pathNode.properties,
          name: "Auto Path"
        };

        nodes = [mediaNode, pathNode, outputNode];
        edges = [
          {
            id: `edge_${Date.now()}_1`,
            fromNodeId: mediaNode.id,
            fromPort: "image",
            toNodeId: pathNode.id,
            toPort: "image"
          },
          {
            id: `edge_${Date.now()}_2`,
            fromNodeId: pathNode.id,
            fromPort: "image",
            toNodeId: outputNode.id,
            toPort: "image"
          }
        ];
      } else {
        nodes = [mediaNode, outputNode];
        edges = [
          {
            id: `edge_${Date.now()}_1`,
            fromNodeId: mediaNode.id,
            fromPort: "image",
            toNodeId: outputNode.id,
            toPort: "image"
          }
        ];
      }
    } else {
      // Audio / image / fallback
      nodes = [mediaNode, outputNode];
      edges = [
        {
          id: `edge_${Date.now()}_1`,
          fromNodeId: mediaNode.id,
          fromPort: "image",
          toNodeId: outputNode.id,
          toPort: "image"
        }
      ];
    }

    state.importGraph(JSON.stringify({ nodes, edges }));

    if (typeof actions?.clearMotionTransfer === "function") {
      actions.clearMotionTransfer();
    }
  }, [incomingMotion, state, actions]);

  return (
    <div className="nc-page">
      <div className="nc-topbar">
        <div>
          <div className="nc-title">Node Compositor</div>
          <div className="nc-subtitle">Fusion-style VFX graph foundation</div>
        </div>

        <div className="nc-topbar-actions">
          <button onClick={state.undo}>Undo</button>
          <button onClick={state.redo}>Redo</button>
          <button onClick={() => state.setIsPlaying(!state.isPlaying)}>
            {state.isPlaying ? "Pause" : "Play"}
          </button>

          <input
            type="range"
            min="0"
            max={state.duration}
            step="0.01"
            value={state.currentTime}
            onChange={(e) => state.setCurrentTime(parseFloat(e.target.value))}
          />

          <span className="nc-time-readout">
            {state.currentTime.toFixed(2)}s / {state.duration.toFixed(2)}s
          </span>

          <button onClick={() => state.addNode("mediaIn", 120, 220)}>+ Media</button>
          <button onClick={() => state.addNode("text", 160, 260)}>+ Text</button>
          <button onClick={() => state.addNode("transform", 200, 300)}>+ Transform</button>
          <button onClick={() => state.addNode("path", 220, 320)}>+ Path</button>
          <button onClick={() => state.addNode("camera", 240, 340)}>+ Camera</button>
          <button onClick={() => state.addNode("colorCorrect", 260, 360)}>+ Color</button>
          <button onClick={() => state.addNode("blur", 280, 380)}>+ Blur</button>
          <button onClick={() => state.addNode("adjustment", 300, 400)}>+ Adjustment</button>
          <button onClick={() => state.addNode("mask", 320, 420)}>+ Mask</button>
          <button onClick={() => state.addNode("merge", 340, 440)}>+ Merge</button>
          <button onClick={state.duplicateSelectedNode} disabled={!state.selectedNode}>
            Duplicate
          </button>
          <button onClick={handleExport}>Export JSON</button>
          <button onClick={handleImportClick}>Import JSON</button>
          <button className="nc-danger-btn compact" onClick={state.clearGraph}>
            Clear
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
      </div>

      <div className="nc-layout">
        <div className="nc-left">
          <NodeLibraryPanel addNode={state.addNode} />
          <MinimapPanel nodes={state.nodes} selectedNodeId={state.selectedNodeId} />
        

      <div className="nc-tool-switcher">
        <button className={activeTool === "export" ? "active" : ""} onClick={() => setActiveTool("export")}>Video Export</button>
        <button className={activeTool === "beatSync" ? "active" : ""} onClick={() => setActiveTool("beatSync")}>Beat Sync</button>
        <button className={activeTool === "aiAutoEdit" ? "active" : ""} onClick={() => setActiveTool("aiAutoEdit")}>AI Auto Edit</button>
      </div>

      <div className="nc-tool-host">
        {activeTool === "export" && (
          <VideoExportPanel nodes={state.nodes || []} edges={state.edges || []} currentTime={state.currentTime || 0} />
        )}
        {activeTool === "beatSync" && (
          <BeatSyncPanel nodes={state.nodes || []} currentTime={state.currentTime || 0} />
        )}
        {activeTool === "aiAutoEdit" && (
          <AIAutoEditPanel nodes={state.nodes || []} edges={state.edges || []} />
        )}
      </div>

</div>

        <div className="nc-center">
          <NodeGraphCanvas
            nodes={state.nodes}
            edges={state.edges}
            groups={state.groups}
            selectedNodeId={state.selectedNodeId}
            setSelectedNodeId={state.setSelectedNodeId}
            selectedEdgeId={state.selectedEdgeId}
            setSelectedEdgeId={state.setSelectedEdgeId}
            updateNodePosition={state.updateNodePosition}
            addEdge={state.addEdge}
          />
        </div>

        <div className="nc-right">
          <NodePreviewPanel
            nodes={state.nodes}
            edges={state.edges}
            currentTime={state.currentTime}
          />

          <NodeInspectorPanel
            selectedNode={state.selectedNode}
            selectedEdge={state.selectedEdge}
            selectedGroup={state.selectedGroup}
            presets={state.presets}
            updateNodeProperties={state.updateNodeProperties}
            updateNodeMeta={state.updateNodeMeta}
            removeNode={state.removeNode}
            removeEdge={state.removeEdge}
            currentTime={state.currentTime}
            addKeyframeToSelectedNode={state.addKeyframeToSelectedNode}
            removeKeyframeFromSelectedNode={state.removeKeyframeFromSelectedNode}
            addGroupFromSelectedNode={state.addGroupFromSelectedNode}
            toggleGroupCollapsed={state.toggleGroupCollapsed}
            saveSelectedNodePreset={state.saveSelectedNodePreset}
            applyPresetToSelectedNode={state.applyPresetToSelectedNode}
          />
        </div>
      </div>

      <NodeTimelinePanel
        currentTime={state.currentTime}
        duration={state.duration}
        isPlaying={state.isPlaying}
        setCurrentTime={state.setCurrentTime}
        setIsPlaying={state.setIsPlaying}
      />
    </div>
  );
}