// src/front/js/component/sidebar.js
// StreamPireX Sidebar — Cleaned up March 2026
//
// CHANGES FROM PREVIOUS VERSION:
//  ✅ Removed: AI Thumbnail Maker (stub — use AI Video Studio instead)
//  ✅ Removed: AI Promo Generator (stub — use AI Video Studio + AI Content Writer instead)
//  ✅ Removed: Collaborator Splits (moved to Creator Dashboard tabs)
//  ✅ Removed: Payout Dashboard (moved to Creator Dashboard tabs)
//  ✅ Removed: Sell Beats (merged into unified Music Store)
//  ✅ Removed: Stems Store / Sell Stems (merged into unified Music Store)
//  ✅ Renamed: Beat Store → "Music Store" (beats + stems, unified)
//  ✅ Added: Merch Store (Printful) in Store section
//  ✅ Added: Creator Academy moved to Store section (was in AI Tools)
//  ✅ Added: Hum to Song + Text to Song in Music section (for artists)
//  ✅ Content: removed duplicate podcast entries (kept Podcast Studio, Browse Podcasts only)
//  ✅ Music: removed Video Series (belongs in Content, not Music)

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import StorageStatus from "./StorageStatus";
import BandwidthStatus from "./BandwidthStatus";
import "../../styles/sidebar.css";

// ============================================================
// STYLED COMPONENTS
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

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,255,200,0.2); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(0,255,200,0.4); }

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
  &.collapsed .sidebar-arrow { display: none; }

  &.collapsed .sidebar-section-header {
    justify-content: center;
    padding: 16px 4px 6px;
  }

  &.collapsed .sidebar-section-header::after { display: none; }
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

  &:hover { color: #ffc107; }
  &::after { content: ''; flex: 1; height: 1px; background: rgba(255,167,38,0.3); }
`;

const FreeBadge = styled.span`
  background: rgba(0, 255, 200, 0.15);
  color: #00ffc8;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(0, 255, 200, 0.3);
  letter-spacing: 0.5px;
  margin-left: 4px;
`;

const MenuItem = styled(Link)`
  padding: 10px 15px;
  color: rgba(255,255,255,0.85);
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
    background: rgba(0,255,200,0.1);
    color: #00ffc8;
    transform: translateX(4px);
    text-decoration: none;
  }
  &.active {
    background: rgba(0,255,200,0.15);
    color: #00ffc8;
    border-left-color: #00ffc8;
  }
`;

const ProfileMenuItem = styled(MenuItem)`
  background: rgba(255,255,255,0.02);
  &:hover { background: rgba(255,167,38,0.1); border-left-color: #ffa726; color: #ffa726; }
  &.active { background: rgba(255,167,38,0.15); border-left-color: #ffa726; color: #ffa726; box-shadow: inset 0 0 10px rgba(255,167,38,0.15); }
`;

const MenuHint = styled.span`
  font-size: 0.65rem;
  color: rgba(255,255,255,0.35);
  margin-left: auto;
  font-weight: normal;
`;

const CreateProfileLink = styled(Link)`
  padding: 8px 15px;
  color: rgba(255,255,255,0.45);
  text-decoration: none;
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  margin-top: 4px;
  transition: all 0.2s ease;
  &:hover { color: #00ffc8; text-decoration: none; }
`;

const DashboardLink = styled(MenuItem)`
  background: linear-gradient(135deg, rgba(0,255,200,0.08), transparent);
  border: 1px solid rgba(0,255,200,0.15);
  border-radius: 8px;
  margin: 4px 0;
  &:hover { background: linear-gradient(135deg, rgba(0,255,200,0.18), transparent); border-color: #00ffc8; }
  &.active { background: linear-gradient(135deg, rgba(0,255,200,0.22), transparent); border-color: #00ffc8; border-left: 3px solid #00ffc8; }
`;

const GamingSectionHeader = styled.div`
  color: #4a9eff;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  background: rgba(74,158,255,0.08);
  border-radius: 8px;
  padding: 12px 15px;
  margin: 10px 0 4px 0;
  border: 1px solid rgba(74,158,255,0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  &:hover { background: rgba(74,158,255,0.14); border-color: rgba(74,158,255,0.4); }
`;

const GamingMenuItem = styled(MenuItem)`
  &:hover { background: rgba(74,158,255,0.1); border-left-color: #4a9eff; color: #4a9eff; }
  &.active { background: rgba(74,158,255,0.15); border-left-color: #4a9eff; color: #4a9eff; box-shadow: inset 0 0 10px rgba(74,158,255,0.15); }
`;

const AIMenuItem = styled(MenuItem)`
  &:hover { background: rgba(124,58,237,0.1); border-left-color: #a78bfa; color: #a78bfa; }
  &.active { background: rgba(124,58,237,0.15); border-left-color: #a78bfa; color: #a78bfa; box-shadow: inset 0 0 10px rgba(124,58,237,0.15); }
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
  &:hover { color: #c4b5fd; }
  &::after { content: ''; flex: 1; height: 1px; background: rgba(167,139,250,0.3); }
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
  border-top: 1px solid rgba(0,255,200,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

const Sidebar = ({ user }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path.replace(/:\w+/g, ""));

  const [collapsed, setCollapsed] = useState(false);
  const [gamingNotifications, setGamingNotifications] = useState({ chatrooms: 0, teamRoom: 0, squads: 0 });

  // ── Section collapse states ──
  const [showProfiles,  setShowProfiles]  = useState(true);
  const [showFeed,      setShowFeed]      = useState(true);
  const [showGaming,    setShowGaming]    = useState(true);
  const [showContent,   setShowContent]   = useState(true);
  const [showMusic,     setShowMusic]     = useState(true);
  const [showAI,        setShowAI]        = useState(true);
  const [showRadio,     setShowRadio]     = useState(false);
  const [showStore,     setShowStore]     = useState(true);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showAccount,   setShowAccount]   = useState(false);

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

  // Persist section open/closed states
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sidebar_sections") || "{}");
      if (saved.profiles  !== undefined) setShowProfiles(saved.profiles);
      if (saved.feed      !== undefined) setShowFeed(saved.feed);
      if (saved.gaming    !== undefined) setShowGaming(saved.gaming);
      if (saved.content   !== undefined) setShowContent(saved.content);
      if (saved.music     !== undefined) setShowMusic(saved.music);
      if (saved.ai        !== undefined) setShowAI(saved.ai);
      if (saved.radio     !== undefined) setShowRadio(saved.radio);
      if (saved.store     !== undefined) setShowStore(saved.store);
      if (saved.dashboard !== undefined) setShowDashboard(saved.dashboard);
      if (saved.account   !== undefined) setShowAccount(saved.account);
    } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_sections", JSON.stringify({
      profiles: showProfiles, feed: showFeed, gaming: showGaming,
      content: showContent, music: showMusic, ai: showAI,
      radio: showRadio, store: showStore, dashboard: showDashboard, account: showAccount
    }));
  }, [showProfiles, showFeed, showGaming, showContent, showMusic, showAI, showRadio, showStore, showDashboard, showAccount]);

  return (
    <SidebarContainer className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* ── Collapse toggle ── */}
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

      {/* ============================================================ */}
      {/* #1  👤 PROFILES                                              */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowProfiles(!showProfiles)}>
        👤 <span className="sidebar-section-text">Profiles</span>
        <FreeBadge className="sidebar-label">FREE</FreeBadge>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showProfiles ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showProfiles && (
        <>
          <ProfileMenuItem to="/profile" className={isActive("/profile") && !isActive("/profile/") ? "active" : ""}>
            👤 <span className="sidebar-label">Social Profile</span>
            <MenuHint className="sidebar-hint">free</MenuHint>
          </ProfileMenuItem>

          {hasArtistProfile && (
            <ProfileMenuItem to={`/artist-profile/${user?.id}`} className={isActive(`/artist-profile/${user?.id}`) ? "active" : ""}>
              🎵 <span className="sidebar-label">Artist Page</span>
              <MenuHint className="sidebar-hint">free</MenuHint>
            </ProfileMenuItem>
          )}

          {hasGamerProfile && (
            <ProfileMenuItem to={`/gamer-profile/${user?.id}`} className={isActive("/gamer-profile") ? "active" : ""}>
              🎮 <span className="sidebar-label">Gamer Profile</span>
              <MenuHint className="sidebar-hint">free</MenuHint>
            </ProfileMenuItem>
          )}

          <ProfileMenuItem to="/my-video-channel" className={isActive("/my-video-channel") ? "active" : ""}>
            📹 <span className="sidebar-label">Video Channel</span>
            <MenuHint className="sidebar-hint">free</MenuHint>
          </ProfileMenuItem>

          {(!hasArtistProfile || !hasGamerProfile) && (
            <CreateProfileLink to="/settings" className="sidebar-create-link">
              ➕ Add Profile Type...
            </CreateProfileLink>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* #2  🏠 FEED & DISCOVER                                       */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowFeed(!showFeed)}>
        🏠 <span className="sidebar-section-text">Feed</span>
        <FreeBadge className="sidebar-label">FREE</FreeBadge>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showFeed ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showFeed && (
        <>
          <MenuItem to="/home-feed"        className={isActive("/home-feed") ? "active" : ""}>
            🏠 <span className="sidebar-label">Home Feed</span>
          </MenuItem>
          <MenuItem to="/discover-users"   className={isActive("/discover-users") ? "active" : ""}>
            🔍 <span className="sidebar-label">Discover Users</span>
          </MenuItem>
          <MenuItem to="/content-library"  className={isActive("/content-library") ? "active" : ""}>
            📚 <span className="sidebar-label">Content Library</span>
          </MenuItem>
          <MenuItem to="/search"           className={isActive("/search") ? "active" : ""}>
            🔎 <span className="sidebar-label">Search</span>
          </MenuItem>
          <MenuItem to="/explore"          className={isActive("/explore") ? "active" : ""}>
            🌐 <span className="sidebar-label">Explore</span>
          </MenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #3  🎮 GAMING                                                */}
      {/* ============================================================ */}
      <GamingSectionHeader onClick={() => setShowGaming(!showGaming)}>
        <span>
          🎮 <span className="sidebar-label">Gaming</span>
          <FreeBadge className="sidebar-label" style={{ marginLeft: '6px' }}>FREE</FreeBadge>
        </span>
        <span className="sidebar-arrow" style={{ fontSize: '0.7rem' }}>
          {showGaming ? "▼" : "▶"}
        </span>
      </GamingSectionHeader>

      {showGaming && (
        <>
          <GamingMenuItem to="/gamers-chatroom" className={isActive("/gamers-chatroom") ? "active" : ""}>
            💬 <span className="sidebar-label">Gamer Chatrooms</span>
            {gamingNotifications.chatrooms > 0 && <NotificationBadge>{gamingNotifications.chatrooms}</NotificationBadge>}
          </GamingMenuItem>
          <GamingMenuItem to="/squad-finder" className={isActive("/squad-finder") ? "active" : ""}>
            🔍 <span className="sidebar-label">Find Squads</span>
            {gamingNotifications.squads > 0 && <NotificationBadge>{gamingNotifications.squads}</NotificationBadge>}
          </GamingMenuItem>
          <GamingMenuItem to="/team-room" className={isActive("/team-room") ? "active" : ""}>
            🧑‍🤝‍🧑 <span className="sidebar-label">Team Room</span>
            {gamingNotifications.teamRoom > 0 && <NotificationBadge>{gamingNotifications.teamRoom}</NotificationBadge>}
          </GamingMenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #4  🎬 CONTENT                                               */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowContent(!showContent)}>
        🎬 <span className="sidebar-section-text">Content</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showContent ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showContent && (
        <>
          <MenuItem to="/video-editor"    className={isActive("/video-editor") ? "active" : ""}>
            🎬 <span className="sidebar-label">Video Editor</span>
            <MenuHint className="sidebar-hint">free</MenuHint>
          </MenuItem>
          <MenuItem to="/browse-videos"   className={isActive("/browse-videos") ? "active" : ""}>
            🎞️ <span className="sidebar-label">Browse Videos</span>
          </MenuItem>
          <MenuItem to="/upload-video"    className={isActive("/upload-video") ? "active" : ""}>
            📤 <span className="sidebar-label">Upload Video</span>
          </MenuItem>
          <MenuItem to="/reels"           className={isActive("/reels") ? "active" : ""}>
            🎞️ <span className="sidebar-label">Reels</span>
          </MenuItem>
          <MenuItem to="/upload-reel"     className={isActive("/upload-reel") ? "active" : ""}>
            ⬆️ <span className="sidebar-label">Upload Reel</span>
          </MenuItem>
          <MenuItem to="/live-streams"    className={isActive("/live-streams") ? "active" : ""}>
            📡 <span className="sidebar-label">Live Streams</span>
          </MenuItem>
          {/* Podcast — single entry point; Create + Browse are inside the studio */}
          <MenuItem to="/podcast-studio"  className={isActive("/podcast-studio") ? "active" : ""}>
            🎙️ <span className="sidebar-label">Podcast Studio</span>
          </MenuItem>
          <MenuItem to="/browse-podcast-categories" className={isActive("/browse-podcast-categories") ? "active" : ""}>
            🎧 <span className="sidebar-label">Browse Podcasts</span>
          </MenuItem>
          <MenuItem to="/video-series-builder" className={isActive("/video-series-builder") ? "active" : ""}>
            📺 <span className="sidebar-label">Video Series</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </MenuItem>
          <MenuItem to="/collab-marketplace" className={isActive("/collab-marketplace") ? "active" : ""}>
            🤝 <span className="sidebar-label">Collab Marketplace</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </MenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #5  🎤 MUSIC  (artist profiles only)                         */}
      {/* ============================================================ */}
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
              <MenuItem to="/recording-studio"    className={isActive("/recording-studio") ? "active" : ""}>
                🎛️ <span className="sidebar-label">Recording Studio</span>
                <MenuHint className="sidebar-hint">DAW</MenuHint>
              </MenuItem>
              <MenuItem to="/epk-collab-hub"      className={isActive("/epk-collab-hub") ? "active" : ""}>
                📋 <span className="sidebar-label">EPK & Collabs</span>
                <MenuHint className="sidebar-hint">FREE</MenuHint>
              </MenuItem>
              <MenuItem to="/ai-mastering"        className={isActive("/ai-mastering") ? "active" : ""}>
                🎚️ <span className="sidebar-label">AI Mastering</span>
              </MenuItem>
              <MenuItem to="/hum-to-song"         className={isActive("/hum-to-song") ? "active" : ""}>
                🎤 <span className="sidebar-label">Hum to Song</span>
                <MenuHint className="sidebar-hint">AI</MenuHint>
              </MenuItem>
              <MenuItem to="/ai-text-to-song"     className={isActive("/ai-text-to-song") ? "active" : ""}>
                🎵 <span className="sidebar-label">Text to Song</span>
                <MenuHint className="sidebar-hint">AI</MenuHint>
              </MenuItem>
              <MenuItem to="/music-distribution"  className={isActive("/music-distribution") ? "active" : ""}>
                🌍 <span className="sidebar-label">Music Distribution</span>
              </MenuItem>
              <MenuItem to="/creator/membership"  className={isActive("/creator/membership") ? "active" : ""}>
                ⭐ <span className="sidebar-label">Fan Membership</span>
                <MenuHint className="sidebar-hint">NEW</MenuHint>
              </MenuItem>
            </>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* #6  🤖 AI TOOLS                                              */}
      {/* Removed: AI Thumbnail Maker, AI Promo Generator (stubs)      */}
      {/* Removed: Hum to Song + Text to Song (moved to Music section) */}
      {/* ============================================================ */}
      <AISectionHeader className="sidebar-section-header" onClick={() => setShowAI(!showAI)}>
        🤖 <span className="sidebar-section-text">AI Tools</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showAI ? '▼' : '▶'}
        </span>
      </AISectionHeader>

      {showAI && (
        <>
          <AIMenuItem to="/ai-stem-separation" className={isActive("/ai-stem-separation") ? "active" : ""}>
            🎵 <span className="sidebar-label">AI Stem Separation</span>
            <MenuHint className="sidebar-hint">FREE</MenuHint>
          </AIMenuItem>
          <AIMenuItem to="/ai-video-studio" className={isActive("/ai-video-studio") ? "active" : ""}>
            🎬 <span className="sidebar-label">AI Video Studio</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </AIMenuItem>
          <AIMenuItem to="/voice-clone-services" className={isActive("/voice-clone-services") ? "active" : ""}>
            🎤 <span className="sidebar-label">AI Voice Clone</span>
          </AIMenuItem>
          <AIMenuItem to="/ai-content-writer" className={isActive("/ai-content-writer") ? "active" : ""}>
            ✍️ <span className="sidebar-label">AI Content Writer</span>
          </AIMenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #7  📻 RADIO                                                 */}
      {/* ============================================================ */}
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
          <MenuItem to="/airadio-dj" className={isActive("/airadio-dj") ? "active" : ""}>
            🤖 <span className="sidebar-label">AI Radio DJ</span>
          </MenuItem>
          <MenuItem to="/dj-mixer" className={isActive("/dj-mixer") ? "active" : ""}>
            🎛 <span className="sidebar-label">DJ Mixer</span>
          </MenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #8  🛍️ STORE                                                 */}
      {/* Beat Store + Stems + Sell Beats + Sell Stems → Music Store   */}
      {/* Added: Merch Store (Printful)                                */}
      {/* Added: Creator Academy                                       */}
      {/* Removed: Sample Market (still accessible via Music Store)   */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowStore(!showStore)}>
        🛍️ <span className="sidebar-section-text">Store</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showStore ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showStore && (
        <>
          {/* Unified beats + stems + selling — one page handles all of it */}
          <MenuItem to="/music-store" className={isActive("/music-store") ? "active" : ""}>
            🎹 <span className="sidebar-label">Music Store</span>
            <MenuHint className="sidebar-hint">beats + stems</MenuHint>
          </MenuItem>
          <MenuItem to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>
            🛒 <span className="sidebar-label">Marketplace</span>
          </MenuItem>
          <MenuItem to="/browse-producers" className={isActive("/browse-producers") ? "active" : ""}>
            🎤 <span className="sidebar-label">Browse Producers</span>
          </MenuItem>
          <MenuItem to="/storefront" className={isActive("/storefront") ? "active" : ""}>
            🏪 <span className="sidebar-label">My Storefront</span>
          </MenuItem>
          {/* Merch Store — Printful print-on-demand */}
          <MenuItem to="/merch-store" className={isActive("/merch-store") ? "active" : ""}>
            👕 <span className="sidebar-label">Merch Store</span>
            <MenuHint className="sidebar-hint">Printful</MenuHint>
          </MenuItem>
          <MenuItem to="/merch-designer" className={isActive("/merch-designer") ? "active" : ""}>
            🎨 <span className="sidebar-label">Merch Designer</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </MenuItem>
          <MenuItem to="/orders" className={isActive("/orders") ? "active" : ""}>
            📦 <span className="sidebar-label">Orders</span>
          </MenuItem>
          {/* Creator Academy — learn from real creators */}
          <MenuItem to="/creator-academy" className={isActive("/creator-academy") ? "active" : ""}>
            🎓 <span className="sidebar-label">Creator Academy</span>
            <MenuHint className="sidebar-hint">NEW</MenuHint>
          </MenuItem>
          <MenuItem to="/my-learning" className={isActive("/my-learning") ? "active" : ""}>
            🎓 <span className="sidebar-label">My Learning</span>
          </MenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* #9  📊 DASHBOARD                                             */}
      {/* Collab Splits + Payout Dashboard live as tabs inside here    */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowDashboard(!showDashboard)}>
        📊 <span className="sidebar-section-text">Dashboard</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showDashboard ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showDashboard && (
        <DashboardLink to="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
          🚀 <span className="sidebar-label">Creator Dashboard</span>
          <MenuHint className="sidebar-hint">all in one</MenuHint>
        </DashboardLink>
      )}

      {/* ============================================================ */}
      {/* #10 ⚙️ ACCOUNT                                               */}
      {/* ============================================================ */}
      <SectionHeader className="sidebar-section-header" onClick={() => setShowAccount(!showAccount)}>
        ⚙️ <span className="sidebar-section-text">Account</span>
        <span className="sidebar-arrow" style={{ fontSize: '0.6rem', marginLeft: 'auto' }}>
          {showAccount ? '▼' : '▶'}
        </span>
      </SectionHeader>

      {showAccount && (
        <>
          <MenuItem to="/settings"      className={isActive("/settings") ? "active" : ""}>
            ⚙️ <span className="sidebar-label">Settings</span>
          </MenuItem>
          <MenuItem to="/support"       className={isActive("/support") ? "active" : ""}>
            🛠️ <span className="sidebar-label">Tech Support</span>
          </MenuItem>
          <MenuItem to="/notifications" className={isActive("/notifications") ? "active" : ""}>
            🔔 <span className="sidebar-label">Notifications</span>
          </MenuItem>
        </>
      )}

      {/* ============================================================ */}
      {/* 📊 USAGE STATUS                                              */}
      {/* ============================================================ */}
      <UsageSection className="sidebar-usage-section">
        <StorageStatus compact={true} />
        <BandwidthStatus compact={true} />
      </UsageSection>

    </SidebarContainer>
  );
};

export default Sidebar;