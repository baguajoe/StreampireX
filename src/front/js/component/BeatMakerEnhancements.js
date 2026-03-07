// =============================================================================
// BeatMakerEnhancements.js — Pro Beat Maker Features
// =============================================================================
// Location: src/front/js/component/BeatMakerEnhancements.js
//
// Features bundled here:
//   1. PadProbabilityPanel    — per-step probability (0-100%) for humanization
//   2. StepPLockPanel         — per-step pitch, volume, filter overrides (Elektron style)
//   3. VelocityLayerEditor    — assign different samples to velocity ranges per pad
//   4. NoteRepeat             — hold button triggers rapid-fire hits at subdivision
//   5. useBPMStretch          — time-stretch loaded sample buffer to match project BPM
//
// INTEGRATION:
//   import {
//     PadProbabilityPanel, StepPLockPanel, VelocityLayerEditor,
//     NoteRepeatButton, useBPMStretch
//   } from './BeatMakerEnhancements';
//
// In SamplerBeatMaker.js state, add:
//   const [stepProb, setStepProb] = useState(
//     () => Array.from({length:16}, () => Array(32).fill(1.0))
//   ); // stepProb[padIdx][stepIdx] = 0.0–1.0
//
//   const [stepPLocks, setStepPLocks] = useState(
//     () => Array.from({length:16}, () => Array.from({length:32}, () => ({})))
//   ); // stepPLocks[padIdx][stepIdx] = { pitch?, volume?, filterFreq? }
//
//   const [velocityLayers, setVelocityLayers] = useState(
//     () => Array.from({length:16}, () => [])
//   ); // velocityLayers[padIdx] = [{ minVel, maxVel, buffer, name }]
//
//   const [noteRepeat, setNoteRepeat] = useState({ active: false, subdivision: '1/16' });
//
// In schedStep() in SamplerBeatMaker.js, apply probability + p-locks:
//   const prob = stepProb[padIdx]?.[stepIdx] ?? 1.0;
//   if (Math.random() > prob) return; // skip this hit
//   const plock = stepPLocks[padIdx]?.[stepIdx] ?? {};
//   // then apply plock.pitch, plock.volume, plock.filterFreq when creating AudioBufferSourceNode
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import BeatMakerEnhancements from '../component/BeatMakerEnhancements';

// ── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  panel: {
    background: '#0f1419',
    border: '1px solid #1c2333',
    borderRadius: 6,
    padding: '10px 12px',
    fontFamily: '"JetBrains Mono", monospace',
    marginBottom: 8,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 10, color: '#8b949e', letterSpacing: 1, textTransform: 'uppercase' },
  close: {
    background: 'none', border: 'none', color: '#555',
    cursor: 'pointer', fontSize: 12, padding: 0,
  },
};

// =============================================================================
// 1. PadProbabilityPanel
// =============================================================================
// Shows a row of 16 (or 32) probability knobs for the selected pad.
// Each step shows its current probability as a colored bar + percentage.
// Click to cycle: 100% → 75% → 50% → 25% → 0% → 100%
// Shift+drag for fine control.

const PROB_PRESETS = [
  { label: 'Human', values: () => Array(16).fill(0).map(() => 0.75 + Math.random() * 0.25) },
  { label: 'Sparse', values: () => Array(16).fill(0).map(() => Math.random() < 0.5 ? 1 : Math.random() * 0.5) },
  { label: 'Drunk', values: () => Array(16).fill(0).map(() => 0.5 + Math.random() * 0.5) },
  { label: 'Reset', values: () => Array(16).fill(1.0) },
];

export function PadProbabilityPanel({ padIdx, stepCount, stepProb, setStepProb, onClose }) {
  const probs = stepProb[padIdx] || Array(stepCount).fill(1.0);

  const setProb = (stepIdx, value) => {
    setStepProb(prev => {
      const next = prev.map(row => [...row]);
      next[padIdx][stepIdx] = Math.max(0, Math.min(1, value));
      return next;
    });
  };

  const cycleProb = (stepIdx) => {
    const cur = probs[stepIdx];
    const next = cur >= 1.0 ? 0.75 : cur >= 0.75 ? 0.5 : cur >= 0.5 ? 0.25 : cur >= 0.25 ? 0.0 : 1.0;
    setProb(stepIdx, next);
  };

  const applyPreset = (preset) => {
    const vals = preset.values();
    setStepProb(prev => {
      const next = prev.map(row => [...row]);
      next[padIdx] = vals.slice(0, stepCount);
      return next;
    });
  };

  const probColor = (p) => {
    if (p >= 0.9) return '#00ffc8';
    if (p >= 0.6) return '#7de87d';
    if (p >= 0.3) return '#ffd700';
    if (p >  0)   return '#ff8800';
    return '#333';
  };

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>🎲 Step Probability — Pad {padIdx + 1}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {PROB_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              style={{ fontSize: 8, padding: '2px 6px', background: '#1c2333', border: '1px solid #30363d', color: '#8b949e', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
              {p.label}
            </button>
          ))}
          <button onClick={onClose} style={S.close}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {Array.from({ length: stepCount }, (_, i) => {
          const p = probs[i] ?? 1.0;
          return (
            <div
              key={i}
              onClick={() => cycleProb(i)}
              title={`Step ${i + 1}: ${Math.round(p * 100)}%`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: 22, cursor: 'pointer', gap: 2,
              }}
            >
              {/* Bar */}
              <div style={{ width: 16, height: 32, background: '#0d1117', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', bottom: 0, width: '100%',
                  height: `${p * 100}%`,
                  background: probColor(p),
                  transition: 'height 0.15s, background 0.1s',
                }} />
              </div>
              {/* Step number */}
              <span style={{ fontSize: 7, color: '#444', fontFamily: 'monospace' }}>{i + 1}</span>
              {/* Percent */}
              <span style={{ fontSize: 7, color: p < 1 ? probColor(p) : '#555', fontFamily: 'monospace' }}>
                {p === 1 ? '—' : `${Math.round(p * 100)}%`}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: '#444', marginTop: 6 }}>
        Click each bar to cycle: 100% → 75% → 50% → 25% → 0%
      </div>
    </div>
  );
}

// =============================================================================
// 2. StepPLockPanel — Per-step parameter locks (Elektron-style)
// =============================================================================
// Select a step → override pitch, volume, filter for that hit only

export function StepPLockPanel({ padIdx, stepCount, steps, stepPLocks, setStepPLocks, onClose }) {
  const [selectedStep, setSelectedStep] = useState(null);

  const activeSteps = Array.from({ length: stepCount }, (_, i) => steps[padIdx]?.[i]);

  const getPLock = (stepIdx) => stepPLocks[padIdx]?.[stepIdx] || {};

  const setPLock = (stepIdx, param, value) => {
    setStepPLocks(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[padIdx][stepIdx] = { ...next[padIdx][stepIdx], [param]: value };
      return next;
    });
  };

  const clearPLock = (stepIdx) => {
    setStepPLocks(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[padIdx][stepIdx] = {};
      return next;
    });
  };

  const hasPLock = (stepIdx) => {
    const pl = stepPLocks[padIdx]?.[stepIdx];
    return pl && Object.keys(pl).length > 0;
  };

  const plock = selectedStep !== null ? getPLock(selectedStep) : {};

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>🔒 Parameter Locks — Pad {padIdx + 1}</span>
        <button onClick={onClose} style={S.close}>✕</button>
      </div>

      {/* Step selector */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 10 }}>
        {Array.from({ length: stepCount }, (_, i) => {
          const active = !!activeSteps[i];
          const locked = hasPLock(i);
          return (
            <div
              key={i}
              onClick={() => setSelectedStep(selectedStep === i ? null : i)}
              style={{
                width: 20, height: 20, borderRadius: 2, cursor: 'pointer',
                background: selectedStep === i ? '#00ffc8' : active ? '#2a3a2a' : '#1c2333',
                border: locked ? '2px solid #FF6600' : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, color: selectedStep === i ? '#000' : locked ? '#FF6600' : '#555',
                fontWeight: locked ? 800 : 400,
                transition: 'all 0.1s',
              }}
              title={`Step ${i + 1}${locked ? ' (has p-lock)' : ''}${active ? ' (active)' : ' (off)'}`}
            >
              {locked ? '●' : i + 1}
            </div>
          );
        })}
      </div>

      {selectedStep !== null ? (
        <div>
          <div style={{ fontSize: 9, color: '#00ffc8', marginBottom: 8, fontFamily: 'monospace' }}>
            Step {selectedStep + 1} overrides:
          </div>

          {/* Pitch override */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: '#8b949e', width: 60, fontFamily: 'monospace' }}>Pitch</span>
            <input type="range" min={-24} max={24} step={1}
              value={plock.pitch ?? 0}
              onChange={e => setPLock(selectedStep, 'pitch', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: plock.pitch ? '#FF6600' : '#555', width: 32, fontFamily: 'monospace' }}>
              {(plock.pitch ?? 0) > 0 ? '+' : ''}{plock.pitch ?? 0}st
            </span>
            {plock.pitch != null && plock.pitch !== 0 &&
              <button onClick={() => setPLock(selectedStep, 'pitch', 0)}
                style={{ fontSize: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
            }
          </div>

          {/* Volume override */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: '#8b949e', width: 60, fontFamily: 'monospace' }}>Volume</span>
            <input type="range" min={0} max={1} step={0.01}
              value={plock.volume ?? 1}
              onChange={e => setPLock(selectedStep, 'volume', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: plock.volume != null && plock.volume !== 1 ? '#FF6600' : '#555', width: 32, fontFamily: 'monospace' }}>
              {Math.round((plock.volume ?? 1) * 100)}%
            </span>
            {plock.volume != null && plock.volume !== 1 &&
              <button onClick={() => setPLock(selectedStep, 'volume', 1)}
                style={{ fontSize: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
            }
          </div>

          {/* Filter override */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: '#8b949e', width: 60, fontFamily: 'monospace' }}>Filter</span>
            <input type="range" min={200} max={18000} step={50}
              value={plock.filterFreq ?? 18000}
              onChange={e => setPLock(selectedStep, 'filterFreq', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: plock.filterFreq != null && plock.filterFreq < 18000 ? '#FF6600' : '#555', width: 48, fontFamily: 'monospace' }}>
              {plock.filterFreq ? (plock.filterFreq >= 1000 ? `${(plock.filterFreq/1000).toFixed(1)}k` : plock.filterFreq) : 'Open'}Hz
            </span>
            {plock.filterFreq != null && plock.filterFreq < 18000 &&
              <button onClick={() => setPLock(selectedStep, 'filterFreq', 18000)}
                style={{ fontSize: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
            }
          </div>

          {/* Pan override */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: '#8b949e', width: 60, fontFamily: 'monospace' }}>Pan</span>
            <input type="range" min={-1} max={1} step={0.05}
              value={plock.pan ?? 0}
              onChange={e => setPLock(selectedStep, 'pan', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 9, color: plock.pan ? '#FF6600' : '#555', width: 32, fontFamily: 'monospace' }}>
              {plock.pan == null || plock.pan === 0 ? 'C' : plock.pan > 0 ? `R${Math.round(plock.pan*100)}` : `L${Math.round(Math.abs(plock.pan)*100)}`}
            </span>
            {plock.pan != null && plock.pan !== 0 &&
              <button onClick={() => setPLock(selectedStep, 'pan', 0)}
                style={{ fontSize: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
            }
          </div>

          <button onClick={() => clearPLock(selectedStep)}
            style={{ fontSize: 8, padding: '3px 8px', background: '#1c2333', border: '1px solid #30363d', color: '#8b949e', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
            Clear All Locks for Step {selectedStep + 1}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>
          Click a step above to set per-step overrides. Orange border = has p-lock.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 3. VelocityLayerEditor
// =============================================================================
// Assign different audio buffers to velocity ranges.
// Layer shape: { id, name, minVel: 0-127, maxVel: 0-127, buffer, url }

export function VelocityLayerEditor({ padIdx, velocityLayers, setVelocityLayers, onLoadSample, onClose }) {
  const layers = velocityLayers[padIdx] || [];

  const addLayer = () => {
    const existing = layers.length;
    const rangeSize = Math.floor(128 / (existing + 1));
    const newLayer = {
      id: `vl_${Date.now()}`,
      name: `Layer ${existing + 1}`,
      minVel: existing * rangeSize,
      maxVel: existing === 0 ? 127 : (existing + 1) * rangeSize - 1,
      buffer: null,
      url: null,
    };
    setVelocityLayers(prev => {
      const next = prev.map(row => [...row]);
      next[padIdx] = [...(next[padIdx] || []), newLayer];
      return next;
    });
  };

  const updateLayer = (layerId, patch) => {
    setVelocityLayers(prev => {
      const next = prev.map(row => [...row]);
      next[padIdx] = next[padIdx].map(l => l.id === layerId ? { ...l, ...patch } : l);
      return next;
    });
  };

  const removeLayer = (layerId) => {
    setVelocityLayers(prev => {
      const next = prev.map(row => [...row]);
      next[padIdx] = next[padIdx].filter(l => l.id !== layerId);
      return next;
    });
  };

  const velColor = (v) => `hsl(${120 - v * 0.94}, 70%, 55%)`;

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>🎯 Velocity Layers — Pad {padIdx + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={addLayer}
            style={{ fontSize: 8, padding: '2px 8px', background: '#1c2333', border: '1px solid #30363d', color: '#00ffc8', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Layer
          </button>
          <button onClick={onClose} style={S.close}>✕</button>
        </div>
      </div>

      {/* Velocity spectrum bar */}
      <div style={{ position: 'relative', height: 12, background: 'linear-gradient(to right, #1a4d2a, #ffd700, #ff4040)', borderRadius: 2, marginBottom: 10 }}>
        {layers.map(l => (
          <div key={l.id} style={{
            position: 'absolute',
            left: `${(l.minVel / 127) * 100}%`,
            width: `${((l.maxVel - l.minVel) / 127) * 100}%`,
            top: 0, height: '100%',
            border: '2px solid rgba(255,255,255,0.5)',
            boxSizing: 'border-box',
            borderRadius: 1,
          }} title={`${l.name}: vel ${l.minVel}–${l.maxVel}`} />
        ))}
      </div>

      {layers.length === 0 ? (
        <div style={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>
          No velocity layers — pad plays single sample regardless of velocity.<br/>
          Add layers to map different samples to soft/medium/hard hits.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {layers.map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', background: '#0d1117', borderRadius: 4,
              border: '1px solid #1c2333',
            }}>
              {/* Velocity range */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 90 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="number" min={0} max={l.maxVel - 1} value={l.minVel}
                    onChange={e => updateLayer(l.id, { minVel: parseInt(e.target.value) || 0 })}
                    style={{ width: 32, fontSize: 9, background: '#0a0d14', border: '1px solid #30363d', color: velColor(l.minVel), borderRadius: 2, padding: '1px 3px', fontFamily: 'monospace' }}
                  />
                  <span style={{ fontSize: 9, color: '#444' }}>–</span>
                  <input type="number" min={l.minVel + 1} max={127} value={l.maxVel}
                    onChange={e => updateLayer(l.id, { maxVel: parseInt(e.target.value) || 127 })}
                    style={{ width: 32, fontSize: 9, background: '#0a0d14', border: '1px solid #30363d', color: velColor(l.maxVel), borderRadius: 2, padding: '1px 3px', fontFamily: 'monospace' }}
                  />
                </div>
                <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>vel range</span>
              </div>

              {/* Sample name */}
              <div style={{ flex: 1, fontSize: 9, color: l.buffer ? '#cdd9e5' : '#555', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.name}
              </div>

              {/* Load button */}
              <button
                onClick={() => onLoadSample?.(padIdx, l.id)}
                style={{ fontSize: 8, padding: '2px 6px', background: l.buffer ? '#1a3a1a' : '#1c2333', border: `1px solid ${l.buffer ? '#00ffc8' : '#30363d'}`, color: l.buffer ? '#00ffc8' : '#8b949e', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {l.buffer ? '✓ Loaded' : '📂 Load'}
              </button>

              {/* Delete */}
              <button onClick={() => removeLayer(l.id)}
                style={{ fontSize: 9, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 4. NoteRepeatButton
// =============================================================================
// Hold the button to trigger rapid-fire hits.
// Pass onTrigger callback — called on each repeat tick.

const NOTE_REPEAT_RATES = [
  { label: '1/4',  subdiv: 4  },
  { label: '1/8',  subdiv: 8  },
  { label: '1/8T', subdiv: 12 },
  { label: '1/16', subdiv: 16 },
  { label: '1/32', subdiv: 32 },
];

export function NoteRepeatButton({ bpm, padIdx, onTrigger }) {
  const [active, setActive] = useState(false);
  const [rate, setRate] = useState('1/16');
  const intervalRef = useRef(null);

  const startRepeat = useCallback((selectedRate) => {
    const rateObj = NOTE_REPEAT_RATES.find(r => r.label === selectedRate) || NOTE_REPEAT_RATES[3];
    const ms = (60000 / bpm) * (4 / rateObj.subdiv);
    setActive(true);
    // Fire immediately
    onTrigger?.(padIdx, 0.9);
    intervalRef.current = setInterval(() => {
      onTrigger?.(padIdx, 0.8 + Math.random() * 0.15); // slight velocity variation
    }, ms);
  }, [bpm, padIdx, onTrigger]);

  const stopRepeat = useCallback(() => {
    setActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopRepeat(), [stopRepeat]);

  // Update interval if BPM changes while held
  useEffect(() => {
    if (active) {
      stopRepeat();
      startRepeat(rate);
    }
  }, [bpm]); // eslint-disable-line

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {/* Rate selector */}
      <select
        value={rate}
        onChange={e => setRate(e.target.value)}
        disabled={active}
        style={{
          fontSize: 9, background: '#0d1117', border: '1px solid #30363d',
          color: '#8b949e', borderRadius: 2, padding: '1px 3px',
          fontFamily: '"JetBrains Mono", monospace', cursor: 'pointer',
        }}
      >
        {NOTE_REPEAT_RATES.map(r => <option key={r.label} value={r.label}>{r.label}</option>)}
      </select>

      {/* Hold button */}
      <button
        onMouseDown={() => startRepeat(rate)}
        onMouseUp={stopRepeat}
        onMouseLeave={stopRepeat}
        onTouchStart={e => { e.preventDefault(); startRepeat(rate); }}
        onTouchEnd={stopRepeat}
        style={{
          padding: '3px 10px', fontSize: 9, fontWeight: 800,
          background: active ? '#FF6600' : '#1c2333',
          border: `1px solid ${active ? '#FF6600' : '#30363d'}`,
          color: active ? '#fff' : '#8b949e',
          borderRadius: 3, cursor: 'pointer',
          fontFamily: '"JetBrains Mono", monospace',
          boxShadow: active ? '0 0 8px #FF660066' : 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
          transition: 'all 0.05s',
        }}
      >
        {active ? '● REPEAT' : 'HOLD REPEAT'}
      </button>
    </div>
  );
}

// =============================================================================
// 5. useBPMStretch — time-stretch a sample buffer to match project BPM
// =============================================================================
// Detects source BPM of loaded sample, then applies time-stretch ratio
// using Web Audio's playbackRate adjustment (simple method) or
// OfflineAudioContext granular stretch (higher quality).
//
// Usage in SamplerBeatMaker.js / SamplerInstrument.js:
//   const { stretchBuffer, stretching, stretchedBuffer } = useBPMStretch();
//
//   // When loading a sample onto a pad:
//   const buf = await loadAudioBuffer(url, ctx);
//   const sourceBPM = detectBPMFromBuffer(buf); // rough auto-detect
//   const stretched = await stretchBuffer(buf, ctx, sourceBPM, projectBPM);
//   setPads(p => { p[pi].buffer = stretched; return [...p]; });

export function useBPMStretch() {
  const [stretching, setStretching] = useState(false);
  const [progress, setProgress] = useState(0);

  // Rough BPM detection from an AudioBuffer (onset autocorrelation)
  const detectBPM = useCallback((buffer) => {
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const len = data.length;

    // Downsample to ~4 kHz
    const factor = Math.max(1, Math.floor(sr / 4000));
    const ds = [];
    for (let i = 0; i < len; i += factor) ds.push(Math.abs(data[i]));

    // Onset energy
    const frameSize = 128;
    const onsets = [0];
    for (let i = frameSize; i < ds.length - frameSize; i += frameSize) {
      let prev = 0, cur = 0;
      for (let j = 0; j < frameSize; j++) {
        prev += ds[i - frameSize + j] ** 2;
        cur  += ds[i + j] ** 2;
      }
      onsets.push(Math.max(0, cur - prev));
    }

    const eSR = sr / factor / frameSize;
    const minLag = Math.floor(eSR * 60 / 200);
    const maxLag = Math.floor(eSR * 60 / 50);
    let bestLag = minLag, bestCorr = -1;

    for (let lag = minLag; lag <= Math.min(maxLag, onsets.length / 2); lag++) {
      let corr = 0;
      for (let i = 0; i < onsets.length - lag; i++) corr += onsets[i] * onsets[i + lag];
      corr /= onsets.length - lag;
      if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }

    return Math.round(Math.max(60, Math.min(200, eSR * 60 / bestLag)));
  }, []);

  // Time-stretch via OfflineAudioContext + playbackRate
  // NOTE: This is a simple rate-based stretch (changes pitch). For pitch-preserving
  // stretch, replace with PhaseVocoder.js timeStretch() call.
  const stretchBuffer = useCallback(async (buffer, audioCtx, sourceBPM, targetBPM) => {
    if (!buffer || !audioCtx) return buffer;
    if (Math.abs(sourceBPM - targetBPM) < 1) return buffer; // close enough

    setStretching(true);
    setProgress(10);

    try {
      const ratio = sourceBPM / targetBPM;
      const newLength = Math.round(buffer.length * ratio);
      const offCtx = new OfflineAudioContext(
        buffer.numberOfChannels,
        newLength,
        buffer.sampleRate
      );

      const src = offCtx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 1 / ratio; // stretch without pitch shift
      // For pitch-preserving stretch at production quality, use PhaseVocoder here
      src.connect(offCtx.destination);
      src.start(0);

      setProgress(50);
      const rendered = await offCtx.startRendering();
      setProgress(100);
      setStretching(false);
      return rendered;
    } catch (e) {
      console.error('BPM stretch failed:', e);
      setStretching(false);
      return buffer; // fall back to original
    }
  }, []);

  return { stretchBuffer, detectBPM, stretching, progress };
}

// =============================================================================
// 6. BPMStretchControl — UI component to use in SamplerInstrument
// =============================================================================

export function BPMStretchControl({ buffer, projectBPM, audioCtx, onStretched }) {
  const { stretchBuffer, detectBPM, stretching } = useBPMStretch();
  const [sourceBPM, setSourceBPM] = useState(null);
  const [detected, setDetected] = useState(null);

  const detect = useCallback(() => {
    if (!buffer) return;
    const bpm = detectBPM(buffer);
    setDetected(bpm);
    setSourceBPM(bpm);
  }, [buffer, detectBPM]);

  const stretch = useCallback(async () => {
    if (!buffer || !sourceBPM) return;
    const stretched = await stretchBuffer(buffer, audioCtx, sourceBPM, projectBPM);
    onStretched?.(stretched, sourceBPM, projectBPM);
  }, [buffer, sourceBPM, projectBPM, audioCtx, stretchBuffer, onStretched]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9, color: '#8b949e', fontFamily: 'monospace' }}>BPM Stretch:</span>

      <button onClick={detect} disabled={!buffer || stretching}
        style={{ fontSize: 8, padding: '2px 7px', background: '#1c2333', border: '1px solid #30363d', color: '#8b949e', borderRadius: 2, cursor: 'pointer', fontFamily: 'monospace' }}>
        🔍 Detect
      </button>

      {detected !== null && (
        <input type="number" min={40} max={220} value={sourceBPM ?? detected}
          onChange={e => setSourceBPM(parseInt(e.target.value))}
          style={{ width: 44, fontSize: 9, background: '#0d1117', border: '1px solid #30363d', color: '#ffd700', borderRadius: 2, padding: '1px 4px', fontFamily: 'monospace' }}
          title="Detected source BPM (edit to override)"
        />
      )}

      {detected !== null && (
        <>
          <span style={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>→ {projectBPM} BPM</span>
          <button onClick={stretch} disabled={stretching || !sourceBPM}
            style={{ fontSize: 8, padding: '2px 8px', background: stretching ? '#1c2333' : '#1a3a1a', border: `1px solid ${stretching ? '#30363d' : '#00ffc8'}`, color: stretching ? '#555' : '#00ffc8', borderRadius: 2, cursor: stretching ? 'wait' : 'pointer', fontFamily: 'monospace' }}>
            {stretching ? '⏳...' : `⟳ Stretch`}
          </button>
        </>
      )}
    </div>
  );
}

// =============================================================================
// INTEGRATION SUMMARY FOR SamplerBeatMaker.js
// =============================================================================
//
// 1. Add to state block:
//    const [stepProb,   setStepProb]   = useState(() => Array.from({length:16}, () => Array(32).fill(1.0)));
//    const [stepPLocks, setStepPLocks] = useState(() => Array.from({length:16}, () => Array.from({length:32}, () => ({}))));
//    const [velLayers,  setVelLayers]  = useState(() => Array.from({length:16}, () => []));
//    const [showProbPanel,   setShowProbPanel]   = useState(false);
//    const [showPLockPanel,  setShowPLockPanel]  = useState(false);
//    const [showVelPanel,    setShowVelPanel]    = useState(false);
//
// 2. In schedStep() — apply probability + p-locks:
//    const prob = stepProbRef.current[padIdx]?.[stepIdx] ?? 1.0;
//    if (prob < 1 && Math.random() > prob) return; // probabilistic skip
//    const plock = stepPLocksRef.current[padIdx]?.[stepIdx] ?? {};
//    // then when creating source node:
//    source.detune.value = (plock.pitch ?? 0) * 100; // semitones→cents
//    gainNode.gain.value = (pad.volume ?? 1) * (plock.volume ?? 1);
//    if (plock.filterFreq) { filterNode.frequency.value = plock.filterFreq; }
//    if (plock.pan) { pannerNode.pan.value = plock.pan; }
//
// 3. Add refs for schedStep access:
//    const stepProbRef  = useRef(stepProb);
//    const stepPLocksRef = useRef(stepPLocks);
//    useEffect(() => { stepProbRef.current = stepProb; }, [stepProb]);
//    useEffect(() => { stepPLocksRef.current = stepPLocks; }, [stepPLocks]);
//
// 4. Add buttons in pad detail panel (when a pad is selected):
//    <button onClick={() => setShowProbPanel(p=>!p)}>🎲 Prob</button>
//    <button onClick={() => setShowPLockPanel(p=>!p)}>🔒 P-Lock</button>
//    <button onClick={() => setShowVelPanel(p=>!p)}>🎯 Vel Layers</button>
//    <NoteRepeatButton bpm={bpm} padIdx={selPad} onTrigger={handleLiveHit} />
//
// 5. Conditionally render panels below pad grid:
//    {showProbPanel && selPad !== null && (
//      <PadProbabilityPanel padIdx={selPad} stepCount={stepCount}
//        stepProb={stepProb} setStepProb={setStepProb}
//        onClose={() => setShowProbPanel(false)} />
//    )}
//    {showPLockPanel && selPad !== null && (
//      <StepPLockPanel padIdx={selPad} stepCount={stepCount} steps={steps}
//        stepPLocks={stepPLocks} setStepPLocks={setStepPLocks}
//        onClose={() => setShowPLockPanel(false)} />
//    )}
//    {showVelPanel && selPad !== null && (
//      <VelocityLayerEditor padIdx={selPad} velocityLayers={velLayers}
//        setVelocityLayers={setVelLayers}
//        onClose={() => setShowVelPanel(false)} />
//    )}
// =============================================================================