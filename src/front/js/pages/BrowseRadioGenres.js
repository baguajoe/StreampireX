import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const BrowseRadioGenres = () => {
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio/categories`)
      .then((res) => res.json())
      .then((data) => setGenres(data))
      .catch((err) => console.error("Error fetching radio categories:", err));
  }, []);

  return (
    <div>
      <h1>🎶 Browse Radio Stations by Genre</h1>
      {genres.length === 0 ? (
        <p>Loading genres...</p>
      ) : (
        <ul>
          {genres.map((genre, index) => (
            <li key={index}>
              <Link to={`/radio/genre/${genre}`}>{genre}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BrowseRadioGenres;
