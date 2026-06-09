// ============================================================
// useAnalyserValue.js — rAF poll an AnalyserNode → 0..1 value.
//
// Drives a meter primitive (LEDLadder/VUMeter) from live audio.
// The meter primitives smooth internally (~30%/frame spring),
// so do NOT smooth here — emit raw RMS or peak.
//
// Args:
//   source     AnalyserNode | (() => AnalyserNode | null | undefined)
//              Pass a getter when the node may not exist yet at mount
//              (e.g. plugin instance registers async via liveInstancesRef).
//   opts:
//     mode     "rms" | "peak"  (default "rms")
//     scale    number          multiplier on the raw 0..1 RMS/peak,
//                              clamped at 1. Default 6 — matches the
//                              track strip dB ladder (see RecordingStudio
//                              meterAnimation rAF loop). Lower = headroom.
//
// Returns: number in [0, 1]. 0 if source is null or unavailable.
// ============================================================

import { useEffect, useRef, useState } from "react";

export default function useAnalyserValue(source, opts = {}) {
  const { mode = "rms", scale = 6 } = opts;
  const [value, setValue] = useState(0);
  // Ref-stabilized source so caller passing inline getter `() => instance?.meters?.x`
  // doesn't restart the rAF on every parent re-render.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    let raf = 0;
    let mounted = true;
    let buf = null;

    const tick = () => {
      if (!mounted) return;
      const s = sourceRef.current;
      const node = typeof s === "function" ? s() : s;
      if (!node || typeof node.getFloatTimeDomainData !== "function") {
        setValue(0);
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!buf || buf.length !== node.fftSize) buf = new Float32Array(node.fftSize);
      try { node.getFloatTimeDomainData(buf); }
      catch { raf = requestAnimationFrame(tick); return; }
      let v;
      if (mode === "peak") {
        let max = 0;
        for (let i = 0; i < buf.length; i++) {
          const a = buf[i] < 0 ? -buf[i] : buf[i];
          if (a > max) max = a;
        }
        v = max;
      } else {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        v = Math.sqrt(sum / buf.length);
      }
      const norm = v * scale;
      setValue(norm > 1 ? 1 : norm < 0 ? 0 : norm);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode, scale]);

  return value;
}
