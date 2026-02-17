// src/front/js/component/AIMastering.js
// =====================================================
// AI MASTERING STUDIO - StreamPireX
// =====================================================
// Phase 1: DSP Presets (pedalboard signal chains)
// Phase 2: Adaptive Reference Mastering (Matchering)
//          + Hybrid Mode (Matchering → DSP polish)
//          + Custom Reference ("make it sound like THIS")
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import "../../styles/AIMastering.css";

const AIMastering = () => {
  const [tracks, setTracks] = useState([]);
  const [presets, setPresets] = useState([]);
  const [references, setReferences] = useState([]);
  const [capabilities, setCapabilities] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("radio_ready");
  const [selectedReference, setSelectedReference] = useState("pop");
  const [masteringMode, setMasteringMode] = useState("dsp");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("library");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [customRefFile, setCustomRefFile] = useState(null);
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingMastered, setPlayingMastered] = useState(false);

  const originalAudioRef = useRef(null);
  const masteredAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const refFileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/capabilities");
      if (res.ok) setCapabilities(await res.json());
    } catch (err) {
      console.error("Capabilities fetch failed:", err);
    }
  }, [BACKEND_URL]);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/presets");
      if (res.ok) {
        const d = await res.json();
        setPresets(d.presets || []);
      }
    } catch (err) {
      console.error("Presets fetch failed:", err);
    }
  }, [BACKEND_URL]);

  const fetchReferences = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/references");
      if (res.ok) {
        const d = await res.json();
        setReferences(d.references || []);
      }
    } catch (err) {
      console.error("References fetch failed:", err);
    }
  }, [BACKEND_URL]);

  const fetchTracks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/tracks", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const d = await res.json();
        setTracks(d.tracks || []);
      }
    } catch (err) {
      console.error("Tracks fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchCapabilities();
    fetchPresets();
    fetchReferences();
    fetchTracks();
  }, [fetchCapabilities, fetchPresets, fetchReferences, fetchTracks]);

  // =====================================================
  // PROGRESS SIMULATION
  // =====================================================

  const startProgress = () => {
    setProgress(0);
    let c = 0;
    progressIntervalRef.current = setInterval(() => {
      c += Math.random() * 8 + 2;
      if (c >= 90) {
        c = 90;
        clearInterval(progressIntervalRef.current);
      }
      setProgress(Math.round(c));
    }, 500);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);
  };

  // =====================================================
  // MASTERING HANDLERS
  // =====================================================

  const handleMaster = async () => {
    if (activeTab === "upload") return handleUploadAndMaster();
    if (!selectedTrack) {
      setError("Please select a track to master");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);
    startProgress();

    try {
      const token = localStorage.getItem("token");
      let endpoint, body;

      if (masteringMode === "dsp") {
        // Phase 1: DSP preset mastering
        endpoint = BACKEND_URL + "/api/ai/mastering/process";
        body = JSON.stringify({
          audio_id: selectedTrack.id,
          preset: selectedPreset,
        });
      } else if (masteringMode === "reference" || masteringMode === "hybrid") {
        // Phase 2: Reference-based (adaptive or hybrid)
        endpoint = BACKEND_URL + "/api/ai/mastering/reference-master";
        body = JSON.stringify({
          audio_id: selectedTrack.id,
          reference: selectedReference,
          mode: masteringMode === "hybrid" ? "hybrid" : "adaptive",
          polish_preset: masteringMode === "hybrid" ? selectedPreset : undefined,
        });
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mastering failed");

      stopProgress();
      setResult(data);

      // Update local state
      setTracks((prev) =>
        prev.map((t) =>
          t.id === selectedTrack.id
            ? { ...t, mastered_url: data.mastered_url, status: "mastered" }
            : t
        )
      );
      setSelectedTrack((prev) => ({
        ...prev,
        mastered_url: data.mastered_url,
        status: "mastered",
      }));
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCustomRefMaster = async () => {
    if (!selectedTrack || !customRefFile) {
      setError("Select a track and upload a reference file");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);
    startProgress();

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("audio_id", selectedTrack.id);
      fd.append("reference", customRefFile);
      fd.append("mode", "hybrid");
      fd.append("polish_preset", selectedPreset);

      const res = await fetch(
        BACKEND_URL + "/api/ai/mastering/custom-reference",
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd,
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Custom reference mastering failed");

      stopProgress();
      setResult(data);
      fetchTracks();
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadAndMaster = async () => {
    if (!uploadFile) {
      setError("Please select an audio file");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);
    startProgress();

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append(
        "title",
        uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, "")
      );
      fd.append("preset", selectedPreset);

      const res = await fetch(
        BACKEND_URL + "/api/ai/mastering/upload-and-master",
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd,
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Upload and mastering failed");

      stopProgress();
      setResult(data);
      fetchTracks();
      setUploadFile(null);
      setUploadTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // AUDIO PLAYBACK (A/B Comparison)
  // =====================================================

  const toggleOriginal = () => {
    if (!originalAudioRef.current) return;
    if (masteredAudioRef.current && playingMastered) {
      masteredAudioRef.current.pause();
      setPlayingMastered(false);
    }
    if (playingOriginal) {
      originalAudioRef.current.pause();
    } else {
      originalAudioRef.current.play();
    }
    setPlayingOriginal(!playingOriginal);
  };

  const toggleMastered = () => {
    if (!masteredAudioRef.current) return;
    if (originalAudioRef.current && playingOriginal) {
      originalAudioRef.current.pause();
      setPlayingOriginal(false);
    }
    if (playingMastered) {
      masteredAudioRef.current.pause();
    } else {
      masteredAudioRef.current.play();
    }
    setPlayingMastered(!playingMastered);
  };

  const stopAllAudio = () => {
    [originalAudioRef, masteredAudioRef].forEach((r) => {
      if (r.current) {
        r.current.pause();
        r.current.currentTime = 0;
      }
    });
    setPlayingOriginal(false);
    setPlayingMastered(false);
  };

  // =====================================================
  // FILE HANDLERS
  // =====================================================

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".mp3", ".wav", ".flac"].includes(ext)) {
      setError("Please upload an MP3, WAV, or FLAC file");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100MB.");
      return;
    }
    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    setError("");
  };

  const handleRefFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      setCustomRefFile(f);
      setError("");
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getStatusBadge = (status) => {
    const map = {
      mastered: ["mastered", "Mastered"],
      processing: ["processing", "Processing"],
      error: ["error", "Error"],
    };
    const [cls, txt] = map[status] || ["original", "Original"];
    return <span className={"ai-master-badge " + cls}>{txt}</span>;
  };

  const formatDuration = (s) => {
    if (!s) return "--:--";
    return (
      Math.floor(s / 60) +
      ":" +
      String(Math.floor(s % 60)).padStart(2, "0")
    );
  };

  const getButtonLabel = () => {
    if (processing) return "Mastering... " + progress + "%";
    if (activeTab === "upload") return "Upload & Master";
    if (masteringMode === "custom_ref") return "Master with Custom Reference";
    return "Master Track";
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="ai-mastering-page">
      {/* Header */}
      <div className="ai-mastering-header">
        <div className="ai-mastering-header-content">
          <h1>
            <span className="ai-icon">{"\u{1F39A}\uFE0F"}</span> AI Mastering
            Studio
          </h1>
          <p>
            Professional mastering powered by DSP signal chains and adaptive
            reference matching. Upload your track, pick a style, and get a
            mastered version in seconds.
          </p>
          <div className="ai-master-phases">
            <span className="ai-phase active">Phase 1: DSP Engine</span>
            <span
              className={
                "ai-phase" +
                (capabilities?.phase_2_matchering ? " active" : "")
              }
            >
              Phase 2: Adaptive AI
            </span>
            <span className="ai-phase">Phase 3: Neural Network — Coming Soon</span>
          </div>
        </div>
      </div>

      <div className="ai-mastering-layout">
        {/* =================== SIDEBAR =================== */}
        <div className="ai-mastering-sidebar">
          <div className="ai-master-tabs">
            <button
              className={
                "ai-master-tab" + (activeTab === "library" ? " active" : "")
              }
              onClick={() => setActiveTab("library")}
            >
              My Library
            </button>
            <button
              className={
                "ai-master-tab" + (activeTab === "upload" ? " active" : "")
              }
              onClick={() => setActiveTab("upload")}
            >
              Upload New
            </button>
          </div>

          {/* Track List */}
          {activeTab === "library" && (
            <div className="ai-master-track-list">
              {loading ? (
                <div className="ai-master-loading">
                  <div className="ai-master-spinner"></div>
                  <p>Loading tracks...</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="ai-master-empty">
                  <span className="ai-master-empty-icon">
                    {"\u{1F3B5}"}
                  </span>
                  <p>No tracks yet</p>
                  <small>Upload a track to get started</small>
                </div>
              ) : (
                tracks.map((track) => (
                  <div
                    key={track.id}
                    className={
                      "ai-master-track-item" +
                      (selectedTrack?.id === track.id ? " selected" : "")
                    }
                    onClick={() => {
                      setSelectedTrack(track);
                      setResult(null);
                      stopAllAudio();
                    }}
                  >
                    <div className="ai-master-track-info">
                      <span className="ai-master-track-title">
                        {track.title}
                      </span>
                      <span className="ai-master-track-meta">
                        {track.genre && <span>{track.genre}</span>}
                        {track.duration && <span>{track.duration}</span>}
                      </span>
                    </div>
                    {getStatusBadge(track.status)}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Upload Area */}
          {activeTab === "upload" && (
            <div className="ai-master-upload-area">
              <div
                className={
                  "ai-master-dropzone" + (uploadFile ? " has-file" : "")
                }
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <>
                    <span className="ai-master-file-icon">
                      {"\u{1F3B5}"}
                    </span>
                    <span className="ai-master-file-name">
                      {uploadFile.name}
                    </span>
                    <small>
                      {(uploadFile.size / 1048576).toFixed(1)} MB
                    </small>
                  </>
                ) : (
                  <>
                    <span className="ai-master-upload-icon">
                      {"\u2B06\uFE0F"}
                    </span>
                    <span>Click to select audio file</span>
                    <small>MP3, WAV, or FLAC — Max 100MB</small>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              {uploadFile && (
                <div className="ai-master-upload-title">
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
        </div>

        {/* =================== MAIN =================== */}
        <div className="ai-mastering-main">
          {/* Mode Selector */}
          <div className="ai-master-section">
            <h3>Mastering Engine</h3>
            <div className="ai-master-mode-grid">
              {[
                [
                  "dsp",
                  "\u2699\uFE0F",
                  "DSP Preset",
                  "Professional signal chain with genre-tuned EQ, compression, and limiting",
                  "Phase 1",
                ],
                [
                  "reference",
                  "\u{1F9E0}",
                  "Adaptive Reference",
                  "AI analyzes a reference track and adapts your audio to match its sonic profile",
                  "Phase 2",
                ],
                [
                  "hybrid",
                  "\u{1F500}",
                  "Hybrid",
                  "Reference matching + DSP polish for the best possible results",
                  "Phase 2",
                ],
                [
                  "custom_ref",
                  "\u{1F3AF}",
                  "Custom Reference",
                  'Upload any song \u2014 AI will make your track sound like it',
                  "Phase 2",
                ],
              ].map(([mode, icon, name, desc, phase]) => (
                <div
                  key={mode}
                  className={
                    "ai-master-mode-card" +
                    (masteringMode === mode ? " selected" : "")
                  }
                  onClick={() => setMasteringMode(mode)}
                >
                  <span className="ai-master-mode-icon">{icon}</span>
                  <span className="ai-master-mode-name">{name}</span>
                  <span className="ai-master-mode-desc">{desc}</span>
                  <span className="ai-master-mode-phase">{phase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DSP Presets (Phase 1 / Hybrid polish) */}
          {(masteringMode === "dsp" || masteringMode === "hybrid") && (
            <div className="ai-master-section">
              <h3>
                {masteringMode === "hybrid"
                  ? "DSP Polish Preset"
                  : "Choose Mastering Style"}
              </h3>
              <div className="ai-master-preset-grid">
                {presets.map((p) => (
                  <div
                    key={p.id}
                    className={
                      "ai-master-preset-card" +
                      (selectedPreset === p.id ? " selected" : "")
                    }
                    onClick={() => setSelectedPreset(p.id)}
                  >
                    <span className="ai-master-preset-icon">{p.icon}</span>
                    <span className="ai-master-preset-name">{p.name}</span>
                    <span className="ai-master-preset-desc">
                      {p.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference Profiles (Phase 2) */}
          {(masteringMode === "reference" || masteringMode === "hybrid") && (
            <div className="ai-master-section">
              <h3>Reference Sound Profile</h3>
              <p className="ai-master-section-desc">
                AI analyzes the reference track's frequency response, loudness,
                stereo width, and dynamics — then adapts your audio to match.
              </p>
              <div className="ai-master-preset-grid">
                {references.map((r) => (
                  <div
                    key={r.id}
                    className={
                      "ai-master-preset-card" +
                      (selectedReference === r.id ? " selected" : "")
                    }
                    onClick={() => setSelectedReference(r.id)}
                  >
                    <span className="ai-master-preset-icon">{r.icon}</span>
                    <span className="ai-master-preset-name">{r.name}</span>
                    <span className="ai-master-preset-desc">
                      {r.description}
                    </span>
                    <span
                      className={
                        "ai-master-method-tag " +
                        (r.method === "adaptive" ? "adaptive" : "dsp")
                      }
                    >
                      {r.method === "adaptive"
                        ? "Adaptive"
                        : "DSP Fallback"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Reference Upload (Phase 2) */}
          {masteringMode === "custom_ref" && (
            <div className="ai-master-section">
              <h3>Upload Your Reference Track</h3>
              <p className="ai-master-section-desc">
                Upload any professionally mastered song. AI analyzes its sonic
                characteristics and transforms your track to match.
              </p>
              <div
                className={
                  "ai-master-dropzone" + (customRefFile ? " has-file" : "")
                }
                onClick={() => refFileInputRef.current?.click()}
              >
                {customRefFile ? (
                  <>
                    <span className="ai-master-file-icon">
                      {"\u{1F4C0}"}
                    </span>
                    <span className="ai-master-file-name">
                      {customRefFile.name}
                    </span>
                    <small>Click to change</small>
                  </>
                ) : (
                  <>
                    <span className="ai-master-upload-icon">
                      {"\u{1F4C0}"}
                    </span>
                    <span>Click to select reference track</span>
                    <small>"Make my song sound like THIS"</small>
                  </>
                )}
              </div>
              <input
                ref={refFileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={handleRefFileSelect}
                style={{ display: "none" }}
              />
            </div>
          )}

          {/* Action Button */}
          <div className="ai-master-action">
            <button
              className="ai-master-btn"
              onClick={
                masteringMode === "custom_ref"
                  ? handleCustomRefMaster
                  : handleMaster
              }
              disabled={
                processing ||
                (activeTab === "library" && !selectedTrack) ||
                (activeTab === "upload" && !uploadFile) ||
                (masteringMode === "custom_ref" &&
                  (!selectedTrack || !customRefFile))
              }
            >
              {processing && <span className="ai-master-btn-spinner"></span>}
              {getButtonLabel()}
            </button>
            {processing && (
              <div className="ai-master-progress">
                <div
                  className="ai-master-progress-fill"
                  style={{ width: progress + "%" }}
                ></div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="ai-master-error">
              <span>{"\u274C"}</span> {error}
            </div>
          )}

          {/* =================== RESULTS =================== */}
          {result && (
            <div className="ai-master-results">
              <h3>{"\u2705"} Mastering Complete</h3>

              {/* Method Badge */}
              <div className="ai-master-method-badge">
                {result.method === "matchering" &&
                  "\u{1F9E0} Adaptive Matchering"}
                {result.method === "hybrid" &&
                  "\u{1F500} Hybrid (Matchering + DSP)"}
                {(result.method === "dsp_fallback" || !result.method) &&
                  "\u2699\uFE0F DSP Engine"}
                {result.stats?.stages && (
                  <span className="ai-master-stages">
                    {" \u2192 " + result.stats.stages.join(" \u2192 ")}
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="ai-master-stats-grid">
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Duration</span>
                  <span className="ai-master-stat-value">
                    {formatDuration(result.stats?.duration_seconds)}
                  </span>
                </div>
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Loudness Boost</span>
                  <span className="ai-master-stat-value boost">
                    +{result.stats?.loudness_increase_db || 0} dB
                  </span>
                </div>
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Peak Before</span>
                  <span className="ai-master-stat-value">
                    {result.stats?.peak_before?.toFixed(3)}
                  </span>
                </div>
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Peak After</span>
                  <span className="ai-master-stat-value">
                    {result.stats?.peak_after?.toFixed(3)}
                  </span>
                </div>
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Sample Rate</span>
                  <span className="ai-master-stat-value">
                    {result.stats?.sample_rate
                      ? (result.stats.sample_rate / 1000).toFixed(1) + " kHz"
                      : "--"}
                  </span>
                </div>
                <div className="ai-master-stat">
                  <span className="ai-master-stat-label">Preset</span>
                  <span className="ai-master-stat-value">
                    {result.preset?.name || result.reference?.name || "--"}
                  </span>
                </div>
              </div>

              {/* A/B Comparison Player */}
              <div className="ai-master-comparison">
                <h4>{"\u{1F50A}"} A/B Compare</h4>
                <div className="ai-master-compare-btns">
                  <button
                    className={
                      "ai-master-compare-btn original" +
                      (playingOriginal ? " playing" : "")
                    }
                    onClick={toggleOriginal}
                  >
                    {playingOriginal ? "\u23F8 Pause" : "\u25B6\uFE0F Play"}{" "}
                    Original
                  </button>
                  <button
                    className={
                      "ai-master-compare-btn mastered" +
                      (playingMastered ? " playing" : "")
                    }
                    onClick={toggleMastered}
                  >
                    {playingMastered ? "\u23F8 Pause" : "\u25B6\uFE0F Play"}{" "}
                    Mastered
                  </button>
                  <button
                    className="ai-master-compare-btn stop"
                    onClick={stopAllAudio}
                  >
                    {"\u23F9"} Stop
                  </button>
                </div>
                <audio
                  ref={originalAudioRef}
                  src={selectedTrack?.file_url || result.original_url}
                  onEnded={() => setPlayingOriginal(false)}
                  crossOrigin="anonymous"
                />
                <audio
                  ref={masteredAudioRef}
                  src={result.mastered_url}
                  onEnded={() => setPlayingMastered(false)}
                  crossOrigin="anonymous"
                />
              </div>

              {/* Download */}
              <div className="ai-master-download">
                <a
                  href={result.mastered_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-master-download-btn"
                >
                  {"\u2B07\uFE0F"} Download Mastered Track
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMastering;