import { hashNode } from "./nodeHash";
import { buildNodeDependencyGraph, collectDependents } from "./dependencyGraph";
import {
  createFrameCacheStore,
  readCachedFrame,
  writeCachedFrame,
  markNodeDirty,
  clearNodeDirty,
  isNodeDirty,
} from "./frameCacheEngine";
import { buildPassSchedule } from "./passScheduler";
import { executeSingleNode } from "./nodeExecutor";

export function createGraphRunner() {
  const cacheStore = createFrameCacheStore();

  function invalidateNode(nodes = [], edges = [], nodeId) {
    const graph = buildNodeDependencyGraph(nodes, edges);
    markNodeDirty(cacheStore, nodeId);
    const dependents = collectDependents(graph, nodeId);
    dependents.forEach((id) => markNodeDirty(cacheStore, id));
    return Array.from(dependents);
  }

  function runGraph(nodes = [], edges = [], currentFrame = 0) {
    const schedule = buildPassSchedule(nodes, edges, currentFrame);
    const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const upstreamInputs = {};

    edges.forEach((e) => {
      if (!upstreamInputs[e.to]) upstreamInputs[e.to] = [];
      upstreamInputs[e.to].push(e.from);
    });

    const results = {};
    const executed = [];
    const cacheHits = [];

    for (const pass of schedule) {
      const node = nodeMap[pass.nodeId];
      if (!node) continue;

      const hash = hashNode(node, currentFrame);
      const cached = readCachedFrame(cacheStore, node.id, currentFrame, hash);

      if (cached && !isNodeDirty(cacheStore, node.id)) {
        results[node.id] = cached;
        cacheHits.push(node.id);
        continue;
      }

      const inputIds = upstreamInputs[node.id] || [];
      const inputValues = inputIds.map((id) => results[id]).filter(Boolean);
      const output = executeSingleNode(node, inputValues, currentFrame);

      results[node.id] = output;
      writeCachedFrame(cacheStore, node.id, currentFrame, hash, output);
      clearNodeDirty(cacheStore, node.id);
      executed.push(node.id);
    }

    return {
      frame: currentFrame,
      schedule,
      results,
      executed,
      cacheHits,
      finalOutput:
        Object.values(results).find((r) => r?.kind === "output") ||
        Object.values(results).at(-1) ||
        null,
    };
  }

  return {
    cacheStore,
    invalidateNode,
    runGraph,
  };
}
