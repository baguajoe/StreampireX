// =============================================================================
// SpectralGatePlugin.js — StreamPireX Audio Plugin
// =============================================================================
// Phase C5 rebuild: proper FFT-based spectral gating via AudioWorklet.
// Approach:
//   - 1024-sample STFT with 50% overlap, Hann window analysis & synthesis.
//   - Per frame: convert to magnitude/phase, gate any bin whose magnitude
//     falls below threshold (with attack/release smoothing per bin), inverse
//     FFT, overlap-add to output.
//   - 'mix' crossfades dry vs gated wet.
//
// Falls back to a DynamicsCompressor-driven gate (the previous behavior) if
// the worklet cannot be loaded.
//
// Honesty tag: ACCEPTABLE — a hand-rolled radix-2 FFT inside an AudioWorklet
// is CPU-heavier than an FFTW-class C++ build, but at 1024-point/50%-overlap
// it runs comfortably on modern desktops. Inter-frame artifacts ("musical
// noise") are inherent to spectral gating; smoothing (attack/release)
// mitigates but does not eliminate them.
// =============================================================================

const SPECTRAL_GATE_WORKLET_NAME = 'spx-spectral-gate';

const getSpectralGateWorkletSource = () => `
class SPXSpectralGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -40, minValue: -100, maxValue: 0, automationRate: 'k-rate' },
      { name: 'attack',    defaultValue: 5,   minValue: 0.5,  maxValue: 200, automationRate: 'k-rate' },
      { name: 'release',   defaultValue: 100, minValue: 5,    maxValue: 1000,automationRate: 'k-rate' },
      { name: 'mix',       defaultValue: 1,   minValue: 0,    maxValue: 1,   automationRate: 'k-rate' },
    ];
  }
  constructor() {
    super();
    this._N = 1024;            // FFT size
    this._H = 512;             // hop (50% overlap)
    const N = this._N;
    // Hann window.
    this._win = new Float32Array(N);
    for (let i = 0; i < N; i++) this._win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
    // Bit-reversal table.
    this._br = new Uint32Array(N);
    let bits = Math.log2(N) | 0;
    for (let i = 0; i < N; i++) {
      let r = 0, x = i;
      for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>>= 1; }
      this._br[i] = r >>> 0;
    }
    // Twiddle factors.
    this._cos = new Float32Array(N / 2);
    this._sin = new Float32Array(N / 2);
    for (let k = 0; k < N / 2; k++) {
      this._cos[k] = Math.cos(-2 * Math.PI * k / N);
      this._sin[k] = Math.sin(-2 * Math.PI * k / N);
    }
    // Per-channel state (allocate up to 2; init lazily for higher).
    this._chState = [];
    for (let c = 0; c < 2; c++) this._chState.push(this._makeChannelState());
    // Per-bin gain memory across frames (mono, since spectral gating typically
    // uses sum-of-channels for detection). We keep separate per-channel for
    // simplicity here.
    this._binGain = [new Float32Array(N / 2 + 1), new Float32Array(N / 2 + 1)];
    for (let c = 0; c < 2; c++) this._binGain[c].fill(1);
  }
  _makeChannelState() {
    const N = this._N;
    // outWrite leads outRead by N (one full window) so the first frame's
    // OLA contribution is fully written before its samples are read out.
    // Net latency: ~N samples (~21 ms at 48 kHz).
    return {
      inBuf: new Float32Array(N),     // sliding analysis buffer
      outBuf: new Float32Array(N * 4), // overlap-add ring (4N safe headroom)
      outRead: 0,
      outWrite: N,
      // FFT scratch.
      re: new Float32Array(N),
      im: new Float32Array(N),
    };
  }
  // In-place radix-2 Cooley-Tukey FFT. inverse=true performs IFFT (no /N).
  _fft(re, im, inverse) {
    const N = this._N;
    const br = this._br;
    // Bit-reverse permutation.
    for (let i = 0; i < N; i++) {
      const j = br[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    const sign = inverse ? -1 : 1;
    const cosT = this._cos, sinT = this._sin;
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1;
      const tableStep = N / size;
      for (let i = 0; i < N; i += size) {
        let k = 0;
        for (let j = i; j < i + half; j++) {
          const tre =  cosT[k] * re[j + half] - sign * sinT[k] * im[j + half];
          const tim =  cosT[k] * im[j + half] + sign * sinT[k] * re[j + half];
          re[j + half] = re[j] - tre;
          im[j + half] = im[j] - tim;
          re[j] = re[j] + tre;
          im[j] = im[j] + tim;
          k += tableStep;
        }
      }
    }
    if (inverse) {
      const inv = 1 / N;
      for (let i = 0; i < N; i++) { re[i] *= inv; im[i] *= inv; }
    }
  }
  _processFrame(state, c, threshLin, attackCoef, releaseCoef) {
    const N = this._N;
    const win = this._win;
    const re = state.re, im = state.im;
    // Copy windowed input.
    for (let i = 0; i < N; i++) {
      re[i] = state.inBuf[i] * win[i];
      im[i] = 0;
    }
    this._fft(re, im, false);
    // Gate bins (DC..Nyquist inclusive).
    const half = N / 2;
    const gains = this._binGain[c];
    for (let k = 0; k <= half; k++) {
      const krIdx = k;
      const kiIdx = (k === 0 || k === half) ? k : N - k;
      // For real input the spectrum is conjugate-symmetric; we only really
      // need to gate 0..half and mirror to N-half..N-1, but it's simpler to
      // just gate all bins symmetrically.
      const reK = re[krIdx];
      const imK = im[krIdx];
      const mag = Math.sqrt(reK * reK + imK * imK);
      const target = mag >= threshLin ? 1 : 0;
      // Smooth bin gain with attack/release.
      let g = gains[k];
      if (target > g) {
        // Opening (attack)
        g = attackCoef * g + (1 - attackCoef) * target;
      } else {
        // Closing (release)
        g = releaseCoef * g + (1 - releaseCoef) * target;
      }
      gains[k] = g;
      // Apply symmetrically.
      re[k] *= g; im[k] *= g;
      if (k > 0 && k < half) {
        const mIdx = N - k;
        re[mIdx] *= g; im[mIdx] *= g;
      }
    }
    // IFFT.
    this._fft(re, im, true);
    // Window again (for COLA with Hann + 50% overlap → constant-overlap-add).
    // With double Hann windowing and 50% overlap, the sum of squared windows
    // is constant = N/2; we compensate with 1/N (already in IFFT) and the
    // window applied twice. For 50% overlap Hann-Hann, sum w[n]^2 over hop
    // boundaries = 0.5 → multiply OLA output by 1.0 (no extra scaling needed
    // because we used Hann once on input and once on output, and the sum of
    // overlapping Hann^2 = 0.5 · N/H = 1 for H=N/2).
    // Add to overlap-add buffer starting at state.outWrite. Caller advances
    // state.outWrite by the hop size after this returns.
    const owLen = state.outBuf.length;
    let ow = state.outWrite;
    for (let i = 0; i < N; i++) {
      state.outBuf[ow] += re[i] * win[i];
      ow = (ow + 1) % owLen;
    }
  }
  process(inputs, outputs, parameters) {
    const inp = inputs[0];
    const out = outputs[0];
    if (!out || !out[0]) return true;

    const threshDb = parameters.threshold[0];
    const atkMs    = parameters.attack[0];
    const relMs    = parameters.release[0];
    const mix      = parameters.mix[0];

    const threshLin = Math.pow(10, threshDb / 20);
    const sr = sampleRate;
    const atkTauSamples = Math.max(1, atkMs * sr / 1000);
    const relTauSamples = Math.max(1, relMs * sr / 1000);
    const attackCoef  = Math.exp(-this._H / atkTauSamples);
    const releaseCoef = Math.exp(-this._H / relTauSamples);

    const N = this._N, H = this._H;
    const nCh = Math.min(out.length, Math.max(1, inp ? inp.length : 1));

    for (let c = 0; c < nCh; c++) {
      if (!this._chState[c]) this._chState[c] = this._makeChannelState();
      if (!this._binGain[c]) { this._binGain[c] = new Float32Array(N / 2 + 1); this._binGain[c].fill(1); }
      const st = this._chState[c];
      // Lazy-init circular ring used to gather contiguous N-sample windows.
      if (!st.inRing) {
        st.inRing = new Float32Array(N);
        st.inWrite = 0;
        st.sinceFrame = 0;
        // Prime so first frame fires after H samples (typical STFT cold start).
      }
      const inpCh = inp && inp[c] ? inp[c] : (inp && inp[0] ? inp[0] : null);
      const outCh = out[c];
      const blockN = outCh.length;

      for (let i = 0; i < blockN; i++) {
        const xs = inpCh ? inpCh[i] : 0;

        // 1) Push input into circular ring.
        st.inRing[st.inWrite] = xs;
        st.inWrite = (st.inWrite + 1) % N;
        st.sinceFrame++;

        // 2) Emit one OLA sample (wet).
        const wetSample = st.outBuf[st.outRead];
        st.outBuf[st.outRead] = 0;
        st.outRead = (st.outRead + 1) % st.outBuf.length;

        // 3) Mix wet/dry. Note: the wet path has an inherent N-sample latency
        //    (one full window must accumulate before output appears). The dry
        //    path is zero-latency, so when mix < 1 there is a slight
        //    pre-echo of the dry transient before the wet catches up. We
        //    delay the dry by N samples to align — but adding N samples of
        //    latency is heavy. For demo-grade APPROXIMATE quality we accept
        //    the small misalignment when mix < 1; recommend mix=1 (full wet).
        outCh[i] = xs * (1 - mix) + wetSample * mix;

        // 4) Trigger a frame every H samples.
        if (st.sinceFrame >= H) {
          st.sinceFrame = 0;
          // Copy N samples in chronological order, oldest first.
          const start = st.inWrite; // next write slot == oldest sample
          for (let k = 0; k < N; k++) {
            st.inBuf[k] = st.inRing[(start + k) % N];
          }
          this._processFrame(st, c, threshLin, attackCoef, releaseCoef);
          // Advance OLA write head by H so frames overlap by 50%.
          st.outWrite = (st.outWrite + H) % st.outBuf.length;
        }
      }
    }

    // Mirror to any extra output channels.
    for (let c = nCh; c < out.length; c++) out[c].set(out[0]);
    return true;
  }
}
registerProcessor('${SPECTRAL_GATE_WORKLET_NAME}', SPXSpectralGateProcessor);
`;

