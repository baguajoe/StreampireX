// ═══ AV_part1.js ═══
// =============================================================================
// ArrangerView.js — Part 1/4
// Imports · Constants · Helpers · WaveformMini · MidiRegionMini · Region
// =============================================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "../../styles/ArrangerView.css";
import AutomationLane, { AUTO_PARAMS, getValueAtTime } from "./AutomationLane";
import { DEFAULT_TRACK } from "../utils/trackFactory";
// Part 10: BPM + Key + Loudness detection moved to a shared module so other
// surfaces (SPX DJ Pro, SPX Cast, Beat Lab) can reuse the same analyzer.
import { analyzeAll, camelotColor } from "../utils/audioAnalysis";

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
const beatToPx    = (beat, zoom, bpm = 120) => {
  // Adjust zoom based on BPM so grid spacing reflects actual tempo
  // Standard zoom is calibrated for 120 BPM
  const bpmFactor = bpm / 120;
  return beat * zoom * bpmFactor;
};
const pxToBeat    = (px, zoom, bpm = 120) => {
  const bpmFactor = bpm / 120;
  return px / (zoom * bpmFactor);
};

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
// BPM DETECTION (Bug #4)
// =============================================================================
// Onset-envelope + autocorrelation. Far more robust than threshold-on-RMS: ignores
// dynamics, tolerates missed onsets, works across genres. Returns rounded BPM in
// [60, 200], or null if no clear lag.
//
// Part 10: implementation moved to utils/audioAnalysis.js so SPX DJ Pro, SPX
// Cast and Beat Lab can share the same analyzer. Local shim returns just the
// rounded BPM number to preserve the existing onBpmDetected(num) call shape.
const detectBpmAutocorr = (audioBuffer) => {
  const r = analyzeAll(audioBuffer);
  return r?.bpm?.bpm ?? null;
};

// =============================================================================
// WAVEFORM MINI
// =============================================================================
// Bug #3b: a fresh AudioContext was being created per width change (deps were
// [audioUrl, width]). Browsers cap concurrent contexts (~6 in Chrome) and then
// silently fail decode, leaving every later region flat. Use a single lazy
// module-level context for all decode work, and never close it.
let _waveformDecodeCtx = null;
const getDecodeCtx = () => {
  if (!_waveformDecodeCtx) _waveformDecodeCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _waveformDecodeCtx;
};
// Bug #3c: cache absolute peak summaries per audioUrl so re-renders / resize / scroll
// don't re-decode the same blob. Simple LRU eviction at 50 entries.
const _peakCache = new Map(); // audioUrl -> Float32Array of peaks (DENSE_PEAKS samples)
const PEAK_CACHE_MAX = 50;
const DENSE_PEAKS = 512;
const _peakCacheGet = (key) => {
  if (!_peakCache.has(key)) return null;
  const v = _peakCache.get(key);
  _peakCache.delete(key); _peakCache.set(key, v); // bump recency
  return v;
};
const _peakCacheSet = (key, v) => {
  if (_peakCache.has(key)) _peakCache.delete(key);
  _peakCache.set(key, v);
  while (_peakCache.size > PEAK_CACHE_MAX) {
    const oldest = _peakCache.keys().next().value;
    _peakCache.delete(oldest);
  }
};
const _peaksFromBuffer = (buf) => {
  const ch0 = buf.getChannelData(0);
  const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const blockSize = Math.max(1, Math.floor(ch0.length / DENSE_PEAKS));
  const peaks = new Float32Array(DENSE_PEAKS);
  for (let i = 0; i < DENSE_PEAKS; i++) {
    let sum = 0; const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const idx = start + j;
      const a = Math.abs(ch0[idx] || 0);
      const b = ch1 ? Math.abs(ch1[idx] || 0) : 0;
      sum += ch1 ? (a + b) * 0.5 : a;
    }
    peaks[i] = sum / blockSize;
  }
  return peaks;
};

