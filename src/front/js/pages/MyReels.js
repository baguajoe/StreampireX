// =============================================================================
// MyReels.js — User's Uploaded Reels Management Page
// =============================================================================
// Route: /my-reels
// Features: Grid view of user's reels, delete, toggle visibility, stats
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/MyReels.css';

const MyReels = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  const fetchMyReels = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch(
        `${backendUrl}/api/reels/my?page=${pageNum}&per_page=20`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setReels(data.reels || []);
        setTotal(data.total || 0);
        setHasMore(data.has_next || false);
      }
    } catch (e) {
      console.error('Failed to fetch reels:', e);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, navigate]);

  useEffect(() => {
    fetchMyReels(page);
  }, [page, fetchMyReels]);

  const handleDelete = async (reelId) => {
    setActionLoading(reelId);
    try {
      const token = getToken();
      const res = await fetch(`${backendUrl}/api/reels/${reelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReels(prev => prev.filter(r => r.id !== reelId));
        setTotal(prev => prev - 1);
        setDeleteConfirm(null);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
    setActionLoading(null);
  };

  const toggleVisibility = async (reelId) => {
    setActionLoading(reelId);
    try {
      const token = getToken();
      const res = await fetch(`${backendUrl}/api/reels/${reelId}/toggle-visibility`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReels(prev => prev.map(r =>
          r.id === reelId ? { ...r, is_public: data.is_public } : r
        ));
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
    setActionLoading(null);
  };

  const formatCount = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  if (loading && reels.length === 0) {
    return (
      <div className="my-reels-page">
        <div className="my-reels-loading">
          <div className="my-reels-spinner" />
          <p>Loading your reels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-reels-page">
      {/* Header */}
      <div className="my-reels-header">
        <div className="my-reels-header-left">
          <h1>My Reels</h1>
          <span className="my-reels-count">{total} reel{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="my-reels-header-actions">
          <button className="my-reels-browse-btn" onClick={() => navigate('/reels')}>
            🎬 Browse Reels
          </button>
          <button className="my-reels-upload-btn" onClick={() => navigate('/upload-reel')}>
            + Upload Reel
          </button>
        </div>
      </div>

      {/* Empty State */}
      {reels.length === 0 && !loading && (
        <div className="my-reels-empty">
          <div className="my-reels-empty-icon">🎬</div>
          <h2>No Reels Yet</h2>
          <p>Upload your first short-form video and share it with the world!</p>
          <button className="my-reels-upload-btn large" onClick={() => navigate('/upload-reel')}>
            + Upload Your First Reel
          </button>
        </div>
      )}

      {/* Reels Grid */}
      {reels.length > 0 && (
        <div className="my-reels-grid">
          {reels.map(reel => (
            <div key={reel.id} className="my-reel-card">
              {/* Thumbnail / Video Preview */}
              <div
                className="my-reel-thumbnail"
                onClick={() => navigate(`/reels/${reel.id}`)}
              >
                {reel.thumbnail_url ? (
                  <img src={reel.thumbnail_url} alt={reel.title} />
                ) : reel.video_url ? (
                  <video src={reel.video_url} muted preload="metadata" />
                ) : (
                  <div className="my-reel-placeholder">🎬</div>
                )}

                {/* Duration badge */}
                {reel.duration && (
                  <span className="my-reel-duration">
                    {reel.duration_formatted || `${Math.floor(reel.duration / 60)}:${(reel.duration % 60).toString().padStart(2, '0')}`}
                  </span>
                )}

                {/* Visibility badge */}
                <span className={`my-reel-visibility ${reel.is_public ? 'public' : 'private'}`}>
                  {reel.is_public ? '🌐 Public' : '🔒 Private'}
                </span>

                {/* Play overlay */}
                <div className="my-reel-play-overlay">▶</div>
              </div>

              {/* Info */}
              <div className="my-reel-info">
                <h3 className="my-reel-title">{reel.title || 'Untitled Reel'}</h3>

                {reel.description && (
                  <p className="my-reel-description">
                    {reel.description.length > 80
                      ? `${reel.description.substring(0, 80)}...`
                      : reel.description}
                  </p>
                )}

                {/* Stats Row */}
                <div className="my-reel-stats">
                  <span>👁 {formatCount(reel.views)}</span>
                  <span>❤️ {formatCount(reel.likes)}</span>
                  <span>💬 {formatCount(reel.comments)}</span>
                  <span>↗️ {formatCount(reel.shares)}</span>
                </div>

                {/* Tags */}
                {reel.tags && reel.tags.length > 0 && (
                  <div className="my-reel-tags">
                    {reel.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="my-reel-tag">#{tag}</span>
                    ))}
                  </div>
                )}

                <span className="my-reel-date">{timeAgo(reel.created_at)}</span>

                {/* Actions */}
                <div className="my-reel-actions">
                  <button
                    className="my-reel-action-btn visibility"
                    onClick={() => toggleVisibility(reel.id)}
                    disabled={actionLoading === reel.id}
                  >
                    {reel.is_public ? '🔒 Make Private' : '🌐 Make Public'}
                  </button>
                  <button
                    className="my-reel-action-btn delete"
                    onClick={() => setDeleteConfirm(reel.id)}
                    disabled={actionLoading === reel.id}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="my-reels-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Previous
          </button>
          <span>Page {page}</span>
          <button
            disabled={!hasMore}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="my-reels-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="my-reels-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Reel?</h3>
            <p>This action cannot be undone. The reel will be permanently removed.</p>
            <div className="my-reels-modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="modal-delete"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === deleteConfirm}
              >
                {actionLoading === deleteConfirm ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReels;