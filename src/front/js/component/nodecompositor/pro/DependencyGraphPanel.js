import React, { useMemo } from "react";
import { buildDependencyGraph, invalidateDependents } from "../../../utils/render/dependencyGraph";

export default function DependencyGraphPanel({ nodes = [], edges = [] }) {
  const graph = useMemo(() => buildDependencyGraph(nodes, edges), [nodes, edges]);
  const firstNode = nodes[0]?.id;
  const invalidated = useMemo(
    () => (firstNode ? Array.from(invalidateDependents(graph, firstNode)) : []),
    [graph, firstNode]
  );

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Dependency Invalidation</div>
      <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", margin: 0 }}>
{JSON.stringify({ graph, invalidated }, null, 2)}
      </pre>
    </div>
  );
}
