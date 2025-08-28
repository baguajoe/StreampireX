import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/PodcastCreate.css";

const PodcastCreate = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverArt, setCoverArt] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState("Free");
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [scheduledRelease, setScheduledRelease] = useState("");
  const [categories, setCategories] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/podcasts/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  const handleUpload = async () => {
    // ✅ Validation before upload
    if (!title.trim() || !description.trim() || !category) {
      alert("⚠️ Please fill in the title, description, and category.");
      return;
    }

    if (!audioFile && !videoFile) {
      alert("⚠️ Please upload either an audio or video file.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    if (coverArt) formData.append("cover_art", coverArt);
    if (audioFile) formData.append("audio", audioFile);
    if (videoFile) formData.append("video", videoFile);
    formData.append("subscription_tier", subscriptionTier);
    formData.append("streaming_enabled", streamingEnabled);
    if (scheduledRelease) formData.append("scheduled_release", scheduledRelease);

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
        alert("✅ Podcast uploaded successfully!");
        navigate("/podcast-dashboard");
      } else {
        alert(`❌ Upload error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Unexpected error occurred during upload.");
    }
  };

  return (
    <div className="podcast-create-container">
      <h1>🎙️ Create a Podcast</h1>

      <label>📌 Title:</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>📝 Description:</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

      <label>📂 Category:</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Select a Category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>

      <label>🎨 Cover Art:</label>
      <input type="file" accept="image/*" onChange={(e) => setCoverArt(e.target.files[0])} />

      <label>🎵 Podcast Audio:</label>
      <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />

      <label>🎥 Podcast Video (optional):</label>
      <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} />

      <label>🔴 Enable Live Podcast Streaming:</label>
      <input
        type="checkbox"
        checked={streamingEnabled}
        onChange={() => setStreamingEnabled(!streamingEnabled)}
      />

      <label>📅 Schedule Release:</label>
      <input
        type="datetime-local"
        value={scheduledRelease}
        onChange={(e) => setScheduledRelease(e.target.value)}
      />

      <label>💰 Monetization Tier:</label>
      <select value={subscriptionTier} onChange={(e) => setSubscriptionTier(e.target.value)}>
        <option value="Free">Free</option>
        <option value="5">Tier 1 - $5/month</option>
        <option value="10">Tier 2 - $10/month</option>
        <option value="20">Tier 3 - $20/month</option>
      </select>

      <button className="btn-primary" onClick={handleUpload}>
        📤 Upload Podcast
      </button>
    </div>
  );
};

export default PodcastCreate;
