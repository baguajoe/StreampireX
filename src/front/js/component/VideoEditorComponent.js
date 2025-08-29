import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, RotateCcw, Download, Upload, Volume2, VolumeX, 
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, Scissors, Copy, Move, Settings, 
  Music, Video, AudioWaveform, Save, Youtube, Instagram, Facebook, Twitter, 
  ChevronDown, ChevronUp, Layers, Zap, Filter, 
  Palette, Tv, Info, MousePointer, Hand, Type, 
  Circle, Pen, Eraser, Crop, RotateCw, FlipHorizontal,
  ZoomIn, ZoomOut, Grid, Minimize2, Maximize2, MoreVertical, X, Crown, Star, Bolt,
  Sliders, Image, Wand2, Sparkles, Sun, Droplets, Contrast,
  RefreshCw, SkipForward, Rewind, FastForward, Monitor, Camera
} from 'lucide-react';

const VideoEditorComponent = () => {
  // Core state
  const [project, setProject] = useState({
    title: 'Untitled Project',
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
      clips: [
        {
          id: 1,
          title: 'Main_Clip.mp4',
          startTime: 30,
          duration: 120,
          type: 'video'
        }
      ]
    },
    {
      id: 2,
      name: 'Audio 1',
      type: 'audio',
      visible: true,
      muted: false,
      locked: false,
      color: '#00d4aa',
      clips: [
        {
          id: 2,
          title: 'Background_Music.wav',
          startTime: 30,
          duration: 120,
          type: 'audio'
        }
      ]
    }
  ]);

  // Transitions state
  const [transitions, setTransitions] = useState([
    {
      id: 1,
      type: 'fade',
      name: 'Fade',
      startTime: 148,
      duration: 2,
      trackId: 1,
      icon: 'Zap'
    }
  ]);

  const [availableTransitions] = useState([
    { id: 'fade', name: 'Fade', icon: Zap, duration: 2000, description: 'Smooth fade between clips' },
    { id: 'dissolve', name: 'Dissolve', icon: Circle, duration: 1500, description: 'Gradual dissolve effect' },
    { id: 'wipe', name: 'Wipe', icon: Move, duration: 1000, description: 'Directional wipe transition' },
    { id: 'slide', name: 'Slide', icon: FlipHorizontal, duration: 800, description: 'Slide transition' },
    { id: 'zoom', name: 'Zoom', icon: ZoomIn, duration: 1200, description: 'Zoom in/out transition' },
    { id: 'spin', name: 'Spin', icon: RotateCw, duration: 1500, description: 'Spinning transition effect' }
  ]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [draggedTransition, setDraggedTransition] = useState(null);

  // User tier
  const [userTier] = useState('premium');

  // UI state
  const [showSnapToGrid, setShowSnapToGrid] = useState(true);
  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);
  const [activeEffects, setActiveEffects] = useState({});
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showTransitionsPanel, setShowTransitionsPanel] = useState(true);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  // Tools configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Selection Tool' },
    { id: 'razor', icon: Scissors, name: 'Razor Tool' },
    { id: 'hand', icon: Hand, name: 'Hand Tool' },
    { id: 'text', icon: Type, name: 'Text Tool' }
  ];

  // Effects library
  const effects = [
    // Video Effects
    { id: 'brightness', name: 'Brightness', icon: Sun, category: 'color' },
    { id: 'contrast', name: 'Contrast', icon: Contrast, category: 'color' },
    { id: 'saturation', name: 'Saturation', icon: Droplets, category: 'color' },
    { id: 'blur', name: 'Blur', icon: Circle, category: 'filter' },
    { id: 'sharpen', name: 'Sharpen', icon: Zap, category: 'filter' },
    // Audio Effects
    { id: 'reverb', name: 'Reverb', icon: AudioWaveform, category: 'audio' },
    { id: 'echo', name: 'Echo', icon: RefreshCw, category: 'audio' }
  ];

  // Media library
  const [mediaLibrary] = useState([
    { id: 1, name: 'Interview_Setup.mp4', type: 'video', duration: '5:23' },
    { id: 2, name: 'Background_Music.wav', type: 'audio', duration: '3:45' },
    { id: 3, name: 'Logo_Animation.mov', type: 'video', duration: '0:08' }
  ]);

  // Transition functions
  const addTransition = (transitionType, startTime, trackId) => {
    const transitionData = availableTransitions.find(t => t.id === transitionType);
    if (!transitionData) return;

    const newTransition = {
      id: Date.now(),
      type: transitionType,
      name: transitionData.name,
      startTime,
      duration: transitionData.duration / 1000, // Convert to seconds
      trackId,
      icon: transitionData.icon.name
    };

    setTransitions(prev => [...prev, newTransition]);
  };

  const removeTransition = (transitionId) => {
    setTransitions(prev => prev.filter(t => t.id !== transitionId));
  };

  const updateTransition = (transitionId, updates) => {
    setTransitions(prev => prev.map(t => 
      t.id === transitionId ? { ...t, ...updates } : t
    ));
  };

  // Drag and drop handlers
  const handleTransitionDragStart = (e, transitionType) => {
    setDraggedTransition(transitionType);
    e.dataTransfer.setData('transition-type', transitionType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTimelineDragOver = (e) => {
    if (draggedTransition) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleTimelineDrop = (e, trackId) => {
    e.preventDefault();
    if (!draggedTransition || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const dropTime = (x / timelineWidth) * duration;

    addTransition(draggedTransition, dropTime, trackId);
    setDraggedTransition(null);
  };

  // Calculate time from mouse position
  const calculateTimeFromPosition = (clientX) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const timelineWidth = rect.width;
    return (x / timelineWidth) * duration;
  };

  // Playback controls
  const playPause = () => setIsPlaying(!isPlaying);
  const stop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Timeline interaction
  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timelineWidth = rect.width;
    const clickTime = (x / timelineWidth) * duration;
    setCurrentTime(Math.max(0, Math.min(duration, clickTime)));
  };

  // Utility functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    
    if (hours > 0) {
      return `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(frames).padStart(2,'0')}`;
    }
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}:${String(frames).padStart(2,'0')}`;
  };

  const getTierIcon = () => {
    switch(userTier) {
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

  // Effect application function
  const applyEffect = (clipId, effectId, value) => {
    setActiveEffects(prev => ({
      ...prev,
      [clipId]: {
        ...prev[clipId],
        [effectId]: value
      }
    }));
  };

  return (
    <div className="video-editor-pro">
      {/* Top Menu Bar */}
      <div className="editor-menu-bar">
        <div className="menu-section">
          <div className="project-info">
            <h2>{project.title}</h2>
            <div className="tier-badge-small">
              {getTierIcon()}
              {userTier}
            </div>
          </div>
        </div>

        <div className="menu-section">
          <div className="playback-controls-top">
            <button onClick={stop} className="control-btn-small">
              <Square size={14} />
            </button>
            <button onClick={() => setCurrentTime(Math.max(0, currentTime - 10))} className="control-btn-small">
              <Rewind size={14} />
            </button>
            <button onClick={playPause} className="control-btn-play-small">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => setCurrentTime(Math.min(duration, currentTime + 10))} className="control-btn-small">
              <FastForward size={14} />
            </button>
          </div>
          <div className="timeline-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="menu-section">
          <button className="export-btn-top">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-main-layout">
        {/* Left Panel - Tools & Media */}
        <div className="editor-left-panel">
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

            {/* Transitions Section */}
            <div className="toolbar-section">
              <h4>Transitions</h4>
              <button 
                className="import-btn" 
                onClick={() => setShowTransitionsPanel(!showTransitionsPanel)}
                style={{marginBottom: '12px'}}
              >
                <Wand2 size={14} />
                {showTransitionsPanel ? 'Hide' : 'Show'} Transitions
              </button>
              {showTransitionsPanel && (
                <div className="transitions-list">
                  {availableTransitions.map(transition => {
                    const Icon = transition.icon;
                    return (
                      <div 
                        key={transition.id} 
                        className="transition-item"
                        draggable
                        onDragStart={(e) => handleTransitionDragStart(e, transition.id)}
                        title={transition.description}
                      >
                        <Icon size={14} />
                        <div className="transition-info">
                          <span className="transition-name">{transition.name}</span>
                          <span className="transition-duration">{transition.duration}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Effects Section */}
            <div className="toolbar-section">
              <h4>Effects</h4>
              <div className="effect-list">
                {effects.map(effect => {
                  const Icon = effect.icon;
                  return (
                    <div key={effect.id} className="effect-item">
                      <Icon size={14} />
                      <span>{effect.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Media Library */}
            <div className="toolbar-section">
              <h4>Media</h4>
              <button className="import-btn" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} />
                Import Media
              </button>
              <button 
                className="import-btn" 
                onClick={() => setShowEffectsPanel(!showEffectsPanel)}
                style={{marginBottom: '12px'}}
              >
                <Wand2 size={14} />
                Effects Panel
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                accept="video/*,audio/*"
                multiple
              />
              <div className="media-list">
                {mediaLibrary.map(media => {
                  const Icon = media.type === 'video' ? Video : AudioWaveform;
                  return (
                    <div key={media.id} className="media-item">
                      <Icon size={14} />
                      <div>
                        <div style={{fontSize: '11px', fontWeight: '500'}}>{media.name}</div>
                        <div style={{fontSize: '10px', opacity: 0.7}}>{media.duration}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div className="editor-center-panel">
          <div className="preview-area">
            <div className="preview-container">
              <div className="preview-screen">
                <div className="preview-content">
                  <div className="preview-placeholder">
                    <Monitor size={48} />
                    <p>Program Monitor</p>
                    <div className="preview-resolution">1920 x 1080 • 30fps</div>
                  </div>
                </div>
              </div>
              <div className="preview-controls">
                <button className="preview-control-btn">
                  <ZoomOut size={14} />
                </button>
                <div className="zoom-display">100%</div>
                <button className="preview-control-btn">
                  <ZoomIn size={14} />
                </button>
                <div className="preview-spacer" />
                <button className="preview-control-btn">
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
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
                  Snap
                </button>
                <button 
                  className={`timeline-option-btn ${showAudioWaveforms ? 'active' : ''}`}
                  onClick={() => setShowAudioWaveforms(!showAudioWaveforms)}
                >
                  <AudioWaveform size={12} />
                  Waveforms
                </button>
              </div>
            </div>

            {/* Timeline Main */}
            <div className="timeline-main-container">
              {/* Ruler */}
              <div className="timeline-ruler-container">
                <div className="track-headers-spacer" />
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
                <div className="track-headers-column">
                  {tracks.map(track => (
                    <div key={track.id} className="track-header-container">
                      <div className="track-controls-left">
                        <div className="track-label-container">
                          <div className="track-type-icon">
                            {track.type === 'video' ? <Video size={14} /> : <AudioWaveform size={14} />}
                          </div>
                          <div className="track-name-label">{track.name}</div>
                        </div>
                        <div className="track-control-buttons">
                          <button 
                            className={`track-toggle-btn ${track.muted ? '' : 'active'}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? {...t, muted: !t.muted} : t))}
                          >
                            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>
                          <button 
                            className={`track-toggle-btn ${track.visible ? 'active' : ''}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? {...t, visible: !t.visible} : t))}
                          >
                            {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button 
                            className={`track-toggle-btn ${track.locked ? 'active' : ''}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? {...t, locked: !t.locked} : t))}
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
                    onDragOver={handleTimelineDragOver}
                  >
                    {/* Playhead */}
                    <div 
                      className="timeline-playhead"
                      style={{ left: `${currentTime * 2 * zoom}px` }}
                    />

                    {/* Track Rows */}
                    {tracks.map((track, index) => (
                      <div 
                        key={track.id} 
                        className="timeline-track-row"
                        onDrop={(e) => handleTimelineDrop(e, track.id)}
                        onDragOver={handleTimelineDragOver}
                      >
                        <div className="track-timeline-area">
                          {track.clips.length === 0 ? (
                            <div className="empty-track-message">
                              Drop media here
                            </div>
                          ) : (
                            track.clips.map(clip => {
                              const leftPosition = clip.startTime * 2 * zoom;
                              const width = clip.duration * 2 * zoom;
                              
                              return (
                                <div
                                  key={clip.id}
                                  className={`timeline-clip ${selectedClip?.id === clip.id ? 'selected' : ''}`}
                                  style={{
                                    left: `${leftPosition}px`,
                                    width: `${width}px`,
                                    backgroundColor: track.color
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClip(clip);
                                  }}
                                >
                                  <div className="clip-content-timeline">
                                    <div className="clip-title-timeline">
                                      {clip.title}
                                    </div>
                                    {track.type === 'audio' && showAudioWaveforms && (
                                      <div className="audio-waveform">
                                        <AudioWaveform size={12} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}

                          {/* Render Transitions for this track */}
                          {transitions
                            .filter(transition => transition.trackId === track.id)
                            .map(transition => {
                              const leftPosition = transition.startTime * 2 * zoom;
                              const width = transition.duration * 2 * zoom;
                              const IconComponent = transition.icon === 'Zap' ? Zap : 
                                                   transition.icon === 'Circle' ? Circle :
                                                   transition.icon === 'Move' ? Move :
                                                   transition.icon === 'FlipHorizontal' ? FlipHorizontal :
                                                   transition.icon === 'ZoomIn' ? ZoomIn :
                                                   transition.icon === 'RotateCw' ? RotateCw : Zap;
                              
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
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (window.confirm('Delete this transition?')) {
                                      removeTransition(transition.id);
                                    }
                                  }}
                                >
                                  <div className="transition-content">
                                    <IconComponent size={14} className="transition-icon" />
                                    <div className="transition-label">{transition.name}</div>
                                  </div>
                                </div>
                              );
                            })}
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

      {/* Effects Panel */}
      {showEffectsPanel && selectedClip && (
        <div className="effects-panel">
          <h4>Effects for {selectedClip.title}</h4>
          {effects.map(effect => (
            <div key={effect.id} className="effect-control">
              <label>{effect.name}</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                onChange={(e) => applyEffect(selectedClip.id, effect.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Transitions Panel */}
      {selectedTransition && (
        <div className="transitions-panel">
          <div className="panel-header">
            <h4>Transition Properties</h4>
            <button onClick={() => setSelectedTransition(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="transition-properties">
            <div className="property-group">
              <label>Duration (seconds)</label>
              <input 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1"
                value={selectedTransition.duration}
                onChange={(e) => updateTransition(selectedTransition.id, { duration: parseFloat(e.target.value) })}
              />
            </div>
            <div className="property-group">
              <label>Start Time</label>
              <input 
                type="number" 
                min="0" 
                max={duration}
                step="0.1"
                value={selectedTransition.startTime}
                onChange={(e) => updateTransition(selectedTransition.id, { startTime: parseFloat(e.target.value) })}
              />
            </div>
            <button 
              className="delete-transition-btn"
              onClick={() => {
                removeTransition(selectedTransition.id);
                setSelectedTransition(null);
              }}
            >
              <Trash2 size={14} />
              Delete Transition
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        /* Professional Video Editor CSS - Enhanced with Transitions */

        /* CSS Variables for Professional Video Editor Theme */
        :root {
          /* Dark Theme Colors - Matching Professional Video Editors */
          --editor-bg-dark: #1e1e1e;
          --editor-bg-darker: #181818;
          --editor-bg-panel: #2d2d30;
          --editor-bg-hover: #3e3e42;
          --editor-bg-selected: #0e639c;
          --editor-border: #3f3f46;
          --editor-border-light: #4b4b52;
          
          /* Text Colors */
          --editor-text-primary: #cccccc;
          --editor-text-secondary: #969696;
          --editor-text-muted: #6d6d6d;
          --editor-text-bright: #ffffff;
          
          /* Accent Colors */
          --editor-accent-blue: #007acc;
          --editor-accent-green: #00d4aa;
          --editor-accent-red: #ff6b6b;
          --editor-accent-orange: #ff9500;
          --editor-accent-purple: #b180d7;
          
          /* Timeline Colors */
          --timeline-bg: #1e2127;
          --timeline-ruler: #2a2d35;
          --timeline-header: #252830;
          --timeline-track-even: #2a2d35;
          --timeline-track-odd: #1e2127;
          
          /* Playhead */
          --playhead-color: #ffd700;
          --playhead-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
          
          /* Transitions */
          --transition-color: rgba(255, 255, 255, 0.2);
          --transition-border: rgba(255, 255, 255, 0.4);
          --transition-hover: rgba(255, 255, 255, 0.3);
          
          /* Shadows and Effects */
          --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-heavy: 0 8px 16px rgba(0, 0, 0, 0.4);
          
          /* Transitions */
          --transition-fast: all 0.15s ease;
          --transition-smooth: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Main Video Editor Container */
        .video-editor-pro {
          width: 100vw;
          height: 100vh;
          background: var(--editor-bg-dark);
          color: var(--editor-text-primary);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Top Menu Bar */
        .editor-menu-bar {
          height: 60px;
          background: var(--editor-bg-panel);
          border-bottom: 1px solid var(--editor-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          flex-shrink: 0;
        }

        .menu-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .project-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .project-info h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: var(--editor-text-bright);
        }

        .tier-badge-small {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .playback-controls-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-btn-small,
        .control-btn-play-small {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .control-btn-play-small {
          background: var(--editor-accent-blue);
          color: white;
        }

        .control-btn-small:hover,
        .control-btn-play-small:hover {
          background: var(--editor-bg-selected);
          color: white;
        }

        .timeline-display {
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 14px;
          font-weight: 500;
          color: var(--editor-text-bright);
          background: var(--editor-bg-darker);
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid var(--editor-border);
        }

        .export-btn-top {
          padding: 8px 16px;
          background: var(--editor-accent-green);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: var(--transition-fast);
        }

        .export-btn-top:hover {
          background: var(--editor-accent-blue);
        }

        /* Main Editor Layout */
        .editor-main-layout {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        /* Left Panel - Tools */
        .editor-left-panel {
          width: 240px;
          min-width: 240px;
          background: var(--editor-bg-panel);
          border-right: 1px solid var(--editor-border);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .editor-toolbar {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .toolbar-section h4 {
          margin: 0 0 12px 0;
          color: var(--editor-text-bright);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .tool-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .tool-btn {
          width: 40px;
          height: 40px;
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          background: var(--editor-bg-dark);
          color: var(--editor-text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .tool-btn:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-border-light);
        }

        .tool-btn.active {
          background: var(--editor-accent-blue);
          border-color: var(--editor-accent-blue);
          color: white;
        }

        /* Transitions List */
        .transitions-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }

        .transition-item {
          padding: 8px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
          font-size: 12px;
        }

        .transition-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-border-light);
        }

        .transition-item:active {
          cursor: grabbing;
        }

        .transition-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .transition-name {
          font-weight: 500;
          color: var(--editor-text-primary);
        }

        .transition-duration {
          font-size: 10px;
          color: var(--editor-text-muted);
        }

        .effect-list,
        .media-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .effect-item,
        .media-item {
          padding: 8px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
          font-size: 12px;
        }

        .effect-item:hover,
        .media-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-border-light);
        }

        .effect-item:active,
        .media-item:active {
          cursor: grabbing;
        }

        .import-btn {
          width: 100%;
          padding: 10px;
          background: var(--editor-accent-blue);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 12px;
          transition: var(--transition-fast);
        }

        .import-btn:hover {
          background: var(--editor-bg-selected);
        }

        /* Center Panel - Preview */
        .editor-center-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--editor-bg-dark);
          min-width: 0;
        }

        .preview-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
        }

        .preview-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--editor-bg-darker);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          overflow: hidden;
        }

        .preview-screen {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          position: relative;
          min-height: 300px;
        }

        .preview-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-placeholder {
          text-align: center;
          color: var(--editor-text-muted);
        }

        .preview-placeholder p {
          margin: 8px 0 4px 0;
          font-size: 14px;
        }

        .preview-resolution {
          font-size: 12px;
          color: var(--editor-text-secondary);
        }

        .preview-controls {
          height: 40px;
          background: var(--editor-bg-panel);
          border-top: 1px solid var(--editor-border);
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 12px;
        }

        .preview-control-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 3px;
          background: var(--editor-bg-dark);
          color: var(--editor-text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .preview-control-btn:hover {
          background: var(--editor-bg-hover);
        }

        .zoom-display {
          font-size: 12px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
        }

        .preview-spacer {
          flex: 1;
        }

        /* Timeline Section */
        .editor-timeline-section {
          background: var(--timeline-bg);
          border-top: 1px solid var(--editor-border);
          display: flex;
          flex-direction: column;
          min-height: 250px;
          resize: vertical;
          overflow: hidden;
        }

        .timeline-controls-bar {
          height: 36px;
          background: var(--timeline-header);
          border-bottom: 1px solid var(--editor-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
        }

        .timeline-zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zoom-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 3px;
          background: var(--editor-bg-dark);
          color: var(--editor-text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .zoom-btn:hover {
          background: var(--editor-bg-hover);
        }

        .zoom-slider-container {
          width: 100px;
        }

        .zoom-slider-pro {
          width: 100%;
          height: 4px;
          background: var(--editor-bg-dark);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        .zoom-slider-pro::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
        }

        .zoom-display-pro {
          font-size: 11px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
          min-width: 35px;
        }

        .timeline-options {
          display: flex;
          gap: 2px;
        }

        .timeline-option-btn {
          padding: 6px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          color: var(--editor-text-secondary);
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: var(--transition-fast);
        }

        .timeline-option-btn:first-child {
          border-radius: 3px 0 0 3px;
        }

        .timeline-option-btn:last-child {
          border-radius: 0 3px 3px 0;
        }

        .timeline-option-btn.active {
          background: var(--editor-accent-blue);
          border-color: var(--editor-accent-blue);
          color: white;
        }

        .timeline-option-btn:hover:not(.active) {
          background: var(--editor-bg-hover);
        }

        /* Timeline Main Container */
        .timeline-main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* Timeline Ruler */
        .timeline-ruler-container {
          height: 32px;
          display: flex;
          background: var(--timeline-ruler);
          border-bottom: 1px solid var(--editor-border);
          flex-shrink: 0;
        }

        .track-headers-spacer {
          width: 240px;
          min-width: 240px;
          background: var(--timeline-header);
          border-right: 1px solid var(--editor-border);
        }

        .timeline-ruler-scroll {
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .timeline-ruler {
          height: 100%;
          position: relative;
          min-width: 100%;
        }

        .time-marker-ruler {
          position: absolute;
          top: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .time-marker-line {
          width: 1px;
          height: 12px;
          background: var(--editor-border-light);
        }

        .time-marker-text {
          font-size: 10px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
          margin-top: 4px;
        }

        /* Playhead */
        .timeline-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--playhead-color);
          box-shadow: var(--playhead-shadow);
          z-index: 100;
          pointer-events: none;
        }

        .timeline-playhead::before {
          content: '';
          position: absolute;
          top: -6px;
          left: -6px;
          width: 14px;
          height: 14px;
          background: var(--playhead-color);
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        /* Track Area */
        .timeline-tracks-container {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .track-headers-column {
          width: 240px;
          min-width: 240px;
          background: var(--timeline-header);
          border-right: 1px solid var(--editor-border);
          overflow-y: auto;
        }

        .timeline-tracks-scroll {
          flex: 1;
          overflow: auto;
        }

        .timeline-tracks-content {
          min-width: 100%;
          cursor: crosshair;
        }

        /* Track Headers */
        .track-header-container {
          height: 48px;
          border-bottom: 1px solid var(--editor-border);
          display: flex;
          align-items: center;
          padding: 0 12px;
          background: var(--timeline-header);
        }

        .track-controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .track-label-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .track-name-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--editor-text-bright);
        }

        .track-type-icon {
          color: var(--editor-text-secondary);
        }

        .track-control-buttons {
          display: flex;
          gap: 4px;
        }

        .track-toggle-btn {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 3px;
          background: transparent;
          color: var(--editor-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .track-toggle-btn:hover {
          background: var(--editor-bg-hover);
        }

        .track-toggle-btn.active {
          color: var(--editor-accent-blue);
        }

        /* Timeline Tracks */
        .timeline-track-row {
          height: 48px;
          border-bottom: 1px solid var(--editor-border);
          position: relative;
        }

        .track-timeline-area {
          height: 100%;
          position: relative;
          cursor: crosshair;
        }

        .empty-track-message {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--editor-text-muted);
          font-size: 11px;
          pointer-events: none;
        }

        /* Timeline Clips */
        .timeline-clip {
          position: absolute;
          top: 4px;
          height: 40px;
          border-radius: 4px;
          cursor: pointer;
          border: 2px solid transparent;
          overflow: hidden;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-light);
        }

        .timeline-clip:hover {
          filter: brightness(1.1);
          box-shadow: var(--shadow-medium);
        }

        .timeline-clip.selected {
          border-color: white;
          box-shadow: 0 0 0 2px var(--editor-accent-blue), var(--shadow-medium);
        }

        .clip-content-timeline {
          height: 100%;
          padding: 4px 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.3);
        }

        .clip-title-timeline {
          font-size: 11px;
          font-weight: 500;
          color: white;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
        }

        .audio-waveform {
          align-self: flex-end;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Timeline Transitions - Enhanced */
        .timeline-transition {
          position: absolute;
          top: 2px;
          height: 44px;
          border-radius: 6px;
          cursor: pointer;
          background: linear-gradient(135deg,
              var(--transition-color) 0%,
              rgba(255, 255, 255, 0.1) 50%,
              var(--transition-color) 100%);
          border: 2px solid var(--transition-border);
          border-style: dashed;
          overflow: hidden;
          transition: var(--transition-fast);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(5px);
          z-index: 10;
        }

        .timeline-transition:hover {
          background: linear-gradient(135deg,
              var(--transition-hover) 0%,
              rgba(255, 255, 255, 0.2) 50%,
              var(--transition-hover) 100%);
          border-color: rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          transform: translateY(-1px);
        }

        .timeline-transition.selected {
          border-color: var(--editor-accent-blue);
          border-style: solid;
          box-shadow: 0 0 0 2px var(--editor-accent-blue), 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .transition-content {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
        }

        .transition-icon {
          margin-bottom: 2px;
          opacity: 0.9;
        }

        .transition-label {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }

        /* Transitions Panel */
        .transitions-panel {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 300px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          padding: 16px;
          z-index: 200;
          box-shadow: var(--shadow-medium);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
        }

        .panel-header button {
          background: none;
          border: none;
          color: var(--editor-text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          transition: var(--transition-fast);
        }

        .panel-header button:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
        }

        .transition-properties {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .property-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .property-group label {
          font-size: 12px;
          color: var(--editor-text-primary);
          font-weight: 500;
        }

        .property-group input {
          padding: 6px 8px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 3px;
          color: var(--editor-text-primary);
          font-size: 12px;
        }

        .property-group input:focus {
          outline: none;
          border-color: var(--editor-accent-blue);
        }

        .delete-transition-btn {
          padding: 8px 12px;
          background: var(--editor-accent-red);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
          transition: var(--transition-fast);
        }

        .delete-transition-btn:hover {
          background: #ff5252;
        }

        /* Hidden file input */
        .hidden-file-input {
          display: none;
        }

        /* Effects Panel */
        .effects-panel {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 300px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          padding: 16px;
          z-index: 200;
          box-shadow: var(--shadow-medium);
        }

        .effects-panel h4 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 14px;
        }

        .effect-control {
          margin-bottom: 12px;
        }

        .effect-control label {
          display: block;
          font-size: 12px;
          margin-bottom: 4px;
          color: var(--editor-text-primary);
        }

        .effect-control input[type="range"] {
          width: 100%;
          height: 4px;
          background: var(--editor-bg-dark);
          border-radius: 2px;
          outline: none;
          appearance: none;
        }

        .effect-control input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
        }

        /* Scrollbar Styling */
        .timeline-tracks-scroll::-webkit-scrollbar,
        .timeline-ruler-scroll::-webkit-scrollbar,
        .track-headers-column::-webkit-scrollbar,
        .editor-left-panel::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .timeline-tracks-scroll::-webkit-scrollbar-track,
        .timeline-ruler-scroll::-webkit-scrollbar-track,
        .track-headers-column::-webkit-scrollbar-track,
        .editor-left-panel::-webkit-scrollbar-track {
          background: var(--editor-bg-dark);
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb,
        .track-headers-column::-webkit-scrollbar-thumb,
        .editor-left-panel::-webkit-scrollbar-thumb {
          background: var(--editor-border-light);
          border-radius: 6px;
          border: 2px solid var(--editor-bg-dark);
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb:hover,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb:hover,
        .track-headers-column::-webkit-scrollbar-thumb:hover,
        .editor-left-panel::-webkit-scrollbar-thumb:hover {
          background: var(--editor-text-secondary);
        }

        .timeline-tracks-scroll::-webkit-scrollbar-corner,
        .timeline-ruler-scroll::-webkit-scrollbar-corner {
          background: var(--editor-bg-dark);
        }

        /* Animation for smooth interactions */
        @keyframes clipSelect {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        .timeline-clip.selected {
          animation: clipSelect 0.3s ease;
        }

        @keyframes transitionAdd {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }

        .timeline-transition {
          animation: transitionAdd 0.2s ease;
        }

        /* Focus styles for accessibility */
        .tool-btn:focus,
        .control-btn-small:focus,
        .control-btn-play-small:focus,
        .timeline-option-btn:focus,
        .track-toggle-btn:focus {
          outline: 2px solid var(--editor-accent-blue);
          outline-offset: 2px;
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .editor-left-panel {
            width: 200px;
            min-width: 200px;
          }
          
          .track-headers-spacer,
          .track-headers-column {
            width: 200px;
            min-width: 200px;
          }
          
          .transitions-panel,
          .effects-panel {
            width: 250px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoEditorComponent;