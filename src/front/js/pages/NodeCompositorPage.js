import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Context } from "../store/appContext";
import NodePreviewPanel from "../component/nodecompositor/NodePreviewPanel";
import NodeInspectorPanel from "../component/nodecompositor/NodeInspectorPanel";
import NodeTimelinePanel from "../component/nodecompositor/NodeTimelinePanel";
import VideoExportToolPanel from "../component/nodecompositor/VideoExportToolPanel";
import BeatSyncToolPanel from "../component/nodecompositor/BeatSyncToolPanel";
import AIAutoEditToolPanel from "../component/nodecompositor/AIAutoEditToolPanel";
import useCompositorVFXState from "../component/nodecompositor/useCompositorVFXState";
import VFXToolPanel from "../component/nodecompositor/VFXToolPanel";
import TrackingToolPanel from "../component/nodecompositor/TrackingToolPanel";
import Camera25DPanel from "../component/nodecompositor/Camera25DPanel";
import RotoMaskPanel from "../component/nodecompositor/RotoMaskPanel";
import NodeVFXPreviewPanel from "../component/nodecompositor/NodeVFXPreviewPanel";
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
  const compositorVFX = useCompositorVFXState();

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
  }, []);

  return (
    <div className="node-compositor-page" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button onClick={seedStarterGraph}>Starter Graph</button>
        <button onClick={() => addNode("mediaIn", 120, 120)}>+ Media</button>
        <button onClick={() => addNode("text", 120, 240)}>+ Text</button>
        <button onClick={() => addNode("merge", 360, 180)}>+ Merge</button>
        <button onClick={() => addNode("output", 640, 180)}>+ Output</button>
        <button onClick={duplicateSelectedNode} disabled={!selectedNode}>Duplicate</button>
        <button onClick={removeSelectedNode} disabled={!selectedNode}>Delete</button>
        <button onClick={importMotionMedia} disabled={!motionPayload?.url}>Add Motion Media</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className={toolTab === "graph" ? "active" : ""} onClick={() => setToolTab("graph")}>Graph</button>
        <button className={toolTab === "export" ? "active" : ""} onClick={() => setToolTab("export")}>Video Export</button>
        <button className={toolTab === "beat" ? "active" : ""} onClick={() => setToolTab("beat")}>Beat Sync</button>
        <button className={toolTab === "auto" ? "active" : ""} onClick={() => setToolTab("auto")}>AI Auto Edit</button>
        <button className={toolTab === "vfx" ? "active" : ""} onClick={() => setToolTab("vfx")}>VFX</button>
      </div>

      {toolTab === "graph" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
          <NodePreviewPanel
            nodes={nodes}
            edges={edges}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            projectName={projectName}
          />
          <div style={{ display: "grid", gap: 16 }}>
            <NodeInspectorPanel
              selectedNode={selectedNode}
              onChange={updateSelectedNode}
            />
            <NodeTimelinePanel
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              duration={duration}
              setDuration={setDuration}
            />
          </div>
        </div>
      )}

      {toolTab === "export" && (
        <VideoExportToolPanel
          projectName={projectName}
          nodes={nodes}
          edges={edges}
          duration={duration}
        />
      )}

      {toolTab === "beat" && <BeatSyncToolPanel />}

      {toolTab === "auto" && <AIAutoEditToolPanel />}

      {toolTab === "vfx" && (
        <div style={{ display: "grid", gap: 16 }}>
          <VFXToolPanel
            vfxEnabled={compositorVFX.vfxEnabled}
            setVfxEnabled={compositorVFX.setVfxEnabled}
            shaderQuality={compositorVFX.shaderQuality}
            setShaderQuality={compositorVFX.setShaderQuality}
            globalEffects={compositorVFX.globalEffects}
            setGlobalEffects={compositorVFX.setGlobalEffects}
          />
          <TrackingToolPanel
            tracking={compositorVFX.tracking}
            setTracking={compositorVFX.setTracking}
          />
          <Camera25DPanel
            camera25D={compositorVFX.camera25D}
            setCamera25D={compositorVFX.setCamera25D}
          />
          <RotoMaskPanel
            rotoMasks={compositorVFX.rotoMasks}
            setRotoMasks={compositorVFX.setRotoMasks}
          />
          <NodeVFXPreviewPanel
            nodes={nodes}
            edges={edges}
            globalEffects={compositorVFX.globalEffects}
            keyColorVec3={compositorVFX.keyColorVec3}
            vfxEnabled={compositorVFX.vfxEnabled}
          />
        </div>
      )}
    </div>
  );
}
