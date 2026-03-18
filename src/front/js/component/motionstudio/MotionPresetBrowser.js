import React from "react";

export default function MotionPresetBrowser({
  textPresets,
  lowerThirdTemplates,
  selectedTextPreset,
  setSelectedTextPreset,
  selectedLowerThirdTemplate,
  setSelectedLowerThirdTemplate,
  selectedLayer,
  updateLayer
}) {
  const applyTextPreset = () => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, { animation: selectedTextPreset });
  };

  const applyLowerThirdTemplate = () => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      lowerThirdTemplate: selectedLowerThirdTemplate,
      type: "lower_third"
    });
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Presets</div>

      <div className="motion-subtitle">Text Animations</div>
      <div className="motion-chip-grid">
        {textPresets.map((preset) => (
          <button
            key={preset.id}
            className={selectedTextPreset === preset.id ? "active" : ""}
            onClick={() => setSelectedTextPreset(preset.id)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <div className="motion-mini-actions">
        <button onClick={applyTextPreset} disabled={!selectedLayer}>
          Apply Text Preset
        </button>
      </div>

      <div className="motion-subtitle">Lower Thirds</div>
      <div className="motion-chip-grid">
        {lowerThirdTemplates.map((tpl) => (
          <button
            key={tpl.id}
            className={selectedLowerThirdTemplate === tpl.id ? "active" : ""}
            onClick={() => setSelectedLowerThirdTemplate(tpl.id)}
          >
            {tpl.name}
          </button>
        ))}
      </div>
      <div className="motion-mini-actions">
        <button onClick={applyLowerThirdTemplate} disabled={!selectedLayer}>
          Apply Lower Third
        </button>
      </div>
    </div>
  );
}
