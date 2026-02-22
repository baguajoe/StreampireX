import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/BeatsTab.css";

const BeatsTab = ({ userId, isOwner }) => {
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const [beats, setBeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentBeat, setCurrentBeat] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");

    useEffect(() => { fetchBeats(); }, [userId]);

    const fetchBeats = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/beats?producer_id=${userId}`);
            const data = await res.json();
            setBeats(data.beats || []);
        } catch (err) {
            console.error("Failed to load beats:", err);
        }
        setLoading(false);
    };

    const playBeat = (beat) => {
        if (currentBeat?.id === beat.id && isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }
        setCurrentBeat(beat);
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.src = beat.preview_url;
            audioRef.current.play().catch(() => setIsPlaying(false));
        }
    };

    if (loading) return <div className="no-content"><p>Loading beats...</p></div>;

    return (
        <div className="beats-tab">
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

            <div className="section-header">
                <h2 style={{ color: "#00ffc8", borderBottom: "2px solid #00ffc8", paddingBottom: "10px" }}>
                    🎹 Beats ({beats.length})
                </h2>
                {isOwner && (
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button className="create-btn" onClick={() => setShowUploadModal(true)}>+ Upload Beat</button>
                        <Link to="/beats/my-beats" className="create-btn" style={{ background: "rgba(0,255,200,0.2)", color: "#00ffc8" }}>
                            Manage Beats
                        </Link>
                    </div>
                )}
            </div>

            {beats.length === 0 ? (
                <div className="no-content">
                    <p>{isOwner ? "You haven't listed any beats for sale yet." : "No beats available."}</p>
                    {isOwner && (
                        <div style={{ marginTop: "15px" }}>
                            <p style={{ color: "#888", marginBottom: "15px" }}>
                                List beats from your uploads or create new ones in the Beat Maker
                            </p>
                            <button className="upload-first-btn" onClick={() => setShowUploadModal(true)}>
                                Upload Your First Beat
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="beats-profile-grid">
                    {beats.map(beat => (
                        <div key={beat.id} className="beat-profile-card">
                            <div className="beat-card-artwork-container">
                                <img src={beat.artwork_url || "/default-beat-artwork.jpg"} alt={beat.title} className="beat-card-artwork" />
                                <button className="beat-card-play" onClick={() => playBeat(beat)}>
                                    {currentBeat?.id === beat.id && isPlaying ? "⏸" : "▶"}
                                </button>
                                {beat.is_free_download && <span className="beat-card-free">FREE</span>}
                            </div>
                            <div className="beat-card-info">
                                <h4 className="beat-card-title" onClick={() => navigate(`/beats/${beat.id}`)} style={{ cursor: "pointer" }}>
                                    {beat.title}
                                </h4>
                                <div className="beat-card-meta">
                                    {beat.bpm && <span className="meta-tag bpm">{beat.bpm} BPM</span>}
                                    {beat.key && <span className="meta-tag key">{beat.key}</span>}
                                    {beat.genre && <span className="meta-tag genre">{beat.genre}</span>}
                                </div>
                                <div className="beat-card-footer">
                                    <span className="beat-card-plays">▶ {(beat.plays || 0).toLocaleString()}</span>
                                    {beat.is_free_download ? (
                                        <span style={{ color: "#10b981", fontWeight: 600, fontSize: "0.85rem" }}>Free</span>
                                    ) : (
                                        <span style={{ color: "#00ffc8", fontWeight: 700, fontSize: "1rem" }}>${beat.base_price}</span>
                                    )}
                                </div>
                                <button className="beat-card-license-btn" onClick={() => navigate(`/beats/${beat.id}`)}>
                                    {isOwner ? "View Listing" : "License Beat"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showUploadModal && isOwner && (
                <BeatUploadModal backendUrl={backendUrl} token={token}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={() => { setShowUploadModal(false); fetchBeats(); }} />
            )}
        </div>
    );
};

const BeatUploadModal = ({ backendUrl, token, onClose, onSuccess }) => {
    const [form, setForm] = useState({ title: "", genre: "", mood: "", bpm: "", key: "", tags: "", description: "" });
    const [previewFile, setPreviewFile] = useState(null);
    const [mp3File, setMp3File] = useState(null);
    const [wavFile, setWavFile] = useState(null);
    const [stemsFile, setStemsFile] = useState(null);
    const [artworkFile, setArtworkFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!form.title || !previewFile) { setError("Title and preview audio are required."); return; }
        setSubmitting(true);
        setError("");

        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("genre", form.genre);
        formData.append("mood", form.mood);
        formData.append("bpm", form.bpm);
        formData.append("key", form.key);
        formData.append("description", form.description);
        formData.append("tags", JSON.stringify(form.tags.split(",").map(t => t.trim()).filter(Boolean)));
        formData.append("preview_file", previewFile);
        if (mp3File) formData.append("mp3_file", mp3File);
        if (wavFile) formData.append("wav_file", wavFile);
        if (stemsFile) formData.append("stems_file", stemsFile);
        if (artworkFile) formData.append("artwork", artworkFile);

        try {
            const res = await fetch(`${backendUrl}/api/beats`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
            });
            const data = await res.json();
            if (res.ok) onSuccess();
            else setError(data.error || "Upload failed");
        } catch (err) { setError("Upload failed. Please try again."); }
        setSubmitting(false);
    };

    const GENRES = ["Trap", "Hip-Hop", "R&B", "Pop", "Drill", "Lo-Fi", "Afrobeat", "Reggaeton", "House", "Boom Bap", "Soul", "Jazz", "Rock", "EDM", "Dancehall", "Other"];
    const MOODS = ["Dark", "Energetic", "Chill", "Aggressive", "Sad", "Happy", "Bouncy", "Melodic", "Hard"];
    const KEYS = ["C Major", "C Minor", "C# Major", "C# Minor", "D Major", "D Minor", "D# Major", "D# Minor",
        "E Major", "E Minor", "F Major", "F Minor", "F# Major", "F# Minor", "G Major", "G Minor",
        "G# Major", "G# Minor", "A Major", "A Minor", "A# Major", "A# Minor", "B Major", "B Minor"];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="creation-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "580px" }}>
                <div className="creation-modal-header">
                    <h3>🎹 Upload Beat</h3>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="creation-modal-body">
                    {error && <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)", borderRadius: "8px", padding: "10px", color: "#f44336", marginBottom: "12px" }}>{error}</div>}
                    <div className="creation-form-group">
                        <label>Beat Title *</label>
                        <input className="creation-input" placeholder="e.g. Midnight Drill" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="creation-form-group">
                            <label>Genre</label>
                            <select className="creation-input" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                                <option value="">Select Genre</option>
                                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="creation-form-group">
                            <label>Mood</label>
                            <select className="creation-input" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
                                <option value="">Select Mood</option>
                                {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div className="creation-form-group">
                            <label>BPM</label>
                            <input className="creation-input" type="number" placeholder="140" value={form.bpm} onChange={(e) => setForm({ ...form, bpm: e.target.value })} />
                        </div>
                        <div className="creation-form-group">
                            <label>Key</label>
                            <select className="creation-input" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}>
                                <option value="">Select Key</option>
                                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="creation-form-group">
                        <label>Tags (comma separated)</label>
                        <input className="creation-input" placeholder="trap, 808, dark, drill" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                    </div>
                    <div className="creation-form-group">
                        <label>Description</label>
                        <textarea className="creation-input" rows={2} placeholder="Describe your beat..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
                    </div>
                    <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "8px 0" }} />
                    <div className="creation-form-group">
                        <label>Preview Audio (MP3) * — this is what buyers hear</label>
                        <input className="creation-input creation-file-input" type="file" accept=".mp3,.wav" onChange={(e) => setPreviewFile(e.target.files[0])} />
                        <p className="creation-hint">Tip: Use a tagged/watermarked version so it can't be ripped</p>
                    </div>
                    <div className="creation-form-group">
                        <label>Clean MP3 (delivered on Basic purchase)</label>
                        <input className="creation-input creation-file-input" type="file" accept=".mp3" onChange={(e) => setMp3File(e.target.files[0])} />
                    </div>
                    <div className="creation-form-group">
                        <label>WAV File (delivered on Premium+ purchase)</label>
                        <input className="creation-input creation-file-input" type="file" accept=".wav" onChange={(e) => setWavFile(e.target.files[0])} />
                    </div>
                    <div className="creation-form-group">
                        <label>Stems ZIP (delivered on Stems/Exclusive purchase)</label>
                        <input className="creation-input creation-file-input" type="file" accept=".zip,.rar" onChange={(e) => setStemsFile(e.target.files[0])} />
                    </div>
                    <div className="creation-form-group">
                        <label>Beat Artwork</label>
                        <input className="creation-input creation-file-input" type="file" accept="image/*" onChange={(e) => setArtworkFile(e.target.files[0])} />
                    </div>
                </div>
                <div className="creation-modal-footer">
                    <button className="creation-cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="creation-submit-btn" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Uploading..." : "List Beat for Sale"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BeatsTab;