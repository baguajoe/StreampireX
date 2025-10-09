import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/VideoDetail.css';

const VideoDetail = () => {
  const { store } = useContext(Context);
  const { id } = useParams();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (id) {
      fetchVideoDetail();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/videos/${id}/view`, {
        method: 'POST'
      }).catch(err => console.log('View tracking failed:', err));
    }
  }, [id]);

  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/${id}`, {
        headers: headers
      });

      if (response.ok) {
        const data = await response.json();
        setVideo(data);
        setComments(data.comments || []);
        setIsLiked(data.user_has_liked || false);
        setIsSubscribed(data.user_has_subscribed || false);
      } else {
        setError('Video not found');
      }
    } catch (err) {
      console.error('Error fetching video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!store.user) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideo(prev => ({ ...prev, likes: data.likes }));
        setIsLiked(!isLiked);
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!store.user) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/channel/${video.channel.id}/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsSubscribed(!isSubscribed);
        setVideo(prev => ({
          ...prev,
          channel: {
            ...prev.channel,
            subscriber_count: prev.channel.subscriber_count + (isSubscribed ? -1 : 1)
          }
        }));
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!store.user) {
      navigate('/login');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/video/${id}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newComment })
      });

      if (response.ok) {
        const comment = {
          id: Date.now(), // Temporary ID
          text: newComment,
          created_at: new Date().toISOString(),
          user: {
            id: store.user.id,
            username: store.user.username,
            display_name: store.user.display_name,
            avatar_url: store.user.profile_picture || store.user.avatar_url
          }
        };

        setComments([comment, ...comments]);
        setNewComment('');
        setVideo(prev => ({ ...prev, comments_count: prev.comments_count + 1 }));
      }
    } catch (error) {
      console.error('Error posting comment:', error);
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="video-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-detail-container">
        <div className="error-state">
          <h2>Video Not Found</h2>
          <p>{error || 'The video you\'re looking for doesn\'t exist or has been removed.'}</p>
          <Link to="/videos" className="back-btn">← Back to Videos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="video-detail-container">
      <div className="video-detail-content">
        {/* Video Player */}
        <div className="video-player-section">
          <div className="video-player">
            <video
              controls
              poster={video.thumbnail_url}
              className="video-element"
            >
              <source src={video.file_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Video Info */}
          <div className="video-info">
            <h1 className="video-title">{video.title}</h1>

            <div className="video-meta">
              <div className="video-stats">
                <span>{formatCount(video.views)} views</span>
                <span>•</span>
                <span>{formatDate(video.created_at)}</span>
              </div>

              <div className="video-actions">
                <button
                  className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                >
                  👍 {formatCount(video.likes)}
                </button>
                <button className="action-btn">
                  👎
                </button>
                <button className="action-btn">
                  📤 Share
                </button>
                <button className="action-btn">
                  💾 Save
                </button>
              </div>
            </div>
          </div>

          {/* Channel Info */}
          <div className="channel-info">
            <Link to={`/channel/${video.channel.id}`} className="channel-link">
              <img
                src={video.creator.avatar_url || '/default-avatar.png'}
                alt={video.channel.name}
                className="channel-avatar"
              />
              <div className="channel-details">
                <h3 className="channel-name">
                  {video.channel.name}
                  {video.channel.is_verified && <span className="verified-badge">✓</span>}
                </h3>
                <p className="subscriber-count">{formatCount(video.channel.subscriber_count)} subscribers</p>
              </div>
            </Link>

            {store.user?.id !== video.creator.id && (
              <button
                className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
                onClick={handleSubscribe}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            )}
          </div>

          {/* Description */}
          {video.description && (
            <div className="video-description">
              <div className={`description-content ${showFullDescription ? 'expanded' : ''}`}>
                <p>{video.description}</p>
              </div>
              {video.description.length > 200 && (
                <button
                  className="show-more-btn"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                >
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <h3 className="comments-title">{formatCount(video.comments_count)} Comments</h3>

          {/* Comment Form */}
          {store.user ? (
            <form className="comment-form" onSubmit={handleComment}>
              <img
                src={store.user.profile_picture || store.user.avatar_url || '/default-avatar.png'}
                alt={store.user.username}
                className="comment-avatar"
              />
              <div className="comment-input-container">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="comment-input"
                  rows="2"
                />
                {newComment.trim() && (
                  <div className="comment-actions">
                    <button type="button" onClick={() => setNewComment('')} className="cancel-btn">
                      Cancel
                    </button>
                    <button type="submit" className="post-btn">
                      Comment
                    </button>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div className="login-prompt">
              <p>Please <Link to="/login">log in</Link> to comment</p>
            </div>
          )}

          {/* Comments List */}
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment">
                <img
                  src={comment.user.avatar_url || '/default-avatar.png'}
                  alt={comment.user.username}
                  className="comment-avatar"
                />
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">
                      {comment.user.display_name || comment.user.username}
                    </span>
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <div className="no-comments">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;