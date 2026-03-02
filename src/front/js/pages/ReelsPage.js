// =============================================================================
// ReelsPage.js — TikTok/YouTube Shorts Style Vertical Video Feed
// =============================================================================
// Route: /reels
// Features: Snap scrolling, like/comment/share overlay, creator info,
//           sound attribution, auto-play, mute toggle, upload FAB
// Backend: /api/reels, /api/reels/:id/like, /api/reels/:id/comment
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ReelsPage.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [likedReels, setLikedReels] = useState({});
  const [commentOpen, setCommentOpen] = useState(null);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const observerRef = useRef(null);

  // ── Load reels ──
  const loadReels = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await fetch(`${BACKEND}/api/reels?page=${pageNum}&per_page=10`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const newReels = data.reels || data.videos || data || [];
        if (Array.isArray(newReels)) {
          setReels(prev => append ? [...prev, ...newReels] : newReels);
          setHasMore(newReels.length >= 10);
        }
      }
    } catch (e) {
      console.error('Failed to load reels:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReels(1); }, [loadReels]);

  // ── Intersection Observer for auto-play ──
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          const idx = parseInt(video.dataset.index, 10);
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setCurrentIndex(idx);
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    Object.values(videoRefs.current).forEach(video => {
      if (video) observerRef.current.observe(video);
    });

    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [reels]);

  // ── Infinite scroll ──
  useEffect(() => {
    if (currentIndex >= reels.length - 3 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadReels(nextPage, true);
    }
  }, [currentIndex, reels.length, hasMore, loading, page, loadReels]);

  // ── Like ──
  const toggleLike = async (reelId) => {
    const wasLiked = likedReels[reelId];
    setLikedReels(prev => ({ ...prev, [reelId]: !wasLiked }));

    // Optimistic update on reel counts
    setReels(prev => prev.map(r => {
      if ((r.id || r.video_id) === reelId) {
        return { ...r, likes_count: (r.likes_count || 0) + (wasLiked ? -1 : 1) };
      }
      return r;
    }));

    try {
      await fetch(`${BACKEND}/api/reels/${reelId}/like`, {
        method: 'POST', headers: authHeaders(),
      });
    } catch (e) {
      // Revert on error
      setLikedReels(prev => ({ ...prev, [reelId]: wasLiked }));
    }
  };

  // ── Comments ──
  const loadComments = async (reelId) => {
    try {
      const res = await fetch(`${BACKEND}/api/reels/${reelId}/comments`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({ ...prev, [reelId]: data.comments || data || [] }));
      }
    } catch (e) { /* silent */ }
  };

  const openComments = (reelId) => {
    setCommentOpen(reelId);
    if (!comments[reelId]) loadComments(reelId);
  };

  const submitComment = async (reelId) => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/reels/${reelId}/comments`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({
          ...prev,
          [reelId]: [...(prev[reelId] || []), data.comment || { content: newComment.trim(), created_at: new Date().toISOString(), username: 'You' }],
        }));
        setReels(prev => prev.map(r => {
          if ((r.id || r.video_id) === reelId) {
            return { ...r, comments_count: (r.comments_count || 0) + 1 };
          }
          return r;
        }));
        setNewComment('');
      }
    } catch (e) { /* silent */ }
    setSubmitting(false);
  };

  // ── Share ──
  const shareReel = async (reel) => {
    const reelId = reel.id || reel.video_id;
    const url = `${window.location.origin}/reels/${reelId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reel.title || 'Check this reel!', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch (e) { /* cancelled */ }
  };

  // ── Navigate ──
  const goToReel = useCallback((direction) => {
    const next = currentIndex + direction;
    if (next >= 0 && next < reels.length) {
      const el = document.getElementById(`reel-${next}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentIndex, reels.length]);

  // ── Keyboard navigation: Arrow keys, spacebar, M to mute ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (commentOpen !== null) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); goToReel(1); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); goToReel(-1); }
      if (e.key === 'm') setMuted(prev => !prev);
      if (e.key === ' ') {
        e.preventDefault();
        const v = videoRefs.current[currentIndex];
        if (v) v.paused ? v.play() : v.pause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, commentOpen, goToReel]);

  // ── Format numbers ──
  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // ── Time ago ──
  const timeAgo = (date) => {
    if (!date) return '';
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(date).toLocaleDateString();
  };

  if (loading && reels.length === 0) {
    return (
      <div className="reels-loading">
        <div className="reels-spinner" />
        <span>Loading Reels...</span>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-empty">
        <span className="reels-empty-icon">🎬</span>
        <h3>No Reels Yet</h3>
        <p>Be the first to upload a short-form video!</p>
        <a href="/upload-reel" className="reels-upload-link">+ Upload Reel</a>
      </div>
    );
  }

  return (
    <div className="reels-page">
      {/* Share Toast */}
      {shareToast && <div className="reels-toast">📋 Link copied to clipboard!</div>}

      {/* Reel Feed — Vertical snap scroll */}
      <div className="reels-feed" ref={containerRef}>
        {reels.map((reel, index) => {
          const reelId = reel.id || reel.video_id;
          const isLiked = likedReels[reelId];
          const videoUrl = reel.video_url || reel.url || reel.media_url;
          const thumbnailUrl = reel.thumbnail_url || reel.artwork_url;
          const username = reel.username || reel.creator_name || reel.user?.username || 'Creator';
          const avatar = reel.avatar_url || reel.user?.avatar_url || reel.profile_image;
          const title = reel.title || reel.caption || '';
          const description = reel.description || '';
          const likesCount = reel.likes_count || reel.likes || 0;
          const commentsCount = reel.comments_count || reel.comment_count || 0;
          const viewsCount = reel.views_count || reel.views || 0;
          const soundName = reel.sound_name || reel.audio_name || null;
          const createdAt = reel.created_at || reel.uploaded_at;

          return (
            <div key={reelId || index} id={`reel-${index}`} className="reel-item">
              {/* Video */}
              <video
                ref={el => { videoRefs.current[index] = el; }}
                data-index={index}
                className="reel-video"
                src={videoUrl}
                poster={thumbnailUrl}
                loop
                playsInline
                muted={muted}
                onClick={() => {
                  const v = videoRefs.current[index];
                  if (v) v.paused ? v.play() : v.pause();
                }}
              />

              {/* Gradient overlays */}
              <div className="reel-gradient-top" />
              <div className="reel-gradient-bottom" />

              {/* ── Right side action buttons (YouTube Shorts style) ── */}
              <div className="reel-actions">
                {/* Like */}
                <button
                  className={`reel-action-btn ${isLiked ? 'liked' : ''}`}
                  onClick={() => toggleLike(reelId)}
                >
                  <span className="reel-action-icon">{isLiked ? '❤️' : '🤍'}</span>
                  <span className="reel-action-count">{formatCount(likesCount)}</span>
                </button>

                {/* Comment */}
                <button className="reel-action-btn" onClick={() => openComments(reelId)}>
                  <span className="reel-action-icon">💬</span>
                  <span className="reel-action-count">{formatCount(commentsCount)}</span>
                </button>

                {/* Share */}
                <button className="reel-action-btn" onClick={() => shareReel(reel)}>
                  <span className="reel-action-icon">↗️</span>
                  <span className="reel-action-count">Share</span>
                </button>

                {/* Sound */}
                <button
                  className="reel-action-btn"
                  onClick={() => setMuted(!muted)}
                >
                  <span className="reel-action-icon">{muted ? '🔇' : '🔊'}</span>
                  <span className="reel-action-count">{muted ? 'Muted' : 'Sound'}</span>
                </button>

                {/* More */}
                <button className="reel-action-btn">
                  <span className="reel-action-icon">⋯</span>
                </button>
              </div>

              {/* ── Bottom overlay: Creator info ── */}
              <div className="reel-info">
                <div className="reel-creator">
                  <a href={`/profile/${username}`} className="reel-avatar-link">
                    {avatar ? (
                      <img src={avatar} alt={username} className="reel-avatar" />
                    ) : (
                      <div className="reel-avatar-fallback">
                        {(username || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </a>
                  <a href={`/profile/${username}`} className="reel-username">@{username}</a>
                  <button className="reel-follow-btn">Follow</button>
                </div>

                {title && <p className="reel-title">{title}</p>}
                {description && <p className="reel-description">{description}</p>}

                {soundName && (
                  <div className="reel-sound">
                    <span className="reel-sound-icon">♫</span>
                    <span className="reel-sound-name">{soundName}</span>
                  </div>
                )}

                {viewsCount > 0 && (
                  <span className="reel-views">{formatCount(viewsCount)} views • {timeAgo(createdAt)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Navigation arrows (desktop) ── */}
      <div className="reel-nav">
        <button
          className="reel-nav-btn up"
          onClick={() => goToReel(-1)}
          disabled={currentIndex === 0}
        >
          ▲
        </button>
        <button
          className="reel-nav-btn down"
          onClick={() => goToReel(1)}
          disabled={currentIndex >= reels.length - 1}
        >
          ▼
        </button>
      </div>

      {/* ── Upload FAB ── */}
      <a href="/upload-reel" className="reel-fab" title="Upload Reel">
        <span>+</span>
      </a>

      {/* ── Comment Drawer ── */}
      {commentOpen !== null && (
        <div className="reel-comment-overlay" onClick={() => setCommentOpen(null)}>
          <div className="reel-comment-drawer" onClick={e => e.stopPropagation()}>
            <div className="reel-comment-header">
              <h4>Comments</h4>
              <button className="reel-comment-close" onClick={() => setCommentOpen(null)}>✕</button>
            </div>

            <div className="reel-comment-list">
              {(comments[commentOpen] || []).length === 0 ? (
                <div className="reel-comment-empty">No comments yet. Be the first!</div>
              ) : (
                (comments[commentOpen] || []).map((c, i) => (
                  <div key={c.id || i} className="reel-comment-item">
                    <div className="reel-comment-avatar">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" />
                      ) : (
                        <div className="reel-comment-avatar-fallback">
                          {(c.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="reel-comment-body">
                      <span className="reel-comment-user">{c.username || 'User'}</span>
                      <p className="reel-comment-text">{c.content || c.text || c.message}</p>
                      <span className="reel-comment-time">{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="reel-comment-input-row">
              <input
                type="text"
                className="reel-comment-input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(commentOpen); }}
              />
              <button
                className="reel-comment-send"
                onClick={() => submitComment(commentOpen)}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? '⏳' : '➤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;