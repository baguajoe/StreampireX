// src/front/js/store/useEditorStore.js
// SPX Motion + Compositor — Unified Editor Store (Zustand)

import create from "zustand";

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export const useEditorStore = create((set, get) => ({

  // ─── Timeline ──────────────────────────────────────────────────────────────
  timeline: {
    currentTime: 0,
    duration: 10,
    fps: 30,
    playing: false,
    loop: true,
    loopStart: 0,
    speed: 1,
    zoom: 1,
    markers: [],
  },

  // ─── Layers (Motion Studio) ────────────────────────────────────────────────
  layers: [],

  // ─── Nodes (Compositor) ────────────────────────────────────────────────────
  nodes: [],
  edges: [],

  // ─── Camera ───────────────────────────────────────────────────────────────
  camera: { x:0, y:0, z:0, zoom:1, rotation:0, perspective:800 },

  // ─── Selection ────────────────────────────────────────────────────────────
  selection: { layerId:null, nodeId:null, multi:[] },

  // ─── History (undo/redo) ──────────────────────────────────────────────────
  _history: [],
  _historyIdx: -1,

  // ─── Timeline Actions ──────────────────────────────────────────────────────
  setTime: (t) => set(s => ({
    timeline: { ...s.timeline, currentTime: Math.max(0, Math.min(t, s.timeline.duration)) }
  })),

  togglePlay: () => set(s => ({
    timeline: { ...s.timeline, playing: !s.timeline.playing }
  })),

  setPlaying: (playing) => set(s => ({
    timeline: { ...s.timeline, playing: !!playing }
  })),

  setDuration: (duration) => set(s => ({
    timeline: { ...s.timeline, duration: Math.max(0.1, Number(duration) || 10) }
  })),

  setFPS: (fps) => set(s => ({
    timeline: { ...s.timeline, fps: Number(fps) || 30 }
  })),

  setTimelineZoom: (zoom) => set(s => ({
    timeline: { ...s.timeline, zoom: Math.max(0.1, Math.min(10, zoom)) }
  })),

  setSpeed: (speed) => set(s => ({
    timeline: { ...s.timeline, speed: Math.max(0.1, Math.min(10, speed)) }
  })),

  addMarker: (time, label='Marker', color='#00ffc8') => set(s => ({
    timeline: {
      ...s.timeline,
      markers: [...s.timeline.markers, { id:uid(), time, label, color }]
    }
  })),

  removeMarker: (id) => set(s => ({
    timeline: { ...s.timeline, markers: s.timeline.markers.filter(m => m.id !== id) }
  })),

  // ─── Layer Actions ─────────────────────────────────────────────────────────
  addLayer: (layer = {}) => {
    const newLayer = {
      id:          layer.id         || `layer_${uid()}`,
      type:        layer.type       || 'text',
      name:        layer.name       || 'New Layer',
      visible:     layer.visible    ?? true,
      locked:      layer.locked     ?? false,
      solo:        layer.solo       ?? false,
      x:           layer.x         ?? 100,
      y:           layer.y         ?? 100,
      z:           layer.z         ?? 0,
      width:       layer.width      ?? 200,
      height:      layer.height     ?? 80,
      scale:       layer.scale      ?? 1,
      scaleX:      layer.scaleX     ?? 1,
      scaleY:      layer.scaleY     ?? 1,
      rotation:    layer.rotation   ?? 0,
      opacity:     layer.opacity    ?? 1,
      color:       layer.color      || '#00ffc8',
      color2:      layer.color2     || '#14213d',
      text:        layer.text       || 'Layer',
      subtitle:    layer.subtitle   || '',
      fontSize:    layer.fontSize   ?? 42,
      fontWeight:  layer.fontWeight ?? 700,
      fontFamily:  layer.fontFamily || 'Arial',
      textAlign:   layer.textAlign  || 'left',
      shape:       layer.shape      || 'rect',
      animate:     layer.animate    ?? false,
      speed:       layer.speed      ?? 1,
      amplitude:   layer.amplitude  ?? 10,
      glow:        layer.glow       ?? false,
      glowStrength:layer.glowStrength ?? 0.5,
      blendMode:   layer.blendMode  || 'source-over',
      effects:     layer.effects    || [],
      keyframes:   layer.keyframes  || {},
      mask:        layer.mask       || { enabled:false, points:[] },
      inPoint:     layer.inPoint    ?? 0,
      outPoint:    layer.outPoint   ?? null,
    };
    set(s => ({ layers: [...s.layers, newLayer] }));
    return newLayer.id;
  },

  setLayers: (layers) => set({ layers: Array.isArray(layers) ? layers : [] }),

  updateLayer: (id, patch) => set(s => ({
    layers: s.layers.map(l => l.id === id ? { ...l, ...patch } : l)
  })),

  removeLayer: (id) => set(s => ({
    layers: s.layers.filter(l => l.id !== id),
    selection: { ...s.selection, layerId: s.selection.layerId === id ? null : s.selection.layerId },
  })),

  duplicateLayer: (id) => {
    const src = get().layers.find(l => l.id === id);
    if (!src) return;
    const copy = { ...src, id:`layer_${uid()}`, name:`${src.name} Copy`, x:(src.x||0)+20, y:(src.y||0)+20 };
    set(s => ({ layers: [...s.layers, copy] }));
    return copy.id;
  },

  reorderLayers: (fromIdx, toIdx) => set(s => {
    const arr = [...s.layers];
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    return { layers: arr };
  }),

  setLayerKeyframe: (id, prop, time, value, easing='easeInOut') => set(s => ({
    layers: s.layers.map(l => {
      if (l.id !== id) return l;
      const kfs = { ...(l.keyframes||{}) };
      const list = [...(kfs[prop]||[])];
      const idx = list.findIndex(k => Math.abs(k.time-time) < 0.001);
      if (idx>=0) list[idx] = { time, value, easing };
      else { list.push({ time, value, easing }); list.sort((a,b)=>a.time-b.time); }
      return { ...l, keyframes:{ ...kfs, [prop]:list } };
    })
  })),

  // ─── Node Actions (Compositor) ─────────────────────────────────────────────
  setNodes: (nodes) => set({ nodes: Array.isArray(nodes) ? nodes : [] }),

  addNode: (node = {}) => {
    const n = {
      id:         node.id       || `node_${uid()}`,
      type:       node.type     || 'solid',
      name:       node.name     || node.type || 'Node',
      x:          node.x        ?? 100,
      y:          node.y        ?? 100,
      inputs:     node.inputs   || {},
      outputs:    node.outputs  || {},
      value:      node.value    ?? null,
      shader:     node.shader   || null,
      params:     node.params   || {},
      properties: node.properties || {},
    };
    set(s => ({ nodes: [...s.nodes, n] }));
    return n.id;
  },

  updateNode: (id, patch) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, ...patch } : n)
  })),

  removeNode: (id) => set(s => ({
    nodes: s.nodes.filter(n => n.id !== id),
    edges: s.edges.filter(e => e.from !== id && e.to !== id),
    selection: { ...s.selection, nodeId: s.selection.nodeId === id ? null : s.selection.nodeId },
  })),

  setEdges: (edges) => set({ edges: Array.isArray(edges) ? edges : [] }),

  addEdge: (from, to, fromSlot='out', toSlot='src') => set(s => {
    const id = `edge_${from}_${to}_${uid()}`;
    // Remove existing edge to same input slot
    const filtered = s.edges.filter(e => !(e.to === to && e.toSlot === toSlot));
    return { edges: [...filtered, { id, from, to, fromSlot, toSlot }] };
  }),

  removeEdge: (id) => set(s => ({ edges: s.edges.filter(e => e.id !== id) })),

  // ─── Camera ───────────────────────────────────────────────────────────────
  setCamera: (patch) => set(s => ({ camera: { ...s.camera, ...patch } })),

  // ─── Selection ────────────────────────────────────────────────────────────
  setSelection: (patch) => set(s => ({ selection: { ...s.selection, ...patch } })),

  selectLayer: (id) => set(s => ({ selection: { ...s.selection, layerId:id, nodeId:null } })),
  selectNode:  (id) => set(s => ({ selection: { ...s.selection, nodeId:id, layerId:null } })),
  clearSelection: () => set({ selection: { layerId:null, nodeId:null, multi:[] } }),

  // ─── Undo/Redo (snapshot-based) ────────────────────────────────────────────
  snapshot: () => {
    const { layers, nodes, edges } = get();
    const snap = JSON.stringify({ layers, nodes, edges });
    set(s => {
      const hist = [...s._history.slice(0, s._historyIdx+1), snap];
      return { _history: hist.slice(-50), _historyIdx: hist.length - 1 };
    });
  },

  undo: () => set(s => {
    if (s._historyIdx <= 0) return {};
    const idx = s._historyIdx - 1;
    const { layers, nodes, edges } = JSON.parse(s._history[idx]);
    return { layers, nodes, edges, _historyIdx: idx };
  }),

  redo: () => set(s => {
    if (s._historyIdx >= s._history.length-1) return {};
    const idx = s._historyIdx + 1;
    const { layers, nodes, edges } = JSON.parse(s._history[idx]);
    return { layers, nodes, edges, _historyIdx: idx };
  }),

  // ─── Project ───────────────────────────────────────────────────────────────
  loadProject: (data) => set({
    timeline: data.timeline || { currentTime:0, duration:10, fps:30, playing:false, loop:true, loopStart:0, speed:1, zoom:1, markers:[] },
    layers:   Array.isArray(data.layers) ? data.layers : [],
    nodes:    Array.isArray(data.nodes)  ? data.nodes  : [],
    edges:    Array.isArray(data.edges)  ? data.edges  : [],
    camera:   data.camera || { x:0, y:0, z:0, zoom:1, rotation:0, perspective:800 },
    selection: { layerId:null, nodeId:null, multi:[] },
  }),

  resetProject: () => set({
    timeline: { currentTime:0, duration:10, fps:30, playing:false, loop:true, loopStart:0, speed:1, zoom:1, markers:[] },
    layers: [], nodes: [], edges: [],
    camera: { x:0, y:0, z:0, zoom:1, rotation:0, perspective:800 },
    selection: { layerId:null, nodeId:null, multi:[] },
  }),
}));

export default useEditorStore;
