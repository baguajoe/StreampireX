import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import UploadVideo from "../component/UploadVideo";
import ChatModal from "../component/ChatModal";
import WebRTCChat from "../component/WebRTCChat";
import "../../styles/ProfilePage.css";
import lady1 from "../../img/lady1.png"
import campfire from "../../img/campfire.png"

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
    const [posts, setPosts] = useState([]); // user-created posts
    const [postContent, setPostContent] = useState("");
    const [postImage, setPostImage] = useState(null);
    const [postComments, setPostComments] = useState({}); // { postId: [comments] }
    const [newCommentText, setNewCommentText] = useState({}); // { postId: comment }
    const [justSaved, setJustSaved] = useState(false);



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
        formData.append("profile_picture", file);

        try {
            const res = await fetch(`${process.env.BACKEND_URL}/api/user/profile`, {
                method: "PUT",
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

    const handleCoverPhotoChange = (e) => {
        if (e.target.files.length > 0) {
            setCoverPhoto(URL.createObjectURL(e.target.files[0]));
            setCoverPhotoName(e.target.files[0].name);
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

    const handleSaveProfile = async () => {
        const payload = {
            // strings: trim and check non-empty
            ...(displayName?.trim() && { display_name: displayName }),
            ...(businessName?.trim() && { business_name: businessName }),
            ...(bio?.trim() && { bio }),

            // arrays: check length > 0
            ...(Array.isArray(socialLinks) && socialLinks.length > 0 && { social_links: socialLinks }),
            ...(Array.isArray(videos) && videos.length > 0 && { videos }),

            // objects (non-array): check has any own keys
            ...(podcast && !Array.isArray(podcast) && Object.keys(podcast).length > 0 && { podcast }),

            // simple values (truthy only)
            ...(radioStation?.trim() && { radio_station: radioStation }),
            ...(profilePicture && { profile_picture: profilePicture }),
            ...(coverPhoto && { cover_photo: coverPhoto }),
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
                setUser(result.user);
                setJustSaved(true);
                setTimeout(() => setJustSaved(false), 3000); // hide save button after 3s
            } else {
                alert(result.error || "Failed to update profile.");
            }

        } catch (error) {
            alert("An error occurred while saving profile.");
        }
    };

    return (
        <div className="profile-container">
            <div className="cover-photo-container ">
                <img src={coverPhoto || user.cover_photo || campfire} alt="Cover" className="cover-photo" />
                <button onClick={() => coverPhotoInputRef.current.click()} className="upload-btn">📷 Upload Cover Photo</button>
                <input ref={coverPhotoInputRef} type="file" style={{ display: 'none' }} onChange={handleCoverPhotoChange} />
                {coverPhotoName && <p className="filename-display">📁 {coverPhotoName}</p>}
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

            <div className="profile-avatar-toggle-horizontal">
                <img
                    src={useAvatar ? user.avatar_url : profilePicture || user.profile_picture || lady1}
                    alt="Profile"
                    className="profile-pic"
                />
                <div className="profile-name-inline">
                    <p className="profile-name-label">
                        {displayName || user.username || "Your Name"}
                    </p>
                    <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">
                        😀 Upload Profile Picture
                    </button>
                </div>
                <div className="profile-name-header ms-auto">
                    {!isEditingName ? (
                        <div className="name-and-actions">
                            <div className="name-actions">
                                <button className="edit-name-btn small-btn" onClick={() => setIsEditingName(true)}>✏️</button>
                                <button className="message-btn small-btn" onClick={() => setIsChatOpen(true)}>💬</button>
                            </div>
                        </div>
                    ) : (
                        <div className="edit-name-input">
                            <input
                                type="text"
                                className="name-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoFocus
                            />
                            <button className="name-save-btn" onClick={() => setIsEditingName(false)}>Save</button>
                        </div>
                    )}
                </div>


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
                        <button onClick={() => { setIsEditingBio(false); handleSaveProfile() }}>✅ Save Bio</button>
                    </>
                )}
            </div>

            <div className="social-links">
                <h4>🔗 Social Links</h4>
                <ul>
                    {socialLinks.twitter && <li><a href={socialLinks.twitter}>🐦 Twitter</a></li>}
                    {socialLinks.facebook && <li><a href={socialLinks.facebook}>📘 Facebook</a></li>}
                    {socialLinks.instagram && <li><a href={socialLinks.instagram}>📸 Instagram</a></li>}
                    {socialLinks.linkedin && <li><a href={socialLinks.linkedin}>💼 LinkedIn</a></li>}
                </ul>
            </div>


            <div className="profile-layout">
                <div className="left-column">
                    <h3>⭐ Favorite Profiles</h3>
                    <div className="favorite-item">
                        <img src="/static/images/profile1.png" alt="Zenmaster" className="favorite-avatar" />
                        <div>
                            <strong>@zenmaster</strong>
                            <p>“Grateful for the community 🙏”</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src="/static/images/profile2.png" alt="Fit Jay" className="favorite-avatar" />
                        <div>
                            <strong>@fit_jay</strong>
                            <p>“Morning flow complete ✅”</p>
                        </div>
                    </div>

                    <h3>📡 Favorite Radio Stations</h3>
                    <div className="favorite-item">
                        <img src="/static/images/radio1.png" alt="LoFi Lounge" className="favorite-avatar" />
                        <div>
                            <strong>LoFi Lounge</strong>
                            <p>Chill beats 24/7</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src="/static/images/radio2.png" alt="JazzHub" className="favorite-avatar" />
                        <div>
                            <strong>JazzHub</strong>
                            <p>Smooth jazz and more 🎷</p>
                        </div>
                    </div>

                    <h3>🎙️ Favorite Podcasts</h3>
                    <div className="favorite-item">
                        <img src="/static/images/podcast1.png" alt="The Energy Reset" className="favorite-avatar" />
                        <div>
                            <strong>The Energy Reset</strong>
                            <p>“How to ground yourself”</p>
                        </div>
                    </div>

                    <div className="favorite-item">
                        <img src="/static/images/podcast2.png" alt="ChiCast" className="favorite-avatar" />
                        <div>
                            <strong>ChiCast</strong>
                            <p>“Breathwork for busy lives”</p>
                        </div>
                    </div>


                </div>

                <div className="middle-column">
                    <h3>📝 Create a Post</h3>
                    <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Write something..."
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPostImage(e.target.files[0])}
                    />
                    <button
                        onClick={() => {
                            const newPost = {
                                id: Date.now(), // Use backend ID if available
                                content: postContent,
                                image: postImage ? URL.createObjectURL(postImage) : null,
                                comments: [],
                            };
                            setPosts([newPost, ...posts]);
                            setPostContent("");
                            setPostImage(null);
                        }}
                    >
                        📤 Post
                    </button>

                    {posts.map((post) => (
                        <div key={post.id} className="post-card">
                            <p>{post.content}</p>
                            {post.image && (
                                <img src={post.image} alt="Post" className="post-image" />
                            )}

                            <h5>💬 Comments</h5>
                            <ul>
                                {(postComments[post.id] || []).map((comment, idx) => (
                                    <li key={idx}>{comment}</li>
                                ))}
                            </ul>
                            <input
                                type="text"
                                placeholder="Write a comment..."
                                value={newCommentText[post.id] || ""}
                                onChange={(e) =>
                                    setNewCommentText({ ...newCommentText, [post.id]: e.target.value })
                                }
                            />
                            <button
                                onClick={() => {
                                    const comment = newCommentText[post.id]?.trim();
                                    if (!comment) return;
                                    setPostComments({
                                        ...postComments,
                                        [post.id]: [...(postComments[post.id] || []), comment],
                                    });
                                    setNewCommentText({ ...newCommentText, [post.id]: "" });
                                }}
                            >
                                💬 Reply
                            </button>
                        </div>
                    ))}


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
                        <WebRTCChat></WebRTCChat>
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
            </div> {/* End of profile-layout */}

            {!justSaved && (
                <button onClick={handleSaveProfile} className="btn-primary">
                    💾 Save Profile
                </button>
            )}
            {/* End of profile-container */}
        </div>

    );
};

export default ProfilePage;
