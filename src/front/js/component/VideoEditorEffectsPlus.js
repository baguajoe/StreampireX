// =============================================================================
// VideoEditorEffectsPlus.js — Advanced Effects & Processing
// =============================================================================
// Location: src/front/js/component/VideoEditorEffectsPlus.js
// Features: Chroma key, speed ramping, freeze frame, adjustment layers,
//   auto-reframe, stabilization, noise reduction, multi-cam, snap-to-beat,
//   aspect ratios, export presets, batch export
// =============================================================================

import React from 'react';
import { EASING } from './VideoEditorMotion';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GREEN SCREEN / CHROMA KEY
// ═══════════════════════════════════════════════════════════════════════════════

export const CHROMA_PRESETS = [
  { id:'green', name:'Green Screen', keyColor:[0,177,64], tolerance:45, softness:12 },
  { id:'blue', name:'Blue Screen', keyColor:[0,71,187], tolerance:45, softness:12 },
  { id:'white', name:'White Background', keyColor:[240,240,240], tolerance:30, softness:10 },
  { id:'black', name:'Black Background', keyColor:[15,15,15], tolerance:30, softness:10 },
  { id:'red', name:'Red Screen', keyColor:[200,0,0], tolerance:40, softness:10 },
  { id:'magenta', name:'Magenta Screen', keyColor:[200,0,200], tolerance:40, softness:10 },
];

/**
 * Apply chroma key removal on a canvas context.
 * Removes pixels matching keyColor within tolerance, with soft edge feathering.
 */
