import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/BrowseProfiles.css";

const BrowseProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterAndSortProfiles();
  }, [profiles, searchQuery, selectedType, sortBy]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profiles`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }
      
      const data = await response.json();
      setProfiles(data);
      setFilteredProfiles(data);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      setError("Failed to load profiles. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProfiles = () => {
    let result = [...profiles];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.username?.toLowerCase().includes(query) ||
          user.display_name?.toLowerCase().includes(query) ||
          user.bio?.toLowerCase().includes(query) ||
          user.genre?.toLowerCase().includes(query)
      );
    }

    // Filter by profile type
    if (selectedType !== "all") {
      result = result.filter((user) => user.profile_type === selectedType || user.role === selectedType);
    }

    // Sort profiles
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case "followers":
        result.sort((a, b) => (b.followers_count || 0) - (a.followers_count || 0));
        break;
      case "alphabetical":
        result.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
        break;
      default:
        break;
    }

    setFilteredProfiles(result);
  };

  const getProfileTypeIcon = (user) => {
    const type = user.profile_type || user.role;
    switch (type) {
      case "artist":
        return "🎵";
      case "podcaster":
        return "🎙️";
      case "radio_host":
        return "📻";
      case "creator":
        return "🎬";
      case "label":
        return "🏢";
      default:
        return "👤";
    }
  };

  const getProfileTypeBadge = (user) => {
    const type = user.profile_type || user.role;
    switch (type) {
      case "artist":
        return "Artist";
      case "podcaster":
        return "Podcaster";
      case "radio_host":
        return "Radio Host";
      case "creator":
        return "Creator";
      case "label":
        return "Label";
      default:
        return "Member";
    }
  };

  const formatFollowers = (count) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <div className="browse-profiles">
        <div className="loading-state">
          <div className="loading-icon">👥</div>
          <p>Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="browse-profiles">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchProfiles}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-profiles">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>👥 Browse Profiles</h1>
          <p className="header-subtitle">
            Discover talented creators, artists, podcasters, and more
          </p>
        </div>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{profiles.length}</span>
            <span className="stat-label">Total Profiles</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {profiles.filter((p) => p.profile_type === "artist" || p.role === "artist").length}
            </span>
            <span className="stat-label">Artists</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {profiles.filter((p) => p.profile_type === "podcaster" || p.role === "podcaster").length}
            </span>
            <span className="stat-label">Podcasters</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="controls-section">
        <div className="search-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, username, or genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-controls">
          <select
            className="filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">👥 All Profiles</option>
            <option value="artist">🎵 Artists</option>
            <option value="podcaster">🎙️ Podcasters</option>
            <option value="radio_host">📻 Radio Hosts</option>
            <option value="creator">🎬 Creators</option>
            <option value="label">🏢 Labels</option>
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">🆕 Newest First</option>
            <option value="oldest">📅 Oldest First</option>
            <option value="followers">👥 Most Followers</option>
            <option value="alphabetical">🔤 A-Z</option>
          </select>
        </div>
      </div>

      {/* Filter Tags */}
      <div className="filter-tags">
        {[
          { value: "all", label: "All", icon: "👥" },
          { value: "artist", label: "Artists", icon: "🎵" },
          { value: "podcaster", label: "Podcasters", icon: "🎙️" },
          { value: "radio_host", label: "Radio", icon: "📻" },
          { value: "creator", label: "Creators", icon: "🎬" },
          { value: "label", label: "Labels", icon: "🏢" },
        ].map((filter) => (
          <button
            key={filter.value}
            className={`filter-tag ${selectedType === filter.value ? "active" : ""}`}
            onClick={() => setSelectedType(filter.value)}
          >
            {filter.icon} {filter.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="results-info">
        <span className="results-count">
          Showing {filteredProfiles.length} of {profiles.length} profiles
        </span>
        {searchQuery && (
          <span className="search-query">for "{searchQuery}"</span>
        )}
      </div>

      {/* Profiles Grid */}
      <div className="profiles-container">
        {filteredProfiles.length > 0 ? (
          <div className="profiles-grid">
            {filteredProfiles.map((user) => (
              <div key={user.id} className="profile-card">
                {/* Card Header with Cover */}
                <div className="card-cover">
                  <div
                    className="cover-image"
                    style={{
                      backgroundImage: `url(${user.cover_image || user.banner_image || "/default-cover.jpg"})`,
                    }}
                  />
                  <div className="cover-overlay" />
                  <span className={`type-badge ${user.profile_type || user.role || "member"}`}>
                    {getProfileTypeIcon(user)} {getProfileTypeBadge(user)}
                  </span>
                </div>

                {/* Profile Avatar */}
                <div className="avatar-container">
                  <img
                    src={user.profile_picture || "/default-avatar.png"}
                    alt={user.username}
                    className="profile-avatar"
                    onError={(e) => (e.target.src = "/default-avatar.png")}
                  />
                  {user.is_verified && <span className="verified-badge">✓</span>}
                </div>

                {/* Profile Info */}
                <div className="profile-info">
                  <h3 className="profile-name">
                    {user.display_name || user.username}
                  </h3>
                  <p className="profile-username">@{user.username}</p>

                  {user.bio && (
                    <p className="profile-bio">{user.bio}</p>
                  )}

                  {user.genre && (
                    <span className="profile-genre">{user.genre}</span>
                  )}

                  {/* Profile Stats */}
                  <div className="profile-stats">
                    <div className="stat">
                      <span className="stat-value">
                        {formatFollowers(user.followers_count)}
                      </span>
                      <span className="stat-label">Followers</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">
                        {formatFollowers(user.following_count)}
                      </span>
                      <span className="stat-label">Following</span>
                    </div>
                    {user.tracks_count !== undefined && (
                      <div className="stat">
                        <span className="stat-value">{user.tracks_count}</span>
                        <span className="stat-label">Tracks</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="profile-actions">
                    <Link to={`/artist-profile/${user.id}`} className="btn-view">
                      View Profile
                    </Link>
                    <button className="btn-follow">
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No Profiles Found</h3>
            <p>
              {searchQuery
                ? `No profiles matching "${searchQuery}"`
                : "No profiles available in this category"}
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                setSearchQuery("");
                setSelectedType("all");
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Load More (if needed) */}
      {filteredProfiles.length > 0 && filteredProfiles.length >= 20 && (
        <div className="load-more-section">
          <button className="btn-load-more">
            Load More Profiles
          </button>
        </div>
      )}
    </div>
  );
};

export default BrowseProfiles;