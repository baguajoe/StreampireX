import create from "zustand";

export const useEditorStore = create((set, get) => ({
  timeline: {
    currentTime: 0,
    duration: 10,
    fps: 30,
    playing: false,
    loop: true,
  },

  layers: [],
  nodes: [],
  camera: { x: 0, y: 0, z: 0, zoom: 1 },

  selection: {
    layerId: null,
    nodeId: null,
  },

  setTime: (t) =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        currentTime: Math.max(0, Math.min(t, s.timeline.duration)),
      },
    })),

  togglePlay: () =>
    set((s) => ({
      timeline: { ...s.timeline, playing: !s.timeline.playing },
    })),

  setPlaying: (playing) =>
    set((s) => ({
      timeline: { ...s.timeline, playing: !!playing },
    })),

  setDuration: (duration) =>
    set((s) => ({
      timeline: { ...s.timeline, duration: Math.max(0.1, Number(duration) || 10) },
    })),

  addLayer: (layer) =>
    set((s) => ({
      layers: [
        ...s.layers,
        {
          id: layer.id || `layer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: layer.type || "text",
          x: layer.x ?? 100,
          y: layer.y ?? 100,
          z: layer.z ?? 0,
          scale: layer.scale ?? 1,
          rotation: layer.rotation ?? 0,
          opacity: layer.opacity ?? 1,
          color: layer.color || "#00ffc8",
          text: layer.text || "Layer",
          subtitle: layer.subtitle || "",
          fontSize: layer.fontSize ?? 42,
          fontWeight: layer.fontWeight ?? 700,
          keyframes: layer.keyframes || {},
          effects: layer.effects || [],
          mask: layer.mask || { enabled: false, points: [] },
        },
      ],
    })),

  setLayers: (layers) => set({ layers: Array.isArray(layers) ? layers : [] }),

  updateLayer: (id, patch) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  removeLayer: (id) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== id),
      selection: {
        ...s.selection,
        layerId: s.selection.layerId === id ? null : s.selection.layerId,
      },
    })),

  setNodes: (nodes) => set({ nodes: Array.isArray(nodes) ? nodes : [] }),

  addNode: (node) =>
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          id: node.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: node.type || "value",
          x: node.x ?? 100,
          y: node.y ?? 100,
          inputs: node.inputs || {},
          outputs: node.outputs || {},
          value: node.value ?? null,
          shader: node.shader || null,
          params: node.params || {},
        },
      ],
    })),

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      selection: {
        ...s.selection,
        nodeId: s.selection.nodeId === id ? null : s.selection.nodeId,
      },
    })),

  setCamera: (patch) =>
    set((s) => ({
      camera: { ...s.camera, ...patch },
    })),

  setSelection: (patch) =>
    set((s) => ({
      selection: { ...s.selection, ...patch },
    })),
}));
