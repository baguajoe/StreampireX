import React, { useRef, useEffect } from 'react';
import {
  Film, Play, Pause, Square, Rewind, FastForward, SkipBack, SkipForward,
  Save, Download, Folder, Monitor, Palette, Volume2, Activity,
  Scissors, RotateCcw, RotateCw, Crown, Star, Info
} from 'lucide-react';

const MENUS = (p) => ({
  file: {
    label: 'File',
    items: [
      { label: 'New Project',    shortcut: 'Ctrl+N', action: p.onNew },
      { label: 'Open Project',   shortcut: 'Ctrl+O', action: p.onOpen },
      { type: 'sep' },
      { label: 'Save',           shortcut: 'Ctrl+S', action: p.onSave },
      { label: 'Save As…',       shortcut: 'Ctrl+Shift+S', action: p.onSaveAs },
      { type: 'sep' },
      { label: 'Import Media',   shortcut: 'Ctrl+I', action: p.onImport },
      { label: 'Export Video',   shortcut: 'Ctrl+E', action: p.onExport },
      { type: 'sep' },
      { label: 'Close',                              action: () => window.history.back() },
    ]
  },
  edit: {
    label: 'Edit',
    items: [
      { label: 'Undo',           shortcut: 'Ctrl+Z',         action: p.onUndo,      disabled: !p.canUndo },
      { label: 'Redo',           shortcut: 'Ctrl+Shift+Z',   action: p.onRedo,      disabled: !p.canRedo },
      { type: 'sep' },
      { label: 'Cut',            shortcut: 'Ctrl+X',         action: p.onCut,       disabled: !p.hasSelection },
      { label: 'Copy',           shortcut: 'Ctrl+C',         action: p.onCopy,      disabled: !p.hasSelection },
      { label: 'Paste',          shortcut: 'Ctrl+V',         action: p.onPaste },
      { label: 'Delete',         shortcut: 'Del',            action: p.onDelete,    disabled: !p.hasSelection },
      { type: 'sep' },
      { label: 'Select All',     shortcut: 'Ctrl+A',         action: p.onSelectAll },
    ]
  },
  clip: {
    label: 'Clip',
    items: [
      { label: 'Split at Playhead', shortcut: 'Ctrl+K', action: p.onSplit },
      { label: 'Trim In Point',     shortcut: 'Q',       action: p.onTrimIn,  disabled: !p.hasSelection },
      { label: 'Trim Out Point',    shortcut: 'W',       action: p.onTrimOut, disabled: !p.hasSelection },
      { type: 'sep' },
      { label: 'Speed/Duration…',                        action: p.onSpeed,   disabled: !p.hasSelection },
      { label: 'Reverse Clip',                           action: p.onReverse, disabled: !p.hasSelection },
      { type: 'sep' },
      { label: 'Delete Clip',   shortcut: 'Del',         action: p.onDelete,  disabled: !p.hasSelection },
    ]
  },
  sequence: {
    label: 'Sequence',
    items: [
      { label: 'Add Video Track',                 action: () => p.onAddTrack('video') },
      { label: 'Add Audio Track',                 action: () => p.onAddTrack('audio') },
      { type: 'sep' },
      { label: 'Apply Default Transition', shortcut: 'Ctrl+D', action: p.onApplyTransition },
      { type: 'sep' },
      { label: 'Go to Start',  shortcut: 'Home',  action: () => p.onSeek(0) },
      { label: 'Go to End',    shortcut: 'End',   action: () => p.onSeek(p.duration) },
    ]
  },
  markers: {
    label: 'Markers',
    items: [
      { label: 'Add Marker',          shortcut: 'M',           action: p.onAddMarker },
      { label: 'Next Marker',         shortcut: 'Shift+M',     action: p.onNextMarker },
      { label: 'Previous Marker',     shortcut: 'Ctrl+Shift+M',action: p.onPrevMarker },
      { type: 'sep' },
      { label: 'Clear All Markers',                            action: p.onClearMarkers },
    ]
  },
  view: {
    label: 'View',
    items: [
      { label: 'Zoom In',             shortcut: '+', action: () => p.onZoom(Math.min(5, p.zoom + 0.25)) },
      { label: 'Zoom Out',            shortcut: '-', action: () => p.onZoom(Math.max(0.1, p.zoom - 0.25)) },
      { label: 'Fit to Window',       shortcut: '\\',action: () => p.onZoom(1) },
      { type: 'sep' },
      { label: `${p.showWaveforms?'✓ ':''}Audio Waveforms`,  action: p.onToggleWaveforms },
      { label: `${p.snapOn?'✓ ':''}Snap to Grid`,            action: p.onToggleSnap },
      { type: 'sep' },
      { label: 'Color Grading',       action: p.onToggleColor },
      { label: 'Audio Mixer',         action: p.onToggleMixer },
      { label: 'Video Scopes',        action: p.onToggleScopes },
    ]
  },
  help: {
    label: 'Help',
    items: [
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: p.onShowShortcuts },
      { type: 'sep' },
      { label: 'About StreamPireX Editor', action: () => alert('StreamPireX Video Editor\nVersion 2.0\nBuilt for creators.') },
    ]
  }
});

