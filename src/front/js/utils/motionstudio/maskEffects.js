export function defaultLayerMask() {
  return {
    enabled: false,
    shape: "rectangle",
    x: 50,
    y: 50,
    width: 40,
    height: 40,
    feather: 0,
    invert: false,
  };
}

export function defaultLayerEffects() {
  return {
    blur: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
  };
}
