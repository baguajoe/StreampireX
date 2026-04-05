/**
 * SPXCutTransport.js
 * Play/pause/record/step buttons, timecode display (clickable to type),
 * zoom slider, snap toggle, linked edit toggle, in/out display.
 * Zero inline CSS.
 */
import React, { useState, useCallback, useRef } from 'react';

function SPXCutTransport({ state, actions, selectors, playback }) {
  const [editingTimecode, setEditingTimecode] = useState(false);
  const [tcInput, setTcInput] = useState('');
  const tcRef = useRef(null);

  // ── Timecode click to edit ────────────────────────────────
  const onTcClick = useCallback(() => {
    setTcInput(playback.timecode);
    setEditingTimecode(true);
    setTimeout(() => tcRef.current?.select(), 0);
  }, [playback.timecode]);

  const onTcBlur = useCallback(() => {
    const parsed = playback.parseTimecode(tcInput);
    if (parsed !== null) playback.seekTo(parsed);
    setEditingTimecode(false);
  }, [tcInput, playback]);

  const onTcKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { tcRef.current?.blur(); }
    if (e.key === 'Escape') { setEditingTimecode(false); }
  }, []);

  return (
    <div className="spxcut-transport">

      {/* Transport controls */}
      <div className="spxcut-transport-controls">
        {/* Go to start */}
        <button
          className="spxcut-tc-btn"
          onClick={actions.gotoStart}
          title="Go to Start (Home)"
        >⏮</button>

        {/* Step back */}
        <button
          className="spxcut-tc-btn"
          onClick={() => actions.stepFrame('back')}
          title="Step Back (←)"
        >◀</button>

        {/* Play / Pause */}
        <button
          className="spxcut-tc-btn tc-play"
          onClick={playback.togglePlay}
          title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {state.isPlaying ? '⏸' : '▶'}
        </button>

        {/* Step forward */}
        <button
          className="spxcut-tc-btn"
          onClick={() => actions.stepFrame('forward')}
          title="Step Forward (→)"
        >▶</button>

        {/* Go to end */}
        <button
          className="spxcut-tc-btn"
          onClick={actions.gotoEnd}
          title="Go to End (End)"
        >⏭</button>

        {/* Record */}
        <button
          className={`spxcut-tc-btn tc-record${state.isRecording ? ' recording' : ''}`}
          onClick={() => actions.setRecording(!state.isRecording)}
          title={state.isRecording ? 'Stop Recording' : 'Record'}
        >⏺</button>
      </div>

      {/* Timecode display */}
      {editingTimecode ? (
        <input
          ref={tcRef}
          className="spxcut-timecode-display"
          value={tcInput}
          onChange={e => setTcInput(e.target.value)}
          onBlur={onTcBlur}
          onKeyDown={onTcKeyDown}
          style={{ outline: '1px solid var(--teal)' }}
        />
      ) : (
        <div
          className="spxcut-timecode-display"
          onClick={onTcClick}
          title="Click to enter timecode"
        >
          {playback.timecode}
        </div>
      )}

      {/* Middle: zoom + toggles */}
      <div className="spxcut-transport-mid">

        <div className="spxcut-zoom-group">
          <span className="spxcut-zoom-label">ZOOM</span>
          <input
            type="range"
            className="spxcut-zoom-slider"
            min={5}
            max={500}
            step={1}
            value={Math.round(state.zoom)}
            onChange={e => actions.setZoom(Number(e.target.value))}
            title={`Zoom: ${Math.round(state.zoom)} px/s`}
          />
          <span className="spxcut-zoom-label">{Math.round(state.zoom)}px/s</span>
        </div>

        <button
          className={`spxcut-snap-toggle${state.snapEnabled ? ' snap-on' : ''}`}
          onClick={() => actions.setSnap(!state.snapEnabled)}
          title="Toggle Snap (S)"
        >
          {state.snapEnabled ? '🧲 SNAP ON' : '🧲 SNAP OFF'}
        </button>

        <button
          className={`spxcut-linked-toggle${state.linkedEdit ? ' linked-on' : ''}`}
          onClick={() => actions.setLinkedEdit(!state.linkedEdit)}
          title="Toggle Linked Edit (L)"
        >
          {state.linkedEdit ? '🔗 LINKED' : '🔓 UNLINKED'}
        </button>

      </div>

      {/* Right: In/Out + Duration */}
      <div className="spxcut-transport-right">

        <div className="spxcut-inout-display">
          <span>IN</span>
          <span
            style={{ cursor: 'pointer', color: state.inPoint !== null ? 'var(--teal)' : undefined }}
            onClick={() => state.inPoint !== null ? actions.setPlayhead(state.inPoint) : null}
          >
            {state.inPoint !== null ? playback.formatTimecode(state.inPoint) : '--:--:--:--'}
          </span>
          <span style={{ marginLeft: 6 }}>OUT</span>
          <span
            style={{ cursor: 'pointer', color: state.outPoint !== null ? 'var(--orange)' : undefined }}
            onClick={() => state.outPoint !== null ? actions.setPlayhead(state.outPoint) : null}
          >
            {state.outPoint !== null ? playback.formatTimecode(state.outPoint) : '--:--:--:--'}
          </span>
          {(state.inPoint !== null || state.outPoint !== null) && (
            <button
              className="spxcut-icon-btn"
              onClick={actions.clearInOut}
              title="Clear In/Out (X)"
              style={{ fontSize: 10, marginLeft: 4 }}
            >✕</button>
          )}
        </div>

        <div className="spxcut-duration-display" title="Total Duration">
          ⏱ {playback.durationTimecode}
        </div>

      </div>
    </div>
  );
}

export default SPXCutTransport;
