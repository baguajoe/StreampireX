import React from "react";
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

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path.replace(/:\w+/g, ""));

  return (
    <SidebarContainer className="sidebar">
      {/* User Section */}
      <SectionHeader>👤 User & Account</SectionHeader>
      <MenuItem to="/profile" className={isActive("/profile") ? "active" : ""}>👤 Profile</MenuItem>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>⚙️ Settings</MenuItem>
      <MenuItem to="/notifications" className={isActive("/notifications") ? "active" : ""}>🔔 Notifications</MenuItem>

      {/* Dashboards */}
      <SectionHeader>📊 Dashboards</SectionHeader>
      <MenuItem to="/creator-dashboard" className={isActive("/creator-dashboard") ? "active" : ""}>🚀 Creator Dashboard</MenuItem>
      <MenuItem to="/artist-dashboard" className={isActive("/artist-dashboard") ? "active" : ""}>🎤 Artist Dashboard</MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>🎧 Podcast Dashboard</MenuItem>
      <MenuItem to="/radio-dashboard" className={isActive("/radio-dashboard") ? "active" : ""}>📻 Radio Dashboard</MenuItem>
      <MenuItem to="/listener-dashboard" className={isActive("/listener-dashboard") ? "active" : ""}>🎧 Listener Dashboard</MenuItem>
      <MenuItem to="/admin-dashboard" className={isActive("/admin-dashboard") ? "active" : ""}>📈 Admin Dashboard</MenuItem>


      {/* Podcasts */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>🎙️ Create Podcast</MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>🎧 Browse Categories</MenuItem>
      <MenuItem to="/podcasts" className={isActive("/podcasts") ? "active" : ""}>📁 All Podcasts</MenuItem>

      {/* Radio */}
      <SectionHeader>📻 Radio Stations</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>📻 Browse Stations</MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>➕ Create Station</MenuItem>
      <MenuItem to="/artist-radio" className={isActive("/artist-radio") ? "active" : ""}>🎤 Artist Radio</MenuItem>

      {/* Indie Artists */}
      <SectionHeader>🎤 Indie Artists</SectionHeader>
      <MenuItem to="/upload-music" className={isActive("/upload-music") ? "active" : ""}>⬆️ Upload Music</MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>🔍 Search Artists</MenuItem>

      {/* Live Streaming */}
      <SectionHeader>🎥 Live Streaming</SectionHeader>
      <MenuItem to="/studio" className={isActive("/studio") ? "active" : ""}>🎥 Live Studio</MenuItem>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>📡 Live Streams</MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>🎶 Live Concerts</MenuItem>

      {/* Monetization */}
      <SectionHeader>💰 Monetization</SectionHeader>
      <MenuItem to="/payout-request" className={isActive("/payout-request") ? "active" : ""}>💵 Payout Request</MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;
