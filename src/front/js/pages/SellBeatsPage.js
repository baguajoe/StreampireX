import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/SellBeatsPage.css";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

const GENRES = ["Trap", "Hip Hop", "R&B", "Pop", "Drill", "Lo-Fi", "Boom Bap", "Afrobeat", "Dancehall", "Reggaeton", "EDM", "House", "Soul", "Jazz", "Rock", "Country", "Latin", "Gospel", "Ambient", "Other"];
const MOODS = ["Dark", "Energetic", "Chill", "Aggressive", "Sad", "Happy", "Bouncy", "Melodic", "Hard", "Dreamy", "Emotional", "Hype", "Smooth", "Grimy"];
const KEYS = ["C Major", "C Minor", "C# Major", "C# Minor", "D Major", "D Minor", "D# Major", "D# Minor", "E Major", "E Minor", "F Major", "F Minor", "F# Major", "F# Minor", "G Major", "G Minor", "G# Major", "G# Minor", "A Major", "A Minor", "A# Major", "A# Minor", "B Major", "B Minor"];

const SellBeatsPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // My beats list
  const [myBeats, setMyBeats] = useState([]);
  const [myStats, setMyStats] = useState({});
  const [loadingBeats, setLoadingBeats] = useState(true);

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", genre: "", mood: "", bpm: "", key: "", tags: "", description: "",
  });
  const [previewFile, setPreviewFile] = useState(null);
  const [mp3File, setMp3File] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [stemsFile, setStemsFile] = useState(null);
  const [artworkFile, setArtworkFile] = useState(null);
  const [artworkPreview, setArtworkPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // License pricing
  const [prices, setPrices] = useState({
    basic: 29.99, premium: 49.99, unlimited: 99.99, stems: 149.99, exclusive: 499.99,
  });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchMyBeats();
  }, []);

  const fetchMyBeats = async () => {
    setLoadingBeats(true);
    try {
      const res = await fetch(`${BACKEND}/api/beats/my-beats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyBeats(data.beats || []);
      setMyStats(data.stats || {});
    } catch {}
    setLoadingBeats(false);
  };

  const handleArtwork = (e) => {
    const file = e.target.files[0];
    setArtworkFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setArtworkPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    if (!previewFile) { setError("Preview audio file is required"); return; }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("genre", form.genre);
    fd.append("mood", form.mood);
    fd.append("bpm", form.bpm);
    fd.append("key", form.key);
    fd.append("description", form.description);
    fd.append("tags", JSON.stringify(form.tags.split(",").map(t => t.trim()).filter(Boolean)));
    fd.append("preview_file", previewFile);
    if (mp3File) fd.append("mp3_file", mp3File);
    if (wavFile) fd.append("wav_file", wavFile);
    if (stemsFile) fd.append("stems_file", stemsFile);
    if (artworkFile) fd.append("artwork", artworkFile);

    // Send license prices
    fd.append("license_prices", JSON.stringify(prices));

    try {
      const res = await fetch(`${BACKEND}/api/beats`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Beat listed successfully!");
        setShowForm(false);
        resetForm();
        fetchMyBeats();
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Upload failed. Please try again.");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setForm({ title: "", genre: "", mood: "", bpm: "", key: "", tags: "", description: "" });
    setPreviewFile(null); setMp3File(null); setWavFile(null); setStemsFile(null);
    setArtworkFile(null); setArtworkPreview(null);
    setPrices({ basic: 29.99, premium: 49.99, unlimited: 99.99, stems: 149.99, exclusive: 499.99 });
  };

  const toggleBeatActive = async (beatId, currentState) => {
    try {
      await fetch(`${BACKEND}/api/beats/${beatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentState }),
      });
      fetchMyBeats();
    } catch {}
  };

  const deleteBeat = async (beatId) => {
    if (!window.confirm("Remove this beat from the store?")) return;
    try {
      await fetch(`${BACKEND}/api/beats/${beatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMyBeats();
    } catch {}
  };

  return (
    <div className="sb-page">
      {/* Header */}
      <section className="sb-header">
        <div className="sb-header-content">
          <h1>🎹 Sell Beats</h1>
          <p>Upload your beats, set your prices, keep 90% of every sale</p>
          <button className="sb-upload-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Upload New Beat"}
          </button>
        </div>
      </section>

      {/* Stats bar */}
      <div className="sb-stats-bar">
        <div className="sb-stat-item">
          <span className="sb-stat-num">{myStats.total_beats || 0}</span>
          <span className="sb-stat-lbl">Total Beats</span>
        </div>
        <div className="sb-stat-item">
          <span className="sb-stat-num">{myStats.active_beats || 0}</span>
          <span className="sb-stat-lbl">Active</span>
        </div>
        <div className="sb-stat-item">
          <span className="sb-stat-num">{myStats.total_sales || 0}</span>
          <span className="sb-stat-lbl">Sales</span>
        </div>
        <div className="sb-stat-item">
          <span className="sb-stat-num">${(myStats.total_revenue || 0).toFixed(2)}</span>
          <span className="sb-stat-lbl">Revenue</span>
        </div>
      </div>

      {success && <div className="sb-success">{success}</div>}
      {error && !showForm && <div className="sb-error">{error}</div>}

      {/* Upload form */}
      {showForm && (
        <div className="sb-form-section">
          <div className="sb-form-card">
            <h2>Upload Beat</h2>

            {error && <div className="sb-form-error">{error}</div>}

            <div className="sb-form-grid">
              {/* Left: Beat info */}
              <div className="sb-form-left">
                <div className="sb-field">
                  <label>Beat Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Midnight Vibes" className="sb-input" />
                </div>

                <div className="sb-field-row">
                  <div className="sb-field">
                    <label>Genre</label>
                    <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="sb-input">
                      <option value="">Select Genre</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="sb-field">
                    <label>Mood</label>
                    <select value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })} className="sb-input">
                      <option value="">Select Mood</option>
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sb-field-row">
                  <div className="sb-field">
                    <label>BPM</label>
                    <input type="number" value={form.bpm} onChange={e => setForm({ ...form, bpm: e.target.value })}
                      placeholder="140" className="sb-input" min="40" max="300" />
                  </div>
                  <div className="sb-field">
                    <label>Key</label>
                    <select value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} className="sb-input">
                      <option value="">Select Key</option>
                      {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <div className="sb-field">
                  <label>Tags (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="trap, 808, dark, drill" className="sb-input" />
                </div>

                <div className="sb-field">
                  <label>Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your beat..." className="sb-input sb-textarea" rows={3} />
                </div>
              </div>

              {/* Right: Files + pricing */}
              <div className="sb-form-right">
                {/* Artwork */}
                <div className="sb-artwork-upload">
                  <label>Beat Artwork</label>
                  <div className="sb-artwork-box" onClick={() => document.getElementById("sb-art-input").click()}>
                    {artworkPreview ? (
                      <img src={artworkPreview} className="sb-artwork-preview" alt="" />
                    ) : (
                      <div className="sb-artwork-placeholder">
                        <span>🖼️</span>
                        <p>Click to upload artwork</p>
                      </div>
                    )}
                  </div>
                  <input id="sb-art-input" type="file" accept="image/*" onChange={handleArtwork} hidden />
                </div>

                {/* Audio files */}
                <div className="sb-file-group">
                  <div className="sb-field">
                    <label>Preview Audio * (MP3 — watermarked version buyers hear)</label>
                    <input type="file" accept=".mp3,.wav" onChange={e => setPreviewFile(e.target.files[0])} className="sb-file-input" />
                  </div>
                  <div className="sb-field">
                    <label>Clean MP3 (delivered on Basic purchase)</label>
                    <input type="file" accept=".mp3" onChange={e => setMp3File(e.target.files[0])} className="sb-file-input" />
                  </div>
                  <div className="sb-field">
                    <label>WAV File (delivered on Premium+ purchase)</label>
                    <input type="file" accept=".wav" onChange={e => setWavFile(e.target.files[0])} className="sb-file-input" />
                  </div>
                  <div className="sb-field">
                    <label>Stems ZIP (delivered on Stems/Exclusive purchase)</label>
                    <input type="file" accept=".zip,.rar" onChange={e => setStemsFile(e.target.files[0])} className="sb-file-input" />
                  </div>
                </div>

                {/* Pricing */}
                <div className="sb-pricing-section">
                  <h3>💰 License Pricing</h3>
                  <p className="sb-pricing-hint">Set your prices for each license tier</p>
                  <div className="sb-pricing-grid">
                    {[
                      { key: "basic", label: "🎵 Basic Lease", desc: "MP3 only" },
                      { key: "premium", label: "🎶 Premium Lease", desc: "WAV file" },
                      { key: "unlimited", label: "🔓 Unlimited", desc: "Unlimited dist." },
                      { key: "stems", label: "🎛️ Stems", desc: "WAV + Stems" },
                      { key: "exclusive", label: "👑 Exclusive", desc: "Full ownership" },
                    ].map(tier => (
                      <div key={tier.key} className="sb-price-row">
                        <div className="sb-price-label">
                          <span>{tier.label}</span>
                          <span className="sb-price-desc">{tier.desc}</span>
                        </div>
                        <div className="sb-price-input-wrap">
                          <span className="sb-dollar">$</span>
                          <input type="number" className="sb-price-input"
                            value={prices[tier.key]}
                            onChange={e => setPrices({ ...prices, [tier.key]: parseFloat(e.target.value) || 0 })}
                            min="0" step="0.01" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="sb-form-footer">
              <button className="sb-cancel-btn" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="sb-submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Uploading..." : "🚀 List Beat for Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My beats list */}
      <div className="sb-beats-section">
        <h2>Your Beats</h2>
        {loadingBeats ? (
          <div className="sb-loading"><p>Loading...</p></div>
        ) : myBeats.length === 0 ? (
          <div className="sb-empty-beats">
            <p>You haven't listed any beats yet.</p>
            <button className="sb-first-upload" onClick={() => setShowForm(true)}>Upload Your First Beat</button>
          </div>
        ) : (
          <div className="sb-beats-table">
            <div className="sb-table-header">
              <span className="sb-th art">Art</span>
              <span className="sb-th title">Title</span>
              <span className="sb-th genre">Genre</span>
              <span className="sb-th bpm">BPM</span>
              <span className="sb-th price">Price</span>
              <span className="sb-th plays">Plays</span>
              <span className="sb-th sales">Sales</span>
              <span className="sb-th status">Status</span>
              <span className="sb-th actions">Actions</span>
            </div>
            {myBeats.map(b => (
              <div key={b.id} className={`sb-table-row ${!b.is_active ? "inactive" : ""}`}>
                <span className="sb-td art">
                  <img src={b.artwork_url || "/default-beat-artwork.jpg"} alt="" className="sb-row-art" />
                </span>
                <span className="sb-td title">
                  <Link to={`/beats/${b.id}`} className="sb-beat-link">{b.title}</Link>
                </span>
                <span className="sb-td genre">{b.genre || "—"}</span>
                <span className="sb-td bpm">{b.bpm || "—"}</span>
                <span className="sb-td price">${b.base_price}</span>
                <span className="sb-td plays">{(b.plays || 0).toLocaleString()}</span>
                <span className="sb-td sales">{b.total_sales || 0}</span>
                <span className="sb-td status">
                  <span className={`sb-status-badge ${b.is_active ? "active" : "paused"}`}>
                    {b.is_sold_exclusive ? "Sold Exclusive" : b.is_active ? "Active" : "Paused"}
                  </span>
                </span>
                <span className="sb-td actions">
                  {!b.is_sold_exclusive && (
                    <>
                      <button className="sb-action-btn" onClick={() => toggleBeatActive(b.id, b.is_active)}
                        title={b.is_active ? "Pause" : "Activate"}>
                        {b.is_active ? "⏸" : "▶"}
                      </button>
                      <button className="sb-action-btn danger" onClick={() => deleteBeat(b.id)} title="Delete">🗑</button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellBeatsPage;