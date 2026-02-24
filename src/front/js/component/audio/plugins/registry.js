// =============================================================================
// registry.js — Plugin Registry for StreamPireX DAW
// =============================================================================
// Central catalog of all available plugins.
// Each entry defines: id, name, version, type, processor config, parameter
// definitions, default preset, and UI component mapping.
//
// Plugin types:
//   - "native"  → built with Web Audio API native nodes (GainNode, BiquadFilter, etc.)
//   - "worklet" → built with AudioWorkletProcessor for custom DSP
//
// To add a new plugin:
//   1. Create the plugin class in plugins/
//   2. Add its definition here
//   3. (Optional) Add its UI component mapping
// =============================================================================

const pluginRegistry = {
  // ═══════════════════════════════════════════════════════════════
  // GAIN / TRIM
  // ═══════════════════════════════════════════════════════════════
  'gain': {
    id: 'gain',
    name: 'Gain / Trim',
    version: '1.0.0',
    category: 'utility',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'gainDb', label: 'Gain', type: 'float', min: -48, max: 24, default: 0, unit: 'dB', step: 0.1 },
      { id: 'phase', label: 'Phase Invert', type: 'bool', default: false },
    ],
    ui: { component: 'GainPluginUI', width: 200, height: 120 },
    factoryPresets: [
      { name: 'Unity', params: { gainDb: 0, phase: false } },
      { name: '+3 dB', params: { gainDb: 3, phase: false } },
      { name: '-6 dB', params: { gainDb: -6, phase: false } },
      { name: '-12 dB', params: { gainDb: -12, phase: false } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3-BAND EQ
  // ═══════════════════════════════════════════════════════════════
  'eq_3band': {
    id: 'eq_3band',
    name: '3-Band EQ',
    version: '1.0.0',
    category: 'eq',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'lowFreq', label: 'Low Freq', type: 'float', min: 30, max: 500, default: 150, unit: 'Hz', step: 1 },
      { id: 'lowGain', label: 'Low Gain', type: 'float', min: -18, max: 18, default: 0, unit: 'dB', step: 0.1 },
      { id: 'midFreq', label: 'Mid Freq', type: 'float', min: 200, max: 8000, default: 1000, unit: 'Hz', step: 1 },
      { id: 'midGain', label: 'Mid Gain', type: 'float', min: -18, max: 18, default: 0, unit: 'dB', step: 0.1 },
      { id: 'midQ', label: 'Mid Q', type: 'float', min: 0.1, max: 18, default: 1.4, unit: '', step: 0.1 },
      { id: 'highFreq', label: 'High Freq', type: 'float', min: 2000, max: 20000, default: 8000, unit: 'Hz', step: 1 },
      { id: 'highGain', label: 'High Gain', type: 'float', min: -18, max: 18, default: 0, unit: 'dB', step: 0.1 },
    ],
    ui: { component: 'EQ3BandUI', width: 360, height: 220 },
    factoryPresets: [
      { name: 'Flat', params: { lowFreq: 150, lowGain: 0, midFreq: 1000, midGain: 0, midQ: 1.4, highFreq: 8000, highGain: 0 } },
      { name: 'Vocal Bright', params: { lowFreq: 120, lowGain: -2, midFreq: 3500, midGain: 3, midQ: 1.2, highFreq: 10000, highGain: 4 } },
      { name: 'Bass Boost', params: { lowFreq: 100, lowGain: 6, midFreq: 800, midGain: -2, midQ: 1.0, highFreq: 6000, highGain: 0 } },
      { name: 'High Cut', params: { lowFreq: 150, lowGain: 0, midFreq: 1000, midGain: 0, midQ: 1.4, highFreq: 4000, highGain: -12 } },
      { name: 'Scoop', params: { lowFreq: 200, lowGain: 3, midFreq: 1000, midGain: -6, midQ: 0.8, highFreq: 8000, highGain: 3 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPRESSOR
  // ═══════════════════════════════════════════════════════════════
  'compressor': {
    id: 'compressor',
    name: 'Compressor',
    version: '1.0.0',
    category: 'dynamics',
    type: 'insert',
    processor: { kind: 'worklet', workletName: 'spx-compressor', moduleUrl: null }, // inline registration
    params: [
      { id: 'threshold', label: 'Threshold', type: 'float', min: -60, max: 0, default: -18, unit: 'dB', step: 0.1 },
      { id: 'ratio', label: 'Ratio', type: 'float', min: 1, max: 20, default: 4, unit: ':1', step: 0.1 },
      { id: 'attack', label: 'Attack', type: 'float', min: 0.1, max: 200, default: 10, unit: 'ms', step: 0.1 },
      { id: 'release', label: 'Release', type: 'float', min: 10, max: 2000, default: 150, unit: 'ms', step: 1 },
      { id: 'knee', label: 'Knee', type: 'float', min: 0, max: 30, default: 6, unit: 'dB', step: 0.1 },
      { id: 'makeup', label: 'Makeup', type: 'float', min: 0, max: 24, default: 0, unit: 'dB', step: 0.1 },
    ],
    ui: { component: 'CompressorUI', width: 380, height: 240 },
    factoryPresets: [
      { name: 'Gentle', params: { threshold: -20, ratio: 2, attack: 20, release: 200, knee: 12, makeup: 2 } },
      { name: 'Vocal', params: { threshold: -18, ratio: 3.5, attack: 8, release: 120, knee: 6, makeup: 4 } },
      { name: 'Drum Bus', params: { threshold: -12, ratio: 4, attack: 1, release: 80, knee: 3, makeup: 3 } },
      { name: 'Limiter-ish', params: { threshold: -6, ratio: 15, attack: 0.5, release: 50, knee: 0, makeup: 0 } },
      { name: 'Parallel Crush', params: { threshold: -30, ratio: 8, attack: 0.5, release: 60, knee: 0, makeup: 10 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // REVERB (Convolution)
  // ═══════════════════════════════════════════════════════════════
  'reverb': {
    id: 'reverb',
    name: 'Reverb',
    version: '1.0.0',
    category: 'spatial',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'mix', label: 'Mix', type: 'float', min: 0, max: 100, default: 25, unit: '%', step: 1 },
      { id: 'decay', label: 'Decay', type: 'float', min: 0.2, max: 8, default: 2.0, unit: 's', step: 0.1 },
      { id: 'preDelay', label: 'Pre-Delay', type: 'float', min: 0, max: 100, default: 10, unit: 'ms', step: 1 },
      { id: 'damping', label: 'Damping', type: 'float', min: 200, max: 20000, default: 8000, unit: 'Hz', step: 100 },
    ],
    ui: { component: 'ReverbUI', width: 300, height: 180 },
    factoryPresets: [
      { name: 'Small Room', params: { mix: 15, decay: 0.6, preDelay: 5, damping: 6000 } },
      { name: 'Plate', params: { mix: 25, decay: 1.8, preDelay: 10, damping: 10000 } },
      { name: 'Large Hall', params: { mix: 35, decay: 4.0, preDelay: 30, damping: 5000 } },
      { name: 'Ambient Wash', params: { mix: 50, decay: 6.0, preDelay: 50, damping: 3000 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DELAY
  // ═══════════════════════════════════════════════════════════════
  'delay': {
    id: 'delay',
    name: 'Delay',
    version: '1.0.0',
    category: 'spatial',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'time', label: 'Time', type: 'float', min: 10, max: 2000, default: 375, unit: 'ms', step: 1 },
      { id: 'feedback', label: 'Feedback', type: 'float', min: 0, max: 95, default: 40, unit: '%', step: 1 },
      { id: 'mix', label: 'Mix', type: 'float', min: 0, max: 100, default: 25, unit: '%', step: 1 },
      { id: 'filterCutoff', label: 'Filter', type: 'float', min: 200, max: 20000, default: 8000, unit: 'Hz', step: 100 },
    ],
    ui: { component: 'DelayUI', width: 300, height: 180 },
    factoryPresets: [
      { name: 'Slapback', params: { time: 80, feedback: 10, mix: 30, filterCutoff: 12000 } },
      { name: '1/4 Note', params: { time: 500, feedback: 35, mix: 25, filterCutoff: 8000 } },
      { name: 'Dotted 1/8', params: { time: 375, feedback: 40, mix: 20, filterCutoff: 6000 } },
      { name: 'Dub Echo', params: { time: 600, feedback: 65, mix: 35, filterCutoff: 3000 } },
      { name: 'Ping Pong', params: { time: 250, feedback: 50, mix: 30, filterCutoff: 10000 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LIMITER
  // ═══════════════════════════════════════════════════════════════
  'limiter': {
    id: 'limiter',
    name: 'Limiter',
    version: '1.0.0',
    category: 'dynamics',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'ceiling', label: 'Ceiling', type: 'float', min: -12, max: 0, default: -0.3, unit: 'dB', step: 0.1 },
      { id: 'release', label: 'Release', type: 'float', min: 1, max: 500, default: 50, unit: 'ms', step: 1 },
      { id: 'drive', label: 'Drive', type: 'float', min: 0, max: 12, default: 0, unit: 'dB', step: 0.1 },
    ],
    ui: { component: 'LimiterUI', width: 260, height: 140 },
    factoryPresets: [
      { name: 'Transparent', params: { ceiling: -0.3, release: 50, drive: 0 } },
      { name: 'Loud', params: { ceiling: -0.1, release: 30, drive: 4 } },
      { name: 'Brick Wall', params: { ceiling: -0.1, release: 10, drive: 8 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DE-ESSER (bonus — used by VocalProcessor)
  // ═══════════════════════════════════════════════════════════════
  'deesser': {
    id: 'deesser',
    name: 'De-Esser',
    version: '1.0.0',
    category: 'dynamics',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'frequency', label: 'Frequency', type: 'float', min: 2000, max: 16000, default: 6500, unit: 'Hz', step: 100 },
      { id: 'threshold', label: 'Threshold', type: 'float', min: -40, max: 0, default: -25, unit: 'dB', step: 0.5 },
      { id: 'reduction', label: 'Reduction', type: 'float', min: 0, max: 18, default: 6, unit: 'dB', step: 0.5 },
    ],
    ui: { component: 'DeEsserUI', width: 260, height: 140 },
    factoryPresets: [
      { name: 'Gentle', params: { frequency: 7000, threshold: -20, reduction: 3 } },
      { name: 'Standard', params: { frequency: 6500, threshold: -25, reduction: 6 } },
      { name: 'Aggressive', params: { frequency: 5500, threshold: -30, reduction: 12 } },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SATURATION
  // ═══════════════════════════════════════════════════════════════
  'saturation': {
    id: 'saturation',
    name: 'Saturation',
    version: '1.0.0',
    category: 'distortion',
    type: 'insert',
    processor: { kind: 'native' },
    params: [
      { id: 'drive', label: 'Drive', type: 'float', min: 0, max: 100, default: 20, unit: '%', step: 1 },
      { id: 'mix', label: 'Mix', type: 'float', min: 0, max: 100, default: 50, unit: '%', step: 1 },
      { id: 'tone', label: 'Tone', type: 'float', min: 200, max: 20000, default: 8000, unit: 'Hz', step: 100 },
    ],
    ui: { component: 'SaturationUI', width: 260, height: 140 },
    factoryPresets: [
      { name: 'Warm', params: { drive: 15, mix: 30, tone: 6000 } },
      { name: 'Tape', params: { drive: 30, mix: 50, tone: 8000 } },
      { name: 'Distorted', params: { drive: 70, mix: 60, tone: 4000 } },
    ],
  },
};

// ── Helpers ──
export const getPluginDef = (pluginId) => pluginRegistry[pluginId] || null;
export const getAllPlugins = () => Object.values(pluginRegistry);
export const getPluginsByCategory = (category) => Object.values(pluginRegistry).filter(p => p.category === category);
export const getCategories = () => [...new Set(Object.values(pluginRegistry).map(p => p.category))];

export default pluginRegistry;