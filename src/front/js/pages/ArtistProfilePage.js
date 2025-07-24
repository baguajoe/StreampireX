import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
import UploadTrackModal from "../component/UploadTrackModal";
import "../../styles/ArtistProfile.css";

const ArtistProfilePage = () => {
  const { store } = useContext(Context);
  const [isArtistMode, setIsArtistMode] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // ✅ NEW: Tab state management (similar to FavoritesPage)
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const handleUploadNewTrack = (newTrack) => {
    setTracks([newTrack, ...tracks]);
  };

  const [artistInfo, setArtistInfo] = useState({
    artistName: "",
    genre: "",
    bio: "",
    location: "",
    website: "",
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

  // ✅ NEW: Sample data for demonstration
  const [analytics, setAnalytics] = useState({
    monthlyPlays: 15420,
    totalStreams: 87650,
    topCountries: ["United States", "Canada", "United Kingdom"],
    revenueThisMonth: 245.80
  });

  const profileModes = [
    { id: "regular", label: "👤 Regular Profile", path: "/profile" },
    { id: "gamer", label: "🎮 Gamer Profile", path: "/profile/gamer" },
    { id: "artist", label: "🎵 Artist Profile", path: "/profile/artist" }
  ];

  // ✅ NEW: Filter function (similar to FavoritesPage)
  const filterItems = (items, key) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item =>
      item && item[key] && 
      typeof item[key] === 'string' &&
      item[key].toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // ✅ NEW: Render content based on active tab
  const renderTabContent = () => {
    switch(activeTab) {
      case "overview":
        // ✅ Show the ORIGINAL full layout with everything
        return (
          <div className="original-layout">
            <section className="latest-release">
              <h2>🎵 Latest Release</h2>
              <div className="featured-track">
                <img src="/placeholder-album.jpg" alt="Latest Release" />
                <div className="track-info">
                  <h3>Latest Track Title</h3>
                  <p>Released 2 days ago</p>
                  <div className="track-stats">
                    <span>🎧 1.2K plays</span>
                    <span>❤️ 89 likes</span>
                  </div>
                </div>
                <button className="play-btn">▶️</button>
              </div>
            </section>

            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 Popular Tracks</h2>
                {/* ✅ Only show this upload button if there are existing tracks */}
                {tracks.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="upload-btn">
                    ➕ Upload New Track
                  </button>
                )}
              </div>

              <div className="tracks-list">
                {tracks.length > 0 ? tracks.map((track, index) => (
                  <div key={index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    <img src={track.artwork} alt={track.title} className="track-artwork" />
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album}</p>
                    </div>
                    <span className="track-plays">{track.plays} plays</span>
                    <span className="track-duration">{track.duration}</span>
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
              <h2>💰 Albums & EPs</h2>
              <div className="albums-grid">
                {albums.length > 0 ? albums.map((album, index) => (
                  <div key={index} className="album-card">
                    <img src={album.artwork} alt={album.title} />
                    <h4>{album.title}</h4>
                    <p>{album.year} • {album.trackCount} tracks</p>
                  </div>
                )) : (
                  <p>💰 No albums created yet</p>
                )}
              </div>
            </section>
          </div>
        );

      case "music":
        return (
          <div className="tab-content">
            <section className="latest-release">
              <h2>🎵 Latest Release</h2>
              <div className="featured-track">
                <img src="/placeholder-album.jpg" alt="Latest Release" />
                <div className="track-info">
                  <h3>Latest Track Title</h3>
                  <p>Released 2 days ago</p>
                  <div className="track-stats">
                    <span>🎧 1.2K plays</span>
                    <span>❤️ 89 likes</span>
                  </div>
                </div>
                <button className="play-btn">▶️</button>
              </div>
            </section>

            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 Popular Tracks</h2>
                {/* ✅ Only show this upload button if there are existing tracks */}
                {tracks.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="upload-btn">
                    ➕ Upload New Track
                  </button>
                )}
              </div>

              <div className="tracks-list">
                {filterItems(tracks, "title").length > 0 ? filterItems(tracks, "title").map((track, index) => (
                  <div key={index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    <img src={track.artwork} alt={track.title} className="track-artwork" />
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album}</p>
                    </div>
                    <span className="track-plays">{track.plays} plays</span>
                    <span className="track-duration">{track.duration}</span>
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
          </div>
        );

      case "albums":
        return (
          <div className="tab-content">
            <section className="albums-section">
              <h2>💰 Albums & EPs</h2>
              <div className="albums-grid">
                {filterItems(albums, "title").length > 0 ? filterItems(albums, "title").map((album, index) => (
                  <div key={index} className="album-card">
                    <img src={album.artwork} alt={album.title} />
                    <h4>{album.title}</h4>
                    <p>{album.year} • {album.trackCount} tracks</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>💰 No albums created yet</p>
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
                  <div key={index} className="playlist-card">
                    <img src={playlist.cover} alt={playlist.name} />
                    <h4>{playlist.name}</h4>
                    <p>{playlist.trackCount} tracks • {playlist.duration}</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>📋 No playlists created yet</p>
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
                    <a href={artistInfo.socialLinks.spotify} className="social-link spotify">🎵 Spotify</a>
                    <a href={artistInfo.socialLinks.apple} className="social-link apple">🍎 Apple Music</a>
                    <a href={artistInfo.socialLinks.youtube} className="social-link youtube">📺 YouTube</a>
                    <a href={artistInfo.socialLinks.instagram} className="social-link instagram">📸 Instagram</a>
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
                    <span className="stat-value">${analytics.revenueThisMonth}</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>🌍 Top Countries</h3>
                  {analytics.topCountries.map((country, index) => (
                    <div key={index} className="country-item">
                      <span>{index + 1}. {country}</span>
                    </div>
                  ))}
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

  return (
    <div className="artist-profile-container">
      {showModal && (
        <UploadTrackModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={handleUploadNewTrack}
        />
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
        <div className="artist-cover-photo">
          <div className="artist-overlay">
            <div className="artist-avatar">
              <img
                src={artistInfo.profilePicture || "/default-artist-avatar.png"}
                alt="Artist Avatar"
              />
              {isVerified && <span className="verified-badge">✓</span>}
            </div>
            <div className="artist-info">
              <h1 className="artist-name">
                {artistInfo.artistName || store.user?.artist_name || "Your Artist Name"}
              </h1>
              <p className="artist-genre">{artistInfo.genre || "Genre not set"}</p>
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
              <button className="share-btn">🛄 Share</button>
              <button className="more-btn">⋯</button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Tab Navigation (similar to FavoritesPage) */}
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
          💰 Albums
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

      {/* ✅ NEW: Search Bar (only show on specific tabs, not on overview) */}
      {activeTab !== "overview" && (
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${activeTab}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* ✅ NEW: Tab Content Area */}
      <div className="artist-content-grid">
        <div className="artist-main-content">
          {renderTabContent()}
        </div>

        {/* ✅ Sidebar shows ALWAYS on overview, conditionally on other tabs */}
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
                <a href={artistInfo.socialLinks.spotify} className="social-link spotify">🎵 Spotify</a>
                <a href={artistInfo.socialLinks.apple} className="social-link apple">🍎 Apple Music</a>
                <a href={artistInfo.socialLinks.youtube} className="social-link youtube">📺 YouTube</a>
                <a href={artistInfo.socialLinks.instagram} className="social-link instagram">📸 Instagram</a>
              </div>
            </section>

            <section className="artist-tools-card">
              <h3>🛠️ Artist Tools</h3>
              <div className="tools-list">
                {/* ✅ Only show upload button in sidebar if NOT on overview tab (to avoid duplicates) */}
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
                <div className="activity-item">
                  <span>🎵</span>
                  <div>
                    <p>New track uploaded</p>
                    <small>2 hours ago</small>
                  </div>
                </div>
                <div className="activity-item">
                  <span>❤️</span>
                  <div>
                    <p>50 new likes on "Track Name"</p>
                    <small>1 day ago</small>
                  </div>
                </div>
                <div className="activity-item">
                  <span>👥</span>
                  <div>
                    <p>25 new followers</p>
                    <small>3 days ago</small>
                  </div>
                </div>
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