// src/front/js/utils/compositor/engine/graphRunner.js
// SPX Graph Runner — frame-accurate graph execution with caching

import { topoSortNodes, evaluateGraph } from '../nodeEngine';

export function createGraphRunner({ width=1280, height=720, fps=30 } = {}) {
  const cache = new Map();
  let _nodes = [], _edges = [], _dirty = new Set();

  return {
    setGraph(nodes, edges) {
      _nodes = nodes;
      _edges = edges;
      cache.clear();
      _dirty = new Set(nodes.map(n => n.id));
    },

    invalidateNode(id) {
      _dirty.add(id);
      // Invalidate all downstream
      const downstream = _getDownstream(id);
      downstream.forEach(d => _dirty.add(d));
    },

    runFrame(frameNumber = 0) {
      const t = frameNumber / fps;
      // Inject time into animated nodes
      const timedNodes = _nodes.map(n => ({
        ...n,
        _frame: frameNumber,
        _time: t,
      }));
      const result = evaluateGraph(timedNodes, _edges, { width, height });
      _dirty.clear();
      return result;
    },

    getCache() { return cache; },
    getStats() {
      return { nodes: _nodes.length, edges: _edges.length, cached: cache.size, dirty: _dirty.size };
    },
  };

  function _getDownstream(id) {
    const downstream = new Set();
    const queue = [id];
    while (queue.length) {
      const curr = queue.shift();
      _edges
        .filter(e => (e.source || e.from) === curr)
        .forEach(e => {
          const tgt = e.target || e.to;
          if (!downstream.has(tgt)) { downstream.add(tgt); queue.push(tgt); }
        });
    }
    return downstream;
  }
}

export default { createGraphRunner };
