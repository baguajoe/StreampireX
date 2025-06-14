import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../../styles/CategoriesBar.css";

import podcast1 from "../../img/podcast1.png";
import podcast2 from "../../img/podcast2.png";
import podcast3 from "../../img/podcast3.png";
import podcast4 from "../../img/podcast4.png";
import podcast5 from "../../img/podcast5.png";
import podcast6 from "../../img/podcast6.png";

// Utility to create slugs from category names
const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const BrowsePodcastCategories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(`${process.env.BACKEND_URL}/api/podcasts/categories`)
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
      category: "True Crime & Investigative Journalism",
      image: podcast1,
    },
    {
      title: "Celebrity Circuit",
      desc: "Daily pop culture recaps & drama.",
      label: "Popular",
      category: "Celebrity Gossip & Reality TV",
      image: podcast2,
    },
    {
      title: "Brush & Beyond",
      desc: "Unlock your artistic side.",
      label: "Trending",
      category: "Education & Learning",
      image: podcast3,
    },
    {
      title: "Laugh Track Live",
      desc: "Fresh comedy from new voices.",
      label: "Trending",
      category: "Comedy & Stand-Up",
      image: podcast4,
    },
    {
      title: "Dice & Destiny",
      desc: "Your go-to RPG campaign companion.",
      label: "Top 10",
      category: "Tabletop & Board Games",
      image: podcast5,
    },
    {
      title: "Binge Breakdown",
      desc: "Reviews, reactions, and recaps.",
      label: "Popular",
      category: "Film & TV Reviews",
      image: podcast6,
    },
  ];

  // ✅ Main renderSection function with filtering logic inside
  const renderSection = (title, filterCategory) => {
    const filteredPodcasts = filterCategory 
      ? samplePodcasts.filter(podcast => podcast.category === filterCategory)
      : samplePodcasts;

    return (
      <div className="podcast-section">
        <h2 className="section-title">{title}</h2>
        <div className="podcast-scroll-row">
          {filteredPodcasts.map((podcast, index) => (
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
  };

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Podcast Categories</h1>

      {/* Horizontal Scrollable Categories */}
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {categories.length > 0 ? (
            categories.map((category, index) => (
              <div
                key={index}
                onClick={() => setSelectedCategory(category)}  // ✅ fixed case-sensitive typo here
                className={`category-pill ${selectedCategory === category ? "active" : ""}`}
              >
                {category}
              </div>
            ))
          ) : (
            <p>Loading categories...</p>
          )}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      {/* Show filtered section */}
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
