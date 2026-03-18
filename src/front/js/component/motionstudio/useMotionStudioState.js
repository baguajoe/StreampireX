import { useMemo, useState, useCallback } from "react";
import {
  TEXT_PRESETS,
  LOWER_THIRD_TEMPLATES,
  PATH_PRESETS,
  CAMERA_PRESETS,
  createKeyframe,
  createPathAnimation
} from "../VideoEditorMotion";

const makeId = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function useMotionStudioState() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedKeyframeRef, setSelectedKeyframeRef] = useState(null);
  const [loopRegion, setLoopRegion] = useState({ start: 0, end: 5, enabled: false });
  const [timelineZoom, setTimelineZoom] = useState(1);

  const [layers, setLayers] = useState([
    {
      id: makeId("layer"),
      type: "text",
      name: "Main Title",
      text: "StreamPireX Motion Studio",
      subtitle: "Creator Motion Graphics",
      x: 50,
      y: 35,
      startTime: 0,
      duration: 6,
      fontSize: 42,
      fontFamily: "Inter, sans-serif",
      fontWeight: 800,
      color: "#ffffff",
      textAlign: "center",
      animation: "bounce_in",
      lowerThirdTemplate: null,
      shadow: true,
      outline: false,
      outlineWidth: 0,
      outlineColor: "#000000",
      keyframes: []
    },
    {
      id: makeId("layer"),
      type: "lower_third",
      name: "Speaker Lower Third",
      text: "Joseph Gallop",
      subtitle: "Founder • StreamPireX",
      x: 30,
      y: 82,
      startTime: 1,
      duration: 6,
      fontSize: 22,
      fontFamily: "Inter, sans-serif",
      fontWeight: 700,
      color: "#ffffff",
      textAlign: "left",
      animation: "slide_right",
      lowerThirdTemplate: "gradient",
      shadow: false,
      outline: false,
      outlineWidth: 0,
      outlineColor: "#000000",
      keyframes: []
    }
  ]);

  const [pathAnimations, setPathAnimations] = useState([]);
  const [cameraPreset, setCameraPreset] = useState("static");
  const [selectedTextPreset, setSelectedTextPreset] = useState("bounce_in");
  const [selectedLowerThirdTemplate, setSelectedLowerThirdTemplate] = useState("gradient");
  const [selectedPathPreset, setSelectedPathPreset] = useState("wave");

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );

  const updateLayer = useCallback((layerId, patch) => {
    setLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l)));
  }, []);

  const addTextLayer = useCallback(() => {
    const id = makeId("layer");
    setLayers((prev) => [
      ...prev,
      {
        id,
        type: "text",
        name: `Text ${prev.length + 1}`,
        text: "New Motion Text",
        subtitle: "",
        x: 50,
        y: 50,
        startTime: 0,
        duration: 5,
        fontSize: 34,
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "center",
        animation: selectedTextPreset,
        lowerThirdTemplate: null,
        shadow: true,
        outline: false,
        outlineWidth: 0,
        outlineColor: "#000000",
        keyframes: []
      }
    ]);
    setSelectedLayerId(id);
  }, [selectedTextPreset]);

  const addLowerThirdLayer = useCallback(() => {
    const id = makeId("layer");
    setLayers((prev) => [
      ...prev,
      {
        id,
        type: "lower_third",
        name: `Lower Third ${prev.length + 1}`,
        text: "Name Here",
        subtitle: "Title Here",
        x: 25,
        y: 82,
        startTime: 0,
        duration: 5,
        fontSize: 20,
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "left",
        animation: "slide_right",
        lowerThirdTemplate: selectedLowerThirdTemplate,
        shadow: false,
        outline: false,
        outlineWidth: 0,
        outlineColor: "#000000",
        keyframes: []
      }
    ]);
    setSelectedLayerId(id);
  }, [selectedLowerThirdTemplate]);

  const removeLayer = useCallback((layerId) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
    setPathAnimations((prev) => prev.filter((p) => p.layerId !== layerId));
    setSelectedLayerId((prev) => (prev === layerId ? null : prev));
  }, []);

  const addKeyframeToSelected = useCallback((property, value, easing = "easeInOut") => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) =>
        l.id === selectedLayerId
          ? {
              ...l,
              keyframes: [...(l.keyframes || []), createKeyframe(currentTime, property, value, easing)]
            }
          : l
      )
    );
  }, [selectedLayerId, currentTime]);

  const removeKeyframeFromSelected = useCallback((keyframeId) => {
    if (!selectedLayerId) return;
    setLayers((prev) =>
      prev.map((l) =>
        l.id === selectedLayerId
          ? { ...l, keyframes: (l.keyframes || []).filter((kf) => kf.id !== keyframeId) }
          : l
      )
    );
  }, [selectedLayerId]);

  const applyPathPresetToSelected = useCallback(() => {
    if (!selectedLayerId) return;
    const preset = PATH_PRESETS.find((p) => p.id === selectedPathPreset);
    if (!preset) return;
    const path = preset.build();
    const anim = createPathAnimation({
      path,
      startTime: 0,
      duration,
      autoOrient: false,
      loop: true,
      uniformSpeed: true,
      easing: "linear"
    });
    setPathAnimations((prev) => [
      ...prev.filter((p) => p.layerId !== selectedLayerId),
      { ...anim, layerId: selectedLayerId }
    ]);
  }, [selectedLayerId, selectedPathPreset, duration]);

  const clearPathFromSelected = useCallback(() => {
    if (!selectedLayerId) return;
    setPathAnimations((prev) => prev.filter((p) => p.layerId !== selectedLayerId));
  }, [selectedLayerId]);

  return {
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    isPlaying,
    setIsPlaying,
    layers,
    setLayers,
    selectedLayerId,
    setSelectedLayerId,
    selectedLayer,
    selectedKeyframeRef,
    setSelectedKeyframeRef,
    loopRegion,
    setLoopRegion,
    timelineZoom,
    setTimelineZoom,
    updateLayer,
    addTextLayer,
    addLowerThirdLayer,
    removeLayer,
    addKeyframeToSelected,
    removeKeyframeFromSelected,
    pathAnimations,
    setPathAnimations,
    applyPathPresetToSelected,
    clearPathFromSelected,
    cameraPreset,
    setCameraPreset,
    selectedTextPreset,
    setSelectedTextPreset,
    selectedLowerThirdTemplate,
    setSelectedLowerThirdTemplate,
    selectedPathPreset,
    setSelectedPathPreset,
    textPresets: TEXT_PRESETS,
    lowerThirdTemplates: LOWER_THIRD_TEMPLATES,
    pathPresets: PATH_PRESETS,
    cameraPresets: CAMERA_PRESETS
  };
}
