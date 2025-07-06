import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import "../../styles/sidebar.css";

const SidebarContainer = styled.div`
  width: 250px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: #002b5c;
`;

const SectionHeader = styled.h4`
  color: #ffa726;
  margin-top: 20px;
  margin-bottom: 10px;
  padding-left: 15px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
`;

const MenuItem = styled(Link)`
  padding: 12px 15px;
  color: #ffffff;
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 15px;
  border-left: 4px solid transparent;
  transition: background 0.3s, border-color 0.3s;
  &:hover {
    background: #1a3c70;
  }
  &.active {
    background: #1a3c70;
    border-left: 4px solid #00b8d4;
  }
`;

const Sidebar = ({ user }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname.startsWith(path.replace(/:\w+/g, ""));

  const [showGamerSection, setShowGamerSection] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_gamer_expanded");
    if (saved) setShowGamerSection(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_gamer_expanded", showGamerSection);
  }, [showGamerSection]);

  return (
    <SidebarContainer className="sidebar">
      {/* Dashboards */}
      <SectionHeader>📊 Dashboards</SectionHeader>
      <MenuItem to="/creator-dashboard" className={isActive("/creator-dashboard") ? "active" : ""}>🚀 Creator Dashboard</MenuItem>
      <MenuItem to="/artist-dashboard" className={isActive("/artist-dashboard") ? "active" : ""}>🎤 Artist Dashboard</MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>🎧 Podcast Dashboard</MenuItem>
      <MenuItem to="/radio-dashboard" className={isActive("/radio-dashboard") ? "active" : ""}>📻 Radio Dashboard</MenuItem>

      {/* User */}
      <SectionHeader>👤 User</SectionHeader>
      <MenuItem to="/home-feed" className={isActive("/home-feed") ? "active" : ""}>🏠 Home Feed</MenuItem>
      <MenuItem to="/profile" className={isActive("/profile") ? "active" : ""}>👤 Profile</MenuItem>

      {/* Podcasts */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>🎙️ Create Podcast</MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>🎧 Browse Categories</MenuItem>

      {/* Videos */}
      <SectionHeader>🎬 Videos</SectionHeader>
      <MenuItem to="/videos" className={isActive("/videos") ? "active" : ""}>🎞️ Browse Videos</MenuItem>

      {/* Radio */}
      <SectionHeader>📻 Radio Stations</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>📻 Browse Stations</MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>➕ Create Station</MenuItem>

      {/* Indie Artists */}
      <SectionHeader>🎤 Indie Artists</SectionHeader>
      <MenuItem to="/upload-music" className={isActive("/upload-music") ? "active" : ""}>⬆️ Upload Music</MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>🔍 Search Artists</MenuItem>

      {/* Live Streaming */}
      <SectionHeader>🎥 Live Streaming</SectionHeader>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>📡 Live Streams</MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>🎶 Live Concerts</MenuItem>

      <>
        <SectionHeader onClick={() => setShowGamerSection(!showGamerSection)}>
          🎮 Gamers {showGamerSection ? "🔽" : "▶️"}
        </SectionHeader>
        {showGamerSection && (
          <>
            <MenuItem to="/gamers/chat" className={isActive("/gamers/chat") ? "active" : ""}>
              💬 Gamer Chatrooms
            </MenuItem>
            <MenuItem to="/profile/gamer" className={isActive("/profile/gamer") ? "active" : ""}>
              🧑‍🚀 My Gamer Profile
            </MenuItem>
            <MenuItem to="/team-room" className={isActive("/team-room") ? "active" : ""}>
              🧑‍🤝‍🧑 Team Room
            </MenuItem>
            <MenuItem to="/squad-finder" className={isActive("/squad-finder") ? "active" : ""}>
              🔍 Find Squads
            </MenuItem>
          </>
        )}
      </>


      {/* Account */}
      <SectionHeader>👤 Account</SectionHeader>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>⚙️ Settings</MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;
