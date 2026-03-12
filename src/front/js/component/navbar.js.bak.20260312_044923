import React from "react";
import { Link } from "react-router-dom";
import logo from "../../img/StreampireX.png";

const Navbar = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: "#050a12", borderBottom: "1px solid #1a222d", padding: "0.5rem 1.5rem" }}>
            <div className="container-fluid">
                <Link to="/" className="navbar-brand">
                    <img src={logo} alt="StreamPireX" style={{ height: "38px", width: "auto", objectFit: "contain" }} />
                </Link>
                
                <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item"><Link className="nav-link text-white px-3" to="/">Home</Link></li>
                        <li className="nav-item"><a className="nav-link text-white px-3" href="/compare.html">Comparison</a></li>
                    </ul>
                </div>

                <div className="d-flex align-items-center">
                    <Link to="/login" className="nav-link text-white me-3 fw-bold">Login</Link>
                    <Link to="/join" className="btn" style={{ backgroundColor: "#00f2ea", color: "#050a12", fontWeight: "bold", borderRadius: "20px", padding: "0.4rem 1.2rem" }}>Join Waitlist</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;