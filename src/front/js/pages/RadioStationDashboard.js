import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../component/sidebar";
import "../../styles/RadioStationDashboard.css"

// Enhanced Analytics Component
const MonetizationAnalytics = ({ earnings, followers, isLive, stationCount }) => (
  <div className="analytics-grid">
    <div className="analytics-card earnings">
      <div className="analytics-icon">💰</div>
      <div className="analytics-content">
        <h3>Earnings</h3>
        <p className="analytics-value">${earnings || 0}</p>
        <span className="analytics-change">+12% this week</span>
      </div>
    </div>
    <div className="analytics-card followers">
      <div className="analytics-icon">👥</div>
      <div className="analytics-content">
        <h3>Followers</h3>
        <p className="analytics-value">{followers || 0}</p>
        <span className="analytics-change">+{Math.floor(Math.random() * 20)} today</span>
      </div>
    </div>
    <div className="analytics-card status">
      <div className="analytics-icon">{isLive ? '🔴' : '⚫'}</div>
      <div className="analytics-content">
        <h3>Status</h3>
        <p className="analytics-value">{isLive ? 'Live' : 'Offline'}</p>
        <span className="analytics-change">{isLive ? 'Broadcasting' : 'Ready to stream'}</span>
      </div>
    </div>
    <div className="analytics-card stations">
      <div className="analytics-icon">📻</div>
      <div className="analytics-content">
        <h3>Stations</h3>
        <p className="analytics-value">{stationCount || 0}</p>
        <span className="analytics-change">Total created</span>
      </div>
    </div>
  </div>
);

// Enhanced Live Stream Control Component
const StartStopLiveStream = ({ isLive, stationId, onStart, onStop }) => (
  <div className={`live-stream-control ${isLive ? 'live' : 'offline'}`}>
    <div className="stream-status">
      <div className={`status-indicator ${isLive ? 'live' : 'offline'}`}>
        <div className="pulse"></div>
      </div>
      <div className="status-text">
        <h3>{isLive ? '🔴 Live Broadcasting' : '⚫ Offline'}</h3>
        <p>{isLive ? 'Your station is currently live' : 'Ready to start streaming'}</p>
      </div>
    </div>
    <div className="stream-controls">
      <button
        onClick={isLive ? onStop : onStart}
        className={`stream-button ${isLive ? 'stop' : 'start'}`}
      >
        {isLive ? 'Stop Stream' : 'Go Live'}
      </button>
      {isLive && (
        <div className="live-info">
          <span className="listener-count">🎧 {Math.floor(Math.random() * 50) + 1} listeners</span>
        </div>
      )}
    </div>
  </div>
);

// Enhanced Station Card Component
const StationCard = ({ station, onSelect, isSelected }) => (
  <div className={`station-card ${isSelected ? 'selected' : ''}`}>
    <div className="station-header">
      <div className="station-avatar">
        {station.cover_url ? (
          <img src={station.cover_url} alt={station.name} />
        ) : (
          <div className="default-avatar">📻</div>
        )}
      </div>
      <div className="station-info">
        <h3>{station.name}</h3>
        <p className="station-genre">{station.genre || 'Music'}</p>
        <div className="station-stats">
          <span>👥 {station.followers || 0}</span>
          <span>🎵 {station.track_count || 0} tracks</span>
        </div>
      </div>
    </div>
    <div className="station-actions">
      <button onClick={() => onSelect(station.id)} className="btn-select">
        {isSelected ? 'Selected' : 'Manage'}
      </button>
      <div className={`status-badge ${station.is_live ? 'live' : 'offline'}`}>
        {station.is_live ? 'LIVE' : 'OFFLINE'}
      </div>
    </div>
  </div>
);

// Enhanced Track Item Component
const TrackItem = ({ track, onRemove }) => (
  <div className="track-item">
    <div className="track-cover">
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} />
      ) : (
        <div className="default-cover">🎵</div>
      )}
    </div>
    <div className="track-info">
      <h4>{track.title}</h4>
      <p>{track.artist || 'Unknown Artist'}</p>
      <span className="track-duration">{track.duration || '3:45'}</span>
    </div>
    <div className="track-controls">
      <audio controls src={track.file_url} preload="none"></audio>
      {onRemove && (
        <button onClick={() => onRemove(track.id)} className="btn-remove">
          ❌
        </button>
      )}
    </div>
  </div>
);

