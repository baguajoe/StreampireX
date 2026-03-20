import React, { useEffect, useRef, useState } from "react";
import { DEFAULT_PASSES, renderMultiPassGPU } from "../../../utils/compositor/pro/multiPassGPU";

export default function GPUMultiPassPanel() {
  const canvasRef = useRef(null);
  const [passes, setPasses] = useState(DEFAULT_PASSES);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = null;
    const start = performance.now();

    const draw = (now) => {
      try {
        renderMultiPassGPU(canvas, passes, (now - start) / 1000);
      } catch (err) {
        console.warn("GPU pass render failed", err);
        return;
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [passes]);

  const togglePass = (id) => {
    setPasses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Multi-Pass GPU Compositor</div>

      <canvas
        ref={canvasRef}
        width={640}
        height={260}
        style={{
          width: "100%",
          height: 260,
          borderRadius: 14,
          border: "1px solid rgba(0,255,200,0.12)",
          background: "#081220",
        }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {passes.map((p) => (
          <button
            key={p.id}
            className={`spx-comp-btn ${p.enabled ? "spx-comp-btn-primary" : ""}`}
            onClick={() => togglePass(p.id)}
          >
            {p.id}
          </button>
        ))}
      </div>
    </div>
  );
}
