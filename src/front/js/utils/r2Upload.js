// =============================================================================
// r2Upload.js — Shared R2 Upload Utility
// =============================================================================
// Location: src/front/js/utils/r2Upload.js
//
// Import anywhere:
//   import { uploadToR2, uploadToR2Large } from '../utils/r2Upload';
//
// Replaces ALL direct Cloudinary browser uploads throughout the app.
// Routes every upload through the backend → Cloudflare R2.
// =============================================================================

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token') || '';

// =============================================================================
// uploadToR2
// Standard upload — streams file bytes through Flask → R2.
// Good for files up to ~100 MB.
//
// @param {File} file          — The File object from <input type="file">
// @param {string} folder      — R2 folder, e.g. "stories", "academy", "profiles"
// @param {object} opts
//   onProgress(pct)           — optional progress callback (0-100)
// @returns {Promise<{url, key, size, content_type}>}
// =============================================================================
export async function uploadToR2(file, folder = 'uploads', opts = {}) {
  const { onProgress } = opts;

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Invalid JSON response from upload endpoint'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.error) msg = err.error;
        } catch {}
        reject(new Error(msg));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${BACKEND_URL}/api/upload/r2`);
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
    xhr.send(formData);
  });
}

// =============================================================================
// uploadToR2Large
// Presigned URL flow — for large files (100 MB+).
// Browser uploads directly to R2 (no Railway RAM hit).
// Backend only generates the presigned URL, doesn't touch the bytes.
//
// @param {File} file
// @param {string} folder
// @param {object} opts
//   onProgress(pct)
// @returns {Promise<{url, key}>}  url = R2 public URL
// =============================================================================
export async function uploadToR2Large(file, folder = 'uploads', opts = {}) {
  const { onProgress } = opts;

  // Step 1: Get presigned URL from backend
  const presignRes = await fetch(`${BACKEND_URL}/api/upload/r2/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      folder,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get presigned URL');
  }

  const { upload_url, key, public_url } = await presignRes.json();

  // Step 2: PUT directly to R2 via presigned URL
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 direct upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during R2 upload')));

    xhr.open('PUT', upload_url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });

  return { url: public_url, key };
}

// =============================================================================
// uploadStoryToR2
// Drop-in replacement for the direct Cloudinary upload in StoryUpload.js
// =============================================================================
export async function uploadStoryToR2(file, onProgress) {
  return uploadToR2(file, 'stories', { onProgress });
}

// =============================================================================
// uploadAcademyVideoToR2
// Large file flow for course lesson videos
// =============================================================================
export async function uploadAcademyVideoToR2(file, onProgress) {
  // Videos > 50 MB go through presigned URL to avoid RAM pressure on Railway
  if (file.size > 50 * 1024 * 1024) {
    return uploadToR2Large(file, 'academy/videos', { onProgress });
  }
  return uploadToR2(file, 'academy/videos', { onProgress });
}

// =============================================================================
// uploadProfileMediaToR2
// Profile picture / cover image
// =============================================================================
export async function uploadProfileMediaToR2(file, onProgress) {
  return uploadToR2(file, 'profiles', { onProgress });
}

// =============================================================================
// uploadPodcastMediaToR2
// Async guest recordings, episode audio
// =============================================================================
export async function uploadPodcastMediaToR2(file, onProgress) {
  if (file.size > 50 * 1024 * 1024) {
    return uploadToR2Large(file, 'podcast', { onProgress });
  }
  return uploadToR2(file, 'podcast', { onProgress });
}