// Bug #3e: accepts audioBuffer fallback so regions whose blob URL was dropped
// (project save path strips audioUrl) still render a real waveform.
const WaveformMini = React.memo(({ audioUrl, audioBuffer, color, width, height }) => {
  const canvasRef = useRef(null);
  const [peaks, setPeaks] = useState(() => audioUrl ? _peakCacheGet(audioUrl) : null);
  const [decodeFailed, setDecodeFailed] = useState(false);

  useEffect(() => {
    setDecodeFailed(false);
    // Cache hit (Bug #3c): skip decode entirely.
    if (audioUrl) {
      const cached = _peakCacheGet(audioUrl);
      if (cached) { setPeaks(cached); return; }
    }
    // Decoded-buffer fast path (Bug #3e): no fetch/decode needed.
    if (audioBuffer) {
      const p = _peaksFromBuffer(audioBuffer);
      if (audioUrl) _peakCacheSet(audioUrl, p);
      setPeaks(p);
      return;
    }
    if (!audioUrl) { setPeaks(null); return; }
    let cancelled = false;
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => getDecodeCtx().decodeAudioData(buf))
      .then(decoded => {
        if (cancelled) return;
        const p = _peaksFromBuffer(decoded);
        _peakCacheSet(audioUrl, p);
        setPeaks(p);
      })
      .catch(() => { if (!cancelled) setDecodeFailed(true); });
    return () => { cancelled = true; };
  }, [audioUrl, audioBuffer]);

  // Bug #3d: redraw on parent resize so the canvas stays crisp at any zoom level.
  useEffect(() => {
    if (!peaks || !canvasRef.current) return;
    const draw = () => {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width || width || 1));
      const h = Math.max(1, Math.floor(rect.height || height || 1));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const c = canvas.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      // Resample dense peaks → display columns.
      const cols = Math.max(8, Math.min(w, peaks.length));
      const stride = peaks.length / cols;
      let max = 0;
      for (let i = 0; i < peaks.length; i++) if (peaks[i] > max) max = peaks[i];
      if (max < 0.01) max = 0.01;
      const barW = w / cols;
      const mid = h / 2;
      c.fillStyle = color || "#34c759";
      c.globalAlpha = 0.78;
      for (let i = 0; i < cols; i++) {
        let s = 0; const a = Math.floor(i * stride), b = Math.floor((i + 1) * stride);
        for (let k = a; k < b; k++) s += peaks[k] || 0;
        const v = s / Math.max(1, b - a);
        const bh = (v / max) * mid * 0.92;
        c.fillRect(i * barW, mid - bh, Math.max(barW - 0.5, 0.5), bh * 2);
      }
    };
    draw();
    const parent = canvasRef.current?.parentElement;
    let ro = null;
    if (parent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => draw());
      ro.observe(parent);
    }
    return () => { if (ro) ro.disconnect(); };
  }, [peaks, width, height, color]);

  // Bug #3e: tinted dashed placeholder when we have neither URL nor buffer (or decode failed).
  if (!peaks && (decodeFailed || (!audioUrl && !audioBuffer))) {
    return <div className="arr-region-placeholder-wave" style={{ color: color || "#34c759" }} />;
  }
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
  onMove, onResize, onSelect, isSelected, onContextMenu, trackHeight, bpm = 120,
  onOpenClipEditor, // Bug #9: dbl-click opens AudioClipEditor for audio regions.
  trackIndex, regionIndex,
}) => {
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef({ x: 0, startBeat: 0, duration: 0 });

  const left  = beatToPx(region.startBeat, zoom, bpm);
  const width = Math.max(beatToPx(region.duration, zoom, bpm), 8);

  const handleMouseDown = (e, action) => {
    e.stopPropagation(); e.preventDefault();
    onSelect(region.id);
    setDragging(action);
    dragStart.current = { x: e.clientX, startBeat: region.startBeat, duration: region.duration };

    const handleMouseMove = (e2) => {
      const dx     = e2.clientX - dragStart.current.x;
      const dBeats = pxToBeat(dx, zoom, bpm);
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
      onDoubleClick={(e) => {
        // Bug #9: only audio regions get the editor; instrument regions belong in the Piano Roll.
        if (isInstrument) return;
        e.stopPropagation();
        onOpenClipEditor && onOpenClipEditor(region, trackIndex, regionIndex);
      }}
    >
      <div className="arr-region-handle left" onMouseDown={(e) => handleMouseDown(e, "resize-left")}/>
      <div className="arr-region-content">
        <span className="arr-region-label">{region.name || (isInstrument ? "MIDI" : "Audio")}</span>
        {/* Part 10: Camelot key badge — color-coded by Camelot wheel position so harmonically-mixable keys are visually adjacent. Hidden when no analysis is available (instruments, undecoded clips). */}
        {region.metadata?.key?.camelot && (
          <span
            className="arr-region-camelot"
            style={{ background: camelotColor(region.metadata.key.camelot), color: "#06070d" }}
            title={`${region.metadata.key.key} (${region.metadata.key.camelot}) · ${region.metadata.bpm?.bpm ?? "?"} BPM · ${region.metadata.loudness?.lufs ?? "?"} LUFS · key conf ${region.metadata.key.confidence}`}
          >
            {region.metadata.key.camelot}
          </span>
        )}
        {!isInstrument && (region.audioUrl || region.audioBuffer) && (
          <WaveformMini audioUrl={region.audioUrl} audioBuffer={region.audioBuffer} color={trackColor} width={Math.max(width - 16, 20)} height={trackHeight - 28}/>
        )}
        {isInstrument && region.notes && region.notes.length > 0 && (
          <MidiRegionMini notes={region.notes} color={trackColor} width={Math.max(width - 16, 20)} height={trackHeight - 28}/>
        )}
        {!isInstrument && !region.audioUrl && !region.audioBuffer && (
          <div className="arr-region-placeholder-wave" style={{ color: trackColor }}/>
        )}
        {isInstrument && !(region.notes && region.notes.length > 0) && (
          <div className="arr-region-empty-wave"/>
        )}
      </div>
      <div className="arr-region-handle right" onMouseDown={(e) => handleMouseDown(e, "resize-right")}/>
    </div>
  );
});


// ═══ AV_part2.js ═══
// =============================================================================
// ArrangerView.js — Part 2/4
// TrackHeader · CycleRuler · GridOverlay
// =============================================================================

