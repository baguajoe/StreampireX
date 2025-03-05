import React, { useState, useEffect } from "react";

const MusicLicensing = () => {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [price, setPrice] = useState("");

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/artist/tracks", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then((data) => setTracks(data.tracks))
      .catch((err) => console.error("Error fetching tracks:", err));
  }, []);

  const handleSubmit = () => {
    if (!selectedTrack || !price) return alert("Select a track and set a price!");

    fetch(process.env.BACKEND_URL + "/api/licensing/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ track_id: selectedTrack, price }),
    })
      .then((res) => res.json())
      .then(() => alert("Track submitted for licensing!"))
      .catch((err) => console.error("Submission error:", err));
  };

  return (
    <div className="container">
      <h2>💰 Submit Music for Licensing</h2>
      <select onChange={(e) => setSelectedTrack(e.target.value)}>
        <option value="">Select Track</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.title}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Set Licensing Price ($)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit for Licensing</button>
    </div>
  );
};

export default MusicLicensing;
