import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/ProfilePage.css";
import AddArtist from "../component/AddArtist"; // moved to component

const LabelDashboard = () => {
  const [labelInfo, setLabelInfo] = useState({});
  const [artists, setArtists] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [showAddArtist, setShowAddArtist] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/label-dashboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLabelInfo(data.label);
        setArtists(data.artists);
      })
      .catch((err) => console.error("Failed to fetch label info", err));
  }, []);

  const handleSelectArtist = (id) => {
    setSelectedArtistId(id);
    navigate(`/artist-dashboard/${id}`);
  };

  return (
    <div className="profile-container">
      <div className="profile-layout">
        {/* LEFT COLUMN */}
        <div className="left-column">
          <h3>🎙️ {labelInfo.name || "Label Dashboard"}</h3>
          <p>Manage your artists and uploads from one place.</p>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="middle-column">
          <h3>👥 Your Artists</h3>
          {artists.length === 0 ? (
            <p>No artists linked yet.</p>
          ) : (
            artists.map((artist) => (
              <div key={artist.id} className="post-card">
                <p><strong>{artist.display_name || artist.username}</strong></p>
                <p>{artist.bio || "No bio available."}</p>
                <button onClick={() => handleSelectArtist(artist.id)}>🎛️ Manage Artist</button>
              </div>
            ))
          )}

          {showAddArtist && (
            <div style={{ marginTop: "20px" }}>
              <h4>➕ Add New Artist</h4>
              <AddArtist onSuccess={() => setShowAddArtist(false)} />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="right-column">
          <div className="quick-actions">
            <h3>➕ Artist Management</h3>
            <button className="btn-podcast" onClick={() => setShowAddArtist(!showAddArtist)}>
              {showAddArtist ? "❌ Cancel" : "➕ Add New Artist"}
            </button>

            <h3>💸 Revenue Split</h3>
            <Link to="/revenue-dashboard">
              <button className="btn-radio">📊 View Revenue Breakdown</button>
            </Link>

            <h3>📦 Upload on Behalf</h3>
            <Link to="/upload?as=label">
              <button className="btn-indie-upload">🎵 Upload Content</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelDashboard;
