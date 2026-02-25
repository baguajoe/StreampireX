import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "../../styles/ProducerProfilePage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const ProducerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [producer, setProducer] = useState(null);
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBeats: 0, totalPlays: 0, totalSales: 0 });
  const [sortBy, setSortBy] = useState("newest");
  const [filterGenre, setFilterGenre] = useState("all");
  const [genres, setGenres] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  // Audio
  const audioRef = useRef(new Audio());
  const [currentBeat, setCurrentBeat] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => { fetchProducer(); return () => { audioRef.current.pause(); }; }, [id]);
  useEffect(() => { fetchBeats(); }, [id, sortBy, filterGenre]);

  const fetchProducer = async () => {
    try {
      // Use existing user profile endpoint
      const res = await fetch(`${BACKEND}/api/users/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProducer(data.user || data);
        setIsFollowing(data.is_following || false);
      }
    } catch {}
  };

  const fetchBeats = async () => {
    setLoading(true);
    try {
      let url = `${BACKEND}/api/beats?producer_id=${id}&sort=${sortBy}&per_page=50`;
      if (filterGenre !== "all") url += `&genre=${filterGenre}`;
      const res = await fetch(url);
      const data = await res.json();
      const b = data.beats || [];
      setBeats(b);

      // Build stats
      const totalPlays = b.reduce((sum, x) => sum + (x.plays || 0), 0);
      const totalSales = b.reduce((sum, x) => sum + (x.total_sales || 0), 0);
      setStats({ totalBeats: data.total || b.length, totalPlays, totalSales });

      // Extract genres
      const g = [...new Set(b.map(x => x.genre).filter(Boolean))];
      setGenres(g);
    } catch {}
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!token) { navigate("/login"); return; }
    try {
      const res = await fetch(`${BACKEND}/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIsFollowing(!isFollowing);
    } catch {}
  };

  // ── Audio ──
  const playBeat = (beat) => {
    const a = audioRef.current;
    if (currentBeat?.id === beat.id && isPlaying) { a.pause(); setIsPlaying(false); return; }
    setCurrentBeat(beat);
    a.src = beat.preview_url;
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  useEffect(() => {
    const a = audioRef.current;
    const onTime = () => setProgress((a.currentTime / a.duration) * 100 || 0);
    const onEnd = () => { setIsPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); };
  }, []);

  const addToCart = (beat) => {
    const cart = JSON.parse(localStorage.getItem("spx_cart") || "[]");
    // Add cheapest license by default
    if (cart.find(c => c.beatId === beat.id)) return;
    cart.push({
      beatId: beat.id, licenseId: null,
      title: beat.title, producerName: beat.producer_name || producer?.username,
      artwork: beat.artwork_url, licenseName: "Basic Lease",
      licenseType: "basic", price: beat.base_price,
    });
    localStorage.setItem("spx_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  };

  if (!producer && !loading) {
    return <div className="pp-page"><div className="pp-not-found"><h2>Producer not found</h2><Link to="/producers">← Browse Producers</Link></div></div>;
  }

  return (
    <div className="pp-page">
      <audio ref={audioRef} />

      {/* ── Banner / Header ── */}
      <header className="pp-header" style={{ backgroundImage: producer?.banner_url ? `url(${producer.banner_url})` : undefined }}>
        <div className="pp-header-overlay" />
        <div className="pp-header-content">
          <img src={producer?.profile_picture || producer?.avatar_url || "https://via.placeholder.com/120"} className="pp-avatar" alt="" />
          <div className="pp-header-info">
            <h1>{producer?.display_name || producer?.username || "Producer"}</h1>
            {producer?.bio && <p className="pp-bio">{producer.bio}</p>}
            <div className="pp-stats-row">
              <div className="pp-stat"><span className="pp-stat-num">{stats.totalBeats}</span><span className="pp-stat-lbl">Beats</span></div>
              <div className="pp-stat"><span className="pp-stat-num">{stats.totalPlays.toLocaleString()}</span><span className="pp-stat-lbl">Plays</span></div>
              <div className="pp-stat"><span className="pp-stat-num">{stats.totalSales}</span><span className="pp-stat-lbl">Sales</span></div>
              <div className="pp-stat"><span className="pp-stat-num">{producer?.followers_count || 0}</span><span className="pp-stat-lbl">Followers</span></div>
            </div>
          </div>
          <button className={`pp-follow-btn ${isFollowing ? "following" : ""}`} onClick={toggleFollow}>
            {isFollowing ? "✓ Following" : "+ Follow"}
          </button>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="pp-filters">
        <div className="pp-filter-left">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="pp-select">
            <option value="newest">Newest</option>
            <option value="popular">Most Played</option>
            <option value="best_selling">Best Selling</option>
            <option value="price_low">Price: Low → High</option>
            <option value="price_high">Price: High → Low</option>
          </select>
          <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} className="pp-select">
            <option value="all">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <span className="pp-count">{beats.length} beat{beats.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Beat list ── */}
      <div className="pp-beats">
        {loading ? (
          <div className="pp-loading"><div className="pp-spinner" /><p>Loading beats...</p></div>
        ) : beats.length === 0 ? (
          <div className="pp-empty"><p>No beats listed yet.</p></div>
        ) : (
          beats.map(beat => (
            <div key={beat.id} className={`pp-beat-row ${currentBeat?.id === beat.id ? "active" : ""}`}>
              <button className="pp-beat-play" onClick={() => playBeat(beat)}>
                {currentBeat?.id === beat.id && isPlaying ? "⏸" : "▶"}
              </button>
              <img src={beat.artwork_url || "/default-beat-artwork.jpg"} className="pp-beat-art" alt=""
                onClick={() => navigate(`/beats/${beat.id}`)} />
              <div className="pp-beat-info" onClick={() => navigate(`/beats/${beat.id}`)}>
                <span className="pp-beat-title">{beat.title}</span>
                <div className="pp-beat-meta">
                  {beat.bpm && <span>{beat.bpm} BPM</span>}
                  {beat.key && <span>{beat.key}</span>}
                  {beat.genre && <span>{beat.genre}</span>}
                </div>
              </div>
              <div className="pp-beat-tags">
                {(beat.tags || []).slice(0, 2).map((t, i) => <span key={i} className="pp-tag">#{t}</span>)}
              </div>
              <span className="pp-beat-plays">▶ {(beat.plays || 0).toLocaleString()}</span>
              <span className="pp-beat-price">
                {beat.is_free_download ? <span className="pp-free">FREE</span> : `$${beat.base_price}`}
              </span>
              <div className="pp-beat-actions">
                {!beat.is_free_download && (
                  <button className="pp-cart-btn" onClick={() => addToCart(beat)} title="Add to cart">🛒</button>
                )}
                <button className="pp-license-btn" onClick={() => navigate(`/beats/${beat.id}`)}>
                  {beat.is_free_download ? "Download" : "License"}
                </button>
              </div>

              {/* Progress underline for playing beat */}
              {currentBeat?.id === beat.id && (
                <div className="pp-beat-progress"><div className="pp-beat-progress-fill" style={{ width: `${progress}%` }} /></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Sticky player for currently playing ── */}
      {currentBeat && (
        <div className="pp-sticky-player">
          <img src={currentBeat.artwork_url || "/default-beat-artwork.jpg"} className="pp-sp-art" alt="" />
          <div className="pp-sp-info">
            <span className="pp-sp-title">{currentBeat.title}</span>
            <span className="pp-sp-prod">{currentBeat.producer_name || producer?.username}</span>
          </div>
          <button className="pp-sp-play" onClick={() => playBeat(currentBeat)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <div className="pp-sp-bar">
            <div className="pp-sp-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="pp-sp-price">
            {currentBeat.is_free_download ? "FREE" : `$${currentBeat.base_price}`}
          </span>
          <button className="pp-sp-license" onClick={() => navigate(`/beats/${currentBeat.id}`)}>License</button>
        </div>
      )}
    </div>
  );
};

export default ProducerProfilePage;