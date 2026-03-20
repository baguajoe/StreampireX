import React, { useRef, useState } from "react";
import {
  createEmptyRotoShape,
  addRotoPoint,
} from "../../../utils/compositor/pro/rotoEditor";

export default function RotoOverlayEditor({
  shape,
  setShape,
  width = 640,
  height = 360,
}) {
  const wrapRef = useRef(null);
  const [localShape, setLocalShape] = useState(shape || createEmptyRotoShape());

  const sync = (next) => {
    setLocalShape(next);
    setShape?.(next);
  };

  const onClick = (e) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sync(addRotoPoint(localShape, x, y));
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Roto Overlay Editor</div>
      <div
        ref={wrapRef}
        className="spx-roto-stage"
        style={{ width, height }}
        onClick={onClick}
      >
        <svg width={width} height={height} className="spx-roto-svg">
          {(localShape.points || []).length > 0 && (
            <>
              <path
                d={
                  "M " +
                  localShape.points
                    .map((p) => `${p.x} ${p.y}`)
                    .join(" L ") +
                  (localShape.closed ? " Z" : "")
                }
                className="spx-roto-path"
              />
              {(localShape.points || []).map((p, idx) => (
                <circle key={idx} cx={p.x} cy={p.y} r="4" className="spx-roto-point" />
              ))}
            </>
          )}
        </svg>
      </div>
      <div style={{ fontSize: 12, opacity: 0.74, marginTop: 8 }}>
        Click to add roto points.
      </div>
    </div>
  );
}
