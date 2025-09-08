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
  RefreshCw, SkipForward, Rewind, FastForward, Monitor, Camera,
  RotateCcw as Rotate, Maximize, ArrowUpDown, ArrowLeftRight,
  Disc, Radio, Gauge, Waves, Shuffle, TrendingUp, Target, Crosshair,
  Aperture, Focus, Flashlight, Rainbow, Paintbrush, Brush, Scissors as Cut,
  Wind, Snowflake, Flame, Lightbulb, Globe, Magnet, Binary, Hash, Code,
  Hexagon, Triangle, Square as SquareIcon, Diamond, Octagon, Pentagon,
  Activity, BarChart, PieChart, LineChart, AreaChart, Thermometer,
  Wifi, WifiOff, Bluetooth, Radio as RadioIcon, Mic, MicOff, Speaker, Headphones,
  Volume1, Volume, VolumeX as Mute, Bell, BellOff, PlayCircle, PauseCircle
} from 'lucide-react';

// Backend URL configuration
const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// Audio Effects API Integration Functions
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
      clips: [
        {
          id: 1,
          title: 'Main_Clip.mp4',
          startTime: 30,
          duration: 120,
          type: 'video',
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
        },
        {
          id: 3,
          title: 'Second_Clip.mp4',
          startTime: 160,
          duration: 80,
          type: 'video',
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
      name: 'Overlay 1',
      type: 'video',
      visible: true,
      muted: true,
      locked: false,
      color: '#ff6b6b',
      zIndex: 3,
      clips: [
        {
          id: 4,
          title: 'Logo_Overlay.png',
          startTime: 50,
          duration: 200,
          type: 'video',
          effects: [
            { id: 'dropShadow', value: 25, enabled: true },
            { id: 'glow', value: 40, enabled: true }
          ],
          keyframes: [],
          compositing: {
            opacity: 75,
            blendMode: 'overlay',
            position: { x: 300, y: -200 },
            scale: { x: 50, y: 50 },
            rotation: 0,
            anchor: { x: 50, y: 50 }
          }
        }
      ],
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
      clips: [
        {
          id: 2,
          title: 'Background_Music.wav',
          startTime: 30,
          duration: 180,
          type: 'audio',
          effects: [
            { id: 'reverb', value: 30, enabled: true },
            { id: 'compressor', value: 60, enabled: true }
          ],
          keyframes: [],
          compositing: {
            opacity: 100,
            blendMode: 'normal',
            position: { x: 0, y: 0 },
            scale: { x: 100, y: 100 },
            rotation: 0,
            anchor: { x: 50, y: 50 }
          }
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

  // Add these state variables with your existing ones

  const [snapGridSize, setSnapGridSize] = useState(5);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  // User tier
  const [userTier] = useState('professional');

  // UI state
  const [showSnapToGrid, setShowSnapToGrid] = useState(true);
  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);
  const [activeEffects, setActiveEffects] = useState({});
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showCompositingPanel, setShowCompositingPanel] = useState(false);
  const [showColorGrading, setShowColorGrading] = useState(false);
  const [showAudioMixing, setShowAudioMixing] = useState(false);
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [draggedTransition, setDraggedTransition] = useState(null);
  const [draggedEffect, setDraggedEffect] = useState(null);
  const [audioPresets, setAudioPresets] = useState({});

  // Dropdown states for organized sections
  const [showVideoEffects, setShowVideoEffects] = useState(true);
  const [showAudioEffects, setShowAudioEffects] = useState(true);
  const [showTransitions, setShowTransitions] = useState(true);
  const [showCompositing, setShowCompositing] = useState(true);
  const [showColorCorrection, setShowColorCorrection] = useState(true);
  const [showMotionGraphics, setShowMotionGraphics] = useState(true);
  const [showDistortion, setShowDistortion] = useState(true);
  const [showGenerator, setShowGenerator] = useState(true);
  const [showKeying, setShowKeying] = useState(true);

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
    { id: 'lens', name: 'Lens Flare', icon: Star, category: 'lighting', description: 'Camera lens flare' },

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

  // Media library
  const [mediaLibrary] = useState([
    { id: 1, name: 'Interview_Setup.mp4', type: 'video', duration: '5:23' },
    { id: 2, name: 'Background_Music.wav', type: 'audio', duration: '3:45' },
    { id: 3, name: 'Logo_Animation.mov', type: 'video', duration: '0:08' },
    { id: 4, name: 'Overlay_Graphics.png', type: 'image', duration: '0:00' },
    { id: 5, name: 'Voice_Over.wav', type: 'audio', duration: '2:15' },
    { id: 6, name: 'B_Roll_Footage.mp4', type: 'video', duration: '8:42' }
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
  const applyEffect = async (clipId, effectId, value) => {
    // Find the clip to determine if it's audio or video
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip) {
      console.error('Clip not found');
      return;
    }

    // If it's an audio clip or audio effect, use backend API
    if (clip.type === 'audio' || audioEffects.some(e => e.id === effectId)) {
      try {
        // Show loading indicator
        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [`${effectId}_loading`]: true
          }
        }));

        // Apply effect via backend
        const result = await applyAudioEffect(clipId, effectId, value);

        if (result.success) {
          // Update the clip with the new processed audio URL
          setTracks(prevTracks =>
            prevTracks.map(track => ({
              ...track,
              clips: track.clips.map(c =>
                c.id === clipId
                  ? {
                    ...c,
                    file_url: result.processed_audio_url, // Update with processed audio
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

        // Remove loading state
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

        // Remove loading state
        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [`${effectId}_loading`]: false
          }
        }));

        // Show error notification
        alert(`Failed to apply ${effectId}: ${error.message}`);
        return;
      }
    } else {
      // For video effects, use the existing local logic
      setActiveEffects(prev => ({
        ...prev,
        [clipId]: {
          ...prev[clipId],
          [effectId]: value
        }
      }));

      setTracks(prevTracks =>
        prevTracks.map(track => ({
          ...track,
          clips: track.clips.map(c =>
            c.id === clipId
              ? {
                ...c,
                effects: [
                  ...c.effects.filter(e => e.id !== effectId),
                  { id: effectId, value: parseFloat(value), enabled: true }
                ]
              }
              : c
          )
        }))
      );

      console.log(`✅ Applied ${effectId} to video clip ${clipId} with intensity ${value}%`);
    }
  };

  // Enhanced Effect Preview Function
  const previewEffect = async (clipId, effectId, intensity) => {
    const clip = tracks.flatMap(track => track.clips).find(c => c.id === clipId);

    if (!clip) return;

    // Only preview audio effects via backend
    if (clip.type === 'audio' || audioEffects.some(e => e.id === effectId)) {
      try {
        const result = await previewAudioEffect(clipId, effectId, intensity);

        if (result.success && result.preview_audio) {
          // Play the preview audio
          const audio = new Audio(result.preview_audio);
          audio.play();

          // Store preview for potential application
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
    } else {
      // For video effects, just apply temporarily (could be enhanced later)
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
        // Update UI to show suggestions
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
          // Update clip with processed audio
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
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
          clip.id === clipId
            ? {
              ...clip,
              effects: clip.effects.filter(e => e.id !== effectId)
            }
            : clip
        )
      }))
    );
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
    setDraggedEffect(effect);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleEffectDrop = (e, clipId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEffect) return;

    const targetClip = tracks.flatMap(track => track.clips).find(clip => clip.id === clipId);
    if (targetClip) {
      applyEffect(clipId, draggedEffect.id, 50);
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
    const frames = Math.floor((seconds % 1) * 30);

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

    setDraggedClip({ ...clip, trackId });
    setDragOffset(clickX - clipStartPixel);
    setSelectedClip(clip);
  };

  const handleMouseMove = (e) => {
    if (!draggedClip || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const timelineWidth = rect.width;

    let newTime = ((mouseX - dragOffset) / timelineWidth) * duration;
    newTime = snapToGrid(newTime);
    newTime = checkCollisions(draggedClip.trackId, draggedClip.id, newTime, draggedClip.duration);

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
  };

  const handleMouseUp = () => {
    setDraggedClip(null);
    setDragOffset(0);
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
          <div className="workspace-buttons">
            <button
              className={`workspace-btn ${showColorGrading ? 'active' : ''}`}
              onClick={() => setShowColorGrading(!showColorGrading)}
            >
              <Palette size={14} />
              Color
            </button>
            <button
              className={`workspace-btn ${showAudioMixing ? 'active' : ''}`}
              onClick={() => setShowAudioMixing(!showAudioMixing)}
            >
              <Volume2 size={14} />
              Audio
            </button>
            <button
              className={`workspace-btn ${showKeyframes ? 'active' : ''}`}
              onClick={() => setShowKeyframes(!showKeyframes)}
            >
              <Activity size={14} />
              Motion
            </button>
          </div>
          <button className="export-btn-top">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="editor-main-layout">
        {/* Left Panel - Tools & Effects */}
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
                              className="effect-item"
                              draggable
                              onDragStart={(e) => handleEffectDragStart(e, effect)}
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
                              title={effect.description}
                            >
                              <Icon size={14} />
                              <span>{effect.name}</span>
                              <div className="effect-controls">
                                {/* Preview button */}
                                <button
                                  className="preview-btn"
                                  onClick={() => selectedClip && previewEffect(selectedClip.id, effect.id, 50)}
                                  title="Preview Effect"
                                  disabled={!selectedClip || selectedClip.type !== 'audio'}
                                >
                                  <Play size={10} />
                                </button>
                                {/* Quick apply button */}
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
                          return (
                            <div
                              key={transition.id}
                              className="transition-item"
                              draggable
                              onDragStart={(e) => handleTransitionDragStart(e, transition)}
                              title={`${transition.name} (${transition.duration}s)`}
                            >
                              <div className="transition-icon">
                                <Icon size={12} />
                              </div>
                              <div className="transition-info">
                                <div className="transition-name">{transition.name}</div>
                                <div className="transition-duration">{transition.duration}s</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                accept="video/*,audio/*,image/*"
                multiple
              />
              <div className="media-list">
                {mediaLibrary.map(media => {
                  const Icon = media.type === 'video' ? Video : media.type === 'audio' ? AudioWaveform : Image;
                  return (
                    <div key={media.id} className="media-item">
                      <Icon size={14} />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '500' }}>{media.name}</div>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>{media.duration}</div>
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
                    {selectedClip && selectedClip.type === 'video' && (
                      <div className="preview-overlay-info">
                        <div className="preview-clip-name">{selectedClip.title}</div>
                        <div className="preview-compositing-info">
                          Opacity: {selectedClip.compositing?.opacity || 100}% |
                          Blend: {selectedClip.compositing?.blendMode || 'normal'} |
                          Effects: {selectedClip.effects?.length || 0}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Safe area guides and vectorscope overlay */}
                  <div className="safe-area-guides">
                    <div className="safe-area-outer"></div>
                    <div className="safe-area-inner"></div>
                    {showColorGrading && (
                      <div className="vectorscope-overlay">
                        <div className="vectorscope-circle"></div>
                        <div className="vectorscope-info">Vectorscope</div>
                      </div>
                    )}
                  </div>
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
                  {tracks.sort((a, b) => b.zIndex - a.zIndex).map(track => (
                    <div key={track.id} className="track-header-container">
                      <div className="track-controls-left">
                        <div className="track-label-container">
                          <div className="track-type-icon-container">
                            <div className="track-type-icon">
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
                          <div className="track-info">
                            <div className="track-name-label">{track.name}</div>
                            <div className="track-z-index">Layer {track.zIndex}</div>
                          </div>
                        </div>
                        <div className="track-control-buttons">
                          <button
                            className="track-layer-btn"
                            onClick={() => moveTrackUp(track.id)}
                            title="Move layer up"
                          >
                            <ChevronUp size={10} />
                          </button>
                          <button
                            className="track-layer-btn"
                            onClick={() => moveTrackDown(track.id)}
                            title="Move layer down"
                          >
                            <ChevronDown size={10} />
                          </button>
                          <button
                            className={`track-toggle-btn ${track.muted ? '' : 'active'}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t))}
                          >
                            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>
                          <button
                            className={`track-toggle-btn ${track.visible ? 'active' : ''}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, visible: !t.visible } : t))}
                          >
                            {track.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            className={`track-toggle-btn ${track.locked ? 'active' : ''}`}
                            onClick={() => setTracks(tracks.map(t => t.id === track.id ? { ...t, locked: !t.locked } : t))}
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
                                    onDrop={(e) => handleEffectDrop(e, clip.id)}
                                    onDragOver={handleEffectDragOver}
                                  >
                                    <div className="clip-content-timeline">
                                      <div className="clip-title-timeline">
                                        {clip.title}
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

      {/* Comprehensive Styles */}
      <style jsx>{`
        /* Enhanced Professional Video Editor Styles */
        
        :root {
          --editor-bg-dark: #1e1e1e;
          --editor-bg-darker: #181818;
          --editor-bg-panel: #2d2d30;
          --editor-bg-hover: #3e3e42;
          --editor-bg-selected: #0e639c;
          --editor-border: #3f3f46;
          --editor-border-light: #4b4b52;
          
          --editor-text-primary: #cccccc;
          --editor-text-secondary: #969696;
          --editor-text-muted: #6d6d6d;
          --editor-text-bright: #ffffff;
          
          --editor-accent-blue: #007acc;
          --editor-accent-green: #00d4aa;
          --editor-accent-red: #ff6b6b;
          --editor-accent-orange: #ff9500;
          --editor-accent-purple: #b180d7;
          --editor-accent-yellow: #ffd700;
          
          --timeline-bg: #1e2127;
          --timeline-ruler: #2a2d35;
          --timeline-header: #252830;
          
          --playhead-color: #ffd700;
          --playhead-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
          
          --shadow-light: 0 2px 4px rgba(0, 0, 0, 0.2);
          --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.3);
          --shadow-heavy: 0 8px 16px rgba(0, 0, 0, 0.4);
          
          --transition-fast: all 0.15s ease;
          --transition-smooth: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

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

        /* Enhanced Menu Bar */
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

        .workspace-buttons {
          display: flex;
          gap: 8px;
          margin-right: 20px;
        }

        .workspace-btn {
          padding: 8px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          color: var(--editor-text-secondary);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          transition: var(--transition-fast);
        }

        .workspace-btn:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
        }

        .workspace-btn.active {
          background: var(--editor-accent-blue);
          border-color: var(--editor-accent-blue);
          color: white;
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
          background: linear-gradient(135deg, var(--editor-accent-purple), var(--editor-accent-blue));
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          color: white;
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
          background: var(--editor-accent-green);
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

        /* Main Layout */
        .editor-main-layout {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        /* Enhanced Left Panel */
        .editor-left-panel {
          width: 280px;
          min-width: 280px;
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
          gap: 20px;
        }

        .toolbar-section h4 {
          margin: 0 0 12px 0;
          color: var(--editor-text-bright);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 6px 8px;
          margin-bottom: 12px;
          border-radius: 4px;
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
          padding: 4px;
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
          width: 52px;
          height: 48px;
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

        /* Workspace Quick Access */
        .workspace-quick-access {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .workspace-access-btn {
          width: 100%;
          padding: 10px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          color: var(--editor-text-primary);
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
        }

        .workspace-access-btn:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-blue);
        }

        /* Enhanced Effects Organization */
        .effects-organized,
        .transitions-organized {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .effect-category,
        .transition-category {
          background: var(--editor-bg-darker);
          border-radius: 4px;
          overflow: hidden;
        }

        .category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--editor-bg-hover);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          color: var(--editor-text-bright);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .category-toggle {
          background: none;
          border: none;
          color: var(--editor-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .effect-list-category,
        .transition-list-category {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .effect-item {
          padding: 8px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
          font-size: 12px;
          position: relative;
        }

        .effect-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-blue);
        }

        .effect-item:active {
          cursor: grabbing;
        }

        .effect-controls {
          display: flex;
          gap: 4px;
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .effect-item:hover .effect-controls {
          opacity: 1;
        }

        .preview-btn,
        .quick-apply-btn {
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 3px;
          background: var(--editor-accent-blue);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          transition: all 0.15s ease;
        }

        .preview-btn:hover {
          background: var(--editor-accent-green);
        }

        .quick-apply-btn:hover {
          background: var(--editor-accent-purple);
        }

        .preview-btn:disabled,
        .quick-apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .suggest-btn {
          background: linear-gradient(135deg, var(--editor-accent-purple), var(--editor-accent-blue));
        }

        .loading-effect {
          opacity: 0.6;
          position: relative;
        }

        .loading-effect::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .drag-hint {
          position: absolute;
          right: 8px;
          font-size: 10px;
          opacity: 0.5;
        }

        .transition-item {
          padding: 6px 8px;
          background: var(--editor-bg-dark);
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: var(--transition-fast);
          font-size: 11px;
        }

        .transition-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-purple);
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
          font-size: 9px;
          color: var(--editor-text-muted);
          margin-top: 2px;
        }

        .import-btn {
          width: 100%;
          padding: 12px;
          background: var(--editor-accent-blue);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          transition: var(--transition-fast);
        }

        .import-btn:hover {
          background: var(--editor-bg-selected);
        }

        .media-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .media-item {
          padding: 8px 12px;
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

        .media-item:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-border-light);
        }

        /* Center Panel */
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
          border-radius: 6px;
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
          position: relative;
        }

        .preview-placeholder {
          text-align: center;
          color: var(--editor-text-muted);
          z-index: 1;
        }

        .preview-placeholder p {
          margin: 8px 0 4px 0;
          font-size: 14px;
        }

        .preview-resolution {
          font-size: 12px;
          color: var(--editor-text-secondary);
        }

        .preview-overlay-info {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 4px;
        }

        .preview-clip-name {
          font-size: 12px;
          font-weight: 500;
          color: white;
        }

        .preview-compositing-info {
          font-size: 10px;
          color: var(--editor-text-secondary);
          margin-top: 4px;
        }

        /* Safe Area Guides */
        .safe-area-guides {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .safe-area-outer {
          position: absolute;
          top: 5%;
          left: 5%;
          right: 5%;
          bottom: 5%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .safe-area-inner {
          position: absolute;
          top: 10%;
          left: 10%;
          right: 10%;
          bottom: 10%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .vectorscope-overlay {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 100px;
          height: 100px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        .vectorscope-circle {
          width: 80px;
          height: 80px;
          border: 1px solid var(--editor-accent-green);
          border-radius: 50%;
          position: relative;
        }

        .vectorscope-info {
          font-size: 8px;
          color: var(--editor-text-muted);
          margin-top: 4px;
        }

        .preview-controls {
          height: 44px;
          background: var(--editor-bg-panel);
          border-top: 1px solid var(--editor-border);
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
        }

        .preview-control-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
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
          min-width: 40px;
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
          min-height: 280px;
          resize: vertical;
          overflow: hidden;
        }

        .timeline-controls-bar {
          height: 40px;
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
          gap: 10px;
        }

        .zoom-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
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
          width: 120px;
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
          width: 16px;
          height: 16px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
        }

        .zoom-display-pro {
          font-size: 11px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
          min-width: 40px;
        }

        .timeline-options {
          display: flex;
          gap: 0;
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
          border-radius: 4px 0 0 4px;
        }

        .timeline-option-btn:not(:first-child):not(:last-child) {
          border-left: none;
        }

        .timeline-option-btn:last-child {
          border-radius: 0 4px 4px 0;
          border-left: none;
        }

        .timeline-option-btn.active {
          background: var(--editor-accent-blue);
          border-color: var(--editor-accent-blue);
          color: white;
        }

        .timeline-option-btn:hover:not(.active) {
          background: var(--editor-bg-hover);
        }

        /* Timeline Main */
        .timeline-main-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .timeline-ruler-container {
          height: 36px;
          display: flex;
          background: var(--timeline-ruler);
          border-bottom: 1px solid var(--editor-border);
          flex-shrink: 0;
        }

        .track-headers-spacer {
          width: 280px;
          min-width: 280px;
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
          height: 14px;
          background: var(--editor-border-light);
        }

        .time-marker-text {
          font-size: 10px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
          margin-top: 6px;
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
          top: -8px;
          left: -6px;
          width: 14px;
          height: 16px;
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
          width: 280px;
          min-width: 280px;
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
          height: 52px;
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
          gap: 10px;
          flex: 1;
        }

        .track-info {
          flex: 1;
        }

        .track-name-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--editor-text-bright);
          line-height: 1.2;
        }

        .track-z-index {
          font-size: 10px;
          color: var(--editor-text-muted);
          margin-top: 2px;
        }

        .track-type-icon {
          color: var(--editor-text-secondary);
        }

        .track-control-buttons {
          display: flex;
          gap: 2px;
        }

        .track-layer-btn,
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

        .track-layer-btn:hover,
        .track-toggle-btn:hover {
          background: var(--editor-bg-hover);
        }

        .track-toggle-btn.active {
          color: var(--editor-accent-blue);
        }

        .track-layer-btn {
          color: var(--editor-text-muted);
        }

        .track-layer-btn:hover {
          color: var(--editor-text-primary);
        }

        /* Timeline Tracks */
        .timeline-track-row {
          height: 52px;
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
          top: 6px;
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

        .timeline-clip.drop-target {
          filter: brightness(1.2) !important;
          border: 2px dashed var(--editor-accent-green) !important;
        }

        .clip-content-timeline {
          height: 100%;
          padding: 6px 10px;
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

        .clip-compositing-info {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .blend-mode-indicator {
          background: var(--editor-accent-purple);
          color: white;
          border-radius: 6px;
          padding: 1px 4px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .clip-effects-indicator {
          background: var(--editor-accent-orange);
          color: white;
          border-radius: 8px;
          padding: 1px 4px;
          font-size: 9px;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .audio-waveform {
          align-self: flex-end;
          color: rgba(255, 255, 255, 0.7);
        }

        /* Keyframe Indicators */
        .keyframe-indicators {
          position: absolute;
          bottom: 2px;
          left: 4px;
          right: 4px;
          height: 8px;
          display: flex;
          align-items: center;
        }

        .keyframe-diamond {
          position: absolute;
          width: 6px;
          height: 6px;
          background: var(--editor-accent-yellow);
          transform: rotate(45deg);
          border: 1px solid rgba(0, 0, 0, 0.5);
        }

        /* Timeline Transitions */
        .timeline-transition {
          position: absolute;
          top: 8px;
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

        .hidden-file-input {
          display: none;
        }

        /* Enhanced Effects Panel */
        .effects-panel-enhanced {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 380px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 8px;
          z-index: 200;
          box-shadow: var(--shadow-heavy);
          max-height: calc(100vh - 100px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .effects-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--editor-border);
          background: var(--editor-bg-darker);
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }

        .effects-panel-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
          font-weight: 600;
        }

        .close-panel-btn {
          background: none;
          border: none;
          color: var(--editor-text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .close-panel-btn:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
        }

        .effects-panel-content-enhanced {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        /* Effects Stack */
        .effects-stack {
          margin-bottom: 24px;
        }

        .stack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .stack-header h5 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stack-controls {
          display: flex;
          gap: 4px;
        }

        .stack-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: var(--editor-bg-dark);
          color: var(--editor-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .stack-btn:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-text-primary);
        }

        .applied-effects-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .applied-effect-item-enhanced {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          overflow: hidden;
          transition: var(--transition-fast);
        }

        .applied-effect-item-enhanced:hover {
          border-color: var(--editor-accent-blue);
        }

        .effect-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--editor-bg-hover);
        }

        .effect-info-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .effect-toggle {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .effect-toggle.enabled {
          background: var(--editor-accent-blue);
          color: white;
        }

        .effect-toggle.disabled {
          background: var(--editor-bg-dark);
          color: var(--editor-text-muted);
        }

        .effect-toggle:hover {
          opacity: 0.8;
        }

        .effect-details {
          flex: 1;
        }

        .effect-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--editor-text-bright);
          display: block;
          line-height: 1.2;
        }

        .effect-category {
          font-size: 10px;
          color: var(--editor-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .effect-controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .effect-value {
          background: var(--editor-accent-blue);
          color: white;
          padding: 4px 8px;
          border-radius: 10px;
          font-weight: 500;
          font-size: 11px;
          min-width: 40px;
          text-align: center;
        }

        .effect-remove {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: var(--editor-accent-red);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .effect-remove:hover {
          background: #d63447;
        }

        .effect-parameters {
          padding: 16px;
          background: var(--editor-bg-darker);
        }

        .parameter-row {
          margin-bottom: 16px;
        }

        .parameter-row:last-child {
          margin-bottom: 0;
        }

        .parameter-row label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--editor-text-primary);
        }

        .effect-slider-enhanced {
          width: 100%;
          height: 6px;
          background: var(--editor-bg-dark);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          appearance: none;
          transition: var(--transition-fast);
        }

        .effect-slider-enhanced::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: var(--shadow-light);
        }

        .effect-slider-enhanced:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .effect-select {
          width: 100%;
          padding: 8px 12px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          color: var(--editor-text-primary);
          font-size: 12px;
        }

        .color-picker {
          width: 100%;
          height: 36px;
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          cursor: pointer;
        }

        .no-effects-message {
          text-align: center;
          padding: 40px 20px;
          color: var(--editor-text-secondary);
        }

        .no-effects-message p {
          margin: 12px 0 4px 0;
          font-size: 14px;
          color: var(--editor-text-primary);
        }

        .no-effects-message span {
          font-size: 12px;
        }

        /* Quick Apply Section */
        .quick-apply-section {
          margin-bottom: 24px;
        }

        .quick-apply-section h5 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quick-effects-grid-enhanced {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .quick-effect-btn-enhanced {
          padding: 12px 8px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          color: var(--editor-text-primary);
          cursor: pointer;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: var(--transition-fast);
        }

        .quick-effect-btn-enhanced:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-blue);
        }

        .quick-effect-btn-enhanced span {
          text-align: center;
          line-height: 1.2;
        }

        /* Presets Section */
        .presets-section h5 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preset-btn {
          padding: 12px 16px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          color: var(--editor-text-primary);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: var(--transition-fast);
        }

        .preset-btn:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-green);
        }

        .no-selection-message-enhanced {
          text-align: center;
          padding: 40px 20px;
        }

        .no-selection-icon {
          margin-bottom: 20px;
          color: var(--editor-text-muted);
        }

        .no-selection-message-enhanced h3 {
          margin: 0 0 12px 0;
          color: var(--editor-text-bright);
          font-size: 16px;
        }

        .no-selection-message-enhanced p {
          margin: 0 0 20px 0;
          color: var(--editor-text-secondary);
          font-size: 13px;
        }

        .selection-help {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        .help-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--editor-bg-dark);
          border-radius: 4px;
          font-size: 12px;
          color: var(--editor-text-secondary);
        }

        /* Enhanced Compositing Panel */
        .compositing-panel-enhanced {
          position: fixed;
          right: 20px;
          top: 80px;
          width: 360px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 8px;
          z-index: 200;
          box-shadow: var(--shadow-heavy);
          max-height: calc(100vh - 100px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .compositing-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--editor-border);
          background: var(--editor-bg-darker);
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }

        .compositing-panel-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
          font-weight: 600;
        }

        .compositing-panel-content-enhanced {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .compositing-section {
          margin-bottom: 24px;
        }

        .compositing-section h5 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .transform-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .transform-group {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          padding: 16px;
          position: relative;
        }

        .transform-group label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 10px;
          color: var(--editor-text-bright);
        }

        .dual-control {
          display: flex;
          gap: 12px;
        }

        .control-pair {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-pair span {
          font-size: 11px;
          color: var(--editor-text-secondary);
          min-width: 12px;
        }

        .numeric-input {
          flex: 1;
          padding: 8px 10px;
          background: var(--editor-bg-darker);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          color: var(--editor-text-primary);
          font-size: 12px;
          font-family: 'Consolas', monospace;
        }

        .numeric-input:focus {
          outline: none;
          border-color: var(--editor-accent-blue);
        }

        .lock-aspect-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 4px;
          background: var(--editor-bg-darker);
          color: var(--editor-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }

        .lock-aspect-btn:hover {
          background: var(--editor-bg-hover);
          color: var(--editor-accent-blue);
        }

        .rotation-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rotation-control input {
          flex: 1;
        }

        .rotation-control span {
          font-size: 11px;
          color: var(--editor-text-secondary);
        }

        .blend-controls {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          padding: 16px;
        }

        .compositing-slider-enhanced {
          width: 100%;
          height: 6px;
          background: var(--editor-bg-darker);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          appearance: none;
          margin-top: 8px;
        }

        .compositing-slider-enhanced::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: var(--editor-accent-blue);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: var(--shadow-light);
        }

        .blend-mode-select-enhanced {
          width: 100%;
          padding: 10px 12px;
          background: var(--editor-bg-darker);
          border: 1px solid var(--editor-border);
          border-radius: 4px;
          color: var(--editor-text-primary);
          font-size: 12px;
          margin-top: 8px;
        }

        .advanced-controls {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          padding: 16px;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .preset-transform-btn {
          padding: 12px 8px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          color: var(--editor-text-primary);
          cursor: pointer;
          font-size: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: var(--transition-fast);
        }

        .preset-transform-btn:hover {
          background: var(--editor-bg-hover);
          border-color: var(--editor-accent-purple);
        }

        .no-video-clip-message-enhanced,
        .no-clip-icon {
          text-align: center;
          padding: 40px 20px;
        }

        .no-clip-icon {
          margin-bottom: 20px;
          color: var(--editor-text-muted);
        }

        .no-video-clip-message-enhanced h3 {
          margin: 0 0 12px 0;
          color: var(--editor-text-bright);
          font-size: 16px;
        }

        .no-video-clip-message-enhanced p {
          margin: 0 0 20px 0;
          color: var(--editor-text-secondary);
          font-size: 13px;
        }

        .compositing-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--editor-bg-dark);
          border-radius: 4px;
          font-size: 12px;
          color: var(--editor-text-secondary);
        }

        /* Color Workspace */
        .color-workspace {
          position: fixed;
          bottom: 20px;
          left: 300px;
          right: 20px;
          height: 280px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 8px;
          z-index: 150;
          box-shadow: var(--shadow-heavy);
          display: flex;
          flex-direction: column;
        }

        .color-workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--editor-border);
          background: var(--editor-bg-darker);
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }

        .color-workspace-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
          font-weight: 600;
        }

        .color-tools {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .color-wheels {
          display: flex;
          gap: 30px;
          justify-content: center;
        }

        .color-wheel-section {
          text-align: center;
        }

        .color-wheel-section h5 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .color-wheel {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid var(--editor-border-light);
          margin-bottom: 16px;
          cursor: crosshair;
          position: relative;
        }

        .shadows-wheel {
          background: radial-gradient(circle, #444 0%, #222 50%, #000 100%);
        }

        .midtones-wheel {
          background: radial-gradient(circle, #888 0%, #555 50%, #333 100%);
        }

        .highlights-wheel {
          background: radial-gradient(circle, #fff 0%, #ccc 50%, #888 100%);
        }

        .wheel-controls input {
          width: 120px;
          height: 4px;
          background: var(--editor-bg-dark);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        /* Audio Workspace */
        .audio-workspace {
          position: fixed;
          bottom: 20px;
          left: 300px;
          right: 20px;
          height: 320px;
          background: var(--editor-bg-panel);
          border: 1px solid var(--editor-border);
          border-radius: 8px;
          z-index: 150;
          box-shadow: var(--shadow-heavy);
          display: flex;
          flex-direction: column;
        }

        .audio-workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--editor-border);
          background: var(--editor-bg-darker);
          border-radius: 8px 8px 0 0;
          flex-shrink: 0;
        }

        .audio-workspace-header h4 {
          margin: 0;
          color: var(--editor-text-bright);
          font-size: 14px;
          font-weight: 600;
        }

        .mixing-console {
          flex: 1;
          padding: 20px;
          display: flex;
          gap: 20px;
          overflow-x: auto;
        }

        .mixer-channel {
          min-width: 80px;
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          overflow: hidden;
        }

        .channel-header {
          padding: 12px 8px;
          background: var(--editor-bg-hover);
          text-align: center;
        }

        .channel-header span {
          font-size: 11px;
          font-weight: 600;
          color: var(--editor-text-bright);
        }

        .channel-controls {
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          height: 200px;
        }

        .eq-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .eq-band {
          text-align: center;
        }

        .eq-band label {
          display: block;
          font-size: 9px;
          color: var(--editor-text-secondary);
          margin-bottom: 4px;
        }

        .eq-slider {
          width: 60px;
          height: 3px;
          background: var(--editor-bg-darker);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        .eq-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: var(--editor-accent-green);
          border-radius: 50%;
          cursor: pointer;
        }

        .channel-fader {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .volume-fader {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 30px;
          height: 100px;
          background: var(--editor-bg-darker);
          outline: none;
          cursor: pointer;
        }

        .fader-label {
          font-size: 9px;
          color: var(--editor-text-secondary);
          font-family: 'Consolas', monospace;
        }

        .level-meter {
          width: 8px;
          height: 100px;
          background: var(--editor-bg-darker);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .meter-bar {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 60%;
          background: linear-gradient(to top, var(--editor-accent-green) 0%, var(--editor-accent-yellow) 70%, var(--editor-accent-red) 100%);
          transition: height 0.1s ease;
        }

        /* Transition Properties */
        .transition-properties {
          background: var(--editor-bg-dark);
          border: 1px solid var(--editor-border);
          border-radius: 6px;
          padding: 16px;
        }

        .transition-properties h5 {
          margin: 0 0 16px 0;
          color: var(--editor-text-bright);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Scrollbar Styling */
        .timeline-tracks-scroll::-webkit-scrollbar,
        .timeline-ruler-scroll::-webkit-scrollbar,
        .track-headers-column::-webkit-scrollbar,
        .editor-left-panel::-webkit-scrollbar,
        .effects-panel-enhanced::-webkit-scrollbar,
        .compositing-panel-enhanced::-webkit-scrollbar,
        .color-tools::-webkit-scrollbar,
        .mixing-console::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .timeline-tracks-scroll::-webkit-scrollbar-track,
        .timeline-ruler-scroll::-webkit-scrollbar-track,
        .track-headers-column::-webkit-scrollbar-track,
        .editor-left-panel::-webkit-scrollbar-track,
        .effects-panel-enhanced::-webkit-scrollbar-track,
        .compositing-panel-enhanced::-webkit-scrollbar-track,
        .color-tools::-webkit-scrollbar-track,
        .mixing-console::-webkit-scrollbar-track {
          background: var(--editor-bg-dark);
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb,
        .track-headers-column::-webkit-scrollbar-thumb,
        .editor-left-panel::-webkit-scrollbar-thumb,
        .effects-panel-enhanced::-webkit-scrollbar-thumb,
        .compositing-panel-enhanced::-webkit-scrollbar-thumb,
        .color-tools::-webkit-scrollbar-thumb,
        .mixing-console::-webkit-scrollbar-thumb {
          background: var(--editor-border-light);
          border-radius: 4px;
        }

        .timeline-tracks-scroll::-webkit-scrollbar-thumb:hover,
        .timeline-ruler-scroll::-webkit-scrollbar-thumb:hover,
        .track-headers-column::-webkit-scrollbar-thumb:hover,
        .editor-left-panel::-webkit-scrollbar-thumb:hover,
        .effects-panel-enhanced::-webkit-scrollbar-thumb:hover,
        .compositing-panel-enhanced::-webkit-scrollbar-thumb:hover,
        .color-tools::-webkit-scrollbar-thumb:hover,
        .mixing-console::-webkit-scrollbar-thumb:hover {
          background: var(--editor-text-secondary);
        }

        /* Animation Keyframes */
        @keyframes clipSelect {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        @keyframes effectApplied {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes panelSlideIn {
          from { 
            opacity: 0; 
            transform: translateX(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }

        .effects-panel-enhanced,
        .compositing-panel-enhanced {
          animation: panelSlideIn 0.3s ease;
        }

        .timeline-clip.selected {
          animation: clipSelect 0.3s ease;
        }

        .clip-effects-indicator {
          animation: effectApplied 0.4s ease;
        }

        /* Focus and Accessibility */
        .tool-btn:focus,
        .control-btn-small:focus,
        .control-btn-play-small:focus,
        .timeline-option-btn:focus,
        .track-toggle-btn:focus,
        .effect-toggle:focus,
        .close-panel-btn:focus {
          outline: 2px solid var(--editor-accent-blue);
          outline-offset: 2px;
        }

        /* Responsive Design */
        @media (max-width: 1400px) {
          .effects-panel-enhanced,
          .compositing-panel-enhanced {
            width: 320px;
          }
        }

        @media (max-width: 1200px) {
          .editor-left-panel {
            width: 240px;
            min-width: 240px;
          }
          
          .track-headers-spacer,
          .track-headers-column {
            width: 240px;
            min-width: 240px;
          }
          
          .effects-panel-enhanced,
          .compositing-panel-enhanced {
            width: 280px;
            right: 10px;
          }

          .color-workspace,
          .audio-workspace {
            left: 260px;
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
          
          .workspace-buttons {
            flex-direction: column;
            gap: 4px;
          }

          .workspace-btn {
            font-size: 10px;
            padding: 6px 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default VideoEditorComponent;