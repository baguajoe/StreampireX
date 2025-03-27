import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import EarningsPage from "../component/EarningsPage.js"; // Import the EarningsPage component

const CreatorDashboard = () => {
  const [profile, setProfile] = useState({ username: "", email: "", profile_picture: "", subscription: "Free" });
  const [podcasts, setPodcasts] = useState([]);
  const [radioStations, setRadioStations] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [shareStats, setShareStats] = useState({});

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/user/profile`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(console.error);

    fetch(`${process.env.BACKEND_URL}/api/my-podcasts`)
      .then((res) => res.json())
      .then(setPodcasts)
      .catch(console.error);

    fetch(`${process.env.BACKEND_URL}/api/my-radio-stations`)
      .then((res) => res.json())
      .then(setRadioStations)
      .catch(console.error);

    fetch(`${process.env.BACKEND_URL}/api/my-live-streams`)
      .then((res) => res.json())
      .then(setLiveStreams)
      .catch(console.error);

    fetch(`${process.env.BACKEND_URL}/api/share-stats`)
      .then((res) => res.json())
      .then(setShareStats)
      .catch(console.error);
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
        return;
    }
    trackShare(contentId, type);
    window.open(shareUrl, "_blank");
  };

  const trackShare = (contentId, type) => {
    fetch(`${process.env.BACKEND_URL}/api/track-share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ content_id: contentId, content_type: type }),
    })
      .then((res) => res.json())
      .then(setShareStats)
      .catch(console.error);
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

      {/* Earnings Page */}
      <EarningsPage />

      <h2>📊 Share Analytics</h2>
      <Bar
        data={{
          labels: ["Podcasts", "Radio Stations", "Live Streams"],
          datasets: [
            {
              label: "Shares",
              data: [shareStats.podcasts || 0, shareStats.radioStations || 0, shareStats.liveStreams || 0],
              backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
            },
          ],
        }}
      />

      {/* Podcasts */}
      <section className="dashboard-section">
        <h2>🎙 My Podcasts</h2>
        <div className="content-list">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="content-card">
              <h3>{podcast.name}</h3>
              <p>🔗 Shares: {podcast.shares || 0}</p>
              <button onClick={() => shareOnSocialMedia("facebook", `https://yourapp.com/podcast/${podcast.id}`, podcast.name, podcast.id, "podcast")}>📘 Facebook</button>
              <button onClick={() => shareOnSocialMedia("twitter", `https://yourapp.com/podcast/${podcast.id}`, podcast.name, podcast.id, "podcast")}>🐦 Twitter</button>
            </div>
          ))}
        </div>
      </section>

      {/* Radio */}
      <section className="dashboard-section">
        <h2>📻 My Radio Stations</h2>
        <div className="content-list">
          {radioStations.map((station) => (
            <div key={station.id} className="content-card">
              <h3>{station.name}</h3>
              <p>🔗 Shares: {station.shares || 0}</p>
              <button onClick={() => shareOnSocialMedia("facebook", `https://yourapp.com/radio-stations/${station.id}`, station.name, station.id, "radio")}>📘 Facebook</button>
              <button onClick={() => shareOnSocialMedia("twitter", `https://yourapp.com/radio-stations/${station.id}`, station.name, station.id, "radio")}>🐦 Twitter</button>
            </div>
          ))}
        </div>
      </section>

      {/* Live Streams */}
      <section className="dashboard-section">
        <h2>🎥 My Live Streams</h2>
        <div className="content-list">
          {liveStreams.map((stream) => (
            <div key={stream.id} className="content-card">
              <h3>{stream.title}</h3>
              <p>🔗 Shares: {stream.shares || 0}</p>
              <button onClick={() => shareOnSocialMedia("facebook", `https://yourapp.com/live-streams/${stream.id}`, stream.title, stream.id, "live")}>📘 Facebook</button>
              <button onClick={() => shareOnSocialMedia("twitter", `https://yourapp.com/live-streams/${stream.id}`, stream.title, stream.id, "live")}>🐦 Twitter</button>
            </div>
          ))}
        </div>
      </section>

      {/* Links to other dashboards */}
      <section className="dashboard-links">
        <Link to="/dashboard/podcasts"><button>🎙 Go to Podcast Dashboard</button></Link>
        <Link to="/dashboard/radio"><button>📻 Manage Radio Station</button></Link>
        <Link to="/live-studio"><button>🎥 Launch Live Studio</button></Link>
      </section>
    </div>
  );
};

export default CreatorDashboard;
