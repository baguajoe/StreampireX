import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import VideoChatPopup from "../component/VideoChatPopup";
import InboxDrawer from "../component/InboxDrawer";
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
const BACKEND_URL = process.env.BACKEND_URL ;
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

// Favorite profiles data
const FAVORITE_PROFILES = [
    { id: 1, name: "@zenmaster", description: "Grateful for the silence", avatar: zenmaster },
    { id: 2, name: "@fitjay", description: "Fitness motivator", avatar: fitjay },
    { id: 3, name: "@lofilounge", description: "Chill beats", avatar: lofiLounge },
    { id: 4, name: "@jazzhub", description: "Smooth jazz vibes", avatar: jazzHub },
    { id: 5, name: "@energyreset", description: "Energy healing", avatar: energyReset },
    { id: 6, name: "@chicast", description: "Chicago vibes", avatar: chiCast }
];

// Mock posts data
const MOCK_POSTS = [
    {
        id: 1,
        content: "Just dropped a new track! 🎵 Check it out and let me know what you think.",
        timestamp: "2 hours ago",
        avatar: lady1,
        username: "You",
        image: null,
        likes: 12,
        comments: 3
    },
    {
        id: 2,
        content: "Amazing studio session today. The energy was incredible! 🔥",
        timestamp: "1 day ago",
        avatar: lady1,
        username: "You",
        image: null,
        likes: 8,
        comments: 2
    }
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form and editing state
    const [formData, setFormData] = useState({
        bio: '',
        displayName: '',
        storefrontLink: '',
        socialLinks: {},
        businessName: '',
        businessType: '',
        businessWebsite: ''
    });

    const [editingStates, setEditingStates] = useState({
        bio: false,
        displayName: false,
        socialLinks: false,
        business: false
    });

    // UI state
    const [ui, setUi] = useState({
        currentMood: 'chill',
        useAvatar: true,
        isChatOpen: false,
        isVideoChatOpen: false,
        showShareModal: false,
        activeTab: 'posts',
        isInboxOpen: false,
        unreadCount: 3,
        showSuccessMessage: false
    });

    // Media state
    const [media, setMedia] = useState({
        profilePicture: null,
        coverPhoto: null,
        videos: [],
        images: []
    });

    // Posts state
    const [posts, setPosts] = useState(MOCK_POSTS);
    const [newPost, setNewPost] = useState('');
    const [postImage, setPostImage] = useState(null);

    // Refs
    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);
    const postImageInputRef = useRef(null);
    const socket = useRef(null);

    // Get user info from localStorage or context
    const loggedInUserId = localStorage.getItem('userId') || '1';
    const loggedInUsername = localStorage.getItem('username') || 'User';

    // Memoized socket initialization
    const initializeSocket = useCallback(() => {
        if (!socket.current) {
            socket.current = createSocket();
        }
        return socket.current;
    }, []);

    // Form data updater
    const updateFormData = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    // Toggle editing states
    const toggleEditingState = useCallback((field) => {
        setEditingStates(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, []);

    // Handle mood change
    const handleMoodChange = useCallback((moodId) => {
        setUi(prev => ({ ...prev, currentMood: moodId }));
    }, []);

    // Handle tab change
    const handleTabChange = useCallback((tab) => {
        setUi(prev => ({ ...prev, activeTab: tab }));
    }, []);

    // Handle profile picture change
    const handleProfilePicChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setMedia(prev => ({ ...prev, profilePicture: e.target.result }));
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle cover photo change
    const handleCoverPhotoChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setMedia(prev => ({ ...prev, coverPhoto: e.target.result }));
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle post image change
    const handlePostImageChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPostImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // Handle profile save
    const handleSaveProfile = useCallback(async () => {
        try {
            setLoading(true);
            console.log('Saving profile:', formData);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setUi(prev => ({ ...prev, showSuccessMessage: true }));
            setTimeout(() => {
                setUi(prev => ({ ...prev, showSuccessMessage: false }));
            }, 3000);
            setError(null);
        } catch (err) {
            setError('Failed to save profile');
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    }, [formData]);

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching profile...');
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data
            const mockUser = {
                id: loggedInUserId,
                display_name: 'John Doe',
                username: loggedInUsername,
                bio: 'Music producer and audio engineer passionate about creating amazing sounds.',
                streams: 158,
                podcasts: 12,
                stations: 5,
                followers: 623,
                profile_picture: lady1,
                cover_photo: campfire
            };

            setUser(mockUser);
            setFormData({
                bio: mockUser.bio || '',
                displayName: mockUser.display_name || '',
                storefrontLink: '',
                socialLinks: {},
                businessName: '',
                businessType: '',
                businessWebsite: ''
            });
        } catch (err) {
            setError('Failed to load profile');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [loggedInUserId, loggedInUsername]);

    // Handle share profile
    const handleShareProfile = useCallback(() => {
        const profileUrl = `${window.location.origin}/profile/${user.id}`;

        if (navigator.share) {
            navigator.share({
                title: `${user.display_name || user.username}'s Profile`,
                text: 'Check out my profile!',
                url: profileUrl
            }).catch(console.error);
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied to clipboard!');
            }).catch(() => {
                // Fallback: show modal
                setUi(prev => ({ ...prev, showShareModal: true }));
            });
        }
    }, [user]);

    // Handle open chat - Should open InboxDrawer, not ChatModal
    const handleOpenChat = useCallback(() => {
        setUi(prev => ({ ...prev, isInboxOpen: true }));
    }, []);

    // Handle toggle inbox
    const handleToggleInbox = useCallback(() => {
        setUi(prev => ({ ...prev, isInboxOpen: !prev.isInboxOpen }));
    }, []);

    // Handle video chat toggle
    const handleToggleVideoChat = useCallback(() => {
        setUi(prev => ({ ...prev, isVideoChatOpen: !prev.isVideoChatOpen }));
    }, []);

    // Handle create post
    const handleCreatePost = useCallback(() => {
        if (!newPost.trim()) return;

        const post = {
            id: Date.now(),
            content: newPost,
            timestamp: "Just now",
            avatar: media.profilePicture || user.profile_picture || lady1,
            username: user.display_name || user.username || "You",
            image: postImage,
            likes: 0,
            comments: 0
        };

        setPosts(prev => [post, ...prev]);
        setNewPost('');
        setPostImage(null);
    }, [newPost, postImage, media.profilePicture, user]);

    // Handle post like
    const handleLikePost = useCallback((postId) => {
        setPosts(prev => prev.map(post =>
            post.id === postId
                ? { ...post, likes: post.likes + 1 }
                : post
        ));
    }, []);

    // Initialize profile on mount
    useEffect(() => {
        fetchProfile();
        initializeSocket();

        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [fetchProfile, initializeSocket]);

    // Update avatar display
    useEffect(() => {
        if (media.profilePicture) {
            setUi(prev => ({ ...prev, useAvatar: true }));
        }
    }, [media.profilePicture]);

    // Render loading state
    if (loading && !user.id) {
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
    if (error && !user.id) {
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

    const effectiveUserId = user?.id || loggedInUserId;
    const effectiveUserName = user?.display_name || user?.username || loggedInUsername || `User ${effectiveUserId}`;

    return (
        <div className="profile-container">
            {/* Success Message */}
            {ui.showSuccessMessage && (
                <div className="success-message">
                    ✅ Profile saved successfully!
                </div>
            )}

            {/* Cover Photo Section */}
            <div className="cover-photo-container">
                <img
                    src={media.coverPhoto || user.cover_photo || campfire}
                    alt="Cover"
                    className="cover-photo"
                />
                <button
                    onClick={() => coverPhotoInputRef.current.click()}
                    className="cover-upload-btn"
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

            {/* Remove the ChatModal since we're using InboxDrawer for messaging */}
            {ui.isChatOpen && (
                <div className="chat-notice">
                    <p>Use the Messages button to open the inbox!</p>
                    <button onClick={() => setUi(prev => ({ ...prev, isChatOpen: false }))}>Close</button>
                </div>
            )}

            {/* Inbox Drawer - Fixed Integration */}
            <InboxDrawer
                isOpen={ui.isInboxOpen}
                onClose={() => setUi(prev => ({ ...prev, isInboxOpen: false }))}
                currentUser={{
                    id: effectiveUserId,
                    username: effectiveUserName,
                    display_name: effectiveUserName
                }}
                socket={socket.current}
            />

            {/* Share Modal */}
            {ui.showShareModal && (
                <div className="share-modal-overlay" onClick={() => setUi(prev => ({ ...prev, showShareModal: false }))}>
                    <div className="share-modal" onClick={e => e.stopPropagation()}>
                        <div className="share-modal-header">
                            <h3>Share Profile</h3>
                            <button
                                className="close-modal-btn"
                                onClick={() => setUi(prev => ({ ...prev, showShareModal: false }))}
                            >
                                ✖
                            </button>
                        </div>
                        <div className="share-modal-content">
                            <p>Copy this link to share your profile:</p>
                            <div className="share-link-container">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/profile/${user.id}`}
                                    readOnly
                                    className="share-link-input"
                                />
                                <button
                                    className="copy-link-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/profile/${user.id}`);
                                        alert('Link copied!');
                                    }}
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Header */}
            <div className="profile-avatar-toggle-horizontal">
                <div className="profile-avatar-section">
                    <img
                        src={ui.useAvatar ?
                            (media.profilePicture || user.profile_picture || lady1) :
                            lady1
                        }
                        alt="Profile"
                        className="profile-pic"
                    />
                    <button
                        className="avatar-toggle-btn"
                        onClick={() => setUi(prev => ({ ...prev, useAvatar: !prev.useAvatar }))}
                        title="Toggle Avatar"
                    >
                        🔄
                    </button>
                </div>

                <div className="profile-name-inline">
                    {!editingStates.displayName ? (
                        <div className="name-display">
                            <h2 className="profile-name-label">
                                {effectiveUserName}
                            </h2>
                            <div className="name-actions">
                                <button
                                    onClick={() => toggleEditingState('displayName')}
                                    className="small-btn"
                                >
                                    ✏️ Edit Name
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="edit-name-input">
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => updateFormData('displayName', e.target.value)}
                                placeholder="Enter display name"
                                className="name-input"
                            />
                            <div className="name-edit-actions">
                                <button
                                    onClick={() => {
                                        toggleEditingState('displayName');
                                        handleSaveProfile();
                                    }}
                                    className="name-save-btn"
                                >
                                    ✅ Save
                                </button>
                                <button
                                    onClick={() => {
                                        toggleEditingState('displayName');
                                        updateFormData('displayName', user.display_name || '');
                                    }}
                                    className="name-cancel-btn"
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => profilePicInputRef.current.click()}
                        className="upload-btn"
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
                {/* Mood Section */}
                <div className="mood-section ms-auto">
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

            {/* Main Content Grid - Better Balanced */}
            <div className="profile-header-flex">
                {/* Bio Section */}
                <div className="profile-card-bio mx-auto">
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



            </div>


            {/* Main Layout with Three Columns */}
            <div className="profile-layout">
                {/* Left Column - Favorite Profiles */}
                <div className="left-column">
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
                                {SOCIAL_PLATFORMS.map(platform => (
                                    <div key={platform.key} className="social-input-group">
                                        <div className="social-icon">{platform.icon}</div>
                                        <input
                                            type="url"
                                            value={formData.socialLinks[platform.key] || ''}
                                            onChange={(e) => updateFormData('socialLinks', {
                                                ...formData.socialLinks,
                                                [platform.key]: e.target.value
                                            })}
                                            placeholder={`Your ${platform.label} URL`}
                                            className="social-input"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="social-links-grid">
                                {SOCIAL_PLATFORMS.map(platform => (
                                    formData.socialLinks[platform.key] && (
                                        <a
                                            key={platform.key}
                                            href={formData.socialLinks[platform.key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link"
                                        >
                                            <div className="social-icon">{platform.icon}</div>
                                            <div className="social-info">
                                                <strong>{platform.label}</strong>
                                                <p>Visit my {platform.label}</p>
                                            </div>
                                        </a>
                                    )
                                ))}
                                {Object.keys(formData.socialLinks).length === 0 && (
                                    <div className="social-links-empty">
                                        <p>No social links added yet.</p>
                                        <button
                                            className="action-btn"
                                            onClick={() => toggleEditingState('socialLinks')}
                                        >
                                            ➕ Add Social Links
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Inner Circle Section - Moved here, under Social Links */}
                    <div className="inner-circle-section">
                        <div className="inner-circle-header">
                            <h3>👥 Inner Circle <span className="circle-count">(6 members)</span></h3>
                            <button className="edit-circle-btn">
                                ✏️ Manage Circle
                            </button>
                        </div>
                        <div className="social-links-grid">
                            {FAVORITE_PROFILES.map(profile => (
                                <div key={profile.id} className="favorite-item">
                                    <img src={profile.avatar} alt={profile.name} className="favorite-avatar" />
                                    <div>
                                        <strong>{profile.name}</strong>
                                        <p>{profile.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <h3>⭐ <Link to="/favorites">Favorite Profiles</Link></h3>
                    {FAVORITE_PROFILES.slice(0, 6).map(profile => (
                        <div key={profile.id} className="favorite-item">
                            <img src={profile.avatar} alt={profile.name} className="favorite-avatar" />
                            <div>
                                <strong>{profile.name}</strong>
                                <p>{profile.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Middle Column - Posts and Content */}
                <div className="middle-column">
                    <div className="post-section-wrapper">
                        {/* Content Tabs */}
                        <div className="content-tabs">
                            <button
                                className={`tab-btn ${ui.activeTab === 'posts' ? 'active' : ''}`}
                                onClick={() => handleTabChange('posts')}
                            >
                                📝 Posts
                            </button>
                            <button
                                className={`tab-btn ${ui.activeTab === 'videos' ? 'active' : ''}`}
                                onClick={() => handleTabChange('videos')}
                            >
                                🎥 Videos
                            </button>
                            <button
                                className={`tab-btn ${ui.activeTab === 'images' ? 'active' : ''}`}
                                onClick={() => handleTabChange('images')}
                            >
                                🖼️ Images
                            </button>
                            <button
                                className={`tab-btn ${ui.activeTab === 'uploads' ? 'active' : ''}`}
                                onClick={() => handleTabChange('uploads')}
                            >
                                📤 Uploads
                            </button>
                        </div>

                        {/* Tab Content */}
                        {ui.activeTab === 'posts' && (
                            <>
                                {/* Create Post */}
                                <div className="create-post">
                                    <h3>📝 What's on your mind?</h3>
                                    <textarea
                                        className="post-textarea"
                                        value={newPost}
                                        onChange={(e) => setNewPost(e.target.value)}
                                        placeholder="Share your thoughts..."
                                    />
                                    <div className="post-actions">
                                        <input
                                            ref={postImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePostImageChange}
                                            className="post-image-input"
                                        />
                                        <button
                                            className="post-btn"
                                            onClick={handleCreatePost}
                                            disabled={!newPost.trim()}
                                        >
                                            📤 Post
                                        </button>
                                    </div>
                                    {postImage && (
                                        <div className="image-preview">
                                            <img src={postImage} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                                            <button onClick={() => setPostImage(null)}>❌ Remove</button>
                                        </div>
                                    )}
                                </div>

                                {/* Posts List */}
                                <div className="posts-list">
                                    {posts.map(post => (
                                        <div key={post.id} className="post-card">
                                            <div className="post-header">
                                                <img src={post.avatar} alt={post.username} className="post-avatar" />
                                                <div className="post-info">
                                                    <strong>{post.username}</strong>
                                                    <div className="post-time">{post.timestamp}</div>
                                                </div>
                                            </div>
                                            <div className="post-content">{post.content}</div>
                                            {post.image && <img src={post.image} alt="Post" className="post-image" />}
                                            <div className="post-actions">
                                                <button
                                                    className="post-action-btn"
                                                    onClick={() => handleLikePost(post.id)}
                                                >
                                                    👍 {post.likes}
                                                </button>
                                                <button className="post-action-btn">
                                                    💬 {post.comments}
                                                </button>
                                                <button className="post-action-btn">
                                                    🔄 Share
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {ui.activeTab === 'videos' && (
                            <div className="videos-section">
                                <div className="empty-state">
                                    <p>No videos uploaded yet. Start sharing your content!</p>
                                </div>
                            </div>
                        )}

                        {ui.activeTab === 'images' && (
                            <div className="images-section">
                                <div className="empty-state">
                                    <p>No images uploaded yet. Share your visual content!</p>
                                </div>
                            </div>
                        )}

                        {ui.activeTab === 'uploads' && (
                            <div className="uploads-section">
                                <h3>📤 Upload Content</h3>
                                <div className="upload-options">
                                    <div className="upload-card">
                                        <h3>🎥 Upload Video</h3>
                                        <p>Share your video content with your audience</p>
                                        <UploadVideo />
                                    </div>
                                    <div className="upload-card">
                                        <h3>🖼️ Upload Images</h3>
                                        <p>Share photos and visual content</p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="upload-input"
                                            id="image-upload"
                                        />
                                        <label htmlFor="image-upload" className="upload-label">
                                            📁 Choose Images
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Video Chat Integration */}
                        {ui.isVideoChatOpen && (
                            <div className="video-chat-wrapper">
                                <VideoChatPopup currentUser={user} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Quick Actions & Business Info */}
                <div className="right-column">
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

                    {/* Storefront Section */}
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
                                    🔗 {formData.storefrontLink.replace(/https?:\/\//, '')}
                                </a>
                            </div>
                        ) : (
                            <div className="storefront-setup">
                                <p>Set up your online store</p>
                                <input
                                    type="url"
                                    value={formData.storefrontLink}
                                    onChange={(e) => updateFormData('storefrontLink', e.target.value)}
                                    placeholder="https://your-store.com"
                                    className="storefront-input"
                                />
                                <button
                                    onClick={handleSaveProfile}
                                    className="action-btn"
                                >
                                    💾 Save Store Link
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Business Info */}
                    <div className="business-info">
                        <h3>💼 Business Info</h3>
                        {!editingStates.business ? (
                            <>
                                {formData.businessName ? (
                                    <div>
                                        <p><strong>Business:</strong> {formData.businessName}</p>
                                        <p><strong>Type:</strong> {formData.businessType}</p>
                                        {formData.businessWebsite && (
                                            <p><strong>Website:</strong>
                                                <a href={formData.businessWebsite} target="_blank" rel="noopener noreferrer">
                                                    {formData.businessWebsite.replace(/https?:\/\//, '')}
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p>Add your business information</p>
                                )}
                                <button
                                    onClick={() => toggleEditingState('business')}
                                    className="action-btn"
                                >
                                    ✏️ Edit Business Info
                                </button>
                            </>
                        ) : (
                            <div className="business-fields">
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => updateFormData('businessName', e.target.value)}
                                    placeholder="Business Name"
                                    className="business-input"
                                />
                                <input
                                    type="text"
                                    value={formData.businessType}
                                    onChange={(e) => updateFormData('businessType', e.target.value)}
                                    placeholder="Business Type"
                                    className="business-input"
                                />
                                <input
                                    type="url"
                                    value={formData.businessWebsite}
                                    onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                                    placeholder="https://business-website.com"
                                    className="business-input"
                                />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => {
                                            toggleEditingState('business');
                                            handleSaveProfile();
                                        }}
                                        className="action-btn"
                                    >
                                        ✅ Save
                                    </button>
                                    <button
                                        onClick={() => toggleEditingState('business')}
                                        className="action-btn"
                                        style={{ background: '#e74c3c' }}
                                    >
                                        ❌ Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Action Row */}
            <div className="bottom-action-row">
                <button
                    className="action-btn"
                    onClick={handleToggleVideoChat}
                >
                    🎥 {ui.isVideoChatOpen ? 'Close Video Chat' : 'Open Video Chat'}
                </button>

                <button
                    className="action-btn"
                    onClick={handleToggleInbox}
                >
                    💬 Messages
                </button>

                <button
                    className="action-btn"
                    onClick={handleShareProfile}
                >
                    📤 Share Profile
                </button>
            </div>

            {/* Remove the separate floating inbox button since it's now in bottom action row */}

            {/* Fixed Profile Actions - Save Button */}
            <div className="profile-actions">
                <button
                    onClick={handleSaveProfile}
                    className="save-profile-btn"
                    disabled={loading}
                >
                    {loading ? '💾 Saving...' : '💾 Save Profile'}
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;