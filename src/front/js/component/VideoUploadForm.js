import React, { useState, useRef } from "react";

const VideoUploadForm = ({ onUploadComplete, onClose, channelId }) => {
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Content declaration fields
  const [ageRestricted, setAgeRestricted] = useState(false);
  const [madeForKids, setMadeForKids] = useState(false);
  const [containsPaidPromotion, setContainsPaidPromotion] = useState(false);
  const [originalContent, setOriginalContent] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = [
    "Gaming", "Music", "Education", "Entertainment", "Technology",
    "Science", "Sports", "News", "Comedy", "Lifestyle", "Travel",
    "Food", "Health", "Business", "Arts", "DIY", "Automotive", "Other"
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];
    const ext = file.name.split(".").pop().toLowerCase();
    const allowedExts = ["mp4", "mov", "webm", "avi", "mkv"];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setError("Invalid file type. Please upload MP4, MOV, WebM, AVI, or MKV files.");
      return;
    }

    // Validate file size (2GB max)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError("File too large. Maximum size is 2GB.");
      return;
    }

    if (file.size < 1024) {
      setError("File too small. Minimum size is 1KB.");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Auto-generate title from filename
    if (!title) {
      const titleFromFile = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(titleFromFile);
    }
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid thumbnail type. Please upload JPG or PNG files.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Thumbnail too large. Maximum size is 10MB.");
      return;
    }

    setThumbnailFile(file);
    setError("");
  };

  const uploadFileToCloud = async (file, type = "video") => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

    const response = await fetch(`${backendUrl}/api/upload/cloudinary`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${type}`);
    }

    const data = await response.json();
    return data.secure_url || data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a video file.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a video title.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to upload videos.");
        setUploading(false);
        return;
      }

      // Step 1: Upload video file to Cloudinary
      setUploadProgress(20);
      const videoUrl = await uploadFileToCloud(selectedFile, "video");

      // Step 2: Upload thumbnail if provided
      let thumbnailUrl = "";
      if (thumbnailFile) {
        setUploadProgress(50);
        thumbnailUrl = await uploadFileToCloud(thumbnailFile, "thumbnail");
      }

      setUploadProgress(70);

      // Process tags
      const tagList = tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

      // Step 3: Register video via JSON endpoint /api/video/upload
      const response = await fetch(`${backendUrl}/api/video/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          file_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          category: category || "Other",
          tags: tagList,
          visibility: visibility,
          is_public: visibility === "public",
          // Content declaration fields
          age_restricted: ageRestricted,
          made_for_kids: madeForKids,
          contains_paid_promotion: containsPaidPromotion,
          original_content: originalContent,
          allow_comments: allowComments,
          allow_likes: allowLikes,
        }),
      });

      // Fallback: If JSON endpoint not found, use FormData endpoint
      if (!response.ok && response.status === 404) {
        const formData = new FormData();
        formData.append("video", selectedFile);
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("category", category || "Other");
        formData.append("tags", tags);
        formData.append("visibility", visibility);
        formData.append("age_restricted", String(ageRestricted));
        formData.append("allow_comments", String(allowComments));
        formData.append("allow_likes", String(allowLikes));
        formData.append("made_for_kids", String(madeForKids));
        formData.append("contains_paid_promotion", String(containsPaidPromotion));
        formData.append("original_content", String(originalContent));
        if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

        const altResponse = await fetch(`${backendUrl}/api/upload_video`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!altResponse.ok) {
          const errData = await altResponse.json();
          throw new Error(errData.error || "Upload failed");
        }

        const altData = await altResponse.json();
        setUploadProgress(100);
        setSuccess("Video uploaded successfully!");

        if (onUploadComplete) {
          onUploadComplete(altData.video || altData);
        }
        return;
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);
      setSuccess("Video uploaded successfully!");

      if (onUploadComplete) {
        onUploadComplete(data.video || data);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="video-upload-form">
      <div className="form-header">
        <h3>📹 Upload Video</h3>
        {onClose && (
          <button className="btn-close" onClick={onClose} type="button">
            ✕
          </button>
        )}
      </div>

      {/* Status Messages */}
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        {/* File Selection */}
        <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
          {selectedFile ? (
            <div className="selected-file">
              <span className="file-icon">🎬</span>
              <div className="file-details">
                <strong>{selectedFile.name}</strong>
                <small>{formatFileSize(selectedFile.size)}</small>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="upload-placeholder">
              <span className="upload-icon">📁</span>
              <p>Click to select video</p>
              <small>MP4, MOV, WebM, AVI, MKV • Max 2GB</small>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* Title */}
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            maxLength={100}
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers about your video..."
            rows={3}
            maxLength={5000}
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated tags"
          />
        </div>

        {/* Thumbnail */}
        <div className="form-group">
          <label>Thumbnail</label>
          <div className="thumbnail-upload">
            {thumbnailFile ? (
              <div className="thumbnail-preview-small">
                <img src={URL.createObjectURL(thumbnailFile)} alt="Thumbnail" />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null);
                    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-upload-thumb"
                onClick={() => thumbnailInputRef.current?.click()}
              >
                🖼️ Upload Thumbnail
              </button>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleThumbnailSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="form-group">
          <label>Visibility</label>
          <div className="visibility-options">
            {[
              { value: "public", icon: "🌍", label: "Public" },
              { value: "unlisted", icon: "🔗", label: "Unlisted" },
              { value: "private", icon: "🔒", label: "Private" },
            ].map((opt) => (
              <label key={opt.value} className={`visibility-option ${visibility === opt.value ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={(e) => setVisibility(e.target.value)}
                />
                <span>{opt.icon} {opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="form-group">
          <button
            type="button"
            className="btn-toggle-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "▾" : "▸"} Content Declarations
          </button>
        </div>

        {/* Content Declaration Fields (collapsible) */}
        {showAdvanced && (
          <div className="content-declarations">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={ageRestricted}
                onChange={(e) => setAgeRestricted(e.target.checked)}
              />
              <div className="option-details">
                <strong>Age-restricted (18+)</strong>
                <small>Contains mature content suitable for adults only</small>
              </div>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={madeForKids}
                onChange={(e) => setMadeForKids(e.target.checked)}
              />
              <div className="option-details">
                <strong>Made for kids</strong>
                <small>Content designed for children under 13</small>
              </div>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={containsPaidPromotion}
                onChange={(e) => setContainsPaidPromotion(e.target.checked)}
              />
              <div className="option-details">
                <strong>Contains paid promotion</strong>
                <small>Includes sponsored content or product placement</small>
              </div>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={originalContent}
                onChange={(e) => setOriginalContent(e.target.checked)}
              />
              <div className="option-details">
                <strong>Original content</strong>
                <small>This is my original creation</small>
              </div>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
              />
              <div className="option-details">
                <strong>Allow comments</strong>
                <small>Let viewers comment on this video</small>
              </div>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={allowLikes}
                onChange={(e) => setAllowLikes(e.target.checked)}
              />
              <div className="option-details">
                <strong>Allow likes</strong>
                <small>Let viewers like this video</small>
              </div>
            </label>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{uploadProgress}% uploaded</span>
          </div>
        )}

        {/* Submit */}
        <div className="form-actions">
          {onClose && (
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-upload" disabled={uploading || !selectedFile}>
            {uploading ? "⏳ Uploading..." : "📤 Upload Video"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VideoUploadForm;