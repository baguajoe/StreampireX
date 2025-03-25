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

      {/* Primary Navigation Items */}
      <MenuItem to="/" className={isActive("/") ? "active" : ""}>
        🏠 Home
      </MenuItem>
      <MenuItem to="/login" className={isActive("/login") ? "active" : ""}>
        🔑 Login
      </MenuItem>
      <MenuItem to="/register" className={isActive("/register") ? "active" : ""}>
        📝 Signup
      </MenuItem>
      <MenuItem to="/profile" className={isActive("/profile") ? "active" : ""}>
        👤 Profile
      </MenuItem>
      <MenuItem to="/favorites" className={isActive("/favorites") ? "active" : ""}>
        ⭐ Favorites
      </MenuItem>

      {/* Secondary Navigation Items in Dropdown */}
      <SectionHeader>📱 More</SectionHeader>
      <MenuItem to="/notifications" className={isActive("/notifications") ? "active" : ""}>
        🔔 Notifications
      </MenuItem>
      <MenuItem to="/pricing" className={isActive("/pricing") ? "active" : ""}>
        💳 Pricing Plans
      </MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>
        🔍 Search
      </MenuItem>
      <MenuItem to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>
        🛒 Marketplace
      </MenuItem>
      <MenuItem to="/payout-request" className={isActive("/payout-request") ? "active" : ""}>
        💵 Payout Request
      </MenuItem>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
        ⚙️ Account Settings
      </MenuItem>
      <MenuItem to="/trending" className={isActive("/trending") ? "active" : ""}>
        📈 Trending
      </MenuItem>

      {/* Live Streams */}
      <SectionHeader>🎥 Live Streams</SectionHeader>
      <MenuItem to="/live-studio" className={isActive("/live-studio") ? "active" : ""}>
        🎥 Live Studio
      </MenuItem>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
        🎥 Live Streams
      </MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>
        🎶 Live Concerts
      </MenuItem>
      

      {/* Other Items */}
      <MenuItem to="/merch-store" className={isActive("/merch-store") ? "active" : ""}>
        🛍️ Merch Store
      </MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>
        📊 Podcast Dashboard
      </MenuItem>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>
        🎙️ Create Podcast
      </MenuItem>

      {/* Optional Extra Section for Podcasts */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/browse-podcasts" className={isActive("/browse-podcasts") ? "active" : ""}>
        Browse Podcasts
      </MenuItem>

      {/* Optional Extra Section for Radio Stations */}
      <SectionHeader>📻 Radio Stations</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>
        Browse Radio Stations
      </MenuItem>

      {/* Optional Extra Section for Music */}
      <SectionHeader>🎶 Music</SectionHeader>
      <MenuItem to="/music" className={isActive("/music") ? "active" : ""}>
        Music
      </MenuItem>

      {/* Optional Extra Section for Licensing */}
      <SectionHeader>📜 Licensing</SectionHeader>
      <MenuItem to="/music-licensing" className={isActive("/music-licensing") ? "active" : ""}>
        Music Licensing
      </MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;