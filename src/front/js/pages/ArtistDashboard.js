import React, { useState, useEffect, useRef } from 'react';
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
  FaPlay,
  FaTicketAlt
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

  // Audio playback state
  const audioRef = useRef(new Audio());
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ========== CONCERTS STATE ==========
  const [myConcerts, setMyConcerts] = useState([]);
  const [showConcertForm, setShowConcertForm] = useState(false);
  const [concertBeingEdited, setConcertBeingEdited] = useState(null);
  const [newConcert, setNewConcert] = useState({
    title: '',
    date: '',
    time: '',
    price: '',
    description: '',
    category: 'Music',
    venue: '',
    max_tickets: ''
  });
  const [concertMessage, setConcertMessage] = useState('');
  const [savingConcert, setSavingConcert] = useState(false);

  // ========== REAL-TIME ACTIVITY STATE ==========
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ========== UPCOMING EVENTS STATE ==========
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    fetchArtistData();
    fetchGenres();
    fetchMyConcerts();
    fetchRecentActivity();
    fetchUpcomingEvents();

    // Auto-refresh activity every 30 seconds for real-time feel
    const activityInterval = setInterval(fetchRecentActivity, 30000);

    return () => clearInterval(activityInterval);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      setCurrentlyPlaying(null);
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch user profile
      const profileRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const userData = await profileRes.json();
        setUser(userData.user || userData);
      }

      // Fetch tracks
      const tracksRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/tracks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData);
      }

      // Fetch analytics
      const analyticsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/analytics`, {
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
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setGenres(data);
      }
    } catch (error) {
      setErrorMessage("Error fetching genres.");
    }
  };

  // ========== FETCH REAL-TIME ACTIVITY ==========
  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/recent-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.activities || []);
      } else {
        // If endpoint doesn't exist yet, use empty array
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  // ========== FETCH UPCOMING EVENTS ==========
  const fetchUpcomingEvents = async () => {
    try {
      setEventsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/upcoming-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data.events || []);
      } else {
        setUpcomingEvents([]);
      }
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      setUpcomingEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  // ========== CONCERTS FUNCTIONS ==========
  const fetchMyConcerts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/concerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyConcerts(data);
      }
    } catch (error) {
      console.error("Error fetching concerts:", error);
    }
  };

  const handleCreateConcert = async () => {
    if (!newConcert.title.trim()) {
      setConcertMessage("❌ Please enter a concert title");
      return;
    }
    if (!newConcert.date) {
      setConcertMessage("❌ Please select a date");
      return;
    }
    if (!newConcert.price || newConcert.price < 0) {
      setConcertMessage("❌ Please enter a valid ticket price (0 for free)");
      return;
    }

    setSavingConcert(true);
    setConcertMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConcert),
      });

      if (response.ok) {
        const data = await response.json();
        setConcertMessage("✅ Concert created successfully!");
        setMyConcerts([...myConcerts, data.concert || data]);
        resetConcertForm();
        // Refresh activity and events after creating concert
        fetchRecentActivity();
        fetchUpcomingEvents();
        setTimeout(() => setConcertMessage(""), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create concert");
      }
    } catch (err) {
      console.error("Error creating concert:", err);
      setConcertMessage(`❌ ${err.message}`);
    } finally {
      setSavingConcert(false);
    }
  };

  const handleUpdateConcert = async () => {
    if (!concertBeingEdited) return;

    setSavingConcert(true);
    setConcertMessage("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts/${concertBeingEdited.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newConcert),
      });

      if (response.ok) {
        const data = await response.json();
        setConcertMessage("✅ Concert updated successfully!");
        setMyConcerts(myConcerts.map(c => c.id === concertBeingEdited.id ? (data.concert || data) : c));
        resetConcertForm();
        fetchUpcomingEvents();
        setTimeout(() => setConcertMessage(""), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update concert");
      }
    } catch (err) {
      console.error("Error updating concert:", err);
      setConcertMessage(`❌ ${err.message}`);
    } finally {
      setSavingConcert(false);
    }
  };

  const handleDeleteConcert = async (concertId) => {
    if (!window.confirm("Are you sure you want to delete this concert? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts/${concertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMyConcerts(myConcerts.filter(c => c.id !== concertId));
        setConcertMessage("✅ Concert deleted");
        fetchUpcomingEvents();
        setTimeout(() => setConcertMessage(""), 3000);
      } else {
        setConcertMessage("❌ Failed to delete concert");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setConcertMessage("❌ Error deleting concert");
    }
  };

  const editConcert = (concert) => {
    setConcertBeingEdited(concert);
    setNewConcert({
      title: concert.title || '',
      date: concert.date ? concert.date.split('T')[0] : '',
      time: concert.time || '',
      price: concert.price || '',
      description: concert.description || '',
      category: concert.category || 'Music',
      venue: concert.venue || '',
      max_tickets: concert.max_tickets || ''
    });
    setShowConcertForm(true);
  };

  const resetConcertForm = () => {
    setNewConcert({
      title: '',
      date: '',
      time: '',
      price: '',
      description: '',
      category: 'Music',
      venue: '',
      max_tickets: ''
    });
    setConcertBeingEdited(null);
    setShowConcertForm(false);
  };

  // Audio playback handler
  const handlePlayTrack = (track) => {
    const audio = audioRef.current;

    if (currentlyPlaying?.id === track.id && !audio.paused) {
      audio.pause();
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      return;
    }

    if (currentlyPlaying?.id !== track.id) {
      audio.pause();
      audio.currentTime = 0;
    }

    const audioUrl = track.audio_url || track.file_url || track.url || track.audioUrl;

    if (audioUrl) {
      audio.src = audioUrl;
      audio.play()
        .then(() => {
          setCurrentlyPlaying(track);
          setIsPlaying(true);
          incrementPlayCount(track.id);
        })
        .catch(err => {
          console.error("Playback failed:", err);
          setErrorMessage("Failed to play track. Audio file may not be available.");
        });
    } else {
      setErrorMessage("No audio file available for this track");
    }
  };

  // Increment play count
  const incrementPlayCount = async (trackId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tracks/${trackId}/play`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setTracks(prevTracks =>
        prevTracks.map(track =>
          track.id === trackId
            ? { ...track, plays: (track.plays || 0) + 1 }
            : track
        )
      );
    } catch (err) {
      console.error("Failed to increment play count:", err);
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
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload-track`, {
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
        fetchArtistData();
        fetchRecentActivity(); // Refresh activity after upload
        alert("Track uploaded successfully!");
      } else {
        setErrorMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setErrorMessage("Server error during upload.");
    }
  };

  // Delete track handler
  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm("Are you sure you want to delete this track?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tracks/${trackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        if (currentlyPlaying?.id === trackId) {
          audioRef.current.pause();
          setCurrentlyPlaying(null);
          setIsPlaying(false);
        }
        setTracks(prevTracks => prevTracks.filter(t => t.id !== trackId));
      } else {
        setErrorMessage("Failed to delete track");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Error deleting track");
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
            <p>${analytics.revenue_this_month?.toFixed(2) || '0.00'}</p>
            <span className="stat-change">+12% this month</span>
          </div>
        </div>

        <div className="stat-card followers">
          <div className="stat-icon">
            <FaUserFriends />
          </div>
          <div className="stat-info">
            <h3>Followers</h3>
            <p>{analytics.total_followers || 0}</p>
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
            <p>{analytics.total_plays || '0'}</p>
            <span className="stat-change">+234 today</span>
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming Events - IN THE MIDDLE */}
      <div className="dashboard-grid">
        <div className="activity-section">
          <div className="section-header">
            <h3><FaChartLine /> Recent Activity</h3>
            <button 
              className="refresh-btn" 
              onClick={fetchRecentActivity}
              title="Refresh Activity"
            >
              🔄
            </button>
          </div>

          {activityLoading ? (
            <div className="activity-loading">
              <div className="loading-spinner"></div>
              <p>Loading activity...</p>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="activity-empty">
              <p>📭 No recent activity yet.</p>
              <p>Upload a track or go live to see activity here!</p>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.slice(0, 8).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <p><strong>{activity.action}</strong></p>
                    <p className="activity-title">{activity.title}</p>
                  </div>
                  <span className="activity-time">{activity.time_ago}</span>
                </div>
              ))}
            </div>
          )}

          {recentActivity.length > 8 && (
            <button 
              className="view-all-btn" 
              onClick={() => setActiveTab('analytics')}
            >
              View All Activity ({recentActivity.length})
            </button>
          )}
        </div>

        <div className="events-section">
          <div className="section-header">
            <h3><FaCalendarAlt /> Upcoming Events</h3>
            <button 
              className="refresh-btn" 
              onClick={fetchUpcomingEvents}
              title="Refresh Events"
            >
              🔄
            </button>
          </div>

          {eventsLoading ? (
            <div className="events-loading">
              <div className="loading-spinner"></div>
              <p>Loading events...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="events-empty">
              <p>📅 No upcoming events scheduled.</p>
              <button 
                className="btn-link"
                onClick={() => setActiveTab('concerts')}
              >
                Schedule a concert →
              </button>
            </div>
          ) : (
            <div className="events-list">
              {upcomingEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-icon">{event.icon || '📅'}</div>
                  <div className="event-type-badge">{event.type}</div>
                  <div className="event-details">
                    <p><strong>{event.title}</strong></p>
                    <p className="event-datetime">
                      {event.date} {event.time && `at ${event.time}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {upcomingEvents.length > 5 && (
            <button 
              className="view-all-btn" 
              onClick={() => setActiveTab('concerts')}
            >
              View All Events ({upcomingEvents.length})
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions - AT THE BOTTOM */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <button
            className="quick-action-card"
            onClick={() => setActiveTab('upload')}
          >
            <div className="action-icon">⬆️</div>
            <h4>Upload Track</h4>
            <p>Share your music</p>
          </button>

          <button
            className="quick-action-card"
            onClick={() => setStudioOpen(true)}
          >
            <div className="action-icon">📡</div>
            <h4>Live Studio</h4>
            <p>Start broadcasting</p>
          </button>

          <button
            className="quick-action-card"
            onClick={() => setActiveTab('concerts')}
          >
            <div className="action-icon">🎭</div>
            <h4>Create Concert</h4>
            <p>Schedule a live show</p>
          </button>

          <button
            className="quick-action-card"
            onClick={() => setShowAlbumCreator(true)}
          >
            <div className="action-icon">💿</div>
            <h4>Create Album</h4>
            <p>Bundle your tracks</p>
          </button>
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

      {/* Now Playing Indicator */}
      {currentlyPlaying && (
        <div className="now-playing-banner">
          <FaMusic className="now-playing-icon" />
          <span>Now Playing: <strong>{currentlyPlaying.title}</strong></span>
          <button 
            className="stop-btn"
            onClick={() => {
              audioRef.current.pause();
              setCurrentlyPlaying(null);
              setIsPlaying(false);
            }}
          >
            <FaPause /> Stop
          </button>
        </div>
      )}

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
                  <button 
                    className="play-btn"
                    onClick={() => handlePlayTrack(track)}
                  >
                    {currentlyPlaying?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
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
                  onClick={() => handleDeleteTrack(track.id)}
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

  // ========== RENDER CONCERTS TAB ==========
  const renderConcerts = () => (
    <div className="concerts-content">
      <div className="concerts-tab-header">
        <h3><FaTicketAlt /> My Concerts ({myConcerts.length})</h3>
        <button
          className="btn-primary"
          onClick={() => {
            resetConcertForm();
            setShowConcertForm(true);
          }}
        >
          + Create Concert
        </button>
      </div>

      {/* Concert Message */}
      {concertMessage && (
        <div className={`concert-alert ${concertMessage.includes('❌') ? 'error' : 'success'}`}>
          {concertMessage}
        </div>
      )}

      {/* Concert Form */}
      {showConcertForm && (
        <div className="concert-form-card">
          <div className="concert-form-header">
            <h4>{concertBeingEdited ? '✏️ Edit Concert' : '🎭 Create New Concert'}</h4>
            <button className="close-btn" onClick={resetConcertForm}>✕</button>
          </div>

          <div className="concert-form-grid">
            <div className="form-group">
              <label>Concert Title *</label>
              <input
                type="text"
                placeholder="Enter concert title"
                value={newConcert.title}
                onChange={(e) => setNewConcert({ ...newConcert, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={newConcert.category}
                onChange={(e) => setNewConcert({ ...newConcert, category: e.target.value })}
              >
                <option value="Music">Music</option>
                <option value="Live DJs">Live DJs</option>
                <option value="Comedy">Comedy</option>
                <option value="Talk Shows">Talk Shows</option>
                <option value="Art">Art Performance</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={newConcert.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewConcert({ ...newConcert, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={newConcert.time}
                onChange={(e) => setNewConcert({ ...newConcert, time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Ticket Price ($) *</label>
              <input
                type="number"
                placeholder="0.00 (free)"
                min="0"
                step="0.01"
                value={newConcert.price}
                onChange={(e) => setNewConcert({ ...newConcert, price: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Max Tickets (optional)</label>
              <input
                type="number"
                placeholder="Unlimited"
                min="1"
                value={newConcert.max_tickets}
                onChange={(e) => setNewConcert({ ...newConcert, max_tickets: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Venue / Location</label>
              <input
                type="text"
                placeholder="e.g., Virtual Stage, Studio A"
                value={newConcert.venue}
                onChange={(e) => setNewConcert({ ...newConcert, venue: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                placeholder="Describe your concert, what fans can expect..."
                value={newConcert.description}
                onChange={(e) => setNewConcert({ ...newConcert, description: e.target.value })}
                rows="3"
              />
            </div>
          </div>

          <div className="concert-form-actions">
            <button className="btn-secondary" onClick={resetConcertForm}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={concertBeingEdited ? handleUpdateConcert : handleCreateConcert}
              disabled={savingConcert}
            >
              {savingConcert ? '⏳ Saving...' : concertBeingEdited ? '💾 Update Concert' : '🎭 Create Concert'}
            </button>
          </div>
        </div>
      )}

      {/* Concerts List */}
      {myConcerts.length === 0 && !showConcertForm ? (
        <div className="empty-state">
          <FaTicketAlt className="empty-icon" />
          <h4>No concerts scheduled yet</h4>
          <p>Create your first virtual concert and sell tickets to your fans!</p>
          <button
            className="btn-primary"
            onClick={() => setShowConcertForm(true)}
          >
            🎭 Create Your First Concert
          </button>
        </div>
      ) : (
        <div className="my-concerts-grid">
          {myConcerts.map((concert) => (
            <div key={concert.id} className="my-concert-card">
              <div className="concert-status-badge">
                {new Date(concert.date) > new Date() ? '🟢 Upcoming' : '⚫ Past'}
              </div>
              
              <h4>{concert.title}</h4>
              
              <div className="concert-meta">
                <p>📅 {new Date(concert.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</p>
                {concert.time && <p>🕐 {concert.time}</p>}
                {concert.venue && <p>📍 {concert.venue}</p>}
              </div>

              <div className="concert-pricing">
                <span className="price-tag">
                  {concert.price > 0 ? `$${parseFloat(concert.price).toFixed(2)}` : 'FREE'}
                </span>
                <span className="tickets-sold">
                  🎟️ {concert.tickets_sold || 0} sold
                </span>
              </div>

              <div className="concert-card-actions">
                <button
                  className="btn-icon"
                  onClick={() => editConcert(concert)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <Link
                  to={`/concert/${concert.id}`}
                  className="btn-icon"
                  title="View"
                >
                  <FaEye />
                </Link>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDeleteConcert(concert.id)}
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

  const renderAnalytics = () => (
    <div className="analytics-content">
      <h3><FaChartLine /> Analytics & Insights</h3>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Monthly Listeners</h4>
          <div className="metric-value">{analytics.monthly_listeners || analytics.monthlyListeners || 0}</div>
          <div className="metric-change positive">+23% from last month</div>
        </div>

        <div className="analytics-card">
          <h4>Top Track</h4>
          <div className="metric-value">
            {tracks.length > 0 ? tracks[0]?.title : 'No tracks yet'}
          </div>
          <div className="metric-change">{tracks.length > 0 ? `${tracks[0]?.plays || 0} plays` : ''}</div>
        </div>

        <div className="analytics-card">
          <h4>Revenue This Month</h4>
          <div className="metric-value">${analytics.revenue_this_month?.toFixed(2) || analytics.monthlyRevenue || '0.00'}</div>
          <div className="metric-change positive">+$12.45 from last month</div>
        </div>
      </div>

      {/* Full Activity Log */}
      <div className="full-activity-section">
        <h4>📋 Complete Activity Log</h4>
        {recentActivity.length === 0 ? (
          <p className="no-activity">No activity recorded yet.</p>
        ) : (
          <div className="full-activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="full-activity-item">
                <div className="activity-icon-large">{activity.icon}</div>
                <div className="activity-details">
                  <p className="activity-action">{activity.action}</p>
                  <p className="activity-title">{activity.title}</p>
                </div>
                <span className="activity-timestamp">{activity.time_ago}</span>
              </div>
            ))}
          </div>
        )}
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
              <p className="artist-status">Independent Artist • {tracks.length} tracks • {myConcerts.length} concerts</p>
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
            { id: 'concerts', label: 'Concerts', icon: FaTicketAlt },
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
        {activeTab === 'concerts' && renderConcerts()}
        {activeTab === 'upload' && renderUpload()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Modals */}
      {studioOpen && <LiveStudio onClose={() => setStudioOpen(false)} />}
      {showTermsModal && <TermsAgreementModal onClose={() => setShowTermsModal(false)} />}
      {trackBeingEdited && <EditTrackForm track={trackBeingEdited} onClose={() => setTrackBeingEdited(null)} onSave={fetchArtistData} />}
      {albumBeingEdited && <EditAlbumForm album={albumBeingEdited} onClose={() => setAlbumBeingEdited(null)} />}
      {showAlbumCreator && <AlbumCard onClose={() => setShowAlbumCreator(false)} />}
    </div>
  );
};

export default ArtistDashboard;