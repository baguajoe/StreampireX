import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/CreateRadioStation.css";

const CreateRadioStation = () => {
  const navigate = useNavigate();
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const mixInputRef = useRef(null);

  // Station Details
  const [stationName, setStationName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [targetAudience, setTargetAudience] = useState("");
  const [broadcastHours, setBroadcastHours] = useState("24/7");
  const [isExplicit, setIsExplicit] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  // Tags
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  // Social Links
  const [socialLinks, setSocialLinks] = useState({
    website: "",
    twitter: "",
    instagram: "",
    youtube: "",
    discord: "",
  });

  // File state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [initialMixFile, setInitialMixFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);

  // Mix Details
  const [mixTitle, setMixTitle] = useState("");
  const [mixDescription, setMixDescription] = useState("");
  const [djName, setDjName] = useState("");
  const [bpm, setBpm] = useState("");
  const [mood, setMood] = useState("");
  const [subGenres, setSubGenres] = useState("");

  // Tracklist for royalty reporting (BMI/ASCAP compliance)
  const [tracklist, setTracklist] = useState([
    {
      songTitle: "",
      artistName: "",
      albumName: "",
      recordLabel: "",
      publisherName: "",
      songwriterNames: "",
      playOrderNumber: 1,
      approximateStartTime: "0:00",
      approximateDuration: "3:30",
    },
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [step, setStep] = useState(1);

  // Fallback genres if API fails
  const fallbackCategories = [
    "Top 40 & Pop Hits", "Classic Pop", "K-Pop & J-Pop", "Indie & Alternative Pop",
    "Classic Rock", "Hard Rock & Metal", "Alternative Rock", "Punk Rock", "Grunge",
    "Hip-Hop & Rap", "R&B & Soul", "Neo-Soul", "Old-School Hip-Hop",
    "EDM", "House & Deep House", "Techno", "Trance", "Drum & Bass", "Dubstep", "Lo-Fi",
    "Smooth Jazz", "Classic Jazz", "Blues & Soul Blues", "Jazz Fusion", "Swing & Big Band",
    "Classical & Opera", "Film Scores & Soundtracks", "Instrumental & Piano Music",
    "Reggaeton", "Salsa & Merengue", "Cumbia & Bachata", "Afrobeat",
    "Modern Country", "Classic Country", "Americana", "Bluegrass",
    "Reggae", "Dancehall", "Roots Reggae",
    "50s & 60s Classics", "70s & 80s Hits", "90s & 2000s Throwbacks",
    "Talk Radio", "News", "Sports", "Comedy", "Mixed Genre", "World Music", "Other",
  ];

  const broadcastOptions = [
    "24/7",
    "Morning (6AM-12PM)",
    "Afternoon (12PM-6PM)",
    "Evening (6PM-12AM)",
    "Overnight (12AM-6AM)",
    "Weekdays Only",
    "Weekends Only",
    "Custom Schedule",
  ];

  const moodOptions = [
    "Chill", "Energetic", "Dark", "Uplifting", "Melancholic",
    "Aggressive", "Smooth", "Funky", "Dreamy", "Intense",
  ];

  // ─── Fetch categories from backend ───────────────────────────────
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/api/radio/categories`);

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories(fallbackCategories);
        setMessage("Using offline categories — some features may be limited.");
        setMessageType("warning");
      }
    };

    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Clean up preview URLs on unmount ────────────────────────────
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
    };
  }, [logoPreview, coverPreview, audioPreview]);

  // ─── File size formatter ─────────────────────────────────────────
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ─── File Handlers ───────────────────────────────────────────────
  const handleLogoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Logo image must be less than 2MB.");
      setMessageType("error");
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Cover image must be less than 5MB.");
      setMessageType("error");
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleMixSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate audio type
    if (!file.type.startsWith("audio/")) {
      const ext = file.name.split(".").pop().toLowerCase();
      const allowed = ["mp3", "wav", "flac", "m4a", "aac", "ogg"];
      if (!allowed.includes(ext)) {
        setMessage("Please upload an MP3, WAV, FLAC, M4A, or OGG file.");
        setMessageType("error");
        return;
      }
    }

    if (file.size > 500 * 1024 * 1024) {
      setMessage("Audio file must be under 500MB.");
      setMessageType("error");
      return;
    }

    // Clean up old preview
    if (audioPreview) URL.revokeObjectURL(audioPreview);

    setInitialMixFile(file);
    setAudioPreview(URL.createObjectURL(file));
    setMessage("");

    // Auto-populate mix title from filename
    if (!mixTitle) {
      setMixTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
    }
  };

  // ─── Tag Management ──────────────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // ─── Tracklist Management (BMI/ASCAP Royalty Compliance) ─────────
  const addTrackToList = () => {
    setTracklist([
      ...tracklist,
      {
        songTitle: "",
        artistName: "",
        albumName: "",
        recordLabel: "",
        publisherName: "",
        songwriterNames: "",
        playOrderNumber: tracklist.length + 1,
        approximateStartTime: "0:00",
        approximateDuration: "3:30",
      },
    ]);
  };

  const removeTrackFromList = (index) => {
    if (tracklist.length > 1) {
      const updated = tracklist
        .filter((_, i) => i !== index)
        .map((track, i) => ({ ...track, playOrderNumber: i + 1 }));
      setTracklist(updated);
    }
  };

  const updateTrack = (index, field, value) => {
    const updated = tracklist.map((track, i) =>
      i === index ? { ...track, [field]: value } : track
    );
    setTracklist(updated);
  };

  const validateTracklist = () => {
    if (tracklist.length === 0) {
      return "At least one track must be listed for royalty compliance";
    }
    for (let i = 0; i < tracklist.length; i++) {
      const track = tracklist[i];
      if (!track.songTitle.trim()) {
        return `Track ${i + 1}: Song title is required`;
      }
      if (!track.artistName.trim()) {
        return `Track ${i + 1}: Artist name is required`;
      }
      if (!track.songwriterNames.trim()) {
        return `Track ${i + 1}: Songwriter name(s) required for royalty reporting`;
      }
    }
    return null;
  };

  // ─── Reset Form ──────────────────────────────────────────────────
  const resetForm = () => {
    setStationName("");
    setDescription("");
    setCategory("");
    setTargetAudience("");
    setBroadcastHours("24/7");
    setIsExplicit(false);
    setWelcomeMessage("");
    setTagInput("");
    setTags([]);
    setSocialLinks({ website: "", twitter: "", instagram: "", youtube: "", discord: "" });
    setLogoFile(null);
    setCoverFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setLogoPreview(null);
    setCoverPreview(null);
    setInitialMixFile(null);
    setAudioPreview(null);
    setMixTitle("");
    setMixDescription("");
    setDjName("");
    setBpm("");
    setMood("");
    setSubGenres("");
    setTracklist([
      {
        songTitle: "",
        artistName: "",
        albumName: "",
        recordLabel: "",
        publisherName: "",
        songwriterNames: "",
        playOrderNumber: 1,
        approximateStartTime: "0:00",
        approximateDuration: "3:30",
      },
    ]);
    setStep(1);
  };

  // ─── Form Submission ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ── Validation ──
    if (!stationName.trim()) {
      setMessage("Station name is required.");
      setMessageType("error");
      return;
    }
    if (!description.trim()) {
      setMessage("Station description is required.");
      setMessageType("error");
      return;
    }
    if (!category) {
      setMessage("Category selection is required.");
      setMessageType("error");
      return;
    }
    if (!targetAudience.trim()) {
      setMessage("Target audience is required.");
      setMessageType("error");
      return;
    }
    if (!logoFile) {
      setMessage("Please upload a logo for your station.");
      setMessageType("error");
      return;
    }
    if (!initialMixFile) {
      setMessage("Please upload an initial mix to get your station started.");
      setMessageType("error");
      return;
    }
    if (!mixTitle.trim()) {
      setMessage("Mix title is required.");
      setMessageType("error");
      return;
    }
    if (!mixDescription.trim()) {
      setMessage("Mix description is required.");
      setMessageType("error");
      return;
    }
    if (!djName.trim()) {
      setMessage("DJ name is required.");
      setMessageType("error");
      return;
    }

    // Validate tracklist (required when audio is uploaded)
    const tracklistError = validateTracklist();
    if (tracklistError) {
      setMessage(tracklistError);
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("Creating your radio station...");
    setMessageType("info");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Please log in to create a radio station.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      const formData = new FormData();

      // Station metadata
      formData.append("name", stationName.trim());
      formData.append("stationName", stationName.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("targetAudience", targetAudience.trim());
      formData.append("broadcastHours", broadcastHours);
      formData.append("isExplicit", isExplicit.toString());
      formData.append("welcomeMessage", welcomeMessage.trim());
      formData.append("tags", JSON.stringify(tags));
      formData.append("socialLinks", JSON.stringify(socialLinks));

      // Mix details
      formData.append("mixTitle", mixTitle.trim());
      formData.append("mixDescription", mixDescription.trim());
      formData.append("djName", djName.trim());
      if (bpm) formData.append("bpm", bpm.trim());
      if (mood) formData.append("mood", mood.trim());
      if (subGenres) formData.append("subGenres", subGenres.trim());

      // Tracklist for royalty compliance
      formData.append("tracklist", JSON.stringify(tracklist));

      // Files
      if (logoFile) formData.append("logo", logoFile);
      if (coverFile) formData.append("cover", coverFile);
      if (initialMixFile) formData.append("initialMix", initialMixFile);

      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      // Primary endpoint: /api/profile/radio/create (comprehensive, supports tracklist)
      let response = await fetch(`${backendUrl}/api/profile/radio/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Fallback to simpler endpoint if primary 404s
      if (!response.ok && response.status === 404) {
        response = await fetch(`${backendUrl}/api/radio/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }

      const data = await response.json();

      if (response.ok) {
        setMessage("🎉 Radio station created successfully!");
        setMessageType("success");

        resetForm();

        setTimeout(() => {
          if (data.station_id || data.station?.id) {
            navigate(`/radio/station/${data.station_id || data.station?.id}/live`);
          } else {
            navigate("/browse-radio-stations");
          }
        }, 2000);
      } else {
        setMessage(data.error || "Failed to create radio station. Please try again.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Create station error:", err);
      if (err.message.includes("fetch")) {
        setMessage("Could not connect to server. Please check your connection.");
      } else if (err.message.includes("401")) {
        setMessage("Authentication error. Please log in again.");
      } else if (err.message.includes("413")) {
        setMessage("Files too large. Please reduce file sizes and try again.");
      } else {
        setMessage(`Error: ${err.message}`);
      }
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step Navigation ─────────────────────────────────────────────
  const nextStep = () => {
    if (step === 1 && !stationName.trim()) {
      setMessage("Station name is required to continue.");
      setMessageType("error");
      return;
    }
    setMessage("");
    setStep(Math.min(step + 1, 5));
  };

  const prevStep = () => {
    setMessage("");
    setStep(Math.max(step - 1, 1));
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="create-radio-page">
      <div className="create-radio-container">
        <h1>📻 Create Radio Station</h1>
        <p className="page-subtitle">
          Launch your own 24/7 radio station on StreampireX
        </p>

        {/* Progress Steps */}
        <div className="progress-steps">
          {[
            { num: 1, label: "Station Info" },
            { num: 2, label: "Branding" },
            { num: 3, label: "First Mix" },
            { num: 4, label: "Tracklist" },
            { num: 5, label: "Settings" },
          ].map((s) => (
            <div
              key={s.num}
              className={`step ${step === s.num ? "active" : ""} ${
                step > s.num ? "completed" : ""
              }`}
              onClick={() => s.num <= step && setStep(s.num)}
            >
              <div className="step-number">
                {step > s.num ? "✓" : s.num}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        {message && (
          <div className={`message ${messageType}`}>{message}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ═══════ Step 1: Station Info ═══════ */}
          {step === 1 && (
            <div className="form-section">
              <h2>🎯 Station Details</h2>

              <label>Station Name *</label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="Enter your station name"
                maxLength={100}
                required
              />

              <label>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your radio station — what makes it unique?"
                rows={4}
                maxLength={1000}
              />

              <div className="form-row">
                <div className="form-group">
                  <label>Genre / Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select a Category</option>
                    {(categories.length > 0 ? categories : fallbackCategories).map(
                      (cat, index) => (
                        <option key={index} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Audience *</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. College students, Night owls"
                  />
                </div>
              </div>

              <label>Broadcast Hours</label>
              <select
                value={broadcastHours}
                onChange={(e) => setBroadcastHours(e.target.value)}
              >
                {broadcastOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Tags */}
              <label>Tags</label>
              <div className="tag-input-container">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add a tag and press Enter"
                  maxLength={30}
                />
                <button type="button" className="btn-add-tag" onClick={addTag}>
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="tags-display">
                  {tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ Step 2: Branding ═══════ */}
          {step === 2 && (
            <div className="form-section">
              <h2>🎨 Station Branding</h2>
              <p className="section-desc">
                Upload your station logo and cover photo
              </p>

              <label>Station Logo *</label>
              <div className="upload-area">
                {!logoPreview ? (
                  <div
                    className="upload-placeholder"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <span className="upload-icon">📷</span>
                    <span>Upload Logo</span>
                    <small>Square image recommended (500x500px) • Max 2MB</small>
                  </div>
                ) : (
                  <div className="upload-preview">
                    <img src={logoPreview} alt="Logo preview" />
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => {
                        if (logoPreview) URL.revokeObjectURL(logoPreview);
                        setLogoFile(null);
                        setLogoPreview(null);
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleLogoSelect}
                  style={{ display: "none" }}
                />
              </div>

              <label>Cover Photo (Optional)</label>
              <div className="upload-area wide">
                {!coverPreview ? (
                  <div
                    className="upload-placeholder"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <span className="upload-icon">🖼️</span>
                    <span>Upload Cover Photo</span>
                    <small>Recommended: 1920x600px • Max 5MB</small>
                  </div>
                ) : (
                  <div className="upload-preview wide">
                    <img src={coverPreview} alt="Cover preview" />
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => {
                        if (coverPreview) URL.revokeObjectURL(coverPreview);
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleCoverSelect}
                  style={{ display: "none" }}
                />
              </div>

              <label>Welcome Message</label>
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Welcome message for listeners tuning in..."
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          {/* ═══════ Step 3: First Mix ═══════ */}
          {step === 3 && (
            <div className="form-section">
              <h2>🎵 Initial Mix / Audio *</h2>
              <p className="section-desc">
                Upload your first mix to start broadcasting. This audio will
                loop until you go live.
              </p>

              <label>Upload Audio Mix *</label>
              <div className="upload-area">
                <div
                  className={`upload-placeholder ${initialMixFile ? "has-file" : ""}`}
                  onClick={() => mixInputRef.current?.click()}
                >
                  {initialMixFile ? (
                    <div className="audio-file-info">
                      <span className="upload-icon">🎵</span>
                      <div>
                        <strong>{initialMixFile.name}</strong>
                        <small>{formatFileSize(initialMixFile.size)}</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="upload-icon">🎶</span>
                      <span>Click to upload audio</span>
                      <small>MP3, WAV, FLAC, M4A • Max 500MB</small>
                    </>
                  )}
                </div>
                <input
                  ref={mixInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleMixSelect}
                  style={{ display: "none" }}
                />
              </div>

              {/* Audio Preview Player */}
              {audioPreview && (
                <div className="audio-preview-container">
                  <audio controls className="audio-preview">
                    <source
                      src={audioPreview}
                      type={initialMixFile?.type || "audio/mpeg"}
                    />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Mix Details */}
              <div className="form-row">
                <div className="form-group">
                  <label>Mix Title *</label>
                  <input
                    type="text"
                    value={mixTitle}
                    onChange={(e) => setMixTitle(e.target.value)}
                    placeholder="Name your mix"
                  />
                </div>

                <div className="form-group">
                  <label>DJ Name *</label>
                  <input
                    type="text"
                    value={djName}
                    onChange={(e) => setDjName(e.target.value)}
                    placeholder="Your DJ name"
                  />
                </div>
              </div>

              <label>Mix Description *</label>
              <textarea
                value={mixDescription}
                onChange={(e) => setMixDescription(e.target.value)}
                placeholder="Describe this mix..."
                rows={3}
              />

              <div className="form-row">
                <div className="form-group">
                  <label>BPM (optional)</label>
                  <input
                    type="text"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    placeholder="e.g. 120"
                  />
                </div>

                <div className="form-group">
                  <label>Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                  >
                    <option value="">Select mood</option>
                    {moodOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label>Sub-Genres</label>
              <input
                type="text"
                value={subGenres}
                onChange={(e) => setSubGenres(e.target.value)}
                placeholder="e.g. Deep House, Tropical, Melodic Techno"
              />
            </div>
          )}

          {/* ═══════ Step 4: Tracklist (Royalty Compliance) ═══════ */}
          {step === 4 && (
            <div className="form-section">
              <h2>📋 Tracklist — Royalty Compliance</h2>
              <p className="section-desc compliance-note">
                Complete track information is legally required for proper royalty
                distribution to artists, songwriters, and publishers via
                BMI/ASCAP/SoundExchange.
              </p>

              {tracklist.map((track, index) => (
                <div key={index} className="track-item">
                  <div className="track-header">
                    <h3 className="sub-heading">
                      Track {track.playOrderNumber}
                    </h3>
                    {tracklist.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-track"
                        onClick={() => removeTrackFromList(index)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Required Fields */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Song Title *</label>
                      <input
                        type="text"
                        value={track.songTitle}
                        onChange={(e) =>
                          updateTrack(index, "songTitle", e.target.value)
                        }
                        placeholder="Song title"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Artist Name *</label>
                      <input
                        type="text"
                        value={track.artistName}
                        onChange={(e) =>
                          updateTrack(index, "artistName", e.target.value)
                        }
                        placeholder="Artist name"
                        required
                      />
                    </div>
                  </div>

                  <label>Songwriter(s) *</label>
                  <input
                    type="text"
                    value={track.songwriterNames}
                    onChange={(e) =>
                      updateTrack(index, "songwriterNames", e.target.value)
                    }
                    placeholder="Songwriter name(s) — separate multiple with commas (required for royalties)"
                    required
                  />

                  {/* Additional Metadata */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Album Name</label>
                      <input
                        type="text"
                        value={track.albumName}
                        onChange={(e) =>
                          updateTrack(index, "albumName", e.target.value)
                        }
                        placeholder="Album (if applicable)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Record Label</label>
                      <input
                        type="text"
                        value={track.recordLabel}
                        onChange={(e) =>
                          updateTrack(index, "recordLabel", e.target.value)
                        }
                        placeholder="Record label (if known)"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Publisher</label>
                      <input
                        type="text"
                        value={track.publisherName}
                        onChange={(e) =>
                          updateTrack(index, "publisherName", e.target.value)
                        }
                        placeholder="Publisher (if known)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Duration</label>
                      <input
                        type="text"
                        value={track.approximateDuration}
                        onChange={(e) =>
                          updateTrack(
                            index,
                            "approximateDuration",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 3:45"
                      />
                    </div>
                  </div>

                  <label>Start Time in Mix</label>
                  <input
                    type="text"
                    value={track.approximateStartTime}
                    onChange={(e) =>
                      updateTrack(
                        index,
                        "approximateStartTime",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 0:00, 3:45"
                  />
                </div>
              ))}

              <button
                type="button"
                className="btn-add-track"
                onClick={addTrackToList}
              >
                + Add Another Track
              </button>

              <div className="royalty-notice">
                <p>
                  <strong>Important:</strong> This tracklist will be used for:
                </p>
                <ul>
                  <li>BMI &amp; ASCAP royalty reporting</li>
                  <li>SoundExchange digital performance royalties</li>
                  <li>Mechanical license compliance</li>
                  <li>Artist and songwriter credit attribution</li>
                </ul>
                <p>
                  Incomplete information may result in legal compliance issues
                  and unpaid royalties to rights holders.
                </p>
              </div>
            </div>
          )}

          {/* ═══════ Step 5: Settings & Social ═══════ */}
          {step === 5 && (
            <div className="form-section">
              <h2>⚙️ Settings &amp; Social</h2>

              <label className="toggle-item">
                <input
                  type="checkbox"
                  checked={isExplicit}
                  onChange={(e) => setIsExplicit(e.target.checked)}
                />
                <div className="toggle-info">
                  <strong>Explicit Content</strong>
                  <small>Mark station as containing explicit content</small>
                </div>
              </label>

              <h3 className="sub-heading">🔗 Social Links</h3>

              <label>Website</label>
              <input
                type="text"
                value={socialLinks.website}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, website: e.target.value })
                }
                placeholder="https://yourwebsite.com"
              />

              <label>Twitter / X</label>
              <input
                type="text"
                value={socialLinks.twitter}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, twitter: e.target.value })
                }
                placeholder="@yourhandle"
              />

              <label>Instagram</label>
              <input
                type="text"
                value={socialLinks.instagram}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, instagram: e.target.value })
                }
                placeholder="@yourhandle"
              />

              <label>YouTube</label>
              <input
                type="text"
                value={socialLinks.youtube}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, youtube: e.target.value })
                }
                placeholder="YouTube channel URL"
              />

              <label>Discord</label>
              <input
                type="text"
                value={socialLinks.discord}
                onChange={(e) =>
                  setSocialLinks({ ...socialLinks, discord: e.target.value })
                }
                placeholder="Discord server invite link"
              />
            </div>
          )}

          {/* ═══════ Navigation Buttons ═══════ */}
          <div className="form-navigation">
            {step > 1 && (
              <button type="button" className="btn-back" onClick={prevStep}>
                ← Back
              </button>
            )}

            {step < 5 ? (
              <button type="button" className="btn-next" onClick={nextStep}>
                Next Step →
              </button>
            ) : (
              <button type="submit" className="btn-create" disabled={loading}>
                {loading
                  ? "⏳ Creating Station..."
                  : "📻 Create Station"}
              </button>
            )}
          </div>
        </form>

        <p className="next-steps-info">
          After creating your station, you'll be able to upload more music and
          manage your playlists.
        </p>
      </div>
    </div>
  );
};

export default CreateRadioStation;