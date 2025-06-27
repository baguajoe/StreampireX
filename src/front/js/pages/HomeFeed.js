import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import WebRTCChat from "../component/WebRTCChat";
import "../../styles/ProfilePage.css";

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
        const backendUrl = process.env.BACKEND_URL;
        
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
          const profileRes = await fetch(`${backendUrl}/api/profile`, {
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
      <div className="profile-container">
        <div className="loading-spinner">
          <p>Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {error && (
        <div className="error-banner" style={{ 
          background: '#ff6b6b', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px', 
          margin: '10px 0' 
        }}>
          <p>⚠️ Connection Error: {error}</p>
          <p>Some features may not work properly. Check your backend connection.</p>
        </div>
      )}
      
      <div className="profile-layout">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <h3>👥 Suggested to Follow</h3>
          {suggestedUsers.length > 0 ? (
            suggestedUsers.map((suggestedUser, idx) => (
              <div key={idx} className="favorite-item">
                <img 
                  src={suggestedUser.profile_picture || '/default-avatar.png'} 
                  alt="avatar" 
                  className="favorite-avatar"
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
                <div>
                  <strong>@{suggestedUser.username}</strong>
                  <p>{suggestedUser.bio || "New creator on the rise!"}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No suggested users at the moment.</p>
          )}

          <h3>📈 Trending</h3>
          {trendingContent.length > 0 ? (
            trendingContent.map((item, idx) => (
              <div key={idx} className="favorite-item">
                <img 
                  src={item.image_url || '/default-trending.png'} 
                  alt="trend" 
                  className="favorite-avatar"
                  onError={(e) => {
                    e.target.src = '/default-trending.png';
                  }}
                />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No trending content available.</p>
          )}
        </div>

        {/* MIDDLE COLUMN */}
        <div className="middle-column">
          <h3>📝 What's on your mind?</h3>
          <div className="post-creation">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share something with your followers..."
              maxLength={500}
              rows={4}
            />
            <div className="post-controls">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="image-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="image-upload" className="file-upload-label">
                📷 Add Image
              </label>
              {postImage && (
                <div className="image-preview">
                  <img 
                    src={URL.createObjectURL(postImage)} 
                    alt="Preview" 
                    style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'cover' }}
                  />
                  <button 
                    onClick={() => setPostImage(null)}
                    className="remove-image"
                  >
                    ❌
                  </button>
                </div>
              )}
              <button 
                onClick={handleCreatePost}
                disabled={!postContent.trim()}
                className="post-button"
              >
                📤 Post
              </button>
            </div>
          </div>

          <div className="posts-feed">
            {posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="post-card">
                  <div className="post-header">
                    <strong>@{post.author}</strong>
                    {post.created_at && (
                      <span className="post-time">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="post-content">{post.content}</p>
                  {post.image && (
                    <img 
                      src={post.image} 
                      alt="Post" 
                      className="post-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}

                  <div className="post-interactions">
                    <h5>💬 Comments</h5>
                    <ul className="comments-list">
                      {(postComments[post.id] || []).map((comment, idx) => (
                        <li key={idx} className="comment-item">{comment}</li>
                      ))}
                    </ul>
                    <div className="comment-input">
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
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newCommentText[post.id]?.trim()}
                      >
                        💬 Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-posts">
                <p>No posts yet. Be the first to share something!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <div className="quick-actions">
            <h3>🎛️ Quick Actions</h3>
            <Link to="/podcast/create">
              <button className="btn-podcast">🎙️ Create Podcast</button>
            </Link>
            <Link to="/create-radio">
              <button className="btn-radio">📡 Create Radio Station</button>
            </Link>
            <Link to="/indie-artist-upload">
              <button className="btn-indie-upload">🎤 Indie Artist Upload</button>
            </Link>

            {user?.id && (
              <WebRTCChat
                roomId={`user-${user.id}`}
                userId={user.id}
                userName={user.display_name || user.username || "Anonymous"}
              />
            )}
          </div>

          <div className="upload-section">
            <h3>📹 Upload Video</h3>
            {user ? (
              <UploadVideo 
                currentUser={user} 
                onUpload={() => alert("Video uploaded!")} 
              />
            ) : (
              <p>Please log in to upload videos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeFeed;