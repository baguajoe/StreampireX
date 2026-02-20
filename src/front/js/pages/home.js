import React, { useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
import "../../styles/home.css";

const Home = () => {
	const { store } = useContext(Context);
	const user = store.user;

	return (
		<div className="streampirex-home">
			{/* ================================================================
			    HERO
			    ================================================================ */}
			<header className="hero">
				<div className="hero-content">
					<h1>🔥 Welcome to StreamPireX</h1>
					<p className="hero-tagline">The AI-Powered All-In-One Creator Platform</p>
					<p>
						Replace 15+ tools with one platform. AI mastering, AI mix assistant, recording studio,
						music distribution, video editing, live streaming, podcasts, gaming communities, and
						monetization — keep 90% of your earnings.
					</p>

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
						<span className="stat-label">Powered Studio</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">24/7</span>
						<span className="stat-label">AI Radio DJ</span>
					</div>
				</div>

				<div className="hero-image-placeholder">🎸</div>
			</header>

			{/* ================================================================
			    AI FEATURES
			    ================================================================ */}
			<section className="ai-features-section">
				<h2>🤖 AI-Powered Creator Tools</h2>
				<p className="section-subtitle">Professional results. Zero experience needed. Powered by AI.</p>

				<div className="ai-features-grid">
					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎚️</div>
						<div className="ai-badge">NEW</div>
						<h4>Recording Studio</h4>
						<p>
							A full multi-track DAW in your browser. Record, import, mix, and arrange with
							pro effects — EQ, compression, reverb, delay, distortion, and filters on every track.
							Up to 32 tracks on Pro.
						</p>
						<div className="ai-feature-stats">
							<span>Multi-Track DAW</span>
							<span>Pro Effects</span>
							<span>Arrange View</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🤖</div>
						<div className="ai-badge">AI</div>
						<h4>AI Mix Assistant</h4>
						<p>
							One button: AI analyzes every track — levels, panning, EQ conflicts, compression,
							and clipping. Get per-track suggestions with one-click apply. Includes genre profiles.
						</p>
						<div className="ai-feature-stats">
							<span>Auto-Level</span>
							<span>EQ Conflicts</span>
							<span>1-Click Fix</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎛️</div>
						<div className="ai-badge">AI</div>
						<h4>AI Mastering</h4>
						<p>
							Upload your track. Our AI analyzes BPM, key, frequency balance, and mood — then
							masters it with the perfect preset. 50 genre profiles from Boom Bap to Reggaeton.
						</p>
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
						<p>
							Run a 24/7 radio station with an AI DJ that introduces songs, gives shoutouts,
							reads listener requests, and keeps the vibe going — even while you sleep.
						</p>
						<div className="ai-feature-stats">
							<span>7 DJ Personas</span>
							<span>Listener Requests</span>
							<span>24/7 Automation</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎤</div>
						<div className="ai-badge">PRO</div>
						<h4>AI Voice Clone</h4>
						<p>
							Record your voice once, clone it, and power your station with your own sound —
							talking between songs, announcing drops, and running your station while you create.
						</p>
						<div className="ai-feature-stats">
							<span>Your Voice</span>
							<span>1 Min Sample</span>
							<span>Unlimited Use</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎵</div>
						<div className="ai-badge">AI</div>
						<h4>Smart Distribution</h4>
						<p>
							Distribute to 150+ platforms including Spotify, Apple Music, Amazon, TikTok, and more.
							AI-optimized metadata, auto-tagging, and release scheduling to maximize reach.
						</p>
						<div className="ai-feature-stats">
							<span>150+ Platforms</span>
							<span>Auto-Tags</span>
							<span>90% Revenue</span>
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

			{/* ================================================================
			    PROBLEM / SOLUTION
			    ================================================================ */}
			<section className="problem-solution">
				<div className="problem">
					<h3>😫 The Creator Problem</h3>
					<p>
						Juggling 15+ apps for distribution, editing, streaming, analytics, and payments.
						Losing 30–50% of earnings to platform fees. No ownership of your audience.
						Paying $100+/month across separate tools. No simple way to mix or master without
						expensive software.
					</p>
				</div>
				<div className="solution">
					<h3>✨ The StreamPireX Solution</h3>
					<p>
						One AI-powered platform for everything. Record, mix, and master with AI help.
						Distribute to 150+ platforms. Stream live. Run 24/7 radio with an AI DJ.
						Edit video. Build gaming communities. Keep 90% of your earnings.
					</p>
				</div>
			</section>

			{/* ================================================================
			    CORE FEATURES GRID (merged + expanded)
			    ================================================================ */}
			<section className="features">
				<h2>🎯 Everything You Need to Create & Earn</h2>
				<p className="section-subtitle">Professional creator tools, simplified</p>

				<div className="feature-grid">
					{/* Content Creation */}
					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>Video Editor</h4>
						<p>Professional browser editor: multi-track timeline, effects, transitions, templates, export up to 8K.</p>
						<span className="feature-tag">Browser-Based</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎚️</div>
						<h4>Recording Studio</h4>
						<p>Multi-track DAW with effects chain, arranger view, and tier-based track limits.</p>
						<span className="feature-tag">DAW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🤖</div>
						<h4>AI Mix Assistant</h4>
						<p>Auto-leveling, EQ conflict detection, compression guidance, and one-click fixes.</p>
						<span className="feature-tag ai-tag">AI-Powered</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎛️</div>
						<h4>AI Mastering</h4>
						<p>50 genre profiles, auto-detect, instant master results with loudness + tonal balance targets.</p>
						<span className="feature-tag ai-tag">AI-Powered</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📱</div>
						<h4>Short-Form Clips</h4>
						<p>Create TikTok/Reels/Shorts: auto-resize, captions, and templates from your long-form content.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📤</div>
						<h4>Cross-Platform Posting</h4>
						<p>Post to YouTube, Instagram, TikTok, X, and more — schedule posts and track performance.</p>
					</div>

					{/* Distribution & Streaming */}
					<div className="feature-card highlight">
						<div className="feature-icon">🎵</div>
						<h4>Music Distribution</h4>
						<p>Get on Spotify, Apple Music, Tidal, Amazon, TikTok, and 150+ platforms.</p>
						<span className="feature-tag">150+ Platforms</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🔴</div>
						<h4>Live Streaming</h4>
						<p>OBS/WebRTC support, chat, donations, VOD recording, simulcast options.</p>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">📻</div>
						<h4>24/7 Radio Stations</h4>
						<p>Auto DJ + AI DJ personas, listener requests, scheduling, and always-on stations.</p>
						<span className="feature-tag ai-tag">AI-Powered</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🎙️</div>
						<h4>Podcast Hosting</h4>
						<p>Unlimited episodes, RSS feeds, directory distribution, and analytics.</p>
					</div>

					{/* Gaming + Social */}
					<div className="feature-card">
						<div className="feature-icon">🎮</div>
						<h4>Gaming Hub</h4>
						<p>Squad finder, team rooms, tournaments, and community features.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🖥️</div>
						<h4>Screen Share & Recording</h4>
						<p>Share your screen with your squad, record sessions, and save highlights.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🎤</div>
						<h4>Voice Chat Rooms</h4>
						<p>Noise suppression, push-to-talk, and private channels.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">👥</div>
						<h4>Social Network</h4>
						<p>Feed, likes, comments, follows, and creator profiles — build your audience on your platform.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">💬</div>
						<h4>Direct Messaging</h4>
						<p>Real-time DMs, group chats, media sharing, and message requests.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🔗</div>
						<h4>Cross-Platform Sharing</h4>
						<p>Share your StreamPireX content everywhere with one click.</p>
					</div>

					{/* Monetization + Analytics */}
					<div className="feature-card highlight">
						<div className="feature-icon">🛍️</div>
						<h4>Creator Marketplace</h4>
						<p>Sell beats, merch, digital products, presets, courses, services — with Stripe.</p>
						<span className="feature-tag">90% Earnings</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">💳</div>
						<h4>Fan Tipping</h4>
						<p>Tips on any content. Keep 90% with transparent payouts.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📊</div>
						<h4>Creator Analytics</h4>
						<p>Track plays, views, revenue, audience growth, and content performance.</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    COST COMPARISON (from v1)
			    ================================================================ */}
			<section className="comparison-section">
				<h2>💸 Stop Paying for 15 Separate Tools</h2>
				<div className="comparison-grid">
					<div className="comparison-card old">
						<h4>❌ Without StreamPireX</h4>
						<ul>
							<li>🎬 Video Editor — $23/mo</li>
							<li>🎚️ DAW Software — $10-30/mo</li>
							<li>🎛️ Mastering Service — $10-50/track</li>
							<li>📡 Streaming Platform — $15/mo</li>
							<li>🎙️ Podcast Hosting — $12/mo</li>
							<li>📻 Radio Hosting — $20/mo</li>
							<li>🎵 Distribution — $20-50/yr</li>
							<li>🛍️ Merch Platform — $15/mo</li>
							<li>📊 Analytics Tools — $10/mo</li>
						</ul>
						<p className="comparison-total">Total: $100-$200+/month</p>
					</div>
					<div className="comparison-card new">
						<h4>✅ StreamPireX All-in-One</h4>
						<ul>
							<li>🎬 Video Editor — Full Tools + Templates</li>
							<li>🎚️ Recording Studio — Multi-Track DAW</li>
							<li>🤖 AI Mix Assistant + AI Mastering</li>
							<li>📡 Live Streaming — Up to 4K</li>
							<li>🎙️ Podcast Hosting — Unlimited</li>
							<li>📻 24/7 Radio + AI DJ</li>
							<li>🎵 150+ Platform Distribution</li>
							<li>🛍️ Marketplace + Merch</li>
							<li>🎮 Gaming Hub + Social</li>
						</ul>
						<p className="comparison-total">Starting at $12.99/month — Keep 90%</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    CREATOR TYPES (merged)
			    ================================================================ */}
			<section className="creator-types">
				<h2>🎨 Built for Every Creator</h2>
				<div className="creator-grid">
					<div className="creator-card">
						<span className="creator-emoji">🎤</span>
						<h4>Musicians</h4>
						<p>Record, mix with AI, master, distribute, and collect royalties</p>
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
						<p>Stream, find squads, run tournaments, build community</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">📻</span>
						<h4>Radio Hosts</h4>
						<p>Run 24/7 stations with AI DJ, accept submissions, build audiences</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🛍️</span>
						<h4>Entrepreneurs</h4>
						<p>Sell merch, beats, presets, courses, and digital products</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    PRICING PREVIEW (from v1)
			    ================================================================ */}
			<section className="pricing-preview">
				<h2>💎 Simple, Transparent Pricing</h2>
				<p className="section-subtitle">Start free. Upgrade when you're ready. No hidden fees.</p>
				<div className="pricing-preview-grid">
					<div className="pricing-preview-card">
						<h4>Free</h4>
						<div className="preview-price">$0</div>
						<p>Full video editor, 4 studio tracks, gaming hub, social feed, 5GB storage</p>
					</div>
					<div className="pricing-preview-card starter">
						<h4>Starter</h4>
						<div className="preview-price">$12.99<span>/mo</span></div>
						<p>8 studio tracks, AI mastering (3/mo), live streaming, podcasts, radio, 25GB</p>
					</div>
					<div className="pricing-preview-card creator popular">
						<div className="preview-popular">Most Popular</div>
						<h4>Creator</h4>
						<div className="preview-price">$22.99<span>/mo</span></div>
						<p>16 tracks, AI mastering (15/mo), AI Radio DJ, 4K export, 100GB, game streaming</p>
					</div>
					<div className="pricing-preview-card pro">
						<h4>Pro</h4>
						<div className="preview-price">$31.99<span>/mo</span></div>
						<p>32 tracks, unlimited AI mastering, voice cloning, 8K, music distribution, unlimited storage</p>
					</div>
				</div>
				<div className="pricing-preview-cta">
					<Link to="/pricing" className="btn btn-primary">View Full Pricing</Link>
				</div>
			</section>

			{/* ================================================================
			    EARNINGS COMPARISON
			    ================================================================ */}
			<section className="earnings">
				<h2>💰 Keep More of What You Earn</h2>
				<div className="earnings-bars">
					<div className="earnings-row">
						<span className="platform-name">YouTube</span>
						<div className="bar-container">
							<div className="bar youtube-bar" style={{ width: "45%" }}>45%</div>
						</div>
					</div>
					<div className="earnings-row">
						<span className="platform-name">Twitch</span>
						<div className="bar-container">
							<div className="bar twitch-bar" style={{ width: "50%" }}>50%</div>
						</div>
					</div>
					<div className="earnings-row">
						<span className="platform-name">Spotify</span>
						<div className="bar-container">
							<div className="bar spotify-bar" style={{ width: "30%" }}>~30%</div>
						</div>
					</div>
					<div className="earnings-row highlight-row">
						<span className="platform-name">StreamPireX</span>
						<div className="bar-container">
							<div className="bar spx-bar" style={{ width: "90%" }}>90%</div>
						</div>
					</div>
				</div>
			</section>

			{/* ================================================================
			    FINAL CTA
			    ================================================================ */}
			<section className="final-cta">
				<h2>Ready to Create Without Limits?</h2>
				<p>
					Join StreamPireX and get AI-powered recording studio, mix assistant, mastering,
					music distribution, video editing, live streaming, and more — all in one platform.
				</p>
				<div className="cta-buttons">
					<Link to="/signup" className="btn btn-primary btn-lg">Start Creating for Free</Link>
					<Link to="/pricing" className="btn btn-outline-light btn-lg">View Pricing</Link>
				</div>
			</section>

			{/* ================================================================
			    FOOTER
			    ================================================================ */}
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