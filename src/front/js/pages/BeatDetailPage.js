import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/BeatDetailPage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const BeatDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { store } = useContext(Context);
  const token = localStorage.getItem("token");

  const [beat, setBeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedBeats, setRelatedBeats] = useState([]);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [cartFlash, setCartFlash] = useState(false);

  // Audio
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    fetchBeat();
    return () => { audioRef.current.pause(); audioRef.current.src = ""; };
  }, [id]);

  const fetchBeat = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/beats/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBeat(data);
      if (data.licenses?.length) setSelectedLicense(data.licenses[0]);
      fetchRelated(data.genre, data.id);
    } catch { setBeat(null); }
    setLoading(false);
  };

  const fetchRelated = async (genre, excludeId) => {
    try {
      const res = await fetch(`${BACKEND}/api/beats?genre=${genre || ""}&per_page=6`);
      const data = await res.json();
      setRelatedBeats((data.beats || []).filter(b => b.id !== excludeId).slice(0, 4));
    } catch {}
  };

  // ── Audio ──
  const togglePlay = () => {
    if (!beat?.preview_url) return;
    const a = audioRef.current;
    if (isPlaying) { a.pause(); setIsPlaying(false); return; }
    if (a.src !== beat.preview_url) a.src = beat.preview_url;
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  useEffect(() => {
    const a = audioRef.current;
    const onTime = () => { setProgress((a.currentTime / a.duration) * 100 || 0); setCurTime(a.currentTime); };
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => { setIsPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta); a.removeEventListener("ended", onEnd); };
  }, []);

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audioRef.current.duration) { audioRef.current.currentTime = pct * audioRef.current.duration; }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ── Cart ──
  const addToCart = () => {
    if (!selectedLicense || !beat) return;
    const cart = JSON.parse(localStorage.getItem("spx_cart") || "[]");
    if (cart.find(c => c.beatId === beat.id && c.licenseId === selectedLicense.id)) return;
    cart.push({
      beatId: beat.id, licenseId: selectedLicense.id,
      title: beat.title, producerName: beat.producer_name,
      artwork: beat.artwork_url, licenseName: selectedLicense.name,
      licenseType: selectedLicense.license_type, price: selectedLicense.price,
    });
    localStorage.setItem("spx_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    setCartFlash(true);
    setTimeout(() => setCartFlash(false), 1500);
  };

  const buyNow = async () => {
    if (!token) { navigate("/login"); return; }
    if (!selectedLicense || !beat) return;
    try {
      const res = await fetch(`${BACKEND}/api/beats/${beat.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ license_id: selectedLicense.id }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {}
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShare(true);
    setTimeout(() => setShowShare(false), 2000);
  };

  const LIC_ICON = { basic: "🎵", premium: "🎶", unlimited: "🔓", stems: "🎛️", exclusive: "👑" };
  const LIC_CLR = { basic: "#00ffc8", premium: "#3b82f6", unlimited: "#a855f7", stems: "#f59e0b", exclusive: "#ef4444" };

  if (loading) return <div className="bd-page"><div className="bd-loading"><div className="bd-spinner" /><p>Loading...</p></div></div>;
  if (!beat) return <div className="bd-page"><div className="bd-not-found"><h2>Beat not found</h2><Link to="/beats">← Back to Store</Link></div></div>;

  return (
    <div className="bd-page">
      {/* ── Hero ── */}
      <section className="bd-hero">
        <div className="bd-hero-art">
          <img src={beat.artwork_url || "/default-beat-artwork.jpg"} alt={beat.title} />
          <button className="bd-play-btn" onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
        </div>
        <div className="bd-hero-info">
          <h1>{beat.title}</h1>
          <Link to={`/producer/${beat.producer_id}`} className="bd-producer-link">
            {beat.producer_avatar && <img src={beat.producer_avatar} className="bd-tiny-av" alt="" />}
            <span>{beat.producer_name}</span>
          </Link>
          <div className="bd-meta">
            {beat.bpm && <span className="bd-tag bpm">{beat.bpm} BPM</span>}
            {beat.key && <span className="bd-tag key">{beat.key}</span>}
            {beat.genre && <span className="bd-tag genre">{beat.genre}</span>}
            {beat.mood && <span className="bd-tag mood">{beat.mood}</span>}
          </div>
          {/* Progress bar */}
          <div className="bd-progress-wrap" onClick={seek}>
            <div className="bd-progress-fill" style={{ width: `${progress}%` }} />
            <div className="bd-progress-knob" style={{ left: `${progress}%` }} />
          </div>
          <div className="bd-time">{fmt(currentTime)} / {beat.duration || fmt(duration)}</div>
          <div className="bd-stats">
            <span>▶ {(beat.plays || 0).toLocaleString()}</span>
            <span>💰 {beat.total_sales || 0} sold</span>
            <button className="bd-share" onClick={copyLink}>{showShare ? "✓ Copied!" : "🔗 Share"}</button>
          </div>
          {beat.tags?.length > 0 && (
            <div className="bd-tag-row">{beat.tags.map((t, i) => <span key={i} className="bd-hashtag">#{t}</span>)}</div>
          )}
        </div>
      </section>

      {/* ── Body ── */}
      <div className="bd-body">
        <div className="bd-main">
          <h2 className="bd-sec-title">License This Beat</h2>

          {beat.is_free_download ? (
            <div className="bd-free-box">
              <p>🎉 Free download available!</p>
              <a href={beat.preview_url} download className="bd-free-dl-btn">⬇ Download MP3</a>
            </div>
          ) : (
            <>
              <div className="bd-lic-grid">
                {(beat.licenses || []).map(lic => (
                  <div key={lic.id}
                    className={`bd-lic-card ${selectedLicense?.id === lic.id ? "sel" : ""}`}
                    onClick={() => setSelectedLicense(lic)}
                    style={{ "--tc": LIC_CLR[lic.license_type] || "#00ffc8" }}>
                    <div className="bd-lic-top">
                      <span className="bd-lic-icon">{LIC_ICON[lic.license_type] || "🎵"}</span>
                      <div className="bd-lic-title-wrap">
                        <h3>{lic.name}</h3>
                        <span className="bd-lic-type">{lic.license_type}</span>
                      </div>
                      <span className="bd-lic-price">${lic.price}</span>
                    </div>
                    <ul className="bd-lic-feats">
                      <li>📁 {lic.file_format?.toUpperCase()}</li>
                      <li>{lic.includes_stems ? "✅ Stems" : "—  No stems"}</li>
                      <li>📊 {lic.distribution_limit ? `${lic.distribution_limit.toLocaleString()} dist.` : "Unlimited"}</li>
                      <li>🎥 {lic.music_video ? "✅ Video" : "— No video"}</li>
                      <li>📻 {lic.radio_broadcasting ? "✅ Radio" : "— No radio"}</li>
                      <li>{lic.credit_required ? "📝 Credit required" : "✅ No credit"}</li>
                      {lic.is_exclusive && <li className="bd-excl">👑 EXCLUSIVE</li>}
                    </ul>
                    {selectedLicense?.id === lic.id && <div className="bd-lic-check">✓</div>}
                  </div>
                ))}
              </div>

              {/* Purchase bar */}
              {selectedLicense && (
                <div className="bd-purchase-bar">
                  <div className="bd-pb-left">
                    <span className="bd-pb-name">{selectedLicense.name}</span>
                    <span className="bd-pb-price">${selectedLicense.price}</span>
                  </div>
                  <div className="bd-pb-actions">
                    <button className={`bd-cart-btn ${cartFlash ? "flash" : ""}`} onClick={addToCart}>
                      {cartFlash ? "✓ Added!" : "🛒 Add to Cart"}
                    </button>
                    <button className="bd-buy-btn" onClick={buyNow}>Buy Now</button>
                  </div>
                </div>
              )}
            </>
          )}

          {beat.description && (
            <div className="bd-desc"><h3>About</h3><p>{beat.description}</p></div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="bd-sidebar">
          <div className="bd-producer-card">
            <Link to={`/producer/${beat.producer_id}`}>
              <img src={beat.producer_avatar || "https://via.placeholder.com/80"} className="bd-pc-av" alt="" />
              <h3>{beat.producer_name}</h3>
            </Link>
            <Link to={`/producer/${beat.producer_id}`} className="bd-pc-link">View Profile →</Link>
          </div>

          {relatedBeats.length > 0 && (
            <div className="bd-related">
              <h3>More {beat.genre} Beats</h3>
              {relatedBeats.map(rb => (
                <Link to={`/beats/${rb.id}`} key={rb.id} className="bd-rel-card">
                  <img src={rb.artwork_url || "/default-beat-artwork.jpg"} className="bd-rel-art" alt="" />
                  <div className="bd-rel-info">
                    <span className="bd-rel-title">{rb.title}</span>
                    <span className="bd-rel-prod">{rb.producer_name}</span>
                  </div>
                  <span className="bd-rel-price">{rb.is_free_download ? "FREE" : `$${rb.base_price}`}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default BeatDetailPage;