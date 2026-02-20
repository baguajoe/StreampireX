// src/front/js/component/AIMastering.js
// =====================================================
// AI MASTERING STUDIO - StreamPireX
// =====================================================
// Phase 1: DSP Presets (pedalboard signal chains)
// Phase 2: Adaptive Reference Mastering (Matchering)
//          + Hybrid Mode (Matchering → DSP polish)
//          + Custom Reference ("make it sound like THIS")
// Phase 3: Smart Auto-Detect (librosa analysis → auto preset)
//          + 50 Genre Reference Profiles
//          + Track Analysis (BPM, key, mood, frequency)
// =====================================================
//
// BACKEND ENDPOINTS USED (15 total):
// ─────────────────────────────────────────────────────
// ai_mastering.py (11 routes):
//   GET  /api/ai/mastering/capabilities       → fetchCapabilities()
//   GET  /api/ai/mastering/presets             → fetchPresets()
//   GET  /api/ai/mastering/references          → fetchReferences()
//   GET  /api/ai/mastering/tracks              → fetchTracks()
//   POST /api/ai/mastering/process             → handleMaster() [DSP]
//   POST /api/ai/mastering/reference-master    → handleMaster() [ref/hybrid]
//   POST /api/ai/mastering/custom-reference    → handleCustomRefMaster()
//   POST /api/ai/mastering/upload-and-master   → handleUploadAndMaster()
//   GET  /api/ai/mastering/status/<id>         → pollMasteringStatus()
//   GET  /api/ai/mastering/compare/<id>        → fetchComparisonUrls()
//   POST /api/ai/mastering/upload-reference    → handleUploadReferenceTrack()
//
// ai_mastering_phase3.py (4 routes):
//   GET  /api/ai/mastering/profiles                  → fetchGenreProfiles()
//   POST /api/ai/mastering/analyze                   → handleAnalyzeTrack()
//   POST /api/ai/mastering/smart-master              → handleSmartMaster()
//   POST /api/ai/mastering/profile-reference-master  → handleProfileReferenceMaster()
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

  // =====================================================
  // PHASE 3 STATE
  // =====================================================
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [genreProfiles, setGenreProfiles] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [smartUploadFile, setSmartUploadFile] = useState(null);

  // =====================================================
  // NEW: Status polling + A/B comparison + reference upload
  //      + profile reference mastering state
  // =====================================================
  const [comparisonData, setComparisonData] = useState(null);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [refUploadProfile, setRefUploadProfile] = useState("");
  const [refUploadFile, setRefUploadFile] = useState(null);
  const [refUploadSuccess, setRefUploadSuccess] = useState("");
  const [profileMastering, setProfileMastering] = useState(false);

  const originalAudioRef = useRef(null);
  const masteredAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const refFileInputRef = useRef(null);
  const smartFileInputRef = useRef(null);
  const refUploadInputRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const statusPollRef = useRef(null);

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

  // Phase 3: Fetch 50 genre profiles
  const fetchGenreProfiles = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/mastering/profiles");
      if (res.ok) {
        const d = await res.json();
        setGenreProfiles(d.profiles_by_genre || null);
      }
    } catch (err) {
      console.error("Genre profiles fetch failed:", err);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchCapabilities();
    fetchPresets();
    fetchReferences();
    fetchTracks();
    fetchGenreProfiles();
  }, [fetchCapabilities, fetchPresets, fetchReferences, fetchTracks, fetchGenreProfiles]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // =====================================================
  // STATUS POLLING — GET /api/ai/mastering/status/<id>
  // =====================================================
  // Polls the backend for real mastering status on library
  // tracks. Used alongside simulated progress so the UI
  // stays responsive while the server processes audio.
  // =====================================================

  const stopStatusPolling = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
  };

  const pollMasteringStatus = useCallback(
    (audioId) => {
      if (!audioId) return;
      const token = localStorage.getItem("token");

      statusPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            BACKEND_URL + "/api/ai/mastering/status/" + audioId,
            { headers: { Authorization: "Bearer " + token } }
          );
          if (!res.ok) return;

          const data = await res.json();

          if (data.status === "mastered" && data.mastered_url) {
            // Done — stop polling
            stopStatusPolling();
            setProgress(100);

            // Update track in local state
            setTracks((prev) =>
              prev.map((t) =>
                t.id === audioId
                  ? { ...t, mastered_url: data.mastered_url, status: "mastered" }
                  : t
              )
            );
            setSelectedTrack((prev) =>
              prev && prev.id === audioId
                ? { ...prev, mastered_url: data.mastered_url, status: "mastered" }
                : prev
            );
          } else if (data.status === "error") {
            stopStatusPolling();
            setError("Mastering failed on server");
            setProcessing(false);
          }
          // else still processing — keep polling
        } catch (err) {
          console.error("Status poll error:", err);
        }
      }, 2000); // Poll every 2 seconds
    },
    [BACKEND_URL]
  );

  // =====================================================
  // A/B COMPARISON — GET /api/ai/mastering/compare/<id>
  // =====================================================
  // Fetches server-side original + mastered URLs for the
  // selected track. Ensures the A/B player uses accurate
  // URLs from the database, not just local/session state.
  // =====================================================

  const fetchComparisonUrls = useCallback(
    async (audioId) => {
      if (!audioId) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          BACKEND_URL + "/api/ai/mastering/compare/" + audioId,
          { headers: { Authorization: "Bearer " + token } }
        );
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data);
        }
      } catch (err) {
        console.error("Comparison fetch failed:", err);
      }
    },
    [BACKEND_URL]
  );

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
  // MASTERING HANDLERS (Phase 1 + 2)
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
    setComparisonData(null);
    startProgress();

    // Start real status polling for library tracks
    pollMasteringStatus(selectedTrack.id);

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
      stopStatusPolling();
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

      // Fetch A/B comparison URLs from server
      fetchComparisonUrls(selectedTrack.id);
    } catch (err) {
      stopProgress();
      stopStatusPolling();
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
    setComparisonData(null);
    startProgress();

    // Start real status polling
    pollMasteringStatus(selectedTrack.id);

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
      stopStatusPolling();
      setResult(data);
      fetchTracks();

      // Fetch A/B comparison URLs from server
      fetchComparisonUrls(selectedTrack.id);
    } catch (err) {
      stopProgress();
      stopStatusPolling();
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
    setComparisonData(null);
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

      // If the response includes audio_id, fetch comparison URLs
      if (data.audio_id) {
        fetchComparisonUrls(data.audio_id);
      }
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // PHASE 3 HANDLERS — Smart Auto-Detect + 50 Profiles
  // =====================================================

  const handleSmartFileSelect = (e) => {
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
    setSmartUploadFile(file);
    setAnalysis(null);
    setResult(null);
    setError("");
  };

  const handleAnalyzeTrack = async () => {
    if (!smartUploadFile) {
      setError("Upload an audio file first");
      return;
    }

    setAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("audio_file", smartUploadFile);

      const res = await fetch(BACKEND_URL + "/api/ai/mastering/analyze", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Failed to analyze track");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSmartMaster = async () => {
    if (!smartUploadFile) {
      setError("Upload an audio file first");
      return;
    }

    setProcessing(true);
    setError("");
    setResult(null);
    setComparisonData(null);
    startProgress();

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("audio_file", smartUploadFile);
      if (selectedProfile) {
        fd.append("preset_override", selectedProfile);
      }

      const res = await fetch(BACKEND_URL + "/api/ai/mastering/smart-master", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Smart mastering failed");

      stopProgress();
      setResult(data);
      if (data.analysis) setAnalysis(data);
      fetchTracks();
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // =====================================================
  // PROFILE REFERENCE MASTER
  // POST /api/ai/mastering/profile-reference-master
  // =====================================================
  // Used in 50 Genre Profiles mode. Uploads the audio
  // file + selected genre profile_id to Phase 3 endpoint
  // which uses Matchering for true reference matching
  // (if a reference WAV exists for that profile) or
  // falls back to DSP preset mastering.
  // =====================================================

  const handleProfileReferenceMaster = async () => {
    if (!smartUploadFile || !selectedProfile) {
      setError("Upload a track and select a genre profile");
      return;
    }

    setProfileMastering(true);
    setProcessing(true);
    setError("");
    setResult(null);
    setComparisonData(null);
    startProgress();

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("audio_file", smartUploadFile);
      fd.append("profile_id", selectedProfile);

      const res = await fetch(
        BACKEND_URL + "/api/ai/mastering/profile-reference-master",
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile reference mastering failed");

      stopProgress();
      setResult(data);
      fetchTracks();
    } catch (err) {
      stopProgress();
      setError(err.message);
    } finally {
      setProcessing(false);
      setProfileMastering(false);
    }
  };

  // =====================================================
  // UPLOAD REFERENCE TRACK
  // POST /api/ai/mastering/upload-reference
  // =====================================================
  // Lets creators upload a professional reference WAV for
  // a specific genre profile slot. Once uploaded, that
  // profile uses Matchering for true adaptive reference
  // mastering instead of DSP fallback.
  // =====================================================

  const handleRefUploadFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      setRefUploadFile(f);
      setError("");
      setRefUploadSuccess("");
    }
  };

  const handleUploadReferenceTrack = async () => {
    if (!refUploadFile || !refUploadProfile) {
      setError("Select a profile and a reference audio file");
      return;
    }

    setUploadingReference(true);
    setError("");
    setRefUploadSuccess("");

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", refUploadFile);
      fd.append("profile", refUploadProfile);

      const res = await fetch(
        BACKEND_URL + "/api/ai/mastering/upload-reference",
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reference upload failed");

      setRefUploadSuccess(data.message || "Reference track uploaded!");
      setRefUploadFile(null);
      if (refUploadInputRef.current) refUploadInputRef.current.value = "";

      // Refresh capabilities and references — new ref may now be available
      fetchCapabilities();
      fetchReferences();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingReference(false);
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

  // Build A/B audio src URLs — prefer server comparison data, fall back to local state
  const getOriginalSrc = () => {
    if (comparisonData?.original_url) return comparisonData.original_url;
    return selectedTrack?.file_url || result?.original_url || "";
  };

  const getMasteredSrc = () => {
    if (comparisonData?.mastered_url) return comparisonData.mastered_url;
    return result?.mastered_url || "";
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
            Professional mastering powered by DSP signal chains, adaptive
            reference matching, and smart auto-detection. Upload your track, pick a style, and get a
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
            <span className="ai-phase active">Phase 3: Smart Auto-Detect</span>
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
                      setComparisonData(null);
                      stopAllAudio();
                      // Fetch comparison URLs if track was previously mastered
                      if (track.status === "mastered" || track.mastered_url) {
                        fetchComparisonUrls(track.id);
                      }
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
          {/* Mode Selector — Phase 1 + 2 + 3 */}
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
                  "Upload any song \u2014 AI will make your track sound like it",
                  "Phase 2",
                ],
                [
                  "smart",
                  "\u{1F916}",
                  "Smart Auto-Detect",
                  "AI analyzes BPM, key, mood & frequency \u2014 picks the best preset automatically",
                  "Phase 3",
                ],
                [
                  "profiles",
                  "\u{1F4CB}",
                  "50 Genre Profiles",
                  "Choose from 50 genre-specific reference profiles for studio-quality mastering",
                  "Phase 3",
                ],
              ].map(([mode, icon, name, desc, phase]) => (
                <div
                  key={mode}
                  className={
                    "ai-master-mode-card" +
                    (masteringMode === mode ? " selected" : "") +
                    (phase === "Phase 3" ? " phase3" : "")
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

          {/* =============================================== */}
          {/* DSP Presets (Phase 1 / Hybrid polish) */}
          {/* =============================================== */}
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

          {/* =============================================== */}
          {/* Reference Profiles (Phase 2) */}
          {/* =============================================== */}
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

              {/* =============================================== */}
              {/* Upload Reference Track for a Profile            */}
              {/* POST /api/ai/mastering/upload-reference          */}
              {/* =============================================== */}
              <div className="ai-master-ref-upload-section">
                <h4>{"\u{1F4E4}"} Upload Reference Track for a Profile</h4>
                <p className="ai-master-section-desc">
                  Upload a professionally mastered WAV to enable true adaptive mastering
                  for any genre profile. Once uploaded, that profile will use Matchering
                  instead of DSP fallback.
                </p>
                <div className="ai-master-ref-upload-row">
                  <select
                    className="ai-master-ref-profile-select"
                    value={refUploadProfile}
                    onChange={(e) => setRefUploadProfile(e.target.value)}
                  >
                    <option value="">Select profile...</option>
                    {references.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.method === "adaptive" ? "(has reference)" : "(needs reference)"}
                      </option>
                    ))}
                  </select>
                  <div
                    className={"ai-master-ref-upload-drop" + (refUploadFile ? " has-file" : "")}
                    onClick={() => refUploadInputRef.current?.click()}
                  >
                    {refUploadFile ? (
                      <span className="ai-master-file-name">{refUploadFile.name}</span>
                    ) : (
                      <span>Click to select reference WAV</span>
                    )}
                  </div>
                  <input
                    ref={refUploadInputRef}
                    type="file"
                    accept=".mp3,.wav,.flac"
                    onChange={handleRefUploadFileSelect}
                    style={{ display: "none" }}
                  />
                  <button
                    className="ai-master-ref-upload-btn"
                    onClick={handleUploadReferenceTrack}
                    disabled={uploadingReference || !refUploadFile || !refUploadProfile}
                  >
                    {uploadingReference ? "Uploading..." : "\u{1F4E4} Upload Reference"}
                  </button>
                </div>
                {refUploadSuccess && (
                  <div className="ai-master-ref-upload-success">
                    {"\u2705"} {refUploadSuccess}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================== */}
          {/* Custom Reference Upload (Phase 2) */}
          {/* =============================================== */}
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

          {/* =============================================== */}
          {/* PHASE 3: Smart Auto-Detect */}
          {/* =============================================== */}
          {masteringMode === "smart" && (
            <div className="ai-master-section">
              <h3>{"\u{1F916}"} Smart Auto-Detect</h3>
              <p className="ai-master-section-desc">
                Upload your track. AI analyzes BPM, musical key, mood, frequency balance,
                and genre — then automatically picks the best mastering preset and fine-tunes it.
              </p>

              {/* Smart Upload Dropzone */}
              <div
                className={"ai-master-dropzone" + (smartUploadFile ? " has-file" : "")}
                onClick={() => smartFileInputRef.current?.click()}
              >
                {smartUploadFile ? (
                  <>
                    <span className="ai-master-file-icon">{"\u{1F3B5}"}</span>
                    <span className="ai-master-file-name">{smartUploadFile.name}</span>
                    <small>{(smartUploadFile.size / 1048576).toFixed(1)} MB</small>
                  </>
                ) : (
                  <>
                    <span className="ai-master-upload-icon">{"\u{1F916}"}</span>
                    <span>Click to upload track for AI analysis</span>
                    <small>MP3, WAV, or FLAC — Max 100MB</small>
                  </>
                )}
              </div>
              <input
                ref={smartFileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={handleSmartFileSelect}
                style={{ display: "none" }}
              />

              {/* Analyze + Smart Master Buttons */}
              {smartUploadFile && (
                <div className="ai-master-smart-actions">
                  <button
                    className="ai-master-analyze-btn"
                    onClick={handleAnalyzeTrack}
                    disabled={analyzing}
                  >
                    {analyzing ? "\u{1F50D} Analyzing..." : "\u{1F50D} Analyze Track"}
                  </button>
                  <button
                    className="ai-master-btn"
                    onClick={handleSmartMaster}
                    disabled={processing}
                  >
                    {processing
                      ? "Mastering... " + progress + "%"
                      : "\u{1F916} Smart Master"}
                  </button>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && analysis.analysis && (
                <div className="ai-master-analysis-results">
                  <h4>{"\u{1F4CA}"} Track Analysis</h4>

                  <div className="ai-master-analysis-grid">
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">BPM</span>
                      <span className="ai-master-analysis-value">{analysis.analysis.bpm}</span>
                    </div>
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">Key</span>
                      <span className="ai-master-analysis-value">{analysis.analysis.key}</span>
                    </div>
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">Loudness</span>
                      <span className="ai-master-analysis-value">{analysis.analysis.loudness_lufs} LUFS</span>
                    </div>
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">Mood</span>
                      <span className="ai-master-analysis-value ai-mood-tag">{analysis.analysis.mood}</span>
                    </div>
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">Dynamic Range</span>
                      <span className="ai-master-analysis-value">{analysis.analysis.dynamic_range_db} dB</span>
                    </div>
                    <div className="ai-master-analysis-item">
                      <span className="ai-master-analysis-label">Brightness</span>
                      <span className="ai-master-analysis-value">{analysis.analysis.brightness}</span>
                    </div>
                  </div>

                  {/* Frequency Balance Bars */}
                  <div className="ai-master-freq-balance">
                    <h4>Frequency Balance</h4>
                    <div className="ai-master-freq-bars">
                      <div className="ai-master-freq-bar">
                        <span className="ai-freq-label">Bass</span>
                        <div className="ai-freq-track">
                          <div className="ai-freq-fill bass" style={{ width: (analysis.analysis.bass_energy || 0) + "%" }} />
                        </div>
                        <span className="ai-freq-pct">{analysis.analysis.bass_energy || 0}%</span>
                      </div>
                      <div className="ai-master-freq-bar">
                        <span className="ai-freq-label">Mids</span>
                        <div className="ai-freq-track">
                          <div className="ai-freq-fill mids" style={{ width: (analysis.analysis.mid_energy || 0) + "%" }} />
                        </div>
                        <span className="ai-freq-pct">{analysis.analysis.mid_energy || 0}%</span>
                      </div>
                      <div className="ai-master-freq-bar">
                        <span className="ai-freq-label">Highs</span>
                        <div className="ai-freq-track">
                          <div className="ai-freq-fill highs" style={{ width: (analysis.analysis.high_energy || 0) + "%" }} />
                        </div>
                        <span className="ai-freq-pct">{analysis.analysis.high_energy || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommended Preset */}
                  {analysis.recommended_preset && (
                    <div className="ai-master-recommended">
                      <h4>{"\u{1F916}"} AI Recommendation</h4>
                      <div className="ai-master-recommended-badge">
                        <span className="ai-recommended-name">{analysis.recommended_preset}</span>
                        <span className="ai-recommended-confidence">{analysis.confidence}% confidence</span>
                      </div>
                      {analysis.reason && (
                        <p className="ai-recommended-reason">{analysis.reason}</p>
                      )}
                    </div>
                  )}

                  {/* Genre Hints */}
                  {analysis.analysis.genre_hints && analysis.analysis.genre_hints.length > 0 && (
                    <div className="ai-master-genre-hints">
                      <h4>Genre Detected</h4>
                      <div className="ai-master-genre-tags">
                        {analysis.analysis.genre_hints.map((genre, i) => (
                          <span key={i} className="ai-master-genre-tag">
                            {genre.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality Issues */}
                  {analysis.analysis.quality_issues && analysis.analysis.quality_issues.length > 0 && (
                    <div className="ai-master-quality-issues">
                      <h4>{"\u26A0\uFE0F"} Issues Detected</h4>
                      <div className="ai-master-issue-tags">
                        {analysis.analysis.quality_issues.map((issue, i) => (
                          <span key={i} className="ai-master-issue-tag">
                            {issue.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                      <small>AI will auto-correct these during mastering</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =============================================== */}
          {/* PHASE 3: 50 Genre Profiles */}
          {/* =============================================== */}
          {masteringMode === "profiles" && (
            <div className="ai-master-section">
              <h3>{"\u{1F4CB}"} 50 Genre Reference Profiles</h3>
              <p className="ai-master-section-desc">
                Pick a genre-specific profile. Each one targets professional loudness, EQ balance,
                and dynamics for that style. Upload a track, select a profile, then master.
              </p>

              {/* Smart Upload for profiles mode */}
              {!smartUploadFile && (
                <div
                  className="ai-master-dropzone"
                  onClick={() => smartFileInputRef.current?.click()}
                >
                  <span className="ai-master-upload-icon">{"\u{1F4CB}"}</span>
                  <span>Upload track to master with a genre profile</span>
                  <small>MP3, WAV, or FLAC — Max 100MB</small>
                </div>
              )}
              {smartUploadFile && (
                <div className="ai-master-smart-file-info">
                  <span>{"\u{1F3B5}"} {smartUploadFile.name}</span>
                  <button className="ai-master-change-file" onClick={() => smartFileInputRef.current?.click()}>
                    Change
                  </button>
                </div>
              )}
              <input
                ref={smartFileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={handleSmartFileSelect}
                style={{ display: "none" }}
              />

              {/* Profiles Grid */}
              {genreProfiles && (
                <div className="ai-master-profiles-grid">
                  {Object.entries(genreProfiles).map(([genre, profiles]) => (
                    <div key={genre} className="ai-master-genre-group">
                      <h4 className="ai-master-genre-group-title">{genre}</h4>
                      <div className="ai-master-profile-buttons">
                        {profiles.map((profile) => (
                          <button
                            key={profile.id}
                            className={
                              "ai-master-profile-btn" +
                              (selectedProfile === profile.id ? " selected" : "")
                            }
                            onClick={() => setSelectedProfile(profile.id)}
                          >
                            <span className="ai-profile-name">{profile.name}</span>
                            <span className="ai-profile-lufs">{profile.target_lufs} LUFS</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Master with Profile — DSP (smart-master) + Reference (profile-reference-master) */}
              {selectedProfile && smartUploadFile && (
                <div className="ai-master-action ai-master-profile-actions" style={{ marginTop: "1.5rem" }}>
                  <button
                    className="ai-master-btn"
                    onClick={handleSmartMaster}
                    disabled={processing}
                  >
                    {processing && !profileMastering
                      ? "Mastering... " + progress + "%"
                      : "\u{1F39A}\uFE0F DSP Master with \"" + selectedProfile.replace(/_/g, " ") + "\""}
                  </button>
                  <button
                    className="ai-master-btn ai-master-btn-ref"
                    onClick={handleProfileReferenceMaster}
                    disabled={processing}
                  >
                    {profileMastering
                      ? "Reference Mastering... " + progress + "%"
                      : "\u{1F9E0} Reference Master with \"" + selectedProfile.replace(/_/g, " ") + "\""}
                  </button>
                  <p className="ai-master-section-desc" style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
                    DSP uses signal-chain processing. Reference uses Matchering to match a pro reference track
                    (if available for this profile).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* =============================================== */}
          {/* Action Button (Phase 1 + 2 modes only) */}
          {/* =============================================== */}
          {masteringMode !== "smart" && masteringMode !== "profiles" && (
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
          )}

          {/* Progress bar for Phase 3 modes */}
          {(masteringMode === "smart" || masteringMode === "profiles") && processing && (
            <div className="ai-master-action">
              <div className="ai-master-progress">
                <div
                  className="ai-master-progress-fill"
                  style={{ width: progress + "%" }}
                ></div>
              </div>
            </div>
          )}

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
                {result.method === "smart_auto" &&
                  "\u{1F916} Smart Auto-Detect"}
                {result.method === "profile" &&
                  "\u{1F4CB} Genre Profile"}
                {result.method === "profile_reference" &&
                  "\u{1F9E0} Profile Reference (Matchering)"}
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
                    {result.preset?.name || result.reference?.name || result.recommended_preset || result.preset_used || "--"}
                  </span>
                </div>
              </div>

              {/* Smart Master confidence + reason (Phase 3) */}
              {result.confidence && (
                <div className="ai-master-smart-result">
                  <span className="ai-master-confidence-badge">
                    {"\u{1F916}"} {result.confidence}% confidence
                  </span>
                  {result.reason && (
                    <p className="ai-recommended-reason">{result.reason}</p>
                  )}
                </div>
              )}

              {/* A/B Comparison Player */}
              <div className="ai-master-comparison">
                <h4>{"\u{1F50A}"} A/B Compare</h4>
                {comparisonData && (
                  <div className="ai-master-comparison-info">
                    <small>
                      {comparisonData.has_mastered
                        ? "\u2705 Server-verified mastered version"
                        : "\u{1F4C2} Using session data"}
                      {comparisonData.preset_used && (" \u2014 Preset: " + comparisonData.preset_used)}
                    </small>
                  </div>
                )}
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
                  src={getOriginalSrc()}
                  onEnded={() => setPlayingOriginal(false)}
                  crossOrigin="anonymous"
                />
                <audio
                  ref={masteredAudioRef}
                  src={getMasteredSrc()}
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

          {/* =============================================== */}
          {/* Previously Mastered — A/B player when selecting */}
          {/* a mastered track from library (no new result)   */}
          {/* Uses GET /api/ai/mastering/compare/<id> data    */}
          {/* =============================================== */}
          {!result && comparisonData?.has_mastered && selectedTrack && (
            <div className="ai-master-results">
              <h3>{"\u{1F50A}"} Previously Mastered</h3>
              <div className="ai-master-comparison-info">
                <small>
                  {"\u2705"} This track was mastered previously
                  {comparisonData.preset_used && (" \u2014 Preset: " + comparisonData.preset_used)}
                </small>
              </div>
              <div className="ai-master-comparison">
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
                  src={getOriginalSrc()}
                  onEnded={() => setPlayingOriginal(false)}
                  crossOrigin="anonymous"
                />
                <audio
                  ref={masteredAudioRef}
                  src={getMasteredSrc()}
                  onEnded={() => setPlayingMastered(false)}
                  crossOrigin="anonymous"
                />
              </div>
              <div className="ai-master-download">
                <a
                  href={comparisonData.mastered_url}
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