// ✅ Updated Navbar.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);

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
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/">
        <img src={logo} alt="StreampireX" style={{ height: "48px" }} />
      </Link>

      <ul className="navbar-nav ms-auto">
        <li className="nav-item">
          <Link className="nav-link" to="/">🏠 Home</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/pricing-plans">🏠 Pricing</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/browse-podcast-categories">🎙️ Browse Podcast Categories</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/videos">📹 Browse Videos</Link> {/* ✅ Fixed route path */}
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/browse-radio-stations">📻 Browse Radio Stations</Link>
        </li>
        <li className="nav-item">
          <Link className="nav-link" to="/live-streams">📡 Live Streams</Link>
        </li>

        {!user ? (
          <>
            <li className="nav-item">
              <Link className="nav-link" to="/login">🔑 Login</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/register">📝 Signup</Link>
            </li>
          </>
        ) : (
          <li className="nav-item dropdown">
            <a
              className="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
            >
              <img
                src={user.profile_picture || "/default-avatar.png"}
                alt="Avatar"
                className="rounded-circle"
                style={{ width: "24px", height: "24px", marginRight: "5px" }}
              />
              {user.username}
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <Link className="dropdown-item" to="/profile">👤 My Profile</Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/settings">⚙️ Settings</Link>
              </li>
              <li>
                <Link className="dropdown-item" to="/notifications">🔔 Notifications</Link>
              </li>
              <li>
                <button className="dropdown-item" onClick={handleLogout}>🚪 Logout</button>
              </li>
            </ul>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
