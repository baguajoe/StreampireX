// =============================================================================
// StoryViewer.js - Complete Full-screen Vertical Story Viewer
// =============================================================================
// Features: Multiple stories per user, shared content, tap/swipe navigation,
// auto-advance, progress bars, reactions, highlights, delete, viewer list
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/StoryViewer.css';

// =============================================================================
// COMPONENT VERSION - Use when passing stories as props
// =============================================================================

export const StoryViewerModal = ({ 
  usersStories, 
  initialUserIndex = 0, 
  onClose,
  onNextUser,
  onPrevUser
}) => {
  const navigate = useNavigate();
  const { store } = useContext(Context);
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactionText, setReactionText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  
  const progressInterval = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  const STORY_DURATION = 5000; // 5 seconds for images
  const PROGRESS_INTERVAL = 50;

  const currentUserData = usersStories?.[currentUserIndex];
  const currentStory = currentUserData?.stories?.[currentStoryIndex];
  const totalStories = currentUserData?.stories?.length || 0;
  const isOwnStory = currentStory?.user_id === store.user?.id;

  // Mark story as viewed
  const markAsViewed = useCallback(async (storyId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${backendUrl}/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking story viewed:', error);
    }
  }, [backendUrl]);

  // Progress timer
  useEffect(() => {
    if (isPaused || isLoading || !currentStory) return;

    const duration = currentStory.media_type === 'video' 
      ? (currentStory.duration || 15) * 1000 
      : STORY_DURATION;

    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + (100 * PROGRESS_INTERVAL / duration);
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(progressInterval.current);
  }, [currentStoryIndex, currentUserIndex, isPaused, isLoading, currentStory]);

  // Mark viewed when story changes
  useEffect(() => {
    if (currentStory?.id) {
      markAsViewed(currentStory.id);
      setProgress(0);
      setIsLoading(true);
      setShowReactions(false);
      setShowViewers(false);
      setShowOptions(false);
    }
  }, [currentStory?.id, markAsViewed]);

  // Handle media load
  const handleMediaLoaded = () => {
    setIsLoading(false);
  };

  // Navigation functions
  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < totalStories - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      // Go to next user
      if (currentUserIndex < usersStories.length - 1) {
        setCurrentUserIndex(prev => prev + 1);
        setCurrentStoryIndex(0);
        if (onNextUser) onNextUser();
      } else {
        // End of all stories
        onClose();
      }
    }
  }, [currentStoryIndex, totalStories, currentUserIndex, usersStories?.length, onNextUser, onClose]);

  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      const prevUserStories = usersStories[currentUserIndex - 1]?.stories?.length || 1;
      setCurrentStoryIndex(prevUserStories - 1);
      if (onPrevUser) onPrevUser();
    }
  }, [currentStoryIndex, currentUserIndex, usersStories, onPrevUser]);

  // Handle tap navigation
  const handleTap = (e) => {
    if (showReactions || showViewers || showOptions) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPrevStory();
    } else if (x > (width * 2) / 3) {
      goToNextStory();
    } else {
      // Middle tap - pause/play
      setIsPaused(prev => !prev);
    }
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
    
    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        goToNextStory();
      } else {
        goToPrevStory();
      }
    }
    // Vertical swipe down - close
    else if (deltaY > 100) {
      onClose();
    }
    
    setIsPaused(false);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showReactions) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNextStory();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevStory();
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPrevStory, onClose, showReactions]);

  // Navigate to shared content
  const handleViewSharedContent = () => {
    if (!currentStory?.shared_content) return;

    const { type, id } = currentStory.shared_content;
    const routes = {
      video: `/videos/${id}`,
      post: `/post/${id}`,
      track: `/track/${id}`,
      podcast: `/podcast/${id}`
    };

    if (routes[type]) {
      onClose();
      navigate(routes[type]);
    }
  };

  // Send reaction
  const handleSendReaction = async (reaction) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${backendUrl}/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reaction: reaction,
          text: reactionText
        })
      });

      setShowReactions(false);
      setReactionText('');
      // Brief visual confirmation could go here
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  // Fetch viewers (for own stories)
  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}/viewers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setViewers(data.viewers || []);
        setShowViewers(true);
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
    }
  };

  // Delete story
  const deleteStory = async () => {
    if (!window.confirm('Delete this story?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        if (totalStories === 1) {
          onClose();
        } else {
          // Remove from local state and adjust index
          goToNextStory();
        }
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  // Add to highlights
  const addToHighlights = async () => {
    const highlightName = prompt('Highlight name:', 'Highlights');
    if (!highlightName) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${backendUrl}/api/stories/${currentStory.id}/highlight`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ highlight_name: highlightName })
      });

      alert('Added to highlights!');
      setShowOptions(false);
    } catch (error) {
      console.error('Error adding to highlights:', error);
    }
  };

  if (!currentStory || !currentUserData) {
    return null;
  }

  const user = currentUserData.user;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div 
        className="story-viewer-container" 
        ref={containerRef}
        onClick={(e) => {
          e.stopPropagation();
          handleTap(e);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <div className="story-progress-container">
          {Array.from({ length: totalStories }).map((_, index) => (
            <div key={index} className="story-progress-bar">
              <div 
                className="story-progress-fill"
                style={{
                  width: index < currentStoryIndex 
                    ? '100%' 
                    : index === currentStoryIndex 
                      ? `${progress}%` 
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
            onClose();
            navigate(`/user/${user.username || user.id}`);
          }}>
            <img 
              src={user.avatar_url || user.profile_picture || '/default-avatar.png'} 
              alt={user.username}
              className="story-user-avatar"
            />
            <div className="story-user-details">
              <span className="story-username">{user.display_name || user.username}</span>
              <span className="story-time">
                {getTimeAgo(currentStory.created_at)}
                {currentStory.is_shared && ' • Shared'}
              </span>
            </div>
          </div>

          <div className="story-header-actions">
            {isPaused && <span className="paused-indicator">⏸</span>}
            
            {isOwnStory && (
              <button 
                className="story-viewers-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchViewers();
                }}
              >
                👁 {currentStory.views_count || 0}
              </button>
            )}

            {isOwnStory && (
              <button 
                className="story-options-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                  setIsPaused(true);
                }}
              >
                ⋯
              </button>
            )}

            <button className="story-close-btn" onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}>
              ✕
            </button>
          </div>
        </div>

        {/* Options Menu (for own stories) */}
        {showOptions && (
          <div className="story-options-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={addToHighlights}>
              <span>⭐</span> Add to Highlights
            </button>
            <button onClick={deleteStory} className="delete-option">
              <span>🗑</span> Delete Story
            </button>
            <button onClick={() => { setShowOptions(false); setIsPaused(false); }}>
              <span>✕</span> Cancel
            </button>
          </div>
        )}

        {/* Story Content */}
        <div className="story-content">
          {isLoading && (
            <div className="story-loading">
              <div className="story-spinner"></div>
            </div>
          )}

          {currentStory.media_type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="story-media"
              autoPlay
              muted={false}
              playsInline
              onLoadedData={handleMediaLoaded}
              onEnded={goToNextStory}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="story-media"
              onLoad={handleMediaLoaded}
            />
          )}

          {/* Shared Content Overlay */}
          {currentStory.is_shared && currentStory.shared_content && (
            <div 
              className="shared-content-overlay"
              onClick={(e) => {
                e.stopPropagation();
                handleViewSharedContent();
              }}
            >
              <div className="shared-content-card">
                <div className="shared-badge">
                  {getContentTypeIcon(currentStory.shared_content_type)} Shared {currentStory.shared_content_type}
                </div>
                
                {currentStory.shared_content.thumbnail_url && (
                  <img 
                    src={currentStory.shared_content.thumbnail_url}
                    alt="Shared content"
                    className="shared-thumbnail"
                  />
                )}
                
                <div className="shared-info">
                  <p className="shared-title">{currentStory.shared_content.title}</p>
                  {currentStory.shared_content.original_creator && (
                    <p className="shared-creator">
                      via @{currentStory.shared_content.original_creator.username}
                    </p>
                  )}
                </div>
                
                <div className="tap-to-view">
                  👆 Tap to view
                </div>
              </div>
            </div>
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
              <span className="music-icon">🎵</span>
              <span className="music-title">{currentStory.music_title}</span>
            </div>
          )}

          {/* Paused Indicator */}
          {isPaused && !showViewers && !showOptions && !showReactions && (
            <div className="story-paused-indicator">
              <span>⏸️ Paused</span>
            </div>
          )}
        </div>

        {/* Footer - Reactions (for other people's stories) */}
        {!isOwnStory && (
          <div className="story-footer" onClick={(e) => e.stopPropagation()}>
            {showReactions ? (
              <div className="reaction-input-container">
                <input
                  type="text"
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  placeholder="Send a message..."
                  className="reaction-input"
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => !reactionText && setIsPaused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReaction(null)}
                  autoFocus
                />
                <button 
                  className="send-reaction-btn"
                  onClick={() => handleSendReaction(null)}
                  disabled={!reactionText.trim()}
                >
                  Send
                </button>
                <button 
                  className="cancel-reaction-btn"
                  onClick={() => { setShowReactions(false); setIsPaused(false); }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="quick-reactions">
                <button 
                  onClick={() => { setShowReactions(true); setIsPaused(true); }} 
                  className="message-btn"
                >
                  💬 Reply
                </button>
                <div className="emoji-reactions">
                  {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-btn"
                      onClick={() => handleSendReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewers Modal (for own stories) */}
        {showViewers && (
          <div className="viewers-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewers-modal-content">
              <div className="viewers-header">
                <h3>👁 {viewers.length} Views</h3>
                <button onClick={() => { setShowViewers(false); setIsPaused(false); }}>✕</button>
              </div>
              <div className="viewers-list">
                {viewers.length > 0 ? (
                  viewers.map((view) => (
                    <div 
                      key={view.id} 
                      className="viewer-item"
                      onClick={() => {
                        onClose();
                        navigate(`/user/${view.viewer?.username || view.user_id}`);
                      }}
                    >
                      <img 
                        src={view.viewer?.avatar_url || view.viewer?.profile_picture || '/default-avatar.png'} 
                        alt=""
                        className="viewer-avatar"
                      />
                      <span className="viewer-name">
                        {view.viewer?.display_name || view.viewer?.username}
                      </span>
                      <span className="view-time">{getTimeAgo(view.viewed_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-viewers">No views yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Hints */}
        <div className="story-nav-hints">
          <div className="nav-hint left">‹</div>
          <div className="nav-hint right">›</div>
        </div>
      </div>
    </div>
  );
};


// =============================================================================
// PAGE VERSION - Use as a route component
// =============================================================================

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
  const [showOptions, setShowOptions] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
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
      
      const response = await fetch(`${backendUrl}/api/stories/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const storyList = data.stories || data || [];
        setStories(storyList);
        
        // Start at first unviewed story
        const firstUnviewed = storyList.findIndex(s => !s.viewed);
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

  // Touch handling
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
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    } else if (deltaY > 100) {
      handleClose();
    }
    
    setIsPaused(false);
  };

  const handleTap = (e) => {
    if (showReplyInput || showViewers || showOptions) return;
    
    const screenWidth = window.innerWidth;
    const tapX = e.clientX;
    
    if (tapX < screenWidth * 0.3) {
      goToPrevious();
    } else if (tapX > screenWidth * 0.7) {
      goToNext();
    } else {
      setIsPaused(prev => !prev);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showReplyInput) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'Escape':
          handleClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, showReplyInput]);

  // Reply to story
  const sendReply = async () => {
    if (!replyText.trim()) return;
    
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}/react`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: replyText })
      });
      
      if (response.ok) {
        setReplyText("");
        setShowReplyInput(false);
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  // Send quick reaction
  const sendReaction = async (emoji) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      await fetch(`${backendUrl}/api/stories/${currentStory.id}/react`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reaction: emoji })
      });
    } catch (error) {
      console.error("Error sending reaction:", error);
    }
  };

  // Fetch viewers
  const fetchViewers = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch(`${backendUrl}/api/stories/${currentStory.id}/viewers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setViewers(data.viewers || []);
        setShowViewers(true);
        setIsPaused(true);
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
            setCurrentIndex(prev => Math.max(0, prev - 1));
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
      
      await fetch(`${backendUrl}/api/stories/${currentStory.id}/highlight`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ highlight_name: highlightName })
      });
      
      alert("Added to highlights!");
      setShowOptions(false);
    } catch (error) {
      console.error("Error adding to highlights:", error);
    }
  };

  // Navigate to shared content
  const handleViewSharedContent = () => {
    if (!currentStory?.shared_content) return;

    const { type, id } = currentStory.shared_content;
    const routes = {
      video: `/videos/${id}`,
      post: `/post/${id}`,
      track: `/track/${id}`,
      podcast: `/podcast/${id}`
    };

    if (routes[type]) {
      navigate(routes[type]);
    }
  };

  if (loading) {
    return (
      <div className="story-viewer-overlay">
        <div className="story-viewer-container">
          <div className="story-loading">
            <div className="story-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStory) {
    return (
      <div className="story-viewer-overlay">
        <div className="story-viewer-container">
          <div className="story-empty">
            <p>No stories available</p>
            <button onClick={handleClose} className="go-back-btn">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  const user = currentStory.user || {};

  return (
    <div 
      className="story-viewer-overlay"
      onClick={handleClose}
    >
      <div 
        className="story-viewer-container"
        onClick={(e) => {
          e.stopPropagation();
          handleTap(e);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <div className="story-progress-container">
          {stories.map((_, index) => (
            <div key={index} className="story-progress-bar">
              <div 
                className="story-progress-fill"
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
            navigate(`/user/${user.username || userId}`);
          }}>
            <img 
              src={user.profile_picture || user.avatar_url || '/default-avatar.png'} 
              alt={user.username}
              className="story-user-avatar"
            />
            <div className="story-user-details">
              <span className="story-username">
                {user.display_name || user.gamertag || user.username}
              </span>
              <span className="story-time">
                {getTimeAgo(currentStory.created_at)}
                {currentStory.is_shared && ' • Shared'}
              </span>
            </div>
          </div>
          
          <div className="story-header-actions">
            {isPaused && <span className="paused-indicator">⏸</span>}
            
            {isOwnStory && (
              <button 
                className="story-viewers-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchViewers();
                }}
              >
                👁 {currentStory.views_count || currentStory.view_count || 0}
              </button>
            )}

            {isOwnStory && (
              <button 
                className="story-options-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                  setIsPaused(true);
                }}
              >
                ⋯
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

        {/* Options Menu */}
        {showOptions && (
          <div className="story-options-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={addToHighlights}>
              <span>⭐</span> Add to Highlights
            </button>
            <button onClick={deleteStory} className="delete-option">
              <span>🗑</span> Delete Story
            </button>
            <button onClick={() => { setShowOptions(false); setIsPaused(false); }}>
              <span>✕</span> Cancel
            </button>
          </div>
        )}

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
              onLoadedData={() => setLoading(false)}
            />
          ) : (
            <img 
              src={currentStory.media_url}
              alt="Story"
              className="story-media"
              onLoad={() => setLoading(false)}
            />
          )}

          {/* Shared Content Overlay */}
          {currentStory.is_shared && currentStory.shared_content && (
            <div 
              className="shared-content-overlay"
              onClick={(e) => {
                e.stopPropagation();
                handleViewSharedContent();
              }}
            >
              <div className="shared-content-card">
                <div className="shared-badge">
                  {getContentTypeIcon(currentStory.shared_content_type)} Shared {currentStory.shared_content_type}
                </div>
                
                {currentStory.shared_content.thumbnail_url && (
                  <img 
                    src={currentStory.shared_content.thumbnail_url}
                    alt="Shared content"
                    className="shared-thumbnail"
                  />
                )}
                
                <div className="shared-info">
                  <p className="shared-title">{currentStory.shared_content.title}</p>
                  {currentStory.shared_content.original_creator && (
                    <p className="shared-creator">
                      via @{currentStory.shared_content.original_creator.username}
                    </p>
                  )}
                </div>
                
                <div className="tap-to-view">
                  👆 Tap to view
                </div>
              </div>
            </div>
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
              <span className="music-icon">🎵</span>
              <span className="music-title">{currentStory.music_title}</span>
            </div>
          )}

          {/* Paused Indicator */}
          {isPaused && !showViewers && !showOptions && !showReplyInput && (
            <div className="story-paused-indicator">
              <span>⏸️ Paused</span>
            </div>
          )}
        </div>

        {/* Footer - Reactions */}
        {!isOwnStory && (
          <div className="story-footer" onClick={(e) => e.stopPropagation()}>
            {showReplyInput ? (
              <div className="reaction-input-container">
                <input
                  type="text"
                  placeholder="Send a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  onFocus={() => setIsPaused(true)}
                  className="reaction-input"
                  autoFocus
                />
                <button onClick={sendReply} className="send-reaction-btn">Send</button>
                <button 
                  onClick={() => { setShowReplyInput(false); setIsPaused(false); }}
                  className="cancel-reaction-btn"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="quick-reactions">
                <button 
                  className="message-btn"
                  onClick={() => { setShowReplyInput(true); setIsPaused(true); }}
                >
                  💬 Reply
                </button>
                <div className="emoji-reactions">
                  {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-btn"
                      onClick={() => sendReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Viewers Modal */}
        {showViewers && (
          <div className="viewers-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewers-modal-content">
              <div className="viewers-header">
                <h3>👁 {viewers.length} Views</h3>
                <button onClick={() => { setShowViewers(false); setIsPaused(false); }}>✕</button>
              </div>
              <div className="viewers-list">
                {viewers.length > 0 ? (
                  viewers.map((view) => (
                    <div 
                      key={view.id} 
                      className="viewer-item"
                      onClick={() => navigate(`/user/${view.viewer?.username}`)}
                    >
                      <img 
                        src={view.viewer?.profile_picture || view.viewer?.avatar_url || '/default-avatar.png'} 
                        alt=""
                        className="viewer-avatar"
                      />
                      <span className="viewer-name">
                        {view.viewer?.display_name || view.viewer?.username}
                      </span>
                      <span className="view-time">{getTimeAgo(view.viewed_at)}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-viewers">No views yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation hints */}
        <div className="story-nav-hints">
          <div className="nav-hint left">‹</div>
          <div className="nav-hint right">›</div>
        </div>
      </div>
    </div>
  );
};


// =============================================================================
// Helper Functions
// =============================================================================

const getTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const getContentTypeIcon = (type) => {
  const icons = {
    video: '🎬',
    track: '🎵',
    podcast: '🎙️',
    post: '📝'
  };
  return icons[type] || '📤';
};

export default StoryViewer;