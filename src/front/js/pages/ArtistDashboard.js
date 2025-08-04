import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/ArtistDashboard.css';
import { 
  FaDollarSign, 
  FaUserFriends, 
  FaMusic, 
  FaHeart, 
  FaBroadcastTower, 
  FaUpload, 
  FaGuitar, 
  FaPlayCircle,
  FaHeadphones,
  FaChartLine,
  FaCalendarAlt,
  FaCog,
  FaEdit,
  FaTrash,
  FaEye,
  FaPause,
  FaPlay
} from 'react-icons/fa';

// Required component imports
import LiveStudio from "../component/LiveStudio";
import TrackUploadForm from "../component/TrackUploadForm";
import TermsAgreementModal from "../component/TermsAgreementModal";
import AlbumCard from "../component/AlbumCard";
import EditTrackForm from "../component/EditTrackForm";
import EditAlbumForm from "../component/EditAlbumForm";

const ArtistDashboard = () => {
  // Core state
  const [user, setUser] = useState({});
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    followers: 0,
    totalTracks: 0,
    totalPlays: 0,
    monthlyListeners: 0
  });

  // Form state
  const [trackTitle, setTrackTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [explicit, setExplicit] = useState(false);
  const [genres, setGenres] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [studioOpen, setStudioOpen] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [trackBeingEdited, setTrackBeingEdited] = useState(null);
  const [albumBeingEdited, setAlbumBeingEdited] = useState(null);
  const [showAlbumCreator, setShowAlbumCreator] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Sample data for demo
  const recentActivity = [
    { action: "Track uploaded", track: "Midnight Vibes", time: "2 hours ago" },
    { action: "New follower", user: "MusicLover23", time: "4 hours ago" },
    { action: "Album created", album: "Summer Sessions", time: "1 day ago" },
    { action: "Live session started", session: "Studio Session #12", time: "2 days ago" }
  ];

  const upcomingEvents = [
    { type: "Live Session", title: "Acoustic Evening", date: "Dec 15, 2024", time: "8:00 PM" },
    { type: "Release", title: "New Single Drop", date: "Dec 20, 2024", time: "12:00 PM" },
    { type: "Collaboration", title: "Studio Session with DJ Nova", date: "Dec 22, 2024", time: "3:00 PM" }
  ];

  useEffect(() => {
    fetchArtistData();
    fetchGenres();
  }, []);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch user profile
      const profileRes = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const userData = await profileRes.json();
        setUser(userData.user || userData);
      }

      // Fetch tracks
      const tracksRes = await fetch(`${process.env.BACKEND_URL}/api/artist/tracks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData);
      }

      // Fetch analytics
      const analyticsRes = await fetch(`${process.env.BACKEND_URL}/api/artist/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }

    } catch (error) {
      console.error("Error fetching artist data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setGenres(data);
      }
    } catch (error) {
      setErrorMessage("Error fetching genres.");
    }
  };

  const handleAudioUpload = async () => {
    if (!trackTitle || !genre || !audioFile) {
      setErrorMessage("Please fill in all fields before uploading.");
      return;
    }
    setErrorMessage('');

    const formData = new FormData();
    formData.append("title", trackTitle);
    formData.append("genre", genre);
    formData.append("audio", audioFile);
    formData.append("explicit", explicit);

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/upload-track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setTrackTitle('');
        setGenre('');
        setAudioFile(null);
        setExplicit(false);
        fetchArtistData(); // Refresh data
        alert("Track uploaded successfully!");
      } else {
        setErrorMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setErrorMessage("Server error during upload.");
    }
  };

  const renderOverview = () => (
    <div className="overview-content">
      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card earnings">
          <div className="stat-icon">
            <FaDollarSign />
          </div>
          <div className="stat-info">
            <h3>Total Earnings</h3>
            <p>${analytics.totalEarnings?.toFixed(2) || '0.00'}</p>
            <span className="stat-change">+12% this month</span>
          </div>
        </div>

        <div className="stat-card followers">
          <div className="stat-icon">
            <FaUserFriends />
          </div>
          <div className="stat-info">
            <h3>Followers</h3>
            <p>{analytics.followers || 0}</p>
            <span className="stat-change">+45 this week</span>
          </div>
        </div>

        <div className="stat-card tracks">
          <div className="stat-icon">
            <FaMusic />
          </div>
          <div className="stat-info">
            <h3>Total Tracks</h3>
            <p>{analytics.totalTracks || tracks.length}</p>
            <span className="stat-change">{tracks.length > 0 ? 'Recently updated' : 'Upload your first track'}</span>
          </div>
        </div>

        <div className="stat-card plays">
          <div className="stat-icon">
            <FaHeadphones />
          </div>
          <div className="stat-info">
            <h3>Total Plays</h3>
            <p>{analytics.totalPlays || '0'}</p>
            <span className="stat-change">+234 today</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button 
            className="action-card upload" 
            onClick={() => setActiveTab('upload')}
          >
            <FaUpload />
            <span>Upload Track</span>
          </button>
          
          <button 
            className="action-card studio" 
            onClick={() => setStudioOpen(true)}
          >
            <FaBroadcastTower />
            <span>Live Studio</span>
          </button>
          
          <Link to="/upload-music" className="action-card distribute">
            <FaGuitar />
            <span>Music Distribution</span>
          </Link>
          
          <button 
            className="action-card album"
            onClick={() => setShowAlbumCreator(true)}
          >
            <FaMusic />
            <span>Create Album</span>
          </button>
        </div>
      </div>

      {/* Recent Activity & Upcoming Events */}
      <div className="dashboard-grid">
        <div className="activity-section">
          <h3><FaChartLine /> Recent Activity</h3>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-content">
                  <p><strong>{activity.action}</strong></p>
                  <p>{activity.track || activity.user || activity.album || activity.session}</p>
                </div>
                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="events-section">
          <h3><FaCalendarAlt /> Upcoming Events</h3>
          <div className="events-list">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="event-item">
                <div className="event-type">{event.type}</div>
                <div className="event-details">
                  <p><strong>{event.title}</strong></p>
                  <p>{event.date} at {event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTracks = () => (
    <div className="tracks-content">
      <div className="tracks-header">
        <h3><FaMusic /> My Tracks ({tracks.length})</h3>
        <button 
          className="btn-primary"
          onClick={() => setActiveTab('upload')}
        >
          <FaUpload /> Upload New Track
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="empty-state">
          <FaMusic className="empty-icon" />
          <h4>No tracks uploaded yet</h4>
          <p>Start your musical journey by uploading your first track!</p>
          <button 
            className="btn-primary"
            onClick={() => setActiveTab('upload')}
          >
            <FaUpload /> Upload Your First Track
          </button>
        </div>
      ) : (
        <div className="tracks-grid">
          {tracks.map((track, index) => (
            <div key={track.id || index} className="track-card">
              <div className="track-artwork">
                <img 
                  src={track.artwork || '/default-track-artwork.png'} 
                  alt={track.title}
                />
                <div className="track-overlay">
                  <button className="play-btn">
                    <FaPlay />
                  </button>
                </div>
              </div>
              
              <div className="track-info">
                <h4>{track.title}</h4>
                <p className="track-genre">{track.genre}</p>
                <div className="track-stats">
                  <span><FaHeadphones /> {track.plays || 0} plays</span>
                  <span><FaHeart /> {track.likes || 0} likes</span>
                </div>
              </div>
              
              <div className="track-actions">
                <button 
                  className="btn-icon"
                  onClick={() => setTrackBeingEdited(track)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button 
                  className="btn-icon"
                  title="Analytics"
                >
                  <FaChartLine />
                </button>
                <button 
                  className="btn-icon danger"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="upload-content">
      <div className="upload-header">
        <h3><FaUpload /> Upload New Track</h3>
        <p>Share your music with the world. Upload high-quality audio files for the best experience.</p>
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="upload-form">
        <div className="form-group">
          <label htmlFor="trackTitle">Track Title *</label>
          <input
            id="trackTitle"
            type="text"
            placeholder="Enter track title"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="genre">Genre *</label>
          <select
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="form-select"
          >
            <option value="">Select Genre</option>
            {genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="audioFile">Audio File *</label>
          <div className="file-upload-area">
            <input
              id="audioFile"
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files[0])}
              className="file-input"
            />
            <div className="file-upload-content">
              {audioFile ? (
                <div className="file-selected">
                  <FaMusic />
                  <span>{audioFile.name}</span>
                </div>
              ) : (
                <div className="file-placeholder">
                  <FaUpload />
                  <span>Click to select audio file or drag and drop</span>
                  <small>Supported formats: MP3, WAV, FLAC</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={explicit}
              onChange={() => setExplicit(!explicit)}
            />
            <span className="checkmark"></span>
            This track contains explicit lyrics
          </label>
        </div>

        <div className="form-actions">
          <button
            onClick={handleAudioUpload}
            className="btn-primary upload-btn"
            disabled={!trackTitle || !genre || !audioFile}
          >
            <FaUpload /> Upload Track
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-content">
      <h3><FaChartLine /> Analytics & Insights</h3>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Monthly Listeners</h4>
          <div className="metric-value">{analytics.monthlyListeners || 0}</div>
          <div className="metric-change positive">+23% from last month</div>
        </div>
        
        <div className="analytics-card">
          <h4>Top Track</h4>
          <div className="metric-value">
            {tracks.length > 0 ? tracks[0]?.title : 'No tracks yet'}
          </div>
          <div className="metric-change">{tracks.length > 0 ? '1,234 plays' : ''}</div>
        </div>
        
        <div className="analytics-card">
          <h4>Revenue This Month</h4>
          <div className="metric-value">${analytics.monthlyRevenue || '0.00'}</div>
          <div className="metric-change positive">+$12.45 from last month</div>
        </div>
      </div>

      <div className="detailed-analytics">
        <h4>Detailed Insights</h4>
        <p>Upgrade to Pro to access detailed analytics, listener demographics, and revenue tracking.</p>
        <button className="btn-primary">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="artist-dashboard">
        <div className="loading-state">
          <FaMusic className="loading-icon" />
          <p>Loading your artist dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="artist-info">
            <img 
              src={user.profile_picture || '/default-artist-avatar.png'} 
              alt="Artist Avatar"
              className="artist-avatar"
            />
            <div className="artist-details">
              <h1>Welcome back, {user.display_name || user.username || 'Artist'}!</h1>
              <p className="artist-status">Independent Artist • {tracks.length} tracks</p>
            </div>
          </div>
          
          <div className="header-actions">
            <Link to="/profile/artist" className="btn-secondary">
              <FaEye /> View Profile
            </Link>
            <Link to="/profile/artist/edit" className="btn-secondary">
              <FaCog /> Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-nav">
        <nav className="nav-tabs">
          {[
            { id: 'overview', label: 'Overview', icon: FaChartLine },
            { id: 'tracks', label: 'My Tracks', icon: FaMusic },
            { id: 'upload', label: 'Upload', icon: FaUpload },
            { id: 'analytics', label: 'Analytics', icon: FaChartLine }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tracks' && renderTracks()}
        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Modals */}
      {studioOpen && <LiveStudio onClose={() => setStudioOpen(false)} />}
      {showTermsModal && <TermsAgreementModal onClose={() => setShowTermsModal(false)} />}
      {trackBeingEdited && <EditTrackForm track={trackBeingEdited} onClose={() => setTrackBeingEdited(null)} />}
      {albumBeingEdited && <EditAlbumForm album={albumBeingEdited} onClose={() => setAlbumBeingEdited(null)} />}
      {showAlbumCreator && <AlbumCard onClose={() => setShowAlbumCreator(false)} />}
    </div>
  );
};

export default ArtistDashboard;