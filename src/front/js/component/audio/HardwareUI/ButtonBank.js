// ============================================================
// ButtonBank.js — Array of selectable buttons
// Shared hardware-aesthetic UI component for SPX plugins.
// Useful for FET ratio bank (4/8/12/20/All), mode selectors, etc.
// ============================================================
//
// Props:
//   options      Array of { value, label, color? }
//   value        Currently selected value (matches one option.value)
//   onChange     fn(newValue)
//   orientation  "horizontal" | "vertical" (default "horizontal")
//   style        "hardware" | "modern" (default "hardware")
//                  - hardware: chunky raised buttons w/ depth shadow
//                    when not pressed, sunken when pressed
//                  - modern: flat tabs
//   size         (number) px height of each button (default 30)
//   accentColor  (string) accent for active state border/glow
//                  default "#00ffc8"
// ============================================================

import React from "react";

export default function ButtonBank({
  options = [],
  value,
  onChange,
  orientation = "horizontal",
  style = "hardware",
  size = 30,
  accentColor = "#00ffc8",
}) {
  const isVertical = orientation === "vertical";

  const containerStyle = {
    display: "inline-flex",
    flexDirection: isVertical ? "column" : "row",
    gap: 4,
    background: style === "hardware" ? "#1a1a1a" : "transparent",
    padding: style === "hardware" ? 4 : 0,
    borderRadius: style === "hardware" ? 4 : 0,
    boxShadow:
      style === "hardware"
        ? "inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04)"
        : "none",
  };

  const buttonBase = (active, accent) => {
    if (style === "hardware") {
      return {
        height: size,
        minWidth: size + 8,
        padding: "0 10px",
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: active ? "#fff" : "#bbb",
        background: active
          ? `linear-gradient(180deg, #1a1a1a, #2a2a2a)`
          : `linear-gradient(180deg, #4a4a4a, #2a2a2a)`,
        border: `1px solid ${active ? accent : "#0a0a0a"}`,
        borderRadius: 3,
        cursor: "pointer",
        boxShadow: active
          ? `inset 0 2px 3px rgba(0,0,0,0.7), 0 0 4px ${accent}55`
          : "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 1px rgba(0,0,0,0.5)",
        textShadow: active ? `0 0 4px ${accent}` : "0 1px 0 rgba(0,0,0,0.5)",
        outline: "none",
        userSelect: "none",
        transition: "background 80ms linear, color 80ms linear",
      };
    }
    // modern flat tabs
    return {
      height: size,
      minWidth: size + 8,
      padding: "0 12px",
      fontFamily: "monospace",
      fontSize: 11,
      fontWeight: 600,
      color: active ? "#000" : "#888",
      background: active ? accent : "transparent",
      border: `1px solid ${active ? accent : "#444"}`,
      borderRadius: 3,
      cursor: "pointer",
      outline: "none",
      userSelect: "none",
      transition: "background 80ms linear, color 80ms linear",
    };
  };

  return (
    <div style={containerStyle}>
      {options.map((opt) => {
        const active = opt.value === value;
        const accent = opt.color || accentColor;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => {
              if (typeof onChange === "function" && !active) onChange(opt.value);
            }}
            style={buttonBase(active, accent)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
