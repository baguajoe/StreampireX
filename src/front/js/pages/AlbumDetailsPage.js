import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const AlbumDetailsPage = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchAlbum = async () => {
      try {
        const res = await fetch(`${process.env.BACKEND_URL}/api/album/${albumId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setAlbum(data.album);
          setTracks(data.tracks);
        } else {
          setError(data.error || "Failed to load album.");
        }
      } catch (err) {
        setError("❌ Network error while loading album.");
      }
    };

    fetchAlbum();
  }, [albumId]);

  if (error) return <div className="container mt-4"><p>{error}</p></div>;
  if (!album) return <div className="container mt-4"><p>Loading album...</p></div>;

  return (
    <div className="container mt-4">
      <h2>📀 {album.title}</h2>
      <p>Genre: {album.genre}</p>
      <p>Release Date: {album.release_date}</p>
      <p>Explicit: {album.explicit ? "Yes" : "No"}</p>
      {album.cover_art_url && (
        <img
          src={album.cover_art_url}
          alt="Album Cover"
          style={{ width: "250px", height: "250px", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <h4>Tracks in Album:</h4>
      <ul className="list-group">
        {tracks.map((track, idx) => (
          <li key={track.id} className="list-group-item">
            {idx + 1}. {track.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AlbumDetailsPage;
