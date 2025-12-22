import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PodcastCreate.css";

const PodcastCreate = () => {
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
  
  // Settings
  const [isExplicit, setIsExplicit] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  
  // Scheduling
  const [publishType, setPublishType] = useState("now");
  const [scheduledRelease, setScheduledRelease] = useState("");
  
  // UI state
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcasts/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  // Handle cover art preview
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Cover art must be under 5MB" });
        return;
      }
      setCoverArt(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const handleUpload = async () => {
    // Validation
    if (!title.trim()) {
      setMessage({ type: "error", text: "Please enter a podcast title" });
      return;
    }
    if (!description.trim()) {
      setMessage({ type: "error", text: "Please enter a description" });
      return;
    }
    if (!category) {
      setMessage({ type: "error", text: "Please select a category" });
      return;
    }
    if (!audioFile && !videoFile) {
      setMessage({ type: "error", text: "Please upload an audio or video file" });
      return;
    }
    if (accessType === "paid" && (!price || parseFloat(price) <= 0)) {
      setMessage({ type: "error", text: "Please enter a valid price" });
      return;
    }
    if (accessType === "subscription" && (!price || parseFloat(price) < 1)) {
      setMessage({ type: "error", text: "Please enter a subscription price (minimum $1/month)" });
      return;
    }
    if (publishType === "scheduled" && !scheduledRelease) {
      setMessage({ type: "error", text: "Please select a release date" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("language", language);
    formData.append("tags", tags);
    
    if (coverArt) formData.append("cover_art", coverArt);
    if (audioFile) formData.append("audio", audioFile);
    if (videoFile) formData.append("video", videoFile);
    
    formData.append("access_type", accessType);
    if (accessType === "paid") {
      formData.append("price", price);
      formData.append("preview_duration", previewDuration);
    }
    if (accessType === "subscription") {
      formData.append("subscription_price", price);
      formData.append("preview_duration", previewDuration);
    }
    
    formData.append("is_explicit", isExplicit);
    formData.append("allow_comments", allowComments);
    formData.append("allow_downloads", allowDownloads);
    formData.append("streaming_enabled", streamingEnabled);
    
    if (publishType === "scheduled") {
      formData.append("scheduled_release", scheduledRelease);
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload_podcast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "🎉 Podcast uploaded successfully!" });
        setTimeout(() => navigate("/podcast-dashboard"), 2000);
      } else {
        setMessage({ type: "error", text: data.error || "Upload failed" });
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setMessage({ type: "error", text: "Unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="podcast-create-container">
      <h1>🎙️ Create a Podcast</h1>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ===== BASIC INFO ===== */}
      <div className="form-section">
        <h2>📋 Basic Information</h2>
        
        <label>Title *</label>
        <input 
          type="text" 
          placeholder="Enter your podcast title"
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
        />

        <label>Description *</label>
        <textarea 
          placeholder="Describe your podcast episode..."
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
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
            </select>
          </div>
        </div>

        <label>Tags</label>
        <input 
          type="text" 
          placeholder="technology, interviews, news (comma separated)"
          value={tags} 
          onChange={(e) => setTags(e.target.value)} 
        />
      </div>

      {/* ===== MEDIA FILES ===== */}
      <div className="form-section">
        <h2>📁 Media Files</h2>
        
        <label>Cover Art</label>
        <div className="cover-upload-area">
          {coverPreview ? (
            <div className="cover-preview">
              <img src={coverPreview} alt="Cover preview" />
              <button 
                type="button" 
                className="remove-cover"
                onClick={() => { setCoverArt(null); setCoverPreview(null); }}
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="cover-placeholder">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCoverChange}
                id="cover-input"
              />
              <label htmlFor="cover-input" className="cover-label">
                <span className="upload-icon">🖼️</span>
                <span>Click to upload cover art</span>
                <small>Recommended: 1400x1400px, Max 5MB</small>
              </label>
            </div>
          )}
        </div>

        <label>Podcast Audio *</label>
        <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
        {audioFile && <span className="file-name">✓ {audioFile.name}</span>}

        <label>Podcast Video (optional)</label>
        <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} />
        {videoFile && <span className="file-name">✓ {videoFile.name}</span>}
      </div>

      {/* ===== MONETIZATION ===== */}
      <div className="form-section">
        <h2>💰 Monetization</h2>
        <p className="section-desc">Choose how you want to monetize this podcast. You keep 90% of all earnings!</p>
        
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
              <span className="currency">$</span>
              <input 
                type="number" 
                placeholder="0.00"
                min="0.99"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="earnings-preview">
              <p>Price: <strong>${price || "0.00"}</strong></p>
              <p>Platform Fee (10%): <strong>-${price ? (parseFloat(price) * 0.1).toFixed(2) : "0.00"}</strong></p>
              <p className="your-earnings">You Earn: <strong>${price ? (parseFloat(price) * 0.9).toFixed(2) : "0.00"}</strong></p>
            </div>
          </div>
        )}

        {/* Subscription Tier Options */}
        {accessType === "subscription" && (
          <div className="pricing-details">
            <label>Set Your Subscription Price</label>
            <div className="price-input-wrapper">
              <span className="currency">$</span>
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
              <button type="button" onClick={() => setPrice("5")} className={price === "5" ? "active" : ""}>$5</button>
              <button type="button" onClick={() => setPrice("10")} className={price === "10" ? "active" : ""}>$10</button>
              <button type="button" onClick={() => setPrice("15")} className={price === "15" ? "active" : ""}>$15</button>
              <button type="button" onClick={() => setPrice("20")} className={price === "20" ? "active" : ""}>$20</button>
              <button type="button" onClick={() => setPrice("25")} className={price === "25" ? "active" : ""}>$25</button>
            </div>

            <div className="earnings-preview">
              <p>Monthly Price: <strong>${price || "0.00"}</strong></p>
              <p>Platform Fee (10%): <strong>-${price ? (parseFloat(price) * 0.1).toFixed(2) : "0.00"}</strong></p>
              <p className="your-earnings">You Earn: <strong>${price ? (parseFloat(price) * 0.9).toFixed(2) : "0.00"}/month per subscriber</strong></p>
            </div>

            <div className="earnings-projection">
              <h4>💰 Potential Monthly Earnings</h4>
              <div className="projection-grid">
                <div className="projection-item">
                  <span className="projection-subs">10 subscribers</span>
                  <span className="projection-amount">${price ? (parseFloat(price) * 0.9 * 10).toFixed(2) : "0.00"}/mo</span>
                </div>
                <div className="projection-item">
                  <span className="projection-subs">50 subscribers</span>
                  <span className="projection-amount">${price ? (parseFloat(price) * 0.9 * 50).toFixed(2) : "0.00"}/mo</span>
                </div>
                <div className="projection-item">
                  <span className="projection-subs">100 subscribers</span>
                  <span className="projection-amount">${price ? (parseFloat(price) * 0.9 * 100).toFixed(2) : "0.00"}/mo</span>
                </div>
                <div className="projection-item">
                  <span className="projection-subs">500 subscribers</span>
                  <span className="projection-amount">${price ? (parseFloat(price) * 0.9 * 500).toFixed(2) : "0.00"}/mo</span>
                </div>
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
              checked={isExplicit}
              onChange={() => setIsExplicit(!isExplicit)}
            />
            <div className="toggle-info">
              <strong>🔞 Explicit Content</strong>
              <small>Contains adult language or themes</small>
            </div>
          </label>

          <label className="toggle-item">
            <input 
              type="checkbox" 
              checked={allowComments}
              onChange={() => setAllowComments(!allowComments)}
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
              onChange={() => setAllowDownloads(!allowDownloads)}
            />
            <div className="toggle-info">
              <strong>📥 Allow Downloads</strong>
              <small>Let listeners save for offline</small>
            </div>
          </label>

          <label className="toggle-item">
            <input 
              type="checkbox" 
              checked={streamingEnabled}
              onChange={() => setStreamingEnabled(!streamingEnabled)}
            />
            <div className="toggle-info">
              <strong>🔴 Live Streaming</strong>
              <small>Enable live podcast mode</small>
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

      {/* ===== UPLOAD BUTTON ===== */}
      <button 
        className="btn-primary" 
        onClick={handleUpload}
        disabled={loading}
      >
        {loading ? "⏳ Uploading..." : "📤 Upload Podcast"}
      </button>

      {/* Summary Preview */}
      {title && (
        <div className="upload-summary">
          <h3>📋 Preview</h3>
          <p><strong>Title:</strong> {title}</p>
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
          <p><strong>Publish:</strong> {publishType === "now" ? "Immediately" : scheduledRelease || "Not set"}</p>
        </div>
      )}
    </div>
  );
};

export default PodcastCreate;