import React, { useEffect, useRef } from "react";
import { createGPUContext, renderFullScreenShader } from "./gpuPipeline";
import { SHADER_NODE_PRESETS } from "./shaderNodePresets";

export default function ShaderPreviewCanvas({ shaderId = "basicColor", height = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl;
    try {
      gl = createGPUContext(canvas);
    } catch (err) {
      return;
    }

    let raf = null;
    const preset =
      SHADER_NODE_PRESETS.find((p) => p.id === shaderId) || SHADER_NODE_PRESETS[0];

    const start = performance.now();

    const draw = (now) => {
      const t = (now - start) / 1000;
      try {
        renderFullScreenShader(gl, preset.fragment, t);
      } catch (err) {
        cancelAnimationFrame(raf);
        return;
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [shaderId]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={height}
      style={{
        width: "100%",
        height,
        display: "block",
        borderRadius: 14,
        border: "1px solid rgba(0,255,200,0.12)",
        background: "#09111d",
      }}
    />
  );
}
