// ✅ Updated Sidebar.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import "../../styles/sidebar.css";

const SidebarContainer = styled.div`
  width: 250px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const SectionHeader = styled.h4`
  color: #ffffff;
  margin-top: 20px;
  margin-bottom: 10px;
  padding-left: 15px;
`;

const MenuItem = styled(Link)`
  padding: 15px;
  color: #ffffff;
  text-decoration: none;
  display: flex;
  align-items: center;
  &:hover {
    background: #333;
  }
  &.active {
    background: #333;
    border-left: 3px solid #00b8d4;
  }
`;

const Sidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path.replace(/:\w+/g, ""));

  return (
    <SidebarContainer className="sidebar">
      <SectionHeader>👤 User & Account</SectionHeader>
      <MenuItem to="/profile" className={isActive("/profile") ? "active" : ""}>👤 Profile</MenuItem>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>⚙️ Settings</MenuItem>
      <MenuItem to="/notifications" className={isActive("/notifications") ? "active" : ""}>🔔 Notifications</MenuItem>

      <SectionHeader>📊 Dashboards</SectionHeader>
      <MenuItem to="/artist-dashboard" className={isActive("/artist-dashboard") ? "active" : ""}>🎤 Artist Dashboard</MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>🎧 Podcast Dashboard</MenuItem>
      <MenuItem to="/radio-dashboard" className={isActive("/radio-dashboard") ? "active" : ""}>📻 Radio Dashboard</MenuItem>

      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>🎙️ Create Podcast</MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>🎧 Browse Podcast Categories</MenuItem>

      <MenuItem to="/podcasts" className={isActive("/podcasts") ? "active" : ""}>📁 All Podcasts</MenuItem>

      <SectionHeader>📻 Radio Stations</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>📻 Browse Stations</MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>➕ Create Station</MenuItem>
      <MenuItem to="/artist-radio" className={isActive("/artist-radio") ? "active" : ""}>🎤 Artist Radio</MenuItem>

      <SectionHeader>🎤 Indie Artists</SectionHeader>
      <MenuItem to="/upload-music" className={isActive("/upload-music") ? "active" : ""}>⬆️ Upload Music</MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>🔍 Search Artists</MenuItem>

      <SectionHeader>🎥 Live Streaming</SectionHeader>
      <MenuItem to="/studio" className={isActive("/studio") ? "active" : ""}>🎥 Live Studio</MenuItem>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>📡 Live Streams</MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>🎶 Live Concerts</MenuItem>

      <SectionHeader>💰 Monetization</SectionHeader>
      <MenuItem to="/payout-request" className={isActive("/payout-request") ? "active" : ""}>💵 Payout</MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;