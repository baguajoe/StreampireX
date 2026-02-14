// src/front/js/component/sidebar.js
// UPDATED: Videos moved after Dashboard, Gaming section always visible, dark theme
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import StorageStatus from "./StorageStatus";
import BandwidthStatus from "./BandwidthStatus";
import "../../styles/sidebar.css";

// ============================================================
// STYLED COMPONENTS — Dark theme: #0a1628 → #001220
// Teal: #00ffc8  |  Orange: #FF6600 / #ffa726  |  Gaming: #4a9eff
// ============================================================

const SidebarContainer = styled.div`
  width: 250px;
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0a1628 0%, #001220 100%);
  border-right: 1px solid rgba(0, 255, 200, 0.1);
  box-shadow: 2px 0 15px rgba(0, 0, 0, 0.4);
`;

const SectionHeader = styled.h4`
  color: #ffa726;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 20px 15px 8px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: default;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 167, 38, 0.3);
  }
`;

const MenuItem = styled(Link)`
  padding: 10px 15px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  border-radius: 8px;
  margin: 2px 0;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 200, 0.1);
    color: #00ffc8;
    transform: translateX(4px);
    text-decoration: none;
  }

  &.active {
    background: rgba(0, 255, 200, 0.15);
    color: #00ffc8;
    border-left-color: #00ffc8;
  }
`;

const ProfileMenuItem = styled(MenuItem)`
  background: rgba(255, 255, 255, 0.02);

  &:hover {
    background: rgba(255, 167, 38, 0.1);
    border-left-color: #ffa726;
    color: #ffa726;
  }

  &.active {
    background: rgba(255, 167, 38, 0.15);
    border-left-color: #ffa726;
    color: #ffa726;
    box-shadow: inset 0 0 10px rgba(255, 167, 38, 0.15);
  }
`;

const MenuHint = styled.span`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.35);
  margin-left: auto;
  font-weight: normal;
`;

const CreateProfileLink = styled(Link)`
  padding: 8px 15px;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  margin-top: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #00ffc8;
    text-decoration: none;
  }
`;

// Dashboard link — teal highlight
const DashboardLink = styled(MenuItem)`
  background: linear-gradient(135deg, rgba(0, 255, 200, 0.08), transparent);
  border: 1px solid rgba(0, 255, 200, 0.15);
  border-radius: 8px;
  margin: 4px 0;

  &:hover {
    background: linear-gradient(135deg, rgba(0, 255, 200, 0.18), transparent);
    border-color: #00ffc8;
  }

  &.active {
    background: linear-gradient(135deg, rgba(0, 255, 200, 0.22), transparent);
    border-color: #00ffc8;
    border-left: 3px solid #00ffc8;
  }
`;

// Gaming styled components — blue accent #4a9eff
const GamingSectionHeader = styled.div`
  color: #4a9eff;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  background: rgba(74, 158, 255, 0.08);
  border-radius: 8px;
  padding: 12px 15px;
  margin: 10px 0 4px 0;
  border: 1px solid rgba(74, 158, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(74, 158, 255, 0.14);
    border-color: rgba(74, 158, 255, 0.4);
  }
`;

const GamingMenuItem = styled(MenuItem)`
  &:hover {
    background: rgba(74, 158, 255, 0.1);
    border-left-color: #4a9eff;
    color: #4a9eff;
  }

  &.active {
    background: rgba(74, 158, 255, 0.15);
    border-left-color: #4a9eff;
    color: #4a9eff;
    box-shadow: inset 0 0 10px rgba(74, 158, 255, 0.15);
  }
`;

const NotificationBadge = styled.span`
  background: #ff4757;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 50%;
  margin-left: auto;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UsageSection = styled.div`
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 255, 200, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

const Sidebar = ({ user }) => {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname.startsWith(path.replace(/:\w+/g, ""));

  const [showGamerSection, setShowGamerSection] = useState(true);
  const [gamingNotifications, setGamingNotifications] = useState({
    chatrooms: 0,
    teamRoom: 0,
    squads: 0
  });

  // Determine what profiles the user has
  const hasArtistProfile =
    user?.is_artist === true ||
    user?.profile_type === 'artist' ||
    user?.profile_type === 'multiple';

  const hasGamerProfile =
    user?.is_gamer === true ||
    user?.profile_type === 'gamer' ||
    user?.profile_type === 'multiple';

  // Persist gaming section expand/collapse
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_gamer_expanded");
    if (saved !== null) setShowGamerSection(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_gamer_expanded", showGamerSection);
  }, [showGamerSection]);

  return (
    <SidebarContainer className="sidebar">

      {/* ============================== */}
      {/* 👤 PROFILES & PAGES            */}
      {/* ============================== */}
      <SectionHeader>👤 Profiles & Pages</SectionHeader>

      <ProfileMenuItem
        to="/profile"
        className={
          isActive("/profile") &&
          !isActive("/profile/gamer") &&
          !isActive("/profile/artist") &&
          !isActive("/profile/video")
            ? "active"
            : ""
        }
      >
        👤 Social Profile
        <MenuHint>main identity</MenuHint>
      </ProfileMenuItem>

      {hasArtistProfile && (
        <ProfileMenuItem
          to="/profile/artist"
          className={isActive("/profile/artist") ? "active" : ""}
        >
          🎵 Artist Page
          <MenuHint>your music</MenuHint>
        </ProfileMenuItem>
      )}

      {hasGamerProfile && (
        <ProfileMenuItem
          to="/profile/gamer"
          className={isActive("/profile/gamer") ? "active" : ""}
        >
          🎮 Gamer Profile
          <MenuHint>gaming/squads</MenuHint>
        </ProfileMenuItem>
      )}

      {(!hasArtistProfile || !hasGamerProfile) && (
        <CreateProfileLink to="/settings/profiles">
          ➕ Add Profile Type...
        </CreateProfileLink>
      )}

      {/* ============================== */}
      {/* 🏠 FEED & DISCOVERY            */}
      {/* ============================== */}
      <SectionHeader>🏠 Feed</SectionHeader>
      <MenuItem to="/home-feed" className={isActive("/home-feed") ? "active" : ""}>
        🏠 Home Feed
      </MenuItem>
      <MenuItem to="/content-library" className={isActive("/content-library") ? "active" : ""}>
        📚 Content Library
      </MenuItem>
      <MenuItem to="/discover-users" className={isActive("/discover-users") ? "active" : ""}>
        🔍 Discover Users
      </MenuItem>

      {/* ============================== */}
      {/* 📊 UNIFIED DASHBOARD           */}
      {/* ============================== */}
      <SectionHeader>📊 Dashboard</SectionHeader>
      <DashboardLink
        to="/dashboard"
        className={isActive("/dashboard") ? "active" : ""}
      >
        🚀 Creator Dashboard
        <MenuHint>all in one</MenuHint>
      </DashboardLink>

      {/* ============================== */}
      {/* 🎬 VIDEOS                      */}
      {/* ============================== */}
      <SectionHeader>🎬 Videos</SectionHeader>
      <MenuItem to="/videos" className={isActive("/videos") ? "active" : ""}>
        🎞️ Browse Videos
      </MenuItem>
      <MenuItem to="/profile/video" className={isActive("/profile/video") ? "active" : ""}>
        📹 My Channel
      </MenuItem>
      <MenuItem to="/upload-video" className={isActive("/upload-video") ? "active" : ""}>
        📤 Upload Video
      </MenuItem>
      <MenuItem to="/video-editor" className={isActive("/video-editor") ? "active" : ""}>
        🎬 Video Editor
      </MenuItem>

      {/* ============================== */}
      {/* 🎤 MUSIC — Only for artists    */}
      {/* ============================== */}
      {hasArtistProfile && (
        <>
          <SectionHeader>🎤 Music</SectionHeader>
          <MenuItem to="/music-distribution" className={isActive("/music-distribution") ? "active" : ""}>
            🌍 Music Distribution
          </MenuItem>
          <MenuItem to="/collaborator-splits" className={isActive("/collaborator-splits") ? "active" : ""}>
            👥 Collaborator Splits
          </MenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🎮 GAMING — Always visible     */}
      {/* ============================== */}
      <GamingSectionHeader onClick={() => setShowGamerSection(!showGamerSection)}>
        <span>🎮 Gaming</span>
        <span style={{ fontSize: '0.7rem' }}>{showGamerSection ? "▼" : "▶"}</span>
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
            {gamingNotifications.squads > 0 && (
              <NotificationBadge>{gamingNotifications.squads}</NotificationBadge>
            )}
          </GamingMenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🎧 PODCASTS                    */}
      {/* ============================== */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>
        🎙️ Create Podcast
      </MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>
        🎧 Browse Categories
      </MenuItem>

      {/* ============================== */}
      {/* 📻 RADIO STATIONS              */}
      {/* ============================== */}
      <SectionHeader>📻 Radio</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>
        📻 Browse Stations
      </MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>
        ➕ Create Station
      </MenuItem>

      {/* ============================== */}
      {/* 🎥 LIVE STREAMING              */}
      {/* ============================== */}
      <SectionHeader>🎥 Live</SectionHeader>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
        📡 Live Streams
      </MenuItem>

      {/* ============================== */}
      {/* 🛍️ STORE & MARKETPLACE         */}
      {/* ============================== */}
      <SectionHeader>🛍️ Store</SectionHeader>
      <MenuItem to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>
        🛒 Marketplace
      </MenuItem>
      <MenuItem to="/storefront" className={isActive("/storefront") ? "active" : ""}>
        🏪 My Storefront
      </MenuItem>
      <MenuItem to="/orders" className={isActive("/orders") ? "active" : ""}>
        📦 Orders
      </MenuItem>

      {/* ============================== */}
      {/* ⚙️ ACCOUNT                     */}
      {/* ============================== */}
      <SectionHeader>⚙️ Account</SectionHeader>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
        ⚙️ Settings
      </MenuItem>

      {/* ============================== */}
      {/* 📊 USAGE STATUS                */}
      {/* ============================== */}
      <UsageSection>
        <StorageStatus compact={true} />
        <BandwidthStatus compact={true} />
      </UsageSection>
    </SidebarContainer>
  );
};

export default Sidebar;