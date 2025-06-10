import React, { useState, useEffect } from "react";
import "../../styles/ArtistDashboard.css";

const ArtistDashboard = () => {
    const [stationName, setStationName] = useState("");
    const [stationTracks, setStationTracks] = useState([]);
    const [uploadedTracks, setUploadedTracks] = useState([]);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [followers, setFollowers] = useState(0);
    const [earnings, setEarnings] = useState({ total: 0, merch: 0, licensing: 0, subscriptions: 0 });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [stationExists, setStationExists] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [tracksRes, stationRes] = await Promise.all([
                    fetch(`${process.env.BACKEND_URL}/api/artist/tracks`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                    }),
                    fetch(`${process.env.BACKEND_URL}/api/indie-station`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                    })
                ]);

                const tracksData = await tracksRes.json();
                const stationData = await stationRes.json();

                setUploadedTracks(tracksData.tracks);
                setEarnings(tracksData.earnings);

                if (stationData.station) {
                    setStationName(stationData.station.name);
                    setStationTracks(stationData.tracks);
                    setStationExists(true);
                    setFollowers(stationData.followers || 0);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };

        fetchDashboardData();
    }, []);

    const addTrackToStation = async () => {
        if (!selectedTrack) return setMessage("⚠️ Select a track to add to your station!");

        setLoading(true);
        try {
            await fetch(`${process.env.BACKEND_URL}/api/indie-station/add-track`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ track_id: selectedTrack })
            });

            setMessage("🎵 Track added to station!");
            setStationTracks([...stationTracks, uploadedTracks.find(t => t.id === selectedTrack)]);
        } catch (error) {
            setMessage("❌ Error adding track.");
        } finally {
            setLoading(false);
        }
    };

    const removeTrackFromStation = async (trackId) => {
        setLoading(true);
        try {
            await fetch(`${process.env.BACKEND_URL}/api/indie-station/remove-track/${trackId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            setMessage("🗑️ Track removed from station.");
            setStationTracks(stationTracks.filter(track => track.id !== trackId));
        } catch (error) {
            setMessage("❌ Error removing track.");
        } finally {
            setLoading(false);
        }
    };

    const followStation = async () => {
        setLoading(true);
        try {
            await fetch(`${process.env.BACKEND_URL}/api/indie-station/follow`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            setMessage("✅ Following station!");
            setFollowers(followers + 1);
        } catch (error) {
            setMessage("❌ Error following station.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="artist-dashboard">
            <h1>🎤 Artist Dashboard</h1>
            {message && <p className="message-box">{message}</p>}

            <div className="artist-section">
                <h2>📊 Summary</h2>
                <div className="station-info"><strong>Station:</strong> {stationExists ? stationName : "N/A"}</div>
                <div className="station-info"><strong>Followers:</strong> {followers}</div>
                <div className="station-info"><strong>Uploaded Tracks:</strong> {uploadedTracks.length}</div>
                <div className="station-info"><strong>Total Earnings:</strong> ${earnings.total.toFixed(2)}</div>
            </div>

            <div className="artist-section">
                <h2>🎧 Tracks in Station</h2>
                {stationTracks.length === 0 ? (
                    <p className="empty-state">No tracks added yet.</p>
                ) : (
                    <ul className="track-list">
                        {stationTracks.map(track => (
                            <li key={track.id}>
                                <strong>{track.title}</strong>
                                <audio controls>
                                    <source src={track.file_url} type="audio/mpeg" />
                                </audio>
                                <button onClick={() => removeTrackFromStation(track.id)}>🗑️ Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="artist-section add-track-form">
                <h2>➕ Add Track to Station</h2>
                <select onChange={(e) => setSelectedTrack(e.target.value)} value={selectedTrack}>
                    <option value="">Select a Track</option>
                    {uploadedTracks.map(track => (
                        <option key={track.id} value={track.id}>{track.title}</option>
                    ))}
                </select>
                <button onClick={addTrackToStation} disabled={!selectedTrack || loading}>
                    {loading ? "Adding..." : "Add to Station"}
                </button>
            </div>

            <div className="artist-section">
                <h2>💰 Earnings Breakdown</h2>
                <ul>
                    <li>🛍️ Merch: ${earnings.merch.toFixed(2)}</li>
                    <li>🎼 Licensing: ${earnings.licensing.toFixed(2)}</li>
                    <li>🎫 Subscriptions: ${earnings.subscriptions.toFixed(2)}</li>
                </ul>
            </div>

            <div className="artist-section">
                <h2>🛠️ Artist Tools</h2>
                <ul>
                    <li><a href="/upload">Upload New Track</a></li>
                    <li><a href="/manage-merch">Manage Merchandise</a></li>
                    <li><a href="/stats">Track Stats</a></li>
                    <li><a href="/payout">Request Payout</a></li>
                </ul>
            </div>
        </div>
    );
};

export default ArtistDashboard;
