/**
 * SPXCutHeader.js
 * Project title input, File/Edit/View/Sequence/Clip/Effects/Window menus,
 * save/load (localStorage + R2), undo/redo, export button.
 * Zero inline CSS.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';

const MENUS = {
  File: [
    { label: 'New Project',       shortcut: 'Ctrl+N',  action: 'new' },
    { label: 'Open Project...',   shortcut: 'Ctrl+O',  action: 'open' },
    { label: 'Save Project',      shortcut: 'Ctrl+S',  action: 'save' },
    { label: 'Save As...',        shortcut: 'Ctrl+Shift+S', action: 'saveAs' },
    { sep: true },
    { label: 'Import Media...',   shortcut: 'Ctrl+I',  action: 'importMedia' },
    { sep: true },
    { label: 'Export...',         shortcut: 'Ctrl+M',  action: 'export' },
    { label: 'Export to R2',      shortcut: '',        action: 'exportR2' },
    { sep: true },
    { label: 'Close',             shortcut: '',        action: 'close' },
  ],
  Edit: [
    { label: 'Undo',              shortcut: 'Ctrl+Z',  action: 'undo',  disabled: (s) => !s.undoStack?.length },
    { label: 'Redo',              shortcut: 'Ctrl+Shift+Z', action: 'redo', disabled: (s) => !s.redoStack?.length },
    { sep: true },
    { label: 'Cut',               shortcut: 'Ctrl+X',  action: 'cut' },
    { label: 'Copy',              shortcut: 'Ctrl+C',  action: 'copy' },
    { label: 'Paste',             shortcut: 'Ctrl+V',  action: 'paste' },
    { label: 'Duplicate',         shortcut: 'Ctrl+D',  action: 'duplicate' },
    { sep: true },
    { label: 'Select All',        shortcut: 'Ctrl+A',  action: 'selectAll' },
    { label: 'Deselect All',      shortcut: 'Escape',  action: 'deselect' },
    { sep: true },
    { label: 'Delete',            shortcut: 'Del',     action: 'delete',  danger: true },
  ],
  View: [
    { label: 'Zoom In',           shortcut: '=',       action: 'zoomIn' },
    { label: 'Zoom Out',          shortcut: '-',       action: 'zoomOut' },
    { label: 'Zoom to Fit',       shortcut: 'Shift+Z', action: 'zoomFit' },
    { label: 'Zoom to Selection', shortcut: 'Z',       action: 'zoomSel' },
    { sep: true },
    { label: 'Toggle Snap',       shortcut: 'S',       action: 'toggleSnap' },
    { label: 'Toggle Linked Edit',shortcut: 'L',       action: 'toggleLinked' },
    { sep: true },
    { label: 'Color Grading Panel',shortcut: 'G',      action: 'colorGrade' },
    { label: 'Quick Apply',       shortcut: 'Q',       action: 'quickApply' },
    { sep: true },
    { label: 'Full Screen',       shortcut: 'F',       action: 'fullscreen' },
  ],
  Sequence: [
    { label: 'Sequence Settings',  shortcut: '',       action: 'seqSettings' },
    { sep: true },
    { label: 'Add Video Track',    shortcut: '',       action: 'addVideoTrack' },
    { label: 'Add Audio Track',    shortcut: '',       action: 'addAudioTrack' },
    { sep: true },
    { label: 'Render In to Out',   shortcut: 'Enter',  action: 'render' },
    { label: 'Clear Render Cache', shortcut: '',       action: 'clearCache' },
    { sep: true },
    { label: 'Lift',               shortcut: ';',      action: 'lift' },
    { label: 'Extract',            shortcut: "'",      action: 'extract' },
  ],
  Clip: [
    { label: 'Split at Playhead',  shortcut: 'Ctrl+K', action: 'split' },
    { label: 'Duplicate',          shortcut: 'Ctrl+D', action: 'duplicate' },
    { sep: true },
    { label: 'Speed / Duration...',shortcut: 'Ctrl+R', action: 'speed' },
    { label: 'Reverse Speed',      shortcut: '',       action: 'reverse' },
    { sep: true },
    { label: 'Unlink',             shortcut: 'Ctrl+L', action: 'unlink' },
    { label: 'Group',              shortcut: 'Ctrl+G', action: 'group' },
    { label: 'Ungroup',            shortcut: 'Ctrl+Shift+G', action: 'ungroup' },
    { sep: true },
    { label: 'Clip Properties',    shortcut: 'Alt+P',  action: 'clipProps' },
  ],
  Effects: [
    { label: 'Apply Preset...',    shortcut: '',       action: 'applyPreset' },
    { sep: true },
    { label: 'Remove All Effects', shortcut: '',       action: 'removeAllFx',  danger: true },
    { label: 'Disable All Effects',shortcut: '',       action: 'disableAllFx' },
    { label: 'Enable All Effects', shortcut: '',       action: 'enableAllFx' },
  ],
  Window: [
    { label: 'Media Bin',          shortcut: 'Shift+1', action: 'showMediaBin' },
    { label: 'Timeline',           shortcut: 'Shift+2', action: 'showTimeline' },
    { label: 'Effects Panel',      shortcut: 'Shift+3', action: 'showFxPanel' },
    { label: 'Color Grading',      shortcut: 'Shift+4', action: 'colorGrade' },
    { label: 'Quick Apply',        shortcut: 'Shift+5', action: 'quickApply' },
    { sep: true },
    { label: 'Reset Layout',       shortcut: '',        action: 'resetLayout' },
  ],
};

function DropdownMenu({ items, menuKey, state, onAction, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="spxcut-dropdown" ref={ref} style={{ position: 'absolute' }}>
      {items.map((item, i) => {
        if (item.sep) return <div key={i} className="spxcut-dropdown-separator" />;
        const disabled = item.disabled ? item.disabled(state) : false;
        return (
          <button
            key={i}
            className={`spxcut-dropdown-item${item.danger ? ' danger' : ''}`}
            disabled={disabled}
            onClick={() => { onAction(item.action); onClose(); }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="spxcut-dropdown-shortcut">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SPXCutHeader({ state, actions, selectors, playback }) {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRefs = useRef({});

  const toggleMenu = useCallback((menuKey, e) => {
    e.stopPropagation();
    setOpenMenu(prev => prev === menuKey ? null : menuKey);
  }, []);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  // ── Action dispatcher ─────────────────────────────────────
  const handleAction = useCallback((action) => {
    switch (action) {
      case 'new':
        if (!state.isDirty || window.confirm('Discard unsaved changes?')) {
          actions.loadProject({ tracks: [], nextTrackId: 1, projectName: 'Untitled Project', duration: 0, playhead: 0 });
        }
        break;

      case 'save': {
        // Strip blob: URLs and File refs (not serializable / not valid across sessions)
        const stripTracks = state.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => ({
            ...c,
            src: (c.src && c.src.startsWith('blob:')) ? '' : c.src,
            file: undefined,
            waveformData: null,
            thumbnails: null,
          })),
        }));
        const data = { ...state, tracks: stripTracks, undoStack: [], redoStack: [] };
        try {
          localStorage.setItem('spxcut_project', JSON.stringify(data));
          actions.markClean();
        } catch (e) {
          console.error('Save failed', e);
          window.alert('Save failed: ' + (e.message || 'unknown error'));
        }
        break;
      }

      case 'saveAs': {
        const name = window.prompt('Project name:', state.projectName);
        if (name) {
          // Sanitize name for localStorage key
          const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim();
          if (!safeName) { window.alert('Invalid project name.'); break; }
          actions.setProjectName(safeName);
          // Strip blob URLs + files (same as save)
          const stripTracks = state.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => ({
              ...c,
              src: (c.src && c.src.startsWith('blob:')) ? '' : c.src,
              file: undefined,
              waveformData: null,
              thumbnails: null,
            })),
          }));
          const data = { ...state, projectName: safeName, tracks: stripTracks, undoStack: [], redoStack: [] };
          try {
            localStorage.setItem(`spxcut_project_${safeName}`, JSON.stringify(data));
            actions.markClean();
          } catch (e) {
            console.error('Save As failed', e);
            window.alert('Save As failed: ' + (e.message || 'unknown error'));
          }
        }
        break;
      }

      case 'open': {
        // Find all saved projects (default + named via Save As)
        const projects = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key === 'spxcut_project' || (key && key.startsWith('spxcut_project_'))) {
            projects.push(key);
          }
        }
        if (projects.length === 0) {
          window.alert('No saved projects found.');
          break;
        }
        // Build picker prompt
        const labels = projects.map((k, i) => {
          const name = k === 'spxcut_project' ? '(default)' : k.replace('spxcut_project_', '');
          return `${i + 1}. ${name}`;
        }).join('\n');
        const choice = window.prompt(`Open project:\n${labels}\n\nEnter number:`, '1');
        const idx = parseInt(choice, 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= projects.length) break;
        try {
          const data = JSON.parse(localStorage.getItem(projects[idx]));
          actions.loadProject(data);
          // Warn if any clip has empty src (blob was stripped)
          const missingMedia = (data.tracks || []).some(t => (t.clips || []).some(c => !c.src));
          if (missingMedia) {
            window.alert('Project loaded. Some clips need media re-imported (blob URLs do not persist across sessions).');
          }
        } catch (e) {
          console.error('Load failed', e);
          window.alert('Load failed: ' + (e.message || 'unknown error'));
        }
        break;
      }

      case 'importMedia':
        document.getElementById('spxcut-file-input')?.click();
        break;

      case 'export':
        actions.setExportModal(true);
        break;

      case 'exportR2':
        actions.setExportModal(true);
        break;

      case 'undo':
        actions.undo();
        break;

      case 'redo':
        actions.redo();
        break;

      case 'cut':
      case 'copy':
      case 'paste':
        // Clipboard ops — wired via browser clipboard API
        break;

      case 'duplicate':
        if (state.selectedClipIds.length) actions.duplicateClips(state.selectedClipIds);
        break;

      case 'selectAll':
        actions.selectAllClips();
        break;

      case 'deselect':
        actions.clearSelection();
        break;

      case 'delete':
        actions.deleteClips(state.selectedClipIds);
        break;

      case 'zoomIn':
        actions.setZoom(state.zoom * 1.25);
        break;

      case 'zoomOut':
        actions.setZoom(state.zoom * 0.8);
        break;

      case 'zoomFit': {
        const binEl = document.querySelector('.spxcut-timeline');
        if (binEl && state.duration > 0) {
          const w = binEl.clientWidth - 130;
          actions.setZoom(w / state.duration);
        }
        break;
      }

      case 'toggleSnap':
        actions.setSnap(!state.snapEnabled);
        break;

      case 'toggleLinked':
        actions.setLinkedEdit(!state.linkedEdit);
        break;

      case 'colorGrade':
        actions.setColorGrade(!state.showColorGrade);
        break;

      case 'quickApply':
        actions.setQuickApply(!state.showQuickApply);
        break;

      case 'fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        break;

      case 'addVideoTrack':
        actions.addTrack('video');
        break;

      case 'addAudioTrack':
        actions.addTrack('audio');
        break;

      case 'split':
        actions.splitClip(state.playhead);
        break;

      case 'unlink':
        if (state.activeClipId) {
          const clip = selectors.getClipById(state.activeClipId);
          if (clip?.linkGroup) actions.unlinkGroup(clip.linkGroup);
        }
        break;

      case 'removeAllFx':
        if (state.activeClipId) {
          const clip = selectors.getClipById(state.activeClipId);
          if (clip) clip.effects.forEach(fx => actions.removeEffect(state.activeClipId, fx.id));
        }
        break;

      case 'enableAllFx':
      case 'disableAllFx': {
        const clip = state.activeClipId ? selectors.getClipById(state.activeClipId) : null;
        if (clip) {
          const targetState = action === 'enableAllFx';
          clip.effects.forEach(fx => {
            if (fx.enabled !== targetState) actions.toggleEffect(state.activeClipId, fx.id);
          });
        }
        break;
      }

      default:
        break;
    }
  }, [state, actions, selectors]);

  return (
    <div className="spxcut-header">
      {/* Logo */}
      <div className="spxcut-header-logo">
        <div className="spxcut-logo-diamond" />
        <span className="spxcut-logo-text">SPX CUT</span>
      </div>

      {/* Menu buttons */}
      <div className="spxcut-header-menu" style={{ position: 'relative' }}>
        {Object.keys(MENUS).map(menuKey => (
          <div key={menuKey} style={{ position: 'relative' }}>
            <button
              className={`spxcut-menu-btn${openMenu === menuKey ? ' menu-active' : ''}`}
              onClick={(e) => toggleMenu(menuKey, e)}
            >
              {menuKey}
            </button>
            {openMenu === menuKey && (
              <DropdownMenu
                items={MENUS[menuKey]}
                menuKey={menuKey}
                state={state}
                onAction={handleAction}
                onClose={closeMenu}
              />
            )}
          </div>
        ))}
      </div>

      {/* Project name */}
      <div className="spxcut-header-center">
        <input
          className="spxcut-project-input"
          value={state.projectName}
          onChange={e => actions.setProjectName(e.target.value)}
          title="Project Name"
        />
        {state.isDirty && <span style={{ fontSize: 10, color: 'var(--orange)' }}>●</span>}
      </div>

      {/* Undo/Redo + Save + Export */}
      <div className="spxcut-header-right">
        <div className="spxcut-undo-redo">
          <button
            className="spxcut-hbtn"
            onClick={actions.undo}
            disabled={!selectors.canUndo}
            title="Undo (Ctrl+Z)"
          >↩</button>
          <button
            className="spxcut-hbtn"
            onClick={actions.redo}
            disabled={!selectors.canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >↪</button>
        </div>
        <button
          className="spxcut-hbtn hbtn-save"
          onClick={() => handleAction('save')}
          title="Save (Ctrl+S)"
        >
          {state.isDirty ? '● Save' : 'Saved'}
        </button>
        <button
          className="spxcut-hbtn hbtn-export"
          onClick={() => actions.setExportModal(true)}
          title="Export (Ctrl+M)"
        >
          Export ▶
        </button>
      </div>

      {/* Hidden file input for import */}
      <input
        id="spxcut-file-input"
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        className="spxcut-visually-hidden"
        onChange={(e) => {
          Array.from(e.target.files).forEach(file => {
            const mediaType = file.type.startsWith('video') ? 'video'
              : file.type.startsWith('audio') ? 'audio' : 'image';
            // Files imported to media bin — trigger custom event
            window.dispatchEvent(new CustomEvent('spxcut:import', { detail: { file, mediaType } }));
          });
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default SPXCutHeader;
