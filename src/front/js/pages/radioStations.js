import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const radioStations = () => {
  const [radioStations, setRadioStations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/radio-stations")
      .then((res) => res.json())
      .then((data) => setRadioStations(data))
      .catch((err) => console.error("Error fetching radio stations:", err));
  }, []);

  const filteredStations = radioStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="radio-stations-container">
      <h1>📻 Live Radio Stations</h1>

      <input
        type="text"
        placeholder="Search radio stations..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="radio-list">
        {filteredStations.map((station) => (
          <div key={station.id} className="radio-card">
            <h2>{station.name}</h2>
            <p>{station.description}</p>
            {station.is_live ? (
              <audio controls>
                <source src={station.stream_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <p className="offline">🔴 Offline</p>
            )}
            <Link to={`/radio-stations/${station.id}`} className="view-details">
              View Details →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default radioStations;
