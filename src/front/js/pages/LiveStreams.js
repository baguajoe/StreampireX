import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PollComponent from "../component/PollComponent";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import "../../styles/liveStream.css"; // Import the stylesheet in your component file


const LiveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.BACKEND_URL}/api/live-streams`);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        setLiveStreams(data);
        setLoading(false);
      } catch (err) {
        setError(`Error fetching live streams: ${err.message}`);
        setLoading(false);
      }
    };

    fetchLiveStreams();
  }, []);

  const filteredStreams = liveStreams.filter((stream) =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="loading-container">Loading live streams...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="live-streams-container">
      <h1>🎥 Live Streams</h1>

      <input
        type="text"
        placeholder="Search live streams..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search live streams"
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
                  <p className="stream-unavailable">Stream URL unavailable</p>
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
          <p className="no-streams">No live streams available.</p>
        )}
      </div>
    </div>
  );
};

export default LiveStreams;