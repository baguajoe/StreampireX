// src/front/js/utils/compositor/pro/exrPipelineConfig.js
export const PRO_FORMATS = [
  { id: 'png',    name: 'PNG',     ext: '.png',    depth: 8,  colorspace: 'sRGB',   browserCapable: true },
  { id: 'webp',   name: 'WebP',    ext: '.webp',   depth: 8,  colorspace: 'sRGB',   browserCapable: true },
  { id: 'webm',   name: 'WebM',    ext: '.webm',   depth: 8,  colorspace: 'sRGB',   browserCapable: true },
  { id: 'exr',    name: 'OpenEXR', ext: '.exr',    depth: 32, colorspace: 'Linear', browserCapable: false, backend: true },
  { id: 'prores', name: 'ProRes',  ext: '.mov',    depth: 10, colorspace: 'Rec709', browserCapable: false, backend: true },
  { id: 'dpx',    name: 'DPX',     ext: '.dpx',    depth: 10, colorspace: 'Cineon', browserCapable: false, backend: true },
  { id: 'tiff',   name: 'TIFF 16', ext: '.tiff',   depth: 16, colorspace: 'sRGB',   browserCapable: false, backend: true },
];

export const COLOR_SPACES = ['sRGB', 'Linear', 'Rec709', 'Rec2020', 'ACEScg', 'ACES2065-1', 'Cineon', 'SLog2', 'SLog3', 'LogC'];
export const BIT_DEPTHS   = [8, 10, 12, 16, 32];
