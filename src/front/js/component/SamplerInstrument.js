// =============================================================================
// SamplerInstrument.js — Track-level Sampler for StreamPireX Recording Studio
// Hardware-inspired sampler: SVG knobs, step sequencer, waveform, trim, loop,
// ADSR, pitch, filter, reverse, chop modes
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ── Note names ──
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteLabel = (n) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;

// ── QWERTY → semitone offset (2 octaves) ──
const QWERTY_MAP = {
  'z':0,'s':1,'x':2,'d':3,'c':4,'v':5,'g':6,'b':7,'h':8,'n':9,'j':10,'m':11,
  'q':12,'2':13,'w':14,'3':15,'e':16,'r':17,'5':18,'t':19,'6':20,'y':21,'7':22,'u':23,'i':24,
};


// =============================================================================
// SVG Knob — Hardware-inspired rotary control
// Supports: drag (vertical), scroll wheel, double-click reset, bipolar mode
// =============================================================================
const SVGKnob = ({
  value = 0,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label,
  unit = '',
  size = 52,
  bipolar = false,
  defaultValue,
  disabled = false,
  formatter,
  color = '#00ffc8',
}) => {
  const dragRef = useRef({ dragging: false, startY: 0, startVal: 0 });
  const range = max - min;
  const norm = (value - min) / range; // 0..1
  const START_ANGLE = -135;
  const END_ANGLE = 135;
  const angle = START_ANGLE + norm * (END_ANGLE - START_ANGLE);

  // SVG arc path helper
  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const rad = (a) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle - 90));
    const y1 = cy + r * Math.sin(rad(startAngle - 90));
    const x2 = cx + r * Math.cos(rad(endAngle - 90));
    const y2 = cy + r * Math.sin(rad(endAngle - 90));
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    const sweep = endAngle > startAngle ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  };

  const R = size / 2;
  const trackR = R - 4;
  const cx = R;
  const cy = R;

  // Active arc range (bipolar centers at zero)
  let arcStart, arcEnd;
  if (bipolar) {
    const center = 0; // center angle for bipolar
    if (angle >= center) {
      arcStart = center;
      arcEnd = angle;
    } else {
      arcStart = angle;
      arcEnd = center;
    }
  } else {
    arcStart = START_ANGLE;
    arcEnd = angle;
  }

  // ── Mouse drag (vertical) ──
  const handleMouseDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    dragRef.current = { dragging: true, startY: e.clientY, startVal: value };
    const handleMouseMove = (me) => {
      const dy = dragRef.current.startY - me.clientY;
      let newVal = dragRef.current.startVal + dy * (range / 150);
      if (step >= 1) newVal = Math.round(newVal / step) * step;
      onChange?.(Math.max(min, Math.min(max, newVal)));
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ── Double-click to reset ──
  const handleDoubleClick = () => {
    if (disabled) return;
    if (defaultValue !== undefined) onChange?.(defaultValue);
    else if (bipolar) onChange?.((min + max) / 2);
    else onChange?.(min);
  };

  // ── Scroll wheel ──
  const handleWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    const increment = step >= 1 ? step : range / 100;
    let newVal = value + direction * increment;
    if (step >= 1) newVal = Math.round(newVal / step) * step;
    onChange?.(Math.max(min, Math.min(max, newVal)));
  };

  // ── Display value formatting ──
  const displayValue = formatter ? formatter(value) : (
    unit === 'st' ? `${value > 0 ? '+' : ''}${value}st` :
    unit === '%' ? `${Math.round(value)}%` :
    unit === 'ms' ? `${Math.round(value)}ms` :
    unit === 'Hz' ? (value >= 1000 ? `${(value / 1000).toFixed(1)}kHz` : `${Math.round(value)}Hz`) :
    unit === 's' ? `${value.toFixed(2)}s` :
    typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : String(value)
  );

  // Unique gradient ID per knob
  const gradientId = `knobGrad_${(label || '').replace(/\W/g, '')}_${size}`;

  // ── Indicator dot position ──
  const indicatorR = trackR - 9;
  const indicatorAngleRad = ((angle - 90) * Math.PI) / 180;
  const dotX = cx + indicatorR * Math.cos(indicatorAngleRad);
  const dotY = cy + indicatorR * Math.sin(indicatorAngleRad);

  return (
    <div className={`si-knob-wrap ${disabled ? 'disabled' : ''}`} style={{ width: size, textAlign: 'center' }}>
      {label && <div className="si-knob-label">{label}</div>}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ cursor: disabled ? 'default' : 'grab', userSelect: 'none' }}
      >
        {/* Track background arc */}
        <path
          d={describeArc(cx, cy, trackR, START_ANGLE, END_ANGLE)}
          fill="none"
          stroke="#1a2636"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Active value arc */}
        {Math.abs(arcEnd - arcStart) > 0.5 && (
          <path
            d={describeArc(cx, cy, trackR, arcStart, arcEnd)}
            fill="none"
            stroke={disabled ? '#2a3848' : color}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ filter: disabled ? 'none' : `drop-shadow(0 0 3px ${color}40)` }}
          />
        )}
        {/* Knob body */}
        <defs>
          <radialGradient id={gradientId} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#3a4a5e" />
            <stop offset="100%" stopColor="#0c1420" />
          </radialGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={trackR - 5}
          fill={`url(#${gradientId})`}
          stroke="#1a2636"
          strokeWidth={1}
        />
        {/* Indicator dot */}
        <circle
          cx={dotX}
          cy={dotY}
          r={2.5}
          fill={disabled ? '#2a3848' : color}
          style={{ filter: disabled ? 'none' : `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="si-knob-value" style={{ color: disabled ? '#2a3848' : color }}>
        {displayValue}
      </div>
    </div>
  );
};


// =============================================================================
// Step Sequencer — Multi-bar grid with velocity, BPM, swing, presets, export
// Supports 1-8 bars (16 steps per bar), bar navigation, offline bounce to
// AudioBuffer for export to Console/Track
// =============================================================================
const StepSequencer = ({
  sample,
  getCtx,
  trimStart = 0,
  trimEnd = 1,
  pitch = 0,
  volume = 0.8,
  onExportToConsole,
  onExportToTrack,
  sampleName = 'Sample',
}) => {
  const STEPS_PER_BAR = 16;
  const [bars, setBars] = useState(1);
  const totalSteps = bars * STEPS_PER_BAR;
  const [grid, setGrid] = useState(() => Array(STEPS_PER_BAR).fill(false));
  const [velocities, setVelocities] = useState(() => Array(STEPS_PER_BAR).fill(0.8));
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [viewBar, setViewBar] = useState(0); // which bar is currently displayed in the grid
  const [loopSeq, setLoopSeq] = useState(true);
  const [exporting, setExporting] = useState(false);
  const intervalRef = useRef(null);
  const stepRef = useRef(-1);

  // ── Resize grid when bar count changes ──
  useEffect(() => {
    setGrid(prev => {
      if (prev.length === totalSteps) return prev;
      if (totalSteps > prev.length) {
        // Extend with empty steps
        return [...prev, ...Array(totalSteps - prev.length).fill(false)];
      }
      // Shrink
      return prev.slice(0, totalSteps);
    });
    setVelocities(prev => {
      if (prev.length === totalSteps) return prev;
      if (totalSteps > prev.length) {
        return [...prev, ...Array(totalSteps - prev.length).fill(0.8)];
      }
      return prev.slice(0, totalSteps);
    });
    // Clamp viewBar
    if (viewBar >= bars) setViewBar(Math.max(0, bars - 1));
  }, [bars, totalSteps]);

  // ── Play a step's sample ──
  const playStep = useCallback((stepIdx) => {
    if (!grid[stepIdx] || !sample) return;
    const ctx = getCtx();
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.playbackRate.value = Math.pow(2, pitch / 12);
    const gain = ctx.createGain();
    gain.gain.value = volume * velocities[stepIdx];
    src.connect(gain);
    gain.connect(ctx.destination);
    const dur = trimEnd - trimStart;
    src.start(0, trimStart, dur > 0 ? dur : undefined);
  }, [grid, sample, getCtx, pitch, volume, velocities, trimStart, trimEnd]);

  // ── Transport toggle ──
  const togglePlay = useCallback(() => {
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
      setCurrentStep(-1);
      stepRef.current = -1;
    } else {
      setPlaying(true);
      stepRef.current = -1;
      const stepDuration = (60 / bpm) / 4 * 1000; // 16th note
      intervalRef.current = setInterval(() => {
        const next = stepRef.current + 1;
        if (next >= totalSteps && !loopSeq) {
          // Stop at end if not looping
          clearInterval(intervalRef.current);
          setPlaying(false);
          setCurrentStep(-1);
          stepRef.current = -1;
          return;
        }
        stepRef.current = next % totalSteps;
        setCurrentStep(stepRef.current);
      }, stepDuration);
    }
  }, [playing, bpm, totalSteps, loopSeq]);

  // Trigger sound on step change + auto-scroll bar view
  useEffect(() => {
    if (currentStep >= 0 && playing) {
      playStep(currentStep);
      // Auto-scroll to the bar containing the current step
      const stepBar = Math.floor(currentStep / STEPS_PER_BAR);
      if (stepBar !== viewBar) setViewBar(stepBar);
    }
  }, [currentStep, playing, playStep]);

  // Update interval when BPM changes during playback
  useEffect(() => {
    if (playing && intervalRef.current) {
      clearInterval(intervalRef.current);
      const stepDuration = (60 / bpm) / 4 * 1000;
      intervalRef.current = setInterval(() => {
        const next = stepRef.current + 1;
        if (next >= totalSteps && !loopSeq) {
          clearInterval(intervalRef.current);
          setPlaying(false);
          setCurrentStep(-1);
          stepRef.current = -1;
          return;
        }
        stepRef.current = next % totalSteps;
        setCurrentStep(stepRef.current);
      }, stepDuration);
    }
  }, [bpm, totalSteps, loopSeq]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // ── Preset patterns (applies to current view bar) ──
  const applyPreset = useCallback((pattern) => {
    const offset = viewBar * STEPS_PER_BAR;
    setGrid(prev => {
      const n = [...prev];
      // Clear current bar first
      for (let i = offset; i < offset + STEPS_PER_BAR; i++) n[i] = false;
      // Apply pattern
      if (pattern === '4/4') {
        [0, 4, 8, 12].forEach(i => { n[offset + i] = true; });
      } else if (pattern === 'offbeat') {
        [2, 6, 10, 14].forEach(i => { n[offset + i] = true; });
      } else if (pattern === 'hh') {
        for (let i = 0; i < STEPS_PER_BAR; i += 2) n[offset + i] = true;
      } else if (pattern === 'random') {
        for (let i = 0; i < STEPS_PER_BAR; i++) n[offset + i] = Math.random() > 0.6;
      }
      // 'clear' just leaves it cleared
      return n;
    });
  }, [viewBar]);

  // ── Copy bar to all other bars ──
  const copyBarToAll = useCallback(() => {
    const offset = viewBar * STEPS_PER_BAR;
    setGrid(prev => {
      const n = [...prev];
      const src = prev.slice(offset, offset + STEPS_PER_BAR);
      for (let b = 0; b < bars; b++) {
        if (b === viewBar) continue;
        for (let i = 0; i < STEPS_PER_BAR; i++) n[b * STEPS_PER_BAR + i] = src[i];
      }
      return n;
    });
    setVelocities(prev => {
      const n = [...prev];
      const src = prev.slice(offset, offset + STEPS_PER_BAR);
      for (let b = 0; b < bars; b++) {
        if (b === viewBar) continue;
        for (let i = 0; i < STEPS_PER_BAR; i++) n[b * STEPS_PER_BAR + i] = src[i];
      }
      return n;
    });
  }, [viewBar, bars]);

  // ── Step toggle ──
  const toggleStep = (localIdx) => {
    const globalIdx = viewBar * STEPS_PER_BAR + localIdx;
    setGrid(prev => { const n = [...prev]; n[globalIdx] = !n[globalIdx]; return n; });
  };

  // ── Velocity adjust (right-click) ──
  const handleVelocity = (e, localIdx) => {
    e.preventDefault();
    const globalIdx = viewBar * STEPS_PER_BAR + localIdx;
    const rect = e.target.getBoundingClientRect();
    const y = 1 - ((e.clientY - rect.top) / rect.height);
    setVelocities(prev => {
      const n = [...prev];
      n[globalIdx] = Math.max(0.1, Math.min(1, y));
      return n;
    });
    if (!grid[globalIdx]) {
      setGrid(prev => { const n = [...prev]; n[globalIdx] = true; return n; });
    }
  };

  // ══════════════════════════════════════════════════════════
  // OFFLINE BOUNCE — Render pattern to AudioBuffer
  // ══════════════════════════════════════════════════════════
  const bounceToBuffer = useCallback(async () => {
    if (!sample) return null;
    setExporting(true);
    try {
      const stepDur = (60 / bpm) / 4; // duration of one 16th note in seconds
      const totalDur = totalSteps * stepDur;
      const sr = sample.sampleRate;
      const totalSamples = Math.ceil(totalDur * sr);

      // Create offline context for rendering
      const offCtx = new OfflineAudioContext(sample.numberOfChannels, totalSamples, sr);

      // Schedule each active step
      for (let i = 0; i < totalSteps; i++) {
        if (!grid[i]) continue;
        const startTime = i * stepDur;
        const src = offCtx.createBufferSource();
        src.buffer = sample;
        src.playbackRate.value = Math.pow(2, pitch / 12);
        const gain = offCtx.createGain();
        gain.gain.value = volume * velocities[i];
        src.connect(gain);
        gain.connect(offCtx.destination);
        const sampleDur = trimEnd - trimStart;
        src.start(startTime, trimStart, sampleDur > 0 ? sampleDur : undefined);
      }

      const rendered = await offCtx.startRendering();
      return rendered;
    } catch (err) {
      console.error('Bounce failed:', err);
      return null;
    } finally {
      setExporting(false);
    }
  }, [sample, grid, velocities, bpm, totalSteps, pitch, volume, trimStart, trimEnd]);

  // ── Export to Console (Arrange view) ──
  const exportToConsole = useCallback(async () => {
    const buf = await bounceToBuffer();
    if (buf && onExportToConsole) {
      const barLabel = bars > 1 ? `${bars}bars` : '1bar';
      onExportToConsole(buf, `${sampleName} Seq ${bpm}bpm ${barLabel}`);
    }
  }, [bounceToBuffer, onExportToConsole, sampleName, bpm, bars]);

  // ── Export to Track ──
  const exportToTrack = useCallback(async () => {
    const buf = await bounceToBuffer();
    if (buf && onExportToTrack) {
      const barLabel = bars > 1 ? `${bars}bars` : '1bar';
      onExportToTrack(buf, `${sampleName} Seq ${bpm}bpm ${barLabel}`);
    }
  }, [bounceToBuffer, onExportToTrack, sampleName, bpm, bars]);

  // ── Current bar's steps for display ──
  const barOffset = viewBar * STEPS_PER_BAR;
  const barGrid = grid.slice(barOffset, barOffset + STEPS_PER_BAR);
  const barVelocities = velocities.slice(barOffset, barOffset + STEPS_PER_BAR);

  // Is the current playback step within the viewed bar?
  const viewStepInBar = (currentStep >= barOffset && currentStep < barOffset + STEPS_PER_BAR)
    ? currentStep - barOffset
    : -1;

  // Count active steps
  const activeCount = grid.filter(Boolean).length;
  const totalDuration = ((60 / bpm) / 4 * totalSteps).toFixed(2);

  return (
    <div className="si-sequencer">
      {/* ── Header row: title + transport + knobs ── */}
      <div className="si-seq-header">
        <span className="si-seq-title">STEP SEQUENCER</span>
        <div className="si-seq-controls">
          <button
            className={`si-seq-play ${playing ? 'active' : ''}`}
            onClick={togglePlay}
            disabled={!sample}
          >
            {playing ? '■' : '▶'}
          </button>
          <SVGKnob
            value={bpm} min={40} max={300} step={1}
            onChange={setBpm} label="BPM" size={42} color="#FF6600"
          />
          <SVGKnob
            value={swing} min={0} max={100} step={1}
            onChange={setSwing} label="Swing" unit="%" size={42} color="#ff6b9d"
          />
        </div>
      </div>

      {/* ── Bar controls row: bar count, navigation, loop, presets ── */}
      <div className="si-seq-bar-row">
        <div className="si-seq-bar-count">
          <span className="si-seq-bar-label">BARS</span>
          <div className="si-seq-bar-selector">
            {[1, 2, 4, 8].map(n => (
              <button
                key={n}
                className={`si-seq-bar-btn ${bars === n ? 'active' : ''}`}
                onClick={() => setBars(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {bars > 1 && (
          <div className="si-seq-bar-nav">
            <button
              className="si-seq-bar-arrow"
              onClick={() => setViewBar(Math.max(0, viewBar - 1))}
              disabled={viewBar === 0}
            >
              ◀
            </button>
            <span className="si-seq-bar-current">Bar {viewBar + 1} / {bars}</span>
            <button
              className="si-seq-bar-arrow"
              onClick={() => setViewBar(Math.min(bars - 1, viewBar + 1))}
              disabled={viewBar >= bars - 1}
            >
              ▶
            </button>
            <button className="si-seq-bar-copy" onClick={copyBarToAll} title="Copy this bar to all other bars">
              ⧉ Copy → All
            </button>
          </div>
        )}
        <label className="si-toggle si-seq-loop">
          <input type="checkbox" checked={loopSeq} onChange={(e) => setLoopSeq(e.target.checked)} />
          <span className="si-toggle-track"><span className="si-toggle-thumb" /></span>
          Loop
        </label>
        <div className="si-seq-presets">
          {[['4/4', '4/4'], ['Off', 'offbeat'], ['HH', 'hh'], ['Rnd', 'random'], ['Clr', 'clear']].map(([label, key]) => (
            <button key={key} className="si-seq-preset" onClick={() => applyPreset(key)}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Step grid (shows one bar at a time) ── */}
      <div className="si-seq-grid">
        {barGrid.map((active, i) => (
          <div
            key={i}
            className={`si-seq-step ${active ? 'on' : ''} ${viewStepInBar === i ? 'current' : ''} ${i % 4 === 0 ? 'beat' : ''}`}
            onClick={() => toggleStep(i)}
            onContextMenu={(e) => handleVelocity(e, i)}
          >
            {active && <div className="si-seq-vel" style={{ height: `${barVelocities[i] * 100}%` }} />}
            <span className="si-seq-num">{barOffset + i + 1}</span>
          </div>
        ))}
      </div>

      {/* ── Bar indicator dots (mini-map) ── */}
      {bars > 1 && (
        <div className="si-seq-barmap">
          {Array.from({ length: bars }, (_, b) => (
            <div
              key={b}
              className={`si-seq-barmap-bar ${b === viewBar ? 'viewing' : ''}`}
              onClick={() => setViewBar(b)}
            >
              {Array.from({ length: STEPS_PER_BAR }, (_, s) => {
                const globalStep = b * STEPS_PER_BAR + s;
                return (
                  <div
                    key={s}
                    className={`si-seq-barmap-step ${grid[globalStep] ? 'on' : ''} ${currentStep === globalStep ? 'playing' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Info + Export row ── */}
      <div className="si-seq-footer">
        <div className="si-seq-info">
          <span>{totalSteps} steps</span>
          <span>{activeCount} active</span>
          <span>{totalDuration}s</span>
          <span>{bars} bar{bars > 1 ? 's' : ''}</span>
        </div>
        <div className="si-seq-export">
          <button
            className="si-btn si-btn-beat"
            onClick={exportToConsole}
            disabled={!sample || activeCount === 0 || exporting}
            title="Bounce pattern to audio and send to Console/Arrange"
          >
            {exporting ? '⏳ Bouncing...' : '⏏ Export → Console'}
          </button>
          <button
            className="si-btn si-btn-track"
            onClick={exportToTrack}
            disabled={!sample || activeCount === 0 || exporting}
            title="Bounce pattern to audio and place on Track"
          >
            {exporting ? '⏳...' : '⏏ Export → Track'}
          </button>
        </div>
      </div>
    </div>
  );
};


