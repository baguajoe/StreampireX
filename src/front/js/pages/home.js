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
					<p className="hero-tagline">The AI-Powered All-In-One Creator Platform</p>
					<p>Replace 15+ tools with one platform. AI mastering, AI radio DJ, music distribution, video editing, live streaming, podcasts, gaming communities, and monetization — keep 90% of your earnings.</p>

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
						<span className="stat-number">AI</span>
						<span className="stat-label">Powered Mastering</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">24/7</span>
						<span className="stat-label">AI Radio DJ</span>
					</div>
				</div>

				<div className="hero-image-placeholder">🎸</div>
			</header>

			{/* ================================================================
			    AI FEATURES SECTION — NEW
			    ================================================================ */}
			<section className="ai-features-section">
				<h2>🤖 AI-Powered Creator Tools</h2>
				<p className="section-subtitle">Professional results. Zero experience needed. Powered by AI.</p>

				<div className="ai-features-grid">
					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎛️</div>
						<div className="ai-badge">AI</div>
						<h4>AI Mastering</h4>
						<p>Upload your track. Our AI analyzes the BPM, key, frequency balance, and mood — then automatically masters it with the perfect preset. 50 genre profiles from Boom Bap to Reggaeton. Studio-quality results in seconds.</p>
						<div className="ai-feature-stats">
							<span>50 Genre Profiles</span>
							<span>Auto-Detect</span>
							<span>Instant Results</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">📻</div>
						<div className="ai-badge">AI</div>
						<h4>AI Radio DJ</h4>
						<p>Your radio station runs 24/7 with an AI DJ that introduces songs, gives shoutouts, reads listener requests, and keeps the vibe going — even while you sleep. Choose from 7 DJ personas or clone your own voice.</p>
						<div className="ai-feature-stats">
							<span>7 DJ Personas</span>
							<span>Voice Cloning</span>
							<span>24/7 Automation</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎤</div>
						<div className="ai-badge">PRO</div>
						<h4>AI Voice Clone</h4>
						<p>Record your voice once. Our AI clones it. Now your radio station sounds like YOU around the clock — talking between songs, giving shoutouts, running your station while you focus on creating.</p>
						<div className="ai-feature-stats">
							<span>Your Voice</span>
							<span>1 Min Sample</span>
							<span>Unlimited Use</span>
						</div>
					</div>
				</div>

				<div className="ai-coming-soon">
					<h4>🚀 More AI Features Coming Soon</h4>
					<div className="coming-soon-items">
						<span className="coming-soon-tag">AI Video Editing</span>
						<span className="coming-soon-tag">AI Thumbnail Generator</span>
						<span className="coming-soon-tag">AI Podcast Transcription</span>
						<span className="coming-soon-tag">AI Social Post Writer</span>
						<span className="coming-soon-tag">AI Analytics Insights</span>
					</div>
				</div>
			</section>

			{/* Problem/Solution Section */}
			<section className="problem-solution">
				<div className="problem">
					<h3>😫 The Creator Problem</h3>
					<p>Juggling 15+ apps for distribution, editing, streaming, analytics, and payments. Losing 30-50% of earnings to platform fees. No ownership of your audience. Paying $100+/month across separate tools.</p>
				</div>
				<div className="solution">
					<h3>✨ The StreamPireX Solution</h3>
					<p>One AI-powered platform for everything. Keep 90% of your earnings. Own your audience data. Professional tools — including AI mastering and an AI radio DJ — without the professional price tag. Starting at $0.</p>
				</div>
			</section>

			{/* Core Features Grid - 20 Features in 5 Rows */}
			<section className="features">
				<h2>🎯 Everything You Need to Create & Earn</h2>
				<p className="section-subtitle">Professional creator tools, simplified</p>
				
				<div className="feature-grid">
					{/* Row 1: Content Creation */}
					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>Video Editor</h4>
						<p>Professional video editing right in your browser. Multi-track timeline, effects, transitions, and up to 8K export.</p>
						<span className="feature-tag">Browser-Based</span>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">🎛️</div>
						<h4>AI Mastering</h4>
						<p>Upload a track, our AI detects the genre and masters it automatically. 50 reference profiles. Studio quality in seconds.</p>
						<span className="feature-tag ai-tag">AI-Powered</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📱</div>
						<h4>Short-Form Clips</h4>
						<p>Create TikTok, Reels, and Shorts directly from your content. Auto-resize, captions, and trending templates.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📤</div>
						<h4>Cross-Platform Posting</h4>
						<p>Post to YouTube, Instagram, TikTok, Twitter, and more with one click. Schedule posts and track performance.</p>
					</div>

					{/* Row 2: Distribution & Streaming */}
					<div className="feature-card highlight">
						<div className="feature-icon">🎵</div>
						<h4>Music Distribution</h4>
						<p>Get your music on Spotify, Apple Music, Tidal, Amazon, and 150+ platforms. No waiting weeks for approval.</p>
						<span className="feature-tag">24-48 Hours</span>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🔴</div>
						<h4>Live Streaming</h4>
						<p>Go live with OBS integration, screen sharing, and real-time chat. Stream gameplay, performances, or connect with fans.</p>
					</div>
					
					<div className="feature-card highlight">
						<div className="feature-icon">📻</div>
						<h4>24/7 AI Radio Stations</h4>
						<p>Create always-on radio stations with an AI DJ that talks between songs, gives shoutouts, and keeps listeners engaged.</p>
						<span className="feature-tag ai-tag">AI-Powered</span>
					</div>

					{/* Row 3: Audio & Gaming */}
					<div className="feature-card">
						<div className="feature-icon">🎙️</div>
						<h4>Podcast Hosting</h4>
						<p>Host episodes, distribute to directories, track analytics. Built-in recording tools and RSS feed generation.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎮</div>
						<h4>Gaming Hub</h4>
						<p>Squad finder, team rooms, voice chat, and screen sharing. Find teammates by game, skill level, and region.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🖥️</div>
						<h4>Screen Share & Recording</h4>
						<p>Share your screen in real-time with squad members. Record sessions and save highlights automatically.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🎤</div>
						<h4>Voice Chat Rooms</h4>
						<p>Crystal-clear voice communication with your team. Push-to-talk, noise suppression, and private channels.</p>
					</div>

					{/* Row 4: Social & Community */}
					<div className="feature-card">
						<div className="feature-icon">📨</div>
						<h4>Game Invites</h4>
						<p>Send and receive game invites directly in the platform. Coordinate matches without leaving StreamPireX.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">👥</div>
						<h4>Social Network</h4>
						<p>Follow creators, like content, comment, and share. Build your audience with familiar social features.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">💬</div>
						<h4>Direct Messaging</h4>
						<p>Real-time chat with fans and collaborators. Group chats, media sharing, and message requests.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">🔗</div>
						<h4>Cross-Platform Sharing</h4>
						<p>Share your StreamPireX content across all social networks. One-click posting to Instagram, Twitter, TikTok, and more.</p>
					</div>

					{/* Row 5: Monetization & Analytics */}
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
						<p>Create merchandise, sell digital goods, and get paid instantly with Stripe integration.</p>
					</div>
					
					<div className="feature-card">
						<div className="feature-icon">📊</div>
						<h4>Creator Analytics</h4>
						<p>Track plays, views, revenue, and audience growth. Detailed insights to help you make smarter decisions.</p>
					</div>
				</div>
			</section>

			{/* Detailed Feature Sections */}
			<section className="feature-details">
				<div className="feature-container">
					{/* Music Distribution Details */}
					<div className="feature-detail-card">
						<h3>🎵 Music Distribution</h3>
						<div className="feature-detail-content">
							<div className="feature-item">
								<span className="feature-icon">🌍</span>
								<div>
									<strong>150+ Platforms</strong>
									<p>Spotify, Apple Music, Tidal, Amazon, and more</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">💰</span>
								<div>
									<strong>90% Royalties</strong>
									<p>Keep what you earn, transparent payouts</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">📊</span>
								<div>
									<strong>Real-Time Analytics</strong>
									<p>Track streams, downloads, and revenue across platforms</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">⚡</span>
								<div>
									<strong>Fast Distribution</strong>
									<p>Your music live on platforms in 24-48 hours</p>
								</div>
							</div>
						</div>
					</div>

					{/* Video Editing Details */}
					<div className="feature-detail-card">
						<h3>🎬 Video Editing</h3>
						<div className="feature-detail-content">
							<div className="feature-item">
								<span className="feature-icon">🖱️</span>
								<div>
									<strong>Browser-Based Editor</strong>
									<p>No downloads, edit anywhere on any device</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🎞️</span>
								<div>
									<strong>Multi-Track Timeline</strong>
									<p>Up to 50 tracks with professional tools</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">✨</span>
								<div>
									<strong>Effects & Transitions</strong>
									<p>Professional effects library and smooth transitions</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">📤</span>
								<div>
									<strong>Export Up to 8K</strong>
									<p>Industry-leading quality, MP4, MOV, WebM, and more</p>
								</div>
							</div>
						</div>
					</div>

					{/* Gaming Features */}
					<div className="feature-detail-card">
						<h3>🎮 Gaming Features</h3>
						<div className="feature-detail-content">
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
									<p>Private voice + video rooms for your squad</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">🖥️</span>
								<div>
									<strong>Screen Sharing</strong>
									<p>Share gameplay in real-time with teammates</p>
								</div>
							</div>
							<div className="feature-item">
								<span className="feature-icon">📊</span>
								<div>
									<strong>Gaming Analytics</strong>
									<p>Track stats, performance, and community growth</p>
								</div>
							</div>
						</div>
					</div>

					{/* Social & Community */}
					<div className="feature-detail-card">
						<h3>👥 Social & Community</h3>
						<div className="feature-detail-content">
							<div className="feature-item">
								<span className="feature-icon">👤</span>
								<div>
									<strong>Creator Profiles</strong>
									<p>Showcase your work with customizable user profiles</p>
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
						<p>Distribute worldwide, AI master your tracks, collect royalties, sell merch, go live</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎬</span>
						<h4>Video Creators</h4>
						<p>Edit, publish, monetize, and grow your audience</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎙️</span>
						<h4>Podcasters</h4>
						<p>Host, distribute, analyze, and monetize your podcast</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎮</span>
						<h4>Gamers</h4>
						<p>Find squads, stream gameplay, build gaming communities</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">📻</span>
						<h4>Radio Hosts</h4>
						<p>Run 24/7 stations with AI DJ, accept submissions, build audiences</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎨</span>
						<h4>Digital Artists</h4>
						<p>Sell digital products, presets, templates, and services</p>
					</div>
				</div>
			</section>

			{/* Platform Comparison */}
			<section className="comparison">
				<h2>💸 Stop Paying for 15 Separate Tools</h2>
				<p className="section-subtitle">Here's what creators spend monthly on other platforms</p>
				<div className="comparison-grid">
					<div className="comparison-card other-platforms">
						<h3>Without StreamPireX</h3>
						<ul className="comparison-list">
							<li><span>DistroKid</span><span>$22.99/yr</span></li>
							<li><span>LANDR Mastering</span><span>$14.99/mo</span></li>
							<li><span>Streamyard</span><span>$20/mo</span></li>
							<li><span>Riverside (podcast)</span><span>$24/mo</span></li>
							<li><span>Canva Pro</span><span>$12.99/mo</span></li>
							<li><span>Buffer (scheduling)</span><span>$6/mo</span></li>
							<li><span>Discord Nitro</span><span>$9.99/mo</span></li>
							<li className="total"><span>Total</span><span>$90+/mo</span></li>
						</ul>
					</div>
					<div className="comparison-card streampirex-card">
						<h3>With StreamPireX</h3>
						<ul className="comparison-list">
							<li><span>AI Mastering</span><span>✓ Included</span></li>
							<li><span>AI Radio DJ</span><span>✓ Included</span></li>
							<li><span>Music Distribution</span><span>✓ Included</span></li>
							<li><span>Video Editing</span><span>✓ Included</span></li>
							<li><span>Live Streaming</span><span>✓ Included</span></li>
							<li><span>Podcasts</span><span>✓ Included</span></li>
							<li><span>Social + Gaming</span><span>✓ Included</span></li>
							<li className="total"><span>All-in-One</span><span>$10.99/mo</span></li>
						</ul>
					</div>
				</div>
			</section>

			{/* Earnings Comparison */}
			<section className="earnings">
				<h2>💰 Keep More of What You Earn</h2>
				<div className="earnings-bars">
					<div className="earnings-row">
						<span className="platform-name">YouTube</span>
						<div className="bar-container">
							<div className="bar youtube-bar" style={{ width: '45%' }}>45%</div>
						</div>
					</div>
					<div className="earnings-row">
						<span className="platform-name">Twitch</span>
						<div className="bar-container">
							<div className="bar twitch-bar" style={{ width: '50%' }}>50%</div>
						</div>
					</div>
					<div className="earnings-row">
						<span className="platform-name">Spotify</span>
						<div className="bar-container">
							<div className="bar spotify-bar" style={{ width: '30%' }}>~30%</div>
						</div>
					</div>
					<div className="earnings-row highlight-row">
						<span className="platform-name">StreamPireX</span>
						<div className="bar-container">
							<div className="bar spx-bar" style={{ width: '90%' }}>90%</div>
						</div>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="final-cta">
				<h2>Ready to Create Without Limits?</h2>
				<p>Join StreamPireX and get AI-powered tools, music distribution, video editing, live streaming, and more — all in one platform.</p>
				<div className="cta-buttons">
					<Link to="/signup" className="btn btn-primary btn-lg">Start Creating for Free</Link>
					<Link to="/pricing" className="btn btn-outline-light btn-lg">View Pricing</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="home-footer">
				<div className="footer-content">
					<p>© {new Date().getFullYear()} Eye Forge Studios LLC. StreamPireX — The AI-Powered Creator Platform.</p>
					<div className="footer-links">
						<Link to="/terms">Terms</Link>
						<Link to="/privacy">Privacy</Link>
						<Link to="/pricing">Pricing</Link>
						<Link to="/contact">Contact</Link>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Home;