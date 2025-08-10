// Enhanced MusicDistribution.js with full SonoSuite Integration

import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";
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
      description: "Upload high-quality audio files (WAV/FLAC), cover art, and metadata to StreampireX",
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

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 
    'Country', 'R&B', 'Reggae', 'Folk', 'Blues', 'Alternative',
    'Indie', 'Metal', 'Punk', 'Funk', 'House', 'Techno'
  ];

  useEffect(() => {
    checkUserPlanAndAccess();
    fetchDistributionData();
    fetchUserTracks();
  }, []);

  // Enhanced: Check user plan and SonoSuite access
  const checkUserPlanAndAccess = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Check user's plan status
      const planResponse = await fetch(`${process.env.BACKEND_URL}/api/user/plan-status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (planResponse.ok) {
        const planData = await planResponse.json();
        setUserPlan(planData);

        // If user has music distribution access, check SonoSuite status
        if (planData.plan?.includes_music_distribution) {
          await checkSonoSuiteConnectionStatus();
        } else {
          setSonosuiteStatus({ connected: false, loading: false });
        }
      }
    } catch (error) {
      console.error("Error checking plan and access:", error);
      setSonosuiteStatus({ connected: false, loading: false, error: true });
    } finally {
      setPlanLoading(false);
    }
  };

  // Enhanced: Check SonoSuite connection status
  const checkSonoSuiteConnectionStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.BACKEND_URL}/api/sonosuite/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const data = await response.json();
      setSonosuiteStatus({
        ...data,
        loading: false
      });
    } catch (error) {
      console.error("Error checking SonoSuite status:", error);
      setSonosuiteStatus({
        connected: false,
        loading: false,
        error: "Failed to check connection status"
      });
    }
  };

  // Enhanced: Auto-connect to SonoSuite with fallback to manual
  const connectToSonoSuite = async () => {
    setIsConnecting(true);
    try {
      const token = localStorage.getItem("token");
      const userId = store.user?.id;
      
      const response = await fetch(`${process.env.BACKEND_URL}/api/sonosuite/connect`, {
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
        alert("✅ Distribution system connected! You can now distribute your music globally.");
        
        // Refresh distribution data after connecting
        fetchDistributionData();
      } else {
        // Show manual connection form if auto-connect fails
        setShowManualConnection(true);
        alert(`⚠️ Auto-connection failed: ${data.error}. Please try manual connection.`);
      }
    } catch (error) {
      console.error("Error connecting distribution system:", error);
      setShowManualConnection(true);
      alert("⚠️ Auto-connection failed. Please try manual connection.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced: Manual connection handler
  const handleManualConnect = async (e) => {
    e.preventDefault();
    setIsConnecting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.BACKEND_URL}/api/sonosuite/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(connectionForm)
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ SonoSuite account connected successfully!");
        setSonosuiteStatus({
          connected: true,
          connection: data.connection,
          loading: false
        });
        setConnectionForm({ sonosuite_email: "", external_id: "" });
        setShowManualConnection(false);
        fetchDistributionData();
      } else {
        alert(`❌ Connection failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error connecting SonoSuite:", error);
      alert("❌ Connection failed. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Enhanced: Disconnect SonoSuite
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your SonoSuite account? This will disable music distribution features.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.BACKEND_URL}/api/sonosuite/disconnect`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        alert("✅ SonoSuite account disconnected successfully!");
        setSonosuiteStatus({
          connected: false,
          loading: false,
          connection: null
        });
      } else {
        const data = await response.json();
        alert(`❌ Disconnect failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error disconnecting SonoSuite:", error);
      alert("❌ Disconnect failed. Please try again.");
    }
  };

  // Enhanced: Open SonoSuite sections with SSO
  const openDistributionTool = async (section, label = "distribution tool") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.BACKEND_URL}/api/sonosuite/redirect?return_to=${encodeURIComponent(section)}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      const data = await response.json();
      if (response.ok) {
        // Open in same tab for seamless experience
        window.location.href = data.redirect_url;
      } else {
        alert(`❌ Unable to access ${label}: ${data.error}`);
      }
    } catch (error) {
      console.error(`Error opening ${label}:`, error);
      alert(`❌ Unable to access ${label}. Please try again.`);
    }
  };

  // Enhanced: Open SonoSuite in new tab (alternative method)
  const redirectToSonoSuite = async (returnTo = "/albums") => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.BACKEND_URL}/api/sonosuite/redirect?return_to=${encodeURIComponent(returnTo)}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );

      const data = await response.json();

      if (response.ok) {
        // Redirect to SonoSuite with JWT in new tab
        window.open(data.redirect_url, '_blank');
      } else {
        alert(`❌ Redirect failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error redirecting to SonoSuite:", error);
      alert("❌ Redirect failed. Please try again.");
    }
  };

  const fetchDistributionData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch distribution stats
      const statsRes = await fetch(`${process.env.BACKEND_URL}/api/distribution/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDistributionStats(statsData);
      }

      // Fetch releases
      const releasesRes = await fetch(`${process.env.BACKEND_URL}/api/distribution/releases`, {
        headers: { Authorization: `Bearer ${token}` }
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

  const fetchUserTracks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.BACKEND_URL}/user/audio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserTracks(data.audio || []);
      }
    } catch (error) {
      console.error('Error fetching user tracks:', error);
    }
  };

  const handleSubmitDistribution = async () => {
    if (!submissionForm.track_id || !submissionForm.release_title || !submissionForm.artist_name || !submissionForm.genre) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if SonoSuite is connected
    if (!sonosuiteStatus.connected) {
      alert('Please connect to the distribution system first');
      return;
    }

    try {
      setLoading(true);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.BACKEND_URL}/api/distribution/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submissionForm)
      });

      const data = await response.json();

      if (response.ok) {
        alert('🎉 Your music has been submitted for global distribution! You\'ll receive updates as it goes live on platforms.');
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
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
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

  // Enhanced: Plan upgrade prompt component
  const PlanUpgradePrompt = () => (
    <div className="upgrade-section" style={{
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      color: 'white',
      padding: '3rem',
      borderRadius: '15px',
      textAlign: 'center',
      marginBottom: '2rem'
    }}>
      <h2>🎵 Unlock Global Music Distribution</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Distribute your music to 150+ platforms including Spotify, Apple Music, Amazon Music, and more!
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div>✅ Global music distribution</div>
        <div>✅ Keep 100% of your royalties</div>
        <div>✅ Detailed analytics and reporting</div>
        <div>✅ Release scheduling</div>
        <div>✅ Social media integration</div>
        <div>✅ YouTube Content ID protection</div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/pricing" className="btn-primary large" style={{ background: 'white', color: '#667eea' }}>
          Upgrade to Pro - $21.99/month
        </Link>
        <Link to="/pricing/plans" className="btn-secondary large" style={{ borderColor: 'white', color: 'white' }}>
          View All Plans
        </Link>
      </div>
    </div>
  );

  // Enhanced: SonoSuite connection prompt with manual fallback
  const ConnectionPrompt = () => (
    <div className="connection-section" style={{
      background: 'white',
      border: '2px solid #28a745',
      borderRadius: '15px',
      padding: '2rem',
      marginBottom: '2rem',
      textAlign: 'center'
    }}>
      <h2>🎼 Connect Distribution System</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Ready to distribute your music globally? We'll connect your StreampireX account to our distribution network.
      </p>
      
      <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <p><strong>Your Email:</strong> {store.user?.email}</p>
        <p><strong>Distribution Limit:</strong> {
          userPlan?.plan?.distribution_uploads_limit === -1 
            ? "Unlimited" 
            : `${userPlan?.plan?.distribution_uploads_limit} tracks/month`
        }</p>
        <p><strong>Remaining This Month:</strong> {
          userPlan?.music_uploads?.remaining === "unlimited" 
            ? "Unlimited" 
            : userPlan?.music_uploads?.remaining || 0
        }</p>
      </div>

      {!showManualConnection ? (
        <div>
          <button 
            className="btn-primary large"
            onClick={connectToSonoSuite}
            disabled={isConnecting}
            style={{ fontSize: '1.1rem', marginBottom: '1rem' }}
          >
            {isConnecting ? "🔄 Connecting..." : "🔗 Auto-Connect & Start Distributing"}
          </button>
          
          <div>
            <button 
              onClick={() => setShowManualConnection(true)}
              style={{ background: 'none', border: 'none', color: '#6c757d', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Or connect manually
            </button>
          </div>
        </div>
      ) : (
        <div className="manual-connection-form">
          <h3>Manual SonoSuite Connection</h3>
          <p>Connect your existing SonoSuite account or we'll create one for you.</p>
          
          <form onSubmit={handleManualConnect} style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <label htmlFor="sonosuite_email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                SonoSuite Email:
              </label>
              <input
                type="email"
                id="sonosuite_email"
                value={connectionForm.sonosuite_email}
                onChange={(e) => setConnectionForm({
                  ...connectionForm,
                  sonosuite_email: e.target.value
                })}
                required
                placeholder="your-email@example.com"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label htmlFor="external_id" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Your StreampireX User ID:
              </label>
              <input
                type="text"
                id="external_id"
                value={connectionForm.external_id}
                onChange={(e) => setConnectionForm({
                  ...connectionForm,
                  external_id: e.target.value
                })}
                required
                placeholder={store.user?.id?.toString() || "Your unique ID"}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <small style={{ color: '#6c757d' }}>This will be auto-filled based on your account</small>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={isConnecting}
              >
                {isConnecting ? "🔄 Connecting..." : "🔗 Connect to SonoSuite"}
              </button>
              
              <button 
                type="button"
                onClick={() => setShowManualConnection(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  // Enhanced: Connected state component
  const ConnectedState = () => (
    <div className="connected-state" style={{
      background: '#d4edda',
      border: '1px solid #c3e6cb',
      borderRadius: '15px',
      padding: '2rem',
      marginBottom: '2rem'
    }}>
      <div className="connection-info" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3>✅ Connected to SonoSuite Distribution</h3>
        <p><strong>Email:</strong> {sonosuiteStatus.connection?.sonosuite_email}</p>
        <p><strong>External ID:</strong> {sonosuiteStatus.connection?.sonosuite_external_id}</p>
        <p><strong>Connected:</strong> {new Date(sonosuiteStatus.connection?.created_at).toLocaleDateString()}</p>
        <p><strong>Plan:</strong> {userPlan?.plan?.name}</p>
      </div>

      <div className="sonosuite-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button 
          className="btn-primary"
          onClick={() => openDistributionTool('/releases/create', 'upload tool')}
        >
          🚀 Upload New Release
        </button>
        
        <button 
          className="btn-secondary"
          onClick={() => redirectToSonoSuite('/albums')}
        >
          🎵 Open SonoSuite Albums
        </button>
        
        <button 
          className="btn-secondary"
          onClick={() => redirectToSonoSuite('/releases')}
        >
          📀 View Releases
        </button>
        
        <button 
          className="btn-secondary"
          onClick={() => redirectToSonoSuite('/analytics')}
        >
          📊 Analytics Dashboard
        </button>
      </div>

      <div className="disconnect-section" style={{ textAlign: 'center' }}>
        <button 
          className="btn-danger"
          onClick={handleDisconnect}
          style={{ background: '#dc3545', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer' }}
        >
          🔌 Disconnect SonoSuite
        </button>
      </div>
    </div>
  );

  // Show loading state
  if (planLoading || sonosuiteStatus.loading) {
    return (
      <div className="music-distribution" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2>🔄 Loading Distribution Dashboard...</h2>
        <p>Checking your plan and distribution access...</p>
      </div>
    );
  }

  // Show upgrade prompt if no distribution access
  if (!userPlan?.plan?.includes_music_distribution) {
    return (
      <div className="music-distribution">
        <PlanUpgradePrompt />
        
        {/* Show limited preview of what they'll get */}
        <section className="platforms-section">
          <h2>🎵 Platforms You'll Reach</h2>
          <div className="platforms-grid">
            {streamingPlatforms.slice(0, 6).map((platform, index) => (
              <div key={index} className="platform-card disabled">
                <div className="platform-header">
                  <span className="platform-icon">{platform.icon}</span>
                  <span className="platform-name">{platform.name}</span>
                  <span className="status-badge disabled">🔒</span>
                </div>
                <div className="platform-stats">
                  <p>Upgrade to access</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="music-distribution">
      {/* Show connection prompt or connected state */}
      {!sonosuiteStatus.connected ? <ConnectionPrompt /> : <ConnectedState />}

      <header className="distribution-header">
        <h1>🌍 StreampireX Global Distribution</h1>
        <p>Distribute your music worldwide through StreampireX's integrated platform and reach millions of listeners</p>
        
        {/* Enhanced header with distribution tools */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {sonosuiteStatus.connected ? (
            <>
              <button 
                onClick={() => openDistributionTool('/releases/create', 'upload tool')}
                className="cta-button"
                style={{ background: '#28a745' }}
              >
                🚀 Upload New Release
              </button>
              <button 
                onClick={() => openDistributionTool('/releases', 'release manager')}
                className="cta-button"
                style={{ background: '#6f42c1' }}
              >
                📀 Manage Releases
              </button>
              <button 
                onClick={() => openDistributionTool('/analytics', 'analytics dashboard')}
                className="cta-button"
                style={{ background: '#fd7e14' }}
              >
                📊 View Analytics
              </button>
            </>
          ) : (
            <>
              <Link to="/upload-music" className="cta-button">
                📤 Upload Music
              </Link>
              <button 
                onClick={() => setShowSubmissionForm(!showSubmissionForm)} 
                className="cta-button"
                style={{ background: '#667eea' }}
                disabled={!sonosuiteStatus.connected}
              >
                🚀 Distribute Existing Track
              </button>
            </>
          )}
        </div>
      </header>

      {/* Enhanced Submission Form - only show if connected */}
      {showSubmissionForm && sonosuiteStatus.connected && (
        <section className="distribution-form" style={{ 
          background: 'white', 
          border: '1px solid #e2e8f0', 
          borderRadius: '15px', 
          padding: '30px', 
          marginBottom: '50px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)' 
        }}>
          <h2>🚀 Submit Track for Global Distribution</h2>
          <p style={{ color: '#64748b', marginBottom: '25px' }}>
            Distribute your music to 150+ platforms including Spotify, Apple Music, Amazon Music, and more through StreampireX's professional distribution network.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Track *</label>
            <select 
              value={submissionForm.track_id} 
              onChange={(e) => setSubmissionForm(prev => ({...prev, track_id: e.target.value}))}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #d1d5db', 
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              <option value="">Choose a track...</option>
              {userTracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.title} {track.artist_name && `- ${track.artist_name}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Release Title *</label>
              <input
                type="text"
                value={submissionForm.release_title}
                onChange={(e) => setSubmissionForm(prev => ({...prev, release_title: e.target.value}))}
                placeholder="Enter release title"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Artist Name *</label>
              <input
                type="text"
                value={submissionForm.artist_name}
                onChange={(e) => setSubmissionForm(prev => ({...prev, artist_name: e.target.value}))}
                placeholder="Enter artist name"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Genre *</label>
              <select
                value={submissionForm.genre}
                onChange={(e) => setSubmissionForm(prev => ({...prev, genre: e.target.value}))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">Select genre...</option>
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Release Date</label>
              <input
                type="date"
                value={submissionForm.release_date}
                onChange={(e) => setSubmissionForm(prev => ({...prev, release_date: e.target.value}))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Label</label>
              <input
                type="text"
                value={submissionForm.label}
                onChange={(e) => setSubmissionForm(prev => ({...prev, label: e.target.value}))}
                placeholder="Record label"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: '600' }}>Distribution Platforms</label>
            <div className="platforms-grid">
              {streamingPlatforms.slice(0, 8).map(platform => {
                const platformId = platform.name.toLowerCase().replace(/\s+/g, '_').replace('/', '_');
                return (
                  <div 
                    key={platformId} 
                    className={`platform-card ${submissionForm.platforms.includes(platformId) ? 'selected' : ''}`}
                    onClick={() => handlePlatformToggle(platformId)}
                    style={{ 
                      cursor: 'pointer',
                      border: submissionForm.platforms.includes(platformId) ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      background: submissionForm.platforms.includes(platformId) ? '#eff6ff' : 'white'
                    }}
                  >
                    <div className="platform-header">
                      <span className="platform-icon">{platform.icon}</span>
                      <span className="platform-name">{platform.name}</span>
                      {submissionForm.platforms.includes(platformId) && <span style={{ color: '#3b82f6' }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={submissionForm.explicit}
                onChange={(e) => setSubmissionForm(prev => ({...prev, explicit: e.target.checked}))}
                style={{ width: '18px', height: '18px' }}
              />
              This release contains explicit content
            </label>
          </div>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
              onClick={handleSubmitDistribution}
              disabled={loading || !submissionForm.track_id || !submissionForm.release_title || !submissionForm.artist_name || !submissionForm.genre}
              className="btn-primary large"
              style={{ 
                opacity: (loading || !submissionForm.track_id || !submissionForm.release_title || !submissionForm.artist_name || !submissionForm.genre) ? 0.5 : 1,
                cursor: (loading || !submissionForm.track_id || !submissionForm.release_title || !submissionForm.artist_name || !submissionForm.genre) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Submitting...' : '🚀 Submit for Distribution'}
            </button>
            
            <button 
              onClick={() => setShowSubmissionForm(false)}
              className="btn-secondary large"
            >
              ❌ Cancel
            </button>
          </div>
        </section>
      )}

      {/* Distribution Stats - Enhanced with upload limits */}
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
              <h3>{distributionStats.platformsReached || '150+'}</h3>
              <p>Platforms Reached</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">▶️</div>
            <div className="stat-content">
              <h3>{distributionStats.totalStreams?.toLocaleString() || 0}</h3>
              <p>Total Streams</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>${distributionStats.monthlyEarnings || 0}</h3>
              <p>Monthly Earnings</p>
            </div>
          </div>
          {userPlan && (
            <div className="stat-card plan-info">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>{
                  userPlan.music_uploads?.remaining === "unlimited" 
                    ? "∞" 
                    : userPlan.music_uploads?.remaining || 0
                }</h3>
                <p>Uploads Remaining</p>
              </div>
            </div>
          )}
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