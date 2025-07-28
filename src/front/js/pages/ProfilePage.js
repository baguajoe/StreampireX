import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import VideoChatPopup from "../component/VideoChatPopup";
import InboxDrawer from "../component/InboxDrawer";
import InnerCircle from "../component/InnerCircle";
import "../../styles/ProfilePage.css";
import "../../styles/WebRTC.css";

// Optimized imports - consider lazy loading these
import lady1 from "../../img/lady1.png";
import campfire from "../../img/campfire.png";
import lofiLounge from "../../img/lofi_lounge.png";
import jazzHub from "../../img/jazzhub.png";
import energyReset from "../../img/energy_reset.png";
import chiCast from "../../img/chicast.png";
import zenmaster from "../../img/zenmaster.png";
import fitjay from "../../img/fit_jay.png";

import { io } from "socket.io-client";

// Constants
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev';
const SOCKET_URL = process.env.BACKEND_URL || "http://localhost:3001";

const MOOD_OPTIONS = [
    { id: "chill", emoji: "😌", label: "Chill" },
    { id: "creative", emoji: "🎵", label: "Creative" },
    { id: "energetic", emoji: "🔥", label: "Energetic" },
    { id: "zen", emoji: "🧘", label: "Zen" },
    { id: "jamming", emoji: "🎸", label: "Jamming" },
    { id: "focused", emoji: "📚", label: "Focused" }
];

const SOCIAL_PLATFORMS = [
    { key: 'twitter', icon: '🐦', label: 'Twitter' },
    { key: 'instagram', icon: '📸', label: 'Instagram' },
    { key: 'linkedin', icon: '💼', label: 'LinkedIn' },
    { key: 'youtube', icon: '📺', label: 'YouTube' },
    { key: 'github', icon: '💻', label: 'GitHub' }
];

// Memoized socket connection
const createSocket = () => {
    return io(SOCKET_URL, {
        transports: ["websocket"],
        auth: { token: localStorage.getItem("token") },
        withCredentials: true,
    });
};