const RadioStationDashboard = () => {
  const { id: stationIdFromUrl } = useParams();

  const [stations, setStations] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [loopUploadStatus, setLoopUploadStatus] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [loopMetadata, setLoopMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    if (stationIdFromUrl) {
      setSelectedStation(stationIdFromUrl);
      loadStationDetails(stationIdFromUrl);
    }
  }, [stationIdFromUrl]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [stationsRes, tracksRes] = await Promise.all([
        fetch(`${process.env.BACKEND_URL}/api/user/radio-stations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${process.env.BACKEND_URL}/api/user/uploaded-tracks`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ]);

      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData);
      }

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setUploadedTracks(tracksData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStationDetails = async (stationId) => {
    try {
      setSelectedStation(stationId);

      const [tracksRes, analyticsRes, stationRes] = await Promise.all([
        fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/tracks`),
        fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/analytics`),
        fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}`)
      ]);

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setEarnings(analyticsData.earnings);
        setFollowers(analyticsData.followers);
        setIsLive(analyticsData.is_live);
      }

      if (stationRes.ok) {
        const stationData = await stationRes.json();
        setLoopMetadata(stationData.playlist_schedule);
      }
    } catch (error) {
      console.error('Error loading station details:', error);
    }
  };

  const addTrackToStation = async () => {
    if (!selectedTrack) {
      alert("Please select a track first.");
      return;
    }

    try {
      const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/add-track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ track_id: selectedTrack }),
      });

      if (response.ok) {
        loadStationDetails(selectedStation);
        setSelectedTrack("");
      } else {
        alert("Failed to add track to station");
      }
    } catch (error) {
      console.error('Error adding track:', error);
      alert("Error adding track to station");
    }
  };

  const handleLoopUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("audio/")) {
      setLoopUploadStatus("❌ Please select a valid audio file.");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setLoopUploadStatus("❌ Audio file must be under 200MB.");
      return;
    }

    setLoopUploadStatus("⏳ Uploading to Cloudinary...");

    const formData = new FormData();
    formData.append("loop_audio", file);

    try {
      // Upload to station's loop endpoint (should use Cloudinary)
      const res = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/upload-loop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setLoopUploadStatus("✅ Loop uploaded successfully!");

        // Reload station details to get updated audio URL
        await loadStationDetails(selectedStation);

        // Verify the audio URL was saved correctly
        console.log("✅ Audio uploaded. New station data:", data);
      } else {
        setLoopUploadStatus(`❌ Error: ${data.error || 'Upload failed'}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setLoopUploadStatus("❌ Upload failed. Please try again.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <div className="dashboard-header">
          <h1>📻 Radio Station Dashboard</h1>
          <p className="dashboard-subtitle">Manage your stations, tracks, and broadcasts</p>
        </div>

        <MonetizationAnalytics
          earnings={earnings}
          followers={followers}
          isLive={isLive}
          stationCount={stations.length}
        />

        <div className="dashboard-grid">
          <div className="stations-section">
            <div className="section-header">
              <h2>Your Radio Stations</h2>
              <Link to="/create-radio" className="btn-create">
                ➕ Create New Station
              </Link>
            </div>

            {stations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📻</div>
                <h3>No stations yet</h3>
                <p>Create your first radio station to start broadcasting</p>
                <Link to="/create-radio" className="btn-primary">
                  Create Your First Station
                </Link>
              </div>
            ) : (
              <div className="stations-grid">
                {stations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    onSelect={loadStationDetails}
                    isSelected={selectedStation === station.id}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedStation && (
            <div className="station-management">
              <div className="management-tabs">
                <div className="tab active">🎵 Tracks</div>
                <div className="tab">🎙️ Live Stream</div>
                <div className="tab">🔁 Loop Settings</div>
                <div className="tab">📊 Analytics</div>
              </div>

              <div className="station-content">
                <section className="tracks-section">
                  <h3>Station Tracks</h3>
                  {tracks.length === 0 ? (
                    <div className="empty-tracks">
                      <p>No tracks added yet. Add some music to get started!</p>
                    </div>
                  ) : (
                    <div className="tracks-list">
                      {tracks.map((track) => (
                        <TrackItem key={track.id} track={track} />
                      ))}
                    </div>
                  )}

                  <div className="add-track-section">
                    <h4>Add Track to Station</h4>
                    <div className="track-selector">
                      <select
                        value={selectedTrack}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                        className="track-dropdown"
                      >
                        <option value="">Select from your uploaded tracks</option>
                        {uploadedTracks.map((track) => (
                          <option key={track.id} value={track.id}>
                            {track.title}
                          </option>
                        ))}
                      </select>
                      <button onClick={addTrackToStation} className="btn-add">
                        Add Track
                      </button>
                    </div>
                  </div>
                </section>

                <section className="live-section">
                  <h3>Live Broadcasting</h3>
                  <StartStopLiveStream
                    isLive={isLive}
                    stationId={selectedStation}
                    onStart={handleStartStream}
                    onStop={handleStopStream}
                  />
                </section>

                <section className="loop-section">
                  <h3>3-Hour Loop Upload</h3>
                  <div className="upload-area">
                    <input
                      type="file"
                      accept="audio/mp3"
                      onChange={handleLoopUpload}
                      id="loop-upload"
                      className="file-input"
                    />
                    <label htmlFor="loop-upload" className="file-label">
                      📁 Choose MP3 File (Max 200MB)
                    </label>
                    {loopUploadStatus && (
                      <p className={`upload-status ${loopUploadStatus.includes('✅') ? 'success' : loopUploadStatus.includes('❌') ? 'error' : 'info'}`}>
                        {loopUploadStatus}
                      </p>
                    )}
                  </div>

                  {loopMetadata && (
                    <div className="metadata-display">
                      <h4>Current Loop Metadata</h4>
                      <pre className="metadata-content">
                        {JSON.stringify(loopMetadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </section>

                <section className="public-link-section">
                  <h3>Share Your Station</h3>
                  <div className="link-display">
                    <input
                      type="text"
                      value={`streampirex.com/radio/${selectedStation}`}
                      readOnly
                      className="public-link"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`streampirex.com/radio/${selectedStation}`)}
                      className="btn-copy"
                    >
                      📋 Copy
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioStationDashboard;