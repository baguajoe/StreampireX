import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import LoadingSpinner from "../component/LoadingSpinner";
import EmptyState from "../component/EmptyState";
import { showToast } from "../utils/toast";
import "../../styles/RadioStationDashboard.css";

const RadioStationDashboard = () => {
  const { store } = useContext(Context);
  const navigate = useNavigate();

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [songLog, setSongLog] = useState([]);
  const [songLogStation, setSongLogStation] = useState(null);
  const [showSongLog, setShowSongLog] = useState(false);
  const [songLogStationId, setSongLogStationId] = useState(null);
  const [songLogLoading, setSongLogLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStations: 0,
    totalListeners: 0,
    activeBroadcasts: 0,
    totalSongs: 0
  });

  useEffect(() => {
    fetchRadioStations();
  }, []);

  const fetchRadioStations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      if (!token) {
        showToast.error("Please log in to view your radio stations");
        navigate("/login");
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      
      // Fetch user's radio stations
      const response = await fetch(`${backendUrl}/api/radio-stations`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStations(data);
        
        // Calculate stats
        const activeBroadcasts = data.filter(s => s.is_live).length;
        const totalSongs = data.reduce((sum, station) => sum + (station.song_count || 0), 0);
        const totalListeners = data.reduce((sum, station) => sum + (station.listener_count || 0), 0);
        
        setStats({
          totalStations: data.length,
          totalListeners: totalListeners,
          activeBroadcasts: activeBroadcasts,
          totalSongs: totalSongs
        });
      } else if (response.status === 401) {
        showToast.error("Session expired. Please log in again.");
        navigate("/login");
      } else {
        showToast.error("Failed to load radio stations");
      }
    } catch (error) {
      console.error("Error fetching radio stations:", error);
      showToast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm("Are you sure you want to delete this radio station? This action cannot be undone.")) {
      return;
    }

    const toastId = showToast.loading("Deleting radio station...");

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/radio/${stationId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        showToast.success("Radio station deleted successfully!", { id: toastId });
        // Remove from local state
        setStations(stations.filter(s => s.id !== stationId));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalStations: prev.totalStations - 1
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to delete station", { id: toastId });
      }
    } catch (error) {
      console.error("Error deleting station:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  const handleToggleLive = async (stationId, currentStatus) => {
    const newStatus = !currentStatus;
    const toastId = showToast.loading(`${newStatus ? "Starting" : "Stopping"} broadcast...`);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const backendUrl = process.env.REACT_APP_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/radio/${stationId}/toggle-live`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_live: newStatus })
      });

      if (response.ok) {
        showToast.success(`Broadcast ${newStatus ? "started" : "stopped"} successfully!`, { id: toastId });
        // Update local state
        setStations(stations.map(s => 
          s.id === stationId ? { ...s, is_live: newStatus } : s
        ));
        // Update stats
        setStats(prev => ({
          ...prev,
          activeBroadcasts: newStatus ? prev.activeBroadcasts + 1 : prev.activeBroadcasts - 1
        }));
      } else {
        const data = await response.json();
        showToast.error(data.error || "Failed to toggle broadcast", { id: toastId });
      }
    } catch (error) {
      console.error("Error toggling broadcast:", error);
      showToast.error("Network error. Please try again.", { id: toastId });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your radio stations..." fullScreen />;
  }


  const fetchSongLog = async (stationId, stationName) => {
    setSongLogLoading(true);
    setSongLogStation(stationName);
    setSongLogStationId(stationId);
    setShowSongLog(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/${stationId}/song-log?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const d = await r.json();
        setSongLog(d.songs || []);
      }
    } catch(e) { setSongLog([]); }
    finally { setSongLogLoading(false); }
  };

  return (
    <div className="radio-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>📻 Radio Station Dashboard</h1>
          <p>Manage your radio stations and broadcasts</p>
        </div>
        <Link to="/create-radio" className="create-station-btn">
          ➕ Create New Station
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📻</div>
          <div className="stat-content">
            <h3>{stats.totalStations}</h3>
            <p>Total Stations</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📡</div>
          <div className="stat-content">
            <h3>{stats.activeBroadcasts}</h3>
            <p>Active Broadcasts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalListeners.toLocaleString()}</h3>
            <p>Total Listeners</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-content">
            <h3>{stats.totalSongs}</h3>
            <p>Songs in Library</p>
          </div>
        </div>
      </div>

      {/* SPX Broadcast Studio Featured Card */}
      {stations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,255,200,0.08) 0%, rgba(255,102,0,0.06) 100%)',
          border: '1px solid rgba(0,255,200,0.2)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ fontSize:'36px' }}>📺</div>
            <div>
              <div style={{ fontSize:'16px', fontWeight:900, color:'#fff', marginBottom:'4px', letterSpacing:'0.5px' }}>
                SPX Broadcast Studio
              </div>
              <div style={{ fontSize:'13px', color:'#8888aa', lineHeight:'1.5' }}>
                Go live with multi-host video · Keep your station audio running · Song log for BMI/ASCAP
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {stations[0] && (
              <a href={`/radio-live-studio/${stations[0].id}`}
                style={{
                  padding:'10px 20px', borderRadius:'6px', background:'#00ffc8',
                  color:'#000', fontWeight:800, fontSize:'13px', textDecoration:'none',
                  letterSpacing:'0.5px', whiteSpace:'nowrap'
                }}>
                🔴 Go Live
              </a>
            )}
            <a href="/radio-live-studio"
              style={{
                padding:'10px 20px', borderRadius:'6px',
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#dde0f0', fontWeight:700, fontSize:'13px', textDecoration:'none',
                whiteSpace:'nowrap'
              }}>
              Learn More
            </a>
          </div>
        </div>
      )}

      {/* SPX Broadcast Studio Featured Card */}
      {stations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,255,200,0.08) 0%, rgba(255,102,0,0.05) 100%)',
          border: '1px solid rgba(0,255,200,0.18)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            <div style={{ fontSize:'40px', lineHeight:1 }}>📺</div>
            <div>
              <div style={{ fontSize:'16px', fontWeight:900, color:'#fff', marginBottom:'4px', letterSpacing:'0.5px' }}>
                SPX Broadcast Studio
              </div>
              <div style={{ fontSize:'13px', color:'#8888aa', lineHeight:'1.6', maxWidth:'480px' }}>
                Go live with multi-host video · Station audio keeps broadcasting · Song log for BMI/ASCAP/SESAC
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <a href={`/radio-live-studio/${stations[0]?.id}`}
              style={{
                padding:'10px 22px', borderRadius:'6px', background:'#00ffc8',
                color:'#000', fontWeight:800, fontSize:'13px', textDecoration:'none',
                letterSpacing:'0.5px', whiteSpace:'nowrap', display:'inline-block'
              }}>
              🔴 Go Live
            </a>
            <a href="/my-radio-stations"
              style={{
                padding:'10px 18px', borderRadius:'6px',
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#dde0f0', fontWeight:600, fontSize:'13px', textDecoration:'none',
                whiteSpace:'nowrap', display:'inline-block'
              }}>
              My Stations
            </a>
          </div>
        </div>
      )}

      {/* Radio Stations List */}
      {stations.length > 0 ? (
        <div className="stations-section">
          <h2>Your Radio Stations</h2>
          <div className="stations-grid">
            {stations.map(station => (
              <div key={station.id} className="station-card">
                <div className="station-image">
                  {station.cover_image ? (
                    <img src={station.cover_image} alt={station.name} />
                  ) : (
                    <div className="station-placeholder">📻</div>
                  )}
                  <span className={`status-badge ${station.is_live ? 'live' : 'offline'}`}>
                    {station.is_live ? '🔴 LIVE' : '⚫ Offline'}
                  </span>
                </div>

                <div className="station-info">
                  <h3>{station.name}</h3>
                  <p className="station-description">
                    {station.description 
                      ? (station.description.length > 100 
                          ? station.description.substring(0, 100) + '...' 
                          : station.description)
                      : 'No description'}
                  </p>

                  <div className="station-meta">
                    <span className="genre-tag">{station.genre || 'General'}</span>
                    {station.is_24_7 && <span className="feature-tag">24/7</span>}
                  </div>

                  <div className="station-stats">
                    <div className="stat">
                      <span className="stat-label">Listeners:</span>
                      <span className="stat-value">{station.listener_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Songs:</span>
                      <span className="stat-value">{station.song_count || 0}</span>
                    </div>
                  </div>

                  {/* RENAMED: station-action-btn instead of action-btn */}
                  <div className="station-actions">
                    <Link 
                      to={`/radio-station/${station.id}`} 
                      className="station-action-btn view"
                      title="View Station"
                    >
                      👁️ View
                    </Link>
                    <Link 
                      to={`/radio-station/${station.id}/schedule`} 
                      className="station-action-btn schedule"
                      title="Manage Schedule"
                    >
                      📅 Schedule
                    </Link>
                    <button
                      onClick={() => handleToggleLive(station.id, station.is_live)}
                      className={`station-action-btn ${station.is_live ? 'stop' : 'start'}`}
                      title={station.is_live ? 'Stop Broadcast' : 'Start Broadcast'}
                    >
                      {station.is_live ? '⏹️ Stop' : '▶️ Start'}
                    </button>
                    <a href={`/radio-live-studio/${station.id}`} className="station-action-btn" style={{textDecoration:'none',marginLeft:6,padding:'6px 12px',background:'rgba(0,255,200,0.1)',border:'1px solid rgba(0,255,200,0.3)',color:'#00ffc8',borderRadius:4,fontSize:12,fontWeight:700}}>📺 Live Studio</a>
                    <button
                      onClick={() => fetchSongLog(station.id, station.name)}
                      className="station-action-btn"
                      style={{marginLeft:6,padding:'6px 12px',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.3)',color:'#a78bfa',borderRadius:4,fontSize:12,fontWeight:700,cursor:'pointer'}}
                    >📋 Song Log</button>
                    <button
                      onClick={() => fetchSongLog(station.id, station.name)}
                      style={{marginLeft:6,padding:'6px 12px',background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.3)',color:'#a78bfa',borderRadius:4,fontSize:12,fontWeight:700,cursor:'pointer'}}
                    >📋 Song Log</button>
                    <a href={`/api/radio/${station.id}/pro-export?pro=bmi&days=30`} style={{textDecoration:'none',marginLeft:6,padding:'6px 12px',background:'rgba(255,102,0,0.1)',border:'1px solid rgba(255,102,0,0.3)',color:'#FF6600',borderRadius:4,fontSize:12,fontWeight:700}} download>📋 PRO Report</a>
                    <button
                      onClick={() => handleDeleteStation(station.id)}
                      className="station-action-btn delete"
                      title="Delete Station"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="📻"
          title="No Radio Stations Yet"
          message="Start broadcasting by creating your first radio station. Share your music with listeners 24/7!"
          actionText="Create Your First Station"
          actionLink="/create-radio"
          secondaryActionText="Browse Stations"
          secondaryActionLink="/browse-radio-stations"
        />
      )}

      {/* Quick Actions */}
      {stations.length > 0 && (
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <Link to="/create-radio" className="quick-action-card">
              <div className="action-icon">➕</div>
              <h3>Create New Station</h3>
              <p>Start a new radio station</p>
            </Link>

            <Link to="/browse-radio-stations" className="quick-action-card">
              <div className="action-icon">🔍</div>
              <h3>Browse Stations</h3>
              <p>Discover other stations</p>
            </Link>

            <Link to="/upload-music" className="quick-action-card">
              <div className="action-icon">🎵</div>
              <h3>Upload Music</h3>
              <p>Add songs to library</p>
            </Link>

            <Link to="/creator-dashboard" className="quick-action-card">
              <div className="action-icon">📊</div>
              <h3>Analytics</h3>
              <p>View performance stats</p>
            </Link>
          </div>
        </div>
      )}

      {/* Song Log Modal */}
      {showSongLog && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'20px'
        }} onClick={() => setShowSongLog(false)}>
          <div style={{
            background:'#0a0a18', border:'1px solid rgba(0,255,200,0.15)',
            borderRadius:'12px', width:'100%', maxWidth:'700px',
            maxHeight:'80vh', display:'flex', flexDirection:'column',
            overflow:'hidden'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'space-between'
            }}>
              <div>
                <div style={{fontSize:'14px',fontWeight:800,color:'#dde0f0'}}>📋 Song Log — {songLogStation}</div>
                <div style={{fontSize:'11px',color:'#5a7088',marginTop:'2px'}}>Last 30 days · For BMI/ASCAP/SESAC reporting</div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <a href={`/api/radio/${stations.find(s=>s.name===songLogStation)?.id}/pro-export?pro=bmi&days=30`}
                  download
                  style={{padding:'6px 14px',borderRadius:'4px',background:'rgba(255,102,0,0.1)',border:'1px solid rgba(255,102,0,0.3)',color:'#FF6600',fontSize:11,fontWeight:700,textDecoration:'none'}}>
                  ⬇ Export CSV
                </a>
                <button onClick={() => setShowSongLog(false)}
                  style={{background:'transparent',border:'none',color:'#5a7088',fontSize:'18px',cursor:'pointer',padding:'4px'}}>✕</button>
              </div>
            </div>
            {/* Content */}
            <div style={{overflowY:'auto',flex:1}}>
              {songLogLoading ? (
                <div style={{padding:'32px',textAlign:'center',color:'#5a7088'}}>Loading song log...</div>
              ) : songLog.length === 0 ? (
                <div style={{padding:'32px',textAlign:'center',color:'#5a7088'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🎵</div>
                  <div>No songs logged yet. Songs are logged automatically when your station plays them.</div>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.03)'}}>
                      {['#','Title','Artist','Album','Duration','Played At'].map(h => (
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'10px',fontWeight:700,color:'#5a7088',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {songLog.map((s, i) => (
                      <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#3a5070'}}>{i+1}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',color:'#dde0f0',fontWeight:600}}>{s.title || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#8888aa'}}>{s.artist || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.album || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.duration || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'11px',color:'#3a5070'}}>{s.played_at ? new Date(s.played_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Song Log Modal */}
      {showSongLog && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.85)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000, padding:'20px'
        }} onClick={() => setShowSongLog(false)}>
          <div style={{
            background:'#0a0a18', border:'1px solid rgba(0,255,200,0.15)',
            borderRadius:'12px', width:'100%', maxWidth:'720px',
            maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)',
              display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0
            }}>
              <div>
                <div style={{fontSize:'14px',fontWeight:800,color:'#dde0f0'}}>📋 Song Log — {songLogStation}</div>
                <div style={{fontSize:'11px',color:'#5a7088',marginTop:'2px'}}>Last 30 days · Use for BMI / ASCAP / SESAC PRO reporting</div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <a href={`${process.env.REACT_APP_BACKEND_URL}/api/radio/${songLogStationId}/pro-export?pro=bmi&days=30`}
                  download
                  style={{padding:'6px 14px',borderRadius:'4px',background:'rgba(255,102,0,0.1)',border:'1px solid rgba(255,102,0,0.3)',color:'#FF6600',fontSize:11,fontWeight:700,textDecoration:'none'}}>
                  ⬇ Export CSV
                </a>
                <button onClick={() => setShowSongLog(false)}
                  style={{background:'transparent',border:'none',color:'#5a7088',fontSize:'20px',cursor:'pointer',lineHeight:1}}>✕</button>
              </div>
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {songLogLoading ? (
                <div style={{padding:'40px',textAlign:'center',color:'#5a7088',fontSize:'14px'}}>Loading song log...</div>
              ) : songLog.length === 0 ? (
                <div style={{padding:'40px',textAlign:'center',color:'#5a7088'}}>
                  <div style={{fontSize:'36px',marginBottom:'12px'}}>🎵</div>
                  <div style={{fontSize:'14px',lineHeight:'1.6'}}>No songs logged yet.<br/>Songs are automatically logged when your station plays them.</div>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.03)',position:'sticky',top:0}}>
                      {['#','Title','Artist','Album','Duration','Played At'].map(h => (
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'10px',fontWeight:700,color:'#5a7088',letterSpacing:'1px',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {songLog.map((s, i) => (
                      <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#3a5070'}}>{i+1}</td>
                        <td style={{padding:'10px 16px',fontSize:'13px',color:'#dde0f0',fontWeight:600}}>{s.title || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#8888aa'}}>{s.artist || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.album || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'12px',color:'#5a7088'}}>{s.duration || '—'}</td>
                        <td style={{padding:'10px 16px',fontSize:'11px',color:'#3a5070'}}>{s.played_at ? new Date(s.played_at).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RadioStationDashboard;