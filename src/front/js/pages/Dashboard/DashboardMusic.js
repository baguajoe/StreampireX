// src/front/js/pages/Dashboard/DashboardMusic.js
// Music Tab - Tracks, concerts, analytics (from ArtistDashboard)
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaDollarSign,
  FaUserFriends,
  FaMusic,
  FaHeart,
  FaUpload,
  FaHeadphones,
  FaChartLine,
  FaCalendarAlt,
  FaEdit,
  FaTrash,
  FaEye,
  FaPause,
  FaPlay,
  FaTicketAlt
} from 'react-icons/fa';

// Component imports from actual codebase
import LiveStudio from "../../component/LiveStudio";
import TrackUploadForm from "../../component/TrackUploadForm";
import EditTrackForm from "../../component/EditTrackForm";
import "../../../styles/ArtistDashboard.css";

const DashboardMusic = ({ user }) => {
  // Core state
  const [tracks, setTracks] = useState([]);
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
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [studioOpen, setStudioOpen] = useState(false);
  const [trackBeingEdited, setTrackBeingEdited] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Audio playback state
  const audioRef = useRef(new Audio());
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Concerts state
  const [myConcerts, setMyConcerts] = useState([]);
  const [showConcertForm, setShowConcertForm] = useState(false);
  const [concertBeingEdited, setConcertBeingEdited] = useState(null);
  const [newConcert, setNewConcert] = useState({
    title: '', date: '', time: '', price: '', description: '',
    category: 'Music', venue: '', max_tickets: ''
  });
  const [concertMessage, setConcertMessage] = useState('');
  const [savingConcert, setSavingConcert] = useState(false);

  // Activity state
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchMusicData();
    fetchGenres();
    fetchMyConcerts();
    fetchRecentActivity();

    const activityInterval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(activityInterval);
  }, []);

  // Audio cleanup
  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => { setCurrentlyPlaying(null); setIsPlaying(false); };
    const handlePause = () => { setIsPlaying(false); };
    const handlePlay = () => { setIsPlaying(true); };

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

  const fetchMusicData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const tracksRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/tracks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData);
      }

      const analyticsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error("Error fetching music data:", error);
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
      console.error("Error fetching genres:", error);
    }
  };

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

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/recent-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

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

    const audioUrl = track.audio_url || track.file_url || track.url;
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
          setErrorMessage("Failed to play track");
        });
    }
  };

  const incrementPlayCount = async (trackId) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tracks/${trackId}/play`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, plays: (t.plays || 0) + 1 } : t));
    } catch (err) {
      console.error("Failed to increment play count:", err);
    }
  };

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
        setTracks(prev => prev.filter(t => t.id !== trackId));
      }
    } catch (err) {
      console.error("Delete error:", err);
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
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });

      if (res.ok) {
        setTrackTitle('');
        setGenre('');
        setAudioFile(null);
        setExplicit(false);
        fetchMusicData();
        alert("Track uploaded successfully!");
      } else {
        const data = await res.json();
        setErrorMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setErrorMessage("Server error during upload.");
    }
  };

  // Concert handlers
  const handleCreateConcert = async () => {
    if (!newConcert.title.trim() || !newConcert.date) {
      setConcertMessage("❌ Please fill in required fields");
      return;
    }
    setSavingConcert(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newConcert),
      });
      if (response.ok) {
        const data = await response.json();
        setConcertMessage("✅ Concert created!");
        setMyConcerts([...myConcerts, data.concert || data]);
        resetConcertForm();
      }
    } catch (err) {
      setConcertMessage(`❌ ${err.message}`);
    } finally {
      setSavingConcert(false);
    }
  };

  const handleDeleteConcert = async (concertId) => {
    if (!window.confirm("Delete this concert?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts/${concertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyConcerts(myConcerts.filter(c => c.id !== concertId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const resetConcertForm = () => {
    setNewConcert({ title: '', date: '', time: '', price: '', description: '', category: 'Music', venue: '', max_tickets: '' });
    setConcertBeingEdited(null);
    setShowConcertForm(false);
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading music dashboard...</p>
      </div>
    );
  }

  return (
    <div className="music-tab">
      {/* Sub-navigation */}
      <div className="sub-tabs">
        {['overview', 'tracks', 'concerts', 'upload', 'analytics'].map(tab => (
          <button
            key={tab}
            className={`sub-tab ${activeSubTab === tab ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab)}
          >
            {tab === 'overview' && <FaChartLine />}
            {tab === 'tracks' && <FaMusic />}
            {tab === 'concerts' && <FaTicketAlt />}
            {tab === 'upload' && <FaUpload />}
            {tab === 'analytics' && <FaChartLine />}
            <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* Overview Sub-tab */}
      {activeSubTab === 'overview' && (
        <div className="music-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <FaDollarSign className="stat-icon" />
              <div className="stat-info">
                <h3>Earnings</h3>
                <p>${analytics.revenue_this_month?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="stat-card">
              <FaUserFriends className="stat-icon" />
              <div className="stat-info">
                <h3>Followers</h3>
                <p>{analytics.total_followers || 0}</p>
              </div>
            </div>
            <div className="stat-card">
              <FaMusic className="stat-icon" />
              <div className="stat-info">
                <h3>Tracks</h3>
                <p>{tracks.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <FaHeadphones className="stat-icon" />
              <div className="stat-info">
                <h3>Total Plays</h3>
                <p>{analytics.total_plays || 0}</p>
              </div>
            </div>
          </div>

          <div className="quick-actions-grid">
            <button className="quick-action-card" onClick={() => setActiveSubTab('upload')}>
              <div className="action-icon">⬆️</div>
              <h4>Upload Track</h4>
            </button>
            <button className="quick-action-card" onClick={() => setStudioOpen(true)}>
              <div className="action-icon">📡</div>
              <h4>Live Studio</h4>
            </button>
            <button className="quick-action-card" onClick={() => setActiveSubTab('concerts')}>
              <div className="action-icon">🎭</div>
              <h4>Create Concert</h4>
            </button>
            <Link to="/music-distribution" className="quick-action-card">
              <div className="action-icon">🌍</div>
              <h4>Distribution</h4>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="activity-section">
            <h3><FaChartLine /> Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="no-activity">No recent activity yet.</p>
            ) : (
              <div className="activity-list">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span className="activity-icon">{activity.icon}</span>
                    <div className="activity-content">
                      <p>{activity.action}</p>
                      <small>{activity.time_ago}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tracks Sub-tab */}
      {activeSubTab === 'tracks' && (
        <div className="tracks-content">
          <div className="section-header">
            <h3><FaMusic /> My Tracks ({tracks.length})</h3>
            <button className="btn-primary" onClick={() => setActiveSubTab('upload')}>
              <FaUpload /> Upload New
            </button>
          </div>

          {currentlyPlaying && (
            <div className="now-playing-banner">
              <FaMusic /> Now Playing: <strong>{currentlyPlaying.title}</strong>
              <button onClick={() => { audioRef.current.pause(); setCurrentlyPlaying(null); }}>
                <FaPause /> Stop
              </button>
            </div>
          )}

          {tracks.length === 0 ? (
            <div className="empty-state">
              <FaMusic className="empty-icon" />
              <h4>No tracks uploaded yet</h4>
              <button className="btn-primary" onClick={() => setActiveSubTab('upload')}>
                Upload Your First Track
              </button>
            </div>
          ) : (
            <div className="tracks-grid">
              {tracks.map((track) => (
                <div key={track.id} className="track-card">
                  <div className="track-artwork">
                    <img src={track.artwork || '/default-track-artwork.png'} alt={track.title} />
                    <button className="play-btn" onClick={() => handlePlayTrack(track)}>
                      {currentlyPlaying?.id === track.id && isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                  </div>
                  <div className="track-info">
                    <h4>{track.title}</h4>
                    <p>{track.genre}</p>
                    <div className="track-stats">
                      <span><FaHeadphones /> {track.plays || 0}</span>
                      <span><FaHeart /> {track.likes || 0}</span>
                    </div>
                  </div>
                  <div className="track-actions">
                    <button onClick={() => setTrackBeingEdited(track)}><FaEdit /></button>
                    <button className="danger" onClick={() => handleDeleteTrack(track.id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Concerts Sub-tab */}
      {activeSubTab === 'concerts' && (
        <div className="concerts-content">
          <div className="section-header">
            <h3><FaTicketAlt /> My Concerts ({myConcerts.length})</h3>
            <button className="btn-primary" onClick={() => setShowConcertForm(true)}>
              + Create Concert
            </button>
          </div>

          {concertMessage && (
            <div className={`alert ${concertMessage.includes('❌') ? 'error' : 'success'}`}>
              {concertMessage}
            </div>
          )}

          {showConcertForm && (
            <div className="concert-form-card">
              <h4>{concertBeingEdited ? '✏️ Edit Concert' : '🎭 New Concert'}</h4>
              <div className="form-grid">
                <input placeholder="Concert Title *" value={newConcert.title} 
                  onChange={(e) => setNewConcert({...newConcert, title: e.target.value})} />
                <input type="date" value={newConcert.date}
                  onChange={(e) => setNewConcert({...newConcert, date: e.target.value})} />
                <input type="time" value={newConcert.time}
                  onChange={(e) => setNewConcert({...newConcert, time: e.target.value})} />
                <input type="number" placeholder="Ticket Price ($)" value={newConcert.price}
                  onChange={(e) => setNewConcert({...newConcert, price: e.target.value})} />
                <input placeholder="Venue" value={newConcert.venue}
                  onChange={(e) => setNewConcert({...newConcert, venue: e.target.value})} />
                <textarea placeholder="Description" value={newConcert.description}
                  onChange={(e) => setNewConcert({...newConcert, description: e.target.value})} />
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={resetConcertForm}>Cancel</button>
                <button className="btn-primary" onClick={handleCreateConcert} disabled={savingConcert}>
                  {savingConcert ? 'Saving...' : 'Create Concert'}
                </button>
              </div>
            </div>
          )}

          {myConcerts.length === 0 && !showConcertForm ? (
            <div className="empty-state">
              <FaTicketAlt className="empty-icon" />
              <h4>No concerts scheduled</h4>
              <button className="btn-primary" onClick={() => setShowConcertForm(true)}>
                Create Your First Concert
              </button>
            </div>
          ) : (
            <div className="concerts-grid">
              {myConcerts.map((concert) => (
                <div key={concert.id} className="concert-card">
                  <span className="status-badge">
                    {new Date(concert.date) > new Date() ? '🟢 Upcoming' : '⚫ Past'}
                  </span>
                  <h4>{concert.title}</h4>
                  <p>📅 {new Date(concert.date).toLocaleDateString()}</p>
                  {concert.venue && <p>📍 {concert.venue}</p>}
                  <p className="price">{concert.price > 0 ? `$${concert.price}` : 'FREE'}</p>
                  <div className="concert-actions">
                    <Link to={`/concert/${concert.id}`}><FaEye /></Link>
                    <button className="danger" onClick={() => handleDeleteConcert(concert.id)}><FaTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Sub-tab */}
      {activeSubTab === 'upload' && (
        <div className="upload-content">
          <h3><FaUpload /> Upload New Track</h3>
          {errorMessage && <div className="error-message">{errorMessage}</div>}
          
          <div className="upload-form">
            <div className="form-group">
              <label>Track Title *</label>
              <input type="text" placeholder="Enter track title" value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Genre *</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">Select Genre</option>
                {genres.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Audio File *</label>
              <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
              {audioFile && <small>Selected: {audioFile.name}</small>}
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={explicit} onChange={() => setExplicit(!explicit)} />
                Contains explicit lyrics
              </label>
            </div>
            <button className="btn-primary" onClick={handleAudioUpload} 
              disabled={!trackTitle || !genre || !audioFile}>
              <FaUpload /> Upload Track
            </button>
          </div>
        </div>
      )}

      {/* Analytics Sub-tab */}
      {activeSubTab === 'analytics' && (
        <div className="analytics-content">
          <h3><FaChartLine /> Music Analytics</h3>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Monthly Listeners</h4>
              <div className="metric-value">{analytics.monthly_listeners || 0}</div>
            </div>
            <div className="analytics-card">
              <h4>Top Track</h4>
              <div className="metric-value">{tracks.length > 0 ? tracks[0]?.title : 'N/A'}</div>
            </div>
            <div className="analytics-card">
              <h4>Revenue This Month</h4>
              <div className="metric-value">${analytics.revenue_this_month?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
          <div className="upgrade-prompt">
            <p>Upgrade to Pro for detailed analytics, demographics, and revenue tracking.</p>
            <Link to="/pricing" className="btn-primary">Upgrade to Pro</Link>
          </div>
        </div>
      )}

      {/* Modals */}
      {studioOpen && <LiveStudio onClose={() => setStudioOpen(false)} />}
      {trackBeingEdited && <EditTrackForm track={trackBeingEdited} onClose={() => setTrackBeingEdited(null)} onSave={fetchMusicData} />}
    </div>
  );
};

export default DashboardMusic;