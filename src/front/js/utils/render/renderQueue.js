// src/front/js/utils/render/renderQueue.js
let _jobCounter = 1;

export function createRenderJob({ format='png', name='Render', width=1920, height=1080, fps=30, colorspace='sRGB' } = {}) {
  return {
    id: `job_${_jobCounter++}_${Date.now()}`,
    name,
    format,
    width,
    height,
    fps,
    colorspace,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
    completedAt: null,
    outputUrl: null,
    error: null,
  };
}

export function updateRenderJob(queue, id, patch) {
  return queue.map(j => j.id === id ? { ...j, ...patch, completedAt: patch.status === 'done' ? Date.now() : j.completedAt } : j);
}

export function removeRenderJob(queue, id) {
  return queue.filter(j => j.id !== id);
}

export function getQueueStats(queue) {
  return {
    total:     queue.length,
    queued:    queue.filter(j => j.status === 'queued').length,
    rendering: queue.filter(j => j.status === 'rendering').length,
    done:      queue.filter(j => j.status === 'done').length,
    failed:    queue.filter(j => j.status === 'failed').length,
  };
}

// Export canvas to blob for a given format
export async function exportCanvasToBlob(canvas, format = 'png', quality = 0.95) {
  return new Promise((resolve, reject) => {
    const mime = format === 'webp' ? 'image/webp' : format === 'jpg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), mime, quality);
  });
}

// Download canvas frame
export async function downloadFrame(canvas, filename = 'spx-frame', format = 'png') {
  const blob = await exportCanvasToBlob(canvas, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.${format}`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default { createRenderJob, updateRenderJob, removeRenderJob, getQueueStats, exportCanvasToBlob, downloadFrame };
