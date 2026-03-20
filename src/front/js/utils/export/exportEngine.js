// src/front/js/utils/export/exportEngine.js
// SPX Motion Export Engine — frame, video, project, GIF

export function exportFrame(canvas, name = 'spx-frame', format = 'png') {
  if (!canvas) return;
  const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}.${format}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }, mime, 0.95);
}

export function exportProject(data, name = 'spx-project') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  _download(blob, `${name}.spx`);
}

export function importProject(onLoaded) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.spx,.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      onLoaded?.(data);
    } catch(err) { console.error('Import failed:', err); }
  };
  input.click();
}

// Export canvas animation as WebM video
export async function exportVideo(canvas, timeline, renderFn, { fps=30, quality=0.9 } = {}) {
  if (!canvas || !window.MediaRecorder) {
    alert('MediaRecorder not supported in this browser. Try Chrome.');
    return;
  }

  const chunks = [];
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
    videoBitsPerSecond: Math.round(quality * 8_000_000),
  });

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    _download(blob, 'spx-motion-export.webm');
  };

  recorder.start();
  const totalFrames = Math.ceil(timeline.duration * fps);
  const frameTime   = 1000 / fps;

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    renderFn(t);
    await new Promise(r => setTimeout(r, frameTime));
  }

  recorder.stop();
}

// Export as image sequence (ZIP via JSZip if available)
export async function exportImageSequence(canvas, timeline, renderFn, { fps=24, format='png' } = {}) {
  const totalFrames = Math.ceil(timeline.duration * fps);

  if (window.JSZip) {
    const zip = new window.JSZip();
    for (let f = 0; f < totalFrames; f++) {
      renderFn(f / fps);
      const blob = await new Promise(r => canvas.toBlob(r, `image/${format}`));
      zip.file(`frame_${String(f).padStart(4,'0')}.${format}`, blob);
    }
    const zipBlob = await zip.generateAsync({ type:'blob' });
    _download(zipBlob, 'spx-motion-sequence.zip');
  } else {
    // Fallback: download first frame only
    exportFrame(canvas, 'spx-motion-frame', format);
    console.warn('JSZip not available — downloaded first frame only');
  }
}

export function exportAsSVG(layers, width=1920, height=1080, name='spx-motion') {
  const rects = layers
    .filter(l => l.type === 'shape')
    .map(l => `<rect x="${l.x??0}" y="${l.y??0}" width="${l.width??100}" height="${l.height??100}" fill="${l.color||'#00ffc8'}" opacity="${l.opacity??1}" />`)
    .join('\n  ');
  const texts = layers
    .filter(l => l.type === 'text')
    .map(l => `<text x="${l.x??0}" y="${(l.y??0)+(l.fontSize??42)}" font-size="${l.fontSize??42}" fill="${l.color||'#fff'}" font-weight="${l.fontWeight||700}" font-family="${l.fontFamily||'Arial'}">${l.text||''}</text>`)
    .join('\n  ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  ${rects}\n  ${texts}\n</svg>`;
  _download(new Blob([svg], { type:'image/svg+xml' }), `${name}.svg`);
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default { exportFrame, exportProject, importProject, exportVideo, exportImageSequence, exportAsSVG };
