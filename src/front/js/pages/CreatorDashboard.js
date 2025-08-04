import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Doughnut, Line } from "react-chartjs-2";
import "chart.js/auto";
import "../../styles/creatorDashboard.css";

const CreatorDashboard = () => {
  const [profile, setProfile] = useState({
    username: "Loading...",
    email: "",
    profile_picture: "",
    subscription: "Pro Creator",
    totalEarnings: 0,
    totalFollowers: 0,
    totalContent: 0
  });

  const [overviewStats, setOverviewStats] = useState({
    totalShares: 0,
    totalViews: 0,
    totalPlays: 0,
    monthlyGrowth: 0
  });

  const [contentBreakdown, setContentBreakdown] = useState({
    podcasts: 0,
    radioStations: 0,
    musicTracks: 0,
    liveStreams: 0
  });

  const [recentActivity, setRecentActivity] = useState([
    { type: "podcast", title: "Tech Talk", action: "published", time: "2 hours ago" },
    { type: "music", title: "Chill Beats", action: "uploaded", time: "1 day ago" },
    { type: "radio", title: "Jazz FM", action: "went live", time: "2 days ago" },
    { type: "livestream", title: "AMA", action: "streamed", time: "3 days ago" }
  ]);

  const [socialShares, setSocialShares] = useState({
    facebook: 0,
    twitter: 0,
    instagram: 0,
    tiktok: 0
  });

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const token = localStorage.getItem("token");

        const profileRes = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(prev => ({ ...prev, ...profileData }));
        }

        const statsRes = await fetch(`${process.env.BACKEND_URL}/api/creator/overview-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setOverviewStats(statsData);
        }

        const contentRes = await fetch(`${process.env.BACKEND_URL}/api/creator/content-breakdown`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setContentBreakdown(contentData);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchOverviewData();
  }, []);

  const shareBreakdownData = {
    labels: ['Facebook', 'Twitter', 'Instagram', 'TikTok'],
    datasets: [{
      data: [
        socialShares.facebook || 0,
        socialShares.twitter || 0,
        socialShares.instagram || 0,
        socialShares.tiktok || 0
      ],
      backgroundColor: ['#1877F2', '#1DA1F2', '#E4405F', '#000000'],
      borderWidth: 0
    }]
  };

  const contentBreakdownData = {
    labels: ['Podcasts', 'Radio Stations', 'Music Tracks', 'Live Streams'],
    datasets: [{
      data: [
        contentBreakdown.podcasts || 0,
        contentBreakdown.radioStations || 0,
        contentBreakdown.musicTracks || 0,
        contentBreakdown.liveStreams || 0
      ],
      backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      borderWidth: 0
    }]
  };

  const monthlyGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Total Engagement',
      data: [1200, 1900, 3000, 5000, 7000, 8956],
      borderColor: '#45B7D1',
      backgroundColor: 'rgba(69, 183, 209, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'podcast': return '🎙️';
      case 'music': return '🎵';
      case 'radio': return '📻';
      case 'livestream': return '🎥';
      default: return '📝';
    }
  };

  return (
    <div className="creator-dashboard">
      <header className="dashboard-header">
        <div className="creator-profile-overview">
          <img
            src={profile.profile_picture || "https://via.placeholder.com/80"}
            alt="Creator Profile"
            className="creator-avatar"
          />
          <div className="creator-info">
            <h1>🚀 Creator Dashboard</h1>
            <p className="creator-name">{profile.username}</p>
            <span className="subscription-badge">{profile.subscription}</span>
          </div>
        </div>
      </header>

      <section className="metrics-overview">
        <h2>📊 Overview Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card earnings">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <h3>Total Earnings</h3>
              <p className="metric-value">${profile.totalEarnings.toFixed(2)}</p>
              <span className="metric-change">+{overviewStats.monthlyGrowth}% this month</span>
            </div>
          </div>

          <div className="metric-card followers">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <h3>Total Followers</h3>
              <p className="metric-value">{profile.totalFollowers.toLocaleString()}</p>
              <span className="metric-change">Across all platforms</span>
            </div>
          </div>

          <div className="metric-card content">
            <div className="metric-icon">📝</div>
            <div className="metric-content">
              <h3>Total Content</h3>
              <p className="metric-value">{profile.totalContent}</p>
              <span className="metric-change">All types combined</span>
            </div>
          </div>

          <div className="metric-card engagement">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <h3>Total Views</h3>
              <p className="metric-value">{overviewStats.totalViews.toLocaleString()}</p>
              <span className="metric-change">All content types</span>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/podcast-create" className="action-btn podcast">
            <span className="btn-icon">🎙️</span><span>Create Podcast</span>
          </Link>
          <Link to="/upload-music" className="action-btn music">
            <span className="btn-icon">🎵</span><span>Upload Music</span>
          </Link>
          <Link to="/create-radio" className="action-btn radio">
            <span className="btn-icon">📻</span><span>Create Radio Station</span>
          </Link>
          <Link to="/live-studio" className="action-btn livestream">
            <span className="btn-icon">🎥</span><span>Go Live</span>
          </Link>
        </div>
      </section>

      <section className="analytics-section">
        <div className="charts-grid">
          <div className="chart-container">
            <h3>📱 Social Media Shares</h3>
            <Doughnut data={shareBreakdownData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>

          <div className="chart-container">
            <h3>📊 Content Breakdown</h3>
            <Doughnut data={contentBreakdownData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>

        <div className="growth-chart">
          <h3>📈 Monthly Growth Trend</h3>
          <Line data={monthlyGrowthData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      </section>

      <section className="recent-activity">
        <h2>🕒 Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="activity-icon">{getActivityIcon(activity.type)}</span>
              <div className="activity-content">
                <p><strong>{activity.title}</strong> was {activity.action}</p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-navigation">
        <h2>🎯 Specialized Dashboards</h2>
        <div className="dashboard-links">
          <Link to="/artist-dashboard" className="dashboard-link artist">
            <div className="link-icon">🎤</div>
            <div className="link-content">
              <h3>Artist Dashboard</h3>
              <p>Manage your music, tracks, and artist profile</p>
              <span className="link-stats">{contentBreakdown.musicTracks} tracks</span>
            </div>
          </Link>

          <Link to="/podcast-dashboard" className="dashboard-link podcast">
            <div className="link-icon">🎧</div>
            <div className="link-content">
              <h3>Podcast Dashboard</h3>
              <p>Create episodes, manage shows, and grow your audience</p>
              <span className="link-stats">{contentBreakdown.podcasts} episodes</span>
            </div>
          </Link>

          <Link to="/radio-dashboard" className="dashboard-link radio">
            <div className="link-icon">📻</div>
            <div className="link-content">
              <h3>Radio Dashboard</h3>
              <p>Manage your 24/7 radio stations and playlists</p>
              <span className="link-stats">{contentBreakdown.radioStations} stations</span>
            </div>
          </Link>

          <Link to="/music-distribution" className="dashboard-link distribution">
            <div className="link-icon">🌍</div>
            <div className="link-content">
              <h3>Music Distribution</h3>
              <p>Distribute to Spotify, Apple Music, and 150+ platforms</p>
              <span className="link-stats">Global reach</span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CreatorDashboard;
