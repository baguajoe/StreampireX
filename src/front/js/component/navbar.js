import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png"
import "../../styles/Navbar.css";

// const Navbar = () => {
//     const [user, setUser] = useState(null);
//     const [dropdownOpen, setDropdownOpen] = useState(false);

//     // ** NOTE: /user/profile route does not exist YET
//     // useEffect(() => {
//     //     fetch(`${process.env.BACKEND_URL}/user/profile`, {
//     //         method: "GET",
//     //         headers: {
//     //             Authorization: `Bearer ${localStorage.getItem("token")}`,
//     //         },
//     //     })
//     //         .then((res) => res.json())
//     //         .then((data) => setUser(data))
//     //         .catch((err) => console.error("Error fetching user profile:", err));
//     // }, []);

//     const toggleDropdown = () => {
//         setDropdownOpen(!dropdownOpen);
//     };

//     const handleLogout = () => {
//         localStorage.removeItem("token");
//         window.location.href = "/login";
//     };

//     return (
//         <nav className="navbar navbar-expand-lg bg-body-tertiary">
//             <div className="container-fluid">
//                 <Link className="navbar-brand" to="/">
//                     <img src={logo} alt="img not available" style={{ height: "68px" }} />
//                 </Link>
//                 <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
//                     <span className="navbar-toggler-icon"></span>
//                 </button>
//                 <div className="collapse navbar-collapse" id="navbarSupportedContent">
//                     {/* Empty space on the left to balance the navbar */}
//                     <div className="me-auto"></div>

//                     {/* Centered search form */}
//                     <form className="d-flex mx-auto" role="search">
//                         <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
//                         <button className="btn btn-outline-success" type="submit">Search</button>
//                     </form>

//                     {/* Navigation links on the right with streaming app content */}
//                     <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
//                         <li className="nav-item dropdown">
//                             {/* <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
//                                 📻 Browse Radio Stations
//                             </a> */}
//                             <ul className="dropdown-menu dropdown-menu-end">
//                                 <li><Link className="dropdown-item" to="/category/Technology">Technology</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Business">Business</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Health & Wellness">Health & Wellness</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Music">Music</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Education">Education</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Gaming">Gaming</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/Entertainment">Entertainment</Link></li>
//                                 <li><Link className="dropdown-item" to="/category/News & Politics">News & Politics</Link></li>
//                             </ul>
//                         </li>
//                         <li className="nav-item">
//                             <Link className="nav-link" to="/favorites">⭐ Favorites</Link>
//                         </li>
//                         <li className="nav-item">
//                             <Link className="nav-link" to="/subscriptions">💳 My Subscription</Link>
//                         </li>
//                         <li className="nav-item">
//                             <Link className="nav-link" to="/profile">💳 Profile</Link>
//                         </li>
//                         <li className="nav-item">
//                             <Link className="nav-link" to="/notifications">🔔 Notifications</Link>
//                         </li>
//                         <li className="nav-item">
//                             <Link className="nav-link" to="/settings">⚙️ Settings</Link>
//                         </li>
//                         {user ? (
//                             <li className="nav-item dropdown">
//                                 <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
//                                     <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="rounded-circle" style={{ width: "24px", height: "24px", marginRight: "5px" }} />
//                                     {user.username}
//                                 </a>
//                                 <ul className="dropdown-menu dropdown-menu-end">
//                                     <li><Link className="dropdown-item" to="/profile">👤 View Profile</Link></li>
//                                     <li><Link className="dropdown-item" to="/edit-profile">✏️ Edit Profile</Link></li>
//                                     <li><Link className="dropdown-item" to="/members">📊 My Audience</Link></li>
//                                     <li><Link className="dropdown-item" to="/account-settings">⚙️ Account Settings</Link></li>
//                                     <li><Link className="dropdown-item" to="/marketplace">🛒 Marketplace</Link></li>
//                                     <li><a className="dropdown-item" href="#" onClick={handleLogout}>🚪 Logout</a></li>
//                                 </ul>
//                             </li>
//                         ) : (
//                             <li className="nav-item">
//                                 <Link className="nav-link" to="/login">🔑 Login</Link>
//                             </li>
//                         )}
//                     </ul>
//                 </div>
//             </div>
//         </nav>
//     );
// };

// export default Navbar;  

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png";
import "../../styles/Navbar.css";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch user profile if logged in
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.username) {
                        setUser(data);
                    }
                })
                .catch((err) => console.error("Error fetching user profile:", err));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">
                    <img src={logo} alt="StreampireX Logo" style={{ height: "68px" }} />
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                    {/* Centered search bar */}
                    <form className="d-flex mx-auto" role="search">
                        <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
                        <button className="btn btn-outline-success" type="submit">Search</button>
                    </form>

                    {/* Navbar links */}
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                📻 Browse Radio Stations
                            </a>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><Link className="dropdown-item" to="/category/Technology">Technology</Link></li>
                                <li><Link className="dropdown-item" to="/category/Business">Business</Link></li>
                                <li><Link className="dropdown-item" to="/category/Music">Music</Link></li>
                                <li><Link className="dropdown-item" to="/category/Education">Education</Link></li>
                                <li><Link className="dropdown-item" to="/category/Gaming">Gaming</Link></li>
                                <li><Link className="dropdown-item" to="/category/Entertainment">Entertainment</Link></li>
                                <li><Link className="dropdown-item" to="/category/News & Politics">News & Politics</Link></li>
                            </ul>
                        </li>
                        <li className="nav-item"><Link className="nav-link" to="/favorites">⭐ Favorites</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/subscriptions">💳 My Subscription</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/profile">👤 Profile</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/notifications">🔔 Notifications</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/settings">⚙️ Settings</Link></li>

                        {user ? (
                            <li className="nav-item dropdown">
                                <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                                    <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="rounded-circle" style={{ width: "24px", height: "24px", marginRight: "5px" }} />
                                    {user.username}
                                </a>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li><Link className="dropdown-item" to="/profile">👤 View Profile</Link></li>
                                    <li><Link className="dropdown-item" to="/edit-profile">✏️ Edit Profile</Link></li>
                                    <li><Link className="dropdown-item" to="/members">📊 My Audience</Link></li>
                                    <li><Link className="dropdown-item" to="/admin-dashboard">⚙️ Admin Dashboard</Link></li>
                                    <li><Link className="dropdown-item" to="/account-settings">⚙️ Account Settings</Link></li>
                                    <li><Link className="dropdown-item" to="/marketplace">🛒 Marketplace</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/analytics">📊 Analytics Dashboard</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/licenses">📜 Licensing & Sync Marketplace</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/premium-content">🔒 Premium Content</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/revenue">💰 Revenue Dashboard</Link></li>
                                    <li className="nav-item"><Link className="nav-link" to="/merch-store">🛍️ Merch Store</Link></li>
                                    <li><button className="dropdown-item" onClick={handleLogout}>🚪 Logout</button></li>
                                </ul>
                            </li>
                        ) : (
                            <li className="nav-item">
                                <Link className="nav-link" to="/login">🔑 Login</Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
