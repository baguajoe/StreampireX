// =============================================================================
// trackFactory.js — Shared track factory for Recording Studio + ArrangerView.
// =============================================================================
// Single source of truth for the default track shape. Every track must include
// a fully-initialized `effects` object so insert plugins (including SPX) can be
// added without runtime crashes (see audit Bugs #1, #2). Track creators outside
// of this module previously omitted `effects`, which made `updateEffect` blow
// up with "Cannot read properties of undefined (reading '<plugin-key>')".
// =============================================================================

const uid = () => globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Canonical RecordingStudio palette. Kept in sync with the local TRACK_COLORS
// in pages/RecordingStudio.js. ArrangerView keeps its own palette for region
// colors and passes `color` via `overrides` when it wants to override the default.
const TRACK_COLORS = [
  "#34c759","#ff9500","#007aff","#af52de","#ff3b30","#5ac8fa","#ff2d55","#ffcc00",
  "#30d158","#ff6b35","#0a84ff","#bf5af2","#ff453a","#64d2ff","#ff375f","#ffd60a",
  "#32d74b","#ff8c00","#0066cc","#9b59b6","#e74c3c","#2ecc71","#e91e63","#f39c12",
  "#27ae60","#d35400","#2980b9","#8e44ad","#c0392b","#16a085","#e84393","#fdcb6e",
];

export const DEFAULT_EFFECTS = () => ({
  eq:            { lowGain: 0, midGain: 0, midFreq: 1000, highGain: 0, enabled: false },
  compressor:    { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, knee: 30, enabled: false },
  reverb:        { mix: 0.2, decay: 2.0, enabled: false },
  delay:         { time: 0.3, feedback: 0.3, mix: 0.2, enabled: false },
  distortion:    { amount: 0, enabled: false },
  filter:        { type: "lowpass", frequency: 20000, Q: 1, enabled: false },
  limiter:       { threshold: -1, knee: 0, ratio: 20, attack: 0.001, release: 0.05, enabled: false },
  gate:          { threshold: -40, attack: 0.001, release: 0.05, enabled: false },
  deesser:       { frequency: 6000, threshold: -20, ratio: 8, enabled: false },
  chorus:        { rate: 1.5, depth: 0.002, mix: 0.3, enabled: false },
  flanger:       { rate: 0.3, depth: 0.003, feedback: 0.5, mix: 0.3, enabled: false },
  phaser:        { rate: 0.5, depth: 1000, baseFreq: 1000, Q: 5, stages: 4, mix: 0.3, enabled: false },
  tremolo:       { rate: 4, depth: 0.5, enabled: false },
  stereoWidener: { width: 0.5, enabled: false },
  bitcrusher:    { bits: 8, sampleRateReduce: 1, enabled: false },
  exciter:       { amount: 30, frequency: 3000, mix: 0.2, enabled: false },
  tapeSaturation:{ drive: 0.3, warmth: 0.5, enabled: false },
  gainUtility:   { gain: 0, phaseInvert: false, monoSum: false, enabled: false },
});

// DEFAULT_TRACK(index, type, overrides)
//   index    — 0-based track index (used for default name + color rotation)
//   type     — "audio" | "midi" | "instrument" | "bus" | "aux" | "vca" | "fx" | "group"
//   overrides — partial track object spread last so callers can supply audio_url,
//               audioBuffer, regions, color, etc. without losing the default
//               `effects: DEFAULT_EFFECTS()` field.
export const DEFAULT_TRACK = (i, type = "audio", overrides = {}) => ({
  id: uid(),
  name: `${type === "midi" ? "MIDI" : type === "bus" ? "Bus" : type === "aux" ? "Aux" : "Audio"} ${i + 1}`,
  trackType: type,
  instrument: type === "midi" ? { program: 0, name: "Acoustic Grand" } : null,
  volume: 1.0, pan: 0, muted: false, solo: false, armed: false,
  audio_url: null, color: TRACK_COLORS[i % TRACK_COLORS.length],
  audioBuffer: null, effects: DEFAULT_EFFECTS(), regions: [],
  ...overrides,
});