// =============================================================================
// TRACK HEADER
// =============================================================================
const TrackHeader = React.memo(({
  track, index, isSelected, onSelect, onUpdate, onRemove,
  onToggleMute, onToggleSolo, onToggleArm, onToggleFx,
  onImport, onClear, onFreeze, onUnfreeze, onFlexPitch, onBrowseSounds,
  hasSolo, onOpenPianoRoll, instrumentEngine,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal]   = useState(track.name || `Track ${index + 1}`);
  const nameRef = useRef(null);

  useEffect(() => { setNameVal(track.name || `Track ${index + 1}`); }, [track.name, index]);

  const commitRename = () => {
    if (nameVal.trim()) onUpdate(index, { name: nameVal.trim() });
    setRenaming(false);
  };

  const isAudible = !track.muted && (!hasSolo || track.solo);
  const isInstrument = track.trackType === "instrument" || track.trackType === "midi";

  return (
    <div
      className={"arr-track-header" + (isSelected ? " selected" : "") + (track.armed ? " armed" : "")}
      onClick={() => onSelect(index)}
    >
      {/* Color bar */}
      <div className="arr-th-colorbar" style={{ background: track.color || TRACK_COLORS[index % TRACK_COLORS.length] }}/>

      {/* Track number + type icon */}
      <div className="arr-th-index">
        <span className="arr-th-num">{index + 1}</span>
        <span className="arr-th-icon">{isInstrument ? "🎹" : "🎤"}</span>
      </div>

      {/* Name */}
      <div className="arr-th-name-wrap">
        {renaming ? (
          <input
            ref={nameRef}
            className="arr-th-name-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="arr-th-name"
            style={{ color: track.color || TRACK_COLORS[index % TRACK_COLORS.length] }}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
            title="Double-click to rename"
          >
            {track.name || `Track ${index + 1}`}
            {track.frozen ? " ❄" : ""}
          </span>
        )}
      </div>

      {/* MSR badges */}
      <div className="arr-th-badges">
        <button
          className={"arr-th-badge mute" + (track.muted ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleMute(index); }}
          title="Mute"
        >M</button>
        <button
          className={"arr-th-badge solo" + (track.solo ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleSolo(index); }}
          title="Solo"
        >S</button>
        <button
          className={"arr-th-badge rec" + (track.armed ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleArm(index); }}
          title="Record arm"
        >●</button>
      </div>

      {/* Volume + Pan readout */}
      <div className="arr-th-vol-readout" onClick={e => e.stopPropagation()} title="Volume">
        <span className="arr-th-vol-db">{(track.volume??1.0)>0?(20*Math.log10(track.volume??1.0)).toFixed(1):"-∞"} dB</span>
        <span className="arr-th-pan-val" style={{marginLeft:6,color:'#7a8aaa',fontSize:'8px'}}>{track.pan===0?'C':track.pan>0?`R${Math.round(track.pan*100)}`:`L${Math.round(Math.abs(track.pan)*100)}`}</span>
      </div>

      {/* Monitor + R/W automation row */}
      <div className="arr-th-rw-row" onClick={e => e.stopPropagation()}>
        <button
          className={"arr-th-badge monitor" + (track.monitoring ? " on" : "")}
          onClick={e => { e.stopPropagation(); onUpdate(index, { monitoring: !track.monitoring }); }}
          title={track.monitoring ? "Direct monitoring ON — click to turn off" : "Direct monitoring OFF — click to enable"}
        >🔊</button>
        <button
          className={"arr-th-badge loop" + (track.loopTrack ? " on" : "")}
          onClick={e => { e.stopPropagation(); onUpdate(index, { loopTrack: !track.loopTrack }); }}
          title="Loop this track"
        >∞</button>
        <button
          className={"arr-th-badge rw" + (track.readAutomation ? " on" : "")}
          onClick={e => { e.stopPropagation(); onUpdate(index, { readAutomation: !track.readAutomation }); }}
          title="Read automation"
        >R</button>
        <button
          className={"arr-th-badge rw" + (track.writeAutomation ? " on" : "")}
          onClick={e => { e.stopPropagation(); onUpdate(index, { writeAutomation: !track.writeAutomation }); }}
          title="Write automation"
        >W</button>
      </div>

      {/* Input routing */}
      {!isInstrument && (
        <div className="arr-th-input-row" onClick={e => e.stopPropagation()}>
          <span className="arr-th-input-label">IN</span>
          <select
            className="arr-th-input-select"
            value={track.inputRouting || "default"}
            onChange={e => onUpdate(index, { inputRouting: e.target.value })}
            title="Input routing"
          >
            <option value="default">Default Mic</option>
            <option value="input1">Input 1</option>
            <option value="input2">Input 2</option>
            <option value="stereo">Stereo In</option>
            <option value="none">No Input</option>
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="arr-th-actions" onClick={e => e.stopPropagation()}>
        {isInstrument ? (
          <>
            <button className="arr-th-action-btn" onClick={() => onBrowseSounds && onBrowseSounds(index)} title="Browse sounds">🎵</button>
            <button className="arr-th-action-btn" onClick={() => onToggleFx && onToggleFx(index)} title="FX">FX</button>
          </>
        ) : (
          <>
            {track.audioBuffer || track.audio_url
              ? <button className="arr-th-action-btn clear" onClick={() => onClear(index)} title="Clear track">✕</button>
              : <button className="arr-th-action-btn import" onClick={() => onImport && onImport(index)} title="Import audio">⤵</button>
            }
            <button className="arr-th-action-btn" onClick={() => onToggleFx && onToggleFx(index)} title="FX">FX</button>
            {track.audioBuffer && !track.frozen && (
              <button className="arr-th-action-btn freeze" onClick={() => onFreeze && onFreeze(index)} title="Freeze track — renders to audio, saves CPU">❄</button>
            )}
            {track.frozen && (
              <button className="arr-th-action-btn unfreeze" onClick={() => onUnfreeze && onUnfreeze(index)} title="Unfreeze track">🔥</button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// CYCLE RULER (Logic-style yellow loop region on ruler)
// =============================================================================
const CycleRuler = React.memo(({
  totalBeats, zoom, timeSignatureTop, bpm,
  cycleEnabled, cycleStart, cycleEnd,
  onCycleChange, onCycleToggle,
  scrollLeft,
}) => {
  const canvasRef  = useRef(null);
  const dragging   = useRef(null); // "loop-left" | "loop-right" | "loop-move" | "seek"
  const dragStartX = useRef(0);
  const dragStartVals = useRef({});

  const visibleBeats = totalBeats + 8;

  // Draw ruler
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    // Background
    c.fillStyle = "#0d1219"; c.fillRect(0, 0, W, H);

    // Cycle region
    if (cycleEnabled) {
      const x1 = beatToPx(cycleStart, zoom, bpm) - scrollLeft;
      const x2 = beatToPx(cycleEnd,   zoom, bpm) - scrollLeft;
      c.fillStyle = "rgba(255,204,0,.22)"; c.fillRect(x1, 0, x2 - x1, H);
      c.fillStyle = "#ffd700"; c.fillRect(x1, 0, 2, H); c.fillRect(x2 - 1, 0, 2, H);
      // Loop handles
      c.beginPath(); c.moveTo(x1, 0); c.lineTo(x1 + 8, 0); c.lineTo(x1, 10); c.closePath(); c.fillStyle = "#ffd700"; c.fill();
      c.beginPath(); c.moveTo(x2, 0); c.lineTo(x2 - 8, 0); c.lineTo(x2, 10); c.closePath(); c.fillStyle = "#ffd700"; c.fill();
    }

    // Bar lines + labels
    const beatsPerBar = timeSignatureTop || 4;
    c.font = '10px "JetBrains Mono","Consolas",monospace';

    for (let beat = 0; beat <= visibleBeats; beat++) {
      const x = beatToPx(beat, zoom, bpm) - scrollLeft;
      if (x < -20 || x > W + 20) continue;
      const isBar = beat % beatsPerBar === 0;

      if (isBar) {
        c.strokeStyle = "#2a3848"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, H * 0.3); c.lineTo(x, H); c.stroke();
        const bar = Math.floor(beat / beatsPerBar) + 1;
        c.fillStyle = "#6d8a9a"; c.fillText(String(bar), x + 3, H - 4);
      } else {
        c.strokeStyle = "#1a2530"; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, H * 0.65); c.lineTo(x, H); c.stroke();
      }
    }

    // Top border
    c.strokeStyle = "#1e2d3d"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, H - 0.5); c.lineTo(W, H - 0.5); c.stroke();
  }, [totalBeats, zoom, timeSignatureTop, cycleEnabled, cycleStart, cycleEnd, scrollLeft, visibleBeats]);

  const handleMouseDown = (e) => {
    const canvas  = canvasRef.current; if (!canvas) return;
    const rect    = canvas.getBoundingClientRect();
    const x       = e.clientX - rect.left;
    const beat    = pxToBeat(x + scrollLeft, zoom, bpm);

    if (cycleEnabled) {
      const x1 = beatToPx(cycleStart, zoom, bpm) - scrollLeft;
      const x2 = beatToPx(cycleEnd,   zoom, bpm) - scrollLeft;
      if (Math.abs(x - x1) < 10)      { dragging.current = "loop-left";  dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else if (Math.abs(x - x2) < 10) { dragging.current = "loop-right"; dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else if (x > x1 && x < x2)      { dragging.current = "loop-move";  dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else                             { dragging.current = "seek"; }
    } else {
      dragging.current = "seek";
    }

    if (dragging.current === "seek") {
      dragStartVals.current = { cycleStart: Math.max(0, beat), cycleEnd: Math.max(0, beat) + 4 };
      onCycleChange && onCycleChange(Math.max(0, beat), Math.max(0, beat) + 4);
    }

    const handleMove = (e2) => {
      const dx    = e2.clientX - dragStartX.current;
      const dBeat = pxToBeat(dx, zoom, bpm);
      const { cycleStart: cs, cycleEnd: ce } = dragStartVals.current;
      if      (dragging.current === "loop-left")  onCycleChange && onCycleChange(Math.max(0, cs + dBeat), ce);
      else if (dragging.current === "loop-right") onCycleChange && onCycleChange(cs, Math.max(cs + 1, ce + dBeat));
      else if (dragging.current === "loop-move")  onCycleChange && onCycleChange(Math.max(0, cs + dBeat), Math.max(1, ce + dBeat));
      else if (dragging.current === "seek") {
        const newEnd = Math.max(dragStartVals.current.cycleStart + 0.5, dragStartVals.current.cycleStart + dBeat);
        onCycleChange && onCycleChange(dragStartVals.current.cycleStart, newEnd);
        onCycleToggle && !cycleEnabled && onCycleToggle();
      }
    };
    const handleUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleUp);
  };

  const handleDoubleClick = (e) => {
    onCycleToggle && onCycleToggle();
  };

  return (
    <canvas
      ref={canvasRef}
      className="arr-cycle-ruler"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={cycleEnabled ? "Cycle ON — drag handles to adjust, dbl-click to toggle" : "Dbl-click to enable cycle"}
    />
  );
});

// =============================================================================
// GRID OVERLAY
// =============================================================================
const GridOverlay = React.memo(({ totalBeats, zoom, timeSignatureTop, trackCount, trackHeight, scrollLeft, bpm = 120 }) => {
  const canvasRef    = useRef(null);
  const visibleBeats = totalBeats + 8;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    const beatsPerBar = timeSignatureTop || 4;
    // Sub-grid: show 1/2 beat lines when zoomed in enough
    const subDiv = zoom >= 80 ? 0.5 : zoom >= 160 ? 0.25 : 1;

    for (let beat = 0; beat <= visibleBeats; beat += subDiv) {
      const x       = beatToPx(beat, zoom, bpm) - scrollLeft;
      if (x < 0 || x > W) continue;
      const isBar   = beat % beatsPerBar === 0 && Number.isInteger(beat / beatsPerBar);
      const isBeat  = Number.isInteger(beat);
      c.strokeStyle = isBar ? "#243040" : isBeat ? "#182030" : "#0f1820";
      c.lineWidth   = isBar ? 1 : isBeat ? 0.5 : 0.3;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }

    // Track lane dividers
    for (let t = 0; t <= trackCount; t++) {
      const y = t * trackHeight;
      c.strokeStyle = t === 0 ? "#1e2d3d" : "#111820";
      c.lineWidth   = 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
  }, [totalBeats, zoom, timeSignatureTop, trackCount, trackHeight, scrollLeft, visibleBeats, bpm]);

  return <canvas ref={canvasRef} className="arr-grid-overlay" />;
});


// ═══ AV_part3.js ═══
// =============================================================================
// ArrangerView.js — Part 3/4
// ContextMenu · TierBadge · AddTrackDropdown · ArrangerView state + callbacks
// =============================================================================

// =============================================================================
// CONTEXT MENU
// =============================================================================
const ContextMenu = React.memo(({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedStyle = useMemo(() => {
    if (!menuRef.current) return { left: x, top: y };
    
    const menuWidth = 200; // approximate menu width
    const menuHeight = items.length * 32 + 10; // approximate menu height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Prevent menu from going off right edge
    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10;
    }
    
    // Prevent menu from going off bottom edge
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10;
    }
    
    // Prevent menu from going off left/top edges
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    return { left: adjustedX, top: adjustedY };
  }, [x, y, items.length]);

  return (
    <div ref={menuRef} className="arr-ctx-menu" style={adjustedStyle}>
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} className="arr-ctx-divider" />
        ) : (
          <button
            key={i}
            className={"arr-ctx-item" + (item.danger ? " danger" : "")}
            onClick={() => { item.action(); onClose(); }}
            disabled={item.disabled}
          >
            {item.icon && <span className="arr-ctx-icon">{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
});

// =============================================================================
// TIER BADGE
// =============================================================================
const TierBadge = React.memo(({ userTier, trackCount, maxTracks }) => {
  const tier = STUDIO_TIER_LIMITS[userTier] || STUDIO_TIER_LIMITS.free;
  const atLimit = maxTracks > 0 && trackCount >= maxTracks;
  return (
    <div className={"arr-tier-badge" + (atLimit ? " at-limit" : "")} style={{ borderColor: tier.color, color: tier.color }}>
      {tier.label}: {trackCount}/{maxTracks < 0 ? "∞" : maxTracks}
    </div>
  );
});

// =============================================================================
// ADD TRACK DROPDOWN
// =============================================================================
const AddTrackDropdown = React.memo(({ onAdd, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="arr-add-track-dropdown">
      <button
        className="arr-add-track-btn"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        title="Add track"
      >
        + Track ▾
      </button>
      {open && (
        <div className="arr-add-track-menu">
          {TRACK_TYPES.map(tt => (
            <button
              key={tt.value}
              className="arr-add-track-item"
              onClick={() => { onAdd(tt.value); setOpen(false); }}
            >
              <span className="arr-add-track-icon">{tt.icon}</span>
              <span>{tt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PLAYHEAD
// =============================================================================
const Playhead = React.memo(({ beat, zoom, height, scrollLeft, bpm = 120 }) => {
  const x = beatToPx(beat, zoom, bpm) - scrollLeft;
  if (x < 0) return null;
  return (
    <div className="arr-playhead" style={{ left: `${x}px`, height: `${height}px` }}>
      <div className="arr-playhead-head" />
    </div>
  );
});

// =============================================================================
// ARRANGER VIEW — STATE + CALLBACKS
// =============================================================================
const ArrangerView = ({
  tracks = [], setTracks,
  bpm = 120, timeSignatureTop = 4, timeSignatureBottom = 4,
  masterVolume = 0.8, onMasterVolumeChange,
  projectName = "Untitled", userTier = "free",
  playheadBeat = 0, isPlaying = false, isRecording = false,
  onPlay, onStop, onRecord, onSeek, onBpmChange, onTimeSignatureChange,
  onToggleFx, onBounce, onSave, saving = false,
  cycleEnabled = false, cycleStart = 0, cycleEnd = 8,
  onCycleChange, onCycleToggle,
  instrumentEngine,
  onBrowseSounds, onOpenPianoRoll, onTimelineDoubleClick,
  MidiRegionPreview, onAddTrack, onBpmDetected,
  onOpenClipEditor, // Bug #9
  // Part 10: full audio analysis (BPM + key + Camelot + loudness) emitted per
  // dropped/imported audio file. Parent can store this on the track / region
  // for display in the inspector and as a colored badge on the clip.
  onAnalysisComplete,
  // Part 13 (#13-1): when the parent passes selectedTrack/onSelectTrack, the
  // arranger acts as a controlled component so LeftSidebar (and any other
  // parent-rendered inspector) shares the same selection. Falls back to local
  // state when the prop is omitted.
  selectedTrack: selectedTrackProp,
  onSelectTrack,
  // Optional parent ref to the lanes scroll container — used by Follow
  // Playhead in RecordingStudio to drive auto-scroll without lifting state.
  scrollContainerRef,
}) => {
  // ── State ──
  const [zoom,          setZoom]          = useState(DEFAULT_ZOOM);
  const [snapIndex,     setSnapIndex]     = useState(2);     // 1/2 bar default
  const [scrollLeft,    setScrollLeft]    = useState(0);
  const [scrollTop,     setScrollTop]     = useState(0);
  const [internalSelectedTrack, setInternalSelectedTrack] = useState(0);
  const selectedTrack = selectedTrackProp != null ? selectedTrackProp : internalSelectedTrack;
  const setSelectedTrack = useCallback((updater) => {
    const next = typeof updater === "function" ? updater(selectedTrack) : updater;
    if (onSelectTrack) onSelectTrack(next);
    setInternalSelectedTrack(next);
  }, [selectedTrack, onSelectTrack]);
  const [selectedRegion,setSelectedRegion]= useState(null);
  const [contextMenu,   setContextMenu]   = useState(null);
  const [showAutoTrack, setShowAutoTrack] = useState(null);  // track index
  const [autoParam,     setAutoParam]     = useState("volume");
  const [automation,    setAutomation]    = useState({});
  const [trackHeight,   setTrackHeight]   = useState(72);

  const timelineRef  = useRef(null);
  const scrollRef    = useRef(null);

  const snapValue  = SNAP_VALUES[snapIndex]?.value ?? 0.5;
  const maxTracks  = STUDIO_TIER_LIMITS[userTier]?.maxTracks ?? 4;
  const hasSolo    = tracks.some(t => t.solo);

  // Total visible beats
  const totalBeats = useMemo(() => {
    let maxBeat = 16;
    tracks.forEach(t => {
      (t.regions || []).forEach(r => {
        const end = (r.startBeat || 0) + (r.duration || 0);
        if (end > maxBeat) maxBeat = end;
      });
    });
    return Math.ceil(maxBeat + 16);
  }, [tracks]);

  // ── Scroll sync ──
  const handleScroll = useCallback((e) => {
    setScrollLeft(e.target.scrollLeft);
    setScrollTop(e.target.scrollTop);
  }, []);

  // Stable callback ref so React doesn't re-mount onDrop/onDragOver listeners
  // each render (an inline ref function caused desktop-file drops to silently
  // no-op after the Follow Playhead commit).
  const setScrollRefs = useCallback((el) => {
    scrollRef.current = el;
    if (scrollContainerRef) {
      if (typeof scrollContainerRef === "function") scrollContainerRef(el);
      else scrollContainerRef.current = el;
    }
  }, [scrollContainerRef]);

  // ── Zoom ──
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.4)));
    }
  }, []);

  // ── Track mutations ──
  const updateTrack = useCallback((index, updates) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }, [setTracks]);

  const addTrack = useCallback((type = "audio") => {
    // Bug #1 (Part 9): read `prev.length` inside the functional updater so a
    // file-drop that appended a track milliseconds earlier doesn't leave us
    // with a stale closure (i / limit check both wrong → silent no-op).
    setTracks(prev => {
      const i = prev.length;
      if (maxTracks > 0 && i >= maxTracks) return prev;
      const t = DEFAULT_TRACK(i, type, {
        name: `${type === "instrument" ? "MIDI" : "Audio"} ${i + 1}`,
        color: TRACK_COLORS[i % TRACK_COLORS.length],
      });
      setSelectedTrack(i);
      return [...prev, t];
    });
  }, [maxTracks, setTracks]);

  const handleFileDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i));
    if (!files.length) return;
    const scrollEl = e.currentTarget;
    const rect = scrollEl.getBoundingClientRect();
    const dropX = e.clientX - rect.left + scrollEl.scrollLeft;
    const startBeat = Math.max(0, Math.floor(pxToBeat(dropX, zoom, bpm)));
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const arrayBuf = await file.arrayBuffer();
      let duration = 4;
      let decodedBuf = null;
      try {
        // Bug #3b: reuse the same singleton context so dropping many files doesn't exhaust the AudioContext pool.
        decodedBuf = await getDecodeCtx().decodeAudioData(arrayBuf);
        duration = decodedBuf.duration;
        // Part 10: single-pass BPM + key + loudness analysis. analyzeAll
        // shares the mono mixdown so a 4-min file analyzes in one O(N) sweep.
        // Wrapped in try/catch + tagged log so a single failed file (e.g.
        // ultra-short stab sample) doesn't break the whole drop.
        try {
          const analysis = analyzeAll(decodedBuf);
          if (analysis?.bpm?.bpm && onBpmDetected) onBpmDetected(analysis.bpm.bpm);
          if (analysis && onAnalysisComplete) onAnalysisComplete(analysis, file.name);
          if (analysis) console.log(`[SPX analyze] ${file.name}: BPM ${analysis.bpm?.bpm} (conf ${analysis.bpm?.confidence}), key ${analysis.key?.key} (${analysis.key?.camelot}, conf ${analysis.key?.confidence}), LUFS ${analysis.loudness?.lufs}`);
        } catch (e) { console.warn("[SPX analyze] failed for", file.name, e); }
      } catch(err) {}
      const beatsPerSecond = bpm / 60;
      const regionBeats = Math.ceil(duration * beatsPerSecond);
      // Part 10: stash the cached analysis on the track + region so the
      // inspector + region badge can render BPM / Camelot without re-running
      // analyzeAll. analyzeAll caches per-AudioBuffer (WeakMap), so this read
      // is O(1).
      const meta = (() => { try { return analyzeAll(decodedBuf); } catch { return null; } })();
      // Bug #1 (Part 9): use prev.length inside the functional updater so back-to-back
      // drops within the same loop iteration each get the correct index/color.
      setTracks(prev => {
        const i = prev.length;
        const newTrack = DEFAULT_TRACK(i, 'audio', {
          name: file.name.replace(/\.[^.]+$/, ''),
          color: TRACK_COLORS[i % TRACK_COLORS.length],
          audioBuffer: decodedBuf,
          audio_url: url,
          metadata: meta,
          regions: [{
            id: `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            startBeat: startBeat,
            duration: regionBeats,
            audioUrl: url,
            audioBuffer: decodedBuf,
            metadata: meta,
            name: file.name.replace(/\.[^.]+$/, ''),
            color: TRACK_COLORS[i % TRACK_COLORS.length],
          }],
        });
        setSelectedTrack(i);
        return [...prev, newTrack];
      });
    }
  }, [bpm, zoom, setTracks, onBpmDetected]);

  const removeTrack = useCallback((index) => {
    if (tracks.length <= 1) return;
    setTracks(prev => prev.filter((_, i) => i !== index));
    setSelectedTrack(prev => Math.max(0, Math.min(prev, tracks.length - 2)));
  }, [tracks.length, setTracks]);

  const toggleMute = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, muted: !t.muted } : t));
  }, [setTracks]);

  const toggleSolo = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, solo: !t.solo } : t));
  }, [setTracks]);

  const toggleArm = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => ({
      ...t,
      armed: i === index ? !t.armed : false,
    })));
  }, [setTracks]);

  // ── Region mutations ──
  const moveRegion = useCallback((trackIndex, regionId, newStart) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStart } : r) };
    }));
  }, [setTracks]);

  const resizeRegion = useCallback((trackIndex, regionId, newStart, newDuration) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStart, duration: newDuration } : r) };
    }));
  }, [setTracks]);

  const deleteRegion = useCallback((trackIndex, regionId) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).filter(r => r.id !== regionId) };
    }));
    setSelectedRegion(null);
  }, [setTracks]);

  const duplicateRegion = useCallback((trackIndex, regionId) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const newRegion = {
        ...region,
        id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        startBeat: region.startBeat + region.duration,
        name: (region.name || "Region") + " copy",
      };
      return { ...t, regions: [...t.regions, newRegion] };
    }));
  }, [setTracks]);

  const splitRegion = useCallback((trackIndex, regionId, splitBeat) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const relSplit = splitBeat - region.startBeat;
      if (relSplit <= 0 || relSplit >= region.duration) return t;
      const left  = { ...region, duration: relSplit };
      const right = {
        ...region,
        id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        startBeat: splitBeat,
        duration: region.duration - relSplit,
        name: (region.name || "Region") + " 2",
      };
      return { ...t, regions: [...t.regions.filter(r => r.id !== regionId), left, right] };
    }));
  }, [setTracks]);

  // ── Timeline click → seek ──
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current) return;
    const rect  = timelineRef.current.getBoundingClientRect();
    const x     = e.clientX - rect.left + scrollLeft;
    const beat  = Math.max(0, pxToBeat(x, zoom, bpm));
    onSeek && onSeek(beat);
  }, [zoom, scrollLeft, onSeek]);

  // ── Bug #5c: Alt+drag on timeline to define cycle region ──
  const [cycleDragOverlay, setCycleDragOverlay] = useState(null); // { x, w } in px
  const handleSeekLayerMouseDown = useCallback((e) => {
    if (!e.altKey) return; // Plain click falls through to handleTimelineClick → seek.
    if (!timelineRef.current) return;
    e.preventDefault();
    const rect = timelineRef.current.getBoundingClientRect();
    const startBeat = Math.max(0, pxToBeat(e.clientX - rect.left + scrollLeft, zoom, bpm));
    const startX = e.clientX - rect.left;
    setCycleDragOverlay({ x: startX, w: 0 });
    let endBeat = startBeat;
    const onMove = (m) => {
      const curX = m.clientX - rect.left;
      endBeat = Math.max(0, pxToBeat(m.clientX - rect.left + scrollLeft, zoom, bpm));
      const lo = Math.min(startX, curX), w = Math.abs(curX - startX);
      setCycleDragOverlay({ x: lo, w });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setCycleDragOverlay(null);
      const lo = Math.min(startBeat, endBeat);
      const hi = Math.max(startBeat, endBeat);
      // Require at least a tiny drag so an Alt+click doesn't blow away the existing region.
      if (hi - lo < 0.05) return;
      onCycleChange && onCycleChange(lo, hi);
      // Toggle cycle on if it's not already on.
      if (!cycleEnabled) onCycleToggle && onCycleToggle();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [zoom, scrollLeft, bpm, onCycleChange, onCycleToggle, cycleEnabled]);

  // ── Timeline double-click → add region ──
  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    if (onTimelineDoubleClick) onTimelineDoubleClick(e, trackIndex);
  }, [onTimelineDoubleClick]);

  // ── Region context menu ──
  const handleRegionContextMenu = useCallback((e, region, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    const clickBeat = pxToBeat(e.clientX - timelineRef.current?.getBoundingClientRect().left + scrollLeft, zoom, bpm);
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Duplicate",   icon: "⧉", action: () => duplicateRegion(trackIndex, region.id) },
        { label: "Split here",  icon: "✂", action: () => splitRegion(trackIndex, region.id, clickBeat) },
        ...(tracks[trackIndex]?.trackType === "instrument" && region.notes
          ? [{ label: "Edit in Piano Roll", icon: "🎹", action: () => onOpenPianoRoll && onOpenPianoRoll(trackIndex, region.id) }]
          : []
        ),
        "---",
        { label: "Delete",      icon: "🗑", danger: true, action: () => deleteRegion(trackIndex, region.id) },
      ],
    });
  }, [zoom, scrollLeft, tracks, duplicateRegion, splitRegion, deleteRegion, onOpenPianoRoll]);

  // ── Track context menu ──
  const handleTrackContextMenu = useCallback((e, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Rename",    icon: "✏", action: () => { const n = window.prompt("Rename:", tracks[trackIndex]?.name); if (n?.trim()) updateTrack(trackIndex, { name: n.trim() }); } },
        { label: "Duplicate track", icon: "⧉", action: () => { const t = tracks[trackIndex]; setTracks(prev => [...prev, { ...t, id: `trk_${Date.now()}`, name: t.name + " copy", regions: [] }]); } },
        "---",
        { label: "Remove track", icon: "🗑", danger: true, action: () => removeTrack(trackIndex), disabled: tracks.length <= 1 },
      ],
    });
  }, [tracks, updateTrack, removeTrack, setTracks]);

// ═══ AV_part4.js ═══
// =============================================================================
// ArrangerView.js — Part 4/4
// Full JSX render + export default
// =============================================================================

// NOTE: This is the closing of the ArrangerView component started in Part 3.
// The JSX return block below replaces the dangling closing brace at end of Part 3.
// The install script concatenates all 4 parts; the component declaration
// opened in Part 3 is closed here with the export at the bottom.

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.code) {
        case "Space":      e.preventDefault(); isPlaying ? onStop?.() : onPlay?.(); break;
        case "KeyR":       if (!e.metaKey) onRecord?.(); break;
        case "Equal":      setZoom(z => Math.min(MAX_ZOOM, z + 10)); break;
        case "Minus":      setZoom(z => Math.max(MIN_ZOOM, z - 10)); break;
        case "Delete":
        case "Backspace":
          if (selectedRegion) {
            const ti = tracks.findIndex(t => (t.regions || []).some(r => r.id === selectedRegion));
            if (ti !== -1) deleteRegion(ti, selectedRegion);
          }
          break;
        default: break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, onPlay, onStop, onRecord, selectedRegion, tracks, deleteRegion]);

  // ── Dismiss context menu on outside click ──
  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [contextMenu]);

  // ── Timeline total width ──
  const timelineWidth = beatToPx(totalBeats + 8, zoom, bpm);

  return (
    <div className="arr-root" onWheel={handleWheel}>

      {/* ══════ TOOLBAR ══════ */}
      <div className="arr-toolbar">
        <div className="arr-toolbar-left">
          {/* Transport */}
          <button className="arr-transport-btn" onClick={onStop} title="Stop">■</button>
          <button className={"arr-transport-btn play" + (isPlaying && !isRecording ? " active" : "")}
            onClick={() => isPlaying ? onStop?.() : onPlay?.()} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying && !isRecording ? "⏸" : "▶"}
          </button>
          <button className={"arr-transport-btn rec" + (isRecording ? " active" : "")}
            onClick={onRecord} title={isRecording ? "Stop recording" : "Record"}>
            <span className="arr-rec-dot"/>
          </button>

          <div className="arr-toolbar-divider"/>

          {/* BPM */}
          <div className="arr-bpm-wrap">
            <span className="arr-label">BPM</span>
            <input
              type="number" min={20} max={300}
              value={bpm}
              className="arr-bpm-input"
              onChange={e => onBpmChange?.(Math.max(20, Math.min(300, parseInt(e.target.value) || 120)))}
            />
          </div>

          {/* Time sig */}
          <div className="arr-timesig-wrap">
            <span className="arr-label">TIME</span>
            <input type="number" min={1} max={16} value={timeSignatureTop}
              className="arr-timesig-input"
              onChange={e => onTimeSignatureChange?.(parseInt(e.target.value) || 4, timeSignatureBottom)}/>
            <span className="arr-timesig-slash">/</span>
            <input type="number" min={1} max={16} value={timeSignatureBottom}
              className="arr-timesig-input"
              onChange={e => onTimeSignatureChange?.(timeSignatureTop, parseInt(e.target.value) || 4)}/>
          </div>

          <div className="arr-toolbar-divider"/>

          {/* Snap */}
          <div className="arr-snap-wrap">
            <span className="arr-label">SNAP</span>
            <select value={snapIndex} onChange={e => setSnapIndex(Number(e.target.value))} className="arr-snap-select">
              {SNAP_VALUES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
            </select>
          </div>

          {/* Zoom */}
          <div className="arr-zoom-wrap">
            <button className="arr-zoom-btn" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 10))} title="Zoom out">−</button>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={5} value={zoom}
              className="arr-zoom-slider" onChange={e => setZoom(Number(e.target.value))}/>
            <button className="arr-zoom-btn" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 10))} title="Zoom in">+</button>
          </div>

          {/* Cycle */}
          <button className={"arr-cycle-btn" + (cycleEnabled ? " active" : "")} onClick={onCycleToggle} title="Toggle cycle">
            ⟳ CYCLE
          </button>
        </div>

        <div className="arr-toolbar-right">
          {/* Master vol */}
          <div className="arr-master-wrap">
            <span className="arr-label">MASTER</span>
            <input type="range" min={0} max={1} step={0.01} value={masterVolume}
              className="arr-master-fader"
              onChange={e => onMasterVolumeChange?.(parseFloat(e.target.value))}/>
            <span className="arr-master-val">{Math.round(masterVolume * 100)}%</span>
          </div>

          <TierBadge userTier={userTier} trackCount={tracks.length} maxTracks={maxTracks}/>

          <button className="arr-toolbar-btn" onClick={onBounce} title="Bounce to WAV">⤓ Bounce</button>
          <button className={"arr-toolbar-btn save" + (saving ? " saving" : "")} onClick={onSave} disabled={saving} title="Save project">
            {saving ? "Saving…" : "💾 Save"}
          </button>

          {/* Vertical zoom */}
          <div className="arr-trackh-wrap">
            <span className="arr-label">H</span>
            <button className="arr-zoom-btn" onClick={() => setTrackHeight(h => Math.max(48, h - 8))} title="Shorter tracks">−</button>
            <input type="range" min={48} max={120} step={8} value={trackHeight}
              className="arr-zoom-slider"
              onChange={e => setTrackHeight(Number(e.target.value))}/>
            <button className="arr-zoom-btn" onClick={() => setTrackHeight(h => Math.min(120, h + 8))} title="Taller tracks">+</button>
          </div>
        </div>
      </div>

      {/* ══════ BODY (headers + timeline) ══════ */}
      <div className="arr-body">

        {/* ── TRACK HEADERS COLUMN ── */}
        <div className="arr-headers-col" style={{ transform: `translateY(-${scrollTop}px)` }}>
          {tracks.map((track, index) => (
            <div key={track.id || index}
              style={{ height: trackHeight }}
              onContextMenu={(e) => handleTrackContextMenu(e, index)}
            >
              <TrackHeader
                track={track}
                index={index}
                isSelected={selectedTrack === index}
                onSelect={setSelectedTrack}
                onUpdate={updateTrack}
                onRemove={removeTrack}
                onToggleMute={toggleMute}
                onToggleSolo={toggleSolo}
                onToggleArm={toggleArm}
                onToggleFx={onToggleFx}
                onImport={null}
                onClear={(i) => updateTrack(i, { audioBuffer: null, audio_url: null, regions: [] })}
                onFreeze={null}
                onUnfreeze={null}
                onFlexPitch={null}
                onBrowseSounds={onBrowseSounds}
                hasSolo={hasSolo}
                onOpenPianoRoll={onOpenPianoRoll}
                instrumentEngine={instrumentEngine}
              />
            </div>
          ))}

          {/* Add track button */}
          <div className="arr-add-track-row">
            <button
              className="arr-add-track-btn"
              onClick={() => onAddTrack ? onAddTrack() : addTrack("audio")}
              disabled={maxTracks > 0 && tracks.length >= maxTracks}
              title="Add Track"
            >
              + Add Track
            </button>
          </div>
        </div>

        {/* ── TIMELINE COLUMN ── */}
        <div className="arr-timeline-col">

          {/* Ruler */}
          <div className="arr-ruler-wrap">
            <CycleRuler
              totalBeats={totalBeats}
              zoom={zoom}
              timeSignatureTop={timeSignatureTop}
              bpm={bpm}
              cycleEnabled={cycleEnabled}
              cycleStart={cycleStart}
              cycleEnd={cycleEnd}
              onCycleChange={onCycleChange}
              onCycleToggle={onCycleToggle}
              scrollLeft={scrollLeft}
            />
          </div>

          {/* Scrollable track lanes */}
          <div
            ref={setScrollRefs}
            className="arr-lanes-scroll"
            onScroll={handleScroll}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <div className="arr-lanes-inner" style={{ width: timelineWidth, height: tracks.length * trackHeight }}>

              {/* Grid */}
              <GridOverlay
                totalBeats={totalBeats}
                zoom={zoom}
                timeSignatureTop={timeSignatureTop}
                trackCount={tracks.length}
                trackHeight={trackHeight}
                scrollLeft={scrollLeft}
                bpm={bpm}
              />

              {/* Click target for seek (Bug #5c: Alt+drag to define cycle region) */}
              <div
                ref={timelineRef}
                className="arr-seek-layer"
                title="Click to seek · Alt+drag to set cycle"
                onClick={handleTimelineClick}
                onMouseDown={handleSeekLayerMouseDown}
              />
              {cycleDragOverlay && (
                <div
                  className="arr-cycle-drag-overlay"
                  style={{ left: cycleDragOverlay.x, width: cycleDragOverlay.w, height: tracks.length * trackHeight }}
                />
              )}

              {/* Track lanes */}
              {tracks.map((track, trackIndex) => (
                <div
                  key={track.id || trackIndex}
                  className={"arr-lane" + (selectedTrack === trackIndex ? " selected" : "")}
                  style={{ top: trackIndex * trackHeight, height: trackHeight }}
                  onClick={() => setSelectedTrack(trackIndex)}
                  onDoubleClick={(e) => handleTimelineDoubleClick(e, trackIndex)}
                >
                  {(track.regions || []).map((region, regionIndex) => (
                    <Region
                      key={region.id}
                      region={region}
                      trackColor={track.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length]}
                      trackType={track.trackType}
                      zoom={zoom}
                      snapValue={snapValue}
                      timeSignatureTop={timeSignatureTop}
                      onMove={(regionId, newStart) => moveRegion(trackIndex, regionId, newStart)}
                      onResize={(regionId, newStart, newDur) => resizeRegion(trackIndex, regionId, newStart, newDur)}
                      onSelect={setSelectedRegion}
                      isSelected={selectedRegion === region.id}
                      onContextMenu={(e, r) => handleRegionContextMenu(e, r, trackIndex)}
                      trackHeight={trackHeight}
                      bpm={bpm}
                      onOpenClipEditor={onOpenClipEditor}
                      trackIndex={trackIndex}
                      regionIndex={regionIndex}
                    />
                  ))}
                </div>
              ))}

              {/* Playhead */}
              <Playhead
                beat={playheadBeat}
                zoom={zoom}
                height={tracks.length * trackHeight}
                scrollLeft={scrollLeft}
                bpm={bpm}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════ AUTOMATION ══════ */}
      {showAutoTrack !== null && tracks[showAutoTrack] && (
        <div className="arr-automation-panel">
          <div className="arr-automation-header">
            <span className="arr-automation-title">
              AUTOMATION — {tracks[showAutoTrack].name}
            </span>
            <select value={autoParam} onChange={e => setAutoParam(e.target.value)} className="arr-automation-param-select">
              {AUTO_PARAMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button className="arr-automation-close" onClick={() => setShowAutoTrack(null)}>✕</button>
          </div>
          <AutomationLane
            trackId={tracks[showAutoTrack].id || showAutoTrack}
            paramKey={autoParam}
            automation={automation}
            setAutomation={setAutomation}
            zoom={zoom}
            scrollLeft={scrollLeft}
            totalBeats={totalBeats}
            bpm={bpm}
            currentBeat={playheadBeat}
            isPlaying={isPlaying}
          />
        </div>
      )}

      {/* ══════ CONTEXT MENU ══════ */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default ArrangerView;