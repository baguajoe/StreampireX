import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const AlbumDetailPage = () => {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    const fetchAlbum = async () => {
      const res = await fetch(`${process.env.BACKEND_URL}/api/album/${albumId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAlbum(data.album);
        setTracks(data.tracks);
      }
    };

    fetchAlbum();
  }, [albumId]);

  return (
    <div className="container mt-4">
      {album ? (
        <>
          <h2>🎵 {album.title}</h2>
          <p>📅 Released: {album.release_date}</p>
          <div className="mt-4">
            <h4>Tracks</h4>
            {tracks.length > 0 ? (
              <ul className="list-group">
                {tracks.map((track) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center" key={track.id}>
                    <div>
                      <strong>{track.title}</strong>
                      <br />
                      <small>{track.genre}</small>
                    </div>
                    <audio controls src={track.file_url} style={{ maxWidth: "200px" }} />
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tracks added yet.</p>
            )}
          </div>
        </>
      ) : (
        <p>Loading album details...</p>
      )}
    </div>
  );
};

export default AlbumDetailPage;
