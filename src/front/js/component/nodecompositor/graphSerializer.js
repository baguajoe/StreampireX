export function serializeGraph(nodes, edges) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    },
    null,
    2
  );
}

export function deserializeGraph(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : []
    };
  } catch (error) {
    console.error("Failed to parse graph JSON:", error);
    return { nodes: [], edges: [] };
  }
}

export function downloadGraphJSON(filename, jsonText) {
  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
