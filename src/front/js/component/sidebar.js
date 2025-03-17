import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import "../../styles/sidebar.css"

const SidebarContainer = styled.div`
  width: 250px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.h2`
  color: #ffffff;
  margin-bottom: 20px;
`;

const MenuItem = styled(Link)`
  padding: 15px;
  cursor: pointer;
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

const SectionHeader = styled.h4`
  color: #ffffff;
  margin-top: 20px;
  margin-bottom: 10px;
  padding-left: 15px;
`;

const Sidebar = () => {
  const location = useLocation();

  // Function to check if the current path matches the link
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <SidebarContainer className="sidebar">
      <SidebarHeader>🎙️ Podcast</SidebarHeader>
      <MenuItem to="/home" className={isActive("/home") ? "active" : ""}>
        🏠 Home
      </MenuItem>
      <MenuItem to="/podcasts" className={isActive("/podcasts") ? "active" : ""}>
        🎙 Podcasts
      </MenuItem>
      <MenuItem to="/radio-stations" className={isActive("/radio-stations") ? "active" : ""}>
        📻 Radio Stations
      </MenuItem>
      <MenuItem to="/music" className={isActive("/music") ? "active" : ""}>
        📻 Music
      </MenuItem>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
        🎥 Live Streams
      </MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/dashboard") ? "active" : ""}>
        🚀 Podcast Dashboard
      </MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/dashboard") ? "active" : ""}>
        🚀 RadioStation Dashboard
      </MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/dashboard") ? "active" : ""}>
        🚀 Artist Dashboard
      </MenuItem>
      <MenuItem to="/analytics" className={isActive("/analytics") ? "active" : ""}>
        📊 Analytics
      </MenuItem>
      <MenuItem to="/monetization" className={isActive("/monetization") ? "active" : ""}>
        💰 Monetization
      </MenuItem>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
        ⚙️ Settings
      </MenuItem>
      
      {/* Radio Genres Section */}
      <SectionHeader>🎶 Radio Genres</SectionHeader>
      <MenuItem to="/radio/genres" className={isActive("/radio/genres") ? "active" : ""}>
        Browse by Genres
      </MenuItem>

       {/* Podcast Genre Section */}
       <SectionHeader>🎶 Podcast Genres</SectionHeader>
      <MenuItem to="/browse-podcasts" className={isActive("/browse-podcasts") ? "active" : ""}>
        Browse by Genres
      </MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;