import React, { useState, useRef } from 'react';
import '../../styles/VideoUploadForm.css';

const VideoUploadForm = ({ onClose, onUploadSuccess }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Details, 3: Publishing
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    thumbnail: null,
    visibility: 'public',
    ageRestricted: false,
    allowComments: true,
    allowLikes: true,
    monetizable: false,
    contentDeclaration: {
      madeForKids: false,
      containsPaidPromotion: false,
      originalContent: true,
      hasMusic: false,
      musicRights: false
    },
    copyrightAcknowledgment: false,
    communityGuidelinesAcknowledgment: false
  });

  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const categories = [
    'Music', 'Gaming', 'Education', 'Entertainment', 'News & Politics',
    'How-to & Style', 'Science & Technology', 'Comedy', 'Film & Animation',
    'Sports', 'Travel & Events', 'Autos & Vehicles', 'Pets & Animals',
    'Nonprofits & Activism', 'People & Blogs'
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('Please select a valid video file (MP4, WebM, OGG, AVI, MOV)');
        return;
      }

      // Check file size (adjust based on user tier)
      const maxSize = 500 * 1024 * 1024; // 500MB default
      if (selectedFile.size > maxSize) {
        alert('File size too large. Please select a smaller file.');
        return;
      }

      setFile(selectedFile);
      setFormData(prev => ({
        ...prev,
        title: selectedFile.name.replace(/\.[^/.]+$/, "") // Remove extension
      }));
      setStep(2);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContentDeclarationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contentDeclaration: {
        ...prev.contentDeclaration,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      alert('Please enter a video title');
      return false;
    }
    if (!formData.category) {
      alert('Please select a category');
      return false;
    }
    if (!formData.copyrightAcknowledgment) {
      alert('Please acknowledge copyright compliance');
      return false;
    }
    if (!formData.communityGuidelinesAcknowledgment) {
      alert('Please acknowledge community guidelines compliance');
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;

    setIsUploading(true);
    setStep(3);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('video', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('visibility', formData.visibility);
      formDataToSend.append('age_restricted', formData.ageRestricted);
      formDataToSend.append('allow_comments', formData.allowComments);
      formDataToSend.append('allow_likes', formData.allowLikes);
      formDataToSend.append('made_for_kids', formData.contentDeclaration.madeForKids);
      formDataToSend.append('contains_paid_promotion', formData.contentDeclaration.containsPaidPromotion);
      formDataToSend.append('original_content', formData.contentDeclaration.originalContent);

      if (formData.thumbnail) {
        formDataToSend.append('thumbnail', formData.thumbnail);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/upload_video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(result);
        if (onClose) onClose();
      }, 1000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
    }
  };

  const renderStep1 = () => (
    <div className="upload-step">
      <h2>📹 Upload Video</h2>
      <div className="file-drop-zone" onClick={() => fileInputRef.current?.click()}>
        <div className="drop-zone-content">
          <div className="upload-icon">📁</div>
          <h3>Select video to upload</h3>
          <p>Or drag and drop video files</p>
          <p className="file-info">
            Supported formats: MP4, WebM, OGG, AVI, MOV<br/>
            Maximum file size: 500MB
          </p>
          <button className="btn-primary">Choose File</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="upload-step">
      <h2>📝 Video Details</h2>
      
      <div className="form-grid">
        <div className="form-section">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter video title"
            maxLength="100"
          />
          <span className="char-count">{formData.title.length}/100</span>
        </div>

        <div className="form-section">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Tell viewers about your video"
            maxLength="5000"
            rows="4"
          />
          <span className="char-count">{formData.description.length}/5000</span>
        </div>

        <div className="form-row">
          <div className="form-section">
            <label>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label>Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => handleInputChange('visibility', e.target.value)}
            >
              <option value="public">🌍 Public</option>
              <option value="unlisted">🔗 Unlisted</option>
              <option value="private">🔒 Private</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <label>Tags (separate with commas)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="gaming, tutorial, music"
          />
        </div>

        <div className="form-section">
          <label>Custom Thumbnail (Optional)</label>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.files[0] }))}
          />
        </div>

        {/* Content Declaration */}
        <div className="form-section content-declaration">
          <h3>📋 Content Declaration</h3>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.contentDeclaration.madeForKids}
                onChange={(e) => handleContentDeclarationChange('madeForKids', e.target.checked)}
              />
              This video is made for kids (under 13)
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.contentDeclaration.containsPaidPromotion}
                onChange={(e) => handleContentDeclarationChange('containsPaidPromotion', e.target.checked)}
              />
              This video contains paid promotion or sponsorship
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.contentDeclaration.originalContent}
                onChange={(e) => handleContentDeclarationChange('originalContent', e.target.checked)}
              />
              This is original content that I own or have rights to
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.ageRestricted}
                onChange={(e) => handleInputChange('ageRestricted', e.target.checked)}
              />
              This video may not be suitable for all audiences
            </label>
          </div>
        </div>

        {/* Compliance Checkboxes */}
        <div className="form-section compliance">
          <h3>⚖️ Legal Compliance</h3>
          <div className="checkbox-group">
            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.copyrightAcknowledgment}
                onChange={(e) => handleInputChange('copyrightAcknowledgment', e.target.checked)}
              />
              I confirm this content doesn't violate copyright laws *
            </label>

            <label className="checkbox-label required">
              <input
                type="checkbox"
                checked={formData.communityGuidelinesAcknowledgment}
                onChange={(e) => handleInputChange('communityGuidelinesAcknowledgment', e.target.checked)}
              />
              I confirm this content follows community guidelines *
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button onClick={() => setStep(1)} className="btn-secondary">
          ← Back
        </button>
        <button onClick={handleUpload} className="btn-primary">
          Upload Video →
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="upload-step">
      <h2>📤 Publishing Video</h2>
      <div className="upload-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p>{uploadProgress}% uploaded</p>
        {uploadProgress === 100 && (
          <p className="success-message">✅ Video uploaded successfully!</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="video-upload-modal">
      <div className="upload-container">
        <div className="upload-header">
          <div className="step-indicator">
            <span className={step >= 1 ? 'active' : ''}>1</span>
            <span className={step >= 2 ? 'active' : ''}>2</span>
            <span className={step >= 3 ? 'active' : ''}>3</span>
          </div>
          <button onClick={onClose} className="close-btn">✖️</button>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default VideoUploadForm;