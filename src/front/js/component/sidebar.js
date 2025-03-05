import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="d-flex flex-column bg-light" style={{ height: "100vh", width: "250px" }}>
      <h3 className="text-center py-3">Dashboard</h3>
      <nav className="nav flex-column px-3">
        <Link className="nav-link" to="/home">
          🏠 Home
        </Link>
        <Link className="nav-link" to="/podcasts">
          🎙 Podcasts
        </Link>
        <Link className="nav-link" to="/radiostations">
          📻 Radio Stations
        </Link>
        <Link className="nav-link" to="/livestream">
          🎥 Live Streams
        </Link>
        <Link className="nav-link" to="/creatordashboard">
          🚀 Creator Dashboard
        </Link>

        {/* New Radio Genre Section */}
        <h4 className="mt-3">🎶 Radio Genres</h4>
        <Link className="nav-link" to="/radio/genres">
          Browse by Genre
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
