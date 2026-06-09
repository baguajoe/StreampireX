// ============================================================
// MultiPressUI2.js — Mastering 4-band multiband compressor
// Phase F4-A.7. Crossover graph + 4 columns of band controls.
//
// Suffix `2` to avoid collision with existing MultiPressUI.
// Orchestrator swaps the import after this batch.
//
// Contract:
//   props: { params, onChange, onClose }
//   params: {
//     xover1, xover2, xover3,
//     b1Thresh, b1Ratio, b1Gain,
//     b2Thresh, b2Ratio, b2Gain,
//     b3Thresh, b3Ratio, b3Gain,
//     b4Thresh, b4Ratio, b4Gain
//   }
// ============================================================

import React, { useState, useEffect } from "react";
import HardwarePanel from "../HardwareUI/HardwarePanel";
import AnalogKnob from "../HardwareUI/AnalogKnob";
import LEDLadder from "../HardwareUI/LEDLadder";
import useGRMeter from "../HardwareUI/useGRMeter";

const PURPLE = "#a040ff";
const PURPLE_BRIGHT = "#c870ff";
const PURPLE_DEEP = "#5010a0";
const BAND_COLORS = ["#ff5544", "#ff9933", "#33cc66", "#3388ff"];
const BAND_LABELS = ["LOW", "LO-MID", "HI-MID", "HIGH"];

