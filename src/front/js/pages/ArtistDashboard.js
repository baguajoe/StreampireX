import React, { useState, useEffect } from "react";

const ArtistDashboard = () => {
    const [trackId, setTrackId] = useState("");
    const [radioStation, setRadioStation] = useState("");
    const [role, setRole] = useState("");
    const [submittedTracks, setSubmittedTracks] = useState([]);
    const [message, setMessage] = useState("");
    const [collaborations, setCollaborations] = useState([]);
    const [merchItems, setMerchItems] = useState([]);
    const [selectedMerch, setSelectedMerch] = useState("");
    const [tracks, setTracks] = useState([]);
    const [earnings, setEarnings] = useState(0);
    const [newTrack, setNewTrack] = useState(null);

    // 🔹 Submit Track for Licensing
    const submitToLicensing = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/licensing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ track_id: trackId })
            });

            const data = await response.json();
            setMessage(data.message || "Submission successful!");
            fetchSubmittedTracks();
        } catch (error) {
            setMessage("Error submitting track.");
        }
    };

    // 🔹 Submit Track to Syndicated Radio
    const submitToRadio = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/radio-submission", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ track_id: trackId, station: radioStation })
            });

            const data = await response.json();
            setMessage(data.message || "Track submitted to radio!");
        } catch (error) {
            setMessage("Error submitting track to radio.");
        }
    };

    // 🔹 Create Collaboration Listing
    const createCollaboration = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/collaboration", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ role })
            });

            const data = await response.json();
            setMessage(data.message || "Collaboration listing created!");
            fetchCollaborations();
        } catch (error) {
            setMessage("Error creating collaboration listing.");
        }
    };

    // 🔹 Fetch Submitted Tracks
    const fetchSubmittedTracks = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/licensing", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data = await response.json();
            setSubmittedTracks(data);
        } catch (error) {
            console.error("Error fetching submitted tracks:", error);
        }
    };

    // 🔹 Fetch Collaborations
    const fetchCollaborations = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/collaborations", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data = await response.json();
            setCollaborations(data);
        } catch (error) {
            console.error("Error fetching collaborations:", error);
        }
    };

    // 🔹 Fetch Merch Items
    const fetchMerch = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/merch", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data = await response.json();
            setMerchItems(data);
        } catch (error) {
            console.error("Error fetching merch:", error);
        }
    };

    // 🔹 Fetch Tracks and Earnings
    const fetchTracksAndEarnings = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + "/api/artist/tracks", {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            const data = await response.json();
            setTracks(data.tracks);
            setEarnings(data.earnings);
        } catch (error) {
            console.error("Error fetching artist tracks and earnings:", error);
        }
    };

    // 🔹 Upload New Track
    const handleUpload = () => {
        if (!newTrack) return alert("Please select a track!");

        const formData = new FormData();
        formData.append("audio", newTrack);

        fetch(process.env.BACKEND_URL + "/api/artist/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: formData,
        })
            .then((res) => res.json())
            .then(() => alert("Upload successful!"))
            .catch((err) => console.error("Upload error:", err));
    };

    useEffect(() => {
        fetchSubmittedTracks();
        fetchCollaborations();
        fetchMerch();
        fetchTracksAndEarnings();
    }, []);

    return (
        <div className="container">
            <h1>🎵 Artist Dashboard</h1>
            <p>Total Earnings: ${earnings.toFixed(2)}</p>

            {/* 🎵 Submit Track for Licensing */}
            <h2>Submit Track for Licensing</h2>
            <input type="text" placeholder="Track ID" value={trackId} onChange={(e) => setTrackId(e.target.value)} />
            <button onClick={submitToLicensing}>Submit</button>

            {/* 📻 Submit to Syndicated Radio */}
            <h2>Submit Track to Radio</h2>
            <input type="text" placeholder="Radio Station" value={radioStation} onChange={(e) => setRadioStation(e.target.value)} />
            <button onClick={submitToRadio}>Submit</button>

            {/* 🎤 Collaboration Marketplace */}
            <h2>Collaboration Marketplace</h2>
            <input type="text" placeholder="Enter your role (e.g. Producer, Songwriter)" value={role} onChange={(e) => setRole(e.target.value)} />
            <button onClick={createCollaboration}>Create Listing</button>

            {/* 🏆 Playlist & Charting */}
            <h2>Track Rankings</h2>
            <ul>
                {submittedTracks.length > 0 ? (
                    submittedTracks.map((track) => (
                        <li key={track.id}>
                            Track ID: {track.track_id} | Status: {track.status} | Submitted: {new Date(track.submitted_at).toLocaleDateString()}
                        </li>
                    ))
                ) : (
                    <p>No tracks submitted yet.</p>
                )}
            </ul>

            {/* 🛍️ Merch & Digital Sales */}
            <h2>Merchandise Store</h2>
            <select onChange={(e) => setSelectedMerch(e.target.value)}>
                <option value="">Select Item</option>
                {merchItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} - ${item.price}</option>
                ))}
            </select>
            <button disabled={!selectedMerch}>Buy Now</button>

            {/* 🎼 Upload New Track */}
            <h3>Upload New Track</h3>
            <input type="file" accept="audio/*" onChange={(e) => setNewTrack(e.target.files[0])} />
            <button onClick={handleUpload}>Upload</button>

            {message && <p>{message}</p>}
        </div>
    );
};

export default ArtistDashboard;
