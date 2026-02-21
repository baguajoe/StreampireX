import React, { useState, useEffect, useContext, useRef } from "react";
import { Context } from "../store/appContext";
import { Link, useParams } from "react-router-dom";
import UploadTrackModal from "../component/UploadTrackModal";
import TipJar from "../component/TipJar";
import "../../styles/ArtistProfile.css";

const ArtistProfilePage = () => {
  const { store } = useContext(Context);
  const [isArtistMode, setIsArtistMode] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Audio playback state
  const fileInputRef = useRef(null);
  const audioRef = useRef(new Audio());
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // ===== NEW: Album & Playlist creation modal state =====
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [albumForm, setAlbumForm] = useState({ title: '', genre: '', release_date: '', cover_art: null });
  const [playlistForm, setPlaylistForm] = useState({ name: '' });
  const [creating, setCreating] = useState(false);
  // ===== END NEW =====

  // Tab state management
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Backend-connected state
  const [artistInfo, setArtistInfo] = useState({
    artistName: "",
    genre: "",
    bio: "",
    location: "",
    website: "",
    profilePicture: "",
    coverPhoto: "",
    socialLinks: {
      spotify: "",
      apple: "",
      youtube: "",
      instagram: "",
      twitter: ""
    }
  });

  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [monthlyListeners, setMonthlyListeners] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const [artistStats, setArtistStats] = useState({
    totalPlays: 0,
    totalTracks: 0,
    totalAlbums: 0,
    totalFollowers: 0
  });

  const [analytics, setAnalytics] = useState({
    monthlyPlays: 0,
    totalStreams: 0,
    topCountries: [],
    revenueThisMonth: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const { id } = useParams();
  
  // Check if this is the current user's own profile
  // Try multiple possible localStorage keys and ensure string comparison
  const getCurrentUserId = () => {
    // Try different possible keys
    const possibleKeys = ["userId", "user_id", "id"];
    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value) return String(value);
    }
    // Also check if user data is stored as JSON
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return String(parsed.id || parsed.user_id || parsed.userId || "");
      } catch (e) {
        return "";
      }
    }
    return "";
  };
  
  const currentUserId = getCurrentUserId();
  const isOwnProfile = currentUserId && id && String(currentUserId) === String(id);
  
  // Debug log (remove in production)
  console.log("Profile Debug:", { currentUserId, id, isOwnProfile });

  const profileModes = [
    { id: "regular", label: "👤 Regular Profile", path: "/user/" + id },
    { id: "gamer", label: "🎮 Gamer Profile", path: "/profile/gamer" },
    { id: "artist", label: "🎵 Artist Profile", path: "/profile/artist" }
  ];

  // Helper function for safe image URLs
  const getImageUrl = (imageUrl) => {
    if (!imageUrl || imageUrl === "/default-artist-avatar.png" || imageUrl === "/placeholder-album.jpg") {
      return "";
    }
    return imageUrl;
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // BACKEND INTEGRATION - Fetch all artist data
  useEffect(() => {
    fetchArtistData();
  }, [id]);

  // Check if current user is following this artist and block status
  useEffect(() => {
    const checkFollowAndBlockStatus = async () => {
      if (!id || isOwnProfile) return;
      
      try {
        const token = localStorage.getItem("token");
        const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
        
        // Check follow status
        const followResponse = await fetch(`${BACKEND_URL}/api/follow/status/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (followResponse.ok) {
          const data = await followResponse.json();
          setIsFollowing(data.is_following || false);
          setIsBlocked(data.is_blocked || false);
        }
        
        // Check block status separately for more detail
        const blockResponse = await fetch(`${BACKEND_URL}/api/block/status/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (blockResponse.ok) {
          const blockData = await blockResponse.json();
          setIsBlocked(blockData.you_blocked_them || blockData.they_blocked_you || false);
        }
      } catch (err) {
        console.log("Could not check follow/block status:", err);
      }
    };
    
    checkFollowAndBlockStatus();
  }, [id, isOwnProfile]);

  const fetchArtistData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your artist profile");
        setLoading(false);
        return;
      }

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      // 1. Fetch user profile data
      try {
        const profileRes = await fetch(`${BACKEND_URL}/api/profile/artist/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (profileRes.ok) {
          const userData = await profileRes.json();
          console.log("User data:", userData);

          setArtistInfo({
            artistName: userData.artist_name || userData.username || "",
            genre: userData.genre || "",
            bio: userData.bio || "",
            location: userData.location || "",
            website: userData.website || "",
            profilePicture: userData.profile_picture || userData.avatar_url || "",
            coverPhoto: userData.cover_photo || "",
            socialLinks: {
              spotify: userData.spotify_link || "",
              apple: userData.apple_music_link || "",
              youtube: userData.youtube_link || "",
              instagram: userData.instagram_link || "",
              twitter: userData.twitter_link || ""
            }
          });

          setIsVerified(userData.is_verified || false);
          setArtistStats(prev => ({
            ...prev,
            totalFollowers: userData.follower_count || userData.followers || 0
          }));
        } else {
          console.warn("Profile fetch failed:", profileRes.status);
        }
      } catch (err) {
        console.warn("Profile endpoint error:", err);
      }

      // 2. Fetch artist tracks
      try {
        const tracksRes = await fetch(`${BACKEND_URL}/api/artist/tracks`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (tracksRes.ok) {
          const tracksData = await tracksRes.json();
          console.log("Tracks data:", tracksData);
          setTracks(Array.isArray(tracksData) ? tracksData : []);

          setArtistStats(prev => ({
            ...prev,
            totalTracks: Array.isArray(tracksData) ? tracksData.length : 0
          }));
        } else {
          console.warn("Tracks fetch failed:", tracksRes.status);
        }
      } catch (err) {
        console.warn("Tracks endpoint error:", err);
      }

      // 3. Fetch analytics data
      try {
        const analyticsRes = await fetch(`${BACKEND_URL}/api/artist/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          console.log("Analytics data:", analyticsData);

          setAnalytics({
            monthlyPlays: analyticsData.monthly_plays || 0,
            totalStreams: analyticsData.total_streams || 0,
            topCountries: analyticsData.top_countries || [],
            revenueThisMonth: analyticsData.revenue_this_month || 0
          });

          setMonthlyListeners(analyticsData.monthly_listeners || 0);

          setArtistStats(prev => ({
            ...prev,
            totalPlays: analyticsData.total_plays || 0,
            totalFollowers: analyticsData.total_followers || prev.totalFollowers
          }));
        } else {
          console.warn("Analytics fetch failed:", analyticsRes.status);
        }
      } catch (err) {
        console.warn("Analytics endpoint error:", err);
      }

      // 4. Optional endpoints
      await fetchOptionalData(BACKEND_URL, token);

    } catch (error) {
      console.error("Error fetching artist data:", error);
      setError("Failed to load artist profile. Some features may not work.");
    } finally {
      setLoading(false);
    }
  };

  // ===== UPDATED: fetchOptionalData with fallback endpoints =====
  const fetchOptionalData = async (backendUrl, token) => {
    // Albums — try artist endpoint first, fallback to /my-albums
    try {
      const albumsRes = await fetch(`${backendUrl}/api/artist/albums`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (albumsRes.ok) {
        const albumsData = await albumsRes.json();
        setAlbums(Array.isArray(albumsData) ? albumsData : []);
        setArtistStats(prev => ({
          ...prev,
          totalAlbums: Array.isArray(albumsData) ? albumsData.length : 0
        }));
      } else {
        // Fallback to /my-albums endpoint (exists in routes.py)
        const fallbackRes = await fetch(`${backendUrl}/api/my-albums`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fallbackRes.ok) {
          const albumsData = await fallbackRes.json();
          setAlbums(Array.isArray(albumsData) ? albumsData : []);
          setArtistStats(prev => ({
            ...prev,
            totalAlbums: Array.isArray(albumsData) ? albumsData.length : 0
          }));
        }
      }
    } catch (err) {
      console.log("Albums endpoint not available");
    }

    // Playlists — try new CRUD endpoint first, fallback to old artist endpoint
    try {
      const playlistsRes = await fetch(`${backendUrl}/api/playlists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json();
        setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      } else {
        // Fallback to old artist/playlists endpoint
        const fallbackRes = await fetch(`${backendUrl}/api/artist/playlists`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (fallbackRes.ok) {
          const playlistsData = await fallbackRes.json();
          setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
        }
      }
    } catch (err) {
      console.log("Playlists endpoint not available");
    }

    // Recent activity
    try {
      const activityRes = await fetch(`${backendUrl}/api/artist/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(Array.isArray(activityData) ? activityData : []);
      }
    } catch (err) {
      console.log("Activity endpoint not available");
      setRecentActivity([
        {
          type: "track",
          message: "Welcome to your artist profile!",
          timestamp: "Just now",
          icon: "🎵"
        }
      ]);
    }
  };
  // ===== END UPDATED =====

  // FUNCTIONAL: Increment play count
  const incrementPlayCount = async (trackId) => {
    try {
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      await fetch(`${BACKEND_URL}/api/tracks/${trackId}/play`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state immediately
      setTracks(prevTracks =>
        prevTracks.map(track =>
          track.id === trackId
            ? { ...track, plays: (track.plays || 0) + 1 }
            : track
        )
      );

      // Update total plays in stats
      setArtistStats(prev => ({
        ...prev,
        totalPlays: prev.totalPlays + 1
      }));

      setAnalytics(prev => ({
        ...prev,
        totalStreams: prev.totalStreams + 1,
        monthlyPlays: prev.monthlyPlays + 1
      }));
    } catch (err) {
      console.error("Failed to increment play count:", err);
    }
  };

  // FUNCTIONAL: Handle track playback
  const handlePlayTrack = (track) => {
    const audio = audioRef.current;

    // If clicking the same track that's playing, pause it
    if (currentlyPlaying?.id === track.id && !audio.paused) {
      audio.pause();
      setCurrentlyPlaying(null);
      return;
    }

    // If there's a different track playing, stop it
    if (currentlyPlaying?.id !== track.id) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Play the new track
    if (track.audio_url || track.file_url) {
      audio.src = track.audio_url || track.file_url;
      audio.play()
        .then(() => {
          setCurrentlyPlaying(track);
          // Increment play count when playback starts successfully
          incrementPlayCount(track.id);
          setSuccessMessage(`Now playing: ${track.title}`);
        })
        .catch(err => {
          console.error("Playback failed:", err);
          setError("Failed to play track. Audio file may not be available.");
        });
    } else {
      setError("No audio file available for this track");
    }
  };

  // FUNCTIONAL: Handle follow button - FIXED to include artist ID
  const handleFollow = async () => {
    if (isOwnProfile) {
      setError("You cannot follow yourself");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      if (!id) {
        setError("Cannot follow: Artist ID not found");
        return;
      }

      const endpoint = isFollowing 
        ? `${BACKEND_URL}/api/unfollow/${id}`
        : `${BACKEND_URL}/api/follow/${id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: id })
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(!isFollowing);
        setArtistStats(prev => ({
          ...prev,
          totalFollowers: isFollowing ? prev.totalFollowers - 1 : prev.totalFollowers + 1
        }));
        setSuccessMessage(isFollowing ? "Unfollowed!" : "Followed successfully!");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update follow status");
      }
    } catch (err) {
      console.error("Follow error:", err);
      setError("Failed to update follow status");
    }
  };

  // FUNCTIONAL: Handle share button
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Check out ${artistInfo.artistName}'s music on StreamPireX!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${artistInfo.artistName} - StreamPireX`,
          text: shareText,
          url: shareUrl
        });
        setSuccessMessage("Shared successfully!");
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Share error:", err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setSuccessMessage("Link copied to clipboard!");
      } catch (err) {
        setError("Failed to copy link");
      }
    }
  };

  // FUNCTIONAL: Handle block user
  const handleBlock = async () => {
    if (isOwnProfile || !id) return;

    try {
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      const response = await fetch(`${BACKEND_URL}/api/block/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsBlocked(true);
        setIsFollowing(false); // Blocking removes follow
        setShowBlockModal(false);
        setShowMoreMenu(false);
        setSuccessMessage(`Blocked ${artistInfo.artistName}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to block user");
      }
    } catch (err) {
      console.error("Block error:", err);
      setError("Failed to block user");
    }
  };

  // FUNCTIONAL: Handle unblock user
  const handleUnblock = async () => {
    if (isOwnProfile || !id) return;

    try {
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      const response = await fetch(`${BACKEND_URL}/api/unblock/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsBlocked(false);
        setShowMoreMenu(false);
        setSuccessMessage(`Unblocked ${artistInfo.artistName}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to unblock user");
      }
    } catch (err) {
      console.error("Unblock error:", err);
      setError("Failed to unblock user");
    }
  };

  // FUNCTIONAL: Handle like button
  const handleLikeTrack = async (trackId) => {
    try {
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      const response = await fetch(`${BACKEND_URL}/api/tracks/${trackId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setTracks(prevTracks =>
          prevTracks.map(track =>
            track.id === trackId
              ? { ...track, likes: (track.likes || 0) + 1, isLiked: !track.isLiked }
              : track
          )
        );
        setSuccessMessage("Track liked!");
      }
    } catch (err) {
      console.error("Like error:", err);
      setError("Failed to like track");
    }
  };

  // ===== UPDATED: Create album — now opens modal instead of "coming soon" =====
  const handleCreateAlbum = () => {
    setShowAlbumModal(true);
  };

  // Submit album creation to backend POST /api/create-album
  const submitCreateAlbum = async () => {
    if (!albumForm.title || !albumForm.genre || !albumForm.release_date || !albumForm.cover_art) {
      setError("All fields are required: title, genre, release date, and cover art");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      const formData = new FormData();
      formData.append('title', albumForm.title);
      formData.append('genre', albumForm.genre);
      formData.append('release_date', albumForm.release_date);
      formData.append('cover_art', albumForm.cover_art);

      const res = await fetch(`${BACKEND_URL}/api/create-album`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create album');
      }

      const data = await res.json();
      setSuccessMessage(`Album "${albumForm.title}" created successfully!`);
      setShowAlbumModal(false);
      setAlbumForm({ title: '', genre: '', release_date: '', cover_art: null });
      await fetchArtistData(); // Refresh albums list
    } catch (err) {
      console.error("Album creation error:", err);
      setError(err.message || "Failed to create album");
    } finally {
      setCreating(false);
    }
  };

  // ===== UPDATED: Create playlist — now opens modal instead of "coming soon" =====
  const handleCreatePlaylist = () => {
    setShowPlaylistModal(true);
  };

  // Submit playlist creation to backend POST /api/playlists
  const submitCreatePlaylist = async () => {
    if (!playlistForm.name.trim()) {
      setError("Playlist name is required");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("token");
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      const res = await fetch(`${BACKEND_URL}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: playlistForm.name.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create playlist');
      }

      const data = await res.json();
      setSuccessMessage(`Playlist "${playlistForm.name}" created successfully!`);
      setShowPlaylistModal(false);
      setPlaylistForm({ name: '' });
      await fetchArtistData(); // Refresh playlists list
    } catch (err) {
      console.error("Playlist creation error:", err);
      setError(err.message || "Failed to create playlist");
    } finally {
      setCreating(false);
    }
  };
  // ===== END UPDATED =====

  // Handle track upload success
  const handleUploadNewTrack = async (newTrack) => {
    console.log("New track uploaded:", newTrack);
    await fetchArtistData();
    setShowModal(false);
    setSuccessMessage("Track uploaded successfully!");
  };

  // Direct audio upload helpers
  const openUploader = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to upload audio");
        return;
      }

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const res = await fetch(`${BACKEND_URL}/api/upload_track`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Upload failed");
      }

      const data = await res.json();
      await handleUploadNewTrack(data);
    } catch (err) {
      console.error("Audio upload error:", err);
      setError("Audio upload failed. Please try again.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter function for search
  const filterItems = (items, key) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item =>
      item && item[key] &&
      typeof item[key] === 'string' &&
      item[key].toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner">🎵</div>
          <p>Loading your artist profile...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <div className="original-layout">
            <section className="latest-release">
              <h2>🎵 Latest Release</h2>
              <div className="featured-track">
                {tracks.length > 0 ? (
                  <>
                    {getImageUrl(tracks[0].artwork) && (
                      <img
                        src={getImageUrl(tracks[0].artwork)}
                        alt="Latest Release"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="track-info">
                      <h3>{tracks[0].title}</h3>
                      <p>Released {tracks[0].created_at ? new Date(tracks[0].created_at).toLocaleDateString() : 'Recently'}</p>
                      <div className="track-stats">
                        <span>🎧 {tracks[0].plays || 0} plays</span>
                        <span>
                          <button
                            onClick={() => handleLikeTrack(tracks[0].id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
                          >
                            {tracks[0].isLiked ? '❤️' : '🤍'} {tracks[0].likes || 0} likes
                          </button>
                        </span>
                      </div>
                    </div>
                    <button
                      className="play-btn"
                      onClick={() => handlePlayTrack(tracks[0])}
                    >
                      {currentlyPlaying?.id === tracks[0].id && !audioRef.current.paused ? '⏸️' : '▶️'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="track-info">
                      <h3>No tracks yet</h3>
                      <p>Upload your first track to get started</p>
                    </div>
                    {isOwnProfile && (
                      <button onClick={openUploader} className="upload-btn">
                        ➕ Upload Now
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 Popular Tracks</h2>
                {isOwnProfile && tracks.length > 0 && (
                  <button onClick={openUploader} className="upload-btn">
                    ➕ Upload New Track
                  </button>
                )}
              </div>

              <div className="tracks-list">
                {tracks.length > 0 ? tracks.map((track, index) => (
                  <div key={track.id || index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    {getImageUrl(track.artwork) && (
                      <img
                        src={getImageUrl(track.artwork)}
                        alt={track.title}
                        className="track-artwork"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album || track.artist_name || artistInfo.artistName}</p>
                    </div>
                    <span className="track-plays">{track.plays || 0} plays</span>
                    <span className="track-duration">{track.duration || "3:24"}</span>
                    <button
                      className="track-play-btn"
                      onClick={() => handlePlayTrack(track)}
                    >
                      {currentlyPlaying?.id === track.id && !audioRef.current.paused ? '⏸️' : '▶️'}
                    </button>
                  </div>
                )) : (
                  <div className="no-tracks">
                    <p>🎵 No tracks uploaded yet</p>
                    {isOwnProfile && (
                      <button onClick={openUploader} className="upload-first-btn">
                        Upload Your First Track
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="albums-section">
              <h2>💿 Albums & EPs</h2>
              <div className="albums-grid">
                {albums.length > 0 ? albums.map((album, index) => (
                  <div key={album.id || index} className="album-card">
                    {getImageUrl(album.artwork) && (
                      <img
                        src={getImageUrl(album.artwork)}
                        alt={album.title}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <h4>{album.title}</h4>
                    <p>{album.year || new Date().getFullYear()} • {album.track_count || album.trackCount || 0} tracks</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>💿 No albums created yet</p>
                    {isOwnProfile && (
                      <button onClick={handleCreateAlbum} className="create-btn">
                        Create Your First Album
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "music":
        return (
          <div className="tab-content">
            <section className="tracks-section">
              <div className="section-header">
                <h2>🎵 All Tracks</h2>
                {isOwnProfile && (
                  <button onClick={openUploader} className="upload-btn">
                    ➕ Upload New Track
                  </button>
                )}
              </div>

              <div className="tracks-list">
                {filterItems(tracks, "title").length > 0 ? filterItems(tracks, "title").map((track, index) => (
                  <div key={track.id || index} className="track-item">
                    <span className="track-number">{index + 1}</span>
                    {getImageUrl(track.artwork) && (
                      <img
                        src={getImageUrl(track.artwork)}
                        alt={track.title}
                        className="track-artwork"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <div className="track-details">
                      <h4>{track.title}</h4>
                      <p>{track.album || artistInfo.artistName}</p>
                    </div>
                    <span className="track-plays">{track.plays || 0} plays</span>
                    <span className="track-duration">{track.duration || "3:24"}</span>
                    <button
                      className="track-play-btn"
                      onClick={() => handlePlayTrack(track)}
                    >
                      {currentlyPlaying?.id === track.id && !audioRef.current.paused ? '⏸️' : '▶️'}
                    </button>
                  </div>
                )) : (
                  <div className="no-tracks">
                    <p>🎵 {searchQuery ? `No tracks found for "${searchQuery}"` : "No tracks uploaded yet"}</p>
                    {isOwnProfile && (
                      <button onClick={openUploader} className="upload-first-btn">
                        Upload Your First Track
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "albums":
        return (
          <div className="tab-content">
            <section className="albums-section">
              {/* ===== UPDATED: Added section-header with Create button ===== */}
              <div className="section-header">
                <h2>💿 Albums & EPs</h2>
                {isOwnProfile && (
                  <button onClick={handleCreateAlbum} className="create-btn">
                    ➕ Create Album
                  </button>
                )}
              </div>
              <div className="albums-grid">
                {filterItems(albums, "title").length > 0 ? filterItems(albums, "title").map((album, index) => (
                  <div key={album.id || index} className="album-card">
                    {getImageUrl(album.artwork) && (
                      <img
                        src={getImageUrl(album.artwork)}
                        alt={album.title}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <h4>{album.title}</h4>
                    <p>{album.year || new Date().getFullYear()} • {album.track_count || album.trackCount || 0} tracks</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>💿 {searchQuery ? `No albums found for "${searchQuery}"` : "No albums created yet"}</p>
                    {isOwnProfile && (
                      <button onClick={handleCreateAlbum} className="create-btn">
                        Create Your First Album
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "playlists":
        return (
          <div className="tab-content">
            <section className="playlists-section">
              {/* ===== UPDATED: Added section-header with Create button ===== */}
              <div className="section-header">
                <h2>📋 Playlists</h2>
                {isOwnProfile && (
                  <button onClick={handleCreatePlaylist} className="create-btn">
                    ➕ Create Playlist
                  </button>
                )}
              </div>
              <div className="playlists-grid">
                {filterItems(playlists, "name").length > 0 ? filterItems(playlists, "name").map((playlist, index) => (
                  <div key={playlist.id || index} className="playlist-card">
                    {getImageUrl(playlist.cover) && (
                      <img
                        src={getImageUrl(playlist.cover)}
                        alt={playlist.name}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <h4>{playlist.name}</h4>
                    <p>{playlist.track_count || playlist.trackCount || 0} tracks • {playlist.duration || "0:00"}</p>
                  </div>
                )) : (
                  <div className="no-content">
                    <p>📋 {searchQuery ? `No playlists found for "${searchQuery}"` : "No playlists created yet"}</p>
                    {isOwnProfile && (
                      <button onClick={handleCreatePlaylist} className="create-btn">
                        Create Your First Playlist
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case "about":
        return (
          <div className="tab-content">
            <section className="about-section">
              <h2>ℹ️ About the Artist</h2>
              <div className="artist-bio-expanded">
                <h3>📝 Biography</h3>
                <p>{artistInfo.bio || "Add your artist bio to let fans know more about you..."}</p>

                <div className="artist-details-grid">
                  <div className="detail-item">
                    <strong>📍 Location:</strong>
                    <span>{artistInfo.location || "Not specified"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>🎵 Genre:</strong>
                    <span>{artistInfo.genre || "Not specified"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>🌐 Website:</strong>
                    {artistInfo.website ? (
                      <a href={artistInfo.website} target="_blank" rel="noopener noreferrer">
                        {artistInfo.website}
                      </a>
                    ) : "Not specified"}
                  </div>
                </div>

                <div className="social-links-expanded">
                  <h3>🔗 Find Me On</h3>
                  <div className="social-links-grid">
                    {artistInfo.socialLinks.spotify && (
                      <a href={artistInfo.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="social-link spotify">🎵 Spotify</a>
                    )}
                    {artistInfo.socialLinks.apple && (
                      <a href={artistInfo.socialLinks.apple} target="_blank" rel="noopener noreferrer" className="social-link apple">🍎 Apple Music</a>
                    )}
                    {artistInfo.socialLinks.youtube && (
                      <a href={artistInfo.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-link youtube">📺 YouTube</a>
                    )}
                    {artistInfo.socialLinks.instagram && (
                      <a href={artistInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">📸 Instagram</a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case "analytics":
        return (
          <div className="tab-content">
            <section className="analytics-section">
              <h2>📊 Analytics Dashboard</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>📈 Monthly Performance</h3>
                  <div className="stat-item">
                    <span className="stat-label">Monthly Plays:</span>
                    <span className="stat-value">{analytics.monthlyPlays.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Streams:</span>
                    <span className="stat-value">{analytics.totalStreams.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Revenue This Month:</span>
                    <span className="stat-value">${analytics.revenueThisMonth.toFixed(2)}</span>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>🌍 Top Countries</h3>
                  {analytics.topCountries.length > 0 ? analytics.topCountries.map((country, index) => (
                    <div key={index} className="country-item">
                      <span>{index + 1}. {country}</span>
                    </div>
                  )) : (
                    <p>No geographic data available yet</p>
                  )}
                </div>

                <div className="analytics-card">
                  <h3>📊 Quick Stats</h3>
                  <div className="quick-stats">
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalTracks}</span>
                      <span className="quick-stat-label">Tracks</span>
                    </div>
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalAlbums}</span>
                      <span className="quick-stat-label">Albums</span>
                    </div>
                    <div className="quick-stat">
                      <span className="quick-stat-number">{artistStats.totalFollowers}</span>
                      <span className="quick-stat-label">Followers</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  if (loading && !artistInfo.artistName) {
    return (
      <div className="artist-profile-container">
        <div className="loading-container">
          <div className="loading-spinner">🎵</div>
          <p>Loading your artist profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-profile-container">
      {/* Hidden file input for audio uploads */}
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {showModal && (
        <UploadTrackModal
          onClose={() => setShowModal(false)}
          onUploadSuccess={handleUploadNewTrack}
        />
      )}

      {error && (
        <div className="error-banner">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="success-banner">
          <p>✓ {successMessage}</p>
          <button onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* Block Confirmation Modal */}
      {showBlockModal && (
        <div className="modal-overlay" onClick={() => setShowBlockModal(false)}>
          <div className="block-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🚫 Block {artistInfo.artistName}?</h3>
            <p>Are you sure you want to block this user?</p>
            <ul className="block-consequences">
              <li>They won't be able to see your profile or content</li>
              <li>You won't see their content in your feed</li>
              <li>Any follow relationship will be removed</li>
              <li>They won't be notified that you blocked them</li>
            </ul>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowBlockModal(false)}
              >
                Cancel
              </button>
              <button 
                className="block-confirm-btn"
                onClick={handleBlock}
              >
                🚫 Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW: Album Creation Modal ===== */}
      {showAlbumModal && (
        <div className="modal-overlay" onClick={() => setShowAlbumModal(false)}>
          <div className="creation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="creation-modal-header">
              <h3>💿 Create New Album</h3>
              <button className="modal-close-btn" onClick={() => setShowAlbumModal(false)}>✕</button>
            </div>
            <div className="creation-modal-body">
              <div className="creation-form-group">
                <label>Album Title *</label>
                <input
                  type="text"
                  placeholder="Enter album title"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, title: e.target.value }))}
                  className="creation-input"
                />
              </div>
              <div className="creation-form-group">
                <label>Genre *</label>
                <select
                  value={albumForm.genre}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, genre: e.target.value }))}
                  className="creation-input"
                >
                  <option value="">Select genre</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="R&B">R&B</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Latin">Latin</option>
                  <option value="Country">Country</option>
                  <option value="Classical">Classical</option>
                  <option value="Afrobeat">Afrobeat</option>
                  <option value="Reggae">Reggae</option>
                  <option value="Indie">Indie</option>
                  <option value="Metal">Metal</option>
                  <option value="Folk">Folk</option>
                  <option value="Lo-Fi">Lo-Fi</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="creation-form-group">
                <label>Release Date *</label>
                <input
                  type="date"
                  value={albumForm.release_date}
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, release_date: e.target.value }))}
                  className="creation-input"
                />
              </div>
              <div className="creation-form-group">
                <label>Cover Art * (.jpg, .jpeg, .png)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => setAlbumForm(prev => ({ ...prev, cover_art: e.target.files[0] || null }))}
                  className="creation-input creation-file-input"
                />
              </div>
            </div>
            <div className="creation-modal-footer">
              <button
                className="creation-cancel-btn"
                onClick={() => {
                  setShowAlbumModal(false);
                  setAlbumForm({ title: '', genre: '', release_date: '', cover_art: null });
                }}
              >
                Cancel
              </button>
              <button
                className="creation-submit-btn"
                onClick={submitCreateAlbum}
                disabled={creating || !albumForm.title || !albumForm.genre || !albumForm.release_date || !albumForm.cover_art}
              >
                {creating ? '⏳ Creating...' : '💿 Create Album'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW: Playlist Creation Modal ===== */}
      {showPlaylistModal && (
        <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="creation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="creation-modal-header">
              <h3>📋 Create New Playlist</h3>
              <button className="modal-close-btn" onClick={() => setShowPlaylistModal(false)}>✕</button>
            </div>
            <div className="creation-modal-body">
              <div className="creation-form-group">
                <label>Playlist Name *</label>
                <input
                  type="text"
                  placeholder="Enter playlist name"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm({ name: e.target.value })}
                  className="creation-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && playlistForm.name.trim()) {
                      submitCreatePlaylist();
                    }
                  }}
                />
              </div>
              <p className="creation-hint">You can add tracks to this playlist after creating it.</p>
            </div>
            <div className="creation-modal-footer">
              <button
                className="creation-cancel-btn"
                onClick={() => {
                  setShowPlaylistModal(false);
                  setPlaylistForm({ name: '' });
                }}
              >
                Cancel
              </button>
              <button
                className="creation-submit-btn"
                onClick={submitCreatePlaylist}
                disabled={creating || !playlistForm.name.trim()}
              >
                {creating ? '⏳ Creating...' : '📋 Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== END NEW MODALS ===== */}

      <div className="profile-mode-toggle">
        {profileModes.map(mode => (
          <Link
            key={mode.id}
            to={mode.path}
            className={`mode-toggle-btn ${mode.id === 'artist' ? 'active' : ''}`}
          >
            {mode.label}
          </Link>
        ))}
      </div>

      <div className="artist-hero-section">
        <div className="artist-cover-photo" style={{
          backgroundImage: artistInfo.coverPhoto ? `url(${artistInfo.coverPhoto})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div className="artist-overlay">
            <div className="artist-avatar">
              {getImageUrl(artistInfo.profilePicture) && (
                <img
                  src={getImageUrl(artistInfo.profilePicture)}
                  alt="Artist Avatar"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              {isVerified && <span className="verified-badge">✓</span>}
            </div>
            <div className="artist-info">
              <h1 className="artist-name">
                {artistInfo.artistName}
              </h1>
              <p className="artist-genre">{artistInfo.genre}</p>
              <div className="artist-stats-quick">
                <span>{artistStats.totalFollowers} Followers</span>
                <span>•</span>
                <span>{monthlyListeners} Monthly Listeners</span>
                <span>•</span>
                <span>{artistStats.totalTracks} Tracks</span>
              </div>
            </div>
            <div className="artist-actions">
              {!isOwnProfile && !isBlocked && (
                <button onClick={handleFollow} className={`follow-btn ${isFollowing ? 'following' : ''}`}>
                  {isFollowing ? '✓ Following' : '➕ Follow'}
                </button>
              )}
              {isBlocked && !isOwnProfile && (
                <button onClick={handleUnblock} className="unblock-btn">
                  🚫 Unblock
                </button>
              )}
              <button onClick={handleShare} className="share-btn">🔗 Share</button>
              {!isOwnProfile && !isBlocked && (
                <TipJar
                  creatorId={id}
                  creatorName={artistInfo.artistName}
                  contentType="artist"
                  contentId={id}
                  buttonStyle="inline"
                />
              )}
              {!isOwnProfile && (
                <div className="more-menu-container">
                  <button 
                    className="more-btn" 
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                  >
                    ⋯
                  </button>
                  {showMoreMenu && (
                    <div className="more-menu-dropdown">
                      {!isBlocked ? (
                        <button 
                          className="menu-item danger"
                          onClick={() => {
                            setShowBlockModal(true);
                            setShowMoreMenu(false);
                          }}
                        >
                          🚫 Block {artistInfo.artistName}
                        </button>
                      ) : (
                        <button 
                          className="menu-item"
                          onClick={handleUnblock}
                        >
                          ✓ Unblock {artistInfo.artistName}
                        </button>
                      )}
                      <button className="menu-item">
                        🚩 Report
                      </button>
                      <button 
                        className="menu-item"
                        onClick={() => setShowMoreMenu(false)}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="artist-nav-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          🏠 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "music" ? "active" : ""}`}
          onClick={() => setActiveTab("music")}
        >
          🎵 Music
        </button>
        <button
          className={`tab-btn ${activeTab === "albums" ? "active" : ""}`}
          onClick={() => setActiveTab("albums")}
        >
          💿 Albums
        </button>
        <button
          className={`tab-btn ${activeTab === "playlists" ? "active" : ""}`}
          onClick={() => setActiveTab("playlists")}
        >
          📋 Playlists
        </button>
        <button
          className={`tab-btn ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          ℹ️ About
        </button>
        {isOwnProfile && (
          <button
            className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Analytics
          </button>
        )}
      </div>

      {/* Search Bar */}
      {activeTab !== "overview" && activeTab !== "about" && activeTab !== "analytics" && (
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${activeTab}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Content Grid */}
      <div className="artist-content-grid">
        <div className="artist-main-content">
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        {(activeTab === "overview" || activeTab === "music" || activeTab === "about") && (
          <div className="artist-sidebar">
            <section className="artist-bio-card">
              <h3>📝 About</h3>
              <p>{artistInfo.bio || "Add your artist bio to let fans know more about you..."}</p>
              <div className="artist-details">
                <p><strong>📍 Location:</strong> {artistInfo.location || "Not specified"}</p>
                <p><strong>🎵 Genre:</strong> {artistInfo.genre || "Not specified"}</p>
                <p><strong>🌐 Website:</strong>
                  {artistInfo.website ? (
                    <a href={artistInfo.website} target="_blank" rel="noopener noreferrer">
                      {artistInfo.website}
                    </a>
                  ) : "Not specified"}
                </p>
              </div>
            </section>

            <section className="social-links-card">
              <h3>🔗 Find Me On</h3>
              <div className="social-links-grid">
                {artistInfo.socialLinks.spotify && (
                  <a href={artistInfo.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="social-link spotify">🎵 Spotify</a>
                )}
                {artistInfo.socialLinks.apple && (
                  <a href={artistInfo.socialLinks.apple} target="_blank" rel="noopener noreferrer" className="social-link apple">🍎 Apple Music</a>
                )}
                {artistInfo.socialLinks.youtube && (
                  <a href={artistInfo.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="social-link youtube">📺 YouTube</a>
                )}
                {artistInfo.socialLinks.instagram && (
                  <a href={artistInfo.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">📸 Instagram</a>
                )}
              </div>
            </section>

            {isOwnProfile && (
              <section className="artist-tools-card">
                <h3>🛠️ Artist Tools</h3>
                <div className="tools-list">
                  {activeTab !== "overview" && (
                    <button onClick={openUploader} className="tool-btn">⬆️ Upload Music</button>
                  )}
                  <Link to="/artist/analytics" className="tool-btn">📊 View Analytics</Link>
                  <Link to="/artist/promote" className="tool-btn">📢 Promote Track</Link>
                  <Link to="/artist/collaborate" className="tool-btn">🤝 Find Collaborators</Link>
                  <Link to="/artist/monetize" className="tool-btn">💰 Monetization</Link>
                </div>
              </section>
            )}

            <section className="recent-activity-card">
              <h3>📈 Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.length > 0 ? recentActivity.slice(0, 3).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <span>{activity.icon || "🎵"}</span>
                    <div>
                      <p>{activity.message}</p>
                      <small>{activity.timestamp}</small>
                    </div>
                  </div>
                )) : (
                  <div className="activity-item">
                    <span>🎵</span>
                    <div>
                      <p>Welcome to your artist profile!</p>
                      <small>Just now</small>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <div className="edit-profile-section">
          <Link to="/profile/artist/edit" className="edit-profile-btn">✏️ Edit Artist Profile</Link>
        </div>
      )}
    </div>
  );
};

export default ArtistProfilePage;