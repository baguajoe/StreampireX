// =============================================================================
// PluginVisualizer.js — Reusable SVG visualization framework (Part 17)
// =============================================================================
// Four primitives plugins opt into to show what their DSP is doing:
//   - SpectrumAnalyzer   : log-frequency response of a filter bank (param-driven)
//   - GainReductionMeter : compressor I/O curve from threshold/ratio/knee
//   - TransferCurve      : input vs output for a waveshaper Float32Array
//   - ImpulseResponse    : decay envelope of an AudioBuffer or generated tail
//
// Pure SVG, no canvas. Updates via React render — for "live" feel pass new
// params on every change. All four accept `size` ("small"|"default"|"large")
// matching the studio's visual language: #06060f bg, #00ffc8 teal data,
// #FF6600 orange peaks/highlights, JetBrains Mono labels.
// =============================================================================

import React, { useMemo } from "react";

const SIZES = {
  small:   { w: 80,  h: 60,  fontSize: 7 },
  default: { w: 200, h: 120, fontSize: 9 },
  large:   { w: 400, h: 240, fontSize: 11 },
};
const COL_BG = "#06060f", COL_GRID = "#1a1f2e", COL_DATA = "#00ffc8", COL_PEAK = "#FF6600", COL_LABEL = "#5a7090";

