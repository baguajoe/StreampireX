import React, { useEffect, useRef, useState } from "react";
import * as Interact from "./SPXInteractionLayer.js";

const TIME_MARKS = ["00:00", "00:02", "00:04", "00:06", "00:08", "00:10"];

const clipSizeClass = (length = 0) => {
  if (length <= 2) return "is-short";
  if (length <= 4) return "is-medium";
  if (length <= 6) return "is-long";
  return "is-xl";
};

const TimelineRuler = ({ currentTime, setPlayhead, zoomLevel }) => {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const updateFromEvent = (e) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setPlayhead(pct * 10);
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      updateFromEvent(e);
    };
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  return (
    <div
      ref={rulerRef}
      className="spx-ruler-pro"
      onMouseDown={(e) => {
        setDragging(true);
        updateFromEvent(e);
      }}
    >
      <div className="spx-ruler-readouts">
        <span>Playhead {currentTime.toFixed(2)}s</span>
        <span>Zoom {zoomLevel}%</span>
      </div>

      <div className="spx-ruler-ticks">
        {TIME_MARKS.map((mark) => (
          <span key={mark} className="spx-ruler-tick">{mark}</span>
        ))}
      </div>

      <div
        className="spx-ruler-playhead"
        style={{ left: `${Math.max(0, Math.min(100, (currentTime / 10) * 100))}%` }}
      />
    </div>
  );
};

const SPXEditorTimeline = ({ editor }) => {
  const {
    tracks = [],
    currentTime,
    addTrack,
    removeTrack,
    setPlayhead,
    selectedClipId,
    toggleClipSelection,
    loadClipToSourceMonitor,
    onDropPresetToClip,
    onDropMediaToTrack,
    markers = [],
    addMarkerAtPlayhead,
    zoomLevel,
    setZoomLevel,
    snapModes,
    toggleTrackLock,
    toggleTrackMute,
    toggleTrackSolo,
    trimClipLeft,
    trimClipRight,
    createTransitionBetweenClips,
    updateTransitionDuration,
    applyToolbarAction,
    activeTool,
    splitClipAtPlayhead,
    slipClipBy,
    panTimelineBy
  } = editor;

  const trackListRef = useRef(null);
  const [snapGuide, setSnapGuide] = useState(null);

  useEffect(() => {
    if (!trackListRef.current) return;
    const pct = Math.max(0, Math.min(100, (currentTime / 10) * 100));
    trackListRef.current.style.setProperty("--spx-playhead-pct", `${pct}%`);
  }, [currentTime]);

  const applyTrim = (e, clip, side) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const pxPerSec = 80;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const deltaSeconds = dx / pxPerSec;

      if (clip.type === "transition") {
        updateTransitionDuration(clip.id, deltaSeconds);
        return;
      }

      if (side === "left") trimClipLeft(clip.id, deltaSeconds);
      if (side === "right") trimClipRight(clip.id, deltaSeconds);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setSnapGuide(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleClipClick = (clip) => {
    if (activeTool === "scissors") {
      splitClipAtPlayhead?.(clip.id);
      return;
    }

    if (activeTool === "slip") {
      slipClipBy?.(clip.id, 0.25);
      return;
    }

    if (activeTool === "crop" || activeTool === "mask" || activeTool === "pen") {
      applyToolbarAction(activeTool, { clipId: clip.id });
      return;
    }

    toggleClipSelection(clip.id);
  };

  const handleLaneClick = () => {
    if (activeTool === "zoom") {
      setZoomLevel(Interact.zoomTimelineAroundCursor({ currentZoom: zoomLevel, delta: 20 }));
      return;
    }

    if (activeTool === "hand") {
      panTimelineBy?.(80);
      return;
    }

    if (activeTool === "text" || activeTool === "shape") {
      applyToolbarAction(activeTool);
    }
  };

  return (
    <div className="spx-editor-timeline">
      <div className="spx-editor-panel-header">
        <span>Timeline - Sequence 01</span>

        <div className="spx-timeline-actions">
          <button className="spx-header-btn" onClick={() => addTrack("video")} type="button">+ Video Track</button>
          <button className="spx-header-btn" onClick={() => addTrack("audio")} type="button">+ Audio Track</button>
          <button className="spx-header-btn" onClick={addMarkerAtPlayhead} type="button">+ Marker</button>
          <button
            className="spx-header-btn"
            onClick={() => setZoomLevel(Interact.zoomTimelineAroundCursor({ currentZoom: zoomLevel, delta: -10 }))}
            type="button"
          >
            -
          </button>
          <button
            className="spx-header-btn"
            onClick={() => setZoomLevel(Interact.zoomTimelineAroundCursor({ currentZoom: zoomLevel, delta: 10 }))}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <TimelineRuler
        currentTime={currentTime}
        setPlayhead={setPlayhead}
        zoomLevel={zoomLevel}
      />

      <div ref={trackListRef} className="spx-editor-track-list">
        <div className="spx-timeline-playhead" />

        {snapGuide != null ? (
          <div className="spx-snap-guide" style={{ left: `${snapGuide}%` }} />
        ) : null}

        {tracks.map((track) => {
          const normalClips = (track.clips || []).filter((clip) => clip.type !== "transition");
          const transitions = (track.clips || []).filter((clip) => clip.type === "transition");

          return (
            <div
              key={track.id}
              className={`spx-editor-track-row ${track.type === "audio" ? "is-audio-row" : "is-video-row"}`}
            >
              <div className="spx-editor-track-name">
                <div className="spx-track-badge">{track.name}</div>
                <div className="spx-track-controls">
                  <button className={`spx-track-toggle ${track.muted ? "is-active" : ""}`} type="button" onClick={() => toggleTrackMute(track.id)}>M</button>
                  <button className={`spx-track-toggle ${track.solo ? "is-active" : ""}`} type="button" onClick={() => toggleTrackSolo(track.id)}>S</button>
                  <button className={`spx-track-toggle ${track.locked ? "is-active" : ""}`} type="button" onClick={() => toggleTrackLock(track.id)}>L</button>
                  <button className="spx-track-remove" onClick={() => removeTrack(track.id)} type="button">×</button>
                </div>
              </div>

              <div
                className="spx-editor-track-lane"
                onClick={handleLaneClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  const laneTime = Math.max(0, pct * 10);
                  onDropMediaToTrack(track.id, laneTime);
                  setSnapGuide(pct * 100);
                }}
              >
                <div className="spx-track-grid" />

                <div className="spx-track-clips">
                  {normalClips.map((clip, index) => {
                    const nextClip = normalClips[index + 1];

                    return (
                      <React.Fragment key={clip.id}>
                        <button
                          className={`spx-editor-clip ${track.type === "audio" ? "is-audio" : "is-video"} ${clipSizeClass(clip.length)} ${selectedClipId === clip.id ? "is-selected" : ""}`}
                          onClick={() => handleClipClick(clip)}
                          onDoubleClick={() => loadClipToSourceMonitor(clip.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            onDropPresetToClip(track.id, clip.id);
                          }}
                          type="button"
                          title={clip.name}
                        >
                          <div className="spx-clip-trim-handle left" onMouseDown={(e) => applyTrim(e, clip, "left")} />
                          <div className="spx-editor-clip-name">
                            {clip.name}
                            {clip.linkedGroupId ? <span className="spx-clip-link-badge">🔗</span> : null}
                          </div>

                          {!!(clip.presets || []).length && (
                            <div className="spx-editor-clip-presets">
                              {(clip.presets || []).slice(-2).map((p, i) => (
                                <span key={`${clip.id}-${i}`} className="spx-clip-preset-tag">{p.name}</span>
                              ))}
                            </div>
                          )}

                          {!!(clip.effects || []).length && (
                            <div className="spx-editor-clip-effects">
                              {(clip.effects || []).slice(-2).map((fx, i) => (
                                <span key={`${clip.id}-fx-${i}`} className="spx-clip-effect-tag">{fx.name}</span>
                              ))}
                            </div>
                          )}

                          {track.type === "audio" ? (
                            <div className="spx-audio-waveform">
                              <span /><span /><span /><span /><span /><span />
                              <span /><span /><span /><span /><span /><span />
                            </div>
                          ) : null}

                          <div className="spx-clip-trim-handle right" onMouseDown={(e) => applyTrim(e, clip, "right")} />
                        </button>

                        {nextClip ? (
                          <button
                            type="button"
                            className="spx-transition-dropzone"
                            title="Create Cross Dissolve"
                            onClick={() => createTransitionBetweenClips(track.id, clip.id, nextClip.id, track.type === "audio" ? "constantPower" : "crossDissolve")}
                          >
                            +
                          </button>
                        ) : null}
                      </React.Fragment>
                    );
                  })}

                  {transitions.map((clip) => (
                    <div key={clip.id} className={`spx-transition-chip ${clip.transitionType || ""}`}>
                      <div className="spx-clip-trim-handle left" onMouseDown={(e) => applyTrim(e, clip, "left")} />
                      <span>{clip.name}</span>
                      <div className="spx-clip-trim-handle right" onMouseDown={(e) => applyTrim(e, clip, "right")} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SPXEditorTimeline;
