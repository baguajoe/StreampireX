export function topologicalSort(nodes = [], edges = []) {
  const inDegree = {};
  const graph = {};
  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    graph[n.id] = [];
  });

  edges.forEach((e) => {
    if (!graph[e.from]) graph[e.from] = [];
    graph[e.from].push(e.to);
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  });

  const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
  const result = [];

  while (queue.length) {
    const id = queue.shift();
    result.push(id);
    (graph[id] || []).forEach((next) => {
      inDegree[next] -= 1;
      if (inDegree[next] === 0) queue.push(next);
    });
  }

  return result;
}

export function executeNodeGraph(nodes = [], edges = [], currentTime = 0) {
  const sorted = topologicalSort(nodes, edges);
  const map = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const outputs = {};

  sorted.forEach((id) => {
    const node = map[id];
    if (!node) return;

    switch (node.type) {
      case "color":
        outputs[id] = {
          type: "color",
          value: node.value || "#00ffc8",
        };
        break;

      case "text":
        outputs[id] = {
          type: "text",
          text: node.value || "Text",
          x: node.x ?? 320,
          y: node.y ?? 180,
          fontSize: node.fontSize ?? 42,
          color: node.color || "#ffffff",
        };
        break;

      case "shader":
        outputs[id] = {
          type: "shader",
          shader: node.shader || "basicColor",
          params: { ...(node.params || {}), time: currentTime },
        };
        break;

      case "transform":
        outputs[id] = {
          type: "transform",
          tx: node.params?.tx ?? 0,
          ty: node.params?.ty ?? 0,
          scale: node.params?.scale ?? 1,
          rotation: node.params?.rotation ?? 0,
        };
        break;

      case "merge":
        outputs[id] = {
          type: "merge",
          blendMode: node.params?.blendMode || "normal",
        };
        break;

      case "blur":
        outputs[id] = {
          type: "blur",
          amount: node.params?.amount ?? 8,
        };
        break;

      case "output":
        outputs[id] = {
          type: "output",
          source: node.inputs?.source || null,
        };
        break;

      default:
        outputs[id] = {
          type: "unknown",
          nodeType: node.type,
        };
    }
  });

  return { sorted, outputs };
}
