export function createTextLayer(partial = {}) {
  const id = partial.id || `motion_layer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return {
    id,
    type: "text",
    name: partial.name || "Text Layer",
    text: partial.text || "New Text",
    subtitle: partial.subtitle || "",
    x: partial.x ?? 50,
    y: partial.y ?? 50,
    z: partial.z ?? 0,
    scale: partial.scale ?? 1,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    color: partial.color || "#ffffff",
    fontSize: partial.fontSize ?? 42,
    fontWeight: partial.fontWeight ?? 700,
    shadow: partial.shadow ?? false,
    outline: partial.outline ?? false,
    animation: partial.animation || "fade_in",
    startTime: partial.startTime ?? 0,
    duration: partial.duration ?? 5,
    keyframes: partial.keyframes || {
      positionX: [],
      positionY: [],
      scale: [],
      rotation: [],
      opacity: [],
    },
  };
}

export function createLowerThirdLayer(partial = {}) {
  return createTextLayer({
    ...partial,
    type: "lowerThird",
    name: partial.name || "Lower Third",
    text: partial.text || "Name Here",
    subtitle: partial.subtitle || "Title / Role",
    y: partial.y ?? 82,
    fontSize: partial.fontSize ?? 30,
  });
}
