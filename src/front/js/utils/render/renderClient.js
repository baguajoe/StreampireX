// src/front/js/utils/render/renderClient.js
// SPX Render Client — sends render jobs to backend or handles in browser

const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://streampirex-api.up.railway.app';

export async function requestRender({ jobId, format, width, height, fps, frames, colorspace, canvasDataUrl } = {}) {
  // Browser-capable formats render locally
  const browserFormats = ['png', 'webp', 'webm'];
  if (browserFormats.includes(format)) {
    return { jobId, status: 'browser', message: 'Rendering in browser' };
  }

  // Pro formats go to backend
  try {
    const res = await fetch(`${BACKEND}/api/render/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ jobId, format, width, height, fps, frames, colorspace }),
    });
    if (!res.ok) throw new Error(`Backend render failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[renderClient] Backend unavailable, falling back to browser:', err);
    return { jobId, status: 'browser_fallback', message: err.message };
  }
}

export async function getRenderStatus(jobId) {
  try {
    const res = await fetch(`${BACKEND}/api/render/status/${jobId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return await res.json();
  } catch {
    return { jobId, status: 'unknown' };
  }
}

export default { requestRender, getRenderStatus };