export const applyChromaKey = (ctx, width, height, {
  keyColor=[0,255,0], tolerance=40, softness=10, spillSuppression=0.5,
}={}) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const [kr, kg, kb] = keyColor;

  for (let i = 0; i < data.length; i += 4) {
    const r=data[i], g=data[i+1], b=data[i+2];
    const dist = Math.sqrt((r-kr)**2 + (g-kg)**2 + (b-kb)**2);

    if (dist < tolerance) {
      data[i+3] = 0; // fully transparent
    } else if (dist < tolerance + softness) {
      const alpha = ((dist - tolerance) / softness) * 255;
      data[i+3] = Math.round(alpha);
      // Spill suppression — reduce green/blue cast on edges
      if (spillSuppression > 0) {
        const spillAmt = Math.max(0, 1 - dist / (tolerance + softness * 2));
        if (kg > kr && kg > kb) data[i+1] = Math.round(g - (g - Math.min(r,b)) * spillAmt * spillSuppression);
        if (kb > kr && kb > kg) data[i+2] = Math.round(b - (b - Math.min(r,g)) * spillAmt * spillSuppression);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Chroma Key settings object
 */
export const createChromaKeySettings = (preset = 'green') => {
  const p = CHROMA_PRESETS.find(x => x.id === preset) || CHROMA_PRESETS[0];
  return {
    enabled: true,
    keyColor: [...p.keyColor],
    tolerance: p.tolerance,
    softness: p.softness,
    spillSuppression: 0.5,
    presetId: p.id,
  };
};

// ── Chroma Key Panel ──
export const ChromaKeyPanel = ({ settings, onChange, onPickColor }) => {
  if (!settings) return null;
  const S = {bg:'#161b22',input:'#21262d',border:'#30363d',text:'#c9d1d9',dim:'#5a7088',accent:'#00ffc8'};
  const upd = (k,v) => onChange({...settings, [k]:v});

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
        <span style={{fontWeight:700,color:'#34c759'}}>🟩 Chroma Key</span>
        <label style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
          <input type="checkbox" checked={settings.enabled} onChange={e=>upd('enabled',e.target.checked)} />
          <span>Enabled</span>
        </label>
      </div>

      {/* Presets */}
      <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
        {CHROMA_PRESETS.map(p => (
          <button key={p.id} onClick={()=>onChange({...settings,keyColor:[...p.keyColor],tolerance:p.tolerance,softness:p.softness,presetId:p.id})}
            style={{padding:'3px 8px',borderRadius:4,cursor:'pointer',border:`1px solid ${settings.presetId===p.id?S.accent:S.border}`,
              background:settings.presetId===p.id?`${S.accent}20`:'transparent',color:settings.presetId===p.id?S.accent:S.dim,fontSize:'0.6rem'}}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
        <span style={{color:S.dim,width:65}}>Key Color</span>
        <div style={{width:24,height:24,borderRadius:4,background:`rgb(${settings.keyColor.join(',')})`,border:`1px solid ${S.border}`,cursor:'pointer'}}
          onClick={onPickColor} title="Click to pick color from video"/>
        <span style={{fontSize:'0.6rem',color:S.dim}}>RGB({settings.keyColor.join(',')})</span>
      </div>

      {/* Sliders */}
      {[['tolerance','Tolerance',0,100],['softness','Softness',0,40],['spillSuppression','Spill',0,1]].map(([key,label,min,max])=>(
        <div key={key} style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
          <span style={{color:S.dim,width:65,fontSize:'0.6rem'}}>{label}</span>
          <input type="range" min={min} max={max} step={key==='spillSuppression'?0.05:1} value={settings[key]}
            onChange={e=>upd(key,parseFloat(e.target.value))} style={{flex:1}} />
          <span style={{width:30,fontSize:'0.6rem',textAlign:'right',color:S.text}}>{typeof settings[key]==='number'?settings[key].toFixed(key==='spillSuppression'?2:0):settings[key]}</span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SPEED RAMPING WITH CURVES
// ═══════════════════════════════════════════════════════════════════════════════

export const SPEED_RAMP_PRESETS = [
  { id:'smooth_slow', name:'Smooth Slow-Mo', points:[{t:0,speed:1},{t:0.3,speed:0.25},{t:0.7,speed:0.25},{t:1,speed:1}] },
  { id:'dramatic_hit', name:'Dramatic Hit', points:[{t:0,speed:1},{t:0.4,speed:1},{t:0.45,speed:0.1},{t:0.6,speed:0.1},{t:0.65,speed:2},{t:1,speed:1}] },
  { id:'ramp_up', name:'Speed Up', points:[{t:0,speed:0.5},{t:1,speed:3}] },
  { id:'ramp_down', name:'Slow Down', points:[{t:0,speed:2},{t:1,speed:0.3}] },
  { id:'pulse', name:'Pulse', points:[{t:0,speed:1},{t:0.25,speed:0.3},{t:0.5,speed:1.5},{t:0.75,speed:0.3},{t:1,speed:1}] },
  { id:'flash_forward', name:'Flash Forward', points:[{t:0,speed:1},{t:0.1,speed:4},{t:0.3,speed:4},{t:0.4,speed:1}] },
  { id:'rewind_snap', name:'Rewind Snap', points:[{t:0,speed:1},{t:0.5,speed:-2},{t:0.7,speed:-2},{t:0.71,speed:1},{t:1,speed:1}] },
];

export const getSpeedAtPosition = (speedPoints, normalizedPos) => {
  if (!speedPoints?.length) return 1;
  if (speedPoints.length === 1) return speedPoints[0].speed;
  const sorted = [...speedPoints].sort((a,b) => a.t - b.t);
  if (normalizedPos <= sorted[0].t) return sorted[0].speed;
  if (normalizedPos >= sorted[sorted.length-1].t) return sorted[sorted.length-1].speed;
  for (let i = 0; i < sorted.length-1; i++) {
    if (normalizedPos >= sorted[i].t && normalizedPos <= sorted[i+1].t) {
      const progress = (normalizedPos - sorted[i].t) / (sorted[i+1].t - sorted[i].t);
      const eased = EASING.easeInOut(progress);
      return sorted[i].speed + (sorted[i+1].speed - sorted[i].speed) * eased;
    }
  }
  return 1;
};

// ── Speed Ramp Panel ──
export const SpeedRampPanel = ({ points=[], presetId=null, onChange }) => {
  const S = {bg:'#161b22',input:'#21262d',border:'#30363d',text:'#c9d1d9',dim:'#5a7088',accent:'#ff9500'};
  const canvasRef = React.useRef(null);

  // Draw speed curve
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i/4)*h); ctx.lineTo(w, (i/4)*h); ctx.stroke();
    }

    // 1x speed line
    const oneX = h * (1 - 1/4); // assuming max 4x
    ctx.strokeStyle = '#5a708844';
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(0, oneX); ctx.lineTo(w, oneX); ctx.stroke();
    ctx.setLineDash([]);

    // Speed curve
    if (points.length > 1) {
      ctx.strokeStyle = S.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px < w; px++) {
        const t = px / w;
        const speed = getSpeedAtPosition(points, t);
        const y = h * (1 - speed / 4);
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();

      // Points
      for (const pt of points) {
        const px = pt.t * w;
        const py = h * (1 - pt.speed / 4);
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = S.accent;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [points]);

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8}}>⚡ Speed Ramping</div>

      {/* Presets */}
      <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
        {SPEED_RAMP_PRESETS.map(p => (
          <button key={p.id} onClick={()=>onChange(p.points, p.id)}
            style={{padding:'3px 8px',borderRadius:4,cursor:'pointer',border:`1px solid ${presetId===p.id?S.accent:S.border}`,
              background:presetId===p.id?`${S.accent}20`:'transparent',color:presetId===p.id?S.accent:S.dim,fontSize:'0.6rem'}}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Curve visualization */}
      <canvas ref={canvasRef} width={300} height={100}
        style={{width:'100%',height:80,borderRadius:4,border:`1px solid ${S.border}`,background:S.input}} />

      {/* Point list */}
      <div style={{marginTop:6}}>
        {points.map((pt, i) => (
          <div key={i} style={{display:'flex',gap:4,alignItems:'center',marginBottom:2}}>
            <span style={{color:S.dim,width:20,fontSize:'0.6rem'}}>{i+1}</span>
            <span style={{color:S.dim,fontSize:'0.55rem',width:15}}>T:</span>
            <input type="range" min={0} max={1} step={0.01} value={pt.t}
              onChange={e=>{const n=[...points];n[i]={...n[i],t:parseFloat(e.target.value)};onChange(n,null);}} style={{flex:1}} />
            <span style={{width:25,fontSize:'0.55rem',color:S.text}}>{pt.t.toFixed(2)}</span>
            <span style={{color:S.dim,fontSize:'0.55rem',width:15}}>S:</span>
            <input type="range" min={0.1} max={4} step={0.1} value={pt.speed}
              onChange={e=>{const n=[...points];n[i]={...n[i],speed:parseFloat(e.target.value)};onChange(n,null);}} style={{flex:1}} />
            <span style={{width:25,fontSize:'0.55rem',color:S.accent}}>{pt.speed.toFixed(1)}x</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. FREEZE FRAME
// ═══════════════════════════════════════════════════════════════════════════════

export const createFreezeFrame = (clipId, time, duration = 2) => ({
  id: `ff_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type:'freeze_frame', clipId, time, duration,
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ADJUSTMENT LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

export const createAdjustmentLayer = ({
  startTime=0, duration=10, blendMode='normal', opacity=1,
  effects={ brightness:100, contrast:100, saturate:100, hueRotate:0, blur:0 },
}={}) => ({
  id: `adj_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  type:'adjustment_layer', startTime, duration, effects, blendMode, opacity, keyframes:[],
});

export const BLEND_MODES = [
  'normal','multiply','screen','overlay','darken','lighten',
  'color-dodge','color-burn','hard-light','soft-light',
  'difference','exclusion','hue','saturation','color','luminosity',
];

// ── Adjustment Layer Panel ──
export const AdjustmentLayerPanel = ({ layer, onChange }) => {
  if (!layer) return null;
  const S = {bg:'#161b22',input:'#21262d',border:'#30363d',text:'#c9d1d9',dim:'#5a7088',accent:'#af52de'};
  const updFx = (k,v) => onChange({...layer, effects:{...layer.effects,[k]:v}});

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8}}>🎨 Adjustment Layer</div>

      <div style={{display:'flex',gap:6,marginBottom:8}}>
        <span style={{color:S.dim,width:65}}>Blend</span>
        <select value={layer.blendMode} onChange={e=>onChange({...layer,blendMode:e.target.value})}
          style={{flex:1,background:S.input,border:`1px solid ${S.border}`,borderRadius:4,color:S.text,padding:'2px 4px',fontSize:'0.65rem'}}>
          {BLEND_MODES.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {[['brightness','Brightness',0,200],['contrast','Contrast',0,200],['saturate','Saturation',0,200],['hueRotate','Hue',0,360],['blur','Blur',0,20]].map(([k,label,min,max])=>(
        <div key={k} style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
          <span style={{color:S.dim,width:65,fontSize:'0.6rem'}}>{label}</span>
          <input type="range" min={min} max={max} step={k==='blur'?0.5:1} value={layer.effects[k]||0}
            onChange={e=>updFx(k,parseFloat(e.target.value))} style={{flex:1}} />
          <span style={{width:30,fontSize:'0.6rem',color:S.text}}>{layer.effects[k]||0}</span>
        </div>
      ))}

      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
        <span style={{color:S.dim,width:65,fontSize:'0.6rem'}}>Opacity</span>
        <input type="range" min={0} max={1} step={0.01} value={layer.opacity}
          onChange={e=>onChange({...layer,opacity:parseFloat(e.target.value)})} style={{flex:1}} />
        <span style={{width:30,fontSize:'0.6rem',color:S.text}}>{Math.round(layer.opacity*100)}%</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AUTO-REFRAME (AI Subject Detection → Crop for Aspect Ratio)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple auto-reframe: analyzes frame brightness distribution
 * to estimate subject center, then crops to target aspect ratio.
 * For real production, use ML face/object detection.
 */
export const autoReframeAnalyze = (ctx, width, height) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Weight-map: brighter regions assumed to be subject (simple heuristic)
  let weightX = 0, weightY = 0, totalWeight = 0;
  const step = 4; // sample every 4th pixel for speed
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const lum = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
      // Also weight skin tones higher
      const r=data[i], g=data[i+1], b=data[i+2];
      const isSkin = r>80 && g>40 && b>20 && r>g && r>b && (r-g)>15 && Math.abs(r-g)<150;
      const w = lum + (isSkin ? 200 : 0);
      weightX += x * w;
      weightY += y * w;
      totalWeight += w;
    }
  }

  const centerX = totalWeight > 0 ? weightX / totalWeight : width / 2;
  const centerY = totalWeight > 0 ? weightY / totalWeight : height / 2;

  return {
    subjectX: centerX / width,  // 0-1
    subjectY: centerY / height, // 0-1
  };
};

/**
 * Calculate crop rect to reframe from source to target aspect ratio
 */
export const calculateReframeCrop = (srcWidth, srcHeight, targetRatio, subjectX = 0.5, subjectY = 0.5) => {
  // targetRatio = width/height (e.g., 9/16 for portrait)
  const srcRatio = srcWidth / srcHeight;

  let cropW, cropH;
  if (srcRatio > targetRatio) {
    // Source is wider — crop sides
    cropH = srcHeight;
    cropW = srcHeight * targetRatio;
  } else {
    // Source is taller — crop top/bottom
    cropW = srcWidth;
    cropH = srcWidth / targetRatio;
  }

  // Center crop on subject
  let cropX = subjectX * srcWidth - cropW / 2;
  let cropY = subjectY * srcHeight - cropH / 2;

  // Clamp to bounds
  cropX = Math.max(0, Math.min(srcWidth - cropW, cropX));
  cropY = Math.max(0, Math.min(srcHeight - cropH, cropY));

  return { x: Math.round(cropX), y: Math.round(cropY), width: Math.round(cropW), height: Math.round(cropH) };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. VIDEO STABILIZATION (Simple 2D Translation Smoothing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple motion estimation by comparing frame brightness centroids.
 * Returns smoothed offsets for each frame.
 */
export class VideoStabilizer {
  constructor(smoothingWindow = 15) {
    this.smoothingWindow = smoothingWindow;
    this.motionVectors = []; // [{dx, dy}]
  }

  /**
   * Estimate motion between two frames (simple centroid shift)
   */
  estimateMotion(prevCtx, currCtx, width, height) {
    const getCenter = (ctx) => {
      const data = ctx.getImageData(0, 0, width, height).data;
      let wx=0, wy=0, total=0;
      const step = 8;
      for (let y=0; y<height; y+=step) {
        for (let x=0; x<width; x+=step) {
          const i = (y*width+x)*4;
          const lum = data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
          wx += x*lum; wy += y*lum; total += lum;
        }
      }
      return { x: total>0?wx/total:width/2, y: total>0?wy/total:height/2 };
    };

    const prev = getCenter(prevCtx);
    const curr = getCenter(currCtx);
    return { dx: curr.x - prev.x, dy: curr.y - prev.y };
  }

  /**
   * Add a motion vector
   */
  addFrame(dx, dy) {
    this.motionVectors.push({ dx, dy });
  }

  /**
   * Get smoothed cumulative path
   */
  getSmoothedPath() {
    const n = this.motionVectors.length;
    if (n === 0) return [];

    // Cumulative trajectory
    const trajectory = [{ x: 0, y: 0 }];
    for (let i = 0; i < n; i++) {
      const prev = trajectory[trajectory.length - 1];
      trajectory.push({ x: prev.x + this.motionVectors[i].dx, y: prev.y + this.motionVectors[i].dy });
    }

    // Smooth trajectory (moving average)
    const smoothed = trajectory.map((_, i) => {
      let sx = 0, sy = 0, count = 0;
      for (let j = Math.max(0, i - this.smoothingWindow); j <= Math.min(trajectory.length-1, i + this.smoothingWindow); j++) {
        sx += trajectory[j].x; sy += trajectory[j].y; count++;
      }
      return { x: sx/count, y: sy/count };
    });

    // Correction = smoothed - original
    return trajectory.map((orig, i) => ({
      dx: smoothed[i].x - orig.x,
      dy: smoothed[i].y - orig.y,
    }));
  }

  reset() { this.motionVectors = []; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. AUDIO NOISE REDUCTION (Spectral Gating)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple noise reduction using spectral gating.
 * Captures noise profile from a "quiet" section, then gates frequencies below threshold.
 */
export const createNoiseProfile = (audioBuffer, startSec = 0, durationSec = 1) => {
  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const start = Math.floor(startSec * sr);
  const len = Math.floor(durationSec * sr);
  const fftSize = 2048;

  // Simple RMS per-band estimate
  const bands = 32;
  const profile = new Float32Array(bands);
  const bandWidth = (sr / 2) / bands;

  // Just compute overall noise floor
  let rms = 0;
  for (let i = start; i < Math.min(start + len, data.length); i++) {
    rms += data[i] * data[i];
  }
  rms = Math.sqrt(rms / len);

  return { rms, threshold: rms * 2, bands: profile, sampleRate: sr };
};

/**
 * Apply noise gate to audio buffer (in-place modification)
 */
export const applyNoiseReduction = (audioContext, audioBuffer, noiseProfile, strength = 0.8) => {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Compressor acting as gate
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -50 + (1 - strength) * 30; // -50 to -20 dB
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;
  compressor.knee.value = 5;

  // High-pass to remove rumble
  const hpf = offlineCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 80;
  hpf.Q.value = 0.7;

  source.connect(hpf);
  hpf.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start();
  return offlineCtx.startRendering();
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MULTI-CAM EDITING
// ═══════════════════════════════════════════════════════════════════════════════

export const createMultiCamSession = ({ clips = [], syncMethod = 'audio' }) => ({
  id: `mc_${Date.now()}`,
  type: 'multicam',
  clips: clips.map((c, i) => ({
    clipId: c.id || c.clipId,
    angle: i + 1,
    label: c.label || `Cam ${i + 1}`,
    offset: c.offset || 0, // sync offset in seconds
    active: i === 0,
  })),
  syncMethod, // 'audio' | 'timecode' | 'manual'
  cuts: [], // [{ time, angleIndex }]
  activeAngle: 0,
});

/**
 * Add a multicam cut point
 */
export const addMultiCamCut = (session, time, angleIndex) => ({
  ...session,
  cuts: [...session.cuts, { time, angleIndex }].sort((a, b) => a.time - b.time),
});

/**
 * Get active angle at time
 */
export const getActiveAngle = (session, time) => {
  if (!session.cuts.length) return session.activeAngle;
  let active = session.activeAngle;
  for (const cut of session.cuts) {
    if (time >= cut.time) active = cut.angleIndex;
    else break;
  }
  return active;
};

// ── MultiCam Panel ──
export const MultiCamPanel = ({ session, currentTime, onCut, onSelectAngle }) => {
  if (!session) return null;
  const S = {bg:'#161b22',input:'#21262d',border:'#30363d',text:'#c9d1d9',dim:'#5a7088',accent:'#007aff'};
  const active = getActiveAngle(session, currentTime);

  return (
    <div style={{background:S.bg,borderRadius:8,padding:10,fontSize:'0.7rem'}}>
      <div style={{fontWeight:700,color:S.accent,marginBottom:8}}>📹 Multi-Cam ({session.clips.length} angles)</div>

      <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(4,session.clips.length)},1fr)`,gap:6}}>
        {session.clips.map((clip, i) => (
          <div key={i} onClick={() => { onCut && onCut(currentTime, i); onSelectAngle && onSelectAngle(i); }}
            style={{
              padding:8, borderRadius:6, textAlign:'center', cursor:'pointer',
              background: active===i ? `${S.accent}30` : S.input,
              border: `2px solid ${active===i ? S.accent : S.border}`,
              transition: 'all 0.15s ease',
            }}>
            <div style={{fontSize:'1.2rem',marginBottom:2}}>📹</div>
            <div style={{fontWeight:600,color:active===i?S.accent:S.text}}>{clip.label}</div>
            <div style={{fontSize:'0.55rem',color:S.dim}}>Angle {clip.angle}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:8,fontSize:'0.6rem',color:S.dim}}>
        {session.cuts.length} cuts • Click angle to switch at current time
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. SNAP TO BEAT (Audio Beat Detection)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect beats in an audio buffer using onset detection (energy flux).
 * Returns array of beat times in seconds.
 */
export const detectBeats = (audioBuffer, { threshold = 1.5, minInterval = 0.2 } = {}) => {
  const data = audioBuffer.getChannelData(0);
  const sr = audioBuffer.sampleRate;
  const windowSize = Math.floor(sr * 0.02); // 20ms windows
  const hopSize = Math.floor(windowSize / 2);

  // Compute energy per window
  const energies = [];
  for (let i = 0; i < data.length - windowSize; i += hopSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += data[i + j] * data[i + j];
    }
    energies.push(energy / windowSize);
  }

  // Compute local average energy (moving window)
  const avgWindow = 20;
  const beats = [];
  let lastBeatTime = -1;

  for (let i = avgWindow; i < energies.length; i++) {
    let avg = 0;
    for (let j = i - avgWindow; j < i; j++) avg += energies[j];
    avg /= avgWindow;

    const time = (i * hopSize) / sr;

    if (energies[i] > avg * threshold && time - lastBeatTime > minInterval) {
      beats.push(time);
      lastBeatTime = time;
    }
  }

  return beats;
};

/**
 * Snap a time to the nearest beat
 */
export const snapToBeat = (time, beats, snapRange = 0.15) => {
  if (!beats?.length) return time;
  let closest = beats[0];
  let minDist = Math.abs(time - closest);
  for (const beat of beats) {
    const dist = Math.abs(time - beat);
    if (dist < minDist) { minDist = dist; closest = beat; }
  }
  return minDist <= snapRange ? closest : time;
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ASPECT RATIO & EXPORT PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const ASPECT_RATIOS = [
  { id:'16:9', label:'16:9 — YouTube/TV', width:1920, height:1080 },
  { id:'9:16', label:'9:16 — TikTok/Reels/Shorts', width:1080, height:1920 },
  { id:'1:1', label:'1:1 — Instagram Square', width:1080, height:1080 },
  { id:'4:5', label:'4:5 — Instagram Portrait', width:1080, height:1350 },
  { id:'4:3', label:'4:3 — Classic TV', width:1440, height:1080 },
  { id:'21:9', label:'21:9 — Ultrawide/Cinema', width:2560, height:1080 },
  { id:'2:3', label:'2:3 — Pinterest', width:1000, height:1500 },
];

export const EXPORT_PRESETS = [
  { id:'youtube_1080', platform:'YouTube', label:'YouTube 1080p', width:1920,height:1080,fps:30,bitrate:'10M',codec:'h264' },
  { id:'youtube_4k', platform:'YouTube', label:'YouTube 4K', width:3840,height:2160,fps:30,bitrate:'40M',codec:'h264' },
  { id:'tiktok', platform:'TikTok', label:'TikTok', width:1080,height:1920,fps:30,bitrate:'8M',codec:'h264' },
  { id:'reels', platform:'Instagram', label:'Instagram Reels', width:1080,height:1920,fps:30,bitrate:'8M',codec:'h264' },
  { id:'ig_square', platform:'Instagram', label:'Instagram Square', width:1080,height:1080,fps:30,bitrate:'6M',codec:'h264' },
  { id:'ig_portrait', platform:'Instagram', label:'Instagram Portrait', width:1080,height:1350,fps:30,bitrate:'7M',codec:'h264' },
  { id:'shorts', platform:'YouTube', label:'YouTube Shorts', width:1080,height:1920,fps:30,bitrate:'8M',codec:'h264' },
  { id:'twitter', platform:'X/Twitter', label:'X/Twitter', width:1280,height:720,fps:30,bitrate:'5M',codec:'h264' },
  { id:'linkedin', platform:'LinkedIn', label:'LinkedIn', width:1920,height:1080,fps:30,bitrate:'8M',codec:'h264' },
  { id:'facebook', platform:'Facebook', label:'Facebook Feed', width:1280,height:720,fps:30,bitrate:'6M',codec:'h264' },
  { id:'pinterest', platform:'Pinterest', label:'Pinterest', width:1000,height:1500,fps:30,bitrate:'5M',codec:'h264' },
  { id:'podcast_vid', platform:'Podcast', label:'Podcast Video', width:1920,height:1080,fps:24,bitrate:'4M',codec:'h264' },
];

export default {
  CHROMA_PRESETS, applyChromaKey, createChromaKeySettings, ChromaKeyPanel,
  SPEED_RAMP_PRESETS, getSpeedAtPosition, SpeedRampPanel,
  createFreezeFrame,
  createAdjustmentLayer, BLEND_MODES, AdjustmentLayerPanel,
  autoReframeAnalyze, calculateReframeCrop,
  VideoStabilizer,
  createNoiseProfile, applyNoiseReduction,
  createMultiCamSession, addMultiCamCut, getActiveAngle, MultiCamPanel,
  detectBeats, snapToBeat,
  ASPECT_RATIOS, EXPORT_PRESETS,
};