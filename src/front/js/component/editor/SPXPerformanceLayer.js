export const SPX_PREVIEW_QUALITY = [
  "full",
  "half",
  "quarter"
];

export const createFrameCache = () => ({
  frames: new Map(),
  set(key, value) {
    this.frames.set(key, value);
  },
  get(key) {
    return this.frames.get(key);
  },
  has(key) {
    return this.frames.has(key);
  },
  clear() {
    this.frames.clear();
  }
});

export const createNodeCache = () => ({
  nodes: new Map(),
  set(key, value) {
    this.nodes.set(key, value);
  },
  get(key) {
    return this.nodes.get(key);
  },
  invalidate(key) {
    this.nodes.delete(key);
  },
  clear() {
    this.nodes.clear();
  }
});

export const createProxyAsset = (asset, quality = "quarter") => ({
  ...asset,
  proxy: true,
  proxyQuality: quality,
  proxyPath: `${asset.name || "asset"}_${quality}_proxy`
});

export const getPreviewResolution = (quality, width, height) => {
  if (quality === "half") return { width: Math.round(width / 2), height: Math.round(height / 2) };
  if (quality === "quarter") return { width: Math.round(width / 4), height: Math.round(height / 4) };
  return { width, height };
};

export const createRenderBatch = (jobs = []) => ({
  id: `batch_${Date.now()}`,
  jobs,
  status: "queued"
});

export const createWaveformCache = () => ({
  waveforms: new Map(),
  set(key, value) {
    this.waveforms.set(key, value);
  },
  get(key) {
    return this.waveforms.get(key);
  },
  clear() {
    this.waveforms.clear();
  }
});

export const createThumbnailJob = (asset) => ({
  id: `thumb_${Date.now()}`,
  assetId: asset.id,
  status: "queued"
});

export const createPerformanceState = () => ({
  previewQuality: "half",
  useProxy: false,
  frameCache: createFrameCache(),
  nodeCache: createNodeCache(),
  waveformCache: createWaveformCache(),
  renderBatches: [],
  thumbnailJobs: []
});
