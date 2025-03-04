import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

const CreatorDashboard = () => {
  const [profile, setProfile] = useState({ username: "", email: "", profile_picture: "", subscription: "Free", social_links: {} });
  const [podcasts, setPodcasts] = useState([]);
  const [radioStations, setRadioStations] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [shareStats, setShareStats] = useState({});

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/user/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => console.error("Error fetching profile:", err));

    fetch(process.env.BACKEND_URL + "/api/my-podcasts")
      .then((res) => res.json())
      .then((data) => setPodcasts(data))
      .catch((err) => console.error("Error fetching podcasts:", err));

    fetch(process.env.BACKEND_URL + "/api/my-radio-stations")
      .then((res) => res.json())
      .then((data) => setRadioStations(data))
      .catch((err) => console.error("Error fetching radio stations:", err));

    fetch(process.env.BACKEND_URL + "/api/my-live-streams")
      .then((res) => res.json())
      .then((data) => setLiveStreams(data))
      .catch((err) => console.error("Error fetching live streams:", err));

    fetch(process.env.BACKEND_URL + "/api/share-stats")
      .then((res) => res.json())
      .then((data) => setShareStats(data))
      .catch((err) => console.error("Error fetching share stats:", err));
  }, []);

  const shareOnSocialMedia = (platform, url, title, contentId, type) => {
    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        break;
    }
    trackShare(contentId, type);
    window.open(shareUrl, "_blank");
  };

  const trackShare = (contentId, type) => {
    fetch(process.env.BACKEND_URL + "/api/track-share", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ content_id: contentId, content_type: type })
    })
    .then((res) => res.json())
    .then((data) => setShareStats(data))
    .catch((err) => console.error("Error tracking share:", err));
  };

  return (
    <div className="creator-dashboard">
      <h1>🚀 Creator Dashboard</h1>
      <div className="profile-overview">
        <img src={profile.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />
        <h2>{profile.username}</h2>
        <p>Email: {profile.email}</p>
        <p>Subscription: {profile.subscription}</p>
      </div>
      
      <h2>📊 Share Analytics</h2>
      <Bar
        data={{
          labels: ["Podcasts", "Radio Stations", "Live Streams"],
          datasets: [{
            label: "Shares",
            data: [shareStats.podcasts || 0, shareStats.radioStations || 0, shareStats.liveStreams || 0],
            backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"]
          }]
        }}
      />
      
      <section className="dashboard-section">
        <h2>🎙 My Podcasts</h2>
        <div className="content-list">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="content-card">
              <h3>{podcast.name}</h3>
              <p>🔗 Shares: {podcast.shares || 0}</p>
              <button onClick={() => shareOnSocialMedia("facebook", `https://yourapp.com/podcasts/${podcast.id}`, podcast.name, podcast.id, "podcast")}>📘 Share on Facebook</button>
              <button onClick={() => shareOnSocialMedia("twitter", `https://yourapp.com/podcasts/${podcast.id}`, podcast.name, podcast.id, "podcast")}>🐦 Share on Twitter</button>
            </div>
          ))}
        </div>
      </section>
      
      <section className="dashboard-section">
        <h2>📻 My Radio Stations</h2>
        <div className="content-list">
          {radioStations.map((station) => (
            <div key={station.id} className="content-card">
              <h3>{station.name}</h3>
              <p>🔗 Shares: {station.shares || 0}</p>
              <button onClick={() => shareOnSocialMedia("facebook", `https://yourapp.com/radio-stations/${station.id}`, station.name, station.id, "radio")}>📘 Share on Facebook</button>
              <button onClick={() => shareOnSocialMedia("twitter", `https://yourapp.com/radio-stations/${station.id}`, station.name, station.id, "radio")}>🐦 Share on Twitter</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CreatorDashboard;