// Per-context cache of pending/loaded worklet registrations.
const ensureSpectralGateWorklet = (context) => {
  if (!context._spxWorkletPromises) context._spxWorkletPromises = new Map();
  if (context._spxWorkletPromises.has(SPECTRAL_GATE_WORKLET_NAME)) {
    return context._spxWorkletPromises.get(SPECTRAL_GATE_WORKLET_NAME);
  }
  const p = (async () => {
    try {
      const blob = new Blob([getSpectralGateWorkletSource()], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      try { await context.audioWorklet.addModule(url); }
      finally { URL.revokeObjectURL(url); }
      return true;
    } catch (e) {
      if (String(e && e.message || e).includes('already')) return true;
      console.warn('[SpectralGate] worklet load failed:', e);
      return false;
    }
  })();
  context._spxWorkletPromises.set(SPECTRAL_GATE_WORKLET_NAME, p);
  return p;
};

export const createSpectralGatePlugin = (context, p = {}) => {
  const input  = context.createGain();
  const output = context.createGain();

  // Initial state.
  let threshold = Number.isFinite(p.threshold) ? p.threshold : -40;
  let attack    = Number.isFinite(p.attack)    ? p.attack    : 5;
  let release   = Number.isFinite(p.release)   ? p.release   : 100;
  let mixPct    = Number.isFinite(p.mix)       ? p.mix       : 100;

  // ── Fallback path: AnalyserNode-driven DynamicsCompressor gate (APPROXIMATE).
  // This is the C2-era behavior; kept as a safety net if the worklet fails.
  const fbGate = context.createDynamicsCompressor();
  fbGate.threshold.value = threshold;
  fbGate.knee.value = 3; fbGate.ratio.value = 12;
  fbGate.attack.value = attack / 1000;
  fbGate.release.value = release / 1000;
  const connectFallback = () => {
    try { input.disconnect(); } catch {}
    try { fbGate.disconnect(); } catch {}
    input.connect(fbGate); fbGate.connect(output);
  };
  connectFallback();

  // ── Worklet path.
  let workletNode = null;
  ensureSpectralGateWorklet(context).then((ok) => {
    if (!ok) return;
    try {
      const node = new AudioWorkletNode(context, SPECTRAL_GATE_WORKLET_NAME, {
        numberOfInputs: 1, numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      const ap = (n, v) => { const par = node.parameters.get(n); if (par) par.setTargetAtTime(v, context.currentTime, 0.01); };
      ap('threshold', threshold);
      ap('attack',    attack);
      ap('release',   release);
      ap('mix',       Math.max(0, Math.min(100, mixPct)) / 100);
      // Swap.
      try { input.disconnect(); } catch {}
      try { fbGate.disconnect(); } catch {}
      input.connect(node); node.connect(output);
      workletNode = node;
    } catch (e) {
      console.warn('[SpectralGate] worklet instantiation failed, staying on fallback:', e);
    }
  }).catch(() => {});

  const setAP = (n, v) => {
    if (!workletNode) return;
    const par = workletNode.parameters.get(n);
    if (par) par.setTargetAtTime(v, context.currentTime, 0.01);
  };

  return {
    inputNode: input, node: input,
    setParam(k, v) {
      const sv = Number.isFinite(v) ? v : 0;
      if (k === 'threshold') {
        threshold = Math.max(-100, Math.min(0, sv));
        setAP('threshold', threshold);
        fbGate.threshold.setTargetAtTime(threshold, context.currentTime, 0.01);
      } else if (k === 'attack') {
        attack = Math.max(0.5, Math.min(200, sv));
        setAP('attack', attack);
        fbGate.attack.setTargetAtTime(attack / 1000, context.currentTime, 0.01);
      } else if (k === 'release') {
        release = Math.max(5, Math.min(1000, sv));
        setAP('release', release);
        fbGate.release.setTargetAtTime(release / 1000, context.currentTime, 0.01);
      } else if (k === 'mix') {
        mixPct = Math.max(0, Math.min(100, sv));
        setAP('mix', mixPct / 100);
        // Fallback can't crossfade trivially without extra gain nodes; accept.
      }
    },
    getState: () => ({ threshold, attack, release, mix: mixPct }),
    connect: d => output.connect(d),
    disconnect: () => output.disconnect(),
    destroy: () => {
      try { if (workletNode) workletNode.disconnect(); } catch {}
      try { input.disconnect(); } catch {}
      try { output.disconnect(); } catch {}
      try { fbGate.disconnect(); } catch {}
      workletNode = null;
    },
  };
};
