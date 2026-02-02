import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "../../styles/UserSearchProfile.css";

const UserSearchProfilePage = () => {
  const { userId, username } = useParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // User Data
  const [userInfo, setUserInfo] = useState({
    id: null,
    username: "",
    displayName: "",
    bio: "",
    location: "",
    profilePicture: "",
    coverPhoto: "",
    memberSince: "",
    profileType: "regular", // regular, artist, gamer, multiple
    currentMood: "",
    socialLinks: {
      instagram: "",
      twitter: "",
      tiktok: "",
      youtube: ""
    }
  });

  const [userStats, setUserStats] = useState({
    followers: 0,
    following: 0,
    posts: 0,
    playlists: 0,
    likedTracks: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [innerCircle, setInnerCircle] = useState([]);
  const [likedContent, setLikedContent] = useState([]);

  // Helper function for safe image URLs
  const getImageUrl = (imageUrl) => {
    if (!imageUrl || imageUrl === "/default-avatar.png" || imageUrl === "") {
      return null;
    }
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    if (imageUrl.startsWith("/")) {
      return imageUrl;
    }
    return `/${imageUrl}`;
  };

  // Check if viewing own profile
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = payload.sub || payload.user_id;
        setIsOwnProfile(
          currentUserId === parseInt(userId) || 
          currentUserId === userId ||
          payload.username === username
        );
      } catch (e) {
        console.error("Error parsing token:", e);
      }
    }
  }, [userId, username]);

  // Fetch user data
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const identifier = userId || username;
        
        // Fetch user profile
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/${identifier}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error("User not found");
        }

        const data = await response.json();

        // Check if this is an artist - redirect to artist profile
        if (data.profile_type === "artist" || data.is_artist) {
          navigate(`/artist/${data.id}`, { replace: true });
          return;
        }

        setUserInfo({
          id: data.id,
          username: data.username || "",
          displayName: data.display_name || data.username || "User",
          bio: data.bio || "",
          location: data.location || data.city || "",
          profilePicture: data.profile_picture || data.avatar_url || "",
          coverPhoto: data.cover_photo || data.cover_image || "",
          memberSince: data.created_at || data.member_since || "",
          profileType: data.profile_type || "regular",
          currentMood: data.current_mood || data.mood || "",
          socialLinks: {
            instagram: data.instagram_url || data.social_links?.instagram || "",
            twitter: data.twitter_url || data.social_links?.twitter || "",
            tiktok: data.tiktok_url || data.social_links?.tiktok || "",
            youtube: data.youtube_url || data.social_links?.youtube || ""
          }
        });

        setUserStats({
          followers: data.followers_count || data.followers || 0,
          following: data.following_count || data.following || 0,
          posts: data.posts_count || data.posts || 0,
          playlists: data.playlists_count || data.playlists || 0,
          likedTracks: data.liked_tracks_count || data.liked_tracks || 0
        });

        setIsFollowing(data.is_following || false);

        // Fetch additional data
        await fetchUserPlaylists(data.id);
        await fetchUserActivity(data.id);
        await fetchInnerCircle(data.id);

      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, username, navigate]);

  // ✅ FIX: Added BACKEND_URL prefix (was hitting frontend dev server)
  const fetchUserPlaylists = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/${id}/playlists/public`);
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || data || []);
      }
    } catch (err) {
      console.error("Error fetching playlists:", err);
    }
  };

  // ✅ FIX: Added BACKEND_URL prefix
  const fetchUserActivity = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/${id}/activity/public`);
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activity || data || []);
      }
    } catch (err) {
      console.error("Error fetching activity:", err);
    }
  };

  // ✅ FIX: Added BACKEND_URL prefix
  const fetchInnerCircle = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/${id}/inner-circle/public`);
      if (response.ok) {
        const data = await response.json();
        setInnerCircle(data.members || data || []);
      }
    } catch (err) {
      console.error("Error fetching inner circle:", err);
    }
  };

  // ✅ FIX: Added BACKEND_URL prefix + corrected endpoint to match follow_routes.py
  // Was: /api/user/${id}/follow → Now: /api/follow/${id}
  // Was: /api/user/${id}/unfollow → Now: /api/unfollow/${id}
  const handleFollow = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setFollowLoading(true);
    try {
      const endpoint = isFollowing 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/unfollow/${userInfo.id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/follow/${userInfo.id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        setUserStats(prev => ({
          ...prev,
          followers: isFollowing ? prev.followers - 1 : prev.followers + 1
        }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Message user
  const handleMessage = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    // Navigate to chat or open chat modal
    navigate(`/messages?user=${userInfo.id}`);
  };

  // Share profile
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: `${userInfo.displayName} on StreamPireX`,
      text: `Check out ${userInfo.displayName}'s profile on StreamPireX!`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Profile link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get profile type badge
  const getProfileTypeBadge = () => {
    switch (userInfo.profileType) {
      case "gamer":
        return { icon: "🎮", label: "Gamer" };
      case "artist":
        return { icon: "🎵", label: "Artist" };
      case "multiple":
        return { icon: "⭐", label: "Creator" };
      default:
        return { icon: "👤", label: "Member" };
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="overview-section">
            {/* Recent Activity */}
            <section className="activity-section">
              <div className="section-header">
                <h2>📰 Recent Activity</h2>
              </div>
              <div className="activity-list">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="activity-item">
                      <span className="activity-icon">
                        {activity.type === "post" && "📝"}
                        {activity.type === "like" && "❤️"}
                        {activity.type === "comment" && "💬"}
                        {activity.type === "playlist" && "📋"}
                        {activity.type === "follow" && "👥"}
                      </span>
                      <div className="activity-content">
                        <p>{activity.description || activity.text}</p>
                        <span className="activity-time">
                          {activity.time_ago || formatDate(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </section>

            {/* Public Playlists */}
            {playlists.length > 0 && (
              <section className="playlists-section">
                <div className="section-header">
                  <h2>📋 Public Playlists</h2>
                  {playlists.length > 4 && (
                    <button className="see-all-btn" onClick={() => setActiveTab("playlists")}>
                      See All
                    </button>
                  )}
                </div>
                <div className="playlists-grid">
                  {playlists.slice(0, 4).map(playlist => (
                    <Link 
                      key={playlist.id} 
                      to={`/playlist/${playlist.id}`}
                      className="playlist-card"
                    >
                      <div className="playlist-cover">
                        {playlist.cover_image ? (
                          <img src={playlist.cover_image} alt={playlist.name} />
                        ) : (
                          <div className="default-cover">🎵</div>
                        )}
                      </div>
                      <h4>{playlist.name || playlist.title}</h4>
                      <p>{playlist.track_count || 0} tracks</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        );

      case "playlists":
        return (
          <div className="playlists-section-full">
            <div className="section-header">
              <h2>📋 All Public Playlists</h2>
              <span className="count">{playlists.length} playlists</span>
            </div>
            <div className="playlists-grid">
              {playlists.map(playlist => (
                <Link 
                  key={playlist.id} 
                  to={`/playlist/${playlist.id}`}
                  className="playlist-card"
                >
                  <div className="playlist-cover">
                    {playlist.cover_image ? (
                      <img src={playlist.cover_image} alt={playlist.name} />
                    ) : (
                      <div className="default-cover">🎵</div>
                    )}
                  </div>
                  <h4>{playlist.name || playlist.title}</h4>
                  <p>{playlist.track_count || 0} tracks</p>
                </Link>
              ))}
              {playlists.length === 0 && (
                <div className="empty-state">
                  <p>No public playlists yet</p>
                </div>
              )}
            </div>
          </div>
        );

      case "circle":
        return (
          <div className="circle-section">
            <div className="section-header">
              <h2>⭐ Inner Circle</h2>
              <span className="count">{innerCircle.length} members</span>
            </div>
            <div className="circle-grid">
              {innerCircle.map((member, index) => (
                <Link 
                  key={member.id || index} 
                  to={`/user/${member.username || member.id}`}
                  className="circle-member"
                >
                  <div className="member-rank">#{index + 1}</div>
                  <div className="member-avatar">
                    {member.profile_picture || member.avatar_url ? (
                      <img 
                        src={member.profile_picture || member.avatar_url} 
                        alt={member.display_name || member.username} 
                      />
                    ) : (
                      <div className="default-avatar">👤</div>
                    )}
                  </div>
                  <div className="member-info">
                    <h4>{member.display_name || member.username}</h4>
                    <p>@{member.username}</p>
                  </div>
                </Link>
              ))}
              {innerCircle.length === 0 && (
                <div className="empty-state">
                  <p>No inner circle members yet</p>
                </div>
              )}
            </div>
          </div>
        );

      case "about":
        return (
          <div className="about-section">
            <div className="about-card">
              <h3>👤 About {userInfo.displayName}</h3>
              
              <div className="bio-section">
                <p className="bio-text">
                  {userInfo.bio || `${userInfo.displayName} hasn't added a bio yet.`}
                </p>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <strong>📍 Location</strong>
                  <span>{userInfo.location || "Not specified"}</span>
                </div>
                <div className="detail-item">
                  <strong>📅 Member Since</strong>
                  <span>{formatDate(userInfo.memberSince)}</span>
                </div>
                <div className="detail-item">
                  <strong>🏷️ Profile Type</strong>
                  <span>{getProfileTypeBadge().icon} {getProfileTypeBadge().label}</span>
                </div>
                {userInfo.currentMood && (
                  <div className="detail-item">
                    <strong>😊 Current Mood</strong>
                    <span>{userInfo.currentMood}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {Object.values(userInfo.socialLinks).some(link => link) && (
                <div className="social-section">
                  <h4>🔗 Social Links</h4>
                  <div className="social-links-grid">
                    {userInfo.socialLinks.instagram && (
                      <a 
                        href={userInfo.socialLinks.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="social-link instagram"
                      >
                        📸 Instagram
                      </a>
                    )}
                    {userInfo.socialLinks.twitter && (
                      <a 
                        href={userInfo.socialLinks.twitter} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="social-link twitter"
                      >
                        🐦 Twitter
                      </a>
                    )}
                    {userInfo.socialLinks.tiktok && (
                      <a 
                        href={userInfo.socialLinks.tiktok} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="social-link tiktok"
                      >
                        🎬 TikTok
                      </a>
                    )}
                    {userInfo.socialLinks.youtube && (
                      <a 
                        href={userInfo.socialLinks.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="social-link youtube"
                      >
                        ▶️ YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="user-search-profile-container">
        <div className="loading-container">
          <div className="loading-spinner">👤</div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="user-search-profile-container">
        <div className="error-container">
          <div className="error-icon">😕</div>
          <h2>User Not Found</h2>
          <p className="error-message">{error}</p>
          <button className="retry-btn" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const profileBadge = getProfileTypeBadge();

  return (
    <div className="user-search-profile-container">
      {/* Hero Section */}
      <div className="user-hero-section">
        <div 
          className="user-cover-photo" 
          style={{
            backgroundImage: userInfo.coverPhoto 
              ? `url(${getImageUrl(userInfo.coverPhoto)})` 
              : 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1f2937 100%)'
          }}
        >
          <div className="user-overlay">
            <div className="user-avatar">
              {getImageUrl(userInfo.profilePicture) ? (
                <img
                  src={getImageUrl(userInfo.profilePicture)}
                  alt={userInfo.displayName}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="default-avatar-icon">👤</div>
              )}
              <span className="profile-type-badge" title={profileBadge.label}>
                {profileBadge.icon}
              </span>
            </div>
            
            <div className="user-info">
              <h1 className="user-display-name">{userInfo.displayName}</h1>
              <p className="user-username">@{userInfo.username}</p>
              {userInfo.currentMood && (
                <p className="user-mood">{userInfo.currentMood}</p>
              )}
              <div className="user-stats-quick">
                <span><strong>{formatNumber(userStats.followers)}</strong> Followers</span>
                <span className="stat-divider">•</span>
                <span><strong>{formatNumber(userStats.following)}</strong> Following</span>
                <span className="stat-divider">•</span>
                <span><strong>{userStats.playlists}</strong> Playlists</span>
              </div>
            </div>

            <div className="user-actions">
              {isOwnProfile ? (
                <Link to="/profile" className="edit-profile-btn">
                  ✏️ Edit Profile
                </Link>
              ) : (
                <>
                  <button 
                    onClick={handleFollow} 
                    className={`follow-btn ${isFollowing ? 'following' : ''}`}
                    disabled={followLoading}
                  >
                    {followLoading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
                  </button>
                  <button onClick={handleMessage} className="message-btn">
                    💬 Message
                  </button>
                </>
              )}
              <button onClick={handleShare} className="share-btn">
                🔗 Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="user-nav-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          🏠 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "playlists" ? "active" : ""}`}
          onClick={() => setActiveTab("playlists")}
        >
          📋 Playlists
        </button>
        <button
          className={`tab-btn ${activeTab === "circle" ? "active" : ""}`}
          onClick={() => setActiveTab("circle")}
        >
          ⭐ Inner Circle
        </button>
        <button
          className={`tab-btn ${activeTab === "about" ? "active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          ℹ️ About
        </button>
      </div>

      {/* Main Content */}
      <div className="user-content-grid">
        <div className="user-main-content">
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        {(activeTab === "overview" || activeTab === "about") && (
          <div className="user-sidebar">
            {/* Quick Bio */}
            <section className="bio-card">
              <h3>📝 Bio</h3>
              <p>{userInfo.bio?.slice(0, 120) || "No bio yet..."}
                {userInfo.bio?.length > 120 && "..."}
              </p>
              {userInfo.bio?.length > 120 && (
                <button className="read-more-btn" onClick={() => setActiveTab("about")}>
                  Read More
                </button>
              )}
            </section>

            {/* Stats Card */}
            <section className="stats-card">
              <h3>📊 Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-number">{formatNumber(userStats.followers)}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{formatNumber(userStats.following)}</span>
                  <span className="stat-label">Following</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{userStats.playlists}</span>
                  <span className="stat-label">Playlists</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{formatNumber(userStats.likedTracks)}</span>
                  <span className="stat-label">Liked</span>
                </div>
              </div>
            </section>

            {/* Inner Circle Preview */}
            {innerCircle.length > 0 && (
              <section className="circle-preview-card">
                <h3>⭐ Inner Circle</h3>
                <div className="circle-preview">
                  {innerCircle.slice(0, 5).map((member, index) => (
                    <Link 
                      key={member.id || index}
                      to={`/user/${member.username || member.id}`}
                      className="circle-avatar"
                      title={member.display_name || member.username}
                    >
                      {member.profile_picture || member.avatar_url ? (
                        <img src={member.profile_picture || member.avatar_url} alt="" />
                      ) : (
                        <span>👤</span>
                      )}
                    </Link>
                  ))}
                  {innerCircle.length > 5 && (
                    <button 
                      className="more-circle"
                      onClick={() => setActiveTab("circle")}
                    >
                      +{innerCircle.length - 5}
                    </button>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearchProfilePage;