import React, { useMemo } from "react";
import useMotionGraphEditor from "./engine/useMotionGraphEditor";

const PROPS = ["positionX", "positionY", "scale", "rotation", "opacity"];

export default function MotionGraphEditorV2({
  selectedLayer,
  updateLayer,
}) {
  const {
    selectedProp,
    setSelectedProp,
    selectedKeyframeId,
    setSelectedKeyframeId,
    track,
    sampled,
    updateSelectedKeyframe,
  } = useMotionGraphEditor({
    selectedLayer,
    updateLayer,
    defaultProp: "opacity",
  });

  const bounds = useMemo(() => {
    if (!track.length) return { minT: 0, maxT: 5, minV: 0, maxV: 100 };
    const times = track.map((k) => k.time);
    const values = track.map((k) => k.value);
    const minT = Math.min(...times);
    const maxT = Math.max(...times, minT + 1);
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, minV + 1);
    return { minT, maxT, minV, maxV };
  }, [track]);

  const width = 640;
  const height = 260;
  const pad = 32;

  const toX = (t) => {
    const span = Math.max(0.0001, bounds.maxT - bounds.minT);
    return pad + ((t - bounds.minT) / span) * (width - pad * 2);
  };

  const toY = (v) => {
    const span = Math.max(0.0001, bounds.maxV - bounds.minV);
    return height - pad - ((v - bounds.minV) / span) * (height - pad * 2);
  };

  const pathD = sampled.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.time)} ${toY(p.value)}`).join(" ");

  if (!selectedLayer) {
    return (
      <div className="motion-panel">
        <div className="motion-panel-title">Graph Editor</div>
        <div className="motion-dim">Select a layer</div>
      </div>
    );
  }

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Graph Editor V2</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <select value={selectedProp} onChange={(e) => setSelectedProp(e.target.value)}>
          {PROPS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {selectedKeyframeId && (
          <>
            <button onClick={() => updateSelectedKeyframe({ curveStrength: 0.15 })}>Curve 15%</button>
            <button onClick={() => updateSelectedKeyframe({ curveStrength: 0.33 })}>Curve 33%</button>
            <button onClick={() => updateSelectedKeyframe({ curveStrength: 0.66 })}>Curve 66%</button>
          </>
        )}
      </div>

      <svg
        width={width}
        height={height}
        style={{
          width: "100%",
          maxWidth: width,
          background: "#0d1524",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          display: "block",
        }}
      >
        <rect x="0" y="0" width={width} height={height} fill="#0d1524" />
        <path d={pathD} fill="none" stroke="#00ffc8" strokeWidth="3" />

        {track.map((kf) => {
          const active = selectedKeyframeId === kf.id;
          return (
            <g key={kf.id}>
              <circle
                cx={toX(kf.time)}
                cy={toY(kf.value)}
                r={active ? 8 : 6}
                fill={active ? "#ff8a00" : "#ffffff"}
                stroke="#0b1220"
                strokeWidth="2"
                onClick={() => setSelectedKeyframeId(kf.id)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}
      </svg>

      {selectedKeyframeId && (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <label>
            Time
            <input
              type="number"
              step="0.1"
              value={track.find((k) => k.id === selectedKeyframeId)?.time ?? 0}
              onChange={(e) => updateSelectedKeyframe({ time: parseFloat(e.target.value || 0) })}
            />
          </label>

          <label>
            Value
            <input
              type="number"
              step="0.1"
              value={track.find((k) => k.id === selectedKeyframeId)?.value ?? 0}
              onChange={(e) => updateSelectedKeyframe({ value: parseFloat(e.target.value || 0) })}
            />
          </label>

          <label>
            Curve Strength
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.find((k) => k.id === selectedKeyframeId)?.curveStrength ?? 0.33}
              onChange={(e) => updateSelectedKeyframe({ curveStrength: parseFloat(e.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
