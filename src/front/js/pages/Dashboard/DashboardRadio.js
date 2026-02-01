// src/front/js/pages/Dashboard/DashboardRadio.js
// Radio Tab - Radio station management (from RadioStationDashboard)
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import "../../../styles/RadioStationDashboard.css";

const DashboardRadio = ({ user }) => {
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

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio-stations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStations(data);
        
        const activeBroadcasts = data.filter(s => s.is_live).length;
        const totalSongs = data.reduce((sum, s) => sum + (s.song_count || 0), 0);
        const totalListeners = data.reduce((sum, s) => sum + (s.listener_count || 0), 0);
        
        setStats({
          totalStations: data.length,
          totalListeners,
          activeBroadcasts,
          totalSongs
        });
      }
    } catch (error) {
      console.error("Error fetching radio stations:", error);
      showToast.error("Failed to load radio stations");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm("Delete this radio station? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${stationId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        showToast.success("Station deleted!");
        setStations(stations.filter(s => s.id !== stationId));
        setStats(prev => ({ ...prev, totalStations: prev.totalStations - 1 }));
      }
    } catch (error) {
      showToast.error("Failed to delete station");
    }
  };

  const handleToggleLive = async (stationId, currentStatus) => {
    const newStatus = !currentStatus;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${stationId}/toggle-live`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_live: newStatus })
      });

      if (response.ok) {
        showToast.success(`Broadcast ${newStatus ? "started" : "stopped"}!`);
        setStations(stations.map(s => s.id === stationId ? { ...s, is_live: newStatus } : s));
        setStats(prev => ({
          ...prev,
          activeBroadcasts: newStatus ? prev.activeBroadcasts + 1 : prev.activeBroadcasts - 1
        }));
      }
    } catch (error) {
      showToast.error("Failed to toggle broadcast");
    }
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading radio stations...</p>
      </div>
    );
  }

  return (
    <div className="radio-tab">
      {/* Header */}
      <div className="tab-header">
        <div className="header-left">
          <h2>📻 My Radio Stations</h2>
          <p>Manage your radio stations and broadcasts</p>
        </div>
        <div className="header-actions">
          <Link to="/create-radio" className="btn-primary">
            ➕ Create Station
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Stations List */}
      {stations.length > 0 ? (
        <div className="stations-section">
          <div className="section-header">
            <h3>Your Stations</h3>
          </div>
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
                  <h4>{station.name}</h4>
                  <p className="description">
                    {station.description 
                      ? (station.description.length > 80 
                          ? station.description.substring(0, 80) + '...' 
                          : station.description)
                      : 'No description'}
                  </p>

                  <div className="station-meta">
                    <span className="genre-tag">{station.genre || 'General'}</span>
                    {station.is_24_7 && <span className="feature-tag">24/7</span>}
                  </div>

                  <div className="station-stats">
                    <span>👥 {station.listener_count || 0} listeners</span>
                    <span>🎵 {station.song_count || 0} songs</span>
                  </div>

                  <div className="station-actions">
                    <Link to={`/radio/station/${station.id}/station`} className="action-btn view">
                      👁️
                    </Link>
                    <Link to={`/radio/${station.id}/schedule`} className="action-btn">
                      📅
                    </Link>
                    <button
                      onClick={() => handleToggleLive(station.id, station.is_live)}
                      className={`action-btn ${station.is_live ? 'stop' : 'start'}`}
                    >
                      {station.is_live ? '⏹️' : '▶️'}
                    </button>
                    <button onClick={() => handleDeleteStation(station.id)} className="action-btn delete">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📻</div>
          <h3>No Radio Stations Yet</h3>
          <p>Start broadcasting by creating your first radio station!</p>
          <Link to="/create-radio" className="btn-primary">
            Create Your First Station
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      {stations.length > 0 && (
        <div className="quick-actions-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link to="/create-radio" className="quick-action-card">
              <div className="action-icon">➕</div>
              <h4>New Station</h4>
            </Link>
            <Link to="/browse-radio-stations" className="quick-action-card">
              <div className="action-icon">🔍</div>
              <h4>Browse</h4>
            </Link>
            <Link to="/upload-music" className="quick-action-card">
              <div className="action-icon">🎵</div>
              <h4>Upload Music</h4>
            </Link>
            <Link to="/dashboard" className="quick-action-card">
              <div className="action-icon">📊</div>
              <h4>Analytics</h4>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardRadio;