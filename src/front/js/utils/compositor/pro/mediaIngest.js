export function normalizeMediaNode(file, mediaUrl) {
  return {
    id: `media_${Date.now()}`,
    type: "mediaIn",
    x: 120,
    y: 120,
    width: 320,
    height: 180,
    opacity: 1,
    mediaUrl,
    mediaType: file?.type?.startsWith("video/") ? "video" : "image",
    name: file?.name || "Media In"
  };
}
