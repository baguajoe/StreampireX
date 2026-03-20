export function defaultMotionCamera() {
  return {
    x: 0,
    y: 0,
    z: 1000,
    zoom: 1,
    rotation: 0,
    perspective: 800,
  };
}

export function projectLayerWithCamera(layer = {}, camera = defaultMotionCamera(), width = 1920, height = 1080) {
  const lx = layer.x ?? 50;
  const ly = layer.y ?? 50;
  const lz = layer.z ?? 0;

  const cx = camera.x ?? 0;
  const cy = camera.y ?? 0;
  const cz = camera.z ?? 1000;
  const zoom = camera.zoom ?? 1;
  const perspective = camera.perspective ?? 800;

  const depthFactor = Math.max(0.15, (perspective + lz) / perspective);
  const projectedScale = (layer.scale ?? 1) / depthFactor * zoom;

  const projectedX = lx - cx / depthFactor;
  const projectedY = ly - cy / depthFactor;

  return {
    ...layer,
    projectedX,
    projectedY,
    projectedScale,
    projectedDepth: depthFactor,
    cameraZ: cz,
    stageWidth: width,
    stageHeight: height,
  };
}

export function projectMotionLayers(layers = [], camera = defaultMotionCamera(), width = 1920, height = 1080) {
  return layers.map((layer) => projectLayerWithCamera(layer, camera, width, height));
}
