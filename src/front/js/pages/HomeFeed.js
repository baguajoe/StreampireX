import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import WebRTCChat from "../component/WebRTCChat";
import "../../styles/HomeFeed.css";

const HomeFeed = () => {
  const [posts, setPosts] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [newCommentText, setNewCommentText] = useState({});
  const [postComments, setPostComments] = useState({});
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trendingContent, setTrendingContent] = useState([]);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [pagination, setPagination] = useState(null);
  
  // Track follow loading states per user
  const [followingUsers, setFollowingUsers] = useState({});
  const [followSuccessMessage, setFollowSuccessMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const backendUrl = process.env.REACT_APP_BACKEND_URL;

        console.log("Backend URL:", backendUrl);

        if (!backendUrl) {
          throw new Error("BACKEND_URL is not defined in environment variables");
        }

        // Fetch posts/feed
        try {
          const postsRes = await fetch(`${backendUrl}/api/home-feed?type=${activeFilter}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (postsRes.ok) {
            const postsData = await postsRes.json();
            // Handle both old format (array) and new format (object with feed)
            const feedItems = postsData.feed || postsData;
            setPosts(Array.isArray(feedItems) ? feedItems : []);
            if (postsData.pagination) {
              setPagination(postsData.pagination);
            }
          } else {
            console.error('Failed to fetch posts:', postsRes.status, postsRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching posts:', error);
        }

        // Fetch suggested users
        try {
          const usersRes = await fetch(`${backendUrl}/api/suggested-users`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setSuggestedUsers(usersData.suggestions || usersData || []);
          } else {
            console.error('Failed to fetch suggested users:', usersRes.status, usersRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching suggested users:', error);
        }

        // Fetch trending content (discover feed)
        try {
          const trendingRes = await fetch(`${backendUrl}/api/discover-feed?type=all&per_page=5`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (trendingRes.ok) {
            const trendingData = await trendingRes.json();
            setTrendingContent(trendingData.feed || trendingData || []);
          } else {
            console.error('Failed to fetch trending content:', trendingRes.status, trendingRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching trending content:', error);
        }

        // Fetch user profile
        try {
          const profileRes = await fetch(`${backendUrl}/api/user/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUser(profileData);
          } else {
            console.error('Failed to fetch user profile:', profileRes.status, profileRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }

      } catch (error) {
        console.error('General fetch error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeFilter]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (followSuccessMessage) {
      const timer = setTimeout(() => setFollowSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [followSuccessMessage]);

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      alert("Please enter some content for your post");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (backendUrl && token) {
        try {
          const response = await fetch(`${backendUrl}/api/posts/create`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: postContent,
              image_url: postImage ? URL.createObjectURL(postImage) : null,
            }),
          });

          if (response.ok) {
            const newPost = await response.json();
            setPosts([newPost, ...posts]);
            setPostContent("");
            setPostImage(null);
            return;
          }
        } catch (error) {
          console.error('Error creating post on server:', error);
        }
      }

      // Fallback: Create post locally
      const newPost = {
        id: Date.now(),
        feed_type: "post",
        author_name: user.display_name || user.username || "Anonymous",
        author_username: user.username || "anonymous",
        author_avatar: user.profile_picture || '/default-avatar.png',
        content: postContent,
        image_url: postImage ? URL.createObjectURL(postImage) : null,
        comments: [],
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        timestamp: "Just now",
      };

      setPosts([newPost, ...posts]);
      setPostContent("");
      setPostImage(null);

    } catch (error) {
      console.error('Error creating post:', error);
      alert("Failed to create post. Please try again.");
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(posts.map(post =>
          post.id === postId
            ? { ...post, is_liked: data.liked, likes_count: data.likes_count }
            : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleAddComment = async (postId) => {
    const comment = newCommentText[postId]?.trim();
    if (!comment) return;

    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: comment }),
      });

      if (response.ok) {
        const data = await response.json();
        setPostComments({
          ...postComments,
          [postId]: [...(postComments[postId] || []), data.comment],
        });
        // Update comment count
        setPosts(posts.map(post =>
          post.id === postId
            ? { ...post, comments_count: (post.comments_count || 0) + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Fallback: add locally
      setPostComments({
        ...postComments,
        [postId]: [...(postComments[postId] || []), { text: comment, author: user.username || 'You', timestamp: 'Just now' }],
      });
    }

    setNewCommentText({ ...newCommentText, [postId]: "" });
  };

  // IMPROVED: Follow user with proper error handling and loading state
  const handleFollowUser = async (userId, username) => {
    if (!userId) {
      console.error('No user ID provided for follow action');
      return;
    }

    try {
      // Set loading state for this specific user
      setFollowingUsers(prev => ({ ...prev, [userId]: true }));
      
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (!token) {
        alert('Please log in to follow users');
        return;
      }

      const response = await fetch(`${backendUrl}/api/follow/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (response.ok) {
        // Remove from suggested users on success
        setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
        setFollowSuccessMessage(`You are now following ${username || 'this user'}!`);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || errorData.message || 'Failed to follow user';
        
        // Check if already following
        if (errorMessage.toLowerCase().includes('already following')) {
          setSuggestedUsers(prev => prev.filter(u => u.id !== userId));
          setFollowSuccessMessage(`You were already following ${username || 'this user'}!`);
        } else {
          alert(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
      alert('Failed to follow user. Please try again.');
    } finally {
      // Clear loading state
      setFollowingUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file");
        return;
      }

      setPostImage(file);
    }
  };

  // Get feed type icon
  const getFeedTypeIcon = (feedType) => {
    switch (feedType) {
      case 'track': return '🎵';
      case 'video': return '🎬';
      case 'podcast': return '🎙️';
      default: return '📝';
    }
  };

  // Get feed type label
  const getFeedTypeLabel = (feedType) => {
    switch (feedType) {
      case 'track': return 'Track';
      case 'video': return 'Video';
      case 'podcast': return 'Podcast';
      default: return 'Post';
    }
  };

  if (loading) {
    return (
      <div className="home-feed-container">
        <div className="feed-loading">
          <div className="feed-spinner"></div>
          <p>Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-feed-container">
      {/* Header */}
      <div className="home-feed-header">
        <h1>🏠 Home Feed</h1>
        <p>Discover the latest from creators you follow</p>
      </div>

      {error && (
        <div className="error-banner">
          <p>⚠️ Connection Error: {error}</p>
          <p>Some features may not work properly. Check your backend connection.</p>
        </div>
      )}

      {/* Follow Success Message */}
      {followSuccessMessage && (
        <div className="success-banner" style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'slideIn 0.3s ease'
        }}>
          <p style={{ margin: 0 }}>✓ {followSuccessMessage}</p>
          <button 
            onClick={() => setFollowSuccessMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Feed Filter Tabs */}
      <div className="feed-filters">
        <button
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          🌐 All
        </button>
        <button
          className={`filter-btn ${activeFilter === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveFilter('posts')}
        >
          📝 Posts
        </button>
        <button
          className={`filter-btn ${activeFilter === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveFilter('tracks')}
        >
          🎵 Tracks
        </button>
        <button
          className={`filter-btn ${activeFilter === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('videos')}
        >
          🎬 Videos
        </button>
        <button
          className={`filter-btn ${activeFilter === 'podcasts' ? 'active' : ''}`}
          onClick={() => setActiveFilter('podcasts')}
        >
          🎙️ Podcasts
        </button>
      </div>

      <div className="feed-layout">
        {/* LEFT COLUMN */}
        <div className="feed-sidebar left">
          <div className="sidebar-section">
            <h3>👥 Suggested to Follow</h3>
            {suggestedUsers.length > 0 ? (
              suggestedUsers.slice(0, 5).map((suggestedUser) => (
                <div key={suggestedUser.id} className="suggested-user-card">
                  <Link to={`/profile/${suggestedUser.id}`}>
                    <img
                      src={suggestedUser.profile_picture || '/default-avatar.png'}
                      alt="avatar"
                      className="suggested-avatar"
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                  </Link>
                  <div className="suggested-info">
                    <Link to={`/profile/${suggestedUser.id}`}>
                      <strong>@{suggestedUser.username}</strong>
                    </Link>
                    <p>{suggestedUser.bio || "New creator on the rise!"}</p>
                    {suggestedUser.follower_count > 0 && (
                      <span className="follower-count">{suggestedUser.follower_count} followers</span>
                    )}
                  </div>
                  <button
                    className={`follow-btn ${followingUsers[suggestedUser.id] ? 'loading' : ''}`}
                    onClick={() => handleFollowUser(suggestedUser.id, suggestedUser.username)}
                    disabled={followingUsers[suggestedUser.id]}
                  >
                    {followingUsers[suggestedUser.id] ? '...' : '➕ Follow'}
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-text">No suggested users at the moment.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>📈 Trending</h3>
            {trendingContent.length > 0 ? (
              trendingContent.slice(0, 5).map((item) => (
                <div key={item.id} className="trending-item">
                  <img
                    src={item.artwork_url || item.thumbnail_url || '/default-trending.png'}
                    alt="trend"
                    className="trending-thumb"
                    onError={(e) => {
                      e.target.src = '/default-trending.png';
                    }}
                  />
                  <div className="trending-info">
                    <strong>{item.title}</strong>
                    <p>{item.author_name || item.description}</p>
                    <span className="trending-type">{getFeedTypeIcon(item.feed_type)} {getFeedTypeLabel(item.feed_type)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-text">No trending content available.</p>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN - Main Feed */}
        <div className="feed-main">
          {/* Post Creation */}
          <div className="post-creation-card">
            <h3>📝 What's on your mind?</h3>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share something with your followers..."
              maxLength={500}
              rows={4}
              className="post-textarea"
            />
            <div className="post-creation-actions">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="image-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="image-upload" className="upload-image-btn">
                📷 Add Image
              </label>
              {postImage && (
                <div className="image-preview">
                  <img
                    src={URL.createObjectURL(postImage)}
                    alt="Preview"
                  />
                  <button
                    onClick={() => setPostImage(null)}
                    className="remove-image-btn"
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={handleCreatePost}
                disabled={!postContent.trim()}
                className="create-post-btn"
              >
                📤 Post
              </button>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="posts-list">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="feed-card">
                  <div className="feed-card-header">
                    <Link to={`/profile/${post.author_id || post.author_username}`}>
                      <img
                        src={post.author_avatar || post.avatar || '/default-avatar.png'}
                        alt="avatar"
                        className="feed-avatar"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                    </Link>
                    <div className="feed-user-info">
                      <div className="feed-username">
                        <Link to={`/profile/${post.author_id || post.author_username}`}>
                          @{post.author_username || post.author_name || post.author || 'unknown'}
                        </Link>
                      </div>
                      {(post.created_at || post.timestamp) && (
                        <div className="feed-timestamp">
                          {post.timestamp || new Date(post.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <span className={`feed-content-type ${post.feed_type || 'post'}`}>
                      {getFeedTypeIcon(post.feed_type)} {getFeedTypeLabel(post.feed_type)}
                    </span>
                  </div>

                  <div className="feed-card-body">
                    {/* Title for tracks/videos/podcasts */}
                    {post.title && post.feed_type !== 'post' && (
                      <h4 className="feed-title">{post.title}</h4>
                    )}

                    <p className="feed-description">{post.content || post.description}</p>

                    {/* Image for posts */}
                    {(post.image_url || post.image) && (
                      <img
                        src={post.image_url || post.image}
                        alt="Post"
                        className="feed-media"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}

                    {/* Thumbnail for videos */}
                    {post.feed_type === 'video' && post.thumbnail_url && (
                      <div className="video-thumbnail-container">
                        <img
                          src={post.thumbnail_url}
                          alt="Video thumbnail"
                          className="feed-media"
                        />
                        <div className="play-overlay">▶</div>
                        {post.views > 0 && <span className="view-count">{post.views} views</span>}
                      </div>
                    )}

                    {/* Audio player for tracks */}
                    {post.feed_type === 'track' && post.audio_url && (
                      <div className="track-player">
                        {post.artwork_url && (
                          <img src={post.artwork_url} alt="Track artwork" className="track-artwork" />
                        )}
                        <audio controls src={post.audio_url} className="audio-player">
                          Your browser does not support the audio element.
                        </audio>
                        {post.plays > 0 && <span className="play-count">🎧 {post.plays} plays</span>}
                      </div>
                    )}

                    {/* Podcast info */}
                    {post.feed_type === 'podcast' && (
                      <div className="podcast-info">
                        {post.thumbnail_url && (
                          <img src={post.thumbnail_url} alt="Podcast artwork" className="podcast-artwork" />
                        )}
                        <div className="podcast-details">
                          <span className="podcast-name">{post.podcast_name}</span>
                          {post.episode_number && <span className="episode-number">Ep. {post.episode_number}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="feed-card-footer">
                    <div className="feed-actions">
                      <button
                        className={`feed-action-btn ${post.is_liked ? 'liked' : ''}`}
                        onClick={() => handleLikePost(post.id)}
                      >
                        {post.is_liked ? '❤️' : '🤍'} <span className="action-count">{post.likes_count || post.likes || 0}</span>
                      </button>
                      <button className="feed-action-btn">
                        💬 <span className="action-count">{post.comments_count || (postComments[post.id] || []).length}</span>
                      </button>
                      <button className="feed-action-btn">
                        🔄 <span className="action-count">{post.shares || 0}</span>
                      </button>
                    </div>
                    <button className="feed-share-btn">📤 Share</button>
                  </div>

                  {/* Comments Section */}
                  <div className="comments-section">
                    <div className="comments-list">
                      {/* Show existing comments from post */}
                      {(post.comments || []).slice(0, 3).map((comment, idx) => (
                        <div key={`existing-${idx}`} className="comment-item">
                          <strong>@{comment.author || comment.author_name}</strong>: {comment.text || comment.content}
                        </div>
                      ))}
                      {/* Show locally added comments */}
                      {(postComments[post.id] || []).map((comment, idx) => (
                        <div key={`new-${idx}`} className="comment-item">
                          <strong>@{comment.author || 'You'}</strong>: {comment.text || comment}
                        </div>
                      ))}
                    </div>
                    <div className="comment-input-row">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newCommentText[post.id] || ""}
                        onChange={(e) =>
                          setNewCommentText({
                            ...newCommentText,
                            [post.id]: e.target.value
                          })
                        }
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post.id);
                          }
                        }}
                        className="comment-input"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newCommentText[post.id]?.trim()}
                        className="comment-submit-btn"
                      >
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="feed-empty">
                <div className="feed-empty-icon">📭</div>
                <h3>No posts yet</h3>
                <p>Follow some creators or be the first to share something!</p>
                <Link to="/discover-users" className="discover-btn">
                  🔍 Discover Creators
                </Link>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.has_next && (
              <div className="load-more">
                <button className="load-more-btn">Load More</button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="feed-sidebar right">
          <div className="sidebar-section">
            <h3>🎛️ Quick Actions</h3>
            <div className="sidebar-actions">
              <Link to="/podcast-create" className="sidebar-action-btn">
                🎙️ Create Podcast
              </Link>
              <Link to="/create-radio" className="sidebar-action-btn">
                📡 Create Radio Station
              </Link>
              <Link to="/upload-music" className="sidebar-action-btn">
                🎤 Upload Music
              </Link>
              <Link to="/upload-video" className="sidebar-action-btn">
                📹 Upload Video
              </Link>
            </div>

            {user?.id && (
              <div className="webrtc-section">
                <WebRTCChat
                  roomId={`user-${user.id}`}
                  userId={user.id}
                  userName={user.display_name || user.username || "Anonymous"}
                />
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <h3>📹 Upload Video</h3>
            {user ? (
              <UploadVideo
                currentUser={user}
                onUpload={() => alert("Video uploaded!")}
              />
            ) : (
              <p className="empty-text">Please log in to upload videos.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - AT THE BOTTOM */}
      <section className="quick-actions-section">
        <h2>⚡ Quick Actions</h2>
        <div className="quick-actions-grid">
          <Link to="/upload-video" className="quick-action-card">
            <div className="action-icon">📹</div>
            <h3>Upload Video</h3>
            <p>Share your content</p>
          </Link>

          <Link to="/upload-music" className="quick-action-card">
            <div className="action-icon">🎵</div>
            <h3>Upload Music</h3>
            <p>Share your tracks</p>
          </Link>

          <Link to="/podcast-create" className="quick-action-card">
            <div className="action-icon">🎙️</div>
            <h3>Create Podcast</h3>
            <p>Start a new episode</p>
          </Link>

          <Link to="/live-streams" className="quick-action-card">
            <div className="action-icon">🔴</div>
            <h3>Go Live</h3>
            <p>Start streaming</p>
          </Link>

          <Link to="/create-radio" className="quick-action-card">
            <div className="action-icon">📻</div>
            <h3>Create Radio</h3>
            <p>Start a station</p>
          </Link>

          <Link to="/discover-users" className="quick-action-card">
            <div className="action-icon">🔍</div>
            <h3>Discover</h3>
            <p>Find creators</p>
          </Link>

          <Link to="/marketplace" className="quick-action-card">
            <div className="action-icon">🛒</div>
            <h3>Marketplace</h3>
            <p>Shop products</p>
          </Link>

          <Link to="/gamers/chat" className="quick-action-card">
            <div className="action-icon">🎮</div>
            <h3>Gamer Chat</h3>
            <p>Join the community</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomeFeed;