import React, { useMemo, useState, useRef, useEffect } from "react";
import { EASING, applyCurveStrength } from "./useKeyframeEngine";

const PROPS = ["positionX", "positionY", "scale", "rotation", "opacity"];

export default function MotionGraphEditorPanel({
  selectedLayer,
  currentTime,
  updateLayer,
  selectedKeyframeRef,
  setSelectedKeyframeRef
}) {
  const [selectedProp, setSelectedProp] = useState("positionX");
  const canvasRef = useRef(null);

  useEffect(() => {
    if (
      selectedKeyframeRef &&
      selectedKeyframeRef.layerId === selectedLayer?.id &&
      selectedKeyframeRef.prop
    ) {
      setSelectedProp(selectedKeyframeRef.prop);
    }
  }, [selectedKeyframeRef, selectedLayer?.id]);

  const track = useMemo(() => {
    return (selectedLayer?.keyframes?.[selectedProp] || [])
      .slice()
      .sort((a, b) => a.time - b.time);
  }, [selectedLayer, selectedProp]);

  const selectedSegmentIndex = useMemo(() => {
    if (!track.length || track.length < 2) return -1;

    if (
      selectedKeyframeRef &&
      selectedKeyframeRef.layerId === selectedLayer?.id &&
      selectedKeyframeRef.prop === selectedProp &&
      typeof selectedKeyframeRef.index === "number" &&
      selectedKeyframeRef.index > 0
    ) {
      return selectedKeyframeRef.index - 1;
    }

    for (let i = 0; i < track.length - 1; i++) {
      if (currentTime >= track[i].time && currentTime <= track[i + 1].time) {
        return i;
      }
    }
    return 0;
  }, [track, currentTime, selectedKeyframeRef, selectedLayer?.id, selectedProp]);

  const selectedSegment =
    selectedSegmentIndex >= 0 && track[selectedSegmentIndex + 1]
      ? {
          start: track[selectedSegmentIndex],
          end: track[selectedSegmentIndex + 1],
          easing: track[selectedSegmentIndex + 1].easing || "linear",
          curveStrength: track[selectedSegmentIndex + 1].curveStrength ?? 0.5,
          index: selectedSegmentIndex + 1
        }
      : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#11161d";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const x = (w / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0,255,200,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();

    if (!selectedSegment) return;

    const easingName = selectedSegment.easing;
    const curveStrength = selectedSegment.curveStrength ?? 0.5;

    ctx.strokeStyle = "#00ffc8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let px = 0; px <= w; px++) {
      const t = px / w;
      let eased;

      if (easingName === "easeIn" || easingName === "easeOut" || easingName === "easeInOut") {
        eased = applyCurveStrength(t, curveStrength, easingName);
      } else {
        const easingFn = EASING[easingName] || EASING.linear;
        eased = easingFn(t);
      }

      const y = h - eased * h;
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#ffb020";
    ctx.beginPath();
    ctx.arc(0, h, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(w, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [selectedSegment]);

  const updateSegment = (patch) => {
    if (!selectedLayer || !selectedSegment) return;

    const keyframes = { ...(selectedLayer.keyframes || {}) };
    const nextTrack = [...track];
    nextTrack[selectedSegment.index] = {
      ...nextTrack[selectedSegment.index],
      ...patch
    };
    keyframes[selectedProp] = nextTrack;
    updateLayer(selectedLayer.id, { keyframes });

    if (setSelectedKeyframeRef) {
      setSelectedKeyframeRef({
        layerId: selectedLayer.id,
        prop: selectedProp,
        index: selectedSegment.index
      });
    }
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Graph Editor</div>

      {!selectedLayer ? (
        <div className="motion-dim">Select a layer</div>
      ) : (
        <>
          <label>Property</label>
          <select value={selectedProp} onChange={(e) => setSelectedProp(e.target.value)}>
            {PROPS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div className="motion-graph-meta">
            {selectedSegment ? (
              <>
                <span>Segment: {selectedSegment.start.time.toFixed(2)}s → {selectedSegment.end.time.toFixed(2)}s</span>
                <span>Easing: {selectedSegment.easing}</span>
              </>
            ) : (
              <span>Add at least 2 keyframes on this property</span>
            )}
          </div>

          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="motion-graph-canvas"
          />

          <div className="motion-chip-grid" style={{ marginTop: 10 }}>
            {Object.keys(EASING).map((ease) => (
              <button
                key={ease}
                className={selectedSegment?.easing === ease ? "active" : ""}
                onClick={() => updateSegment({ easing: ease })}
                disabled={!selectedSegment}
              >
                {ease}
              </button>
            ))}
          </div>

          {selectedSegment &&
            (selectedSegment.easing === "easeIn" ||
              selectedSegment.easing === "easeOut" ||
              selectedSegment.easing === "easeInOut") && (
              <>
                <label style={{ marginTop: 10 }}>Curve Strength</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedSegment.curveStrength ?? 0.5}
                  onChange={(e) =>
                    updateSegment({ curveStrength: parseFloat(e.target.value) })
                  }
                />
                <div className="motion-dim">
                  {(selectedSegment.curveStrength ?? 0.5).toFixed(2)}
                </div>
              </>
            )}
        </>
      )}
    </div>
  );
}
