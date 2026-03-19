import React, { useMemo, useRef } from "react";
import { evaluateGraph } from "./graphEvaluator";
import { renderToImage } from "./renderEngine";

function maskToStyle(mask) {
  if (!mask || mask.kind !== "mask") return {};

  const left = mask.xPercent - mask.widthPercent / 2;
  const top = mask.yPercent - mask.heightPercent / 2;
  const blur = mask.feather || 0;

  if (mask.shape === "circle") {
    const radius = Math.min(mask.widthPercent, mask.heightPercent) / 2;
    return {
      clipPath: `circle(${radius}% at ${mask.xPercent}% ${mask.yPercent}%)`,
      filter: blur ? `blur(${blur}px)` : undefined
    };
  }

  return {
    clipPath: `inset(${top}% ${100 - (left + mask.widthPercent)}% ${100 - (top + mask.heightPercent)}% ${left}% round 8px)`,
    filter: blur ? `blur(${blur}px)` : undefined
  };
}

function VisualLayer({ visual }) {
  if (!visual) return null;

  if (visual.kind === "scene") {
    const cam = visual.camera || { x: 0, y: 0, zoom: 1, rotation: 0 };

    return (
      <div className="nc-scene-root">
        <div
          className="nc-scene-camera"
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom}) rotate(${cam.rotation}deg)`
          }}
        >
          <VisualLayer visual={visual.image} />
        </div>
      </div>
    );
  }

  if (visual.kind === "merge") {
    const maskStyle = maskToStyle(visual.maskLayer);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: visual.opacity ?? 1
        }}
      >
        <VisualLayer visual={visual.backgroundLayer} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            mixBlendMode: visual.blendMode || "normal",
            ...maskStyle
          }}
        >
          <VisualLayer visual={visual.foregroundLayer} />
        </div>
      </div>
    );
  }

  if (visual.kind === "media") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: visual.mediaUrl
            ? `center / cover no-repeat url(${visual.mediaUrl})`
            : visual.background,
          opacity: visual.opacity ?? 1,
          transform: visual.transform || "",
          filter: visual.filter || ""
        }}
      >
        {!visual.mediaUrl ? (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              fontWeight: 700,
              letterSpacing: 0.3
            }}
          >
            {visual.label}
          </div>
        ) : null}
      </div>
    );
  }

  if (visual.kind === "text") {
    return (
      <div
        style={{
          position: "absolute",
          left: `${visual.xPercent}%`,
          top: `${visual.yPercent}%`,
          transform: `translate(-50%, -50%) ${visual.transform || ""}`,
          color: visual.color,
          fontSize: visual.fontSize,
          fontWeight: visual.fontWeight,
          opacity: visual.opacity ?? 1,
          filter: visual.filter || "",
          textShadow: "0 2px 8px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap"
        }}
      >
        {visual.text}
      </div>
    );
  }

  if (visual.kind === "mask") {
    const style = maskToStyle(visual);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "1px dashed rgba(255,193,7,0.7)",
            ...style
          }}
        />
      </div>
    );
  }

  return null;
}

export default function NodePreviewPanel({
  nodes = [],
  edges = [],
  currentTime = 0
}) {
  const previewRef = useRef(null);

  const evaluated = useMemo(
    () => evaluateGraph(nodes, edges, currentTime),
    [nodes, edges, currentTime]
  );

  const outputCount = nodes.filter((n) => n.type === "output").length;
  const maskCount = nodes.filter((n) => n.type === "mask").length;
  const cameraCount = nodes.filter((n) => n.type === "camera").length;
  const pathCount = nodes.filter((n) => n.type === "path").length;

  const handleExportFrame = () => {
    renderToImage(previewRef.current, `node-frame-${currentTime.toFixed(2)}s.png`);
  };

  return (
    <div className="nc-panel">
      <div
        className="nc-panel-title"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
      >
        <span>Preview</span>
        <button
          className="nc-key-btn"
          style={{ width: "auto", marginTop: 0, padding: "6px 10px" }}
          onClick={handleExportFrame}
        >
          Export Frame
        </button>
      </div>

      <div className="nc-preview">
        <div ref={previewRef} className="nc-preview-stage">
          {evaluated ? (
            <VisualLayer visual={evaluated} />
          ) : (
            <div className="nc-preview-empty">
              <div className="nc-preview-title">No output</div>
              <div className="nc-preview-subtitle">
                Connect a node chain into an Output node.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="nc-preview-meta">
        <div className="nc-dim">Output nodes: {outputCount}</div>
        <div className="nc-dim">Mask nodes: {maskCount}</div>
        <div className="nc-dim">Camera nodes: {cameraCount}</div>
        <div className="nc-dim">Path nodes: {pathCount}</div>
        <div className="nc-dim">Preview uses the first Output node it finds.</div>
        <div className="nc-dim">Time: {currentTime.toFixed(2)}s</div>
      </div>
    </div>
  );
}