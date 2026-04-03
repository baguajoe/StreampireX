import React, { useState, useCallback } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteName = (n) => NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);

const PAD_COLORS = [
  '#00ffc8','#FF6600','#ff4488','#4488ff',
  '#ffcc00','#cc44ff','#44ffcc','#ff8844',
  '#88ff44','#4488cc','#ff4444','#44ccff',
  '#ffaa44','#aa44ff','#44ff88','#ff44aa',
];

const VELOCITY_CURVES = ['linear','soft','hard','fixed','compressed'];

const GM_MAP = {36:0,37:1,38:2,39:3,40:4,41:5,42:6,43:7,44:8,45:9,46:10,47:11,48:12,49:13,50:14,51:15};
const GM_NAMES = {36:'Kick',37:'Rim',38:'Snare',39:'Clap',40:'Snare2',41:'LTom',42:'CHH',43:'LTom2',44:'PHH',45:'MTom',46:'OHH',47:'MTom2',48:'HTom',49:'Crash',50:'HTom2',51:'Ride'};

const SPXMidiMapPanel = ({
  midiMap, setMidiMap,
  midiLearn, setMidiLearn,
  midiLearnPad, setMidiLearnPad,
  midiInputs, selMidi, setSelMidi,
  velocityCurve, setVelocityCurve,
  padMapping, setPadMapping,
  transpose, setTranspose,
  octaveShift, setOctaveShift,
  pads = [],
  lastNote = null,
}) => {
  const [hoveredPad, setHoveredPad] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get all notes mapped to a pad
  const notesForPad = (pi) =>
    Object.entries(midiMap).filter(([, v]) => v === pi).map(([k]) => parseInt(k));

  // Clear a single mapping
  const clearPadMap = (pi) => {
    setMidiMap(prev => {
      const next = { ...prev };
      Object.entries(next).forEach(([k, v]) => { if (v === pi) delete next[k]; });
      return next;
    });
  };

  // Clear all
  const clearAll = () => setMidiMap({});

  // Load GM preset
  const loadGM = () => setMidiMap({ ...GM_MAP });

  // Load chromatic preset starting at C2
  const loadChromatic = () => {
    const map = {};
    for (let i = 0; i < 16; i++) map[36 + i + (octaveShift * 12)] = i;
    setMidiMap(map);
  };

  const S = {
    wrap: {
      background: '#06060f', padding: 16, fontFamily: 'JetBrains Mono, monospace',
      color: '#c9d1d9', minHeight: 400,
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { color: '#00ffc8', fontSize: 14, fontWeight: 700, letterSpacing: 2 },
    row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
    label: { color: '#5a7088', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
    select: {
      background: '#0d1117', border: '1px solid #21262d', color: '#c9d1d9',
      borderRadius: 4, padding: '4px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    },
    btn: (active, color = '#00ffc8') => ({
      background: active ? color : '#0d1117',
      color: active ? '#06060f' : color,
      border: `1px solid ${color}`,
      borderRadius: 5, padding: '4px 12px', cursor: 'pointer',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
    }),
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16,
    },
    pad: (pi, isLearning, isHovered) => ({
      background: isLearning ? '#1a0a00' : isHovered ? '#0d1f2f' : '#0d1117',
      border: `2px solid ${isLearning ? '#FF6600' : isHovered ? '#00ffc8' : '#21262d'}`,
      borderRadius: 8, padding: '10px 8px', cursor: 'pointer', minHeight: 70,
      position: 'relative', transition: 'all 0.15s',
    }),
    padNum: (pi) => ({
      color: PAD_COLORS[pi], fontSize: 10, fontWeight: 700, letterSpacing: 1,
    }),
    padName: { color: '#8b9ab0', fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    noteTag: (color) => ({
      display: 'inline-block', background: color + '22', color: color,
      border: `1px solid ${color}44`, borderRadius: 3,
      padding: '1px 5px', fontSize: 9, marginTop: 3, marginRight: 2,
    }),
    clearBtn: {
      position: 'absolute', top: 4, right: 4,
      background: 'transparent', border: 'none', color: '#5a7088',
      cursor: 'pointer', fontSize: 10, padding: 2,
    },
    learnHint: {
      background: '#1a0800', border: '1px solid #FF6600', borderRadius: 6,
      padding: '8px 14px', color: '#FF6600', fontSize: 11, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    },
    lastNote: {
      background: '#0d1117', border: '1px solid #00ffc8', borderRadius: 5,
      padding: '3px 10px', color: '#00ffc8', fontSize: 11,
    },
    divider: { borderColor: '#21262d', margin: '12px 0' },
    advBtn: { background: 'none', border: 'none', color: '#5a7088', cursor: 'pointer', fontSize: 11, padding: 0 },
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>🎹 MIDI MAPPING</span>
        {lastNote !== null && (
          <span style={S.lastNote}>Last: {noteName(lastNote)} ({lastNote})</span>
        )}
      </div>

      {/* Device + Learn row */}
      <div style={S.row}>
        <span style={S.label}>Device</span>
        <select style={S.select} value={selMidi?.id || ''} onChange={e => setSelMidi(midiInputs.find(m => m.id === e.target.value) || null)}>
          <option value="">No MIDI device</option>
          {midiInputs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button style={S.btn(midiLearn, '#FF6600')} onClick={() => { setMidiLearn(p => !p); setMidiLearnPad(null); }}>
          {midiLearn ? '🔴 LEARNING...' : '● MIDI LEARN'}
        </button>
        {lastNote !== null && midiLearn && midiLearnPad !== null && (
          <span style={{ color: '#FF6600', fontSize: 11 }}>
            → Click a pad to assign {noteName(lastNote)}
          </span>
        )}
      </div>

      {/* Learn hint */}
      {midiLearn && (
        <div style={S.learnHint}>
          <span>⚡</span>
          <span>Play a note on your controller, then click a pad below to assign it. Click MIDI Learn again to exit.</span>
        </div>
      )}

      {/* Presets + Clear row */}
      <div style={S.row}>
        <span style={S.label}>Preset</span>
        <button style={S.btn(false)} onClick={loadGM}>GM Drums</button>
        <button style={S.btn(false)} onClick={loadChromatic}>Chromatic</button>
        <button style={{ ...S.btn(false, '#ff4444'), marginLeft: 'auto' }} onClick={clearAll}>Clear All</button>
      </div>

      {/* Advanced toggle */}
      <div style={S.row}>
        <button style={S.advBtn} onClick={() => setShowAdvanced(p => !p)}>
          {showAdvanced ? '▲' : '▼'} Advanced Settings
        </button>
      </div>

      {showAdvanced && (
        <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={S.row}>
            <span style={S.label}>Velocity Curve</span>
            <select style={S.select} value={velocityCurve} onChange={e => setVelocityCurve(e.target.value)}>
              {VELOCITY_CURVES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={S.row}>
            <span style={S.label}>Pad Mode</span>
            {['gm','chromatic','linear'].map(m => (
              <button key={m} style={S.btn(padMapping === m)} onClick={() => setPadMapping(m)}>{m}</button>
            ))}
          </div>
          <div style={S.row}>
            <span style={S.label}>Transpose</span>
            <button style={S.btn(false)} onClick={() => setTranspose(p => p - 1)}>-</button>
            <span style={{ color: '#00ffc8', fontSize: 12, minWidth: 30, textAlign: 'center' }}>{transpose}</span>
            <button style={S.btn(false)} onClick={() => setTranspose(p => p + 1)}>+</button>
            <span style={{ ...S.label, marginLeft: 12 }}>Octave</span>
            <button style={S.btn(false)} onClick={() => setOctaveShift(p => p - 1)}>-</button>
            <span style={{ color: '#00ffc8', fontSize: 12, minWidth: 30, textAlign: 'center' }}>{octaveShift}</span>
            <button style={S.btn(false)} onClick={() => setOctaveShift(p => p + 1)}>+</button>
          </div>
        </div>
      )}

      <hr style={S.divider} />

      {/* 4×4 Pad grid */}
      <div style={S.grid}>
        {Array.from({ length: 16 }, (_, pi) => {
          const isLearning = midiLearn && midiLearnPad === pi;
          const isHovered  = hoveredPad === pi;
          const notes      = notesForPad(pi);
          const padName    = pads[pi]?.name || `Pad ${pi + 1}`;

          return (
            <div
              key={pi}
              style={S.pad(pi, isLearning, isHovered)}
              onMouseEnter={() => setHoveredPad(pi)}
              onMouseLeave={() => setHoveredPad(null)}
              onClick={() => {
                if (midiLearn) {
                  setMidiLearnPad(pi);
                  // If lastNote is known, assign immediately
                  if (lastNote !== null) {
                    setMidiMap(prev => ({ ...prev, [lastNote]: pi }));
                    setMidiLearn(false);
                    setMidiLearnPad(null);
                  }
                }
              }}
            >
              {notes.length > 0 && (
                <button style={S.clearBtn} onClick={e => { e.stopPropagation(); clearPadMap(pi); }} title="Clear assignments">✕</button>
              )}
              <div style={S.padNum(pi)}>PAD {pi + 1}</div>
              <div style={S.padName}>{padName}</div>
              <div style={{ marginTop: 4 }}>
                {notes.length === 0 ? (
                  <span style={{ color: '#21262d', fontSize: 9 }}>
                    {midiLearn ? 'click to assign' : 'unassigned'}
                  </span>
                ) : (
                  notes.map(n => (
                    <span key={n} style={S.noteTag(PAD_COLORS[pi])}>
                      {noteName(n)}{GM_NAMES[n] ? ` ${GM_NAMES[n]}` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map summary */}
      {Object.keys(midiMap).length > 0 && (
        <div style={{ marginTop: 16, color: '#5a7088', fontSize: 10 }}>
          {Object.keys(midiMap).length} note{Object.keys(midiMap).length !== 1 ? 's' : ''} mapped
          {' · '}
          {Object.entries(midiMap).map(([note, pad]) =>
            `${noteName(parseInt(note))}→P${pad + 1}`
          ).join(' ')}
        </div>
      )}
    </div>
  );
};

export default SPXMidiMapPanel;
