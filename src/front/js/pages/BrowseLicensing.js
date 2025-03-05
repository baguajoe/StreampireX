import React, { useState, useEffect } from "react";

const BrowseLicensing = () => {
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/licensing/tracks")
      .then((res) => res.json())
      .then((data) => setTracks(data))
      .catch((err) => console.error("Error fetching tracks:", err));
  }, []);

  return (
    <div className="container">
      <h2>🎭 Licensing Marketplace</h2>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <h3>{track.title} by {track.artist_name}</h3>
            <p>Licensing Fee: ${track.licensing_price}</p>
            <audio controls src={track.file_url}></audio>
            <button>License Track</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BrowseLicensing;
