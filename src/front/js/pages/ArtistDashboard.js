import React, { useState, useEffect } from "react";

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
    const [newTrack, setNewTrack] = useState(null);
    const [newTrackTitle, setNewTrackTitle] = useState("");
    const [uploading, setUploading] = useState(false);

    // ✅ Fetch All Data (Tracks, Earnings, Submissions, Merch, Station)
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [tracksRes, stationRes] = await Promise.all([
                    fetch(`${process.env.BACKEND_URL}/api/artist/tracks`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
                    fetch(`${process.env.BACKEND_URL}/api/indie-station`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
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

    // ✅ Create a new indie artist station
    const createStation = async () => {
        if (!stationName.trim()) return setMessage("⚠️ Station name is required!");

        setLoading(true);
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/indie-station/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ name: stationName })
            });

            const data = await response.json();
            setMessage(data.message || "📡 Indie station created!");
            setStationExists(true);
        } catch (error) {
            setMessage("❌ Error creating station.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ Add track to the station
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

    // ✅ Remove track from station
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

    // ✅ Follow an Indie Station
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

    // ✅ Upload New Track
    const handleUpload = async () => {
        if (!newTrack || !newTrackTitle) return setMessage("⚠️ Please enter track title & select a file.");

        setUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("audio", newTrack);
        formData.append("title", newTrackTitle);

        try {
            await fetch(`${process.env.BACKEND_URL}/api/artist/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: formData,
            });

            setMessage("✅ Track uploaded successfully!");
        } catch (error) {
            setMessage("❌ Upload error.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <h1>🎤 Indie Artist Dashboard</h1>

            {message && <p className="message">{message}</p>}

            {/* ✅ Indie Artist Radio Station Section */}
            <h2>📡 Your Indie Radio Station</h2>
            {!stationExists ? (
                <>
                    <input type="text" placeholder="Enter Station Name" value={stationName} onChange={(e) => setStationName(e.target.value)} />
                    <button onClick={createStation} disabled={loading}>
                        {loading ? "⏳ Creating..." : "📡 Create Station"}
                    </button>
                </>
            ) : (
                <>
                    <h3>{stationName}</h3>
                    <p>👥 Followers: {followers}</p>
                    <button onClick={followStation}>❤️ Follow Station</button>

                    <h3>🎵 Tracks in your station:</h3>
                    {stationTracks.length === 0 ? (
                        <p>No tracks added yet.</p>
                    ) : (
                        <ul>
                            {stationTracks.map(track => (
                                <li key={track.id}>
                                    <strong>{track.title}</strong>
                                    <audio controls>
                                        <source src={track.file_url} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                    <button onClick={() => removeTrackFromStation(track.id)}>🗑️ Remove</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {/* ✅ Add Tracks to Indie Station */}
            <h2>🎵 Add Tracks to Your Station</h2>
            <select onChange={(e) => setSelectedTrack(e.target.value)} value={selectedTrack}>
                <option value="">Select a Track</option>
                {uploadedTracks.map(track => (
                    <option key={track.id} value={track.id}>{track.title}</option>
                ))}
            </select>
            <button onClick={addTrackToStation} disabled={loading || !selectedTrack}>
                {loading ? "⏳ Adding..." : "➕ Add to Station"}
            </button>
        </div>
    );
};

export default ArtistDashboard;
