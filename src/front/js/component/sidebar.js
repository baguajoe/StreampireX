// Sidebar.js (Left Menu)
import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <h2>🎙 Audio Platform</h2>
      <nav>
        <ul>
          <li><Link to="/">🏠 Home</Link></li>
          <li><Link to="/podcasts">🎧 Podcasts</Link></li>
          <li><Link to="/radio-stations">📻 Radio Stations</Link></li>
          <li><Link to="/live-streams">🎥 Live Streams</Link></li>
          <li><Link to="/dashboard">🚀 Creator Dashboard</Link></li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
