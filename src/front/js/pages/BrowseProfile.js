import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BrowseProfiles = () => {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/profiles")
      .then((res) => res.json())
      .then((data) => setProfiles(data))
      .catch((err) => console.error("Error fetching profiles:", err));
  }, []);

  return (
    <div className="browse-profiles">
      <h1>👥 Browse Profiles</h1>
      <div className="profile-list">
        {profiles.map((user) => (
          <div key={user.id} className="profile-card">
            <img src={user.profile_picture || "/default-avatar.png"} alt={user.username} className="profile-pic" />
            <h3>{user.username}</h3>
            <p>Email: {user.email}</p>
            <Link to={`/profile/${user.id}`} className="btn-secondary">View Profile</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseProfiles;
