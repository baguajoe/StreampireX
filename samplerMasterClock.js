// =============================================================================
// samplerMasterClock.js — Shared master clock for SPX sampler tabs
// All tabs can subscribe. When linked, they fire on master steps.
// Usage:
//   const clock = useSamplerMasterClock(bpm, playing);
//   <SPX60Tab masterClock={clock} ... />
// =============================================================================
import { useRef, useCallback, useEffect } from 'react';

export function useSamplerMasterClock(bpm, playing) {
  const subscribersRef = useRef(new Set());
  const stepRef        = useRef(0);
  const playRef        = useRef(false);
  const timerRef       = useRef(null);
  const bpmRef         = useRef(bpm);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const broadcast = useCallback((step) => {
    subscribersRef.current.forEach(fn => {
      try { fn({ step, bpm: bpmRef.current }); } catch (_) {}
    });
  }, []);

  const tick = useCallback(() => {
    if (!playRef.current) return;
    const s = stepRef.current;
    broadcast(s);
    stepRef.current = s + 1;
    const stepMs = (60000 / bpmRef.current) / 4;
    timerRef.current = setTimeout(tick, stepMs);
  }, [broadcast]);

  useEffect(() => {
    if (playing) {
      if (!playRef.current) {
        stepRef.current = 0;
        playRef.current = true;
        tick();
      }
    } else {
      playRef.current = false;
      clearTimeout(timerRef.current);
    }
  }, [playing, tick]);

  const subscribe = useCallback((fn) => {
    subscribersRef.current.add(fn);
    return () => subscribersRef.current.delete(fn); // returns unsub fn
  }, []);

  return { subscribe, bpm, playing };
}
