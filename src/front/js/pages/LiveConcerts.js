import React, { useState, useEffect } from "react";

const LiveConcerts = () => {
  const [concerts, setConcerts] = useState([]);
  const [newConcert, setNewConcert] = useState({ title: "", date: "", price: "" });

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/artist/concerts", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then((res) => res.json())
      .then((data) => setConcerts(data))
      .catch((err) => console.error("Error fetching concerts:", err));
  }, []);

  const handleCreateConcert = () => {
    fetch(process.env.BACKEND_URL + "/api/concerts/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify(newConcert),
    })
      .then((res) => res.json())
      .then(() => alert("Concert created!"))
      .catch((err) => console.error("Error creating concert:", err));
  };

  return (
    <div className="container">
      <h2>🎭 Live Concerts</h2>
      <h3>Create a New Concert</h3>
      <input type="text" placeholder="Title" onChange={(e) => setNewConcert({ ...newConcert, title: e.target.value })} />
      <input type="date" onChange={(e) => setNewConcert({ ...newConcert, date: e.target.value })} />
      <input type="number" placeholder="Ticket Price ($)" onChange={(e) => setNewConcert({ ...newConcert, price: e.target.value })} />
      <button onClick={handleCreateConcert}>Create Concert</button>
    </div>
  );
};

export default LiveConcerts;
