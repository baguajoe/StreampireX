import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import VideoChatPopup from "../component/VideoChatPopup";
import InboxDrawer from "../component/InboxDrawer";
import SocialMediaManager from "../component/SocialMediaManager";
import VideoChannelManager from "../component/VideoChannelManager";
import "../../styles/ProfilePage.css";
import "../../styles/WebRTC.css";
import "../../styles/StreamClips.css";

// Image imports
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
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

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
    { key: 'twitch', icon: '🎮', label: 'Twitch' },
    { key: 'snapchat', icon: '👻', label: 'Snapchat' },
    { key: 'pinterest', icon: '📌', label: 'Pinterest' }
];

const FAVORITE_PROFILES = [
    { id: 1, name: "@zenmaster", description: "Grateful for the silence", avatar: zenmaster },
    { id: 2, name: "@fitjay", description: "Fitness motivator", avatar: fitjay },
    { id: 3, name: "@lofilounge", description: "Chill beats", avatar: lofiLounge },
    { id: 4, name: "@jazzhub", description: "Smooth jazz vibes", avatar: jazzHub },
    { id: 5, name: "@energyreset", description: "Energy healing", avatar: energyReset },
    { id: 6, name: "@chicast", description: "Chicago vibes", avatar: chiCast }
];

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

// Enhanced InnerCircle component with Top 10 Users
const InnerCircle = ({ userId, isOwnProfile }) => {
    const [innerCircleMembers, setInnerCircleMembers] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('circle');

    const fetchInnerCircle = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/inner-circle/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setInnerCircleMembers(data.members || []);
            }
        } catch (error) {
            console.error('Error fetching inner circle:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchTopUsers = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/users/top-10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setTopUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error fetching top users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAddToCircle = useCallback(async (targetUserId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/inner-circle/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ target_user_id: targetUserId })
            });
            
            if (response.ok) {
                fetchInnerCircle();
                alert('✅ Added to Inner Circle!');
            }
        } catch (error) {
            console.error('Error adding to inner circle:', error);
        }
    }, [fetchInnerCircle]);

    useEffect(() => {
        fetchInnerCircle();
        fetchTopUsers();
    }, [fetchInnerCircle, fetchTopUsers]);

    return (
        <div className="inner-circle-section">
            <div className="inner-circle-header">
                <h4>👥 Inner Circle & Top Users</h4>
                <div className="inner-circle-tabs">
                    <button
                        className={`circle-tab ${activeTab === 'circle' ? 'active' : ''}`}
                        onClick={() => setActiveTab('circle')}
                    >
                        🔒 My Circle ({innerCircleMembers.length})
                    </button>
                    <button
                        className={`circle-tab ${activeTab === 'top10' ? 'active' : ''}`}
                        onClick={() => setActiveTab('top10')}
                    >
                        🏆 Top 10 Users
                    </button>
                </div>
            </div>

            <div className="inner-circle-content">
                {loading ? (
                    <div className="circle-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading...</p>
                    </div>
                ) : activeTab === 'circle' ? (
                    <div className="circle-members">
                        {innerCircleMembers.length > 0 ? (
                            innerCircleMembers.map(member => (
                                <div key={member.id} className="circle-member-card">
                                    <img 
                                        src={member.profile_picture || member.avatar_url || lady1} 
                                        alt={member.username}
                                        className="member-avatar"
                                    />
                                    <div className="member-info">
                                        <h6>{member.display_name || member.username}</h6>
                                        <p className="member-bio">{member.bio || "StreampireX Creator"}</p>
                                        <div className="member-stats">
                                            <span>🎵 {member.track_count || 0}</span>
                                            <span>👥 {member.follower_count || 0}</span>
                                        </div>
                                    </div>
                                    <Link to={`/profile/${member.id}`} className="view-profile-btn">
                                        👁️ View
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="empty-circle">
                                <p>Your inner circle is empty</p>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => setActiveTab('top10')}
                                        className="discover-users-btn"
                                    >
                                        🔍 Discover Top Users
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="top-users-list">
                        {topUsers.map((user, index) => (
                            <div key={user.id} className="top-user-card">
                                <div className="user-rank">
                                    #{index + 1}
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                </div>
                                <img 
                                    src={user.profile_picture || user.avatar_url || lady1} 
                                    alt={user.username}
                                    className="top-user-avatar"
                                />
                                <div className="top-user-info">
                                    <h6>{user.display_name || user.username}</h6>
                                    <p className="user-achievement">{user.primary_achievement || "Top Creator"}</p>
                                    <div className="user-metrics">
                                        <span>🎵 {user.total_streams || 0}</span>
                                        <span>❤️ {user.total_likes || 0}</span>
                                        <span>👥 {user.follower_count || 0}</span>
                                    </div>
                                </div>
                                <div className="top-user-actions">
                                    <Link to={`/profile/${user.id}`} className="view-profile-btn small">
                                        👁️
                                    </Link>
                                    {isOwnProfile && (
                                        <button 
                                            onClick={() => handleAddToCircle(user.id)}
                                            className="add-to-circle-btn small"
                                            disabled={innerCircleMembers.some(m => m.id === user.id)}
                                        >
                                            {innerCircleMembers.some(m => m.id === user.id) ? '✅' : '➕'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// StreamClip component for displaying clips
const StreamClipCard = ({ clip, onCreateClip, onView, currentUserId }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likes, setLikes] = useState(clip.likes || 0);
    const [playing, setPlaying] = useState(false);
    const videoRef = useRef(null);

    const handleLike = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/clips/${clip.id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                setIsLiked(!isLiked);
                setLikes(prev => isLiked ? prev - 1 : prev + 1);
            }
        } catch (error) {
            console.error('Error liking clip:', error);
        }
    }, [clip.id, isLiked]);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (playing) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setPlaying(!playing);
        }
    }, [playing]);

    const formatDuration = (duration) => {
        if (!duration) return '0:00';
        const totalSeconds = parseInt(duration);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatCount = (count) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    return (
        <div className="streamclip-card">
            <div className="clip-video-container">
                <video
                    ref={videoRef}
                    src={clip.video_url}
                    className="clip-video"
                    loop
                    muted
                    playsInline
                    poster={clip.thumbnail_url}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                />
                
                <div className="clip-overlay">
                    <button 
                        className="clip-play-btn"
                        onClick={togglePlay}
                    >
                        {playing ? '⏸️' : '▶️'}
                    </button>
                    
                    <div className="clip-duration">
                        {formatDuration(clip.duration)}
                    </div>
                </div>

                <div className="clip-actions">
                    <button 
                        className={`clip-action-btn like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={handleLike}
                    >
                        {isLiked ? '❤️' : '🤍'}
                        <span>{formatCount(likes)}</span>
                    </button>
                    
                    <button className="clip-action-btn share-btn">
                        📤
                        <span>{formatCount(clip.shares || 0)}</span>
                    </button>
                    
                    <button className="clip-action-btn comment-btn">
                        💬
                        <span>{formatCount(clip.comments || 0)}</span>
                    </button>
                    
                    {clip.source_video_id && (
                        <button 
                            className="clip-action-btn source-btn"
                            onClick={() => onView && onView(clip.source_video_id)}
                            title="View original video"
                        >
                            🎬
                        </button>
                    )}
                </div>
            </div>

            <div className="clip-info">
                <div className="clip-header">
                    <img 
                        src={clip.creator?.profile_picture || lady1} 
                        alt={clip.creator?.username}
                        className="clip-creator-avatar"
                    />
                    <div className="clip-creator-info">
                        <h6>@{clip.creator?.username || 'Unknown'}</h6>
                        <p className="clip-timestamp">{clip.created_at || 'Recently'}</p>
                    </div>
                    {clip.creator?.id === currentUserId && (
                        <button className="clip-menu-btn">⋮</button>
                    )}
                </div>
                
                <h5 className="clip-title">{clip.title}</h5>
                
                {clip.description && (
                    <p className="clip-description">{clip.description}</p>
                )}
                
                {clip.tags && clip.tags.length > 0 && (
                    <div className="clip-tags">
                        {clip.tags.map((tag, index) => (
                            <span key={index} className="clip-tag">#{tag}</span>
                        ))}
                    </div>
                )}

                <div className="clip-stats">
                    <span>👁️ {formatCount(clip.views || 0)} views</span>
                    <span>🔄 {formatCount(clip.shares || 0)} shares</span>
                    {clip.source_video_id && (
                        <span>📹 From original video</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Cloudinary Upload Helper
const uploadToCloudinary = async (file, resourceType = 'auto') => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${process.env.BACKEND_URL}/api/upload/cloudinary`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};

const createSocket = (token) => {
    return io(SOCKET_URL, {
        transports: ["websocket"],
        auth: { token },
        withCredentials: true,
    });
};

const ProfilePage = () => {
    // Authentication state
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

    // UI state - ENHANCED WITH CLIPS AND VIDEO CONTENT FILTERING
    const [ui, setUi] = useState({
        currentMood: 'chill',
        customMoodLabel: null,
        customMoodEmoji: null,
        useAvatar: true,
        isChatOpen: false,
        isVideoChatOpen: false,
        showShareModal: false,
        activeTab: 'posts',
        videoContentTab: 'all', // 'all', 'videos', 'clips'
        isInboxOpen: false,
        unreadCount: 3,
        showSuccessMessage: false,
        showAllFavorites: false,
        showSocialManager: false,
        showVideoManager: false,
        showClipCreator: false,
        selectedVideoForClip: null
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
    const [uploadingPost, setUploadingPost] = useState(false);

    // Social Media State
    const [socialAccounts, setSocialAccounts] = useState([]);
    const [socialPosts, setSocialPosts] = useState([]);
    const [socialAnalytics, setSocialAnalytics] = useState({
        total_likes: 0,
        total_shares: 0,
        total_reach: 0,
        connected_platforms: []
    });

    // Video Channel State
    const [videoChannel, setVideoChannel] = useState(null);
    const [channelVideos, setChannelVideos] = useState([]);
    const [uploadingVideo, setUploadingVideo] = useState(false);

    // StreamClips state
    const [clipCreationData, setClipCreationData] = useState({
        sourceVideoId: null,
        startTime: 0,
        endTime: 15,
        title: '',
        description: '',
        tags: []
    });

    // Refs
    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);
    const postImageInputRef = useRef(null);
    const clipUploadInputRef = useRef(null);
    const socket = useRef(null);

    // Utility functions
    const getFilteredVideos = useCallback(() => {
        if (ui.videoContentTab === 'videos') {
            return channelVideos.filter(v => v.content_type !== 'clip');
        } else if (ui.videoContentTab === 'clips') {
            return channelVideos.filter(v => v.content_type === 'clip');
        }
        return channelVideos;
    }, [channelVideos, ui.videoContentTab]);

    const formatDuration = useCallback((duration) => {
        if (!duration) return '0:00';
        const totalSeconds = parseInt(duration);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    const formatCount = useCallback((count) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }, []);

    const getSourceVideoTitle = useCallback((sourceVideoId) => {
        const sourceVideo = channelVideos.find(v => v.id === sourceVideoId);
        return sourceVideo ? sourceVideo.title : 'Original Video';
    }, [channelVideos]);

    // Initialize auth state
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId');
        const storedUsername = localStorage.getItem('username');
        
        setAuthState({
            token: storedToken || 'demo-token',
            userId: storedUserId || '1',
            username: storedUsername || 'Demo User'
        });
    }, []);

    // Socket initialization
    const initializeSocket = useCallback(() => {
        if (!socket.current && authState.token) {
            socket.current = createSocket(authState.token);
        }
        return socket.current;
    }, [authState.token]);

    // Fetch functions
    const fetchSocialAccounts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/social/accounts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSocialAccounts(data.connected_accounts || []);
            }
        } catch (error) {
            console.error('Error fetching social accounts:', error);
        }
    }, []);

    const fetchSocialAnalytics = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/social/analytics?days=30`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setSocialAnalytics(data.total_metrics || {});
            }
        } catch (error) {
            console.error('Error fetching social analytics:', error);
        }
    }, []);

    const fetchVideoChannel = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            let response = await fetch(`${process.env.BACKEND_URL}/api/video/channel/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 404) {
                const createResponse = await fetch(`${process.env.BACKEND_URL}/api/video/channel/create`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        channel_name: `${user.username || 'User'}'s Channel`,
                        description: 'My video channel on StreampireX'
                    })
                });
                
                if (createResponse.ok) {
                    const channelData = await createResponse.json();
                    setVideoChannel(channelData.channel);
                }
            } else if (response.ok) {
                const channelData = await response.json();
                setVideoChannel(channelData);
                
                const videosResponse = await fetch(`${process.env.BACKEND_URL}/api/video/channel/${channelData.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (videosResponse.ok) {
                    const videosData = await videosResponse.json();
                    setChannelVideos(videosData.videos || []);
                }
            }
        } catch (error) {
            console.error('Error fetching video channel:', error);
        }
    }, [user.username]);

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!authState.token) {
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

            const response = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authState.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch profile: ${response.status}`);
            }

            const userData = await response.json();
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

            if (userData.current_mood) {
                setUi(prev => ({
                    ...prev,
                    currentMood: userData.current_mood,
                    customMoodLabel: userData.custom_mood_label,
                    customMoodEmoji: userData.custom_mood_emoji
                }));
            }

            setMedia(prev => ({
                ...prev,
                profilePicture: userData.profile_picture,
                coverPhoto: userData.cover_photo
            }));

        } catch (err) {
            setError(`Failed to load profile: ${err.message}`);
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

    // Form handlers
    const updateFormData = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const toggleEditingState = useCallback((field) => {
        setEditingStates(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, []);

    const handleMoodChange = useCallback((moodId, customLabel = null, customEmoji = null) => {
        setUi(prev => ({ 
            ...prev, 
            currentMood: moodId,
            customMoodLabel: customLabel,
            customMoodEmoji: customEmoji
        }));
    }, []);

    const handleCreateCustomMood = useCallback(() => {
        if (customMood.trim()) {
            const emojiRegex = /^(\p{Emoji})\s*(.+)/u;
            const match = customMood.match(emojiRegex);
            
            const emoji = match ? match[1] : '🎭';
            const label = match ? match[2].trim() : customMood.trim();
            
            handleMoodChange('custom', label, emoji);
            setCustomMood('');
            setShowCustomMoodInput(false);
        }
    }, [customMood, handleMoodChange]);

    const getCurrentMoodDisplay = useCallback(() => {
        if (ui.currentMood === 'custom') {
            return `${ui.customMoodEmoji || '🎭'} ${ui.customMoodLabel || 'Custom'}`;
        }
        const mood = MOOD_OPTIONS.find(m => m.id === ui.currentMood);
        return mood ? `${mood.emoji} ${mood.label}` : '😌 Chill';
    }, [ui.currentMood, ui.customMoodLabel, ui.customMoodEmoji]);

    const handleTabChange = useCallback((tab) => {
        setUi(prev => ({ ...prev, activeTab: tab }));
    }, []);

    // Media upload handlers
    const handleProfilePicChange = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setLoading(true);
                const cloudinaryUrl = await uploadToCloudinary(file, 'image');
                setMedia(prev => ({ ...prev, profilePicture: cloudinaryUrl }));
                
                const token = localStorage.getItem('token');
                await fetch(`${process.env.BACKEND_URL}/api/user/profile-picture`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ profile_picture: cloudinaryUrl })
                });
                
                setUser(prev => ({ ...prev, profile_picture: cloudinaryUrl }));
            } catch (error) {
                console.error('Profile picture upload error:', error);
                setError('Failed to upload profile picture');
            } finally {
                setLoading(false);
            }
        }
    }, []);

    const handleCoverPhotoChange = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setLoading(true);
                const cloudinaryUrl = await uploadToCloudinary(file, 'image');
                setMedia(prev => ({ ...prev, coverPhoto: cloudinaryUrl }));
                
                const token = localStorage.getItem('token');
                await fetch(`${process.env.BACKEND_URL}/api/user/cover-photo`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ cover_photo: cloudinaryUrl })
                });
                
                setUser(prev => ({ ...prev, cover_photo: cloudinaryUrl }));
            } catch (error) {
                console.error('Cover photo upload error:', error);
                setError('Failed to upload cover photo');
            } finally {
                setLoading(false);
            }
        }
    }, []);

    const handlePostImageChange = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setUploadingPost(true);
                const cloudinaryUrl = await uploadToCloudinary(file, 'image');
                setPostImage(cloudinaryUrl);
            } catch (error) {
                console.error('Post image upload error:', error);
                setError('Failed to upload image');
            } finally {
                setUploadingPost(false);
            }
        }
    }, []);

    // Profile save handler
    const handleSaveProfile = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!authState.token) {
                throw new Error("Please log in to save your profile");
            }

            const profileData = {
                bio: formData.bio,
                display_name: formData.displayName,
                social_links: formData.socialLinks,
                location: formData.location,
                website: formData.businessWebsite,
                business_name: formData.businessName,
                business_type: formData.businessType,
                business_website: formData.businessWebsite,
                current_mood: ui.currentMood,
                custom_mood_label: ui.customMoodLabel,
                custom_mood_emoji: ui.customMoodEmoji
            };

            const response = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authState.token}`,
                },
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend error: ${response.status} - ${errorText}`);
            }

            const responseData = await response.json();

            if (responseData.user) {
                setUser(responseData.user);
            } else {
                setUser(responseData);
            }

            setUi(prev => ({ ...prev, showSuccessMessage: true }));
            setTimeout(() => {
                setUi(prev => ({ ...prev, showSuccessMessage: false }));
            }, 3000);

        } catch (err) {
            setError(`Failed to save profile: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [formData, authState.token, ui.currentMood, ui.customMoodLabel, ui.customMoodEmoji]);

    // Social and communication handlers
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

    const handleToggleInbox = useCallback(() => {
        setUi(prev => ({ ...prev, isInboxOpen: !prev.isInboxOpen }));
    }, []);

    const handleToggleChat = useCallback(() => {
        setUi(prev => ({ ...prev, isChatOpen: !prev.isChatOpen }));
    }, []);

    const handleToggleVideoChat = useCallback(() => {
        setUi(prev => ({ ...prev, isVideoChatOpen: !prev.isVideoChatOpen }));
    }, []);

    const handleSocialLinkChange = useCallback((platform, value) => {
        setFormData(prev => ({
            ...prev,
            socialLinks: {
                ...prev.socialLinks,
                [platform]: value
            }
        }));
    }, []);

    // Video and clip handlers
    const handleVideoUpload = useCallback(async (file, metadata) => {
        try {
            setUploadingVideo(true);
            
            const isShortVideo = metadata.duration && parseInt(metadata.duration) <= 60;
            const videoUrl = await uploadToCloudinary(file, 'video');
            
            let thumbnailUrl = null;
            if (metadata.thumbnail) {
                thumbnailUrl = await uploadToCloudinary(metadata.thumbnail, 'image');
            }
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/video/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: metadata.title,
                    description: metadata.description,
                    video_url: videoUrl,
                    thumbnail_url: thumbnailUrl,
                    tags: metadata.tags || [],
                    category: metadata.category,
                    content_type: isShortVideo ? 'clip' : 'video',
                    duration: metadata.duration
                })
            });
            
            if (response.ok) {
                const videoData = await response.json();
                setChannelVideos(prev => [videoData.video, ...prev]);
                setUi(prev => ({ ...prev, showSuccessMessage: true }));
                setTimeout(() => {
                    setUi(prev => ({ ...prev, showSuccessMessage: false }));
                }, 3000);
            }
            
        } catch (error) {
            console.error('Video upload error:', error);
            setError('Failed to upload video');
        } finally {
            setUploadingVideo(false);
        }
    }, []);

    const handleCreateClipFromVideo = useCallback((video) => {
        setClipCreationData({
            sourceVideoId: video.id,
            startTime: 0,
            endTime: Math.min(60, parseInt(video.duration) || 15),
            title: `Clip from ${video.title}`,
            description: '',
            tags: video.tags || []
        });
        setUi(prev => ({ 
            ...prev, 
            showClipCreator: true, 
            selectedVideoForClip: video 
        }));
    }, []);

    const handleCreateStreamClip = useCallback(async () => {
        try {
            setUploadingVideo(true);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/clips/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source_video_id: clipCreationData.sourceVideoId,
                    start_time: clipCreationData.startTime,
                    end_time: clipCreationData.endTime,
                    title: clipCreationData.title,
                    description: clipCreationData.description,
                    tags: clipCreationData.tags,
                    content_type: 'clip'
                })
            });
            
            if (response.ok) {
                const clipData = await response.json();
                setChannelVideos(prev => [clipData.clip, ...prev]);
                setUi(prev => ({ 
                    ...prev, 
                    showClipCreator: false,
                    selectedVideoForClip: null,
                    showSuccessMessage: true 
                }));
                setClipCreationData({
                    sourceVideoId: null,
                    startTime: 0,
                    endTime: 15,
                    title: '',
                    description: '',
                    tags: []
                });
                setTimeout(() => {
                    setUi(prev => ({ ...prev, showSuccessMessage: false }));
                }, 3000);
            } else {
                throw new Error('Failed to create clip');
            }
            
        } catch (error) {
            console.error('Clip creation error:', error);
            setError('Failed to create StreamClip');
        } finally {
            setUploadingVideo(false);
        }
    }, [clipCreationData]);

    const handleClipUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setUploadingVideo(true);
                
                // Validate file is video and under 60 seconds
                const video = document.createElement('video');
                video.preload = 'metadata';
                
                video.onloadedmetadata = async () => {
                    const duration = video.duration;
                    
                    if (duration > 60) {
                        alert('StreamClips must be under 60 seconds. Please trim your video or create a clip from a longer video.');
                        setUploadingVideo(false);
                        return;
                    }
                    
                    try {
                        const videoUrl = await uploadToCloudinary(file, 'video');
                        
                        // Create thumbnail from video
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0);
                        
                        canvas.toBlob(async (blob) => {
                            const thumbnailUrl = await uploadToCloudinary(blob, 'image');
                            
                            const token = localStorage.getItem('token');
                            const response = await fetch(`${process.env.BACKEND_URL}/api/clips/upload`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    title: clipCreationData.title || 'New StreamClip',
                                    description: clipCreationData.description,
                                    video_url: videoUrl,
                                    thumbnail_url: thumbnailUrl,
                                    tags: clipCreationData.tags,
                                    duration: Math.round(duration),
                                    content_type: 'clip'
                                })
                            });
                            
                            if (response.ok) {
                                const clipData = await response.json();
                                setChannelVideos(prev => [clipData.clip, ...prev]);
                                setUi(prev => ({ 
                                    ...prev, 
                                    showClipCreator: false,
                                    showSuccessMessage: true 
                                }));
                                setClipCreationData({
                                    sourceVideoId: null,
                                    startTime: 0,
                                    endTime: 15,
                                    title: '',
                                    description: '',
                                    tags: []
                                });
                                setTimeout(() => {
                                    setUi(prev => ({ ...prev, showSuccessMessage: false }));
                                }, 3000);
                            }
                            
                            setUploadingVideo(false);
                        }, 'image/jpeg', 0.8);
                        
                    } catch (error) {
                        console.error('Clip upload error:', error);
                        setError('Failed to upload StreamClip');
                        setUploadingVideo(false);
                    }
                };
                
                video.src = URL.createObjectURL(file);
                
            } catch (error) {
                console.error('Clip upload error:', error);
                setError('Failed to upload StreamClip');
                setUploadingVideo(false);
            }
        }
    }, [clipCreationData]);

    // Post handlers
    const handleCreatePost = useCallback(async () => {
        if (!newPost.trim()) return;

        try {
            setUploadingPost(true);

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

            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/posts/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newPost,
                    image_url: postImage
                })
            });

            if (response.ok) {
                const savedPost = await response.json();
                setPosts(prev => [savedPost, ...prev]);
            } else {
                setPosts(prev => [newPostObj, ...prev]);
            }

            setNewPost('');
            setPostImage(null);

        } catch (error) {
            console.error('Error creating post:', error);
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
        } finally {
            setUploadingPost(false);
        }
    }, [newPost, postImage, media.profilePicture, user]);

    const handleLikePost = useCallback((postId) => {
        setPosts(prev => prev.map(post =>
            post.id === postId
                ? { ...post, likes: post.likes + 1 }
                : post
        ));
    }, []);

    const toggleFavoritesView = useCallback(() => {
        setUi(prev => ({ ...prev, showAllFavorites: !prev.showAllFavorites }));
    }, []);

    // Initialize profile on mount
    useEffect(() => {
        if (authState.token) {
            fetchProfile();
            initializeSocket();
            fetchSocialAccounts();
            fetchSocialAnalytics();
        }

        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [authState.token, fetchProfile, initializeSocket, fetchSocialAccounts, fetchSocialAnalytics]);

    useEffect(() => {
        if (user.id && authState.token) {
            fetchVideoChannel();
        }
    }, [user.id, authState.token, fetchVideoChannel]);

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

            {/* Cover Photo Section */}
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
                        disabled={loading}
                    >
                        {loading ? '⏳ Uploading...' : '📷 Upload Cover Photo'}
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

            {/* Chat Modal */}
            {ui.isChatOpen && (
                <ChatModal
                    recipientId={effectiveUserId}
                    recipientName={effectiveUserName}
                    currentUserId={authState.userId}
                    onClose={handleToggleChat}
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
                    onClose={handleToggleVideoChat}
                />
            )}

            {/* Inbox Drawer */}
            <InboxDrawer
                isOpen={ui.isInboxOpen}
                onClose={() => setUi(prev => ({ ...prev, isInboxOpen: false }))}
                unreadCount={ui.unreadCount}
            />

            {/* Social Media Manager Modal */}
            {ui.showSocialManager && (
                <SocialMediaManager
                    isOpen={ui.showSocialManager}
                    onClose={() => setUi(prev => ({ ...prev, showSocialManager: false }))}
                    socialAccounts={socialAccounts}
                    onAccountsUpdate={fetchSocialAccounts}
                />
            )}

            {/* StreamClip Creator Modal */}
            {ui.showClipCreator && (
                <div className="modal-backdrop" onClick={() => setUi(prev => ({ ...prev, showClipCreator: false }))}>
                    <div className="clip-creator-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✂️ Create StreamClip</h3>
                            <button 
                                onClick={() => setUi(prev => ({ ...prev, showClipCreator: false }))}
                                className="close-modal-btn"
                            >
                                ❌
                            </button>
                        </div>

                        <div className="clip-creator-content">
                            {ui.selectedVideoForClip ? (
                                <div className="clip-from-video-section">
                                    <h4>🎬 Creating clip from: {ui.selectedVideoForClip.title}</h4>
                                    
                                    <div className="video-preview-section">
                                        <video
                                            src={ui.selectedVideoForClip.video_url}
                                            className="source-video-preview"
                                            controls
                                            currentTime={clipCreationData.startTime}
                                        />
                                        <div className="clip-timeline">
                                            <div className="timeline-controls">
                                                <label>Start Time (seconds):</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={parseInt(ui.selectedVideoForClip.duration) || 60}
                                                    value={clipCreationData.startTime}
                                                    onChange={(e) => setClipCreationData(prev => ({
                                                        ...prev,
                                                        startTime: parseInt(e.target.value)
                                                    }))}
                                                />
                                                
                                                <label>End Time (seconds):</label>
                                                <input
                                                    type="number"
                                                    min={clipCreationData.startTime}
                                                    max={Math.min(clipCreationData.startTime + 60, parseInt(ui.selectedVideoForClip.duration) || 60)}
                                                    value={clipCreationData.endTime}
                                                    onChange={(e) => setClipCreationData(prev => ({
                                                        ...prev,
                                                        endTime: parseInt(e.target.value)
                                                    }))}
                                                />
                                                
                                                <div className="clip-duration-info">
                                                    Clip Duration: {clipCreationData.endTime - clipCreationData.startTime} seconds
                                                    {(clipCreationData.endTime - clipCreationData.startTime) > 60 && (
                                                        <span className="warning">⚠️ StreamClips should be under 60 seconds</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="upload-new-clip-section">
                                    <h4>📱 Upload New StreamClip</h4>
                                    <div className="upload-clip-dropzone">
                                        <p>Drag & drop a short video (under 60 seconds) or</p>
                                        <button 
                                            className="upload-clip-btn"
                                            onClick={() => clipUploadInputRef.current?.click()}
                                            disabled={uploadingVideo}
                                        >
                                            {uploadingVideo ? '⏳ Uploading...' : '📹 Choose Video File'}
                                        </button>
                                        <small>Recommended: Vertical videos (9:16 ratio) for best mobile experience</small>
                                        <input
                                            ref={clipUploadInputRef}
                                            type="file"
                                            style={{ display: 'none' }}
                                            onChange={handleClipUpload}
                                            accept="video/*"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="clip-metadata-section">
                                <div className="form-group">
                                    <label>📝 Clip Title:</label>
                                    <input
                                        type="text"
                                        value={clipCreationData.title}
                                        onChange={(e) => setClipCreationData(prev => ({
                                            ...prev,
                                            title: e.target.value
                                        }))}
                                        placeholder="Give your StreamClip a catchy title..."
                                        maxLength="100"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>📋 Description (Optional):</label>
                                    <textarea
                                        value={clipCreationData.description}
                                        onChange={(e) => setClipCreationData(prev => ({
                                            ...prev,
                                            description: e.target.value
                                        }))}
                                        placeholder="Describe your StreamClip..."
                                        maxLength="500"
                                        rows="3"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>🏷️ Tags:</label>
                                    <input
                                        type="text"
                                        value={clipCreationData.tags.join(', ')}
                                        onChange={(e) => setClipCreationData(prev => ({
                                            ...prev,
                                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                                        }))}
                                        placeholder="funny, viral, trending (comma separated)"
                                    />
                                </div>
                            </div>

                            <div className="clip-tips-section">
                                <h5>💡 StreamClip Tips:</h5>
                                <ul className="clip-tips-list">
                                    <li>⚡ Keep clips under 60 seconds for maximum engagement</li>
                                    <li>📱 Vertical videos (9:16) perform best on mobile</li>
                                    <li>🎯 Start with a hook in the first 3 seconds</li>
                                    <li>🔥 Use trending hashtags and catchy titles</li>
                                    <li>🎬 Best moments: funny reactions, highlights, tutorials</li>
                                </ul>
                            </div>

                            <div className="clip-creator-actions">
                                <button
                                    onClick={() => setUi(prev => ({ ...prev, showClipCreator: false }))}
                                    className="cancel-clip-btn"
                                    disabled={uploadingVideo}
                                >
                                    ❌ Cancel
                                </button>
                                {ui.selectedVideoForClip ? (
                                    <button
                                        onClick={handleCreateStreamClip}
                                        className="create-clip-btn"
                                        disabled={uploadingVideo || !clipCreationData.title.trim()}
                                    >
                                        {uploadingVideo ? '⏳ Creating...' : '✂️ Create StreamClip'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => clipUploadInputRef.current?.click()}
                                        className="create-clip-btn"
                                        disabled={uploadingVideo}
                                    >
                                        {uploadingVideo ? '⏳ Uploading...' : '📹 Upload StreamClip'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Channel Manager Modal */}
            {ui.showVideoManager && (
                <VideoChannelManager
                    isOpen={ui.showVideoManager}
                    onClose={() => setUi(prev => ({ ...prev, showVideoManager: false }))}
                    channel={videoChannel}
                    videos={channelVideos}
                    onVideoUpload={handleVideoUpload}
                    uploading={uploadingVideo}
                    supportsClips={true}
                />
            )}

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
                                    className="save-name-btn"
                                    disabled={loading}
                                >
                                    ✅ Save
                                </button>
                                <button
                                    onClick={() => {
                                        toggleEditingState('displayName');
                                        updateFormData('displayName', user.display_name || user.username || '');
                                    }}
                                    className="cancel-name-btn"
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="profile-quick-actions">
                    <button 
                        className="quick-action-btn primary"
                        onClick={handleToggleChat}
                        title="Start Chat"
                    >
                        💬 Chat
                    </button>
                    <button 
                        className="quick-action-btn"
                        onClick={handleToggleVideoChat}
                        title="Video Call"
                    >
                        📹 Video
                    </button>
                    <button 
                        className="quick-action-btn"
                        onClick={handleToggleInbox}
                        title="Inbox"
                    >
                        📨 Inbox {ui.unreadCount > 0 && <span className="badge">{ui.unreadCount}</span>}
                    </button>
                    <button 
                        className="quick-action-btn"
                        onClick={() => setUi(prev => ({ ...prev, showShareModal: true }))}
                        title="Share Profile"
                    >
                        📤 Share
                    </button>
                </div>
            </div>

            {/* Profile Stats Row */}
            <div className="profile-stats-row">
                <div className="stat-item">
                    <span className="stat-number">{formatCount(user.follower_count || 0)}</span>
                    <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{formatCount(user.following_count || 0)}</span>
                    <span className="stat-label">Following</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{formatCount(channelVideos.filter(v => v.content_type !== 'clip').length)}</span>
                    <span className="stat-label">Videos</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{formatCount(channelVideos.filter(v => v.content_type === 'clip').length)}</span>
                    <span className="stat-label">StreamClips</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{formatCount(user.total_likes || 0)}</span>
                    <span className="stat-label">Likes</span>
                </div>
            </div>

            {/* Mood Section */}
            <div className="mood-section">
                <div className="mood-header">
                    <h4>🎭 Current Mood</h4>
                    <div className="current-mood-display">
                        {getCurrentMoodDisplay()}
                    </div>
                </div>
                
                <div className="mood-selector">
                    {MOOD_OPTIONS.map((mood) => (
                        <button
                            key={mood.id}
                            className={`mood-btn ${ui.currentMood === mood.id ? 'active' : ''}`}
                            onClick={() => handleMoodChange(mood.id)}
                        >
                            <span className="mood-emoji">{mood.emoji}</span>
                            <span className="mood-label">{mood.label}</span>
                        </button>
                    ))}
                    
                    <button
                        className={`mood-btn custom ${ui.currentMood === 'custom' ? 'active' : ''}`}
                        onClick={() => setShowCustomMoodInput(true)}
                    >
                        <span className="mood-emoji">🎭</span>
                        <span className="mood-label">Custom</span>
                    </button>
                </div>

                {showCustomMoodInput && (
                    <div className="custom-mood-input">
                        <input
                            type="text"
                            value={customMood}
                            onChange={(e) => setCustomMood(e.target.value)}
                            placeholder="🎭 Enter custom mood (e.g., 🚀 Motivated)"
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomMood()}
                        />
                        <div className="custom-mood-actions">
                            <button onClick={handleCreateCustomMood} className="save-custom-mood">
                                ✅ Set Mood
                            </button>
                            <button 
                                onClick={() => {
                                    setShowCustomMoodInput(false);
                                    setCustomMood('');
                                }}
                                className="cancel-custom-mood"
                            >
                                ❌ Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bio Section */}
            <div className="bio-section">
                <h4>📝 Bio</h4>
                {!editingStates.bio ? (
                    <div className="bio-display">
                        <p className="bio-text">
                            {formData.bio || 'No bio yet. Click edit to add one!'}
                        </p>
                        <button
                            onClick={() => toggleEditingState('bio')}
                            className="edit-bio-btn"
                        >
                            ✏️ Edit Bio
                        </button>
                    </div>
                ) : (
                    <div className="bio-edit">
                        <textarea
                            value={formData.bio}
                            onChange={(e) => updateFormData('bio', e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="bio-input"
                            maxLength="500"
                        />
                        <div className="bio-actions">
                            <button
                                onClick={() => {
                                    toggleEditingState('bio');
                                    handleSaveProfile();
                                }}
                                className="save-bio-btn"
                                disabled={loading}
                            >
                                ✅ Save Bio
                            </button>
                            <button
                                onClick={() => {
                                    toggleEditingState('bio');
                                    updateFormData('bio', user.bio || '');
                                }}
                                className="cancel-bio-btn"
                            >
                                ❌ Cancel
                            </button>
                        </div>
                        <div className="char-count">
                            {formData.bio.length}/500 characters
                        </div>
                    </div>
                )}
            </div>

            {/* Social Links Section */}
            <div className="social-links-section">
                <div className="section-header">
                    <h4>🔗 Social Links</h4>
                    <div className="section-actions">
                        <button
                            onClick={() => setUi(prev => ({ ...prev, showSocialManager: true }))}
                            className="social-manager-btn"
                        >
                            ⚙️ Manage Accounts
                        </button>
                        <button
                            onClick={() => toggleEditingState('socialLinks')}
                            className="edit-social-btn"
                        >
                            {editingStates.socialLinks ? '❌ Cancel' : '✏️ Edit Links'}
                        </button>
                    </div>
                </div>

                {editingStates.socialLinks ? (
                    <div className="social-links-edit">
                        {SOCIAL_PLATFORMS.map((platform) => (
                            <div key={platform.key} className="social-input-group">
                                <label>
                                    <span className="platform-icon">{platform.icon}</span>
                                    {platform.label}:
                                </label>
                                <input
                                    type="url"
                                    value={formData.socialLinks[platform.key] || ''}
                                    onChange={(e) => handleSocialLinkChange(platform.key, e.target.value)}
                                    placeholder={`Your ${platform.label} profile URL`}
                                    className="social-input"
                                />
                            </div>
                        ))}
                        <div className="social-actions">
                            <button
                                onClick={() => {
                                    toggleEditingState('socialLinks');
                                    handleSaveProfile();
                                }}
                                className="save-social-btn"
                                disabled={loading}
                            >
                                ✅ Save Links
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="social-links-display">
                        {SOCIAL_PLATFORMS.filter(platform => formData.socialLinks[platform.key]).length > 0 ? (
                            <div className="social-links-grid">
                                {SOCIAL_PLATFORMS
                                    .filter(platform => formData.socialLinks[platform.key])
                                    .map((platform) => (
                                        <a
                                            key={platform.key}
                                            href={formData.socialLinks[platform.key]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="social-link"
                                        >
                                            <span className="platform-icon">{platform.icon}</span>
                                            <span className="platform-name">{platform.label}</span>
                                        </a>
                                    ))}
                            </div>
                        ) : (
                            <p className="no-social-links">
                                No social links added yet. Click "Edit Links" to add them!
                            </p>
                        )}
                    </div>
                )}

                {/* Connected Social Accounts Summary */}
                {socialAccounts.length > 0 && (
                    <div className="connected-accounts-summary">
                        <h5>📊 Connected Accounts Analytics</h5>
                        <div className="social-analytics-grid">
                            <div className="analytics-stat">
                                <span className="stat-icon">❤️</span>
                                <span className="stat-value">{formatCount(socialAnalytics.total_likes || 0)}</span>
                                <span className="stat-label">Total Likes</span>
                            </div>
                            <div className="analytics-stat">
                                <span className="stat-icon">🔄</span>
                                <span className="stat-value">{formatCount(socialAnalytics.total_shares || 0)}</span>
                                <span className="stat-label">Total Shares</span>
                            </div>
                            <div className="analytics-stat">
                                <span className="stat-icon">👁️</span>
                                <span className="stat-value">{formatCount(socialAnalytics.total_reach || 0)}</span>
                                <span className="stat-label">Total Reach</span>
                            </div>
                            <div className="analytics-stat">
                                <span className="stat-icon">🔗</span>
                                <span className="stat-value">{socialAccounts.length}</span>
                                <span className="stat-label">Connected</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Business Info Section */}
            <div className="business-section">
                <div className="section-header">
                    <h4>💼 Business Information</h4>
                    <button
                        onClick={() => toggleEditingState('business')}
                        className="edit-business-btn"
                    >
                        {editingStates.business ? '❌ Cancel' : '✏️ Edit Business Info'}
                    </button>
                </div>

                {editingStates.business ? (
                    <div className="business-edit">
                        <div className="business-input-group">
                            <label>🏢 Business Name:</label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={(e) => updateFormData('businessName', e.target.value)}
                                placeholder="Your business or brand name"
                                className="business-input"
                            />
                        </div>
                        
                        <div className="business-input-group">
                            <label>🏷️ Business Type:</label>
                            <select
                                value={formData.businessType}
                                onChange={(e) => updateFormData('businessType', e.target.value)}
                                className="business-select"
                            >
                                <option value="">Select business type</option>
                                <option value="creator">Content Creator</option>
                                <option value="musician">Musician/Artist</option>
                                <option value="entrepreneur">Entrepreneur</option>
                                <option value="freelancer">Freelancer</option>
                                <option value="small_business">Small Business</option>
                                <option value="startup">Startup</option>
                                <option value="nonprofit">Non-Profit</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        
                        <div className="business-input-group">
                            <label>🌐 Business Website:</label>
                            <input
                                type="url"
                                value={formData.businessWebsite}
                                onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                                placeholder="https://your-website.com"
                                className="business-input"
                            />
                        </div>
                        
                        <div className="business-input-group">
                            <label>📍 Location:</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => updateFormData('location', e.target.value)}
                                placeholder="City, State/Country"
                                className="business-input"
                            />
                        </div>
                        
                        <div className="business-actions">
                            <button
                                onClick={() => {
                                    toggleEditingState('business');
                                    handleSaveProfile();
                                }}
                                className="save-business-btn"
                                disabled={loading}
                            >
                                ✅ Save Business Info
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="business-display">
                        {formData.businessName || formData.businessType || formData.businessWebsite || formData.location ? (
                            <div className="business-info-grid">
                                {formData.businessName && (
                                    <div className="business-info-item">
                                        <span className="info-icon">🏢</span>
                                        <span className="info-label">Business:</span>
                                        <span className="info-value">{formData.businessName}</span>
                                    </div>
                                )}
                                {formData.businessType && (
                                    <div className="business-info-item">
                                        <span className="info-icon">🏷️</span>
                                        <span className="info-label">Type:</span>
                                        <span className="info-value">{formData.businessType.replace('_', ' ')}</span>
                                    </div>
                                )}
                                {formData.businessWebsite && (
                                    <div className="business-info-item">
                                        <span className="info-icon">🌐</span>
                                        <span className="info-label">Website:</span>
                                        <a 
                                            href={formData.businessWebsite} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="info-link"
                                        >
                                            {formData.businessWebsite}
                                        </a>
                                    </div>
                                )}
                                {formData.location && (
                                    <div className="business-info-item">
                                        <span className="info-icon">📍</span>
                                        <span className="info-label">Location:</span>
                                        <span className="info-value">{formData.location}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="no-business-info">
                                No business information added yet. Click "Edit Business Info" to add details!
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Favorites Section */}
            <div className="favorites-section">
                <div className="section-header">
                    <h4>⭐ Favorite Profiles</h4>
                    <button
                        onClick={toggleFavoritesView}
                        className="toggle-favorites-btn"
                    >
                        {ui.showAllFavorites ? 'Show Less' : 'Show All'}
                    </button>
                </div>
                
                <div className="favorites-grid">
                    {(ui.showAllFavorites ? FAVORITE_PROFILES : FAVORITE_PROFILES.slice(0, 3)).map((profile) => (
                        <div key={profile.id} className="favorite-profile-card">
                            <img
                                src={profile.avatar}
                                alt={profile.name}
                                className="favorite-avatar"
                            />
                            <div className="favorite-info">
                                <h6 className="favorite-name">{profile.name}</h6>
                                <p className="favorite-description">{profile.description}</p>
                            </div>
                            <Link to={`/profile/${profile.id}`} className="view-favorite-btn">
                                👁️
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inner Circle */}
            <InnerCircle userId={effectiveUserId} isOwnProfile={true} />

            {/* Content Tabs */}
            <div className="content-tabs-section">
                <div className="content-tabs">
                    <button
                        className={`content-tab ${ui.activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => handleTabChange('posts')}
                    >
                        📝 Posts ({posts.length})
                    </button>
                    <button
                        className={`content-tab ${ui.activeTab === 'videos' ? 'active' : ''}`}
                        onClick={() => handleTabChange('videos')}
                    >
                        🎬 Content ({channelVideos.length})
                    </button>
                    <button
                        className={`content-tab ${ui.activeTab === 'about' ? 'active' : ''}`}
                        onClick={() => handleTabChange('about')}
                    >
                        ℹ️ About
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {ui.activeTab === 'posts' && (
                        <div className="posts-tab-content">
                            {/* Create Post Section */}
                            <div className="create-post-section">
                                <div className="create-post-header">
                                    <img
                                        src={media.profilePicture || user.profile_picture || lady1}
                                        alt="Your avatar"
                                        className="post-avatar"
                                    />
                                    <textarea
                                        value={newPost}
                                        onChange={(e) => setNewPost(e.target.value)}
                                        placeholder="What's on your mind?"
                                        className="post-input"
                                        maxLength="1000"
                                    />
                                </div>
                                
                                {postImage && (
                                    <div className="post-image-preview">
                                        <img src={postImage} alt="Post preview" className="preview-image" />
                                        <button 
                                            onClick={() => setPostImage(null)}
                                            className="remove-image-btn"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                )}
                                
                                <div className="post-actions">
                                    <div className="post-options">
                                        <button
                                            onClick={() => postImageInputRef.current?.click()}
                                            className="add-image-btn"
                                            disabled={uploadingPost}
                                        >
                                            📷 Add Image
                                        </button>
                                        <input
                                            ref={postImageInputRef}
                                            type="file"
                                            style={{ display: 'none' }}
                                            onChange={handlePostImageChange}
                                            accept="image/*"
                                        />
                                        <span className="char-count">{newPost.length}/1000</span>
                                    </div>
                                    <button
                                        onClick={handleCreatePost}
                                        className="create-post-btn"
                                        disabled={!newPost.trim() || uploadingPost}
                                    >
                                        {uploadingPost ? '⏳ Posting...' : '📤 Post'}
                                    </button>
                                </div>
                            </div>

                            {/* Posts Feed */}
                            <div className="posts-feed">
                                {posts.map((post) => (
                                    <div key={post.id} className="post-card">
                                        <div className="post-header">
                                            <img
                                                src={post.avatar}
                                                alt={post.username}
                                                className="post-author-avatar"
                                            />
                                            <div className="post-author-info">
                                                <h6 className="post-author-name">{post.username}</h6>
                                                <p className="post-timestamp">{post.timestamp}</p>
                                            </div>
                                            <button className="post-menu-btn">⋮</button>
                                        </div>
                                        
                                        <div className="post-content">
                                            <p className="post-text">{post.content}</p>
                                            {post.image && (
                                                <img
                                                    src={post.image}
                                                    alt="Post content"
                                                    className="post-image"
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="post-engagement">
                                            <button
                                                onClick={() => handleLikePost(post.id)}
                                                className="engagement-btn"
                                            >
                                                ❤️ {post.likes}
                                            </button>
                                            <button className="engagement-btn">
                                                💬 {post.comments}
                                            </button>
                                            <button className="engagement-btn">
                                                📤 Share
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                {posts.length === 0 && (
                                    <div className="empty-posts">
                                        <p>No posts yet. Create your first post above!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {ui.activeTab === 'videos' && (
                        <div className="videos-tab-content">
                            {/* Video Channel Header */}
                            <div className="video-channel-header">
                                <div className="channel-info">
                                    <h5>🎬 {videoChannel?.channel_name || `${effectiveUserName}'s Channel`}</h5>
                                    <p className="channel-description">
                                        {videoChannel?.description || 'Welcome to my video channel!'}
                                    </p>
                                    <div className="channel-stats">
                                        <span>📹 {channelVideos.length} videos</span>
                                        <span>👥 {formatCount(videoChannel?.subscriber_count || 0)} subscribers</span>
                                        <span>👁️ {formatCount(videoChannel?.total_views || 0)} total views</span>
                                    </div>
                                </div>
                                <div className="channel-actions">
                                    <button
                                        onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                        className="manage-channel-btn"
                                    >
                                        ⚙️ Manage Channel
                                    </button>
                                    <button
                                        onClick={() => setUi(prev => ({ ...prev, showClipCreator: true }))}
                                        className="create-clip-btn"
                                    >
                                        ✂️ Create StreamClip
                                    </button>
                                </div>
                            </div>

                            {/* Video Content Filter */}
                            <div className="video-content-filter">
                                <div className="filter-tabs">
                                    <button
                                        className={`filter-tab ${ui.videoContentTab === 'all' ? 'active' : ''}`}
                                        onClick={() => setUi(prev => ({ ...prev, videoContentTab: 'all' }))}
                                    >
                                        🎬 All Content ({channelVideos.length})
                                    </button>
                                    <button
                                        className={`filter-tab ${ui.videoContentTab === 'videos' ? 'active' : ''}`}
                                        onClick={() => setUi(prev => ({ ...prev, videoContentTab: 'videos' }))}
                                    >
                                        📹 Videos ({channelVideos.filter(v => v.content_type !== 'clip').length})
                                    </button>
                                    <button
                                        className={`filter-tab ${ui.videoContentTab === 'clips' ? 'active' : ''}`}
                                        onClick={() => setUi(prev => ({ ...prev, videoContentTab: 'clips' }))}
                                    >
                                        ⚡ StreamClips ({channelVideos.filter(v => v.content_type === 'clip').length})
                                    </button>
                                </div>
                            </div>

                            {/* Video Content Grid */}
                            <div className={`video-content-grid ${ui.videoContentTab === 'clips' ? 'clips-layout' : 'videos-layout'}`}>
                                {getFilteredVideos().map((video) => (
                                    video.content_type === 'clip' ? (
                                        <StreamClipCard
                                            key={video.id}
                                            clip={video}
                                            currentUserId={effectiveUserId}
                                            onCreateClip={handleCreateClipFromVideo}
                                        />
                                    ) : (
                                        <div key={video.id} className="video-card">
                                            <div className="video-thumbnail-container">
                                                <img
                                                    src={video.thumbnail_url || campfire}
                                                    alt={video.title}
                                                    className="video-thumbnail"
                                                />
                                                <div className="video-overlay">
                                                    <button className="play-btn">▶️</button>
                                                    <div className="video-duration">
                                                        {formatDuration(video.duration)}
                                                    </div>
                                                </div>
                                                <div className="video-actions-overlay">
                                                    <button
                                                        onClick={() => handleCreateClipFromVideo(video)}
                                                        className="create-clip-overlay-btn"
                                                        title="Create StreamClip from this video"
                                                    >
                                                        ✂️
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="video-info">
                                                <h6 className="video-title">{video.title}</h6>
                                                <p className="video-stats">
                                                    👁️ {formatCount(video.views || 0)} views • 
                                                    📅 {video.created_at || 'Recently'}
                                                </p>
                                                {video.description && (
                                                    <p className="video-description">
                                                        {video.description.substring(0, 100)}
                                                        {video.description.length > 100 && '...'}
                                                    </p>
                                                )}
                                                {video.tags && video.tags.length > 0 && (
                                                    <div className="video-tags">
                                                        {video.tags.slice(0, 3).map((tag, index) => (
                                                            <span key={index} className="video-tag">#{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>

                            {getFilteredVideos().length === 0 && (
                                <div className="empty-videos">
                                    <div className="empty-content-message">
                                        {ui.videoContentTab === 'clips' ? (
                                            <>
                                                <h5>📱 No StreamClips yet</h5>
                                                <p>Create short, engaging clips to share with your audience!</p>
                                                <button
                                                    onClick={() => setUi(prev => ({ ...prev, showClipCreator: true }))}
                                                    className="create-first-clip-btn"
                                                >
                                                    ✂️ Create Your First StreamClip
                                                </button>
                                            </>
                                        ) : ui.videoContentTab === 'videos' ? (
                                            <>
                                                <h5>🎬 No videos yet</h5>
                                                <p>Upload your first video to start your channel!</p>
                                                <button
                                                    onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                                    className="upload-first-video-btn"
                                                >
                                                    📹 Upload Your First Video
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h5>🎬 No content yet</h5>
                                                <p>Start creating by uploading videos or making StreamClips!</p>
                                                <div className="empty-content-actions">
                                                    <button
                                                        onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                                        className="upload-video-btn"
                                                    >
                                                        📹 Upload Video
                                                    </button>
                                                    <button
                                                        onClick={() => setUi(prev => ({ ...prev, showClipCreator: true }))}
                                                        className="create-clip-btn"
                                                    >
                                                        ✂️ Create StreamClip
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {ui.activeTab === 'about' && (
                        <div className="about-tab-content">
                            <div className="about-sections">
                                <div className="about-section">
                                    <h5>👤 Profile Overview</h5>
                                    <div className="about-grid">
                                        <div className="about-item">
                                            <span className="about-label">Username:</span>
                                            <span className="about-value">@{user.username || 'Unknown'}</span>
                                        </div>
                                        <div className="about-item">
                                            <span className="about-label">Display Name:</span>
                                            <span className="about-value">{effectiveUserName}</span>
                                        </div>
                                        <div className="about-item">
                                            <span className="about-label">Member Since:</span>
                                            <span className="about-value">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</span>
                                        </div>
                                        <div className="about-item">
                                            <span className="about-label">Current Mood:</span>
                                            <span className="about-value">{getCurrentMoodDisplay()}</span>
                                        </div>
                                    </div>
                                </div>

                                {formData.bio && (
                                    <div className="about-section">
                                        <h5>📝 Biography</h5>
                                        <p className="about-bio">{formData.bio}</p>
                                    </div>
                                )}

                                {(formData.businessName || formData.businessType || formData.location) && (
                                    <div className="about-section">
                                        <h5>💼 Business Information</h5>
                                        <div className="about-grid">
                                            {formData.businessName && (
                                                <div className="about-item">
                                                    <span className="about-label">Business:</span>
                                                    <span className="about-value">{formData.businessName}</span>
                                                </div>
                                            )}
                                            {formData.businessType && (
                                                <div className="about-item">
                                                    <span className="about-label">Type:</span>
                                                    <span className="about-value">{formData.businessType.replace('_', ' ')}</span>
                                                </div>
                                            )}
                                            {formData.location && (
                                                <div className="about-item">
                                                    <span className="about-label">Location:</span>
                                                    <span className="about-value">{formData.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="about-section">
                                    <h5>📊 Statistics</h5>
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <div className="stat-icon">👥</div>
                                            <div className="stat-info">
                                                <span className="stat-number">{formatCount(user.follower_count || 0)}</span>
                                                <span className="stat-label">Followers</span>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon">🎬</div>
                                            <div className="stat-info">
                                                <span className="stat-number">{channelVideos.filter(v => v.content_type !== 'clip').length}</span>
                                                <span className="stat-label">Videos</span>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon">⚡</div>
                                            <div className="stat-info">
                                                <span className="stat-number">{channelVideos.filter(v => v.content_type === 'clip').length}</span>
                                                <span className="stat-label">StreamClips</span>
                                            </div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-icon">❤️</div>
                                            <div className="stat-info">
                                                <span className="stat-number">{formatCount(user.total_likes || 0)}</span>
                                                <span className="stat-label">Total Likes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {videoChannel && (
                                    <div className="about-section">
                                        <h5>🎬 Channel Information</h5>
                                        <div className="about-grid">
                                            <div className="about-item">
                                                <span className="about-label">Channel Name:</span>
                                                <span className="about-value">{videoChannel.channel_name}</span>
                                            </div>
                                            <div className="about-item">
                                                <span className="about-label">Subscribers:</span>
                                                <span className="about-value">{formatCount(videoChannel.subscriber_count || 0)}</span>
                                            </div>
                                            <div className="about-item">
                                                <span className="about-label">Total Views:</span>
                                                <span className="about-value">{formatCount(videoChannel.total_views || 0)}</span>
                                            </div>
                                            <div className="about-item">
                                                <span className="about-label">Content Count:</span>
                                                <span className="about-value">{channelVideos.length} items</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Video Component */}
            <UploadVideo
                onVideoUpload={handleVideoUpload}
                uploading={uploadingVideo}
                className="profile-upload-video"
            />

            {/* Save Profile Button */}
            <div className="profile-actions-footer">
                <button
                    onClick={handleSaveProfile}
                    className="save-profile-btn"
                    disabled={loading}
                >
                    {loading ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    ⚠️ {error}
                    <button onClick={() => setError(null)} className="dismiss-error">
                        ❌
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;