// =============================================================================
// StereoWidenerPlugin.js — StreamPireX Audio Plugin
// Standard Web Audio M/S split → side gain → M/S decode.
// =============================================================================

export const createStereoWidenerPlugin = (context, p = {}) => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finite = (v, def) => (Number.isFinite(v) ? v : def);
  const setSmooth = (param, v) => { try { param.setTargetAtTime(v, 0, 0.01); } catch (e) { param.value = v; } };

  // Width registry range: 0..200 (% — 100 = passthrough). Convert to 0..2 multiplier.
  const widthFromUI = (v) => clamp(finite(v, 100) / 100, 0, 2);
  // Mono-below uses a low-shelf summed mono on side path (we just attenuate
  // side path below the freq via a HPF on the side branch).
  const monoBelowFromUI = (v) => clamp(finite(v, 20), 20, 300);

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

  // Side gain (width control)
  const sideGain = context.createGain();
  sideGain.gain.value = widthFromUI(p.width);

  // Optional HPF on side path → keeps lows mono below `monoBelow`.
  const sideHPF = context.createBiquadFilter();
  sideHPF.type = 'highpass';
  sideHPF.frequency.value = monoBelowFromUI(p.monoBelow);
  sideHPF.Q.value = 0.707;

  // Decode: L = M + S, R = M - S
  const sInvert = context.createGain();
  sInvert.gain.value = -1;
  const lOut = context.createGain();
  const rOut = context.createGain();

  // Wiring
  input.connect(splitter);

  // Mid path
  splitter.connect(midSum, 0);
  splitter.connect(midSum, 1);

  // Side path: L - R
  splitter.connect(sideSum, 0);
  splitter.connect(rInvert, 1);
  rInvert.connect(sideSum);

  // Apply HPF then width gain to side
  sideSum.connect(sideHPF);
  sideHPF.connect(sideGain);

  // Decode L = M + S
  midSum.connect(lOut);
  sideGain.connect(lOut);
  // Decode R = M - S
  midSum.connect(rOut);
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
        case 'width':
          setSmooth(sideGain.gain, widthFromUI(v));
          break;
        case 'monoBelow':
          setSmooth(sideHPF.frequency, monoBelowFromUI(v));
          break;
        default: break;
      }
    },
    getState: () => ({
      width: sideGain.gain.value * 100,
      monoBelow: sideHPF.frequency.value,
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
      try { sideHPF.disconnect(); } catch (e) {}
      try { sideGain.disconnect(); } catch (e) {}
      try { lOut.disconnect(); } catch (e) {}
      try { rOut.disconnect(); } catch (e) {}
    },
  };
};
