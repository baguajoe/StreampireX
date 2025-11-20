import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import LoadingSpinner from "../component/LoadingSpinner";
import EmptyState from "../component/EmptyState";
import { showToast } from "../utils/toast";
import "../../styles/RadioStationDashboard.css";

const RadioStationDashboard = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStations: 0,
    totalListeners: 0,
    activeBroadcasts: 0,
    totalSongs: 0
  });

  useEffect(() => {
    fetchRadioStations();
  }, []);

  const fetchRadioStations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      if (!token) {
        showToast.error("Please log in to view your radio stations");
        navigate("/login");
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch user's radio stations
      const response = await fetch(`${backendUrl}/api/radio-stations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStations(data);
        
        // Calculate stats
        const activeBroadcasts = data.filter(s => s.is_live).length;
        const totalSongs = data.reduce((sum, station) => sum + (station.song_count || 0), 0);
        const totalListeners = data.reduce((sum, station) => sum + (station.listener_count || 0), 0);
        
        setStats({
          totalStations: data.length,
          totalListeners: totalListeners,
          activeBroadcasts: activeBroadcasts,
          totalSongs: totalSongs
        });
      } else if (response.status === 401) {
        showToast.error("Session expired. Please log in again.");
        navigate("/login");
      } else {
        showToast.error("Failed to load radio stations");
      }
    } catch (error) {
      console.error("Error fetching radio stations:", error);
      showToast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm("Are you sure you want to delete this radio station? This action cannot be undone.")) {
      return;
    }

    const toastId = showToast.loading("Deleting radio station...");

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/radio/${stationId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        showToast.success("Radio station deleted successfully!", { id: toastId });
        // Remove from local state
        setStations(stations.filter(s => s.id !== stationId));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalStations: prev.totalStations - 1
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to delete station", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting station:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  const handleToggleLive = async (stationId, currentStatus) => {
    const newStatus = !currentStatus;
    const toastId = showToast.loading(`${newStatus ? "Starting" : "Stopping"} broadcast...`);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/radio/${stationId}/toggle-live`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_live: newStatus })
      });

      if (response.ok) {
        showToast.success(`Broadcast ${newStatus ? "started" : "stopped"} successfully!`, { id: toastId });
        // Update local state
        setStations(stations.map(s => 
          s.id === stationId ? { ...s, is_live: newStatus } : s
        ));
        // Update stats
        setStats(prev => ({
          ...prev,
          activeBroadcasts: newStatus ? prev.activeBroadcasts + 1 : prev.activeBroadcasts - 1
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to toggle broadcast", { id: toastId });
      }
    } catch (error) {
      console.error("Error toggling broadcast:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your radio stations..." fullScreen />;
  }

  return (
    <div className="radio-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📻 Radio Station Dashboard</h1>
          <p>Manage your radio stations and broadcasts</p>
        </div>
        <Link to="/create-radio" className="create-station-btn">
          ➕ Create New Station
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📻</div>
          <div className="stat-content">
            <h3>{stats.totalStations}</h3>
            <p>Total Stations</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📡</div>
          <div className="stat-content">
            <h3>{stats.activeBroadcasts}</h3>
            <p>Active Broadcasts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalListeners.toLocaleString()}</h3>
            <p>Total Listeners</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-content">
            <h3>{stats.totalSongs}</h3>
            <p>Songs in Library</p>
          </div>
        </div>
      </div>

      {/* Radio Stations List */}
      {stations.length > 0 ? (
        <div className="stations-section">
          <h2>Your Radio Stations</h2>
          <div className="stations-grid">
            {stations.map(station => (
              <div key={station.id} className="station-card">
                <div className="station-image">
                  {station.cover_image ? (
                    <img src={station.cover_image} alt={station.name} />
                  ) : (
                    <div className="station-placeholder">📻</div>
                  )}
                  <span className={`status-badge ${station.is_live ? 'live' : 'offline'}`}>
                    {station.is_live ? '🔴 LIVE' : '⚫ Offline'}
                  </span>
                </div>

                <div className="station-info">
                  <h3>{station.name}</h3>
                  <p className="station-description">
                    {station.description 
                      ? (station.description.length > 100 
                          ? station.description.substring(0, 100) + '...' 
                          : station.description)
                      : 'No description'}
                  </p>

                  <div className="station-meta">
                    <span className="genre-tag">{station.genre || 'General'}</span>
                    {station.is_24_7 && <span className="feature-tag">24/7</span>}
                  </div>

                  <div className="station-stats">
                    <div className="stat">
                      <span className="stat-label">Listeners:</span>
                      <span className="stat-value">{station.listener_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Songs:</span>
                      <span className="stat-value">{station.song_count || 0}</span>
                    </div>
                  </div>

                  <div className="station-actions">
                    <Link 
                      to={`/radio/station/${station.id}/station`} 
                      className="action-btn view"
                      title="View Station"
                    >
                      👁️ View
                    </Link>
                    <Link 
                      to={`/radio/${station.id}/schedule`} 
                      className="action-btn schedule"
                      title="Manage Schedule"
                    >
                      📅 Schedule
                    </Link>
                    <button
                      onClick={() => handleToggleLive(station.id, station.is_live)}
                      className={`action-btn ${station.is_live ? 'stop' : 'start'}`}
                      title={station.is_live ? 'Stop Broadcast' : 'Start Broadcast'}
                    >
                      {station.is_live ? '⏹️ Stop' : '▶️ Start'}
                    </button>
                    <button
                      onClick={() => handleDeleteStation(station.id)}
                      className="action-btn delete"
                      title="Delete Station"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="📻"
          title="No Radio Stations Yet"
          message="Start broadcasting by creating your first radio station. Share your music with listeners 24/7!"
          actionText="Create Your First Station"
          actionLink="/create-radio"
          secondaryActionText="Browse Stations"
          secondaryActionLink="/browse-radio-stations"
        />
      )}

      {/* Quick Actions */}
      {stations.length > 0 && (
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <Link to="/create-radio" className="quick-action-card">
              <div className="action-icon">➕</div>
              <h3>Create New Station</h3>
              <p>Start a new radio station</p>
            </Link>

            <Link to="/browse-radio-stations" className="quick-action-card">
              <div className="action-icon">🔍</div>
              <h3>Browse Stations</h3>
              <p>Discover other stations</p>
            </Link>

            <Link to="/upload-music" className="quick-action-card">
              <div className="action-icon">🎵</div>
              <h3>Upload Music</h3>
              <p>Add songs to library</p>
            </Link>

            <Link to="/creator-dashboard" className="quick-action-card">
              <div className="action-icon">📊</div>
              <h3>Analytics</h3>
              <p>View performance stats</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioStationDashboard;