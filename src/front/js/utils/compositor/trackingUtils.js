export function createTrackerState() {
  return {
    enabled: false,
    points: [],
    attachedNodeId: null,
    mode: "point",
    smoothing: 0.5,
  };
}

export function attachNodeToTracker(node, trackerPoint) {
  if (!node || !trackerPoint) return node;
  return {
    ...node,
    properties: {
      ...(node.properties || {}),
      x: trackerPoint.x,
      y: trackerPoint.y,
    },
  };
}
