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
  const [stats, setStats] = useState({
    totalPodcasts: 0,
    totalEpisodes: 0,
    totalListeners: 0,
    monthlyRevenue: 0
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
      
      // Fetch user's podcasts
      const podcastsResponse = await fetch(`${backendUrl}/api/podcast/dashboard`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (podcastsResponse.ok) {
        const data = await podcastsResponse.json();
        setPodcasts(data);
        
        // Calculate stats
        const totalEpisodes = data.reduce((sum, podcast) => sum + (podcast.episodes?.length || 0), 0);
        const totalListeners = data.reduce((sum, podcast) => sum + (podcast.total_listens || 0), 0);
        
        setStats({
          totalPodcasts: data.length,
          totalEpisodes: totalEpisodes,
          totalListeners: totalListeners,
          monthlyRevenue: 0 // You can calculate this from your data
        });
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
        // Remove from local state
        setPodcasts(podcasts.filter(p => p.id !== podcastId));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalPodcasts: prev.totalPodcasts - 1
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
        // Update local state
        setPodcasts(podcasts.map(p => 
          p.id === podcastId ? { ...p, status: newStatus } : p
        ));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to update status", { id: toastId });
      }
    } catch (error) {
      console.error("Error updating podcast status:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
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
        <Link to="/podcast-create" className="create-podcast-btn">
          ➕ Create New Podcast
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎙️</div>
          <div className="stat-content">
            <h3>{stats.totalPodcasts}</h3>
            <p>Total Podcasts</p>
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
            <h3>{stats.totalListeners.toLocaleString()}</h3>
            <p>Total Listeners</p>
          </div>
        </div>

        <div className="stat-card">
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
          <h2>Your Podcasts</h2>
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
                      <span className="stat-value">{podcast.episodes?.length || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Listens:</span>
                      <span className="stat-value">{podcast.total_listens?.toLocaleString() || '0'}</span>
                    </div>
                  </div>

                  <div className="podcast-actions">
                    <Link 
                      to={`/podcast/${podcast.id}`} 
                      className="action-btn view"
                      title="View Podcast"
                    >
                      👁️ View
                    </Link>
                    <Link 
                      to={`/podcast/${podcast.id}/edit`} 
                      className="action-btn edit"
                      title="Edit Podcast"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handlePublishToggle(podcast.id, podcast.status)}
                      className={`action-btn ${podcast.status === 'published' ? 'unpublish' : 'publish'}`}
                      title={podcast.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {podcast.status === 'published' ? '📴 Unpublish' : '🚀 Publish'}
                    </button>
                    <button
                      onClick={() => handleDeletePodcast(podcast.id)}
                      className="action-btn delete"
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
    </div>
  );
};

export default PodcastDashboard;