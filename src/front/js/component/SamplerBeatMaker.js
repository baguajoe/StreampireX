// =============================================================================
// SamplerBeatMaker.js — Main Shell (rebuilt clean)
// 3 Tabs: 🎛️ Sampler | 🎹 Drum Pads | 🥁 Beat Maker
// Shared: toolbar, transport, overlays, audio engine
// NEW: R2 cloud storage, sharing, kit browser, auto-save
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import useSamplerEngine, {
  PAD_COUNT, PAD_COLORS, PAD_KEY_LABELS, CHROMATIC_KEYS,
  STEP_COUNTS, FORMAT_INFO, CHOP_MODES,
} from './useSamplerEngine';
import {
  SCALES, CHORD_TYPES, NOTE_REPEAT_RATES,
  snapToScale, getChordNotes, noteRepeatInterval,
  rollEnvelope, applyTapeStop, applyTapeStart, filterSweepParams,
} from './PerformanceEngine';
import { aiSampleSuggestion, aiChopAssistant, VocalBeatMapper } from './AIEngine';
import useSamplerStorage from './useSamplerStorage';
import SamplerTab from './tabs/SamplerTab';
import DrumPadTab from './tabs/DrumPadTab';
import BeatMakerTab from './tabs/BeatMakerTab';
import ChopView from './ChopView';
import '../../styles/SamplerBeatMaker.css';
import '../../styles/SamplerBeatMaker-compat.css';

const SamplerBeatMaker = (props) => {
  const {
    projectBpm = 120, projectKey = 'C', projectScale = 'major',
    onExport, onSendToArrange, onExportToArrange, onBpmSync, onKeySync,
    onClose,
  } = props;

  // ── Engine ──
  const engine = useSamplerEngine({
    projectBpm, projectKey, projectScale,
    onExport, onSendToArrange, onExportToArrange, onBpmSync, onKeySync,
  });

  // ── Cloud Storage ──
  const storage = useSamplerStorage({
    engine,
    onStatus: (msg) => engine.setExportStatus(msg),
  });

  // ── Primary Tab ──
  const [primaryTab, setPrimaryTab] = useState('sampler'); // sampler | pads | beats

  // ── Performance State ──
  const [noteRepeatOn, setNoteRepeatOn] = useState(false);
  const [noteRepeatRate, setNoteRepeatRate] = useState(4); // div
  const noteRepeatTimers = useRef({});

  const [rollOn, setRollOn] = useState(false);
  const [tapeStopOn, setTapeStopOn] = useState(false);

  const [filterSweepOn, setFilterSweepOn] = useState(false);
  const [filterSweepVal, setFilterSweepVal] = useState(0.5);
  const sweepNodeRef = useRef(null);

  const [liveLoopState, setLiveLoopState] = useState('idle'); // idle | recording | playing
  const loopRecRef = useRef(null);
  const loopBufRef = useRef(null);
  const loopSrcRef = useRef(null);

  const [scaleLockOn, setScaleLockOn] = useState(false);
  const [scaleLockRoot, setScaleLockRoot] = useState(0); // C
  const [scaleLockScale, setScaleLockScale] = useState('major');

  const [chordModeOn, setChordModeOn] = useState(false);
  const [chordType, setChordType] = useState('triad');
  const [chordInversion, setChordInversion] = useState(0);

  // ── AI State ──
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [aiChopResult, setAiChopResult] = useState(null);
  const [showAiChop, setShowAiChop] = useState(false);
  const [vocalBeatOn, setVocalBeatOn] = useState(false);
  const [vocalBeatStatus, setVocalBeatStatus] = useState('');
  const vocalMapperRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // AUTO-SAVE: Mark dirty on meaningful state changes
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (storage.projectId) {
      storage.markDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.bpm, engine.swing, engine.masterVol, engine.patterns, engine.songSeq, engine.scenes]);

  // ═══════════════════════════════════════════════════════════
  // PERFORMANCE CALLBACKS
  // ═══════════════════════════════════════════════════════════

  const startNoteRepeat = useCallback((pi) => {
    if (noteRepeatTimers.current[pi]) return;
    const interval = noteRepeatInterval(engine.bpm, noteRepeatRate) * 1000;
    engine.playPad(pi, 0.8);
    if (engine.liveRec) engine.handleLiveHit(pi);
    noteRepeatTimers.current[pi] = setInterval(() => {
      engine.playPad(pi, 0.7);
      if (engine.liveRec) engine.handleLiveHit(pi);
    }, interval);
  }, [engine, noteRepeatRate]);

  const stopNoteRepeat = useCallback((pi) => {
    if (noteRepeatTimers.current[pi]) {
      clearInterval(noteRepeatTimers.current[pi]);
      delete noteRepeatTimers.current[pi];
    }
  }, []);

  const stopAllNoteRepeats = useCallback(() => {
    Object.keys(noteRepeatTimers.current).forEach(k => {
      clearInterval(noteRepeatTimers.current[k]);
    });
    noteRepeatTimers.current = {};
  }, []);

  const triggerRoll = useCallback((pi, count = 8) => {
    const env = rollEnvelope(count, 1, 0.15, 'exponential');
    const interval = noteRepeatInterval(engine.bpm, noteRepeatRate) * 1000;
    env.forEach((vel, i) => {
      setTimeout(() => engine.playPad(pi, vel), i * interval);
    });
  }, [engine, noteRepeatRate]);

  const triggerTapeStop = useCallback(() => {
    const ctx = engine.ctxRef.current;
    if (!ctx) return;
    setTapeStopOn(true);
    Object.values(engine.activeSrc.current).forEach(({ source, gain }) => {
      applyTapeStop(ctx, source, gain, 0.8);
    });
    setTimeout(() => setTapeStopOn(false), 1000);
  }, [engine]);

  const toggleFilterSweep = useCallback(() => {
    const ctx = engine.initCtx();
    if (filterSweepOn) {
      if (sweepNodeRef.current) {
        try { sweepNodeRef.current.disconnect(); } catch (e) { }
        sweepNodeRef.current = null;
      }
      setFilterSweepOn(false);
    } else {
      const f = ctx.createBiquadFilter();
      const p = filterSweepParams(filterSweepVal);
      f.type = p.type;
      f.frequency.value = p.freq;
      f.Q.value = p.q;
      engine.masterRef.current.disconnect();
      engine.masterRef.current.connect(f);
      f.connect(ctx.destination);
      sweepNodeRef.current = f;
      setFilterSweepOn(true);
    }
  }, [engine, filterSweepOn, filterSweepVal]);

  const updateFilterSweep = useCallback((val) => {
    setFilterSweepVal(val);
    if (sweepNodeRef.current) {
      const p = filterSweepParams(val);
      sweepNodeRef.current.type = p.type;
      sweepNodeRef.current.frequency.value = p.freq;
      sweepNodeRef.current.Q.value = p.q;
    }
  }, []);

  // Live Looper
  const startLoopRec = useCallback(async () => {
    const ctx = engine.initCtx();
    try {
      const dest = ctx.createMediaStreamDestination();
      engine.masterRef.current.connect(dest);
      const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const ab = await blob.arrayBuffer();
        loopBufRef.current = await ctx.decodeAudioData(ab);
        setLiveLoopState('idle');
      };
      rec.start(100);
      loopRecRef.current = rec;
      setLiveLoopState('recording');
    } catch (e) {
      console.error('Loop rec error:', e);
    }
  }, [engine]);

  const stopLoopRec = useCallback(() => {
    if (loopRecRef.current?.state === 'recording') loopRecRef.current.stop();
    setLiveLoopState('idle');
  }, []);

  const playLoop = useCallback(() => {
    if (!loopBufRef.current) return;
    const ctx = engine.initCtx();
    const src = ctx.createBufferSource();
    src.buffer = loopBufRef.current;
    src.loop = true;
    src.connect(engine.masterRef.current);
    src.start();
    loopSrcRef.current = src;
    setLiveLoopState('playing');
  }, [engine]);

  const stopLoop = useCallback(() => {
    if (loopSrcRef.current) {
      try { loopSrcRef.current.stop(); } catch (e) { }
      loopSrcRef.current = null;
    }
    setLiveLoopState('idle');
  }, []);

  // ═══════════════════════════════════════════════════════════
  // AI CALLBACKS
  // ═══════════════════════════════════════════════════════════

  const runAiSuggest = useCallback(() => {
    const result = aiSampleSuggestion(engine.pads);
    setAiSuggestions(result);
    setShowAiSuggest(true);
  }, [engine.pads]);

  const runAiChop = useCallback(() => {
    if (engine.selectedPad === null) return;
    const pad = engine.pads[engine.selectedPad];
    if (!pad?.buffer) return;
    const result = aiChopAssistant(pad.buffer, engine.bpm);
    setAiChopResult(result);
    setShowAiChop(true);
  }, [engine]);

  const applyAiChop = useCallback((style) => {
    if (!style?.chops?.length || engine.selectedPad === null) return;
    engine.setChopPts(style.chops);
    engine.openChop(engine.selectedPad);
    setShowAiChop(false);
  }, [engine]);

  const startVocalBeat = useCallback(async () => {
    const ctx = engine.initCtx();
    const mapper = new VocalBeatMapper(ctx, {
      onPadTrigger: (pi, vel) => {
        engine.playPad(pi, vel);
        if (engine.liveRec) engine.handleLiveHit(pi);
      },
      onPitchDetected: (info) => {
        setVocalBeatStatus(`🎤 ${info.rms > 0.3 ? '●' : '○'} Pad ${info.padIdx + 1}`);
      },
    });
    await mapper.start();
    vocalMapperRef.current = mapper;
    setVocalBeatOn(true);
    setVocalBeatStatus('🎤 Listening...');
  }, [engine]);

  const stopVocalBeat = useCallback(() => {
    if (vocalMapperRef.current) {
      vocalMapperRef.current.stop();
      vocalMapperRef.current = null;
    }
    setVocalBeatOn(false);
    setVocalBeatStatus('');
  }, []);

  // ═══════════════════════════════════════════════════════════
  // PAD INTERACTION (with performance mode awareness)
  // ═══════════════════════════════════════════════════════════

  const handlePadDown = useCallback((pi) => {
    if (noteRepeatOn && primaryTab === 'pads') {
      startNoteRepeat(pi);
    } else if (rollOn && primaryTab === 'pads') {
      triggerRoll(pi);
    } else if (chordModeOn && engine.pads[pi]?.programType === 'keygroup') {
      const root = engine.pads[pi]?.rootNote || 60;
      const notes = getChordNotes(root, chordType, chordInversion);
      notes.forEach(n => engine.playPadKeygroup(pi, n, 0.8));
    } else if (scaleLockOn && engine.pads[pi]?.programType === 'keygroup') {
      const note = snapToScale(engine.pads[pi]?.rootNote || 60, scaleLockRoot, scaleLockScale);
      engine.playPadKeygroup(pi, note, 0.8);
    } else {
      engine.playPad(pi, 0.8);
    }
    if (engine.liveRec) engine.handleLiveHit(pi);
    engine.setSelectedPad(pi);
  }, [engine, primaryTab, noteRepeatOn, rollOn, chordModeOn, scaleLockOn,
    startNoteRepeat, triggerRoll, chordType, chordInversion, scaleLockRoot, scaleLockScale]);

  const handlePadUp = useCallback((pi) => {
    if (noteRepeatOn) stopNoteRepeat(pi);
    if (engine.pads[pi]?.playMode === 'hold') engine.stopPad(pi);
  }, [engine, noteRepeatOn, stopNoteRepeat]);

  // ═══════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    return () => {
      stopAllNoteRepeats();
      stopVocalBeat();
      if (sweepNodeRef.current) try { sweepNodeRef.current.disconnect(); } catch (e) { }
      if (loopSrcRef.current) try { loopSrcRef.current.stop(); } catch (e) { }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const padKeys = '1234qwerasdfzxcv';
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const ki = padKeys.indexOf(e.key.toLowerCase());
      if (ki >= 0) { e.preventDefault(); handlePadDown(ki); return; }
      if (e.key === ' ') { e.preventDefault(); engine.togglePlay(); }
      // Ctrl+S = save project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        storage.saveProject();
      }
    };
    const handleKeyUp = (e) => {
      const padKeys = '1234qwerasdfzxcv';
      const ki = padKeys.indexOf(e.key.toLowerCase());
      if (ki >= 0) handlePadUp(ki);
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePadDown, handlePadUp, engine.togglePlay, storage.saveProject]);

  // ── Performance props bundle ──
  const perfProps = {
    noteRepeatOn, setNoteRepeatOn, noteRepeatRate, setNoteRepeatRate,
    rollOn, setRollOn, tapeStopOn, triggerTapeStop,
    filterSweepOn, toggleFilterSweep, filterSweepVal, updateFilterSweep,
    liveLoopState, startLoopRec, stopLoopRec, playLoop, stopLoop, loopBufRef,
    scaleLockOn, setScaleLockOn, scaleLockRoot, setScaleLockRoot,
    scaleLockScale, setScaleLockScale,
    chordModeOn, setChordModeOn, chordType, setChordType,
    chordInversion, setChordInversion,
    stopAllNoteRepeats,
  };

  // ── AI props bundle ──
  const aiProps = {
    aiSuggestions, showAiSuggest, setShowAiSuggest, runAiSuggest,
    aiChopResult, showAiChop, setShowAiChop, runAiChop, applyAiChop,
    vocalBeatOn, vocalBeatStatus, startVocalBeat, stopVocalBeat,
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="sbm-root" onDragOver={(e) => { e.preventDefault(); engine.setDragActive(true); }}
      onDragLeave={() => engine.setDragActive(false)}
      onDrop={(e) => { e.preventDefault(); engine.setDragActive(false); }}>

      {/* ── Mic Recording Indicator ── */}
      {engine.micRec && (
        <div className="sbm-mic-bar">
          🎤 Recording to Pad {(engine.micPad || 0) + 1}...
          <button onClick={engine.stopMicRec}>■ Stop</button>
        </div>
      )}
      {engine.micCount > 0 && (
        <div className="sbm-mic-countdown">{engine.micCount}</div>
      )}

      {/* ── Vocal Beat Status ── */}
      {vocalBeatOn && (
        <div className="sbm-vocal-bar">
          {vocalBeatStatus}
          <button onClick={stopVocalBeat}>■ Stop</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TOP BAR: Title + File Buttons + Tabs + Transport */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="sbm-topbar">
        <div className="sbm-topbar-left">
          <span className="sbm-title">🎯 Sampler</span>

          {/* ── Cloud Storage Buttons ── */}
          <button className="sbm-btn-sm" onClick={storage.newProject} title="New Project">🆕</button>
          <button className="sbm-btn-sm" onClick={storage.loadProjectList} title="Open Project">📂</button>
          <button className="sbm-btn-sm" onClick={storage.saveProject}
            disabled={storage.saving} title="Save Project (Ctrl+S)"
            style={{ color: storage.dirty ? '#ffaa00' : undefined }}>
            {storage.saving ? '⏳' : '💾'}
          </button>
          <button className="sbm-btn-sm" onClick={() => storage.shareProject('view', true)}
            title="Share Beat">🔗</button>

          {/* ── Project Name (editable) ── */}
          <input
            className="sbm-project-name"
            value={storage.projectName}
            onChange={(e) => storage.setProjectName(e.target.value)}
            onBlur={() => { if (storage.projectId) storage.markDirty(); }}
            placeholder="Untitled Beat"
            style={{
              background: 'transparent', border: '1px solid #1a2636', borderRadius: 4,
              color: '#ddeeff', padding: '2px 6px', fontSize: '0.7rem', width: 130, outline: 'none',
            }}
          />

          {/* ── Auto-save indicator ── */}
          {storage.projectId && (
            <span style={{ fontSize: '0.55rem', color: storage.dirty ? '#ffaa00' : '#2a5a3a', marginLeft: 2 }}>
              {storage.dirty ? '● unsaved' : '✓ saved'}
            </span>
          )}

          <div style={{ width: 1, height: 16, background: '#1a2636', margin: '0 4px' }} />

          {/* Pattern selector */}
          <select className="sbm-pattern-sel"
            value={engine.curPatIdx}
            onChange={(e) => engine.setCurPatIdx(+e.target.value)}>
            {engine.patterns.map((p, i) => (
              <option key={p.id} value={i}>{p.name}</option>
            ))}
          </select>
          <button className="sbm-btn-sm" onClick={engine.addPattern} title="Add Pattern">+</button>
          <button className="sbm-btn-sm" onClick={() => engine.dupPattern(engine.curPatIdx)} title="Duplicate">⧉</button>
        </div>

        {/* Primary Tabs */}
        <div className="sbm-primary-tabs">
          <button className={`sbm-tab ${primaryTab === 'sampler' ? 'active' : ''}`}
            onClick={() => setPrimaryTab('sampler')}>🎛️ Sampler</button>
          <button className={`sbm-tab ${primaryTab === 'pads' ? 'active' : ''}`}
            onClick={() => setPrimaryTab('pads')}>🎹 Drum Pads</button>
          <button className={`sbm-tab ${primaryTab === 'beats' ? 'active' : ''}`}
            onClick={() => setPrimaryTab('beats')}>🥁 Beat Maker</button>
        </div>

        {/* Transport */}
        <div className="sbm-topbar-right">
          <button className={`sbm-transport-btn ${engine.isPlaying ? 'playing' : ''}`}
            onClick={engine.togglePlay}>
            {engine.isPlaying ? '⏸' : '▶'}
          </button>
          <button className={`sbm-transport-btn ${engine.liveRec ? 'rec-active' : ''}`}
            onClick={engine.liveRec ? engine.stopLiveRec : engine.startLiveRec}>●</button>
          <span className="sbm-ovr-label" onClick={() => engine.setOverdub(!engine.overdub)}
            style={{ color: engine.overdub ? '#ff4444' : '#888' }}>OVR</span>

          <button className="sbm-btn-sm" onClick={() => engine.setBpm(Math.max(20, engine.bpm - 1))}>−</button>
          <span className="sbm-bpm-display">{engine.bpm}</span>
          <span className="sbm-bpm-unit">BPM</span>
          <button className="sbm-btn-sm" onClick={() => engine.setBpm(Math.min(300, engine.bpm + 1))}>+</button>
          <button className="sbm-btn-sm" onClick={engine.tapTempo}>TAP</button>

          <span className="sbm-swing-label">Swing</span>
          <input type="range" className="sbm-swing-slider" min="0" max="100"
            value={engine.swing} onChange={(e) => engine.setSwing(+e.target.value)} />
          <span className="sbm-swing-val">{engine.swing}%</span>

          <button className={`sbm-btn-sm ${engine.metOn ? 'active' : ''}`}
            onClick={() => engine.setMetOn(!engine.metOn)} title="Metronome">🔔</button>
          <button className={`sbm-btn-sm ${engine.looping ? 'active' : ''}`}
            onClick={() => engine.setLooping(!engine.looping)} title="Loop">🔁</button>

          {/* Volume */}
          <span className="sbm-vol-icon">🔊</span>
          <input type="range" className="sbm-vol-slider" min="0" max="1" step="0.01"
            value={engine.masterVol} onChange={(e) => engine.setMasterVol(+e.target.value)} />

          {onClose && <button className="sbm-btn-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* DEVICE BAR (shared) */}
      {/* ════════════════════════════════════════════════════════ */}
      {engine.showDevices && (
        <div className="sbm-device-bar">
          <label>Input:
            <select value={engine.selIn} onChange={(e) => engine.setSelIn(e.target.value)}>
              <option value="default">Default Mic</option>
              {engine.devices.inputs.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
          </label>
          <span className="sbm-device-status">Ready</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB CONTENT */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="sbm-tab-content">
        {primaryTab === 'sampler' && (
          <SamplerTab
            engine={engine}
            handlePadDown={handlePadDown}
            handlePadUp={handlePadUp}
            aiProps={aiProps}
          />
        )}
        {primaryTab === 'pads' && (
          <DrumPadTab
            engine={engine}
            handlePadDown={handlePadDown}
            handlePadUp={handlePadUp}
            perfProps={perfProps}
            aiProps={aiProps}
          />
        )}
        {primaryTab === 'beats' && (
          <BeatMakerTab
            engine={engine}
            handlePadDown={handlePadDown}
            handlePadUp={handlePadUp}
          />
        )}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SHARED OVERLAYS */}
      {/* ════════════════════════════════════════════════════════ */}

      {/* Mixer */}
      {engine.showMixer && (
        <div className="sbm-overlay" onClick={() => engine.setShowMixer(false)}>
          <div className="sbm-panel sbm-mixer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Mixer</span>
              <button onClick={() => engine.setShowMixer(false)}>✕</button>
            </div>
            <div className="sbm-mixer-grid">
              {engine.pads.map((pad, i) => (
                <div key={i} className="sbm-mixer-ch">
                  <div className="sbm-mixer-label" style={{ color: pad.color }}>
                    {pad.name}
                  </div>
                  <input type="range" className="sbm-mixer-fader" min="0" max="1" step="0.01"
                    value={pad.volume}
                    onChange={(e) => engine.updatePad(i, { volume: +e.target.value })} />
                  <div className="sbm-mixer-val">{Math.round(pad.volume * 100)}</div>
                  <input type="range" className="sbm-mixer-pan" min="-1" max="1" step="0.01"
                    value={pad.pan}
                    onChange={(e) => engine.updatePad(i, { pan: +e.target.value })} />
                  <div className="sbm-mixer-btns">
                    <button className={pad.muted ? 'muted' : ''}
                      onClick={() => engine.updatePad(i, { muted: !pad.muted })}>M</button>
                    <button className={pad.soloed ? 'soloed' : ''}
                      onClick={() => engine.updatePad(i, { soloed: !pad.soloed })}>S</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Panel */}
      {engine.showExportPanel && (
        <div className="sbm-overlay" onClick={() => engine.setShowExportPanel(false)}>
          <div className="sbm-panel sbm-export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Export</span>
              <button onClick={() => engine.setShowExportPanel(false)}>✕</button>
            </div>
            <div className="sbm-export-options">
              <button onClick={() => engine.exportBeat('wav')}>💾 WAV (Lossless)</button>
              <button onClick={() => engine.exportBeat('mp3')}>💾 MP3</button>
              <button onClick={engine.exportStems}>📂 Stems</button>
              <button onClick={engine.exportMIDI}>🎹 MIDI</button>
              {engine.onSendToArrange && (
                <button onClick={engine.bounceToArrange}>→ Arrange</button>
              )}
            </div>
            {engine.exportStatus && <div className="sbm-export-status">{engine.exportStatus}</div>}
          </div>
        </div>
      )}

      {/* Song Mode */}
      {engine.songMode && (
        <div className="sbm-overlay" onClick={() => engine.setSongMode(false)}>
          <div className="sbm-panel sbm-song-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Song Mode</span>
              <button onClick={() => engine.setSongMode(false)}>✕</button>
            </div>
            <div className="sbm-song-blocks">
              {engine.songSeq.length === 0 && (
                <div className="sbm-empty-msg">Add patterns to build a song arrangement</div>
              )}
              {engine.songSeq.map((block, i) => (
                <div key={block.songId || i} className="sbm-song-block">
                  <span>{block.name}</span>
                  <button onClick={() => engine.moveSongBlock(i, Math.max(0, i - 1))}>↑</button>
                  <button onClick={() => engine.moveSongBlock(i, i + 1)}>↓</button>
                  <button onClick={() => engine.rmFromSong(i)}>✕</button>
                </div>
              ))}
            </div>
            <div className="sbm-song-add">
              <span>Add pattern:</span>
              {engine.patterns.map((p, i) => (
                <button key={p.id} onClick={() => engine.addToSong(i)}>{p.name}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clip Launcher */}
      {engine.showClipLauncher && (
        <div className="sbm-overlay" onClick={() => engine.setShowClipLauncher(false)}>
          <div className="sbm-panel sbm-clip-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Clip Launcher</span>
              <button onClick={() => engine.setShowClipLauncher(false)}>✕</button>
            </div>
            <div className="sbm-clip-grid">
              {engine.scenes.map((scene, si) => (
                <div key={scene.id} className={`sbm-scene ${si === engine.activeScene ? 'active' : ''}`}>
                  <div className="sbm-scene-header">
                    <input value={scene.name} onChange={(e) => engine.renameScene(si, e.target.value)} />
                    <button onClick={() => engine.launchScene(si)}>▶</button>
                    <button onClick={() => engine.fillSceneFromPads(si)}>Fill</button>
                    <button onClick={() => engine.removeScene(si)}>✕</button>
                  </div>
                  <div className="sbm-scene-clips">
                    {Object.entries(scene.clips).map(([pi, clip]) => (
                      <div key={pi} className="sbm-clip-cell"
                        style={{ borderColor: clip.color }}>
                        <span>{clip.name}</span>
                        <button onClick={() => engine.toggleClip(si, +pi)}>
                          {engine.clipStates[`${si}_${pi}`] === 'playing' ? '⏸' : '▶'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="sbm-btn" onClick={engine.addScene}>+ Scene</button>
            <button className="sbm-btn" onClick={engine.stopAllClips}>■ Stop All</button>
          </div>
        </div>
      )}

      {/* Chop View */}
      {engine.showChop && engine.chopIdx !== null && (
        <ChopView engine={engine} />
      )}

      {/* Pad Settings */}
      {engine.showPadSet && engine.selectedPad !== null && (
        <div className="sbm-overlay" onClick={() => engine.setShowPadSet(false)}>
          <div className="sbm-panel sbm-padsettings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Pad {engine.selectedPad + 1}: {engine.pads[engine.selectedPad]?.name}</span>
              <button onClick={() => engine.setShowPadSet(false)}>✕</button>
            </div>
            <PadSettingsContent engine={engine} pi={engine.selectedPad} />
          </div>
        </div>
      )}

      {/* Sample Editor */}
      {engine.showSampleEditor && engine.sampleEditorPad !== null && (
        <div className="sbm-overlay" onClick={() => engine.setShowSampleEditor(false)}>
          <div className="sbm-panel sbm-editor-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Sample Editor: {engine.pads[engine.sampleEditorPad]?.name}</span>
              <button onClick={() => engine.setShowSampleEditor(false)}>✕</button>
            </div>
            <SampleEditorContent engine={engine} pi={engine.sampleEditorPad} />
          </div>
        </div>
      )}

      {/* AI Sample Suggestion */}
      {showAiSuggest && aiSuggestions && (
        <div className="sbm-overlay" onClick={() => setShowAiSuggest(false)}>
          <div className="sbm-panel sbm-ai-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>🤖 AI Kit Analysis</span>
              <button onClick={() => setShowAiSuggest(false)}>✕</button>
            </div>
            <div className="sbm-ai-completeness">
              <div className="sbm-ai-bar">
                <div className="sbm-ai-bar-fill" style={{ width: `${aiSuggestions.completeness}%` }} />
              </div>
              <span>{aiSuggestions.completeness}% complete</span>
            </div>
            <div className="sbm-ai-summary">{aiSuggestions.summary}</div>
            {aiSuggestions.analysis.length > 0 && (
              <div className="sbm-ai-section">
                <h4>Detected</h4>
                {aiSuggestions.analysis.map((a, i) => (
                  <div key={i} className="sbm-ai-row">
                    <span>Pad {a.pad}: {a.name}</span>
                    <span className="sbm-ai-type">{a.detectedType} ({a.confidence})</span>
                  </div>
                ))}
              </div>
            )}
            {aiSuggestions.suggestions.length > 0 && (
              <div className="sbm-ai-section">
                <h4>Suggestions</h4>
                {aiSuggestions.suggestions.map((s, i) => (
                  <div key={i} className="sbm-ai-suggestion" onClick={() => engine.fileSelect(s.padIndex)}>
                    <span>Pad {s.padNumber}</span>
                    <span className="sbm-ai-type">Load {s.label}</span>
                    <span className="sbm-ai-desc">{s.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Chop Assistant */}
      {showAiChop && aiChopResult && (
        <div className="sbm-overlay" onClick={() => setShowAiChop(false)}>
          <div className="sbm-panel sbm-ai-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>🧠 AI Chop Assistant</span>
              <button onClick={() => setShowAiChop(false)}>✕</button>
            </div>
            <div className="sbm-ai-summary">
              {aiChopResult.summary}
              {aiChopResult.detectedBpm && ` | Detected BPM: ${aiChopResult.detectedBpm}`}
            </div>
            <div className="sbm-ai-chop-styles">
              {aiChopResult.styles.map((style, i) => (
                <div key={i} className={`sbm-ai-chop-card ${i === 0 ? 'recommended' : ''}`}
                  onClick={() => applyAiChop(style)}>
                  <div className="sbm-ai-chop-name">{style.label}</div>
                  <div className="sbm-ai-chop-desc">{style.desc}</div>
                  <div className="sbm-ai-chop-score">Score: {style.score}</div>
                  {i === 0 && <span className="sbm-ai-badge">★ Recommended</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Kit Browser — Cloud Storage Enabled */}
      {/* ════════════════════════════════════════════════════════ */}
      {engine.showKitBrowser && (
        <div className="sbm-overlay" onClick={() => engine.setShowKitBrowser(false)}>
          <div className="sbm-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sbm-panel-header">
              <span>Kit Browser</span>
              <button onClick={() => engine.setShowKitBrowser(false)}>✕</button>
            </div>
            <div style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="sbm-btn" onClick={() => {
                const name = prompt('Kit name:', 'My Kit');
                if (name) storage.saveKit(name);
              }}>💾 Save Current Kit</button>
              <button className="sbm-btn" onClick={() => storage.loadKits(true)}>
                📂 Browse Kits
              </button>
              <button className="sbm-btn" onClick={() => {
                const name = prompt('Kit name:', 'My Kit');
                if (name) storage.saveKit(name, true);
              }} title="Save as public kit for community">
                🌐 Save Public
              </button>
            </div>
            {storage.showKitManager && (
              <div style={{ padding: '0 12px 12px', maxHeight: 350, overflowY: 'auto' }}>
                {storage.kits.length === 0 ? (
                  <div className="sbm-empty-msg">No kits saved yet. Save your current kit to get started!</div>
                ) : (
                  storage.kits.map(kit => (
                    <div key={kit.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderBottom: '1px solid #1a2030',
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,255,200,0.04)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#ddeeff', fontSize: 12, fontWeight: 600 }}>{kit.name}</div>
                        <div style={{ color: '#5a7088', fontSize: 10 }}>
                          {kit.genre || 'No genre'} · {kit.download_count || 0} downloads
                          {kit.is_public && <span style={{ color: '#00ffc8', marginLeft: 4 }}>🌐 Public</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="sbm-btn-sm" onClick={() => storage.loadKit(kit.id)}
                          style={{ color: '#00ffc8' }}>Load</button>
                        <button className="sbm-btn-sm danger" onClick={() => storage.deleteKit(kit.id)}>✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Project List — Open saved beat projects */}
      {/* ════════════════════════════════════════════════════════ */}
      {storage.showProjectList && (
        <div className="sbm-overlay" onClick={() => storage.setShowProjectList(false)}>
          <div className="sbm-panel" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380, maxWidth: 500 }}>
            <div className="sbm-panel-header">
              <span>📂 My Beat Projects</span>
              <button onClick={() => storage.setShowProjectList(false)}>✕</button>
            </div>
            {storage.projects.length === 0 ? (
              <div className="sbm-empty-msg" style={{ padding: 20 }}>
                No saved projects yet. Hit 💾 to save your first beat!
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {storage.projects.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderBottom: '1px solid #1a2030',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,255,200,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => storage.loadProject(p.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ddeeff', fontSize: 13, fontWeight: 600 }}>
                        {p.name}
                        {p.id === storage.projectId && (
                          <span style={{ color: '#00ffc8', fontSize: 10, marginLeft: 6 }}>● current</span>
                        )}
                      </div>
                      <div style={{ color: '#5a7088', fontSize: 10, marginTop: 2 }}>
                        {p.bpm} BPM · {p.genre || 'No genre'} · {new Date(p.updated_at).toLocaleDateString()}
                        {p.is_public && <span style={{ color: '#00ffc8', marginLeft: 6 }}>🌐</span>}
                        {p.fork_count > 0 && <span style={{ marginLeft: 6 }}>🔀 {p.fork_count}</span>}
                        {p.play_count > 0 && <span style={{ marginLeft: 6 }}>▶ {p.play_count}</span>}
                      </div>
                    </div>
                    <button className="sbm-btn-sm danger"
                      onClick={(e) => { e.stopPropagation(); storage.deleteProject(p.id); }}
                      title="Delete project">
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Share Panel — Generate and copy share link */}
      {/* ════════════════════════════════════════════════════════ */}
      {storage.showSharePanel && storage.shareInfo && (
        <div className="sbm-overlay" onClick={() => storage.setShowSharePanel(false)}>
          <div className="sbm-panel" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380, maxWidth: 480 }}>
            <div className="sbm-panel-header">
              <span>🔗 Share Beat</span>
              <button onClick={() => storage.setShowSharePanel(false)}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {/* Share URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: '#889', fontSize: 11, display: 'block', marginBottom: 4 }}>
                  Share Link:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    readOnly
                    value={storage.shareInfo.url || ''}
                    style={{
                      flex: 1, background: '#0a0e14', color: '#00ffc8',
                      border: '1px solid #1a2636', borderRadius: 4,
                      padding: '6px 8px', fontSize: 12, fontFamily: 'monospace',
                    }}
                  />
                  <button className="sbm-btn-sm" onClick={() => {
                    navigator.clipboard.writeText(storage.shareInfo.url || '');
                    engine.setExportStatus('✓ Link copied!');
                  }} style={{ color: '#00ffc8' }}>📋 Copy</button>
                </div>
              </div>

              {/* Permission buttons */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: '#889', fontSize: 11, display: 'block', marginBottom: 6 }}>
                  Permission Level:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="sbm-btn"
                    onClick={() => storage.shareProject('view', true)}
                    style={{
                      background: storage.shareInfo.permissions === 'view' ? 'rgba(0,255,200,0.12)' : undefined,
                      borderColor: storage.shareInfo.permissions === 'view' ? '#00ffc8' : undefined,
                    }}>
                    👁 View Only
                  </button>
                  <button className="sbm-btn"
                    onClick={() => storage.shareProject('remix', true)}
                    style={{
                      background: storage.shareInfo.permissions === 'remix' ? 'rgba(255,170,0,0.12)' : undefined,
                      borderColor: storage.shareInfo.permissions === 'remix' ? '#ffaa00' : undefined,
                    }}>
                    🔀 Remix
                  </button>
                  <button className="sbm-btn"
                    onClick={() => storage.shareProject('edit', true)}
                    style={{
                      background: storage.shareInfo.permissions === 'edit' ? 'rgba(255,68,68,0.12)' : undefined,
                      borderColor: storage.shareInfo.permissions === 'edit' ? '#ff4444' : undefined,
                    }}>
                    ✏️ Edit
                  </button>
                </div>
              </div>

              {/* Status info */}
              <div style={{ color: '#5a7088', fontSize: 10, borderTop: '1px solid #1a2030', paddingTop: 10 }}>
                {storage.shareInfo.isPublic
                  ? '🌐 This beat is public and visible in the community feed.'
                  : '🔒 Only people with the link can access this beat.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard (Keygroup) */}
      {engine.showKeyboard && engine.selectedPad !== null && (
        <div className="sbm-keyboard-bar">
          <div className="sbm-keyboard-header">
            <span>Keygroup: {engine.pads[engine.selectedPad]?.name} (Root: {CHROMATIC_KEYS[(engine.pads[engine.selectedPad]?.rootNote || 60) % 12]})</span>
            <button onClick={() => engine.setShowKeyboard(false)}>✕</button>
          </div>
          <div className="sbm-keyboard-keys">
            {Array.from({ length: 49 }, (_, i) => i + 36).map(note => {
              const name = CHROMATIC_KEYS[note % 12];
              const isBlack = name.includes('#');
              const isActive = engine.activeKgNotes.has(note);
              return (
                <button key={note}
                  className={`sbm-key ${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
                  onMouseDown={() => engine.playPadKeygroup(engine.selectedPad, note, 0.8)}
                  onMouseUp={() => engine.stopPadKeygroup(engine.selectedPad, note)}>
                  {!isBlack && <span className="sbm-key-label">{name}{Math.floor(note / 12) - 1}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="sbm-statusbar">
        <span>Click = normal | Shift = soft | Ctrl = hard | Keys: 1-4, Q-R, A-F, Z-V | Ctrl+S = Save</span>
        {storage.projectId && (
          <span style={{ color: '#5a7088', marginLeft: 8 }}>
            Project #{storage.projectId}
          </span>
        )}
        {engine.exportStatus && <span className="sbm-status-export">{engine.exportStatus}</span>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// INLINE SUB-COMPONENTS (shared across tabs)
// ═══════════════════════════════════════════════════════════

const PadSettingsContent = ({ engine, pi }) => {
  const pad = engine.pads[pi];
  if (!pad) return null;

  return (
    <div className="sbm-pad-settings-body">
      <div className="sbm-settings-grid">
        <label>Volume
          <input type="range" min="0" max="1" step="0.01" value={pad.volume}
            onChange={(e) => engine.updatePad(pi, { volume: +e.target.value })} />
          <span>{Math.round(pad.volume * 100)}%</span>
        </label>
        <label>Pitch
          <input type="range" min="-24" max="24" step="1" value={pad.pitch}
            onChange={(e) => engine.updatePad(pi, { pitch: +e.target.value })} />
          <span>{pad.pitch > 0 ? '+' : ''}{pad.pitch}st</span>
        </label>
        <label>Pan
          <input type="range" min="-1" max="1" step="0.01" value={pad.pan}
            onChange={(e) => engine.updatePad(pi, { pan: +e.target.value })} />
          <span>{pad.pan === 0 ? 'C' : pad.pan < 0 ? `L${Math.round(-pad.pan * 100)}` : `R${Math.round(pad.pan * 100)}`}</span>
        </label>
        <label>Play Mode
          <select value={pad.playMode} onChange={(e) => engine.updatePad(pi, { playMode: e.target.value })}>
            <option value="oneshot">One Shot</option>
            <option value="hold">Hold</option>
            <option value="loop">Loop</option>
          </select>
        </label>
        <label>Program
          <select value={pad.programType} onChange={(e) => engine.updatePad(pi, { programType: e.target.value })}>
            <option value="drum">Drum</option>
            <option value="keygroup">Keygroup</option>
            <option value="clip">Clip</option>
          </select>
        </label>
        {pad.programType === 'keygroup' && (
          <label>Root Note
            <select value={pad.rootNote}
              onChange={(e) => engine.updatePad(pi, { rootNote: +e.target.value })}>
              {Array.from({ length: 49 }, (_, i) => i + 36).map(n => (
                <option key={n} value={n}>{CHROMATIC_KEYS[n % 12]}{Math.floor(n / 12) - 1}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <h4>Envelope</h4>
      <div className="sbm-settings-grid">
        <label>Attack
          <input type="range" min="0" max="2" step="0.005" value={pad.attack}
            onChange={(e) => engine.updatePad(pi, { attack: +e.target.value })} />
          <span>{(pad.attack * 1000).toFixed(0)}ms</span>
        </label>
        <label>Decay
          <input type="range" min="0" max="2" step="0.01" value={pad.decay}
            onChange={(e) => engine.updatePad(pi, { decay: +e.target.value })} />
          <span>{(pad.decay * 1000).toFixed(0)}ms</span>
        </label>
        <label>Sustain
          <input type="range" min="0" max="1" step="0.01" value={pad.sustain}
            onChange={(e) => engine.updatePad(pi, { sustain: +e.target.value })} />
          <span>{Math.round(pad.sustain * 100)}%</span>
        </label>
        <label>Release
          <input type="range" min="0" max="3" step="0.01" value={pad.release}
            onChange={(e) => engine.updatePad(pi, { release: +e.target.value })} />
          <span>{(pad.release * 1000).toFixed(0)}ms</span>
        </label>
      </div>

      <h4>Effects</h4>
      <div className="sbm-settings-grid">
        <label>
          <input type="checkbox" checked={pad.filterOn}
            onChange={(e) => engine.updatePad(pi, { filterOn: e.target.checked })} />
          Filter
        </label>
        {pad.filterOn && (
          <>
            <label>Type
              <select value={pad.filterType}
                onChange={(e) => engine.updatePad(pi, { filterType: e.target.value })}>
                <option value="lowpass">LP</option>
                <option value="highpass">HP</option>
                <option value="bandpass">BP</option>
                <option value="notch">Notch</option>
              </select>
            </label>
            <label>Freq
              <input type="range" min="20" max="20000" value={pad.filterFreq}
                onChange={(e) => engine.updatePad(pi, { filterFreq: +e.target.value })} />
              <span>{pad.filterFreq}Hz</span>
            </label>
            <label>Q
              <input type="range" min="0.1" max="20" step="0.1" value={pad.filterQ}
                onChange={(e) => engine.updatePad(pi, { filterQ: +e.target.value })} />
              <span>{pad.filterQ}</span>
            </label>
          </>
        )}
        <label>
          <input type="checkbox" checked={pad.reverbOn}
            onChange={(e) => engine.updatePad(pi, { reverbOn: e.target.checked })} />
          Reverb
        </label>
        {pad.reverbOn && (
          <label>Mix
            <input type="range" min="0" max="1" step="0.01" value={pad.reverbMix}
              onChange={(e) => engine.updatePad(pi, { reverbMix: +e.target.value })} />
            <span>{Math.round(pad.reverbMix * 100)}%</span>
          </label>
        )}
        <label>
          <input type="checkbox" checked={pad.delayOn}
            onChange={(e) => engine.updatePad(pi, { delayOn: e.target.checked })} />
          Delay
        </label>
        {pad.delayOn && (
          <>
            <label>Time
              <input type="range" min="0.01" max="1" step="0.01" value={pad.delayTime}
                onChange={(e) => engine.updatePad(pi, { delayTime: +e.target.value })} />
              <span>{(pad.delayTime * 1000).toFixed(0)}ms</span>
            </label>
            <label>Feedback
              <input type="range" min="0" max="0.95" step="0.01" value={pad.delayFeedback}
                onChange={(e) => engine.updatePad(pi, { delayFeedback: +e.target.value })} />
            </label>
            <label>Mix
              <input type="range" min="0" max="1" step="0.01" value={pad.delayMix}
                onChange={(e) => engine.updatePad(pi, { delayMix: +e.target.value })} />
            </label>
          </>
        )}
      </div>

      <h4>Trim</h4>
      <div className="sbm-settings-grid">
        <label>Start
          <input type="range" min="0" max={pad.buffer?.duration || 1} step="0.001"
            value={pad.trimStart}
            onChange={(e) => engine.updatePad(pi, { trimStart: +e.target.value })} />
          <span>{pad.trimStart.toFixed(3)}s</span>
        </label>
        <label>End
          <input type="range" min="0" max={pad.buffer?.duration || 1} step="0.001"
            value={pad.trimEnd || pad.buffer?.duration || 0}
            onChange={(e) => engine.updatePad(pi, { trimEnd: +e.target.value })} />
          <span>{(pad.trimEnd || pad.buffer?.duration || 0).toFixed(3)}s</span>
        </label>
      </div>

      <h4>Time-Stretch</h4>
      <div className="sbm-settings-grid">
        <label>
          <input type="checkbox" checked={pad.timeStretch}
            onChange={(e) => engine.updatePad(pi, { timeStretch: e.target.checked })} />
          Enable Time-Stretch
        </label>
        {pad.timeStretch && (
          <>
            <label>Mode
              <select value={pad.stretchMode}
                onChange={(e) => engine.updatePad(pi, { stretchMode: e.target.value })}>
                <option value="repitch">Repitch (classic)</option>
                <option value="stretch">Stretch (tempo-lock)</option>
              </select>
            </label>
            <label>Original BPM
              <input type="number" min="30" max="300" value={pad.originalBpm || ''}
                style={{ width: 60, background: '#1a1f2e', color: '#aab', border: '1px solid #2a3040', borderRadius: 4, padding: '2px 4px', fontSize: 11 }}
                onChange={(e) => engine.updatePad(pi, { originalBpm: +e.target.value })}
                placeholder="Detect" />
              <span>{pad.originalBpm || '—'}</span>
            </label>
            {pad.stretchMode === 'stretch' && pad.originalBpm > 0 && (
              <label style={{ color: '#00ff88', fontSize: 10 }}>
                Ratio: {(engine.bpm / pad.originalBpm).toFixed(2)}x
              </label>
            )}
          </>
        )}
      </div>

      <h4>Velocity Layers</h4>
      <div style={{ padding: '4px 0' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: '#889' }}>
          <input type="checkbox" checked={pad.roundRobin}
            onChange={(e) => engine.updatePad(pi, { roundRobin: e.target.checked })}
            style={{ accentColor: '#00ff88' }} />
          Round-Robin (cycle layers instead of velocity switch)
        </label>
        {pad.layers && pad.layers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pad.layers.map((layer, li) => (
              <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: '#1a1f2e', borderRadius: 4, fontSize: 11 }}>
                <span style={{ color: '#aab', flex: 1 }}>{layer.name}</span>
                <span style={{ color: '#667' }}>Vel:</span>
                <input type="number" min="0" max="1" step="0.1"
                  value={layer.velLow} style={{ width: 40, background: '#0e1218', color: '#aab', border: '1px solid #2a3040', borderRadius: 3, padding: '1px 3px', fontSize: 10 }}
                  onChange={(e) => engine.updateVelocityLayer(pi, li, { velLow: +e.target.value })} />
                <span style={{ color: '#556' }}>→</span>
                <input type="number" min="0" max="1" step="0.1"
                  value={layer.velHigh} style={{ width: 40, background: '#0e1218', color: '#aab', border: '1px solid #2a3040', borderRadius: 3, padding: '1px 3px', fontSize: 10 }}
                  onChange={(e) => engine.updateVelocityLayer(pi, li, { velHigh: +e.target.value })} />
                <button className="sbm-btn-sm danger" onClick={() => engine.removeVelocityLayer(pi, li)}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#445', padding: '4px 0' }}>No layers — uses main sample at all velocities</div>
        )}
        <button className="sbm-btn-sm" style={{ marginTop: 4 }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.onchange = (e) => {
              if (e.target.files[0]) {
                const layerCount = pad.layers?.length || 0;
                const velLow = layerCount > 0 ? (pad.layers[layerCount - 1]?.velHigh || 0.5) : 0;
                engine.addVelocityLayer(pi, e.target.files[0], velLow, 1);
              }
            };
            input.click();
          }}>+ Add Layer</button>
      </div>

      <h4>MIDI</h4>
      <div className="sbm-settings-grid">
        <label style={{ color: '#889', fontSize: 11 }}>
          Mapping: {(() => {
            const maps = engine.getMidiMapping(pi);
            return maps.length > 0 ? maps.map(m => m.replace('note_', 'N').replace('cc_', 'CC')).join(', ') : 'None (default: Note ' + (36 + pi) + ')';
          })()}
        </label>
        {engine.midiLearn && engine.midiLearnPad === pi ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ color: '#ffaa00', fontSize: 11, animation: 'pulse-rec 1s infinite' }}>⏳ Press a MIDI key/knob...</span>
            <button className="sbm-btn-sm" onClick={engine.cancelMidiLearn}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="sbm-btn-sm" onClick={() => engine.startMidiLearn(pi)}>🎹 Learn</button>
            <button className="sbm-btn-sm danger" onClick={() => engine.clearMidiMap(pi)}>Clear</button>
          </div>
        )}
      </div>
    </div>
  );
};

const SampleEditorContent = ({ engine, pi }) => {
  const pad = engine.pads[pi];
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!pad?.buffer || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const data = pad.buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    // Draw trim region
    const startX = (pad.trimStart / pad.buffer.duration) * w;
    const endX = ((pad.trimEnd || pad.buffer.duration) / pad.buffer.duration) * w;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
    ctx.fillRect(startX, 0, endX - startX, h);

    // Waveform
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x++) {
      const si = x * step;
      let min = 1, max = -1;
      for (let j = 0; j < step && si + j < data.length; j++) {
        const v = data[si + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = (1 - max) * h / 2;
      const y2 = (1 - min) * h / 2;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Trim markers
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0); ctx.lineTo(startX, h);
    ctx.moveTo(endX, 0); ctx.lineTo(endX, h);
    ctx.stroke();
  }, [pad]);

  if (!pad?.buffer) return <div className="sbm-empty-msg">No sample loaded on this pad</div>;

  return (
    <div className="sbm-editor-body">
      <canvas ref={canvasRef} className="sbm-editor-canvas" width="700" height="150" />
      <div className="sbm-editor-info">
        <span>Duration: {pad.buffer.duration.toFixed(3)}s</span>
        <span>Channels: {pad.buffer.numberOfChannels}</span>
        <span>Sample Rate: {pad.buffer.sampleRate}Hz</span>
      </div>
      <div className="sbm-editor-actions">
        <button onClick={() => engine.normalizeSample(pi)}>📊 Normalize</button>
        <button onClick={() => engine.reverseSampleDestructive(pi)}>◀ Reverse</button>
        <button onClick={() => engine.fadeInSample(pi)}>↗ Fade In</button>
        <button onClick={() => engine.fadeOutSample(pi)}>↘ Fade Out</button>
      </div>
      <div className="sbm-editor-trim">
        <label>Trim Start
          <input type="range" min="0" max={pad.buffer.duration} step="0.001"
            value={pad.trimStart}
            onChange={(e) => engine.updatePad(pi, { trimStart: +e.target.value })} />
          <span>{pad.trimStart.toFixed(3)}s</span>
        </label>
        <label>Trim End
          <input type="range" min="0" max={pad.buffer.duration} step="0.001"
            value={pad.trimEnd || pad.buffer.duration}
            onChange={(e) => engine.updatePad(pi, { trimEnd: +e.target.value })} />
          <span>{(pad.trimEnd || pad.buffer.duration).toFixed(3)}s</span>
        </label>
      </div>
    </div>
  );
};

export default SamplerBeatMaker;