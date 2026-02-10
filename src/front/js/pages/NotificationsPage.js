import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "../../styles/NotificationsPage.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

// Notification type configurations
const NOTIFICATION_CONFIG = {
    follow: { icon: "👤", color: "#3b82f6", action: "followed you" },
    follow_request: { icon: "🔔", color: "#8b5cf6", action: "requested to follow you" },
    live: { icon: "🔴", color: "#ef4444", action: "went live" },
    like: { icon: "❤️", color: "#ec4899", action: "liked your post" },
    comment: { icon: "💬", color: "#10b981", action: "commented on your post" },
    mention: { icon: "📢", color: "#f59e0b", action: "mentioned you" },
    new_track: { icon: "🎵", color: "#06b6d4", action: "released new music" },
    new_video: { icon: "🎬", color: "#8b5cf6", action: "uploaded a video" },
    new_podcast: { icon: "🎙️", color: "#f97316", action: "published a podcast" },
    game_invite: { icon: "🎮", color: "#10b981", action: "invited you to play" },
    circle_add: { icon: "⭐", color: "#eab308", action: "added you to their circle" },
    tip: { icon: "💰", color: "#22c55e", action: "sent you a tip" },
    message: { icon: "✉️", color: "#6366f1", action: "sent you a message" },
    share: { icon: "🔄", color: "#14b8a6", action: "shared your post" },
    system: { icon: "📣", color: "#64748b", action: "" }
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState("all"); // all, unread
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchNotifications = useCallback(async (reset = false) => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            
            if (!token) {
                setError("Please log in to view notifications");
                setLoading(false);
                return;
            }

            const currentOffset = reset ? 0 : offset;
            const unreadOnly = filter === "unread" ? "&unread_only=true" : "";
            
            const response = await fetch(
                `${BACKEND_URL}/api/notifications?limit=20&offset=${currentOffset}${unreadOnly}`,
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                
                if (reset) {
                    setNotifications(data.notifications || []);
                } else {
                    setNotifications(prev => [...prev, ...(data.notifications || [])]);
                }
                
                setUnreadCount(data.unread_count || 0);
                setHasMore(data.has_more || false);
                setOffset(currentOffset + (data.notifications?.length || 0));
            } else {
                setError("Failed to load notifications");
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
            setError("Error loading notifications");
        } finally {
            setLoading(false);
        }
    }, [offset, filter]);

    useEffect(() => {
        fetchNotifications(true);
    }, [filter]);

    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem("token");
            
            await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem("token");
            
            await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all notifications as read:", err);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const token = localStorage.getItem("token");
            
            await fetch(`${BACKEND_URL}/api/notifications/${notificationId}`, {
                method: "DELETE",
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    const clearAllNotifications = async () => {
        if (!window.confirm("Are you sure you want to clear all notifications?")) return;
        
        try {
            const token = localStorage.getItem("token");
            
            await fetch(`${BACKEND_URL}/api/notifications/clear-all`, {
                method: "DELETE",
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error("Error clearing notifications:", err);
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return "Just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const getNotificationLink = (notification) => {
        const { type, user, extra_data } = notification;

        switch (type) {
            case "follow":
            case "follow_request":
            case "circle_add":
                return `/profile/${user?.id}`;
            case "live":
                return extra_data?.stream_id ? `/live-streams/${extra_data.stream_id}` : "/live-streams";
            case "like":
            case "comment":
            case "mention":
            case "share":
                return extra_data?.post_id ? `/post/${extra_data.post_id}` : "#";
            case "new_track":
                return extra_data?.track_id ? `/track/${extra_data.track_id}` : `/profile/${user?.id}`;
            case "new_video":
                return extra_data?.video_id ? `/video-details/${extra_data.video_id}` : `/profile/${user?.id}`;
            case "new_podcast":
                return extra_data?.podcast_id ? `/podcast/${extra_data.podcast_id}` : `/profile/${user?.id}`;
            case "game_invite":
                return "/gamers/chat";
            case "message":
                return "/profile";
            case "tip":
                return "/dashboard/earnings";
            default:
                return "#";
        }
    };

    const getConfig = (type) => NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system;

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="notifications-page">
                <div className="notifications-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="notifications-page">
            {/* Header */}
            <div className="notifications-header">
                <div className="header-left">
                    <h1>🔔 Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount} unread</span>
                    )}
                </div>
                <div className="header-actions">
                    {unreadCount > 0 && (
                        <button className="action-btn mark-read" onClick={markAllAsRead}>
                            ✓ Mark All Read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button className="action-btn clear-all" onClick={clearAllNotifications}>
                            🗑️ Clear All
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="notifications-filters">
                <button
                    className={`filter-tab ${filter === "all" ? "active" : ""}`}
                    onClick={() => { setFilter("all"); setOffset(0); }}
                >
                    All
                </button>
                <button
                    className={`filter-tab ${filter === "unread" ? "active" : ""}`}
                    onClick={() => { setFilter("unread"); setOffset(0); }}
                >
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
            </div>

            {error && (
                <div className="notifications-error">
                    <p>⚠️ {error}</p>
                </div>
            )}

            {/* Notifications List */}
            <div className="notifications-list">
                {notifications.length > 0 ? (
                    notifications.map((notification) => {
                        const config = getConfig(notification.type);
                        const link = getNotificationLink(notification);

                        return (
                            <div
                                key={notification.id}
                                className={`notification-card ${!notification.is_read ? "unread" : ""}`}
                            >
                                <Link
                                    to={link}
                                    className="notification-content"
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div
                                        className="notification-icon"
                                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                    >
                                        {config.icon}
                                    </div>

                                    <div className="notification-body">
                                        <div className="notification-text">
                                            {notification.user && (
                                                <img
                                                    src={notification.user.avatar || "/default-avatar.png"}
                                                    alt=""
                                                    className="notification-avatar"
                                                />
                                            )}
                                            <p>
                                                <strong>@{notification.user?.username || "someone"}</strong>{" "}
                                                {config.action}
                                                {notification.content && (
                                                    <span className="notification-detail">
                                                        : "{notification.content}"
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span className="notification-time">
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>

                                    {!notification.is_read && <div className="unread-dot"></div>}
                                </Link>

                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        deleteNotification(notification.id);
                                    }}
                                    title="Delete notification"
                                >
                                    ✕
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="notifications-empty">
                        <div className="empty-icon">🔕</div>
                        <h3>No notifications</h3>
                        <p>
                            {filter === "unread"
                                ? "You're all caught up!"
                                : "When you get notifications, they'll show up here."}
                        </p>
                        <Link to="/discover-users" className="discover-btn">
                            🔍 Discover Creators
                        </Link>
                    </div>
                )}

                {/* Load More */}
                {hasMore && (
                    <div className="load-more">
                        <button
                            className="load-more-btn"
                            onClick={() => fetchNotifications(false)}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Load More"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;