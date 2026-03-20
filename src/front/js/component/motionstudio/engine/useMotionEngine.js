import { useCallback, useMemo, useState } from "react";
import { createLowerThirdLayer, createTextLayer } from "./motionDefaults";
import { evaluateVisibleLayers } from "../../../utils/motionstudio/keyframeEngine";

export default function useMotionEngine() {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [loopRegion, setLoopRegion] = useState({ enabled: false, start: 0, end: 5 });

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );

  const evaluatedLayers = useMemo(
    () => evaluateVisibleLayers(layers, currentTime),
    [layers, currentTime]
  );

  const addTextLayer = useCallback(() => {
    const layer = createTextLayer({ startTime: currentTime });
    setLayers((prev) => [...prev, layer]);
    setSelectedLayerId(layer.id);
  }, [currentTime]);

  const addLowerThirdLayer = useCallback(() => {
    const layer = createLowerThirdLayer({ startTime: currentTime });
    setLayers((prev) => [...prev, layer]);
    setSelectedLayerId(layer.id);
  }, [currentTime]);

  const updateLayer = useCallback((layerId, patch) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l)));
  }, []);

  const deleteLayer = useCallback((layerId) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    setSelectedLayerId((prev) => (prev === layerId ? null : prev));
  }, []);

  const duplicateLayer = useCallback((layerId) => {
    setLayers((prev) => {
      const found = prev.find((l) => l.id === layerId);
      if (!found) return prev;
      const copy = {
        ...found,
        id: `motion_layer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: `${found.name} Copy`,
        startTime: (found.startTime ?? 0) + 0.25,
      };
      return [...prev, copy];
    });
  }, []);

  const reorderLayer = useCallback((layerId, dir) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === layerId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }, []);

  const addKeyframeToSelected = useCallback((prop, value) => {
    if (!selectedLayer) return;
    const existing = [...((selectedLayer.keyframes || {})[prop] || [])];
    existing.push({
      time: currentTime,
      value,
      easing: "linear",
      curveStrength: 0.5,
    });
    existing.sort((a, b) => a.time - b.time);

    updateLayer(selectedLayer.id, {
      keyframes: {
        ...(selectedLayer.keyframes || {}),
        [prop]: existing,
      },
    });
  }, [selectedLayer, currentTime, updateLayer]);

  return {
    layers,
    setLayers,
    selectedLayer,
    selectedLayerId,
    setSelectedLayerId,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isPlaying,
    setIsPlaying,
    timelineZoom,
    setTimelineZoom,
    loopRegion,
    setLoopRegion,
    evaluatedLayers,
    addTextLayer,
    addLowerThirdLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    reorderLayer,
    addKeyframeToSelected,
  };
}