// 4-band crossover graph. Renders 4 colored regions split by xover1/2/3.
const CrossoverGraph = ({ x1, x2, x3 }) => {
  const W = 480;
  const H = 70;
  const minHz = 20;
  const maxHz = 20000;
  const logHz = (hz) =>
    ((Math.log10(Math.max(minHz, Math.min(maxHz, hz))) - Math.log10(minHz)) /
      (Math.log10(maxHz) - Math.log10(minHz))) *
    W;

  const x1px = logHz(x1);
  const x2px = logHz(x2);
  const x3px = logHz(x3);

  const bands = [
    { x0: 0, x1: x1px, color: BAND_COLORS[0], label: BAND_LABELS[0] },
    { x0: x1px, x1: x2px, color: BAND_COLORS[1], label: BAND_LABELS[1] },
    { x0: x2px, x1: x3px, color: BAND_COLORS[2], label: BAND_LABELS[2] },
    { x0: x3px, x1: W, color: BAND_COLORS[3], label: BAND_LABELS[3] },
  ];

  const fmtHz = (hz) =>
    hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`;

  // Reference grid lines (decade markers)
  const grid = [50, 100, 500, 1000, 5000, 10000];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="mpGraphBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#150525" />
          <stop offset="100%" stopColor="#080010" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#mpGraphBg)" stroke={PURPLE_DEEP} strokeWidth="1" />

      {/* Grid */}
      {grid.map((hz) => (
        <line
          key={hz}
          x1={logHz(hz)}
          y1={0}
          x2={logHz(hz)}
          y2={H}
          stroke="#2a1050"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />
      ))}

      {/* Band regions (filled rects) */}
      {bands.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x0}
            y={6}
            width={Math.max(0, b.x1 - b.x0)}
            height={H - 24}
            fill={b.color}
            opacity="0.22"
          />
          {/* Top stripe brighter */}
          <rect
            x={b.x0}
            y={6}
            width={Math.max(0, b.x1 - b.x0)}
            height={3}
            fill={b.color}
            opacity="0.85"
          />
          {/* Band label */}
          <text
            x={(b.x0 + b.x1) / 2}
            y={H / 2 + 2}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="700"
            textAnchor="middle"
            fill={b.color}
            style={{ filter: `drop-shadow(0 0 2px ${b.color}66)` }}
          >
            {b.label}
          </text>
        </g>
      ))}

      {/* Crossover divider lines */}
      {[x1px, x2px, x3px].map((px, i) => (
        <line
          key={i}
          x1={px}
          y1={0}
          x2={px}
          y2={H}
          stroke={PURPLE_BRIGHT}
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      ))}

      {/* Hz labels */}
      <text x={x1px} y={H - 4} fontSize="8" fontFamily="monospace" textAnchor="middle" fill={PURPLE_BRIGHT}>
        {fmtHz(x1)}
      </text>
      <text x={x2px} y={H - 4} fontSize="8" fontFamily="monospace" textAnchor="middle" fill={PURPLE_BRIGHT}>
        {fmtHz(x2)}
      </text>
      <text x={x3px} y={H - 4} fontSize="8" fontFamily="monospace" textAnchor="middle" fill={PURPLE_BRIGHT}>
        {fmtHz(x3)}
      </text>
    </svg>
  );
};

// Single band column: GR meter + 3 knobs (Thresh, Ratio, Gain).
const BandColumn = ({
  index,
  color,
  label,
  thresh,
  ratio,
  gain,
  setThresh,
  setRatio,
  setGain,
  getComp,
}) => {
  const grTarget = useGRMeter(getComp, { targetDb: 12 });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: 8,
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${color}55`,
        borderRadius: 4,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: color,
          letterSpacing: 1.5,
          fontFamily: "monospace",
          fontWeight: 700,
          textShadow: `0 0 4px ${color}66`,
        }}
      >
        {label}
      </div>
      <LEDLadder
        value={grTarget}
        orientation="vertical"
        segments={10}
        color={color}
        dimColor="#1a0a1a"
        width={20}
        height={80}
        reverse={true}
      />
      <AnalogKnob
        value={thresh}
        min={-40}
        max={0}
        onChange={setThresh}
        style="modern"
        size={44}
        color="#1a0a25"
        indicatorColor={color}
        label="THR"
        valueLabel={`${thresh.toFixed(1)}`}
        step={0.1}
        accentColor={color}
      />
      <AnalogKnob
        value={ratio}
        min={1}
        max={20}
        onChange={setRatio}
        style="modern"
        size={44}
        color="#1a0a25"
        indicatorColor={color}
        label="RATIO"
        valueLabel={`${ratio.toFixed(1)}:1`}
        step={0.1}
        accentColor={color}
      />
      <AnalogKnob
        value={gain}
        min={-12}
        max={12}
        onChange={setGain}
        style="modern"
        size={44}
        color="#1a0a25"
        indicatorColor={color}
        label="GAIN"
        valueLabel={`${gain >= 0 ? "+" : ""}${gain.toFixed(1)}`}
        step={0.1}
        accentColor={color}
      />
    </div>
  );
};

