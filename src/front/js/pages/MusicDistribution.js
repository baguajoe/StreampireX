import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../styles/MusicDistribution.css";

const MusicDistribution = () => {
  const [distributionStats, setDistributionStats] = useState({
    totalTracks: 0,
    platformsReached: 0,
    totalStreams: 0,
    monthlyEarnings: 0
  });

  const [pendingReleases, setPendingReleases] = useState([]);
  const [activeDistributions, setActiveDistributions] = useState([]);
  
  const streamingPlatforms = [
    { name: "Spotify", icon: "🎵", status: "active", streams: 45672 },
    { name: "Apple Music", icon: "🍎", status: "active", streams: 32451 },
    { name: "YouTube Music", icon: "📺", status: "active", streams: 28934 },
    { name: "Amazon Music", icon: "📦", status: "active", streams: 19876 },
    { name: "Deezer", icon: "🎧", status: "active", streams: 15432 },
    { name: "Tidal", icon: "🌊", status: "active", streams: 8965 },
    { name: "SoundCloud", icon: "☁️", status: "active", streams: 12543 },
    { name: "Pandora", icon: "📻", status: "active", streams: 9876 }
  ];

  const socialPlatforms = [
    { name: "TikTok", icon: "🎪", status: "active", reach: "2.1M" },
    { name: "Instagram", icon: "📸", status: "active", reach: "890K" },
    { name: "Facebook", icon: "📘", status: "active", reach: "1.2M" },
    { name: "YouTube Content ID", icon: "🆔", status: "active", reach: "3.4M" },
    { name: "Snapchat", icon: "👻", status: "pending", reach: "0" },
    { name: "Twitter/X", icon: "🐦", status: "active", reach: "456K" }
  ];

  const distributionProcess = [
    {
      step: 1,
      title: "Upload Your Music",
      description: "Upload high-quality audio files (WAV/FLAC), cover art, and metadata",
      icon: "⬆️"
    },
    {
      step: 2,
      title: "Quality Review",
      description: "StreampireX reviews your content for technical and content standards",
      icon: "🔍"
    },
    {
      step: 3,
      title: "Global Distribution",
      description: "Your music goes live on 150+ platforms through StreampireX's network within 24-48 hours",
      icon: "🌍"
    },
    {
      step: 4,
      title: "Monetization & Analytics",
      description: "Track performance through StreampireX analytics, collect royalties, and monitor global reach",
      icon: "📊"
    }
  ];

  useEffect(() => {
    // Fetch distribution data
    const fetchDistributionData = async () => {
      try {
        const statsRes = await fetch(`${process.env.BACKEND_URL}/api/distribution/stats`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setDistributionStats(statsData);
        }

        const releasesRes = await fetch(`${process.env.BACKEND_URL}/api/distribution/releases`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (releasesRes.ok) {
          const releasesData = await releasesRes.json();
          setPendingReleases(releasesData.pending || []);
          setActiveDistributions(releasesData.active || []);
        }
      } catch (error) {
        console.error("Error fetching distribution data:", error);
      }
    };

    fetchDistributionData();
  }, []);

  return (
    <div className="music-distribution">
      <header className="distribution-header">
        <h1>🌍 StreampireX Global Distribution</h1>
        <p>Distribute your music worldwide through StreampireX's integrated platform and reach millions of listeners</p>
        <Link to="/upload-music" className="cta-button">
          📤 Upload & Distribute Music
        </Link>
      </header>

      {/* Distribution Stats */}
      <section className="distribution-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎵</div>
            <div className="stat-content">
              <h3>{distributionStats.totalTracks}</h3>
              <p>Tracks Distributed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <h3>{distributionStats.platformsReached}</h3>
              <p>Platforms Reached</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">▶️</div>
            <div className="stat-content">
              <h3>{distributionStats.totalStreams.toLocaleString()}</h3>
              <p>Total Streams</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>${distributionStats.monthlyEarnings}</h3>
              <p>Monthly Earnings</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2>🚀 How StreampireX Distribution Works</h2>
        <div className="process-steps">
          {distributionProcess.map((step) => (
            <div key={step.step} className="process-step">
              <div className="step-number">{step.step}</div>
              <div className="step-icon">{step.icon}</div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Streaming Platforms */}
      <section className="platforms-section">
        <h2>🎵 StreampireX Streaming Network</h2>
        <div className="platforms-grid">
          {streamingPlatforms.map((platform, index) => (
            <div key={index} className="platform-card">
              <div className="platform-header">
                <span className="platform-icon">{platform.icon}</span>
                <span className="platform-name">{platform.name}</span>
                <span className={`status-badge ${platform.status}`}>
                  {platform.status === 'active' ? '✅' : '⏳'}
                </span>
              </div>
              <div className="platform-stats">
                <p>{platform.streams.toLocaleString()} streams</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Platforms */}
      <section className="social-platforms-section">
        <h2>📱 StreampireX Social Network</h2>
        <div className="platforms-grid">
          {socialPlatforms.map((platform, index) => (
            <div key={index} className="platform-card social">
              <div className="platform-header">
                <span className="platform-icon">{platform.icon}</span>
                <span className="platform-name">{platform.name}</span>
                <span className={`status-badge ${platform.status}`}>
                  {platform.status === 'active' ? '✅' : '⏳'}
                </span>
              </div>
              <div className="platform-stats">
                <p>{platform.reach} reach</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Releases */}
      {pendingReleases.length > 0 && (
        <section className="pending-releases">
          <h2>⏳ Pending Releases</h2>
          <div className="releases-list">
            {pendingReleases.map((release, index) => (
              <div key={index} className="release-card pending">
                <div className="release-info">
                  <h3>{release.title}</h3>
                  <p>by {release.artist}</p>
                  <span className="release-date">Expected: {release.expectedDate}</span>
                </div>
                <div className="release-status">
                  <span className="status-indicator">🔄</span>
                  <p>{release.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Distributions */}
      <section className="active-distributions">
        <h2>✅ Active Distributions</h2>
        {activeDistributions.length > 0 ? (
          <div className="releases-list">
            {activeDistributions.map((release, index) => (
              <div key={index} className="release-card active">
                <img 
                  src={release.coverArt || "/api/placeholder/60/60"} 
                  alt={release.title}
                  className="release-cover"
                />
                <div className="release-info">
                  <h3>{release.title}</h3>
                  <p>by {release.artist}</p>
                  <span className="release-date">Released: {release.releaseDate}</span>
                </div>
                <div className="release-stats">
                  <p>{release.totalStreams?.toLocaleString() || 0} total streams</p>
                  <p>${release.earnings || 0} earned</p>
                </div>
                <div className="release-actions">
                  <Link to={`/analytics/${release.id}`} className="btn-secondary">
                    📊 View Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>🎵 No active distributions yet</h3>
            <p>Upload your first track to start distributing globally!</p>
            <Link to="/upload-music" className="btn-primary">
              📤 Upload Music
            </Link>
          </div>
        )}
      </section>

      {/* Features & Benefits */}
      <section className="features-benefits">
        <h2>✨ StreampireX Distribution Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Fast Release</h3>
            <p>Get your music live on major platforms through StreampireX in 24-48 hours</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Performance Royalties</h3>
            <p>Collect royalties from radio, streaming, and live venues through PROs</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Advanced Analytics</h3>
            <p>Monitor streams, revenue, demographics through StreampireX analytics across all platforms</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Content Protection</h3>
            <p>YouTube Content ID and copyright protection through StreampireX included</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Global Reach</h3>
            <p>Distribute to 150+ platforms in 200+ countries through StreampireX's global network</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Social Integration</h3>
            <p>Automatic distribution to TikTok, Instagram, and social platforms via StreampireX</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>🎤 Ready to Share Your Music with the World?</h2>
          <p>Join thousands of artists distributing their music globally through StreampireX</p>
          <div className="cta-buttons">
            <Link to="/upload-music" className="btn-primary large">
              📤 Start Distributing
            </Link>
            <Link to="/distribution-pricing" className="btn-secondary large">
              💲 View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MusicDistribution;