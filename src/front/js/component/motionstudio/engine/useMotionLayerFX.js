import { useCallback } from "react";
import { defaultLayerEffects, defaultLayerMask } from "../../../utils/motionstudio/maskEffects";

export default function useMotionLayerFX({ selectedLayer, updateLayer }) {
  const ensure = useCallback(() => {
    if (!selectedLayer) return null;
    return {
      mask: selectedLayer.mask || defaultLayerMask(),
      effects: selectedLayer.effects || defaultLayerEffects(),
    };
  }, [selectedLayer]);

  const updateMask = useCallback((patch) => {
    if (!selectedLayer) return;
    const current = ensure();
    updateLayer(selectedLayer.id, {
      mask: { ...current.mask, ...patch },
    });
  }, [selectedLayer, updateLayer, ensure]);

  const updateEffects = useCallback((patch) => {
    if (!selectedLayer) return;
    const current = ensure();
    updateLayer(selectedLayer.id, {
      effects: { ...current.effects, ...patch },
    });
  }, [selectedLayer, updateLayer, ensure]);

  return {
    current: ensure(),
    updateMask,
    updateEffects,
  };
}
