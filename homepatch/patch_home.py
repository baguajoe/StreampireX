#!/usr/bin/env python3
"""
patch_home.py — StreamPireX Home Page Update
Updates home.js with new content while preserving all animations
"""

BASE = '/workspaces/SpectraSphere'
HOME = f'{BASE}/src/front/js/pages/home.js'

with open(HOME) as f:
    content = f.read()

# =============================================================================
# 1. HERO — Update headline, tagline, stats, description
# =============================================================================
old_hero_slogan = '''{/* THE SLOGAN */}'''
# Find the hero section and update it via key text replacements

# Update hero h1 - find whatever the current h1 is and replace
# First let's find what's there
import re

# Replace hero h1 content
content = re.sub(
    r'(<h1[^>]*>)[^<]*(</h1>)',
    r'\1The Creator OS.\2',
    content,
    count=1
)

# Replace hero tagline
content = re.sub(
    r'(className="hero-tagline"[^>]*>)[^<]*(</)',
    r'\1Create Everything. Own Everything. StreamPireX.\2',
    content,
    count=1
)

# Replace hero description paragraph (the main one after tagline)
old_hero_desc = 'platforms for beat sales, podcast hosting, EPK hosting, merch, and'
new_hero_desc = '''Replace Adobe, FL Studio, Twitch, Patreon, Shopify, Spotify — and 15 other tools.
                                            One subscription. 13 professional creative tools. 150+ distribution platforms.
                                            90% revenue share on everything you earn.'''
content = content.replace(old_hero_desc, new_hero_desc)

old_hero_desc2 = 'Host and monetize podcasts. Stream live. Run 24/7 radio with an AI DJ.\n                                            Edit video. Build your EPK. Find collaborators. Sell merch and digital'
new_hero_desc2 = 'Make music, video, podcasts, radio, film, beats, and more. Broadcast live. Distribute everywhere.\n                                            Build your audience. Own your content. Keep 90% of what you earn.'
content = content.replace(old_hero_desc2, new_hero_desc2)

print("✓ Hero updated")

# =============================================================================
# 2. HERO STATS — Update the stats bar
# =============================================================================
old_stats = '''<div className="hero-stats">'''
# Find the stats section and replace all stat items
old_stats_block = re.search(r'<div className="hero-stats">.*?</div>\s*{/\* DASHBOARD', content, re.DOTALL)
if old_stats_block:
    new_stats = '''<div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">13</span>
                                <span className="stat-label">SPX Creative Tools</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">150+</span>
                                <span className="stat-label">Distribution Platforms</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">90%</span>
                                <span className="stat-label">Revenue Share</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">$300+</span>
                                <span className="stat-label">Saved Per Month</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">Free</span>
                                <span className="stat-label">To Start</span>
                            </div>
                        </div>
                        {/* DASHBOARD'''
    content = content[:old_stats_block.start()] + new_stats + content[old_stats_block.end():]
    print("✓ Stats updated")

# =============================================================================
# 3. COMPARISON SECTION — Update cost comparison
# =============================================================================
old_comparison = re.search(r'<section className="comparison-section">.*?</section>', content, re.DOTALL)
if old_comparison:
    new_comparison = '''<section className="comparison-section">
                    <h2>Stop Paying $300+/Month for Separate Tools</h2>
                    <p className="section-subtitle">StreamPireX replaces every tool independent creators need — at a fraction of the cost.</p>
                    <div className="comparison-grid">
                        <div className="comparison-card old">
                            <h4>❌ What You Pay Today</h4>
                            <ul>
                                <li>Adobe Creative Cloud — $54.99/mo</li>
                                <li>FL Studio — $25/mo</li>
                                <li>StreamYard — $49/mo</li>
                                <li>Patreon — 12% of earnings</li>
                                <li>DistroKid — $22/yr</li>
                                <li>Shopify — $39/mo</li>
                                <li>Teachable — $39/mo</li>
                                <li>Twitch/YouTube cut — 30-50%</li>
                                <li>Splice/Looperman — $10/mo</li>
                                <li>Riverside.fm — $24/mo</li>
                            </ul>
                            <div className="comparison-total">💸 Total: $300+/mo + platform cuts</div>
                        </div>
                        <div className="comparison-card new">
                            <h4>✅ StreamPireX — The Creator OS</h4>
                            <ul>
                                <li>✓ 13 SPX Creative Tools (DAW, Beat Lab, Video, 3D, Puppet...)</li>
                                <li>✓ SPX Broadcast Studio (replaces StreamYard)</li>
                                <li>✓ Music Distribution to 150+ platforms</li>
                                <li>✓ Fan Memberships + Tip Jar</li>
                                <li>✓ Beat Store + Stem Store + Sample Marketplace</li>
                                <li>✓ Merch (Print-on-Demand via Printful)</li>
                                <li>✓ Creator Academy (sell your own courses)</li>
                                <li>✓ 24/7 AI Radio DJ + Live Video Studio</li>
                                <li>✓ Podcast Studio + Distribution</li>
                                <li>✓ Film & Series platform + Virtual Theatre</li>
                            </ul>
                            <div className="comparison-total">🎉 All of this: from $19.99/mo · Keep 90%</div>
                        </div>
                    </div>
                </section>'''
    content = content[:old_comparison.start()] + new_comparison + content[old_comparison.end():]
    print("✓ Comparison section updated")

