import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Podcasts = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/podcasts")
      .then((res) => res.json())
      .then((data) => setPodcasts(data))
      .catch((err) => console.error("Error fetching podcasts:", err));
  }, []);

  const filteredPodcasts = podcasts.filter(podcast =>
    podcast.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="podcasts-container">
      <h1>🎙 Podcasts</h1>
      
      <input
        type="text"
        placeholder="Search podcasts..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="podcast-list">
        {filteredPodcasts.map((podcast) => (
          <div key={podcast.id} className="podcast-card">
            <img src={podcast.cover_art_url} alt={podcast.name} className="podcast-cover" />
            <div className="podcast-info">
              <h2>{podcast.name}</h2>
              <p>{podcast.description}</p>
              <audio controls>
                <source src={podcast.file_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <Link to={`/podcasts/${podcast.id}`} className="view-details">View Details →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Podcasts;
