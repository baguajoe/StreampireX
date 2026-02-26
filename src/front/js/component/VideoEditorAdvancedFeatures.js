// =============================================================================
// VideoEditorAdvancedFeatures.js — New Advanced Features
// =============================================================================
// Location: src/front/js/component/VideoEditorAdvancedFeatures.js
//
// Features:
//   1. AI Background Removal (no green screen needed)
//   2. Motion Tracking (attach text/graphics to moving objects)
//   3. Audio Ducking (auto-lower music when voice is detected)
//   4. Template Library (intro/outro/lower-third/social templates)
//   5. AI Scene Detection (auto-split clips at scene changes)
//
// Import into VideoEditorComponent.js alongside VideoEditorEffectsPlus.js
// =============================================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Shared dark theme colors
const S = {
  bg: '#161b22', card: '#1c2128', input: '#21262d', border: '#30363d',
  text: '#c9d1d9', dim: '#5a7088', accent: '#00ffc8', accentOrange: '#FF6600',
  danger: '#ff4757', success: '#34c759', warn: '#ffcc00',
};


// ═══════════════════════════════════════════════════════════════════════════════
// 1. AI BACKGROUND REMOVAL (Canvas-based, no green screen)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses luminance + skin-tone detection + edge-aware masking to separate
// foreground subjects from backgrounds. For production, integrate with
// MediaPipe Selfie Segmentation or TensorFlow BodyPix.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Segment foreground from background using luminance & skin-tone heuristics.
 * Returns a mask (Uint8Array) where 255 = foreground, 0 = background.
 */
export const segmentForeground = (ctx, width, height, options = {}) => {
  const {
    edgeThreshold = 30,       // Edge detection sensitivity
    skinBoost = true,         // Boost skin-tone regions
    centerBias = 0.3,         // Weight toward center of frame
    smoothingPasses = 2,      // Gaussian-like smoothing passes on mask
    refinementIterations = 3, // Iterative refinement
  } = options;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const mask = new Uint8Array(width * height);

  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);

  // Pass 1: Score each pixel as foreground likelihood
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let score = 0;

      // Skin tone detection (broader range for diverse skin tones)
      const isSkin = (
        r > 60 && g > 30 && b > 15 &&
        r > g && r > b &&
        Math.abs(r - g) > 10 &&
        r - b > 15 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15
      );
      if (skinBoost && isSkin) score += 150;

      // Hair detection (dark regions near top of frame)
      const isDark = (r + g + b) / 3 < 60;
      const isUpperHalf = y < height * 0.5;
      if (isDark && isUpperHalf) score += 40;

      // Center bias — subjects tend to be near center
      if (centerBias > 0) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
        score += (1 - dist) * centerBias * 100;
      }

      // Luminance variance (edges = foreground detail)
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
        const getL = (px, py) => {
          const j = (py * width + px) * 4;
          return data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
        };
        const lum = getL(x, y);
        const gx = Math.abs(getL(x + 1, y) - getL(x - 1, y));
        const gy = Math.abs(getL(x, y + 1) - getL(x, y - 1));
        const edgeMag = gx + gy;
        if (edgeMag > edgeThreshold) score += Math.min(edgeMag, 100);
      }

      // Saturation — foreground often more colorful than plain backgrounds
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      score += sat * 50;

      mask[y * width + x] = Math.min(255, Math.max(0, Math.round(score)));
    }
  }

  // Pass 2: Threshold + smoothing
  const threshold = 80;
  for (let i = 0; i < mask.length; i++) {
    mask[i] = mask[i] > threshold ? 255 : 0;
  }

  // Gaussian-like smoothing to clean edges
  for (let pass = 0; pass < smoothingPasses; pass++) {
    const temp = new Uint8Array(mask);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const avg = (
          temp[idx - width - 1] + temp[idx - width] + temp[idx - width + 1] +
          temp[idx - 1] + temp[idx] * 4 + temp[idx + 1] +
          temp[idx + width - 1] + temp[idx + width] + temp[idx + width + 1]
        ) / 12;
        mask[idx] = avg > 127 ? 255 : 0;
      }
    }
  }

  // Morphological close (fill small holes)
  for (let iter = 0; iter < refinementIterations; iter++) {
    // Dilate
    const dilated = new Uint8Array(mask);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (mask[idx - 1] || mask[idx + 1] || mask[idx - width] || mask[idx + width]) {
          dilated[idx] = 255;
        }
      }
    }
    // Erode
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (dilated[idx] && dilated[idx - 1] && dilated[idx + 1] && dilated[idx - width] && dilated[idx + width]) {
          mask[idx] = 255;
        } else if (!dilated[idx]) {
          mask[idx] = 0;
        }
      }
    }
  }

  return mask;
};

/**
 * Apply background removal using a segmentation mask.
 * Replaces background with solid color, blur, image, or transparency.
 */
