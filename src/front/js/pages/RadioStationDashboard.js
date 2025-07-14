import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../component/sidebar"; // Based on your file structure

// Temporary placeholder components until you create them
const MonetizationAnalytics = ({ earnings, followers }) => (
  <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px 0', borderRadius: '8px' }}>
    <h3>📈 Analytics</h3>
    <p><strong>Earnings:</strong> ${earnings}</p>
    <p><strong>Followers:</strong> {followers}</p>
  </div>
);

const StartStopLiveStream = ({ isLive, stationId, onStart, onStop }) => (
  <div style={{ padding: '15px', background: isLive ? '#e8f5e8' : '#fff3e0', borderRadius: '8px' }}>
    <p><strong>Status:</strong> {isLive ? '🔴 Live' : '⚫ Offline'}</p>
    <button 
      onClick={isLive ? onStop : onStart}
      style={{
        padding: '10px 20px',
        backgroundColor: isLive ? '#f44336' : '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      {isLive ? 'Stop Stream' : 'Start Stream'}
    </button>
  </div>
);

const RadioStationDashboard = () => {
  const { id: stationIdFromUrl } = useParams(); // ✅ move it here

  const [stations, setStations] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null); // set later from param
  const [selectedTrack, setSelectedTrack] = useState("");
  const [loopUploadStatus, setLoopUploadStatus] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [loopMetadata, setLoopMetadata] = useState(null);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/user/radio-stations`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then(setStations)
      .catch(console.error);

    fetch(`${process.env.BACKEND_URL}/api/user/uploaded-tracks`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then(setUploadedTracks)
      .catch(console.error);

    if (stationIdFromUrl) {
      setSelectedStation(stationIdFromUrl); // set selected station
      loadStationDetails(stationIdFromUrl); // load its data
    }
  }, []);

  const loadStationDetails = (stationId) => {
    setSelectedStation(stationId);

    fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/tracks`)
      .then((res) => res.json())
      .then(setTracks);

    fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        setEarnings(data.earnings);
        setFollowers(data.followers);
        setIsLive(data.is_live);
      });

    fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}`)
      .then((res) => res.json())
      .then(data => setLoopMetadata(data.playlist_schedule));
  };

  const addTrackToStation = async () => {
    if (!selectedTrack) return alert("Select a track first.");

    await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/add-track`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ track_id: selectedTrack }),
    });

    loadStationDetails(selectedStation);
  };

  const handleLoopUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "audio/mpeg") {
      setLoopUploadStatus("❌ Please select a valid MP3 file.");
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setLoopUploadStatus("❌ MP3 must be under 200MB.");
      return;
    }

    const formData = new FormData();
    formData.append("loop_audio", file);

    try {
      const res = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/upload-loop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setLoopUploadStatus("✅ Loop uploaded successfully!");
        loadStationDetails(selectedStation);
      } else {
        setLoopUploadStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setLoopUploadStatus("❌ Upload failed.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>📻 Radio Station Dashboard</h1>
        <MonetizationAnalytics earnings={earnings} followers={followers} />

        <h2>Your Stations</h2>
        {stations.length === 0 ? (
          <div>
            <p>No stations yet.</p>
            <Link to="/create-radio">
              <button className="btn-create">➕ Create Station</button>
            </Link>
          </div>
        ) : (
          <ul>
            {stations.map((station) => (
              <li key={station.id}>
                <strong>{station.name}</strong>
                <button onClick={() => loadStationDetails(station.id)}>View</button>
              </li>
            ))}
          </ul>
        )}

        {selectedStation && (
          <>
            <h2>🎵 Station Tracks</h2>
            <ul>
              {tracks.map((track) => (
                <li key={track.id}>
                  <p>{track.title}</p>
                  <audio controls src={track.file_url}></audio>
                  {track.cover_url && <img src={track.cover_url} alt="cover" width="50" />}
                </li>
              ))}
            </ul>

            <h3>Add a Track</h3>
            <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)}>
              <option value="">-- Select your uploaded track --</option>
              {uploadedTracks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <button onClick={addTrackToStation}>Add</button>

            <h2>🎙️ Live Streaming</h2>
            <StartStopLiveStream
              isLive={isLive}
              stationId={selectedStation}
              onStart={() => { }}
              onStop={() => { }}
            />

            <h3>🔁 Upload 3-Hour MP3 Loop</h3>
            <input type="file" accept="audio/mp3" onChange={handleLoopUpload} />
            {loopUploadStatus && <p>{loopUploadStatus}</p>}

            {loopMetadata && (
              <div>
                <h4>Current Playlist Metadata:</h4>
                <pre>{JSON.stringify(loopMetadata, null, 2)}</pre>
              </div>
            )}

            <h3>🔗 Public Station Link:</h3>
            <p><a href={`/radio/${selectedStation}`}>streampirex.com/radio/{selectedStation}</a></p>
          </>
        )}
      </div>
    </div>
  );
};

export default RadioStationDashboard;