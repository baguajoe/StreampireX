import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ProfilePage = () => {
    const [user, setUser] = useState({});
    const [editing, setEditing] = useState(false);
    const [updatedProfile, setUpdatedProfile] = useState({});
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [bio, setBio] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [coverPhoto, setCoverPhoto] = useState(null);
    const [socialLinks, setSocialLinks] = useState({ twitter: "", facebook: "", instagram: "", linkedin: "" });
    const [followersList, setFollowersList] = useState([]);
    const [followingList, setFollowingList] = useState([]);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },

        })
            .then((res) => res.json())
            .then((data) => {
                setUser(data);
                setUpdatedProfile(data);
                setFollowers(data.followers_count || 0);
                setFollowing(data.following_count || 0);
                setBio(data.bio || "");
                setSocialLinks(data.social_links || {});
            })
            .catch((err) => console.error("Error fetching profile:", err));
    }, []);

    const handleFollowToggle = () => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/follow`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ user_id: user.id }),
        })
            .then((res) => res.json())
            .then((data) => {
                setIsFollowing(data.is_following);
                setFollowers(data.followers_count);
            })
            .catch((err) => console.error("Error following user:", err));
    };

    const fetchFollowersList = () => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/followers`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setFollowersList(data))
            .catch((err) => console.error("Error fetching followers list:", err));
    };

    const fetchFollowingList = () => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/following`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setFollowingList(data))
            .catch((err) => console.error("Error fetching following list:", err));
    };

    return (
        <div className="profile-container">
            <h1>👤 User Profile</h1>
            <nav>
                <Link to="/">🏠 Home</Link>
                <Link to="/favorites">⭐ Favorites</Link>
                <Link to="/subscriptions">💳 My Subscription</Link>
                <Link to="/notifications">🔔 Notifications</Link>
                <Link to="/settings">⚙️ Settings</Link>
            </nav>
            <div className="profile-card">
                {user.cover_photo && <img src={user.cover_photo} alt="Cover" className="cover-photo" />}
                <input type="file" onChange={(e) => setCoverPhoto(e.target.files[0])} />
                <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />
                <input type="file" onChange={(e) => setProfilePicture(e.target.files[0])} />
                <h2>{user.username}</h2>
                <p>Email: {user.email}</p>
                <p>Subscription: {user.is_premium ? "Premium" : "Free"}</p>
                <p>👥 Followers: {followers}</p>
                <p>🔥 Following: {following}</p>
                <button onClick={handleFollowToggle} className="btn-primary">
                    {isFollowing ? "Unfollow" : "Follow"}
                </button>
                <button onClick={fetchFollowersList} className="btn-secondary">View Followers</button>
                <button onClick={fetchFollowingList} className="btn-secondary">View Following</button>
                <p>Bio: {bio}</p>
                <p>🔗 Social Links:</p>
                <ul>
                    {Object.entries(socialLinks).map(([platform, link]) => (
                        <li key={platform}><a href={link} target="_blank" rel="noopener noreferrer">{platform}</a></li>
                    ))}
                </ul>
            </div>
            <div className="followers-list">
                <h3>👥 Followers List</h3>
                <ul>
                    {followersList.map((follower) => (
                        <li key={follower.id}>{follower.username}</li>
                    ))}
                </ul>
            </div>
            <div className="following-list">
                <h3>🔥 Following List</h3>
                <ul>
                    {followingList.map((following) => (
                        <li key={following.id}>{following.username}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ProfilePage;
