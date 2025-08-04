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
const BACKEND_URL = process.env.BACKEND_URL;
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
    { key: 'github', icon: '💻', label: 'GitHub' },
    { key: 'tiktok', icon: '🎬', label: 'TikTok' },
    { key: 'twitch', icon: '🎮', label: 'Twitch' }
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

// Simple InnerCircle component placeholder
const InnerCircle = ({ userId, isOwnProfile }) => (
    <div className="inner-circle-section">
        <h4>👥 Inner Circle</h4>
        <div className="inner-circle-content">
            <p>Close friends and collaborators</p>
            {isOwnProfile && (
                <button className="add-to-circle-btn">
                    ➕ Add to Circle
                </button>
            )}
        </div>
    </div>
);

// Memoized socket connection
const createSocket = (token) => {
    return io(SOCKET_URL, {
        transports: ["websocket"],
        auth: { token },
        withCredentials: true,
    });
};

const ProfilePage = () => {
    // Authentication state - using React state instead of localStorage
    const [authState, setAuthState] = useState({
        token: null,
        userId: '1',
        username: 'User'
    });

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
        businessWebsite: '',
        location: ''
    });

    const [editingStates, setEditingStates] = useState({
        bio: false,
        displayName: false,
        socialLinks: false,
        business: false
    });

    // UI state - ENHANCED WITH CUSTOM MOOD SUPPORT
    const [ui, setUi] = useState({
        currentMood: 'chill',
        customMoodLabel: null,
        customMoodEmoji: null,
        useAvatar: true,
        isChatOpen: false,
        isVideoChatOpen: false,
        showShareModal: false,
        activeTab: 'posts',
        isInboxOpen: false,
        unreadCount: 3,
        showSuccessMessage: false,
        showAllFavorites: false
    });

    // Custom mood state
    const [customMood, setCustomMood] = useState('');
    const [showCustomMoodInput, setShowCustomMoodInput] = useState(false);

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

    // Initialize auth state (get from localStorage if available)
    useEffect(() => {
        // Get real token from localStorage if available, otherwise use demo
        const storedToken = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('token') : null;
        const storedUserId = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('userId') : null;
        const storedUsername = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('username') : null;
        
        setAuthState({
            token: storedToken || 'demo-token',
            userId: storedUserId || '1',
            username: storedUsername || 'Demo User'
        });
    }, []);

    // Memoized socket initialization
    const initializeSocket = useCallback(() => {
        if (!socket.current && authState.token) {
            socket.current = createSocket(authState.token);
        }
        return socket.current;
    }, [authState.token]);

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

    // ENHANCED Handle mood change - now supports custom moods
    const handleMoodChange = useCallback((moodId, customLabel = null, customEmoji = null) => {
        setUi(prev => ({ 
            ...prev, 
            currentMood: moodId,
            customMoodLabel: customLabel,
            customMoodEmoji: customEmoji
        }));
    }, []);

    // Handle custom mood creation
    const handleCreateCustomMood = useCallback(() => {
        if (customMood.trim()) {
            // Extract emoji if present (first character if it's an emoji)
            const emojiRegex = /^(\p{Emoji})\s*(.+)/u;
            const match = customMood.match(emojiRegex);
            
            const emoji = match ? match[1] : '🎭';
            const label = match ? match[2].trim() : customMood.trim();
            
            handleMoodChange('custom', label, emoji);
            setCustomMood('');
            setShowCustomMoodInput(false);
        }
    }, [customMood, handleMoodChange]);

    // Get current mood display
    const getCurrentMoodDisplay = useCallback(() => {
        if (ui.currentMood === 'custom') {
            return `${ui.customMoodEmoji || '🎭'} ${ui.customMoodLabel || 'Custom'}`;
        }
        const mood = MOOD_OPTIONS.find(m => m.id === ui.currentMood);
        return mood ? `${mood.emoji} ${mood.label}` : '😌 Chill';
    }, [ui.currentMood, ui.customMoodLabel, ui.customMoodEmoji]);

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

    // Handle profile save - REAL BACKEND CONNECTION
    const handleSaveProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Saving profile to backend:', formData);

            // Check for token
            if (!authState.token) {
                throw new Error("Please log in to save your profile");
            }

            // Prepare the data to send to your backend - INCLUDING CUSTOM MOOD
            const profileData = {
                bio: formData.bio,
                display_name: formData.displayName,
                social_links: formData.socialLinks,
                location: formData.location,
                website: formData.businessWebsite,
                business_name: formData.businessName,
                business_type: formData.businessType,
                business_website: formData.businessWebsite,
                // Add mood data
                current_mood: ui.currentMood,
                custom_mood_label: ui.customMoodLabel,
                custom_mood_emoji: ui.customMoodEmoji
            };

            console.log('Sending data to backend:', profileData);

            // Make the REAL API call to your backend
            const response = await fetch(`${BACKEND_URL}/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authState.token}`,
                },
                body: JSON.stringify(profileData),
            });

            console.log('Backend response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend error response:', errorText);
                throw new Error(`Backend error: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log('Backend response data:', responseData);

            // Update the user state with the actual backend response
            if (responseData.user) {
                setUser(responseData.user);
            } else {
                setUser(responseData);
            }

            // Show success message
            setUi(prev => ({ ...prev, showSuccessMessage: true }));
            setTimeout(() => {
                setUi(prev => ({ ...prev, showSuccessMessage: false }));
            }, 3000);

            console.log('Profile saved successfully!');

        } catch (err) {
            setError(`Failed to save profile: ${err.message}`);
            console.error('Save error details:', err);
        } finally {
            setLoading(false);
        }
    }, [formData, authState.token, ui.currentMood, ui.customMoodLabel, ui.customMoodEmoji]);

    // Fetch profile data - REAL BACKEND CONNECTION
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!authState.token) {
                console.log('No token found, using fallback data');
                // Use fallback data if no token
                const fallbackUser = {
                    id: authState.userId,
                    username: authState.username,
                    display_name: authState.username,
                };
                setUser(fallbackUser);
                setFormData({
                    bio: '',
                    displayName: authState.username,
                    storefrontLink: '',
                    socialLinks: {},
                    businessName: '',
                    businessType: '',
                    businessWebsite: '',
                    location: ''
                });
                return;
            }

            console.log('Fetching profile from backend...');

            const response = await fetch(`${BACKEND_URL}/user/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authState.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.status}`);
            }

            const userData = await response.json();
            console.log('Fetched real user data from backend:', userData);

            setUser(userData);
            setFormData({
                bio: userData.bio || '',
                displayName: userData.display_name || userData.username || '',
                storefrontLink: userData.storefront_link || '',
                socialLinks: userData.social_links || {},
                businessName: userData.business_name || '',
                businessType: userData.business_type || '',
                businessWebsite: userData.business_website || '',
                location: userData.location || ''
            });

            // Load saved mood data
            if (userData.current_mood) {
                setUi(prev => ({
                    ...prev,
                    currentMood: userData.current_mood,
                    customMoodLabel: userData.custom_mood_label,
                    customMoodEmoji: userData.custom_mood_emoji
                }));
            }

        } catch (err) {
            setError(`Failed to load profile: ${err.message}`);
            console.error('Fetch error:', err);

            // Fall back to demo data if backend fails
            const fallbackUser = {
                id: authState.userId,
                username: authState.username,
                display_name: authState.username,
            };
            setUser(fallbackUser);
            setFormData({
                bio: '',
                displayName: authState.username,
                storefrontLink: '',
                socialLinks: {},
                businessName: '',
                businessType: '',
                businessWebsite: '',
                location: ''
            });
        } finally {
            setLoading(false);
        }
    }, [authState]);

    // Handle share profile
    const handleShareProfile = useCallback(() => {
        const profileUrl = `${window.location.origin}/profile/${user.id}`;

        if (navigator.share) {
            navigator.share({
                title: `${user.display_name || user.username}'s Profile`,
                text: 'Check out my profile!',
                url: profileUrl,
            });
        } else {
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied to clipboard!');
            });
        }
    }, [user]);

    // Handle message actions - FIXED
    const handleToggleInbox = useCallback(() => {
        setUi(prev => ({ ...prev, isInboxOpen: !prev.isInboxOpen }));
    }, []);

    // FIXED: Remove stale closure issue by not depending on current state
    const handleToggleChat = useCallback(() => {
        console.log('Toggling chat modal');
        setUi(prev => {
            console.log('Previous chat state:', prev.isChatOpen);
            const newState = !prev.isChatOpen;
            console.log('New chat state will be:', newState);
            return { 
                ...prev, 
                isChatOpen: newState 
            };
        });
    }, []); // FIXED: Empty dependency array

    // FIXED: Same fix for video chat
    const handleToggleVideoChat = useCallback(() => {
        console.log('Toggling video chat');
        setUi(prev => {
            console.log('Previous video chat state:', prev.isVideoChatOpen);
            const newState = !prev.isVideoChatOpen;
            console.log('New video chat state will be:', newState);
            return { 
                ...prev, 
                isVideoChatOpen: newState 
            };
        });
    }, []); // FIXED: Empty dependency array

    // Handle social link changes
    const handleSocialLinkChange = useCallback((platform, value) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [platform]: value
            }
        }));
    }, []);

    // Handle new post
    const handleCreatePost = useCallback(() => {
        if (!newPost.trim()) return;

        const newPostObj = {
            id: Date.now(),
            content: newPost,
            timestamp: 'Just now',
            avatar: media.profilePicture || user.profile_picture || lady1,
            username: user.display_name || user.username || 'You',
            image: postImage,
            likes: 0,
            comments: 0
        };

        setPosts(prev => [newPostObj, ...prev]);
        setNewPost('');
        setPostImage(null);
    }, [newPost, postImage, media.profilePicture, user]);

    // Handle like post
    const handleLikePost = useCallback((postId) => {
        setPosts(prev => prev.map(post =>
            post.id === postId
                ? { ...post, likes: post.likes + 1 }
                : post
        ));
    }, []);

    // Toggle favorites view
    const toggleFavoritesView = useCallback(() => {
        setUi(prev => ({ ...prev, showAllFavorites: !prev.showAllFavorites }));
    }, []);

    // Initialize profile on mount
    useEffect(() => {
        if (authState.token) {
            fetchProfile();
            initializeSocket();
        }

        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [authState.token, fetchProfile, initializeSocket]);

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

    const effectiveUserId = user?.id || authState.userId;
    const effectiveUserName = user?.display_name || user?.username || authState.username || `User ${effectiveUserId}`;

    return (
        <div className="profile-container">
            {/* Success Message */}
            {ui.showSuccessMessage && (
                <div className="success-message">
                    ✅ Profile saved successfully!
                </div>
            )}

            {/* Cover Photo Section - FIXED */}
            <div className="cover-photo-container">
                <img
                    src={media.coverPhoto || user.cover_photo || campfire}
                    alt="Cover"
                    className="cover-photo"
                />
                <div className="cover-photo-overlay">
                    <button
                        onClick={() => coverPhotoInputRef.current?.click()}
                        className="cover-upload-btn"
                    >
                        📷 Upload Cover Photo
                    </button>
                </div>
                <input
                    ref={coverPhotoInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleCoverPhotoChange}
                    accept="image/*"
                />
            </div>

            {/* FIXED: Chat Modal with proper conditional rendering */}
            {ui.isChatOpen && (
                <ChatModal
                    recipientId={effectiveUserId}
                    recipientName={effectiveUserName}
                    currentUserId={authState.userId}
                    onClose={handleToggleChat} // FIXED: Use the callback directly
                    enableTypingIndicator={true}
                    enableThreads={true}
                    autoScroll={true}
                    enableMediaUpload={true}
                    enableGroupChat={false}
                />
            )}

            {/* Video Chat Popup */}
            {ui.isVideoChatOpen && (
                <VideoChatPopup
                    currentUser={{
                        id: effectiveUserId,
                        username: effectiveUserName,
                        display_name: effectiveUserName
                    }}
                    onClose={handleToggleVideoChat} // FIXED: Add onClose prop
                />
            )}

            {/* Inbox Drawer */}
            <InboxDrawer
                isOpen={ui.isInboxOpen}
                onClose={() => setUi(prev => ({ ...prev, isInboxOpen: false }))}
                unreadCount={ui.unreadCount}
            />

            {/* Share Modal */}
            {ui.showShareModal && (
                <div className="modal-backdrop" onClick={() => setUi(prev => ({ ...prev, showShareModal: false }))}>
                    <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>📤 Share Profile</h3>
                        <div className="share-content">
                            <p>Share your profile with others:</p>
                            <div className="share-link-container">
                                <input
                                    type="text"
                                    value={`${window.location.origin}/profile/${effectiveUserId}`}
                                    readOnly
                                    className="share-link-input"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/profile/${effectiveUserId}`);
                                        alert('Link copied to clipboard!');
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
                        onClick={() => profilePicInputRef.current.click()}
                        style={{ cursor: 'pointer' }}
                    />
                    <button
                        className="avatar-toggle-btn"
                        onClick={() => setUi(prev => ({ ...prev, useAvatar: !prev.useAvatar }))}
                        title="Toggle Avatar"
                    >
                        🔄
                    </button>
                    <input
                        ref={profilePicInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleProfilePicChange}
                        accept="image/*"
                    />
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
                                        updateFormData('displayName', user.display_name || user.username || '');
                                    }}
                                    className="name-cancel-btn"
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ENHANCED Current Mood Section with Custom Input */}
                    <div className="mood-section">
                        <h4>🎭 Current Mood</h4>
                        
                        {/* Predefined Mood Options */}
                        <div className="mood-options">
                            {MOOD_OPTIONS.map(mood => (
                                <button
                                    key={mood.id}
                                    className={`mood-btn ${ui.currentMood === mood.id && ui.currentMood !== 'custom' ? "active" : ""}`}
                                    onClick={() => handleMoodChange(mood.id)}
                                >
                                    {mood.emoji} {mood.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Mood Section */}
                        <div className="custom-mood-section">
                            {!showCustomMoodInput ? (
                                <button
                                    className="create-custom-mood-btn"
                                    onClick={() => setShowCustomMoodInput(true)}
                                >
                                    ➕ Create Custom Mood
                                </button>
                            ) : (
                                <div className="custom-mood-input">
                                    <input
                                        type="text"
                                        value={customMood}
                                        onChange={(e) => setCustomMood(e.target.value)}
                                        placeholder="😊 Enter your custom mood (emoji + text)"
                                        className="custom-mood-field"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateCustomMood();
                                            }
                                        }}
                                    />
                                    <div className="custom-mood-actions">
                                        <button
                                            onClick={handleCreateCustomMood}
                                            className="save-custom-mood-btn"
                                            disabled={!customMood.trim()}
                                        >
                                            ✅ Set Mood
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCustomMoodInput(false);
                                                setCustomMood('');
                                            }}
                                            className="cancel-custom-mood-btn"
                                        >
                                            ❌ Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Current Mood Display */}
                        <div className="current-mood-display">
                            <p>Currently: <strong>{getCurrentMoodDisplay()}</strong></p>
                            {ui.currentMood === 'custom' && (
                                <button
                                    className="clear-custom-mood-btn"
                                    onClick={() => handleMoodChange('chill')}
                                >
                                    🔄 Back to Preset Moods
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid - Bio, Quick Actions, Stats */}
            <div className="profile-header-flex">
                {/* Bio Section - Smaller */}
                <div className="profile-card-bio compact">
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
                                rows={3}
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

                {/* Quick Actions Panel - MOVED HERE */}
                <div className="quick-actions-panel compact">
                    <h4>🚀 Quick Actions</h4>
                    <div className="quick-actions-grid">
                        <Link to="/creator-dashboard" className="quick-action-link">
                            <div className="quick-action-card">
                                <div className="action-icon">📊</div>
                                <div className="action-info">
                                    <h5>Creator Dashboard</h5>
                                    <p>Analytics & Overview</p>
                                </div>
                            </div>
                        </Link>
                        <Link to="/artist-dashboard" className="quick-action-link">
                            <div className="quick-action-card">
                                <div className="action-icon">🎤</div>
                                <div className="action-info">
                                    <h5>Artist Dashboard</h5>
                                    <p>Music & Tracks</p>
                                </div>
                            </div>
                        </Link>
                        <Link to="/podcast-dashboard" className="quick-action-link">
                            <div className="quick-action-card">
                                <div className="action-icon">🎧</div>
                                <div className="action-info">
                                    <h5>Podcast Dashboard</h5>
                                    <p>Episodes & Shows</p>
                                </div>
                            </div>
                        </Link>
                        <Link to="/radio-dashboard" className="quick-action-link">
                            <div className="quick-action-card">
                                <div className="action-icon">📻</div>
                                <div className="action-info">
                                    <h5>Radio Dashboard</h5>
                                    <p>Stations & Playlists</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="profile-stats-card">
                    <h4>📊 Quick Stats</h4>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-number">{user.streams || 158}</span>
                            <span className="stat-label">Streams</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{user.podcasts || 12}</span>
                            <span className="stat-label">Podcasts</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{user.stations || 5}</span>
                            <span className="stat-label">Stations</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{user.followers || 623}</span>
                            <span className="stat-label">Followers</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <Link to="/favorites" className="view-all-btn">
                            ⭐ View Favorites
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Layout with Three Columns */}
            <div className="profile-layout">
                {/* Left Column - Social Links, Inner Circle & Favorite Profiles */}
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
                                        <label>{platform.icon} {platform.label}:</label>
                                        <input
                                            type="text"
                                            value={formData.socialLinks[platform.key] || ''}
                                            onChange={(e) => handleSocialLinkChange(platform.key, e.target.value)}
                                            placeholder={`Your ${platform.label} URL`}
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        toggleEditingState('socialLinks');
                                        handleSaveProfile();
                                    }}
                                    className="save-social-btn"
                                >
                                    💾 Save Social Links
                                </button>
                            </div>
                        ) : (
                            <div className="social-links-display">
                                {SOCIAL_PLATFORMS.map(platform => {
                                    const link = formData.socialLinks[platform.key];
                                    return link ? (
                                        <a key={platform.key} href={link} target="_blank" rel="noopener noreferrer" className="social-link">
                                            {platform.icon} {platform.label}
                                        </a>
                                    ) : null;
                                })}
                                {Object.keys(formData.socialLinks).filter(key => formData.socialLinks[key]).length === 0 && (
                                    <p className="no-social-links">No social links added yet</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Inner Circle Section */}
                    <InnerCircle
                        userId={effectiveUserId}
                        isOwnProfile={true}
                    />

                    {/* Favorite Profiles */}
                    <div className="favorites-section">
                        <div className="favorites-header">
                            <h4>⭐ Favorite Profiles</h4>
                            <button
                                onClick={toggleFavoritesView}
                                className="toggle-favorites-btn"
                            >
                                {ui.showAllFavorites ? "Show Less" : "Show All"}
                            </button>
                        </div>
                        <div className="favorite-profiles-list">
                            {(ui.showAllFavorites ? FAVORITE_PROFILES : FAVORITE_PROFILES.slice(0, 4)).map(profile => (
                                <div key={profile.id} className="favorite-profile-item">
                                    <img src={profile.avatar} alt={profile.name} className="favorite-avatar" />
                                    <div className="favorite-info">
                                        <h5>{profile.name}</h5>
                                        <p>{profile.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {!ui.showAllFavorites && (
                            <Link to="/favorites" className="view-all-btn">
                                👀 View Full Favorites Page
                            </Link>
                        )}
                    </div>
                </div>

                {/* Center Column - Posts Feed */}
                <div className="center-column">
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

                    {/* Create Post - ONLY SHOW ON POSTS TAB */}
                    {ui.activeTab === 'posts' && (
                        <div className="create-post-section">
                            <h4>📝 Create a Post</h4>
                            <textarea
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder="What's on your mind?"
                                rows={3}
                                className="post-textarea"
                            />
                            <div className="post-actions">
                                <button
                                    onClick={() => postImageInputRef.current.click()}
                                    className="add-image-btn"
                                >
                                    📷 Add Image
                                </button>
                                <button
                                    onClick={handleCreatePost}
                                    className="create-post-btn"
                                    disabled={!newPost.trim()}
                                >
                                    📤 Post
                                </button>
                            </div>
                            <input
                                ref={postImageInputRef}
                                type="file"
                                style={{ display: 'none' }}
                                onChange={handlePostImageChange}
                                accept="image/*"
                            />
                            {postImage && (
                                <div className="post-image-preview">
                                    <img src={postImage} alt="Post preview" />
                                    <button onClick={() => setPostImage(null)}>❌ Remove</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Content */}
                    {ui.activeTab === 'posts' && (
                        <div className="posts-feed">
                            <h4>📱 Recent Posts</h4>
                            {posts.map(post => (
                                <div key={post.id} className="post-item">
                                    <div className="post-header">
                                        <img src={post.avatar} alt={post.username} className="post-avatar" />
                                        <div className="post-meta">
                                            <h5>{post.username}</h5>
                                            <span className="post-timestamp">{post.timestamp}</span>
                                        </div>
                                    </div>
                                    <div className="post-content">
                                        <p>{post.content}</p>
                                        {post.image && (
                                            <img src={post.image} alt="Post content" className="post-image" />
                                        )}
                                    </div>
                                    <div className="post-actions">
                                        <button
                                            onClick={() => handleLikePost(post.id)}
                                            className="post-action-btn"
                                        >
                                            ❤️ {post.likes}
                                        </button>
                                        <button className="post-action-btn">
                                            💬 {post.comments}
                                        </button>
                                        <button className="post-action-btn">
                                            📤 Share
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {posts.length === 0 && (
                                <div className="empty-state">
                                    <p>No posts yet. Create your first post above! 📝</p>
                                </div>
                            )}
                        </div>
                    )}

                    {ui.activeTab === 'videos' && (
                        <div className="videos-section">
                            <h4>🎥 Videos</h4>
                            <div className="videos-grid">
                                {media.videos.length > 0 ? (
                                    media.videos.map((video, index) => (
                                        <div key={index} className="video-card">
                                            <video
                                                src={video.url}
                                                className="video-player"
                                                controls
                                                poster={video.thumbnail}
                                            />
                                            <div className="video-info">
                                                <h5>{video.title || `Video ${index + 1}`}</h5>
                                                <div className="video-stats">
                                                    <span>👁️ {video.views || 0} views</span>
                                                    <span>📅 {video.uploadDate || 'Recently'}</span>
                                                </div>
                                                <div className="video-actions">
                                                    <button className="video-action-btn">✏️ Edit</button>
                                                    <button className="video-action-btn danger">🗑️ Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No videos uploaded yet. Start sharing your content! 🎬</p>
                                        <UploadVideo />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {ui.activeTab === 'images' && (
                        <div className="images-section">
                            <h4>🖼️ Images</h4>
                            <div className="images-grid">
                                {media.images.length > 0 ? (
                                    media.images.map((image, index) => (
                                        <div key={index} className="image-card">
                                            <img
                                                src={image.url}
                                                alt={image.title || `Image ${index + 1}`}
                                                className="gallery-image"
                                            />
                                            <div className="image-overlay">
                                                <h5>{image.title || `Image ${index + 1}`}</h5>
                                                <div className="image-actions">
                                                    <button className="image-action-btn">✏️ Edit</button>
                                                    <button className="image-action-btn danger">🗑️ Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No images uploaded yet. Share your visual content! 📸</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {ui.activeTab === 'uploads' && (
                        <div className="uploads-section">
                            <h4>📤 Upload Content</h4>
                            <div className="upload-options">
                                <div className="upload-card">
                                    <h3>🎥 Upload Video</h3>
                                    <p>Share your video content with the world</p>
                                    <UploadVideo />
                                </div>
                                <div className="upload-card">
                                    <h3>🖼️ Upload Images</h3>
                                    <p>Add photos to your gallery</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="upload-input"
                                        id="image-upload"
                                        onChange={(e) => {
                                            // Handle image upload
                                            const files = Array.from(e.target.files);
                                            console.log('Uploading images:', files);
                                        }}
                                    />
                                    <label htmlFor="image-upload" className="upload-label">
                                        📷 Choose Images
                                    </label>
                                </div>
                                <div className="upload-card">
                                    <h3>🎵 Upload Audio</h3>
                                    <p>Share your music and audio content</p>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        className="upload-input"
                                        id="audio-upload"
                                        onChange={(e) => {
                                            // Handle audio upload
                                            console.log('Uploading audio:', e.target.files[0]);
                                        }}
                                    />
                                    <label htmlFor="audio-upload" className="upload-label">
                                        🎵 Choose Audio
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Business Info & Activity */}
                <div className="right-column">
                    {/* Business Information */}
                    <div className="business-info-section">
                        <div className="business-info-header">
                            <h4>💼 Business Information</h4>
                            <button
                                className="edit-business-btn"
                                onClick={() => toggleEditingState('business')}
                            >
                                {editingStates.business ? '✅ Done' : '✏️ Edit'}
                            </button>
                        </div>

                        {editingStates.business ? (
                            <div className="business-edit-form">
                                <div className="business-input-group">
                                    <label>Business Name:</label>
                                    <input
                                        type="text"
                                        value={formData.businessName}
                                        onChange={(e) => updateFormData('businessName', e.target.value)}
                                        placeholder="Your business name"
                                    />
                                </div>
                                <div className="business-input-group">
                                    <label>Business Type:</label>
                                    <select
                                        value={formData.businessType}
                                        onChange={(e) => updateFormData('businessType', e.target.value)}
                                    >
                                        <option value="">Select type</option>
                                        <option value="music_producer">Music Producer</option>
                                        <option value="artist">Artist</option>
                                        <option value="podcaster">Podcaster</option>
                                        <option value="content_creator">Content Creator</option>
                                        <option value="streamer">Live Streamer</option>
                                        <option value="dj">DJ</option>
                                        <option value="label">Record Label</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="business-input-group">
                                    <label>Website:</label>
                                    <input
                                        type="url"
                                        value={formData.businessWebsite}
                                        onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>
                                <div className="business-input-group">
                                    <label>Location:</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => updateFormData('location', e.target.value)}
                                        placeholder="Your location"
                                    />
                                </div>
                                <div className="business-edit-actions">
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
                                        style={{ background: '#dc3545' }}
                                    >
                                        ❌ Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="business-info-display">
                                <p><strong>Business:</strong> {formData.businessName || 'Not specified'}</p>
                                <p><strong>Type:</strong> {formData.businessType ? formData.businessType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not specified'}</p>
                                <p><strong>Location:</strong> {formData.location || 'Not specified'}</p>
                                <p><strong>Website:</strong>
                                    {formData.businessWebsite ? (
                                        <a href={formData.businessWebsite} target="_blank" rel="noopener noreferrer">
                                            {formData.businessWebsite}
                                        </a>
                                    ) : (
                                        ' Not specified'
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Upload Video Section - SIMPLIFIED */}
                    <div className="upload-section">
                        <h4>🎥 Quick Upload</h4>
                        <div className="upload-widget">
                            <UploadVideo />
                        </div>
                    </div>

                    {/* Storefront Section */}
                    <div className="storefront-section">
                        <h4>🛍️ Storefront</h4>
                        <div className="storefront-content">
                            {formData.storefrontLink ? (
                                <div className="storefront-active">
                                    <p>Your store is live!</p>
                                    <a href={formData.storefrontLink} target="_blank" rel="noopener noreferrer" className="storefront-link">
                                        🔗 Visit Store
                                    </a>
                                </div>
                            ) : (
                                <div className="storefront-setup">
                                    <p>Set up your online store</p>
                                    <input
                                        type="url"
                                        placeholder="https://your-store.com"
                                        value={formData.storefrontLink}
                                        onChange={(e) => updateFormData('storefrontLink', e.target.value)}
                                        className="storefront-input"
                                    />
                                    <button
                                        onClick={handleSaveProfile}
                                        className="setup-store-btn"
                                    >
                                        💾 Save Store Link
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="recent-activity">
                        <h4>📈 Recent Activity</h4>
                        <div className="activity-list">
                            <div className="activity-item">
                                <span className="activity-icon">🎵</span>
                                <div className="activity-text">
                                    <p>Uploaded new track</p>
                                    <span className="activity-time">2 hours ago</span>
                                </div>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">👥</span>
                                <div className="activity-text">
                                    <p>Gained 5 new followers</p>
                                    <span className="activity-time">4 hours ago</span>
                                </div>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">📻</span>
                                <div className="activity-text">
                                    <p>Created new radio station</p>
                                    <span className="activity-time">1 day ago</span>
                                </div>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">🎙️</span>
                                <div className="activity-text">
                                    <p>Published podcast episode</p>
                                    <span className="activity-time">2 days ago</span>
                                </div>
                            </div>
                            <div className="activity-item">
                                <span className="activity-icon">⭐</span>
                                <div className="activity-text">
                                    <p>Added to inner circle</p>
                                    <span className="activity-time">3 days ago</span>
                                </div>
                            </div>
                        </div>
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
                    onClick={handleToggleChat}
                >
                    💬 Messages {ui.unreadCount > 0 && (
                        <span className="unread-badge">{ui.unreadCount}</span>
                    )}
                </button>

                <button
                    className="action-btn"
                    onClick={() => setUi(prev => ({ ...prev, showShareModal: true }))}
                >
                    📤 Share Profile
                </button>

                <button
                    className="action-btn"
                    onClick={handleToggleInbox}
                >
                    📥 Inbox
                </button>
            </div>

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