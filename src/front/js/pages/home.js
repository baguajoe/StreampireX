import React, { useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from 'react-router-dom';

const Home = () => {
	// Use actual context instead of mock
	const { store } = useContext(Context);
	const user = store.user; // Get user from context

	return (
		<div className="streampirex-home">
			<header className="hero">
				<div className="hero-content">
					<h1>🔥 Welcome to StreampireX</h1>
					<p>The ultimate creator platform for music distribution, streaming, podcasts, radio, gaming communities, and social monetization.</p>

					{/* Conditional rendering for CTA buttons */}
					{!user ? (
						// Show signup/login buttons when NOT logged in
						<div className="cta-buttons">
							<button onClick={() => window.location.href = '/signup'} className="btn btn-primary">Get Started</button>
							<button onClick={() => window.location.href = '/login'} className="btn btn-outline-light">Log In</button>
						</div>
					) : (
						// Show welcome message and dashboard link when logged in
						<div className="cta-buttons">
							<h3 style={{ color: '#00ffc8', marginBottom: '1rem' }}>
								Welcome back, {user.username || user.display_name}! 🎉
							</h3>
							<Link to="/creator-dashboard" className="btn btn-success">
								Go to Dashboard
							</Link>
							<Link to="/profile" className="btn btn-outline-light">
								My Profile
							</Link>
						</div>
					)}
				</div>
				<div className="hero-image-placeholder">🎸</div>
			</header>

			<section className="features">
				<h2>What You Can Do 🎯</h2>
				<div className="feature-grid">
					<div className="feature-card">
						<h4>🌍 Global Music Distribution</h4>
						<p>Distribute your music to 150+ platforms including Spotify, Apple Music, Amazon Music, YouTube Music, and more worldwide.</p>
					</div>
					<div className="feature-card">
						<h4>🎧 Stream Music</h4>
						<p>Upload tracks, share albums, and build your fanbase with our built-in streaming platform.</p>
					</div>
					<div className="feature-card">
						<h4>🎙️ Launch Podcasts</h4>
						<p>Host episodes, monetize content, and reach new audiences across podcast directories.</p>
					</div>
					<div className="feature-card">
						<h4>📻 24/7 Plamix Radio Streams</h4>
						<p>Create your own radio station with continuous streaming, accept song submissions, and build a loyal listener base around the clock.</p>
					</div>
					<div className="feature-card">
						<h4>🎮 Gaming Community Hub</h4>
						<p>Connect with gamers, join squads, find teammates, stream gameplay, and discover crossplay-compatible games across all platforms.</p>
					</div>
					<div className="feature-card">
						<h4>📹 Live Video Chat</h4>
						<p>Connect face-to-face with fans through built-in video chat on profiles. Real-time collaboration and direct fan interaction.</p>
					</div>
					<div className="feature-card">
						<h4>💰 Performance Rights & Royalties</h4>
						<p>Collect performance royalties from radio, streaming, and live venues through registered performance rights organizations and digital collection services.</p>
					</div>
					<div className="feature-card">
						<h4>🛍️ Sell Products & Merch</h4>
						<p>Create merchandise, sell digital goods, and get paid instantly with Stripe integration.</p>
					</div>
					<div className="feature-card">
						<h4>📊 Advanced Analytics</h4>
						<p>Monitor streams, revenue, demographics, gamer stats, and audience behavior across all platforms.</p>
					</div>
					<div className="feature-card">
						<h4>⚡ Fast Release Process</h4>
						<p>Get your music live on major platforms in 24-48 hours with our streamlined upload system.</p>
					</div>
					<div className="feature-card">
						<h4>🎥 Live Streaming & Gaming</h4>
						<p>Stream your gameplay, host live shows, and share your screen with squad members in real-time.</p>
					</div>
					<div className="feature-card">
						<h4>🤝 Squad Finder & Team Rooms</h4>
						<p>Find gaming teammates by skill level, create private squad rooms, and coordinate with your gaming community.</p>
					</div>
				</div>
			</section>

			{/* Music Distribution Section - REDESIGNED */}
			<section className="music-distribution">
				<h2>🎵 Worldwide Music Distribution</h2>
				<p>Get your music on 150+ major streaming platforms and digital stores worldwide</p>

				<div className="platforms-showcase">
					<div className="platform-row streaming">
						<h4>🎧 Major Streaming</h4>
						<div className="platform-badges">
							<span className="platform-badge">Spotify</span>
							<span className="platform-badge">Apple Music</span>
							<span className="platform-badge">Amazon Music</span>
							<span className="platform-badge">YouTube Music</span>
							<span className="platform-badge">Deezer</span>
							<span className="platform-badge">Tidal</span>
							<span className="platform-badge">Pandora</span>
							<span className="platform-badge">SoundCloud</span>
						</div>
					</div>

					<div className="platform-row stores">
						<h4>🏪 Digital Stores</h4>
						<div className="platform-badges">
							<span className="platform-badge">iTunes Store</span>
							<span className="platform-badge">Amazon MP3</span>
							<span className="platform-badge">Google Play</span>
							<span className="platform-badge">Beatport</span>
							<span className="platform-badge">7Digital</span>
							<span className="platform-badge">Qobuz</span>
							<span className="platform-badge">Bandcamp</span>
							<span className="platform-badge">Junodownload</span>
						</div>
					</div>

					<div className="platform-row radio">
						<h4>📻 Radio & Discovery</h4>
						<div className="platform-badges">
							<span className="platform-badge">iHeartRadio</span>
							<span className="platform-badge">SiriusXM</span>
							<span className="platform-badge">Shazam</span>
							<span className="platform-badge">Radio.com</span>
							<span className="platform-badge">TuneIn</span>
							<span className="platform-badge">Last.fm</span>
							<span className="platform-badge">Musixmatch</span>
							<span className="platform-badge">Audiomack</span>
						</div>
					</div>

					<div className="platform-row international">
						<h4>🌍 International</h4>
						<div className="platform-badges">
							<span className="platform-badge">NetEase (China)</span>
							<span className="platform-badge">QQ Music (China)</span>
							<span className="platform-badge">JioSaavn (India)</span>
							<span className="platform-badge">Anghami (MENA)</span>
							<span className="platform-badge">Boomplay (Africa)</span>
							<span className="platform-badge">Yandex (Russia)</span>
							<span className="platform-badge">KKBox (Asia)</span>
							<span className="platform-badge">Resso (SEA)</span>
						</div>
					</div>
				</div>

				<div className="distribution-cta">
					<p style={{ color: '#d1d5db', fontSize: '1rem', marginBottom: '1.5rem' }}>
						Start earning royalties from day one with our fast 24-48 hour distribution process
					</p>
					{!user && (
						<button onClick={() => window.location.href = '/signup'} className="btn btn-primary btn-lg">
							Start Distributing Music
						</button>
					)}
				</div>
			</section>

			{/* Value Proposition Section */}
			<section className="why-choose-streampirex">
				<h2>🚀 Why Creators Choose StreamPipeX</h2>
				<p>The only platform designed for complete creator independence</p>
				<div className="value-props-grid">
					<div className="value-prop-card">
						<div className="value-icon">👑</div>
						<h4>You Own Everything</h4>
						<p>Your content, audience data, and revenue streams belong to YOU. No algorithm anxiety or platform dependency.</p>
					</div>
					<div className="value-prop-card">
						<div className="value-icon">🎬</div>
						<h4>All-in-One Creator Suite</h4>
						<p>Music distribution, streaming, podcasts, gaming, and social features in one place. Stop juggling 12 different apps.</p>
					</div>
					<div className="value-prop-card">
						<div className="value-icon">📹</div>
						<h4>Real-Time Fan Connection</h4>
						<p>Built-in video chat, live collaboration, and direct fan interaction. Connect face-to-face with your audience.</p>
					</div>
					<div className="value-prop-card">
						<div className="value-icon">💰</div>
						<h4>Multiple Revenue Streams</h4>
						<p>Music royalties, subscriptions, donations, merchandise, and premium content all in one dashboard.</p>
					</div>
				</div>
			</section>

			<section className="gaming-social-features">
				<div className="feature-container">
					<div className="feature-section">
						<h3>🎮 Gaming Community Features</h3>
						<div className="feature-list">
							<div className="feature-item">
								<span className="feature-icon">🔍</span>
								<div>
									<strong>Squad Finder</strong>
									<p>Find teammates by game, skill level, and region</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🏠</span>
								<div>
									<strong>Team Rooms</strong>
									<p>Private spaces for your squad with voice chat and screen sharing</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🎥</span>
								<div>
									<strong>Live Game Streaming</strong>
									<p>Stream your gameplay and host live shows with real-time interaction</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🎯</span>
								<div>
									<strong>Crossplay Games</strong>
									<p>Discover games that support crossplay across all platforms</p>
								</div>
							</div>
						</div>
					</div>

					<div className="feature-section">
						<h3>📻 24/7 Plamix Radio</h3>
						<div className="feature-list">
							<div className="feature-item">
								<span className="feature-icon">📡</span>
								<div>
									<strong>Always-On Broadcasting</strong>
									<p>Your radio station streams 24/7 with continuous music</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🎵</span>
								<div>
									<strong>Song Submissions</strong>
									<p>Accept tracks from artists and curate your station's sound</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">👥</span>
								<div>
									<strong>Live Listener Count</strong>
									<p>See real-time listener engagement and build your audience</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">💰</span>
								<div>
									<strong>Monetization</strong>
									<p>Earn revenue through ads, subscriptions, and premium content</p>
								</div>
							</div>
						</div>
					</div>

					<div className="feature-section">
						<h3>📹 Creator Connection Tools</h3>
						<div className="feature-list">
							<div className="feature-item">
								<span className="feature-icon">🎥</span>
								<div>
									<strong>Profile Video Chat</strong>
									<p>Built-in video calls directly from user profiles</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">💬</span>
								<div>
									<strong>Real-Time Messaging</strong>
									<p>Instant messaging with fans and fellow creators</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🔗</span>
								<div>
									<strong>Cross-Platform Sharing</strong>
									<p>Share your StreamPipeX content across social networks</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">📊</span>
								<div>
									<strong>Audience Analytics</strong>
									<p>Deep insights into fan engagement and content performance</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Conditional rendering for bottom CTA - only show when NOT logged in */}
			{!user && (
				<section className="join-now text-center">
					<h2>Ready to Share Your Voice with the World?</h2>
					<p>Create, distribute, game, and grow your creative career on StreampireX.</p>
					<button onClick={() => window.location.href = '/signup'} className="btn btn-success btn-lg">Start Your Journey Today</button>
				</section>
			)}

			<footer className="footer">
				<p>© {new Date().getFullYear()} StreampireX. All rights reserved.</p>
			</footer>

			<style jsx>{`
				/* General layout */
				.streampirex-home {
					background: #0d1117;
					color: #ffffff;
					font-family: 'Segoe UI', sans-serif;
					min-height: 100vh;
					line-height: 1.6;
				}

				/* Hero Section */
				.hero {
					display: flex;
					flex-direction: column;
					align-items: center;
					text-align: center;
					padding: 4rem 2rem;
					background: linear-gradient(145deg, #1f2937, #111827);
					border-bottom: 2px solid #00ffc8;
				}

				.hero h1 {
					font-size: 2.8rem;
					color: #00ffc8;
					font-weight: bold;
				}

				.hero p {
					color: #d1d5db;
					font-size: 1.2rem;
					max-width: 700px;
					margin: 1rem auto;
				}

				.hero-image-placeholder {
					width: 270px;
					height: 270px;
					border-radius: 50%;
					box-shadow: 0 0 25px #00ffc8;
					margin-top: 2rem;
					background: linear-gradient(145deg, #1f2937, #374151);
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 4rem;
				}

				/* Call to Action Buttons */
				.cta-buttons button,
				.cta-buttons a {
					margin: 0.5rem;
					font-size: 1.1rem;
					padding: 0.75rem 1.5rem;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					transition: all 0.3s ease;
					text-decoration: none;
					display: inline-block;
				}

				.btn-primary {
					background: #00ffc8;
					color: #0d1117;
					font-weight: bold;
				}

				.btn-primary:hover {
					background: #00e6b3;
					transform: translateY(-2px);
				}

				.btn-outline-light {
					background: transparent;
					color: #ffffff;
					border: 2px solid #ffffff !important;
				}

				.btn-outline-light:hover {
					background: #ffffff;
					color: #0d1117;
					text-decoration: none;
				}

				.btn-success {
					background: #10b981;
					color: #ffffff;
					font-weight: bold;
				}

				.btn-success:hover {
					background: #059669;
					transform: translateY(-2px);
					text-decoration: none;
				}

				.btn-lg {
					font-size: 1.3rem;
					padding: 1rem 2rem;
				}

				/* Features Section */
				.features {
					padding: 4rem 2rem;
					background: #161b22;
				}

				.features h2 {
					text-align: center;
					margin-bottom: 2.5rem;
					color: #00ffc8;
					font-size: 2rem;
				}

				.feature-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
					gap: 1.5rem;
					max-width: 1400px;
					margin: 0 auto;
				}

				.feature-card {
					background: #1f2937;
					padding: 1.5rem;
					border-radius: 12px;
					box-shadow: 0 0 12px rgba(0, 255, 200, 0.1);
					transition: transform 0.2s ease, box-shadow 0.2s ease;
				}

				.feature-card:hover {
					transform: translateY(-5px);
					box-shadow: 0 0 20px rgba(0, 255, 200, 0.2);
				}

				.feature-card h4 {
					color: #00ffc8;
					margin-bottom: 0.5rem;
				}

				/* Music Distribution Section - REDESIGNED */
				.music-distribution {
					padding: 4rem 2rem;
					background: #0f172a;
					text-align: center;
				}

				.music-distribution h2 {
					color: #00ffc8;
					font-size: 2rem;
					margin-bottom: 1rem;
				}

				.music-distribution > p {
					color: #d1d5db;
					font-size: 1.1rem;
					margin-bottom: 3rem;
					max-width: 800px;
					margin-left: auto;
					margin-right: auto;
				}

				.platforms-showcase {
					max-width: 1400px;
					margin: 0 auto 3rem auto;
					display: flex;
					flex-direction: column;
					gap: 2rem;
				}

				.platform-row {
					background: #1f2937;
					border-radius: 12px;
					padding: 2rem;
					box-shadow: 0 0 12px rgba(0, 255, 200, 0.1);
				}

				.platform-row h4 {
					color: #00ffc8;
					font-size: 1.2rem;
					margin-bottom: 1.5rem;
					text-align: left;
				}

				.platform-badges {
					display: flex;
					flex-wrap: wrap;
					gap: 0.75rem;
					justify-content: flex-start;
				}

				.platform-badge {
					background: #374151;
					color: #d1d5db;
					padding: 0.5rem 1rem;
					border-radius: 20px;
					font-size: 0.9rem;
					font-weight: 500;
					transition: all 0.3s ease;
					border: 1px solid #4b5563;
				}

				.platform-badge:hover {
					background: #00ffc8;
					color: #0d1117;
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(0, 255, 200, 0.3);
				}

				.distribution-cta {
					text-align: center;
					margin-top: 2rem;
				}

				/* Why Choose StreamPipeX Section */
				.why-choose-streampirex {
					padding: 4rem 2rem;
					background: #161b22;
					text-align: center;
				}

				.why-choose-streampirex h2 {
					color: #00ffc8;
					font-size: 2rem;
					margin-bottom: 1rem;
				}

				.why-choose-streampirex > p {
					color: #d1d5db;
					font-size: 1.1rem;
					margin-bottom: 3rem;
					max-width: 700px;
					margin-left: auto;
					margin-right: auto;
				}

				.value-props-grid {
					display: grid;
					grid-template-columns: repeat(4, 1fr);  // FORCES 4 COLUMNS
					gap: 2rem;
					max-width: 1200px;
					margin: 0 auto;
				}

				.value-prop-card {
					background: #1f2937;
					padding: 2rem;
					border-radius: 12px;
					box-shadow: 0 0 12px rgba(0, 255, 200, 0.1);
					border-left: 4px solid #00ffc8;
					transition: transform 0.3s ease, box-shadow 0.3s ease;
				}

				.value-prop-card:hover {
					transform: translateY(-5px);
					box-shadow: 0 0 20px rgba(0, 255, 200, 0.2);
				}

				.value-icon {
					font-size: 2.5rem;
					margin-bottom: 1rem;
				}

				.value-prop-card h4 {
					color: #00ffc8;
					margin-bottom: 1rem;
					font-size: 1.2rem;
				}

				.value-prop-card p {
					color: #d1d5db;
					line-height: 1.6;
				}

				/* Gaming & Social Features Section */
				.gaming-social-features {
					padding: 4rem 2rem;
					background: #111827;
				}

				.feature-container {
					max-width: 1200px;
					margin: 0 auto;
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
					gap: 3rem;
				}

				.feature-section h3 {
					color: #00ffc8;
					font-size: 1.5rem;
					margin-bottom: 1.5rem;
					text-align: center;
				}

				.feature-list {
					display: flex;
					flex-direction: column;
					gap: 1rem;
				}

				.feature-item {
					display: flex;
					align-items: flex-start;
					gap: 1rem;
					background: #1f2937;
					padding: 1.2rem;
					border-radius: 10px;
					border-left: 4px solid #00ffc8;
				}

				.feature-icon {
					font-size: 1.5rem;
					flex-shrink: 0;
				}

				.feature-item strong {
					color: #00ffc8;
					display: block;
					margin-bottom: 0.3rem;
				}

				.feature-item p {
					color: #d1d5db;
					margin: 0;
					font-size: 0.9rem;
				}

				/* Join Now Section */
				.join-now {
					background: #0f172a;
					padding: 4rem 2rem;
					text-align: center;
				}

				.join-now h2 {
					color: #00ffc8;
					margin-bottom: 1rem;
					font-size: 2rem;
				}

				.join-now p {
					color: #d1d5db;
					font-size: 1.1rem;
					margin-bottom: 2rem;
				}

				/* Footer */
				.footer {
					text-align: center;
					padding: 1rem;
					background: #0d1117;
					font-size: 0.9rem;
					color: #6b7280;
					border-top: 1px solid #1f2937;
				}

				/* Responsive Design */
				@media (max-width: 768px) {
					.hero {
						padding: 2rem 1rem;
					}
					
					.hero h1 {
						font-size: 2.2rem;
					}
					
					.hero-image-placeholder {
						width: 200px;
						height: 200px;
						font-size: 3rem;
					}
					
					.feature-grid {
						grid-template-columns: 1fr;
					}
					
					.platforms-showcase {
						padding: 0 1rem;
					}
					
					.platform-row {
						padding: 1.5rem;
					}
					
					.platform-row h4 {
						text-align: center;
						margin-bottom: 1rem;
					}
					
					.platform-badges {
						justify-content: center;
						gap: 0.5rem;
					}
					
					.platform-badge {
						font-size: 0.8rem;
						padding: 0.4rem 0.8rem;
					}
					
					.value-props-grid {
						grid-template-columns: 1fr;
						gap: 1.5rem;
						padding: 0 1rem;
					}
					
					.value-prop-card {
						padding: 1.5rem;
					}
					
					.why-choose-streampirex h2 {
						font-size: 1.8rem;
					}

					.feature-container {
						grid-template-columns: 1fr;
					}
				}
			`}</style>
		</div>
	);
};

export default Home;