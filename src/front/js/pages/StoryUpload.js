// src/front/js/pages/StoryUpload.js
// Create a new story - with comment mode choice
import React, { useState, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import { checkVideoDuration, MAX_STORY_DURATION, formatDuration } from '../utils/videoDurationCheck';
import "../../styles/Stories.css";

const StoryUpload = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [caption, setCaption] = useState("");
  const [commentMode, setCommentMode] = useState('both'); // NEW: Comment mode choice
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  
  // Camera mode
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Comment mode options
  const commentModeOptions = [
    { value: 'both', label: '💬 Both', desc: 'Private replies + public comments' },
    { value: 'public', label: '🌍 Public only', desc: 'Everyone sees comments' },
    { value: 'private', label: '🔒 Private only', desc: 'Only you see replies' },
    { value: 'disabled', label: '🚫 Disabled', desc: 'No comments allowed' }
  ];

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    
    if (!isVideo && !isImage) {
      setError("Please select an image or video file");
      return;
    }
    
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Maximum ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    // Check video duration cap
    if (isVideo) {
      const result = await checkVideoDuration(file, MAX_STORY_DURATION);
      setVideoDuration(result.duration);
      if (!result.valid) {
        setError(result.message);
        return;
      }
    } else {
      setVideoDuration(null);
    }
    
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1080, height: 1920 },
        audio: true
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      console.error("Camera error:", err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setMediaType('image');
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  // Start video recording
  const startRecording = () => {
    if (!cameraStream) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(cameraStream, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `story-${Date.now()}.webm`, { type: 'video/webm' });
      setSelectedFile(file);
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    
    // Auto-stop after 60 seconds
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
      }
    }, 60000);
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Upload story
  const uploadStory = async () => {
    if (!selectedFile) {
      setError("Please select or capture media first");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Step 1: Upload media to Cloudinary
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'streampirex');
      formData.append('folder', 'stories');
      
      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
      const resourceType = mediaType === 'video' ? 'video' : 'image';
      
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload media");
      }
      
      const uploadData = await uploadResponse.json();
      setUploadProgress(70);
      
      // Step 2: Create story in database
      const storyResponse = await fetch(`${backendUrl}/api/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_url: uploadData.secure_url,
          media_type: mediaType,
          thumbnail_url: mediaType === 'video' 
            ? uploadData.secure_url.replace(/\.[^.]+$/, '.jpg') 
            : uploadData.secure_url,
          duration: mediaType === 'video' ? Math.min(Math.ceil(uploadData.duration || 15), MAX_STORY_DURATION) : 5,
          caption: caption.trim() || null,
          comment_mode: commentMode  // NEW: Send comment mode
        })
      });
      
      if (!storyResponse.ok) {
        const errorData = await storyResponse.json();
        throw new Error(errorData.error || "Failed to create story");
      }
      
      setUploadProgress(100);
      
      // Success - navigate to story viewer
      setTimeout(() => {
        navigate(`/stories/${store.user?.id}`);
      }, 500);
      
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setVideoDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="story-upload-container">
      {/* Header */}
      <div className="story-upload-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Create Story</h2>
        <div className="header-spacer" />
      </div>

      {/* Camera Mode */}
      {showCamera && (
        <div className="camera-view">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className="camera-preview"
          />
          
          <div className="camera-controls">
            <button className="camera-btn cancel" onClick={stopCamera}>
              ✕
            </button>
            
            {!isRecording ? (
              <>
                <button className="camera-btn capture" onClick={takePhoto}>
                  📷
                </button>
                <button className="camera-btn record" onClick={startRecording}>
                  🔴
                </button>
              </>
            ) : (
              <button className="camera-btn stop-record" onClick={stopRecording}>
                ⏹ Stop
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="recording-indicator">
              <span className="rec-dot"></span> Recording...
            </div>
          )}
        </div>
      )}

      {/* Selection View */}
      {!showCamera && !previewUrl && (
        <div className="story-select-media">
          <div className="upload-options">
            <button className="upload-option" onClick={() => fileInputRef.current?.click()}>
              <span className="option-icon">📁</span>
              <span className="option-label">Upload from Gallery</span>
            </button>
            
            <button className="upload-option" onClick={startCamera}>
              <span className="option-icon">📷</span>
              <span className="option-label">Take Photo/Video</span>
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <p className="upload-hint">
            Images and videos up to 60 seconds. Stories disappear after 24 hours.
          </p>
        </div>
      )}

      {/* Preview View */}
      {!showCamera && previewUrl && (
        <div className="story-preview-view">
          <div className="preview-container">
            {mediaType === 'video' ? (
              <video 
                src={previewUrl}
                className="preview-media"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img 
                src={previewUrl}
                alt="Preview"
                className="preview-media"
              />
            )}
            
            <button className="clear-preview-btn" onClick={clearSelection}>
              ✕
            </button>
          </div>
          
          {/* Story Options */}
          <div className="story-options">
            {/* Caption */}
            <div className="caption-input">
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={200}
              />
              <span className="char-count">{caption.length}/200</span>
            </div>

            {/* Video Duration Badge */}
            {mediaType === 'video' && videoDuration && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                marginBottom: '12px',
                background: videoDuration > MAX_STORY_DURATION ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,200,0.1)',
                border: `1px solid ${videoDuration > MAX_STORY_DURATION ? 'rgba(255,71,87,0.3)' : 'rgba(0,255,200,0.3)'}`,
                color: videoDuration > MAX_STORY_DURATION ? '#ff4757' : '#00ffc8'
              }}>
                ⏱️ {formatDuration(videoDuration)} / {formatDuration(MAX_STORY_DURATION)} max
              </div>
            )}
            
            {/* Comment Mode Selector - NEW */}
            <div className="comment-mode-selector">
              <label className="option-label">Who can respond?</label>
              <div className="comment-mode-options">
                {commentModeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`comment-mode-btn ${commentMode === option.value ? 'active' : ''}`}
                    onClick={() => setCommentMode(option.value)}
                    type="button"
                  >
                    <span className="mode-label">{option.label}</span>
                    <span className="mode-desc">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="upload-error">
              ⚠️ {error}
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
              <span>{uploadProgress}%</span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="story-actions">
            <button 
              className="secondary-btn"
              onClick={clearSelection}
              disabled={uploading}
            >
              Change
            </button>
            
            <button 
              className="primary-btn"
              onClick={uploadStory}
              disabled={uploading}
            >
              {uploading ? "Posting..." : "Share Story"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryUpload;