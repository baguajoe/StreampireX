// =============================================================================
// DrumPadTab.jsx — Live Performance Workspace
// 16 MPC pads, Note Repeat, Roll, Tape Stop, Filter Sweep, Scale Lock,
// Chord Trigger, Live Looper, AI tools
// =============================================================================

import React, { useState } from 'react';
import { SCALES, CHORD_TYPES, NOTE_REPEAT_RATES } from '../PerformanceEngine';
import { CHROMATIC_KEYS, PAD_KEY_LABELS } from '../useSamplerEngine';

const PERF_SECTIONS = ['perform', 'scale', 'looper', 'kits'];

const DrumPadTab = ({ engine, handlePadDown, handlePadUp, perfProps, aiProps }) => {
  const [perfSection, setPerfSection] = useState('perform');

  const {
    noteRepeatOn, setNoteRepeatOn, noteRepeatRate, setNoteRepeatRate,
    rollOn, setRollOn, tapeStopOn, triggerTapeStop,
    filterSweepOn, toggleFilterSweep, filterSweepVal, updateFilterSweep,
    liveLoopState, startLoopRec, stopLoopRec, playLoop, stopLoop, loopBufRef,
    scaleLockOn, setScaleLockOn, scaleLockRoot, setScaleLockRoot,
    scaleLockScale, setScaleLockScale,
    chordModeOn, setChordModeOn, chordType, setChordType,
    chordInversion, setChordInversion,
    stopAllNoteRepeats,
  } = perfProps;

  return (
    <div className="sbm-pads-tab">
      {/* ── Secondary toolbar ── */}
      <div className="sbm-secondary-bar">
        <div className="sbm-sub-tabs">
          {PERF_SECTIONS.map(s => (
            <button key={s} className={perfSection === s ? 'active' : ''} onClick={() => setPerfSection(s)}>
              {s === 'perform' ? '🎛️ Perform' : s === 'scale' ? '🎵 Scale' : s === 'looper' ? '🔄 Looper' : '📦 Kits'}
            </button>
          ))}
        </div>

        {/* Performance controls */}
        <div className="sbm-perf-controls">
          {perfSection === 'perform' && (
            <>
              <button className={`sbm-perf-btn ${noteRepeatOn ? 'active' : ''}`}
                onClick={() => { setNoteRepeatOn(!noteRepeatOn); if (noteRepeatOn) stopAllNoteRepeats(); }}>
                🔁 Repeat
              </button>
              {noteRepeatOn && (
                <select className="sbm-perf-sel" value={noteRepeatRate}
                  onChange={(e) => setNoteRepeatRate(+e.target.value)}>
                  {NOTE_REPEAT_RATES.map(r => (
                    <option key={r.label} value={r.div}>{r.label}</option>
                  ))}
                </select>
              )}
              <button className={`sbm-perf-btn ${rollOn ? 'active' : ''}`}
                onClick={() => setRollOn(!rollOn)}>
                🥁 Roll
              </button>
              <button className={`sbm-perf-btn ${tapeStopOn ? 'active' : ''}`}
                onClick={triggerTapeStop}>
                ⏏️ Tape Stop
              </button>
              <button className={`sbm-perf-btn ${filterSweepOn ? 'active' : ''}`}
                onClick={toggleFilterSweep}>
                🎚️ Filter
              </button>
              {filterSweepOn && (
                <input type="range" className="sbm-sweep-knob" min="0" max="1" step="0.01"
                  value={filterSweepVal}
                  onChange={(e) => updateFilterSweep(+e.target.value)} />
              )}
            </>
          )}

          {perfSection === 'scale' && (
            <>
              <button className={`sbm-perf-btn ${scaleLockOn ? 'active' : ''}`}
                onClick={() => setScaleLockOn(!scaleLockOn)}>
                🔒 Scale Lock
              </button>
              {scaleLockOn && (
                <>
                  <select className="sbm-perf-sel" value={scaleLockRoot}
                    onChange={(e) => setScaleLockRoot(+e.target.value)}>
                    {CHROMATIC_KEYS.map((k, i) => (
                      <option key={i} value={i}>{k}</option>
                    ))}
                  </select>
                  <select className="sbm-perf-sel" value={scaleLockScale}
                    onChange={(e) => setScaleLockScale(e.target.value)}>
                    {Object.keys(SCALES).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </>
              )}
              <span className="sbm-perf-divider">|</span>
              <button className={`sbm-perf-btn ${chordModeOn ? 'active' : ''}`}
                onClick={() => setChordModeOn(!chordModeOn)}>
                🎶 Chord
              </button>
              {chordModeOn && (
                <>
                  <select className="sbm-perf-sel" value={chordType}
                    onChange={(e) => setChordType(e.target.value)}>
                    {Object.keys(CHORD_TYPES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select className="sbm-perf-sel" value={chordInversion}
                    onChange={(e) => setChordInversion(+e.target.value)}>
                    <option value={0}>Root</option>
                    <option value={1}>1st Inv</option>
                    <option value={2}>2nd Inv</option>
                  </select>
                </>
              )}
            </>
          )}

          {perfSection === 'looper' && (
            <>
              {liveLoopState === 'idle' && (
                <>
                  <button className="sbm-perf-btn" onClick={startLoopRec}>⏺ Rec Loop</button>
                  {loopBufRef?.current && (
                    <button className="sbm-perf-btn" onClick={playLoop}>▶ Play Loop</button>
                  )}
                </>
              )}
              {liveLoopState === 'recording' && (
                <button className="sbm-perf-btn active rec" onClick={stopLoopRec}>⏹ Stop Rec</button>
              )}
              {liveLoopState === 'playing' && (
                <button className="sbm-perf-btn active" onClick={stopLoop}>⏹ Stop Loop</button>
              )}
              <span className="sbm-perf-status">
                {liveLoopState === 'recording' ? '● Recording...' :
                 liveLoopState === 'playing' ? '▶ Playing loop' :
                 loopBufRef?.current ? 'Loop ready' : 'No loop'}
              </span>
            </>
          )}

          {perfSection === 'kits' && (
            <>
              <button className="sbm-btn-sm" onClick={() => engine.setShowKitBrowser(true)}>📦 Browse Kits</button>
              <button className="sbm-btn-sm" onClick={() => engine.saveKit('Current Kit')}>💾 Save Kit</button>
              <span className="sbm-perf-divider">|</span>
              <button className="sbm-btn-ai" onClick={aiProps.runAiSuggest}>🤖 Suggest</button>
              <button className={`sbm-btn-ai ${aiProps.vocalBeatOn ? 'active' : ''}`}
                onClick={aiProps.vocalBeatOn ? aiProps.stopVocalBeat : aiProps.startVocalBeat}>
                🗣️ Voice→Pads
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 16 MPC Pad Grid ── */}
      <div className="sbm-pad-grid">
        {engine.pads.map((pad, i) => {
          const isActive = engine.activePads.has(i);
          const isSelected = engine.selectedPad === i;
          const isDragTarget = engine.dragPad === i;

          return (
            <div key={i}
              className={`sbm-mpc-pad ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drag-over' : ''} ${pad.buffer ? 'loaded' : 'empty'}`}
              style={{
                '--pad-color': pad.color,
                borderColor: isSelected ? '#fff' : pad.color,
              }}
              onMouseDown={(e) => { e.preventDefault(); handlePadDown(i); }}
              onMouseUp={() => handlePadUp(i)}
              onMouseLeave={() => handlePadUp(i)}
              onDoubleClick={() => engine.fileSelect(i)}
              onDragOver={(e) => engine.onDragOver(e, i)}
              onDragLeave={engine.onDragLeave}
              onDrop={(e) => engine.onDrop(e, i)}
              onContextMenu={(e) => {
                e.preventDefault();
                engine.setSelectedPad(i);
                engine.setShowPadSet(true);
              }}>

              {/* Pad header */}
              <div className="sbm-pad-header">
                <span className="sbm-pad-num">{PAD_KEY_LABELS[i]}</span>
                {pad.programType === 'keygroup' && <span className="sbm-pad-badge">KG</span>}
                {pad.playMode === 'loop' && <span className="sbm-pad-badge loop">🔁</span>}
              </div>

              {/* Pad content */}
              <div className="sbm-pad-body">
                {pad.buffer ? (
                  <>
                    <span className="sbm-pad-name">{pad.name}</span>
                    <MiniWaveform buffer={pad.buffer} color={pad.color} />
                  </>
                ) : (
                  <span className="sbm-pad-empty-label">Empty</span>
                )}
              </div>

              {/* Velocity indicator */}
              {isActive && <div className="sbm-pad-velocity" />}

              {/* Quick actions */}
              <div className="sbm-pad-quick">
                {pad.buffer && (
                  <>
                    <button className="sbm-pad-qbtn" onClick={(e) => { e.stopPropagation(); engine.setSelectedPad(i); engine.openSampleEditor(i); }} title="Edit">✏️</button>
                    <button className="sbm-pad-qbtn" onClick={(e) => { e.stopPropagation(); engine.clearPad(i); }} title="Clear">🗑️</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Mini waveform for pads ──
const MiniWaveform = ({ buffer, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / w);

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color || '#00ff88';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x++) {
      const si = x * step;
      let min = 1, max = -1;
      for (let j = 0; j < step && si + j < data.length; j++) {
        const v = data[si + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.moveTo(x, (1 - max) * h / 2);
      ctx.lineTo(x, (1 - min) * h / 2);
    }
    ctx.stroke();
  }, [buffer, color]);

  return <canvas ref={canvasRef} className="sbm-mini-wave" width="80" height="30" />;
};

export default DrumPadTab;