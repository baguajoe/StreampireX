// =============================================================================
// UploadReel.js — Direct Upload Page for Reels (3-minute cap)
// =============================================================================
// Location: src/front/js/pages/UploadReel.js
// Upload flow: Frontend → Backend /api/upload/media → Cloudflare R2
// =============================================================================

import React, { useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import { checkVideoDuration, MAX_REEL_DURATION, formatDuration } from '../utils/videoDurationCheck';
import '../../styles/ReelsFeed.css';

const UploadReel = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  // Handle file selection with duration check
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);

    if (!selectedFile.type.startsWith('video/')) {
      setError('Reels must be video files');
      return;
    }

    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('Video must be less than 500MB');
      return;
    }

    const result = await checkVideoDuration(selectedFile, MAX_REEL_DURATION);
    setVideoDuration(result.duration);
    if (!result.valid) {
      setError(result.message);
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
      }
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  };

  // Tags
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Remove file
  const removeFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setVideoDuration(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload reel — sends file to backend → R2, then creates reel record
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Please log in to upload');
        setUploading(false);
        return;
      }

      // ─── Step 1: Upload file to backend → R2 ───
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 80);
            setUploadProgress(progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new Error('Upload timed out'));
      });

      xhr.open('POST', `${backendUrl}/api/upload/media`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 5 * 60 * 1000; // 5 min timeout for large files
      xhr.send(formData);

      const uploadData = await uploadPromise;
      setUploadProgress(85);

      if (!uploadData.url) {
        throw new Error('No URL returned from upload');
      }

      // ─── Step 2: Create reel record in database ───
      const reelResponse = await fetch(`${backendUrl}/api/reels/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_url: uploadData.url,
          thumbnail_url: null,
          title: title.trim(),
          description: description.trim(),
          duration: Math.min(Math.ceil(videoDuration || 0), MAX_REEL_DURATION),
          tags: tags,
          is_public: isPublic
        })
      });

      if (!reelResponse.ok) {
        const errorData = await reelResponse.json();
        throw new Error(errorData.error || 'Failed to create reel');
      }

      setUploadProgress(100);

      setTimeout(() => {
        navigate('/reels');
      }, 800);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-reel-page">
      <div className="upload-reel-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h2>Upload Reel</h2>
        <div className="header-spacer" />
      </div>

      <div className="upload-reel-content">
        {!preview ? (
          <div
            className="reel-upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="video/*"
              hidden
            />
            <div className="upload-icon-large">🎬</div>
            <h3>Upload a Reel</h3>
            <p>Drag and drop or click to select</p>
            <p className="upload-limits">Video up to 3 minutes • Max 500MB</p>
            <p className="upload-formats">MP4, MOV, WebM</p>
          </div>
        ) : (
          <div className="reel-preview-area">
            <div className="reel-preview-wrapper">
              <video
                ref={videoPreviewRef}
                src={preview}
                className="reel-preview-video"
                controls
                loop
                playsInline
              />
              <button className="remove-preview-btn" onClick={removeFile} disabled={uploading}>
                ✕
              </button>
            </div>

            {videoDuration && (
              <div className={`duration-badge ${videoDuration > MAX_REEL_DURATION ? 'over-limit' : 'within-limit'}`}>
                ⏱️ {formatDuration(videoDuration)} / {formatDuration(MAX_REEL_DURATION)} max
              </div>
            )}
          </div>
        )}

        {preview && (
          <div className="reel-form">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your reel a title..."
                maxLength={100}
                disabled={uploading}
              />
              <span className="char-count">{title.length}/100</span>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this reel about?"
                maxLength={500}
                rows={3}
                disabled={uploading}
              />
              <span className="char-count">{description.length}/500</span>
            </div>

            <div className="form-group">
              <label>Tags (up to 10)</label>
              <div className="tags-input-wrapper">
                <div className="tags-list">
                  {tags.map((tag, i) => (
                    <span key={i} className="tag-chip">
                      #{tag}
                      <button onClick={() => removeTag(tag)} disabled={uploading}>✕</button>
                    </span>
                  ))}
                </div>
                {tags.length < 10 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag..."
                    disabled={uploading}
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={uploading}
                />
                <span>Public — appears in discovery feeds</span>
              </label>
            </div>

            {error && (
              <div className="reel-upload-error">⚠️ {error}</div>
            )}

            {uploading && (
              <div className="reel-upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span>{uploadProgress}% — {uploadProgress < 80 ? 'Uploading to server...' : 'Saving reel...'}</span>
              </div>
            )}

            <div className="reel-form-actions">
              <button
                className="secondary-btn"
                onClick={removeFile}
                disabled={uploading}
              >
                Change Video
              </button>
              <button
                className="primary-btn"
                onClick={handleUpload}
                disabled={uploading || !file || !title.trim()}
              >
                {uploading ? 'Posting...' : 'Post Reel'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadReel;