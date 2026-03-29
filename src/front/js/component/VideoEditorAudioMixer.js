// =============================================================================
// VideoEditorAudioMixer.js — Per-track audio mixer panel
// Faders, pan, solo, mute, send levels — like Premiere Pro Audio Mixer
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';

const DB_MIN = -60;
const DB_MAX = 6;

function dbToLinear(db) { return db <= DB_MIN ? 0 : Math.pow(10, db / 20); }
function linearToDb(lin) { return lin <= 0 ? DB_MIN : Math.max(DB_MIN, 20 * Math.log10(lin)); }
function dbToPercent(db) { return ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100; }
function percentToDb(pct) { return DB_MIN + (pct / 100) * (DB_MAX - DB_MIN); }

// VU Meter
function VUMeter({ level = -60, peak = -60, color }) {
  const pct = Math.max(0, Math.min(100, dbToPercent(level)));
  const pkPct = Math.max(0, Math.min(100, dbToPercent(peak)));
  const meterColor = level > -6 ? '#ff4444' : level > -12 ? '#ffaa00' : color || '#00ffc8';
  return (
    <div style={{ width: 6, height: 120, background: '#0a0a14', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${pct}%`, background: meterColor,
        transition: 'height 0.05s',
      }} />
      <div style={{
        position: 'absolute', bottom: `${pkPct}%`, left: 0, right: 0,
        height: 1, background: '#fff', opacity: 0.8,
      }} />
    </div>
  );
}

// Fader
function Fader({ value, onChange, color }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    const startY = e.clientY;
    const startVal = value;
    const onMove = (me) => {
      const dy = startY - me.clientY;
      const newPct = Math.max(0, Math.min(100, dbToPercent(startVal) + dy * 0.5));
      onChange(percentToDb(newPct));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [value, onChange]);

  const pct = Math.max(0, Math.min(100, dbToPercent(value)));

  return (
    <div ref={trackRef} style={{ position: 'relative', width: 16, height: 140, background: '#0a0a14', borderRadius: 2, cursor: 'ns-resize' }}>
      {/* Track markings */}
      {[6, 0, -6, -12, -18, -24, -48].map(db => (
        <div key={db} style={{
          position: 'absolute', left: '100%', marginLeft: 2,
          bottom: `${dbToPercent(db)}%`, fontSize: 7, color: '#3a5570',
          transform: 'translateY(50%)', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{db}</div>
      ))}
      {/* Fader handle */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onChange(0)} // double-click to reset to 0dB
        style={{
          position: 'absolute', bottom: `${pct}%`, left: '50%',
          transform: 'translate(-50%, 50%)',
          width: 24, height: 8, background: dragging ? color : '#2a3a4a',
          border: `1px solid ${color}`, borderRadius: 2, cursor: 'ns-resize',
          boxShadow: dragging ? `0 0 6px ${color}` : 'none',
          transition: 'box-shadow 0.1s',
        }}
      />
    </div>
  );
}

// Pan Knob
function PanKnob({ value, onChange, color }) {
  const startY = useRef(0);
  const startV = useRef(0);
  const angle = value * 135; // -1 to +1 → -135° to +135°
  return (
    <div style={{ textAlign: 'center', cursor: 'ns-resize', userSelect: 'none' }}
      onMouseDown={e => { startY.current = e.clientY; startV.current = value; }}
      onMouseMove={e => {
        if (e.buttons !== 1) return;
        const delta = (startY.current - e.clientY) / 60;
        onChange(Math.max(-1, Math.min(1, startV.current + delta)));
      }}
      onDoubleClick={() => onChange(0)}>
      <svg width={28} height={28} viewBox="0 0 28 28">
        <circle cx={14} cy={14} r={11} fill="#0a0a14" stroke="#1a2a3a" strokeWidth={1.5} />
        <line x1={14} y1={14}
          x2={14 + 8 * Math.sin(angle * Math.PI / 180)}
          y2={14 - 8 * Math.cos(angle * Math.PI / 180)}
          stroke={Math.abs(value) > 0.02 ? color : '#3a5570'} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div style={{ fontSize: 8, color: '#5a7088' }}>
        {Math.abs(value) < 0.02 ? 'C' : value < 0 ? `L${Math.round(-value * 100)}` : `R${Math.round(value * 100)}`}
      </div>
    </div>
  );
}

// Track Channel Strip
function ChannelStrip({ track, levels, peaks, onVolumeChange, onPanChange, onMute, onSolo, color, isMaster }) {
  const vol = linearToDb(track.volume ?? 1);
  const pan = track.pan ?? 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 4, padding: '8px 6px', minWidth: isMaster ? 64 : 52,
      background: isMaster ? '#0d1f35' : '#080f1a',
      borderLeft: `2px solid ${color}`,
      borderRadius: 4,
    }}>
      {/* Track name */}
      <div style={{
        fontSize: 9, color, fontWeight: 700, maxWidth: 48,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 40,
      }}>{isMaster ? 'MASTER' : (track.name || `Track ${track.id}`)}</div>

      {/* Mute / Solo */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button onClick={onMute} style={{
          width: 20, height: 16, fontSize: 8, fontWeight: 700, borderRadius: 2,
          background: track.muted ? '#ff444433' : '#0a1628',
          color: track.muted ? '#ff4444' : '#5a7088',
          border: `1px solid ${track.muted ? '#ff4444' : '#1a2a3a'}`,
          cursor: 'pointer', padding: 0,
        }}>M</button>
        <button onClick={onSolo} style={{
          width: 20, height: 16, fontSize: 8, fontWeight: 700, borderRadius: 2,
          background: track.soloed ? '#ffaa0033' : '#0a1628',
          color: track.soloed ? '#ffaa00' : '#5a7088',
          border: `1px solid ${track.soloed ? '#ffaa00' : '#1a2a3a'}`,
          cursor: 'pointer', padding: 0,
        }}>S</button>
      </div>

      {/* Pan */}
      <PanKnob value={pan} color={color}
        onChange={v => onPanChange(track.id, v)} />

      {/* VU + Fader side by side */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <VUMeter level={levels?.[track.id] ?? DB_MIN} peak={peaks?.[track.id] ?? DB_MIN} color={color} />
        <Fader value={vol} color={color}
          onChange={db => onVolumeChange(track.id, dbToLinear(db))} />
        <VUMeter level={levels?.[track.id] ?? DB_MIN} peak={peaks?.[track.id] ?? DB_MIN} color={color} />
      </div>

      {/* dB readout */}
      <div style={{ fontSize: 9, color, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }}>
        {vol >= 0 ? '+' : ''}{vol.toFixed(1)}
      </div>
    </div>
  );
}

// Main AudioMixer
export default function VideoEditorAudioMixer({ tracks, onTrackUpdate, onClose }) {
  const [levels, setLevels] = useState({});
  const [peaks, setPeaks] = useState({});
  const [masterVol, setMasterVol] = useState(1);
  const [masterPan, setMasterPan] = useState(0);

  const audioTracks = tracks?.filter(t => t.type === 'audio' || t.type === 'music') || [];
  const videoTracks = tracks?.filter(t => t.type === 'video') || [];
  const allTracks   = [...audioTracks, ...videoTracks];

  // Track colors
  const TRACK_COLORS = ['#00ffc8', '#5ac8fa', '#ff6600', '#ff44aa', '#ffaa00', '#aa44ff'];

  const handleVolumeChange = (trackId, vol) => {
    onTrackUpdate?.(trackId, { volume: vol });
  };

  const handlePanChange = (trackId, pan) => {
    onTrackUpdate?.(trackId, { pan });
  };

  const handleMute = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    onTrackUpdate?.(trackId, { muted: !track?.muted });
  };

  const handleSolo = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    onTrackUpdate?.(trackId, { soloed: !track?.soloed });
  };

  // Master track proxy
  const masterTrack = { id: 'master', name: 'Master', volume: masterVol, pan: masterPan, muted: false, soloed: false };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#06060f', color: '#ccc',
      fontFamily: 'JetBrains Mono, monospace',
      borderTop: '1px solid #1a2a3a',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', background: '#0a1628', borderBottom: '1px solid #1a2a3a' }}>
        <span style={{ fontSize: 10, color: '#00ffc8', fontWeight: 700 }}>🎚 AUDIO MIXER</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>

      {/* Channel strips */}
      <div style={{ display: 'flex', gap: 4, padding: 8, overflowX: 'auto', flex: 1, alignItems: 'flex-end' }}>
        {allTracks.map((track, i) => (
          <ChannelStrip
            key={track.id}
            track={track}
            levels={levels}
            peaks={peaks}
            color={TRACK_COLORS[i % TRACK_COLORS.length]}
            isMaster={false}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onMute={handleMute}
            onSolo={handleSolo}
          />
        ))}
        {/* Master */}
        <ChannelStrip
          track={masterTrack}
          levels={levels}
          peaks={peaks}
          color="#ffffff"
          isMaster={true}
          onVolumeChange={(_, vol) => setMasterVol(vol)}
          onPanChange={(_, pan) => setMasterPan(pan)}
          onMute={() => {}}
          onSolo={() => {}}
        />
      </div>
    </div>
  );
}
