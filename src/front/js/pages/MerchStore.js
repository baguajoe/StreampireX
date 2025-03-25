import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PollComponent from "../component/PollComponent";
import LiveVideoPlayer from "../component/LiveVideoPlayer";

const LiveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${process.env.BACKEND_URL}/api/live-streams`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setLiveStreams(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Error fetching live streams: " + err.message);
        setLoading(false);
      });
  }, []);

  const filteredStreams = liveStreams.filter((stream) =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <p>Loading live streams...</p>;
  if (error) return <p>{error}</p>;

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
                stream.stream_url ? (
                  <LiveVideoPlayer streamUrl={stream.stream_url} />
                ) : (
                  <p>Stream URL unavailable</p>
                )
              ) : (
                <p className="offline">🔴 Offline</p>
              )}
              <Link to={`/live-streams/${stream.id}`} className="view-details">
                Watch Stream →
              </Link>
              {stream.is_live && <PollComponent streamId={stream.id} />}
            </div>
          ))
        ) : (
          <p>No live streams available.</p>
        )}
      </div>
    </div>
  );
};

export default LiveStreams;