export function buildMediaPipeline(nodes = []) {
  const mediaNodes = nodes.filter(n => n.type === "mediaIn");

  if (!mediaNodes.length) {
    return { valid: false, reason: "No media input node" };
  }

  return {
    valid: true,
    input: mediaNodes[0].mediaUrl
  };
}
