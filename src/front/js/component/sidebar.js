// ✅ Sidebar.js
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
  const isActive = (path) => location.pathname === path;

  return (
    <SidebarContainer className="sidebar">
      <SectionHeader>👤 User & Account</SectionHeader>
      <MenuItem to="/profile" className={isActive("/profile") ? "active" : ""}>👤 Profile</MenuItem>
      <MenuItem to="/settings" className={isActive("/settings") ? "active" : ""}>⚙️ Settings</MenuItem>
      <MenuItem to="/members" className={isActive("/members") ? "active" : ""}>👥 Members</MenuItem>
      <MenuItem to="/notifications" className={isActive("/notifications") ? "active" : ""}>🔔 Notifications</MenuItem>
      <MenuItem to="/favorites" className={isActive("/favorites") ? "active" : ""}>⭐ Favorites</MenuItem>
      <MenuItem to="/comments" className={isActive("/comments") ? "active" : ""}>💬 Comments</MenuItem>

      <SectionHeader>🎧 Podcasts</SectionHeader>
      <MenuItem to="/podcast-dashboard" className={isActive("/podcast-dashboard") ? "active" : ""}>📊 Dashboard</MenuItem>
      <MenuItem to="/podcast-create" className={isActive("/podcast-create") ? "active" : ""}>🎙️ Create Podcast</MenuItem>
      <MenuItem to="/browse-podcasts" className={isActive("/browse-podcasts") ? "active" : ""}>🎧 Browse Podcasts</MenuItem>
      <MenuItem to="/podcasts" className={isActive("/podcasts") ? "active" : ""}>🎧 All Podcasts</MenuItem>

      <SectionHeader>📻 Radio</SectionHeader>
      <MenuItem to="/browse-radio-stations" className={isActive("/browse-radio-stations") ? "active" : ""}>📻 Browse Stations</MenuItem>
      <MenuItem to="/create-radio" className={isActive("/create-radio") ? "active" : ""}>➕ Create Station</MenuItem>
      <MenuItem to="/artist-radio" className={isActive("/artist-radio") ? "active" : ""}>🎤 Artist Radio</MenuItem>

      <SectionHeader>🎶 Music</SectionHeader>
      <MenuItem to="/music" className={isActive("/music") ? "active" : ""}>🎵 Music</MenuItem>
      <MenuItem to="/upload-music" className={isActive("/upload-music") ? "active" : ""}>⬆️ Upload Music</MenuItem>

      <SectionHeader>📜 Licensing</SectionHeader>
      <MenuItem to="/music-licensing" className={isActive("/music-licensing") ? "active" : ""}>📄 Music Licensing</MenuItem>
      <MenuItem to="/licenses" className={isActive("/licenses") ? "active" : ""}>📑 Licenses</MenuItem>
      <MenuItem to="/licensing-marketplace" className={isActive("/licensing-marketplace") ? "active" : ""}>🛒 Licensing Marketplace</MenuItem>

      <SectionHeader>🎥 Live</SectionHeader>
      <MenuItem to="/live-studio" className={isActive("/live-studio") ? "active" : ""}>🎥 Live Studio</MenuItem>
      <MenuItem to="/live-streams" className={isActive("/live-streams") ? "active" : ""}>📡 Live Streams</MenuItem>
      <MenuItem to="/live-concerts" className={isActive("/live-concerts") ? "active" : ""}>🎶 Live Concerts</MenuItem>

      <SectionHeader>📊 Analytics</SectionHeader>
      <MenuItem to="/analytics" className={isActive("/analytics") ? "active" : ""}>📈 Analytics</MenuItem>
      <MenuItem to="/creator/analytics/:creatorId" className={isActive("/creator/analytics/:creatorId") ? "active" : ""}>👨‍🎤 Creator Analytics</MenuItem>
      <MenuItem to="/admin-dashboard" className={isActive("/admin-dashboard") ? "active" : ""}>🛠 Admin Dashboard</MenuItem>
      <MenuItem to="/revenue" className={isActive("/revenue") ? "active" : ""}>💰 Revenue</MenuItem>
      <MenuItem to="/revenue-analytics" className={isActive("/revenue-analytics") ? "active" : ""}>📊 Revenue Analytics</MenuItem>

      <SectionHeader>💸 Monetization</SectionHeader>
      <MenuItem to="/payout-request" className={isActive("/payout-request") ? "active" : ""}>💵 Payout</MenuItem>
      <MenuItem to="/payment-processing" className={isActive("/payment-processing") ? "active" : ""}>💳 Payment</MenuItem>
      <MenuItem to="/refund-processing" className={isActive("/refund-processing") ? "active" : ""}>🔁 Refund</MenuItem>

      <SectionHeader>🛍 Marketplace</SectionHeader>
      <MenuItem to="/marketplace" className={isActive("/marketplace") ? "active" : ""}>🛍️ Marketplace</MenuItem>
      <MenuItem to="/merch-store" className={isActive("/merch-store") ? "active" : ""}>🧢 Merch</MenuItem>
      <MenuItem to="/digital-products" className={isActive("/digital-products") ? "active" : ""}>📦 Digital Products</MenuItem>
      <MenuItem to="/product-checkout" className={isActive("/product-checkout") ? "active" : ""}>💳 Checkout</MenuItem>
      <MenuItem to="/product-page" className={isActive("/product-page") ? "active" : ""}>🧾 Product Page</MenuItem>
      <MenuItem to="/storefront" className={isActive("/storefront") ? "active" : ""}>🏪 Storefront</MenuItem>

      <SectionHeader>🧪 Other</SectionHeader>
      <MenuItem to="/avatar-creation" className={isActive("/avatar-creation") ? "active" : ""}>🧍 Avatar Creation</MenuItem>
      <MenuItem to="/create-avatar" className={isActive("/create-avatar") ? "active" : ""}>🧍 Create Avatar</MenuItem>
      <MenuItem to="/trending" className={isActive("/trending") ? "active" : ""}>📈 Trending</MenuItem>
      <MenuItem to="/search" className={isActive("/search") ? "active" : ""}>🔍 Search</MenuItem>
      <MenuItem to="/demo" className={isActive("/demo") ? "active" : ""}>🧪 Demo</MenuItem>
      <MenuItem to="/single/:id" className={isActive("/single/:id") ? "active" : ""}>📄 Single</MenuItem>
    </SidebarContainer>
  );
};

export default Sidebar;