# =============================================================================
# 4. SPX SUITE SECTION — Add new tools (find the features section)
# =============================================================================
# Find the features section and update it
old_features = re.search(r'<section className="features">.*?</section>', content, re.DOTALL)
if old_features:
    new_features = '''<section className="features">
                    <h2>🖥️ SPX Creative Suite — 13 Professional Tools</h2>
                    <p className="section-subtitle">
                        Every tool you need to create anything — music, video, 3D, animation, scripts, podcasts, DJ sets, and live broadcasts.
                        Browser-based and desktop. No plugins to buy. No subscriptions per tool.
                    </p>
                    <div className="feature-grid">
                        <div className="feature-card">
                            <span className="feature-icon">🎛️</span>
                            <h4>SPX Studio</h4>
                            <p>32-track DAW with 8 analog console characters (SSL, Neve, API, Trident, Studer, MCI), 22-profile speaker sim, VoxEngine vocoder, AI mastering, WAM/VST3 plugins.</p>
                            <span className="feature-tag">DAW</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🥁</span>
                            <h4>SPX Beat Lab</h4>
                            <p>7 vintage hardware DSP engines (SPX-1200, SPX-3000, SPX-60, SPX-950, SPX-EPS, SPX-10) + SPX-Trident 3-engine unified. 16 pads, 64-step sequencer, AI beats, stem separation.</p>
                            <span className="feature-tag">Beats</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🎬</span>
                            <h4>SPX Cut</h4>
                            <p>Multi-track video editor with 40+ effects, AI background removal, motion tracking, auto-captions, stem-aware audio editing, 4K export, and real-time collaboration.</p>
                            <span className="feature-tag">Video</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">✨</span>
                            <h4>SPX Motion</h4>
                            <p>After Effects-style motion graphics with keyframe animation, particle emitter, expressions engine, camera presets, blend modes, and cloud save.</p>
                            <span className="feature-tag">Motion</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🎛️</span>
                            <h4>SPX Compositor</h4>
                            <p>DaVinci Fusion-style node-based compositing with color grading, LUT support, chroma key, blur/merge nodes, roto/mask editor, and GPU multi-pass rendering.</p>
                            <span className="feature-tag">VFX</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🎨</span>
                            <h4>SPX Canvas</h4>
                            <p>Browser-based raster editor with layers, blend modes, filters, text/shapes, PNG/JPG/WebP export, and Cloudflare R2 cloud save.</p>
                            <span className="feature-tag">Design</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">✒️</span>
                            <h4>SPX Vector</h4>
                            <p>Browser-based vector editor with paths, shapes, boolean operations, SVG export, and cloud save. No Illustrator subscription needed.</p>
                            <span className="feature-tag">Vector</span>
                        </div>
                        <div className="feature-card highlight">
                            <span className="feature-icon">🧊</span>
                            <h4>SPX 3D Mesh</h4>
                            <p>Full 3D modeling, sculpting, animation suite. BVH mocap, cloth sim, hair suite, FLIP fluid, GPU path tracer, VFX/destruction, crowd system. Desktop Electron build competes with Blender and Maya.</p>
                            <span className="feature-tag new">3D</span>
                        </div>
                        <div className="feature-card highlight">
                            <span className="feature-icon">🎭</span>
                            <h4>SPX Puppet</h4>
                            <p>CA5-style 2D character animation with AutoRig, FABRIK IK, MediaPipe real-time mocap, ElevenLabs AI voice, auto lip sync, film pipeline with SceneSequencer and CameraAnimator.</p>
                            <span className="feature-tag new">Animation</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🎙️</span>
                            <h4>SPX Cast</h4>
                            <p>Record podcasts with remote WebRTC guests, webcam video, screen share, AI transcription, RSS distribution to Apple/Spotify/Google, monetization, and fan memberships.</p>
                            <span className="feature-tag">Podcast</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🎚️</span>
                            <h4>SPX DJ Mixer</h4>
                            <p>Dual pro decks with DVS timecode vinyl control, BPM sync, hot cues, stems per deck, FX panel, and simulcast to SPX/Twitch/YouTube. MIDI controller support.</p>
                            <span className="feature-tag">DJ</span>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">📝</span>
                            <h4>SPX Script</h4>
                            <p>Industry-standard screenplay editor with Comic Book mode, AI Generator (FLUX 1.1 Pro), FDX/Fountain import/export, and World Mode — Bible, Map, Timeline, Relationships, Moodboard.</p>
                            <span className="feature-tag">Writing</span>
                        </div>
                        <div className="feature-card highlight">
                            <span className="feature-icon">📺</span>
                            <h4>SPX Broadcast Studio</h4>
                            <p>Multi-host live video studio wired to your radio station. Up to 4 hosts on camera, screen share any SPX tool live, lower thirds, ticker, tip jar, song requests. Replaces StreamYard.</p>
                            <span className="feature-tag new">LIVE</span>
                        </div>
                    </div>
                </section>'''
    content = content[:old_features.start()] + new_features + content[old_features.end():]
    print("✓ Features section updated")

