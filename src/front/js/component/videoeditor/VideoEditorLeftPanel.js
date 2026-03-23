import React from "react";
import { Loader, Upload, ChevronUp, ChevronDown, Plus, Video, Image, AudioWaveform, Layers, Wand2 } from "lucide-react";

const VideoEditorLeftPanel = ({
  fileInputRef,
  uploading,
  mediaLibrary = [],
  handleFileImport,
  tools = [],
  selectedTool,
  setSelectedTool,
  setShowCompositingPanel,
  showCompositingPanel,
  setShowEffectsPanel,
  showEffectsPanel,
  showVideoEffects,
  setShowVideoEffects,
  showFadeEffects,
  setShowFadeEffects,
  getEffectsByCategory,
  videoEffects = [],
  selectedClip,
  handleEffectDragStart,
  handleEffectDragEnd,
  applyEffect,
  showColorCorrection,
  setShowColorCorrection,
  showCompositing,
  setShowCompositing,
  showDistortion,
  setShowDistortion,
  showKeying,
  setShowKeying,
  showMotionGraphics,
  setShowMotionGraphics,
  showGenerator,
  setShowGenerator,
  showAudioEffects,
  setShowAudioEffects,
  audioEffects = [],
  previewEffect,
  showTransitions,
  setShowTransitions,
  transitions = [],
  selectedTransitionType,
  setSelectedTransitionType,
  handleTransitionDragStart,
  tracks = [],
  setTracks,
  setSelectedClip,
  setSourceMonitorMedia
}) => {
  return (
    <div className="editor-left-panel">
      <div className="import-sticky-block">
        <button
          className="import-btn"
          onClick={() => fileInputRef?.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader size={18} className="spin" /> : <Upload size={18} />}
          {uploading ? "Uploading..." : "📁 Import Media"}
        </button>

        {mediaLibrary.length > 0 && (
          <div className="media-count-indicator">
            {mediaLibrary.length} file{mediaLibrary.length !== 1 ? "s" : ""} imported
            {mediaLibrary.some((m) => m.uploading) && " • Uploading..."}
          </div>
        )}
      </div>

      <div className="editor-toolbar">
        <div className="toolbar-section">
          <h4>Tools</h4>
          <div className="tool-grid">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  className={`tool-btn ${selectedTool === tool.id ? "active" : ""}`}
                  onClick={() => setSelectedTool?.(tool.id)}
                  title={tool.name}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="toolbar-section">
          <h4>Workspaces</h4>
          <div className="workspace-quick-access">
            <button className="workspace-access-btn" onClick={() => setShowCompositingPanel?.(!showCompositingPanel)}>
              <Layers size={14} />
              Transform
            </button>
            <button className="workspace-access-btn" onClick={() => setShowEffectsPanel?.(!showEffectsPanel)}>
              <Wand2 size={14} />
              Effects
            </button>
          </div>
        </div>

        <div className="toolbar-section">
          <h4>Media</h4>
          <button className="import-btn" onClick={() => fileInputRef?.current?.click()} disabled={uploading}>
            {uploading ? <Loader size={16} className="spin" /> : <Upload size={16} />}
            {uploading ? "Uploading..." : "📁 Import Media"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden-file-input"
            accept="video/*,audio/*,image/*"
            multiple
            onChange={handleFileImport}
          />

          <div className="media-list">
            {mediaLibrary.map((media) => {
              const Icon = media.type === "video" ? Video : media.type === "audio" ? AudioWaveform : Image;
              return (
                <div
                  key={media.id}
                  className={`media-item ${media.uploading ? "uploading" : ""} ${media.uploadFailed ? "failed" : ""}`}
                  draggable={!media.uploading}
                  onClick={() => !media.uploading && setSourceMonitorMedia?.(media)}
                >
                  {media.uploading ? <Loader size={14} className="spin" /> : <Icon size={14} />}
                  <div className="media-item-meta">
                    <div className="media-item-name">{media.name}</div>
                    <div className="media-item-sub">{media.uploading ? "Uploading..." : media.duration}</div>
                  </div>

                  {!media.uploading && !media.uploadFailed && (
                    <button
                      className="quick-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const videoTrack = tracks.find((t) => t.type === "video");
                        const audioTrack = tracks.find((t) => t.type === "audio");
                        const targetTrack = media.type === "audio" ? audioTrack : videoTrack;
                        if (!targetTrack || targetTrack.locked) return;

                        let durationSeconds = 30;
                        if (media.duration) {
                          const parts = media.duration.split(":");
                          durationSeconds = parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 30;
                        }
                        if (media.type === "image") durationSeconds = 5;

                        const lastClipEnd = targetTrack.clips.reduce(
                          (max, clip) => Math.max(max, clip.startTime + clip.duration),
                          0
                        );

                        const newClip = {
                          id: Date.now(),
                          title: media.name,
                          startTime: lastClipEnd,
                          duration: durationSeconds,
                          type: media.type,
                          mediaUrl: media.url,
                          cloudinary_public_id: media.cloudinary_public_id,
                          thumbnail: media.thumbnail,
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
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorLeftPanel;
