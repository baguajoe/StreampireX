// =============================================================================
// DAWMenuBar.js — Professional DAW Menu Bar (Cubase/Logic-style)
// =============================================================================
// Location: src/front/js/component/DAWMenuBar.js
// Compact always-visible dropdown bar with File, Edit, View, Track, Transport,
// MIDI, Tools menus. All actions fire callbacks to RecordingStudio parent.
// Keyboard shortcuts displayed + functional via useEffect listener.
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';

// ── Menu definitions ──
const buildMenus = ({
  viewMode, isPlaying, isRecording, metronomeOn, countIn, tracks,
  maxTracks, saving, mixingDown, pianoRollNotes
}) => [
  {
    label: 'File',
    items: [
      { label: 'New Project', shortcut: 'Ctrl+N', action: 'file:new', icon: '📄' },
      { label: 'Open Project…', shortcut: 'Ctrl+O', action: 'file:open', icon: '📂' },
      { type: 'separator' },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'file:save', icon: '💾', disabled: saving },
      { label: 'Save As…', shortcut: 'Ctrl+Shift+S', action: 'file:saveAs', icon: '💾' },
      { type: 'separator' },
      { label: 'Import Audio…', shortcut: 'Ctrl+I', action: 'file:importAudio', icon: '📥' },
      { label: 'Import MIDI…', action: 'file:importMidi', icon: '🎹' },
      { type: 'separator' },
      { label: 'Bounce / Mixdown', shortcut: 'Ctrl+B', action: 'file:bounce', icon: '🎧', disabled: mixingDown },
      { label: 'Export MIDI…', action: 'file:exportMidi', icon: '📤', disabled: pianoRollNotes.length === 0 },
      { type: 'separator' },
      { label: 'Project Settings…', action: 'file:projectSettings', icon: '⚙️' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'edit:undo', icon: '↩' },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: 'edit:redo', icon: '↪' },
      { type: 'separator' },
      { label: 'Cut', shortcut: 'Ctrl+X', action: 'edit:cut', icon: '✂️' },
      { label: 'Copy', shortcut: 'Ctrl+C', action: 'edit:copy', icon: '📋' },
      { label: 'Paste', shortcut: 'Ctrl+V', action: 'edit:paste', icon: '📌' },
      { label: 'Delete', shortcut: 'Del', action: 'edit:delete', icon: '🗑' },
      { type: 'separator' },
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'edit:selectAll' },
      { label: 'Deselect All', shortcut: 'Ctrl+D', action: 'edit:deselectAll' },
      { type: 'separator' },
      { label: 'Quantize Notes…', shortcut: 'Q', action: 'edit:quantize', icon: '🎯' },
      { label: 'Snap to Grid', action: 'edit:snapToggle', icon: '🧲' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Record', shortcut: '1', action: 'view:record', active: viewMode === 'record' },
      { label: 'Arrange', shortcut: '2', action: 'view:arrange', active: viewMode === 'arrange' },
      { label: 'Console / Mixer', shortcut: '3', action: 'view:console', active: viewMode === 'console' },
      { label: 'Beat Maker', shortcut: '4', action: 'view:beatmaker', active: viewMode === 'beatmaker' },
      { label: 'Piano Roll', shortcut: '5', action: 'view:pianoroll', active: viewMode === 'pianoroll' },
      { type: 'separator' },
      { label: 'Virtual Piano', action: 'view:piano', active: viewMode === 'piano' },
      { label: 'Sound Browser', action: 'view:sounds', active: viewMode === 'sounds' },
      { label: 'Piano + Drum Split', action: 'view:split', active: viewMode === 'split' },
      { label: 'Key Finder', action: 'view:keyfinder', active: viewMode === 'keyfinder' },
      { type: 'separator' },
      { label: 'MIDI Import / Hardware', action: 'view:midi', active: viewMode === 'midi' },
      { label: 'Chord Generator', action: 'view:chords', active: viewMode === 'chords' },
      { label: 'Sound Kits', action: 'view:kits', active: viewMode === 'kits' },
      { label: 'Mic Simulator', action: 'view:micsim', active: viewMode === 'micsim' },
      { type: 'separator' },
      { label: 'AI Beat Assistant', action: 'view:aibeat', active: viewMode === 'aibeat', icon: '✨' },
      { label: 'AI Mix Assistant', action: 'view:aimix', active: viewMode === 'aimix', icon: '✨' },
      { type: 'separator' },
      { label: 'Toggle Effects Panel', shortcut: 'E', action: 'view:toggleFx' },
    ],
  },
  {
    label: 'Track',
    items: [
      { label: 'Add Track', shortcut: 'Ctrl+T', action: 'track:add', icon: '➕', disabled: tracks.length >= maxTracks },
      { label: 'Duplicate Track', shortcut: 'Ctrl+Shift+D', action: 'track:duplicate' },
      { label: 'Remove Track', action: 'track:remove', icon: '🗑' },
      { type: 'separator' },
      { label: 'Arm Selected', shortcut: 'R', action: 'track:arm', icon: '🔴' },
      { label: 'Mute Selected', shortcut: 'M', action: 'track:mute' },
      { label: 'Solo Selected', shortcut: 'S', action: 'track:solo' },
      { type: 'separator' },
      { label: 'Clear Track Audio', action: 'track:clear' },
      { label: 'Rename Track…', action: 'track:rename' },
      { label: 'Track Color…', action: 'track:color' },
      { type: 'separator' },
      { label: 'Mute All', action: 'track:muteAll' },
      { label: 'Unmute All', action: 'track:unmuteAll' },
      { label: 'Unsolo All', action: 'track:unsoloAll' },
    ],
  },
  {
    label: 'Transport',
    items: [
      { label: isPlaying ? 'Pause' : 'Play', shortcut: 'Space', action: 'transport:playPause', icon: isPlaying ? '⏸' : '▶' },
      { label: 'Stop', shortcut: 'Ctrl+Space', action: 'transport:stop', icon: '⏹' },
      { label: isRecording ? 'Stop Recording' : 'Record', shortcut: 'Ctrl+R', action: 'transport:record', icon: '⏺' },
      { type: 'separator' },
      { label: 'Rewind to Start', shortcut: 'Home', action: 'transport:rewind', icon: '⏮' },
      { label: 'Go to End', shortcut: 'End', action: 'transport:goToEnd' },
      { type: 'separator' },
      { label: `Metronome ${metronomeOn ? '(ON)' : '(OFF)'}`, shortcut: 'C', action: 'transport:metronome', icon: metronomeOn ? '✅' : '☐' },
      { label: `Count-In ${countIn ? '(ON)' : '(OFF)'}`, action: 'transport:countIn', icon: countIn ? '✅' : '☐' },
      { type: 'separator' },
      { label: 'Tap Tempo', shortcut: 'T', action: 'transport:tapTempo' },
      { label: 'Set BPM…', action: 'transport:setBpm' },
      { label: 'Time Signature…', action: 'transport:timeSignature' },
    ],
  },
  {
    label: 'MIDI',
    items: [
      { label: 'Open Piano Roll', shortcut: '5', action: 'view:pianoroll', icon: '🎹' },
      { label: 'Import MIDI File…', action: 'midi:import', icon: '📥' },
      { label: 'Export MIDI File…', action: 'midi:export', icon: '📤' },
      { type: 'separator' },
      { label: 'MIDI Hardware Setup…', action: 'midi:hardware', icon: '🔌' },
      { label: 'Chord Generator…', action: 'midi:chords', icon: '🎵' },
      { type: 'separator' },
      { label: 'Quantize', shortcut: 'Q', action: 'midi:quantize', icon: '🎯' },
      { label: 'Humanize', action: 'midi:humanize' },
      { label: 'Transpose…', action: 'midi:transpose' },
      { label: 'Velocity Scale…', action: 'midi:velocity' },
      { type: 'separator' },
      { label: 'Clear All Notes', action: 'midi:clearAll', disabled: pianoRollNotes.length === 0 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Key & Scale Detector', action: 'view:keyfinder', icon: '🎼' },
      { label: 'AI Beat Generator', action: 'view:aibeat', icon: '✨' },
      { label: 'AI Mix Assistant', action: 'view:aimix', icon: '✨' },
      { label: 'Mic Simulator', action: 'view:micsim', icon: '🎙' },
      { type: 'separator' },
      { label: 'Sound Browser (Freesound)', action: 'view:sounds', icon: '🔍' },
      { label: 'Sound Kit Manager', action: 'view:kits', icon: '🎛' },
      { label: 'Piano + Drum Split', action: 'view:split', icon: '🔀' },
      { type: 'separator' },
      { label: 'Chord Progression Generator', action: 'view:chords', icon: '🎵' },
      { label: 'MIDI Import / Hardware', action: 'view:midi', icon: '🔌' },
    ],
  },
];

