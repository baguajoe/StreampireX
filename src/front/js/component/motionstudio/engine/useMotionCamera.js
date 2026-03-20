import { useState } from "react";
import { defaultMotionCamera } from "../../../utils/motionstudio/camera25d";

export default function useMotionCamera() {
  const [camera, setCamera] = useState(defaultMotionCamera());

  const updateCamera = (patch) => {
    setCamera((prev) => ({ ...prev, ...patch }));
  };

  const resetCamera = () => {
    setCamera(defaultMotionCamera());
  };

  return {
    camera,
    setCamera,
    updateCamera,
    resetCamera,
  };
}
