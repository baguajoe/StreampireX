const cache = new Map();

export function memoRender(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const value = fn();
  cache.set(key, value);
  return value;
}

export function clearMemoRender() {
  cache.clear();
}
