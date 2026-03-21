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

  chromaKey: {
    type: "chromaKey",
    label: "Chroma Key",
    color: "#4caf50",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Chroma Key",
      keyColor: "#00ff00",
      tolerance: 30,
      spill: 10,
      softness: 5,
      opacity: 1
    }
  },
  glow: {
    type: "glow",
    label: "Glow",
    color: "#fff176",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Glow",
      radius: 15,
      intensity: 1.5,
      threshold: 0.6,
      color: "#ffffff",
      opacity: 1
    }
  },
  sharpen: {
    type: "sharpen",
    label: "Sharpen",
    color: "#80cbc4",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Sharpen",
      strength: 0.5,
      opacity: 1
    }
  },
  noise: {
    type: "noise",
    label: "Noise/Grain",
    color: "#a1887f",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Noise",
      amount: 0.1,
      monochrome: false,
      opacity: 1
    }
  },
  crop: {
    type: "crop",
    label: "Crop",
    color: "#ffb74d",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Crop",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      opacity: 1
    }
  },
  resize: {
    type: "resize",
    label: "Resize",
    color: "#4db6ac",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Resize",
      width: 1920,
      height: 1080,
      keepAspect: true,
      opacity: 1
    }
  },
  flip: {
    type: "flip",
    label: "Flip/Mirror",
    color: "#ce93d8",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Flip",
      horizontal: false,
      vertical: false,
      opacity: 1
    }
  },
  colorCurves: {
    type: "colorCurves",
    label: "Color Curves",
    color: "#f48fb1",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Color Curves",
      master: [[0,0],[0.5,0.5],[1,1]],
      red: [[0,0],[1,1]],
      green: [[0,0],[1,1]],
      blue: [[0,0],[1,1]],
      opacity: 1
    }
  },
  levels: {
    type: "levels",
    label: "Levels",
    color: "#b39ddb",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Levels",
      inBlack: 0,
      inWhite: 255,
      gamma: 1,
      outBlack: 0,
      outWhite: 255,
      opacity: 1
    }
  },
  vignette: {
    type: "vignette",
    label: "Vignette",
    color: "#546e7a",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Vignette",
      strength: 0.5,
      radius: 0.7,
      softness: 0.3,
      color: "#000000",
      opacity: 1
    }
  },
  lensDistortion: {
    type: "lensDistortion",
    label: "Lens Distortion",
    color: "#0097a7",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Lens Distortion",
      barrel: 0,
      pincushion: 0,
      chromaAberration: 0,
      opacity: 1
    }
  },
  emboss: {
    type: "emboss",
    label: "Emboss",
    color: "#8d6e63",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Emboss",
      strength: 1,
      direction: 135,
      opacity: 1
    }
  },
  edgeDetect: {
    type: "edgeDetect",
    label: "Edge Detect",
    color: "#37474f",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Edge Detect",
      threshold: 50,
      color: "#ffffff",
      opacity: 1
    }
  },
  dropShadow: {
    type: "dropShadow",
    label: "Drop Shadow",
    color: "#455a64",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Drop Shadow",
      offsetX: 4,
      offsetY: 4,
      blur: 8,
      color: "#000000",
      opacity: 0.7
    }
  },
  particles: {
    type: "particles",
    label: "Particle System",
    color: "#ff6f00",
    inputs: [],
    outputs: ["image"],
    defaults: {
      name: "Particles",
      count: 100,
      size: 4,
      speed: 2,
      lifetime: 3,
      color: "#ffffff",
      gravity: -0.1,
      spread: 360,
      emitX: 50,
      emitY: 80,
      opacity: 1
    }
  },
  motionBlur: {
    type: "motionBlur",
    label: "Motion Blur",
    color: "#7986cb",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Motion Blur",
      angle: 0,
      distance: 10,
      opacity: 1
    }
  },
  colorize: {
    type: "colorize",
    label: "Colorize",
    color: "#f06292",
    inputs: ["image"],
    outputs: ["image"],
    defaults: {
      name: "Colorize",
      color: "#ff6600",
      strength: 0.5,
      opacity: 1
    }
  },
  gradient: {
    type: "gradient",
    label: "Gradient",
    color: "#26a69a",
    inputs: [],
    outputs: ["image"],
    defaults: {
      name: "Gradient",
      type: "linear",
      colorA: "#000000",
      colorB: "#ffffff",
      angle: 0,
      opacity: 1
    }
  },
  solidColor: {
    type: "solidColor",
    label: "Solid Color",
    color: "#ef5350",
    inputs: [],
    outputs: ["image"],
    defaults: {
      name: "Solid Color",
      color: "#000000",
      width: 1920,
      height: 1080,
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
  "normal", "screen", "multiply", "overlay", "lighten", "darken",
  "color-dodge", "color-burn", "hard-light", "soft-light",
  "difference", "exclusion", "hue", "saturation", "color", "luminosity"
];

export const MASK_SHAPES = ["rectangle", "circle", "ellipse", "triangle", "polygon", "freeform"];
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
