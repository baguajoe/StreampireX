import React, { useState, useEffect } from "react";
import axios from "axios";

const RadioStationList = () => {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/stations").then((res) => setStations(res.data));
  }, []);

  return (
    <div>
      <h2>📡 Available Radio Stations</h2>
      {stations.map((station) => (
        <div key={station.id}>
          <h3>{station.name}</h3>
          <p>Status: {station.is_live ? "Live" : "Offline"}</p>
          {station.is_live && <audio controls src={station.stream_url} />}
        </div>
      ))}
    </div>
  );
};

export default RadioStationList;
