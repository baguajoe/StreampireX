// src/front/js/pages/VideoChannelDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Context } from '../store/appContext';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import '../../styles/VideoChannelDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const VideoChannelDashboard = () => {
  const { store } = useContext(Context);
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Channel stats state
  const [channelStats, setChannelStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
    totalVideos: 0,
    totalComments: 0,
    watchTime: 0,
    // Change metrics
    viewsChange: 0,
    subscribersChange: 0,
    likesChange: 0,
    commentsChange: 0
  });

  // Recent activity state
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (store.user?.id) {
      fetchAllData();
    }
  }, [store.user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchChannelData(),
        fetchChannelVideos(),
        fetchChannelAnalytics(),
        fetchRecentActivity()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data);
        setChannelStats(prev => ({
          ...prev,
          subscribers: data.subscriber_count || 0,
          totalVideos: data.total_videos || 0,
          subscribersChange: data.subscribers_change || 0
        }));
      } else if (response.status === 404) {
        setChannelData(null);
      } else {
        throw new Error('Failed to fetch channel data');
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
      setError('Failed to load channel data');
    }
  };

  const fetchChannelVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const videoList = data.videos || data || [];
        setVideos(videoList);

        // Calculate stats from videos
        const totalViews = videoList.reduce((sum, video) => sum + (video.views || video.view_count || 0), 0);
        const totalLikes = videoList.reduce((sum, video) => sum + (video.likes || video.like_count || 0), 0);
        const totalComments = videoList.reduce((sum, video) => sum + (video.comments_count || video.comment_count || 0), 0);

        setChannelStats(prev => ({
          ...prev,
          totalViews,
          totalLikes,
          totalComments,
          totalVideos: videoList.length
        }));
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchChannelAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        
        // Update stats with analytics data including changes
        setChannelStats(prev => ({
          ...prev,
          ...data.stats,
          viewsChange: data.stats?.views_change || data.views_change || 0,
          subscribersChange: data.stats?.subscribers_change || data.subscribers_change || 0,
          likesChange: data.stats?.likes_change || data.likes_change || 0,
          commentsChange: data.stats?.comments_change || data.comments_change || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/recent-activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const createChannel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_name: `${store.user.username}'s Channel`,
          description: 'Welcome to my video channel!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data.channel);
        alert('Channel created successfully!');
      } else {
        throw new Error('Failed to create channel');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel');
    }
  };

  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatChange = (change) => {
    if (!change && change !== 0) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change}%`;
  };

  const getChangeClass = (change) => {
    if (!change && change !== 0) return '';
    return change >= 0 ? 'positive' : 'negative';
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'video_upload': return '📤';
      case 'milestone': return '🎉';
      case 'comment': return '💬';
      case 'like': return '👍';
      case 'subscriber': return '👤';
      case 'view': return '👁️';
      case 'share': return '🔗';
      default: return '📹';
    }
  };

  // Generate dynamic chart labels based on data or last 6 months
  const getChartLabels = () => {
    if (analytics.labels && analytics.labels.length > 0) {
      return analytics.labels;
    }
    // Generate last 6 months dynamically
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date.toLocaleString('default', { month: 'short' }));
    }
    return months;
  };

  // Chart data - using real data from analytics
  const viewsChartData = {
    labels: getChartLabels(),
    datasets: [
      {
        label: 'Monthly Views',
        data: analytics.monthlyViews || [],
        borderColor: '#00ffc8',
        backgroundColor: 'rgba(0, 255, 200, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const subscribersChartData = {
    labels: getChartLabels(),
    datasets: [
      {
        label: 'Subscribers',
        data: analytics.monthlySubscribers || [],
        borderColor: '#00ffc8',
        backgroundColor: 'rgba(0, 255, 200, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Category chart - only show if we have real data
  const hasCategoeryData = analytics.viewsByCategory && Object.keys(analytics.viewsByCategory).length > 0;
  
  const categoryChartData = {
    labels: hasCategoeryData ? Object.keys(analytics.viewsByCategory) : [],
    datasets: [
      {
        data: hasCategoeryData ? Object.values(analytics.viewsByCategory) : [],
        backgroundColor: ['#00ffc8', '#FF6600', '#6c5ce7', '#0984e3', '#fd79a8', '#00b894', '#e17055'],
        hoverBackgroundColor: ['#00e6b3', '#ff8833', '#a29bfe', '#74b9ff', '#fab1a0', '#55efc4', '#fab1a0'],
        borderColor: '#0d1117',
        borderWidth: 3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#8b949e'
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#8b949e'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#8b949e'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: { color: '#8b949e' }
      } 
    }
  };

  // Check if we have chart data
  const hasViewsData = analytics.monthlyViews && analytics.monthlyViews.length > 0 && analytics.monthlyViews.some(v => v > 0);
  const hasSubscribersData = analytics.monthlySubscribers && analytics.monthlySubscribers.length > 0 && analytics.monthlySubscribers.some(v => v > 0);

  if (loading) {
    return (
      <div className="video-dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your video channel dashboard...</p>
        </div>
      </div>
    );
  }

  // If no channel exists
  if (!channelData) {
    return (
      <div className="video-dashboard-container">
        <div className="no-channel-state">
          <div className="no-channel-content">
            <h1>📹 Create Your Video Channel</h1>
            <p>You don't have a video channel yet. Create one to start uploading and managing your videos!</p>
            <button onClick={createChannel} className="create-channel-btn">
              🚀 Create Channel
            </button>
            <div className="channel-benefits">
              <h3>With a video channel, you can:</h3>
              <ul>
                <li>📤 Upload and manage videos</li>
                <li>📊 Track performance analytics</li>
                <li>👥 Build a subscriber base</li>
                <li>💰 Monetize your content</li>
                <li>🎨 Customize your brand</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-dashboard-container">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="channel-overview">
            <div className="channel-avatar">
              <img
                src={channelData.avatar_url || '/default-channel-avatar.png'}
                alt={channelData.channel_name}
                className="avatar-image"
              />
            </div>
            <div className="channel-info">
              <h1>{channelData.channel_name}</h1>
              <p className="channel-description">{channelData.description}</p>
              <div className="channel-stats-inline">
                <span>{formatCount(channelStats.subscribers)} subscribers</span>
                <span>•</span>
                <span>{channelStats.totalVideos} videos</span>
                <span>•</span>
                <span>{formatCount(channelStats.totalViews)} total views</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={fetchAllData}
              title="Refresh Data"
            >
              🔄
            </button>
            <Link to="/upload-video" className="action-btn primary">
              📤 Upload Video
            </Link>
            <Link to="/profile/video" className="action-btn secondary">
              ⚙️ Channel Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Overview - REAL DATA */}
      <section className="metrics-overview">
        <h2>📊 Channel Performance</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">👁️</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalViews)}</div>
              <div className="metric-label">Total Views</div>
              {channelStats.viewsChange !== 0 && (
                <div className={`metric-change ${getChangeClass(channelStats.viewsChange)}`}>
                  {formatChange(channelStats.viewsChange)} this month
                </div>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.subscribers)}</div>
              <div className="metric-label">Subscribers</div>
              {channelStats.subscribersChange !== 0 && (
                <div className={`metric-change ${getChangeClass(channelStats.subscribersChange)}`}>
                  {formatChange(channelStats.subscribersChange)} this month
                </div>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👍</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalLikes)}</div>
              <div className="metric-label">Total Likes</div>
              {channelStats.likesChange !== 0 && (
                <div className={`metric-change ${getChangeClass(channelStats.likesChange)}`}>
                  {formatChange(channelStats.likesChange)} this month
                </div>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">💬</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalComments)}</div>
              <div className="metric-label">Comments</div>
              {channelStats.commentsChange !== 0 && (
                <div className={`metric-change ${getChangeClass(channelStats.commentsChange)}`}>
                  {formatChange(channelStats.commentsChange)} this month
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/upload-video" className="action-btn upload">
            <span className="btn-icon">📤</span>
            <span>Upload Video</span>
          </Link>
          <Link to="/go-live" className="action-btn live">
            <span className="btn-icon">🎥</span>
            <span>Go Live</span>
          </Link>
          <Link to="/create-clip" className="action-btn clip">
            <span className="btn-icon">✂️</span>
            <span>Create Clip</span>
          </Link>
          <Link to="/my-channel" className="action-btn channel">
            <span className="btn-icon">📹</span>
            <span>View Channel</span>
          </Link>
        </div>
      </section>

      {/* Analytics Charts - REAL DATA */}
      <section className="analytics-section">
        <div className="charts-grid">
          <div className="chart-container">
            <h3>📈 Monthly Views</h3>
            {hasViewsData ? (
              <Line data={viewsChartData} options={chartOptions} />
            ) : (
              <div className="chart-empty">
                <p>📊 No view data yet</p>
                <small>Views will appear as your videos get watched</small>
              </div>
            )}
          </div>

          <div className="chart-container">
            <h3>👥 Subscriber Growth</h3>
            {hasSubscribersData ? (
              <Line data={subscribersChartData} options={chartOptions} />
            ) : (
              <div className="chart-empty">
                <p>👥 No subscriber data yet</p>
                <small>Growth data will appear as you gain subscribers</small>
              </div>
            )}
          </div>

          <div className="chart-container">
            <h3>📊 Views by Category</h3>
            {hasCategoeryData ? (
              <Doughnut data={categoryChartData} options={doughnutOptions} />
            ) : (
              <div className="chart-empty">
                <p>📁 No category data yet</p>
                <small>Upload videos with categories to see breakdown</small>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Videos */}
      <section className="recent-videos">
        <div className="section-header">
          <h2>🎬 Recent Videos</h2>
          <Link to="/my-channel" className="view-all-btn">View All</Link>
        </div>

        {videos.length > 0 ? (
          <div className="videos-grid">
            {videos.slice(0, 6).map((video) => (
              <div key={video.id} className="video-card">
                <div className="video-thumbnail">
                  <img
                    src={video.thumbnail_url || '/placeholder-thumbnail.jpg'}
                    alt={video.title}
                    onError={(e) => e.target.src = '/placeholder-thumbnail.jpg'}
                  />
                  <div className="duration-badge">
                    {formatDuration(video.duration)}
                  </div>
                  <div className="video-actions">
                    <Link to={`/video/${video.id}/edit`} className="action-icon" title="Edit">✏️</Link>
                    <Link to={`/video/${video.id}/analytics`} className="action-icon" title="Analytics">📊</Link>
                    <button className="action-icon" title="Share">🔗</button>
                  </div>
                </div>
                <div className="video-info">
                  <h4 className="video-title">{video.title}</h4>
                  <div className="video-stats">
                    <span>{formatCount(video.views || video.view_count || 0)} views</span>
                    <span>•</span>
                    <span>{formatCount(video.likes || video.like_count || 0)} likes</span>
                  </div>
                  <div className="video-date">
                    {new Date(video.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-content">
              <h3>No videos yet</h3>
              <p>Upload your first video to get started!</p>
              <Link to="/upload-video" className="upload-first-btn">
                📤 Upload First Video
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity - REAL DATA */}
      <section className="recent-activity">
        <div className="section-header">
          <h2>🕒 Recent Activity</h2>
          <button 
            className="refresh-btn" 
            onClick={fetchRecentActivity}
            disabled={activityLoading}
            title="Refresh Activity"
          >
            {activityLoading ? '⏳' : '🔄'}
          </button>
        </div>
        <div className="activity-list">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                <div className="activity-content">
                  <p><strong>{activity.title}</strong> {activity.action}</p>
                  <span className="activity-time">{activity.time}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activity">
              <p>📭 No recent activity yet</p>
              <small>Activity will appear as you upload videos and engage with viewers</small>
            </div>
          )}
        </div>
      </section>

      {/* Channel Growth Tips */}
      <section className="growth-tips">
        <h2>💡 Growth Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h4>Consistent Upload Schedule</h4>
            <p>Upload videos regularly to keep your audience engaged and grow your subscriber base.</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🔍</div>
            <h4>Optimize for Discovery</h4>
            <p>Use relevant titles, descriptions, and tags to help people find your content.</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">💬</div>
            <h4>Engage with Viewers</h4>
            <p>Respond to comments and build a community around your content.</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">📊</div>
            <h4>Analyze Performance</h4>
            <p>Use analytics to understand what content works best for your audience.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VideoChannelDashboard;