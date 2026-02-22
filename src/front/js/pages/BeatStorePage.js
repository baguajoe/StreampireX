import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/BeatStore.css";

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

            const res = await fetch(`${backendUrl}/api/beats?${params}`);
            const data = await res.json();

            setBeats(data.beats || []);
            setTotalPages(data.pages || 1);
            setTotalBeats(data.total || 0);
        } catch (err) {
            setError("Failed to load beats");
        }
        setLoading(false);
    }, [backendUrl, page, searchTerm, genre, mood, bpmRange, keyFilter, sortBy, showFreeOnly]);

    // Fetch genres
    useEffect(() => {
        fetch(`${backendUrl}/api/beats/genres`)
            .then(r => r.json())
            .then(data => setGenres(data || []))
            .catch(() => {});
    }, [backendUrl]);

    useEffect(() => { fetchBeats(); }, [fetchBeats]);

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [searchTerm, genre, mood, sortBy, showFreeOnly]);

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
                    <span>{totalBeats} Beats Available</span>
                    <span>•</span>
                    <span>Producers Keep 90%</span>
                    <span>•</span>
                    <span>Instant Download</span>
                </div>
            </section>

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
                    <select value={genre} onChange={(e) => setGenre(e.target.value)} className="filter-select">
                        <option value="all">All Genres</option>
                        {genres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

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
                        <span>-</span>
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

            {/* Error */}
            {error && <div className="beat-error">{error} <button onClick={() => setError("")}>✕</button></div>}

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
                    beats.map(beat => (
                        <div
                            key={beat.id}
                            className={`beat-row ${currentBeat?.id === beat.id ? "active" : ""}`}
                        >
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

                            {/* Info */}
                            <div className="beat-info" onClick={() => navigate(`/beats/${beat.id}`)}>
                                <h4 className="beat-title">{beat.title}</h4>
                                <Link
                                    to={`/artist/${beat.producer_id}`}
                                    className="beat-producer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {beat.producer_name}
                                </Link>
                            </div>

                            {/* Metadata Tags */}
                            <div className="beat-meta">
                                {beat.bpm && <span className="meta-tag bpm">{beat.bpm} BPM</span>}
                                {beat.key && <span className="meta-tag key">{beat.key}</span>}
                                {beat.genre && <span className="meta-tag genre">{beat.genre}</span>}
                            </div>

                            {/* Tags */}
                            <div className="beat-tags">
                                {(beat.tags || []).slice(0, 3).map((tag, i) => (
                                    <span key={i} className="beat-tag">#{tag}</span>
                                ))}
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
                                <button
                                    className="license-btn"
                                    onClick={(e) => { e.stopPropagation(); openLicenseModal(beat); }}
                                >
                                    {beat.is_free_download ? "Download" : "License"}
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