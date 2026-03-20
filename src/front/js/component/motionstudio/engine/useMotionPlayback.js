import { useEffect, useRef } from "react";

export default function useMotionPlayback({
  isPlaying,
  currentTime,
  setCurrentTime,
  duration,
  loopRegion,
}) {
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
      return;
    }

    const tick = (ts) => {
      if (lastRef.current == null) {
        lastRef.current = ts;
      }

      const delta = (ts - lastRef.current) / 1000;
      lastRef.current = ts;

      setCurrentTime((prev) => {
        let next = prev + delta;

        if (loopRegion?.enabled) {
          const start = loopRegion.start ?? 0;
          const end = loopRegion.end ?? duration ?? 0;
          if (next > end) next = start;
        } else if (next > duration) {
          next = 0;
        }

        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [isPlaying, setCurrentTime, duration, loopRegion, currentTime]);
}
