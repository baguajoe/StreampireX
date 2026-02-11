import React, { useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from 'react-router-dom';
import "../../styles/home.css";

const Home = () => {
	const { store } = useContext(Context);
	const user = store.user;

	return (
		<div className="streampirex-home">
			{/* Hero Section */}
			<header className="hero">
				<div className="hero-content">
					<h1>🔥 Welcome to StreamPireX</h1>
					<p>The all-in-one creator platform replacing 15+ tools. Music distribution, video editing, live streaming, podcasts, gaming communities, and monetization — all in one place.</p>

					{!user ? (
						<div className="cta-buttons">
							<Link to="/signup" className="btn btn-primary">Get Started Free</Link>
							<Link to="/login" className="btn btn-outline-light">Log In</Link>
						</div>
					) : (
						<div className="cta-buttons">
							<h3 className="welcome-text">
								Welcome back, {user.username || user.display_name}! 🎉
							</h3>
							<Link to="/creator-dashboard" className="btn btn-primary">Go to Dashboard</Link>
							<Link to="/home-feed" className="btn btn-outline-light">View Feed</Link>
						</div>
					)}
				</div>

				<div className="hero-stats">
					<div className="stat-item">
						<span className="stat-number">150+</span>
						<span className="stat-label">Distribution Platforms</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">90%</span>
						<span className="stat-label">Creator Revenue Share</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">24/7</span>
						<span className="stat-label">Radio Streaming</span>
					</div>
				</div>

				<div className="hero-image-placeholder">🎸</div>
			</header>

			{/* Problem/Solution Section */}
			<section className="problem-solution">
				<div className="problem">
					<h3>😫 The Creator Problem</h3>
					<p>Juggling 15+ apps for distribution, editing, streaming, analytics, and payments. Losing 30-50% of earnings to platform fees. No ownership of your audience.</p>
				</div>
				<div className="solution">
					<h3>✨ The StreamPireX Solution</h3>
					<p>One platform for everything. Keep 90% of your earnings. Own your audience data. Professional tools without the professional price tag.</p>
				</div>
			</section>

			{/* Core Features Grid - 20 Features in 5 Rows */}
			<section className="features">
				<h2>🎯 Everything You Need to Create & Earn</h2>
				<p className="section-subtitle">Professional creator tools, simplified</p>
				
				<div className="feature-grid">
					{/* Row 1: Hook — Free/Social features that attract everyone */}
					<div className="feature-card highlight">
						<div className="feature-icon">👥</div>
						<h4>Social Network</h4>
						<p>Follow creators, like content, comment, and share. Build your audience with familiar social features.</p>
						<span className="feature-tag">Free</span>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">💬</div>
						<h4>Direct Messaging</h4>
						<p>Real-time chat with fans and collaborators. Group chats, media sharing, and message requests.</p>
						<span className="feature-tag">Free</span>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">📱</div>
						<h4>Vertical Stories</h4>
						<p>Share 24-hour stories with your followers. Add music, captions, and choose comment modes. Instagram-style engagement, StreamPireX control.</p>
						<span className="feature-tag new">NEW</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎥</div>
						<h4>StreamClips</h4>
						<p>Create permanent highlight clips from your content. Build a portfolio that attracts new followers and showcases your best work.</p>
					</div>

					{/* Row 2: Core Creator Tools — What makes them stay */}
					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>Video Editor</h4>
						<p>Professional video editing right in your browser. Trim, cut, merge, add effects, transitions, text overlays, and export in multiple formats.</p>
						<span className="feature-tag">Built-in</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎧</div>
						<h4>Music Studio</h4>
						<p>Upload tracks, create albums, manage releases. Built-in audio processing and waveform visualization.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🔴</div>
						<h4>Live Streaming</h4>
						<p>Go live with OBS integration, screen sharing, and real-time chat. Stream gameplay, performances, or connect with fans.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎙️</div>
						<h4>Podcast Hosting</h4>
						<p>Host episodes, distribute to directories, track analytics. Built-in recording tools and RSS feed generation.</p>
					</div>

					{/* Row 3: Distribution & Reach — Why they upgrade */}
					<div className="feature-card highlight">
						<div className="feature-icon">🌍</div>
						<h4>Global Distribution</h4>
						<p>Get your music on Spotify, Apple Music, Amazon, YouTube Music, Tidal, and 150+ platforms worldwide.</p>
						<span className="feature-tag">150+ Platforms</span>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">⚡</div>
						<h4>Fast Release Process</h4>
						<p>Get your music live on major platforms in 24-48 hours with our streamlined upload system. No waiting weeks for approval.</p>
						<span className="feature-tag">24-48 Hours</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📻</div>
						<h4>24/7 Radio Stations</h4>
						<p>Create always-on radio stations. Accept song submissions, build listener communities, and monetize your broadcasts.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🔗</div>
						<h4>Cross-Platform Sharing</h4>
						<p>Share your StreamPireX content across all social networks. One-click posting to Instagram, Twitter, TikTok, and more.</p>
					</div>

					{/* Row 4: Gaming & Collaboration */}
					<div className="feature-card">
						<div className="feature-icon">🎮</div>
						<h4>Gaming Hub</h4>
						<p>Squad finder, team rooms, voice chat, and screen sharing. Find teammates by game, skill level, and region.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎤</div>
						<h4>Voice Chat Rooms</h4>
						<p>Crystal-clear voice communication with your team. Push-to-talk, noise suppression, and private channels.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🖥️</div>
						<h4>Screen Share & Recording</h4>
						<p>Share your screen in real-time with squad members. Record sessions and save highlights automatically.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📨</div>
						<h4>Game Invites</h4>
						<p>Send and receive game invites directly in the platform. Coordinate matches without leaving StreamPireX.</p>
					</div>

					{/* Row 5: Monetization & Analytics — The upsell */}
					<div className="feature-card highlight">
						<div className="feature-icon">💰</div>
						<h4>Creator Marketplace</h4>
						<p>Sell merch, digital products, beats, presets, and services. Integrated payments with 90% revenue share.</p>
						<span className="feature-tag">90% Earnings</span>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">🎵</div>
						<h4>Performance Royalties</h4>
						<p>Collect royalties when your music is played on radio, streaming, TV, and live venues through registered PROs and digital collection services.</p>
						<span className="feature-tag">PRO Collection</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🛍️</div>
						<h4>Sell Products & Merch</h4>
						<p>Create merchandise, sell digital goods, and get paid instantly with Stripe integration. No inventory needed with print-on-demand.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📊</div>
						<h4>Analytics Dashboard</h4>
						<p>Track streams, revenue, demographics, and engagement across all your content in one unified dashboard.</p>
					</div>
				</div>
			</section>

			{/* Music Distribution Showcase */}
			<section className="music-distribution">
				<h2>🎵 Worldwide Music Distribution</h2>
				<p>Get your music on 150+ platforms in 24-48 hours</p>

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
						<Link to="/signup" className="btn btn-primary btn-lg">
							Start Distributing Music
						</Link>
					)}
				</div>
			</section>

			{/* Comparison Section */}
			<section className="comparison">
				<h2>💸 Stop Paying for 15 Different Tools</h2>
				<p className="section-subtitle">StreamPireX replaces your entire creator toolkit</p>
				
				<div className="comparison-grid">
					<div className="comparison-card old">
						<h4>❌ Without StreamPireX</h4>
						<ul>
							<li>DistroKid/TuneCore — $20-50/year</li>
							<li>Adobe Premiere — $23/month</li>
							<li>Canva Pro — $13/month</li>
							<li>Spotify for Artists — Free but limited</li>
							<li>Discord Nitro — $10/month</li>
							<li>Streamlabs — $19/month</li>
							<li>Patreon — 8-12% cut</li>
							<li>Linktree Pro — $6/month</li>
							<li>Mailchimp — $13/month</li>
							<li>Google Analytics — Complex setup</li>
						</ul>
						<div className="comparison-total">$200-500/month + 30-50% platform cuts</div>
					</div>
					
					<div className="comparison-card new">
						<h4>✅ With StreamPireX</h4>
						<ul>
							<li>✓ Music distribution to 150+ platforms</li>
							<li>✓ Built-in video editor</li>
							<li>✓ Stories & StreamClips</li>
							<li>✓ Live streaming with OBS</li>
							<li>✓ Gaming hub & voice chat</li>
							<li>✓ Podcast hosting</li>
							<li>✓ Creator marketplace</li>
							<li>✓ Performance royalty collection</li>
							<li>✓ Unified analytics</li>
							<li>✓ 90% revenue share</li>
						</ul>
						<div className="comparison-total">Starting at $9.99/month — Keep 90%</div>
					</div>
				</div>
			</section>

			{/* Why Choose StreamPireX Section */}
			<section className="why-choose-streampirex">
				<h2>🚀 Why Creators Choose StreamPireX</h2>
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

			{/* Gaming & Social Features Section */}
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
									<p>Share your StreamPireX content across social networks</p>
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

			{/* Creator Types Section */}
			<section className="creator-types">
				<h2>🎨 Built for Every Creator</h2>
				<div className="creator-grid">
					<div className="creator-card">
						<span className="creator-emoji">🎤</span>
						<h4>Musicians</h4>
						<p>Distribute worldwide, collect royalties, sell merch, go live</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎬</span>
						<h4>Video Creators</h4>
						<p>Edit, publish, monetize, and grow your audience</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎙️</span>
						<h4>Podcasters</h4>
						<p>Host, distribute, analyze, and monetize episodes</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎮</span>
						<h4>Gamers</h4>
						<p>Stream, find squads, voice chat, share gameplay</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">📻</span>
						<h4>Radio DJs</h4>
						<p>24/7 stations, song submissions, live mixing</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">💼</span>
						<h4>Influencers</h4>
						<p>Stories, social features, brand partnerships</p>
					</div>
				</div>
			</section>

			{/* Final CTA - only show when NOT logged in */}
			{!user && (
				<section className="final-cta">
					<h2>Ready to Own Your Creative Career?</h2>
					<p>Join thousands of creators who've switched to StreamPireX</p>
					<div className="cta-buttons">
						<Link to="/signup" className="btn btn-primary btn-lg">Start Free Today</Link>
						<Link to="/pricing" className="btn btn-outline-light btn-lg">View Pricing</Link>
					</div>
					<p className="cta-note">No credit card required • Free tier available • Cancel anytime</p>
				</section>
			)}

			{/* Footer */}
			<footer className="footer">
				<div className="footer-links">
					<Link to="/pricing">Pricing</Link>
					<Link to="/about">About</Link>
					<Link to="/support">Support</Link>
					<Link to="/terms">Terms</Link>
					<Link to="/privacy">Privacy</Link>
				</div>
				<p>© {new Date().getFullYear()} StreamPireX by Eye Forge Studios LLC. All rights reserved.</p>
			</footer>
		</div>
	);
};

export default Home;