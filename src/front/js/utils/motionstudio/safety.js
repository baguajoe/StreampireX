export function safeLayers(layers) {
  if (!Array.isArray(layers)) return [];
  return layers.map(l => ({
    id: l.id || Math.random().toString(36),
    x: l.x ?? 50,
    y: l.y ?? 50,
    scale: l.scale ?? 1,
    opacity: l.opacity ?? 1,
    ...l
  }));
}
