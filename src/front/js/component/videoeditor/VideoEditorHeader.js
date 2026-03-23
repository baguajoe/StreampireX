import React from "react";
import {
  Folder, Monitor, Square, Rewind, SkipBack, Play, Pause, SkipForward,
  FastForward, Activity, Tv, Aperture, Palette, Volume2, Save, Download
} from "lucide-react";
import VideoEditorUnifiedToolbar from "./VideoEditorUnifiedToolbar";
import VideoEditorInspectorTabs from "./VideoEditorInspectorTabs";

const VideoEditorHeader = ({
  project,
  getTierIcon,
  userTier,
  setShowMediaBin,
  showMediaBin,
  setShowMediaBrowser,
  sourceMonitorMedia,
  setShowSourceMonitor,
  showSourceMonitor,
  activeTool,
  setActiveTool,
  showNodeEditor,
  setShowNodeEditor,
  handleSaveProject,
  handleExport,
  stop,
  currentTime,
  setCurrentTime,
  frameRate,
  duration,
  playPause,
  isPlaying,
  formatTime,
  setFrameRate,
  activeInspectorTab,
  setActiveInspectorTab,
  setShowScopes,
  showScopes,
  setShowMulticam,
  showMulticam,
  setShowChromaKey,
  showChromaKey,
  setShowColorGrading,
  showColorGrading,
  setShowAudioMixing,
  showAudioMixing
}) => {
  return (
    <div className="editor-menu-bar">
      <div className="editor-left-zone">
        <div className="project-block">
          <h2>{project?.title || "Untitled Project"}</h2>
          <div className="tier-badge-inline">
            {getTierIcon?.()}
            {userTier}
          </div>
        </div>

        <div className="workspace-buttons">
          <button
            onClick={() => setShowMediaBin?.((v) => !v)}
            title="Project Media"
            className={`header-btn ${showMediaBin ? "active" : ""}`}
          >
            <Folder size={11} />
            Project
          </button>

          <button
            onClick={() => setShowMediaBrowser?.(true)}
            title="Media Browser"
            className="header-btn"
          >
            <Folder size={11} />
            Browser
          </button>

          <button
            onClick={() => {
              if (sourceMonitorMedia) setShowSourceMonitor?.(true);
            }}
            title="Source Monitor"
            className={`header-btn ${showSourceMonitor ? "active" : ""}`}
          >
            <Monitor size={11} />
            Source
          </button>
        </div>
      </div>

      <div className="editor-center-zone">
        <VideoEditorUnifiedToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          showNodeEditor={showNodeEditor}
          setShowNodeEditor={setShowNodeEditor}
          onSave={handleSaveProject}
          onExport={handleExport}
        />

        <div className="playback-controls">
          <button type="button" onClick={stop} title="Stop" className="transport-btn">
            <Square size={11} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTime?.(Math.max(0, currentTime - 5))}
            title="Back 5s"
            className="transport-btn"
          >
            <Rewind size={11} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTime?.(Math.max(0, currentTime - 1 / frameRate))}
            title="Previous Frame"
            className="transport-btn"
          >
            <SkipBack size={11} />
          </button>

          <button
            type="button"
            onClick={playPause}
            title={isPlaying ? "Pause" : "Play"}
            className="transport-btn transport-btn-play"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setCurrentTime?.(Math.min(duration, currentTime + 1 / frameRate))}
            title="Next Frame"
            className="transport-btn"
          >
            <SkipForward size={11} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTime?.(Math.min(duration, currentTime + 5))}
            title="Forward 5s"
            className="transport-btn"
          >
            <FastForward size={11} />
          </button>
        </div>

        <div className="timecode-display">
          {formatTime?.(currentTime)} / {formatTime?.(duration)}
        </div>

        <div className="frame-rate-block">
          <select
            value={frameRate}
            onChange={(e) => setFrameRate?.(parseInt(e.target.value))}
            title="Project Frame Rate"
            className="header-select"
          >
            <option value={24}>24 fps</option>
            <option value={25}>25 fps</option>
            <option value={30}>30 fps</option>
            <option value={48}>48 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>
      </div>

      <div className="editor-right-zone">
        <VideoEditorInspectorTabs
          activeTab={activeInspectorTab}
          setActiveTab={setActiveInspectorTab}
        />

        <div className="header-action-buttons">
          <button onClick={() => setShowScopes?.(!showScopes)} className={`header-btn ${showScopes ? "active" : ""}`}>
            <Activity size={11} />
            Scopes
          </button>

          <button onClick={() => setShowMulticam?.(!showMulticam)} className={`header-btn ${showMulticam ? "active" : ""}`}>
            <Tv size={11} />
            Multicam
          </button>

          <button onClick={() => setShowChromaKey?.(!showChromaKey)} className={`header-btn ${showChromaKey ? "active" : ""}`}>
            <Aperture size={11} />
            Chroma
          </button>

          <button onClick={() => setShowColorGrading?.(!showColorGrading)} className={`header-btn ${showColorGrading ? "active" : ""}`}>
            <Palette size={11} />
            Color
          </button>

          <button onClick={() => setShowAudioMixing?.(!showAudioMixing)} className={`header-btn ${showAudioMixing ? "active" : ""}`}>
            <Volume2 size={11} />
            Audio
          </button>

          <button onClick={handleSaveProject} className="header-btn">
            <Save size={11} />
            Save
          </button>

          <button onClick={handleExport} className="header-btn header-btn-accent">
            <Download size={11} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoEditorHeader;
