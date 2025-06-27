import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ProfilePage.css";

const AddArtist = () => {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleAdd = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/add-artist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Artist added!");
        setUsername("");
        setTimeout(() => navigate("/label-dashboard"), 1500);
      } else {
        setMessage(`❌ ${data.error || "Failed to add artist"}`);
      }
    } catch (err) {
      setMessage("❌ Server error");
    }
  };

  return (
    <div className="profile-container">
      <h2>Add Artist to Label</h2>
      <input
        type="text"
        placeholder="Artist's username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="name-input"
      />
      <button onClick={handleAdd} className="btn-primary">➕ Add</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default AddArtist;
