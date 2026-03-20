// src/front/js/utils/color/lutUtils.js
export const LUT_PRESETS = [
  { id: 'none',        name: 'None (Bypass)' },
  { id: 'cineon',      name: 'Log Cineon' },
  { id: 'rec709',      name: 'Rec.709' },
  { id: 'slog2',       name: 'Sony SLog2' },
  { id: 'vintage',     name: 'Vintage Film' },
  { id: 'teal_orange', name: 'Teal & Orange' },
  { id: 'bleach',      name: 'Bleach Bypass' },
  { id: 'noir',        name: 'Noir B&W' },
  { id: 'fuji',        name: 'Fuji Print' },
  { id: 'kodak',       name: 'Kodak 2383' },
];

export function applyLUTMeta(id) {
  return LUT_PRESETS.find(p => p.id === id) || LUT_PRESETS[0];
}

// Apply LUT transform to RGB [0-1] values
export function applyLUTToRGB(r, g, b, lutId) {
  switch (lutId) {
    case 'cineon':
      return [Math.pow(r,1/1.7), Math.pow(g,1/1.7), Math.pow(b,1/1.7)];
    case 'rec709':
      return [
        r < 0.018 ? r*4.5 : 1.099*Math.pow(r,0.45)-0.099,
        g < 0.018 ? g*4.5 : 1.099*Math.pow(g,0.45)-0.099,
        b < 0.018 ? b*4.5 : 1.099*Math.pow(b,0.45)-0.099,
      ];
    case 'slog2':
      return [
        0.432699*Math.log10(r*155+0.037584)+0.616596,
        0.432699*Math.log10(g*155+0.037584)+0.616596,
        0.432699*Math.log10(b*155+0.037584)+0.616596,
      ];
    case 'vintage':
      return [r*0.9+0.05, g*0.95+0.02, b*0.85];
    case 'teal_orange':
      return [Math.min(1,r*1.2), g*0.95, Math.min(1,b*0.8+0.1)];
    case 'bleach':
      return [Math.min(1,r*1.1), Math.min(1,g*1.05), Math.min(1,b*0.9)];
    case 'noir':
      const lum = r*0.299+g*0.587+b*0.114;
      return [lum, lum, lum];
    case 'fuji':
      return [Math.min(1,r*1.05), Math.min(1,g*1.02), Math.min(1,b*0.98)];
    case 'kodak':
      return [Math.min(1,r*1.03+0.02), Math.min(1,g*1.0), Math.min(1,b*0.96+0.04)];
    default:
      return [r, g, b];
  }
}

// Apply gain/gamma/saturation in linear light
export function applyColorScience(r, g, b, { gain=1, gamma=1, saturation=1, lift=0 } = {}) {
  // Lift
  r += lift; g += lift; b += lift;
  // Gain
  r *= gain; g *= gain; b *= gain;
  // Gamma
  r = Math.pow(Math.max(0,r), 1/gamma);
  g = Math.pow(Math.max(0,g), 1/gamma);
  b = Math.pow(Math.max(0,b), 1/gamma);
  // Saturation
  const lum = r*0.299 + g*0.587 + b*0.114;
  r = lum + (r - lum) * saturation;
  g = lum + (g - lum) * saturation;
  b = lum + (b - lum) * saturation;
  return [
    Math.min(1, Math.max(0, r)),
    Math.min(1, Math.max(0, g)),
    Math.min(1, Math.max(0, b)),
  ];
}

export default { LUT_PRESETS, applyLUTMeta, applyLUTToRGB, applyColorScience };
