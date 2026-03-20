export function createRenderJob(config = {}) {
  return {
    id: `render_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: config.name || "SPX Render",
    format: config.format || "png",
    width: config.width || 1920,
    height: config.height || 1080,
    fps: config.fps || 30,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}

export function updateRenderJob(queue = [], id, patch = {}) {
  return queue.map((job) => (job.id === id ? { ...job, ...patch } : job));
}
