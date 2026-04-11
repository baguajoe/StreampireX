// =============================================================================
// ArrangerView.js — Part 4/4
// Full JSX render + export default
// =============================================================================

// NOTE: This is the closing of the ArrangerView component started in Part 3.
// The JSX return block below replaces the dangling closing brace at end of Part 3.
// The install script concatenates all 4 parts; the component declaration
// opened in Part 3 is closed here with the export at the bottom.

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      switch (e.code) {
        case "Space":      e.preventDefault(); isPlaying ? onStop?.() : onPlay?.(); break;
        case "KeyR":       if (!e.metaKey) onRecord?.(); break;
        case "Equal":      setZoom(z => Math.min(MAX_ZOOM, z + 10)); break;
        case "Minus":      setZoom(z => Math.max(MIN_ZOOM, z - 10)); break;
        case "Delete":
        case "Backspace":
          if (selectedRegion) {
            const ti = tracks.findIndex(t => (t.regions || []).some(r => r.id === selectedRegion));
            if (ti !== -1) deleteRegion(ti, selectedRegion);
          }
          break;
        default: break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPlaying, onPlay, onStop, onRecord, selectedRegion, tracks, deleteRegion]);

  // ── Dismiss context menu on outside click ──
  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [contextMenu]);

  // ── Timeline total width ──
  const timelineWidth = beatToPx(totalBeats + 8, zoom);

  return (
    <div className="arr-root" onWheel={handleWheel}>

      {/* ══════ TOOLBAR ══════ */}
      <div className="arr-toolbar">
        <div className="arr-toolbar-left">
          {/* Transport */}
          <button className="arr-transport-btn" onClick={onStop} title="Stop">■</button>
          <button className={"arr-transport-btn play" + (isPlaying && !isRecording ? " active" : "")}
            onClick={() => isPlaying ? onStop?.() : onPlay?.()} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying && !isRecording ? "⏸" : "▶"}
          </button>
          <button className={"arr-transport-btn rec" + (isRecording ? " active" : "")}
            onClick={onRecord} title={isRecording ? "Stop recording" : "Record"}>
            <span className="arr-rec-dot"/>
          </button>

          <div className="arr-toolbar-divider"/>

          {/* BPM */}
          <div className="arr-bpm-wrap">
            <span className="arr-label">BPM</span>
            <input
              type="number" min={20} max={300}
              value={bpm}
              className="arr-bpm-input"
              onChange={e => onBpmChange?.(Math.max(20, Math.min(300, parseInt(e.target.value) || 120)))}
            />
          </div>

          {/* Time sig */}
          <div className="arr-timesig-wrap">
            <span className="arr-label">TIME</span>
            <input type="number" min={1} max={16} value={timeSignatureTop}
              className="arr-timesig-input"
              onChange={e => onTimeSignatureChange?.(parseInt(e.target.value) || 4, timeSignatureBottom)}/>
            <span className="arr-timesig-slash">/</span>
            <input type="number" min={1} max={16} value={timeSignatureBottom}
              className="arr-timesig-input"
              onChange={e => onTimeSignatureChange?.(timeSignatureTop, parseInt(e.target.value) || 4)}/>
          </div>

          <div className="arr-toolbar-divider"/>

          {/* Snap */}
          <div className="arr-snap-wrap">
            <span className="arr-label">SNAP</span>
            <select value={snapIndex} onChange={e => setSnapIndex(Number(e.target.value))} className="arr-snap-select">
              {SNAP_VALUES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
            </select>
          </div>

          {/* Zoom */}
          <div className="arr-zoom-wrap">
            <button className="arr-zoom-btn" onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 10))} title="Zoom out">−</button>
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={5} value={zoom}
              className="arr-zoom-slider" onChange={e => setZoom(Number(e.target.value))}/>
            <button className="arr-zoom-btn" onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 10))} title="Zoom in">+</button>
          </div>

          {/* Cycle */}
          <button className={"arr-cycle-btn" + (cycleEnabled ? " active" : "")} onClick={onCycleToggle} title="Toggle cycle">
            ⟳ CYCLE
          </button>
        </div>

        <div className="arr-toolbar-right">
          {/* Master vol */}
          <div className="arr-master-wrap">
            <span className="arr-label">MASTER</span>
            <input type="range" min={0} max={1} step={0.01} value={masterVolume}
              className="arr-master-fader"
              onChange={e => onMasterVolumeChange?.(parseFloat(e.target.value))}/>
            <span className="arr-master-val">{Math.round(masterVolume * 100)}%</span>
          </div>

          <TierBadge userTier={userTier} trackCount={tracks.length} maxTracks={maxTracks}/>

          <button className="arr-toolbar-btn" onClick={onBounce} title="Bounce to WAV">⤓ Bounce</button>
          <button className={"arr-toolbar-btn save" + (saving ? " saving" : "")} onClick={onSave} disabled={saving} title="Save project">
            {saving ? "Saving…" : "💾 Save"}
          </button>

          {/* Track height */}
          <div className="arr-trackh-wrap">
            <span className="arr-label">🔍</span>
            <input type="range" min={48} max={120} step={8} value={trackHeight}
              className="arr-zoom-slider"
              onChange={e => setTrackHeight(Number(e.target.value))}/>
          </div>
        </div>
      </div>

      {/* ══════ BODY (headers + timeline) ══════ */}
      <div className="arr-body">

        {/* ── TRACK HEADERS COLUMN ── */}
        <div className="arr-headers-col" style={{ transform: `translateY(-${scrollTop}px)` }}>
          {tracks.map((track, index) => (
            <div key={track.id || index}
              style={{ height: trackHeight }}
              onContextMenu={(e) => handleTrackContextMenu(e, index)}
            >
              <TrackHeader
                track={track}
                index={index}
                isSelected={selectedTrack === index}
                onSelect={setSelectedTrack}
                onUpdate={updateTrack}
                onRemove={removeTrack}
                onToggleMute={toggleMute}
                onToggleSolo={toggleSolo}
                onToggleArm={toggleArm}
                onToggleFx={onToggleFx}
                onImport={null}
                onClear={(i) => updateTrack(i, { audioBuffer: null, audio_url: null, regions: [] })}
                onFreeze={null}
                onUnfreeze={null}
                onFlexPitch={null}
                onBrowseSounds={onBrowseSounds}
                hasSolo={hasSolo}
                onOpenPianoRoll={onOpenPianoRoll}
                instrumentEngine={instrumentEngine}
              />
            </div>
          ))}

          {/* Add track button */}
          <div className="arr-add-track-row">
            <AddTrackDropdown
              onAdd={addTrack}
              disabled={maxTracks > 0 && tracks.length >= maxTracks}
            />
          </div>
        </div>

        {/* ── TIMELINE COLUMN ── */}
        <div className="arr-timeline-col">

          {/* Ruler */}
          <div className="arr-ruler-wrap">
            <CycleRuler
              totalBeats={totalBeats}
              zoom={zoom}
              timeSignatureTop={timeSignatureTop}
              bpm={bpm}
              cycleEnabled={cycleEnabled}
              cycleStart={cycleStart}
              cycleEnd={cycleEnd}
              onCycleChange={onCycleChange}
              onCycleToggle={onCycleToggle}
              scrollLeft={scrollLeft}
            />
          </div>

          {/* Scrollable track lanes */}
          <div
            ref={scrollRef}
            className="arr-lanes-scroll"
            onScroll={handleScroll}
          >
            <div className="arr-lanes-inner" style={{ width: timelineWidth, height: tracks.length * trackHeight }}>

              {/* Grid */}
              <GridOverlay
                totalBeats={totalBeats}
                zoom={zoom}
                timeSignatureTop={timeSignatureTop}
                trackCount={tracks.length}
                trackHeight={trackHeight}
                scrollLeft={scrollLeft}
              />

              {/* Click target for seek */}
              <div ref={timelineRef} className="arr-seek-layer" onClick={handleTimelineClick}/>

              {/* Track lanes */}
              {tracks.map((track, trackIndex) => (
                <div
                  key={track.id || trackIndex}
                  className={"arr-lane" + (selectedTrack === trackIndex ? " selected" : "")}
                  style={{ top: trackIndex * trackHeight, height: trackHeight }}
                  onClick={() => setSelectedTrack(trackIndex)}
                  onDoubleClick={(e) => handleTimelineDoubleClick(e, trackIndex)}
                >
                  {(track.regions || []).map(region => (
                    <Region
                      key={region.id}
                      region={region}
                      trackColor={track.color || TRACK_COLORS[trackIndex % TRACK_COLORS.length]}
                      trackType={track.trackType}
                      zoom={zoom}
                      snapValue={snapValue}
                      timeSignatureTop={timeSignatureTop}
                      onMove={(regionId, newStart) => moveRegion(trackIndex, regionId, newStart)}
                      onResize={(regionId, newStart, newDur) => resizeRegion(trackIndex, regionId, newStart, newDur)}
                      onSelect={setSelectedRegion}
                      isSelected={selectedRegion === region.id}
                      onContextMenu={(e, r) => handleRegionContextMenu(e, r, trackIndex)}
                      trackHeight={trackHeight}
                    />
                  ))}
                </div>
              ))}

              {/* Playhead */}
              <Playhead
                beat={playheadBeat}
                zoom={zoom}
                height={tracks.length * trackHeight}
                scrollLeft={scrollLeft}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════ AUTOMATION ══════ */}
      {showAutoTrack !== null && tracks[showAutoTrack] && (
        <div className="arr-automation-panel">
          <div className="arr-automation-header">
            <span className="arr-automation-title">
              AUTOMATION — {tracks[showAutoTrack].name}
            </span>
            <select value={autoParam} onChange={e => setAutoParam(e.target.value)} className="arr-automation-param-select">
              {AUTO_PARAMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <button className="arr-automation-close" onClick={() => setShowAutoTrack(null)}>✕</button>
          </div>
          <AutomationLane
            trackId={tracks[showAutoTrack].id || showAutoTrack}
            paramKey={autoParam}
            automation={automation}
            setAutomation={setAutomation}
            zoom={zoom}
            scrollLeft={scrollLeft}
            totalBeats={totalBeats}
            bpm={bpm}
            currentBeat={playheadBeat}
            isPlaying={isPlaying}
          />
        </div>
      )}

      {/* ══════ CONTEXT MENU ══════ */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default ArrangerView;
