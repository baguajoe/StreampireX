import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/VideoUpload.css';

const VideoUpload = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Channel state
  const [channelData, setChannelData] = useState(null);
  const [hasChannel, setHasChannel] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Upload state
  const [uploadState, setUploadState] = useState('select'); // select, uploading, processing, complete
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState('');

  // Video details state
  const [videoDetails, setVideoDetails] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    visibility: 'public',
    ageRestricted: false,
    madeForKids: false,
    containsPaidPromotion: false,
    originalContent: true,
    allowComments: true,
    allowLikes: true,
    enableNotifications: true,
    publishLater: false,
    publishDate: '',
    publishTime: ''
  });

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    language: 'en',
    captions: false,
    location: '',
    license: 'standard',
    monetization: false,
    downloadable: false
  });

  // Error and success state
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // File validation
  const [fileValidation, setFileValidation] = useState({
    isValid: true,
    errors: []
  });

  const categories = [
    'Gaming', 'Music', 'Education', 'Entertainment', 'Technology',
    'Science', 'Sports', 'News', 'Comedy', 'Lifestyle', 'Travel',
    'Food', 'Health', 'Business', 'Arts', 'DIY', 'Automotive', 'Other'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  useEffect(() => {
    checkChannelStatus();
  }, []);

  const checkChannelStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data);
        setHasChannel(true);
      } else if (response.status === 404) {
        setHasChannel(false);
      }
    } catch (error) {
      console.error('Error checking channel status:', error);
    }
  };

  const createChannel = async () => {
    setCreatingChannel(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_name: `${store.user?.username || 'My'} Channel`,
          description: 'Welcome to my video channel!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data.channel);
        setHasChannel(true);
        setSuccessMessage('Channel created successfully!');
      } else {
        throw new Error('Failed to create channel');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError('Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  const validateFile = (file) => {
    const errors = [];
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];

    if (!allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload MP4, AVI, MOV, WMV, or WebM files.');
    }

    if (file.size > maxSize) {
      errors.push('File size too large. Maximum size is 2GB.');
    }

    if (file.size < 1024) {
      errors.push('File size too small. Minimum size is 1KB.');
    }

    const validation = {
      isValid: errors.length === 0,
      errors
    };

    setFileValidation(validation);
    return validation.isValid;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (validateFile(file)) {
      setSelectedFile(file);
      setError('');
      
      // Auto-generate title from filename
      if (!videoDetails.title) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setVideoDetails(prev => ({
          ...prev,
          title: titleFromFile
        }));
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleThumbnailSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid thumbnail type. Please upload JPG or PNG files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('Thumbnail file too large. Maximum size is 10MB.');
      return;
    }

    setThumbnailFile(file);
    setError('');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setError('');
      }
    }
  };

  const uploadFile = async (file, type = 'video') => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload/cloudinary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`);
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoDetails.title.trim()) {
      setError('Please select a file and enter a title');
      return;
    }

    if (!hasChannel) {
      setError('You need a channel to upload videos');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);
    setError('');

    try {
      // Upload video file
      setUploadProgress(20);
      const videoUrl = await uploadFile(selectedFile, 'video');
      setUploadedVideoUrl(videoUrl);

      // Upload thumbnail if provided
      let thumbnailUrl = '';
      if (thumbnailFile) {
        setUploadProgress(40);
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnail');
        setUploadedThumbnailUrl(thumbnailUrl);
      }

      // Process tags
      const tagList = videoDetails.tags
        ? videoDetails.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      // Prepare video data
      const videoData = {
        title: videoDetails.title,
        description: videoDetails.description,
        file_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        category: videoDetails.category,
        tags: tagList,
        visibility: videoDetails.visibility,
        is_public: videoDetails.visibility === 'public',
        age_restricted: videoDetails.ageRestricted,
        made_for_kids: videoDetails.madeForKids,
        contains_paid_promotion: videoDetails.containsPaidPromotion,
        original_content: videoDetails.originalContent,
        allow_comments: videoDetails.allowComments,
        allow_likes: videoDetails.allowLikes,
        language: advancedSettings.language,
        location: advancedSettings.location,
        license: advancedSettings.license,
        enable_monetization: advancedSettings.monetization,
        downloadable: advancedSettings.downloadable,
        // Scheduling
        publish_later: videoDetails.publishLater,
        scheduled_publish_date: videoDetails.publishLater ? 
          `${videoDetails.publishDate}T${videoDetails.publishTime}:00Z` : null
      };

      setUploadProgress(60);

      // Submit video data
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoData)
      });

      setUploadProgress(80);

      if (response.ok) {
        const result = await response.json();
        setUploadProgress(100);
        setUploadState('complete');
        setSuccessMessage('Video uploaded successfully!');
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/video-dashboard');
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload video');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload video');
      setUploadState('select');
      setUploadProgress(0);
    }
  };

  const handleInputChange = (field, value) => {
    setVideoDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdvancedChange = (field, value) => {
    setAdvancedSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setThumbnailFile(null);
    setUploadState('select');
    setUploadProgress(0);
    setError('');
    setSuccessMessage('');
    setVideoDetails({
      title: '',
      description: '',
      category: '',
      tags: '',
      visibility: 'public',
      ageRestricted: false,
      madeForKids: false,
      containsPaidPromotion: false,
      originalContent: true,
      allowComments: true,
      allowLikes: true,
      enableNotifications: true,
      publishLater: false,
      publishDate: '',
      publishTime: ''
    });
  };

  // If no channel exists
  if (!hasChannel && !creatingChannel) {
    return (
      <div className="upload-container">
        <div className="no-channel-section">
          <div className="no-channel-content">
            <h1>📹 Create Your Channel First</h1>
            <p>You need a video channel before you can upload videos.</p>
            <button 
              onClick={createChannel}
              className="create-channel-btn"
              disabled={creatingChannel}
            >
              {creatingChannel ? 'Creating...' : '🚀 Create My Channel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-container">
      {/* Header */}
      <div className="upload-header">
        <h1>📤 Upload Video</h1>
        <div className="upload-steps">
          <div className={`step ${uploadState === 'select' ? 'active' : uploadState !== 'select' ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Select File</span>
          </div>
          <div className={`step ${uploadState === 'uploading' ? 'active' : uploadState === 'complete' ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Upload</span>
          </div>
          <div className={`step ${uploadState === 'complete' ? 'active completed' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Complete</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="success-message">
          ✅ {successMessage}
        </div>
      )}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      {!fileValidation.isValid && (
        <div className="validation-errors">
          {fileValidation.errors.map((error, index) => (
            <div key={index} className="validation-error">⚠️ {error}</div>
          ))}
        </div>
      )}

      <div className="upload-content">
        {/* File Selection */}
        {uploadState === 'select' && (
          <div className="upload-section">
            <div className="file-upload-area">
              {!selectedFile ? (
                <div 
                  className="drop-zone"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="drop-zone-content">
                    <span className="upload-icon">📹</span>
                    <h3>Select or drag a video file</h3>
                    <p>Your videos will be private until you publish them.</p>
                    <button className="select-file-btn">Select File</button>
                    <div className="file-requirements">
                      <h4>File Requirements:</h4>
                      <ul>
                        <li>Format: MP4, AVI, MOV, WMV, WebM</li>
                        <li>Max size: 2GB</li>
                        <li>Min duration: 1 second</li>
                        <li>Max duration: 12 hours</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="selected-file">
                  <div className="file-info">
                    <span className="file-icon">🎬</span>
                    <div className="file-details">
                      <h3>{selectedFile.name}</h3>
                      <p>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <p>Type: {selectedFile.type}</p>
                    </div>
                    <button 
                      className="remove-file-btn"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✖
                    </button>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Video Details Form */}
            {selectedFile && (
              <div className="video-details-form">
                <h2>📝 Video Details</h2>
                
                <div className="form-grid">
                  {/* Basic Information */}
                  <div className="form-section">
                    <h3>Basic Information</h3>
                    
                    <div className="form-group">
                      <label>Title *</label>
                      <input
                        type="text"
                        value={videoDetails.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter video title"
                        maxLength="100"
                        required
                      />
                      <small>{videoDetails.title.length}/100 characters</small>
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={videoDetails.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Tell viewers about your video..."
                        maxLength="5000"
                        rows="4"
                      />
                      <small>{videoDetails.description.length}/5000 characters</small>
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={videoDetails.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Tags</label>
                      <input
                        type="text"
                        value={videoDetails.tags}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        placeholder="Enter tags separated by commas"
                      />
                      <small>Use relevant tags to help people discover your video</small>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="form-section">
                    <h3>Thumbnail</h3>
                    <div className="thumbnail-upload">
                      {!thumbnailFile ? (
                        <div 
                          className="thumbnail-placeholder"
                          onClick={() => thumbnailInputRef.current?.click()}
                        >
                          <span className="thumbnail-icon">🖼️</span>
                          <p>Upload Thumbnail</p>
                          <small>Recommended: 1280x720px</small>
                        </div>
                      ) : (
                        <div className="thumbnail-preview">
                          <img 
                            src={URL.createObjectURL(thumbnailFile)} 
                            alt="Thumbnail preview"
                            className="preview-image"
                          />
                          <button 
                            className="change-thumbnail-btn"
                            onClick={() => setThumbnailFile(null)}
                          >
                            Change
                          </button>
                        </div>
                      )}
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Visibility Settings */}
                <div className="form-section">
                  <h3>🔒 Visibility & Privacy</h3>
                  <div className="visibility-options">
                    <label className="visibility-option">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={videoDetails.visibility === 'public'}
                        onChange={(e) => handleInputChange('visibility', e.target.value)}
                      />
                      <div className="option-content">
                        <span className="option-icon">🌍</span>
                        <div className="option-details">
                          <strong>Public</strong>
                          <p>Anyone can search for and view</p>
                        </div>
                      </div>
                    </label>

                    <label className="visibility-option">
                      <input
                        type="radio"
                        name="visibility"
                        value="unlisted"
                        checked={videoDetails.visibility === 'unlisted'}
                        onChange={(e) => handleInputChange('visibility', e.target.value)}
                      />
                      <div className="option-content">
                        <span className="option-icon">🔗</span>
                        <div className="option-details">
                          <strong>Unlisted</strong>
                          <p>Anyone with the link can view</p>
                        </div>
                      </div>
                    </label>

                    <label className="visibility-option">
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={videoDetails.visibility === 'private'}
                        onChange={(e) => handleInputChange('visibility', e.target.value)}
                      />
                      <div className="option-content">
                        <span className="option-icon">🔒</span>
                        <div className="option-details">
                          <strong>Private</strong>
                          <p>Only you can view</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Content Declarations */}
                <div className="form-section">
                  <h3>📋 Content Declarations</h3>
                  <div className="declaration-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.ageRestricted}
                        onChange={(e) => handleInputChange('ageRestricted', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="option-details">
                        <strong>Age-restricted (18+)</strong>
                        <p>Contains mature content suitable for adults only</p>
                      </div>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.madeForKids}
                        onChange={(e) => handleInputChange('madeForKids', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="option-details">
                        <strong>Made for kids</strong>
                        <p>Content designed for children under 13</p>
                      </div>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.containsPaidPromotion}
                        onChange={(e) => handleInputChange('containsPaidPromotion', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="option-details">
                        <strong>Contains paid promotion</strong>
                        <p>Includes sponsored content or product placement</p>
                      </div>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.originalContent}
                        onChange={(e) => handleInputChange('originalContent', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <div className="option-details">
                        <strong>Original content</strong>
                        <p>This is my original creation</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Interaction Settings */}
                <div className="form-section">
                  <h3>💬 Interaction Settings</h3>
                  <div className="interaction-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.allowComments}
                        onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>Allow comments</span>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.allowLikes}
                        onChange={(e) => handleInputChange('allowLikes', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>Allow likes and dislikes</span>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.enableNotifications}
                        onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>Notify subscribers</span>
                    </label>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="form-section">
                  <h3>⏰ Publishing</h3>
                  <div className="scheduling-options">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={videoDetails.publishLater}
                        onChange={(e) => handleInputChange('publishLater', e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>Schedule for later</span>
                    </label>

                    {videoDetails.publishLater && (
                      <div className="schedule-inputs">
                        <div className="form-group">
                          <label>Publish Date</label>
                          <input
                            type="date"
                            value={videoDetails.publishDate}
                            onChange={(e) => handleInputChange('publishDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="form-group">
                          <label>Publish Time</label>
                          <input
                            type="time"
                            value={videoDetails.publishTime}
                            onChange={(e) => handleInputChange('publishTime', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced Settings */}
                <details className="advanced-settings">
                  <summary>⚙️ Advanced Settings</summary>
                  <div className="advanced-content">
                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={advancedSettings.language}
                        onChange={(e) => handleAdvancedChange('language', e.target.value)}
                      >
                        {languages.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={advancedSettings.location}
                        onChange={(e) => handleAdvancedChange('location', e.target.value)}
                        placeholder="Where was this video recorded?"
                      />
                    </div>

                    <div className="form-group">
                      <label>License</label>
                      <select
                        value={advancedSettings.license}
                        onChange={(e) => handleAdvancedChange('license', e.target.value)}
                      >
                        <option value="standard">Standard License</option>
                        <option value="creative_commons">Creative Commons</option>
                      </select>
                    </div>

                    <div className="advanced-checkboxes">
                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={advancedSettings.monetization}
                          onChange={(e) => handleAdvancedChange('monetization', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span>Enable monetization</span>
                      </label>

                      <label className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={advancedSettings.downloadable}
                          onChange={(e) => handleAdvancedChange('downloadable', e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span>Allow downloads</span>
                      </label>
                    </div>
                  </div>
                </details>

                {/* Upload Actions */}
                <div className="upload-actions">
                  <button 
                    className="upload-btn primary"
                    onClick={handleUpload}
                    disabled={!videoDetails.title.trim()}
                  >
                    📤 {videoDetails.publishLater ? 'Schedule Video' : 'Upload Video'}
                  </button>
                  <button 
                    className="upload-btn secondary"
                    onClick={resetUpload}
                  >
                    🔄 Start Over
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {uploadState === 'uploading' && (
          <div className="upload-progress-section">
            <div className="progress-content">
              <h2>📤 Uploading Video...</h2>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {uploadProgress}% complete
              </div>
              <div className="progress-steps">
                {uploadProgress < 30 && <p>Uploading video file...</p>}
                {uploadProgress >= 30 && uploadProgress < 50 && <p>Uploading thumbnail...</p>}
                {uploadProgress >= 50 && uploadProgress < 80 && <p>Processing video...</p>}
                {uploadProgress >= 80 && <p>Finalizing upload...</p>}
              </div>
            </div>
          </div>
        )}

        {/* Upload Complete */}
        {uploadState === 'complete' && (
          <div className="upload-complete-section">
            <div className="complete-content">
              <span className="success-icon">✅</span>
              <h2>Upload Complete!</h2>
              <p>Your video has been uploaded successfully.</p>
              <div className="complete-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => navigate('/video-dashboard')}
                >
                  📊 Go to Dashboard
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => navigate('/my-channel')}
                >
                  📹 View Channel
                </button>
                <button 
                  className="action-btn tertiary"
                  onClick={resetUpload}
                >
                  📤 Upload Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;