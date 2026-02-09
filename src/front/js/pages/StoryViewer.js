// src/front/js/pages/StoryViewer.js
// Fullscreen vertical story viewer with swipe navigation
import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { Context } from "../store/appContext";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import "../../styles/Stories.css";

const StoryViewer = () => {
  const { store } = useContext(Context);
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.user_id === store.user?.id;

  // Fetch stories
  useEffect(() => {
    fetchUserStories();
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [userId]);

  // Start from specific index if provided
  useEffect(() => {
    const startIndex = parseInt(searchParams.get("start") || "0");
    setCurrentIndex(startIndex);
  }, [searchParams]);

  // Handle progress timer
  useEffect(() => {
    if (!currentStory || isPaused || loading) return;
    
    const duration = currentStory.media_type === 'video' 
      ? (currentStory.duration || 15) * 1000 
      : 5000;
    
    const startTime = Date.now();
    setProgress(0);
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;
      
      if (newProgress >= 100) {
        goToNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);
    
    // Record view
    recordView(currentStory.id);
    
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, currentStory, isPaused, loading]);

  const fetchUserStories = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/stories/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStories(data);
        
        // Start at first unviewed story
        const firstUnviewed = data.findIndex(s => !s.viewed);
        if (firstUnviewed > 0) setCurrentIndex(firstUnviewed);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async (storyId) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      await fetch(`${backendUrl}/api/stories/${storyId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // End of this user's stories - close viewer
      navigate(-1);
    }
  }, [currentIndex, stories.length, navigate]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  const handleClose = () => {
    navigate(-1);
  };

  // Touch handling for swipe
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    setIsPaused(true);
  };

  const handleTouchEnd = (e) => {
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };
    
    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    
    // Horizontal swipe (next/prev user's stories)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // Swipe left - next
        goToNext();
      } else {
        // Swipe right - previous
        goToPrevious();
      }
    }
    // Vertical swipe down - close
    else if (deltaY > 100) {
      handleClose();
    }
    
    setIsPaused(false);
  };

  // Tap handling (left side = prev, right side = next)
  const handleTap = (e) => {
    const screenWidth = window.innerWidth;
    const tapX = e.clientX;
    
    if (tapX < screenWidth * 0.3) {
      goToPrevious();
    } else if (tapX > screenWidth * 0.7) {
      goToNext();
    } else {
      // Center tap - pause/unpause
      setIsPaused(prev => !prev);
    }
  };

  // Reply to story
  const sendReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: replyText })
      });
      
      if (response.ok) {
        setReplyText("");
        setShowReplyInput(false);
        alert("Reply sent!");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  // Fetch viewers (for own stories)
  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}/viewers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewers(data.viewers);
        setShowViewers(true);
      }
    } catch (error) {
      console.error("Error fetching viewers:", error);
    }
  };

  // Delete story
  const deleteStory = async () => {
    if (!window.confirm("Delete this story?")) return;
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        if (stories.length === 1) {
          handleClose();
        } else {
          setStories(prev => prev.filter(s => s.id !== currentStory.id));
          if (currentIndex >= stories.length - 1) {
            setCurrentIndex(prev => prev - 1);
          }
        }
      }
    } catch (error) {
      console.error("Error deleting story:", error);
    }
  };

  // Add to highlights
  const addToHighlights = async () => {
    const highlightName = prompt("Highlight name:", "Highlights");
    if (!highlightName) return;
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      await fetch(`${backendUrl}/api/stories/${currentStory.id}/highlight`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ highlight_name: highlightName })
      });
      
      alert("Added to highlights!");
    } catch (error) {
      console.error("Error adding to highlights:", error);
    }
  };

  if (loading) {
    return (
      <div className="story-viewer-container">
        <div className="story-loading">
          <div className="story-spinner"></div>
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return (
      <div className="story-viewer-container">
        <div className="story-empty">
          <p>No stories available</p>
          <button onClick={handleClose}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="story-viewer-container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* Progress Bars */}
      <div className="story-progress-bars">
        {stories.map((_, index) => (
          <div key={index} className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{
                width: index < currentIndex ? '100%' 
                  : index === currentIndex ? `${progress}%` 
                  : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="story-header">
        <div className="story-user-info" onClick={(e) => {
          e.stopPropagation();
          navigate(`/profile/${currentStory.user?.username}`);
        }}>
          {currentStory.user?.profile_image ? (
            <img 
              src={currentStory.user.profile_image} 
              alt={currentStory.user.username}
              className="story-user-avatar"
            />
          ) : (
            <div className="story-user-avatar-placeholder">
              {currentStory.user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="story-user-details">
            <span className="story-username">
              {currentStory.user?.gamertag || currentStory.user?.username}
            </span>
            <span className="story-timestamp">
              {getTimeAgo(currentStory.created_at)}
            </span>
          </div>
        </div>
        
        <div className="story-header-actions">
          {isPaused && <span className="paused-indicator">⏸</span>}
          
          {isOwnStory && (
            <button 
              className="story-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                fetchViewers();
              }}
            >
              👁 {currentStory.view_count}
            </button>
          )}
          
          <button 
            className="story-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="story-content">
        {currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="story-media"
            autoPlay
            playsInline
            muted={false}
            loop={false}
            onPause={() => setIsPaused(true)}
            onPlay={() => setIsPaused(false)}
          />
        ) : (
          <img 
            src={currentStory.media_url}
            alt="Story"
            className="story-media"
          />
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div className="story-caption">
            <p>{currentStory.caption}</p>
          </div>
        )}

        {/* Music indicator */}
        {currentStory.music_title && (
          <div className="story-music">
            <span>🎵 {currentStory.music_title}</span>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="story-bottom-actions" onClick={(e) => e.stopPropagation()}>
        {!isOwnStory && currentStory.allow_replies && (
          <>
            {showReplyInput ? (
              <div className="story-reply-input">
                <input
                  type="text"
                  placeholder="Send a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  autoFocus
                />
                <button onClick={sendReply}>Send</button>
                <button onClick={() => setShowReplyInput(false)}>✕</button>
              </div>
            ) : (
              <button 
                className="reply-btn"
                onClick={() => setShowReplyInput(true)}
              >
                💬 Reply
              </button>
            )}
          </>
        )}
        
        {isOwnStory && (
          <div className="owner-actions">
            <button onClick={addToHighlights}>⭐ Highlight</button>
            <button onClick={deleteStory} className="delete-btn">🗑 Delete</button>
          </div>
        )}
      </div>

      {/* Viewers Modal */}
      {showViewers && (
        <div className="viewers-modal" onClick={(e) => e.stopPropagation()}>
          <div className="viewers-modal-content">
            <div className="viewers-header">
              <h3>👁 {viewers.length} Views</h3>
              <button onClick={() => setShowViewers(false)}>✕</button>
            </div>
            <div className="viewers-list">
              {viewers.map((view) => (
                <div key={view.id} className="viewer-item">
                  {view.viewer?.profile_image ? (
                    <img src={view.viewer.profile_image} alt="" />
                  ) : (
                    <div className="viewer-avatar-placeholder">
                      {view.viewer?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{view.viewer?.username}</span>
                  <span className="view-time">{getTimeAgo(view.viewed_at)}</span>
                </div>
              ))}
              {viewers.length === 0 && <p>No views yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Navigation hints */}
      <div className="story-nav-hint left" />
      <div className="story-nav-hint right" />
    </div>
  );
};

// Helper function
const getTimeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default StoryViewer;