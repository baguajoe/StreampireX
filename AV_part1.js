// =============================================================================
// ArrangerView.js — Part 1/4
// Imports · Constants · Helpers · WaveformMini · MidiRegionMini · Region
// =============================================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "../../styles/ArrangerView.css";
import AutomationLane, { AUTO_PARAMS, getValueAtTime } from "./AutomationLane";

// =============================================================================
// CONSTANTS
// =============================================================================
const STUDIO_TIER_LIMITS = {
  free:    { maxTracks: 4,  label: "Free",    color: "#666"    },
  starter: { maxTracks: 8,  label: "Starter", color: "#007aff" },
  creator: { maxTracks: 24, label: "Creator", color: "#ff9500" },
  pro:     { maxTracks: -1, label: "Pro",     color: "#34c759" },
};

const TRACK_COLORS = [
  "#e8652b","#1a4d7c","#10b981","#f59e0b","#7c3aed","#06b6d4","#f43f5e","#84cc16",
  "#ec4899","#14b8a6","#f97316","#8b5cf6","#0ea5e9","#ef4444","#22c55e","#a855f7",
  "#eab308","#3b82f6","#d946ef","#64748b","#fb923c","#2dd4bf","#c084fc","#f472b6",
];

const TRACK_TYPES = [
  { value: "audio",      label: "Audio",      icon: "🎤", color: "#34c759" },
  { value: "instrument", label: "Instrument", icon: "🎹", color: "#af52de" },
];

const INSTRUMENT_SOURCES = [
  { value: "piano",      label: "Piano",       icon: "🎹" },
  { value: "sampler",    label: "Sampler",     icon: "🎛️" },
  { value: "beat_maker", label: "Beat Maker",  icon: "🥁" },
  { value: "synth",      label: "Synth",       icon: "🎵" },
];

const SNAP_VALUES = [
  { label: "Off",  value: 0      },
  { label: "1 Bar",value: 1      },
  { label: "1/2",  value: 0.5   },
  { label: "1/4",  value: 0.25  },
  { label: "1/8",  value: 0.125 },
  { label: "1/16", value: 0.0625},
];

const MIN_ZOOM = 20;
const MAX_ZOOM = 200;
const DEFAULT_ZOOM = 60;

// =============================================================================
// HELPERS
// =============================================================================
const beatToPx    = (beat, zoom) => beat * zoom;
const pxToBeat    = (px, zoom)   => px / zoom;

const snapBeat = (beat, snapValue, timeSignatureTop) => {
  if (!snapValue) return beat;
  const snapBeats = snapValue * timeSignatureTop;
  return Math.round(beat / snapBeats) * snapBeats;
};

const formatBeatTime = (beat, bpm) => {
  const seconds = (beat / bpm) * 60;
  const m   = Math.floor(seconds / 60);
  const s   = Math.floor(seconds % 60);
  const ms  = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

const formatBarBeat = (beat, timeSignatureTop) => {
  const bar       = Math.floor(beat / timeSignatureTop) + 1;
  const beatInBar = Math.floor(beat % timeSignatureTop) + 1;
  return `${bar}.${beatInBar}`;
};

// =============================================================================
// WAVEFORM MINI
// =============================================================================
const WaveformMini = React.memo(({ audioUrl, color, width, height }) => {
  const canvasRef  = useRef(null);
  const [waveData, setWaveData] = useState(null);

  useEffect(() => {
    if (!audioUrl) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    fetch(audioUrl)
      .then(r  => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const raw     = decoded.getChannelData(0);
        const samples = Math.min(width * 2, 512);
        const blockSize = Math.floor(raw.length / samples);
        const peaks = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) sum += Math.abs(raw[i * blockSize + j]);
          peaks.push(sum / blockSize);
        }
        setWaveData(peaks);
        ctx.close();
      })
      .catch(() => ctx.close());
  }, [audioUrl, width]);

  useEffect(() => {
    if (!waveData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const c      = canvas.getContext("2d");
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, width, height);
    const max  = Math.max(...waveData, 0.01);
    const barW = width / waveData.length;
    const mid  = height / 2;
    c.fillStyle   = color || "#34c759";
    c.globalAlpha = 0.75;
    waveData.forEach((v, i) => {
      const h = (v / max) * mid * 0.9;
      c.fillRect(i * barW, mid - h, Math.max(barW - 0.5, 0.5), h * 2);
    });
  }, [waveData, width, height, color]);

  return <canvas ref={canvasRef} className="arranger-waveform-canvas" />;
});

