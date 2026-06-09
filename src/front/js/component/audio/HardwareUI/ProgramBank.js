// ============================================================
// ProgramBank.js — Preset memory buttons (LA-2A "PROGRAM" style)
// Shared hardware-aesthetic UI component for SPX plugins.
// Mostly visual flair — calls onChange(programId) when clicked.
// ============================================================
//
// Props:
//   programs     Array of { id, name }
//   currentId    Currently selected program id
//   onChange     fn(programId) — called when a button is clicked
//   orientation  "horizontal" | "vertical" (default "horizontal")
//   ledColor     LED on color (default "#ff8844")
//   buttonColor  Button body color (default "#2a2a2a")
//   accentColor  Active border accent (default "#ff8844")
//   size         button size (default 36)
// ============================================================

import React from "react";

export default function ProgramBank({
  programs = [],
  currentId,
  onChange,
  orientation = "horizontal",
  ledColor = "#ff8844",
  buttonColor = "#2a2a2a",
  accentColor = "#ff8844",
  size = 36,
}) {
  const isVertical = orientation === "vertical";

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: isVertical ? "column" : "row",
        gap: 6,
        background: "#1a1a1a",
        padding: 6,
        borderRadius: 4,
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      {programs.map((p) => {
        const active = p.id === currentId;
        return (
          <button
            key={String(p.id)}
            type="button"
            onClick={() => {
              if (typeof onChange === "function") onChange(p.id);
            }}
            style={{
              width: size,
              height: size,
              padding: 0,
              border: `1px solid ${active ? accentColor : "#0a0a0a"}`,
              borderRadius: 4,
              background: active
                ? `linear-gradient(180deg, #1a1a1a, ${buttonColor})`
                : `linear-gradient(180deg, #4a4a4a, ${buttonColor})`,
              color: active ? "#fff" : "#bbb",
              cursor: "pointer",
              boxShadow: active
                ? `inset 0 2px 3px rgba(0,0,0,0.7), 0 0 4px ${accentColor}55`
                : "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 1px rgba(0,0,0,0.5)",
              outline: "none",
              userSelect: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {/* LED indicator */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: active ? ledColor : "#0a0a0a",
                boxShadow: active
                  ? `0 0 4px ${ledColor}, 0 0 8px ${ledColor}66`
                  : "inset 0 1px 1px rgba(0,0,0,0.7)",
                border: active
                  ? `1px solid ${ledColor}`
                  : "1px solid #1a1a1a",
              }}
            />
            <span
              style={{
                color: active ? "#fff" : "#aaa",
                textShadow: active ? `0 0 3px ${accentColor}` : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: size - 6,
              }}
            >
              {p.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
