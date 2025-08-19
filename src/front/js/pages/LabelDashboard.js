import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/LabelDashboard.css";
import AddArtist from "../component/AddArtist"; // moved to component

const LabelDashboard = () => {
  const [labelInfo, setLabelInfo] = useState({});
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.BACKEND_URL}/api/label-dashboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // ✅ Add null checks and fallbacks
        setLabelInfo(data?.label || {});
        setArtists(data?.artists || []);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to fetch label info", err);
        setError("Failed to load label dashboard");
        setLabelInfo({});
        setArtists([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSelectArtist = (id) => {
    setSelectedArtistId(id);
    navigate(`/artist-dashboard/${id}`);
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state" style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎼</div>
          <h3>Loading Label Dashboard...</h3>
          <p>Please wait while we load your label information.</p>
        </div>
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className="profile-container">
        <div className="error-state" style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#dc3545'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h3>Failed to Load Label Dashboard</h3>
          <p>{error}</p>
          <p style={{ color: '#666', marginTop: '20px' }}>
            Make sure your backend server is running and you have proper authentication.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-layout">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <h3>🎙️ {labelInfo?.name || "Label Dashboard"}</h3>
          <p>Manage your artists and uploads from one place.</p>
          
          {/* ✅ Show label info if available */}
          {labelInfo?.description && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4>About This Label</h4>
              <p>{labelInfo.description}</p>
            </div>
          )}
          
          {/* ✅ Quick stats */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '10px',
              fontSize: '14px',
              color: '#666'
            }}>
              <div>
                <strong>Total Artists:</strong> {artists.length}
              </div>
              <div>
                <strong>Status:</strong> {labelInfo?.status || 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="middle-column">
          <h3>👥 Your Artists</h3>
          {artists.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
              <h4>No Artists Yet</h4>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Start building your label by adding artists to your roster.
              </p>
              <button 
                className="btn-podcast" 
                onClick={() => setShowAddArtist(true)}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ➕ Add Your First Artist
              </button>
            </div>
          ) : (
            artists.map((artist) => (
              <div key={artist.id} className="post-card" style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {artist.profile_picture && (
                    <img 
                      src={artist.profile_picture} 
                      alt={artist.display_name || artist.username}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>{artist.display_name || artist.username}</strong>
                    </p>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {artist.bio || "No bio available."}
                    </p>
                    {artist.genre && (
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        marginTop: '8px'
                      }}>
                        🎵 {artist.genre}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleSelectArtist(artist.id)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🎛️ Manage Artist
                  </button>
                </div>
              </div>
            ))
          )}

          {showAddArtist && (
            <div style={{ 
              marginTop: "20px", 
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h4>➕ Add New Artist</h4>
              <AddArtist onSuccess={() => setShowAddArtist(false)} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <div className="quick-actions">
            <h3>➕ Artist Management</h3>
            <button 
              className="btn-podcast" 
              onClick={() => setShowAddArtist(!showAddArtist)}
              style={{
                width: '100%',
                marginBottom: '15px',
                backgroundColor: showAddArtist ? '#dc3545' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {showAddArtist ? "❌ Cancel" : "➕ Add New Artist"}
            </button>

            <h3>💸 Revenue Split</h3>
            <Link to="/revenue-dashboard">
              <button 
                className="btn-radio"
                style={{
                  width: '100%',
                  marginBottom: '15px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                📊 View Revenue Breakdown
              </button>
            </Link>

            <h3>📦 Upload on Behalf</h3>
            <Link to="/upload?as=label">
              <button 
                className="btn-indie-upload"
                style={{
                  width: '100%',
                  marginBottom: '15px',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                🎵 Upload Content
              </button>
            </Link>

            {/* ✅ Additional Quick Actions */}
            <h3>🔧 Label Tools</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/analytics" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  📈 Analytics Overview
                </button>
              </Link>
              
              <Link to="/contracts" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%',
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  📋 Contracts & Agreements
                </button>
              </Link>

              <Link to="/label-settings" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  ⚙️ Label Settings
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelDashboard;