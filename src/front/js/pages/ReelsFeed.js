// =============================================================================
// ReelsFeed.js — YouTube Shorts-Style Vertical Swipe Reels Feed
// =============================================================================
// Location: src/front/js/pages/ReelsFeed.js
// Features: Full-screen vertical scroll, auto-play, like/dislike/comment/share,
//           comment drawer, share sheet, remix, download, subscribe,
//           discovery feed tabs, creator info overlay, progress bar,
//           swipe gestures, keyboard nav, infinite scroll
// =============================================================================

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/ReelsFeed.css';

const MAX_REEL_DURATION = 180;

const ReelsFeed = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('foryou');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [muted, setMuted] = useState(false);

  // Comment Drawer
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentDrawerReelId, setCommentDrawerReelId] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Share Sheet
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSheetReel, setShareSheetReel] = useState(null);
  const [shareToast, setShareToast] = useState('');

  // More Options Menu
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuReelId, setMoreMenuReelId] = useState(null);

  // Double-tap like animation
  const [doubleTapHeart, setDoubleTapHeart] = useState(null);
  const lastTapRef = useRef(0);

  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartRef = useRef({ y: 0, x: 0, time: 0 });
  const isScrollingRef = useRef(false);
  const commentInputRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  // ══════════════════════════════════════════════════════════════
  // FETCH REELS
  // ══════════════════════════════════════════════════════════════

  const fetchReels = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const token = getToken();

      const response = await fetch(
        `${backendUrl}/api/reels/feed?type=${feedType}&page=${pageNum}&per_page=10`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
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

  // ══════════════════════════════════════════════════════════════
  // AUTO-PLAY / PAUSE
  // ══════════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════════
  // INFINITE SCROLL (with guard)
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (reels.length > 0 && currentIndex >= reels.length - 3 && hasMore && !loading) {
      setLoading(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, true);
    }
  }, [currentIndex, reels.length, hasMore, loading, page, fetchReels]);

  // ══════════════════════════════════════════════════════════════
  // RECORD VIEW
  // ══════════════════════════════════════════════════════════════

  const recordView = useCallback(async (reelId) => {
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${backendUrl}/api/clips/${reelId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) { /* silent */ }
  }, [backendUrl]);

  useEffect(() => {
    if (reels[currentIndex]) {
      recordView(reels[currentIndex].id);
    }
  }, [currentIndex, reels, recordView]);

  // ══════════════════════════════════════════════════════════════
  // SCROLL / SWIPE
  // ══════════════════════════════════════════════════════════════

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

    setTimeout(() => { isScrollingRef.current = false; }, 400);
  }, [reels.length]);

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      y: e.touches[0].clientY,
      x: e.touches[0].clientX,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (commentDrawerOpen || shareSheetOpen) return;

    const deltaY = touchStartRef.current.y - e.changedTouches[0].clientY;
    const deltaX = touchStartRef.current.x - e.changedTouches[0].clientX;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Horizontal swipe — left swipe opens comments
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
      if (deltaX > 0) {
        const reel = reels[currentIndex];
        if (reel) openCommentDrawer(reel.id);
      }
      return;
    }

    // Vertical swipe
    if (Math.abs(deltaY) > 50 || velocityY > 0.5) {
      if (deltaY > 0) {
        scrollToIndex(currentIndex + 1);
      } else {
        scrollToIndex(currentIndex - 1);
      }
    }
  };

  // Wheel (desktop)
  const handleWheel = useCallback((e) => {
    if (commentDrawerOpen || shareSheetOpen) return;
    e.preventDefault();
    if (isScrollingRef.current) return;

    if (e.deltaY > 30) scrollToIndex(currentIndex + 1);
    else if (e.deltaY < -30) scrollToIndex(currentIndex - 1);
  }, [currentIndex, scrollToIndex, commentDrawerOpen, shareSheetOpen]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (commentDrawerOpen) {
        if (e.key === 'Escape') setCommentDrawerOpen(false);
        return;
      }
      if (shareSheetOpen) {
        if (e.key === 'Escape') setShareSheetOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'j') scrollToIndex(currentIndex + 1);
      if (e.key === 'ArrowUp' || e.key === 'k') scrollToIndex(currentIndex - 1);
      if (e.key === 'm') setMuted(prev => !prev);
      if (e.key === 'l') handleLike(reels[currentIndex]?.id);
      if (e.key === 'c') {
        const reel = reels[currentIndex];
        if (reel) openCommentDrawer(reel.id);
      }
      if (e.key === ' ') {
        e.preventDefault();
        const v = videoRefs.current[currentIndex];
        if (v) v.paused ? v.play() : v.pause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels, scrollToIndex, commentDrawerOpen, shareSheetOpen]);

  // ══════════════════════════════════════════════════════════════
  // DOUBLE-TAP TO LIKE
  // ══════════════════════════════════════════════════════════════

  const handleVideoTap = (index, e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap = like + heart animation
      const reel = reels[index];
      if (reel && !reel.is_liked) {
        handleLike(reel.id);
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setDoubleTapHeart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: Date.now()
      });
      setTimeout(() => setDoubleTapHeart(null), 800);
    } else {
      // Single tap = play/pause (delayed)
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= DOUBLE_TAP_DELAY) {
          const video = videoRefs.current[index];
          if (video) video.paused ? video.play() : video.pause();
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
  };

  // ══════════════════════════════════════════════════════════════
  // LIKE / DISLIKE
  // ══════════════════════════════════════════════════════════════

  const handleLike = async (reelId) => {
    if (!reelId) return;
    setReels(prev => prev.map(r =>
      r.id === reelId
        ? { ...r, is_liked: !r.is_liked, likes: (r.likes || 0) + (r.is_liked ? -1 : 1), is_disliked: false }
        : r
    ));
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${backendUrl}/api/clips/${reelId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReels(prev => prev.map(r =>
          r.id === reelId ? { ...r, likes: data.likes, is_liked: data.is_liked } : r
        ));
      }
    } catch (error) {
      console.error('Error liking reel:', error);
    }
  };

  const handleDislike = async (reelId) => {
    if (!reelId) return;
    setReels(prev => prev.map(r =>
      r.id === reelId
        ? { ...r, is_disliked: !r.is_disliked, is_liked: false }
        : r
    ));
    try {
      const token = getToken();
      if (!token) return;
      await fetch(`${backendUrl}/api/clips/${reelId}/dislike`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) { /* silent */ }
  };

  // ══════════════════════════════════════════════════════════════
  // COMMENTS
  // ══════════════════════════════════════════════════════════════

  const openCommentDrawer = (reelId) => {
    setCommentDrawerReelId(reelId);
    setCommentDrawerOpen(true);
    if (!comments[reelId]) fetchComments(reelId);
    setTimeout(() => commentInputRef.current?.focus(), 300);
  };

  const fetchComments = async (reelId) => {
    setLoadingComments(true);
    try {
      const token = getToken();
      const res = await fetch(`${backendUrl}/api/clips/${reelId}/comments`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({ ...prev, [reelId]: data.comments || data || [] }));
      }
    } catch (e) { /* silent */ }
    setLoadingComments(false);
  };

  const submitComment = async () => {
    if (!newComment.trim() || submittingComment || !commentDrawerReelId) return;
    setSubmittingComment(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${backendUrl}/api/clips/${commentDrawerReelId}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        const newCommentObj = data.comment || {
          content: newComment.trim(),
          created_at: new Date().toISOString(),
          username: store.user?.username || 'You',
          avatar_url: store.user?.profile_picture
        };
        setComments(prev => ({
          ...prev,
          [commentDrawerReelId]: [...(prev[commentDrawerReelId] || []), newCommentObj]
        }));
        setReels(prev => prev.map(r =>
          r.id === commentDrawerReelId
            ? { ...r, comments: (r.comments || 0) + 1 }
            : r
        ));
        setNewComment('');
      }
    } catch (e) { /* silent */ }
    setSubmittingComment(false);
  };

  // ══════════════════════════════════════════════════════════════
  // SHARE SHEET
  // ══════════════════════════════════════════════════════════════

  const openShareSheet = (reel) => {
    setShareSheetReel(reel);
    setShareSheetOpen(true);
  };

  const handleShareAction = async (action) => {
    if (!shareSheetReel) return;
    const url = `${window.location.origin}/reels/${shareSheetReel.id}`;
    const title = shareSheetReel.title || 'Check out this reel on StreamPireX!';

    switch (action) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          showToast('📋 Link copied!');
        } catch (e) { /* silent */ }
        break;
      case 'native':
        try { await navigator.share({ title, url }); } catch (e) { /* cancelled */ }
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`, '_blank');
        break;
      default: break;
    }
    setShareSheetOpen(false);
  };

  const showToast = (msg) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(''), 2500);
  };

  // ══════════════════════════════════════════════════════════════
  // FOLLOW / SUBSCRIBE
  // ══════════════════════════════════════════════════════════════

  const handleFollow = async (userId, e) => {
    e?.stopPropagation();
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${backendUrl}/api/follow/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReels(prev => prev.map(r =>
          (r.creator?.id === userId || r.user_id === userId)
            ? { ...r, is_following: data.is_following ?? !r.is_following }
            : r
        ));
      }
    } catch (e) { /* silent */ }
  };

  // ══════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════

  const formatCount = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // ══════════════════════════════════════════════════════════════
  // LOADING / EMPTY STATES
  // ══════════════════════════════════════════════════════════════

  if (loading && reels.length === 0) {
    return (
      <div className="reels-loading">
        <div className="reels-spinner" />
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

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="reels-page">

      {/* Toast */}
      {shareToast && <div className="reels-share-toast">{shareToast}</div>}

      {/* Back Button */}
      <button className="reels-back-btn" onClick={() => navigate(-1)} title="Back">
        ←
      </button>

      {/* Feed Type Tabs */}
      <div className="reels-feed-tabs">
        {['following', 'foryou', 'trending'].map(type => (
          <button
            key={type}
            className={`reels-tab ${feedType === type ? 'active' : ''}`}
            onClick={() => setFeedType(type)}
          >
            {type === 'foryou' ? 'For You' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Upload FAB */}
      <button className="reels-upload-fab" onClick={() => navigate('/upload-reel')} title="Upload Reel">
        <span className="fab-plus">+</span>
      </button>

      {/* Mute Toggle */}
      <button className="reels-mute-btn" onClick={() => setMuted(prev => !prev)}>
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
              onClick={(e) => handleVideoTap(index, e)}
              preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'none'}
            />

            {/* Double-tap heart */}
            {doubleTapHeart && index === currentIndex && (
              <div
                className="double-tap-heart"
                style={{ left: doubleTapHeart.x, top: doubleTapHeart.y }}
                key={doubleTapHeart.id}
              >
                ❤️
              </div>
            )}

            {/* Progress Bar */}
            <ReelProgressBar
              videoRef={videoRefs.current[index]}
              isActive={index === currentIndex}
            />

            {/* Right Side Actions (YouTube Shorts style) */}
            <div className="reel-actions">

              {/* Creator Avatar + Subscribe badge */}
              <div className="reel-action-item avatar-action">
                <div
                  className="reel-avatar-wrapper"
                  onClick={() => navigate(`/user/${reel.creator?.id || reel.user_id}`)}
                >
                  <img
                    src={reel.creator?.profile_picture || '/default-avatar.png'}
                    alt={reel.creator?.username}
                    className="reel-creator-avatar"
                  />
                  {reel.creator?.id !== store.user?.id && !reel.is_following && (
                    <button
                      className="avatar-subscribe-badge"
                      onClick={(e) => handleFollow(reel.creator?.id || reel.user_id, e)}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Like */}
              <div
                className={`reel-action-item ${reel.is_liked ? 'liked' : ''}`}
                onClick={() => handleLike(reel.id)}
              >
                <span className="action-icon">{reel.is_liked ? '👍' : '👍'}</span>
                <span className="action-count">{formatCount(reel.likes)}</span>
              </div>

              {/* Dislike */}
              <div
                className={`reel-action-item ${reel.is_disliked ? 'disliked' : ''}`}
                onClick={() => handleDislike(reel.id)}
              >
                <span className="action-icon">👎</span>
                <span className="action-count">Dislike</span>
              </div>

              {/* Comment */}
              <div className="reel-action-item" onClick={() => openCommentDrawer(reel.id)}>
                <span className="action-icon">💬</span>
                <span className="action-count">{formatCount(reel.comments)}</span>
              </div>

              {/* Share */}
              <div className="reel-action-item" onClick={() => openShareSheet(reel)}>
                <span className="action-icon">↗️</span>
                <span className="action-count">Share</span>
              </div>

              {/* Remix */}
              <div className="reel-action-item" onClick={() => navigate(`/create-clip?source=${reel.id}`)}>
                <span className="action-icon">🔄</span>
                <span className="action-count">Remix</span>
              </div>

              {/* More */}
              <div className="reel-action-item" onClick={() => { setMoreMenuReelId(reel.id); setMoreMenuOpen(true); }}>
                <span className="action-icon">⋯</span>
              </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="reel-info-overlay">
              <div
                className="reel-creator-info"
                onClick={() => navigate(`/user/${reel.creator?.id || reel.user_id}`)}
              >
                <span className="reel-creator-name">@{reel.creator?.username || 'unknown'}</span>
                {reel.creator?.id !== store.user?.id && (
                  <button
                    className={`reel-follow-btn ${reel.is_following ? 'following' : ''}`}
                    onClick={(e) => handleFollow(reel.creator?.id || reel.user_id, e)}
                  >
                    {reel.is_following ? 'Following' : 'Subscribe'}
                  </button>
                )}
              </div>

              {reel.title && <p className="reel-title">{reel.title}</p>}

              {reel.description && (
                <p className="reel-description">
                  {reel.description.length > 100
                    ? `${reel.description.substring(0, 100)}...`
                    : reel.description}
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
                {reel.created_at && (
                  <>
                    <span>•</span>
                    <span>{timeAgo(reel.created_at)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* COMMENT DRAWER                                          */}
      {/* ════════════════════════════════════════════════════════ */}
      {commentDrawerOpen && (
        <div className="comment-overlay" onClick={() => setCommentDrawerOpen(false)}>
          <div className="comment-drawer" onClick={e => e.stopPropagation()}>

            <div className="comment-drawer-header">
              <h3>Comments</h3>
              <span className="comment-count-label">
                {comments[commentDrawerReelId]?.length || 0}
              </span>
              <button className="comment-close-btn" onClick={() => setCommentDrawerOpen(false)}>✕</button>
            </div>

            <div className="comment-list">
              {loadingComments ? (
                <div className="comment-loading">
                  <div className="reels-spinner small" />
                  <span>Loading comments...</span>
                </div>
              ) : (comments[commentDrawerReelId] || []).length === 0 ? (
                <div className="comment-empty">
                  <span className="comment-empty-icon">💬</span>
                  <p>No comments yet</p>
                  <p className="comment-empty-hint">Be the first to comment!</p>
                </div>
              ) : (
                (comments[commentDrawerReelId] || []).map((c, i) => (
                  <div key={c.id || i} className="comment-item">
                    <div className="comment-avatar">
                      {c.avatar_url || c.profile_picture ? (
                        <img src={c.avatar_url || c.profile_picture} alt="" />
                      ) : (
                        <div className="comment-avatar-fallback">
                          {(c.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="comment-body">
                      <div className="comment-meta-row">
                        <span className="comment-username">{c.username || 'User'}</span>
                        <span className="comment-time">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="comment-text">{c.content || c.text || c.message}</p>
                      <div className="comment-actions-row">
                        <button className="comment-action-btn">👍 {c.likes || ''}</button>
                        <button className="comment-action-btn">👎</button>
                        <button className="comment-action-btn">Reply</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="comment-input-row">
              <div className="comment-input-avatar">
                {store.user?.profile_picture ? (
                  <img src={store.user.profile_picture} alt="" />
                ) : (
                  <div className="comment-avatar-fallback small">
                    {(store.user?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <input
                ref={commentInputRef}
                type="text"
                className="comment-input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              />
              <button
                className="comment-send-btn"
                onClick={submitComment}
                disabled={!newComment.trim() || submittingComment}
              >
                {submittingComment ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SHARE SHEET                                              */}
      {/* ════════════════════════════════════════════════════════ */}
      {shareSheetOpen && (
        <div className="share-overlay" onClick={() => setShareSheetOpen(false)}>
          <div className="share-sheet" onClick={e => e.stopPropagation()}>
            <div className="share-sheet-header">
              <h3>Share</h3>
              <button className="share-close-btn" onClick={() => setShareSheetOpen(false)}>✕</button>
            </div>
            <div className="share-options">
              <button className="share-option" onClick={() => handleShareAction('copy')}>
                <span className="share-option-icon">📋</span><span>Copy link</span>
              </button>
              {navigator.share && (
                <button className="share-option" onClick={() => handleShareAction('native')}>
                  <span className="share-option-icon">📱</span><span>Share via...</span>
                </button>
              )}
              <button className="share-option" onClick={() => handleShareAction('twitter')}>
                <span className="share-option-icon">🐦</span><span>Twitter / X</span>
              </button>
              <button className="share-option" onClick={() => handleShareAction('facebook')}>
                <span className="share-option-icon">📘</span><span>Facebook</span>
              </button>
              <button className="share-option" onClick={() => handleShareAction('whatsapp')}>
                <span className="share-option-icon">💬</span><span>WhatsApp</span>
              </button>
              <button className="share-option" onClick={() => handleShareAction('telegram')}>
                <span className="share-option-icon">✈️</span><span>Telegram</span>
              </button>
              <button className="share-option" onClick={() => handleShareAction('email')}>
                <span className="share-option-icon">📧</span><span>Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MORE OPTIONS MENU                                        */}
      {/* ════════════════════════════════════════════════════════ */}
      {moreMenuOpen && (
        <div className="more-menu-overlay" onClick={() => setMoreMenuOpen(false)}>
          <div className="more-menu-sheet" onClick={e => e.stopPropagation()}>
            <div className="share-sheet-header">
              <h3>More</h3>
              <button className="share-close-btn" onClick={() => setMoreMenuOpen(false)}>✕</button>
            </div>
            <div className="share-options">
              <button className="share-option" onClick={() => { showToast('🕐 Saved to Watch Later'); setMoreMenuOpen(false); }}>
                <span className="share-option-icon">🕐</span><span>Save to Watch Later</span>
              </button>
              <button className="share-option" onClick={() => { showToast('📁 Added to Playlist'); setMoreMenuOpen(false); }}>
                <span className="share-option-icon">📁</span><span>Add to Playlist</span>
              </button>
              <button className="share-option" onClick={() => { navigate(`/create-clip?source=${moreMenuReelId}`); setMoreMenuOpen(false); }}>
                <span className="share-option-icon">✂️</span><span>Create Clip</span>
              </button>
              <button className="share-option" onClick={() => { showToast('🚩 Reported'); setMoreMenuOpen(false); }}>
                <span className="share-option-icon">🚩</span><span>Report</span>
              </button>
              <button className="share-option" onClick={() => { showToast('🚫 Not interested — noted'); setMoreMenuOpen(false); }}>
                <span className="share-option-icon">🚫</span><span>Not Interested</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [videoRef, isActive]);

  return (
    <div className="reel-progress-bar">
      <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default ReelsFeed;