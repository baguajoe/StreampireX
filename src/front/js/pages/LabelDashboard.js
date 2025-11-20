import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import { showToast } from "../utils/toast";
import "../../styles/LabelDashboard.css";

const LabelDashboard = () => {
  const { store } = useContext(Context);
  const [labelInfo, setLabelInfo] = useState({});
  const [artists, setArtists] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newArtist, setNewArtist] = useState({
    username: "",
    email: "",
    display_name: "",
    bio: "",
    genre: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Fetch label dashboard data
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/label-dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLabelInfo(data?.label || {});
        setArtists(data?.artists || []);
        setError(null);
        
        // Fetch revenue data if available
        fetchRevenueData();
      } else if (response.status === 403) {
        // Not a label account
        setError("This account is not registered as a label. Please contact support to upgrade.");
      } else if (response.status === 404) {
        // Label not found - maybe need to create one
        setError("No label found. You may need to set up your label account.");
      } else {
        throw new Error("Failed to fetch label data");
      }
    } catch (err) {
      console.error("Failed to fetch label info", err);
      setError("Failed to load label dashboard. Please try again later.");
      setLabelInfo({});
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/label/revenue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRevenueData(data);
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
    }
  };

  const handleAddArtist = async (e) => {
    e.preventDefault();
    
    if (!newArtist.username || !newArtist.email) {
      showToast.error("Username and email are required");
      return;
    }

    const toastId = showToast.loading("Adding artist to your label...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/label/add-artist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newArtist),
      });

      if (response.ok) {
        const data = await response.json();
        showToast.success("Artist added successfully!", { id: toastId });
        
        // Update local state
        setArtists([...artists, data.artist]);
        setShowAddArtist(false);
        setNewArtist({
          username: "",
          email: "",
          display_name: "",
          bio: "",
          genre: ""
        });
      } else {
        const error = await response.json();
        showToast.error(error.message || "Failed to add artist", { id: toastId });
      }
    } catch (err) {
      console.error("Error adding artist:", err);
      showToast.error("Failed to add artist. Please try again.", { id: toastId });
    }
  };

  const handleRemoveArtist = async (artistId) => {
    if (!window.confirm("Are you sure you want to remove this artist from your label?")) {
      return;
    }

    const toastId = showToast.loading("Removing artist...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/label/remove-artist/${artistId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showToast.success("Artist removed from label", { id: toastId });
        setArtists(artists.filter(a => a.id !== artistId));
      } else {
        throw new Error("Failed to remove artist");
      }
    } catch (err) {
      console.error("Error removing artist:", err);
      showToast.error("Failed to remove artist", { id: toastId });
    }
  };

  const handleManageArtist = (artistId) => {
    navigate(`/artist-dashboard/${artistId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="label-dashboard">
        <div className="loading-state">
          <div className="loading-icon">🎼</div>
          <h3>Loading Label Dashboard...</h3>
          <p>Please wait while we load your label information.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="label-dashboard">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Dashboard Access Issue</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="label-dashboard">
      {/* Header Section */}
      <div className="label-dashboard-header">
        <h1>🎙️ {labelInfo?.name || "Label Dashboard"}</h1>
        <p>Manage your artists and music distribution from one centralized hub</p>
      </div>

      <div className="profile-layout">
        {/* Left Column - Label Info & Stats */}
        <div className="left-column">
          <h3>📊 Label Overview</h3>
          
          {labelInfo?.description && (
            <div className="label-info-section">
              <h4>About This Label</h4>
              <p>{labelInfo.description}</p>
            </div>
          )}

          <div className="label-stats">
            <div className="stat-item">
              <strong>{artists.length}</strong>
              <span>Artists</span>
            </div>
            <div className="stat-item">
              <strong>{labelInfo?.total_releases || 0}</strong>
              <span>Releases</span>
            </div>
            <div className="stat-item">
              <strong>{labelInfo?.total_streams || 0}</strong>
              <span>Streams</span>
            </div>
            <div className="stat-item">
              <strong>${revenueData?.total_revenue || 0}</strong>
              <span>Revenue</span>
            </div>
          </div>

          {/* Revenue Overview */}
          {revenueData && (
            <div className="label-info-section" style={{ marginTop: '20px' }}>
              <h4>💰 Revenue This Month</h4>
              <p>Total: <strong>${revenueData.month_revenue || 0}</strong></p>
              <p>Pending: <strong>${revenueData.pending_revenue || 0}</strong></p>
            </div>
          )}
        </div>

        {/* Middle Column - Artists Management */}
        <div className="middle-column">
          <h3>👥 Artist Roster</h3>
          
          {artists.length === 0 ? (
            <div className="empty-artists-state">
              <div className="empty-icon">🎤</div>
              <h4>No Artists Yet</h4>
              <p>Start building your label by adding artists to your roster.</p>
              <button 
                className="cta-btn" 
                onClick={() => setShowAddArtist(true)}
              >
                ➕ Add Your First Artist
              </button>
            </div>
          ) : (
            <>
              {artists.map((artist) => (
                <div key={artist.id} className="artist-card">
                  <div className="artist-card-content">
                    {artist.profile_picture && (
                      <img
                        src={artist.profile_picture}
                        alt={artist.display_name || artist.username}
                        className="artist-avatar"
                      />
                    )}
                    <div className="artist-info">
                      <h3 className="artist-name">
                        {artist.display_name || artist.username}
                      </h3>
                      <p className="artist-bio">
                        {artist.bio || "No bio available."}
                      </p>
                      {artist.genre && (
                        <span className="artist-genre">
                          🎵 {artist.genre}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                      <button
                        onClick={() => handleManageArtist(artist.id)}
                        className="manage-artist-btn"
                      >
                        🎛️ Manage
                      </button>
                      <button
                        onClick={() => handleRemoveArtist(artist.id)}
                        className="action-btn danger"
                        style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                      >
                        ❌ Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button 
                className="action-btn primary" 
                onClick={() => setShowAddArtist(true)}
                style={{ width: '100%', marginTop: '20px' }}
              >
                ➕ Add Another Artist
              </button>
            </>
          )}

          {/* Add Artist Form */}
          {showAddArtist && (
            <div className="add-artist-section">
              <h4>➕ Add New Artist</h4>
              <form onSubmit={handleAddArtist}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input
                    type="text"
                    placeholder="Username *"
                    value={newArtist.username}
                    onChange={(e) => setNewArtist({...newArtist, username: e.target.value})}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      background: '#0d1117',
                      color: '#e1e4e8',
                      fontSize: '14px'
                    }}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newArtist.email}
                    onChange={(e) => setNewArtist({...newArtist, email: e.target.value})}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      background: '#0d1117',
                      color: '#e1e4e8',
                      fontSize: '14px'
                    }}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Display Name"
                    value={newArtist.display_name}
                    onChange={(e) => setNewArtist({...newArtist, display_name: e.target.value})}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      background: '#0d1117',
                      color: '#e1e4e8',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Genre"
                    value={newArtist.genre}
                    onChange={(e) => setNewArtist({...newArtist, genre: e.target.value})}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      background: '#0d1117',
                      color: '#e1e4e8',
                      fontSize: '14px'
                    }}
                  />
                  <textarea
                    placeholder="Artist Bio"
                    value={newArtist.bio}
                    onChange={(e) => setNewArtist({...newArtist, bio: e.target.value})}
                    rows="3"
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                      background: '#0d1117',
                      color: '#e1e4e8',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="action-btn primary" style={{ flex: 1 }}>
                      ✅ Add Artist
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddArtist(false)}
                      className="action-btn danger" 
                      style={{ flex: 1 }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column - Quick Actions */}
        <div className="right-column">
          <div className="quick-actions">
            <h3>⚡ Quick Actions</h3>
            
            <Link to="/upload-music?as=label" style={{ textDecoration: 'none' }}>
              <button className="action-btn primary">
                🎵 Upload Music
              </button>
            </Link>

            <Link to="/revenue-dashboard" style={{ textDecoration: 'none' }}>
              <button className="action-btn info">
                💸 Revenue Dashboard
              </button>
            </Link>

            <Link to="/distribution" style={{ textDecoration: 'none' }}>
              <button className="action-btn secondary">
                📡 Distribution Status
              </button>
            </Link>

            <Link to="/create-release" style={{ textDecoration: 'none' }}>
              <button className="action-btn warning">
                💿 New Release
              </button>
            </Link>
          </div>

          <div className="tools-section">
            <h3>🔧 Label Tools</h3>
            <div className="tools-grid">
              <Link to="/analytics" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  📊 Analytics
                </button>
              </Link>

              <Link to="/contracts" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  📋 Contracts
                </button>
              </Link>

              <Link to="/royalty-splits" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  💰 Royalty Splits
                </button>
              </Link>

              <Link to="/label-settings" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  ⚙️ Settings
                </button>
              </Link>

              <Link to="/marketing-tools" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  📢 Marketing
                </button>
              </Link>

              <Link to="/playlist-pitch" style={{ textDecoration: 'none' }}>
                <button className="action-btn neutral">
                  🎧 Playlist Pitch
                </button>
              </Link>
            </div>
          </div>

          {/* Label Stats Widget */}
          <div className="tools-section">
            <h3>📈 Performance</h3>
            <div style={{
              background: '#0d1117',
              padding: '15px',
              borderRadius: '12px',
              border: '1px solid #374151'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <small style={{ color: '#8b949e' }}>This Week</small>
                <div style={{ fontSize: '1.5rem', color: '#00ffc8', fontWeight: 'bold' }}>
                  {labelInfo?.week_streams || 0} streams
                </div>
              </div>
              <div>
                <small style={{ color: '#8b949e' }}>Growth</small>
                <div style={{ fontSize: '1.2rem', color: '#FF6600' }}>
                  +{labelInfo?.growth_percentage || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelDashboard;