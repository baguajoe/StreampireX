import React, { useState, useEffect } from "react";

const ArtistRadioStation = () => {
  const [station, setStation] = useState(null);
  const [stationName, setStationName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/artist/radio", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then((data) => setStation(data))
      .catch((err) => console.error("Error fetching radio station:", err));
  }, []);

  const handleCreateStation = () => {
    fetch(process.env.BACKEND_URL + "/api/radio/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ name: stationName, description }),
    })
      .then((res) => res.json())
      .then((data) => setStation(data.station))
      .catch((err) => console.error("Error creating station:", err));
  };

  return (
    <div className="container">
      <h2>📡 Your Radio Station</h2>
      {station ? (
        <div>
          <h3>{station.name}</h3>
          <p>{station.description}</p>
          <p>Live: {station.is_live ? "✅ Yes" : "❌ No"}</p>
        </div>
      ) : (
        <div>
          <h3>Create a New Radio Station</h3>
          <input
            type="text"
            placeholder="Station Name"
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button onClick={handleCreateStation}>Create Station</button>
        </div>
      )}
    </div>
  );
};

export default ArtistRadioStation;
