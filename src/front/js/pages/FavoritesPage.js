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
    fetch(`${process.env.BACKEND_URL}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        setUser(data);
        setVideos(data.videos || []);
        setImages(data.images || []); // If backend supports
      })
      .catch(() => alert("Error fetching profile."));
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
    return items.filter(item =>
      item[key].toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset"); // Update with your actual preset

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/video/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setVideos(prev => [...prev, { file_url: data.secure_url, title: file.name }]);
    } catch (err) {
      alert("Video upload failed.");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImages(prev => [...prev, { file_url: data.secure_url, title: file.name }]);
    } catch (err) {
      alert("Image upload failed.");
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
      {activeTab === "videos" && (
        <div style={{ marginBottom: "15px" }}>
          <input type="file" accept="video/*" onChange={handleVideoUpload} />
        </div>
      )}

      {activeTab === "images" && (
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
