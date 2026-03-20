export function evaluateGraph(nodes = []) {
  const results = {};

  nodes.forEach((node) => {
    if (node.type === "value" || node.type === "color") {
      results[node.id] = node.value;
    }

    if (node.type === "merge") {
      const a = results[node.inputs?.a];
      const b = results[node.inputs?.b];
      results[node.id] = a ?? b ?? null;
    }

    if (node.type === "shader") {
      results[node.id] = {
        shader: node.shader || "basic",
        params: node.params || {},
      };
    }

    if (node.type === "output") {
      results[node.id] = results[node.inputs?.source] ?? null;
    }
  });

  return results;
}
