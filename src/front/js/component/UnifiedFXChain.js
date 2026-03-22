// =============================================================================
// UnifiedFXChain.js — Complete FX popup for StreamPireX DAW
// =============================================================================
// Location: src/front/js/component/UnifiedFXChain.js
//
// Shows ALL effects for a track in one popup:
//   TAB 1 — Native Effects (EQ, Filter, Compressor, Gate, De-Esser, Limiter,
//            Distortion, BitCrusher, TapeSaturation, Exciter,
//            Chorus, Flanger, Phaser, Tremolo, Reverb, Delay,
//            Stereo Widener, Gain Utility)
//   TAB 2 — Plugin Inserts (PluginRackPanel)
//
// Triggered two ways:
//   • FX button on any track row → modal popup overlay (has ✕ close button)
//   • FX Chain tab (viewMode=plugins) → fills the main view area
// =============================================================================

import React, { useState, useCallback } from 'react';
import ParametricEQGraph from './ParametricEQGraph';
import PluginRackPanel from './audio/components/plugins/PluginRackPanel';
import '../../styles/UnifiedFXChain.css';

// ─────────────────────────────────────────────────────────────────────────────
// Category order & labels
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_ORDER = [
  'dynamics',
  'eq',
  'filter',
  'distortion',
  'modulation',
  'reverb',
  'delay',
  'utility',
];

const CATEGORY_LABELS = {
  dynamics:   'DYNAMICS',
  eq:         'EQUALIZER',
  filter:     'FILTER',
  distortion: 'DISTORTION',
  modulation: 'MODULATION',
  reverb:     'REVERB',
  delay:      'DELAY',
  utility:    'UTILITY',
};

// ─────────────────────────────────────────────────────────────────────────────
// Native effect slot definitions
// All effects that exist in DEFAULT_EFFECTS() in RecordingStudio are covered
// ─────────────────────────────────────────────────────────────────────────────
const NATIVE_SLOTS = [
  // ── DYNAMICS ──────────────────────────────────────────────────────────────
  {
    key: 'compressor',
    label: 'Compressor',
    icon: '⊡',
    color: '#ff6b6b',
    category: 'dynamics',
    params: [
      { p: 'threshold', l: 'Threshold', min: -60, max: 0,    step: 0.5, fmt: v => `${v}dB`            },
      { p: 'ratio',     l: 'Ratio',     min: 1,   max: 20,   step: 0.1, fmt: v => `${v.toFixed(1)}:1` },
      { p: 'attack',    l: 'Attack',    min: 0,   max: 200,  step: 1,   fmt: v => `${v}ms`             },
      { p: 'release',   l: 'Release',   min: 10,  max: 1000, step: 5,   fmt: v => `${v}ms`             },
      { p: 'makeupGain',l: 'Makeup',    min: 0,   max: 24,   step: 0.5, fmt: v => `+${v}dB`            },
    ],
  },
  {
    key: 'gate',
    label: 'Noise Gate',
    icon: '⊘',
    color: '#ff9f7f',
    category: 'dynamics',
    params: [
      { p: 'threshold', l: 'Threshold', min: -80, max: 0,   step: 1,   fmt: v => `${v}dB` },
      { p: 'attack',    l: 'Attack',    min: 0,   max: 200, step: 1,   fmt: v => `${v}ms`  },
      { p: 'release',   l: 'Release',   min: 10,  max: 500, step: 5,   fmt: v => `${v}ms`  },
    ],
  },
  {
    key: 'deesser',
    label: 'De-Esser',
    icon: '⊛',
    color: '#ff6b9d',
    category: 'dynamics',
    params: [
      { p: 'frequency', l: 'Frequency', min: 2000, max: 16000, step: 100, fmt: v => `${(v/1000).toFixed(1)}kHz` },
      { p: 'threshold', l: 'Threshold', min: -40,  max: 0,     step: 1,   fmt: v => `${v}dB`                    },
      { p: 'ratio',     l: 'Ratio',     min: 1,    max: 20,    step: 1,   fmt: v => `${v}:1`                    },
    ],
  },
  {
    key: 'limiter',
    label: 'Limiter',
    icon: '⊟',
    color: '#ff2d55',
    category: 'dynamics',
    params: [
      { p: 'threshold', l: 'Ceiling', min: -12, max: 0,   step: 0.1, fmt: v => `${v}dBTP` },
      { p: 'release',   l: 'Release', min: 1,   max: 500, step: 1,   fmt: v => `${v}ms`   },
    ],
  },
  // ── EQ ────────────────────────────────────────────────────────────────────
  {
    key: 'eq',
    label: 'Parametric EQ',
    icon: '〰',
    color: '#00ffc8',
    category: 'eq',
    hasGraph: true,
    params: [
      { p: 'lowShelf',  l: 'Low Shelf',  min: -12, max: 12,    step: 0.5, fmt: v => `${v > 0 ? '+' : ''}${v}dB`                          },
      { p: 'lowFreq',   l: 'Low Freq',   min: 40,  max: 500,   step: 5,   fmt: v => `${v}Hz`                                              },
      { p: 'midPeak',   l: 'Mid Peak',   min: -12, max: 12,    step: 0.5, fmt: v => `${v > 0 ? '+' : ''}${v}dB`                          },
      { p: 'midFreq',   l: 'Mid Freq',   min: 200, max: 8000,  step: 50,  fmt: v => v >= 1000 ? `${(v/1000).toFixed(1)}kHz` : `${v}Hz`   },
      { p: 'midQ',      l: 'Mid Q',      min: 0.3, max: 4,     step: 0.1, fmt: v => v.toFixed(1)                                          },
      { p: 'highShelf', l: 'High Shelf', min: -12, max: 12,    step: 0.5, fmt: v => `${v > 0 ? '+' : ''}${v}dB`                          },
      { p: 'highFreq',  l: 'High Freq',  min: 2000,max: 20000, step: 100, fmt: v => `${(v/1000).toFixed(0)}kHz`                           },
    ],
  },
  // ── FILTER ────────────────────────────────────────────────────────────────
  {
    key: 'filter',
    label: 'Filter',
    icon: '⌇',
    color: '#4a9eff',
    category: 'filter',
    selectParam: {
      l: 'Type',
      p: 'type',
      options: ['lowpass', 'highpass', 'bandpass', 'notch', 'allpass'],
    },
    params: [
      { p: 'frequency', l: 'Frequency', min: 20,  max: 20000, step: 10,  fmt: v => v >= 1000 ? `${(v/1000).toFixed(1)}kHz` : `${v}Hz` },
      { p: 'Q',         l: 'Resonance', min: 0.1, max: 20,    step: 0.1, fmt: v => v.toFixed(1)                                        },
      { p: 'gain',      l: 'Gain',      min: -12, max: 12,    step: 0.5, fmt: v => `${v > 0 ? '+' : ''}${v}dB`                        },
    ],
  },
  // ── DISTORTION ────────────────────────────────────────────────────────────
  {
    key: 'distortion',
    label: 'Distortion',
    icon: '⚡',
    color: '#ff9f0a',
    category: 'distortion',
    selectParam: {
      l: 'Type',
      p: 'type',
      options: ['soft', 'hard', 'fuzz', 'bit-crush', 'tape'],
    },
    params: [
      { p: 'drive',  l: 'Drive',  min: 0,   max: 100,  step: 1,   fmt: v => `${v}%`                                                 },
      { p: 'tone',   l: 'Tone',   min: 20,  max: 20000, step: 50, fmt: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}Hz`       },
      { p: 'mix',    l: 'Mix',    min: 0,   max: 100,  step: 1,   fmt: v => `${v}%`                                                 },
      { p: 'output', l: 'Output', min: -24, max: 0,    step: 0.5, fmt: v => `${v}dB`                                                },
    ],
  },
  {
    key: 'bitcrusher',
    label: 'Bit Crusher',
    icon: '▦',
    color: '#fbbf24',
    category: 'distortion',
    params: [
      { p: 'bits',             l: 'Bit Depth', min: 2,  max: 16, step: 1, fmt: v => `${Math.round(v)} bit` },
      { p: 'sampleRateReduce', l: 'SR Reduce', min: 1,  max: 32, step: 1, fmt: v => `÷${Math.round(v)}`   },
    ],
  },
  {
    key: 'tapeSaturation',
    label: 'Tape Saturation',
    icon: '◫',
    color: '#d97706',
    category: 'distortion',
    params: [
      { p: 'drive',  l: 'Drive',  min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v*100)}%` },
      { p: 'warmth', l: 'Warmth', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v*100)}%` },
    ],
  },
  {
    key: 'exciter',
    label: 'Harmonic Exciter',
    icon: '✦',
    color: '#f59e0b',
    category: 'distortion',
    params: [
      { p: 'amount',    l: 'Amount',    min: 0,    max: 100,  step: 1,   fmt: v => `${v}%`               },
      { p: 'frequency', l: 'Frequency', min: 1000, max: 16000,step: 100, fmt: v => `${(v/1000).toFixed(1)}kHz` },
      { p: 'mix',       l: 'Mix',       min: 0,    max: 1,    step: 0.01,fmt: v => `${Math.round(v*100)}%`    },
    ],
  },
  // ── MODULATION ────────────────────────────────────────────────────────────
  {
    key: 'chorus',
    label: 'Chorus',
    icon: '◎',
    color: '#bf5af2',
    category: 'modulation',
    params: [
      { p: 'rate',  l: 'Rate',  min: 0.1, max: 10,  step: 0.1, fmt: v => `${v.toFixed(1)}Hz` },
      { p: 'depth', l: 'Depth', min: 0,   max: 100, step: 1,   fmt: v => `${v}%`             },
      { p: 'delay', l: 'Delay', min: 1,   max: 50,  step: 0.5, fmt: v => `${v}ms`            },
      { p: 'mix',   l: 'Mix',   min: 0,   max: 100, step: 1,   fmt: v => `${v}%`             },
    ],
  },
  {
    key: 'flanger',
    label: 'Flanger',
    icon: '≋',
    color: '#5e5ce6',
    category: 'modulation',
    params: [
      { p: 'rate',     l: 'Rate',     min: 0.01, max: 10,  step: 0.01, fmt: v => `${v.toFixed(2)}Hz` },
      { p: 'depth',    l: 'Depth',    min: 0,    max: 100, step: 1,    fmt: v => `${v}%`             },
      { p: 'feedback', l: 'Feedback', min: -99,  max: 99,  step: 1,    fmt: v => `${v}%`             },
      { p: 'mix',      l: 'Mix',      min: 0,    max: 100, step: 1,    fmt: v => `${v}%`             },
    ],
  },
  {
    key: 'phaser',
    label: 'Phaser',
    icon: '∿',
    color: '#30d158',
    category: 'modulation',
    params: [
      { p: 'rate',     l: 'Rate',     min: 0.01, max: 10,  step: 0.01, fmt: v => `${v.toFixed(2)}Hz` },
      { p: 'depth',    l: 'Depth',    min: 0,    max: 100, step: 1,    fmt: v => `${v}%`             },
      { p: 'stages',   l: 'Stages',   min: 2,    max: 12,  step: 2,    fmt: v => `${v}`              },
      { p: 'feedback', l: 'Feedback', min: 0,    max: 99,  step: 1,    fmt: v => `${v}%`             },
      { p: 'mix',      l: 'Mix',      min: 0,    max: 100, step: 1,    fmt: v => `${v}%`             },
    ],
  },
  {
    key: 'tremolo',
    label: 'Tremolo',
    icon: '~',
    color: '#34d399',
    category: 'modulation',
    params: [
      { p: 'rate',  l: 'Rate',  min: 0.1, max: 30,  step: 0.1, fmt: v => `${v.toFixed(1)}Hz` },
      { p: 'depth', l: 'Depth', min: 0,   max: 1,   step: 0.01,fmt: v => `${Math.round(v*100)}%` },
    ],
  },
  {
    key: 'stereoWidener',
    label: 'Stereo Widener',
    icon: '⟺',
    color: '#a3e635',
    category: 'modulation',
    params: [
      { p: 'width', l: 'Width', min: 0, max: 1, step: 0.01, fmt: v => `${Math.round(v*100)}%` },
    ],
  },
  // ── REVERB ────────────────────────────────────────────────────────────────
  {
    key: 'reverb',
    label: 'Reverb',
    icon: '❋',
    color: '#64d2ff',
    category: 'reverb',
    selectParam: {
      l: 'Type',
      p: 'type',
      options: ['hall', 'room', 'plate', 'spring', 'shimmer'],
    },
    params: [
      { p: 'size',     l: 'Size',      min: 0,   max: 100, step: 1,   fmt: v => `${v}%`  },
      { p: 'decay',    l: 'Decay',     min: 0.1, max: 20,  step: 0.1, fmt: v => `${v}s`  },
      { p: 'predelay', l: 'Pre-Delay', min: 0,   max: 200, step: 1,   fmt: v => `${v}ms` },
      { p: 'damping',  l: 'Damping',   min: 0,   max: 100, step: 1,   fmt: v => `${v}%`  },
      { p: 'mix',      l: 'Mix',       min: 0,   max: 100, step: 1,   fmt: v => `${v}%`  },
    ],
  },
  // ── DELAY ─────────────────────────────────────────────────────────────────
  {
    key: 'delay',
    label: 'Delay',
    icon: '⟳',
    color: '#ffd60a',
    category: 'delay',
    selectParam: {
      l: 'Sync',
      p: 'sync',
      options: ['free', '1/4', '1/8', '1/16', '1/2', '3/16', 'dotted-1/4'],
    },
    params: [
      { p: 'time',     l: 'Time',     min: 1,   max: 2000, step: 1,   fmt: v => `${v}ms`                                          },
      { p: 'feedback', l: 'Feedback', min: 0,   max: 99,   step: 1,   fmt: v => `${v}%`                                           },
      { p: 'highCut',  l: 'Hi Cut',   min: 500, max: 20000,step: 100, fmt: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}Hz` },
      { p: 'mix',      l: 'Mix',      min: 0,   max: 100,  step: 1,   fmt: v => `${v}%`                                           },
    ],
  },
  // ── UTILITY ───────────────────────────────────────────────────────────────
  {
    key: 'gainUtility',
    label: 'Gain / Trim',
    icon: '◈',
    color: '#636366',
    category: 'utility',
    params: [
      { p: 'gain',        l: 'Gain',         min: -24, max: 24, step: 0.5, fmt: v => `${v > 0 ? '+' : ''}${v}dB` },
      { p: 'phaseInvert', l: 'Phase Invert',  min: 0,   max: 1,  step: 1,   fmt: v => v ? 'ON' : 'OFF'            },
      { p: 'monoSum',     l: 'Mono Sum',      min: 0,   max: 1,  step: 1,   fmt: v => v ? 'ON' : 'OFF'            },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Signal flow strip — updated to show all key stages
// ─────────────────────────────────────────────────────────────────────────────
const FLOW_LABELS = ['IN', 'Gate', 'EQ', 'Filter', 'Comp', 'Dist', 'Mod', 'Reverb', 'Delay', 'Limit', 'OUT'];
const FLOW_KEYS   = [null, 'gate', 'eq', 'filter', 'compressor', 'distortion', 'chorus', 'reverb', 'delay', 'limiter', null];

// ─────────────────────────────────────────────────────────────────────────────
// Knob — exact original logic, className for SVG cursor only
// ─────────────────────────────────────────────────────────────────────────────
const Knob = ({ min, max, step, value, onChange, color = '#00ffc8', size = 60 }) => {
  const dragging   = React.useRef(false);
  const startY     = React.useRef(0);
  const startVal   = React.useRef(value);
  const r          = size / 2;
  const cx         = r, cy = r;
  const norm       = (v) => (v - min) / (max - min);
  const angle      = -135 + norm(value) * 270;
  const toRad      = (deg) => (deg * Math.PI) / 180;
  const arcR       = r - 5;
  const pointerR   = r - 7;
  const px         = cx + Math.sin(toRad(angle)) * pointerR;
  const py         = cy - Math.cos(toRad(angle)) * pointerR;
  const startAngle = -135;
  const arcStart   = {
    x: cx + Math.sin(toRad(startAngle)) * arcR,
    y: cy - Math.cos(toRad(startAngle)) * arcR,
  };
  const arcEnd = {
    x: cx + Math.sin(toRad(angle)) * arcR,
    y: cy - Math.cos(toRad(angle)) * arcR,
  };
  const largeArc = (angle - startAngle) > 180 ? 1 : 0;

  const handleMouseDown = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current   = e.clientY;
    startVal.current = value;
    const onMove = (e2) => {
      if (!dragging.current) return;
      const dy     = startY.current - e2.clientY;
      const newVal = Math.min(max, Math.max(min, startVal.current + dy * (max - min) / 150));
      onChange(parseFloat((Math.round(newVal / step) * step).toFixed(4)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [value, min, max, step, onChange]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onMouseDown={handleMouseDown}
      className="ufx-knob-svg"
    >
      <circle
        cx={cx} cy={cy} r={arcR}
        fill="none"
        stroke="#1a2838"
        strokeWidth={3}
        strokeDasharray={`${arcR * Math.PI * 1.5} ${arcR * Math.PI * 0.5}`}
        transform={`rotate(-225 ${cx} ${cy})`}
      />
      {norm(value) > 0.001 && (
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
      <circle cx={cx} cy={cy} r={3} fill="#0d1117" stroke="#2a3848" strokeWidth={1} />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke={`${color}22`} strokeWidth={1} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UnifiedFXChain — exact original structure, CSS classes replacing inline styles
// ─────────────────────────────────────────────────────────────────────────────
const UnifiedFXChain = ({
  track,
  trackIndex,
  audioContext,
  onEffectChange,
  updateEffect,       // alias used by RecordingStudio
  onClose,
  onOpenMastering,
  onOpenStutter,
  onOpenMultiband,
  isEmbedded,
}) => {
  const [activeTab, setActiveTab] = useState('native');
  const [expanded,  setExpanded]  = useState({ eq: true });

  const effects    = track?.effects ?? {};
  const trackColor = track?.color   ?? '#00ffc8';
  const trackName  = track?.name    ?? `Track ${(trackIndex ?? 0) + 1}`;

  const toggleExpand = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // support both prop names
  const setParam = useCallback((fxKey, param, value) => {
    if (updateEffect)    updateEffect(trackIndex, fxKey, param, value);
    else if (onEffectChange) onEffectChange(trackIndex, fxKey, param, value);
  }, [updateEffect, onEffectChange, trackIndex]);

  const toggleEnabled = useCallback((fxKey, e) => {
    e.stopPropagation();
    setParam(fxKey, 'enabled', !(effects[fxKey]?.enabled ?? false));
  }, [setParam, effects]);

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = NATIVE_SLOTS.filter((s) => s.category === cat);
    return acc;
  }, {});

  const nativeActiveCount = NATIVE_SLOTS.filter((s) => effects[s.key]?.enabled).length;

  // ── A/B Compare ─────────────────────────────────────────────────────────
  const [compareMode, setCompareMode] = useState(false);
  const snapshotARef = React.useRef(null);

  const storeA = () => {
    snapshotARef.current = JSON.parse(JSON.stringify(effects));
    setCompareMode(false);
  };

  const toggleAB = () => {
    if (!snapshotARef.current) { storeA(); return; }
    if (!compareMode) {
      // Apply A
      const snap = snapshotARef.current;
      Object.keys(snap).forEach(fxKey => {
        Object.keys(snap[fxKey]).forEach(param => {
          setParam(fxKey, param, snap[fxKey][param]);
        });
      });
      setCompareMode(true);
    } else {
      setCompareMode(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────


  const ADV_BUTTONS = [
    { label: 'MULTIBAND', fn: onOpenMultiband, cls: 'ufx-adv-btn--multiband' },
    { label: 'STUTTER',   fn: onOpenStutter,   cls: 'ufx-adv-btn--stutter'   },
    { label: 'MASTERING', fn: onOpenMastering, cls: 'ufx-adv-btn--mastering' },
  ];

  return (
    <div className="ufx-root">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="ufx-header">
        <div className="ufx-track-dot" style={{ background: trackColor, boxShadow: `0 0 8px ${trackColor}` }} />
        <span className="ufx-header-title">FX CHAIN</span>
        <span className="ufx-header-subtitle">— {trackName}</span>
        <span className="ufx-adv-label">ADVANCED:</span>
        {ADV_BUTTONS.map((b) => b.fn && (
          <button key={b.label} onClick={b.fn} className={`ufx-adv-btn ${b.cls}`}>
            {b.label}
          </button>
        ))}
        {onClose && (
          <button onClick={onClose} className="ufx-close-btn">✕</button>
        )}
      </div>

      {/* ══ SIGNAL FLOW STRIP ═══════════════════════════════════════════════ */}
      <div className="ufx-flow-bar">
        <span className="ufx-flow-label">SIGNAL FLOW</span>
        {FLOW_LABELS.map((label, i) => {
          const key    = FLOW_KEYS[i];
          const slot   = key ? NATIVE_SLOTS.find((s) => s.key === key) : null;
          const active = key ? (effects[key]?.enabled ?? false) : false;
          const isEdge = label === 'IN' || label === 'OUT';
          return (
            <React.Fragment key={i}>
              <span
                className={`ufx-flow-node ${isEdge ? 'ufx-flow-node--edge' : ''} ${active ? 'ufx-flow-node--active' : ''}`}
                style={active && slot ? { '--node-color': slot.color } : {}}
              >
                {active && !isEdge && <span className="ufx-flow-node-dot" />}
                {label}
              </span>
              {i < FLOW_LABELS.length - 1 && (
                <span className="ufx-flow-arrow">›</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ══ SECTION TABS ════════════════════════════════════════════════════ */}
      <div className="ufx-tab-bar">
        <button
          className={`ufx-tab ${activeTab === 'native' ? 'ufx-tab--active ufx-tab--native' : ''}`}
          onClick={() => setActiveTab('native')}
        >
          NATIVE EFFECTS{nativeActiveCount > 0 ? ` (${nativeActiveCount} ON)` : ''}
        </button>
        <button
          className={`ufx-tab ${activeTab === 'plugins' ? 'ufx-tab--active ufx-tab--plugins' : ''}`}
          onClick={() => setActiveTab('plugins')}
        >
          PLUGIN INSERTS
        </button>
      </div>

      {/* ══ SCROLL BODY ═════════════════════════════════════════════════════ */}
      <div className="ufx-scroll">

        {/* ── TAB: NATIVE EFFECTS ─────────────────────────────────────────── */}
        {activeTab === 'native' && (
          <div className="ufx-cat-pad">
            {CATEGORY_ORDER.map((cat) => {
              const slots = grouped[cat];
              if (!slots || slots.length === 0) return null;
              return (
                <div key={cat} className="ufx-category">
                  <div className="ufx-cat-label">{CATEGORY_LABELS[cat]}</div>

                  {slots.map((slot) => {
                    const fx      = effects[slot.key] ?? {};
                    const enabled = fx.enabled ?? false;
                    const isOpen  = expanded[slot.key] ?? false;

                    return (
                      <div
                        key={slot.key}
                        className={`ufx-slot-card ${enabled ? 'ufx-slot-card--enabled' : ''}`}
                        style={{ '--slot-color': slot.color }}
                      >
                        {/* ── Slot header ── */}
                        <div className="ufx-slot-header" onClick={() => toggleExpand(slot.key)}>
                          <button
                            className={`ufx-bypass-dot ${enabled ? 'ufx-bypass-dot--on' : ''}`}
                            style={{ '--slot-color': slot.color }}
                            onClick={(e) => toggleEnabled(slot.key, e)}
                            title={enabled ? 'Click to bypass' : 'Click to enable'}
                          />
                          <span className="ufx-slot-icon">{slot.icon}</span>
                          <span className={`ufx-slot-label ${enabled ? 'ufx-slot-label--on' : ''}`}>
                            {slot.label}
                          </span>
                          {!enabled && <span className="ufx-bypassed-tag">BYPASSED</span>}
                          <span className={`ufx-chevron ${isOpen ? 'ufx-chevron--open' : ''}`}>▾</span>
                        </div>

                        {/* ── Slot body ── */}
                        {isOpen && (
                          <div className="ufx-slot-body">

                            {/* EQ Graph */}
                            {slot.hasGraph && enabled && (
                              <div className="ufx-eq-graph-wrap">
                                <ParametricEQGraph
                                  eq={fx}
                                  onChange={(param, value) => setParam(slot.key, param, value)}
                                  width={320}
                                  height={120}
                                  compact
                                  showLabels
                                />
                              </div>
                            )}

                            {/* Select param */}
                            {slot.selectParam && (
                              <div className="ufx-param-row">
                                <label className="ufx-param-label">{slot.selectParam.l}</label>
                                <select
                                  className="ufx-select"
                                  value={fx[slot.selectParam.p] ?? slot.selectParam.options[0]}
                                  onChange={(e) => setParam(slot.key, slot.selectParam.p, e.target.value)}
                                >
                                  {slot.selectParam.options.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Knobs */}
                            <div className="ufx-knobs-row">
                              {slot.params.map(({ p, l, min, max, step, fmt }) => (
                                <div key={p} className="ufx-knob-cell">
                                  <Knob
                                    min={min}
                                    max={max}
                                    step={step}
                                    value={fx[p] ?? min}
                                    color={slot.color}
                                    onChange={(v) => setParam(slot.key, p, v)}
                                    size={60}
                                  />
                                  <span className="ufx-knob-value" style={{ color: slot.color }}>
                                    {fmt(fx[p] ?? min)}
                                  </span>
                                  <span className="ufx-knob-label">{l}</span>
                                </div>
                              ))}
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: PLUGIN INSERTS ─────────────────────────────────────────── */}
        {activeTab === 'plugins' && (
          <div className="ufx-plugins-tab">
            <p className="ufx-plugin-note">
              VST-style insert chain:{' '}
              <strong>Gain/Trim · 3-Band EQ · Compressor · Reverb · Delay · Limiter · De-Esser · Saturation</strong>
              {' '}— runs <em>after</em> native effects in signal flow.
            </p>
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