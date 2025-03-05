import React, { useState, useEffect } from "react";

const ArtistDashboard = () => {
  const [tracks, setTracks] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [newTrack, setNewTrack] = useState(null);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/artist/tracks", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setTracks(data.tracks);
        setEarnings(data.earnings);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

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

  return (
    <div className="container">
      <h2>🎵 Artist Dashboard</h2>
      <p>Total Earnings: ${earnings.toFixed(2)}</p>

      <h3>Upload New Track</h3>
      <input type="file" accept="audio/*" onChange={(e) => setNewTrack(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>

      <h3>Your Uploaded Tracks</h3>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <strong>{track.title}</strong> - {track.plays} plays - ${track.earnings} earned
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ArtistDashboard;
