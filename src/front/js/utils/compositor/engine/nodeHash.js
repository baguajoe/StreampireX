export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function hashNode(node = {}, frame = 0) {
  const raw = stableStringify({
    id: node.id,
    type: node.type,
    x: node.x,
    y: node.y,
    value: node.value,
    params: node.params || {},
    mediaUrl: node.mediaUrl || null,
    mediaType: node.mediaType || null,
    frame,
  });

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `node_${Math.abs(hash)}`;
}
