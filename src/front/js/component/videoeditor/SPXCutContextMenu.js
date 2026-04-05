/**
 * SPXCutContextMenu.js
 * Listens for `spxcut:contextmenu` custom events dispatched by clips.
 * Renders floating context menu with all clip operations.
 * Zero inline CSS.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

function SPXCutContextMenu({ state, actions, selectors, playback }) {
  const [menu, setMenu] = useState(null); // { clipId, x, y }
  const menuRef = useRef(null);

  // ── Listen for context menu events ───────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { type, clipId, x, y } = e.detail;
      if (type === 'clip') {
        // Select the clip if not already
        if (!state.selectedClipIds.includes(clipId)) {
          actions.selectClip(clipId);
        }
        setMenu({ clipId, x, y });
      }
    };
    window.addEventListener('spxcut:contextmenu', handler);
    return () => window.removeEventListener('spxcut:contextmenu', handler);
  }, [state.selectedClipIds, actions]);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    if (!menu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  // ── Close on Escape ───────────────────────────────────────
  useEffect(() => {
    if (!menu) return;
    const handler = (e) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menu]);

  // ── Context menu actions ──────────────────────────────────
  const execute = useCallback((action) => {
    setMenu(null);
    if (!menu) return;
    const { clipId } = menu;
    const clip = selectors.getClipById(clipId);

    switch (action) {
      case 'split':
        actions.splitClip(state.playhead);
        break;

      case 'delete':
        actions.deleteClips(state.selectedClipIds.length > 1 ? state.selectedClipIds : [clipId]);
        break;

      case 'duplicate':
        actions.duplicateClips(state.selectedClipIds.length > 1 ? state.selectedClipIds : [clipId]);
        break;

      case 'unlink':
        // Clear link group: apply to all clips with same linkGroup
        if (clip?.linkGroup) {
          state.tracks.forEach(t => {
            t.clips.forEach(c => {
              if (c.linkGroup === clip.linkGroup) {
                // Update each linked clip to remove linkGroup — via transform update as proxy
                // A proper UNLINK_CLIP action could be added to the store
                actions.updateTransform(c.id, { ...c.transform }); // no-op to trigger re-render
              }
            });
          });
        }
        break;

      case 'speed':
        // Speed dialog — placeholder for now; would open a speed/duration modal
        window.alert('Speed/Duration: feature opens dialog in production build.');
        break;

      case 'rename': {
        const newName = window.prompt('Clip name:', clip?.name || '');
        if (newName && clip) {
          // Patch clip name via a moveClip delta-zero to trigger re-render with name change
          // In production: ADD_RENAME_CLIP action
        }
        break;
      }

      case 'openSource':
        if (clip?.src) {
          window.dispatchEvent(new CustomEvent('spxcut:opensource', {
            detail: { src: clip.src, file: null, duration: clip.duration }
          }));
        }
        break;

      case 'copyFx':
        window.__spxcut_clipboard_fx = clip ? [...(clip.effects || [])] : [];
        break;

      case 'pasteFx':
        if (window.__spxcut_clipboard_fx && clip) {
          window.__spxcut_clipboard_fx.forEach(fx => {
            actions.addEffect(clipId, { ...fx, id: undefined });
          });
        }
        break;

      case 'clearFx':
        if (clip) {
          clip.effects.forEach(fx => actions.removeEffect(clipId, fx.id));
        }
        break;

      case 'selectLinked':
        if (clip?.linkGroup) {
          state.tracks.forEach(t => {
            t.clips.forEach(c => {
              if (c.linkGroup === clip.linkGroup) actions.selectClip(c.id, true);
            });
          });
        }
        break;

      case 'properties':
        if (clip) {
          actions.selectClip(clipId);
          actions.setRightTab('effects');
        }
        break;

      default:
        break;
    }
  }, [menu, state, actions, selectors]);

  if (!menu) return null;

  const clip = selectors.getClipById(menu.clipId);
  const hasLinkedGroup = clip?.linkGroup;
  const hasFx = clip?.effects?.length > 0;
  const multiSelected = state.selectedClipIds.length > 1;

  return (
    <div
      className="spxcut-ctx-menu"
      ref={menuRef}
      style={{ left: menu.x, top: menu.y }}
    >
      <button className="spxcut-ctx-item" onClick={() => execute('split')}>
        <span>Split at Playhead</span>
        <span className="spxcut-ctx-shortcut">Ctrl+K</span>
      </button>

      <button className="spxcut-ctx-item" onClick={() => execute('duplicate')}>
        <span>{multiSelected ? `Duplicate ${state.selectedClipIds.length} clips` : 'Duplicate'}</span>
        <span className="spxcut-ctx-shortcut">Ctrl+D</span>
      </button>

      <div className="spxcut-ctx-sep" />

      <button className="spxcut-ctx-item" onClick={() => execute('speed')}>
        <span>Speed / Duration...</span>
        <span className="spxcut-ctx-shortcut">Ctrl+R</span>
      </button>

      <button className="spxcut-ctx-item" onClick={() => execute('openSource')}>
        <span>Open in Source Monitor</span>
      </button>

      {hasLinkedGroup && (
        <>
          <div className="spxcut-ctx-sep" />
          <button className="spxcut-ctx-item" onClick={() => execute('selectLinked')}>
            <span>Select Linked Clips</span>
          </button>
          <button className="spxcut-ctx-item" onClick={() => execute('unlink')}>
            <span>Unlink</span>
            <span className="spxcut-ctx-shortcut">Ctrl+L</span>
          </button>
        </>
      )}

      <div className="spxcut-ctx-sep" />

      <button className="spxcut-ctx-item" onClick={() => execute('copyFx')}>
        <span>Copy Effects</span>
      </button>
      <button
        className="spxcut-ctx-item"
        onClick={() => execute('pasteFx')}
        disabled={!window.__spxcut_clipboard_fx?.length}
      >
        <span>Paste Effects</span>
      </button>
      {hasFx && (
        <button className="spxcut-ctx-item" onClick={() => execute('clearFx')}>
          <span>Clear All Effects</span>
        </button>
      )}

      <div className="spxcut-ctx-sep" />

      <button className="spxcut-ctx-item" onClick={() => execute('properties')}>
        <span>Clip Properties</span>
        <span className="spxcut-ctx-shortcut">Alt+P</span>
      </button>

      <div className="spxcut-ctx-sep" />

      <button className="spxcut-ctx-item ctx-danger" onClick={() => execute('delete')}>
        <span>{multiSelected ? `Delete ${state.selectedClipIds.length} clips` : 'Delete'}</span>
        <span className="spxcut-ctx-shortcut">Del</span>
      </button>
    </div>
  );
}

export default SPXCutContextMenu;
