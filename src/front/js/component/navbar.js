// Horizontal Navbar.js - Replaces sidebar layout
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../img/StreampireX.png";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.username) setUser(data);
        })
        .catch((err) => console.error("Error fetching user:", err));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsUserMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="horizontal-navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link className="navbar-brand" to="/" onClick={closeMobileMenu}>
          <img src={logo} alt="StreampireX" />
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Links */}
        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link 
            className={`nav-link ${isActive('/') ? 'active' : ''}`} 
            to="/" 
            onClick={closeMobileMenu}
          >
            Home
          </Link>
          
          <Link 
            className={`nav-link ${isActive('/pricing-plans') ? 'active' : ''}`} 
            to="/pricing-plans" 
            onClick={closeMobileMenu}
          >
            Pricing
          </Link>
          
          <Link 
            className={`nav-link ${isActive('/browse-podcast-categories') ? 'active' : ''}`} 
            to="/browse-podcast-categories" 
            onClick={closeMobileMenu}
          >
            Podcasts
          </Link>
          
          <Link 
            className={`nav-link ${isActive('/videos') ? 'active' : ''}`} 
            to="/videos" 
            onClick={closeMobileMenu}
          >
            Videos
          </Link>
          
          <Link 
            className={`nav-link ${isActive('/browse-radio-stations') ? 'active' : ''}`} 
            to="/browse-radio-stations" 
            onClick={closeMobileMenu}
          >
            Radio
          </Link>
          
          <Link 
            className={`nav-link ${isActive('/live-streams') ? 'active' : ''}`} 
            to="/live-streams" 
            onClick={closeMobileMenu}
          >
            Live
          </Link>
        </div>

        {/* User Section */}
        <div className="user-section">
          {!user ? (
            <div className="auth-buttons">
              <Link className="login-btn" to="/login" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link className="signup-btn" to="/register" onClick={closeMobileMenu}>
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="user-menu-container">
              <button className="user-menu-btn" onClick={toggleUserMenu}>
                <img
                  src={user.profile_picture || "/default-avatar.png"}
                  alt="Profile"
                  className="user-avatar"
                />
                <span className="username">{user.username}</span>
                <span className={`dropdown-arrow ${isUserMenuOpen ? 'rotated' : ''}`}>▼</span>
              </button>
              
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <img
                      src={user.profile_picture || "/default-avatar.png"}
                      alt="Profile"
                      className="dropdown-avatar"
                    />
                    <div className="user-info">
                      <span className="dropdown-username">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <Link className="dropdown-item" to="/settings" onClick={() => setIsUserMenuOpen(false)}>
                    Settings
                  </Link>
                  <Link className="dropdown-item" to="/notifications" onClick={() => setIsUserMenuOpen(false)}>
                    Notifications
                  </Link>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;