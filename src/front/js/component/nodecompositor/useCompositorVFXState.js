import { useMemo, useState } from "react";
import { createTrackerState } from "../../utils/compositor/trackingUtils";
import { defaultCamera25D } from "../../utils/compositor/camera2d5Utils";
import { defaultMask } from "../../utils/compositor/maskUtils";

export default function useCompositorVFXState() {
  const [vfxEnabled, setVfxEnabled] = useState(true);
  const [shaderQuality, setShaderQuality] = useState("high");
  const [tracking, setTracking] = useState(createTrackerState());
  const [camera25D, setCamera25D] = useState(defaultCamera25D());
  const [rotoMasks, setRotoMasks] = useState([defaultMask()]);
  const [globalEffects, setGlobalEffects] = useState({
    brightness: 1,
    contrast: 1,
    saturation: 1,
    blur: 0,
    chromaKey: false,
    keyColor: "#00ff00",
    threshold: 0.35,
    softness: 0.15,
    mergeMix: 0.5,
  });

  const keyColorVec3 = useMemo(() => {
    const hex = (globalEffects.keyColor || "#00ff00").replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r || 0, g || 1, b || 0];
  }, [globalEffects.keyColor]);

  return {
    vfxEnabled,
    setVfxEnabled,
    shaderQuality,
    setShaderQuality,
    tracking,
    setTracking,
    camera25D,
    setCamera25D,
    rotoMasks,
    setRotoMasks,
    globalEffects,
    setGlobalEffects,
    keyColorVec3,
  };
}
