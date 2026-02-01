// src/front/js/pages/Dashboard/Dashboard.js
// Unified Creator Dashboard - All dashboards in one place with tabs
import React, { useState, useEffect, useContext } from "react";
import { Routes, Route, NavLink, useLocation, Navigate, Link } from "react-router-dom";
import { Context } from "../../store/appContext";

// Tab Components
import DashboardOverview from "./DashboardOverview";
import DashboardMusic from "./DashboardMusic";
import DashboardPodcasts from "./DashboardPodcasts";
import DashboardRadio from "./DashboardRadio";
import DashboardVideos from "./DashboardVideos";
import DashboardStore from "./DashboardStore";

import "../../../styles/Dashboard.css";

const Dashboard = () => {
  const { store } = useContext(Context);
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determine what profiles the user has (with profile_type fallbacks)
  const hasArtistProfile = user?.is_artist === true || user?.profile_type === 'artist' || user?.profile_type === 'multiple';
  const hasGamerProfile = user?.is_gamer === true || user?.profile_type === 'gamer' || user?.profile_type === 'multiple';

  // Check if user has any podcasts (we'll fetch this)
  const [hasPodcasts, setHasPodcasts] = useState(true); // Default true, hide if none
  const [hasRadioStations, setHasRadioStations] = useState(true);
  const [hasProducts, setHasProducts] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch user profile
      const profileRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (profileRes.ok) {
        const data = await profileRes.json();
        setUser(data.user || data);
      }

      // Quick check for content existence (optional - can remove for simplicity)
      // These just determine if tabs show, but tabs can also show "empty state"
      
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Define available tabs based on user profile
  const tabs = [
    { 
      id: 'overview', 
      path: '/dashboard', 
      label: 'Overview', 
      icon: '📊',
      show: true 
    },
    { 
      id: 'music', 
      path: '/dashboard/music', 
      label: 'Music', 
      icon: '🎵',
      show: hasArtistProfile 
    },
    { 
      id: 'podcasts', 
      path: '/dashboard/podcasts', 
      label: 'Podcasts', 
      icon: '🎙️',
      show: true // Always show - podcasts available to all
    },
    { 
      id: 'radio', 
      path: '/dashboard/radio', 
      label: 'Radio', 
      icon: '📻',
      show: true // Always show - radio available to all
    },
    { 
      id: 'videos', 
      path: '/dashboard/videos', 
      label: 'Videos', 
      icon: '📹',
      show: true // Always show - videos available to all
    },
    { 
      id: 'store', 
      path: '/dashboard/store', 
      label: 'Store', 
      icon: '🛍️',
      show: true // Always show - store available to all
    },
  ].filter(tab => tab.show);

  // Get current tab for header display
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'overview';
    const segment = path.split('/dashboard/')[1];
    return segment || 'overview';
  };

  if (loading) {
    return (
      <div className="unified-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <img
            src={user?.profile_picture || "https://via.placeholder.com/60"}
            alt="Profile"
            className="header-avatar"
          />
          <div className="header-info">
            <h1>Welcome back, {user?.display_name || user?.username || 'Creator'}!</h1>
            <p className="header-subtitle">
              {hasArtistProfile && '🎵 Artist'} 
              {hasGamerProfile && ' • 🎮 Gamer'}
              {!hasArtistProfile && !hasGamerProfile && '🚀 Creator'}
            </p>
          </div>
        </div>
        <div className="header-right">
          <NavLink to="/settings" className="header-btn secondary">
            ⚙️ Settings
          </NavLink>
          <NavLink to="/profile" className="header-btn secondary">
            👤 Profile
          </NavLink>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="dashboard-tabs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            end={tab.path === '/dashboard'}
            className={({ isActive }) => `dashboard-tab ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="dashboard-content">
        <Routes>
          <Route index element={<DashboardOverview user={user} />} />
          <Route path="music" element={<DashboardMusic user={user} />} />
          <Route path="podcasts" element={<DashboardPodcasts user={user} />} />
          <Route path="radio" element={<DashboardRadio user={user} />} />
          <Route path="videos" element={<DashboardVideos user={user} />} />
          <Route path="store" element={<DashboardStore user={user} />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;