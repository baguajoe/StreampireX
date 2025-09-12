// Complete MusicDistribution.js with Full Width Layout and SonoSuite Dashboard Integration

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
    { name: "Spotify", icon: "🎵", status: "active", streams: "2.4M" },
    { name: "Apple Music", icon: "🍎", status: "active", streams: "1.8M" },
    { name: "Amazon Music", icon: "📦", status: "active", streams: "1.2M" },
    { name: "YouTube Music", icon: "📺", status: "active", streams: "3.1M" },
    { name: "Deezer", icon: "🎼", status: "active", streams: "890K" },
    { name: "Tidal", icon: "🌊", status: "active", streams: "650K" },
    { name: "Pandora", icon: "📻", status: "pending", streams: "0" },
    { name: "SoundCloud", icon: "☁️", status: "active", streams: "1.5M" },
    { name: "Bandcamp", icon: "🎪", status: "active", streams: "320K" },
    { name: "TikTok", icon: "🎵", status: "active", streams: "5.2M" },
    { name: "Instagram", icon: "📸", status: "active", streams: "2.8M" },
    { name: "Facebook", icon: "👥", status: "active", streams: "1.1M" }
  ];

  // Distribution process steps
  const distributionProcess = [
    {
      step: 1,
      icon: "🎵",
      title: "Upload Your Music",
      description: "Upload your high-quality audio files and artwork through StreampireX"
    },
    {
      step: 2,
      icon: "📝",
      title: "Add Release Details",
      description: "Fill in artist info, release date, genre, and platform preferences"
    },
    {
      step: 3,
      icon: "🔄",
      title: "Review & Submit",
      description: "Review your submission and send to our distribution network"
    },
    {
      step: 4,
      icon: "🚀",
      title: "Go Live",
      description: "Your music goes live on 150+ platforms worldwide within 24-48 hours"
    },
    {
      step: 5,
      icon: "📊",
      title: "Track Performance",
      description: "Monitor streams, earnings, and analytics across all platforms"
    }
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
      console.log("Connection form auto-filled with user data");
    }
  }, [store.user]);

  // Enhanced: Fetch user plan and check distribution access
  const fetchUserPlan = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, user not logged in");
        setUserPlan({ plan: { name: "Free", includes_music_distribution: false } });
        setPlanLoading(false);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      console.log("Fetching user plan from:", `${backendUrl}/api/user/plan-status`);
      
      const response = await fetch(`${backendUrl}/api/user/plan-status`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log("Plan status response status:", response.status);

      if (response.status === 404) {
        // User doesn't have a plan yet, assign free plan
        console.log("User plan not found, defaulting to free plan");
        setUserPlan({ 
          plan: { 
            name: "Free", 
            includes_music_distribution: false,
            sonosuite_access: false
          } 
        });
      } else if (response.ok) {
        const data = await response.json();
        console.log("User plan data:", data);
        setUserPlan(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Plan fetch error:", errorData);
        // Fallback to free plan on error
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
      // Fallback to free plan on error
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

    try {
      // Get user's JWT token
      const token = localStorage.getItem("token");
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
        // Redirect to SonoSuite dashboard - user is automatically logged in
        window.location.href = data.redirect_url;
      } else {
        throw new Error(data.error || 'Failed to access dashboard');
      }

    } catch (err) {
      setDashboardError(err.message);
      console.error('Dashboard access error:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Enhanced: Check SonoSuite connection status
  const checkSonoSuiteConnectionStatus = async () => {
    try {
      const token = localStorage.getItem("token");
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
        console.error("SonoSuite status check failed:", response.status);
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
      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/user/audio`, {
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

  // Enhanced: Auto-connect to SonoSuite with fallback to manual
  const connectToSonoSuite = async () => {
    setIsConnecting(true);
    try {
      const token = localStorage.getItem("token");
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
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      const response = await fetch(`${backendUrl}/api/sonosuite/disconnect`, {
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

  // Open SonoSuite Dashboard with SSO
  const openSonoSuiteDashboard = async (section = '/dashboard') => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(
        `${backendUrl}/api/sonosuite/redirect?return_to=${encodeURIComponent(section)}`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Redirect to SonoSuite with JWT authentication
        window.location.href = data.redirect_url;
      } else {
        alert(`❌ Unable to access SonoSuite dashboard: ${data.error || data.message}`);

        // If not connected, show connection prompt
        if (data.error && data.error.includes("not connected")) {
          setSonosuiteStatus(prev => ({ ...prev, connected: false }));
        }
      }
    } catch (error) {
      console.error("Error opening SonoSuite dashboard:", error);
      alert("❌ Unable to access dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Submit music for distribution
  const handleSubmitDistribution = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
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
        alert('✅ Music submitted for distribution! You\'ll receive updates as it goes live on platforms.');
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

  // NEW: Enhanced Plan Selection Component
  const PlanSelectionSection = () => (
    <section className="plan-selection-section" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '15px',
      padding: '40px 20px',
      marginBottom: '30px',
      color: 'white',
      textAlign: 'center',
      width: '100%'
    }}>
      <h2 style={{ marginBottom: '15px', fontSize: '2rem' }}>🎵 Choose Your Distribution Plan</h2>
      <p style={{ marginBottom: '30px', fontSize: '1.1rem', opacity: 0.9 }}>
        Select the plan that fits your music distribution needs
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
        width: '100%'
      }}>
        {/* Free Plan Card */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '25px',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.2)',
          width: '100%'
        }}>
          <h3 style={{ marginBottom: '10px' }}>🆓 Free Plan</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>$0</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '15px', opacity: 0.8 }}>
            Listen, follow, gaming community
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
            ❌ No music distribution
          </p>
          <Link 
            to="/pricing/plans" 
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
              width: '80%'
            }}
          >
            Current Plan
          </Link>
        </div>

        {/* Pro Plan Card */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          padding: '25px',
          borderRadius: '12px',
          border: '2px solid #FFD700',
          position: 'relative',
          width: '100%'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FFD700',
            color: '#333',
            padding: '5px 15px',
            borderRadius: '15px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            POPULAR
          </div>
          <h3 style={{ marginBottom: '10px' }}>⭐ Pro Plan</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px' }}>$21.99</p>
          <p style={{ fontSize: '0.8rem', marginBottom: '10px', opacity: 0.8 }}>/month</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '15px', opacity: 0.9 }}>
            Upload content, livestreaming, analytics
          </p>
          <div style={{ fontSize: '0.9rem', marginBottom: '20px', textAlign: 'left' }}>
            <div>✅ Limited Music Distribution</div>
            <div>✅ SonoSuite Access</div>
            <div>✅ Create Podcasts</div>
            <div>✅ Radio Stations</div>
          </div>
          <Link 
            to="/pricing" 
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: '#FFD700',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              width: '80%'
            }}
          >
            Choose Pro Plan
          </Link>
        </div>

        {/* Premium Plan Card */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '25px',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.2)',
          width: '100%'
        }}>
          <h3 style={{ marginBottom: '10px' }}>💎 Premium Plan</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px' }}>$39.99</p>
          <p style={{ fontSize: '0.8rem', marginBottom: '10px', opacity: 0.8 }}>/month</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '15px', opacity: 0.9 }}>
            Full creators, sell merch, marketplace
          </p>
          <div style={{ fontSize: '0.9rem', marginBottom: '20px', textAlign: 'left' }}>
            <div>✅ Unlimited Music Distribution</div>
            <div>✅ Digital & Merch Sales</div>
            <div>✅ Live Events</div>
            <div>✅ All Pro Features</div>
          </div>
          <Link 
            to="/pricing/plans" 
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.3s ease',
              width: '80%'
            }}
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>

      {/* Standalone Distribution Option */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '25px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.2)',
        marginTop: '20px',
        width: '100%'
      }}>
        <h3 style={{ marginBottom: '15px' }}>🎵 Standalone Music Distribution</h3>
        <p style={{ marginBottom: '20px', opacity: 0.9 }}>
          Don't need other features? Get music distribution only.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Artist Distribution</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '10px' }}>$22.99</p>
            <Link 
              to="/pricing/plans" 
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            >
              Choose Artist
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Label Distribution</p>
            <p style={{ fontSize: '1.5rem', marginBottom: '10px' }}>$74.99</p>
            <Link 
              to="/pricing/plans" 
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            >
              Choose Label
            </Link>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div style={{ marginTop: '30px' }}>
        <Link 
          to="/pricing"
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            background: 'white',
            color: '#667eea',
            textDecoration: 'none',
            borderRadius: '25px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          🎯 Choose a Plan & Start Distributing
        </Link>
      </div>
    </section>
  );

  // Simple Dashboard Buttons Component
  const SimpleDashboardButtons = () => (
    <section className="simple-dashboard-section" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '30px 20px',
      marginBottom: '30px',
      color: 'white',
      width: '100%'
    }}>
      <h2 style={{ marginBottom: '20px', color: 'white' }}>📊 Quick Dashboard Access</h2>
      <p style={{ marginBottom: '25px', opacity: 0.9 }}>
        Access your distribution dashboard with one click - no double login required!
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px',
        width: '100%'
      }}>
        {/* Dashboard buttons with full width */}
        <button
          onClick={() => goToDashboard("/dashboard")}
          disabled={dashboardLoading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: dashboardLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '500',
            width: '100%'
          }}
        >
          {dashboardLoading ? '🔄 Loading...' : '📊 Dashboard'}
        </button>

        <button
          onClick={() => goToDashboard("/albums")}
          disabled={dashboardLoading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: dashboardLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '500',
            width: '100%'
          }}
        >
          📀 Albums
        </button>

        <button
          onClick={() => goToDashboard("/analytics")}
          disabled={dashboardLoading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: dashboardLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '500',
            width: '100%'
          }}
        >
          📈 Analytics
        </button>

        <button
          onClick={() => goToDashboard("/releases")}
          disabled={dashboardLoading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '15px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: dashboardLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '500',
            width: '100%'
          }}
        >
          🎵 Releases
        </button>
      </div>

      {/* Error message */}
      {dashboardError && (
        <div style={{
          color: '#ffcccb',
          fontSize: '14px',
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(255,0,0,0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(255,0,0,0.2)',
          width: '100%'
        }}>
          ❌ {dashboardError}
        </div>
      )}
    </section>
  );

  // Enhanced: Plan upgrade prompt component
  const PlanUpgradePrompt = () => (
    <div className="upgrade-section" style={{
      background: 'linear-gradient(135deg, #667eea, #764ba2)',
      color: 'white',
      padding: '3rem 2rem',
      borderRadius: '15px',
      textAlign: 'center',
      marginBottom: '2rem',
      width: '100%'
    }}>
      <h2>🎵 Unlock Global Music Distribution</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        Distribute your music to 150+ platforms including Spotify, Apple Music, Amazon Music, and more!
      </p>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem', 
        marginBottom: '2rem',
        width: '100%'
      }}>
        <div>✅ Global music distribution</div>
        <div>✅ Keep 100% of your royalties</div>
        <div>✅ Detailed analytics and reporting</div>
        <div>✅ Release scheduling</div>
        <div>✅ Social media integration</div>
        <div>✅ YouTube Content ID protection</div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link 
          to="/pricing" 
          style={{ 
            background: 'white', 
            color: '#667eea',
            padding: '15px 35px',
            fontSize: '1.1rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          🚀 Choose a Plan - Start Distributing
        </Link>
        <Link 
          to="/pricing" 
          style={{ 
            background: 'transparent',
            color: 'white',
            border: '2px solid white',
            padding: '15px 35px',
            fontSize: '1.1rem',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
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
      textAlign: 'center',
      width: '100%'
    }}>
      <h2>🎼 Connect Distribution System</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Ready to distribute your music globally? We'll connect your StreampireX account to our distribution network.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <p><strong>What you'll get:</strong></p>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem', 
          marginTop: '1rem',
          width: '100%'
        }}>
          <div>🌍 Global distribution to 150+ platforms</div>
          <div>💰 Keep 100% of your royalties</div>
          <div>📊 Detailed analytics and reporting</div>
          <div>⚡ Fast 24-48 hour distribution</div>
        </div>
      </div>

      <button 
        className="btn-primary large"
        onClick={connectToSonoSuite}
        disabled={isConnecting}
        style={{ 
          background: '#28a745', 
          color: 'white', 
          border: 'none', 
          padding: '1rem 2rem', 
          borderRadius: '8px', 
          fontSize: '1.1rem',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          marginBottom: '1rem'
        }}
      >
        {isConnecting ? "🔄 Connecting..." : "🔗 Connect Distribution System"}
      </button>

      {/* Manual Connection Form (fallback) */}
      {showManualConnection && (
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '1rem',
          width: '100%'
        }}>
          <h4>Manual Connection</h4>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            If auto-connection failed, please enter your details manually:
          </p>
          
          <form onSubmit={handleManualConnect} style={{ width: '100%' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                SonoSuite Email:
              </label>
              <input 
                type="email"
                value={connectionForm.sonosuite_email}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, sonosuite_email: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
                placeholder="your-email@example.com"
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                External ID:
              </label>
              <input 
                type="text"
                value={connectionForm.external_id}
                onChange={(e) => setConnectionForm(prev => ({ ...prev, external_id: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
                placeholder="Your user ID"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                type="submit"
                disabled={isConnecting}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer'
                }}
              >
                {isConnecting ? "🔄 Connecting..." : "🔗 Connect to SonoSuite"}
              </button>
              
              <button 
                type="button"
                onClick={() => setShowManualConnection(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
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
      marginBottom: '2rem',
      width: '100%'
    }}>
      <div className="connection-info" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h3>✅ Connected to StreampireX Distribution</h3>
        <p><strong>Email:</strong> {sonosuiteStatus.connection?.sonosuite_email}</p>
        <p><strong>External ID:</strong> {sonosuiteStatus.connection?.sonosuite_external_id}</p>
        <p><strong>Connected:</strong> {new Date(sonosuiteStatus.connection?.created_at).toLocaleDateString()}</p>
        <p><strong>Plan:</strong> {userPlan?.plan?.name}</p>
      </div>

      {/* Quick Action Buttons */}
      <SimpleDashboardButtons />

      {/* Plan Management Section */}
      <div className="plan-management-section" style={{ 
        textAlign: 'center', 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#f8f9fa', 
        borderRadius: '10px',
        width: '100%'
      }}>
        <h4 style={{ marginBottom: '1rem', color: '#333' }}>🎯 Manage Your Plan</h4>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <Link 
            to="/pricing/plans"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            📊 View All Plans
          </Link>
          <Link 
            to="/pricing/plans"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            🚀 Upgrade Plan
          </Link>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Current Plan: <strong>{userPlan?.plan?.name || 'Loading...'}</strong>
        </p>
        
        <button 
          onClick={handleDisconnect}
          style={{ 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          🔌 Disconnect StreampireX
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
          <h3 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Total Tracks</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{distributionStats.totalTracks}</p>
        </div>
        
        <div className="stat-card">
          <h3 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Platforms</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{distributionStats.platformsReached}</p>
        </div>
        
        <div className="stat-card">
          <h3 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Total Streams</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{distributionStats.totalStreams.toLocaleString()}</p>
        </div>
        
        <div className="stat-card">
          <h3 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Monthly Earnings</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>${distributionStats.monthlyEarnings}</p>
        </div>
      </div>
    </section>
  );

  // Streaming Platforms Section
  const StreamingPlatformsSection = () => (
    <section className="platforms-section">
      <h2>🎵 Supported Streaming Platforms</h2>
      <div className="platforms-grid">
        {streamingPlatforms.map((platform, index) => (
          <div key={index} className="platform-card" style={{
            border: platform.status === 'active' ? '2px solid #28a745' : '2px solid #ffc107'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{platform.icon}</div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{platform.name}</h4>
            <p style={{ 
              margin: 0, 
              fontSize: '0.8rem', 
              color: platform.status === 'active' ? '#28a745' : '#ffc107',
              fontWeight: 'bold'
            }}>
              {platform.status === 'active' ? `${platform.streams} streams` : 'Coming Soon'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  // Distribution Process Section
  const DistributionProcessSection = () => (
    <section className="how-it-works">
      <h2>🚀 How Distribution Works</h2>
      <div className="process-steps">
        {distributionProcess.map((step, index) => (
          <div key={index} className="process-step">
            <div className="step-number">
              {step.step}
            </div>
            <div className="step-icon">{step.icon}</div>
            <div className="step-content">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  // Music Submission Form (keeping existing implementation)
  const MusicSubmissionForm = () => (
    <div className="submission-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="submission-form" style={{
        background: 'white',
        borderRadius: '15px',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🎵 Submit Music for Distribution</h2>
        
        <form onSubmit={handleSubmitDistribution}>
          {/* Track Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Select Track:
            </label>
            <select
              value={submissionForm.track_id}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, track_id: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              <option value="">Choose a track...</option>
              {userTracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.title || track.filename}
                </option>
              ))}
            </select>
          </div>

          {/* Release Title */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Release Title:
            </label>
            <input
              type="text"
              value={submissionForm.release_title}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, release_title: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              placeholder="Your Song Title"
            />
          </div>

          {/* Artist Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Artist Name:
            </label>
            <input
              type="text"
              value={submissionForm.artist_name}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, artist_name: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              placeholder="Your Artist Name"
            />
          </div>

          {/* Genre */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Genre:
            </label>
            <select
              value={submissionForm.genre}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, genre: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              <option value="">Select genre...</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Release Date */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Release Date:
            </label>
            <input
              type="date"
              value={submissionForm.release_date}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, release_date: e.target.value }))}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>

          {/* Label */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Label:
            </label>
            <input
              type="text"
              value={submissionForm.label}
              onChange={(e) => setSubmissionForm(prev => ({ ...prev, label: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
              placeholder="StreampireX Records"
            />
          </div>

          {/* Explicit Content */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={submissionForm.explicit}
                onChange={(e) => setSubmissionForm(prev => ({ ...prev, explicit: e.target.checked }))}
              />
              <span style={{ fontWeight: 'bold' }}>Contains explicit content</span>
            </label>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '🔄 Submitting...' : '🚀 Submit for Distribution'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowSubmissionForm(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>🎵 Your Active Releases</h2>
        {sonosuiteStatus.connected && userPlan?.plan?.includes_music_distribution && (
          <button
            onClick={() => setShowSubmissionForm(true)}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            🚀 Submit New Release
          </button>
        )}
      </div>

      {activeDistributions.length > 0 ? (
        <div className="releases-list">
          {activeDistributions.map((release, index) => (
            <div key={index} className="release-card active">
              <div className="release-info">
                <h4 style={{ marginBottom: '0.5rem', color: '#333' }}>{release.title}</h4>
                <p style={{ marginBottom: '0.5rem', color: '#666' }}>Artist: {release.artist}</p>
                <p style={{ marginBottom: '0.5rem', color: '#666' }}>Status: {release.status}</p>
                <p style={{ marginBottom: '1rem', color: '#666' }}>Platforms: {release.platforms?.length || 0}</p>
              </div>
              
              <div className="release-actions">
                <button
                  onClick={() => openSonoSuiteDashboard(`/releases/${release.id}`)}
                  className="btn-secondary"
                >
                  📊 View Analytics
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No active releases yet</h3>
          <p>Submit your first track to get started!</p>
        </div>
      )}
    </section>
  );

  // Show loading state
  if (planLoading || sonosuiteStatus.loading) {
    return (
      <div className="music-distribution" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1>🎵 Music Distribution</h1>
        <p>Loading your distribution status...</p>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #f3f3f3', 
          borderTop: '3px solid #667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '2rem auto'
        }}></div>
      </div>
    );
  }

  // Main render
  return (
    <div className="music-distribution">
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '3rem', width: '100%' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🎵 Global Music Distribution
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666' }}>
          Distribute your music to 150+ platforms worldwide with StreampireX
        </p>
      </header>

      {/* Conditional Rendering Based on Plan and Connection Status */}
      {!userPlan?.plan?.includes_music_distribution ? (
        <>
          <PlanSelectionSection />
          <PlanUpgradePrompt />
        </>
      ) : !sonosuiteStatus.connected ? (
        <>
          <ConnectionPrompt />
          <DistributionProcessSection />
        </>
      ) : (
        <>
          <ConnectedState />
          <DistributionStatsSection />
          <ActiveReleasesSection />
        </>
      )}

      {/* Always show these sections */}
      <StreamingPlatformsSection />
      <DistributionProcessSection />

      {/* Submission Form Modal */}
      {showSubmissionForm && <MusicSubmissionForm />}
    </div>
  );
};

export default MusicDistribution;