import { useCallback, useMemo, useState } from "react";
import { moveKeyframe, normalizeTrack, sampleTrack } from "../../../utils/motionstudio/graphHelpers";

export default function useMotionGraphEditor({
  selectedLayer,
  updateLayer,
  defaultProp = "opacity",
}) {
  const [selectedProp, setSelectedProp] = useState(defaultProp);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState(null);

  const track = useMemo(() => {
    if (!selectedLayer) return [];
    return normalizeTrack((selectedLayer.keyframes || {})[selectedProp] || []);
  }, [selectedLayer, selectedProp]);

  const sampled = useMemo(() => sampleTrack(track, 72), [track]);

  const updateTrack = useCallback((nextTrack) => {
    if (!selectedLayer) return;
    updateLayer(selectedLayer.id, {
      keyframes: {
        ...(selectedLayer.keyframes || {}),
        [selectedProp]: nextTrack,
      },
    });
  }, [selectedLayer, selectedProp, updateLayer]);

  const updateSelectedKeyframe = useCallback((patch) => {
    if (!selectedKeyframeId) return;
    updateTrack(moveKeyframe(track, selectedKeyframeId, patch));
  }, [selectedKeyframeId, track, updateTrack]);

  return {
    selectedProp,
    setSelectedProp,
    selectedKeyframeId,
    setSelectedKeyframeId,
    track,
    sampled,
    updateSelectedKeyframe,
  };
}
