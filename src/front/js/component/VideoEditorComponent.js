
// ─────────────────────────────────────────────
// ColorGradingPanel — Lift/Gamma/Gain wheels
// ─────────────────────────────────────────────
const ColorWheel = ({ label, value, onChange, size = 120 }) => {
  const canvasRef = React.useRef(null);
  const dragging = React.useRef(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;

    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `hsla(${angle}, 0%, 50%, 1)`);
      gradient.addColorStop(1, `hsla(${angle}, 100%, 50%, 1)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw center indicator
    const ix = cx + (value.x || 0) * r * 0.8;
    const iy = cy + (value.y || 0) * r * 0.8;
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
  }, [value, size]);

  const handleMouse = (e) => {
    if (!dragging.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;
    const x = Math.max(-1, Math.min(1, (e.clientX - rect.left - cx) / r));
    const y = Math.max(-1, Math.min(1, (e.clientY - rect.top - cy) / r));
    onChange({ ...value, x, y });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <canvas ref={canvasRef} width={size} height={size}
        style={{ borderRadius: '50%', cursor: 'crosshair', border: '1px solid #21262d' }}
        onMouseDown={() => { dragging.current = true; }}
        onMouseMove={handleMouse}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
      />
      <div style={{ fontSize: 10, fontWeight: 700, color: '#4e6a82', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <input type="range" min={-100} max={100} value={Math.round((value.brightness || 0) * 100)}
        style={{ width: size, accentColor: '#00ffc8' }}
        onChange={e => onChange({ ...value, brightness: parseInt(e.target.value) / 100 })}/>
    </div>
  );
};


// ─────────────────────────────────────────────
// MulticamEditor — switch between camera angles
// ─────────────────────────────────────────────
const MulticamEditor = ({ clips, onAngleSwitch, currentTime }) => {
  const [angles, setAngles] = React.useState(
    clips?.filter(c => c.type === 'video').slice(0, 4).map((c, i) => ({
      id: i, label: `Cam ${i + 1}`, clip: c, active: i === 0
    })) || []
  );
  const [syncOffset, setSyncOffset] = React.useState({});
  const [recording, setRecording] = React.useState(false);
  const [switches, setSwitches] = React.useState([]);

  const switchToAngle = React.useCallback((angleId) => {
    setAngles(prev => prev.map(a => ({ ...a, active: a.id === angleId })));
    if (recording) {
      setSwitches(prev => [...prev, { time: currentTime, angleId }]);
    }
    onAngleSwitch?.(angleId, currentTime);
  }, [recording, currentTime, onAngleSwitch]);

  return (
    <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h4 style={{ color: '#e6edf3', fontWeight: 800, margin: '0 0 4px', fontSize: 14 }}>🎥 Multicam Editor</h4>
          <p style={{ color: '#8b949e', fontSize: 12, margin: 0 }}>Switch between camera angles in real time</p>
        </div>
        <button onClick={() => setRecording(r => !r)}
          style={{ padding: '6px 14px', background: recording ? 'rgba(248,81,73,0.15)' : 'rgba(0,255,200,0.08)', border: `1px solid ${recording ? '#f85149' : 'rgba(0,255,200,0.3)'}`, borderRadius: 7, color: recording ? '#f85149' : '#00ffc8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {recording ? '⏹ Stop Recording' : '⏺ Record Switches'}
        </button>
      </div>

      {angles.length === 0 ? (
        <div style={{ color: '#4e6a82', fontSize: 12, textAlign: 'center', padding: 20 }}>
          Add video clips to your timeline to use multicam editing
        </div>
      ) : (
        <>
          {/* Camera grid */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(angles.length, 2)}, 1fr)`, gap: 8, marginBottom: 16 }}>
            {angles.map(angle => (
              <div key={angle.id}
                onClick={() => switchToAngle(angle.id)}
                style={{ position: 'relative', aspectRatio: '16/9', background: '#06060f', borderRadius: 8, border: `2px solid ${angle.active ? '#00ffc8' : '#21262d'}`, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4e6a82', fontSize: 24 }}>🎥</div>
                <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 10, fontWeight: 800, color: angle.active ? '#00ffc8' : '#8b949e', background: 'rgba(0,0,0,0.7)', padding: '2px 8px', borderRadius: 4 }}>
                  {angle.label} {angle.active && '● LIVE'}
                </div>
                {/* Sync offset */}
                <div style={{ position: 'absolute', top: 6, right: 8 }}>
                  <input type="number" value={syncOffset[angle.id] || 0} step={0.1}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setSyncOffset(prev => ({ ...prev, [angle.id]: parseFloat(e.target.value) }))}
                    style={{ width: 50, background: 'rgba(0,0,0,0.7)', border: '1px solid #21262d', borderRadius: 4, color: '#8b949e', fontSize: 9, padding: '2px 4px', textAlign: 'center' }}
                    title="Sync offset (seconds)"/>
                </div>
              </div>
            ))}
          </div>

          {/* Switch timeline */}
          {switches.length > 0 && (
            <div style={{ background: '#06060f', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#4e6a82', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recorded Switches</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {switches.map((sw, i) => (
                  <div key={i} style={{ padding: '3px 8px', background: 'rgba(0,255,200,0.08)', border: '1px solid rgba(0,255,200,0.2)', borderRadius: 4, fontSize: 10, color: '#00ffc8' }}>
                    {sw.time.toFixed(1)}s → Cam {sw.angleId + 1}
                  </div>
                ))}
              </div>
              <button onClick={() => setSwitches([])}
                style={{ marginTop: 8, padding: '4px 10px', background: 'transparent', border: '1px solid #21262d', borderRadius: 5, color: '#4e6a82', fontSize: 10, cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ColorGradingPanel = ({ onGrade }) => {
  const [lift,  setLift]  = React.useState({ x: 0, y: 0, brightness: 0 });
  const [gamma, setGamma] = React.useState({ x: 0, y: 0, brightness: 0 });
  const [gain,  setGain]  = React.useState({ x: 0, y: 0, brightness: 0 });
  const [saturation, setSaturation] = React.useState(100);
  const [contrast,   setContrast]   = React.useState(100);
  const [temperature, setTemperature] = React.useState(0);
  const [tint,       setTint]        = React.useState(0);
  const [activePreset, setActivePreset] = React.useState(null);

  const LUT_PRESETS = [
    // Film Stocks
    { name: 'Kodak 2383',      cat: 'film',      sat: 90,  con: 112, temp: 8,   tint: 3  },
    { name: 'Kodak 5218',      cat: 'film',      sat: 85,  con: 108, temp: 12,  tint: 2  },
    { name: 'Kodak 5219',      cat: 'film',      sat: 88,  con: 110, temp: 6,   tint: 1  },
    { name: 'Kodak Portra 400',cat: 'film',      sat: 82,  con: 100, temp: 15,  tint: 5  },
    { name: 'Fuji 3513',       cat: 'film',      sat: 95,  con: 105, temp: -5,  tint: 2  },
    { name: 'Fuji 3514',       cat: 'film',      sat: 92,  con: 107, temp: -8,  tint: 3  },
    { name: 'Fuji Velvia',     cat: 'film',      sat: 140, con: 115, temp: 0,   tint: 0  },
    { name: 'Ilford HP5 B&W',  cat: 'film',      sat: 0,   con: 118, temp: 0,   tint: 0  },
    { name: 'Agfa Vista',      cat: 'film',      sat: 110, con: 108, temp: -3,  tint: -2 },
    // Cinematic
    { name: 'Teal & Orange',   cat: 'cinema',    sat: 110, con: 108, temp: -5,  tint: 0  },
    { name: 'Bleach Bypass',   cat: 'cinema',    sat: 55,  con: 130, temp: 0,   tint: 0  },
    { name: 'Day for Night',   cat: 'cinema',    sat: 70,  con: 95,  temp: -30, tint: -5 },
    { name: 'Anamorphic Blue', cat: 'cinema',    sat: 95,  con: 105, temp: -15, tint: -8 },
    { name: 'Blockbuster',     cat: 'cinema',    sat: 120, con: 115, temp: 5,   tint: 2  },
    { name: 'Horror Dark',     cat: 'cinema',    sat: 60,  con: 125, temp: -10, tint: 5  },
    { name: 'Sci-Fi Teal',     cat: 'cinema',    sat: 100, con: 110, temp: -20, tint: -10},
    { name: 'Western Sepia',   cat: 'cinema',    sat: 40,  con: 105, temp: 25,  tint: 10 },
    { name: 'Neon Noir',       cat: 'cinema',    sat: 130, con: 120, temp: -15, tint: 5  },
    { name: 'Apocalyptic',     cat: 'cinema',    sat: 65,  con: 118, temp: 10,  tint: 8  },
    { name: 'Kubrick Cold',    cat: 'cinema',    sat: 80,  con: 110, temp: -20, tint: -5 },
    // Social/Platform
    { name: 'Instagram Warm',  cat: 'social',    sat: 108, con: 105, temp: 18,  tint: 5  },
    { name: 'Instagram Cool',  cat: 'social',    sat: 95,  con: 105, temp: -12, tint: -3 },
    { name: 'TikTok Vivid',    cat: 'social',    sat: 135, con: 112, temp: 5,   tint: 0  },
    { name: 'YouTube Clean',   cat: 'social',    sat: 105, con: 105, temp: 3,   tint: 1  },
    { name: 'Podcast Neutral', cat: 'social',    sat: 95,  con: 102, temp: 2,   tint: 0  },
    { name: 'Fashion Matte',   cat: 'social',    sat: 80,  con: 88,  temp: 0,   tint: 5  },
    { name: 'Music Video',     cat: 'social',    sat: 125, con: 115, temp: -8,  tint: -5 },
    // Vintage
    { name: '70s Fade',        cat: 'vintage',   sat: 75,  con: 90,  temp: 20,  tint: 8  },
    { name: '80s VHS',         cat: 'vintage',   sat: 110, con: 95,  temp: 10,  tint: -5 },
    { name: '90s Camcorder',   cat: 'vintage',   sat: 105, con: 92,  temp: 8,   tint: -3 },
    { name: 'Super 8',         cat: 'vintage',   sat: 85,  con: 105, temp: 25,  tint: 10 },
    { name: 'Daguerreotype',   cat: 'vintage',   sat: 0,   con: 100, temp: 10,  tint: 5  },
    { name: 'Expired Film',    cat: 'vintage',   sat: 70,  con: 85,  temp: 18,  tint: 12 },
    // Nature
    { name: 'Golden Hour',     cat: 'nature',    sat: 115, con: 105, temp: 30,  tint: 10 },
    { name: 'Blue Hour',       cat: 'nature',    sat: 90,  con: 108, temp: -25, tint: -5 },
    { name: 'Forest Green',    cat: 'nature',    sat: 120, con: 108, temp: -8,  tint: -5 },
    { name: 'Desert Warm',     cat: 'nature',    sat: 100, con: 110, temp: 22,  tint: 5  },
    { name: 'Arctic Cold',     cat: 'nature',    sat: 80,  con: 105, temp: -35, tint: -10},
    // Technical
    { name: 'Rec.709',         cat: 'technical', sat: 100, con: 100, temp: 0,   tint: 0  },
    { name: 'LOG to Rec709',   cat: 'technical', sat: 100, con: 115, temp: 0,   tint: 0  },
    { name: 'SLOG2 Correct',   cat: 'technical', sat: 100, con: 118, temp: 0,   tint: 0  },
    { name: 'DLOG Correct',    cat: 'technical', sat: 100, con: 120, temp: 0,   tint: 0  },
  ];

  const PRESETS = [
    { name: 'Cinematic', sat: 85,  con: 110, temp: -10, tint: 0 },
    { name: 'Vivid',     sat: 130, con: 105, temp: 5,   tint: 0 },
    { name: 'Matte',     sat: 90,  con: 85,  temp: 0,   tint: 5 },
    { name: 'B&W',       sat: 0,   con: 110, temp: 0,   tint: 0 },
    { name: 'Warm',      sat: 105, con: 100, temp: 20,  tint: 5 },
    { name: 'Cool',      sat: 100, con: 100, temp: -20, tint: -5 },
    { name: 'Golden Hr', sat: 115, con: 105, temp: 30,  tint: 10 },
    { name: 'Teal/Org',  sat: 110, con: 108, temp: -5,  tint: 0 },
  ];

  const applyGrade = React.useCallback(() => {
    onGrade?.({ lift, gamma, gain, saturation, contrast, temperature, tint });
  }, [lift, gamma, gain, saturation, contrast, temperature, tint, onGrade]);

  return (
    <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ color: '#e6edf3', fontWeight: 800, margin: 0, fontSize: 14 }}>🎨 Color Grading</h4>
        <button onClick={applyGrade} style={{ padding: '5px 14px', background: 'rgba(0,255,200,0.1)', border: '1px solid rgba(0,255,200,0.3)', borderRadius: 6, color: '#00ffc8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Apply</button>
      </div>

      {/* Presets */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#4e6a82', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Presets</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map(p => (
            <button key={p.name}
              onClick={() => { setSaturation(p.sat); setContrast(p.con); setTemperature(p.temp); setTint(p.tint); setActivePreset(p.name); }}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid', borderColor: activePreset === p.name ? '#00ffc8' : '#21262d', background: activePreset === p.name ? 'rgba(0,255,200,0.1)' : 'transparent', color: activePreset === p.name ? '#00ffc8' : '#8b949e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Color Wheels */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ColorWheel label="Lift (Shadows)"   value={lift}  onChange={setLift}  size={110} />
        <ColorWheel label="Gamma (Mids)"     value={gamma} onChange={setGamma} size={110} />
        <ColorWheel label="Gain (Highlights)" value={gain}  onChange={setGain}  size={110} />
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          ['Saturation', saturation, setSaturation, 0, 200, '#bf5af2'],
          ['Contrast',   contrast,   setContrast,   50, 150, '#ff6600'],
          ['Temperature', temperature, setTemperature, -50, 50, '#ffd60a'],
          ['Tint',       tint,       setTint,       -50, 50, '#30d158'],
        ].map(([lbl, val, setter, min, max, color]) => (
          <div key={lbl}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#4e6a82', marginBottom: 5 }}>
              <span>{lbl}</span><span style={{ color }}>{val}</span>
            </div>
            <input type="range" min={min} max={max} value={val}
              style={{ width: '100%', accentColor: color }}
              onChange={e => setter(parseInt(e.target.value))}/>
          </div>
        ))}
      </div>

      {/* Reset */}
      <button onClick={() => { setLift({x:0,y:0,brightness:0}); setGamma({x:0,y:0,brightness:0}); setGain({x:0,y:0,brightness:0}); setSaturation(100); setContrast(100); setTemperature(0); setTint(0); setActivePreset(null); }}
        style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #21262d', borderRadius: 6, color: '#4e6a82', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, cursor: 'pointer', alignSelf: 'flex-start' }}>
        Reset
      </button>
    </div>
  );
};

import {
  Activity,
  Aperture,
  Copy,
  Crown,
  Download,
  Eye,
  FastForward,
  Film,
  Filter,
  Folder,
  Grid,
  Image,
  Info,
  Layers,
  List,
  Loader,
  Lock,
  Monitor,
  Move,
  Palette,
  Pause,
  Play,
  Plus,
  Rewind,
  Save,
  Settings,
  Sparkles,
  Square,
  Star,
  Sun,
  Target,
  Trash2,
  Tv,
  Unlock,
  Upload,
  Video,
  Contrast,
  MousePointer,
  Scissors,
  Type,
  Sliders,
  Radio,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Wand2,
  ZoomIn,
  ZoomOut,
  TrendingUp,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpDown,
  AudioWaveform,
  X,
  Check,
  AlertCircle,
  Clock,
  Link,
  Mic,
  MicOff,
  Music,
  Headphones,
  Speaker,
  Crop,
  Waveform,
  Hand,
  AreaChart,
  BarChart,
  Binary,
  Bolt,
  Brush,
  Camera,
  Crosshair,
  Diamond,
  Disc,
  Droplets,
  Flashlight,
  FlipHorizontal,
  Focus,
  Gauge,
  Hash,
  Hexagon,
  Lightbulb,
  Moon,
  Paintbrush,
  PlayCircle,
  RadioIcon,
  Rainbow,
  SquareIcon,
  Triangle,
  Volume1,
  Waves,
  WifiOff,
  Wind,
  Zap,
  Circle
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
const electronFS = window.electronFS || { isElectron: false, saveExport: async () => null, openFiles: async () => [], runFFmpeg: async () => ({}) };
import KeyframePanel from '../keyframes/ui/KeyframePanel';
import KeyframeTimelineStrip from '../keyframes/ui/KeyframeTimelineStrip';
import {
  VideoStabilizer,
  createNoiseProfile,
  applyNoiseReduction,
  createMultiCamSession,
  MultiCamPanel,
  detectBeats,
  snapToBeat,
  ASPECT_RATIOS,
  EXPORT_PRESETS,
  createChromaKeySettings,
  applyChromaKey,
  ChromaKeyPanel,
  CHROMA_PRESETS,
  AdjustmentLayerPanel,
  SpeedRampPanel,
  createAdjustmentLayer,
  getSpeedAtPosition,
} from '../component/VideoEditorEffectsPlus';

import { BackgroundRemovalPanel, MotionTrackingPanel, AudioDuckingPanel,
         TemplateLibraryPanel, SceneDetectionPanel,
         createBGRemovalSettings, createAudioDuckingSettings,
         createSceneDetectionSettings } from './VideoEditorAdvancedFeatures';



// Video Editor State Management Hooks
import {
  useUndoRedo,
  useClipboard,
  useMarkers,
  useProjectManager,
  useClipOperations,
  useSelection,
  useKeyboardShortcuts
} from './hooks/useVideoEditorState';
import { useTierAccess } from './hooks/useTierAccess';
import { useFFmpeg } from './hooks/useFFmpeg';
import { KEYFRAME_PROPERTIES, INTERPOLATION_TYPES, DEFAULT_KEYFRAME_VALUE_BY_PROPERTY } from '../keyframes/engine/keyframeTypes';
import VideoEditorEffectsPanel from './VideoEditorEffectsPanel';
import VideoEditorLeftPanel from './videoeditor/VideoEditorLeftPanel';
import VideoEditorRightPanel from './videoeditor/VideoEditorRightPanel';
import VideoEditorMonitors from './videoeditor/VideoEditorMonitors';


// Backend URL configuration
const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// =====================================================
// VIDEO EDITOR API FUNCTIONS - R2 + FFmpeg Pipeline
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
 * @returns {Promise<Object>} - Asset data with R2 info
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
 * @param {string} publicId - R2 key or asset ID
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
 * @param {string} publicId - R2 key or asset ID
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
 * Apply a single video effect on a video
 */
const applyVideoEffect = async (payload) => {
  try {
    const response = await fetch(`${backendURL}/api/video-editor/apply-effect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Apply effect failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error applying video effect:', error);
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
    public_id: clip.r2_key || clip.cloudinary_public_id || clip.public_id || clip.id,
    url: clip.r2_url || clip.file_url || clip.src || clip.url || null,
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
        // Upload to R2 via backend
        const asset = await uploadEditorAsset(file);

        // Update with R2 data
        setSelectedFiles(prev => prev.map(f =>
          f.id === tempId ? {
            ...f,
            id: asset.public_id || tempId,
            cloudinary_public_id: asset.public_id || asset.r2_key,
            url: asset.url,
            duration: asset.duration ? `${Math.floor(asset.duration / 60)}:${Math.floor(asset.duration % 60).toString().padStart(2, '0')}` : '0:00',
            width: asset.width,
            height: asset.height,
            thumbnail: asset.thumbnail,
            uploading: false
          } : f
        ));

        console.log(`✅ Uploaded ${file.name} to R2`);

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
      width: '100%',
      height: '100%',
      background: '#1e1e1e',
      border: '1px solid #3f3f46',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
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

        {/* For audio files, add to audio track only */}
        {selectedMedia?.type === 'audio' && (
          <button
            onClick={() => onAddToTimeline(selectedMedia, 0, selectedMedia.duration || 30, 'audio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <AudioWaveform size={14} />
            Add to Audio Track
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
                  <optgroup label="YouTube">
                <option value="youtube_4k">YouTube 4K (3840x2160 / 60fps)</option>
                <option value="youtube_1080">YouTube 1080p (1920x1080 / 30fps)</option>
                <option value="youtube_720">YouTube 720p (1280x720 / 30fps)</option>
              </optgroup>
              <optgroup label="Social Media">
                <option value="instagram_reel">Instagram Reel (1080x1920)</option>
                <option value="instagram_post">Instagram Post (1080x1080)</option>
                <option value="tiktok">TikTok (1080x1920 / 30fps)</option>
                <option value="twitter">Twitter/X (1280x720)</option>
                <option value="facebook">Facebook (1280x720)</option>
              </optgroup>
              <optgroup label="Broadcast">
                <option value="4k">4K Ultra HD (3840x2160)</option>
                  <option value="1080p">Full HD (1920x1080)</option>
                  <option value="720p">HD (1280x720)</option>
                  <option value="1080p">Full HD (1920x1080)</option>
                <option value="720p">HD (1280x720)</option>
                <option value="480p">SD (854x480)</option>
              </optgroup>
              <optgroup label="Film/ProRes">
                <option value="cinema_4k">Cinema 4K DCI (4096x2160)</option>
                <option value="cinema_2k">Cinema 2K DCI (2048x1080)</option>
                <option value="prores">ProRes 422 (1920x1080)</option>
              </optgroup>
              <optgroup label="Podcast">
                <option value="audio_only">Audio Only (AAC/MP3)</option>
                <option value="podcast_video">Podcast Video (1920x1080 static bg)</option>
              </optgroup>
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

  const initialTracks = [
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
  ];

  // Use undo/redo for tracks
  const {
    state: tracks,
    setState: setTracks,
    undo: undoTracks,
    redo: redoTracks,
    canUndo,
    canRedo
  } = useUndoRedo(initialTracks, 50);

  // Clipboard for cut/copy/paste
  const clipboard = useClipboard();

  // Project manager for save/load/new
  const projectManager = useProjectManager();

  // Markers for timeline markers
  const markersHook = useMarkers(projectManager.currentProject?.id);

  // Clip operations for split/trim/speed/reverse
  const clipOps = useClipOperations();

  // Selection for multi-select
  const selection = useSelection();

  const handleNewProject = async () => {
    const title = prompt('Enter project name:', 'New Project');
    if (title) {
      try {
        const newProject = await projectManager.createProject(title, {
          width: project.resolution.width,
          height: project.resolution.height,
          frameRate: frameRate
        });
        // Reset timeline
        setTracks(initialTracks);
        setProject(prev => ({ ...prev, title }));
        setCurrentTime(0);
        console.log('✅ New project created:', title);
      } catch (error) {
        console.error('Failed to create project: ' + error.message);
      }
    }
  };

  const handleOpenProject = async () => {
    try {
      const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
      // Try backend first
      const r = await fetch(`${backendURL}/api/video-editor/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let projects = [];
      if (r.ok) {
        const data = await r.json();
        projects = data.projects || [];
      } else {
        projects = await projectManager.getAllProjects();
      }
      if (projects.length === 0) { console.warn('No saved projects found.'); return; }
      const list = projects.map((p, i) => `${i + 1}. ${p.title || p.name}`).join('\n');
      const choice = prompt(`Select a project:\n${list}`);
      if (!choice) return;
      const idx = parseInt(choice) - 1;
      if (!projects[idx]) return;
      const proj = projects[idx];
      // Load it
      const r2 = await fetch(`${backendURL}/api/video-editor/project/${proj.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r2.ok) {
        const loaded = await r2.json();
        const timeline = typeof loaded.timeline_data === 'string' ? JSON.parse(loaded.timeline_data) : loaded.timeline_data;
        if (timeline?.tracks) { setTracks(timeline.tracks); }
        setProject(prev => ({ ...prev, title: loaded.title, id: loaded.id }));
        console.warn(`✅ Loaded: ${loaded.title}`);
      } else {
        // Fallback to projectManager
        const loaded = await projectManager.loadProject(proj.id);
        if (loaded?.timeline_data) {
          const tl = typeof loaded.timeline_data === 'string' ? JSON.parse(loaded.timeline_data) : loaded.timeline_data;
          if (tl?.tracks) setTracks(tl.tracks);
        }
        setProject(prev => ({ ...prev, title: loaded.title }));
        console.warn(`✅ Loaded: ${loaded.title}`);
      }
    } catch(e) { console.error('Failed to load: ' + e.message); }
  };

  const handleSave = async () => {
    try {
      const timelineData = {
        tracks,
        settings: { frameRate, width: project.resolution.width, height: project.resolution.height },
        markers: markersHook.markers
      };
      // Always try direct backend save as fallback
      const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
      const r = await fetch(`${backendURL}/api/video-editor/save-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: project.title, timeline: timelineData, settings: timelineData.settings })
      });
      if (r.ok) {
        const data = await r.json();
        if (data.project_id) setProject(prev => ({ ...prev, id: data.project_id }));
        console.warn('✅ Project saved!');
      } else {
        // Fallback to projectManager
        if (projectManager.currentProject?.id) {
          await projectManager.saveProject(timelineData, project.title);
        } else {
          const title = prompt('Enter project name:', project.title);
          if (title) {
            await projectManager.createProject(title, { width: project.resolution.width, height: project.resolution.height, frameRate });
            await projectManager.saveProject(timelineData, title);
            setProject(prev => ({ ...prev, title }));
          }
        }
        console.warn('✅ Project saved!');
      }
    } catch (error) {
      console.error('Failed to save: ' + error.message);
    }
  };

  const handleSaveAs = async () => {
    const newTitle = prompt('Save as:', project.title + ' (copy)');
    if (newTitle) {
      try {
        const timelineData = {
          tracks: tracks,
          settings: { frameRate, width: project.resolution.width, height: project.resolution.height },
          markers: markersHook.markers
        };
        await projectManager.saveProjectAs(newTitle);
        setProject(prev => ({ ...prev, title: newTitle }));
        console.error('✅ Saved as: ' + newTitle);
      } catch (error) {
        console.error('Failed to save: ' + error.message);
      }
    }
  };

  // --- EDIT MENU HANDLERS ---
  const handleUndo = () => {
    if (canUndo) {
      undoTracks();
      console.log('⏪ Undo');
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redoTracks();
      console.log('⏩ Redo');
    }
  };

  const handleCut = () => {
    if (selectedClip) {
      clipboard.cut(selectedClip, 'clip');
      deleteClip(selectedClip.id);
      setSelectedClip(null);
    } else if (selectedTransition) {
      clipboard.cut(selectedTransition, 'transition');
      // Delete transition
      setTracks(prevTracks => prevTracks.map(track => ({
        ...track,
        transitions: (track.transitions || []).filter(t => t.id !== selectedTransition.id)
      })));
      setSelectedTransition(null);
    }
  };

  const handleCopy = () => {
    if (selectedClip) {
      clipboard.copy(selectedClip, 'clip');
      console.warn(`📋 Copied "${selectedClip.title}"`);
    } else if (selectedTransition) {
      clipboard.copy(selectedTransition, 'transition');
      console.warn('📋 Copied transition');
    }
  };

  const handlePaste = () => {
    if (!clipboard.hasData) {
      console.warn('Nothing to paste. Copy or cut something first.');
      return;
    }

    const result = clipboard.paste(currentTime);
    if (!result) return;

    const { data, type, wasCut, originalId } = result;

    if (type === 'clip') {
      // Find appropriate track
      const targetTrack = tracks.find(t =>
        t.type === (data.type === 'audio' ? 'audio' : 'video') && !t.locked
      );

      if (targetTrack) {
        data.startTime = currentTime; // Paste at playhead
        setTracks(prevTracks => prevTracks.map(track =>
          track.id === targetTrack.id
            ? { ...track, clips: [...track.clips, data] }
            : track
        ));
        setSelectedClip(data);
        console.log(`📄 Pasted "${data.title}" at ${currentTime.toFixed(2)}s`);
      }
    } else if (type === 'transition') {
      // Paste transition between selected clips
      if (selectedClip) {
        const trackWithClip = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
        if (trackWithClip) {
          const clip = trackWithClip.clips.find(c => c.id === selectedClip.id);
          const nextClip = trackWithClip.clips
            .filter(c => c.startTime >= clip.startTime + clip.duration)
            .sort((a,b) => a.startTime - b.startTime)[0];
          if (nextClip) {
            const newTrans = {
              id: Date.now(),
              type: data.transitionType || 'crossDissolve',
              startTime: clip.startTime + clip.duration - (data.duration || 1),
              duration: data.duration || 1,
              clipAId: clip.id,
              clipBId: nextClip.id,
            };
            setTracks(prev => prev.map(t =>
              t.id === trackWithClip.id
                ? { ...t, transitions: [...(t.transitions || []), newTrans] }
                : t
            ));
            console.log('✓ Transition pasted');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (selectedClip) {
      deleteClip(selectedClip.id);
      setSelectedClip(null);
    } else if (selectedTransition) {
      setTracks(prevTracks => prevTracks.map(track => ({
        ...track,
        transitions: (track.transitions || []).filter(t => t.id !== selectedTransition.id)
      })));
      setSelectedTransition(null);
    }
  };

  const handleSelectAll = () => {
    const allClips = tracks.flatMap(track => track.clips);
    selection.selectAll(allClips);
    console.log(`Selected ${allClips.length} clips`);
  };

  const handleDeselectAll = () => {
    selection.deselectAll();
    setSelectedClip(null);
    setSelectedTransition(null);
  };

  // --- CLIP MENU HANDLERS ---
  const handleSplitClip = () => {
    if (!selectedClip) {
      // Try to find clip at playhead
      const clipAtPlayhead = tracks
        .flatMap(track => track.clips.map(clip => ({ ...clip, trackId: track.id })))
        .find(clip => currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration);

      if (clipAtPlayhead) {
        const result = clipOps.splitClip(clipAtPlayhead, currentTime);
        if (result) {
          setTracks(prevTracks => prevTracks.map(track => {
            if (track.id === clipAtPlayhead.trackId) {
              return {
                ...track,
                clips: [
                  ...track.clips.filter(c => c.id !== clipAtPlayhead.id),
                  result.firstClip,
                  result.secondClip
                ]
              };
            }
            return track;
          }));
          console.log(`✂️ Split clip at ${currentTime.toFixed(2)}s`);
        }
      } else {
        console.warn('No clip at playhead position. Move playhead over a clip to split it.');
      }
    } else {
      // Split selected clip at playhead
      if (currentTime > selectedClip.startTime && currentTime < selectedClip.startTime + selectedClip.duration) {
        const trackWithClip = tracks.find(t => t.clips.some(c => c.id === selectedClip.id));
        if (trackWithClip) {
          const result = clipOps.splitClip(selectedClip, currentTime);
          if (result) {
            setTracks(prevTracks => prevTracks.map(track => {
              if (track.id === trackWithClip.id) {
                return {
                  ...track,
                  clips: [
                    ...track.clips.filter(c => c.id !== selectedClip.id),
                    result.firstClip,
                    result.secondClip
                  ]
                };
              }
              return track;
            }));
            setSelectedClip(result.firstClip);
            console.log(`✂️ Split "${selectedClip.title}" at ${currentTime.toFixed(2)}s`);
          }
        }
      } else {
        console.warn('Playhead must be within the selected clip to split it.');
      }
    }
  };

  const handleTrimIn = () => {
    if (selectedClip) {
      const trimmed = clipOps.trimClip(selectedClip, currentTime - selectedClip.startTime, null);
      if (trimmed) {
        setTracks(prevTracks => prevTracks.map(track => ({
          ...track,
          clips: track.clips.map(c => c.id === selectedClip.id ? { ...trimmed, startTime: currentTime } : c)
        })));
        setSelectedClip({ ...trimmed, startTime: currentTime });
        console.log(`🎬 Trimmed in point to ${currentTime.toFixed(2)}s`);
      }
    }
  };

  const handleTrimOut = () => {
    if (selectedClip) {
      const newDuration = currentTime - selectedClip.startTime;
      if (newDuration > 0) {
        const trimmed = clipOps.trimClip(selectedClip, null, (selectedClip.trimStart || 0) + newDuration);
        if (trimmed) {
          setTracks(prevTracks => prevTracks.map(track => ({
            ...track,
            clips: track.clips.map(c => c.id === selectedClip.id ? { ...c, duration: newDuration } : c)
          })));
          setSelectedClip({ ...selectedClip, duration: newDuration });
          console.log(`🎬 Trimmed out point to ${currentTime.toFixed(2)}s`);
        }
      }
    }
  };

  const handleSpeedDuration = async () => {
    if (!selectedClip) { console.warn('Select a clip first'); return; }
    const speed = prompt('Enter speed multiplier (0.1 - 10):', selectedClip.speed || '1');
    if (!speed) return;
    const speedVal = parseFloat(speed);
    if (speedVal < 0.1 || speedVal > 10) { console.warn('Speed must be between 0.1 and 10'); return; }
    const modified = clipOps.changeSpeed(selectedClip, speedVal);
    setTracks(prevTracks => prevTracks.map(track => ({
      ...track,
      clips: track.clips.map(c => c.id === selectedClip.id ? modified : c)
    })));
    setSelectedClip(modified);
    // Try local FFmpeg first (instant), fall back to server
    const localFile = selectedClip._localFile;
    if (localFile) {
      try {
        console.log('⚡ Processing speed ramp locally...');
        const blob = await ffmpeg.speedRamp(localFile, speedVal);
        const url = URL.createObjectURL(blob);
        setTracks(prev => prev.map(t => ({ ...t, clips: t.clips.map(c => c.id === selectedClip.id ? { ...c, previewUrl: url, _speedProcessed: true } : c) })));
        console.log(`⏩ Speed ramp done locally: ${speedVal}x`);
        return;
      } catch(e) { console.warn('Local speed ramp failed, trying server:', e.message); }
    }
    // Fall back to server
    const pubId = selectedClip.cloudinary_public_id || selectedClip.r2_key;
    if (pubId) {
      try {
        const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
        const r = await fetch(`${backendURL}/api/video-editor/transform`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ public_id: pubId, speed: speedVal })
        });
        if (r.ok) {
          const data = await r.json();
          if (data.transformed_url) {
            setTracks(prev => prev.map(t => ({ ...t, clips: t.clips.map(c => c.id === selectedClip.id ? { ...c, previewUrl: data.transformed_url } : c) })));
          }
        }
      } catch(e) { console.warn('Speed ramp server error:', e.message); }
    }
  };

  const handleReverseClip = () => {
    if (!selectedClip) {
      console.warn('Select a clip first');
      return;
    }
    const reversed = clipOps.reverseClip(selectedClip);
    setTracks(prevTracks => prevTracks.map(track => ({
      ...track,
      clips: track.clips.map(c => c.id === selectedClip.id ? reversed : c)
    })));
    setSelectedClip(reversed);
    console.log(`🔄 Clip ${reversed.reversed ? 'reversed' : 'un-reversed'}`);
  };

  // --- SEQUENCE MENU HANDLERS ---
  const handleAddTracks = () => {
    const type = prompt('Enter track type (video or audio):', 'video');
    if (type === 'video' || type === 'audio') {
      const trackCount = tracks.filter(t => t.type === type).length + 1;
      const newTrack = {
        id: Date.now(),
        name: `${type === 'video' ? 'Video' : 'Audio'} ${trackCount}`,
        type: type,
        visible: true,
        muted: false,
        locked: false,
        color: type === 'video' ? '#4a9eff' : '#00d4aa',
        zIndex: type === 'video' ? tracks.length + 1 : 0,
        clips: [],
        transitions: []
      };
      setTracks(prev => [...prev, newTrack]);
      console.log(`➕ Added ${type} track`);
    }
  };

  const handleDeleteEmptyTracks = () => {
    const emptyTracks = tracks.filter(t => t.clips.length === 0);
    if (emptyTracks.length === 0) {
      console.warn('No empty tracks to delete');
      return;
    }

    // Keep at least 1 video and 1 audio track
    const videoTracks = tracks.filter(t => t.type === 'video');
    const audioTracks = tracks.filter(t => t.type === 'audio');

    setTracks(prev => prev.filter(t => {
      if (t.clips.length > 0) return true; // Keep non-empty
      if (t.type === 'video' && videoTracks.filter(vt => vt.clips.length > 0 || vt.id === t.id).length <= 1) return true;
      if (t.type === 'audio' && audioTracks.filter(at => at.clips.length > 0 || at.id === t.id).length <= 1) return true;
      return false;
    }));

    console.log('🗑️ Deleted empty tracks');
  };

  const handleApplyDefaultTransition = () => {
    // Find adjacent clips and add cross dissolve
    const pairs = [];
    tracks.forEach(track => {
      if (track.type !== 'video') return;
      const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
      for (let i = 0; i < sortedClips.length - 1; i++) {
        const clip1End = sortedClips[i].startTime + sortedClips[i].duration;
        if (Math.abs(sortedClips[i + 1].startTime - clip1End) < 0.5) {
          pairs.push({ trackId: track.id, clip1: sortedClips[i], clip2: sortedClips[i + 1] });
        }
      }
    });

    if (pairs.length === 0) {
      console.warn('No adjacent clips found. Place clips next to each other to add transitions.');
      return;
    }

    // Add transition to first pair found
    const { trackId, clip1, clip2 } = pairs[0];
    addTransitionBetweenClips(trackId, clip1, clip2, selectedTransitionType);
  };

  // --- MARKER MENU HANDLERS ---
  const handleAddMarker = () => {
    const label = prompt('Marker label (optional):');
    markersHook.addMarker(currentTime, label || '', '#FF6600');
  };

  const handleNextMarker = () => {
    const nextTime = markersHook.goToNextMarker(currentTime);
    if (nextTime !== null) {
      setCurrentTime(nextTime);
      console.log(`⏩ Jumped to marker at ${nextTime.toFixed(2)}s`);
    } else {
      console.log('No next marker');
    }
  };

  const handlePrevMarker = () => {
    const prevTime = markersHook.goToPreviousMarker(currentTime);
    if (prevTime !== null) {
      setCurrentTime(prevTime);
      console.log(`⏪ Jumped to marker at ${prevTime.toFixed(2)}s`);
    } else {
      console.log('No previous marker');
    }
  };

  const handleClearCurrentMarker = () => {
    // Find marker closest to playhead
    const closest = markersHook.markers.reduce((prev, curr) =>
      Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
      , markersHook.markers[0]);

    if (closest && Math.abs(closest.time - currentTime) < 1) {
      markersHook.deleteMarker(closest.id);
      console.log('🚩 Deleted marker');
    } else {
      console.warn('No marker near playhead');
    }
  };

  const handleClearAllMarkers = () => {
    if (confirm(`Delete all ${markersHook.markers.length} markers?`)) {
      markersHook.clearAllMarkers();
    }
  };

  // --- VIEW MENU HANDLERS ---
  const handleZoomIn = () => setZoom(Math.min(5, zoom + 0.2));
  const handleZoomOut = () => setZoom(Math.max(0.1, zoom - 0.2));
  const handleFitToWindow = () => setZoom(1);
  const handleFullScreen = () => console.warn('Full screen preview - Coming soon!');

  // --- HELP MENU ---
  const showKeyboardShortcuts = () => {
    console.warn(`
KEYBOARD SHORTCUTS
==================
FILE
  Ctrl+N    New Project
  Ctrl+O    Open Project
  Ctrl+S    Save
  Ctrl+Shift+S  Save As
  Ctrl+I    Import Media
  Ctrl+E    Export

EDIT
  Ctrl+Z    Undo
  Ctrl+Shift+Z / Ctrl+Y  Redo
  Ctrl+X    Cut
  Ctrl+C    Copy
  Ctrl+V    Paste
  Delete    Delete Selected
  Ctrl+A    Select All

PLAYBACK
  Space     Play/Pause
  Home      Go to Start
  End       Go to End
  ← →       Frame Step
  Shift+← →   Jump 1 Second

MARKERS
  M         Add Marker
  Shift+M   Next Marker
  Ctrl+Shift+M  Previous Marker

TIMELINE
  Ctrl+K    Split Clip at Playhead
  Q         Trim In Point
  W         Trim Out Point
  Ctrl+D    Apply Default Transition
  + / -     Zoom In/Out
  `);
  };

  // =====================================================
  // STEP 5: ADD KEYBOARD SHORTCUTS HOOK
  // =====================================================



  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(300);
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedClip, setSelectedClip] = useState(null);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [selectedTransitionType, setSelectedTransitionType] = useState('crossDissolve'); // Default transition to add
  const [zoom, setZoom] = useState(0.3);
  const [frameRate, setFrameRate] = useState(24); // Default to 24fps (film standard)

  const [snapGridSize, setSnapGridSize] = useState(5);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  // User tier
  const [userTier] = useState('professional');
  const ffmpeg = useFFmpeg();

  // UI state
  const [showSnapToGrid, setShowSnapToGrid] = useState(true);
  const [showAudioWaveforms, setShowAudioWaveforms] = useState(true);
  const [activeEffects, setActiveEffects] = useState({});
  const [showEffectsPanel, setShowEffectsPanel] = useState(true);
  const [selectedKeyframeProperty, setSelectedKeyframeProperty] = useState(KEYFRAME_PROPERTIES.OPACITY);
  const [showKeyframePanel, setShowKeyframePanel] = useState(true);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState(null);
  const [selectedKeyframeDraftValue, setSelectedKeyframeDraftValue] = useState('');
  const [selectedKeyframeDraftInterpolation, setSelectedKeyframeDraftInterpolation] = useState(INTERPOLATION_TYPES.LINEAR);

  const [programMonitorMuted, setProgramMonitorMuted] = useState(false);
  const [showCompositingPanel, setShowCompositingPanel] = useState(false);
  const [showColorGrading, setShowColorGrading] = useState(false);
  const [showAudioMixing, setShowAudioMixing] = useState(false);
  const [showScopes, setShowScopes] = useState(false);
  const [showMulticam, setShowMulticam] = useState(false);
  const [showChromaKey, setShowChromaKey] = useState(false);
  const [showSpeedRamp, setShowSpeedRamp] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [showSceneDetection, setShowSceneDetection] = useState(false);
  const [showAdjustmentLayer, setShowAdjustmentLayer] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showBackgroundRemoval, setShowBackgroundRemoval] = useState(false);
  const [showAudioDucking, setShowAudioDucking] = useState(false);
  const [showMotionTracking, setShowMotionTracking] = useState(false);
  const [chromaKeySettings, setChromaKeySettings] = useState(createChromaKeySettings('green'));
  const [speedRampPoints, setSpeedRampPoints] = useState([]);
  const [multicamSession, setMulticamSession] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [textOverlays, setTextOverlays] = useState([]);
  const [watermark, setWatermark] = useState(null);
  const [pipLayers, setPipLayers] = useState([]);
  const [sceneList, setSceneList] = useState([]);
  const [isAnalyzingScenes, setIsAnalyzingScenes] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [adjustmentLayers, setAdjustmentLayers] = useState([]);
  const scopesCanvasRef = useRef(null);
  const scopesRafRef = useRef(null);
  const scopesVideoRef = useRef(null);
  const vectorCanvasRef = useRef(null);
  const histCanvasRef = useRef(null);

  // ── Draw scopes from video frame ──────────────────────────
  const drawScopes = React.useCallback(() => {
    const video = scopesVideoRef.current;
    const waveCanvas = scopesCanvasRef.current;
    const vecCanvas = vectorCanvasRef.current;
    const histCanvas = histCanvasRef.current;
    if (!video || video.readyState < 2) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = 320; offscreen.height = 180;
    const octx = offscreen.getContext('2d');
    octx.drawImage(video, 0, 0, 320, 180);
    const pixels = octx.getImageData(0, 0, 320, 180).data;

    // ── Waveform (luma) ──
    if (waveCanvas) {
      const wctx = waveCanvas.getContext('2d');
      wctx.fillStyle = '#06060f';
      wctx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
      wctx.strokeStyle = '#00ffc8';
      wctx.lineWidth = 1;
      for (let x = 0; x < 320; x++) {
        for (let y = 0; y < 180; y++) {
          const idx = (y * 320 + x) * 4;
          const luma = 0.299*pixels[idx] + 0.587*pixels[idx+1] + 0.114*pixels[idx+2];
          const wx = Math.floor((x / 320) * waveCanvas.width);
          const wy = waveCanvas.height - Math.floor((luma / 255) * waveCanvas.height);
          wctx.fillStyle = 'rgba(0,255,200,0.4)';
          wctx.fillRect(wx, wy, 1, 1);
        }
      }
    }

    // ── Vectorscope (Cb/Cr) ──
    if (vecCanvas) {
      const vctx = vecCanvas.getContext('2d');
      vctx.fillStyle = '#06060f';
      vctx.fillRect(0, 0, vecCanvas.width, vecCanvas.height);
      // Draw target circles
      vctx.strokeStyle = '#21262d';
      vctx.beginPath();
      vctx.arc(vecCanvas.width/2, vecCanvas.height/2, vecCanvas.width*0.4, 0, Math.PI*2);
      vctx.stroke();
      for (let i = 0; i < pixels.length; i += 16) {
        const r=pixels[i], g=pixels[i+1], b=pixels[i+2];
        const cb = 128 - 0.168736*r - 0.331264*g + 0.5*b;
        const cr = 128 + 0.5*r - 0.418688*g - 0.081312*b;
        const vx = Math.floor((cb/255)*vecCanvas.width);
        const vy = Math.floor((cr/255)*vecCanvas.height);
        vctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
        vctx.fillRect(vx, vy, 2, 2);
      }
    }

    // ── Histogram (RGB) ──
    if (histCanvas) {
      const hctx = histCanvas.getContext('2d');
      hctx.fillStyle = '#06060f';
      hctx.fillRect(0, 0, histCanvas.width, histCanvas.height);
      const rHist=new Uint32Array(256), gHist=new Uint32Array(256), bHist=new Uint32Array(256);
      for (let i=0;i<pixels.length;i+=4){ rHist[pixels[i]]++; gHist[pixels[i+1]]++; bHist[pixels[i+2]]++; }
      const maxVal = Math.max(...rHist, ...gHist, ...bHist);
      [[rHist,'rgba(248,81,73,0.7)'],[gHist,'rgba(63,185,80,0.7)'],[bHist,'rgba(74,158,255,0.7)']].forEach(([hist,color])=>{
        hctx.strokeStyle = color;
        hctx.beginPath();
        for (let x=0;x<256;x++){
          const barH = Math.floor((hist[x]/maxVal)*histCanvas.height);
          const px = Math.floor((x/256)*histCanvas.width);
          if (x===0) hctx.moveTo(px, histCanvas.height-barH);
          else hctx.lineTo(px, histCanvas.height-barH);
        }
        hctx.stroke();
      });
    }
  }, []);

  // ── RAF loop for scopes ───────────────────────────────────
  React.useEffect(() => {
    if (!showScopes) { if (scopesRafRef.current) cancelAnimationFrame(scopesRafRef.current); return; }
    const loop = () => { drawScopes(); scopesRafRef.current = requestAnimationFrame(loop); };
    loop();
    return () => { if (scopesRafRef.current) cancelAnimationFrame(scopesRafRef.current); };
  }, [showScopes, drawScopes]);
  const vuAudioCtxRef = useRef(null);
  const vuAnalysersRef = useRef({});
  const vuRafRef = useRef(null);
  const vuBarsRef = useRef({});

  // ── Init Web Audio context for VU meters ──────────────────
  React.useEffect(() => {
    try {
      vuAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { console.warn('VU AudioContext unavailable:', e); }
    return () => {
      if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current);
      if (vuAudioCtxRef.current) vuAudioCtxRef.current.close();
    };
  }, []);

  // ── RAF loop: animate VU bars ─────────────────────────────
  React.useEffect(() => {
    if (!showAudioMixing) { if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current); return; }
    const animate = () => {
      vuRafRef.current = requestAnimationFrame(animate);
      Object.entries(vuAnalysersRef.current).forEach(([trackId, analyser]) => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const rms = Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);
        const level = Math.min(100, (rms / 128) * 100);
        const bars = vuBarsRef.current[trackId];
        if (bars) {
          bars.forEach((bar, i) => {
            if (!bar) return;
            const threshold = (i / bars.length) * 100;
            bar.style.opacity = level > threshold ? '1' : '0.12';
            bar.style.width = level > threshold ? `${40 + i * 3}%` : '8%';
          });
        }
      });
    };
    animate();
    return () => { if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current); };
  }, [showAudioMixing]);
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [draggedTransition, setDraggedTransition] = useState(null);
  const [draggedEffect, setDraggedEffect] = useState(null);
  const [audioPresets, setAudioPresets] = useState({});

  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [showSourceMonitor, setShowSourceMonitor] = useState(false);
  const [sourceMedia, setSourceMedia] = useState(null);
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

  // Add this useKeyboardShortcuts call (after the handler functions):
  useKeyboardShortcuts({
    // File
    onNewProject: handleNewProject,
    onOpenProject: handleOpenProject,
    onSave: handleSave,
    onSaveAs: handleSaveAs,
    onExport: handleExport,
    onImport: () => fileInputRef.current?.click(),

    // Edit
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCut: handleCut,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onSelectAll: handleSelectAll,
    onDeselectAll: handleDeselectAll,

    // Playback
    onPlayPause: playPause,
    onGoToStart: () => setCurrentTime(0),
    onGoToEnd: () => setCurrentTime(duration),
    onFrameBack: () => setCurrentTime(Math.max(0, currentTime - (1 / frameRate))),
    onFrameForward: () => setCurrentTime(Math.min(duration, currentTime + (1 / frameRate))),
    onJumpBack: () => setCurrentTime(Math.max(0, currentTime - 1)),
    onJumpForward: () => setCurrentTime(Math.min(duration, currentTime + 1)),

    // Markers
    onAddMarker: handleAddMarker,
    onNextMarker: handleNextMarker,
    onPrevMarker: handlePrevMarker,

    // Clips
    onSplitClip: handleSplitClip,
    onTrimIn: handleTrimIn,
    onTrimOut: handleTrimOut,
    onApplyTransition: handleApplyDefaultTransition,

    // View
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitToWindow: handleFitToWindow,

    // Help
    onShowShortcuts: showKeyboardShortcuts
  });

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
    // AI / Restoration / Enhancement
    { id: 'low_light_restore', name: 'Low-Light Restore', icon: Lightbulb, category: 'enhancement', description: 'Lift dark footage with denoise and relight' },
    { id: 'shadow_recovery', name: 'Shadow Recovery', icon: Moon, category: 'enhancement', description: 'Recover detail from dark shadows' },
    { id: 'denoise', name: 'Denoise', icon: Filter, category: 'enhancement', description: 'Reduce low-light and sensor noise' },
    { id: 'detail_boost', name: 'Detail Boost', icon: Focus, category: 'enhancement', description: 'Recover edge detail and clarity' },
    { id: 'cinematic_relight', name: 'Cinematic Relight', icon: Sparkles, category: 'enhancement', description: 'Smart cinematic relighting for dark clips' },


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
        const delta = (now - lastTime) / 1000;
        // Apply speed ramp if active clip has speed points
        const activeClipNow = tracks.flatMap(t=>t.clips).find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration);
        const speedMult = (activeClipNow && speedRampPoints.length > 0)
          ? getSpeedAtPosition(speedRampPoints, (currentTime - activeClipNow.startTime) / activeClipNow.duration)
          : 1;
        lastTime = now;

        setCurrentTime(prev => {
          const newTime = prev + delta * speedMult;
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


  const keyframePropertyOptions = [
    { label: 'Opacity', value: KEYFRAME_PROPERTIES.OPACITY },
    { label: 'Position X', value: KEYFRAME_PROPERTIES.POSITION_X },
    { label: 'Position Y', value: KEYFRAME_PROPERTIES.POSITION_Y },
    { label: 'Scale X', value: KEYFRAME_PROPERTIES.SCALE_X },
    { label: 'Scale Y', value: KEYFRAME_PROPERTIES.SCALE_Y },
    { label: 'Rotation', value: KEYFRAME_PROPERTIES.ROTATION },
    { label: 'Brightness', value: KEYFRAME_PROPERTIES.BRIGHTNESS },
    { label: 'Contrast', value: KEYFRAME_PROPERTIES.CONTRAST },
    { label: 'Saturation', value: KEYFRAME_PROPERTIES.SATURATION },
    { label: 'Volume', value: KEYFRAME_PROPERTIES.VOLUME },
  ];

  const getClipAnimatedValue = (clip, property, time, fallback = 0) => {
    if (!clip || !clip.keyframes || !clip.keyframes.length) return fallback;
    const kfs = clip.keyframes.filter(k => k.property === property).sort((a, b) => a.time - b.time);
    if (!kfs.length) return fallback;
    if (time <= kfs[0].time) return kfs[0].value;
    if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
    const next = kfs.find(k => k.time > time);
    const prev = kfs.slice().reverse().find(k => k.time <= time);
    if (!prev || !next) return fallback;
    const t = (time - prev.time) / (next.time - prev.time);
    return prev.value + (next.value - prev.value) * t;
  };

  const getSelectedClipCurrentAnimatedValue = () => {
    if (!selectedClip) return 0;
    const fallback = DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[selectedKeyframeProperty] ?? 0;
    return getClipAnimatedValue(selectedClip, selectedKeyframeProperty, currentTime, fallback);
  };

  const handleAddKeyframe = (property, time, value) => {
    if (!selectedClip) return;

    const fallback = DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[property] ?? 0;
    const nextValue = value ?? getClipAnimatedValue(selectedClip, property, time, fallback);

    const createdKeyframe = createKeyframe({
      time,
      value: nextValue,
    });

    const nextClip = upsertClipKeyframe(
      selectedClip,
      property,
      createdKeyframe
    );

    setTracks(prev =>
      prev.map(track => ({
        ...track,
        clips: track.clips.map(clip => clip.id === selectedClip.id ? nextClip : clip)
      }))
    );

    setSelectedClip(nextClip);
    setSelectedKeyframeId(createdKeyframe.id);
    syncSelectedKeyframeEditor(createdKeyframe);
  };

  const handleRemoveKeyframe = (property, keyframeId) => {
    if (!selectedClip) return;

    const nextClip = deleteClipKeyframe(selectedClip, property, keyframeId);

    setTracks(prev =>
      prev.map(track => ({
        ...track,
        clips: track.clips.map(clip => clip.id === selectedClip.id ? nextClip : clip)
      }))
    );

    setSelectedClip(nextClip);

    if (selectedKeyframeId === keyframeId) {
      setSelectedKeyframeId(null);
    }
  };


  const getSelectedClipTimelineDuration = () => {
    if (!selectedClip) return Math.max(1, duration || 1);
    return Math.max(
      1,
      selectedClip.duration ||
      ((selectedClip.trimEnd || 0) - (selectedClip.trimStart || 0)) ||
      duration ||
      1
    );
  };


  const getSelectedPropertyKeyframes = () => {
    if (!selectedClip) return [];
    return ensurePropertyKeyframes(selectedClip, selectedKeyframeProperty);
  };

  const getSelectedKeyframe = () => {
    return getSelectedPropertyKeyframes().find(kf => kf.id === selectedKeyframeId) || null;
  };

  const syncSelectedKeyframeEditor = (keyframe) => {
    if (!keyframe) {
      setSelectedKeyframeDraftValue('');
      setSelectedKeyframeDraftInterpolation(INTERPOLATION_TYPES.LINEAR);
      return;
    }
    setSelectedKeyframeDraftValue(String(keyframe.value ?? ''));
    setSelectedKeyframeDraftInterpolation(keyframe.interpolation || INTERPOLATION_TYPES.LINEAR);
  };

  const handleSelectKeyframe = (keyframeId) => {
    setSelectedKeyframeId(keyframeId);
    const keyframe = getSelectedPropertyKeyframes().find(kf => kf.id === keyframeId);
    syncSelectedKeyframeEditor(keyframe);
  };

  const handleUpdateSelectedKeyframe = (patch = {}) => {
    if (!selectedClip || !selectedKeyframeId) return;

    const nextClip = patchClipKeyframe(
      selectedClip,
      selectedKeyframeProperty,
      selectedKeyframeId,
      patch
    );

    setTracks(prev =>
      prev.map(track => ({
        ...track,
        clips: track.clips.map(clip => clip.id === selectedClip.id ? nextClip : clip)
      }))
    );

    setSelectedClip(nextClip);

    const nextKeyframe = ensurePropertyKeyframes(nextClip, selectedKeyframeProperty).find(
      kf => kf.id === selectedKeyframeId
    );
    syncSelectedKeyframeEditor(nextKeyframe);
  };

  const handlePrevNextKeyframe = (direction = 1) => {
    const keyframes = getSelectedPropertyKeyframes();
    if (!keyframes.length) return;

    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    const currentIndex = sorted.findIndex(kf => kf.id === selectedKeyframeId);

    let target = null;

    if (currentIndex === -1) {
      target = direction > 0 ? sorted[0] : sorted[sorted.length - 1];
    } else {
      const nextIndex = Math.max(0, Math.min(sorted.length - 1, currentIndex + direction));
      target = sorted[nextIndex];
    }

    if (target) {
      handleSelectKeyframe(target.id);
      handleSeekToKeyframe(target.time);
    }
  };

  const handleSeekToKeyframe = (time) => {
    setCurrentTime(time);
    if (videoRef?.current) {
      try {
        videoRef.current.currentTime = time;
      } catch (e) {
        console.log('Seek sync skipped:', e);
      }
    }
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

        console.warn(`Failed to apply ${effectId}: ${error.message}`);
        return;
      }
    } else {
      // Video effect
      console.log(`🎬 Applying video effect "${effectId}" to clip ${clipId}`);

      const backendVideoEffects = ['low_light_restore', 'shadow_recovery', 'denoise', 'detail_boost', 'cinematic_relight'];

      setActiveEffects(prev => ({
        ...prev,
        [clipId]: {
          ...prev[clipId],
          [effectId]: value,
          [`${effectId}_loading`]: true
        }
      }));

      try {
        if (backendVideoEffects.includes(effectId)) {
          const payload = {
            effect_id: effectId,
            intensity: parseFloat(value)
          };

          if (clip.r2_key) payload.r2_key = clip.r2_key;
          else if (clip.source_url) payload.source_url = clip.source_url;
          else if (clip.mediaUrl) payload.source_url = clip.mediaUrl;
          else if (clip.url) payload.source_url = clip.url;
          else if (clip.cloudinary_public_id) payload.public_id = clip.cloudinary_public_id;

          const result = await applyVideoEffect(payload);

          if (result?.processed_url) {
            setSelectedClip(prev => prev && prev.id === clipId ? {
              ...prev,
              previewUrl: result.processed_url,
              mediaUrl: result.processed_url,
              source_url: result.processed_url,
              ...(result.r2_key ? { r2_key: result.r2_key } : {})
            } : prev);
          }
        }

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
      } catch (error) {
        console.error('Video effect application error:', error);
        console.warn(`Failed to apply ${effectId}: ${error.message}`);
      } finally {
        setActiveEffects(prev => ({
          ...prev,
          [clipId]: {
            ...prev[clipId],
            [`${effectId}_loading`]: false
          }
        }));
      }
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
    } else {
      try {
        let previewUrl = null;

        if (clip.r2_key || clip.source_url || clip.mediaUrl || clip.url) {
          const response = await fetch(`${backendURL}/api/video-editor/effect-preview`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              r2_key: clip.r2_key || '',
              source_url: clip.source_url || clip.mediaUrl || clip.url || '',
              effect_id: effectId,
              intensity: intensity
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Preview failed');
          }

          const data = await response.json();
          previewUrl = data.preview_url;
        } else if (clip.cloudinary_public_id) {
          previewUrl = await previewVideoEffect(clip.cloudinary_public_id, effectId, intensity);
        }

        if (previewUrl) {
          setSelectedClip({
            ...clip,
            previewUrl: previewUrl
          });

          setActiveEffects(prev => ({
            ...prev,
            [clipId]: {
              ...prev[clipId],
              [`${effectId}_preview`]: previewUrl
            }
          }));
        }

        console.log(`Previewing ${effectId} on video clip ${clipId}`);
      } catch (error) {
        console.error('Video preview error:', error);
      }
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
    console.warn(`✅ Added "${transitionName}" transition between "${clip1.title}" and "${clip2.title}"!`);
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

    // Find linked clip by linkGroup (most reliable) or title fallback
    const linkedClip = (() => {
      for (const t of tracks) {
        if (t.id === trackId) continue;
        // Match by linkGroup first
        if (clip.linkGroup) {
          const linked = t.clips.find(c => c.linkGroup === clip.linkGroup && c.id !== clip.id);
          if (linked) return { clip: linked, trackId: t.id };
        }
        // Fallback: title matching
        if (clip.type === 'video') {
          const a = t.clips.find(c => c.title === clip.title + ' (Audio)' || c.title === clip.title + ' (audio)');
          if (a) return { clip: a, trackId: t.id };
        } else if (clip.type === 'audio') {
          const baseName = clip.title.replace(' (Audio)', '').replace(' (audio)', '');
          const v = t.clips.find(c => c.title === baseName);
          if (v) return { clip: v, trackId: t.id };
        }
      }
      return null;
    })();

    setDraggedClip({ ...clip, trackId, originalTrackId: trackId, linkedClip });
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

    // Move clip (possibly to new track) + linked clip
    const linked = draggedClip.linkedClip;
    if (targetTrackId !== draggedClip.trackId) {
      // Moving to a different track
      setTracks(prevTracks =>
        prevTracks.map(track => {
          if (track.id === draggedClip.trackId) {
            return { ...track, clips: track.clips.filter(c => c.id !== draggedClip.id) };
          } else if (track.id === targetTrackId) {
            return { ...track, clips: [...track.clips, { ...draggedClip, startTime: Math.max(0, newTime) }] };
          }
          // Move linked clip too
          if (linked && track.id === linked.trackId) {
            return { ...track, clips: track.clips.map(c => c.id === linked.clip.id ? { ...c, startTime: Math.max(0, newTime) } : c) };
          }
          return track;
        })
      );
      // Update draggedClip's trackId
      setDraggedClip(prev => ({ ...prev, trackId: targetTrackId }));
    } else {
      // Moving within same track + move linked clip
      setTracks(prevTracks =>
        prevTracks.map(track => {
          if (track.id === draggedClip.trackId) {
            return { ...track, clips: track.clips.map(c => c.id === draggedClip.id ? { ...c, startTime: Math.max(0, newTime) } : c) };
          }
          if (linked && track.id === linked.trackId) {
            return { ...track, clips: track.clips.map(c => c.id === linked.clip.id ? { ...c, startTime: Math.max(0, newTime) } : c) };
          }
          return track;
        })
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
        _realDuration: null,
        uploading: true
      };

      setMediaLibrary(prev => [...prev, newMediaItem]);

      // Probe real duration from local file
      if (fileType === 'video' || fileType === 'audio') {
        try {
          const probeEl = document.createElement(fileType === 'audio' ? 'audio' : 'video');
          probeEl.preload = 'metadata';
          probeEl.onerror = () => {};
          probeEl.onloadedmetadata = () => {
            try {
              const dur = isFinite(probeEl.duration) && probeEl.duration > 0 ? probeEl.duration : 30;
              const mins = Math.floor(dur / 60);
              const secs = Math.round(dur % 60).toString().padStart(2, '0');
              setMediaLibrary(prev => prev.map(m => m.id === tempId ? { ...m, duration: `${mins}:${secs}`, _realDuration: dur } : m));
            } catch(e) {}
          };
          probeEl.src = newMediaItem.url;
        } catch(e) {}
      }

      try {
        // Upload to Cloudinary
        const asset = await uploadEditorAsset(file);

        // Update with R2 data
        setMediaLibrary(prev => prev.map(item =>
          item.id === tempId ? {
            ...item,
            id: asset.public_id || tempId,
            cloudinary_public_id: asset.public_id || asset.r2_key,
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

    // Try dataTransfer if draggedMedia state is null (common during fast drags)
    let resolvedMedia = draggedMedia;
    if (!resolvedMedia) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.name || parsed.url)) resolvedMedia = parsed;
        }
      } catch {}
    }
    if (!resolvedMedia) {
      console.log('❌ No media found in state or dataTransfer');
      return;
    }
    // Use resolvedMedia instead of draggedMedia below
    const draggedMedia = resolvedMedia;

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
    // Auto-generate thumbnail if clip has cloudinary ID
    if (newClip.cloudinary_public_id && !newClip.thumbnail) {
      const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
      fetch(`${backendURL}/api/video-editor/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ public_id: newClip.cloudinary_public_id, timestamp: 0 })
      }).then(r => r.json()).then(data => {
        if (data.thumbnail_url) {
          setTracks(prev => prev.map(t => ({
            ...t,
            clips: t.clips.map(c => c.id === newClip.id ? { ...c, thumbnail: data.thumbnail_url } : c)
          })));
        }
      }).catch(() => {});
    }
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
    const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);
    if (totalClips === 0) {
      console.warn('Please add some media to the timeline before exporting.');
      return;
    }
    // Allow export with local files OR cloud files
    const hasLocalClips = tracks.some(t => t.clips.some(c => c._localFile));
    const hasCloudClips = tracks.some(t => t.clips.some(c => c.cloudinary_public_id || c.r2_key));
    if (!hasLocalClips && !hasCloudClips) {
      console.warn('Please add media to the timeline before exporting.');
      return;
    }
    // If in Electron, offer native export
    if (electronFS.isElectron) {
      const hasLocalClips = tracks.some(t => t.clips.some(c => c._localPath || c._localFile));
      if (hasLocalClips && window.confirm('Export locally using native FFmpeg? (Faster, no upload needed)')) {
        handleNativeExport();
        return;
      }
    }
    setShowExportModal(true);
  };

  const handleNativeExport = async () => {
    try {
      const savePath = await electronFS.saveExport(new Blob(), 'StreamPireX-Export.mp4');
      if (!savePath) return;
      // Build FFmpeg args from timeline
      const videoClips = tracks
        .filter(t => t.type === 'video')
        .flatMap(t => t.clips)
        .filter(c => c._localPath)
        .sort((a,b) => a.startTime - b.startTime);
      if (videoClips.length === 0) { console.warn('No local clips to export'); return; }
      const listPath = savePath.replace('.mp4', '_list.txt');
      const listContent = videoClips.map(c => `file '${c._localPath}'`).join('\n');
      await electronFS.saveExport(new Blob([listContent], {type:'text/plain'}), listPath);
      const result = await electronFS.runFFmpeg([
        '-f', 'concat', '-safe', '0',
        '-i', listPath,
        '-vf', 'scale=1920:1080,fps=24',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        savePath
      ]);
      if (result.code === 0) {
        console.warn(`✅ Exported to: ${savePath}`);
      } else {
        console.error('Export failed: ' + result.stderr?.slice(-200));
      }
    } catch(e) { console.error('Native export error: ' + e.message); }
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
        console.warn('Project saved!');
      }
    } catch (error) {
      console.error('Save error:', error);
      console.warn(`Failed to save: ${error.message}`);
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

  // After your hook instances
  useEffect(() => {
    if (projectManager.currentProject?.id) {
      projectManager.enableAutoSave(() => ({
        tracks,
        markers: markersHook.markers,
        settings: { frameRate, width: project.resolution.width, height: project.resolution.height }
      }), 30000);
    }
    return () => projectManager.disableAutoSave();
  }, [projectManager.currentProject?.id]);

  // Auto-save to backend every 60s if project has been modified
  React.useEffect(() => {
    if (!tracks || tracks.every(t => t.clips.length === 0)) return;
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
        await fetch(`${backendURL}/api/video-editor/save-project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title: project.title, timeline: { tracks }, settings: { frameRate }, autosave: true })
        });
        console.log('💾 Auto-saved');
      } catch {}
    }, 60000);
    return () => clearTimeout(timer);
  }, [tracks]);

  // Menu definitions
  const menuItems = {
    file: {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+N', action: handleNewProject },
        { label: 'Open Project', shortcut: 'Ctrl+O', action: handleOpenProject },
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
        { type: 'separator' },
        { label: 'Import Media', shortcut: 'Ctrl+I', action: () => fileInputRef.current?.click() },
        { label: 'Export', shortcut: 'Ctrl+E', action: () => setShowExportModal(true) },
        { type: 'separator' },
        { label: 'Project Settings', action: () => console.warn('Project Settings - Coming Soon') },
        { label: 'Close Project', action: () => window.history.back() }
      ]
    },
    edit: {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: handleUndo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: handleRedo, disabled: !canRedo },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: handleCut, disabled: !selectedClip && !selectedTransition },
        { label: 'Copy', shortcut: 'Ctrl+C', action: handleCopy, disabled: !selectedClip && !selectedTransition },
        { label: 'Paste', shortcut: 'Ctrl+V', action: handlePaste, disabled: !clipboard.hasData },
        { label: 'Delete', shortcut: 'Del', action: handleDelete, disabled: !selectedClip && !selectedTransition },
        { type: 'separator' },
        { label: 'Select All', shortcut: 'Ctrl+A', action: handleSelectAll },
        { label: 'Deselect All', shortcut: 'Ctrl+Shift+A', action: handleDeselectAll }
      ]
    },
    clip: {
      label: 'Clip',
      items: [
        { label: 'Split Clip', shortcut: 'Ctrl+K', action: handleSplitClip },
        { label: 'Trim In Point', shortcut: 'Q', action: handleTrimIn, disabled: !selectedClip },
        { label: 'Trim Out Point', shortcut: 'W', action: handleTrimOut, disabled: !selectedClip },
        { type: 'separator' },
        { label: 'Speed/Duration...', action: handleSpeedDuration, disabled: !selectedClip },
        { label: 'Reverse Clip', action: handleReverseClip, disabled: !selectedClip },
        { type: 'separator' },
        { label: 'Nest Clip', action: () => console.warn('Nest - Coming Soon'), disabled: !selectedClip },
        { label: 'Unlink Audio/Video', action: () => console.warn('Unlink - Coming Soon'), disabled: !selectedClip }
      ]
    },
    sequence: {
      label: 'Sequence',
      items: [
        { label: 'Add Tracks...', action: handleAddTracks },
        { label: 'Delete Empty Tracks', action: handleDeleteEmptyTracks },
        { type: 'separator' },
        { label: 'Apply Default Transition', shortcut: 'Ctrl+D', action: handleApplyDefaultTransition },
        { label: 'Render In to Out', shortcut: 'Enter', action: () => console.warn('Render - Coming Soon') },
        { type: 'separator' },
        { label: 'Go to In Point', shortcut: 'Shift+I', action: () => setCurrentTime(0) },
        { label: 'Go to Out Point', shortcut: 'Shift+O', action: () => setCurrentTime(duration) }
      ]
    },
    markers: {
      label: 'Markers',
      items: [
        { label: 'Add Marker', shortcut: 'M', action: handleAddMarker },
        { label: 'Go to Next Marker', shortcut: 'Shift+M', action: handleNextMarker },
        { label: 'Go to Previous Marker', shortcut: 'Ctrl+Shift+M', action: handlePrevMarker },
        { type: 'separator' },
        { label: 'Clear Current Marker', action: handleClearCurrentMarker },
        { label: 'Clear All Markers', action: handleClearAllMarkers }
      ]
    },
    view: {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: '=', action: handleZoomIn },
        { label: 'Zoom Out', shortcut: '-', action: handleZoomOut },
        { label: 'Fit to Window', shortcut: '\\', action: handleFitToWindow },
        { type: 'separator' },
        { label: 'Show Audio Waveforms', checked: showAudioWaveforms, action: () => setShowAudioWaveforms(!showAudioWaveforms) },
        { label: 'Show Keyframes', checked: showKeyframes, action: () => setShowKeyframes(!showKeyframes) },
        { label: 'Snap to Grid', checked: showSnapToGrid, action: () => setShowSnapToGrid(!showSnapToGrid) },
        { type: 'separator' },
        { label: 'Full Screen Preview', shortcut: '`', action: handleFullScreen }
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
        { label: 'Audio Mixer', checked: showAudioMixing, action: () => setShowAudioMixing(!showAudioMixing) },
        { type: 'separator' },
        { label: 'Video Scopes', checked: showScopes, action: () => setShowScopes(!showScopes) },
        { label: 'Multicam Editor', checked: showMulticam, action: () => setShowMulticam(!showMulticam) },
        { label: 'Chroma Key', checked: showChromaKey, action: () => setShowChromaKey(!showChromaKey) },
        { label: 'Speed Ramp', checked: showSpeedRamp, action: () => setShowSpeedRamp(!showSpeedRamp) },
        { label: 'Adjustment Layer', checked: showAdjustmentLayer, action: () => setShowAdjustmentLayer(!showAdjustmentLayer) },
        { type: 'separator' },
        { label: 'Captions / Subtitles', checked: showCaptions, action: () => setShowCaptions(!showCaptions) },
        { label: 'Text & Titles', checked: showTitles, action: () => setShowTitles(!showTitles) },
        { label: 'Overlays & PIP', checked: showOverlays, action: () => setShowOverlays(!showOverlays) },
        { type: 'separator' },
        { label: 'Scene Detection', checked: showSceneDetection, action: () => setShowSceneDetection(!showSceneDetection) },
        { label: 'Background Removal', checked: showBackgroundRemoval, action: () => setShowBackgroundRemoval(!showBackgroundRemoval) },
        { label: 'Motion Tracking', checked: showMotionTracking, action: () => setShowMotionTracking(!showMotionTracking) },
        { label: 'Audio Ducking', checked: showAudioDucking, action: () => setShowAudioDucking(!showAudioDucking) },
        { label: 'Template Library', checked: showTemplateLibrary, action: () => setShowTemplateLibrary(!showTemplateLibrary) }
      ]
    },
    help: {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: showKeyboardShortcuts },
        { label: 'Documentation', action: () => window.open('https://docs.streampirex.com/video-editor', '_blank') },
        { type: 'separator' },
        { label: 'About StreamPireX Editor', action: () => console.warn('StreamPireX Video Editor\nVersion 1.0.0\n\nProfessional video editing for creators.') }
      ]
    }
  };

  // ── Panel resize helper ──────────────────────────────────
  const usePanelResize = (defaultW = 380, defaultH = null) => {
    const [size, setSize] = React.useState({ w: defaultW, h: defaultH });
    const dragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0, w: defaultW, h: defaultH });
    const onMouseDown = (e) => {
      dragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h || 400 };
      const onMove = (e2) => {
        if (!dragging.current) return;
        const dw = startPos.current.x - e2.clientX;
        const dh = e2.clientY - startPos.current.y;
        setSize({ w: Math.max(280, startPos.current.w + dw), h: defaultH ? Math.max(200, startPos.current.h + dh) : null });
      };
      const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    return { size, onMouseDown };
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
            {/* Inside your menu dropdown - around line ~2100+ */}
            {activeMenu === key && (
              <div className="menu-dropdown">
                {menu.items.map((item, idx) => (
                  item.type === 'separator' ? (
                    <div key={idx} className="menu-separator" />
                  ) : (
                    <button
                      key={idx}
                      className={`menu-item ${item.disabled ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!item.disabled) {
                          item.action?.();
                          setActiveMenu(null);
                        }
                      }}
                      disabled={item.disabled}
                      style={{ opacity: item.disabled ? 0.5 : 1 }}
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
      <div className="editor-menu-bar">
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
            onClick={() => {}}
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
            onClick={() => setShowScopes(!showScopes)}
            title="Video Scopes"
            style={{ display:'flex',alignItems:'center',gap:'3px',padding:'5px 8px',
              background: showScopes ? 'rgba(0,255,200,0.15)' : '#2a2a2a',
              border: `1px solid ${showScopes ? '#00ffc8' : '#404040'}`,
              borderRadius:'4px',color: showScopes ? '#00ffc8' : '#a0a0a0',fontSize:'9px',fontWeight:500,cursor:'pointer'}}
          ><Activity size={11}/>Scopes</button>
          <button
            onClick={() => setShowMulticam(!showMulticam)}
            title="Multicam Editor"
            style={{ display:'flex',alignItems:'center',gap:'3px',padding:'5px 8px',
              background: showMulticam ? 'rgba(0,255,200,0.15)' : '#2a2a2a',
              border: `1px solid ${showMulticam ? '#00ffc8' : '#404040'}`,
              borderRadius:'4px',color: showMulticam ? '#00ffc8' : '#a0a0a0',fontSize:'9px',fontWeight:500,cursor:'pointer'}}
          ><Tv size={11}/>Multicam</button>
          <button
            onClick={() => setShowChromaKey(!showChromaKey)}
            title="Chroma Key"
            style={{ display:'flex',alignItems:'center',gap:'3px',padding:'5px 8px',
              background: showChromaKey ? 'rgba(0,255,100,0.15)' : '#2a2a2a',
              border: `1px solid ${showChromaKey ? '#00ff64' : '#404040'}`,
              borderRadius:'4px',color: showChromaKey ? '#00ff64' : '#a0a0a0',fontSize:'9px',fontWeight:500,cursor:'pointer'}}
          ><Aperture size={11}/>Chroma</button>
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
        {/* Left Panel - Vertical Tools + Media + Effects + Transitions */}
        {/* Left panel removed */}
        {/* ── VERTICAL TOOLBAR ── */}
        <div className="spx-vtoolbar">
          {[
            {id:'select', icon:'↖', tip:'Selection (V)'},
            {id:'track', icon:'⇕', tip:'Track Select (A)'},
            {id:'ripple', icon:'◄►', tip:'Ripple Edit (B)'},
            {id:'roll', icon:'↹', tip:'Rolling Edit (N)'},
            {id:'razor', icon:'✂', tip:'Razor (C)'},
            {id:'slip', icon:'↔', tip:'Slip (Y)'},
            {id:'pen', icon:'✒', tip:'Pen (P)'},
            {id:'hand', icon:'☚', tip:'Hand (H)'},
            {id:'zoom', icon:'⊕', tip:'Zoom (Z)'},
          ].map(t => (
            <button key={t.id}
              className={`spx-vtoolbar-btn ${selectedTool===t.id?'active':''}`}
              onClick={() => setSelectedTool(t.id)}
              title={t.tip}
              style={{fontSize:13}}>
              {t.icon}
            </button>
          ))}
          <div className="spx-vtoolbar-divider"/>
          <button className="spx-vtoolbar-btn" title="Add Track" onClick={handleAddTracks} style={{fontSize:13}}>+</button>
          <button className="spx-vtoolbar-btn" title="Markers" onClick={handleAddMarker} style={{fontSize:13}}>◆</button>
        </div>

        {/* Left Panel - Tools & Effects (legacy inline — hidden) */}
        <div className="editor-left-panel" style={{display:'none'}}>
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
              onClick={async () => {
                if (electronFS.isElectron) {
                  // Native file picker — no upload needed
                  const files = await electronFS.openFiles();
                  if (files.length > 0) {
                    const newItems = files.map(f => ({
                      id: Date.now() + Math.random(),
                      name: f.name,
                      type: f.type,
                      url: f.url,
                      _localPath: f._localPath,
                      _isLocal: true,
                      duration: f.type === 'image' ? '0:05' : '0:30',
                      uploading: false,
                    }));
                    setMediaLibrary(prev => [...prev, ...newItems]);
                  }
                } else {
                  fileInputRef.current?.click();
                }
              }}
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
                                  console.warn(`✅ Applied "${effect.name}" to "${selectedClip.title}"!\n\nNote: The effect is saved to the clip. It will be applied during export.`);
                                } else {
                                  console.warn('Please select a clip on the timeline first!');
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

                                    {/* Enhancement / Restoration */}
                  <div className="effect-category">
                    <div
                      className="category-header"
                      style={{ background: 'rgba(255, 204, 0, 0.08)' }}
                    >
                      <span>✨ Enhancement</span>
                    </div>
                    <div className="effect-list-category">
                      {getEffectsByCategory('enhancement', videoEffects).map(effect => {
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
                                applyEffect(selectedClip.id, effect.id, 60);
                              } else {
                                console.warn('Please select a clip on the timeline first!');
                              }
                            }}
                            title={selectedClip ? `Click to apply ${effect.name} to "${selectedClip.title}"` : `Select a clip first`}
                            style={{ cursor: selectedClip ? 'pointer' : 'grab' }}
                          >
                            <Icon size={14} />
                            <span>{effect.name}</span>
                            {selectedClip && <div className="apply-hint" style={{ marginLeft: 'auto', fontSize: '10px', color: '#ffcc00' }}>AI</div>}
                            <div className="drag-hint">📎</div>
                          </div>
                        );
                      })}
                    </div>
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
                                  console.warn('Please select a clip on the timeline first!');
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
                            const videoTrack = [...tracks].filter(t => t.type === 'video' && !t.locked).sort((a,b) => (a.zIndex||0)-(b.zIndex||0))[0] || null;
                            const audioTrack = tracks.find(t => t.type === 'audio');
                            const targetTrack = media.type === 'audio' ? audioTrack : videoTrack;

                            if (targetTrack && !targetTrack.locked) {
                              // Get real duration
                              let durationSeconds = 30;
                              if (media._realDuration && isFinite(media._realDuration) && media._realDuration > 0) {
                                durationSeconds = media._realDuration;
                              } else if (media.duration) {
                                const parts = media.duration.split(':');
                                if (parts.length === 3) durationSeconds = parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
                                else if (parts.length === 2) durationSeconds = parseInt(parts[0])*60 + parseInt(parts[1]);
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

                              setTracks(prevTracks => {
                                const aTrack = prevTracks.find(t => t.type === 'audio' && !t.locked);
                                const aEnd = aTrack ? aTrack.clips.reduce((mx,c) => Math.max(mx, c.startTime+c.duration), 0) : 0;
                                const audioClip = media.type === 'video' && aTrack ? {
                                  id: Date.now() + 1,
                                  title: media.name + ' (Audio)',
                                  startTime: aEnd,
                                  duration: durationSeconds,
                                  type: 'audio',
                                  mediaUrl: media.url,
                                  cloudinary_public_id: media.cloudinary_public_id,
                                  inPoint: 0, outPoint: durationSeconds,
                                  effects: [], keyframes: [],
                                  compositing: { opacity: 100 }
                                } : null;
                                return prevTracks.map(t => {
                                  if (t.id === targetTrack.id) return { ...t, clips: [...t.clips, newClip] };
                                  if (audioClip && t.id === aTrack.id) return { ...t, clips: [...t.clips, audioClip] };
                                  return t;
                                });
                              });

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
          {/* SOURCE MONITOR & PROGRAM MONITOR — inline via VideoEditorMonitors */}
          <VideoEditorMonitors
            tracks={tracks}
            currentTime={currentTime}
            isPlaying={isPlaying}
            programMuted={programMonitorMuted}
            setProgramMuted={setProgramMonitorMuted}
            sourceMedia={sourceMedia}
            setSourceMedia={setSourceMedia}
            showSourceMon={showSourceMonitor}
            setShowSourceMon={setShowSourceMonitor}
            onPlayPause={() => setIsPlaying(p => !p)}
            onSeek={(t) => setCurrentTime(t === Infinity ? duration : t)}
            addClipToTrack={(trackId, clipObj) => {
              // Add clip immediately — don't wait for thumbnail
              const clipToAdd = {
                ...clipObj,
                title: clipObj.title || clipObj.name,
                thumbnail: clipObj.thumbnail || null
              };
              setTracks(prev => prev.map(t =>
                t.id === trackId ? { ...t, clips: [...t.clips, clipToAdd] } : t
              ));
              // Then async update thumbnail if needed
              const finalize = (thumb) => {
                if (!thumb) return;
                setTracks(prev => prev.map(t => ({
                  ...t,
                  clips: t.clips.map(c => c.id === clipToAdd.id ? { ...c, thumbnail: thumb } : c)
                })));
              };
              if (clipObj.type === 'video' && clipObj.mediaUrl && !clipObj.thumbnail) {
                try {
                  const vid = document.createElement('video');
                  vid.crossOrigin = 'anonymous';
                  vid.src = clipObj.mediaUrl;
                  vid.currentTime = 0.5;
                  vid.onloadeddata = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 160; canvas.height = 90;
                    canvas.getContext('2d').drawImage(vid, 0, 0, 160, 90);
                    finalize(canvas.toDataURL('image/jpeg', 0.7));
                  };
                  vid.onerror = () => finalize(null);
                } catch { finalize(null); }
              } else {
                finalize(clipObj.thumbnail || null);
              }
            }}
            formatTime={formatTime}
          />
          {/* Legacy inline monitors — hidden */}
          <div className="preview-area-container" style={{display:"none"}}>
            <div className="preview-area">
              <div className="preview-container">
                <div className="monitor-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#a7a7a7'
                }}>
                  SOURCE MONITOR
                </div>
                <div className="preview-screen">
                  <div className="preview-content">
                    {sourceMonitorMedia ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sourceMonitorMedia.type === 'video' && (
                          <video src={sourceMonitorMedia.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
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
                        const videoTrack = [...tracks].filter(t => t.type === 'video' && !t.locked).sort((a,b) => (a.zIndex||0)-(b.zIndex||0))[0] || null;
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

                          // Also add audio track for video files
                          if (sourceMonitorMedia.type === 'video' && audioTrack && !audioTrack.locked) {
                            const audioLastEnd = audioTrack.clips.reduce((max, clip) =>
                              Math.max(max, clip.startTime + clip.duration), 0
                            );
                            const audioClip = {
                              id: Date.now() + 1,
                              title: `${sourceMonitorMedia.name} (Audio)`,
                              startTime: audioLastEnd,
                              duration: durationSeconds,
                              type: 'audio',
                              mediaUrl: sourceMonitorMedia.url,
                              cloudinary_public_id: sourceMonitorMedia.cloudinary_public_id,
                              inPoint: 0,
                              outPoint: durationSeconds,
                              effects: [], keyframes: [],
                              compositing: { opacity: 100 }
                            };
                            setTracks(prev => prev.map(t =>
                              t.id === audioTrack.id ? { ...t, clips: [...t.clips, audioClip] } : t
                            ));
                          }

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
            <div className="preview-area">
              <div className="preview-container">
                <div className="monitor-header" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white'
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
                                  opacity: animatedOpacity / 100,
                                  transform: `translate(${animatedPositionX}px, ${animatedPositionY}px) scale(${animatedScaleX / 100}, ${animatedScaleY / 100}) rotate(${animatedRotation}deg)`,
                                  transformOrigin: 'center center',
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
                        const buildCssFilters = (effects, activeClipRef, localTime) => {
                          if (!effects || effects.length === 0) {
                            const animatedBrightnessOnly = getClipAnimatedValue(
                              activeClipRef,
                              KEYFRAME_PROPERTIES.BRIGHTNESS,
                              localTime,
                              DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.BRIGHTNESS] ?? 50
                            );
                            const animatedContrastOnly = getClipAnimatedValue(
                              activeClipRef,
                              KEYFRAME_PROPERTIES.CONTRAST,
                              localTime,
                              DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.CONTRAST] ?? 50
                            );
                            const animatedSaturationOnly = getClipAnimatedValue(
                              activeClipRef,
                              KEYFRAME_PROPERTIES.SATURATION,
                              localTime,
                              DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.SATURATION] ?? 50
                            );

                            return [
                              `brightness(${0.5 + (animatedBrightnessOnly / 100)})`,
                              `contrast(${0.5 + (animatedContrastOnly / 100)})`,
                              `saturate(${animatedSaturationOnly / 50})`
                            ].join(' ');
                          }

                          const animatedBrightness = getClipAnimatedValue(
                            activeClipRef,
                            KEYFRAME_PROPERTIES.BRIGHTNESS,
                            localTime,
                            DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.BRIGHTNESS] ?? 50
                          );

                          const animatedContrast = getClipAnimatedValue(
                            activeClipRef,
                            KEYFRAME_PROPERTIES.CONTRAST,
                            localTime,
                            DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.CONTRAST] ?? 50
                          );

                          const animatedSaturation = getClipAnimatedValue(
                            activeClipRef,
                            KEYFRAME_PROPERTIES.SATURATION,
                            localTime,
                            DEFAULT_KEYFRAME_VALUE_BY_PROPERTY[KEYFRAME_PROPERTIES.SATURATION] ?? 50
                          );

                          const filters = effects.map(effect => {
                            const value = effect.value || 50;
                            const animatedEffectValue = getClipAnimatedValue(
                              activeClipRef,
                              KEYFRAME_PROPERTIES.EFFECT_INTENSITY,
                              localTime,
                              value
                            );

                            switch (effect.id) {
                              case 'low_light_restore':
                                return `brightness(${1 + (animatedEffectValue / 140)}) contrast(${1 + (animatedEffectValue / 300)}) saturate(${1 + (animatedEffectValue / 500)})`;
                              case 'shadow_recovery':
                                return `brightness(${1 + (animatedEffectValue / 180)}) contrast(${1 + (animatedEffectValue / 500)})`;
                              case 'denoise':
                                return `contrast(${1 + (animatedEffectValue / 800)}) saturate(${1 - (animatedEffectValue / 1200)})`;
                              case 'detail_boost':
                                return `contrast(${1 + (animatedEffectValue / 250)}) saturate(${1 + (animatedEffectValue / 900)})`;
                              case 'cinematic_relight':
                                return `brightness(${1 + (animatedEffectValue / 160)}) contrast(${1 + (animatedEffectValue / 260)}) saturate(${1 + (animatedEffectValue / 700)})`;
                              case 'brightness':
                                return `brightness(${0.5 + (animatedBrightness / 100)})`;
                              case 'contrast':
                                return `contrast(${0.5 + (animatedContrast / 100)})`;
                              case 'saturation':
                                return `saturate(${animatedSaturation / 50})`;
                              case 'hue':
                                return `hue-rotate(${(animatedEffectValue / 100) * 360}deg)`;
                              case 'blur':
                                return `blur(${animatedEffectValue / 10}px)`;
                              case 'grayscale':
                                return `grayscale(${animatedEffectValue}%)`;
                              case 'sepia':
                                return `sepia(${animatedEffectValue}%)`;
                              case 'invert':
                                return `invert(${animatedEffectValue}%)`;
                              default:
                                return '';
                            }
                          }).filter(f => f);

                          return filters.length ? filters.join(' ') : [
                            `brightness(${0.5 + (animatedBrightness / 100)})`,
                            `contrast(${0.5 + (animatedContrast / 100)})`,
                            `saturate(${animatedSaturation / 50})`
                          ].join(' ');
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

                        const animatedOpacity = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.OPACITY,
                          clipProgress * (activeClip.duration || 0),
                          100
                        );

                        const animatedPositionX = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.POSITION_X,
                          clipProgress * (activeClip.duration || 0),
                          0
                        );

                        const animatedPositionY = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.POSITION_Y,
                          clipProgress * (activeClip.duration || 0),
                          0
                        );

                        const animatedScaleX = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.SCALE_X,
                          clipProgress * (activeClip.duration || 0),
                          100
                        );

                        const animatedScaleY = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.SCALE_Y,
                          clipProgress * (activeClip.duration || 0),
                          100
                        );

                        const animatedRotation = getClipAnimatedValue(
                          activeClip,
                          KEYFRAME_PROPERTIES.ROTATION,
                          clipProgress * (activeClip.duration || 0),
                          0
                        );

                        const localPreviewTime = clipProgress * (activeClip.duration || 0);
                        const cssFilters = buildCssFilters(activeClip.effects, activeClip, localPreviewTime);
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
                                  scopesVideoRef.current = el;
                                  if (el) {
                                    const targetTime = Math.min(clipOffset, el.duration || activeClip.duration);
                                    if (Math.abs(el.currentTime - targetTime) > 0.15) {
                                      el.currentTime = targetTime;
                                    }
                                    if (isPlaying && el.paused) {
                                      el.play().catch(() => {});
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
          <div className="d-flex" style={{display:"flex",flexDirection:"row",flex:1,minHeight:0,overflow:"hidden",alignItems:"stretch"}}>
            {false && (
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
              <div style={{width:'100%', height:300, flexShrink:0}}>
              <SourceMonitor
                selectedMedia={sourceMonitorMedia}
                onAddToTimeline={(media, inPoint, outPoint, insertType) => {
                  if (!insertType) insertType = media.type === 'audio' ? 'audio' : 'both';

                  // Get real duration — outPoint may be a string or NaN
                  let clipDuration = parseFloat(outPoint) - parseFloat(inPoint);
                  if (!isFinite(clipDuration) || clipDuration < 1) {
                    // Fall back to media._realDuration or parse media.duration string
                    if (media._realDuration && isFinite(media._realDuration) && media._realDuration > 0) {
                      clipDuration = media._realDuration;
                    } else if (media.duration) {
                      const parts = String(media.duration).split(':');
                      if (parts.length === 3) clipDuration = parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
                      else if (parts.length === 2) clipDuration = parseInt(parts[0])*60 + parseInt(parts[1]);
                      else clipDuration = 30;
                    } else {
                      clipDuration = 30;
                    }
                  }
                  if (media.type === 'image') clipDuration = 5;

                  const getLastClipEnd = (track) => {
                    if (!track || !track.clips || track.clips.length === 0) return 0;
                    return Math.max(...track.clips.map(c => c.startTime + c.duration));
                  };

                  // Single atomic setTracks — no race condition
                  setTracks(prevTracks => {
                    const vTrack = prevTracks.find(t => t.type === 'video' && !t.locked);
                    const aTrack = prevTracks.find(t => t.type === 'audio' && !t.locked);
                    let newTracks = [...prevTracks];
                    let lastVideoClip = null;

                    if ((insertType === 'video' || insertType === 'both') && media.type !== 'audio' && vTrack) {
                      const videoClip = {
                        id: Date.now(),
                        title: media.name,
                        startTime: getLastClipEnd(vTrack),
                        duration: clipDuration,
                        type: 'video',
                        mediaUrl: media.url,
                        cloudinary_public_id: media.cloudinary_public_id,
                        thumbnail: media.thumbnail,
                        inPoint: parseFloat(inPoint) || 0,
                        outPoint: parseFloat(outPoint) || clipDuration,
                        effects: [], keyframes: [],
                        compositing: { opacity: 100, blendMode: 'normal', position: { x: 0, y: 0 }, scale: { x: 100, y: 100 }, rotation: 0, anchor: { x: 50, y: 50 } }
                      };
                      lastVideoClip = videoClip;
                      newTracks = newTracks.map(t => t.id === vTrack.id ? { ...t, clips: [...t.clips, videoClip] } : t);
                    }

                    if ((insertType === 'audio' || insertType === 'both') && (media.type === 'video' || media.type === 'audio') && aTrack) {
                      const curATrack = newTracks.find(t => t.id === aTrack.id);
                      const audioClip = {
                        id: Date.now() + 1,
                        title: media.name + ' (Audio)',
                        startTime: getLastClipEnd(curATrack),
                        duration: clipDuration,
                        type: 'audio',
                        mediaUrl: media.url,
                        cloudinary_public_id: media.cloudinary_public_id,
                        inPoint: parseFloat(inPoint) || 0,
                        outPoint: parseFloat(outPoint) || clipDuration,
                        effects: [], keyframes: [],
                        compositing: { opacity: 100 }
                      };
                      newTracks = newTracks.map(t => t.id === aTrack.id ? { ...t, clips: [...t.clips, audioClip] } : t);
                    }

                    return newTracks;
                  });

                  console.log(`✅ Added ${media.name} to timeline (${insertType}) duration=${clipDuration}s`);
                  setShowSourceMonitor(false);
                }}
                onClose={() => setShowSourceMonitor(false)}
              />
              </div>
            )}

            {/* ========================================
                MEDIA BIN / PROJECT PANEL - Like Premiere Pro
                ======================================== */}
            {showMediaBin && (
              <div className="media-bin-panel" style={{display:"flex",flexDirection:"column",width:"220px",minWidth:"160px",maxWidth:"420px",flexShrink:0,height:"100%",overflow:"hidden",background:"#0d1117",borderRight:"1px solid #21262d"}}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files);
                files.forEach(file => {
                  const url = URL.createObjectURL(file);
                  const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
                  const tempId = Date.now() + Math.random();
                  const item = { id: tempId, name: file.name, type, url, duration: '0:30', file, _rawFile: file };
                  setMediaLibrary(prev => [...(prev||[]), item]);
                  if (type === 'video' || type === 'audio') {
                    const probe = document.createElement(type === 'audio' ? 'audio' : 'video');
                    probe.preload = 'metadata';
                    probe.onerror = () => {};
                    probe.onloadedmetadata = () => {
                      try {
                        const dur = isFinite(probe.duration) && probe.duration > 0 ? probe.duration : 30;
                        const mins = Math.floor(dur / 60);
                        const secs = Math.round(dur % 60).toString().padStart(2, '0');
                        setMediaLibrary(prev => prev.map(m => m.id === tempId ? { ...m, duration: `${mins}:${secs}`, _realDuration: dur } : m));
                      } catch(e) {}
                    };
                    try { probe.src = url; } catch(e) {}
                  }
                });
              }}
              style={{
                background: '#0d1117',
                borderTop: '1px solid #21262d',
                width: '220px',
                minWidth: '220px',
                maxWidth: '220px',
                flex: 'none',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
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
                                  setSourceMonitorMedia(media);
                                  setSourceMedia(media);
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
                                      const videoTrack = [...tracks].filter(t => t.type === 'video' && !t.locked).sort((a,b) => (a.zIndex||0)-(b.zIndex||0))[0] || null;
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


                                        // Split audio to Audio 1 for video files
                                        if (media.type === 'video' && audioTrack && !audioTrack.locked) {
                                          const audioLastEnd = audioTrack.clips.reduce((max, clip) =>
                                            Math.max(max, clip.startTime + clip.duration), 0
                                          );
                                          const audioClip = {
                                            id: Date.now() + 1,
                                            title: `${media.name} (Audio)`,
                                            startTime: audioLastEnd,
                                            duration: durationSeconds,
                                            type: 'audio',
                                            mediaUrl: media.url,
                                            cloudinary_public_id: media.cloudinary_public_id,
                                            inPoint: 0,
                                            outPoint: durationSeconds,
                                            effects: [], keyframes: [],
                                            compositing: { opacity: 100 }
                                          };
                                          // audio added below in combined setTracks
                                        }
                                        const newClip = {
                                          id: Date.now(),
                                          title: media.name,
                                          startTime: lastClipEnd,
                                          duration: durationSeconds,
                                          type: media.type === 'video' ? 'video' : media.type,
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

                                        setTracks(prevTracks => {
                                          const aEnd = media.type === 'video' && audioTrack && !audioTrack.locked
                                            ? prevTracks.find(t => t.id === audioTrack.id)?.clips.reduce((mx,c) => Math.max(mx, c.startTime+c.duration), 0) || 0
                                            : 0;
                                          const aClip = media.type === 'video' && audioTrack && !audioTrack.locked ? {
                                            id: Date.now() + 1,
                                            title: `${media.name} (Audio)`,
                                            startTime: aEnd,
                                            duration: durationSeconds,
                                            type: 'audio',
                                            mediaUrl: media.url,
                                            cloudinary_public_id: media.cloudinary_public_id,
                                            inPoint: 0, outPoint: durationSeconds,
                                            effects: [], keyframes: [],
                                            compositing: { opacity: 100 }
                                          } : null;
                                          return prevTracks.map(t => {
                                            if (t.id === targetTrack.id) return { ...t, clips: [...t.clips, newClip] };
                                            if (aClip && t.id === audioTrack.id) return { ...t, clips: [...t.clips, aClip] };
                                            return t;
                                          });
                                        });
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

            <div className="spx-resizer" onMouseDown={(e)=>{
              e.preventDefault();
              const startX=e.clientX;
              const bin=e.target.previousElementSibling;
              const startW=bin?bin.getBoundingClientRect().width:260;
              const onMove=(ev)=>{
                if(bin) bin.style.width=Math.max(160,Math.min(450,startW+ev.clientX-startX))+'px';
              };
              const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)};
              window.addEventListener('mousemove',onMove);
              window.addEventListener('mouseup',onUp);
            }}/>
            <div className="editor-timeline-section" style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
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
                  <div className="track-headers-spacer" style={{ width: '280px', minWidth: '280px' }} />
                  <div className="timeline-ruler-scroll">
                    <div
                      className="timeline-ruler"
                      style={{ width: `${duration * 2 * zoom}px`, position: 'relative' }}
                    >
                      {generateTimeMarkers()}

                      {/* Timeline Markers */}
                      {markersHook.markers.map(marker => (
                        <div
                          key={marker.id}
                          className="timeline-marker"
                          style={{
                            position: 'absolute',
                            left: `${marker.time * 2 * zoom}px`,
                            top: 0,
                            width: '2px',
                            height: '100%',
                            background: marker.color || '#FF6600',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTime(marker.time);
                          }}
                          title={marker.label || `Marker at ${marker.time.toFixed(2)}s`}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '-8px',
                            width: '16px',
                            height: '16px',
                            background: marker.color || '#FF6600',
                            borderRadius: '2px 2px 8px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            🚩
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                </div>

                {/* Tracks */}
                <div className="timeline-tracks-container">
                  <div className="track-headers-column">
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
                                onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? {...t, muted: !t.muted} : t))}
                                title={track.muted ? 'Unmute Track' : 'Mute Track (M)'}
                                style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',
                                  color: track.muted ? '#f85149' : '#4e6a82',fontWeight:700,fontSize:10}}
                              >M</button>
                              <button
                                onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? {...t, solo: !t.solo} : t))}
                                title="Solo Track (S)"
                                style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',
                                  color: track.solo ? '#ffd60a' : '#4e6a82',fontWeight:700,fontSize:10}}
                              >S</button>
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

                              // Handle desktop file drop directly onto timeline
                              const desktopFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video') || f.type.startsWith('audio') || f.type.startsWith('image'));
                              if (desktopFiles.length > 0 && !draggedTransition && !draggedMedia) {
                                const file = desktopFiles[0];
                                const url = URL.createObjectURL(file);
                                const ftype = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
                                const tempId = Date.now() + Math.random();
                                const mediaItem = { id: tempId, name: file.name, type: ftype, url, duration: '0:30', _realDuration: null };
                                setMediaLibrary(prev => [...(prev||[]), mediaItem]);
                                const rect2 = e.currentTarget.getBoundingClientRect();
                                const dropX = e.clientX - rect2.left;
                                const dropTime2 = Math.max(0, dropX / (2 * zoom));
                                const probeEl = document.createElement(ftype === 'audio' ? 'audio' : ftype === 'video' ? 'video' : 'img');
                                probeEl.onerror = () => {};
                                probeEl.onloadedmetadata = () => {
                                  try {
                                    const dur = isFinite(probeEl.duration) && probeEl.duration > 0 ? probeEl.duration : 30;
                                    setMediaLibrary(prev => prev.map(m => m.id === tempId ? { ...m, _realDuration: dur, duration: `${Math.floor(dur/60)}:${String(Math.round(dur%60)).padStart(2,'0')}` } : m));
                                    setTracks(prev => {
                                      const vt = prev.find(t => t.type === 'video' && !t.locked);
                                      const at = prev.find(t => t.type === 'audio' && !t.locked);
                                      const tgt = ftype === 'audio' ? at : vt;
                                      if (!tgt) return prev;
                                      const vid = { id: Date.now(), title: file.name, startTime: snapToGrid(dropTime2), duration: dur, type: ftype, mediaUrl: url, effects: [], keyframes: [], compositing: { opacity:100, blendMode:'normal', position:{x:0,y:0}, scale:{x:100,y:100}, rotation:0, anchor:{x:50,y:50} } };
                                      let next = prev.map(t => t.id === tgt.id ? {...t, clips:[...t.clips, vid]} : t);
                                      if (ftype === 'video' && at) {
                                        const aud = { id: Date.now()+1, title: file.name+' (Audio)', startTime: snapToGrid(dropTime2), duration: dur, type: 'audio', mediaUrl: url, effects: [], keyframes: [], compositing: {opacity:100} };
                                        next = next.map(t => t.id === at.id ? {...t, clips:[...t.clips, aud]} : t);
                                      }
                                      return next;
                                    });
                                  } catch(err) {}
                                };
                                try { probeEl.src = url; } catch(err) {}
                              } else if (draggedTransition) {
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
                                        backgroundColor: clip.thumbnail ? '#000' :
                                          clip.type === 'video' ? '#1a3a5c' :
                                          clip.type === 'audio' ? '#1a3a2a' :
                                          clip.type === 'image' ? '#3a2a1a' : (track.color || '#2a2a4a'),
                                        opacity: clip.compositing?.opacity ? clip.compositing.opacity / 100 : 1,
                                        cursor: track.locked ? 'not-allowed' : 'grab',
                                        backgroundImage: clip.thumbnail ? `url(${clip.thumbnail})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'left center',
                                        backgroundRepeat: 'repeat-x',
                                        border: clip.type === 'video' ? '1px solid #4a9eff44' :
                                                clip.type === 'audio' ? '1px solid #00ffc844' : '1px solid #ff990044'
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
                                      {/* Resize handle - left */}
                                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:6,cursor:'w-resize',background:'rgba(0,255,200,0.3)',zIndex:10}}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          const startX = e.clientX;
                                          const origStart = clip.startTime;
                                          const origDur = clip.duration;
                                          const onMove = (ev) => {
                                            const dx = ev.clientX - startX;
                                            const dt = dx / (2 * zoom);
                                            const newStart = Math.max(0, origStart + dt);
                                            const newDur = Math.max(1, origDur - dt);
                                            setTracks(prev => prev.map(t => ({...t, clips: t.clips.map(c => c.id === clip.id ? {...c, startTime: newStart, duration: newDur} : c)})));
                                          };
                                          const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                                          window.addEventListener('mousemove', onMove);
                                          window.addEventListener('mouseup', onUp);
                                        }}
                                      />
                                      {/* Resize handle - right */}
                                      <div style={{position:'absolute',right:0,top:0,bottom:0,width:6,cursor:'e-resize',background:'rgba(0,255,200,0.3)',zIndex:10}}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          const startX = e.clientX;
                                          const origDur = clip.duration;
                                          const onMove = (ev) => {
                                            const dx = ev.clientX - startX;
                                            const newDur = Math.max(1, origDur + dx / (2 * zoom));
                                            setTracks(prev => prev.map(t => ({...t, clips: t.clips.map(c => c.id === clip.id ? {...c, duration: newDur} : c)})));
                                          };
                                          const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                                          window.addEventListener('mousemove', onMove);
                                          window.addEventListener('mouseup', onUp);
                                        }}
                                      />
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
                                          <div className="audio-waveform" style={{position:'absolute',bottom:0,left:0,right:0,height:20,opacity:.6,pointerEvents:'none'}}>
                                            <svg width="100%" height="20" preserveAspectRatio="none">
                                              <polyline
                                                points={Array.from({length:40},(_,i)=>`${(i/39)*100}%,${10-Math.sin(i*0.8+clip.id)*8}`).join(' ')}
                                                stroke="#00ffc8" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke"
                                              />
                                            </svg>
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
        {/* ── VERTICAL dB METER ── */}
        <div className="spx-db-meter-vertical">
          <span className="db-label">dB</span>
          {[0,-3,-6,-9,-12,-18,-24,-30,-36,-42,-48,-54].map(db=>(
            <div key={db} className="db-tick">
              <div className="db-bar" style={{background:db>=-3?'#f85149':db>=-12?'#ffd60a':'#00ffc8',opacity:0.5}}/>
              <span className="db-num">{db}</span>
            </div>
          ))}
        </div>
        {/* Right Panel — Inspector, Effects, Transitions */}
        <VideoEditorRightPanel
          selectedClip={selectedClip}
          selectedTransition={selectedTransition}
          applyEffectToClip={(clipId, effectId, val) => applyEffect(clipId, effectId, val ?? 50)}
          removeEffectFromClip={(clipId, effectId) => removeEffect(clipId, effectId)}
          toggleEffect={(clipId, effectId) => toggleEffect(clipId, effectId)}
          updateEffectValue={(clipId, effectId, val) => {
            setTracks(prev => prev.map(t => ({
              ...t,
              clips: t.clips.map(c => c.id !== clipId ? c : {
                ...c,
                effects: (c.effects||[]).map(e => e.id === effectId ? { ...e, value: val } : e)
              })
            })));
          }}
          updateCompositing={(clipId, prop, val) => updateCompositing(clipId, prop, val)}
          setSelectedTransition={setSelectedTransition}
          tracks={tracks}
          setTracks={setTracks}
        />
        <VideoEditorEffectsPanel
          selectedClip={selectedClip}
          onApplyEffect={(clipId, effectId, val) => applyEffect(clipId, effectId, val)}
          onSelectTransition={(id) => setSelectedTransitionType(id)}
          selectedTransType={selectedTransitionType}
          setDraggedEffect={setDraggedEffect}
          setDraggedTransition={setDraggedTransition}
        />
      </div>
      {/* Compositing Panel */}
      {
        showCompositingPanel && (
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
        )
      }

      {/* Color Grading Workspace — Full Lumetri-style */}
      {showColorGrading && (
        <div className="color-workspace-pro">
          <div className="color-workspace-header">
            <span>🎨 Lumetri Color</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:'#4e6a82'}}>{selectedClip ? selectedClip.title : 'No clip selected'}</span>
              <button onClick={() => setShowColorGrading(false)} className="close-panel-btn"><X size={14}/></button>
            </div>
          </div>
          <div className="color-workspace-body">
            <div className="lut-section">
              <div className="lut-header">LUT Presets</div>
              {['film','cinema','social','vintage','nature','technical'].map(cat => (
                <div key={cat} style={{marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#4e6a82',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{cat}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {LUT_PRESETS.filter(p => p.cat === cat).map(lut => (
                      <button key={lut.name}
                        onClick={() => { if(selectedClip) applyEffect(selectedClip.id, 'lut_preset', 50); }}
                        style={{padding:'3px 8px',borderRadius:4,border:'1px solid #21262d',background:'#0d1117',color:'#8b949e',fontSize:10,cursor:'pointer',whiteSpace:'nowrap'}}
                        title={"Sat:"+lut.sat+" Con:"+lut.con+" Temp:"+lut.temp}>
                        {lut.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <ColorGradingPanel onGrade={(grade) => { if(selectedClip) applyEffect(selectedClip.id,'colorGrade',50); }} />
            <div className="curves-section">
              <div className="lut-header">Curves</div>
              <div style={{background:'#06060f',borderRadius:8,padding:8,height:130,position:'relative'}}>
                <svg width="100%" height="100%" viewBox="0 0 200 110" style={{display:'block'}}>
                  <line x1="0" y1="110" x2="200" y2="0" stroke="#21262d" strokeWidth="1" strokeDasharray="4"/>
                  <polyline points="0,110 40,85 100,55 160,25 200,0" stroke="#00ffc8" strokeWidth="2" fill="none"/>
                  <polyline points="0,110 40,85 100,55 160,25 200,0" stroke="#ff6b6b" strokeWidth="1" fill="none" opacity="0.4"/>
                  <polyline points="0,110 40,85 100,55 160,25 200,0" stroke="#4a9eff" strokeWidth="1" fill="none" opacity="0.4"/>
                </svg>
                <div style={{position:'absolute',bottom:4,right:4,fontSize:9,color:'#4e6a82'}}>RGB Curves</div>
              </div>
            </div>
            <div className="hsl-section">
              <div className="lut-header">HSL / Secondaries</div>
              {[['Hue','#ff6b6b',-180,180,0],['Saturation','#00ffc8',0,200,100],['Luminance','#ffd60a',-100,100,0],['Temperature','#ff9500',-50,50,0],['Tint','#30d158',-50,50,0]].map(([lbl,col,mn,mx,def])=>(
                <div key={lbl} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#4e6a82',marginBottom:3}}>
                    <span>{lbl}</span><span style={{color:col,fontFamily:'monospace'}}>{def}</span>
                  </div>
                  <input type="range" min={mn} max={mx} defaultValue={def} style={{width:'100%',accentColor:col}}/>
                </div>
              ))}
              <div className="lut-header" style={{marginTop:12}}>Vignette</div>
              <div style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#4e6a82',marginBottom:3}}><span>Amount</span><span>0</span></div>
                <input type="range" min="-100" max="0" defaultValue="0" style={{width:'100%',accentColor:'#8b949e'}}/>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#4e6a82',marginBottom:3}}><span>Feather</span><span>50</span></div>
                <input type="range" min="0" max="100" defaultValue="50" style={{width:'100%',accentColor:'#8b949e'}}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Mixing Workspace */}
      {
        showAudioMixing && (
          <div className="audio-workspace">
            <div className="audio-workspace-header">
              <h4>Audio Mixing Console</h4>
              <button onClick={() => setShowAudioMixing(false)} className="close-panel-btn">
                <X size={14} />
              </button>
            </div>

            <div className="mixing-console-pro">
              <div className="mixer-channel-pro master-channel">
                <div className="channel-name" style={{color:'#00ffc8'}}>MASTER</div>
                <div className="eq-strip">
                  {['HF','MF','LF'].map(b=>(
                    <div key={b} className="eq-knob-wrap"><div className="eq-knob" style={{background:'conic-gradient(#00ffc8 180deg,#21262d 180deg)'}}></div><span>{b}</span></div>
                  ))}
                </div>
                <div style={{width:'100%',marginTop:4}}>
                  <div style={{fontSize:9,color:'#4e6a82',marginBottom:2}}>REVERB</div>
                  <input type="range" min="0" max="100" defaultValue="0" style={{width:'100%',accentColor:'#bf5af2'}}/>
                  <div style={{fontSize:9,color:'#4e6a82',margin:'6px 0 2px'}}>DELAY</div>
                  <input type="range" min="0" max="100" defaultValue="0" style={{width:'100%',accentColor:'#bf5af2'}}/>
                </div>
                <div className="vu-meter-pro">
                  {Array.from({length:20},(_,i)=>(
                    <div key={i} className="vu-segment" style={{background:i<14?'rgba(0,255,200,0.7)':i<18?'rgba(255,193,7,0.7)':'rgba(248,81,73,0.8)',width:`${45+i*2.5}%`}}/>
                  ))}
                </div>
                <div className="fader-strip-pro">
                  <input type="range" min="-60" max="12" defaultValue="0" style={{writingMode:'vertical-lr',direction:'rtl',width:32,height:100,accentColor:'#00ffc8'}}/>
                  <span className="fader-db">0dB</span>
                </div>
                <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:4}}>
                  <button style={{padding:'3px 7px',background:'rgba(248,81,73,0.15)',border:'1px solid #f85149',borderRadius:4,color:'#f85149',fontSize:9,cursor:'pointer'}}>M</button>
                  <button style={{padding:'3px 7px',background:'rgba(0,255,200,0.1)',border:'1px solid rgba(0,255,200,0.3)',borderRadius:4,color:'#00ffc8',fontSize:9,cursor:'pointer'}}>S</button>
                </div>
              </div>
              {tracks.filter(t => t.type === 'audio' || t.clips.some(c => c.type === 'audio')).map(track => (
                <div key={track.id} className="mixer-channel-pro" style={{borderLeft:`2px solid ${track.color||'#21262d'}`}}>
                  <div className="channel-name" style={{color:track.color||'#e6edf3'}}>{track.name}</div>
                  <div className="eq-strip">
                    {['HF','MF','LF'].map(b=>(
                      <div key={b} className="eq-knob-wrap"><div className="eq-knob" style={{background:`conic-gradient(${track.color||'#00ffc8'} 180deg,#21262d 180deg)`}}></div><span>{b}</span></div>
                    ))}
                  </div>
                  <div style={{width:'100%',marginTop:4}}>
                    <div style={{fontSize:9,color:'#4e6a82',marginBottom:2}}>PAN</div>
                    <input type="range" min="-100" max="100" defaultValue="0" style={{width:'100%',accentColor:track.color||'#00ffc8'}}/>
                  </div>
                  <div className="vu-meter-pro">
                    {Array.from({length:20},(_,i)=>(
                      <div key={i} className="vu-segment" style={{background:i<14?`${track.color||'#00ffc8'}bb`:i<18?'rgba(255,193,7,0.7)':'rgba(248,81,73,0.8)',width:`${Math.max(8,Math.floor(Math.random()*55)+15)}%`}}/>
                    ))}
                  </div>
                  <div className="fader-strip-pro">
                    <input type="range" min="-60" max="12" defaultValue="0" style={{writingMode:'vertical-lr',direction:'rtl',width:32,height:100,accentColor:track.color||'#00ffc8'}}/>
                    <span className="fader-db">0dB</span>
                  </div>
                  <div style={{display:'flex',gap:4,justifyContent:'center',marginTop:4}}>
                    <button style={{padding:'3px 7px',background:'rgba(248,81,73,0.15)',border:'1px solid #f85149',borderRadius:4,color:'#f85149',fontSize:9,cursor:'pointer'}}>M</button>
                    <button style={{padding:'3px 7px',background:'rgba(0,255,200,0.1)',border:'1px solid rgba(0,255,200,0.3)',borderRadius:4,color:'#00ffc8',fontSize:9,cursor:'pointer'}}>S</button>
                    <button style={{padding:'3px 7px',background:'rgba(255,107,107,0.1)',border:'1px solid #ff6b6b',borderRadius:4,color:'#ff6b6b',fontSize:9,cursor:'pointer'}}>R</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* ── Video Scopes ─────────────────────────────────────────── */}
      {showScopes && (
        <div className="scopes-panel-pro">
          <div className="scopes-header">
            <span>📊 Video Scopes</span>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {['Waveform','Vectorscope','Histogram','Parade'].map(s=>(
                <button key={s} style={{padding:'3px 8px',background:'rgba(0,255,200,0.08)',border:'1px solid rgba(0,255,200,0.2)',borderRadius:4,color:'#00ffc8',fontSize:10,cursor:'pointer'}}>{s}</button>
              ))}
              <button onClick={()=>setShowScopes(false)} className="close-panel-btn"><X size={14}/></button>
            </div>
          </div>
          <div className="scopes-body">
            <div className="scope-canvas-wrap">
              <div style={{fontSize:10,color:'#4e6a82',marginBottom:4}}>WAVEFORM (Luma)</div>
              <canvas ref={scopesCanvasRef} width={320} height={100} style={{width:'100%',background:'#06060f',borderRadius:6,border:'1px solid #21262d'}}/>
            </div>
            <div style={{display:'flex',gap:12}}>
              <div className="scope-canvas-wrap" style={{flex:1}}>
                <div style={{fontSize:10,color:'#4e6a82',marginBottom:4}}>VECTORSCOPE</div>
                <canvas ref={vectorCanvasRef} width={100} height={100} style={{borderRadius:'50%',background:'#06060f',border:'1px solid #21262d',display:'block'}}/>
              </div>
              <div className="scope-canvas-wrap" style={{flex:2}}>
                <div style={{fontSize:10,color:'#4e6a82',marginBottom:4}}>HISTOGRAM (RGB)</div>
                <canvas ref={histCanvasRef} width={200} height={80} style={{width:'100%',background:'#06060f',borderRadius:6,border:'1px solid #21262d'}}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Multicam Editor ───────────────────────────────────────── */}
      {showMulticam && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🎥 Multicam Editor</span>
            <button onClick={()=>setShowMulticam(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <MultiCamPanel
              session={multicamSession || createMultiCamSession({ clips: tracks.flatMap(t=>t.clips), syncMethod: 'audio' })}
              currentTime={currentTime}
              onCut={(time, angleIdx) => {
                setMulticamSession(prev =>(prev || createMultiCamSession({ clips: tracks.flatMap(t=>t.clips) }), time, angleIdx));
              }}
              onSelectAngle={(angleIdx) => {
                const activeAngle = tracks.flatMap(t=>t.clips)[angleIdx];
                if (activeAngle) setSelectedClip(activeAngle);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Chroma Key ────────────────────────────────────────────── */}
      {showChromaKey && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🟢 Chroma Key</span>
            <button onClick={()=>setShowChromaKey(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            {selectedClip
              ? <>
                <ChromaKeyPanel settings={chromaKeySettings} onChange={setChromaKeySettings} onPickColor={(c)=>setChromaKeySettings(s=>({...s,color:c}))}/>
                <button onClick={async()=>{
                  if(!selectedClip) return;
                  const localFile = selectedClip._localFile;
                  if(localFile){
                    try{
                      console.log('⚡ Chroma key processing locally...');
                      const colorHex = (chromaKeySettings.color||'#00ff00').replace('#','0x');
                      const blob = await ffmpeg.chromaKey(localFile, colorHex, (chromaKeySettings.similarity||30)/100, (chromaKeySettings.blend||10)/100);
                      const url = URL.createObjectURL(blob);
                      setTracks(p=>p.map(t=>({...t,clips:t.clips.map(c=>c.id===selectedClip.id?{...c,previewUrl:url}:c)})));
                      console.warn('✅ Chroma key applied locally!');
                      return;
                    }catch(e){console.warn('Local chroma key failed:',e.message);}
                  }
                  const pubId = selectedClip.cloudinary_public_id || selectedClip.r2_key;
                  if(!pubId){console.warn('Upload clip first');return;}
                  try{
                    const token=localStorage.getItem('jwt-token')||localStorage.getItem('token');
                    const r=await fetch(`${backendURL}/api/video-editor/apply-effect`,{
                      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
                      body:JSON.stringify({public_id:pubId,effect_id:'chromaKey',intensity:chromaKeySettings.tolerance||30,color:chromaKeySettings.color||'#00ff00'})
                    });
                    if(r.ok){const d=await r.json();if(d.processed_url){setTracks(p=>p.map(t=>({...t,clips:t.clips.map(c=>c.id===selectedClip.id?{...c,previewUrl:d.processed_url}:c)})));console.warn('✅ Chroma key applied!');}}
                  }catch(e){console.error('Chroma key failed: '+e.message);}
                }} style={{marginTop:10,width:'100%',padding:'8px',background:'rgba(0,255,100,0.1)',border:'1px solid rgba(0,255,100,0.3)',borderRadius:6,color:'#00ff64',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  Apply Chroma Key
                </button>
              </>
              : <div style={{color:'#4e6a82',fontSize:12,textAlign:'center',padding:20}}>Select a video clip first</div>}
          </div>
        </div>
      )}

      {/* ── Speed Ramp ────────────────────────────────────────────── */}
      {showSpeedRamp && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>⚡ Speed Ramp</span>
            <button onClick={()=>setShowSpeedRamp(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            {selectedClip
              ? <SpeedRampPanel points={speedRampPoints} onChange={setSpeedRampPoints} presetId={null}/>
              : <div style={{color:'#4e6a82',fontSize:12,textAlign:'center',padding:20}}>Select a clip first</div>}
          </div>
        </div>
      )}

      {/* ── Adjustment Layer ──────────────────────────────────────── */}
      {showAdjustmentLayer && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🔧 Adjustment Layer</span>
            <button onClick={()=>setShowAdjustmentLayer(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <AdjustmentLayerPanel layer={adjustmentLayers[0]||createAdjustmentLayer({})} onChange={(l)=>setAdjustmentLayers([l])}/>
          </div>
        </div>
      )}

      {/* ── Captions / Subtitles ──────────────────────────────────── */}
      {showCaptions && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>💬 Captions & Subtitles</span>
            <button onClick={()=>setShowCaptions(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Caption Style</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
              {CAPTION_STYLES.map(s=>(
                <button key={s.id} style={{padding:'4px 10px',borderRadius:6,border:'1px solid #21262d',background:'#0d1117',color:'#8b949e',fontSize:11,cursor:'pointer'}}>{s.name||s.id}</button>
              ))}
            </div>
            <textarea style={{width:'100%',background:'#0d1117',border:'1px solid #21262d',borderRadius:6,color:'#e6edf3',padding:8,fontSize:12,resize:'vertical',minHeight:60,boxSizing:'border-box'}} placeholder="Type caption text..."/>
            <div style={{display:'flex',gap:8,marginTop:8,marginBottom:12}}>
              <input type="number" placeholder="Start (s)" style={{flex:1,background:'#0d1117',border:'1px solid #21262d',borderRadius:4,color:'#e6edf3',padding:'4px 8px',fontSize:11}}/>
              <input type="number" placeholder="End (s)" style={{flex:1,background:'#0d1117',border:'1px solid #21262d',borderRadius:4,color:'#e6edf3',padding:'4px 8px',fontSize:11}}/>
              <button onClick={()=>setCaptions(prev=>[...prev,createCaptionSegment({words:[],startTime:currentTime})])}
                style={{padding:'4px 12px',background:'rgba(0,255,200,0.1)',border:'1px solid rgba(0,255,200,0.3)',borderRadius:4,color:'#00ffc8',fontSize:11,cursor:'pointer'}}>Add</button>
            </div>
            <button
              onClick={async () => {
                if (!selectedClip) { console.warn('Select a clip first'); return; }
                const url = selectedClip.mediaUrl || selectedClip.r2_url || selectedClip.url;
                if (!url) { console.warn('Clip has no media URL'); return; }
                try {
                  const token = localStorage.getItem('jwt-token') || localStorage.getItem('token');
                  const res = await fetch(`${backendURL}/api/video-editor/transcribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ media_url: url, clip_id: selectedClip.id })
                  });
                  if (!res.ok) throw new Error('Transcription failed');
                  const data = await res.json();
                  const newCaptions = (data.segments || []).map(seg => createCaptionSegment({
                    words: seg.words || [{ word: seg.text, start: seg.start, end: seg.end }],
                    style: 'default',
                    startTime: selectedClip.startTime + seg.start
                  }));
                  setCaptions(prev => [...prev, ...newCaptions]);
                  console.warn(`✅ Generated ${newCaptions.length} caption segments`);
                } catch(err) {
                  console.error('Whisper error:', err);
                  console.error('Transcription failed: ' + err.message);
                }
              }}
              style={{width:'100%',padding:'9px',background:'rgba(191,90,242,0.1)',border:'1px solid rgba(191,90,242,0.3)',borderRadius:6,color:'#bf5af2',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              🤖 AI Auto-Caption (Whisper)
            </button>
          </div>
        </div>
      )}

      {/* ── Text & Titles ─────────────────────────────────────────── */}
      {showTitles && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>T Text & Titles</span>
            <button onClick={()=>setShowTitles(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Text Presets</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {TEXT_PRESETS.map((p,i)=>(
                <button key={i} onClick={async()=>{
                  setTextOverlays(prev=>[...prev,createTextOverlay({text:p.text||'Title Text',style:p})]);
                  if(selectedClip){
                    const pubId=selectedClip.cloudinary_public_id||selectedClip.r2_key;
                    if(pubId){
                      try{
                        const token=localStorage.getItem('jwt-token')||localStorage.getItem('token');
                        const r=await fetch(`${backendURL}/api/video-editor/add-text`,{
                          method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
                          body:JSON.stringify({public_id:pubId,text:p.text||'Title Text',font_size:p.fontSize||40,color:p.color||'white',position:p.position||'center'})
                        });
                        if(r.ok){const d=await r.json();if(d.text_overlay_url){setTracks(prev=>prev.map(t=>({...t,clips:t.clips.map(c=>c.id===selectedClip.id?{...c,previewUrl:d.text_overlay_url}:c)})));}}
                      }catch(e){console.warn('Text overlay error:',e.message);}
                    }
                  }
                }}
                  style={{padding:'8px 12px',background:'#0d1117',border:'1px solid #21262d',borderRadius:6,color:'#e6edf3',fontSize:11,cursor:'pointer',textAlign:'left'}}>
                  {p.name||'Preset '+(i+1)}
                </button>
              ))}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Lower Thirds</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {LOWER_THIRD_TEMPLATES.map((t,i)=>(
                <button key={i} style={{padding:'8px 12px',background:'#0d1117',border:'1px solid #21262d',borderRadius:6,color:'#8b949e',fontSize:11,cursor:'pointer',textAlign:'left'}}>
                  {t.name||'Lower Third '+(i+1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Overlays & PIP ────────────────────────────────────────── */}
      {showOverlays && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🖼 Overlays & PIP</span>
            <button onClick={()=>setShowOverlays(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Picture-in-Picture</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
              {Object.keys(PIP_POSITIONS).map(key=>(
                <button key={key} onClick={()=>setPipLayers(prev=>[...prev,createPIP({position:key})])}
                  style={{padding:'6px',background:'#0d1117',border:'1px solid #21262d',borderRadius:6,color:'#8b949e',fontSize:10,cursor:'pointer',textTransform:'capitalize'}}>
                  {key.replace(/-/g,' ')}
                </button>
              ))}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Watermark</div>
            <button onClick={()=>setWatermark(createWatermark({text:'StreamPireX'}))}
              style={{width:'100%',padding:'8px',background:'rgba(0,255,200,0.08)',border:'1px solid rgba(0,255,200,0.2)',borderRadius:6,color:'#00ffc8',fontSize:11,cursor:'pointer',marginBottom:12}}>
              + Add Watermark
            </button>
            <div style={{fontSize:11,fontWeight:700,color:'#e6edf3',marginBottom:8}}>Social Templates</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {SOCIAL_TEMPLATES.slice(0,6).map((t,i)=>(
                <button key={i} style={{padding:'6px 10px',background:'#0d1117',border:'1px solid #21262d',borderRadius:6,color:'#8b949e',fontSize:10,cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between'}}>
                  <span>{t.name}</span><span style={{color:'#4e6a82'}}>{t.width}x{t.height}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scene Detection ───────────────────────────────────────── */}
      {showSceneDetection && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🎬 Scene Detection</span>
            <button onClick={()=>setShowSceneDetection(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <SceneDetectionPanel
              clipId={selectedClip?.id} scenes={sceneList}
              isAnalyzing={isAnalyzingScenes} progress={sceneProgress}
              settings={createSceneDetectionSettings()}
              onAnalyze={async()=>{setIsAnalyzingScenes(true);setSceneProgress(0);await new Promise(r=>setTimeout(r,1500));setSceneList([{time:0,label:'Scene 1'},{time:5,label:'Scene 2'},{time:12,label:'Scene 3'},{time:20,label:'Scene 4'}]);setIsAnalyzingScenes(false);setSceneProgress(100);}}
              onSplitAtScenes={()=>console.log('Split at scenes')}
              onJumpToScene={s=>setCurrentTime(s.time)}
              onSettingsChange={()=>{}}
            />
          </div>
        </div>
      )}

      {/* ── Background Removal ────────────────────────────────────── */}
      {showBackgroundRemoval && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>✂️ Background Removal</span>
            <button onClick={()=>setShowBackgroundRemoval(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <BackgroundRemovalPanel settings={createBGRemovalSettings()} onChange={()=>{}}/>
          </div>
        </div>
      )}

      {/* ── Audio Ducking ─────────────────────────────────────────── */}
      {showAudioDucking && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🎙 Audio Ducking</span>
            <button onClick={()=>setShowAudioDucking(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <AudioDuckingPanel settings={createAudioDuckingSettings()} tracks={tracks} onAnalyze={()=>{}} onChange={()=>{}}/>
          </div>
        </div>
      )}

      {/* ── Motion Tracking ───────────────────────────────────────── */}
      {showMotionTracking && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>🎯 Motion Tracking</span>
            <button onClick={()=>setShowMotionTracking(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <MotionTrackingPanel tracks={[]} currentTime={currentTime} onCreateTrack={()=>{}} onDeleteTrack={()=>{}} onAddAttachment={()=>{}}/>
          </div>
        </div>
      )}

      {/* ── Template Library ──────────────────────────────────────── */}
      {showTemplateLibrary && (
        <div className="panel-pro">
          <div className="panel-pro-header">
            <span>📚 Template Library</span>
            <button onClick={()=>setShowTemplateLibrary(false)} className="close-panel-btn"><X size={14}/></button>
          </div>
          <div style={{padding:16}}>
            <TemplateLibraryPanel onSelectTemplate={t=>console.log('Template:',t.name)}/>
          </div>
        </div>
      )}

      {/* Export Modal (NEW) */}
      {
        showExportModal && (
          <ExportModal
            project={project}
            tracks={tracks}
            frameRate={frameRate}
            onClose={() => setShowExportModal(false)}
            onExportComplete={(result) => {
              console.log('Export completed:', result);
            }}
          />
        )
      }
    </div>
  );
};

export default VideoEditorComponent;