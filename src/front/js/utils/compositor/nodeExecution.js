export function topoSortNodes(nodes = [], edges = []) {
  const indegree = new Map();
  const graph = new Map();
  nodes.forEach((n) => {
    indegree.set(n.id, 0);
    graph.set(n.id, []);
  });

  edges.forEach((e) => {
    const source = e.source || e.from;
    const target = e.target || e.to;
    if (!graph.has(source) || !graph.has(target)) return;
    graph.get(source).push(target);
    indegree.set(target, (indegree.get(target) || 0) + 1);
  });

  const queue = [];
  indegree.forEach((deg, id) => deg === 0 && queue.push(id));

  const out = [];
  while (queue.length) {
    const id = queue.shift();
    const node = nodes.find((n) => n.id === id);
    if (node) out.push(node);
    for (const next of graph.get(id) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  return out.length === nodes.length ? out : nodes;
}

export function getInputNodes(node, nodes = [], edges = []) {
  const incoming = edges.filter((e) => (e.target || e.to) === node.id);
  return incoming
    .map((e) => nodes.find((n) => n.id === (e.source || e.from)))
    .filter(Boolean);
}

export function findOutputNode(nodes = []) {
  return nodes.find((n) => (n.type || "").toLowerCase() === "output") || nodes[nodes.length - 1] || null;
}
