// =============================================================================
// ReelsFeed.js — TikTok-Style Vertical Swipe Reels Feed
// =============================================================================
// Location: src/front/js/pages/ReelsFeed.js
// Features: Full-screen vertical scroll, auto-play, like/comment/share,
//           discovery feed, creator info overlay, progress bar
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/ReelsFeed.css';

const MAX_REEL_DURATION = 180; // 3 minutes

const ReelsFeed = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();
  
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('foryou'); // 'foryou' | 'following' | 'trending'
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [muted, setMuted] = useState(false);
  
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartRef = useRef({ y: 0, time: 0 });
  const isScrollingRef = useRef(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  // Fetch reels
  const fetchReels = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(
        `${backendUrl}/api/reels/feed?type=${feedType}&page=${pageNum}&per_page=10`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const newReels = data.reels || [];
        
        if (append) {
          setReels(prev => [...prev, ...newReels]);
        } else {
          setReels(newReels);
        }
        
        setHasMore(data.has_next || false);
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, feedType]);

  useEffect(() => {
    setPage(1);
    setCurrentIndex(0);
    fetchReels(1, false);
  }, [feedType, fetchReels]);

  // Auto-play current video, pause others
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([index, video]) => {
      if (!video) return;
      if (parseInt(index) === currentIndex) {
        video.currentTime = 0;
        video.muted = muted;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex, muted]);

  // Load more when near end
  useEffect(() => {
    if (currentIndex >= reels.length - 3 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, true);
    }
  }, [currentIndex, reels.length, hasMore, loading, page, fetchReels]);

  // Record view
  const recordView = useCallback(async (reelId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      await fetch(`${backendUrl}/api/clips/${reelId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      // Silent fail for views
    }
  }, [backendUrl]);

  useEffect(() => {
    if (reels[currentIndex]) {
      recordView(reels[currentIndex].id);
    }
  }, [currentIndex, reels, recordView]);

  // Scroll/swipe handling
  const scrollToIndex = useCallback((index) => {
    if (index < 0 || index >= reels.length || isScrollingRef.current) return;
    isScrollingRef.current = true;
    setCurrentIndex(index);
    
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: index * window.innerHeight,
        behavior: 'smooth'
      });
    }
    
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 400);
  }, [reels.length]);

  // Touch events
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const deltaY = touchStartRef.current.y - e.changedTouches[0].clientY;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaY) / deltaTime;
    
    // Require minimum swipe distance or velocity
    if (Math.abs(deltaY) > 50 || velocity > 0.5) {
      if (deltaY > 0) {
        // Swipe up — next reel
        scrollToIndex(currentIndex + 1);
      } else {
        // Swipe down — previous reel
        scrollToIndex(currentIndex - 1);
      }
    }
  };

  // Wheel event (desktop)
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (isScrollingRef.current) return;
    
    if (e.deltaY > 30) {
      scrollToIndex(currentIndex + 1);
    } else if (e.deltaY < -30) {
      scrollToIndex(currentIndex - 1);
    }
  }, [currentIndex, scrollToIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') scrollToIndex(currentIndex + 1);
      if (e.key === 'ArrowUp' || e.key === 'k') scrollToIndex(currentIndex - 1);
      if (e.key === 'm') setMuted(prev => !prev);
      if (e.key === 'l') handleLike(reels[currentIndex]?.id);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels, scrollToIndex]);

  // Like a reel
  const handleLike = async (reelId) => {
    if (!reelId) return;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`${backendUrl}/api/clips/${reelId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReels(prev => prev.map(r => 
          r.id === reelId 
            ? { ...r, likes: data.likes, is_liked: data.is_liked } 
            : r
        ));
      }
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  // Share a reel
  const handleShare = async (reel) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: `Check out this reel by ${reel.creator?.username} on StreamPireX`,
          url: `${window.location.origin}/reels/${reel.id}`
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/reels/${reel.id}`);
    }
  };

  // Toggle play/pause on tap
  const handleVideoTap = (index) => {
    const video = videoRefs.current[index];
    if (!video) return;
    
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  // Format counts
  const formatCount = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && reels.length === 0) {
    return (
      <div className="reels-loading">
        <div className="reels-spinner"></div>
        <p>Loading Reels...</p>
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="reels-empty">
        <div className="reels-empty-icon">🎬</div>
        <h2>No Reels Yet</h2>
        <p>Be the first to upload a reel!</p>
        <button className="upload-reel-btn" onClick={() => navigate('/upload-reel')}>
          Upload Reel
        </button>
      </div>
    );
  }

  return (
    <div className="reels-page">
      {/* Feed Type Tabs */}
      <div className="reels-feed-tabs">
        <button 
          className={`reels-tab ${feedType === 'following' ? 'active' : ''}`}
          onClick={() => setFeedType('following')}
        >
          Following
        </button>
        <button 
          className={`reels-tab ${feedType === 'foryou' ? 'active' : ''}`}
          onClick={() => setFeedType('foryou')}
        >
          For You
        </button>
        <button 
          className={`reels-tab ${feedType === 'trending' ? 'active' : ''}`}
          onClick={() => setFeedType('trending')}
        >
          Trending
        </button>
      </div>

      {/* Upload Button */}
      <button 
        className="reels-upload-fab" 
        onClick={() => navigate('/upload-reel')}
        title="Upload Reel"
      >
        +
      </button>

      {/* Mute Toggle */}
      <button 
        className="reels-mute-btn"
        onClick={() => setMuted(prev => !prev)}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Vertical Scroll Container */}
      <div 
        className="reels-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {reels.map((reel, index) => (
          <div 
            key={reel.id} 
            className={`reel-item ${index === currentIndex ? 'active' : ''}`}
            style={{ height: '100vh' }}
          >
            {/* Video */}
            <video
              ref={el => videoRefs.current[index] = el}
              src={reel.video_url}
              className="reel-video"
              loop
              playsInline
              muted={muted}
              poster={reel.thumbnail_url}
              onClick={() => handleVideoTap(index)}
              preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'none'}
            />

            {/* Progress Bar */}
            <ReelProgressBar 
              videoRef={videoRefs.current[index]} 
              isActive={index === currentIndex} 
            />

            {/* Right Side Actions */}
            <div className="reel-actions">
              {/* Creator Avatar */}
              <div 
                className="reel-action-item avatar-action"
                onClick={() => navigate(`/user/${reel.creator?.id || reel.user_id}`)}
              >
                <img 
                  src={reel.creator?.profile_picture || '/default-avatar.png'}
                  alt={reel.creator?.username}
                  className="reel-creator-avatar"
                />
              </div>

              {/* Like */}
              <div 
                className={`reel-action-item ${reel.is_liked ? 'liked' : ''}`}
                onClick={() => handleLike(reel.id)}
              >
                <span className="action-icon">{reel.is_liked ? '❤️' : '🤍'}</span>
                <span className="action-count">{formatCount(reel.likes)}</span>
              </div>

              {/* Comment */}
              <div 
                className="reel-action-item"
                onClick={() => navigate(`/reels/${reel.id}?comments=true`)}
              >
                <span className="action-icon">💬</span>
                <span className="action-count">{formatCount(reel.comments)}</span>
              </div>

              {/* Share */}
              <div 
                className="reel-action-item"
                onClick={() => handleShare(reel)}
              >
                <span className="action-icon">↗️</span>
                <span className="action-count">{formatCount(reel.shares)}</span>
              </div>

              {/* More Options */}
              <div className="reel-action-item">
                <span className="action-icon">⋯</span>
              </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="reel-info-overlay">
              <div 
                className="reel-creator-info"
                onClick={() => navigate(`/user/${reel.creator?.id || reel.user_id}`)}
              >
                <span className="reel-creator-name">
                  @{reel.creator?.username || 'unknown'}
                </span>
                {reel.creator?.id !== store.user?.id && (
                  <button 
                    className="reel-follow-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Follow logic
                    }}
                  >
                    Follow
                  </button>
                )}
              </div>
              
              {reel.title && (
                <p className="reel-title">{reel.title}</p>
              )}
              
              {reel.description && (
                <p className="reel-description">
                  {reel.description.length > 100 
                    ? `${reel.description.substring(0, 100)}...` 
                    : reel.description
                  }
                </p>
              )}

              {reel.tags && reel.tags.length > 0 && (
                <div className="reel-tags">
                  {reel.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="reel-tag">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="reel-meta">
                <span>{formatDuration(reel.duration)}</span>
                <span>•</span>
                <span>{formatCount(reel.views)} views</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Progress Bar Sub-component
// =============================================================================

const ReelProgressBar = ({ videoRef, isActive }) => {
  const [progress, setProgress] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    if (!isActive || !videoRef) {
      setProgress(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const update = () => {
      if (videoRef && videoRef.duration) {
        setProgress((videoRef.currentTime / videoRef.duration) * 100);
      }
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [videoRef, isActive]);

  return (
    <div className="reel-progress-bar">
      <div 
        className="reel-progress-fill" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReelsFeed;