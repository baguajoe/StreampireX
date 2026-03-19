export const NODE_TYPES = {
  mediaIn: {
    type: "mediaIn",
    label: "Media In",
    color: "#00bcd4",
    inputs: [],
    outputs: ["image"],
    defaults: {
      name: "Media In",
      mediaUrl: "",
      width: 640,
      height: 360,
      opacity: 1
    }
  },
  text: {
    type: "text",
    label: "Text",
    color: "#8bc34a",
    inputs: [],
    outputs: ["image"],
    defaults: {
      name: "Text",
      text: "StreamPireX",
      x: 50,
      y: 50,
      fontSize: 42,
      color: "#ffffff",
      fontWeight: 800,
      opacity: 1
    }
  },
  transform: {
    type: "transform",
    label: "Transform",
    color: "#ff9800",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Transform",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1
    }
  },
  colorCorrect: {
    type: "colorCorrect",
    label: "Color Correct",
    color: "#e91e63",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Color Correct",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      opacity: 1
    }
  },
  blur: {
    type: "blur",
    label: "Blur",
    color: "#9c27b0",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Blur",
      amount: 8,
      opacity: 1
    }
  },
  adjustment: {
    type: "adjustment",
    label: "Adjustment",
    color: "#673ab7",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Adjustment",
      brightness: 100,
      contrast: 100,
      saturate: 100,
      hueRotate: 0,
      blur: 0,
      opacity: 1
    }
  },
  mask: {
    type: "mask",
    label: "Mask",
    color: "#ffc107",
    inputs: [],
    outputs: ["mask"],
    defaults: {
      name: "Mask",
      shape: "rectangle",
      x: 50,
      y: 50,
      width: 40,
      height: 40,
      feather: 0,
      invert: false,
      opacity: 1
    }
  },
  path: {
    type: "path",
    label: "Path",
    color: "#26c6da",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Path",
      preset: "orbit",
      amplitudeX: 120,
      amplitudeY: 80,
      speed: 1,
      phase: 0,
      rotateAlongPath: false,
      opacity: 1
    }
  },
  camera: {
    type: "camera",
    label: "Camera",
    color: "#ff7043",
    inputs: [],
    outputs: ["camera"],
    defaults: {
      name: "Camera",
      x: 0,
      y: 0,
      zoom: 1,
      rotation: 0
    }
  },
  merge: {
    type: "merge",
    label: "Merge",
    color: "#2196f3",
    inputs: ["background", "foreground", "mask"],
    outputs: ["image"],
    defaults: {
      name: "Merge",
      blendMode: "normal",
      opacity: 1
    }
  },
  output: {
    type: "output",
    label: "Output",
    color: "#f44336",
    inputs: ["image", "camera"],
    outputs: [],
    defaults: {
      name: "Output"
    }
  }
};

export const BLEND_MODES = [
  "normal",
  "screen",
  "multiply",
  "overlay",
  "lighten",
  "darken"
];

export const MASK_SHAPES = ["rectangle", "circle"];
export const PATH_PRESETS = ["orbit", "wave", "figure8", "rise", "drift"];

export const createNodeFromType = (type, x = 120, y = 120) => {
  const cfg = NODE_TYPES[type];
  if (!cfg) return null;

  return {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: cfg.type,
    label: cfg.label,
    color: cfg.color,
    inputs: cfg.inputs,
    outputs: cfg.outputs,
    x,
    y,
    width: 180,
    properties: { ...cfg.defaults },
    keyframes: []
  };
};
