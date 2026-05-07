// =============================================================================
// MidSideBalancePlugin.js — StreamPireX Audio Plugin
// =============================================================================

export const createMidSideBalancePlugin = (context, p = {}) => {
  const input = context.createGain();
  const output = context.createGain();
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);

  // M/S encode: M = (L+R)/2, S = (L-R)/2 — via summing gains.
  // Decode: L = M+S, R = M-S.
  const lToMid = context.createGain(); lToMid.gain.value = 0.5;
  const rToMid = context.createGain(); rToMid.gain.value = 0.5;
  const lToSide = context.createGain(); lToSide.gain.value = 0.5;
  const rToSide = context.createGain(); rToSide.gain.value = -0.5; // inversion

  const midSum = context.createGain();
  const sideSum = context.createGain();

  // Registry params: midGain dB, sideGain dB, width 0..200%
  const dbToLin = (db) => Math.pow(10, db / 20);
  const initMidDb = Number.isFinite(p.midGain) ? Math.max(-12, Math.min(12, p.midGain)) : 0;
  const initSideDb = Number.isFinite(p.sideGain) ? Math.max(-12, Math.min(12, p.sideGain)) : 0;
  const initWidth = Number.isFinite(p.width) ? Math.max(0, Math.min(200, p.width)) : 100;

  const midGain = context.createGain();
  const sideGain = context.createGain();
  const widthGain = context.createGain();

  midGain.gain.value = dbToLin(initMidDb);
  sideGain.gain.value = dbToLin(initSideDb);
  widthGain.gain.value = initWidth / 100;

  // Decode back to L/R
  const midToL = context.createGain(); midToL.gain.value = 1;
  const midToR = context.createGain(); midToR.gain.value = 1;
  const sideToL = context.createGain(); sideToL.gain.value = 1;
  const sideToR = context.createGain(); sideToR.gain.value = -1;

  // Wire input → splitter
  input.connect(splitter);

  // Encode: L+R → midSum, L-R → sideSum
  splitter.connect(lToMid, 0); lToMid.connect(midSum);
  splitter.connect(rToMid, 1); rToMid.connect(midSum);
  splitter.connect(lToSide, 0); lToSide.connect(sideSum);
  splitter.connect(rToSide, 1); rToSide.connect(sideSum);

  // Apply gains: midSum → midGain; sideSum → widthGain → sideGain
  midSum.connect(midGain);
  sideSum.connect(widthGain);
  widthGain.connect(sideGain);

  // Decode: L = mid + side, R = mid - side
  midGain.connect(midToL); midToL.connect(merger, 0, 0);
  midGain.connect(midToR); midToR.connect(merger, 0, 1);
  sideGain.connect(sideToL); sideToL.connect(merger, 0, 0);
  sideGain.connect(sideToR); sideToR.connect(merger, 0, 1);

  merger.connect(output);

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const val = Number.isFinite(v) ? v : 0;
      if (k === 'midGain') {
        const c = Math.max(-12, Math.min(12, val));
        midGain.gain.setTargetAtTime(dbToLin(c), 0, 0.01);
      }
      if (k === 'sideGain') {
        const c = Math.max(-12, Math.min(12, val));
        sideGain.gain.setTargetAtTime(dbToLin(c), 0, 0.01);
      }
      if (k === 'width') {
        const c = Math.max(0, Math.min(200, val));
        widthGain.gain.setTargetAtTime(c / 100, 0, 0.05);
      }
    },
    getState: () => ({
      midGain: 20 * Math.log10(Math.max(1e-6, midGain.gain.value)),
      sideGain: 20 * Math.log10(Math.max(1e-6, sideGain.gain.value)),
      width: widthGain.gain.value * 100,
    }),
    connect: d => output.connect(d),
    disconnect: () => {
      try { output.disconnect(); } catch (e) {}
      try { input.disconnect(); } catch (e) {}
      try { splitter.disconnect(); } catch (e) {}
      try { merger.disconnect(); } catch (e) {}
      try { lToMid.disconnect(); rToMid.disconnect(); lToSide.disconnect(); rToSide.disconnect(); } catch (e) {}
      try { midSum.disconnect(); sideSum.disconnect(); } catch (e) {}
      try { midGain.disconnect(); sideGain.disconnect(); widthGain.disconnect(); } catch (e) {}
      try { midToL.disconnect(); midToR.disconnect(); sideToL.disconnect(); sideToR.disconnect(); } catch (e) {}
    },
  };
};
