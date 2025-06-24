import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import PollComponent from "../component/PollComponent";
import "../../styles/liveStream.css"; // ensure styles are set here

const categories = [
  "All", "Live DJs", "Talk Shows", "Gaming", "Education", "Fitness", "Yoga", "Music",
  "Meditation", "Tech", "Motivation", "Wellness", "Business", "Art", "Comedy", "News"
];

const LiveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.BACKEND_URL}/api/artist/live-streams`);
        const data = await res.json();
        setLiveStreams(data);
      } catch (err) {
        setError("⚠️ Failed to load live streams. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStreams();
  }, []);

  const filteredStreams = liveStreams.filter((stream) =>
    (selectedCategory === "All" || stream.category === selectedCategory) &&
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="live-streams-wrapper">
      <h2 className="section-title">📺 Live Streams</h2>

      <input
        type="text"
        placeholder="Search live streams..."
        className="search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="category-scroll">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="status-message">⏳ Loading...</div>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : filteredStreams.length === 0 ? (
        <div className="status-message">No live streams available in this category.</div>
      ) : (
        <div className="live-stream-grid">
          {filteredStreams.map((stream) => (
            <div key={stream.id} className="live-stream-card">
              <h3>{stream.title}</h3>
              <p>{stream.description}</p>
              {stream.is_live ? (
                stream.stream_url ? (
                  <LiveVideoPlayer streamUrl={stream.stream_url} />
                ) : (
                  <p>⚠️ Stream unavailable</p>
                )
              ) : (
                <p>🔴 Offline</p>
              )}
              <Link to={`/live-streams/${stream.id}`} className="view-link">
                Watch Now →
              </Link>
              {stream.is_live && <PollComponent streamId={stream.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveStreams;
