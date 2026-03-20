import React from "react";

export default function VFXToolPanel({
  vfxEnabled,
  setVfxEnabled,
  shaderQuality,
  setShaderQuality,
  globalEffects,
  setGlobalEffects,
}) {
  const set = (k, v) => setGlobalEffects((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="nc-panel">
      <div className="nc-panel-title">VFX Engine</div>

      <label className="nc-row">
        <input type="checkbox" checked={vfxEnabled} onChange={(e) => setVfxEnabled(e.target.checked)} />
        <span>Enable GPU VFX</span>
      </label>

      <label className="nc-field">
        <span>Shader Quality</span>
        <select value={shaderQuality} onChange={(e) => setShaderQuality(e.target.value)}>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </select>
      </label>

      <label className="nc-field"><span>Brightness</span>
        <input type="range" min="0" max="2" step="0.01" value={globalEffects.brightness} onChange={(e) => set("brightness", parseFloat(e.target.value))} />
      </label>

      <label className="nc-field"><span>Contrast</span>
        <input type="range" min="0" max="2" step="0.01" value={globalEffects.contrast} onChange={(e) => set("contrast", parseFloat(e.target.value))} />
      </label>

      <label className="nc-field"><span>Saturation</span>
        <input type="range" min="0" max="2" step="0.01" value={globalEffects.saturation} onChange={(e) => set("saturation", parseFloat(e.target.value))} />
      </label>

      <label className="nc-field"><span>Blur</span>
        <input type="range" min="0" max="1" step="0.01" value={globalEffects.blur} onChange={(e) => set("blur", parseFloat(e.target.value))} />
      </label>

      <label className="nc-row">
        <input type="checkbox" checked={globalEffects.chromaKey} onChange={(e) => set("chromaKey", e.target.checked)} />
        <span>Chroma Key</span>
      </label>

      <label className="nc-field"><span>Key Color</span>
        <input type="color" value={globalEffects.keyColor} onChange={(e) => set("keyColor", e.target.value)} />
      </label>

      <label className="nc-field"><span>Threshold</span>
        <input type="range" min="0" max="1" step="0.01" value={globalEffects.threshold} onChange={(e) => set("threshold", parseFloat(e.target.value))} />
      </label>

      <label className="nc-field"><span>Softness</span>
        <input type="range" min="0" max="1" step="0.01" value={globalEffects.softness} onChange={(e) => set("softness", parseFloat(e.target.value))} />
      </label>

      <label className="nc-field"><span>Merge Mix</span>
        <input type="range" min="0" max="1" step="0.01" value={globalEffects.mergeMix} onChange={(e) => set("mergeMix", parseFloat(e.target.value))} />
      </label>
    </div>
  );
}
