import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const IndieArtistUpload = () => {
    const [artistName, setArtistName] = useState("");
    const [bio, setBio] = useState("");
    const [musicGenre, setMusicGenre] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [socialLinks, setSocialLinks] = useState({ website: "", instagram: "", twitter: "" });
    const [profilePicture, setProfilePicture] = useState(null);
    const [coverImage, setCoverImage] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSocialLinkChange = (platform, value) => {
        setSocialLinks((prev) => ({
            ...prev,
            [platform]: value
        }));
    };

    const handleSubmit = async () => {
        if (!artistName || !musicGenre || !targetAudience) {
            setMessage("❗ Please fill out all required fields!");
            return;
        }

        setLoading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("artistName", artistName);
        formData.append("bio", bio);
        formData.append("musicGenre", musicGenre);
        formData.append("targetAudience", targetAudience);
        formData.append("socialLinks", JSON.stringify(socialLinks));

        if (profilePicture) formData.append("profilePicture", profilePicture);
        if (coverImage) formData.append("coverImage", coverImage);

        try {
            const response = await fetch("http://localhost:5000/api/indie-artist/register", {
                method: "POST",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                setMessage("🎵 Artist profile created successfully!");
                setTimeout(() => {
                    navigate("/artist-dashboard");
                }, 1500);
            } else {
                throw new Error(data.error || "Failed to register artist profile.");
            }
        } catch (error) {
            console.error("Error:", error);
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="artist-upload-container">
            <h2>🎤 Register as an Indie Artist</h2>
            {message && <p className="message">{message}</p>}

            <input type="text" placeholder="Artist Name *" value={artistName} onChange={(e) => setArtistName(e.target.value)} />

            <textarea placeholder="Artist Bio" value={bio} onChange={(e) => setBio(e.target.value)}></textarea>

            <input type="text" placeholder="Music Genre *" value={musicGenre} onChange={(e) => setMusicGenre(e.target.value)} />

            <input type="text" placeholder="Target Audience *" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />

            <h3>🎵 Social Media Links</h3>
            <input type="url" placeholder="Website URL" value={socialLinks.website} onChange={(e) => handleSocialLinkChange("website", e.target.value)} />
            <input type="text" placeholder="Instagram Handle" value={socialLinks.instagram} onChange={(e) => handleSocialLinkChange("instagram", e.target.value)} />
            <input type="text" placeholder="Twitter Handle" value={socialLinks.twitter} onChange={(e) => handleSocialLinkChange("twitter", e.target.value)} />

            <h3>📸 Upload Images</h3>
            <input type="file" accept="image/*" onChange={(e) => setProfilePicture(e.target.files[0])} />
            <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files[0])} />

            <button onClick={handleSubmit} disabled={loading}>
                {loading ? "⏳ Registering..." : "✅ Register as an Indie Artist"}
            </button>
        </div>
    );
};

export default IndieArtistUpload;
