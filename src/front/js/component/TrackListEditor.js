import React, { useEffect, useState } from "react";

const TrackListEditor = ({ albumId }) => {
  const [myTracks, setMyTracks] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/my-tracks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMyTracks(data);
      } catch (err) {
        setMessage("❌ Failed to load tracks.");
      }
    };
    fetchTracks();
  }, []);

  const addToAlbum = async (trackId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/album/${albumId}/add-track`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ track_id: trackId }),
        }
      );
      const data = await res.json();
      setMessage(res.ok ? "✅ Track added" : `❌ ${data.error}`);
    } catch (err) {
      setMessage("❌ Error adding track.");
    }
  };

  return (
    <div className="mt-4">
      <h5>🎵 Add Tracks to Album</h5>
      {message && <p>{message}</p>}
      <ul className="list-group">
        {myTracks.map((track) => (
          <li key={track.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{track.title}</span>
            <button className="btn btn-sm btn-primary" onClick={() => addToAlbum(track.id)}>
              ➕ Add to Album
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TrackListEditor;
