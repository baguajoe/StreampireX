import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import "../../styles/BrowseStations.css";
import { Link } from "react-router-dom";

const BrowseRadioStations = () => {
  const { genre } = useParams();
  const [stations, setStations] = useState([]);
  const [genres] = useState([
    "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
    "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
    "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
    "News", "Sports", "Spiritual"
  ]);
  const scrollRef = useRef(null);

  const scrollLeft = () => scrollRef.current.scrollLeft -= 200;
  const scrollRight = () => scrollRef.current.scrollLeft += 200;

  useEffect(() => {
    const dummyStations = [ /* ← keep your existing station list */ ];

    setStations(
      genre ? dummyStations.filter(station => station.genre === genre) : dummyStations
    );
  }, [genre]);

  return (
    <div className="categories-wrapper">
      <h1 className="categories-heading">🎧 Radio Categories</h1>
      <div className="category-nav">
        <button onClick={scrollLeft} className="scroll-button">‹</button>
        <div className="categories-scroll" ref={scrollRef}>
          {genres.map((g, index) => (
            <Link
              key={index}
              to={`/radio/genre/${encodeURIComponent(g)}`}
              className={`category-pill ${genre === g ? "active" : ""}`}
            >
              {g}
            </Link>
          ))}
        </div>
        <button onClick={scrollRight} className="scroll-button">›</button>
      </div>

      <h2 className="section-title">
        {genre ? `🎧 ${genre} Stations` : "🎧 All Radio Stations"}
      </h2>

      {stations.length === 0 ? (
        <p className="loading">No stations found for this genre.</p>
      ) : (
        <div className="podcast-grid">
          {stations.map((station, index) => (
            <div key={index} className="podcast-card">
              <div className="podcast-img-placeholder" />
              <h3 className="podcast-title">{station.name}</h3>
              <span className="podcast-label">{station.genre}</span>
              <p className="podcast-desc">{station.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseRadioStations;
