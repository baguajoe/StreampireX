// src/front/js/pages/Dashboard/DashboardPodcasts.js
// Podcasts Tab - Podcast management (from PodcastDashboard)
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import "../../../styles/PodcastDashboard.css";

const DashboardPodcasts = ({ user }) => {
  const navigate = useNavigate();
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalEpisodes: 0,
    totalListeners: 0,
    monthlyRevenue: 0,
    publishedCount: 0,
    draftCount: 0
  });

  useEffect(() => {
    fetchPodcastData();
  }, []);

  const fetchPodcastData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      if (!token) {
        showToast.error("Please log in to view your podcasts");
        navigate("/login");
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/podcast/dashboard`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setPodcasts(data);
          const totalEpisodes = data.reduce((sum, p) => sum + (p.episodes?.length || p.episode_count || 0), 0);
          const totalListeners = data.reduce((sum, p) => sum + (p.total_listens || 0), 0);
          const monthlyRevenue = data.reduce((sum, p) => sum + (p.monthly_revenue || p.ad_revenue || 0), 0);
          
          setStats({
            totalPodcasts: data.length,
            totalEpisodes,
            totalListeners,
            monthlyRevenue,
            publishedCount: data.filter(p => p.status === 'published').length,
            draftCount: data.filter(p => p.status !== 'published').length
          });
        } else {
          setPodcasts(data.podcasts || []);
          setStats({
            totalPodcasts: data.stats?.total_podcasts || 0,
            totalEpisodes: data.stats?.total_episodes || 0,
            totalListeners: data.stats?.total_listens || 0,
            monthlyRevenue: data.stats?.monthly_revenue || 0,
            publishedCount: data.stats?.published_count || 0,
            draftCount: data.stats?.draft_count || 0
          });
        }
      }
    } catch (error) {
      console.error("Error fetching podcast data:", error);
      showToast.error("Failed to load podcasts");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchPodcastData();
    setRefreshing(false);
    showToast.success("Refreshed!");
  };

  const handleDeletePodcast = async (podcastId) => {
    if (!window.confirm("Delete this podcast? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/${podcastId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        showToast.success("Podcast deleted!");
        setPodcasts(podcasts.filter(p => p.id !== podcastId));
        setStats(prev => ({ ...prev, totalPodcasts: prev.totalPodcasts - 1 }));
      }
    } catch (error) {
      showToast.error("Failed to delete podcast");
    }
  };

  const handlePublishToggle = async (podcastId, currentStatus) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcast/${podcastId}/status`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast.success(`Podcast ${newStatus === "published" ? "published" : "unpublished"}!`);
        setPodcasts(podcasts.map(p => p.id === podcastId ? { ...p, status: newStatus } : p));
      }
    } catch (error) {
      showToast.error("Failed to update status");
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading podcasts...</p>
      </div>
    );
  }

  return (
    <div className="podcasts-tab">
      {/* Header */}
      <div className="tab-header">
        <div className="header-left">
          <h2>🎙️ My Podcasts</h2>
          <p>Manage your podcasts and episodes</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={refreshData} disabled={refreshing}>
            {refreshing ? '⏳' : '🔄'}
          </button>
          <Link to="/podcast-create" className="btn-primary">
            ➕ Create Podcast
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎙️</div>
          <div className="stat-content">
            <h3>{stats.totalPodcasts}</h3>
            <p>Total Podcasts</p>
            {stats.publishedCount > 0 && (
              <small>{stats.publishedCount} live, {stats.draftCount} drafts</small>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📻</div>
          <div className="stat-content">
            <h3>{stats.totalEpisodes}</h3>
            <p>Total Episodes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalListeners)}</h3>
            <p>Total Listeners</p>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>${stats.monthlyRevenue.toFixed(2)}</h3>
            <p>Monthly Revenue</p>
          </div>
        </div>
      </div>

      {/* Podcasts List */}
      {podcasts.length > 0 ? (
        <div className="podcasts-section">
          <div className="section-header">
            <h3>Your Podcasts</h3>
            <span className="count">{podcasts.length} show{podcasts.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="podcasts-grid">
            {podcasts.map(podcast => (
              <div key={podcast.id} className="podcast-card">
                <div className="podcast-image">
                  {podcast.cover_image ? (
                    <img src={podcast.cover_image} alt={podcast.title} />
                  ) : (
                    <div className="podcast-placeholder">🎙️</div>
                  )}
                  <span className={`status-badge ${podcast.status || 'draft'}`}>
                    {podcast.status === 'published' ? '● Live' : '○ Draft'}
                  </span>
                </div>

                <div className="podcast-info">
                  <h4>{podcast.title}</h4>
                  <p className="description">
                    {podcast.description 
                      ? (podcast.description.length > 80 
                          ? podcast.description.substring(0, 80) + '...' 
                          : podcast.description)
                      : 'No description'}
                  </p>

                  <div className="podcast-stats">
                    <span>📻 {podcast.episodes?.length || podcast.episode_count || 0} episodes</span>
                    <span>👥 {formatNumber(podcast.total_listens || 0)} listens</span>
                  </div>

                  <div className="podcast-actions">
                    <Link to={`/podcast/${podcast.id}`} className="action-btn view">👁️</Link>
                    <Link to={`/podcast/${podcast.id}/edit`} className="action-btn edit">✏️</Link>
                    <Link to={`/podcast/${podcast.id}/episodes`} className="action-btn">📋</Link>
                    <button
                      onClick={() => handlePublishToggle(podcast.id, podcast.status)}
                      className={`action-btn ${podcast.status === 'published' ? 'unpublish' : 'publish'}`}
                    >
                      {podcast.status === 'published' ? '📴' : '🚀'}
                    </button>
                    <button onClick={() => handleDeletePodcast(podcast.id)} className="action-btn delete">
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
          <div className="empty-icon">🎙️</div>
          <h3>No Podcasts Yet</h3>
          <p>Start your podcasting journey by creating your first show!</p>
          <Link to="/podcast-create" className="btn-primary">
            Create Your First Podcast
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      {podcasts.length > 0 && (
        <div className="quick-actions-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link to="/podcast-create" className="quick-action-card">
              <div className="action-icon">➕</div>
              <h4>New Podcast</h4>
            </Link>
            <Link to="/browse-podcast-categories" className="quick-action-card">
              <div className="action-icon">🔍</div>
              <h4>Browse</h4>
            </Link>
            <Link to="/dashboard" className="quick-action-card">
              <div className="action-icon">📊</div>
              <h4>Analytics</h4>
            </Link>
            <Link to="/settings" className="quick-action-card">
              <div className="action-icon">⚙️</div>
              <h4>Settings</h4>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPodcasts;