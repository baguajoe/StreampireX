// src/front/js/utils/color/scopeUtils.js

// Real waveform from ImageData
export function computeWaveform(imageData, W, H) {
  const points = [];
  for (let x = 0; x < W; x += Math.max(1, W/64|0)) {
    let sum = 0, count = 0;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      const lum = imageData.data[i]*0.299 + imageData.data[i+1]*0.587 + imageData.data[i+2]*0.114;
      sum += lum; count++;
    }
    points.push({ x: Math.round((x/W)*64), y: Math.round((sum/count/255)*48) });
  }
  return points;
}

// Real vectorscope from ImageData (Cb/Cr)
export function computeVectorscope(imageData) {
  const points = [];
  const step = Math.max(1, (imageData.data.length/4/500)|0);
  for (let i = 0; i < imageData.data.length; i += 4 * step) {
    const r = imageData.data[i]/255;
    const g = imageData.data[i+1]/255;
    const b = imageData.data[i+2]/255;
    const cb = -0.168736*r - 0.331264*g + 0.5*b;
    const cr =  0.5*r - 0.418688*g - 0.081312*b;
    points.push({ x: cb * 60, y: cr * 60 });
  }
  return points;
}

// Fake waveform for when no frame is available
export function getFakeWaveform() {
  return Array.from({ length: 64 }, (_, i) => ({
    x: i,
    y: 24 + Math.sin(i * 0.3) * 12 + (Math.random() - 0.5) * 6,
  }));
}

// Fake vectorscope
export function getFakeVectorscope() {
  return Array.from({ length: 200 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 20;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

export default { computeWaveform, computeVectorscope, getFakeWaveform, getFakeVectorscope };
