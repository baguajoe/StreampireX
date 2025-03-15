import React, { useEffect, useState } from "react";
import "../../styles/podcasts.css"

const PodcastPage = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Fetch categories from the backend
    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/podcasts/categories`)
            .then(res => res.json())
            .then(data => setCategories(["All", ...data]))  // Include "All" category
            .catch(err => console.error("Error fetching categories:", err));
    }, []);

    // Fetch podcasts from the backend
    useEffect(() => {
        fetch(`${process.env.BACKEND_URL}/api/podcasts`)
            .then(res => res.json())
            .then(data => setPodcasts(data))
            .catch(err => console.error("Error fetching podcasts:", err));
    }, []);

    // Filter podcasts based on search query and category
    const filteredPodcasts = podcasts.filter(podcast =>
        (selectedCategory === "All" || podcast.category === selectedCategory) &&
        podcast.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="podcast-page-container">
            <h1>🎧 Browse Podcasts</h1>

            {/* Category Filter Bar */}
            <div className="category-bar">
                {categories.map((category, index) => (
                    <button
                        key={index}
                        className={`category-badge ${selectedCategory === category ? "active" : ""}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <input
                type="text"
                placeholder="Search podcasts..."
                className="search-bar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Podcast List */}
            <div className="podcast-list">
                {filteredPodcasts.map(podcast => (
                    <div key={podcast.id} className="podcast-card">
                        <img src={podcast.cover_art_url || "/default-podcast-cover.png"} alt="Podcast Cover" className="podcast-cover" />
                        <div className="podcast-info">
                            <h3>{podcast.title}</h3>
                            <p>{podcast.description}</p>
                            <p><strong>Category:</strong> {podcast.category}</p>

                            {podcast.video_url ? (
                                <video controls width="100%">
                                    <source src={podcast.video_url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <audio controls>
                                    <source src={podcast.audio_url} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                            )}

                            {podcast.is_premium && <span className="premium-label">🔒 Premium</span>}

                            <div className="transcription">
                                <h4>📝 Transcript</h4>
                                <p>{podcast.transcription || "Transcription not available."}</p>
                            </div>

                            <div className="comments-section">
                                <h4>💬 Comments</h4>
                                <textarea placeholder="Write a comment..."></textarea>
                                <button>💬 Post</button>
                            </div>

                            <div className="podcast-actions">
                                <button>❤️ Like</button>
                                <button>📤 Share</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PodcastPage;
