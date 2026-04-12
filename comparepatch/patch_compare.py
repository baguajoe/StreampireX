#!/usr/bin/env python3
"""
patch_compare.py — StreamPireX Compare Page Update
Adds 3D Mesh, Puppet, SPX Broadcast Studio sections
Updates pricing, stats, radio pricing
"""
import re, shutil

BASE = '/workspaces/SpectraSphere'
COMPARE = f'{BASE}/src/front/js/pages/ComparePage.js'

shutil.copy(COMPARE, COMPARE + '.bak_compare')

with open(COMPARE) as f:
    content = f.read()

# =============================================================================
# 1. Update hero stats bar
# =============================================================================
content = content.replace(
    '<div className="sv orange">15+</div>\n                            <div className="sl">Tools Replaced</div>',
    '<div className="sv orange">20+</div>\n                            <div className="sl">Tools Replaced</div>'
)
content = content.replace(
    '<div className="sv orange">$350</div>\n                            <div className="sl">Monthly Cost Saved</div>',
    '<div className="sv orange">$350+</div>\n                            <div className="sl">Monthly Cost Saved</div>'
)
print("✓ Stats updated")

# =============================================================================
# 2. Update sticky nav — add 3D and Broadcast
# =============================================================================
content = content.replace(
    '<a href="#creative">CREATIVE SUITE</a>',
    '<a href="#creative">CREATIVE SUITE</a>\n                <a href="#3d">3D &amp; ANIMATION</a>\n                <a href="#broadcast">BROADCAST</a>'
)
print("✓ Nav updated")

# =============================================================================
# 3. Update hero sub description
# =============================================================================
content = content.replace(
    'DAW · Beat Maker · Video Editor · Podcast Studio · Radio Stations · Music\n                            Distribution · Live Streaming · EPK Builder · AI Tools · Social Network ·\n                            Gaming Hub — all in one platform vs 20+ competitors across every category.',
    'DAW · Beat Lab · Video Editor · Podcast Studio · Radio + Live Broadcast · Music\n                            Distribution · 3D Mesh Editor · 2D Puppet Animation · SPX Script · AI Tools · Social Network ·\n                            Gaming Hub · Film Platform · Creator Academy — all in one platform vs 20+ competitors.'
)
print("✓ Hero description updated")

# =============================================================================
# 4. Update Creative Suite section — add 3D Mesh and Puppet rows
# =============================================================================
old_creative = '''<tr className="cat"><td colSpan="7">🎛️ SPX Analog Suite</td></tr>'''
new_creative_addition = '''<tr className="cat"><td colSpan="7">🎛️ SPX Analog Suite</td></tr>'''

# Add 3D Mesh and Puppet after the creative section closing
old_creative_end = '''</section>
                </div>
                {/* ================================================================'''
# Find the creative section and add new sections after it
old_after_creative = re.search(
    r'(<div className="sec-head" id="revenue">)',
    content
)

if old_after_creative:
    insert_pos = old_after_creative.start()
    new_sections = '''<div className="sec-head" id="3d">
                    <h2>🧊 SPX 3D Mesh + 🎭 SPX Puppet</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Blender · Maya · Adobe Character Animator · Adobe Fuse · Mixamo</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th className="feat-col">Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Blender</th>
                                <th>Maya</th>
                                <th>Adobe Ch. Animator</th>
                                <th>Mixamo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="6">🧊 SPX 3D Mesh Editor</td></tr>
                            <tr><td>3D Modeling &amp; Sculpting</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>BVH MoCap Import/Export</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AnimGraph / BlendTree / StateMachine</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>MediaPipe Real-time MoCap</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Cloth Simulation</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Hair Suite (3 panels + FX)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>FLIP Fluid + APIC GPU Solver</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>GPU Path Tracer</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>VFX / Particle / Destruction</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Crowd System</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Desktop Electron Build</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>VST3/CLAP Plugin Hosting (desktop)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Browser version (no install)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Integrated with Creator Platform</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>$49.99/mo (Pro)</td><td>Free (desktop)</td><td>$250/mo</td><td>$54.99/mo</td><td>Free / $15/mo</td></tr>

                            <tr className="cat"><td colSpan="6">🎭 SPX Puppet — 2D Character Animation</td></tr>
                            <tr><td>Auto-Rig from artwork</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>FABRIK IK (arm, leg, chain)</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>MediaPipe Real-time Face/Pose/Hand</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI Voice (ElevenLabs)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Auto Lip Sync</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Film Pipeline (SceneSequencer, CameraAnimator)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>GLB Bridge from 3D Mesh Editor</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pressure-sensitive Draw Panel</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>$49.99/mo (Pro)</td><td>N/A</td><td>N/A</td><td>$54.99/mo</td><td>Free / $15/mo</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* ================================================================ */}
                <div className="sec-head" id="broadcast">
                    <h2>📺 SPX Broadcast Studio</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs StreamYard · Riverside.fm · Restream · Ecamm Live · vMix</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th className="feat-col">Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>StreamYard</th>
                                <th>Riverside.fm</th>
                                <th>Restream</th>
                                <th>Ecamm Live</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="6">📹 Multi-Host Broadcasting</td></tr>
                            <tr><td>Multi-host video (up to 4)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Browser-based (no download)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span> Mac only</td></tr>
                            <tr><td>Screen share any tab/window</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>5 video layouts (Solo/Grid/Spotlight/Interview/Panel)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Lower thirds + ticker overlay</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Session recording (audio + video)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr className="cat"><td colSpan="6">📻 Radio Station Integration (UNIQUE to SPX)</td></tr>
                            <tr><td>Wired to existing radio station</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Station audio keeps broadcasting during video</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Auto DJ resumes after broadcast ends</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>BMI/ASCAP/SESAC song log + PRO export</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr className="cat"><td colSpan="6">🎛️ SPX Tool Integration (UNIQUE to SPX)</td></tr>
                            <tr><td>Screen share SPX Beat Lab live</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Screen share SPX DJ Mixer live</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Screen share SPX Studio DAW live</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr className="cat"><td colSpan="6">💰 Monetization</td></tr>
                            <tr><td>Live tip jar</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Listener song requests</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Ticketed live events</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing (starting)</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>$19.99/mo</td><td>$49/mo</td><td>$24/mo</td><td>$49/mo</td><td>$16/mo</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* ================================================================ */}
                '''
    content = content[:insert_pos] + new_sections + content[insert_pos:]
    print("✓ 3D Mesh, Puppet, Broadcast Studio sections added")

# =============================================================================
# 5. Update pricing section tiers
# =============================================================================
# Find pricing rows and update
content = content.replace(
    'Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$12.99/mo</td>',
    'Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$19.99/mo</td>'
)

# Update the main pricing section if it has old prices
content = content.replace('$34.99', '$31.99')
content = content.replace('$59.99/mo', '$49.99/mo')
print("✓ Pricing updated")

# =============================================================================
# 6. Update Beat Maker section — add vintage engine names
# =============================================================================
content = content.replace(
    'vs Roland · Akai MPC · Native Instruments · BeatStars · Splice',
    'vs Roland · Akai MPC · Native Instruments · BeatStars · Splice · Maschine'
)

# Add vintage engines row to beat maker section
old_beat_core = '<tr className="cat"><td colSpan="7">🎹 Core Beat Making</td></tr>'
new_beat_core = '''<tr className="cat"><td colSpan="7">🎹 Core Beat Making</td></tr>
                            <tr><td>Vintage hardware DSP engines</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span> 7 engines</td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>SPX-1200 (E-mu · 26kHz · boom bap DSP)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>SPX-3000 / SPX-60 / SPX-950 engines</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>SPX-Trident (3-engine unified + master clock)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>'''
content = content.replace(old_beat_core, new_beat_core)
print("✓ Beat Lab vintage engines added")

# =============================================================================
# 7. Update Recording Studio section — add console boards
# =============================================================================
old_daw_cat = '<tr className="cat"><td colSpan="9">🎙️ Core DAW Capabilities</td></tr>'
new_daw_addition = '''<tr className="cat"><td colSpan="9">🎙️ Core DAW Capabilities</td></tr>
                            <tr><td>Analog console characters (SSL/Neve/API/Trident/Studer/MCI)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span> 8 boards</td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>22-profile monitor speaker simulator</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>VoxEngine (vocoder · formant · harmonizer · arp)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>'''
content = content.replace(old_daw_cat, new_daw_addition)
print("✓ Recording Studio console boards added")

# =============================================================================
# 8. Update streaming section — add Broadcast Studio rows
# =============================================================================
old_streaming_tag = 'vs Restream · StreamYard · Twitch · YouTube Live · Kick'
new_streaming_tag = 'vs Restream · StreamYard · Twitch · YouTube Live · Kick · Riverside.fm'
content = content.replace(old_streaming_tag, new_streaming_tag)

# Add broadcast-specific rows to streaming section
old_stream_pricing = 'Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$0 free tier</td><td>$49/mo</td><td>$49/mo</td><td>Free</td><td>Free</td><td>Free</td></tr>'
new_stream_pricing = '''Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$0 free tier</td><td>$49/mo</td><td>$49/mo</td><td>Free</td><td>Free</td><td>Free</td></tr>
                            <tr><td>Wired to radio station (video + audio simultaneously)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>SPX tool screen share (Beat Lab, DJ Mixer, Studio)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>BMI/ASCAP song log + PRO CSV export</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>'''
content = content.replace(old_stream_pricing, new_stream_pricing)
print("✓ Streaming section updated with Broadcast Studio rows")

# Write file
with open(COMPARE, 'w') as f:
    f.write(content)

print("\n✅ ComparePage.js patched. Run: npm run build")
