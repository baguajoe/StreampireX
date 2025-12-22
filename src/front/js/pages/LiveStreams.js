import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LiveVideoPlayer from "../component/LiveVideoPlayer";
import PollComponent from "../component/PollComponent";
import "../../styles/liveStream.css";

const categories = [
  "All", "Concerts", "Live DJs", "Talk Shows", "Gaming", "Education", "Fitness", "Yoga", "Music",
  "Meditation", "Tech", "Motivation", "Wellness", "Business", "Art", "Comedy", "News"
];

const LiveStreams = () => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [concerts, setConcerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch live streams
        const streamsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/artist/live-streams`);
        const streamsData = await streamsRes.json();
        setLiveStreams(streamsData);
        
        // Fetch all public concerts
        try {
          const concertsRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/concerts`);
          if (concertsRes.ok) {
            const concertsData = await concertsRes.json();
            setConcerts(concertsData);
          }
        } catch (concertErr) {
          console.log("No concerts available");
        }
        
      } catch (err) {
        setError("⚠️ Failed to load live streams. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStreams = liveStreams.filter((stream) =>
    (selectedCategory === "All" || selectedCategory === "Concerts" || stream.category === selectedCategory) &&
    stream.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConcerts = concerts.filter((concert) =>
    concert.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showConcerts = selectedCategory === "All" || selectedCategory === "Concerts";

  return (
    <div className="live-streams-wrapper">
      <h2 className="section-title">📺 Live Streams</h2>

      <input
        type="text"
        placeholder="Search live streams & concerts..."
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
            {cat === "Concerts" ? "🎭 Concerts" : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="status-message">⏳ Loading...</div>
      ) : error ? (
        <div className="status-message error">{error}</div>
      ) : (
        <>
          {/* Concerts Section - Display Only */}
          {showConcerts && filteredConcerts.length > 0 && (
            <div className="concerts-section">
              <div className="concerts-header">
                <h3>🎭 Upcoming Concerts</h3>
              </div>

              <div className="concerts-grid">
                {filteredConcerts.map((concert) => (
                  <div key={concert.id} className="concert-card">
                    <div className="concert-badge">🎭 CONCERT</div>
                    {concert.cover_image && (
                      <div className="concert-image">
                        <img src={concert.cover_image} alt={concert.title} />
                      </div>
                    )}
                    <h4>{concert.title}</h4>
                    <p className="concert-artist">
                      🎤 {concert.artist_name || concert.artist?.display_name || 'Artist'}
                    </p>
                    <p className="concert-date">
                      📅 {new Date(concert.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {concert.time && ` • 🕐 ${concert.time}`}
                    </p>
                    {concert.description && (
                      <p className="concert-description">{concert.description}</p>
                    )}
                    <div className="concert-footer">
                      <span className="concert-price">
                        {concert.price > 0 ? `$${parseFloat(concert.price).toFixed(2)}` : 'FREE'}
                      </span>
                      <Link to={`/concert/${concert.id}`} className="buy-ticket-btn">
                        🎟️ {concert.price > 0 ? 'Get Tickets' : 'RSVP Free'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Concerts Message */}
          {showConcerts && filteredConcerts.length === 0 && selectedCategory === "Concerts" && (
            <div className="no-concerts">
              <p>🎭 No upcoming concerts at the moment.</p>
              <p>Check back soon for live performances!</p>
            </div>
          )}

          {/* Live Streams Section */}
          {selectedCategory !== "Concerts" && (
            <>
              {filteredStreams.length === 0 ? (
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
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LiveStreams;