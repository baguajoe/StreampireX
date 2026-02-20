// src/front/js/pages/AIStemSeparation.js
// =====================================================
// AI STEM SEPARATION — StreamPireX
// =====================================================
// Separates audio into Vocals, Drums, Bass, and Other
// using Meta's Demucs (pre-trained models)
//
// Features:
//   - Upload new track or select existing
//   - Choose from 4 Demucs models (quality vs speed)
//   - Individual stem playback with volume controls
//   - Download individual stems or all as ZIP
//   - Separation history
//
// Backend: src/api/ai_stem_separation.py
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import "../../styles/AIStemSeparation.css";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://streampirex-api.up.railway.app";

const AIStemSeparation = () => {
  // =====================================================
  // STATE
  // =====================================================

  // Capabilities
  const [capabilities, setCapabilities] = useState(null);
  const [loadingCaps, setLoadingCaps] = useState(true);

  // Upload / Input
  const [activeTab, setActiveTab] = useState("upload"); // upload | library | history
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("htdemucs");

  // Processing
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Results
  const [result, setResult] = useState(null);
  const [stemVolumes, setStemVolumes] = useState({
    vocals: 1,
    drums: 1,
    bass: 1,
    guitar: 1,
    piano: 1,
    other: 1,
  });
  const [stemMuted, setStemMuted] = useState({
    vocals: false,
    drums: false,
    bass: false,
    guitar: false,
    piano: false,
    other: false,
  });
  const [stemSolo, setStemSolo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Library tracks
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // UI
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Refs
  const fileInputRef = useRef(null);
  const audioRefs = useRef({
    vocals: null,
    drums: null,
    bass: null,
    guitar: null,
    piano: null,
    other: null,
  });
  const progressInterval = useRef(null);

  const token = localStorage.getItem("token");

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/stems/capabilities");
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data);
      }
    } catch (err) {
      console.error("Failed to fetch capabilities:", err);
    } finally {
      setLoadingCaps(false);
    }
  }, []);

  const fetchLibraryTracks = useCallback(async () => {
    setLoadingTracks(true);
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/tracks", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryTracks(data.tracks || []);
      }
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
    } finally {
      setLoadingTracks(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/stems/history", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCapabilities();
    fetchLibraryTracks();
    fetchHistory();
  }, [fetchCapabilities, fetchLibraryTracks, fetchHistory]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // =====================================================
  // PROGRESS SIMULATION
  // =====================================================

  const startProgress = () => {
    setProgress(0);
    let p = 0;
    progressInterval.current = setInterval(() => {
      p += Math.random() * 3;
      if (p > 90) p = 90;
      setProgress(Math.round(p));
    }, 1000);
  };

  const stopProgress = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setProgress(100);
  };

  // =====================================================
  // FILE HANDLING
  // =====================================================

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    const allowed = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"];
    if (!allowed.includes(ext)) {
      setError("Please upload an MP3, WAV, FLAC, OGG, M4A, or AAC file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100MB.");
      return;
    }

    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    setError("");
    setResult(null);
  };

  // =====================================================
  // STEM SEPARATION
  // =====================================================

  const handleSeparate = async () => {
    setError("");
    setSuccess("");
    setResult(null);
    setProcessing(true);
    setStatusMessage("Preparing audio for separation...");
    startProgress();

    try {
      const fd = new FormData();
      fd.append("model", selectedModel);

      if (activeTab === "upload" && uploadFile) {
        fd.append("file", uploadFile);
        fd.append("title", uploadTitle || "Untitled");
        setStatusMessage("Uploading and separating stems... This may take a few minutes.");
      } else if (activeTab === "library" && selectedTrackId) {
        fd.append("audio_id", selectedTrackId);
        setStatusMessage("Separating stems from your track... This may take a few minutes.");
      } else {
        setError("Select a track or upload a file first");
        setProcessing(false);
        stopProgress();
        return;
      }

      const endpoint =
        activeTab === "upload"
          ? "/api/ai/stems/separate-upload"
          : "/api/ai/stems/separate";

      const res = await fetch(BACKEND_URL + endpoint, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
      });

      const data = await res.json();
      stopProgress();

      if (!res.ok) {
        throw new Error(data.error || "Separation failed");
      }

      setResult(data);
      setSuccess(data.message || "Stems separated successfully!");
      setStatusMessage("");
      fetchHistory();

      // Reset upload
      if (activeTab === "upload") {
        setUploadFile(null);
        setUploadTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      stopProgress();
      setStatusMessage("");
      setError(err.message || "Failed to separate stems");
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // AUDIO PLAYBACK (Multi-stem synchronized)
  // =====================================================

  const stopAllAudio = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setIsPlaying(false);
  };

  const handlePlayAll = () => {
    if (!result?.stems) return;

    if (isPlaying) {
      stopAllAudio();
      return;
    }

    // Play all stems simultaneously
    const stemKeys = Object.keys(result.stems);
    stemKeys.forEach((key) => {
      const audio = audioRefs.current[key];
      if (audio) {
        // Apply volume and mute
        const isMuted =
          stemMuted[key] || (stemSolo !== null && stemSolo !== key);
        audio.volume = isMuted ? 0 : stemVolumes[key];
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });

    setIsPlaying(true);
  };

  // Update volumes in real-time
  useEffect(() => {
    if (!isPlaying || !result?.stems) return;

    Object.keys(result.stems).forEach((key) => {
      const audio = audioRefs.current[key];
      if (audio) {
        const isMuted =
          stemMuted[key] || (stemSolo !== null && stemSolo !== key);
        audio.volume = isMuted ? 0 : stemVolumes[key];
      }
    });
  }, [stemVolumes, stemMuted, stemSolo, isPlaying, result]);

  const handleVolumeChange = (stem, value) => {
    setStemVolumes((prev) => ({ ...prev, [stem]: parseFloat(value) }));
  };

  const toggleMute = (stem) => {
    setStemMuted((prev) => ({ ...prev, [stem]: !prev[stem] }));
    if (stemSolo === stem) setStemSolo(null);
  };

  const toggleSolo = (stem) => {
    setStemSolo((prev) => (prev === stem ? null : stem));
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const handleDownloadStem = (stemName, url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result?.title || "track"}_${stemName}.mp3`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    if (!result?.stems) return;
    Object.entries(result.stems).forEach(([name, stem]) => {
      setTimeout(() => handleDownloadStem(name, stem.url), 200);
    });
  };

  // Load history result
  const loadHistoryItem = (item) => {
    setResult({
      title: item.title,
      stems: item.stems,
      job_id: item.id,
      audio_id: item.audio_id,
      model: item.model_used ? { id: item.model_used, name: item.model_used } : null,
      device: item.device_used,
      duration_seconds: item.duration_seconds,
      stem_count: item.stem_count,
    });
    setActiveTab("upload");
    setSuccess("Loaded previous separation");
  };

  // =====================================================
  // FORMAT HELPERS
  // =====================================================

  const formatDuration = (s) => {
    if (!s) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="stem-separation-page">
      {/* Header */}
      <div className="stem-header">
        <div className="stem-header-content">
          <h1>
            <span className="stem-icon">🎵</span> AI Stem Separation
          </h1>
          <p>
            Separate any track into Vocals, Drums, Bass, and Instruments using
            AI. Powered by Meta&apos;s Demucs — no training needed, works
            instantly.
          </p>
          <div className="stem-badges">
            <span className="stem-badge ai">AI-Powered</span>
            <span className="stem-badge">4-Stem Output</span>
            <span className="stem-badge">320kbps MP3</span>
            {capabilities?.gpu_available && (
              <span className="stem-badge gpu">GPU Accelerated</span>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      {capabilities && !capabilities.demucs_available && (
        <div className="stem-notice warning">
          <span>⚠️</span>
          <div>
            <strong>Stem separation is being set up.</strong> Demucs needs to be
            installed on the server. Contact the admin to enable this feature.
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="stem-notice error">
          <span>❌</span> {error}
          <button onClick={() => setError("")} className="stem-notice-close">×</button>
        </div>
      )}
      {success && !error && (
        <div className="stem-notice success">
          <span>✅</span> {success}
          <button onClick={() => setSuccess("")} className="stem-notice-close">×</button>
        </div>
      )}

      <div className="stem-layout">
        {/* LEFT: Input Panel */}
        <div className="stem-input-panel">
          {/* Tabs */}
          <div className="stem-tabs">
            <button
              className={"stem-tab" + (activeTab === "upload" ? " active" : "")}
              onClick={() => setActiveTab("upload")}
            >
              📤 Upload
            </button>
            <button
              className={"stem-tab" + (activeTab === "library" ? " active" : "")}
              onClick={() => { setActiveTab("library"); fetchLibraryTracks(); }}
            >
              🎵 My Tracks
            </button>
            <button
              className={"stem-tab" + (activeTab === "history" ? " active" : "")}
              onClick={() => { setActiveTab("history"); fetchHistory(); }}
            >
              📂 History
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="stem-upload-area">
              <div
                className={"stem-dropzone" + (uploadFile ? " has-file" : "")}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                {uploadFile ? (
                  <div className="stem-file-info">
                    <span className="stem-file-icon">🎵</span>
                    <div>
                      <div className="stem-file-name">{uploadFile.name}</div>
                      <div className="stem-file-size">
                        {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                    <button
                      className="stem-file-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        setUploadTitle("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="stem-dropzone-content">
                    <span className="stem-dropzone-icon">📤</span>
                    <p>Click to upload audio</p>
                    <span className="stem-dropzone-hint">
                      MP3, WAV, FLAC, OGG, M4A, AAC — Max 100MB
                    </span>
                  </div>
                )}
              </div>

              {uploadFile && (
                <div className="stem-title-input">
                  <label>Track Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter track title..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Library Tab */}
          {activeTab === "library" && (
            <div className="stem-library">
              {loadingTracks ? (
                <div className="stem-loading">Loading your tracks...</div>
              ) : libraryTracks.length === 0 ? (
                <div className="stem-empty">
                  <span>🎵</span>
                  <p>No tracks yet. Upload some music first!</p>
                </div>
              ) : (
                <div className="stem-track-list">
                  {libraryTracks.map((track) => (
                    <div
                      key={track.id}
                      className={
                        "stem-track-item" +
                        (selectedTrackId === track.id ? " selected" : "")
                      }
                      onClick={() => setSelectedTrackId(track.id)}
                    >
                      <span className="stem-track-icon">🎵</span>
                      <div className="stem-track-info">
                        <div className="stem-track-name">{track.title}</div>
                        <div className="stem-track-meta">
                          {track.genre && <span>{track.genre}</span>}
                          {track.duration && (
                            <span>{formatDuration(track.duration)}</span>
                          )}
                          <span className={"stem-status-dot " + (track.status || "original")}>
                            {track.status || "original"}
                          </span>
                        </div>
                      </div>
                      {selectedTrackId === track.id && (
                        <span className="stem-check">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="stem-history">
              {loadingHistory ? (
                <div className="stem-loading">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="stem-empty">
                  <span>📂</span>
                  <p>No separations yet. Try separating a track!</p>
                </div>
              ) : (
                <div className="stem-track-list">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="stem-track-item clickable"
                      onClick={() => loadHistoryItem(item)}
                    >
                      <span className="stem-track-icon">🎵</span>
                      <div className="stem-track-info">
                        <div className="stem-track-name">{item.title}</div>
                        <div className="stem-track-meta">
                          <span>
                            {item.stem_count || Object.keys(item.stems || {}).length} stems
                          </span>
                          {item.model_used && (
                            <span>{item.model_used}</span>
                          )}
                          {item.created_at && (
                            <span>
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="stem-load-btn">Load →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Model Selection */}
          <div className="stem-model-section">
            <label>Separation Model</label>
            <div className="stem-model-grid">
              {capabilities?.models &&
                Object.entries(capabilities.models).map(([key, model]) => (
                  <div
                    key={key}
                    className={
                      "stem-model-card" +
                      (selectedModel === key ? " selected" : "")
                    }
                    onClick={() => setSelectedModel(key)}
                  >
                    <div className="stem-model-header">
                      <span className="stem-model-icon">{model.icon}</span>
                      <span className="stem-model-name">{model.name}</span>
                    </div>
                    <div className="stem-model-desc">{model.description}</div>
                    <div className="stem-model-tags">
                      <span className={"stem-quality-tag " + model.quality}>
                        {model.quality}
                      </span>
                      <span className={"stem-speed-tag " + model.speed}>
                        {model.speed}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Separate Button */}
          <button
            className={"stem-separate-btn" + (processing ? " processing" : "")}
            onClick={handleSeparate}
            disabled={
              processing ||
              (activeTab === "upload" && !uploadFile) ||
              (activeTab === "library" && !selectedTrackId) ||
              activeTab === "history"
            }
          >
            {processing ? (
              <>
                <span className="stem-spinner"></span>
                Separating... {progress}%
              </>
            ) : (
              <>🎵 Separate Stems</>
            )}
          </button>

          {/* Progress bar */}
          {processing && (
            <div className="stem-progress-container">
              <div className="stem-progress-bar">
                <div
                  className="stem-progress-fill"
                  style={{ width: progress + "%" }}
                ></div>
              </div>
              <div className="stem-progress-status">{statusMessage}</div>
            </div>
          )}
        </div>

        {/* RIGHT: Results Panel */}
        <div className="stem-results-panel">
          {!result ? (
            <div className="stem-results-empty">
              <div className="stem-results-placeholder">
                <span>🎛️</span>
                <h3>Stem Mixer</h3>
                <p>
                  Upload a track and separate it to see individual stems here.
                  You&apos;ll be able to play, solo, mute, and download each
                  stem.
                </p>
                <div className="stem-preview-stems">
                  <span style={{ color: "#FF6B6B" }}>🎤 Vocals</span>
                  <span style={{ color: "#4ECDC4" }}>🥁 Drums</span>
                  <span style={{ color: "#45B7D1" }}>🎸 Bass</span>
                  <span style={{ color: "#F59E0B" }}>🪕 Guitar</span>
                  <span style={{ color: "#A855F7" }}>🎹 Piano</span>
                  <span style={{ color: "#96CEB4" }}>🎵 Other</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="stem-results-content">
              {/* Result header */}
              <div className="stem-result-header">
                <h3>🎛️ {result.title || "Separated Track"}</h3>
                <div className="stem-result-meta">
                  {result.model && (
                    <span className="stem-result-tag">
                      {result.model.name}
                    </span>
                  )}
                  {result.duration_seconds && (
                    <span className="stem-result-tag">
                      {formatDuration(result.duration_seconds)}
                    </span>
                  )}
                  {result.device && (
                    <span className={"stem-result-tag " + result.device}>
                      {result.device === "cuda" ? "GPU" : "CPU"}
                    </span>
                  )}
                  <span className="stem-result-tag">
                    {result.stem_count || Object.keys(result.stems).length} stems
                  </span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="stem-transport">
                <button
                  className={"stem-play-btn" + (isPlaying ? " playing" : "")}
                  onClick={handlePlayAll}
                >
                  {isPlaying ? "⏹ Stop" : "▶️ Play All"}
                </button>
                <button className="stem-download-all-btn" onClick={handleDownloadAll}>
                  ⬇️ Download All
                </button>
              </div>

              {/* Stem Mixer */}
              <div className="stem-mixer">
                {Object.entries(result.stems).map(([stemName, stemData]) => {
                  const isMuted =
                    stemMuted[stemName] ||
                    (stemSolo !== null && stemSolo !== stemName);
                  const isSolo = stemSolo === stemName;

                  return (
                    <div
                      key={stemName}
                      className={
                        "stem-channel" +
                        (isMuted ? " muted" : "") +
                        (isSolo ? " solo" : "")
                      }
                      style={{ "--stem-color": stemData.color }}
                    >
                      {/* Hidden audio element */}
                      <audio
                        ref={(el) => (audioRefs.current[stemName] = el)}
                        src={stemData.url}
                        preload="auto"
                        onEnded={handleAudioEnded}
                      />

                      {/* Stem info */}
                      <div className="stem-channel-header">
                        <span className="stem-channel-icon">
                          {stemData.icon}
                        </span>
                        <span className="stem-channel-name">
                          {stemData.name}
                        </span>
                        {stemData.size_mb && (
                          <span className="stem-channel-size">
                            {stemData.size_mb} MB
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="stem-channel-controls">
                        <button
                          className={"stem-mute-btn" + (stemMuted[stemName] ? " active" : "")}
                          onClick={() => toggleMute(stemName)}
                          title="Mute"
                        >
                          M
                        </button>
                        <button
                          className={"stem-solo-btn" + (isSolo ? " active" : "")}
                          onClick={() => toggleSolo(stemName)}
                          title="Solo"
                        >
                          S
                        </button>
                      </div>

                      {/* Volume slider */}
                      <div className="stem-volume-container">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={stemVolumes[stemName]}
                          onChange={(e) =>
                            handleVolumeChange(stemName, e.target.value)
                          }
                          className="stem-volume-slider"
                          style={{
                            "--fill-pct": (stemVolumes[stemName] * 100) + "%",
                          }}
                        />
                        <span className="stem-volume-label">
                          {Math.round(stemVolumes[stemName] * 100)}%
                        </span>
                      </div>

                      {/* Download */}
                      <button
                        className="stem-download-btn"
                        onClick={() =>
                          handleDownloadStem(stemName, stemData.url)
                        }
                        title="Download stem"
                      >
                        ⬇️
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stem tips */}
              <div className="stem-tips">
                <h4>💡 Tips</h4>
                <p>
                  <strong>Solo (S):</strong> Hear only that stem.{" "}
                  <strong>Mute (M):</strong> Silence that stem.{" "}
                  Use the sliders to create your own mix. Download individual
                  stems for remixing in your DAW.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIStemSeparation;