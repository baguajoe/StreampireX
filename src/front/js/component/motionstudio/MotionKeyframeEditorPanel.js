import React, { useMemo, useState, useEffect } from "react";

const PROPS = ["positionX", "positionY", "scale", "rotation", "opacity"];
const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut", "bounce"];

export default function MotionKeyframeEditorPanel({
  selectedLayer,
  currentTime,
  updateLayer,
  selectedKeyframeRef,
  setSelectedKeyframeRef
}) {
  const [selectedProp, setSelectedProp] = useState("positionX");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const track = useMemo(() => {
    return (selectedLayer?.keyframes?.[selectedProp] || [])
      .slice()
      .sort((a, b) => a.time - b.time);
  }, [selectedLayer, selectedProp]);

  useEffect(() => {
    if (
      selectedKeyframeRef &&
      selectedKeyframeRef.layerId === selectedLayer?.id &&
      selectedKeyframeRef.prop
    ) {
      setSelectedProp(selectedKeyframeRef.prop);
      setSelectedIndex(selectedKeyframeRef.index ?? 0);
    } else {
      setSelectedIndex(0);
    }
  }, [selectedKeyframeRef, selectedLayer?.id]);

  useEffect(() => {
    if (selectedLayer && setSelectedKeyframeRef) {
      setSelectedKeyframeRef((prev) => {
        if (!prev || prev.layerId !== selectedLayer.id) return prev;
        return { ...prev, prop: selectedProp, index: selectedIndex };
      });
    }
  }, [selectedProp, selectedIndex, selectedLayer, setSelectedKeyframeRef]);

  const selectedKeyframe = track[selectedIndex] || null;

  const patchTrack = (nextTrack) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      keyframes: {
        ...(selectedLayer.keyframes || {}),
        [selectedProp]: nextTrack
      }
    });
  };

  const updateSelected = (patch) => {
    if (!selectedKeyframe) return;
    const nextTrack = [...track];
    nextTrack[selectedIndex] = { ...nextTrack[selectedIndex], ...patch };
    nextTrack.sort((a, b) => a.time - b.time);
    patchTrack(nextTrack);
  };

  const deleteSelected = () => {
    if (!selectedKeyframe) return;
    const nextTrack = track.filter((_, i) => i !== selectedIndex);
    patchTrack(nextTrack);
    setSelectedIndex(0);
  };

  const addAtPlayhead = () => {
    if (!selectedLayer) return;

    let value = 0;
    if (selectedProp === "scale") value = selectedLayer.scale ?? 1;
    if (selectedProp === "rotation") value = selectedLayer.rotation ?? 0;
    if (selectedProp === "opacity") value = selectedLayer.opacity ?? 1;

    const nextTrack = [
      ...track,
      { time: currentTime, value, easing: "linear", curveStrength: 0.5 }
    ].sort((a, b) => a.time - b.time);

    patchTrack(nextTrack);

    const idx = nextTrack.findIndex((kf) => kf.time === currentTime && kf.value === value);
    setSelectedIndex(idx >= 0 ? idx : 0);

    if (setSelectedKeyframeRef) {
      setSelectedKeyframeRef({
        layerId: selectedLayer.id,
        prop: selectedProp,
        index: idx >= 0 ? idx : 0
      });
    }
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Keyframe Editor</div>

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

          <div className="motion-mini-actions" style={{ marginTop: 10 }}>
            <button onClick={addAtPlayhead}>+ Add at Playhead</button>
          </div>

          <label style={{ marginTop: 10 }}>Keyframes</label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(parseInt(e.target.value, 10))}
            disabled={!track.length}
          >
            {track.map((kf, i) => (
              <option key={`${kf.time}_${i}`} value={i}>
                {i + 1}. {kf.time.toFixed(2)}s → {String(kf.value)} [{kf.easing || "linear"}]
              </option>
            ))}
          </select>

          {selectedKeyframe ? (
            <>
              <div className="motion-grid-2">
                <div>
                  <label>Time</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedKeyframe.time}
                    onChange={(e) => updateSelected({ time: parseFloat(e.target.value || 0) })}
                  />
                </div>
                <div>
                  <label>Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedKeyframe.value}
                    onChange={(e) => updateSelected({ value: parseFloat(e.target.value || 0) })}
                  />
                </div>
              </div>

              <label>Easing</label>
              <select
                value={selectedKeyframe.easing || "linear"}
                onChange={(e) => updateSelected({ easing: e.target.value })}
              >
                {EASINGS.map((ease) => (
                  <option key={ease} value={ease}>{ease}</option>
                ))}
              </select>

              {(selectedKeyframe.easing === "easeIn" ||
                selectedKeyframe.easing === "easeOut" ||
                selectedKeyframe.easing === "easeInOut") && (
                <>
                  <label>Curve Strength</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedKeyframe.curveStrength ?? 0.5}
                    onChange={(e) =>
                      updateSelected({ curveStrength: parseFloat(e.target.value) })
                    }
                  />
                  <div className="motion-dim">
                    {(selectedKeyframe.curveStrength ?? 0.5).toFixed(2)}
                  </div>
                </>
              )}

              <div className="motion-mini-actions" style={{ marginTop: 10 }}>
                <button onClick={deleteSelected}>Delete Keyframe</button>
              </div>
            </>
          ) : (
            <div className="motion-dim" style={{ marginTop: 10 }}>
              No keyframes for this property yet
            </div>
          )}
        </>
      )}
    </div>
  );
}
