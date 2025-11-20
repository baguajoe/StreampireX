import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/MyVideoChannel.css';

const MyVideoChannel = () => {
  const { store } = useContext(Context);
  const { channelId } = useParams();
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [clips, setClips] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');

  // Check if this is the user's own channel
  const isOwnChannel = !channelId || (channelData && channelData.user_id === store.user?.id);

  useEffect(() => {
    fetchChannelData();
  }, [channelId, store.user]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch channel data
      let channelResponse;
      if (channelId) {
        // Viewing another user's channel
        channelResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${channelId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        // Viewing own channel
        channelResponse = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/me`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      if (channelResponse.ok) {
        const channelInfo = await channelResponse.json();
        setChannelData(channelInfo);
        
        // Fetch videos
        await fetchChannelVideos(channelInfo.user_id);
        
        // Fetch clips
        await fetchChannelClips();
        
        // If own channel, fetch subscribers and analytics
        if (isOwnChannel) {
          await fetchSubscribers(channelInfo.id);
          await fetchAnalytics();
        }
      } else if (channelResponse.status === 404) {
        // No channel exists yet
        setChannelData(null);
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelVideos = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/user?user_id=${userId || store.user?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchChannelClips = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/clips/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClips(data || []);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    }
  };

  const fetchSubscribers = async (channelId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${channelId}/subscribers`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

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
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/analytics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createChannel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel_name: `${store.user?.username}'s Channel`,
            description: 'Welcome to my video channel!'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChannelData(data.channel);
        alert('Channel created successfully!');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel');
    }
  };

  const handleSubscribe = async () => {
    // Implement subscription logic
    alert('Subscribe feature coming soon!');
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getSortedContent = (content) => {
    const sorted = [...content];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.uploaded_at || b.created_at) - new Date(a.uploaded_at || a.created_at));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.uploaded_at || a.created_at) - new Date(b.uploaded_at || b.created_at));
      case 'popular':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      default:
        return sorted;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="my-channel-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading channel...</p>
        </div>
      </div>
    );
  }

  // No channel state (only for own channel)
  if (!channelData && isOwnChannel) {
    return (
      <div className="my-channel-container">
        <div className="no-channel-state">
          <div className="no-channel-content">
            <h1>📹 Create Your Video Channel</h1>
            <p>You don't have a channel yet. Create one to start uploading videos!</p>
            <button onClick={createChannel} className="create-channel-btn">
              🚀 Create Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Channel not found
  if (!channelData) {
    return (
      <div className="my-channel-container">
        <div className="no-channel-state">
          <div className="no-channel-content">
            <h1>Channel Not Found</h1>
            <p>The channel you're looking for doesn't exist.</p>
            <Link to="/browse-channels" className="create-channel-btn">
              Browse Channels
            </Link>
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
            <img src={channelData.banner_url} alt="Channel banner" className="banner-image" />
          ) : (
            <div className="default-banner">🎬</div>
          )}
        </div>

        {/* Channel Info */}
        <div className="channel-info">
          <div className="channel-main-info">
            <div className="channel-avatar">
              {channelData.avatar_url ? (
                <img src={channelData.avatar_url} alt={channelData.channel_name} className="avatar-image" />
              ) : (
                <div className="default-banner">📹</div>
              )}
            </div>
            
            <div className="channel-details">
              <h1 className="channel-name">{channelData.channel_name}</h1>
              <div className="channel-meta">
                <span>{formatCount(channelData.subscriber_count || 0)} subscribers</span>
                <span>•</span>
                <span>{videos.length} videos</span>
                <span>•</span>
                <span>{formatCount(channelData.total_views || 0)} views</span>
              </div>
              {channelData.description && (
                <p className="channel-description">{channelData.description}</p>
              )}
            </div>
          </div>

          <div className="channel-actions">
            {isOwnChannel ? (
              <>
                <Link to="/upload-video" className="action-btn primary">
                  📤 Upload Video
                </Link>
                <Link to="/profile/video" className="action-btn secondary">
                  ⚙️ Manage Channel
                </Link>
              </>
            ) : (
              <button onClick={handleSubscribe} className="action-btn primary">
                🔔 Subscribe
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Channel Stats (only for own channel) */}
      {isOwnChannel && (
        <div className="channel-stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👁️</div>
              <div className="stat-content">
                <div className="stat-value">{formatCount(channelData.total_views || 0)}</div>
                <div className="stat-label">Total Views</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{formatCount(channelData.subscriber_count || 0)}</div>
                <div className="stat-label">Subscribers</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎬</div>
              <div className="stat-content">
                <div className="stat-value">{videos.length}</div>
                <div className="stat-label">Videos</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">✂️</div>
              <div className="stat-content">
                <div className="stat-value">{clips.length}</div>
                <div className="stat-label">Clips</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Navigation */}
      <div className="content-navigation">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            🎬 Videos
          </button>
          <button 
            className={`nav-tab ${activeTab === 'clips' ? 'active' : ''}`}
            onClick={() => setActiveTab('clips')}
          >
            ✂️ Clips
          </button>
          {isOwnChannel && (
            <>
              <button 
                className={`nav-tab ${activeTab === 'subscribers' ? 'active' : ''}`}
                onClick={() => setActiveTab('subscribers')}
              >
                👥 Subscribers
              </button>
              <button 
                className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📊 Analytics
              </button>
            </>
          )}
        </div>

        <div className="content-controls">
          <select 
            className="sort-select" 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="popular">Most Popular</option>
          </select>
          
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⚏
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="content-section">
        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="content-grid-wrapper">
            {videos.length > 0 ? (
              <div className={`content-grid ${viewMode}`}>
                {getSortedContent(videos).map((video) => (
                  <Link 
                    to={`/video-details/${video.id}`} 
                    key={video.id} 
                    className="content-card"
                  >
                    <div className="content-thumbnail">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="thumbnail-image" />
                      ) : (
                        <div className="default-banner">🎬</div>
                      )}
                      <span className="duration-badge">{formatDuration(video.duration)}</span>
                      {isOwnChannel && (
                        <div className="content-actions">
                          <Link to={`/video-edit/${video.id}`} className="action-btn edit" onClick={(e) => e.preventDefault()}>
                            ✏️
                          </Link>
                          <button className="action-btn analytics" onClick={(e) => e.preventDefault()}>
                            📊
                          </button>
                          <button className="action-btn delete" onClick={(e) => e.preventDefault()}>
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="content-info">
                      <h3 className="content-title">{video.title}</h3>
                      <div className="content-stats">
                        <span>{formatCount(video.views || 0)} views</span>
                        <span>•</span>
                        <span>{formatDate(video.uploaded_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">🎬</span>
                  <h3>No videos yet</h3>
                  <p>
                    {isOwnChannel 
                      ? "Start uploading videos to build your channel!" 
                      : "This channel hasn't uploaded any videos yet."}
                  </p>
                  {isOwnChannel && (
                    <Link to="/upload-video" className="upload-btn">
                      📤 Upload First Video
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          <div className="content-grid-wrapper">
            {clips.length > 0 ? (
              <div className={`content-grid ${viewMode}`}>
                {getSortedContent(clips).map((clip) => (
                  <Link 
                    to={`/clip/${clip.id}`} 
                    key={clip.id} 
                    className="content-card"
                  >
                    <div className="content-thumbnail">
                      {clip.thumbnail_url ? (
                        <img src={clip.thumbnail_url} alt={clip.title} className="thumbnail-image" />
                      ) : (
                        <div className="default-banner">✂️</div>
                      )}
                      <span className="clip-badge">CLIP</span>
                      <span className="duration-badge clip">
                        {formatDuration(clip.end_time - clip.start_time)}
                      </span>
                    </div>
                    <div className="content-info">
                      <h3 className="content-title">{clip.title}</h3>
                      <div className="content-stats">
                        <span>{formatCount(clip.views || 0)} views</span>
                        <span>•</span>
                        <span>{formatDate(clip.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">✂️</span>
                  <h3>No clips yet</h3>
                  <p>
                    {isOwnChannel 
                      ? "Create clips from your videos to share highlights!" 
                      : "This channel hasn't created any clips yet."}
                  </p>
                  {isOwnChannel && videos.length > 0 && (
                    <Link to="/create-clip" className="upload-btn">
                      ✂️ Create First Clip
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab (own channel only) */}
        {activeTab === 'subscribers' && isOwnChannel && (
          <div className="subscribers-section">
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
                      <small>Subscribed {formatDate(subscriber.subscribed_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">👥</span>
                  <h3>No subscribers yet</h3>
                  <p>Share your channel to grow your audience!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab (own channel only) */}
        {activeTab === 'analytics' && isOwnChannel && (
          <div className="analytics-section">
            {analytics ? (
              <div className="analytics-grid">
                {/* Views by Country */}
                <div className="analytics-card">
                  <h3>🌍 Top Countries</h3>
                  <div className="country-stats">
                    {Object.entries(analytics.viewsByCountry || {}).slice(0, 5).map(([country, views]) => (
                      <div key={country} className="country-item">
                        <span className="country-name">{country}</span>
                        <div className="country-bar">
                          <div 
                            className="country-fill" 
                            style={{ width: `${(views / Math.max(...Object.values(analytics.viewsByCountry))) * 100}%` }}
                          />
                        </div>
                        <span className="country-percentage">{formatCount(views)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Age Demographics */}
                <div className="analytics-card">
                  <h3>👥 Age Groups</h3>
                  <div className="age-stats">
                    {Object.entries(analytics.ageGroups || {}).map(([age, count]) => (
                      <div key={age} className="age-item">
                        <span className="age-range">{age}</span>
                        <div className="age-bar">
                          <div 
                            className="age-fill" 
                            style={{ width: `${(count / Math.max(...Object.values(analytics.ageGroups))) * 100}%` }}
                          />
                        </div>
                        <span className="age-percentage">{count}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Stats */}
                <div className="analytics-card">
                  <h3>📱 Device Types</h3>
                  <div className="device-stats">
                    {Object.entries(analytics.deviceTypes || {
                      'Mobile': 45,
                      'Desktop': 35,
                      'Tablet': 15,
                      'TV': 5
                    }).map(([device, percentage]) => (
                      <div key={device} className="device-item">
                        <span className="device-name">{device}</span>
                        <div className="device-bar">
                          <div className="device-fill" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="device-percentage">{percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="analytics-card">
                  <h3>📊 Performance</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="stat-label">Avg. View Duration</span>
                      <span className="stat-value">
                        {analytics.avgViewDuration ? formatDuration(analytics.avgViewDuration) : '0:00'}
                      </span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Click-through Rate</span>
                      <span className="stat-value">{analytics.ctr || 0}%</span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Engagement Rate</span>
                      <span className="stat-value">{analytics.engagementRate || 0}%</span>
                    </div>
                    <div className="quick-stat">
                      <span className="stat-label">Revenue (Est.)</span>
                      <span className="stat-value">${analytics.estimatedRevenue || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-content">
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
                  <h3>Analytics Coming Soon</h3>
                  <p>Upload more videos to start seeing analytics!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVideoChannel;