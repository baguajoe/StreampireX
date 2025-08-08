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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

// Special styling for profile items
const ProfileMenuItem = styled(MenuItem)`
  background: rgba(255, 255, 255, 0.02);
  margin: 2px 0;
  border-radius: 6px;
  
  &:hover {
    background: #1a3c70;
    border-left: 4px solid #ffa726;
    transform: translateX(3px);
  }
  
  &.active {
    background: #1a3c70;
    border-left: 4px solid #ffa726;
    box-shadow: inset 0 0 10px rgba(255, 167, 38, 0.2);
  }
`;

// Special styling for gaming section
const GamingMenuItem = styled(MenuItem)`
  &:hover {
    background: #1a4c80;
    border-left: 4px solid #4a9eff;
  }
  
  &.active {
    background: #1a4c80;
    border-left: 4px solid #4a9eff;
    box-shadow: inset 0 0 10px rgba(74, 158, 255, 0.2);
  }
`;

const GamingSectionHeader = styled(SectionHeader)`
  color: #4a9eff;
  background: rgba(74, 158, 255, 0.1);
  border-radius: 8px;
  padding: 12px 15px;
  margin: 10px 0;
  border: 1px solid rgba(74, 158, 255, 0.3);
`;

const NotificationBadge = styled.span`
  background: #ff4757;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 50%;
  margin-left: 8px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Sidebar = ({ user }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname.startsWith(path.replace(/:\w+/g, ""));

  const [showGamerSection, setShowGamerSection] = useState(true);
  const [gamingNotifications, setGamingNotifications] = useState({
    chatrooms: 3,
    teamRoom: 1,
    squads: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_gamer_expanded");
    if (saved) setShowGamerSection(saved === "true");
    else setShowGamerSection(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_gamer_expanded", showGamerSection);
  }, [showGamerSection]);

  return (
    <SidebarContainer className="sidebar">
      {/* 👤 USER SECTION - All Profile Types Together */}
      <SectionHeader>👤 User</SectionHeader>
      <MenuItem to="/home-feed" className={isActive("/home-feed") ? "active" : ""}>
        🏠 Home Feed
      </MenuItem>

      {/* Profile Sub-section */}
      <div style={{ marginLeft: '10px', borderLeft: '2px solid #ffa726', paddingLeft: '5px' }}>
        <ProfileMenuItem to="/profile" className={isActive("/profile") && !isActive("/profile/gamer") && !isActive("/profile/artist") ? "active" : ""}>
          👤 Regular Profile
        </ProfileMenuItem>
        <ProfileMenuItem to="/profile/gamer" className={isActive("/profile/gamer") ? "active" : ""}>
          🎮 Gamer Profile
        </ProfileMenuItem>
        <ProfileMenuItem to="/profile/artist" className={isActive("/profile/artist") ? "active" : ""}>
          🎵 Artist Profile
        </ProfileMenuItem>
      </div>

      {/* Dashboards */}
      <SectionHeader>📊 Dashboards</SectionHeader>
      <MenuItem to="/creator-dashboard" className={isActive("/creator-dashboard") ? "active" : ""}>
        🚀 Creator Dashboard
      </MenuItem>
      <MenuItem to="/artist-dashboard" className={isActive("/artist-dashboard") ? "active" : ""}>
        🎤 Artist Dashboard
      </MenuItem>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>
        🎧 Podcast Dashboard
      </MenuItem>
      <MenuItem to="/radio-dashboard" className={isActive("/radio-dashboard") ? "active" : ""}>
        📻 Radio Dashboard
      </MenuItem>

      <SectionHeader>🎤 Indie Artists</SectionHeader>
      <MenuItem to="/music-distribution" className={isActive("/music-distribution") ? "active" : ""}>
        🌍 Music Distribution
      </MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>
        🔍 Search Artists
      </MenuItem>

      {/* 🎮 GAMERS SECTION - Position #3 */}
      <GamingSectionHeader onClick={() => setShowGamerSection(!showGamerSection)}>
        <span>🎮 Gamers</span>
        <span>{showGamerSection ? "🔽" : "▶️"}</span>
      </GamingSectionHeader>
      {showGamerSection && (
        <>
          <GamingMenuItem to="/gamers/chat" className={isActive("/gamers/chat") ? "active" : ""}>
            💬 Gamer Chatrooms
            {gamingNotifications.chatrooms > 0 && (
              <NotificationBadge>{gamingNotifications.chatrooms}</NotificationBadge>
            )}
          </GamingMenuItem>
          <GamingMenuItem to="/team-room" className={isActive("/team-room") ? "active" : ""}>
            🧑‍🤝‍🧑 Team Room
            {gamingNotifications.teamRoom > 0 && (
              <NotificationBadge>{gamingNotifications.teamRoom}</NotificationBadge>
            )}
          </GamingMenuItem>
          <GamingMenuItem to="/squad-finder" className={isActive("/squad-finder") ? "active" : ""}>
            🔍 Find Squads
          </GamingMenuItem>
        </>
      )}

      {/* Content Creation & Consumption */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>
        🎙️ Create Podcast
      </MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>
        🎧 Browse Categories
      </MenuItem>

      <SectionHeader>🎬 Videos</SectionHeader>
      <MenuItem to="/videos" className={isActive("/videos") ? "active" : ""}>
        🎞️ Browse Videos
      </MenuItem>

      <SectionHeader>📻 Radio Stations</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>
        📻 Browse Stations
      </MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>
        ➕ Create Station
      </MenuItem>

      <SectionHeader>🎥 Live Streaming</SectionHeader>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
        📡 Live Streams
      </MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>
        🎶 Live Concerts
      </MenuItem>

      {/* Account */}
      <SectionHeader>👤 Account</SectionHeader>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
        ⚙️ Settings
      </MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;