// =============================================================================
// ArrangerView.js — DAW Arranger / Timeline View for StreamPireX Recording Studio
// =============================================================================
// Horizontal multi-track timeline with:
//   • Cycle/Loop ruler — click-drag top half of ruler to set loop region (Logic/Cubase-style)
//   • Instrument track type — MIDI tracks with built-in instrument routing
//   • Track type: Audio (records/plays waveforms) or Instrument (MIDI → built-in synth)
//   • Tier-based track limits (Free=4, Starter=8, Creator=24, Pro=Unlimited)
//   • Draggable audio regions with waveform visualization
//   • Playhead, ruler, zoom, snap-to-grid
//   • Track controls: mute, solo, arm, volume, pan, FX, color
//   • Add/remove/reorder tracks
//   • Region operations: move, resize, split, delete
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../../styles/ArrangerView.css';

// =============================================================================
// TIER CONFIGURATION — matches seed_pricing_plans.py
// =============================================================================
const STUDIO_TIER_LIMITS = {
  free:    { maxTracks: 4,  maxDuration: 180,  label: 'Free',    color: '#666' },
  starter: { maxTracks: 8,  maxDuration: 600,  label: 'Starter', color: '#007aff' },
  creator: { maxTracks: 24, maxDuration: 3600, label: 'Creator', color: '#ff9500' },
  pro:     { maxTracks: -1, maxDuration: -1,   label: 'Pro',     color: '#34c759' },
};

const TRACK_COLORS = [
  '#e8652b', '#1a4d7c', '#10b981', '#f59e0b',
  '#7c3aed', '#06b6d4', '#f43f5e', '#84cc16',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#0ea5e9', '#ef4444', '#22c55e', '#a855f7',
  '#eab308', '#3b82f6', '#d946ef', '#64748b',
  '#fb923c', '#2dd4bf', '#c084fc', '#f472b6',
];

// =============================================================================
// TRACK TYPES — Audio vs Instrument (like Cubase)
// =============================================================================
const TRACK_TYPES = [
  { value: 'audio',      label: 'Audio',      icon: '🎤', color: '#34c759', desc: 'Record/play audio waveforms' },
  { value: 'instrument', label: 'Instrument',  icon: '🎹', color: '#af52de', desc: 'MIDI → built-in instrument' },
];

// Instrument sources available on Instrument tracks — these map to DAW built-in engines
const INSTRUMENT_SOURCES = [
  { value: 'piano',      label: 'Piano',       icon: '🎹' },
  { value: 'sampler',    label: 'Sampler',      icon: '🎛️' },
  { value: 'beat_maker', label: 'Beat Maker',   icon: '🥁' },
  { value: 'synth',      label: 'Synth (Basic)', icon: '🎵' },
];

const SNAP_VALUES = [
  { label: 'Off',    value: 0 },
  { label: '1 Bar',  value: 1 },
  { label: '1/2',    value: 0.5 },
  { label: '1/4',    value: 0.25 },
  { label: '1/8',    value: 0.125 },
  { label: '1/16',   value: 0.0625 },
];

const MIN_ZOOM = 20;
const MAX_ZOOM = 200;
const DEFAULT_ZOOM = 60;

// =============================================================================
// HELPERS
// =============================================================================
const beatToPx = (beat, zoom) => beat * zoom;
const pxToBeat = (px, zoom) => px / zoom;

const snapBeat = (beat, snapValue, timeSignatureTop) => {
  if (!snapValue) return beat;
  const snapBeats = snapValue * timeSignatureTop;
  return Math.round(beat / snapBeats) * snapBeats;
};

const formatBeatTime = (beat, bpm) => {
  const seconds = (beat / bpm) * 60;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const formatBarBeat = (beat, timeSignatureTop) => {
  const bar = Math.floor(beat / timeSignatureTop) + 1;
  const beatInBar = Math.floor(beat % timeSignatureTop) + 1;
  return `${bar}.${beatInBar}`;
};

// =============================================================================
// WAVEFORM MINI RENDERER (Canvas-based)
// =============================================================================
const WaveformMini = React.memo(({ audioUrl, color, width, height }) => {
  const canvasRef = useRef(null);
  const [waveData, setWaveData] = useState(null);

  useEffect(() => {
    if (!audioUrl) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const raw = decoded.getChannelData(0);
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
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, width, height);
    const max = Math.max(...waveData, 0.01);
    const barW = width / waveData.length;
    const mid = height / 2;
    c.fillStyle = color || '#34c759';
    c.globalAlpha = 0.7;
    waveData.forEach((v, i) => {
      const h = (v / max) * mid * 0.9;
      c.fillRect(i * barW, mid - h, Math.max(barW - 0.5, 0.5), h * 2);
    });
  }, [waveData, width, height, color]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} className="arranger-waveform-canvas" />;
});

// =============================================================================
// MIDI REGION MINI — shows piano-roll style note blocks for instrument tracks
// =============================================================================
const MidiRegionMini = React.memo(({ notes, width, height, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !notes || notes.length === 0) return;
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, width, height);

    // Find note range
    let minNote = 127, maxNote = 0, maxBeat = 0;
    notes.forEach(n => {
      if (n.note < minNote) minNote = n.note;
      if (n.note > maxNote) maxNote = n.note;
      const end = (n.startBeat || 0) + (n.duration || 0.25);
      if (end > maxBeat) maxBeat = end;
    });
    if (minNote > maxNote) return;
    const noteRange = Math.max(maxNote - minNote + 1, 12);
    const noteH = Math.max(height / noteRange, 1.5);

    c.fillStyle = color || '#af52de';
    c.globalAlpha = 0.8;
    notes.forEach(n => {
      const x = maxBeat > 0 ? ((n.startBeat || 0) / maxBeat) * width : 0;
      const w = maxBeat > 0 ? ((n.duration || 0.25) / maxBeat) * width : 2;
      const y = height - ((n.note - minNote + 1) / noteRange) * height;
      c.fillRect(x, y, Math.max(w, 1), noteH);
    });
  }, [notes, width, height, color]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} className="arranger-midi-canvas" />;
});

