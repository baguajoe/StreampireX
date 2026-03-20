export function createMediaRegistry() {
  return new Map();
}

export async function loadMediaSource(url, type = "image") {
  if (!url) return null;

  if (type === "video") {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.addEventListener("loadeddata", () => resolve(video), { once: true });
      video.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function ensureMediaCached(registry, node) {
  if (!node?.mediaUrl) return null;
  const key = `${node.type}:${node.mediaUrl}`;
  if (registry.has(key)) return registry.get(key);

  const asset = await loadMediaSource(node.mediaUrl, node.mediaType || "image");
  registry.set(key, asset);
  return asset;
}

export async function prewarmMediaNodes(nodes = [], registry) {
  const mediaNodes = nodes.filter((n) => n.type === "mediaIn" && n.mediaUrl);
  for (const node of mediaNodes) {
    try {
      await ensureMediaCached(registry, node);
    } catch (err) {
      console.warn("Failed to prewarm media node", node.id, err);
    }
  }
}

export function drawMediaNode(ctx, asset, node, currentTime = 0) {
  if (!ctx || !asset || !node) return;
  const x = node.x ?? 80;
  const y = node.y ?? 80;
  const w = node.width ?? 320;
  const h = node.height ?? 180;
  const opacity = node.opacity ?? 1;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (asset instanceof HTMLVideoElement) {
    if (asset.paused) {
      asset.currentTime = Math.min(currentTime, Math.max(0, (asset.duration || currentTime)));
      asset.play().catch(() => {});
      asset.pause();
    }
    ctx.drawImage(asset, x, y, w, h);
  } else {
    ctx.drawImage(asset, x, y, w, h);
  }

  ctx.restore();
}
