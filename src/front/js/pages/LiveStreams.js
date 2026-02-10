// =============================================================================
// LiveStreams.js - Redesigned Live Streams Hub
// =============================================================================
// REPLACE your existing src/front/js/pages/LiveStreams.js with this file
// =============================================================================

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/liveStream.css";  // Matches your existing filename

const LiveStreams = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("live");
  const [liveStreams, setLiveStreams] = useState([]);
  const [scheduledStreams, setScheduledStreams] = useState([]);
  const [pastStreams, setPastStreams] = useState([]);
  const [featuredStreams, setFeaturedStreams] = useState([]);
  const [categories, setCategories] = useState(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchAllStreams();
    checkNotificationPermission();
  }, []);

  const fetchAllStreams = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      // Try fetching from multiple possible endpoints
      const endpoints = [
        { url: `${backendUrl}/api/streams/live`, setter: setLiveStreams, key: 'streams' },
        { url: `${backendUrl}/api/live-streams`, setter: setLiveStreams, key: 'streams' },
      ];

      // Try the first endpoint that works
      let streamsLoaded = false;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint.url, { headers });
          if (res.ok) {
            const data = await res.json();
            const streams = Array.isArray(data) ? data : data[endpoint.key] || data.live_streams || [];
            endpoint.setter(streams);
            setFeaturedStreams(streams.filter(s => s.is_live).slice(0, 3));
            streamsLoaded = true;
            break;
          }
        } catch (e) {
          console.log(`Endpoint ${endpoint.url} failed, trying next...`);
        }
      }

      if (!streamsLoaded) {
        // No streams endpoint worked, show empty state (not error)
        setLiveStreams([]);
        setError(null);
      }

      setCategories(defaultCategories);

    } catch (err) {
      console.error("Error fetching streams:", err);
      setError(null); // Don't show error, just empty state
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted');
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationEnabled(permission === 'granted');
    }
  };

  // Filter streams by category and search
  const filterStreams = (streams) => {
    return streams.filter(stream => {
      const matchesSearch = !searchQuery || 
        stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        stream.category?.toLowerCase() === selectedCategory.toLowerCase();
      
      return matchesSearch && matchesCategory;
    });
  };

  const filteredLive = filterStreams(liveStreams);
  const filteredScheduled = filterStreams(scheduledStreams);
  const filteredPast = filterStreams(pastStreams);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatViewers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="live-streams-page">
        <div className="streams-loading">
          <div className="loading-pulse"></div>
          <p>Loading streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-streams-page">
      {/* Hero Section */}
      <div className="streams-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>🎥 Live Streams</h1>
            <p>Watch live content from your favorite creators or start your own stream</p>
          </div>
          <div className="hero-actions">
            <Link to="/go-live" className="go-live-btn primary">
              <span className="btn-icon">🎙️</span>
              <span>Go Live</span>
            </Link>
            <Link to="/schedule-stream" className="schedule-btn">
              <span className="btn-icon">📅</span>
              <span>Schedule Stream</span>
            </Link>
          </div>
        </div>

        {/* Live Stats */}
        <div className="live-stats">
          <div className="stat-item">
            <span className="stat-value">
              <span className="live-pulse"></span>
              {liveStreams.filter(s => s.is_live).length}
            </span>
            <span className="stat-label">Live Now</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{scheduledStreams.length}</span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{pastStreams.length}</span>
            <span className="stat-label">VODs</span>
          </div>
        </div>
      </div>

      {/* Featured Live Streams */}
      {featuredStreams.length > 0 && (
        <section className="featured-section">
          <h2 className="section-title">🔥 Featured Live</h2>
          <div className="featured-grid">
            {featuredStreams.map((stream) => (
              <Link 
                key={stream.id} 
                to={`/live/${stream.id}`}
                className="featured-card"
              >
                <div className="featured-thumbnail">
                  {stream.thumbnail_url ? (
                    <img src={stream.thumbnail_url} alt={stream.title} />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <span>🎬</span>
                    </div>
                  )}
                  <div className="live-badge">
                    <span className="live-dot"></span>
                    LIVE
                  </div>
                  <div className="viewer-count">
                    👁 {formatViewers(stream.viewer_count)}
                  </div>
                </div>
                <div className="featured-info">
                  <div className="streamer-row">
                    <img 
                      src={stream.user?.profile_picture || stream.user?.avatar_url || '/default-avatar.png'} 
                      alt={stream.user?.username}
                      className="streamer-avatar"
                    />
                    <span className="streamer-name">
                      {stream.user?.display_name || stream.user?.username}
                    </span>
                  </div>
                  <h3 className="stream-title">{stream.title}</h3>
                  {stream.category && (
                    <span className="stream-category">{stream.category}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <div className="streams-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search streams, creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="category-filters">
          <button 
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug || cat.name}
              className={`category-btn ${selectedCategory === cat.slug ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.slug || cat.name)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Notification Toggle */}
        {!notificationEnabled && (
          <button className="notification-btn" onClick={enableNotifications}>
            🔔 Enable Live Notifications
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="streams-tabs">
        <button 
          className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <span className="live-indicator"></span>
          Live Now
          {filteredLive.length > 0 && (
            <span className="tab-count">{filteredLive.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          📅 Scheduled
          {filteredScheduled.length > 0 && (
            <span className="tab-count">{filteredScheduled.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'vods' ? 'active' : ''}`}
          onClick={() => setActiveTab('vods')}
        >
          📼 Past Streams
          {filteredPast.length > 0 && (
            <span className="tab-count">{filteredPast.length}</span>
          )}
        </button>
      </div>

      {/* Stream Content */}
      <div className="streams-content">
        {/* Live Now Tab */}
        {activeTab === 'live' && (
          <div className="streams-section">
            {filteredLive.length > 0 ? (
              <div className="streams-grid">
                {filteredLive.map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    type="live"
                    formatViewers={formatViewers}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon="📡"
                title="No one is live right now"
                description="Be the first to start streaming!"
                actionText="Go Live"
                actionLink="/go-live"
              />
            )}
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="streams-section">
            {filteredScheduled.length > 0 ? (
              <div className="streams-grid">
                {filteredScheduled.map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    type="scheduled"
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon="📅"
                title="No scheduled streams"
                description="Schedule your next stream to let followers know when you'll be live"
                actionText="Schedule Stream"
                actionLink="/schedule-stream"
              />
            )}
          </div>
        )}

        {/* Past Streams (VODs) Tab */}
        {activeTab === 'vods' && (
          <div className="streams-section">
            {filteredPast.length > 0 ? (
              <div className="streams-grid">
                {filteredPast.map((stream) => (
                  <StreamCard 
                    key={stream.id} 
                    stream={stream} 
                    type="vod"
                    formatDuration={formatDuration}
                    formatViewers={formatViewers}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon="📼"
                title="No past streams yet"
                description="When creators end their streams, replays will appear here"
              />
            )}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-content">
          <h3>💡 How Live Streaming Works</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-icon">🎙️</span>
              <h4>Go Live</h4>
              <p>Start streaming instantly with your webcam or connect OBS</p>
            </div>
            <div className="info-item">
              <span className="info-icon">🔔</span>
              <h4>Notify Followers</h4>
              <p>Your followers get notified when you go live</p>
            </div>
            <div className="info-item">
              <span className="info-icon">📼</span>
              <h4>Auto-Save VODs</h4>
              <p>Streams are automatically saved for replay</p>
            </div>
            <div className="info-item">
              <span className="info-icon">💰</span>
              <h4>Earn Money</h4>
              <p>Receive tips and donations from viewers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Stream Card Component
// =============================================================================

const StreamCard = ({ stream, type, formatViewers, formatDuration, formatDate }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (type === 'live') {
      navigate(`/live/${stream.id}`);
    } else if (type === 'vod') {
      navigate(`/vod/${stream.id}`);
    } else {
      navigate(`/stream/${stream.id}`);
    }
  };

  return (
    <div className={`stream-card ${type}`} onClick={handleClick}>
      <div className="card-thumbnail">
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} />
        ) : (
          <div className="thumbnail-placeholder">
            <span>{type === 'live' ? '🎬' : type === 'scheduled' ? '📅' : '📼'}</span>
          </div>
        )}

        {/* Badges based on type */}
        {type === 'live' && (
          <>
            <div className="card-badge live">
              <span className="live-dot"></span>
              LIVE
            </div>
            {stream.viewer_count > 0 && (
              <div className="card-viewers">
                👁 {formatViewers(stream.viewer_count)}
              </div>
            )}
          </>
        )}

        {type === 'scheduled' && stream.scheduled_at && (
          <div className="card-badge scheduled">
            📅 {formatDate(stream.scheduled_at)}
          </div>
        )}

        {type === 'vod' && (
          <>
            {stream.duration && (
              <div className="card-duration">
                {formatDuration(stream.duration)}
              </div>
            )}
            <div className="card-badge vod">
              📼 VOD
            </div>
          </>
        )}

        {/* Hover Play Button */}
        <div className="card-play-overlay">
          <span className="play-icon">▶</span>
        </div>
      </div>

      <div className="card-info">
        <div className="card-header">
          <img 
            src={stream.user?.profile_picture || stream.user?.avatar_url || '/default-avatar.png'}
            alt={stream.user?.username}
            className="card-avatar"
          />
          <div className="card-meta">
            <h3 className="card-title">{stream.title || 'Untitled Stream'}</h3>
            <p className="card-streamer">
              {stream.user?.display_name || stream.user?.username || 'Anonymous'}
            </p>
          </div>
        </div>

        <div className="card-footer">
          {stream.category && (
            <span className="card-category">{stream.category}</span>
          )}
          {type === 'vod' && stream.views && (
            <span className="card-views">{formatViewers(stream.views)} views</span>
          )}
          {type === 'vod' && stream.ended_at && (
            <span className="card-date">{formatDate(stream.ended_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Empty State Component
// =============================================================================

const EmptyState = ({ icon, title, description, actionText, actionLink }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
    {actionText && actionLink && (
      <Link to={actionLink} className="empty-action-btn">
        {actionText}
      </Link>
    )}
  </div>
);

// =============================================================================
// Default Categories
// =============================================================================

const defaultCategories = [
  { name: 'Gaming', slug: 'gaming', icon: '🎮' },
  { name: 'Music', slug: 'music', icon: '🎵' },
  { name: 'Just Chatting', slug: 'just-chatting', icon: '💬' },
  { name: 'Art', slug: 'art', icon: '🎨' },
  { name: 'Sports', slug: 'sports', icon: '⚽' },
  { name: 'Education', slug: 'education', icon: '📚' },
  { name: 'Cooking', slug: 'cooking', icon: '🍳' },
  { name: 'Technology', slug: 'technology', icon: '💻' },
];

export default LiveStreams;