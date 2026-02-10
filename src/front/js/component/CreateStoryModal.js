// =============================================================================
// CreateStoryModal.js - Modal for creating new stories
// =============================================================================
// Location: /src/front/js/component/CreateStoryModal.js
// Features: Upload image/video, caption, settings, share to story
// =============================================================================

import React, { useState, useRef } from 'react';
import '../../styles/CreateStoryModal.css';

const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [caption, setCaption] = useState('');
  const [allowReshare, setAllowReshare] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  // File size limits
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setError(null);

    // Validate file type
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    // Validate file size
    if (isImage && selectedFile.size > MAX_IMAGE_SIZE) {
      setError('Image must be less than 10MB');
      return;
    }

    if (isVideo && selectedFile.size > MAX_VIDEO_SIZE) {
      setError('Video must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setMediaType(isVideo ? 'video' : 'image');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Simulate file input change
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to create a story');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', mediaType);
      formData.append('caption', caption);
      formData.append('allow_reshare', allowReshare);
      formData.append('allow_comments', allowComments);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          if (onStoryCreated) {
            onStoryCreated(response.story || response);
          }
          handleClose();
        } else {
          const errorData = JSON.parse(xhr.responseText);
          setError(errorData.error || 'Failed to create story');
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setError('Network error. Please try again.');
        setUploading(false);
      };

      xhr.open('POST', `${backendUrl}/api/stories`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (err) {
      console.error('Error creating story:', err);
      setError('Failed to create story. Please try again.');
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setCaption('');
    setAllowReshare(true);
    setAllowComments(true);
    setUploading(false);
    setUploadProgress(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-story-overlay" onClick={handleClose}>
      <div className="create-story-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Create Story</h2>
          <button className="close-btn" onClick={handleClose} disabled={uploading}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Upload Area / Preview */}
          {!preview ? (
            <div 
              className="upload-area"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                hidden
              />
              <div className="upload-icon">📸</div>
              <h3>Add to Your Story</h3>
              <p>Drag and drop or click to upload</p>
              <p className="file-types">Images (max 10MB) or Videos (max 50MB)</p>
            </div>
          ) : (
            <div className="preview-area">
              <button className="remove-file-btn" onClick={removeFile} disabled={uploading}>
                ✕
              </button>
              {mediaType === 'video' ? (
                <video src={preview} className="preview-media" controls />
              ) : (
                <img src={preview} alt="Preview" className="preview-media" />
              )}
            </div>
          )}

          {/* Caption */}
          <div className="caption-section">
            <label htmlFor="story-caption">Caption (optional)</label>
            <textarea
              id="story-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 200))}
              placeholder="Write a caption..."
              maxLength={200}
              disabled={uploading}
            />
            <span className="char-count">{caption.length}/200</span>
          </div>

          {/* Settings */}
          <div className="settings-section">
            <label className="setting-item">
              <input
                type="checkbox"
                checked={allowReshare}
                onChange={(e) => setAllowReshare(e.target.checked)}
                disabled={uploading}
              />
              <span className="setting-label">
                <span className="setting-icon">🔄</span>
                Allow others to share to their story
              </span>
            </label>

            <label className="setting-item">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                disabled={uploading}
              />
              <span className="setting-label">
                <span className="setting-icon">💬</span>
                Allow replies
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">
                {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button 
            className="cancel-btn" 
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            className="share-btn"
            onClick={handleSubmit}
            disabled={!file || uploading}
          >
            {uploading ? 'Sharing...' : 'Share to Story'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStoryModal;