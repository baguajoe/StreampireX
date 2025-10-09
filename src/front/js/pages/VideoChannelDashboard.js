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

  // Channel stats state
  const [channelStats, setChannelStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    subscribers: 0,
    totalVideos: 0,
    totalComments: 0,
    watchTime: 0
  });

  // Recent activity state
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (store.user?.id) {
      fetchChannelData();
      fetchChannelVideos();
      fetchChannelAnalytics();
      fetchRecentActivity();
    }
  }, [store.user]);

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
          totalVideos: data.total_videos || 0
        }));
      } else if (response.status === 404) {
        // No channel exists yet
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
        setVideos(data);

        // Calculate stats from videos
        const totalViews = data.reduce((sum, video) => sum + (video.views || 0), 0);
        const totalLikes = data.reduce((sum, video) => sum + (video.likes || 0), 0);
        const totalComments = data.reduce((sum, video) => sum + (video.comments_count || 0), 0);

        setChannelStats(prev => ({
          ...prev,
          totalViews,
          totalLikes,
          totalComments,
          totalVideos: data.length
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
        setChannelStats(prevStats => ({
          ...prevStats,
          ...data.stats
        }));
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchRecentActivity = async () => {
    // Mock recent activity - replace with actual API call
    const mockActivity = [
      {
        type: 'video_upload',
        title: 'New Gaming Tutorial',
        action: 'uploaded',
        time: '2 hours ago',
        icon: '📹'
      },
      {
        type: 'milestone',
        title: '1000 subscribers',
        action: 'reached',
        time: '1 day ago',
        icon: '🎉'
      },
      {
        type: 'comment',
        title: 'New comment on "How to Build PC"',
        action: 'received',
        time: '3 hours ago',
        icon: '💬'
      },
      {
        type: 'like',
        title: '50 new likes',
        action: 'received',
        time: '5 hours ago',
        icon: '👍'
      }
    ];
    setRecentActivity(mockActivity);
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

  // Chart data
  const viewsChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Monthly Views',
        data: analytics.monthlyViews || [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const subscribersChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Subscribers',
        data: analytics.monthlySubscribers || [],
        borderColor: '#48bb78',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const categoryChartData = {
    labels: Object.keys(analytics.viewsByCategory || {}),
    datasets: [
      {
        data: Object.values(analytics.viewsByCategory || {}),
        backgroundColor: ['#667eea', '#48bb78', '#ed8936', '#9f7aea'],
        hoverBackgroundColor: ['#5a67d8', '#38a169', '#dd6b20', '#805ad5']
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

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
            <Link to="/upload-video" className="action-btn primary">
              📤 Upload Video
            </Link>
            <Link to="/profile/video" className="action-btn secondary">
              ⚙️ Channel Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <section className="metrics-overview">
        <h2>📊 Channel Performance</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">👁️</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalViews)}</div>
              <div className="metric-label">Total Views</div>
              <div className="metric-change">+12% this month</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.subscribers)}</div>
              <div className="metric-label">Subscribers</div>
              <div className="metric-change">+15 this week</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">👍</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalLikes)}</div>
              <div className="metric-label">Total Likes</div>
              <div className="metric-change">+8% this month</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">💬</div>
            <div className="metric-content">
              <div className="metric-value">{formatCount(channelStats.totalComments)}</div>
              <div className="metric-label">Comments</div>
              <div className="metric-change">+22% this month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/upload-video" className="action-btn upload">
            <span className="btn-icon">📤</span>
            <span>Upload Video</span>
          </Link>
          <Link to="/create-clip" className="action-btn clip">
            <span className="btn-icon">✂️</span>
            <span>Create Clip</span>
          </Link>
          <Link to="/video-analytics" className="action-btn analytics">
            <span className="btn-icon">📊</span>
            <span>View Analytics</span>
          </Link>
          <Link to="/my-channel" className="action-btn channel">
            <span className="btn-icon">📹</span>
            <span>View Channel</span>
          </Link>
        </div>
      </section>

      {/* Analytics Charts */}
      <section className="analytics-section">
        <div className="charts-grid">
          <div className="chart-container">
            <h3>📈 Monthly Views</h3>
            <Line data={viewsChartData} options={chartOptions} />
          </div>

          <div className="chart-container">
            <h3>👥 Subscriber Growth</h3>
            <Line data={subscribersChartData} options={chartOptions} />
          </div>

          <div className="chart-container">
            <h3>📊 Views by Category</h3>
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
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
                  />
                  <div className="duration-badge">
                    {formatDuration(video.duration)}
                  </div>
                  <div className="video-actions">
                    <button className="action-icon" title="Edit">✏️</button>
                    <button className="action-icon" title="Analytics">📊</button>
                    <button className="action-icon" title="Share">🔗</button>
                  </div>
                </div>
                <div className="video-info">
                  <h4 className="video-title">{video.title}</h4>
                  <div className="video-stats">
                    <span>{formatCount(video.views || 0)} views</span>
                    <span>•</span>
                    <span>{formatCount(video.likes || 0)} likes</span>
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

      {/* Recent Activity */}
      <section className="recent-activity">
        <h2>🕒 Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="activity-icon">{activity.icon}</span>
              <div className="activity-content">
                <p><strong>{activity.title}</strong> was {activity.action}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
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