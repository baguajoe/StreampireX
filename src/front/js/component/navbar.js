import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setUser(data))
            .catch((err) => console.error("Error fetching user profile:", err));
    }, []);

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    return (
        <header className="navbar">
            <Link to="/" className="logo">🎙 My Streaming App</Link>
            <nav>
                <ul>
                    <li className="dropdown">
                        <span>📻 Browse Radio Stations ⏷</span>
                        <ul className="dropdown-menu">
                            <li><Link to="/category/Technology">Technology</Link></li>
                            <li><Link to="/category/Business">Business</Link></li>
                            <li><Link to="/category/Health & Wellness">Health & Wellness</Link></li>
                            <li><Link to="/category/Music">Music</Link></li>
                            <li><Link to="/category/Education">Education</Link></li>
                            <li><Link to="/category/Gaming">Gaming</Link></li>
                            <li><Link to="/category/Entertainment">Entertainment</Link></li>
                            <li><Link to="/category/News & Politics">News & Politics</Link></li>
                        </ul>
                    </li>
                    <li><Link to="/favorites">⭐ Favorites</Link></li>
                    <li><Link to="/subscriptions">💳 My Subscription</Link></li>
                    <li><Link to="/notifications">🔔 Notifications</Link></li>
                    <li><Link to="/settings">⚙️ Settings</Link></li>
                    {user ? (
                        <li className="profile-menu" onClick={toggleDropdown}>
                            <div className="profile-link">
                                <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-avatar" />
                                {user.username} ⏷
                            </div>
                            {dropdownOpen && (
                                <ul className="dropdown-menu">
                                    <li><Link to="/profile">👤 View Profile</Link></li>
                                    <li><Link to="/edit-profile">✏️ Edit Profile</Link></li>
                                    <li><Link to="/members">📊 My Audience</Link></li>
                                    <li><Link to="/account-settings">⚙️ Account Settings</Link></li>
                                    <li><Link to="/marketplace">🛒 Marketplace</Link></li>
                                    <li onClick={handleLogout}>🚪 Logout</li>
                                </ul>
                            )}
                        </li>
                    ) : (
                        <li><Link to="/login">🔑 Login</Link></li>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Navbar;
