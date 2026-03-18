import React from "react";
import { KeyframeEditor } from "../VideoEditorMotion";

export default function MotionKeyframePanel({
  selectedLayer,
  currentTime,
  duration,
  addKeyframeToSelected,
  removeKeyframeFromSelected
}) {
  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Keyframes</div>

      {selectedLayer ? (
        <>
          <div className="motion-mini-actions">
            <button onClick={() => addKeyframeToSelected("opacity", 0)}>Opacity 0</button>
            <button onClick={() => addKeyframeToSelected("opacity", 1)}>Opacity 1</button>
            <button onClick={() => addKeyframeToSelected("scaleX", 1.2)}>Scale X</button>
            <button onClick={() => addKeyframeToSelected("scaleY", 1.2)}>Scale Y</button>
            <button onClick={() => addKeyframeToSelected("rotation", 15)}>Rotate</button>
          </div>

          <KeyframeEditor
            clipId={selectedLayer.id}
            keyframes={selectedLayer.keyframes || []}
            duration={duration}
            currentTime={currentTime}
            onAdd={(clipId, keyframe) => {
              addKeyframeToSelected(keyframe.property, keyframe.value, keyframe.easing);
            }}
            onRemove={(clipId, keyframeId) => {
              removeKeyframeFromSelected(keyframeId);
            }}
          />
        </>
      ) : (
        <div className="motion-dim">Select a layer</div>
      )}
    </div>
  );
}
