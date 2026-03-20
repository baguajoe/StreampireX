import React, { useEffect, useRef } from "react";
import "../../styles/MotionStudio.css";
import "../../styles/MotionStudioPro.css";

import { useEditorStore } from "../store/useEditorStore";
import usePlaybackEngine from "../hooks/usePlaybackEngine";
import { renderLayers } from "../utils/motionstudio/renderEngine";
import { exportFrame, exportProject } from "../utils/export/exportEngine";

export default function MotionStudioPage() {
  const canvasRef = useRef(null);

  const timeline = useEditorStore((s) => s.timeline);
  const layers = useEditorStore((s) => s.layers);
  const setTime = useEditorStore((s) => s.setTime);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const addLayer = useEditorStore((s) => s.addLayer);
  const setLayers = useEditorStore((s) => s.setLayers);

  usePlaybackEngine();

  useEffect(() => {
    if (!layers.length) {
      setLayers([
        {
          id: "title_1",
          type: "text",
          text: "SPX Motion",
          subtitle: "Unified playback + render engine",
          x: 480,
          y: 220,
          color: "#ffffff",
          fontSize: 56,
          fontWeight: 800,
          z: 1,
          effects: [{ type: "blur", value: 0 }],
        },
        {
          id: "shape_1",
          type: "shape",
          x: 390,
          y: 300,
          width: 180,
          height: 80,
          color: "#00ffc8",
          z: 0,
          opacity: 0.9,
          animate: true,
          speed: 1.25,
          amplitude: 16,
        },
      ]);
    }
  }, [layers.length, setLayers]);

  useEffect(() => {
    let raf = null;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      renderLayers(ctx, layers, timeline.currentTime);
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [layers, timeline.currentTime]);

  const handleAddText = () => {
    addLayer({
      type: "text",
      text: "New Text",
      subtitle: "SPX Motion Layer",
      x: 480,
      y: 360,
      color: "#ff9f45",
      fontSize: 40,
      fontWeight: 700,
      z: layers.length,
    });
  };

  const handleExportFrame = () => {
    if (canvasRef.current) exportFrame(canvasRef.current, "spx-motion-frame");
  };

  const handleExportProject = () => {
    exportProject({ timeline, layers }, "spx-motion-project");
  };

  return (
    <div className="motion-studio-page" style={{ padding: 16 }}>
      <div className="spx-comp-toolbar">
        <input
          className="spx-comp-project-input"
          value={timeline.currentTime.toFixed(2)}
          readOnly
        />
        <button className="spx-comp-btn spx-comp-btn-primary" onClick={togglePlay}>
          {timeline.playing ? "Pause" : "Play"}
        </button>
        <button className="spx-comp-btn" onClick={() => setTime(0)}>
          Rewind
        </button>
        <button className="spx-comp-btn" onClick={handleAddText}>
          + Text Layer
        </button>
        <button className="spx-comp-btn spx-comp-btn-accent" onClick={handleExportFrame}>
          Export Frame
        </button>
        <button className="spx-comp-btn" onClick={handleExportProject}>
          Export Project
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div className="motion-panel">
          <div className="motion-panel-title">Preview</div>
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            style={{
              width: "100%",
              maxWidth: 960,
              borderRadius: 14,
              border: "1px solid rgba(0,255,200,0.12)",
              background: "#0b1220",
            }}
          />
        </div>

        <div className="motion-panel">
          <div className="motion-panel-title">Layers</div>
          <div style={{ display: "grid", gap: 10 }}>
            {layers.map((layer) => (
              <div
                key={layer.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontWeight: 700 }}>{layer.type}</div>
                <div style={{ fontSize: 12, opacity: 0.78 }}>
                  {layer.text || layer.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
