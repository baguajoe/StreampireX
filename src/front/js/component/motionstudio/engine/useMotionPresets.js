import { useCallback } from "react";
import { MOTION_TEXT_PRESETS, MOTION_SCENE_TEMPLATES } from "../../../utils/motionstudio/presetLibrary";

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function useMotionPresets({
  selectedLayer,
  updateLayer,
  setLayers,
}) {
  const applyPresetToSelected = useCallback((presetId) => {
    if (!selectedLayer) return;
    const preset = MOTION_TEXT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    updateLayer(selectedLayer.id, {
      ...clone(preset.patch),
      keyframes: clone(preset.patch.keyframes || {}),
    });
  }, [selectedLayer, updateLayer]);

  const insertSceneTemplate = useCallback((templateId) => {
    const template = MOTION_SCENE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setLayers((prev) => [
      ...prev,
      ...template.layers.map((layer, i) => ({
        ...clone(layer),
        id: `motion_template_${template.id}_${Date.now()}_${i}`,
      })),
    ]);
  }, [setLayers]);

  return {
    textPresets: MOTION_TEXT_PRESETS,
    sceneTemplates: MOTION_SCENE_TEMPLATES,
    applyPresetToSelected,
    insertSceneTemplate,
  };
}
