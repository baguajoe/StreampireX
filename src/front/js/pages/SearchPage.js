import React, { useState } from "react";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [contentType, setContentType] = useState("podcast"); // Default to podcast

  const handleSearch = async () => {
    const response = await fetch(
      `${process.env.REACT_APP_BACKEND_URL}/search?q=${query}&type=${contentType}`
    );
    const data = await response.json();
    setResults(data.podcasts || data.radio_stations || []);
  };

  return (
    <div>
      <h2>Search for Podcasts & Radio Stations</h2>
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select onChange={(e) => setContentType(e.target.value)}>
        <option value="podcast">Podcasts</option>
        <option value="radio">Radio Stations</option>
      </select>
      <button onClick={handleSearch}>🔍 Search</button>

      <ul>
        {results.map((item) => (
          <li key={item.id}>
            <strong>{item.title || item.name}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchPage;


