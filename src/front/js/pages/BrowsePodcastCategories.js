import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../../styles/CategoriesBar.css";

import podcast1 from "../../img/podcast1.png";
import podcast2 from "../../img/podcast2.png";
import podcast3 from "../../img/podcast3.png";
import podcast4 from "../../img/podcast4.png";
import podcast5 from "../../img/podcast5.png";
import podcast6 from "../../img/podcast6.png";

const BrowsePodcastCategories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const fallbackCategories = [
    { name: "True Crime & Investigative Journalism" },
    { name: "Celebrity Gossip & Reality TV" },
    { name: "Education & Learning" },
    { name: "Comedy & Stand-Up" },
    { name: "Tabletop & Board Games" },
    { name: "Film & TV Reviews" },
    { name: "Technology & Science" },
    { name: "Health & Wellness" },
    { name: "Business & Finance" },
    { name: "Sports & Recreation" },
  ];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/podcasts/categories`);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        } else {
          console.warn("Using fallback categories");
          setCategories(fallbackCategories);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
        setCategories(fallbackCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft -= 200;
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft += 200;
  };

  const samplePodcasts = [
    {
      id: 101,
      title: "Cold Cases Uncovered",
      desc: "Exploring the dark corners of justice.",
      label: "New",
      category: "True Crime & Investigative Journalism",
      image: podcast1,
    },
    {
      id: 102,
      title: "Celebrity Circuit",
      desc: "Daily pop culture recaps & drama.",
      label: "Popular",
      category: "Celebrity Gossip & Reality TV",
      image: podcast2,
    },
    {
      id: 103,
      title: "Brush & Beyond",
      desc: "Unlock your artistic side.",
      label: "Trending",
      category: "Education & Learning",
      image: podcast3,
    },
    {
      id: 104,
      title: "Laugh Track Live",
      desc: "Fresh comedy from new voices.",
      label: "Trending",
      category: "Comedy & Stand-Up",
      image: podcast4,
    },
    {
      id: 105,
      title: "Dice & Destiny",
      desc: "Your go-to RPG campaign companion.",
      label: "Top 10",
      category: "Tabletop & Board Games",
      image: podcast5,
    },
    {
      id: 106,
      title: "Binge Breakdown",
      desc: "Reviews, reactions, and recaps.",
      label: "Popular",
      category: "Film & TV Reviews",
      image: podcast6,
    },
  ];

  const renderSection = (title, filterCategory) => {
    const filteredPodcasts = filterCategory
      ? samplePodcasts.filter(p => p.category === filterCategory)
      : samplePodcasts;

    if (filteredPodcasts.length === 0) {
      return (
        <div className="podcast-section">
          <h2 className="section-title">{title}</h2>
          <p className="no-podcasts">No podcasts found in this category.</p>
        </div>
      );
    }

    return (
      <div className="podcast-section">
        <h2 className="section-title">{title}</h2>
        <div className="podcast-scroll-row">
          {filteredPodcasts.map((podcast) => (
            <Link
              to={`/podcast/${podcast.id}`}
              key={podcast.id}
              className="podcast-card"
            >
              <img src={podcast.image} alt={podcast.title} className="podcast-img" />
              <h3 className="podcast-title">{podcast.title}</h3>
              <span className="podcast-label">{podcast.label}</span>
              <p className="podcast-desc">{podcast.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Podcast Categories</h1>

      {error && (
        <div className="error-message" style={{ background: "#fee", border: "1px solid #fcc", padding: "10px", borderRadius: "5px", margin: "10px 0", color: "#c33" }}>
          ⚠️ Could not load categories from server. Using default categories.
        </div>
      )}

      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {loading ? (
            <div className="loading-spinner">Loading categories...</div>
          ) : categories.length > 0 ? (
            categories.map((category, index) => (
              <div
                key={index}
                onClick={() => setSelectedCategory(category.name)}
                className={`category-pill ${selectedCategory === category.name ? "active" : ""}`}
              >
                {category.name}
              </div>
            ))
          ) : (
            <p>No categories available</p>
          )}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {selectedCategory ? (
        renderSection(`🎯 ${selectedCategory}`, selectedCategory)
      ) : (
        <>
          {renderSection("🆕 New on StreampireX")}
          {renderSection("🔥 Top Streamers")}
          {renderSection("🌟 Popular This Week")}
        </>
      )}
    </div>
  );
};

export default BrowsePodcastCategories;
