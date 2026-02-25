import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PodcastCreate.css";

const PodcastCreate = () => {
  const navigate = useNavigate();
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [tags, setTags] = useState("");

  // Media files
  const [coverArt, setCoverArt] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  // Monetization
  const [accessType, setAccessType] = useState("free"); // free, paid, subscription
  const [price, setPrice] = useState("");
  const [previewDuration, setPreviewDuration] = useState("0");

  // Settings toggles
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [explicitContent, setExplicitContent] = useState(false);

  // Publishing
  const [publishType, setPublishType] = useState("now");
  const [scheduledRelease, setScheduledRelease] = useState("");

  // UI state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Fallback categories if API doesn't return any
  const fallbackCategories = [
    "General", "Technology", "Business", "Comedy", "Education",
    "Health & Fitness", "Music", "News", "Science", "Society & Culture",
    "Sports", "True Crime", "Arts", "Fiction", "History",
    "Kids & Family", "Leisure", "Government", "Religion & Spirituality", "TV & Film"
  ];

  const suggestedPrices = {
    paid: ["1.99", "2.99", "4.99", "7.99", "9.99", "14.99"],
    subscription: ["5", "10", "15", "20", "25"]
  };

  // =============================================
  // FETCH CATEGORIES ON MOUNT
  // =============================================
  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    fetch(`${backendUrl}/api/podcasts/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setCategories(data);
        }
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  // Cleanup cover preview URL on unmount
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // =============================================
  // FILE HANDLERS WITH VALIDATION
  // =============================================
  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPG, PNG, or WebP image.");
      setMessageType("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Cover art must be under 10MB.");
      setMessageType("error");
      return;
    }

    setCoverArt(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
    setMessage("");
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/flac", "audio/m4a", "audio/x-m4a", "audio/aac"];
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["mp3", "wav", "flac", "m4a", "aac"];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setMessage("Please upload an MP3, WAV, FLAC, M4A, or AAC file.");
      setMessageType("error");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setMessage("Audio file must be under 500MB.");
      setMessageType("error");
      return;
    }

    setAudioFile(file);
    setMessage("");
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["mp4", "mov", "avi", "mkv", "webm"];

    if (!allowedExts.includes(ext)) {
      setMessage("Please upload an MP4, MOV, AVI, MKV, or WebM video.");
      setMessageType("error");
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setMessage("Video file must be under 2GB.");
      setMessageType("error");
      return;
    }

    setVideoFile(file);
    setMessage("");
  };

  const removeCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverArt(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  // =============================================
  // EARNINGS HELPERS
  // =============================================
  const getEarningsEstimate = (subs) => {
    const p = parseFloat(price) || 0;
    const yourCut = p * 0.90 * subs;
    return `$${yourCut.toFixed(2)}`;
  };

  // =============================================
  // SUBMIT
  // =============================================
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validation
    if (!title.trim()) {
      setMessage("Podcast title is required.");
      setMessageType("error");
      return;
    }

    if (!description.trim()) {
      setMessage("Please enter a description.");
      setMessageType("error");
      return;
    }

    if (!category) {
      setMessage("Please select a category.");
      setMessageType("error");
      return;
    }

    if (!audioFile && !videoFile) {
      setMessage("Please upload at least one audio or video file.");
      setMessageType("error");
      return;
    }

    if (accessType === "paid" && (!price || parseFloat(price) <= 0)) {
      setMessage("Please enter a valid price.");
      setMessageType("error");
      return;
    }

    if (accessType === "subscription" && (!price || parseFloat(price) < 1)) {
      setMessage("Subscription price must be at least $1/month.");
      setMessageType("error");
      return;
    }

    if (publishType === "scheduled" && !scheduledRelease) {
      setMessage("Please select a release date.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please log in to create a podcast.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const formData = new FormData();

      // Basic info
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("language", language);
      formData.append("tags", tags);

      // Media files
      if (coverArt) formData.append("cover_art", coverArt);
      if (audioFile) formData.append("audio", audioFile);
      if (videoFile) formData.append("video", videoFile);

      // Monetization
      formData.append("access_type", accessType);
      if (accessType === "paid") {
        formData.append("price", price);
        formData.append("preview_duration", previewDuration);
        formData.append("subscription_tier", "Premium");
      }
      if (accessType === "subscription") {
        formData.append("subscription_price", price);
        formData.append("preview_duration", previewDuration);
        formData.append("subscription_tier", "Premium");
      }
      if (accessType === "free") {
        formData.append("subscription_tier", "Free");
      }

      // Settings
      formData.append("streaming_enabled", streamingEnabled.toString());
      formData.append("is_explicit", explicitContent.toString());
      formData.append("allow_comments", allowComments.toString());
      formData.append("allow_downloads", allowDownloads.toString());

      // Scheduling
      if (publishType === "scheduled" && scheduledRelease) {
        formData.append("scheduled_release", scheduledRelease);
      }

      const response = await fetch(`${backendUrl}/api/upload_podcast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("🎉 Podcast created successfully!");
        setMessageType("success");

        setTimeout(() => {
          const podcastId = data.podcast_id || data.podcast?.id;
          if (podcastId) {
            navigate(`/podcast/${podcastId}`);
          } else {
            navigate("/podcast-dashboard");
          }
        }, 2000);
      } else {
        setMessage(data.error || "Failed to create podcast. Please try again.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Podcast upload error:", err);
      setMessage("Network error. Please check your connection and try again.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="podcast-create-container">
      <h1>🎙️ Create Your Podcast</h1>

      {/* 🎙️ Record in Studio Banner */}
      <div
        className="record-studio-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(0, 255, 200, 0.08), rgba(0, 136, 255, 0.08))',
          border: '1px solid rgba(0, 255, 200, 0.2)',
          borderRadius: '12px',
          marginBottom: '24px'
        }}
      >
        <div>
          <strong style={{ color: '#fff', fontSize: '15px' }}>🎙️ Want to record instead of upload?</strong>
          <p style={{ color: '#aaa', fontSize: '13px', margin: '4px 0 0' }}>
            Record with guests, add soundboard effects, chapters, and publish — all in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/podcast-studio')}
          style={{
            padding: '10px 22px',
            background: '#00ffc8',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          Open Podcast Studio
        </button>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ===== BASIC INFO ===== */}
        <div className="form-section">
          <h2>📋 Basic Information</h2>
          <p className="section-desc">Tell listeners about your podcast</p>

          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your podcast title"
            maxLength={255}
            required
          />

          <label>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your podcast episode - what's it about? Who's it for?"
            rows={5}
            maxLength={2000}
          />

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a Category</option>
                {categories.length > 0
                  ? categories.map((cat) => (
                      <option key={cat.id || cat} value={cat.slug || cat}>
                        {cat.name || cat}
                      </option>
                    ))
                  : fallbackCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))
                }
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
              </select>
            </div>
          </div>

          <label>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="technology, interviews, news (comma separated)"
          />
        </div>

        {/* ===== COVER ART ===== */}
        <div className="form-section">
          <h2>🎨 Cover Art</h2>
          <p className="section-desc">Upload artwork for your podcast (recommended: 1400x1400px)</p>

          <div className="cover-upload-area">
            {!coverPreview ? (
              <div className="cover-placeholder">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverSelect}
                  id="cover-input"
                />
                <label htmlFor="cover-input" className="cover-label">
                  <span className="upload-icon">🖼️</span>
                  <span>Click to upload cover art</span>
                  <small>JPG, PNG, or WebP • Max 10MB</small>
                </label>
              </div>
            ) : (
              <div className="cover-preview">
                <img src={coverPreview} alt="Cover preview" />
                <button type="button" className="remove-cover" onClick={removeCover}>
                  ✕ Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===== MEDIA FILES ===== */}
        <div className="form-section">
          <h2>🎵 Media Files</h2>
          <p className="section-desc">Upload audio and/or video for your podcast</p>

          <label>🎧 Podcast Audio *</label>
          <input
            ref={audioInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.m4a,.aac"
            onChange={handleAudioSelect}
          />
          {audioFile && (
            <span className="file-name">
              ✅ {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          )}

          <label>📹 Podcast Video (Optional)</label>
          <input
            ref={videoInputRef}
            type="file"
            accept=".mp4,.mov,.avi,.mkv,.webm"
            onChange={handleVideoSelect}
          />
          {videoFile && (
            <span className="file-name">
              ✅ {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          )}

          <small className="helper-text">
            Audio: MP3, WAV, FLAC, M4A, AAC (max 500MB) • Video: MP4, MOV, AVI, MKV, WebM (max 2GB)
          </small>
        </div>

        {/* ===== MONETIZATION ===== */}
        <div className="form-section">
          <h2>💰 Monetization</h2>
          <p className="section-desc">Choose how to monetize your podcast. You keep 90% of all earnings!</p>

          <label>Who can access this podcast?</label>
          <div className="access-options">
            <label className={`access-option ${accessType === "free" ? "selected" : ""}`}>
              <input
                type="radio"
                name="accessType"
                value="free"
                checked={accessType === "free"}
                onChange={(e) => setAccessType(e.target.value)}
              />
              <div className="option-content">
                <span className="option-icon">🆓</span>
                <div className="option-info">
                  <strong>Free for Everyone</strong>
                  <small>Anyone can listen - great for growing your audience</small>
                </div>
              </div>
            </label>

            <label className={`access-option ${accessType === "paid" ? "selected" : ""}`}>
              <input
                type="radio"
                name="accessType"
                value="paid"
                checked={accessType === "paid"}
                onChange={(e) => setAccessType(e.target.value)}
              />
              <div className="option-content">
                <span className="option-icon">💵</span>
                <div className="option-info">
                  <strong>One-Time Purchase</strong>
                  <small>Listeners pay once for permanent access</small>
                </div>
              </div>
            </label>

            <label className={`access-option ${accessType === "subscription" ? "selected" : ""}`}>
              <input
                type="radio"
                name="accessType"
                value="subscription"
                checked={accessType === "subscription"}
                onChange={(e) => setAccessType(e.target.value)}
              />
              <div className="option-content">
                <span className="option-icon">⭐</span>
                <div className="option-info">
                  <strong>Subscribers Only</strong>
                  <small>Exclusive content for your paying subscribers</small>
                </div>
              </div>
            </label>
          </div>

          {/* Paid Content Options */}
          {accessType === "paid" && (
            <div className="pricing-details">
              <label>Set Your Price</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0.99"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="suggested-prices">
                <span className="suggested-label">Popular prices:</span>
                {suggestedPrices.paid.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(p)}
                    className={price === p ? "selected" : ""}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              <div className="earnings-preview">
                <p>
                  <span>Price:</span>
                  <strong>${price || "0.00"}</strong>
                </p>
                <p>
                  <span>Platform Fee (10%):</span>
                  <strong>-${price ? (parseFloat(price) * 0.10).toFixed(2) : "0.00"}</strong>
                </p>
                <p className="your-earnings">
                  <span>You Earn:</span>
                  <strong>${price ? (parseFloat(price) * 0.90).toFixed(2) : "0.00"} per sale</strong>
                </p>
              </div>
            </div>
          )}

          {/* Subscription Options */}
          {accessType === "subscription" && (
            <div className="pricing-details">
              <label>Set Your Subscription Price</label>
              <div className="price-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <span className="price-suffix">/ month</span>
              </div>

              <div className="suggested-prices">
                <span className="suggested-label">Popular prices:</span>
                {suggestedPrices.subscription.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrice(p)}
                    className={price === p ? "selected" : ""}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              <div className="earnings-preview">
                <p>
                  <span>Monthly Price:</span>
                  <strong>${price || "0.00"}</strong>
                </p>
                <p>
                  <span>Platform Fee (10%):</span>
                  <strong>-${price ? (parseFloat(price) * 0.10).toFixed(2) : "0.00"}</strong>
                </p>
                <p className="your-earnings">
                  <span>You Earn:</span>
                  <strong>${price ? (parseFloat(price) * 0.90).toFixed(2) : "0.00"}/month per subscriber</strong>
                </p>
              </div>

              {/* Earnings Projection */}
              <div className="earnings-projection">
                <h4>📊 Monthly Earnings Projection</h4>
                <div className="projection-grid">
                  {[10, 50, 100, 500].map((subs) => (
                    <div key={subs} className="projection-item">
                      <span className="projection-subs">{subs} subscribers</span>
                      <span className="projection-amount">{getEarningsEstimate(subs)}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Free Preview for Paid/Subscription */}
          {(accessType === "paid" || accessType === "subscription") && (
            <div className="preview-option">
              <label>Free Preview</label>
              <select
                value={previewDuration}
                onChange={(e) => setPreviewDuration(e.target.value)}
              >
                <option value="0">No free preview</option>
                <option value="1">First 1 minute</option>
                <option value="2">First 2 minutes</option>
                <option value="5">First 5 minutes</option>
                <option value="10">First 10 minutes</option>
              </select>
              <span className="helper-text">Let listeners sample before they buy</span>
            </div>
          )}
        </div>

        {/* ===== SETTINGS ===== */}
        <div className="form-section">
          <h2>⚙️ Settings</h2>

          <div className="toggle-group">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={streamingEnabled}
                onChange={(e) => setStreamingEnabled(e.target.checked)}
              />
              <div className="toggle-info">
                <strong>🔴 Live Streaming</strong>
                <small>Enable live podcast mode</small>
              </div>
            </label>

            <label className="toggle-item">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
              />
              <div className="toggle-info">
                <strong>💬 Allow Comments</strong>
                <small>Let listeners leave feedback</small>
              </div>
            </label>

            <label className="toggle-item">
              <input
                type="checkbox"
                checked={allowDownloads}
                onChange={(e) => setAllowDownloads(e.target.checked)}
              />
              <div className="toggle-info">
                <strong>📥 Allow Downloads</strong>
                <small>Let listeners save for offline listening</small>
              </div>
            </label>

            <label className="toggle-item">
              <input
                type="checkbox"
                checked={explicitContent}
                onChange={(e) => setExplicitContent(e.target.checked)}
              />
              <div className="toggle-info">
                <strong>🔞 Explicit Content</strong>
                <small>Contains adult language or themes</small>
              </div>
            </label>
          </div>
        </div>

        {/* ===== PUBLISHING ===== */}
        <div className="form-section">
          <h2>📅 Publishing</h2>

          <div className="publish-options">
            <label className={`publish-option ${publishType === "now" ? "selected" : ""}`}>
              <input
                type="radio"
                name="publishType"
                value="now"
                checked={publishType === "now"}
                onChange={(e) => setPublishType(e.target.value)}
              />
              <span>🚀 Publish Now</span>
            </label>

            <label className={`publish-option ${publishType === "scheduled" ? "selected" : ""}`}>
              <input
                type="radio"
                name="publishType"
                value="scheduled"
                checked={publishType === "scheduled"}
                onChange={(e) => setPublishType(e.target.value)}
              />
              <span>📆 Schedule for Later</span>
            </label>
          </div>

          {publishType === "scheduled" && (
            <div className="schedule-input">
              <label>Release Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledRelease}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => setScheduledRelease(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* ===== UPLOAD SUMMARY ===== */}
        {(title || audioFile || videoFile) && (
          <div className="upload-summary">
            <h3>📋 Upload Summary</h3>
            {title && <p><strong>Title:</strong> {title}</p>}
            {category && <p><strong>Category:</strong> {category}</p>}
            {language && <p><strong>Language:</strong> {language.toUpperCase()}</p>}
            {tags && <p><strong>Tags:</strong> {tags}</p>}
            <p><strong>Access:</strong> {
              accessType === "free" ? "Free for everyone" :
              accessType === "paid" ? `$${price || "0.00"} one-time purchase` :
              `$${price || "0.00"}/month subscription`
            }</p>
            {(accessType === "paid" || accessType === "subscription") && price && (
              <p><strong>Your Earnings:</strong> ${(parseFloat(price) * 0.9).toFixed(2)} {accessType === "subscription" ? "/month per subscriber" : "per sale"}</p>
            )}
            {(accessType === "paid" || accessType === "subscription") && previewDuration !== "0" && (
              <p><strong>Preview:</strong> First {previewDuration} min free</p>
            )}
            {audioFile && <p><strong>Audio:</strong> {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)</p>}
            {videoFile && <p><strong>Video:</strong> {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</p>}
            {coverArt && <p><strong>Cover Art:</strong> {coverArt.name}</p>}
            <p><strong>Streaming:</strong> {streamingEnabled ? "Enabled" : "Disabled"}</p>
            <p><strong>Publish:</strong> {publishType === "now" ? "Immediately" : scheduledRelease || "Not set"}</p>
          </div>
        )}

        {/* ===== SUBMIT ===== */}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "⏳ Uploading Podcast..." : "🚀 Create Podcast"}
        </button>
      </form>
    </div>
  );
};

export default PodcastCreate;