import { useMemo, useState, useCallback, useEffect } from "react";
import { createNodeFromType } from "./nodeTypes";
import { serializeGraph, deserializeGraph } from "./graphSerializer";
import { createNodeKeyframe } from "./nodeAnimation";

const starterNodes = [
  createNodeFromType("mediaIn", 80, 100),
  createNodeFromType("transform", 360, 100),
  createNodeFromType("output", 680, 100)
].filter(Boolean).map((n) => ({ ...n, keyframes: [] }));

const starterEdges = starterNodes.length >= 3 ? [
  {
    id: `edge_${Date.now()}_1`,
    fromNodeId: starterNodes[0].id,
    fromPort: "image",
    toNodeId: starterNodes[1].id,
    toPort: "image"
  },
  {
    id: `edge_${Date.now()}_2`,
    fromNodeId: starterNodes[1].id,
    fromPort: "image",
    toNodeId: starterNodes[2].id,
    toPort: "image"
  }
] : [];

function cloneNode(node) {
  return {
    ...node,
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    x: node.x + 40,
    y: node.y + 40,
    properties: {
      ...node.properties,
      name: `${node.properties?.name || node.label} Copy`
    },
    keyframes: [...(node.keyframes || [])].map((kf) => ({
      ...kf,
      id: `nkf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    }))
  };
}

export default function useNodeCompositorState() {
  const [nodes, setNodes] = useState(starterNodes);
  const [edges, setEdges] = useState(starterEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(starterNodes[0]?.id || null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.033;
        return next >= duration ? 0 : next;
      });
    }, 33);
    return () => clearInterval(id);
  }, [isPlaying, duration]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  const addNode = useCallback((type, x = 140, y = 140) => {
    const node = createNodeFromType(type, x, y);
    if (!node) return;
    const hydrated = { ...node, keyframes: [] };
    setNodes((prev) => [...prev, hydrated]);
    setSelectedNodeId(hydrated.id);
    setSelectedEdgeId(null);
  }, []);

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode) return;
    const copy = cloneNode(selectedNode);
    setNodes((prev) => [...prev, copy]);
    setSelectedNodeId(copy.id);
    setSelectedEdgeId(null);
  }, [selectedNode]);

  const updateNodePosition = useCallback((nodeId, x, y) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n))
    );
  }, []);

  const updateNodeProperties = useCallback((nodeId, patch) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, properties: { ...n.properties, ...patch } }
          : n
      )
    );
  }, []);

  const addKeyframeToSelectedNode = useCallback((property, value, easing = "easeInOut") => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              keyframes: [...(n.keyframes || []), createNodeKeyframe(currentTime, property, value, easing)]
            }
          : n
      )
    );
  }, [selectedNodeId, currentTime]);

  const removeKeyframeFromSelectedNode = useCallback((keyframeId) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? { ...n, keyframes: (n.keyframes || []).filter((kf) => kf.id !== keyframeId) }
          : n
      )
    );
  }, [selectedNodeId]);

  const removeNode = useCallback((nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId));
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    setSelectedEdgeId(null);
  }, []);

  const addEdge = useCallback((fromNodeId, fromPort, toNodeId, toPort) => {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return false;

    const exists = edges.some(
      (e) =>
        e.fromNodeId === fromNodeId &&
        e.fromPort === fromPort &&
        e.toNodeId === toNodeId &&
        e.toPort === toPort
    );
    if (exists) return false;

    const duplicateInput = edges.some(
      (e) => e.toNodeId === toNodeId && e.toPort === toPort
    );
    if (duplicateInput) {
      setEdges((prev) => prev.filter((e) => !(e.toNodeId === toNodeId && e.toPort === toPort)));
    }

    const edge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fromNodeId,
      fromPort,
      toNodeId,
      toPort
    };

    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    return true;
  }, [edges]);

  const removeEdge = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setSelectedEdgeId((prev) => (prev === edgeId ? null : prev));
  }, []);

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const exportGraph = useCallback(() => {
    return serializeGraph(nodes, edges);
  }, [nodes, edges]);

  const importGraph = useCallback((jsonText) => {
    const parsed = deserializeGraph(jsonText);
    const hydrated = (parsed.nodes || []).map((n) => ({
      ...n,
      keyframes: n.keyframes || []
    }));
    setNodes(hydrated);
    setEdges(parsed.edges || []);
    setSelectedNodeId(hydrated?.[0]?.id || null);
    setSelectedEdgeId(null);
  }, []);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    selectedEdgeId,
    setSelectedEdgeId,
    selectedEdge,
    addNode,
    duplicateSelectedNode,
    updateNodePosition,
    updateNodeProperties,
    addKeyframeToSelectedNode,
    removeKeyframeFromSelectedNode,
    removeNode,
    addEdge,
    removeEdge,
    clearGraph,
    exportGraph,
    importGraph,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isPlaying,
    setIsPlaying
  };
}
