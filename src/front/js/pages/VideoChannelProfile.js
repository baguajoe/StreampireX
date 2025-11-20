import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import { showToast } from '../utils/toast';
import '../../styles/VideoChannelProfile.css';

const VideoChannelProfile = () => {
  const { store } = useContext(Context);
  const { channelId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [clips, setClips] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [sortBy, setSortBy] = useState('newest');

  // Check if this is the user's own channel
  const isOwnChannel = !channelId || (channelData && channelData.user_id === store.user?.id);

  useEffect(() => {
    loadChannelProfile();
  }, [channelId]);

  const loadChannelProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get channel ID to fetch
      const targetChannelId = channelId || 'me';
      
      // Fetch channel data
      const channelRes = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${targetChannelId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (channelRes.ok) {
        const channel = await channelRes.json();
        setChannelData(channel);
        
        // Fetch videos
        const videosRes = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/video/user?user_id=${channel.user_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (videosRes.ok) {
          const videosData = await videosRes.json();
          setVideos(videosData.videos || []);
        }
        
        // Check subscription status if not own channel
        if (!isOwnChannel) {
          checkSubscriptionStatus(channel.id);
        }
      } else if (channelRes.status === 404) {
        // No channel exists
        if (isOwnChannel) {
          // Redirect to create channel
          navigate('/video-dashboard');
        } else {
          showToast.error("Channel not found");
          navigate('/browse-channels');
        }
      }
    } catch (error) {
      console.error('Error loading channel:', error);
      showToast.error("Failed to load channel");
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async (channelId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${channelId}/subscription-status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isSubscribed);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!store.user) {
      showToast.error("Please login to subscribe");
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${channelData.id}/subscribe`,
        {
          method: isSubscribed ? 'DELETE' : 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        setIsSubscribed(!isSubscribed);
        showToast.success(isSubscribed ? "Unsubscribed" : "Subscribed!");
        
        // Update subscriber count
        setChannelData(prev => ({
          ...prev,
          subscriber_count: isSubscribed 
            ? (prev.subscriber_count || 0) - 1 
            : (prev.subscriber_count || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      showToast.error("Failed to update subscription");
    }
  };

  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
    return `${Math.floor(diff / 365)} years ago`;
  };

  const getSortedVideos = () => {
    const sorted = [...videos];
    switch (sortBy) {
      case 'popular':
        return sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
      case 'newest':
      default:
        return sorted.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    }
  };

  if (loading) {
    return (
      <div className="channel-profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading channel...</p>
        </div>
      </div>
    );
  }

  if (!channelData) {
    return (
      <div className="channel-profile-container">
        <div className="no-channel-state">
          <h2>Channel Not Found</h2>
          <p>This channel doesn't exist or has been removed.</p>
          <Link to="/browse-channels" className="browse-btn">
            Browse Channels
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="channel-profile-container">
      {/* Channel Header/Banner */}
      <div className="channel-header">
        <div className="channel-banner">
          {channelData.banner_url ? (
            <img src={channelData.banner_url} alt="Channel banner" className="banner-image" />
          ) : (
            <div className="default-banner-gradient" />
          )}
        </div>
        
        <div className="channel-info-section">
          <div className="channel-profile-details">
            <div className="channel-avatar">
              {channelData.avatar_url ? (
                <img src={channelData.avatar_url} alt={channelData.channel_name} />
              ) : (
                <div className="default-avatar">📹</div>
              )}
            </div>
            
            <div className="channel-text-info">
              <h1 className="channel-name">{channelData.channel_name}</h1>
              <div className="channel-stats">
                <span className="stat-item">
                  <strong>{formatCount(channelData.subscriber_count || 0)}</strong> subscribers
                </span>
                <span className="stat-separator">•</span>
                <span className="stat-item">
                  <strong>{videos.length}</strong> videos
                </span>
                <span className="stat-separator">•</span>
                <span className="stat-item">
                  <strong>{formatCount(channelData.total_views || 0)}</strong> views
                </span>
              </div>
              {channelData.description && (
                <p className="channel-description">{channelData.description}</p>
              )}
            </div>
          </div>
          
          <div className="channel-actions">
            {isOwnChannel ? (
              <>
                <Link to="/upload-video" className="action-btn upload">
                  📤 Upload Video
                </Link>
                <Link to="/video-channel-settings" className="action-btn settings">
                  ⚙️ Customize Channel
                </Link>
                <Link to="/video-dashboard" className="action-btn dashboard">
                  📊 Dashboard
                </Link>
              </>
            ) : (
              <button 
                onClick={handleSubscribe} 
                className={`action-btn subscribe ${isSubscribed ? 'subscribed' : ''}`}
              >
                {isSubscribed ? '🔔 Subscribed' : '🔔 Subscribe'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="channel-nav">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            HOME
          </button>
          <button 
            className={`nav-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            VIDEOS
          </button>
          <button 
            className={`nav-tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            PLAYLISTS
          </button>
          <button 
            className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            COMMUNITY
          </button>
          <button 
            className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            ABOUT
          </button>
        </div>
        
        {activeTab === 'videos' && (
          <div className="sort-controls">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="channel-content">
        {/* Home Tab - Featured Video + Recent */}
        {activeTab === 'home' && (
          <div className="home-content">
            {videos.length > 0 ? (
              <>
                {/* Featured Video */}
                <div className="featured-section">
                  <h2>Featured Video</h2>
                  <div className="featured-video">
                    <Link to={`/video-details/${videos[0].id}`} className="video-link">
                      <div className="video-thumbnail-large">
                        <img src={videos[0].thumbnail_url || '/default-thumbnail.jpg'} alt={videos[0].title} />
                        <div className="play-overlay">
                          <div className="play-button">▶</div>
                        </div>
                      </div>
                      <div className="video-info-large">
                        <h3>{videos[0].title}</h3>
                        <div className="video-meta">
                          <span>{formatCount(videos[0].views || 0)} views</span>
                          <span>•</span>
                          <span>{formatDate(videos[0].uploaded_at)}</span>
                        </div>
                        <p className="video-description">{videos[0].description}</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Recent Uploads */}
                <div className="recent-section">
                  <h2>Recent Uploads</h2>
                  <div className="videos-grid">
                    {videos.slice(1, 7).map(video => (
                      <Link key={video.id} to={`/video-details/${video.id}`} className="video-card">
                        <div className="video-thumbnail">
                          <img src={video.thumbnail_url || '/default-thumbnail.jpg'} alt={video.title} />
                          <span className="duration">{video.duration || '0:00'}</span>
                        </div>
                        <div className="video-info">
                          <h4>{video.title}</h4>
                          <div className="video-stats">
                            <span>{formatCount(video.views || 0)} views</span>
                            <span>•</span>
                            <span>{formatDate(video.uploaded_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <h3>No videos yet</h3>
                <p>{isOwnChannel ? "Upload your first video to get started!" : "This channel hasn't uploaded any videos yet."}</p>
                {isOwnChannel && (
                  <Link to="/upload-video" className="upload-btn">
                    📤 Upload Video
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Videos Tab - All Videos Grid */}
        {activeTab === 'videos' && (
          <div className="videos-content">
            {videos.length > 0 ? (
              <div className="videos-grid">
                {getSortedVideos().map(video => (
                  <Link key={video.id} to={`/video-details/${video.id}`} className="video-card">
                    <div className="video-thumbnail">
                      <img src={video.thumbnail_url || '/default-thumbnail.jpg'} alt={video.title} />
                      <span className="duration">{video.duration || '0:00'}</span>
                      {isOwnChannel && (
                        <div className="video-actions">
                          <button onClick={(e) => {
                            e.preventDefault();
                            navigate(`/video-edit/${video.id}`);
                          }}>✏️</button>
                          <button onClick={(e) => {
                            e.preventDefault();
                            // Handle delete
                          }}>🗑️</button>
                        </div>
                      )}
                    </div>
                    <div className="video-info">
                      <h4>{video.title}</h4>
                      <div className="video-stats">
                        <span>{formatCount(video.views || 0)} views</span>
                        <span>•</span>
                        <span>{formatDate(video.uploaded_at)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <h3>No videos uploaded</h3>
                <p>Check back later for new content!</p>
              </div>
            )}
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <div className="playlists-content">
            {playlists.length > 0 ? (
              <div className="playlists-grid">
                {playlists.map(playlist => (
                  <div key={playlist.id} className="playlist-card">
                    <div className="playlist-thumbnail">
                      <img src={playlist.thumbnail || '/default-playlist.jpg'} alt={playlist.name} />
                      <div className="playlist-count">{playlist.video_count} videos</div>
                    </div>
                    <h4>{playlist.name}</h4>
                    <p>{playlist.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No playlists yet</h3>
                <p>{isOwnChannel ? "Create playlists to organize your videos" : "This channel hasn't created any playlists"}</p>
              </div>
            )}
          </div>
        )}

        {/* Community Tab */}
        {activeTab === 'community' && (
          <div className="community-content">
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>Community posts coming soon</h3>
              <p>Channel owners will be able to share updates with their subscribers here</p>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="about-content">
            <div className="about-section">
              <h3>Description</h3>
              <p>{channelData.description || "No description provided"}</p>
            </div>
            
            <div className="about-section">
              <h3>Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Joined</span>
                  <span className="detail-value">
                    {new Date(channelData.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total views</span>
                  <span className="detail-value">{formatCount(channelData.total_views || 0)}</span>
                </div>
                {channelData.location && (
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{channelData.location}</span>
                  </div>
                )}
              </div>
            </div>

            {channelData.social_links && (
              <div className="about-section">
                <h3>Links</h3>
                <div className="social-links">
                  {channelData.social_links.instagram && (
                    <a href={channelData.social_links.instagram} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  )}
                  {channelData.social_links.twitter && (
                    <a href={channelData.social_links.twitter} target="_blank" rel="noopener noreferrer">
                      Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoChannelProfile;