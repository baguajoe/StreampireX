// src/front/js/component/sidebar.js
// Collapsible sidebar with dark theme — ALL sections now collapsible
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
  transition: width 0.3s ease, min-width 0.3s ease, padding 0.3s ease;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 255, 200, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 200, 0.4);
  }

  &.collapsed {
    width: 58px;
    min-width: 58px;
    padding: 20px 6px;
  }

  &.collapsed .sidebar-label,
  &.collapsed .sidebar-hint,
  &.collapsed .sidebar-section-text,
  &.collapsed .sidebar-create-link,
  &.collapsed .sidebar-usage-section,
  &.collapsed .sidebar-arrow {
    display: none;
  }

  &.collapsed .sidebar-section-header {
    justify-content: center;
    padding: 16px 4px 6px;
  }

  &.collapsed .sidebar-section-header::after {
    display: none;
  }
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
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.2s ease;

  &:hover {
    color: #ffc107;
  }

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
  white-space: nowrap;
  overflow: hidden;

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
  white-space: nowrap;
  overflow: hidden;

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

const AIMenuItem = styled(MenuItem)`
  &:hover {
    background: rgba(124, 58, 237, 0.1);
    border-left-color: #a78bfa;
    color: #a78bfa;
  }

  &.active {
    background: rgba(124, 58, 237, 0.15);
    border-left-color: #a78bfa;
    color: #a78bfa;
    box-shadow: inset 0 0 10px rgba(124, 58, 237, 0.15);
  }
`;