// ── Keyboard shortcut map ──
const SHORTCUTS = {
  'ctrl+n':       'file:new',
  'ctrl+o':       'file:open',
  'ctrl+s':       'file:save',
  'ctrl+shift+s': 'file:saveAs',
  'ctrl+i':       'file:importAudio',
  'ctrl+b':       'file:bounce',
  'ctrl+z':       'edit:undo',
  'ctrl+shift+z': 'edit:redo',
  'ctrl+x':       'edit:cut',
  'ctrl+c':       'edit:copy',
  'ctrl+v':       'edit:paste',
  'delete':       'edit:delete',
  'ctrl+a':       'edit:selectAll',
  'ctrl+d':       'edit:deselectAll',
  'ctrl+t':       'track:add',
  'ctrl+shift+d': 'track:duplicate',
  'ctrl+r':       'transport:record',
  'ctrl+ ':       'transport:stop',
  ' ':            'transport:playPause',
  'home':         'transport:rewind',
  'end':          'transport:goToEnd',
  '1':            'view:record',
  '2':            'view:arrange',
  '3':            'view:console',
  '4':            'view:beatmaker',
  '5':            'view:pianoroll',
  'q':            'edit:quantize',
  'e':            'view:toggleFx',
  'c':            'transport:metronome',
  't':            'transport:tapTempo',
  'r':            'track:arm',
  'm':            'track:mute',
  's':            'track:solo',
};


