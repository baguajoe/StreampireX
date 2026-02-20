// =============================================================================
// ArrangerView.js — DAW Arranger / Timeline View for StreamPireX Recording Studio
// =============================================================================
// Horizontal multi-track timeline with:
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

const SNAP_VALUES = [
  { label: 'Off',    value: 0 },
  { label: '1 Bar',  value: 1 },
  { label: '1/2',    value: 0.5 },
  { label: '1/4',    value: 0.25 },
  { label: '1/8',    value: 0.125 },
  { label: '1/16',   value: 0.0625 },
];

const MIN_ZOOM = 20;   // px per beat at min zoom
const MAX_ZOOM = 200;  // px per beat at max zoom
const DEFAULT_ZOOM = 60;

// =============================================================================
// HELPER: Convert beat position to pixels
// =============================================================================
const beatToPx = (beat, zoom) => beat * zoom;
const pxToBeat = (px, zoom) => px / zoom;

// =============================================================================
// HELPER: Snap beat to grid
// =============================================================================
const snapBeat = (beat, snapValue, timeSignatureTop) => {
  if (!snapValue) return beat;
  const snapBeats = snapValue * timeSignatureTop;
  return Math.round(beat / snapBeats) * snapBeats;
};

// =============================================================================
// HELPER: Format time from beats
// =============================================================================
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
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(raw[i * blockSize + j]);
          }
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

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      className="arranger-waveform-canvas"
    />
  );
});

