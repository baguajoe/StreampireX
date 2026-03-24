import React, { useState } from "react";

const SPXExportPanel = ({ editor, onClose }) => {
  const [filename, setFilename] = useState("export.mp4");
  const [format, setFormat] = useState("H.264");
  const [preset, setPreset] = useState("Match Source - Adaptive High Bitrate");
  const [includeVideo, setIncludeVideo] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [resolution, setResolution] = useState("1080x1920");
  const [fps, setFps] = useState("29.97");
  const [bitrate, setBitrate] = useState("10");
  const [range, setRange] = useState("Entire Source");

  const handleExportNow = () => {
    editor.handleExport?.({
      filename,
      format,
      preset,
      includeVideo,
      includeAudio,
      resolution,
      fps,
      bitrate,
      range
    });
    onClose?.();
  };

  return (
    <div className="spx-export-overlay">
      <div className="spx-export-modal">
        <div className="spx-export-header">
          <span>Export Settings</span>
          <button className="spx-header-btn" type="button" onClick={onClose}>✕</button>
        </div>

        <div className="spx-export-grid">
          <div className="spx-export-section">
            <label>File Name</label>
            <input className="spx-input" value={filename} onChange={(e) => setFilename(e.target.value)} />

            <label>Format</label>
            <select className="spx-input" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>H.264</option>
              <option>HEVC</option>
              <option>QuickTime</option>
              <option>WAV</option>
              <option>MP3</option>
            </select>

            <label>Preset</label>
            <select className="spx-input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option>Match Source - Adaptive High Bitrate</option>
              <option>YouTube 1080p</option>
              <option>TikTok Vertical 1080x1920</option>
              <option>Instagram Reels</option>
              <option>Audio Only High Quality</option>
            </select>

            <label>Range</label>
            <select className="spx-input" value={range} onChange={(e) => setRange(e.target.value)}>
              <option>Entire Source</option>
              <option>In to Out</option>
              <option>Work Area</option>
            </select>
          </div>

          <div className="spx-export-section">
            <label>Resolution</label>
            <select className="spx-input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
              <option>1080x1920</option>
              <option>1920x1080</option>
              <option>3840x2160</option>
              <option>1280x720</option>
            </select>

            <label>Frame Rate</label>
            <select className="spx-input" value={fps} onChange={(e) => setFps(e.target.value)}>
              <option>23.976</option>
              <option>24</option>
              <option>29.97</option>
              <option>30</option>
              <option>60</option>
            </select>

            <label>Target Bitrate (Mbps)</label>
            <input className="spx-input" value={bitrate} onChange={(e) => setBitrate(e.target.value)} />

            <div className="spx-export-toggles">
              <label><input type="checkbox" checked={includeVideo} onChange={(e) => setIncludeVideo(e.target.checked)} /> Video</label>
              <label><input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} /> Audio</label>
            </div>
          </div>

          <div className="spx-export-preview">
            <div className="spx-panel-title">Preview Summary</div>
            <div className="spx-selection-hint">Format: {format}</div>
            <div className="spx-selection-hint">Preset: {preset}</div>
            <div className="spx-selection-hint">Resolution: {resolution}</div>
            <div className="spx-selection-hint">FPS: {fps}</div>
            <div className="spx-selection-hint">Bitrate: {bitrate} Mbps</div>
            <div className="spx-selection-hint">Range: {range}</div>
          </div>
        </div>

        <div className="spx-export-actions">
          <button className="spx-header-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="spx-header-btn spx-header-btn-accent" type="button" onClick={handleExportNow}>Export</button>
        </div>
      </div>
    </div>
  );
};

export default SPXExportPanel;
