import React, { useEffect, useState } from "react";

const UserProfile = () => {
  const [user, setUser] = useState({});
  const [editing, setEditing] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState({});
  
  useEffect(() => {
    fetch(process.env.BACKEND_URL + "/api/user/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setUpdatedProfile(data);
      })
      .catch((err) => console.error("Error fetching profile:", err));
  }, []);

  const handleEditToggle = () => {
    setEditing(!editing);
  };

  const handleInputChange = (e) => {
    setUpdatedProfile({
      ...updatedProfile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveChanges = () => {
    fetch(process.env.BACKEND_URL + "/api/user/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(updatedProfile),
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setEditing(false);
      })
      .catch((err) => console.error("Error updating profile:", err));
  };

  return (
    <div className="profile-container">
      <h1>👤 User Profile</h1>

      <div className="profile-card">
        <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />

        {editing ? (
          <>
            <input type="text" name="username" value={updatedProfile.username} onChange={handleInputChange} />
            <input type="email" name="email" value={updatedProfile.email} onChange={handleInputChange} />
            <button onClick={handleSaveChanges} className="btn-primary">Save Changes</button>
            <button onClick={handleEditToggle} className="btn-secondary">Cancel</button>
          </>
        ) : (
          <>
            <h2>{user.username}</h2>
            <p>Email: {user.email}</p>
            <p>Subscription: {user.is_premium ? "Premium" : "Free"}</p>
            <button onClick={handleEditToggle} className="btn-primary">Edit Profile</button>
          </>
        )}
      </div>

      <section className="profile-stats">
        <h2>📊 Your Stats</h2>
        <p>🎙 Podcasts Uploaded: {user.podcasts_count || 0}</p>
        <p>📻 Radio Stations: {user.radio_stations_count || 0}</p>
        <p>🎥 Live Streams: {user.live_streams_count || 0}</p>
        <p>💰 Earnings: ${user.earnings || 0}</p>
      </section>

      <section className="account-settings">
        <h2>⚙️ Account Settings</h2>
        <button className="btn-secondary">Change Password</button>
        <button className="btn-danger">Delete Account</button>
      </section>
    </div>
  );
};

export default UserProfile;
