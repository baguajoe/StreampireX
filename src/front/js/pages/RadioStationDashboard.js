// src/pages/RadioStationDashboard.js

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../component/sidebar";
import MonetizationAnalytics from "../component/MonetizationAnalytics";
import StartStopLiveStream from "../component/StartStopLiveStream"; // Import the new component
import "../styles/dashboard.css"; // Ensure you have styles for better UI

const RadioStationDashboard = () => {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState("");

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/user/radio-stations`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setStations(data);
        setLoading(false);
      })
      .catch((error) => console.error("Error fetching radio stations:", error));
  }, []);

  const loadStationDetails = (stationId) => {
    setSelectedStation(stationId);

    fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/tracks`)
      .then((res) => res.json())
      .then((data) => setTracks(data));

    fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        setEarnings(data.earnings);
        setFollowers(data.followers);
        setIsLive(data.is_live);
      });
  };

  const startLiveStream = async (stationId) => {
    const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/start-stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ station_id: stationId }),
    });

    if (response.ok) {
      setIsLive(true);
      alert("🎙️ Live stream started!");
    }
  };

  const stopLiveStream = async (stationId) => {
    const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/stop-stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ station_id: stationId }),
    });

    if (response.ok) {
      setIsLive(false);
      alert("⏹ Live stream stopped!");
    }
  };

  const addTrackToStation = async () => {
    if (!selectedTrack) return alert("⚠️ Select a track first!");

    const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/add-track`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ track_id: selectedTrack }),
    });

    if (response.ok) {
      alert("✅ Track added to station!");
      loadStationDetails(selectedStation);
    }
  };

  const removeTrackFromStation = async (trackId) => {
    const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${selectedStation}/remove-track/${trackId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      alert("🗑️ Track removed!");
      loadStationDetails(selectedStation);
    }
  };

  const deleteStation = async (stationId) => {
    if (!window.confirm("⚠️ Are you sure you want to delete this station?")) return;

    const response = await fetch(`${process.env.BACKEND_URL}/api/radio/station/${stationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.ok) {
      alert("🗑️ Radio station deleted!");
      setStations(stations.filter((s) => s.id !== stationId));
      setSelectedStation(null);
    }
  };

  if (loading) return <p>⏳ Loading your radio stations...</p>;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="content">
        <h1>📻 Radio Station Dashboard</h1>

        {/* 💰 Earnings & Followers */}
        <MonetizationAnalytics earnings={earnings} followers={followers} />

        {/* 🎙 Your Radio Stations */}
        <h2>Your Stations</h2>
        <ul>
          {stations.map((station) => (
            <li key={station.id}>
              <strong>{station.name}</strong>
              <button onClick={() => loadStationDetails(station.id)}>View</button>
              <button onClick={() => deleteStation(station.id)} className="btn-delete">Delete</button>
            </li>
          ))}
        </ul>

        {/* 🎵 Manage Station Tracks */}
        {selectedStation && (
          <>
            <h2>🎵 Station Tracks</h2>
            <ul>
              {tracks.map((track) => (
                <li key={track.id}>
                  {track.title}
                  <button onClick={() => removeTrackFromStation(track.id)}>🗑️ Remove</button>
                </li>
              ))}
            </ul>

            <select onChange={(e) => setSelectedTrack(e.target.value)} value={selectedTrack}>
              <option value="">Select a Track</option>
              {/* TODO: Fetch and list user’s uploaded tracks here */}
            </select>
            <button onClick={addTrackToStation}>➕ Add Track</button>

            {/* 🎙️ Live Streaming Controls */}
            <h2>🎙️ Live Streaming</h2>
            <StartStopLiveStream
              isLive={isLive}
              stationId={selectedStation}
              onStart={startLiveStream}
              onStop={stopLiveStream}
            />

            {/* ➕ Add New Station */}
            <Link to="/create-radio">
              <button className="btn-create">➕ Create New Station</button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default RadioStationDashboard;
