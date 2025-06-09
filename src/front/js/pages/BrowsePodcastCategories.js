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
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/podcasts/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  const scrollLeft = () => {
    scrollRef.current.scrollLeft -= 200;
  };

  const scrollRight = () => {
    scrollRef.current.scrollLeft += 200;
  };

  const samplePodcasts = [
    {
      title: "Cold Cases Uncovered",
      desc: "Exploring the dark corners of justice.",
      label: "New",
      image: podcast1,
    },
    {
      title: "Celebrity Circuit",
      desc: "Daily pop culture recaps & drama.",
      label: "Popular",
      image: podcast2,
    },
    {
      title: "Brush & Beyond",
      desc: "Unlock your artistic side.",
      label: "Trending",
      image: podcast3,
    },
    {
      title: "Laugh Track Live",
      desc: "Fresh comedy from new voices.",
      label: "Trend",
      image: podcast4,
    },
    {
      title: "Dice & Destiny",
      desc: "Your go-to RPG campaign companion.",
      label: "Top 10",
      image: podcast5,
    },
    {
      title: "Binge Breakdown",
      desc: "Reviews, reactions, and recaps.",
      label: "Popular",
      image: podcast6,
    },
  ];

  const renderSection = (title) => (
    <div className="podcast-section">
      <h2 className="section-title">{title}</h2>
      <div className="podcast-scroll-row">
        {samplePodcasts.map((podcast, index) => (
          <div key={index} className="podcast-card">
            <img src={podcast.image} alt={podcast.title} className="podcast-img" />
            <h3 className="podcast-title">{podcast.title}</h3>
            <span className="podcast-label">{podcast.label}</span>
            <p className="podcast-desc">{podcast.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Podcast Categories</h1>
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {categories.length > 0 ? (
            categories.map((category, index) => (
              <Link key={index} to={`/category/${category}`} className="category-pill">
                {category}
              </Link>
            ))
          ) : (
            <p>Loading categories...</p>
          )}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {/* 👥 Creators for You */}
      <h2 className="section-title">👥 Creators for You</h2>
      <div className="podcast-scroll-row">
        {samplePodcasts.map((podcast, i) => (
          <div key={i} className="podcast-card">
            <img
              src={podcast.image}
              alt="Podcast cover"
              className="podcast-img"
            />
            <h3 className="podcast-title">{podcast.title}</h3>
            <span className="podcast-label">{podcast.label}</span>
            <p className="podcast-desc">{podcast.desc}</p>
          </div>
        ))}
      </div>

      {/* Horizontal Carousels */}
      {renderSection("🆕 New on StreampireX")}
      {renderSection("🔥 Top Streamers")}
      {renderSection("🌟 Popular This Week")}
    </div>
  );
};

export default BrowsePodcastCategories;
