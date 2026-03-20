import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/useEditorStore";

export default function usePlaybackEngine() {
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const timeline = useEditorStore((s) => s.timeline);
  const setTime = useEditorStore((s) => s.setTime);

  useEffect(() => {
    const loop = (now) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;

      if (timeline.playing) {
        let next = timeline.currentTime + dt;
        if (timeline.loop) {
          next = next >= timeline.duration ? 0 : next;
        } else {
          next = Math.min(next, timeline.duration);
        }
        setTime(next);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timeline.playing, timeline.currentTime, timeline.duration, timeline.loop, setTime]);
}
