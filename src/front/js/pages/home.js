import React, { useContext } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
import recordingStudioSrcDoc from "../component/recordingStudioAnim";
import djStudioSrcDoc from "../component/djStudioSrcDoc";
import beatMakerSrcDoc from "../component/beatMakerSrcDoc";
import podcastStudioSrcDoc from "../component/podcastStudioSrcDoc";
import radioStationSrcDoc from "../component/radioStationSrcDoc";
import videoEditorSrcDoc from "../component/videoEditorSrcDoc";
import logo from "../../img/StreampireX.png";
import WaitlistSection from "../component/WaitlistSection";
import "../../styles/home.css";

// Screenshot imports — place these files in src/front/img/
import screenshotDashboard from "../../img/streampirex-home-dashboard.png";
import screenshotDAW from "../../img/streampirex-home-daw.png";
import screenshotPodcast from "../../img/streampirex-home-podcast_studio.png";
import screenshotVideoEditor from "../../img/streampirex-home-video_editor.png";

// =============================================================================
// home.js — StreamPireX Landing Page (Updated Mar 2026)
// =============================================================================
// New page structure:
// 1. Hero: The Hook
// 2. Problem / Solution: The Empathy
// 3. Cost Comparison: The Logic
// 4. FREE Features Banner: The Lead Magnet
// 5. Social Network Spotlight: The Community
// 6. Gaming Hub Spotlight: The Scale
// 7. Creator Commerce: Beats, Merch & Digital Products
// 8. AI-Assisted Production Suite: The Speed
// 9. Industry Hub: EPK & Collaborations
// 10. Unified Studio, Radio & Distribution: The Close
//
// Supporting sections kept:
// How It Works → Creator Types → Why StreamPireX → Pricing → Earnings
// → Social Proof → Final CTA → Waitlist → Footer
// =============================================================================

const demoStageStyle = {
	width: "100%",
	maxWidth: "1280px",
	margin: "0 auto",
	padding: "0 20px"
};

const demoFrameStyle = {
	width: "100%",
	borderRadius: "16px",
	overflow: "hidden",
	border: "1px solid rgba(0,255,200,0.15)",
	background: "#050813",
	boxShadow: "0 8px 40px rgba(0,255,200,0.08)"
};

const demoCaptionStyle = {
	padding: "12px 20px",
	background: "rgba(0,255,200,0.04)",
	borderTop: "1px solid rgba(0,255,200,0.1)",
	color: "#00ffc8",
	fontSize: "13px",
	fontWeight: 600,
	letterSpacing: "0.5px"
};

const DemoFrame = ({
	srcDoc,
	title,
	caption,
	height = 500,
	loading = "lazy"
}) => (
	<div style={demoStageStyle}>
		<div style={demoFrameStyle}>
			<iframe
				srcDoc={srcDoc}
				style={{
					width: "100%",
					height: `${height}px`,
					minHeight: `${height}px`,
					border: "none",
					display: "block",
					background: "#050813"
				}}
				title={title}
				loading={loading}
			/>
			<div style={demoCaptionStyle}>{caption}</div>
		</div>
	</div>
);

const Home = () => {
	const { store } = useContext(Context);
	const user = store.user;

	return (
		<div
			className="streampirex-home"
			style={{
				width: "100%",
				overflowX: "hidden"
			}}
		>

			{/* ================================================================
			    1. HERO: THE HOOK
			    ================================================================ */}
			<header className="hero" style={{ padding: "80px 20px 40px", background: "radial-gradient(circle at top, #161b22 0%, #0d1117 100%)" }}>
				<div className="hero-content" style={{ textAlign: 'center', maxWidth: '1000px', margin: '0 auto' }}>
					{/* LOGO */}
					<div style={{ marginBottom: "30px" }}>
						<img
							src={logo}
							alt="StreamPireX"
							style={{ height: "70px", filter: "drop-shadow(0 0 15px rgba(0,255,200,0.3))" }}
						/>
					</div>

					{/* THE SLOGAN */}
					<h1 style={{
						fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
						fontWeight: '900',
						color: '#fff',
						marginBottom: '20px',
						lineHeight: '1.1',
						letterSpacing: '-1.5px'
					}}>
						Your Creative Empire. <span style={{ color: '#00ffc8', textShadow: '0 0 30px rgba(0,255,200,0.4)' }}>One Login.</span>
					</h1>

					{/* THE "WHAT & WHO" */}
					<p style={{
						fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
						color: '#8b949e',
						maxWidth: '800px',
						margin: '0 auto 40px',
						lineHeight: '1.6'
					}}>
						The sovereign OS for <strong>Music Producers, Podcasters, Filmmakers, and Gamers</strong>.
						Replace 15+ subscriptions with one AI-powered workspace to create, distribute, and host—all while
						keeping <span style={{ color: '#fff', fontWeight: 'bold' }}>90% of your revenue</span>.
					</p>

					{/* THE CTA BUTTONS */}
					{!user ? (
						<div className="cta-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '60px' }}>
							<a href="#waitlist" className="btn btn-primary" style={{
								padding: '16px 40px',
								fontSize: '18px',
								fontWeight: '800',
								borderRadius: '8px',
								boxShadow: '0 10px 20px rgba(0, 255, 200, 0.2)'
							}}>
								Join the Waitlist — Get Early Access
							</a>
							<Link to="/compare" className="btn btn-outline-light" style={{
								padding: '16px 40px',
								fontSize: '18px',
								fontWeight: '600',
								borderRadius: '8px'
							}}>
								See How You Save $300/mo
							</Link>
						</div>
					) : (
						<div className="cta-buttons" style={{ marginBottom: '60px' }}>
							<Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
						</div>
					)}
				</div>

				{/* HERO STATS BAR */}
				<div className="hero-stats">
					<div className="stat-item">
						<span className="stat-number">32</span>
						<span className="stat-label">Track Pro DAW</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">150+</span>
						<span className="stat-label">Distro Platforms</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">90%</span>
						<span className="stat-label">Revenue Share</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">AI</span>
						<span className="stat-label">Powered Studio</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">24/7</span>
						<span className="stat-label">AI Radio DJ</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">📋</span>
						<span className="stat-label">EPK & Collabs</span>
					</div>
				</div>

				{/* DASHBOARD PREVIEW */}
				<DemoFrame
					srcDoc={recordingStudioSrcDoc}
					title="StreamPireX Demo"
					height={700}
					loading="eager"
					caption="🚀 StreamPireX — The all-in-one creator platform. Replace 15+ tools. Keep 90%."
				/>
			</header>

			{/* ================================================================
			    2. PROBLEM / SOLUTION: THE EMPATHY
			    ================================================================ */}
			<section className="problem-solution">
				<div className="problem">
					<h3>😫 The Creator Problem</h3>
					<p>
						Fee fatigue. App jumping. Losing 30–50% of revenue to corporate giants.
						Juggling 15+ apps for production, distribution, editing, hosting,
						streaming, analytics, scheduling, licensing, and payments. Paying
						$100–$350+ per month across disconnected tools. No audience ownership.
						No simple way to mix or master without expensive software. Separate
						platforms for beat sales, podcast hosting, EPK hosting, merch, and
						collaboration.
					</p>
				</div>

				<div className="solution">
					<h3>✨ The StreamPireX Solution</h3>
					<p>
						A unified ecosystem where your tools, audience, and marketplace live
						together. Record, mix, and master with AI help. Build synths, design
						drums, and create custom instruments directly in the DAW. Make beats
						with the MPC sampler. Sell beats with auto-generated license agreements.
						Host and monetize podcasts. Stream live. Run 24/7 radio with an AI DJ.
						Edit video. Build your EPK. Find collaborators. Sell merch and digital
						products. Distribute to 150+ platforms. Keep 90% of your money.
					</p>
				</div>
			</section>

			{/* ================================================================
			    3. COST COMPARISON: THE LOGIC
			    ================================================================ */}
			<section className="comparison-section">
				<h2>💸 Stop Paying for 15 Separate Tools</h2>
				<p className="section-subtitle">
					Save creators thousands of dollars annually.
				</p>

				<div className="comparison-grid">
					<div className="comparison-card old">
						<h4>❌ Without StreamPireX</h4>
						<ul>
							<li>🎬 Video Editor — $23/mo</li>
							<li>🎚️ DAW Software — $10–30/mo</li>
							<li>🎛️ Mastering Service — $10–50/track</li>
							<li>🎵 Stem Splitter — $10–20/mo</li>
							<li>🎹 Beat Store Platform — $20/mo</li>
							<li>📡 Streaming Platform — $15/mo</li>
							<li>🎙️ Podcast Hosting — $12/mo</li>
							<li>📻 Radio Hosting — $20/mo</li>
							<li>🎵 Distribution — $21.99 - $79.99/yr</li>
							<li>📋 EPK Hosting — $10–20/mo</li>
							<li>🛍️ Merch / Course Platform — $15–39/mo</li>
							<li>📊 Analytics Tools — $10/mo</li>
							<li>📤 Social Scheduler — $15–25/mo</li>
						</ul>
						<p className="comparison-total">Total: $170–$350+/month</p>
					</div>

					<div className="comparison-card new">
						<h4>✅ StreamPireX All-in-One</h4>
						<ul>
							<li>🎬 Video Editor + AI Video Studio</li>
							<li>🤖 AI Video Generation (text/image → video)</li>
							<li>🎚️ Recording Studio — Multi-Track DAW</li>
							<li>🥁 Beat Maker — MPC Sampler + Sequencer</li>
							<li>🤖 AI Mix Assistant + AI Mastering</li>
							<li>🎵 AI Stem Separation — FREE All Tiers</li>
							<li>🎹 Beat Store — Buy, Sell & License</li>
							<li>📡 Live Streaming — Up to 4K + Simulcast</li>
							<li>🎙️ Podcast Studio — Record, Host & Monetize</li>
							<li>📻 24/7 Radio + AI DJ</li>
							<li>🎵 150+ Platform Distribution</li>
							<li>📋 EPK Builder + Collab Marketplace</li>
							<li>🎬 AI Commercial Generator</li>
							<li>🛍️ Marketplace + Courses + Storefront</li>
							<li>🎮 Gaming Hub + Social Network</li>
						</ul>
						<p className="comparison-total">Starting at $19.99/month — Keep 90%</p>

						<div style={{ textAlign: "center", marginTop: "20px" }}>
							<a
								href="/compare"
								target="_blank"
								rel="noopener noreferrer"
								style={{
									display: "inline-block",
									padding: "12px 28px",
									border: "2px solid #00ffc8",
									color: "#00ffc8",
									background: "rgba(0,255,200,0.06)",
									borderRadius: "6px",
									fontSize: "14px",
									fontWeight: 700,
									textDecoration: "none"
								}}
							>
								📊 See Full Platform Comparison →
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* ================================================================
			    4. FREE FEATURES BANNER: THE LEAD MAGNET
			    ================================================================ */}
			<section className="free-features-banner">
				<div className="free-banner-inner">
					<div className="free-banner-header">
						<span className="free-badge-large">🆓 FREE FOREVER</span>
						<h2>Genuinely Free. No Credit Card. No Catch.</h2>
						<p>Start creating without spending a dime. These are yours the moment you sign up.</p>
					</div>

					<div className="free-features-grid">
						<div className="free-feature-item">
							<span className="free-feature-icon">👤</span>
							<h4>Social Profile</h4>
							<p>Full social profile, feed, stories, follows, DMs, and group chats</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🎮</span>
							<h4>Gaming Hub</h4>
							<p>Squad finder, team rooms, gamer chatrooms — free forever</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🎵</span>
							<h4>AI Stem Separation</h4>
							<p>Split any song into vocals, drums, bass, instruments — Meta Demucs AI</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🎬</span>
							<h4>Video Editor</h4>
							<p>Full browser-based editor — timeline, effects, transitions, templates</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🎛️</span>
							<h4>4-Track DAW</h4>
							<p>4-track recording studio with FX chain, arranger, piano roll, and creator workflow tools</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🥁</span>
							<h4>Beat Maker & Sampler</h4>
							<p>MPC-style 16-pad sampler with 64-step sequencer and per-pad FX</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">📋</span>
							<h4>EPK Builder</h4>
							<p>Full Electronic Press Kit with public URL — free on every plan</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🤝</span>
							<h4>Collab Hub</h4>
							<p>Post collab requests, browse artists, apply with your EPK — free</p>
						</div>
						<div className="free-feature-item">
							<span className="free-feature-icon">🎹</span>
							<h4>Beat Store Browsing</h4>
							<p>Stream and license beats from producers worldwide — free to browse</p>
						</div>
					</div>

					<div className="free-banner-cta">
						<a href="#waitlist" className="btn btn-primary btn-lg">
							Join the Waitlist — Be First
						</a>
					</div>
				</div>
			</section>

			{/* ================================================================
			    5. SOCIAL NETWORK SPOTLIGHT: THE COMMUNITY
			    ================================================================ */}
			<section className="social-network-spotlight">
				<h2>👥 Your Social Network. Your Audience. Your Platform.</h2>
				<p className="section-subtitle">
					Build and own your fan base directly where your tools live.
				</p>

				<div
					className="social-features-grid"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3,1fr)",
						gap: "1.5rem",
						maxWidth: "1100px",
						margin: "2.5rem auto"
					}}
				>
					<div className="social-feature">
						<span className="social-icon">🏠</span>
						<h4>Home Feed</h4>
						<p>Posts, music, videos, beats, and updates from everyone you follow — all in one scroll.</p>
					</div>
					<div className="social-feature">
						<span className="social-icon">📖</span>
						<h4>Stories</h4>
						<p>24-hour stories for behind-the-scenes content, announcements, and quick clips.</p>
					</div>
					<div className="social-feature">
						<span className="social-icon">💬</span>
						<h4>DMs & Group Chats</h4>
						<p>Private messages and group chats with collaborators, fans, and your community.</p>
					</div>
					<div className="social-feature">
						<span className="social-icon">🎵</span>
						<h4>Waveform Comments</h4>
						<p>Leave timestamped comments directly on tracks — feedback at exact moments. No other platform has this.</p>
					</div>
					<div className="social-feature">
						<span className="social-icon">🔍</span>
						<h4>Discover Users</h4>
						<p>Find artists, producers, gamers, and creators by genre, skill, location, and vibe.</p>
					</div>
					<div className="social-feature">
						<span className="social-icon">🌐</span>
						<h4>Explore & Search</h4>
						<p>Global search across tracks, beats, creators, videos, podcasts, and radio stations.</p>
					</div>
				</div>

				<div className="social-cta">
					<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-light">Request Early Access</a>
				</div>
			</section>

			{/* ================================================================
			    6. GAMING HUB SPOTLIGHT: THE SCALE
			    ================================================================ */}
			<section className="gaming-hub-spotlight">
				<div className="gaming-header">
					<h2>🎮 Gaming Hub — Built for the Community</h2>
					<span className="gaming-free-tag">FREE on All Plans</span>
				</div>

				<p className="section-subtitle">
					Instant access to the 3B+ global gaming market for fans, content, and collabs.
				</p>

				<div
					className="gaming-features-grid"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(3,1fr)",
						gap: "1.5rem",
						maxWidth: "1100px",
						margin: "2.5rem auto"
					}}
				>
					<div className="gaming-feature">
						<span className="gaming-icon">🔍</span>
						<h4>Squad Finder</h4>
						<p>Find teammates by game, rank, playstyle, and region. No more random matchmaking.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">🧑‍🤝‍🧑</span>
						<h4>Private Team Rooms</h4>
						<p>Private rooms for your squad — voice chat, strategy, scheduling, and coordination.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">💬</span>
						<h4>Gamer Chatrooms</h4>
						<p>Public and private chatrooms by game, genre, and community — with real-time notification badges.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">📡</span>
						<h4>Game Streaming</h4>
						<p>Stream your gameplay live directly on StreamPireX. Chat, tips, and VOD recording — Pro+.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">💰</span>
						<h4>Gaming Monetization</h4>
						<p>Accept tips during streams, sell gaming content, and earn from your community — Pro+.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">📊</span>
						<h4>Gaming Analytics</h4>
						<p>Track your community growth, stream views, squad requests, and engagement — Starter+.</p>
					</div>
				</div>

				<div className="gaming-cta">
					<a href="#waitlist" className="btn btn-gaming">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-gaming">Request Early Access</a>
				</div>
			</section>

			{/* ================================================================
			    7. CREATOR COMMERCE: BEATS, MERCH & DIGITAL PRODUCTS
			    ================================================================ */}
			<section className="beat-store-spotlight">
				<h2>🛍️ Creator Commerce: Beats, Merch &amp; Digital Products</h2>
				<p className="section-subtitle">
					The revenue engine for producers, artists, podcasters, and creator brands.
				</p>

				<div className="beat-store-features-grid">
					<div className="beat-store-feature">
						<span className="bs-icon">🎧</span>
						<h4>Pro Beat Storefront</h4>
						<p>Stream watermarked previews free. Buy Basic, Premium, Exclusive, or Stems licenses with instant download.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">📜</span>
						<h4>Auto License Agreements</h4>
						<p>Every purchase generates a full license agreement — distribution limits, streaming caps, credit terms, and usage rights.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">👕</span>
						<h4>Global Print-on-Demand</h4>
						<p>Integrated POD for apparel with worldwide fulfillment, printing, and shipping.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">📦</span>
						<h4>Physical Stock</h4>
						<p>Manage your own inventory with integrated shipping labels, tracking, and storefront support.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">🎹</span>
						<h4>Digital Products</h4>
						<p>Sell sample packs, MIDI packs, preset banks, VST skins, drum kits, presets, and downloadable tools.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">💰</span>
						<h4>Producer Dashboard</h4>
						<p>Track plays, sales, and revenue. Manage licenses, set pricing, offer deals, and keep 90%.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">🥁</span>
						<h4>MPC Beat Maker</h4>
						<p>16 velocity-sensitive pads, 64-step sequencer, 4-bus routing with per-bus effects, per-step automation, FL-style slicer, and AI stem separation.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">📚</span>
						<h4>Courses & Packs</h4>
						<p>Sell tutorials, workshops, creator courses, and premium content directly from your storefront.</p>
					</div>
				</div>

				<div className="beat-store-cta">
					<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-light">Request Early Access</a>
				</div>

				{/* DJ Studio Animation */}
				<DemoFrame
					srcDoc={djStudioSrcDoc}
					title="DJ Studio"
					height={500}
					loading="lazy"
					caption="🎛️ DJ Studio — Two decks, crossfader, EQ, waveforms, BPM sync, hot cues."
				/>
			</section>

			{/* ================================================================
			    EXTRA MERCH / POD SPOTLIGHT KEPT
			    ================================================================ */}
			<section
				className="merch-pod-spotlight"
				style={{ padding: "80px 20px", background: "#111720", textAlign: "center" }}
			>
				<h2
					style={{
						color: "#00ffc8",
						fontFamily: "'Barlow Condensed', sans-serif",
						fontSize: "2.5rem",
						fontWeight: 800
					}}
				>
					🛍️ Built-in Merch Store & POD
				</h2>
				<p className="text-muted mb-5">
					Design gear, sell worldwide, keep 90%. No inventory required.
				</p>

				<div className="row g-4">
					<div className="col-md-4">
						<div
							className="p-4"
							style={{
								background: "rgba(0,255,200,0.03)",
								border: "1px solid rgba(0,255,200,0.1)",
								borderRadius: "15px"
							}}
						>
							<span style={{ fontSize: "3rem" }}>👕</span>
							<h4>Global POD</h4>
							<p className="small text-muted">
								Upload art. We handle printing and shipping for shirts and hoodies worldwide. Zero upfront cost.
							</p>
						</div>
					</div>

					<div className="col-md-4">
						<div
							className="p-4"
							style={{
								background: "rgba(0,255,200,0.03)",
								border: "1px solid rgba(0,255,200,0.1)",
								borderRadius: "15px"
							}}
						>
							<span style={{ fontSize: "3rem" }}>📦</span>
							<h4>Physical Stock</h4>
							<p className="small text-muted">
								Manage your own inventory with integrated shipping labels and tracking.
							</p>
						</div>
					</div>

					<div className="col-md-4">
						<div
							className="p-4"
							style={{
								background: "rgba(0,255,200,0.03)",
								border: "1px solid rgba(0,255,200,0.1)",
								borderRadius: "15px"
							}}
						>
							<span style={{ fontSize: "3rem" }}>🎹</span>
							<h4>Digital Merch</h4>
							<p className="small text-muted">
								Sell beats, sample packs, MIDI packs, presets, and downloadable products directly in your store.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ================================================================
			    8. AI-ASSISTED PRODUCTION SUITE: THE SPEED
			    ================================================================ */}
			<section className="ai-features-section">
				<h2>🤖 AI-Assisted Production Suite</h2>
				<p className="section-subtitle">
					Professional results. Zero experience needed. Powered by AI.
				</p>

				{/* DAW screenshot — shown above AI feature cards */}
				<DemoFrame
					srcDoc={beatMakerSrcDoc}
					title="StreamPireX Beat Maker & DAW"
					height={480}
					loading="lazy"
					caption="🎛️ Beat Maker & MPC Sampler — Live in browser. No download required."
				/>

				<div className="ai-features-grid">
					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎚️</div>
						<div className="ai-badge">FREE</div>
						<h4>Recording Studio</h4>
						<p>A full multi-track DAW in your browser. Record, import, mix, and arrange with pro effects — EQ, compression, reverb, delay, distortion, and filters on every track. Up to 32 tracks on Pro.</p>
						<div className="ai-feature-stats">
							<span>Multi-Track DAW</span>
							<span>Pro Effects</span>
							<span>Arrange View</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🥁</div>
						<div className="ai-badge">FREE</div>
						<h4>Beat Maker &amp; Sampler</h4>
						<p>MPC-style 16-pad sampler with 64-step sequencer, 8 velocity layers per pad, 4-bus routing, per-step automation, FL-style slice sequencing, and inline AI stem separation.</p>
						<div className="ai-feature-stats">
							<span>16 Pads</span>
							<span>64 Steps</span>
							<span>AI Stems</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🤖</div>
						<div className="ai-badge">AI</div>
						<h4>AI Mix Assistant</h4>
						<p>One button: AI analyzes every track — levels, panning, EQ conflicts, compression, and clipping. Get per-track suggestions with one-click apply.</p>
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
						<p>Upload your track. AI analyzes BPM, key, frequency balance, and mood — then masters it with the perfect preset. 50 genre profiles from Boom Bap to Reggaeton.</p>
						<div className="ai-feature-stats">
							<span>50 Genre Profiles</span>
							<span>Auto-Detect</span>
							<span>Instant Results</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎵</div>
						<div className="ai-badge free-badge">FREE</div>
						<h4>AI Stem Separation</h4>
						<p>Split any song into individual stems — vocals, drums, bass, and instruments. Powered by Meta's Demucs AI. 4 or 6 stem modes, 5 AI models. Free on every plan.</p>
						<div className="ai-feature-stats">
							<span>4 or 6 Stems</span>
							<span>5 AI Models</span>
							<span>Free All Tiers</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎵</div>
						<div className="ai-badge">AI</div>
						<h4>Hum to Song</h4>
						<p>Hum a melody into your mic — StreamPireX AI builds a full arrangement around it. Stems, instrumentation, and mix included. Export the whole track or just the beat.</p>
						<div className="ai-feature-stats">
							<span>Hum → Full Song</span>
							<span>AI Arrangement</span>
							<span>Stems Export</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">📝</div>
						<div className="ai-badge">AI</div>
						<h4>Text to Song</h4>
						<p>Describe your track: genre, BPM, mood, instruments, vibe. AI generates a full produced song matching your description. Perfect for quick content, demos, and inspiration.</p>
						<div className="ai-feature-stats">
							<span>Text → Full Track</span>
							<span>Any Genre</span>
							<span>Instant Output</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">📻</div>
						<div className="ai-badge">AI</div>
						<h4>AI Radio DJ</h4>
						<p>Run a 24/7 radio station with an AI DJ that introduces songs, gives shoutouts, reads listener requests, and keeps the vibe going — even while you sleep.</p>
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
						<p>Record your voice once, clone it, and power your station with your own sound — talking between songs, announcing drops, and running your station while you create.</p>
						<div className="ai-feature-stats">
							<span>Your Voice</span>
							<span>1 Min Sample</span>
							<span>Unlimited Use</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎬</div>
						<div className="ai-badge">AI</div>
						<h4>AI Video Studio</h4>
						<p>Generate videos from text prompts or images using Kling v1.6 AI. Create music videos, visualizers, promo clips, and EPK commercials. 5 cinematic styles. Pay-as-you-go credits.</p>
						<div className="ai-feature-stats">
							<span>Text → Video</span>
							<span>Image → Video</span>
							<span>EPK Commercials</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🎤</div>
						<div className="ai-badge">NEW</div>
						<h4>Voice to MIDI</h4>
						<p>Sing, hum, or beatbox — watch it become MIDI notes in real time. Scale quantization, chord triggering, polyphonic mode, vibrato-to-pitch-bend, drum trigger training.</p>
						<div className="ai-feature-stats">
							<span>Pitch + Drums</span>
							<span>14 Scales</span>
							<span>MIDI Export</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🖼️</div>
						<div className="ai-badge">AI</div>
						<h4>AI Thumbnail Maker</h4>
						<p>Generate scroll-stopping thumbnails for your videos, beats, and podcast episodes. Choose a style, describe the vibe, get a professional result in seconds.</p>
						<div className="ai-feature-stats">
							<span>Multiple Styles</span>
							<span>Instant Output</span>
							<span>All Content Types</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">📝</div>
						<div className="ai-badge">AI</div>
						<h4>AI Content Writer</h4>
						<p>Generate social media posts, podcast descriptions, beat tags, SEO metadata, and email newsletters. AI writes in your voice and optimizes for each platform.</p>
						<div className="ai-feature-stats">
							<span>Social Posts</span>
							<span>SEO Metadata</span>
							<span>Your Voice</span>
						</div>
					</div>

					<div className="ai-feature-card">
						<div className="ai-feature-icon">🌍</div>
						<div className="ai-badge">AI</div>
						<h4>Smart Distribution</h4>
						<p>Distribute to 150+ platforms including Spotify, Apple Music, Amazon, TikTok, and more. AI-optimized metadata, auto-tagging, and release scheduling to maximize reach.</p>
						<div className="ai-feature-stats">
							<span>150+ Platforms</span>
							<span>Auto-Tags</span>
							<span>90% Revenue</span>
						</div>
					</div>
				</div>

				<div className="ai-also-included">
					<h4>🛠️ Also Included in Your Plan</h4>
					<div className="also-included-items">
						<span className="also-tag">AI Podcast Transcription</span>
						<span className="also-tag">AI Analytics Insights</span>
						<span className="also-tag">AI Lyrics Generator</span>
						<span className="also-tag">AI Sample Finder</span>
						<span className="also-tag">AI Beat Matching</span>
						<span className="also-tag">AI Content Writer</span>
						<span className="also-tag">Smart Distribution</span>
						<span className="also-tag">AI Thumbnail Maker</span>
					</div>
				</div>
			</section>

			{/* ================================================================
			    9. INDUSTRY HUB: EPK & COLLABORATIONS
			    ================================================================ */}
			<section className="epk-collab-spotlight">
				<h2>📋 Industry Hub: EPK &amp; Collaborations</h2>
				<p className="section-subtitle">
					Professional Electronic Press Kits, public URLs, and a collaboration marketplace in one system.
				</p>

				<div className="epk-features-grid">
					<div className="epk-feature">
						<span className="epk-icon">📋</span>
						<h4>Electronic Press Kit</h4>
						<p>Auto-pulls your profile, tracks, albums, and stats. Add press quotes, achievements, and a technical rider. Share a public link to booking agents, labels, and festivals.</p>
					</div>
					<div className="epk-feature">
						<span className="epk-icon">🤝</span>
						<h4>Collab Marketplace</h4>
						<p>Post requests like "Need R&B vocalist for my single." Artists apply with their EPK attached. Filter by genre, skill, and location.</p>
					</div>
					<div className="epk-feature">
						<span className="epk-icon">🔍</span>
						<h4>Find Artists</h4>
						<p>Search EPKs by skill, genre, location, and collab availability. Browse vocalists, producers, engineers, guitarists, and more.</p>
					</div>
					<div className="epk-feature">
						<span className="epk-icon">💬</span>
						<h4>Built-In Messaging</h4>
						<p>Message any artist directly from their EPK, collab request, or application. Context-tagged DMs land in their inbox.</p>
					</div>
					<div className="epk-feature">
						<span className="epk-icon">📤</span>
						<h4>Upload Anything</h4>
						<p>Upload audio demos, music videos, press photos, PDFs, and documents directly to your EPK. Stored on Cloudflare R2.</p>
					</div>
					<div className="epk-feature">
						<span className="epk-icon">🎬</span>
						<h4>AI Commercial Generator</h4>
						<p>Turn your EPK into a promo video with one click. 5 visual styles — cinematic, hype, minimal, documentary, lyric video.</p>
					</div>
				</div>

				<div className="epk-cta">
					<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-light">Request Early Access</a>
				</div>
			</section>

			{/* ================================================================
			    10. UNIFIED STUDIO, RADIO & DISTRIBUTION: THE CLOSE
			    ================================================================ */}
			<section className="features">
				<h2>🎯 Unified Studio, Radio &amp; Distribution</h2>
				<p className="section-subtitle">
					The complete workstation: create, broadcast, host, and distribute from one place.
				</p>

				{/* Podcast Studio screenshot */}
				<DemoFrame
					srcDoc={podcastStudioSrcDoc}
					title="Podcast Studio"
					height={500}
					loading="lazy"
					caption="🎙️ Podcast Studio — Record with remote guests, distribute to Spotify & Apple Podcasts, monetize."
				/>

				<div className="feature-grid">
					<div className="feature-card highlight">
						<div className="feature-icon">🎚️</div>
						<h4>32-Track DAW</h4>
						<p>Multi-track DAW with full effects chain, arranger view, AI mix analysis, Synth Creator, Drum Designer, and creator-grade workflow tools.</p>
						<span className="feature-tag new">DAW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🥁</div>
						<h4>Beat Maker &amp; Sampler</h4>
						<p>MPC-style pads with 8 velocity layers, 4-bus routing, automation lanes, FL-style slice sequencing, and inline AI stem separation.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎵</div>
						<h4>Music Distribution</h4>
						<p>Spotify, Apple Music, Tidal, Amazon, TikTok, and 150+ more. One-click push, AI metadata help, and 90% creator revenue.</p>
						<span className="feature-tag">150+</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">📻</div>
						<h4>24/7 Radio Stations</h4>
						<p>Licensed internet radio with AI DJ personas, listener requests, scheduling, and always-on broadcast tools.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎙️</div>
						<h4>Podcast Studio</h4>
						<p>Record, host, distribute to all directories. Video podcasts, remote guest recording, monetization, RSS hosting, and creator analytics.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>Video Editor</h4>
						<p>Browser-based multi-track timeline, effects, transitions, templates, and export tools for every platform.</p>
						<span className="feature-tag">Free</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>AI Video Studio</h4>
						<p>Generate videos from text or images with Kling v1.6 AI. Music videos, promo clips, visualizers, and EPK commercials.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🔴</div>
						<h4>Live Streaming</h4>
						<p>OBS &amp; WebRTC support, live chat, donations, VOD recording, and simulcast support.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📱</div>
						<h4>Short-Form Clips</h4>
						<p>Auto-resize for TikTok, Reels, and Shorts with AI captions and templates.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📤</div>
						<h4>Cross-Platform Posting</h4>
						<p>Schedule and publish to YouTube, Instagram, TikTok, X, Facebook, LinkedIn, and more.</p>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">📋</div>
						<h4>EPK Builder &amp; Collab Hub</h4>
						<p>Build your Electronic Press Kit, find collaborators, message artists, and generate AI promo commercials — unified.</p>
						<span className="feature-tag new">FREE</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎹</div>
						<h4>Beat Store</h4>
						<p>Buy, sell, and license beats with auto-generated agreements. Basic to exclusive tiers. Keep 90%.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🤝</div>
						<h4>Collab Marketplace</h4>
						<p>Post collab requests, apply with your EPK, message artists, and find the perfect collaborator by skill, genre, or location.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎤</div>
						<h4>Voice to MIDI</h4>
						<p>Sing or beatbox into MIDI. Pitch mode, drum triggers, chord mode, 14 scales, and .mid export.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎵</div>
						<h4>Hum to Song</h4>
						<p>Hum a melody and let AI build a full song around it. Stems, arrangement, and mix included.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">📝</div>
						<h4>Text to Song</h4>
						<p>Describe your vibe in words — genre, mood, tempo, instruments — and AI generates the track.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🎤</div>
						<h4>Voice Chat Rooms</h4>
						<p>Noise suppression, push-to-talk, and private channels for your community.</p>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🛍️</div>
						<h4>Creator Marketplace</h4>
						<p>Sell beats, merch, presets, courses, and digital products with Stripe payments.</p>
						<span className="feature-tag">90%</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">📚</div>
						<h4>Creator Courses</h4>
						<p>Build and sell courses, tutorials, and workshops. Drip content to subscribers.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎼</div>
						<h4>Stems &amp; Sample Marketplace</h4>
						<p>Buy and sell individual stems, loops, and samples. Keep 90%. Instant R2 delivery.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">⚡</div>
						<h4>Quick Capture Mode</h4>
						<p>One tap — instant recording. Capture ideas before they disappear. Auto-save to your library.</p>
						<span className="feature-tag new">NEW</span>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🎟️</div>
						<h4>Event Ticketing</h4>
						<p>Sell tickets to live streams, virtual concerts, workshops, and meetups. Stripe-powered.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">💳</div>
						<h4>Fan Tipping</h4>
						<p>Accept tips on any content — streams, music, videos, radio, beats. Keep 90%.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">🏪</div>
						<h4>Creator Storefront</h4>
						<p>Your own branded storefront page with products, beats, courses, and subscription tiers.</p>
					</div>

					<div className="feature-card">
						<div className="feature-icon">📊</div>
						<h4>Creator Analytics</h4>
						<p>Track plays, views, revenue, beat sales, podcast downloads, audience growth, and content performance.</p>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🖼️</div>
						<h4>AI Thumbnail Maker</h4>
						<p>Generate click-worthy thumbnails for your videos, beats, and podcasts with AI — in seconds.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>

					<div className="feature-card highlight">
						<div className="feature-icon">🎓</div>
						<h4>Creator Academy</h4>
						<p>Courses and tutorials on music production, streaming, marketing, and growing your audience.</p>
						<span className="feature-tag new">NEW</span>
					</div>
				</div>

				{/* Video Editor screenshot — shown below feature grid */}
				<DemoFrame
					srcDoc={videoEditorSrcDoc}
					title="Video Editor"
					height={500}
					loading="lazy"
					caption="🎬 Professional Video Editor — Multi-track timeline, color grading, effects, and export. Free on all plans."
				/>
			</section>

			{/* ================================================================
			    PODCAST STUDIO SPOTLIGHT KEPT
			    ================================================================ */}
			<section className="podcast-studio-spotlight">
				<h2>🎙️ Podcast Studio — Record, Host &amp; Monetize</h2>
				<p className="section-subtitle">
					Everything you need to launch, grow, and earn from your podcast — all in one place.
				</p>

				<div className="podcast-features-grid">
					<div className="podcast-feature">
						<span className="pod-icon">🎤</span>
						<h4>Record &amp; Upload</h4>
						<p>Record episodes directly in-browser with remote guest recording, or upload audio/video files.</p>
					</div>
					<div className="podcast-feature">
						<span className="pod-icon">📡</span>
						<h4>RSS &amp; Directory Distribution</h4>
						<p>Auto-generate RSS feeds and distribute to Apple Podcasts, Spotify, Google Podcasts, and every major directory.</p>
					</div>
					<div className="podcast-feature">
						<span className="pod-icon">💵</span>
						<h4>Monetize Your Show</h4>
						<p>Offer free, paid, or subscription-based episodes. Accept tips, sell premium content, and keep 90% of earnings.</p>
					</div>
					<div className="podcast-feature">
						<span className="pod-icon">📊</span>
						<h4>Analytics &amp; Growth</h4>
						<p>Track downloads, listener retention, geographic data, and episode performance. Know your audience.</p>
					</div>
					<div className="podcast-feature">
						<span className="pod-icon">🎬</span>
						<h4>Video Podcasts</h4>
						<p>Upload video episodes alongside audio. Create clips for social media. Cross-post to YouTube and TikTok.</p>
					</div>
					<div className="podcast-feature">
						<span className="pod-icon">🤝</span>
						<h4>Collab Rooms</h4>
						<p>Real-time collaboration spaces for co-hosting. Invite remote guests with one link. Record multi-party sessions.</p>
					</div>
				</div>

				<div className="podcast-studio-cta">
					<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-light">Request Early Access</a>
				</div>

				{/* Radio Station Animation */}
				<DemoFrame
					srcDoc={radioStationSrcDoc}
					title="Radio Station"
					height={500}
					loading="lazy"
					caption="📻 24/7 Radio Station — Live listener count, song history, live chat, share & embed."
				/>
			</section>

			{/* ================================================================
			    HOW IT WORKS
			    ================================================================ */}

			{/* ================================================================
			    FILM & SERIES — INDEPENDENT FILMMAKER SECTION
			    ================================================================ */}
			<section className="film-series-spotlight">
				<div className="film-section-inner">
					<div className="film-section-header">
						<span className="film-badge-tag">🎬 NEW</span>
						<h2>Film &amp; Series — For Independent Filmmakers</h2>
						<p className="section-subtitle">
							StreamPireX is the platform where independent filmmakers publish,
							monetize, and grow their audience — no Netflix gatekeeping, no studio required.
						</p>
					</div>

					<div className="film-features-grid">
						<div className="film-feature-item">
							<span className="film-feature-icon">🎭</span>
							<h4>Virtual Theatre</h4>
							<p>Your own branded theatre — fans follow, get notified of screenings, and watch your films in your space.</p>
							<span className="film-feature-tag free">FREE to create</span>
						</div>
						<div className="film-feature-item">
							<span className="film-feature-icon">📽️</span>
							<h4>Upload Films</h4>
							<p>Upload feature films, short films, documentaries, and animation. Full IMDB-style metadata, SAG credits, festival laurels.</p>
							<span className="film-feature-tag free">FREE to upload</span>
						</div>
						<div className="film-feature-item">
							<span className="film-feature-icon">⚡</span>
							<h4>Short Film Hub</h4>
							<p>Dedicated short film discovery. Genre tabs, trending section, monthly film festival with community voting.</p>
							<span className="film-feature-tag new">NEW</span>
						</div>
						<div className="film-feature-item">
							<span className="film-feature-icon">🎟️</span>
							<h4>Live Premieres</h4>
							<p>Schedule virtual premiere events. Fans buy tickets, join your screening room, and watch simultaneously in sync.</p>
							<span className="film-feature-tag pro">Pro feature</span>
						</div>
						<div className="film-feature-item">
							<span className="film-feature-icon">💳</span>
							<h4>Rent &amp; Buy</h4>
							<p>Monetize with flexible pricing — free, rent (48hr), buy (permanent), or fan membership gated. You keep 90%.</p>
							<span className="film-feature-tag pro">Pro feature</span>
						</div>
						<div className="film-feature-item">
							<span className="film-feature-icon">🏆</span>
							<h4>Monthly Film Festival</h4>
							<p>Submit short films to our monthly community festival. Categories for drama, comedy, documentary, animation, and student films.</p>
							<span className="film-feature-tag free">FREE to enter</span>
						</div>
					</div>

					<div className="film-pricing-callout">
						<div className="film-pricing-item">
							<span className="film-pricing-icon">🆓</span>
							<strong>Upload Free</strong>
							<span>Films, shorts, series — upload unlimited on all plans</span>
						</div>
						<div className="film-pricing-divider">→</div>
						<div className="film-pricing-item">
							<span className="film-pricing-icon">💳</span>
							<strong>Monetize on Pro</strong>
							<span>Charge rent/buy, sell tickets, gate behind fan membership</span>
						</div>
						<div className="film-pricing-divider">→</div>
						<div className="film-pricing-item">
							<span className="film-pricing-icon">💰</span>
							<strong>Keep 90%</strong>
							<span>StreamPireX takes 10% — you keep the rest</span>
						</div>
					</div>

					<div style={{ textAlign: "center", marginTop: "2rem" }}>
						<a href="#waitlist" className="btn btn-primary" style={{ marginRight: "12px" }}>Join the Waitlist</a>
						<Link to="/browse-films" className="btn btn-outline-light">Browse Films</Link>
					</div>
				</div>
			</section>

			{/* ================================================================
			    CREATOR ACADEMY
			    ================================================================ */}
			<section className="creator-academy-spotlight">
				<h2>🎓 Creator Academy — Learn &amp; Earn</h2>
				<p className="section-subtitle">
					Build courses, tutorials, and workshops. Sell to your audience. Keep 90%.
					Or take courses from real creators and level up your skills.
				</p>

				<div className="academy-grid">
					<div className="academy-card creator-side">
						<div className="academy-card-header">
							<span className="academy-emoji">🎬</span>
							<h4>For Creators — Teach What You Know</h4>
						</div>
						<ul className="academy-features">
							<li>✅ Build structured courses with lessons and videos</li>
							<li>✅ Set your own price — free or paid</li>
							<li>✅ Track enrollment and completion analytics</li>
							<li>✅ Keep 90% of every course sale</li>
							<li>✅ Works for music production, filmmaking, podcasting, gaming</li>
						</ul>

					</div>
					<div className="academy-card student-side">
						<div className="academy-card-header">
							<span className="academy-emoji">🎓</span>
							<h4>For Students — Learn from Real Creators</h4>
						</div>
						<ul className="academy-features">
							<li>✅ Browse free and paid courses</li>
							<li>✅ Learn beat making, mixing, filmmaking, podcasting</li>
							<li>✅ Track your progress across enrolled courses</li>
							<li>✅ Free courses available on all plans</li>
							<li>✅ Paid courses unlock on any paid plan</li>
						</ul>
					</div>
				</div>

				<div className="academy-categories">
					<div className="academy-cat">🎚️ Music Production</div>
					<div className="academy-cat">🥁 Beat Making</div>
					<div className="academy-cat">🎬 Filmmaking</div>
					<div className="academy-cat">🎙️ Podcasting</div>
					<div className="academy-cat">🎤 Vocals &amp; Songwriting</div>
					<div className="academy-cat">📻 Radio Hosting</div>
					<div className="academy-cat">🎮 Gaming &amp; Streaming</div>
					<div className="academy-cat">💰 Creator Business</div>
				</div>
			</section>

			<section className="how-it-works">
				<h2>⚡ Start Creating in 3 Steps</h2>
				<div className="steps-grid">
					<div className="step-card">
						<div className="step-number">1</div>
						<h4>Sign Up Free</h4>
						<p>Create your account in seconds. No credit card required. Get instant access to the video editor, recording studio, beat maker, beat store, gaming hub, and social features.</p>
					</div>
					<div className="step-card">
						<div className="step-number">2</div>
						<h4>Create &amp; Upload</h4>
						<p>Record tracks in the DAW, make beats in the sampler, sell beats, edit videos, start a podcast, launch a radio station, build your EPK, or go live. AI tools help you mix, master, and polish like a pro.</p>
					</div>
					<div className="step-card">
						<div className="step-number">3</div>
						<h4>Distribute &amp; Earn</h4>
						<p>Push music to 150+ platforms, sell beats and merch in your marketplace, find collaborators through the collab hub, accept tips, and grow your audience. Keep 90% of everything you earn.</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    CREATOR TYPES
			    ================================================================ */}
			<section className="creator-types">
				<h2>🎨 Built for Every Creator</h2>
				<div className="creator-grid">
					<div className="creator-card">
						<span className="creator-emoji">🎤</span>
						<h4>Musicians</h4>
						<p>Record, mix with AI, master, build your EPK, find collaborators, distribute, and collect royalties — all in-browser</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎹</span>
						<h4>Beat Producers</h4>
						<p>Make beats in the MPC sampler, upload to the beat store, set license tiers, auto-generate agreements, share your EPK, and keep 90% of sales</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎬</span>
						<h4>Video Creators</h4>
						<p>Edit videos, generate AI music videos and promo clips from text or images, export for every platform, monetize, and grow your audience</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎙️</span>
						<h4>Podcasters</h4>
						<p>Record with remote guests, host, distribute to all directories, monetize with subscriptions and tips</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🎮</span>
						<h4>Gamers</h4>
						<p>Stream, find squads, run tournaments, build community, and monetize your gameplay</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">📻</span>
						<h4>Radio Hosts</h4>
						<p>Run 24/7 stations with AI DJ, accept submissions, and build loyal audiences</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">📚</span>
						<h4>Educators</h4>
						<p>Build and sell courses, tutorials, and workshops with drip content and analytics</p>
					</div>
					<div className="creator-card">
						<span className="creator-emoji">🛍️</span>
						<h4>Entrepreneurs</h4>
						<p>Sell merch, beats, presets, courses, and digital products from your own storefront</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    WHY CHOOSE STREAMPIREX
			    ================================================================ */}
			<section className="why-choose-streampirex">
				<h2>Why StreamPireX?</h2>
				<p>More than just another platform — it's your entire creative business in one place.</p>

				<div className="value-props-grid">
					<div className="value-prop-card">
						<span className="value-icon">💰</span>
						<h4>90% Revenue Share</h4>
						<p>Keep 90% of everything you earn — music, beats, tips, courses, merch. YouTube takes 45%, Twitch takes 50%. We believe creators should own their income.</p>
					</div>
					<div className="value-prop-card">
						<span className="value-icon">🆓</span>
						<h4>Genuinely Free Tier</h4>
						<p>Social profile, gaming hub, video editor, 4-track DAW, beat maker, AI stem separation, EPK builder, and collab hub — all free forever. No time limits, no hidden paywall.</p>
					</div>
					<div className="value-prop-card">
						<span className="value-icon">🤖</span>
						<h4>AI-Powered Tools</h4>
						<p>AI mastering, AI mix assistant, free AI stem separation, voice-to-MIDI, AI radio DJ, AI video studio, AI commercial generator, voice cloning, and AI content writer.</p>
					</div>
					<div className="value-prop-card">
						<span className="value-icon">🎚️</span>
						<h4>Pro Studio Suite</h4>
						<p>Multi-track DAW with arranger view, MPC beat maker with 8 velocity layers and 4-bus routing, per-step automation — all in your browser. No downloads.</p>
					</div>
					<div className="value-prop-card">
						<span className="value-icon">📋</span>
						<h4>EPK &amp; Collab Hub</h4>
						<p>Build a professional press kit, find collaborators, message artists, apply with your EPK, and generate AI promo videos. Free with every plan.</p>
					</div>
					<div className="value-prop-card">
						<span className="value-icon">🌍</span>
						<h4>All-in-One Platform</h4>
						<p>Video editing, streaming, podcasting, beat sales, radio, gaming, distribution, social, EPK, collab marketplace, courses, storefront, and monetization. One login, one subscription.</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    PRICING PREVIEW
			    ================================================================ */}
			<section className="pricing-preview">
				<h2>💎 Simple, Transparent Pricing</h2>
				<p className="section-subtitle">
					Start free. Upgrade when you're ready. No hidden fees.
				</p>

				<h3 style={{ marginTop: "20px" }}>Creator Platform</h3>

				<div className="pricing-preview-grid">
					<div className="pricing-preview-card">
						<h4>Free</h4>
						<div className="preview-price">$0</div>
						<p>
							Video editor, 4 studio tracks, beat maker, AI stem separation,
							EPK builder, social feed, gaming hub, collab hub, 5GB storage
						</p>
					</div>

					<div className="pricing-preview-card starter">
						<h4>Starter</h4>
						<div className="preview-price">$19.99<span>/mo</span></div>
						<div className="preview-subprice">$199/year</div>
						<p>
							8 studio tracks, AI mastering (3/mo), AI mix assistant,
							beat selling, 5 podcast episodes, live streaming, radio, 25GB
						</p>
					</div>

					<div className="pricing-preview-card pro popular">
						<div className="preview-popular">Most Popular</div>
						<h4>Pro</h4>
						<div className="preview-price">$34.99<span>/mo</span></div>
						<div className="preview-subprice">$349/year</div>
						<p>
							16 tracks, AI mastering (15/mo), AI Radio DJ, unlimited podcasts,
							4K export, beat store + courses, 100GB
						</p>
					</div>

					<div className="pricing-preview-card studio">
						<h4>Studio</h4>
						<div className="preview-price">$49.99<span>/mo</span></div>
						<div className="preview-subprice">$499/year</div>
						<p>
							32 studio tracks, unlimited AI mastering, AI voice cloning,
							8K video export, simulcast streaming, AI commercial generator,
							Synth Creator, Drum Designer, and advanced creator tools.
						</p>
					</div>
				</div>

				<h3 style={{ marginTop: "40px" }}>Music Distribution</h3>

				<div className="pricing-preview-grid">
					<div className="pricing-preview-card">
						<h4>Standalone Artist</h4>
						<div className="preview-price">$21.99<span>/year</span></div>
						<p>
							Distribution for 1 artist to Spotify, Apple Music, Amazon,
							TikTok, and 150+ platforms.
						</p>
					</div>

					<div className="pricing-preview-card">
						<h4>Label</h4>
						<div className="preview-price">$79.99<span>/year</span></div>
						<p>
							Distribution plan for up to 5 artists under one label account.
						</p>
					</div>
				</div>

				<div className="pricing-preview-cta">
					<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
				</div>

				<div style={{ marginTop: "20px" }}>
					<h4 style={{ marginBottom: "8px" }}>AI Credits</h4>
					<p style={{ opacity: 0.85 }}>
						AI tools use pay-as-you-go credits, so creators only pay for the AI they actually use.
					</p>
				</div>
			</section>

			{/* ================================================================
			    EARNINGS COMPARISON / REVENUE COMPARISON
			    ================================================================ */}
			<section className="earnings">
				<h2>💰 Keep More of What You Earn</h2>
				<p className="section-subtitle">
					Whether it&apos;s music royalties, beat sales, podcast subscriptions, tips, or merch — you keep 90%.
				</p>

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

					<div className="earnings-row">
						<span className="platform-name">BeatStars</span>
						<div className="bar-container">
							<div className="bar beatstars-bar" style={{ width: "70%" }}>70%</div>
						</div>
					</div>

					<div className="earnings-row">
						<span className="platform-name">Sonicbids/EPK.fm</span>
						<div className="bar-container">
							<div className="bar beatstars-bar" style={{ width: "0%" }}>$10–20/mo (no revenue)</div>
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
			    SOCIAL PROOF
			    ================================================================ */}
			<section className="social-proof">
				<h2>🌟 Trusted by Creators</h2>
				<p className="section-subtitle">
					Musicians, producers, podcasters, gamers, and video creators are building their empires on StreamPireX.
				</p>

				<div className="social-proof-grid">
					<div className="proof-card">
						<div className="proof-quote">
							&quot;I replaced 8 separate apps with StreamPireX. The beat store and MPC sampler alone pay for my subscription.&quot;
						</div>
						<div className="proof-author">— Independent Producer</div>
					</div>

					<div className="proof-card">
						<div className="proof-quote">
							&quot;AI mastering saved me hundreds per month. The EPK builder got me booked at three festivals. I keep 90%.&quot;
						</div>
						<div className="proof-author">— Hip-Hop Artist</div>
					</div>

					<div className="proof-card">
						<div className="proof-quote">
							&quot;Podcast studio + video editor + distribution + collab hub in one platform? No brainer. And the AI DJ is incredible.&quot;
						</div>
						<div className="proof-author">— Podcast Creator</div>
					</div>
				</div>
			</section>

			{/* ================================================================
			    FINAL CTA
			    ================================================================ */}
			<section className="final-cta">
				<h2>Ready to Create Without Limits?</h2>
				<p>
					Join StreamPireX and get an AI-powered recording studio, MPC beat maker, voice-to-MIDI,
					beat store, podcast studio, EPK builder, collab marketplace, AI video generation,
					AI commercial generator, mix assistant, mastering, music distribution, video editing,
					live streaming, and more — all in one platform. Keep 90% of everything you earn.
				</p>

				<div className="cta-buttons">
					<a href="#waitlist" className="btn btn-primary btn-lg">Join the Waitlist</a>
					<a href="#waitlist" className="btn btn-outline-light btn-lg">Request Early Access</a>
				</div>

				<div className="cta-secondary-links">
					<a href="#waitlist" className="cta-link">Build Your EPK</a>
					<span className="cta-divider">•</span>
					<a href="#waitlist" className="cta-link">Browse Beat Store</a>
					<span className="cta-divider">•</span>
					<a href="#waitlist" className="cta-link">AI Video Studio</a>
					<span className="cta-divider">•</span>
					<a href="#waitlist" className="cta-link">Podcast Studio</a>
					<span className="cta-divider">•</span>
					<a href="#waitlist" className="cta-link">Recording Studio</a>
					<span className="cta-divider">•</span>
					<Link to="/squad-finder" className="cta-link">Gaming Hub</Link>
					<span className="cta-divider">•</span>
					<a href="#waitlist" className="cta-link">Marketplace</a>
				</div>
			</section>

			{/* ================================================================
			    EARLY ACCESS / WAITLIST
			    ================================================================ */}
			<section
				style={{
					background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
					padding: "80px 20px",
					textAlign: "center",
					borderTop: "1px solid #30363d"
				}}
			>
				<div id="waitlist">
					<WaitlistSection />
				</div>
			</section>

			{/* ================================================================
			    FOOTER
			    ================================================================ */}
			<footer className="home-footer">
				<div className="footer-content">
					<div className="footer-brand">
						<h3>StreamPireX</h3>
						<p>© {new Date().getFullYear()} Eye Forge Studios LLC. The Creator Platform Built for Every Voice.</p>
					</div>

					<div className="footer-columns">
						<div className="footer-col">
							<h5>Create</h5>
							<Link to="/recording-studio">Recording Studio</Link>
							<Link to="/beats">Beat Store</Link>
							<Link to="/podcast-studio">Podcast Studio</Link>
							<Link to="/video-editor">Video Editor</Link>
							<Link to="/epk-collab-hub">EPK Builder</Link>
						</div>

						<div className="footer-col">
							<h5>AI Tools</h5>
							<Link to="/ai-mastering">AI Mastering</Link>
							<Link to="/ai-stem-separation">AI Stem Separation</Link>
							<Link to="/ai-video-studio">AI Video Studio</Link>
							<Link to="/hum-to-song">Hum to Song</Link>
							<Link to="/ai-text-to-song">Text to Song</Link>
							<Link to="/airadio-dj">AI Radio DJ</Link>
							<Link to="/voice-clone-services">AI Voice Clone</Link>
						</div>

						<div className="footer-col">
							<h5>Community</h5>
							<Link to="/home-feed">Social Feed</Link>
							<Link to="/squad-finder">Gaming Hub</Link>
							<Link to="/collab-marketplace">Collab Marketplace</Link>
							<Link to="/marketplace">Marketplace</Link>
							<Link to="/browse-radio-stations">Radio Stations</Link>
							<Link to="/live-streams">Live Streaming</Link>
						</div>

						<div className="footer-col">
							<h5>Company</h5>
							<Link to="/pricing">Pricing</Link>
							<Link to="/terms">Terms</Link>
							<Link to="/privacy">Privacy</Link>
							<Link to="/contact">Contact</Link>
						</div>
					</div>
				</div>
			</footer>

		</div>
	);
};

export default Home;