// src/front/js/pages/PodcastDashboard.js
import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import LoadingSpinner from "../component/LoadingSpinner";
import EmptyState from "../component/EmptyState";
import { showToast } from "../utils/toast";
import "../../styles/PodcastDashboard.css";

const PodcastDashboard = () => {
  const { store } = useContext(Context);
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
      
      // Fetch user's podcasts with stats
      const podcastsResponse = await fetch(`${backendUrl}/api/podcast/dashboard`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (podcastsResponse.ok) {
        const data = await podcastsResponse.json();
        
        // Handle both old (array) and new (object with stats) response formats
        if (Array.isArray(data)) {
          // Old format - array of podcasts (backward compatibility)
          setPodcasts(data);
          
          const totalEpisodes = data.reduce((sum, podcast) => 
            sum + (podcast.episodes?.length || podcast.episode_count || 0), 0);
          const totalListeners = data.reduce((sum, podcast) => 
            sum + (podcast.total_listens || 0), 0);
          const publishedCount = data.filter(p => p.status === 'published').length;
          const draftCount = data.filter(p => p.status !== 'published').length;
          
          // Calculate monthly revenue from podcast data if available
          const monthlyRevenue = data.reduce((sum, podcast) => {
            if (podcast.monthly_revenue) return sum + podcast.monthly_revenue;
            if (podcast.ad_revenue) return sum + podcast.ad_revenue;
            return sum;
          }, 0);
          
          setStats({
            totalPodcasts: data.length,
            totalEpisodes: totalEpisodes,
            totalListeners: totalListeners,
            monthlyRevenue: monthlyRevenue,
            publishedCount: publishedCount,
            draftCount: draftCount
          });
        } else {
          // New format - object with podcasts and stats
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
      } else if (podcastsResponse.status === 401) {
        showToast.error("Session expired. Please log in again.");
        navigate("/login");
      } else {
        showToast.error("Failed to load podcasts");
      }
    } catch (error) {
      console.error("Error fetching podcast data:", error);
      showToast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const podcastsResponse = await fetch(`${backendUrl}/api/podcast/dashboard`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (podcastsResponse.ok) {
        const data = await podcastsResponse.json();
        
        if (Array.isArray(data)) {
          setPodcasts(data);
          const totalEpisodes = data.reduce((sum, podcast) => 
            sum + (podcast.episodes?.length || podcast.episode_count || 0), 0);
          const totalListeners = data.reduce((sum, podcast) => 
            sum + (podcast.total_listens || 0), 0);
          const monthlyRevenue = data.reduce((sum, podcast) => 
            sum + (podcast.monthly_revenue || podcast.ad_revenue || 0), 0);
          
          setStats({
            totalPodcasts: data.length,
            totalEpisodes: totalEpisodes,
            totalListeners: totalListeners,
            monthlyRevenue: monthlyRevenue,
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
        showToast.success("Dashboard refreshed!");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      showToast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeletePodcast = async (podcastId) => {
    if (!window.confirm("Are you sure you want to delete this podcast? This action cannot be undone.")) {
      return;
    }

    const toastId = showToast.loading("Deleting podcast...");

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/podcast/${podcastId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        showToast.success("Podcast deleted successfully!", { id: toastId });
        
        // Find the deleted podcast to update stats correctly
        const deletedPodcast = podcasts.find(p => p.id === podcastId);
        const deletedEpisodes = deletedPodcast?.episodes?.length || deletedPodcast?.episode_count || 0;
        const deletedListens = deletedPodcast?.total_listens || 0;
        const wasPublished = deletedPodcast?.status === 'published';
        
        setPodcasts(podcasts.filter(p => p.id !== podcastId));
        setStats(prev => ({
          ...prev,
          totalPodcasts: prev.totalPodcasts - 1,
          totalEpisodes: prev.totalEpisodes - deletedEpisodes,
          totalListeners: prev.totalListeners - deletedListens,
          publishedCount: wasPublished ? prev.publishedCount - 1 : prev.publishedCount,
          draftCount: !wasPublished ? prev.draftCount - 1 : prev.draftCount
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to delete podcast", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting podcast:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  const handlePublishToggle = async (podcastId, currentStatus) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const toastId = showToast.loading(`${newStatus === "published" ? "Publishing" : "Unpublishing"} podcast...`);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/podcast/${podcastId}/status`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast.success(`Podcast ${newStatus === "published" ? "published" : "unpublished"} successfully!`, { id: toastId });
        setPodcasts(podcasts.map(p => 
          p.id === podcastId ? { ...p, status: newStatus } : p
        ));
        
        // Update published/draft counts
        setStats(prev => ({
          ...prev,
          publishedCount: newStatus === 'published' ? prev.publishedCount + 1 : prev.publishedCount - 1,
          draftCount: newStatus === 'published' ? prev.draftCount - 1 : prev.draftCount + 1
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to update status", { id: toastId });
      }
    } catch (error) {
      console.error("Error updating podcast status:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  if (loading) {
    return <LoadingSpinner message="Loading your podcasts..." fullScreen />;
  }

  return (
    <div className="podcast-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🎙️ Podcast Dashboard</h1>
          <p>Manage your podcasts and track performance</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn"
            onClick={refreshData}
            disabled={refreshing}
            title="Refresh Data"
          >
            {refreshing ? '⏳' : '🔄'}
          </button>
          <Link to="/podcast-create" className="create-podcast-btn">
            ➕ Create New Podcast
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎙️</div>
          <div className="stat-content">
            <h3>{stats.totalPodcasts}</h3>
            <p>Total Podcasts</p>
            {stats.publishedCount > 0 && (
              <small className="stat-detail">
                {stats.publishedCount} live, {stats.draftCount} drafts
              </small>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📻</div>
          <div className="stat-content">
            <h3>{stats.totalEpisodes}</h3>
            <p>Total Episodes</p>
            {stats.totalPodcasts > 0 && (
              <small className="stat-detail">
                ~{Math.round(stats.totalEpisodes / stats.totalPodcasts)} per show
              </small>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalListeners)}</h3>
            <p>Total Listeners</p>
            {stats.totalEpisodes > 0 && (
              <small className="stat-detail">
                ~{formatNumber(Math.round(stats.totalListeners / stats.totalEpisodes))} per episode
              </small>
            )}
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>${stats.monthlyRevenue.toFixed(2)}</h3>
            <p>Monthly Revenue</p>
            {stats.monthlyRevenue > 0 && (
              <small className="stat-detail">
                From ads, tips & subs
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Podcasts List */}
      {podcasts.length > 0 ? (
        <div className="podcasts-section">
          <div className="section-header">
            <h2>Your Podcasts</h2>
            <span className="podcast-count">{podcasts.length} show{podcasts.length !== 1 ? 's' : ''}</span>
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
                  <h3>{podcast.title}</h3>
                  <p className="podcast-description">
                    {podcast.description 
                      ? (podcast.description.length > 100 
                          ? podcast.description.substring(0, 100) + '...' 
                          : podcast.description)
                      : 'No description'}
                  </p>

                  <div className="podcast-stats">
                    <div className="stat">
                      <span className="stat-label">Episodes:</span>
                      <span className="stat-value">
                        {podcast.episodes?.length || podcast.episode_count || 0}
                      </span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Listens:</span>
                      <span className="stat-value">
                        {formatNumber(podcast.total_listens || 0)}
                      </span>
                    </div>
                    {podcast.monthly_listens > 0 && (
                      <div className="stat">
                        <span className="stat-label">This Month:</span>
                        <span className="stat-value">
                          {formatNumber(podcast.monthly_listens)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="podcast-actions">
                    <Link 
                      to={`/podcast/${podcast.id}`} 
                      className="podcast-action-btn view"
                      title="View Podcast"
                    >
                      👁️ View
                    </Link>
                    <Link 
                      to={`/podcast/${podcast.id}/edit`} 
                      className="podcast-action-btn edit"
                      title="Edit Podcast"
                    >
                      ✏️ Edit
                    </Link>
                    <Link 
                      to={`/podcast/${podcast.id}/episodes`} 
                      className="podcast-action-btn episodes"
                      title="Manage Episodes"
                    >
                      📋 Episodes
                    </Link>
                    <button
                      onClick={() => handlePublishToggle(podcast.id, podcast.status)}
                      className={`podcast-action-btn ${podcast.status === 'published' ? 'unpublish' : 'publish'}`}
                      title={podcast.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {podcast.status === 'published' ? '📴 Unpublish' : '🚀 Publish'}
                    </button>
                    <button
                      onClick={() => handleDeletePodcast(podcast.id)}
                      className="podcast-action-btn delete"
                      title="Delete Podcast"
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
          icon="🎙️"
          title="No Podcasts Yet"
          message="Start your podcasting journey by creating your first show. Share your voice with the world!"
          actionText="Create Your First Podcast"
          actionLink="/podcast-create"
          secondaryActionText="Learn More"
          secondaryActionLink="/podcasts"
        />
      )}

      {/* Quick Actions */}
      {podcasts.length > 0 && (
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <Link to="/podcast-create" className="quick-action-card">
              <div className="action-icon">➕</div>
              <h3>Create New Podcast</h3>
              <p>Start a new podcast series</p>
            </Link>

            <Link to="/browse-podcast-categories" className="quick-action-card">
              <div className="action-icon">🔍</div>
              <h3>Browse Podcasts</h3>
              <p>Discover other shows</p>
            </Link>

            <Link to="/creator-dashboard" className="quick-action-card">
              <div className="action-icon">📊</div>
              <h3>Creator Dashboard</h3>
              <p>View all analytics</p>
            </Link>

            <Link to="/settings" className="quick-action-card">
              <div className="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Manage your account</p>
            </Link>
          </div>
        </div>
      )}

      {/* Revenue Breakdown (if revenue exists) */}
      {stats.monthlyRevenue > 0 && (
        <div className="revenue-section">
          <h2>💰 Revenue Overview</h2>
          <div className="revenue-card">
            <div className="revenue-main">
              <span className="revenue-label">This Month's Earnings</span>
              <span className="revenue-amount">${stats.monthlyRevenue.toFixed(2)}</span>
            </div>
            <p className="revenue-note">
              Revenue from ad placements, listener tips, and premium subscriptions. 
              You keep 85-90% of all earnings.
            </p>
            <Link to="/creator-dashboard" className="view-details-link">
              View Full Breakdown →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PodcastDashboard;