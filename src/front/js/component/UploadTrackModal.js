import React, { useState, useRef } from "react";

const UploadTrackModal = ({ onClose, onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    tags: "",
    isPublic: true
  });
  const [audioFile, setAudioFile] = useState(null);
  const [artworkFile, setArtworkFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [artworkPreview, setArtworkPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const audioInputRef = useRef(null);
  const artworkInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const handleArtworkChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArtworkFile(file);
      setArtworkPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!audioFile || !formData.title.trim()) {
      alert("Please provide at least a title and audio file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Here you would implement your actual upload logic
      // For now, we'll simulate a successful upload
      setTimeout(() => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        const newTrack = {
          id: Date.now(),
          title: formData.title,
          description: formData.description,
          genre: formData.genre,
          artwork: artworkPreview,
          plays: 0,
          duration: "3:42", // You'd get this from the audio file
          upload_date: new Date().toISOString()
        };
        
        onUploadSuccess(newTrack);
        setTimeout(() => {
          onClose();
        }, 1000);
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎵 Upload New Track</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Audio Upload Section */}
          <div className="upload-section">
            <h3>🎧 Audio File</h3>
            <div 
              className={`upload-dropzone ${audioFile ? 'has-file' : ''}`}
              onClick={() => audioInputRef.current.click()}
            >
              {audioFile ? (
                <div className="file-preview">
                  <div className="file-icon">🎵</div>
                  <div className="file-info">
                    <strong>{audioFile.name}</strong>
                    <p>{formatFileSize(audioFile.size)}</p>
                    {audioPreview && (
                      <audio controls className="audio-preview">
                        <source src={audioPreview} type={audioFile.type} />
                      </audio>
                    )}
                  </div>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">🎧</div>
                  <p><strong>Click to upload audio</strong></p>
                  <p>MP3, WAV, FLAC • Max 100MB</p>
                </div>
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Track Details */}
          <div className="form-section">
            <h3>📝 Track Details</h3>
            <div className="form-row">
              <input
                type="text"
                name="title"
                placeholder="Track Title *"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-row">
              <input
                type="text"
                name="genre"
                placeholder="Genre (e.g., Hip Hop, Rock, Electronic)"
                value={formData.genre}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>

            <div className="form-row">
              <textarea
                name="description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-row">
              <input
                type="text"
                name="tags"
                placeholder="Tags (separated by commas)"
                value={formData.tags}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          {/* Artwork Upload */}
          <div className="upload-section">
            <h3>🎨 Artwork (Optional)</h3>
            <div 
              className={`artwork-upload ${artworkFile ? 'has-artwork' : ''}`}
              onClick={() => artworkInputRef.current.click()}
            >
              {artworkPreview ? (
                <img src={artworkPreview} alt="Artwork preview" className="artwork-preview" />
              ) : (
                <div className="artwork-placeholder">
                  <div className="artwork-icon">🎨</div>
                  <p>Click to add artwork</p>
                </div>
              )}
            </div>
            <input
              ref={artworkInputRef}
              type="file"
              accept="image/*"
              onChange={handleArtworkChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Privacy Settings */}
          <div className="form-section">
            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                />
                <span className="checkmark"></span>
                Make this track public
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p>{uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Upload Complete! ✅"}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={uploading || !audioFile || !formData.title.trim()}
            >
              {uploading ? "Uploading..." : "🚀 Upload Track"}
            </button>
          </div>
        </form>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-container {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.3s ease-out;
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 24px 0 24px;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 24px;
          }

          .modal-header h2 {
            margin: 0;
            color: #1f2937;
            font-size: 1.5rem;
            font-weight: 600;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .upload-form {
            padding: 0 24px 24px 24px;
          }

          .upload-section, .form-section {
            margin-bottom: 24px;
          }

          .upload-section h3, .form-section h3 {
            margin: 0 0 12px 0;
            color: #374151;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .upload-dropzone {
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            background: #f9fafb;
          }

          .upload-dropzone:hover {
            border-color: #6366f1;
            background: #f8faff;
          }

          .upload-dropzone.has-file {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .upload-prompt {
            padding: 20px;
          }

          .upload-icon {
            font-size: 3rem;
            margin-bottom: 12px;
          }

          .upload-prompt p {
            margin: 4px 0;
            color: #6b7280;
          }

          .upload-prompt strong {
            color: #374151;
          }

          .file-preview {
            display: flex;
            align-items: center;
            gap: 16px;
            text-align: left;
          }

          .file-icon {
            font-size: 2.5rem;
            color: #10b981;
          }

          .file-info strong {
            display: block;
            color: #374151;
            margin-bottom: 4px;
          }

          .file-info p {
            margin: 0;
            color: #6b7280;
            font-size: 0.9rem;
          }

          .audio-preview {
            width: 300px;
            margin-top: 8px;
          }

          .artwork-upload {
            width: 120px;
            height: 120px;
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            cursor: pointer;
            overflow: hidden;
            transition: all 0.3s ease;
            background: #f9fafb;
          }

          .artwork-upload:hover {
            border-color: #6366f1;
          }

          .artwork-upload.has-artwork {
            border-color: #10b981;
          }

          .artwork-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #6b7280;
          }

          .artwork-icon {
            font-size: 2rem;
            margin-bottom: 8px;
          }

          .artwork-placeholder p {
            margin: 0;
            font-size: 0.8rem;
            text-align: center;
          }

          .artwork-preview {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .form-row {
            margin-bottom: 16px;
          }

          .form-input, .form-textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
          }

          .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }

          .checkbox-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .checkbox-row label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: #374151;
            font-size: 0.95rem;
          }

          .upload-progress {
            margin: 20px 0;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #8b5cf6);
            transition: width 0.3s ease;
          }

          .upload-progress p {
            margin: 8px 0 0 0;
            text-align: center;
            color: #6b7280;
          }

          .modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
          }

          .btn-secondary, .btn-primary {
            flex: 1;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #e5e7eb;
          }

          .btn-primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }

          .btn-primary:disabled, .btn-secondary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
        `}</style>
      </div>
    </div>
  );
};

export default UploadTrackModal;