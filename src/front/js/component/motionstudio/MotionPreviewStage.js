import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LOWER_THIRD_TEMPLATES,
  TEXT_PRESETS,
  evaluatePathAnimation
} from "../VideoEditorMotion";
import { interpolate } from "./useKeyframeEngine";

function getPresetStyle(animationId, elapsed, duration) {
  const preset = TEXT_PRESETS.find((p) => p.id === animationId);
  if (!preset?.enter?.length) return {};
  const style = {};

  preset.enter.forEach((rule) => {
    const t = Math.min(1, Math.max(0, elapsed / rule.duration));
    const value = rule.from + (rule.to - rule.from) * t;

    if (rule.property === "opacity") style.opacity = value;
    if (rule.property === "x") style.transform = `${style.transform || ""} translateX(${value}px)`;
    if (rule.property === "y") style.transform = `${style.transform || ""} translateY(${value}px)`;
    if (rule.property === "rotation") style.transform = `${style.transform || ""} rotate(${value}deg)`;
    if (rule.property === "scaleX" || rule.property === "scaleY") {
      const sx = rule.property === "scaleX" ? value : 1;
      const sy = rule.property === "scaleY" ? value : 1;
      style.transform = `${style.transform || ""} scale(${sx}, ${sy})`;
    }
  });

  if (duration - elapsed < 0.5) {
    style.opacity = (style.opacity ?? 1) * Math.max(0, (duration - elapsed) / 0.5);
  }

  return style;
}

const SNAP_THRESHOLD = 1.5;