const ProfilePage = () => {
    // Core user state
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Profile editing state
    const [editingStates, setEditingStates] = useState({
        bio: false,
        name: false,
        socialLinks: false
    });

    // Form data state
    const [formData, setFormData] = useState({
        bio: "",
        displayName: "",
        businessName: "",
        radioStation: "",
        storefrontLink: "",
        socialLinks: {
            twitter: "",
            instagram: "",
            linkedin: "",
            youtube: "",
            github: "",
            custom: []
        }
    });

    // Media state
    const [media, setMedia] = useState({
        profilePicture: null,
        coverPhoto: null,
        videos: [],
        images: []
    });

    // UI state
    const [ui, setUi] = useState({
        currentMood: "chill",
        activeTab: "posts",
        isChatOpen: false,
        useAvatar: false,
        justSaved: false
    });

    // Posts and comments
    const [posts, setPosts] = useState([]);
    const [postForm, setPostForm] = useState({
        content: "",
        image: null
    });
    const [comments, setComments] = useState({});

    // Refs
    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);
    const socket = useRef(null);

    // Memoized user data
    const loggedInUserId = useMemo(() =>
        parseInt(localStorage.getItem("user_id")) || 1, []
    );
    const loggedInUsername = useMemo(() =>
        localStorage.getItem("username"), []
    );

    // Calculate derived values
    const effectiveUserId = user?.id || loggedInUserId;
    const effectiveUserName = user?.display_name || user?.username || loggedInUsername || `User ${effectiveUserId}`;
    const isOwnProfile = effectiveUserId === loggedInUserId;

    // Initialize socket connection
    useEffect(() => {
        socket.current = createSocket();

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, []);

    // Fetch user profile
    const fetchProfile = useCallback(async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            console.warn("No token found - using fallback user data");
            setUser({
                id: loggedInUserId,
                username: loggedInUsername || `user_${loggedInUserId}`,
                display_name: loggedInUsername || `User ${loggedInUserId}`
            });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const userData = data.user || data;

            // Ensure we have at least an id
            if (!userData.id && loggedInUserId) {
                userData.id = loggedInUserId;
            }

            setUser(userData);

            // Update form data with user data
            setFormData(prev => ({
                ...prev,
                bio: userData.bio || "",
                displayName: userData.display_name || "",
                businessName: userData.business_name || "",
                radioStation: userData.radio_station || "",
                storefrontLink: userData.storefront_link || "",
                socialLinks: userData.social_links || prev.socialLinks
            }));

            // Update media
            setMedia(prev => ({
                ...prev,
                videos: userData.videos || [],
                images: userData.images || userData.gallery || []
            }));

            // Update UI state
            setUi(prev => ({
                ...prev,
                useAvatar: userData.use_avatar || false
            }));

        } catch (error) {
            console.error("Fetch profile error:", error);
            setError(error.message);

            // Fallback to localStorage data
            if (loggedInUserId) {
                setUser({
                    id: loggedInUserId,
                    username: loggedInUsername || `user_${loggedInUserId}`,
                    display_name: loggedInUsername || `User ${loggedInUserId}`
                });
            }
        } finally {
            setLoading(false);
        }
    }, [loggedInUserId, loggedInUsername]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Handle form updates
    const updateFormData = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const updateSocialLink = useCallback((platform, value) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [platform]: value
            }
        }));
    }, []);

    // Handle editing states
    const toggleEditingState = useCallback((field) => {
        setEditingStates(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, []);

    // Handle file uploads
    const handleProfilePicChange = useCallback(async (e) => {
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
            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            setUser(prev => ({ ...prev, profile_picture: data.url }));
            alert("✅ Profile picture updated successfully!");
        } catch (error) {
            console.error("Profile picture upload error:", error);
            alert("❌ Failed to upload profile picture");
        }
    }, []);

    const handleCoverPhotoChange = useCallback((e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            setMedia(prev => ({
                ...prev,
                coverPhoto: URL.createObjectURL(file)
            }));
        }
    }, []);

    // Handle video upload with better error handling
    const handleVideoUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("upload_preset", "your_unsigned_preset");

        try {
            console.log("Uploading video to Cloudinary...");
            const response = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/video/upload", {
                method: "POST",
                body: uploadFormData,
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            const newVideo = { file_url: data.secure_url, title: file.name };

            setMedia(prev => ({
                ...prev,
                videos: [...prev.videos, newVideo]
            }));

            await updateUserMedia('videos', [...media.videos, newVideo]);

        } catch (error) {
            console.error("Video upload error:", error);
            alert(`Video upload failed: ${error.message}`);
        }
    }, [media.videos]);

    // Update user media in backend
    const updateUserMedia = useCallback(async (mediaType, mediaArray) => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("No token found for backend update");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
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
                throw new Error(`Backend update failed: ${response.status}`);
            }

            console.log(`${mediaType} updated successfully in backend`);
        } catch (error) {
            console.error(`Failed to update ${mediaType}:`, error);
            alert(`Warning: File uploaded but failed to save to profile: ${error.message}`);
        }
    }, []);

    // Save profile with optimized payload
    const handleSaveProfile = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Please log in to save profile");
            return;
        }

        const payload = {};

        // Only include non-empty fields
        if (formData.displayName?.trim()) payload.display_name = formData.displayName;
        if (formData.businessName?.trim()) payload.business_name = formData.businessName;
        if (formData.bio?.trim()) payload.bio = formData.bio;
        if (formData.radioStation?.trim()) payload.radio_station = formData.radioStation;
        if (formData.storefrontLink?.trim()) payload.storefront_link = formData.storefrontLink;

        // Include arrays if they have content
        if (media.videos.length > 0) payload.videos = media.videos;
        if (media.images.length > 0) payload.images = media.images;

        // Include social links if any are filled
        const filledSocialLinks = Object.entries(formData.socialLinks)
            .filter(([key, value]) => key !== 'custom' && value?.trim())
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        if (Object.keys(filledSocialLinks).length > 0) {
            payload.social_links = { ...filledSocialLinks, custom: formData.socialLinks.custom };
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Save failed: ${response.status}`);
            }

            const result = await response.json();
            console.log("Profile saved successfully:", result);
            alert("✅ Profile saved successfully!");

            if (result.user) {
                setUser(result.user);
            }

            setUi(prev => ({ ...prev, justSaved: true }));
            setTimeout(() => setUi(prev => ({ ...prev, justSaved: false })), 3000);

        } catch (error) {
            console.error("Save profile error:", error);
            alert(`An error occurred while saving profile: ${error.message}`);
        }
    }, [formData, media]);

    // Handle post creation
    const handleCreatePost = useCallback(() => {
        if (!postForm.content.trim()) return;

        const newPost = {
            id: Date.now(),
            content: postForm.content,
            image: postForm.image ? URL.createObjectURL(postForm.image) : null,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: []
        };

        setPosts(prev => [newPost, ...prev]);
        setPostForm({ content: "", image: null });
    }, [postForm]);

    // Handle mood change
    const handleMoodChange = useCallback((moodId) => {
        setUi(prev => ({ ...prev, currentMood: moodId }));
    }, []);

    // Toggle avatar usage
    const handleToggleAvatar = useCallback(async () => {
        const newValue = !ui.useAvatar;
        setUi(prev => ({ ...prev, useAvatar: newValue }));

        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            await fetch(`${BACKEND_URL}/api/user/avatar-toggle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ use_avatar: newValue })
            });
        } catch (error) {
            console.error("Failed to update avatar preference:", error);
            alert("Failed to update avatar preference.");
        }
    }, [ui.useAvatar]);

    // Render loading state
    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading your profile...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="profile-container">
                <div className="error-state">
                    <h3>⚠️ Unable to load profile</h3>
                    <p>{error}</p>
                    <button onClick={fetchProfile} className="retry-btn">
                        🔄 Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Cover Photo Section */}
            <div className="cover-photo-container">
                <img
                    src={media.coverPhoto || user.cover_photo || campfire}
                    alt="Cover"
                    className="cover-photo"
                />
                <button
                    onClick={() => coverPhotoInputRef.current.click()}
                    className="upload-btn cover-upload-btn"
                >
                    📷 Upload Cover Photo
                </button>
                <input
                    ref={coverPhotoInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleCoverPhotoChange}
                    accept="image/*"
                />
            </div>

            {/* Chat Modal */}
            {ui.isChatOpen && (
                <ChatModal
                    recipientId={user.id}
                    recipientName={effectiveUserName}
                    currentUserId={loggedInUserId}
                    onClose={() => setUi(prev => ({ ...prev, isChatOpen: false }))}
                    enableTypingIndicator={true}
                    enableThreads={true}
                    autoScroll={true}
                    enableMediaUpload={true}
                    enableGroupChat={true}
                />
            )}

            {/* Profile Header */}
            <div className="profile-avatar-toggle-horizontal">
                <div className="profile-avatar-section">
                    <img
                        src={ui.useAvatar ? user.avatar_url : media.profilePicture || user.profile_picture || lady1}
                        alt="Profile"
                        className="profile-pic"
                    />
                    <button
                        onClick={handleToggleAvatar}
                        className="avatar-toggle-btn"
                        title={ui.useAvatar ? "Switch to uploaded photo" : "Use AI avatar"}
                    >
                        {ui.useAvatar ? "📷" : "🤖"}
                    </button>
                </div>

                <div className="profile-name-inline">
                    {!editingStates.name ? (
                        <div className="name-display">
                            <h1 className="profile-name-label">
                                {formData.displayName || user.username || "Your Name"}
                            </h1>
                            <div className="name-actions">
                                <button
                                    className="edit-name-btn small-btn"
                                    onClick={() => toggleEditingState('name')}
                                >
                                    ✏️ Edit
                                </button>
                                {user.id !== loggedInUserId && (
                                    <button
                                        className="message-btn small-btn"
                                        onClick={() => setUi(prev => ({ ...prev, isChatOpen: true }))}
                                    >
                                        💬 Message
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="edit-name-input">
                            <input
                                type="text"
                                className="name-input"
                                value={formData.displayName}
                                onChange={(e) => updateFormData('displayName', e.target.value)}
                                placeholder="Enter your display name"
                                autoFocus
                            />
                            <div className="name-edit-actions">
                                <button
                                    className="name-save-btn"
                                    onClick={() => toggleEditingState('name')}
                                >
                                    ✅ Save
                                </button>
                                <button
                                    className="name-cancel-btn"
                                    onClick={() => {
                                        toggleEditingState('name');
                                        updateFormData('displayName', user.display_name || '');
                                    }}
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => profilePicInputRef.current.click()}
                        className="upload-btn profile-pic-upload"
                    >
                        😀 Upload Profile Picture
                    </button>
                    <input
                        ref={profilePicInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleProfilePicChange}
                        accept="image/*"
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="profile-header-flex">
                {/* Bio Section */}
                <div className="profile-card-bio">
                    <label>📝 Bio:</label>
                    {!editingStates.bio ? (
                        <>
                            <p>{formData.bio || "Add a bio to tell people about yourself..."}</p>
                            <button onClick={() => toggleEditingState('bio')}>
                                ✏️ Edit Bio
                            </button>
                        </>
                    ) : (
                        <>
                            <textarea
                                rows={5}
                                value={formData.bio}
                                onChange={(e) => updateFormData('bio', e.target.value)}
                                placeholder="Tell people about yourself..."
                            />
                            <div className="bio-edit-actions">
                                <button
                                    onClick={() => {
                                        toggleEditingState('bio');
                                        handleSaveProfile();
                                    }}
                                >
                                    ✅ Save Bio
                                </button>
                                <button
                                    onClick={() => {
                                        toggleEditingState('bio');
                                        updateFormData('bio', user.bio || '');
                                    }}
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="profile-stats-card">
                    <h4>📊 Quick Stats</h4>
                    <ul className="profile-stats-list">
                        <li>📊 Streams: <strong>{user.streams || 158}</strong></li>
                        <li>🎧 Podcasts: <strong>{user.podcasts || 12}</strong></li>
                        <li>📻 Stations: <strong>{user.stations || 5}</strong></li>
                        <li>⭐ Followers: <strong>{user.followers || 623}</strong></li>
                        <li>🎵 Videos: <strong>{media.videos.length}</strong></li>
                        <li>🖼️ Images: <strong>{media.images.length}</strong></li>
                    </ul>
                </div>

                {/* Mood Section */}
                <div className="mood-section">
                    <div className="mood-card">
                        <h4>🎨 Current Mood</h4>
                        <div className="mood-selector">
                            {MOOD_OPTIONS.map((mood) => (
                                <button
                                    key={mood.id}
                                    className={`mood-btn ${ui.currentMood === mood.id ? "active" : ""}`}
                                    onClick={() => handleMoodChange(mood.id)}
                                >
                                    {mood.emoji} {mood.label}
                                </button>
                            ))}
                        </div>
                        <div className="current-mood-display">
                            <p>Currently: <strong>
                                {MOOD_OPTIONS.find(m => m.id === ui.currentMood)?.emoji} {MOOD_OPTIONS.find(m => m.id === ui.currentMood)?.label}
                            </strong></p>
                        </div>
                    </div>
                </div>
            </div>

            <InnerCircle
                userId={effectiveUserId}
                isOwnProfile={isOwnProfile}
            />

            {/* Social Links Section */}
            <div className="social-links">
                <div className="social-links-header">
                    <h4>🔗 Social Links</h4>
                    <button
                        className="edit-social-btn"
                        onClick={() => toggleEditingState('socialLinks')}
                    >
                        {editingStates.socialLinks ? '✅ Done' : '✏️ Edit'}
                    </button>
                </div>

                {editingStates.socialLinks ? (
                    <div className="social-links-edit">
                        {SOCIAL_PLATFORMS.map((platform) => (
                            <div key={platform.key} className="social-input-group">
                                <span className="social-icon">{platform.icon}</span>
                                <input
                                    type="url"
                                    placeholder={`Your ${platform.label} URL`}
                                    value={formData.socialLinks[platform.key] || ''}
                                    onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                                    className="social-input"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="social-links-grid">
                        {SOCIAL_PLATFORMS.map((platform) => {
                            const url = formData.socialLinks[platform.key];
                            if (!url) return null;

                            return (
                                <a
                                    key={platform.key}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-link"
                                >
                                    <span className="social-icon">{platform.icon}</span>
                                    <div className="social-info">
                                        <strong>{platform.label}</strong>
                                        <p>{url.replace(/https?:\/\//, '').substring(0, 30)}...</p>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Profile Layout */}
            <div className="profile-layout">
                {/* Left Column - Favorites */}
                <div className="left-column">
                    <h3>⭐ <Link to="/favorites">Favorite Profiles</Link></h3>

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

                {/* Middle Column - Posts and Content */}
                <div className="middle-column">
                    <div className="post-section-wrapper">
                        {/* Tab Navigation */}
                        <div className="content-tabs">
                            {['posts', 'videos', 'images', 'uploads'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`tab-btn ${ui.activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setUi(prev => ({ ...prev, activeTab: tab }))}
                                >
                                    {tab === 'posts' && '📝 Posts'}
                                    {tab === 'videos' && '🎬 Videos'}
                                    {tab === 'images' && '🖼️ Images'}
                                    {tab === 'uploads' && '📤 Upload'}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {ui.activeTab === 'posts' && (
                            <div className="posts-section">
                                <div className="create-post">
                                    <h3>📝 Create a Post</h3>
                                    <textarea
                                        value={postForm.content}
                                        onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="What's on your mind?"
                                        className="post-textarea"
                                    />
                                    <div className="post-actions">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPostForm(prev => ({ ...prev, image: e.target.files[0] }))}
                                            className="post-image-input"
                                        />
                                        <button onClick={handleCreatePost} className="post-btn">
                                            📤 Post
                                        </button>
                                    </div>
                                </div>

                                {/* Posts List */}
                                <div className="posts-list">
                                    {posts.map((post) => (
                                        <div key={post.id} className="post-card">
                                            <div className="post-header">
                                                <img src={user.profile_picture || lady1} alt="Profile" className="post-avatar" />
                                                <div className="post-info">
                                                    <strong>{effectiveUserName}</strong>
                                                    <span className="post-time">
                                                        {new Date(post.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="post-content">{post.content}</p>
                                            {post.image && (
                                                <img src={post.image} alt="Post" className="post-image" />
                                            )}
                                            <div className="post-actions">
                                                <button className="post-action-btn">
                                                    👍 {post.likes}
                                                </button>
                                                <button className="post-action-btn">
                                                    💬 {post.comments.length}
                                                </button>
                                                <button className="post-action-btn">
                                                    🔄 Share
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ui.activeTab === 'videos' && (
                            <div className="videos-section">
                                <h3>🎬 Your Videos ({media.videos.length})</h3>
                                {media.videos.length > 0 ? (
                                    <div className="videos-grid">
                                        {media.videos.map((video, index) => (
                                            <div key={video.id || index} className="video-card">
                                                <video
                                                    src={video.file_url}
                                                    controls
                                                    className="video-player"
                                                    poster={video.thumbnail}
                                                />
                                                <div className="video-info">
                                                    <h4>{video.title}</h4>
                                                    <div className="video-stats">
                                                        <span>👁️ {video.views || 0}</span>
                                                        <span>👍 {video.likes || 0}</span>
                                                        <span>💬 {video.comments || 0}</span>
                                                    </div>
                                                </div>
                                                <div className="video-actions">
                                                    <button className="video-action-btn">
                                                        👍 Like
                                                    </button>
                                                    <button className="video-action-btn">
                                                        💬 Comment
                                                    </button>
                                                    <button
                                                        className="video-action-btn danger"
                                                        onClick={() => {
                                                            setMedia(prev => ({
                                                                ...prev,
                                                                videos: prev.videos.filter((_, i) => i !== index)
                                                            }));
                                                        }}
                                                    >
                                                        🗑️ Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <p>No videos uploaded yet. Switch to the Upload tab to add some!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {ui.activeTab === 'images' && (
                            <div className="images-section">
                                <h3>🖼️ Your Images ({media.images.length})</h3>
                                {media.images.length > 0 ? (
                                    <div className="images-grid">
                                        {media.images.map((image, index) => (
                                            <div key={image.id || index} className="image-card">
                                                <img
                                                    src={image.file_url}
                                                    alt={image.title}
                                                    className="gallery-image"
                                                />
                                                <div className="image-overlay">
                                                    <h4>{image.title}</h4>
                                                    <div className="image-actions">
                                                        <button className="image-action-btn">
                                                            👁️ View
                                                        </button>
                                                        <button className="image-action-btn">
                                                            📤 Share
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <p>No images uploaded yet. Switch to the Upload tab to add some!</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {ui.activeTab === 'uploads' && (
                            <div className="uploads-section">
                                <div className="upload-options">
                                    <div className="upload-card">
                                        <h3>🎬 Upload Video</h3>
                                        <p>Share your creative videos with the community</p>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleVideoUpload}
                                            className="upload-input"
                                            id="video-upload"
                                        />
                                        <label htmlFor="video-upload" className="upload-label">
                                            📹 Choose Video File
                                        </label>
                                    </div>

                                    <div className="upload-card">
                                        <h3>🖼️ Upload Images</h3>
                                        <p>Add photos to your gallery</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => {
                                                // Handle image uploads
                                                const files = Array.from(e.target.files);
                                                files.forEach(file => {
                                                    const newImage = {
                                                        id: Date.now() + Math.random(),
                                                        file_url: URL.createObjectURL(file),
                                                        title: file.name
                                                    };
                                                    setMedia(prev => ({
                                                        ...prev,
                                                        images: [...prev.images, newImage]
                                                    }));
                                                });
                                            }}
                                            className="upload-input"
                                            id="image-upload"
                                        />
                                        <label htmlFor="image-upload" className="upload-label">
                                            🖼️ Choose Image Files
                                        </label>
                                    </div>

                                    {user?.role && ["Pro", "Premium", "Free"].includes(user.role) && (
                                        <div className="upload-card">
                                            <h3>🎬 Advanced Upload</h3>
                                            <p>Use the advanced uploader with more options</p>
                                            <UploadVideo
                                                currentUser={user}
                                                onUpload={() => {
                                                    const token = localStorage.getItem("token");
                                                    if (token && user.id) {
                                                        fetch(`${BACKEND_URL}/api/user/${user.id}/videos`, {
                                                            headers: { Authorization: `Bearer ${token}` },
                                                        })
                                                            .then((res) => res.json())
                                                            .then((data) => setMedia(prev => ({ ...prev, videos: data })))
                                                            .catch((err) => console.error("Error fetching videos:", err));
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Video Chat Section */}
                    <div className="bottom-action-row">
                        <VideoChatPopup />
                    </div>
                </div>

                {/* Right Column - Quick Actions & Storefront */}
                <div className="right-column">
                    <div className="quick-actions">
                        <h3>🎛️ Quick Actions</h3>
                        <div className="action-buttons">
                            <Link to="/podcast/create" className="action-link">
                                <button className="action-btn podcast">
                                    🎙️ Create Podcast
                                </button>
                            </Link>
                            <Link to="/create-radio" className="action-link">
                                <button className="action-btn radio">
                                    📡 Create Radio Station
                                </button>
                            </Link>
                            <Link to="/indie-artist-upload" className="action-link">
                                <button className="action-btn indie">
                                    🎤 Indie Artist Upload
                                </button>
                            </Link>
                        </div>
                    </div>

                    <div className="storefront-section">
                        <h3>🛍️ Storefront</h3>
                        {formData.storefrontLink ? (
                            <div className="storefront-info">
                                <p>Visit my store:</p>
                                <a
                                    href={formData.storefrontLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="storefront-link"
                                >
                                    🔗 {formData.storefrontLink.replace(/https?:\/\//, '').substring(0, 25)}...
                                </a>
                            </div>
                        ) : (
                            <div className="storefront-setup">
                                <p>Set up your storefront to sell products</p>
                                <input
                                    type="url"
                                    placeholder="Enter your store URL"
                                    value={formData.storefrontLink}
                                    onChange={(e) => updateFormData('storefrontLink', e.target.value)}
                                    className="storefront-input"
                                />
                            </div>
                        )}
                    </div>

                    {/* Business Info */}
                    <div className="business-info">
                        <h3>💼 Business Info</h3>
                        <div className="business-fields">
                            <input
                                type="text"
                                placeholder="Business Name"
                                value={formData.businessName}
                                onChange={(e) => updateFormData('businessName', e.target.value)}
                                className="business-input"
                            />
                            <input
                                type="text"
                                placeholder="Radio Station"
                                value={formData.radioStation}
                                onChange={(e) => updateFormData('radioStation', e.target.value)}
                                className="business-input"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inbox Drawer */}
            {user && socket.current && (
                <InboxDrawer currentUser={user} socket={socket.current} />
            )}

            {/* Save Profile Button - Only show when changes are made */}
            {!ui.justSaved && (
                <div className="profile-actions">
                    <button onClick={handleSaveProfile} className="save-profile-btn">
                        💾 Save Profile
                    </button>
                </div>
            )}

            {/* Success Message */}
            {ui.justSaved && (
                <div className="success-message">
                    ✅ Profile saved successfully!
                </div>
            )}
        </div>
    );
};

export default ProfilePage;