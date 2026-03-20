export function getFakeWaveform(samples = 64) {
  return Array.from({ length: samples }, (_, i) => ({
    x: i,
    y: 20 + Math.sin(i / 8) * 10 + Math.random() * 8
  }));
}

export function getFakeVectorscope(samples = 48) {
  return Array.from({ length: samples }, (_, i) => ({
    x: Math.cos(i / 8) * (20 + (i % 6) * 2),
    y: Math.sin(i / 8) * (20 + (i % 6) * 2)
  }));
}
