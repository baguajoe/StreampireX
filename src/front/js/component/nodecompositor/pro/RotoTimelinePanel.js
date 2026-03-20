import React, { useMemo, useState } from "react";
import { interpolateRotoKeyframes } from "../../../utils/compositor/pro/frameByFrameRoto";

export default function RotoTimelinePanel() {
  const [keyframes] = useState([
    { frame: 0, points: [{ x: 100, y: 100 }, { x: 180, y: 100 }, { x: 180, y: 180 }, { x: 100, y: 180 }] },
    { frame: 20, points: [{ x: 130, y: 110 }, { x: 210, y: 105 }, { x: 205, y: 190 }, { x: 120, y: 195 }] },
  ]);

  const timeline = useMemo(() => interpolateRotoKeyframes(keyframes, 30), [keyframes]);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Roto Timeline</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
        Interpolated Frames: {timeline.length}
      </div>
      <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", margin: 0 }}>
{JSON.stringify(timeline.slice(0, 5), null, 2)}
      </pre>
    </div>
  );
}
