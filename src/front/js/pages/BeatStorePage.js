import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/BeatStore.css";

const CATEGORIES = [
    { key: "top", icon: "🔥", label: "Top Charts" },
    { key: "new", icon: "✨", label: "New & Notable" },
    { key: "free", icon: "🎁", label: "Free Beats" },
    { key: "exclusive", icon: "👑", label: "Exclusive Only" },
    { key: "under20", icon: "💰", label: "Under $20" },
    { key: "trending", icon: "📈", label: "Trending" },
];

const BeatStorePage = () => {
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const [beats, setBeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search & Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [genre, setGenre] = useState("all");
    const [mood, setMood] = useState("all");
    const [bpmRange, setBpmRange] = useState({ min: "", max: "" });
    const [keyFilter, setKeyFilter] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [showFreeOnly, setShowFreeOnly] = useState(false);
    const [genres, setGenres] = useState([]);
    const [activeCategory, setActiveCategory] = useState("top");

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBeats, setTotalBeats] = useState(0);

    // Player
    const [currentBeat, setCurrentBeat] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // License Modal
    const [selectedBeat, setSelectedBeat] = useState(null);
    const [showLicenseModal, setShowLicenseModal] = useState(false);

    // Cart flash (tracks which beat just got added)
    const [cartFlashId, setCartFlashId] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");

    // Fetch beats
    const fetchBeats = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, per_page: 20, sort: sortBy });
            if (searchTerm) params.set("q", searchTerm);
            if (genre !== "all") params.set("genre", genre);
            if (mood !== "all") params.set("mood", mood);
            if (bpmRange.min) params.set("bpm_min", bpmRange.min);
            if (bpmRange.max) params.set("bpm_max", bpmRange.max);
            if (keyFilter) params.set("key", keyFilter);
            if (showFreeOnly) params.set("free", "true");

            // Category-based params
            if (activeCategory === "free") params.set("free", "true");
            if (activeCategory === "exclusive") params.set("exclusive", "true");
            if (activeCategory === "under20") params.set("max_price", "20");
            if (activeCategory === "top") params.set("sort", "best_selling");
            if (activeCategory === "trending") params.set("sort", "popular");
            if (activeCategory === "new") params.set("sort", "newest");

            const res = await fetch(`${backendUrl}/api/beats?${params}`);
            const data = await res.json();

            const fetchedBeats = data.beats || [];
            
            // Demo beats for UI preview when store is empty
            if (fetchedBeats.length === 0 && page === 1) {
                const DEMO_BEATS = [
                    { id: "demo-1", title: "PARK BENCH | J Cole Type Beat Hiphop Rap Boombap", producer_name: "GetEmGee", producer_id: "demo-p1", bpm: 96, key: "Am", genre: "Hip-Hop", mood: "Dark", plays: 4521, base_price: 49.00, is_free_download: false, tags: ["rap", "boombap", "j cole"], artwork_url: null, preview_url: "" },
                    { id: "demo-2", title: "TRUST | 21 Savage x Drake x Trap x Hip Hop", producer_name: "Mr O & JoeSmpte", producer_id: "demo-p2", bpm: 164, key: "Cm", genre: "Trap", mood: "Aggressive", plays: 3890, base_price: 35.00, is_free_download: false, tags: ["21 savage", "trap", "drake"], artwork_url: null, preview_url: "" },
                    { id: "demo-3", title: "RNB TRAP DRILL AFROBEAT DRAKE TYPE BEAT", producer_name: "Bagua Joe", producer_id: "demo-p3", bpm: 100, key: "Dbm", genre: "RnB", mood: "Melodic", plays: 2344, base_price: 49.99, is_free_download: false, tags: ["rnb", "trap", "drill"], artwork_url: null, preview_url: "" },
                    { id: "demo-4", title: "I NEED | Lithe x 6LACK Dark RNB Trap Type Beat", producer_name: "Vintage Lee", producer_id: "demo-p4", bpm: 92, key: "Em", genre: "RnB", mood: "Dark", plays: 1756, base_price: 49.95, is_free_download: false, tags: ["lithe", "rnb", "trap"], artwork_url: null, preview_url: "" },
                    { id: "demo-5", title: "Imperator (trap hip hop drake / Bpm 144 F#min)", producer_name: "Nila Milan", producer_id: "demo-p5", bpm: 144, key: "F#m", genre: "Trap", mood: "Energetic", plays: 1230, base_price: 29.99, is_free_download: false, tags: ["hip hop", "drake", "trap"], artwork_url: null, preview_url: "" },
                    { id: "demo-6", title: "Cultivate | Spiritual Boom Bap Freestyle", producer_name: "Bagua Joe", producer_id: "demo-p3", bpm: 88, key: "Gm", genre: "Boom Bap", mood: "Chill", plays: 987, base_price: 0, is_free_download: true, tags: ["boombap", "spiritual", "freestyle"], artwork_url: null, preview_url: "" },
                    { id: "demo-7", title: "Dead Presidents | East Coast Street Grit", producer_name: "GetEmGee", producer_id: "demo-p1", bpm: 90, key: "Bbm", genre: "Hip-Hop", mood: "Dark", plays: 2100, base_price: 39.99, is_free_download: false, tags: ["east coast", "street", "gritty"], artwork_url: null, preview_url: "" },
                    { id: "demo-8", title: "Smoothie | Soul-Hop Cinematic Instrumental", producer_name: "Mr O & JoeSmpte", producer_id: "demo-p2", bpm: 105, key: "Dm", genre: "Soul", mood: "Chill", plays: 1560, base_price: 24.99, is_free_download: false, tags: ["soul", "cinematic", "smooth"], artwork_url: null, preview_url: "" },
                ];
                setBeats(DEMO_BEATS);
                setTotalBeats(DEMO_BEATS.length);
                setTotalPages(1);
            } else {
                setBeats(fetchedBeats);
                setTotalPages(data.pages || 1);
                setTotalBeats(data.total || 0);
            }
        } catch (err) {
            setError("Failed to load beats");
        }
        setLoading(false);
    }, [backendUrl, page, searchTerm, genre, mood, bpmRange, keyFilter, sortBy, showFreeOnly, activeCategory]);

    // Fetch genres
    useEffect(() => {
        fetch(`${backendUrl}/api/beats/genres`)
            .then(r => r.json())
            .then(data => setGenres(data || []))
            .catch(() => {});
    }, [backendUrl]);

    useEffect(() => { fetchBeats(); }, [fetchBeats]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchTerm, genre, mood, sortBy, showFreeOnly, activeCategory]);

    // Audio player
    const playBeat = (beat) => {
        if (currentBeat?.id === beat.id && isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }
        setCurrentBeat(beat);
        setIsPlaying(true);
        setProgress(0);

        if (audioRef.current) {
            audioRef.current.src = beat.preview_url;
            audioRef.current.play().catch(() => setIsPlaying(false));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setProgress(pct || 0);
        }
    };

    // Category handler
    const handleCategory = (key) => {
        setActiveCategory(key);
        if (key === "free") setShowFreeOnly(true);
        else setShowFreeOnly(false);
    };

    // Genre pill handler
    const handleGenrePill = (g) => {
        setGenre(genre === g ? "all" : g);
    };

    // License purchase
    const openLicenseModal = (beat) => {
        setSelectedBeat(beat);
        setShowLicenseModal(true);
    };

    const purchaseLicense = async (beat, licenseId) => {
        if (!token) { navigate("/login"); return; }

        try {
            const res = await fetch(`${backendUrl}/api/beats/${beat.id}/purchase`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ license_id: licenseId })
            });
            const data = await res.json();
            if (data.checkout_url) window.location.href = data.checkout_url;
            else setError(data.error || "Purchase failed");
        } catch (err) {
            setError("Purchase failed. Please try again.");
        }
    };

    // ── Add to Cart ──
    const addToCart = (beat, e) => {
        e.stopPropagation();
        const cart = JSON.parse(localStorage.getItem("spx_cart") || "[]");
        if (cart.find(c => c.beatId === beat.id)) {
            // Already in cart — go to detail page to pick license
            navigate(`/beats/${beat.id}`);
            return;
        }
        cart.push({
            beatId: beat.id,
            title: beat.title,
            producerName: beat.producer_name,
            artwork: beat.artwork_url,
            price: beat.base_price || 0,
            isFree: beat.is_free_download,
        });
        localStorage.setItem("spx_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
        setCartFlashId(beat.id);
        setTimeout(() => setCartFlashId(null), 1500);
    };

    // ── Buy Now (quick checkout) ──
    const buyNow = (beat, e) => {
        e.stopPropagation();
        if (!token) { navigate("/login"); return; }
        // Navigate to detail page for license selection + checkout
        navigate(`/beats/${beat.id}`);
    };

    const MUSICAL_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const MOODS = ["Dark", "Energetic", "Chill", "Aggressive", "Sad", "Happy", "Bouncy", "Melodic", "Hard"];

    return (
        <div className="beat-store-page">
            {/* Hidden audio element */}
            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} />

            {/* Hero */}
            <section className="beat-store-hero">
                <h1>🎹 Beat Store</h1>
                <p>License beats from top producers. Keep 100% of your song revenue.</p>
                <div className="hero-stats">
                    <span><strong>{totalBeats}</strong> Beats Available</span>
                    <span>•</span>
                    <span>Producers Keep <strong>90%</strong></span>
                    <span>•</span>
                    <span>Instant Download</span>
                </div>
            </section>

            {/* Category Tabs */}
            <div className="category-tabs">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.key}
                        className={`cat-tab ${activeCategory === cat.key ? "active" : ""}`}
                        onClick={() => handleCategory(cat.key)}
                    >
                        <span className="cat-icon">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Genre Pills */}
            {genres.length > 0 && (
                <div className="genre-pills">
                    <button
                        className={`genre-pill ${genre === "all" ? "active" : ""}`}
                        onClick={() => setGenre("all")}
                    >
                        All Genres
                    </button>
                    {genres.map(g => (
                        <button
                            key={g}
                            className={`genre-pill ${genre === g ? "active" : ""}`}
                            onClick={() => handleGenrePill(g)}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            )}

            {/* Search & Filters */}
            <section className="beat-filters">
                <div className="search-row">
                    <input
                        type="text"
                        placeholder="Search beats, producers, genres..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="beat-search-input"
                    />
                </div>

                <div className="filter-row">
                    <select value={mood} onChange={(e) => setMood(e.target.value)} className="filter-select">
                        <option value="all">All Moods</option>
                        {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select value={keyFilter} onChange={(e) => setKeyFilter(e.target.value)} className="filter-select">
                        <option value="">Any Key</option>
                        {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>

                    <div className="bpm-filter">
                        <input
                            type="number" placeholder="BPM min" min="60" max="200"
                            value={bpmRange.min} onChange={(e) => setBpmRange(p => ({ ...p, min: e.target.value }))}
                        />
                        <span>–</span>
                        <input
                            type="number" placeholder="BPM max" min="60" max="200"
                            value={bpmRange.max} onChange={(e) => setBpmRange(p => ({ ...p, max: e.target.value }))}
                        />
                    </div>

                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                        <option value="newest">Newest</option>
                        <option value="popular">Most Played</option>
                        <option value="best_selling">Best Selling</option>
                        <option value="price_low">Price: Low → High</option>
                        <option value="price_high">Price: High → Low</option>
                    </select>

                    <label className="free-toggle">
                        <input type="checkbox" checked={showFreeOnly} onChange={(e) => setShowFreeOnly(e.target.checked)} />
                        Free Only
                    </label>
                </div>
            </section>

            {/* Results Bar */}
            <div className="results-bar">
                <span className="results-count">
                    {totalBeats} beat{totalBeats !== 1 ? "s" : ""} found
                    {genre !== "all" ? ` in ${genre}` : ""}
                </span>
            </div>

            {/* Error */}
            {error && <div className="beat-error">{error} <button onClick={() => setError("")}>✕</button></div>}

            {/* Column Headers */}
            {!loading && beats.length > 0 && (
                <div className="beat-list-header">
                    <span className="blh-num">#</span>
                    <span className="blh-play"></span>
                    <span className="blh-art"></span>
                    <span className="blh-info">Title</span>
                    <span className="blh-tags">Tags</span>
                    <span className="blh-meta">Details</span>
                    <span className="blh-plays">Plays</span>
                    <span className="blh-price">Price</span>
                </div>
            )}

            {/* Beat List */}
            <section className="beat-list">
                {loading ? (
                    <div className="beat-loading">Loading beats...</div>
                ) : beats.length === 0 ? (
                    <div className="beat-empty">
                        <h3>🎵 No beats found</h3>
                        <p>Try adjusting your filters or search term.</p>
                    </div>
                ) : (
                    beats.map((beat, idx) => (
                        <div
                            key={beat.id}
                            className={`beat-row ${currentBeat?.id === beat.id ? "active" : ""}`}
                        >
                            {/* Row Number */}
                            <span className="beat-row-num">{(page - 1) * 20 + idx + 1}</span>

                            {/* Play Button */}
                            <button className="beat-play-btn" onClick={() => playBeat(beat)}>
                                {currentBeat?.id === beat.id && isPlaying ? "⏸" : "▶"}
                            </button>

                            {/* Artwork */}
                            <img
                                src={beat.artwork_url || "/default-beat-artwork.jpg"}
                                alt={beat.title}
                                className="beat-artwork"
                                onClick={() => navigate(`/beats/${beat.id}`)}
                            />

                            {/* Info — Title + Producer link + BPM */}
                            <div className="beat-info" onClick={() => navigate(`/beats/${beat.id}`)}>
                                <h4 className="beat-title">{beat.title}</h4>
                                <div className="beat-sub">
                                    <Link
                                        to={`/producer/${beat.producer_id}`}
                                        className="beat-producer-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {beat.producer_name}
                                    </Link>
                                    {beat.bpm && <span className="beat-bpm-dot">•</span>}
                                    {beat.bpm && <span className="beat-bpm-val">{beat.bpm} BPM</span>}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="beat-tags">
                                {(beat.tags || []).slice(0, 3).map((tag, i) => (
                                    <span key={i} className="beat-tag">#{tag}</span>
                                ))}
                            </div>

                            {/* Metadata Tags */}
                            <div className="beat-meta">
                                {beat.key && <span className="meta-tag key">{beat.key}</span>}
                                {beat.genre && <span className="meta-tag genre">{beat.genre}</span>}
                            </div>

                            {/* Play Count */}
                            <span className="beat-plays">▶ {beat.plays?.toLocaleString()}</span>

                            {/* Price & Actions */}
                            <div className="beat-actions">
                                {beat.is_free_download ? (
                                    <span className="free-badge">FREE</span>
                                ) : (
                                    <span className="beat-price">${beat.base_price}</span>
                                )}

                                {/* Add to Cart */}
                                <button
                                    className={`cart-btn ${cartFlashId === beat.id ? "flash" : ""}`}
                                    onClick={(e) => addToCart(beat, e)}
                                    title="Add to cart"
                                >
                                    {cartFlashId === beat.id ? "✓ Added" : "🛒 Cart"}
                                </button>

                                {/* Buy Now / License */}
                                <button
                                    className="license-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        beat.is_free_download
                                            ? navigate(`/beats/${beat.id}`)
                                            : openLicenseModal(beat);
                                    }}
                                >
                                    {beat.is_free_download ? "⬇ Download" : "Buy Now"}
                                </button>
                            </div>

                            {/* Progress bar for currently playing */}
                            {currentBeat?.id === beat.id && (
                                <div className="beat-progress-bar">
                                    <div className="beat-progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </section>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="beat-pagination">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}

            {/* Sell CTA */}
            <section className="beat-sell-cta">
                <h3>Are you a producer?</h3>
                <p>Sell your beats on StreamPireX. Keep 90% of every sale.</p>
                <Link to="/artist-profile" className="sell-beats-btn">Start Selling →</Link>
            </section>

            {/* License Modal */}
            {showLicenseModal && selectedBeat && (
                <LicenseModal
                    beat={selectedBeat}
                    backendUrl={backendUrl}
                    onClose={() => setShowLicenseModal(false)}
                    onPurchase={purchaseLicense}
                />
            )}
        </div>
    );
};


// ============================================================
// LICENSE SELECTION MODAL
// ============================================================

const LicenseModal = ({ beat, backendUrl, onClose, onPurchase }) => {
    const [licenses, setLicenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLicense, setSelectedLicense] = useState(null);

    useEffect(() => {
        fetch(`${backendUrl}/api/beats/${beat.id}/licenses`)
            .then(r => r.json())
            .then(data => {
                setLicenses(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [backendUrl, beat.id]);

    const LICENSE_ICONS = {
        basic: "🎵",
        premium: "🎶",
        unlimited: "🔓",
        stems: "🎛️",
        exclusive: "👑"
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="license-modal" onClick={(e) => e.stopPropagation()}>
                <div className="license-modal-header">
                    <div>
                        <h3>License "{beat.title}"</h3>
                        <p className="license-modal-producer">by {beat.producer_name}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="license-modal-body">
                    {loading ? (
                        <p className="license-loading">Loading licenses...</p>
                    ) : licenses.length === 0 ? (
                        <p>No licenses available.</p>
                    ) : (
                        <div className="license-tiers">
                            {licenses.map(lic => (
                                <div
                                    key={lic.id}
                                    className={`license-tier ${selectedLicense?.id === lic.id ? "selected" : ""} ${lic.license_type}`}
                                    onClick={() => setSelectedLicense(lic)}
                                >
                                    <div className="tier-header">
                                        <span className="tier-icon">{LICENSE_ICONS[lic.license_type] || "🎵"}</span>
                                        <div>
                                            <h4>{lic.name}</h4>
                                            <span className="tier-format">{lic.file_format.toUpperCase()}</span>
                                        </div>
                                        <span className="tier-price">${lic.price}</span>
                                    </div>

                                    <ul className="tier-rights">
                                        <li>{lic.distribution_limit ? `${lic.distribution_limit.toLocaleString()} distributions` : "✅ Unlimited distributions"}</li>
                                        <li>{lic.streaming_limit ? `${lic.streaming_limit.toLocaleString()} streams` : "✅ Unlimited streams"}</li>
                                        <li>{lic.music_video ? "✅ Music video rights" : "❌ No music video"}</li>
                                        <li>{lic.radio_broadcasting ? "✅ Radio play" : "❌ No radio"}</li>
                                        <li>{lic.includes_stems ? "✅ Stems included" : "❌ No stems"}</li>
                                        {lic.is_exclusive && <li className="exclusive-tag">👑 EXCLUSIVE — Beat removed from store</li>}
                                        <li>{lic.credit_required ? `Credit: "Prod. by ${beat.producer_name}"` : "✅ No credit required"}</li>
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="license-modal-footer">
                    <p className="license-legal">
                        By purchasing, you agree to the license terms. A license agreement will be generated for your records.
                    </p>
                    <div className="license-modal-actions">
                        <button className="creation-cancel-btn" onClick={onClose}>Cancel</button>
                        <button
                            className="purchase-btn"
                            disabled={!selectedLicense}
                            onClick={() => selectedLicense && onPurchase(beat, selectedLicense.id)}
                        >
                            {selectedLicense
                                ? `Buy ${selectedLicense.name} — $${selectedLicense.price}`
                                : "Select a License"
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BeatStorePage;