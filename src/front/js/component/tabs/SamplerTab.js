// =============================================================================
// SamplerTab.jsx — Sample Editing Workspace
// Pad selector strip, waveform display, inline settings, piano keyboard, AI
// =============================================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CHROMATIC_KEYS } from '../useSamplerEngine';
import WaveformEditor from '../WaveformEditor';

const SamplerTab = ({ engine, handlePadDown, handlePadUp, aiProps }) => {
  const [subTab, setSubTab] = useState('edit'); // edit | process | piano | ai
  const pi = engine.selectedPad;
  const pad = pi !== null ? engine.pads[pi] : null;

  return (
    <div className="sbm-sampler-tab">
      {/* ── Secondary toolbar ── */}
      <div className="sbm-secondary-bar">
        <div className="sbm-sub-tabs">
          <button className={subTab === 'edit' ? 'active' : ''} onClick={() => setSubTab('edit')}>✏️ Edit</button>
          <button className={subTab === 'process' ? 'active' : ''} onClick={() => setSubTab('process')}>⚡ Process</button>
          <button className={subTab === 'piano' ? 'active' : ''} onClick={() => setSubTab('piano')}>🎹 Piano</button>
          <button className={subTab === 'ai' ? 'active' : ''} onClick={() => setSubTab('ai')}>🤖 AI Tools</button>
        </div>
        <div className="sbm-sub-actions">
          {subTab === 'edit' && pi !== null && (
            <>
              <button className="sbm-btn-sm" onClick={() => engine.fileSelect(pi)}>📂 Load</button>
              <button className="sbm-btn-sm" onClick={() => engine.startMicRec(pi)}>🎤 Record</button>
              <button className="sbm-btn-sm" onClick={() => engine.openChop(pi)} disabled={!pad?.buffer}>✂️ Chop</button>
              <button className="sbm-btn-sm" onClick={() => engine.openSampleEditor(pi)} disabled={!pad?.buffer}>📝 Editor</button>
              <button className="sbm-btn-sm" onClick={() => engine.setShowPadSet(true)} disabled={!pad}>⚙️ Settings</button>
            </>
          )}
          {subTab === 'process' && pi !== null && pad?.buffer && (
            <>
              <button className="sbm-btn-sm" onClick={() => engine.normalizeSample(pi)}>📊 Norm</button>
              <button className="sbm-btn-sm" onClick={() => engine.reverseSampleDestructive(pi)}>◀ Rev</button>
              <button className="sbm-btn-sm" onClick={() => engine.fadeInSample(pi)}>↗ In</button>
              <button className="sbm-btn-sm" onClick={() => engine.fadeOutSample(pi)}>↘ Out</button>
              <button className="sbm-btn-sm" onClick={() => engine.analyzePadSample(pi)}>🔍 Detect</button>
            </>
          )}
          {subTab === 'ai' && (
            <>
              <button className="sbm-btn-ai" onClick={aiProps.runAiSuggest}>🤖 Suggest</button>
              <button className="sbm-btn-ai" onClick={aiProps.runAiChop} disabled={!pad?.buffer}>🧠 AI Chop</button>
              <button className={`sbm-btn-ai ${aiProps.vocalBeatOn ? 'active' : ''}`}
                onClick={aiProps.vocalBeatOn ? aiProps.stopVocalBeat : aiProps.startVocalBeat}>
                🗣️ Voice→Pads
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Pad selector strip ── */}
      <div className="sbm-pad-strip">
        {engine.pads.map((p, i) => (
          <button key={i}
            className={`sbm-pad-strip-btn ${i === pi ? 'selected' : ''} ${p.buffer ? 'loaded' : ''} ${engine.activePads.has(i) ? 'playing' : ''}`}
            style={{ borderColor: p.color }}
            onClick={() => engine.setSelectedPad(i)}
            onDoubleClick={() => engine.fileSelect(i)}
            onDragOver={(e) => engine.onDragOver(e, i)}
            onDragLeave={engine.onDragLeave}
            onDrop={(e) => engine.onDrop(e, i)}>
            <span className="sbm-strip-num">{i + 1}</span>
            <span className="sbm-strip-name">{p.buffer ? p.name : ''}</span>
          </button>
        ))}
      </div>

      {/* ── Main content area ── */}
      <div className="sbm-sampler-main">
        {/* Waveform Editor */}
        <div className="sbm-waveform-area"
          onDragOver={(e) => pi !== null && engine.onDragOver(e, pi)}
          onDragLeave={engine.onDragLeave}
          onDrop={(e) => pi !== null && engine.onDrop(e, pi)}>
          {pi !== null && pad?.buffer ? (
            <WaveformEditor
              pad={pad}
              padIndex={pi}
              onUpdatePad={engine.updatePad}
              audioContext={engine.ctxRef.current}
              masterGain={engine.masterRef.current}
              isPlaying={engine.isPlaying}
              activePads={engine.activePads}
              onPlayPad={engine.playPad}
              onStopPad={engine.stopPad}
            />
          ) : pi !== null && !pad?.buffer ? (
            <div className="sbm-waveform-empty" onClick={() => engine.fileSelect(pi)}>
              <div className="sbm-waveform-empty-icon">🎵</div>
              <div>Drop audio here or click to load</div>
              <div className="sbm-waveform-empty-hint">Supports WAV, MP3, OGG, FLAC, AIFF</div>
            </div>
          ) : (
            <div className="sbm-waveform-empty">
              <div>← Select a pad to begin</div>
            </div>
          )}
        </div>

        {/* Sample Info */}
        {pad?.buffer && (
          <div className="sbm-sample-info">
            <span className="sbm-info-name" style={{ color: pad.color }}>{pad.name}</span>
            <span>{pad.buffer.duration.toFixed(3)}s</span>
            <span>{pad.buffer.numberOfChannels}ch</span>
            <span>{pad.buffer.sampleRate}Hz</span>
            <span>{pad.playMode}</span>
            <span className="sbm-info-program">{pad.programType}</span>
            {engine.detectedBpm > 0 && <span>~{engine.detectedBpm} BPM</span>}
            {engine.detectedKey && <span>{engine.detectedKey.key} {engine.detectedKey.scale}</span>}
          </div>
        )}

        {/* Inline Settings */}
        {pad && (
          <div className="sbm-inline-settings">
            <label className="sbm-inline-ctrl">
              <span>Vol</span>
              <input type="range" min="0" max="1" step="0.01" value={pad.volume}
                onChange={(e) => engine.updatePad(pi, { volume: +e.target.value })} />
              <span>{Math.round(pad.volume * 100)}</span>
            </label>
            <label className="sbm-inline-ctrl">
              <span>Pitch</span>
              <input type="range" min="-24" max="24" step="1" value={pad.pitch}
                onChange={(e) => engine.updatePad(pi, { pitch: +e.target.value })} />
              <span>{pad.pitch > 0 ? '+' : ''}{pad.pitch}</span>
            </label>
            <label className="sbm-inline-ctrl">
              <span>Start</span>
              <input type="range" min="0" max={pad.buffer?.duration || 1} step="0.001"
                value={pad.trimStart}
                onChange={(e) => engine.updatePad(pi, { trimStart: +e.target.value })} />
              <span>{pad.trimStart.toFixed(2)}</span>
            </label>
            <label className="sbm-inline-ctrl">
              <span>End</span>
              <input type="range" min="0" max={pad.buffer?.duration || 1} step="0.001"
                value={pad.trimEnd || pad.buffer?.duration || 0}
                onChange={(e) => engine.updatePad(pi, { trimEnd: +e.target.value })} />
              <span>{(pad.trimEnd || pad.buffer?.duration || 0).toFixed(2)}</span>
            </label>
            <select className="sbm-inline-sel" value={pad.playMode}
              onChange={(e) => engine.updatePad(pi, { playMode: e.target.value })}>
              <option value="oneshot">One Shot</option>
              <option value="hold">Hold</option>
              <option value="loop">Loop</option>
            </select>
            <select className="sbm-inline-sel" value={pad.programType}
              onChange={(e) => engine.updatePad(pi, { programType: e.target.value })}>
              <option value="drum">Drum</option>
              <option value="keygroup">Keygroup</option>
              <option value="clip">Clip</option>
            </select>
            <button className="sbm-btn-sm danger" onClick={() => { if (window.confirm('Clear pad?')) engine.clearPad(pi); }}>🗑️</button>
          </div>
        )}

        {/* ── Piano Keyboard (shown in Piano sub-tab or when keygroup) ── */}
        {(subTab === 'piano' || (pad?.programType === 'keygroup')) && pi !== null && (
          <div className="sbm-piano-section">
            <div className="sbm-piano-header">
              <span>🎹 Piano — Root: {CHROMATIC_KEYS[(pad?.rootNote || 60) % 12]}{Math.floor((pad?.rootNote || 60) / 12) - 1}</span>
              {pad?.programType !== 'keygroup' && (
                <button className="sbm-btn-sm" onClick={() => engine.updatePad(pi, { programType: 'keygroup' })}>
                  Switch to Keygroup
                </button>
              )}
              {pad?.programType === 'keygroup' && (
                <select value={pad.rootNote}
                  onChange={(e) => engine.updatePad(pi, { rootNote: +e.target.value })}>
                  {Array.from({ length: 49 }, (_, i) => i + 36).map(n => (
                    <option key={n} value={n}>{CHROMATIC_KEYS[n % 12]}{Math.floor(n / 12) - 1}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="sbm-piano-keys">
              {Array.from({ length: 37 }, (_, i) => i + 48).map(note => {
                const name = CHROMATIC_KEYS[note % 12];
                const isBlack = name.includes('#');
                const isActive = engine.activeKgNotes.has(note);
                return (
                  <button key={note}
                    className={`sbm-piano-key ${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''}`}
                    onMouseDown={() => {
                      if (pad?.programType === 'keygroup' && pad?.buffer) {
                        engine.playPadKeygroup(pi, note, 0.8);
                      }
                    }}
                    onMouseUp={() => {
                      if (pad?.programType === 'keygroup') {
                        engine.stopPadKeygroup(pi, note);
                      }
                    }}
                    onMouseLeave={() => {
                      if (pad?.programType === 'keygroup') {
                        engine.stopPadKeygroup(pi, note);
                      }
                    }}>
                    {!isBlack && (
                      <span className="sbm-piano-key-label">
                        {name}{Math.floor(note / 12) - 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {(!pad?.buffer) && (
              <div className="sbm-piano-hint">Load a sample first to play it chromatically</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SamplerTab;