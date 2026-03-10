// =============================================================================
import WaitlistSection from "../component/WaitlistSection";
// Home.js — StreamPireX Landing Page (Updated Mar 2026)
// =============================================================================
// Section order (ranked by community size & revenue impact):
//   Hero → Problem/Solution → Cost Comparison →
//   FREE Features Banner →
//   Social Network Spotlight (free, biggest user base) →
//   Gaming Hub Spotlight (free, 3B+ market) →
//   Core Features Grid →
//   AI Tools → EPK & Collabs → Beat Store → Podcast →
//   How It Works → Creator Types → Why StreamPireX →
//   Pricing → Earnings → Social Proof → Final CTA → Footer
// =============================================================================

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
						Replace 15+ tools with one platform. Recording studio, MPC-style beat maker,
						AI mastering, voice-to-MIDI, beat store, podcast studio, music distribution,
						video editing, live streaming, EPK builder, collab marketplace, gaming
						communities, and monetization — keep 90% of your earnings.
					</p>

					{!user ? (
						<div className="cta-buttons">
							<a href="#waitlist" className="btn btn-primary">Join the Waitlist</a>
							<a href="#waitlist" className="btn btn-outline-light">Request Access</a>
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
					<div className="stat-item">
						<span className="stat-number">📋</span>
						<span className="stat-label">EPK & Collabs</span>
					</div>
					<div className="stat-item">
						<span className="stat-number">🎹</span>
						<span className="stat-label">Beat Store & MPC</span>
					</div>
				</div>

				<div className="hero-image-placeholder">🎸</div>
			</header>

			{/* ================================================================
			    PROBLEM / SOLUTION  — moved up, hooks visitors fast
			    ================================================================ */}
			<section className="problem-solution">
				<div className="problem">
					<h3>😫 The Creator Problem</h3>
					<p>
						Juggling 15+ apps for distribution, editing, streaming, analytics, and payments.
						Losing 30–50% of earnings to platform fees. No ownership of your audience.
						Paying $100+/month across separate tools. No simple way to mix or master without
						expensive software. Separate platforms for beat sales, podcast hosting, EPK
						hosting, and merch. No way to find collaborators without leaving the platform.
					</p>
				</div>
				<div className="solution">
					<h3>✨ The StreamPireX Solution</h3>
					<p>
						One AI-powered platform for everything. Record, mix, and master with AI help.
						Make beats with the MPC sampler. Sell beats with auto-generated license agreements.
						Host and monetize podcasts. Distribute to 150+ platforms. Stream live. Run 24/7
						radio with an AI DJ. Edit video. Build your EPK and find collaborators. Generate
						AI promo commercials. Build gaming communities. Keep 90% of your earnings — all
						starting at $12.99/month.
					</p>
				</div>
			</section>

			{/* ================================================================
			    COST COMPARISON
			    ================================================================ */}
			<section className="comparison-section">
				<h2>💸 Stop Paying for 15 Separate Tools</h2>
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
							<li>🎵 Distribution — $20–50/yr</li>
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
						<p className="comparison-total">Starting at $12.99/month — Keep 90%</p>
					</div>
				</div>
			</section>

			{/* ================================================================
			    FREE FEATURES BANNER — NEW SECTION
			    ================================================================ */}
			<section className="free-features-banner">
				<div className="free-banner-inner">
					<div className="free-banner-header">
						<span className="free-badge-large">🆓 FREE FOREVER</span>
						<h2>Start Creating Without Spending a Dime</h2>
						<p>No credit card. No trial. No catch. These are yours the moment you sign up.</p>
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
							<h4>Recording Studio</h4>
							<p>4-track DAW with full FX chain, arranger, piano roll, and AI mix assistant</p>
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
						<a href="#waitlist" className="btn btn-primary btn-lg">Join the Waitlist — Be First</a>
					</div>
				</div>
			</section>

			{/* ================================================================
			    SOCIAL NETWORK SPOTLIGHT — moved up (free + biggest user base)
			    ================================================================ */}
			<section className="social-network-spotlight">
				<h2>👥 Your Social Network. Your Audience. Your Platform.</h2>
				<p className="section-subtitle">
					Build your audience where your tools live. Free on every plan — no separate app needed.
				</p>
				<div className="social-features-grid">
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
			    GAMING HUB SPOTLIGHT — moved up (free + 3B gamers globally)
			    ================================================================ */}
			<section className="gaming-hub-spotlight">
				<div className="gaming-header">
					<h2>🎮 Gaming Hub — Built for the Community</h2>
					<span className="gaming-free-tag">FREE on All Plans</span>
				</div>
				<p className="section-subtitle">
					3 billion gamers globally. Squad finder, team rooms, chatrooms, streaming, and monetization —
					all inside the same platform where you make music, edit videos, and run your creative business.
				</p>
				<div className="gaming-features-grid">
					<div className="gaming-feature">
						<span className="gaming-icon">🔍</span>
						<h4>Squad Finder</h4>
						<p>Find teammates by game, rank, playstyle, and region. No more random matchmaking.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">🧑‍🤝‍🧑</span>
						<h4>Team Rooms</h4>
						<p>Private rooms for your squad — voice chat, strategy, scheduling, and coordination. 1 free team room.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">💬</span>
						<h4>Gamer Chatrooms</h4>
						<p>Public and private chatrooms by game, genre, and community — with real-time notification badges.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">📡</span>
						<h4>Game Streaming</h4>
						<p>Stream your gameplay live directly on StreamPireX. Chat, tips, and VOD recording — Creator+.</p>
					</div>
					<div className="gaming-feature">
						<span className="gaming-icon">💰</span>
						<h4>Gaming Monetization</h4>
						<p>Accept tips during streams, sell gaming content, and earn from your community — Creator+.</p>
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
			    CORE FEATURES GRID
			    ================================================================ */}
			<section className="features">
				<h2>🎯 Everything You Need to Create &amp; Earn</h2>
				<p className="section-subtitle">Professional creator tools, simplified.</p>

				<div className="feature-grid">
					<div className="feature-card highlight">
						<div className="feature-icon">🎚️</div>
						<h4>Recording Studio</h4>
						<p>Multi-track DAW with full effects chain, arranger view, and AI mix analysis.</p>
						<span className="feature-tag new">DAW</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🥁</div>
						<h4>Beat Maker &amp; Sampler</h4>
						<p>MPC-style pads with 8 velocity layers, 4-bus routing, automation lanes, FL-style slice sequencing, and inline AI stem separation.</p>
						<span className="feature-tag new">NEW</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🤖</div>
						<h4>AI Mix Assistant</h4>
						<p>Auto-leveling, EQ conflict detection, compression guidance, and one-click fixes.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🎛️</div>
						<h4>AI Mastering</h4>
						<p>50 genre profiles, auto-detect BPM/key/mood, instant studio-quality masters.</p>
						<span className="feature-tag ai-tag">AI</span>
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
						<div className="feature-icon">🎵</div>
						<h4>Music Distribution</h4>
						<p>Spotify, Apple Music, Tidal, Amazon, TikTok, and 150+ more. Keep 90%.</p>
						<span className="feature-tag">150+</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>Video Editor</h4>
						<p>Browser-based multi-track timeline, effects, transitions, templates. Export up to 8K.</p>
						<span className="feature-tag">Free</span>
					</div>
					<div className="feature-card">
						<div className="feature-icon">🔴</div>
						<h4>Live Streaming</h4>
						<p>OBS &amp; WebRTC support, live chat, donations, VOD recording, simulcast.</p>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">📻</div>
						<h4>24/7 Radio Stations</h4>
						<p>Auto DJ + AI DJ personas, listener requests, scheduling, always-on broadcast.</p>
						<span className="feature-tag ai-tag">AI</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🎙️</div>
						<h4>Podcast Studio</h4>
						<p>Record, host, distribute to all directories. Video podcasts, remote guest recording, monetization, RSS feeds.</p>
						<span className="feature-tag new">NEW</span>
					</div>
					<div className="feature-card highlight">
						<div className="feature-icon">🎬</div>
						<h4>AI Video Studio</h4>
						<p>Generate videos from text or images with Kling v1.6 AI. Music videos, promo clips, visualizers, EPK commercials. Credits-based.</p>
						<span className="feature-tag ai-tag">AI</span>
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
			</section>

			{/* ================================================================
			    AI FEATURES (expanded grid)
			    ================================================================ */}
			<section className="ai-features-section">
				<h2>🤖 AI-Powered Creator Tools</h2>
				<p className="section-subtitle">Professional results. Zero experience needed. Powered by AI.</p>

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
						<p>Generate videos from text prompts or images using Kling v1.6 AI. Create music videos, visualizers, promo clips, and EPK commercials. 5 cinematic styles. Credits-based.</p>
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
			    EPK & COLLAB HUB SPOTLIGHT
			    ================================================================ */}
			<section className="epk-collab-spotlight">
				<h2>📋 EPK Builder &amp; Collaboration Hub</h2>
				<p className="section-subtitle">
					Your professional identity, collaboration pipeline, and AI promo generator — unified in one system. Free with every plan.
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
					<Link to="/epk-hub" className="btn btn-primary">Build Your EPK</Link>
					<Link to="/epk-hub" className="btn btn-outline-light">Find Collaborators</Link>
				</div>
			</section>

			{/* ================================================================
			    BEAT STORE SPOTLIGHT
			    ================================================================ */}
			<section className="beat-store-spotlight">
				<h2>🎹 Beat Store &amp; MPC Beat Maker</h2>
				<p className="section-subtitle">
					A full marketplace for producers and artists — plus a professional beat-making sampler with 16 pads, 64-step sequencer, and AI stem separation built in.
				</p>
				<div className="beat-store-features-grid">
					<div className="beat-store-feature">
						<span className="bs-icon">🎧</span>
						<h4>Preview &amp; License</h4>
						<p>Stream watermarked previews free. Buy Basic, Premium, Exclusive, or Stems licenses with instant download.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">📜</span>
						<h4>Auto License Agreements</h4>
						<p>Every purchase generates a full license agreement — distribution limits, streaming caps, credit terms, and usage rights.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">🥁</span>
						<h4>MPC Beat Maker</h4>
						<p>16 velocity-sensitive pads, 64-step sequencer, 4-bus routing with per-bus effects, per-step automation, FL-style slicer, and AI stem separation. Make beats entirely in-browser.</p>
					</div>
					<div className="beat-store-feature">
						<span className="bs-icon">💰</span>
						<h4>Producer Dashboard</h4>
						<p>Track plays, sales, and revenue. Manage licenses, set custom pricing, offer exclusive deals, and share your producer EPK. Keep 90%.</p>
					</div>
				</div>
				<div className="beat-store-cta">
					<Link to="/beats" className="btn btn-primary">Browse Beat Store</Link>
					<Link to="/sell-beats" className="btn btn-outline-light">Sell Your Beats</Link>
				</div>
			</section>

			{/* ================================================================
			    PODCAST STUDIO SPOTLIGHT
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
					<Link to="/podcast-create" className="btn btn-primary">Launch Your Podcast</Link>
					<Link to="/podcast-studio" className="btn btn-outline-light">Open Podcast Studio</Link>
				</div>
			</section>

			{/* ================================================================
			    HOW IT WORKS
			    ================================================================ */}
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
				<p className="section-subtitle">Start free. Upgrade when you're ready. No hidden fees. EPK is free on all plans.</p>
				<div className="pricing-preview-grid">
					<div className="pricing-preview-card">
						<h4>Free</h4>
						<div className="preview-price">$0</div>
						<p>Full video editor, 4 studio tracks, AI stem separation, beat store browsing, beat maker, EPK builder, collab hub, gaming hub, social feed, 5GB storage</p>
					</div>
					<div className="pricing-preview-card starter">
						<h4>Starter</h4>
						<div className="preview-price">$12.99<span>/mo</span></div>
						<p>8 studio tracks, AI mastering (3/mo), AI mix assistant, beat selling, 5 podcast episodes, live streaming, radio, 25GB</p>
					</div>
					<div className="pricing-preview-card creator popular">
						<div className="preview-popular">Most Popular</div>
						<h4>Creator</h4>
						<div className="preview-price">$22.99<span>/mo</span></div>
						<p>16 tracks, AI mastering (15/mo), AI Radio DJ, unlimited podcasts, 4K export, beat store + courses, AI video credits, 100GB</p>
					</div>
					<div className="pricing-preview-card pro">
						<h4>Pro</h4>
						<div className="preview-price">$31.99<span>/mo</span></div>
						<p>32 tracks, unlimited AI mastering, voice cloning, 8K, music distribution, AI commercial generator, unlimited everything, storefront</p>
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
				<p className="section-subtitle">
					Whether it's music royalties, beat sales, podcast subscriptions, tips, or merch — you keep 90%.
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
						<div className="proof-quote">"I replaced 8 separate apps with StreamPireX. The beat store and MPC sampler alone pay for my subscription."</div>
						<div className="proof-author">— Independent Producer</div>
					</div>
					<div className="proof-card">
						<div className="proof-quote">"AI mastering saved me hundreds per month. The EPK builder got me booked at three festivals. I keep 90%."</div>
						<div className="proof-author">— Hip-Hop Artist</div>
					</div>
					<div className="proof-card">
						<div className="proof-quote">"Podcast studio + video editor + distribution + collab hub in one platform? No brainer. And the AI DJ is incredible."</div>
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
					<Link to="/pricing" className="btn btn-outline-light btn-lg">View Pricing</Link>
				</div>
				<div className="cta-secondary-links">
					<Link to="/epk-hub" className="cta-link">Build Your EPK</Link>
					<span className="cta-divider">•</span>
					<Link to="/beats" className="cta-link">Browse Beat Store</Link>
					<span className="cta-divider">•</span>
					<Link to="/ai-video-studio" className="cta-link">AI Video Studio</Link>
					<span className="cta-divider">•</span>
					<Link to="/podcast-studio" className="cta-link">Podcast Studio</Link>
					<span className="cta-divider">•</span>
					<Link to="/recording-studio" className="cta-link">Recording Studio</Link>
					<span className="cta-divider">•</span>
					<Link to="/squad-finder" className="cta-link">Gaming Hub</Link>
					<span className="cta-divider">•</span>
					<Link to="/marketplace" className="cta-link">Marketplace</Link>
				</div>
			</section>


                        {/* ================================================================
                            EARLY ACCESS / WAITLIST
                            ================================================================ */}
                        <section style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", padding: "80px 20px", textAlign: "center", borderTop: "1px solid #30363d" }}>
                          <WaitlistSection />
                        </section>
			{/* ================================================================
			    FOOTER
			    ================================================================ */}
			<footer className="home-footer">
				<div className="footer-content">
					<div className="footer-brand">
						<h3>StreamPireX</h3>
						<p>© {new Date().getFullYear()} Eye Forge Studios LLC. The AI-Powered Creator Platform.</p>
					</div>
					<div className="footer-columns">
						<div className="footer-col">
							<h5>Create</h5>
							<Link to="/recording-studio">Recording Studio</Link>
							<Link to="/beats">Beat Store</Link>
							<Link to="/podcast-studio">Podcast Studio</Link>
							<Link to="/video-editor">Video Editor</Link>
							<Link to="/epk-hub">EPK Builder</Link>
						</div>
						<div className="footer-col">
							<h5>AI Tools</h5>
							<Link to="/ai-mastering">AI Mastering</Link>
							<Link to="/ai-stems">AI Stem Separation</Link>
							<Link to="/ai-video-studio">AI Video Studio</Link>
							<Link to="/hum-to-song">Hum to Song</Link>
							<Link to="/ai-song">Text to Song</Link>
							<Link to="/ai-radio-dj">AI Radio DJ</Link>
							<Link to="/voice-services">AI Voice Clone</Link>
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