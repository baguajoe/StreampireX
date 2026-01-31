// ===========================================
// SIDEBAR PROFILES SECTION - CONDITIONAL
// Only shows profiles the user has created
// ===========================================

// Add this to your Sidebar component, replacing the current profiles section

// First, you need the user prop to have profile info:
// The `user` prop should include:
// - user.profile_type: 'regular', 'artist', 'gamer', 'multiple', etc.
// - user.has_artist_profile: boolean
// - user.has_gamer_profile: boolean  
// - user.has_video_channel: boolean

// OPTION 1: Check based on profile_type field
const ProfilesSection = ({ user, isActive }) => {
  // Determine what profiles exist
  const hasArtistProfile = user?.profile_type === 'artist' || 
                           user?.profile_type === 'multiple' || 
                           user?.has_artist_profile;
  
  const hasGamerProfile = user?.profile_type === 'gamer' || 
                          user?.profile_type === 'multiple' || 
                          user?.has_gamer_profile;
  
  const hasVideoChannel = user?.has_video_channel || user?.channel_name;

  return (
    <>
      <SectionHeader>👤 Profiles & Pages</SectionHeader>
      
      {/* Social Profile - Everyone has this */}
      <MenuItem 
        to="/profile" 
        className={isActive("/profile") && !isActive("/profile/gamer") && !isActive("/profile/artist") && !isActive("/profile/video") ? "active" : ""}
      >
        👤 Social Profile
        <MenuHint>your main identity</MenuHint>
      </MenuItem>
      
      {/* Artist Profile - Only if they have one */}
      {hasArtistProfile && (
        <MenuItem 
          to="/profile/artist" 
          className={isActive("/profile/artist") ? "active" : ""}
        >
          🎵 Artist Page
          <MenuHint>for your music</MenuHint>
        </MenuItem>
      )}
      
      {/* Gamer Profile - Only if they have one */}
      {hasGamerProfile && (
        <MenuItem 
          to="/profile/gamer" 
          className={isActive("/profile/gamer") ? "active" : ""}
        >
          🎮 Gamer Profile
          <MenuHint>for gaming/squads</MenuHint>
        </MenuItem>
      )}
      
      {/* Video Channel - Only if they have one */}
      {hasVideoChannel && (
        <MenuItem 
          to="/profile/video" 
          className={isActive("/profile/video") ? "active" : ""}
        >
          📹 Video Channel
          <MenuHint>your YouTube-style channel</MenuHint>
        </MenuItem>
      )}
      
      {/* Create Profile Link - Show options they DON'T have yet */}
      {(!hasArtistProfile || !hasGamerProfile || !hasVideoChannel) && (
        <CreateProfileLink to="/settings/profiles">
          ➕ Create Profile...
        </CreateProfileLink>
      )}
    </>
  );
};

// Styled components for this section
const MenuHint = styled.span`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  margin-left: auto;
  font-weight: normal;
`;

const CreateProfileLink = styled(Link)`
  padding: 8px 15px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  margin-top: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #00ffc8;
  }
`;

// ===========================================
// FULL UPDATED SIDEBAR.JS
// ===========================================

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import StorageStatus from "./StorageStatus";
import BandwidthStatus from "./BandwidthStatus";
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

