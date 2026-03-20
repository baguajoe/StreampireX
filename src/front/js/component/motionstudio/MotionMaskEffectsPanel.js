import React from "react";
import useMotionLayerFX from "./engine/useMotionLayerFX";

export default function MotionMaskEffectsPanel({ selectedLayer, updateLayer }) {
  const { current, updateMask, updateEffects } = useMotionLayerFX({
    selectedLayer,
    updateLayer,
  });

  if (!selectedLayer || !current) {
    return (
      <div className="motion-panel">
        <div className="motion-panel-title">Mask + Effects</div>
        <div className="motion-dim">Select a layer</div>
      </div>
    );
  }

  const { mask, effects } = current;

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Mask + Effects</div>

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={!!mask.enabled}
            onChange={(e) => updateMask({ enabled: e.target.checked })}
          />
          {" "}Enable Mask
        </label>

        <label>
          Shape
          <select
            value={mask.shape}
            onChange={(e) => updateMask({ shape: e.target.value })}
          >
            <option value="rectangle">Rectangle</option>
            <option value="ellipse">Ellipse</option>
          </select>
        </label>

        <label>
          Mask X
          <input
            type="number"
            value={mask.x}
            onChange={(e) => updateMask({ x: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Mask Y
          <input
            type="number"
            value={mask.y}
            onChange={(e) => updateMask({ y: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Mask Width
          <input
            type="number"
            value={mask.width}
            onChange={(e) => updateMask({ width: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Mask Height
          <input
            type="number"
            value={mask.height}
            onChange={(e) => updateMask({ height: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Feather
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={mask.feather}
            onChange={(e) => updateMask({ feather: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={!!mask.invert}
            onChange={(e) => updateMask({ invert: e.target.checked })}
          />
          {" "}Invert Mask
        </label>

        <hr style={{ borderColor: "rgba(255,255,255,0.08)", width: "100%" }} />

        <label>
          Blur
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={effects.blur}
            onChange={(e) => updateEffects({ blur: parseFloat(e.target.value || 0) })}
          />
        </label>

        <label>
          Brightness
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={effects.brightness}
            onChange={(e) => updateEffects({ brightness: parseFloat(e.target.value || 100) })}
          />
        </label>

        <label>
          Contrast
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={effects.contrast}
            onChange={(e) => updateEffects({ contrast: parseFloat(e.target.value || 100) })}
          />
        </label>

        <label>
          Saturation
          <input
            type="range"
            min="0"
            max="200"
            step="1"
            value={effects.saturation}
            onChange={(e) => updateEffects({ saturation: parseFloat(e.target.value || 100) })}
          />
        </label>
      </div>
    </div>
  );
}