// =============================================================================
// REGION COMPONENT — A single audio/MIDI clip on the timeline
// =============================================================================
const Region = React.memo(({
  region, trackColor, trackType, zoom, snapValue, timeSignatureTop,
  onMove, onResize, onSelect, isSelected, onContextMenu, trackHeight
}) => {
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef({ x: 0, startBeat: 0, duration: 0 });

  const left = beatToPx(region.startBeat, zoom);
  const width = Math.max(beatToPx(region.duration, zoom), 8);

  const handleMouseDown = (e, action) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(region.id);
    setDragging(action);
    dragStart.current = { x: e.clientX, startBeat: region.startBeat, duration: region.duration };

    const handleMouseMove = (e2) => {
      const dx = e2.clientX - dragStart.current.x;
      const dBeats = pxToBeat(dx, zoom);
      if (action === 'move') {
        let newStart = dragStart.current.startBeat + dBeats;
        newStart = snapBeat(Math.max(0, newStart), snapValue, timeSignatureTop);
        onMove(region.id, newStart);
      } else if (action === 'resize-right') {
        let newDur = dragStart.current.duration + dBeats;
        newDur = Math.max(snapBeat(newDur, snapValue, timeSignatureTop), snapValue * timeSignatureTop || 0.25);
        onResize(region.id, region.startBeat, newDur);
      } else if (action === 'resize-left') {
        let newStart = dragStart.current.startBeat + dBeats;
        newStart = snapBeat(Math.max(0, newStart), snapValue, timeSignatureTop);
        const newDur = dragStart.current.duration - (newStart - dragStart.current.startBeat);
        if (newDur > 0.25) onResize(region.id, newStart, newDur);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const isInstrument = trackType === 'instrument';

  return (
    <div
      className={`arr-region ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''} ${isInstrument ? 'instrument' : ''}`}
      style={{
        '--region-color': trackColor,
        left: `${left}px`,
        width: `${width}px`,
        height: `${trackHeight - 8}px`,
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, region); }}
    >
      <div className="arr-region-handle left" onMouseDown={(e) => handleMouseDown(e, 'resize-left')} />
      <div className="arr-region-content">
        <span className="arr-region-label">{region.name || (isInstrument ? 'MIDI' : 'Audio')}</span>
        {!isInstrument && region.audioUrl && (
          <WaveformMini audioUrl={region.audioUrl} color={trackColor} width={Math.max(width - 8, 20)} height={trackHeight - 20} />
        )}
        {isInstrument && region.notes && region.notes.length > 0 && (
          <MidiRegionMini notes={region.notes} color={trackColor} width={Math.max(width - 8, 20)} height={trackHeight - 20} />
        )}
        {!region.audioUrl && !(isInstrument && region.notes?.length) && (
          <div className="arr-region-empty-wave" />
        )}
      </div>
      <div className="arr-region-handle right" onMouseDown={(e) => handleMouseDown(e, 'resize-right')} />
    </div>
  );
});

// =============================================================================
// TRACK HEADER — Left-side strip with controls + track type & instrument selector
// =============================================================================
const TrackHeader = React.memo(({
  track, index, onUpdate, onDelete, onToggleFx, isActive, onSelect, canDelete
}) => {
  const isInstrument = track.trackType === 'instrument';

  return (
    <div
      className={`arr-track-header ${isActive ? 'active' : ''} ${track.muted ? 'muted' : ''} ${track.solo ? 'soloed' : ''}`}
      onClick={() => onSelect(index)}
    >
      {/* Color indicator — purple tint for instrument tracks */}
      <div className="arr-track-color" style={{ background: isInstrument ? '#af52de' : track.color }} />

      {/* Track number + name row */}
      <div className="arr-track-info">
        <span className="arr-track-number">{index + 1}</span>
        <input
          className="arr-track-name"
          value={track.name}
          onChange={(e) => onUpdate(index, { name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
          title="Double-click to rename"
        />
        {canDelete && (
          <button className="arr-track-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(index); }} title="Delete Track">✕</button>
        )}
      </div>

      {/* Track type badge + instrument selector for instrument tracks */}
      <div className="arr-track-type-row">
        <select
          className={`arr-track-type-select ${isInstrument ? 'instrument' : 'audio'}`}
          value={track.trackType || 'audio'}
          onChange={(e) => {
            const newType = e.target.value;
            const updates = { trackType: newType };
            if (newType === 'instrument' && !track.instrumentSource) {
              updates.instrumentSource = 'piano';
              updates.name = track.name.startsWith('Audio') ? `Instrument ${index + 1}` : track.name;
            } else if (newType === 'audio' && track.name.startsWith('Instrument')) {
              updates.name = `Audio ${index + 1}`;
            }
            onUpdate(index, updates);
          }}
          onClick={(e) => e.stopPropagation()}
          title="Track Type"
        >
          {TRACK_TYPES.map(tt => (
            <option key={tt.value} value={tt.value}>{tt.icon} {tt.label}</option>
          ))}
        </select>
        {isInstrument && (
          <select
            className="arr-instrument-select"
            value={track.instrumentSource || 'piano'}
            onChange={(e) => onUpdate(index, { instrumentSource: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            title="Instrument Source — sound engine for this track"
          >
            {INSTRUMENT_SOURCES.map(is => (
              <option key={is.value} value={is.value}>{is.icon} {is.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* R M S FX buttons */}
      <div className="arr-track-badges">
        <button className={`arr-badge r ${track.armed ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onUpdate(index, { armed: !track.armed }); }} title="Record Arm">R</button>
        <button className={`arr-badge m ${track.muted ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onUpdate(index, { muted: !track.muted }); }} title="Mute">M</button>
        <button className={`arr-badge s ${track.solo ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onUpdate(index, { solo: !track.solo }); }} title="Solo">S</button>
        <button className="arr-badge fx" onClick={(e) => { e.stopPropagation(); onToggleFx(index); }} title="Effects">FX</button>
      </div>

      {/* Volume */}
      <div className="arr-track-vol-row">
        <span className="arr-vol-icon">🔊</span>
        <input type="range" min="0" max="1" step="0.01" value={track.volume} onChange={(e) => onUpdate(index, { volume: parseFloat(e.target.value) })} className="arr-vol-slider" onClick={(e) => e.stopPropagation()} />
        <span className="arr-vol-val">{Math.round(track.volume * 100)}</span>
      </div>

      {/* Pan */}
      <div className="arr-track-pan-row">
        <span className="arr-pan-icon">⟷</span>
        <input type="range" min="-1" max="1" step="0.01" value={track.pan} onChange={(e) => onUpdate(index, { pan: parseFloat(e.target.value) })} className="arr-pan-slider" onClick={(e) => e.stopPropagation()} />
        <span className="arr-pan-val">{track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}</span>
      </div>
    </div>
  );
});

// =============================================================================
// CYCLE RULER — Bar numbers + cycle/loop region (Logic-style yellow strip)
// =============================================================================
const CycleRuler = React.memo(({
  zoom, bpm, timeSignatureTop, scrollLeft, width, playheadBeat,
  cycleStart, cycleEnd, cycleEnabled,
  onSeek, onCycleChange, onCycleToggle,
  snapValue,
}) => {
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(null); // 'create' | 'move' | 'resize-left' | 'resize-right' | null
  const dragOriginRef = useRef({ x: 0, startBeat: 0, endBeat: 0 });
  const RULER_HEIGHT = 36;
  const CYCLE_ZONE_HEIGHT = 14; // top 14px is the cycle drag zone

  // ── Draw ruler ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = RULER_HEIGHT;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    c.scale(dpr, dpr);
    c.clearRect(0, 0, w, h);

    const totalBeats = Math.ceil(w / zoom) + timeSignatureTop;

    // ── Draw cycle region strip (Logic = yellow, we use teal/gold) ──
    if (cycleEnabled && cycleStart != null && cycleEnd != null && cycleEnd > cycleStart) {
      const cxL = beatToPx(cycleStart, zoom) - scrollLeft;
      const cxR = beatToPx(cycleEnd, zoom) - scrollLeft;
      // Full-height tinted background
      c.fillStyle = 'rgba(255, 204, 0, 0.08)';
      c.fillRect(cxL, 0, cxR - cxL, h);
      // Top cycle strip (the draggable yellow bar like Logic)
      const grad = c.createLinearGradient(0, 0, 0, CYCLE_ZONE_HEIGHT);
      grad.addColorStop(0, 'rgba(255, 204, 0, 0.85)');
      grad.addColorStop(1, 'rgba(255, 180, 0, 0.65)');
      c.fillStyle = grad;
      c.fillRect(cxL, 0, cxR - cxL, CYCLE_ZONE_HEIGHT);
      // Cycle text label
      const startBar = Math.floor(cycleStart / timeSignatureTop) + 1;
      const endBar = Math.floor(cycleEnd / timeSignatureTop) + 1;
      c.font = 'bold 9px "JetBrains Mono", monospace';
      c.fillStyle = '#1a1a1a';
      c.textAlign = 'center';
      const midX = (cxL + cxR) / 2;
      if (cxR - cxL > 50) {
        c.fillText(`⟲ ${startBar}–${endBar}`, midX, 10);
      }
      c.textAlign = 'left';
      // Left/right edge handles (visual)
      c.fillStyle = 'rgba(255,204,0,1)';
      c.fillRect(cxL, 0, 3, CYCLE_ZONE_HEIGHT);
      c.fillRect(cxR - 3, 0, 3, CYCLE_ZONE_HEIGHT);
    } else if (!cycleEnabled && cycleStart != null && cycleEnd != null && cycleEnd > cycleStart) {
      // Dimmed cycle region when disabled
      const cxL = beatToPx(cycleStart, zoom) - scrollLeft;
      const cxR = beatToPx(cycleEnd, zoom) - scrollLeft;
      c.fillStyle = 'rgba(255, 204, 0, 0.03)';
      c.fillRect(cxL, 0, cxR - cxL, CYCLE_ZONE_HEIGHT);
      c.strokeStyle = 'rgba(255,204,0,0.15)';
      c.lineWidth = 1;
      c.strokeRect(cxL, 0, cxR - cxL, CYCLE_ZONE_HEIGHT);
    }

    // ── Draw beat lines & bar numbers ──
    for (let beat = 0; beat < totalBeats; beat++) {
      const x = beatToPx(beat, zoom) - scrollLeft;
      if (x < -50 || x > w + 50) continue;
      const isBar = beat % timeSignatureTop === 0;
      const bar = Math.floor(beat / timeSignatureTop) + 1;

      if (isBar) {
        c.strokeStyle = 'rgba(255,255,255,0.12)';
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, CYCLE_ZONE_HEIGHT); c.lineTo(x, h); c.stroke();

        c.font = '600 10px "JetBrains Mono", monospace';
        c.fillStyle = '#888';
        c.fillText(`${bar}`, x + 4, CYCLE_ZONE_HEIGHT + 12);

        if ((bar - 1) % 4 === 0) {
          c.font = '500 8px "JetBrains Mono", monospace';
          c.fillStyle = '#555';
          c.fillText(formatBeatTime(beat, bpm), x + 4, CYCLE_ZONE_HEIGHT + 24);
        }
      } else {
        c.strokeStyle = 'rgba(255,255,255,0.04)';
        c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, CYCLE_ZONE_HEIGHT + 10); c.lineTo(x, h); c.stroke();
      }
    }

    // ── Draw playhead triangle ──
    const phX = beatToPx(playheadBeat, zoom) - scrollLeft;
    if (phX >= 0 && phX <= w) {
      c.fillStyle = '#34c759';
      c.beginPath(); c.moveTo(phX - 6, CYCLE_ZONE_HEIGHT); c.lineTo(phX + 6, CYCLE_ZONE_HEIGHT); c.lineTo(phX, CYCLE_ZONE_HEIGHT + 8); c.closePath(); c.fill();
      c.strokeStyle = '#34c759';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(phX, CYCLE_ZONE_HEIGHT + 8); c.lineTo(phX, h); c.stroke();
    }
  }, [zoom, bpm, timeSignatureTop, scrollLeft, width, playheadBeat, cycleStart, cycleEnd, cycleEnabled]);

  // ── Mouse interaction for cycle ruler ──
  const getHitZone = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { zone: 'seek', beat: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const beat = pxToBeat(x + scrollLeft, zoom);

    // Top zone = cycle manipulation
    if (y <= CYCLE_ZONE_HEIGHT) {
      if (cycleStart != null && cycleEnd != null && cycleEnd > cycleStart) {
        const cxL = beatToPx(cycleStart, zoom) - scrollLeft;
        const cxR = beatToPx(cycleEnd, zoom) - scrollLeft;
        const handleSize = 8;
        if (Math.abs(x - cxL) <= handleSize) return { zone: 'resize-left', beat };
        if (Math.abs(x - cxR) <= handleSize) return { zone: 'resize-right', beat };
        if (x >= cxL && x <= cxR) return { zone: 'move', beat };
      }
      return { zone: 'create', beat };
    }
    // Bottom zone = seek
    return { zone: 'seek', beat };
  }, [scrollLeft, zoom, cycleStart, cycleEnd]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const { zone, beat } = getHitZone(e.clientX, e.clientY);

    if (zone === 'seek') {
      const snapped = snapValue ? snapBeat(Math.max(0, beat), snapValue, timeSignatureTop) : Math.max(0, beat);
      onSeek(snapped);
      return;
    }

    // Cycle interactions
    isDraggingRef.current = zone;
    dragOriginRef.current = {
      x: e.clientX,
      startBeat: cycleStart ?? beat,
      endBeat: cycleEnd ?? beat,
      clickBeat: beat,
    };

    if (zone === 'create') {
      const snapped = snapBeat(Math.max(0, beat), snapValue || 0.25, timeSignatureTop);
      onCycleChange(snapped, snapped);
      if (!cycleEnabled) onCycleToggle(true);
    }

    const handleMouseMove = (e2) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x2 = e2.clientX - rect.left;
      const currentBeat = pxToBeat(x2 + scrollLeft, zoom);
      const snap = snapValue || 0.25;
      const snapped = snapBeat(Math.max(0, currentBeat), snap, timeSignatureTop);

      const dragType = isDraggingRef.current;
      const origin = dragOriginRef.current;

      if (dragType === 'create') {
        const originSnapped = snapBeat(Math.max(0, origin.clickBeat), snap, timeSignatureTop);
        const left = Math.min(originSnapped, snapped);
        const right = Math.max(originSnapped, snapped);
        if (right > left) onCycleChange(left, right);
      } else if (dragType === 'move') {
        const dx = e2.clientX - origin.x;
        const dBeats = pxToBeat(dx, zoom);
        const len = origin.endBeat - origin.startBeat;
        let newStart = snapBeat(Math.max(0, origin.startBeat + dBeats), snap, timeSignatureTop);
        onCycleChange(newStart, newStart + len);
      } else if (dragType === 'resize-left') {
        const newStart = Math.min(snapped, (cycleEnd || 4) - snap * timeSignatureTop);
        onCycleChange(Math.max(0, newStart), cycleEnd);
      } else if (dragType === 'resize-right') {
        const newEnd = Math.max(snapped, (cycleStart || 0) + snap * timeSignatureTop);
        onCycleChange(cycleStart, newEnd);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [getHitZone, onSeek, onCycleChange, onCycleToggle, cycleStart, cycleEnd, cycleEnabled, snapValue, timeSignatureTop, zoom, scrollLeft]);

  // Double-click top zone toggles cycle on/off
  const handleDoubleClick = useCallback((e) => {
    const { zone } = getHitZone(e.clientX, e.clientY);
    if (zone !== 'seek') {
      onCycleToggle(!cycleEnabled);
    }
  }, [getHitZone, cycleEnabled, onCycleToggle]);

  // Cursor hint
  const handleMouseMoveHover = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { zone } = getHitZone(e.clientX, e.clientY);
    if (zone === 'resize-left' || zone === 'resize-right') canvas.style.cursor = 'ew-resize';
    else if (zone === 'move') canvas.style.cursor = 'grab';
    else if (zone === 'create') canvas.style.cursor = 'crosshair';
    else canvas.style.cursor = 'pointer';
  }, [getHitZone]);

  return (
    <canvas
      ref={canvasRef}
      className="arr-ruler-canvas arr-cycle-ruler"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseMove={handleMouseMoveHover}
    />
  );
});

// =============================================================================
// GRID OVERLAY — Beat lines behind regions
// =============================================================================
const GridOverlay = React.memo(({ zoom, timeSignatureTop, scrollLeft, width, height }) => {
  const lines = [];
  const totalBeats = Math.ceil((width + scrollLeft) / zoom) + 1;
  for (let beat = 0; beat < totalBeats; beat++) {
    const x = beatToPx(beat, zoom) - scrollLeft;
    if (x < -2 || x > width + 2) continue;
    const isBar = beat % timeSignatureTop === 0;
    lines.push(<div key={beat} className={`arr-grid-line ${isBar ? 'bar' : 'beat'}`} style={{ left: `${x}px` }} />);
  }
  return <div className="arr-grid-overlay" style={{ height }}>{lines}</div>;
});

// =============================================================================
// CONTEXT MENU
// =============================================================================
const ContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="arr-context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) =>
        item.divider ? <div key={i} className="arr-ctx-divider" /> : (
          <button key={i} className={`arr-ctx-item ${item.danger ? 'danger' : ''}`} onClick={() => { item.action(); onClose(); }} disabled={item.disabled}>
            <span className="arr-ctx-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.shortcut && <span className="arr-ctx-shortcut">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
};

// =============================================================================
// TIER BADGE
// =============================================================================
const TierBadge = ({ tier, trackCount, maxTracks }) => {
  const cfg = STUDIO_TIER_LIMITS[tier] || STUDIO_TIER_LIMITS.free;
  const isUnlimited = maxTracks === -1;
  const nearLimit = !isUnlimited && trackCount >= maxTracks - 1;
  const atLimit = !isUnlimited && trackCount >= maxTracks;
  return (
    <div className={`arr-tier-badge ${atLimit ? 'at-limit' : nearLimit ? 'near-limit' : ''}`}>
      <span className="arr-tier-dot" style={{ background: cfg.color }} />
      <span className="arr-tier-label">{cfg.label}</span>
      <span className="arr-tier-count">{trackCount}/{isUnlimited ? '∞' : maxTracks} tracks</span>
    </div>
  );
};

// =============================================================================
// ADD TRACK DROPDOWN — lets user pick Audio or Instrument when adding
// =============================================================================
const AddTrackDropdown = ({ onAdd, canAdd }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={{ width: 24, height: 22, border: '1px solid #555', borderRadius: 3, background: 'rgba(0,255,200,0.08)', color: '#00ffc8', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => canAdd && setOpen(!open)}
        disabled={!canAdd}
        title="Add Track"
      >+</button>
      {open && (
        <div style={{
          position: 'absolute', top: 26, left: 0, background: '#1a2332', border: '1px solid #2a3a4a',
          borderRadius: 6, padding: 4, zIndex: 100, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {TRACK_TYPES.map(tt => (
            <button key={tt.value} onClick={() => { onAdd(tt.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px',
                background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer',
                borderRadius: 4, fontSize: '0.8rem', textAlign: 'left',
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <span style={{ fontSize: '1.1rem' }}>{tt.icon}</span>
              <span><strong style={{ color: tt.color }}>{tt.label}</strong><br /><span style={{ fontSize: '0.65rem', color: '#888' }}>{tt.desc}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN ARRANGER VIEW
// =============================================================================
const ArrangerView = ({
  tracks = [],
  setTracks,
  bpm = 120,
  timeSignatureTop = 4,
  timeSignatureBottom = 4,
  masterVolume = 0.8,
  onMasterVolumeChange,
  projectName = 'Untitled',
  userTier = 'free',
  playheadBeat = 0,
  isPlaying = false,
  isRecording = false,
  onPlay,
  onStop,
  onRecord,
  onSeek,
  onBpmChange,
  onTimeSignatureChange,
  onToggleFx,
  onBounce,
  onSave,
  saving = false,
  // Cycle/loop callbacks — parent (RecordingStudio) manages the actual loop logic
  cycleStart: cycleStartProp,
  cycleEnd: cycleEndProp,
  cycleEnabled: cycleEnabledProp,
  onCycleChange: onCycleChangeProp,
  onCycleToggle: onCycleToggleProp,
}) => {
  // ── State ─────────────────────────────────────────────────
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [snapValue, setSnapValue] = useState(0.25);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTrack, setActiveTrack] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [trackHeight, setTrackHeight] = useState(110);

  // ── Internal cycle state (used if parent doesn't provide) ──
  const [internalCycleStart, setInternalCycleStart] = useState(null);
  const [internalCycleEnd, setInternalCycleEnd] = useState(null);
  const [internalCycleEnabled, setInternalCycleEnabled] = useState(false);

  const cycleStart = cycleStartProp ?? internalCycleStart;
  const cycleEnd = cycleEndProp ?? internalCycleEnd;
  const cycleEnabled = cycleEnabledProp ?? internalCycleEnabled;

  const handleCycleChange = useCallback((start, end) => {
    if (onCycleChangeProp) onCycleChangeProp(start, end);
    else { setInternalCycleStart(start); setInternalCycleEnd(end); }
  }, [onCycleChangeProp]);

  const handleCycleToggle = useCallback((enabled) => {
    if (onCycleToggleProp) onCycleToggleProp(enabled);
    else setInternalCycleEnabled(enabled);
  }, [onCycleToggleProp]);

  const timelineRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // ── Tier logic ──
  const tierConfig = STUDIO_TIER_LIMITS[userTier] || STUDIO_TIER_LIMITS.free;
  const maxTracks = tierConfig.maxTracks;
  const canAddTrack = maxTracks === -1 || tracks.length < maxTracks;

  // ── Timeline width ──
  const timelineWidth = useMemo(() => {
    let maxBeat = 32 * timeSignatureTop;
    tracks.forEach(t => {
      (t.regions || []).forEach(r => {
        const end = r.startBeat + r.duration;
        if (end > maxBeat) maxBeat = end + 4 * timeSignatureTop;
      });
    });
    return beatToPx(maxBeat, zoom) + 400;
  }, [tracks, zoom, timeSignatureTop]);

  const handleScroll = useCallback((e) => setScrollLeft(e.currentTarget.scrollLeft), []);

  // ── Zoom ──
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + (e.deltaY > 0 ? -5 : 5))));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ': e.preventDefault(); isPlaying ? onStop?.() : onPlay?.(); break;
        case 'r': case 'R': if (!e.metaKey && !e.ctrlKey) onRecord?.(); break;
        case 'c': case 'C':
          if (!e.metaKey && !e.ctrlKey) handleCycleToggle(!cycleEnabled);
          break;
        case 'Delete': case 'Backspace': if (selectedRegion) deleteRegion(selectedRegion); break;
        case '=': case '+': setZoom(prev => Math.min(MAX_ZOOM, prev + 10)); break;
        case '-': setZoom(prev => Math.max(MIN_ZOOM, prev - 10)); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, selectedRegion, onPlay, onStop, onRecord, cycleEnabled, handleCycleToggle]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;
    const phX = beatToPx(playheadBeat, zoom);
    const container = scrollContainerRef.current;
    const viewRight = container.scrollLeft + container.clientWidth - 220;
    if (phX > viewRight - 100) container.scrollLeft = phX - container.clientWidth / 2;
  }, [playheadBeat, isPlaying, zoom]);

  // ── Track CRUD ──
  const addTrack = useCallback((type = 'audio') => {
    if (!canAddTrack) return;
    const idx = tracks.length;
    const isInstr = type === 'instrument';
    const newTrack = {
      name: isInstr ? `Instrument ${idx + 1}` : `Audio ${idx + 1}`,
      trackType: type,
      instrumentSource: isInstr ? 'piano' : undefined,
      volume: 0.8, pan: 0, muted: false, solo: false, armed: false,
      audio_url: null, color: TRACK_COLORS[idx % TRACK_COLORS.length],
      regions: [], fx: { eq: false, comp: false, reverb: false, delay: false },
    };
    setTracks([...tracks, newTrack]);
    setActiveTrack(idx);
  }, [tracks, canAddTrack, setTracks]);

  const deleteTrack = useCallback((index) => {
    if (tracks.length <= 1) return;
    const next = [...tracks]; next.splice(index, 1); setTracks(next);
    if (activeTrack >= next.length) setActiveTrack(next.length - 1);
  }, [tracks, activeTrack, setTracks]);

  const updateTrack = useCallback((index, updates) => {
    const next = [...tracks]; next[index] = { ...next[index], ...updates }; setTracks(next);
  }, [tracks, setTracks]);

  // ── Region CRUD ──
  const moveRegion = useCallback((regionId, newStartBeat) => {
    setTracks(tracks.map(t => ({ ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStartBeat } : r) })));
  }, [tracks, setTracks]);

  const resizeRegion = useCallback((regionId, newStart, newDuration) => {
    setTracks(tracks.map(t => ({ ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStart, duration: newDuration } : r) })));
  }, [tracks, setTracks]);

  const deleteRegion = useCallback((regionId) => {
    setTracks(tracks.map(t => ({ ...t, regions: (t.regions || []).filter(r => r.id !== regionId) })));
    setSelectedRegion(null);
  }, [tracks, setTracks]);

  const duplicateRegion = useCallback((regionId) => {
    setTracks(tracks.map(t => {
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const dup = { ...region, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, startBeat: region.startBeat + region.duration, name: `${region.name} (copy)` };
      return { ...t, regions: [...(t.regions || []), dup] };
    }));
  }, [tracks, setTracks]);

  const splitRegion = useCallback((regionId, splitBeat) => {
    setTracks(tracks.map(t => {
      const idx = (t.regions || []).findIndex(r => r.id === regionId);
      if (idx === -1) return t;
      const region = t.regions[idx];
      if (splitBeat <= region.startBeat || splitBeat >= region.startBeat + region.duration) return t;
      const leftDur = splitBeat - region.startBeat;
      const rightDur = region.duration - leftDur;
      const left = { ...region, duration: leftDur };
      const right = { ...region, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, startBeat: splitBeat, duration: rightDur, name: `${region.name} (R)` };
      const regions = [...t.regions]; regions.splice(idx, 1, left, right);
      return { ...t, regions };
    }));
  }, [tracks, setTracks]);

  // ── Add empty region on double-click ──
  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    let startBeat = snapBeat(pxToBeat(x, zoom), snapValue, timeSignatureTop);
    const isInstr = tracks[trackIndex]?.trackType === 'instrument';

    const newRegion = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: isInstr ? 'MIDI Region' : 'New Region',
      startBeat,
      duration: timeSignatureTop * 4,
      audioUrl: isInstr ? null : null,
      notes: isInstr ? [] : undefined,  // MIDI regions get empty notes array
      color: tracks[trackIndex]?.color,
    };

    const next = [...tracks];
    if (!next[trackIndex].regions) next[trackIndex].regions = [];
    next[trackIndex].regions.push(newRegion);
    setTracks(next);
    setSelectedRegion(newRegion.id);
  }, [tracks, zoom, snapValue, timeSignatureTop, scrollLeft, setTracks]);

  const handleRegionContextMenu = useCallback((e, region) => {
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { icon: '✂️', label: 'Split at Playhead', shortcut: 'S', action: () => splitRegion(region.id, playheadBeat), disabled: playheadBeat <= region.startBeat || playheadBeat >= region.startBeat + region.duration },
        { icon: '📋', label: 'Duplicate', shortcut: 'Ctrl+D', action: () => duplicateRegion(region.id) },
        { divider: true },
        { icon: '🔇', label: 'Mute Region', action: () => {} },
        { icon: '🎨', label: 'Change Color', action: () => {} },
        { divider: true },
        { icon: '🗑️', label: 'Delete', shortcut: 'Del', danger: true, action: () => deleteRegion(region.id) },
      ],
    });
  }, [playheadBeat, splitRegion, duplicateRegion, deleteRegion]);

  const handleTimelineClick = useCallback((e) => {
    if (e.detail === 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const beat = snapBeat(pxToBeat(x, zoom), snapValue, timeSignatureTop);
    onSeek?.(Math.max(0, beat));
  }, [zoom, scrollLeft, snapValue, timeSignatureTop, onSeek]);

  const playheadLeft = beatToPx(playheadBeat, zoom) - scrollLeft;

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="arranger">
      {/* ─── TOP TOOLBAR ─────────────────────────────────── */}
      <div className="arr-toolbar">
        <div className="arr-toolbar-left">
          {/* Transport */}
          <div className="arr-transport-group">
            <button className="arr-transport-btn" onClick={() => onSeek?.(0)} title="Return to Start">⏮</button>
            <button className="arr-transport-btn" onClick={() => onSeek?.(Math.max(0, playheadBeat - timeSignatureTop * 2))} title="Rewind 2 bars">⏪</button>
            <button className={`arr-transport-btn play ${isPlaying ? 'active' : ''}`} onClick={() => isPlaying ? onStop?.() : onPlay?.()} title={isPlaying ? 'Stop' : 'Play'}>{isPlaying ? '⏹' : '▶'}</button>
            <button className="arr-transport-btn" onClick={() => onSeek?.(playheadBeat + timeSignatureTop * 2)} title="Forward 2 bars">⏩</button>
            <button className={`arr-transport-btn rec ${isRecording ? 'active' : ''}`} onClick={onRecord} title="Record"><span className="arr-rec-dot" /></button>

            {/* ── Cycle/Loop toggle button ── */}
            <button
              className={`arr-transport-btn cycle ${cycleEnabled ? 'active' : ''}`}
              onClick={() => handleCycleToggle(!cycleEnabled)}
              title={`Cycle/Loop ${cycleEnabled ? 'ON' : 'OFF'} (C)`}
              style={cycleEnabled ? { background: 'rgba(255,204,0,0.15)', borderColor: '#ffcc00', color: '#ffcc00' } : {}}
            >
              ⟲
            </button>
          </div>

          {/* LCD Display */}
          <div className="arr-lcd">
            <span className="arr-lcd-position">{formatBarBeat(playheadBeat, timeSignatureTop)}</span>
            <span className="arr-lcd-sep">│</span>
            <span className="arr-lcd-time">{formatBeatTime(playheadBeat, bpm)}</span>
          </div>

          {/* BPM */}
          <div className="arr-bpm-group">
            <label className="arr-bpm-label">BPM</label>
            <input type="number" className="arr-bpm-input" value={bpm} onChange={(e) => onBpmChange?.(parseInt(e.target.value) || 120)} min={40} max={300} />
          </div>

          {/* Time Signature */}
          <div className="arr-ts-group">
            <select className="arr-ts-select" value={`${timeSignatureTop}/${timeSignatureBottom}`} onChange={(e) => { const [t, b] = e.target.value.split('/').map(Number); onTimeSignatureChange?.(t, b); }}>
              <option value="4/4">4/4</option>
              <option value="3/4">3/4</option>
              <option value="6/8">6/8</option>
              <option value="2/4">2/4</option>
              <option value="5/4">5/4</option>
              <option value="7/8">7/8</option>
            </select>
          </div>
        </div>

        <div className="arr-toolbar-right">
          {/* Snap */}
          <div className="arr-snap-group">
            <label className="arr-snap-label">Snap</label>
            <select className="arr-snap-select" value={snapValue} onChange={(e) => setSnapValue(parseFloat(e.target.value))}>
              {SNAP_VALUES.map(sv => <option key={sv.value} value={sv.value}>{sv.label}</option>)}
            </select>
          </div>

          {/* Zoom */}
          <div className="arr-zoom-group">
            <button className="arr-zoom-btn" onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev - 10))}>−</button>
            <div className="arr-zoom-bar"><div className="arr-zoom-fill" style={{ width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }} /></div>
            <button className="arr-zoom-btn" onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev + 10))}>+</button>
          </div>

          {/* Track height */}
          <div className="arr-height-group">
            <button className={`arr-height-btn ${trackHeight === 48 ? 'active' : ''}`} onClick={() => setTrackHeight(48)} title="Small">S</button>
            <button className={`arr-height-btn ${trackHeight === 110 ? 'active' : ''}`} onClick={() => setTrackHeight(110)} title="Medium">M</button>
            <button className={`arr-height-btn ${trackHeight === 140 ? 'active' : ''}`} onClick={() => setTrackHeight(140)} title="Large">L</button>
          </div>

          <TierBadge tier={userTier} trackCount={tracks.length} maxTracks={maxTracks} />

          <button className={`arr-save-btn ${saving ? 'saving' : ''}`} onClick={onSave} disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save'}</button>
          <button className="arr-save-btn" onClick={onBounce} disabled={isPlaying || isRecording} title="Bounce / Mixdown" style={{ background: 'rgba(0,255,200,0.08)', borderColor: 'rgba(0,255,200,0.2)' }}>⏏ Bounce</button>
        </div>
      </div>

      {/* ─── Cycle info bar (shown when cycle is active) ──── */}
      {cycleEnabled && cycleStart != null && cycleEnd != null && cycleEnd > cycleStart && (
        <div className="arr-cycle-info-bar">
          <span style={{ color: '#ffcc00', fontWeight: 600 }}>⟲ CYCLE</span>
          <span>Bar {Math.floor(cycleStart / timeSignatureTop) + 1} → Bar {Math.floor(cycleEnd / timeSignatureTop) + 1}</span>
          <span style={{ color: '#888' }}>({formatBeatTime(cycleEnd - cycleStart, bpm)})</span>
          <button onClick={() => handleCycleToggle(false)} style={{ background: 'none', border: '1px solid #ffcc0040', color: '#ffcc00', borderRadius: 4, padding: '1px 8px', cursor: 'pointer', fontSize: '0.65rem' }}>OFF</button>
        </div>
      )}

      {/* ─── MAIN ARRANGER BODY ──────────────────────────── */}
      <div className="arr-body">
        {/* Track Headers */}
        <div className="arr-headers">
          <div className="arr-ruler-spacer">
            <span className="arr-ruler-spacer-label">TRACKS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AddTrackDropdown onAdd={addTrack} canAdd={canAddTrack} />
              <button
                style={{ width: 24, height: 22, border: '1px solid #555', borderRadius: 3, background: 'rgba(255,68,68,0.08)', color: '#ff4444', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tracks.length <= 1 ? 0.3 : 1 }}
                onClick={() => deleteTrack(activeTrack)} disabled={tracks.length <= 1} title="Remove Selected Track"
              >−</button>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#666', fontFamily: 'monospace' }}>{tracks.length}/{maxTracks === -1 ? '∞' : maxTracks}</span>
            </div>
          </div>

          <div className="arr-headers-list" style={{ overflowY: 'auto' }}>
            {tracks.map((track, i) => (
              <div key={i} style={{ height: trackHeight }}>
                <TrackHeader track={track} index={i} onUpdate={updateTrack} onDelete={deleteTrack} onToggleFx={onToggleFx} isActive={activeTrack === i} onSelect={setActiveTrack} canDelete={tracks.length > 1} />
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="arr-timeline-wrapper" ref={scrollContainerRef} onScroll={handleScroll}>
          {/* Cycle Ruler (replaces old Ruler) */}
          <div className="arr-ruler-row" style={{ width: timelineWidth }}>
            <CycleRuler
              zoom={zoom} bpm={bpm} timeSignatureTop={timeSignatureTop}
              scrollLeft={scrollLeft} width={timelineWidth} playheadBeat={playheadBeat}
              cycleStart={cycleStart} cycleEnd={cycleEnd} cycleEnabled={cycleEnabled}
              onSeek={(beat) => onSeek?.(beat)}
              onCycleChange={handleCycleChange}
              onCycleToggle={handleCycleToggle}
              snapValue={snapValue}
            />
          </div>

          {/* Track lanes */}
          <div className="arr-lanes" style={{ width: timelineWidth }}>
            {tracks.map((track, i) => (
              <div
                key={i}
                className={`arr-lane ${track.muted ? 'muted' : ''} ${track.solo ? 'soloed' : ''} ${activeTrack === i ? 'active' : ''} ${track.trackType === 'instrument' ? 'instrument-lane' : ''}`}
                style={{ height: trackHeight, '--track-color': track.trackType === 'instrument' ? '#af52de' : track.color }}
                onClick={handleTimelineClick}
                onDoubleClick={(e) => handleTimelineDoubleClick(e, i)}
              >
                <GridOverlay zoom={zoom} timeSignatureTop={timeSignatureTop} scrollLeft={scrollLeft} width={timelineWidth} height={trackHeight} />

                {/* Cycle region highlight on lanes */}
                {cycleEnabled && cycleStart != null && cycleEnd != null && cycleEnd > cycleStart && (
                  <div
                    className="arr-cycle-lane-highlight"
                    style={{
                      left: `${beatToPx(cycleStart, zoom)}px`,
                      width: `${beatToPx(cycleEnd - cycleStart, zoom)}px`,
                      height: '100%',
                    }}
                  />
                )}

                {(track.regions || []).map(region => (
                  <Region
                    key={region.id} region={region} trackColor={track.trackType === 'instrument' ? '#af52de' : track.color}
                    trackType={track.trackType || 'audio'}
                    zoom={zoom} snapValue={snapValue} timeSignatureTop={timeSignatureTop}
                    onMove={moveRegion} onResize={resizeRegion} onSelect={setSelectedRegion}
                    isSelected={selectedRegion === region.id} onContextMenu={handleRegionContextMenu} trackHeight={trackHeight}
                  />
                ))}

                {playheadLeft >= 0 && <div className="arr-playhead-line" style={{ left: `${beatToPx(playheadBeat, zoom)}px` }} />}
              </div>
            ))}

            {/* Grid fill */}
            <div className="arr-lane arr-lane-fill" style={{ minHeight: 'calc(100vh - 300px)', '--track-color': 'transparent' }} onDoubleClick={() => canAddTrack && addTrack('audio')}>
              <GridOverlay zoom={zoom} timeSignatureTop={timeSignatureTop} scrollLeft={scrollLeft} width={timelineWidth} height={800} />
            </div>
          </div>
        </div>
      </div>

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

export default ArrangerView;