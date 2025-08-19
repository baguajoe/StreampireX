import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/MyVideoChannel.css';

const MyVideoChannel = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [clips, setClips] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Statistics state
  const [channelStats, setChannelStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    subscriberCount: 0,
    totalVideos: 0,
    totalClips: 0,
    avgWatchTime: 0,
    topVideoViews: 0
  });

  useEffect(() => {
    if (store.user?.id) {
      fetchChannelData();
      fetchChannelVideos();
      fetchChannelClips();
      fetchSubscribers();
      fetchAnalytics();
    }
  }, [store.user]);

  const fetchChannelData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/me`, {
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
          subscriberCount: data.subscriber_count || 0
        }));
      } else if (response.status === 404) {
        // No channel exists
        setChannelData(null);
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
    }
  };

  const fetchChannelVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data);
        
        // Calculate video stats
        const totalViews = data.reduce((sum, video) => sum + (video.views || 0), 0);
        const totalLikes = data.reduce((sum, video) => sum + (video.likes || 0), 0);
        const topVideoViews = Math.max(...data.map(v => v.views || 0), 0);
        
        setChannelStats(prev => ({
          ...prev,
          totalViews,
          totalLikes,
          totalVideos: data.length,
          topVideoViews
        }));
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchChannelClips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/clips/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClips(data);
        setChannelStats(prev => ({
          ...prev,
          totalClips: data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    }
  };

  const fetchSubscribers = async () => {
    try {
      if (!channelData?.id) return;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/${channelData.id}/subscribers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Mock analytics data - replace with actual API
      const mockAnalytics = {
        monthlyViews: [1500, 2300, 1800, 2500, 3200, 2800, 3500],
        monthlySubscribers: [12, 18, 25, 32, 28, 35, 42],
        topCountries: [
          { country: 'United States', percentage: 45 },
          { country: 'United Kingdom', percentage: 12 },
          { country: 'Canada', percentage: 8 },
          { country: 'Australia', percentage: 6 },
          { country: 'Germany', percentage: 5 }
        ],
        ageGroups: [
          { age: '18-24', percentage: 25 },
          { age: '25-34', percentage: 35 },
          { age: '35-44', percentage: 20 },
          { age: '45-54', percentage: 15 },
          { age: '55+', percentage: 5 }
        ],
        deviceTypes: [
          { device: 'Mobile', percentage: 60 },
          { device: 'Desktop', percentage: 30 },
          { device: 'Tablet', percentage: 10 }
        ]
      };
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_name: `${store.user?.username || 'My'} Channel`,
          description: 'Welcome to my video channel!'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChannelData(data.channel);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.BACKEND_URL}/api/video/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setVideos(videos.filter(v => v.id !== videoId));
        alert('Video deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
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

  const getSortedContent = () => {
    const content = activeTab === 'videos' ? videos : clips;
    
    const sorted = [...content].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'popular':
          return (b.views || 0) - (a.views || 0);
        case 'likes':
          return (b.likes || 0) - (a.likes || 0);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    
    return sorted;
  };

  if (loading) {
    return (
      <div className="my-channel-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your channel...</p>
        </div>
      </div>
    );
  }

  // No channel exists
  if (!channelData) {
    return (
      <div className="my-channel-container">
        <div className="no-channel-state">
          <div className="no-channel-content">
            <h1>📹 Create Your Video Channel</h1>
            <p>You don't have a video channel yet. Create one to start sharing your content!</p>
            <button onClick={createChannel} className="create-channel-btn">
              🚀 Create My Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-channel-container">
      {/* Channel Header */}
      <div className="channel-header">
        {/* Banner */}
        <div className="channel-banner">
          {channelData.banner_url ? (
            <img src={channelData.banner_url} alt="Channel Banner" className="banner-image" />
          ) : (
            <div className="default-banner">
              <span>📹</span>
            </div>
          )}
        </div>

        {/* Channel Info */}
        <div className="channel-info">
          <div className="channel-main-info">
            <div className="channel-avatar">
              <img 
                src={channelData.avatar_url || '/default-channel-avatar.png'} 
                alt={channelData.channel_name}
                className="avatar-image"
              />
            </div>
            <div className="channel-details">
              <h1 className="channel-name">{channelData.channel_name}</h1>
              <div className="channel-meta">
                <span>@{channelData.custom_url || store.user?.username}</span>
                <span>•</span>
                <span>{formatCount(channelStats.subscriberCount)} subscribers</span>
                <span>•</span>
                <span>{channelStats.totalVideos} videos</span>
              </div>
              <p className="channel-description">{channelData.description}</p>
            </div>
          </div>
          
          <div className="channel-actions">
            <Link to="/profile/video" className="action-btn secondary">
              ⚙️ Customize Channel
            </Link>
            <Link to="/upload-video" className="action-btn primary">
              📤 Upload Video
            </Link>
          </div>
        </div>
      </div>

      {/* Channel Stats */}
      <div className="channel-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-content">
              <div className="stat-value">{formatCount(channelStats.totalViews)}</div>
              <div className="stat-label">Total Views</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">👍</div>
            <div className="stat-content">
              <div className="stat-value">{formatCount(channelStats.totalLikes)}</div>
              <div className="stat-label">Total Likes</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📹</div>
            <div className="stat-content">
              <div className="stat-value">{channelStats.totalVideos}</div>
              <div className="stat-label">Videos</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✂️</div>
            <div className="stat-content">
              <div className="stat-value">{channelStats.totalClips}</div>
              <div className="stat-label">Clips</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Navigation */}
      <div className="content-navigation">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            📹 Videos ({channelStats.totalVideos})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'clips' ? 'active' : ''}`}
            onClick={() => setActiveTab('clips')}
          >
            ✂️ Clips ({channelStats.totalClips})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'subscribers' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscribers')}
          >
            👥 Subscribers ({formatCount(channelStats.subscriberCount)})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        {/* Content Controls */}
        {(activeTab === 'videos' || activeTab === 'clips') && (
          <div className="content-controls">
            <div className="sort-controls">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="popular">Most viewed</option>
                <option value="likes">Most liked</option>
              </select>
            </div>
            
            <div className="view-controls">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ≡
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="content-section">
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="videos-content">
            {videos.length > 0 ? (
              <div className={`content-grid ${viewMode}`}>
                {getSortedContent().map((video) => (
                  <div key={video.id} className="content-card video-card">
                    <div className="content-thumbnail">
                      <img 
                        src={video.thumbnail_url || '/placeholder-thumbnail.jpg'} 
                        alt={video.title}
                        className="thumbnail-image"
                      />
                      <div className="duration-badge">
                        {formatDuration(video.duration)}
                      </div>
                      <div className="content-actions">
                        <button 
                          className="action-btn edit"
                          title="Edit"
                          onClick={() => navigate(`/video/${video.id}/edit`)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn analytics"
                          title="Analytics"
                          onClick={() => navigate(`/video/${video.id}/analytics`)}
                        >
                          📊
                        </button>
                        <button 
                          className="action-btn delete"
                          title="Delete"
                          onClick={() => deleteVideo(video.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="content-info">
                      <h3 className="content-title">{video.title}</h3>
                      <div className="content-stats">
                        <span>{formatCount(video.views || 0)} views</span>
                        <span>•</span>
                        <span>{formatCount(video.likes || 0)} likes</span>
                      </div>
                      <div className="content-date">
                        {new Date(video.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">📹</span>
                  <h3>No videos yet</h3>
                  <p>Upload your first video to get started!</p>
                  <Link to="/upload-video" className="upload-btn">
                    📤 Upload Video
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          <div className="clips-content">
            {clips.length > 0 ? (
              <div className={`content-grid ${viewMode}`}>
                {getSortedContent().map((clip) => (
                  <div key={clip.id} className="content-card clip-card">
                    <div className="content-thumbnail">
                      <img 
                        src={clip.thumbnail_url || '/placeholder-thumbnail.jpg'} 
                        alt={clip.title}
                        className="thumbnail-image"
                      />
                      <div className="duration-badge clip">
                        {formatDuration(clip.duration)}
                      </div>
                      <div className="clip-badge">CLIP</div>
                    </div>
                    
                    <div className="content-info">
                      <h3 className="content-title">{clip.title}</h3>
                      <div className="content-stats">
                        <span>{formatCount(clip.views || 0)} views</span>
                        <span>•</span>
                        <span>{formatCount(clip.likes || 0)} likes</span>
                      </div>
                      <div className="content-date">
                        {new Date(clip.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">✂️</span>
                  <h3>No clips yet</h3>
                  <p>Create clips from your existing videos!</p>
                  <Link to="/create-clip" className="upload-btn">
                    ✂️ Create Clip
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="subscribers-content">
            {subscribers.length > 0 ? (
              <div className="subscribers-grid">
                {subscribers.map((subscriber) => (
                  <div key={subscriber.id} className="subscriber-card">
                    <img 
                      src={subscriber.avatar_url || '/default-avatar.png'} 
                      alt={subscriber.username}
                      className="subscriber-avatar"
                    />
                    <div className="subscriber-info">
                      <h4>{subscriber.display_name || subscriber.username}</h4>
                      <p>@{subscriber.username}</p>
                      <small>Subscribed {new Date(subscriber.subscribed_at).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">👥</span>
                  <h3>No subscribers yet</h3>
                  <p>Keep creating great content to grow your audience!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="analytics-content">
            <div className="analytics-grid">
              {/* Top Countries */}
              <div className="analytics-card">
                <h3>🌍 Top Countries</h3>
                <div className="country-stats">
                  {analytics.topCountries?.map((country, index) => (
                    <div key={index} className="country-item">
                      <span className="country-name">{country.country}</span>
                      <div className="country-bar">
                        <div 
                          className="country-fill" 
                          style={{ width: `${country.percentage}%` }}
                        ></div>
                      </div>
                      <span className="country-percentage">{country.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Age Groups */}
              <div className="analytics-card">
                <h3>👥 Age Groups</h3>
                <div className="age-stats">
                  {analytics.ageGroups?.map((group, index) => (
                    <div key={index} className="age-item">
                      <span className="age-range">{group.age}</span>
                      <div className="age-bar">
                        <div 
                          className="age-fill" 
                          style={{ width: `${group.percentage}%` }}
                        ></div>
                      </div>
                      <span className="age-percentage">{group.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Types */}
              <div className="analytics-card">
                <h3>📱 Device Types</h3>
                <div className="device-stats">
                  {analytics.deviceTypes?.map((device, index) => (
                    <div key={index} className="device-item">
                      <span className="device-name">{device.device}</span>
                      <div className="device-bar">
                        <div 
                          className="device-fill" 
                          style={{ width: `${device.percentage}%` }}
                        ></div>
                      </div>
                      <span className="device-percentage">{device.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="analytics-card">
                <h3>⚡ Quick Stats</h3>
                <div className="quick-stats">
                  <div className="quick-stat">
                    <span className="stat-label">Average Views per Video</span>
                    <span className="stat-value">{formatCount(Math.round(channelStats.totalViews / Math.max(channelStats.totalVideos, 1)))}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-label">Top Video Views</span>
                    <span className="stat-value">{formatCount(channelStats.topVideoViews)}</span>
                  </div>
                  <div className="quick-stat">
                    <span className="stat-label">Subscriber Growth Rate</span>
                    <span className="stat-value">+12%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVideoChannel;