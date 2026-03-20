// src/front/js/utils/motionstudio/camera25d.js
// SPX Motion — 2.5D Camera system with parallax + perspective projection

export function defaultCamera25D() {
  return { x:0, y:0, z:0, zoom:1, rotation:0, perspective:800 };
}

export function projectLayer25D(layer = {}, camera = defaultCamera25D()) {
  const z = (layer.z ?? 0) - (camera.z ?? 0);
  const depth = Math.max(0.01, (camera.perspective + z) / camera.perspective);
  const zoom = camera.zoom ?? 1;

  // Parallax offset based on z depth
  const parallaxX = (camera.x ?? 0) * (1 - 1/depth);
  const parallaxY = (camera.y ?? 0) * (1 - 1/depth);

  return {
    ...layer,
    projectedScale: (layer.scale ?? 1) / depth * zoom,
    projectedX:     (layer.x ?? 0) - parallaxX,
    projectedY:     (layer.y ?? 0) - parallaxY,
    projectedDepth: depth,
  };
}

export function orbitCamera(camera, deltaX, deltaY, radius = 500) {
  const theta = (camera.theta ?? 0) + deltaX * 0.01;
  const phi   = Math.max(-1.4, Math.min(1.4, (camera.phi ?? 0) + deltaY * 0.01));
  return {
    ...camera,
    theta, phi,
    x: radius * Math.sin(theta) * Math.cos(phi),
    y: radius * Math.sin(phi),
    z: radius * Math.cos(theta) * Math.cos(phi),
  };
}

export function zoomCamera(camera, delta) {
  return { ...camera, zoom: Math.max(0.05, Math.min(10, (camera.zoom ?? 1) + delta)) };
}

export function panCamera(camera, dx, dy) {
  return { ...camera, x: (camera.x??0) + dx, y: (camera.y??0) + dy };
}

export function resetCamera() {
  return defaultCamera25D();
}

export function getCameraMatrix(camera) {
  const cos = Math.cos((camera.rotation ?? 0) * Math.PI / 180);
  const sin = Math.sin((camera.rotation ?? 0) * Math.PI / 180);
  return {
    a: cos * (camera.zoom??1), b: -sin * (camera.zoom??1),
    c: sin * (camera.zoom??1), d:  cos * (camera.zoom??1),
    e: camera.x ?? 0,          f: camera.y ?? 0,
  };
}

export default { defaultCamera25D, projectLayer25D, orbitCamera, zoomCamera, panCamera, resetCamera, getCameraMatrix };