// =============================================================================
// REGION COMPONENT — A single audio clip on the timeline
// =============================================================================
const Region = React.memo(({
  region, trackColor, zoom, snapValue, timeSignatureTop,
  onMove, onResize, onSelect, isSelected, onContextMenu, trackHeight
}) => {
  const [dragging, setDragging] = useState(null); // 'move' | 'resize-left' | 'resize-right'
  const dragStart = useRef({ x: 0, startBeat: 0, duration: 0 });

  const left = beatToPx(region.startBeat, zoom);
  const width = Math.max(beatToPx(region.duration, zoom), 8);

  const handleMouseDown = (e, action) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(region.id);
    setDragging(action);
    dragStart.current = {
      x: e.clientX,
      startBeat: region.startBeat,
      duration: region.duration,
    };

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
        if (newDur > 0.25) {
          onResize(region.id, newStart, newDur);
        }
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

  return (
    <div
      className={`arr-region ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{
        '--region-color': trackColor,
        left: `${left}px`,
        width: `${width}px`,
        height: `${trackHeight - 8}px`,
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, region); }}
    >
      {/* Left resize handle */}
      <div
        className="arr-region-handle left"
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
      />

      {/* Region content */}
      <div className="arr-region-content">
        <span className="arr-region-label">{region.name || 'Audio'}</span>
        {region.audioUrl && (
          <WaveformMini
            audioUrl={region.audioUrl}
            color={trackColor}
            width={Math.max(width - 8, 20)}
            height={trackHeight - 20}
          />
        )}
        {!region.audioUrl && (
          <div className="arr-region-empty-wave" />
        )}
      </div>

      {/* Right resize handle */}
      <div
        className="arr-region-handle right"
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
      />
    </div>
  );
});

// =============================================================================
// TRACK HEADER — Left-side strip with controls
// =============================================================================
const TrackHeader = React.memo(({
  track, index, onUpdate, onDelete, onToggleFx, isActive, onSelect, canDelete
}) => {
  return (
    <div
      className={`arr-track-header ${isActive ? 'active' : ''} ${track.muted ? 'muted' : ''} ${track.solo ? 'soloed' : ''}`}
      onClick={() => onSelect(index)}
    >
      {/* Color indicator */}
      <div className="arr-track-color" style={{ background: track.color }} />

      {/* Track info */}
      <div className="arr-track-info">
        <input
          className="arr-track-name"
          value={track.name}
          onChange={(e) => onUpdate(index, { name: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
        />

        {/* R M S buttons */}
        <div className="arr-track-badges">
          <button
            className={`arr-badge r ${track.armed ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onUpdate(index, { armed: !track.armed }); }}
            title="Record Arm"
          >R</button>
          <button
            className={`arr-badge m ${track.muted ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onUpdate(index, { muted: !track.muted }); }}
            title="Mute"
          >M</button>
          <button
            className={`arr-badge s ${track.solo ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onUpdate(index, { solo: !track.solo }); }}
            title="Solo"
          >S</button>
        </div>
      </div>

      {/* Volume */}
      <div className="arr-track-vol-row">
        <span className="arr-vol-icon">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={(e) => onUpdate(index, { volume: parseFloat(e.target.value) })}
          className="arr-vol-slider"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="arr-vol-val">{Math.round(track.volume * 100)}</span>
      </div>

      {/* Pan */}
      <div className="arr-track-pan-row">
        <span className="arr-pan-icon">⟷</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={track.pan}
          onChange={(e) => onUpdate(index, { pan: parseFloat(e.target.value) })}
          className="arr-pan-slider"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="arr-pan-val">
          {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}
        </span>
      </div>

      {/* Bottom actions */}
      <div className="arr-track-actions">
        <button
          className="arr-action-btn"
          onClick={(e) => { e.stopPropagation(); onToggleFx(index); }}
          title="Effects"
        >FX</button>
        {canDelete && (
          <button
            className="arr-action-btn delete"
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            title="Delete Track"
          >✕</button>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// RULER COMPONENT — Measure numbers, beat ticks
// =============================================================================
const Ruler = React.memo(({ zoom, bpm, timeSignatureTop, scrollLeft, width, playheadBeat, onSeek }) => {
  const canvasRef = useRef(null);
  const totalBeats = Math.ceil(width / zoom) + timeSignatureTop;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = width;
    const h = 32;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    c.scale(dpr, dpr);

    c.clearRect(0, 0, w, h);

    // Draw beat lines & bar numbers
    for (let beat = 0; beat < totalBeats; beat++) {
      const x = beatToPx(beat, zoom) - scrollLeft;
      if (x < -50 || x > w + 50) continue;

      const isBar = beat % timeSignatureTop === 0;
      const bar = Math.floor(beat / timeSignatureTop) + 1;

      if (isBar) {
        // Bar line
        c.strokeStyle = 'rgba(255,255,255,0.12)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();

        // Bar number
        c.font = '600 10px "JetBrains Mono", monospace';
        c.fillStyle = '#888';
        c.fillText(`${bar}`, x + 4, 13);

        // Time label on every 4th bar
        if ((bar - 1) % 4 === 0) {
          c.font = '500 8px "JetBrains Mono", monospace';
          c.fillStyle = '#555';
          c.fillText(formatBeatTime(beat, bpm), x + 4, 26);
        }
      } else {
        // Beat tick
        c.strokeStyle = 'rgba(255,255,255,0.04)';
        c.lineWidth = 0.5;
        c.beginPath();
        c.moveTo(x, 18);
        c.lineTo(x, h);
        c.stroke();
      }
    }

    // Draw playhead triangle
    const phX = beatToPx(playheadBeat, zoom) - scrollLeft;
    if (phX >= 0 && phX <= w) {
      c.fillStyle = '#34c759';
      c.beginPath();
      c.moveTo(phX - 6, 0);
      c.lineTo(phX + 6, 0);
      c.lineTo(phX, 8);
      c.closePath();
      c.fill();

      c.strokeStyle = '#34c759';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(phX, 8);
      c.lineTo(phX, h);
      c.stroke();
    }
  }, [zoom, bpm, timeSignatureTop, scrollLeft, width, playheadBeat, totalBeats]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const beat = pxToBeat(x, zoom);
    onSeek(Math.max(0, beat));
  };

  return (
    <canvas
      ref={canvasRef}
      className="arr-ruler-canvas"
      onClick={handleClick}
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
    lines.push(
      <div
        key={beat}
        className={`arr-grid-line ${isBar ? 'bar' : 'beat'}`}
        style={{ left: `${x}px` }}
      />
    );
  }

  return <div className="arr-grid-overlay" style={{ height }}>{lines}</div>;
});

// =============================================================================
// CONTEXT MENU
// =============================================================================
const ContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="arr-context-menu" style={{ left: x, top: y }}>
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="arr-ctx-divider" />
        ) : (
          <button
            key={i}
            className={`arr-ctx-item ${item.danger ? 'danger' : ''}`}
            onClick={() => { item.action(); onClose(); }}
            disabled={item.disabled}
          >
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
      <span className="arr-tier-count">
        {trackCount}/{isUnlimited ? '∞' : maxTracks} tracks
      </span>
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
}) => {
  // ── State ─────────────────────────────────────────────────
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [snapValue, setSnapValue] = useState(0.25);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeTrack, setActiveTrack] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [trackHeight, setTrackHeight] = useState(72);

  const timelineRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // ── Tier logic ────────────────────────────────────────────
  const tierConfig = STUDIO_TIER_LIMITS[userTier] || STUDIO_TIER_LIMITS.free;
  const maxTracks = tierConfig.maxTracks;
  const canAddTrack = maxTracks === -1 || tracks.length < maxTracks;

  // ── Timeline width ────────────────────────────────────────
  const timelineWidth = useMemo(() => {
    let maxBeat = 32 * timeSignatureTop; // minimum 32 bars
    tracks.forEach(t => {
      (t.regions || []).forEach(r => {
        const end = r.startBeat + r.duration;
        if (end > maxBeat) maxBeat = end + 4 * timeSignatureTop;
      });
    });
    return beatToPx(maxBeat, zoom) + 400;
  }, [tracks, zoom, timeSignatureTop]);

  // ── Scroll sync ───────────────────────────────────────────
  const handleScroll = useCallback((e) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  // ── Zoom (Ctrl + scroll wheel) ───────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(prev => {
          const delta = e.deltaY > 0 ? -5 : 5;
          return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? onStop?.() : onPlay?.();
          break;
        case 'r':
        case 'R':
          if (!e.metaKey && !e.ctrlKey) onRecord?.();
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedRegion) deleteRegion(selectedRegion);
          break;
        case '=':
        case '+':
          setZoom(prev => Math.min(MAX_ZOOM, prev + 10));
          break;
        case '-':
          setZoom(prev => Math.max(MIN_ZOOM, prev - 10));
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, selectedRegion, onPlay, onStop, onRecord]);

  // ── Auto-scroll playhead into view ────────────────────────
  useEffect(() => {
    if (!isPlaying || !scrollContainerRef.current) return;
    const phX = beatToPx(playheadBeat, zoom);
    const container = scrollContainerRef.current;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth - 220; // minus header width

    if (phX > viewRight - 100) {
      container.scrollLeft = phX - container.clientWidth / 2;
    }
  }, [playheadBeat, isPlaying, zoom]);

  // ── Track CRUD ────────────────────────────────────────────
  const addTrack = useCallback(() => {
    if (!canAddTrack) return;
    const idx = tracks.length;
    const newTrack = {
      name: `Track ${idx + 1}`,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      audio_url: null,
      color: TRACK_COLORS[idx % TRACK_COLORS.length],
      regions: [],
      fx: { eq: false, comp: false, reverb: false, delay: false },
    };
    setTracks([...tracks, newTrack]);
    setActiveTrack(idx);
  }, [tracks, canAddTrack, setTracks]);

  const deleteTrack = useCallback((index) => {
    if (tracks.length <= 1) return;
    const next = [...tracks];
    next.splice(index, 1);
    setTracks(next);
    if (activeTrack >= next.length) setActiveTrack(next.length - 1);
  }, [tracks, activeTrack, setTracks]);

  const updateTrack = useCallback((index, updates) => {
    const next = [...tracks];
    next[index] = { ...next[index], ...updates };
    setTracks(next);
  }, [tracks, setTracks]);

  // ── Region CRUD ───────────────────────────────────────────
  const moveRegion = useCallback((regionId, newStartBeat) => {
    const next = tracks.map(t => ({
      ...t,
      regions: (t.regions || []).map(r =>
        r.id === regionId ? { ...r, startBeat: newStartBeat } : r
      ),
    }));
    setTracks(next);
  }, [tracks, setTracks]);

  const resizeRegion = useCallback((regionId, newStart, newDuration) => {
    const next = tracks.map(t => ({
      ...t,
      regions: (t.regions || []).map(r =>
        r.id === regionId ? { ...r, startBeat: newStart, duration: newDuration } : r
      ),
    }));
    setTracks(next);
  }, [tracks, setTracks]);

  const deleteRegion = useCallback((regionId) => {
    const next = tracks.map(t => ({
      ...t,
      regions: (t.regions || []).filter(r => r.id !== regionId),
    }));
    setTracks(next);
    setSelectedRegion(null);
  }, [tracks, setTracks]);

  const duplicateRegion = useCallback((regionId) => {
    const next = tracks.map(t => {
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const dup = {
        ...region,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        startBeat: region.startBeat + region.duration,
        name: `${region.name} (copy)`,
      };
      return { ...t, regions: [...(t.regions || []), dup] };
    });
    setTracks(next);
  }, [tracks, setTracks]);

  const splitRegion = useCallback((regionId, splitBeat) => {
    const next = tracks.map(t => {
      const idx = (t.regions || []).findIndex(r => r.id === regionId);
      if (idx === -1) return t;
      const region = t.regions[idx];
      if (splitBeat <= region.startBeat || splitBeat >= region.startBeat + region.duration) return t;

      const leftDur = splitBeat - region.startBeat;
      const rightDur = region.duration - leftDur;
      const left = { ...region, duration: leftDur };
      const right = {
        ...region,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        startBeat: splitBeat,
        duration: rightDur,
        name: `${region.name} (R)`,
      };
      const regions = [...t.regions];
      regions.splice(idx, 1, left, right);
      return { ...t, regions };
    });
    setTracks(next);
  }, [tracks, setTracks]);

  // ── Add empty region on double-click ──────────────────────
  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    let startBeat = pxToBeat(x, zoom);
    startBeat = snapBeat(startBeat, snapValue, timeSignatureTop);

    const newRegion = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: 'New Region',
      startBeat,
      duration: timeSignatureTop * 4, // 4 bars
      audioUrl: null,
      color: tracks[trackIndex]?.color,
    };

    const next = [...tracks];
    if (!next[trackIndex].regions) next[trackIndex].regions = [];
    next[trackIndex].regions.push(newRegion);
    setTracks(next);
    setSelectedRegion(newRegion.id);
  }, [tracks, zoom, snapValue, timeSignatureTop, scrollLeft, setTracks]);

  // ── Context menu for regions ──────────────────────────────
  const handleRegionContextMenu = useCallback((e, region) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { icon: '✂️', label: 'Split at Playhead', shortcut: 'S',
          action: () => splitRegion(region.id, playheadBeat),
          disabled: playheadBeat <= region.startBeat || playheadBeat >= region.startBeat + region.duration },
        { icon: '📋', label: 'Duplicate', shortcut: 'Ctrl+D', action: () => duplicateRegion(region.id) },
        { divider: true },
        { icon: '🔇', label: 'Mute Region', action: () => {} },
        { icon: '🎨', label: 'Change Color', action: () => {} },
        { divider: true },
        { icon: '🗑️', label: 'Delete', shortcut: 'Del', danger: true, action: () => deleteRegion(region.id) },
      ],
    });
  }, [playheadBeat, splitRegion, duplicateRegion, deleteRegion]);

  // ── Timeline click to seek ────────────────────────────────
  const handleTimelineClick = useCallback((e) => {
    if (e.detail === 2) return; // ignore double-click
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const beat = snapBeat(pxToBeat(x, zoom), snapValue, timeSignatureTop);
    onSeek?.(Math.max(0, beat));
  }, [zoom, scrollLeft, snapValue, timeSignatureTop, onSeek]);

  // ── Playhead line position ────────────────────────────────
  const playheadLeft = beatToPx(playheadBeat, zoom) - scrollLeft;

  return (
    <div className="arranger">
      {/* ─── TOP TOOLBAR ─────────────────────────────────── */}
      <div className="arr-toolbar">
        <div className="arr-toolbar-left">
          {/* Transport */}
          <div className="arr-transport-group">
            <button className="arr-transport-btn" onClick={() => onSeek?.(0)} title="Return to Start">
              ⏮
            </button>
            <button
              className={`arr-transport-btn play ${isPlaying ? 'active' : ''}`}
              onClick={() => isPlaying ? onStop?.() : onPlay?.()}
              title={isPlaying ? 'Stop' : 'Play'}
            >
              {isPlaying ? '⏹' : '▶'}
            </button>
            <button
              className={`arr-transport-btn rec ${isRecording ? 'active' : ''}`}
              onClick={onRecord}
              title="Record"
            >
              <span className="arr-rec-dot" />
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
            <input
              type="number"
              className="arr-bpm-input"
              value={bpm}
              onChange={(e) => onBpmChange?.(parseInt(e.target.value) || 120)}
              min={40}
              max={300}
            />
          </div>

          {/* Time Signature */}
          <div className="arr-ts-group">
            <select
              className="arr-ts-select"
              value={`${timeSignatureTop}/${timeSignatureBottom}`}
              onChange={(e) => {
                const [t, b] = e.target.value.split('/').map(Number);
                onTimeSignatureChange?.(t, b);
              }}
            >
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
            <select
              className="arr-snap-select"
              value={snapValue}
              onChange={(e) => setSnapValue(parseFloat(e.target.value))}
            >
              {SNAP_VALUES.map(sv => (
                <option key={sv.value} value={sv.value}>{sv.label}</option>
              ))}
            </select>
          </div>

          {/* Zoom */}
          <div className="arr-zoom-group">
            <button className="arr-zoom-btn" onClick={() => setZoom(prev => Math.max(MIN_ZOOM, prev - 10))}>−</button>
            <div className="arr-zoom-bar">
              <div className="arr-zoom-fill" style={{ width: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%` }} />
            </div>
            <button className="arr-zoom-btn" onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev + 10))}>+</button>
          </div>

          {/* Track height */}
          <div className="arr-height-group">
            <button
              className={`arr-height-btn ${trackHeight === 48 ? 'active' : ''}`}
              onClick={() => setTrackHeight(48)}
              title="Small tracks"
            >S</button>
            <button
              className={`arr-height-btn ${trackHeight === 72 ? 'active' : ''}`}
              onClick={() => setTrackHeight(72)}
              title="Medium tracks"
            >M</button>
            <button
              className={`arr-height-btn ${trackHeight === 110 ? 'active' : ''}`}
              onClick={() => setTrackHeight(110)}
              title="Large tracks"
            >L</button>
          </div>

          {/* Tier badge */}
          <TierBadge tier={userTier} trackCount={tracks.length} maxTracks={maxTracks} />

          {/* Save */}
          <button
            className={`arr-save-btn ${saving ? 'saving' : ''}`}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? '⏳' : '💾'} {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* ─── MAIN ARRANGER BODY ──────────────────────────── */}
      <div className="arr-body">
        {/* Track Headers (left sidebar) */}
        <div className="arr-headers">
          {/* Ruler header spacer */}
          <div className="arr-ruler-spacer">
            <span className="arr-ruler-spacer-label">TRACKS</span>
          </div>

          {/* Track header list */}
          <div className="arr-headers-list" style={{ overflowY: 'auto' }}>
            {tracks.map((track, i) => (
              <div key={i} style={{ height: trackHeight }}>
                <TrackHeader
                  track={track}
                  index={i}
                  onUpdate={updateTrack}
                  onDelete={deleteTrack}
                  onToggleFx={onToggleFx}
                  isActive={activeTrack === i}
                  onSelect={setActiveTrack}
                  canDelete={tracks.length > 1}
                />
              </div>
            ))}

            {/* Add Track button */}
            <div className="arr-add-track-row">
              <button
                className={`arr-add-track-btn ${!canAddTrack ? 'disabled' : ''}`}
                onClick={addTrack}
                disabled={!canAddTrack}
              >
                {canAddTrack ? (
                  <>＋ Add Track</>
                ) : (
                  <>🔒 Upgrade for more tracks</>
                )}
              </button>
              {!canAddTrack && (
                <span className="arr-upgrade-hint">
                  {tierConfig.label} plan: max {maxTracks} tracks
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline (right scrollable area) */}
        <div className="arr-timeline-wrapper" ref={scrollContainerRef} onScroll={handleScroll}>
          {/* Ruler */}
          <div className="arr-ruler-row" style={{ width: timelineWidth }}>
            <Ruler
              zoom={zoom}
              bpm={bpm}
              timeSignatureTop={timeSignatureTop}
              scrollLeft={scrollLeft}
              width={scrollContainerRef.current?.clientWidth || 1000}
              playheadBeat={playheadBeat}
              onSeek={(beat) => onSeek?.(beat)}
            />
          </div>

          {/* Track lanes */}
          <div className="arr-lanes" style={{ width: timelineWidth }}>
            {tracks.map((track, i) => (
              <div
                key={i}
                className={`arr-lane ${track.muted ? 'muted' : ''} ${track.solo ? 'soloed' : ''} ${activeTrack === i ? 'active' : ''}`}
                style={{ height: trackHeight, '--track-color': track.color }}
                onClick={handleTimelineClick}
                onDoubleClick={(e) => handleTimelineDoubleClick(e, i)}
              >
                <GridOverlay
                  zoom={zoom}
                  timeSignatureTop={timeSignatureTop}
                  scrollLeft={scrollLeft}
                  width={timelineWidth}
                  height={trackHeight}
                />

                {/* Regions */}
                {(track.regions || []).map(region => (
                  <Region
                    key={region.id}
                    region={region}
                    trackColor={track.color}
                    zoom={zoom}
                    snapValue={snapValue}
                    timeSignatureTop={timeSignatureTop}
                    onMove={moveRegion}
                    onResize={resizeRegion}
                    onSelect={setSelectedRegion}
                    isSelected={selectedRegion === region.id}
                    onContextMenu={handleRegionContextMenu}
                    trackHeight={trackHeight}
                  />
                ))}

                {/* Playhead line */}
                {playheadLeft >= 0 && (
                  <div className="arr-playhead-line" style={{ left: `${beatToPx(playheadBeat, zoom)}px` }} />
                )}
              </div>
            ))}

            {/* Empty area below tracks for add-track zone */}
            {canAddTrack && (
              <div
                className="arr-lane arr-lane-ghost"
                style={{ height: 48 }}
                onDoubleClick={() => addTrack()}
              >
                <div className="arr-lane-ghost-label">Double-click to add track</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MASTER BAR ──────────────────────────────────── */}
      <div className="arr-master-bar">
        <div className="arr-master-left">
          <span className="arr-master-label">MASTER</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange?.(parseFloat(e.target.value))}
            className="arr-master-slider"
          />
          <span className="arr-master-val">{Math.round(masterVolume * 100)}%</span>
        </div>

        <div className="arr-master-center">
          <span className="arr-track-count">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            {tracks.filter(t => t.armed).length > 0 && (
              <span className="arr-armed-count"> • {tracks.filter(t => t.armed).length} armed</span>
            )}
          </span>
        </div>

        <div className="arr-master-right">
          <button
            className="arr-bounce-btn"
            onClick={onBounce}
            disabled={isPlaying || isRecording}
          >
            ⏏ Bounce
          </button>
        </div>
      </div>

      {/* Context menu */}
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