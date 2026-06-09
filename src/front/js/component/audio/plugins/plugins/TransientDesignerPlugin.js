// =============================================================================
// TransientDesignerPlugin.js — StreamPireX Audio Plugin
// =============================================================================
// UI sends attack/sustain in dB. Convert to linear gain via dbToLin.

const dbToLin = (db) => Math.pow(10, (Number.isFinite(db) ? db : 0) / 20);

export const createTransientDesignerPlugin = (context, p = {}) => {
  const input = context.createGain(), output = context.createGain();
  const detector = context.createAnalyser(); detector.fftSize = 256;
  const attackGain = context.createGain(), sustainGain = context.createGain();
  // p.attack/p.sustain are dB; default 0 dB = linear 1.
  let curAttackLin  = dbToLin(p.attack  ?? 0);
  let curSustainLin = dbToLin(p.sustain ?? 0);
  attackGain.gain.value  = curAttackLin;
  sustainGain.gain.value = curSustainLin;
  const buf = new Uint8Array(detector.frequencyBinCount);
  let prevRMS = 0;
  const tick = setInterval(() => {
    detector.getByteFrequencyData(buf);
    const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length) / 128;
    const isAttack = rms > prevRMS * 1.2;
    if (isAttack) output.gain.setTargetAtTime(curAttackLin, context.currentTime, 0.005);
    else output.gain.setTargetAtTime(curSustainLin, context.currentTime, 0.05);
    prevRMS = rms;
  }, 25);
  input.connect(detector); input.connect(output);
  return {
    inputNode: input, node: input,
    setParam(k, v) {
      if (k === 'attack')  { curAttackLin  = dbToLin(v); attackGain.gain.value  = curAttackLin; }
      if (k === 'sustain') { curSustainLin = dbToLin(v); sustainGain.gain.value = curSustainLin; }
    },
    getState: () => ({ attack: 20 * Math.log10(Math.max(1e-6, curAttackLin)), sustain: 20 * Math.log10(Math.max(1e-6, curSustainLin)) }),
    connect: d => output.connect(d),
    disconnect: () => { clearInterval(tick); output.disconnect(); },
  };
};

// ── FILTERS ────────────────────────────────────────────────────────────────
