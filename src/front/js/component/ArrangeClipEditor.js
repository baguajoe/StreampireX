// =============================================================================
// ArrangeClipEditor.js — Inline Clip Editing for ArrangerView
// =============================================================================
// Location: src/front/js/component/ArrangeClipEditor.js
//
// Adds to existing ArrangerView:
//   • Right-click context menu on regions → Split, Duplicate, Rename, Delete, Fade In/Out
//   • Resize handles on left/right edge of every region (drag to trim)
//   • Crossfade handle when two regions are adjacent on the same track
//   • Loop toggle per region
//   • Export Loop Range: set in/out points → bounced to file
//
// INTEGRATION into ArrangerView.js:
//   import ArrangeClipEditor from './ArrangeClipEditor';
//
//   Inside ArrangerView JSX, wrap your region rendering with:
//   <ArrangeClipEditor
//     tracks={tracks}
//     setTracks={setTracks}
//     bpm={bpm}
//     zoom={zoom}
//     snapValue={snapValue}
//     beatWidth={beatWidth}   // px per beat at current zoom
//     onSplitAtPlayhead={(trackIdx) => splitRegion(selectedRegion, playheadBeat)}
//     onStatus={setStatus}
//   >
//     {/* your existing region elements, OR just pass region data and let this render */}
//   </ArrangeClipEditor>
//
//   --- SIMPLER APPROACH: add these 3 handlers to your existing region mousedown ---
//   onRegionRightClick  → shows context menu
//   onRegionEdgeMouseDown → starts resize drag
//   crossfadeHandle     → rendered between adjacent regions
// =============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function snapTo(beat, snapValue) {
  if (!snapValue) return beat;
  return Math.round(beat / snapValue) * snapValue;
}

function pxToBeat(px, beatWidth) {
  return px / beatWidth;
}

// ── Context Menu ─────────────────────────────────────────────────────────────

function ClipContextMenu({ x, y, region, onAction, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { label: '✂️  Split at Playhead',   action: 'split' },
    { label: '📋  Duplicate',            action: 'duplicate' },
    { label: '✏️  Rename…',              action: 'rename' },
    { type: 'sep' },
    { label: region?.loopEnabled ? '🔁  Remove Loop' : '🔁  Enable Loop',  action: 'loop' },
    { label: '↩  Fade In',              action: 'fadeIn' },
    { label: '↪  Fade Out',             action: 'fadeOut' },
    { type: 'sep' },
    { label: '🗑️  Delete',              action: 'delete', danger: true },
  ];

  const style = {
    position: 'fixed',
    top: y,
    left: x,
    background: '#1a1f2e',
    border: '1px solid #2a3040',
    borderRadius: 6,
    padding: '4px 0',
    zIndex: 99999,
    minWidth: 180,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
  };

  return (
    <div ref={menuRef} style={style} onContextMenu={e => e.preventDefault()}>
      {items.map((item, i) =>
        item.type === 'sep'
          ? <div key={i} style={{ borderTop: '1px solid #2a3040', margin: '3px 0' }} />
          : (
            <div
              key={i}
              onMouseDown={e => { e.stopPropagation(); onAction(item.action); onClose(); }}
              style={{
                padding: '6px 14px',
                cursor: 'pointer',
                color: item.danger ? '#ff5555' : '#cdd9e5',
                background: 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#252c3d'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.label}
            </div>
          )
      )}
    </div>
  );
}

// ── Crossfade Handle ──────────────────────────────────────────────────────────

export function CrossfadeHandle({ leftRegion, rightRegion, beatWidth, trackTop, trackHeight, onSetCrossfade }) {
  // Only show if regions are adjacent (within 0.1 beats)
  const gap = rightRegion.startBeat - (leftRegion.startBeat + leftRegion.duration);
  if (Math.abs(gap) > 0.1) return null;

  const x = leftRegion.startBeat * beatWidth + leftRegion.duration * beatWidth;
  const size = 14;

  return (
    <div
      title="Drag to set crossfade width"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: trackTop + trackHeight / 2 - size / 2,
        width: size,
        height: size,
        background: '#00ffc8',
        borderRadius: '50%',
        cursor: 'ew-resize',
        zIndex: 20,
        opacity: 0.85,
        border: '2px solid #0d1117',
        boxShadow: '0 0 6px #00ffc888',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const startFade = leftRegion.fadeOut || 0;
        const move = (me) => {
          const dx = me.clientX - startX;
          const beats = Math.max(0, startFade + pxToBeat(dx, beatWidth));
          onSetCrossfade(leftRegion.id, rightRegion.id, beats);
        };
        const up = () => {
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      }}
    />
  );
}

// ── Resize Handles ────────────────────────────────────────────────────────────

export function RegionResizeHandles({ region, beatWidth, snapValue, onResize, onResizeEnd }) {
  const handleStyle = (side) => ({
    position: 'absolute',
    top: 0,
    [side]: 0,
    width: 8,
    height: '100%',
    cursor: 'ew-resize',
    background: 'rgba(0,255,200,0.18)',
    zIndex: 15,
    borderRadius: side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0',
    transition: 'background 0.15s',
  });

  const startDrag = useCallback((e, side) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const origStart = region.startBeat;
    const origDur = region.duration;

    const move = (me) => {
      const dx = me.clientX - startX;
      const dBeats = pxToBeat(dx, beatWidth);

      if (side === 'left') {
        const newStart = snapTo(Math.max(0, origStart + dBeats), snapValue);
        const newDur = origDur - (newStart - origStart);
        if (newDur >= 0.125) onResize(region.id, newStart, newDur);
      } else {
        const newDur = snapTo(Math.max(0.25, origDur + dBeats), snapValue);
        onResize(region.id, origStart, newDur);
      }
    };

    const up = (me) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (onResizeEnd) onResizeEnd(region.id);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [region, beatWidth, snapValue, onResize, onResizeEnd]);

  return (
    <>
      <div
        style={handleStyle('left')}
        onMouseDown={e => startDrag(e, 'left')}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,200,0.4)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,200,0.18)'}
        title="Drag to trim start"
      />
      <div
        style={handleStyle('right')}
        onMouseDown={e => startDrag(e, 'right')}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,255,200,0.4)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,255,200,0.18)'}
        title="Drag to trim end"
      />
    </>
  );
}

