// ============================================================
// RoomReverbUI.js — Studio-booth aesthetic room reverb UI.
// Phase F4-A.7. Replaces the GenericPlaceholderUI wrapper that
// SPXPlugins.js currently aliases for the "room" plugin.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: { size, damping, brightness, mix }
//   - SPXPluginHost diffs the merged object pushed via onChange
//     and dispatches per-param updates to AudioParams.
//   - onClose() hides the panel.
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";

const WARM_BROWN = "#aa7744";
const WARM_BROWN_DEEP = "#6a4420";
const CREAM_DARK = "#d8c898";

// Decorative room-dimensions readout. `size` 0..1 maps to a
// floor-plan rectangle with width = 2..18 ft and depth = 1.5..14 ft.
// Renders a tiny SVG top-down of the room with diffuser tiles for
// damping and warm wood-tone fill.
const RoomFootprint = ({ size, damping }) => {
  const W = 320;
  const H = 90;
  const widthFt = 2 + size * 16;
  const depthFt = 1.5 + size * 12.5;
  // Inner rect proportional to size, centered. Max usable canvas: 290 x 70.
  const maxRectW = 280;
  const maxRectH = 70;
  const ratio = depthFt / widthFt;
  let rectW = Math.min(maxRectW, 60 + size * 220);
  let rectH = rectW * ratio;
  if (rectH > maxRectH) { rectH = maxRectH; rectW = rectH / ratio; }
  const rx = (W - rectW) / 2;
  const ry = (H - rectH) / 2;

  // Damping tiles: small dots inside the room, density ∝ damping.
  const tiles = [];
  const cols = 8;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const seed = Math.sin(idx * 1.31 + 2.7) * 43758.5453;
      const rand = seed - Math.floor(seed);
      if (rand < damping) {
        const tx = rx + 8 + (c / (cols - 1)) * (rectW - 16);
        const ty = ry + 8 + (r / (rows - 1)) * (rectH - 16);
        tiles.push([tx, ty]);
      }
    }
  }

  return (
    <div style={{ width: W, height: H, background: "#1a0e04",
                   border: `1px solid ${WARM_BROWN_DEEP}`, borderRadius: 3,
                   boxShadow: "inset 0 1px 4px rgba(0,0,0,0.7)",
                   position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="roomFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3520" />
            <stop offset="100%" stopColor="#2a1408" />
          </linearGradient>
          <pattern id="roomGrid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke={WARM_BROWN_DEEP} strokeWidth="0.4" opacity="0.5" />
          </pattern>
        </defs>
        {/* Room floor */}
        <rect x={rx} y={ry} width={rectW} height={rectH} fill="url(#roomFloor)" stroke={WARM_BROWN} strokeWidth="1" />
        <rect x={rx} y={ry} width={rectW} height={rectH} fill="url(#roomGrid)" />
        {/* Damping diffuser tiles */}
        {tiles.map(([tx, ty], i) => (
          <rect key={i} x={tx - 2} y={ty - 2} width="4" height="4"
                fill={CREAM_DARK} opacity="0.55" />
        ))}
        {/* Mic + source markers */}
        <circle cx={rx + 8} cy={H / 2} r="2" fill={WARM_BROWN} />
        <circle cx={rx + rectW - 8} cy={H / 2} r="2" fill={WARM_BROWN} />
        <text x={rx + 8} y={H / 2 - 5} fontSize="7" fill={CREAM_DARK} fontFamily="monospace">SRC</text>
        <text x={rx + rectW - 22} y={H / 2 - 5} fontSize="7" fill={CREAM_DARK} fontFamily="monospace">MIC</text>
      </svg>
      {/* Dimension readout */}
      <div style={{ position: "absolute", top: 4, right: 6, fontSize: 9,
                     color: CREAM_DARK, fontFamily: "monospace", letterSpacing: 1 }}>
        {widthFt.toFixed(1)}' × {depthFt.toFixed(1)}'
      </div>
    </div>
  );
};

export default function RoomReverbUI({ params, onChange, onClose }) {
  const [s, setS] = useState({
    size: 0.45, damping: 0.5, brightness: 0.6, mix: 20,
    ...(params || {}),
  });
  useEffect(() => { onChange && onChange(s); }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ position: "fixed", top: 80, right: 24, width: 360, zIndex: 1000,
                  filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.55))" }}>
      <HardwarePanel skin="vintage-cream" accentColor={WARM_BROWN_DEEP} padding={14}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                       marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${WARM_BROWN}55` }}>
          <div>
            <span style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 600, fontSize: 22, letterSpacing: 6,
              color: WARM_BROWN_DEEP,
              textShadow: "0 1px 0 rgba(255,255,255,0.4)",
            }}>
              ROOM
            </span>
            <span style={{ marginLeft: 10, fontSize: 9, color: WARM_BROWN_DEEP,
                           letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
              booth
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", color: WARM_BROWN_DEEP,
            border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1, fontWeight: 700 }}>×</button>
        </div>

        {/* Room footprint */}
        <div style={{ marginBottom: 6 }}>
          <RoomFootprint size={s.size} damping={s.damping} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9,
                       color: WARM_BROWN_DEEP, marginBottom: 14, fontFamily: "monospace",
                       letterSpacing: 1, fontWeight: 700 }}>
          <span>BOOTH · TOP-DOWN</span>
          <span>DIFF {Math.round(s.damping * 100)}%</span>
        </div>

        {/* 4 vintage knobs centered */}
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end",
                       padding: "12px 4px",
                       background: "rgba(0,0,0,0.06)", borderRadius: 4,
                       border: `1px solid ${WARM_BROWN}66` }}>
          <AnalogKnob value={s.size} min={0} max={1} onChange={set("size")} style="vintage"
            size={52} color="#3a2a18" indicatorColor={CREAM_DARK} label="SIZE"
            valueLabel={`${Math.round(s.size * 100)}%`} step={0.01} accentColor={WARM_BROWN} />
          <AnalogKnob value={s.damping} min={0} max={1} onChange={set("damping")} style="vintage"
            size={52} color="#3a2a18" indicatorColor={CREAM_DARK} label="DAMP"
            valueLabel={`${Math.round(s.damping * 100)}%`} step={0.01} accentColor={WARM_BROWN} />
          <AnalogKnob value={s.brightness} min={0} max={1} onChange={set("brightness")} style="vintage"
            size={52} color="#3a2a18" indicatorColor={CREAM_DARK} label="BRIGHT"
            valueLabel={`${Math.round(s.brightness * 100)}%`} step={0.01} accentColor={WARM_BROWN} />
          <AnalogKnob value={s.mix} min={0} max={100} onChange={set("mix")} style="vintage"
            size={52} color="#3a2a18" indicatorColor={CREAM_DARK} label="MIX"
            valueLabel={`${Math.round(s.mix)}%`} step={1} accentColor={WARM_BROWN} />
        </div>

        {/* Footer ID strip */}
        <div style={{ marginTop: 12, fontSize: 8, color: WARM_BROWN_DEEP,
                       letterSpacing: 3, textAlign: "center", fontFamily: "monospace",
                       fontWeight: 700 }}>
          SPX · ROOM REVERB · STUDIO BOOTH
        </div>
      </HardwarePanel>
    </div>
  );
}
