import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TipJar from "../component/TipJar";
import "../../styles/PodcastDetailPage.css";

const PodcastDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [audioRef, setAudioRef] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendUrl = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem("token");

        if (!backendUrl) {
          throw new Error("Backend URL not configured");
        }

        // Fetch podcast details
        const podcastRes = await fetch(`${backendUrl}/api/podcasts/${id}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "application/json"
          }
        });

        if (!podcastRes.ok) {
          throw new Error("Podcast not found");
        }

        const podcastData = await podcastRes.json();
        setPodcast(podcastData);

        // Fetch episodes
        const episodesRes = await fetch(`${backendUrl}/api/podcast/${id}/episodes`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            "Content-Type": "application/json"
          }
        });

        if (episodesRes.ok) {
          const episodesData = await episodesRes.json();
          setEpisodes(Array.isArray(episodesData) ? episodesData : episodesData.episodes || []);
        }

      } catch (err) {
        console.error("Error fetching podcast:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPodcast();
    }

    // Cleanup audio on unmount
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const getEpisodeUrl = (episode) => {
    return episode.file_url || episode.audio_url || episode.video_url || episode.stream_url || null;
  };

  const isVideoEpisode = (episode) => {
    // Check if episode has video_url or if title/type indicates video
    return episode.video_url || 
           episode.type === 'video' || 
           (episode.title && episode.title.toLowerCase().includes('video'));
  };

  const getVideoUrl = (episode) => {
    return episode.video_url || episode.file_url || episode.stream_url || null;
  };

  const togglePlay = (episodeId, episode) => {
    const fileUrl = getEpisodeUrl(episode);
    
    if (!fileUrl) {
      console.error("No media URL available for this episode");
      alert("No media file available for this episode");
      return;
    }

    // Check if this is a video episode
    if (isVideoEpisode(episode)) {
      const videoUrl = getVideoUrl(episode);
      if (videoUrl) {
        // Stop any playing audio
        if (audioRef) {
          audioRef.pause();
        }
        setIsPlaying(false);
        
        // Show video player
        setCurrentVideoUrl(videoUrl);
        setShowVideoPlayer(true);
        setCurrentPlaying(episodeId);
        return;
      }
    }

    // Audio playback
    if (currentPlaying === episodeId && isPlaying) {
      if (audioRef) {
        audioRef.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef) {
        audioRef.pause();
      }
      // Close video player if open
      setShowVideoPlayer(false);
      setCurrentVideoUrl(null);
      
      const newAudio = new Audio(fileUrl);
      
      newAudio.play().catch(err => {
        console.error("Error playing audio:", err);
        alert("Unable to play this episode. The audio file may be unavailable.");
      });
      
      setAudioRef(newAudio);
      setCurrentPlaying(episodeId);
      setIsPlaying(true);

      newAudio.onended = () => {
        setIsPlaying(false);
        setCurrentPlaying(null);
      };

      newAudio.onerror = () => {
        console.error("Audio error");
        setIsPlaying(false);
        setCurrentPlaying(null);
      };
    }
  };

  const closeVideoPlayer = () => {
    setShowVideoPlayer(false);
    setCurrentVideoUrl(null);
    setCurrentPlaying(null);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (token && backendUrl) {
        await fetch(`${backendUrl}/api/podcast/${id}/like`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
      setLiked(!liked);
    } catch (err) {
      console.error("Error liking podcast:", err);
      setLiked(!liked);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: podcast?.title,
        text: podcast?.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleSubscribe = async () => {
    try {
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${backendUrl}/api/podcast/${id}/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        alert("Subscribed successfully!");
      }
    } catch (err) {
      console.error("Error subscribing:", err);
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "00:00";
    if (typeof duration === "string" && duration.includes(":")) return duration;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="podcast-detail-container">
        <div className="loading-state">
          <div className="loading-icon">🎧</div>
          <p>Loading podcast...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="podcast-detail-container">
        <div className="error-state">
          <div className="error-icon">😕</div>
          <h2>Podcast Not Found</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="back-button">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // No podcast found
  if (!podcast) {
    return (
      <div className="podcast-detail-container">
        <div className="error-state">
          <div className="error-icon">🎧</div>
          <p>Podcast not available</p>
          <button onClick={handleBack} className="back-button">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="podcast-detail-container">
      {/* Header */}
      <div className="podcast-detail-header">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
      </div>

      {/* Podcast Info */}
      <div className="podcast-detail-content">
        <div className="podcast-info">
          <div className="podcast-image-wrapper">
            {(podcast.cover_art_url || podcast.cover_image_url) ? (
              <img
                src={podcast.cover_art_url || podcast.cover_image_url}
                alt={podcast.title}
                className="podcast-detail-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="podcast-image-placeholder" 
              style={{ display: (podcast.cover_art_url || podcast.cover_image_url) ? 'none' : 'flex' }}
            >
              <span className="placeholder-icon">🎙️</span>
              <span className="placeholder-text">{podcast.title?.substring(0, 2).toUpperCase() || 'PD'}</span>
            </div>
          </div>

          <div className="podcast-meta">
            <span className="podcast-category">{podcast.category || "Podcast"}</span>
            <h1 className="podcast-title">{podcast.title}</h1>
            <p className="podcast-description">
              {podcast.description || "No description available"}
            </p>

            {podcast.host_name && (
              <p className="podcast-host">Hosted by {podcast.host_name}</p>
            )}

            {/* Action Buttons */}
            <div className="podcast-actions">
              <button
                onClick={handleLike}
                className={`action-btn like-btn ${liked ? "liked" : ""}`}
              >
                {liked ? "❤️ Liked" : "🤍 Like"}
              </button>

              <button onClick={handleShare} className="action-btn share-btn">
                🔗 Share
              </button>

              <button onClick={handleSubscribe} className="action-btn subscribe-btn">
                ➕ Subscribe
              </button>

              <TipJar
                creatorId={podcast.user_id || podcast.creator_id}
                creatorName={podcast.host_name || podcast.creator_name || podcast.title}
                contentType="podcast"
                contentId={id}
                buttonStyle="inline"
              />
            </div>

            {/* Stats */}
            <div className="podcast-stats">
              <span>🎧 {episodes.length} Episodes</span>
              {podcast.created_at && (
                <span>📅 Created: {formatDate(podcast.created_at)}</span>
              )}
              {podcast.total_listens > 0 && (
                <span>👂 {podcast.total_listens.toLocaleString()} listens</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && currentVideoUrl && (
        <div className="video-player-overlay">
          <div className="video-player-container">
            <button className="close-video-btn" onClick={closeVideoPlayer}>
              ✕ Close
            </button>
            <video
              ref={videoRef}
              src={currentVideoUrl}
              controls
              autoPlay
              className="video-player"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Episodes Section */}
      <div className="detail-section">
        <h2>Episodes</h2>

        {episodes.length === 0 ? (
          <div className="empty-episodes">
            <p>No episodes available yet</p>
            <span>Check back later for new content!</span>
          </div>
        ) : (
          <ul className="episode-list">
            {episodes.map((episode, index) => {
              const episodeUrl = getEpisodeUrl(episode);
              const isVideo = isVideoEpisode(episode);
              return (
                <li key={episode.id} className="episode-item">
                  <div className="episode-header">
                    <span className="episode-number">#{index + 1}</span>
                    <strong>{episode.title}</strong>
                    {isVideo && <span className="video-badge">🎬 Video</span>}
                  </div>
                  
                  <p>{episode.description || "No description"}</p>
                  
                  <div className="episode-meta">
                    <span>⏱️ {formatDuration(episode.duration)}</span>
                    {episode.uploaded_at && (
                      <span>📅 {formatDate(episode.uploaded_at)}</span>
                    )}
                    {episode.listen_count > 0 && (
                      <span>🎧 {episode.listen_count} plays</span>
                    )}
                  </div>

                  <div className="episode-actions">
                    {episodeUrl ? (
                      <button
                        onClick={() => togglePlay(episode.id, episode)}
                        className="play-button"
                      >
                        {currentPlaying === episode.id && (isPlaying || showVideoPlayer) 
                          ? "⏸️ Pause" 
                          : isVideo ? "🎬 Watch" : "▶️ Play"}
                      </button>
                    ) : (
                      <button className="play-button disabled" disabled>
                        🔇 No Media
                      </button>
                    )}
                    
                    {episodeUrl && (
                      <a
                        href={episodeUrl}
                        download
                        className="play-button download"
                      >
                        ⬇️ Download
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PodcastDetailPage;