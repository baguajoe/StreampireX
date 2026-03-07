// =============================================================================
// StutterEngine.js — Beat-Synced Stutter / Glitch FX
// =============================================================================
// Location: src/front/js/component/StutterEngine.js
//
// A Gross Beat-inspired stutter engine built entirely in Web Audio API.
// Chops selected track audio into BPM-synced slices and triggers them
// through a 16-step pattern grid. Each step can be:
//   PLAY     — normal playback
//   REPEAT   — loop the slice N times
//   REVERSE  — play slice backwards
//   SILENCE  — mute
//   STUTTER↑ — speed up (pitch up)
//   STUTTER↓ — slow down (pitch down)
//   ECHO     — slice + tail decay
//   SCRATCH  — rapid forward/back micro-stutter
//
// Props:
//   audioContext   — shared Web Audio context
//   audioBuffer    — the track's AudioBuffer to stutter
//   outputNode     — destination node
//   bpm            — current project BPM
//   trackName      — display label
//   onClose        — close handler
//   isEmbedded     — boolean, true when used inside RecordingStudio
//
// Integration in RecordingStudio.js:
//   1. import StutterEngine from '../component/StutterEngine';
//   2. Add view tab: viewMode === 'stutter'
//   3. Render panel:
//      {viewMode === 'stutter' && (
//        <StutterEngine
//          audioContext={audioCtxRef.current}
//          audioBuffer={tracks[selectedTrackIndex]?.audioBuffer}
//          outputNode={masterGainRef.current}
//          bpm={bpm}
//          trackName={tracks[selectedTrackIndex]?.name}
//          onClose={() => setViewMode('record')}
//          isEmbedded={true}
//        />
//      )}
//   4. handleMenuAction: case 'view:stutter': setViewMode('stutter'); break;
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STEP_MODES = [
  { id: 'play',     label: 'PLAY',   icon: '▶',  activeColor: '#00ffc8' },
  { id: 'repeat',   label: 'REPT',   icon: '⟳',  activeColor: '#4a9eff' },
  { id: 'reverse',  label: 'REV',    icon: '◀',  activeColor: '#bf5af2' },
  { id: 'silence',  label: 'MUTE',   icon: '—',  activeColor: '#ff6b6b' },
  { id: 'stutter+', label: 'SPD↑',  icon: '⚡',  activeColor: '#ffd60a' },
  { id: 'stutter-', label: 'SPD↓',  icon: '〜',  activeColor: '#ff9500' },
  { id: 'echo',     label: 'ECHO',   icon: '◌',  activeColor: '#30d158' },
  { id: 'scratch',  label: 'SCRCH',  icon: '⟺',  activeColor: '#ff2d55' },
];

const SLICE_SIZES = [
  { label: '1/32', beats: 0.125 },
  { label: '1/16', beats: 0.25  },
  { label: '1/8',  beats: 0.5   },
  { label: '1/4',  beats: 1     },
  { label: '1/2',  beats: 2     },
  { label: '1 bar',beats: 4     },
];

const makeDefaultSteps = () => Array.from({ length: 16 }, (_, i) => ({
  id: i, mode: 'play', active: true, repeatCount: 2, volume: 1.0,
}));

const PRESETS = {
  'Gross Beat': ['repeat','repeat','silence','play','stutter+','repeat','silence','reverse','play','repeat','silence','stutter-','repeat','silence','scratch','play'],
  'Trap Stutter': ['play','play','repeat','silence','play','stutter+','repeat','silence','play','play','silence','repeat','play','play','stutter-','echo'],
  'Glitch Art': ['scratch','silence','stutter+','reverse','repeat','silence','stutter-','scratch','reverse','stutter+','silence','repeat','scratch','stutter-','reverse','silence'],
  'Vinyl Scratch': ['play','scratch','play','scratch','reverse','play','scratch','silence','play','scratch','reverse','play','scratch','play','scratch','play'],
  'Half-Time': ['play','silence','silence','silence','play','silence','silence','silence','repeat','silence','silence','silence','echo','silence','silence','silence'],
  'Clean': Array(16).fill('play'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const StutterEngine = ({
  audioContext, audioBuffer, outputNode,
  bpm = 120, trackName, onClose, isEmbedded,
}) => {
  const [steps, setSteps] = useState(makeDefaultSteps);
  const [sliceSizeIdx, setSliceSizeIdx] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [wet, setWet] = useState(0.85);
  const [swing, setSwing] = useState(0);
  const [masterPitch, setMasterPitch] = useState(1.0);
  const [selectedMode, setSelectedMode] = useState('play');
  const [isPainting, setIsPainting] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [glitchColor, setGlitchColor] = useState(null);
  const [vizData, setVizData] = useState(new Array(32).fill(0));

  // Refs for scheduler (avoids stale closure)
  const schedulerRef   = useRef(null);
  const stepRef        = useRef(0);
  const nextTimeRef    = useRef(0);
  const sourcesRef     = useRef([]);
  const gainNodeRef    = useRef(null);
  const analyserRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const stepsRef       = useRef(steps);
  const bpmRef         = useRef(bpm);
  const sliceRef       = useRef(SLICE_SIZES[sliceSizeIdx]);
  const swingRef       = useRef(swing);
  const wetRef         = useRef(wet);
  const pitchRef       = useRef(masterPitch);

  useEffect(() => { stepsRef.current = steps; },              [steps]);
  useEffect(() => { bpmRef.current = bpm; },                  [bpm]);
  useEffect(() => { sliceRef.current = SLICE_SIZES[sliceSizeIdx]; }, [sliceSizeIdx]);
  useEffect(() => { swingRef.current = swing; },              [swing]);
  useEffect(() => { pitchRef.current = masterPitch; },        [masterPitch]);
  useEffect(() => {
    wetRef.current = wet;
    if (gainNodeRef.current) gainNodeRef.current.gain.setTargetAtTime(wet, audioContext?.currentTime ?? 0, 0.01);
  }, [wet, audioContext]);

  // ── Audio setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioContext || !outputNode) return;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;

    const gain = audioContext.createGain();
    gain.gain.value = wet;
    gainNodeRef.current = gain;

    gain.connect(analyser);
    analyser.connect(outputNode);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      setVizData(Array.from(data).map(v => v / 255));
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      try { gain.disconnect(); analyser.disconnect(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioContext, outputNode]);

  // ── Scheduler ─────────────────────────────────────────────────────────────
  const scheduleStep = useCallback((si, when) => {
    if (!audioContext || !audioBuffer || !gainNodeRef.current) return;

    const step = stepsRef.current[si];
    if (!step.active || step.mode === 'silence') return;

    const sliceBeats = sliceRef.current.beats;
    const sliceSecs  = (sliceBeats / bpmRef.current) * 60;
    const bufDur     = audioBuffer.duration;
    const sliceStart = Math.min(((si * sliceBeats) / 16) * bufDur, bufDur - 0.01);
    const pitch      = pitchRef.current;

    const play = (offset, rate, dur, delay = 0) => {
      if (!gainNodeRef.current) return;
      const src = audioContext.createBufferSource();
      src.buffer = audioBuffer;
      src.playbackRate.value = Math.max(0.05, Math.min(4, rate * pitch));
      const stepGain = audioContext.createGain();
      stepGain.gain.value = step.volume;
      src.connect(stepGain);
      stepGain.connect(gainNodeRef.current);
      src.start(when + delay, Math.max(0, Math.min(offset, bufDur - 0.001)), dur);
      src.stop(when + delay + dur + 0.06);
      sourcesRef.current.push(src);
      src.onended = () => { sourcesRef.current = sourcesRef.current.filter(s => s !== src); };
    };

    switch (step.mode) {
      case 'play':
        play(sliceStart, 1, sliceSecs);
        break;

      case 'repeat': {
        const n = step.repeatCount || 2;
        const d = sliceSecs / n;
        for (let r = 0; r < n; r++) play(sliceStart, 1, d, r * d);
        break;
      }

      case 'reverse': {
        try {
          const sr = audioBuffer.sampleRate;
          const startS = Math.floor(sliceStart * sr);
          const numS   = Math.floor(sliceSecs * sr);
          const revBuf = audioContext.createBuffer(audioBuffer.numberOfChannels, numS, sr);
          for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const orig = audioBuffer.getChannelData(ch);
            const rev  = revBuf.getChannelData(ch);
            for (let i = 0; i < numS; i++) rev[i] = orig[startS + numS - 1 - i] ?? 0;
          }
          const src = audioContext.createBufferSource();
          src.buffer = revBuf;
          src.playbackRate.value = pitch;
          src.connect(gainNodeRef.current);
          src.start(when, 0, sliceSecs);
          src.stop(when + sliceSecs + 0.05);
          sourcesRef.current.push(src);
          src.onended = () => { sourcesRef.current = sourcesRef.current.filter(s => s !== src); };
        } catch (_) {}
        break;
      }

      case 'stutter+':
        play(sliceStart, 1.5, sliceSecs);
        break;

      case 'stutter-':
        play(sliceStart, 0.6, sliceSecs);
        break;

      case 'echo': {
        const decays = 3;
        for (let d = 0; d < decays; d++) {
          const echoGain = audioContext.createGain();
          echoGain.gain.value = step.volume * Math.pow(0.5, d);
          const src = audioContext.createBufferSource();
          src.buffer = audioBuffer;
          src.playbackRate.value = pitch;
          const chunk = sliceSecs / decays;
          src.connect(echoGain);
          echoGain.connect(gainNodeRef.current);
          src.start(when + d * chunk, sliceStart, chunk);
          src.stop(when + d * chunk + chunk + 0.08);
          sourcesRef.current.push(src);
          src.onended = () => { sourcesRef.current = sourcesRef.current.filter(s => s !== src); };
        }
        break;
      }

      case 'scratch': {
        const n = 6;
        const chunk = sliceSecs / n;
        for (let sc = 0; sc < n; sc++) play(sliceStart + (sc % 2) * 0.02, sc % 2 === 0 ? 1.3 : 0.75, chunk, sc * chunk);
        break;
      }

      default:
        play(sliceStart, 1, sliceSecs);
    }
  }, [audioContext, audioBuffer]);

  const runScheduler = useCallback(() => {
    const LOOKAHEAD = 0.12;
    const TICK      = 0.05 * 1000;

    const tick = () => {
      while (nextTimeRef.current < audioContext.currentTime + LOOKAHEAD) {
        const si = stepRef.current % 16;
        setCurrentStep(si);

        const step = stepsRef.current[si];
        if (step.active && step.mode !== 'play' && step.mode !== 'silence') {
          const mc = STEP_MODES.find(m => m.id === step.mode)?.activeColor ?? '#00ffc8';
          setGlitchColor(mc);
          setTimeout(() => setGlitchColor(null), 90);
        }

        const sliceSecs = (sliceRef.current.beats / bpmRef.current) * 60;
        const swingOff  = si % 2 === 1 ? (swingRef.current / 100) * sliceSecs * 0.5 : 0;

        scheduleStep(si, nextTimeRef.current + swingOff);
        nextTimeRef.current += sliceSecs;
        stepRef.current++;
      }
      schedulerRef.current = setTimeout(tick, TICK);
    };

    nextTimeRef.current = audioContext.currentTime;
    tick();
  }, [audioContext, scheduleStep]);

  const startEngine = () => {
    if (!audioBuffer || !audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();
    stepRef.current = 0;
    setIsPlaying(true);
    runScheduler();
  };

  const stopEngine = useCallback(() => {
    clearTimeout(schedulerRef.current);
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (_) {} });
    sourcesRef.current = [];
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  useEffect(() => () => stopEngine(), [stopEngine]);

  // ── Step paint ────────────────────────────────────────────────────────────
  const paintStep = (idx) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, mode: selectedMode, active: true } : s));
  };

  const handleStepClick = (idx) => {
    if (isPainting) { paintStep(idx); return; }
    setActiveStep(prev => prev === idx ? null : idx);
  };

  const handleStepEnter = (idx) => {
    if (isPainting) paintStep(idx);
  };

  const toggleActive = (idx, e) => {
    e.stopPropagation();
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  };

  const applyPreset = (name) => {
    const modes = PRESETS[name]; if (!modes) return;
    setSteps(makeDefaultSteps().map((s, i) => ({ ...s, mode: modes[i] || 'play' })));
    setActiveStep(null);
  };

  const randomize = () => {
    const ids = STEP_MODES.map(m => m.id);
    setSteps(prev => prev.map(s => ({ ...s, mode: ids[Math.floor(Math.random() * ids.length)], active: Math.random() > 0.12 })));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const modeColor = (mode, active) => {
    if (!active) return '#21262d';
    return STEP_MODES.find(m => m.id === mode)?.activeColor ?? '#00ffc8';
  };
  const modeIcon = (mode) => STEP_MODES.find(m => m.id === mode)?.icon ?? '▶';
  const modeLabel = (mode) => STEP_MODES.find(m => m.id === mode)?.label ?? mode;

  const sliceSecs = ((SLICE_SIZES[sliceSizeIdx].beats / bpm) * 60).toFixed(3);
  const activeCount = steps.filter(s => s.active && s.mode !== 'silence').length;

  // Waveform preview peak per slice
  const waveSlices = audioBuffer
    ? Array.from({ length: 16 }, (_, i) => {
        const data = audioBuffer.getChannelData(0);
        const len  = Math.floor(data.length / 16);
        let peak = 0;
        for (let j = i * len; j < i * len + len && j < data.length; j += 6) peak = Math.max(peak, Math.abs(data[j]));
        return peak;
      })
    : new Array(16).fill(0.1);

  // ─── Styles (inline — DAW dark theme, no CSS file needed) ─────────────────
  const S = {
    root: {
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d1117', color: '#cdd9e5',
      fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
      fontSize: '11px', overflow: 'hidden', position: 'relative', userSelect: 'none',
    },
    scanlines: {
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 14px', borderBottom: '1px solid #1c2128',
      background: 'linear-gradient(90deg,#161b22 0%,#0d1117 100%)',
      flexShrink: 0, zIndex: 5, position: 'relative',
    },
  };

  return (
    <div style={S.root} onMouseUp={() => setIsPainting(false)}>

      {/* Scanlines */}
      <div style={S.scanlines} />

      {/* Glitch flash */}
      {glitchColor && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 99, pointerEvents: 'none',
          background: `${glitchColor}10`, borderTop: `2px solid ${glitchColor}`,
          borderBottom: `2px solid ${glitchColor}`,
        }} />
      )}

      {/* ════ HEADER ════ */}
      <div style={S.header}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '18px' }}>
            {['#ff2d55','#ffd60a','#00ffc8','#4a9eff'].map((c, i) => (
              <div key={i} style={{
                width: '4px', borderRadius: '2px 2px 0 0',
                background: isPlaying ? c : '#2d333b',
                height: `${[8,14,18,11][i]}px`,
                transition: 'background 0.2s, height 0.1s',
              }} />
            ))}
          </div>
          <span style={{ color: '#e6edf3', fontWeight: 800, fontSize: '13px', letterSpacing: '0.2em' }}>STUTTER</span>
          <span style={{ color: '#2d333b', fontSize: '9px', letterSpacing: '0.1em' }}>GLITCH ENGINE</span>
        </div>

        {trackName && (
          <div style={{ padding: '2px 8px', background: '#161b22', border: '1px solid #30363d', borderRadius: '4px', color: '#6e7681', fontSize: '9px' }}>
            {trackName}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* BPM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: '#0a0e14', border: '1px solid #21262d', borderRadius: '5px' }}>
          <span style={{ color: '#484f58', fontSize: '9px' }}>BPM</span>
          <span style={{ color: '#ffd60a', fontWeight: 800, fontSize: '14px' }}>{bpm}</span>
        </div>

        {/* Slice size */}
        <div style={{ display: 'flex', gap: '2px', background: '#0a0e14', border: '1px solid #21262d', borderRadius: '5px', padding: '2px' }}>
          {SLICE_SIZES.map((s, i) => (
            <button key={i} onClick={() => setSliceSizeIdx(i)} style={{
              background: sliceSizeIdx === i ? '#21262d' : 'none',
              border: 'none', color: sliceSizeIdx === i ? '#ffd60a' : '#484f58',
              borderRadius: '4px', padding: '3px 8px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '9px', fontWeight: sliceSizeIdx === i ? 800 : 400,
            }}>{s.label}</button>
          ))}
        </div>

        {/* Master pitch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#484f58', fontSize: '9px' }}>PITCH</span>
          <input type="range" min="0.5" max="2" step="0.01" value={masterPitch}
            onChange={e => setMasterPitch(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#bf5af2' }} />
          <span style={{ color: '#bf5af2', fontWeight: 700, fontSize: '10px', minWidth: '36px' }}>×{masterPitch.toFixed(2)}</span>
        </div>

        {/* Wet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#484f58', fontSize: '9px' }}>WET</span>
          <input type="range" min="0" max="1" step="0.01" value={wet}
            onChange={e => setWet(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#00ffc8' }} />
          <span style={{ color: '#00ffc8', fontWeight: 700, fontSize: '10px', minWidth: '30px' }}>{Math.round(wet * 100)}%</span>
        </div>

        {/* Play / Stop */}
        <button onClick={isPlaying ? stopEngine : startEngine} disabled={!audioBuffer}
          style={{
            background: isPlaying ? '#ff2d55' : '#00ffc8',
            color: isPlaying ? '#fff' : '#0d1117',
            border: 'none', borderRadius: '6px', padding: '7px 18px',
            cursor: audioBuffer ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 800,
            letterSpacing: '0.08em', opacity: audioBuffer ? 1 : 0.4,
            boxShadow: isPlaying ? '0 0 20px rgba(255,45,85,0.55)' : '0 0 14px rgba(0,255,200,0.35)',
            transition: 'all 0.12s',
          }}>
          {isPlaying ? '■ STOP' : '▶ START'}
        </button>

        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #30363d', color: '#6e7681', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11px' }}>✕</button>
        )}
      </div>

      {/* ════ BODY ════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 2 }}>

        {/* ── Mode palette row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderBottom: '1px solid #1c2128', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.12em', marginRight: '4px' }}>MODE SELECT</span>
          {STEP_MODES.map(m => (
            <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
              background: selectedMode === m.id ? `${m.activeColor}20` : 'none',
              border: `1px solid ${selectedMode === m.id ? m.activeColor : '#21262d'}`,
              color: selectedMode === m.id ? m.activeColor : '#484f58',
              borderRadius: '5px', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '10px', fontWeight: selectedMode === m.id ? 800 : 400,
              boxShadow: selectedMode === m.id ? `0 0 10px ${m.activeColor}40` : 'none',
              display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.1s',
            }}>
              <span style={{ fontSize: '13px' }}>{m.icon}</span>{m.label}
            </button>
          ))}

          <div style={{ width: '1px', height: '22px', background: '#21262d', margin: '0 3px' }} />

          <button
            onMouseDown={() => setIsPainting(true)}
            onMouseUp={() => setIsPainting(false)}
            style={{
              background: isPainting ? '#ffd60a20' : 'none',
              border: `1px solid ${isPainting ? '#ffd60a' : '#30363d'}`,
              color: isPainting ? '#ffd60a' : '#484f58',
              borderRadius: '5px', padding: '4px 12px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '10px', fontWeight: 800,
              boxShadow: isPainting ? '0 0 12px rgba(255,214,10,0.4)' : 'none',
            }}>
            🖌 PAINT
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ color: '#484f58', fontSize: '9px' }}>SWING</span>
          <input type="range" min="0" max="70" step="1" value={swing}
            onChange={e => setSwing(parseInt(e.target.value))}
            style={{ width: '70px', accentColor: '#ff9500' }} />
          <span style={{ color: '#ff9500', fontWeight: 700, fontSize: '10px', minWidth: '28px' }}>{swing}%</span>
        </div>

        {/* ── Step grid ── */}
        <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
          {/* Beat numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{ textAlign: 'center', color: i % 4 === 0 ? '#ffd60a' : '#2d333b', fontSize: '8px', fontWeight: i % 4 === 0 ? 800 : 400 }}>
                {i % 4 === 0 ? i / 4 + 1 : '·'}
              </div>
            ))}
          </div>

          {/* Waveform mini preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px', height: '22px', alignItems: 'flex-end', marginBottom: '5px' }}>
            {waveSlices.map((peak, i) => (
              <div key={i} style={{
                background: currentStep === i && isPlaying ? modeColor(steps[i]?.mode, steps[i]?.active) : '#21262d',
                height: `${Math.max(10, peak * 100)}%`,
                borderRadius: '2px 2px 0 0',
                opacity: steps[i]?.active ? 1 : 0.25,
                transition: 'background 0.04s',
              }} />
            ))}
          </div>

          {/* Step pads */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px' }}>
            {steps.map((step, i) => {
              const mc       = modeColor(step.mode, step.active);
              const isActive = currentStep === i && isPlaying;
              return (
                <div
                  key={i}
                  onClick={() => handleStepClick(i)}
                  onMouseEnter={() => handleStepEnter(i)}
                  style={{
                    position: 'relative', aspectRatio: '1', borderRadius: '7px',
                    border: `1px solid ${isActive ? mc : step.active ? `${mc}70` : '#1c2128'}`,
                    background: isActive ? mc : step.active ? `${mc}14` : '#0f1318',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    transition: 'all 0.05s',
                    boxShadow: isActive ? `0 0 18px ${mc}, 0 0 5px ${mc}` : step.active ? `inset 0 0 10px ${mc}10` : 'none',
                    transform: isActive ? 'scale(1.07)' : 'scale(1)',
                  }}
                >
                  {/* Beat marker stripe */}
                  {i % 4 === 0 && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: isActive ? '#fff' : '#ffd60a40', borderRadius: '7px 7px 0 0' }} />
                  )}

                  {/* Icon */}
                  <span style={{
                    fontSize: '15px', lineHeight: 1,
                    color: isActive ? (step.mode === 'silence' ? '#fff' : '#0d1117') : step.active ? mc : '#2d333b',
                    textShadow: isActive ? '0 0 6px rgba(0,0,0,0.5)' : 'none',
                  }}>{modeIcon(step.mode)}</span>

                  {/* Label */}
                  <span style={{
                    fontSize: '7px', fontWeight: 800, marginTop: '2px', letterSpacing: '0.04em',
                    color: isActive ? (step.mode === 'silence' ? '#fff' : '#0d1117') : step.active ? `${mc}cc` : '#2d333b',
                  }}>{modeLabel(step.mode)}</span>

                  {/* Step number */}
                  <span style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '7px', color: isActive ? 'rgba(0,0,0,0.5)' : '#2d333b' }}>{i + 1}</span>

                  {/* Active dot */}
                  <div onClick={e => toggleActive(i, e)} style={{
                    position: 'absolute', top: '3px', left: '3px',
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: step.active ? mc : '#21262d', cursor: 'pointer',
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom panels ── */}
        <div style={{ display: 'flex', gap: '10px', padding: '0 14px 10px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Step detail panel */}
          <div style={{ width: '210px', flexShrink: 0, background: '#0a0e14', border: '1px solid #1c2128', borderRadius: '8px', padding: '10px', overflow: 'auto' }}>
            {activeStep !== null ? (
              <>
                <div style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #1c2128' }}>
                  STEP {activeStep + 1} — <span style={{ color: modeColor(steps[activeStep]?.mode, true) }}>{modeLabel(steps[activeStep]?.mode)}</span>
                </div>

                {/* Mode buttons */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#484f58', fontSize: '9px', marginBottom: '4px' }}>MODE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                    {STEP_MODES.map(m => (
                      <button key={m.id}
                        onClick={() => setSteps(prev => prev.map((s, i) => i === activeStep ? { ...s, mode: m.id } : s))}
                        style={{
                          background: steps[activeStep]?.mode === m.id ? `${m.activeColor}22` : 'none',
                          border: `1px solid ${steps[activeStep]?.mode === m.id ? m.activeColor : '#21262d'}`,
                          color: steps[activeStep]?.mode === m.id ? m.activeColor : '#484f58',
                          borderRadius: '4px', padding: '3px 6px', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: '8px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                        <span>{m.icon}</span>{m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repeat count */}
                {steps[activeStep]?.mode === 'repeat' && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#484f58', fontSize: '9px', marginBottom: '4px' }}>REPEAT COUNT</div>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {[2,3,4,6,8].map(n => (
                        <button key={n}
                          onClick={() => setSteps(prev => prev.map((s, i) => i === activeStep ? { ...s, repeatCount: n } : s))}
                          style={{
                            background: steps[activeStep]?.repeatCount === n ? '#4a9eff20' : 'none',
                            border: `1px solid ${steps[activeStep]?.repeatCount === n ? '#4a9eff' : '#21262d'}`,
                            color: steps[activeStep]?.repeatCount === n ? '#4a9eff' : '#484f58',
                            borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: 800,
                          }}>×{n}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Volume */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#484f58', fontSize: '9px', marginBottom: '3px' }}>VOLUME</div>
                  <input type="range" min="0" max="1" step="0.01" value={steps[activeStep]?.volume ?? 1}
                    onChange={e => setSteps(prev => prev.map((s, i) => i === activeStep ? { ...s, volume: parseFloat(e.target.value) } : s))}
                    style={{ width: '100%', accentColor: '#00ffc8' }} />
                  <span style={{ color: '#00ffc8', fontSize: '9px' }}>{Math.round((steps[activeStep]?.volume ?? 1) * 100)}%</span>
                </div>

                {/* Enable / Mute */}
                <button
                  onClick={() => setSteps(prev => prev.map((s, i) => i === activeStep ? { ...s, active: !s.active } : s))}
                  style={{
                    width: '100%', padding: '5px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '9px', fontWeight: 800, borderRadius: '5px', border: 'none',
                    background: steps[activeStep]?.active ? '#ff6b6b20' : '#00ffc820',
                    color: steps[activeStep]?.active ? '#ff6b6b' : '#00ffc8',
                  }}>
                  {steps[activeStep]?.active ? '⊘ MUTE STEP' : '✓ ENABLE STEP'}
                </button>
              </>
            ) : (
              <div style={{ color: '#2d333b', fontSize: '10px', textAlign: 'center', paddingTop: '30px', lineHeight: 1.8 }}>
                Click any step<br/>to edit details
              </div>
            )}
          </div>

          {/* Right: viz + presets */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>

            {/* Frequency visualizer */}
            <div style={{ flex: 1, background: '#0a0e14', border: '1px solid #1c2128', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'flex-end', gap: '2px', overflow: 'hidden', minHeight: '60px' }}>
              {vizData.map((v, i) => {
                const mc = currentStep >= 0 && isPlaying
                  ? modeColor(steps[currentStep]?.mode, steps[currentStep]?.active)
                  : '#21262d';
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: `${Math.max(4, v * 100)}%`,
                    background: `linear-gradient(to top, ${mc}, ${mc}55)`,
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.05s, background 0.08s',
                    boxShadow: v > 0.65 ? `0 0 6px ${mc}88` : 'none',
                  }} />
                );
              })}
            </div>

            {/* Presets */}
            <div style={{ background: '#0a0e14', border: '1px solid #1c2128', borderRadius: '8px', padding: '10px', flexShrink: 0 }}>
              <div style={{ color: '#484f58', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '7px' }}>PRESETS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {Object.keys(PRESETS).map(name => (
                  <button key={name} onClick={() => applyPreset(name)} style={{
                    background: 'none', border: '1px solid #21262d', color: '#6e7681',
                    borderRadius: '5px', padding: '4px 11px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '9px', fontWeight: 700, transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = '#00ffc8'; e.target.style.color = '#00ffc8'; }}
                    onMouseLeave={e => { e.target.style.borderColor = '#21262d'; e.target.style.color = '#6e7681'; }}>
                    {name}
                  </button>
                ))}
                <button onClick={randomize} style={{
                  background: 'none', border: '1px solid #ff2d55', color: '#ff2d55',
                  borderRadius: '5px', padding: '4px 11px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '9px', fontWeight: 800, transition: 'all 0.1s',
                }}
                  onMouseEnter={e => { e.target.style.background = '#ff2d5518'; }}
                  onMouseLeave={e => { e.target.style.background = 'none'; }}>
                  ⚡ RANDOM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ FOOTER ════ */}
      <div style={{
        borderTop: '1px solid #1c2128', padding: '5px 14px',
        display: 'flex', gap: '12px', alignItems: 'center',
        color: '#3d444d', fontSize: '9px', letterSpacing: '0.07em',
        flexShrink: 0, background: '#0a0e14', zIndex: 5,
      }}>
        <span style={{ color: '#2d333b' }}>STUTTER ENGINE v1.0</span>
        <span>•</span>
        <span>SLICE <span style={{ color: '#ffd60a' }}>{SLICE_SIZES[sliceSizeIdx].label}</span></span>
        <span>•</span>
        <span>STEP TIME <span style={{ color: '#4a9eff' }}>{sliceSecs}s</span></span>
        <span>•</span>
        <span>ACTIVE <span style={{ color: '#00ffc8' }}>{activeCount}/16</span></span>
        <div style={{ flex: 1 }} />
        {!audioBuffer && (
          <span style={{ color: '#ff6b6b', fontWeight: 800 }}>⚠ NO AUDIO BUFFER — RECORD OR IMPORT A TRACK FIRST</span>
        )}
        {isPlaying && (
          <span style={{ color: '#ff2d55', fontWeight: 800 }}>● LIVE  STEP {currentStep + 1}</span>
        )}
      </div>
    </div>
  );
};

export default StutterEngine;