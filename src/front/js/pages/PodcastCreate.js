import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // ✅ Import useNavigate for redirection
import "../../styles/PodcastCreate.css";

const PodcastCreate = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [coverArt, setCoverArt] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [isPremium, setIsPremium] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState("Free");
    const [streamingEnabled, setStreamingEnabled] = useState(false);
    const navigate = useNavigate();  // ✅ Initialize navigation

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("cover_art", coverArt);
        formData.append("audio", audioFile);
        formData.append("video", videoFile);
        formData.append("is_premium", isPremium);
        formData.append("subscription_tier", subscriptionTier);
        formData.append("streaming_enabled", streamingEnabled);

        const response = await fetch(`${process.env.BACKEND_URL}/user/podcast/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert("Podcast uploaded successfully!");
            navigate("/podcasts");  // ✅ Redirect user to PodcastPage after upload
        } else {
            alert(`Error: ${data.error}`);
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
                <option value="Technology">Technology</option>
                <option value="Business">Business</option>
                <option value="Music">Music</option>
                <option value="Education">Education</option>
            </select>
            <label>🎨 Cover Art:</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverArt(e.target.files[0])} />
            <label>🎵 Upload Podcast Audio:</label>
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} />
            <label>🎥 Upload Podcast Video:</label>
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} />
            <label>🔴 Enable Live Podcast Streaming:</label>
            <input type="checkbox" checked={streamingEnabled} onChange={() => setStreamingEnabled(!streamingEnabled)} />
            <label>💰 Monetization:</label>
            <select value={subscriptionTier} onChange={(e) => setSubscriptionTier(e.target.value)}>
                <option value="Free">Free</option>
                <option value="5">Tier 1 - $5/month</option>
                <option value="10">Tier 2 - $10/month</option>
                <option value="20">Tier 3 - $20/month</option>
            </select>
            <button onClick={handleUpload} className="btn-primary">📤 Upload Podcast</button>
        </div>
    );
};

export default PodcastCreate;
