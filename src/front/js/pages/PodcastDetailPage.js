// PodcastDetailPage.js

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/PodcastDetailPage.css";

const PodcastDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendUrl =
          process.env.REACT_APP_BACKEND_URL ||
          process.env.BACKEND_URL ||
          "http://localhost:3001";

        const [podcastRes, episodesRes] = await Promise.all([
          fetch(`${backendUrl}/api/podcast/${id}`),
          fetch(`${backendUrl}/api/podcast/${id}/episodes`)
        ]);

        if (!podcastRes.ok) throw new Error("Podcast not found");
        const podcastData = await podcastRes.json();
        setPodcast(podcastData);

        if (episodesRes.ok) {
          const episodesData = await episodesRes.json();
          setEpisodes(episodesData);
        }
      } catch (err) {
        console.error("Error fetching podcast or episodes:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPodcast();
  }, [id]);

  const handleBack = () => navigate(-1);

  if (loading) {
    return <div className="loading-spinner">Loading podcast details...</div>;
  }

  if (error || !podcast) {
    return (
      <div className="error-view">
        <h2>Podcast Not Found</h2>
        <p>{error || "Something went wrong."}</p>
        <button onClick={handleBack}>← Go Back</button>
      </div>
    );
  }

  return (
    <div className="podcast-detail-container">
      <button onClick={handleBack} className="back-button">← Back</button>

      <div className="podcast-header">
        <img
          src={podcast.cover_image_url || "https://via.placeholder.com/300"}
          alt={podcast.title}
          className="podcast-cover"
        />
        <div className="podcast-info">
          <h1>{podcast.title}</h1>
          <p>{podcast.description}</p>
          <span className="podcast-category">{podcast.category}</span>
        </div>
      </div>

      <div className="podcast-episodes">
        <h2>Episodes</h2>
        {episodes.length === 0 ? (
          <p>No episodes available.</p>
        ) : (
          <ul className="episode-list">
            {episodes.map((ep) => (
              <li key={ep.id} className="episode-item">
                <h3>{ep.title}</h3>
                <p>{ep.description}</p>
                <audio controls src={ep.file_url}></audio>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PodcastDetailPage;
