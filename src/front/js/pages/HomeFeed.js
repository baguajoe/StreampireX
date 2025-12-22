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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem("token");
        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        
        // Debug: Log the backend URL
        console.log("Backend URL:", backendUrl);
        
        if (!backendUrl) {
          throw new Error("BACKEND_URL is not defined in environment variables");
        }

        // Fetch posts
        try {
          const postsRes = await fetch(`${backendUrl}/api/home-feed`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            setPosts(postsData);
          } else {
            console.error('Failed to fetch posts:', postsRes.status, postsRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching posts:', error);
        }

        // Fetch suggested users
        try {
          const usersRes = await fetch(`${backendUrl}/api/users/suggested`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setSuggestedUsers(usersData);
          } else {
            console.error('Failed to fetch suggested users:', usersRes.status, usersRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching suggested users:', error);
        }

        // Fetch trending content
        try {
          const trendingRes = await fetch(`${backendUrl}/api/trending`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (trendingRes.ok) {
            const trendingData = await trendingRes.json();
            setTrendingContent(trendingData);
          } else {
            console.error('Failed to fetch trending content:', trendingRes.status, trendingRes.statusText);
          }
        } catch (error) {
          console.error('Error fetching trending content:', error);
        }

        // Fetch user profile
        try {
          const profileRes = await fetch(`${backendUrl}/user/profile`, {
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
  }, []);

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      alert("Please enter some content for your post");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // If backend is available, try to create post on server
      if (backendUrl && token) {
        try {
          const formData = new FormData();
          formData.append('content', postContent);
          if (postImage) {
            formData.append('image', postImage);
          }

          const response = await fetch(`${backendUrl}/api/posts`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
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
        author: user.username || "Anonymous",
        content: postContent,
        image: postImage ? URL.createObjectURL(postImage) : null,
        comments: [],
        created_at: new Date().toISOString(),
      };
      
      setPosts([newPost, ...posts]);
      setPostContent("");
      setPostImage(null);
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert("Failed to create post. Please try again.");
    }
  };

  const handleAddComment = (postId) => {
    const comment = newCommentText[postId]?.trim();
    if (!comment) return;

    setPostComments({
      ...postComments,
      [postId]: [...(postComments[postId] || []), comment],
    });
    setNewCommentText({ ...newCommentText, [postId]: "" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file");
        return;
      }
      
      setPostImage(file);
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
      
      <div className="feed-layout">
        {/* LEFT COLUMN */}
        <div className="feed-sidebar left">
          <div className="sidebar-section">
            <h3>👥 Suggested to Follow</h3>
            {suggestedUsers.length > 0 ? (
              suggestedUsers.map((suggestedUser, idx) => (
                <div key={idx} className="suggested-user-card">
                  <img 
                    src={suggestedUser.profile_picture || '/default-avatar.png'} 
                    alt="avatar" 
                    className="suggested-avatar"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div className="suggested-info">
                    <strong>@{suggestedUser.username}</strong>
                    <p>{suggestedUser.bio || "New creator on the rise!"}</p>
                  </div>
                  <button className="follow-btn">Follow</button>
                </div>
              ))
            ) : (
              <p className="empty-text">No suggested users at the moment.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>📈 Trending</h3>
            {trendingContent.length > 0 ? (
              trendingContent.map((item, idx) => (
                <div key={idx} className="trending-item">
                  <img 
                    src={item.image_url || '/default-trending.png'} 
                    alt="trend" 
                    className="trending-thumb"
                    onError={(e) => {
                      e.target.src = '/default-trending.png';
                    }}
                  />
                  <div className="trending-info">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
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
                    <img 
                      src={post.author_avatar || '/default-avatar.png'} 
                      alt="avatar"
                      className="feed-avatar"
                    />
                    <div className="feed-user-info">
                      <div className="feed-username">
                        <Link to={`/profile/${post.author}`}>@{post.author}</Link>
                      </div>
                      {post.created_at && (
                        <div className="feed-timestamp">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <span className="feed-content-type post">Post</span>
                  </div>

                  <div className="feed-card-body">
                    <p className="feed-description">{post.content}</p>
                    {post.image && (
                      <img 
                        src={post.image} 
                        alt="Post" 
                        className="feed-media"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  <div className="feed-card-footer">
                    <div className="feed-actions">
                      <button className="feed-action-btn">
                        🤍 <span className="action-count">{post.likes || 0}</span>
                      </button>
                      <button className="feed-action-btn">
                        💬 <span className="action-count">{(postComments[post.id] || []).length}</span>
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
                      {(postComments[post.id] || []).map((comment, idx) => (
                        <div key={idx} className="comment-item">{comment}</div>
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
                <p>Be the first to share something!</p>
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