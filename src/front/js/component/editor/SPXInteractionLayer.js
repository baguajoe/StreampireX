export const createSnapGuide = (time, type = "marker") => ({
  id: `snap_${Date.now()}`,
  time,
  type
});

export const getSnapTime = ({
  rawTime,
  markers = [],
  clipEdges = [],
  threshold = 0.15
}) => {
  const candidates = [
    ...markers.map((m) => m.time),
    ...clipEdges
  ];

  for (const t of candidates) {
    if (Math.abs(t - rawTime) <= threshold) return t;
  }
  return rawTime;
};

export const createTrimState = () => ({
  isTrimming: false,
  clipId: null,
  edge: null
});

export const createDragState = () => ({
  isDragging: false,
  clipId: null,
  startX: 0,
  startY: 0
});

export const createPanelSize = (width = 320, height = 300) => ({
  width,
  height
});

export const resizePanel = (panel, deltaX = 0, deltaY = 0, minWidth = 220, minHeight = 180) => ({
  width: Math.max(minWidth, panel.width + deltaX),
  height: Math.max(minHeight, panel.height + deltaY)
});

export const createSelectionBox = (x1 = 0, y1 = 0, x2 = 0, y2 = 0) => ({
  x1, y1, x2, y2
});

export const isClipInSelectionBox = (clipRect, box) => {
  return !(
    clipRect.right < Math.min(box.x1, box.x2) ||
    clipRect.left > Math.max(box.x1, box.x2) ||
    clipRect.bottom < Math.min(box.y1, box.y2) ||
    clipRect.top > Math.max(box.y1, box.y2)
  );
};

export const zoomTimelineAroundCursor = ({
  currentZoom = 100,
  delta = 10
}) => Math.max(25, Math.min(800, currentZoom + delta));

export const createContextMenuItem = (label, action) => ({
  id: `${label}_${Date.now()}`,
  label,
  action
});
