// =============================================================================
// ChopEngine.js — Sample chopping utilities for SamplerBeatMaker
// Transient detection, BPM grid, equal slicing, waveform drawing,
// slice preview, and pad assignment
// =============================================================================

/**
 * Detect transients in an AudioBuffer using energy-based onset detection.
 * Returns array of time positions (in seconds) where transients occur.
 */
export function detectTransients(buffer, sensitivity = 0.3, minInterval = 0.05) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const hopSize = Math.floor(sr * 0.01); // 10ms hops
  const frameSize = Math.floor(sr * 0.02); // 20ms frames
  const points = [];

  // Compute RMS energy per frame
  const energies = [];
  for (let i = 0; i < data.length - frameSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      sum += data[i + j] * data[i + j];
    }
    energies.push(Math.sqrt(sum / frameSize));
  }

  // Compute spectral flux (energy difference between frames)
  const flux = [];
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    flux.push(diff > 0 ? diff : 0); // half-wave rectify
  }

  // Adaptive threshold: mean + sensitivity * stddev
  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const variance = flux.reduce((a, b) => a + (b - mean) ** 2, 0) / flux.length;
  const stddev = Math.sqrt(variance);
  const threshold = mean + (1 - sensitivity) * 3 * stddev;

  let lastTime = -minInterval;
  for (let i = 0; i < flux.length; i++) {
    if (flux[i] > threshold) {
      const time = (i + 1) * hopSize / sr;
      if (time - lastTime >= minInterval) {
        points.push(time);
        lastTime = time;
      }
    }
  }

  // Always include start if not present
  if (points.length === 0 || points[0] > 0.05) {
    points.unshift(0);
  }

  return points;
}

/**
 * Generate equal-division chop points.
 */
export function equalChopPoints(duration, slices) {
  const points = [];
  const step = duration / slices;
  for (let i = 0; i < slices; i++) {
    points.push(i * step);
  }
  return points;
}

/**
 * Generate BPM-grid chop points (slice on every beat or subdivision).
 */
export function bpmGridChopPoints(duration, bpm, subdivision = 1) {
  const beatDur = 60 / bpm;
  const stepDur = beatDur / subdivision;
  const points = [];
  for (let t = 0; t < duration; t += stepDur) {
    points.push(t);
  }
  return points;
}

/**
 * Snap a time point to the nearest zero-crossing in the audio buffer.
 * Prevents clicks/pops at slice boundaries.
 */
export function snapToZeroCrossing(buffer, time, searchRange = 0.005) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const center = Math.floor(time * sr);
  const range = Math.floor(searchRange * sr);
  const start = Math.max(0, center - range);
  const end = Math.min(data.length - 1, center + range);

  let bestIdx = center;
  let bestDist = Infinity;

  for (let i = start; i < end - 1; i++) {
    // Zero crossing: sign change between consecutive samples
    if ((data[i] >= 0 && data[i + 1] < 0) || (data[i] < 0 && data[i + 1] >= 0)) {
      const dist = Math.abs(i - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }

  return bestIdx / sr;
}

/**
 * Generate chop points based on mode.
 */
export function generateChopPoints(buffer, mode, options = {}) {
  const {
    sensitivity = 0.3,
    slices = 8,
    bpm = 120,
    subdivision = 1,
    zeroCrossSnap = true,
    maxSlices = 32,
  } = options;

  const duration = buffer.duration;
  let points;

  switch (mode) {
    case 'transient':
      points = detectTransients(buffer, sensitivity);
      // Limit to maxSlices
      if (points.length > maxSlices) {
        // Keep most prominent ones (evenly spaced selection)
        const step = Math.floor(points.length / maxSlices);
        points = points.filter((_, i) => i % step === 0).slice(0, maxSlices);
      }
      break;

    case 'equal':
      points = equalChopPoints(duration, slices);
      break;

    case 'bpmgrid':
      points = bpmGridChopPoints(duration, bpm, subdivision);
      if (points.length > maxSlices) {
        points = points.slice(0, maxSlices);
      }
      break;

    case 'manual':
      // Manual mode starts with no auto-generated points
      points = [0];
      break;

    default:
      points = equalChopPoints(duration, slices);
  }

  // Snap to zero crossings to prevent clicks
  if (zeroCrossSnap && mode !== 'manual') {
    points = points.map(t => t === 0 ? 0 : snapToZeroCrossing(buffer, t));
  }

  // Sort and deduplicate
  points = [...new Set(points)].sort((a, b) => a - b);

  return points;
}

/**
 * Draw waveform with chop slice markers onto a canvas.
 */
export function drawChopWaveform(canvas, buffer, chopPoints = [], activeSlice = -1, options = {}) {
  if (!canvas || !buffer) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const data = buffer.getChannelData(0);
  const duration = buffer.duration;
  const step = Math.ceil(data.length / w);

  const {
    bgColor = '#0a0e14',
    waveColor = '#00ffc8',
    waveAlpha = 0.8,
    sliceColor = '#ff6600',
    sliceAlpha = 0.8,
    activeSliceColor = '#ffaa00',
    regionAlpha = 0.08,
    activeRegionAlpha = 0.15,
    centerLineColor = 'rgba(255,255,255,0.08)',
  } = options;

  // Clear
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Draw slice regions (alternating tint)
  if (chopPoints.length > 0) {
    for (let i = 0; i < chopPoints.length; i++) {
      const startX = (chopPoints[i] / duration) * w;
      const endX = i < chopPoints.length - 1
        ? (chopPoints[i + 1] / duration) * w
        : w;

      if (i === activeSlice) {
        ctx.fillStyle = `rgba(255, 170, 0, ${activeRegionAlpha})`;
      } else if (i % 2 === 0) {
        ctx.fillStyle = `rgba(0, 255, 200, ${regionAlpha})`;
      } else {
        ctx.fillStyle = `rgba(0, 136, 255, ${regionAlpha})`;
      }
      ctx.fillRect(startX, 0, endX - startX, h);
    }
  }

  // Center line
  ctx.strokeStyle = centerLineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Waveform
  ctx.globalAlpha = waveAlpha;
  ctx.beginPath();
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x++) {
    const si = x * step;
    let min = 1, max = -1;
    for (let j = 0; j < step && si + j < data.length; j++) {
      const v = data[si + j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = (1 - max) * h / 2;
    const y2 = (1 - min) * h / 2;
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Slice markers
  ctx.lineWidth = 1.5;
  for (let i = 0; i < chopPoints.length; i++) {
    const x = (chopPoints[i] / duration) * w;
    const isActive = i === activeSlice;

    ctx.strokeStyle = isActive ? activeSliceColor : sliceColor;
    ctx.globalAlpha = isActive ? 1 : sliceAlpha;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    // Slice number label
    ctx.globalAlpha = isActive ? 1 : 0.7;
    ctx.fillStyle = isActive ? activeSliceColor : sliceColor;
    ctx.font = '10px monospace';
    ctx.fillText(`${i + 1}`, x + 3, 12);
  }
  ctx.globalAlpha = 1;
}

/**
 * Get the time range for a specific slice.
 * Returns { start, end, duration } in seconds.
 */
export function getSliceRange(chopPoints, sliceIndex, totalDuration) {
  if (sliceIndex < 0 || sliceIndex >= chopPoints.length) return null;
  const start = chopPoints[sliceIndex];
  const end = sliceIndex < chopPoints.length - 1
    ? chopPoints[sliceIndex + 1]
    : totalDuration;
  return { start, end, duration: end - start };
}

/**
 * Extract a slice from an AudioBuffer, returning a new AudioBuffer.
 */
export function extractSlice(audioContext, sourceBuffer, startTime, endTime) {
  const sr = sourceBuffer.sampleRate;
  const channels = sourceBuffer.numberOfChannels;
  const startSample = Math.floor(startTime * sr);
  const endSample = Math.min(Math.floor(endTime * sr), sourceBuffer.length);
  const length = endSample - startSample;

  if (length <= 0) return null;

  const newBuffer = audioContext.createBuffer(channels, length, sr);
  for (let ch = 0; ch < channels; ch++) {
    const srcData = sourceBuffer.getChannelData(ch);
    const dstData = newBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      dstData[i] = srcData[startSample + i];
    }
  }
  return newBuffer;
}

/**
 * Assign all chop slices to pads starting from startPad.
 * Returns array of { padIndex, buffer, name } objects.
 */
export function assignSlicesToPads(audioContext, sourceBuffer, chopPoints, options = {}) {
  const {
    startPad = 0,
    maxPads = 16,
    namePrefix = 'Slice',
    sourceName = 'Sample',
  } = options;

  const results = [];
  const duration = sourceBuffer.duration;
  const sliceCount = Math.min(chopPoints.length, maxPads - startPad);

  for (let i = 0; i < sliceCount; i++) {
    const range = getSliceRange(chopPoints, i, duration);
    if (!range) continue;

    const buffer = extractSlice(audioContext, sourceBuffer, range.start, range.end);
    if (!buffer) continue;

    results.push({
      padIndex: startPad + i,
      buffer,
      name: `${namePrefix} ${i + 1}`,
      trimStart: 0,
      trimEnd: buffer.duration,
    });
  }

  return results;
}

/**
 * Get which slice index was clicked at a given X position on the canvas.
 */
export function getSliceAtPosition(x, canvasWidth, chopPoints, totalDuration) {
  const time = (x / canvasWidth) * totalDuration;
  for (let i = chopPoints.length - 1; i >= 0; i--) {
    if (time >= chopPoints[i]) return i;
  }
  return 0;
}

/**
 * Add a manual chop point at a given time.
 */
export function addManualChopPoint(chopPoints, time, buffer, zeroCrossSnap = true) {
  let t = time;
  if (zeroCrossSnap && buffer) {
    t = snapToZeroCrossing(buffer, time);
  }
  const newPoints = [...chopPoints, t];
  return [...new Set(newPoints)].sort((a, b) => a - b);
}

/**
 * Remove a chop point by index.
 */
export function removeChopPoint(chopPoints, index) {
  if (index <= 0) return chopPoints; // Don't remove the first point (0)
  return chopPoints.filter((_, i) => i !== index);
}