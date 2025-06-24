// ✅ TrackDetails.js
import React, { useEffect, useState } from 'react';

const TrackDetails = ({ trackId }) => {
  const [track, setTrack] = useState(null);

  useEffect(() => {
    if (!trackId) return;

    fetch(`/api/track/${trackId}`)
      .then(res => res.json())
      .then(data => setTrack(data))
      .catch(err => console.error("Error fetching track details:", err));
  }, [trackId]);

  if (!track) return <p>Loading track details...</p>;

  return (
    <div className="card">
      <div className="card-body">
        <h4>{track.title}</h4>
        <p><strong>Genre:</strong> {track.genre}</p>
        <p><strong>Release Date:</strong> {track.release_date || 'TBD'}</p>
        <p><strong>Status:</strong> {track.status}</p>
        <p><strong>Explicit:</strong> {track.is_explicit ? 'Yes' : 'No'}</p>
        <h5>Platform Links:</h5>
        <ul>
          {track.platform_links ? (
            Object.entries(track.platform_links).map(([platform, url]) => (
              <li key={platform}>
                <a href={url} target="_blank" rel="noopener noreferrer">{platform}</a>
              </li>
            ))
          ) : (
            <li>Not available yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default TrackDetails;