const AISectionHeader = styled.h4`
  color: #a78bfa;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 20px 15px 8px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.2s ease;

  &:hover {
    color: #c4b5fd;
  }

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(167, 139, 250, 0.3);
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

  const [collapsed, setCollapsed] = useState(false);
  const [gamingNotifications, setGamingNotifications] = useState({
    chatrooms: 0,
    teamRoom: 0,
    squads: 0
  });

  // ── Collapsible section states ──
  const [showFeed, setShowFeed] = useState(true);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showProfiles, setShowProfiles] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [showGaming, setShowGaming] = useState(true);
  const [showMusic, setShowMusic] = useState(true);
  const [showRadio, setShowRadio] = useState(true);
  const [showAI, setShowAI] = useState(true);
  const [showStore, setShowStore] = useState(true);
  const [showAccount, setShowAccount] = useState(true);

  const hasArtistProfile =
    user?.is_artist === true ||
    user?.profile_type === 'artist' ||
    user?.profile_type === 'multiple';

  const hasGamerProfile =
    user?.is_gamer === true ||
    user?.profile_type === 'gamer' ||
    user?.profile_type === 'multiple';

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed);
  }, [collapsed]);

  // Persist section collapse states
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sidebar_sections") || "{}");
      if (saved.feed !== undefined) setShowFeed(saved.feed);
      if (saved.dashboard !== undefined) setShowDashboard(saved.dashboard);
      if (saved.profiles !== undefined) setShowProfiles(saved.profiles);
      if (saved.content !== undefined) setShowContent(saved.content);
      if (saved.gaming !== undefined) setShowGaming(saved.gaming);
      if (saved.music !== undefined) setShowMusic(saved.music);
      if (saved.radio !== undefined) setShowRadio(saved.radio);
      if (saved.ai !== undefined) setShowAI(saved.ai);
      if (saved.store !== undefined) setShowStore(saved.store);
      if (saved.account !== undefined) setShowAccount(saved.account);
    } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_sections", JSON.stringify({
      feed: showFeed,
      dashboard: showDashboard,
      profiles: showProfiles,
      content: showContent,
      gaming: showGaming,
      music: showMusic,
      radio: showRadio,
      ai: showAI,
      store: showStore,
      account: showAccount
    }));
  }, [showFeed, showDashboard, showProfiles, showContent, showGaming, showMusic, showRadio, showAI, showStore, showAccount]);

  return (
    <SidebarContainer className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          background: 'rgba(0,255,200,0.08)',
          border: '1px solid rgba(0,255,200,0.2)',
          color: '#00ffc8',
          padding: '8px',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: '12px',
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minHeight: '38px',
          flexShrink: 0,
        }}
      >
        {collapsed ? '▶' : '◀'}
        <span className="sidebar-label" style={{ fontSize: '0.78rem' }}>
          {collapsed ? '' : 'Collapse'}
        </span>
      </button>

      {/* ============================== */}
      {/* 🏠 FEED & DISCOVERY            */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowFeed(!showFeed)}>
        🏠 <span className="sidebar-section-text">Feed</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showFeed ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showFeed && (
        <>
          <MenuItem to="/home-feed" className={isActive("/home-feed") ? "active" : ""}>
            🏠 <span className="sidebar-label">Home Feed</span>
          </MenuItem>
          <MenuItem to="/content-library" className={isActive("/content-library") ? "active" : ""}>
            📚 <span className="sidebar-label">Content Library</span>
          </MenuItem>
          <MenuItem to="/discover-users" className={isActive("/discover-users") ? "active" : ""}>
            🔍 <span className="sidebar-label">Discover Users</span>
          </MenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 📊 UNIFIED DASHBOARD           */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowDashboard(!showDashboard)}>
        📊 <span className="sidebar-section-text">Dashboard</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showDashboard ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showDashboard && (
        <DashboardLink
          to="/dashboard"
          className={isActive("/dashboard") ? "active" : ""}
        >
          🚀 <span className="sidebar-label">Creator Dashboard</span>
          <MenuHint className="sidebar-hint">all in one</MenuHint>
        </DashboardLink>
      )}

      {/* ============================== */}
      {/* 👤 PROFILES & PAGES            */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowProfiles(!showProfiles)}>
        👤 <span className="sidebar-section-text">Profiles & Pages</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showProfiles ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showProfiles && (
        <>
          <ProfileMenuItem
            to="/profile"
            className={
              isActive("/profile") &&
                !isActive("/profile/gamer") &&
                !isActive("/profile/artist") &&
                !isActive("/profile/video")
                ? "active" : ""
            }
          >
            👤 <span className="sidebar-label">Social Profile</span>
            <MenuHint className="sidebar-hint">main identity</MenuHint>
          </ProfileMenuItem>

          {hasArtistProfile && (
            <ProfileMenuItem
              to="/profile/artist"
              className={isActive("/profile/artist") ? "active" : ""}
            >
              🎵 <span className="sidebar-label">Artist Page</span>
              <MenuHint className="sidebar-hint">your music</MenuHint>
            </ProfileMenuItem>
          )}

          {hasGamerProfile && (
            <ProfileMenuItem
              to="/profile/gamer"
              className={isActive("/profile/gamer") ? "active" : ""}
            >
              🎮 <span className="sidebar-label">Gamer Profile</span>
              <MenuHint className="sidebar-hint">gaming/squads</MenuHint>
            </ProfileMenuItem>
          )}

          {(!hasArtistProfile || !hasGamerProfile) && (
            <CreateProfileLink to="/settings/profiles" className="sidebar-create-link">
              ➕ Add Profile Type...
            </CreateProfileLink>
          )}
        </>
      )}

      {/* ============================== */}
      {/* 🎬 CONTENT — Videos, Podcasts, */}
      {/*    Reels, Live Streams         */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowContent(!showContent)}>
        🎬 <span className="sidebar-section-text">Content</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showContent ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showContent && (
        <>
          <MenuItem to="/videos" className={isActive("/videos") ? "active" : ""}>
            🎞️ <span className="sidebar-label">Browse Videos</span>
          </MenuItem>
          <MenuItem to="/profile/video" className={isActive("/profile/video") ? "active" : ""}>
            📹 <span className="sidebar-label">My Channel</span>
          </MenuItem>
          <MenuItem to="/upload-video" className={isActive("/upload-video") ? "active" : ""}>
            📤 <span className="sidebar-label">Upload Video</span>
          </MenuItem>
          <MenuItem to="/video-editor" className={isActive("/video-editor") ? "active" : ""}>
            🎬 <span className="sidebar-label">Video Editor</span>
          </MenuItem>
          <MenuItem to="/reels" className={isActive("/reels") ? "active" : ""}>
            🎞️ <span className="sidebar-label">Reels</span>
          </MenuItem>
          <MenuItem to="/upload-reel" className={isActive("/upload-reel") ? "active" : ""}>
            ⬆️ <span className="sidebar-label">Upload Reel</span>
          </MenuItem>
          <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>
            🎙️ <span className="sidebar-label">Create Podcast</span>
          </MenuItem>
          <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>
            🎧 <span className="sidebar-label">Browse Podcasts</span>
          </MenuItem>
          <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>
            📡 <span className="sidebar-label">Live Streams</span>
          </MenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🎮 GAMING — Collapsible        */}
      {/* ============================== */}
      <GamingSectionHeader onClick={() => setShowGaming(!showGaming)}>
        <span>🎮 <span className="sidebar-label">Gaming</span></span>
        <span className="sidebar-arrow" style={{ fontSize: '0.7rem' }}>
          {showGaming ? "▼" : "▶"}
        </span>
      </GamingSectionHeader>

      {showGaming && (
        <>
          <GamingMenuItem to="/gamers/chat" className={isActive("/gamers/chat") ? "active" : ""}>
            💬 <span className="sidebar-label">Gamer Chatrooms</span>
            {gamingNotifications.chatrooms > 0 && (
              <NotificationBadge>{gamingNotifications.chatrooms}</NotificationBadge>
            )}
          </GamingMenuItem>
          <GamingMenuItem to="/team-room" className={isActive("/team-room") ? "active" : ""}>
            🧑‍🤝‍🧑 <span className="sidebar-label">Team Room</span>
            {gamingNotifications.teamRoom > 0 && (
              <NotificationBadge>{gamingNotifications.teamRoom}</NotificationBadge>
            )}
          </GamingMenuItem>
          <GamingMenuItem to="/squad-finder" className={isActive("/squad-finder") ? "active" : ""}>
            🔍 <span className="sidebar-label">Find Squads</span>
            {gamingNotifications.squads > 0 && (
              <NotificationBadge>{gamingNotifications.squads}</NotificationBadge>
            )}
          </GamingMenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🎤 MUSIC — Only for artists    */}
      {/* ============================== */}
      {hasArtistProfile && (
        <>
          <SectionHeader className="sidebar-section-header" onClick={() => setShowMusic(!showMusic)}>
            🎤 <span className="sidebar-section-text">Music</span>
            <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
              {showMusic ? '▼' : '▶'}
            </span>
          </SectionHeader>

          {showMusic && (
            <>
              <MenuItem to="/music-distribution" className={isActive("/music-distribution") ? "active" : ""}>
                🌍 <span className="sidebar-label">Music Distribution</span>
              </MenuItem>
              <MenuItem to="/collaborator-splits" className={isActive("/collaborator-splits") ? "active" : ""}>
                👥 <span className="sidebar-label">Collaborator Splits</span>
              </MenuItem>
              <MenuItem to="/ai-mastering" className={isActive("/ai-mastering") ? "active" : ""}>
                🎚️ <span className="sidebar-label">AI Mastering</span>
              </MenuItem>
              <MenuItem to="/recording-studio" className={isActive("/recording-studio") ? "active" : ""}>
                🎛️ <span className="sidebar-label">Recording Studio</span>
                <MenuHint className="sidebar-hint">8-track</MenuHint>
              </MenuItem>
            </>
          )}
        </>
      )}

      {/* ============================== */}
      {/* 📻 RADIO STATIONS              */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowRadio(!showRadio)}>
        📻 <span className="sidebar-section-text">Radio</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showRadio ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showRadio && (
        <>
          <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>
            📻 <span className="sidebar-label">Browse Stations</span>
          </MenuItem>
          <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>
            ➕ <span className="sidebar-label">Create Station</span>
          </MenuItem>
          <MenuItem to="/ai-radio-dj" className={isActive("/ai-radio-dj") ? "active" : ""}>
            🤖 <span className="sidebar-label">AI Radio DJ</span>
          </MenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🤖 AI TOOLS                    */}
      {/* ============================== */}
      <AISectionHeader className="sidebar-section-header" onClick={() => setShowAI(!showAI)}>
        🤖 <span className="sidebar-section-text">AI Tools</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showAI ? '▼' : '▶'}
        </span>
      </AISectionHeader>

      {showAI && (
        <>
          <AIMenuItem to="/voice-services" className={isActive("/voice-services") ? "active" : ""}>
            🎤 <span className="sidebar-label">AI Voice Clone</span>
          </AIMenuItem>
          <AIMenuItem to="/ai-writer" className={isActive("/ai-writer") ? "active" : ""}>
            ✍️ <span className="sidebar-label">AI Content Writer</span>
          </AIMenuItem>
          <AIMenuItem to="/ai-stems" className={isActive("/ai-stems") ? "active" : ""}>
            🎵 <span className="sidebar-label">AI Stem Separation</span>
          </AIMenuItem>
          <AIMenuItem to="/ai-video-studio" className={isActive("/ai-video-studio") ? "active" : ""}>
            🎬 <span className="sidebar-label">AI Video Studio</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </AIMenuItem>
        </>
      )}

      {/* ============================== */}
      {/* 🛍️ STORE & MARKETPLACE         */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowStore(!showStore)}>
        🛍️ <span className="sidebar-section-text">Store</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showStore ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showStore && (
        <>
          <MenuItem to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>
            🛒 <span className="sidebar-label">Marketplace</span>
          </MenuItem>
          <MenuItem to="/beats" className={isActive("/beats") ? "active" : ""}>
            🎹 <span className="sidebar-label">Beat Store</span>
          </MenuItem>
          <MenuItem to="/producers" className={isActive("/producers") ? "active" : ""}>
            🎤 <span className="sidebar-label">Browse Producers</span>
          </MenuItem>
          <MenuItem to="/sell-beats" className={isActive("/sell-beats") ? "active" : ""}>
            💰 <span className="sidebar-label">Sell Beats</span>
          </MenuItem>
          <MenuItem to="/storefront" className={isActive("/storefront") ? "active" : ""}>
            🏪 <span className="sidebar-label">My Storefront</span>
          </MenuItem>
          <MenuItem to="/orders" className={isActive("/orders") ? "active" : ""}>
            📦 <span className="sidebar-label">Orders</span>
          </MenuItem>
        </>
      )}

      {/* ============================== */}
      {/* ⚙️ ACCOUNT                     */}
      {/* ============================== */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowAccount(!showAccount)}>
        ⚙️ <span className="sidebar-section-text">Account</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showAccount ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showAccount && (
        <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>
          ⚙️ <span className="sidebar-label">Settings</span>
        </MenuItem>
      )}

      {/* ============================== */}
      {/* 📊 USAGE STATUS                */}
      {/* ============================== */}
      <UsageSection className="sidebar-usage-section">
        <StorageStatus compact={true} />
        <BandwidthStatus compact={true} />
      </UsageSection>
    </SidebarContainer>
  );
};

export default Sidebar;