// ── 1. SpectrumAnalyzer — log-freq response of a BiquadFilter array ─────────
// `filters` is an array of { type, frequency, Q, gain } describing the EQ.
// We sample the cumulative magnitude response across 256 log-spaced bins
// from 20 Hz to 20 kHz using a throwaway OfflineAudioContext to query
// each filter's getFrequencyResponse — accurate, cheap, no live audio
// needed (param-driven). Updates every render so knobs feel live.
export const SpectrumAnalyzer = ({ filters = [], size = "default", sampleRate = 44100 }) => {
  const s = SIZES[size] || SIZES.default;
  const N = 256;
  const fMin = 20, fMax = 20000;
  const dbMin = -24, dbMax = 24;
  const data = useMemo(() => {
    if (!filters.length || typeof OfflineAudioContext === "undefined") return new Array(N).fill(0);
    const freqs = new Float32Array(N);
    for (let i = 0; i < N; i++) freqs[i] = fMin * Math.pow(fMax / fMin, i / (N - 1));
    let cumDb = new Float32Array(N);
    try {
      const ctx = new OfflineAudioContext(1, 1, sampleRate);
      filters.forEach(f => {
        const b = ctx.createBiquadFilter();
        b.type = f.type || "peaking";
        b.frequency.value = f.frequency || 1000;
        b.Q.value = f.Q || 1;
        b.gain.value = f.gain || 0;
        const mag = new Float32Array(N), ph = new Float32Array(N);
        b.getFrequencyResponse(freqs, mag, ph);
        for (let i = 0; i < N; i++) cumDb[i] += 20 * Math.log10(Math.max(mag[i], 1e-6));
      });
    } catch (_) { /* OfflineAudioContext not available — return zeros */ }
    return Array.from(cumDb);
  }, [filters, sampleRate]);
  const path = useMemo(() => {
    return data.map((db, i) => {
      const x = (i / (N - 1)) * s.w;
      const y = s.h - ((db - dbMin) / (dbMax - dbMin)) * s.h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${Math.max(0, Math.min(s.h, y)).toFixed(2)}`;
    }).join(" ");
  }, [data, s.w, s.h]);
  const zeroY = s.h - ((0 - dbMin) / (dbMax - dbMin)) * s.h;
  return (
    <svg width={s.w} height={s.h} style={{ background: COL_BG, borderRadius: 3, display: "block" }}>
      {/* horizontal 0 dB line */}
      <line x1={0} y1={zeroY} x2={s.w} y2={zeroY} stroke={COL_GRID} strokeWidth={0.5} />
      {/* vertical decade gridlines: 100, 1k, 10k */}
      {[100, 1000, 10000].map(f => {
        const x = (Math.log(f / fMin) / Math.log(fMax / fMin)) * s.w;
        return <line key={f} x1={x} y1={0} x2={x} y2={s.h} stroke={COL_GRID} strokeWidth={0.5} />;
      })}
      <path d={path} fill="none" stroke={COL_DATA} strokeWidth={1.5} strokeLinejoin="round" />
      <text x={2} y={s.fontSize + 1} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">+24</text>
      <text x={2} y={s.h - 2} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">−24</text>
    </svg>
  );
};

// ── 2. GainReductionMeter — static GR curve from compressor params ─────────
// Plots the input level (X, dB) vs gain reduction applied (Y, dB) given
// threshold/ratio/knee. The curve flattens above threshold by 1/ratio.
// This is param-driven (no live audio) — the user sees the compression
// shape. A live "needle" can be added later via `currentInputDb` prop.
export const GainReductionMeter = ({
  threshold = -18, ratio = 4, knee = 6, makeup = 0,
  currentInputDb = null, size = "default",
}) => {
  const s = SIZES[size] || SIZES.default;
  const xMin = -60, xMax = 0;  // input dB
  const yMin = -48, yMax = 12; // output dB
  const compute = (db) => {
    const above = db - threshold;
    if (above < -knee / 2) return db + makeup;
    if (above >  knee / 2) return threshold + above / ratio + makeup;
    // soft knee
    const k = above + knee / 2;
    return db + (1 / ratio - 1) * k * k / (2 * knee) + makeup;
  };
  const N = 64;
  const path = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const db = xMin + (xMax - xMin) * i / (N - 1);
      const out = compute(db);
      const x = ((db - xMin) / (xMax - xMin)) * s.w;
      const y = s.h - ((out - yMin) / (yMax - yMin)) * s.h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${Math.max(0, Math.min(s.h, y)).toFixed(2)}`;
    }).join(" ");
  }, [threshold, ratio, knee, makeup, s.w, s.h]);
  const unityPath = useMemo(() => {
    // y = x reference line so users can see how much GR is happening
    const x1 = ((xMin - xMin) / (xMax - xMin)) * s.w;
    const y1 = s.h - ((xMin - yMin) / (yMax - yMin)) * s.h;
    const x2 = s.w;
    const y2 = s.h - ((xMax - yMin) / (yMax - yMin)) * s.h;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }, [s.w, s.h]);
  const threshX = ((threshold - xMin) / (xMax - xMin)) * s.w;
  const liveDot = currentInputDb != null ? (() => {
    const out = compute(currentInputDb);
    return {
      x: ((currentInputDb - xMin) / (xMax - xMin)) * s.w,
      y: s.h - ((out - yMin) / (yMax - yMin)) * s.h,
      gr: (currentInputDb - out + makeup).toFixed(1),
    };
  })() : null;
  return (
    <svg width={s.w} height={s.h} style={{ background: COL_BG, borderRadius: 3, display: "block" }}>
      <path d={unityPath} stroke={COL_GRID} strokeWidth={0.5} strokeDasharray="2 2" fill="none" />
      <line x1={threshX} y1={0} x2={threshX} y2={s.h} stroke={COL_PEAK} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.5} />
      <path d={path} stroke={COL_DATA} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      {liveDot && <>
        <circle cx={liveDot.x} cy={liveDot.y} r={3} fill={COL_PEAK} />
        <text x={liveDot.x + 5} y={liveDot.y - 3} fill={COL_PEAK} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">{liveDot.gr}dB</text>
      </>}
      <text x={2} y={s.fontSize + 1} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">{ratio}:1</text>
      <text x={threshX + 2} y={s.h - 2} fill={COL_PEAK} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">{threshold}</text>
    </svg>
  );
};