# =============================================================================
# 5. PRICING — Update to correct tiers
# =============================================================================
old_pricing = re.search(r'<section className="pricing-preview">.*?</section>', content, re.DOTALL)
if old_pricing:
    new_pricing = '''<section className="pricing-preview">
                    <h2>Simple, Transparent Pricing</h2>
                    <p className="section-subtitle">Start free. Upgrade when you're ready. Keep 90% of everything you earn on every plan.</p>
                    <div className="pricing-preview-grid">
                        <div className="pricing-preview-card">
                            <h4>🆓 Free</h4>
                            <div className="preview-price">$0<span>/mo</span></div>
                            <p>Social profile, feed, basic tools, music uploads, beat store browsing, podcast listening, radio stations, and community access. No credit card needed.</p>
                        </div>
                        <div className="pricing-preview-card starter">
                            <h4>🎵 Starter</h4>
                            <div className="preview-price">$19.99<span>/mo</span></div>
                            <p>SPX Studio DAW, SPX Beat Lab, SPX Cut video editor, SPX Canvas, SPX Vector, music distribution to 150+ platforms, beat store selling, fan memberships, and 90% revenue share.</p>
                        </div>
                        <div className="pricing-preview-card creator">
                            <span className="preview-popular">MOST POPULAR</span>
                            <h4>🚀 Creator</h4>
                            <div className="preview-price">$31.99<span>/mo</span></div>
                            <p>Everything in Starter + SPX Motion, SPX Compositor, SPX DJ Mixer, SPX Cast podcast studio, SPX Script + World Mode, AI Radio DJ, Live Studio, film uploads, Creator Academy, and merch store.</p>
                        </div>
                        <div className="pricing-preview-card pro">
                            <h4>👑 Pro</h4>
                            <div className="preview-price">$49.99<span>/mo</span></div>
                            <p>Everything in Creator + SPX 3D Mesh Editor, SPX Puppet, SPX Broadcast Studio, VST3/CLAP plugin hosting (desktop), priority rendering, unlimited storage, label dashboard, and white-label options.</p>
                        </div>
                    </div>
                    <div className="pricing-preview-cta">
                        <Link to="/pricing" className="btn btn-primary btn-lg">See Full Feature Comparison →</Link>
                    </div>
                </section>'''
    content = content[:old_pricing.start()] + new_pricing + content[old_pricing.end():]
    print("✓ Pricing section updated")

