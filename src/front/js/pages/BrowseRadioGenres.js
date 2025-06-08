import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/BrowseGenres.css';

const BrowseRadioGenres = () => {
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    setGenres([
      "Lo-Fi", "Jazz", "Reggae", "Electronic", "Talk Radio", "Rock", "Hip Hop",
      "Classical", "Indie", "Ambient", "Soul", "R&B", "Funk", "Country",
      "Latin", "Afrobeats", "K-Pop", "Pop", "House", "Techno", "Dubstep",
      "News", "Sports", "Spiritual"
    ]);
  }, []);

  return (
    <div className="genre-bar-container">
      <h2 className="genre-bar-heading">🎧 Radio Categories</h2>
      <div className="genre-bar-scroll">
        {genres.map((genre, index) => (
          <Link
            to={`/radio/genre/${encodeURIComponent(genre)}`}
            key={index}
            className="genre-pill-button"
          >
            {genre}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BrowseRadioGenres;
