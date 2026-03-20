import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "../../styles/compare.css";

const ComparePage = () => {
    useEffect(() => {
        document.title = "StreamPireX — Full Platform Competitive Analysis";
    }, []);

    return (
        <div className="compare-body">
            {/* STICKY NAV */}
            <nav className="sticky-nav">
                <span className="nav-brand">SPX</span>
                <a href="#daw">DAW</a>
                <a href="#sampler">BEAT MAKER</a>
                <a href="#video">VIDEO</a>
                <a href="#podcast">PODCAST</a>
                <a href="#radio">RADIO</a>
                <a href="#synth">SYNTH</a>
                <a href="#drums">DRUMS</a>
                <a href="#distribution">DISTRIBUTION</a>
                <a href="#streaming">STREAMING</a>
                <a href="#epk">EPK &amp; SOCIAL</a>
                <a href="#creative">CREATIVE SUITE</a>
                <a href="#film">FILM</a>
                <a href="#academy">ACADEMY</a>
                <a href="#revenue">REVENUE</a>
                <a href="#pricing">PRICING</a>

                <Link
                    to="/"
                    style={{
                        marginLeft: "auto",
                        color: "var(--teal)",
                        textDecoration: "none",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "11px",
                        whiteSpace: "nowrap",
                        padding: "14px 16px"
                    }}
                >
                    ← BACK
                </Link>
            </nav>

            <div className="wrap">
                {/* HERO */}
                <div className="hero-header">
                    <div>
                        <div className="eyebrow">// Full Platform Competitive Analysis — March 2026</div>
                        <h1>
                            StreamPireX
                            <br />
                            vs <em>Everyone</em>
                        </h1>
                        <p className="hero-sub">
                            DAW · Beat Maker · Video Editor · Podcast Studio · Radio Stations · Music
                            Distribution · Live Streaming · EPK Builder · AI Tools · Social Network ·
                            Gaming Hub — all in one platform vs 20+ competitors across every category.
                        </p>
                    </div>

                    <div className="hero-stats">
                        <div className="h-stat">
                            <div className="sv">90%</div>
                            <div className="sl">Revenue to Creator</div>
                        </div>
                        <div className="h-stat orange">
                            <div className="sv orange">15+</div>
                            <div className="sl">Tools Replaced</div>
                        </div>
                        <div className="h-stat">
                            <div className="sv">$0</div>
                            <div className="sl">Free Tier Forever</div>
                        </div>
                        <div className="h-stat orange">
                            <div className="sv orange">$350</div>
                            <div className="sl">Monthly Cost Saved</div>
                        </div>
                    </div>
                </div>

                {/* LEGEND */}
                <div className="legend">
                    <span><span className="y">✓</span> Full feature</span>
                    <span><span className="p">~</span> Partial / limited</span>
                    <span><span className="n">✗</span> Not available</span>
                    <span><span className="b b-free">FREE</span> Free on all plans</span>
                    <span><span className="b b-ai">AI</span> AI-powered</span>
                    <span><span className="b b-new">NEW</span> Recently added</span>
                    <span><span className="b b-unique">UNIQUE</span> Only on SPX</span>
                    <span style={{ color: "var(--muted)", fontSize: "10px" }}>
                        * = desktop/paid app benchmark
                    </span>
                </div>

                {/* 1. RECORDING STUDIO / DAW */}
                <div className="sec-head" id="daw">
                    <h2>🎚️ Recording Studio — DAW Core</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">
                        vs BandLab · LANDR · Soundtrap · Studio One · Suno · Fender · Tonalic
                    </div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>BandLab</th>
                                <th>LANDR</th>
                                <th>Soundtrap</th>
                                <th>Studio One*</th>
                                <th>Suno</th>
                                <th>Fender Play</th>
                                <th>Tonalic</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="9">🎙️ Core DAW Capabilities</td></tr>
                            <tr><td>Multi-track recording</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Arrange / Timeline view</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Mixer / Console view</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Piano Roll</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>15+ FX per track (EQ, Comp, Reverb, Delay…)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Multiband Compressor</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Parametric EQ (visual graph)</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pitch Correction (auto-tune)</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Audio-to-MIDI conversion</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Key Finder</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Mic Simulator</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Vocal Processor</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Speaker / Mix Translator (22 presets)</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">Plugin</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>WAM Plugin Support</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>MIDI export</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Real-time DAW collaboration</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="9">🤖 AI Studio Tools</td></tr>
                            <tr><td>AI Mix Assistant (auto-level, EQ conflict)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI Mastering (50 genre profiles)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI Stem Separation — Demucs (FREE)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="n">✗</span></td><td><span className="p">Paid</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Voice to MIDI (pitch + drum triggers)</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Hum to Song (AI full arrangement)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Text to Song (AI generation)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI Song Generation (no production needed)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="9">🌍 Platform &amp; Distribution</td></tr>
                            <tr><td>Browser-based (no download)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Music distribution built-in</td><td className="spx"><span className="y">✓</span> 150+</td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>90% revenue share</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 800 }}>✓ 90%</td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    * Studio One = industry-standard desktop DAW (paid benchmark, $99–$399). Suno =
                    AI song generator (no editing/mixing). Fender Play = guitar learning app. Tonalic
                    = music theory/key detection only.
                </p>

                {/* 2. SAMPLER + BEAT MAKER */}
                <div className="sec-head" id="sampler">
                    <h2>🥁 Sampler + Beat Maker</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">
                        vs BandLab · MPC Beats · FL Studio Web · Loopcloud · Splice
                    </div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>BandLab</th>
                                <th>MPC Beats</th>
                                <th>FL Studio Web</th>
                                <th>Loopcloud</th>
                                <th>Splice</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">🎹 Core Beat Making</td></tr>
                            <tr><td>MPC-style 16 pads</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>64-step sequencer</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Dedicated drum kit tab</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Chop engine (transient detect)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Time stretch per pad</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pitch shift per pad</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Per-pad FX chain</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>8 velocity layers per pad</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Song Mode / Arranger</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Clip Launcher</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>4-bus routing</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Per-step automation lanes</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Note repeat / roll</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Scale lock / chord mode</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Live loop recording</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Tape stop / filter sweep FX</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Bounce beat to DAW arrange</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Export WAV / MP3 / MIDI / Stems</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>

                            <tr className="cat"><td colSpan="7">🤖 AI Beat Features</td></tr>
                            <tr><td>Per-pad AI stem separation</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Hum / Text to Song (AI)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI beat suggestion</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Beat Store (sell beats + licenses)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Cloud save / load</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 3. VIDEO EDITOR */}
                <div className="sec-head" id="video">
                    <h2>🎬 Video Editor</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs CapCut · Descript · Runway ML · Adobe Premiere · DaVinci</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>CapCut</th>
                                <th>Descript</th>
                                <th>Runway ML</th>
                                <th>Adobe Pr.</th>
                                <th>DaVinci</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">🎞️ Editing Core</td></tr>
                            <tr><td>Multi-track timeline</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>7 editing tools</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>24 blend modes</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Bezier motion paths</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Particle emitter</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>40+ video effects</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Audio FX (EQ/comp/gate)</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Template library</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>4K export</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Real-time collaboration</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="7">🤖 AI Video Features</td></tr>
                            <tr><td>AI background removal</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Motion tracking</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Audio ducking (auto)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AI scene detection</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AI auto-captions</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Silence removal (AI)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI thumbnail generator</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI video gen (text/image → video)</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Stem-aware audio editing</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Monetization built-in</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    Runway ML = $76/mo (AI video generation only, no DAW). CapCut has no music
                    production. DaVinci has no AI music tools, distribution, or monetization.
                </p>

                {/* 4. PODCAST STUDIO */}
                <div className="sec-head" id="podcast">
                    <h2>🎙️ Podcast Studio</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">
                        vs Riverside.fm · Buzzsprout · Anchor · Patreon · Transistor · Podbean
                    </div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Riverside.fm</th>
                                <th>Buzzsprout</th>
                                <th>Anchor (Spotify)</th>
                                <th>Patreon</th>
                                <th>Transistor</th>
                                <th>Podbean</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="8">🎤 Recording &amp; Production</td></tr>
                            <tr><td>Record in-browser</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Remote guest recording</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Video podcast support</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AI transcription / captions</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Built-in audio editor / DAW</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="p">Basic</span></td><td><span className="n">✗</span></td><td><span className="p">Basic</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">Basic</span></td></tr>
                            <tr><td>Noise reduction / audio cleanup</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="8">📡 Hosting &amp; Distribution</td></tr>
                            <tr><td>RSS feed generation</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Apple / Spotify / Google distribution</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Unlimited episodes</td><td className="spx"><span className="y">✓</span> Creator+</td><td><span className="p">Paid</span></td><td><span className="p">Paid</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">Paid</span></td></tr>
                            <tr><td>Analytics &amp; listener data</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>

                            <tr className="cat"><td colSpan="8">💰 Monetization</td></tr>
                            <tr><td>Paid / subscription episodes</td><td className="spx"><span className="y">✓</span></td><td><span className="p">Add-on</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Listener tipping</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Merch + digital product sales</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Creator revenue share</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 800 }}>90%</td><td>100%</td><td>100%</td><td>100%</td><td>88–95%</td><td>100%</td><td>~80%</td></tr>
                            <tr><td>Membership / fan club tiers</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>

                            <tr className="cat"><td colSpan="8">🎯 Platform Extras</td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Video editor included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Social feed + community</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music distribution included</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Collab rooms (remote co-hosting)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    Patreon = membership platform (monetization only, no podcast hosting or
                    recording). Anchor = Spotify's free podcast tool (limited monetization, no
                    production tools). Riverside.fm = $24/mo for recording only.
                </p>

                {/* 5. RADIO STATIONS */}
                <div className="sec-head" id="radio">
                    <h2>📻 Radio Stations &amp; Broadcasting</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Live365 · Spreaker · Mixcloud · Shoutcast · Airtime Pro</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Live365</th>
                                <th>Spreaker</th>
                                <th>Mixcloud</th>
                                <th>Shoutcast</th>
                                <th>Airtime Pro</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">📡 Station Creation &amp; Broadcast</td></tr>
                            <tr><td>Create your own 24/7 radio station</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Auto DJ (unattended broadcast)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AI DJ with 7 personas</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI voice cloning for station</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Listener request system</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Show scheduling</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Live broadcasting</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Listener analytics</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>

                            <tr className="cat"><td colSpan="7">💰 Monetization &amp; Platform</td></tr>
                            <tr><td>Listener tipping</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Social network + community</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music distribution from same platform</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$12.99/mo</td><td>$15.99/mo</td><td>$7/mo</td><td>$15/mo</td><td>Free/$10</td><td>$19.99/mo</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    Live365 = radio hosting only ($15.99–$49.99/mo). Spreaker = podcast/radio
                    hybrid, no music production. Mixcloud = DJ mix hosting, not a full station
                    builder. Shoutcast = stream server only.
                </p>

                {/* 6. SYNTH */}
                <div className="sec-head" id="synth">
                    <h2>🎹 Synth &amp; Sound Design</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Vital · Arturia · Ableton · Chrome Music Lab · Moog Web</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Vital (web)</th>
                                <th>Arturia</th>
                                <th>Ableton</th>
                                <th>Chrome Music Lab</th>
                                <th>Moog Model D Web</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">🔊 Synthesis Engine</td></tr>
                            <tr><td>Multi-oscillator synth engine (browser)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span> Desktop</td><td><span className="n">✗</span> Desktop</td><td><span className="p">Basic</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>128 GM instruments (full family)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>ADSR envelope per voice</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Velocity-sensitive filter with envelope</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>16 MIDI channels</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>64-voice polyphony + voice stealing</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pitch bend + mod wheel + sustain</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Built-in reverb send</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>

                            <tr className="cat"><td colSpan="7">🎛️ Instrument Families</td></tr>
                            <tr><td>Piano / Chromatic Percussion</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Organ / Guitar / Bass</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Strings / Ensemble / Brass / Reed</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Synth Lead / Synth Pad / Synth FX</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">Lead only</span></td></tr>
                            <tr><td>Ethnic / Percussive / Sound FX</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="7">🔌 Integration &amp; Platform</td></tr>
                            <tr><td>External MIDI controller support (Web MIDI)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Virtual piano keyboard (browser)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Computer keyboard → MIDI</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Voice to MIDI (sing → notes)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Routes into DAW arrange / piano roll</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Sample library browser (500k+ sounds)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="n">✗</span></td><td><span className="p">Paid</span></td><td><span className="p">Paid</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>WAM plugin support</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music distribution built-in</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$0 free tier</td><td>Free / $80 desktop</td><td>$99–$599</td><td>$99/yr</td><td>Free</td><td>Free (web)</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    Vital = spectral warping wavetable synth (desktop/web, no DAW). Arturia =
                    hardware + software synth collection, desktop only. Ableton = industry-standard
                    desktop DAW with built-in synths. Chrome Music Lab = educational toy, not
                    production-ready. Moog Model D Web = single synth, no DAW or distribution.
                </p>

                {/* 7. DRUM MACHINE */}
                <div className="sec-head" id="drums">
                    <h2>🥁 Drum Machine &amp; Percussion</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">
                        vs Roland Cloud · Hydrogen · DrumBit · Beatmaker 3 · iZotope Neutron
                    </div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Roland Cloud (TR-808/909)</th>
                                <th>Hydrogen</th>
                                <th>DrumBit</th>
                                <th>Beatmaker 3</th>
                                <th>Groove Pizza</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">🎛️ Drum Machine Core</td></tr>
                            <tr><td>Step sequencer (64 steps)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">Basic</span></td></tr>
                            <tr><td>GM drum map (22 sounds: kick, snare, hats, toms, cymbals, cowbell…)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Synthesized drum tones (noise + tone layers)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>MPC-style 16 velocity pads</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>8 velocity layers per pad</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Per-pad FX chain</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Per-pad AI stem separation</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Note repeat / roll</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Tape stop / filter sweep FX</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Live loop recording</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>4-bus routing</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Per-step automation</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="7">🔗 Integration &amp; Sample Library</td></tr>
                            <tr><td>Sample library browser (500k+ Freesound CC)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">Paid</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Bounce pattern to DAW arrange</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Export WAV / MP3 / MIDI / Stems</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>External MIDI controller (Akai, Roland)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Browser-based (no download)</td><td className="spx"><span className="y">✓</span></td><td><span className="p">Partial</span></td><td><span className="n">✗</span> Desktop</td><td><span className="y">✓</span></td><td><span className="n">✗</span> iOS only</td><td><span className="y">✓</span></td></tr>
                            <tr><td>Music distribution built-in</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Beat store (sell your beats)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$0 free tier</td><td>$9.99–$19.99/mo</td><td>Free (desktop)</td><td>Free (web)</td><td>$14.99 (iOS)</td><td>Free (web)</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">
                    Roland Cloud = subscription for TR-808/909/707 browser plugins, no DAW or
                    distribution. Hydrogen = open-source desktop drum machine. DrumBit = simple
                    browser step sequencer. Beatmaker 3 = iOS only, no web/desktop. Groove Pizza =
                    educational NYU tool.
                </p>

                {/* 8. DISTRIBUTION */}
                <div className="sec-head" id="distribution">
                    <h2>🌍 Music Distribution</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs DistroKid · TuneCore · CD Baby · LANDR · Amuse</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>DistroKid</th>
                                <th>TuneCore</th>
                                <th>CD Baby</th>
                                <th>LANDR</th>
                                <th>Amuse</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Distribute to 150+ platforms</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Spotify, Apple Music, Tidal, Amazon</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>TikTok / YouTube distribution</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Revenue share to creator</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 800 }}>~90%</td><td>~80%</td><td>~80%</td><td>~80–91%</td><td>~80%</td><td>100%</td></tr>
                            <tr><td>Unlimited releases (plan)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">Per release fee</span></td><td><span className="p">Per release fee</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">Basic</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>AI Mastering included</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Podcast distribution too</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Beat store included</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Annual pricing (dist only)</td><td className="spx">$12.99/mo</td><td>$22.99/yr</td><td>$14.99/yr+</td><td>$9.95/release</td><td>$23.99/yr</td><td>Free / $59.99/yr</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 9. LIVE STREAMING */}
                <div className="sec-head" id="streaming">
                    <h2>📡 Live Streaming</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Restream · StreamYard · Twitch · YouTube Live · Kick</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Restream</th>
                                <th>StreamYard</th>
                                <th>Twitch</th>
                                <th>YouTube Live</th>
                                <th>Kick</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Live streaming (OBS/WebRTC)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Simulcast multi-platform</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>VOD recording</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Live chat + donations</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Creator revenue share</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 800 }}>90%</td><td>100%</td><td>100%</td><td>50%</td><td>55%</td><td>95%</td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music distribution included</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Gaming hub + squad finder</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Pricing (starting)</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>$0 free tier</td><td>$49/mo</td><td>$49/mo</td><td>Free</td><td>Free</td><td>Free</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 10. EPK */}
                <div className="sec-head" id="epk">
                    <h2>📋 EPK, Collab Hub &amp; Social Network</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Sonicbids · ReverbNation · SoundCloud · Bandcamp · Musosoup</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Sonicbids</th>
                                <th>ReverbNation</th>
                                <th>SoundCloud</th>
                                <th>Bandcamp</th>
                                <th>Musosoup</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>EPK builder (free)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="p">$7–20/mo</span></td><td><span className="p">$19.95/mo</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Collab marketplace</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Social feed + stories + DMs</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Waveform timestamped comments</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Apply with EPK to collabs</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>AI commercial generator</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Gaming hub</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{ color: "var(--teal)", fontWeight: 700 }}>FREE</td><td>$10–20/mo</td><td>$19.95/mo</td><td>Free / $11</td><td>Free (15% cut)</td><td>Free / £3.50/mo</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 9. COMMERCE & MARKETPLACE */}
                <div className="sec-head" id="merch">
                    <h2>🛍️ Merch &amp; Digital Marketplace</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Shopify · Fourthwall · Gumroad · Bandcamp</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Shopify</th>
                                <th>Fourthwall</th>
                                <th>Gumroad</th>
                                <th>Bandcamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="6">👕 Physical Merch (Print-on-Demand)</td></tr>
                            <tr><td>Integrated POD Designer</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="p">~</span> Needs App</td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Global Fulfillment (140+ hubs)</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="p">~</span> 3rd Party</td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Zero Upfront Inventory Cost</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Live Stream "Gifting" / Store Integration</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="p">~</span> Add-on</td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="6">💾 Digital Storefront (Assets &amp; Education)</td></tr>
                            <tr><td>Sell Sample Packs / Stems / Presets</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>MPC-to-Store Export (Direct)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>8K Course &amp; Workshop Hosting</td><td className="spx"><span className="y">✓</span> <span className="b b-ai">AI</span></td><td><span className="p">~</span> Needs App</td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Automated Digital Licensing</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="6">💰 Fees &amp; Payouts (The Bottom Line)</td></tr>
                            <tr><td>Monthly Subscription Fee</td><td className="spx" style={{ color: "var(--teal)" }}>$0 / $19.99</td><td>$39.00+</td><td>$0.00</td><td>$0.00</td><td>$0.00</td></tr>
                            <tr><td>Transaction Fee / Platform Take</td><td className="spx" style={{ fontWeight: 800 }}>10%</td><td>~5% + Sub</td><td>~5%</td><td>10%</td><td>15%</td></tr>
                            <tr><td>"Waveform" Social Buy Link</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                        </tbody>
                    </table>
                </div>

                {/* SPX CREATIVE SUITE */}
                <div className="sec-head" id="creative">
                    <h2>🎨 SPX Creative Suite</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Adobe After Effects · DaVinci Fusion · Figma · Illustrator · Final Cut</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>After Effects</th>
                                <th>DaVinci Fusion</th>
                                <th>Figma</th>
                                <th>Illustrator</th>
                                <th>Canva Pro</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">✨ SPX Motion Studio</td></tr>
                            <tr><td>Keyframe animation timeline</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Layer-based composition</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Particle emitter effects</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Easing curves (bounce, elastic, spring)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>WebM / video export</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Cloud save + File/Edit/View menus</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Browser-based (no download)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>

                            <tr className="cat"><td colSpan="7">🔀 SPX Node Compositor</td></tr>
                            <tr><td>Node-based compositing</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Chroma key / green screen</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Color grade nodes (LUT, curves)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>GPU multi-pass rendering</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Roto / mask editor</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="7">🖼️ SPX Canvas + ✒️ SPX Vector</td></tr>
                            <tr><td>Canvas / raster editor</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Vector / SVG editor</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Layers + blend modes</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Export PNG / JPG / WebP / SVG</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Cloud save to R2</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Music production included same platform</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>

                            <tr className="cat"><td colSpan="7">🎛️ SPX Analog Suite</td></tr>
                            <tr><td>Console FX channel strip</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Amp simulator (6 models)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Tape saturation + harmonic exciter</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Cabinet sim (4 types)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pedal chain (6 pedals)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>Included in subscription</td><td>$54.99/mo</td><td>Free (desktop)</td><td>$15/mo</td><td>$54.99/mo</td><td>$15/mo</td></tr>
                        </tbody>
                    </table>
                </div>
                <p className="footnote">After Effects = motion graphics only, $54.99/mo Adobe bundle. DaVinci Fusion = desktop only, free. Figma = design/vector, no video or audio. Neural DSP = $19.99/mo per amp plugin, no DAW.</p>

                {/* REVENUE */}
                <div className="sec-head" id="revenue">
                    <h2>💰 Revenue Share Comparison</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">Creator Earnings</div>
                </div>
                <div className="rev-grid">
                    <div className="rev-card spx">
                        <h4>StreamPireX</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "90%" }}></div></div>
                        <div className="rev-pct">90%</div>
                        <div className="rev-note">All revenue types</div>
                    </div>
                    <div className="rev-card">
                        <h4>Kick</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "95%" }}></div></div>
                        <div className="rev-pct">95%</div>
                        <div className="rev-note">Streaming only</div>
                    </div>
                    <div className="rev-card">
                        <h4>BeatStars</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "70%" }}></div></div>
                        <div className="rev-pct">70%</div>
                        <div className="rev-note">Beat sales only</div>
                    </div>
                    <div className="rev-card">
                        <h4>Patreon</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "88%" }}></div></div>
                        <div className="rev-pct">88–95%</div>
                        <div className="rev-note">Memberships only</div>
                    </div>
                    <div className="rev-card">
                        <h4>YouTube</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "55%" }}></div></div>
                        <div className="rev-pct">55%</div>
                        <div className="rev-note">Ad revenue</div>
                    </div>
                    <div className="rev-card">
                        <h4>Twitch</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "50%" }}></div></div>
                        <div className="rev-pct">50%</div>
                        <div className="rev-note">Subscriptions</div>
                    </div>
                    <div className="rev-card">
                        <h4>Spotify</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "30%" }}></div></div>
                        <div className="rev-pct">~30%</div>
                        <div className="rev-note">Streaming royalties</div>
                    </div>
                    <div className="rev-card">
                        <h4>Sonicbids / EPK.fm</h4>
                        <div className="rev-bar-bg"><div className="rev-bar" style={{ width: "0%" }}></div></div>
                        <div className="rev-pct">0%</div>
                        <div className="rev-note">$10–20/mo fee, no revenue</div>
                    </div>
                </div>

                {/* PRICING */}
                {/* 💎 PRICING COMPARISON GRID */}
                <div className="sec-head" id="pricing">
                    <h2>💎 Pricing vs What You'd Pay Separately</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">Cost Analysis — Updated Feb 2026</div>
                </div>

                <div className="price-grid">
                    {/* StreamPireX Pro - The Value King */}
                    <div className="price-card spx">
                        <h3>StreamPireX Pro</h3>
                        <div className="price-amt">$34.99<span style={{ fontSize: "1rem", color: "var(--muted)" }}>/mo</span></div>
                        <div className="price-sub">Everything. One login. 90% revenue share.</div>
                        <ul>
                            <li>Full DAW + MPC Sampler + AI Mix</li>
                            <li><strong>Included:</strong> Music Distribution (150+ hubs)</li>
                            <li><strong>NEW:</strong> Merch Designer & Global POD Fulfillment</li>
                            <li><strong>NEW:</strong> Digital Store (Beats, Stems, Courses)</li>
                            <li>4K Video Editor + AI Video Studio</li>
                            <li>Unlimited Podcasts + AI Radio DJ</li>
                            <li>Social Network + Gaming Hub</li>
                            <li>100GB Storage + Priority Support</li>
                        </ul>
                    </div>

                    {/* StreamPireX Studio - The Ultimate Suite */}
                    <div className="price-card spx" style={{ borderStyle: 'double', borderWidth: '4px' }}>
                        <h3>StreamPireX Studio</h3>
                        <div className="price-amt">$49.99<span style={{ fontSize: "1rem", color: "var(--muted)" }}>/mo</span></div>
                        <div className="price-sub">Total Creator Autonomy. Built for Agencies.</div>
                        <ul>
                            <li><strong>32 Studio Tracks</strong> + Unlimited AI Mastering</li>
                            <li><strong>AI Credits</strong> / month</li>
                            <li>8K Video Export + 24/7 AI Voice Cloning</li>
                            <li>Native Marketplace (Physical & Digital)</li>
                            <li>Unlimited Storage + Team Collaboration</li>
                            <li>Early Access to Beta Production Tools</li>
                        </ul>
                    </div>

                    {/* Competitor: Commerce Stack */}
                    <div className="price-card competitor">
                        <h3>Marketplace Stack</h3>
                        <div className="price-amt">$40–70/mo</div>
                        <div className="price-sub">Shopify + BeatStars + Gumroad</div>
                        <ul>
                            <li>Separate fees for Merch & Digital</li>
                            <li>Transaction fees up to 15%</li>
                            <li>No built-in content creation tools</li>
                            <li>Fragmented dashboards & analytics</li>
                        </ul>
                    </div>

                    {/* Competitor: Production Stack */}
                    <div className="price-card competitor">
                        <h3>Creative Stack</h3>
                        <div className="price-amt">$50–110/mo</div>
                        <div className="price-sub">FL Studio + DistroKid + Splice</div>
                        <ul>
                            <li>DAW (Desktop only) + Sound library</li>
                            <li>Separate annual distribution fees</li>
                            <li>No video editing or podcast tools</li>
                            <li>No native social marketplace exposure</li>
                        </ul>
                    </div>

                    {/* Competitor: Content Stack */}
                    <div className="price-card competitor">
                        <h3>Broadcast Stack</h3>
                        <div className="price-amt">$60–120/mo</div>
                        <div className="price-sub">Riverside + Restream + CapCut</div>
                        <ul>
                            <li>Streaming & Video editing focus</li>
                            <li>No music production or mixing</li>
                            <li>High monthly AI credit surcharges</li>
                            <li>No revenue-generating store hooks</li>
                        </ul>
                    </div>

                    {/* The Bottom Line */}
                    <div className="price-card loss">
                        <h3>All Tools Combined</h3>
                        <div className="price-amt">$210–420+/mo</div>
                        <div className="price-sub">18+ separate subscriptions</div>
                        <ul>
                            <li>Crippling subscription fatigue</li>
                            <li>Zero integration between creative tools</li>
                            <li>Split audience data & analytics</li>
                            <li>Multiple platform fee deductions</li>
                        </ul>
                    </div>
                </div>


                {/* 11. FILM & SERIES */}
                <div className="sec-head" id="film">
                    <h2>🎬 Film &amp; Series Platform</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Vimeo · Mubi · Eventive · Reelhouse · YouTube</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Vimeo</th>
                                <th>Mubi</th>
                                <th>Eventive</th>
                                <th>Reelhouse</th>
                                <th>YouTube</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">🎭 Theatre &amp; Upload</td></tr>
                            <tr><td>Upload films (free)</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="p">~</span> Storage limits</td><td><span className="n">✗</span> Curated only</td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Virtual theatre profile</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE</span></td><td><span className="p">~</span> Portfolio</td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span> Channel</td></tr>
                            <tr><td>IMDB-style credits (SAG, cast, crew)</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Festival laurels display</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr className="cat"><td colSpan="7">🎟️ Screenings &amp; Live Events</td></tr>
                            <tr><td>Schedule live premiere events</td><td className="spx"><span className="y">✓</span> <span className="b b-new">NEW</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Synchronized playback for all viewers</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Filmmaker controls playback for audience</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Live chat during screening</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Q&amp;A mode after screening</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Ticket sales (free + paid)</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr className="cat"><td colSpan="7">💰 Monetization</td></tr>
                            <tr><td>Rent film (48hr)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Buy film (permanent)</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Fan membership gated films</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Creator revenue share</td><td className="spx" style={{color:"var(--teal)",fontWeight:800}}>90%</td><td>~85%</td><td>~70%</td><td>~90%</td><td>~80%</td><td>~55%</td></tr>
                            <tr className="cat"><td colSpan="7">🏆 Community &amp; Festival</td></tr>
                            <tr><td>Monthly short film festival</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Community voting</td><td className="spx"><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Pricing</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>$0 free to upload</td><td>$12–$75/mo</td><td>$10.99/mo viewer</td><td>Custom</td><td>$20/mo</td><td>Free</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* 12. CREATOR ACADEMY */}
                <div className="sec-head" id="academy">
                    <h2>🎓 Creator Academy</h2>
                    <div className="sec-line"></div>
                    <div className="sec-tag">vs Teachable · Thinkific · Udemy · Skillshare · Kajabi</div>
                </div>
                <div className="tbl-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="spx">StreamPireX</th>
                                <th>Teachable</th>
                                <th>Thinkific</th>
                                <th>Udemy</th>
                                <th>Skillshare</th>
                                <th>Kajabi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="cat"><td colSpan="7">📚 Course Building</td></tr>
                            <tr><td>Build structured courses</td><td className="spx"><span className="y">✓</span> <span className="b b-free">FREE tier</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Student progress tracking</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Course reviews &amp; ratings</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td></tr>
                            <tr className="cat"><td colSpan="7">💰 Monetization</td></tr>
                            <tr><td>Sell paid courses</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Revenue share to creator</td><td className="spx" style={{color:"var(--teal)",fontWeight:800}}>90%</td><td>~93%</td><td>~97%</td><td>37–97%</td><td>~35%</td><td>~100%</td></tr>
                            <tr><td>Free courses available</td><td className="spx"><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="y">✓</span></td><td><span className="n">✗</span></td><td><span className="y">✓</span></td></tr>
                            <tr className="cat"><td colSpan="7">🎯 Platform Integration</td></tr>
                            <tr><td>Music production tools included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Film platform included</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td></tr>
                            <tr><td>Beat store + merch also sellable</td><td className="spx"><span className="y">✓</span> <span className="b b-unique">UNIQUE</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="n">✗</span></td><td><span className="p">~</span></td></tr>
                            <tr><td>Social network + community</td><td className="spx"><span className="y">✓</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="p">~</span></td><td><span className="y">✓</span></td></tr>
                            <tr><td>Pricing (starting)</td><td className="spx" style={{color:"var(--teal)",fontWeight:700}}>$0 free tier</td><td>$39/mo</td><td>$36/mo</td><td>Free (37% cut)</td><td>$32/mo</td><td>$149/mo</td></tr>
                        </tbody>
                    </table>
                </div>

                {/* WINNER */}
                <div className="winner">
                    <div className="winner-icon">🏆</div>
                    <div className="winner-body">
                        <h3>StreamPireX Wins on Every Axis</h3>
                        <p>
                            No other platform combines a browser-based DAW, MPC beat maker, AI tools, beat store, music distribution to 150+ platforms, podcast studio, 24/7 radio with AI DJ, live streaming, video editor, AI video generation, EPK builder, collab marketplace, social network, gaming hub — AND a full Film &amp; Series platform with virtual theatres, synchronized live screenings, monthly short film festival, and IMDB-style credits — AND a Creator Academy for building and selling courses — all under one subscription starting at $12.99/month with 90% revenue share., MPC beat maker with
                            64-step sequencer, AI mix assistant, AI mastering, free AI stem
                            separation, voice-to-MIDI, hum-to-song, text-to-song, WAM plugins,
                            speaker simulator, beat store, music distribution to 150+ platforms,
                            podcast studio, 24/7 radio with AI DJ + voice cloning, live streaming,
                            video editor, AI video generation, EPK builder, collab marketplace,
                            social network, and gaming hub — all under one subscription starting at
                            $12.99/month with 90% revenue share. The closest stack of competitors
                            costs $170–350+/month across 15 separate tools with no integration
                            between them.
                        </p>
                    </div>
                    <a
                        href="https://streampirex.com"
                        className="winner-cta"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Join the Waitlist →
                    </a>
                </div>

                <div className="pg-footer">
                    <span>StreamPireX</span> Full Platform Competitive Analysis — Updated March 2026
                    — by Eye Forge Studios LLC
                    <br />
                    <span
                        style={{
                            color: "var(--muted)",
                            fontSize: "10px",
                            marginTop: "6px",
                            display: "block"
                        }}
                    >
                        ✓ = Full feature available &nbsp;|&nbsp; ~ = Partial/limited &nbsp;|&nbsp;
                        ✗ = Not available &nbsp;|&nbsp; * = Desktop app benchmark
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ComparePage;