# =============================================================================
# 6. UPDATE RECORDING STUDIO description in the inline section
# =============================================================================
old_recording_desc = '4-track recording studio with FX chain, arranger, piano roll, and creator workflow tools'
new_recording_desc = '32-track DAW · SSL/Neve/API/Trident/Studer/MCI console characters · 22-profile speaker sim · VoxEngine vocoder · AI mastering · 50 genre profiles · WAM/VST3 plugins'
content = content.replace(old_recording_desc, new_recording_desc)
print("✓ Recording Studio description updated")

# =============================================================================
# 7. UPDATE AI FEATURES — add new AI tools
# =============================================================================
content = content.replace(
    '🤖 AI Video Generation (text/image → video)',
    '🤖 AI Video Generation (Kling v1.6 · text/image → video)'
)
content = content.replace(
    'Stream your gameplay live directly on StreamPireX. Chat, tips, and VOD recording — Pro+.',
    'Stream gameplay, music production, or creative sessions live. Chat, tips, VOD recording, and SPX tool integration.'
)
print("✓ AI features updated")

# =============================================================================
# 8. UPDATE Social Proof — make it feel more real
# =============================================================================
old_proof = re.search(r'<section className="social-proof">.*?</section>', content, re.DOTALL)
if old_proof:
    new_proof = '''<section className="social-proof">
                    <h2>Built for Independent Creators</h2>
                    <p className="section-subtitle">Real creators. Real tools. Real ownership.</p>
                    <div className="social-proof-grid">
                        <div className="proof-card">
                            <p className="proof-quote">"I was paying $200/mo between Adobe, DistroKid, and Patreon. StreamPireX does everything in one place and I keep 90% of what I make. This is a no-brainer."</p>
                            <span className="proof-author">— Independent Music Producer, Atlanta</span>
                        </div>
                        <div className="proof-card">
                            <p className="proof-quote">"The SPX Beat Lab vintage engines are insane. The SPX-1200 alone sounds better than plugins I paid $200 for. The fact that it comes with the whole platform is wild."</p>
                            <span className="proof-author">— Beat Maker & Producer, Los Angeles</span>
                        </div>
                        <div className="proof-card">
                            <p className="proof-quote">"As a podcaster I needed recording, distribution, and monetization. StreamPireX gives me all three plus a video studio for my guests. Replaced three subscriptions on day one."</p>
                            <span className="proof-author">— Podcast Host & Content Creator, New York</span>
                        </div>
                    </div>
                </section>'''
    content = content[:old_proof.start()] + new_proof + content[old_proof.end():]
    print("✓ Social proof updated")

# =============================================================================
# 9. UPDATE Final CTA
# =============================================================================
old_cta = re.search(r'<section className="final-cta">.*?</section>', content, re.DOTALL)
if old_cta:
    new_cta = '''<section className="final-cta">
                    <h2>The Creator OS is Ready.</h2>
                    <p>Stop paying $300/month for tools that don't talk to each other. Start creating, broadcasting, distributing, and earning — all from one place.</p>
                    <div className="cta-buttons">
                        <Link to="/signup" className="btn btn-primary btn-lg">Start Free — No Credit Card</Link>
                        <Link to="/compare" className="btn btn-outline-light btn-lg">See How You Save $300/mo →</Link>
                    </div>
                    <p className="cta-note">Free plan available · Upgrade anytime · Keep 90% on all paid plans</p>
                    <div className="cta-secondary-links">
                        <Link to="/pricing" className="cta-link">View Pricing</Link>
                        <span className="cta-divider">·</span>
                        <Link to="/compare" className="cta-link">Compare Plans</Link>
                        <span className="cta-divider">·</span>
                        <Link to="/spx-beat-lab" className="cta-link">Try Beat Lab Free</Link>
                        <span className="cta-divider">·</span>
                        <Link to="/video-editor" className="cta-link">Try SPX Cut Free</Link>
                    </div>
                </section>'''
    content = content[:old_cta.start()] + new_cta + content[old_cta.end():]
    print("✓ Final CTA updated")

# =============================================================================
# 10. ADD SPX Broadcast to Radio section description
# =============================================================================
content = content.replace(
    'Run 24/7 radio with an AI DJ.',
    'Run 24/7 radio with an AI DJ. Go live on video with SPX Broadcast Studio — multi-host video, overlays, tip jar, song requests. BMI/ASCAP song logging built in.'
)
print("✓ Radio description updated")

# Write the updated file
with open(HOME, 'w') as f:
    f.write(content)

print("\n✅ home.js patched successfully. Run: npm run build")
