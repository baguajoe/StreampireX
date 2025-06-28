import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../styles/ProfilePage.css";

import zenmaster from "../../img/zenmaster.png";
import fitjay from "../../img/fit_jay.png";
import lofiLounge from "../../img/lofi_lounge.png";
import jazzHub from "../../img/jazzhub.png";
import energyReset from "../../img/energy_reset.png";
import chiCast from "../../img/chicast.png";
import DJNova from "../../img/DJNova.png";
import ElectricVibes from "../../img/ElectricVibes.png";
import campfire from "../../img/campfire.png";

const FavoritesPage = () => {
  const [user, setUser] = useState({});
  const [activeTab, setActiveTab] = useState("profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    // ✅ Use same token key as ProfilePage
    const token = localStorage.getItem("token");
    
    console.log("Token check:", token ? "Token found" : "No token found");
    console.log("All localStorage keys:", Object.keys(localStorage));
    
    if (!token) {
      console.warn("No token found - user may need to log in");
      // Don't immediately alert - let the component render with empty state
      return;
    }

    console.log("Making API call to fetch profile...");
    fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/profile`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        console.log("API Response status:", res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("API Error:", res.status, errorText);
          
          // If 401/403, it's likely an auth issue
          if (res.status === 401 || res.status === 403) {
            console.warn("Authentication failed - token may be expired");
            localStorage.removeItem("token"); // Clear invalid token
          }
          
          throw new Error(`API Error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Profile data received:", data);
        
        // ✅ Handle both response formats
        const userData = data.user || data; // Handle {user: ...} or direct user data
        
        setUser(userData);
        setVideos(userData.videos || []);
        // ✅ Use images if available, otherwise fall back to gallery
        setImages(userData.images || userData.gallery || []);
      })
      .catch((error) => {
        console.error("Error fetching profile:", error);
        // Don't alert immediately - let user see the page
        console.warn("Profile fetch failed, user may need to log in");
      });
  }, []);

  const favoriteProfiles = [
    { username: "@zenmaster", quote: "Grateful for the community 🙏", image: zenmaster },
    { username: "@fit_jay", quote: "Morning flow complete ✅", image: fitjay },
  ];

  const favoriteArtists = [
    { name: "DJ Nova", genre: "Ambient & Chillwave", image: DJNova },
    { name: "Electric Vibes", genre: "Electronic Fusion", image: ElectricVibes },
  ];

  const favoriteStations = [
    { title: "LoFi Lounge", desc: "Chill beats 24/7", image: lofiLounge },
    { title: "JazzHub", desc: "Smooth jazz and more 🎷", image: jazzHub },
  ];

  const favoritePodcasts = [
    { title: "The Energy Reset", desc: "How to ground yourself", image: energyReset },
    { title: "ChiCast", desc: "Breathwork for busy lives", image: chiCast },
  ];

  const filterItems = (items, key) => {
    if (!items || !Array.isArray(items)) return [];
    return items.filter(item =>
      item && item[key] && 
      typeof item[key] === 'string' &&
      item[key].toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Add loading state
    const fileInput = e.target;
    fileInput.disabled = true;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset");

    try {
      console.log("Uploading video...");
      const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/video/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Video uploaded successfully:", data);
      
      const newVideo = { file_url: data.secure_url, title: file.name };
      setVideos(prev => [...prev, newVideo]);
      
      // ✅ Save to backend
      await updateUserMedia('videos', [...videos, newVideo]);
      
      // Reset file input
      fileInput.value = '';
    } catch (err) {
      console.error("Video upload error:", err);
      alert(`Video upload failed: ${err.message}`);
    } finally {
      fileInput.disabled = false;
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Add loading state
    const fileInput = e.target;
    fileInput.disabled = true;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset");

    try {
      console.log("Uploading image...");
      const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/image/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Image uploaded successfully:", data);
      
      const newImage = { file_url: data.secure_url, title: file.name };
      setImages(prev => [...prev, newImage]);
      
      // ✅ Save to backend
      await updateUserMedia('images', [...images, newImage]);
      
      // Reset file input
      fileInput.value = '';
    } catch (err) {
      console.error("Image upload error:", err);
      alert(`Image upload failed: ${err.message}`);
    } finally {
      fileInput.disabled = false;
    }
  };

  // ✅ Helper function to update backend
  const updateUserMedia = async (mediaType, mediaArray) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      console.log(`Updating ${mediaType} in backend...`);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [mediaType]: mediaArray
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update ${mediaType}:`, response.status, errorText);
        throw new Error(`Backend update failed: ${response.status}`);
      }
      
      console.log(`${mediaType} updated successfully in backend`);
    } catch (err) {
      console.error(`Failed to update ${mediaType}:`, err);
      alert(`Warning: File uploaded to cloud but failed to save to profile: ${err.message}`);
    }
  };

  return (
    <div className="profile-container">
      {/* Cover Only */}
      <div className="cover-photo-container">
        <img src={user.cover_photo || campfire} alt="Cover" className="cover-photo" />
      </div>

      {/* Back to Profile */}
      <div style={{ marginBottom: "20px" }}>
        <Link to="/profile" className="upload-btn">⬅ Back to Profile Page</Link>
      </div>

      {/* Show login message if no token, but still show the tabs */}
      {!localStorage.getItem("token") && (
        <div style={{ 
          backgroundColor: "#fff3cd", 
          border: "1px solid #ffeaa7", 
          padding: "10px", 
          borderRadius: "4px", 
          marginBottom: "20px",
          textAlign: "center" 
        }}>
          Please log in to upload and view your personal content
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button onClick={() => setActiveTab("profiles")} className={activeTab === "profiles" ? "active" : ""}>Favorite Profiles</button>
        <button onClick={() => setActiveTab("artists")} className={activeTab === "artists" ? "active" : ""}>Favorite Artists</button>
        <button onClick={() => setActiveTab("stations")} className={activeTab === "stations" ? "active" : ""}>Radio Stations</button>
        <button onClick={() => setActiveTab("podcasts")} className={activeTab === "podcasts" ? "active" : ""}>Podcasts</button>
        <button onClick={() => setActiveTab("videos")} className={activeTab === "videos" ? "active" : ""}>Video Uploads</button>
        <button onClick={() => setActiveTab("images")} className={activeTab === "images" ? "active" : ""}>Image Uploads</button>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={`Search ${activeTab}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Upload Buttons */}
      {activeTab === "videos" && localStorage.getItem("token") && (
        <div style={{ marginBottom: "15px" }}>
          <input type="file" accept="video/*" onChange={handleVideoUpload} />
        </div>
      )}

      {activeTab === "images" && localStorage.getItem("token") && (
        <div style={{ marginBottom: "15px" }}>
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </div>
      )}

      {/* Grid View */}
      <div className="favorites-grid">
        {activeTab === "profiles" &&
          filterItems(favoriteProfiles, "username").map((p, i) => (
            <div key={i} className="favorite-card">
              <img src={p.image} alt={p.username} />
              <strong>{p.username}</strong>
              <p>{p.quote}</p>
            </div>
          ))}

        {activeTab === "artists" &&
          filterItems(favoriteArtists, "name").map((a, i) => (
            <div key={i} className="favorite-card">
              <img src={a.image} alt={a.name} />
              <strong>{a.name}</strong>
              <p>{a.genre}</p>
            </div>
          ))}

        {activeTab === "stations" &&
          filterItems(favoriteStations, "title").map((s, i) => (
            <div key={i} className="favorite-card">
              <img src={s.image} alt={s.title} />
              <strong>{s.title}</strong>
              <p>{s.desc}</p>
            </div>
          ))}

        {activeTab === "podcasts" &&
          filterItems(favoritePodcasts, "title").map((p, i) => (
            <div key={i} className="favorite-card">
              <img src={p.image} alt={p.title} />
              <strong>{p.title}</strong>
              <p>{p.desc}</p>
            </div>
          ))}

        {activeTab === "videos" &&
          (videos.length > 0 ? (
            filterItems(videos, "title").map((v, i) => (
              <div key={i} className="favorite-card">
                <video src={v.file_url} controls width="250" />
                <p>{v.title}</p>
              </div>
            ))
          ) : (
            <p>No videos found.</p>
          ))}

        {activeTab === "images" &&
          (images.length > 0 ? (
            filterItems(images, "title").map((img, i) => (
              <div key={i} className="favorite-card">
                <img src={img.file_url} alt={img.title} style={{ width: "100%", borderRadius: "6px" }} />
                <p>{img.title}</p>
              </div>
            ))
          ) : (
            <p>No images found.</p>
          ))}
      </div>
    </div>
  );
};

export default FavoritesPage;