// =============================================================================
// TrackGroupBus.js — Submix Bus / Track Group Panel
// =============================================================================
// Location: src/front/js/component/TrackGroupBus.js
//
// What it does:
//   • Create named bus channels (Drums, Vocals, Guitars, etc.)
//   • Assign any audio track to a bus via dropdown in track row
//   • Bus channel shows combined VU meter, fader, mute/solo
//   • Bus effects chain (passes through UnifiedFXChain)
//   • Tracks routed to a bus have their output multiplied by bus fader level
//
// INTEGRATION into RecordingStudio.js:
//
//   1. Add state:
//      const [buses, setBuses] = useState([]);
//      // Bus shape: { id, name, color, volume, muted, solo, effects: {...} }
//
//      Add 'busId' field to DEFAULT_TRACK:
//      busId: null,   // null = routes to master
//
//   2. Import + render in Console view (add below track channels, before master):
//      <TrackGroupBus
//        buses={buses}
//        setBuses={setBuses}
//        tracks={tracks}
//        setTracks={setTracks}
//        masterVolume={masterVolume}
//        audioContext={audioCtxRef.current}
//        onStatus={setStatus}
//      />
//
//   3. In your playback engine, apply bus gain BEFORE master:
//      For track i: effectiveGain = track.volume * (buses.find(b=>b.id===track.busId)?.volume ?? 1)
//
//   4. Add bus selector to each track row (in Record/Console view):
//      <BusSelector track={track} buses={buses} onChange={(busId) => updateTrack(i, { busId })} />
// =============================================================================

import React, { useState, useCallback, useRef } from 'react';

// ── Color palette for buses ───────────────────────────────────────────────────
const BUS_COLORS = [
  '#e8652b', '#1a7c4d', '#7c3aed', '#1a4d7c',
  '#c0392b', '#f39c12', '#2980b9', '#8e44ad',
];

const DEFAULT_BUS_EFFECTS = {
  eq:         { enabled: false, lowGain: 0, midGain: 0, highGain: 0, midFreq: 1000 },
  compressor: { enabled: false, threshold: -20, ratio: 4, attack: 0.003, release: 0.1 },
  reverb:     { enabled: false, mix: 0.15, decay: 1.5 },
  limiter:    { enabled: false, ceiling: -0.5, ratio: 20 },
};

// ── Bus Selector dropdown (use inside track row) ──────────────────────────────

