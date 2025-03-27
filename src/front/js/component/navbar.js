// ✅ Navbar.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png";
import "../../styles/Navbar.css";

const Navbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
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
        <li className="nav-item"><Link className="nav-link" to="/">🏠 Home</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/login">🔑 Login</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/register">📝 Signup</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/favorites">⭐ Favorites</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/notifications">🔔 Notifications</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/settings">⚙️ Account Settings</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/marketplace">🛒 Marketplace</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/payout-request">💵 Payout Request</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/trending">📈 Trending</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/merch-store">🛍️ Merch Store</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/browse-podcasts">🎙️ Browse Podcasts</Link></li>
        <li className="nav-item"><Link className="nav-link" to="/browse-radio-stations">📻 Browse Radio Stations</Link></li>

        {user ? (
          <li className="nav-item dropdown">
            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
              <img
                src={user.profile_picture || "/default-avatar.png"}
                alt="Avatar"
                className="rounded-circle"
                style={{ width: "24px", height: "24px", marginRight: "5px" }}
              />
              {user.username}
            </a>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><Link className="dropdown-item" to="/profile">👤 My Profile</Link></li>
              <li><Link className="dropdown-item" to="/members">📊 My Audience</Link></li>
              <li><Link className="dropdown-item" to="/revenue">💰 My Revenue</Link></li>
              <li><button className="dropdown-item" onClick={handleLogout}>🚪 Logout</button></li>
            </ul>
          </li>
        ) : null}
      </ul>
    </nav>
  );
};

export default Navbar;
