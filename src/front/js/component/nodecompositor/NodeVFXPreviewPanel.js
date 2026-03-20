import React, { useEffect, useMemo, useRef } from "react";
import { CompositorRenderer } from "./vfx/Renderer";
import { topoSortNodes, getInputNodes, findOutputNode } from "../../utils/compositor/nodeExecution";
import { createMediaCanvas, createTextCanvas } from "../../utils/compositor/mediaSources";

function ensureDefaultGraph(nodes = [], edges = []) {
  if (nodes.length) return { nodes, edges };
  const defaultNodes = [
    { id: "media1", type: "mediaIn", properties: { name: "Media Input", mediaUrl: "local://media", bg: "#12243a" } },
    { id: "text1", type: "text", properties: { text: "SPX Compositor", x: 50, y: 18, fontSize: 72, color: "#ffffff" } },
    { id: "merge1", type: "merge", properties: { mix: 0.55 } },
    { id: "output1", type: "output", properties: {} },
  ];
  const defaultEdges = [
    { source: "media1", target: "merge1" },
    { source: "text1", target: "merge1" },
    { source: "merge1", target: "output1" },
  ];
  return { nodes: defaultNodes, edges: defaultEdges };
}

export default function NodeVFXPreviewPanel({
  nodes = [],
  edges = [],
  globalEffects,
  keyColorVec3,
  vfxEnabled,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  const graph = useMemo(() => ensureDefaultGraph(nodes, edges), [nodes, edges]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!rendererRef.current) rendererRef.current = new CompositorRenderer(canvasRef.current);
    const renderer = rendererRef.current;
    renderer.resize();

    const textures = new Map();
    const ordered = topoSortNodes(graph.nodes, graph.edges);

    for (const node of ordered) {
      const type = (node.type || "").toLowerCase();
      const inputs = getInputNodes(node, graph.nodes, graph.edges).map((n) => textures.get(n.id)).filter(Boolean);

      if (type === "mediain") {
        const canvas = createMediaCanvas(node, canvasRef.current.width || 1280, canvasRef.current.height || 720);
        textures.set(node.id, renderer.ensureCanvasTexture(node.id, canvas));
        continue;
      }

      if (type === "text") {
        const canvas = createTextCanvas(node, canvasRef.current.width || 1280, canvasRef.current.height || 720);
        textures.set(node.id, renderer.ensureCanvasTexture(node.id, canvas));
        continue;
      }

      if (type === "coloradjust" && inputs[0]) {
        textures.set(node.id, renderer.renderColorAdjust(inputs[0], {
          brightness: node.properties?.brightness ?? globalEffects.brightness,
          contrast: node.properties?.contrast ?? globalEffects.contrast,
          saturation: node.properties?.saturation ?? globalEffects.saturation,
          opacity: node.properties?.opacity ?? 1,
        }, `node-${node.id}`));
        continue;
      }

      if (type === "blur" && inputs[0]) {
        textures.set(node.id, renderer.renderBlur(inputs[0], {
          amount: node.properties?.amount ?? globalEffects.blur,
          opacity: node.properties?.opacity ?? 1,
        }, `node-${node.id}`));
        continue;
      }

      if (type === "chromakey" && inputs[0]) {
        textures.set(node.id, renderer.renderChromaKey(inputs[0], {
          keyColor: keyColorVec3,
          threshold: node.properties?.threshold ?? globalEffects.threshold,
          softness: node.properties?.softness ?? globalEffects.softness,
          opacity: node.properties?.opacity ?? 1,
        }, `node-${node.id}`));
        continue;
      }

      if (type === "merge" && inputs[0] && inputs[1]) {
        textures.set(node.id, renderer.renderMerge(inputs[0], inputs[1], {
          mix: node.properties?.mix ?? globalEffects.mergeMix ?? 0.5,
        }, `node-${node.id}`));
        continue;
      }

      if (type === "output" && inputs[0]) {
        textures.set(node.id, inputs[0]);
        continue;
      }

      if (inputs[0]) {
        let out = inputs[0];
        if (vfxEnabled) {
          out = renderer.renderColorAdjust(out, {
            brightness: globalEffects.brightness,
            contrast: globalEffects.contrast,
            saturation: globalEffects.saturation,
            opacity: 1,
          }, `fallback-color-${node.id}`);

          if ((globalEffects.blur ?? 0) > 0.001) {
            out = renderer.renderBlur(out, { amount: globalEffects.blur, opacity: 1 }, `fallback-blur-${node.id}`);
          }

          if (globalEffects.chromaKey) {
            out = renderer.renderChromaKey(out, {
              keyColor: keyColorVec3,
              threshold: globalEffects.threshold,
              softness: globalEffects.softness,
              opacity: 1,
            }, `fallback-chroma-${node.id}`);
          }
        }
        textures.set(node.id, out);
      }
    }

    const outputNode = findOutputNode(graph.nodes);
    const finalTexture = outputNode ? textures.get(outputNode.id) : textures.get(ordered[ordered.length - 1]?.id);
    if (finalTexture) renderer.renderTextureToScreen(finalTexture);
  }, [graph, globalEffects, keyColorVec3, vfxEnabled]);

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">GPU Graph Preview</div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 360, display: "block", background: "#0b1220", borderRadius: 10 }}
      />
    </div>
  );
}
