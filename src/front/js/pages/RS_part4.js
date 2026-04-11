// =============================================================================
// RecordingStudio.js — Part 4/4
// Full JSX render — zero inline styles
// =============================================================================

  const afx = activeEffectsTrack !== null ? tracks[activeEffectsTrack] : null;

  return (
    <div className="daw">
      <DAWMenuBar
        viewMode={viewMode} isPlaying={isPlaying} isRecording={isRecording}
        metronomeOn={metronomeOn} countIn={countIn} tracks={tracks} maxTracks={maxTracks}
        saving={saving} mixingDown={mixingDown} pianoRollNotes={pianoRollNotes}
        bpm={bpm} projectName={projectName} onAction={handleMenuAction}
      />

      {/* ═══ TOP BAR ═══ */}
      <div className="daw-topbar">
        <div className="daw-topbar-row1">
          <div className="daw-topbar-left">
            <button className="daw-icon-btn" onClick={newProject} title="New">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button className="daw-icon-btn" onClick={loadProjectList} title="Open">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button className={"daw-icon-btn" + (saving ? " saving" : "")} onClick={saveProject} title="Save" disabled={saving}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
            <div className="daw-divider"/>
            <input className="daw-project-name" value={projectName} onChange={e => setProjectName(e.target.value)}/>
          </div>

          <div className="daw-transport">
            <button className="daw-transport-btn" onClick={rewind} disabled={isRecording} title="Rewind">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zM7 19V5H5v14h2z"/></svg>
            </button>
            <button className="daw-transport-btn" onClick={stopEverything} title="Stop">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
            <button className={"daw-transport-btn daw-play-btn" + (isPlaying && !isRecording ? " active" : "")}
              onClick={() => isPlaying ? stopPlayback() : startPlayback()} disabled={isRecording} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying && !isRecording
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button className={"daw-transport-btn daw-rec-btn" + (isRecording ? " active" : "")}
              onClick={() => isRecording ? stopRecording() : startRecording()} title={isRecording ? "Stop Recording" : "Record"}>
              <span className="daw-rec-dot"/>
            </button>
            <div className="daw-lcd">
              <span className="daw-lcd-time">{fmt(currentTime)}</span>
              <span className="daw-lcd-sep">|</span>
              <span className="daw-lcd-bpm">{bpm} BPM</span>
            </div>
            <button className={"rs-split-toggle-btn" + (splitScreen ? " active" : "")} onClick={() => setSplitScreen(s => !s)} title="Split view">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="10" height="4.5" rx="0.5"/><rect x="1" y="6.5" width="10" height="4.5" rx="0.5"/></svg>
              SPLIT
            </button>
            <button className={"daw-transport-btn daw-metro-btn" + (metronomeOn ? " active" : "")}
              onClick={() => { const ctx = getCtx(); if (metronomeOn) { stopMetronome(); setMetronomeOn(false); } else { startMetronome(ctx); setMetronomeOn(true); } }} title="Metronome">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L8 22h8L12 2z"/><line x1="12" y1="8" x2="18" y2="4"/></svg>
            </button>
            <button className={"daw-transport-btn rs-transport-label" + (countIn ? " active" : "")} onClick={() => setCountIn(!countIn)} title="Count-in">1234</button>
            <MidiDeviceIndicator devices={instrumentEngine.midiDevices} activeDevice={instrumentEngine.activeMidiDevice} midiActivity={instrumentEngine.midiActivity} onConnect={instrumentEngine.connectMidiDevice} onDisconnect={instrumentEngine.disconnectMidiDevice}/>
            <KeyboardOctaveIndicator octave={instrumentEngine.keyboardOctave} onOctaveChange={instrumentEngine.setKeyboardOctave}/>
            <div className="daw-monitor-row">
              <span className="daw-monitor-label">🔊 MON</span>
              <select value={monitorSpeaker} onChange={e => setMonitorSpeaker(e.target.value)}
                className={"daw-monitor-select" + (monitorSpeaker === "flat" ? "" : MONITOR_EQ[monitorSpeaker]?.cat === "pro" ? " pro" : " consumer")}
                title="Monitor speaker simulation">
                <optgroup label="── Bypass ──"><option value="flat">Flat (Bypass)</option></optgroup>
                <optgroup label="── Pro Monitors ──">
                  {Object.entries(MONITOR_EQ).filter(([, v]) => v.cat === "pro").map(([id, v]) => <option key={id} value={id}>{v.name}</option>)}
                </optgroup>
                <optgroup label="── Consumer ──">
                  {Object.entries(MONITOR_EQ).filter(([, v]) => v.cat === "consumer").map(([id, v]) => <option key={id} value={id}>{v.name}</option>)}
                </optgroup>
              </select>
            </div>
          </div>

          <CollabToolbar collab={collab}/>
          {midiEnabled && <MidiHardwareInput drumMode={viewMode === "beatmaker" || viewMode === "sampler"} onNoteOn={(note, vel) => setStatus(`MIDI: Note ${note} vel ${vel}`)} onNoteOff={() => {}} onCC={(cc, val) => { if (cc === 7) tracks.forEach((t, i) => { if (selectedTrack === i) updateTrack(i, { volume: val / 127 }); }); if (cc === 10) tracks.forEach((t, i) => { if (selectedTrack === i) updateTrack(i, { pan: (val - 64) / 64 }); }); }} onPadTrigger={pad => setStatus(`Pad ${pad} triggered`)}/>}
          {wamPlugins.length > 0 && <span className="rs-wam-badge"><span className="rs-wam-text">🔌 {wamPlugins.length} WAM</span></span>}

          <div className="daw-topbar-right">
            {latencyMs > 0 && <div className={"daw-latency-badge" + (latencyMs < 20 ? " good" : latencyMs < 50 ? " ok" : " bad")}>⚡ {latencyMs}ms</div>}
            <button className={"daw-icon-btn" + (monitoringEnabled ? " active" : "")} onClick={() => toggleMonitoring(selectedTrack)} title={"Direct monitoring " + (monitoringEnabled ? "ON" : "OFF")}>🎧</button>
            <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="daw-input-select">
              <option value="default">Default Mic</option>
              {inputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>)}
            </select>
            <div className="daw-input-meter"><div className="daw-input-meter-fill" style={{ width: `${inputLevel * 100}%` }}/></div>
            <span className="daw-status">{status}</span>
          </div>
        </div>

        <div className="daw-topbar-row2">
          <div className="daw-tabs-row">
            {[["arrange","Arrange"],["console","Console"],["pianoroll","Piano Roll"],["score","Score"],["beatmaker","Beat Maker"],["piano","Piano"],["chords","Chords"],["sounds","Sounds"]].map(([m, l]) => (
              <button key={m} className={"daw-view-tab" + (viewMode === m ? " active" : "")} onClick={() => setViewMode(m)}>{l}</button>
            ))}
            <MixDropdown viewMode={viewMode} setViewMode={setViewMode}/>
            <ToolsDropdown viewMode={viewMode} setViewMode={setViewMode}/>
          </div>
        </div>
      </div>

      {/* ═══ MAIN VIEW ═══ */}
      <div className="daw-main">

        {/* ARRANGE */}
        {!splitScreen && viewMode === "arrange" && (
          <div className="rs-relative">
            <ArrangerView cycleEnabled={cycleEnabled} cycleStart={cycleStart} cycleEnd={cycleEnd}
              onCycleChange={(s, e) => { setCycleStart(s); setCycleEnd(e); }} onCycleToggle={() => setCycleEnabled(e => !e)}
              tracks={tracks} setTracks={setTracks} bpm={bpm} timeSignatureTop={timeSignature[0]} timeSignatureBottom={timeSignature[1]}
              masterVolume={masterVolume} onMasterVolumeChange={setMasterVolume} projectName={projectName} userTier={userTier}
              playheadBeat={playheadBeat} isPlaying={isPlaying} isRecording={isRecording}
              onPlay={handleArrangerPlay} onStop={handleArrangerStop} onRecord={handleArrangerRecord}
              onSeek={seekToBeat} onBpmChange={handleBpmChange} onTimeSignatureChange={handleTimeSignatureChange}
              onToggleFx={handleToggleFx} onBounce={mixDownProject} onSave={saveProject} saving={saving}
              instrumentEngine={instrumentEngine} onBrowseSounds={handleBrowseSounds}
              onOpenPianoRoll={onOpenPianoRoll} onTimelineDoubleClick={handleTimelineDoubleClick}
              MidiRegionPreview={MidiRegionPreview}/>
            <CollabOverlay collab={collab} tracks={tracks} trackHeight={48}/>
          </div>
        )}

        {/* AUDIO SETTINGS */}
        {showAudioSettings && (
          <div className="daw-audio-settings-overlay" onClick={() => setShowAudioSettings(false)}>
            <div className="daw-audio-settings-panel" onClick={e => e.stopPropagation()}>
              <div className="daw-audio-settings-header">
                <span className="rs-settings-title">AUDIO SETTINGS</span>
                <button onClick={() => setShowAudioSettings(false)} className="rs-close-btn">✕</button>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">BUFFER SIZE</label>
                <div className="rs-settings-row">
                  {[64, 128, 256, 512, 1024, 2048].map(size => (
                    <button key={size} onClick={() => recreateAudioContext(size, audioSampleRate)} className={"daw-settings-size-btn " + (audioBufferSize === size ? "active" : "inactive")}>{size}</button>
                  ))}
                </div>
                <div className="rs-hint">{audioBufferSize <= 128 ? "⚡ Low latency" : audioBufferSize <= 512 ? "✓ Balanced" : "🔇 High stability"}</div>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">SAMPLE RATE</label>
                <div className="rs-settings-row">
                  {[44100, 48000, 96000].map(sr => (
                    <button key={sr} onClick={() => recreateAudioContext(audioBufferSize, sr)} className={"daw-settings-sr-btn " + (audioSampleRate === sr ? "active" : "inactive")}>{sr >= 1000 ? `${sr / 1000}kHz` : `${sr}Hz`}</button>
                  ))}
                </div>
              </div>
              <div className="rs-latency-box">
                <div className="rs-stat-row"><span className="rs-stat-label">Measured Latency</span><span className="rs-stat-val-teal">{latencyMs}ms</span></div>
                <div className="rs-stat-row"><span className="rs-stat-label">Sample Rate</span><span className="rs-stat-val">{audioSampleRate}Hz</span></div>
                <div className="rs-stat-row-last"><span className="rs-stat-label">Scheduler Lookahead</span><span className="rs-stat-val">{audioLookahead}ms</span></div>
              </div>
              <div className="rs-settings-section">
                <label className="rs-settings-label">LATENCY COMPENSATION: {latencyCompMs}ms</label>
                <input type="range" min={0} max={100} step={1} value={latencyCompMs} onChange={e => setLatencyCompMs(Number(e.target.value))} className="rs-range-teal"/>
              </div>
              <div className="rs-hint-center">Changes take effect immediately.</div>
            </div>
          </div>
        )}

        {/* FLEX PITCH */}
        {showFlexPitch && (
          <div className="daw-flexpitch-overlay">
            <FlexPitchEditor audioBuffer={flexPitchBuffer} audioContext={audioCtxRef?.current}
              trackName={tracks[flexPitchTrack]?.name ?? `Track ${(flexPitchTrack ?? 0) + 1}`}
              onClose={() => setShowFlexPitch(false)} onExport={handleFlexPitchExport}/>
          </div>
        )}

        {/* SPLIT SCREEN */}
        {splitScreen && (
          <div ref={splitContainerRef} className="rs-split-screen">
            <div className="rs-split-top" style={{ height: `${splitTopH}%` }}>
              <span className="rs-split-pane-label">ARRANGE</span>
              <ArrangerView tracks={tracks} bpm={bpm} currentTime={currentTime} isPlaying={isPlaying}
                selectedTrack={selectedTrack} onSelectTrack={setSelectedTrack} zoom={zoom} onZoomChange={setZoom}
                onBrowseSounds={handleBrowseSounds} onOpenPianoRoll={onOpenPianoRoll}
                onTimelineDoubleClick={handleTimelineDoubleClick} MidiRegionPreview={MidiRegionPreview}/>
            </div>
            <div className="rs-split-handle" onMouseDown={handleSplitMouseDown} title="Drag to resize"/>
            <div className="rs-split-bottom" style={{ height: `${100 - splitTopH}%` }}>
              <span className="rs-split-pane-label">MIXER</span>
              <div className="daw-console">
                <div className="daw-console-scroll">
                  {tracks.map((t, i) => {
                    const meter = meterLevels?.[i] || { left: 0, right: 0, peak: 0 };
                    return (
                      <div key={t.id ?? i} className={"daw-channel" + (i === selectedTrack ? " selected" : "")} onClick={() => setSelectedTrack(i)}>
                        <div className="daw-ch-colorbar" style={{ background: t.color || "#4a90d9" }}/>
                        <div className="daw-ch-controls">
                          <button className={"daw-ch-btn" + (t.muted ? " mute active" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { muted: !t.muted }); }}>M</button>
                          <button className={"daw-ch-btn" + (t.solo ? " solo active" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { solo: !t.solo }); }}>S</button>
                        </div>
                        <div className="daw-ch-fader-area">
                          <div className="daw-ch-fader-row">
                            <div className="daw-ch-fader">
                              <input type="range" min={0} max={1} step={0.01} value={t.volume ?? 0.8} onChange={e => updateTrack(i, { volume: parseFloat(e.target.value) })}/>
                            </div>
                            <div className="daw-ch-meter">
                              <div className="daw-ch-meter-bar" style={{ height: `${Math.round((meter.left || 0) * 100)}%`, background: meter.peak > 0.9 ? "#ff3b30" : "#00ffc8" }}/>
                            </div>
                          </div>
                        </div>
                        <div className="daw-ch-vol-display"><div className="daw-ch-vol-readout">{t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"}</div></div>
                        <div className="daw-ch-name daw-ch-name-bottom">
                          <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))}>
                            {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                          </select>
                          <span className="daw-ch-track-label" style={{ color: t.color || "#cdd9e5" }}>{t.name || `Track ${i + 1}`}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="daw-channel master-channel">
                    <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                    <div className="daw-ch-controls">
                      <button className="daw-ch-btn">M</button>
                      <button className="daw-ch-btn">S</button>
                    </div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-fader">
                          <input type="range" min={0} max={1} step={0.01} value={masterVolume ?? 1} onChange={e => setMasterVolume(parseFloat(e.target.value))}/>
                        </div>
                        <div className="daw-ch-meter">
                          <div className="daw-ch-meter-bar" style={{ height: `${Math.round((masterMeterLevels?.left || 0) * 100)}%`, background: "#ff8a3d" }}/>
                        </div>
                      </div>
                    </div>
                    <div className="daw-ch-vol-display"><div className="daw-ch-vol-readout rs-orange">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : "-∞"} dB</div></div>
                    <div className="daw-ch-name daw-ch-name-bottom">
                      <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                      <span className="daw-ch-track-label rs-orange">MASTER</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONSOLE VIEW */}
        {!splitScreen && viewMode === "console" && (
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t, i) => {
                const meter = meterLevels[i] || { left: 0, right: 0, peak: 0 };
                const loaded = ALL_FX_EXTENDED.filter(fx => t.effects?.[fx.key]?.enabled);
                return (
                  <div key={t.id} className={"daw-channel" + (selectedTrack === i ? " selected" : "") + (t.armed ? " armed" : "")} onClick={() => setSelectedTrack(i)}>
                    <div className="daw-ch-colorbar" style={{ background: t.color || "#4a90d9" }}/>
                    <div className="daw-ch-header">
                      <span className="daw-ch-type-icon">{t.trackType === "midi" ? "🎹" : "🎙"}</span>
                      <span className="daw-ch-header-num">{i + 1}</span>
                    </div>
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-value">{t.input || "Default In"}</span>
                      <MicModelSelector trackIndex={i} currentModel={trackMicModels[i] || "none"} onApply={handleConsoleMicModel}/>
                    </div>
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx => (
                        <div key={fx.key} className={"daw-ch-insert-slot active " + (fx.type || "")}
                          onClick={e => { e.stopPropagation(); setSelectedTrack(i); setSelectedTrackIndex(i); setActiveEffectsTrack(i); setOpenFxKey(fx.key); }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); updateEffect(i, fx.key, "enabled", false); }}>
                          {fx.name}
                        </div>
                      ))}
                      {loaded.length < 8 && (
                        <div className="daw-ch-insert-slot empty"
                          onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); setInsertPickerState({ trackIndex: i, x: rect.right + 4, y: rect.top }); }}>
                          + Insert
                        </div>
                      )}
                    </div>
                    <div className="daw-ch-controls">
                      <div className={"daw-ch-badge" + (t.muted ? " m-on" : "")} onClick={e => { e.stopPropagation(); const nm = !t.muted; updateTrack(i, { muted: nm }); const audible = !nm && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? t.volume : 0; }}>M</div>
                      <div className={"daw-ch-badge" + (t.solo ? " s-on" : "")} onClick={e => { e.stopPropagation(); const ns = !t.solo; updateTrack(i, { solo: ns }); const whs = tracks.some((x, idx) => idx === i ? ns : x.solo); tracks.forEach((x, idx) => { const gn = trackGainsRef.current[idx]; if (!gn) return; const s = idx === i ? ns : x.solo; gn.gain.value = (!x.muted && (!whs || s)) ? x.volume : 0; }); }}>S</div>
                      <div className={"daw-ch-badge" + (selectedTrack === i ? " e-on" : "")} onClick={e => { e.stopPropagation(); setSelectedTrack(i); setActiveEffectsTrack(i); }}>e</div>
                      <button className={"daw-ch-rec-btn" + (t.armed ? " armed" : "")} onClick={e => { e.stopPropagation(); updateTrack(i, { armed: !t.armed }); }} title="Record arm">●</button>
                    </div>
                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v => updateTrack(i, { pan: v })} size={32}/>
                      <span className="daw-ch-pan-val">{t.pan === 0 ? "C" : t.pan > 0 ? `R${Math.round(t.pan * 100)}` : `L${Math.round(Math.abs(t.pan) * 100)}`}</span>
                    </div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-fader">
                          <input type="range" min="0" max="1" step="0.005" value={t.volume}
                            onChange={e => { const v = parseFloat(e.target.value); updateTrack(i, { volume: v }); const audible = !t.muted && (!hasSolo || t.solo); if (trackGainsRef.current[i]) trackGainsRef.current[i].gain.value = audible ? v : 0; }}/>
                        </div>
                        <CubaseMeter leftLevel={meter.left || 0} rightLevel={meter.right || 0} height={180} showScale={false}/>
                      </div>
                      <div className="daw-ch-vol-display">
                        <span className="daw-ch-vol-val">{t.volume > 0 ? (20 * Math.log10(t.volume)).toFixed(1) : "-∞"} dB</span>
                      </div>
                    </div>
                    <div className="daw-ch-automation">
                      <div className={"daw-ch-rw" + (t.readAutomation ? " active" : "")}>R</div>
                      <div className={"daw-ch-rw" + (t.writeAutomation ? " active" : "")}>W</div>
                    </div>
                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name} onChange={e => updateTrack(i, { name: e.target.value })} onClick={e => e.stopPropagation()}/>
                      <select className="daw-ch-console-select" value={trackConsoleChar[t.id] || "none"} onChange={e => setTrackConsoleChar(prev => ({ ...prev, [t.id]: e.target.value }))} onClick={e => e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-colorbar" style={{ background: "#ff8a3d" }}/>
                <div className="daw-ch-header">
                  <span className="daw-ch-type-icon">🎚</span>
                  <span className="daw-ch-header-num">M</span>
                </div>
                <div className="daw-ch-routing"><span className="daw-ch-routing-value">Stereo Out</span></div>
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">MASTER BUS</div>
                  <div className="daw-ch-insert-slot empty">Stereo Out</div>
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                  <div className="daw-ch-rec-btn"/>
                </div>
                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={v => setMasterPan(v)} size={32}/>
                  <span className="daw-ch-pan-val">{masterPan === 0 ? "C" : masterPan > 0 ? `R${Math.round(masterPan * 100)}` : `L${Math.round(Math.abs(masterPan) * 100)}`}</span>
                </div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                    <div className="daw-ch-fader">
                      <input type="range" min="0" max="1" step="0.005" value={masterVolume}
                        onChange={e => { const v = parseFloat(e.target.value); setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v; }}/>
                    </div>
                    <CubaseMeter leftLevel={masterMeterLevels?.left || 0} rightLevel={masterMeterLevels?.right || 0} height={180} showScale={false}/>
                  </div>
                  <div className="daw-ch-vol-display">
                    <span className="daw-ch-vol-val rs-orange">{masterVolume > 0 ? (20 * Math.log10(masterVolume)).toFixed(1) : "-∞"} dB</span>
                  </div>
                </div>
                <div className="daw-ch-automation">
                  <div className="daw-ch-rw">R</div>
                  <div className="daw-ch-rw">W</div>
                </div>
                <div className="daw-ch-name">
                  <span className="rs-master-label">MASTER</span>
                  <select className="daw-ch-console-select" value={masterConsoleChar} onChange={e => setMasterConsoleChar(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id, b]) => <option key={id} value={id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BEAT MAKER */}
        {viewMode === "beatmaker" && (
          <SamplerBeatMaker onExport={handleBeatExport} onClose={() => setViewMode("arrange")} isEmbedded={true}
            onSendToArrange={(audioBuffer, name) => { const idx = selectedTrackIndex; updateTrack(idx, { audioBuffer, name: name || tracks[idx].name }); setViewMode("arrange"); setStatus(`Beat bounced to Track ${idx + 1}`); }}
            incomingSample={window.__spx_sampler_export || null} projectBpm={bpm} projectKey={pianoRollKey} projectScale={pianoRollScale} projectId={projectId}
            onBpmSync={newBpm => { setBpm(newBpm); setStatus(`✓ BPM synced: ${newBpm}`); }}
            onKeySync={(key, scale) => { setPianoRollKey(key); setPianoRollScale(scale); setStatus(`✓ Key synced: ${key} ${scale}`); }}
            onExportToArrange={(midiNotes) => {
              let drumTrackIdx = tracks.findIndex((t, idx) => (t.trackType === "midi" || t.trackType === "instrument") && instrumentEngine.getTrackInstrument(idx)?.isDrum);
              if (drumTrackIdx === -1) { setTracks(prev => { drumTrackIdx = prev.length; return [...prev, DEFAULT_TRACK(prev.length, "midi")]; }); }
              const region = createMidiRegionFromNotes(midiNotes, "Beat Pattern");
              region.startBeat = isPlaying ? playheadBeat : 0;
              setTracks(prev => prev.map((t, i) => i === drumTrackIdx ? { ...t, regions: [...(t.regions || []), region] } : t));
              setStatus(`🥁 Beat → Arrange Track ${drumTrackIdx + 1}`); setViewMode("arrange");
            }}
            chordsComponent={<ChordProgressionGenerator musicalKey={pianoRollKey} scale={pianoRollScale} bpm={bpm} timeSignature={timeSignature} onInsertChords={handleChordInsert} onKeyChange={handleChordKeyChange} audioContext={audioCtxRef.current} onClose={() => {}} isEmbedded={true}/>}
            soundsComponent={<FreesoundBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" }); setStatus(`🎵 "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setStatus(`🎵 "${name}" loaded to Sampler`); } }} isEmbedded={true}/>}
            loopsComponent={<LoopermanBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Loop" }); createRegionFromImport(ai, audioBuffer, name || "Loop", audioUrl); setStatus(`✓ "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setStatus(`Loop "${name}" sent to Sampler`); } }} onClose={() => {}} isEmbedded={true}/>}
            aiBeatsComponent={<AIBeatAssistant onApplyPattern={handleAIBeatApply} onClose={() => {}} isEmbedded={true}/>}
            voiceMidiComponent={<VoiceToMIDI audioContext={audioCtxRef.current} bpm={bpm} isEmbedded={true} onNoteOn={({ note, velocity }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity); }} onNoteOff={({ note }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note); }}/>}
          />
        )}

        {viewMode === "pianoroll"    && <div className="daw-pianoroll-view"><PianoRoll notes={pianoRollNotes} onNotesChange={handlePianoRollNotesChange} bpm={bpm} timeSignature={timeSignature} musicalKey={pianoRollKey} scale={pianoRollScale} isPlaying={isPlaying} currentBeat={playheadBeat} audioContext={audioCtxRef.current} onExport={handlePianoRollExport} onClose={() => setViewMode("beatmaker")} isEmbedded={true} editingRegion={editingRegion} onSaveToRegion={savePianoRollToRegion}/></div>}
        {viewMode === "chords"       && <div className="daw-chords-view"><ChordProgressionGenerator musicalKey={pianoRollKey} scale={pianoRollScale} bpm={bpm} timeSignature={timeSignature} onInsertChords={handleChordInsert} onKeyChange={handleChordKeyChange} audioContext={audioCtxRef.current} onClose={() => setViewMode("pianoroll")} isEmbedded={true}/></div>}
        {viewMode === "piano"        && <div className="daw-piano-view rs-view-full"><VirtualPiano audioContext={audioCtxRef.current} onRecordingComplete={() => {}} embedded={true}/></div>}
        {viewMode === "sounds"       && <div className="daw-freesound-view"><FreesoundBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const armedMidi = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedMidi !== -1) { instrumentEngine.loadSampleOntoTrack(armedMidi, audioBuffer, name, 60); setStatus(`🎵 "${name}" → Track ${armedMidi + 1} — play keys to hear`); } else { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Freesound Sample" }); createRegionFromImport(ai, audioBuffer, name || "Freesound Sample", audioUrl); setStatus(`✓ "${name}" loaded → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setViewMode("beatmaker"); setStatus(`Sample "${name}" sent to Beat Maker`); } } }} onApplyMicProfile={handleApplyMicProfile} onClose={() => setShowMicSimModal(false)} isEmbedded={true}/></div>}
        {viewMode === "vocal"        && <div className="daw-vocal-view rs-view-scroll"><VocalProcessor audioContext={audioCtxRef.current} liveStream={micSimStream} onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai === -1) { setStatus("⚠ Arm a track first"); return; } const ctx = getCtx(); const audioUrl = URL.createObjectURL(blob); blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => { updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl); uploadTrack(blob, ai); setStatus(`✓ Vocal recorded → Track ${ai + 1}`); setViewMode("arrange"); }).catch(e => setStatus(`✗ ${e.message}`)); }} onApplyMicProfile={handleApplyMicProfile} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "keyfinder"    && <div className="daw-keyfinder-view"><KeyFinder tracks={tracks} audioContext={audioCtxRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true}/><div className="rs-bottom-toolbar"><button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">🔧 Build Custom Mic</button>{customMicProfiles.length > 0 && <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? "s" : ""} saved</span>}</div>{showMicBuilder && (<div className="rs-modal-overlay"><div className="rs-modal-panel"><CustomMicBuilder onSave={(profileId, profile) => { setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), { id: profileId, ...profile }]); setShowMicBuilder(false); }} onClose={() => setShowMicBuilder(false)}/></div></div>)}</div>}
        {viewMode === "aibeat"       && <div className="daw-aibeat-view"><AIBeatAssistant onApplyPattern={handleAIBeatApply} onClose={() => setViewMode("beatmaker")} isEmbedded={true}/></div>}
        {viewMode === "aimix"        && <div className="daw-aimix-view rs-view-scroll"><AIMixAssistant tracks={tracks} projectId={projectId} bpm={bpm} timeSignature={timeSignature} onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan} onApplyEQ={handleAIApplyEQ} onApplyCompression={handleAIApplyCompression} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "plugins"      && <div className="rs-flex-hidden"><UnifiedFXChain track={tracks[selectedTrackIndex]} trackIndex={selectedTrackIndex} audioContext={audioCtxRef.current} updateEffect={updateEffect} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "fx"           && <div className="rs-flex-scroll-dark"><UnifiedFXChain track={tracks[selectedTrackIndex]} trackIndex={selectedTrackIndex} audioContext={audioCtxRef.current} updateEffect={updateEffect} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "multiband"    && <div className="rs-flex-scroll-dark"><MultibandEffects audioContext={audioCtxRef.current} inputNode={selectedTrackIndex !== null && trackGainsRef.current[selectedTrackIndex] ? trackGainsRef.current[selectedTrackIndex] : masterGainRef.current} outputNode={masterGainRef.current} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "mastering"    && <div className="rs-flex-scroll-dark"><MasteringChain audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current} outputNode={audioCtxRef.current?.destination} masterVolume={masterVolume} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "speakersim"   && <SpeakerSimulator audioContext={audioCtxRef.current} inputNode={masterConsoleOutRef.current || masterGainRef.current}/>}
        {viewMode === "looperman"    && <div className="rs-flex-hidden"><LoopermanBrowser audioContext={audioCtxRef.current} onSoundSelect={(audioBuffer, name, audioUrl) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) { updateTrack(ai, { audioBuffer, audio_url: audioUrl, name: name || "Loop" }); createRegionFromImport(ai, audioBuffer, name || "Loop", audioUrl); setStatus(`✓ "${name}" → Track ${ai + 1}`); } else { window.__spx_sampler_export = { buffer: audioBuffer, name, timestamp: Date.now() }; setViewMode("beatmaker"); setStatus(`Loop "${name}" sent to Beat Maker`); } }} onClose={() => setViewMode("arrange")} isEmbedded={true}/></div>}
        {viewMode === "synth"        && <div className="daw-synth-view rs-view-auto"><SynthCreator onClose={() => setViewMode("arrange")} onAssignToTrack={(preset, audioBuffer) => { if (!audioBuffer) { setStatus("🎛️ Use Assign to Track in Synth Creator"); return; } landBufferOnTrack(audioBuffer, preset?.name || "Synth"); }}/></div>}
        {viewMode === "drumdesigner" && <div className="daw-drumdesigner-view rs-view-auto"><DrumDesigner onClose={() => setViewMode("beatmaker")} onAssignToPad={(data) => { if (data.audioBuffer) window.__spx_sampler_export = { buffer: data.audioBuffer, name: (data.type || "Drum").toUpperCase(), timestamp: Date.now() }; setStatus(`🥁 ${(data.type || "Drum").toUpperCase()} → Beat Maker pad`); setViewMode("beatmaker"); }} onAssignToTrack={(data) => { if (!data.audioBuffer) { setStatus("🥁 Use Send to Track in Drum Designer"); return; } landBufferOnTrack(data.audioBuffer, (data.type || "Drum").toUpperCase()); }}/></div>}
        {viewMode === "instrbuilder" && <div className="daw-instrbuilder-view rs-view-auto"><InstrumentBuilder onClose={() => setViewMode("arrange")} onAssignToTrack={(preset, audioBuffer) => { if (!audioBuffer) { setStatus("🎸 Use Assign to Track in Instrument Builder"); return; } landBufferOnTrack(audioBuffer, preset?.instrName || "Instrument"); }}/></div>}
        {viewMode === "voicemidi"    && <div className="daw-voicemidi-view"><VoiceToMIDI audioContext={audioCtxRef.current} bpm={bpm} isEmbedded={true} onNoteOn={({ note, velocity }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.playNoteOnTrack(armedIdx, note, velocity); }} onNoteOff={({ note }) => { const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx !== -1) instrumentEngine.stopNoteOnTrack(armedIdx, note); }} onNotesGenerated={(notes) => { if (!notes?.length) return; const armedIdx = tracks.findIndex(t => t.armed && (t.trackType === "midi" || t.trackType === "instrument")); if (armedIdx === -1) return; const beatsPerSec = bpm / 60; const midiNotes = notes.map((n, i) => ({ id: `voice_${Date.now()}_${i}`, note: n.note, velocity: n.velocity || 80, startBeat: (n.startTime || n.time || 0) * beatsPerSec, duration: Math.max((n.duration || 0.25) * beatsPerSec, 0.125) })); const inst = instrumentEngine.getTrackInstrument(armedIdx); const region = createMidiRegionFromNotes(midiNotes, inst?.isDrum ? "Beatbox Pattern" : "Voice Melody"); if (playheadBeat > 0) { const offset = region.startBeat; region.startBeat = playheadBeat; region.notes = region.notes.map(n => ({ ...n, startBeat: n.startBeat - offset })); } setTracks(prev => prev.map((t, i) => i === armedIdx ? { ...t, regions: [...(t.regions || []), region] } : t)); setStatus(`🎤 ${midiNotes.length} notes from voice → Track ${armedIdx + 1}`); }} onSendToTrack={(audioBuffer, name) => { const idx = selectedTrackIndex; updateTrack(idx, { audioBuffer, name: name || tracks[idx].name }); setViewMode("arrange"); setStatus(`Vocal MIDI render → Track ${idx + 1}`); }} onClose={() => setViewMode("arrange")}/></div>}
        {viewMode === "takelanes"    && <div className="rs-flex-hidden"><TakeLanes audioContext={audioCtxRef.current} bpm={bpm} onCompositeReady={(compositeBuffer, name) => { const ai = tracks.findIndex(t => t.armed); const targetIdx = ai !== -1 ? ai : selectedTrackIndex; const audioUrl = URL.createObjectURL(new Blob([], { type: "audio/wav" })); updateTrack(targetIdx, { audioBuffer: compositeBuffer, audio_url: audioUrl, name: name || "Comp" }); createRegionFromImport(targetIdx, compositeBuffer, name || "Comp", audioUrl); setStatus(`✓ ${name} → Track ${targetIdx + 1}`); setViewMode("arrange"); }} isEmbedded={true}/></div>}

        {/* ANALOG SUITE */}
        {viewMode === "analog" && (
          <div className="rs-flex-scroll-darker">
            <div className="rs-analog-scale">
              <div className="rs-analog-tabs">
                {[["ampsim","🎸 Amp Sim"],["tape","📼 Tape & Harmonic"],["pedals","🎛️ Pedal Chain"],["console","🎚️ Console"]].map(([id, label]) => (
                  <button key={id} onClick={() => setAnalogSubview(id)} className={"daw-analog-tab" + (analogSubview === id ? " active" : "")}>{label}</button>
                ))}
              </div>
              {analogSubview === "ampsim"   && <div className="rs-amp-panel"><h3 className="rs-amp-heading">🎸 Guitar & Bass Amp Simulator</h3><p className="rs-amp-subtext">6 amp models · Cabinet sim · Pedal chain · Web Audio processing</p><div className="rs-amp-scale"><AmpSimPlugin audioContext={null} inputNode={null} outputNode={null}/></div></div>}
              {analogSubview === "tape"     && (
                <div className="rs-settings-panel">
                  <div className="rs-dark-card">
                    <div className="rs-card-header"><div><h4 className="rs-card-title">📼 Tape Saturation</h4><p className="rs-card-subtitle">Analog warmth via waveshaper + lowpass filter</p></div><label className="rs-toggle-label"><input type="checkbox" checked={tapeEnabled} onChange={e => { setTapeEnabled(e.target.checked); setFx(f => ({ ...f, tapeSaturation: { ...f.tapeSaturation, enabled: e.target.checked } })); if (audioCtxRef.current) { tracks.forEach(t => { const old = trackNodesRef.current.get(t.id); if (old) { ["input","preGain","panNode","fader","meter"].forEach(k => { try { old[k].disconnect(); } catch (_) {} }); (old.fxNodes || []).forEach(n => { try { n.disconnect(); } catch (_) {} }); } trackNodesRef.current.delete(t.id); ensureTrackGraph(t); }); } }}/><span className={"daw-tape-label" + (tapeEnabled ? " on" : "")}>{tapeEnabled ? "ON" : "OFF"}</span></label></div>
                    {[["DRIVE", tapeDrive, setTapeDrive, "drive"],["WARMTH", tapeWarmth, setTapeWarmth, "warmth"]].map(([lbl, val, setter, key]) => (
                      <div key={lbl} className="rs-param-row"><div className="rs-param-header"><span>{lbl}</span><span className="rs-orange">{(val * 100).toFixed(0)}%</span></div><input type="range" min={0} max={1} step={0.01} value={val} className="rs-range-orange" onChange={e => { const v = parseFloat(e.target.value); setter(v); setFx(f => ({ ...f, tapeSaturation: { ...f.tapeSaturation, [key]: v } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/></div>
                    ))}
                  </div>
                  <div className="rs-dark-card">
                    <div className="rs-card-header"><div><h4 className="rs-card-title">⚡ Harmonic Exciter</h4><p className="rs-card-subtitle">Aphex-style presence enhancer</p></div><label className="rs-toggle-label"><input type="checkbox" checked={harmonicEnabled} onChange={e => { setHarmonicEnabled(e.target.checked); setFx(f => ({ ...f, exciter: { ...f.exciter, enabled: e.target.checked } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/><span className={"daw-harmonic-label" + (harmonicEnabled ? " on" : "")}>{harmonicEnabled ? "ON" : "OFF"}</span></label></div>
                    <div className="rs-param-header"><span>AMOUNT</span><span className="rs-yellow-text">{(harmonicAmount * 100).toFixed(0)}%</span></div>
                    <input type="range" min={0} max={1} step={0.01} value={harmonicAmount} className="rs-range-yellow" onChange={e => { const v = parseFloat(e.target.value); setHarmonicAmount(v); setFx(f => ({ ...f, exciter: { ...f.exciter, amount: v } })); tracks.forEach(t => rebuildTrackGraph(t.id)); }}/>
                  </div>
                </div>
              )}
              {analogSubview === "pedals"  && <div className="rs-amp-panel"><h4 className="daw-pedals-heading">🎛️ Signal Chain</h4><p className="daw-pedals-sub">Analog-modeled effects in series — Tuner → Compressor → Overdrive → Chorus → Delay → Reverb</p><div className="rs-chain-grid">{[["🎵","Tuner"],["🗜️","Compressor"],["🔥","Overdrive"],["🌊","Chorus"],["⏱️","Delay"],["🏔️","Reverb"]].map(([icon, name]) => (<div key={name} className="rs-effect-card daw-pedal-card"><span className="rs-effect-icon">{icon}</span><span className="rs-effect-name">{name}</span><div className="rs-effect-knob"/></div>))}</div><p className="rs-hint-sm">Full pedal chain in Amp Sim tab → Pedal Chain section</p></div>}
              {analogSubview === "console" && <div className="rs-console-panel"><div className="rs-console-label">CONSOLE CHARACTER — Applied to each track and master bus</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => { const nc = {}; tracks.forEach(t => { nc[t.id] = id; }); setTrackConsoleChar(nc); }} className="daw-console-board-btn" style={{ borderColor: b.color, background: id === "none" ? "#0d1117" : `${b.color}22`, color: b.color }}>{b.name}</button>))}</div><div className="rs-master-bus-label">MASTER BUS</div><div className="rs-console-btn-row">{Object.entries(CONSOLE_BOARDS).map(([id, b]) => (<button key={id} onClick={() => setMasterConsoleChar(id)} className="daw-console-board-btn-sm" style={{ borderColor: masterConsoleChar === id ? b.color : "#21262d", background: masterConsoleChar === id ? `${b.color}22` : "#0d1117", color: masterConsoleChar === id ? b.color : "#4e6a82" }}>{b.name}</button>))}</div><div className="rs-console-hint">Per-track: Use the Console tab dropdown on each channel strip</div></div>}
            </div>
          </div>
        )}

        {/* MIC SIM MODAL */}
        {showMicSimModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={() => setShowMicSimModal(false)} className="rs-modal-close">✕</button>
            <MicSimulator audioContext={audioCtxRef.current} liveStream={micSimStream}
              onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai === -1) { setStatus("⚠ Arm a track first"); return; } const ctx = getCtx(); const audioUrl = URL.createObjectURL(blob); blob.arrayBuffer().then(ab => ctx.decodeAudioData(ab)).then(buf => { updateTrack(ai, { audioBuffer: buf, audio_url: audioUrl }); createRegionFromRecording(ai, buf, audioUrl); uploadTrack(blob, ai); setStatus(`✓ Mic Sim recorded → Track ${ai + 1}`); setViewMode("arrange"); }).catch(e => setStatus(`✗ ${e.message}`)); }}
              onApplyMicProfile={handleApplyMicProfile} onClose={() => setViewMode("arrange")} isEmbedded={true}/>
            <div className="rs-bottom-toolbar">
              <button onClick={() => setShowMicBuilder(true)} className="rs-action-btn-teal">🔧 Build Custom Mic</button>
              {customMicProfiles.length > 0 && <span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length > 1 ? "s" : ""} saved</span>}
            </div>
            {showMicBuilder && (<div className="rs-modal-overlay"><div className="rs-modal-panel"><CustomMicBuilder onSave={(profileId, profile) => { setCustomMicProfiles(prev => [...prev.filter(p => p.id !== profileId), { id: profileId, ...profile }]); setShowMicBuilder(false); }} onClose={() => setShowMicBuilder(false)}/></div></div>)}
          </div>
        )}

        {/* VOCAL MODAL */}
        {showVocalModal && (
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={() => setShowVocalModal(false)} className="rs-modal-close">✕</button>
            <VocalProcessor audioContext={audioCtxRef.current} isEmbedded={true} tracks={tracks} selectedTrackIndex={selectedTrackIndex} bpm={bpm}
              onApplyToConsole={handleApplyVocalFx} onClose={() => setShowVocalModal(false)}
              onSendToTrack={(buf, name) => { const ai = tracks.findIndex(t => t.armed); const idx = ai !== -1 ? ai : selectedTrackIndex; const audioUrl = URL.createObjectURL(new Blob([])); updateTrack(idx, { audioBuffer: buf, audio_url: audioUrl, name: name || tracks[idx].name }); createRegionFromImport(idx, buf, name || "Vocal Take", audioUrl); setStatus(`✓ Vocal take → Track ${idx + 1}`); setViewMode("arrange"); }}
              onRecordingComplete={(blob) => { const ai = tracks.findIndex(t => t.armed); if (ai !== -1) uploadTrack(blob, ai); }}/>
          </div>
        )}

        {/* PROJECT LIST MODAL */}
        {showProjectList && (
          <div className="daw-modal-overlay" onClick={() => setShowProjectList(false)}>
            <div className="daw-modal" onClick={e => e.stopPropagation()}>
              <h2>Open Project</h2>
              {projects.length === 0 ? <p className="daw-empty">No saved projects</p> : (
                <div className="daw-project-list">
                  {projects.map(p => (
                    <button key={p.id} className="daw-project-item" onClick={() => loadProject(p.id)}>
                      <span className="daw-project-name">{p.name}</span>
                      <span className="daw-project-meta">{p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="daw-btn" onClick={() => setShowProjectList(false)}>Close</button>
            </div>
          </div>
        )}

        {/* INSERT PICKER */}
        {insertPickerState && (
          <div className="daw-insert-picker" style={{ left: insertPickerState.x, top: insertPickerState.y }} onClick={e => e.stopPropagation()}>
            <div className="daw-insert-picker-title">Add Insert</div>
            {[
              { cat: "Vocal Tools",  cls: "vocal",  items: [{ key: "__vocal_processor", name: "Vocal Processor" },{ key: "__mic_simulator", name: "Mic Simulator" }] },
              { cat: "Dynamics",     cls: "normal", items: [{ key: "eq", name: "EQ" },{ key: "compressor", name: "Compressor" },{ key: "gate", name: "Gate" },{ key: "deesser", name: "De-Esser" },{ key: "limiter", name: "Limiter" }] },
              { cat: "Time/Space",   cls: "normal", items: [{ key: "reverb", name: "Reverb" },{ key: "delay", name: "Delay" },{ key: "chorus", name: "Chorus" },{ key: "flanger", name: "Flanger" },{ key: "phaser", name: "Phaser" }] },
              { cat: "Modulation",   cls: "normal", items: [{ key: "tremolo", name: "Tremolo" },{ key: "stereoWidener", name: "Stereo Widener" }] },
              { cat: "Saturation",   cls: "normal", items: [{ key: "distortion", name: "Distortion" },{ key: "bitcrusher", name: "Bit Crusher" },{ key: "tapeSaturation", name: "Tape Saturation" },{ key: "exciter", name: "Exciter" }] },
              { cat: "Utility",      cls: "normal", items: [{ key: "filter", name: "Filter" },{ key: "gainUtility", name: "Gain Utility" }] },
            ].map(group => (
              <div key={group.cat}>
                <div className={"daw-insert-picker-cat " + group.cls}>{group.cat}</div>
                {group.items.map(fxItem => {
                  const isVocalTool = fxItem.key.startsWith("__");
                  const already = !isVocalTool && tracks[insertPickerState.trackIndex]?.effects?.[fxItem.key]?.enabled;
                  return (
                    <div key={fxItem.key}
                      className={"daw-insert-picker-item" + (already ? " done" : isVocalTool ? " vocal" : "")}
                      onClick={() => {
                        if (fxItem.key === "__vocal_processor") { setInsertPickerState(null); setShowVocalModal(true); return; }
                        if (fxItem.key === "__mic_simulator")   { setInsertPickerState(null); setShowMicSimModal(true); return; }
                        if (already) return;
                        updateEffect(insertPickerState.trackIndex, fxItem.key, "enabled", true);
                        setActiveEffectsTrack(insertPickerState.trackIndex);
                        setOpenFxKey(fxItem.key);
                        setInsertPickerState(null);
                        setStatus(`${fxItem.name} added — Track ${insertPickerState.trackIndex + 1}`);
                      }}>
                      {isVocalTool ? `⤴ ${fxItem.name}` : already ? `✓ ${fxItem.name}` : fxItem.name}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="rs-divider"/>
            <div className="rs-remove-item" onClick={() => setInsertPickerState(null)}>Cancel</div>
          </div>
        )}

        {/* FX POPUP */}
        {afx && openFxKey && (
          <div className="daw-fx-panel-popup">
            <ConsoleFXPanel track={afx} trackIndex={activeEffectsTrack} updateEffect={updateEffect}
              onClose={() => { setActiveEffectsTrack(null); setOpenFxKey(null); }} openFxKey={openFxKey}/>
          </div>
        )}

        {/* SAVE AS */}
        <SaveAsModal show={showSaveAsModal} defaultName={projectName}
          onSave={(fileName) => { if (saveAsData) { const blob = new Blob([saveAsData], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setStatus("Saved: " + fileName); } setShowSaveAsModal(false); setSaveAsData(null); }}
          onCancel={() => { setShowSaveAsModal(false); setSaveAsData(null); }}/>

        <CollabChatPanel collab={collab}/>
      </div>
    </div>
  );
};

export default RecordingStudio;

const MotionButton = ({ url }) => {
  const { actions } = useContext(Context);
  const navigate = useNavigate();
  const handleSend = () => sendToMotion(actions, navigate, { type: "audio", url, name: "Recording" });
  return <button onClick={handleSend} className="rs-send-btn">Send to Motion Studio 🎬</button>;
};
