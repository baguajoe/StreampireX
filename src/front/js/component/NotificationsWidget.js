import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "../../styles/NotificationsWidget.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

// Notification type configurations
const NOTIFICATION_CONFIG = {
  follow: {
    icon: "👤",
    color: "#3b82f6",
    action: "followed you"
  },
  follow_request: {
    icon: "🔔",
    color: "#8b5cf6",
    action: "requested to follow you"
  },
  live: {
    icon: "🔴",
    color: "#ef4444",
    action: "went live"
  },
  like: {
    icon: "❤️",
    color: "#ec4899",
    action: "liked your post"
  },
  comment: {
    icon: "💬",
    color: "#10b981",
    action: "commented on your post"
  },
  mention: {
    icon: "📢",
    color: "#f59e0b",
    action: "mentioned you"
  },
  new_track: {
    icon: "🎵",
    color: "#06b6d4",
    action: "released new music"
  },
  new_video: {
    icon: "🎬",
    color: "#8b5cf6",
    action: "uploaded a video"
  },
  new_podcast: {
    icon: "🎙️",
    color: "#f97316",
    action: "published a podcast"
  },
  game_invite: {
    icon: "🎮",
    color: "#10b981",
    action: "invited you to play"
  },
  circle_add: {
    icon: "⭐",
    color: "#eab308",
    action: "added you to their circle"
  },
  tip: {
    icon: "💰",
    color: "#22c55e",
    action: "sent you a tip"
  },
  message: {
    icon: "✉️",
    color: "#6366f1",
    action: "sent you a message"
  },
  share: {
    icon: "🔄",
    color: "#14b8a6",
    action: "shared your post"
  },
  system: {
    icon: "📣",
    color: "#64748b",
    action: ""
  }
};

const NotificationsWidget = ({ maxItems = 5, showHeader = true }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/notifications?limit=${maxItems}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } else {
        // Use mock data if endpoint doesn't exist yet
        setNotifications(getMockNotifications());
        setUnreadCount(3);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      // Use mock data on error
      setNotifications(getMockNotifications());
      setUnreadCount(3);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  // Mock notifications for development
  const getMockNotifications = () => [
    {
      id: 1,
      type: "follow",
      user: { id: 2, username: "musiclover", display_name: "Music Lover", avatar: null },
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      is_read: false,
    },
    {
      id: 2,
      type: "live",
      user: { id: 3, username: "djmaster", display_name: "DJ Master", avatar: null },
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      is_read: false,
      extra_data: { stream_id: 123 },
    },
    {
      id: 3,
      type: "like",
      user: { id: 4, username: "beatmaker", display_name: "Beat Maker", avatar: null },
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      is_read: false,
      extra_data: { post_id: 456 },
    },
    {
      id: 4,
      type: "comment",
      user: { id: 5, username: "producer101", display_name: "Producer 101", avatar: null },
      content: "Great track! 🔥",
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      extra_data: { post_id: 789 },
    },
    {
      id: 5,
      type: "new_track",
      user: { id: 6, username: "indieartist", display_name: "Indie Artist", avatar: null },
      content: "Summer Vibes",
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      is_read: true,
      extra_data: { track_id: 321 },
    },
  ];

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");
      
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Still update UI
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  // Format timestamp
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

  // Get notification link
  const getNotificationLink = (notification) => {
    const { type, user, extra_data } = notification;

    switch (type) {
      case "follow":
      case "follow_request":
      case "circle_add":
        return `/user/${user?.id}`;
      case "live":
        return extra_data?.stream_id ? `/live-streams/${extra_data.stream_id}` : "/live-streams";
      case "like":
      case "comment":
      case "mention":
      case "share":
        return extra_data?.post_id ? `/post/${extra_data.post_id}` : "#";
      case "new_track":
        return extra_data?.track_id ? `/track/${extra_data.track_id}` : `/user/${user?.id}`;
      case "new_video":
        return extra_data?.video_id ? `/video-details/${extra_data.video_id}` : `/user/${user?.id}`;
      case "new_podcast":
        return extra_data?.podcast_id ? `/podcast/${extra_data.podcast_id}` : `/user/${user?.id}`;
      case "game_invite":
        return "/gamers/chat";
      case "message":
        return "/profile"; // Opens inbox
      case "tip":
        return "/dashboard/earnings";
      default:
        return "#";
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Get config for notification type
  const getConfig = (type) => NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.system;

  if (loading) {
    return (
      <div className="notifications-widget">
        {showHeader && (
          <div className="widget-header">
            <h3>🔔 Notifications</h3>
          </div>
        )}
        <div className="widget-loading">
          <div className="loading-spinner-small"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-widget">
      {showHeader && (
        <div className="widget-header">
          <h3>
            🔔 Notifications
            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </h3>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Mark all read
            </button>
          )}
        </div>
      )}

      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const config = getConfig(notification.type);
            const link = getNotificationLink(notification);

            return (
              <Link
                key={notification.id}
                to={link}
                className={`notification-item ${!notification.is_read ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div
                  className="notification-icon"
                  style={{ backgroundColor: `${config.color}20`, color: config.color }}
                >
                  {config.icon}
                </div>

                <div className="notification-content">
                  <div className="notification-text">
                    <strong>@{notification.user?.username || "someone"}</strong>{" "}
                    {config.action}
                    {notification.content && (
                      <span className="notification-detail">: "{notification.content}"</span>
                    )}
                  </div>
                  <div className="notification-time">{formatTime(notification.created_at)}</div>
                </div>

                {!notification.is_read && <div className="unread-dot"></div>}
              </Link>
            );
          })
        ) : (
          <div className="no-notifications">
            <span className="empty-icon">🔕</span>
            <p>No notifications yet</p>
          </div>
        )}
      </div>

      <Link to="/notifications" className="see-all-link">
        See All Notifications →
      </Link>
    </div>
  );
};

export default NotificationsWidget;