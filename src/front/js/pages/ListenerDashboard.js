import React, { useEffect, useState } from "react";
import "../../styles/ListenerDashboard.css";
import { Link } from "react-router-dom";

const ListenerDashboard = () => {
  const [profile, setProfile] = useState({});
  const [followedPodcasts, setFollowedPodcasts] = useState([]);
  const [followedArtists, setFollowedArtists] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");

      const [profileRes, podcastsRes, artistsRes, likesRes] = await Promise.all([
        fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.BACKEND_URL}/api/user/followed-podcasts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.BACKEND_URL}/api/user/followed-artists`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.BACKEND_URL}/api/user/liked-tracks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [profileData, podcastsData, artistsData, likesData] = await Promise.all([
        profileRes.json(),
        podcastsRes.json(),
        artistsRes.json(),
        likesRes.json(),
      ]);

      setProfile(profileData);
      setFollowedPodcasts(podcastsData);
      setFollowedArtists(artistsData);
      setLikedTracks(likesData);
    } catch (err) {
      console.error("❌ Error fetching listener dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading-text">⏳ Loading your dashboard...</p>;

  return (
    <div className="listener-dashboard">
      <h1>🎧 Listener Dashboard</h1>

      {/* 🎭 Profile Info */}
      <div className="profile-section">
        <img
          src={profile.profile_picture || "/default-avatar.png"}
          alt="Avatar"
          className="avatar"
        />
        <div className="profile-details">
          <h2>{profile.username || "User"}</h2>
          <p>Email: {profile.email}</p>
          <p>Followers: {profile.followers_count || 0}</p>
          <p>Following: {profile.following_count || 0}</p>
        </div>
      </div>

      {/* 🎙️ Followed Podcasts */}
      <section className="dashboard-section">
        <h3>🎙️ Followed Podcasts</h3>
        <div className="content-list">
          {followedPodcasts.length === 0 ? (
            <p>You’re not following any podcasts yet.</p>
          ) : (
            followedPodcasts.map((podcast) => (
              <div key={podcast.id} className="content-card">
                <img
                  src={podcast.cover_art_url || "/default-podcast.png"}
                  alt={podcast.title}
                  className="content-img"
                />
                <h4>{podcast.title}</h4>
                <Link to={`/podcast/profile/${podcast.creator_username}/${podcast.id}`}>
                  View Podcast
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 🎤 Followed Artists */}
      <section className="dashboard-section">
        <h3>🎤 Followed Artists</h3>
        <div className="content-list">
          {followedArtists.length === 0 ? (
            <p>You’re not following any artists yet.</p>
          ) : (
            followedArtists.map((artist) => (
              <div key={artist.id} className="content-card">
                <img
                  src={artist.profile_picture || "/default-artist.png"}
                  alt={artist.username}
                  className="content-img"
                />
                <h4>{artist.username}</h4>
                <Link to={`/artist-profile/${artist.id}`}>Visit Profile</Link>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ❤️ Liked Tracks */}
      <section className="dashboard-section">
        <h3>❤️ Liked Tracks</h3>
        <div className="content-list">
          {likedTracks.length === 0 ? (
            <p>No liked tracks yet.</p>
          ) : (
            likedTracks.map((track) => (
              <div key={track.id} className="content-card">
                <h4>{track.title}</h4>
                <audio controls>
                  <source src={track.file_url} type="audio/mpeg" />
                  Your browser does not support audio playback.
                </audio>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ListenerDashboard;