export default function VideoEditorToolbar({
  projectTitle, isPlaying, currentTime, duration, frameRate, setFrameRate,
  zoom, setZoom, canUndo, canRedo, hasSelection, snapOn, showWaveforms,
  showColor, showMixer, showScopes,
  play, pause, stop, playPause, seek, frameBack, frameFwd,
  undoTracks, redoTracks, saveProject, setShowExport, fileInputRef,
  splitClip, trimClipIn, trimClipOut, deleteClip, selectedClip,
  addTrack, addMarker, nextMarker, prevMarker, setMarkers,
  toggleSnapOn, setShowWaveforms, setShowColor, setShowMixer, setShowScopes,
  activeMenu, setActiveMenu, formatTime, userTier,
}) {
  const menuBarRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setActiveMenu]);

  const menuProps = {
    onNew:              () => { if (window.confirm('Start new project? Unsaved changes will be lost.')) window.location.reload(); },
    onOpen:             () => alert('Open Project — coming soon'),
    onSave:             saveProject,
    onSaveAs:           () => alert('Save As — coming soon'),
    onImport:           () => fileInputRef.current?.click(),
    onExport:           () => setShowExport(true),
    onUndo:             undoTracks,
    onRedo:             redoTracks,
    canUndo, canRedo,
    onCut:              () => { if (selectedClip) deleteClip(selectedClip.id); },
    onCopy:             () => alert('Copy — coming soon'),
    onPaste:            () => alert('Paste — coming soon'),
    onDelete:           () => { if (selectedClip) deleteClip(selectedClip.id); },
    onSelectAll:        () => alert('Select All — coming soon'),
    hasSelection:       !!selectedClip,
    onSplit:            () => { if (selectedClip) splitClip(selectedClip.id); },
    onTrimIn:           () => { if (selectedClip) trimClipIn(selectedClip.id); },
    onTrimOut:          () => { if (selectedClip) trimClipOut(selectedClip.id); },
    onSpeed:            () => alert('Speed/Duration — coming soon'),
    onReverse:          () => alert('Reverse — coming soon'),
    onAddTrack:         addTrack,
    onApplyTransition:  () => alert('Apply default transition between adjacent clips'),
    onSeek:             seek,
    duration,
    onAddMarker:        () => addMarker(),
    onNextMarker:       nextMarker,
    onPrevMarker:       prevMarker,
    onClearMarkers:     () => { if (window.confirm('Clear all markers?')) setMarkers([]); },
    zoom, onZoom: setZoom,
    showWaveforms, onToggleWaveforms: () => setShowWaveforms(v => !v),
    snapOn, onToggleSnap: toggleSnapOn,
    onToggleColor:  () => setShowColor(v => !v),
    onToggleMixer:  () => setShowMixer(v => !v),
    onToggleScopes: () => setShowScopes(v => !v),
    onShowShortcuts: () => alert(`KEYBOARD SHORTCUTS
━━━━━━━━━━━━━━━━━━
Space       Play / Pause
Home / End  Go to start / end
← →         Frame step
Shift+← →  Jump 1 second
Ctrl+Z/Y    Undo / Redo
Ctrl+S      Save
Ctrl+E      Export
Ctrl+K      Split clip at playhead
Ctrl+I      Import media
Q / W       Trim In / Out
M           Add marker
Delete      Delete selected clip
V           Select tool
C           Razor tool
H           Hand tool
Escape      Deselect`),
  };

  const menus = MENUS(menuProps);

  const tierIcon = userTier === 'professional' ? <Crown size={10} /> : userTier === 'premium' ? <Star size={10} /> : <Info size={10} />;

  return (
    <>
      {/* ── Menu bar ─────────────────────────────────────── */}
      <div className="spx-menubar" ref={menuBarRef}>
        <div className="spx-menubar-logo">
          <Film size={13} />
          SPX
        </div>

        {Object.entries(menus).map(([key, menu]) => (
          <div key={key} className="spx-menu-wrap">
            <button
              className={`spx-menu-btn ${activeMenu===key?'open':''}`}
              onClick={() => setActiveMenu(activeMenu===key ? null : key)}
              onMouseEnter={() => activeMenu && setActiveMenu(key)}>
              {menu.label}
            </button>
            {activeMenu === key && (
              <div className="spx-dropdown">
                {menu.items.map((item, i) =>
                  item.type === 'sep'
                    ? <div key={i} className="spx-dropdown-sep" />
                    : (
                      <button key={i} className="spx-dropdown-item"
                        disabled={item.disabled}
                        style={{ opacity: item.disabled ? .45 : 1 }}
                        onClick={() => { if (!item.disabled) { item.action?.(); setActiveMenu(null); } }}>
                        <span>{item.label}</span>
                        {item.shortcut && <span className="spx-shortcut">{item.shortcut}</span>}
                      </button>
                    )
                )}
              </div>
            )}
          </div>
        ))}

        <div className="spx-menubar-spacer" />
        <div className="spx-project-name">{projectTitle} — StreamPireX Editor</div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="spx-toolbar">
        {/* Tier badge */}
        <div className="spx-tier-badge">{tierIcon}{userTier}</div>
        <div className="spx-toolbar-sep" />

        {/* Workspace quick buttons */}
        <button className={`spx-tbtn ${showColor?'active':''}`}  onClick={() => setShowColor(v=>!v)}>
          <Palette size={12} /> Color
        </button>
        <button className={`spx-tbtn ${showMixer?'active':''}`}  onClick={() => setShowMixer(v=>!v)}>
          <Volume2 size={12} /> Mixer
        </button>
        <button className={`spx-tbtn ${showScopes?'active':''}`} onClick={() => setShowScopes(v=>!v)}>
          <Activity size={12} /> Scopes
        </button>
        <div className="spx-toolbar-sep" />

        {/* Transport controls */}
        <button className="spx-tool-btn" title="Stop (Home)" onClick={stop}><Square size={13} /></button>
        <button className="spx-tool-btn" title="Rewind 5s" onClick={() => seek(Math.max(0, currentTime-5))}><Rewind size={13} /></button>
        <button className="spx-tool-btn" title="Frame back (←)" onClick={frameBack}><SkipBack size={13} /></button>
        <button className={`spx-play-btn ${isPlaying?'playing':''}`} title="Play/Pause (Space)" onClick={playPause}>
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="spx-tool-btn" title="Frame forward (→)" onClick={frameFwd}><SkipForward size={13} /></button>
        <button className="spx-tool-btn" title="Forward 5s" onClick={() => seek(Math.min(duration, currentTime+5))}><FastForward size={13} /></button>
        <div className="spx-toolbar-sep" />

        {/* Timecode */}
        <div className="spx-timecode">{formatTime(currentTime)} / {formatTime(duration)}</div>
        <div className="spx-toolbar-sep" />

        {/* FPS selector */}
        <select className="spx-fps-select" value={frameRate} onChange={e => setFrameRate(Number(e.target.value))} title="Frame rate">
          <option value={24}>24 fps</option>
          <option value={25}>25 fps</option>
          <option value={30}>30 fps</option>
          <option value={48}>48 fps</option>
          <option value={60}>60 fps</option>
        </select>
        <div className="spx-toolbar-sep" />

        {/* Edit shortcuts */}
        <button className="spx-tool-btn" title="Undo (Ctrl+Z)"    onClick={undoTracks}    disabled={!canUndo}><RotateCcw size={13} /></button>
        <button className="spx-tool-btn" title="Redo (Ctrl+Shift+Z)" onClick={redoTracks} disabled={!canRedo}><RotateCw  size={13} /></button>
        <button className="spx-tool-btn" title="Split clip (Ctrl+K)"  onClick={() => selectedClip && splitClip(selectedClip.id)}>
          <Scissors size={13} />
        </button>

        <div className="spx-toolbar-spacer" />

        {/* Save / Export */}
        <button className="spx-tbtn active" onClick={saveProject} title="Save (Ctrl+S)">
          <Save size={12} /> Save
        </button>
        <button className="spx-tbtn" onClick={() => setShowExport(true)} title="Export (Ctrl+E)"
          style={{ background:'linear-gradient(135deg,#00ffc8,#00b894)', color:'#000', border:'none', fontWeight:700 }}>
          <Download size={12} /> Export
        </button>
      </div>
    </>
  );
}