export const applyBackgroundRemoval = (ctx, width, height, mask, options = {}) => {
  const {
    mode = 'transparent',   // 'transparent' | 'color' | 'blur' | 'image'
    bgColor = [0, 0, 0],   // Background color for 'color' mode
    blurRadius = 20,        // Blur radius for 'blur' mode
    featherEdge = 3,        // Feather edge in pixels
  } = options;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Create feathered mask
  const feathered = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) feathered[i] = mask[i] / 255;

  // Feather edges
  if (featherEdge > 0) {
    for (let pass = 0; pass < featherEdge; pass++) {
      const temp = new Float32Array(feathered);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          temp[idx] = (
            feathered[idx - width] + feathered[idx + width] +
            feathered[idx - 1] + feathered[idx + 1] +
            feathered[idx] * 2
          ) / 6;
        }
      }
      feathered.set(temp);
    }
  }

  if (mode === 'blur') {
    // Save original, apply blur, then composite
    const original = new Uint8ClampedArray(data);

    // Simple box blur for background
    const blurred = new Uint8ClampedArray(data);
    const r = Math.ceil(blurRadius);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let tr = 0, tg = 0, tb = 0, count = 0;
        for (let dy = -r; dy <= r; dy += 2) {
          for (let dx = -r; dx <= r; dx += 2) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const j = (ny * width + nx) * 4;
            tr += data[j]; tg += data[j + 1]; tb += data[j + 2]; count++;
          }
        }
        const j = (y * width + x) * 4;
        blurred[j] = tr / count; blurred[j + 1] = tg / count; blurred[j + 2] = tb / count;
      }
    }

    // Composite: foreground over blurred background
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const j = idx * 4;
        const alpha = feathered[idx];
        data[j] = Math.round(original[j] * alpha + blurred[j] * (1 - alpha));
        data[j + 1] = Math.round(original[j + 1] * alpha + blurred[j + 1] * (1 - alpha));
        data[j + 2] = Math.round(original[j + 2] * alpha + blurred[j + 2] * (1 - alpha));
        data[j + 3] = 255;
      }
    }
  } else if (mode === 'color') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const j = idx * 4;
        const alpha = feathered[idx];
        data[j] = Math.round(data[j] * alpha + bgColor[0] * (1 - alpha));
        data[j + 1] = Math.round(data[j + 1] * alpha + bgColor[1] * (1 - alpha));
        data[j + 2] = Math.round(data[j + 2] * alpha + bgColor[2] * (1 - alpha));
      }
    }
  } else {
    // Transparent
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        data[idx * 4 + 3] = Math.round(feathered[idx] * 255);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Background Removal settings
 */
export const createBGRemovalSettings = () => ({
  enabled: false,
  mode: 'blur',           // 'transparent' | 'color' | 'blur' | 'image'
  bgColor: [0, 0, 0],
  blurRadius: 20,
  edgeThreshold: 30,
  skinBoost: true,
  centerBias: 0.3,
  smoothingPasses: 2,
  featherEdge: 3,
  refinementIterations: 3,
  bgImageUrl: null,        // URL for 'image' mode
  realtimePreview: false,  // Performance toggle
});

/**
 * Background Removal Panel UI
 */
export const BackgroundRemovalPanel = ({ settings = {}, onChange }) => {
  const s = { ...createBGRemovalSettings(), ...settings };

  const update = (key, val) => onChange && onChange({ ...s, [key]: val });

  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: 10, fontSize: '0.7rem' }}>
      <div style={{ fontWeight: 700, color: S.accent, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🎭</span> AI Background Removal
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={s.enabled} onChange={e => update('enabled', e.target.checked)} />
          <span style={{ color: s.enabled ? S.success : S.dim }}>{s.enabled ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      {s.enabled && (
        <>
          {/* Mode selector */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ color: S.dim, fontSize: '0.6rem' }}>Background Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4 }}>
              {[
                { id: 'blur', label: '🌫️ Blur', desc: 'Bokeh effect' },
                { id: 'transparent', label: '🔲 None', desc: 'Transparent' },
                { id: 'color', label: '🎨 Color', desc: 'Solid color' },
                { id: 'image', label: '🖼️ Image', desc: 'Custom image' },
              ].map(m => (
                <div key={m.id} onClick={() => update('mode', m.id)} style={{
                  padding: '6px 4px', borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                  background: s.mode === m.id ? `${S.accent}20` : S.input,
                  border: `1px solid ${s.mode === m.id ? S.accent : S.border}`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: '1rem' }}>{m.label.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.5rem', color: s.mode === m.id ? S.accent : S.dim }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode-specific controls */}
          {s.mode === 'blur' && (
            <div style={{ marginBottom: 6 }}>
              <label style={{ color: S.dim }}>Blur Radius: {s.blurRadius}px</label>
              <input type="range" min="5" max="60" value={s.blurRadius}
                onChange={e => update('blurRadius', parseInt(e.target.value))}
                style={{ width: '100%' }} />
            </div>
          )}

          {s.mode === 'color' && (
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ color: S.dim }}>Color:</label>
              <input type="color" value={`#${s.bgColor.map(c => c.toString(16).padStart(2, '0')).join('')}`}
                onChange={e => {
                  const hex = e.target.value;
                  update('bgColor', [
                    parseInt(hex.slice(1, 3), 16),
                    parseInt(hex.slice(3, 5), 16),
                    parseInt(hex.slice(5, 7), 16),
                  ]);
                }} />
            </div>
          )}

          {/* Edge refinement */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: S.dim }}>Edge Feather: {s.featherEdge}px</label>
            <input type="range" min="0" max="10" value={s.featherEdge}
              onChange={e => update('featherEdge', parseInt(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ color: S.dim }}>Detection Sensitivity: {s.edgeThreshold}</label>
            <input type="range" min="10" max="80" value={s.edgeThreshold}
              onChange={e => update('edgeThreshold', parseInt(e.target.value))}
              style={{ width: '100%' }} />
          </div>

          <div style={{ fontSize: '0.55rem', color: S.dim, padding: '4px 0' }}>
            💡 Works best with well-lit subjects against contrasting backgrounds
          </div>
        </>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 2. MOTION TRACKING (Attach text/graphics to moving objects)
// ═══════════════════════════════════════════════════════════════════════════════
// Lucas-Kanade style optical flow on a selected point/region.
// Tracks brightness patterns frame-to-frame.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track a point across frames using template matching (NCC).
 * @param prevCtx - Previous frame canvas context
 * @param currCtx - Current frame canvas context
 * @param trackPoint - { x, y } position to track
 * @param searchRadius - Search area radius
 * @param templateSize - Template patch size
 * @returns { x, y, confidence } new position
 */
export const trackPoint = (prevCtx, currCtx, width, height, trackPoint, {
  searchRadius = 40,
  templateSize = 21,
} = {}) => {
  const halfT = Math.floor(templateSize / 2);
  const { x: tx, y: ty } = trackPoint;

  // Extract template from previous frame
  const prevData = prevCtx.getImageData(0, 0, width, height).data;
  const currData = currCtx.getImageData(0, 0, width, height).data;

  const getLum = (data, px, py) => {
    if (px < 0 || py < 0 || px >= width || py >= height) return 128;
    const i = (py * width + px) * 4;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };

  // Build template from prev frame
  const template = [];
  let tmean = 0;
  for (let dy = -halfT; dy <= halfT; dy++) {
    for (let dx = -halfT; dx <= halfT; dx++) {
      const val = getLum(prevData, Math.round(tx) + dx, Math.round(ty) + dy);
      template.push(val);
      tmean += val;
    }
  }
  tmean /= template.length;

  // NCC search in current frame
  let bestX = tx, bestY = ty, bestNCC = -1;

  for (let sy = -searchRadius; sy <= searchRadius; sy += 1) {
    for (let sx = -searchRadius; sx <= searchRadius; sx += 1) {
      const cx = Math.round(tx) + sx;
      const cy = Math.round(ty) + sy;
      if (cx < halfT || cy < halfT || cx >= width - halfT || cy >= height - halfT) continue;

      let cmean = 0, idx = 0;
      const candidate = [];
      for (let dy = -halfT; dy <= halfT; dy++) {
        for (let dx = -halfT; dx <= halfT; dx++) {
          const val = getLum(currData, cx + dx, cy + dy);
          candidate.push(val);
          cmean += val;
          idx++;
        }
      }
      cmean /= candidate.length;

      // Normalized Cross-Correlation
      let num = 0, denomT = 0, denomC = 0;
      for (let k = 0; k < template.length; k++) {
        const dt = template[k] - tmean;
        const dc = candidate[k] - cmean;
        num += dt * dc;
        denomT += dt * dt;
        denomC += dc * dc;
      }
      const denom = Math.sqrt(denomT * denomC);
      const ncc = denom > 0 ? num / denom : 0;

      if (ncc > bestNCC) {
        bestNCC = ncc;
        bestX = cx;
        bestY = cy;
      }
    }
  }

  return { x: bestX, y: bestY, confidence: bestNCC };
};

/**
 * Create a motion tracking session
 */
export const createMotionTrack = (options = {}) => ({
  id: `mt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type: 'motion_track',
  enabled: true,
  trackPoint: options.trackPoint || { x: 0, y: 0 },
  keyframes: [],  // [{ frame, x, y, confidence }]
  attachments: [],  // [{ type: 'text'|'image'|'shape', content, offsetX, offsetY, ... }]
  searchRadius: options.searchRadius || 40,
  templateSize: options.templateSize || 21,
  smoothing: options.smoothing || 0.5,  // 0 = raw, 1 = heavy smoothing
  status: 'idle',  // 'idle' | 'tracking' | 'complete' | 'error'
});

/**
 * Add attachment to a motion track (text, image, shape)
 */
export const addMotionAttachment = (track, attachment) => ({
  ...track,
  attachments: [...track.attachments, {
    id: `att_${Date.now()}`,
    type: attachment.type || 'text',  // 'text' | 'image' | 'shape' | 'effect'
    content: attachment.content || 'Text',
    offsetX: attachment.offsetX || 0,
    offsetY: attachment.offsetY || -40,
    fontSize: attachment.fontSize || 24,
    fontColor: attachment.fontColor || '#ffffff',
    fontFamily: attachment.fontFamily || 'Arial',
    bgColor: attachment.bgColor || 'transparent',
    borderRadius: attachment.borderRadius || 0,
    opacity: attachment.opacity ?? 1,
    scale: attachment.scale ?? 1,
    rotation: attachment.rotation ?? 0,
    imageUrl: attachment.imageUrl || null,
    shape: attachment.shape || 'rectangle',  // 'rectangle' | 'circle' | 'arrow' | 'line'
    shapeColor: attachment.shapeColor || '#00ffc8',
    shapeWidth: attachment.shapeWidth || 100,
    shapeHeight: attachment.shapeHeight || 40,
    strokeWidth: attachment.strokeWidth || 2,
  }],
});

/**
 * Smooth tracked keyframes using moving average
 */
export const smoothMotionKeyframes = (keyframes, windowSize = 5) => {
  if (keyframes.length < windowSize) return keyframes;
  return keyframes.map((kf, i) => {
    let sx = 0, sy = 0, count = 0;
    for (let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(keyframes.length - 1, i + Math.floor(windowSize / 2)); j++) {
      sx += keyframes[j].x; sy += keyframes[j].y; count++;
    }
    return { ...kf, x: sx / count, y: sy / count };
  });
};

/**
 * Motion Tracking Panel UI
 */
export const MotionTrackingPanel = ({ tracks = [], currentTime, onCreateTrack, onDeleteTrack, onAddAttachment }) => {
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [attachType, setAttachType] = useState('text');
  const [attachContent, setAttachContent] = useState('Hello');

  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: 10, fontSize: '0.7rem' }}>
      <div style={{ fontWeight: 700, color: S.accent, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>📍</span> Motion Tracking
        <button onClick={onCreateTrack} style={{
          marginLeft: 'auto', background: S.accent, color: '#000', border: 'none',
          borderRadius: 4, padding: '3px 8px', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
        }}>
          + New Track
        </button>
      </div>

      {tracks.length === 0 ? (
        <div style={{ color: S.dim, textAlign: 'center', padding: 16 }}>
          Click "New Track" then click a point in the preview to start tracking
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tracks.map((track, i) => (
            <div key={track.id} style={{
              background: selectedTrack === track.id ? `${S.accent}15` : S.input,
              border: `1px solid ${selectedTrack === track.id ? S.accent : S.border}`,
              borderRadius: 6, padding: 8, cursor: 'pointer',
            }} onClick={() => setSelectedTrack(track.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: S.text, fontWeight: 600 }}>Track {i + 1}</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3,
                    background: track.status === 'complete' ? `${S.success}30` :
                      track.status === 'tracking' ? `${S.warn}30` : `${S.dim}30`,
                    color: track.status === 'complete' ? S.success :
                      track.status === 'tracking' ? S.warn : S.dim,
                  }}>
                    {track.status}
                  </span>
                  <button onClick={e => { e.stopPropagation(); onDeleteTrack && onDeleteTrack(track.id); }}
                    style={{ background: 'none', border: 'none', color: S.danger, cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                </div>
              </div>

              <div style={{ fontSize: '0.55rem', color: S.dim, marginTop: 2 }}>
                {track.keyframes.length} frames • {track.attachments.length} attachments
              </div>

              {/* Attachment controls */}
              {selectedTrack === track.id && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}` }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {['text', 'shape', 'image'].map(t => (
                      <button key={t} onClick={() => setAttachType(t)} style={{
                        background: attachType === t ? S.accent : S.input, color: attachType === t ? '#000' : S.text,
                        border: `1px solid ${attachType === t ? S.accent : S.border}`,
                        borderRadius: 4, padding: '2px 8px', fontSize: '0.55rem', cursor: 'pointer', fontWeight: 600,
                      }}>
                        {t === 'text' ? '✏️ Text' : t === 'shape' ? '⬜ Shape' : '🖼️ Image'}
                      </button>
                    ))}
                  </div>

                  {attachType === 'text' && (
                    <input type="text" value={attachContent} onChange={e => setAttachContent(e.target.value)}
                      placeholder="Enter text..." style={{
                        width: '100%', background: S.input, border: `1px solid ${S.border}`,
                        borderRadius: 4, color: S.text, padding: '4px 6px', fontSize: '0.6rem', marginBottom: 4,
                      }} />
                  )}

                  <button onClick={() => onAddAttachment && onAddAttachment(track.id, { type: attachType, content: attachContent })}
                    style={{
                      width: '100%', background: `${S.accent}20`, color: S.accent, border: `1px solid ${S.accent}40`,
                      borderRadius: 4, padding: '4px 0', fontSize: '0.6rem', cursor: 'pointer', fontWeight: 600,
                    }}>
                    + Attach {attachType}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 3. AUDIO DUCKING (Auto-lower music when voice is detected)
// ═══════════════════════════════════════════════════════════════════════════════
// Uses Web Audio API frequency analysis to detect voice presence,
// then automatically reduces music track volume.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze audio buffer to detect voice segments.
 * Voice is typically 85Hz-3400Hz with specific spectral characteristics.
 * Returns array of segments: [{ start, end, confidence }]
 */
export const detectVoiceSegments = (audioBuffer, options = {}) => {
  const {
    frameSize = 2048,
    hopSize = 512,
    voiceMinFreq = 85,
    voiceMaxFreq = 3400,
    energyThreshold = 0.01,
    minSegmentDuration = 0.3,  // seconds
    mergeTolerance = 0.2,      // merge segments closer than this
  } = options;

  const sampleRate = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0); // mono
  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    // Extract frame
    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) frame[j] = data[i + j];

    // Apply Hann window
    for (let j = 0; j < frameSize; j++) {
      frame[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / (frameSize - 1)));
    }

    // Simple DFT energy in voice band
    const freqResolution = sampleRate / frameSize;
    const minBin = Math.floor(voiceMinFreq / freqResolution);
    const maxBin = Math.ceil(voiceMaxFreq / freqResolution);

    let voiceEnergy = 0, totalEnergy = 0;
    // Use autocorrelation-based energy estimation (faster than full FFT)
    for (let j = 0; j < frameSize; j++) totalEnergy += frame[j] * frame[j];
    totalEnergy /= frameSize;

    // Estimate voice band energy via zero-crossing rate + energy
    let zeroCrossings = 0;
    for (let j = 1; j < frameSize; j++) {
      if ((frame[j] >= 0) !== (frame[j - 1] >= 0)) zeroCrossings++;
    }
    const zcr = zeroCrossings / frameSize;

    // Voice: moderate zero-crossing rate (not too high like noise, not too low like silence)
    const isVoiceLike = totalEnergy > energyThreshold && zcr > 0.02 && zcr < 0.25;
    const time = i / sampleRate;

    if (isVoiceLike) {
      if (!currentSegment) {
        currentSegment = { start: time, end: time, confidence: 0.8 };
      }
      currentSegment.end = time + frameSize / sampleRate;
    } else {
      if (currentSegment && currentSegment.end - currentSegment.start >= minSegmentDuration) {
        segments.push({ ...currentSegment });
      }
      currentSegment = null;
    }
  }
  if (currentSegment && currentSegment.end - currentSegment.start >= minSegmentDuration) {
    segments.push(currentSegment);
  }

  // Merge close segments
  const merged = [];
  for (const seg of segments) {
    if (merged.length > 0 && seg.start - merged[merged.length - 1].end < mergeTolerance) {
      merged[merged.length - 1].end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
};

/**
 * Generate ducking automation (volume keyframes) for a music track
 * based on detected voice segments.
 */
export const generateDuckingAutomation = (voiceSegments, musicDuration, options = {}) => {
  const {
    duckLevel = 0.25,       // Volume during voice (0-1)
    normalLevel = 1.0,      // Volume when no voice
    fadeInTime = 0.15,       // Seconds to fade in after voice ends
    fadeOutTime = 0.15,      // Seconds to fade out when voice starts
    preRoll = 0.05,          // Start ducking before voice
    postRoll = 0.1,          // Keep ducked after voice ends
  } = options;

  const keyframes = [{ time: 0, volume: normalLevel }];

  for (const seg of voiceSegments) {
    const duckStart = Math.max(0, seg.start - preRoll);
    const duckEnd = Math.min(musicDuration, seg.end + postRoll);

    // Fade down
    keyframes.push({ time: duckStart, volume: normalLevel });
    keyframes.push({ time: duckStart + fadeOutTime, volume: duckLevel });

    // Stay ducked
    keyframes.push({ time: duckEnd - fadeInTime, volume: duckLevel });

    // Fade up
    keyframes.push({ time: duckEnd, volume: normalLevel });
  }

  keyframes.push({ time: musicDuration, volume: normalLevel });

  // Remove duplicates and sort
  const cleaned = [];
  for (const kf of keyframes) {
    if (cleaned.length === 0 || Math.abs(cleaned[cleaned.length - 1].time - kf.time) > 0.01) {
      cleaned.push(kf);
    }
  }
  return cleaned.sort((a, b) => a.time - b.time);
};

/**
 * Get interpolated volume at a specific time from ducking keyframes
 */
export const getDuckingVolumeAtTime = (keyframes, time) => {
  if (!keyframes?.length) return 1;
  if (time <= keyframes[0].time) return keyframes[0].volume;
  if (time >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].volume;

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      const t = (time - keyframes[i].time) / (keyframes[i + 1].time - keyframes[i].time);
      // Smooth interpolation
      const eased = t * t * (3 - 2 * t); // smoothstep
      return keyframes[i].volume + (keyframes[i + 1].volume - keyframes[i].volume) * eased;
    }
  }
  return 1;
};

/**
 * Audio Ducking settings
 */
export const createAudioDuckingSettings = () => ({
  enabled: false,
  voiceTrackId: null,     // Track containing voice
  musicTrackId: null,     // Track to duck
  duckLevel: 0.25,
  fadeInTime: 0.15,
  fadeOutTime: 0.15,
  preRoll: 0.05,
  postRoll: 0.1,
  voiceSegments: [],
  automation: [],
  analyzed: false,
});

/**
 * Audio Ducking Panel UI
 */
export const AudioDuckingPanel = ({ settings = {}, tracks = [], onAnalyze, onChange }) => {
  const s = { ...createAudioDuckingSettings(), ...settings };
  const update = (key, val) => onChange && onChange({ ...s, [key]: val });

  const voiceTracks = tracks.filter(t => t.type === 'audio');
  const musicTracks = tracks.filter(t => t.type === 'audio');

  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: 10, fontSize: '0.7rem' }}>
      <div style={{ fontWeight: 700, color: S.accent, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🎙️</span> Audio Ducking
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={s.enabled} onChange={e => update('enabled', e.target.checked)} />
          <span style={{ color: s.enabled ? S.success : S.dim }}>{s.enabled ? 'ON' : 'OFF'}</span>
        </label>
      </div>

      {s.enabled && (
        <>
          {/* Voice track selector */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: S.dim, fontSize: '0.6rem' }}>Voice Track (talk/narration)</label>
            <select value={s.voiceTrackId || ''} onChange={e => update('voiceTrackId', parseInt(e.target.value) || null)}
              style={{ width: '100%', background: S.input, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text, padding: 4, fontSize: '0.6rem' }}>
              <option value="">Select voice track...</option>
              {voiceTracks.map((t, i) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Music track selector */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: S.dim, fontSize: '0.6rem' }}>Music Track (to duck)</label>
            <select value={s.musicTrackId || ''} onChange={e => update('musicTrackId', parseInt(e.target.value) || null)}
              style={{ width: '100%', background: S.input, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text, padding: 4, fontSize: '0.6rem' }}>
              <option value="">Select music track...</option>
              {musicTracks.map((t, i) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Duck level */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ color: S.dim }}>Duck Level: {Math.round(s.duckLevel * 100)}%</label>
            <input type="range" min="0" max="100" value={Math.round(s.duckLevel * 100)}
              onChange={e => update('duckLevel', parseInt(e.target.value) / 100)}
              style={{ width: '100%' }} />
          </div>

          {/* Fade times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <div>
              <label style={{ color: S.dim, fontSize: '0.55rem' }}>Fade In: {s.fadeInTime}s</label>
              <input type="range" min="0" max="100" value={s.fadeInTime * 200}
                onChange={e => update('fadeInTime', parseInt(e.target.value) / 200)}
                style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ color: S.dim, fontSize: '0.55rem' }}>Fade Out: {s.fadeOutTime}s</label>
              <input type="range" min="0" max="100" value={s.fadeOutTime * 200}
                onChange={e => update('fadeOutTime', parseInt(e.target.value) / 200)}
                style={{ width: '100%' }} />
            </div>
          </div>

          {/* Analyze button */}
          <button onClick={() => onAnalyze && onAnalyze(s.voiceTrackId, s.musicTrackId)} style={{
            width: '100%', background: s.analyzed ? `${S.success}20` : `${S.accent}20`,
            color: s.analyzed ? S.success : S.accent,
            border: `1px solid ${s.analyzed ? `${S.success}40` : `${S.accent}40`}`,
            borderRadius: 6, padding: '6px 0', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 700,
          }}>
            {s.analyzed ? `✅ ${s.voiceSegments.length} voice segments detected` : '🔍 Analyze & Apply Ducking'}
          </button>

          {s.analyzed && (
            <div style={{ fontSize: '0.55rem', color: S.dim, marginTop: 4 }}>
              Music will automatically lower to {Math.round(s.duckLevel * 100)}% when voice is detected
            </div>
          )}
        </>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 4. TEMPLATE LIBRARY (Intro/Outro/Lower-Third/Social Templates)
// ═══════════════════════════════════════════════════════════════════════════════

export const TEMPLATE_CATEGORIES = [
  { id: 'intro', name: '🎬 Intros', icon: '🎬' },
  { id: 'outro', name: '📺 Outros', icon: '📺' },
  { id: 'lower_third', name: '📋 Lower Thirds', icon: '📋' },
  { id: 'title', name: '✨ Title Cards', icon: '✨' },
  { id: 'transition', name: '🔄 Transitions', icon: '🔄' },
  { id: 'social', name: '📱 Social', icon: '📱' },
  { id: 'overlay', name: '🎨 Overlays', icon: '🎨' },
  { id: 'cta', name: '👆 Call to Action', icon: '👆' },
];

export const VIDEO_TEMPLATES = [
  // ── INTROS ──
  {
    id: 'intro_glitch', category: 'intro', name: 'Glitch Reveal',
    duration: 3, premium: false,
    description: 'Glitch effect text reveal with RGB split',
    colors: { primary: '#00ffc8', secondary: '#ff006e', bg: '#000000' },
    elements: [
      { type: 'text', content: '{CHANNEL_NAME}', x: 0.5, y: 0.45, fontSize: 64, fontWeight: 800, animation: 'glitchIn', delay: 0 },
      { type: 'text', content: '{TAGLINE}', x: 0.5, y: 0.58, fontSize: 20, fontWeight: 400, animation: 'fadeIn', delay: 0.8 },
      { type: 'shape', shape: 'line', x: 0.3, y: 0.52, width: 0.4, height: 2, color: '#00ffc8', animation: 'expandWidth', delay: 0.5 },
    ],
  },
  {
    id: 'intro_minimal', category: 'intro', name: 'Minimal Fade',
    duration: 2.5, premium: false,
    description: 'Clean fade-in with subtle motion',
    colors: { primary: '#ffffff', secondary: '#888888', bg: '#111111' },
    elements: [
      { type: 'text', content: '{CHANNEL_NAME}', x: 0.5, y: 0.48, fontSize: 48, fontWeight: 300, animation: 'fadeUp', delay: 0.2 },
      { type: 'text', content: '{TAGLINE}', x: 0.5, y: 0.58, fontSize: 16, fontWeight: 300, animation: 'fadeUp', delay: 0.6 },
    ],
  },
  {
    id: 'intro_energetic', category: 'intro', name: 'Energy Burst',
    duration: 3, premium: false,
    description: 'Dynamic zoom and rotate with particle burst',
    colors: { primary: '#FF6600', secondary: '#00ffc8', bg: '#0a0a0a' },
    elements: [
      { type: 'shape', shape: 'circle', x: 0.5, y: 0.5, width: 0, height: 0, color: '#FF660030', animation: 'scaleUp', delay: 0 },
      { type: 'text', content: '{CHANNEL_NAME}', x: 0.5, y: 0.45, fontSize: 72, fontWeight: 900, animation: 'zoomBounce', delay: 0.3 },
      { type: 'text', content: '{TAGLINE}', x: 0.5, y: 0.6, fontSize: 18, fontWeight: 500, animation: 'slideRight', delay: 0.8 },
    ],
  },
  {
    id: 'intro_cinematic', category: 'intro', name: 'Cinematic Bars',
    duration: 4, premium: true,
    description: 'Letterbox reveal with cinematic text',
    colors: { primary: '#d4af37', secondary: '#ffffff', bg: '#000000' },
    elements: [
      { type: 'shape', shape: 'rect', x: 0.5, y: 0.08, width: 1.0, height: 0.15, color: '#000000', animation: 'slideDown' },
      { type: 'shape', shape: 'rect', x: 0.5, y: 0.92, width: 1.0, height: 0.15, color: '#000000', animation: 'slideUp' },
      { type: 'text', content: '{CHANNEL_NAME}', x: 0.5, y: 0.48, fontSize: 56, fontWeight: 600, letterSpacing: 8, animation: 'fadeIn', delay: 1.0 },
    ],
  },

  // ── OUTROS ──
  {
    id: 'outro_subscribe', category: 'outro', name: 'Subscribe & Bell',
    duration: 5, premium: false,
    description: 'Subscribe button animation with social links',
    colors: { primary: '#ff0000', secondary: '#ffffff', bg: '#0d0d0d' },
    elements: [
      { type: 'text', content: 'SUBSCRIBE', x: 0.5, y: 0.4, fontSize: 36, fontWeight: 800, animation: 'scaleIn', delay: 0.3 },
      { type: 'shape', shape: 'roundRect', x: 0.5, y: 0.55, width: 200, height: 50, color: '#ff0000', animation: 'fadeIn', delay: 0.5 },
      { type: 'text', content: '🔔 Ring the Bell!', x: 0.5, y: 0.55, fontSize: 18, fontWeight: 700, color: '#fff', animation: 'fadeIn', delay: 0.5 },
      { type: 'text', content: '{SOCIAL_LINKS}', x: 0.5, y: 0.7, fontSize: 14, animation: 'fadeIn', delay: 1.0 },
    ],
  },
  {
    id: 'outro_endcard', category: 'outro', name: 'End Card Grid',
    duration: 8, premium: false,
    description: 'Two video slots + subscribe button',
    colors: { primary: '#ffffff', secondary: '#00ffc8', bg: '#111111' },
    elements: [
      { type: 'text', content: 'Watch More', x: 0.5, y: 0.15, fontSize: 28, fontWeight: 700, animation: 'fadeIn', delay: 0.2 },
      { type: 'shape', shape: 'roundRect', x: 0.28, y: 0.5, width: 280, height: 160, color: '#222', borderColor: '#333', animation: 'scaleIn', delay: 0.4 },
      { type: 'shape', shape: 'roundRect', x: 0.72, y: 0.5, width: 280, height: 160, color: '#222', borderColor: '#333', animation: 'scaleIn', delay: 0.6 },
      { type: 'text', content: 'SUBSCRIBE', x: 0.5, y: 0.82, fontSize: 20, fontWeight: 700, animation: 'fadeUp', delay: 1.0 },
    ],
  },

  // ── LOWER THIRDS ──
  {
    id: 'lt_modern', category: 'lower_third', name: 'Modern Bar',
    duration: 4, premium: false,
    description: 'Clean animated lower third with accent bar',
    colors: { primary: '#00ffc8', secondary: '#ffffff', bg: '#000000cc' },
    elements: [
      { type: 'shape', shape: 'rect', x: 0.02, y: 0.78, width: 4, height: 50, color: '#00ffc8', animation: 'expandWidth' },
      { type: 'shape', shape: 'rect', x: 0.22, y: 0.78, width: 0, height: 50, color: '#000000cc', animation: 'expandWidth', delay: 0.15 },
      { type: 'text', content: '{NAME}', x: 0.15, y: 0.77, fontSize: 22, fontWeight: 700, color: '#fff', animation: 'slideRight', delay: 0.3 },
      { type: 'text', content: '{TITLE}', x: 0.15, y: 0.83, fontSize: 14, fontWeight: 400, color: '#00ffc8', animation: 'slideRight', delay: 0.45 },
    ],
  },
  {
    id: 'lt_news', category: 'lower_third', name: 'News Ticker',
    duration: 5, premium: false,
    description: 'Breaking news style banner',
    colors: { primary: '#cc0000', secondary: '#ffffff', bg: '#1a1a1a' },
    elements: [
      { type: 'shape', shape: 'rect', x: 0.5, y: 0.88, width: 1.0, height: 60, color: '#1a1a1ae6', animation: 'slideUp', delay: 0 },
      { type: 'shape', shape: 'rect', x: 0.05, y: 0.88, width: 100, height: 60, color: '#cc0000', animation: 'slideLeft', delay: 0.15 },
      { type: 'text', content: 'LIVE', x: 0.05, y: 0.88, fontSize: 18, fontWeight: 900, color: '#fff', animation: 'fadeIn', delay: 0.3 },
      { type: 'text', content: '{HEADLINE}', x: 0.55, y: 0.87, fontSize: 18, fontWeight: 600, color: '#fff', animation: 'slideRight', delay: 0.35 },
    ],
  },
  {
    id: 'lt_minimal_line', category: 'lower_third', name: 'Minimal Line',
    duration: 3.5, premium: false,
    description: 'Subtle line with text slide',
    colors: { primary: '#ffffff', secondary: '#888', bg: 'transparent' },
    elements: [
      { type: 'shape', shape: 'line', x: 0.05, y: 0.82, width: 0.3, height: 1, color: '#ffffff', animation: 'expandWidth' },
      { type: 'text', content: '{NAME}', x: 0.05, y: 0.78, fontSize: 20, fontWeight: 600, color: '#fff', animation: 'fadeIn', delay: 0.25 },
      { type: 'text', content: '{TITLE}', x: 0.05, y: 0.85, fontSize: 13, fontWeight: 300, color: '#aaa', animation: 'fadeIn', delay: 0.4 },
    ],
  },

  // ── TITLE CARDS ──
  {
    id: 'title_chapter', category: 'title', name: 'Chapter Marker',
    duration: 2.5, premium: false,
    description: 'Chapter number with title reveal',
    colors: { primary: '#00ffc8', secondary: '#ffffff', bg: '#000000' },
    elements: [
      { type: 'text', content: 'CHAPTER {NUM}', x: 0.5, y: 0.4, fontSize: 14, fontWeight: 300, letterSpacing: 6, color: '#00ffc8', animation: 'fadeIn' },
      { type: 'shape', shape: 'line', x: 0.35, y: 0.47, width: 0.3, height: 1, color: '#333', animation: 'expandWidth', delay: 0.2 },
      { type: 'text', content: '{TITLE}', x: 0.5, y: 0.52, fontSize: 40, fontWeight: 700, color: '#fff', animation: 'fadeUp', delay: 0.4 },
    ],
  },
  {
    id: 'title_quote', category: 'title', name: 'Quote Card',
    duration: 4, premium: false,
    description: 'Elegant quote display with attribution',
    colors: { primary: '#d4af37', secondary: '#ffffff', bg: '#0a0a0a' },
    elements: [
      { type: 'text', content: '"', x: 0.15, y: 0.3, fontSize: 120, fontWeight: 300, color: '#d4af3740', animation: 'fadeIn' },
      { type: 'text', content: '{QUOTE}', x: 0.5, y: 0.48, fontSize: 28, fontWeight: 400, color: '#fff', animation: 'fadeIn', delay: 0.3 },
      { type: 'text', content: '— {AUTHOR}', x: 0.5, y: 0.62, fontSize: 16, fontWeight: 300, color: '#888', animation: 'fadeIn', delay: 0.7 },
    ],
  },

  // ── SOCIAL MEDIA TEMPLATES ──
  {
    id: 'social_tiktok', category: 'social', name: 'TikTok Style',
    duration: 0, premium: false, aspectRatio: '9:16',
    description: 'Vertical format with trending text style',
    colors: { primary: '#ff0050', secondary: '#00f2ea', bg: '#000' },
    elements: [
      { type: 'text', content: '{HOOK}', x: 0.5, y: 0.15, fontSize: 32, fontWeight: 900, color: '#fff', stroke: '#000', strokeWidth: 2 },
      { type: 'text', content: '@{USERNAME}', x: 0.5, y: 0.9, fontSize: 16, fontWeight: 600, color: '#fff' },
    ],
  },
  {
    id: 'social_reel', category: 'social', name: 'Instagram Reel',
    duration: 0, premium: false, aspectRatio: '9:16',
    description: 'Reel format with gradient overlay',
    colors: { primary: '#f77737', secondary: '#c13584', bg: 'gradient' },
    elements: [
      { type: 'shape', shape: 'gradient', x: 0.5, y: 0.85, width: 1.0, height: 0.3, colors: ['transparent', '#00000099'] },
      { type: 'text', content: '{CAPTION}', x: 0.5, y: 0.88, fontSize: 18, fontWeight: 600, color: '#fff' },
    ],
  },
  {
    id: 'social_yt_short', category: 'social', name: 'YouTube Short',
    duration: 0, premium: false, aspectRatio: '9:16',
    description: 'YouTube Short optimized layout',
    colors: { primary: '#ff0000', secondary: '#ffffff', bg: '#000' },
    elements: [
      { type: 'text', content: '{TITLE}', x: 0.5, y: 0.08, fontSize: 24, fontWeight: 800, color: '#fff', stroke: '#000', strokeWidth: 2 },
    ],
  },

  // ── CALL TO ACTION ──
  {
    id: 'cta_follow', category: 'cta', name: 'Follow Me',
    duration: 3, premium: false,
    description: 'Animated follow/subscribe call to action',
    colors: { primary: '#00ffc8', secondary: '#ffffff', bg: '#000000cc' },
    elements: [
      { type: 'shape', shape: 'roundRect', x: 0.5, y: 0.5, width: 300, height: 80, color: '#00ffc8', animation: 'scaleIn' },
      { type: 'text', content: 'FOLLOW FOR MORE', x: 0.5, y: 0.48, fontSize: 22, fontWeight: 800, color: '#000', animation: 'fadeIn', delay: 0.3 },
      { type: 'text', content: '@{USERNAME}', x: 0.5, y: 0.55, fontSize: 14, fontWeight: 500, color: '#333', animation: 'fadeIn', delay: 0.5 },
    ],
  },
  {
    id: 'cta_link', category: 'cta', name: 'Link in Bio',
    duration: 3, premium: false,
    description: 'Link in bio / swipe up prompt',
    colors: { primary: '#FF6600', secondary: '#ffffff', bg: '#000000cc' },
    elements: [
      { type: 'text', content: '👆', x: 0.5, y: 0.3, fontSize: 48, animation: 'bounceUp' },
      { type: 'text', content: 'Link in Bio', x: 0.5, y: 0.42, fontSize: 28, fontWeight: 700, color: '#fff', animation: 'fadeIn', delay: 0.2 },
      { type: 'text', content: '{URL}', x: 0.5, y: 0.52, fontSize: 16, fontWeight: 400, color: '#FF6600', animation: 'fadeIn', delay: 0.4 },
    ],
  },

  // ── OVERLAYS ──
  {
    id: 'overlay_countdown', category: 'overlay', name: 'Countdown Timer',
    duration: 10, premium: false,
    description: 'Countdown overlay for stream/video starts',
    colors: { primary: '#00ffc8', secondary: '#ffffff', bg: 'transparent' },
    elements: [
      { type: 'text', content: 'Starting in', x: 0.5, y: 0.4, fontSize: 20, fontWeight: 300, color: '#aaa' },
      { type: 'timer', content: '{COUNTDOWN}', x: 0.5, y: 0.5, fontSize: 72, fontWeight: 900, color: '#00ffc8' },
    ],
  },
  {
    id: 'overlay_watermark', category: 'overlay', name: 'Corner Watermark',
    duration: 0, premium: false,
    description: 'Persistent corner logo/text watermark',
    colors: { primary: '#ffffff40', secondary: 'transparent', bg: 'transparent' },
    elements: [
      { type: 'text', content: '{WATERMARK}', x: 0.92, y: 0.05, fontSize: 14, fontWeight: 600, color: '#ffffff40' },
    ],
  },
];

/**
 * Template Library Panel UI
 */
export const TemplateLibraryPanel = ({
  onApplyTemplate,
  onPreviewTemplate,
  tier = 'free',
}) => {
  const [activeCategory, setActiveCategory] = useState('intro');
  const [searchTerm, setSearchTerm] = useState('');
  const [customValues, setCustomValues] = useState({
    CHANNEL_NAME: 'My Channel',
    TAGLINE: 'Creating amazing content',
    NAME: 'John Doe',
    TITLE: 'Video Creator',
    HEADLINE: 'Breaking News',
    QUOTE: 'Creativity is intelligence having fun.',
    AUTHOR: 'Albert Einstein',
    USERNAME: 'myhandle',
    HOOK: 'You won\'t believe this...',
    CAPTION: 'Check this out!',
    URL: 'streampirex.com',
    WATERMARK: 'StreamPireX',
    NUM: '1',
    SOCIAL_LINKS: '@twitter • @instagram • @tiktok',
  });

  const filteredTemplates = useMemo(() => {
    return VIDEO_TEMPLATES.filter(t => {
      const matchesCategory = t.category === activeCategory;
      const matchesSearch = !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const canUse = (template) => !template.premium || tier === 'pro' || tier === 'creator';

  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: 10, fontSize: '0.7rem', maxHeight: 500, overflow: 'auto' }}>
      <div style={{ fontWeight: 700, color: S.accent, marginBottom: 8 }}>
        📚 Template Library
      </div>

      {/* Search */}
      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search templates..."
        style={{
          width: '100%', background: S.input, border: `1px solid ${S.border}`,
          borderRadius: 4, color: S.text, padding: '4px 8px', fontSize: '0.6rem', marginBottom: 8,
        }} />

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {TEMPLATE_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
            background: activeCategory === cat.id ? `${S.accent}20` : S.input,
            color: activeCategory === cat.id ? S.accent : S.dim,
            border: `1px solid ${activeCategory === cat.id ? S.accent : S.border}`,
            borderRadius: 4, padding: '2px 6px', fontSize: '0.55rem', cursor: 'pointer', fontWeight: 600,
          }}>
            {cat.icon} {cat.name.replace(/^. /, '')}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {filteredTemplates.map(template => (
          <div key={template.id} style={{
            background: S.input, borderRadius: 6, padding: 8, cursor: 'pointer',
            border: `1px solid ${S.border}`, transition: 'all 0.15s', position: 'relative',
          }}
            onClick={() => canUse(template) && onPreviewTemplate && onPreviewTemplate(template)}
            onDoubleClick={() => canUse(template) && onApplyTemplate && onApplyTemplate(template, customValues)}
          >
            {template.premium && (
              <div style={{
                position: 'absolute', top: 4, right: 4, fontSize: '0.5rem',
                background: '#d4af3730', color: '#d4af37', padding: '1px 4px', borderRadius: 3,
              }}>
                ⭐ PRO
              </div>
            )}

            {/* Preview swatch */}
            <div style={{
              width: '100%', height: 50, borderRadius: 4, marginBottom: 6,
              background: template.colors.bg === 'gradient'
                ? `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
                : template.colors.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${S.border}`,
            }}>
              <span style={{ color: template.colors.primary, fontSize: '0.7rem', fontWeight: 700 }}>
                {template.name}
              </span>
            </div>

            <div style={{ fontWeight: 600, color: S.text, fontSize: '0.6rem' }}>{template.name}</div>
            <div style={{ color: S.dim, fontSize: '0.5rem', marginTop: 2 }}>{template.description}</div>
            {template.duration > 0 && (
              <div style={{ color: S.dim, fontSize: '0.45rem', marginTop: 2 }}>{template.duration}s</div>
            )}
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div style={{ color: S.dim, textAlign: 'center', padding: 20 }}>
          No templates found for "{searchTerm}"
        </div>
      )}

      <div style={{ fontSize: '0.5rem', color: S.dim, marginTop: 8, textAlign: 'center' }}>
        Click to preview • Double-click to apply
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// 5. AI SCENE DETECTION (Auto-split clips at scene changes)
// ═══════════════════════════════════════════════════════════════════════════════
// Detects scene cuts by comparing consecutive frame histograms.
// Uses color histogram difference + luminance discontinuity.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a compact color histogram from a canvas context.
 * Returns a normalized histogram with 64 bins (4 per channel RGB + lum).
 */
export const computeFrameHistogram = (ctx, width, height) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const bins = 16; // per channel
  const hist = new Float32Array(bins * 4); // R + G + B + Lum
  const step = 4; // sample every 4th pixel for speed
  let count = 0;

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    hist[Math.min(bins - 1, Math.floor(r / 256 * bins))]++;
    hist[bins + Math.min(bins - 1, Math.floor(g / 256 * bins))]++;
    hist[bins * 2 + Math.min(bins - 1, Math.floor(b / 256 * bins))]++;
    hist[bins * 3 + Math.min(bins - 1, Math.floor(lum / 256 * bins))]++;
    count++;
  }

  // Normalize
  if (count > 0) {
    for (let i = 0; i < hist.length; i++) hist[i] /= count;
  }

  return hist;
};

/**
 * Compare two histograms using chi-squared distance.
 * Higher value = more different.
 */
export const histogramDistance = (h1, h2) => {
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    const sum = h1[i] + h2[i];
    if (sum > 0) {
      dist += ((h1[i] - h2[i]) ** 2) / sum;
    }
  }
  return dist;
};

/**
 * Detect scene changes in a video by analyzing frame histogram differences.
 * Returns array of timestamps where cuts occur.
 *
 * @param videoElement - HTML video element
 * @param options - Detection options
 * @returns Promise<{ scenes: [{start, end, duration}], cuts: [time] }>
 */
export const detectScenes = async (videoElement, options = {}) => {
  const {
    sensitivity = 0.5,       // 0 = less sensitive, 1 = more sensitive
    minSceneDuration = 1.0,  // Minimum scene length in seconds
    sampleInterval = 0.25,   // Seconds between samples
    maxScenes = 100,         // Maximum number of scenes
    thumbnailWidth = 160,    // Thumbnail width for analysis
    onProgress = null,       // Progress callback
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
  canvas.width = thumbnailWidth;
  canvas.height = Math.round(thumbnailWidth / aspectRatio);

  const duration = videoElement.duration;
  const threshold = 0.3 - sensitivity * 0.25; // Lower = more sensitive
  const cuts = [];
  let prevHist = null;
  let prevTime = 0;

  const seekToTime = (time) => new Promise((resolve) => {
    videoElement.currentTime = time;
    const handler = () => { videoElement.removeEventListener('seeked', handler); resolve(); };
    videoElement.addEventListener('seeked', handler);
  });

  for (let time = 0; time < duration; time += sampleInterval) {
    await seekToTime(time);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const hist = computeFrameHistogram(ctx, canvas.width, canvas.height);

    if (prevHist) {
      const dist = histogramDistance(prevHist, hist);
      if (dist > threshold && time - prevTime >= minSceneDuration && cuts.length < maxScenes) {
        cuts.push(time);
        prevTime = time;
      }
    }

    prevHist = hist;
    if (onProgress) onProgress(time / duration);
  }

  // Build scene list
  const scenes = [];
  const allCuts = [0, ...cuts, duration];
  for (let i = 0; i < allCuts.length - 1; i++) {
    scenes.push({
      start: allCuts[i],
      end: allCuts[i + 1],
      duration: allCuts[i + 1] - allCuts[i],
      index: i,
    });
  }

  return { scenes, cuts };
};

/**
 * Scene Detection settings
 */
export const createSceneDetectionSettings = () => ({
  sensitivity: 0.5,
  minSceneDuration: 1.0,
  sampleInterval: 0.25,
  maxScenes: 100,
});

/**
 * Scene Detection Panel UI
 */
export const SceneDetectionPanel = ({ clipId, scenes = [], isAnalyzing = false, progress = 0, onAnalyze, onSplitAtScenes, onJumpToScene, settings = {}, onSettingsChange }) => {
  const s = { ...createSceneDetectionSettings(), ...settings };

  return (
    <div style={{ background: S.bg, borderRadius: 8, padding: 10, fontSize: '0.7rem' }}>
      <div style={{ fontWeight: 700, color: S.accent, marginBottom: 8 }}>
        🎬 AI Scene Detection
      </div>

      {/* Settings */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ marginBottom: 6 }}>
          <label style={{ color: S.dim, fontSize: '0.6rem' }}>
            Sensitivity: {Math.round(s.sensitivity * 100)}%
          </label>
          <input type="range" min="0" max="100" value={Math.round(s.sensitivity * 100)}
            onChange={e => onSettingsChange && onSettingsChange({ ...s, sensitivity: parseInt(e.target.value) / 100 })}
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={{ color: S.dim, fontSize: '0.6rem' }}>
            Min Scene Length: {s.minSceneDuration}s
          </label>
          <input type="range" min="5" max="50" value={s.minSceneDuration * 10}
            onChange={e => onSettingsChange && onSettingsChange({ ...s, minSceneDuration: parseInt(e.target.value) / 10 })}
            style={{ width: '100%' }} />
        </div>
      </div>

      {/* Analyze button */}
      <button onClick={onAnalyze} disabled={isAnalyzing} style={{
        width: '100%', background: isAnalyzing ? S.input : `${S.accent}20`, color: isAnalyzing ? S.dim : S.accent,
        border: `1px solid ${isAnalyzing ? S.border : `${S.accent}40`}`,
        borderRadius: 6, padding: '8px 0', fontSize: '0.65rem', cursor: isAnalyzing ? 'not-allowed' : 'pointer',
        fontWeight: 700, marginBottom: 8,
      }}>
        {isAnalyzing ? `🔄 Analyzing... ${Math.round(progress * 100)}%` : '🔍 Detect Scenes'}
      </button>

      {/* Progress bar */}
      {isAnalyzing && (
        <div style={{ background: S.input, borderRadius: 4, height: 4, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${progress * 100}%`, height: '100%', background: S.accent,
            transition: 'width 0.3s ease', borderRadius: 4,
          }} />
        </div>
      )}

      {/* Scene list */}
      {scenes.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: S.text, fontWeight: 600 }}>{scenes.length} scenes detected</span>
            <button onClick={onSplitAtScenes} style={{
              background: `${S.accentOrange}20`, color: S.accentOrange, border: `1px solid ${S.accentOrange}40`,
              borderRadius: 4, padding: '2px 8px', fontSize: '0.55rem', cursor: 'pointer', fontWeight: 600,
            }}>
              ✂️ Split All
            </button>
          </div>

          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {scenes.map((scene, i) => (
              <div key={i} onClick={() => onJumpToScene && onJumpToScene(scene.start)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '4px 6px', borderRadius: 4, cursor: 'pointer', marginBottom: 2,
                  background: S.input, border: `1px solid ${S.border}`,
                  transition: 'background 0.1s',
                }}>
                <span style={{ color: S.text, fontWeight: 600, fontSize: '0.6rem' }}>Scene {i + 1}</span>
                <span style={{ color: S.dim, fontSize: '0.55rem' }}>
                  {formatTime(scene.start)} → {formatTime(scene.end)} ({scene.duration.toFixed(1)}s)
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {scenes.length === 0 && !isAnalyzing && (
        <div style={{ color: S.dim, textAlign: 'center', padding: 12, fontSize: '0.6rem' }}>
          Select a clip and click "Detect Scenes" to find cut points
        </div>
      )}
    </div>
  );
};

// Time formatter helper
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};


// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  // Background Removal
  segmentForeground, applyBackgroundRemoval, createBGRemovalSettings, BackgroundRemovalPanel,
  // Motion Tracking
  trackPoint, createMotionTrack, addMotionAttachment, smoothMotionKeyframes, MotionTrackingPanel,
  // Audio Ducking
  detectVoiceSegments, generateDuckingAutomation, getDuckingVolumeAtTime,
  createAudioDuckingSettings, AudioDuckingPanel,
  // Template Library
  TEMPLATE_CATEGORIES, VIDEO_TEMPLATES, TemplateLibraryPanel,
  // Scene Detection
  computeFrameHistogram, histogramDistance, detectScenes,
  createSceneDetectionSettings, SceneDetectionPanel,
};