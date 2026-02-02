// src/front/js/component/GamerGate.js
// Reusable wrapper — shows "Enable Gamer Profile" prompt for non-gamers
// Usage: wrap any gaming page content in <GamerGate> ... </GamerGate>
import React, { useContext, useState } from 'react';
import { Context } from '../store/appContext';
import '../../styles/GamerGate.css';

const GamerGate = ({ children, featureName }) => {
  const { store, actions } = useContext(Context);
  const user = store.user;
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState(null);

  const hasGamerProfile =
    user?.is_gamer === true ||
    user?.profile_type === 'gamer' ||
    user?.profile_type === 'multiple';

  // If user IS a gamer → render the page normally
  if (hasGamerProfile) {
    return <>{children}</>;
  }

  // Enable gamer profile via API
  const handleEnable = async () => {
    setEnabling(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/gamer-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_gamer: true })
      });

      if (!response.ok) {
        throw new Error("Failed to enable gamer profile");
      }

      const data = await response.json();

      // Update local user data so the gate opens immediately
      const updatedUser = { ...user, is_gamer: true };
      // Update profile_type to 'multiple' if they already have another type
      if (user.is_artist || user.is_video_creator) {
        updatedUser.profile_type = "multiple";
      } else {
        updatedUser.profile_type = "gamer";
      }

      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Refresh profile from store if action exists
      if (actions.fetchUserProfile) {
        await actions.fetchUserProfile();
      } else {
        // Fallback: force reload to pick up changes
        window.location.reload();
      }
    } catch (err) {
      console.error("Enable gamer profile error:", err);
      setError("Something went wrong. Please try again.");
      setEnabling(false);
    }
  };

  // If user is NOT a gamer → show enable prompt
  return (
    <div className="gamer-gate">
      <div className="gamer-gate-card">
        <div className="gamer-gate-glow"></div>

        <div className="gamer-gate-icon">🎮</div>

        <h2 className="gamer-gate-title">
          Gamer Profile Required
        </h2>

        <p className="gamer-gate-description">
          {featureName
            ? `To access ${featureName}, you need a gamer profile. Enable it to unlock the full gaming experience.`
            : 'This feature requires a gamer profile. Enable it to access chatrooms, team rooms, squad finder, and more.'}
        </p>

        <div className="gamer-gate-features">
          <div className="gamer-gate-feature">
            <span className="gf-icon">💬</span>
            <span>Gamer Chatrooms</span>
          </div>
          <div className="gamer-gate-feature">
            <span className="gf-icon">🧑‍🤝‍🧑</span>
            <span>Team Rooms & Video</span>
          </div>
          <div className="gamer-gate-feature">
            <span className="gf-icon">🔍</span>
            <span>Squad Finder</span>
          </div>
          <div className="gamer-gate-feature">
            <span className="gf-icon">🏆</span>
            <span>Gaming Stats & Profile</span>
          </div>
        </div>

        <div className="gamer-gate-actions">
          <button
            className="gamer-gate-enable-btn"
            onClick={handleEnable}
            disabled={enabling}
          >
            {enabling ? '⏳ Enabling...' : '🎮 Enable Gamer Profile'}
          </button>
          {error && <p className="gamer-gate-error">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default GamerGate;