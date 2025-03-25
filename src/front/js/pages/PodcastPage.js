import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "../../styles/PodcastPage.css"; // Create this CSS file to match your design

const PodcastPage = () => {
  const { podcast_id } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/podcast/${podcast_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setPodcast(data);
          setEpisodes(data.episodes || []);
        }
      })
      .catch((err) => {
        console.error("Error loading podcast:", err);
        setError("Unable to load podcast.");
      });
  }, [podcast_id]);

  if (error) return <p className="error-message">{error}</p>;
  if (!podcast) return <p>Loading podcast...</p>;

  return (
    <div className="podcast-page">
      <div className="podcast-header">
        <img src={podcast.coverImage || "/default-cover.png"} alt={podcast.title} className="podcast-cover" />
        <div className="podcast-info">
          <h1>{podcast.title}</h1>
          <h3>Hosted by {podcast.host}</h3>
          <p>{podcast.description}</p>
          {podcast.is_premium && <span className="premium-badge">🔒 Premium Podcast</span>}
        </div>
      </div>

      <h2 className="episodes-title">🎧 Episodes</h2>
      <ul className="episode-list">
        {episodes.map((episode) => (
          <li key={episode.id} className="episode-item">
            <h3>{episode.title}</h3>
            <p className="episode-date">{new Date(episode.created_at).toLocaleDateString()}</p>
            <Link to={`/podcast/${podcast.id}/episode/${episode.id}`} className="listen-link">
              ▶️ Listen to Episode
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PodcastPage;
