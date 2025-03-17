import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/radioStations.css"


const RadioStations = () => {
  const [radioStations, setRadioStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch all radio stations
  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/radio-stations")
      .then((res) => res.json())
      .then((data) => setRadioStations(data))
      .catch((err) => console.error("Error fetching radio stations:", err));
  }, []);

  // Fetch radio categories
  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/radio/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching radio categories:", err));
  }, []);

  // Filter radio stations by search query and category
  const filteredStations = radioStations.filter((station) => {
    return (
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === "" || station.category === selectedCategory)
    );
  });

  // Handle category selection
  const handleCategoryClick = (category) => {
    setSelectedCategory(category === selectedCategory ? "" : category);
  };

  return (
    <div className="radio-stations-container">
      <h1>📻 Browse Radio Stations</h1>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search radio stations..."
        className="search-bar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Categories Bar */}
      <div className="categories-bar">
        <button
          className={`category-badge ${selectedCategory === "" ? "active" : ""}`}
          onClick={() => setSelectedCategory("")}
        >
          All
        </button>
        {categories.map((category, index) => (
          <button
            key={index}
            className={`category-badge ${
              selectedCategory === category ? "active" : ""
            }`}
            onClick={() => handleCategoryClick(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Radio Stations List */}
      <div className="radio-list">
        {filteredStations.length > 0 ? (
          filteredStations.map((station) => (
            <div key={station.id} className="radio-card">
              <h2>{station.name}</h2>
              <p>{station.description}</p>
              <p>
                <strong>Category:</strong> {station.category}
              </p>
              {station.is_live ? (
                <audio controls>
                  <source src={station.stream_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <p className="offline">🔴 Offline</p>
              )}
              <Link
                to={`/radio-stations/${station.id}`}
                className="view-details"
              >
                View Details →
              </Link>
            </div>
          ))
        ) : (
          <p className="no-results">No radio stations found.</p>
        )}
      </div>
    </div>
  );
};

export default RadioStations;