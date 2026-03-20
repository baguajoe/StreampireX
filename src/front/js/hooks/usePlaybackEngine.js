// src/front/js/hooks/usePlaybackEngine.js
// SPX Motion — Frame-accurate playback engine with RAF + scrubbing

import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../store/useEditorStore";

export default function usePlaybackEngine() {
  const rafRef   = useRef(null);
  const lastRef  = useRef(null);
  const stateRef = useRef(null);

  const timeline   = useEditorStore(s => s.timeline);
  const setTime    = useEditorStore(s => s.setTime);
  const setPlaying = useEditorStore(s => s.setPlaying);

  // Keep ref current so RAF closure has latest state without re-subscribing
  stateRef.current = { timeline, setTime };

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    lastRef.current = null;
  }, []);

  const tick = useCallback((now) => {
    const { timeline: tl, setTime: st } = stateRef.current;
    if (!tl.playing) { stop(); return; }

    if (!lastRef.current) lastRef.current = now;
    const dt = Math.min((now - lastRef.current) / 1000, 0.1); // cap at 100ms
    lastRef.current = now;

    let next = tl.currentTime + dt * (tl.speed ?? 1);

    if (next >= tl.duration) {
      if (tl.loop) {
        next = tl.loopStart ?? 0;
      } else {
        next = tl.duration;
        setPlaying(false);
        st(next);
        stop();
        return;
      }
    }

    if (next < 0) next = 0;
    st(next);
    rafRef.current = requestAnimationFrame(tick);
  }, [stop, setPlaying]);

  useEffect(() => {
    if (timeline.playing) {
      lastRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      stop();
    }
    return stop;
  }, [timeline.playing, tick, stop]);

  // Return scrub helper
  return {
    scrubTo: (t) => {
      setTime(Math.max(0, Math.min(t, timeline.duration)));
    },
    isPlaying: timeline.playing,
    currentTime: timeline.currentTime,
    duration: timeline.duration,
  };
}
