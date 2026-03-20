export function createFrameCacheStore() {
  return {
    nodeFrames: new Map(),
    dirtyNodes: new Set(),
  };
}

export function getFrameCacheKey(nodeId, frame, hash) {
  return `${nodeId}::${frame}::${hash}`;
}

export function readCachedFrame(store, nodeId, frame, hash) {
  const key = getFrameCacheKey(nodeId, frame, hash);
  return store.nodeFrames.get(key) || null;
}

export function writeCachedFrame(store, nodeId, frame, hash, value) {
  const key = getFrameCacheKey(nodeId, frame, hash);
  store.nodeFrames.set(key, value);
}

export function markNodeDirty(store, nodeId) {
  store.dirtyNodes.add(nodeId);
}

export function clearNodeDirty(store, nodeId) {
  store.dirtyNodes.delete(nodeId);
}

export function isNodeDirty(store, nodeId) {
  return store.dirtyNodes.has(nodeId);
}

export function clearAllCache(store) {
  store.nodeFrames.clear();
  store.dirtyNodes.clear();
}
