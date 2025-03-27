import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../components/UploadVideo";
import "../../styles/ProfilePage.css";

const ProfilePage = () => {
    const [user, setUser] = useState({});
    const [bio, setBio] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [coverPhoto, setCoverPhoto] = useState(null);
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
            .then((res) => {
                if (!res.ok) {
                    return res.text().then(text => {
                        throw new Error(`Error ${res.status}: ${text}`);
                    });
                }
                return res.text();
            })
            .then((text) => {
                const data = JSON.parse(text);
                setUser(data);
                setDisplayName(data.display_name || "");
                setBusinessName(data.business_name || "");
                setBio(data.bio || "");
                setSocialLinks(data.social_links || {});
                setStorefrontLink(data.storefront_link || "");
            })
            .catch((err) => {
                console.error("Error fetching profile:", err);
            });
    }, []);

    useEffect(() => {
        if (user?.id) {
            fetch(`${process.env.BACKEND_URL}/api/user/${user.id}/videos`)
                .then((res) => res.json())
                .then((data) => setVideos(data))
                .catch((err) => console.error("Failed to load videos:", err));
        }
    }, [user]);

    const handleSaveProfile = () => {
        fetch(`${process.env.BACKEND_URL}/user/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
                bio,
                display_name: displayName,
                business_name: businessName,
                social_links: socialLinks,
                radio_station: radioStation,
                podcast: podcast,
                storefront_link: storefrontLink,
            }),
        })
            .then(res => res.json())
            .then(() => {
                alert("Profile updated successfully!");
            })
            .catch(err => console.error("Error updating profile:", err));
    };

    const handleLike = (videoId) => {
        fetch(`${process.env.BACKEND_URL}/api/video/${videoId}/like`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            }
        })
            .then(() => {
                setVideos(videos.map(video => video.id === videoId ? { ...video, likes: video.likes + 1 } : video));
            })
            .catch(err => console.error("Failed to like video:", err));
    };

    const handleAddComment = (videoId) => {
        const commentText = commentInputs[videoId];
        if (!commentText) return;

        fetch(`${process.env.BACKEND_URL}/api/video/${videoId}/comment`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: commentText })
        })
            .then(res => res.json())
            .then(updatedVideo => {
                setVideos(videos.map(video => video.id === videoId ? updatedVideo : video));
                setCommentInputs({ ...commentInputs, [videoId]: "" });
            })
            .catch(err => console.error("Failed to comment:", err));
    };

    return (
        <div className="profile-container">
            <div className="cover-photo-container">
                <img src={coverPhoto || user.cover_photo || "/default-cover.jpg"} alt="Cover" className="cover-photo" />
                <button onClick={() => coverPhotoInputRef.current.click()} className="upload-btn">📷 Upload Cover Photo</button>
                <input ref={coverPhotoInputRef} type="file" style={{ display: 'none' }} />
            </div>

            <div className="profile-name-header">
                {!isEditingName ? (
                    <>
                        <span className="profile-display-name">{displayName || user.username || "Your Name"}</span>
                        <button className="edit-name-btn" onClick={() => setIsEditingName(true)}>✏️</button>
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
                        <button
                            className="name-save-btn"
                            onClick={() => setIsEditingName(false)}
                        >
                            Save
                        </button>
                    </>
                )}
            </div>

            <div className="profile-layout">
                <div className="left-column">
                    <div className="profile-card">
                        <img src={profilePicture || user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />
                        <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">😀 Upload Profile Picture</button>
                        <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} />

                        <h2>{displayName || user.username}</h2>
                        <p>Business Name: {businessName || "N/A"}</p>

                        <label>📝 Bio:</label>
                        <textarea rows={10} value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>

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
                                    <button onClick={() => handleLike(video.id)}>👍 {video.likes || 0}</button>

                                    <input
                                        type="text"
                                        placeholder="Add a comment"
                                        value={commentInputs[video.id] || ""}
                                        onChange={(e) => setCommentInputs({ ...commentInputs, [video.id]: e.target.value })}
                                    />
                                    <button onClick={() => handleAddComment(video.id)}>💬 Comment</button>

                                    <button className="btn-secondary" onClick={() => {
                                        fetch(`${process.env.BACKEND_URL}/api/video/${video.id}`, {
                                            method: "DELETE",
                                            headers: {
                                                Authorization: `Bearer ${localStorage.getItem("token")}`
                                            }
                                        }).then(() => {
                                            setVideos(videos.filter(v => v.id !== video.id));
                                        });
                                    }}>🗑️ Delete</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="right-column">
                    <h3>🛍️ Storefront</h3>
                    <p>Visit my store: <a href={storefrontLink} target="_blank" rel="noopener noreferrer">{storefrontLink || "N/A"}</a></p>
                    {products.length > 0 && <div className="featured-product">Featured: {products[0].name}</div>}

                    <h3>📡 Radio Station & Podcast</h3>
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
            </div>

            <button onClick={handleSaveProfile} className="btn-primary">💾 Save Profile</button>
        </div>
    );
};

export default ProfilePage;