// =============================================================================
// MIDI REGION MINI
// =============================================================================
const MidiRegionMini = React.memo(({ notes, width, height, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !notes || notes.length === 0) return;
    const c   = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, width, height);

    let minNote = 127, maxNote = 0, maxBeat = 0;
    notes.forEach(n => {
      if (n.note < minNote) minNote = n.note;
      if (n.note > maxNote) maxNote = n.note;
      const end = (n.startBeat || 0) + (n.duration || 0.25);
      if (end > maxBeat) maxBeat = end;
    });
    if (minNote > maxNote) return;
    const noteRange = Math.max(maxNote - minNote + 1, 12);
    const noteH     = Math.max(height / noteRange, 1.5);

    c.fillStyle   = color || "#af52de";
    c.globalAlpha = 0.8;
    notes.forEach(n => {
      const x = maxBeat > 0 ? ((n.startBeat || 0) / maxBeat) * width : 0;
      const w = maxBeat > 0 ? ((n.duration || 0.25) / maxBeat) * width : 2;
      const y = height - ((n.note - minNote + 1) / noteRange) * height;
      c.fillRect(x, y, Math.max(w, 1), noteH);
    });
  }, [notes, width, height, color]);

  return <canvas ref={canvasRef} className="arranger-midi-canvas" />;
});

// =============================================================================
// REGION COMPONENT
// =============================================================================
const Region = React.memo(({
  region, trackColor, trackType, zoom, snapValue, timeSignatureTop,
  onMove, onResize, onSelect, isSelected, onContextMenu, trackHeight,
}) => {
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef({ x: 0, startBeat: 0, duration: 0 });

  const left  = beatToPx(region.startBeat, zoom);
  const width = Math.max(beatToPx(region.duration, zoom), 8);

  const handleMouseDown = (e, action) => {
    e.stopPropagation(); e.preventDefault();
    onSelect(region.id);
    setDragging(action);
    dragStart.current = { x: e.clientX, startBeat: region.startBeat, duration: region.duration };

    const handleMouseMove = (e2) => {
      const dx     = e2.clientX - dragStart.current.x;
      const dBeats = pxToBeat(dx, zoom);
      if (action === "move") {
        const newStart = snapBeat(Math.max(0, dragStart.current.startBeat + dBeats), snapValue, timeSignatureTop);
        onMove(region.id, newStart);
      } else if (action === "resize-right") {
        const newDur = Math.max(snapBeat(dragStart.current.duration + dBeats, snapValue, timeSignatureTop), snapValue * timeSignatureTop || 0.25);
        onResize(region.id, region.startBeat, newDur);
      } else if (action === "resize-left") {
        const newStart = snapBeat(Math.max(0, dragStart.current.startBeat + dBeats), snapValue, timeSignatureTop);
        const newDur   = dragStart.current.duration - (newStart - dragStart.current.startBeat);
        if (newDur > 0.25) onResize(region.id, newStart, newDur);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup",   handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup",   handleMouseUp);
  };

  const isInstrument = trackType === "instrument";
  const regionBg     = isInstrument
    ? "linear-gradient(180deg, rgba(167,139,250,.28), rgba(167,139,250,.1))"
    : `linear-gradient(180deg, ${trackColor}44, ${trackColor}18)`;
  const regionBorder = isInstrument ? "rgba(167,139,250,.4)" : `${trackColor}88`;

  return (
    <div
      className={"arr-region" + (isSelected ? " selected" : "") + (dragging ? " dragging" : "") + (isInstrument ? " instrument" : "")}
      style={{
        left:             `${left}px`,
        width:            `${width}px`,
        height:           `${trackHeight - 8}px`,
        background:       regionBg,
        borderColor:      regionBorder,
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, region); }}
    >
      <div className="arr-region-handle left" onMouseDown={(e) => handleMouseDown(e, "resize-left")}/>
      <div className="arr-region-content">
        <span className="arr-region-label">{region.name || (isInstrument ? "MIDI" : "Audio")}</span>
        {!isInstrument && region.audioUrl && (
          <WaveformMini audioUrl={region.audioUrl} color={trackColor} width={Math.max(width - 16, 20)} height={trackHeight - 28}/>
        )}
        {isInstrument && region.notes && region.notes.length > 0 && (
          <MidiRegionMini notes={region.notes} color={trackColor} width={Math.max(width - 16, 20)} height={trackHeight - 28}/>
        )}
        {!region.audioUrl && !(isInstrument && region.notes?.length) && (
          <div className="arr-region-empty-wave"/>
        )}
      </div>
      <div className="arr-region-handle right" onMouseDown={(e) => handleMouseDown(e, "resize-right")}/>
    </div>
  );
});
