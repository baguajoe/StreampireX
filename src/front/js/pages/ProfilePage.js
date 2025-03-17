import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../../styles/ProfilePage.css"

// const ProfilePage = () => {
//     const [user, setUser] = useState({});
//     const [editing, setEditing] = useState(false);
//     const [updatedProfile, setUpdatedProfile] = useState({});
//     const [followers, setFollowers] = useState(0);
//     const [following, setFollowing] = useState(0);
//     const [isFollowing, setIsFollowing] = useState(false);
//     const [bio, setBio] = useState("");
//     const [profilePicture, setProfilePicture] = useState(null);
//     const [coverPhoto, setCoverPhoto] = useState(null);
//     const [socialLinks, setSocialLinks] = useState({ twitter: "", facebook: "", instagram: "", linkedin: "" });
//     const [followersList, setFollowersList] = useState([]);

//     useEffect(() => {
//         console.log("hello!")
//     })
//     // useEffect(() => {
//     //     console.log("ProfilePage useEffect running");
//     //     fetch(`${process.env.BACKEND_URL}/profile`, {
//     //         method: "GET",
//     //         headers: {
//     //             Authorization: `Bearer ${localStorage.getItem("token")}`,
//     //         },
//     //     })
//     //         .then((res) => res.json())
//     //         .then((data) => {
//     //             console.log("data from profile:", data);
//     //             setUser(data);
//     //             setUpdatedProfile(data);
//     //             setFollowers(data.followers_count || 0);
//     //             setFollowing(data.following_count || 0);
//     //             setBio(data.bio || "");
//     //             setSocialLinks(data.social_links || {});
//     //         })
//     //         .catch((err) => console.error("Error fetching profile:", err));
//     // }, []);
//     useEffect(() => {
//         console.log("ProfilePage useEffect running");
//         console.log("Backend URL:", process.env.BACKEND_URL);
//         console.log("Token exists:", !!localStorage.getItem("token"));

//         fetch(`${process.env.BACKEND_URL}/api/profile`, {
//             method: "GET",
//             headers: {
//                 "Authorization": `Bearer ${localStorage.getItem("token")}`,
//                 "Content-Type": "application/json"
//             },
//         })
//             .then((res) => {
//                 console.log("Response status:", res.status);
//                 console.log("Response headers:", [...res.headers.entries()]);

//                 // Add more detailed error handling
//                 if (!res.ok) {
//                     if (res.status === 422) {
//                         console.log("Token validation error. Try re-logging in.");
//                     }
//                     return res.text().then(text => {
//                         throw new Error(`Error ${res.status}: ${text}`);
//                     });
//                 }
//                 return res.text();
//             })
//             .then((text) => {
//                 console.log("Raw response:", text);
//                 try {
//                     const data = JSON.parse(text);
//                     console.log("data from profile:", data);
//                     setUser(data);
//                     // rest of your code
//                 } catch (e) {
//                     console.error("Failed to parse JSON:", e);
//                 }
//             })
//             .catch((err) => {
//                 console.error("Error fetching profile:", err);
//             });
//     }, []);

//     const handleFollowToggle = () => {
//         fetch(`${process.env.BACKEND_URL}/api/user/follow`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//             },
//             body: JSON.stringify({ user_id: user.id }),
//         })
//             .then((res) => res.json())
//             .then((data) => {
//                 setIsFollowing(data.is_following);
//                 setFollowers(data.followers_count);
//             })
//             .catch((err) => console.error("Error following user:", err));
//     };

//     const fetchFollowersList = () => {
//         fetch(`${process.env.BACKEND_URL}/api/user/followers`, {
//             method: "GET",
//             headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
//             },
//         })
//             .then((res) => res.json())
//             .then((data) => setFollowersList(data))
//             .catch((err) => console.error("Error fetching followers list:", err));
//     };

//     return (
//         <div className="profile-container">
//             <h1>👤 User Profile</h1>
//             <nav>
//                 <Link to="/">🏠 Home</Link>
//                 <Link to="/favorites">⭐ Favorites</Link>
//                 <Link to="/subscriptions">💳 My Subscription</Link>
//                 <Link to="/notifications">🔔 Notifications</Link>
//                 <Link to="/settings">⚙️ Settings</Link>
//             </nav>
//             <div className="profile-card">
//                 {user.cover_photo && <img src={user.cover_photo} alt="Cover" className="cover-photo" />}
//                 <input type="file" onChange={(e) => setCoverPhoto(e.target.files[0])} />
//                 <img src={user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />
//                 <input type="file" onChange={(e) => setProfilePicture(e.target.files[0])} />
//                 <h2>{user.username}</h2>
//                 <p>Email: {user.email}</p>
//                 <p>Subscription: {user.is_premium ? "Premium" : "Free"}</p>
//                 <p>👥 Followers: {followers}</p>
//                 <p>🔥 Following: {following}</p>
//                 <button onClick={handleFollowToggle} className="btn-primary">
//                     {isFollowing ? "Unfollow" : "Follow"}
//                 </button>
//                 <button onClick={fetchFollowersList} className="btn-secondary">View Followers</button>
//                 <p>Bio: {bio}</p>
//                 <p>🔗 Social Links:</p>
//                 <ul>
//                     {Object.entries(socialLinks).map(([platform, link]) => (
//                         <li key={platform}><a href={link} target="_blank" rel="noopener noreferrer">{platform}</a></li>
//                     ))}
//                 </ul>
//             </div>
//             <div className="followers-list">
//                 <h3>👥 Followers List</h3>
//                 <ul>
//                     {followersList.map((follower) => (
//                         <li key={follower.id}>{follower.username}</li>
//                     ))}
//                 </ul>
//             </div>
//         </div>
//     );
// };

