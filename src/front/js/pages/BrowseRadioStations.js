import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BrowseRadioStations = () => {
  const [radioStations, setRadioStations] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/public-radio-stations")
      .then((res) => res.json())
      .then((data) => setRadioStations(data))
      .catch((err) => console.error("Error fetching radio stations:", err));
  }, []);

  return (
    <div className="browse-radio-stations">
      <h1>📻 Browse Radio Stations</h1>
      <div className="content-list">
        {radioStations.map((station) => (
          <div key={station.id} className="content-card">
            <h3>{station.name}</h3>
            <p>{station.description}</p>
            <Link to={`/radio-stations/${station.id}`} className="btn-secondary">Listen Now</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseRadioStations;
