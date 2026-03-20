export function defaultCamera25D() {
  return {
    x: 0,
    y: 0,
    z: 1000,
    zoom: 1,
    rotation: 0,
    perspective: 800,
  };
}

export function projectLayer25D(layer = {}, camera = defaultCamera25D()) {
  const z = layer.z || 0;
  const depth = Math.max(0.1, (camera.perspective + z) / camera.perspective);
  return {
    ...layer,
    projectedScale: (layer.scale ?? 1) / depth * (camera.zoom ?? 1),
    projectedX: (layer.x ?? 0) - (camera.x ?? 0) / depth,
    projectedY: (layer.y ?? 0) - (camera.y ?? 0) / depth,
  };
}