const UsageSection = styled.div`
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
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

  // Determine what profiles the user has (based on signup booleans)
  const hasArtistProfile = user?.is_artist === true;
  const hasGamerProfile = user?.is_gamer === true;
  const hasVideoChannel = user?.is_video_creator === true;

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
      
      {/* 👤 PROFILES & PAGES - Conditional based on what user has */}
      <SectionHeader>👤 Profiles & Pages</SectionHeader>
      
      {/* Social Profile - Everyone has this */}
      <ProfileMenuItem 
        to="/profile" 
        className={isActive("/profile") && !isActive("/profile/gamer") && !isActive("/profile/artist") && !isActive("/profile/video") ? "active" : ""}
      >
        👤 Social Profile
        <MenuHint>main identity</MenuHint>
      </ProfileMenuItem>
      
      {/* Artist Profile - Only if they have one */}
      {hasArtistProfile && (
        <ProfileMenuItem 
          to="/profile/artist" 
          className={isActive("/profile/artist") ? "active" : ""}
        >
          🎵 Artist Page
          <MenuHint>your music</MenuHint>
        </ProfileMenuItem>
      )}
      
      {/* Gamer Profile - Only if they have one */}
      {hasGamerProfile && (
        <ProfileMenuItem 
          to="/profile/gamer" 
          className={isActive("/profile/gamer") ? "active" : ""}
        >
          🎮 Gamer Profile
          <MenuHint>gaming/squads</MenuHint>
        </ProfileMenuItem>
      )}
      
      {/* Video Channel - Only if they have one */}
      {hasVideoChannel && (
        <ProfileMenuItem 
          to="/profile/video" 
          className={isActive("/profile/video") ? "active" : ""}
        >
          📹 Video Channel
          <MenuHint>your videos</MenuHint>
        </ProfileMenuItem>
      )}
      
      {/* Create Profile Link - Show if missing any profile type */}
      {(!hasArtistProfile || !hasGamerProfile || !hasVideoChannel) && (
        <CreateProfileLink to="/settings/profiles">
          ➕ Add Profile Type...
        </CreateProfileLink>
      )}

      {/* Feed & Discovery */}
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

      {/* 📊 Dashboards - Only show relevant ones */}
      <SectionHeader>📊 Dashboards</SectionHeader>
      <MenuItem to="/creator-dashboard" className={isActive("/creator-dashboard") ? "active" : ""}>
        🚀 Creator Dashboard
      </MenuItem>
      {hasArtistProfile && (
        <MenuItem to="/artist-dashboard" className={isActive("/artist-dashboard") ? "active" : ""}>
          🎤 Artist Dashboard
        </MenuItem>
      )}
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>
        🎧 Podcast Dashboard
      </MenuItem>
      <MenuItem to="/radio-dashboard" className={isActive("/radio-dashboard") ? "active" : ""}>
        📻 Radio Dashboard
      </MenuItem>
      {hasVideoChannel && (
        <MenuItem to="/video-dashboard" className={isActive("/video-dashboard") ? "active" : ""}>
          📹 Video Dashboard
        </MenuItem>
      )}
      <MenuItem to="/sales-dashboard" className={isActive("/sales-dashboard") ? "active" : ""}>
        💰 Sales Dashboard
      </MenuItem>

      {/* 🎤 Music Distribution - Only for artists */}
      {hasArtistProfile && (
        <>
          <SectionHeader>🎤 Music</SectionHeader>
          <MenuItem to="/music-distribution" className={isActive("/music-distribution") ? "active" : ""}>
            🌍 Music Distribution
          </MenuItem>
          <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>
            🔍 Search Artists
          </MenuItem>
          <MenuItem to="/collaborator-splits" className={isActive("/collaborator-splits") ? "active" : ""}>
            👥 Collaborator Splits
          </MenuItem>
        </>
      )}

      {/* 🎮 GAMERS SECTION - Only for gamers */}
      {hasGamerProfile && (
        <>
          <GamingSectionHeader onClick={() => setShowGamerSection(!showGamerSection)}>
            <span>🎮 Gaming</span>
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
        </>
      )}

      {/* 🎧 Podcasts */}
      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>
        🎙️ Create Podcast
      </MenuItem>
      <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>
        🎧 Browse Categories
      </MenuItem>

      {/* 🎬 Videos */}
      <SectionHeader>🎬 Videos</SectionHeader>
      <MenuItem to="/videos" className={isActive("/videos") ? "active" : ""}>
        🎞️ Browse Videos
      </MenuItem>
      {hasVideoChannel && (
        <>
          <MenuItem to="/my-channel" className={isActive("/my-channel") ? "active" : ""}>
            📹 My Channel
          </MenuItem>
          <MenuItem to="/upload-video" className={isActive("/upload-video") ? "active" : ""}>
            📤 Upload Video
          </MenuItem>
        </>
      )}
      <MenuItem to="/video-editor" className={isActive("/video-editor") ? "active" : ""}>
        🎬 Video Editor
      </MenuItem>

      {/* 📻 Radio Stations */}
      <SectionHeader>📻 Radio</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>
        📻 Browse Stations
      </MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>
        ➕ Create Station
      </MenuItem>

      {/* 🎥 Live Streaming */}
      <SectionHeader>🎥 Live</SectionHeader>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
        📡 Live Streams
      </MenuItem>

      {/* 🛍️ Store & Marketplace */}
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

      {/* ⚙️ Account */}
      <SectionHeader>⚙️ Account</SectionHeader>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
        ⚙️ Settings
      </MenuItem>

      {/* Usage Status */}
      <UsageSection>
        <StorageStatus compact={true} />
        <BandwidthStatus compact={true} />
      </UsageSection>
    </SidebarContainer>
  );
};

export default Sidebar;