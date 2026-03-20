export function convertLayersToNodes(layers = []) {
  return layers.map((layer) => ({
    id: layer.id,
    type: "layer",
    x: layer.x ?? 120,
    y: layer.y ?? 120,
    value: layer,
    inputs: {},
    outputs: {},
  }));
}
