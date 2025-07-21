import React, { useContext } from "react";

const Home = () => {
	// Mock context for artifact environment
	const store = {};
	const actions = {};

	return (
		<div className="streampirex-home">
			<header className="hero">
				<div className="hero-content">
					<h1>🔥 Welcome to StreampireX</h1>
					<p>The ultimate creator platform for music distribution, streaming, podcasts, radio, gaming communities, and social monetization.</p>
					<div className="cta-buttons">
						<button onClick={() => window.location.href = '/signup'} className="btn btn-primary">Get Started</button>
						<button onClick={() => window.location.href = '/login'} className="btn btn-outline-light">Log In</button>
					</div>
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
						<h4>🌐 Social Media Integration</h4>
						<p>Share your content across TikTok, Instagram, Facebook, and more. Build your social presence and engage with fans everywhere.</p>
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

			<section className="distribution-platforms">
				<h2>🚀 Distribute & Connect Everywhere</h2>
				<p>Your content will be available on all major streaming platforms, social networks, and gaming communities</p>
				<div className="platforms-grid">
					<div className="platform-category">
						<h4>🎵 Music Streaming</h4>
						<ul>
							<li>Spotify</li>
							<li>Apple Music</li>
							<li>Amazon Music</li>
							<li>YouTube Music</li>
							<li>Deezer</li>
							<li>Tidal</li>
						</ul>
					</div>
					<div className="platform-category">
						<h4>🌐 Social & Video</h4>
						<ul>
							<li>TikTok</li>
							<li>Instagram</li>
							<li>Facebook</li>
							<li>YouTube Content ID</li>
							<li>Snapchat</li>
							<li>Twitter/X</li>
						</ul>
					</div>
					<div className="platform-category">
						<h4>🎮 Gaming Platforms</h4>
						<ul>
							<li>Steam</li>
							<li>PlayStation Network</li>
							<li>Xbox Live</li>
							<li>Nintendo Switch</li>
							<li>Epic Games</li>
							<li>Discord Integration</li>
						</ul>
					</div>
					<div className="platform-category">
						<h4>📡 Radio & Streaming</h4>
						<ul>
							<li>Plamix 24/7 Radio</li>
							<li>SiriusXM</li>
							<li>Pandora</li>
							<li>iHeartRadio</li>
							<li>Shazam</li>
							<li>SoundCloud</li>
						</ul>
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
									<p>Stream your gameplay to Twitch, YouTube, and more</p>
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
						<h3>🌐 Social Media Power</h3>
						<div className="feature-list">
							<div className="feature-item">
								<span className="feature-icon">📱</span>
								<div>
									<strong>Multi-Platform Sharing</strong>
									<p>Post your content across all social networks simultaneously</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">📈</span>
								<div>
									<strong>Viral Content Tools</strong>
									<p>Optimize your posts for maximum engagement and reach</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">💬</span>
								<div>
									<strong>Community Engagement</strong>
									<p>Interact with fans, respond to comments, and build relationships</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🎯</span>
								<div>
									<strong>Targeted Promotion</strong>
									<p>Reach the right audience with smart targeting and analytics</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="join-now text-center">
				<h2>Ready to Share Your Voice with the World?</h2>
				<p>Create, distribute, game, and grow your creative career on StreampireX.</p>
				<button onClick={() => window.location.href = '/signup'} className="btn btn-success btn-lg">Start Your Journey Today</button>
			</section>

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
				.cta-buttons button {
					margin: 0.5rem;
					font-size: 1.1rem;
					padding: 0.75rem 1.5rem;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					transition: all 0.3s ease;
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
				}

				.btn-success {
					background: #10b981;
					color: #ffffff;
					font-weight: bold;
				}

				.btn-success:hover {
					background: #059669;
					transform: translateY(-2px);
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

				/* Distribution Platforms Section */
				.distribution-platforms {
					padding: 4rem 2rem;
					background: #0f172a;
					text-align: center;
				}

				.distribution-platforms h2 {
					color: #00ffc8;
					font-size: 2rem;
					margin-bottom: 1rem;
				}

				.distribution-platforms > p {
					color: #d1d5db;
					font-size: 1.1rem;
					margin-bottom: 3rem;
					max-width: 700px;
					margin-left: auto;
					margin-right: auto;
				}

				.platforms-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
					gap: 2rem;
					max-width: 1200px;
					margin: 0 auto;
				}

				.platform-category {
					background: #1f2937;
					padding: 2rem;
					border-radius: 12px;
					box-shadow: 0 0 12px rgba(0, 255, 200, 0.1);
				}

				.platform-category h4 {
					color: #00ffc8;
					margin-bottom: 1rem;
					font-size: 1.2rem;
				}

				.platform-category ul {
					list-style: none;
					padding: 0;
					margin: 0;
				}

				.platform-category li {
					color: #d1d5db;
					padding: 0.4rem 0;
					border-bottom: 1px solid #374151;
				}

				.platform-category li:last-child {
					border-bottom: none;
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
					
					.platforms-grid {
						grid-template-columns: 1fr;
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