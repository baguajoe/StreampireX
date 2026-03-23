import React from "react";
import * as Interact from "./SPXInteractionLayer.js";

const TIME_MARKS = ["00:00", "00:02", "00:04", "00:06", "00:08", "00:10"];

const SPXEditorTimeline = ({ editor }) => {
  const {
    tracks = [],
    currentTime,
    addTrack,
    removeTrack,
    setPlayhead,
    selectedClipId,
    toggleClipSelection,
    onDropPresetToClip,
    markers = [],
    addMarkerAtPlayhead,
    zoomLevel,
    setZoomLevel,
    snapModes
  } = editor;

  const playheadLeft = `${(currentTime / 10) * 100}%`;

  return (
    <div className="spx-editor-timeline">
      <div className="spx-editor-panel-header">
        <span>Timeline - Sequence 01</span>

        <div className="spx-timeline-actions">
          <button className="spx-header-btn" onClick={() => addTrack("video")}>+ Video Track</button>
          <button className="spx-header-btn" onClick={() => addTrack("audio")}>+ Audio Track</button>
          <button className="spx-header-btn" onClick={addMarkerAtPlayhead}>+ Marker</button>
          <button className="spx-header-btn" onClick={() => setZoomLevel(Interact.zoomTimelineAroundCursor({ currentZoom: zoomLevel, delta: -10 }))}>-</button>
          <button className="spx-header-btn" onClick={() => setZoomLevel(Interact.zoomTimelineAroundCursor({ currentZoom: zoomLevel, delta: 10 }))}>+</button>
        </div>
      </div>

      <div
        className="spx-editor-ruler"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const rawTime = pct * 10;
          const snapTime = snapModes?.markers
            ? Interact.getSnapTime({ rawTime, markers, clipEdges: [], threshold: 0.12 })
            : rawTime;
          setPlayhead(snapTime);
        }}
      >
        {TIME_MARKS.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>

      <div className="spx-editor-track-list timeline-with-playhead">
        <div className="spx-playhead-line" style={{ left: playheadLeft }} />

        {markers.map((marker) => (
          <div
            key={marker.id}
            className="spx-marker-line"
            style={{ left: `${(marker.time / 10) * 100}%` }}
            title={marker.label}
          />
        ))}

        {tracks.map((track) => (
          <div
            key={track.id}
            className={`spx-editor-track-row ${track.type === "audio" ? "is-audio-row" : "is-video-row"}`}
          >
            <div className="spx-editor-track-name">
              <div className="spx-track-badge">{track.name}</div>
              <div className="spx-track-controls">
                <span>M</span>
                <span>S</span>
                <span>L</span>
                <button className="spx-track-remove" onClick={() => removeTrack(track.id)}>×</button>
              </div>
            </div>

            <div className="spx-editor-track-lane">
              {(track.clips || []).map((clip) => (
                <div
                  key={clip.id}
                  className={`spx-editor-clip ${track.type === "audio" ? "is-audio" : "is-video"} ${selectedClipId === clip.id ? "is-selected" : ""}`}
                  style={{
                    marginLeft: `${clip.start * (0.76 * zoomLevel)}px`,
                    width: `${clip.length * (1.1 * zoomLevel)}px`
                  }}
                  onClick={() => toggleClipSelection(clip.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDropPresetToClip(track.id, clip.id)}
                >
                  <div className="spx-editor-clip-name">{clip.name}</div>
                  {!!(clip.presets || []).length && (
                    <div className="spx-editor-clip-presets">
                      {(clip.presets || []).slice(-2).map((p, i) => (
                        <span key={`${clip.id}-${i}`} className="spx-clip-preset-tag">{p.name}</span>
                      ))}
                    </div>
                  )}
                  {!!clip.blendMode && clip.blendMode !== "normal" && (
                    <div className="spx-clip-preset-tag">{clip.blendMode}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SPXEditorTimeline;
