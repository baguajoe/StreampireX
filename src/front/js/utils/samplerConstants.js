// =============================================================================
// samplerConstants.js — shared constants for the sampler family
// =============================================================================
// Architectural #13a: previously these lived in useSamplerEngine.js, which is
// otherwise dead code (the engine was reimplemented inline in SamplerBeatMaker).
// Hoisting just the constants lets us delete the old hook without touching
// runtime behaviour.

export const PAD_COUNT = 16;
export const STEP_COUNTS = [8, 16, 32, 64];
export const DEFAULT_BPM = 140;
export const PAD_KEY_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'];
export const CHROMATIC_KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const PAD_COLORS = [
  '#ff4444','#ff6b35','#ffaa00','#ffdd00',
  '#aaff00','#00ff88','#00ddff','#0088ff',
  '#4444ff','#8844ff','#cc44ff','#ff44cc',
  '#ff4488','#ff8888','#88ffaa','#88ddff',
];

export const FORMAT_INFO = {
  wav:  { ext: 'wav',  label: 'WAV (Lossless)', mime: 'audio/wav'  },
  mp3:  { ext: 'mp3',  label: 'MP3 (Compressed)', mime: 'audio/mpeg' },
  webm: { ext: 'webm', label: 'WebM',           mime: 'audio/webm' },
};

export const CHOP_MODES = ['transient', 'bpmgrid', 'equal', 'manual'];
