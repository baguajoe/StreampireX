import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../../styles/sidebar.css";

const Sidebar = () => {
  const location = useLocation();

  // Function to check if the current path matches the link
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="sidebar">
      <h3 className="text-center">Dashboard</h3>
      <nav className="nav flex-column">
        <Link className={`nav-link ${isActive("/home") ? "active" : ""}`} to="/home">
          🏠 Home
        </Link>
        <Link className={`nav-link ${isActive("/podcasts") ? "active" : ""}`} to="/podcasts">
          🎙 Podcasts
        </Link>
        <Link className={`nav-link ${isActive("/radio-stations") ? "active" : ""}`} to="/radio-stations">
          📻 Radio Stations
        </Link>
        <Link className={`nav-link ${isActive("/live-streams") ? "active" : ""}`} to="/live-streams">
          🎥 Live Streams
        </Link>
        <Link className={`nav-link ${isActive("/dashboard") ? "active" : ""}`} to="/dashboard">
          🚀 Creator Dashboard
        </Link>

        {/* New Radio Genre Section */}
        <h4>🎶 Radio Genres</h4>
        <Link className={`nav-link ${isActive("/radio/genres") ? "active" : ""}`} to="/radio/genres">
          Browse by Genre
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;