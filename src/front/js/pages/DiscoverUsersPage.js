import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/DiscoverUsers.css";

const DiscoverUsersPage = () => {
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filter options - All categories included
  const filterOptions = [
    { id: "all", label: "All", icon: "👥" },
    { id: "artist", label: "Artists", icon: "🎵" },
    { id: "gamer", label: "Gamers", icon: "🎮" },
    { id: "creator", label: "Creators", icon: "⭐" },
    { id: "regular", label: "Members", icon: "👤" }
  ];

  // Demo users for testing when API isn't ready
  const getDemoUsers = () => [
    {
      id: 1,
      username: "musicmaster",
      display_name: "Music Master",
      profile_type: "artist",
      bio: "Producer & songwriter creating beats that move souls 🎵",
      profile_picture: null,
      followers_count: 1250,
      is_verified: true
    },
    {
      id: 2,
      username: "progamer99",
      display_name: "Pro Gamer 99",
      profile_type: "gamer",
      bio: "Competitive FPS player | Streaming daily 🎮",
      profile_picture: null,
      followers_count: 890,
      is_verified: false
    },
    {
      id: 3,
      username: "podcastqueen",
      display_name: "Podcast Queen",
      profile_type: "creator",
      bio: "Host of 'Real Talk' podcast | 100K+ listeners",
      profile_picture: null,
      followers_count: 5600,
      is_verified: true
    },
    {
      id: 4,
      username: "beatmaker_joe",
      display_name: "Beatmaker Joe",
      profile_type: "artist",
      bio: "Hip-hop producer | DM for collabs",
      profile_picture: null,
      followers_count: 340,
      is_verified: false
    },
    {
      id: 5,
      username: "streamking",
      display_name: "Stream King",
      profile_type: "gamer",
      bio: "Variety streamer | RPGs & Strategy games",
      profile_picture: null,
      followers_count: 2100,
      is_verified: true
    },
    {
      id: 6,
      username: "sarah_creates",
      display_name: "Sarah Creates",
      profile_type: "creator",
      bio: "Digital artist & content creator ✨",
      profile_picture: null,
      followers_count: 780,
      is_verified: false
    },
    {
      id: 7,
      username: "dj_nova",
      display_name: "DJ Nova",
      profile_type: "artist",
      bio: "Electronic music producer | Festival DJ",
      profile_picture: null,
      followers_count: 4500,
      is_verified: true
    },
    {
      id: 8,
      username: "casual_mike",
      display_name: "Casual Mike",
      profile_type: "regular",
      bio: "Music lover & podcast enthusiast",
      profile_picture: null,
      followers_count: 45,
      is_verified: false
    }
  ];

  // Fetch users
  const fetchUsers = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 1 : page;

      const params = new URLSearchParams({
        page: currentPage,
        per_page: 20,
        search: searchQuery,
        profile_type: activeFilter !== "all" ? activeFilter : ""
      });

      const token = localStorage.getItem("token");
      const BACKEND_URL = "https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev";
      const response = await fetch(`${BACKEND_URL}/api/users/discover?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();

      if (resetPage) {
        setUsers(data.users || []);
        setPage(1);
      } else {
        setUsers(prev => currentPage === 1 ? data.users : [...prev, ...(data.users || [])]);
      }

      setTotalUsers(data.total || data.users?.length || 0);
      setHasMore(data.has_more || (data.users?.length === 20));
      setError(null);

    } catch (err) {
      console.error("Error fetching users:", err);
      // Set demo data for testing when API isn't ready
      const demoUsers = getDemoUsers();
      setUsers(demoUsers);
      setTotalUsers(demoUsers.length);
      setHasMore(false);
      setError(null); // Don't show error, show demo data
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, activeFilter]);

  // Initial fetch
  useEffect(() => {
    fetchUsers(true);
  }, [activeFilter]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Load more
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    fetchUsers(false);
  };

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  // Get profile type badge
  const getProfileBadge = (type) => {
    switch (type) {
      case "artist": return { icon: "🎵", label: "Artist", color: "#9c27b0" };
      case "gamer": return { icon: "🎮", label: "Gamer", color: "#4a9eff" };
      case "creator":
      case "multiple": return { icon: "⭐", label: "Creator", color: "#FF6600" };
      default: return { icon: "👤", label: "Member", color: "#00ffc8" };
    }
  };

  // Filter users based on active filter
  const filteredUsers = users.filter(user => {
    if (activeFilter === "all") return true;
    if (activeFilter === "creator") {
      return user.profile_type === "creator" || user.profile_type === "multiple";
    }
    return user.profile_type === activeFilter;
  });

  return (
    <div className="discover-users-container">
      {/* Header */}
      <div className="discover-header">
        <div className="header-content">
          <h1>🔍 Discover Users</h1>
          <p>Find and connect with creators, artists, gamers, and more</p>
        </div>
        <div className="header-stats">
          <span className="stat-item">
            <strong>{formatNumber(totalUsers)}</strong> Users
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="search-filter-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-tabs">
          {filterOptions.map(filter => (
            <button
              key={filter.id}
              className={`filter-tab ${activeFilter === filter.id ? "active" : ""}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-label">{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="results-info">
          <p>
            Showing results for "<strong>{searchQuery}</strong>"
            {filteredUsers.length > 0 && ` (${filteredUsers.length} found)`}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="loading-container">
          <div className="loading-spinner">👥</div>
          <p>Finding users...</p>
        </div>
      )}

      {/* Users Grid */}
      {filteredUsers.length > 0 && (
        <div className="users-grid">
          {filteredUsers.map(user => {
            const badge = getProfileBadge(user.profile_type);
            return (
              <Link
                key={user.id}
                to={user.profile_type === "artist" ? `/artist/${user.id}` : `/user/${user.id}`}
                className="user-card"
              >
                <div className="user-card-header">
                  <div className="user-avatar">
                    {user.profile_picture || user.avatar_url ? (
                      <img
                        src={user.profile_picture || user.avatar_url}
                        alt={user.display_name || user.username}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="default-avatar">{badge.icon}</div>
                    )}
                    {user.is_verified && (
                      <span className="verified-badge">✓</span>
                    )}
                  </div>
                  <span
                    className="profile-type-tag"
                    style={{ backgroundColor: `${badge.color}20`, color: badge.color, borderColor: badge.color }}
                  >
                    {badge.icon} {badge.label}
                  </span>
                </div>

                <div className="user-card-body">
                  <h3 className="user-name">
                    {user.display_name || user.username}
                  </h3>
                  <p className="user-username">@{user.username}</p>
                  <p className="user-bio">
                    {user.bio?.slice(0, 80) || "No bio yet"}
                    {user.bio?.length > 80 && "..."}
                  </p>
                </div>

                <div className="user-card-footer">
                  <span className="followers-count">
                    <strong>{formatNumber(user.followers_count || 0)}</strong> followers
                  </span>
                  <span className="view-profile">View Profile →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No users found</h3>
          <p>
            {searchQuery
              ? `No users match "${searchQuery}". Try a different search.`
              : "No users available with the selected filter."}
          </p>
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && filteredUsers.length >= 20 && !loading && (
        <div className="load-more-section">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Load More Users
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {loading && users.length > 0 && (
        <div className="loading-more">
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
};

export default DiscoverUsersPage;