// =============================================================================
// COMPONENT
// =============================================================================
const DAWMenuBar = ({
  viewMode = 'record',
  isPlaying = false,
  isRecording = false,
  metronomeOn = false,
  countIn = false,
  tracks = [],
  maxTracks = 16,
  saving = false,
  mixingDown = false,
  pianoRollNotes = [],
  bpm = 120,
  projectName = 'Untitled',
  onAction = () => {},
}) => {
  const [openMenu, setOpenMenu] = useState(null);
  const barRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      let combo = '';
      if (e.ctrlKey || e.metaKey) combo += 'ctrl+';
      if (e.shiftKey) combo += 'shift+';
      combo += e.key.toLowerCase();

      const action = SHORTCUTS[combo];
      if (action) {
        e.preventDefault();
        e.stopPropagation();
        onAction(action);
        setOpenMenu(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onAction]);

  const menus = buildMenus({
    viewMode, isPlaying, isRecording, metronomeOn, countIn, tracks,
    maxTracks, saving, mixingDown, pianoRollNotes
  });

  const handleMenuClick = (idx) => {
    setOpenMenu(openMenu === idx ? null : idx);
  };

  const handleMenuHover = (idx) => {
    if (openMenu !== null) setOpenMenu(idx);
  };

  const handleItemClick = (item) => {
    if (item.disabled) return;
    if (item.type === 'separator') return;
    onAction(item.action);
    setOpenMenu(null);
  };

  return (
    <div className="daw-menubar" ref={barRef}>
      {menus.map((menu, idx) => (
        <div
          key={menu.label}
          className={`daw-menubar-item ${openMenu === idx ? 'open' : ''}`}
          onMouseDown={() => handleMenuClick(idx)}
          onMouseEnter={() => handleMenuHover(idx)}
        >
          <span className="daw-menubar-label">{menu.label}</span>
          {openMenu === idx && (
            <div className="daw-menubar-dropdown">
              {menu.items.map((item, iIdx) => {
                if (item.type === 'separator') {
                  return <div key={`sep-${iIdx}`} className="daw-menubar-separator" />;
                }
                return (
                  <div
                    key={item.action || iIdx}
                    className={`daw-menubar-dropdown-item ${item.disabled ? 'disabled' : ''} ${item.active ? 'active' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className="daw-menubar-item-icon">
                      {item.active ? '●' : (item.icon || '')}
                    </span>
                    <span className="daw-menubar-item-label">{item.label}</span>
                    {item.shortcut && (
                      <span className="daw-menubar-item-shortcut">{item.shortcut}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* ── Right side: project info ── */}
      <div className="daw-menubar-spacer" />
      <div className="daw-menubar-info">
        <span className="daw-menubar-project">{projectName}</span>
        <span className="daw-menubar-divider">|</span>
        <span className="daw-menubar-bpm">{bpm} BPM</span>
        <span className="daw-menubar-divider">|</span>
        <span className="daw-menubar-tracks">{tracks.length}/{maxTracks} Tracks</span>
      </div>
    </div>
  );
};

export default DAWMenuBar;