export default function MotionPreviewStage({
  layers,
  currentTime,
  isPlaying,
  setCurrentTime,
  duration,
  pathAnimations,
  selectedLayerId,
  setSelectedLayerId,
  updateLayer
}) {
  const stageRef = useRef(null);
  const [interaction, setInteraction] = useState(null);
  const [guides, setGuides] = useState({ vertical: false, horizontal: false });

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.033;
        return next >= duration ? 0 : next;
      });
    }, 33);
    return () => clearInterval(id);
  }, [isPlaying, setCurrentTime, duration]);

  useEffect(() => {
    if (!interaction) return;

    const onMove = (e) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const layer = layers.find((l) => l.id === interaction.layerId);
      if (!layer) return;

      if (interaction.type === "drag") {
        let nextX = ((e.clientX - rect.left) / rect.width) * 100;
        let nextY = ((e.clientY - rect.top) / rect.height) * 100;

        let snapV = false;
        let snapH = false;

        if (Math.abs(nextX - 50) <= SNAP_THRESHOLD) {
          nextX = 50;
          snapV = true;
        }
        if (Math.abs(nextY - 50) <= SNAP_THRESHOLD) {
          nextY = 50;
          snapH = true;
        }

        setGuides({ vertical: snapV, horizontal: snapH });

        updateLayer(interaction.layerId, {
          x: Math.max(0, Math.min(100, nextX)),
          y: Math.max(0, Math.min(100, nextY))
        });
      }

      if (interaction.type === "resize") {
        const dx = e.clientX - interaction.startClientX;
        const dy = e.clientY - interaction.startClientY;
        const delta = Math.max(dx, dy);
        const nextFontSize = Math.max(10, interaction.startFontSize + delta * 0.12);

        updateLayer(interaction.layerId, {
          fontSize: nextFontSize
        });
      }

      if (interaction.type === "rotate") {
        const cx = rect.left + (layer.x / 100) * rect.width;
        const cy = rect.top + (layer.y / 100) * rect.height;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

        updateLayer(interaction.layerId, {
          rotation: angle
        });
      }
    };

    const onUp = () => {
      setInteraction(null);
      setGuides({ vertical: false, horizontal: false });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [interaction, layers, updateLayer]);

  const renderedLayers = useMemo(() => {
    return layers
      .map((layer) => {
        const localTime = currentTime - layer.startTime;
        if (localTime < 0 || localTime > layer.duration) return null;

        const pathAnim = pathAnimations.find((p) => p.layerId === layer.id);
        const pathPos = pathAnim ? evaluatePathAnimation(pathAnim, currentTime) : null;

        const lowerThird = layer.lowerThirdTemplate
          ? LOWER_THIRD_TEMPLATES.find((t) => t.id === layer.lowerThirdTemplate)
          : null;

        const presetStyle = getPresetStyle(layer.animation, localTime, layer.duration);
        const keyframes = layer.keyframes || {};

        const offsetX = interpolate(keyframes.positionX || [], currentTime) ?? 0;
        const offsetY = interpolate(keyframes.positionY || [], currentTime) ?? 0;
        const scale = interpolate(keyframes.scale || [], currentTime) ?? layer.scale ?? 1;
        const rotation = interpolate(keyframes.rotation || [], currentTime) ?? layer.rotation ?? 0;
        const opacity = interpolate(keyframes.opacity || [], currentTime) ?? layer.opacity ?? 1;

        const baseStyle = {
          position: "absolute",
          left: `${layer.x ?? 50}%`,
          top: `${layer.y ?? 50}%`,
          transform: `
            translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0)
            scale(${scale})
            rotate(${rotation}deg)
            ${presetStyle.transform || ""}
          `,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          fontWeight: layer.fontWeight,
          color: layer.color,
          textAlign: layer.textAlign,
          whiteSpace: "nowrap",
          textShadow: layer.shadow ? "0 2px 8px rgba(0,0,0,0.55)" : "none",
          WebkitTextStroke: layer.outline
            ? `${layer.outlineWidth || 1}px ${layer.outlineColor || "#000000"}`
            : "none",
          opacity: (presetStyle.opacity ?? 1) * opacity,
          cursor: "move",
          userSelect: "none",
          willChange: "transform, opacity",
          transformOrigin: "center center"
        };

        if (pathPos) {
          baseStyle.transform = `
            translate3d(calc(-50% + ${pathPos.x}px), calc(-50% + ${pathPos.y}px), 0)
            scale(${scale})
            rotate(${(pathPos.rotation || 0) + rotation}deg)
            ${presetStyle.transform || ""}
          `;
        }

        return {
          layer,
          lowerThird,
          style: lowerThird ? { ...baseStyle, ...lowerThird.style } : baseStyle
        };
      })
      .filter(Boolean);
  }, [layers, currentTime, pathAnimations]);

  return (
    <div className="motion-preview-shell">
      <div
        className="motion-preview-stage"
        ref={stageRef}
        onMouseDown={() => setSelectedLayerId(null)}
      >
        <div className="motion-preview-safezone" />
        {guides.vertical ? <div className="motion-guide motion-guide-v" /> : null}
        {guides.horizontal ? <div className="motion-guide motion-guide-h" /> : null}

        {renderedLayers.map(({ layer, lowerThird, style }) => {
          const isSelected = selectedLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={`motion-layer-wrap ${isSelected ? "selected" : ""}`}
              style={style}
              onMouseDown={(e) => {
                e.stopPropagation();
                setSelectedLayerId(layer.id);
                setInteraction({ type: "drag", layerId: layer.id });
              }}
            >
              <div style={lowerThird ? lowerThird.nameStyle : {}}>
                {layer.text}
              </div>

              {layer.subtitle ? (
                <div
                  style={
                    lowerThird
                      ? lowerThird.titleStyle
                      : { fontSize: layer.fontSize * 0.5, opacity: 0.75, marginTop: 4 }
                  }
                >
                  {layer.subtitle}
                </div>
              ) : null}

              {isSelected ? (
                <>
                  <div className="motion-selection-box" />
                  <div
                    className="motion-rotate-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setInteraction({ type: "rotate", layerId: layer.id });
                    }}
                  />
                  <div
                    className="motion-resize-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setInteraction({
                        type: "resize",
                        layerId: layer.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startFontSize: layer.fontSize || 24
                      });
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
