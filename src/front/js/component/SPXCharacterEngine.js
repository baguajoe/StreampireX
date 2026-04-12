// =============================================================================
// SPXCharacterEngine.js — Shared bit-depth + sample rate character processing
// Used by: DrumDesigner, SynthCreator, InstrumentBuilder
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// BIT DEPTH PROFILES — each has distinct sonic character
// ─────────────────────────────────────────────────────────────────────────────

const BIT_PROFILES = {
  8: {
    name: 'NES / Game Boy',
    noise:    0.008,       // heavy noise floor
    dither:   'none',      // no dither = harsh quantization cliffs
    satDrive: 2.2,         // aggressive saturation
    satMix:   0.6,
    hpFreq:   0,           // no HP
    lpFreq:   8000,        // heavy rolloff
    harmonics: 0.4,        // add harmonic distortion
  },
  12: {
    name: 'MPC3000 / SP-1200',
    noise:    0.0005,      // ~-66dB authentic MPC noise floor
    dither:   'tpdf',      // triangular PDF dither
    satDrive: 1.3,
    satMix:   0.25,
    hpFreq:   0,
    lpFreq:   17500,       // Linn anti-alias filter
    harmonics: 0.1,
  },
  14: {
    name: 'Early CD / DAT',
    noise:    0.00015,
    dither:   'tpdf',
    satDrive: 1.1,
    satMix:   0.1,
    hpFreq:   0,
    lpFreq:   20000,
    harmonics: 0.04,
  },
  16: {
    name: 'CD Quality',
    noise:    0.00004,
    dither:   'tpdf',
    satDrive: 1.0,
    satMix:   0.0,
    hpFreq:   0,
    lpFreq:   22050,
    harmonics: 0.0,
  },
  24: {
    name: 'Studio / Transparent',
    noise:    0,
    dither:   'none',
    satDrive: 1.0,
    satMix:   0.0,
    hpFreq:   0,
    lpFreq:   0,
    harmonics: 0.0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE RATE PROFILES
// ─────────────────────────────────────────────────────────────────────────────

const RATE_PROFILES = {
  11025: { name: 'Telephone',    lpFreq: 3400,  aliasAmt: 0.9  },
  22050: { name: 'Multimedia',   lpFreq: 8000,  aliasAmt: 0.5  },
  26040: { name: 'SP-1200',      lpFreq: 12000, aliasAmt: 0.35 },
  32000: { name: 'Broadcast',    lpFreq: 14000, aliasAmt: 0.2  },
  44100: { name: 'CD Standard',  lpFreq: 0,     aliasAmt: 0    },
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE PROCESSING — operates on AudioBuffer
// ─────────────────────────────────────────────────────────────────────────────

export function processCharacter(ctx, buffer, bits = 24, rate = 44100) {
  if (!buffer) return buffer;
  if (bits >= 24 && rate >= 44100) return buffer; // transparent — skip all processing

  let buf = buffer;

  // Step 1: Sample rate reduction (before bit crush for authentic aliasing)
  if (rate < 44100) {
    buf = applySampleRateReduction(ctx, buf, rate);
  }

  // Step 2: Bit depth quantization
  if (bits < 24) {
    buf = applyBitCrush(ctx, buf, bits);
  }

  // Step 3: Analog character (per bit profile)
  const profile = BIT_PROFILES[bits] || BIT_PROFILES[24];
  if (profile.satMix > 0 || profile.harmonics > 0) {
    buf = applyAnalogCharacter(ctx, buf, profile);
  }

  // Step 4: Lowpass filter (anti-aliasing / rolloff)
  const rateProfile = RATE_PROFILES[rate] || RATE_PROFILES[44100];
  const lpFreq = Math.min(
    profile.lpFreq > 0 ? profile.lpFreq : 22050,
    rateProfile.lpFreq > 0 ? rateProfile.lpFreq : 22050
  );
  if (lpFreq < 20000) {
    buf = applyLowpass(ctx, buf, lpFreq);
  }

  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE RATE REDUCTION
// ─────────────────────────────────────────────────────────────────────────────

function applySampleRateReduction(ctx, buffer, targetRate) {
  const ratio  = targetRate / buffer.sampleRate;
  const nc     = buffer.numberOfChannels;
  const srcLen = buffer.length;
  const out    = ctx.createBuffer(nc, srcLen, buffer.sampleRate);

  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    // Zero-order hold (nearest neighbor) — creates authentic aliasing
    for (let i = 0; i < srcLen; i++) {
      dst[i] = src[Math.floor(Math.floor(i * ratio) / ratio)];
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// BIT CRUSH
// ─────────────────────────────────────────────────────────────────────────────

function applyBitCrush(ctx, buffer, bits) {
  const profile = BIT_PROFILES[bits] || BIT_PROFILES[12];
  const steps   = Math.pow(2, bits);
  const half    = steps / 2;
  const nc      = buffer.numberOfChannels;
  const len     = buffer.length;
  const out     = ctx.createBuffer(nc, len, buffer.sampleRate);

  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);

    for (let i = 0; i < len; i++) {
      // Quantize to target bit depth
      const quantized = Math.round(src[i] * half) / half;

      // Dither
      let dither = 0;
      if (profile.dither === 'tpdf') {
        // Triangular PDF dither — two uniform randoms summed
        dither = (Math.random() - Math.random()) * (1 / half) * 0.5;
      } else if (profile.dither === 'none' && bits <= 8) {
        // 8-bit: rectangular dither creates harsher artifacts
        dither = (Math.random() - 0.5) * (1 / half) * 0.8;
      }

      // Noise floor
      const noise = profile.noise > 0
        ? (Math.random() - 0.5) * profile.noise
        : 0;

      dst[i] = quantized + dither + noise;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALOG CHARACTER — saturation + harmonic generation
// ─────────────────────────────────────────────────────────────────────────────

function applyAnalogCharacter(ctx, buffer, profile) {
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);

  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);

    // Low shelf for transformer warmth (60Hz resonance)
    const sr  = buffer.sampleRate;
    const wc  = 2 * Math.PI * 60 / sr;
    let z = 0;

    for (let i = 0; i < len; i++) {
      // 1. Soft saturation (tanh approximation)
      const driven  = src[i] * profile.satDrive;
      const sat     = driven / (1 + Math.abs(driven));

      // 2. Mix dry + saturated
      const mixed   = src[i] * (1 - profile.satMix) + sat * profile.satMix;

      // 3. Harmonic generation (even harmonics = warmth)
      const harm    = mixed * mixed * Math.sign(mixed) * profile.harmonics;

      // 4. Transformer low-end warmth
      z = z + wc * (mixed - z);
      const warm = mixed + z * 0.06;

      dst[i] = (warm + harm) / profile.satDrive;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOWPASS FILTER — single-pole IIR
// ─────────────────────────────────────────────────────────────────────────────

function applyLowpass(ctx, buffer, cutoffHz) {
  const rc  = 1.0 / (2 * Math.PI * cutoffHz);
  const dt  = 1.0 / buffer.sampleRate;
  const a   = dt / (rc + dt);
  const nc  = buffer.numberOfChannels;
  const len = buffer.length;
  const out = ctx.createBuffer(nc, len, buffer.sampleRate);

  for (let ch = 0; ch < nc; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let prev  = 0;
    for (let i = 0; i < len; i++) {
      prev   = a * src[i] + (1 - a) * prev;
      dst[i] = prev;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME WEB AUDIO NODE CHAIN
// Creates a ScriptProcessorNode chain for live playback character
// ─────────────────────────────────────────────────────────────────────────────

export function createCharacterChain(ctx, bits = 24, rate = 44100) {
  if (bits >= 24 && rate >= 44100) return null; // no processing needed

  const profile     = BIT_PROFILES[bits] || BIT_PROFILES[24];
  const rateProfile = RATE_PROFILES[rate] || RATE_PROFILES[44100];

  // ScriptProcessor for bit crush + sample rate reduction
  const bufSize = 2048;
  const crusher = ctx.createScriptProcessor(bufSize, 2, 2);

  const ratio   = rate < 44100 ? rate / ctx.sampleRate : 1;
  const steps   = Math.pow(2, bits);
  const half    = steps / 2;

  crusher.onaudioprocess = (e) => {
    for (let ch = 0; ch < 2; ch++) {
      const inp = e.inputBuffer.getChannelData(ch);
      const out = e.outputBuffer.getChannelData(ch);

      for (let i = 0; i < bufSize; i++) {
        // Sample rate reduction
        let s = ratio < 1
          ? inp[Math.floor(Math.floor(i * ratio) / ratio)]
          : inp[i];

        // Bit crush
        if (bits < 24) {
          const q = Math.round(s * half) / half;
          const dither = profile.dither === 'tpdf'
            ? (Math.random() - Math.random()) * (1/half) * 0.5
            : 0;
          const noise = profile.noise > 0
            ? (Math.random() - 0.5) * profile.noise
            : 0;
          s = q + dither + noise;
        }

        // Soft saturation
        if (profile.satMix > 0) {
          const driven = s * profile.satDrive;
          const sat    = driven / (1 + Math.abs(driven));
          s = s * (1 - profile.satMix) + sat * profile.satMix;
          s /= profile.satDrive;
        }

        out[i] = s;
      }
    }
  };

  // Lowpass filter node
  const lpFreq = Math.min(
    profile.lpFreq > 0 ? profile.lpFreq : 22050,
    rateProfile.lpFreq > 0 ? rateProfile.lpFreq : 22050
  );

  let lastNode = crusher;

  if (lpFreq < 20000) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lpFreq;
    lp.Q.value = 0.7;
    crusher.connect(lp);
    lastNode = lp;
  }

  return { input: crusher, output: lastNode };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const BIT_DEPTH_OPTIONS  = [8, 12, 14, 16, 24];
export const SAMPLE_RATE_OPTIONS = [11025, 22050, 26040, 32000, 44100];
export const getBitName  = (b) => BIT_PROFILES[b]?.name  || `${b}-bit`;
export const getRateName = (r) => RATE_PROFILES[r]?.name || `${(r/1000).toFixed(1)}kHz`;
