import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const PodcastCategoryPage = () => {
  const { categoryName } = useParams();
  const [podcasts, setPodcasts] = useState([]);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/podcast-category/${categoryName}`)
      .then((res) => res.json())
      .then((data) => setPodcasts(data))
      .catch((err) => console.error("Error fetching category:", err));
  }, [categoryName]);

  return (
    <div className="category-page">
      <h1>🎧 {categoryName.replace(/-/g, " ")} Podcasts</h1>
      {podcasts.length === 0 ? (
        <p>No podcasts found in this category.</p>
      ) : (
        <div className="podcast-grid">
          {podcasts.map((podcast) => (
            <div key={podcast.id} className="podcast-card">
              <img src={podcast.cover_art_url} alt={podcast.title} />
              <h3>{podcast.title}</h3>
              <p>{podcast.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PodcastCategoryPage;
