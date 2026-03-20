import React from "react";
import useMotionPresets from "./engine/useMotionPresets";

export default function MotionPresetManagerPanel({
  selectedLayer,
  updateLayer,
  setLayers,
}) {
  const {
    textPresets,
    sceneTemplates,
    applyPresetToSelected,
    insertSceneTemplate,
  } = useMotionPresets({
    selectedLayer,
    updateLayer,
    setLayers,
  });

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Preset + Template Manager</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Layer Presets</div>
        <div style={{ display: "grid", gap: 8 }}>
          {textPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPresetToSelected(preset.id)}
              disabled={!selectedLayer}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Scene Templates</div>
        <div style={{ display: "grid", gap: 8 }}>
          {sceneTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => insertSceneTemplate(template.id)}
            >
              Insert {template.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
