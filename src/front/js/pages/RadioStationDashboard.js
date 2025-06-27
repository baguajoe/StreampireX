import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../component/sidebar";
import MonetizationAnalytics from "../component/MonetizationAnalytics";
import StartStopLiveStream from "../component/StartStopLiveStream";
import "../../styles/RadioStationDashboard.css";

const RadioStationDashboard = () => {
  const [stations, setStations] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [uploadedTracks, setUploadedTracks] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

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

    setLoading(false);
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
              onStart={() => startLiveStream(selectedStation)}
              onStop={() => stopLiveStream(selectedStation)}
            />

            <h3>🔗 Public Station Link:</h3>
            <p><a href={`/radio/${selectedStation}`}>streampirex.com/radio/{selectedStation}</a></p>
          </>
        )}
      </div>
    </div>
  );
};

export default RadioStationDashboard;