import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
import UploadTrackModal from "../component/UploadTrackModal";
import "../../styles/ArtistProfile.css";

const ArtistProfilePage = () => {
  const { store } = useContext(Context);
  const [isArtistMode, setIsArtistMode] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab state management
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Backend-connected state
  const [artistInfo, setArtistInfo] = useState({
    artistName: "",
    genre: "",
    bio: "",
    location: "",
    website: "",
    profilePicture: "",
    coverPhoto: "",
    socialLinks: {
      spotify: "",
      apple: "",
      youtube: "",
      instagram: "",
      twitter: ""
    }
  });

  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [monthlyListeners, setMonthlyListeners] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const [artistStats, setArtistStats] = useState({
    totalPlays: 0,
    totalTracks: 0,
    totalAlbums: 0,
    totalFollowers: 0
  });

  const [analytics, setAnalytics] = useState({
    monthlyPlays: 0,
    totalStreams: 0,
    topCountries: [],
    revenueThisMonth: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const profileModes = [
    { id: "regular", label: "👤 Regular Profile", path: "/profile" },
    { id: "gamer", label: "🎮 Gamer Profile", path: "/profile/gamer" },
    { id: "artist", label: "🎵 Artist Profile", path: "/profile/artist" }
  ];

  // Helper function for safe image URLs
  const getImageUrl = (imageUrl, fallback = "https://via.placeholder.com/150x150/9c27b0/white?text=🎵") => {
    if (!imageUrl || imageUrl === "/default-artist-avatar.png" || imageUrl === "/placeholder-album.jpg") {
      return fallback;
    }
    return imageUrl;
  };

  // BACKEND INTEGRATION - Fetch all artist data
  useEffect(() => {
    fetchArtistData();
  }, []);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your artist profile");
        setLoading(false);
        return;
      }

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      // 1. Fetch user profile data
      try {
        const profileRes = await fetch(`${BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (profileRes.ok) {
          const userData = await profileRes.json();
          console.log("User data:", userData);

          setArtistInfo({
            artistName: userData.artist_name || userData.username || "Your Artist Name",
            genre: userData.genre || "Genre not set",
            bio: userData.bio || "",
            location: userData.location || "",
            website: userData.website || "",
            profilePicture: userData.profile_picture || userData.avatar_url || "",
            coverPhoto: userData.cover_photo || "",
            socialLinks: {
              spotify: userData.spotify_link || "",
              apple: userData.apple_music_link || "",
              youtube: userData.youtube_link || "",
              instagram: userData.instagram_link || "",
              twitter: userData.twitter_link || ""
            }
          });

          setIsVerified(userData.is_verified || false);
        } else {
          console.warn("Profile fetch failed:", profileRes.status);
        }
      } catch (err) {
        console.warn("Profile endpoint error:", err);
      }

      // 2. Fetch artist tracks
      try {
        const tracksRes = await fetch(`${BACKEND_URL}/api/artist/tracks`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (tracksRes.ok) {
          const tracksData = await tracksRes.json();
          console.log("Tracks data:", tracksData);
          setTracks(Array.isArray(tracksData) ? tracksData : []);

          setArtistStats(prev => ({
            ...prev,
            totalTracks: Array.isArray(tracksData) ? tracksData.length : 0
          }));
        } else {
          console.warn("Tracks fetch failed:", tracksRes.status);
        }
      } catch (err) {
        console.warn("Tracks endpoint error:", err);
      }

      // 3. Fetch analytics data
      try {
        const analyticsRes = await fetch(`${BACKEND_URL}/api/artist/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          console.log("Analytics data:", analyticsData);

          setAnalytics({
            monthlyPlays: analyticsData.monthly_plays || 0,
            totalStreams: analyticsData.total_streams || 0,
            topCountries: analyticsData.top_countries || ["United States", "Canada", "United Kingdom"],
            revenueThisMonth: analyticsData.revenue_this_month || 0
          });

          setMonthlyListeners(analyticsData.monthly_listeners || 0);

          setArtistStats(prev => ({
            ...prev,
            totalPlays: analyticsData.total_plays || 0,
            totalFollowers: analyticsData.total_followers || 0
          }));
        } else {
          console.warn("Analytics fetch failed:", analyticsRes.status);
        }
      } catch (err) {
        console.warn("Analytics endpoint error:", err);
      }

      // 4. Optional endpoints (won't break if they fail)
      await fetchOptionalData(BACKEND_URL, token);

    } catch (error) {
      console.error("Error fetching artist data:", error);
      setError("Failed to load artist profile. Some features may not work.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptionalData = async (backendUrl, token) => {
    // Albums
    try {
      const albumsRes = await fetch(`${backendUrl}/api/artist/albums`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (albumsRes.ok) {
        const albumsData = await albumsRes.json();
        setAlbums(Array.isArray(albumsData) ? albumsData : []);
        setArtistStats(prev => ({
          ...prev,
          totalAlbums: Array.isArray(albumsData) ? albumsData.length : 0
        }));
      }
    } catch (err) {
      console.log("Albums endpoint not available");
    }

    // Playlists
    try {
      const playlistsRes = await fetch(`${backendUrl}/api/artist/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      }
    } catch (err) {
      console.log("Playlists endpoint not available");
    }

    // Recent activity
    try {
      const activityRes = await fetch(`${backendUrl}/api/artist/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(Array.isArray(activityData) ? activityData : []);
      }
    } catch (err) {
      console.log("Activity endpoint not available");
      setRecentActivity([
        {
          type: "track",
          message: "Welcome to your artist profile!",
          timestamp: "Just now",
          icon: "🎵"
        }
      ]);
    }
  };

  // Handle track upload success
  const handleUploadNewTrack = async (newTrack) => {
    console.log("New track uploaded:", newTrack);
    await fetchArtistData();
    setShowModal(false);
  };

  // Filter function for search
  const filterItems = (items, key) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item =>
      item && item[key] &&
      typeof item[key] === 'string' &&
      item[key].toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">🎵</div>
          <p>Loading your artist profile...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <div className="original-layout">
            <section className="latest-release">
              <h2>🎵 Latest Release</h2>
              <div className="featured-track">
                {tracks.length > 0 ? (
                  <>
                    <img
                      src={getImageUrl(tracks[0].artwork, "https://via.placeholder.com/80x80/9c27b0/white?text=🎵")}
                      alt="Latest Release"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80x80/9c27b0/white?text=🎵";
                      }}
                    />
                    <div className="track-info">
                      <h3>{tracks[0].title}</h3>
                      <p>Released {tracks[0].created_at ? new Date(tracks[0].created_at).toLocaleDateString() : 'Recently'}</p>
                      <div className="track-stats">
                        <span>🎧 {tracks[0].plays || 0} plays</span>
                        <span>❤️ {tracks[0].likes || 0} likes</span>
                      </div>
                    </div>
                    <button className="play-btn">▶️</button>
                  </>
                ) : (
                  <>
                    <img
                      src="https://via.placeholder.com/80x80/9c27b0/white?text=🎵"
                      alt="No Release"
                    />
                    <div className="track-info">
                      <h3>No tracks yet</h3>
                      <p>Upload your first track to get started</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="upload-btn">
                      ➕ Upload Now
                    </button>
                  </>
                )}
              </div>
            </section>

            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 Popular Tracks</h2>
                {tracks.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="upload-btn">
                    ➕ Upload New Track
                  </button>
                )}
              </div>

              <div className="tracks-list">
                {tracks.length > 0 ? tracks.map((track, index) => (
                  <div key={track.id || index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    <img
                      src={getImageUrl(track.artwork, "https://via.placeholder.com/50x50/9c27b0/white?text=🎵")}
                      alt={track.title}
                      className="track-artwork"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/50x50/9c27b0/white?text=🎵";
                      }}
                    />
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album || track.artist_name || artistInfo.artistName}</p>
                    </div>
                    <span className="track-plays">{track.plays || 0} plays</span>
                    <span className="track-duration">{track.duration || "3:24"}</span>
                    <button className="track-play-btn">▶️</button>
                  </div>
                )) : (
                  <div className="no-tracks">
                    <p>🎵 No tracks uploaded yet</p>
                    <button onClick={() => setShowModal(true)} className="upload-first-btn">
                      Upload Your First Track
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="albums-section">
              <h2>💿 Albums & EPs</h2>
              <div className="albums-grid">
                {albums.length > 0 ? albums.map((album, index) => (
                  <div key={album.id || index} className="album-card">
                    <img
                      src={getImageUrl(album.artwork, "https://via.placeholder.com/200x200/9c27b0/white?text=💿")}
                      alt={album.title}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200x200/9c27b0/white?text=💿";
                      }}
                    />
                    <h4>{album.title}</h4>
                    <p>{album.year || new Date().getFullYear()} • {album.track_count || album.trackCount || 0} tracks</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>💿 No albums created yet</p>
                    <button className="create-btn">Create Your First Album</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "music":
        return (
          <div className="tab-content">
            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 All Tracks</h2>
                <button onClick={() => setShowModal(true)} className="upload-btn">
                  ➕ Upload New Track
                </button>
              </div>

              <div className="tracks-list">
                {filterItems(tracks, "title").length > 0 ? filterItems(tracks, "title").map((track, index) => (
                  <div key={track.id || index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    <img
                      src={getImageUrl(track.artwork, "https://via.placeholder.com/50x50/9c27b0/white?text=🎵")}
                      alt={track.title}
                      className="track-artwork"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/50x50/9c27b0/white?text=🎵";
                      }}
                    />
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album || artistInfo.artistName}</p>
                    </div>
                    <span className="track-plays">{track.plays || 0} plays</span>
                    <span className="track-duration">{track.duration || "3:24"}</span>
                    <button className="track-play-btn">▶️</button>
                  </div>
                )) : (
                  <div className="no-tracks">
                    <p>🎵 {searchQuery ? `No tracks found for "${searchQuery}"` : "No tracks uploaded yet"}</p>
                    <button onClick={() => setShowModal(true)} className="upload-first-btn">
                      Upload Your First Track
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "albums":
        return (
          <div className="tab-content">
            <section className="albums-section">
              <h2>💿 Albums & EPs</h2>
              <div className="albums-grid">
                {filterItems(albums, "title").length > 0 ? filterItems(albums, "title").map((album, index) => (
                  <div key={album.id || index} className="album-card">
                    <img
                      src={getImageUrl(album.artwork, "https://via.placeholder.com/200x200/9c27b0/white?text=💿")}
                      alt={album.title}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200x200/9c27b0/white?text=💿";
                      }}
                    />
                    <h4>{album.title}</h4>
                    <p>{album.year || new Date().getFullYear()} • {album.track_count || album.trackCount || 0} tracks</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>💿 {searchQuery ? `No albums found for "${searchQuery}"` : "No albums created yet"}</p>
                    <button className="create-btn">Create Your First Album</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "playlists":
        return (
          <div className="tab-content">
            <section className="playlists-section">
              <h2>📋 Playlists</h2>
              <div className="playlists-grid">
                {filterItems(playlists, "name").length > 0 ? filterItems(playlists, "name").map((playlist, index) => (
                  <div key={playlist.id || index} className="playlist-card">
                    <img
                      src={getImageUrl(playlist.cover, "https://via.placeholder.com/200x200/9c27b0/white?text=📋")}
                      alt={playlist.name}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200x200/9c27b0/white?text=📋";
                      }}
                    />
                    <h4>{playlist.name}</h4>
                    <p>{playlist.track_count || playlist.trackCount || 0} tracks • {playlist.duration || "0:00"}</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>📋 {searchQuery ? `No playlists found for "${searchQuery}"` : "No playlists created yet"}</p>
                    <button className="create-btn">Create Your First Playlist</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "about":
        return (
          <div className="tab-content">
            <section className="about-section">
              <h2>ℹ️ About the Artist</h2>
              <div className="artist-bio-expanded">
                <h3>📝 Biography</h3>
                <p>{artistInfo.bio || "Add your artist bio to let fans know more about you..."}</p>

                <div className="artist-details-grid">
                  <div className="detail-item">
                    <strong>📍 Location:</strong>
                    <span>{artistInfo.location || "Not specified"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>🎵 Genre:</strong>
                    <span>{artistInfo.genre || "Not specified"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>🌐 Website:</strong>
                    {artistInfo.website ? (
                      <a href={artistInfo.website} target="_blank" rel="noopener noreferrer">
                        {artistInfo.website}
                      </a>
                    ) : "Not specified"}
                  </div>
                </div>

                <div className="social-links-expanded">
                  <h3>🔗 Find Me On</h3>
                  <div className="social-links-grid">
                    {artistInfo.socialLinks.spotify && (
                      <a href={artistInfo.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="social-link spotify">🎵 Spotify</a>
                    )}
                    {artistInfo.socialLinks.apple && (
                      <a href={artistInfo.socialLinks.apple} target="_blank" rel="noopener noreferrer" className="social-link apple">🍎 Apple Music</a>
                    )}
                    {artistInfo.socialLinks.youtube && (
                      <a href={artistInfo.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-link youtube">📺 YouTube</a>
                    )}
                    {artistInfo.socialLinks.instagram && (
                      <a href={artistInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">📸 Instagram</a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case "analytics":
        return (
          <div className="tab-content">
            <section className="analytics-section">
              <h2>📊 Analytics Dashboard</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>📈 Monthly Performance</h3>
                  <div className="stat-item">
                    <span className="stat-label">Monthly Plays:</span>
                    <span className="stat-value">{analytics.monthlyPlays.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Streams:</span>
                    <span className="stat-value">{analytics.totalStreams.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Revenue This Month:</span>
                    <span className="stat-value">${analytics.revenueThisMonth.toFixed(2)}</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>🌍 Top Countries</h3>
                  {analytics.topCountries.length > 0 ? analytics.topCountries.map((country, index) => (
                    <div key={index} className="country-item">
                      <span>{index + 1}. {country}</span>
                    </div>
                  )) : (
                    <p>No geographic data available yet</p>
                  )}
                </div>

                <div className="analytics-card">
                  <h3>📊 Quick Stats</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalTracks}</span>
                      <span className="quick-stat-label">Tracks</span>
                    </div>
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalAlbums}</span>
                      <span className="quick-stat-label">Albums</span>
                    </div>
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalFollowers}</span>
                      <span className="quick-stat-label">Followers</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  if (loading && !artistInfo.artistName) {
    return (
      <div className="artist-profile-container">
        <div className="loading-container">
          <div className="loading-spinner">🎵</div>
          <p>Loading your artist profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-profile-container">
      {showModal && (
        <UploadTrackModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={handleUploadNewTrack}
        />
      )}

      {error && (
        <div className="error-banner">
          <p>⚠️ {error}</p>
        </div>
      )}

      <div className="profile-mode-toggle">
        {profileModes.map(mode => (
          <Link
            key={mode.id}
            to={mode.path}
            className={`mode-toggle-btn ${mode.id === 'artist' ? 'active' : ''}`}
          >
            {mode.label}
          </Link>
        ))}
      </div>

      <div className="artist-hero-section">
        <div className="artist-cover-photo" style={{
          backgroundImage: artistInfo.coverPhoto ? `url(${artistInfo.coverPhoto})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div className="artist-overlay">
            <div className="artist-avatar">
              <img
                src={getImageUrl(artistInfo.profilePicture, "https://via.placeholder.com/150x150/9c27b0/white?text=🎤")}
                alt="Artist Avatar"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150x150/9c27b0/white?text=🎤";
                }}
              />
              {isVerified && <span className="verified-badge">✓</span>}
            </div>
            <div className="artist-info">
              <h1 className="artist-name">
                {artistInfo.artistName}
              </h1>
              <p className="artist-genre">{artistInfo.genre}</p>
              <div className="artist-stats-quick">
                <span>{artistStats.totalFollowers} Followers</span>
                <span>•</span>
                <span>{monthlyListeners} Monthly Listeners</span>
                <span>•</span>
                <span>{artistStats.totalTracks} Tracks</span>
              </div>
            </div>
            <div className="artist-actions">
              <button className="follow-btn">🎵 Follow</button>
              <button className="share-btn">🔗 Share</button>
              <button className="more-btn">⋯</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="artist-nav-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          🏠 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "music" ? "active" : ""}`}
          onClick={() => setActiveTab("music")}
        >
          🎵 Music
        </button>
        <button
          className={`tab-btn ${activeTab === "albums" ? "active" : ""}`}
          onClick={() => setActiveTab("albums")}
        >
          💿 Albums
        </button>
        <button
          className={`tab-btn ${activeTab === "playlists" ? "active" : ""}`}
          onClick={() => setActiveTab("playlists")}
        >
          📋 Playlists
        </button>
        <button
          className={`tab-btn ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          ℹ️ About
        </button>
        <button
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          📊 Analytics
        </button>
      </div>

      {/* Search Bar */}
      {activeTab !== "overview" && activeTab !== "about" && activeTab !== "analytics" && (
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${activeTab}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="artist-content-grid">
        <div className="artist-main-content">
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        {(activeTab === "overview" || activeTab === "music" || activeTab === "about") && (
          <div className="artist-sidebar">
            <section className="artist-bio-card">
              <h3>📝 About</h3>
              <p>{artistInfo.bio || "Add your artist bio to let fans know more about you..."}</p>
              <div className="artist-details">
                <p><strong>📍 Location:</strong> {artistInfo.location || "Not specified"}</p>
                <p><strong>🎵 Genre:</strong> {artistInfo.genre || "Not specified"}</p>
                <p><strong>🌐 Website:</strong>
                  {artistInfo.website ? (
                    <a href={artistInfo.website} target="_blank" rel="noopener noreferrer">
                      {artistInfo.website}
                    </a>
                  ) : "Not specified"}
                </p>
              </div>
            </section>

            <section className="social-links-card">
              <h3>🔗 Find Me On</h3>
              <div className="social-links-grid">
                {artistInfo.socialLinks.spotify && (
                  <a href={artistInfo.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="social-link spotify">🎵 Spotify</a>
                )}
                {artistInfo.socialLinks.apple && (
                  <a href={artistInfo.socialLinks.apple} target="_blank" rel="noopener noreferrer" className="social-link apple">🍎 Apple Music</a>
                )}
                {artistInfo.socialLinks.youtube && (
                  <a href={artistInfo.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-link youtube">📺 YouTube</a>
                )}
                {artistInfo.socialLinks.instagram && (
                  <a href={artistInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">📸 Instagram</a>
                )}
              </div>
            </section>

            <section className="artist-tools-card">
              <h3>🛠️ Artist Tools</h3>
              <div className="tools-list">
                {activeTab !== "overview" && (
                  <button onClick={() => setShowModal(true)} className="tool-btn">⬆️ Upload Music</button>
                )}
                <Link to="/artist/analytics" className="tool-btn">📊 View Analytics</Link>
                <Link to="/artist/promote" className="tool-btn">📢 Promote Track</Link>
                <Link to="/artist/collaborate" className="tool-btn">🤝 Find Collaborators</Link>
                <Link to="/artist/monetize" className="tool-btn">💰 Monetization</Link>
              </div>
            </section>

            <section className="recent-activity-card">
              <h3>📈 Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.length > 0 ? recentActivity.slice(0, 3).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span>{activity.icon || "🎵"}</span>
                    <div>
                      <p>{activity.message}</p>
                      <small>{activity.timestamp}</small>
                    </div>
                  </div>
                )) : (
                  <div className="activity-item">
                    <span>🎵</span>
                    <div>
                      <p>Welcome to your artist profile!</p>
                      <small>Just now</small>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="edit-profile-section">
        <Link to="/profile/artist/edit" className="edit-profile-btn">✏️ Edit Artist Profile</Link>
      </div>
    </div>
  );
};

export default ArtistProfilePage;