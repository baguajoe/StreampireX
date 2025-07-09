import React, { useEffect, useState, useContext } from "react";
// Temporarily replace your import with this:
import { getGamerProfile } from "../utils/gamerAPI.js";
console.log("Import successful!");

// And add this console log right after your imports:
console.log("Import successful!");
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";

const GamerProfilePage = () => {
  const { store } = useContext(Context);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const userId = store.user?.id;

  useEffect(() => {
    if (userId) {
      getGamerProfile(userId)
        .then(data => {
          setProfile(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error loading profile:", err);
          setLoading(false);
        });
    }
  }, [userId]);

  if (loading) return <p>Loading gamer profile...</p>;
  if (!profile) return <p>No profile found.</p>;

  return (
    <div className="page-container">
      <h1>🧑‍🚀 Gamer Profile</h1>

      <div className="card bg-dark text-white p-4 mb-4 rounded">
        <p><strong>🎮 Gamer Rank:</strong> {profile.gamer_rank || "N/A"}</p>
        <p><strong>🕹️ Favorite Games:</strong> {profile.favorite_games?.join(", ") || "None listed"}</p>
        <p><strong>🏷️ Gamer Tags:</strong></p>
        <ul>
          {profile.gamer_tags && Object.entries(profile.gamer_tags).map(([platform, tag]) => (
            <li key={platform}><strong>{platform.toUpperCase()}</strong>: {tag}</li>
          ))}
        </ul>
        <p><strong>🧑‍🤝‍🧑 Squad ID:</strong> {profile.squad_id || "Not in a squad"}</p>
      </div>

      {/* <Link to="/profile/gamer/edit" className="btn btn-primary">✏️ Edit My Gamer Profile</Link> */}
      <Link to="/" className="btn btn-primary">✏️ Edit My Gamer Profile</Link>
    </div>
  );
};

export default GamerProfilePage;
