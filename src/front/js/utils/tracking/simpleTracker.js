export function trackPoint(prev, next) {
  return {
    dx: (next?.x ?? 0) - (prev?.x ?? 0),
    dy: (next?.y ?? 0) - (prev?.y ?? 0),
  };
}

export function applyTrackToLayer(layer, track) {
  return {
    ...layer,
    x: (layer.x ?? 0) + (track?.dx ?? 0),
    y: (layer.y ?? 0) + (track?.dy ?? 0),
  };
}
