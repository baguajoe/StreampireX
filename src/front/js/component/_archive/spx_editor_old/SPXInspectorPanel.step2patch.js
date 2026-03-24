
import React, { useState } from "react";
import * as Step2 from "./SPXStep2Features.js";

const SPXInspectorPanel = ({ editor }) => {

  const {
    tracks = [],
    selectedClipId,
    setTracks
  } = editor;

  const selectedClip = tracks
    .flatMap(t => t.clips || [])
    .find(c => c.id === selectedClipId);

  const [mask, setMask] = useState(null);
  const [shapeLayer, setShapeLayer] = useState(null);
  const [textAnimator, setTextAnimator] = useState(null);
  const [colorState, setColorState] = useState(Step2.SPX_COLOR_WHEELS);
  const [curvesState, setCurvesState] = useState(Step2.SPX_CURVES);

  const addMask = () => {
    setMask(
      Step2.createMask({
        feather: 12,
        points: []
      })
    );
  };

  const addShape = () => {
    setShapeLayer(
      Step2.createShapeLayer({
        shape: "rectangle",
        width: 400,
        height: 200
      })
    );
  };

  const addTextAnimator = () => {
    setTextAnimator(
      Step2.createTextAnimator({
        mode: "per-character"
      })
    );
  };

  const createCompoundClip = () => {
    const clips = tracks.flatMap(t => t.clips || []);
    const compound = Step2.createCompoundClip({ clips });

    setTracks(prev =>
      prev.map(t => ({
        ...t,
        clips: [compound]
      }))
    );
  };

  const autoReframe = () => {
    console.log(
      Step2.autoReframeStub({
        targetAspect: "9:16"
      })
    );
  };

  const detectScenes = () => {
    console.log(
      Step2.detectScenesStub([1,2,3,4])
    );
  };

  return (

    <div className="spx-panel">

      <div className="spx-section-title">
        Motion + Color Tools
      </div>

      <button onClick={addMask}>
        add mask
      </button>

      <button onClick={addShape}>
        add shape layer
      </button>

      <button onClick={addTextAnimator}>
        add text animator
      </button>

      <button onClick={createCompoundClip}>
        compound clip
      </button>

      <button onClick={autoReframe}>
        auto reframe
      </button>

      <button onClick={detectScenes}>
        detect scenes
      </button>

      <div>

        <h4>color wheels</h4>

        {Object.keys(colorState).map(k => (

          <div key={k}>
            {k}
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              onChange={e =>
                setColorState({
                  ...colorState,
                  [k]: {
                    r:e.target.value,
                    g:e.target.value,
                    b:e.target.value
                  }
                })
              }
            />
          </div>

        ))}

      </div>

      <div>

        <h4>curves</h4>

        {Object.keys(curvesState).map(k => (
          <div key={k}>{k}</div>
        ))}

      </div>

      {mask && <div>mask ready</div>}
      {shapeLayer && <div>shape ready</div>}
      {textAnimator && <div>text animator ready</div>}

    </div>

  );

};

export default SPXInspectorPanel;
