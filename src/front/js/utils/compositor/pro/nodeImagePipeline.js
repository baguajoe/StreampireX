export function runImagePipeline(layers = [], passes = []) {
  return {
    layers,
    passes,
    processed: true,
    timestamp: Date.now(),
  };
}
