// =============================================================================
// AIPlaylistCuration.js — Smart Playlist Generation Component
// =============================================================================
// Place in: src/front/js/component/AIPlaylistCuration.js
// Import into AIRadioDJ.js or use standalone
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";

const AIPlaylistCuration = ({ stationId, stationName, stationGenre }) => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  // === STATE ===
  const [library, setLibrary] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [strategies, setStrategies] = useState({});
  const [selectedStrategy, setSelectedStrategy] = useState("energy_arc");
  const [generatedPlaylist, setGeneratedPlaylist] = useState(null);
  const [insights, setInsights] = useState(null);
  const [currentPlaylistIds, setCurrentPlaylistIds] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [moodFilter, setMoodFilter] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [targetDuration, setTargetDuration] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeView, setActiveView] = useState("library"); // library | playlist
  const [dragIndex, setDragIndex] = useState(null);

  // === FETCH LIBRARY ===
  const fetchLibrary = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${backendUrl}/api/ai/radio/${stationId}/library`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setLibrary(data.tracks || []);
        setStrategies(data.strategies || {});
        setCurrentPlaylistIds(data.current_playlist_ids || []);
      } else {
        setError(data.error || "Failed to load library");
      }
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, [stationId, backendUrl, token]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // === TRACK SELECTION ===
  const toggleTrack = (trackId) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTracks(new Set(filteredLibrary.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedTracks(new Set());
  };

  const selectByGenre = (genre) => {
    const ids = library.filter((t) => t.genre === genre).map((t) => t.id);
    setSelectedTracks((prev) => new Set([...prev, ...ids]));
  };

  // === FILTERS ===
  const availableGenres = [...new Set(library.map((t) => t.genre).filter(Boolean))].sort();
  const availableMoods = [...new Set(library.map((t) => t.mood).filter(Boolean))].sort();

  const filteredLibrary = library
    .filter((t) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          (t.title || "").toLowerCase().includes(q) ||
          (t.artist || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .filter((t) => !genreFilter || t.genre === genreFilter)
    .filter((t) => !moodFilter || (t.mood || "").toLowerCase() === moodFilter.toLowerCase())
    .sort((a, b) => {
      switch (sortBy) {
        case "energy":
          return b.energy - a.energy;
        case "bpm":
          return (b.bpm || 0) - (a.bpm || 0);
        case "genre":
          return (a.genre || "").localeCompare(b.genre || "");
        case "recent":
          return (b.uploaded_at || "").localeCompare(a.uploaded_at || "");
        case "title":
        default:
          return (a.title || "").localeCompare(b.title || "");
      }
    });

  // === GENERATE PLAYLIST ===
  const generatePlaylist = async () => {
    if (selectedTracks.size === 0) {
      setError("Select at least 1 track");
      return;
    }
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const body = {
        track_ids: [...selectedTracks],
        strategy: selectedStrategy,
      };
      if (targetDuration) {
        body.target_duration_minutes = parseInt(targetDuration);
      }

      const res = await fetch(
        `${backendUrl}/api/ai/radio/${stationId}/generate-playlist`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setGeneratedPlaylist(data.playlist);
        setInsights(data.insights);
        setActiveView("playlist");
      } else {
        setError(data.error || "Failed to generate playlist");
      }
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setGenerating(false);
    }
  };

  // === APPLY PLAYLIST ===
  const applyPlaylist = async () => {
    if (!generatedPlaylist) return;
    setApplying(true);
    setError(null);

    try {
      const res = await fetch(
        `${backendUrl}/api/ai/radio/${stationId}/apply-playlist`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playlist: generatedPlaylist,
            strategy: selectedStrategy,
            loop_duration_minutes: targetDuration ? parseInt(targetDuration) : 180,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setCurrentPlaylistIds(generatedPlaylist.map((t) => t.id));
      } else {
        setError(data.error || "Failed to apply playlist");
      }
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setApplying(false);
    }
  };

  // === DRAG REORDER ===
  const handleDragStart = (index) => setDragIndex(index);

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...generatedPlaylist];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    // Update positions
    updated.forEach((t, i) => (t.position = i + 1));
    setGeneratedPlaylist(updated);
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  // === MOVE TRACK IN PLAYLIST ===
  const moveTrack = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= generatedPlaylist.length) return;
    const updated = [...generatedPlaylist];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((t, i) => (t.position = i + 1));
    setGeneratedPlaylist(updated);
  };

  const removeFromPlaylist = (index) => {
    const updated = generatedPlaylist.filter((_, i) => i !== index);
    updated.forEach((t, i) => (t.position = i + 1));
    setGeneratedPlaylist(updated);
  };

  // === ENERGY BAR ===
  const EnergyBar = ({ energy, size = "normal" }) => {
    const pct = Math.round((energy || 0) * 100);
    const color =
      pct >= 75 ? "#ff4757" : pct >= 50 ? "#ffa726" : pct >= 25 ? "#00ffc8" : "#4a9eff";
    return (
      <div
        className="energy-bar-container"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          minWidth: size === "small" ? "60px" : "90px",
        }}
      >
        <div
          style={{
            flex: 1,
            height: size === "small" ? "4px" : "6px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "3px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", minWidth: "28px" }}>
          {pct}%
        </span>
      </div>
    );
  };

  // === ENERGY FLOW CHART ===
  const EnergyFlowChart = ({ energyFlow }) => {
    if (!energyFlow || energyFlow.length === 0) return null;
    const max = Math.max(...energyFlow, 0.01);
    const chartHeight = 60;
    return (
      <div style={{ marginTop: "12px" }}>
        <h4 style={{ color: "#ffa726", fontSize: "0.8rem", marginBottom: "8px" }}>
          📈 Energy Flow
        </h4>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "2px",
            height: `${chartHeight}px`,
            padding: "0 4px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
          }}
        >
          {energyFlow.map((e, i) => {
            const h = (e / max) * chartHeight;
            const color =
              e >= 0.75 ? "#ff4757" : e >= 0.5 ? "#ffa726" : e >= 0.25 ? "#00ffc8" : "#4a9eff";
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  background: color,
                  borderRadius: "2px 2px 0 0",
                  minWidth: "3px",
                  maxWidth: "20px",
                  transition: "height 0.3s ease",
                }}
                title={`Track ${i + 1}: ${Math.round(e * 100)}% energy`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // === RENDER ===
  return (
    <div className="ai-playlist-curation" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🎵 AI Playlist Curation</h2>
        <p style={styles.subtitle}>
          {stationName ? `Building playlist for "${stationName}"` : "Select tracks and let AI build the perfect set"}
        </p>
      </div>

      {/* Messages */}
      {error && <div style={styles.errorMsg}>❌ {error}</div>}
      {success && <div style={styles.successMsg}>✅ {success}</div>}

      {/* Tab Switcher */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeView === "library" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveView("library")}
        >
          📚 Library ({filteredLibrary.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeView === "playlist" ? styles.tabActive : {}),
          }}
          onClick={() => setActiveView("playlist")}
          disabled={!generatedPlaylist}
        >
          📋 Generated Playlist{" "}
          {generatedPlaylist ? `(${generatedPlaylist.length})` : ""}
        </button>
      </div>

      {/* ========================================= */}
      {/* LIBRARY VIEW */}
      {/* ========================================= */}
      {activeView === "library" && (
        <div>
          {/* Strategy Selector */}
          <div style={styles.strategySection}>
            <h3 style={styles.sectionTitle}>🧠 AI Strategy</h3>
            <div style={styles.strategyGrid}>
              {Object.entries(strategies).map(([key, info]) => (
                <button
                  key={key}
                  style={{
                    ...styles.strategyCard,
                    ...(selectedStrategy === key ? styles.strategyCardActive : {}),
                  }}
                  onClick={() => setSelectedStrategy(key)}
                >
                  <span style={{ fontSize: "1.4rem" }}>{info.icon}</span>
                  <strong style={{ fontSize: "0.85rem" }}>{info.name}</strong>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>
                    {info.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters Bar */}
          <div style={styles.filtersBar}>
            <input
              type="text"
              placeholder="🔍 Search tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Genres</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Moods</option>
              {availableMoods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="title">Sort: Title</option>
              <option value="energy">Sort: Energy</option>
              <option value="bpm">Sort: BPM</option>
              <option value="genre">Sort: Genre</option>
              <option value="recent">Sort: Recent</option>
            </select>
          </div>

          {/* Selection Controls */}
          <div style={styles.selectionBar}>
            <span style={{ color: "#00ffc8", fontWeight: 600 }}>
              {selectedTracks.size} selected
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={selectAll} style={styles.smallBtn}>Select All</button>
              <button onClick={deselectAll} style={styles.smallBtn}>Clear</button>
              {availableGenres.slice(0, 4).map((g) => (
                <button
                  key={g}
                  onClick={() => selectByGenre(g)}
                  style={{ ...styles.smallBtn, fontSize: "0.7rem" }}
                >
                  + {g}
                </button>
              ))}
            </div>
          </div>

          {/* Target Duration */}
          <div style={styles.durationRow}>
            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
              Target Duration (minutes):
            </label>
            <input
              type="number"
              placeholder="e.g. 180"
              value={targetDuration}
              onChange={(e) => setTargetDuration(e.target.value)}
              style={{ ...styles.searchInput, maxWidth: "120px" }}
            />
          </div>

          {/* Track List */}
          {loading ? (
            <div style={styles.loadingMsg}>Loading your library...</div>
          ) : filteredLibrary.length === 0 ? (
            <div style={styles.emptyMsg}>
              <p>No tracks found. Upload music first in the Music section!</p>
            </div>
          ) : (
            <div style={styles.trackList}>
              {filteredLibrary.map((track) => {
                const isSelected = selectedTracks.has(track.id);
                const isInCurrent = currentPlaylistIds.includes(track.id);
                return (
                  <div
                    key={track.id}
                    style={{
                      ...styles.trackItem,
                      ...(isSelected ? styles.trackItemSelected : {}),
                      ...(isInCurrent ? styles.trackItemCurrent : {}),
                    }}
                    onClick={() => toggleTrack(track.id)}
                  >
                    <div style={styles.trackCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ accentColor: "#00ffc8" }}
                      />
                    </div>
                    <div style={styles.trackInfo}>
                      <div style={styles.trackTitle}>
                        {track.title}
                        {isInCurrent && (
                          <span style={styles.currentBadge}>Now Playing</span>
                        )}
                      </div>
                      <div style={styles.trackMeta}>
                        {track.artist}
                        {track.genre && <span style={styles.genrePill}>{track.genre}</span>}
                        {track.mood && <span style={styles.moodPill}>{track.mood}</span>}
                      </div>
                    </div>
                    <div style={styles.trackStats}>
                      {track.bpm && (
                        <span style={styles.statChip}>{track.bpm} BPM</span>
                      )}
                      {track.key && (
                        <span style={styles.statChip}>🎹 {track.key}</span>
                      )}
                      <span style={styles.statChip}>
                        {track.duration_formatted || "3:30"}
                      </span>
                    </div>
                    <div style={{ minWidth: "90px" }}>
                      <EnergyBar energy={track.energy} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate Button */}
          <div style={styles.generateSection}>
            <button
              style={{
                ...styles.generateBtn,
                opacity: selectedTracks.size === 0 || generating ? 0.5 : 1,
              }}
              onClick={generatePlaylist}
              disabled={selectedTracks.size === 0 || generating}
            >
              {generating
                ? "🧠 AI is building your playlist..."
                : `🎵 Generate Playlist (${selectedTracks.size} tracks)`}
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* PLAYLIST VIEW */}
      {/* ========================================= */}
      {activeView === "playlist" && generatedPlaylist && (
        <div>
          {/* Insights Panel */}
          {insights && (
            <div style={styles.insightsPanel}>
              <div style={styles.insightsGrid}>
                <div style={styles.insightCard}>
                  <span style={styles.insightValue}>{insights.total_tracks}</span>
                  <span style={styles.insightLabel}>Tracks</span>
                </div>
                <div style={styles.insightCard}>
                  <span style={styles.insightValue}>{insights.total_duration_formatted}</span>
                  <span style={styles.insightLabel}>Duration</span>
                </div>
                <div style={styles.insightCard}>
                  <span style={styles.insightValue}>{Math.round(insights.avg_energy * 100)}%</span>
                  <span style={styles.insightLabel}>Avg Energy</span>
                </div>
                <div style={styles.insightCard}>
                  <span style={styles.insightValue}>
                    {insights.avg_bpm ? `${insights.avg_bpm}` : "—"}
                  </span>
                  <span style={styles.insightLabel}>Avg BPM</span>
                </div>
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={styles.strategyBadge}>
                  {strategies[selectedStrategy]?.icon} {insights.strategy_used}
                </span>
                {insights.genres_used?.map((g) => (
                  <span key={g} style={styles.genrePill}>{g}</span>
                ))}
              </div>
              <EnergyFlowChart energyFlow={insights.energy_flow} />
            </div>
          )}

          {/* Playlist (draggable) */}
          <div style={styles.trackList}>
            {generatedPlaylist.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  ...styles.playlistItem,
                  ...(dragIndex === index ? { opacity: 0.5 } : {}),
                }}
              >
                <div style={styles.playlistPos}>
                  <span style={{ color: "#ffa726", fontWeight: 700 }}>{track.position}</span>
                </div>
                <div style={{ cursor: "grab", padding: "0 8px", color: "rgba(255,255,255,0.3)" }}>
                  ⠿
                </div>
                <div style={styles.trackInfo}>
                  <div style={styles.trackTitle}>{track.title}</div>
                  <div style={styles.trackMeta}>
                    {track.artist}
                    {track.genre && <span style={styles.genrePill}>{track.genre}</span>}
                    {track.key && <span style={styles.statChip}>🎹 {track.key}</span>}
                  </div>
                </div>
                <div style={{ minWidth: "80px" }}>
                  <EnergyBar energy={track.energy} size="small" />
                </div>
                <div style={styles.playlistActions}>
                  <button
                    onClick={() => moveTrack(index, -1)}
                    disabled={index === 0}
                    style={styles.moveBtn}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveTrack(index, 1)}
                    disabled={index === generatedPlaylist.length - 1}
                    style={styles.moveBtn}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeFromPlaylist(index)}
                    style={{ ...styles.moveBtn, color: "#ff4757" }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={styles.playlistActions2}>
            <button
              onClick={() => setActiveView("library")}
              style={styles.secondaryBtn}
            >
              ← Back to Library
            </button>
            <button
              onClick={generatePlaylist}
              style={styles.secondaryBtn}
              disabled={generating}
            >
              🔄 Regenerate
            </button>
            <button
              onClick={applyPlaylist}
              style={{
                ...styles.applyBtn,
                opacity: applying ? 0.5 : 1,
              }}
              disabled={applying}
            >
              {applying
                ? "Applying..."
                : `🚀 Apply to ${stationName || "Station"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// INLINE STYLES (dark theme matching StreamPireX)
// =============================================================================
const styles = {
  container: {
    background: "linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid rgba(0, 255, 200, 0.1)",
  },
  header: { marginBottom: "20px" },
  title: { color: "#fff", margin: "0 0 4px 0", fontSize: "1.4rem" },
  subtitle: { color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "0.9rem" },
  errorMsg: {
    background: "rgba(255,71,87,0.15)",
    border: "1px solid rgba(255,71,87,0.3)",
    color: "#ff6b81",
    padding: "10px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.85rem",
  },
  successMsg: {
    background: "rgba(0,255,200,0.1)",
    border: "1px solid rgba(0,255,200,0.3)",
    color: "#00ffc8",
    padding: "10px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.85rem",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "12px",
  },
  tab: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.6)",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s ease",
  },
  tabActive: {
    background: "rgba(0,255,200,0.15)",
    borderColor: "#00ffc8",
    color: "#00ffc8",
  },
  strategySection: { marginBottom: "20px" },
  sectionTitle: {
    color: "#ffa726",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "10px",
  },
  strategyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },
  strategyCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "rgba(255,255,255,0.8)",
    transition: "all 0.2s ease",
    textAlign: "left",
  },
  strategyCardActive: {
    background: "rgba(0,255,200,0.1)",
    borderColor: "#00ffc8",
    color: "#fff",
    boxShadow: "0 0 15px rgba(0,255,200,0.15)",
  },
  filtersBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "150px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    outline: "none",
  },
  filterSelect: {
    background: "#0d1b2a",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    outline: "none",
    cursor: "pointer",
  },
  selectionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  smallBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.7)",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    transition: "all 0.2s ease",
  },
  durationRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  trackList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "500px",
    overflowY: "auto",
    marginBottom: "16px",
  },
  trackItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    border: "1px solid transparent",
  },
  trackItemSelected: {
    background: "rgba(0,255,200,0.08)",
    borderColor: "rgba(0,255,200,0.25)",
  },
  trackItemCurrent: {
    borderLeft: "3px solid #ffa726",
  },
  trackCheckbox: { flexShrink: 0 },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitle: {
    color: "#fff",
    fontSize: "0.85rem",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  trackMeta: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "2px",
    flexWrap: "wrap",
  },
  trackStats: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexShrink: 0,
  },
  statChip: {
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.5)",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "0.7rem",
    whiteSpace: "nowrap",
  },
  genrePill: {
    background: "rgba(0,255,200,0.12)",
    color: "#00ffc8",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "0.65rem",
    fontWeight: 500,
  },
  moodPill: {
    background: "rgba(255,167,38,0.12)",
    color: "#ffa726",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "0.65rem",
  },
  currentBadge: {
    background: "rgba(255,167,38,0.2)",
    color: "#ffa726",
    padding: "1px 6px",
    borderRadius: "4px",
    fontSize: "0.6rem",
    fontWeight: 600,
  },
  generateSection: {
    textAlign: "center",
    padding: "16px 0",
  },
  generateBtn: {
    background: "linear-gradient(135deg, #00ffc8 0%, #00b894 100%)",
    color: "#0a1628",
    border: "none",
    padding: "14px 40px",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  loadingMsg: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    padding: "40px",
    fontSize: "0.9rem",
  },
  emptyMsg: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    padding: "40px",
  },
  // Playlist view styles
  insightsPanel: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
  },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
  },
  insightCard: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  insightValue: {
    color: "#00ffc8",
    fontSize: "1.3rem",
    fontWeight: 700,
  },
  insightLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  strategyBadge: {
    background: "rgba(0,255,200,0.15)",
    color: "#00ffc8",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginRight: "8px",
  },
  playlistItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.15s ease",
  },
  playlistPos: {
    minWidth: "30px",
    textAlign: "center",
  },
  playlistActions: {
    display: "flex",
    gap: "4px",
    flexShrink: 0,
  },
  moveBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.5)",
    width: "26px",
    height: "26px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    padding: 0,
  },
  playlistActions2: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    padding: "16px 0",
    flexWrap: "wrap",
  },
  secondaryBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s ease",
  },
  applyBtn: {
    background: "linear-gradient(135deg, #00ffc8 0%, #00b894 100%)",
    color: "#0a1628",
    border: "none",
    padding: "12px 30px",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

export default AIPlaylistCuration;