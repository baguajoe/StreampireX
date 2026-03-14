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
const Knob = ({ min, max, step, value, onChange, color = '#00ffc8', size = 44 }) => {
  const dragging = React.useRef(false);
  const startY = React.useRef(0);
  const startVal = React.useRef(value);
  const r = size / 2;
  const cx = r, cy = r;
  const norm = (v) => (v - min) / (max - min);
  const angle = -135 + norm(value) * 270;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcR = r - 5;
  const pointerR = r - 7;
  const px = cx + Math.sin(toRad(angle)) * pointerR;
  const py = cy - Math.cos(toRad(angle)) * pointerR;
  const startAngle = -135;
  const arcStart = { x: cx + Math.sin(toRad(startAngle)) * arcR, y: cy - Math.cos(toRad(startAngle)) * arcR };
  const arcEnd = { x: cx + Math.sin(toRad(angle)) * arcR, y: cy - Math.cos(toRad(angle)) * arcR };
  const largeArc = (angle - startAngle) > 180 ? 1 : 0;
  const handleMouseDown = React.useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragging.current = true; startY.current = e.clientY; startVal.current = value;
    const onMove = (e2) => {
      if (!dragging.current) return;
      const dy = startY.current - e2.clientY;
      const newVal = Math.min(max, Math.max(min, startVal.current + dy * (max - min) / 150));
      onChange(parseFloat((Math.round(newVal / step) * step).toFixed(4)));
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [value, min, max, step, onChange]);
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}
      onMouseDown={handleMouseDown} style={{ cursor:'ns-resize', userSelect:'none', display:'block' }}>
      <circle cx={cx} cy={cy} r={arcR} fill="none" stroke="#1a2838" strokeWidth={3}
        strokeDasharray={arcR * Math.PI * 1.5 + " " + arcR * Math.PI * 0.5}
        transform={"rotate(-225 " + cx + " " + cy + ")"} />
      {norm(value) > 0.001 && (
        <path d={"M " + arcStart.x + " " + arcStart.y + " A " + arcR + " " + arcR + " 0 " + largeArc + " 1 " + arcEnd.x + " " + arcEnd.y}
          fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      )}
      <circle cx={cx} cy={cy} r={3} fill="#0d1117" stroke="#2a3848" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke={color + "22"} strokeWidth={1} />
    </svg>
  );
};

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

                          {/* Knobs */}
                          <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', padding:'8px 4px', alignItems:'flex-end' }}>
                          {slot.params.map(({ p, l, min, max, step, fmt }) => (
                            <div key={p} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                              <Knob min={min} max={max} step={step} value={fx[p] ?? min} color={slot.color}
                                onChange={v => setParam(slot.key, p, v)} size={36} />
                              <span style={{ color: slot.color, fontSize:'8px', fontWeight:700 }}>{fmt(fx[p] ?? min)}</span>
                              <span style={{ color:'#6e7681', fontSize:'7px' }}>{l}</span>
                            </div>
                          ))}
                          </div>

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