export default function MultiPressUI2({ params, onChange, onClose, getInstance }) {
  const [s, setS] = useState({
    xover1: 100,
    xover2: 1000,
    xover3: 8000,
    b1Thresh: -10,
    b1Ratio: 2,
    b1Gain: 0,
    b2Thresh: -10,
    b2Ratio: 2,
    b2Gain: 0,
    b3Thresh: -10,
    b3Ratio: 2,
    b3Gain: 0,
    b4Thresh: -10,
    b4Ratio: 2,
    b4Gain: 0,
    ...(params || {}),
  });
  useEffect(() => {
    onChange && onChange(s);
  }, [s]);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        width: 540,
        zIndex: 1000,
        filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 16px ${PURPLE}33)`,
      }}
    >
      <HardwarePanel skin="black-rack" accentColor={PURPLE_DEEP} padding={14}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${PURPLE}55`,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'Trebuchet MS', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: PURPLE_BRIGHT,
                letterSpacing: 4,
                textShadow: `0 0 8px ${PURPLE}66`,
              }}
            >
              MULTI-PRESS
            </span>
            <span
              style={{
                marginLeft: 10,
                fontSize: 10,
                color: PURPLE,
                letterSpacing: 2,
              }}
            >
              4-BAND MASTERING
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#ddd",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Crossover graph */}
        <div
          style={{
            marginBottom: 10,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: "inset 0 1px 4px rgba(0,0,0,0.7)",
          }}
        >
          <CrossoverGraph x1={s.xover1} x2={s.xover2} x3={s.xover3} />
        </div>

        {/* Crossover knobs row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-end",
            padding: "8px 4px",
            marginBottom: 10,
            background: "rgba(20,5,40,0.5)",
            borderRadius: 3,
            border: `1px solid ${PURPLE_DEEP}`,
          }}
        >
          <AnalogKnob
            value={s.xover1}
            min={20}
            max={500}
            onChange={set("xover1")}
            style="modern"
            size={48}
            color="#1a0a25"
            indicatorColor={PURPLE_BRIGHT}
            label="XOVER 1"
            valueLabel={`${Math.round(s.xover1)} Hz`}
            step={1}
            accentColor={PURPLE}
          />
          <AnalogKnob
            value={s.xover2}
            min={200}
            max={4000}
            onChange={set("xover2")}
            style="modern"
            size={48}
            color="#1a0a25"
            indicatorColor={PURPLE_BRIGHT}
            label="XOVER 2"
            valueLabel={`${(s.xover2 / 1000).toFixed(2)} kHz`}
            step={1}
            accentColor={PURPLE}
          />
          <AnalogKnob
            value={s.xover3}
            min={2000}
            max={18000}
            onChange={set("xover3")}
            style="modern"
            size={48}
            color="#1a0a25"
            indicatorColor={PURPLE_BRIGHT}
            label="XOVER 3"
            valueLabel={`${(s.xover3 / 1000).toFixed(1)} kHz`}
            step={10}
            accentColor={PURPLE}
          />
        </div>

        {/* 4 band columns */}
        <div style={{ display: "flex", gap: 6 }}>
          <BandColumn
            index={0}
            color={BAND_COLORS[0]}
            label={BAND_LABELS[0]}
            thresh={s.b1Thresh}
            ratio={s.b1Ratio}
            gain={s.b1Gain}
            setThresh={set("b1Thresh")}
            setRatio={set("b1Ratio")}
            setGain={set("b1Gain")}
            getComp={() => getInstance && getInstance()?.meters?.comps?.[0]}
          />
          <BandColumn
            index={1}
            color={BAND_COLORS[1]}
            label={BAND_LABELS[1]}
            thresh={s.b2Thresh}
            ratio={s.b2Ratio}
            gain={s.b2Gain}
            setThresh={set("b2Thresh")}
            setRatio={set("b2Ratio")}
            setGain={set("b2Gain")}
            getComp={() => getInstance && getInstance()?.meters?.comps?.[1]}
          />
          <BandColumn
            index={2}
            color={BAND_COLORS[2]}
            label={BAND_LABELS[2]}
            thresh={s.b3Thresh}
            ratio={s.b3Ratio}
            gain={s.b3Gain}
            setThresh={set("b3Thresh")}
            setRatio={set("b3Ratio")}
            setGain={set("b3Gain")}
            getComp={() => getInstance && getInstance()?.meters?.comps?.[2]}
          />
          <BandColumn
            index={3}
            color={BAND_COLORS[3]}
            label={BAND_LABELS[3]}
            thresh={s.b4Thresh}
            ratio={s.b4Ratio}
            gain={s.b4Gain}
            setThresh={set("b4Thresh")}
            setRatio={set("b4Ratio")}
            setGain={set("b4Gain")}
            getComp={() => getInstance && getInstance()?.meters?.comps?.[3]}
          />
        </div>

        {/* Footer ID strip */}
        <div
          style={{
            marginTop: 10,
            fontSize: 8,
            color: PURPLE,
            letterSpacing: 4,
            textAlign: "center",
            fontFamily: "monospace",
          }}
        >
          SPX · MULTI-PRESS · 4-BAND MASTERING MK I
        </div>
      </HardwarePanel>
    </div>
  );
}
