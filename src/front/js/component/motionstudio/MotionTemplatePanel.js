import React from "react";
import { SOCIAL_TEMPLATES } from "../VideoEditorOverlays";

export default function MotionTemplatePanel({ setLayers }) {
  const applyTemplate = (template) => {
    const mapped = template.layers.map((layer, i) => ({
      id: `tmpl_${Date.now()}_${i}`,
      type: "text",
      name: `${template.name} ${i + 1}`,
      text: layer.text || layer.content || "Template",
      subtitle: "",
      x: layer.x ?? 50,
      y: layer.y ?? 50,
      startTime: 0,
      duration: template.duration || 5,
      fontSize: layer.fontSize || 28,
      fontFamily: "Inter, sans-serif",
      fontWeight: layer.fontWeight || 700,
      color: layer.color || "#ffffff",
      textAlign: "center",
      animation: layer.animation || "fade_in",
      lowerThirdTemplate: null,
      shadow: true,
      outline: false,
      outlineWidth: 0,
      outlineColor: "#000000",
      keyframes: []
    }));
    setLayers(mapped);
  };

  return (
    <div className="motion-panel">
      <div className="motion-panel-title">Templates</div>
      <div className="motion-list">
        {SOCIAL_TEMPLATES.slice(0, 6).map((t) => (
          <button key={t.id} className="motion-template-btn" onClick={() => applyTemplate(t)}>
            {t.name} • {t.platform}
          </button>
        ))}
      </div>
    </div>
  );
}
