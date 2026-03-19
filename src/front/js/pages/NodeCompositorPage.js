import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import NodePreviewPanel from "../component/nodecompositor/NodePreviewPanel";
import NodeInspectorPanel from "../component/nodecompositor/NodeInspectorPanel";
import NodeTimelinePanel from "../component/nodecompositor/NodeTimelinePanel";
import VideoExportToolPanel from "../component/nodecompositor/VideoExportToolPanel";
import BeatSyncToolPanel from "../component/nodecompositor/BeatSyncToolPanel";
import AIAutoEditToolPanel from "../component/nodecompositor/AIAutoEditToolPanel";
import "../../styles/NodeCompositor.css";

const makeNodeId = (type) => `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_MEDIA_PROPS = {
  name: "Media In",
  label: "Media In",
  background: "linear-gradient(135deg,#00ffc8,#0044ff)",
  opacity: 1,
  xPercent: 50,
  yPercent: 50,
  fontSize: 42,
  fontWeight: 800,
  color: "#ffffff",
  text: "Text",
  mediaUrl: ""
};

export default function NodeCompositorPage() {
  const ctx = useContext(Context);
  const store = ctx?.store || {};
  const motionPayload = store.motion || store.motionTransfer || null;

  const [projectName, setProjectName] = useState("SPX Compositor");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toolTab, setToolTab] = useState("graph");

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.033;
        return next >= duration ? 0 : next;
      });
    }, 33);
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  const addNode = useCallback((type, x = 120, y = 120) => {
    const id = makeNodeId(type);

    const base = {
      id,
      type,
      x,
      y,
      keyframes: [],
      properties: { ...DEFAULT_MEDIA_PROPS }
    };

    if (type === "mediaIn") {
      base.properties = {
        ...DEFAULT_MEDIA_PROPS,
        name: "Media In",
        label: "Media In"
      };
    }

    if (type === "text") {
      base.properties = {
        ...DEFAULT_MEDIA_PROPS,
        name: "Text",
        label: "Text",
        text: "SPX Compositor",
        background: "transparent"
      };
    }

    if (type === "merge") {
      base.properties = {
        name: "Merge",
        blendMode: "normal",
        opacity: 1
      };
    }

    if (type === "output") {
      base.properties = {
        name: "Output",
        label: "Output"
      };
    }

    setNodes((prev) => [...prev, base]);
    setSelectedNodeId(id);
  }, []);

  const updateSelectedNode = useCallback((patch) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId
          ? { ...node, properties: { ...(node.properties || {}), ...patch } }
          : node
      )
    );
  }, [selectedNodeId]);

  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) => prev.filter((e) => e.from !== selectedNodeId && e.to !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    const copyId = makeNodeId(selectedNode.type);
    const clone = JSON.parse(JSON.stringify(selectedNode));
    clone.id = copyId;
    clone.x = (clone.x || 120) + 36;
    clone.y = (clone.y || 120) + 36;
    clone.properties.name = `${clone.properties?.name || clone.type} Copy`;
    setNodes((prev) => [...prev, clone]);
    setSelectedNodeId(copyId);
  }, [selectedNode]);

  const importMotionMedia = useCallback(() => {
    if (!motionPayload?.url) return;
    const id = makeNodeId("mediaIn");
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "mediaIn",
        x: 120,
        y: 120,
        keyframes: [],
        properties: {
          ...DEFAULT_MEDIA_PROPS,
          name: motionPayload.name || "Motion Import",
          label: motionPayload.type === "video" ? "Video In" : "Audio/Media In",
          mediaUrl: motionPayload.url,
          background: motionPayload.type === "video"
            ? "linear-gradient(135deg,#1f2937,#111827)"
            : "linear-gradient(135deg,#7c3aed,#1d4ed8)"
        }
      }
    ]);
    setSelectedNodeId(id);
  }, [motionPayload]);

  const seedStarterGraph = useCallback(() => {
    const mediaId = makeNodeId("mediaIn");
    const textId = makeNodeId("text");
    const mergeId = makeNodeId("merge");
    const outId = makeNodeId("output");

    setNodes([
      {
        id: mediaId,
        type: "mediaIn",
        x: 80,
        y: 120,
        keyframes: [],
        properties: { ...DEFAULT_MEDIA_PROPS, name: "Media In", label: "Media In" }
      },
      {
        id: textId,
        type: "text",
        x: 80,
        y: 280,
        keyframes: [],
        properties: {
          ...DEFAULT_MEDIA_PROPS,
          name: "Text",
          label: "Text",
          text: "SPX Compositor",
          background: "transparent"
        }
      },
      {
        id: mergeId,
        type: "merge",
        x: 360,
        y: 200,
        keyframes: [],
        properties: { name: "Merge", blendMode: "normal", opacity: 1 }
      },
      {
        id: outId,
        type: "output",
        x: 620,
        y: 200,
        keyframes: [],
        properties: { name: "Output", label: "Output" }
      }
    ]);

    setEdges([
      { id: `e_${mediaId}_${mergeId}`, from: mediaId, to: mergeId, input: "background" },
      { id: `e_${textId}_${mergeId}`, from: textId, to: mergeId, input: "foreground" },
      { id: `e_${mergeId}_${outId}`, from: mergeId, to: outId, input: "image" }
    ]);

    setSelectedNodeId(mergeId);
  }, []);

  return (
    <div className="nc-app-shell">
      <div className="nc-topbar">
        <div className="nc-topbar-left">
          <div className="nc-brand">🎛️ SPX Compositor</div>
          <input
            className="nc-project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="nc-topbar-actions">
          <button onClick={seedStarterGraph}>Starter Graph</button>
          <button onClick={() => addNode("mediaIn", 120, 120)}>+ Media</button>
          <button onClick={() => addNode("text", 120, 240)}>+ Text</button>
          <button onClick={() => addNode("merge", 360, 180)}>+ Merge</button>
          <button onClick={() => addNode("output", 640, 180)}>+ Output</button>
          <button onClick={duplicateSelectedNode} disabled={!selectedNode}>Duplicate</button>
          <button onClick={removeSelectedNode} disabled={!selectedNode}>Delete</button>
        </div>
      </div>

      {motionPayload?.url && (
        <div className="nc-import-banner">
          <div>
            Ready to import from Motion: <strong>{motionPayload.name || "Untitled Media"}</strong>
          </div>
          <button className="nc-btn-primary" onClick={importMotionMedia}>Add to Graph</button>
        </div>
      )}

      <div className="nc-tool-tabs">
        <button className={toolTab === "graph" ? "active" : ""} onClick={() => setToolTab("graph")}>Graph</button>
        <button className={toolTab === "export" ? "active" : ""} onClick={() => setToolTab("export")}>Video Export</button>
        <button className={toolTab === "beat" ? "active" : ""} onClick={() => setToolTab("beat")}>Beat Sync</button>
        <button className={toolTab === "auto" ? "active" : ""} onClick={() => setToolTab("auto")}>AI Auto Edit</button>
      </div>

      <div className="nc-main-grid">
        <div className="nc-graph-column">
          {toolTab === "graph" ? (
            <div className="nc-graph-panel">
              <div className="nc-panel-title">Node Graph</div>

              <div className="nc-node-toolbar">
                <button onClick={() => addNode("mediaIn", 120, 120)}>Media</button>
                <button onClick={() => addNode("text", 120, 240)}>Text</button>
                <button onClick={() => addNode("merge", 360, 180)}>Merge</button>
                <button onClick={() => addNode("output", 640, 180)}>Output</button>
              </div>

              <div className="nc-graph-canvas">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    className={`nc-node-card ${selectedNodeId === node.id ? "selected" : ""}`}
                    style={{ left: node.x || 0, top: node.y || 0 }}
                    onClick={() => setSelectedNodeId(node.id)}
                    type="button"
                  >
                    <div className="nc-node-type">{node.type}</div>
                    <div className="nc-node-name">{node.properties?.name || node.type}</div>
                  </button>
                ))}

                {!nodes.length && (
                  <div className="nc-empty-graph">
                    <div className="nc-empty-title">No nodes yet</div>
                    <div className="nc-empty-subtitle">Create a starter graph or add nodes above.</div>
                  </div>
                )}
              </div>
            </div>
          ) : toolTab === "export" ? (
            <VideoExportToolPanel projectName={projectName} currentTime={currentTime} duration={duration} />
          ) : toolTab === "beat" ? (
            <BeatSyncToolPanel />
          ) : (
            <AIAutoEditToolPanel />
          )}
        </div>

        <div className="nc-side-column">
          <NodePreviewPanel nodes={nodes} edges={edges} currentTime={currentTime} />

          <div className="nc-panel nc-inspector-wrap">
            <div className="nc-panel-title">Inspector</div>

            {selectedNode ? (
              <>
                <label className="nc-tool-field">
                  <span>Name</span>
                  <input
                    value={selectedNode.properties?.name || ""}
                    onChange={(e) => updateSelectedNode({ name: e.target.value })}
                  />
                </label>

                {selectedNode.type === "text" && (
                  <>
                    <label className="nc-tool-field">
                      <span>Text</span>
                      <textarea
                        rows={4}
                        value={selectedNode.properties?.text || ""}
                        onChange={(e) => updateSelectedNode({ text: e.target.value })}
                      />
                    </label>

                    <label className="nc-tool-field">
                      <span>Color</span>
                      <input
                        type="color"
                        value={selectedNode.properties?.color || "#ffffff"}
                        onChange={(e) => updateSelectedNode({ color: e.target.value })}
                      />
                    </label>

                    <label className="nc-tool-field">
                      <span>Font Size</span>
                      <input
                        type="number"
                        value={selectedNode.properties?.fontSize || 42}
                        onChange={(e) => updateSelectedNode({ fontSize: parseInt(e.target.value || 42, 10) })}
                      />
                    </label>
                  </>
                )}

                {selectedNode.type === "mediaIn" && (
                  <label className="nc-tool-field">
                    <span>Media URL</span>
                    <input
                      value={selectedNode.properties?.mediaUrl || ""}
                      onChange={(e) => updateSelectedNode({ mediaUrl: e.target.value })}
                    />
                  </label>
                )}

                {selectedNode.type === "merge" && (
                  <label className="nc-tool-field">
                    <span>Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedNode.properties?.opacity ?? 1}
                      onChange={(e) => updateSelectedNode({ opacity: parseFloat(e.target.value) })}
                    />
                  </label>
                )}
              </>
            ) : (
              <div className="nc-tool-note">Select a node to edit its properties.</div>
            )}
          </div>
        </div>
      </div>

      <NodeTimelinePanel
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        setCurrentTime={setCurrentTime}
        setIsPlaying={setIsPlaying}
      />
    </div>
  );
}
