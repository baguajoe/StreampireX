import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";
import LoadingSpinner from "../component/LoadingSpinner";
import EmptyState from "../component/EmptyState";
import { showToast } from "../utils/toast";
import "../../styles/MusicDistribution.css";

const MusicDistribution = () => {
  const { store } = useContext(Context);

  // Existing state
  const [distributionStats, setDistributionStats] = useState({
    totalTracks: 0,
    platformsReached: 0,
    totalStreams: 0,
    monthlyEarnings: 0
  });

  const [pendingReleases, setPendingReleases] = useState([]);
  const [activeDistributions, setActiveDistributions] = useState([]);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dashboard button state
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // Enhanced SonoSuite Integration State
  const [userPlan, setUserPlan] = useState(null);
  const [sonosuiteStatus, setSonosuiteStatus] = useState({
    connected: false,
    loading: true,
    connection: null,
    error: null
  });
  const [planLoading, setPlanLoading] = useState(true);

  // Manual Connection Form State (fallback)
  const [showManualConnection, setShowManualConnection] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    sonosuite_email: "",
    external_id: ""
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const [submissionForm, setSubmissionForm] = useState({
    track_id: '',
    release_title: '',
    artist_name: '',
    genre: '',
    release_date: '',
    label: 'StreampireX Records',
    explicit: false,
    platforms: ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'deezer', 'tidal'],
    territories: ['worldwide']
  });

  // Streaming platforms data
  const streamingPlatforms = [
    { id: "spotify", name: "Spotify", icon: "🎵" },
    { id: "apple_music", name: "Apple Music", icon: "🍎" },
    { id: "amazon_music", name: "Amazon Music", icon: "📦" },
    { id: "youtube_music", name: "YouTube Music", icon: "▶️" },
    { id: "deezer", name: "Deezer", icon: "🎧" },
    { id: "tidal", name: "Tidal", icon: "🌊" }
  ];

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 
    'Country', 'R&B', 'Reggae', 'Folk', 'Blues', 'Alternative',
    'Indie', 'Metal', 'Punk', 'Funk', 'House', 'Techno'
  ];

  // Fetch data on component mount
  useEffect(() => {
    fetchUserPlan();
    checkSonoSuiteConnectionStatus();
    fetchDistributionData();
    fetchUserTracks();
  }, []);

  // Auto-fill external_id when user data is available
  useEffect(() => {
    if (store.user?.id) {
      setConnectionForm(prev => ({
        ...prev,
        external_id: store.user.id.toString(),
        sonosuite_email: store.user.email || prev.sonosuite_email
      }));
    }
  }, [store.user]);

  // Enhanced: Fetch user plan and check distribution access
  const fetchUserPlan = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        setUserPlan({ plan: { name: "Free", includes_music_distribution: false } });
        setPlanLoading(false);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/user/plan-status`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.status === 404) {
        setUserPlan({ 
          plan: { 
            name: "Free", 
            includes_music_distribution: false,
            sonosuite_access: false
          } 
        });
      } else if (response.ok) {
        const data = await response.json();
        setUserPlan(data);
      } else {
        setUserPlan({ 
          plan: { 
            name: "Free", 
            includes_music_distribution: false,
            sonosuite_access: false
          } 
        });
      }
    } catch (error) {
      console.error("Error fetching user plan:", error);
      setUserPlan({ 
        plan: { 
          name: "Free", 
          includes_music_distribution: false,
          sonosuite_access: false
        } 
      });
    } finally {
      setPlanLoading(false);
    }
  };

  // Dashboard button function with correct environment variable
  const goToDashboard = async (returnTo = "/dashboard") => {
    setDashboardLoading(true);
    setDashboardError(null);

    const toastId = showToast.loading('Accessing dashboard...');

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error('Please log in first');
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(
        `${backendUrl}/api/sonosuite/redirect?return_to=${encodeURIComponent(returnTo)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        showToast.success('Redirecting to dashboard...', { id: toastId });
        window.location.href = data.redirect_url;
      } else {
        throw new Error(data.error || 'Failed to access dashboard');
      }

    } catch (err) {
      setDashboardError(err.message);
      showToast.error(err.message, { id: toastId });
      console.error('Dashboard access error:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Enhanced: Check SonoSuite connection status
  const checkSonoSuiteConnectionStatus = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        setSonosuiteStatus({ connected: false, loading: false });
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/sonosuite/status`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSonosuiteStatus({
          ...data,
          loading: false
        });
      } else {
        setSonosuiteStatus({
          connected: false,
          loading: false,
          error: `HTTP ${response.status}`
        });
      }
    } catch (error) {
      console.error("Error checking SonoSuite status:", error);
      setSonosuiteStatus({
        connected: false,
        loading: false,
        error: error.message
      });
    }
  };

  // Fetch distribution data
  const fetchDistributionData = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const [statsRes, releasesRes] = await Promise.all([
        fetch(`${backendUrl}/api/distribution/stats`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${backendUrl}/api/distribution/releases`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const stats = await statsRes.json();
        setDistributionStats(stats);
      }

      if (releasesRes.ok) {
        const releases = await releasesRes.json();
        setPendingReleases(releases.pending || []);
        setActiveDistributions(releases.active || []);
      }
    } catch (error) {
      console.error("Error fetching distribution data:", error);
    }
  };

  // Fetch user tracks
  const fetchUserTracks = async () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/music/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserTracks(data || []);
      }
    } catch (error) {
      console.error('Error fetching user tracks:', error);
    }
  };

  // Enhanced: Auto-connect to SonoSuite with fallback to manual
  const connectToSonoSuite = async () => {
    setIsConnecting(true);
    const toastId = showToast.loading('Connecting to distribution system...');

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const userId = store.user?.id;
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/sonosuite/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          sonosuite_email: store.user?.email,
          external_id: userId?.toString()
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSonosuiteStatus({
          connected: true,
          loading: false,
          connection: data.connection
        });
        showToast.success("✅ Distribution system connected! You can now distribute your music globally.", { id: toastId });
        fetchDistributionData();
      } else {
        setShowManualConnection(true);
        showToast.error(`Auto-connection failed: ${data.error}. Please try manual connection.`, { id: toastId });
      }
    } catch (error) {
      console.error("Error connecting distribution system:", error);
      setShowManualConnection(true);
      showToast.error("Auto-connection failed. Please try manual connection.", { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced: Manual connection handler
  const handleManualConnect = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    const toastId = showToast.loading('Connecting to SonoSuite...');

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/sonosuite/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(connectionForm)
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success("✅ SonoSuite account connected successfully!", { id: toastId });
        setSonosuiteStatus({
          connected: true,
          connection: data.connection,
          loading: false
        });
        setConnectionForm({ sonosuite_email: "", external_id: "" });
        setShowManualConnection(false);
        fetchDistributionData();
      } else {
        showToast.error(`Connection failed: ${data.error}`, { id: toastId });
      }
    } catch (error) {
      console.error("Error connecting SonoSuite:", error);
      showToast.error("Connection failed. Please try again.", { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced: Disconnect SonoSuite
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your SonoSuite account? This will disable music distribution features.")) {
      return;
    }

    const toastId = showToast.loading('Disconnecting...');

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/sonosuite/disconnect`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        showToast.success("✅ SonoSuite account disconnected successfully!", { id: toastId });
        setSonosuiteStatus({
          connected: false,
          loading: false,
          connection: null
        });
      } else {
        const data = await response.json();
        showToast.error(`Disconnect failed: ${data.error}`, { id: toastId });
      }
    } catch (error) {
      console.error("Error disconnecting SonoSuite:", error);
      showToast.error("Disconnect failed. Please try again.", { id: toastId });
    }
  };

  // Submit music for distribution
  const handleSubmitDistribution = async (e) => {
    e.preventDefault();
    
    if (!submissionForm.track_id || !submissionForm.release_title) {
      showToast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const toastId = showToast.loading('Submitting your music for distribution...');

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/music/distribute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(submissionForm)
      });

      const data = await response.json();
      if (response.ok) {
        showToast.success('🎉 Music submitted for distribution! You\'ll receive updates as it goes live.', { id: toastId });
        setShowSubmissionForm(false);
        // Reset form
        setSubmissionForm({
          track_id: '',
          release_title: '',
          artist_name: '',
          genre: '',
          release_date: '',
          label: 'StreampireX Records',
          explicit: false,
          platforms: ['spotify', 'apple_music', 'amazon_music', 'youtube_music', 'deezer', 'tidal'],
          territories: ['worldwide']
        });
        fetchDistributionData();
      } else {
        showToast.error(data.error || 'Failed to submit distribution', { id: toastId });
      }
    } catch (error) {
      showToast.error('Network error. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformToggle = (platformId) => {
    setSubmissionForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  // Plan Selection Component
  const PlanSelectionSection = () => (
    <section className="plan-selection-section">
      <h2>🎵 Choose Your Distribution Plan</h2>
      <p>Select the plan that fits your music distribution needs</p>

      <div className="plans-grid">
        {/* Free Plan Card */}
        <div className="plan-card free">
          <h3>🆓 Free Plan</h3>
          <p className="plan-price">$0</p>
          <p className="plan-desc">Listen, follow, gaming community</p>
          <p className="plan-feature-status">❌ No music distribution</p>
          <Link to="/pricing/plans" className="plan-btn">Current Plan</Link>
        </div>

        {/* Creator Plan Card */}
        <div className="plan-card creator popular">
          <div className="popular-badge">POPULAR</div>
          <h3>⭐ Creator Plan</h3>
          <p className="plan-price">$20.99<span>/month</span></p>
          <p className="plan-desc">Upload content, livestreaming, analytics</p>
          <ul className="plan-features">
            <li>✅ Limited Music Distribution</li>
            <li>✅ SonoSuite Access</li>
            <li>✅ Create Podcasts</li>
            <li>✅ Radio Stations</li>
          </ul>
          <Link to="/pricing" className="plan-btn primary">Choose Creator Plan</Link>
        </div>

        {/* Pro Plan Card */}
        <div className="plan-card pro">
          <h3>💎 Pro Plan</h3>
          <p className="plan-price">$29.99<span>/month</span></p>
          <p className="plan-desc">Full creators, sell merch, marketplace</p>
          <ul className="plan-features">
            <li>✅ Unlimited Music Distribution</li>
            <li>✅ Digital & Merch Sales</li>
            <li>✅ Live Events</li>
            <li>✅ All Creator Features</li>
          </ul>
          <Link to="/pricing/plans" className="plan-btn">Upgrade to Pro</Link>
        </div>
      </div>

      {/* Standalone Distribution */}
      <div className="standalone-section">
        <h3>🎵 Standalone Music Distribution</h3>
        <p>Don't need other features? Get music distribution only.</p>
        <div className="standalone-options">
          <div className="standalone-option">
            <p className="option-name">Artist Distribution</p>
            <p className="option-price">$22.99/year</p>
            <Link to="/pricing/plans" className="option-btn">Choose Artist</Link>
          </div>
          <div className="standalone-option">
            <p className="option-name">Label Distribution</p>
            <p className="option-price">$74.99/year</p>
            <Link to="/pricing/plans" className="option-btn">Choose Label</Link>
          </div>
        </div>
      </div>

      <div className="plan-cta">
        <Link to="/pricing" className="cta-btn">🎯 Choose a Plan & Start Distributing</Link>
      </div>
    </section>
  );

  // Dashboard Buttons Component
  const SimpleDashboardButtons = () => (
    <section className="dashboard-section">
      <h2>📊 Quick Dashboard Access</h2>
      <p>Access your distribution dashboard with one click - no double login required!</p>

      <div className="dashboard-buttons">
        <button onClick={() => goToDashboard("/dashboard")} disabled={dashboardLoading}>
          {dashboardLoading ? '🔄 Loading...' : '📊 Dashboard'}
        </button>
        <button onClick={() => goToDashboard("/albums")} disabled={dashboardLoading}>
          📀 Albums
        </button>
        <button onClick={() => goToDashboard("/analytics")} disabled={dashboardLoading}>
          📈 Analytics
        </button>
        <button onClick={() => goToDashboard("/releases")} disabled={dashboardLoading}>
          🎵 Releases
        </button>
      </div>

      {dashboardError && (
        <div className="dashboard-error">
          ❌ {dashboardError}
        </div>
      )}
    </section>
  );

  // Connection Prompt Component
  const ConnectionPrompt = () => (
    <div className="connection-section">
      <h2>🎼 Connect Distribution System</h2>
      <p>Ready to distribute your music globally? We'll connect your StreamPireX account to our distribution network.</p>

      <div className="connection-benefits">
        <p><strong>What you'll get:</strong></p>
        <div className="benefits-grid">
          <div>🌍 Global distribution to 150+ platforms</div>
          <div>💰 Keep 100% of your royalties</div>
          <div>📊 Detailed analytics and reporting</div>
          <div>⚡ Fast 24-48 hour distribution</div>
        </div>
      </div>

      <button 
        className="connect-btn"
        onClick={connectToSonoSuite}
        disabled={isConnecting}
      >
        {isConnecting ? "🔄 Connecting..." : "🔗 Connect Distribution System"}
      </button>

      {/* Manual Connection Form */}
      {showManualConnection && (
        <div className="manual-connection-form">
          <h4>Manual Connection</h4>
          <p>If auto-connection failed, please enter your details manually:</p>
          
          <form onSubmit={handleManualConnect}>
            <div className="form-group">
              <label>SonoSuite Email:</label>
              <input 
                type="email"
                value={connectionForm.sonosuite_email}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, sonosuite_email: e.target.value }))}
                required
                placeholder="your-email@example.com"
              />
            </div>
            
            <div className="form-group">
              <label>External ID:</label>
              <input 
                type="text"
                value={connectionForm.external_id}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, external_id: e.target.value }))}
                required
                placeholder="Your user ID"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" disabled={isConnecting} className="btn-primary">
                {isConnecting ? "🔄 Connecting..." : "🔗 Connect to SonoSuite"}
              </button>
              <button type="button" onClick={() => setShowManualConnection(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  // Connected State Component
  const ConnectedState = () => (
    <div className="connected-state">
      <div className="connection-info">
        <h3>✅ Connected to StreamPireX Distribution</h3>
        <p><strong>Email:</strong> {sonosuiteStatus.connection?.sonosuite_email}</p>
        <p><strong>External ID:</strong> {sonosuiteStatus.connection?.sonosuite_external_id}</p>
        <p><strong>Connected:</strong> {new Date(sonosuiteStatus.connection?.created_at).toLocaleDateString()}</p>
        <p><strong>Plan:</strong> {userPlan?.plan?.name}</p>
      </div>

      <SimpleDashboardButtons />

      <div className="plan-management">
        <h4>🎯 Manage Your Plan</h4>
        <div className="plan-actions">
          <Link to="/pricing/plans" className="btn-view-plans">📊 View All Plans</Link>
          <Link to="/pricing/plans" className="btn-upgrade">🚀 Upgrade Plan</Link>
        </div>
        <p>Current Plan: <strong>{userPlan?.plan?.name || 'Loading...'}</strong></p>
        <button onClick={handleDisconnect} className="btn-disconnect">
          🔌 Disconnect StreamPireX
        </button>
      </div>
    </div>
  );

  // Distribution Stats Component
  const DistributionStatsSection = () => (
    <section className="distribution-stats">
      <h2>📊 Your Distribution Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-content">
            <h3>{distributionStats.totalTracks}</h3>
            <p>Total Tracks</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-content">
            <h3>{distributionStats.platformsReached}</h3>
            <p>Platforms</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{distributionStats.totalStreams.toLocaleString()}</h3>
            <p>Total Streams</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>${distributionStats.monthlyEarnings.toFixed(2)}</h3>
            <p>Monthly Earnings</p>
          </div>
        </div>
      </div>
    </section>
  );

  // Music Submission Form
  const MusicSubmissionForm = () => (
    <div className="submission-overlay">
      <div className="submission-form">
        <div className="form-header">
          <h2>🎵 Submit Music for Distribution</h2>
          <button className="close-btn" onClick={() => setShowSubmissionForm(false)}>✕</button>
        </div>
        
        <form onSubmit={handleSubmitDistribution}>
          <div className="form-group">
            <label>Select Track *</label>
            <select
              value={submissionForm.track_id}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, track_id: e.target.value }))}
              required
            >
              <option value="">Choose a track...</option>
              {userTracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.title || track.filename}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Release Title *</label>
              <input
                type="text"
                value={submissionForm.release_title}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, release_title: e.target.value }))}
                required
                placeholder="Your Song Title"
              />
            </div>

            <div className="form-group">
              <label>Artist Name *</label>
              <input
                type="text"
                value={submissionForm.artist_name}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, artist_name: e.target.value }))}
                required
                placeholder="Your Artist Name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Genre *</label>
              <select
                value={submissionForm.genre}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, genre: e.target.value }))}
                required
              >
                <option value="">Select genre...</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Release Date *</label>
              <input
                type="date"
                value={submissionForm.release_date}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, release_date: e.target.value }))}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              value={submissionForm.label}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="StreampireX Records"
            />
          </div>

          <div className="form-group">
            <label>Select Platforms</label>
            <div className="platforms-grid">
              {streamingPlatforms.map(platform => (
                <label key={platform.id} className="platform-checkbox">
                  <input
                    type="checkbox"
                    checked={submissionForm.platforms.includes(platform.id)}
                    onChange={() => handlePlatformToggle(platform.id)}
                  />
                  <span className="platform-label">
                    <span className="platform-icon">{platform.icon}</span>
                    {platform.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={submissionForm.explicit}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, explicit: e.target.checked }))}
              />
              <span>Contains explicit content</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '🔄 Submitting...' : '🚀 Submit for Distribution'}
            </button>
            <button type="button" onClick={() => setShowSubmissionForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Active Releases Section
  const ActiveReleasesSection = () => (
    <section className="active-distributions">
      <div className="section-header">
        <h2>🎵 Your Active Releases</h2>
        {sonosuiteStatus.connected && userPlan?.plan?.includes_music_distribution && (
          <button onClick={() => setShowSubmissionForm(true)} className="submit-release-btn">
            🚀 Submit New Release
          </button>
        )}
      </div>

      {activeDistributions.length > 0 ? (
        <div className="distributions-grid">
          {activeDistributions.map(dist => (
            <div key={dist.id} className="distribution-card">
              <div className="card-header">
                <h3>{dist.title}</h3>
                <span className="status-badge live">● Live</span>
              </div>
              <p className="artist-name">{dist.artist_name}</p>
              <div className="distribution-stats">
                <div className="stat">
                  <span className="stat-label">Platforms:</span>
                  <span className="stat-value">{dist.platforms?.length || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Streams:</span>
                  <span className="stat-value">{dist.streams?.toLocaleString() || '0'}</span>
                </div>
              </div>
              <button className="btn-view">📊 View Analytics</button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🎵"
          title="No active releases yet"
          message="Submit your first track to get started!"
          actionText="Submit Track"
          onAction={() => setShowSubmissionForm(true)}
        />
      )}
    </section>
  );

  // Show loading state
  if (planLoading || sonosuiteStatus.loading) {
    return <LoadingSpinner message="Loading your distribution status..." fullScreen />;
  }

  // Main render
  return (
    <div className="music-distribution">
      {/* Header */}
      <header className="distribution-header">
        <h1>🎵 Global Music Distribution</h1>
        <p>Distribute your music to 150+ platforms worldwide with StreamPireX</p>
      </header>

      {/* Conditional Rendering Based on Plan and Connection Status */}
      {!userPlan?.plan?.includes_music_distribution ? (
        <PlanSelectionSection />
      ) : !sonosuiteStatus.connected ? (
        <ConnectionPrompt />
      ) : (
        <>
          <ConnectedState />
          <DistributionStatsSection />
          <ActiveReleasesSection />
        </>
      )}

      {/* Pending Releases */}
      {pendingReleases.length > 0 && (
        <section className="pending-section">
          <h2>⏳ Pending Releases</h2>
          <div className="pending-list">
            {pendingReleases.map(release => (
              <div key={release.id} className="pending-card">
                <div className="pending-info">
                  <h4>{release.title}</h4>
                  <p>{release.artist_name}</p>
                </div>
                <span className="status-badge pending">Processing</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submission Form Modal */}
      {showSubmissionForm && <MusicSubmissionForm />}
    </div>
  );
};

export default MusicDistribution;