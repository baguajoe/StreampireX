import React from "react";

const NumberField = ({ label, value, onChange, step = 1, min, max }) => (
  <div className="spx-inspector-group">
    <label>{label}</label>
    <input
      className="spx-input"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value || 0))}
    />
    <div className="spx-inspector-value">{value}</div>
  </div>
);

const SPXEditorInspector = ({ editor }) => {
  const {
    selectedClip,
    selectedTrack,
    updateSelectedClipProperty,
    removePresetFromSelectedClip,
    removeEffectFromSelectedClip,
    removeTransitionFromSelectedClip
  } = editor;

  if (!selectedClip) {
    return (
      <aside className="spx-editor-inspector">
        <div className="spx-editor-panel-header">
          <span>Effects Controls</span>
        </div>
        <div className="spx-panel">
          <div className="spx-empty">Select a clip to edit video/audio controls</div>
        </div>
      </aside>
    );
  }

  const transform = selectedClip.transform || {};
  const color = selectedClip.colorAdjustments || {};
  const volume = selectedClip.volume ?? 1;
  const pan = selectedClip.pan ?? 0;

  return (
    <aside className="spx-editor-inspector">
      <div className="spx-editor-panel-header">
        <span>Effects Controls</span>
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Selected Clip</div>
        <div className="spx-selection-hint">{selectedClip.name}</div>
        <div className="spx-selection-hint">Track: {selectedTrack?.name || "Unknown"}</div>
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Video</div>
        <NumberField label="Position X" value={transform.x ?? 0} min={-1000} max={1000} onChange={(v) => updateSelectedClipProperty(["transform", "x"], v)} />
        <NumberField label="Position Y" value={transform.y ?? 0} min={-1000} max={1000} onChange={(v) => updateSelectedClipProperty(["transform", "y"], v)} />
        <NumberField label="Scale" value={transform.scale ?? 100} min={0} max={300} onChange={(v) => updateSelectedClipProperty(["transform", "scale"], v)} />
        <NumberField label="Rotation" value={transform.rotation ?? 0} min={-180} max={180} onChange={(v) => updateSelectedClipProperty(["transform", "rotation"], v)} />
        <NumberField label="Opacity" value={transform.opacity ?? 100} min={0} max={100} onChange={(v) => updateSelectedClipProperty(["transform", "opacity"], v)} />
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Basic Color</div>
        <NumberField label="Exposure" value={color.exposure ?? 0} min={-5} max={5} step={0.1} onChange={(v) => updateSelectedClipProperty(["colorAdjustments", "exposure"], v)} />
        <NumberField label="Contrast" value={color.contrast ?? 0} min={-100} max={100} onChange={(v) => updateSelectedClipProperty(["colorAdjustments", "contrast"], v)} />
        <NumberField label="Saturation" value={color.saturation ?? 100} min={0} max={200} onChange={(v) => updateSelectedClipProperty(["colorAdjustments", "saturation"], v)} />
        <NumberField label="Temperature" value={color.temperature ?? 0} min={-100} max={100} onChange={(v) => updateSelectedClipProperty(["colorAdjustments", "temperature"], v)} />
        <NumberField label="Tint" value={color.tint ?? 0} min={-100} max={100} onChange={(v) => updateSelectedClipProperty(["colorAdjustments", "tint"], v)} />
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Audio</div>
        <NumberField label="Volume" value={volume} min={0} max={2} step={0.01} onChange={(v) => updateSelectedClipProperty(["volume"], v)} />
        <NumberField label="Pan" value={pan} min={-1} max={1} step={0.01} onChange={(v) => updateSelectedClipProperty(["pan"], v)} />
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Presets</div>
        {(selectedClip.presets || []).length === 0 ? (
          <div className="spx-empty">No presets applied</div>
        ) : (
          (selectedClip.presets || []).map((preset) => (
            <div key={preset.id} className="spx-effect-chip">
              <span>{preset.name}</span>
              <button className="spx-mini-action" type="button" onClick={() => removePresetFromSelectedClip(preset.id)}>Remove</button>
            </div>
          ))
        )}
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Effects</div>
        {(selectedClip.effects || []).length === 0 ? (
          <div className="spx-empty">No effects applied</div>
        ) : (
          (selectedClip.effects || []).map((effect) => (
            <div key={effect.id} className="spx-effect-chip">
              <span>{effect.name}</span>
              <button className="spx-mini-action" type="button" onClick={() => removeEffectFromSelectedClip(effect.id)}>Remove</button>
            </div>
          ))
        )}
      </div>

      <div className="spx-panel">
        <div className="spx-panel-title">Transitions</div>
        {(selectedClip.transitions || []).length === 0 ? (
          <div className="spx-empty">No transitions applied</div>
        ) : (
          (selectedClip.transitions || []).map((transition) => (
            <div key={transition.id} className="spx-effect-chip">
              <span>{transition.name}</span>
              <button className="spx-mini-action" type="button" onClick={() => removeTransitionFromSelectedClip(transition.id)}>Remove</button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

export default SPXEditorInspector;
