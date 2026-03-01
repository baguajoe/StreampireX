// =============================================================================
// BeatMakerTab.jsx — Sequencing & Arrangement Workspace
// Step sequencer, pattern management, song mode, clip launcher, export
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PAD_COUNT, PAD_KEY_LABELS, STEP_COUNTS } from '../useSamplerEngine';

const BeatMakerTab = ({ engine, handlePadDown, handlePadUp }) => {
  const [beatView, setBeatView] = useState('split'); // split | pads | seq
  const [editingVelocity, setEditingVelocity] = useState(null); // {pad, step}
  const seqContainerRef = useRef(null);

  const steps = engine.steps;
  const stepVel = engine.stepVel;

  // Bar markers
  const bars = [];
  for (let b = 0; b < Math.ceil(engine.stepCount / 4); b++) {
    bars.push(b);
  }

  return (
    <div className="sbm-beats-tab">
      {/* ── Secondary toolbar ── */}
      <div className="sbm-secondary-bar">
        <div className="sbm-sub-tabs">
          <button className={beatView === 'split' ? 'active' : ''} onClick={() => setBeatView('split')}>⊞ Split</button>
          <button className={beatView === 'pads' ? 'active' : ''} onClick={() => setBeatView('pads')}>⊟ Pads</button>
          <button className={beatView === 'seq' ? 'active' : ''} onClick={() => setBeatView('seq')}>☰ Seq</button>
        </div>

        <div className="sbm-beat-actions">
          {/* Pattern management */}
          <button className="sbm-btn-sm" onClick={engine.clearPat}>🗑️ Clear</button>
          <button className="sbm-btn-sm" onClick={engine.stopAll}>⏹ Stop All</button>
          <span className="sbm-perf-divider">|</span>

          {/* Panels */}
          <button className="sbm-btn-sm" onClick={() => engine.setShowMixer(true)}>🎚️ Mixer</button>
          <button className="sbm-btn-sm" onClick={() => engine.setSongMode(true)}>🎼 Song</button>
          <button className="sbm-btn-sm" onClick={() => engine.setShowClipLauncher(true)}>🎬 Clips</button>
          <button className="sbm-btn-sm" onClick={() => engine.setShowExportPanel(true)}>💾 Export</button>

          <span className="sbm-perf-divider">|</span>

          {/* Steps */}
          <span className="sbm-steps-label">Steps:</span>
          {STEP_COUNTS.map(sc => (
            <button key={sc}
              className={`sbm-step-btn ${engine.stepCount === sc ? 'active' : ''}`}
              onClick={() => engine.setStepCount(sc)}>
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className={`sbm-beats-content view-${beatView}`}>
        {/* Pad column (in split and pads view) */}
        {beatView !== 'seq' && (
          <div className="sbm-beats-pads">
            <div className="sbm-beats-pad-grid">
              {engine.pads.map((pad, i) => (
                <div key={i}
                  className={`sbm-beats-pad ${engine.activePads.has(i) ? 'active' : ''} ${engine.selectedPad === i ? 'selected' : ''} ${pad.buffer ? 'loaded' : ''}`}
                  style={{ borderColor: pad.color }}
                  onMouseDown={(e) => { e.preventDefault(); handlePadDown(i); }}
                  onMouseUp={() => handlePadUp(i)}
                  onDoubleClick={() => engine.fileSelect(i)}
                  onDragOver={(e) => engine.onDragOver(e, i)}
                  onDragLeave={engine.onDragLeave}
                  onDrop={(e) => engine.onDrop(e, i)}>
                  <span className="sbm-beats-pad-num">{PAD_KEY_LABELS[i]}</span>
                  <span className="sbm-beats-pad-name">{pad.buffer ? pad.name : 'Empty'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sequencer (in split and seq view) */}
        {beatView !== 'pads' && (
          <div className="sbm-sequencer" ref={seqContainerRef}>
            {/* Bar ruler */}
            <div className="sbm-seq-ruler">
              <div className="sbm-seq-ruler-label">All</div>
              {bars.map(b => (
                <div key={b} className="sbm-seq-bar-marker" style={{ gridColumn: `span 4` }}>
                  <span
                    onClick={() => engine.setLoopStartStep(b * 4)}
                    onContextMenu={(e) => { e.preventDefault(); engine.setLoopEndStep((b + 1) * 4); }}>
                    {b + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Sub-beat markers */}
            <div className="sbm-seq-subbeats">
              <div className="sbm-seq-ruler-label" />
              {Array.from({ length: engine.stepCount }, (_, i) => (
                <div key={i} className={`sbm-seq-subbeat ${i % 4 === 0 ? 'beat' : ''}`}>
                  {i % 4 === 0 ? `${Math.floor(i / 4) + 1}.1` : `.${(i % 4) + 1}`}
                </div>
              ))}
            </div>

            {/* Step grid */}
            <div className="sbm-seq-grid">
              {engine.pads.map((pad, pi) => (
                <div key={pi} className="sbm-seq-row">
                  <div className="sbm-seq-row-label"
                    style={{ color: pad.color }}
                    onClick={() => engine.setSelectedPad(pi)}>
                    <span className="sbm-seq-row-color" style={{ background: pad.color }} />
                    <span className="sbm-seq-row-name">{pad.buffer ? pad.name : `Empty`}</span>
                    <span className="sbm-seq-row-num">{pi + 1}</span>
                  </div>
                  {Array.from({ length: engine.stepCount }, (_, si) => {
                    const on = steps[pi]?.[si];
                    const vel = stepVel[pi]?.[si] ?? 0.8;
                    const isCurrent = engine.curStep === si && engine.isPlaying;
                    const isLoopStart = si === engine.loopStartStep;
                    const isLoopEnd = si === (engine.loopEndStep || engine.stepCount) - 1;
                    const inLoop = si >= (engine.loopStartStep || 0) && si < (engine.loopEndStep || engine.stepCount);

                    return (
                      <div key={si}
                        className={`sbm-seq-cell ${on ? 'on' : ''} ${isCurrent ? 'current' : ''} ${si % 4 === 0 ? 'beat-start' : ''} ${inLoop ? 'in-loop' : 'out-loop'} ${isLoopStart ? 'loop-start' : ''} ${isLoopEnd ? 'loop-end' : ''}`}
                        style={on ? {
                          '--step-color': pad.color,
                          '--vel-height': `${vel * 100}%`,
                        } : undefined}
                        onClick={(e) => engine.toggleStep(pi, si, e)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (on) {
                            // Cycle velocity
                            const newVel = vel > 0.9 ? 0.4 : vel < 0.5 ? 0.8 : 1.0;
                            engine.setPatterns(prev => {
                              const next = [...prev];
                              const pat = { ...next[engine.curPatIdx] };
                              pat.velocities = pat.velocities.map(r => [...r]);
                              pat.velocities[pi][si] = newVel;
                              next[engine.curPatIdx] = pat;
                              return next;
                            });
                          }
                        }}
                        title={on ? `Vel: ${Math.round(vel * 100)}% | Right-click to change` : 'Click to add'}>
                        {on && <div className="sbm-seq-vel-bar" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Pattern selector bar */}
            <div className="sbm-pattern-bar">
              {engine.patterns.map((pat, i) => (
                <button key={pat.id}
                  className={`sbm-pattern-btn ${i === engine.curPatIdx ? 'active' : ''}`}
                  onClick={() => engine.setCurPatIdx(i)}
                  onDoubleClick={() => {
                    const name = prompt('Rename pattern:', pat.name);
                    if (name) engine.renamePattern(i, name);
                  }}>
                  {pat.name}
                </button>
              ))}
              <button className="sbm-pattern-btn add" onClick={engine.addPattern}>+</button>
              {engine.patterns.length > 1 && (
                <button className="sbm-pattern-btn del"
                  onClick={() => engine.delPattern(engine.curPatIdx)}>🗑️</button>
              )}
            </div>

            {/* Seq footer */}
            <div className="sbm-seq-footer">
              <span>Click = normal | Shift = soft | Ctrl = hard</span>
              <span>Bar ruler: Click = loop start | Shift+Click = loop end | Ctrl+Click = clear</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeatMakerTab;