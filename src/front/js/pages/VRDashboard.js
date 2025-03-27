// src/pages/VRDashboard.js

import React from 'react';
import VRUserDashboard from '../component/VRUserDashboard';
import VREventList from '../component/VREventList';
import VREventManagement from '../component/VREventManagement';
import "../../styles/VRDashboard.css";


const VRDashboard = () => {
  return (
    <div className="profile-container">
      <h1 className="dashboard-title">🎮 Your VR Dashboard</h1>
      <div className="profile-layout">

        {/* Left Column: Avatar Preview or VR Status */}
        <div className="left-column">
          <div className="profile-card">
            <img
              src="/default-avatar.png"
              alt="VR Avatar"
              className="profile-pic"
            />
            <h2>VR Identity</h2>
            <p>Ready to explore virtual venues!</p>
            <button className="btn-primary">Join VR Room</button>
          </div>
        </div>

        {/* Middle Column: Events Feed */}
        <div className="middle-column">
          <VRUserDashboard />
          <VREventList />
        </div>

        {/* Right Column: Event Management or Quick Actions */}
        <div className="right-column">
          <h3>🎛️ Manage Your Events</h3>
          <VREventManagement />
        </div>

      </div>
    </div>
  );
};

export default VRDashboard;