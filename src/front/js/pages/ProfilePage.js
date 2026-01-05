import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import VideoChatPopup from "../component/VideoChatPopup";
import InboxDrawer from "../component/InboxDrawer";
import SocialMediaManager from "../component/SocialMediaManager";
import PostCard from '../component/PostCard';
import VideoChannelManager from "../component/VideoChannelManager";
import "../../styles/ProfilePage.css";
import "../../styles/PostCard.css";
import "../../styles/QuickActionModals.css";

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
        content: "Just dropped a new track! Check it out and let me know what you think.",
        timestamp: "2 hours ago",
        avatar: lady1,
        username: "You",
        image: null,
        likes: 12,
        comments: [
            {
                id: 1,
                author: "Alex",
                avatar: zenmaster,
                text: "This is amazing! Love the beat drop at 1:30",
                timestamp: "1 hour ago",
                likes: 3
            },
            {
                id: 2,
                author: "Sarah",
                avatar: fitjay,
                text: "Can't stop listening to this! When's the next one coming?",
                timestamp: "45 minutes ago",
                likes: 1
            }
        ]
    },
    {
        id: 2,
        content: "Amazing studio session today. The energy was incredible!",
        timestamp: "1 day ago",
        avatar: lady1,
        username: "You",
        image: null,
        likes: 8,
        comments: [
            {
                id: 3,
                author: "Mike",
                avatar: lofiLounge,
                text: "Looks like an epic session! Can't wait to hear what you created",
                timestamp: "1 day ago",
                likes: 2
            }
        ]
    }
];

// Mock data for Photos and Videos
const MOCK_PHOTOS = [
    { id: 1, url: lady1, caption: "Profile photo", likes: 15, comments: 3 },
    { id: 2, url: campfire, caption: "Studio vibes", likes: 8, comments: 1 },
    { id: 3, url: lofiLounge, caption: "Recording session", likes: 12, comments: 2 }
];

const MOCK_VIDEOS = [
    { id: 1, title: "Latest Track Preview", thumbnail_url: campfire, duration: "2:30", views: 150, likes: 20, comments: 5, created_at: "2025-01-10" },
    { id: 2, title: "Behind the Scenes", thumbnail_url: lady1, duration: "1:45", views: 89, likes: 12, comments: 3, created_at: "2025-01-08" }
];

const MOCK_CIRCLE_MEMBERS = [
    { id: 1, display_name: "Alex Rivera", username: "alexmusic", profile_picture: zenmaster, mutual_friends: 5, position: 1, friend_user_id: 1 },
    { id: 2, display_name: "Sarah Chen", username: "sarahbeats", profile_picture: fitjay, mutual_friends: 3, position: 2, friend_user_id: 2 },
    { id: 3, display_name: "Mike Johnson", username: "mikeprod", profile_picture: lofiLounge, mutual_friends: 8, position: 3, friend_user_id: 3 }
];

