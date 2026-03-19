import { applyAnimatedProps } from "./nodeAnimation";

function buildInputMap(edges) {
  const map = {};
  edges.forEach((edge) => {
    if (!map[edge.toNodeId]) map[edge.toNodeId] = {};
    map[edge.toNodeId][edge.toPort] = {
      fromNodeId: edge.fromNodeId,
      fromPort: edge.fromPort
    };
  });
  return map;
}

function getNodeById(nodes, nodeId) {
  return nodes.find((n) => n.id === nodeId) || null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildFilterString(props = {}) {
  const filters = [];
  if (props.blur !== undefined && props.blur !== 0 && props.blur !== 0.0) filters.push(`blur(${props.blur}px)`);
  if (props.brightness !== undefined && props.brightness !== 100) filters.push(`brightness(${props.brightness}%)`);
  if (props.contrast !== undefined && props.contrast !== 100) filters.push(`contrast(${props.contrast}%)`);
  if (props.saturate !== undefined && props.saturate !== 100) filters.push(`saturate(${props.saturate}%)`);
  if (props.hueRotate !== undefined && props.hueRotate !== 0) filters.push(`hue-rotate(${props.hueRotate}deg)`);
  return filters.join(" ");
}

function buildTransformString(props = {}) {
  const x = props.x || 0;
  const y = props.y || 0;
  const scale = props.scale ?? 1;
  const rotation = props.rotation || 0;
  return `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
}

function applyPropsToVisual(visual, props = {}) {
  return {
    ...visual,
    opacity: props.opacity ?? visual.opacity ?? 1,
    transform: [visual.transform, buildTransformString(props)].filter(Boolean).join(" "),
    filter: [visual.filter, buildFilterString(props)].filter(Boolean).join(" ")
  };
}

function pathOffset(props = {}, time = 0) {
  const speed = props.speed ?? 1;
  const phase = props.phase ?? 0;
  const t = time * speed + phase;
  const ax = props.amplitudeX ?? 120;
  const ay = props.amplitudeY ?? 80;

  if (props.preset === "wave") {
    return { x: Math.sin(t) * ax, y: Math.sin(t * 2) * ay * 0.35, rotation: 0 };
  }
  if (props.preset === "figure8") {
    return { x: Math.sin(t) * ax, y: Math.sin(t * 2) * ay * 0.6, rotation: props.rotateAlongPath ? Math.cos(t) * 18 : 0 };
  }
  if (props.preset === "rise") {
    return { x: Math.sin(t * 0.6) * ax * 0.25, y: -Math.abs(Math.sin(t)) * ay, rotation: 0 };
  }
  if (props.preset === "drift") {
    return { x: Math.sin(t * 0.45) * ax, y: Math.cos(t * 0.35) * ay * 0.45, rotation: props.rotateAlongPath ? Math.sin(t * 0.45) * 8 : 0 };
  }
  return { x: Math.cos(t) * ax, y: Math.sin(t) * ay, rotation: props.rotateAlongPath ? (t * 18) % 360 : 0 };
}

function evaluateNode(node, nodes, edges, memo, visiting, currentTime = 0) {
  if (!node) return null;
  if (memo[node.id]) return memo[node.id];
  if (visiting.has(node.id)) return null;

  visiting.add(node.id);
  const inputMap = buildInputMap(edges);
  const inputs = inputMap[node.id] || {};
  const animatedProps = applyAnimatedProps(node.properties || {}, node.keyframes || [], currentTime);

  let result = null;

  if (node.type === "mediaIn") {
    result = {
      kind: "media",
      width: animatedProps.width || 640,
      height: animatedProps.height || 360,
      opacity: animatedProps.opacity ?? 1,
      background: "linear-gradient(135deg,#102030,#1d3557)",
      label: animatedProps.name || "Media In",
      mediaUrl: animatedProps.mediaUrl || "",
      transform: "",
      filter: ""
    };
  }

  if (node.type === "text") {
    result = {
      kind: "text",
      text: animatedProps.text || "Text",
      xPercent: clamp(animatedProps.x ?? 50, 0, 100),
      yPercent: clamp(animatedProps.y ?? 50, 0, 100),
      fontSize: animatedProps.fontSize || 42,
      color: animatedProps.color || "#ffffff",
      fontWeight: animatedProps.fontWeight || 800,
      opacity: animatedProps.opacity ?? 1,
      transform: "",
      filter: ""
    };
  }

  if (node.type === "mask") {
    result = {
      kind: "mask",
      shape: animatedProps.shape || "rectangle",
      xPercent: clamp(animatedProps.x ?? 50, 0, 100),
      yPercent: clamp(animatedProps.y ?? 50, 0, 100),
      widthPercent: clamp(animatedProps.width ?? 40, 1, 100),
      heightPercent: clamp(animatedProps.height ?? 40, 1, 100),
      feather: animatedProps.feather ?? 0,
      invert: !!animatedProps.invert,
      opacity: animatedProps.opacity ?? 1
    };
  }

  if (node.type === "camera") {
    result = {
      kind: "camera",
      x: animatedProps.x || 0,
      y: animatedProps.y || 0,
      zoom: animatedProps.zoom ?? 1,
      rotation: animatedProps.rotation || 0
    };
  }

  if (node.type === "transform") {
    const srcRef = inputs.image;
    const src = srcRef ? evaluateNode(getNodeById(nodes, srcRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    result = src ? applyPropsToVisual(src, animatedProps) : null;
  }

  if (node.type === "path") {
    const srcRef = inputs.image;
    const src = srcRef ? evaluateNode(getNodeById(nodes, srcRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    if (src) {
      const motion = pathOffset(animatedProps, currentTime);
      result = applyPropsToVisual(src, {
        x: motion.x,
        y: motion.y,
        rotation: motion.rotation,
        opacity: animatedProps.opacity ?? 1
      });
    } else {
      result = null;
    }
  }

  if (node.type === "colorCorrect" || node.type === "adjustment") {
    const srcRef = inputs.image;
    const src = srcRef ? evaluateNode(getNodeById(nodes, srcRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    result = src
      ? {
          ...src,
          opacity: animatedProps.opacity ?? src.opacity ?? 1,
          filter: [src.filter, buildFilterString(animatedProps)].filter(Boolean).join(" ")
        }
      : null;
  }

  if (node.type === "blur") {
    const srcRef = inputs.image;
    const src = srcRef ? evaluateNode(getNodeById(nodes, srcRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    result = src
      ? {
          ...src,
          opacity: animatedProps.opacity ?? src.opacity ?? 1,
          filter: [src.filter, `blur(${animatedProps.amount || 8}px)`].filter(Boolean).join(" ")
        }
      : null;
  }

  if (node.type === "merge") {
    const bgRef = inputs.background;
    const fgRef = inputs.foreground;
    const maskRef = inputs.mask;

    const bg = bgRef ? evaluateNode(getNodeById(nodes, bgRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    const fg = fgRef ? evaluateNode(getNodeById(nodes, fgRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    const mask = maskRef ? evaluateNode(getNodeById(nodes, maskRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;

    result = {
      kind: "merge",
      blendMode: animatedProps.blendMode || "normal",
      opacity: animatedProps.opacity ?? 1,
      backgroundLayer: bg,
      foregroundLayer: fg,
      maskLayer: mask
    };
  }

  if (node.type === "output") {
    const srcRef = inputs.image;
    const camRef = inputs.camera;
    const src = srcRef ? evaluateNode(getNodeById(nodes, srcRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    const camera = camRef ? evaluateNode(getNodeById(nodes, camRef.fromNodeId), nodes, edges, memo, visiting, currentTime) : null;
    result = {
      kind: "scene",
      image: src || null,
      camera: camera || { kind: "camera", x: 0, y: 0, zoom: 1, rotation: 0 }
    };
  }

  memo[node.id] = result;
  visiting.delete(node.id);
  return result;
}

export function evaluateGraph(nodes, edges, currentTime = 0) {
  const outputs = nodes.filter((n) => n.type === "output");
  const memo = {};
  const visiting = new Set();

  if (outputs.length === 0) return null;
  const primaryOutput = outputs[0];
  return evaluateNode(primaryOutput, nodes, edges, memo, visiting, currentTime);
}
