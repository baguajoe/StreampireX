// src/front/js/component/GamerGate.js
// Reusable wrapper — shows "Enable Gamer Profile" prompt for non-gamers
// Usage: wrap any gaming page content in <GamerGate> ... </GamerGate>
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Context } from '../store/appContext';
import '../../styles/GamerGate.css';

const GamerGate = ({ children, featureName }) => {
  const { store } = useContext(Context);
  const user = store.user;

  const hasGamerProfile =
    user?.is_gamer === true ||
    user?.profile_type === 'gamer' ||
    user?.profile_type === 'multiple';

  // If user IS a gamer → render the page normally
  if (hasGamerProfile) {
    return <>{children}</>;
  }

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
          <Link to="/add-profile-type" className="gamer-gate-enable-btn">
            🎮 Enable Gamer Profile
          </Link>
          <Link to="/dashboard/gaming" className="gamer-gate-learn-btn">
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GamerGate;