// export default ProfilePage;


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

    const profilePicInputRef = useRef(null);
    const coverPhotoInputRef = useRef(null);

    useEffect(() => {
        console.log("ProfilePage useEffect running");
        console.log("Backend URL:", process.env.BACKEND_URL);
        console.log("Token exists:", !!localStorage.getItem("token"));

        fetch(`${process.env.BACKEND_URL}/api/profile`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            },
        })
            .then((res) => {
                console.log("Response status:", res.status);
                console.log("Response headers:", [...res.headers.entries()]);

                // Add more detailed error handling
                if (!res.ok) {
                    if (res.status === 422) {
                        console.log("Token validation error. Try re-logging in.");
                    }
                    return res.text().then(text => {
                        throw new Error(`Error ${res.status}: ${text}`);
                    });
                }
                return res.text();
            })
            .then((text) => {
                console.log("Raw response:", text);
                try {
                    const data = JSON.parse(text);
                    console.log("data from profile:", data);
                    setUser(data);
                    // rest of your code
                } catch (e) {
                    console.error("Failed to parse JSON:", e);
                }
            })
            .catch((err) => {
                console.error("Error fetching profile:", err);
            });
    }, []);

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

    return (
        <div className="profile-container">
            <div className="cover-photo-container">
                <img src={coverPhoto || user.cover_photo || "/default-cover.jpg"} alt="Cover" className="cover-photo" />
                <button onClick={() => coverPhotoInputRef.current.click()} className="upload-btn">📷 Upload Cover Photo</button>
                <input ref={coverPhotoInputRef} type="file" style={{ display: 'none' }} />
            </div>

            {/* Simple Profile Name Header */}
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
                {/* Left Column: Profile Info */}
                <div className="left-column">
                    <div className="profile-card">
                        <img src={profilePicture || user.profile_picture || "/default-avatar.png"} alt="Profile" className="profile-pic" />
                        <button onClick={() => profilePicInputRef.current.click()} className="upload-btn">😀 Upload Profile Picture</button>
                        <input ref={profilePicInputRef} type="file" style={{ display: 'none' }} />

                        <h2>{displayName || user.username}</h2>
                        <p>Business Name: {businessName || "N/A"}</p>

                        {/* Editable Bio Section */}
                        <label>📝 Bio:</label>
                        <textarea rows={10} value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>

                    {/* Favorite Profiles */}
                    <h3>⭐ Favorite Profiles</h3>
                    {favorites.length > 0 ? favorites.map(fav => <p key={fav.id}>{fav.username}</p>) : <p>No favorites yet.</p>}

                    {/* Favorite Radio Stations & Podcasts */}
                    <h3>📡 Favorite Radio Stations</h3>
                    {favoriteRadioStations.length > 0 ? favoriteRadioStations.map(station => <p key={station.id}>{station.name}</p>) : <p>No saved stations.</p>}

                    <h3>🎙️ Favorite Podcasts</h3>
                    {favoritePodcasts.length > 0 ? favoritePodcasts.map(podcast => <p key={podcast.id}>{podcast.title}</p>) : <p>No saved podcasts.</p>}
                </div>

                {/* Middle Column: Comments */}
                <div className="middle-column">
                    <h3>💬 Comments</h3>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." />
                    <button className="btn-primary">💬 Post</button>
                    <ul>{comments.map(comment => <li key={comment.id}>{comment.text}</li>)}</ul>
                </div>

                {/* Right Column: Storefront & Upload Options */}
                <div className="right-column">
                    <h3>🛍️ Storefront</h3>
                    <p>Visit my store: <a href={storefrontLink} target="_blank" rel="noopener noreferrer">{storefrontLink || "N/A"}</a></p>
                    {products.length > 0 && <div className="featured-product">Featured: {products[0].name}</div>}

                    <h3>📡 Radio Station & Podcast</h3>
                    <Link to="/create-radio">
                        <button className="btn-radio">📡 Create Radio Station</button>
                    </Link>
                    <Link to="/podcast/create">
                        <button className="btn-podcast">🎙️ Create Podcast</button>
                    </Link>
                    <button className="btn-upload">🎵 Upload Music</button>

                    {/* ✅ Indie Artist Upload Button (Uses a Link for Navigation) */}
                    <Link to="/indie-artist-upload">
                        <button className="btn-indie-upload">
                            🎤 Indie Artist Upload
                        </button>
                    </Link>
                </div>
            </div>

            <button onClick={handleSaveProfile} className="btn-primary">💾 Save Profile</button>
        </div>
    );
};

export default ProfilePage;