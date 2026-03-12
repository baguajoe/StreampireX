import React from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png";

const Navbar = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#050a12", borderBottom: "1px solid #1a222d", padding: "0.8rem 2rem" }}>
            <div className="container-fluid">
                <Link to="/" className="navbar-brand d-flex align-items-center">
                    <img src={logo} alt="StreamPireX Logo" style={{ height: "45px", width: "auto" }} />
                </Link>
                
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav mx-auto">
                        <li className="nav-item"><Link className="nav-link text-white px-3" to="/">Home</Link></li>
                        <li className="nav-item"><Link className="nav-link text-white px-3" to="/pricing">Pricing</Link></li>
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle text-white px-3" href="#" id="featuresDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Explore
                            </a>
                            <ul className="dropdown-menu dropdown-menu-dark" aria-labelledby="featuresDropdown">
                                <li><Link className="dropdown-item" to="/podcasts">Podcasts</Link></li>
                                <li><Link className="dropdown-item" to="/videos">Videos</Link></li>
                                <li><Link className="dropdown-item" to="/radio">Radio</Link></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><Link className="dropdown-item" to="/marketplace">Marketplace</Link></li>
                            </ul>
                        </li>
                    </ul>

                    <div className="d-flex align-items-center">
                        <Link to="/cart" className="btn btn-outline-light me-3 d-flex align-items-center px-3">
                            <i className="fas fa-shopping-cart me-2"></i>
                            <span>Cart ($0.00)</span>
                        </Link>
                        <Link to="/join" className="btn" style={{ backgroundColor: "#00f2ea", color: "#050a12", fontWeight: "700", borderRadius: "8px", padding: "0.5rem 1.2rem" }}>
                            Join Waitlist
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;