// Enhanced InnerCircle component with Top 10 Users
const InnerCircle = ({ userId, isOwnProfile, compact = false }) => {
    const [innerCircleMembers, setInnerCircleMembers] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('circle');
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);



    const fetchInnerCircle = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                // Use mock data if no token
                setInnerCircleMembers(MOCK_CIRCLE_MEMBERS);
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/inner-circle/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setInnerCircleMembers(data.inner_circle || []);
            } else {
                // Fallback to mock data
                setInnerCircleMembers(MOCK_CIRCLE_MEMBERS);
            }
        } catch (error) {
            console.error('Error fetching inner circle:', error);
            setInnerCircleMembers(MOCK_CIRCLE_MEMBERS);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchTopUsers = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                // Use mock data
                setTopUsers(MOCK_CIRCLE_MEMBERS.slice(0, 10));
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/users/top-10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTopUsers(data.users || []);
            } else {
                setTopUsers(MOCK_CIRCLE_MEMBERS.slice(0, 10));
            }
        } catch (error) {
            console.error('Error fetching top users:', error);
            setTopUsers(MOCK_CIRCLE_MEMBERS.slice(0, 10));
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAddToCircle = useCallback(async (targetUserId) => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                alert('Please log in to modify your inner circle');
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/profile/inner-circle/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ friend_user_id: targetUserId })
            });

            if (response.ok) {
                fetchInnerCircle();
                alert('Added to Inner Circle!');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add to inner circle');
            }
        } catch (error) {
            console.error('Error adding to inner circle:', error);
            alert('Error adding to inner circle');
        }
    }, [fetchInnerCircle]);

    const handleRemoveFromCircle = useCallback(async (targetUserId) => {
        if (!confirm('Remove this person from your inner circle?')) return;

        try {
            const token = localStorage.getItem('token');

            if (!token) {
                alert('Please log in to modify your inner circle');
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/profile/inner-circle/remove/${targetUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchInnerCircle();
                alert('Removed from inner circle');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to remove from inner circle');
            }
        } catch (error) {
            console.error('Error removing from inner circle:', error);
            alert('Error removing from inner circle');
        }
    }, [fetchInnerCircle]);

    const searchUsers = useCallback(async (query) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const token = localStorage.getItem('token');

            if (!token) {
                // Mock search results
                const mockResults = MOCK_CIRCLE_MEMBERS.filter(user =>
                    user.display_name.toLowerCase().includes(query.toLowerCase()) ||
                    user.username.toLowerCase().includes(query.toLowerCase())
                );
                setSearchResults(mockResults);
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        fetchInnerCircle();
        if (!compact) {
            fetchTopUsers();
        }
    }, [fetchInnerCircle, fetchTopUsers, compact]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery) {
                searchUsers(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUsers]);

    return (
        <div className="inner-circle-section">
            <div className="inner-circle-header">
                <h4>Inner Circle & Top Users</h4>
                <div className="inner-circle-actions">
                    {isOwnProfile && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`edit-circle-btn ${isEditing ? 'active' : ''}`}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    )}
                </div>
            </div>

            {!compact && (
                <div className="inner-circle-tabs">
                    <button
                        className={`circle-tab ${activeTab === 'circle' ? 'active' : ''}`}
                        onClick={() => setActiveTab('circle')}
                    >
                        My Circle ({innerCircleMembers.length})
                    </button>
                    <button
                        className={`circle-tab ${activeTab === 'top10' ? 'active' : ''}`}
                        onClick={() => setActiveTab('top10')}
                    >
                        Top 10 Users
                    </button>
                </div>
            )}

            {isEditing && isOwnProfile && (
                <div className="add-to-circle-section">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users to add to your circle..."
                        className="search-users-input"
                    />

                    {isSearching && <div className="search-loading">Searching...</div>}

                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map(user => (
                                <div key={user.id} className="search-result-item">
                                    <img
                                        src={user.profile_picture || user.avatar || lady1}
                                        alt={user.display_name || user.username}
                                        className="search-avatar"
                                    />
                                    <div className="search-user-info">
                                        <h6>{user.display_name || user.username}</h6>
                                        <p>{user.bio || "StreampireX User"}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddToCircle(user.id)}
                                        className="add-to-circle-btn"
                                        disabled={innerCircleMembers.some(m => m.friend_user_id === user.id)}
                                    >
                                        {innerCircleMembers.some(m => m.friend_user_id === user.id) ? 'In Circle' : 'Add'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="inner-circle-content">
                {loading ? (
                    <div className="circle-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading...</p>
                    </div>
                ) : activeTab === 'circle' || compact ? (
                    <div className="circle-members">
                        {innerCircleMembers.length > 0 ? (
                            innerCircleMembers.map(member => (
                                <div key={member.friend_user_id || member.id} className="circle-member-card">
                                    <div className="member-rank">#{member.position || member.id}</div>
                                    <img
                                        src={member.profile_picture || member.avatar || lady1}
                                        alt={member.display_name || member.username}
                                        className="member-avatar"
                                    />
                                    <div className="member-info">
                                        <h6>{member.display_name || member.username}</h6>
                                        <p className="member-bio">{member.bio || "StreampireX Creator"}</p>
                                        <div className="member-stats">
                                            <span>🎵 {member.track_count || 0}</span>
                                            <span>👥 {member.follower_count || member.mutual_friends || 0}</span>
                                        </div>
                                    </div>
                                    <div className="member-actions">
                                        <Link to={`/profile/${member.friend_user_id || member.id}`} className="view-profile-btn">
                                            View
                                        </Link>
                                        {isEditing && isOwnProfile && (
                                            <button
                                                onClick={() => handleRemoveFromCircle(member.friend_user_id || member.id)}
                                                className="remove-from-circle-btn"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
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
                                        Discover Top Users
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="top-users-list">
                        {topUsers.map((user, index) => (
                            <div key={user.id} className="circle-member-card">
                                <div className="user-rank">
                                    #{index + 1}
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                </div>
                                <img
                                    src={user.profile_picture || user.avatar || lady1}
                                    alt={user.display_name || user.username}
                                    className="member-avatar"
                                />
                                <div className="member-info">
                                    <h6>{user.display_name || user.username}</h6>
                                    <p className="member-bio">{user.primary_achievement || "Top Creator"}</p>
                                    <div className="member-stats">
                                        <span>🎵 {user.total_streams || 0}</span>
                                        <span>❤️ {user.total_likes || 0}</span>
                                        <span>👥 {user.follower_count || 0}</span>
                                    </div>
                                </div>
                                <div className="top-user-actions">
                                    <Link to={`/profile/${user.id}`} className="view-profile-btn small">
                                        View
                                    </Link>
                                    {isOwnProfile && (
                                        <button
                                            onClick={() => handleAddToCircle(user.id)}
                                            className="add-to-circle-btn small"
                                            disabled={innerCircleMembers.some(m => m.friend_user_id === user.id)}
                                        >
                                            {innerCircleMembers.some(m => m.friend_user_id === user.id) ? 'Added' : 'Add'}
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

// Comment Component
const CommentSection = ({ postId, comments = [], currentUser, onAddComment }) => {
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        setIsSubmitting(true);
        try {
            const comment = {
                id: Date.now(),
                author: currentUser.display_name || currentUser.username || 'You',
                avatar: currentUser.profile_picture || lady1,
                text: newComment.trim(),
                timestamp: 'Just now',
                likes: 0
            };

            await onAddComment(postId, comment);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="post-comments-section">
            <div className="comments-toggle">
                <button
                    className="comments-toggle-btn"
                    onClick={() => setShowComments(!showComments)}
                >
                    {showComments ? 'Hide' : 'View'} {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </button>
            </div>

            <div className={showComments ? 'show-comments' : 'hide-comments'}>
                {comments.length > 0 && (
                    <div className="comments-list">
                        {comments.map((comment) => (
                            <div key={comment.id} className="comment-item">
                                <img
                                    src={comment.avatar}
                                    alt={comment.author}
                                    className="comment-avatar"
                                />
                                <div className="comment-content">
                                    <div className="comment-author">{comment.author}</div>
                                    <div className="comment-text">{comment.text}</div>
                                    <div className="comment-meta">
                                        <span className="comment-action">Like</span>
                                        <span className="comment-action">Reply</span>
                                        <span>{comment.timestamp}</span>
                                        {comment.likes > 0 && <span>❤️ {comment.likes}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="comment-input-section">
                    <img
                        src={currentUser.profile_picture || lady1}
                        alt="Your avatar"
                        className="comment-input-avatar"
                    />
                    <div className="comment-input-container">
                        <textarea
                            className="comment-input"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows="2"
                        />
                        {newComment.trim() && (
                            <div className="comment-actions">
                                <button
                                    className="comment-cancel-btn"
                                    onClick={() => setNewComment('')}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="comment-submit-btn"
                                    onClick={handleSubmitComment}
                                    disabled={isSubmitting || !newComment.trim()}
                                >
                                    {isSubmitting ? 'Posting...' : 'Comment'}
                                </button>
                            </div>
                        )}
                    </div>
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

        const response = await fetch(`${BACKEND_URL}/api/upload/cloudinary`, {
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
    // Get profile ID from URL (if viewing someone else's profile)
    const { userId: profileUserId } = useParams();
    
    // Authentication state
    const [authState, setAuthState] = useState({
        token: null,
        userId: '1',
        username: 'User'
    });

    // Determine if viewing own profile
    const isOwnProfile = !profileUserId || profileUserId === authState.userId;

    // Core user state
    const [user, setUser] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInCircle, setIsInCircle] = useState(false);
    const [addingToCircle, setAddingToCircle] = useState(false);

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

    // UI state
    const [ui, setUi] = useState({
        currentMood: 'chill',
        customMoodLabel: null,
        customMoodEmoji: null,
        useAvatar: true,
        isChatOpen: false,
        isVideoChatOpen: false,
        showShareModal: false,
        activeTab: 'posts',
        videoContentTab: 'all',
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

    // Media state - Enhanced for Photos/Videos tabs
    const [media, setMedia] = useState({
        profilePicture: null,
        coverPhoto: null,
        videos: [],
        images: [],
        userPhotos: MOCK_PHOTOS,
        userVideos: MOCK_VIDEOS
    });

    // Posts state with comments
    const [posts, setPosts] = useState(MOCK_POSTS);
    const [newPost, setNewPost] = useState('');
    const [postImage, setPostImage] = useState(null);
    const [uploadingPost, setUploadingPost] = useState(false);

    // Circle/Following state - Updated from friends to circle
    const [circleMembers, setCircleMembers] = useState(MOCK_CIRCLE_MEMBERS);
    const [following, setFollowing] = useState([]);
    const [followers, setFollowers] = useState([]);

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

    // Refs
    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);
    const postImageInputRef = useRef(null);
    const socket = useRef(null);

    // Utility functions
    const formatCount = useCallback((count) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }, []);

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
            const response = await fetch(`${BACKEND_URL}/api/social/accounts`, {
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
            const response = await fetch(`${BACKEND_URL}/api/social/analytics?days=30`, {
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

    const fetchUserPhotos = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/user/photos`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMedia(prev => ({ ...prev, userPhotos: data.photos || MOCK_PHOTOS }));
            }
        } catch (error) {
            console.error('Error fetching user photos:', error);
            // Keep mock data on error
        }
    }, []);

    const fetchUserVideos = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/video/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMedia(prev => ({ ...prev, userVideos: data.videos || MOCK_VIDEOS }));
            }
        } catch (error) {
            console.error('Error fetching user videos:', error);
            // Keep mock data on error
        }
    }, []);

    const fetchUserCircle = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/profile/my-inner-circle`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCircleMembers(data.inner_circle || MOCK_CIRCLE_MEMBERS);
                setFollowing(data.following || []);
                setFollowers(data.followers || []);
            }
        } catch (error) {
            console.error('Error fetching user circle:', error);
            // Keep mock data on error
        }
    }, []);

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

            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
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

    // Post handlers - used by PostCard component
    const handleEditPost = useCallback(async (postId, newContent) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: newContent })
            });

            if (response.ok) {
                setPosts(prev => prev.map(post =>
                    post.id === postId
                        ? { ...post, content: newContent, edited: true }
                        : post
                ));
            }
        } catch (error) {
            console.error('Error editing post:', error);
        }
    }, []);

    const handleDeletePost = useCallback(async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setPosts(prev => prev.filter(post => post.id !== postId));
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    }, []);

    const handleSharePost = useCallback((postId) => {
        const postUrl = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(postUrl).then(() => {
            alert('Post link copied to clipboard!');
        });
    }, []);

    // Add to Inner Circle handler (for other users' profiles)
    const handleAddToCircle = useCallback(async () => {
        if (!profileUserId || isOwnProfile) return;
        
        try {
            setAddingToCircle(true);
            const token = localStorage.getItem('token');

            if (!token) {
                alert('Please log in to add to your inner circle');
                return;
            }

            const response = await fetch(`${BACKEND_URL}/api/profile/inner-circle/add`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ friend_user_id: profileUserId })
            });

            if (response.ok) {
                setIsInCircle(true);
                alert('Added to your Inner Circle!');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add to inner circle');
            }
        } catch (error) {
            console.error('Error adding to inner circle:', error);
            alert('Error adding to inner circle');
        } finally {
            setAddingToCircle(false);
        }
    }, [profileUserId, isOwnProfile]);

    // Remove from Inner Circle handler
    const handleRemoveFromCircle = useCallback(async () => {
        if (!profileUserId || isOwnProfile) return;
        
        if (!window.confirm('Remove this person from your inner circle?')) return;

        try {
            setAddingToCircle(true);
            const token = localStorage.getItem('token');

            const response = await fetch(`${BACKEND_URL}/api/profile/inner-circle/remove/${profileUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setIsInCircle(false);
                alert('Removed from your Inner Circle');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to remove from inner circle');
            }
        } catch (error) {
            console.error('Error removing from inner circle:', error);
        } finally {
            setAddingToCircle(false);
        }
    }, [profileUserId, isOwnProfile]);

    // Check if viewed user is in your circle
    const checkIfInCircle = useCallback(async () => {
        if (isOwnProfile || !profileUserId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/profile/my-inner-circle`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const inCircle = (data.inner_circle || []).some(
                    member => member.friend_user_id === parseInt(profileUserId) || member.friend_user_id === profileUserId
                );
                setIsInCircle(inCircle);
            }
        } catch (error) {
            console.error('Error checking circle status:', error);
        }
    }, [profileUserId, isOwnProfile]);

    // Media upload handlers
    const handleProfilePicChange = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                setLoading(true);
                const cloudinaryUrl = await uploadToCloudinary(file, 'image');
                setMedia(prev => ({ ...prev, profilePicture: cloudinaryUrl }));

                const token = localStorage.getItem('token');
                await fetch(`${BACKEND_URL}/api/user/profile-picture`, {
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
                await fetch(`${BACKEND_URL}/api/user/cover-photo`, {
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

            const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
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

    // Post handlers with comments
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
                comments: []
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/posts/create`, {
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
                comments: []
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
                ? { ...post, likes: post.liked ? post.likes - 1 : post.likes + 1, liked: !post.liked }
                : post
        ));
    }, []);

    const handleAddComment = useCallback(async (postId, comment) => {
        try {
            // Add comment to local state immediately
            setPosts(prev => prev.map(post =>
                post.id === postId
                    ? { ...post, comments: [...(post.comments || []), comment] }
                    : post
            ));

            // Try to save to backend
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: comment.text
                })
            });

            if (!response.ok) {
                console.warn('Failed to save comment to backend');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
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
            fetchUserPhotos();
            fetchUserVideos();
            fetchUserCircle();
            checkIfInCircle();
        }

        return () => {
            if (socket.current) {
                socket.current.disconnect();
                socket.current = null;
            }
        };
    }, [authState.token, fetchProfile, initializeSocket, fetchSocialAccounts, fetchSocialAnalytics, fetchUserPhotos, fetchUserVideos, fetchUserCircle, checkIfInCircle]);

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
                    <h3>Unable to load profile</h3>
                    <p>{error}</p>
                    <button onClick={fetchProfile} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const effectiveUserId = profileUserId || user?.id || authState.userId;
    const effectiveUserName = user?.display_name || user?.username || authState.username || `User ${effectiveUserId}`;

    return (
        <div className="profile-container">
            {/* Success Message */}
            {ui.showSuccessMessage && (
                <div className="success-message">
                    Profile saved successfully!
                </div>
            )}

            {/* Header Section - Full Width */}
            <div className="profile-header-section">
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
                            {loading ? 'Uploading...' : 'Upload Cover Photo'}
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
                                        Edit Name
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
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            toggleEditingState('displayName');
                                            updateFormData('displayName', user.display_name || user.username || '');
                                        }}
                                        className="cancel-name-btn"
                                    >
                                        Cancel
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
                            Chat
                        </button>

                        {/* Add to Inner Circle button - only show on other users' profiles */}
                        {!isOwnProfile && (
                            <button
                                className={`quick-action-btn ${isInCircle ? 'in-circle' : 'add-circle'}`}
                                onClick={isInCircle ? handleRemoveFromCircle : handleAddToCircle}
                                disabled={addingToCircle}
                                title={isInCircle ? 'Remove from Inner Circle' : 'Add to Inner Circle'}
                            >
                                {addingToCircle ? '...' : isInCircle ? '⭐ In Circle' : '➕ Add to Circle'}
                            </button>
                        )}

                        <button
                            className="quick-action-btn"
                            onClick={handleToggleInbox}
                            title="Inbox"
                        >
                            Inbox {ui.unreadCount > 0 && <span className="badge">{ui.unreadCount}</span>}
                        </button>
                        <button
                            className="quick-action-btn"
                            onClick={() => setUi(prev => ({ ...prev, showShareModal: true }))}
                            title="Share Profile"
                        >
                            Share
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Section - Social Links, Business Info, Inner Circle */}
            <div className="profile-top-sections">
                {/* Social Links Section */}
                <div className="social-links-section">
                    <div className="section-header">
                        <h4>Social Links</h4>
                        <div className="section-actions">
                            <button
                                onClick={() => setUi(prev => ({ ...prev, showSocialManager: true }))}
                                className="social-manager-btn"
                            >
                                Manage
                            </button>
                            <button
                                onClick={() => toggleEditingState('socialLinks')}
                                className="edit-social-btn"
                            >
                                {editingStates.socialLinks ? 'Cancel' : 'Edit'}
                            </button>
                        </div>
                    </div>

                    {editingStates.socialLinks ? (
                        <div className="social-links-edit">
                            {SOCIAL_PLATFORMS.slice(0, 5).map((platform) => (
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
                                    Save Links
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="social-links-display">
                            {SOCIAL_PLATFORMS.filter(platform => formData.socialLinks[platform.key]).length > 0 ? (
                                <div className="social-links-grid">
                                    {SOCIAL_PLATFORMS
                                        .filter(platform => formData.socialLinks[platform.key])
                                        .slice(0, 6)
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
                                    No social links added yet. Click "Edit" to add them!
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Business Information Section */}
                <div className="business-section">
                    <div className="section-header">
                        <h4>Business Info</h4>
                        <button
                            onClick={() => toggleEditingState('business')}
                            className="edit-business-btn"
                        >
                            {editingStates.business ? 'Cancel' : 'Edit'}
                        </button>
                    </div>

                    {editingStates.business ? (
                        <div className="business-edit">
                            <div className="business-input-group">
                                <label>Business Name:</label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => updateFormData('businessName', e.target.value)}
                                    placeholder="Your business or brand name"
                                    className="business-input"
                                />
                            </div>

                            <div className="business-input-group">
                                <label>Business Type:</label>
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
                                <label>Website:</label>
                                <input
                                    type="url"
                                    value={formData.businessWebsite}
                                    onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                                    placeholder="https://your-website.com"
                                    className="business-input"
                                />
                            </div>

                            <div className="business-input-group">
                                <label>Location:</label>
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
                                    Save
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
                                                {formData.businessWebsite.replace(/https?:\/\//, '')}
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
                                    No business information added yet. Click "Edit" to add details!
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Inner Circle Section */}
                <InnerCircle userId={effectiveUserId} isOwnProfile={isOwnProfile} />
            </div>

            {/* Main Content - 2 Column Layout */}
            <div className="profile-main-content">
                {/* Left Sidebar */}
                <div className="profile-sidebar">
                    {/* Stats Section - Compact */}
                    <div className="sidebar-section">
                        <h4>Statistics</h4>
                        <div className="profile-stats-compact">
                            <div className="stat-item-compact">
                                <span className="stat-number-compact">{formatCount(user.follower_count || 0)}</span>
                                <span className="stat-label-compact">Followers</span>
                            </div>
                            <div className="stat-item-compact">
                                <span className="stat-number-compact">{formatCount(user.following_count || 0)}</span>
                                <span className="stat-label-compact">Following</span>
                            </div>
                            <div className="stat-item-compact">
                                <span className="stat-number-compact">{formatCount(media.userVideos.length)}</span>
                                <span className="stat-label-compact">Videos</span>
                            </div>
                            <div className="stat-item-compact">
                                <span className="stat-number-compact">{formatCount(media.userPhotos.length)}</span>
                                <span className="stat-label-compact">Photos</span>
                            </div>
                            <div className="stat-item-compact">
                                <span className="stat-number-compact">{formatCount(circleMembers.length)}</span>
                                <span className="stat-label-compact">Circle</span>
                            </div>
                        </div>
                    </div>

                    {/* Current Mood Section - Compact */}
                    <div className="sidebar-section">
                        <h4>Current Mood</h4>
                        <div className="mood-section-compact">
                            <div className="current-mood-display-compact">
                                {getCurrentMoodDisplay()}
                            </div>

                            <div className="mood-selector-compact">
                                {MOOD_OPTIONS.slice(0, 4).map((mood) => (
                                    <button
                                        key={mood.id}
                                        className={`mood-btn-compact ${ui.currentMood === mood.id ? 'active' : ''}`}
                                        onClick={() => handleMoodChange(mood.id)}
                                    >
                                        <span className="mood-emoji">{mood.emoji}</span>
                                        <span className="mood-label">{mood.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Custom Mood Button - Always show, change text based on state */}
                            <button
                                className={`mood-btn-compact custom ${ui.currentMood === 'custom' ? 'active' : ''}`}
                                onClick={() => setShowCustomMoodInput(true)}
                                style={{ gridColumn: '1 / -1', marginTop: '8px' }}
                            >
                                <span className="mood-emoji">{ui.currentMood === 'custom' ? (ui.customMoodEmoji || '🎭') : '🎭'}</span>
                                <span className="mood-label">
                                    {ui.currentMood === 'custom' ? `${ui.customMoodLabel || 'Custom'} (Edit)` : 'Custom Mood'}
                                </span>
                            </button>

                            {showCustomMoodInput && (
                                <div className="custom-mood-input" style={{ marginTop: '10px' }}>
                                    <input
                                        type="text"
                                        value={customMood}
                                        onChange={(e) => setCustomMood(e.target.value)}
                                        placeholder="Enter custom mood"
                                        onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomMood()}
                                        style={{ fontSize: '12px', padding: '8px' }}
                                    />
                                    <div className="custom-mood-actions" style={{ marginTop: '8px' }}>
                                        <button onClick={handleCreateCustomMood} className="save-custom-mood">
                                            Set Mood
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCustomMoodInput(false);
                                                setCustomMood('');
                                            }}
                                            className="cancel-custom-mood"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bio Section - Compact */}
                    <div className="sidebar-section">
                        <h4>About</h4>
                        <div className="bio-section-compact">
                            {!editingStates.bio ? (
                                <>
                                    <p className="bio-text-compact">
                                        {formData.bio || 'No bio yet. Click edit to add one!'}
                                    </p>
                                    <button
                                        onClick={() => toggleEditingState('bio')}
                                        className="edit-bio-btn"
                                        style={{ fontSize: '12px', padding: '6px 12px' }}
                                    >
                                        Edit Bio
                                    </button>
                                </>
                            ) : (
                                <div className="bio-edit">
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => updateFormData('bio', e.target.value)}
                                        placeholder="Tell us about yourself..."
                                        className="bio-input"
                                        maxLength="500"
                                        style={{ fontSize: '12px', minHeight: '80px' }}
                                    />
                                    <div className="bio-actions" style={{ marginTop: '8px' }}>
                                        <button
                                            onClick={() => {
                                                toggleEditingState('bio');
                                                handleSaveProfile();
                                            }}
                                            className="save-bio-btn"
                                            disabled={loading}
                                            style={{ fontSize: '11px', padding: '6px 10px' }}
                                        >
                                            Save Bio
                                        </button>
                                        <button
                                            onClick={() => {
                                                toggleEditingState('bio');
                                                updateFormData('bio', user.bio || '');
                                            }}
                                            className="cancel-bio-btn"
                                            style={{ fontSize: '11px', padding: '6px 10px' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="char-count" style={{ fontSize: '10px', marginTop: '4px' }}>
                                        {formData.bio.length}/500 characters
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="sidebar-section">
                        <h4>Quick Actions</h4>
                        <div className="quick-actions-compact">
                            <button
                                onClick={() => setUi(prev => ({ ...prev, showSocialManager: true }))}
                                className="quick-action-btn-compact"
                            >
                                Social Manager
                            </button>
                            <button
                                onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                className="quick-action-btn-compact"
                            >
                                Video Manager
                            </button>
                            <button
                                onClick={() => setUi(prev => ({ ...prev, showClipCreator: true }))}
                                className="quick-action-btn-compact"
                            >
                                Create Clip
                            </button>
                            <button
                                onClick={() => setUi(prev => ({ ...prev, showShareModal: true }))}
                                className="quick-action-btn-compact"
                            >
                                Share Profile
                            </button>
                        </div>
                    </div>

                    {/* Favorites - Compact */}
                    <div className="sidebar-section">
                        <h4>Favorite Profiles</h4>
                        <div className="favorites-compact">
                            {(ui.showAllFavorites ? FAVORITE_PROFILES : FAVORITE_PROFILES.slice(0, 3)).map((profile) => (
                                <div key={profile.id} className="favorite-item-compact">
                                    <img
                                        src={profile.avatar}
                                        alt={profile.name}
                                        className="favorite-avatar-compact"
                                    />
                                    <div className="favorite-info-compact">
                                        <h6 className="favorite-name-compact">{profile.name}</h6>
                                        <p className="favorite-desc-compact">{profile.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={toggleFavoritesView}
                            className="toggle-favorites-btn"
                            style={{
                                fontSize: '11px',
                                padding: '6px 12px',
                                marginTop: '10px',
                                width: '100%'
                            }}
                        >
                            {ui.showAllFavorites ? 'Show Less' : 'Show All'}
                        </button>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="profile-content-area">
                    {/* Content Tabs */}
                    <div className="content-tabs-main">
                        <button
                            className={`content-tab-main ${ui.activeTab === 'posts' ? 'active' : ''}`}
                            onClick={() => handleTabChange('posts')}
                        >
                            Posts ({posts.length})
                        </button>
                        <button
                            className={`content-tab-main ${ui.activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => handleTabChange('photos')}
                        >
                            Photos ({media.userPhotos.length})
                        </button>
                        <button
                            className={`content-tab-main ${ui.activeTab === 'videos' ? 'active' : ''}`}
                            onClick={() => handleTabChange('videos')}
                        >
                            Videos ({media.userVideos.length})
                        </button>
                        <button
                            className={`content-tab-main ${ui.activeTab === 'circle' ? 'active' : ''}`}
                            onClick={() => handleTabChange('circle')}
                        >
                            Circle ({circleMembers.length})
                        </button>
                        <button
                            className={`content-tab-main ${ui.activeTab === 'about' ? 'active' : ''}`}
                            onClick={() => handleTabChange('about')}
                        >
                            About
                        </button>
                    </div>

                    {/* Tab Content */}
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
                                            Remove
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
                                            Add Image
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
                                        {uploadingPost ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>

                            {/* Posts Grid - Using PostCard Component */}
                            <div className="posts-grid">
                                {posts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        currentUser={user}
                                        isOwnProfile={isOwnProfile}
                                        onLike={handleLikePost}
                                        onEdit={handleEditPost}
                                        onDelete={handleDeletePost}
                                        onComment={handleAddComment}
                                        onShare={handleSharePost}
                                    />
                                ))}
                            </div>

                            {posts.length === 0 && (
                                <div className="empty-posts">
                                    <p>No posts yet. Create your first post above!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {ui.activeTab === 'photos' && (
                        <div className="photos-tab-content">
                            <div className="photos-header">
                                <h3>Photos</h3>
                                <button
                                    onClick={() => postImageInputRef.current?.click()}
                                    className="upload-photo-btn"
                                >
                                    Upload Photo
                                </button>
                            </div>

                            {media.userPhotos.length > 0 ? (
                                <div className="photos-grid">
                                    {media.userPhotos.map((photo, index) => (
                                        <div key={photo.id || index} className="photo-item">
                                            <img
                                                src={photo.url || photo.image_url}
                                                alt={photo.caption || `Photo ${index + 1}`}
                                                className="photo-image"
                                                onClick={() => {
                                                    console.log('Open photo viewer for:', photo);
                                                }}
                                            />
                                            <div className="photo-overlay">
                                                <div className="photo-stats">
                                                    <span>❤️ {photo.likes || 0}</span>
                                                    <span>💬 {photo.comments || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-photos">
                                    <div className="empty-state">
                                        <h4>No Photos Yet</h4>
                                        <p>Share your moments by uploading photos</p>
                                        <button
                                            onClick={() => postImageInputRef.current?.click()}
                                            className="upload-first-photo-btn"
                                        >
                                            Upload Your First Photo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {ui.activeTab === 'videos' && (
                        <div className="videos-tab-content">
                            <div className="videos-header">
                                <h3>Videos</h3>
                                <button
                                    onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                    className="upload-video-btn"
                                >
                                    Upload Video
                                </button>
                            </div>

                            {media.userVideos.length > 0 ? (
                                <div className="videos-grid">
                                    {media.userVideos.map((video, index) => (
                                        <div key={video.id || index} className="video-item">
                                            <div className="video-thumbnail-container">
                                                <img
                                                    src={video.thumbnail_url || campfire}
                                                    alt={video.title || `Video ${index + 1}`}
                                                    className="video-thumbnail"
                                                />
                                                <div className="video-play-overlay">
                                                    <button className="video-play-btn">▶️</button>
                                                </div>
                                                <div className="video-duration">
                                                    {video.duration || '0:00'}
                                                </div>
                                            </div>
                                            <div className="video-info">
                                                <h6 className="video-title">{video.title || `Video ${index + 1}`}</h6>
                                                <div className="video-stats">
                                                    <span>👁️ {formatCount(video.views || 0)} views</span>
                                                    <span>❤️ {video.likes || 0}</span>
                                                    <span>💬 {video.comments || 0}</span>
                                                </div>
                                                <p className="video-upload-date">
                                                    {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-videos">
                                    <div className="empty-state">
                                        <h4>No Videos Yet</h4>
                                        <p>Share your stories and creativity through videos</p>
                                        <button
                                            onClick={() => setUi(prev => ({ ...prev, showVideoManager: true }))}
                                            className="upload-first-video-btn"
                                        >
                                            Upload Your First Video
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {ui.activeTab === 'circle' && (
                        <div className="circle-tab-content">
                            <div className="circle-header">
                                <h3>My Circle</h3>
                                <div className="circle-stats">
                                    <span>{circleMembers.length} Circle Members</span>
                                    <span>{followers.length} Followers</span>
                                    <span>{following.length} Following</span>
                                </div>
                            </div>

                            <div className="circle-sections">
                                {circleMembers.length > 0 && (
                                    <div className="circle-section">
                                        <h4>Inner Circle ({circleMembers.length})</h4>
                                        <div className="circle-grid">
                                            {circleMembers.map((member, index) => (
                                                <div key={member.friend_user_id || member.id} className="circle-member-card">
                                                    <div className="member-rank">#{index + 1}</div>
                                                    <img
                                                        src={member.profile_picture || member.avatar || lady1}
                                                        alt={member.display_name || member.username}
                                                        className="member-avatar"
                                                    />
                                                    <div className="member-info">
                                                        <h6 className="member-name">
                                                            {member.display_name || member.username}
                                                        </h6>
                                                        <p className="member-mutual">
                                                            {member.mutual_friends || 0} mutual connections
                                                        </p>
                                                        {member.custom_title && (
                                                            <p className="member-title">"{member.custom_title}"</p>
                                                        )}
                                                    </div>
                                                    <div className="member-actions">
                                                        <Link to={`/profile/${member.friend_user_id || member.id}`} className="view-member-btn">
                                                            View Profile
                                                        </Link>
                                                        <button className="message-member-btn">
                                                            Message
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {circleMembers.length === 0 && (
                                    <div className="empty-circle">
                                        <div className="empty-state">
                                            <h4>No Circle Members Yet</h4>
                                            <p>Start building your inner circle by adding your closest connections</p>
                                            <button className="find-members-btn">
                                                Find Circle Members
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {ui.activeTab === 'about' && (
                        <div className="about-tab-content">
                            <h3>About {effectiveUserName}</h3>
                            <div className="about-sections">
                                <div className="about-section">
                                    <h5>Profile Overview</h5>
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
                                        <h5>Biography</h5>
                                        <p className="about-bio">{formData.bio}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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

            {/* Video Manager Modal */}
            {ui.showVideoManager && (
                <div className="modal-backdrop" onClick={() => setUi(prev => ({ ...prev, showVideoManager: false }))}>
                    <div className="video-manager-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Video Manager</h3>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setUi(prev => ({ ...prev, showVideoManager: false }))}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-content">
                            <UploadVideo 
                                onUploadComplete={(video) => {
                                    setMedia(prev => ({
                                        ...prev,
                                        userVideos: [video, ...prev.userVideos]
                                    }));
                                    setUi(prev => ({ ...prev, showVideoManager: false }));
                                }}
                            />
                            
                            <div className="existing-videos">
                                <h4>Your Videos ({media.userVideos.length})</h4>
                                <div className="video-list">
                                    {media.userVideos.map((video, index) => (
                                        <div key={video.id || index} className="video-manager-item">
                                            <img 
                                                src={video.thumbnail_url || campfire} 
                                                alt={video.title}
                                                className="video-thumb"
                                            />
                                            <div className="video-details">
                                                <h5>{video.title || `Video ${index + 1}`}</h5>
                                                <p>{video.views || 0} views • {video.likes || 0} likes</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Clip Creator Modal */}
            {ui.showClipCreator && (
                <div className="modal-backdrop" onClick={() => setUi(prev => ({ ...prev, showClipCreator: false }))}>
                    <div className="clip-creator-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Clip</h3>
                            <button 
                                className="modal-close-btn"
                                onClick={() => setUi(prev => ({ ...prev, showClipCreator: false }))}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-content">
                            <p className="clip-description">
                                Select a video to create a short clip from:
                            </p>
                            
                            {media.userVideos.length > 0 ? (
                                <div className="clip-video-select">
                                    {media.userVideos.map((video, index) => (
                                        <div 
                                            key={video.id || index} 
                                            className={`clip-video-option ${ui.selectedVideoForClip === video.id ? 'selected' : ''}`}
                                            onClick={() => setUi(prev => ({ ...prev, selectedVideoForClip: video.id }))}
                                        >
                                            <img 
                                                src={video.thumbnail_url || campfire} 
                                                alt={video.title}
                                                className="clip-video-thumb"
                                            />
                                            <div className="clip-video-info">
                                                <h5>{video.title || `Video ${index + 1}`}</h5>
                                                <p>{video.duration || '0:00'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-videos-message">
                                    <p>No videos yet. Upload a video first to create clips!</p>
                                    <button 
                                        className="upload-video-btn"
                                        onClick={() => {
                                            setUi(prev => ({ 
                                                ...prev, 
                                                showClipCreator: false,
                                                showVideoManager: true 
                                            }));
                                        }}
                                    >
                                        Upload Video
                                    </button>
                                </div>
                            )}

                            {ui.selectedVideoForClip && (
                                <div className="clip-controls">
                                    <div className="clip-time-inputs">
                                        <div className="time-input-group">
                                            <label>Start Time:</label>
                                            <input type="text" placeholder="0:00" className="time-input" />
                                        </div>
                                        <div className="time-input-group">
                                            <label>End Time:</label>
                                            <input type="text" placeholder="0:30" className="time-input" />
                                        </div>
                                    </div>
                                    <button className="create-clip-btn">
                                        Create Clip
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {ui.showShareModal && (
                <div className="modal-backdrop" onClick={() => setUi(prev => ({ ...prev, showShareModal: false }))}>
                    <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Share Profile</h3>
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
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Profile Button */}
            <div className="profile-actions-footer">
                <button
                    onClick={handleSaveProfile}
                    className="save-profile-btn"
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Profile'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError(null)} className="dismiss-error">
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;