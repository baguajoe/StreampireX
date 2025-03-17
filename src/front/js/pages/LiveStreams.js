import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const liveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/live-streams")
      .then((res) => res.json())
      .then((data) => setLiveStreams(data))
      .catch((err) => console.error("Error fetching live streams:", err));
  }, []);

  const filteredStreams = liveStreams.filter(stream =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="live-streams-container">
      <h1>🎥 Live Streams</h1>

      <input
        type="text"
        placeholder="Search live streams..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="live-stream-list">
        {filteredStreams.length > 0 ? (
          filteredStreams.map((stream) => (
            <div key={stream.id} className="live-stream-card">
              <h2>{stream.title}</h2>
              <p>{stream.description}</p>
              {stream.is_live ? (
                <video controls>
                  <source src={stream.stream_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <p className="offline">🔴 Offline</p>
              )}
              <Link to={`/live-streams/${stream.id}`} className="view-details">
                Watch Stream →
              </Link>
            </div>
          ))
        ) : (
          <p>No live streams available.</p>
        )}
      </div>
    </div>
  );
};

export default liveStreams;
