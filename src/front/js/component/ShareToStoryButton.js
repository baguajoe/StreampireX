// =============================================================================
// ShareToStoryButton.js - Add to any content for quick story sharing
// =============================================================================
// Drop-in component that adds "Share to Story" functionality to videos, posts, etc.
// Usage: <ShareToStoryButton contentType="video" contentId={video.id} />
// =============================================================================

import React, { useState } from 'react';
import './ShareToStoryButton.css';

const ShareToStoryButton = ({ 
  contentType, 
  contentId, 
  contentTitle,
  thumbnailUrl,
  onShared,
  buttonStyle = 'icon', // 'icon', 'text', 'full'
  className = ''
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  const handleShareClick = (e) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setShowCaptionModal(true);
  };

  const handleShare = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to share to your story');
      return;
    }

    setIsSharing(true);

    try {
      const response = await fetch(`${backendUrl}/api/stories/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          caption: caption
        })
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setShowCaptionModal(false);
        setCaption('');
        
        // Show success briefly then hide
        setTimeout(() => setShowSuccess(false), 2000);
        
        if (onShared) {
          onShared(data.story);
        }
      } else {
        alert(data.error || 'Failed to share to story');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to share to story');
    } finally {
      setIsSharing(false);
    }
  };

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'video': return '🎬';
      case 'track': return '🎵';
      case 'podcast': return '🎙️';
      case 'post': return '📝';
      default: return '📤';
    }
  };

  const renderButton = () => {
    if (buttonStyle === 'icon') {
      return (
        <button 
          className={`share-story-btn icon-only ${className}`}
          onClick={handleShareClick}
          title="Share to Story"
        >
          📤
        </button>
      );
    }

    if (buttonStyle === 'text') {
      return (
        <button 
          className={`share-story-btn text-style ${className}`}
          onClick={handleShareClick}
        >
          📤 Add to Story
        </button>
      );
    }

    // Full style
    return (
      <button 
        className={`share-story-btn full-style ${className}`}
        onClick={handleShareClick}
      >
        <span className="btn-icon">📤</span>
        <span className="btn-text">Share to Story</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Success Toast */}
      {showSuccess && (
        <div className="share-story-toast">
          <span className="toast-icon">✅</span>
          <span className="toast-text">Added to your story!</span>
        </div>
      )}

      {/* Caption Modal */}
      {showCaptionModal && (
        <div className="share-story-modal-overlay" onClick={() => setShowCaptionModal(false)}>
          <div className="share-story-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{getContentTypeIcon()} Share to Your Story</h3>
              <button className="close-btn" onClick={() => setShowCaptionModal(false)}>✕</button>
            </div>

            <div className="modal-preview">
              {thumbnailUrl && (
                <img 
                  src={thumbnailUrl} 
                  alt="Content preview" 
                  className="preview-thumbnail"
                />
              )}
              <div className="preview-info">
                <span className="content-type-badge">{contentType}</span>
                {contentTitle && <p className="content-title">{contentTitle}</p>}
              </div>
            </div>

            <div className="modal-caption">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption to your story... (optional)"
                maxLength={200}
                rows={3}
              />
              <span className="char-count">{caption.length}/200</span>
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowCaptionModal(false)}
              >
                Cancel
              </button>
              <button 
                className="share-btn"
                onClick={handleShare}
                disabled={isSharing}
              >
                {isSharing ? (
                  <>
                    <span className="spinner"></span>
                    Sharing...
                  </>
                ) : (
                  <>📤 Share to Story</>
                )}
              </button>
            </div>

            <div className="modal-footer">
              <p>🕐 Your story will be visible for 24 hours</p>
              <p>👀 Viewers can tap to see the original {contentType}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareToStoryButton;