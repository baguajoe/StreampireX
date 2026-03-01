// =============================================================================
// AIEngine.js — Local Audio Intelligence (browser DSP, zero API cost)
// AI Sample Suggestion, AI Chop Assistant, Vocal → Beat Pad Mapper
// =============================================================================

function spectralCentroid(buffer) {
  if (!buffer) return 0;
  const data = buffer.getChannelData(0);
  const N = Math.min(data.length, 8192);
  let crossings = 0;
  for (let i = 1; i < N; i++) {
    if ((data[i] >= 0) !== (data[i - 1] >= 0)) crossings++;
  }
  return (crossings / N) * buffer.sampleRate;
}

function rmsEnergy(buffer) {
  if (!buffer) return 0;
  const data = buffer.getChannelData(0);
  const N = Math.min(data.length, 16384);
  let sum = 0;
  for (let i = 0; i < N; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / N);
}

function attackTime(buffer) {
  if (!buffer) return 999;
  const data = buffer.getChannelData(0);
  const N = Math.min(data.length, buffer.sampleRate);
  let peak = 0, peakIdx = 0;
  for (let i = 0; i < N; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) { peak = abs; peakIdx = i; }
  }
  const thresh = peak * 0.1;
  let startIdx = 0;
  for (let i = 0; i < peakIdx; i++) {
    if (Math.abs(data[i]) >= thresh) { startIdx = i; break; }
  }
  return ((peakIdx - startIdx) / buffer.sampleRate) * 1000;
}

function classifyPad(buffer) {
  if (!buffer) return null;
  const cent = spectralCentroid(buffer);
  const atk = attackTime(buffer);
  const d = buffer.duration;

  if (cent < 800 && atk < 20 && d < 1.5) return { type: 'kick', confidence: 0.8 };
  if (cent < 400 && d > 0.5) return { type: 'sub', confidence: 0.7 };
  if (cent >= 800 && cent < 4000 && atk < 15 && d < 0.8) return { type: 'snare', confidence: 0.75 };
  if (cent >= 2000 && cent < 6000 && atk >= 5 && atk < 40 && d < 0.6) return { type: 'clap', confidence: 0.65 };
  if (cent >= 5000 && d < 0.3) return { type: 'hihat_closed', confidence: 0.8 };
  if (cent >= 5000 && d >= 0.3 && d < 1.0) return { type: 'hihat_open', confidence: 0.75 };
  if (cent >= 6000 && d >= 0.5) return { type: 'cymbal', confidence: 0.6 };
  if (atk < 20 && d < 0.5) return { type: 'perc', confidence: 0.5 };
  if (d > 1.0) return { type: 'melodic', confidence: 0.5 };
  return { type: 'unknown', confidence: 0.3 };
}

const ESSENTIAL_KIT = [
  { type: 'kick', label: 'Kick', priority: 1, desc: 'Low-frequency foundation' },
  { type: 'snare', label: 'Snare', priority: 2, desc: 'Backbeat crack' },
  { type: 'hihat_closed', label: 'Closed Hi-Hat', priority: 3, desc: 'Rhythm keeper' },
  { type: 'hihat_open', label: 'Open Hi-Hat', priority: 4, desc: 'Sustained accent' },
  { type: 'clap', label: 'Clap', priority: 5, desc: 'Snare accent' },
  { type: 'perc', label: 'Percussion', priority: 6, desc: 'Shaker, tambourine' },
  { type: 'cymbal', label: 'Crash/Ride', priority: 7, desc: 'Transition accent' },
  { type: 'sub', label: '808/Sub', priority: 8, desc: 'Sub-bass tone' },
];

export function aiSampleSuggestion(pads) {
  const loaded = pads.map((pad, i) => ({ index: i, classification: classifyPad(pad.buffer) })).filter(p => p.classification);
  const presentTypes = new Set(loaded.map(p => p.classification.type));
  const missing = ESSENTIAL_KIT.filter(k => !presentTypes.has(k.type)).sort((a, b) => a.priority - b.priority);
  const analysis = loaded.map(p => ({ pad: p.index + 1, name: pads[p.index].name, detectedType: p.classification.type, confidence: Math.round(p.classification.confidence * 100) + '%' }));
  const emptyPads = pads.map((pad, i) => ({ index: i, empty: !pad.buffer })).filter(p => p.empty).map(p => p.index);
  const suggestions = missing.slice(0, emptyPads.length).map((need, i) => ({ padIndex: emptyPads[i], padNumber: emptyPads[i] + 1, suggestedType: need.type, label: need.label, description: need.desc }));
  const completeness = Math.round((presentTypes.size / ESSENTIAL_KIT.length) * 100);
  return { analysis, missing: missing.map(m => m.label), suggestions, completeness, summary: completeness >= 80 ? `Kit is ${completeness}% complete` : `Kit needs: ${missing.slice(0, 3).map(m => m.label).join(', ')}` };
}

function findTransients(buffer, sensitivity = 0.3) {
  if (!buffer) return [];
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const hop = Math.floor(sr * 0.01);
  const transients = [];
  let prevRms = 0;
  const threshold = sensitivity * 0.5;
  const minGap = Math.floor(sr * 0.05 / hop);
  for (let b = 0; b < Math.floor(data.length / hop); b++) {
    let energy = 0;
    const start = b * hop;
    for (let i = start; i < start + hop && i < data.length; i++) energy += data[i] * data[i];
    energy /= hop;
    if (energy > threshold && energy > prevRms * 3 && b > 0 && (transients.length === 0 || (b - (transients[transients.length - 1]?.hopIndex || 0)) > minGap)) {
      transients.push({ time: start / sr, strength: energy - prevRms, hopIndex: b });
    }
    prevRms = energy * 0.9 + prevRms * 0.1;
  }
  return transients;
}

export function aiChopAssistant(buffer, userBpm = 0) {
  if (!buffer) return { error: 'No buffer' };
  const duration = buffer.duration;
  const transients = findTransients(buffer, 0.3);
  const transientBpm = transients.length >= 3 ? (() => { const gaps = []; for (let i = 1; i < transients.length; i++) gaps.push(transients[i].time - transients[i - 1].time); const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length; let bpm = 60 / avg; if (bpm > 200) bpm /= 2; if (bpm < 60) bpm *= 2; return Math.round(bpm); })() : 0;
  const bpm = userBpm || transientBpm || 120;
  const beatDur = 60 / bpm;

  const boomBapChops = transients.length > 4
    ? [...transients].sort((a, b) => b.strength - a.strength).slice(0, Math.min(16, Math.floor(duration / beatDur))).sort((a, b) => a.time - b.time).map(t => t.time)
    : Array.from({ length: Math.min(8, Math.floor(duration / beatDur)) }, (_, i) => i * beatDur).filter(t => t > 0);

  const trapChops = [];
  const trapGrid = beatDur / 4;
  for (let t = trapGrid; t < duration - trapGrid * 0.5; t += trapGrid) trapChops.push(Math.round(t * 1000) / 1000);

  const lofiChops = [];
  const lofiGrid = beatDur / 2;
  for (let t = lofiGrid; t < duration - lofiGrid * 0.5; t += lofiGrid) lofiChops.push(Math.max(0, Math.round((t + (Math.random() - 0.5) * 0.02) * 1000) / 1000));

  let boomScore = 50, trapScore = 50, lofiScore = 40;
  if (bpm >= 80 && bpm <= 100) boomScore += 20;
  if (bpm >= 130 && bpm <= 160) trapScore += 25;
  if (bpm >= 70 && bpm <= 95) lofiScore += 20;
  if (transients.length > 4) boomScore += 15;
  if (transients.length / duration > 5) trapScore += 15;

  const styles = [
    { name: 'boom_bap', label: 'Boom Bap', score: boomScore, chops: boomBapChops, slices: boomBapChops.length, desc: `${boomBapChops.length} transient-based chops` },
    { name: 'trap', label: 'Trap', score: trapScore, chops: trapChops, slices: trapChops.length, desc: `${trapChops.length} tight 16th-note slices` },
    { name: 'lofi', label: 'Lo-Fi', score: lofiScore, chops: lofiChops, slices: lofiChops.length, desc: `${lofiChops.length} humanized 8th-note chops` },
  ].sort((a, b) => b.score - a.score);

  return { detectedBpm: transientBpm || null, usedBpm: bpm, duration: Math.round(duration * 100) / 100, transientCount: transients.length, styles, recommended: styles[0], summary: `Recommended: ${styles[0].label} (${styles[0].slices} slices)` };
}

export class VocalBeatMapper {
  constructor(audioContext, options = {}) {
    this.ctx = audioContext;
    this.onPadTrigger = options.onPadTrigger || (() => {});
    this.onPitchDetected = options.onPitchDetected || (() => {});
    this.analyser = null; this.stream = null; this.source = null;
    this.running = false; this.rafId = null;
    this.prevRms = 0;
    this.onsetThreshold = options.threshold || 0.08;
    this.cooldownMs = options.cooldown || 80;
    this.lastTrigger = 0;
    this.padMapping = options.padMapping || { low: 0, mid: 4, high: 8, accent: 12 };
  }
  async start() {
    if (this.running) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);
      this.running = true; this._detect();
    } catch (e) { console.error('VocalBeatMapper:', e); }
  }
  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.source) try { this.source.disconnect(); } catch (e) {}
    this.source = null; this.stream = null; this.analyser = null;
  }
  _detect() {
    if (!this.running || !this.analyser) return;
    const timeData = new Float32Array(this.analyser.frequencyBinCount);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(freqData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
    const rms = Math.sqrt(sum / timeData.length);
    const onset = rms - this.prevRms;
    const now = performance.now();
    if (onset > this.onsetThreshold && (now - this.lastTrigger) > this.cooldownMs) {
      this.lastTrigger = now;
      const sr = this.ctx.sampleRate;
      const binSize = sr / this.analyser.fftSize;
      let lowE = 0, midE = 0, highE = 0;
      for (let i = 0; i < freqData.length; i++) {
        const freq = i * binSize;
        if (freq < 500) lowE += freqData[i]; else if (freq < 3000) midE += freqData[i]; else highE += freqData[i];
      }
      const total = lowE + midE + highE || 1;
      lowE /= total; midE /= total; highE /= total;
      const velocity = Math.min(1, rms * 5);
      let padIdx;
      if (velocity > 0.8) padIdx = this.padMapping.accent;
      else if (lowE > 0.5) padIdx = this.padMapping.low;
      else if (highE > 0.4) padIdx = this.padMapping.high;
      else padIdx = this.padMapping.mid;
      this.onPadTrigger(padIdx, velocity);
      this.onPitchDetected({ lowE, midE, highE, rms, velocity, padIdx });
    }
    this.prevRms = rms * 0.7 + this.prevRms * 0.3;
    this.rafId = requestAnimationFrame(() => this._detect());
  }
  updateMapping(mapping) { this.padMapping = { ...this.padMapping, ...mapping }; }
  updateThreshold(threshold) { this.onsetThreshold = threshold; }
}

export { classifyPad, spectralCentroid, rmsEnergy, attackTime, findTransients };