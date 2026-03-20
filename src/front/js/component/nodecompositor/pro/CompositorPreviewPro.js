import React, { useEffect, useMemo, useRef } from "react";
import { executeNodeGraph } from "../../../utils/compositor/pro/nodeExecutionPro";
import { applyBlendMode, resetBlendMode } from "../../../utils/compositor/pro/blendModes";

function drawGrid(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#081220");
  g.addColorStop(1, "#14213d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

export default function CompositorPreviewPro({
  nodes = [],
  edges = [],
  currentTime = 0,
}) {
  const canvasRef = useRef(null);
  const graph = useMemo(
    () => executeNodeGraph(nodes, edges, currentTime),
    [nodes, edges, currentTime]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    graph.sorted.forEach((id) => {
      const out = graph.outputs[id];
      if (!out) return;

      if (out.type === "color") {
        ctx.save();
        ctx.fillStyle = out.value;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      if (out.type === "text") {
        ctx.save();
        ctx.fillStyle = out.color || "#fff";
        ctx.font = `700 ${out.fontSize || 42}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(out.text || "Text", out.x ?? w / 2, out.y ?? h / 2);
        ctx.restore();
      }

      if (out.type === "blur") {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(20, 20, 140, 32);
        ctx.fillStyle = "#cfe0f2";
        ctx.font = "12px Arial";
        ctx.fillText(`Blur: ${out.amount}`, 30, 40);
        ctx.restore();
      }

      if (out.type === "merge") {
        ctx.save();
        applyBlendMode(ctx, out.blendMode);
        ctx.fillStyle = "rgba(0,255,200,0.08)";
        ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.45);
        resetBlendMode(ctx);
        ctx.restore();
      }

      if (out.type === "shader") {
        ctx.save();
        ctx.fillStyle = "rgba(255,159,69,0.10)";
        ctx.fillRect(w * 0.1, h * 0.72, w * 0.8, 70);
        ctx.fillStyle = "#ffb46e";
        ctx.font = "12px Arial";
        ctx.fillText(`Shader Node: ${out.shader}`, 20, h * 0.72 + 24);
        ctx.restore();
      }
    });
  }, [graph]);

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Compositor Preview Pro</div>
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        style={{
          width: "100%",
          borderRadius: 14,
          border: "1px solid rgba(0,255,200,0.12)",
          background: "#0b1220",
        }}
      />
    </div>
  );
}
