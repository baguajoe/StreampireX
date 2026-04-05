/**
 * SPXCutTimeline.js
 * Full timeline: ruler, tracks container, scroll sync, zoom, drop.
 * Zero inline CSS. All classes from SPXCut.css.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import SPXCutTrack from './SPXCutTrack';
import { formatTimecode } from './hooks/usePlayback';

const TRACK_HEADER_W = 130;
const RULER_H = 24;

function SPXCutTimeline({ state, actions, selectors, drag, playback }) {
  const timelineRef   = useRef(null);
  const rulerCanvasRef= useRef(null);
  const scrollRef     = useRef(null);
  const [dropOver, setDropOver]     = useState(false);
  const [markers, setMarkers]         = useState([]);
  const [rulerWidth, setRulerWidth] = useState(0);

  // Marker listener
  useEffect(() => {
    const handler = (e) => setMarkers(prev => [...prev, { time: e.detail.time, label: e.detail.label || '' }]);
    window.addEventListener('spxcut:addmarker', handler);
    return () => window.removeEventListener('spxcut:addmarker', handler);
  }, []);

  const pps = state.zoom; // pixels per second

  // ── Compute total timeline width ──────────────────────────
  const totalWidth = Math.max(
    (state.duration + 30) * pps,
    rulerWidth
  );

  // ── Observe ruler width ───────────────────────────────────
  useEffect(() => {
    if (!timelineRef.current) return;
    const ro = new ResizeObserver(entries => {
      setRulerWidth(entries[0].contentRect.width - TRACK_HEADER_W);
    });
    ro.observe(timelineRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Draw ruler canvas ─────────────────────────────────────
  useEffect(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth  || 1;
    const H = canvas.height = canvas.offsetHeight || RULER_H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#111120';
    ctx.fillRect(0, 0, W, H);

    const scrollLeft = state.scrollLeft;

    // Decide tick interval based on zoom
    let majorSec, minorSec;
    if      (pps >= 200) { majorSec = 1;    minorSec = 0.1;   }
    else if (pps >= 80)  { majorSec = 2;    minorSec = 0.5;   }
    else if (pps >= 30)  { majorSec = 5;    minorSec = 1;     }
    else if (pps >= 10)  { majorSec = 10;   minorSec = 2;     }
    else if (pps >= 4)   { majorSec = 30;   minorSec = 5;     }
    else if (pps >= 1.5) { majorSec = 60;   minorSec = 10;    }
    else                 { majorSec = 300;  minorSec = 60;    }

    const startSec = scrollLeft / pps;
    const endSec   = (scrollLeft + W) / pps;

    // Minor ticks
    ctx.strokeStyle = '#2a2a45';
    ctx.lineWidth = 1;
    let t = Math.floor(startSec / minorSec) * minorSec;
    while (t <= endSec) {
      const x = Math.round(t * pps - scrollLeft);
      ctx.beginPath(); ctx.moveTo(x, H - 5); ctx.lineTo(x, H); ctx.stroke();
      t += minorSec;
    }

    // Major ticks + labels
    ctx.strokeStyle = '#363660';
    ctx.fillStyle   = '#9090b0';
    ctx.font        = '9px JetBrains Mono, monospace';
    ctx.textBaseline = 'middle';
    t = Math.floor(startSec / majorSec) * majorSec;
    while (t <= endSec + majorSec) {
      const x = Math.round(t * pps - scrollLeft);
      ctx.strokeStyle = '#363660';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const label = formatTimecode(t);
      ctx.fillStyle = '#9090b0';
      ctx.fillText(label, x + 3, H / 2);
      t += majorSec;
    }

    // Playhead on ruler
    const ph = state.playhead;
    const phX = Math.round(ph * pps - scrollLeft);
    if (phX >= 0 && phX <= W) {
      ctx.fillStyle = '#00ffc8';
      ctx.fillRect(phX - 1, 0, 2, H);
      ctx.beginPath();
      ctx.moveTo(phX - 5, 0);
      ctx.lineTo(phX + 5, 0);
      ctx.lineTo(phX, 7);
      ctx.closePath();
      ctx.fillStyle = '#00ffc8';
      ctx.fill();
    }

    // In/Out region
    if (state.inPoint !== null || state.outPoint !== null) {
      const inX  = state.inPoint  !== null ? state.inPoint  * pps - scrollLeft : 0;
      const outX = state.outPoint !== null ? state.outPoint * pps - scrollLeft : W;
      ctx.fillStyle = 'rgba(0,255,200,0.12)';
      ctx.fillRect(inX, 0, outX - inX, H);
      ctx.fillStyle = '#00ffc8';
      if (state.inPoint  !== null) ctx.fillRect(inX  - 1, 0, 2, H);
      if (state.outPoint !== null) ctx.fillRect(outX - 1, 0, 2, H);
    }
  }, [state.playhead, state.scrollLeft, state.inPoint, state.outPoint, pps, rulerWidth]);

  // ── Sync scroll ───────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = state.scrollLeft;
    }
  }, [state.scrollLeft]);

  const onScroll = useCallback((e) => {
    actions.setScrollLeft(e.currentTarget.scrollLeft);
  }, [actions]);

  // ── Ruler mouse: scrub ────────────────────────────────────
  const onRulerMouseDown = useCallback((e) => {
    drag.startRulerScrub(e, timelineRef, TRACK_HEADER_W);
  }, [drag]);

  // ── Mouse wheel zoom ──────────────────────────────────────
  const onWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      actions.setZoom(state.zoom * factor);
    }
  }, [actions, state.zoom]);

  // ── Drag over (media from bin) ────────────────────────────
  const onDragOver = useCallback((e) => { e.preventDefault(); setDropOver(true); }, []);
  const onDragLeave = useCallback(() => setDropOver(false), []);
  const onDrop = useCallback((e) => {
    setDropOver(false);
    // Get the track from the drop target
    const trackId = parseInt(e.currentTarget.dataset.trackId, 10);
    drag.handleTimelineDrop(e, trackId, state.scrollLeft, TRACK_HEADER_W);
  }, [drag, state.scrollLeft]);

  // ── Add Track buttons ─────────────────────────────────────
  const addVideoTrack = useCallback(() => actions.addTrack('video'), [actions]);
  const addAudioTrack = useCallback(() => actions.addTrack('audio'), [actions]);

  return (
    <div
      className="spxcut-timeline"
      ref={timelineRef}
      onWheel={onWheel}
    >
      {/* Ruler row */}
      <div className="spxcut-timeline-top">
        <div className="spxcut-track-header-spacer">
          <button className="spxcut-add-track-btn" onClick={addVideoTrack} title="Add Video Track">+V</button>
          <button className="spxcut-add-track-btn" onClick={addAudioTrack} title="Add Audio Track">+A</button>
        </div>
        <div
          className="spxcut-ruler"
          onMouseDown={onRulerMouseDown}
          style={{ width: totalWidth }}
        >
          <canvas className="spxcut-ruler-canvas" ref={rulerCanvasRef} />
          {markers.map((m, i) => (
            <div
              key={i}
              className="spxcut-marker"
              style={{ left: m.time * pps - state.scrollLeft, bottom: 0, top: 0 }}
              onClick={() => actions.setPlayhead(m.time)}
              title={m.label || formatTimecode(m.time)}
            >
              <div className="spxcut-marker-head" />
              {m.label && <span className="spxcut-marker-label">{m.label}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Tracks scroll area */}
      <div
        className="spxcut-tracks-scroll"
        ref={scrollRef}
        onScroll={onScroll}
      >
        <div
          className="spxcut-tracks-inner"
          style={{ width: totalWidth + TRACK_HEADER_W }}
        >
          {state.tracks.map(track => (
            <SPXCutTrack
              key={track.id}
              track={track}
              state={state}
              actions={actions}
              selectors={selectors}
              drag={drag}
              pps={pps}
              trackHeaderWidth={TRACK_HEADER_W}
              totalWidth={totalWidth}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
          {/* Empty drop zone if no tracks */}
          {state.tracks.length === 0 && (
            <div className="spxcut-media-drop-zone" style={{ margin: 16 }}>
              Drop media here or add tracks
            </div>
          )}
        </div>

        {/* Playhead overlay line */}
        <div
          className="spxcut-playhead-line"
          style={{ left: TRACK_HEADER_W + state.playhead * pps - state.scrollLeft }}
        />
      </div>
    </div>
  );
}

export default SPXCutTimeline;
