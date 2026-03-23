export const SPX_TRACK_TYPES = [
  "video",
  "audio",
  "title",
  "adjustment",
  "node"
];

export const SPX_BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "soft-light",
  "hard-light",
  "color-dodge",
  "difference",
  "luminosity"
];

export const SPX_SNAP_MODES = {
  playhead: true,
  markers: true,
  clipEdges: true,
  beats: false
};

export const SPX_RIPPLE_MODES = [
  "none",
  "ripple",
  "roll",
  "slip",
  "slide"
];

export const createMarker = ({
  id,
  time = 0,
  color = "yellow",
  label = "Marker",
  comment = ""
}) => ({
  id: id || `marker_${Date.now()}`,
  time,
  color,
  label,
  comment
});

export const createKeyframeTrack = ({
  property = "position",
  points = []
} = {}) => ({
  property,
  points
});

export const createAdjustmentLayer = ({
  id,
  name = "Adjustment Layer",
  start = 0,
  length = 5,
  effects = []
} = {}) => ({
  id: id || `adjust_${Date.now()}`,
  type: "adjustment",
  name,
  start,
  length,
  effects
});

export const reorderEffectStack = (effects = [], fromIndex, toIndex) => {
  const next = [...effects];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const saveUserPreset = ({
  id,
  name,
  category = "Custom",
  source = "User",
  settings = {}
}) => ({
  id: id || `preset_${Date.now()}`,
  name,
  category,
  source,
  settings,
  createdAt: new Date().toISOString()
});

export const toggleClipSelection = (selectedIds = [], clipId) => {
  return selectedIds.includes(clipId)
    ? selectedIds.filter((id) => id !== clipId)
    : [...selectedIds, clipId];
};

export const clearClipSelection = () => [];

export const applyBlendModeToClip = (clip, mode = "normal") => ({
  ...clip,
  blendMode: mode
});

export const attachMarkerToTimeline = (markers = [], marker) => [
  ...markers,
  marker
].sort((a, b) => a.time - b.time);
