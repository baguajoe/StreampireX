// =============================================================================
// ArrangerView.js — Part 2/4
// TrackHeader · CycleRuler · GridOverlay
// =============================================================================

// =============================================================================
// TRACK HEADER
// =============================================================================
const TrackHeader = React.memo(({
  track, index, isSelected, onSelect, onUpdate, onRemove,
  onToggleMute, onToggleSolo, onToggleArm, onToggleFx,
  onImport, onClear, onFreeze, onUnfreeze, onFlexPitch, onBrowseSounds,
  hasSolo, onOpenPianoRoll, instrumentEngine,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal]   = useState(track.name || `Track ${index + 1}`);
  const nameRef = useRef(null);

  useEffect(() => { setNameVal(track.name || `Track ${index + 1}`); }, [track.name, index]);

  const commitRename = () => {
    if (nameVal.trim()) onUpdate(index, { name: nameVal.trim() });
    setRenaming(false);
  };

  const isAudible = !track.muted && (!hasSolo || track.solo);
  const isInstrument = track.trackType === "instrument" || track.trackType === "midi";

  return (
    <div
      className={"arr-track-header" + (isSelected ? " selected" : "") + (track.armed ? " armed" : "")}
      onClick={() => onSelect(index)}
    >
      {/* Color bar */}
      <div className="arr-th-colorbar" style={{ background: track.color || TRACK_COLORS[index % TRACK_COLORS.length] }}/>

      {/* Track number + type icon */}
      <div className="arr-th-index">
        <span className="arr-th-num">{index + 1}</span>
        <span className="arr-th-icon">{isInstrument ? "🎹" : "🎤"}</span>
      </div>

      {/* Name */}
      <div className="arr-th-name-wrap">
        {renaming ? (
          <input
            ref={nameRef}
            className="arr-th-name-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="arr-th-name"
            style={{ color: track.color || TRACK_COLORS[index % TRACK_COLORS.length] }}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
            title="Double-click to rename"
          >
            {track.name || `Track ${index + 1}`}
            {track.frozen ? " ❄" : ""}
          </span>
        )}
      </div>

      {/* MSR badges */}
      <div className="arr-th-badges">
        <button
          className={"arr-th-badge mute" + (track.muted ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleMute(index); }}
          title="Mute"
        >M</button>
        <button
          className={"arr-th-badge solo" + (track.solo ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleSolo(index); }}
          title="Solo"
        >S</button>
        <button
          className={"arr-th-badge rec" + (track.armed ? " on" : "")}
          onClick={e => { e.stopPropagation(); onToggleArm(index); }}
          title="Record arm"
        >●</button>
      </div>

      {/* Volume mini-fader */}
      <div className="arr-th-fader-wrap" onClick={e => e.stopPropagation()}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume ?? 0.8}
          className="arr-th-fader"
          onChange={e => onUpdate(index, { volume: parseFloat(e.target.value) })}
          title={`Volume: ${Math.round((track.volume ?? 0.8) * 100)}%`}
        />
      </div>

      {/* Action buttons */}
      <div className="arr-th-actions" onClick={e => e.stopPropagation()}>
        {isInstrument ? (
          <>
            <button className="arr-th-action-btn" onClick={() => onBrowseSounds && onBrowseSounds(index)} title="Browse sounds">🎵</button>
            <button className="arr-th-action-btn" onClick={() => onToggleFx && onToggleFx(index)} title="FX">FX</button>
          </>
        ) : (
          <>
            {track.audioBuffer || track.audio_url
              ? <button className="arr-th-action-btn clear" onClick={() => onClear(index)} title="Clear track">✕</button>
              : <button className="arr-th-action-btn import" onClick={() => onImport && onImport(index)} title="Import audio">⤵</button>
            }
            <button className="arr-th-action-btn" onClick={() => onToggleFx && onToggleFx(index)} title="FX">FX</button>
            {track.audioBuffer && !track.frozen && (
              <button className="arr-th-action-btn freeze" onClick={() => onFreeze && onFreeze(index)} title="Freeze track">❄</button>
            )}
            {track.frozen && (
              <button className="arr-th-action-btn unfreeze" onClick={() => onUnfreeze && onUnfreeze(index)} title="Unfreeze">🔥</button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// CYCLE RULER (Logic-style yellow loop region on ruler)
// =============================================================================
const CycleRuler = React.memo(({
  totalBeats, zoom, timeSignatureTop, bpm,
  cycleEnabled, cycleStart, cycleEnd,
  onCycleChange, onCycleToggle,
  scrollLeft,
}) => {
  const canvasRef  = useRef(null);
  const dragging   = useRef(null); // "loop-left" | "loop-right" | "loop-move" | "seek"
  const dragStartX = useRef(0);
  const dragStartVals = useRef({});

  const visibleBeats = totalBeats + 8;

  // Draw ruler
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    // Background
    c.fillStyle = "#0d1219"; c.fillRect(0, 0, W, H);

    // Cycle region
    if (cycleEnabled) {
      const x1 = beatToPx(cycleStart, zoom) - scrollLeft;
      const x2 = beatToPx(cycleEnd,   zoom) - scrollLeft;
      c.fillStyle = "rgba(255,204,0,.22)"; c.fillRect(x1, 0, x2 - x1, H);
      c.fillStyle = "#ffd700"; c.fillRect(x1, 0, 2, H); c.fillRect(x2 - 1, 0, 2, H);
      // Loop handles
      c.beginPath(); c.moveTo(x1, 0); c.lineTo(x1 + 8, 0); c.lineTo(x1, 10); c.closePath(); c.fillStyle = "#ffd700"; c.fill();
      c.beginPath(); c.moveTo(x2, 0); c.lineTo(x2 - 8, 0); c.lineTo(x2, 10); c.closePath(); c.fillStyle = "#ffd700"; c.fill();
    }

    // Bar lines + labels
    const beatsPerBar = timeSignatureTop || 4;
    c.font = '10px "JetBrains Mono","Consolas",monospace';

    for (let beat = 0; beat <= visibleBeats; beat++) {
      const x = beatToPx(beat, zoom) - scrollLeft;
      if (x < -20 || x > W + 20) continue;
      const isBar = beat % beatsPerBar === 0;

      if (isBar) {
        c.strokeStyle = "#2a3848"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, H * 0.3); c.lineTo(x, H); c.stroke();
        const bar = Math.floor(beat / beatsPerBar) + 1;
        c.fillStyle = "#6d8a9a"; c.fillText(String(bar), x + 3, H - 4);
      } else {
        c.strokeStyle = "#1a2530"; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, H * 0.65); c.lineTo(x, H); c.stroke();
      }
    }

    // Top border
    c.strokeStyle = "#1e2d3d"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, H - 0.5); c.lineTo(W, H - 0.5); c.stroke();
  }, [totalBeats, zoom, timeSignatureTop, cycleEnabled, cycleStart, cycleEnd, scrollLeft, visibleBeats]);

  const handleMouseDown = (e) => {
    const canvas  = canvasRef.current; if (!canvas) return;
    const rect    = canvas.getBoundingClientRect();
    const x       = e.clientX - rect.left;
    const beat    = pxToBeat(x + scrollLeft, zoom);

    if (cycleEnabled) {
      const x1 = beatToPx(cycleStart, zoom) - scrollLeft;
      const x2 = beatToPx(cycleEnd,   zoom) - scrollLeft;
      if (Math.abs(x - x1) < 10)      { dragging.current = "loop-left";  dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else if (Math.abs(x - x2) < 10) { dragging.current = "loop-right"; dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else if (x > x1 && x < x2)      { dragging.current = "loop-move";  dragStartX.current = e.clientX; dragStartVals.current = { cycleStart, cycleEnd }; }
      else                             { dragging.current = "seek"; }
    } else {
      dragging.current = "seek";
    }

    if (dragging.current === "seek") {
      onCycleChange && onCycleChange(Math.max(0, beat), cycleEnd);
    }

    const handleMove = (e2) => {
      const dx    = e2.clientX - dragStartX.current;
      const dBeat = pxToBeat(dx, zoom);
      const { cycleStart: cs, cycleEnd: ce } = dragStartVals.current;
      if      (dragging.current === "loop-left")  onCycleChange && onCycleChange(Math.max(0, cs + dBeat), ce);
      else if (dragging.current === "loop-right") onCycleChange && onCycleChange(cs, Math.max(cs + 1, ce + dBeat));
      else if (dragging.current === "loop-move")  onCycleChange && onCycleChange(Math.max(0, cs + dBeat), Math.max(1, ce + dBeat));
    };
    const handleUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleUp);
  };

  const handleDoubleClick = (e) => {
    onCycleToggle && onCycleToggle();
  };

  return (
    <canvas
      ref={canvasRef}
      className="arr-cycle-ruler"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={cycleEnabled ? "Cycle ON — drag handles to adjust, dbl-click to toggle" : "Dbl-click to enable cycle"}
    />
  );
});

// =============================================================================
// GRID OVERLAY
// =============================================================================
const GridOverlay = React.memo(({ totalBeats, zoom, timeSignatureTop, trackCount, trackHeight, scrollLeft }) => {
  const canvasRef    = useRef(null);
  const visibleBeats = totalBeats + 8;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr    = window.devicePixelRatio || 1;
    const W      = canvas.offsetWidth;
    const H      = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const c = canvas.getContext("2d"); c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    const beatsPerBar = timeSignatureTop || 4;

    for (let beat = 0; beat <= visibleBeats; beat++) {
      const x       = beatToPx(beat, zoom) - scrollLeft;
      if (x < 0 || x > W) continue;
      const isBar   = beat % beatsPerBar === 0;
      c.strokeStyle = isBar ? "#1e2d3d" : "#131b26";
      c.lineWidth   = isBar ? 1 : 0.5;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }

    // Track lane dividers
    for (let t = 0; t <= trackCount; t++) {
      const y = t * trackHeight;
      c.strokeStyle = t === 0 ? "#1e2d3d" : "#111820";
      c.lineWidth   = 1;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
  }, [totalBeats, zoom, timeSignatureTop, trackCount, trackHeight, scrollLeft, visibleBeats]);

  return <canvas ref={canvasRef} className="arr-grid-overlay" />;
});
