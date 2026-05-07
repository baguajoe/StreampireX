// =============================================================================
// MidSideProcessorPlugin.js — StreamPireX Audio Plugin
// Standard Web Audio M/S split with independent mid + side gains in dB.
// =============================================================================

export const createMidSideProcessorPlugin = (context, p = {}) => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, def) => (Number.isFinite(v) ? v : def);
  const setSmooth = (param, v) => { try { param.setTargetAtTime(v, 0, 0.01); } catch (e) { param.value = v; } };
  const dbToLin = (db) => Math.pow(10, clamp(finite(db, 0), -60, 24) / 20);

  const input = context.createGain();
  const output = context.createGain();
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);

  // M = (L+R)/2
  const midSum = context.createGain();
  midSum.gain.value = 0.5;

  // Side = (L-R)/2
  const rInvert = context.createGain();
  rInvert.gain.value = -1;
  const sideSum = context.createGain();
  sideSum.gain.value = 0.5;

  // Independent gains for mid + side (dB → linear)
  const midGain = context.createGain();
  midGain.gain.value = dbToLin(p.midGain);
  const sideGain = context.createGain();
  sideGain.gain.value = dbToLin(p.sideGain);

  // Decode: L = M + S, R = M - S
  const sInvert = context.createGain();
  sInvert.gain.value = -1;
  const lOut = context.createGain();
  const rOut = context.createGain();

  // Wiring
  input.connect(splitter);

  splitter.connect(midSum, 0);
  splitter.connect(midSum, 1);

  splitter.connect(sideSum, 0);
  splitter.connect(rInvert, 1);
  rInvert.connect(sideSum);

  midSum.connect(midGain);
  sideSum.connect(sideGain);

  midGain.connect(lOut);
  sideGain.connect(lOut);
  midGain.connect(rOut);
  sideGain.connect(sInvert);
  sInvert.connect(rOut);

  lOut.connect(merger, 0, 0);
  rOut.connect(merger, 0, 1);
  merger.connect(output);

  return {
    inputNode: input,
    node: input,
    outputNode: output,
    setParam(k, v) {
      switch (k) {
        case 'midGain':
          setSmooth(midGain.gain, dbToLin(v));
          break;
        case 'sideGain':
          setSmooth(sideGain.gain, dbToLin(v));
          break;
        case 'encode':
          // Toggle is informational here — mid and side are always independently
          // processed; param is accepted to keep registry/factory aligned.
          break;
        default: break;
      }
    },
    getState: () => ({
      encode: 1,
      midGain: 20 * Math.log10(Math.max(1e-6, midGain.gain.value)),
      sideGain: 20 * Math.log10(Math.max(1e-6, sideGain.gain.value)),
    }),
    connect: (d) => output.connect(d),
    disconnect: () => { try { output.disconnect(); } catch (e) {} },
    destroy() {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { splitter.disconnect(); } catch (e) {}
      try { merger.disconnect(); } catch (e) {}
      try { midSum.disconnect(); } catch (e) {}
      try { sideSum.disconnect(); } catch (e) {}
      try { rInvert.disconnect(); } catch (e) {}
      try { sInvert.disconnect(); } catch (e) {}
      try { midGain.disconnect(); } catch (e) {}
      try { sideGain.disconnect(); } catch (e) {}
      try { lOut.disconnect(); } catch (e) {}
      try { rOut.disconnect(); } catch (e) {}
    },
  };
};
