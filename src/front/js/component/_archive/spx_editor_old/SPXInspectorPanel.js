import React, { useState } from "react";
import * as Step2 from "./SPXStep2Features.js";
import * as Step1 from "./SPXStep1Features.js";

const SPXInspectorPanel = ({ editor }) => {
  const { tracks = [], selectedClipId, setTracks, saveCurrentPreset } = editor;

  const selectedClip = tracks
    .flatMap((track) => track.clips || [])
    .find((clip) => clip.id === selectedClipId);

  const [mask, setMask] = useState(null);
  const [shapeLayer, setShapeLayer] = useState(null);
  const [textAnimator, setTextAnimator] = useState(null);
  const [colorState, setColorState] = useState(Step2.SPX_COLOR_WHEELS);
  const [curvesState] = useState(Step2.SPX_CURVES);
  const [blendMode, setBlendMode] = useState(selectedClip?.blendMode || "normal");

  const updateSelectedClip = (updater) => {
    if (!selectedClipId) return;
    setTracks((prev) =>
      prev.map((track) => ({
        ...track,
        clips: (track.clips || []).map((clip) =>
          clip.id === selectedClipId ? updater(clip) : clip
        )
      }))
    );
  };

  const addMask = () => {
    const nextMask = Step2.createMask({ feather: 12, points: [] });
    setMask(nextMask);
    updateSelectedClip((clip) => ({
      ...clip,
      masks: [...(clip.masks || []), nextMask]
    }));
  };

  const addShape = () => {
    const nextShape = Step2.createShapeLayer({ shape: "rectangle", width: 400, height: 200 });
    setShapeLayer(nextShape);
    updateSelectedClip((clip) => ({
      ...clip,
      shapes: [...(clip.shapes || []), nextShape]
    }));
  };

  const addTextAnimator = () => {
    const nextAnimator = Step2.createTextAnimator({ mode: "per-character" });
    setTextAnimator(nextAnimator);
    updateSelectedClip((clip) => ({
      ...clip,
      textAnimators: [...(clip.textAnimators || []), nextAnimator]
    }));
  };

  const applyBlendMode = (mode) => {
    setBlendMode(mode);
    updateSelectedClip((clip) => Step1.applyBlendModeToClip(clip, mode));
  };

  const createCompoundClip = () => {
    const clips = tracks.flatMap((t) => t.clips || []);
    const compound = Step2.createCompoundClip({ clips });
    setTracks((prev) =>
      prev.map((t, idx) =>
        idx === 0 ? { ...t, clips: [compound] } : { ...t, clips: [] }
      )
    );
  };

  return (
    <div className="spx-editor-right-stack">
      <div className="spx-panel">
        <div className="spx-section-title">Inspector</div>

        {selectedClip ? (
          <>
            <div className="spx-inspector-block">
              <div className="spx-inspector-label">Selected Clip</div>
              <div className="spx-inspector-value">{selectedClip.name}</div>
            </div>

            <div className="spx-inspector-group">
              <label>Blend Mode</label>
              <select className="spx-workspace-select" value={blendMode} onChange={(e) => applyBlendMode(e.target.value)}>
                {Step1.SPX_BLEND_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>

            <div className="spx-inspector-group">
              <label>Save Preset</label>
              <button className="spx-header-btn" onClick={() => saveCurrentPreset(`${selectedClip.name} Preset`)}>
                Save Current Preset
              </button>
            </div>
          </>
        ) : (
          <div className="spx-empty">Select a clip to inspect</div>
        )}
      </div>

      <div className="spx-panel">
        <div className="spx-section-title">Motion + Color Tools</div>

        <div className="spx-inspector-group">
          <button className="spx-header-btn" onClick={addMask}>Add Mask</button>
          <button className="spx-header-btn" onClick={addShape}>Add Shape Layer</button>
          <button className="spx-header-btn" onClick={addTextAnimator}>Add Text Animator</button>
          <button className="spx-header-btn" onClick={createCompoundClip}>Compound Clip</button>
        </div>

        <div className="spx-inspector-block">
          <div className="spx-inspector-label">Color Wheels</div>
          {Object.keys(colorState).map((k) => (
            <div key={k} className="spx-inspector-group">
              <label>{k}</label>
              <input
                className="spx-input"
                type="range"
                min="-1"
                max="1"
                step="0.01"
                onChange={(e) =>
                  setColorState({
                    ...colorState,
                    [k]: { r: e.target.value, g: e.target.value, b: e.target.value }
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="spx-inspector-block">
          <div className="spx-inspector-label">Curves</div>
          <div className="spx-inspector-value">{Object.keys(curvesState).join(", ")}</div>
        </div>

        {mask && <div className="spx-effect-source">Mask ready</div>}
        {shapeLayer && <div className="spx-effect-source">Shape layer ready</div>}
        {textAnimator && <div className="spx-effect-source">Text animator ready</div>}
      </div>
    </div>
  );
};

export default SPXInspectorPanel;