export function BusSelector({ track, buses, onChange }) {
  return (
    <select
      value={track.busId || ''}
      onChange={e => onChange(e.target.value || null)}
      title="Route to Bus"
      style={{
        background: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: 3,
        color: '#8b949e',
        fontSize: 9,
        padding: '1px 3px',
        cursor: 'pointer',
        fontFamily: '"JetBrains Mono", monospace',
        maxWidth: 64,
      }}
    >
      <option value="">Master</option>
      {buses.map(b => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}

// ── VU Meter (mini) ───────────────────────────────────────────────────────────

function MiniVU({ level = 0 }) {
  const pct = Math.min(100, Math.max(0, level * 100));
  const color = pct > 90 ? '#ff4040' : pct > 75 ? '#ffd700' : '#00ffc8';
  return (
    <div style={{ width: 6, height: 48, background: '#0d1117', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', bottom: 0, width: '100%',
        height: `${pct}%`, background: color,
        transition: 'height 0.05s, background 0.1s',
      }} />
    </div>
  );
}

// ── Single Bus Channel Strip ──────────────────────────────────────────────────

function BusChannel({ bus, trackCount, onUpdate, onDelete, onOpenFX }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(bus.name);
  const nameRef = useRef(null);

  const update = (patch) => onUpdate(bus.id, patch);

  const dbVal = bus.volume > 0 ? (20 * Math.log10(bus.volume)).toFixed(1) : '-∞';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: 52, minHeight: 200, padding: '6px 4px',
      background: '#0f1419', borderRadius: 4,
      border: `1px solid ${bus.muted ? '#333' : bus.color}44`,
      gap: 4, flexShrink: 0,
    }}>
      {/* Color dot + track count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: bus.color }} />
        <span style={{ fontSize: 9, color: '#666', fontFamily: 'monospace' }}>{trackCount}T</span>
      </div>

      {/* Mute / Solo */}
      <div style={{ display: 'flex', gap: 3 }}>
        <button
          onClick={() => update({ muted: !bus.muted })}
          style={{
            width: 18, height: 14, fontSize: 7, fontWeight: 800,
            background: bus.muted ? '#e8652b' : '#1c2333',
            color: bus.muted ? '#fff' : '#8b949e',
            border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: 'monospace',
          }}
        >M</button>
        <button
          onClick={() => update({ solo: !bus.solo })}
          style={{
            width: 18, height: 14, fontSize: 7, fontWeight: 800,
            background: bus.solo ? '#ffd700' : '#1c2333',
            color: bus.solo ? '#000' : '#8b949e',
            border: 'none', borderRadius: 2, cursor: 'pointer', fontFamily: 'monospace',
          }}
        >S</button>
      </div>

      {/* VU + Fader */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flex: 1 }}>
        <MiniVU level={bus.muted ? 0 : bus.volume} />
        <MiniVU level={bus.muted ? 0 : bus.volume * 0.95} />
        <input
          type="range" orient="vertical"
          min={0} max={1.25} step={0.005}
          value={bus.volume}
          onChange={e => update({ volume: parseFloat(e.target.value) })}
          style={{ height: 80, cursor: 'pointer', writingMode: 'vertical-lr', direction: 'rtl' }}
          title={`${dbVal} dB`}
        />
      </div>

      {/* dB readout */}
      <div style={{ fontSize: 8, color: '#8b949e', fontFamily: 'monospace' }}>{dbVal}</div>

      {/* FX button */}
      <button
        onClick={() => onOpenFX(bus)}
        style={{
          width: '100%', fontSize: 8, padding: '2px 0',
          background: '#1c2333', border: '1px solid #30363d',
          color: '#00ffc8', borderRadius: 2, cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >FX</button>

      {/* Name */}
      {renaming ? (
        <input
          ref={nameRef}
          autoFocus
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={() => { update({ name: nameVal }); setRenaming(false); }}
          onKeyDown={e => { if (e.key === 'Enter') { update({ name: nameVal }); setRenaming(false); } if (e.key === 'Escape') setRenaming(false); }}
          style={{
            width: '100%', fontSize: 8, background: '#0d1117', border: '1px solid #00ffc8',
            color: '#cdd9e5', borderRadius: 2, textAlign: 'center', padding: 1,
            fontFamily: 'monospace', outline: 'none',
          }}
        />
      ) : (
        <div
          title="Double-click to rename"
          onDoubleClick={() => { setNameVal(bus.name); setRenaming(true); }}
          style={{
            fontSize: 8, color: bus.muted ? '#555' : '#cdd9e5',
            textAlign: 'center', fontFamily: 'monospace',
            maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            cursor: 'text',
          }}
        >{bus.name}</div>
      )}

      {/* Delete */}
      <button
        onClick={() => { if (window.confirm(`Delete bus "${bus.name}"?`)) onDelete(bus.id); }}
        style={{ fontSize: 8, background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
        title="Delete bus"
      >✕</button>
    </div>
  );
}

// ── Main TrackGroupBus Component ──────────────────────────────────────────────

export default function TrackGroupBus({
  buses,
  setBuses,
  tracks,
  setTracks,
  onStatus,
  onOpenFX,     // (bus) => open UnifiedFXChain for this bus
}) {
  const [collapsed, setCollapsed] = useState(false);

  const addBus = useCallback(() => {
    const idx = buses.length;
    const newBus = {
      id: `bus_${Date.now()}`,
      name: `Bus ${idx + 1}`,
      color: BUS_COLORS[idx % BUS_COLORS.length],
      volume: 1,
      muted: false,
      solo: false,
      effects: { ...DEFAULT_BUS_EFFECTS },
    };
    setBuses(prev => [...prev, newBus]);
    onStatus?.(`Bus ${idx + 1} created — assign tracks in the track rows`);
  }, [buses.length, setBuses, onStatus]);

  const updateBus = useCallback((busId, patch) => {
    setBuses(prev => prev.map(b => b.id === busId ? { ...b, ...patch } : b));
  }, [setBuses]);

  const deleteBus = useCallback((busId) => {
    // Unassign any tracks using this bus
    setTracks(prev => prev.map(t => t.busId === busId ? { ...t, busId: null } : t));
    setBuses(prev => prev.filter(b => b.id !== busId));
    onStatus?.('Bus deleted — tracks reassigned to Master');
  }, [setBuses, setTracks, onStatus]);

  // Count tracks per bus
  const trackCounts = buses.reduce((acc, b) => {
    acc[b.id] = tracks.filter(t => t.busId === b.id).length;
    return acc;
  }, {});

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#0a0d14', borderTop: '1px solid #1c2333',
      padding: collapsed ? '4px 8px' : '8px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: collapsed ? 0 : 6 }}>
        <button
          onClick={() => setCollapsed(p => !p)}
          style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 11 }}
        >
          {collapsed ? '▶' : '▼'}
        </button>
        <span style={{ fontSize: 10, color: '#8b949e', fontFamily: '"JetBrains Mono", monospace', letterSpacing: 1 }}>
          GROUP BUSES
        </span>
        {!collapsed && (
          <button
            onClick={addBus}
            style={{
              fontSize: 9, padding: '2px 8px',
              background: '#1c2333', border: '1px solid #30363d',
              color: '#00ffc8', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >+ Add Bus</button>
        )}
        {buses.length > 0 && (
          <span style={{ fontSize: 9, color: '#444', marginLeft: 'auto', fontFamily: 'monospace' }}>
            {buses.length} bus{buses.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Bus channels */}
      {!collapsed && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {buses.length === 0 ? (
            <div style={{ fontSize: 10, color: '#444', fontFamily: 'monospace', padding: '8px 4px' }}>
              No buses yet — click + Add Bus to create a submix group
            </div>
          ) : (
            buses.map(bus => (
              <BusChannel
                key={bus.id}
                bus={bus}
                trackCount={trackCounts[bus.id] || 0}
                onUpdate={updateBus}
                onDelete={deleteBus}
                onOpenFX={onOpenFX || (() => {})}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Utility: apply bus gain to a track's output gain value ────────────────────
// Use in your playback engine when building the Web Audio graph:
//
//   const effectiveGain = getTrackEffectiveGain(track, buses);
//   gainNode.gain.value = effectiveGain;

export function getTrackEffectiveGain(track, buses) {
  if (!track.busId || !buses?.length) return track.volume ?? 1;
  const bus = buses.find(b => b.id === track.busId);
  if (!bus) return track.volume ?? 1;
  if (bus.muted) return 0;
  return (track.volume ?? 1) * (bus.volume ?? 1);
}

// ── Solo logic helper ─────────────────────────────────────────────────────────
// Returns true if the track should be audible given track + bus solo states

export function isTrackAudible(track, buses, allTracks) {
  if (track.muted) return false;
  const bus = buses?.find(b => b.id === track.busId);
  if (bus?.muted) return false;

  const anyTrackSolo = allTracks.some(t => t.solo);
  const anyBusSolo   = buses?.some(b => b.solo);

  if (!anyTrackSolo && !anyBusSolo) return true;
  if (track.solo) return true;
  if (bus?.solo) return true;
  return false;
}