export function buildNodeDependencyGraph(nodes = [], edges = []) {
  const downstream = {};
  const upstream = {};

  nodes.forEach((n) => {
    downstream[n.id] = [];
    upstream[n.id] = [];
  });

  edges.forEach((e) => {
    if (!downstream[e.from]) downstream[e.from] = [];
    if (!upstream[e.to]) upstream[e.to] = [];
    downstream[e.from].push(e.to);
    upstream[e.to].push(e.from);
  });

  return { downstream, upstream };
}

export function collectDependents(graph, nodeId, out = new Set()) {
  if (!graph?.downstream?.[nodeId]) return out;
  for (const child of graph.downstream[nodeId]) {
    if (!out.has(child)) {
      out.add(child);
      collectDependents(graph, child, out);
    }
  }
  return out;
}

export function topologicalOrder(nodes = [], edges = []) {
  const inDegree = {};
  const adj = {};

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adj[n.id] = [];
  });

  edges.forEach((e) => {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push(e.to);
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  });

  const q = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  const order = [];

  while (q.length) {
    const id = q.shift();
    order.push(id);
    for (const next of adj[id] || []) {
      inDegree[next] -= 1;
      if (inDegree[next] === 0) q.push(next);
    }
  }

  return order;
}
