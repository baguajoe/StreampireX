import React, { useState } from "react";
import "../../styles/ArtistProfile.css";

const UploadTrackModal = ({ onUploadSuccess, onClose }) => {
  const [trackTitle, setTrackTitle] = useState("");
  const [trackDescription, setTrackDescription] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackTitle || !audioFile) {
      setError("Title and audio file are required.");
      return;
    }

    setUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("title", trackTitle);
    formData.append("description", trackDescription);
    formData.append("audio", audioFile);

    try {
      // ✅ Fix 1: Use consistent backend URL
      const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3001";
      
      // ✅ Fix 2: Use the correct endpoint path from backend
      const res = await fetch(`${backendUrl}/api/profile/music/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await res.json();
      console.log("Response Status:", res.status);
      console.log("Response Data:", data);

      if (!res.ok) {
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      // ✅ Fix 3: Handle success response properly
      onUploadSuccess(data.audio);
      onClose();
      setError("");
      
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-modal">
      <div className="modal-content">
        <h2>🎵 Upload New Track</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Track Title"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={trackDescription}
            onChange={(e) => setTrackDescription(e.target.value)}
          />
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files[0])}
            required
          />

          <div className="modal-buttons">
            <button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Submit Track"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
          
          {error && <p className="error-message">❌ {error}</p>}
        </form>
      </div>
    </div>
  );
};

export default UploadTrackModal;