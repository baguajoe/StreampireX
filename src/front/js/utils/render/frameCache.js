export function createFrameCache() {
  return new Map();
}

export function getCachedFrame(cache, key) {
  return cache.get(key) || null;
}

export function setCachedFrame(cache, key, value) {
  cache.set(key, value);
  return cache;
}
