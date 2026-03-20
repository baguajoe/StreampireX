import { useState } from "react";
import { exportCanvasPNG, exportJSON } from "../../../utils/motionstudio/exportHelpers";

export default function useMotionExport({ layers, camera, canvasRef }) {
  const [settings, setSettings] = useState({
    width: 960,
    height: 540,
    fps: 30,
    name: "spx-project",
  });

  const exportFrame = () => {
    if (!canvasRef?.current) return;
    exportCanvasPNG(canvasRef.current, settings.name + ".png");
  };

  const exportProject = () => {
    exportJSON({ layers, camera }, settings.name + ".json");
  };

  return {
    settings,
    setSettings,
    exportFrame,
    exportProject,
  };
}