// ── 3. TransferCurve — input vs output for a Float32Array waveshaper curve ──
// `curve` is the same Float32Array passed to WaveShaperNode.curve. Plotting
// it as (i/N → curve[i]) gives the static distortion shape so users see
// hard clip vs soft knee vs asymmetric saturation at a glance.
export const TransferCurve = ({ curve = null, size = "default" }) => {
  const s = SIZES[size] || SIZES.default;
  const N = 128;  // downsample for SVG clarity
  const path = useMemo(() => {
    if (!curve || !curve.length) return "";
    const stride = Math.max(1, Math.floor(curve.length / N));
    const pts = [];
    for (let i = 0; i < curve.length; i += stride) {
      const xN = i / (curve.length - 1);          // 0..1
      const yN = (curve[i] + 1) / 2;              // map -1..1 to 0..1
      const x = xN * s.w;
      const y = s.h - yN * s.h;
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return pts.join(" ");
  }, [curve, s.w, s.h]);
  return (
    <svg width={s.w} height={s.h} style={{ background: COL_BG, borderRadius: 3, display: "block" }}>
      {/* unity reference */}
      <line x1={0} y1={s.h} x2={s.w} y2={0} stroke={COL_GRID} strokeWidth={0.5} strokeDasharray="2 2" />
      {/* mid-axis crosshair */}
      <line x1={0} y1={s.h / 2} x2={s.w} y2={s.h / 2} stroke={COL_GRID} strokeWidth={0.5} />
      <line x1={s.w / 2} y1={0} x2={s.w / 2} y2={s.h} stroke={COL_GRID} strokeWidth={0.5} />
      <path d={path} stroke={COL_DATA} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      <text x={2} y={s.fontSize + 1} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">+1</text>
      <text x={2} y={s.h - 2} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">−1</text>
    </svg>
  );
};

// ── 4. ImpulseResponse — decay envelope from an AudioBuffer or params ──────
// Pass either `buffer` (an AudioBuffer — uses channel 0) or `decay` (seconds,
// generates an exponentially-decaying noise envelope to visualize).
// Useful for convolution reverbs that already have a buffer, OR for
// algorithmic reverbs where we just want to convey "this is the decay shape."
export const ImpulseResponse = ({ buffer = null, decay = 1.0, size = "default" }) => {
  const s = SIZES[size] || SIZES.default;
  const N = 256;
  const samples = useMemo(() => {
    if (buffer && buffer.length) {
      const ch = buffer.getChannelData(0);
      const stride = Math.max(1, Math.floor(ch.length / N));
      const out = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        // peak-of-window for a meaningful waveform shape
        let p = 0;
        for (let j = 0; j < stride; j++) { const v = Math.abs(ch[i * stride + j] || 0); if (v > p) p = v; }
        out[i] = p;
      }
      return out;
    }
    // Algorithmic: noise burst with exp decay over `decay` seconds.
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.max(0.05, decay);
      out[i] = Math.exp(-t * 3) * (0.4 + Math.random() * 0.6);
    }
    return out;
  }, [buffer, decay]);
  const path = useMemo(() => {
    const mid = s.h / 2;
    let upper = "M 0 " + mid, lower = "L " + s.w + " " + mid;
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * s.w;
      const yU = mid - samples[i] * mid * 0.95;
      const yL = mid + samples[i] * mid * 0.95;
      upper += ` L ${x.toFixed(2)} ${yU.toFixed(2)}`;
      lower = ` L ${x.toFixed(2)} ${yL.toFixed(2)} ${lower}`;
    }
    return upper + lower + " Z";
  }, [samples, s.w, s.h]);
  return (
    <svg width={s.w} height={s.h} style={{ background: COL_BG, borderRadius: 3, display: "block" }}>
      <line x1={0} y1={s.h / 2} x2={s.w} y2={s.h / 2} stroke={COL_GRID} strokeWidth={0.5} />
      <path d={path} fill={COL_DATA} fillOpacity={0.4} stroke={COL_DATA} strokeWidth={0.8} />
      <text x={2} y={s.fontSize + 1} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">IR</text>
      {!buffer && <text x={s.w - 30} y={s.fontSize + 1} fill={COL_LABEL} fontSize={s.fontSize} fontFamily="JetBrains Mono, monospace">{decay.toFixed(1)}s</text>}
    </svg>
  );
};

export default { SpectrumAnalyzer, GainReductionMeter, TransferCurve, ImpulseResponse };