// =============================================================================
// Main SamplerInstrument Component
// =============================================================================
const SamplerInstrument = ({ track, trackIndex, onUpdate, audioCtx: externalCtx, onSendToBeatMaker, onSendToTrack }) => {
  // ── State ──
  const [sample, setSample] = useState(null);        // AudioBuffer
  const [sampleName, setSampleName] = useState('');
  const [rootNote, setRootNote] = useState(60);       // C4
  const [pitch, setPitch] = useState(0);              // semitones
  const [volume, setVolume] = useState(0.8);
  const [trimStart, setTrimStart] = useState(0);      // seconds
  const [trimEnd, setTrimEnd] = useState(0);          // seconds
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [reversed, setReversed] = useState(false);
  const [playMode, setPlayMode] = useState('oneshot'); // oneshot | hold | loop | gate

  // ADSR
  const [attack, setAttack] = useState(0.005);
  const [decay, setDecay] = useState(0.1);
  const [sustain, setSustain] = useState(0.8);
  const [release, setRelease] = useState(0.2);

  // Filter
  const [filterType, setFilterType] = useState('lowpass');
  const [filterFreq, setFilterFreq] = useState(20000);
  const [filterQ, setFilterQ] = useState(1);
  const [filterEnabled, setFilterEnabled] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('main');
  const [draggingTrim, setDraggingTrim] = useState(null); // 'start' | 'end' | 'loopStart' | 'loopEnd' | null
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  // Chop State
  const [showChop, setShowChop] = useState(false);
  const [chopPoints, setChopPoints] = useState([]);
  const [chopMode, setChopMode] = useState('transient'); // transient | bpmgrid | equal | manual
  const [chopSensitivity, setChopSensitivity] = useState(0.3);
  const [chopSliceCount, setChopSliceCount] = useState(8);
  const [chopBpm, setChopBpm] = useState(120);
  const [activeSlice, setActiveSlice] = useState(-1);

  // Refs
  const canvasRef = useRef(null);
  const chopCanvasRef = useRef(null);
  const ctxRef = useRef(null);
  const activeVoices = useRef({});
  const fileInputRef = useRef(null);

  // ── Audio Context ──
  const getCtx = useCallback(() => {
    if (externalCtx) return externalCtx;
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, [externalCtx]);

  // ── Load Sample ──
  const loadSample = useCallback(async (file) => {
    const ctx = getCtx();
    const arrayBuf = await file.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    setSample(audioBuf);
    setSampleName(file.name.replace(/\.[^/.]+$/, ''));
    setTrimStart(0);
    setTrimEnd(audioBuf.duration);
    setLoopStart(0);
    setLoopEnd(audioBuf.duration);
  }, [getCtx]);

  // ── Drop handler ──
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('audio/')) loadSample(file);
  }, [loadSample]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) loadSample(file);
  }, [loadSample]);

  // ── Draw Waveform (DPR-aware) ──
  const drawWaveform = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv || !sample) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();

    // Size canvas for sharp rendering
    if (rect.width > 0 && cv.width !== Math.floor(rect.width * dpr)) {
      cv.width = Math.floor(rect.width * dpr);
      cv.height = 180 * dpr;
    }
    const w = cv.width / dpr;
    const h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const data = sample.getChannelData(0);
    const dur = sample.duration;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c1420');
    bgGrad.addColorStop(1, '#080e16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 10; i++) {
      const x = (i / 10) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    // Horizontal center line
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.06)';
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    // Trim region overlay (dim trimmed-out areas)
    const tsX = (trimStart / dur) * w;
    const teX = (trimEnd / dur) * w;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    if (trimStart > 0) ctx.fillRect(0, 0, tsX, h);
    if (trimEnd < dur) ctx.fillRect(teX, 0, w - teX, h);

    // Loop region highlight
    if (loopEnabled) {
      const lsX = (loopStart / dur) * w;
      const leX = (loopEnd / dur) * w;
      ctx.fillStyle = 'rgba(0, 255, 200, 0.04)';
      ctx.fillRect(lsX, 0, leX - lsX, h);
      // Loop markers (dashed lines)
      ctx.strokeStyle = '#00ffc8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(lsX, 0); ctx.lineTo(lsX, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(leX, 0); ctx.lineTo(leX, h); ctx.stroke();
      ctx.setLineDash([]);
    }

    // RMS fill (gradient)
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let sum = 0;
      for (let j = 0; j < step; j++) sum += (data[idx + j] || 0) ** 2;
      const rms = Math.sqrt(sum / step);
      const yTop = ((1 - rms) / 2) * h;
      if (i === 0) ctx.moveTo(i, yTop); else ctx.lineTo(i, yTop);
    }
    for (let i = w - 1; i >= 0; i--) {
      const idx = Math.floor((i / w) * data.length);
      let sum = 0;
      for (let j = 0; j < step; j++) sum += (data[idx + j] || 0) ** 2;
      const rms = Math.sqrt(sum / step);
      const yBot = ((1 + rms) / 2) * h;
      ctx.lineTo(i, yBot);
    }
    ctx.closePath();
    const rmsFill = ctx.createLinearGradient(0, 0, 0, h);
    rmsFill.addColorStop(0, 'rgba(0, 255, 200, 0.18)');
    rmsFill.addColorStop(0.5, 'rgba(0, 255, 200, 0.06)');
    rmsFill.addColorStop(1, 'rgba(0, 255, 200, 0.18)');
    ctx.fillStyle = rmsFill;
    ctx.fill();

    // Peak waveform lines (top and bottom)
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let maxVal = -1;
      for (let j = 0; j < step; j++) { const v = data[idx + j] || 0; if (v > maxVal) maxVal = v; }
      const y = ((1 - maxVal) / 2) * h;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let minVal = 1;
      for (let j = 0; j < step; j++) { const v = data[idx + j] || 0; if (v < minVal) minVal = v; }
      const y = ((1 - minVal) / 2) * h;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Trim handles (triangle markers + lines)
    [{ x: tsX, label: 'S' }, { x: teX, label: 'E' }].forEach(({ x, label }) => {
      ctx.fillStyle = '#FF6600';
      ctx.fillRect(x - 1.5, 0, 3, h);
      // Top triangle
      ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x, 10); ctx.closePath(); ctx.fill();
      // Bottom triangle
      ctx.beginPath(); ctx.moveTo(x - 6, h); ctx.lineTo(x + 6, h); ctx.lineTo(x, h - 10); ctx.closePath(); ctx.fill();
      // Label
      ctx.fillStyle = '#FF6600';
      ctx.font = '9px monospace';
      if (label === 'S') ctx.fillText(label, x + 4, 22);
      else ctx.fillText(label, x - 12, 22);
    });

    // Loop labels
    if (loopEnabled) {
      ctx.fillStyle = '#00ffc8';
      ctx.font = '9px monospace';
      ctx.fillText('L', ((loopStart / dur) * w) + 4, h - 6);
      ctx.fillText('L', ((loopEnd / dur) * w) - 12, h - 6);
    }
  }, [sample, trimStart, trimEnd, loopEnabled, loopStart, loopEnd]);

  useEffect(() => { drawWaveform(); }, [drawWaveform]);

  // ── Canvas mouse interaction for trim/loop handles ──
  const handleCanvasMouseDown = useCallback((e) => {
    if (!sample || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dur = sample.duration;
    const w = rect.width;

    const tsX = (trimStart / dur) * w;
    const teX = (trimEnd / dur) * w;

    if (Math.abs(x - tsX) < 10) setDraggingTrim('start');
    else if (Math.abs(x - teX) < 10) setDraggingTrim('end');
    else if (loopEnabled) {
      const lsX = (loopStart / dur) * w;
      const leX = (loopEnd / dur) * w;
      if (Math.abs(x - lsX) < 10) setDraggingTrim('loopStart');
      else if (Math.abs(x - leX) < 10) setDraggingTrim('loopEnd');
    }
  }, [sample, trimStart, trimEnd, loopEnabled, loopStart, loopEnd]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!draggingTrim || !sample || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const time = (x / rect.width) * sample.duration;

    if (draggingTrim === 'start') setTrimStart(Math.min(time, trimEnd - 0.01));
    else if (draggingTrim === 'end') setTrimEnd(Math.max(time, trimStart + 0.01));
    else if (draggingTrim === 'loopStart') setLoopStart(Math.min(time, loopEnd - 0.01));
    else if (draggingTrim === 'loopEnd') setLoopEnd(Math.max(time, loopStart + 0.01));
  }, [draggingTrim, sample, trimStart, trimEnd, loopStart, loopEnd]);

  const handleCanvasMouseUp = useCallback(() => setDraggingTrim(null), []);

  // ── Play note ──
  const playNote = useCallback((midiNote) => {
    if (!sample) return;
    const ctx = getCtx();
    const semitones = midiNote - rootNote + pitch;

    // Source
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.playbackRate.value = Math.pow(2, semitones / 12);

    // Gain (ADSR)
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const peakVol = volume;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVol, now + attack);
    gain.gain.linearRampToValueAtTime(peakVol * sustain, now + attack + decay);

    // Filter chain
    let lastNode = src;
    if (filterEnabled) {
      const filt = ctx.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.value = filterFreq;
      filt.Q.value = filterQ;
      src.connect(filt);
      lastNode = filt;
    }

    lastNode.connect(gain);
    gain.connect(ctx.destination);

    // Loop
    if (loopEnabled || playMode === 'loop') {
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = loopEnd;
    }

    // Start
    const off = reversed ? (sample.duration - trimEnd) : trimStart;
    const dur = trimEnd - trimStart;
    if (playMode === 'loop' || playMode === 'hold') {
      src.start(now, off);
    } else {
      src.start(now, off, dur + release);
    }

    // Release envelope for oneshot
    if (playMode === 'oneshot') {
      const relStart = now + dur;
      gain.gain.setValueAtTime(peakVol * sustain, relStart);
      gain.gain.linearRampToValueAtTime(0, relStart + release);
      src.stop(relStart + release + 0.05);
    }

    activeVoices.current[midiNote] = { src, gain, startTime: now };
    setIsPlaying(true);
    src.onended = () => {
      delete activeVoices.current[midiNote];
      if (Object.keys(activeVoices.current).length === 0) setIsPlaying(false);
    };
  }, [sample, rootNote, pitch, volume, attack, decay, sustain, release, trimStart, trimEnd, loopEnabled, loopStart, loopEnd, playMode, filterEnabled, filterType, filterFreq, filterQ, reversed, getCtx]);

  // ── Stop note ──
  const stopNote = useCallback((midiNote) => {
    const voice = activeVoices.current[midiNote];
    if (!voice) return;
    const ctx = getCtx();
    const now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + release);
    voice.src.stop(now + release + 0.05);
    delete activeVoices.current[midiNote];
  }, [release, getCtx]);

  // ── Keyboard handler ──
  useEffect(() => {
    const kd = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (QWERTY_MAP.hasOwnProperty(k) && !activeKeys.has(k)) {
        e.preventDefault();
        const rootOctBase = Math.floor(rootNote / 12) * 12;
        const midiNote = rootOctBase + QWERTY_MAP[k];
        setActiveKeys(prev => new Set(prev).add(k));
        playNote(midiNote);
      }
    };
    const ku = (e) => {
      const k = e.key.toLowerCase();
      if (QWERTY_MAP.hasOwnProperty(k)) {
        const rootOctBase = Math.floor(rootNote / 12) * 12;
        const midiNote = rootOctBase + QWERTY_MAP[k];
        setActiveKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
        if (playMode === 'hold' || playMode === 'gate') stopNote(midiNote);
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [playNote, stopNote, rootNote, playMode, activeKeys]);

  // ── Reverse sample ──
  const reverseSample = useCallback(() => {
    if (!sample) return;
    const ctx = getCtx();
    const rev = ctx.createBuffer(sample.numberOfChannels, sample.length, sample.sampleRate);
    for (let ch = 0; ch < sample.numberOfChannels; ch++) {
      const src = sample.getChannelData(ch);
      const dst = rev.getChannelData(ch);
      for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
    }
    setSample(rev);
    setReversed(!reversed);
  }, [sample, reversed, getCtx]);

  // ── Zero-crossing snap ──
  const zeroCrossSnap = useCallback((buffer, time) => {
    if (!buffer) return time;
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    const center = Math.round(time * sr);
    const win = Math.round(sr * 0.002); // 2ms window
    let bestIdx = center, bestVal = Math.abs(data[center] || 0);
    for (let i = Math.max(0, center - win); i < Math.min(data.length, center + win); i++) {
      const v = Math.abs(data[i] || 0);
      if (v < bestVal) { bestVal = v; bestIdx = i; }
    }
    return bestIdx / sr;
  }, []);

  // ── Auto-Chop ──
  const autoChop = useCallback(() => {
    if (!sample) return;
    const data = sample.getChannelData(0);
    const dur = sample.duration;
    const sr = sample.sampleRate;
    let points = [];

    if (chopMode === 'transient') {
      // Transient detection via energy difference
      const blockSize = Math.round(sr * 0.01); // 10ms blocks
      const numBlocks = Math.floor(data.length / blockSize);
      let prevEnergy = 0;
      const minGap = sr * 0.05; // 50ms min between chops
      let lastChopSample = 0;
      for (let b = 0; b < numBlocks; b++) {
        let energy = 0;
        const start = b * blockSize;
        for (let i = start; i < start + blockSize && i < data.length; i++) {
          energy += data[i] * data[i];
        }
        energy /= blockSize;
        if (energy > chopSensitivity * 0.1 && energy > prevEnergy * 3 && b > 0) {
          const samplePos = start;
          if (samplePos - lastChopSample > minGap) {
            const t = zeroCrossSnap(sample, samplePos / sr);
            if (t > 0.01 && t < dur - 0.01) {
              points.push(t);
              lastChopSample = samplePos;
            }
          }
        }
        prevEnergy = energy;
      }
    } else if (chopMode === 'bpmgrid') {
      const beatDur = 60 / chopBpm;
      const sliceDur = beatDur / 4; // 16th note grid
      for (let t = sliceDur; t < dur - 0.01; t += sliceDur) {
        points.push(zeroCrossSnap(sample, t));
      }
    } else if (chopMode === 'equal') {
      const sliceDur = dur / chopSliceCount;
      for (let i = 1; i < chopSliceCount; i++) {
        points.push(zeroCrossSnap(sample, sliceDur * i));
      }
    }

    setChopPoints(points.sort((a, b) => a - b));
  }, [sample, chopMode, chopSensitivity, chopBpm, chopSliceCount, zeroCrossSnap]);

  // ── Manual chop point on canvas click ──
  const handleChopCanvasClick = useCallback((e) => {
    if (!sample || !chopCanvasRef.current) return;
    if (chopMode !== 'manual') return;
    const rect = chopCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * sample.duration;
    const snapped = zeroCrossSnap(sample, time);
    // Check if near existing point — if so, remove it
    const nearIdx = chopPoints.findIndex(pt => Math.abs(pt - snapped) < 0.02);
    if (nearIdx !== -1) {
      setChopPoints(prev => prev.filter((_, i) => i !== nearIdx));
    } else {
      setChopPoints(prev => [...prev, snapped].sort((a, b) => a - b));
    }
  }, [sample, chopMode, chopPoints, zeroCrossSnap]);

  // ── Preview a slice ──
  const previewSlice = useCallback((idx) => {
    if (!sample) return;
    const ctx = getCtx();
    const all = [0, ...chopPoints, sample.duration];
    const start = all[idx] || 0;
    const end = all[idx + 1] || sample.duration;
    const src = ctx.createBufferSource();
    src.buffer = sample;
    src.connect(ctx.destination);
    src.start(0, start, end - start);
    setActiveSlice(idx);
    setTimeout(() => setActiveSlice(-1), (end - start) * 1000);
  }, [sample, chopPoints, getCtx]);

  // ── Draw chop waveform (DPR-aware) ──
  const drawChopWaveform = useCallback(() => {
    const cv = chopCanvasRef.current;
    if (!cv || !sample) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();

    if (rect.width > 0 && cv.width !== Math.floor(rect.width * dpr)) {
      cv.width = Math.floor(rect.width * dpr);
      cv.height = 160 * dpr;
    }
    const w = cv.width / dpr;
    const h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const data = sample.getChannelData(0);
    const dur = sample.duration;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0c1420');
    bgGrad.addColorStop(1, '#080e16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Alternating slice colors
    const all = [0, ...chopPoints, dur];
    for (let i = 0; i < all.length - 1; i++) {
      const x1 = (all[i] / dur) * w;
      const x2 = (all[i + 1] / dur) * w;
      ctx.fillStyle = i === activeSlice
        ? 'rgba(0, 255, 200, 0.12)'
        : (i % 2 === 0 ? 'rgba(0, 255, 200, 0.04)' : 'rgba(255, 102, 0, 0.04)');
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    // Waveform
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.beginPath();
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < w; i++) {
      const idx = Math.floor((i / w) * data.length);
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[idx + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = ((1 - max) / 2) * h;
      const yMax = ((1 - min) / 2) * h;
      if (i === 0) ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMin);
      ctx.lineTo(i, yMax);
    }
    ctx.stroke();

    // Chop lines with triangle handles
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 2;
    chopPoints.forEach((pt) => {
      const x = (pt / dur) * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      // Top triangle handle
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(x - 5, 0); ctx.lineTo(x + 5, 0); ctx.lineTo(x, 8); ctx.fill();
      // Bottom triangle handle
      ctx.beginPath(); ctx.moveTo(x - 5, h); ctx.lineTo(x + 5, h); ctx.lineTo(x, h - 8); ctx.fill();
    });

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  }, [sample, chopPoints, activeSlice]);

  useEffect(() => {
    if (showChop) drawChopWaveform();
  }, [showChop, drawChopWaveform, chopPoints, activeSlice]);

  // ── Send trimmed sample to Beat Maker ──
  const sendToBeatMaker = useCallback(() => {
    if (!sample || !onSendToBeatMaker) return;
    // Create trimmed buffer
    const ctx = getCtx();
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    const startSamp = Math.floor(trimStart * sr);
    const endSamp = Math.floor(trimEnd * sr);
    const len = endSamp - startSamp;
    if (len <= 0) return;
    const trimmed = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = sample.getChannelData(ch);
      const dst = trimmed.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[startSamp + i] || 0;
    }
    onSendToBeatMaker(trimmed, sampleName || 'Sample');
  }, [sample, trimStart, trimEnd, sampleName, onSendToBeatMaker, getCtx]);

  // ── Send chop slices to Beat Maker ──
  const sendSlicesToBeatMaker = useCallback(() => {
    if (!sample || !onSendToBeatMaker || chopPoints.length === 0) return;
    const ctx = getCtx();
    const all = [0, ...chopPoints, sample.duration];
    const slices = [];
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    for (let i = 0; i < all.length - 1 && i < 16; i++) {
      const s = Math.floor(all[i] * sr);
      const e = Math.floor(all[i + 1] * sr);
      const len = e - s;
      if (len <= 0) continue;
      // Add 2ms crossfade
      const fadeSamps = Math.min(Math.round(sr * 0.002), Math.floor(len / 4));
      const buf = ctx.createBuffer(nc, len, sr);
      for (let ch = 0; ch < nc; ch++) {
        const src = sample.getChannelData(ch);
        const dst = buf.getChannelData(ch);
        for (let j = 0; j < len; j++) dst[j] = src[s + j] || 0;
        // Fade in
        for (let j = 0; j < fadeSamps; j++) dst[j] *= j / fadeSamps;
        // Fade out
        for (let j = 0; j < fadeSamps; j++) dst[len - 1 - j] *= j / fadeSamps;
      }
      slices.push({ buffer: buf, name: `${sampleName || 'Chop'} ${i + 1}` });
    }
    // Send first slice, store rest for Beat Maker to pick up
    if (slices.length > 0) {
      window.__spx_sampler_slices = slices;
      onSendToBeatMaker(slices[0].buffer, `${sampleName} (${slices.length} slices)`);
    }
  }, [sample, chopPoints, sampleName, onSendToBeatMaker, getCtx]);

  // ── Send to Track ──
  const sendToTrack = useCallback(() => {
    if (!sample || !onSendToTrack) return;
    const ctx = getCtx();
    const sr = sample.sampleRate;
    const nc = sample.numberOfChannels;
    const startSamp = Math.floor(trimStart * sr);
    const endSamp = Math.floor(trimEnd * sr);
    const len = endSamp - startSamp;
    if (len <= 0) return;
    const trimmed = ctx.createBuffer(nc, len, sr);
    for (let ch = 0; ch < nc; ch++) {
      const src = sample.getChannelData(ch);
      const dst = trimmed.getChannelData(ch);
      for (let i = 0; i < len; i++) dst[i] = src[startSamp + i] || 0;
    }
    onSendToTrack(trimmed, sampleName || 'Sample');
  }, [sample, trimStart, trimEnd, sampleName, onSendToTrack, getCtx]);

  // ── Mini keyboard (2 octaves) ──
  const miniKeyboard = useMemo(() => {
    const keys = [];
    const baseNote = Math.floor(rootNote / 12) * 12; // C of root octave
    for (let i = 0; i < 25; i++) {
      const note = baseNote + i;
      const isBlack = [1, 3, 6, 8, 10].includes(i % 12);
      const isRoot = note === rootNote;
      // Find QWERTY shortcut
      let shortcut = '';
      Object.entries(QWERTY_MAP).forEach(([key, offset]) => {
        if (offset === i) shortcut = key.toUpperCase();
      });
      keys.push({ note, isBlack, isRoot, shortcut, name: noteLabel(note) });
    }
    return keys;
  }, [rootNote]);

  // ── Format time ──
  const fmtTime = (t) => `${t.toFixed(3)}s`;

  // ═══════════ RENDER ═══════════
  return (
    <div className="sampler-instrument" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      {/* ── Header ── */}
      <div className="si-header">
        <div className="si-header-left">
          <div className="si-header-logo">◆</div>
          <span className="si-header-title">SAMPLER</span>
          {sampleName && <span className="si-sample-badge">{sampleName}</span>}
          {sample && (
            <span className="si-header-meta">
              {sample.sampleRate / 1000}kHz · {sample.numberOfChannels}ch · {fmtTime(sample.duration)}
            </span>
          )}
        </div>
        <div className="si-header-right">
          <button className="si-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Load
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          <button
            className={`si-btn ${showChop ? 'active' : ''}`}
            onClick={() => setShowChop(!showChop)}
            disabled={!sample}
          >
            ✂ Chop
          </button>
          <button
            className={`si-btn ${reversed ? 'active' : ''}`}
            onClick={reverseSample}
            disabled={!sample}
          >
            ⟲ Rev
          </button>
          <div className="si-play-modes">
            {['oneshot', 'hold', 'loop', 'gate'].map(m => (
              <button
                key={m}
                className={`si-mode-pill ${playMode === m ? 'active' : ''}`}
                onClick={() => setPlayMode(m)}
              >
                {m === 'oneshot' ? 'One-Shot' : m === 'hold' ? 'Hold' : m === 'loop' ? 'Loop' : 'Gate'}
              </button>
            ))}
          </div>
          <div className="si-send-btns">
            <button className="si-btn si-btn-beat" onClick={sendToBeatMaker} disabled={!sample} title="Send trimmed sample to Beat Maker">
              → Beat Maker
            </button>
            <button className="si-btn si-btn-track" onClick={sendToTrack} disabled={!sample} title="Place sample on selected track">
              → Track {(trackIndex || 0) + 1}
            </button>
          </div>
        </div>
      </div>

      {/* ── Waveform / Chop View ── */}
      <div className="si-wave-section">
        {showChop && sample ? (
          <div className="si-chop-panel">
            <div className="si-chop-canvas-wrap">
              <canvas
                ref={chopCanvasRef}
                className="si-canvas"
                onClick={handleChopCanvasClick}
                style={{ cursor: chopMode === 'manual' ? 'crosshair' : 'default' }}
              />
            </div>
            <div className="si-chop-controls">
              <div className="si-chop-modes">
                {['transient', 'bpmgrid', 'equal', 'manual'].map(m => (
                  <button
                    key={m}
                    className={`si-chop-mode-btn ${chopMode === m ? 'active' : ''}`}
                    onClick={() => setChopMode(m)}
                  >
                    {m === 'transient' ? '⚡ Transient' :
                     m === 'bpmgrid' ? '♩ BPM Grid' :
                     m === 'equal' ? '⊞ Equal' : '✋ Manual'}
                  </button>
                ))}
              </div>
              <div className="si-chop-params">
                {chopMode === 'transient' && (
                  <SVGKnob
                    value={chopSensitivity * 100} min={1} max={100} step={1}
                    onChange={(v) => setChopSensitivity(v / 100)}
                    label="Sensitivity" unit="%" size={42} color="#FF6600"
                  />
                )}
                {chopMode === 'bpmgrid' && (
                  <SVGKnob
                    value={chopBpm} min={40} max={300} step={1}
                    onChange={setChopBpm}
                    label="BPM" size={42} color="#FF6600"
                  />
                )}
                {chopMode === 'equal' && (
                  <SVGKnob
                    value={chopSliceCount} min={2} max={32} step={1}
                    onChange={setChopSliceCount}
                    label="Slices" size={42} color="#FF6600"
                  />
                )}
                {chopMode === 'manual' && (
                  <span className="si-chop-hint">Click waveform to add/remove chop points</span>
                )}
              </div>
              <div className="si-chop-actions">
                <button className="si-btn" onClick={autoChop} disabled={chopMode === 'manual'}>
                  Auto-Chop
                </button>
                <button className="si-btn" onClick={() => setChopPoints([])} disabled={chopPoints.length === 0}>
                  Clear
                </button>
                <span className="si-chop-count">
                  {chopPoints.length} chops → {chopPoints.length + 1} slices
                </span>
              </div>
            </div>
            {/* Slice preview buttons */}
            {chopPoints.length > 0 && (
              <div className="si-chop-slices">
                {Array.from({ length: Math.min(chopPoints.length + 1, 16) }, (_, i) => (
                  <button
                    key={i}
                    className={`si-slice-btn ${activeSlice === i ? 'playing' : ''}`}
                    onClick={() => previewSlice(i)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="si-btn si-btn-beat"
                  onClick={sendSlicesToBeatMaker}
                  title="Send all slices to Beat Maker pads"
                >
                  Slices → Pads
                </button>
              </div>
            )}
          </div>
        ) : sample ? (
          <div className="si-waveform-wrap">
            <canvas
              ref={canvasRef}
              className="si-canvas"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{ cursor: draggingTrim ? 'ew-resize' : 'crosshair' }}
            />
            <div className="si-waveform-info">
              <span>Duration: {fmtTime(sample.duration)}</span>
              <span>Trim: {fmtTime(trimStart)} – {fmtTime(trimEnd)}</span>
              <span>{sample.sampleRate}Hz · {sample.numberOfChannels}ch</span>
            </div>
          </div>
        ) : (
          <div className="si-drop-zone" onClick={() => fileInputRef.current?.click()}>
            <div className="si-drop-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a3848" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="14" rx="2"/>
                <line x1="6" y1="6" x2="6" y2="20"/>
                <line x1="10" y1="6" x2="10" y2="20"/>
                <line x1="14" y1="6" x2="14" y2="20"/>
                <line x1="18" y1="6" x2="18" y2="20"/>
              </svg>
            </div>
            <div className="si-drop-text">Drop audio file here or click to load</div>
            <div className="si-drop-hint">WAV, MP3, OGG, FLAC, AIFF</div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="si-tabs">
        {[
          { key: 'main', label: 'Main' },
          { key: 'envelope', label: 'ADSR' },
          { key: 'filter', label: 'Filter' },
          { key: 'sequencer', label: 'Sequencer' },
          { key: 'settings', label: 'Settings' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`si-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="si-content">
        {/* ── MAIN TAB ── */}
        {activeTab === 'main' && (
          <div className="si-main-controls">
            <div className="si-knob-row">
              <div className="si-root-ctrl">
                <div className="si-knob-label">Root Note</div>
                <div className="si-root-select">
                  <button className="si-root-btn" onClick={() => setRootNote(Math.max(0, rootNote - 1))}>−</button>
                  <span className="si-root-display">{noteLabel(rootNote)}</span>
                  <button className="si-root-btn" onClick={() => setRootNote(Math.min(127, rootNote + 1))}>+</button>
                </div>
              </div>
              <SVGKnob
                value={pitch} min={-24} max={24} step={1}
                onChange={setPitch} label="Pitch" unit="st" size={52}
                bipolar defaultValue={0}
              />
              <SVGKnob
                value={volume * 100} min={0} max={100} step={1}
                onChange={(v) => setVolume(v / 100)} label="Volume" unit="%" size={52}
                defaultValue={80}
              />
              <SVGKnob
                value={trimStart * 1000} min={0} max={sample ? sample.duration * 1000 : 1000} step={1}
                onChange={(v) => setTrimStart(Math.min(v / 1000, trimEnd - 0.001))}
                label="Trim Start" unit="ms" size={52} color="#FF6600"
              />
              <SVGKnob
                value={trimEnd * 1000} min={0} max={sample ? sample.duration * 1000 : 1000} step={1}
                onChange={(v) => setTrimEnd(Math.max(v / 1000, trimStart + 0.001))}
                label="Trim End" unit="ms" size={52} color="#FF6600"
              />
            </div>
            <div className="si-loop-row">
              <label className="si-toggle">
                <input type="checkbox" checked={loopEnabled} onChange={(e) => setLoopEnabled(e.target.checked)} />
                <span className="si-toggle-track"><span className="si-toggle-thumb" /></span>
                Loop
              </label>
              {loopEnabled && (
                <span className="si-loop-info">
                  {fmtTime(loopStart)} – {fmtTime(loopEnd)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── ADSR TAB ── */}
        {activeTab === 'envelope' && (
          <div className="si-adsr-controls">
            <div className="si-adsr-visual">
              <svg viewBox="0 0 220 70" className="si-adsr-svg">
                <defs>
                  <linearGradient id="adsrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffc8" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#00ffc8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* ADSR filled shape */}
                <polygon
                  fill="url(#adsrFill)"
                  points={`0,70 ${Math.min(attack * 100, 50)},5 ${Math.min(attack * 100 + decay * 60, 110)},${70 - sustain * 65} 160,${70 - sustain * 65} ${160 + Math.min(release * 30, 60)},70`}
                />
                {/* ADSR outline */}
                <polyline
                  fill="none"
                  stroke="#00ffc8"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  points={`0,70 ${Math.min(attack * 100, 50)},5 ${Math.min(attack * 100 + decay * 60, 110)},${70 - sustain * 65} 160,${70 - sustain * 65} ${160 + Math.min(release * 30, 60)},70`}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,200,0.4))' }}
                />
                {/* Phase labels */}
                <text x={Math.min(attack * 50, 25)} y={66} fill="#3a5570" fontSize="8" textAnchor="middle">A</text>
                <text x={Math.min(attack * 100 + decay * 30, 80)} y={66} fill="#3a5570" fontSize="8" textAnchor="middle">D</text>
                <text x="135" y={66} fill="#3a5570" fontSize="8" textAnchor="middle">S</text>
                <text x={160 + Math.min(release * 15, 30)} y={66} fill="#3a5570" fontSize="8" textAnchor="middle">R</text>
              </svg>
            </div>
            <div className="si-knob-row">
              <SVGKnob
                value={attack * 1000} min={0} max={2000} step={1}
                onChange={(v) => setAttack(v / 1000)} label="Attack" unit="ms" size={52}
                defaultValue={5}
              />
              <SVGKnob
                value={decay * 1000} min={0} max={2000} step={1}
                onChange={(v) => setDecay(v / 1000)} label="Decay" unit="ms" size={52}
                defaultValue={100}
              />
              <SVGKnob
                value={sustain * 100} min={0} max={100} step={1}
                onChange={(v) => setSustain(v / 100)} label="Sustain" unit="%" size={52}
                defaultValue={80}
              />
              <SVGKnob
                value={release * 1000} min={0} max={5000} step={1}
                onChange={(v) => setRelease(v / 1000)} label="Release" unit="ms" size={52}
                defaultValue={200}
              />
            </div>
          </div>
        )}

        {/* ── FILTER TAB ── */}
        {activeTab === 'filter' && (
          <div className="si-filter-controls">
            <div className="si-filter-header">
              <label className="si-toggle">
                <input type="checkbox" checked={filterEnabled} onChange={(e) => setFilterEnabled(e.target.checked)} />
                <span className="si-toggle-track"><span className="si-toggle-thumb" /></span>
                Filter
              </label>
              <div className="si-filter-types">
                {['lowpass', 'highpass', 'bandpass', 'notch'].map(t => (
                  <button
                    key={t}
                    className={`si-mode-pill ${filterType === t ? 'active' : ''}`}
                    onClick={() => setFilterType(t)}
                    disabled={!filterEnabled}
                  >
                    {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : t === 'bandpass' ? 'BP' : 'Notch'}
                  </button>
                ))}
              </div>
            </div>
            <div className="si-knob-row">
              <SVGKnob
                value={filterFreq} min={20} max={20000} step={1}
                onChange={setFilterFreq} label="Cutoff" unit="Hz" size={56}
                disabled={!filterEnabled}
                color={filterEnabled ? '#ff6b9d' : '#2a3848'}
              />
              <SVGKnob
                value={filterQ} min={0.1} max={20} step={0.1}
                onChange={setFilterQ} label="Resonance" size={56}
                disabled={!filterEnabled}
                color={filterEnabled ? '#ff6b9d' : '#2a3848'}
                formatter={(v) => v.toFixed(1)}
              />
            </div>
          </div>
        )}

        {/* ── SEQUENCER TAB ── */}
        {activeTab === 'sequencer' && (
          <StepSequencer
            sample={sample}
            getCtx={getCtx}
            trimStart={trimStart}
            trimEnd={trimEnd}
            pitch={pitch}
            volume={volume}
            sampleName={sampleName}
            onExportToConsole={onSendToBeatMaker}
            onExportToTrack={onSendToTrack}
          />
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === 'settings' && (
          <div className="si-settings">
            <div className="si-setting-row">
              <span className="si-setting-label">Play Mode</span>
              <div className="si-play-modes">
                {['oneshot', 'hold', 'loop', 'gate'].map(m => (
                  <button
                    key={m}
                    className={`si-mode-pill ${playMode === m ? 'active' : ''}`}
                    onClick={() => setPlayMode(m)}
                  >
                    {m === 'oneshot' ? '▶ One-Shot' : m === 'hold' ? '⏎ Hold' : m === 'loop' ? '🔁 Loop' : '⏏ Gate'}
                  </button>
                ))}
              </div>
            </div>
            <div className="si-setting-row">
              <span className="si-setting-label">Polyphony</span>
              <span className="si-setting-value">Full (per note)</span>
            </div>
            <div className="si-setting-row">
              <span className="si-setting-label">Keyboard</span>
              <span className="si-setting-value">Z–M lower octave · Q–I upper octave</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Mini Keyboard ── */}
      <div className="si-keyboard">
        <div className="si-keyboard-keys">
          {miniKeyboard.filter(k => !k.isBlack).map((key) => (
            <div
              key={key.note}
              className={`si-key white ${key.isRoot ? 'root' : ''} ${activeKeys.has(Object.entries(QWERTY_MAP).find(([_, v]) => v === key.note - Math.floor(rootNote / 12) * 12)?.[0]) ? 'active' : ''}`}
              onMouseDown={() => playNote(key.note)}
              onMouseUp={() => stopNote(key.note)}
              onMouseLeave={() => stopNote(key.note)}
            >
              <span className="si-key-label">{key.name}</span>
              {key.shortcut && <span className="si-key-shortcut">{key.shortcut}</span>}
            </div>
          ))}
          {miniKeyboard.filter(k => k.isBlack).map((key) => {
            const whiteIdx = miniKeyboard.filter(k => !k.isBlack && k.note < key.note).length;
            return (
              <div
                key={key.note}
                className={`si-key black ${activeKeys.has(Object.entries(QWERTY_MAP).find(([_, v]) => v === key.note - Math.floor(rootNote / 12) * 12)?.[0]) ? 'active' : ''}`}
                style={{ left: `${(whiteIdx - 0.3) * (100 / 15)}%` }}
                onMouseDown={() => playNote(key.note)}
                onMouseUp={() => stopNote(key.note)}
                onMouseLeave={() => stopNote(key.note)}
              >
                {key.shortcut && <span className="si-key-shortcut">{key.shortcut}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SamplerInstrument;