import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/AlbumDetailPage.css";

const AlbumDetailPage = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { store } = useContext(Context);
  
  // Album data state
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [artist, setArtist] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Player state
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  
  // Audio element ref
  const audioRef = React.useRef(null);

  useEffect(() => {
    if (albumId) {
      fetchAlbumData();
    }
  }, [albumId]);

  const fetchAlbumData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json"
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Fetch album details
      const albumResponse = await fetch(`${process.env.BACKEND_URL}/api/albums/${albumId}`, {
        headers
      });

      if (!albumResponse.ok) {
        throw new Error("Album not found");
      }

      const albumData = await albumResponse.json();
      setAlbum(albumData);

      // Fetch album tracks
      const tracksResponse = await fetch(`${process.env.BACKEND_URL}/api/albums/${albumId}/tracks`, {
        headers
      });

      if (tracksResponse.ok) {
        const tracksData = await tracksResponse.json();
        setTracks(tracksData);
      }

      // Fetch artist info
      if (albumData.artist_id) {
        const artistResponse = await fetch(`${process.env.BACKEND_URL}/api/artists/${albumData.artist_id}`, {
          headers
        });

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          setArtist(artistData);
        }
      }

      // Check if album is liked by user
      if (token) {
        const likeResponse = await fetch(`${process.env.BACKEND_URL}/api/albums/${albumId}/like-status`, {
          headers
        });

        if (likeResponse.ok) {
          const likeData = await likeResponse.json();
          setIsLiked(likeData.is_liked);
        }
      }

    } catch (err) {
      console.error("Error fetching album data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Audio player functions
  const playTrack = (track, index) => {
    if (audioRef.current) {
      if (currentTrack?.id === track.id && isPlaying) {
        // Pause current track
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // Play new track
        setCurrentTrack(track);
        setCurrentTrackIndex(index);
        audioRef.current.src = track.file_url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const playAlbum = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], 0);
    }
  };

  const playNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      const nextIndex = currentTrackIndex + 1;
      playTrack(tracks[nextIndex], nextIndex);
    }
  };

  const playPrevious = () => {
    if (currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      playTrack(tracks[prevIndex], prevIndex);
    }
  };

  const toggleLike = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${process.env.BACKEND_URL}/api/albums/${albumId}/like`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const shareAlbum = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out "${album?.title}" by ${artist?.name || 'Unknown Artist'}`);
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text} ${url}`,
      copy: () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    };

    if (platform === 'copy') {
      shareUrls.copy();
    } else {
      window.open(shareUrls[platform], '_blank');
    }
    
    setShowShareMenu(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTrackEnd = () => {
    playNext();
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const seekTime = percent * duration;
      audioRef.current.currentTime = seekTime;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="album-detail-container">
        <div className="loading-state">
          <div className="loading-spinner">💿</div>
          <h3>Loading album...</h3>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="album-detail-container">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Album Not Found</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="album-detail-container">
        <div className="error-state">
          <h3>Album not found</h3>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="album-detail-container">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
      />

      {/* Album Header */}
      <div className="album-header">
        <div className="album-cover">
          <img
            src={album.cover_image || "/placeholder-album.jpg"}
            alt={album.title}
            className="cover-image"
          />
          <div className="play-overlay">
            <button 
              className="play-album-btn"
              onClick={playAlbum}
              disabled={tracks.length === 0}
            >
              {isPlaying && currentTrack ? "⏸️" : "▶️"}
            </button>
          </div>
        </div>

        <div className="album-info">
          <div className="album-type">Album</div>
          <h1 className="album-title">{album.title}</h1>
          
          {artist && (
            <Link to={`/artist-profile/${artist.id}`} className="artist-link">
              <img 
                src={artist.profile_picture || "/default-avatar.png"} 
                alt={artist.name}
                className="artist-avatar"
              />
              <span className="artist-name">{artist.name}</span>
              {artist.is_verified && <span className="verified-badge">✓</span>}
            </Link>
          )}

          <div className="album-meta">
            <span>{formatDate(album.release_date)}</span>
            <span>•</span>
            <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{formatDuration(tracks.reduce((total, track) => total + (track.duration || 0), 0))}</span>
          </div>

          {album.description && (
            <p className="album-description">{album.description}</p>
          )}
        </div>
      </div>

      {/* Album Actions */}
      <div className="album-actions">
        <button 
          className="action-btn play-btn"
          onClick={playAlbum}
          disabled={tracks.length === 0}
        >
          {isPlaying && currentTrack ? "⏸️ Pause" : "▶️ Play"}
        </button>

        <button 
          className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
          onClick={toggleLike}
        >
          {isLiked ? "❤️" : "🤍"} {isLiked ? "Liked" : "Like"}
        </button>

        <div className="share-dropdown">
          <button 
            className="action-btn share-btn"
            onClick={() => setShowShareMenu(!showShareMenu)}
          >
            📤 Share
          </button>
          
          {showShareMenu && (
            <div className="share-menu">
              <button onClick={() => shareAlbum('twitter')}>🐦 Twitter</button>
              <button onClick={() => shareAlbum('facebook')}>📘 Facebook</button>
              <button onClick={() => shareAlbum('whatsapp')}>💬 WhatsApp</button>
              <button onClick={() => shareAlbum('copy')}>📋 Copy Link</button>
            </div>
          )}
        </div>
      </div>

      {/* Track List */}
      <div className="track-list">
        <div className="track-list-header">
          <h3>Tracks</h3>
        </div>

        {tracks.length > 0 ? (
          <div className="tracks">
            {tracks.map((track, index) => (
              <div 
                key={track.id}
                className={`track-item ${currentTrack?.id === track.id ? 'playing' : ''}`}
                onClick={() => playTrack(track, index)}
              >
                <div className="track-number">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <div className="playing-indicator">🔊</div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  {track.artist_name && track.artist_name !== artist?.name && (
                    <div className="track-artist">{track.artist_name}</div>
                  )}
                </div>

                <div className="track-duration">
                  {formatDuration(track.duration || 0)}
                </div>

                <div className="track-actions">
                  <button 
                    className="track-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add to playlist functionality
                      alert("Add to playlist feature coming soon!");
                    }}
                  >
                    ➕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tracks">
            <p>No tracks available for this album.</p>
          </div>
        )}
      </div>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="now-playing-bar">
          <div className="now-playing-info">
            <img 
              src={album.cover_image || "/placeholder-album.jpg"} 
              alt={currentTrack.title}
              className="now-playing-cover"
            />
            <div>
              <div className="now-playing-title">{currentTrack.title}</div>
              <div className="now-playing-artist">{artist?.name || 'Unknown Artist'}</div>
            </div>
          </div>

          <div className="player-controls">
            <button onClick={playPrevious} disabled={currentTrackIndex === 0}>
              ⏮️
            </button>
            <button onClick={() => playTrack(currentTrack, currentTrackIndex)}>
              {isPlaying ? "⏸️" : "▶️"}
            </button>
            <button onClick={playNext} disabled={currentTrackIndex === tracks.length - 1}>
              ⏭️
            </button>
          </div>

          <div className="progress-section">
            <span className="time-display">{formatDuration(currentTime)}</span>
            <div className="progress-bar" onClick={handleSeek}>
              <div 
                className="progress-fill"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <span className="time-display">{formatDuration(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumDetailPage;