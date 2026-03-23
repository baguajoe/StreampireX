import React from "react";
import { Monitor, AudioWaveform, ZoomOut, ZoomIn, Plus, VolumeX, Volume2 } from "lucide-react";

const VideoEditorCenterPanel = ({
  sourceMonitorMedia,
  tracks = [],
  currentTime,
  formatTime,
  programMonitorMuted,
  setProgramMonitorMuted,
  setTracks,
  setSelectedClip
}) => {
  return (
    <div className="editor-center-panel">
      <div className="preview-area-container">
        <div className="preview-area">
          <div className="preview-container">
            <div className="monitor-header">SOURCE MONITOR</div>
            <div className="preview-screen">
              <div className="preview-content">
                {sourceMonitorMedia ? (
                  <div>
                    {sourceMonitorMedia.type === "video" && (
                      <video src={sourceMonitorMedia.url} controls style={{ maxWidth: "100%", maxHeight: "100%" }} />
                    )}
                    {sourceMonitorMedia.type === "audio" && (
                      <div className="audio-preview">
                        <AudioWaveform size={48} />
                        <p>{sourceMonitorMedia.name}</p>
                        <audio src={sourceMonitorMedia.url} controls />
                      </div>
                    )}
                    {sourceMonitorMedia.type === "image" && (
                      <img src={sourceMonitorMedia.url} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    )}
                  </div>
                ) : (
                  <div className="preview-placeholder">
                    <Monitor size={48} />
                    <p>Click media to preview</p>
                    <div className="preview-resolution">No clip selected</div>
                  </div>
                )}
              </div>
            </div>
            <div className="preview-controls">
              <button className="preview-control-btn"><ZoomOut size={14} /></button>
              <div className="zoom-display">Fit</div>
              <button className="preview-control-btn"><ZoomIn size={14} /></button>
              <div className="preview-spacer" />

              {sourceMonitorMedia && (
                <button
                  className="add-to-timeline-btn"
                  onClick={() => {
                    const videoTrack = tracks.find((t) => t.type === "video");
                    const audioTrack = tracks.find((t) => t.type === "audio");
                    const targetTrack = sourceMonitorMedia.type === "audio" ? audioTrack : videoTrack;
                    if (!targetTrack || targetTrack.locked) return;

                    let durationSeconds = 30;
                    if (sourceMonitorMedia.duration) {
                      const parts = sourceMonitorMedia.duration.split(":");
                      durationSeconds = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 30;
                    }
                    if (sourceMonitorMedia.type === "image") durationSeconds = 5;

                    const lastClipEnd = targetTrack.clips.reduce(
                      (max, clip) => Math.max(max, clip.startTime + clip.duration),
                      0
                    );

                    const newClip = {
                      id: Date.now(),
                      title: sourceMonitorMedia.name,
                      startTime: lastClipEnd,
                      duration: durationSeconds,
                      type: sourceMonitorMedia.type,
                      mediaUrl: sourceMonitorMedia.url,
                      cloudinary_public_id: sourceMonitorMedia.cloudinary_public_id,
                      thumbnail: sourceMonitorMedia.thumbnail,
                      effects: [],
                      keyframes: [],
                      compositing: {
                        opacity: 100,
                        blendMode: "normal",
                        position: { x: 0, y: 0 },
                        scale: { x: 100, y: 100 },
                        rotation: 0,
                        anchor: { x: 50, y: 50 }
                      }
                    };

                    setTracks?.((prevTracks) =>
                      prevTracks.map((t) =>
                        t.id === targetTrack.id ? { ...t, clips: [...t.clips, newClip] } : t
                      )
                    );

                    setSelectedClip?.(newClip);
                  }}
                >
                  <Plus size={14} />
                  Add to Timeline
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="preview-area">
          <div className="preview-container">
            <div className="monitor-header">
              <span>PROGRAM MONITOR</span>
              <div className="program-monitor-tools">
                <button
                  onClick={() => setProgramMonitorMuted?.(!programMonitorMuted)}
                  className="program-monitor-mute-btn"
                >
                  {programMonitorMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  {programMonitorMuted ? "Muted" : "Sound On"}
                </button>
                <span className="program-monitor-time">{formatTime?.(currentTime)}</span>
              </div>
            </div>
            <div className="preview-screen">
              <div className="preview-content">
                <div className="preview-placeholder">
                  <Monitor size={48} />
                  <p>Program output preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorCenterPanel;