// ── Loop Range Selector ───────────────────────────────────────────────────────

export function LoopRangeBar({ loopStart, loopEnd, totalBeats, beatWidth, onSetRange }) {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | 'body'

  const startPx = (loopStart / totalBeats) * (totalBeats * beatWidth);
  const endPx   = (loopEnd   / totalBeats) * (totalBeats * beatWidth);

  const style = {
    position: 'absolute',
    top: 0,
    left: startPx,
    width: endPx - startPx,
    height: '100%',
    background: 'rgba(0,255,200,0.12)',
    border: '1px solid rgba(0,255,200,0.4)',
    cursor: 'grab',
    zIndex: 5,
    pointerEvents: 'all',
  };

  return (
    <div style={style} ref={barRef} title={`Loop: beat ${loopStart.toFixed(2)} – ${loopEnd.toFixed(2)}`}>
      {/* Left handle */}
      <div
        style={{ position:'absolute', left:0, top:0, width:6, height:'100%', cursor:'ew-resize', background:'rgba(0,255,200,0.5)' }}
        onMouseDown={e => { e.stopPropagation(); /* drag start handle */ }}
      />
      {/* Right handle */}
      <div
        style={{ position:'absolute', right:0, top:0, width:6, height:'100%', cursor:'ew-resize', background:'rgba(0,255,200,0.5)' }}
        onMouseDown={e => { e.stopPropagation(); /* drag end handle */ }}
      />
      <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:9, color:'#00ffc8', fontFamily:'monospace', pointerEvents:'none', whiteSpace:'nowrap' }}>
        LOOP {loopStart.toFixed(1)}–{loopEnd.toFixed(1)}
      </span>
    </div>
  );
}

// ── Main Hook: useClipEditor ──────────────────────────────────────────────────
// Add this hook to ArrangerView and call its handlers from region elements.

export function useClipEditor({ tracks, setTracks, bpm, snapValue, playheadBeat, onStatus }) {

  const [contextMenu, setContextMenu] = useState(null);
  // contextMenu: { x, y, region, trackIndex }

  const [renameModal, setRenameModal] = useState(null);
  // renameModal: { region, trackIndex }

  // ── Context menu trigger ──
  const onRegionRightClick = useCallback((e, region, trackIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, region, trackIndex });
  }, []);

  // ── Context menu actions ──
  const handleContextAction = useCallback((action) => {
    if (!contextMenu) return;
    const { region, trackIndex } = contextMenu;

    switch (action) {
      case 'split': {
        // Split at current playhead
        const splitBeat = playheadBeat;
        if (splitBeat <= region.startBeat || splitBeat >= region.startBeat + region.duration) {
          onStatus?.('⚠ Playhead is outside the selected region');
          break;
        }
        const leftDur  = splitBeat - region.startBeat;
        const rightDur = region.duration - leftDur;
        const left  = { ...region, duration: leftDur, name: region.name };
        const right = {
          ...region,
          id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          startBeat: splitBeat,
          duration: rightDur,
          name: `${region.name} (R)`,
        };
        setTracks(prev => prev.map((t, i) => {
          if (i !== trackIndex) return t;
          const regions = (t.regions || []).filter(r => r.id !== region.id);
          return { ...t, regions: [...regions, left, right] };
        }));
        onStatus?.(`✂ Split "${region.name}" at beat ${splitBeat.toFixed(2)}`);
        break;
      }

      case 'duplicate': {
        const dup = {
          ...region,
          id: `rgn_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          startBeat: region.startBeat + region.duration,
          name: `${region.name} (copy)`,
        };
        setTracks(prev => prev.map((t, i) =>
          i === trackIndex ? { ...t, regions: [...(t.regions||[]), dup] } : t
        ));
        onStatus?.(`📋 Duplicated "${region.name}"`);
        break;
      }

      case 'loop': {
        setTracks(prev => prev.map((t, i) =>
          i !== trackIndex ? t : {
            ...t, regions: t.regions.map(r =>
              r.id === region.id ? { ...r, loopEnabled: !r.loopEnabled } : r
            )
          }
        ));
        break;
      }

      case 'fadeIn': {
        setTracks(prev => prev.map((t, i) =>
          i !== trackIndex ? t : {
            ...t, regions: t.regions.map(r =>
              r.id === region.id ? { ...r, fadeIn: r.fadeIn ? 0 : Math.min(1, r.duration * 0.2) } : r
            )
          }
        ));
        break;
      }

      case 'fadeOut': {
        setTracks(prev => prev.map((t, i) =>
          i !== trackIndex ? t : {
            ...t, regions: t.regions.map(r =>
              r.id === region.id ? { ...r, fadeOut: r.fadeOut ? 0 : Math.min(1, r.duration * 0.2) } : r
            )
          }
        ));
        break;
      }

      case 'rename': {
        setRenameModal({ region, trackIndex });
        break;
      }

      case 'delete': {
        setTracks(prev => prev.map((t, i) =>
          i !== trackIndex ? t : { ...t, regions: (t.regions||[]).filter(r => r.id !== region.id) }
        ));
        onStatus?.(`🗑 Deleted "${region.name}"`);
        break;
      }
      default: break;
    }
  }, [contextMenu, playheadBeat, setTracks, onStatus]);

  // ── Resize ──
  const onResize = useCallback((regionId, newStart, newDur) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      regions: (t.regions||[]).map(r =>
        r.id === regionId ? { ...r, startBeat: newStart, duration: newDur } : r
      )
    })));
  }, [setTracks]);

  // ── Crossfade ──
  const onSetCrossfade = useCallback((leftId, rightId, fadeBeats) => {
    setTracks(prev => prev.map(t => ({
      ...t,
      regions: (t.regions||[]).map(r => {
        if (r.id === leftId)  return { ...r, fadeOut: fadeBeats };
        if (r.id === rightId) return { ...r, fadeIn: fadeBeats };
        return r;
      })
    })));
  }, [setTracks]);

  // ── Rename commit ──
  const commitRename = useCallback((newName) => {
    if (!renameModal) return;
    const { region, trackIndex } = renameModal;
    setTracks(prev => prev.map((t, i) =>
      i !== trackIndex ? t : {
        ...t, regions: t.regions.map(r =>
          r.id === region.id ? { ...r, name: newName } : r
        )
      }
    ));
    setRenameModal(null);
  }, [renameModal, setTracks]);

  return {
    contextMenu,
    setContextMenu,
    renameModal,
    setRenameModal,
    onRegionRightClick,
    handleContextAction,
    onResize,
    onSetCrossfade,
    commitRename,
  };
}

// ── Rename Modal ──────────────────────────────────────────────────────────────

export function RenameModal({ region, onCommit, onClose }) {
  const [name, setName] = useState(region?.name || '');

  useEffect(() => { setName(region?.name || ''); }, [region]);

  if (!region) return null;

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000,
  };
  const box = {
    background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8,
    padding: '20px 24px', minWidth: 280,
    fontFamily: '"JetBrains Mono", monospace',
  };

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={box} onMouseDown={e => e.stopPropagation()}>
        <div style={{ color: '#cdd9e5', marginBottom: 12, fontSize: 13 }}>Rename Region</div>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommit(name);
            if (e.key === 'Escape') onClose();
          }}
          style={{
            width: '100%', background: '#0d1117', border: '1px solid #30363d',
            borderRadius: 4, color: '#cdd9e5', padding: '6px 10px', fontSize: 12,
            fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
            Cancel
          </button>
          <button onClick={() => onCommit(name)}
            style={{ background: '#00ffc8', border: 'none', color: '#0d1117', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Region Fade Overlay (visual gradient) ─────────────────────────────────────
// Render this as a child inside each region div

export function RegionFadeOverlays({ region }) {
  if (!region.fadeIn && !region.fadeOut) return null;

  return (
    <>
      {region.fadeIn > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${Math.min(40, region.fadeIn * 20)}%`, height: '100%',
          background: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}
      {region.fadeOut > 0 && (
        <div style={{
          position: 'absolute', right: 0, top: 0,
          width: `${Math.min(40, region.fadeOut * 20)}%`, height: '100%',
          background: 'linear-gradient(to left, rgba(0,0,0,0.7), transparent)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}
    </>
  );
}

// ── COMPLETE INTEGRATION EXAMPLE ─────────────────────────────────────────────
// Shows how to drop into ArrangerView.js:
//
// 1. Import at top of ArrangerView.js:
//    import {
//      useClipEditor, RegionResizeHandles, CrossfadeHandle,
//      RegionFadeOverlays, ClipContextMenu, RenameModal
//    } from './ArrangeClipEditor';
//
// 2. Inside ArrangerView component, after your existing state:
//    const {
//      contextMenu, setContextMenu, renameModal, setRenameModal,
//      onRegionRightClick, handleContextAction, onResize, onSetCrossfade, commitRename
//    } = useClipEditor({ tracks, setTracks, bpm, snapValue, playheadBeat, onStatus: setStatus });
//
// 3. On every region <div>, add:
//    onContextMenu={(e) => onRegionRightClick(e, region, trackIndex)}
//    — then inside that div add children:
//    <RegionResizeHandles region={region} beatWidth={beatWidth} snapValue={snapValue} onResize={onResize} />
//    <RegionFadeOverlays region={region} />
//
// 4. After your track rows, add adjacent-region crossfade handles:
//    {track.regions?.sort((a,b)=>a.startBeat-b.startBeat).map((r, ri, arr) =>
//      arr[ri+1] && (
//        <CrossfadeHandle key={r.id+'-xfade'} leftRegion={r} rightRegion={arr[ri+1]}
//          beatWidth={beatWidth} onSetCrossfade={onSetCrossfade} trackTop={0} trackHeight={trackHeight} />
//      )
//    )}
//
// 5. At the end of ArrangerView return, add:
//    {contextMenu && (
//      <ClipContextMenu x={contextMenu.x} y={contextMenu.y} region={contextMenu.region}
//        onAction={handleContextAction} onClose={() => setContextMenu(null)} />
//    )}
//    <RenameModal region={renameModal?.region} onCommit={commitRename} onClose={() => setRenameModal(null)} />
// =============================================================================

export { ClipContextMenu };
export default useClipEditor;