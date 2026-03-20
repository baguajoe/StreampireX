// src/front/js/utils/compositor/pro/mediaIngest.js
export function normalizeMediaNode(file, url) {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  const el = isVideo ? document.createElement('video') : new Image();
  el.src = url;
  if (isVideo) { el.muted = true; el.playsInline = true; el.load(); }

  return {
    id: `media_${Date.now()}`,
    type: 'media',
    x: 80, y: 80,
    properties: {
      name: file.name,
      url,
      mediaType: isVideo ? 'video' : isImage ? 'image' : 'unknown',
      width: 1280, height: 720,
      fps: isVideo ? 30 : null,
    },
    _mediaElement: el,
  };
}
