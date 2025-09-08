// Updated Navbar.js with Cart functionality
import React, { useEffect, useState, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { Context } from "../store/appContext";
import logo from "../../img/StreampireX.png";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();
  const { store, actions } = useContext(Context);

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

  // Update cart count when cart changes
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    };

    // Initial load
    updateCartCount();

    // Listen for cart updates
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
    };
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
            className={`nav-link ${isActive('/marketplace') ? 'active' : ''}`} 
            to="/marketplace" 
            onClick={closeMobileMenu}
          >
            Marketplace
          </Link>
        </div>

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {/* Cart & Checkout Section */}
          <div className="cart-checkout-section">
            {/* Checkout Button (only show when cart has items) */}
            {cartCount > 0 && (
              <Link 
                to="/checkout" 
                className="checkout-btn"
                onClick={closeMobileMenu}
              >
                <svg 
                  className="checkout-icon" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="18" 
                  height="18"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
                  />
                </svg>
                <span className="checkout-text">Checkout</span>
              </Link>
            )}

            {/* Cart Icon */}
            <Link 
              to="/cart" 
              className={`cart-link ${isActive('/cart') ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <div className="cart-icon-container">
                <svg 
                  className="cart-icon" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="24" 
                  height="24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8.5M17 18v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v9" 
                  />
                </svg>
                {cartCount > 0 && (
                  <span className="cart-badge">{cartCount}</span>
                )}
              </div>
              <span className="cart-text">Cart</span>
            </Link>
          </div>

          {/* User Authentication */}
          {user ? (
            <div className="user-menu">
              <button 
                className="user-menu-btn" 
                onClick={toggleUserMenu}
              >
                <div className="user-avatar">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.username}</span>
                <svg 
                  className={`dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <Link 
                    to="/profile" 
                    className="dropdown-link"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      closeMobileMenu();
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile
                  </Link>
                  <Link 
                    to="/orders" 
                    className="dropdown-link"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      closeMobileMenu();
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Orders
                  </Link>
                  <Link 
                    to="/settings" 
                    className="dropdown-link"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      closeMobileMenu();
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <hr className="dropdown-divider" />
                  <button 
                    className="dropdown-link logout-btn" 
                    onClick={handleLogout}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-links">
              <Link 
                to="/login" 
                className="nav-link login-link"
                onClick={closeMobileMenu}
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="nav-link signup-link"
                onClick={closeMobileMenu}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;