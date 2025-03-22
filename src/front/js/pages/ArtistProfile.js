// 📁 /src/pages/ArtistProfile.js

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ArtistProfile = () => {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch artist profile from backend
    fetch("http://localhost:5000/api/artist/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setAvatarUrl(data.avatar_url);
        setUsername(data.username);
      })
      .catch((err) => console.error("Error loading profile", err));
  }, []);

  return (
    <div className="artist-profile">
      <h2>🎤 Welcome, {username}</h2>

      {avatarUrl ? (
        <div>
          <h4>Your Avatar:</h4>
          <model-viewer
            src={avatarUrl}
            alt="Your Avatar"
            auto-rotate
            camera-controls
            style={{ width: "300px", height: "400px" }}
          />
        </div>
      ) : (
        <p>You haven't created an avatar yet.</p>
      )}

      <button
        className="btn"
        onClick={() => navigate("/create-avatar")}
        style={{ marginTop: "20px" }}
      >
        🎭 {avatarUrl ? "Update Your Avatar" : "Create Your Avatar"}
      </button>
    </div>
  );
};

export default ArtistProfile;
