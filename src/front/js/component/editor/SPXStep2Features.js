export const createShapeLayer = ({
  id,
  name = "Shape Layer",
  shape = "rectangle",
  fill = "#ffffff",
  stroke = "#000000",
  strokeWidth = 0,
  x = 0,
  y = 0,
  width = 200,
  height = 100
} = {}) => ({
  id: id || `shape_${Date.now()}`,
  type: "shape",
  name,
  shape,
  fill,
  stroke,
  strokeWidth,
  x,
  y,
  width,
  height
});

export const createTextAnimator = ({
  id,
  name = "Text Animator",
  mode = "per-character",
  opacity = [],
  position = [],
  scale = [],
  rotation = []
} = {}) => ({
  id: id || `textanim_${Date.now()}`,
  name,
  mode,
  opacity,
  position,
  scale,
  rotation
});

export const createMask = ({
  id,
  type = "bezier",
  feather = 0,
  invert = false,
  points = []
} = {}) => ({
  id: id || `mask_${Date.now()}`,
  type,
  feather,
  invert,
  points
});

export const createCompoundClip = ({
  id,
  name = "Compound Clip",
  clips = []
} = {}) => ({
  id: id || `compound_${Date.now()}`,
  type: "compound",
  name,
  clips
});

export const SPX_COLOR_WHEELS = {
  lift: { r: 0, g: 0, b: 0 },
  gamma: { r: 0, g: 0, b: 0 },
  gain: { r: 0, g: 0, b: 0 },
  offset: { r: 0, g: 0, b: 0 }
};

export const SPX_CURVES = {
  luma: [],
  red: [],
  green: [],
  blue: [],
  hueVsHue: [],
  hueVsSat: [],
  hueVsLuma: []
};

export const exportLUTDefinition = ({
  name = "SPX LUT",
  points = []
} = {}) => ({
  name,
  format: ".cube",
  points
});

export const detectScenesStub = (frames = []) => {
  return frames.map((_, index) => ({
    id: `scene_${index + 1}`,
    start: index * 5,
    end: index * 5 + 5
  }));
};

export const detectHighlightsStub = (segments = []) => {
  return segments
    .map((segment, index) => ({
      id: `highlight_${index + 1}`,
      score: Math.random(),
      ...segment
    }))
    .filter((segment) => segment.score > 0.6);
};

export const autoReframeStub = ({
  sourceAspect = "16:9",
  targetAspect = "9:16",
  subjectX = 0.5,
  subjectY = 0.5
} = {}) => ({
  sourceAspect,
  targetAspect,
  cropCenter: {
    x: subjectX,
    y: subjectY
  }
});
