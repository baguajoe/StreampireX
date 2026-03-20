import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { renderMotionFrame } from "./engine/motionRenderer";

const MotionPreviewStageV2 = forwardRef(function MotionPreviewStageV2({
  layers = [],
  width = 960,
  height = 540,
  showTitleSafe = true,
  camera = null,
}, ref) {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMotionFrame(canvas, layers, { showTitleSafe, camera });
  }, [layers, showTitleSafe, camera]);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Preview Stage</div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          maxWidth: width,
          aspectRatio: `${width} / ${height}`,
          display: "block",
          background: "#0b1220",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
});

export default MotionPreviewStageV2;
