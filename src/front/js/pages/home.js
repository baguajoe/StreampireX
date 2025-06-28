import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../store/appContext";
import heroImage from "../../img/guitarguy.png";
import "../../styles/home.css";

const Home = () => {
	const { store, actions } = useContext(Context);

	return (
		<div className="streampirex-home">
			<header className="hero">
				<div className="hero-content">
					<h1>🔥 Welcome to StreampireX</h1>
					<p>The ultimate creator platform for music, podcasts, radio, and monetization.</p>
					<div className="cta-buttons">
						<Link to="/signup" className="btn btn-primary">Get Started</Link>
						<Link to="/login" className="btn btn-outline-light">Log In</Link>
					</div>
				</div>
				<img src={heroImage} alt="StreampireX Hero" className="hero-image" />
			</header>

			<section className="features">
				<h2>What You Can Do 🎯</h2>
				<div className="feature-grid">
					<div className="feature-card">
						<h4>🎧 Stream Music</h4>
						<p>Upload tracks, share albums, and build your fanbase.</p>
					</div>
					<div className="feature-card">
						<h4>🎙️ Launch Podcasts</h4>
						<p>Host episodes, monetize content, and reach new audiences.</p>
					</div>
					<div className="feature-card">
						<h4>📻 Start Radio Stations</h4>
						<p>Broadcast live, accept submissions, and manage your DJ station.</p>
					</div>
					<div className="feature-card">
						<h4>🛍️ Sell Products</h4>
						<p>Create merch, sell digital goods, and get paid with Stripe.</p>
					</div>
					<div className="feature-card">
						<h4>📊 Track Analytics</h4>
						<p>Monitor your growth, revenue, and audience behavior.</p>
					</div>
				</div>
			</section>

			<section className="join-now text-center">
				<h2>Ready to Share Your Voice?</h2>
				<p>Create, connect, and grow on StreampireX.</p>
				<Link to="/signup" className="btn btn-success btn-lg">Join Now</Link>
			</section>

			<footer className="footer">
				<p>© {new Date().getFullYear()} StreampireX. All rights reserved.</p>
			</footer>
		</div>
	);
};

export default Home;
