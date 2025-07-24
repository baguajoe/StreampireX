import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import WebRTCChat from "../component/WebRTCChat";
import VideoChatPopup from "../component/VideoChatPopup";
import DirectChat from "../component/DirectChat";
import InboxDrawer from "../component/InboxDrawer";
import GroupChat from "../component/GroupChat";
import "../../styles/ProfilePage.css";
import "../../styles/WebRTC.css";
import lady1 from "../../img/lady1.png"
import campfire from "../../img/campfire.png"
import lofiLounge from "../../img/lofi_lounge.png";
import jazzHub from "../../img/jazzhub.png";
import energyReset from "../../img/energy_reset.png";
import chiCast from "../../img/chicast.png";
import zenmaster from "../../img/zenmaster.png";
import fitjay from "../../img/fit_jay.png";


import { io } from "socket.io-client";

const socket = io(process.env.BACKEND_URL || "http://localhost:3001", {
  transports: ["websocket"],
  auth: { token: localStorage.getItem("token") },
  withCredentials: true,
});

const ProfilePage = () => {
    const [user, setUser] = useState({});
    const [bio, setBio] = useState("");
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [coverPhoto, setCoverPhoto] = useState(null);
    const [coverPhotoName, setCoverPhotoName] = useState("");
    const [profilePicName, setProfilePicName] = useState("");
    const [socialLinks, setSocialLinks] = useState({ twitter: "", facebook: "", instagram: "", linkedin: "", custom: [] });
    const [radioStation, setRadioStation] = useState("");
    const [podcast, setPodcast] = useState("");
    const [storefrontLink, setStorefrontLink] = useState("");
    const [products, setProducts] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [favoriteRadioStations, setFavoriteRadioStations] = useState([]);
    const [favoritePodcasts, setFavoritePodcasts] = useState([]);
    const [isEditingName, setIsEditingName] = useState(false);
    const [videos, setVideos] = useState([]);
    const [images, setImages] = useState([]);
    const [commentInputs, setCommentInputs] = useState({});
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatFeatures, setChatFeatures] = useState({ typing: false, groupMode: false });
    const [useAvatar, setUseAvatar] = useState(false);
    const [posts, setPosts] = useState([]); // user-created posts
    const [postContent, setPostContent] = useState("");
    const [postImage, setPostImage] = useState(null);
    const [postComments, setPostComments] = useState({}); // { postId: [comments] }
    const [newCommentText, setNewCommentText] = useState({}); // { postId: comment }
    const [justSaved, setJustSaved] = useState(false);
    const [currentMood, setCurrentMood] = useState("😌 Chill");

    const loggedInUserId = parseInt(localStorage.getItem("user_id")) || 1; // fallback to 1
    const loggedInUsername = localStorage.getItem("username");

    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem("token");

        console.log("ProfilePage - Token check:", token ? "Token found" : "No token found");
        console.log("ProfilePage - All localStorage keys:", Object.keys(localStorage));

        if (!token) {
            console.warn("No token found - using fallback user data");
            // Fallback: use localStorage data
            if (loggedInUserId) {
                setUser({
                    id: loggedInUserId,
                    username: loggedInUsername || `user_${loggedInUserId}`,
                    display_name: loggedInUsername || `User ${loggedInUserId}`
                });
            }
            return;
        }

        console.log("Making API call to fetch profile...");
        fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        })
            .then(async (res) => {
                console.log("ProfilePage API Response status:", res.status);

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("ProfilePage API Error:", res.status, errorText);
                    throw new Error(`API Error: ${res.status}`);
                }

                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    console.log("ProfilePage - Profile data received:", data);

                    // ✅ Handle both response formats
                    const userData = data.user || data; // Handle {user: ...} or direct user data

                    // Ensure we have at least an id
                    if (!userData.id && loggedInUserId) {
                        userData.id = loggedInUserId;
                    }

                    setUser(userData);

                    // Set other states from the response
                    if (userData.bio) setBio(userData.bio);
                    if (userData.display_name) setDisplayName(userData.display_name);
                    if (userData.business_name) setBusinessName(userData.business_name);
                    if (userData.use_avatar !== undefined) setUseAvatar(userData.use_avatar);
                    if (userData.videos) setVideos(userData.videos);
                    if (userData.images) setImages(userData.images);
                    if (userData.gallery && !userData.images) setImages(userData.gallery); // fallback

                } catch (e) {
                    console.error("Failed to parse JSON:", text);

                    // Fallback: use localStorage data
                    if (loggedInUserId) {
                        setUser({
                            id: loggedInUserId,
                            username: loggedInUsername || `user_${loggedInUserId}`,
                            display_name: loggedInUsername || `User ${loggedInUserId}`
                        });
                    }
                }
            })
            .catch((err) => {
                console.error("Fetch profile error:", err);

                // Fallback: use localStorage data
                if (loggedInUserId) {
                    setUser({
                        id: loggedInUserId,
                        username: loggedInUsername || `user_${loggedInUserId}`,
                        display_name: loggedInUsername || `User ${loggedInUserId}`
                    });
                }
            });
    }, [loggedInUserId, loggedInUsername]);

    const handleToggleAvatar = async () => {
        const newValue = !useAvatar;
        setUseAvatar(newValue);
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/avatar-toggle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ use_avatar: newValue })
            });
        } catch (err) {
            console.error("Failed to update avatar preference:", err);
            alert("Failed to update avatar preference.");
        }
    };

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to upload profile picture");
            return;
        }

        const formData = new FormData();
        formData.append("profile_picture", file);

        try {
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.status}`);
            }

            const data = await res.json();
            setUser((prev) => ({ ...prev, profile_picture: data.url }));
            alert("✅ Profile picture updated successfully!");
        } catch (err) {
            console.error("Profile picture upload error:", err);
            alert("❌ Failed to upload profile picture");
        }
    };

    const handleCoverPhotoChange = (e) => {
        if (e.target.files.length > 0) {
            setCoverPhoto(URL.createObjectURL(e.target.files[0]));
            setCoverPhotoName(e.target.files[0].name);
        }
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "your_unsigned_preset");

        try {
            console.log("Uploading video to Cloudinary...");
            const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/video/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.status}`);
            }

            const data = await res.json();
            console.log("Uploaded video URL:", data.secure_url);

            const newVideo = { file_url: data.secure_url, title: file.name };
            setVideos(prev => [...prev, newVideo]);

            // Save to backend
            await updateUserMedia('videos', [...videos, newVideo]);

        } catch (err) {
            console.error("Video upload error:", err);
            alert(`Video upload failed: ${err.message}`);
        }
    };

    // ✅ Helper function to update backend media
    const updateUserMedia = async (mediaType, mediaArray) => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("No token found for backend update");
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

    const handleSaveProfile = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to save profile");
            return;
        }

        const payload = {
            // strings: trim and check non-empty
            ...(displayName?.trim() && { display_name: displayName }),
            ...(businessName?.trim() && { business_name: businessName }),
            ...(bio?.trim() && { bio }),

            // arrays: check length > 0
            ...(Array.isArray(socialLinks) && socialLinks.length > 0 && { social_links: socialLinks }),
            ...(Array.isArray(videos) && videos.length > 0 && { videos }),
            ...(Array.isArray(images) && images.length > 0 && { images }),

            // objects (non-array): check has any own keys
            ...(podcast && !Array.isArray(podcast) && Object.keys(podcast).length > 0 && { podcast }),

            // simple values (truthy only)
            ...(radioStation?.trim() && { radio_station: radioStation }),
            ...(profilePicture && { profile_picture: profilePicture }),
            ...(coverPhoto && { cover_photo: coverPhoto }),
        };

        try {
            console.log("Saving profile with payload:", payload);
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Save profile error:", response.status, errorText);
                throw new Error(`Save failed: ${response.status}`);
            }

            const result = await response.json();
            console.log("Profile saved successfully:", result);
            alert("✅ Profile saved successfully!");

            if (result.user) {
                setUser(result.user);
            }

            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000); // hide save button after 3s

        } catch (error) {
            console.error("Save profile error:", error);
            alert(`An error occurred while saving profile: ${error.message}`);
        }
    };

    // Get effective user ID for WebRTC (fallback to localStorage if API fails)
    const effectiveUserId = user?.id || loggedInUserId;
    const effectiveUserName = user?.display_name || user?.username || loggedInUsername || `User ${effectiveUserId}`;

    console.log("ProfilePage render - effectiveUserId:", effectiveUserId);
    console.log("ProfilePage render - condition check:", !!effectiveUserId);
    console.log("ProfilePage render - user object:", user);
    console.log("ProfilePage render - loggedInUserId:", loggedInUserId);

    return (
        <div className="profile-container">
            <div className="cover-photo-container ">
                <img src={coverPhoto || user.cover_photo || campfire} alt="Cover" className="cover-photo" />
                <button onClick={() => coverPhotoInputRef.current.click()} className="upload-btn">📷 Upload Cover Photo</button>
                <input ref={coverPhotoInputRef} type="file" style={{ display: 'none' }} onChange={handleCoverPhotoChange} />
                {coverPhotoName && <p className="filename-display">📁 {coverPhotoName}</p>}
            </div>

            {isChatOpen && (
                <ChatModal
                    recipientId={user.id}
                    recipientName={user.display_name || user.username}
                    currentUserId={loggedInUserId}
                    onClose={() => setIsChatOpen(false)}
                    enableTypingIndicator={true}
                    enableThreads={true}
                    autoScroll={true}
                    enableMediaUpload={true}
                    enableGroupChat={true}
                />
            )}

            <div className="profile-avatar-toggle-horizontal">
                <img
                    src={useAvatar ? user.avatar_url : profilePicture || user.profile_picture || lady1}
                    alt="Profile"
                    className="profile-pic"
                />
                <div className="profile-name-inline">
                    <p className="profile-name-label">
                        {displayName || user.username || "Your Name"}
                    </p>
                    <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">
                        😀 Upload Profile Picture
                    </button>
                    <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} onChange={handleProfilePicChange} />
                </div>
                <div className="profile-name-header">
                    {!isEditingName ? (
                        <div className="name-and-actions">
                            <div className="name-actions">
                                <button className="edit-name-btn small-btn" onClick={() => setIsEditingName(true)}>✏️</button>
                                {user.id !== loggedInUserId && (
                                    <button className="message-btn small-btn" onClick={() => setIsChatOpen(true)}>
                                        💬
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="edit-name-input">
                            <input
                                type="text"
                                className="name-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoFocus
                            />
                            <button className="name-save-btn" onClick={() => setIsEditingName(false)}>Save</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bio and Quick Stats Row */}
            <div className="profile-header-flex">
                {/* Bio Block */}
                <div className="profile-card-bio">
                    <label>📝 Bio:</label>
                    {!isEditingBio ? (
                        <>
                            <p>{bio}</p>
                            <button onClick={() => setIsEditingBio(true)}>✏️ Edit Bio</button>
                        </>
                    ) : (
                        <>
                            <textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
                            <button onClick={() => { setIsEditingBio(false); handleSaveProfile(); }}>✅ Save Bio</button>
                        </>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="profile-stats-card">
                    <h4>📊 Quick Stats</h4>
                    <ul className="profile-stats-list">
                        <li>📊 Streams: <strong>158</strong></li>
                        <li>🎧 Podcasts: <strong>12</strong></li>
                        <li>📻 Stations: <strong>5</strong></li>
                        <li>⭐ Followers: <strong>623</strong></li>
                    </ul>
                </div>

                {/* Mood Section */}
                <div className="mood-section">
                    <div className="mood-card">
                        <h4>🎨 Current Mood</h4>
                        <div className="mood-selector">
                            <button
                                className={`mood-btn ${currentMood === "😌 Chill" ? "active" : ""}`}
                                onClick={() => setCurrentMood("😌 Chill")}
                            >
                                😌 Chill
                            </button>
                            <button
                                className={`mood-btn ${currentMood === "🎵 Creative" ? "active" : ""}`}
                                onClick={() => setCurrentMood("🎵 Creative")}
                            >
                                🎵 Creative
                            </button>
                            <button
                                className={`mood-btn ${currentMood === "🔥 Energetic" ? "active" : ""}`}
                                onClick={() => setCurrentMood("🔥 Energetic")}
                            >
                                🔥 Energetic
                            </button>
                            <button
                                className={`mood-btn ${currentMood === "🧘 Zen" ? "active" : ""}`}
                                onClick={() => setCurrentMood("🧘 Zen")}
                            >
                                🧘 Zen
                            </button>
                            <button
                                className={`mood-btn ${currentMood === "🎸 Jamming" ? "active" : ""}`}
                                onClick={() => setCurrentMood("🎸 Jamming")}
                            >
                                🎸 Jamming
                            </button>
                            <button
                                className={`mood-btn ${currentMood === "📚 Focused" ? "active" : ""}`}
                                onClick={() => setCurrentMood("📚 Focused")}
                            >
                                📚 Focused
                            </button>
                        </div>
                        <div className="current-mood-display">
                            <p>Currently: <strong>{currentMood}</strong></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Links */}
            <div className="social-links">
                <h4>🔗 Social Links</h4>
                <div className="social-links-grid">
                    <a href="https://twitter.com/susansmith_dev" target="_blank" rel="noopener noreferrer" className="social-link">
                        <span className="social-icon">🐦</span>
                        <div className="social-info">
                            <strong>@susansmith_dev</strong>
                            <p>Follow for tech & wellness tips</p>
                        </div>
                    </a>

                    <a href="https://instagram.com/susan.mindful.codes" target="_blank" rel="noopener noreferrer" className="social-link">
                        <span className="social-icon">📸</span>
                        <div className="social-info">
                            <strong>@susan.mindful.codes</strong>
                            <p>Daily meditation & coding journey</p>
                        </div>
                    </a>

                    <a href="https://linkedin.com/in/susansmith-developer" target="_blank" rel="noopener noreferrer" className="social-link">
                        <span className="social-icon">💼</span>
                        <div className="social-info">
                            <strong>Susan Smith</strong>
                            <p>Senior Full Stack Developer</p>
                        </div>
                    </a>

                    <a href="https://youtube.com/c/CodeAndCalm" target="_blank" rel="noopener noreferrer" className="social-link">
                        <span className="social-icon">📺</span>
                        <div className="social-info">
                            <strong>Code & Calm</strong>
                            <p>Programming tutorials & mindfulness</p>
                        </div>
                    </a>

                    <a href="https://github.com/susansmith-dev" target="_blank" rel="noopener noreferrer" className="social-link">
                        <span className="social-icon">💻</span>
                        <div className="social-info">
                            <strong>susansmith-dev</strong>
                            <p>Open source wellness tools</p>
                        </div>
                    </a>
                </div>
            </div>

            <div className="profile-layout">
                <div className="left-column">
                    <h3>
                        ⭐ <Link to="/favorites">Favorite Profiles</Link>
                    </h3>

                    <div className="favorite-item">
                        <img src={zenmaster} alt="Zen Master" className="favorite-avatar" />
                        <div>
                            <strong>@zenmaster</strong>
                            <p>"Grateful for the community 🙏"</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src={fitjay} alt="Fit Jay" className="favorite-avatar" />
                        <div>
                            <strong>@fit_jay</strong>
                            <p>"Morning flow complete ✅"</p>
                        </div>
                    </div>

                    <h3>📡 <Link to="/favorites">Favorite Radio Stations</Link></h3>
                    <div className="favorite-item">
                        <img src={lofiLounge} alt="LoFi Lounge" className="favorite-avatar" />
                        <div>
                            <strong>LoFi Lounge</strong>
                            <p>Chill beats 24/7</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src={jazzHub} alt="Jazz Hub" className="favorite-avatar" />
                        <div>
                            <strong>JazzHub</strong>
                            <p>Smooth jazz and more 🎷</p>
                        </div>
                    </div>

                    <h3>🎙️ <Link to="/favorites">Favorite Podcasts</Link></h3>
                    <div className="favorite-item">
                        <img src={energyReset} alt="Energy Reset" className="favorite-avatar" />
                        <div>
                            <strong>The Energy Reset</strong>
                            <p>"How to ground yourself"</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src={chiCast} alt="Chi Cast" className="favorite-avatar" />
                        <div>
                            <strong>ChiCast</strong>
                            <p>"Breathwork for busy lives"</p>
                        </div>
                    </div>
                </div>

                <div className="middle-column">
                    <div className="post-section-wrapper">
                        <h3>📝 Create a Post</h3>
                        <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            placeholder="Write something..."
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPostImage(e.target.files[0])}
                        />
                        <button
                            onClick={() => {
                                const newPost = {
                                    id: Date.now(),
                                    content: postContent,
                                    image: postImage ? URL.createObjectURL(postImage) : null,
                                    comments: [],
                                };
                                setPosts([newPost, ...posts]);
                                setPostContent("");
                                setPostImage(null);
                            }}
                        >
                            📤 Post
                        </button>

                        {/* All post cards */}
                        {posts.map((post) => (
                            <div key={post.id} className="post-card">
                                <p>{post.content}</p>
                                {post.image && (
                                    <img src={post.image} alt="Post" className="post-image" />
                                )}
                                <h5>💬 Comments</h5>
                                <ul>
                                    {(postComments[post.id] || []).map((comment, idx) => (
                                        <li key={idx}>{comment}</li>
                                    ))}
                                </ul>
                                <input
                                    type="text"
                                    placeholder="Write a comment..."
                                    value={newCommentText[post.id] || ""}
                                    onChange={(e) =>
                                        setNewCommentText({ ...newCommentText, [post.id]: e.target.value })
                                    }
                                />
                                <button
                                    onClick={() => {
                                        const comment = newCommentText[post.id]?.trim();
                                        if (!comment) return;
                                        setPostComments({
                                            ...postComments,
                                            [post.id]: [...(postComments[post.id] || []), comment],
                                        });
                                        setNewCommentText({ ...newCommentText, [post.id]: "" });
                                    }}
                                >
                                    💬 Reply
                                </button>
                            </div>
                        ))}

                        {/* Upload Sections */}
                        {user?.role && ["Pro", "Premium", "Free"].includes(user.role) && (
                            <div className="upload-video-section">
                                <h3>🎬 Upload a Video</h3>
                                <UploadVideo
                                    currentUser={user}
                                    onUpload={() => {
                                        const token = localStorage.getItem("token");
                                        if (token && user.id) {
                                            fetch(`${process.env.BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev'}/api/user/${user.id}/videos`, {
                                                headers: { Authorization: `Bearer ${token}` },
                                            })
                                                .then((res) => res.json())
                                                .then((data) => setVideos(data))
                                                .catch((err) => console.error("Error fetching videos:", err));
                                        }
                                    }}
                                />
                            </div>
                        )}

                        <div className="manual-upload-section">
                            <h3>🎬 Quick Video Upload</h3>
                            <input type="file" accept="video/*" onChange={handleVideoUpload} />
                        </div>

                        {videos.length > 0 && (
                            <div className="uploaded-videos">
                                <h4>📹 Your Uploaded Videos</h4>
                                {videos.map((video, index) => (
                                    <div key={video.id || index} className="video-wrapper">
                                        <video src={video.file_url} controls width="300" />
                                        <p>{video.title}</p>
                                        <button onClick={() => alert("Liked!")}>👍 {video.likes || 0}</button>

                                        <input
                                            type="text"
                                            placeholder="Add a comment"
                                            value={commentInputs[video.id || index] || ""}
                                            onChange={(e) =>
                                                setCommentInputs({
                                                    ...commentInputs,
                                                    [video.id || index]: e.target.value,
                                                })
                                            }
                                        />
                                        <button onClick={() => alert("Comment added")}>💬 Comment</button>

                                        <button
                                            className="btn-secondary"
                                            onClick={() => {
                                                setVideos((prev) => prev.filter((_, i) => i !== index));
                                                alert("Video removed from list");
                                            }}
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {images.length > 0 && (
                            <div className="uploaded-images">
                                <h4>🖼️ Your Images</h4>
                                <div className="images-grid">
                                    {images.map((image, index) => (
                                        <div
                                            key={image.id || index}
                                            className="image-wrapper"
                                        >
                                            <img
                                                src={image.file_url}
                                                alt={image.title}
                                                style={{ width: "200px", borderRadius: "6px" }}
                                            />
                                            <p>{image.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Always pinned chat button at the bottom */}
                    <div className="bottom-action-row">

                        <VideoChatPopup />
                    </div>

                </div>


                <div className="right-column">
                    <div className="quick-actions">
                        <h3>🎛️ Quick Actions</h3>
                        <Link to="/podcast/create">
                            <button className="btn-podcast">🎙️ Create Podcast</button>
                        </Link>
                        <Link to="/create-radio">
                            <button className="btn-radio">📡 Create Radio Station</button>
                        </Link>
                        <Link to="/indie-artist-upload">
                            <button className="btn-indie-upload">🎤 Indie Artist Upload</button>
                        </Link>



                    </div>

                    <h3>🛍️ Storefront</h3>
                    <p>
                        Visit my store:{" "}
                        <a href={storefrontLink} target="_blank" rel="noopener noreferrer">
                            {storefrontLink || "N/A"}
                        </a>
                    </p>
                    {products.length > 0 && (
                        <div className="featured-product">
                            Featured: {products[0].name}
                        </div>
                    )}
                </div>
            </div>
            {user && socket && (
                <InboxDrawer currentUser={user} socket={socket} />
            )}
            {!justSaved && (
                <button onClick={handleSaveProfile} className="btn-primary">
                    💾 Save Profile
                </button>
            )}
        </div>
    );
};

export default ProfilePage;