// ============================================================
// useGRMeter.js — rAF poll a DynamicsCompressorNode.reduction → 0..1.
//
// Native DynamicsCompressorNode exposes `reduction` (read-only dB,
// negative when compressing — e.g. -6 means 6 dB GR). Some browsers
// historically exposed it as an AudioParam; modern Chrome/Firefox
// return a number. Both forms handled.
//
// Args:
//   source    DynamicsCompressorNode | (() => DynamicsCompressorNode | null)
//             Pass a getter when the comp node lives behind a
//             liveInstancesRef lookup that may resolve after mount.
//   opts:
//     targetDb  number  dB of GR mapped to 1.0. Default 12 — matches
//                       typical hardware GR meter (LA-2A maxes at 12).
//                       Tighter ranges (6) emphasize subtle gluing;
//                       looser ranges (20) for limiters.
//
// Returns: number in [0, 1]. 0 if no compression or source unavailable.
// ============================================================

import { useEffect, useRef, useState } from "react";

export default function useGRMeter(source, opts = {}) {
  const { targetDb = 12 } = opts;
  const [value, setValue] = useState(0);
  // Ref-stabilized source so caller passing inline getter doesn't restart
  // the rAF on every parent re-render.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    let raf = 0;
    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      const s = sourceRef.current;
      const node = typeof s === "function" ? s() : s;
      if (!node) { setValue(0); raf = requestAnimationFrame(tick); return; }
      const rd = typeof node.reduction === "number"
        ? node.reduction
        : (node.reduction && typeof node.reduction.value === "number" ? node.reduction.value : 0);
      const grDb = rd < 0 ? -rd : 0;
      const norm = grDb / targetDb;
      setValue(norm > 1 ? 1 : norm < 0 ? 0 : norm);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [targetDb]);

  return value;
}
