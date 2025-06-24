import React, { memo } from "react";
import { Link } from "react-router-dom";

const VideoCard = memo(({ 
  video, 
  onLike, 
  onView, 
  onShare, 
  formatDuration 
}) => {
  const handleVideoPlay = () => {
    onView(video.id);
  };

  const handleLikeClick = () => {
    onLike(video.id);
  };

  const handleShareClick = () => {
    onShare(video);
  };

  const handleAvatarError = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <div className="video-card">
      <div className="video-wrapper">
        <video
          src={video.file_url}
          controls
          preload="metadata"
          className="video-player"
          onPlay={handleVideoPlay}
          poster={video.thumbnail_url}
        />

        {/* Video duration overlay */}
        {video.duration && (
          <div className="video-duration">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      <div className="video-info">
        <h4 className="video-title" title={video.title}>
          {video.title || "Untitled"}
        </h4>

        <div className="video-meta">
          <Link
            to={`/user/${video.uploader_id}`}
            className="uploader-link"
          >
            {video.uploader_avatar && (
              <img
                src={video.uploader_avatar}
                alt={video.uploader_name}
                className="uploader-avatar"
                onError={handleAvatarError}
              />
            )}
            <span className="uploader-name">
              {video.uploader_name || "Unknown"}
            </span>
          </Link>
        </div>

        <div className="video-stats">
          {video.views !== undefined && (
            <span className="views">
              👁️ {video.views.toLocaleString()} views
            </span>
          )}
          <span className="upload-date">
            📅 {new Date(video.created_at).toLocaleDateString()}
          </span>
        </div>

        {video.description && (
          <p className="video-description" title={video.description}>
            {video.description.length > 100
              ? `${video.description.substring(0, 100)}...`
              : video.description}
          </p>
        )}

        {video.category && video.category !== "Other" && (
          <div className="video-category">
            <span className="category-tag">
              🏷️ {video.category}
            </span>
          </div>
        )}

        <div className="video-actions">
          <button
            onClick={handleLikeClick}
            className="like-btn"
            title="Like this video"
          >
            👍 {(video.likes || 0).toLocaleString()}
          </button>

          {video.comments_count !== undefined && (
            <button className="comment-btn" title="View comments">
              💬 {video.comments_count.toLocaleString()}
            </button>
          )}

          <button
            onClick={handleShareClick}
            className="share-btn"
            title="Share this video"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;