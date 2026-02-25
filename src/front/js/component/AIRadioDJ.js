// src/front/js/component/AIRadioDJ.js
// =====================================================
// AI RADIO DJ DASHBOARD — StreamPireX
// =====================================================
// Lets creators:
//   1. Enable AI DJ on their radio station
//   2. Pick a DJ persona (Smooth Mike, DJ Blaze, Luna, etc.)
//   3. Configure schedule rules (break frequency, types)
//   4. Test DJ breaks (hear them before going live)
//   5. View break history and listener requests
// =====================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import "../../styles/AIRadioDJ.css";

const AIRadioDJ = () => {
  // =================== STATE ===================
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [breakTypes, setBreakTypes] = useState([]);
  const [capabilities, setCapabilities] = useState(null);
  const [djConfig, setDjConfig] = useState(null);

  const [selectedPersona, setSelectedPersona] = useState("auto_dj");
  const [selectedBreakType, setSelectedBreakType] = useState("song_intro");
  const [djEnabled, setDjEnabled] = useState(false);

  // Schedule rules
  const [rules, setRules] = useState({
    songs_between_breaks: 3,
    station_id_interval_minutes: 30,
    time_check_interval_minutes: 60,
    shoutout_interval_minutes: 45,
    crossfade_duration_seconds: 3,
    enable_song_intros: true,
    enable_station_ids: true,
    enable_time_checks: true,
    enable_shoutouts: true,
    enable_mood_sets: true,
  });

  // Testing
  const [generatedScript, setGeneratedScript] = useState("");
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlayingBreak, setIsPlayingBreak] = useState(false);
  const [testLastSong, setTestLastSong] = useState("");
  const [testLastArtist, setTestLastArtist] = useState("");
  const [testNextSong, setTestNextSong] = useState("");
  const [testNextArtist, setTestNextArtist] = useState("");

  // Listener request
  const [requestSong, setRequestSong] = useState("");
  const [requestArtist, setRequestArtist] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  // UI
  const [activeTab, setActiveTab] = useState("setup");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const audioRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  // =================== DATA FETCHING ===================

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/radio/dashboard", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        // /api/radio/dashboard returns an array directly (not {stations: [...]})
        setStations(Array.isArray(data) ? data : data.stations || []);
      }
    } catch (err) {
      console.error("Failed to fetch stations:", err);
    }
  }, [BACKEND_URL, token]);

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/radio/personas");
      if (res.ok) {
        const data = await res.json();
        setPersonas(data.personas || []);
      }
    } catch (err) {
      console.error("Failed to fetch personas:", err);
    }
  }, [BACKEND_URL]);

  const fetchBreakTypes = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/radio/break-types");
      if (res.ok) {
        const data = await res.json();
        setBreakTypes(data.break_types || []);
      }
    } catch (err) {
      console.error("Failed to fetch break types:", err);
    }
  }, [BACKEND_URL]);

  const fetchCapabilities = useCallback(async () => {
    try {
      const res = await fetch(BACKEND_URL + "/api/ai/radio/capabilities");
      if (res.ok) {
        setCapabilities(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch capabilities:", err);
    }
  }, [BACKEND_URL]);

  const fetchDjConfig = useCallback(async (stationId) => {
    try {
      const res = await fetch(
        BACKEND_URL + "/api/ai/radio/station/" + stationId + "/config",
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setDjConfig(data);
        setDjEnabled(data.dj_enabled || false);
        setSelectedPersona(data.persona || "auto_dj");
        if (data.schedule_rules) {
          setRules(prev => ({ ...prev, ...data.schedule_rules }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch DJ config:", err);
    }
  }, [BACKEND_URL, token]);

  useEffect(() => {
    Promise.all([fetchStations(), fetchPersonas(), fetchBreakTypes(), fetchCapabilities()])
      .finally(() => setLoading(false));
  }, [fetchStations, fetchPersonas, fetchBreakTypes, fetchCapabilities]);

  useEffect(() => {
    if (selectedStation) {
      fetchDjConfig(selectedStation.id);
    }
  }, [selectedStation, fetchDjConfig]);

  // =================== ACTIONS ===================

  const saveConfig = async () => {
    if (!selectedStation) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        BACKEND_URL + "/api/ai/radio/station/" + selectedStation.id + "/config",
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            enabled: djEnabled,
            persona: selectedPersona,
            rules,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess(data.message || "Configuration saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const generateTestScript = async () => {
    if (!selectedStation) return;
    setIsGenerating(true);
    setError("");
    setGeneratedScript("");
    setGeneratedAudioUrl("");

    try {
      const res = await fetch(BACKEND_URL + "/api/ai/radio/generate-script", {
        method: "POST",
        headers,
        body: JSON.stringify({
          station_id: selectedStation.id,
          persona: selectedPersona,
          break_type: selectedBreakType,
          last_song: testLastSong || "Summer Vibes",
          last_artist: testLastArtist || "DJ Cool",
          next_song: testNextSong || "Night Drive",
          next_artist: testNextArtist || "The Waves",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");
      setGeneratedScript(data.script);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTestBreak = async () => {
    if (!selectedStation) return;
    setIsGenerating(true);
    setError("");
    setGeneratedAudioUrl("");

    try {
      const res = await fetch(BACKEND_URL + "/api/ai/radio/generate-break", {
        method: "POST",
        headers,
        body: JSON.stringify({
          station_id: selectedStation.id,
          persona: selectedPersona,
          break_type: selectedBreakType,
          last_song: testLastSong || "Summer Vibes",
          last_artist: testLastArtist || "DJ Cool",
          next_song: testNextSong || "Night Drive",
          next_artist: testNextArtist || "The Waves",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Break generation failed");
      setGeneratedScript(data.script);
      setGeneratedAudioUrl(data.audio_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerLiveBreak = async () => {
    if (!selectedStation) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch(
        BACKEND_URL + "/api/ai/radio/station/" + selectedStation.id + "/next-break",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ break_type: selectedBreakType }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Break trigger failed");
      setGeneratedScript(data.script);
      setGeneratedAudioUrl(data.audio_url);
      setSuccess("DJ break generated and queued!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitRequest = async () => {
    if (!selectedStation || !requestSong) return;
    setError("");

    try {
      const res = await fetch(
        BACKEND_URL + "/api/ai/radio/station/" + selectedStation.id + "/request",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            song_title: requestSong,
            artist: requestArtist,
            message: requestMessage,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setSuccess(data.message);
      setRequestSong("");
      setRequestArtist("");
      setRequestMessage("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePlayBreak = () => {
    if (!audioRef.current || !generatedAudioUrl) return;
    if (isPlayingBreak) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = generatedAudioUrl;
      audioRef.current.play();
    }
    setIsPlayingBreak(!isPlayingBreak);
  };

  // =================== RENDER ===================

  const currentPersona = personas.find(p => p.id === selectedPersona);

  return (
    <div className="ai-dj-page">
      {/* ========== HEADER ========== */}
      <div className="ai-dj-header">
        <div className="ai-dj-header-content">
          <h1>
            <span className="ai-dj-icon">📻</span> AI Radio DJ
          </h1>
          <p>
            Automate your radio station with AI-powered DJs. Pick a persona,
            set the schedule, and let the AI handle talk breaks, station IDs,
            and listener shoutouts — 24/7.
          </p>
          <div className="ai-dj-status-badges">
            {capabilities && (
              <>
                <span className={"ai-dj-badge " + (capabilities.ai_script_generation ? "active" : "")}>
                  {capabilities.ai_script_generation ? "✅" : "⚠️"} AI Scripts
                </span>
                <span className={"ai-dj-badge " + (capabilities.tts_openai ? "active" : "")}>
                  {capabilities.tts_openai ? "✅" : "⚠️"} OpenAI TTS
                </span>
                <span className={"ai-dj-badge " + (capabilities.audio_stitching ? "active" : "")}>
                  {capabilities.audio_stitching ? "✅" : "⚠️"} Audio Stitching
                </span>
                <span className="ai-dj-badge active">
                  🤖 {capabilities.total_personas} Personas
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="ai-dj-layout">
        {/* ========== SIDEBAR: Station Selector ========== */}
        <div className="ai-dj-sidebar">
          <h3>📡 Your Stations</h3>
          {loading ? (
            <div className="ai-dj-loading">
              <div className="ai-dj-spinner"></div>
              <p>Loading stations...</p>
            </div>
          ) : stations.length === 0 ? (
            <div className="ai-dj-empty">
              <span>📻</span>
              <p>No radio stations yet</p>
              <small>Create a station first</small>
            </div>
          ) : (
            <div className="ai-dj-station-list">
              {stations.map(station => (
                <div
                  key={station.id}
                  className={"ai-dj-station-item" + (selectedStation?.id === station.id ? " selected" : "")}
                  onClick={() => {
                    setSelectedStation(station);
                    setError("");
                    setSuccess("");
                    setGeneratedScript("");
                    setGeneratedAudioUrl("");
                  }}
                >
                  <div className="ai-dj-station-info">
                    <span className="ai-dj-station-name">{station.name}</span>
                    <span className="ai-dj-station-meta">
                      {station.genre || (station.genres && station.genres[0]) || "Music"}
                      {station.is_live && <span className="ai-dj-live-dot">● LIVE</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          {selectedStation && (
            <div className="ai-dj-tabs">
              {["setup", "test", "schedule", "requests"].map(tab => (
                <button
                  key={tab}
                  className={"ai-dj-tab" + (activeTab === tab ? " active" : "")}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "setup" && "🎙️ Setup"}
                  {tab === "test" && "🧪 Test"}
                  {tab === "schedule" && "⏰ Schedule"}
                  {tab === "requests" && "📩 Requests"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========== MAIN CONTENT ========== */}
        <div className="ai-dj-main">
          {!selectedStation ? (
            <div className="ai-dj-placeholder">
              <span className="ai-dj-placeholder-icon">🎙️</span>
              <h2>Select a Radio Station</h2>
              <p>Choose a station from the left to configure its AI DJ.</p>
            </div>
          ) : (
            <>
              {/* Station Header */}
              <div className="ai-dj-station-header">
                <div className="ai-dj-station-title">
                  <h2>{selectedStation.name}</h2>
                  <span className="ai-dj-station-genre">
                    {selectedStation.genre || (selectedStation.genres && selectedStation.genres[0]) || "Music"}
                  </span>
                </div>
                <div className="ai-dj-toggle-wrap">
                  <label className="ai-dj-toggle">
                    <input
                      type="checkbox"
                      checked={djEnabled}
                      onChange={(e) => setDjEnabled(e.target.checked)}
                    />
                    <span className="ai-dj-toggle-slider"></span>
                  </label>
                  <span className="ai-dj-toggle-label">
                    {djEnabled ? "🟢 AI DJ Active" : "⚫ AI DJ Off"}
                  </span>
                </div>
              </div>

              {/* ======== SETUP TAB ======== */}
              {activeTab === "setup" && (
                <div className="ai-dj-section">
                  <h3>Choose Your DJ Persona</h3>
                  <p className="ai-dj-section-desc">
                    Each persona has a unique voice, personality, and style.
                    Pick one that matches your station's vibe.
                  </p>
                  <div className="ai-dj-persona-grid">
                    {personas.map(persona => (
                      <div
                        key={persona.id}
                        className={"ai-dj-persona-card" + (selectedPersona === persona.id ? " selected" : "")}
                        onClick={() => setSelectedPersona(persona.id)}
                      >
                        <span className="ai-dj-persona-icon">{persona.icon}</span>
                        <span className="ai-dj-persona-name">{persona.name}</span>
                        <span className="ai-dj-persona-desc">{persona.personality}</span>
                        <div className="ai-dj-persona-genres">
                          {persona.genres.length > 0
                            ? persona.genres.slice(0, 3).map(g => (
                              <span key={g} className="ai-dj-genre-tag">{g}</span>
                            ))
                            : <span className="ai-dj-genre-tag all">All Genres</span>
                          }
                        </div>
                        <span className="ai-dj-persona-voice">Voice: {persona.voice}</span>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="ai-dj-save-row">
                    <button
                      className="ai-dj-save-btn"
                      onClick={saveConfig}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "💾 Save Configuration"}
                    </button>
                  </div>
                </div>
              )}

              {/* ======== TEST TAB ======== */}
              {activeTab === "test" && (
                <div className="ai-dj-section">
                  <h3>🧪 Test DJ Breaks</h3>
                  <p className="ai-dj-section-desc">
                    Preview what your AI DJ will say. Enter song info or use defaults.
                  </p>

                  {/* Break Type Selector */}
                  <div className="ai-dj-break-types">
                    {breakTypes.map(bt => (
                      <button
                        key={bt.id}
                        className={"ai-dj-break-btn" + (selectedBreakType === bt.id ? " selected" : "")}
                        onClick={() => setSelectedBreakType(bt.id)}
                      >
                        {bt.id === "song_intro" && "🎵"}
                        {bt.id === "station_id" && "📻"}
                        {bt.id === "time_check" && "🕐"}
                        {bt.id === "shoutout" && "📣"}
                        {bt.id === "mood_set" && "🎭"}
                        {" "}{bt.description}
                      </button>
                    ))}
                  </div>

                  {/* Test Inputs */}
                  <div className="ai-dj-test-inputs">
                    <div className="ai-dj-input-row">
                      <div className="ai-dj-input-group">
                        <label>Last Song</label>
                        <input
                          type="text"
                          value={testLastSong}
                          onChange={(e) => setTestLastSong(e.target.value)}
                          placeholder="Summer Vibes"
                        />
                      </div>
                      <div className="ai-dj-input-group">
                        <label>Last Artist</label>
                        <input
                          type="text"
                          value={testLastArtist}
                          onChange={(e) => setTestLastArtist(e.target.value)}
                          placeholder="DJ Cool"
                        />
                      </div>
                    </div>
                    <div className="ai-dj-input-row">
                      <div className="ai-dj-input-group">
                        <label>Next Song</label>
                        <input
                          type="text"
                          value={testNextSong}
                          onChange={(e) => setTestNextSong(e.target.value)}
                          placeholder="Night Drive"
                        />
                      </div>
                      <div className="ai-dj-input-group">
                        <label>Next Artist</label>
                        <input
                          type="text"
                          value={testNextArtist}
                          onChange={(e) => setTestNextArtist(e.target.value)}
                          placeholder="The Waves"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generate Buttons */}
                  <div className="ai-dj-generate-btns">
                    <button
                      className="ai-dj-gen-btn script"
                      onClick={generateTestScript}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Generating..." : "📝 Generate Script Only"}
                    </button>
                    <button
                      className="ai-dj-gen-btn audio"
                      onClick={generateTestBreak}
                      disabled={isGenerating}
                    >
                      {isGenerating ? "Generating..." : "🔊 Generate Script + Audio"}
                    </button>
                    {selectedStation?.is_live && (
                      <button
                        className="ai-dj-gen-btn live"
                        onClick={triggerLiveBreak}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Generating..." : "🎙️ Trigger Live Break"}
                      </button>
                    )}
                  </div>

                  {/* Generated Result */}
                  {generatedScript && (
                    <div className="ai-dj-result">
                      <div className="ai-dj-result-header">
                        <span className="ai-dj-result-persona">
                          {currentPersona?.icon} {currentPersona?.name}
                        </span>
                        <span className="ai-dj-result-type">{selectedBreakType}</span>
                      </div>
                      <div className="ai-dj-result-script">
                        "{generatedScript}"
                      </div>
                      {generatedAudioUrl && (
                        <div className="ai-dj-result-audio">
                          <button
                            className={"ai-dj-play-btn" + (isPlayingBreak ? " playing" : "")}
                            onClick={togglePlayBreak}
                          >
                            {isPlayingBreak ? "⏸ Pause" : "▶️ Play DJ Break"}
                          </button>
                          <audio
                            ref={audioRef}
                            onEnded={() => setIsPlayingBreak(false)}
                            crossOrigin="anonymous"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ======== SCHEDULE TAB ======== */}
              {activeTab === "schedule" && (
                <div className="ai-dj-section">
                  <h3>⏰ Automation Schedule</h3>
                  <p className="ai-dj-section-desc">
                    Control how often the DJ speaks and what types of breaks to include.
                  </p>

                  <div className="ai-dj-rules-grid">
                    {/* Songs between breaks */}
                    <div className="ai-dj-rule-card">
                      <label>🎵 Songs Between Breaks</label>
                      <div className="ai-dj-rule-control">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={rules.songs_between_breaks}
                          onChange={(e) => setRules(prev => ({
                            ...prev, songs_between_breaks: parseInt(e.target.value)
                          }))}
                        />
                        <span className="ai-dj-rule-value">{rules.songs_between_breaks}</span>
                      </div>
                      <small>DJ talks every {rules.songs_between_breaks} songs</small>
                    </div>

                    {/* Station ID interval */}
                    <div className="ai-dj-rule-card">
                      <label>📻 Station ID Interval</label>
                      <div className="ai-dj-rule-control">
                        <input
                          type="range"
                          min="15"
                          max="120"
                          step="15"
                          value={rules.station_id_interval_minutes}
                          onChange={(e) => setRules(prev => ({
                            ...prev, station_id_interval_minutes: parseInt(e.target.value)
                          }))}
                        />
                        <span className="ai-dj-rule-value">{rules.station_id_interval_minutes}m</span>
                      </div>
                      <small>Station identification every {rules.station_id_interval_minutes} minutes</small>
                    </div>

                    {/* Time check interval */}
                    <div className="ai-dj-rule-card">
                      <label>🕐 Time Check Interval</label>
                      <div className="ai-dj-rule-control">
                        <input
                          type="range"
                          min="30"
                          max="180"
                          step="15"
                          value={rules.time_check_interval_minutes}
                          onChange={(e) => setRules(prev => ({
                            ...prev, time_check_interval_minutes: parseInt(e.target.value)
                          }))}
                        />
                        <span className="ai-dj-rule-value">{rules.time_check_interval_minutes}m</span>
                      </div>
                      <small>Time and vibe check every {rules.time_check_interval_minutes} minutes</small>
                    </div>

                    {/* Crossfade duration */}
                    <div className="ai-dj-rule-card">
                      <label>🔀 Crossfade Duration</label>
                      <div className="ai-dj-rule-control">
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={rules.crossfade_duration_seconds}
                          onChange={(e) => setRules(prev => ({
                            ...prev, crossfade_duration_seconds: parseInt(e.target.value)
                          }))}
                        />
                        <span className="ai-dj-rule-value">{rules.crossfade_duration_seconds}s</span>
                      </div>
                      <small>Smooth fade between DJ voice and music</small>
                    </div>
                  </div>

                  {/* Break Type Toggles */}
                  <h4 className="ai-dj-sub-header">Enable/Disable Break Types</h4>
                  <div className="ai-dj-toggles-grid">
                    {[
                      ["enable_song_intros", "🎵 Song Intros", "DJ introduces the next song"],
                      ["enable_station_ids", "📻 Station IDs", "\"You're listening to...\""],
                      ["enable_time_checks", "🕐 Time Checks", "Time and vibe updates"],
                      ["enable_shoutouts", "📣 Shoutouts", "Listener appreciation"],
                      ["enable_mood_sets", "🎭 Mood Sets", "Sets the vibe for next block"],
                    ].map(([key, label, desc]) => (
                      <div key={key} className="ai-dj-toggle-card">
                        <div className="ai-dj-toggle-info">
                          <span>{label}</span>
                          <small>{desc}</small>
                        </div>
                        <label className="ai-dj-toggle small">
                          <input
                            type="checkbox"
                            checked={rules[key]}
                            onChange={(e) => setRules(prev => ({
                              ...prev, [key]: e.target.checked
                            }))}
                          />
                          <span className="ai-dj-toggle-slider"></span>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Save Schedule */}
                  <div className="ai-dj-save-row">
                    <button
                      className="ai-dj-save-btn"
                      onClick={saveConfig}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "💾 Save Schedule"}
                    </button>
                  </div>
                </div>
              )}

              {/* ======== REQUESTS TAB ======== */}
              {activeTab === "requests" && (
                <div className="ai-dj-section">
                  <h3>📩 Listener Song Requests</h3>
                  <p className="ai-dj-section-desc">
                    Listeners can request songs. The AI DJ will acknowledge
                    requests in shoutout breaks.
                  </p>

                  <div className="ai-dj-request-form">
                    <div className="ai-dj-input-row">
                      <div className="ai-dj-input-group">
                        <label>Song Title</label>
                        <input
                          type="text"
                          value={requestSong}
                          onChange={(e) => setRequestSong(e.target.value)}
                          placeholder="Enter song name..."
                        />
                      </div>
                      <div className="ai-dj-input-group">
                        <label>Artist</label>
                        <input
                          type="text"
                          value={requestArtist}
                          onChange={(e) => setRequestArtist(e.target.value)}
                          placeholder="Enter artist..."
                        />
                      </div>
                    </div>
                    <div className="ai-dj-input-group full">
                      <label>Message (optional)</label>
                      <input
                        type="text"
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="Shoutout to my crew!"
                      />
                    </div>
                    <button
                      className="ai-dj-request-btn"
                      onClick={submitRequest}
                      disabled={!requestSong}
                    >
                      🎵 Submit Request
                    </button>
                  </div>
                </div>
              )}

              {/* ======== MESSAGES ======== */}
              {error && (
                <div className="ai-dj-error">
                  <span>❌</span> {error}
                </div>
              )}
              {success && (
                <div className="ai-dj-success">
                  <span>✅</span> {success}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRadioDJ;