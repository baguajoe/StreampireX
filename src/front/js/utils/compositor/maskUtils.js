export function defaultMask() {
  return {
    shape: "rectangle",
    x: 50,
    y: 50,
    width: 40,
    height: 40,
    feather: 0,
    invert: false,
    points: [],
  };
}

export function createBezierMaskPoint(x, y) {
  return {
    x,
    y,
    inX: x - 10,
    inY: y,
    outX: x + 10,
    outY: y,
  };
}
