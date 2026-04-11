// =============================================================================
// ArrangerView.js — Part 3/4
// ContextMenu · TierBadge · AddTrackDropdown · ArrangerView state + callbacks
// =============================================================================

// =============================================================================
// CONTEXT MENU
// =============================================================================
const ContextMenu = React.memo(({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={menuRef} className="arr-ctx-menu" style={{ left: x, top: y }}>
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} className="arr-ctx-divider" />
        ) : (
          <button
            key={i}
            className={"arr-ctx-item" + (item.danger ? " danger" : "")}
            onClick={() => { item.action(); onClose(); }}
            disabled={item.disabled}
          >
            {item.icon && <span className="arr-ctx-icon">{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
});

// =============================================================================
// TIER BADGE
// =============================================================================
const TierBadge = React.memo(({ userTier, trackCount, maxTracks }) => {
  const tier = STUDIO_TIER_LIMITS[userTier] || STUDIO_TIER_LIMITS.free;
  const atLimit = maxTracks > 0 && trackCount >= maxTracks;
  return (
    <div className={"arr-tier-badge" + (atLimit ? " at-limit" : "")} style={{ borderColor: tier.color, color: tier.color }}>
      {tier.label}: {trackCount}/{maxTracks < 0 ? "∞" : maxTracks}
    </div>
  );
});

// =============================================================================
// ADD TRACK DROPDOWN
// =============================================================================
const AddTrackDropdown = React.memo(({ onAdd, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="arr-add-track-dropdown">
      <button
        className="arr-add-track-btn"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        title="Add track"
      >
        + Track ▾
      </button>
      {open && (
        <div className="arr-add-track-menu">
          {TRACK_TYPES.map(tt => (
            <button
              key={tt.value}
              className="arr-add-track-item"
              onClick={() => { onAdd(tt.value); setOpen(false); }}
            >
              <span className="arr-add-track-icon">{tt.icon}</span>
              <span>{tt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PLAYHEAD
// =============================================================================
const Playhead = React.memo(({ beat, zoom, height, scrollLeft }) => {
  const x = beatToPx(beat, zoom) - scrollLeft;
  if (x < 0) return null;
  return (
    <div className="arr-playhead" style={{ left: `${x}px`, height: `${height}px` }}>
      <div className="arr-playhead-head" />
    </div>
  );
});

// =============================================================================
// ARRANGER VIEW — STATE + CALLBACKS
// =============================================================================
const ArrangerView = ({
  tracks = [], setTracks,
  bpm = 120, timeSignatureTop = 4, timeSignatureBottom = 4,
  masterVolume = 0.8, onMasterVolumeChange,
  projectName = "Untitled", userTier = "free",
  playheadBeat = 0, isPlaying = false, isRecording = false,
  onPlay, onStop, onRecord, onSeek, onBpmChange, onTimeSignatureChange,
  onToggleFx, onBounce, onSave, saving = false,
  cycleEnabled = false, cycleStart = 0, cycleEnd = 8,
  onCycleChange, onCycleToggle,
  instrumentEngine,
  onBrowseSounds, onOpenPianoRoll, onTimelineDoubleClick,
  MidiRegionPreview,
}) => {
  // ── State ──
  const [zoom,          setZoom]          = useState(DEFAULT_ZOOM);
  const [snapIndex,     setSnapIndex]     = useState(2);     // 1/2 bar default
  const [scrollLeft,    setScrollLeft]    = useState(0);
  const [scrollTop,     setScrollTop]     = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedRegion,setSelectedRegion]= useState(null);
  const [contextMenu,   setContextMenu]   = useState(null);
  const [showAutoTrack, setShowAutoTrack] = useState(null);  // track index
  const [autoParam,     setAutoParam]     = useState("volume");
  const [automation,    setAutomation]    = useState({});
  const [trackHeight,   setTrackHeight]   = useState(72);

  const timelineRef  = useRef(null);
  const scrollRef    = useRef(null);

  const snapValue  = SNAP_VALUES[snapIndex]?.value ?? 0.5;
  const maxTracks  = STUDIO_TIER_LIMITS[userTier]?.maxTracks ?? 4;
  const hasSolo    = tracks.some(t => t.solo);

  // Total visible beats
  const totalBeats = useMemo(() => {
    let maxBeat = 16;
    tracks.forEach(t => {
      (t.regions || []).forEach(r => {
        const end = (r.startBeat || 0) + (r.duration || 0);
        if (end > maxBeat) maxBeat = end;
      });
    });
    return Math.ceil(maxBeat + 16);
  }, [tracks]);

  // ── Scroll sync ──
  const handleScroll = useCallback((e) => {
    setScrollLeft(e.target.scrollLeft);
    setScrollTop(e.target.scrollTop);
  }, []);

  // ── Zoom ──
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.4)));
    }
  }, []);

  // ── Track mutations ──
  const updateTrack = useCallback((index, updates) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  }, [setTracks]);

  const addTrack = useCallback((type = "audio") => {
    if (maxTracks > 0 && tracks.length >= maxTracks) return;
    const i = tracks.length;
    setTracks(prev => [...prev, {
      id: `trk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: `${type === "instrument" ? "MIDI" : "Audio"} ${i + 1}`,
      trackType: type,
      volume: 0.8, pan: 0,
      muted: false, solo: false, armed: false,
      color: TRACK_COLORS[i % TRACK_COLORS.length],
      regions: [],
    }]);
    setSelectedTrack(i);
  }, [tracks.length, maxTracks, setTracks]);

  const removeTrack = useCallback((index) => {
    if (tracks.length <= 1) return;
    setTracks(prev => prev.filter((_, i) => i !== index));
    setSelectedTrack(prev => Math.max(0, Math.min(prev, tracks.length - 2)));
  }, [tracks.length, setTracks]);

  const toggleMute = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, muted: !t.muted } : t));
  }, [setTracks]);

  const toggleSolo = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => i === index ? { ...t, solo: !t.solo } : t));
  }, [setTracks]);

  const toggleArm = useCallback((index) => {
    setTracks(prev => prev.map((t, i) => ({
      ...t,
      armed: i === index ? !t.armed : false,
    })));
  }, [setTracks]);

  // ── Region mutations ──
  const moveRegion = useCallback((trackIndex, regionId, newStart) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStart } : r) };
    }));
  }, [setTracks]);

  const resizeRegion = useCallback((trackIndex, regionId, newStart, newDuration) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).map(r => r.id === regionId ? { ...r, startBeat: newStart, duration: newDuration } : r) };
    }));
  }, [setTracks]);

  const deleteRegion = useCallback((trackIndex, regionId) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      return { ...t, regions: (t.regions || []).filter(r => r.id !== regionId) };
    }));
    setSelectedRegion(null);
  }, [setTracks]);

  const duplicateRegion = useCallback((trackIndex, regionId) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const newRegion = {
        ...region,
        id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        startBeat: region.startBeat + region.duration,
        name: (region.name || "Region") + " copy",
      };
      return { ...t, regions: [...t.regions, newRegion] };
    }));
  }, [setTracks]);

  const splitRegion = useCallback((trackIndex, regionId, splitBeat) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== trackIndex) return t;
      const region = (t.regions || []).find(r => r.id === regionId);
      if (!region) return t;
      const relSplit = splitBeat - region.startBeat;
      if (relSplit <= 0 || relSplit >= region.duration) return t;
      const left  = { ...region, duration: relSplit };
      const right = {
        ...region,
        id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        startBeat: splitBeat,
        duration: region.duration - relSplit,
        name: (region.name || "Region") + " 2",
      };
      return { ...t, regions: [...t.regions.filter(r => r.id !== regionId), left, right] };
    }));
  }, [setTracks]);

  // ── Timeline click → seek ──
  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current) return;
    const rect  = timelineRef.current.getBoundingClientRect();
    const x     = e.clientX - rect.left + scrollLeft;
    const beat  = Math.max(0, pxToBeat(x, zoom));
    onSeek && onSeek(beat);
  }, [zoom, scrollLeft, onSeek]);

  // ── Timeline double-click → add region ──
  const handleTimelineDoubleClick = useCallback((e, trackIndex) => {
    if (onTimelineDoubleClick) onTimelineDoubleClick(e, trackIndex);
  }, [onTimelineDoubleClick]);

  // ── Region context menu ──
  const handleRegionContextMenu = useCallback((e, region, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    const clickBeat = pxToBeat(e.clientX - timelineRef.current?.getBoundingClientRect().left + scrollLeft, zoom);
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Duplicate",   icon: "⧉", action: () => duplicateRegion(trackIndex, region.id) },
        { label: "Split here",  icon: "✂", action: () => splitRegion(trackIndex, region.id, clickBeat) },
        ...(tracks[trackIndex]?.trackType === "instrument" && region.notes
          ? [{ label: "Edit in Piano Roll", icon: "🎹", action: () => onOpenPianoRoll && onOpenPianoRoll(trackIndex, region.id) }]
          : []
        ),
        "---",
        { label: "Delete",      icon: "🗑", danger: true, action: () => deleteRegion(trackIndex, region.id) },
      ],
    });
  }, [zoom, scrollLeft, tracks, duplicateRegion, splitRegion, deleteRegion, onOpenPianoRoll]);

  // ── Track context menu ──
  const handleTrackContextMenu = useCallback((e, trackIndex) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Rename",    icon: "✏", action: () => { const n = window.prompt("Rename:", tracks[trackIndex]?.name); if (n?.trim()) updateTrack(trackIndex, { name: n.trim() }); } },
        { label: "Duplicate track", icon: "⧉", action: () => { const t = tracks[trackIndex]; setTracks(prev => [...prev, { ...t, id: `trk_${Date.now()}`, name: t.name + " copy", regions: [] }]); } },
        "---",
        { label: "Remove track", icon: "🗑", danger: true, action: () => removeTrack(trackIndex), disabled: tracks.length <= 1 },
      ],
    });
  }, [tracks, updateTrack, removeTrack, setTracks]);
};
