// src/front/js/utils/render/dependencyGraph.js

export function buildDependencyGraph(nodes = [], edges = []) {
  const graph = {};
  nodes.forEach(n => { graph[n.id] = { id: n.id, type: n.type, deps: [], dependents: [] }; });
  edges.forEach(e => {
    const src = e.source || e.from;
    const tgt = e.target || e.to;
    if (graph[src] && graph[tgt]) {
      graph[tgt].deps.push(src);
      graph[src].dependents.push(tgt);
    }
  });
  return graph;
}

// BFS from changed node — returns all downstream node IDs
export function invalidateDependents(graph, changedId) {
  const invalid = new Set();
  const queue = [changedId];
  while (queue.length) {
    const id = queue.shift();
    if (!graph[id]) continue;
    for (const dep of graph[id].dependents) {
      if (!invalid.has(dep)) {
        invalid.add(dep);
        queue.push(dep);
      }
    }
  }
  return invalid;
}

// Get execution order for a subgraph rooted at outputId
export function getExecutionOrder(graph, outputId) {
  const visited = new Set();
  const order = [];
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = graph[id];
    if (!node) return;
    node.deps.forEach(d => visit(d));
    order.push(id);
  }
  visit(outputId);
  return order;
}

export default { buildDependencyGraph, invalidateDependents, getExecutionOrder };
