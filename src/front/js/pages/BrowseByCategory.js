import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const ContentByCategory = () => {
  const { category } = useParams();
  const [podcasts, setPodcasts] = useState([]);
  const [radioStations, setRadioStations] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + `/api/podcasts/category/${category}`)
      .then((res) => res.json())
      .then((data) => setPodcasts(data))
      .catch((err) => console.error("Error fetching podcasts:", err));

    fetch(process.env.BACKEND_URL + `/api/radio/genre/${category}`)
      .then((res) => res.json())
      .then((data) => setRadioStations(data))
      .catch((err) => console.error("Error fetching radio stations:", err));
  }, [category]);

  return (
    <div>
      <h1>🎧 Content in {category}</h1>
      
      {/* Podcasts Section */}
      <h2>🎙 Podcasts</h2>
      {podcasts.length === 0 ? (
        <p>No podcasts found in this category.</p>
      ) : (
        <ul>
          {podcasts.map((podcast) => (
            <li key={podcast.id}>
              <h3>{podcast.title}</h3>
              <p>{podcast.description}</p>
              <audio controls src={podcast.file_url}></audio>
            </li>
          ))}
        </ul>
      )}

      {/* Radio Stations Section */}
      <h2>📻 Radio Stations</h2>
      {radioStations.length === 0 ? (
        <p>No radio stations found in this genre.</p>
      ) : (
        <ul>
          {radioStations.map((station) => (
            <li key={station.id}>
              <h3>{station.name}</h3>
              <p>{station.description}</p>
              <p><strong>Genre:</strong> {station.genre}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ContentByCategory;
