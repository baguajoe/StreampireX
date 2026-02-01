// src/front/js/pages/Dashboard/DashboardVideos.js
// Videos Tab - Video channel management (from VideoChannelDashboard)
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast";
import "../../../styles/VideoChannelDashboard.css";

const DashboardVideos = ({ user }) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    fetchVideoData();
  }, []);

  const fetchVideoData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Fetch user's videos
      const videosRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/videos/my-videos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (videosRes.ok) {
        const data = await videosRes.json();
        const videoList = data.videos || data || [];
        setVideos(videoList);
        
        // Calculate stats
        const totalViews = videoList.reduce((sum, v) => sum + (v.views || v.view_count || 0), 0);
        const totalLikes = videoList.reduce((sum, v) => sum + (v.likes || v.like_count || 0), 0);
        
        setStats({
          totalVideos: videoList.length,
          totalViews,
          totalLikes,
          subscribers: data.subscribers || user?.subscribers || 0,
          monthlyRevenue: data.monthly_revenue || 0
        });
      }

      // Fetch channel stats if available
      const statsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video-channel/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (statsRes.ok) {
        const channelStats = await statsRes.json();
        setStats(prev => ({
          ...prev,
          subscribers: channelStats.subscribers || prev.subscribers,
          monthlyRevenue: channelStats.monthly_revenue || prev.monthlyRevenue
        }));
      }
    } catch (error) {
      console.error("Error fetching video data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Delete this video? This cannot be undone.")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/videos/${videoId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        showToast.success("Video deleted!");
        setVideos(videos.filter(v => v.id !== videoId));
        setStats(prev => ({ ...prev, totalVideos: prev.totalVideos - 1 }));
      }
    } catch (error) {
      showToast.error("Failed to delete video");
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <div className="videos-tab">
      {/* Header */}
      <div className="tab-header">
        <div className="header-left">
          <h2>📹 My Video Channel</h2>
          <p>Manage your videos and channel</p>
        </div>
        <div className="header-actions">
          <Link to="/my-channel" className="btn-secondary">
            👁️ View Channel
          </Link>
          <Link to="/upload-video" className="btn-primary">
            ➕ Upload Video
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📹</div>
          <div className="stat-content">
            <h3>{stats.totalVideos}</h3>
            <p>Total Videos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalViews)}</h3>
            <p>Total Views</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.totalLikes)}</h3>
            <p>Total Likes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{formatNumber(stats.subscribers)}</h3>
            <p>Subscribers</p>
          </div>
        </div>
      </div>

      {/* Videos List */}
      {videos.length > 0 ? (
        <div className="videos-section">
          <div className="section-header">
            <h3>Your Videos</h3>
            <span className="count">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="videos-grid">
            {videos.map(video => (
              <div key={video.id} className="video-card">
                <div className="video-thumbnail">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} />
                  ) : (
                    <div className="video-placeholder">📹</div>
                  )}
                  <span className="video-duration">{formatDuration(video.duration)}</span>
                  {video.status && (
                    <span className={`status-badge ${video.status}`}>
                      {video.status === 'published' ? '● Public' : '○ Draft'}
                    </span>
                  )}
                </div>

                <div className="video-info">
                  <h4>{video.title}</h4>
                  <p className="description">
                    {video.description 
                      ? (video.description.length > 60 
                          ? video.description.substring(0, 60) + '...' 
                          : video.description)
                      : 'No description'}
                  </p>

                  <div className="video-stats">
                    <span>👁️ {formatNumber(video.views || video.view_count || 0)}</span>
                    <span>❤️ {formatNumber(video.likes || video.like_count || 0)}</span>
                    <span>💬 {video.comments || video.comment_count || 0}</span>
                  </div>

                  <div className="video-actions">
                    <Link to={`/video-details/${video.id}`} className="action-btn view">
                      👁️
                    </Link>
                    <Link to={`/video-editor?id=${video.id}`} className="action-btn edit">
                      ✏️
                    </Link>
                    <button onClick={() => handleDeleteVideo(video.id)} className="action-btn delete">
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
          <div className="empty-icon">📹</div>
          <h3>No Videos Yet</h3>
          <p>Start your video journey by uploading your first video!</p>
          <Link to="/upload-video" className="btn-primary">
            Upload Your First Video
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <Link to="/upload-video" className="quick-action-card">
            <div className="action-icon">📤</div>
            <h4>Upload Video</h4>
          </Link>
          <Link to="/go-live" className="quick-action-card">
            <div className="action-icon">🔴</div>
            <h4>Go Live</h4>
          </Link>
          <Link to="/video-editor" className="quick-action-card">
            <div className="action-icon">🎬</div>
            <h4>Video Editor</h4>
          </Link>
          <Link to="/create-clip" className="quick-action-card">
            <div className="action-icon">✂️</div>
            <h4>Create Clip</h4>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardVideos;