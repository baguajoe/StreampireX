import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import WebRTCChat from "../component/WebRTCChat";
import "../../styles/ProfilePage.css";

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
    const [commentInputs, setCommentInputs] = useState({});
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatFeatures, setChatFeatures] = useState({ typing: false, groupMode: false });
    const [useAvatar, setUseAvatar] = useState(false);

    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);

    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
        })
            .then((res) => res.ok ? res.json() : Promise.reject(res))
            .then((data) => {
                setUser(data);
                setDisplayName(data.display_name || "");
                setBusinessName(data.business_name || "");
                setBio(data.bio || "");
                setSocialLinks(data.social_links || {});
                setStorefrontLink(data.storefront_link || "");
                setUseAvatar(data.use_avatar || false);
                setRadioStation(data.radio_station || "");
                setPodcast(data.podcast || "");
                setVideos(data.videos || []);
            })
            .catch((err) => alert("Error fetching profile."));
    }, []);

    const handleToggleAvatar = async () => {
        const newValue = !useAvatar;
        setUseAvatar(newValue);
        try {
            await fetch(`${process.env.BACKEND_URL}/api/user/avatar-toggle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ use_avatar: newValue })
            });
        } catch (err) {
            alert("Failed to update avatar preference.");
        }
    };

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await fetch(`${process.env.BACKEND_URL}/upload/profile-picture`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData,
            });

            const data = await res.json();
            setUser((prev) => ({ ...prev, profile_picture: data.url }));
        } catch (err) {
            alert("❌ Failed to upload profile picture");
        }
    };

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "your_unsigned_preset");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dli7r0d7s/video/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            console.log("Uploaded video URL:", data.secure_url);
            setVideos(prev => [...prev, { file_url: data.secure_url, title: file.name }]);

        } catch (err) {
            alert("Video upload failed.");
            console.error(err);
        }
    };

    const handleCoverPhotoChange = (e) => {
        if (e.target.files.length > 0) {
            setCoverPhoto(URL.createObjectURL(e.target.files[0]));
            setCoverPhotoName(e.target.files[0].name);
        }
    };

    const handleSaveProfile = async () => {
        const payload = {
            display_name: displayName,
            business_name: businessName,
            bio: bio,
            social_links: socialLinks,
            radio_station: radioStation,
            podcast: podcast,
            videos: videos,
            profile_picture: profilePicture,  // Add profile picture URL
            cover_photo: coverPhoto,          // Add cover photo URL
        };

        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (response.ok) {
                alert("✅ Profile saved successfully!");
                setUser(result.user);  // Update the user state with the new data
            } else {
                alert(result.error || "Failed to update profile.");
            }
        } catch (error) {
            alert("An error occurred while saving profile.");
        }
    };

    return (
        <div className="profile-container">
            <div className="video-upload-field">
                <label htmlFor="video-upload">🎥 Upload Video:</label>
                <input type="file" id="video-upload" accept="video/*" onChange={handleVideoUpload} />
            </div>

            <div className="cover-photo-container">
                <img src={coverPhoto || user.cover_photo || "/default-cover.jpg"} alt="Cover" className="cover-photo" />
                <button onClick={() => coverPhotoInputRef.current.click()} className="upload-btn">📷 Upload Cover Photo</button>
                <input ref={coverPhotoInputRef} type="file" style={{ display: 'none' }} onChange={handleCoverPhotoChange} />
                {coverPhotoName && <p className="filename-display">📁 {coverPhotoName}</p>}
            </div>

            <div className="profile-name-header">
                {!isEditingName ? (
                    <>
                        <span className="profile-display-name">{displayName || user.username || "Your Name"}</span>
                        <button className="edit-name-btn" onClick={() => setIsEditingName(true)}>✏️</button>
                        <button className="message-btn" onClick={() => setIsChatOpen(true)}>💬 Message</button>
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            className="name-input"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            autoFocus
                        />
                        <button className="name-save-btn" onClick={() => setIsEditingName(false)}>Save</button>
                    </>
                )}
            </div>

            {isChatOpen && (
                <ChatModal
                    recipientId={user.id}
                    recipientName={user.username}
                    currentUserId={user.id}
                    onClose={() => setIsChatOpen(false)}
                    enableTypingIndicator={true}
                    enableThreads={true}
                    autoScroll={true}
                    enableMediaUpload={true}
                    enableGroupChat={true}
                />
            )}

            <div className="profile-avatar-toggle">
                <img
                    src={useAvatar ? user.avatar_url : profilePicture || user.profile_picture || "/default-avatar.png"}
                    alt="Profile"
                    className="profile-pic"
                />
                <div className="profile-pic-buttons">
                    <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">😀 Upload Profile Picture</button>
                    <Link to="/create-avatar">
                        <button className="upload-btn">🧍 Create Avatar</button>
                    </Link>
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={useAvatar}
                            onChange={handleToggleAvatar}
                        />
                        Use Avatar
                    </label>
                </div>
                <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} onChange={handleProfilePicChange} />
                {profilePicName && <p className="filename-display">📁 {profilePicName}</p>}
            </div>

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
                        <button onClick={() => setIsEditingBio(false)}>✅ Save Bio</button>
                    </>
                )}
            </div>

            <div className="social-preview">
                <h4>🔗 Social Links</h4>
                <ul>
                    {socialLinks.twitter && <li><a href={socialLinks.twitter}>🐦 Twitter</a></li>}
                    {socialLinks.facebook && <li><a href={socialLinks.facebook}>📘 Facebook</a></li>}
                    {socialLinks.instagram && <li><a href={socialLinks.instagram}>📸 Instagram</a></li>}
                    {socialLinks.linkedin && <li><a href={socialLinks.linkedin}>💼 LinkedIn</a></li>}
                </ul>
            </div>

            <div className="video-chat-container">
                <WebRTCChat roomId={`user-${user.id}`} />
            </div>

            <div className="profile-layout">
                <div className="left-column">
                    <h3>⭐ Favorite Profiles</h3>
                    {favorites.length > 0 ? favorites.map(fav => <p key={fav.id}>{fav.username}</p>) : <p>No favorites yet.</p>}

                    <h3>📡 Favorite Radio Stations</h3>
                    {favoriteRadioStations.length > 0 ? favoriteRadioStations.map(station => <p key={station.id}>{station.name}</p>) : <p>No saved stations.</p>}

                    <h3>🎙️ Favorite Podcasts</h3>
                    {favoritePodcasts.length > 0 ? favoritePodcasts.map(podcast => <p key={podcast.id}>{podcast.title}</p>) : <p>No saved podcasts.</p>}
                </div>

                <div className="middle-column">
                    <h3>💬 Comments</h3>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." />
                    <button className="btn-primary">💬 Post</button>
                    <ul>{comments.map(comment => <li key={comment.id}>{comment.text}</li>)}</ul>

                    {user?.role && ["Pro", "Premium", "Free"].includes(user.role) && (
                        <div className="upload-video-section">
                            <h3>🎬 Upload a Video</h3>
                            <UploadVideo currentUser={user} onUpload={() => {
                                fetch(`${process.env.BACKEND_URL}/api/user/${user.id}/videos`)
                                    .then((res) => res.json())
                                    .then((data) => setVideos(data));
                            }} />
                        </div>
                    )}

                    {videos.length > 0 && (
                        <div className="uploaded-videos">
                            <h4>📹 Your Uploaded Videos</h4>
                            {videos.map(video => (
                                <div key={video.id} className="video-wrapper">
                                    <video src={video.file_url} controls width="300" />
                                    <p>{video.title}</p>
                                    <button onClick={() => alert("Liked!")}>👍 {video.likes || 0}</button>

                                    <input
                                        type="text"
                                        placeholder="Add a comment"
                                        value={commentInputs[video.id] || ""}
                                        onChange={(e) => setCommentInputs({ ...commentInputs, [video.id]: e.target.value })}
                                    />
                                    <button onClick={() => alert("Comment added")}>💬 Comment</button>

                                    <button className="btn-secondary" onClick={() => alert("Deleted")}>🗑️ Delete</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="right-column">
                    {/* 🎛️ Quick Actions - moved to top */}
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

                    {/* 🛍️ Storefront Section */}
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

            <button onClick={() => alert("Saved!")} className="btn-primary">💾 Save Profile</button>
        </div>
    );
};

export default ProfilePage;
