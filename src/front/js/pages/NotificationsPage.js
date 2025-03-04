import React, { useEffect, useState } from "react";

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then((res) => res.json())
            .then((data) => setNotifications(data))
            .catch((err) => console.error("Error fetching notifications:", err));
    }, []);

    const markAllAsRead = () => {
        fetch(`${process.env.BACKEND_URL}/api/notifications/read`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(() => setNotifications([]))
            .catch((err) => console.error("Error marking notifications as read:", err));
    };

    return (
        <div className="notifications-page">
            <h1>🔔 Notifications</h1>
            <button onClick={markAllAsRead}>Mark All as Read</button>
            <div className="notification-list">
                {notifications.length === 0 ? (
                    <p>No new notifications.</p>
                ) : (
                    notifications.map((notification) => (
                        <div key={notification.id} className="notification-card">
                            <p>{notification.message}</p>
                            <small>{new Date(notification.created_at).toLocaleString()}</small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
