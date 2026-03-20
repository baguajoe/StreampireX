export function buildDependencyGraph(nodes = [], edges = []) {
  const graph = {};
  nodes.forEach((n) => {
    graph[n.id] = [];
  });
  edges.forEach((e) => {
    if (!graph[e.from]) graph[e.from] = [];
    graph[e.from].push(e.to);
  });
  return graph;
}

export function invalidateDependents(graph = {}, nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);
  (graph[nodeId] || []).forEach((child) => invalidateDependents(graph, child, visited));
  return visited;
}
