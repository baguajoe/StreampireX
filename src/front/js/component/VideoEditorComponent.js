import React, { useState, useEffect, useRef } from 'react';
import '../../styles/VideoEditorComponent.css';
import {
  Play, Pause, Square, RotateCcw, Download, Upload, Volume2, VolumeX,
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, Scissors, Copy, Move, Settings,
  Music, Video, AudioWaveform, Save, Youtube, Instagram, Facebook, Twitter,
  ChevronDown, ChevronUp, Layers, Zap, Filter, Folder, List, Film,
  Palette, Tv, Info, MousePointer, Hand, Type,
  Circle, Pen, Eraser, Crop, RotateCw, FlipHorizontal,
  ZoomIn, ZoomOut, Grid, Minimize2, Maximize2, MoreVertical, X, Crown, Star, Bolt,
  Sliders, Image, Wand2, Sparkles, Sun, Droplets, Contrast,
  RefreshCw, SkipForward, SkipBack, Rewind, FastForward, Monitor, Camera,
  RotateCcw as Rotate, Maximize, ArrowUpDown, ArrowLeftRight,
  Disc, Radio, Gauge, Waves, Shuffle, TrendingUp, Target, Crosshair,
  Aperture, Focus, Flashlight, Rainbow, Paintbrush, Brush, Scissors as Cut,
  Wind, Snowflake, Flame, Lightbulb, Globe, Magnet, Binary, Hash, Code,
  Hexagon, Triangle, Square as SquareIcon, Diamond, Octagon, Pentagon,
  Activity, BarChart, PieChart, LineChart, AreaChart, Thermometer,
  Wifi, WifiOff, Bluetooth, Radio as RadioIcon, Mic, MicOff, Speaker, Headphones,
  Volume1, Volume, VolumeX as Mute, Bell, BellOff, PlayCircle, PauseCircle,
  Loader
} from 'lucide-react';

// Backend URL configuration
const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// =====================================================
// VIDEO EDITOR API FUNCTIONS - Cloudinary Integration
// =====================================================

// Get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Upload a video/audio/image asset for use in editor
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Asset data with Cloudinary info
 */
const uploadEditorAsset = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');

    const response = await fetch(`${backendURL}/api/video-editor/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.asset;
  } catch (error) {
    console.error('Error uploading editor asset:', error);
    throw error;
  }
};

/**
 * Get all assets uploaded by user for video editor
 * @returns {Promise<Array>} - Array of asset objects
 */
const getEditorAssets = async () => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/assets`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to get assets: ${response.status}`);
    }

    const data = await response.json();
    return data.assets || [];
  } catch (error) {
    console.error('Error fetching editor assets:', error);
    throw error;
  }
};

/**
 * Apply transformations to a video clip
 * @param {Object} clipData - Clip data with transformations
 * @returns {Promise<string>} - Transformed video URL
 */
const transformVideo = async (clipData) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/transform`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(clipData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Transform failed');
    }

    const data = await response.json();
    return data.transformed_url;
  } catch (error) {
    console.error('Error transforming video:', error);
    throw error;
  }
};

/**
 * Trim a video to specified timestamps
 * @param {string} publicId - Cloudinary public ID
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Promise<string>} - Trimmed video URL
 */
const trimVideoClip = async (publicId, startTime, endTime) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/trim`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        public_id: publicId,
        start_time: startTime,
        end_time: endTime
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Trim failed');
    }

    const data = await response.json();
    return data.trimmed_url;
  } catch (error) {
    console.error('Error trimming video:', error);
    throw error;
  }
};

/**
 * Preview a single effect on a video
 * @param {string} publicId - Cloudinary public ID
 * @param {string} effectId - Effect identifier
 * @param {number} intensity - Effect intensity (0-100)
 * @returns {Promise<string>} - Preview video URL
 */
const previewVideoEffect = async (publicId, effectId, intensity = 50) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/effect-preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        public_id: publicId,
        effect_id: effectId,
        intensity: intensity
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Preview failed');
    }

    const data = await response.json();
    return data.preview_url;
  } catch (error) {
    console.error('Error previewing effect:', error);
    throw error;
  }
};

/**
 * Concatenate multiple video clips
 * @param {Array} clips - Array of clip objects with public_id and optional trim
 * @returns {Promise<string>} - Concatenated video URL
 */
const concatenateVideos = async (clips) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/concatenate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ clips })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Concatenation failed');
    }

    const data = await response.json();
    return data.concatenated_url;
  } catch (error) {
    console.error('Error concatenating videos:', error);
    throw error;
  }
};

/**
 * Add video/image overlay (picture-in-picture)
 * @param {string} basePublicId - Base video public ID
 * @param {string} overlayPublicId - Overlay video/image public ID
 * @param {Object} options - Position, scale, opacity, start time
 * @returns {Promise<string>} - Video URL with overlay
 */
const addVideoOverlay = async (basePublicId, overlayPublicId, options = {}) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/add-overlay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        base_public_id: basePublicId,
        overlay_public_id: overlayPublicId,
        position: options.position || 'bottom-right',
        scale: options.scale || 30,
        opacity: options.opacity || 100,
        start_time: options.startTime || 0
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Overlay failed');
    }

    const data = await response.json();
    return data.overlay_url;
  } catch (error) {
    console.error('Error adding overlay:', error);
    throw error;
  }
};

/**
 * Add text overlay to video
 * @param {string} publicId - Video public ID
 * @param {string} text - Text to overlay
 * @param {Object} options - Font size, color, position
 * @returns {Promise<string>} - Video URL with text
 */
const addTextOverlay = async (publicId, text, options = {}) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/add-text`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        public_id: publicId,
        text: text,
        font_size: options.fontSize || 40,
        color: options.color || 'white',
        position: options.position || 'bottom-left'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Text overlay failed');
    }

    const data = await response.json();
    return data.text_overlay_url;
  } catch (error) {
    console.error('Error adding text overlay:', error);
    throw error;
  }
};

/**
 * Export the complete video project
 * @param {Object} projectData - Timeline and settings data
 * @returns {Promise<Object>} - Export result with URL
 */
const exportProject = async (projectData) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error exporting project:', error);
    throw error;
  }
};

/**
 * Generate thumbnail from video at specific timestamp
 * @param {string} publicId - Video public ID
 * @param {number} timestamp - Timestamp in seconds
 * @returns {Promise<string>} - Thumbnail URL
 */
const generateThumbnail = async (publicId, timestamp = 0) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/thumbnail`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        public_id: publicId,
        timestamp: timestamp
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Thumbnail generation failed');
    }

    const data = await response.json();
    return data.thumbnail_url;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

/**
 * Save project to database
 * @param {Object} projectData - Project data to save
 * @returns {Promise<Object>} - Saved project data
 */
const saveProjectToBackend = async (projectData) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/save-project`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Save failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

/**
 * Get available effects list
 * @returns {Promise<Object>} - Effects organized by category
 */
const getAvailableEffectsFromAPI = async () => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/effects`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to get effects');
    }

    const data = await response.json();
    return data.effects;
  } catch (error) {
    console.error('Error fetching effects:', error);
    return null;
  }
};

/**
 * Get available export resolutions
 * @returns {Promise<Array>} - Array of resolution options
 */
const getAvailableResolutions = async () => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/resolutions`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to get resolutions');
    }

    const data = await response.json();
    return data.resolutions;
  } catch (error) {
    console.error('Error fetching resolutions:', error);
    return [];
  }
};

/**
 * Build clip data object for API calls
 * @param {Object} clip - Timeline clip object
 * @returns {Object} - Formatted clip data for API
 */
const buildClipData = (clip) => {
  return {
    public_id: clip.cloudinary_public_id || clip.public_id || clip.id,
    trim: clip.inPoint !== undefined && clip.outPoint !== undefined ? {
      start: clip.inPoint,
      end: clip.outPoint
    } : null,
    effects: clip.effects?.filter(e => e.enabled !== false).map(e => ({
      id: e.id,
      value: e.value || 50,
      enabled: true
    })) || [],
    transform: clip.compositing ? {
      width: clip.compositing.scale?.x ? Math.round(1920 * clip.compositing.scale.x / 100) : null,
      height: clip.compositing.scale?.y ? Math.round(1080 * clip.compositing.scale.y / 100) : null,
      crop: 'scale'
    } : null,
    audio: {
      volume: clip.volume ?? 100,
      muted: clip.muted || false
    }
  };
};

/**
 * Build timeline data for export
 * @param {Array} tracks - Array of track objects
 * @param {Object} settings - Export settings
 * @returns {Object} - Formatted project data for export API
 */
const buildExportData = (tracks, settings = {}) => {
  const formattedTracks = tracks.map(track => ({
    id: track.id,
    name: track.name,
    type: track.type,
    clips: track.clips.map(clip => buildClipData(clip)),
    transitions: track.transitions || []
  }));

  return {
    timeline: {
      tracks: formattedTracks
    },
    settings: {
      resolution: settings.resolution || '1080p',
      quality: settings.quality || 'auto',
      format: settings.format || 'mp4',
      frameRate: settings.frameRate || 24
    }
  };
};

/**
 * Download video from URL
 * @param {string} url - Video URL
 * @param {string} filename - Download filename
 */
const downloadVideo = (url, filename = 'exported-video.mp4') => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =====================================================
// AUDIO EFFECTS API FUNCTIONS (EXISTING)
// =====================================================

const applyAudioEffect = async (clipId, effectId, intensity) => {
  try {
    const token = localStorage.getItem('jwt-token');

    const response = await fetch(`${backendURL}/api/audio/apply-effect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clip_id: clipId,
        effect_id: effectId,
        intensity: intensity
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error applying audio effect:', error);
    throw error;
  }
};

const previewAudioEffect = async (clipId, effectId, intensity, startTime = 0, duration = 5) => {
  try {
    const token = localStorage.getItem('jwt-token');

    const response = await fetch(`${backendURL}/api/audio/preview-effect`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clip_id: clipId,
        effect_id: effectId,
        intensity: intensity,
        start_time: startTime,
        duration: duration
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error previewing audio effect:', error);
    throw error;
  }
};

const applyBatchEffects = async (clipId, effectsChain) => {
  try {
    const token = localStorage.getItem('jwt-token');

    const response = await fetch(`${backendURL}/api/audio/batch-effects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clip_id: clipId,
        effects_chain: effectsChain
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error applying batch effects:', error);
    throw error;
  }
};

const analyzeAudio = async (clipId) => {
  try {
    const token = localStorage.getItem('jwt-token');

    const response = await fetch(`${backendURL}/api/audio/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clip_id: clipId
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error analyzing audio:', error);
    throw error;
  }
};

const getAudioPresets = async () => {
  try {
    const response = await fetch(`${backendURL}/api/audio/presets`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching audio presets:', error);
    return {};
  }
};

// =====================================================
// MEDIA BROWSER COMPONENT (UPDATED WITH CLOUDINARY)
// =====================================================

const MediaBrowser = ({ onFileSelect, onClose, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    for (const file of files) {
      const tempId = Date.now() + Math.random();

      // Add temp file with loading state
      setSelectedFiles(prev => [...prev, {
        id: tempId,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video'
          : file.type.startsWith('audio/') ? 'audio'
            : 'image',
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        duration: '0:30',
        file: file,
        url: URL.createObjectURL(file),
        uploading: true
      }]);

      try {
        // Upload to Cloudinary via backend
        const asset = await uploadEditorAsset(file);

        // Update with Cloudinary data
        setSelectedFiles(prev => prev.map(f =>
          f.id === tempId ? {
            ...f,
            id: asset.public_id || tempId,
            cloudinary_public_id: asset.public_id,
            url: asset.url,
            duration: asset.duration ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}` : '0:00',
            width: asset.width,
            height: asset.height,
            thumbnail: asset.thumbnail,
            uploading: false
          } : f
        ));

        console.log(`✅ Uploaded ${file.name} to Cloudinary`);

        if (onUploadComplete) {
          onUploadComplete(asset);
        }
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        // Mark as failed but keep local URL
        setSelectedFiles(prev => prev.map(f =>
          f.id === tempId ? { ...f, uploading: false, uploadFailed: true } : f
        ));
      }
    }

    setUploading(false);
  };

  return (
    <div className="media-browser-overlay">
      <div className="media-browser-modal">
        <div className="media-browser-header">
          <h3>Media Browser</h3>
          <div className="browser-controls">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
            </button>
            <button onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="media-browser-toolbar">
          <label className="import-files-btn" style={{ opacity: uploading ? 0.5 : 1 }}>
            {uploading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Import Files'}
            <input
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>

        <div className={`media-browser-content ${viewMode}`}>
          {selectedFiles.map(file => (
            <div
              key={file.id}
              className={`media-browser-item ${file.uploading ? 'uploading' : ''} ${file.uploadFailed ? 'failed' : ''}`}
              onClick={() => !file.uploading && onFileSelect(file)}
              style={{ cursor: file.uploading ? 'wait' : 'pointer' }}
            >
              <div className="media-thumbnail">
                {file.uploading ? (
                  <Loader size={32} className="spin" />
                ) : file.thumbnail ? (
                  <img src={file.thumbnail} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    {file.type === 'video' && <Video size={32} />}
                    {file.type === 'audio' && <AudioWaveform size={32} />}
                    {file.type === 'image' && <Image size={32} />}
                  </>
                )}
              </div>
              <div className="media-info">
                <div className="media-name">{file.name}</div>
                <div className="media-meta">
                  {file.uploading ? 'Uploading...' : file.uploadFailed ? 'Upload failed' : file.size}
                  {file.cloudinary_public_id && <span style={{ color: '#00ffc8', marginLeft: '5px' }}>☁️</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// SOURCE MONITOR COMPONENT (EXISTING)
// =====================================================

const SourceMonitor = ({ selectedMedia, onAddToTimeline, onClose }) => {
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Get the active media element
  const getMediaElement = () => videoRef.current || audioRef.current;

  // Handle time update
  const handleTimeUpdate = () => {
    const media = getMediaElement();
    if (media) {
      setCurrentTime(media.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    const media = getMediaElement();
    if (media) {
      setDuration(media.duration);
      setOutPoint(media.duration);
    }
  };

  // Play/Pause
  const togglePlayPause = () => {
    const media = getMediaElement();
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Mark In Point
  const markIn = () => {
    setInPoint(currentTime);
  };

  // Mark Out Point
  const markOut = () => {
    setOutPoint(currentTime);
  };

  // Go to In Point
  const goToIn = () => {
    const media = getMediaElement();
    if (media) {
      media.currentTime = inPoint;
      setCurrentTime(inPoint);
    }
  };

  // Go to Out Point
  const goToOut = () => {
    const media = getMediaElement();
    if (media) {
      media.currentTime = outPoint;
      setCurrentTime(outPoint);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Calculate clip duration from in/out points
  const clipDuration = Math.max(0, outPoint - inPoint);

  return (
    <div className="source-monitor-panel" style={{
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      width: '700px',
      maxWidth: '90vw',
      background: '#1e1e1e',
      border: '1px solid #3f3f46',
      borderRadius: '8px',
      zIndex: 1000,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#252830',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #3f3f46'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={16} style={{ color: '#00ffc8' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0' }}>Source Monitor</span>
          <span style={{ fontSize: '11px', color: '#888' }}>- {selectedMedia?.name}</span>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <X size={18} />
        </button>
      </div>

      {/* Preview Area */}
      <div style={{
        background: '#000',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {selectedMedia?.type === 'video' ? (
          <video
            ref={videoRef}
            src={selectedMedia.url}
            style={{ width: '100%', maxHeight: '350px' }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : selectedMedia?.type === 'audio' ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <AudioWaveform size={64} style={{ color: '#ff6b6b', marginBottom: '16px' }} />
            <p style={{ color: '#888', marginBottom: '16px' }}>{selectedMedia.name}</p>
            <audio
              ref={audioRef}
              src={selectedMedia.url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        ) : selectedMedia?.type === 'image' ? (
          <img src={selectedMedia.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }} />
        ) : null}
      </div>

      {/* Timeline Scrubber */}
      {(selectedMedia?.type === 'video' || selectedMedia?.type === 'audio') && (
        <div style={{ padding: '8px 16px', background: '#252830' }}>
          {/* Progress Bar */}
          <div style={{
            position: 'relative',
            height: '24px',
            background: '#1a1a1a',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            {/* In/Out Range Highlight */}
            <div style={{
              position: 'absolute',
              left: `${duration > 0 ? (inPoint / duration) * 100 : 0}%`,
              width: `${duration > 0 ? ((outPoint - inPoint) / duration) * 100 : 100}%`,
              height: '100%',
              background: 'rgba(0, 255, 200, 0.2)'
            }} />
            {/* Current Position */}
            <div style={{
              position: 'absolute',
              left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              width: '2px',
              height: '100%',
              background: '#00ffc8',
              zIndex: 2
            }} />
            {/* In Point Marker */}
            <div style={{
              position: 'absolute',
              left: `${duration > 0 ? (inPoint / duration) * 100 : 0}%`,
              width: '4px',
              height: '100%',
              background: '#4a9eff',
              cursor: 'pointer'
            }} title={`In: ${formatTime(inPoint)}`} />
            {/* Out Point Marker */}
            <div style={{
              position: 'absolute',
              left: `${duration > 0 ? (outPoint / duration) * 100 : 0}%`,
              width: '4px',
              height: '100%',
              background: '#ff6b6b',
              cursor: 'pointer'
            }} title={`Out: ${formatTime(outPoint)}`} />
            {/* Clickable Scrubber */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const time = parseFloat(e.target.value);
                const media = getMediaElement();
                if (media) {
                  media.currentTime = time;
                  setCurrentTime(time);
                }
              }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Playback Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={goToIn} style={controlBtnStyle} title="Go to In Point">
                <SkipBack size={14} />
              </button>
              <button onClick={togglePlayPause} style={{
                ...controlBtnStyle,
                background: '#00ffc8',
                color: '#000',
                width: '36px',
                height: '36px'
              }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={goToOut} style={controlBtnStyle} title="Go to Out Point">
                <SkipForward size={14} />
              </button>
            </div>

            {/* Timecode Display */}
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              color: '#00ffc8',
              background: '#1a1a1a',
              padding: '6px 10px',
              borderRadius: '4px'
            }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Mark In/Out Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={markIn} style={controlBtnStyle} title="Mark In (I)">
                <span style={{ fontSize: '11px', fontWeight: 700 }}>I</span>
              </button>
              <button onClick={markOut} style={controlBtnStyle} title="Mark Out (O)">
                <span style={{ fontSize: '11px', fontWeight: 700 }}>O</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In/Out Points Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#1a1a1a',
        fontSize: '11px',
        color: '#888'
      }}>
        <span>In: <span style={{ color: '#4a9eff' }}>{formatTime(inPoint)}</span></span>
        <span>Duration: <span style={{ color: '#00ffc8' }}>{formatTime(clipDuration)}</span></span>
        <span>Out: <span style={{ color: '#ff6b6b' }}>{formatTime(outPoint)}</span></span>
      </div>

      {/* Action Buttons - Like Premiere Pro */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid #3f3f46',
        justifyContent: 'center'
      }}>
        {/* Insert Video Only */}
        {selectedMedia?.type === 'video' && (
          <button
            onClick={() => onAddToTimeline(selectedMedia, inPoint, outPoint, 'video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: '#4a9eff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Insert Video Only (V)"
          >
            <Video size={14} />
            Insert Video
          </button>
        )}

        {/* Insert Audio Only */}
        {(selectedMedia?.type === 'video' || selectedMedia?.type === 'audio') && (
          <button
            onClick={() => onAddToTimeline(selectedMedia, inPoint, outPoint, 'audio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: '#ff6b6b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Insert Audio Only (A)"
          >
            <AudioWaveform size={14} />
            Insert Audio
          </button>
        )}

        {/* Insert Both (Video + Audio) */}
        {selectedMedia?.type === 'video' && (
          <button
            onClick={() => onAddToTimeline(selectedMedia, inPoint, outPoint, 'both')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #00ffc8, #00b894)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Insert Video + Audio"
          >
            <Plus size={14} />
            Insert Both
          </button>
        )}

        {/* For images, just add to timeline */}
        {selectedMedia?.type === 'image' && (
          <button
            onClick={() => onAddToTimeline(selectedMedia, 0, 5, 'video')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #00ffc8, #00b894)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Image size={14} />
            Add Image to Timeline
          </button>
        )}
      </div>
    </div>
  );
};

// Control button style helper
const controlBtnStyle = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#3a3d45',
  border: 'none',
  borderRadius: '4px',
  color: '#e0e0e0',
  cursor: 'pointer'
};

// =====================================================
// EXPORT MODAL COMPONENT (NEW)
// =====================================================

const ExportModal = ({ project, tracks, onClose, onExportComplete, frameRate = 24 }) => {
  const [resolution, setResolution] = useState('1080p');
  const [quality, setQuality] = useState('auto');
  const [format, setFormat] = useState('mp4');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportUrl, setExportUrl] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setExportProgress(10);
    setError(null);

    try {
      // Build export data from timeline
      const exportData = buildExportData(tracks, {
        resolution,
        quality,
        format,
        frameRate
      });

      setExportProgress(30);

      // Check if we have any clips with Cloudinary IDs
      const hasCloudinaryClips = tracks.some(track =>
        track.clips.some(clip => clip.cloudinary_public_id)
      );

      if (!hasCloudinaryClips) {
        throw new Error('No clips with cloud storage found. Please upload media files first.');
      }

      setExportProgress(50);

      // Call export API
      const result = await exportProject(exportData);

      setExportProgress(100);

      if (result.success && result.export_url) {
        setExportUrl(result.export_url);
        if (onExportComplete) {
          onExportComplete(result);
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (err) {
      console.error('Export error:', err);
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (exportUrl) {
      downloadVideo(exportUrl, `${project.title || 'video'}.${format}`);
    }
  };

  return (
    <div className="export-modal-overlay">
      <div className="export-modal">
        <div className="export-modal-header">
          <h3>Export Video</h3>
          <button onClick={onClose} className="close-btn"><X size={16} /></button>
        </div>

        <div className="export-modal-content">
          {!exportUrl ? (
            <>
              <div className="export-setting">
                <label>Resolution</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option value="4k">4K Ultra HD (3840x2160)</option>
                  <option value="1080p">Full HD (1920x1080)</option>
                  <option value="720p">HD (1280x720)</option>
                  <option value="480p">SD (854x480)</option>
                </select>
              </div>

              <div className="export-setting">
                <label>Quality</label>
                <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                  <option value="auto">Auto (Recommended)</option>
                  <option value="best">Best Quality</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Smaller file)</option>
                </select>
              </div>

              <div className="export-setting">
                <label>Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="mp4">MP4 (Most Compatible)</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </div>

              {error && (
                <div className="export-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              {exporting && (
                <div className="export-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
                  </div>
                  <span>{exportProgress}% - Processing...</span>
                </div>
              )}

              <div className="export-actions">
                <button onClick={onClose} className="cancel-btn" disabled={exporting}>
                  Cancel
                </button>
                <button onClick={handleExport} className="export-btn" disabled={exporting}>
                  {exporting ? (
                    <>
                      <Loader size={14} className="spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Export
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="export-complete">
              <div className="success-icon">✅</div>
              <h4>Export Complete!</h4>
              <p>Your video is ready to download.</p>

              <div className="export-actions">
                <button onClick={handleDownload} className="download-btn">
                  <Download size={14} />
                  Download Video
                </button>
                <button onClick={() => window.open(exportUrl, '_blank')} className="preview-btn">
                  <Eye size={14} />
                  Preview
                </button>
              </div>

              <div className="export-url">
                <input type="text" value={exportUrl} readOnly />
                <button onClick={() => navigator.clipboard.writeText(exportUrl)}>
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// MAIN VIDEO EDITOR COMPONENT
// =====================================================

const VideoEditorComponent = () => {
  // Core state
  const [project, setProject] = useState({
    title: 'Professional Video Project',
    duration: 300,
    frameRate: 30,
    resolution: { width: 1920, height: 1080 }
  });

  const [tracks, setTracks] = useState([
    {
      id: 1,
      name: 'Video 1',
      type: 'video',
      visible: true,
      muted: false,
      locked: false,
      color: '#4a9eff',
      zIndex: 2,
      clips: [],
      transitions: []
    },
    {
      id: 2,
      name: 'Overlay 1',
      type: 'video',
      visible: true,
      muted: true,
      locked: false,
      color: '#ff6b6b',
      zIndex: 3,
      clips: [],
      transitions: []
    },
    {
      id: 3,
      name: 'Audio 1',
      type: 'audio',
      visible: true,
      muted: false,
      locked: false,
      color: '#00d4aa',
      zIndex: 1,
      clips: [],
      transitions: []
    }
  ]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [selectedTransitionType, setSelectedTransitionType] = useState('crossDissolve'); // Default transition to add
  const [zoom, setZoom] = useState(1);
  const [frameRate, setFrameRate] = useState(24); // Default to 24fps (film standard)

  const [snapGridSize, setSnapGridSize] = useState(5);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  // User tier
  const [userTier] = useState('professional');

  // UI state
  const [showSnapToGrid, setShowSnapToGrid] = useState(true);
  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);
  const [activeEffects, setActiveEffects] = useState({});
  const [showEffectsPanel, setShowEffectsPanel] = useState(true);
  const [programMonitorMuted, setProgramMonitorMuted] = useState(false);
  const [showCompositingPanel, setShowCompositingPanel] = useState(false);
  const [showColorGrading, setShowColorGrading] = useState(false);
  const [showAudioMixing, setShowAudioMixing] = useState(false);
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [draggedTransition, setDraggedTransition] = useState(null);
  const [draggedEffect, setDraggedEffect] = useState(null);
  const [audioPresets, setAudioPresets] = useState({});

  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [showSourceMonitor, setShowSourceMonitor] = useState(false);
  const [showMediaBin, setShowMediaBin] = useState(true); // Media Bin visible by default
  const [mediaBinView, setMediaBinView] = useState('grid'); // 'grid' or 'list'
  const [mediaSearchTerm, setMediaSearchTerm] = useState('');
  const [sourceMonitorMedia, setSourceMonitorMedia] = useState(null);

  // Export state (NEW)
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Upload state (NEW)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dropdown states for organized sections
  const [showVideoEffects, setShowVideoEffects] = useState(true);
  const [showFadeEffects, setShowFadeEffects] = useState(true);
  const [showAudioEffects, setShowAudioEffects] = useState(true);
  const [showTransitions, setShowTransitions] = useState(true);
  const [showCompositing, setShowCompositing] = useState(true);
  const [showColorCorrection, setShowColorCorrection] = useState(true);
  const [showMotionGraphics, setShowMotionGraphics] = useState(true);
  const [showDistortion, setShowDistortion] = useState(true);
  const [showGenerator, setShowGenerator] = useState(true);
  const [showKeying, setShowKeying] = useState(true);

  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [draggedMedia, setDraggedMedia] = useState(null);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load audio presets on component mount
  useEffect(() => {
    getAudioPresets().then(presets => {
      setAudioPresets(presets);
    });
  }, []);

  useEffect(() => {
    if (draggedClip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedClip, dragOffset, zoom, duration, showSnapToGrid, snapGridSize]);

  // Tools configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Selection Tool' },
    { id: 'razor', icon: Scissors, name: 'Razor Tool' },
    { id: 'hand', icon: Hand, name: 'Hand Tool' },
    { id: 'text', icon: Type, name: 'Text Tool' },
    { id: 'crop', icon: Crop, name: 'Crop Tool' },
    { id: 'mask', icon: Crosshair, name: 'Mask Tool' },
    { id: 'eyedropper', icon: Aperture, name: 'Color Picker' }
  ];

  // Blend modes
  const blendModes = [
    'normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
    'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion',
    'hue', 'saturation', 'color', 'luminosity', 'linear-burn', 'linear-dodge',
    'vivid-light', 'linear-light', 'pin-light', 'hard-mix', 'subtract', 'divide'
  ];

  // Comprehensive Effects Library
  const videoEffects = [
    // Fade Effects (NEW)
    { id: 'fadeIn', name: 'Fade In (Black)', icon: Sun, category: 'fade', description: 'Fade in from black' },
    { id: 'fadeOut', name: 'Fade Out (Black)', icon: Circle, category: 'fade', description: 'Fade out to black' },
    { id: 'fadeInWhite', name: 'Fade In (White)', icon: Sun, category: 'fade', description: 'Fade in from white' },
    { id: 'fadeOutWhite', name: 'Fade Out (White)', icon: Sun, category: 'fade', description: 'Fade out to white' },
    { id: 'crossDissolve', name: 'Cross Dissolve', icon: Layers, category: 'fade', description: 'Dissolve effect at start and end' },

    // Basic Color Correction
    { id: 'brightness', name: 'Brightness', icon: Sun, category: 'color', description: 'Adjust overall brightness' },
    { id: 'contrast', name: 'Contrast', icon: Contrast, category: 'color', description: 'Enhance contrast ratio' },
    { id: 'saturation', name: 'Saturation', icon: Droplets, category: 'color', description: 'Color intensity control' },
    { id: 'hue', name: 'Hue Shift', icon: Rainbow, category: 'color', description: 'Shift color spectrum' },
    { id: 'gamma', name: 'Gamma Correction', icon: Gauge, category: 'color', description: 'Midtone adjustment' },
    { id: 'exposure', name: 'Exposure', icon: Camera, category: 'color', description: 'Simulate camera exposure' },

    // Advanced Color Grading
    { id: 'colorBalance', name: 'Color Balance', icon: Palette, category: 'colorGrading', description: 'Adjust shadows/highlights' },
    { id: 'curves', name: 'Color Curves', icon: TrendingUp, category: 'colorGrading', description: 'Precise tone control' },
    { id: 'levels', name: 'Levels', icon: BarChart, category: 'colorGrading', description: 'Input/output levels' },
    { id: 'colorWheel', name: 'Color Wheels', icon: Circle, category: 'colorGrading', description: 'Three-way color correction' },
    { id: 'lut', name: 'LUT Correction', icon: Layers, category: 'colorGrading', description: 'Apply color lookup tables' },
    { id: 'vectorscope', name: 'Vectorscope', icon: Target, category: 'colorGrading', description: 'Color analysis tool' },

    // Blur & Sharpening
    { id: 'blur', name: 'Gaussian Blur', icon: Circle, category: 'blur', description: 'Standard blur effect' },
    { id: 'motionBlur', name: 'Motion Blur', icon: Move, category: 'blur', description: 'Directional motion blur' },
    { id: 'radialBlur', name: 'Radial Blur', icon: RadioIcon, category: 'blur', description: 'Circular blur effect' },
    { id: 'surfaceBlur', name: 'Surface Blur', icon: Waves, category: 'blur', description: 'Edge-preserving blur' },
    { id: 'sharpen', name: 'Sharpen', icon: Zap, category: 'sharpen', description: 'Enhance image sharpness' },
    { id: 'unsharpMask', name: 'Unsharp Mask', icon: Focus, category: 'sharpen', description: 'Professional sharpening' },

    // Distortion Effects
    { id: 'lens', name: 'Lens Distortion', icon: Focus, category: 'distortion', description: 'Simulate lens effects' },
    { id: 'fisheye', name: 'Fisheye', icon: Circle, category: 'distortion', description: 'Wide-angle lens effect' },
    { id: 'ripple', name: 'Ripple', icon: Waves, category: 'distortion', description: 'Water ripple effect' },
    { id: 'twirl', name: 'Twirl', icon: RotateCw, category: 'distortion', description: 'Spiral distortion' },
    { id: 'pinch', name: 'Pinch', icon: Minimize2, category: 'distortion', description: 'Pinch/bulge effect' },
    { id: 'perspective', name: 'Perspective', icon: Diamond, category: 'distortion', description: 'Corner pin adjustment' },

    // Stylize Effects
    { id: 'posterize', name: 'Posterize', icon: Layers, category: 'stylize', description: 'Reduce color levels' },
    { id: 'solarize', name: 'Solarize', icon: Sun, category: 'stylize', description: 'Tone reversal effect' },
    { id: 'emboss', name: 'Emboss', icon: Triangle, category: 'stylize', description: '3D relief effect' },
    { id: 'findEdges', name: 'Find Edges', icon: Crosshair, category: 'stylize', description: 'Edge detection' },
    { id: 'glowEdges', name: 'Glowing Edges', icon: Lightbulb, category: 'stylize', description: 'Luminous edge effect' },
    { id: 'oilPaint', name: 'Oil Paint', icon: Paintbrush, category: 'stylize', description: 'Artistic paint effect' },

    // Keying & Masking
    { id: 'chromaKey', name: 'Chroma Key', icon: Palette, category: 'keying', description: 'Green/blue screen removal' },
    { id: 'colorKey', name: 'Color Key', icon: Target, category: 'keying', description: 'Color-based keying' },
    { id: 'differenceKey', name: 'Difference Key', icon: Filter, category: 'keying', description: 'Background subtraction' },
    { id: 'luminanceKey', name: 'Luminance Key', icon: Sun, category: 'keying', description: 'Brightness-based key' },
    { id: 'mask', name: 'Alpha Mask', icon: Crosshair, category: 'keying', description: 'Transparency masking' },

    // Noise & Grain
    { id: 'addNoise', name: 'Add Noise', icon: Hash, category: 'noise', description: 'Film grain simulation' },
    { id: 'removeNoise', name: 'Noise Reduction', icon: Filter, category: 'noise', description: 'Clean up grainy footage' },
    { id: 'dustAndScratches', name: 'Dust & Scratches', icon: Brush, category: 'noise', description: 'Film restoration' },
    { id: 'median', name: 'Median Filter', icon: Gauge, category: 'noise', description: 'Noise smoothing' },

    // Time Effects
    { id: 'timeRemap', name: 'Time Remapping', icon: RefreshCw, category: 'time', description: 'Variable speed control' },
    { id: 'posterizeTime', name: 'Posterize Time', icon: PlayCircle, category: 'time', description: 'Frame rate reduction' },
    { id: 'echo', name: 'Echo', icon: Copy, category: 'time', description: 'Temporal echo effect' },
    { id: 'strobe', name: 'Strobe Light', icon: Bolt, category: 'time', description: 'Flashing strobe effect' },

    // Lighting Effects
    { id: 'dropShadow', name: 'Drop Shadow', icon: Square, category: 'lighting', description: 'Cast shadow behind object' },
    { id: 'innerShadow', name: 'Inner Shadow', icon: Circle, category: 'lighting', description: 'Inset shadow effect' },
    { id: 'glow', name: 'Outer Glow', icon: Sun, category: 'lighting', description: 'Luminous glow effect' },
    { id: 'innerGlow', name: 'Inner Glow', icon: Lightbulb, category: 'lighting', description: 'Internal glow effect' },
    { id: 'bevel', name: 'Bevel & Emboss', icon: Diamond, category: 'lighting', description: '3D edge lighting' },
    { id: 'lensFlare', name: 'Lens Flare', icon: Star, category: 'lighting', description: 'Camera lens flare' },

    // Generate Effects
    { id: 'gradientRamp', name: 'Gradient Ramp', icon: TrendingUp, category: 'generate', description: 'Color gradient overlay' },
    { id: 'checkerboard', name: 'Checkerboard', icon: Grid, category: 'generate', description: 'Pattern generator' },
    { id: 'fractalNoise', name: 'Fractal Noise', icon: Waves, category: 'generate', description: 'Procedural texture' },
    { id: 'cellPattern', name: 'Cell Pattern', icon: Hexagon, category: 'generate', description: 'Cellular texture' }
  ];

  const audioEffects = [
    // Dynamics
    { id: 'compressor', name: 'Compressor', icon: Minimize2, category: 'dynamics', description: 'Dynamic range control' },
    { id: 'limiter', name: 'Limiter', icon: Maximize2, category: 'dynamics', description: 'Prevent audio clipping' },
    { id: 'expander', name: 'Expander', icon: ArrowUpDown, category: 'dynamics', description: 'Increase dynamic range' },
    { id: 'gate', name: 'Noise Gate', icon: Volume2, category: 'dynamics', description: 'Silence quiet sounds' },
    { id: 'multiband', name: 'Multiband Compressor', icon: BarChart, category: 'dynamics', description: 'Frequency-specific compression' },

    // EQ & Filtering
    { id: 'equalizer', name: 'Parametric EQ', icon: Sliders, category: 'eq', description: 'Frequency adjustment' },
    { id: 'graphicEQ', name: 'Graphic EQ', icon: BarChart, category: 'eq', description: 'Fixed-band equalizer' },
    { id: 'highPass', name: 'High Pass Filter', icon: ChevronUp, category: 'eq', description: 'Remove low frequencies' },
    { id: 'lowPass', name: 'Low Pass Filter', icon: ChevronDown, category: 'eq', description: 'Remove high frequencies' },
    { id: 'bandPass', name: 'Band Pass Filter', icon: Filter, category: 'eq', description: 'Isolate frequency range' },
    { id: 'notch', name: 'Notch Filter', icon: Target, category: 'eq', description: 'Remove specific frequency' },

    // Modulation
    { id: 'chorus', name: 'Chorus', icon: Copy, category: 'modulation', description: 'Thicken sound with copies' },
    { id: 'flanger', name: 'Flanger', icon: Waves, category: 'modulation', description: 'Sweeping comb filter' },
    { id: 'phaser', name: 'Phaser', icon: Circle, category: 'modulation', description: 'Phase shifting effect' },
    { id: 'tremolo', name: 'Tremolo', icon: Volume1, category: 'modulation', description: 'Volume modulation' },
    { id: 'vibrato', name: 'Vibrato', icon: Waves, category: 'modulation', description: 'Pitch modulation' },
    { id: 'ringMod', name: 'Ring Modulator', icon: RadioIcon, category: 'modulation', description: 'Frequency multiplication' },

    // Time-Based
    { id: 'reverb', name: 'Reverb', icon: AudioWaveform, category: 'time', description: 'Spatial ambience' },
    { id: 'delay', name: 'Delay', icon: SkipForward, category: 'time', description: 'Echo effect' },
    { id: 'multitapDelay', name: 'Multitap Delay', icon: Copy, category: 'time', description: 'Multiple echo taps' },
    { id: 'pitchShift', name: 'Pitch Shift', icon: ChevronUp, category: 'time', description: 'Change pitch without tempo' },
    { id: 'timeStretch', name: 'Time Stretch', icon: ArrowLeftRight, category: 'time', description: 'Change tempo without pitch' },

    // Distortion
    { id: 'overdrive', name: 'Overdrive', icon: Zap, category: 'distortion', description: 'Soft saturation' },
    { id: 'distortion', name: 'Distortion', icon: Bolt, category: 'distortion', description: 'Hard clipping' },
    { id: 'bitCrusher', name: 'Bit Crusher', icon: Binary, category: 'distortion', description: 'Digital degradation' },
    { id: 'waveshaper', name: 'Waveshaper', icon: TrendingUp, category: 'distortion', description: 'Custom distortion curve' },
    { id: 'saturation', name: 'Tape Saturation', icon: Disc, category: 'distortion', description: 'Analog warmth' },

    // Restoration
    { id: 'noiseReduction', name: 'Noise Reduction', icon: Filter, category: 'restoration', description: 'Remove unwanted noise' },
    { id: 'spectralRepair', name: 'Spectral Repair', icon: Wand2, category: 'restoration', description: 'Fix audio problems' },
    { id: 'clickRemoval', name: 'Click Removal', icon: X, category: 'restoration', description: 'Remove pops and clicks' },
    { id: 'deEsser', name: 'De-esser', icon: Mic, category: 'restoration', description: 'Reduce sibilance' },
    { id: 'deHum', name: 'De-hum', icon: WifiOff, category: 'restoration', description: 'Remove electrical hum' },

    // Spatial
    { id: 'stereoWiden', name: 'Stereo Widener', icon: Maximize2, category: 'spatial', description: 'Expand stereo field' },
    { id: 'monoMaker', name: 'Mono Maker', icon: Minimize2, category: 'spatial', description: 'Convert to mono' },
    { id: 'haasEffect', name: 'Haas Effect', icon: ArrowLeftRight, category: 'spatial', description: 'Stereo placement' },
    { id: 'binaural', name: 'Binaural Panner', icon: Headphones, category: 'spatial', description: '3D audio positioning' },

    // Analysis
    { id: 'spectrumAnalyzer', name: 'Spectrum Analyzer', icon: AreaChart, category: 'analysis', description: 'Frequency visualization' },
    { id: 'phaseMeter', name: 'Phase Meter', icon: Target, category: 'analysis', description: 'Stereo phase analysis' },
    { id: 'levelMeter', name: 'Level Meter', icon: Activity, category: 'analysis', description: 'Audio level monitoring' },
    { id: 'loudnessMeter', name: 'Loudness Meter', icon: Volume2, category: 'analysis', description: 'Broadcast loudness' }
  ];

  // Combine for compatibility
  const effects = [...videoEffects, ...audioEffects];

  // Enhanced Transitions
  const transitions = [
    // Basic Transitions
    { id: 'crossDissolve', name: 'Cross Dissolve', icon: Layers, duration: 1, category: 'basic' },
    { id: 'fade', name: 'Fade to Black', icon: Circle, duration: 0.5, category: 'basic' },
    { id: 'fadeWhite', name: 'Fade to White', icon: Sun, duration: 0.5, category: 'basic' },
    { id: 'dip', name: 'Dip to Color', icon: Palette, duration: 1, category: 'basic' },

    // Wipe Transitions
    { id: 'wipeLeft', name: 'Wipe Left', icon: Move, duration: 1, category: 'wipe' },
    { id: 'wipeRight', name: 'Wipe Right', icon: Move, duration: 1, category: 'wipe' },
    { id: 'wipeUp', name: 'Wipe Up', icon: ChevronUp, duration: 1, category: 'wipe' },
    { id: 'wipeDown', name: 'Wipe Down', icon: ChevronDown, duration: 1, category: 'wipe' },
    { id: 'wipeClockwise', name: 'Wipe Clockwise', icon: RotateCw, duration: 1.5, category: 'wipe' },
    { id: 'irisRound', name: 'Iris Round', icon: Circle, duration: 1, category: 'wipe' },

    // Slide Transitions
    { id: 'slideLeft', name: 'Slide Left', icon: ChevronDown, duration: 1, category: 'slide' },
    { id: 'slideRight', name: 'Slide Right', icon: ChevronUp, duration: 1, category: 'slide' },
    { id: 'slideUp', name: 'Slide Up', icon: ArrowUpDown, duration: 1, category: 'slide' },
    { id: 'slideDown', name: 'Slide Down', icon: ArrowUpDown, duration: 1, category: 'slide' },
    { id: 'pushLeft', name: 'Push Left', icon: ArrowLeftRight, duration: 1, category: 'slide' },

    // 3D Transitions
    { id: 'zoomIn', name: 'Zoom In', icon: ZoomIn, duration: 1, category: '3d' },
    { id: 'zoomOut', name: 'Zoom Out', icon: ZoomOut, duration: 1, category: '3d' },
    { id: 'spin', name: 'Spin', icon: RotateCw, duration: 1.5, category: '3d' },
    { id: 'flip', name: 'Flip', icon: FlipHorizontal, duration: 0.75, category: '3d' },
    { id: 'cube', name: 'Cube Spin', icon: SquareIcon, duration: 2, category: '3d' },
    { id: 'sphere', name: 'Sphere', icon: Circle, duration: 1.5, category: '3d' },

    // Blur Transitions
    { id: 'motionBlurTransition', name: 'Motion Blur', icon: Move, duration: 1, category: 'blur' },
    { id: 'radialBlurTransition', name: 'Radial Blur', icon: RadioIcon, duration: 1.2, category: 'blur' },
    { id: 'zoomBlur', name: 'Zoom Blur', icon: ZoomIn, duration: 1, category: 'blur' },

    // Distort Transitions
    { id: 'ripple', name: 'Ripple', icon: Waves, duration: 1.5, category: 'distort' },
    { id: 'wave', name: 'Wave Warp', icon: Waves, duration: 1.8, category: 'distort' },
    { id: 'turbulence', name: 'Turbulent Displace', icon: Wind, duration: 2, category: 'distort' },

    // Light Transitions
    { id: 'lensFlare', name: 'Lens Flare', icon: Star, duration: 1.5, category: 'light' },
    { id: 'lightSweep', name: 'Light Sweep', icon: Flashlight, duration: 1.2, category: 'light' },
    { id: 'flash', name: 'Flash', icon: Bolt, duration: 0.3, category: 'light' }
  ];

  // Playback controls
  const isPlayingRef = useRef(isPlaying);

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const play = () => {
    console.log('▶ Play clicked');
    setIsPlaying(true);
  };

  const pause = () => {
    console.log('⏸ Pause clicked');
    setIsPlaying(false);
  };

  const playPause = () => {
    console.log('⏯ PlayPause clicked, current state:', isPlaying);
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const stop = () => {
    console.log('⏹ Stop clicked');
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Timeline playback - advance currentTime when playing
  useEffect(() => {
    let animationFrame;
    let lastTime = performance.now();

    const animate = (now) => {
      // Use ref to get current playing state
      if (isPlayingRef.current) {
        const delta = (now - lastTime) / 1000; // Convert to seconds
        lastTime = now;

        setCurrentTime(prev => {
          const newTime = prev + delta;
          // Stop at the end of the timeline
          if (newTime >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return newTime;
        });

        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      console.log('▶ Starting animation loop');
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    } else {
      console.log('⏸ Animation loop stopped');
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, duration]);

  // Timeline interaction
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickTime = (x / timelineWidth) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, clickTime)));
  };

  // Effect application function
  const applyEffect = async (clipId, effectId, value) => {
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip) {
      console.error('Clip not found');
      return;
    }

    if (clip.type === 'audio' || audioEffects.some(e => e.id === effectId)) {
      try {
        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [`${effectId}_loading`]: true
          }
        }));

        const result = await applyAudioEffect(clipId, effectId, value);

        if (result.success) {
          setTracks(prevTracks =>
            prevTracks.map(track => ({
              ...track,
              clips: track.clips.map(c =>
                c.id === clipId
                  ? {
                    ...c,
                    file_url: result.processed_audio_url,
                    effects: [
                      ...c.effects.filter(e => e.id !== effectId),
                      { id: effectId, value: parseFloat(value), enabled: true }
                    ]
                  }
                  : c
              )
            }))
          );

          console.log(`✅ Applied ${effectId} to audio clip ${clipId} with intensity ${value}%`);
        } else {
          throw new Error(result.error || 'Effect application failed');
        }

        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [effectId]: value,
            [`${effectId}_loading`]: false
          }
        }));

      } catch (error) {
        console.error('Audio effect application error:', error);

        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [`${effectId}_loading`]: false
          }
        }));

        alert(`Failed to apply ${effectId}: ${error.message}`);
        return;
      }
    } else {
      // Video effect
      console.log(`🎬 Applying video effect "${effectId}" to clip ${clipId}`);

      setActiveEffects(prev => ({
        ...prev,
        [clipId]: {
          ...prev[clipId],
          [effectId]: value
        }
      }));

      setTracks(prevTracks => {
        const newTracks = prevTracks.map(track => ({
          ...track,
          clips: track.clips.map(c => {
            if (c.id === clipId) {
              const currentEffects = c.effects || [];
              const newEffects = [
                ...currentEffects.filter(e => e.id !== effectId),
                { id: effectId, value: parseFloat(value), enabled: true }
              ];
              console.log(`🎬 Clip "${c.title}" effects updated:`, newEffects);
              return {
                ...c,
                effects: newEffects
              };
            }
            return c;
          })
        }));
        return newTracks;
      });

      // Update selected clip to show effect immediately
      setSelectedClip(prev => {
        if (prev && prev.id === clipId) {
          const currentEffects = prev.effects || [];
          return {
            ...prev,
            effects: [
              ...currentEffects.filter(e => e.id !== effectId),
              { id: effectId, value: parseFloat(value), enabled: true }
            ]
          };
        }
        return prev;
      });

      console.log(`✅ Applied ${effectId} to video clip ${clipId} with intensity ${value}%`);
    }
  };

  // Enhanced Effect Preview Function
  const previewEffect = async (clipId, effectId, intensity) => {
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip) return;

    if (clip.type === 'audio' || audioEffects.some(e => e.id === effectId)) {
      try {
        const result = await previewAudioEffect(clipId, effectId, intensity);

        if (result.success && result.preview_audio) {
          const audio = new Audio(result.preview_audio);
          audio.play();

          setActiveEffects(prev => ({
            ...prev,
            [clipId]: {
              ...prev[clipId],
              [`${effectId}_preview`]: result.preview_audio
            }
          }));
        }
      } catch (error) {
        console.error('Preview error:', error);
      }
    } else if (clip.cloudinary_public_id) {
      // Video effect preview using Cloudinary (NEW)
      try {
        const previewUrl = await previewVideoEffect(clip.cloudinary_public_id, effectId, intensity);

        // Update preview in program monitor
        setSelectedClip({
          ...clip,
          previewUrl: previewUrl
        });

        console.log(`Previewing ${effectId} on video clip ${clipId}`);
      } catch (error) {
        console.error('Video preview error:', error);
      }
    } else {
      console.log(`Previewing ${effectId} on video clip ${clipId}`);
    }
  };

  // Auto-suggest effects based on audio analysis
  const suggestEffects = async (clipId) => {
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip || clip.type !== 'audio') {
      console.log('Effect suggestions only available for audio clips');
      return [];
    }

    try {
      const analysis = await analyzeAudio(clipId);

      if (analysis.suggested_effects && analysis.suggested_effects.length > 0) {
        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            suggestions: analysis.suggested_effects
          }
        }));

        return analysis.suggested_effects;
      }
    } catch (error) {
      console.error('Effect suggestion error:', error);
      return [];
    }
  };

  // Apply preset effects chain
  const applyPreset = async (clipId, presetName) => {
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip || clip.type !== 'audio') {
      console.log('Audio presets only available for audio clips');
      return;
    }

    try {
      const preset = audioPresets[presetName];

      if (preset) {
        const result = await applyBatchEffects(clipId, preset);

        if (result.success) {
          setTracks(prevTracks =>
            prevTracks.map(track => ({
              ...track,
              clips: track.clips.map(c =>
                c.id === clipId
                  ? {
                    ...c,
                    file_url: result.processed_audio_url,
                    effects: preset.map(effect => ({
                      id: effect.id,
                      value: effect.intensity,
                      enabled: true
                    }))
                  }
                  : c
              )
            }))
          );

          console.log(`✅ Applied ${presetName} preset to clip ${clipId}`);
        }
      }
    } catch (error) {
      console.error('Preset application error:', error);
    }
  };

  // Toggle effect enabled/disabled
  const toggleEffect = (clipId, effectId) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId
            ? {
              ...clip,
              effects: clip.effects.map(effect =>
                effect.id === effectId
                  ? { ...effect, enabled: !effect.enabled }
                  : effect
              )
            }
            : clip
        )
      }))
    );
  };

  // Remove effect
  const removeEffect = (clipId, effectId) => {
    console.log(`🗑️ Removing effect "${effectId}" from clip ${clipId}`);

    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId
            ? {
              ...clip,
              effects: (clip.effects || []).filter(e => e.id !== effectId)
            }
            : clip
        )
      }))
    );

    // Also update selectedClip to keep it in sync
    setSelectedClip(prev => {
      if (prev && prev.id === clipId) {
        return {
          ...prev,
          effects: (prev.effects || []).filter(e => e.id !== effectId)
        };
      }
      return prev;
    });

    console.log(`✅ Effect "${effectId}" removed`);
  };

  // Compositing controls
  const updateCompositing = (clipId, property, value) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId
            ? {
              ...clip,
              compositing: {
                ...clip.compositing,
                [property]: typeof value === 'object' ? { ...clip.compositing[property], ...value } : value
              }
            }
            : clip
        )
      }))
    );
  };

  // Effect drag and drop handlers
  const handleEffectDragStart = (e, effect) => {
    console.log('🎨 Effect drag started:', effect.name);
    setDraggedEffect(effect);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'effect', effect: effect }));
    // Visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleEffectDragEnd = (e) => {
    console.log('🎨 Effect drag ended');
    e.target.style.opacity = '1';
    setDraggedEffect(null);
  };

  const handleEffectDrop = (e, clipId) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎨 Effect drop on clip:', clipId);

    let effectToApply = draggedEffect;

    // Fallback: try to get effect from dataTransfer
    if (!effectToApply) {
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type === 'effect' && data.effect) {
          effectToApply = data.effect;
          console.log('🎨 Got effect from dataTransfer:', effectToApply.name);
        }
      } catch (err) {
        console.log('🎨 No effect data in dataTransfer');
      }
    }

    if (!effectToApply) {
      console.log('🎨 No effect to apply');
      return;
    }

    const targetClip = tracks.flatMap(track => track.clips).find(clip => clip.id === clipId);
    if (targetClip) {
      console.log(`🎨 Applying ${effectToApply.name} to ${targetClip.title}`);
      applyEffect(clipId, effectToApply.id, 50);
      setSelectedClip(targetClip);
      setShowEffectsPanel(true);
    } else {
      console.log('🎨 Target clip not found');
    }

    setDraggedEffect(null);
  };

  const handleEffectDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // Add visual highlight
    e.currentTarget.style.outline = '2px solid #00ffc8';
    e.currentTarget.style.outlineOffset = '-2px';
  };

  const handleEffectDragLeave = (e) => {
    e.currentTarget.style.outline = 'none';
  };

  // Transition functions
  const addTransition = (trackId, transitionType, startTime, duration = 1) => {
    const newTransition = {
      id: Date.now(),
      type: transitionType,
      startTime,
      duration,
      fromClip: null,
      toClip: null
    };

    setTracks(tracks.map(track =>
      track.id === trackId
        ? { ...track, transitions: [...(track.transitions || []), newTransition] }
        : track
    ));

    console.log(`✅ Added ${transitionType} transition at ${startTime.toFixed(2)}s on track ${trackId}`);
  };

  // Add transition between two specific clips
  const addTransitionBetweenClips = (trackId, clip1, clip2, transitionType = 'crossDissolve') => {
    // Get transition data for duration
    const transitionData = transitions.find(t => t.id === transitionType);
    const transitionDuration = transitionData?.duration || 1;
    const transitionName = transitionData?.name || 'Cross Dissolve';

    // Find where clip1 ends and clip2 starts
    const clip1End = clip1.startTime + clip1.duration;

    // Transition should start slightly before clip1 ends
    const transitionStart = clip1End - (transitionDuration / 2);

    const newTransition = {
      id: Date.now(),
      type: transitionType,
      startTime: transitionStart,
      duration: transitionDuration,
      fromClip: clip1.id,
      toClip: clip2.id
    };

    setTracks(tracks.map(track =>
      track.id === trackId
        ? { ...track, transitions: [...(track.transitions || []), newTransition] }
        : track
    ));

    console.log(`✅ Added ${transitionName} between "${clip1.title}" and "${clip2.title}"`);
    alert(`✅ Added "${transitionName}" transition between "${clip1.title}" and "${clip2.title}"!`);
  };

  // Find adjacent clips that can have transitions
  const getAdjacentClipPairs = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.clips.length < 2) return [];

    // Sort clips by start time
    const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
    const pairs = [];

    for (let i = 0; i < sortedClips.length - 1; i++) {
      const clip1 = sortedClips[i];
      const clip2 = sortedClips[i + 1];
      const clip1End = clip1.startTime + clip1.duration;

      // Check if clips are adjacent (within 0.5 seconds)
      if (Math.abs(clip2.startTime - clip1End) < 0.5) {
        pairs.push({ clip1, clip2, position: clip1End });
      }
    }

    return pairs;
  };

  const handleTransitionDragStart = (e, transition) => {
    setDraggedTransition(transition);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTimelineDrop = (e, trackId) => {
    e.preventDefault();
    if (!draggedTransition) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const dropTime = (x / timelineWidth) * duration;

    addTransition(trackId, draggedTransition.id, dropTime, draggedTransition.duration);
    setDraggedTransition(null);
  };

  const handleTimelineDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Track z-index management
  const moveTrackUp = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    const maxZ = Math.max(...tracks.map(t => t.zIndex));
    if (track.zIndex < maxZ) {
      setTracks(tracks.map(t =>
        t.id === trackId ? { ...t, zIndex: t.zIndex + 1 } : t
      ));
    }
  };

  const moveTrackDown = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    const minZ = Math.min(...tracks.map(t => t.zIndex));
    if (track.zIndex > minZ) {
      setTracks(tracks.map(t =>
        t.id === trackId ? { ...t, zIndex: t.zIndex - 1 } : t
      ));
    }
  };

  // Close panels
  const closeEffectsPanel = () => {
    setShowEffectsPanel(false);
    setSelectedClip(null);
    setSelectedTransition(null);
  };

  const closeCompositingPanel = () => {
    setShowCompositingPanel(false);
  };

  // Utility functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * frameRate); // Use selected frame rate

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const getTierIcon = () => {
    switch (userTier) {
      case 'professional': return <Crown size={12} />;
      case 'premium': return <Star size={12} />;
      default: return <Info size={12} />;
    }
  };

  const generateTimeMarkers = () => {
    const markers = [];
    const pixelsPerSecond = 2 * zoom;
    const markerInterval = zoom < 0.5 ? 30 : zoom < 1 ? 10 : zoom < 2 ? 5 : 1;

    for (let i = 0; i <= duration; i += markerInterval) {
      markers.push(
        <div
          key={i}
          className="time-marker-ruler"
          style={{ left: `${i * pixelsPerSecond}px` }}
        >
          <div className="time-marker-line" />
          <div className="time-marker-text">{formatTime(i)}</div>
        </div>
      );
    }
    return markers;
  };

  // Get effects by category
  const getEffectsByCategory = (category, effectsArray) => {
    return effectsArray.filter(effect => effect.category === category);
  };

  // Snap to grid function
  const snapToGrid = (time) => {
    if (!showSnapToGrid) return time;
    return Math.round(time / snapGridSize) * snapGridSize;
  };

  // Collision detection function
  const checkCollisions = (trackId, clipId, newStartTime, clipDuration) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return newStartTime;

    const otherClips = track.clips.filter(c => c.id !== clipId);
    let adjustedStartTime = newStartTime;

    for (const otherClip of otherClips) {
      const otherStart = otherClip.startTime;
      const otherEnd = otherClip.startTime + otherClip.duration;
      const clipEnd = adjustedStartTime + clipDuration;

      if (adjustedStartTime < otherEnd && clipEnd > otherStart) {
        if (adjustedStartTime < otherStart) {
          adjustedStartTime = Math.max(0, otherStart - clipDuration);
        } else {
          adjustedStartTime = otherEnd;
        }
      }
    }
    return Math.max(0, adjustedStartTime);
  };

  // Track lock toggle
  const toggleTrackLock = (trackId) => {
    setTracks(tracks.map(track =>
      track.id === trackId
        ? { ...track, locked: !track.locked }
        : track
    ));
  };

  // Clip drag handlers
  const handleClipMouseDown = (e, clip, trackId) => {
    if (tracks.find(t => t.id === trackId)?.locked) return;

    e.preventDefault();
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clipStartPixel = clip.startTime * 2 * zoom;

    setDraggedClip({ ...clip, trackId, originalTrackId: trackId });
    setDragOffset(clickX - clipStartPixel);
    setSelectedClip(clip);
  };

  const handleMouseMove = (e) => {
    if (!draggedClip || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const timelineWidth = rect.width;

    // Calculate new time position
    let newTime = ((mouseX - dragOffset) / timelineWidth) * duration;
    newTime = snapToGrid(newTime);

    // Determine which track the mouse is over based on Y position
    // Each track is approximately 52px high (6px padding + 40px clip + 6px padding)
    const trackHeight = 52;
    const trackIndex = Math.floor(mouseY / trackHeight);
    const targetTrack = tracks[trackIndex];

    // Only move to compatible track types (video to video, audio to audio)
    let targetTrackId = draggedClip.trackId;
    if (targetTrack && !targetTrack.locked) {
      const originalTrack = tracks.find(t => t.id === draggedClip.originalTrackId);
      // Allow moving between same type tracks (video/overlay to video/overlay, audio to audio)
      if (originalTrack && targetTrack.type === originalTrack.type) {
        targetTrackId = targetTrack.id;
      }
    }

    // Check collisions on target track
    newTime = checkCollisions(targetTrackId, draggedClip.id, newTime, draggedClip.duration);

    // Move clip (possibly to new track)
    if (targetTrackId !== draggedClip.trackId) {
      // Moving to a different track
      setTracks(prevTracks =>
        prevTracks.map(track => {
          if (track.id === draggedClip.trackId) {
            // Remove from original track
            return {
              ...track,
              clips: track.clips.filter(c => c.id !== draggedClip.id)
            };
          } else if (track.id === targetTrackId) {
            // Add to new track
            return {
              ...track,
              clips: [...track.clips, { ...draggedClip, startTime: Math.max(0, newTime) }]
            };
          }
          return track;
        })
      );
      // Update draggedClip's trackId
      setDraggedClip(prev => ({ ...prev, trackId: targetTrackId }));
    } else {
      // Moving within same track
      setTracks(prevTracks =>
        prevTracks.map(track =>
          track.id === draggedClip.trackId
            ? {
              ...track,
              clips: track.clips.map(clip =>
                clip.id === draggedClip.id
                  ? { ...clip, startTime: Math.max(0, newTime) }
                  : clip
              )
            }
            : track
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggedClip(null);
    setDragOffset(0);
  };

  // Handle file import - UPDATED WITH CLOUDINARY UPLOAD
  const handleFileImport = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    for (const file of files) {
      const fileType = file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
          : 'image';

      const tempId = Date.now() + Math.random();

      // Add to library with loading state
      const newMediaItem = {
        id: tempId,
        name: file.name,
        type: fileType,
        duration: fileType === 'image' ? '0:05' : '0:30',
        file: file,
        url: URL.createObjectURL(file),
        uploading: true
      };

      setMediaLibrary(prev => [...prev, newMediaItem]);

      try {
        // Upload to Cloudinary
        const asset = await uploadEditorAsset(file);

        // Update with Cloudinary data
        setMediaLibrary(prev => prev.map(item =>
          item.id === tempId ? {
            ...item,
            id: asset.public_id || tempId,
            cloudinary_public_id: asset.public_id,
            url: asset.url,
            duration: asset.duration
              ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}`
              : (fileType === 'image' ? '0:05' : '0:30'),
            width: asset.width,
            height: asset.height,
            thumbnail: asset.thumbnail,
            uploading: false
          } : item
        ));

        console.log(`✅ Uploaded ${file.name} to Cloudinary: ${asset.public_id}`);

      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        // Mark as failed but keep local URL for preview
        setMediaLibrary(prev => prev.map(item =>
          item.id === tempId ? { ...item, uploading: false, uploadFailed: true } : item
        ));
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  // Handle media item drag from library
  const handleMediaDragStart = (e, mediaItem) => {
    setDraggedMedia(mediaItem);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'media', id: mediaItem.id }));
    // Set drag image
    if (e.target) {
      e.dataTransfer.setDragImage(e.target, 50, 25);
    }
  };

  const handleMediaDragEnd = () => {
    setDraggedMedia(null);
  };

  // Handle media drop on timeline - UPDATED WITH CLOUDINARY DATA
  const handleMediaDrop = (e, trackId) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('📍 Drop detected, draggedMedia:', draggedMedia);

    if (!draggedMedia) {
      console.log('❌ No draggedMedia found');
      return;
    }

    const track = tracks.find(t => t.id === trackId);
    if (!track) {
      console.log('❌ Track not found:', trackId);
      return;
    }
    if (track.locked) {
      console.log('❌ Track is locked');
      return;
    }

    // Calculate drop position using the drop target element
    const dropTarget = e.currentTarget;
    const rect = dropTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerSecond = 2 * zoom;
    const dropTime = Math.max(0, x / pixelsPerSecond);

    // Determine duration
    let durationSeconds = 30;
    if (draggedMedia.duration) {
      const parts = draggedMedia.duration.split(':');
      if (parts.length === 2) {
        durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      } else if (parts.length === 3) {
        durationSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
    }

    if (draggedMedia.type === 'image') {
      durationSeconds = 5;
    }

    // Create new clip WITH CLOUDINARY DATA
    const newClip = {
      id: Date.now(),
      title: draggedMedia.name,
      startTime: snapToGrid(dropTime),
      duration: durationSeconds,
      type: draggedMedia.type,
      mediaUrl: draggedMedia.url,
      cloudinary_public_id: draggedMedia.cloudinary_public_id,
      thumbnail: draggedMedia.thumbnail,
      effects: [],
      keyframes: [],
      compositing: {
        opacity: 100,
        blendMode: 'normal',
        position: { x: 0, y: 0 },
        scale: { x: 100, y: 100 },
        rotation: 0,
        anchor: { x: 50, y: 50 }
      }
    };

    console.log('✅ Creating clip:', newClip);

    // Add clip to track
    setTracks(prevTracks => {
      const updatedTracks = prevTracks.map(t =>
        t.id === trackId
          ? { ...t, clips: [...t.clips, newClip] }
          : t
      );
      console.log('✅ Updated tracks:', updatedTracks);
      return updatedTracks;
    });

    // Set as selected clip to show in program monitor
    setSelectedClip(newClip);

    console.log(`✅ Added ${draggedMedia.name} to ${track.name} at ${newClip.startTime.toFixed(2)}s`);
    if (draggedMedia.cloudinary_public_id) {
      console.log(`   ☁️ Cloudinary ID: ${draggedMedia.cloudinary_public_id}`);
    }

    // Clear drag state
    setDraggedMedia(null);

    // Reset visual feedback
    e.currentTarget.style.background = 'transparent';
  };

  // Delete selected clip
  const deleteClip = (clipId) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId)
      }))
    );

    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }

    console.log(`🗑️ Deleted clip ${clipId}`);
  };

  // EXPORT HANDLER (NEW)
  const handleExport = () => {
    // Check if we have any clips
    const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

    if (totalClips === 0) {
      alert('Please add some media to the timeline before exporting.');
      return;
    }

    // Check if we have Cloudinary clips
    const hasCloudinaryClips = tracks.some(track =>
      track.clips.some(clip => clip.cloudinary_public_id)
    );

    if (!hasCloudinaryClips) {
      alert('Please upload media files first. Local files need to be uploaded to cloud storage before export.');
      return;
    }

    setShowExportModal(true);
  };

  // SAVE PROJECT HANDLER (NEW)
  const handleSaveProject = async () => {
    try {
      const projectData = {
        title: project.title,
        timeline: {
          tracks: tracks.map(track => ({
            id: track.id,
            name: track.name,
            type: track.type,
            clips: track.clips,
            transitions: track.transitions
          }))
        },
        settings: {
          resolution: `${project.resolution.width}x${project.resolution.height}`,
          frameRate: project.frameRate
        }
      };

      const result = await saveProjectToBackend(projectData);

      if (result.success) {
        console.log('✅ Project saved successfully');
        alert('Project saved!');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert(`Failed to save: ${error.message}`);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClip) {
        e.preventDefault();
        deleteClip(selectedClip.id);
      }

      if (e.key === 'Escape') {
        setSelectedClip(null);
        setSelectedTransition(null);
      }

      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }

      // Ctrl+E to export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }

      // Space bar to play/pause
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (isPlayingRef.current) {
          pause();
        } else {
          play();
        }
      }

      // Arrow keys for frame-by-frame navigation
      const frameTime = 1 / frameRate; // Use selected frame rate

      // Left Arrow - Previous frame
      if (e.key === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - frameTime);
        setCurrentTime(newTime);
        console.log(`⏪ Frame back (${frameRate}fps): ${newTime.toFixed(3)}s`);
      }

      // Right Arrow - Next frame
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        const newTime = Math.min(duration, currentTime + frameTime);
        setCurrentTime(newTime);
        console.log(`⏩ Frame forward (${frameRate}fps): ${newTime.toFixed(3)}s`);
      }

      // Shift + Left Arrow - Jump 1 second back
      if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const newTime = Math.max(0, currentTime - 1);
        setCurrentTime(newTime);
        console.log(`⏪ Jump back 1s: ${newTime.toFixed(3)}s`);
      }

      // Shift + Right Arrow - Jump 1 second forward
      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const newTime = Math.min(duration, currentTime + 1);
        setCurrentTime(newTime);
        console.log(`⏩ Jump forward 1s: ${newTime.toFixed(3)}s`);
      }

      // Home key - Go to beginning
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
        console.log(`⏮ Go to start`);
      }

      // End key - Go to end
      if (e.key === 'End') {
        e.preventDefault();
        setCurrentTime(duration);
        console.log(`⏭ Go to end`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClip, selectedTransition, currentTime, duration, frameRate]);

  // Menu bar state
  const [activeMenu, setActiveMenu] = useState(null);
  const menuBarRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Menu definitions
  const menuItems = {
    file: {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+N', action: () => alert('New Project - Coming Soon') },
        { label: 'Open Project', shortcut: 'Ctrl+O', action: () => alert('Open Project - Coming Soon') },
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSaveProject },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => alert('Save As - Coming Soon') },
        { type: 'separator' },
        { label: 'Import Media', shortcut: 'Ctrl+I', action: () => fileInputRef.current?.click() },
        { label: 'Export', shortcut: 'Ctrl+E', action: () => setShowExportModal(true) },
        { type: 'separator' },
        { label: 'Project Settings', action: () => alert('Project Settings - Coming Soon') },
        { label: 'Close Project', action: () => window.history.back() }
      ]
    },
    edit: {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => alert('Undo - Coming Soon') },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => alert('Redo - Coming Soon') },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => selectedClip && deleteClip(selectedClip.id) },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => alert('Copy - Coming Soon') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => alert('Paste - Coming Soon') },
        { label: 'Delete', shortcut: 'Del', action: () => selectedClip && deleteClip(selectedClip.id) },
        { type: 'separator' },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => alert('Select All - Coming Soon') },
        { label: 'Deselect All', shortcut: 'Ctrl+Shift+A', action: () => { setSelectedClip(null); setSelectedTransition(null); } }
      ]
    },
    clip: {
      label: 'Clip',
      items: [
        { label: 'Split Clip', shortcut: 'Ctrl+K', action: () => alert('Split Clip at Playhead - Coming Soon') },
        { label: 'Trim In Point', shortcut: 'Q', action: () => alert('Trim In Point - Coming Soon') },
        { label: 'Trim Out Point', shortcut: 'W', action: () => alert('Trim Out Point - Coming Soon') },
        { type: 'separator' },
        { label: 'Speed/Duration...', action: () => alert('Speed/Duration - Coming Soon') },
        { label: 'Reverse Clip', action: () => alert('Reverse - Coming Soon') },
        { type: 'separator' },
        { label: 'Nest Clip', action: () => alert('Nest - Coming Soon') },
        { label: 'Unlink Audio/Video', action: () => alert('Unlink - Coming Soon') }
      ]
    },
    sequence: {
      label: 'Sequence',
      items: [
        { label: 'Add Tracks...', action: () => alert('Add Tracks - Coming Soon') },
        { label: 'Delete Empty Tracks', action: () => alert('Delete Empty Tracks - Coming Soon') },
        { type: 'separator' },
        { label: 'Apply Default Transition', shortcut: 'Ctrl+D', action: () => alert('Apply Transition - Coming Soon') },
        { label: 'Render In to Out', shortcut: 'Enter', action: () => alert('Render - Coming Soon') },
        { type: 'separator' },
        { label: 'Go to In Point', shortcut: 'Shift+I', action: () => setCurrentTime(0) },
        { label: 'Go to Out Point', shortcut: 'Shift+O', action: () => setCurrentTime(duration) }
      ]
    },
    markers: {
      label: 'Markers',
      items: [
        { label: 'Add Marker', shortcut: 'M', action: () => alert('Add Marker - Coming Soon') },
        { label: 'Go to Next Marker', shortcut: 'Shift+M', action: () => alert('Next Marker - Coming Soon') },
        { label: 'Go to Previous Marker', shortcut: 'Ctrl+Shift+M', action: () => alert('Previous Marker - Coming Soon') },
        { type: 'separator' },
        { label: 'Clear Current Marker', action: () => alert('Clear Marker - Coming Soon') },
        { label: 'Clear All Markers', action: () => alert('Clear All Markers - Coming Soon') }
      ]
    },
    view: {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: '=', action: () => setZoom(Math.min(5, zoom + 0.2)) },
        { label: 'Zoom Out', shortcut: '-', action: () => setZoom(Math.max(0.1, zoom - 0.2)) },
        { label: 'Fit to Window', shortcut: '\\', action: () => setZoom(1) },
        { type: 'separator' },
        { label: 'Show Audio Waveforms', checked: showAudioWaveforms, action: () => setShowAudioWaveforms(!showAudioWaveforms) },
        { label: 'Show Keyframes', checked: showKeyframes, action: () => setShowKeyframes(!showKeyframes) },
        { label: 'Snap to Grid', checked: showSnapToGrid, action: () => setShowSnapToGrid(!showSnapToGrid) },
        { type: 'separator' },
        { label: 'Full Screen Preview', shortcut: '`', action: () => alert('Full Screen - Coming Soon') }
      ]
    },
    window: {
      label: 'Window',
      items: [
        { label: 'Effects Panel', checked: showEffectsPanel, action: () => setShowEffectsPanel(!showEffectsPanel) },
        { label: 'Media Browser', checked: showMediaBrowser, action: () => setShowMediaBrowser(!showMediaBrowser) },
        { label: 'Project Media', checked: showMediaBin, action: () => setShowMediaBin(!showMediaBin) },
        { label: 'Source Monitor', checked: showSourceMonitor, action: () => setShowSourceMonitor(!showSourceMonitor) },
        { type: 'separator' },
        { label: 'Color Grading', checked: showColorGrading, action: () => setShowColorGrading(!showColorGrading) },
        { label: 'Audio Mixer', checked: showAudioMixing, action: () => setShowAudioMixing(!showAudioMixing) }
      ]
    },
    help: {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: () => alert('Keyboard Shortcuts:\n\nSpace - Play/Pause\n← → - Frame step\nShift+← → - 1 second jump\nHome - Go to start\nEnd - Go to end\nDel - Delete selected\nCtrl+S - Save\nCtrl+E - Export\nCtrl+Z - Undo') },
        { label: 'Documentation', action: () => window.open('https://docs.streampirex.com/video-editor', '_blank') },
        { type: 'separator' },
        { label: 'About StreamPireX Editor', action: () => alert('StreamPireX Video Editor\nVersion 1.0.0\n\nProfessional video editing for creators.') }
      ]
    }
  };

  return (
    <div className="video-editor-pro">
      {/* Premiere Pro Style Menu Bar */}
      <div ref={menuBarRef} className="editor-navbar">
        {/* Logo */}
        <div className="nav-logo">
          <Film size={14} />
          <span>SPX</span>
        </div>

        {/* Menu Items */}
        {Object.entries(menuItems).map(([key, menu]) => (
          <div key={key} className="menu-container">
            <button
              className={`menu-button ${activeMenu === key ? 'active' : ''}`}
              onClick={() => setActiveMenu(activeMenu === key ? null : key)}
              onMouseEnter={() => activeMenu && setActiveMenu(key)}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === key && (
              <div className="menu-dropdown">
                {menu.items.map((item, idx) => (
                  item.type === 'separator' ? (
                    <div key={idx} className="menu-separator" />
                  ) : (
                    <button
                      key={idx}
                      className="menu-item"
                      onClick={() => {
                        item.action?.();
                        setActiveMenu(null);
                      }}
                    >
                      <span className="item-label">
                        {item.checked !== undefined && (
                          <span className="checkmark">
                            {item.checked ? '✓' : ''}
                          </span>
                        )}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="item-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Spacer */}
        <div className="nav-spacer" />

        {/* Right side - Project name */}
        <div className="project-title">
          {project.title} - StreamPireX Editor
        </div>
      </div>

      {/* Top Toolbar Bar */}
      <div className="editor-menu-bar" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#1a1a1a',
        borderBottom: '1px solid #333',
        minHeight: '48px',
        gap: '6px',
        flexWrap: 'wrap',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left Section - Project Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{project.title}</h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 6px',
            background: 'linear-gradient(135deg, #ffd700, #ff9500)',
            borderRadius: '8px',
            fontSize: '8px',
            fontWeight: 700,
            color: '#000',
            textTransform: 'uppercase'
          }}>
            {getTierIcon()}
            {userTier}
          </div>
        </div>

        {/* Workspace Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowMediaBin(!showMediaBin)}
            title="Project Media"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              background: showMediaBin ? 'rgba(0, 255, 200, 0.15)' : '#2a2a2a',
              border: `1px solid ${showMediaBin ? '#00ffc8' : '#404040'}`,
              borderRadius: '4px',
              color: showMediaBin ? '#00ffc8' : '#a0a0a0',
              fontSize: '9px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Folder size={11} />
            Project
          </button>
          <button
            onClick={() => setShowMediaBrowser(true)}
            title="Media Browser"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              background: '#2a2a2a',
              border: '1px solid #404040',
              borderRadius: '4px',
              color: '#a0a0a0',
              fontSize: '9px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Folder size={11} />
            Browser
          </button>
          <button
            onClick={() => {
              if (sourceMonitorMedia) {
                setShowSourceMonitor(true);
              }
            }}
            title="Source Monitor"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              background: showSourceMonitor ? 'rgba(0, 255, 200, 0.15)' : '#2a2a2a',
              border: `1px solid ${showSourceMonitor ? '#00ffc8' : '#404040'}`,
              borderRadius: '4px',
              color: showSourceMonitor ? '#00ffc8' : '#a0a0a0',
              fontSize: '9px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Monitor size={11} />
            Source
          </button>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', background: '#252525', borderRadius: '4px' }}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); stop(); }}
            title="Stop & Reset (Home)"
            style={{ width: '26px', height: '26px', border: 'none', borderRadius: '3px', background: 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentTime(Math.max(0, currentTime - 5)); }}
            title="Back 5s (Shift+←)"
            style={{ width: '26px', height: '26px', border: 'none', borderRadius: '3px', background: 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Rewind size={11} />
          </button>
          {/* Frame Back Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const frameTime = 1 / frameRate;
              setCurrentTime(Math.max(0, currentTime - frameTime));
              console.log(`⏪ Frame back (${frameRate}fps)`);
            }}
            title={`Previous Frame (←) - ${frameRate}fps`}
            style={{ width: '26px', height: '26px', border: 'none', borderRadius: '3px', background: 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SkipBack size={11} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); playPause(); }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            style={{ width: '30px', height: '30px', border: 'none', borderRadius: '3px', background: isPlaying ? '#ff6b6b' : '#00ffc8', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          {/* Frame Forward Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const frameTime = 1 / frameRate;
              setCurrentTime(Math.min(duration, currentTime + frameTime));
              console.log(`⏩ Frame forward (${frameRate}fps)`);
            }}
            title={`Next Frame (→) - ${frameRate}fps`}
            style={{ width: '26px', height: '26px', border: 'none', borderRadius: '3px', background: 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SkipForward size={11} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentTime(Math.min(duration, currentTime + 5)); }}
            title="Forward 5s (Shift+→)"
            style={{ width: '26px', height: '26px', border: 'none', borderRadius: '3px', background: 'transparent', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FastForward size={11} />
          </button>
        </div>

        {/* Timecode */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          fontWeight: 600,
          color: '#00ffc8',
          background: '#1a1a1a',
          padding: '5px 8px',
          borderRadius: '3px',
          border: '1px solid #333'
        }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Frame Rate Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select
            value={frameRate}
            onChange={(e) => setFrameRate(parseInt(e.target.value))}
            title="Project Frame Rate"
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '3px',
              color: '#00ffc8',
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 6px',
              cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            <option value={24}>24 fps (Film)</option>
            <option value={25}>25 fps (PAL)</option>
            <option value={30}>30 fps (NTSC)</option>
            <option value={48}>48 fps (HFR)</option>
            <option value={60}>60 fps (Smooth)</option>
          </select>
        </div>

        {/* Spacer to push right section */}
        <div style={{ flex: 1 }} />

        {/* Right Section - Color, Audio, Save, Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setShowColorGrading(!showColorGrading)}
            title="Color Grading"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              background: showColorGrading ? 'rgba(0, 255, 200, 0.15)' : '#2a2a2a',
              border: `1px solid ${showColorGrading ? '#00ffc8' : '#404040'}`,
              borderRadius: '4px',
              color: showColorGrading ? '#00ffc8' : '#a0a0a0',
              fontSize: '9px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Palette size={11} />
            Color
          </button>
          <button
            onClick={() => setShowAudioMixing(!showAudioMixing)}
            title="Audio Mixing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              background: showAudioMixing ? 'rgba(0, 255, 200, 0.15)' : '#2a2a2a',
              border: `1px solid ${showAudioMixing ? '#00ffc8' : '#404040'}`,
              borderRadius: '4px',
              color: showAudioMixing ? '#00ffc8' : '#a0a0a0',
              fontSize: '9px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Volume2 size={11} />
            Audio
          </button>
          <button
            onClick={handleSaveProject}
            title="Save Project (Ctrl+S)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 10px',
              background: '#007aff',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Save size={11} />
            Save
          </button>
          <button
            onClick={handleExport}
            title="Export Video (Ctrl+E)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 10px',
              background: 'linear-gradient(135deg, #00ffc8, #00b894)',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={11} />
            Export
          </button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-main-layout">
        {/* Left Panel - Tools & Effects */}
        <div className="editor-left-panel">
          {/* STICKY IMPORT MEDIA - Always visible at top */}
          <div style={{
            padding: '16px',
            background: '#2d2d30',
            borderBottom: '1px solid #3f3f46',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <button
              className="import-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px 16px',
                background: uploading ? '#333' : 'linear-gradient(135deg, #00ffc8 0%, #00b894 100%)',
                border: 'none',
                borderRadius: '8px',
                color: uploading ? '#888' : '#000',
                fontSize: '14px',
                fontWeight: '700',
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: uploading ? 'none' : '0 4px 12px rgba(0, 255, 200, 0.25)'
              }}
            >
              {uploading ? <Loader size={18} className="spin" /> : <Upload size={18} />}
              {uploading ? 'Uploading...' : '📁 Import Media'}
            </button>

            {/* Media count indicator */}
            {mediaLibrary.length > 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#888',
                textAlign: 'center'
              }}>
                {mediaLibrary.length} file{mediaLibrary.length !== 1 ? 's' : ''} imported
                {mediaLibrary.some(m => m.uploading) && ' • Uploading...'}
              </div>
            )}
          </div>

          <div className="editor-toolbar">
            {/* Tools Section */}
            <div className="toolbar-section">
              <h4>Tools</h4>
              <div className="tool-grid">
                {tools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
                      onClick={() => setSelectedTool(tool.id)}
                      title={tool.name}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Access Panel Buttons */}
            <div className="toolbar-section">
              <h4>Workspaces</h4>
              <div className="workspace-quick-access">
                <button
                  className="workspace-access-btn"
                  onClick={() => setShowCompositingPanel(!showCompositingPanel)}
                >
                  <Layers size={14} />
                  Transform
                </button>
                <button
                  className="workspace-access-btn"
                  onClick={() => setShowEffectsPanel(!showEffectsPanel)}
                >
                  <Wand2 size={14} />
                  Effects
                </button>
              </div>
            </div>

            {/* Video Effects - Organized by Category */}
            <div className="toolbar-section">
              <div
                className="section-header"
                onClick={() => setShowVideoEffects(!showVideoEffects)}
              >
                <h4>Video Effects</h4>
                <button className="dropdown-toggle">
                  {showVideoEffects ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              {showVideoEffects && (
                <div className="effects-organized">
                  {/* Fade Effects - Most Common */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowFadeEffects(!showFadeEffects)}
                      style={{ background: 'rgba(0, 255, 200, 0.1)' }}
                    >
                      <span>⭐ Fade Effects</span>
                      <button className="category-toggle">
                        {showFadeEffects ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showFadeEffects && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('fade', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className={`effect-item ${selectedClip ? 'clickable' : ''}`}
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              onClick={() => {
                                if (selectedClip) {
                                  console.log(`🎨 Click apply ${effect.name} to ${selectedClip.title}`);
                                  applyEffect(selectedClip.id, effect.id, 50);
                                  alert(`✅ Applied "${effect.name}" to "${selectedClip.title}"!\n\nNote: The effect is saved to the clip. It will be applied during export.`);
                                } else {
                                  alert('Please select a clip on the timeline first!');
                                }
                              }}
                              title={selectedClip ? `Click to apply ${effect.name} to "${selectedClip.title}"` : `Select a clip first`}
                              style={{ cursor: selectedClip ? 'pointer' : 'grab' }}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              {selectedClip && <div className="apply-hint" style={{ marginLeft: 'auto', fontSize: '10px', color: '#00ffc8' }}>+ Click</div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Color Correction */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowColorCorrection(!showColorCorrection)}
                    >
                      <span>Color Correction</span>
                      <button className="category-toggle">
                        {showColorCorrection ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showColorCorrection && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('color', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className={`effect-item ${selectedClip ? 'clickable' : ''}`}
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              onClick={() => {
                                if (selectedClip) {
                                  console.log(`🎨 Click apply ${effect.name} to ${selectedClip.title}`);
                                  applyEffect(selectedClip.id, effect.id, 50);
                                } else {
                                  alert('Please select a clip on the timeline first!');
                                }
                              }}
                              title={selectedClip ? `Click to apply ${effect.name} to "${selectedClip.title}"` : `Drag to a clip or select a clip first`}
                              style={{ cursor: selectedClip ? 'pointer' : 'grab' }}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              {selectedClip && <div className="apply-hint" style={{ marginLeft: 'auto', fontSize: '10px', color: '#00ffc8' }}>+ Click</div>}
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Color Grading

                  {/* Color Grading */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowCompositing(!showCompositing)}
                    >
                      <span>Color Grading</span>
                      <button className="category-toggle">
                        {showCompositing ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showCompositing && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('colorGrading', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Blur & Sharpen */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowDistortion(!showDistortion)}
                    >
                      <span>Blur & Sharpen</span>
                      <button className="category-toggle">
                        {showDistortion ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showDistortion && (
                      <div className="effect-list-category">
                        {[...getEffectsByCategory('blur', videoEffects), ...getEffectsByCategory('sharpen', videoEffects)].map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Keying & Masking */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowKeying(!showKeying)}
                    >
                      <span>Keying & Masking</span>
                      <button className="category-toggle">
                        {showKeying ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showKeying && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('keying', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Stylize Effects */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowMotionGraphics(!showMotionGraphics)}
                    >
                      <span>Stylize</span>
                      <button className="category-toggle">
                        {showMotionGraphics ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showMotionGraphics && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('stylize', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Generate Effects */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      onClick={() => setShowGenerator(!showGenerator)}
                    >
                      <span>Generate</span>
                      <button className="category-toggle">
                        {showGenerator ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                    </div>
                    {showGenerator && (
                      <div className="effect-list-category">
                        {getEffectsByCategory('generate', videoEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Audio Effects - Organized by Category */}
            <div className="toolbar-section">
              <div
                className="section-header"
                onClick={() => setShowAudioEffects(!showAudioEffects)}
              >
                <h4>Audio Effects</h4>
                <button className="dropdown-toggle">
                  {showAudioEffects ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              {showAudioEffects && (
                <div className="effects-organized">
                  {['dynamics', 'eq', 'modulation', 'time', 'distortion', 'restoration', 'spatial'].map(category => (
                    <div key={category} className="effect-category">
                      <div className="category-header">
                        <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                      </div>
                      <div className="effect-list-category">
                        {getEffectsByCategory(category, audioEffects).map(effect => {
                          const Icon = effect.icon;
                          return (
                            <div
                              key={effect.id}
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
                              onDragEnd={handleEffectDragEnd}
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="effect-controls">
                                <button
                                  className="preview-btn"
                                  onClick={() => selectedClip && previewEffect(selectedClip.id, effect.id, 50)}
                                  title="Preview Effect"
                                  disabled={!selectedClip || selectedClip.type !== 'audio'}
                                >
                                  <Play size={10} />
                                </button>
                                <button
                                  className="quick-apply-btn"
                                  onClick={() => selectedClip && applyEffect(selectedClip.id, effect.id, 50)}
                                  title="Apply Effect"
                                  disabled={!selectedClip}
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                              <div className="drag-hint">📎</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Transitions */}
            <div className="toolbar-section">
              <div
                className="section-header"
                onClick={() => setShowTransitions(!showTransitions)}
              >
                <h4>Transitions</h4>
                <button className="dropdown-toggle">
                  {showTransitions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              {showTransitions && (
                <div className="transitions-organized">
                  {['basic', 'wipe', 'slide', '3d', 'blur', 'distort', 'light'].map(category => (
                    <div key={category} className="transition-category">
                      <div className="category-header">
                        <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                      </div>
                      <div className="transition-list-category">
                        {transitions.filter(t => t.category === category).map(transition => {
                          const Icon = transition.icon;
                          const isSelected = selectedTransitionType === transition.id;
                          return (
                            <div
                              key={transition.id}
                              className={`transition-item ${isSelected ? 'selected' : ''}`}
                              draggable
                              onDragStart={(e) => handleTransitionDragStart(e, transition)}
                              onClick={() => {
                                setSelectedTransitionType(transition.id);
                                console.log(`🎬 Selected transition: ${transition.name}`);
                              }}
                              title={`Click to select "${transition.name}" - then click + between clips to add`}
                              style={{
                                background: isSelected ? 'rgba(177, 128, 215, 0.3)' : undefined,
                                border: isSelected ? '1px solid #b180d7' : '1px solid transparent',
                                cursor: 'pointer'
                              }}
                            >
                              <div className="transition-icon" style={{ color: isSelected ? '#b180d7' : undefined }}>
                                <Icon size={12} />
                              </div>
                              <div className="transition-info">
                                <div className="transition-name">{transition.name}</div>
                                <div className="transition-duration">{transition.duration}s</div>
                              </div>
                              {isSelected && (
                                <div style={{
                                  marginLeft: 'auto',
                                  fontSize: '10px',
                                  color: '#b180d7',
                                  fontWeight: 600
                                }}>
                                  ✓ Active
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Show currently selected transition */}
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(177, 128, 215, 0.2)',
                    borderRadius: '6px',
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#b180d7'
                  }}>
                    <strong>Selected:</strong> {transitions.find(t => t.id === selectedTransitionType)?.name || 'Cross Dissolve'}
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                      Click the <span style={{ color: '#ff6b6b' }}>red +</span> between clips to add
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Media Library - UPDATED */}
            <div className="toolbar-section">
              <h4>Media</h4>
              <button
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  background: uploading ? '#333' : 'linear-gradient(135deg, #00ffc8 0%, #00b894 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: uploading ? '#888' : '#000',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: uploading ? 'none' : '0 4px 12px rgba(0, 255, 200, 0.25)',
                  marginBottom: '12px'
                }}
              >
                {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading...' : '📁 Import Media'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                accept="video/*,audio/*,image/*"
                multiple
                onChange={handleFileImport}
                style={{ display: 'none' }}
              />
              <div className="media-list">
                {mediaLibrary.map(media => {
                  const Icon = media.type === 'video' ? Video : media.type === 'audio' ? AudioWaveform : Image;
                  return (
                    <div
                      key={media.id}
                      className={`media-item ${media.uploading ? 'uploading' : ''} ${media.uploadFailed ? 'failed' : ''} ${sourceMonitorMedia?.id === media.id ? 'selected' : ''}`}
                      draggable={!media.uploading}
                      onDragStart={(e) => !media.uploading && handleMediaDragStart(e, media)}
                      onDragEnd={handleMediaDragEnd}
                      onClick={(e) => {
                        // Single click = select media
                        if (!media.uploading && e.detail === 1) {
                          setTimeout(() => {
                            if (e.detail === 1) {
                              setSourceMonitorMedia(media);
                            }
                          }, 200);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!media.uploading && !media.uploadFailed) {
                          // Double-click to open Source Monitor
                          setSourceMonitorMedia(media);
                          setShowSourceMonitor(true);
                        }
                      }}
                      style={{ cursor: media.uploading ? 'wait' : 'pointer', position: 'relative' }}
                    >
                      {media.uploading ? (
                        <Loader size={14} className="spin" />
                      ) : (
                        <Icon size={14} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '500' }}>{media.name}</div>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>
                          {media.uploading ? 'Uploading...' : media.uploadFailed ? '⚠️ Failed' : media.duration}
                          {media.cloudinary_public_id && !media.uploading && (
                            <span style={{ color: '#00ffc8', marginLeft: '4px' }}>☁️</span>
                          )}
                        </div>
                      </div>

                      {/* QUICK ADD BUTTON */}
                      {!media.uploading && !media.uploadFailed && (
                        <button
                          className="quick-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            const videoTrack = tracks.find(t => t.type === 'video');
                            const audioTrack = tracks.find(t => t.type === 'audio');
                            const targetTrack = media.type === 'audio' ? audioTrack : videoTrack;

                            if (targetTrack && !targetTrack.locked) {
                              let durationSeconds = 30;
                              if (media.duration) {
                                const parts = media.duration.split(':');
                                durationSeconds = parts.length === 2
                                  ? parseInt(parts[0]) * 60 + parseInt(parts[1])
                                  : 30;
                              }
                              if (media.type === 'image') {
                                durationSeconds = 5;
                              }

                              const lastClipEnd = targetTrack.clips.reduce((max, clip) =>
                                Math.max(max, clip.startTime + clip.duration), 0
                              );

                              const newClip = {
                                id: Date.now(),
                                title: media.name,
                                startTime: lastClipEnd,
                                duration: durationSeconds,
                                type: media.type,
                                mediaUrl: media.url,
                                cloudinary_public_id: media.cloudinary_public_id,
                                thumbnail: media.thumbnail,
                                effects: [],
                                keyframes: [],
                                compositing: {
                                  opacity: 100,
                                  blendMode: 'normal',
                                  position: { x: 0, y: 0 },
                                  scale: { x: 100, y: 100 },
                                  rotation: 0,
                                  anchor: { x: 50, y: 50 }
                                }
                              };

                              setTracks(prevTracks =>
                                prevTracks.map(t =>
                                  t.id === targetTrack.id
                                    ? { ...t, clips: [...t.clips, newClip] }
                                    : t
                                )
                              );

                              setSelectedClip(newClip);
                            }
                          }}
                          title="Add to Timeline"
                          style={{
                            background: '#00ffc8',
                            color: '#000',
                            border: 'none',
                            borderRadius: '3px',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginLeft: 'auto',
                            flexShrink: 0
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div className="editor-center-panel">
          {/* SOURCE MONITOR & PROGRAM MONITOR */}
          <div className="preview-area-container">
            <div className="preview-area" style={{ padding: '10px' }}>
              <div className="preview-container">
                <div style={{
                  height: '32px',
                  background: '#2f2f2f',
                  borderBottom: '1px solid #3a3a3a',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#a7a7a7',
                  borderRadius: '6px 6px 0 0'
                }}>
                  SOURCE MONITOR
                </div>
                <div className="preview-screen">
                  <div className="preview-content">
                    {sourceMonitorMedia ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sourceMonitorMedia.type === 'video' && (
                          <video src={sourceMonitorMedia.url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        )}
                        {sourceMonitorMedia.type === 'audio' && (
                          <div className="audio-preview">
                            <AudioWaveform size={48} />
                            <p>{sourceMonitorMedia.name}</p>
                            <audio src={sourceMonitorMedia.url} controls />
                          </div>
                        )}
                        {sourceMonitorMedia.type === 'image' && (
                          <img src={sourceMonitorMedia.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        )}
                      </div>
                    ) : (
                      <div className="preview-placeholder">
                        <Monitor size={48} />
                        <p>Click media to preview</p>
                        <div className="preview-resolution">No clip selected</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="preview-controls">
                  <button className="preview-control-btn">
                    <ZoomOut size={14} />
                  </button>
                  <div className="zoom-display">Fit</div>
                  <button className="preview-control-btn">
                    <ZoomIn size={14} />
                  </button>
                  <div className="preview-spacer" />

                  {/* ADD TO TIMELINE BUTTON */}
                  {sourceMonitorMedia && (
                    <button
                      className="add-to-timeline-btn"
                      onClick={() => {
                        const videoTrack = tracks.find(t => t.type === 'video');
                        const audioTrack = tracks.find(t => t.type === 'audio');
                        const targetTrack = sourceMonitorMedia.type === 'audio' ? audioTrack : videoTrack;

                        if (targetTrack && !targetTrack.locked) {
                          // Calculate duration from media
                          let durationSeconds = 30;
                          if (sourceMonitorMedia.duration) {
                            const parts = sourceMonitorMedia.duration.split(':');
                            durationSeconds = parts.length === 2
                              ? parseInt(parts[0]) * 60 + parseInt(parts[1])
                              : 30;
                          }
                          if (sourceMonitorMedia.type === 'image') {
                            durationSeconds = 5;
                          }

                          // Find the end of existing clips to place new one
                          const lastClipEnd = targetTrack.clips.reduce((max, clip) =>
                            Math.max(max, clip.startTime + clip.duration), 0
                          );

                          const newClip = {
                            id: Date.now(),
                            title: sourceMonitorMedia.name,
                            startTime: lastClipEnd,
                            duration: durationSeconds,
                            type: sourceMonitorMedia.type,
                            mediaUrl: sourceMonitorMedia.url,
                            cloudinary_public_id: sourceMonitorMedia.cloudinary_public_id,
                            thumbnail: sourceMonitorMedia.thumbnail,
                            effects: [],
                            keyframes: [],
                            compositing: {
                              opacity: 100,
                              blendMode: 'normal',
                              position: { x: 0, y: 0 },
                              scale: { x: 100, y: 100 },
                              rotation: 0,
                              anchor: { x: 50, y: 50 }
                            }
                          };

                          setTracks(prevTracks =>
                            prevTracks.map(t =>
                              t.id === targetTrack.id
                                ? { ...t, clips: [...t.clips, newClip] }
                                : t
                            )
                          );

                          setSelectedClip(newClip);
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #00ffc8, #00b894)',
                        color: '#000',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '10px'
                      }}
                    >
                      <Plus size={14} />
                      Add to Timeline
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PROGRAM MONITOR */}
            <div className="preview-area" style={{ padding: '10px' }}>
              <div className="preview-container">
                <div style={{
                  height: '32px',
                  background: '#2f2f2f',
                  borderBottom: '1px solid #3a3a3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white',
                  borderRadius: '6px 6px 0 0'
                }}>
                  <span>PROGRAM MONITOR</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setProgramMonitorMuted(!programMonitorMuted)}
                      title={programMonitorMuted ? 'Unmute Audio' : 'Mute Audio'}
                      style={{
                        background: programMonitorMuted ? '#ff6b6b' : '#00ffc8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        color: programMonitorMuted ? '#fff' : '#000'
                      }}
                    >
                      {programMonitorMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      {programMonitorMuted ? 'Muted' : 'Sound On'}
                    </button>
                    <span style={{ fontSize: '10px', color: '#888' }}>
                      {formatTime(currentTime)}
                    </span>
                  </div>
                </div>
                <div className="preview-screen">
                  <div className="preview-content">
                    {(() => {
                      // Check for active transition first
                      const activeTransition = tracks.flatMap(track =>
                        (track.transitions || []).map(t => ({ ...t, trackId: track.id }))
                      ).find(transition =>
                        currentTime >= transition.startTime &&
                        currentTime < (transition.startTime + transition.duration)
                      );

                      // If there's an active transition, render both clips
                      if (activeTransition) {
                        const track = tracks.find(t => t.id === activeTransition.trackId);
                        const sortedClips = [...(track?.clips || [])].sort((a, b) => a.startTime - b.startTime);

                        // Find the two clips involved in the transition
                        let fromClip = null;
                        let toClip = null;

                        for (let i = 0; i < sortedClips.length - 1; i++) {
                          const clip1End = sortedClips[i].startTime + sortedClips[i].duration;
                          if (Math.abs(clip1End - (activeTransition.startTime + activeTransition.duration / 2)) < 1) {
                            fromClip = sortedClips[i];
                            toClip = sortedClips[i + 1];
                            break;
                          }
                        }

                        if (fromClip && toClip) {
                          const transitionProgress = (currentTime - activeTransition.startTime) / activeTransition.duration;
                          const fromOpacity = 1 - transitionProgress;
                          const toOpacity = transitionProgress;

                          return (
                            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                              {/* Outgoing clip */}
                              {fromClip.type === 'video' && (
                                <video
                                  src={fromClip.previewUrl || fromClip.mediaUrl}
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    opacity: fromOpacity
                                  }}
                                  muted={programMonitorMuted}
                                />
                              )}
                              {fromClip.type === 'image' && (
                                <img
                                  src={fromClip.previewUrl || fromClip.mediaUrl}
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    opacity: fromOpacity
                                  }}
                                  alt="from"
                                />
                              )}

                              {/* Incoming clip */}
                              {toClip.type === 'video' && (
                                <video
                                  src={toClip.previewUrl || toClip.mediaUrl}
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    opacity: toOpacity
                                  }}
                                  muted={programMonitorMuted}
                                />
                              )}
                              {toClip.type === 'image' && (
                                <img
                                  src={toClip.previewUrl || toClip.mediaUrl}
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    opacity: toOpacity
                                  }}
                                  alt="to"
                                />
                              )}

                              {/* Transition Info */}
                              <div style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                background: 'rgba(255, 107, 107, 0.9)',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#fff',
                                fontWeight: 600
                              }}>
                                🔄 Cross Dissolve: {Math.round(transitionProgress * 100)}%
                              </div>
                            </div>
                          );
                        }
                      }

                      // Find the clip at current playhead position
                      const activeClip = tracks
                        .flatMap(track => track.clips.map(clip => ({ ...clip, trackType: track.type })))
                        .find(clip => {
                          const clipEnd = clip.startTime + clip.duration;
                          return currentTime >= clip.startTime && currentTime < clipEnd;
                        });

                      if (activeClip && (activeClip.mediaUrl || activeClip.previewUrl)) {
                        // Calculate the time offset within the clip
                        const clipOffset = currentTime - activeClip.startTime;
                        const clipProgress = clipOffset / activeClip.duration; // 0 to 1

                        // Debug: Log clip effects
                        if (activeClip.effects && activeClip.effects.length > 0) {
                          console.log(`🎬 Active clip "${activeClip.title}" has effects:`, activeClip.effects, `Progress: ${(clipProgress * 100).toFixed(1)}%`);
                        }

                        // Build CSS filters from effects
                        const buildCssFilters = (effects) => {
                          if (!effects || effects.length === 0) return 'none';

                          const filters = effects.map(effect => {
                            const value = effect.value || 50;
                            switch (effect.id) {
                              case 'brightness': return `brightness(${0.5 + (value / 100)})`;
                              case 'contrast': return `contrast(${0.5 + (value / 100)})`;
                              case 'saturation': return `saturate(${value / 50})`;
                              case 'hue': return `hue-rotate(${(value / 100) * 360}deg)`;
                              case 'blur': return `blur(${value / 10}px)`;
                              case 'grayscale': return `grayscale(${value}%)`;
                              case 'sepia': return `sepia(${value}%)`;
                              case 'invert': return `invert(${value}%)`;
                              default: return '';
                            }
                          }).filter(f => f).join(' ');

                          return filters || 'none';
                        };

                        // Calculate fade overlay opacity
                        const getFadeOverlay = (effects, progress) => {
                          if (!effects || effects.length === 0) return null;

                          const fadeDuration = 0.3; // 30% of clip for fade (more visible)

                          // Check for crossDissolve first (applies at both start AND end)
                          const hasCrossDissolve = effects.some(e => e.id === 'crossDissolve');
                          if (hasCrossDissolve) {
                            if (progress < fadeDuration) {
                              const opacity = 1 - (progress / fadeDuration);
                              console.log(`🎬 Cross Dissolve (In): opacity ${opacity.toFixed(2)}`);
                              return { color: 'black', opacity };
                            }
                            if (progress > (1 - fadeDuration)) {
                              const opacity = (progress - (1 - fadeDuration)) / fadeDuration;
                              console.log(`🎬 Cross Dissolve (Out): opacity ${opacity.toFixed(2)}`);
                              return { color: 'black', opacity };
                            }
                          }

                          for (const effect of effects) {
                            if (effect.id === 'fadeIn') {
                              if (progress < fadeDuration) {
                                const opacity = 1 - (progress / fadeDuration);
                                console.log(`🎬 Fade In: opacity ${opacity.toFixed(2)}`);
                                return { color: 'black', opacity };
                              }
                            }
                            if (effect.id === 'fadeOut') {
                              if (progress > (1 - fadeDuration)) {
                                const opacity = (progress - (1 - fadeDuration)) / fadeDuration;
                                console.log(`🎬 Fade Out: opacity ${opacity.toFixed(2)}`);
                                return { color: 'black', opacity };
                              }
                            }
                            if (effect.id === 'fadeInWhite') {
                              if (progress < fadeDuration) {
                                const opacity = 1 - (progress / fadeDuration);
                                console.log(`🎬 Fade In White: opacity ${opacity.toFixed(2)}`);
                                return { color: 'white', opacity };
                              }
                            }
                            if (effect.id === 'fadeOutWhite') {
                              if (progress > (1 - fadeDuration)) {
                                const opacity = (progress - (1 - fadeDuration)) / fadeDuration;
                                console.log(`🎬 Fade Out White: opacity ${opacity.toFixed(2)}`);
                                return { color: 'white', opacity };
                              }
                            }
                          }
                          return null;
                        };

                        const cssFilters = buildCssFilters(activeClip.effects);
                        const fadeOverlay = getFadeOverlay(activeClip.effects, clipProgress);

                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#000' }}>
                            {activeClip.type === 'video' && (
                              <video
                                key={activeClip.id}
                                src={activeClip.previewUrl || activeClip.mediaUrl}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  filter: cssFilters
                                }}
                                autoPlay={isPlaying}
                                muted={programMonitorMuted}
                                loop={false}
                                ref={(el) => {
                                  if (el) {
                                    // Sync video time with timeline
                                    const targetTime = Math.min(clipOffset, el.duration || activeClip.duration);
                                    if (Math.abs(el.currentTime - targetTime) > 0.5) {
                                      el.currentTime = targetTime;
                                    }
                                    // Sync play/pause state
                                    if (isPlaying && el.paused) {
                                      el.play().catch(() => { });
                                    } else if (!isPlaying && !el.paused) {
                                      el.pause();
                                    }
                                  }
                                }}
                              />
                            )}
                            {activeClip.type === 'image' && (
                              <img
                                src={activeClip.previewUrl || activeClip.mediaUrl}
                                alt="preview"
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'contain',
                                  filter: cssFilters
                                }}
                              />
                            )}
                            {activeClip.type === 'audio' && (
                              <div className="audio-preview" style={{ textAlign: 'center' }}>
                                <AudioWaveform size={48} style={{ color: '#ff6b6b' }} />
                                <p style={{ marginTop: '10px' }}>{activeClip.title}</p>
                              </div>
                            )}

                            {/* Fade Overlay */}
                            {fadeOverlay && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: fadeOverlay.color,
                                opacity: fadeOverlay.opacity,
                                pointerEvents: 'none',
                                transition: 'opacity 0.05s linear'
                              }} />
                            )}

                            {/* Clip Info Overlay */}
                            <div style={{
                              position: 'absolute',
                              bottom: '10px',
                              left: '10px',
                              background: 'rgba(0,0,0,0.7)',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {activeClip.title}
                                {activeClip.cloudinary_public_id && (
                                  <span style={{ color: '#00ffc8', marginLeft: '6px' }}>☁️</span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                Clip: {formatTime(clipOffset)} / {formatTime(activeClip.duration)}
                              </div>
                              {activeClip.effects && activeClip.effects.length > 0 && (
                                <div style={{ fontSize: '9px', color: '#00ffc8', marginTop: '4px' }}>
                                  Effects: {activeClip.effects.map(e => e.id).join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="preview-placeholder">
                          <Monitor size={48} />
                          <p>Program Monitor</p>
                          <div className="preview-resolution">1920 x 1080 • 30fps</div>
                          <div style={{ fontSize: '10px', marginTop: '10px', color: '#666' }}>
                            No clip at playhead position
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="preview-controls">
                  <button className="preview-control-btn">
                    <ZoomOut size={14} />
                  </button>
                  <div className="zoom-display">Fit</div>
                  <button className="preview-control-btn">
                    <ZoomIn size={14} />
                  </button>
                  <div className="preview-spacer" />
                  <button className="preview-control-btn">
                    <Grid size={14} />
                  </button>
                  <button className="preview-control-btn" title="Safe Areas">
                    <Target size={14} />
                  </button>
                  <button className="preview-control-btn">
                    <Settings size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="d-flex">
            {showMediaBrowser && (
              <MediaBrowser
                onFileSelect={(file) => {
                  setMediaLibrary(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.id === file.id || m.cloudinary_public_id === file.cloudinary_public_id)) {
                      return prev;
                    }
                    return [...prev, file];
                  });
                  setSourceMonitorMedia(file);
                  setShowSourceMonitor(true);
                  setShowMediaBrowser(false);
                }}
                onClose={() => setShowMediaBrowser(false)}
                onUploadComplete={(asset) => {
                  console.log('Upload complete:', asset);
                }}
              />
            )}

            {showSourceMonitor && sourceMonitorMedia && (
              <SourceMonitor
                selectedMedia={sourceMonitorMedia}
                onAddToTimeline={(media, inPoint, outPoint, insertType = 'both') => {
                  const videoTrack = tracks.find(t => t.type === 'video');
                  const audioTrack = tracks.find(t => t.type === 'audio');

                  // Calculate duration from in/out points
                  const clipDuration = Math.max(1, outPoint - inPoint);

                  // Find where to insert (at end of existing clips)
                  const getLastClipEnd = (track) => {
                    if (!track || !track.clips || track.clips.length === 0) return 0;
                    return Math.max(...track.clips.map(c => c.startTime + c.duration));
                  };

                  // Insert Video
                  if ((insertType === 'video' || insertType === 'both') && media.type !== 'audio') {
                    if (videoTrack && !videoTrack.locked) {
                      const videoClip = {
                        id: Date.now(),
                        title: media.name,
                        startTime: getLastClipEnd(videoTrack),
                        duration: clipDuration || 30,
                        type: 'video',
                        mediaUrl: media.url,
                        cloudinary_public_id: media.cloudinary_public_id,
                        thumbnail: media.thumbnail,
                        inPoint: parseFloat(inPoint) || 0,
                        outPoint: parseFloat(outPoint) || clipDuration,
                        effects: [],
                        keyframes: [],
                        compositing: {
                          opacity: 100,
                          blendMode: 'normal',
                          position: { x: 0, y: 0 },
                          scale: { x: 100, y: 100 },
                          rotation: 0,
                          anchor: { x: 50, y: 50 }
                        }
                      };

                      setTracks(prevTracks =>
                        prevTracks.map(t =>
                          t.id === videoTrack.id
                            ? { ...t, clips: [...t.clips, videoClip] }
                            : t
                        )
                      );
                      setSelectedClip(videoClip);
                    }
                  }

                  // Insert Audio (from video or audio file)
                  if ((insertType === 'audio' || insertType === 'both') &&
                    (media.type === 'video' || media.type === 'audio')) {
                    if (audioTrack && !audioTrack.locked) {
                      const audioClip = {
                        id: Date.now() + 1,
                        title: `${media.name} (Audio)`,
                        startTime: getLastClipEnd(audioTrack),
                        duration: clipDuration || 30,
                        type: 'audio',
                        mediaUrl: media.url,
                        cloudinary_public_id: media.cloudinary_public_id,
                        inPoint: parseFloat(inPoint) || 0,
                        outPoint: parseFloat(outPoint) || clipDuration,
                        effects: [],
                        keyframes: [],
                        compositing: {
                          opacity: 100
                        }
                      };

                      setTracks(prevTracks =>
                        prevTracks.map(t =>
                          t.id === audioTrack.id
                            ? { ...t, clips: [...t.clips, audioClip] }
                            : t
                        )
                      );
                    }
                  }

                  console.log(`✅ Added ${media.name} to timeline (${insertType})`);
                  setShowSourceMonitor(false);
                }}
                onClose={() => setShowSourceMonitor(false)}
              />
            )}

            {/* ========================================
                MEDIA BIN / PROJECT PANEL - Like Premiere Pro
                ======================================== */}
            {showMediaBin && (
              <div className="media-bin-panel" style={{
                background: '#1e1e1e',
                borderTop: '1px solid #3f3f46',
                minHeight: '180px',
                maxHeight: '280px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Media Bin Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#252830',
                  borderBottom: '1px solid #3f3f46'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Folder size={14} style={{ color: '#00ffc8' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#e0e0e0' }}>Project Media</span>
                    <span style={{ fontSize: '10px', color: '#888' }}>({mediaLibrary.length} items)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Search */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#2a2a2a',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      border: '1px solid #3f3f46'
                    }}>
                      <Filter size={12} style={{ color: '#888' }} />
                      <input
                        type="text"
                        placeholder="Search media..."
                        value={mediaSearchTerm}
                        onChange={(e) => setMediaSearchTerm(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#e0e0e0',
                          fontSize: '11px',
                          width: '120px'
                        }}
                      />
                    </div>
                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        onClick={() => setMediaBinView('grid')}
                        style={{
                          padding: '4px 8px',
                          background: mediaBinView === 'grid' ? '#00ffc8' : '#2a2a2a',
                          color: mediaBinView === 'grid' ? '#000' : '#888',
                          border: 'none',
                          borderRadius: '3px 0 0 3px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Grid size={12} />
                      </button>
                      <button
                        onClick={() => setMediaBinView('list')}
                        style={{
                          padding: '4px 8px',
                          background: mediaBinView === 'list' ? '#00ffc8' : '#2a2a2a',
                          color: mediaBinView === 'list' ? '#000' : '#888',
                          border: 'none',
                          borderRadius: '0 3px 3px 0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <List size={12} />
                      </button>
                    </div>
                    {/* Import Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        background: 'linear-gradient(135deg, #00ffc8, #00b894)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={12} />
                      Import
                    </button>
                    {/* Close Button */}
                    <button
                      onClick={() => setShowMediaBin(false)}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        color: '#888',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Media Bin Content */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '12px'
                }}>
                  {mediaLibrary.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#666',
                      gap: '12px'
                    }}>
                      <Folder size={40} style={{ opacity: 0.5 }} />
                      <p style={{ fontSize: '12px', margin: 0 }}>No media imported yet</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #00ffc8, #00b894)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Import Media Files
                      </button>
                    </div>
                  ) : mediaBinView === 'grid' ? (
                    /* GRID VIEW */
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '10px'
                    }}>
                      {mediaLibrary
                        .filter(m => m.name.toLowerCase().includes(mediaSearchTerm.toLowerCase()))
                        .map(media => {
                          const Icon = media.type === 'video' ? Video : media.type === 'audio' ? AudioWaveform : Image;
                          return (
                            <div
                              key={media.id}
                              draggable={!media.uploading}
                              onDragStart={(e) => !media.uploading && handleMediaDragStart(e, media)}
                              onDragEnd={handleMediaDragEnd}
                              onClick={(e) => {
                                // Single click = select media (show in source preview area, not popup)
                                if (e.detail === 1) {
                                  // Use timeout to check if it's actually a single click
                                  setTimeout(() => {
                                    if (e.detail === 1) {
                                      setSourceMonitorMedia(media);
                                    }
                                  }, 200);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!media.uploading) {
                                  // Double click = open Source Monitor popup for editing
                                  setSourceMonitorMedia(media);
                                  setShowSourceMonitor(true);
                                }
                              }}
                              className="media-grid-item"
                              style={{
                                background: sourceMonitorMedia?.id === media.id ? '#3a3d45' : '#2a2a2a',
                                border: `1px solid ${sourceMonitorMedia?.id === media.id ? '#00ffc8' : '#3f3f46'}`,
                                borderRadius: '6px',
                                overflow: 'hidden',
                                cursor: media.uploading ? 'wait' : 'grab',
                                transition: 'all 0.15s ease',
                                opacity: media.uploading ? 0.6 : 1,
                                position: 'relative'
                              }}
                            >
                              {/* Thumbnail */}
                              <div style={{
                                width: '100%',
                                height: '60px',
                                background: '#1a1a1a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                              }}>
                                {media.thumbnail ? (
                                  <img src={media.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Icon size={24} style={{ color: media.type === 'video' ? '#4a9eff' : media.type === 'audio' ? '#ff6b6b' : '#00d4aa' }} />
                                )}
                                {/* Type Badge */}
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  background: media.type === 'video' ? '#4a9eff' : media.type === 'audio' ? '#ff6b6b' : '#00d4aa',
                                  color: '#000',
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  padding: '2px 4px',
                                  borderRadius: '2px',
                                  textTransform: 'uppercase'
                                }}>
                                  {media.type}
                                </div>
                                {/* Duration Badge */}
                                {media.duration && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '4px',
                                    right: '4px',
                                    background: 'rgba(0,0,0,0.7)',
                                    color: '#fff',
                                    fontSize: '9px',
                                    padding: '2px 4px',
                                    borderRadius: '2px'
                                  }}>
                                    {media.duration}
                                  </div>
                                )}
                                {/* Uploading Indicator */}
                                {media.uploading && (
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Loader size={20} className="spin" style={{ color: '#00ffc8' }} />
                                  </div>
                                )}
                                {/* Quick Add Button - appears on hover */}
                                {!media.uploading && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const videoTrack = tracks.find(t => t.type === 'video');
                                      const audioTrack = tracks.find(t => t.type === 'audio');
                                      const targetTrack = media.type === 'audio' ? audioTrack : videoTrack;

                                      if (targetTrack && !targetTrack.locked) {
                                        let durationSeconds = 30;
                                        if (media.duration) {
                                          const parts = media.duration.split(':');
                                          durationSeconds = parts.length === 2
                                            ? parseInt(parts[0]) * 60 + parseInt(parts[1])
                                            : 30;
                                        }
                                        if (media.type === 'image') durationSeconds = 5;

                                        const lastClipEnd = targetTrack.clips.reduce((max, clip) =>
                                          Math.max(max, clip.startTime + clip.duration), 0
                                        );

                                        const newClip = {
                                          id: Date.now(),
                                          title: media.name,
                                          startTime: lastClipEnd,
                                          duration: durationSeconds,
                                          type: media.type,
                                          mediaUrl: media.url,
                                          cloudinary_public_id: media.cloudinary_public_id,
                                          thumbnail: media.thumbnail,
                                          effects: [],
                                          keyframes: [],
                                          compositing: {
                                            opacity: 100,
                                            blendMode: 'normal',
                                            position: { x: 0, y: 0 },
                                            scale: { x: 100, y: 100 },
                                            rotation: 0,
                                            anchor: { x: 50, y: 50 }
                                          }
                                        };

                                        setTracks(prevTracks =>
                                          prevTracks.map(t =>
                                            t.id === targetTrack.id
                                              ? { ...t, clips: [...t.clips, newClip] }
                                              : t
                                          )
                                        );
                                        setSelectedClip(newClip);
                                      }
                                    }}
                                    title="Quick Add to Timeline"
                                    style={{
                                      position: 'absolute',
                                      bottom: '4px',
                                      left: '4px',
                                      width: '22px',
                                      height: '22px',
                                      background: '#00ffc8',
                                      color: '#000',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      opacity: 0,
                                      transition: 'opacity 0.15s ease',
                                      zIndex: 5
                                    }}
                                    className="media-bin-quick-add"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                              </div>
                              {/* File Name */}
                              <div style={{
                                padding: '6px 8px',
                                fontSize: '10px',
                                color: '#e0e0e0',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {media.name}
                                {media.cloudinary_public_id && (
                                  <span style={{ color: '#00ffc8', marginLeft: '4px' }}>☁️</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    /* LIST VIEW */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* List Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 80px 80px 60px',
                        gap: '8px',
                        padding: '6px 8px',
                        background: '#252830',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#888',
                        textTransform: 'uppercase'
                      }}>
                        <span></span>
                        <span>Name</span>
                        <span>Type</span>
                        <span>Duration</span>
                        <span>Status</span>
                      </div>
                      {mediaLibrary
                        .filter(m => m.name.toLowerCase().includes(mediaSearchTerm.toLowerCase()))
                        .map(media => {
                          const Icon = media.type === 'video' ? Video : media.type === 'audio' ? AudioWaveform : Image;
                          return (
                            <div
                              key={media.id}
                              draggable={!media.uploading}
                              onDragStart={(e) => !media.uploading && handleMediaDragStart(e, media)}
                              onDragEnd={handleMediaDragEnd}
                              onClick={(e) => {
                                if (e.detail === 1) {
                                  setTimeout(() => {
                                    if (e.detail === 1) {
                                      setSourceMonitorMedia(media);
                                    }
                                  }, 200);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                if (!media.uploading) {
                                  setSourceMonitorMedia(media);
                                  setShowSourceMonitor(true);
                                }
                              }}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '40px 1fr 80px 80px 60px',
                                gap: '8px',
                                padding: '6px 8px',
                                background: sourceMonitorMedia?.id === media.id ? '#3a3d45' : '#2a2a2a',
                                border: `1px solid ${sourceMonitorMedia?.id === media.id ? '#00ffc8' : 'transparent'}`,
                                borderRadius: '4px',
                                fontSize: '11px',
                                color: '#e0e0e0',
                                cursor: media.uploading ? 'wait' : 'grab',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{
                                width: '32px',
                                height: '24px',
                                background: '#1a1a1a',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {media.thumbnail ? (
                                  <img src={media.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '3px' }} />
                                ) : (
                                  <Icon size={14} style={{ color: media.type === 'video' ? '#4a9eff' : media.type === 'audio' ? '#ff6b6b' : '#00d4aa' }} />
                                )}
                              </div>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {media.name}
                                {media.cloudinary_public_id && <span style={{ color: '#00ffc8', marginLeft: '4px' }}>☁️</span>}
                              </span>
                              <span style={{
                                color: media.type === 'video' ? '#4a9eff' : media.type === 'audio' ? '#ff6b6b' : '#00d4aa',
                                textTransform: 'capitalize'
                              }}>
                                {media.type}
                              </span>
                              <span>{media.duration || '—'}</span>
                              <span style={{ color: media.uploading ? '#ff9500' : '#00ffc8' }}>
                                {media.uploading ? 'Uploading...' : 'Ready'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="editor-timeline-section">
              {/* Timeline Controls */}
              <div className="timeline-controls-bar">
                <div className="timeline-zoom-controls">
                  <button className="zoom-btn" onClick={() => setZoom(Math.max(0.1, zoom - 0.2))}>
                    <ZoomOut size={12} />
                  </button>
                  <div className="zoom-slider-container">
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="zoom-slider-pro"
                    />
                  </div>
                  <button className="zoom-btn" onClick={() => setZoom(Math.min(5, zoom + 0.2))}>
                    <ZoomIn size={12} />
                  </button>
                  <div className="zoom-display-pro">{Math.round(zoom * 100)}%</div>
                </div>
                <div className="timeline-options">
                  <button
                    className={`timeline-option-btn ${showSnapToGrid ? 'active' : ''}`}
                    onClick={() => setShowSnapToGrid(!showSnapToGrid)}
                  >
                    <Grid size={12} />
                    Snap ({snapGridSize}s)
                  </button>
                  <select
                    value={snapGridSize}
                    onChange={(e) => setSnapGridSize(parseInt(e.target.value))}
                    className="snap-grid-select"
                  >
                    <option value={1}>1s</option>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                  </select>
                  <button
                    className={`timeline-option-btn ${showAudioWaveforms ? 'active' : ''}`}
                    onClick={() => setShowAudioWaveforms(!showAudioWaveforms)}
                  >
                    <AudioWaveform size={12} />
                    Waveforms
                  </button>
                  <button
                    className={`timeline-option-btn ${showKeyframes ? 'active' : ''}`}
                    onClick={() => setShowKeyframes(!showKeyframes)}
                  >
                    <Activity size={12} />
                    Keyframes
                  </button>
                </div>
              </div>

              {/* Timeline Main */}
              <div className="timeline-main-container">
                {/* Ruler */}
                <div className="timeline-ruler-container">
                  <div className="track-headers-spacer" style={{ background: '#252830', width: '280px', minWidth: '280px' }} />
                  <div className="timeline-ruler-scroll">
                    <div
                      className="timeline-ruler"
                      style={{ width: `${duration * 2 * zoom}px` }}
                    >
                      {generateTimeMarkers()}
                    </div>
                  </div>
                </div>

                {/* Tracks */}
                <div className="timeline-tracks-container">
                  <div className="track-headers-column" style={{ background: '#252830' }}>
                    {tracks.sort((a, b) => b.zIndex - a.zIndex).map(track => (
                      <div key={track.id} className="track-header-container" style={{
                        height: '52px',
                        borderBottom: '1px solid #3f3f46',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        background: '#252830'
                      }}>
                        <div className="track-controls-left" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          background: 'transparent'
                        }}>
                          <div className="track-label-container" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 1
                          }}>
                            <div className="track-type-icon-container" style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <div className="track-type-icon" style={{
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#3a3d45',
                                borderRadius: '4px',
                                color: '#00ffc8'
                              }}>
                                {track.type === 'video' ? <Video size={14} /> : <AudioWaveform size={14} />}
                              </div>
                              <button
                                className={`track-lock-btn ${track.locked ? 'locked' : ''}`}
                                onClick={() => toggleTrackLock(track.id)}
                                title={track.locked ? 'Unlock Track' : 'Lock Track'}
                              >
                                {track.locked ? <Lock size={10} /> : <Unlock size={10} />}
                              </button>
                            </div>
                            <div className="track-info" style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              <div className="track-name-label" style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#e0e0e0'
                              }}>{track.name}</div>
                              <div className="track-z-index" style={{
                                fontSize: '9px',
                                color: '#888',
                                textTransform: 'uppercase'
                              }}>Layer {track.zIndex}</div>
                            </div>
                          </div>
                          <div className="track-control-buttons" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: 'auto'
                          }}>
                            <button
                              className="track-layer-btn"
                              onClick={() => moveTrackUp(track.id)}
                              title="Move layer up"
                              style={{
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#3a3d45',
                                border: 'none',
                                borderRadius: '3px',
                                color: '#888',
                                cursor: 'pointer'
                              }}
                            >
                              <ChevronUp size={10} />
                            </button>
                            <button
                              className="track-layer-btn"
                              onClick={() => moveTrackDown(track.id)}
                              title="Move layer down"
                              style={{
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#3a3d45',
                                border: 'none',
                                borderRadius: '3px',
                                color: '#888',
                                cursor: 'pointer'
                              }}
                            >
                              <ChevronDown size={10} />
                            </button>
                            <button
                              className={`track-toggle-btn ${track.muted ? '' : 'active'}`}
                              onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t))}
                              style={{
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: track.muted ? '#3a3d45' : 'rgba(0, 255, 200, 0.2)',
                                border: 'none',
                                borderRadius: '4px',
                                color: track.muted ? '#888' : '#00ffc8',
                                cursor: 'pointer'
                              }}
                            >
                              {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                            </button>
                            <button
                              className={`track-toggle-btn ${track.visible ? 'active' : ''}`}
                              onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, visible: !t.visible } : t))}
                              style={{
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: track.visible ? 'rgba(0, 255, 200, 0.2)' : '#3a3d45',
                                border: 'none',
                                borderRadius: '4px',
                                color: track.visible ? '#00ffc8' : '#888',
                                cursor: 'pointer'
                              }}
                            >
                              {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button
                              className={`track-toggle-btn ${track.locked ? 'active' : ''}`}
                              onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, locked: !t.locked } : t))}
                              style={{
                                width: '26px',
                                height: '26px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: track.locked ? 'rgba(255, 107, 107, 0.2)' : '#3a3d45',
                                border: 'none',
                                borderRadius: '4px',
                                color: track.locked ? '#ff6b6b' : '#888',
                                cursor: 'pointer'
                              }}
                            >
                              {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="timeline-tracks-scroll">
                    <div
                      className="timeline-tracks-content"
                      style={{ width: `${duration * 2 * zoom}px` }}
                      ref={timelineRef}
                      onClick={handleTimelineClick}
                    >
                      {/* Playhead */}
                      <div
                        className="timeline-playhead"
                        style={{ left: `${currentTime * 2 * zoom}px` }}
                      />

                      {/* Track Rows */}
                      {tracks.sort((a, b) => b.zIndex - a.zIndex).map((track, index) => (
                        <div key={track.id} className="timeline-track-row" style={{
                          height: '52px',
                          borderBottom: '1px solid #3f3f46',
                          position: 'relative',
                          background: '#1e2127'
                        }}>
                          <div
                            className="track-timeline-area"
                            style={{
                              height: '100%',
                              position: 'relative',
                              cursor: 'crosshair'
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.background = 'transparent';

                              console.log('🎯 Drop event on track:', track.id, track.name);
                              console.log('   draggedTransition:', draggedTransition);
                              console.log('   draggedMedia:', draggedMedia);

                              if (draggedTransition) {
                                handleTimelineDrop(e, track.id);
                              } else if (draggedMedia) {
                                handleMediaDrop(e, track.id);
                              } else {
                                // Try to get from dataTransfer as backup
                                try {
                                  const data = e.dataTransfer.getData('text/plain');
                                  console.log('   dataTransfer data:', data);
                                  if (data) {
                                    const parsed = JSON.parse(data);
                                    if (parsed.type === 'media' && parsed.id) {
                                      const media = mediaLibrary.find(m => m.id === parsed.id);
                                      if (media) {
                                        console.log('   Found media from dataTransfer:', media.name);
                                        // Manually add the clip
                                        const dropTarget = e.currentTarget;
                                        const rect = dropTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const pixelsPerSecond = 2 * zoom;
                                        const dropTime = Math.max(0, x / pixelsPerSecond);

                                        let durationSeconds = 30;
                                        if (media.duration) {
                                          const parts = media.duration.split(':');
                                          if (parts.length === 2) {
                                            durationSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                                          }
                                        }
                                        if (media.type === 'image') durationSeconds = 5;

                                        const newClip = {
                                          id: Date.now(),
                                          title: media.name,
                                          startTime: snapToGrid(dropTime),
                                          duration: durationSeconds,
                                          type: media.type,
                                          mediaUrl: media.url,
                                          cloudinary_public_id: media.cloudinary_public_id,
                                          thumbnail: media.thumbnail,
                                          effects: [],
                                          keyframes: [],
                                          compositing: {
                                            opacity: 100,
                                            blendMode: 'normal',
                                            position: { x: 0, y: 0 },
                                            scale: { x: 100, y: 100 },
                                            rotation: 0,
                                            anchor: { x: 50, y: 50 }
                                          }
                                        };

                                        setTracks(prevTracks =>
                                          prevTracks.map(t =>
                                            t.id === track.id
                                              ? { ...t, clips: [...t.clips, newClip] }
                                              : t
                                          )
                                        );
                                        setSelectedClip(newClip);
                                        console.log('✅ Added clip via dataTransfer backup');
                                      }
                                    }
                                  }
                                } catch (err) {
                                  console.log('   Could not parse dataTransfer:', err);
                                }
                              }
                            }}
                            onDragOver={handleTimelineDragOver}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = 'rgba(0, 255, 200, 0.1)';
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {track.clips.length === 0 ? (
                              <div className="empty-track-message">
                                Drop media here
                              </div>
                            ) : (
                              <>
                                {track.clips.map(clip => {
                                  const leftPosition = clip.startTime * 2 * zoom;
                                  const width = clip.duration * 2 * zoom;
                                  return (
                                    <div
                                      key={clip.id}
                                      className={`timeline-clip ${selectedClip?.id === clip.id ? 'selected' : ''} ${track.locked ? 'locked' : ''}`}
                                      style={{
                                        left: `${leftPosition}px`,
                                        width: `${width}px`,
                                        backgroundColor: track.color,
                                        opacity: clip.compositing?.opacity ? clip.compositing.opacity / 100 : 1,
                                        cursor: track.locked ? 'not-allowed' : 'grab'
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClip(clip);
                                        setSelectedTransition(null);
                                      }}
                                      onMouseDown={(e) => handleClipMouseDown(e, clip, track.id)}
                                      onDrop={(e) => { handleEffectDrop(e, clip.id); e.currentTarget.style.outline = 'none'; }}
                                      onDragOver={handleEffectDragOver}
                                      onDragLeave={handleEffectDragLeave}
                                    >
                                      <div className="clip-content-timeline">
                                        <div className="clip-title-timeline">
                                          {clip.title}
                                          {clip.cloudinary_public_id && (
                                            <span style={{ marginLeft: '4px', fontSize: '10px' }}>☁️</span>
                                          )}
                                        </div>
                                        <div className="clip-compositing-info">
                                          {clip.compositing?.blendMode && clip.compositing.blendMode !== 'normal' && (
                                            <span className="blend-mode-indicator">
                                              {clip.compositing.blendMode}
                                            </span>
                                          )}
                                          {clip.effects && clip.effects.length > 0 && (
                                            <div className="clip-effects-indicator">
                                              <Sparkles size={10} />
                                              {clip.effects.length}
                                            </div>
                                          )}
                                        </div>
                                        {track.type === 'audio' && showAudioWaveforms && (
                                          <div className="audio-waveform">
                                            <AudioWaveform size={12} />
                                          </div>
                                        )}
                                        {showKeyframes && clip.keyframes && clip.keyframes.length > 0 && (
                                          <div className="keyframe-indicators">
                                            {clip.keyframes.map((kf, idx) => (
                                              <div
                                                key={idx}
                                                className="keyframe-diamond"
                                                style={{ left: `${(kf.time / clip.duration) * 100}%` }}
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add Transition Buttons between adjacent clips */}
                                {(() => {
                                  const pairs = getAdjacentClipPairs(track.id);
                                  return pairs.map((pair, idx) => {
                                    const leftPosition = pair.position * 2 * zoom - 12; // Center the button
                                    // Check if there's already a transition at this position
                                    const existingTransition = (track.transitions || []).find(t =>
                                      Math.abs(t.startTime - (pair.position - 0.5)) < 1
                                    );
                                    if (existingTransition) return null;

                                    const selectedTransData = transitions.find(t => t.id === selectedTransitionType);

                                    return (
                                      <div
                                        key={`trans-btn-${idx}`}
                                        className="add-transition-btn"
                                        style={{
                                          position: 'absolute',
                                          left: `${leftPosition}px`,
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          width: '24px',
                                          height: '24px',
                                          background: 'linear-gradient(135deg, #b180d7, #9b59b6)',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: 'pointer',
                                          zIndex: 10,
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                          border: '2px solid #fff',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const transData = transitions.find(t => t.id === selectedTransitionType);
                                          addTransitionBetweenClips(track.id, pair.clip1, pair.clip2, selectedTransitionType);
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.2)';
                                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(177, 128, 215, 0.5)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                                        }}
                                        title={`Add "${selectedTransData?.name || 'Cross Dissolve'}" between "${pair.clip1.title}" and "${pair.clip2.title}"`}
                                      >
                                        <Plus size={14} color="#fff" />
                                      </div>
                                    );
                                  });
                                })()}

                                {/* Render Transitions */}
                                {(track.transitions || []).map(transition => {
                                  const transitionData = transitions.find(t => t.id === transition.type);
                                  const Icon = transitionData?.icon || Layers;
                                  const leftPosition = transition.startTime * 2 * zoom;
                                  const width = transition.duration * 2 * zoom;
                                  return (
                                    <div
                                      key={transition.id}
                                      className={`timeline-transition ${selectedTransition?.id === transition.id ? 'selected' : ''}`}
                                      style={{
                                        left: `${leftPosition}px`,
                                        width: `${width}px`
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTransition(transition);
                                        setSelectedClip(null);
                                      }}
                                    >
                                      <div className="transition-content">
                                        <Icon size={10} />
                                        <span className="transition-label">{transitionData?.name}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Effects Panel */}
      {showEffectsPanel && (
        <div className="effects-panel-enhanced">
          <div className="effects-panel-header">
            <h4>
              {selectedClip
                ? `Effects Stack - ${selectedClip.title}`
                : selectedTransition
                  ? 'Transition Properties'
                  : 'Effects Panel'
              }
            </h4>
            <button onClick={closeEffectsPanel} className="close-panel-btn">
              <X size={14} />
            </button>
          </div>

          {selectedClip ? (
            <div className="effects-panel-content-enhanced">
              {/* Effects Stack */}
              <div className="effects-stack">
                <div className="stack-header">
                  <h5>Effects Stack ({selectedClip.effects?.length || 0})</h5>
                  <div className="stack-controls">
                    <button className="stack-btn" title="Reset All">
                      <RefreshCw size={12} />
                    </button>
                    <button className="stack-btn" title="Copy Effects">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                {selectedClip.effects && selectedClip.effects.length > 0 ? (
                  <div className="applied-effects-list">
                    {selectedClip.effects.map((appliedEffect, index) => {
                      const effectData = effects.find(e => e.id === appliedEffect.id);
                      return (
                        <div key={appliedEffect.id} className="applied-effect-item-enhanced">
                          <div className="effect-item-header">
                            <div className="effect-info-left">
                              <button
                                className={`effect-toggle ${appliedEffect.enabled ? 'enabled' : 'disabled'}`}
                                onClick={() => toggleEffect(selectedClip.id, appliedEffect.id)}
                                title={appliedEffect.enabled ? 'Disable Effect' : 'Enable Effect'}
                              >
                                {appliedEffect.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                              </button>
                              <div className="effect-details">
                                <span className="effect-name">{effectData?.name || appliedEffect.id}</span>
                                <span className="effect-category">{effectData?.category || 'Unknown'}</span>
                              </div>
                            </div>
                            <div className="effect-controls-right">
                              <span className="effect-value">{appliedEffect.value}%</span>
                              <button
                                className="effect-remove"
                                onClick={() => removeEffect(selectedClip.id, appliedEffect.id)}
                                title="Remove Effect"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="effect-parameters">
                            <div className="parameter-row">
                              <label>Intensity</label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={appliedEffect.value}
                                onChange={(e) => applyEffect(selectedClip.id, appliedEffect.id, e.target.value)}
                                className="effect-slider-enhanced"
                                disabled={!appliedEffect.enabled}
                              />
                            </div>

                            {/* Specific effect parameters */}
                            {effectData?.category === 'colorGrading' && (
                              <>
                                <div className="parameter-row">
                                  <label>Highlights</label>
                                  <input type="range" min="-100" max="100" defaultValue="0" className="effect-slider-enhanced" />
                                </div>
                                <div className="parameter-row">
                                  <label>Shadows</label>
                                  <input type="range" min="-100" max="100" defaultValue="0" className="effect-slider-enhanced" />
                                </div>
                                <div className="parameter-row">
                                  <label>Midtones</label>
                                  <input type="range" min="-100" max="100" defaultValue="0" className="effect-slider-enhanced" />
                                </div>
                              </>
                            )}

                            {effectData?.category === 'blur' && (
                              <>
                                <div className="parameter-row">
                                  <label>Blur Radius</label>
                                  <input type="range" min="0" max="50" defaultValue="5" className="effect-slider-enhanced" />
                                </div>
                                <div className="parameter-row">
                                  <label>Quality</label>
                                  <select className="effect-select">
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                  </select>
                                </div>
                              </>
                            )}

                            {effectData?.category === 'keying' && (
                              <>
                                <div className="parameter-row">
                                  <label>Key Color</label>
                                  <input type="color" defaultValue="#00ff00" className="color-picker" />
                                </div>
                                <div className="parameter-row">
                                  <label>Tolerance</label>
                                  <input type="range" min="0" max="100" defaultValue="20" className="effect-slider-enhanced" />
                                </div>
                                <div className="parameter-row">
                                  <label>Edge Feather</label>
                                  <input type="range" min="0" max="50" defaultValue="5" className="effect-slider-enhanced" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-effects-message">
                    <Wand2 size={24} />
                    <p>No effects applied</p>
                    <span>Drag effects from the left panel</span>
                  </div>
                )}
              </div>

              {/* Quick Apply Effects */}
              <div className="quick-apply-section">
                <h5>Quick Apply</h5>
                <div className="quick-effects-grid-enhanced">
                  {effects.filter(effect =>
                    selectedClip.type === 'video' ? videoEffects.includes(effect) : audioEffects.includes(effect)
                  ).slice(0, 8).map(effect => {
                    const Icon = effect.icon;
                    return (
                      <button
                        key={effect.id}
                        className="quick-effect-btn-enhanced"
                        onClick={() => applyEffect(selectedClip.id, effect.id, 50)}
                        title={effect.description}
                      >
                        <Icon size={14} />
                        <span>{effect.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets */}
              <div className="presets-section">
                <h5>Effect Presets</h5>
                <div className="preset-list">
                  {selectedClip && selectedClip.type === 'audio' ? (
                    <>
                      {Object.keys(audioPresets).map(presetName => (
                        <button
                          key={presetName}
                          className="preset-btn"
                          onClick={() => applyPreset(selectedClip.id, presetName)}
                        >
                          <Sparkles size={12} />
                          {presetName.charAt(0).toUpperCase() + presetName.slice(1)} Style
                        </button>
                      ))}

                      {/* Auto-suggest button */}
                      <button
                        className="preset-btn suggest-btn"
                        onClick={() => suggestEffects(selectedClip.id)}
                      >
                        <Wand2 size={12} />
                        Auto-Suggest Effects
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="preset-btn">
                        <Sparkles size={12} />
                        Cinema Look
                      </button>
                      <button className="preset-btn">
                        <Sun size={12} />
                        Warm & Bright
                      </button>
                      <button className="preset-btn">
                        <Palette size={12} />
                        Vintage Film
                      </button>
                      <button className="preset-btn">
                        <Contrast size={12} />
                        High Contrast
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : selectedTransition ? (
            <div className="effects-panel-content-enhanced">
              <div className="transition-properties">
                <h5>Transition Properties</h5>
                <div className="parameter-row">
                  <label>Duration: {selectedTransition.duration}s</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    defaultValue={selectedTransition.duration}
                    onChange={(e) => {
                      setTracks(tracks.map(track => ({
                        ...track,
                        transitions: (track.transitions || []).map(t =>
                          t.id === selectedTransition.id
                            ? { ...t, duration: parseFloat(e.target.value) }
                            : t
                        )
                      })));
                    }}
                    className="effect-slider-enhanced"
                  />
                </div>
                <div className="parameter-row">
                  <label>Ease In</label>
                  <input type="range" min="0" max="100" defaultValue="50" className="effect-slider-enhanced" />
                </div>
                <div className="parameter-row">
                  <label>Ease Out</label>
                  <input type="range" min="0" max="100" defaultValue="50" className="effect-slider-enhanced" />
                </div>
                <div className="parameter-row">
                  <label>Alignment</label>
                  <select className="effect-select">
                    <option>Center at Cut</option>
                    <option>Start at Cut</option>
                    <option>End at Cut</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection-message-enhanced">
              <div className="no-selection-icon">
                <Layers size={48} />
              </div>
              <h3>Select a Clip or Transition</h3>
              <p>Click on timeline elements to view and edit their effects</p>
              <div className="selection-help">
                <div className="help-item">
                  <Video size={16} />
                  <span>Video clips support visual effects</span>
                </div>
                <div className="help-item">
                  <AudioWaveform size={16} />
                  <span>Audio clips support audio processing</span>
                </div>
                <div className="help-item">
                  <Wand2 size={16} />
                  <span>Drag effects onto clips to apply</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compositing Panel */}
      {showCompositingPanel && (
        <div className="compositing-panel-enhanced">
          <div className="compositing-panel-header">
            <h4>Transform & Compositing</h4>
            <button onClick={closeCompositingPanel} className="close-panel-btn">
              <X size={14} />
            </button>
          </div>

          {selectedClip && selectedClip.type === 'video' ? (
            <div className="compositing-panel-content-enhanced">
              {/* Transform Controls */}
              <div className="compositing-section">
                <h5>Transform</h5>
                <div className="transform-grid">
                  <div className="transform-group">
                    <label>Position</label>
                    <div className="dual-control">
                      <div className="control-pair">
                        <span>X</span>
                        <input
                          type="number"
                          value={selectedClip.compositing?.position?.x || 0}
                          onChange={(e) => updateCompositing(selectedClip.id, 'position', { x: parseInt(e.target.value) })}
                          className="numeric-input"
                        />
                      </div>
                      <div className="control-pair">
                        <span>Y</span>
                        <input
                          type="number"
                          value={selectedClip.compositing?.position?.y || 0}
                          onChange={(e) => updateCompositing(selectedClip.id, 'position', { y: parseInt(e.target.value) })}
                          className="numeric-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="transform-group">
                    <label>Scale</label>
                    <div className="dual-control">
                      <div className="control-pair">
                        <span>W</span>
                        <input
                          type="number"
                          value={selectedClip.compositing?.scale?.x || 100}
                          onChange={(e) => updateCompositing(selectedClip.id, 'scale', { x: parseInt(e.target.value) })}
                          className="numeric-input"
                        />
                      </div>
                      <div className="control-pair">
                        <span>H</span>
                        <input
                          type="number"
                          value={selectedClip.compositing?.scale?.y || 100}
                          onChange={(e) => updateCompositing(selectedClip.id, 'scale', { y: parseInt(e.target.value) })}
                          className="numeric-input"
                        />
                      </div>
                    </div>
                    <button className="lock-aspect-btn" title="Lock Aspect Ratio">
                      <Lock size={10} />
                    </button>
                  </div>

                  <div className="transform-group">
                    <label>Rotation</label>
                    <div className="rotation-control">
                      <input
                        type="number"
                        value={selectedClip.compositing?.rotation || 0}
                        onChange={(e) => updateCompositing(selectedClip.id, 'rotation', parseInt(e.target.value))}
                        className="numeric-input"
                      />
                      <span>°</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blending */}
              <div className="compositing-section">
                <h5>Opacity & Blending</h5>
                <div className="blend-controls">
                  <div className="parameter-row">
                    <label>Opacity: {selectedClip.compositing?.opacity || 100}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedClip.compositing?.opacity || 100}
                      onChange={(e) => updateCompositing(selectedClip.id, 'opacity', parseInt(e.target.value))}
                      className="compositing-slider-enhanced"
                    />
                  </div>
                  <div className="parameter-row">
                    <label>Blend Mode</label>
                    <select
                      value={selectedClip.compositing?.blendMode || 'normal'}
                      onChange={(e) => updateCompositing(selectedClip.id, 'blendMode', e.target.value)}
                      className="blend-mode-select-enhanced"
                    >
                      <optgroup label="Normal">
                        <option value="normal">Normal</option>
                        <option value="dissolve">Dissolve</option>
                      </optgroup>
                      <optgroup label="Darken">
                        <option value="darken">Darken</option>
                        <option value="multiply">Multiply</option>
                        <option value="color-burn">Color Burn</option>
                        <option value="linear-burn">Linear Burn</option>
                      </optgroup>
                      <optgroup label="Lighten">
                        <option value="lighten">Lighten</option>
                        <option value="screen">Screen</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="linear-dodge">Linear Dodge</option>
                      </optgroup>
                      <optgroup label="Overlay">
                        <option value="overlay">Overlay</option>
                        <option value="soft-light">Soft Light</option>
                        <option value="hard-light">Hard Light</option>
                        <option value="vivid-light">Vivid Light</option>
                        <option value="linear-light">Linear Light</option>
                        <option value="pin-light">Pin Light</option>
                        <option value="hard-mix">Hard Mix</option>
                      </optgroup>
                      <optgroup label="Difference">
                        <option value="difference">Difference</option>
                        <option value="exclusion">Exclusion</option>
                        <option value="subtract">Subtract</option>
                        <option value="divide">Divide</option>
                      </optgroup>
                      <optgroup label="Color">
                        <option value="hue">Hue</option>
                        <option value="saturation">Saturation</option>
                        <option value="color">Color</option>
                        <option value="luminosity">Luminosity</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Controls */}
              <div className="compositing-section">
                <h5>Advanced</h5>
                <div className="advanced-controls">
                  <div className="parameter-row">
                    <label>Motion Blur</label>
                    <input type="range" min="0" max="100" defaultValue="0" className="compositing-slider-enhanced" />
                  </div>
                  <div className="parameter-row">
                    <label>3D Rotation X</label>
                    <input type="range" min="-180" max="180" defaultValue="0" className="compositing-slider-enhanced" />
                  </div>
                  <div className="parameter-row">
                    <label>3D Rotation Y</label>
                    <input type="range" min="-180" max="180" defaultValue="0" className="compositing-slider-enhanced" />
                  </div>
                  <div className="parameter-row">
                    <label>Perspective</label>
                    <input type="range" min="0" max="200" defaultValue="100" className="compositing-slider-enhanced" />
                  </div>
                </div>
              </div>

              {/* Transform Presets */}
              <div className="compositing-section">
                <h5>Transform Presets</h5>
                <div className="preset-grid">
                  <button
                    className="preset-transform-btn"
                    onClick={() => {
                      updateCompositing(selectedClip.id, 'scale', { x: 25, y: 25 });
                      updateCompositing(selectedClip.id, 'position', { x: 600, y: -300 });
                    }}
                  >
                    <Minimize2 size={12} />
                    Picture in Picture
                  </button>
                  <button
                    className="preset-transform-btn"
                    onClick={() => {
                      updateCompositing(selectedClip.id, 'scale', { x: 150, y: 150 });
                      updateCompositing(selectedClip.id, 'position', { x: 0, y: 0 });
                    }}
                  >
                    <ZoomIn size={12} />
                    Zoom In
                  </button>
                  <button
                    className="preset-transform-btn"
                    onClick={() => {
                      updateCompositing(selectedClip.id, 'position', { x: -960, y: 0 });
                    }}
                  >
                    <ArrowLeftRight size={12} />
                    Split Screen L
                  </button>
                  <button
                    className="preset-transform-btn"
                    onClick={() => {
                      updateCompositing(selectedClip.id, 'position', { x: 960, y: 0 });
                    }}
                  >
                    <ArrowLeftRight size={12} />
                    Split Screen R
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-video-clip-message-enhanced">
              <div className="no-clip-icon">
                <Video size={48} />
              </div>
              <h3>Select a Video Clip</h3>
              <p>Transform and compositing controls are available for video clips only</p>
              <div className="compositing-features">
                <div className="feature-item">
                  <Move size={16} />
                  <span>Position & Scale</span>
                </div>
                <div className="feature-item">
                  <RotateCw size={16} />
                  <span>Rotation & 3D Transform</span>
                </div>
                <div className="feature-item">
                  <Layers size={16} />
                  <span>Blend Modes & Opacity</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color Grading Workspace */}
      {showColorGrading && (
        <div className="color-workspace">
          <div className="color-workspace-header">
            <h4>Color Grading Workspace</h4>
            <button onClick={() => setShowColorGrading(false)} className="close-panel-btn">
              <X size={14} />
            </button>
          </div>
          <div className="color-tools">
            <div className="color-wheels">
              <div className="color-wheel-section">
                <h5>Shadows</h5>
                <div className="color-wheel shadows-wheel"></div>
                <div className="wheel-controls">
                  <input type="range" min="-100" max="100" defaultValue="0" />
                </div>
              </div>
              <div className="color-wheel-section">
                <h5>Midtones</h5>
                <div className="color-wheel midtones-wheel"></div>
                <div className="wheel-controls">
                  <input type="range" min="-100" max="100" defaultValue="0" />
                </div>
              </div>
              <div className="color-wheel-section">
                <h5>Highlights</h5>
                <div className="color-wheel highlights-wheel"></div>
                <div className="wheel-controls">
                  <input type="range" min="-100" max="100" defaultValue="0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Mixing Workspace */}
      {showAudioMixing && (
        <div className="audio-workspace">
          <div className="audio-workspace-header">
            <h4>Audio Mixing Console</h4>
            <button onClick={() => setShowAudioMixing(false)} className="close-panel-btn">
              <X size={14} />
            </button>
          </div>

          <div className="mixing-console">
            {tracks.filter(t => t.type === 'audio' || t.clips.some(c => c.type === 'audio')).map(track => (
              <div key={track.id} className="mixer-channel">
                <div className="channel-header">
                  <span>{track.name}</span>
                </div>
                <div className="channel-controls">
                  <div className="eq-controls">
                    <div className="eq-band">
                      <label>High</label>
                      <input type="range" min="-24" max="24" defaultValue="0" className="eq-slider" />
                    </div>
                    <div className="eq-band">
                      <label>Mid</label>
                      <input type="range" min="-24" max="24" defaultValue="0" className="eq-slider" />
                    </div>
                    <div className="eq-band">
                      <label>Low</label>
                      <input type="range" min="-24" max="24" defaultValue="0" className="eq-slider" />
                    </div>
                  </div>
                  <div className="channel-fader">
                    <input
                      type="range"
                      min="-60"
                      max="12"
                      defaultValue="0"
                      className="volume-fader"
                      orient="vertical"
                    />
                    <div className="fader-label">0dB</div>
                  </div>
                  <div className="level-meter">
                    <div className="meter-bar"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Modal (NEW) */}
      {showExportModal && (
        <ExportModal
          project={project}
          tracks={tracks}
          frameRate={frameRate}
          onClose={() => setShowExportModal(false)}
          onExportComplete={(result) => {
            console.log('Export completed:', result);
          }}
        />
      )}
    </div>
  );
};

export default VideoEditorComponent;