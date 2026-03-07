// =============================================================================
// UnifiedFXChain.js — Complete FX popup for StreamPireX DAW
// =============================================================================
// Location: src/front/js/component/UnifiedFXChain.js
//
// Shows ALL effects for a track in one popup:
//   TAB 1 — Native Effects (EQ, Filter, Compressor, Distortion, Reverb, Delay, Limiter)
//            These are the core track.effects used by the audio engine
//   TAB 2 — Plugin Inserts (PluginRackPanel: Gain/Trim, 3-Band EQ, Compressor worklet,
//            Reverb, Delay, Limiter, De-Esser, Saturation)
//
// Triggered two ways:
//   • FX button on any track row → modal popup overlay (has ✕ close button)
//   • FX Chain tab (viewMode=plugins) → fills the main view area
// =============================================================================

import React, { useState, useCallback } from 'react';
import ParametricEQGraph from './ParametricEQGraph';
import PluginRackPanel from './audio/components/plugins/PluginRackPanel';

// ─── Native effect slot definitions ──────────────────────────────────────────
const NATIVE_SLOTS = [
  {
    key: 'eq', label: 'Parametric EQ', icon: '〰', color: '#00ffc8', category: 'tone', hasGraph: true,
    params: [
      { p: 'lowGain',  l: 'Low Shelf',   min: -12, max: 12,   step: 0.5,  fmt: v => `${v > 0 ? '+' : ''}${v}dB` },
      { p: 'midGain',  l: 'Mid Peak',    min: -12, max: 12,   step: 0.5,  fmt: v => `${v > 0 ? '+' : ''}${v}dB` },
      { p: 'midFreq',  l: 'Mid Freq',    min: 100, max: 8000, step: 50,   fmt: v => `${v}Hz`                     },
      { p: 'highGain', l: 'High Shelf',  min: -12, max: 12,   step: 0.5,  fmt: v => `${v > 0 ? '+' : ''}${v}dB` },
    ],
  },
  {
    key: 'filter', label: 'Filter', icon: '∿', color: '#4a9eff', category: 'tone',
    selectParam: { p: 'type', l: 'Type', options: ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking'] },
    params: [
      { p: 'frequency', l: 'Cutoff',    min: 20,  max: 20000, step: 10,  fmt: v => v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v}Hz` },
      { p: 'Q',         l: 'Resonance', min: 0.1, max: 18,    step: 0.1, fmt: v => v.toFixed(1) },
    ],
  },
  {
    key: 'compressor', label: 'Compressor', icon: '◈', color: '#bf5af2', category: 'dynamics',
    params: [
      { p: 'threshold', l: 'Threshold', min: -60,   max: 0,    step: 0.5,   fmt: v => `${v}dB`                       },
      { p: 'ratio',     l: 'Ratio',     min: 1,     max: 20,   step: 0.5,   fmt: v => `${v}:1`                       },
      { p: 'attack',    l: 'Attack',    min: 0.001, max: 1,    step: 0.001, fmt: v => `${(v * 1000).toFixed(0)}ms`   },
      { p: 'release',   l: 'Release',   min: 0.01,  max: 2,    step: 0.01,  fmt: v => `${(v * 1000).toFixed(0)}ms`  },
    ],
  },
  {
    key: 'distortion', label: 'Distortion / Saturation', icon: '⋈', color: '#ff9500', category: 'color',
    params: [
      { p: 'amount', l: 'Drive', min: 0, max: 400, step: 1, fmt: v => `${v}` },
    ],
  },
  {
    key: 'reverb', label: 'Reverb', icon: '◎', color: '#30d158', category: 'space',
    params: [
      { p: 'mix',   l: 'Mix',   min: 0,   max: 1,  step: 0.01, fmt: v => `${Math.round(v * 100)}%` },
      { p: 'decay', l: 'Decay', min: 0.1, max: 10, step: 0.1,  fmt: v => `${v.toFixed(1)}s`        },
    ],
  },
  {
    key: 'delay', label: 'Delay', icon: '⟳', color: '#ffd60a', category: 'space',
    params: [
      { p: 'time',     l: 'Time',     min: 0.05, max: 2,    step: 0.01, fmt: v => `${(v * 1000).toFixed(0)}ms` },
      { p: 'feedback', l: 'Feedback', min: 0,    max: 0.95, step: 0.01, fmt: v => `${Math.round(v * 100)}%`   },
      { p: 'mix',      l: 'Mix',      min: 0,    max: 1,    step: 0.01, fmt: v => `${Math.round(v * 100)}%`   },
    ],
  },
  {
    key: 'limiter', label: 'Limiter', icon: '⊟', color: '#ff6b6b', category: 'dynamics',
    params: [
      { p: 'threshold', l: 'Ceiling', min: -20, max: 0,  step: 0.1, fmt: v => `${v}dB` },
      { p: 'ratio',     l: 'Ratio',   min: 2,   max: 20, step: 1,   fmt: v => `${v}:1` },
    ],
  },
];

const CATEGORY_ORDER = ['tone', 'dynamics', 'color', 'space'];
const CATEGORY_LABELS = { tone: 'TONE', dynamics: 'DYNAMICS', color: 'COLOR', space: 'SPACE' };

// Signal flow nodes for the visual strip
const FLOW_LABELS = ['IN', 'EQ', 'FILT', 'COMP', 'DIST', 'VERB', 'DLY', 'LIM', 'PLUG', 'OUT'];
const FLOW_KEYS   = [null,  'eq', 'filter', 'compressor', 'distortion', 'reverb', 'delay', 'limiter', null, null];

// =============================================================================
const UnifiedFXChain = ({
  track,
  trackIndex,
  audioContext,
  onEffectChange,
  onClose,
  onOpenMastering,
  onOpenStutter,
  onOpenMultiband,
}) => {
  const [activeTab, setActiveTab]   = useState('native'); // 'native' | 'plugins'
  const [expanded,  setExpanded]    = useState({ eq: true });

  const effects    = track?.effects ?? {};
  const trackColor = track?.color   ?? '#00ffc8';
  const trackName  = track?.name    ?? `Track ${(trackIndex ?? 0) + 1}`;

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const setParam = useCallback((fxKey, param, value) => {
    onEffectChange?.(trackIndex, fxKey, param, value);
  }, [onEffectChange, trackIndex]);

  const toggleEnabled = useCallback((fxKey, e) => {
    e.stopPropagation();
    setParam(fxKey, 'enabled', !(effects[fxKey]?.enabled ?? false));
  }, [setParam, effects]);

  // Group slots by category in order
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = NATIVE_SLOTS.filter(s => s.category === cat);
    return acc;
  }, {});

  const nativeActiveCount = NATIVE_SLOTS.filter(s => effects[s.key]?.enabled).length;

  // ── Styles (inline so the component is fully self-contained) ─────────────
  const S = {
    root: {
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d1117', color: '#cdd9e5',
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      fontSize: '11px', overflow: 'hidden',
    },
    // Header
    header: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px', borderBottom: '1px solid #1c2128',
      background: 'linear-gradient(90deg,#161b22 0%,#0d1117 100%)',
      flexShrink: 0,
    },
    dot: { width: 10, height: 10, borderRadius: '50%', background: trackColor, boxShadow: `0 0 8px ${trackColor}` },
    title: { color: '#e6edf3', fontWeight: 800, fontSize: '13px', letterSpacing: '0.08em' },
    subTitle: { color: '#484f58', fontSize: '10px', flex: 1 },
    advLabel: { color: '#2d333b', fontSize: '9px', marginLeft: '4px' },
    advBtn: (color) => ({
      background: 'none', border: `1px solid ${color}44`,
      color, borderRadius: '4px', padding: '3px 9px',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: 800,
    }),
    closeBtn: {
      background: 'none', border: '1px solid #30363d',
      color: '#6e7681', borderRadius: '4px', padding: '3px 10px',
      cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
    },
    // Signal flow
    flowBar: {
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '5px 14px', borderBottom: '1px solid #1c2128',
      background: '#0a0e14', flexShrink: 0, overflowX: 'auto',
    },
    flowLabel: { color: '#2d333b', fontSize: '8px', fontWeight: 800, marginRight: '4px', flexShrink: 0 },
    flowNode: (active, color) => ({
      fontSize: '8px', padding: '2px 5px', borderRadius: '3px',
      fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'default',
      background: active ? `${color}22` : '#161b22',
      color: active ? color : '#2d333b',
      border: `1px solid ${active ? `${color}44` : '#1c2128'}`,
    }),
    flowArrow: { color: '#21262d', fontSize: '9px', flexShrink: 0 },
    // Tabs
    tabBar: {
      display: 'flex', borderBottom: '1px solid #1c2128',
      background: '#0a0e14', flexShrink: 0,
    },
    tab: (active, color) => ({
      flex: 1, padding: '8px 0', cursor: 'pointer',
      background: active ? '#0d1117' : 'none',
      border: 'none',
      borderBottom: `2px solid ${active ? color : 'transparent'}`,
      color: active ? color : '#484f58',
      fontFamily: 'inherit', fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em',
      transition: 'all 0.12s',
    }),
    // Scroll area
    scroll: { flex: 1, overflowY: 'auto', minHeight: 0 },
    // Category
    catPad: { padding: '8px 10px' },
    catLabel: {
      color: '#2d333b', fontSize: '9px', fontWeight: 800,
      letterSpacing: '0.15em', padding: '0 4px 4px',
      borderBottom: '1px solid #1c2128', marginBottom: '6px',
    },
    // Slot card
    slotCard: (enabled, color) => ({
      marginBottom: '4px',
      border: `1px solid ${enabled ? `${color}44` : '#1c2128'}`,
      borderRadius: '7px',
      background: enabled ? `${color}08` : '#0a0e14',
      overflow: 'hidden', transition: 'border-color 0.12s, background 0.12s',
    }),
    slotHeader: {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 10px', cursor: 'pointer',
    },
    bypassDot: (enabled, color) => ({
      width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
      background: enabled ? color : '#21262d',
      border: `1px solid ${enabled ? color : '#30363d'}`,
      cursor: 'pointer', padding: 0,
      boxShadow: enabled ? `0 0 8px ${color}88` : 'none',
      transition: 'all 0.12s',
    }),
    slotIcon: { fontSize: '13px' },
    slotLabel: (enabled) => ({
      color: enabled ? '#e6edf3' : '#484f58',
      fontWeight: enabled ? 700 : 400, flex: 1,
    }),
    bypassedTag: { color: '#2d333b', fontSize: '9px' },
    chevron: (open) => ({
      color: '#484f58', fontSize: '10px',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform 0.15s', userSelect: 'none',
    }),
    slotBody: {
      padding: '4px 10px 10px', borderTop: '1px solid #1c2128',
    },
    paramRow: {
      display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px',
    },
    paramLabel: { color: '#6e7681', fontSize: '9px', minWidth: '70px' },
    paramValue: (color) => ({
      color, fontSize: '9px',
      minWidth: '56px', textAlign: 'right', fontWeight: 700,
    }),
    selectEl: {
      background: '#161b22', border: '1px solid #30363d',
      color: '#cdd9e5', borderRadius: '4px',
      padding: '3px 6px', fontFamily: 'inherit', fontSize: '9px', flex: 1,
    },
    // Plugin section note
    pluginNote: {
      padding: '8px 14px 6px',
      color: '#3d444d', fontSize: '9px', lineHeight: 1.6,
      borderBottom: '1px solid #1c2128',
    },
  };

  return (
    <div style={S.root}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div style={S.header}>
        <div style={S.dot} />
        <span style={S.title}>FX CHAIN</span>
        <span style={S.subTitle}>— {trackName}</span>

        <span style={S.advLabel}>ADVANCED:</span>
        {[
          { label: 'MULTIBAND', fn: onOpenMultiband, color: '#4a9eff' },
          { label: 'STUTTER',   fn: onOpenStutter,   color: '#ff2d55' },
          { label: 'MASTERING', fn: onOpenMastering, color: '#ffd60a' },
        ].map(b => (
          <button
            key={b.label}
            onClick={b.fn}
            style={S.advBtn(b.color)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.background = `${b.color}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${b.color}44`; e.currentTarget.style.background = 'none'; }}
          >
            {b.label}
          </button>
        ))}

        {onClose && (
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        )}
      </div>

      {/* ══ SIGNAL FLOW STRIP ═══════════════════════════════════════════════ */}
      <div style={S.flowBar}>
        <span style={S.flowLabel}>SIGNAL FLOW</span>
        {FLOW_LABELS.map((label, i) => {
          const key = FLOW_KEYS[i];
          const slot = key ? NATIVE_SLOTS.find(s => s.key === key) : null;
          const active = key ? (effects[key]?.enabled ?? false) : false;
          const color = slot?.color ?? '#484f58';
          const isEdge = label === 'IN' || label === 'OUT';
          return (
            <React.Fragment key={i}>
              <span style={{
                ...S.flowNode(active, color),
                color: isEdge ? '#6e7681' : (active ? color : '#2d333b'),
                background: isEdge ? '#21262d' : (active ? `${color}22` : '#161b22'),
                border: `1px solid ${isEdge ? '#30363d' : (active ? `${color}44` : '#1c2128')}`,
              }}>
                {label}
              </span>
              {i < FLOW_LABELS.length - 1 && <span style={S.flowArrow}>›</span>}
            </React.Fragment>
          );
        })}
      </div>

      {/* ══ SECTION TABS ════════════════════════════════════════════════════ */}
      <div style={S.tabBar}>
        <button style={S.tab(activeTab === 'native', '#00ffc8')} onClick={() => setActiveTab('native')}>
          NATIVE EFFECTS{nativeActiveCount > 0 ? ` (${nativeActiveCount} ON)` : ''}
        </button>
        <button style={S.tab(activeTab === 'plugins', '#bf5af2')} onClick={() => setActiveTab('plugins')}>
          PLUGIN INSERTS
        </button>
      </div>

      {/* ══ SCROLL BODY ═════════════════════════════════════════════════════ */}
      <div style={S.scroll}>

        {/* ── TAB: NATIVE EFFECTS ─────────────────────────────────────────── */}
        {activeTab === 'native' && (
          <div style={S.catPad}>
            {CATEGORY_ORDER.map(cat => (
              <div key={cat} style={{ marginBottom: '14px' }}>

                {/* Category heading */}
                <div style={S.catLabel}>{CATEGORY_LABELS[cat]}</div>

                {grouped[cat].map(slot => {
                  const fx      = effects[slot.key] ?? {};
                  const enabled = fx.enabled ?? false;
                  const isOpen  = expanded[slot.key] ?? false;

                  return (
                    <div key={slot.key} style={S.slotCard(enabled, slot.color)}>

                      {/* Slot header row */}
                      <div style={S.slotHeader} onClick={() => toggleExpand(slot.key)}>
                        <button
                          style={S.bypassDot(enabled, slot.color)}
                          onClick={e => toggleEnabled(slot.key, e)}
                          title={enabled ? 'Bypass' : 'Enable'}
                        />
                        <span style={S.slotIcon}>{slot.icon}</span>
                        <span style={S.slotLabel(enabled)}>{slot.label}</span>
                        {!enabled && <span style={S.bypassedTag}>BYPASSED</span>}
                        <span style={S.chevron(isOpen)}>▾</span>
                      </div>

                      {/* Expanded body */}
                      {isOpen && (
                        <div style={S.slotBody}>

                          {/* EQ Graph (only for eq slot when enabled) */}
                          {slot.hasGraph && enabled && (
                            <div style={{ margin: '6px 0 10px' }}>
                              <ParametricEQGraph
                                eq={fx}
                                onChange={(param, value) => setParam(slot.key, param, value)}
                                width={320} height={120}
                                compact showLabels
                              />
                            </div>
                          )}

                          {/* Select (filter type etc.) */}
                          {slot.selectParam && (
                            <div style={S.paramRow}>
                              <label style={S.paramLabel}>{slot.selectParam.l}</label>
                              <select
                                value={fx[slot.selectParam.p] ?? slot.selectParam.options[0]}
                                onChange={e => setParam(slot.key, slot.selectParam.p, e.target.value)}
                                style={S.selectEl}
                              >
                                {slot.selectParam.options.map(o => (
                                  <option key={o} value={o}>{o}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Sliders */}
                          {slot.params.map(({ p, l, min, max, step, fmt }) => (
                            <div key={p} style={S.paramRow}>
                              <label style={S.paramLabel}>{l}</label>
                              <input
                                type="range" min={min} max={max} step={step}
                                value={fx[p] ?? min}
                                onChange={e => setParam(slot.key, p, parseFloat(e.target.value))}
                                style={{ flex: 1, accentColor: slot.color }}
                              />
                              <span style={S.paramValue(slot.color)}>
                                {fmt(fx[p] ?? min)}
                              </span>
                            </div>
                          ))}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: PLUGIN INSERTS ─────────────────────────────────────────── */}
        {activeTab === 'plugins' && (
          <div style={{ minHeight: '420px' }}>
            <div style={S.pluginNote}>
              VST-style insert chain: <strong style={{ color: '#6e7681' }}>Gain/Trim · 3-Band EQ · Compressor · Reverb · Delay · Limiter · De-Esser · Saturation</strong>
              &nbsp;— runs <em>after</em> the native effects above in signal flow.
            </div>
            <PluginRackPanel
              trackId={trackIndex}
              trackName={trackName}
              trackColor={trackColor}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default UnifiedFXChain;