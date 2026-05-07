// ============================================================
// HardwarePanel.js — Background panel skin
// Shared hardware-aesthetic UI component for SPX plugins.
// Provides a textured panel container with optional corner screws.
// ============================================================
//
// Props:
//   skin         "brushed-metal" | "wood" | "vintage-cream"
//                | "black-rack" | "blue-bezel"
//                (default "brushed-metal")
//   children     React node — the plugin's contents
//   width        CSS width (default "100%")
//   height       CSS height (default "100%")
//   screws       boolean — render 4 corner screws (default true)
//   accentColor  border / edge accent color (optional)
//   padding      inner padding override (default 16)
// ============================================================

import React from "react";

const SKINS = {
  "brushed-metal": {
    background:
      "linear-gradient(180deg, #555 0%, #888 50%, #555 100%)",
    backgroundImage:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px), linear-gradient(180deg, #555 0%, #888 50%, #555 100%)",
    border: "1px solid #2a2a2a",
    color: "#1a1a1a",
    screwColor: "#1a1a1a",
  },
  wood: {
    background:
      "radial-gradient(ellipse at 30% 30%, #5a3520 0%, #3a1f10 80%, #2a1408 100%)",
    backgroundImage:
      "repeating-linear-gradient(85deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 5px), radial-gradient(ellipse at 30% 30%, #5a3520 0%, #3a1f10 80%, #2a1408 100%)",
    border: "1px solid #1a0a04",
    color: "#f0d8a8",
    screwColor: "#1a0a04",
  },
  "vintage-cream": {
    background: "#f0e6c8",
    backgroundImage:
      "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.05) 0%, transparent 50%), #f0e6c8",
    border: "1px solid #c8b87a",
    color: "#3a2a18",
    screwColor: "#3a2a18",
  },
  "black-rack": {
    background: "linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
    backgroundImage:
      "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 70%), linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)",
    border: "1px solid #0a0a0a",
    color: "#e8e8e8",
    screwColor: "#888",
  },
  "blue-bezel": {
    background:
      "radial-gradient(ellipse at 50% 30%, #2a4a8a 0%, #1a2a5a 70%, #0a1430 100%)",
    border: "1px solid #08102a",
    color: "#cfe0ff",
    screwColor: "#08102a",
  },
};

function Screw({ color = "#1a1a1a", x, y }) {
  // Slot screw with subtle highlight
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, #888 0%, ${color} 60%, ${color} 100%)`,
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.6), 0 1px 1px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      {/* Slot */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "15%",
          right: "15%",
          height: 1.5,
          background: "rgba(0,0,0,0.7)",
          transform: "translateY(-50%) rotate(35deg)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

export default function HardwarePanel({
  skin = "brushed-metal",
  children,
  width = "100%",
  height = "100%",
  screws = true,
  accentColor,
  padding = 16,
}) {
  const skinDef = SKINS[skin] || SKINS["brushed-metal"];

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        background: skinDef.background,
        backgroundImage: skinDef.backgroundImage,
        border: accentColor ? `2px solid ${accentColor}` : skinDef.border,
        color: skinDef.color,
        borderRadius: 6,
        padding,
        boxSizing: "border-box",
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.45)",
        fontFamily: "monospace",
      }}
    >
      {screws ? (
        <>
          <Screw color={skinDef.screwColor} x={6} y={6} />
          <Screw color={skinDef.screwColor} x="calc(100% - 16px)" y={6} />
          <Screw color={skinDef.screwColor} x={6} y="calc(100% - 16px)" />
          <Screw
            color={skinDef.screwColor}
            x="calc(100% - 16px)"
            y="calc(100% - 16px)"
          />
        </>
      ) : null}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
