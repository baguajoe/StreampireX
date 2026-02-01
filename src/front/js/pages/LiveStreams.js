// src/front/js/pages/LiveStreams.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PollComponent from "../component/PollComponent";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import "../../styles/liveStream.css";

const LiveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  const fetchLiveStreams = async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("Backend URL not configured");
      }

      const response = await fetch(`${backendUrl}/api/live-streams`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      const streams = Array.isArray(data) ? data : data.streams || data.live_streams || [];
      setLiveStreams(streams);
    } catch (err) {
      console.error("Error fetching live streams:", err);
      setError("Unable to load live streams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = liveStreams.filter((stream) => {
    const matchesSearch =
      stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stream.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === "live") return matchesSearch && stream.is_live;
    if (filter === "upcoming") return matchesSearch && !stream.is_live;
    return matchesSearch;
  });

  const liveCount = liveStreams.filter((s) => s.is_live).length;

  if (loading) {
    return (
      <div className="live-streams-container">
        <div className="streams-loading">
          <div className="loading-spinner"></div>
          <p>Loading live streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-streams-container">
      {/* Header */}
      <div className="streams-header">
        <div className="streams-title-row">
          <h1>🎥 Live Streams</h1>
          {liveCount > 0 && (
            <span className="live-count-badge">
              <span className="live-dot"></span>
              {liveCount} Live Now
            </span>
          )}
        </div>

        <div className="streams-controls">
          <input
            type="text"
            placeholder="Search live streams..."
            className="streams-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="streams-filters">
            <button className={`filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`filter-btn ${filter === "live" ? "active" : ""}`} onClick={() => setFilter("live")}>🔴 Live</button>
            <button className={`filter-btn ${filter === "upcoming" ? "active" : ""}`} onClick={() => setFilter("upcoming")}>📅 Upcoming</button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="streams-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchLiveStreams} className="retry-btn">🔄 Retry</button>
        </div>
      )}

      {/* Go Live Banner */}
      <div className="go-live-banner">
        <div className="go-live-content">
          <h3>Ready to go live?</h3>
          <p>Start streaming to your audience in seconds</p>
        </div>
        <Link to="/go-live" className="go-live-btn">🎙️ Go Live</Link>
      </div>

      {/* Stream Grid */}
      <div className="live-stream-grid">
        {filteredStreams.length > 0 ? (
          filteredStreams.map((stream) => (
            <div key={stream.id} className={`live-stream-card ${stream.is_live ? "is-live" : "is-offline"}`}>
              {/* Thumbnail */}
              <div className="stream-thumbnail">
                {stream.is_live ? (
                  stream.thumbnail_url ? (
                    <img src={stream.thumbnail_url} alt={stream.title} className="stream-thumb-img" />
                  ) : (
                    <div className="stream-thumb-placeholder"><span>🎬</span></div>
                  )
                ) : (
                  <div className="stream-thumb-placeholder offline">
                    <span>📺</span>
                    <p>Offline</p>
                  </div>
                )}
                {stream.is_live && (
                  <div className="stream-live-badge">
                    <span className="live-dot"></span>LIVE
                  </div>
                )}
                {stream.viewer_count > 0 && (
                  <div className="stream-viewer-count">👁 {stream.viewer_count}</div>
                )}
              </div>

              {/* Info */}
              <div className="stream-info">
                <h3 className="stream-title">{stream.title || "Untitled Stream"}</h3>
                {stream.description && <p className="stream-description">{stream.description}</p>}

                <div className="stream-meta">
                  <div className="stream-author">
                    {stream.user?.profile_picture && (
                      <img src={stream.user.profile_picture} alt={stream.user.username} className="author-avatar" />
                    )}
                    <span className="author-name">
                      {stream.user?.display_name || stream.user?.username || stream.streamer_name || "Anonymous"}
                    </span>
                  </div>
                  {stream.category && <span className="stream-category">{stream.category}</span>}
                </div>

                <div className="stream-actions">
                  <Link to={`/live-streams/${stream.id}`} className="watch-btn">
                    {stream.is_live ? "▶ Watch" : "View Details"}
                  </Link>
                  {stream.is_live && stream.has_poll && <span className="poll-indicator">📊 Poll Active</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="streams-empty">
            <div className="empty-icon">📡</div>
            <h3>No streams found</h3>
            <p>{searchQuery ? "Try a different search term" : "No one is streaming right now. Be the first!"}</p>
            <Link to="/go-live" className="go-live-btn">🎙️ Start Streaming</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreams;