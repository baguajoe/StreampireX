import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, RotateCcw, Download, Upload, Volume2, VolumeX, 
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, Scissors, Copy, Move, Settings, 
  Music, Video, AudioWaveform, Share2, Save, FileVideo, FileAudio, Youtube, 
  Instagram, Facebook, Twitter, ChevronDown, ChevronUp, Layers, Zap, Filter, 
  Palette, Tv, AlertTriangle, Crown, Star, Bolt, Info, MousePointer, Hand, 
  Type, Square as RectangleTool, Circle, Pen, Eraser, Crop, RotateCw, FlipHorizontal,
  ZoomIn, ZoomOut, Grid, Minimize2, Maximize2, MoreVertical, X
} from 'lucide-react';

// Import the CSS file - make sure this path matches your CSS file location
import '../../styles/VideoEditorComponent.css';

const VideoEditorComponent = () => {
  // State management
  const [project, setProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTool, setSelectedTool] = useState('select');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 minutes for demo
  const [zoom, setZoom] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  // User tier and limits
  const [userTier, setUserTier] = useState('free');
  const [userLimits, setUserLimits] = useState(null);
  const [userUsage, setUserUsage] = useState(null);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);

  // Layout state
  const [leftPanelWidth, setLeftPanelWidth] = useState(240);
  const [timelineHeight, setTimelineHeight] = useState(300);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  // API Base URL
  const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

  // Tool definitions
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Selection Tool', shortcut: 'V' },
    { id: 'razor', icon: Scissors, name: 'Razor Tool', shortcut: 'C' },
    { id: 'hand', icon: Hand, name: 'Hand Tool', shortcut: 'H' },
    { id: 'text', icon: Type, name: 'Text Tool', shortcut: 'T' },
    { id: 'rectangle', icon: RectangleTool, name: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: Circle, name: 'Ellipse', shortcut: 'E' },
    { id: 'pen', icon: Pen, name: 'Pen Tool', shortcut: 'P' }
  ];

  // Tier configurations
  const tierConfig = {
    free: {
      name: 'Free',
      color: '#6c757d',
      icon: Info,
      features: ['Basic editing', '720p export', 'MP4 format only', '2 video tracks']
    },
    basic: {
      name: 'Basic',
      color: '#17a2b8',
      icon: Star,
      features: ['HD editing', '1080p export', 'Multiple formats', '8 video tracks']
    },
    premium: {
      name: 'Premium',
      color: '#28a745',
      icon: Crown,
      features: ['4K editing', 'Professional effects', 'Unlimited tracks', 'Multi-platform export']
    },
    professional: {
      name: 'Professional',
      color: '#ffc107',
      icon: Bolt,
      features: ['8K editing', 'Advanced codecs', 'Team collaboration', 'Priority support']
    }
  };

  // Platform export options with tier restrictions
  const platforms = [
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: Youtube, 
      minTier: 'free',
      formats: ['mp4'], 
      maxSize: '128GB', 
      maxDuration: '12h', 
      requirements: '1080p recommended' 
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      minTier: 'basic',
      formats: ['mp4', 'mov'], 
      maxSize: '4GB', 
      maxDuration: '60s (Reels)', 
      requirements: '1080x1920 (Stories), 1080x1080 (Posts)' 
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: Tv, 
      minTier: 'basic',
      formats: ['mp4', 'mov'], 
      maxSize: '287.6MB', 
      maxDuration: '10m', 
      requirements: '1080x1920, 30fps' 
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: Facebook, 
      minTier: 'basic',
      formats: ['mp4', 'mov'], 
      maxSize: '4GB', 
      maxDuration: '4h', 
      requirements: '1080p recommended' 
    },
    { 
      id: 'twitter', 
      name: 'Twitter/X', 
      icon: Twitter, 
      minTier: 'premium',
      formats: ['mp4'], 
      maxSize: '512MB', 
      maxDuration: '2m20s', 
      requirements: '1920x1080 max' 
    }
  ];

  // Initialize project and load user limits
  useEffect(() => {
    initializeProject();
    loadUserLimits();
    loadMediaLibrary();
    loadAvailablePlans();
  }, []);

  const loadUserLimits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/user/video-editor/limits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTier(data.user_tier);
        setUserLimits(data.limits);
        setUserUsage(data.usage);
      } else {
        // Fallback data for demo
        setUserLimits({
          max_projects: 3,
          max_tracks_per_project: 2,
          video_clip_max_size: 500 * 1024 * 1024, // 500MB
          project_total_max_size: 2 * 1024 * 1024 * 1024, // 2GB
          max_export_quality: '720p'
        });
        setUserUsage({
          current_projects: 1,
          current_total_size: 250 * 1024 * 1024 // 250MB
        });
      }
    } catch (error) {
      console.error('Failed to load user limits:', error);
      // Fallback data
      setUserLimits({
        max_projects: 3,
        max_tracks_per_project: 2,
        video_clip_max_size: 500 * 1024 * 1024,
        project_total_max_size: 2 * 1024 * 1024 * 1024,
        max_export_quality: '720p'
      });
      setUserUsage({
        current_projects: 1,
        current_total_size: 250 * 1024 * 1024
      });
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/video-editor/plans`);
      if (response.ok) {
        const data = await response.json();
        setAvailablePlans(data.plans || [
          { id: 1, name: 'Basic', price_monthly: 9.99 },
          { id: 2, name: 'Premium', price_monthly: 19.99 },
          { id: 3, name: 'Professional', price_monthly: 39.99 }
        ]);
      }
    } catch (error) {
      console.error('Failed to load available plans:', error);
      setAvailablePlans([
        { id: 1, name: 'Basic', price_monthly: 9.99 },
        { id: 2, name: 'Premium', price_monthly: 19.99 },
        { id: 3, name: 'Professional', price_monthly: 39.99 }
      ]);
    }
  };

  const initializeProject = async () => {
    const sampleProject = {
      id: 1,
      title: 'Video Podcast Test Footage 2',
      duration: 300,
      frameRate: 30,
      resolution: { width: 1920, height: 1080 }
    };

    const sampleTracks = [
      {
        id: 1,
        name: 'V2',
        type: 'video',
        order: 0,
        visible: true,
        muted: false,
        locked: false,
        volume: 1.0,
        color: '#4a9eff',
        clips: []
      },
      {
        id: 2,
        name: 'V1',
        type: 'video',
        order: 1,
        visible: true,
        muted: false,
        locked: false,
        volume: 1.0,
        color: '#00d4aa',
        clips: [
          {
            id: 1,
            title: 'Video Podcast Test Footage 1.mov.mp4',
            startTime: 30,
            duration: 120,
            type: 'video'
          }
        ]
      },
      {
        id: 3,
        name: 'A2',
        type: 'audio',
        order: 2,
        visible: true,
        muted: false,
        locked: false,
        volume: 0.7,
        color: '#ff6b6b',
        clips: []
      },
      {
        id: 4,
        name: 'A1',
        type: 'audio',
        order: 3,
        visible: true,
        muted: false,
        locked: false,
        volume: 0.8,
        color: '#4ecdc4',
        clips: [
          {
            id: 2,
            title: 'Audio Track 1',
            startTime: 30,
            duration: 120,
            type: 'audio'
          }
        ]
      },
      {
        id: 5,
        name: 'Mix',
        type: 'master',
        order: 4,
        visible: true,
        muted: false,
        locked: false,
        volume: 1.0,
        color: '#95a5a6',
        clips: []
      }
    ];

    setProject(sampleProject);
    setTracks(sampleTracks);
  };

  const loadMediaLibrary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/media-assets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMediaLibrary(data.assets || []);
      } else {
        // Fallback demo data
        setMediaLibrary([
          { id: 1, name: 'Clip 1.mp4', type: 'video', size: 50 * 1024 * 1024 },
          { id: 2, name: 'Audio.wav', type: 'audio', size: 20 * 1024 * 1024 }
        ]);
      }
    } catch (error) {
      console.error('Failed to load media library:', error);
      setMediaLibrary([
        { id: 1, name: 'Clip 1.mp4', type: 'video', size: 50 * 1024 * 1024 },
        { id: 2, name: 'Audio.wav', type: 'audio', size: 20 * 1024 * 1024 }
      ]);
    }
  };

  // Check if user can perform action based on tier
  const checkTierLimit = (action) => {
    if (!userLimits) return { allowed: true };

    switch (action) {
      case 'add_track':
        if (userLimits.max_tracks_per_project !== -1 && tracks.length >= userLimits.max_tracks_per_project) {
          return {
            allowed: false,
            message: `Track limit reached (${userLimits.max_tracks_per_project}). Upgrade to add more tracks.`,
            upgradeRequired: true
          };
        }
        break;
      case 'add_project':
        if (userUsage && userLimits.max_projects !== -1 && userUsage.current_projects >= userLimits.max_projects) {
          return {
            allowed: false,
            message: `Project limit reached (${userLimits.max_projects}). Upgrade to create more projects.`,
            upgradeRequired: true
          };
        }
        break;
      case 'export_4k':
        if (userLimits.max_export_quality !== '4k' && userLimits.max_export_quality !== '8k') {
          return {
            allowed: false,
            message: 'Upgrade to premium for 4K export.',
            upgradeRequired: true
          };
        }
        break;
    }

    return { allowed: true };
  };

  // File upload with size validation
  const handleFileUpload = async (file, type = 'video') => {
    if (!file) return;

    // Check file size based on tier
    const maxSize = userLimits?.[`${type}_clip_max_size`] || (500 * 1024 * 1024); // 500MB default
    
    if (file.size > maxSize) {
      const tierName = tierConfig[userTier]?.name || 'Free';
      alert(`File too large for ${tierName} tier. Maximum size: ${formatBytes(maxSize)}. Current file: ${formatBytes(file.size)}`);
      setShowUpgradeModal(true);
      return;
    }

    // Upload file
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/media-assets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMediaLibrary(prev => [...prev, data.asset]);
        
        if (data.remaining_limits) {
          setUserUsage(data.remaining_limits);
        }
        
        alert('File uploaded successfully!');
      } else {
        const error = await response.json();
        if (error.upgrade_required) {
          setShowUpgradeModal(true);
        }
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Demo functionality - just add to media library
      const newAsset = {
        id: Date.now(),
        name: file.name,
        type: file.type.startsWith('video') ? 'video' : 'audio',
        size: file.size
      };
      setMediaLibrary(prev => [...prev, newAsset]);
      alert('File uploaded successfully! (Demo mode)');
    }
  };

  const addTrack = async () => {
    const limitCheck = checkTierLimit('add_track');
    if (!limitCheck.allowed) {
      alert(limitCheck.message);
      if (limitCheck.upgradeRequired) {
        setShowUpgradeModal(true);
      }
      return;
    }

    const newTrack = {
      id: Date.now(),
      name: `Track ${tracks.length + 1}`,
      type: 'video',
      order: tracks.length,
      visible: true,
      muted: false,
      locked: false,
      volume: 1.0,
      color: '#9b59b6',
      clips: []
    };

    setTracks(prev => [...prev, newTrack]);
  };

  const initiateUpgrade = async (planId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/user/video-editor/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: 'monthly'
        })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkout_url;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to initiate upgrade');
      }
    } catch (error) {
      console.error('Failed to initiate upgrade:', error);
      alert('Upgrade feature available in production version');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // 30fps
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickTime = (x / timelineWidth) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, clickTime)));
  };

  const playPause = () => {
    setIsPlaying(!isPlaying);
  };

  const stop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const startExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    
    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          setShowExportModal(false);
          alert('Export completed successfully!');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const TierBadge = ({ tier }) => {
    const config = tierConfig[tier];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <div className="tier-badge-small" style={{ color: config.color }}>
        <Icon size={12} />
        {config.name}
      </div>
    );
  };

  const LimitsModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Your Limits</h3>
          <TierBadge tier={userTier} />
        </div>
        
        {userLimits && userUsage ? (
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--editor-text-secondary)' }}>
                <span>Projects</span>
                <span>
                  {userUsage.current_projects} / {userLimits.max_projects === -1 ? '∞' : userLimits.max_projects}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-blue"
                  style={{ 
                    width: userLimits.max_projects === -1 ? '0%' : 
                    `${Math.min(100, (userUsage.current_projects / userLimits.max_projects) * 100)}%` 
                  }}
                />
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--editor-text-secondary)' }}>
                <span>Storage Used</span>
                <span>{formatBytes(userUsage.current_total_size)} / {formatBytes(userLimits.project_total_max_size)}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill progress-green"
                  style={{ 
                    width: `${Math.min(100, (userUsage.current_total_size / userLimits.project_total_max_size) * 100)}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--editor-text-secondary)' }}>
                <span>Max Video File Size</span>
                <span>{formatBytes(userLimits.video_clip_max_size)}</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px', color: 'var(--editor-text-secondary)' }}>
                <span>Max Export Quality</span>
                <span>{userLimits.max_export_quality}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--editor-text-secondary)', textAlign: 'center', padding: '20px' }}>
            Loading limits...
          </div>
        )}
        
        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="export-btn-top"
            style={{ flex: 1 }}
          >
            Upgrade Plan
          </button>
          <button
            onClick={() => setShowLimitsModal(false)}
            className="control-btn-small"
            style={{ flex: 1 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const UpgradeModal = () => (
    <div className="modal-overlay">
      <div className="modal-content upgrade-modal">
        <div className="modal-header">
          <h3 className="modal-title">Upgrade Your Video Editor Plan</h3>
          <button
            onClick={() => setShowUpgradeModal(false)}
            className="preview-control-btn"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="plans-grid">
          {availablePlans.map((plan) => {
            const tierKey = plan.name.toLowerCase();
            const config = tierConfig[tierKey] || tierConfig.free;
            const Icon = config.icon;
            const isCurrentTier = tierKey === userTier;
            
            return (
              <div 
                key={plan.id}
                className={`plan-card ${isCurrentTier ? 'plan-card-current' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', justifyContent: 'center' }}>
                  <Icon size={24} style={{ color: config.color, marginRight: '8px' }} />
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: config.color }}>
                    {plan.name}
                  </h4>
                  {isCurrentTier && <span style={{ marginLeft: '8px', fontSize: '0.75rem', background: config.color, color: 'white', padding: '4px 8px', borderRadius: '4px' }}>Current</span>}
                </div>
                
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--editor-text-primary)' }}>${plan.price_monthly}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--editor-text-secondary)' }}>per month</div>
                </div>
                
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem', marginBottom: '32px', listStyle: 'none', padding: 0 }}>
                  {config.features.map((feature, index) => (
                    <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#4ade80', marginRight: '8px', fontWeight: 'bold' }}>✓</span>
                      <span style={{ color: 'var(--editor-text-secondary)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {!isCurrentTier && (
                  <button 
                    className="export-btn-top"
                    style={{ width: '100%' }}
                    onClick={() => initiateUpgrade(plan.id)}
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ExportModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Export Video</h3>
          <button
            onClick={() => setShowExportModal(false)}
            className="preview-control-btn"
          >
            <X size={16} />
          </button>
        </div>
        
        {isExporting ? (
          <div style={{ position: 'relative', zIndex: 1, padding: '20px', textAlign: 'center' }}>
            <h4>Exporting...</h4>
            <div className="progress-bar" style={{ marginTop: '20px' }}>
              <div 
                className="progress-fill progress-green"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p style={{ marginTop: '10px', color: 'var(--editor-text-secondary)' }}>
              {exportProgress}% Complete
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--editor-text-primary)' }}>
                Export Quality
              </label>
              <select style={{ width: '100%', padding: '8px', background: 'var(--editor-bg-panel)', color: 'var(--editor-text-primary)', border: '1px solid var(--editor-border)', borderRadius: '4px' }}>
                <option value="720p">720p HD</option>
                <option value="1080p" disabled={userTier === 'free'}>1080p Full HD {userTier === 'free' && '(Premium)'}</option>
                <option value="4k" disabled={userTier !== 'premium' && userTier !== 'professional'}>4K Ultra HD (Premium+)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--editor-text-primary)' }}>
                Format
              </label>
              <select style={{ width: '100%', padding: '8px', background: 'var(--editor-bg-panel)', color: 'var(--editor-text-primary)', border: '1px solid var(--editor-border)', borderRadius: '4px' }}>
                <option value="mp4">MP4</option>
                <option value="mov" disabled={userTier === 'free'}>MOV (Basic+)</option>
                <option value="avi" disabled={userTier === 'free'}>AVI (Basic+)</option>
              </select>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
              <button
                onClick={startExport}
                className="export-btn-top"
                style={{ flex: 1 }}
              >
                Start Export
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="control-btn-small"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const ToolbarComponent = () => (
    <div className="editor-toolbar">
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
                title={`${tool.name} (${tool.shortcut})`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="toolbar-section">
        <h4>Effects</h4>
        <div className="effect-list">
          <div className="effect-item" draggable>
            <Zap size={16} />
            <span>Transition</span>
          </div>
          <div className="effect-item" draggable>
            <Palette size={16} />
            <span>Color</span>
          </div>
          <div className="effect-item" draggable>
            <Filter size={16} />
            <span>Blur</span>
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <h4>Media</h4>
        <div className="media-browser">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="import-btn"
          >
            <Upload size={16} />
            Import Media
          </button>
          <div className="media-list">
            {mediaLibrary.slice(0, 5).map(asset => (
              <div key={asset.id} className="media-item" draggable>
                {asset.type === 'video' ? <Video size={16} /> : <Music size={16} />}
                <span>{asset.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <button
          onClick={() => setShowLimitsModal(true)}
          className="import-btn"
          style={{ background: 'var(--editor-bg-hover)' }}
        >
          <Info size={16} />
          View Limits
        </button>
      </div>
    </div>
  );

  const TrackHeaderComponent = ({ track, index }) => (
    <div className="track-header-container">
      <div className="track-controls-left">
        <div className="track-label-container">
          <div className="track-name-label">{track.name}</div>
          {track.type === 'master' ? (
            <Volume2 size={14} className="track-type-icon" />
          ) : track.type === 'video' ? (
            <Video size={14} className="track-type-icon" />
          ) : (
            <Music size={14} className="track-type-icon" />
          )}
        </div>
        <div className="track-control-buttons">
          <button
            className={`track-toggle-btn ${!track.muted ? 'active' : ''}`}
            onClick={() => {
              const updatedTracks = tracks.map(t => 
                t.id === track.id ? {...t, muted: !t.muted} : t
              );
              setTracks(updatedTracks);
            }}
            title="Toggle Mute"
          >
            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          {track.type !== 'audio' && track.type !== 'master' && (
            <button
              className={`track-toggle-btn ${track.visible ? 'active' : ''}`}
              onClick={() => {
                const updatedTracks = tracks.map(t => 
                  t.id === track.id ? {...t, visible: !t.visible} : t
                );
                setTracks(updatedTracks);
              }}
              title="Toggle Visibility"
            >
              {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          )}
          <button
            className={`track-toggle-btn ${track.locked ? 'active' : ''}`}
            onClick={() => {
              const updatedTracks = tracks.map(t => 
                t.id === track.id ? {...t, locked: !t.locked} : t
              );
              setTracks(updatedTracks);
            }}
            title="Toggle Lock"
          >
            {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          {tracks.length > 2 && (
            <button
              className="track-toggle-btn"
              onClick={() => {
                setTracks(tracks.filter(t => t.id !== track.id));
              }}
              title="Delete Track"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const TimelineTrackComponent = ({ track, index }) => (
    <div className="timeline-track-row">
      <div 
        className="track-timeline-area"
        style={{ 
          width: `${duration * zoom * 4}px`, 
          minWidth: '100%',
          backgroundColor: index % 2 === 0 ? '#2a2d35' : '#1e2127'
        }}
        onDrop={(e) => {
          e.preventDefault();
          const mediaData = e.dataTransfer.getData('media');
          if (mediaData) {
            const media = JSON.parse(mediaData);
            console.log(`Add ${media.name} to ${track.name}`);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {track.clips.map(clip => (
          <div
            key={clip.id}
            className={`timeline-clip ${selectedClip?.id === clip.id ? 'selected' : ''}`}
            style={{
              left: `${clip.startTime * zoom * 4}px`,
              width: `${clip.duration * zoom * 4}px`,
              backgroundColor: track.color,
              borderColor: track.color
            }}
            onClick={() => setSelectedClip(clip)}
          >
            <div className="clip-content-timeline">
              <div className="clip-title-timeline">{clip.title}</div>
              {clip.type === 'audio' && (
                <div className="audio-waveform">
                  <AudioWaveform size={12} />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {track.clips.length === 0 && (
          <div className="empty-track-message">
            {/* Empty track - ready for content */}
          </div>
        )}
      </div>
    </div>
  );

  const TimelineComponent = () => (
    <div className="timeline-main-container">
      {/* Timeline Ruler */}
      <div className="timeline-ruler-container">
        <div className="track-headers-spacer"></div>
        <div className="timeline-ruler-scroll">
          <div 
            className="timeline-ruler" 
            style={{ width: `${duration * zoom * 4}px` }}
          >
            {Array.from({ length: Math.ceil(duration / 10) + 1 }, (_, i) => (
              <div
                key={i}
                className="time-marker-ruler"
                style={{ left: `${i * 10 * zoom * 4}px` }}
              >
                <div className="time-marker-line"></div>
                <div className="time-marker-text">{formatTime(i * 10)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Playhead */}
      <div
        className="timeline-playhead"
        style={{
          left: `${240 + currentTime * zoom * 4}px`
        }}
      />

      {/* Track Area */}
      <div className="timeline-tracks-container">
        <div className="track-headers-column">
          {tracks.map((track, index) => (
            <TrackHeaderComponent key={track.id} track={track} index={index} />
          ))}
        </div>

        <div className="timeline-tracks-scroll">
          <div 
            className="timeline-tracks-content"
            ref={timelineRef}
            onClick={handleTimelineClick}
          >
            {tracks.map((track, index) => (
              <TimelineTrackComponent key={track.id} track={track} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="video-editor-pro">
      {/* Top Menu Bar */}
      <div className="editor-menu-bar">
        <div className="menu-section">
          <div className="project-info">
            <h2>{project?.title || 'Untitled Project'}</h2>
            <TierBadge tier={userTier} />
          </div>
        </div>

        <div className="menu-section">
          <div className="playback-controls-top">
            <button
              onClick={() => setCurrentTime(Math.max(0, currentTime - 10))}
              className="control-btn-small"
              title="Previous 10s"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={playPause}
              className="control-btn-play-small"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={stop}
              className="control-btn-small"
            >
              <Square size={16} />
            </button>
            <button
              onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))}
              className="control-btn-small"
              title="Forward 10s"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>

        <div className="menu-section">
          <div className="timeline-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="menu-section">
          <button
            onClick={addTrack}
            className="control-btn-small"
            title="Add Track"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="export-btn-top"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-main-layout">
        {/* Left Sidebar - Tools */}
        <div className="editor-left-panel">
          <ToolbarComponent />
        </div>

        {/* Center Area - Preview */}
        <div className="editor-center-panel">
          <div className="preview-area">
            <div className="preview-container">
              <div className="preview-screen">
                <div className="preview-content">
                  <div className="preview-placeholder">
                    <Video size={48} />
                    <p>Video Preview</p>
                    <p className="preview-resolution">1920 x 1080</p>
                  </div>
                </div>
              </div>
              <div className="preview-controls">
                <button className="preview-control-btn">
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-display">100%</span>
                <button className="preview-control-btn">
                  <ZoomIn size={16} />
                </button>
                <div className="preview-spacer"></div>
                <button className="preview-control-btn">
                  <Grid size={16} />
                </button>
                <button className="preview-control-btn">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="editor-timeline-section" style={{ height: '300px' }}>
        <div className="timeline-controls-bar">
          <div className="timeline-zoom-controls">
            <button
              onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
              className="zoom-btn"
            >
              <Minimize2 size={14} />
            </button>
            <div className="zoom-slider-container">
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="zoom-slider-pro"
              />
            </div>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="zoom-btn"
            >
              <Maximize2 size={14} />
            </button>
            <span className="zoom-display-pro">{(zoom * 100).toFixed(0)}%</span>
          </div>

          <div className="timeline-options">
            <button className="timeline-option-btn active">
              <Layers size={14} />
              Tracks
            </button>
            <button className="timeline-option-btn">
              <AudioWaveform size={14} />
              Audio
            </button>
          </div>
        </div>

        <TimelineComponent />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        onChange={(e) => handleFileUpload(e.target.files[0])}
        className="hidden-file-input"
      />

      {/* Modals */}
      {showLimitsModal && <LimitsModal />}
      {showUpgradeModal && <UpgradeModal />}
      {showExportModal && <ExportModal />}
    </div>
  );
};

export default VideoEditorComponent;