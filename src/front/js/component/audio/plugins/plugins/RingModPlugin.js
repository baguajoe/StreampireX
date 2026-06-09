// =============================================================================
// RingModPlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createRingModPlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const ringNode = context.createGain();
  const carrier = context.createOscillator();
  const carrierGain = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  // Registry params: freq (1-8000 Hz), mix (0-100%), lfoRate (0-20 Hz)
  const initFreq = Number.isFinite(p.freq) ? Math.max(1, Math.min(8000, p.freq))
                  : Number.isFinite(p.frequency) ? Math.max(1, Math.min(8000, p.frequency))
                  : 440;
  const initMix = Number.isFinite(p.mix) ? Math.max(0, Math.min(100, p.mix)) : 0;
  const initLfo = Number.isFinite(p.lfoRate) ? Math.max(0, Math.min(20, p.lfoRate)) : 0;

  carrier.type = 'sine';
  carrier.frequency.value = initFreq;
  carrierGain.gain.value = 1;

  // Bipolar carrier (±1) summed with ringNode.gain (initially 0) → gain swings -1..+1.
  // Multiplying input through this gain → ring modulation.
  ringNode.gain.value = 0;
  carrier.connect(carrierGain);
  carrierGain.connect(ringNode.gain);

  // LFO modulates carrier frequency (depth = 50% of base freq, capped)
  lfo.type = 'sine';
  lfo.frequency.value = initLfo;
  lfoGain.gain.value = initFreq * 0.5;
  lfo.connect(lfoGain);
  lfoGain.connect(carrier.frequency);

  carrier.start();
  lfo.start();

  const mix01 = initMix / 100;
  dryGain.gain.value = 1 - mix01;
  wetGain.gain.value = mix01;

  input.connect(dryGain); dryGain.connect(output);
  input.connect(ringNode); ringNode.connect(wetGain); wetGain.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'freq' || k === 'frequency') {
        const c = Math.max(1, Math.min(8000, val));
        carrier.frequency.setTargetAtTime(c, 0, 0.01);
        // Update LFO depth proportional to base
        lfoGain.gain.setTargetAtTime(c * 0.5, 0, 0.05);
      }
      if (k === 'mix') {
        const m = Math.max(0, Math.min(1, val / 100));
        dryGain.gain.setTargetAtTime(1 - m, 0, 0.05);
        wetGain.gain.setTargetAtTime(m, 0, 0.05);
      }
      if (k === 'lfoRate') {
        const c = Math.max(0, Math.min(20, val));
        lfo.frequency.setTargetAtTime(c, 0, 0.01);
      }
    },
    getState: () => ({
      freq: carrier.frequency.value,
      mix: wetGain.gain.value * 100,
      lfoRate: lfo.frequency.value,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { carrier.stop(); } catch (e) {}
      try { lfo.stop(); } catch (e) {}
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { ringNode.disconnect(); } catch (e) {}
      try { carrierGain.disconnect(); lfoGain.disconnect(); } catch (e) {}
      try { dryGain.disconnect(); wetGain.disconnect(); } catch (e) {}
    },
  };
};
