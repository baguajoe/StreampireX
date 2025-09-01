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
    title: 'My Video Project',
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
          type: 'video',
          effects: [] // Store applied effects
        },
        {
          id: 3,
          title: 'Second_Clip.mp4',
          startTime: 160,
          duration: 80,
          type: 'video',
          effects: []
        }
      ],
      transitions: [
        {
          id: 1,
          type: 'crossDissolve',
          startTime: 148,
          duration: 2,
          fromClip: 1,
          toClip: 3
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
          duration: 180,
          type: 'audio',
          effects: []
        }
      ],
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
  const [zoom, setZoom] = useState(1);

  // User tier
  const [userTier] = useState('premium');

  // UI state
  const [showSnapToGrid, setShowSnapToGrid] = useState(true);
  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);
  const [activeEffects, setActiveEffects] = useState({});
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [draggedTransition, setDraggedTransition] = useState(null);
  const [draggedEffect, setDraggedEffect] = useState(null);
  
  // Dropdown states for organized sections
  const [showVideoEffects, setShowVideoEffects] = useState(true);
  const [showAudioEffects, setShowAudioEffects] = useState(true);
  const [showTransitions, setShowTransitions] = useState(true);

  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);

  // Tools configuration
  const tools = [
    { id: 'select', icon: MousePointer, name: 'Selection Tool' },
    { id: 'razor', icon: Scissors, name: 'Razor Tool' },
    { id: 'hand', icon: Hand, name: 'Hand Tool' },
    { id: 'text', icon: Type, name: 'Text Tool' }
  ];

  // Effects library organized by category
  const videoEffects = [
    { id: 'brightness', name: 'Brightness', icon: Sun, category: 'color' },
    { id: 'contrast', name: 'Contrast', icon: Contrast, category: 'color' },
    { id: 'saturation', name: 'Saturation', icon: Droplets, category: 'color' },
    { id: 'blur', name: 'Blur', icon: Circle, category: 'filter' },
    { id: 'sharpen', name: 'Sharpen', icon: Zap, category: 'filter' }
  ];

  const audioEffects = [
    { id: 'reverb', name: 'Reverb', icon: AudioWaveform, category: 'audio' },
    { id: 'echo', name: 'Echo', icon: RefreshCw, category: 'audio' },
    { id: 'compressor', name: 'Compressor', icon: Minimize2, category: 'audio' },
    { id: 'limiter', name: 'Limiter', icon: Maximize2, category: 'audio' },
    { id: 'equalizer', name: 'Equalizer', icon: Sliders, category: 'audio' },
    { id: 'noiseReduction', name: 'Noise Reduction', icon: Filter, category: 'audio' },
    { id: 'bassBoost', name: 'Bass Boost', icon: Volume2, category: 'audio' },
    { id: 'chorus', name: 'Chorus', icon: Copy, category: 'audio' },
    { id: 'delay', name: 'Delay', icon: SkipForward, category: 'audio' },
    { id: 'distortion', name: 'Distortion', icon: Zap, category: 'audio' },
    { id: 'pitchShift', name: 'Pitch Shift', icon: ChevronUp, category: 'audio' },
    { id: 'highPass', name: 'High Pass Filter', icon: ChevronUp, category: 'audio' },
    { id: 'lowPass', name: 'Low Pass Filter', icon: ChevronDown, category: 'audio' },
    { id: 'stereoWiden', name: 'Stereo Widener', icon: Maximize2, category: 'audio' },
    { id: 'gateExpander', name: 'Gate/Expander', icon: Volume2, category: 'audio' }
  ];

  // Combine for compatibility
  const effects = [...videoEffects, ...audioEffects];

  // Transitions library
  const transitions = [
    { id: 'crossDissolve', name: 'Cross Dissolve', icon: Layers, duration: 1 },
    { id: 'fade', name: 'Fade to Black', icon: Circle, duration: 0.5 },
    { id: 'wipeLeft', name: 'Wipe Left', icon: Move, duration: 1 },
    { id: 'wipeRight', name: 'Wipe Right', icon: Move, duration: 1 },
    { id: 'slideLeft', name: 'Slide Left', icon: ChevronDown, duration: 1 },
    { id: 'slideRight', name: 'Slide Right', icon: ChevronUp, duration: 1 },
    { id: 'zoomIn', name: 'Zoom In', icon: ZoomIn, duration: 1 },
    { id: 'zoomOut', name: 'Zoom Out', icon: ZoomOut, duration: 1 },
    { id: 'spin', name: 'Spin', icon: RotateCw, duration: 1.5 },
    { id: 'flip', name: 'Flip', icon: FlipHorizontal, duration: 0.75 }
  ];

  // Media library
  const [mediaLibrary] = useState([
    { id: 1, name: 'Interview_Setup.mp4', type: 'video', duration: '5:23' },
    { id: 2, name: 'Background_Music.wav', type: 'audio', duration: '3:45' },
    { id: 3, name: 'Logo_Animation.mov', type: 'video', duration: '0:08' }
  ]);

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

  // Effect application function
  const applyEffect = (clipId, effectId, value) => {
    setActiveEffects(prev => ({
      ...prev,
      [clipId]: {
        ...prev[clipId],
        [effectId]: value
      }
    }));

    // Also update the clips array to store applied effects
    setTracks(prevTracks => 
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => 
          clip.id === clipId 
            ? {
                ...clip,
                effects: [
                  ...clip.effects.filter(e => e.id !== effectId),
                  { id: effectId, value: parseFloat(value) }
                ]
              }
            : clip
        )
      }))
    );
  };

  // Effect drag and drop handlers
  const handleEffectDragStart = (e, effect) => {
    setDraggedEffect(effect);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleEffectDrop = (e, clipId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedEffect) return;

    // Find the clip and add the effect
    const targetClip = tracks.flatMap(track => track.clips).find(clip => clip.id === clipId);
    if (targetClip) {
      // Apply default effect value
      applyEffect(clipId, draggedEffect.id, 50);
      
      // Select the clip to show effects panel
      setSelectedClip(targetClip);
      setShowEffectsPanel(true);
      
      console.log(`Applied ${draggedEffect.name} to ${targetClip.title}`);
    }
    
    setDraggedEffect(null);
  };

  const handleEffectDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
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

  // Close effects panel
  const closeEffectsPanel = () => {
    setShowEffectsPanel(false);
    setSelectedClip(null);
    setSelectedTransition(null);
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

            {/* Video Effects Section */}
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
                <div className="effect-list">
                  {videoEffects.map(effect => {
                    const Icon = effect.icon;
                    return (
                      <div 
                        key={effect.id} 
                        className="effect-item"
                        draggable
                        onDragStart={(e) => handleEffectDragStart(e, effect)}
                        title={`Drag to apply ${effect.name} effect`}
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

            {/* Audio Effects Section */}
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
                <div className="effect-list">
                  {audioEffects.map(effect => {
                    const Icon = effect.icon;
                    return (
                      <div 
                        key={effect.id} 
                        className="effect-item"
                        draggable
                        onDragStart={(e) => handleEffectDragStart(e, effect)}
                        title={`Drag to apply ${effect.name} effect`}
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

            {/* Video Transitions Section */}
            <div className="toolbar-section">
              <div 
                className="section-header"
                onClick={() => setShowTransitions(!showTransitions)}
              >
                <h4>Video Transitions</h4>
                <button className="dropdown-toggle">
                  {showTransitions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
              {showTransitions && (
                <div className="transition-grid">
                  {transitions.map(transition => {
                    const Icon = transition.icon;
                    return (
                      <div
                        key={transition.id}
                        className="transition-item"
                        draggable
                        onDragStart={(e) => handleTransitionDragStart(e, transition)}
                        title={`${transition.name} (${transition.duration}s)`}
                      >
                        <div className="transition-icon">
                          <Icon size={14} />
                        </div>
                        <div className="transition-info">
                          <div className="transition-name">{transition.name}</div>
                          <div className="transition-duration">{transition.duration}s</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  >
                    {/* Playhead */}
                    <div 
                      className="timeline-playhead"
                      style={{ left: `${currentTime * 2 * zoom}px` }}
                    />

                    {/* Track Rows */}
                    {tracks.map((track, index) => (
                      <div key={track.id} className="timeline-track-row">
                        <div 
                          className="track-timeline-area"
                          onDrop={(e) => handleTimelineDrop(e, track.id)}
                          onDragOver={handleTimelineDragOver}
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
                                    className={`timeline-clip ${selectedClip?.id === clip.id ? 'selected' : ''} ${draggedEffect ? 'drop-target' : ''}`}
                                    style={{
                                      left: `${leftPosition}px`,
                                      width: `${width}px`,
                                      backgroundColor: track.color
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedClip(clip);
                                      setSelectedTransition(null);
                                    }}
                                    onDrop={(e) => handleEffectDrop(e, clip.id)}
                                    onDragOver={handleEffectDragOver}
                                  >
                                    <div className="clip-content-timeline">
                                      <div className="clip-title-timeline">
                                        {clip.title}
                                      </div>
                                      {clip.effects && clip.effects.length > 0 && (
                                        <div className="clip-effects-indicator">
                                          <Sparkles size={10} />
                                          {clip.effects.length}
                                        </div>
                                      )}
                                      {track.type === 'audio' && showAudioWaveforms && (
                                        <div className="audio-waveform">
                                          <AudioWaveform size={12} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              
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

      {/* Effects Panel */}
      {showEffectsPanel && (
        <div className="effects-panel">
          <div className="effects-panel-header">
            <h4>
              {selectedClip 
                ? `Effects for ${selectedClip.title}` 
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
            <div className="effects-panel-content">
              <div className="applied-effects">
                <h5>Applied Effects ({selectedClip.effects?.length || 0})</h5>
                {selectedClip.effects && selectedClip.effects.length > 0 ? (
                  selectedClip.effects.map(appliedEffect => {
                    const effectData = effects.find(e => e.id === appliedEffect.id);
                    return (
                      <div key={appliedEffect.id} className="applied-effect-item">
                        <div className="applied-effect-info">
                          <span>{effectData?.name || appliedEffect.id}</span>
                          <span className="effect-value">{appliedEffect.value}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={appliedEffect.value}
                          onChange={(e) => applyEffect(selectedClip.id, appliedEffect.id, e.target.value)}
                          className="effect-slider"
                        />
                      </div>
                    );
                  })
                ) : (
                  <p className="no-effects-message">No effects applied. Drag effects from the left panel onto clips.</p>
                )}
              </div>
              
              <div className="available-effects-quick">
                <h5>Quick Apply</h5>
                <div className="quick-effects-grid">
                  {effects.filter(effect => 
                    selectedClip.type === 'video' ? videoEffects.includes(effect) : audioEffects.includes(effect)
                  ).slice(0, 6).map(effect => {
                    const Icon = effect.icon;
                    return (
                      <button 
                        key={effect.id}
                        className="quick-effect-btn"
                        onClick={() => applyEffect(selectedClip.id, effect.id, 50)}
                      >
                        <Icon size={12} />
                        {effect.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : selectedTransition ? (
            <div className="effects-panel-content">
              <div className="effect-control">
                <label>Duration (seconds)</label>
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
                />
              </div>
              <div className="effect-control">
                <label>Ease In</label>
                <input type="range" min="0" max="100" defaultValue="50" />
              </div>
              <div className="effect-control">
                <label>Ease Out</label>
                <input type="range" min="0" max="100" defaultValue="50" />
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <p>Select a clip or transition on the timeline to apply effects</p>
              <div className="effects-help">
                <h5>How to use effects:</h5>
                <ul>
                  <li>Drag effects from left panel onto clips</li>
                  <li>Click clips to adjust applied effects</li>
                  <li>Use quick apply buttons for common effects</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        /* Professional Video Editor CSS - Premiere Pro Style */

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

        /* Collapsible Section Headers */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 4px 0;
          margin-bottom: 12px;
          border-radius: 3px;
          transition: var(--transition-fast);
        }

        .section-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .section-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dropdown-toggle {
          background: none;
          border: none;
          color: var(--editor-text-secondary);
          cursor: pointer;
          padding: 2px;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .dropdown-toggle:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
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
          position: relative;
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

        .drag-hint {
          position: absolute;
          right: 8px;
          font-size: 10px;
          opacity: 0.6;
        }

        /* Timeline Clip Drop Target */
        .timeline-clip.drop-target {
          filter: brightness(1.2) !important;
          border: 2px dashed var(--editor-accent-green) !important;
        }

        .clip-effects-indicator {
          position: absolute;
          top: 2px;
          right: 2px;
          background: var(--editor-accent-orange);
          color: white;
          border-radius: 8px;
          padding: 1px 4px;
          font-size: 9px;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* Transitions Grid */
        .transition-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .transition-item {
          padding: 8px 10px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: var(--transition-fast);
          font-size: 12px;
        }

        .transition-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-purple);
          box-shadow: var(--shadow-light);
        }

        .transition-item:active {
          cursor: grabbing;
          transform: scale(0.98);
        }

        .transition-icon {
          color: var(--editor-accent-purple);
          background: rgba(177, 128, 215, 0.15);
          border-radius: 3px;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .transition-info {
          flex: 1;
        }

        .transition-name {
          font-weight: 500;
          color: var(--editor-text-primary);
          line-height: 1.2;
        }

        .transition-duration {
          font-size: 10px;
          color: var(--editor-text-muted);
          margin-top: 2px;
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
          position: relative;
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

        /* Timeline Transitions */
        .timeline-transition {
          position: absolute;
          top: 6px;
          height: 36px;
          background: linear-gradient(135deg, var(--editor-accent-purple) 0%, rgba(177, 128, 215, 0.8) 100%);
          border: 1px solid var(--editor-accent-purple);
          border-radius: 6px;
          cursor: pointer;
          overflow: hidden;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-light);
          z-index: 10;
        }

        .timeline-transition:hover {
          filter: brightness(1.1);
          box-shadow: var(--shadow-medium);
          transform: translateY(-1px);
        }

        .timeline-transition.selected {
          border-color: white;
          box-shadow: 0 0 0 2px var(--editor-accent-blue), var(--shadow-medium);
          z-index: 20;
        }

        .transition-content {
          height: 100%;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.2);
          color: white;
        }

        .transition-label {
          font-size: 10px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80px;
        }

        /* Transition drag feedback */
        .transition-item.dragging {
          opacity: 0.6;
          transform: scale(0.95);
        }

        .track-timeline-area.drag-over {
          background: rgba(177, 128, 215, 0.1);
          border: 2px dashed var(--editor-accent-purple);
          border-radius: 4px;
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
          width: 320px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          z-index: 200;
          box-shadow: var(--shadow-heavy);
          max-height: calc(100vh - 100px);
          overflow-y: auto;
        }

        .effects-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid var(--editor-border);
          background: var(--editor-bg-darker);
          border-radius: 6px 6px 0 0;
        }

        .effects-panel-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
        }

        .close-panel-btn {
          background: none;
          border: none;
          color: var(--editor-text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .close-panel-btn:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
        }

        .effects-panel-content {
          padding: 16px;
        }

        .applied-effects h5,
        .available-effects-quick h5 {
          margin: 0 0 12px 0;
          color: var(--editor-text-bright);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .applied-effect-item {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .applied-effect-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .applied-effect-info span {
          font-size: 12px;
          color: var(--editor-text-primary);
        }

        .effect-value {
          background: var(--editor-accent-blue);
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 500;
        }

        .effect-slider {
          width: 100%;
          height: 6px;
          background: var(--editor-bg-darker);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        .effect-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: var(--shadow-light);
        }

        .no-effects-message {
          color: var(--editor-text-secondary);
          font-size: 12px;
          text-align: center;
          padding: 20px;
          background: var(--editor-bg-dark);
          border-radius: 4px;
          border: 1px dashed var(--editor-border);
        }

        .quick-effects-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-top: 12px;
        }

        .quick-effect-btn {
          padding: 8px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          color: var(--editor-text-primary);
          cursor: pointer;
          font-size: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: var(--transition-fast);
        }

        .quick-effect-btn:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-blue);
        }

        .available-effects-quick {
          margin-top: 20px;
        }

        .no-selection-message {
          text-align: center;
          color: var(--editor-text-secondary);
          padding: 20px;
        }

        .no-selection-message p {
          margin: 0 0 16px 0;
          font-size: 13px;
        }

        .effects-help h5 {
          margin: 0 0 8px 0;
          color: var(--editor-text-bright);
          font-size: 12px;
        }

        .effects-help ul {
          margin: 0;
          padding-left: 16px;
          list-style: none;
          text-align: left;
        }

        .effects-help li {
          font-size: 11px;
          color: var(--editor-text-secondary);
          margin-bottom: 4px;
          position: relative;
        }

        .effects-help li::before {
          content: '•';
          color: var(--editor-accent-blue);
          margin-right: 8px;
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
        .editor-left-panel::-webkit-scrollbar,
        .effects-panel::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .timeline-tracks-scroll::-webkit-scrollbar-track,
        .timeline-ruler-scroll::-webkit-scrollbar-track,
        .track-headers-column::-webkit-scrollbar-track,
        .editor-left-panel::-webkit-scrollbar-track,
        .effects-panel::-webkit-scrollbar-track {
          background: var(--editor-bg-dark);
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb,
        .track-headers-column::-webkit-scrollbar-thumb,
        .editor-left-panel::-webkit-scrollbar-thumb,
        .effects-panel::-webkit-scrollbar-thumb {
          background: var(--editor-border-light);
          border-radius: 4px;
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb:hover,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb:hover,
        .track-headers-column::-webkit-scrollbar-thumb:hover,
        .editor-left-panel::-webkit-scrollbar-thumb:hover,
        .effects-panel::-webkit-scrollbar-thumb:hover {
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

        @keyframes effectApplied {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        .clip-effects-indicator {
          animation: effectApplied 0.4s ease;
        }

        /* Focus styles for accessibility */
        .tool-btn:focus,
        .control-btn-small:focus,
        .control-btn-play-small:focus,
        .timeline-option-btn:focus,
        .track-toggle-btn:focus,
        .quick-effect-btn:focus,
        .close-panel-btn:focus {
          outline: 2px solid var(--editor-accent-blue);
          outline-offset: 2px;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .effects-panel {
            width: 280px;
          }
        }

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
          
          .effects-panel {
            width: 250px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoEditorComponent;