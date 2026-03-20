import { topologicalOrder } from "./dependencyGraph";

export function buildPassSchedule(nodes = [], edges = [], currentFrame = 0) {
  const order = topologicalOrder(nodes, edges);
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return order.map((id, index) => ({
    passId: `pass_${index}_${id}`,
    nodeId: id,
    frame: currentFrame,
    type: nodeMap[id]?.type || "unknown",
  }));
}
