/**
 * SPXCutTrack.js
 * Single track row: header with controls + clips area.
 * Zero inline CSS.
 */
import React, { useCallback, useState } from 'react';
import SPXCutClip from './SPXCutClip';

function SPXCutTrack({
  track, state, actions, selectors, drag,
  pps, trackHeaderWidth, totalWidth,
  onDragOver, onDragLeave, onDrop,
}) {
  const [isEditingName, setIsEditingName] = useState(false);

  // ── Track header controls ────────────────────────────────
  const toggleMute   = useCallback(() => actions.updateTrack(track.id, { muted:  !track.muted }),  [actions, track.id, track.muted]);
  const toggleSolo   = useCallback(() => actions.updateTrack(track.id, { solo:   !track.solo }),   [actions, track.id, track.solo]);
  const toggleLock   = useCallback(() => actions.updateTrack(track.id, { locked: !track.locked }), [actions, track.id, track.locked]);
  const removeTrack  = useCallback(() => actions.removeTrack(track.id), [actions, track.id]);
  const onNameChange = useCallback((e) => actions.updateTrack(track.id, { name: e.target.value }), [actions, track.id]);

  // ── Click on clips area (select / blade / etc.) ──────────
  const onClipsAreaClick = useCallback((e) => {
    if (state.activeTool === 'blade') {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left + state.scrollLeft;
      const splitTime = Math.max(0, relX / pps);
      actions.splitClip(splitTime);
      return;
    }
    if (state.activeTool === 'select') {
      actions.clearSelection();
    }
  }, [state.activeTool, state.scrollLeft, pps, actions]);

  // ── Drop on this specific track ───────────────────────────
  const handleDrop = useCallback((e) => {
    e.currentTarget.dataset.trackId = track.id;
    onDrop(e);
  }, [onDrop, track.id]);

  const cursorClass = {
    select: 'cursor-select',
    blade:  'cursor-blade',
    hand:   'cursor-hand',
    zoom:   'cursor-zoom',
  }[state.activeTool] || 'cursor-select';

  return (
    <div
      className={`spxcut-track-row${state.selectedTrackId === track.id ? ' track-selected' : ''}`}
      onClick={() => actions.selectTrack(track.id)}
    >
      {/* Track Header */}
      <div className="spxcut-track-header" style={{ width: trackHeaderWidth, minWidth: trackHeaderWidth }}>
        <div className="spxcut-track-color-bar" style={{ background: track.color }} />
        <div className="spxcut-track-info">
          <input
            className="spxcut-track-name-input"
            value={track.name}
            onChange={onNameChange}
            onFocus={() => setIsEditingName(true)}
            onBlur={() => setIsEditingName(false)}
            onClick={e => e.stopPropagation()}
          />
          <div className="spxcut-track-type-label">{track.type}</div>
        </div>
        <div className="spxcut-track-controls">
          <button
            className={`spxcut-track-ctrl-btn${track.muted ? ' ctrl-muted' : ''}`}
            onClick={e => { e.stopPropagation(); toggleMute(); }}
            title={track.muted ? 'Unmute' : 'Mute'}
          >M</button>
          <button
            className={`spxcut-track-ctrl-btn${track.solo ? ' ctrl-solo' : ''}`}
            onClick={e => { e.stopPropagation(); toggleSolo(); }}
            title={track.solo ? 'Unsolo' : 'Solo'}
          >S</button>
          <button
            className={`spxcut-track-ctrl-btn${track.locked ? ' ctrl-locked' : ''}`}
            onClick={e => { e.stopPropagation(); toggleLock(); }}
            title={track.locked ? 'Unlock' : 'Lock'}
          >🔒</button>
          <button
            className="spxcut-track-ctrl-btn"
            onClick={e => { e.stopPropagation(); removeTrack(); }}
            title="Remove Track"
          >✕</button>
        </div>
      </div>

      {/* Clips Area */}
      <div
        className={`spxcut-track-clips ${cursorClass}`}
        style={{ width: totalWidth }}
        onClick={onClipsAreaClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        data-track-id={track.id}
      >
        {track.clips.map(clip => (
          <SPXCutClip
            key={clip.id}
            clip={clip}
            track={track}
            state={state}
            actions={actions}
            selectors={selectors}
            drag={drag}
            pps={pps}
          />
        ))}

        {/* Transitions */}
        {track.transitions && track.transitions.map((tr, i) => (
          <div
            key={i}
            className="spxcut-transition-badge"
            style={{ left: tr.position * pps }}
          >
            {tr.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SPXCutTrack;
